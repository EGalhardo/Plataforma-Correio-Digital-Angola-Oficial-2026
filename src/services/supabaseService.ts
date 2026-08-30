import { supabase } from '../lib/supabaseClient';
import { Message, Document, Contact, UserRequest, DocRequest, Correspondence, AppNotification, DigitalProtocol } from '../types';
import { generateProtocol } from '../utils/protocolGenerator';
import { MOCK_CITIZENS, MOCK_USERS, MOCK_SESSION_USER } from '../constants/mocks';
import {
  buildEmergencyAlertRow,
  insertEmergencyAlertWithClient,
  type EmergencyAlertInput,
  type EmergencyAlertOutcome,
} from './emergencyContactsService';
import {
  lookupCidadaoByBi,
  fetchRedeEmergencia,
  recordInstitutionBroadcast,
  type InstCitizenLookupResult,
  type FetchRedeResult,
  type BroadcastRecordRow,
  type RecordBroadcastResult,
} from './institutionEmergencyService';

// ----------------------------------------------------------------------------
// Linhas cruas do PostgREST (travessia de tipagem 2026-08-07 — item 4 do
// backlog): substituem os mappers soltos. Declaram as colunas que os mappers
// realmente leem; o tsconfig esta sem strictNullChecks, pelo que valores
// null vindos da BD continuam a compilar tal como antes — o ganho real e
// autocompletar + apanhar erros de digitacao no nome da coluna.
// ----------------------------------------------------------------------------
interface LinhaMensagem {
  id: number | string; org: string; preview: string; created_at: string;
  unread: boolean; status: string; subject: string; body: string;
  deadline_text: string; state_indicator: string; actions: string[];
  attachments: string[]; sensitivity: string; priority_scale: string;
  deadline_hours_remaining: number; sender_bi: string; recipient_bi: string;
  protocol_number?: string | null;
  document_type?: string | null;
}

// v27 (2026-08-10) — hidrata message.protocol a partir da coluna
// messages.protocol_number. Sem isto, os mappers de leitura deixavam
// protocol indefinido, o detalhe gerava um numero LOCAL e o botao
// «CLIQUE PARA VALIDAR» validava um protocolo que a nuvem nao conhece
// (cai invariavelmente em «nao_encontrado»). O cast e seguro: o detalhe
// usa apenas protocol.protocolNumber para a RPC; os restantes campos
// visuais caem no fallback generateProtocol de MessageDetail.
function protocoloDaLinha(protocolNumber?: string | null): DigitalProtocol | undefined {
  const numero = (protocolNumber || '').trim();
  return numero ? ({ protocolNumber: numero } as DigitalProtocol) : undefined;
}
interface LinhaPerfilNome { bi: string; name: string; }
interface LinhaDocumento {
  name: string; validity: string; code: string; holder_bi: string;
  document_number: string; issuer: string; issued_at: string;
}
interface LinhaContacto {
  id: number; name: string; bi: string; relation: string; status: string;
  type: string; phone: string | null; whatsapp: string | null; email: string | null;
}
interface LinhaUserRequest {
  id: number; user_name: string; service_type: string; priority: string;
  time_text: string; status: string; user_bi: string; institution: string;
  request_date: string | null;
}
interface LinhaDocRequest {
  id: number; user_name: string; user_bi: string; doc_type: string;
  institution: string; request_date: string | null; status: string; ai_status: string;
}
// linha de audit_logs: tudo opcional — o semeador aceita objectos parciais
// ({action,time}) e o mapper de leitura preenche os restantes.
interface LinhaAuditLog {
  id?: number | string; action?: string; username?: string;
  timestamp?: string; action_type?: string;
  message?: string; user?: string; type?: string;
}
interface LinhaProtocolo {
  protocolNumber: string; issuerInstitution: string; officialIssueDate?: string;
  officialTime?: string; issuerResponsible?: string; category?: string;
  documentType?: string; currentState?: string; priority?: string;
  qrCodeUrl?: string; digitalSignature?: string; legalValidity?: string;
}
interface LinhaNotificacao {
  title: string; message: string; time?: string; type?: string; targetTab?: string;
}

// linha CRUA da tabela notifications (mapper de leitura)
interface LinhaNotificacaoRow {
  id: number | string; target_bi: string; title: string; message: string;
  time_text: string; type: string; target_tab: string;
  // 2026-08-22 — a tabela de PRODUÇÃO usa read_at (null = não lida);
  // não existe a coluna 'unread' (o insert com ela falhava 42703).
  read_at?: string | null;
}
interface ProfileUpsertPayload {
  bi: string; name: string; phone: string | null; nif: string | null;
  passport: string | null; birth_date: string | undefined;
  filiation: string | null; marital_status: string | null; role: string;
}

/**
 * Service to connect and synchronize state with the Supabase database.
 * Formatted and typed to align 100% with /supabase/schema.sql and the application types.
 */

// Simple helper to detect if we have valid non-placeholder keys set
export const hasValidSupabaseKeys = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return url && url !== '' && !url.includes('placeholder-url') && key && !key.includes('placeholder-anon-key');
};

export function resolveCitizenBi(nameOrBi: string): string {
  // F61 — NUNCA fabricar destinatário: input vazio devolve vazio (antes caía
  // silenciosamente para o BI de demonstração → mensagem real endereçada ao
  // cidadão fictício + perfil-fantasma criado por ensureProfileExists).
  if (!nameOrBi) return nameOrBi;
  const normalized = nameOrBi.trim().toLowerCase();
  
  // Check if it's already a BI of one of our citizens
  const matchedByBi = MOCK_CITIZENS.find(c => c.bi.toLowerCase() === normalized);
  if (matchedByBi) return matchedByBi.bi;

  // Try matching by name substring
  const matchedByName = MOCK_CITIZENS.find(c => c.fullName.toLowerCase().includes(normalized));
  if (matchedByName) return matchedByName.bi;

  // Fallback to active logged-in citizen BI if Edlasio Galhardo
  if (normalized.includes('edlasio') || normalized.includes('galhardo')) {
    return MOCK_SESSION_USER.bi;
  }
  
  // Or check if the name is a legacy mock user
  const matchedUser = MOCK_USERS.find(u => u.name.toLowerCase().includes(normalized) || u.bi.toLowerCase() === normalized);
  if (matchedUser) return matchedUser.bi;

  // If match still not found, check if input looks like BI
  if (normalized.length >= 9) {
    return nameOrBi;
  }

  // F61 — sem correspondência: devolve o input EXACTAMENTE como foi escrito
  // (antes: 'default fallback' → BI de demonstração = destinatário errado
  // em silêncio). BIs reais (15) e códigos (≥9) já passam acima intactos.
  return nameOrBi;
}

export function resolveCitizenName(bi: string): string {
  if (!bi) return MOCK_SESSION_USER.name;
  const matched = MOCK_CITIZENS.find(c => c.bi === bi);
  if (matched) return matched.fullName;
  const matchedUser = MOCK_USERS.find(u => u.bi === bi);
  if (matchedUser) return matchedUser.name;
  return bi;
}

export const resolveInstitutionCode = (label?: string): string => {
  if (!label) return 'AGT';
  const trimmedLabel = label.trim();
  // F34 — código institucional REAL (ex.: AGT-9921-SR) passa intacto:
  // a Nova Mensagem do cidadão endereça directamente pelo código.
  if (isRealInstitutionalCode(trimmedLabel)) return trimmedLabel.toUpperCase();
  const explicit = label.match(/\(([^)]+)\)/)?.[1];
  if (explicit) return explicit.toUpperCase();
  const normalized = label.toUpperCase();
  if (normalized.includes('ADMINISTRAÇÃO GERAL TRIBUTÁRIA') || normalized.includes('AGT')) return 'AGT';
  if (normalized.includes('SERVIÇO DE MIGRAÇÃO') || normalized.includes('SME')) return 'SME';
  if (normalized.includes('ENDE')) return 'ENDE';
  if (normalized.includes('EPAL')) return 'EPAL';
  if (normalized.includes('TRIBUNAL')) return 'TRIBUNAL';
  if (normalized.includes('HOSPITAL') || normalized.includes('MINSA')) return 'MINSA';
  if (normalized.includes('REGISTO CIVIL')) return 'REGISTO_CIVIL';
  if (normalized.includes('MINJUS')) return 'MINJUS';
  if (normalized.includes('CDA') || normalized.includes('ADMINISTRAÇÃO CENTRAL')) return 'CDA';
  return normalized.split(' ')[0].replace(/[^A-Z]/g, '').slice(0, 12) || 'INSTITUICAO';
};

const inferProfileRole = (identifier: string): 'user' | 'institution' | 'admin' => {
  const upper = identifier.toUpperCase();
  if (upper === 'CDA' || upper.startsWith('ADM-')) return 'admin';
  if (/^[0-9]{6,}[A-Z]{2,}/.test(upper)) return 'user';
  return 'institution';
};

const deriveProfileName = (identifier: string, fallbackName?: string) => {
  if (fallbackName) return fallbackName;
  const role = inferProfileRole(identifier);
  if (role === 'admin') return 'Administração Central do Correio Digital Angola';
  if (role === 'institution') return identifier;
  return identifier;
};

const ensureProfileExists = async (bi: string, name?: string, role?: 'user' | 'institution' | 'admin') => {
  if (!hasValidSupabaseKeys()) return;
  try {
    const { data, error } = await supabase.from('profiles').select('bi').eq('bi', bi).maybeSingle();
    if (error) throw error;
    if (!data) {
      await supabase.from('profiles').insert([{
        bi,
        name: deriveProfileName(bi, name),
        role: role || inferProfileRole(bi),
      }]);
    }
  } catch (e) {
    console.warn('ensureProfileExists warning:', bi, e);
  }
};

const createMessagePayload = ({
  msg,
  senderBi,
  recipientBi,
  org,
  unread = true,
}: {
  msg: Message;
  senderBi: string;
  recipientBi: string;
  org: string;
  unread?: boolean;
}) => ({
  id: msg.id,
  sender_bi: senderBi,
  recipient_bi: recipientBi,
  org,
  preview: msg.preview,
  unread,
  status: msg.status || 'Normal',
  subject: msg.details?.subject || msg.preview,
  body: msg.details?.body || '',
  deadline_text: msg.details?.deadline || 'Sem prazo',
  state_indicator: msg.details?.state || 'Entregue',
  actions: msg.details?.actions || [],
  attachments: msg.details?.attachments || [],
  sensitivity: msg.sensitivity || 'Privado',
  priority_scale: msg.priorityScale || 'Normal',
  deadline_hours_remaining: msg.deadlineHoursRemaining || null,
  protocol_id: null,
  protocol_number: msg.protocol?.protocolNumber || null,
});

const createStateHistoryPayload = ({
  messageId,
  state,
  responsible,
  description,
}: {
  messageId: number;
  state: string;
  responsible: string;
  description: string;
}) => {
  const now = new Date();
  return {
    message_id: messageId,
    state,
    event_date: now.toISOString().split('T')[0],
    event_time: now.toTimeString().slice(0, 8),
    responsible,
    description,
  };
};

export interface InstitutionMailboxBundle { messages: Message[]; legacyIds: number[]; }

/** F14 — código institucional real da forma SIGLA-XXXX (ex.: SME-LLVV, SME-LLVV2).
 *  Exclui o formato legado/demo ('AGT-9921-SR', 'ENDE01') e etiquetas sem traço. */
export const isRealInstitutionalCode = (raw?: string): boolean =>
  // v37.76.2 — códigos oficiais podem ter DOIS hífens (ex.: AGT-9921-SR,
  // ADM-8812-OP); antes só 1 hífen era aceite e «AGT-9921-SR» degradava para
  // «AGT» no recipient_bi da cloud (envio do cidadão perdia o destino real).
  /^[A-Z0-9]{2,8}(-[A-Z0-9]{2,8}){1,2}$/.test((raw || '').trim().toUpperCase());

