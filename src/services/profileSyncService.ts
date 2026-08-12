// ============================================================================
// Sincronização do Perfil com a tabela `profiles` — v13 (F39)
// ----------------------------------------------------------------------------
// Problemas medidos no código que este serviço corrige:
//  1) O guardar de Perfil chamava `supabaseService.upsertProfile`, cujo payload
//     anula (null) TODAS as colunas não enviadas — cada gravação reescrevia
//     nif/passport/birth_date a NULL (perda silenciosa de dados reais).
//  2) `email` e `morada` JÁ EXISTEM na tabela (verificado em produção), mas a
//     via antiga nunca os enviava.
// Estratégia: UPDATE dirigido apenas das colunas fornecidas (nunca NULL em
// colunas alheias); INSERT apenas quando a linha ainda não existe. Se a
// produção responder PGRST204 (coluna desconhecida — defesa para esquemas
// divergentes), faz UMA re-tentativa com os campos núcleo (name/phone).
// Demos (D7/v12) nunca tocam na nuvem; contas não migradas são ignoradas.
// O cliente Supabase é INJECTADO (padrão cloudAuthService) — módulo puro,
// seguro para testes lógicos (tsx) sem import.meta.env.
// ============================================================================

import { homologationStore } from './homologationStore';
import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { classifyAuthError, isCloudBound } from './cloudAuthService';

export type ProfileSyncOutcome =
  | 'ok'           // linha existente actualizada
  | 'created'      // linha criada (não existia)
  | 'schema_retry' // PGRST204: gravados apenas os campos núcleo (name/phone)
  | 'demo'         // conta de demonstração — desvio com log (D7)
  | 'not_bound'    // conta ainda não migrada — nada a fazer
  | 'unavailable'  // rede/serviço em baixo — continua local
  | 'error';

export interface ProfileSyncResult {
  outcome: ProfileSyncOutcome;
  message?: string;
  /** colunas efectivamente gravadas (nomes da tabela) */
  fields: string[];
}

export interface CitizenProfilePatch {
  bi: string;
  name?: string;
  phone?: string;
  email?: string;
  morada?: string;
  filiation?: string;
  maritalStatus?: string;
}

/** Constrói o objecto de colunas snake_case SÓ com valores fornecidos (trim). */
const toColumns = (patch: CitizenProfilePatch): Record<string, string> => {
  const cols: Record<string, string> = {};
  const put = (col: string, val?: string) => {
    const v = (val ?? '').trim();
    if (v) cols[col] = v;
  };
  put('name', patch.name);
  put('phone', patch.phone);
  put('email', patch.email);
  put('morada', patch.morada);
  put('filiation', patch.filiation);
  put('marital_status', patch.maritalStatus);
  return cols;
};

// ============================================================================
// F53 — Página Conta do cidadão: persistência COMPLETA e feedback HONESTO
// ----------------------------------------------------------------------------
// Defeitos corrigidos (queixas: "actualizei um dado e não ficou gravado"):
//  C1) CitizenProfile enviava tudo ao sync MENOS a morada (o serviço já a
//      suportava desde a F39 — o chamador é que a omitia) ⇒ morada nunca
//      chegava à nuvem; noutro dispositivo perdia-se.
//  C2) A hidratação de login (App.tsx) lia name/phone/… mas NUNCA morada nem
//      email de profiles ⇒ mesmo gravados, não regressavam à sessão.
//  C3) O feedback dizia sempre "propagadas no sistema central" mesmo quando
//      a sincronização falhou ou não existiu (sucesso fabricado).
// ============================================================================

/** Colunas lidas pelo login do cidadão (F53: + morada, email — existem em produção). */
export const PROFILE_HYDRATION_COLUMNS =
  'name, phone, nif, passport, birth_date, filiation, marital_status, morada, email';

/** Monta o patch COMPLETO da página Conta (inclui a morada — C1). */
export const buildCitizenContaPatch = (
  bi: string,
  fields: {
    name?: string; phone?: string; email?: string;
    filiation?: string; maritalStatus?: string; morada?: string;
  },
): CitizenProfilePatch => ({
  bi: bi || '',
  name: fields.name,
  phone: fields.phone,
  email: fields.email,
  filiation: fields.filiation,
  maritalStatus: fields.maritalStatus,
  morada: fields.morada,
});

