// ============================================================================
// accountGateService — F47 · Revogação de acesso de contas eliminadas
// ----------------------------------------------------------------------------
// Regra de negócio (pedido do proprietário, 2026-07-28):
//   "Quando uma conta válida é eliminada no painel do admin, ela precisa de
//    ser aprovada NOVAMENTE pelo admin."
//
// Factos de arquitectura que motivam este serviço:
//   1) A eliminação pelo Admin (GovContactsContent) remove a linha da fila
//      oficial (solicitacoes_registo) e os ficheiros do Storage, MAS a conta
//      Auth sobrevive — o cliente nunca terá a chave de serviço para a apagar.
//   2) A política SELECT da fila (v12/v14) só vê a linha com sessão do titular
//      ou do admin: um SELECT anónimo devolve SEMPRE zero linhas, quer a conta
//      exista quer não. Por isso a leitura pré-login exige a RPC
//      `cda_prelogin_cidadao` (v16, security definer) — gémea da RPC
//      institucional `cda_prelogin_instituicao` da v15.
//   3) Com a RPC, "linha inexistente" passa a ser um facto fiável em QUALQUER
//      estado de sessão. Se a fila não tem registo do B.I. MAS há provas de
//      que a conta existiu (sessão Auth válida agora, marcador de nuvem neste
//      dispositivo, ou credencial local de transição), então a conta foi
//      ELIMINADA => o acesso fica REVOGADO até a um novo registo aprovado de
//      novo pela Área de Administração (a aprovação automática por PVI fica
//      suprimida no re-registo — ver RegisterStepper, F47).
//
// Testabilidade (regra da casa): nada de `import.meta.env` — o cliente é
// injectado (`if (client)`), tal como institutionSessionService (F44/F46).
// ============================================================================

import { homologationStore, normalizeHomologationBi, HomologationStatus } from './homologationStore';
import type { SupabaseClient } from '@supabase/supabase-js';
import { unmarkCloudAccount } from './cloudAuthService';

export interface CitizenRegistrationRead {
  /** true = a leitura é digna de confiança (RPC ou SELECT com sessão/resposta). */
  ok: boolean;
  /** Estado da linha MAIS RECENTE da fila oficial; null = B.I. sem registo. */
  status: string | null;
  /** Via usada: RPC security-definer (v16) → SELECT directo → indisponível. */
  source: 'rpc' | 'select' | 'proxy' | 'unavailable';
}

/**
 * Lê o estado oficial mais recente do B.I. na fila central de registo.
 * 1) RPC `cda_prelogin_cidadao` (v16): fiável COM ou SEM sessão (security
 *    definer; devolve apenas o estado — nunca dados pessoais).
 * 2) Fallback SELECT directo (janela de deploy sem v16 aplicada): com sessão
 *    do titular, RLS deixa ver a própria linha; anónimo não vê nada — nesse
 *    caso `ok` chega true mas `status` null NÃO é prova de inexistência (o
 *    chamador só o trata como revogação quando há sessão viva — ver
 *    isRevokedDeletedAccount).
 */
export const readCitizenRegistrationStatus = async (
  client: SupabaseClient,
  bi: string,
): Promise<CitizenRegistrationRead> => {
  const cleanBi = normalizeHomologationBi(bi);
  if (!client || !cleanBi) return { ok: false, status: null, source: 'unavailable' };

  // 1) RPC security-definer (v16)
  if (client.rpc) {
    try {
      const { data, error } = await client.rpc('cda_prelogin_cidadao', { p_bi: cleanBi });
      if (!error && Array.isArray(data)) {
        const row = data[0];
        return { ok: true, status: row && row.status ? String(row.status) : null, source: 'rpc' };
      }
      // Erro (função inexistente na janela de deploy, rede, etc.) → fallback.
    } catch { /* fallback */ }
  }

  // 2) Fallback: SELECT directo + proxy do servidor (2026-08-20). O gate corre
  // ANTES do login (sem sessão) — o proxy responde a leitura pública restrita
  // (bi_numero+status) e devolve o estado real mesmo com a RLS endurecida.
  try {
    const r = await fetch('/api/dados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabela: 'solicitacoes_registo', operacao: 'select', filtros: { bi_numero: cleanBi }, limite: 5 }),
    });
    const j = await r.json().catch(() => null);
    if (j && j.ok && Array.isArray(j.linhas) && j.linhas.length) {
      return { ok: true, status: j.linhas[0].status ? String(j.linhas[0].status) : null, source: 'proxy' };
    }
  } catch { /* indisponível */ }
  if (client.from) {
    try {
      const { data, error } = await client
        .from('solicitacoes_registo')
        .select('status')
        .eq('bi_numero', cleanBi)
        .order('criado_em', { ascending: false })
        .limit(1);
      if (!error && Array.isArray(data)) {
        return { ok: true, status: data[0] && data[0].status ? String(data[0].status) : null, source: 'select' };
      }
    } catch { /* indisponível */ }
  }

  return { ok: false, status: null, source: 'unavailable' };
};

