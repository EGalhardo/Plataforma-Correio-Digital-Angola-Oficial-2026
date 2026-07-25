// ============================================================================
// Credenciais locais dos Agentes da Administração — Correio Digital Angola
// ----------------------------------------------------------------------------
// Modelo espelho dos colaboradores institucionais (S7): senhas 100% locais
// (localStorage deste dispositivo), a senha NUNCA viaja para a nuvem. O login
// da área Admin aceita "ADMIN-NNNN" + senha para os agentes criados na página
// Equipa (legado "Admin-NN" continua válido) — a identidade demo canónica
// (ADM-8812-OP) fica intacta.
// v10.1 (Admin Alfa): o elemento mais alto da hierarquia regista-se UMA única
// vez com o Nº fixo ADMIN-0001 (marcação 'cda_admin_alfa_v1'); os restantes
// membros são adicionados por ele na página Equipa (ADMIN-0002, ADMIN-0003, …).
// ============================================================================

export interface AdminAgentCred {
  agent: string;       // 'ADMIN-0001', 'ADMIN-0002', … (auto-gerado; legado 'Admin-NN' continua válido)
  password: string;    // demo — apenas neste dispositivo
  workerId: string;    // liga ao trabalhador da Equipa (correio_digital_admin_workers)
  name: string;
}

const CREDS_KEY = 'cda_admin_agent_creds_v1';

// ---------- v10.1 — Admin Alfa (elemento mais alto da hierarquia) ----------
/** Nº Agente reservado ao Admin Alfa — atribuído uma única vez, na página Registo. */
export const ADMIN_ALFA_AGENT = 'ADMIN-0001';
/** D3 — chave da marcação dedicada "Alfa registado" neste dispositivo. */
const ALFA_KEY = 'cda_admin_alfa_v1';

/** D3 — devolve o Nº do Alfa registado (null = ainda não há Alfa neste dispositivo). */
export const getAdminAlfa = (): string | null => {
  try { return localStorage.getItem(ALFA_KEY); } catch { return null; }
};

/** D3 — grava a marcação "Alfa registado" (fecha a opção "Registar" do login Admin). */
export const setAdminAlfa = (agent: string): void => {
  try { localStorage.setItem(ALFA_KEY, normalizeAgentNumber(agent)); }
  catch (e) { console.warn('[AdminAgents] Falha ao gravar a marcação do Admin Alfa:', e); }
};

/** D4 — recuperação: limpa a marcação (a opção "Registar" volta a activar). */
export const clearAdminAlfa = (): void => {
  try { localStorage.removeItem(ALFA_KEY); } catch { /* sem storage */ }
};

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

/** Próximo Nº Agente Admin livre: 'ADMIN-NNNN' sequencial global (máx. existente + 1, 4 dígitos).
 *  O Alfa reserva o nº 1; a normalização maiúscula faz o legado 'Admin-NN' contar na sequência. */
export const nextAdminAgentNumber = (existing: string[]): string => {
  let max = 0;
  for (const raw of existing) {
    const m = normalizeAgentNumber(raw).match(/^ADMIN-(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `ADMIN-${String(max + 1).padStart(4, '0')}`;
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

/** Remove credencial: o agente deixa de entrar no login Admin.
 *  D4 (v10.1) — se a credencial removida era a do Admin Alfa, a opção "Registar" reactiva. */
export const removeAdminAgentByWorker = (workerId: string): void => {
  const creds = readCreds();
  writeCreds(creds.filter(c => c.workerId !== workerId));
  const alfa = getAdminAlfa();
  if (alfa && creds.some(c => c.workerId === workerId && normalizeAgentNumber(c.agent) === normalizeAgentNumber(alfa))) {
    clearAdminAlfa();
  }
};

/** Resolve o login "ADMIN-NNNN" + senha (legado 'Admin-NN' normaliza). null = credenciais não reconhecidas. */
export const resolveAdminAgentLogin = (agentRaw: string, password: string): AdminAgentCred | null => {
  const cred = getAdminAgentCred(agentRaw);
  if (!cred || !password) return null;
  return cred.password === password ? cred : null;
};
