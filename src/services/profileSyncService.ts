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

/** NUNCA lança — classifica sempre. */
export const syncProfileToCloud = async (
  client: any,
  patch: CitizenProfilePatch,
): Promise<ProfileSyncResult> => {
  const bi = (patch.bi || '').trim();
  if (!bi) return { outcome: 'error', message: 'BI ausente.', fields: [] };

  // 1. Desvio de demos (regra v13 nº 2 — demos intocadas, desvio explícito)
  if (homologationStore.isExempt(bi)) {
    console.log('[DEMO] syncProfileToCloud ignorado — conta de demonstração (D7/v12).');
    return { outcome: 'demo', fields: [] };
  }
  // 2. Conta ainda não migrada: sem via de nuvem (v12/D3 mantém tudo local)
  if (!isCloudBound(bi)) return { outcome: 'not_bound', fields: [] };
  if (!client?.from) return { outcome: 'unavailable', message: 'cliente Supabase ausente.', fields: [] };

  const cols = toColumns(patch);
  const fields = Object.keys(cols);
  if (!fields.length) return { outcome: 'ok', message: 'nenhum campo para sincronizar.', fields: [] };

  const runSave = async (columns: Record<string, string>): Promise<{ error: any; created: boolean }> => {
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
  } catch (e: any) {
    const kind = classifyAuthError(e);
    return {
      outcome: kind === 'unavailable' ? 'unavailable' : 'error',
      message: e?.message || String(e),
      fields: [],
    };
  }
};
