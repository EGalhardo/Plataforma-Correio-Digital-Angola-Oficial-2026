// ============================================================================
// Credenciais locais dos Agentes da Administração — Correio Digital Angola
// ----------------------------------------------------------------------------
// Modelo espelho dos colaboradores institucionais (S7): senhas 100% locais
// (localStorage deste dispositivo), a senha NUNCA viaja para a nuvem. O login
// da área Admin aceita "Admin-NN" + senha para os agentes criados na página
// Equipa — a identidade demo canónica (ADM-8812-OP) fica intacta.
// ============================================================================

export interface AdminAgentCred {
  agent: string;       // 'Admin-01', 'Admin-02', … (auto-gerado)
  password: string;    // demo — apenas neste dispositivo
  workerId: string;    // liga ao trabalhador da Equipa (correio_digital_admin_workers)
  name: string;
}

const CREDS_KEY = 'cda_admin_agent_creds_v1';

export const normalizeAgentNumber = (agent?: string): string =>
  (agent || '').toUpperCase().replace(/\s+/g, '').trim();

const readCreds = (): AdminAgentCred[] => {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const writeCreds = (creds: AdminAgentCred[]): void => {
  try { localStorage.setItem(CREDS_KEY, JSON.stringify(creds)); }
  catch (e) { console.warn('[AdminAgents] Falha ao gravar credenciais locais:', e); }
};

export const getAdminAgentCreds = (): AdminAgentCred[] => readCreds();

export const getAdminAgentCred = (agent?: string): AdminAgentCred | undefined => {
  const key = normalizeAgentNumber(agent);
  return readCreds().find(c => normalizeAgentNumber(c.agent) === key);
};

/** Próximo Nº Agente Admin livre: 'Admin-NN' sequencial global (máx. existente + 1). */
export const nextAdminAgentNumber = (existing: string[]): string => {
  let max = 0;
  for (const raw of existing) {
    const m = normalizeAgentNumber(raw).match(/^ADMIN-(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `Admin-${String(max + 1).padStart(2, '0')}`;
};

/** A senha identifica a pessoa — sem repetições dentro da área Admin. */
export const isAdminAgentPasswordTaken = (password: string, excludeAgent?: string): boolean => {
  if (!password) return false;
  const ex = normalizeAgentNumber(excludeAgent);
  return readCreds().some(c => normalizeAgentNumber(c.agent) !== ex && c.password === password);
};

export const addAdminAgent = (cred: AdminAgentCred): void => {
  const creds = readCreds().filter(c => normalizeAgentNumber(c.agent) !== normalizeAgentNumber(cred.agent));
  creds.push(cred);
  writeCreds(creds);
};

/** Actualiza a senha do agente (mantém o resto). */
export const updateAdminAgentPassword = (agent: string, password: string): void => {
  const key = normalizeAgentNumber(agent);
  writeCreds(readCreds().map(c => normalizeAgentNumber(c.agent) === key ? { ...c, password } : c));
};

/** Remove credencial: o agente deixa de entrar no login Admin. */
export const removeAdminAgentByWorker = (workerId: string): void => {
  writeCreds(readCreds().filter(c => c.workerId !== workerId));
};

/** Resolve o login "Admin-NN" + senha. null = credenciais não reconhecidas. */
export const resolveAdminAgentLogin = (agentRaw: string, password: string): AdminAgentCred | null => {
  const cred = getAdminAgentCred(agentRaw);
  if (!cred || !password) return null;
  return cred.password === password ? cred : null;
};