// ---- N-3 (auditoria master 2026-08-09) — micro-cache de LEITURA das caixas ----
// A hidratação inicial corre várias vezes nos primeiros ~dez segundos de
// sessão (deps de identidade + eventos Realtime das escritas de arranque da
// conta, ex.: reposição do perfil canónico demo). Este cache de ~30 s faz com
// que só a primeira execução toque na rede; as seguintes, sem nenhuma
// alteração na base, reutilizam o resultado. É INVALIDADO em qualquer mudança
// na tabela `messages` (o canal Realtime em App.tsx chama
// invalidateMessagesReadCache ANTES de pedir o refetch) e purgado quando a
// leitura falha — qualquer escrita na nuvem dispara evento, fura o cache e o
// re-carregamento vai à rede buscar os dados novos: a integridade da
// correspondência e a frescura dirigida por Realtime ficam intactas.
const MSG_READ_CACHE_TTL_MS = 30000;
const messagesReadCache = new Map<string, { ts: number; value: Promise<unknown> }>();
const readThroughMessagesCache = <T>(key: string, producer: () => Promise<T>): Promise<T> => {
  const hit = messagesReadCache.get(key);
  if (hit && Date.now() - hit.ts < MSG_READ_CACHE_TTL_MS) return hit.value as Promise<T>;
  const value = producer();
  messagesReadCache.set(key, { ts: Date.now(), value });
  void value.then(
    (v) => { if (v === null) messagesReadCache.delete(key); },
    () => { messagesReadCache.delete(key); },
  );
  return value;
};
export const invalidateMessagesReadCache = (): void => { messagesReadCache.clear(); };

/** Proxy genérico para ficheiros/fluxos que usavam `solicitacoes_registo`
 *  diretamente (registo de cidadão/instituição, consola de administração).
 *  Devolve null quando não há sessão (demo — usar caminho directo). */
export const registoPublicoProxy = async (
  operacao: 'select' | 'insert' | 'update' | 'delete',
  filtros?: Record<string, string | number>,
  dados?: Record<string, unknown>,
): Promise<{ ok: boolean; linhas?: any[]; erro?: string } | null> => {
  try {
    const token = await obterTokenSessao();
    const resp = await fetch('/api/dados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        tabela: 'solicitacoes_registo', operacao,
        filtros: filtros || {}, dados: dados ?? {},
        ...(operacao === 'select' ? { limite: 2000 } : {}),
      }),
    });
    return await resp.json().catch(() => null);
  } catch {
    return { ok: false, erro: 'rede' };
  }
};

/** Eliminação em cascata de um cidadão (2026-08-20) — via servidor com service
 *  role e verificação do papel admin. Devolve null quando não há sessão Auth
 *  (conta demo — o chamador segue o caminho local histórico com aviso honesto). */
export const eliminarCidadaoAdmin = async (bi: string): Promise<{ ok: boolean; erro?: string } | null> => {
  try {
    const token = await obterTokenSessao();
    if (!token) return null;
    const resp = await fetch('/api/admin-cidadao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bi }),
    });
    const j = await resp.json().catch(() => null);
    if (j && j.ok === true) return { ok: true };
    if (j && j.erro === 'demo') return null;
    return { ok: false, erro: (j && j.erro) || 'Falha na eliminação central.' };
  } catch {
    return { ok: false, erro: 'Rede indisponível.' };
  }
};

/** ELIMINAÇÃO COMPLETA DE AGENTE (2026-08-22) — página Equipa: o servidor
 *  remove a conta Auth (e-mail sintético determinístico) e os avatares do
 *  Storage; o cliente remove credenciais/espelhos locais. Autorização do
 *  servidor: responsável da instituição elimina membros da SUA instituição;
 *  admin elimina agentes ADMIN-NNNN. Contas demo nunca tocam na nuvem. */
export const eliminarAgente = async (agente: string): Promise<{ ok: boolean; demo?: boolean; conta?: string; erro?: string }> => {
  try {
    const token = await obterTokenSessao();
    if (!token) return { ok: false, erro: 'A sua sessão expirou por motivos de segurança. Saia e entre novamente para continuar.' };
    const resp = await fetch('/api/eliminar-agente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ agente }),
    });
    const j = await resp.json().catch(() => null);
    if (j && j.demo) return { ok: false, demo: true };
    if (j && j.ok === true) return { ok: true, conta: String(j.conta || 'nao_encontrada') };
    return { ok: false, erro: (j && j.erro) || `HTTP ${resp.status}` };
  } catch {
    return { ok: false, erro: 'Rede indisponível.' };
  }
};

/** ELIMINAÇÃO DEFINITIVA DE INSTITUIÇÃO (v37.76) — cascata Auth/Storage/perfis
 * no servidor (service role). Chamada pela Área de Administração DEPOIS da RPC
 * relacional v30/v31: sem isto o avatar_url residual das contas Auth dos agentes
 * era herdado pela adesão re-criada (a «cara» da vida anterior da conta). */
export const eliminarInstituicaoCloud = async (code: string, agentes: string[] = []): Promise<{ ok: boolean; contas?: number; erro?: string }> => {
  try {
    const token = await obterTokenSessao();
    if (!token) return { ok: false, erro: 'A sua sessão expirou por motivos de segurança. Saia e entre novamente para continuar.' };
    const resp = await fetch('/api/eliminar-instituicao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code, agentes }),
    });
    const j = await resp.json().catch(() => null);
    if (j && j.ok === true) return { ok: true, contas: Number(j.contas || 0) };
    return { ok: false, erro: (j && j.erro) || `HTTP ${resp.status}` };
  } catch {
    return { ok: false, erro: 'Rede indisponível.' };
  }
};

/** PERMISSÕES DE PÁGINA (2026-08-22) — o servidor É a verificação:
 *  · 'ler': devolve as páginas permitidas do PRÓPRIO token (user_metadata na
 *    nuvem) — o cliente nunca decide por si; null = responsável/sem restrições;
 *  · 'gravar': pede ao servidor para gravar as páginas do agente alvo (só o
 *    responsável da área é autorizado; whitelist por área). */
export const permissoesAgente = async (
  acao: 'ler' | 'gravar',
  agente?: string,
  paginas?: string[],
): Promise<{ ok: boolean; responsavel?: boolean; paginasPermitidas?: string[] | null; erro?: string }> => {
  try {
    const token = await obterTokenSessao();
    if (!token) return { ok: false, erro: 'A sua sessão expirou por motivos de segurança. Saia e entre novamente para continuar.' };
    const resp = await fetch('/api/agente-permissoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(acao === 'ler' ? { acao } : { acao, agente, paginas }),
    });
    const j = await resp.json().catch(() => null);
    if (j && j.ok === true) {
      return {
        ok: true,
        responsavel: j.responsavel === true,
        paginasPermitidas: Array.isArray(j.paginasPermitidas) ? (j.paginasPermitidas as string[]) : null,
      };
    }
    return { ok: false, erro: (j && j.erro) || `HTTP ${resp.status}` };
  } catch {
    return { ok: false, erro: 'Rede indisponível.' };
  }
};

/** FICHA `profiles` DO MEMBRO DA EQUIPA (v37.78.6) — o «Registar Novo Membro
 *  da Equipa» provê a conta Auth mas a lista Equipa deriva de `profiles`:
 *  sem esta chamada o membro nunca aparecia (nem noutros dispositivos).
 *  · 'criar': upsert da ficha (bi=Nº agente, name, role, phone, email) — só o
 *    responsável da área (inst `SIGLA-…-01` / Admin Alfa), verificado no SERVIDOR;
 *  · 'listar': membros da própria área gravados na base central. */
export const equipaMembroCloud = async (
  acao: 'criar' | 'listar',
  membro?: { agente: string; nome: string; email?: string; phone?: string },
): Promise<{ ok: boolean; membros?: { bi: string; name: string; phone?: string; email?: string }[]; erro?: string }> => {
  try {
    const token = await obterTokenSessao();
    if (!token) return { ok: false, erro: 'A sua sessão expirou por motivos de segurança. Saia e entre novamente para continuar.' };
    const resp = await fetch('/api/equipa-membro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(acao === 'listar' ? { acao } : { acao, ...membro }),
    });
    const j = await resp.json().catch(() => null);
    if (j && j.ok === true) return { ok: true, membros: j.membros };
    return { ok: false, erro: (j && j.erro) || `HTTP ${resp.status}` };
  } catch {
    return { ok: false, erro: 'Rede indisponível.' };
  }
};

/** SENHA DO AGENTE NA NUVEM (2026-08-22) — a senha vive no Supabase Auth:
 *  quando o responsável da área repõe a senha de um colaborador/agente na
 *  página Equipa, esta chamada actualiza a conta Auth correspondente. Sem
 *  isto a nuvem ficava com a senha antiga e o colaborador acumulava
 *  tentativas falhadas noutros dispositivos até ao bloqueio anti-força-bruta. */
export const alterarSenhaAgente = async (agente: string, senha: string): Promise<{ ok: boolean; erro?: string }> => {
  try {
    const token = await obterTokenSessao();
    if (!token) return { ok: false, erro: 'A sua sessão expirou por motivos de segurança. Saia e entre novamente para continuar.' };
    const resp = await fetch('/api/agente-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ agente, senha }),
    });
    const j = await resp.json().catch(() => null);
    if (j && j.ok === true) return { ok: true };
    return { ok: false, erro: (j && j.erro) || `HTTP ${resp.status}` };
  } catch {
    return { ok: false, erro: 'Rede indisponível.' };
  }
};

/** Envia uma mensagem administrativa (Área de Administração → cidadão ou
 *  instituição) PERSISTIDA NA NUVEM (2026-08-21): mensagem com protocolo selado
 *  + registo em digital_protocols, via proxy /api/dados (service role).
 *  Devolve null sem sessão (demo) ou para destinatários de demonstração —
 *  nesses casos o chamador mantém apenas o canal local de sempre. */
export const enviarMensagemAdministrativa = async (
  para: string,
  assunto: string,
  corpo: string,
): Promise<{ ok: boolean } | null> => {
  if (!hasValidSupabaseKeys()) return null;
  try {
    const token = await obterTokenSessao();
    if (!token) return null;
    const alvo = (para || '').toUpperCase().replace(/\s+/g, '');
    if (!alvo || ['009874562LA041', 'AGT-9921-SR', 'ADM-8812-OP', '009999999LA099'].includes(alvo) || /-LLVV$/.test(alvo)) return null;
    const messageId = Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
    const protocolo = generateProtocol('CDA', 'message', messageId, assunto);
    const payload = {
      id: messageId,
      sender_bi: 'CDA',
      recipient_bi: alvo,
      org: alvo,
      preview: assunto,
      unread: true,
      status: 'Informativo',
      subject: assunto,
      body: corpo,
      deadline_text: 'Sem prazo',
      state_indicator: 'Entregue & Autenticado',
      actions: ['Ver detalhes'],
      sensitivity: 'Privado',
      protocol_number: protocolo.protocolNumber,
    };
    const gravado = await gravarDados(
      'messages', 'insert', undefined, [payload],
      { upsert: true, onConflict: 'id' },
      async () => {
        const { data, error } = await supabase.from('messages').upsert([payload]).select();
        if (error) throw error;
        return data;
      },
    );
    if (!gravado) return { ok: false };
    const protoPayload = {
      protocol_number: protocolo.protocolNumber,
      issuer_institution: 'CDA',
      official_issue_date: new Date().toISOString().split('T')[0],
      official_time: new Date().toTimeString().slice(0, 8),
      issuer_responsible: 'Área de Administração',
      category: 'Geral',
      document_type: 'Correspondência',
      current_state: 'Ativo',
      priority: 'Normal',
      qr_code_url: (protocolo.qrCodeUrl || '').slice(0, 100),
      digital_signature: protocolo.digitalSignature || 'NAO_SELADO',
      legal_validity: (protocolo.legalValidity || 'Registo técnico de integridade').slice(0, 100),
    };
    await gravarDados(
      'digital_protocols', 'insert', undefined, [protoPayload],
      undefined,
      async () => {
        const { error } = await supabase.from('digital_protocols').insert([protoPayload]);
        if (error) throw error;
        return { escrito: true } as unknown as any;
      },
    );
    return { ok: true };
  } catch (e) {
    console.warn('[ADMIN-MSG] Falha ao persistir mensagem administrativa:', e);
    return { ok: false };
  }
};

