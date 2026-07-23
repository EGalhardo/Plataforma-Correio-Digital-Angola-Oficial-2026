// ============================================================================
// Loja Local de Registos de Instituições — Correio Digital Angola
// ----------------------------------------------------------------------------
// Espelho (fallback offline) dos registos guardados em `solicitacoes_registo`.
// O Código Institucional funciona como o "B.I. da instituição": é gravado na
// coluna bi_numero (UNIQUE) e indexa a homologação/thread, exactamente como o
// BI do cidadão. O pacote de dados novos viaja em observacoes com o marcador
// `[Instituição] [INST:{...json...}]` — mesmo padrão do `[KYC:...]` do cidadão.
// ============================================================================

export interface InstitutionRegPack {
  v: 1;
  sigla: string;
  tipo: string;
  provincia: string;
  cidade: string;
  municipio: string;
  comuna: string;
  endereco: string;
  emailContacto: string;
  emailAcesso: string;
  telefone: string;
  responsavel: string;
  cargo: string;
  agentNumber?: string;   // F6 — Nº Agente Institucional do responsável ('-01')
}

export interface LocalInstitutionRegistration {
  code: string;
  nome: string;
  email: string;             // email de acesso (coluna email)
  password: string;          // demo — igual ao modelo actual do cidadão
  status: string;            // 'Pendente' | 'Aprovado' | 'Rejeitado'
  motivo?: string;
  observacoes: string;
  criadoEm: string;
  logoDataUrl?: string;      // F4 — logótipo carregado no Perfil
  agentNumber?: string;   // F6 — Nº Agente do responsável (código + '-01')
  members: { id: string; name: string; email: string; role: string; dept: string; password: string; mustChangePassword: boolean; agentNumber?: string; }[];
}

const LOCAL_REGS_KEY = 'cda_inst_regs_v1';
const INST_MARKER = '[Instituição]';
const PACK_PREFIX = '[INST:';
const PACK_SUFFIX = ']';

export const normalizeInstCode = (code?: string): string =>
  (code || '').toUpperCase().replace(/\s+/g, '').trim();

export const buildInstObservacoes = (pack: InstitutionRegPack, humanText?: string): string =>
  `${INST_MARKER} ${humanText?.trim() || 'Pedido de adesão institucional ao Correio Digital Angola.'} ${PACK_PREFIX}${JSON.stringify(pack)}${PACK_SUFFIX}`;

export const isInstitutionObservacao = (obs?: string | null): boolean =>
  !!obs && obs.includes(INST_MARKER);

export const parseInstPack = (obs?: string | null): InstitutionRegPack | null => {
  if (!obs) return null;
  const i = obs.indexOf(PACK_PREFIX);
  if (i < 0) return null;
  const j = obs.indexOf(PACK_SUFFIX, i + PACK_PREFIX.length);
  if (j < 0) return null;
  try {
    const parsed = JSON.parse(obs.slice(i + PACK_PREFIX.length, j));
    if (parsed && typeof parsed === 'object' && parsed.sigla) return parsed as InstitutionRegPack;
  } catch { /* ignora */ }
  return null;
};

// ---------- Loja local ----------