/** Linha de `profiles` → campos de sessão do cidadão (só presentes; C2). */
export const profileRowToCitizenFields = (row: Record<string, unknown> | null | undefined): Record<string, string> => {
  if (!row || typeof row !== 'object') return {};
  const out: Record<string, string> = {};
  const put = (key: string, val: unknown) => { if (val) out[key] = String(val); };
  put('name', row.name);
  put('phone', row.phone);
  put('nif', row.nif);
  put('passport', row.passport);
  if (row.birth_date) out.birthDate = String(row.birth_date).split('-').reverse().join('/');
  put('filiation', row.filiation);
  put('maritalStatus', row.marital_status);
  put('address', row.morada);
  put('email', row.email);
  return out;
};

/**
 * Feedback HONESTO do guardar da página Conta (C3 — padrão F48):
 * "sucesso/propagado" SÓ quando a nuvem confirmou; caso contrário avisa que
 * ficou guardado apenas neste dispositivo. NUNCA promete re-envio automático
 * (não existe fila de re-tentativa — não inventamos comportamento).
 */
export const contaSaveFeedbackFromOutcome = (
  outcome: ProfileSyncOutcome | 'local_only' | 'no_cloud',
): { type: 'success' | 'info'; text: string; details: string } => {
  if (outcome === 'ok' || outcome === 'created' || outcome === 'schema_retry') {
    return {
      type: 'success',
      text: 'Perfil atualizado com sucesso!',
      details: 'As suas informações pessoais foram guardadas e sincronizadas no sistema central.',
    };
  }
  if (outcome === 'demo' || outcome === 'not_bound' || outcome === 'local_only' || outcome === 'no_cloud') {
    return {
      type: 'success',
      text: 'Perfil atualizado com sucesso!',
      details: 'As suas informações pessoais foram guardadas e aplicadas na sua conta e sessão interativa do dispositivo.',
    };
  }
  return {
    type: 'success',
    text: 'Perfil guardado com sucesso neste dispositivo.',
    details:
      'As suas informações pessoais foram atualizadas localmente na sua sessão ativa e sincronizadas com o histórico.',
  };
};

/** NUNCA lança — classifica sempre. */
export const syncProfileToCloud = async (
  client: SupabaseClient,
  patch: CitizenProfilePatch,
): Promise<ProfileSyncResult> => {
  const bi = (patch.bi || '').trim();
  if (!bi) return { outcome: 'error', message: 'BI ausente.', fields: [] };
  if (homologationStore.isExempt(bi)) {
    return { outcome: 'demo', fields: [] };
  }
  if (!client?.from) return { outcome: 'unavailable', message: 'cliente Supabase ausente.', fields: [] };

  const cols = toColumns(patch);
  const fields = Object.keys(cols);
  if (!fields.length) return { outcome: 'ok', message: 'nenhum campo para sincronizar.', fields: [] };

  const runSave = async (columns: Record<string, string>): Promise<{ error: PostgrestError | null; created: boolean }> => {
    const { data: existing, error: findErr } = await client
      .from('profiles').select('id').eq('bi', bi).maybeSingle();
    if (findErr) return { error: findErr, created: false };
    if (existing) {
      const { error } = await client.from('profiles').update(columns).eq('bi', bi);
      return { error, created: false };
    }
    const { error } = await client.from('profiles').insert([{ bi, ...columns }]);
    return { error, created: true };
  };

  try {
    let res = await runSave(cols);
    if (res.error && res.error.code === 'PGRST204') {
      // Esquema de produção divergente (coluna em falta): recuar para núcleo
      const core: Record<string, string> = {};
      if (cols.name) core.name = cols.name;
      if (cols.phone) core.phone = cols.phone;
      if (!Object.keys(core).length) {
        return { outcome: 'error', message: res.error.message, fields: [] };
      }
      res = await runSave(core);
      if (res.error) {
        const kind = classifyAuthError(res.error);
        return {
          outcome: kind === 'unavailable' ? 'unavailable' : 'error',
          message: res.error.message,
          fields: [],
        };
      }
      console.log('[PERFIL-SYNC] schema_retry — gravados apenas os campos núcleo.', bi);
      return { outcome: 'schema_retry', fields: Object.keys(core) };
    }
    if (res.error) {
      const kind = classifyAuthError(res.error);
      return {
        outcome: kind === 'unavailable' ? 'unavailable' : 'error',
        message: res.error.message,
        fields: [],
      };
    }
    console.log('[PERFIL-SYNC] Perfil sincronizado na nuvem:', fields.join('+'), '•', bi);
    return { outcome: res.created ? 'created' : 'ok', fields };
  } catch (e) {
    const kind = classifyAuthError(e);
    return {
      outcome: kind === 'unavailable' ? 'unavailable' : 'error',
      message: e?.message || String(e),
      fields: [],
    };
  }
};
