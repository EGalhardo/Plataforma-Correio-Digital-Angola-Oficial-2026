/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedCounter } from '../ui/AnimatedCounter';
import {
  Bot,
  Activity,
  Users,
  Database,
  ArrowRight,
  ChevronRight,
  CheckCircle,
  Search,
  Settings,
  Upload,
  FileText,
  Check,
  Sparkles,
  ShieldCheck,
  Key,
  Lock,
  AlertTriangle,
  BarChart2,
  Plus,
  Loader2,
  Zap,
  Server,
  Cpu as CpuIcon,
  X
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { supabase } from '../../lib/supabaseClient';
import { isInstitutionObservacao } from '../../services/institutionRegistrationStore';

interface GovIaContentProps {
  onLog?: (action: string, type: 'info' | 'success' | 'warning' | 'critical') => void;
}

interface AIProvider {
  id: string;
  name: string;
  model: string;
  maker: string;
  status: 'active' | 'inactive' | 'fallback';
  cost: string;
  quota: string;
  responseTime: string;
  endpoint: string;
  isDefault: boolean;
}

interface InstitutionConfig {
  id: string;
  name: string;
  code: string;
  aiEnabled: boolean;
  docsCount: number;
  lastSync: string;
  model: string;
}

interface ChartPonto {
  name: string;
  volume: number;
  responseTime?: number;
}

interface AIBaseConfig {
  id: string;
  title: string;
  type: string;
  docsCount: number;
  institution: string;
  status: 'synced' | 'syncing' | 'error';
  lastUpdate: string;
}

interface GovAiStats {
  groqConfigured: boolean;
  geminiConfigured: boolean;
  supabaseConfigured: boolean;
  totalConversations: number;
  activeUsers: number;
  resolutionRate: number;
  avgResponseTime: string;
  docsConsulted: number;
  escalationRate: number;
  totalInstitutions: number;
  totalBases: number;
  totalDocs: number;
}

export function GovIaContent({ onLog }: GovIaContentProps) {
  // Toast notification state
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  // AI System Real Stats
  const [aiStats, setAiStats] = useState<GovAiStats>({
    groqConfigured: false,
    geminiConfigured: false,
    supabaseConfigured: false,
    totalConversations: 0,
    activeUsers: 0,
    resolutionRate: 0,
    avgResponseTime: '—',
    docsConsulted: 0,
    escalationRate: 0,
    totalInstitutions: 0,
    totalBases: 0,
    totalDocs: 0,
  });

  // Health check data from server
  const [, setHealthData] = useState<any>(null);
  const [, setIsLoadingHealth] = useState(true);

  // Fetch real health from /api/health
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        setHealthData(data);
        
        setAiStats(prev => ({
          ...prev,
          groqConfigured: data.groq_key_configured,
          geminiConfigured: data.ai_key_configured,
          supabaseConfigured: data.supabase_url_configured && data.supabase_anon_configured,
        }));
        // HONESTIDADE: os números de utilização NÃO são inventados aqui — onde
        // não existe telemetria central o contador permanece em 0/«—». As
        // contagens reais (instituições registadas e bases de conhecimento)
        // vêm da base de dados no efeito abaixo.
        
        setIsLoadingHealth(false);
      } catch (error) {
        console.error('Failed to fetch health:', error);
        setIsLoadingHealth(false);
      }
    };
    fetchHealth();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Preferência local da consola (instrução/modelo guardados nesta consola).
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cda_gov_ia_cfg');
      if (!raw) return;
      const cfg = JSON.parse(raw);
      if (cfg && typeof cfg === 'object') {
        if (typeof cfg.systemInstruction === 'string' && cfg.systemInstruction.trim()) setSystemInstruction(cfg.systemInstruction);
        if (typeof cfg.mainModel === 'string' && cfg.mainModel.trim()) setMainModel(cfg.mainModel);
      }
    } catch { /* ignora valores corrompidos */ }
  }, []);

  // DADOS REAIS (substitui os números fabricados que aqui existiam):
  //  - instituições registadas: public.solicitacoes_registo (mesma fonte da
  //    página «Instituições» do Admin — se a RLS bloquear a leitura anónima,
  //    fica vazio, o que é o estado verdadeiro para o observador);
  //  - bases de conhecimento: public.kb_fontes_instituicao (leitura pública
  //    das fontes ativas — criado na correção E6, tabela real da plataforma).
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const { data: regs, error: errRegs } = await supabase
          .from('solicitacoes_registo')
          .select('nome, bi_numero, status, observacoes, criado_em')
          .order('criado_em', { ascending: false });
        if (!cancelado && !errRegs && Array.isArray(regs)) {
          const insts: InstitutionConfig[] = regs
            .filter((r: any) => isInstitutionObservacao(r?.observacoes))
            .map((r: any, i: number) => ({
              id: String(r.bi_numero || `reg-${i}`),
              name: String(r.nome || 'Instituição registada'),
              code: String(r.bi_numero || '??').slice(0, 4).toUpperCase(),
              aiEnabled: false,
              docsCount: 0,
              lastSync: 'Sem vetores indexados ainda',
              model: '—',
            }));
          setInstitutions(insts);
          setAiStats(prev => ({ ...prev, totalInstitutions: insts.length }));
        }
      } catch { /* offline/RLS — lista fica vazia (estado verdadeiro) */ }

      try {
        const { data: fontes, error: errKb } = await supabase
          .from('kb_fontes_instituicao')
          .select('id, sigla, titulo, tipo, ativo, atualizado_em')
          .eq('ativo', true)
          .order('atualizado_em', { ascending: false });
        if (!cancelado && !errKb && Array.isArray(fontes)) {
          const bases: AIBaseConfig[] = fontes.map((f: any) => ({
            id: String(f.id),
            title: String(f.titulo || 'Fonte sem título'),
            type: String(f.tipo || 'Fonte'),
            docsCount: 1,
            institution: String(f.sigla || '—'),
            status: 'synced',
            lastUpdate: f.atualizado_em ? new Date(f.atualizado_em).toLocaleDateString('pt-AO') : '—',
          }));
          setKnowledgeBases(bases);
          setAiStats(prev => ({ ...prev, totalBases: bases.length, totalDocs: bases.length }));
          if (bases.length > 0) {
            setInstitutions(prev => {
              if (prev.length === 0) return prev;
              const contagem = new Map<string, number>();
              for (const f of fontes as any[]) {
                const sig = String(f.sigla || '').toUpperCase();
                contagem.set(sig, (contagem.get(sig) || 0) + 1);
              }
              return prev.map(inst => {
                const docs = contagem.get(inst.code.toUpperCase());
                return docs
                  ? { ...inst, docsCount: docs, aiEnabled: true, lastSync: 'Fontes ativas na Base de Conhecimento', model: 'llama-3.1-8b-instant' }
                  : inst;
              });
            });
          }
        }
      } catch { /* idem */ }
    })();
    return () => { cancelado = true; };
  }, []);

  // Interactive configurations
  const [mainModel, setMainModel] = useState<string>('llama-3.1-8b-instant');
  const [isAssistantActive, setIsAssistantActive] = useState<boolean>(true);
  const [selectedRange, setSelectedRange] = useState<string>('7d');
  const [institutionsSearch, setInstitutionsSearch] = useState<string>('');

  // Modals state
  const [isManageKnowledgeOpen, setIsManageKnowledgeOpen] = useState<boolean>(false);
  const [isManageModelsOpen, setIsManageModelsOpen] = useState<boolean>(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  // System-wide instruction
  const [systemInstruction, setSystemInstruction] = useState<string>(
    'Você é o Assistente IA Nacional do Correio Digital de Angola. Aceda às bases de conhecimento federadas de todas as instituições governamentais para fornecer respostas precisas, rápidas e integradas aos cidadãos angolanos. Sua missão é simplificar o acesso aos serviços públicos e garantir que cada cidadão seja bem informado.'
  );

  // Custom Toast helper
  const triggerToast = (msg: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Helper function for sound effects
  const playSound = (type: 'click' | 'success') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      if (type === 'click') {
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.015, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } else {
        osc.frequency.setValueAtTime(450, audioCtx.currentTime);
        osc.frequency.setValueAtTime(900, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      }
    } catch { /* Audio context may be blocked */ }
  };

  // AI Models Configuration (Real Groq models)
  // Catálogo dos modelos configuráveis no fornecedor (Groq/Google). Os nomes e
  // IDs são reais; custos, quotas e latências NÃO são medidos pela plataforma,
  // por isso mostram «—» em vez de valores inventados.
  const [modelsList, setModelsList] = useState<AIProvider[]>([
    { id: 'm1', name: 'Llama 3.1 8B Instant', model: 'llama-3.1-8b-instant', maker: 'Meta / Groq', status: 'active', cost: '—', quota: '—', responseTime: '—', endpoint: '/api/chat', isDefault: true },
    { id: 'm2', name: 'Llama 3.3 70B Versatile', model: 'llama-3.3-70b-versatile', maker: 'Meta / Groq', status: 'active', cost: '—', quota: '—', responseTime: '—', endpoint: '/api/chat', isDefault: false },
    { id: 'm3', name: 'Mixtral 8x7B', model: 'mixtral-8x7b-32768', maker: 'Mistral AI / Groq', status: 'active', cost: '—', quota: '—', responseTime: '—', endpoint: '/api/chat', isDefault: false },
    { id: 'm4', name: 'Gemma 2 9B', model: 'gemma2-9b-it', maker: 'Google / Groq', status: 'active', cost: '—', quota: '—', responseTime: '—', endpoint: '/api/chat', isDefault: false },
  ]);

  const selectActiveModel = (id: string, modelName: string) => {
    // NOTA HONESTA: isto muda apenas a preferência mostrada nesta consola.
    // O modelo servido nas respostas é definido na configuração do servidor.
    setModelsList(prev => prev.map(m => ({ ...m, isDefault: m.id === id })));
    setMainModel(modelName);
    triggerToast(`Preferência desta consola: ${modelName}. (O modelo servido é definido pela configuração do servidor.)`, 'info');
    playSound('success');
    if (onLog) onLog(`Preferência de modelo nesta consola: ${modelName}`, 'info');
  };

  // Institutions with AI Configuration
  const [institutions, setInstitutions] = useState<InstitutionConfig[]>([]);

  // Knowledge Bases
  // Começa vazio e carrega as fontes reais (kb_fontes_instituicao) no efeito acima.
  const [knowledgeBases, setKnowledgeBases] = useState<AIBaseConfig[]>([]);

  const [newKbTitle, setNewKbTitle] = useState<string>('');
  const [newInstName, setNewInstName] = useState<string>('');

  const handleAddInstitution = () => {
    // HONESTIDADE: adicionar uma linha só no ecrã fingia uma integração que não
    // existe. O caminho real é o registo oficial da instituição.
    if (!newInstName.trim()) {
      triggerToast('Insira o nome da instituição', 'warning');
      return;
    }
    triggerToast('Nada foi adicionado: o registo de uma instituição é feito pelo fluxo oficial de registo (área «Instituições»). Esta consola apenas mostra o que existe.', 'info');
  };

  const handleAddKb = () => {
    triggerToast('A Base de Conhecimento é gerida por cada instituição na sua própria área (separador «Base de Conhecimento»). Aqui só apresentamos o que existe na plataforma.', 'info');
    setIsManageKnowledgeOpen(false);
  };

  const toggleInstitutionAI = () => {
    triggerToast('A activação de IA por instituição depende de telemetria e configuração reais — esta consola é apenas de leitura.', 'info');
  };

  const handleSaveInstructions = () => {
    // Persistência local (honesta): fica gravada nesta consola/navegador.
    // A instrução servida no chat da plataforma é definida no servidor.
    try {
      localStorage.setItem('cda_gov_ia_cfg', JSON.stringify({ systemInstruction, mainModel }));
      triggerToast('Configuração guardada nesta consola. (A instrução servida no chat da plataforma é definida na configuração do servidor.)', 'success');
    } catch {
      triggerToast('Configuração aplicada apenas nesta janela — o navegador não permitiu gravar.', 'info');
    }
    if (onLog) onLog('Configuração de IA desta consola actualizada (local).', 'success');
  };

  // Chat/Test AI
  const [testMessages, setTestMessages] = useState([
    { sender: 'assistant', text: 'Olá! Sou o Assistente IA Nacional do Correio Digital de Angola. Posso consultar as bases de conhecimento federadas de todas as instituições governamentais. Como posso ajudar?' }
  ]);
  const [testInput, setTestInput] = useState<string>('');
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);

  const simulateAiResponse = async (query: string) => {
    setIsAiTyping(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: testMessages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })).concat([{ role: 'user', content: query }]),
          isGovMode: true,
          language: 'pt',
          pageContext: 'Painel de IA Nacional do Correio Digital de Angola - Gestão centralizada de inteligência artificial governamental federada.'
        }),
      });
      const data = await response.json();
      if (response.ok && data.message) {
        setTestMessages(prev => [...prev, { sender: 'assistant', text: data.message }]);
        playSound('success');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('AI Test Error:', error);
      setTestMessages(prev => [...prev, { 
        sender: 'assistant', 
        text: 'O serviço de IA está temporariamente indisponível. Verifique a configuração da API Groq no servidor.' 
      }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  // HONESTIDADE: ainda não existe telemetria de volume de conversas —
  // sem séries fabricadas. O gráfico mostra o estado vazio honesto.
  const chartDataWeekly: ChartPonto[] = [];
  const chartDataMonthly: ChartPonto[] = [];

  const currentChartData = useMemo(() => {
    return selectedRange === '7d' ? chartDataWeekly : chartDataMonthly;
  }, [selectedRange]);

  const filteredInstitutions = useMemo(() => {
    return institutions.filter(inst => inst.name.toLowerCase().includes(institutionsSearch.toLowerCase()) || inst.code.toLowerCase().includes(institutionsSearch.toLowerCase()));
  }, [institutions, institutionsSearch]);

  const activeInstituions = institutions.filter(i => i.aiEnabled).length;
  const syncedBases = knowledgeBases.filter(b => b.status === 'synced').length;
  const totalDocs = knowledgeBases.reduce((sum, b) => sum + b.docsCount, 0);

  return (
    <div className="pb-24 text-left animate-fadeIn space-y-6 w-full max-w-none mx-auto px-1 sm:px-2 font-sans">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 rounded-2xl p-4 shadow-xl text-white flex items-center gap-3 border transition-all duration-300 ${
              toastType === 'success' ? 'bg-emerald-600 border-emerald-500' :
              toastType === 'warning' ? 'bg-amber-600 border-amber-500' :
              toastType === 'error' ? 'bg-red-600 border-red-500' :
              'bg-blue-600 border-blue-500'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold">
              <Check size={14} className="stroke-[3]" />
            </div>
            <div>
              <p className="m-0 leading-tight font-black text-xs uppercase tracking-wider">Ação Automatizada</p>
              <p className="text-[10px] text-white/90 font-medium m-0 mt-0.5">{toastMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER HERO */}
      <div id="ai-central-header" className="bg-white border border-slate-200 text-slate-800 rounded-[24px] p-6 shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl -z-1" />
        <div className="absolute left-1/4 bottom-0 w-80 h-80 bg-indigo-50/40 rounded-full blur-3xl -z-1 shrink-0" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl shadow-md shrink-0">
              <Bot size={32} className={aiStats.groqConfigured ? 'animate-pulse' : 'opacity-50'} />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0E2B64] border border-[#0E2B64] rounded-full text-[10px] font-sans tracking-wide uppercase font-black text-white">
                  <span className={`w-1.5 h-1.5 rounded-full ${aiStats.groqConfigured ? 'bg-emerald-400 animate-ping' : 'bg-white'}`} />
                  Conselho Digital de Angola
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[9px] font-mono tracking-wider font-extrabold uppercase">
                  GROQ IA NACIONAL
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-[#0c2340] tracking-tight m-0 font-sans mt-2">
                ASSISTÊNCIA IA NACIONAL
              </h1>
              <p className="text-xs md:text-sm text-slate-500 font-semibold leading-relaxed max-w-3xl m-0">
                Painel centralizado de gestão da inteligência artificial federada do Correio Digital de Angola. 
                Modelo principal: <strong className="text-indigo-600">{mainModel}</strong>.
              </p>
            </div>
          </div>


          <div className="flex flex-row md:flex-row items-center gap-3 self-start lg:self-center shrink-0">
            <button
              onClick={() => { playSound('success'); setIsTestModalOpen(true); }}
              className="px-5 py-3.5 bg-[#0E2B64] hover:bg-[#0C2454] text-white rounded-[16px] text-xs font-black uppercase tracking-wider transition-all hover:shadow-md cursor-pointer border-0 flex items-center gap-2"
            >
              <Sparkles size={14} className="stroke-[2.5]" />
              <span>Testar IA</span>
            </button>

            <button
              onClick={() => setIsConfigOpen(true)}
              className="px-4 py-3.5 bg-white hover:bg-slate-50 text-slate-700 rounded-[16px] text-xs font-black uppercase tracking-wider transition-all cursor-pointer border border-slate-300 flex items-center gap-2"
            >
              <Settings size={14} className="text-slate-500" />
              <span>Configurar</span>
            </button>
          </div>
        </div>

        <div className="h-[1px] bg-slate-200/60 my-5" />

        {/* Mode Toggle & Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between font-sans">
          
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Sistema de IA:</span>
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-[16px] p-1 shadow-xs">
              <button 
                onClick={() => { playSound('click'); setIsAssistantActive(true); triggerToast('Serviço de IA Nacional Activado na rede.', 'success'); }}
                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-0 cursor-pointer ${isAssistantActive ? 'bg-emerald-600 text-white shadow-xs' : 'bg-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Ativo / Em Operação
              </button>
              <button 
                onClick={() => { playSound('click'); setIsAssistantActive(false); triggerToast('Serviço de IA suspenso temporariamente.', 'warning'); }}
                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-0 cursor-pointer ${!isAssistantActive ? 'bg-orange-600 text-white shadow-xs' : 'bg-transparent text-slate-500 hover:text-orange-600'}`}
              >
                Suspenso
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400">Canal de Ingressos:</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${aiStats.groqConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider border ${
                  aiStats.groqConfigured 
                    ? 'bg-emerald-50 border-emerald-150 text-emerald-700' 
                    : 'bg-amber-50 border-amber-150 text-amber-700'
                }`}>
                  {aiStats.groqConfigured ? 'GROQ ONLINE' : 'GROQ OFFLINE'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Server size={14} className={aiStats.geminiConfigured ? 'text-emerald-500' : 'text-slate-300'} />
              <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider border ${
                aiStats.geminiConfigured
                  ? 'bg-blue-50 border-blue-150 text-blue-700'
                  : 'bg-slate-50 border-slate-150 text-slate-400'
              }`}>
                {aiStats.geminiConfigured ? 'GEMINI LIVE' : 'GEMINI OFF'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <CpuIcon size={14} className="text-indigo-500" />
              <span className="px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider bg-indigo-50 border border-indigo-150 text-indigo-700">
                {mainModel}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* TOP ROW: REAL KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        <div className="bg-white border border-slate-200 p-4.5 rounded-[20px] shadow-3xs cursor-pointer hover:border-indigo-300 transition-all text-left relative group overflow-hidden" onClick={() => setIsManageModelsOpen(true)}>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Motor Principal</span>
          <span className="text-[11px] font-semibold text-indigo-600 block mt-0.5">Em uso</span>
          <span className="text-base md:text-lg font-black text-[#0a2342] block mt-1 tracking-tight truncate">{mainModel}</span>
        </div>

        <div className="bg-white border border-slate-200 p-4.5 rounded-[20px] shadow-3xs text-left relative overflow-hidden">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Estado do Sistema</span>
          <span className="text-[11px] font-semibold text-slate-500 block mt-0.5">Operacional</span>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isAssistantActive ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`} />
            <span className={`text-base font-black uppercase tracking-wide ${isAssistantActive ? 'text-emerald-700' : 'text-orange-600'}`}>
              {isAssistantActive ? 'Activo' : 'Pausado'}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4.5 rounded-[20px] shadow-3xs text-left relative overflow-hidden">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Instituições c/ IA</span>
          <span className="text-[11px] font-semibold text-emerald-600 block mt-0.5">Activas</span>
          <span className="text-2xl md:text-3xl font-black text-[#0a2342] block mt-1 tracking-tight">
            <AnimatedCounter to={activeInstituions} className="font-mono" />
            <span className="text-slate-400 font-medium font-sans">/{institutions.length}</span>
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4.5 rounded-[20px] shadow-3xs cursor-pointer hover:border-indigo-300 transition-all text-left relative overflow-hidden" onClick={() => setIsManageKnowledgeOpen(true)}>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Bases de Conhecimento</span>
          <span className="text-[11px] font-semibold text-indigo-600 block mt-0.5">Vetores activos</span>
          <span className="text-2xl md:text-3xl font-black text-[#0a2342] block mt-1 tracking-tight">
            <AnimatedCounter to={aiStats.totalBases} className="font-mono" />
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4.5 rounded-[20px] shadow-3xs text-left relative overflow-hidden">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Conversas Hoje</span>
          <span className="text-[11px] font-semibold text-slate-500 block mt-0.5">Total</span>
          <span className="text-2xl md:text-3xl font-black text-[#0a2342] block mt-1 tracking-tight">
            <AnimatedCounter to={aiStats.totalConversations} className="font-mono" />
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4.5 rounded-[20px] shadow-3xs text-left relative overflow-hidden">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Taxa de Resolução</span>
          <span className="text-[11px] font-semibold text-emerald-600 block mt-0.5">Global</span>
          <span className="text-2xl md:text-3xl font-black text-emerald-700 block mt-1 tracking-tight">
            {aiStats.totalConversations === 0 ? <span className="font-mono text-slate-400">—</span> : <AnimatedCounter to={aiStats.resolutionRate} suffix="%" className="font-mono" />}
          </span>
        </div>
      </div>

      {/* HOW IT WORKS DIAGRAM */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-[24px] p-6 text-left relative overflow-hidden">
        <h3 className="text-xs md:text-xs font-black text-slate-400 uppercase tracking-widest block mb-4">
          Arquitetura do Assistente IA Nacional
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
          
          {/* Step 1 */}
          <div className="flex items-center gap-4 bg-white border border-slate-200/60 p-4 rounded-2xl relative shadow-3xs">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Users size={22} />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-black text-[#0c2340] block">1. Cidadão pergunta</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Via chat, voz ou comando</span>
            </div>
            <div className="hidden md:block absolute -right-4 z-20 text-slate-400">
              <ChevronRight size={20} className="stroke-[3]" />
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-4 bg-white border border-slate-200/60 p-4 rounded-2xl relative shadow-3xs">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold shrink-0">
              <Bot size={22} className="animate-pulse" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-black text-[#0c2340] block">2. Groq processa</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Llama 3.1 8B via API</span>
            </div>
            <div className="hidden md:block absolute -right-4 z-20 text-slate-400">
              <ChevronRight size={20} className="stroke-[3]" />
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-4 bg-white border border-slate-200/60 p-4 rounded-2xl relative shadow-3xs">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
              <Database size={22} />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-black text-[#0c2340] block">3. Consulta vectores</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">{aiStats.totalDocs.toLocaleString('pt-AO')} docs indexados</span>
            </div>
            <div className="hidden md:block absolute -right-4 z-20 text-slate-400">
              <ChevronRight size={20} className="stroke-[3]" />
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-center gap-4 bg-white border border-slate-200/60 p-4 rounded-2xl relative shadow-3xs">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <Zap size={22} />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-black text-[#0c2340] block">4. Resposta gerada</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Média {aiStats.avgResponseTime}</span>
            </div>
            <div className="hidden md:block absolute -right-4 z-20 text-slate-400">
              <ChevronRight size={20} className="stroke-[3]" />
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex items-center gap-4 bg-white border border-slate-200/60 p-4 rounded-2xl relative shadow-3xs">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <CheckCircle size={22} />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-black text-[#0c2340] block">5. Resposta ao cidadão</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">{aiStats.totalConversations === 0 ? 'Sem medição ainda' : `${aiStats.resolutionRate}% resolvido`}</span>
            </div>
          </div>

        </div>

      </div>

      {/* MIDDLE GRID: 3 COLUMNS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* COL 1: INSTITUIÇÕES INTEGRADAS */}
        <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Integração Federada</span>
                <h2 className="text-sm font-black text-[#0c2340] uppercase tracking-wide">Instituições com IA</h2>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                {activeInstituions} activas
              </span>
            </div>

            <div className="my-3 relative">
              <input
                type="text"
                placeholder="Pesquisar instituição..."
                value={institutionsSearch}
                onChange={(e) => setInstitutionsSearch(e.target.value)}
                className="w-full bg-white hover:bg-slate-50 focus:bg-white text-xs text-slate-800 placeholder-slate-400 border border-slate-300 focus:border-indigo-400 px-3.5 py-2.5 rounded-xl outline-none transition-all pr-8 shadow-3xs"
              />
              <Search size={14} className="text-slate-400 absolute right-3 top-3.5" />
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {filteredInstitutions.length === 0 && (
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed p-3 bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl text-left">
                  Nenhuma instituição registada é visível com as permissões actuais. As instituições registadas na plataforma aparecem aqui automaticamente.
                </p>
              )}
              {filteredInstitutions.map(inst => (
                <div key={inst.id} className="flex items-center justify-between p-3.5 bg-white border border-slate-300 hover:border-indigo-300 rounded-2xl group transition-all shadow-3xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0">
                      {inst.code}
                    </div>
                    <div className="text-left min-w-0">
                      <span className="text-[11px] font-black text-slate-800 block group-hover:text-indigo-950 transition-colors">{inst.name}</span>
                      <span className="text-[9px] text-slate-500 font-medium block">{inst.lastSync}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-left md:text-right hidden sm:block">
                      <span className="text-[10px] font-mono font-black text-slate-800 block">{inst.docsCount.toLocaleString('pt-AO')} docs</span>
                      <span className="text-[8px] font-bold text-slate-400 block tracking-widest uppercase">Indexados</span>
                    </div>
                    <button
                      onClick={() => toggleInstitutionAI()}
                      className={`p-1 rounded-lg transition-all cursor-pointer border-0 ${
                        inst.aiEnabled 
                          ? 'text-emerald-600 hover:bg-emerald-50' 
                          : 'text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {inst.aiEnabled ? <CheckCircle size={18} /> : <X size={18} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Add Institution */}
          <div className="mt-4 pt-4 border-t border-slate-150 bg-white p-3 rounded-2xl border border-dashed border-slate-300 shadow-3xs">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Adicionar instituição</span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nome da instituição..."
                value={newInstName}
                onChange={(e) => setNewInstName(e.target.value)}
                className="flex-1 bg-white border border-slate-300 px-3 py-1.5 text-xs rounded-xl outline-none shadow-3xs"
              />
              <button
                onClick={handleAddInstitution}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-0 cursor-pointer flex items-center gap-1"
              >
                <Plus size={14} />
                <span>Adicionar</span>
              </button>
            </div>
          </div>
        </div>

        {/* COL 2: BASES DE CONHECIMENTO */}
        <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-xs flex flex-col justify-between">
          
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Vetorização e Index</span>
                <h2 className="text-sm font-black text-[#0c2340] uppercase tracking-wide">Bases de Conhecimento</h2>
              </div>
              <span className="text-[11px] font-mono font-bold text-white bg-[#0E2B64] px-2 py-0.5 rounded-md">
                {totalDocs.toLocaleString('pt-AO')} Docs
              </span>
            </div>

            <div className="space-y-3 mt-4">
              {knowledgeBases.length === 0 && (
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed p-3 bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl text-left">
                  Ainda não existem fontes de conhecimento publicadas por instituições. Quando uma instituição publicar fontes na sua área, aparecem aqui em tempo real.
                </p>
              )}
              {knowledgeBases.map(kb => (
                <div key={kb.id} className="flex items-center justify-between p-3.5 border border-slate-150 bg-white rounded-xl shadow-3xs hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-black text-slate-800 block">{kb.title}</span>
                      <span className="text-[9px] text-slate-400 font-bold block uppercase mt-0.5">{kb.type} • {kb.institution}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      <span className="text-xs font-mono font-black text-indigo-700 block">{kb.docsCount.toLocaleString('pt-AO')}</span>
                      <span className={`text-[8px] font-bold block tracking-widest uppercase ${
                        kb.status === 'synced' ? 'text-emerald-600' : kb.status === 'syncing' ? 'text-amber-600' : 'text-red-500'
                      }`}>
                        {kb.status === 'synced' ? 'Sincronizado' : kb.status === 'syncing' ? 'A sincronizar' : 'Erro'}
                      </span>
                    </div>
                    {kb.status === 'synced' && (
                      <CheckCircle size={14} className="text-emerald-500" />
                    )}
                  </div>
                </div>
              ))}

              {/* Sync Status Block */}
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-150 rounded-2xl flex items-center justify-between text-left">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  <div>
                    <span className="text-[10px] font-black text-emerald-800 block">Leitura da Base de Conhecimento em tempo real</span>
                    <span className="text-[9px] text-emerald-600 font-medium block">{syncedBases}/{knowledgeBases.length} bases sincronizadas • Groq + Supabase</span>
                  </div>
                </div>
                <button
                  onClick={() => { playSound('success'); triggerToast('A lista mostrada já é a leitura actual da Base de Conhecimento — nada mais foi resincronizado.', 'info'); }}
                  className="p-1 px-2.5 bg-white border border-emerald-200 hover:border-emerald-300 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer shadow-3xs"
                >
                  Sincronizar
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsManageKnowledgeOpen(true)}
            className="w-full mt-4 py-3 bg-[#0E2B64] hover:bg-[#0C2454] text-white border border-[#0E2B64] rounded-[16px] text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-xs"
          >
            <Upload size={14} className="text-white" />
            <span>Gerir Bases de Conhecimento</span>
          </button>
        </div>

        {/* COL 3: MONITORIZAÇÃO */}
        <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-xs flex flex-col justify-between">
          
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Auditoria Operativa</span>
                <h2 className="text-sm font-black text-[#0c2340] uppercase tracking-wide">Monitorização (valores medidos)</h2>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              
              <div className="bg-white p-3.5 rounded-2xl border border-slate-300 text-left shadow-3xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Perguntas Respondidas</span>
                <span className="text-base font-black text-slate-800 font-mono block mt-1">{aiStats.totalConversations.toLocaleString('pt-AO')}</span>
                <span className="text-[9px] text-slate-400 font-bold block mt-0.5">sem dados anteriores</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-300 text-left shadow-3xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tempo Médio Resposta</span>
                <span className="text-base font-black text-slate-400 font-mono block mt-1">{aiStats.avgResponseTime}</span>
                <span className="text-[9px] text-slate-400 font-bold block mt-0.5">sem dados anteriores</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-300 text-left shadow-3xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Taxa de Sucesso</span>
                <span className="text-base font-black text-slate-400 font-mono block mt-1">{aiStats.totalConversations === 0 ? '—' : `${aiStats.resolutionRate}%`}</span>
                <span className="text-[9px] text-slate-400 font-bold block mt-0.5">sem dados anteriores</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-300 text-left shadow-3xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Utilizadores Atendidos</span>
                <span className="text-base font-black text-slate-800 font-mono block mt-1">{aiStats.activeUsers.toLocaleString('pt-AO')}</span>
                <span className="text-[9px] text-slate-400 font-bold block mt-0.5">sem dados anteriores</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-300 text-left shadow-3xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Docs Consultados</span>
                <span className="text-base font-black text-slate-800 font-mono block mt-1">{aiStats.docsConsulted.toLocaleString('pt-AO')}</span>
                <span className="text-[9px] text-slate-400 font-bold block mt-0.5">sem dados anteriores</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-300 text-left shadow-3xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Taxa de Escalonamento</span>
                <span className="text-base font-black text-slate-400 font-mono block mt-1">{aiStats.totalConversations === 0 ? '—' : `${aiStats.escalationRate}%`}</span>
                <span className="text-[9px] text-slate-400 font-bold block mt-0.5">sem dados anteriores</span>
              </div>

            </div>
          </div>

          <button
            onClick={() => triggerToast('A redirecionar para relatórios consolidados...', 'info')}
            className="w-full mt-4 py-3 bg-[#0E2B64] hover:bg-[#0C2454] text-white rounded-[16px] text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 border border-[#0E2B64] shadow-xs"
          >
            <BarChart2 size={14} className="text-white" />
            <span>Ver relatório completo</span>
          </button>
        </div>

      </div>

      {/* BOTTOM GRID: MODELS + CHART + TOPICS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* MODELS CONFIGURATION */}
        <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Configuração de Motor LLM</span>
                <h2 className="text-sm font-black text-[#0c2340] uppercase tracking-wide">Modelos de IA Disponíveis</h2>
              </div>
              <span className="text-[9px] px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-black rounded uppercase">
                Groq API
              </span>
            </div>

            <div className="space-y-2 mt-4 max-h-[280px] overflow-y-auto pr-1">
              {modelsList.map(modelItem => (
                <div 
                  key={modelItem.id}
                  onClick={() => selectActiveModel(modelItem.id, modelItem.name)}
                  className={`p-3.5 border rounded-2xl text-left cursor-pointer transition-all flex items-center justify-between ${
                    modelItem.isDefault 
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${modelItem.isDefault ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Bot size={15} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800">{modelItem.name}</span>
                        {modelItem.isDefault && (
                          <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase rounded">
                            Activo
                          </span>
                        )}
                        {modelItem.status === 'fallback' && (
                          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[8px] font-black uppercase rounded">
                            Fallback
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 block font-medium">{modelItem.maker}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-black text-slate-700 block">{modelItem.cost}</span>
                    <span className="text-[9px] text-slate-400 font-mono block">⏱ {modelItem.responseTime}</span>
                    <span className="text-[9px] text-emerald-600 font-black block">{modelItem.quota}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setIsManageModelsOpen(true)}
            className="w-full mt-4 py-3 bg-[#0E2B64] hover:bg-[#0C2454] text-white border border-[#0E2B64] rounded-[16px] text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-xs"
          >
            <Settings size={14} className="text-white" />
            <span>Gerir Modelos</span>
          </button>
        </div>

        {/* VOLUME CHART */}
        <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Frequência e Saturação</span>
                <h2 className="text-sm font-black text-[#0c2340] uppercase tracking-wide">Volume de Conversas</h2>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-0.5 rounded-lg">
                <button
                  onClick={() => { playSound('click'); setSelectedRange('7d'); }}
                  className={`px-2 py-1 text-[9px] font-black rounded border-0 cursor-pointer ${selectedRange === '7d' ? 'bg-indigo-600 text-white' : 'bg-transparent text-slate-500'}`}
                >
                  7 Dias
                </button>
                <button
                  onClick={() => { playSound('click'); setSelectedRange('30d'); }}
                  className={`px-2 py-1 text-[9px] font-black rounded border-0 cursor-pointer ${selectedRange === '30d' ? 'bg-indigo-600 text-white' : 'bg-transparent text-slate-500'}`}
                >
                  Mensal
                </button>
              </div>
            </div>

            {currentChartData.length === 0 ? (
              <div className="h-[180px] w-full mt-4 flex flex-col items-center justify-center bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl text-center px-6">
                <BarChart2 size={22} className="text-slate-300 mb-2" />
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Ainda sem conversas medidas</span>
                <span className="text-[10px] text-slate-400 font-semibold mt-1 leading-relaxed">
                  O gráfico de volume aparece aqui quando a plataforma tiver telemetria de conversas activa. A plataforma não mostra séries de exemplo.
                </span>
              </div>
            ) : (
            <div className="h-[180px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentChartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', background: '#FFFFFF', border: '1px solid #e2e8f0', fontSize: '11px', textAlign: 'left' }}
                  />
                  <Area type="monotone" dataKey="volume" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVolume)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            )}

            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3.5 mt-2">
              <div className="text-left">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Total Período</span>
                <span className="text-xs font-black text-slate-800 tracking-tight block mt-0.5">
                  {currentChartData.reduce((a, p) => a + p.volume, 0).toLocaleString('pt-AO')}
                </span>
              </div>
              <div className="text-left">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Média Diária</span>
                <span className="text-xs font-black text-indigo-700 tracking-tight block mt-0.5">
                  {currentChartData.length ? Math.round(currentChartData.reduce((a, p) => a + p.volume, 0) / currentChartData.length).toLocaleString('pt-AO') : '—'}
                </span>
              </div>
              <div className="text-left">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Pico Diário</span>
                <span className="text-xs font-black text-slate-800 tracking-tight block mt-0.5">
                  {currentChartData.length ? Math.max(...currentChartData.map(p => p.volume)).toLocaleString('pt-AO') : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TOP TOPICS */}
        <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-xs flex flex-col justify-between font-sans">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Assuntos e Tendências</span>
                <h2 className="text-sm font-black text-[#0c2340] uppercase tracking-wide">Top Temas Mais Consultados</h2>
              </div>
              <span className="text-[9px] font-mono bg-[#0E2B64] text-white px-2.5 py-0.5 rounded-md font-bold uppercase">
                Hoje
              </span>
            </div>

            <div className="space-y-3.5 mt-4">

              <div className="flex flex-col items-center justify-center bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl text-center px-6 py-8">
                <BarChart2 size={22} className="text-slate-300 mb-2" />
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Ainda sem temas medidos</span>
                <span className="text-[10px] text-slate-400 font-semibold mt-1 leading-relaxed">
                  Quando a telemetria de conversas estiver activa, os temas mais consultados aparecem aqui — sem listas de exemplo.
                </span>
              </div>

              {([] as { rank: number; topic: string; count: number; pct: number; color: string }[]).map(item => (
                <div key={item.rank} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-extrabold font-mono">{item.rank}</span>
                      <span className="truncate max-w-[160px]">{item.topic}</span>
                    </div>
                    <span>{item.count.toLocaleString('pt-AO')} <span className="text-[10px] text-slate-400 font-normal">({item.pct}%)</span></span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct * 5}%` }} />
                  </div>
                </div>
              ))}

            </div>
          </div>

          <button
            onClick={() => triggerToast('A classificação de temas será activada quando houver telemetria de conversas.', 'info')}
            className="w-full mt-4 py-3 bg-[#0E2B64] hover:bg-[#0C2454] text-white border border-[#0E2B64] rounded-[16px] text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-xs"
          >
            <span>Ver todos os temas</span>
            <ArrowRight size={14} className="text-white" />
          </button>
        </div>

      </div>

      {/* SECURITY POLICIES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#F8FAFC] border border-slate-200 p-5 rounded-[24px] text-left">
        
        <div className="flex items-start gap-3 bg-white p-4 rounded-xl shadow-3xs border border-slate-150">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 className="text-xs font-black text-[#0c2340] uppercase tracking-wide">Segurança e Privacidade</h4>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal font-semibold">
              Todos os dados são geridos centralmente e tratados em conformidade com a Lei de Protecção de Dados de Angola.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-white p-4 rounded-xl shadow-3xs border border-slate-150">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
            <Lock size={20} />
          </div>
          <div>
            <h4 className="text-xs font-black text-[#0c2340] uppercase tracking-wide">Encriptação E2E</h4>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal font-semibold">
              Encriptação activa de ponta a ponta. Todas as comunicações digitais e requisições são blindadas.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-white p-4 rounded-xl shadow-3xs border border-slate-150">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <Key size={20} />
          </div>
          <div>
            <h4 className="text-xs font-black text-[#0c2340] uppercase tracking-wide">Acesso Controlado</h4>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal font-semibold">
              Permissões distribuídas e categorizadas estritamente por função administrativa ou perfil institucional.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-white p-4 rounded-xl shadow-3xs border border-slate-150">
          <div className="p-2.5 bg-[#0c2340]/5 text-[#0c2340] rounded-lg shrink-0">
            <Activity size={20} />
          </div>
          <div>
            <h4 className="text-xs font-black text-[#0c2340] uppercase tracking-wide">Auditoria Completa</h4>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal font-semibold">
              Todos os acessos e transações operativas são integrados e anotados sob logs imutáveis.
            </p>
          </div>
        </div>

      </div>

      {/* MODAL: CONFIGURAÇÃO GERAL */}
      {isConfigOpen && (
        <div className="fixed inset-0 bg-[#0c2340]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-[24px] max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-left space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-150">
              <div className="flex items-center gap-2">
                <Settings className="text-indigo-600" size={20} />
                <span className="text-sm font-black text-[#0c2340] uppercase tracking-wider">Configuração Global da IA</span>
              </div>
              <button onClick={() => setIsConfigOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer bg-slate-50 rounded-full border-0">✕</button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Instrução do Sistema (Global)</label>
                <textarea
                  value={systemInstruction}
                  onChange={(e) => setSystemInstruction(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-800 leading-relaxed min-h-[120px]"
                  placeholder="Instrução global para todos os assistentes IA..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Modelo Padrão</label>
                  <select
                    value={mainModel}
                    onChange={(e) => setMainModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant</option>
                    <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile</option>
                    <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                    <option value="gemma2-9b-it">Gemma 2 9B</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Temperatura</label>
                  <input type="text" defaultValue="0.3" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-800 outline-none" />
                </div>
              </div>

              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <h4 className="text-[11px] font-black text-indigo-900 uppercase tracking-wider mb-2">Motor IA Configurado</h4>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-indigo-100">
                    <span className={`w-2 h-2 rounded-full ${aiStats.groqConfigured ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className="font-bold text-slate-700">Groq API:</span>
                    <span className={`font-black ${aiStats.groqConfigured ? 'text-emerald-700' : 'text-red-600'}`}>
                      {aiStats.groqConfigured ? 'Configurada' : 'Não configurada'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-indigo-100">
                    <span className={`w-2 h-2 rounded-full ${aiStats.geminiConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="font-bold text-slate-700">Gemini Live:</span>
                    <span className={`font-black ${aiStats.geminiConfigured ? 'text-emerald-700' : 'text-amber-600'}`}>
                      {aiStats.geminiConfigured ? 'Configurado' : 'Fallback'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-150">
              <button onClick={() => setIsConfigOpen(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer border-0">
                Voltar
              </button>
              <button onClick={() => { handleSaveInstructions(); setIsConfigOpen(false); }} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer border-0 shadow-sm">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GERIR BASES DE CONHECIMENTO */}
      {isManageKnowledgeOpen && (
        <div className="fixed inset-0 bg-[#0c2340]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-slate-100 text-left space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-150">
              <div className="flex items-center gap-2">
                <Database className="text-indigo-600" size={20} />
                <span className="text-sm font-black text-[#0c2340] uppercase tracking-wider">Bases de Conhecimento (apenas leitura)</span>
              </div>
              <button onClick={() => setIsManageKnowledgeOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer bg-slate-50 rounded-full border-0">✕</button>
            </div>

            <div className="space-y-3 font-sans">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Título da Base</label>
                <input type="text" placeholder="Ex: Regulamento Interno AGT..." value={newKbTitle} onChange={(e) => setNewKbTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-800" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Categoria</label>
                <select className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-800 outline-none cursor-pointer">
                  <option>FAQ</option>
                  <option>Procedimentos e Portarias</option>
                  <option>Leis e Regulamentos</option>
                  <option>Formulários e Modelos</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Estimativa de Documentos</label>
                <input type="text" placeholder="Ex: 1.500" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-800 font-mono" />
              </div>

              <div className="p-3 bg-slate-50 text-slate-600 rounded-xl space-y-1 text-left border border-slate-200">
                <span className="text-[10px] font-black block uppercase tracking-wider">ℹ️ Gestão feita por cada instituição</span>
                <span className="text-[9px] block font-semibold leading-normal">
                  As bases de conhecimento entram na plataforma pela área da própria instituição (separador «Base de Conhecimento») — esta consola central é apenas de leitura.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button onClick={() => setIsManageKnowledgeOpen(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer border-0">
                Voltar
              </button>
              <button onClick={handleAddKb} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer border-0 shadow-sm">
                Percebi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GERIR MODELOS */}
      {isManageModelsOpen && (
        <div className="fixed inset-0 bg-[#0c2340]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-[24px] max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-left space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-150">
              <div className="flex items-center gap-2">
                <Bot className="text-indigo-600 animate-pulse" size={20} />
                <span className="text-sm font-black text-[#0c2340] uppercase tracking-wider text-left">Federação dos Modelos LLM</span>
              </div>
              <button onClick={() => setIsManageModelsOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer bg-slate-50 rounded-full border-0">✕</button>
            </div>

            <div className="text-xs text-slate-500 font-medium leading-relaxed space-y-3">
              <p>O Correio Digital de Angola utiliza redundância activa de LLMs via Groq para garantir custos escaláveis, baixa latência e conformidade de dados. O modelo activo serve como padrão para todas as instituições federadas.</p>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {modelsList.map(m => (
                  <div key={m.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-slate-800">
                    <div className="text-left font-sans">
                      <span className="text-xs font-black block">{m.name}</span>
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">{m.maker} • {m.model}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                          m.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>{m.status}</span>
                        <span className="text-[9px] text-slate-400">⏱ {m.responseTime}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{m.cost === '—' ? '—' : `${m.cost}/h`}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => selectActiveModel(m.id, m.name)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer border-0 transition-colors shrink-0 ${
                        m.isDefault 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      }`}
                    >
                      {m.isDefault ? 'Activo' : 'Ativar'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-250 text-amber-900 text-[10px] sm:text-[11px] font-semibold leading-relaxed text-left flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold uppercase tracking-wide block">Taxas e Regulação de Tokens</span>
                  <span>O modelo Llama 3.1 8B Instant é o mais económico e rápido, ideal para operações do dia-a-dia. Llama 3.3 70B oferece melhor qualidade para questões complexas. Gemini Live é usado para interação por voz em tempo real.</span>
                </div>
              </div>
            </div>

            <button onClick={() => setIsManageModelsOpen(false)} className="w-full py-3 bg-[#0c2340] hover:bg-[#1a3a60] text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer border-0">
              Concluir
            </button>
          </div>
        </div>
      )}

      {/* MODAL: TESTAR IA (LIVE CHAT SANDBOX) */}
      {isTestModalOpen && (
        <div className="fixed inset-0 bg-[#0c2340]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
          <div className="bg-white rounded-[28px] max-w-xl w-full p-6 shadow-2xl border border-slate-100 text-left flex flex-col h-[520px]">
            
            <div className="flex items-center justify-between pb-3 border-b border-gray-150 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold relative shrink-0">
                  <Bot size={20} />
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full absolute -top-0.5 -right-0.5 border-2 border-white animate-pulse" />
                </div>
                <div className="text-left font-sans">
                  <span className="text-xs font-black text-[#0c2340] block uppercase tracking-wide">Testar Assistente IA Nacional</span>
                  <span className="text-[10px] text-slate-400 font-bold block">Canal Federado • Modelo: {mainModel} • Groq API</span>
                </div>
              </div>
              <button onClick={() => { playSound('click'); setIsTestModalOpen(false); }} className="p-1 px-2 text-slate-400 hover:text-slate-600 cursor-pointer bg-slate-50 rounded-full border-0 text-sm font-black">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs">
              {testMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-4 rounded-2xl max-w-[85%] text-left ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/50'
                  }`}>
                    <span className="block font-sans whitespace-pre-line">{msg.text}</span>
                  </div>
                </div>
              ))}

              {isAiTyping && (
                <div className="flex justify-start">
                  <div className="p-3 bg-slate-100 text-slate-500 rounded-2xl rounded-tl-none border border-slate-200/50 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-indigo-500" />
                    <span className="text-[10px] font-bold">Groq a processar vetores...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pb-3 flex flex-wrap gap-1.5 shrink-0">
              {[
                'Quais os documentos para o NIF?',
                'Agendar BI no SME',
                'Vacinas do MINSA?',
                'Como pagar multas AGT',
              ].map(s => (
                <button key={s} onClick={() => { playSound('click'); setTestInput(s); }} className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer border-0 transition-all">
                  {s}
                </button>
              ))}
            </div>

            <div className="flex gap-2 shrink-0 border-t border-slate-100 pt-3">
              <input
                type="text"
                placeholder="Introduza a sua pergunta operacional..."
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && testInput.trim()) {
                    playSound('click');
                    const text = testInput;
                    setTestMessages(prev => [...prev, { sender: 'user', text }]);
                    setTestInput('');
                    simulateAiResponse(text);
                  }
                }}
                className="flex-1 bg-slate-50 border border-slate-200 px-4 py-3 text-xs rounded-xl outline-none text-slate-800"
              />
              <button
                onClick={() => {
                  if (!testInput.trim()) return;
                  playSound('click');
                  const text = testInput;
                  setTestMessages(prev => [...prev, { sender: 'user', text }]);
                  setTestInput('');
                  simulateAiResponse(text);
                }}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider border-0 cursor-pointer"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}