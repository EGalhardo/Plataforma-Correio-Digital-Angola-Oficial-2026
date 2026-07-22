// ============================================================================
// Loja Canónica de Homologação de Contas — Correio Digital Angola
// ----------------------------------------------------------------------------
// Regra de negócio implementada:
//  · Após o registo, o cidadão PODE autenticar-se, mas a conta permanece
//    INATIVA (modo homologação) até a Área de Administração aprovar os dados.
//  · Enquanto pendente/rejeitada, o cidadão não recebe correspondência de
//    instituições — a ÚNICA entidade que comunica é a Área de Administração.
//  · Persistência local (mesmo padrão demo do projeto: localStorage + BI),
//    100% interoperável entre sessões/abas do mesmo dispositivo.
// ============================================================================

export type HomologationStatus = 'pending' | 'rejected' | 'active' | 'blocked' | 'correcao';

export interface HomologationRecord {
  status: HomologationStatus;
  reason?: string;
  name?: string;
  updatedAt: string;
}

export interface HomologationMessage {
  id: string;
  from: 'admin' | 'citizen' | 'system';
  text: string;
  at: string;
}

const STATUS_KEY = 'cda_homologation_statuses_v1';
const THREADS_KEY = 'cda_homologation_threads_v1';

// Identidades demo canónicas do piloto — NUNCA passam por homologação,
// para não quebrar o fluxo de demonstração já existente.
const ALWAYS_ACTIVE_IDENTIFIERS = ['009874562LA041', 'AGT-9921-SR', 'ADM-8812-OP'];

export const normalizeHomologationBi = (bi?: string): string =>
  (bi || '').toUpperCase().replace(/\s+/g, '').trim();

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[HomologationStore] Falha ao gravar no armazenamento local:', e);
  }
};

const nowStamp = (): string => new Date().toLocaleString('pt-AO');

export const homologationStore = {
  /** Identidades demo já nascem ativas e nunca são gated. */
  isExempt: (bi?: string): boolean =>
    ALWAYS_ACTIVE_IDENTIFIERS.includes(normalizeHomologationBi(bi)),

  /** Devolve o registo de homologação de um BI (ou null se nunca registou/é isento). */
  getStatus: (bi?: string): HomologationRecord | null => {
    const key = normalizeHomologationBi(bi);
    if (!key || ALWAYS_ACTIVE_IDENTIFIERS.includes(key)) return null;
    const all = readJson<Record<string, HomologationRecord>>(STATUS_KEY, {});
    return all[key] || null;
  },

  /** Define/atualiza o estado de homologação de um BI. */
  setStatus: (bi: string, status: HomologationStatus, reason?: string, name?: string): void => {
    const key = normalizeHomologationBi(bi);
    if (!key) return;
    const all = readJson<Record<string, HomologationRecord>>(STATUS_KEY, {});
    const prev = all[key];
    all[key] = {
      status,
      reason: (status === 'rejected' || status === 'correcao' || status === 'blocked') ? reason : undefined,
      name: name || prev?.name,
      updatedAt: nowStamp(),
    };
    writeJson(STATUS_KEY, all);
  },

  /** Remove o registo (ex.: após ativação bem-sucedida, se se quiser limpar). */
  clearStatus: (bi: string): void => {
    const key = normalizeHomologationBi(bi);
    const all = readJson<Record<string, HomologationRecord>>(STATUS_KEY, {});
    if (all[key]) {
      delete all[key];
      writeJson(STATUS_KEY, all);
    }
  },

  /** Remove TODA a correspondência do BI (ex.: registo recomeçado ou conta eliminada). */
  clearThread: (bi: string): void => {
    const key = normalizeHomologationBi(bi);
    const all = readJson<Record<string, HomologationMessage[]>>(THREADS_KEY, {});
    if (all[key]) {
      delete all[key];
      writeJson(THREADS_KEY, all);
    }
  },

  /** Thread de correspondência oficial da homologação (Admin ⇄ Cidadão). */
  getThread: (bi?: string): HomologationMessage[] => {
    const key = normalizeHomologationBi(bi);
    if (!key) return [];
    const all = readJson<Record<string, HomologationMessage[]>>(THREADS_KEY, {});
    return all[key] || [];
  },

  addMessage: (bi: string, from: HomologationMessage['from'], text: string): HomologationMessage | null => {
    const key = normalizeHomologationBi(bi);
    if (!key || !text.trim()) return null;
    const all = readJson<Record<string, HomologationMessage[]>>(THREADS_KEY, {});
    const msg: HomologationMessage = {
      id: `hom_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      from,
      text: text.trim(),
      at: nowStamp(),
    };
    all[key] = [...(all[key] || []), msg];
    writeJson(THREADS_KEY, all);
    return msg;
  },
};

// ----------------------------------------------------------------------------
// Mensagens oficiais automáticas da Área de Administração
// (a única identidade autorizada a corresponder durante a homologação)
// ----------------------------------------------------------------------------

export const notifyRegistrationSubmitted = (bi: string, name?: string): void => {
  // Novo pedido de registo: a correspondência de processos ANTERIORES deste BI
  // é descartada — cada registo recomeça com a caixa limpa, contendo UMA única
  // confirmação oficial da Área de Administração.
  homologationStore.clearThread(bi);
  homologationStore.addMessage(
    bi,
    'admin',
    `Exmo(a). ${name || 'Cidadão(ã)'}, a Área de Administração do Correio Digital de Angola confirma a receção do seu pedido de registo. A sua documentação encontra-se em homologação pelos inspetores de identificação civil nacional, com resposta prevista em menos de 24 horas. Enquanto a sua conta não for ativada, não poderá receber correspondência oficial das instituições (AGT, SME, ENDE, EPAL, entre outras). Este canal é a via oficial exclusiva de comunicação durante o processo.`
  );
};

export const notifyAccountApproved = (bi: string, name?: string): void => {
  homologationStore.addMessage(
    bi,
    'admin',
    `Exmo(a). ${name || 'Cidadão(ã)'}, informamos que a sua identidade foi HOMOLOGADA e a sua conta no Correio Digital de Angola está oficialmente ATIVA. A partir deste momento pode receber correspondência oficial de todas as instituições integradas. Bem-vindo à rede nacional de correio digital.`
  );
};

export const notifyAccountRejected = (bi: string, name: string | undefined, reason: string): void => {
  homologationStore.addMessage(
    bi,
    'admin',
    `Exmo(a). ${name || 'Cidadão(ã)'}, após análise documental e biométrica, o seu pedido de registo foi INDEFERIDO. Motivo oficial: "${reason}". Pode corrigir os dados e reenviar a documentação para nova análise através do botão de reenvio disponível nesta área.`
  );
};

export const notifyAccountReopened = (bi: string, name?: string): void => {
  homologationStore.addMessage(
    bi,
    'admin',
    `Exmo(a). ${name || 'Cidadão(ã)'}, o seu processo de homologação foi reaberto para nova revisão administrativa. A sua conta regressa ao estado Pendente de Homologação. Será notificado por este canal assim que houver uma decisão.`
  );
};

export const notifyAccountUnblocked = (bi: string, name?: string): void => {
  homologationStore.addMessage(
    bi,
    'admin',
    `Exmo(a). ${name || 'Cidadão(ã)'}, o bloqueio preventivo da sua conta foi levantado pela Área de Administração. A sua conta no Correio Digital de Angola encontra-se novamente ATIVA.`
  );
};
