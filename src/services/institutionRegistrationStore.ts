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
  members: { id: string; name: string; email: string; role: string; dept: string; password: string; mustChangePassword: boolean; }[];
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