const readRegs = (): LocalInstitutionRegistration[] => {
  try {
    const raw = localStorage.getItem(LOCAL_REGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const writeRegs = (regs: LocalInstitutionRegistration[]): void => {
  try { localStorage.setItem(LOCAL_REGS_KEY, JSON.stringify(regs)); }
  catch (e) { console.warn('[InstReg] Falha ao gravar registos locais:', e); }
};

export const getLocalInstRegs = (): LocalInstitutionRegistration[] => readRegs();

export const getLocalInstReg = (code?: string): LocalInstitutionRegistration | undefined => {
  const key = normalizeInstCode(code);
  return readRegs().find(r => normalizeInstCode(r.code) === key);
};

export const saveLocalInstReg = (reg: Omit<LocalInstitutionRegistration, 'members'> & { members?: LocalInstitutionRegistration['members'] }): void => {
  const regs = readRegs();
  const key = normalizeInstCode(reg.code);
  const idx = regs.findIndex(r => normalizeInstCode(r.code) === key);
  const full: LocalInstitutionRegistration = { members: [], ...reg };
  if (idx >= 0) {
    full.members = full.members.length ? full.members : (regs[idx].members || []);
    full.logoDataUrl = full.logoDataUrl || regs[idx].logoDataUrl;
    regs[idx] = full;
  } else {
    regs.push(full);
  }
  writeRegs(regs);
};

export const updateLocalInstReg = (code: string, patch: Partial<LocalInstitutionRegistration>): void => {
  const regs = readRegs();
  const key = normalizeInstCode(code);
  const idx = regs.findIndex(r => normalizeInstCode(r.code) === key);
  if (idx < 0) return;
  regs[idx] = { ...regs[idx], ...patch };
  writeRegs(regs);
};

// ---------- Equipa da instituição (F4 — senhas 100% locais) ----------

export type InstMember = LocalInstitutionRegistration['members'][number];

export const listInstMembers = (code?: string): InstMember[] => getLocalInstReg(code)?.members || [];

export const addInstMember = (code: string, member: InstMember): void => {
  const reg = getLocalInstReg(code);
  if (!reg) return;
  updateLocalInstReg(code, { members: [...(reg.members || []), member] });
};

export const removeInstMember = (code: string, memberId: string): void => {
  const reg = getLocalInstReg(code);
  if (!reg) return;
  updateLocalInstReg(code, { members: (reg.members || []).filter(m => m.id !== memberId) });
};

export const updateInstMemberPassword = (code: string, memberId: string, password: string, requireChangeOnNextLogin = false): void => {
  const reg = getLocalInstReg(code);
  if (!reg) return;
  updateLocalInstReg(code, {
    members: (reg.members || []).map(m => m.id === memberId ? { ...m, password, mustChangePassword: requireChangeOnNextLogin } : m),
  });
};

/** A senha é a identidade da pessoa: dentro da mesma instituição não pode haver repetição. */
export const isInstPasswordTaken = (code: string, password: string, excludeMemberId?: string): boolean => {
  const reg = getLocalInstReg(code);
  if (!reg || !password) return false;
  if (reg.password === password) return true;
  return (reg.members || []).some(m => m.id !== excludeMemberId && m.password === password);
};

export const setInstResponsiblePassword = (code: string, password: string): void => {
  updateLocalInstReg(code, { password });
};

export const setInstLogo = (code: string, dataUrl: string): void => {
  updateLocalInstReg(code, { logoDataUrl: dataUrl });
};

// ---------- Geração do Código Institucional (SIGLA maiúscula + sequencial global) ----------

/** Próximo número global dado um conjunto de códigos existentes (sequencial — 2 dígitos, cresce após 99). */
export const nextGlobalSeq = (existingCodes: string[]): number => {
  let max = 0;
  for (const raw of existingCodes) {
    const m = normalizeInstCode(raw).match(/(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return max + 1;
};

/** Código final: SIGLA (alfanumérica, máx. 8) + sequencial com 2 dígitos (mínimo). */
export const buildInstCode = (sigla: string, seq: number): string => {
  const clean = normalizeInstCode(sigla).replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'INST';
  return `${clean}${String(seq).padStart(2, '0')}`;
};

// ---------- F6 — Código: SIGLA + iniciais P/C/M/C · Nº Agente: código + '-NN' ----------

export const stripAccentsUpper = (str?: string): string =>
  (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

/** 1.ª letra A-Z do lugar; ausente/estranha → 'X' (C2). */
export const initialLetter = (place?: string): string => {
  const m = stripAccentsUpper(place).match(/[A-Z]/);
  return m ? m[0] : 'X';
};

/**
 * F6/B2 — Código Institucional: SIGLA (alfanumérica, máx. 8) + '-' + iniciais
 * de Província, Cidade, Município e Comuna. Colisão → sufixo numérico no código
 * (C3): SME-LLVV, SME-LLVV2, … (nunca confunde com o '-NN' do agente).
 */
export const buildInstitutionalCode = (
  sigla: string, provincia: string, cidade: string, municipio: string, comuna: string,
  takenCodes: string[]
): string => {
  const sig = normalizeInstCode(sigla).replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'INST';
  const loc = initialLetter(provincia) + initialLetter(cidade) + initialLetter(municipio) + initialLetter(comuna);
  const taken = new Set(takenCodes.map(normalizeInstCode));
  const base = `${sig}-${loc}`;
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
};

/** F6 — Nº Agente Institucional = código da instituição + '-' + NN (2 dígitos). */
export const buildAgentNumber = (instCode: string, seq: number): string =>
  `${normalizeInstCode(instCode)}-${String(seq).padStart(2, '0')}`;

/** F6 — Separa "SME-LLVV-01" em { code: 'SME-LLVV', seq: 1 }; sem sufixo NN → seq null. */
export const splitAgentNumber = (raw?: string): { code: string; seq: number | null } => {
  const norm = normalizeInstCode(raw);
  const m = norm.match(/^(.*)-(\d{2})$/);
  if (!m || !m[1]) return { code: norm, seq: null };
  return { code: m[1], seq: parseInt(m[2], 10) };
};

/** F6/B4 — Próximo Nº de agente livre dentro da instituição (responsável = 01). */
export const nextMemberAgentNumber = (code: string): string => {
  const reg = getLocalInstReg(code);
  let max = 1; // responsável
  for (const m of (reg?.members || [])) {
    const { seq } = splitAgentNumber(m.agentNumber || '');
    if (seq && seq > max) max = seq;
  }
  return buildAgentNumber(code, max + 1);
};

/** F6 — Localiza a pessoa de um Nº de agente (responsável '-01' ou membro). */
export const findInstitutionAgent = (
  code: string, agentNumber: string
): { type: 'responsible' } | { type: 'member'; member: InstMember } | null => {
  const { code: c, seq } = splitAgentNumber(agentNumber);
  if (normalizeInstCode(code) !== c || seq === null) return null;
  if (seq === 1) return { type: 'responsible' };
  const reg = getLocalInstReg(code);
  const member = (reg?.members || []).find(m => splitAgentNumber(m.agentNumber || '').seq === seq && normalizeInstCode(splitAgentNumber(m.agentNumber || '').code) === c);
  return member ? { type: 'member', member } : null;
};

const isSupabaseReady = (): boolean =>
  !!((import.meta as any).env || {}).VITE_SUPABASE_URL && !!((import.meta as any).env || {}).VITE_SUPABASE_ANON_KEY;

/**
 * Anti-duplicação de dados (disponíveis na coluna + pacote) + geração do próximo código.
 * Consulta `solicitacoes_registo` (todas as linhas; o email é global, a sigla só entre instituições).
 * Em falta de rede/tabela, usa a loja local — a rede de segurança continua a ser o UNIQUE do bi_numero.
 */
export const collectInstitutionUniqueness = async (supabase: any): Promise<{
  takenCodes: string[];
  takenEmails: string[];
  takenSiglas: string[];
}> => {
  const result = { takenCodes: [] as string[], takenEmails: [] as string[], takenSiglas: [] as string[] };

  // 1. Loja local (funciona offline)
  for (const r of readRegs()) {
    result.takenCodes.push(normalizeInstCode(r.code));
    if (r.email) result.takenEmails.push(r.email.toLowerCase().trim());
    const p = parseInstPack(r.observacoes);
    if (p) {
      result.takenSiglas.push(normalizeInstCode(p.sigla));
      if (p.emailContacto) result.takenEmails.push(p.emailContacto.toLowerCase().trim());
      if (p.emailAcesso) result.takenEmails.push(p.emailAcesso.toLowerCase().trim());
    }
  }

  // 2. Nuvem (se disponível)
  if (isSupabaseReady() && supabase) {
    try {
      const { data, error } = await supabase
        .from('solicitacoes_registo')
        .select('bi_numero, email, observacoes');
      if (!error && data) {
        for (const row of data as any[]) {
          if (row?.email) result.takenEmails.push(String(row.email).toLowerCase().trim());
          const pack = parseInstPack(row?.observacoes);
          if (isInstitutionObservacao(row?.observacoes)) {
            if (row?.bi_numero) result.takenCodes.push(normalizeInstCode(row.bi_numero));
            if (pack) result.takenSiglas.push(normalizeInstCode(pack.sigla));
            if (pack?.emailContacto) result.takenEmails.push(pack.emailContacto.toLowerCase().trim());
            if (pack?.emailAcesso) result.takenEmails.push(pack.emailAcesso.toLowerCase().trim());
          }
        }
      }
    } catch (e) {
      console.warn('[InstReg] Verificação de duplicados indisponível — a de segurança é a coluna UNIQUE:', e);
    }
  }

  return result;
};
