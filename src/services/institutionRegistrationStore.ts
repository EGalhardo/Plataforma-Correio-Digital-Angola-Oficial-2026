import type { SupabaseClient } from '@supabase/supabase-js';
import { registoPublicoProxy } from './supabaseService';
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
  cidade?: string;
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
  members: {
    id: string; name: string; email: string; phone?: string; role: string; dept: string;
    password: string; mustChangePassword: boolean; agentNumber?: string;
    /** 2026-08-22 — páginas (tabs) que o colaborador pode abrir. undefined = sem restrições (legado). */
    paginasPermitidas?: string[];
  }[];
}

const LOCAL_REGS_KEY = 'cda_inst_regs_v1';
const INST_MARKER = '[Instituição]';
const PACK_PREFIX = '[INST:';
const PACK_SUFFIX = ']';

export const normalizeInstCode = (code?: string): string =>
  (code || '').toUpperCase().replace(/\s+/g, '').trim();

/** Normaliza o NOME da instituição (2026-08-20): corrige a variante em
 *  minúsculas do INAPEM gravada na nuvem para a forma canónica exibida na
 *  plataforma. Outros nomes passam intactos. */
export const normalizarNomeInstituicao = (nome?: string | null): string => {
  const n = (nome || '').trim();
  if (!n) return n;
  if (/^INAPEM\s*[—-]\s*instituto nacional de apoio as micro, pequenas e médias empresas\.?$/i.test(n)) {
    return 'INAPEM — Instituto Nacional de Apoio as Micro, Pequenas e Médias Empresas';
  }
  return n;
};

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

