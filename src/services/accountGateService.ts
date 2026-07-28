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

import { homologationStore, normalizeHomologationBi } from './homologationStore';
import { unmarkCloudAccount } from './cloudAuthService';

export interface CitizenRegistrationRead {
  /** true = a leitura é digna de confiança (RPC ou SELECT com sessão/resposta). */
  ok: boolean;
  /** Estado da linha MAIS RECENTE da fila oficial; null = B.I. sem registo. */
  status: string | null;
  /** Via usada: RPC security-definer (v16) → SELECT directo → indisponível. */
  source: 'rpc' | 'select' | 'unavailable';
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
  client: any,
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

  // 2) Fallback: SELECT directo (verdadeiro apenas com sessão do titular/admin)
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
// estado/correspondência de homologação, credencial de transição, marcador de
// nuvem, matrizes faciais, espelho da correspondência oficial na caixa de
// entrada e registo de lidas. (Espelha a cascata local que o Admin já faz no
// dispositivo dele em GovContactsContent.)
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
  try {
    const raw = localStorage.getItem('correio_digital_inbox');
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const kept = list.filter((m: any) => !(
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
