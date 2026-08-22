/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// 2026-08-22 — DADOS REAIS PARA AS PÁGINAS DA ADMINISTRAÇÃO (Modo Real)
// Perfil · Relatórios · Auditoria. Um único carregamento agregado com cache
// curto (60s), partilhado pelas páginas, para não martelar o Supabase quando
// o admin navega entre separadores. Em Modo Demo (sem chaves / sem sessão)
// NADA disto corre — as páginas mantêm o comportamento demo de sempre.
// ============================================================================

import { supabase } from '../lib/supabaseClient';
import { hasValidSupabaseKeys } from './supabaseService';

export interface RealProfileRow {
  bi: string;
  name: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  nif: string | null;
  morada: string | null;
}

export interface RealAuditRow {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  type: 'info' | 'warning' | 'critical' | 'success';
}

export interface RealMessageRow {
  id: string;
  status: string | null;
  created_at: string | null;
  org: string | null;
  preview: string | null;
  subject: string | null;
}

export interface RealVideoRow {
  id: string;
  subject: string | null;
  status: string | null;
  scheduled_for: string | null;
  created_at: string | null;
  host_bi: string | null;
  institution_code: string | null;
}

export interface RealDocumentRow {
  id: string;
  name: string | null;
  holder_bi: string | null;
  issued_at: string | null;
  status: string | null;
}

export interface RealProtocolRow {
  id: string;
  protocol_number: string | null;
  issuer_institution: string | null;
  official_issue_date: string | null;
  document_type: string | null;
  current_state: string | null;
}

export interface RealPagamentoRow {
  id: string;
  instituicao_sigla: string | null;
  destinatario_bi: string | null;
  descricao: string | null;
  valor: number | null;
  estado: string | null;
  created_at: string | null;
}

export interface RealIaLogRow {
  id: string;
  papel: string | null;
  sigla: string | null;
  canal: string | null;
  resposta_ok: boolean | null;
  lat_ms: number | null;
  created_at: string | null;
}

export interface RealIaTelemetriaRow {
  dia: string | null;
  sigla: string | null;
  canal: string | null;
  total: number | null;
  ok: number | null;
  sessoes: number | null;
  lat_media_ms: number | null;
}

export interface RealSolicitacaoRow {
  id: string;
  nome: string | null;
  bi_numero: string | null;
  status: string | null;
  criado_em: string | null;
}

export interface RealUserRequestRow {
  id: string;
  user_bi: string | null;
  user_name: string | null;
  service_type: string | null;
  status: string | null;
  request_date: string | null;
}

export interface AdminRealData {
  carregadoEm: number;
  profiles: RealProfileRow[];
  cidadaos: RealProfileRow[];
  instituicoes: RealProfileRow[];
  auditLogs: RealAuditRow[];
  auditTotal: number | null;
  mensagens: RealMessageRow[];
  mensagensTotal: number | null;
  videoSessions: RealVideoRow[];
  documentos: RealDocumentRow[];
  protocolos: RealProtocolRow[];
  pagamentos: RealPagamentoRow[];
  iaLogs: RealIaLogRow[];
  iaTelemetria: RealIaTelemetriaRow[];
  solicitacoes: RealSolicitacaoRow[];
  userRequests: RealUserRequestRow[];
}

const CACHE_MS = 60_000;
let cache: AdminRealData | null = null;
let emCurso: Promise<AdminRealData | null> | null = null;

const podeUsarDadosReais = (): boolean => {
  try {
    return hasValidSupabaseKeys();
  } catch {
    return false;
  }
};

/** Leitura tolerante: qualquer falha devolve [] (a página mostra o que tem). */
async function ler<T>(query: PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  try {
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as T[];
  } catch (e) {
    console.warn('[CDA-admin-dados] leitura falhou (não bloqueia a página):', e?.message || e);
    return [];
  }
}

/** Contagem exacta (head) — devolve null se o RLS/servidor recusar. */
async function contar(tabela: string): Promise<number | null> {
  try {
    const { count, error } = await supabase
      .from(tabela)
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    return typeof count === 'number' ? count : null;
  } catch {
    return null;
  }
}

const mapearAudit = (item: any): RealAuditRow => ({
  id: String(item.id),
  action: item.action || '',
  user: item.username || '—',
  timestamp: item.timestamp || '',
  type: (item.action_type === 'critical' || item.action_type === 'warning' || item.action_type === 'success'
    ? item.action_type
    : 'info') as RealAuditRow['type'],
});