export interface RevocationSignals {
  read: CitizenRegistrationRead;
  /** Sessão Auth acabou de ser validada (a fila foi lida COM claims do titular). */
  sessionLive: boolean;
  /** Provas locais de existência prévia: marcador de nuvem ou senha local. */
  hasLocalEvidence: boolean;
}

/**
 * A conta foi ELIMINADA (acesso revogado)?
 * Verdade apenas quando as duas pernas são certas:
 *   (a) a fila oficial NÃO tem registo do B.I. (leitura fiável), e
 *   (b) a conta EXISTIU antes (sessão Auth válida agora ou vestígio local).
 * Sem (b) trata-se de um B.I. nunca registado — via F12 intacta (sessão limpa,
// não verificada). Com leitura `select` anónima, (a) é indistinguível da RLS —
// só a sessão viva o torna prova (a linha própria seria visível se existisse).
 */
export const isRevokedDeletedAccount = (s: RevocationSignals): boolean => {
  if (!s.read.ok || s.read.status !== null) return false;
  if (s.read.source === 'rpc') return s.sessionLive || s.hasLocalEvidence;
  if (s.read.source === 'select') return s.sessionLive;
  return false;
};

/**
 * Purga os vestígios LOCAIS de uma conta revogada neste dispositivo:
 * estado/correspondência de homologação, credencial de transição, marcador de
 * nuvem, matrizes faciais, espelho da correspondência oficial na caixa de
 * entrada e registo de lidas. (Espelha a cascata local que o Admin já faz no
 * dispositivo dele em GovContactsContent.)
 */
export const purgeCitizenLocalResidues = (bi: string): void => {
  const cleanBi = normalizeHomologationBi(bi);
  if (!cleanBi) return;
  try { homologationStore.clearStatus(cleanBi); } catch { /* ignora */ }
  try { homologationStore.clearThread(cleanBi); } catch { /* ignora */ }
  try { localStorage.removeItem(`citizen_pass_${cleanBi}`); } catch { /* ignora */ }
  try { unmarkCloudAccount(cleanBi); } catch { /* ignora */ }
  try { localStorage.removeItem(`cda_read_msgs_${cleanBi}`); } catch { /* ignora */ }
  ['user', 'institution', 'admin'].forEach((m) => {
    try { localStorage.removeItem(`cda_demo_face_${m}_${cleanBi}`); } catch { /* ignora */ }
  });
  // v37.71 — RASTO DE VIDAS ANTERIORES da mesma B.I. (recriar/eliminar em ciclo):
  // a FOTO de perfil escolhida na página Perfil (avatarService, chave por B.I.),
  // os dados de perfil editados (perfilLocalService) e a entrada antiga na lista
  // local do Admin (gov_admin_citizens, com facePhoto de registos antigos)
  // sobreviviam à eliminação e eram re-hidratados na conta RE-CRIADA no login
  // seguinte — a conta nova nascia com a foto/dados de uma vida anterior.
  try { localStorage.removeItem(`cda_avatar_user_${cleanBi}`); } catch { /* ignora */ }
  try { localStorage.removeItem(`cda_perfil_dados_user_${cleanBi}`); } catch { /* ignora */ }
  try {
    const rawCit = localStorage.getItem('gov_admin_citizens');
    if (rawCit) {
      const list = JSON.parse(rawCit);
      if (Array.isArray(list)) {
        const kept = list.filter((c: { biNumber?: string }) =>
          String(c?.biNumber || '').toUpperCase().replace(/\s+/g, '') !== cleanBi);
        if (kept.length !== list.length) {
          localStorage.setItem('gov_admin_citizens', JSON.stringify(kept));
        }
      }
    }
  } catch { /* ignora */ }
  try {
    const raw = localStorage.getItem('correio_digital_inbox');
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const kept = list.filter((m: { homologation?: boolean; homologationBi?: string }) => !(
          m && m.homologation === true &&
          normalizeHomologationBi(m.homologationBi) === cleanBi
        ));
        if (kept.length !== list.length) {
          localStorage.setItem('correio_digital_inbox', JSON.stringify(kept));
        }
      }
    }
  } catch { /* ignora */ }
};

