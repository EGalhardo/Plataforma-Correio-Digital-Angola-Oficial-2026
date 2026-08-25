/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedCounter } from '../ui/AnimatedCounter';
import {
  FileText,
  Download,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Check,
  Briefcase,
  Users,
  Building2,
  Globe,
  ShieldAlert,
  Loader2,
  Printer,
  Sparkles,
  FileSignature,
  FileCheck,
  History,
  Activity,
  X
} from 'lucide-react';
import { 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Area 
} from 'recharts';
import { Correspondence } from '../../types';
import { shouldUseMockFallback } from '../../config/runtime';
import { carregarDadosReaisAdmin, fmtDataCurta, nomeMesCurto, type AdminRealData } from '../../services/adminRealDataService';
import { hasValidSupabaseKeys } from '../../services/supabaseService';

export interface GovRelatorioContentProps {
  correspondences?: Correspondence[];
  auditLogs?: {
    id: string;
    action: string;
    user: string;
    timestamp: string;
    type: 'info' | 'warning' | 'critical' | 'success';
  }[];
  isDemo?: boolean;
}

// Type definitions for reports
type ReportType = 'correspondences' | 'institutions' | 'citizens' | 'workers' | 'ai_assist' | 'digital_docs' | 'audit_security';

export function GovRelatorioContent({
  correspondences = [],
  auditLogs = [],
  isDemo = false
}: GovRelatorioContentProps) {
  // Selected Report Tab
  const [activeTab, setActiveTab] = useState<ReportType>('correspondences');
  
  // Period settings
  const [comparePeriod, setComparePeriod] = useState<boolean>(true);
  const [comparisonPreset, setComparisonPreset] = useState<'month' | '30days'>('month');
  // 2026-08-23 — intervalo REAL dinâmico (últimos 30 dias), não datas fixas
  // de demonstração.
  const [customStartDate, setCustomStartDate] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  
  // Interactive processing simulation
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  
  // Executive descriptive modal state
  const [isExecutiveModalOpen, setIsExecutiveModalOpen] = useState<boolean>(false);
  const [executiveSummary, setExecutiveSummary] = useState<string>(
    'Este documento reflete a análise pormenorizada da consolidação tecnológica das províncias, evidenciando o ritmo acelerado de digitalização dos canais de governo eletrônico, em plena conformidade com as diretrizes do Conselho Digital de Angola.'
  );
  const [executiveTitle, setExecutiveTitle] = useState<string>('MEMÓRIA DESCRITIVA INTEGRADA DE RESULTADOS');
  const [executiveDepartment, setExecutiveDepartment] = useState<string>('Direção Unificada de Auditoria e Tecnologia do CDA');

  // 2026-08-22 — MODO REAL: conjunto agregado vivo da base central
  // (profiles, messages, video_sessions, documents, digital_protocols,
  // pagamentos, ia_conversas_log, ia_telemetria_resumo, audit_logs...).
  // Presente apenas em sessões reais — em demo fica null e TODOS os valores
  // estáticos de demonstração se mantêm exatamente como antes.
  const [dadosReais, setDadosReais] = useState<AdminRealData | null>(null);
  useEffect(() => {
    let vivo = true;
    if (isDemo || shouldUseMockFallback() || !hasValidSupabaseKeys()) return;
    carregarDadosReaisAdmin().then(d => { if (vivo && d) setDadosReais(d); }).catch(() => {});
    return () => { vivo = false; };
  }, [isDemo]);

  // ---- utilitários de agregação REAL (mensal e diária) ----
  const _chaveMes = (iso: string | null | undefined): string => {
    if (!iso) return '';
    try { const d = new Date(iso); return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; } catch { return ''; }
  };
  const _ultimosMeses = (n: number): string[] => {
    const out: string[] = [];
    const agora = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return out;
  };
  const _agregarPorMes = (linhas: any[], campo: (l: any) => string | null | undefined, meses: string[]) => {
    const totais = new Map<string, number>(meses.map(m => [m, 0]));
    linhas.forEach(l => {
      const k = _chaveMes(campo(l));
      if (totais.has(k)) totais.set(k, (totais.get(k) || 0) + 1);
    });
    return totais;
  };
  const _paraGrafico = (totais: Map<string, number>, meses: string[]) => meses.map(m => ({ name: nomeMesCurto(`${m}-01`), Entradas: totais.get(m) || 0, Saidas: 0, Corrente: 0, Anterior: 0 }));
  // Membro real da equipa = código de agente estruturado (ADMIN-0001,
  // INAPEM-LLMM-01, AGT-9921-SR, ADM-8812-OP…) — exclui a identidade de
  // sistema 'CDA' e BIs de cidadão.
  const _ehAgenteCodificado = (bi: string): boolean => bi !== 'CDA' && /^[A-Z]+(-[A-Z]+)*-\d{2,}(-[A-Z]{2,})?$/.test(bi);
  const _pct = (curr: number, prev: number): { pct: string; up: boolean } => {
    if (!prev) return { pct: 'n/d', up: curr > 0 };
    const v = ((curr - prev) / prev) * 100;
    return { pct: `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`, up: v >= 0 };
  };

  // Calculate selected date range in days for dynamic indicators scaling
  const dateRangeDays = useMemo(() => {
    try {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 30;
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      return diffDays;
    } catch {
      return 30;
    }
  }, [customStartDate, customEndDate]);

  // Scaling factor: Base comparison assumes 30 days. Scale metrics proportionally!
  const scaleFactor = useMemo(() => {
    return Math.max(0.1, Math.min(5, dateRangeDays / 30));
  }, [dateRangeDays]);

  // Trigger processing effect when configs modify
  useEffect(() => {
    setIsLoading(true);
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 900);
    return () => clearTimeout(timeout);
  }, [activeTab, comparePeriod, comparisonPreset, customStartDate, customEndDate]);

  // Audio effect context for successful operations
  const playInteractionSound = (type: 'success' | 'click') => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {
      // Ignored if browser policy blocks audio autostarts
    }
  };

  // Standard interactive tabs descriptor
  const reportTabs = [
    { id: 'correspondences', label: 'Correspond.', icon: <FileText size={16} />, desc: 'Trâmite postal e taxa de entrega' },
    { id: 'institutions', label: 'Instituições', icon: <Building2 size={16} />, desc: 'Integração pública e tráfego API' },
    { id: 'citizens', label: 'Cidadãos', icon: <Users size={16} />, desc: 'Adesão de usuários e BI Digital' },
    { id: 'workers', label: 'Equipa', icon: <Briefcase size={16} />, desc: 'Auditoria de produtividade' },
    { id: 'ai_assist', label: 'Assistência IA', icon: <Sparkles size={16} />, desc: 'Automação e chancelaria assistida' },
    { id: 'digital_docs', label: 'Docs Digitais', icon: <FileSignature size={16} />, desc: 'Emissões e chaves criptográficas' },
    { id: 'audit_security', label: 'Auditoria', icon: <ShieldAlert size={16} />, desc: 'Monitorização cibernética e logs' },
  ] as const;

  // Static Fallback Correspondences Data
  const resolvedCorrespondences = useMemo(() => {
    if (correspondences && correspondences.length > 0) return correspondences;
    if (!(isDemo || shouldUseMockFallback())) return [];
    return [
      { id: 'C-01', sender: 'AGT', recipient: 'Mindis', subject: 'Ofício de Liquidação Fiscal Coletiva', originProvince: 'Luanda', destinationProvince: 'Benguela', institution: 'AGT', status: 'Enviada', date: '2026-06-11', body: 'Submete-se o termo de deferimento fiscal.' },
      { id: 'C-02', sender: 'SME', recipient: 'Registo Civil', subject: 'Consulta Migratória Urgente', originProvince: 'Cabinda', destinationProvince: 'Luanda', institution: 'SME', status: 'Recebida', date: '2026-06-10', body: 'Solicitação de rastreio de passaporte biométrico.' },
      { id: 'C-03', sender: 'MINJUS', recipient: 'AGT', subject: 'Certidão Comercial Integrada', originProvince: 'Huambo', destinationProvince: 'Huíla', institution: 'MINJUS', status: 'Em Análise', date: '2026-06-09', body: 'Envio de documentação notarial coletiva.' },
      { id: 'C-04', sender: 'Registo Civil', recipient: 'Cidadão', subject: 'Notificação de Bilhete Pronto', originProvince: 'Uíge', destinationProvince: 'Luanda', institution: 'Registo Civil', status: 'Respondida', date: '2026-06-08', body: 'Emissão e holografia digital concluídas.' }
    ];
  }, [correspondences]);

  // Static Fallback Audit Logs Data
  const resolvedAuditLogs = useMemo(() => {
    // MODO REAL: os logs vivos da nuvem têm prioridade sobre o espelho local.
    if (dadosReais && dadosReais.auditLogs.length > 0) return dadosReais.auditLogs as any[];
    if (auditLogs && auditLogs.length > 0) return auditLogs;
    if (!(isDemo || shouldUseMockFallback())) return [];
    return [
      { id: 'AL-101', action: 'Restauro emergencial de chaves criptográficas HSM', user: 'Edlasio Galhardo (Admin)', timestamp: '12/06/2026 10:22', type: 'success' },
      { id: 'AL-102', action: 'Bloqueio preventivo de IP suspeito por múltiplas assinaturas falhadas', user: 'Filtro Firewall Central', timestamp: '12/06/2026 09:12', type: 'critical' },
      { id: 'AL-103', action: 'Geração de novos parâmetros de barramento dactiloscópico API', user: 'Karina Neto (Consular)', timestamp: '11/06/2026 14:15', type: 'info' },
      { id: 'AL-104', action: 'Modificação manual de privilégio operacional de nível intermédio', user: 'Sílvia Viana (Auditora)', timestamp: '11/06/2026 11:30', type: 'warning' }
    ] as any[];
  }, [auditLogs, dadosReais]);

  // Comprehensive Metrics & Dynamic KPI Data Generator
  const kpiData = useMemo(() => {
    // ==================== MODO REAL (base central viva) ====================
    // Prioridade total sobre os valores estáticos de demonstração: quando a
    // sessão é real, TODAS as métricas, gráficos e cabeçalhos de tabela saem
    // das tabelas do Supabase (profiles, messages, video_sessions, documents,
    // digital_protocols, pagamentos, ia_conversas_log/telemetria, audit_logs).
    if (dadosReais) {
      const dR = dadosReais;
      const meses = _ultimosMeses(6);
      const agoraMs = Date.now();
      const dia = 86_400_000;
      const dentroDe = (iso: string | null | undefined, dias: number) => {
        if (!iso) return false;
        try { const t = new Date(iso).getTime(); return !isNaN(t) && t >= agoraMs - dias * dia; } catch { return false; }
      };
      const entre = (iso: string | null | undefined, deDias: number, ateDias: number) => {
        if (!iso) return false;
        try { const t = new Date(iso).getTime(); return !isNaN(t) && t >= agoraMs - deDias * dia && t < agoraMs - ateDias * dia; } catch { return false; }
      };
      const grafico = (totais: Map<string, number>, totaisSaidas?: Map<string, number>) => {
        let acumulado = 0;
        return meses.map(m => {
          const v = totais.get(m) || 0;
          acumulado += v;
          return { name: nomeMesCurto(`${m}-01`), Entradas: v, Saidas: totaisSaidas?.get(m) || 0, Corrente: acumulado, Anterior: acumulado - v };
        });
      };
      switch (activeTab) {
        case 'correspondences': {
          const msgs = dR.mensagens;
          const total = dR.mensagensTotal ?? msgs.length;
          const ult30 = msgs.filter(m => dentroDe(m.created_at, 30)).length;
          const prev30 = msgs.filter(m => entre(m.created_at, 60, 30)).length;
          const respondidas = msgs.filter(m => (m.status || '').toLowerCase() === 'respondida').length;
          const aguardam = total - respondidas;
          const t1 = _pct(ult30, prev30);
          return {
            title: 'Relatório Real de Correspondências',
            metrics: [
              { id: 'co-1', label: 'Correspondências Registadas', current: total, prev: prev30, text: `Base central · ${ult30} nos últimos 30 dias`, suffix: ' un', isTrendUp: true, pct: t1.pct },
              { id: 'co-2', label: 'Respondidas', current: respondidas, prev: 0, text: 'Ciclo de resposta concluído', suffix: ' un', isTrendUp: true, pct: total ? `+${Math.round((respondidas / total) * 100)}%` : 'n/d' },
              { id: 'co-3', label: 'Aguardam Resposta', current: aguardam, prev: 0, text: 'Em trâmite nas caixas', suffix: ' un', isTrendUp: false, pct: 'n/d' },
              { id: 'co-4', label: 'Volume Recente', current: ult30, prev: prev30, text: 'Últimos 30 dias vs 30 anteriores', suffix: ' un', isTrendUp: t1.up, pct: t1.pct },
            ],
            chart: grafico(_agregarPorMes(msgs, m => m.created_at, meses), _agregarPorMes(msgs.filter(m => (m.status || '').toLowerCase() === 'respondida'), m => m.created_at, meses)),
            infoTitle: 'Últimos Trâmites Reais da Caixa Central',
            csvHeader: ['ID de Trâmite', 'Estado', 'Orgão', 'Assunto', 'Data de Emissão'],
          };
        }
        case 'institutions': {
          const insts = dR.instituicoes;
          const prots = dR.protocolos;
          const pags = dR.pagamentos;
          const valor = pags.reduce((s, p) => s + (p.valor || 0), 0);
          return {
            title: 'Dados Reais de Integração Institucional',
            metrics: [
              { id: 'in-1', label: 'Instituições Integradas', current: insts.length, prev: 0, text: 'Perfis institucionais na base central', suffix: ' entidades', isTrendUp: true, pct: 'n/d' },
              { id: 'in-2', label: 'Protocolos Digitais', current: prots.length, prev: 0, text: 'Selo e assinatura digital', suffix: ' protocolos', isTrendUp: true, pct: 'n/d' },
              { id: 'in-3', label: 'Pagamentos Registados', current: pags.length, prev: 0, text: 'Referências na plataforma', suffix: ' un', isTrendUp: true, pct: 'n/d' },
              { id: 'in-4', label: 'Valor Registado', current: valor, prev: 0, text: 'Soma das referências activas', suffix: ' Kz', isTrendUp: true, pct: 'n/d' },
            ],
            chart: grafico(_agregarPorMes(prots, p => p.official_issue_date, meses)),
            infoTitle: 'Organismos Ligados à Plataforma (perfis reais)',
            csvHeader: ['Organismo', 'Sigla / BI', 'Email', 'Contacto'],
          };
        }
        case 'citizens': {
          const cids = dR.cidadaos;
          const solis = dR.solicitacoes;
          const aprovados = solis.filter(s => (s.status || '').toLowerCase() === 'active' || (s.status || '').toLowerCase() === 'aprovado').length;
          const pendentes = solis.filter(s => !(s.status || '').toLowerCase().startsWith('active') && !(s.status || '').toLowerCase().startsWith('aprovado') && !(s.status || '').toLowerCase().startsWith('blocked') && !(s.status || '').toLowerCase().startsWith('bloqueado')).length;
          const bloqueados = solis.filter(s => (s.status || '').toLowerCase().startsWith('blocked') || (s.status || '').toLowerCase().startsWith('bloqueado')).length;
          return {
            title: 'Auditoria Real de Adesão e Cadastros',
            metrics: [
              { id: 'ci-1', label: 'Cidadãos Registados', current: cids.length, prev: 0, text: 'Perfis com BI na base central', suffix: ' cidadãos', isTrendUp: true, pct: 'n/d' },
              { id: 'ci-2', label: 'Registos Aprovados', current: aprovados, prev: 0, text: 'Homologação concluída', suffix: ' un', isTrendUp: true, pct: 'n/d' },
              { id: 'ci-3', label: 'Pendentes de Homologação', current: pendentes, prev: 0, text: 'Aguardam decisão da Administração', suffix: ' un', isTrendUp: false, pct: 'n/d' },
              { id: 'ci-4', label: 'Contas Bloqueadas', current: bloqueados, prev: 0, text: 'Acesso suspenso pela Administração', suffix: ' un', isTrendUp: false, pct: 'n/d' },
            ],
            chart: grafico(_agregarPorMes(solis, s => s.criado_em, meses)),
            infoTitle: 'Fichas Reais de Cidadão na Base Central',
            csvHeader: ['Nome', 'BI', 'Contacto', 'Morada'],
          };
        }
        case 'workers': {
          const equipa = dR.profiles.filter(p => p.bi !== 'CDA' && (p.role === 'admin' || _ehAgenteCodificado(p.bi)));
          const vids = dR.videoSessions;
          const concluidas = vids.filter(v => (v.status || '').toLowerCase().startsWith('conclu')).length;
          const agendadas = vids.filter(v => (v.status || '').toLowerCase().startsWith('agendada')).length;
          const pedidos = dR.userRequests.length;
          const ultimaAtividade = (nome: string | null) => {
            if (!nome) return '—';
            const l = dR.auditLogs.find(a => a.user === nome);
            return l ? fmtDataCurta(l.timestamp) : '—';
          };
          return {
            title: 'Produtividade Real da Equipa e Operadores',
            metrics: [
              { id: 'wo-1', label: 'Membros da Equipa', current: equipa.length, prev: 0, text: 'Admins, agentes e colaboradores', suffix: ' membros', isTrendUp: true, pct: 'n/d' },
              { id: 'wo-2', label: 'Atendimentos Vídeo Concluídos', current: concluidas, prev: 0, text: 'Sessões encerradas na nuvem', suffix: ' sessões', isTrendUp: true, pct: 'n/d' },
              { id: 'wo-3', label: 'Sessões Agendadas', current: agendadas, prev: 0, text: 'Activas na Agenda', suffix: ' sessões', isTrendUp: true, pct: 'n/d' },
              { id: 'wo-4', label: 'Pedidos de Serviço', current: pedidos, prev: 0, text: 'user_requests na base central', suffix: ' pedidos', isTrendUp: true, pct: 'n/d' },
            ],
            chart: grafico(_agregarPorMes(vids, v => v.created_at, meses), _agregarPorMes(vids.filter(v => (v.status || '').toLowerCase().startsWith('conclu')), v => v.created_at, meses)),
            infoTitle: 'Desempenho Real dos Membros (última actividade na nuvem)',
            csvHeader: ['Membro', 'Nº Agente / BI', 'Papel', 'Última Actividade'],
          };
        }
        case 'ai_assist': {
          const logsIa = dR.iaLogs;
          const tel = dR.iaTelemetria;
          const totalIa = tel.reduce((s, t) => s + (t.total || 0), 0) || logsIa.length;
          const okIa = tel.reduce((s, t) => s + (t.ok || 0), 0) || logsIa.filter(l => l.resposta_ok).length;
          const latMedia = tel.length ? Math.round(tel.reduce((s, t) => s + (t.lat_media_ms || 0), 0) / tel.length) : Math.round(logsIa.reduce((s, l) => s + (l.lat_ms || 0), 0) / Math.max(1, logsIa.length));
          const sessoes = tel.reduce((s, t) => s + (t.sessoes || 0), 0);
          return {
            title: 'Utilização Real do Assistente IA',
            metrics: [
              { id: 'ai-1', label: 'Interações IA Registadas', current: totalIa, prev: 0, text: 'Telemetria + log de conversas', suffix: ' interações', isTrendUp: true, pct: 'n/d' },
              { id: 'ai-2', label: 'Respostas com Sucesso', current: okIa, prev: 0, text: totalIa ? `${Math.round((okIa / totalIa) * 100)}% de sucesso real` : 'sem dados', suffix: ' un', isTrendUp: true, pct: 'n/d' },
              { id: 'ai-3', label: 'Latência Média', current: latMedia, prev: 0, text: 'Tempo médio de resposta', suffix: ' ms', isTrendUp: false, pct: 'n/d' },
              { id: 'ai-4', label: 'Sessões IA', current: sessoes, prev: 0, text: 'Sessões de assistência abertas', suffix: ' sessões', isTrendUp: true, pct: 'n/d' },
            ],
            chart: (() => {
              const porDia = new Map<string, number>();
              tel.forEach(t => { if (t.dia) porDia.set(t.dia, (porDia.get(t.dia) || 0) + (t.total || 0)); });
              logsIa.forEach(l => { const k = l.created_at?.slice(0, 10) || ''; if (k) porDia.set(k, (porDia.get(k) || 0) + 1); });
              const dias = Array.from(porDia.keys()).sort().slice(-6);
              let acumulado = 0;
              return dias.map(k => {
                const v = porDia.get(k) || 0;
                acumulado += v;
                return { name: k.slice(8, 10) + '/' + k.slice(5, 7), Entradas: v, Saidas: 0, Corrente: acumulado, Anterior: acumulado - v };
              });
            })(),
            infoTitle: 'Conversas Reais com o Assistente IA',
            csvHeader: ['Papel', 'Sigla', 'Canal', 'Resposta OK', 'Latência (ms)', 'Data'],
          };
        }
        case 'digital_docs': {
          const docs = dR.documentos;
          const prots = dR.protocolos;
          const ult30 = docs.filter(dc => dentroDe(dc.issued_at, 30)).length;
          return {
            title: 'Controle Real de Emissões de Documentos Digitais',
            metrics: [
              { id: 'do-1', label: 'Documentos Digitais', current: docs.length, prev: 0, text: 'Registos na tabela documents', suffix: ' un', isTrendUp: true, pct: 'n/d' },
              { id: 'do-2', label: 'Emitidos (30 dias)', current: ult30, prev: 0, text: 'Emissões recentes reais', suffix: ' un', isTrendUp: true, pct: 'n/d' },
              { id: 'do-3', label: 'Protocolos Digitais', current: prots.length, prev: 0, text: 'Trâmite selado digitalmente', suffix: ' protocolos', isTrendUp: true, pct: 'n/d' },
              { id: 'do-4', label: 'Estado Actual', current: prots.filter(p => (p.current_state || '').toLowerCase().includes('conclu')).length, prev: 0, text: 'Protocolos concluídos', suffix: ' un', isTrendUp: true, pct: 'n/d' },
            ],
            chart: grafico(_agregarPorMes(docs, dc => dc.issued_at, meses)),
            infoTitle: 'Emissões Reais de Documentos e Protocolos',
            csvHeader: ['Documento', 'Titular (BI)', 'Estado', 'Emitido em'],
          };
        }
        case 'audit_security':
        default: {
          const logs = dR.auditLogs;
          const totalEv = dR.auditTotal ?? logs.length;
          const criticos = logs.filter(l => l.type === 'critical').length;
          const avisos = logs.filter(l => l.type === 'warning').length;
          const seteDias = logs.filter(l => dentroDe(l.timestamp, 7)).length;
          return {
            title: 'Monitorização e Auditoria Real de Segurança',
            metrics: [
              { id: 'au-1', label: 'Eventos de Auditoria (total)', current: totalEv, prev: 0, text: 'Tabela audit_logs da base central', suffix: ' eventos', isTrendUp: true, pct: 'n/d' },
              { id: 'au-2', label: 'Críticos (amostra recente)', current: criticos, prev: 0, text: `Nos últimos ${logs.length} eventos`, suffix: ' eventos', isTrendUp: false, pct: 'n/d' },
              { id: 'au-3', label: 'Avisos (amostra recente)', current: avisos, prev: 0, text: `Nos últimos ${logs.length} eventos`, suffix: ' eventos', isTrendUp: false, pct: 'n/d' },
              { id: 'au-4', label: 'Eventos Últimos 7 Dias', current: seteDias, prev: 0, text: 'Actividade real da semana', suffix: ' eventos', isTrendUp: true, pct: 'n/d' },
            ],
            chart: (() => {
              const porDia = new Map<string, number>();
              const falhasDia = new Map<string, number>();
              logs.forEach(l => {
                const k = (l.timestamp || '').slice(0, 10);
                if (!k) return;
                porDia.set(k, (porDia.get(k) || 0) + 1);
                if (l.type === 'warning' || l.type === 'critical') falhasDia.set(k, (falhasDia.get(k) || 0) + 1);
              });
              const dias = Array.from(porDia.keys()).sort().slice(-6);
              let acumulado = 0;
              return dias.map(k => {
                const v = porDia.get(k) || 0;
                acumulado += v;
                return { name: k.slice(8, 10) + '/' + k.slice(5, 7), Entradas: v, Saidas: falhasDia.get(k) || 0, Corrente: acumulado, Anterior: acumulado - v };
              });
            })(),
            infoTitle: 'Últimos Logs Reais de Auditoria e Segurança',
            csvHeader: ['ID Alerta', 'Ação Auditada', 'Operador Responsável', 'Data e Hora', 'Gravidade'],
          };
        }
      }
    }
    // ============ MODO DEMO (valores estáticos originais) ============
    switch (activeTab) {
      case 'correspondences':
        return {
          title: 'Relatório Trimestral de Correspondências',
          metrics: [
            { id: 'co-1', label: 'Cartas Recebidas', current: Math.round(15420 * scaleFactor), prev: Math.round(13240 * scaleFactor), text: 'Total recebidas no barramento', suffix: ' un', isTrendUp: true, pct: '+16.4%' },
            { id: 'co-2', label: 'Correspondências Emitidas', current: Math.round(18230 * scaleFactor), prev: Math.round(16900 * scaleFactor), text: 'Ofícios despachados', suffix: ' un', isTrendUp: true, pct: '+7.8%' },
            { id: 'co-3', label: 'Taxa de Entrega Postal', current: 98.4, prev: 95.1, text: 'Garantia de recebimento', suffix: '%', isTrendUp: true, pct: '+3.3%' },
            { id: 'co-4', label: 'Trâmite Médio Postal', current: Number((1.4 * (1 / scaleFactor)).toFixed(1)), prev: Number((2.1 * (1 / scaleFactor)).toFixed(1)), text: 'Tempo de processamento', suffix: ' dias', isTrendUp: false, pct: '-33.3%' },
          ],
          chart: [
            { name: 'Jan', Entradas: Math.round(4500 * scaleFactor), Saidas: Math.round(4100 * scaleFactor), Corrente: Math.round(8600 * scaleFactor), Anterior: Math.round(7400 * scaleFactor) },
            { name: 'Fev', Entradas: Math.round(5100 * scaleFactor), Saidas: Math.round(4700 * scaleFactor), Corrente: Math.round(9800 * scaleFactor), Anterior: Math.round(8200 * scaleFactor) },
            { name: 'Mar', Entradas: Math.round(6200 * scaleFactor), Saidas: Math.round(5400 * scaleFactor), Corrente: Math.round(11600 * scaleFactor), Anterior: Math.round(9100 * scaleFactor) },
            { name: 'Abr', Entradas: Math.round(5800 * scaleFactor), Saidas: Math.round(5200 * scaleFactor), Corrente: Math.round(11000 * scaleFactor), Anterior: Math.round(8800 * scaleFactor) },
            { name: 'Mai', Entradas: Math.round(7100 * scaleFactor), Saidas: Math.round(6300 * scaleFactor), Corrente: Math.round(13400 * scaleFactor), Anterior: Math.round(10400 * scaleFactor) },
            { name: 'Jun', Entradas: Math.round(8400 * scaleFactor), Saidas: Math.round(7300 * scaleFactor), Corrente: Math.round(15700 * scaleFactor), Anterior: Math.round(11300 * scaleFactor) },
          ],
          infoTitle: 'Últimos Despachos de Correspondência Oficiais',
          csvHeader: ["ID de Trâmite", "Estado", "Remetente", "Destinatário", "Data de Emissão"]
        };
      case 'institutions':
        return {
          title: 'Dados Comparativos de Integração Institucional',
          metrics: [
            { id: 'in-1', label: 'Organismos Integrados', current: Math.round(284 * (1 + (scaleFactor - 1) * 0.1)), prev: Math.round(240 * (1 + (scaleFactor - 1) * 0.1)), text: 'Instituições conectadas', suffix: ' entidades', isTrendUp: true, pct: '+18.3%' },
            { id: 'in-2', label: 'Tráfego Total de API', current: Number((142.5 * scaleFactor).toFixed(1)), prev: Number((118.2 * scaleFactor).toFixed(1)), text: 'Chamadas ao barramento', suffix: 'M req', isTrendUp: true, pct: '+20.5%' },
            { id: 'in-3', label: 'Requisições Interdepartamento', current: Number((48.9 * scaleFactor).toFixed(1)), prev: Number((51.4 * scaleFactor).toFixed(1)), text: 'Troca mútua de arquivos', suffix: 'K un', isTrendUp: false, pct: '-4.8%' },
            { id: 'in-4', label: 'Tempo de Resposta Médio', current: 42, prev: 58, text: 'Velocidade de latência', suffix: ' ms', isTrendUp: false, pct: '-27.5%' },
          ],
          chart: [
            { name: 'Jan', Entradas: Math.round(120 * scaleFactor), Saidas: Math.round(85 * scaleFactor), Corrente: Math.round(205 * scaleFactor), Anterior: Math.round(170 * scaleFactor) },
            { name: 'Fev', Entradas: Math.round(140 * scaleFactor), Saidas: Math.round(90 * scaleFactor), Corrente: Math.round(230 * scaleFactor), Anterior: Math.round(180 * scaleFactor) },
            { name: 'Mar', Entradas: Math.round(180 * scaleFactor), Saidas: Math.round(110 * scaleFactor), Corrente: Math.round(290 * scaleFactor), Anterior: Math.round(210 * scaleFactor) },
            { name: 'Abr', Entradas: Math.round(195 * scaleFactor), Saidas: Math.round(120 * scaleFactor), Corrente: Math.round(315 * scaleFactor), Anterior: Math.round(240 * scaleFactor) },
            { name: 'Mai', Entradas: Math.round(240 * scaleFactor), Saidas: Math.round(145 * scaleFactor), Corrente: Math.round(385 * scaleFactor), Anterior: Math.round(285 * scaleFactor) },
            { name: 'Jun', Entradas: Math.round(284 * scaleFactor), Saidas: Math.round(170 * scaleFactor), Corrente: Math.round(454 * scaleFactor), Anterior: Math.round(320 * scaleFactor) },
          ],
          infoTitle: 'Sistemas Interligados ao Barramento Governamental',
          csvHeader: ["Organismo", "Tráfego API", "Status", "Serviço Fornecido", "Uptime"]
        };
      case 'citizens':
        return {
          title: 'Auditoria de Adesão e Cadastros de Cidadãos',
          metrics: [
            { id: 'ci-1', label: 'Fichas de Cidadão BI Digital', current: Number((185.2 * scaleFactor).toFixed(1)), prev: Number((140.5 * scaleFactor).toFixed(1)), text: 'Cadastros com biometria facial', suffix: 'K emissores', isTrendUp: true, pct: '+31.8%' },
            { id: 'ci-2', label: 'Autenticações por Chave de BI', current: 94.2, prev: 88.0, text: 'Acessos bem-sucedidos', suffix: '%', isTrendUp: true, pct: '+7.0%' },
            { id: 'ci-3', label: 'Acessos por Chave Mobile', current: Number((48.9 * scaleFactor).toFixed(1)), prev: Number((39.5 * scaleFactor).toFixed(1)), text: 'Autenticação sem cartão físico', suffix: 'K un', isTrendUp: true, pct: '+23.7%' },
            { id: 'ci-4', label: 'Novos Registros Diários', current: Math.round(1240 * scaleFactor), prev: Math.round(890 * scaleFactor), text: 'Adesões de hoje', suffix: ' cidadãos', isTrendUp: true, pct: '+39.3%' },
          ],
          chart: [
            { name: 'Jan', Entradas: Math.round(11000 * scaleFactor), Saidas: Math.round(8000 * scaleFactor), Corrente: Math.round(19000 * scaleFactor), Anterior: Math.round(15000 * scaleFactor) },
            { name: 'Fev', Entradas: Math.round(13500 * scaleFactor), Saidas: Math.round(9500 * scaleFactor), Corrente: Math.round(23000 * scaleFactor), Anterior: Math.round(18200 * scaleFactor) },
            { name: 'Mar', Entradas: Math.round(15000 * scaleFactor), Saidas: Math.round(11000 * scaleFactor), Corrente: Math.round(26000 * scaleFactor), Anterior: Math.round(21000 * scaleFactor) },
            { name: 'Abr', Entradas: Math.round(14200 * scaleFactor), Saidas: Math.round(9900 * scaleFactor), Corrente: Math.round(24100 * scaleFactor), Anterior: Math.round(19800 * scaleFactor) },
            { name: 'Mai', Entradas: Math.round(16800 * scaleFactor), Saidas: Math.round(12400 * scaleFactor), Corrente: Math.round(29200 * scaleFactor), Anterior: Math.round(22400 * scaleFactor) },
            { name: 'Jun', Entradas: Math.round(19500 * scaleFactor), Saidas: Math.round(14200 * scaleFactor), Corrente: Math.round(33700 * scaleFactor), Anterior: Math.round(25100 * scaleFactor) },
          ],
          infoTitle: 'Indicadores Demográficos e Distribuição Regional (Angola)',
          csvHeader: ["Província", "Cidadãos Autenticados", "Percentagem de Cobertura", "Novas Chaves Atuais"]
        };
      case 'workers':
        return {
          title: 'Produtividade e Auditoria de Operadores e Membros da Equipa',
          metrics: [
            { id: 'wo-1', label: 'Operadores Ativos', current: 18, prev: 15, text: 'No painel consular central', suffix: ' técnicos', isTrendUp: true, pct: '+20.0%' },
            { id: 'wo-2', label: 'Atendimentos Digitais Concluídos', current: Math.round(1420 * scaleFactor), prev: Math.round(1100 * scaleFactor), text: 'Homologações por operador', suffix: ' docs', isTrendUp: true, pct: '+29.0%' },
            { id: 'wo-3', label: 'Produtividade Média Operacional', current: 94.8, prev: 91.2, text: 'Taxa de resolubilidade diária', suffix: '%', isTrendUp: true, pct: '+3.9%' },
            { id: 'wo-4', label: 'Logins Consulares Ativos Agora', current: Math.round(12 * scaleFactor), prev: Math.round(8 * scaleFactor), text: 'Sessões simultâneas monitoradas', suffix: ' ativos', isTrendUp: true, pct: '+50.0%' },
          ],
          chart: [
            { name: 'Jan', Entradas: Math.round(80 * scaleFactor), Saidas: Math.round(65 * scaleFactor), Corrente: Math.round(145 * scaleFactor), Anterior: Math.round(120 * scaleFactor) },
            { name: 'Fev', Entradas: Math.round(95 * scaleFactor), Saidas: Math.round(70 * scaleFactor), Corrente: Math.round(165 * scaleFactor), Anterior: Math.round(130 * scaleFactor) },
            { name: 'Mar', Entradas: Math.round(110 * scaleFactor), Saidas: Math.round(85 * scaleFactor), Corrente: Math.round(195 * scaleFactor), Anterior: Math.round(140 * scaleFactor) },
            { name: 'Abr', Entradas: Math.round(105 * scaleFactor), Saidas: Math.round(80 * scaleFactor), Corrente: Math.round(185 * scaleFactor), Anterior: Math.round(135 * scaleFactor) },
            { name: 'Mai', Entradas: Math.round(125 * scaleFactor), Saidas: Math.round(95 * scaleFactor), Corrente: Math.round(220 * scaleFactor), Anterior: Math.round(160 * scaleFactor) },
            { name: 'Jun', Entradas: Math.round(142 * scaleFactor), Saidas: Math.round(110 * scaleFactor), Corrente: Math.round(252 * scaleFactor), Anterior: Math.round(185 * scaleFactor) },
          ],
          infoTitle: 'Desempenho Geral de Agentes de Identificação Humana',
          csvHeader: ["Agente Consular", "Homologações Realizadas", "Nível de Eficiência", "Último Acesso Registado"]
        };
      case 'ai_assist':
        return {
          title: 'Utilização do Assistente IA e Automação de Chancelaria',
          metrics: [
            { id: 'ai-1', label: 'Consultas de IA Atendidas', current: Math.round(12800 * scaleFactor), prev: Math.round(9400 * scaleFactor), text: 'Dúvidas dactiloscópicas e postais', suffix: ' chamados', isTrendUp: true, pct: '+36.1%' },
            { id: 'ai-2', label: 'Chancelaria Assistida Especial', current: 88.5, prev: 79.1, text: 'Pré-triagem documental automática', suffix: '%', isTrendUp: true, pct: '+11.8%' },
            { id: 'ai-3', label: 'Automações Completas Executadas', current: Math.round(4540 * scaleFactor), prev: Math.round(3100 * scaleFactor), text: 'Processos triados sem operador', suffix: ' un', isTrendUp: true, pct: '+46.4%' },
            { id: 'ai-4', label: 'Nível de Confiança IA', current: 99.1, prev: 98.4, text: 'Acurácia de detecção biométrica', suffix: '%', isTrendUp: true, pct: '+0.7%' },
          ],
          chart: [
            { name: 'Jan', Entradas: Math.round(2100 * scaleFactor), Saidas: Math.round(1800 * scaleFactor), Corrente: Math.round(3900 * scaleFactor), Anterior: Math.round(3200 * scaleFactor) },
            { name: 'Fev', Entradas: Math.round(2500 * scaleFactor), Saidas: Math.round(2100 * scaleFactor), Corrente: Math.round(4600 * scaleFactor), Anterior: Math.round(3500 * scaleFactor) },
            { name: 'Mar', Entradas: Math.round(3100 * scaleFactor), Saidas: Math.round(2605 * scaleFactor), Corrente: Math.round(5705 * scaleFactor), Anterior: Math.round(4100 * scaleFactor) },
            { name: 'Abr', Entradas: Math.round(2900 * scaleFactor), Saidas: Math.round(2300 * scaleFactor), Corrente: Math.round(5200 * scaleFactor), Anterior: Math.round(3900 * scaleFactor) },
            { name: 'Mai', Entradas: Math.round(3500 * scaleFactor), Saidas: Math.round(2980 * scaleFactor), Corrente: Math.round(6480 * scaleFactor), Anterior: Math.round(4900 * scaleFactor) },
            { name: 'Jun', Entradas: Math.round(4100 * scaleFactor), Saidas: Math.round(3450 * scaleFactor), Corrente: Math.round(7550 * scaleFactor), Anterior: Math.round(5400 * scaleFactor) },
          ],
          infoTitle: 'Decisões Autônomas Realizadas por IA',
          csvHeader: ["Módulo", "Automações Executadas", "Taxa de Deferimento", "Uso de Token Médio", "IP do Worker"]
        };
      case 'digital_docs':
        return {
          title: 'Controle de Emissões de Documentos Digitais e Chaves',
          metrics: [
            { id: 'do-1', label: 'Homologações de BI Digital', current: Math.round(12450 * scaleFactor), prev: Math.round(10100 * scaleFactor), text: 'Identidades digitais ativadas', suffix: ' un', isTrendUp: true, pct: '+23.2%' },
            { id: 'do-2', label: 'Assinaturas Criptográficas', current: Math.round(45230 * scaleFactor), prev: Math.round(38900 * scaleFactor), text: 'Verificações por hash forte', suffix: ' assinaturas', isTrendUp: true, pct: '+16.2%' },
            { id: 'do-3', label: 'Certidões Digitais Ativas', current: Math.round(6420 * scaleFactor), prev: Math.round(5800 * scaleFactor), text: 'Validades ativas no sistema', suffix: ' certidões', isTrendUp: true, pct: '+10.6%' },
            { id: 'do-4', label: 'Rejeição Documental Sistémica', current: 1.2, prev: 1.9, text: 'Fraudes e falhas detetadas', suffix: '%', isTrendUp: false, pct: '-36.8%' },
          ],
          chart: [
            { name: 'Jan', Entradas: Math.round(3100 * scaleFactor), Saidas: Math.round(2400 * scaleFactor), Corrente: Math.round(5500 * scaleFactor), Anterior: Math.round(4900 * scaleFactor) },
            { name: 'Fev', Entradas: Math.round(3400 * scaleFactor), Saidas: Math.round(2700 * scaleFactor), Corrente: Math.round(6100 * scaleFactor), Anterior: Math.round(5200 * scaleFactor) },
            { name: 'Mar', Entradas: Math.round(4300 * scaleFactor), Saidas: Math.round(3200 * scaleFactor), Corrente: Math.round(7500 * scaleFactor), Anterior: Math.round(5800 * scaleFactor) },
            { name: 'Abr', Entradas: Math.round(3900 * scaleFactor), Saidas: Math.round(3100 * scaleFactor), Corrente: Math.round(7000 * scaleFactor), Anterior: Math.round(5400 * scaleFactor) },
            { name: 'Mai', Entradas: Math.round(4600 * scaleFactor), Saidas: Math.round(3800 * scaleFactor), Corrente: Math.round(8400 * scaleFactor), Anterior: Math.round(6200 * scaleFactor) },
            { name: 'Jun', Entradas: Math.round(5200 * scaleFactor), Saidas: Math.round(4100 * scaleFactor), Corrente: Math.round(9300 * scaleFactor), Anterior: Math.round(7100 * scaleFactor) },
          ],
          infoTitle: 'Assinaturas Digitais e Transações HSM no Servidor',
          csvHeader: ["Documento ID", "Tipo de Documento", "Técnico Assinante", "Algoritmo de Hash", "Data de Validação"]
        };
      case 'audit_security':
      default:
        return {
          title: 'Monitorização e Auditoria de Segurança Crítica',
          metrics: [
            { id: 'au-1', label: 'Eventos de Segurança Críticos', current: 0, prev: 2, text: 'Alvos ou tentativas hostis', suffix: ' incidentes', isTrendUp: false, pct: '-100.0%' },
            { id: 'au-2', label: 'IPs em Quarentena Preventiva', current: Math.round(4 * scaleFactor), prev: Math.round(9 * scaleFactor), text: 'Bloqueados na gateway', suffix: ' hosts', isTrendUp: false, pct: '-55.5%' },
            { id: 'au-3', label: 'Verificações de Integridade', current: Math.round(12940 * scaleFactor), prev: Math.round(10450 * scaleFactor), text: 'Auditorias automáticas', suffix: ' checagens', isTrendUp: true, pct: '+23.8%' },
            { id: 'au-4', label: 'Modificações de Privilégio', current: Math.round(2 * scaleFactor), prev: Math.round(5 * scaleFactor), text: 'Alterações de nível de acesso', suffix: ' logs', isTrendUp: false, pct: '-60.0%' },
          ],
          chart: [
            { name: 'Jan', Entradas: Math.round(1200 * scaleFactor), Saidas: Math.round(900 * scaleFactor), Corrente: Math.round(2100 * scaleFactor), Anterior: Math.round(1950 * scaleFactor) },
            { name: 'Fev', Entradas: Math.round(1400 * scaleFactor), Saidas: Math.round(1100 * scaleFactor), Corrente: Math.round(2500 * scaleFactor), Anterior: Math.round(2100 * scaleFactor) },
            { name: 'Mar', Entradas: Math.round(1750 * scaleFactor), Saidas: Math.round(1300 * scaleFactor), Corrente: Math.round(3050 * scaleFactor), Anterior: Math.round(2400 * scaleFactor) },
            { name: 'Abr', Entradas: Math.round(1600 * scaleFactor), Saidas: Math.round(1200 * scaleFactor), Corrente: Math.round(2800 * scaleFactor), Anterior: Math.round(2200 * scaleFactor) },
            { name: 'Mai', Entradas: Math.round(1900 * scaleFactor), Saidas: Math.round(1500 * scaleFactor), Corrente: Math.round(3400 * scaleFactor), Anterior: Math.round(2600 * scaleFactor) },
            { name: 'Jun', Entradas: Math.round(2200 * scaleFactor), Saidas: Math.round(1750 * scaleFactor), Corrente: Math.round(3950 * scaleFactor), Anterior: Math.round(3050 * scaleFactor) },
          ],
          infoTitle: 'Últimos Logs de Segurança e Quarentena',
          csvHeader: ["ID Alerta", "Ação Auditada", "Operador Responsável", "Data e Hora do Registo", "Gravidade"]
        };
    }
  }, [activeTab, scaleFactor, dadosReais]);

  // Handle formatted CSV exporting
  const executeExporter = (format: 'CSV' | 'Excel') => {
    // Play sound callback
    playInteractionSound('success');
    
    // Setup message
    setToastMessage(`Exportação (${format}) concluída com sucesso para o relatório de ${kpiData.title}!`);
    setShowToast(true);
    
    // Download dynamic formatted CSV data
    try {
      const csvContentRows = [
        ["==== CDAS - RELATORIO ESTRATEGICO OFICIAL ===="],
        ["Emitido por", "Conselho Digital de Angola (CDA)"],
        ["Filtro de Data", `${customStartDate} ate ${customEndDate}`],
        ["Preset de Comparacao", comparisonPreset === 'month' ? "Mesa Corrente vs Anterior" : "Ultimos 30 dias vs Anterior"],
        [],
        kpiData.csvHeader,
      ];

      // Dynamic subrows according to chosen tab
      if (dadosReais && activeTab === 'correspondences') {
        dadosReais.mensagens.slice(0, 500).forEach(m => {
          csvContentRows.push([m.id, m.status || '—', m.org || '—', m.subject || (m.preview || '').slice(0, 60), fmtDataCurta(m.created_at)]);
        });
      } else if (activeTab === 'correspondences') {
        resolvedCorrespondences.forEach(c => {
          csvContentRows.push([c.id, c.status, c.sender, c.recipient, c.date]);
        });
      } else if (activeTab === 'audit_security') {
        resolvedAuditLogs.forEach(l => {
          csvContentRows.push([l.id, l.action, l.user, (l.timestamp && l.timestamp.includes('T')) ? fmtDataCurta(l.timestamp) : l.timestamp, l.type]);
        });
      } else if (dadosReais && activeTab === 'citizens') {
        dadosReais.cidadaos.forEach(c => csvContentRows.push([c.name || '—', c.bi, c.phone || '—', c.morada || '—']));
      } else if (dadosReais && activeTab === 'workers') {
        dadosReais.profiles.filter(pp => pp.bi !== 'CDA' && (pp.role === 'admin' || _ehAgenteCodificado(pp.bi))).forEach(w => {
          const ultimo = dadosReais.auditLogs.find(a => a.user === w.name);
          csvContentRows.push([w.name || '—', w.bi, w.role === 'admin' ? 'Administração' : 'Agente/Colaborador', ultimo ? fmtDataCurta(ultimo.timestamp) : '—']);
        });
      } else if (dadosReais && activeTab === 'ai_assist') {
        dadosReais.iaLogs.forEach(l => csvContentRows.push([l.papel || '—', l.sigla || '—', l.canal || '—', l.resposta_ok ? 'OK' : 'Falha', l.lat_ms != null ? String(Math.round(l.lat_ms)) : '—', fmtDataCurta(l.created_at)]));
      } else if (dadosReais && activeTab === 'digital_docs') {
        dadosReais.documentos.forEach(dc => csvContentRows.push([dc.name || '—', dc.holder_bi || '—', dc.status || 'emitido', fmtDataCurta(dc.issued_at)]));
      } else if (dadosReais && activeTab === 'institutions') {
        dadosReais.instituicoes.forEach(i => csvContentRows.push([i.name || i.bi, i.bi, i.email || '—', i.phone || '—']));
      } else if (activeTab === 'citizens') {
        csvContentRows.push(["PRV-LU", "Luanda", "88.2%", "52.400"]);
        csvContentRows.push(["PRV-BE", "Benguela", "74.1%", "28.100"]);
        csvContentRows.push(["PRV-HU", "Huambo", "69.5%", "24.900"]);
        csvContentRows.push(["PRV-HI", "Huíla", "62.4%", "18.300"]);
      } else if (activeTab === 'workers') {
        csvContentRows.push(["CDA-0001", "Edlasio Galhardo", "182 homologações", "Excelente", "Hoje, 10:22"]);
        csvContentRows.push(["CDA-0050", "Karina Neto", "94 homologações", "Altamente Eficaz", "Hoje, 08:30"]);
        csvContentRows.push(["CDA-0022", "Sílvia Viana", "45 homologações", "Conforme", "Ontem, 15:44"]);
      } else if (activeTab === 'ai_assist') {
        csvContentRows.push(["MOD-01", "Triagem de Correspondências", "910 automações", "88%", "197.231.42.15"]);
        csvContentRows.push(["MOD-02", "Dactiloscopia de BI Digital", "1853 automações", "99.1%", "197.231.40.89"]);
        csvContentRows.push(["MOD-03", "Certificados de Validade Consular", "420 automações", "100%", "197.231.42.22"]);
      } else if (activeTab === 'digital_docs') {
        csvContentRows.push(["DOC-101", "Bilhete de Identidade Digital", "Carlos Lourenço", "SHA-256 / RSA-2048", "12/06/2026"]);
        csvContentRows.push(["DOC-102", "Certidão de Casamento Chancelada", "Paula Mendes", "SHA-256", "11/06/2026"]);
        csvContentRows.push(["DOC-103", "Atestado de Residência Consular", "Mateus Manuel", "SHA-512 / Elliptic Curve", "11/06/2026"]);
      } else {
        csvContentRows.push(["AGT - Receita Tributária", "1.420.000 chamadas", "Online", "Validações Fiscais", "99.98%"]);
        csvContentRows.push(["SME - Serviço de Estrangeiros", "942.000 chamadas", "Online", "Emissão Passaporte", "99.95%"]);
        csvContentRows.push(["MINJUS - Registo Predial", "150.000 chamadas", "Online", "Validação Notarial", "99.90%"]);
      }

      // Encode CSV
      const formattedCsv = "data:text/csv;charset=utf-8,\uFEFF" + csvContentRows.map(e => e.map(cell => `"${cell}"`).join(";")).join("\n");
      const encodedUri = encodeURI(formattedCsv);
      const outputAnchor = document.createElement("a");
      outputAnchor.setAttribute("href", encodedUri);
      outputAnchor.setAttribute("download", `CDA_Relatorio_${activeTab}_2026.csv`);
      document.body.appendChild(outputAnchor);
      outputAnchor.click();
      document.body.removeChild(outputAnchor);
    } catch (e) {
      console.warn("Failed link simulation: ", e);
    }

    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  // Printable template compiler
  const handleTriggerPrint = () => {
    playInteractionSound('success');
    window.print();
  };

  return (
    <div className="pb-24 text-left animate-fadeIn space-y-6 w-full max-w-none mx-auto px-1 sm:px-2">

      {/* FASE 3 — RELATÓRIO EXECUTIVO AUTOMÁTICO: métricas REAIS agregadas dos
          dados recebidos (correspondences + auditLogs) com exportação CSV. */}
      {(() => {
        const totalCorr = correspondences.length;
        const totalLogs = auditLogs.length;
        const criticos = auditLogs.filter(l => l.type === 'critical').length;
        const warnings = auditLogs.filter(l => l.type === 'warning').length;
        const sucessos = auditLogs.filter(l => l.type === 'success').length;
        const exportarResumo = () => {
          const linhas = [
            ['Métrica', 'Valor'],
            ['Total de correspondências', totalCorr],
            ['Total de logs de auditoria', totalLogs],
            ['Logs críticos', criticos],
            ['Logs de aviso', warnings],
            ['Logs de sucesso', sucessos],
            ['Gerado em', new Date().toLocaleString('pt-AO')],
          ];
          const csv = linhas.map(l => l.join(';')).join('\n');
          const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `CDA_Resumo_Executivo_${new Date().toISOString().slice(0,10)}.csv`;
          a.click();
          URL.revokeObjectURL(a.href);
          setToastMessage('Relatório executivo automático exportado (CSV)!');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        };
        if (totalCorr === 0 && totalLogs === 0) return null;
        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm animate-fadeIn print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">Resumo Executivo Automático</h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Métricas reais da base — atualizado a cada abertura da página</p>
              </div>
              <button type="button" onClick={exportarResumo} className="px-4 py-2 bg-[#0E2B64] hover:bg-[#081a3d] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer border-none">
                Exportar Resumo (CSV)
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-[#0E2B64]">{totalCorr}</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">Correspondências</div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-[#0E2B64]">{totalLogs}</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">Logs de auditoria</div>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-rose-600">{criticos}</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-rose-500 mt-1">Críticos</div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-amber-600">{warnings}</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-amber-500 mt-1">Avisos</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Dynamic Floating Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            id="report-notification-toast"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-[999999] bg-[#00A859] text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-sans font-bold text-xs uppercase tracking-wider border border-[#00C267] print:hidden"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
              <Check size={14} className="stroke-[3]" />
            </div>
            <div>
              <p className="m-0 leading-tight">Sucesso Operacional</p>
              <p className="text-[10px] text-emerald-100 font-semibold m-0 mt-0.5">{toastMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* top general filters / Control Dashboard Panel */}
      <div id="reporting-central-header" className="bg-white border-2 border-slate-200 text-slate-800 rounded-[24px] p-6 shadow-sm relative overflow-hidden transition-all duration-300 cda-rel-header">
        {/* Background abstract decoration elements */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-slate-50/60 rounded-full blur-3xl -z-1" />
        <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-emerald-50/20 rounded-full blur-3xl -z-1" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0E2B64] border border-[#0E2B64] rounded-full text-[10px] font-sans tracking-wider uppercase font-black text-white">
                <Globe size={11} className="text-white animate-pulse" />
                Conselho Digital de Angola
              </span>
            </div>
            <h1 className="text-2xl md:text-3.5xl font-black text-[#0c2340] tracking-tight m-0 font-sans mt-2">
              Centro de Análise Estratégica e Relatórios
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-semibold leading-relaxed max-w-3xl m-0">
              Produção executiva de inteligência e auditorias consulares para fiscalização de identidade dactiloscópica civil, trâmites de correios governamentais e fluxos operacionais consolidados de Angola.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center shrink-0 print:hidden">
            {/* Produced Executive Memory descritiva */}
            <button
              id="btn-produce-executive-report"
              onClick={() => {
                playInteractionSound('success');
                setIsExecutiveModalOpen(true);
                setToastMessage("Memória Descritiva aberta para edição!");
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000);
              }}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#00A859] hover:bg-[#00c267] text-white rounded-[16px] text-xs font-black uppercase tracking-wider transition-all duration-200 hover:shadow-lg active:scale-95 cursor-pointer border-0 shadow-sm"
            >
              <FileCheck size={16} className="stroke-[2.5]" />
              <span>Memória Descritiva</span>
            </button>
            
            {/* Custom Print Button */}
            <button
              id="btn-direct-print"
              onClick={() => {
                setToastMessage("Preparando documento para impressão...");
                setShowToast(true);
                setTimeout(() => {
                  setShowToast(false);
                  handleTriggerPrint();
                }, 1000);
              }}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#0E2B64] hover:bg-[#0C2454] text-white rounded-[16px] text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm active:scale-95 border-0"
            >
              <Printer size={16} />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Separator line */}
        <div className="h-[1px] bg-slate-200/80 my-5 print:hidden" />

        {/* Dynamic configurations line (Comparison Selector, Date Presets) */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between font-sans print:hidden">
          
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600">
            {/* Compare switch pill */}
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-[16px] p-1 shadow-sm cda-rel-seg">
              <button 
                onClick={() => { playInteractionSound('click'); setComparePeriod(true); }}
                className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-0 cursor-pointer ${comparePeriod ? 'bg-[#0E2B64] text-white shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Comparação Ativa
              </button>
              <button 
                onClick={() => { playInteractionSound('click'); setComparePeriod(false); }}
                className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-0 cursor-pointer ${!comparePeriod ? 'bg-[#0E2B64] text-white shadow-sm' : 'bg-transparent text-slate-500 hover:text-[#0E2B64]'}`}
              >
                Evolução Absoluta
              </button>
            </div>

            {/* Comparison Scope Presets */}
            {comparePeriod && (
              <div className="flex items-center gap-2 bg-white border border-slate-300 p-2 rounded-xl shadow-2xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1">Escopo:</span>
                <select
                  value={comparisonPreset}
                  onChange={(e) => { 
                    playInteractionSound('click'); 
                    setComparisonPreset(e.target.value as 'month' | '30days');
                    setToastMessage(`Escopo de período alterado para: ${e.target.value === 'month' ? 'Mês Corrente' : 'Últimos 30 Dias'}`);
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 2500);
                  }}
                  className="bg-transparent border-0 text-slate-800 font-extrabold text-[10px] uppercase tracking-wider outline-none cursor-pointer focus:ring-0 pr-6"
                >
                  <option value="month" className="text-slate-800 bg-white">Mês Corrente vs Mês Anterior</option>
                  <option value="30days" className="text-slate-800 bg-white">Últimos 30 Dias vs Meses Passados</option>
                </select>
              </div>
            )}
          </div>

          {/* Calendar Picker Custom Panel */}
          <div className="flex items-center gap-2.5 self-end md:self-auto">
            <span className="text-[10px] text-slate-500 font-mono tracking-widest font-black uppercase hidden sm:inline">Intervalo Customizado:</span>
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-2 text-[11px] text-slate-800 font-mono font-bold shadow-2xs">
              <input 
                type="date" 
                value={customStartDate} 
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  playInteractionSound('click');
                  setToastMessage("Data inicial alterada com sucesso!");
                  setShowToast(true);
                  setTimeout(() => setShowToast(false), 2000);
                }}
                className="bg-transparent border-0 outline-none text-slate-800 focus:ring-0 w-32 text-center cursor-pointer text-xs font-mono font-bold"
              />
              <span className="text-slate-400 font-sans font-bold">até</span>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  playInteractionSound('click');
                  setToastMessage("Data final alterada com sucesso!");
                  setShowToast(true);
                  setTimeout(() => setShowToast(false), 2000);
                }}
                className="bg-transparent border-0 outline-none text-slate-800 focus:ring-0 w-32 text-center cursor-pointer text-xs font-mono font-bold"
              />
              <Calendar size={13} className="text-slate-500 ml-1.5 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Structural Layout: Left sidebar (7 Tabs) and Right panels (Metrics, Charts, Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start font-sans">
        
        {/* Navigation Sidebar Drawer Panel */}
        <div id="side-reports-navigation" className="lg:col-span-1 bg-white border border-slate-200 rounded-[24px] p-4.5 shadow-3xs space-y-4 print:hidden cda-rel-nav">
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block font-sans">Menu de Relatórios</span>
            <span className="text-[9px] px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold rounded-md uppercase font-mono tracking-wider">
              {reportTabs.length} Seções
            </span>
          </div>

          <nav className="space-y-1.5">
            {reportTabs.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`btn-tab-report-${tab.id}`}
                  onClick={() => {
                    playInteractionSound('click');
                    setActiveTab(tab.id);
                  }}
                  className={`w-full text-left p-3.5 rounded-[18px] transition-all duration-150 flex items-start gap-3 cursor-pointer border outline-none ${
                    isSelected 
                      ? 'bg-[#0E2B64] border-[#0E2B64] text-white shadow-3xs font-black' 
                      : 'bg-white border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  <div className={`mt-0.5 p-2 rounded-xl shrink-0 transition-colors ${
                    isSelected ? 'bg-white/15 text-white border border-white/20' : 'bg-[#0E2B64] border border-[#0E2B64] text-white'
                  }`}>
                    {tab.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-[12px] block tracking-tight ${isSelected ? 'font-black text-white' : 'font-bold text-slate-700'}`}>
                      {tab.label}
                    </span>
                    <span className={`text-[10px] font-medium block mt-0.5 leading-snug truncate ${isSelected ? 'text-slate-200' : 'text-slate-400'}`}>
                      {tab.desc}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white self-center animate-pulse shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="p-3.5 bg-[#0E2B64] rounded-2xl border border-[#0E2B64] text-left space-y-2">
            <div className="flex items-center gap-1.5 text-white font-black text-[9px] uppercase tracking-wider">
              <Activity size={12} className="stroke-[3] text-white" />
              Sincronização Ativa
            </div>
            <p className="text-[10px] text-slate-100 font-bold leading-normal m-0 select-none">
              Os dados deste módulo de análise estratégica refletem as tabelas unificadas do Correio Digital Angola em ambiente de produção controlada.
            </p>
          </div>
        </div>

        {/* Content Panel Area (Adaptive Report and Graphs) */}
        <div className="lg:col-span-4 print:col-span-5 space-y-6">
          
          <AnimatePresence mode="wait">
            {isLoading ? (
              /* High interactive rendering spinner loader */
              <motion.div 
                id="interactive-heavy-calculation-loader"
                key="loading-box"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="bg-white border border-slate-200/80 rounded-[24px] p-24 text-center min-h-[500px] flex flex-col justify-center items-center font-sans space-y-4 cda-rel-loading"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-indigo-100 animate-pulse" />
                  <Loader2 size={36} className="text-indigo-600 animate-spin absolute top-3.5 left-3.5" />
                </div>
                <div className="space-y-1">
                  <span className="font-mono text-[9px] font-black tracking-[0.2em] uppercase text-indigo-500 block">Sincronizando tabelas do Estado</span>
                  <p className="text-sm font-black text-slate-800 m-0 leading-normal animate-pulse">
                    Gerando Relatório Consolidado...
                  </p>
                  <p className="text-xs text-slate-400 font-bold m-0 max-w-xs mx-auto">
                    A consultar as tabelas reais da base central do Correio Digital de Angola.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Upper Metrics Grid: 4 Top KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {kpiData.metrics.map((m) => {

                    return (
                      <div 
                        key={m.id}
                        className="bg-white border border-slate-200 rounded-[22px] p-4 shadow-3xs bg-gradient-to-br from-white to-slate-50/20 relative overflow-hidden group hover:border-slate-300 transition-all flex flex-col justify-between cda-rel-kpi"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block font-sans truncate pr-1">
                            {m.label}
                          </span>
                          
                          {/* Trend indicator */}
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black ${
                            m.isTrendUp 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {m.isTrendUp ? <ArrowUpRight size={10} className="stroke-[3]" /> : <ArrowDownRight size={10} className="stroke-[3]" />}
                            {m.pct}
                          </span>
                        </div>

                        <div className="mt-2.5">
                          {/* Main Quantitative Big Number styled with Mono space */}
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl md:text-3xl font-black text-slate-900 font-mono tracking-tight">
                              <AnimatedCounter to={m.current} />
                            </span>
                            <span className="text-[10px] font-extrabold text-slate-500 uppercase font-sans">
                              {m.suffix}
                            </span>
                          </div>
                          
                          {/* Description metadata */}
                          <p className="text-[10px] text-slate-500 font-bold m-0 mt-1 truncate">
                            {m.text}
                          </p>
                        </div>

                        {comparePeriod && (
                          <div className="mt-2 border-t border-slate-100/80 pt-2 flex items-center justify-between text-[9px] text-slate-400 font-semibold font-mono">
                            <span>Período Prev:</span>
                            <span className="font-extrabold text-slate-600">{m.prev.toLocaleString('pt-AO')}{m.suffix}</span>
                          </div>
                        )}
                        
                        {/* Background border accent on hover */}
                        <div className="absolute bottom-0 left-0 h-1 bg-indigo-600 w-0 group-hover:w-full transition-all duration-300 pointer-events-none" />
                      </div>
                    );
                  })}
                </div>

                {/* Combined Recharts Visual Trends Card */}
                <div id="recharts-visuals-panel" className="bg-white border border-slate-200/80 rounded-[24px] p-5 shadow-xs cda-rel-charts">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={16} className="text-indigo-600" />
                        <h3 className="font-sans font-black text-xs sm:text-sm text-slate-900 uppercase tracking-tight m-0">
                          Curva de Tendência Mensal Consolidação 2026
                        </h3>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold block">
                        Filtro atual: {comparePeriod ? 'Modo de Comparação Dupla On' : 'Modo de Exposição em Termos de Valores Absolutos'}
                      </span>
                    </div>

                    {/* Quick export actions buttons with micro-animations */}
                    <div className="flex items-center gap-2 select-none font-sans">
                      <button
                        onClick={() => executeExporter('CSV')}
                        className="h-9.5 px-4 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-150 flex items-center gap-1.5 border border-slate-300 hover:shadow-xs active:scale-95 cursor-pointer"
                        title="Descarregar ficheiro de valores separados por vírgula"
                      >
                        <Download size={13} />
                        <span>Exportar CSV</span>
                      </button>

                      <button
                        onClick={() => executeExporter('Excel')}
                        className="h-9.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-150 flex items-center gap-1.5 border-0 hover:shadow-lg active:scale-95 cursor-pointer"
                        title="Descarregar ficheiro Microsoft Excel formatado"
                      >
                        <FileText size={13} />
                        <span>Gera Excel</span>
                      </button>
                    </div>
                  </div>

                  {/* Combined Chart wrapper (ComposedChart handles Area + Bar + Line) */}
                  <div className="h-[300px] sm:h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart 
                        data={kpiData.chart}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        barGap={6}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--cda-chart-grid, #f1f5f9)" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: '1px solid var(--cda-chart-tooltip-border, #e1e8f0)', background: 'var(--cda-chart-tooltip-bg, #ffffff)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', fontFamily: 'Inter', color: 'var(--cda-chart-tooltip-text, inherit)' }}
                          labelClassName="font-black cda-chart-tooltip-label"
                        />
                        <Legend wrapperStyle={{ fontSize: 11, fontWeight: 'bold', paddingTop: 10 }} />
                        
                        {/* Shaded Area for General background trend curve */}
                        <Area 
                          type="monotone" 
                          dataKey="Anterior" 
                          fill="#e0e7ff" 
                          stroke="rgba(99, 102, 241, 0.2)" 
                          name="Anterior / Linha de Referência" 
                          fillOpacity={0.4}
                        />

                        {/* Current metrics represented in primary Green Gov fill */}
                        <Bar 
                          dataKey="Entradas" 
                          fill="#00A859" 
                          radius={[6, 6, 0, 0]} 
                          name="Fluxo Mensal (Deferido/Entradas)"
                          maxBarSize={28}
                        />

                        {/* Excluded/Secondary or previous values representing in red bars or contrast lines */}
                        {comparePeriod ? (
                          <Line 
                            type="monotone" 
                            dataKey="Corrente" 
                            stroke="#4f46e5" 
                            strokeWidth={3} 
                            name="Tendência Acumulada no Período" 
                            dot={{ r: 4, strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                          />
                        ) : (
                          <Bar 
                            dataKey="Saidas" 
                            fill="#ef4444" 
                            radius={[6, 6, 0, 0]} 
                            name="Fluxo de Incidentes/Saídas"
                            maxBarSize={28}
                          />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Columns Lists & Audit Table Log Section */}
                <div className="bg-white border border-slate-200/80 rounded-[24px] p-5 shadow-xs cda-rel-table">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <div className="flex items-center gap-2">
                      <History size={16} className="text-[#0c2340]" />
                      <h3 className="font-sans font-black text-xs sm:text-sm text-slate-800 uppercase tracking-tight m-0 cda-rel-table-title">
                        {kpiData.infoTitle}
                      </h3>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">Consola de Produção</span>
                  </div>

                  <div className="overflow-y-auto overflow-x-auto max-h-[610px] min-h-[220px] custom-scrollbar border border-slate-100 rounded-xl">
                    <table className="mobile-data-table w-full text-left font-sans text-xs border-collapse">
                      <thead className="sticky top-0 bg-[#0E2B64] z-10 shadow-3xs">
                        <tr className="bg-[#0E2B64] text-white uppercase text-[10px] font-black tracking-widest border-b border-[#0E2B64]">
                          {kpiData.csvHeader.map((h, i) => (
                            <th key={i} className="py-3.5 px-4 first:rounded-l-xl last:rounded-r-xl">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[#334155] cda-rel-tbody">
                        {activeTab === 'correspondences' ? (
                          resolvedCorrespondences.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-indigo-600">{c.id}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider shrink-0 select-none ${
                                  c.status === 'Enviada' 
                                    ? 'bg-blue-50 border-blue-100 text-blue-700' 
                                    : c.status === 'Recebida'
                                    ? 'bg-amber-50 border-amber-100 text-amber-700'
                                    : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                }`}>
                                  {c.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-semibold">{c.sender}</td>
                              <td className="py-3 px-4 font-medium text-slate-500">{c.recipient}</td>
                              <td className="py-3 px-4 font-mono text-[10px] font-bold text-slate-400">{c.date}</td>
                            </tr>
                          ))
                        ) : activeTab === 'audit_security' ? (
                          resolvedAuditLogs.map((l) => (
                            <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-rose-600">{l.id}</td>
                              <td className="py-3 px-4 font-semibold max-w-xs truncate" title={l.action}>{l.action}</td>
                              <td className="py-3 px-4 font-medium text-slate-600">{l.user}</td>
                              <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{(l.timestamp && l.timestamp.includes('T')) ? fmtDataCurta(l.timestamp) : l.timestamp}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                  l.type === 'critical'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : l.type === 'warning'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : l.type === 'success'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {l.type}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : activeTab === 'citizens' ? (
                          dadosReais && dadosReais.cidadaos.length > 0 ? (
                            dadosReais.cidadaos.slice(0, 60).map((c) => (
                              <tr key={c.bi} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4 font-semibold">{c.name || '—'}</td>
                                <td className="py-3 px-4 font-mono font-bold text-indigo-600">{c.bi}</td>
                                <td className="py-3 px-4 font-mono text-[10px] text-slate-500">{c.phone || '—'}</td>
                                <td className="py-3 px-4 text-[10px] text-slate-500 font-semibold">{c.morada || '—'}</td>
                              </tr>
                            ))
                          ) : dadosReais ? (
                            <tr><td colSpan={4} className="py-8 px-4 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">Nenhum cidadão registado na base central.</td></tr>
                          ) : (
                          <>
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-semibold">Luanda</td>
                              <td className="py-3 px-4 font-mono font-bold">52.400 cidadãos</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden block">
                                    <div className="bg-[#00A859] h-full" style={{ width: '88%' }} />
                                  </div>
                                  <span className="font-mono text-[10px] font-bold">88.2%</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-mono text-[10px] text-slate-400">12.420 h/dia</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-semibold">Benguela</td>
                              <td className="py-3 px-4 font-mono font-bold">28.100 cidadãos</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden block">
                                    <div className="bg-[#00A859] h-full" style={{ width: '74%' }} />
                                  </div>
                                  <span className="font-mono text-[10px] font-bold">74.1%</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-mono text-[10px] text-slate-400">4.120 h/dia</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-semibold">Huambo</td>
                              <td className="py-3 px-4 font-mono font-bold">24.900 cidadãos</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden block">
                                    <div className="bg-[#00A859] h-full" style={{ width: '69%' }} />
                                  </div>
                                  <span className="font-mono text-[10px] font-bold">69.5%</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-mono text-[10px] text-slate-400">3.910 h/dia</td>
                            </tr>
                          </>
                          )
                        ) : activeTab === 'workers' ? (
                          dadosReais && dadosReais.profiles.filter(pp => pp.bi !== 'CDA' && (pp.role === 'admin' || _ehAgenteCodificado(pp.bi))).length > 0 ? (
                            dadosReais.profiles
                              .filter(pp => pp.bi !== 'CDA' && (pp.role === 'admin' || _ehAgenteCodificado(pp.bi)))
                              .slice(0, 60)
                              .map((w) => (
                              <tr key={w.bi} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4 font-semibold">{w.name || '—'}</td>
                                <td className="py-3 px-4 font-mono font-bold text-indigo-600">{w.bi}</td>
                                <td className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-slate-500">{w.role === 'admin' ? 'Administração' : 'Agente/Colaborador'}</td>
                                <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                                  {(() => { const l = dadosReais.auditLogs.find(a => a.user === w.name); return l ? fmtDataCurta(l.timestamp) : '—'; })()}
                                </td>
                              </tr>
                              ))
                          ) : dadosReais ? (
                            <tr><td colSpan={4} className="py-8 px-4 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">Nenhum membro da equipa registado na base central.</td></tr>
                          ) : (
                          <>
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-semibold">Edlasio Galhardo (Operador Geral)</td>
                              <td className="py-3 px-4 font-mono">182 atendimentos</td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-extrabold font-sans">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                                  Excelente (99.2%)
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-[10px] text-slate-400">Hoje, 10:22 ao Admin terminal</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-semibold">Karina Neto (Suporte Cripto)</td>
                              <td className="py-3 px-4 font-mono">94 chaves geradas</td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center gap-1 text-[10px] text-blue-800 font-extrabold font-sans">
                                  Altamente Eficaz
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-[10px] text-slate-400">Hoje, 08:30 no HSM central</td>
                            </tr>
                          </>
                          )
                        ) : activeTab === 'ai_assist' ? (
                          dadosReais && (dadosReais.iaLogs.length > 0 || dadosReais.iaTelemetria.length > 0) ? (

                            (dadosReais.iaLogs.length > 0 ? dadosReais.iaLogs : dadosReais.iaTelemetria.map((t, i) => ({ id: `tel-${i}`, papel: '—', sigla: t.sigla, canal: t.canal, resposta_ok: (t.ok || 0) >= (t.total || 1), lat_ms: t.lat_media_ms, created_at: t.dia } as any))).slice(0, 60).map((l) => (
                              <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4 font-semibold">{l.papel || '—'}</td>
                                <td className="py-3 px-4 font-mono font-bold text-indigo-600">{l.sigla || '—'}</td>
                                <td className="py-3 px-4 text-[10px] font-bold uppercase text-slate-500">{l.canal || '—'}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${l.resposta_ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                    {l.resposta_ok ? 'OK' : 'Falha'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-mono text-[10px] text-slate-500">{l.lat_ms != null ? `${Math.round(l.lat_ms)} ms` : '—'}</td>
                                <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{fmtDataCurta(l.created_at)}</td>
                              </tr>
                            ))
                          ) : dadosReais ? (
                            <tr><td colSpan={6} className="py-8 px-4 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">Sem interações IA registadas na base central.</td></tr>
                          ) : (
                          <>
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-semibold">Triagem de Correspondências dactiloscópicas</td>
                              <td className="py-3 px-4 font-mono font-bold text-emerald-600">910 decisões/dia</td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-650">88% deferido auto</td>
                              <td className="py-3 px-4 font-mono text-[11px] text-indigo-600">0.023 seg/média</td>
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-400">197.231.42.15</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-semibold">Comparações Faciais de Identidade Digital</td>
                              <td className="py-3 px-4 font-mono font-bold text-emerald-600">1.853 decisões/dia</td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-650">99.1% precisão</td>
                              <td className="py-3 px-4 font-mono text-[11px] text-indigo-600">0.051 seg/média</td>
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-400">197.231.40.89</td>
                            </tr>
                          </>
                          )
                        ) : activeTab === 'digital_docs' ? (
                          dadosReais && dadosReais.documentos.length > 0 ? (
                            dadosReais.documentos.slice(0, 60).map((dc) => (
                              <tr key={dc.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4 font-mono font-bold text-[#0c2340]">{dc.name || '—'}</td>
                                <td className="py-3 px-4 font-medium text-slate-500">{dc.holder_bi || '—'}</td>
                                <td className="py-3 px-4 font-semibold">
                                  <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-200">
                                    {(dc.status || 'emitido').slice(0, 14)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-400">{fmtDataCurta(dc.issued_at)}</td>
                              </tr>
                            ))
                          ) : dadosReais ? (
                            <tr><td colSpan={4} className="py-8 px-4 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">Nenhum documento emitido na base central.</td></tr>
                          ) : (
                          <>
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-[#0c2340]">BI-D-129402</td>
                              <td className="py-3 px-4 font-medium text-slate-650">Bilhete de Identidade Digital</td>
                              <td className="py-3 px-4 font-semibold">Carlos Lourenço</td>
                              <td className="py-3 px-4 font-mono text-[10px] font-bold text-slate-500">SHA-256 / RSA-2048</td>
                              <td className="py-3 px-4 font-mono text-slate-400">12/06/2026</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-[#0c2340]">CER-D-842</td>
                              <td className="py-3 px-4 font-medium text-slate-650">Certidão de Casamento Chancelada</td>
                              <td className="py-3 px-4 font-semibold">Paula Mendes</td>
                              <td className="py-3 px-4 font-mono text-[10px] font-bold text-slate-500">SHA-256 (MINDIS HSM)</td>
                              <td className="py-3 px-4 font-mono text-slate-400">11/06/2026</td>
                            </tr>
                          </>
                          )
                        ) : dadosReais && dadosReais.instituicoes.length > 0 ? (
                            dadosReais.instituicoes.slice(0, 60).map((inst) => (
                              <tr key={inst.bi} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4 font-semibold text-slate-900">{inst.name || inst.bi}</td>
                                <td className="py-3 px-4 font-mono font-bold text-indigo-600">{inst.bi}</td>
                                <td className="py-3 px-4 font-mono text-[10px] text-slate-500">{inst.email || '—'}</td>
                                <td className="py-3 px-4 font-mono text-[10px] text-slate-500">{inst.phone || '—'}</td>
                              </tr>
                            ))
                          ) : dadosReais ? (
                            <tr><td colSpan={4} className="py-8 px-4 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">Nenhuma instituição registada na base central.</td></tr>
                          ) : (
                          <>
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-semibold text-slate-900">AGT - Administração Geral Tributária</td>
                              <td className="py-3 px-4 font-mono">1.420.000 reqs/dia</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase rounded border border-emerald-100">ONLINE</span>
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-600">Validações fiscais integradas</td>
                              <td className="py-3 px-4 font-mono text-[10px] font-bold text-slate-400">99.98%</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-semibold text-slate-900">SME - Serviço de Migração e Estrangeiros</td>
                              <td className="py-3 px-4 font-mono">942.000 reqs/dia</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase rounded border border-emerald-100">ONLINE</span>
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-600">Emissão de passaportes eletrônicos</td>
                              <td className="py-3 px-4 font-mono text-[10px] font-bold text-slate-400">99.95%</td>
                            </tr>
                          </>
                          )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Floating Modal for Executive Descriptive Institutional Memory */}
      <AnimatePresence>
        {isExecutiveModalOpen && (
          <div id="executive-pdf-modal" className="fixed inset-0 z-[1000000] flex justify-center items-center p-4">
            
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExecutiveModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white w-full max-w-4xl max-h-[95vh] rounded-[32px] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] flex flex-col overflow-hidden relative z-10 border border-slate-100 print:w-full print:h-auto print:shadow-none print:border-0 print:m-0"
            >
              
              {/* Modal top bars control (Ignored in print with standard print:hidden classes) */}
              <div className="flex items-center gap-4 text-left relative shrink-0 px-6 md:px-10 pt-6 md:pt-10 pb-4 select-none print:hidden">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100/40 shadow-sm shrink-0">
                    <FileCheck size={26} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl md:text-[23px] font-black text-[#0c2340] italic uppercase tracking-tighter leading-none mb-1">
                      Memória Descritiva
                    </h3>
                    <span className="font-sans font-black text-[10px] uppercase tracking-[0.16em] text-[#4f46e5]">
                      Editor de Relatório Executivo
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTriggerPrint}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border-0 shadow-3xs transition-all"
                  >
                    <Printer size={13} />
                    <span>Imprimir Doc</span>
                  </button>
                  
                  <button
                    onClick={() => setIsExecutiveModalOpen(false)}
                    aria-label="Fechar modal"
                    className="absolute -top-1 -right-1 text-slate-400 hover:text-slate-600 transition-all p-2 hover:bg-slate-50 rounded-full border-none bg-transparent cursor-pointer"
                    type="button"
                    title="Fechar"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Editable Configuration Controls before formal document (Ignored in print) */}
              <div className="bg-indigo-50/50 p-4 border-b border-indigo-100/60 font-sans text-xs space-y-3 shrink-0 print:hidden text-left">
                <span className="font-extrabold text-[10px] uppercase tracking-wider text-indigo-700 block">Campos Editáveis do Cabeçalho Oficiail:</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase">Título do Relatorio:</label>
                    <input 
                      type="text" 
                      value={executiveTitle}
                      onChange={(e) => setExecutiveTitle(e.target.value)}
                      className="bg-white border border-slate-200 text-[#0c2340] rounded-lg px-2.5 py-1.5 font-bold outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase">Direção / Departamento:</label>
                    <input 
                      type="text" 
                      value={executiveDepartment}
                      onChange={(e) => setExecutiveDepartment(e.target.value)}
                      className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 font-bold outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Printable Area of Formal Timbrado Document */}
              <div 
                id="printable-timbrado-document"
                className="flex-1 overflow-y-auto p-12 bg-white flex flex-col font-sans relative print:overflow-visible print:p-0 print:relative"
              >
                {/* Official coat decoration */}
                <div className="text-center space-y-2 border-b-2 border-slate-900 pb-5 mb-6">
                  {/* Stylized arms of republic (Vector) */}
                  <div className="mx-auto w-12 h-12 border-2 border-amber-500 rounded-full flex items-center justify-center font-black text-amber-600 bg-amber-50 text-[10px] font-serif select-none select-all shadow-inner">
                    CDA
                  </div>
                  <h4 className="font-sans font-black text-sm tracking-widest text-[#0c2340] uppercase m-0 leading-tight">
                    REPÚBLICA DE ANGOLA
                  </h4>
                  <h5 className="font-sans font-extrabold text-[10px] text-slate-500 uppercase m-0 tracking-widest">
                    CONSELHO DIGITAL DE ANGOLA (CDA)
                  </h5>
                  <h6 className="font-sans font-bold text-[9px] text-[#00A859] uppercase m-0 tracking-widest">
                    DIREÇÃO DE CERTIFICAÇÃO, TELECOMUNICAÇÕES E FISCALIZAÇÃO DACTILOSCÓPICA
                  </h6>
                </div>

                {/* Subheadings and Dates info */}
                <div className="flex justify-between items-start text-xs border-b border-dashed border-slate-200 pb-3 mb-6">
                  <div className="text-left space-y-1">
                    <span className="text-[9px] font-black text-slate-400 block uppercase">CONSELHO CENTRAL:</span>
                    <span className="font-black text-slate-800 block text-[10px]">{executiveDepartment}</span>
                    <span className="text-slate-500 block text-[10px]">Cód. Identificador: CDA-REP-{new Date().getFullYear()}-{activeTab.toUpperCase()}</span>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="text-[9px] font-black text-slate-400 block uppercase">EMISSÃO OFICIAL:</span>
                    <span className="font-bold text-slate-800 block text-[10px]">Luanda, {new Date().toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <span className="text-[#00A859] font-black text-[9px] block">CÓDIGO DE SEGURANÇA SSL</span>
                  </div>
                </div>

                {/* Main editable Document body */}
                <div className="flex-1 space-y-6 text-left">
                  <div className="space-y-1">
                    <span className="font-mono text-[9px] font-black tracking-widest uppercase text-indigo-600 block">ASUNTO DO PAINEL</span>
                    <h3 className="font-sans font-black text-lg text-slate-900 m-0 tracking-tight">
                      {executiveTitle}
                    </h3>
                  </div>

                  {/* Rich text simulator container */}
                  <div className="print:hidden space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sumário Gerencial do Relatório (Editável):</label>
                    <textarea
                      rows={6}
                      value={executiveSummary}
                      onChange={(e) => setExecutiveSummary(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-[18px] text-xs text-slate-900 font-medium leading-relaxed outline-none transition-all focus:bg-white resize-none"
                    />
                  </div>

                  {/* Text render styled for printing */}
                  <div className="hidden print:block text-slate-800 text-xs leading-relaxed font-serif text-justify whitespace-pre-wrap">
                    {executiveSummary}
                  </div>

                  {/* Dynamic metrics summarization table embedded into printed Document */}
                  <div className="space-y-3.5 pt-4">
                    <span className="font-sans font-extrabold text-[10px] text-slate-500 uppercase tracking-widest block">QUADRO RESUMO DE INDICADORES:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {kpiData.metrics.map((m) => (
                        <div key={m.id} className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block truncate">{m.label}</span>
                          <span className="text-sm font-black font-mono text-slate-900 mt-1 block">{m.current} {m.suffix}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Print notice details */}
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl text-[10px] leading-relaxed text-slate-500">
                    <p className="font-extrabold text-slate-600 m-0 text-left">Nota de Responsabilidade:</p>
                    <p className="m-0 mt-1 text-left text-[9px]">
                      Este informativo foi integralmente compilado por meio do barramento de segurança nacional criptográfico dactiloscópico (CDA-SECURE-API). O seu trâmite é chancelado em conformidade com as leis consulares vigentes de Angola.
                    </p>
                  </div>
                </div>

                {/* Official signature box at bottom margin of printable modal */}
                <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
                  {/* Left QR Code validation */}
                  <div className="flex items-center gap-3 select-none">
                    <div className="w-14 h-14 bg-slate-100 border border-slate-200 p-1 rounded-lg flex items-center justify-center font-bold text-[8px] tracking-tighter text-slate-500 uppercase">
                      QR CODE VALID
                    </div>
                    <div>
                      <span className="font-mono text-[8px] text-slate-400 block font-bold leading-none">CÓDIGO HASH DE CHAVE</span>
                      <span className="font-mono text-[9px] font-bold text-slate-800 block mt-1">cda_{(() => { let h = 5381; const src = `${executiveTitle}|${executiveSummary}|${new Date().toISOString().slice(0, 10)}`; for (let i = 0; i < src.length; i++) h = ((h * 33) ^ src.charCodeAt(i)) >>> 0; return h.toString(16).padStart(8, '0'); })()}</span>
                    </div>
                  </div>

                  {/* Right signature lines */}
                  <div className="w-64 text-center shrink-0">
                    <div className="border-b border-slate-900 pb-1 font-mono text-[10px] font-black uppercase text-slate-800">
                      CANCELER CONSULTOR CENTRAL
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 block mt-1.5 uppercase tracking-widest font-sans">
                      Assinatura Consular Autorizada
                    </span>
                  </div>
                </div>

              </div>

              {/* PRINT COMPONENT OVERRIDE RULES */}
              <style>{`
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  #printable-timbrado-document, #printable-timbrado-document * {
                    visibility: visible;
                  }
                  #printable-timbrado-document {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    padding: 0px !important;
                    height: auto !important;
                    overflow: visible !important;
                  }
                }
              `}</style>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