/**
 * Carrega (ou reutiliza em cache) o conjunto agregado de dados reais da
 * Administração Central. Devolve null quando o Modo Real não está activo
 * (demo/sem chaves) — nesse caso as páginas NÃO mudam nada no comportamento.
 */
export async function carregarDadosReaisAdmin(forcar = false): Promise<AdminRealData | null> {
  if (!podeUsarDadosReais()) return null;
  const agora = Date.now();
  if (!forcar && cache && agora - cache.carregadoEm < CACHE_MS) return cache;
  if (!forcar && emCurso) return emCurso;
  emCurso = (async () => {
    const [
      profilesRaw, auditRaw, auditTotal, mensagensRaw, mensagensTotal,
      videoRaw, docsRaw, protRaw, pagRaw, iaLogsRaw, iaTelRaw,
      solicitRaw, userReqRaw,
    ] = await Promise.all([
      ler(supabase.from('profiles').select('bi,name,role,phone,email,nif,morada').limit(500)),
      ler(supabase.from('audit_logs').select('id,action,username,timestamp,action_type').order('id', { ascending: false }).limit(1500)),
      contar('audit_logs'),
      ler(supabase.from('messages').select('id,status,created_at,org,preview,subject').order('created_at', { ascending: false }).limit(2000)),
      contar('messages'),
      ler(supabase.from('video_sessions').select('id,subject,status,scheduled_for,created_at,host_bi,institution_code').order('created_at', { ascending: false }).limit(500)),
      ler(supabase.from('documents').select('id,name,holder_bi,issued_at,status').order('issued_at', { ascending: false }).limit(500)),
      ler(supabase.from('digital_protocols').select('id,protocol_number,issuer_institution,official_issue_date,document_type,current_state').order('official_issue_date', { ascending: false }).limit(500)),
      ler(supabase.from('pagamentos').select('id,instituicao_sigla,destinatario_bi,descricao,valor,estado,created_at').order('created_at', { ascending: false }).limit(500)),
      ler(supabase.from('ia_conversas_log').select('id,papel,sigla,canal,resposta_ok,lat_ms,created_at').order('created_at', { ascending: false }).limit(500)),
      ler(supabase.from('ia_telemetria_resumo').select('dia,sigla,canal,total,ok,sessoes,lat_media_ms').order('dia', { ascending: false }).limit(500)),
      ler(supabase.from('solicitacoes_registo').select('id,nome,bi_numero,status,criado_em').order('criado_em', { ascending: false }).limit(500)),
      ler(supabase.from('user_requests').select('id,user_bi,user_name,service_type,status,request_date').order('request_date', { ascending: false }).limit(500)),
    ]);
    const profiles = profilesRaw as RealProfileRow[];
    const dados: AdminRealData = {
      carregadoEm: agora,
      profiles,
      cidadaos: profiles.filter(p => p.role === 'user'),
      instituicoes: profiles.filter(p => p.role === 'institution'),
      auditLogs: (auditRaw as any[]).map(mapearAudit),
      auditTotal,
      mensagens: mensagensRaw as RealMessageRow[],
      mensagensTotal,
      videoSessions: videoRaw as RealVideoRow[],
      documentos: docsRaw as RealDocumentRow[],
      protocolos: protRaw as RealProtocolRow[],
      pagamentos: pagRaw as RealPagamentoRow[],
      iaLogs: iaLogsRaw as RealIaLogRow[],
      iaTelemetria: iaTelRaw as RealIaTelemetriaRow[],
      solicitacoes: solicitRaw as RealSolicitacaoRow[],
      userRequests: userReqRaw as RealUserRequestRow[],
    };
    cache = dados;
    return dados;
  })();
  try {
    return await emCurso;
  } finally {
    emCurso = null;
  }
}

/** Utilidades de formatação partilhadas pelas páginas. */
export const fmtDataCurta = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).slice(0, 16).replace('T', ' ');
    return d.toLocaleString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(iso);
  }
};

export const nomeMesCurto = (iso: string | null | undefined): string => {
  try {
    const d = new Date(iso || '');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-PT', { month: 'short' }).replace('.', '');
  } catch {
    return '—';
  }
};