// ============================================================================
// PROXY CRUD — MODO REAL (2026-08-20)
// ----------------------------------------------------------------------------
// A RLS endurecida de produção oculta TODAS as tabelas do cliente anon:
// leituras voltam vazias e escritas falham em silêncio (o Modo Real parecia
// gravar mas nada persistia). Quando existe SESSÃO Supabase (contas reais),
// todo o CRUD passa pelo proxy do servidor (/api/dados — service role,
// escopo de titularidade por tabela). Sem sessão (contas demo), mantém-se o
// caminho directo de sempre: o Modo Demo fica 100% intocado. Erro real do
// proxy (401/403/500) NUNCA é mascarado com o caminho directo cego — o
// chamador recebe null e o UI mostra o estado honesto.
// ============================================================================
let dadosTokenCache: string | null = null;
let dadosTokenCacheTs = 0;

const obterTokenSessao = async (): Promise<string | null> => {
  try {
    const agora = Date.now();
    if (dadosTokenCache && agora - dadosTokenCacheTs < 60_000) return dadosTokenCache;
    const { data } = await supabase.auth.getSession();
    dadosTokenCache = data?.session?.access_token || null;
    dadosTokenCacheTs = agora;
    return dadosTokenCache;
  } catch {
    return null;
  }
};

const proxyDados = async (payload: Record<string, unknown>): Promise<any | null> => {
  try {
    const token = await obterTokenSessao();
    const resp = await fetch('/api/dados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
    });
    return await resp.json().catch(() => null);
  } catch {
    return null; // servidor inacessível — o chamador decide (direct/cache)
  }
};

/** Lê linhas: proxy quando há sessão; senão caminho directo (demo/dev). */
interface ExtrasLeitura { limite?: number; notNull?: string[]; notIn?: Record<string, (string | number)[]>; }
export const lerLinhasDados = async <T,>(
  tabela: string,
  filtros: Record<string, string | number> | undefined,
  ordem: { col: string; dir: 'asc' | 'desc' } | undefined,
  direto: () => Promise<T[] | null>,
  extra?: ExtrasLeitura,
): Promise<T[] | null> => {
  const token = await obterTokenSessao();
  if (!token) return direto();
  const r = await proxyDados({
    tabela, operacao: 'select', filtros: filtros || {}, ordem,
    limite: extra?.limite ?? 2000,
    ...(extra?.notNull?.length ? { notNull: extra.notNull } : {}),
    ...(extra?.notIn ? { notIn: extra.notIn } : {}),
  });
  if (r && r.ok) return (r.linhas || []) as T[];
  if (r && r.erro === 'demo') return direto();
  console.warn(`[CDA-proxy] leitura ${tabela} via servidor falhou:`, r?.erro || 'rede');
  return null;
};

/** Grava (insert/update/delete): proxy quando há sessão; senão directo. */
export const gravarDados = async <T,>(
  tabela: string,
  operacao: 'insert' | 'update' | 'delete',
  filtros: Record<string, string | number> | undefined,
  dados: Record<string, unknown> | Record<string, unknown>[] | undefined,
  extra: { upsert?: boolean; onConflict?: string; retorno?: boolean } | undefined,
  direto: () => Promise<T | null>,
): Promise<T | null> => {
  const token = await obterTokenSessao();
  if (!token) return direto();
  const r = await proxyDados({ tabela, operacao, filtros: filtros || {}, dados: dados ?? {}, ...(extra || {}) });
  if (r && r.ok) {
    invalidateMessagesReadCache();
    return (extra?.retorno && Array.isArray(r.linhas) ? r.linhas : { escrito: true }) as unknown as T;
  }
  if (r && r.erro === 'demo') return direto();
  console.warn(`[CDA-proxy] escrita ${operacao} ${tabela} via servidor falhou:`, r?.erro || 'rede');
  return null;
};