// ----------------------------------------------------------------------------
// F48 — Sincronização VIVA do estado oficial em sessão aberta (área do cidadão)
// ----------------------------------------------------------------------------
// Sem isto, a decisão do Admin noutro dispositivo só era aprendida no PRÓXIMO
// login (a luz "Online" ficava vermelha com a sessão aberta e a correspondência
// continuava bloqueada). O App sonda a cada 8s e aplica a acção devolvida aqui.

export type CloudGateAction =
  | { type: 'noop' }
  | { type: 'set'; status: HomologationStatus }
  | { type: 'revoke' };

/** Mapa oficial: estado da fila central → estado local de homologação. */
export const CLOUD_STATUS_TO_LOCAL: Record<string, HomologationStatus> = {
  'Aprovado': 'active',
  'Pendente': 'pending',
  'Bloqueado': 'blocked',
  'Reprovado': 'rejected',
  'Rejeitado': 'rejected',
  'Não Aprovado': 'rejected',
};

/**
 * Decide o que fazer com a leitura oficial mais recente, dado o estado local
// actual. Regras de segurança:
//  · leitura indisponível (D3 offline) → nunca tocar no estado local;
//  · "sem linha" só revoga quando vem da RPC security-definer (v16): o SELECT
//    anónimo de fallback devolve SEMPRE zero linhas por RLS — revogar aí seria
//    falso positivo (sessões locais de transição morreriam sem motivo);
//  · "sem linha" sem estado local = via F12 limpa — nada a revogar;
//  · estado idêntico ao local → noop (sem re-renders nem mensagens duplicadas).
 */
export const resolveCloudGateAction = (
  read: CitizenRegistrationRead,
  currentLocal: HomologationStatus | null,
  bi?: string,
): CloudGateAction => {
  if (!read.ok) return { type: 'noop' };
  if (read.status === null) {
    if (read.source === 'rpc' && currentLocal !== null) return { type: 'revoke' };
    return { type: 'noop' };
  }
  const next = CLOUD_STATUS_TO_LOCAL[read.status];
  if (!next || next === currentLocal) return { type: 'noop' };
  // F47-fix (2026-08-19): não rebaixar uma conta localmente ACTIVA para 'pending'
  // quando a nuvem diz 'Pendente' mas NUNCA aprovou esta conta (cenário admin demo
  // sem sessão Auth: a homologação local não persistiu na BD). Mantém-se activa.
  // Se a nuvem JÁ aprovou antes (marca local cda_cloud_approved_<bi>) e agora diz
  // Pendente, é uma REABERTURA real → rebaixa (segurança preservada).
  if (next === 'pending' && currentLocal === 'active' && bi) {
    let cloudApprovedAntes = false;
    try {
      cloudApprovedAntes = typeof localStorage !== 'undefined'
        && localStorage.getItem('cda_cloud_approved_' + bi) === '1';
    } catch { cloudApprovedAntes = false; }
    if (!cloudApprovedAntes) return { type: 'noop' };
  }
  return { type: 'set', status: next };
};

/** F47-fix — grava que a NUVEM já aprovou este B.I. (usada para distinguir uma
 *  reabertura real de uma homologação local demo não persistida). */
export const marcarCloudAprovou = (bi: string): void => {
  try { localStorage.setItem('cda_cloud_approved_' + bi, '1'); } catch { /* ignora */ }
};