// F49 — remoção do espelho local da instituição (adesão eliminada pelo Admin):
// sem isto, o espelho sobrevivia e a adesão ELIMINADA continuava a entrar com
// acesso total por credencial local — exactamente o bypass F47 do cidadão.
export const removeLocalInstReg = (code?: string): void => {
  const key = normalizeInstCode(code);
  if (!key) return;
  const kept = readRegs().filter(r => normalizeInstCode(r.code) !== key);
  if (kept.length !== readRegs().length) writeRegs(kept);
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

export const updateLocalInstReg = (code: string, patch: Partial<LocalInstitutionRegistration>): void => {  const regs = readRegs();
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

// 2026-08-21 — perfil do COLABORADOR editado por ELE na página Perfil:
// grava nos dados do próprio membro (nunca na linha `profiles` da instituição,
// que pertence ao responsável). A nuvem (Auth metadata) é sincronizada à parte
// via /api/perfil-sync?agente=...
export const updateInstMemberProfile = (
  code: string,
  memberId: string,
  patch: Partial<Pick<InstMember, 'name' | 'email' | 'phone' | 'role' | 'dept' | 'paginasPermitidas'>>
): void => {
  const reg = getLocalInstReg(code);
  if (!reg) return;
  updateLocalInstReg(code, {
    members: (reg.members || []).map(m => m.id === memberId ? { ...m, ...patch } : m),
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
 * Validação rigorosa da SIGLA institucional:
 * - Mínimo 2, máximo 10 caracteres
 * - Apenas letras A-Z (sem números, sem caracteres especiais)
 * - Devolve { valido: boolean, erro: string | null, siglaLimpa: string }
 */
export const validarSigla = (sigla: string): { valido: boolean; erro: string | null; siglaLimpa: string } => {
  const limpa = normalizeInstCode(sigla);
  if (!limpa || limpa.length < 2) {
    return { valido: false, erro: 'A sigla deve ter pelo menos 2 caracteres.', siglaLimpa: limpa };
  }
  if (limpa.length > 10) {
    return { valido: false, erro: 'A sigla deve ter no máximo 10 caracteres.', siglaLimpa: limpa };
  }
  if (!/^[A-Z]+$/.test(limpa)) {
    return { valido: false, erro: 'A sigla deve conter apenas letras (A-Z).', siglaLimpa: limpa };
  }
  return { valido: true, erro: null, siglaLimpa: limpa };
};

/**
 * Validação dos campos de localização segundo a DPA de Angola (Lei n.º 14/24):
 * Província, Município, Comuna (3 níveis administrativos oficiais).
 * Suporta também assinatura legada com 'cidade'.
 */
export const validarLocalizacao = (
  provincia: string,
  municipioOuCidade: string,
  comunaOuMunicipio: string,
  comunaOpcional?: string
): { valido: boolean; erro: string | null } => {
  let p = provincia;
  let m = municipioOuCidade;
  let c = comunaOuMunicipio;

  // Se foram passados 4 argumentos (legado: provincia, cidade, municipio, comuna)
  if (typeof comunaOpcional === 'string') {
    m = comunaOuMunicipio;
    c = comunaOpcional;
  }

  const campos = [
    { nome: 'Província', valor: p },
    { nome: 'Município', valor: m },
    { nome: 'Comuna', valor: c },
  ];
  for (const campo of campos) {
    if (!campo.valor || campo.valor.trim() === '' || campo.valor === 'Selecione...') {
      return { valido: false, erro: `Preencha o campo "${campo.nome}".` };
    }
  }
  return { valido: true, erro: null };
};

/**
 * F6/B2 — Código Institucional: SIGLA (apenas letras, máx. 10) + '-' + iniciais
 * da DPA Oficial (Província, Município e Comuna).
 * Fórmula DPA 2025: Loc = Inicial(Província) + Inicial(Município) + Inicial(Comuna)
 * Exemplo: SME-LVM (Luanda / Viana / Mulenvos)
 */
export const buildInstitutionalCode = (
  sigla: string,
  provincia: string,
  municipioOuCidade: string,
  comunaOuMunicipio: string,
  takenCodesOuComuna?: string[] | string,
  takenCodesOpcional?: string[]
): string => {
  let m = municipioOuCidade;
  let co = comunaOuMunicipio;
  let takenCodes: string[] = [];

  if (Array.isArray(takenCodesOuComuna)) {
    // Assinatura de 3 níveis: (sigla, provincia, municipio, comuna, takenCodes)
    takenCodes = takenCodesOuComuna;
  } else if (typeof takenCodesOuComuna === 'string') {
    // Assinatura legada de 4 níveis: (sigla, provincia, cidade, municipio, comuna, takenCodes)
    m = comunaOuMunicipio;
    co = takenCodesOuComuna;
    takenCodes = takenCodesOpcional || [];
  }

  // Validar SIGLA: apenas letras, 2-10 caracteres
  const sig = normalizeInstCode(sigla).replace(/[^A-Z]/g, '').slice(0, 10);
  if (!sig || sig.length < 2) return 'INSTITUICAO';
  
  // Extrair iniciais de cada campo de localização (remove acentos primeiro)
  const P = initialLetter(provincia);
  const M = initialLetter(m);
  const Co = initialLetter(co);
  const loc = P + M + Co;
  
  const taken = new Set(takenCodes.map(normalizeInstCode));
  const base = `${sig}-${loc}`;
  if (!taken.has(base)) return base;
  // Colisão: adicionar sufixo numérico (começa em 2)
  let n = 2;
  while (taken.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
};

/**
 * Consulta o número de agentes existentes para uma instituição na base de dados
 * Supabase (tabela profiles). O responsável conta como agente 01, os membros
 * subsequentes recebem 02, 03, etc.
 * 
 * @returns O próximo número sequencial disponível (total + 1)
 */
export const countExistingAgents = async (
  supabase: SupabaseClient, instCode: string
): Promise<{ count: number; nextSeq: number; error: string | null }> => {
  const code = normalizeInstCode(instCode);
  if (!code) return { count: 0, nextSeq: 1, error: 'Código institucional vazio.' };
  
  try {
    // Consultar na tabela profiles todos os agentes desta instituição
    // O código da instituição fica no campo 'bi' (ex: SME-LLVV-01)
    const { data, error } = await supabase
      .from('profiles')
      .select('bi')
      .eq('role', 'instituicao')
      .or(`bi.eq.${code},bi.like.${code}-%`)
      .limit(1000);
    
    if (error) {
      console.warn('[AgentCount] Erro ao consultar agentes:', error.message);
      return { count: 0, nextSeq: 1, error: error.message };
    }
    
    // Contar registos únicos (evitar duplicados)
    const uniqueAgents = new Set<string>();
    for (const row of (data || [])) {
      const bi = String(row.bi || '').toUpperCase().trim();
      if (bi) uniqueAgents.add(bi);
    }
    
    const totalAgents = uniqueAgents.size;
    // Próximo sequencial = total + 1 (responsável é sempre 01)
    const nextSeq = totalAgents + 1;
    
    return { count: totalAgents, nextSeq, error: null };
  } catch (e: any) {
    console.warn('[AgentCount] Exceção ao contar agentes:', e?.message || e);
    return { count: 0, nextSeq: 1, error: e?.message || 'Erro desconhecido.' };
  }
};

/**
 * Conta agentes existentes no store LOCAL (fallback offline) + base de dados.
 * Combina ambas as fontes para garantir que o próximo Nº de Agente é único.
 */
export const countAgentsWithLocalFallback = async (
  supabase: SupabaseClient, instCode: string
): Promise<{ count: number; nextSeq: number }> => {
  const code = normalizeInstCode(instCode);
  
  // 1. Contar no store local
  let localCount = 1; // responsável (-01) sempre existe
  const reg = getLocalInstReg(code);
  if (reg) {
    localCount = 1 + (reg.members || []).length;
  }
  
  // 2. Contar na nuvem (se disponível)
  const isReady = isSupabaseReady();
  if (isReady && supabase) {
    const cloudResult = await countExistingAgents(supabase, code);
    if (cloudResult.error === null) {
      // Usar o maior entre local e nuvem (garante que não reutilizamos números)
      const maxCount = Math.max(localCount, cloudResult.count);
      return { count: maxCount, nextSeq: maxCount + 1 };
    }
  }
  
  // Fallback: só store local
  return { count: localCount, nextSeq: localCount + 1 };
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
  !!(import.meta.env).VITE_SUPABASE_URL && !!(import.meta.env).VITE_SUPABASE_ANON_KEY;

/**
 * Anti-duplicação de dados (disponíveis na coluna + pacote) + geração do próximo código.
 * Consulta `solicitacoes_registo` (todas as linhas; o email é global, a sigla só entre instituições).
 * Em falta de rede/tabela, usa a loja local — a rede de segurança continua a ser o UNIQUE do bi_numero.
 */
export const collectInstitutionUniqueness = async (supabase: SupabaseClient): Promise<{
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
      let data: any[] | null = null;
      // v37.78.18 — select ANONIMO: a uniqueness da adesão pública tem de ver
      // TODA a fila (com sessão de cidadão o servidor devolve só as próprias
      // linhas — siglas/e-mails duplicados escapavam à verificação).
      const viaProxy = await registoPublicoProxy('select', undefined, undefined, { anonimo: true });
      if (viaProxy === null) {
        const d = await supabase
          .from('solicitacoes_registo')
          .select('bi_numero, email, observacoes');
        if (!d.error && d.data) data = d.data as any[];
      } else if (viaProxy.ok) {
        data = (viaProxy.linhas || []) as any[];
      }
      if (data) {
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
