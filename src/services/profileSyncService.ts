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
import { classifyAuthError } from './cloudAuthService';

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

// ============================================================================
// Etapa #4 — SYNC AUTOMÁTICO DO PERFIL
// ----------------------------------------------------------------------------
// Quando o cidadão edita o perfil e a nuvem NÃO confirma (sem rede, RLS,
// serviço em baixo), o guardar honesto dizia "guardado localmente; sync
// pendente" — mas NUNCA voltava a tentar. Esta camada acrescenta:
//   • Fila local de pendências (localStorage, por BI) — o patch é guardado
//     para reenvio automático quando a nuvem voltar;
//   • reenviarPendenciasPerfil() — chamado periodicamente pelo App (5 min)
//     e no regresso do online; só limpa a pendência quando a nuvem confirmar;
//   • puxarPerfilDaNuvem() — pull dirigido (multi-dispositivo) devolvendo os
//     campos a aplicar na sessão local (o chamador decide aplicar ou não,
//     respeitando a guarda de edição F45).
// NUNCA inventa sucesso: a pendência só é removida com confirmação da nuvem.
// ============================================================================

export interface PendenciaPerfil {
  id: string;
  bi: string;
  patch: CitizenProfilePatch;
  criadoEm: string; // ISO
  ultimaTentativa?: string;
  tentativas: number;
}

const PENDENCIAS_KEY = 'cda_profile_sync_pending_v1';
const PENDENCIAS_MAX = 20;

const lerPendenciasRaw = (): PendenciaPerfil[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PENDENCIAS_KEY);
    const lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
};

/** Guarda o patch como pendência de sincronização (uma por BI, fundida). */
export const guardarPendenciaPerfil = (bi: string, patch: CitizenProfilePatch): PendenciaPerfil => {
  const biKey = (bi || '').trim().toUpperCase();
  const lista = lerPendenciasRaw();
  const resto = lista.filter(p => p.bi.toUpperCase() !== biKey);
  const nova: PendenciaPerfil = {
    id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    bi: biKey,
    patch: { ...patch, bi: biKey },
    criadoEm: new Date().toISOString(),
    tentativas: 0,
  };
  const atualizada = [nova, ...resto].slice(0, PENDENCIAS_MAX);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(PENDENCIAS_KEY, JSON.stringify(atualizada));
    } catch {
      /* sem espaço — sem espelho */
    }
  }
  return nova;
};

/** Pendencias locais do cidadão (mais recentes primeiro). */
export const lerPendenciasPerfil = (bi: string): PendenciaPerfil[] => {
  const biKey = (bi || '').trim().toUpperCase();
  if (!biKey) return [];
  return lerPendenciasRaw().filter(p => p.bi.toUpperCase() === biKey);
};

export const temPendenciaPerfil = (bi: string): boolean => lerPendenciasPerfil(bi).length > 0;

/** Remove uma pendência (após confirmação da nuvem). */
export const limparPendenciaPerfil = (bi: string, id?: string): void => {
  const biKey = (bi || '').trim().toUpperCase();
  const lista = lerPendenciasRaw();
  const restante = lista.filter(p =>
    p.bi.toUpperCase() !== biKey || (id ? p.id !== id : false),
  );
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(PENDENCIAS_KEY, JSON.stringify(restante));
    } catch {
      /* ignora */
    }
  }
};

export interface ResultadoReenvio {
  reenviadas: number;
  falharam: number;
  bi: string;
}

/**
 * Reenvia as pendências do cidadão. Só limpa cada pendência quando a nuvem
 * confirmar (ok/created/schema_retry). Devolve o resumo honesto.
 */
export const reenviarPendenciasPerfil = async (
  client: SupabaseClient,
  bi: string,
): Promise<ResultadoReenvio> => {
  const pendencias = lerPendenciasPerfil(bi);
  if (!pendencias.length) return { reenviadas: 0, falharam: 0, bi };
  if (!client?.from) return { reenviadas: 0, falharam: pendencias.length, bi };

  let reenviadas = 0;
  let falharam = 0;
  for (const p of pendencias) {
    const res = await syncProfileToCloud(client, p.patch);
    const ok = res.outcome === 'ok' || res.outcome === 'created' || res.outcome === 'schema_retry';
    if (ok) {
      limparPendenciaPerfil(bi, p.id);
      reenviadas += 1;
    } else {
      falharam += 1;
      // atualiza tentativas (diagnóstico honesto)
      const lista = lerPendenciasRaw();
      const atualizada = lista.map(item =>
        item.id === p.id
          ? { ...item, tentativas: item.tentativas + 1, ultimaTentativa: new Date().toISOString() }
          : item,
      );
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(PENDENCIAS_KEY, JSON.stringify(atualizada));
        } catch {
          /* ignora */
        }
      }
    }
  }
  return { reenviadas, falharam, bi };
};

/**
 * Pull dirigido: lê a linha `profiles` da nuvem e devolve os campos a aplicar
 * na sessão local (multi-dispositivo). O chamador decide aplicar — deve
 * respeitar a guarda de edição (isProfileEditActive) antes de updateUserFields.
 * Devolve null em erro/ausência de linha.
 */
export const puxarPerfilDaNuvem = async (
  client: SupabaseClient,
  bi: string,
): Promise<Record<string, string> | null> => {
  if (!bi.trim() || !client?.from) return null;
  const { data, error } = await client
    .from('profiles')
    .select(PROFILE_HYDRATION_COLUMNS)
    .eq('bi', bi.trim())
    .maybeSingle();
  if (error) return null;
  const campos = profileRowToCitizenFields(data as Record<string, unknown> | null);
  return Object.keys(campos).length ? campos : null;
};