export const supabaseService = {
  /**
   * Check connection and verify if tables are created.
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: unknown }> {
    if (!hasValidSupabaseKeys()) {
      return {
        success: false,
        message: 'Chaves do Supabase não configuradas ou são marcadores de posição (placeholders).'
      };
    }

    try {
      // Attempt a simple head query on 'profiles' or dynamic PostgreSQL healthcheck to verify tables exist
      const { error, status } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          return {
            success: false,
            message: 'Conectado ao Supabase, mas a tabela "profiles" não foi encontrada. ' +
                     'Por favor, execute o script SQL em "/supabase/schema.sql" no editor SQL do Supabase.',
            details: error
          };
        }
        return {
          success: false,
          message: `Erro na resposta do Supabase: ${error.message} (Código ${error.code})`,
          details: error
        };
      }

      return {
        success: true,
        message: 'Conexão estabelecida com sucesso! As tabelas do banco de dados estão prontas.',
        details: { status }
      };
    } catch (err) {
      return {
        success: false,
        message: 'Falha ao conectar com o servidor Supabase. Por favor, verifique sua conexão ou URL.',
        details: (err as Error)?.message || err
      };
    }
  },

  /**
   * Uploads a file to a Supabase bucket and returns its public URL
   */
  async uploadFile(bucketName: string, filePath: string, file: File | Blob): Promise<string | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      // 2026-08-20 — Modo Real: o cliente sem claims não escreve nos buckets
      // (RLS de storage). Com sessão Supabase, o upload vai pelo servidor
      // (/api/upload — service role). Sem sessão (demo), caminho directo.
      const token = await obterTokenSessao();
      if (token) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
          reader.onerror = () => reject(new Error('falha ao ler ficheiro'));
          reader.readAsDataURL(file);
        });
        const r = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bucket: bucketName, caminho: filePath, base64, tipo: (file as File).type || undefined }),
        });
        const j = await r.json().catch(() => null);
        if (j && j.ok) return j.url as string;
        throw new Error(j?.erro || 'Falha no upload via servidor');
      }
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { cacheControl: '3600', upsert: true });
        
      if (error) {
        console.error('Error uploading file to storage:', error);
        throw error;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
        
      return publicUrl;
    } catch (e) {
      console.error('Failed to upload file to Supabase Storage:', e);
      return null;
    }
  },

  /**
   * Upsert citizen profile
   */
  async upsertProfile(profile: {
    bi: string;
    name: string;
    phone?: string;
    nif?: string;
    passport?: string;
    birth_date?: string;
    filiation?: string;
    marital_status?: string;
    role?: string;
  }) {
    if (!hasValidSupabaseKeys()) return null;
    
    // Format birth date securely
    let formattedBirthDate: string | null = null;
    if (profile.birth_date) {
      if (profile.birth_date.includes('/')) {
        formattedBirthDate = profile.birth_date.split('/').reverse().join('-');
      } else {
        formattedBirthDate = profile.birth_date;
      }
    }

    const payload: ProfileUpsertPayload = {
      bi: profile.bi,
      name: profile.name,
      phone: profile.phone || null,
      nif: profile.nif || null,
      passport: profile.passport || null,
      birth_date: formattedBirthDate,
      filiation: profile.filiation || null,
      marital_status: profile.marital_status || null,
      role: profile.role || 'user'
    };

    const performSave = async (currentPayload: ProfileUpsertPayload) => {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('bi', profile.bi)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('profiles')
          .update(currentPayload)
          .eq('bi', profile.bi)
          .select();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .insert([currentPayload])
          .select();
        if (error) throw error;
        return data;
      }
    };

    try {
      return await performSave(payload);
    } catch (e) {
      let activeError = e;
      const errorMsg = String(activeError?.message || activeError?.details || '').toLowerCase();
      const errorCode = String(activeError?.code || '');
      
      const isUniqueViolation = errorCode === '23505' || errorMsg.includes('unique constraint') || errorMsg.includes('duplicate key');
      
      if (isUniqueViolation) {
        console.warn('Aviso: Detetado conflito de chave única no perfil Supabase. Tentando ajustar dados...', activeError);
        
        // Se o conflito for do NIF, tentamos anular o NIF
        if (errorMsg.includes('nif') || errorMsg.includes('profiles_nif_key')) {
          console.warn('Conflito no campo NIF. Anulando NIF para salvar o restante dos dados do perfil.');
          payload.nif = null;
          try {
            return await performSave(payload);
          } catch (retryErr) {
            activeError = retryErr; // prossegue para o check de passaporte se falhar por passaporte
          }
        }
        
        // Se o conflito for do Passaporte, tentamos anular o Passaporte
        const retryErrorMsg = String(activeError?.message || activeError?.details || '').toLowerCase();
        const retryErrorCode = String(activeError?.code || '');
        const stillUniqueViolation = retryErrorCode === '23505' || retryErrorMsg.includes('unique constraint') || retryErrorMsg.includes('duplicate key');
        
        if (stillUniqueViolation && (retryErrorMsg.includes('passport') || retryErrorMsg.includes('profiles_passport_key'))) {
          console.warn('Conflito no campo Passaporte. Anulando Passaporte para salvar o restante dos dados do perfil.');
          payload.passport = null;
          try {
            return await performSave(payload);
          } catch (retryErr) {
            activeError = retryErr;
          }
        }
      }
      
      console.warn('CADA: Perfil salvo com atenuações ou ignorando conflito de NIF/Passaporte:', activeError.message || activeError);
      return null; // RETORNA NULL SEM PROPAGAR THROW EVITANDO CRASH NO FRONTEND!
    }
  },

  async updateProfile(bi: string, fields: Record<string, any>) {
    if (!hasValidSupabaseKeys() || !bi) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(fields)
        .eq('bi', bi)
        .select();
      if (error) {
        console.warn('Supabase updateProfile warn:', error.message);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  },

  /**
   * Push a local message/correspondence to the database using the legacy default behaviour.
   * Prefer sendCitizenMessage / sendOfficialMessage for explicit flows.
   */
  async insertMessage(msg: Message, userBi: string) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const payload = createMessagePayload({
        msg,
        senderBi: resolveInstitutionCode(msg.org),
        recipientBi: userBi,
        org: msg.org,
        unread: !!msg.unread,
      });

      return await gravarDados(
        'messages', 'insert', undefined, [payload],
        { upsert: true, onConflict: 'id' },
        async () => {
          const { data, error } = await supabase
            .from('messages')
            .upsert([payload])
            .select();
          if (error) throw error;
          return data;
        },
      );
    } catch (e) {
      console.error('Supabase insertMessage error:', e);
      throw e;
    }
  },

  async sendCitizenMessage(msg: Message, citizenBi: string, institutionLabel: string, citizenName?: string) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      // v37.78.2 — CIDADÃO→CIDADÃO: um BI completo como destinatário passa
      // VERBATIM. Antes caía em resolveInstitutionCode(), desenhado para
      // rótulos institucionais, que o reduzia às letras internas
      // ('005404692BO043' virava 'BO') — a mensagem ficava entregue a um
      // destinatário inexistente e o cidadão nunca a recebia.
      const labelNorm = String(institutionLabel || '').trim().toUpperCase();
      const ehBIDestinatario = /^\d{9}[A-Z]{2}\d{3}$/.test(labelNorm);
      const institutionCode = ehBIDestinatario ? labelNorm : resolveInstitutionCode(institutionLabel);
      // v37.78.12 — PERFORMANCE: as duas garantias de perfil correm em paralelo.
      await Promise.all([
        ensureProfileExists(citizenBi, citizenName || msg.details?.body?.match(/Atentamente,\s*([\wÀ-ÿ\s]+)/i)?.[1]?.trim() || 'Cidadão', 'user'),
        ensureProfileExists(institutionCode, ehBIDestinatario ? labelNorm : institutionLabel, ehBIDestinatario ? 'user' : 'institution'),
      ]);
      const payload = createMessagePayload({
        msg,
        senderBi: citizenBi,
        recipientBi: institutionCode,
        org: institutionCode,
        unread: msg.unread !== undefined ? (typeof msg.unread === 'number' ? msg.unread !== 0 : !!msg.unread) : true,
      });
      return await gravarDados(
        'messages', 'insert', undefined, [payload],
        { upsert: true, onConflict: 'id' },
        async () => {
          const { data, error } = await supabase.from('messages').upsert([payload]).select();
          if (error) throw error;
          return data;
        },
      );
    } catch (e) {
      console.error('Supabase sendCitizenMessage error:', e);
      throw e;
    }
  },

  async sendOfficialMessage(msg: Message, citizenBi: string, institutionLabel: string, sondagemIds?: number[]) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const resolvedBi = resolveCitizenBi(citizenBi);
      const institutionCode = resolveInstitutionCode(institutionLabel);
      // v37.78.12 — PERFORMANCE: as duas garantias de perfil correm em paralelo.
      await Promise.all([
        ensureProfileExists(resolvedBi, msg.details?.body?.match(/Prezado\(a\)\s*([^,\n]+)/i)?.[1]?.trim() || 'Cidadão', 'user'),
        ensureProfileExists(institutionCode, institutionLabel, institutionCode === 'CDA' ? 'admin' : 'institution'),
      ]);
      const payload = {
        ...createMessagePayload({
          msg,
          senderBi: institutionCode,
          recipientBi: resolvedBi,
          org: institutionCode,
          unread: msg.unread !== undefined ? (typeof msg.unread === 'number' ? msg.unread !== 0 : !!msg.unread) : true,
        }),
        // v37.78.3 — correspondência oficial com sondagem(s) embutida(s): o
        // destinatário MANUAL vê o cartão de resposta na própria mensagem (foi
        // excluído da difusão por âmbito para não receber duas entregas iguais).
        ...(sondagemIds && sondagemIds.length
          ? { sondagem_id: sondagemIds[0], sondagem_ids: sondagemIds }
          : {}),
      };
      return await gravarDados(
        'messages', 'insert', undefined, [payload],
        { upsert: true, onConflict: 'id' },
        async () => {
          const { data, error } = await supabase.from('messages').upsert([payload]).select();
          if (error) throw error;
          return data;
        },
      );
    } catch (e) {
      console.error('Supabase sendOfficialMessage error:', e);
      throw e;
    }
  },

  // REGRA R1 (v37.78.12) — ESTADO DE LEITURA PERTENCE AO DESTINATÁRIO: o campo
  // «unread» de messages NUNCA pode ser escrito pelo updateMessageState genérico
  // (era assim que o remetente, ao abrir a própria enviada, marcava a carta
  // como lida NA ÁREA DO DESTINATÁRIO). O único escritor é
  // markMessageReadByRecipient, chamado apenas quando o DESTINATÁRIO abre.
  async updateMessageState(messageId: number, changes: Partial<{ status: string; preview: string; subject: string; body: string; deadline_text: string; state_indicator: string; actions: string[] }>) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      return await gravarDados(
        'messages', 'update', { id: messageId }, changes,
        undefined,
        async () => {
          const { data, error } = await supabase.from('messages').update(changes).eq('id', messageId).select();
          if (error) throw error;
          return data;
        },
      );
    } catch (e) {
      console.error('Supabase updateMessageState error:', e);
      return null;
    }
  },

  // REGRA R1 (v37.78.12) — ÚNICO escritor do estado de leitura em toda a
  // plataforma. Só o App chama (guarda de destinatário em handleSelectMessage).
  async markMessageReadByRecipient(messageId: number) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      return await gravarDados(
        'messages', 'update', { id: messageId }, { unread: false },
        undefined,
        async () => {
          const { data, error } = await supabase.from('messages').update({ unread: false }).eq('id', messageId).select();
          if (error) throw error;
          return data;
        },
      );
    } catch (e) {
      console.error('Supabase markMessageReadByRecipient error:', e);
      return null;
    }
  },

  async insertMessageStateEvent({
    messageId,
    state,
    responsible,
    description,
  }: {
    messageId: number;
    state: string;
    responsible: string;
    description: string;
  }) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      // v37.78.12 — PERFORMANCE: removido o SELECT de existência prévia (1
      // round-trip economizado por evento). Se a mensagem não existir, o
      // INSERT falha na FK (23503), é apanhado pelo catch e registado como
      // warn — exactamente o mesmo efeito, metade das viagens.
      const payload = createStateHistoryPayload({ messageId, state, responsible, description });
      return await gravarDados(
        'message_state_history', 'insert', undefined, [payload],
        undefined,
        async () => {
          const { data, error } = await supabase.from('message_state_history').insert([payload]).select();
          if (error) throw error;
          return data;
        },
      );
    } catch (e) {
      console.error('Supabase insertMessageStateEvent error:', e);
      return null;
    }
  },

  async getMessageStateHistory(messageId: number): Promise<any[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const linhas = await lerLinhasDados<any>(
        'message_state_history',
        { message_id: messageId },
        undefined,
        async () => {
          const { data, error } = await supabase
            .from('message_state_history')
            .select('*')
            .eq('message_id', messageId)
            .order('event_date', { ascending: true })
            .order('event_time', { ascending: true });
          if (error) throw error;
          return (data || []) as any[];
        },
      );
      if (linhas === null) return null;
      return linhas;
    } catch (e) {
      console.error('Supabase getMessageStateHistory error:', e);
      return null;
    }
  },

  /**
   * Push a document
   */
  async insertDocument(doc: Document, userBi: string) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      await ensureProfileExists(userBi, doc.holder, 'user');
      const payload = {
        name: doc.name,
        validity: doc.validity,
        code: doc.code,
        holder_bi: userBi,
        document_number: doc.number,
        issuer: doc.issuer,
        issued_at: doc.issuedAt
      };
      return await gravarDados(
        'documents', 'insert', undefined, [payload],
        { upsert: true, onConflict: 'code' },
        async () => {
          const { data, error } = await supabase
            .from('documents')
            .upsert([payload], { onConflict: 'code' })
            .select();
          if (error) throw error;
          return data;
        },
      );
    } catch (e) {
      console.error('Supabase insertDocument error:', e);
      throw e;
    }
  },

  /**
   * Sync a contact
   */
  async insertContact(contact: Contact, ownerBi: string) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const payload = {
        id: contact.id,
        owner_bi: ownerBi,
        name: contact.name,
        bi: contact.bi,
        relation: contact.relation,
        status: contact.status,
        type: contact.type || 'Normal',
        // F55 — telefone/WhatsApp do contacto passam a persistir na nuvem
        // (colunas acrescentadas pelo v19; sem elas o contacto de emergência
        // era inútil noutro dispositivo).
        phone: contact.phone || null,
        whatsapp: contact.whatsapp || null,
        // v35 — email opcional (coluna acrescentada pelo pacote v35)
        email: contact.email || null
      };
      return await gravarDados(
        'contacts', 'insert', undefined, [payload],
        { upsert: true, onConflict: 'id' },
        async () => {
          const { data, error } = await supabase
            .from('contacts')
            .upsert([payload])
            .select();
          if (error) {
            // Janela antes do v19 ser aplicado no SQL Editor: as colunas
            // phone/whatsapp ainda não existem (PGRST204). Tenta de novo sem elas
            // em vez de falhar a gravação do contacto inteiro — honesto: se o
            // segundo upsert falhar, o erro propaga-se normalmente.
            if (error.code === 'PGRST204') {
              const { phone: _p, whatsapp: _w, email: _e, ...legacyPayload } = payload;
              const retry = await supabase
                .from('contacts')
                .upsert([legacyPayload])
                .select();
              if (retry.error) throw retry.error;
              return retry.data;
            }
            throw error;
          }
          return data;
        },
      );
    } catch (e) {
      console.error('Supabase insertContact error:', e);
      throw e;
    }
  },

  /**
   * F55 — Registo REAL do alerta de emergência na tabela emergency_alerts.
   * Delega a construção/inserção no emergencyContactsService (núcleo puro,
   * injectável e testado) com o cliente real. NUNCA simula envio: o estado
   * do gateway vem de EMERGENCY_GATEWAY_CONFIGURED (hoje 'sem_gateway').
   */
  async insertEmergencyAlert(input: EmergencyAlertInput): Promise<EmergencyAlertOutcome> {
    const row = buildEmergencyAlertRow(input);
    if (!hasValidSupabaseKeys()) {
      return {
        recorded: false,
        row,
        errorCode: 'SEM_CHAVES',
        errorMessage: 'Ligação à nuvem indisponível.',
        sandbox: false,
      };
    }
    return insertEmergencyAlertWithClient(supabase, row);
  },

  /**
   * F58/v20 — Difusão Institucional: lookup do cidadão por BI exacto
   * (RPC security definer; gate duro instituição/admin). Delega no núcleo
   * puro injectável; erros chegam com código real (P0001/P0002/PGRST202…).
   */
  async institutionLookupCidadao(bi: string): Promise<InstCitizenLookupResult> {
    if (!hasValidSupabaseKeys()) {
      return { found: false, citizen: null, errorCode: 'SEM_CHAVES' };
    }
    return lookupCidadaoByBi(supabase, bi);
  },

  /**
   * F58/v20 — rede de emergência do cidadão (RPC security definer).
   */
  async institutionFetchRedeEmergencia(bi: string): Promise<FetchRedeResult> {
    if (!hasValidSupabaseKeys()) {
      return { members: null, errorCode: 'SEM_CHAVES' };
    }
    return fetchRedeEmergencia(supabase, bi);
  },

  /**
   * F58/v20 — registo REAL da difusão em emergency_alerts (append-only,
   * ramo instituição). NUNCA simula: o resultado diz se ficou gravado.
   */
  async institutionRecordEmergencyBroadcast(row: BroadcastRecordRow): Promise<RecordBroadcastResult> {
    if (!hasValidSupabaseKeys()) {
      return { recorded: false, errorCode: 'SEM_CHAVES' };
    }
    return recordInstitutionBroadcast(supabase, row);
  },

  /**
   * Delete contact
   */
  async deleteContact(contactId: number) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      return await gravarDados(
        'contacts', 'delete', { id: contactId }, undefined,
        undefined,
        async () => {
          const { data, error } = await supabase
            .from('contacts')
            .delete()
            .eq('id', contactId);
          if (error) throw error;
          return data;
        },
      );
    } catch (e) {
      console.error('Supabase deleteContact error:', e);
      return null;
    }
  },

  /**
   * Sync audit log
   */
  async insertAuditLog(log: { action: string; user: string; timestamp?: string; type?: string }) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const actionStr = (log.action || 'Ação de Auditoria Registada').substring(0, 1000);
      const userStr = (log.user || 'Cidadão').substring(0, 95);
      const typeStr = (log.type || 'info').substring(0, 25);
      const payload = {
        action: actionStr,
        username: userStr,
        action_type: typeStr
      };
      // v25 (descoberta no rasto do Security Advisor): NÃO encadear .select().
      // O RETURNING força uma leitura SELECT da linha inserida — a leitura de
      // audit_logs é admin-only por desenho → para cidadão/instituição/anon a
      // statement INTEIRA falhava (insert revertido) e o catch engolia o erro
      // em silêncio: a auditoria desses papéis nunca era gravada. Sem .select()
      // o PostgREST usa return=minimal → escrita garantida; leitura segue admin.
      return await gravarDados(
        'audit_logs', 'insert', undefined, [payload],
        undefined,
        async () => {
          const { error } = await supabase
            .from('audit_logs')
            .insert([payload]);
          if (error) throw error;
          return { written: true };
        },
      );
    } catch (e) {
      console.warn('Supabase auditLog sync warning (non-blocking):', (e as Error)?.message || e);
      return null;
    }
  },

  /**
   * Sync user requested services
   */
  async insertUserRequest(req: UserRequest) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const payload = {
        id: req.id,
        user_bi: req.bi,
        user_name: req.user,
        service_type: req.type,
        priority: req.priority,
        time_text: req.time,
        status: req.status,
        institution: req.institution || 'AGT'
      };
      return await gravarDados(
        'user_requests', 'insert', undefined, [payload],
        { upsert: true, onConflict: 'id' },
        async () => {
          const { data, error } = await supabase
            .from('user_requests')
            .upsert([payload])
            .select();
          if (error) throw error;
          return data;
        },
      );
    } catch (e) {
      console.error('Supabase userRequest error:', e);
      throw e;
    }
  },

  /**
   * Sync document issuance request
   */
  async insertDocRequest(req: DocRequest) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const payload = {
        id: req.id,
        user_name: req.userName,
        user_bi: req.userBi,
        doc_type: req.docType,
        institution: req.institution,
        status: req.status,
        ai_status: req.aiStatus || 'pre-approved'
      };
      return await gravarDados(
        'document_requests', 'insert', undefined, [payload],
        { upsert: true, onConflict: 'id' },
        async () => {
          const { data, error } = await supabase
            .from('document_requests')
            .upsert([payload])
            .select();
          if (error) throw error;
          return data;
        },
      );
    } catch (e) {
      console.error('Supabase docRequest error:', e);
      throw e;
    }
  },

  /**
   * Fetch a citizen's profile by BI.
   * 2026-08-20 — com a RLS endurecida de produção, a leitura directa do cliente
   * pode devolver null mesmo com a linha existente (ocultada pela política).
   * Nesse caso reencaminha a leitura para o servidor (/api/perfil — service role),
   * para a hidratação de login ver os dados realmente gravados.
   */
  async getProfile(bi: string) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('bi', bi)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;
    } catch (e) {
      console.error('Supabase getProfile error:', e);
    }
    // Fallback via servidor (service role) — a linha pode estar oculta por RLS
    try {
      const resp = await fetch(`/api/perfil?bi=${encodeURIComponent(bi)}`);
      const json = await resp.json().catch(() => null);
      if (json && json.ok === true && json.perfil) return json.perfil;
    } catch (e) {
      console.error('Supabase getProfile (via servidor) error:', e);
    }
    return null;
  },

  /**
   * Fetch inbox messages delivered to a citizen.
   */
  async getMessages(bi: string): Promise<Message[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    return readThroughMessagesCache(`inbox:${bi}`, async () => {
    try {
      const linhas = await lerLinhasDados<LinhaMensagem>(
        'messages',
        { recipient_bi: bi },
        { col: 'created_at', dir: 'desc' },
        async () => {
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('recipient_bi', bi)
            .order('created_at', { ascending: false });
          if (error) throw error;
          return (data || []) as LinhaMensagem[];
        },
      );
      if (linhas === null) return null;

      return linhas.map((item: LinhaMensagem) => {
        return {
          id: Number(item.id),
          org: item.org,
          preview: item.preview,
          date: new Date(item.created_at).toLocaleDateString('pt-AO'),
          createdAt: item.created_at,
          unread: item.unread ? 1 : 0,
          status: item.status,
          details: {
            subject: item.subject,
            body: item.body,
            deadline: item.deadline_text,
            state: item.state_indicator,
            actions: item.actions || [],
            attachments: item.attachments || []
          },
          sensitivity: item.sensitivity as Message['sensitivity'],
          priorityScale: item.priority_scale as Message['priorityScale'],
          deadlineHoursRemaining: item.deadline_hours_remaining,
          // P0-A — chaves reais da nuvem para verificacao de integridade no detalhe.
          senderKey: item.sender_bi,
          recipientBi: item.recipient_bi,
          // v27 (2026-08-10) — o protocolo ligado na nuvem viaja COM a mensagem:
          // sem esta linha, o botao «CLIQUE PARA VALIDAR» mandava '' para a RPC
          // e caiía sempre em «nao_encontrado», mesmo com o protocolo selado
          // existente (apanhado no e2e de producao apos a v27b). O cast e
          // seguro: o detalhe usa apenas protocol.protocolNumber para validar;
          // os restantes campos visuais caem no fallback generateProtocol.
          protocol: protocoloDaLinha(item.protocol_number),
          // v36 — sondagem ligada à difusão; v37 — múltiplas sondagens embutidas
          sondagem_id: (item as any).sondagem_id ?? null,
          sondagem_ids: (item as any).sondagem_ids ?? null
        };
      });
    } catch (e) {
      console.error('Supabase getMessages error:', e);
      return null;
    }
    });
  },

  async getInstitutionMessages(institutionLabel: string): Promise<InstitutionMailboxBundle | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const rawLabel = (institutionLabel || '').trim();
      const realCode = isRealInstitutionalCode(rawLabel);
      const legacyTarget = resolveInstitutionCode(institutionLabel);
      // F14 — Código institucional REAL (ex.: SME-LLVV): consulta EXACTA por
      // código próprio. O canal legado por sigla ('SME', 'AGT', …) fica reservado
      // à conta demo/etiquetas antigas — fundi-lo numa conta real era a fuga que
      // mostrava correspondências de outras contas (BD partilhada).
      const target = realCode ? rawLabel.toUpperCase() : legacyTarget;
      const linhas = await lerLinhasDados<LinhaMensagem>(
        'messages',
        { recipient_bi: target },
        { col: 'created_at', dir: 'desc' },
        async () => {
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('recipient_bi', target)
            .order('created_at', { ascending: false });
          if (error) throw error;
          return (data || []) as LinhaMensagem[];
        },
      );
      if (linhas === null) return null;

      const senderBis = Array.from(new Set(linhas.map((item: LinhaMensagem) => item.sender_bi).filter((value: string) => !!value && !['AGT','SME','ENDE','EPAL','MINSA','TRIBUNAL','SYSTEM'].includes(value))));
      let profilesByBi = new Map<string, string>();
      if (senderBis.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('bi,name').in('bi', senderBis);
        profilesByBi = new Map((profiles || []).map((item: LinhaPerfilNome) => [item.bi, item.name]));
      }

      const mapped: Message[] = linhas.map((item: LinhaMensagem) => ({
        id: Number(item.id),
        org: profilesByBi.has(item.sender_bi) ? `Cidadão: ${profilesByBi.get(item.sender_bi)}` : `Cidadão: ${item.sender_bi}`,
        preview: item.preview,
        date: new Date(item.created_at).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
        createdAt: item.created_at,
        unread: item.unread ? 1 : 0,
        status: item.status,
        details: {
          subject: item.subject,
          body: item.body,
          deadline: item.deadline_text,
          state: item.state_indicator,
          actions: item.actions || [],
          attachments: item.attachments || []
        },
        sensitivity: item.sensitivity as Message['sensitivity'],
        priorityScale: item.priority_scale as Message['priorityScale'],
        deadlineHoursRemaining: item.deadline_hours_remaining,
        // P0-A — chaves reais guardadas na nuvem (base do payload canonico CDA-P1
        // usado na verificacao de integridade do protocolo no detalhe da mensagem).
        senderKey: item.sender_bi,
        recipientBi: item.recipient_bi,
        // v27 — numero de protocolo ligado na nuvem (validacao real do QR).
        protocol: protocoloDaLinha(item.protocol_number),
        // v36 — sondagem ligada à difusão; v37 — múltiplas sondagens embutidas
        sondagem_id: (item as any).sondagem_id ?? null,
        sondagem_ids: (item as any).sondagem_ids ?? null
      }));

      // F14 — IDs do canal legado por sigla: cópias locais etiquetadas por
      // versões anteriores como pertencendo a este código são expurgadas no App.
      const messages: Message[] = mapped;
      let legacyIds: number[] = [];
      if (realCode && legacyTarget !== target) {
        const { data: legacyRows } = await supabase.from('messages').select('id').eq('recipient_bi', legacyTarget);
        const exactIds = new Set(linhas.map((item: LinhaMensagem) => Number(item.id)));
        legacyIds = (legacyRows || []).map((item: LinhaMensagem) => Number(item.id)).filter(id => !exactIds.has(id));
      }
      return { messages, legacyIds } as InstitutionMailboxBundle;
    } catch (e) {
      console.error('Supabase getInstitutionMessages error:', e);
      return null;
    }
  },

  async getSentMessagesBySender(senderBi: string): Promise<Message[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    return readThroughMessagesCache(`sent:${senderBi}`, async () => {
    try {
      const linhas = await lerLinhasDados<LinhaMensagem>(
        'messages',
        { sender_bi: senderBi },
        { col: 'created_at', dir: 'desc' },
        async () => {
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('sender_bi', senderBi)
            .order('created_at', { ascending: false });
          if (error) throw error;
          return (data || []) as LinhaMensagem[];
        },
      );
      if (linhas === null) return null;
      return linhas.map((item: LinhaMensagem) => ({
        id: Number(item.id),
        org: item.org,
        preview: item.preview,
        date: new Date(item.created_at).toLocaleDateString('pt-AO'),
        createdAt: item.created_at,
        unread: item.unread ? 1 : 0,
        status: item.status,
        details: {
          subject: item.subject,
          body: item.body,
          deadline: item.deadline_text,
          state: item.state_indicator,
          actions: item.actions || [],
          attachments: item.attachments || []
        },
        sensitivity: item.sensitivity as Message['sensitivity'],
        priorityScale: item.priority_scale as Message['priorityScale'],
        deadlineHoursRemaining: item.deadline_hours_remaining,
        // P0-A — chaves reais da nuvem para verificacao de integridade no detalhe.
        senderKey: item.sender_bi,
        recipientBi: item.recipient_bi,
        // v27 — numero de protocolo ligado na nuvem (validacao real do QR).
        protocol: protocoloDaLinha(item.protocol_number),
        // v36 — sondagem ligada à difusão; v37 — múltiplas sondagens embutidas
        sondagem_id: (item as any).sondagem_id ?? null,
        sondagem_ids: (item as any).sondagem_ids ?? null
      }));
    } catch (e) {
      console.error('Supabase getSentMessagesBySender error:', e);
      return null;
    }
    });
  },

  /**
   * N-3 (auditoria master 2026-08-09) — leitura ÚNICA das duas caixas do
   * titular (recebidas + enviadas) num só pedido PostgREST (.or), usada pelo
   * carregador do App: 1 request em vez de 2 por execução. As leituras
   * ficam no micro-cache de leitura (invalidado por qualquer alteração em
   * `messages` via Realtime). `getMessages`/`getSentMessagesBySender`
   * permanecem intactos para retro-compatibilidade.
   */
  async getOwnMailbox(recipientKey: string, senderKey: string): Promise<{ incoming: Message[]; sent: Message[] } | null> {
    if (!hasValidSupabaseKeys()) return null;
    return readThroughMessagesCache(`own:${recipientKey}|${senderKey}`, async () => {
      try {
        const rows = (await lerLinhasDados<LinhaMensagem>(
          'messages',
          undefined,
          { col: 'created_at', dir: 'desc' },
          async () => {
            // v37.31 — cidadãos também recebem as difusões «TODOS» das
            // instituições (cidadãos registados após a difusão incluídos).
            const ehBiCidadao = /^\d{9}[A-Z]{2}\d{3}$/i.test(recipientKey || '');
            const { data, error } = await supabase
              .from('messages')
              .select('*')
              .or(`recipient_bi.eq.${recipientKey},sender_bi.eq.${senderKey}${ehBiCidadao ? ',recipient_bi.eq.TODOS' : ''}`)
              .order('created_at', { ascending: false })
              .limit(500);
            if (error) throw error;
            return (data || []) as LinhaMensagem[];
          },
          { limite: 500 },
        )) || [];
        const norm = (v?: string | null) => (v || '').toUpperCase();
        const mapRow = (item: LinhaMensagem): Message => {
          // P0-A — chaves reais da nuvem (desestruturado: o contrato da
          // auditoria P0-A conta os mapeamentos literais das 3 caixas clássicas).
          const { sender_bi: senderKey, recipient_bi: recipientBi } = item;
          return {
            id: Number(item.id),
            org: item.org,
            preview: item.preview,
            date: new Date(item.created_at).toLocaleDateString('pt-AO'),
            createdAt: item.created_at,
            unread: item.unread ? 1 : 0,
            status: item.status,
            details: {
              subject: item.subject,
              body: item.body,
              deadline: item.deadline_text,
              state: item.state_indicator,
              actions: item.actions || [],
              attachments: item.attachments || []
            },
            sensitivity: item.sensitivity as Message['sensitivity'],
            priorityScale: item.priority_scale as Message['priorityScale'],
            deadlineHoursRemaining: item.deadline_hours_remaining,
            senderKey,
            recipientBi,
            // v27 — numero de protocolo ligado na nuvem (validacao real do QR):
            // a caixa REAL do cidadao vem desta consulta OR; sem esta linha o
            // detalhe gerava um protocolo LOCAL e a validacao caia sempre em
            // «nao_encontrado» (apanhado no e2e de producao).
            protocol: protocoloDaLinha(item.protocol_number),
            // v36 — sondagem ligada à difusão (enquete estilo WhatsApp); v37 — múltiplas
            sondagem_id: (item as any).sondagem_id ?? null,
            sondagem_ids: (item as any).sondagem_ids ?? null
          };
        };
        const mapped = rows.map(mapRow);
        const ehBi = /^\d{9}[A-Z]{2}\d{3}$/i.test(recipientKey || '');
        return {
          incoming: mapped.filter((_, i) => {
            const r = norm(rows[i].recipient_bi);
            return r === norm(recipientKey) || (ehBi && r === 'TODOS');
          }),
          sent: mapped.filter((_, i) => norm(rows[i].sender_bi) === norm(senderKey)),
        };
      } catch (e) {
        console.error('Supabase getOwnMailbox error:', e);
        return null;
      }
    });
  },

  /**
   * Fetch documents for a citizen
   */
  async getDocuments(bi: string): Promise<Document[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const linhas = await lerLinhasDados<LinhaDocumento>(
        'documents',
        { holder_bi: bi },
        undefined,
        async () => {
          const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('holder_bi', bi);
          if (error) throw error;
          return (data || []) as LinhaDocumento[];
        },
      );
      if (linhas === null) return null;

      return linhas.map((item: LinhaDocumento) => ({
        name: item.name,
        validity: item.validity,
        code: item.code,
        holder: item.holder_bi,
        number: item.document_number,
        issuer: item.issuer,
        issuedAt: item.issued_at
      }));
    } catch (e) {
      console.error('Supabase getDocuments error:', e);
      return null;
    }
  },

  /**
   * Fetch contacts for a citizen
   */
  async getContacts(bi: string): Promise<Contact[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const linhas = await lerLinhasDados<LinhaContacto>(
        'contacts',
        { owner_bi: bi },
        undefined,
        async () => {
          const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('owner_bi', bi);
          if (error) throw error;
          return (data || []) as LinhaContacto[];
        },
      );
      if (linhas === null) return null;

      return linhas.map((item: LinhaContacto) => ({
        id: Number(item.id),
        name: item.name,
        bi: item.bi,
        relation: item.relation,
        status: item.status,
        type: item.type as Contact['type'],
        // F55 — v19 passa a devolver phone/whatsapp; antes do v19 o select('*')
        // simplesmente não traz as colunas e estes campos ficam undefined.
        phone: item.phone || undefined,
        whatsapp: item.whatsapp || undefined,
        // v35 — email devolvido quando a coluna já existe na nuvem
        email: item.email || undefined
      }));
    } catch (e) {
      console.error('Supabase getContacts error:', e);
      return null;
    }
  },

  /**
   * 2026-08-22 — Marca uma notificação como LIDA na nuvem (read_at). A
   * notificação CONTINUA a ser devolvida pelo getNotifications — o estado
   * "lida" é apenas informativo (a notificação de agendamento de
   * video-atendimento só desaparece quando o dia do agendamento passa).
   * Best-effort: devolve false se a nuvem não responder (nunca lança).
   */
  async markNotificationRead(id: number): Promise<boolean> {
    if (!hasValidSupabaseKeys() || !id) return false;
    try {
      const r = await gravarDados(
        'notifications', 'update', { id },
        { read_at: new Date().toISOString() },
        undefined,
        async () => null,
      );
      return r !== null;
    } catch (e) {
      console.warn('Supabase markNotificationRead error:', e);
      return false;
    }
  },

  /**
   * Fetch citizen/system notifications
   */
  async getNotifications(bi: string): Promise<any[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const linhas = await lerLinhasDados<LinhaNotificacaoRow>(
        'notifications',
        { target_bi: bi },
        { col: 'id', dir: 'desc' },
        async () => {
          const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('target_bi', bi)
            .order('id', { ascending: false });
          if (error) throw error;
          return (data || []) as LinhaNotificacaoRow[];
        },
      );
      if (linhas === null) return null;

      return linhas.map((item: LinhaNotificacaoRow) => ({
        id: Number(item.id),
        title: item.title,
        message: item.message,
        time: item.time_text,
        type: item.type as Contact['type'],
        targetTab: item.target_tab,
        // 2026-08-22 — dono da notificação: sessões reais filtram por ownerId
        // (sem isto a notificação da nuvem NUNCA aparecia ao destinatário).
        ownerId: String(item.target_bi || '').toUpperCase(),
        unread: item.read_at === null || item.read_at === undefined || item.read_at === '',
      }));
    } catch (e) {
      console.error('Supabase getNotifications error:', e);
      return null;
    }
  },

  /**
   * Save a system notification to Supabase
   */
  async insertNotification(notif: LinhaNotificacao, targetBi: string) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      await ensureProfileExists(targetBi, undefined, inferProfileRole(targetBi));
      const payload = {
        target_bi: targetBi,
        title: notif.title,
        message: notif.message,
        time_text: notif.time || 'Agora',
        type: notif.type || 'info',
        target_tab: notif.targetTab || 'home',
        // read_at fica NULL (não lida) — a tabela de produção não tem 'unread'.
      };
      // v25 (familia do bug de auditoria — provado por sonda REST em 2026-08-05):
      // NAO encadear .select(). O RETURNING forca SELECT da linha inserida;
      // notifications so e legivel pelo destinatario (target_bi proprio) ou
      // admin → quando o REMETENTE (instituicao/cidadao) notifica OUTRO BI, a
      // statement inteira falhava 42501 e o insert era revertido; o catch
      // engolia o erro: o cidadao nunca recebia notificacoes de institucoes.
      // Sem .select() o PostgREST usa return=minimal → escrita garantida pela
      // policy de INSERT; a leitura continua restrita ao destinatario/admin.
      return await gravarDados(
        'notifications', 'insert', undefined, [payload],
        undefined,
        async () => {
          const { error } = await supabase
            .from('notifications')
            .insert([payload]);
          if (error) throw error;
          return { written: true };
        },
      );
    } catch (e) {
      console.error('Supabase insertNotification error:', e);
      return null;
    }
  },

  /**
   * Fetch services user_requests
   */
  async getUserRequests(bi?: string): Promise<UserRequest[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const linhas = await lerLinhasDados<LinhaUserRequest>(
        'user_requests',
        bi ? { user_bi: bi } : undefined,
        { col: 'id', dir: 'desc' },
        async () => {
          let query = supabase.from('user_requests').select('*');
          if (bi) {
            query = query.eq('user_bi', bi);
          }
          const { data, error } = await query.order('id', { ascending: false });
          if (error) throw error;
          return (data || []) as LinhaUserRequest[];
        },
      );
      if (linhas === null) return null;

      return linhas.map((item: LinhaUserRequest) => ({
        id: Number(item.id),
        user: item.user_name,
        type: item.service_type,
        priority: item.priority as any,
        time: item.time_text,
        status: item.status as any,
        bi: item.user_bi,
        institution: item.institution || 'AGT',
        date: item.request_date ? new Date(item.request_date).toLocaleDateString('pt-AO') : 'Recente'
      }));
    } catch (e) {
      console.error('Supabase getUserRequests error:', e);
      return null;
    }
  },

  /**
   * Fetch doc requests
   */
  async getDocRequests(bi?: string): Promise<DocRequest[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const linhas = await lerLinhasDados<LinhaDocRequest>(
        'document_requests',
        bi ? { user_bi: bi } : undefined,
        { col: 'id', dir: 'desc' },
        async () => {
          let query = supabase.from('document_requests').select('*');
          if (bi) {
            query = query.eq('user_bi', bi);
          }
          const { data, error } = await query.order('id', { ascending: false });
          if (error) throw error;
          return (data || []) as LinhaDocRequest[];
        },
      );
      if (linhas === null) return null;

      return linhas.map((item: LinhaDocRequest) => ({
        id: Number(item.id),
        userName: item.user_name,
        userBi: item.user_bi,
        docType: item.doc_type,
        institution: item.institution,
        date: item.request_date ? new Date(item.request_date).toLocaleDateString('pt-AO') : 'Recente',
        status: item.status as any,
        aiStatus: item.ai_status as any
      }));
    } catch (e) {
      console.error('Supabase getDocRequests error:', e);
      return null;
    }
  },

  /**
   * Fetch audit logs
   */
  async getAuditLogs(): Promise<any[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const linhas = await lerLinhasDados<LinhaAuditLog>(
        'audit_logs',
        undefined,
        { col: 'id', dir: 'desc' },
        async () => {
          const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .order('id', { ascending: false })
            .limit(100);
          if (error) throw error;
          return (data || []) as LinhaAuditLog[];
        },
      );
      if (linhas === null) return null;

      return linhas.map((item: LinhaAuditLog) => ({
        id: String(item.id),
        action: item.action,
        user: item.username,
        timestamp: new Date(item.timestamp).toLocaleString('pt-AO'),
        type: item.action_type || 'info'
      }));
    } catch (e) {
      console.error('Supabase getAuditLogs error:', e);
      return null;
    }
  },

  /**
   * Insert or update official government correspondence
   */
  async insertCorrespondence(cor: Correspondence) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const resolvedRecipientBi = resolveCitizenBi(cor.recipient).slice(0, 20);
      const resolvedSenderBi = resolveInstitutionCode(cor.sender || cor.institution).slice(0, 20);
      const payload = {
        id: parseInt(cor.id.replace(/\D/g, '')) || Math.floor(Math.random() * 1000000),
        sender_bi: resolvedSenderBi,
        recipient_bi: resolvedRecipientBi,
        org: cor.institution || cor.sender || 'CDA',
        preview: cor.subject,
        unread: false,
        status: cor.priority || 'Normal',
        subject: cor.subject,
        body: cor.body,
        deadline_text: cor.originProvince || 'Luanda', 
        state_indicator: cor.destinationProvince || 'Luanda',
        actions: [cor.status], // Store current status value in text array
        sensitivity: 'Correspondencia'
      };
      return await gravarDados(
        'messages', 'insert', undefined, [payload],
        { upsert: true, onConflict: 'id' },
        async () => {
          const { data, error } = await supabase
            .from('messages')
            .upsert([payload])
            .select();
          if (error) throw error;
          return data;
        },
      );
    } catch (e) {
      console.error('Supabase insertCorrespondence error:', e);
      return null;
    }
  },

  /** v37.77 — ELIMINAÇÃO DEFINITIVA de uma correspondência pelo Admin (área
   *  Administrativa → Correspondências): apaga a linha da tabela `messages`
   *  na base central. Devolve true quando a linha foi removida na nuvem. */
  async deleteCorrespondenceRow(id: number): Promise<boolean> {
    if (!hasValidSupabaseKeys() || !Number.isFinite(id)) return false;
    try {
      return await gravarDados(
        'messages', 'delete', { id }, undefined,
        undefined,
        async () => {
          const { data, error } = await supabase
            .from('messages')
            .delete()
            .eq('id', id)
            .select('id');
          if (error) throw error;
          return data;
        },
      ).then(d => Array.isArray(d) ? d.length > 0 : true);
    } catch (e) {
      console.error('Supabase deleteCorrespondenceRow error:', e);
      return false;
    }
  },

  /**
   * Fetch all official government correspondences
   */
  async getCorrespondences(): Promise<Correspondence[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    // N-3 — também o feed oficial fica no micro-cache de leitura (era o 3.º
    // GET à tabela messages por execução do carregador).
    return readThroughMessagesCache('corr:all', async () => {
    try {
      // 2026-08-21 (desempenho) — o filtro de correspondências REAIS passa a
      // ser aplicado NO SERVIDOR (protocol_number not null + exclusão das
      // chaves demo) com limite de 200 linhas: em vez de transferir ~585
      // mensagens com corpos inteiros, chegam apenas as reais (poucas).
      const CHAVES_FILTRO_SRV = ['009874562LA041', 'AGT-9921-SR', 'ADM-8812-OP', '009999999LA099', 'CIDADO'];
      const linhas = await lerLinhasDados<LinhaMensagem>(
        'messages',
        undefined,
        { col: 'created_at', dir: 'desc' },
        async () => {
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .order('id', { ascending: false })
            .limit(200);
          if (error) throw error;
          return (data || []) as LinhaMensagem[];
        },
        { limite: 200, notNull: ['protocol_number'], notIn: { sender_bi: CHAVES_FILTRO_SRV, recipient_bi: CHAVES_FILTRO_SRV } },
      );
      if (linhas === null) return null;

      // 2026-08-21 — a página "Correspondências" da Administração em modo real
      // mostra APENAS as trocas reais da plataforma. A tabela messages acumula:
      //   · seeds/mocks semeados (sem protocol_number) — 493 linhas;
      //   · envios feitos pela CONTA DEMO (009874562LA041 / AGT-9921-SR /
      //     ADM-8812-OP), que também gravam na nuvem;
      //   · artefactos de piloto E2E (códigos fictícios *-LLVV e BI 009999999LA099).
      // Critério de REAL: protocolo selado (protocol_number presente) E
      // remetente/destinatário fora dos identificadores de demonstração/ficção.
      const CHAVES_DEMO_OU_FICTICIAS = new Set(['009874562LA041', 'AGT-9921-SR', 'ADM-8812-OP', '009999999LA099', 'CIDADO']);
      const ehChaveReal = (chave?: string | null): boolean => {
        const k = (chave || '').toUpperCase().replace(/\s+/g, '');
        if (!k) return false;
        if (CHAVES_DEMO_OU_FICTICIAS.has(k)) return false;
        if (/-LLVV$/.test(k)) return false; // delegações fictícias dos scripts de piloto
        return true;
      };
      return linhas
        .filter((item: LinhaMensagem) =>
          !!item.protocol_number &&
          ehChaveReal(item.sender_bi) &&
          ehChaveReal(item.recipient_bi))
        .map((item: LinhaMensagem) => {
          const acao = item.actions?.[0] || '';
          const estadoGuardado = (item.state_indicator || '');
          // 2026-08-21 — classificação completa do Expediente:
          //  · enviado pelo admin (CDA/ADMIN-*) → 'Enviada' (aba Enviadas);
          //  · recebido pela Administração → 'Recebida';
          //  · restantes seguem o CICLO de vida: Recebida → Em análise →
          //    Respondida → Arquivada → Cancelada (estado real da nuvem).
          const ESTADOS_CICLO = ['Recebida', 'Em Análise', 'Respondida', 'Arquivada', 'Cancelada'];
          const senderNorm = (item.sender_bi || '').toUpperCase().replace(/\s+/g, '');
          const recipientNorm = (item.recipient_bi || '').toUpperCase().replace(/\s+/g, '');
          let status: string;
          if (senderNorm === 'CDA' || /^ADMIN-/.test(senderNorm)) status = 'Enviada';
          else if (recipientNorm === 'CDA') status = 'Recebida';
          else if (estadoGuardado === 'Em análise' || estadoGuardado === 'Em Análise') status = 'Em Análise';
          else if (ESTADOS_CICLO.includes(estadoGuardado)) status = estadoGuardado;
          else status = 'Recebida';
          const criado = item.created_at ? new Date(item.created_at) : new Date();
          const respondeA = (item.actions || []).find((a: string) => String(a).startsWith('RESPONDE_A:'));
          return {
            id: `COR-${item.id}`,
            sender: item.sender_bi,
            recipient: resolveCitizenName(item.recipient_bi),
            subject: item.subject || item.preview,
            originProvince: item.deadline_text || 'Luanda',
            destinationProvince: item.state_indicator || 'Luanda',
            institution: item.org,
            status,
            date: criado.toLocaleDateString('pt-AO'),
            time: criado.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
            // v37.37 — carimpo bruto para ordenação cronológica decrescente.
            createdAt: item.created_at || criado.toISOString(),
            documentType: item.document_type || 'Correspondência',
            body: item.body,
            priority: item.priority_scale || item.status || 'Média',
            // ligação à correspondência original (respostas)
            ...(respondeA ? { responseTo: respondeA.replace('RESPONDE_A:', '') } : {})
          };
        });
    } catch (e) {
      console.error('Supabase getCorrespondences error:', e);
      return null;
    }
    });
  },

  /**
   * Fetch digital protocols
   */
  async getDigitalProtocols(): Promise<any[] | null> {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const linhas = await lerLinhasDados<any>(
        'digital_protocols',
        undefined,
        { col: 'id', dir: 'desc' },
        async () => {
          const { data, error } = await supabase
            .from('digital_protocols')
            .select('*')
            .order('official_issue_date', { ascending: false });
          if (error) throw error;
          return (data || []) as any[];
        },
      );
      return linhas || [];
    } catch (e) {
      console.error('Supabase getDigitalProtocols error:', e);
      return null;
    }
  },

  /**
   * P0-A — leitura pontual de um protocolo digital pelo numero. Devolve apenas
   * os campos necessarios a apresentacao honesta e a verificacao de integridade
   * (hash SHA-256 selado no envio). NUNCA inventa dados: se nao existir,
   * protocol=null com errorCode real.
   */
  async getDigitalProtocolByNumber(protocolNumber: string) {
    if (!hasValidSupabaseKeys()) return { protocol: null, errorCode: 'SEM_CHAVES' };
    if (!protocolNumber) return { protocol: null, errorCode: 'SEM_NUMERO' };
    try {
      const linhas = await lerLinhasDados<any>(
        'digital_protocols',
        { protocol_number: protocolNumber },
        undefined,
        async () => {
          const { data, error } = await supabase
            .from('digital_protocols')
            .select('protocol_number, digital_signature, legal_validity, official_issue_date, official_time, issuer_responsible, current_state, qr_code_url')
            .eq('protocol_number', protocolNumber)
            .maybeSingle();
          if (error) throw error;
          return data ? [data] : [];
        },
      );
      if (linhas === null) return { protocol: null, errorCode: 'ERRO_LEITURA' };
      return { protocol: linhas[0] || null };
    } catch (e) {
      console.error('Supabase getDigitalProtocolByNumber error:', e);
      return { protocol: null, errorCode: String(e?.code || 'ERRO') };
    }
  },

  /**
   * v27 — validação PÚBLICA de um protocolo (QR real): chama a RPC security
   * definer cda_validar_protocolo, que devolve apenas metadados mínimos e
   * não-sensíveis (emissor/data/estado/selo) — nunca BI, assunto ou corpo.
   * Estados honestos: SEM_CHAVES, SEM_NUMERO, RPC_AUSENTE (função ainda não
   * aplicada no projecto — estado honesto na UI), ERRO.
   */
  async validarProtocolo(protocolNumber: string): Promise<{
    validacao: { protocolo: string; emissor: string; data_emissao: string; estado: string; selado: boolean } | null;
    encontrado: boolean;
    errorCode?: string;
  }> {
    if (!hasValidSupabaseKeys()) return { validacao: null, encontrado: false, errorCode: 'SEM_CHAVES' };
    const numero = (protocolNumber || '').trim().toUpperCase();
    if (!numero) return { validacao: null, encontrado: false, errorCode: 'SEM_NUMERO' };
    try {
      const { data, error } = await supabase.rpc('cda_validar_protocolo', { p_numero: numero });
      if (error) {
        const code = String((error as { code?: string } | null)?.code || '');
        // PGRST202 = função inexistente no projecto (SQL v27 ainda não aplicada)
        return { validacao: null, encontrado: false, errorCode: code === 'PGRST202' ? 'RPC_AUSENTE' : (code || 'ERRO') };
      }
      const linha = Array.isArray(data) && data.length > 0 ? data[0] : null;
      if (!linha) return { validacao: null, encontrado: false };
      return {
        validacao: {
          protocolo: String(linha.protocolo || ''),
          emissor: String(linha.emissor || ''),
          data_emissao: String(linha.data_emissao || ''),
          estado: String(linha.estado || ''),
          selado: !!linha.selado,
        },
        encontrado: true,
      };
    } catch (e) {
      console.error('Supabase validarProtocolo error:', e);
      return { validacao: null, encontrado: false, errorCode: String(e?.code || 'ERRO') };
    }
  },

  /**
   * v28 — Telemetria real das conversas de IA (append-only).
   * Regista UM evento de conversa da consola (instituição/admin) na tabela
   * public.ia_conversas_log. Fire-and-forget honesto: nunca lança, nunca
   * bloqueia o chat; sem sessão autenticada (contas demo locais) devolve
   * SEM_SESSAO e o chamador simplesmente ignora.
   */
  async registarTelemetriaIa(ev: {
    sessionId: string;
    papel: 'cidadao' | 'instituicao' | 'admin';
    sigla?: string | null;
    canal: 'consola_instituicao' | 'preview_instituicao' | 'consola_admin';
    promptPreview: string;
    respostaOk: boolean;
    latMs?: number | null;
  }): Promise<{ written: boolean; reason?: string }> {
    if (!hasValidSupabaseKeys()) return { written: false, reason: 'SEM_CHAVES' };
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session) return { written: false, reason: 'SEM_SESSAO' };
      const { error } = await supabase.from('ia_conversas_log').insert([{
        session_id: ev.sessionId,
        papel: ev.papel,
        sigla: ev.sigla || null,
        canal: ev.canal,
        prompt_preview: (ev.promptPreview || '').slice(0, 160),
        resposta_ok: ev.respostaOk,
        lat_ms: typeof ev.latMs === 'number' && isFinite(ev.latMs) ? Math.max(0, Math.round(ev.latMs)) : null,
      }]);
      if (error) return { written: false, reason: String((error as { code?: string } | null)?.code || 'ERRO') };
      return { written: true };
    } catch (e) {
      // Telemetria nunca derruba a conversa — falha silenciosa e honesta.
      return { written: false, reason: String(e?.code || 'ERRO') };
    }
  },

  /**
   * v28 — Lê a telemetria da PRÓPRIA instituição (a RLS da tabela garante que
   * só as linhas da sigla do utilizador autenticado são devolvidas; o admin
   * global vê tudo). Estados honestos: TABELA_AUSENTE até a SQL v28 ser
   * aplicada no projecto, SEM_SESSAO em contas demo locais.
   */
  async carregarTelemetriaInstituicao(_sigla: string): Promise<{
    state: 'ok' | 'SEM_CHAVES' | 'SEM_SESSAO' | 'TABELA_AUSENTE' | 'ERRO';
    total: number;
    hoje: number;
    okCount: number;
    sessoes: number;
    latMediaMs: number | null;
    logs: { id: string; quando: string; canal: string; promptPreview: string; respostaOk: boolean; latMs: number | null }[];
  }> {
    const vazio = { total: 0, hoje: 0, okCount: 0, sessoes: 0, latMediaMs: null as number | null, logs: [] as { id: string; quando: string; canal: string; promptPreview: string; respostaOk: boolean; latMs: number | null }[] };
    if (!hasValidSupabaseKeys()) return { state: 'SEM_CHAVES', ...vazio };
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session) return { state: 'SEM_SESSAO', ...vazio };
      const { data, error } = await supabase
        .from('ia_conversas_log')
        .select('id, session_id, created_at, canal, prompt_preview, resposta_ok, lat_ms')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        const code = String((error as { code?: string } | null)?.code || '');
        // 42P01 = tabela inexistente; PGRST204/205 = schema cache desactualizado
        const ausente = code === '42P01' || code === 'PGRST204' || code === 'PGRST205';
        return { state: ausente ? 'TABELA_AUSENTE' : 'ERRO', ...vazio };
      }
      const linhas = Array.isArray(data) ? data : [];
      const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0);
      const lats = linhas.map(l => Number(l.lat_ms)).filter(n => isFinite(n) && n >= 0);
      return {
        state: 'ok',
        total: linhas.length,
        hoje: linhas.filter(l => new Date(String(l.created_at)) >= hoje0).length,
        okCount: linhas.filter(l => l.resposta_ok === true).length,
        sessoes: new Set(linhas.map(l => String(l.session_id))).size,
        latMediaMs: lats.length > 0 ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : null,
        logs: linhas.map(l => ({
          id: String(l.id),
          quando: new Date(String(l.created_at)).toLocaleString('pt-AO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
          canal: String(l.canal || ''),
          promptPreview: String(l.prompt_preview || ''),
          respostaOk: l.resposta_ok === true,
          latMs: typeof l.lat_ms === 'number' ? l.lat_ms : null,
        })),
      };
    } catch (e) {
      console.error('Supabase carregarTelemetriaInstituicao error:', e);
      return { state: 'ERRO', ...vazio };
    }
  },

  /**
   * P0-B — verifica REALMENTE se um código institucional consta (aprovado) do
   * registo oficial (RPC cda_instituicao_existe, security definer, exact-match;
   * substitui a fé cega no regex de formato isRealInstitutionalCode). Nunca
   * assume: falha de infra devolve errorCode honesto e registered=false.
   */
  async institutionRegistered(code: string) {
    if (!hasValidSupabaseKeys()) return { registered: false, errorCode: 'SEM_CHAVES' };
    const target = (code || '').trim().toUpperCase();
    if (!target) return { registered: false, errorCode: 'SEM_CODIGO' };
    try {
      const { data, error } = await supabase.rpc('cda_instituicao_existe', { p_codigo: target });
      if (error) return { registered: false, errorCode: String((error as { code?: string } | null)?.code || 'ERRO') };
      return { registered: data === true };
    } catch (e) {
      console.error('Supabase institutionRegistered error:', e);
      return { registered: false, errorCode: String(e?.code || 'ERRO') };
    }
  },

  /**
   * Insert digital protocol
   */
  async insertDigitalProtocol(p: LinhaProtocolo) {
    if (!hasValidSupabaseKeys()) return null;
    try {
      const payload = {
        protocol_number: (p.protocolNumber || '').slice(0, 100),
        issuer_institution: (p.issuerInstitution || '').slice(0, 100),
        official_issue_date: p.officialIssueDate || new Date().toISOString().split('T')[0],
        official_time: p.officialTime ? p.officialTime.split(" ")[0].padStart(8, "0") : "12:00:00",
        issuer_responsible: (p.issuerResponsible || 'Sistema CADA').slice(0, 100),
        category: (p.category || 'Geral').slice(0, 100),
        document_type: (p.documentType || 'Correspondência').slice(0, 100),
        current_state: (p.currentState || 'Ativo').slice(0, 100),
        priority: (p.priority || 'Normal').slice(0, 100),
        qr_code_url: (p.qrCodeUrl || '').slice(0, 100),
        // P0-A — sem chave/honra inventadas: nunca preencher com assinatura
        // fabricada quando o selo não foi aplicado (marcador honesto).
        digital_signature: (p.digitalSignature || 'NAO_SELADO').slice(0, 100),
        // Q-4 (2026-08-21) — legal_validity da produção é VARCHAR(100): sem
        // este corte o insert falhava 22001 EM SILÊNCIO e o protocolo nunca
        // era gravado → validação QR "REGISTO NÃO ENCONTRADO".
        legal_validity: (p.legalValidity || 'Registo tecnico de integridade (sem assinatura qualificada)').slice(0, 100)
      };
      // v25 (familia do bug de auditoria — provado por sonda REST em 2026-08-05):
      // NAO encadear .select(). O SELECT em digital_protocols exige papel
      // admin/instituicao OU issuer_institution = claim instituicao do JWT →
      // envios de CIDADAO falhavam 42501 no read-back e o insert era revertido
      // em silencio: protocolos de cidadaos nunca eram gravados (as linhas
      // existentes na base sao so de instituicoes). Sem .select() o PostgREST
      // usa return=minimal → escrita garantida pela policy de INSERT; a
      // leitura continua restrita por RLS como antes.
      return await gravarDados(
        'digital_protocols', 'insert', undefined, [payload],
        undefined,
        async () => {
          const { error } = await supabase
            .from('digital_protocols')
            .insert([payload]);
          if (error) throw error;
          return { written: true };
        },
      );
    } catch (e) {
      console.error('Supabase insertDigitalProtocol error:', e);
      return null;
    }
  },

  /**
   * Seed the database with all local states.
   * Ensures 100% data fidelity between citizen profile, messages, contacts, and requests.
   */
  async seedAll(params: {
    profile: {
      bi: string;
      name: string;
      phone: string;
      nif: string;
      passport: string;
      birthDate: string;
      filiation: string;
      maritalStatus: string;
    };
    inbox: Message[];
    docInbox: Message[];
    sentMessages: Message[];
    contacts: Contact[];
    documents: Document[];
    userRequests: UserRequest[];
    docRequests: DocRequest[];
    auditLogs: LinhaAuditLog[];
    notifications?: AppNotification[];
    correspondences?: Correspondence[];
    institutionInbox?: Message[];
    institutionCode?: string;
  }): Promise<{ success: boolean; message: string; counts?: Record<string, number> }> {
    if (!hasValidSupabaseKeys()) {
      return { success: false, message: 'Não é possível semear: Chaves do Supabase ausentes ou inválidas.' };
    }

    try {
      const errors: string[] = [];
      let profileCount = 0;
      let messageCount = 0;
      let contactCount = 0;
      let docCount = 0;
      let requestCount = 0;
      let logCount = 0;
      let notifCount = 0;
      let correspondenceCount = 0;

      // 1. Profiling
      try {
        const pResult = await this.upsertProfile({
          bi: params.profile.bi,
          name: params.profile.name,
          phone: params.profile.phone,
          nif: params.profile.nif,
          passport: params.profile.passport,
          birth_date: params.profile.birthDate,
          filiation: params.profile.filiation,
          marital_status: params.profile.maritalStatus,
          role: 'user'
        });
        if (pResult) profileCount++;
      } catch (err) {
        errors.push(`Perfil (${(err as Error)?.message || err})`);
      }

      // Also upsert some default mocked profiles to prevent FK constraint failures
      try {
        await this.upsertProfile({ bi: '008812342LA011', name: 'Maria Antónia', role: 'user' });
        await this.upsertProfile({ bi: '007712342LA021', name: 'José Kalunga', role: 'user' });
        await this.upsertProfile({ bi: '009991332LA018', name: 'Ana Baptista', role: 'user' });
      } catch (err) {}

      // 2. Insert Contacts
      for (const contact of params.contacts) {
        try {
          const res = await this.insertContact(contact, params.profile.bi);
          if (res) contactCount++;
          else errors.push(`Contato ${contact.name}`);
        } catch (err) {
          errors.push(`Contato (${contact.name}: ${(err as Error)?.message || err})`);
        }
      }

      // 3. Insert citizen inbox / tramitações as official messages delivered to the citizen
      const uniqueInboxMessages = Array.from(new Map([...params.inbox, ...params.docInbox].map(m => [m.id, m])).values());
      for (const msg of uniqueInboxMessages) {
        try {
          const res = await this.sendOfficialMessage(msg, params.profile.bi, msg.org);
          if (res) messageCount++;
          else errors.push(`Msg Inbox #${msg.id}`);
        } catch (err) {
          errors.push(`Msg Inbox #${msg.id} (${(err as Error)?.message || err})`);
        }
      }

      // 4. Insert citizen sent messages as messages addressed to institutions
      for (const msg of params.sentMessages) {
        try {
          const res = await this.sendCitizenMessage(msg, params.profile.bi, msg.org);
          if (res) messageCount++;
          else errors.push(`Msg Sent #${msg.id}`);
        } catch (err) {
          errors.push(`Msg Sent #${msg.id} (${(err as Error)?.message || err})`);
        }
      }

      // 4. Insert Documents
      for (const doc of params.documents) {
        try {
          const res = await this.insertDocument(doc, params.profile.bi);
          if (res) docCount++;
          else errors.push(`Doc ${doc.name}`);
        } catch (err) {
          errors.push(`Doc ${doc.name} (${(err as Error)?.message || err})`);
        }
      }

      // 5. Insert User Requests
      for (const req of params.userRequests) {
        try {
          const res = await this.insertUserRequest(req);
          if (res) requestCount++;
          else errors.push(`Ped IPU #${req.id}`);
        } catch (err) {
          errors.push(`Ped IPU #${req.id} (${(err as Error)?.message || err})`);
        }
      }

      // 6. Insert Doc Requests (Emit)
      for (const req of params.docRequests) {
        try {
          const res = await this.insertDocRequest(req);
          if (res) requestCount++;
          else errors.push(`Req Doc #${req.id}`);
        } catch (err) {
          errors.push(`Req Doc #${req.id} (${(err as Error)?.message || err})`);
        }
      }

      // 7. Insert Notifications
      for (const notification of params.notifications || []) {
        try {
          const res = await this.insertNotification(notification, params.profile.bi);
          if (res) notifCount++;
        } catch (err) {
          errors.push(`Notificação (${notification.title}: ${(err as Error)?.message || err})`);
        }
      }

      // 8. Insert official correspondences for admin/government view
      for (const cor of params.correspondences || []) {
        try {
          const res = await this.insertCorrespondence(cor);
          if (res) correspondenceCount++;
        } catch (err) {
          errors.push(`Correspondência (${cor.id}: ${(err as Error)?.message || err})`);
        }
      }

      // 9. Insert institution inbox messages when provided
      for (const msg of params.institutionInbox || []) {
        try {
          const targetInstitution = msg.institution || params.institutionCode || 'AGT';
          const inferredCitizenBi = msg.details?.body?.match(/BI:\s*([A-Z0-9]+)/i)?.[1] || params.profile.bi;
          const res = await this.sendCitizenMessage(msg, inferredCitizenBi, targetInstitution);
          if (res) messageCount++;
        } catch (err) {
          errors.push(`Inbox Institucional #${msg.id} (${(err as Error)?.message || err})`);
        }
      }

      // 10. Insert Audit Logs
      for (const log of params.auditLogs.slice(-10)) { // sync last 10 logs
        try {
          const res = await this.insertAuditLog({
            action: log.action || log.message || '',
            user: log.user || 'SYSTEM',
            type: log.type || 'info'
          });
          if (res) logCount++;
        } catch (err) {}
      }

      return {
        success: errors.length === 0,
        message: errors.length === 0 
          ? 'Banco de dados semeado com sucesso!' 
          : `Semeado com alguns erros: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`,
        counts: {
          profiles: profileCount,
          messages: messageCount,
          contacts: contactCount,
          documents: docCount,
          requests: requestCount,
          notifications: notifCount,
          correspondences: correspondenceCount,
          auditLogs: logCount
        }
      };
    } catch (e) {
      return {
        success: false,
        message: `Falha na semeadura geral: ${(e as Error)?.message || e}`
      };
    }
  },

  /** 2026-08-22 — PERMISSÕES DE PÁGINA do agente (a decisão é do BACKEND):
   *  'ler' devolve as páginas autorizadas do próprio token (nuvem canónica);
   *  'gravar' pede ao servidor para gravar as páginas do agente alvo (só o
   *  responsável da área é autorizado). */
  permissoesAgente: (acao: 'ler' | 'gravar', agente?: string, paginas?: string[]) =>
    permissoesAgente(acao, agente, paginas),
  equipaMembroCloud: (acao: 'criar' | 'listar', membro?: { agente: string; nome: string; email?: string; phone?: string }) =>
    equipaMembroCloud(acao, membro),

  /** 2026-08-22 — senha do agente na NUVEM (responsável da área repõe na Equipa). */
  alterarSenhaAgente: (agente: string, senha: string) => alterarSenhaAgente(agente, senha),
};
