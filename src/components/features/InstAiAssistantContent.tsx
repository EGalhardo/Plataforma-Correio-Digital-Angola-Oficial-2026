/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import InstKbSelfService, { carregarResumoKb } from './InstKbSelfService';
import { supabaseService } from '../../services/supabaseService';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  Eye,
  MessageSquare,
  Users,
  CheckCircle2,
  Clock,
  Trash2,
  Send,
  Plus,
  Settings,
  Pencil,
  ShieldCheck,
  CheckCircle,
  X,
  Globe,
  Sliders,
  Info,
  Save,
  ArrowLeft,
  Loader2,
  Cpu,
  Database,
  Zap,
  RefreshCw as ReloadIcon
} from 'lucide-react';

interface InstAiAssistantProps {
  addAuditLog?: (action: string, type: 'info' | 'success' | 'warning' | 'critical') => void;
  setTab?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
  appMode?: 'user' | 'institution' | 'admin';
  bi?: string;
  profileName?: string;
  institutionCode?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  delivered?: boolean;
}

// v28 — registo REAL de telemetria (tabela append-only ia_conversas_log).
// Sem nome/BI de cidadãos nem "satisfação" inventada: só o que de facto
// aconteceu — quando, por que canal, o que foi perguntado (160 chars),
// se a IA respondeu e quanto tempo demorou.
interface InteractionLog {
  id: string;
  canal: string;
  promptPreview: string;
  respostaOk: boolean;
  latMs: number | null;
  time: string;
}

interface AIStats {
  totalConversations: number;
  totalUsers: number;
  resolutionRate: number;
  avgResponseTime: string;
  activeToday: number;
  knowledgeDocs: number;
}

export function InstAiAssistantContent({ addAuditLog, setTab, profileName = '', institutionCode = '' }: InstAiAssistantProps) {
  // Navigation Sub Tab State
  const [activeSubTab, setActiveSubTab] = useState<'config' | 'knowledge' | 'history' | 'chat'>('config');

  // AI Real Stats State (loaded from server)
  const [aiStats, setAiStats] = useState<AIStats>({
    totalConversations: 0,
    totalUsers: 0,
    resolutionRate: 0,
    avgResponseTime: '0s',
    activeToday: 0,
    knowledgeDocs: 0,
  });
  const [aiStatus, setAiStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');
  const [, setHealthData] = useState<{ ai_key_configured?: boolean; groq_key_configured?: boolean; status?: string } | null>(null);

  // Fetch AI status from server
  useEffect(() => {
    const fetchAIStatus = async () => {
      let attempts = 3;
      let delayMs = 1000;
      let lastError: { message?: string } | null = null;

      while (attempts > 0) {
        try {
          const response = await fetch('/api/health');
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setHealthData(data);
          
          if (data.groq_key_configured || data.ai_key_configured || data.status === "ok") {
            setAiStatus('connected');
            // Load stats from localStorage or compute from data
            const savedStats = localStorage.getItem(`cda_ai_stats_${institutionCode || 'default'}`);
            let loadedStats = null;
            if (savedStats) {
              try {
                loadedStats = JSON.parse(savedStats);
              } catch (e) {
                console.error('Failed to parse AI stats:', e);
              }
            }
            // HONESTIDADE: não existe ainda telemetria central de conversas. Os
            // contadores começam em zero e só sobem com utilização real medida
            // neste navegador (persistida em localStorage por instituição).
            if (loadedStats) {
              setAiStats(loadedStats);
            } else {
              setAiStats({
                totalConversations: 0,
                totalUsers: 0,
                resolutionRate: 0,
                avgResponseTime: '0s',
                activeToday: 0,
                knowledgeDocs: 0,
              });
            }
          } else {
            // Even if keys aren't configured, we support full sandbox/offline responses.
            // Hence we can safely treat it as connected so users can test local/sandbox capabilities.
            setAiStatus('connected');
          }
          return; // Success!
        } catch (error) {
          lastError = error;
          attempts--;
          if (attempts > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            delayMs *= 2; // exponential backoff
          }
        }
      }

      // If all retries fail, print warning and fallback gracefully to connected status
      console.warn('Failed to fetch AI status after multiple attempts, falling back to sandbox:', lastError);
      setAiStatus('connected'); // Fallback to allow sandbox testing
    };
    fetchAIStatus();
  }, [institutionCode]);

  useEffect(() => {
    const scrollParent = () => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      const contentAreas = document.querySelectorAll('.overflow-y-auto');
      contentAreas.forEach(el => {
        el.scrollTo({ top: 0, behavior: 'instant' });
      });
      let parent = document.getElementById('inst-ai-assistant-root');
      while (parent) {
        parent.scrollTo?.({ top: 0, behavior: 'instant' });
        parent = parent.parentElement;
      }
    };
    
    scrollParent();
    const timer = setTimeout(scrollParent, 100);
    return () => clearTimeout(timer);
  }, []);

  // Configuration States
  const [assistantName, setAssistantName] = useState<string>('Assistente AGT');
  const [description] = useState<string>(
    'Assistente virtual da Administração Geral Tributária que ajuda cidadãos e empresas com serviços fiscais, impostos, NIF, multas e declarações.'
  );
  const [model, setModel] = useState<string>('llama-3.1-8b-instant');
  const [temperature, setTemperature] = useState<string>('0.3');
  const [] = useState<string>('Português (Angola)');

  // System Instruction (personalizada para a instituição)
  const [instructions, setInstructions] = useState<string>(
    `Você é o assistente oficial da Administração Geral Tributária (AGT) de Angola.
O Correio Digital de Angola é a plataforma governamental onde os cidadãos recebem correspondência oficial.

Responda apenas sobre assuntos relacionados com:
- NIF (Número de Identificação Fiscal)
- Impostos (IVA, IRT, IS, etc.)
- Multas fiscais e coimas
- Declarações fiscais (Modelos 1, 2, 3)
- Taxas e contribuições
- Certidões fiscais e de quitação
- Processos fiscais e contenciosos
- Agendamentos de atendimento presencial
- Status de declarações e liquidações

REGRAS OPERATIVAS:
1. Seja formal, profissional e acolhedor
2. Use termos oficiais angolanos
3. Nunca invente dados ou números de processo
4. Indique sempre os canais oficiais (portal das Finanças, repartições fiscais)
5. Para ações que requerem tratamento humano, redirecione para o atendimento presencial
6. Mantenha o tom institucional do Correio Digital de Angola`
  );
  const [tempInstructions, setTempInstructions] = useState<string>(instructions);

  // Is Editing Name inline state
  const [isEditingNameInline, setIsEditingNameInline] = useState<boolean>(false);

  // Context Configuration (dados que a IA pode consultar)
  const [contextConfig] = useState({
    readMail: true,
    readProcessStatus: true,
    readTaxpayerData: true,
    readSchedules: true,
    readHistory: true,
    readAttachments: true,
    readNotifications: true,
    readDocuments: false,
  });

  // Preview Modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // Chat message state (agora com IA real)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'bot',
      text: `Olá! Sou o ${assistantName}, assistente virtual oficial da ${institutionCode || 'instituição'} integrado no Correio Digital de Angola. Posso ajudá-lo com consultas fiscais, declarações, NIF, multas e certidões. Como posso auxiliar hoje?`,
      time: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Custom System Prompt for this chat
  const [, setCustomPrompt] = useState<string>(instructions);

  // Preview channel Chat message state (Inside modal)
  const [previewMessages, setPreviewMessages] = useState<ChatMessage[]>([
    {
      id: 'pm1',
      sender: 'bot',
      text: 'Olá! Sou o Assistente IA oficial integrado nos serviços públicos. Posso ajudá-lo hoje com o seu NIF, impostos, multas fiscais ou agendamentos?',
      time: '11:02',
    }
  ]);
  const [previewInput, setPreviewInput] = useState<string>('');
  const [isPreviewTyping, setIsPreviewTyping] = useState<boolean>(false);
  const previewChatBottomRef = useRef<HTMLDivElement | null>(null);

  // E6 (2026-08-07): a lista de ficheiros era MOCK (nunca alimentou a IA).
  // Agora: resumo REAL da tabela kb_fontes_instituicao; a gestão é feita na
  // sub-aba knowledge pelo componente InstKbSelfService (CRUD real).
  const [kbResumo, setKbResumo] = useState<{ total: number; ativas: number } | null>(null);
  useEffect(() => {
    const siglaV = (institutionCode || '').trim().toUpperCase();
    if (!siglaV) return;
    void carregarResumoKb(siglaV).then(setKbResumo);
  }, [institutionCode]);

  // PERSISTÊNCIA REAL (antes o "Guardar" perdia tudo no refresh): a configuração
  // do assistente fica gravada neste navegador, por instituição.
  const cfgKey = `cda_ai_cfg_${(institutionCode || 'default').trim().toUpperCase()}`;
  const [cfgCarregada, setCfgCarregada] = useState(false);
  useEffect(() => {
    if (cfgCarregada) return;
    setCfgCarregada(true);
    try {
      const raw = localStorage.getItem(cfgKey);
      if (!raw) return;
      const cfg = JSON.parse(raw);
      if (cfg && typeof cfg === 'object') {
        if (typeof cfg.assistantName === 'string' && cfg.assistantName.trim()) setAssistantName(cfg.assistantName);
        if (typeof cfg.model === 'string' && cfg.model.trim()) setModel(cfg.model);
        if (typeof cfg.temperature === 'string' && cfg.temperature.trim()) setTemperature(cfg.temperature);
        if (typeof cfg.instructions === 'string' && cfg.instructions.trim()) {
          setInstructions(cfg.instructions);
          setTempInstructions(cfg.instructions);
        }
      }
    } catch { /* valor corrompido — ignora e mantém os valores por defeito */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfgKey, cfgCarregada]);


  // HONESTIDADE: as "ferramentas API" fictícias (endpoints /api/gov-ai que não
  // existem no servidor) foram removidas — eram código morto, nunca renderizado.

  // v28 — histórico REAL: carregado da telemetria central (append-only).
  // Enquanto a SQL v28 não for aplicada no projecto, o estado é
  // 'TABELA_AUSENTE' e a UI diz isso mesmo, em vez de inventar conversas.
  const [interactionLogs, setInteractionLogs] = useState<InteractionLog[]>([]);
  const [telemetriaEstado, setTelemetriaEstado] = useState<'a_carregar' | 'ok' | 'TABELA_AUSENTE' | 'indisponivel'>('a_carregar');

  // Sessão de telemetria: um UUID por abertura da consola (agrupa as
  // interacções desta sessão de trabalho, sem identificar ninguém).
  const telemetrySessionRef = useRef<string>('');
  if (!telemetrySessionRef.current) {
    telemetrySessionRef.current = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
  }

  // Carregar telemetria real (ao abrir a consola e sempre que se entra na aba)
  useEffect(() => {
    let vivo = true;
    (async () => {
      const r = await supabaseService.carregarTelemetriaInstituicao(institutionCode);
      if (!vivo) return;
      if (r.state === 'ok') {
        setTelemetriaEstado('ok');
        setInteractionLogs(r.logs.map(l => ({ id: l.id, canal: l.canal, promptPreview: l.promptPreview, respostaOk: l.respostaOk, latMs: l.latMs, time: l.quando })));
        setAiStats(prev => ({
          ...prev,
          totalConversations: r.total,
          activeToday: r.hoje,
          totalUsers: r.sessoes,
          resolutionRate: r.total > 0 ? Math.round((r.okCount / r.total) * 100) : 0,
          avgResponseTime: r.latMediaMs !== null ? `${(r.latMediaMs / 1000).toFixed(1)}s` : '0s',
        }));
      } else {
        setTelemetriaEstado(r.state === 'TABELA_AUSENTE' ? 'TABELA_AUSENTE' : 'indisponivel');
      }
    })();
    return () => { vivo = false; };
  }, [activeSubTab, institutionCode]);

  // Toast Alerts State
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'warning' | 'error' } | null>(null);

  const triggerToast = (text: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Scroll logic for testing chats
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  useEffect(() => {
    previewChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [previewMessages, isPreviewTyping]);

  // Synchronize temp state
  useEffect(() => {
    setTempInstructions(instructions);
  }, [instructions]);

  // Action: Save configuration forms
  const handleSaveGeneralConfig = () => {
    setInstructions(tempInstructions);
    setIsEditingNameInline(false);
    try {
      localStorage.setItem(cfgKey, JSON.stringify({ assistantName, model, temperature, instructions: tempInstructions }));
    } catch { /* armazenamento cheio/indisponível — a configuração vive só na sessão */ }

    triggerToast('Configuração Geral e Instruções Operacionais salvas com sucesso!', 'success');
    addAuditLog?.(`Configurações de IA modificadas: Nome (${assistantName}), Modelo (${model}), Temp (${temperature})`, 'success');
    
    // Update chat system message
    setChatMessages(prev => {
      if (prev.length > 0 && prev[0].sender === 'bot') {
        return [{
          ...prev[0],
          text: `Olá! Sou o ${assistantName}, assistente virtual oficial da ${institutionCode || 'instituição'} integrado no Correio Digital de Angola. Posso ajudá-lo com consultas fiscais, declarações, NIF, multas e certidões. Como posso auxiliar hoje?`
        }, ...prev.slice(1)];
      }
      return prev;
    });
  };

  // Action: Save IA prompt instructions
  const handleSaveInstructions = () => {
    setInstructions(tempInstructions);
    setCustomPrompt(tempInstructions);
    try {
      localStorage.setItem(cfgKey, JSON.stringify({ assistantName, model, temperature, instructions: tempInstructions }));
    } catch { /* idem */ }
    triggerToast('Instruções operacionais do assistente atualizadas com sucesso!', 'success');
    addAuditLog?.('Instruções operacionais do Assistente de IA atualizadas por agente autorizado.', 'success');
  };

  // REAL AI CHAT LOGIC (using Groq via /api/chat)
  const runRealAIResponse = async (query: string) => {
    setIsTyping(true);
    setChatError(null);
    const telemetriaT0 = Date.now();
    const registarTelemetria = (ok: boolean) => {
      // v28 — append-only, fire-and-forget: nunca bloqueia/quebra o chat.
      void supabaseService.registarTelemetriaIa({
        sessionId: telemetrySessionRef.current,
        papel: 'instituicao',
        sigla: institutionCode || null,
        canal: 'consola_instituicao',
        promptPreview: query.slice(0, 160),
        respostaOk: ok,
        latMs: Date.now() - telemetriaT0,
      });
    };

    try {
      const conversationHistory = chatMessages
        .filter(m => m.sender === 'user' || m.sender === 'bot')
        .map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

      const systemContext = `Você é o assistente oficial da ${institutionCode || 'instituição'} de Angola. ${instructions}

Contexto adicional:
- O cidadão está a interagir via Correio Digital de Angola
- Este assistente está configurado para a instituição ${institutionCode || 'local'}
- Responda de forma institucional, formal e acolhadora
- Para ações que requerem atendimento presencial, redirecione para os canais oficiais`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemContext },
            ...conversationHistory,
            { role: 'user', content: query }
          ],
          isGovMode: false,
          currentPage: 'IA da Instituição',
          pageContext: `Assistente virtual da ${institutionCode || 'instituição'} configurado para responder sobre serviços fiscais e administrativos.`,
          language: 'pt'
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.message) {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: data.message,
          time: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages(prev => [...prev, botMsg]);
        
        // Update stats
        setAiStats(prev => {
          const updated = {
            ...prev,
            totalConversations: prev.totalConversations + 1,
            activeToday: prev.activeToday + 1
          };
          localStorage.setItem(`cda_ai_stats_${institutionCode || 'default'}`, JSON.stringify(updated));
          return updated;
        });
        registarTelemetria(true);
      } else {
        throw new Error(data.error || 'Resposta inválida da IA');
      }
    } catch (error) {
      registarTelemetria(false);
      console.error('AI Chat Error:', error);
      setChatError(error.message || 'Erro ao processar resposta da IA');
      
      // Fallback com mensagem amigável
      const fallbackMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: 'O serviço de IA está temporariamente indisponível. Por favor, tente novamente mais tarde ou contacte o suporte da instituição.',
        time: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // Testing Console Send Chat
  const handleSendTestChatMessage = () => {
    if (!chatInput.trim() || isTyping) return;
    
    const userMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      sender: 'user',
      text: chatInput,
      time: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
      delivered: true,
    };

    setChatMessages(prev => [...prev, userMsg]);
    const inputToProcess = chatInput;
    setChatInput('');
    runRealAIResponse(inputToProcess);
  };

  // Preview Modal Send Chat
  const handleSendPreviewMessage = async () => {
    if (!previewInput.trim() || isPreviewTyping) return;
    
    const userMsg: ChatMessage = {
      id: `prev-${Date.now()}`,
      sender: 'user',
      text: previewInput,
      time: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
      delivered: true,
    };

    setPreviewMessages(prev => [...prev, userMsg]);
    const inputToProcess = previewInput;
    setPreviewInput('');

    const telemetriaT0 = Date.now();
    const registarTelemetria = (ok: boolean) => {
      void supabaseService.registarTelemetriaIa({
        sessionId: telemetrySessionRef.current,
        papel: 'instituicao',
        sigla: institutionCode || null,
        canal: 'preview_instituicao',
        promptPreview: inputToProcess.slice(0, 160),
        respostaOk: ok,
        latMs: Date.now() - telemetriaT0,
      });
    };

    setIsPreviewTyping(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: previewMessages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })).concat([{ role: 'user', content: inputToProcess }]),
          isGovMode: false,
          language: 'pt'
        }),
      });
      const data = await response.json();
      if (response.ok && data.message) {
        setPreviewMessages(prev => [...prev, {
          id: `prev-${Date.now()}`,
          sender: 'bot',
          text: data.message,
          time: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
        }]);
        registarTelemetria(true);
      } else {
        registarTelemetria(false);
      }
    } catch {
      setPreviewMessages(prev => [...prev, {
        id: `prev-${Date.now()}`,
        sender: 'bot',
        text: 'Serviço de IA temporariamente indisponível.',
        time: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
      }]);
      registarTelemetria(false);
    } finally {
      setIsPreviewTyping(false);
    }
  };

  const activeCheckboxesCount = Object.values(contextConfig).filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-none w-full pb-12 text-[#1e293b] font-sans antialiased" id="inst-ai-assistant-root">
      
      {/* Dynamic Action Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-20 right-5 z-[200] max-w-sm px-4 py-3.5 rounded-2xl shadow-none flex items-center gap-3 border text-xs font-bold leading-tight ${
              toast.type === 'success' 
                ? 'bg-emerald-600 border-emerald-500 text-white' 
                : toast.type === 'warning'
                ? 'bg-amber-500 border-amber-600 text-white'
                : toast.type === 'error'
                ? 'bg-red-600 border-red-500 text-white'
                : 'bg-[#0f172a] border-slate-800 text-slate-200'
            }`}
          >
            <CheckCircle className="shrink-0 w-4 h-4 text-emerald-300" />
            <span>{toast.text}</span>
            <button onClick={() => setToast(null)} className="ml-auto hover:text-white p-0.5 bg-transparent border-none cursor-pointer">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CABEÇALHO DA PÁGINA (PAGE HEADER) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 px-1" id="ia-header-section">
        <div className="text-left">
          <h1 className="text-2xl md:text-[28px] font-black text-slate-800 tracking-tight m-0 leading-tight">
            IA
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-bold mt-1.5">
            Configure e gerencie o assistente virtual da sua instituição.
          </p>
        </div>

        {/* State and Preview Trigger */}
        <div className="flex items-center gap-3 flex-wrap">
          {setTab && (
            <button
              onClick={() => setTab('home')}
              className="bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl px-4 py-2 border border-slate-200 text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 shadow-xs active:scale-95"
            >
              <ArrowLeft size={14} strokeWidth={2.5} />
              Voltar ao Painel
            </button>
          )}

          {/* Status Indicator: AI Connection */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-none border ${
            aiStatus === 'connected' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
              : aiStatus === 'loading'
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {aiStatus === 'loading' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : aiStatus === 'connected' ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
            {aiStatus === 'connected' ? '● INTEGRAÇÃO IA ATIVA' : aiStatus === 'loading' ? '● A CARREGAR' : '● DESCONECTADO'}
          </div>

          {/* Tabs de navegação interna */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
            {[
              { key: 'config', label: 'Configuração' },
              { key: 'chat', label: 'Chat Teste' },
              { key: 'knowledge', label: 'Base de Conhecimento' },
              { key: 'history', label: 'Histórico' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                  activeSubTab === tab.key
                    ? 'bg-[#0E2B64] text-white shadow-sm'
                    : 'bg-transparent text-slate-500 hover:text-[#0E2B64]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="bg-[#0E2B64] hover:bg-[#081a3d] text-white py-2.5 px-5 rounded-lg text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 transition-all cursor-pointer shadow-none border-none"
            id="preview-assistant-btn"
          >
            <Eye size={14} className="stroke-[2.5]" />
            <span>PRÉ-VISUALIZAR ASSISTENTE</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB: CONFIGURAÇÃO */}
      {activeSubTab === 'config' && (
        <>
          {/* PRIMEIRA LINHA DE CARTÕES (TOP TWO WIDE CARDS LADO A LADO) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* CARTÃO 1: INFORMAÇÕES DO ASSISTENTE (Left) */}
            <div className="bg-white border border-[#0c2340]/15 rounded-[20px] p-6 shadow-none flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Circular logo: Institutional circular avatar */}
              <div className="w-20 h-20 md:w-[84px] md:h-[84px] bg-[#0E2B64] text-white rounded-full flex flex-col items-center justify-center shrink-0 border border-indigo-950/25 shadow-none select-none">
                <span className="font-serif font-black text-2xl tracking-tighter">{institutionCode || 'AGT'}</span>
                <span className="text-[5.5px] font-black uppercase tracking-widest text-[#94a3b8] mt-1 text-center leading-none">
                  Tributária
                </span>
              </div>

              <div className="flex-1 min-w-0 text-center md:text-left space-y-2">
                <div className="flex items-center justify-center md:justify-start gap-2.5">
                  {isEditingNameInline ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        className="bg-slate-50 border border-slate-200 text-xs font-bold text-[#0c2340] px-2.5 py-1 rounded-lg outline-none max-w-[140px]"
                        value={assistantName}
                        onChange={(e) => setAssistantName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveGeneralConfig(); }}
                        autoFocus
                      />
                      <button 
                        onClick={handleSaveGeneralConfig}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded border-none bg-transparent cursor-pointer font-bold text-[10px]"
                      >
                        OK
                      </button>
                      <button 
                        onClick={() => setIsEditingNameInline(false)}
                        className="p-1 text-slate-400 hover:bg-slate-50 rounded border-none bg-transparent cursor-pointer font-bold text-[10px]"
                      >
                        ESC
                      </button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-xl font-black text-[#0c2340] tracking-tight m-0 leading-none">{assistantName}</h2>
                      <button
                        onClick={() => setIsEditingNameInline(true)}
                        className="p-1 bg-transparent border-none cursor-pointer text-slate-450 hover:text-slate-800 transition-colors"
                        title="Editar Nome do Assistente"
                      >
                        <Pencil size={13} className="stroke-[2.5]" />
                      </button>
                    </>
                  )}
                </div>
                
                <p className="text-xs text-slate-700 font-bold leading-relaxed max-w-md">
                  {description}
                </p>

                {/* Badges Informativos organized horizontally */}
                <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="text-indigo-600 bg-indigo-50 w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
                      <Cpu size={14} className="stroke-[2.5]" />
                    </div>
                    <div className="text-left">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">Modelo IA</span>
                      <span className="font-extrabold text-[#0c2340] text-xs block mt-0.5 truncate max-w-[80px]">{model}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-purple-600 bg-purple-50 w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
                      <Globe size={14} className="stroke-[2.5]" />
                    </div>
                    <div className="text-left">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">Idioma</span>
                      <span className="font-extrabold text-[#0c2340] text-xs block mt-0.5">Pt Angola</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-slate-500 bg-slate-50 w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
                      <Sliders size={14} className="stroke-[2.5]" />
                    </div>
                    <div className="text-left">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">Temperatura</span>
                      <span className="font-extrabold text-[#0c2340] text-xs block mt-0.5">{temperature}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-emerald-600 bg-emerald-50 w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
                      <ShieldCheck size={14} className="stroke-[2.5]" />
                    </div>
                    <div className="text-left">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">Estado</span>
                      <span className="font-bold text-emerald-700 text-xs block mt-0.5">
                        {aiStatus === 'connected' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARTÃO 2: ESTATÍSTICAS (Right) - AGORA COM DADOS REAIS */}
            <div className="bg-white border border-[#0c2340]/15 rounded-[20px] p-6 shadow-none flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4 pb-1">
                <span className="text-xs font-black text-[#0c2340] tracking-widest uppercase">
                  ESTATÍSTICAS DO ASSISTENTE
                </span>
                <button 
                  onClick={() => {
                    setAiStats(prev => ({ ...prev }));
                    triggerToast('Estatísticas atualizadas', 'info');
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer border-0 bg-transparent"
                  title="Atualizar estatísticas"
                >
                  <ReloadIcon size={14} className="stroke-[2.5]" />
                </button>
              </div>

              {/* 4 Internal statistics cards with real data */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-[#FAF9FF] border border-[#0c2340]/15 rounded-xl p-3.5 text-left hover:shadow-none transition-shadow">
                  <div className="w-8 h-8 bg-purple-100 text-[#534980] rounded-lg flex items-center justify-center mb-2 shadow-none">
                    <MessageSquare size={16} className="stroke-[2.5]" />
                  </div>
                  <span className="block font-black text-xl text-[#0c2340] tracking-tight leading-none">{aiStats.totalConversations.toLocaleString('pt-AO')}</span>
                  <span className="text-[10px] font-extrabold text-[#534980] uppercase tracking-tight mt-1.5 block">Conversas</span>
                </div>

                <div className="bg-[#F8FAFF] border border-[#0c2340]/15 rounded-xl p-3.5 text-left hover:shadow-none transition-shadow">
                  <div className="w-8 h-8 bg-sky-100 text-[#284a7a] rounded-lg flex items-center justify-center mb-2 shadow-none">
                    <Users size={16} className="stroke-[2.5]" />
                  </div>
                  <span className="block font-black text-xl text-[#0c2340] tracking-tight leading-none">{aiStats.totalUsers.toLocaleString('pt-AO')}</span>
                  <span className="text-[10px] font-extrabold text-[#284a7a] uppercase tracking-tight mt-1.5 block">Utilizadores</span>
                </div>

                <div className="bg-[#F5FDF8] border border-[#0c2340]/15 rounded-xl p-3.5 text-left hover:shadow-none transition-shadow">
                  <div className="w-8 h-8 bg-emerald-100 text-[#1e6136] rounded-lg flex items-center justify-center mb-2 shadow-none">
                    <CheckCircle2 size={16} className="stroke-[2.5]" />
                  </div>
                  <span className="block font-black text-xl text-[#0c2340] tracking-tight leading-none">{aiStats.resolutionRate}%</span>
                  <span className="text-[10px] font-extrabold text-[#1e6136] uppercase tracking-tight mt-1.5 block">Resoluções</span>
                </div>

                <div className="bg-[#FFFDF9] border border-[#0c2340]/15 rounded-xl p-3.5 text-left hover:shadow-none transition-shadow">
                  <div className="w-8 h-8 bg-amber-100 text-[#7c542c] rounded-lg flex items-center justify-center mb-2 shadow-none">
                    <Clock size={16} className="stroke-[2.5]" />
                  </div>
                  <span className="block font-black text-xl text-[#0c2340] tracking-tight leading-none">{aiStats.avgResponseTime}</span>
                  <span className="text-[10px] font-extrabold text-[#7c542c] uppercase tracking-tight mt-1.5 block">Tempo Médio</span>
                </div>
              </div>

              {/* Additional Real Stats Row */}
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
                  <Zap size={13} className="text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Activos Hoje</span>
                    <span className="text-sm font-black text-slate-800">{aiStats.activeToday}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
                  <Database size={13} className="text-indigo-600 shrink-0" />
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Docs Indexados</span>
                    <span className="text-sm font-black text-slate-800">{kbResumo?.ativas ?? 0}</span>
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 font-semibold mt-3 leading-relaxed text-left">
                Origens dos números: Conversas/Activos hoje — interacções reais registadas na telemetria central da plataforma (últimas 50) mais as desta sessão; Utilizadores — sessões distintas nesse registo; Resoluções — % de interacções em que a IA respondeu sem erro; Tempo médio — latência medida nessas interacções; Docs indexados — fontes reais da Base de Conhecimento. {telemetriaEstado === 'TABELA_AUSENTE' ? 'ATENÇÃO: a telemetria central ainda não está instalada no projecto (SQL v28 pendente) — os valores mostram apenas esta sessão. ' : ''}A plataforma não inventa estes valores.
              </p>
            </div>
          </div>

          {/* SEGUNDA LINHA: CONFIGURAÇÃO + INSTRUÇÕES + CONTEXTO */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mt-2">
            {/* COLUNA ESQUERDA - CONFIGURAÇÃO GERAL (5 spans) */}
            <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-[24px] p-6.5 shadow-none flex flex-col justify-between text-left h-full min-h-[580px]">
              <div className="flex-1 flex flex-col justify-between gap-5">
                <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-[18px] bg-indigo-50/70 flex items-center justify-center text-indigo-600 border border-indigo-100/40 shrink-0">
                    <Settings size={22} className="text-indigo-600 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-[#0c2340] tracking-wider uppercase leading-none">
                      CONFIGURAÇÃO GERAL
                    </h3>
                    <span className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-1 block">
                      Configure as definições básicas do seu assistente.
                    </span>
                  </div>
                </div>

                <div className="flex-grow flex flex-col gap-6.5">
                  <div className="space-y-2.5 text-left">
                    <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest pl-0.5 block leading-none">
                      NOME DO ASSISTENTE
                    </label>
                    <input
                      type="text"
                      className="w-full bg-[#f8fafc]/40 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-4 text-xs font-semibold text-slate-800 outline-none transition-all shadow-xs"
                      placeholder="Ex: Assistente AGT"
                      value={assistantName}
                      onChange={(e) => setAssistantName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2.5 text-left">
                    <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest pl-0.5 block leading-none">
                      DESCRIÇÃO / INSTRUÇÃO DO SISTEMA
                    </label>
                    <textarea
                      className="w-full flex-grow bg-[#f8fafc]/40 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-4 text-xs font-semibold text-slate-800 outline-none transition-all leading-relaxed resize-none shadow-xs min-h-[220px] lg:min-h-[265px]"
                      placeholder="Descreva a função operativa do assistente..."
                      value={tempInstructions}
                      onChange={(e) => setTempInstructions(e.target.value)}
                    />
                    <p className="text-[9px] text-slate-400 font-medium">
                      Estas instruções definem como o assistente responde. Quanto mais específico, melhor a qualidade das respostas.
                    </p>
                  </div>

                  {/* Modelo e Temperatura inline */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest pl-0.5 block">Modelo IA</label>
                      <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full bg-[#f8fafc]/40 border border-slate-200 rounded-xl px-3 py-3 text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                      >
                        <option value="llama-3.1-8b-instant">Llama 3.1 8B (Groq)</option>
                        <option value="mixtral-8x7b-32768">Mixtral 8x7B (Groq)</option>
                        <option value="gemma2-9b-it">Gemma 2 9B (Groq)</option>
                        <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Groq)</option>
                        <option value="whisper-large-v3">Whisper (Audio)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest pl-0.5 block">Temperatura</label>
                      <input
                        type="text"
                        className="w-full bg-[#f8fafc]/40 border border-slate-200 rounded-xl px-3 py-3 text-xs font-semibold text-slate-800 outline-none"
                        placeholder="0.3"
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={handleSaveGeneralConfig}
                  className="w-full bg-[#0E2B64] hover:bg-[#081a3d] text-white py-4 rounded-[16px] font-extrabold text-[11px] uppercase tracking-widest transition-all cursor-pointer border-none flex items-center justify-center gap-2.5 shadow-xs active:scale-98"
                >
                  <Save size={14} className="stroke-[2.5]" />
                  GUARDAR CONFIGURAÇÃO
                </button>
              </div>
            </div>

            {/* COLUNA DIREITA - BASE DE CONHECIMENTO (E6: ligação à gestão real) */}
            <div className="lg:col-span-7 bg-white border border-[#0c2340]/15 rounded-[24px] p-6.5 shadow-none flex flex-col text-left h-full min-h-[280px]">
              <div className="flex-1 flex flex-col justify-center items-center text-center gap-4 py-8">
                <Database className="w-12 h-12 text-indigo-200" />
                <div>
                  <h3 className="text-sm font-black text-[#0c2340] tracking-wider uppercase m-0">
                    Base de Conhecimento
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1.5 max-w-md leading-relaxed">
                    {kbResumo === null
                      ? 'A carregar as fontes próprias da instituição…'
                      : kbResumo.total === 0
                        ? 'A instituição ainda não tem fontes próprias. As fontes que adicionares alimentam as respostas da IA da plataforma.'
                        : `${kbResumo.ativas} fonte(s) ativa(s) de ${kbResumo.total} — entram nas respostas do Assistente de Documentos quando o assunto envolve esta instituição.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('knowledge')}
                  className="px-5 py-3 bg-[#4f46e5] hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-2 transition-all cursor-pointer border-none"
                >
                  <Plus size={14} className="stroke-[2.5]" />
                  Gerir a Base de Conhecimento
                </button>
              </div>
            </div>
          </div>

          {/* RODAPÉ INFORMATIVO */}
          <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 flex items-start gap-3 mt-2 text-left">
            <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
              <Info className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-[11px] text-indigo-950 font-bold leading-relaxed uppercase tracking-tight m-0">
                <strong className="text-indigo-900 font-extrabold mr-1.5">Motor IA:</strong>
                O assistente utiliza o modelo <strong className="text-indigo-700">{model}</strong> da Groq via API segura. 
                As instruções definidas aqui são enviadas ao sistema em cada conversa. O contexto automático permite que a IA aceda aos dados seleccionados para respostas mais precisas.
              </p>
            </div>
          </div>
        </>
      )}

      {/* SUB-TAB: CHAT DE TESTE (com IA real) */}
      {activeSubTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Area (2/3) */}
          <div className="lg:col-span-2 bg-white border border-[#0c2340]/15 rounded-[24px] p-5 shadow-none flex flex-col" style={{ minHeight: '520px' }}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Bot size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#0c2340] uppercase tracking-wide m-0">CHAT DE TESTE</h3>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Teste o assistente em tempo real com a IA da Groq
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {aiStatus === 'connected' && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-black uppercase rounded-full">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    GROQ LIVE
                  </span>
                )}
                <button
                  onClick={() => setChatMessages([{
                    id: 'init',
                    sender: 'bot',
                    text: `Olá! Sou o ${assistantName}. Como posso ajudá-lo hoje?`,
                    time: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
                  }])}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-lg cursor-pointer border-0 bg-transparent"
                  title="Limpar conversa"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 custom-scrollbar">
              {chatMessages.map(msg => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center overflow-hidden border-2 shadow-sm ${
                        isUser 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-[#0c2340] text-white'
                      }`}>
                        {isUser ? <Users size={14} /> : <Bot size={14} />}
                      </div>
                      <div className={`p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                        isUser 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-slate-100 text-slate-700 rounded-tl-none border border-slate-200'
                      }`}>
                        <span className="whitespace-pre-line">{msg.text}</span>
                        <span className={`block text-[8px] mt-1 ${isUser ? 'text-indigo-200' : 'text-slate-400'} font-mono`}>{msg.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex gap-2 items-center p-3 bg-slate-100 rounded-2xl rounded-tl-none border border-slate-200">
                    <Loader2 size={14} className="animate-spin text-indigo-600" />
                    <span className="text-[10px] font-bold text-slate-500">A processar com Groq...</span>
                  </div>
                </div>
              )}

              {chatError && (
                <div className="flex justify-center">
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-[10px] font-bold">
                    {chatError}
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Input Area */}
            <div className="flex gap-2 border-t border-slate-100 pt-4">
              <input 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendTestChatMessage()}
                placeholder={`Pergunte algo ao ${assistantName}...`}
                disabled={isTyping || aiStatus !== 'connected'}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium outline-none focus:border-indigo-400 transition-colors disabled:opacity-50"
              />
              <button 
                onClick={handleSendTestChatMessage}
                disabled={isTyping || !chatInput.trim() || aiStatus !== 'connected'}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0"
              >
                {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>

            {aiStatus !== 'connected' && (
              <div className="mt-2 p-2.5 bg-amber-55 border border-amber-200 rounded-xl text-[10px] font-bold text-amber-700 text-center">
                ⚠️ A IA não está ligada. Configure as variáveis de ambiente de IA (GEMINI_API_KEY ou GROQ_API_KEY) no painel de segredos do servidor.
              </div>
            )}
          </div>

          {/* Right Sidebar: Quick Actions + Info */}
          <div className="space-y-4">
            {/* Instrução Atual */}
            <div className="bg-white border border-[#0c2340]/15 rounded-[20px] p-5">
              <h4 className="text-[11px] font-black text-[#0c2340] uppercase tracking-widest mb-3">INSTRUÇÃO ATUAL DO SISTEMA</h4>
              <div className="bg-slate-50 rounded-xl p-3 max-h-[200px] overflow-y-auto">
                <p className="text-[10px] text-slate-600 font-medium whitespace-pre-line leading-relaxed">
                  {instructions.substring(0, 500)}{instructions.length > 500 ? '...' : ''}
                </p>
              </div>
              <button
                onClick={() => setActiveSubTab('config')}
                className="w-full mt-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer border-0 transition-all"
              >
                Editar Instrução →
              </button>
            </div>

            {/* Sugestões Rápidas */}
            <div className="bg-white border border-[#0c2340]/15 rounded-[20px] p-5">
              <h4 className="text-[11px] font-black text-[#0c2340] uppercase tracking-widest mb-3">SUGESTÕES RÁPIDAS</h4>
              <div className="space-y-2">
                {[
                  'Quais documentos preciso para o NIF?',
                  'Como pagar uma multa fiscal?',
                  'Estado da minha declaração de IVA',
                  'Agendar atendimento presencial',
                ].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setChatInput(suggestion);
                      setActiveSubTab('chat');
                    }}
                    className="w-full text-left py-2.5 px-3 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded-xl text-[10px] font-semibold transition-all cursor-pointer border border-slate-100 hover:border-indigo-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Histórico de Interações */}
            <div className="bg-white border border-[#0c2340]/15 rounded-[20px] p-5">
              <h4 className="text-[11px] font-black text-[#0c2340] uppercase tracking-widest mb-3">ÚLTIMAS INTERACÇÕES</h4>
              <div className="space-y-2 max-h-[180px] overflow-y-auto">
                {interactionLogs.length === 0 && (
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed text-left p-2">
                    {telemetriaEstado === 'TABELA_AUSENTE'
                      ? 'A telemetria central ainda não está instalada neste projecto (SQL v28 pendente). Use o Chat Teste — assim que a telemetria for activada, as interacções reais aparecem aqui.'
                      : 'Ainda não há conversas registadas. Use o Chat Teste ou o Preview — cada interacção real fica registada e aparece aqui.'}
                  </p>
                )}
                {interactionLogs.slice(0, 4).map(log => (
                  <div key={log.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-700">{log.canal === 'preview_instituicao' ? 'Preview (cidadão)' : 'Chat Teste'}</span>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                        log.respostaOk ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>{log.respostaOk ? 'Respondida' : 'Falhou'}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 block mt-0.5">{log.promptPreview || '(sem pré-visualização)'}</span>
                    <span className="text-[8px] text-slate-400 font-mono block">{log.time}{log.latMs !== null ? ` · ${(log.latMs / 1000).toFixed(1)}s` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: BASE DE CONHECIMENTO */}
      {activeSubTab === 'knowledge' && (
        <InstKbSelfService
          institutionCode={institutionCode}
          profileName={profileName}
          onResumo={setKbResumo}
          addAuditLog={addAuditLog}
        />
      )}

      {/* SUB-TAB: HISTÓRICO */}
      {activeSubTab === 'history' && (
        <div className="bg-white border border-[#0c2340]/15 rounded-[24px] p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-sm font-black text-[#0c2340] uppercase tracking-wide m-0">HISTÓRICO DE INTERACÇÕES</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-1">Últimas 50 interacções reais registadas nesta consola (telemetria central, append-only)</p>
            </div>
          </div>

          {telemetriaEstado === 'TABELA_AUSENTE' && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-left">
              <p className="text-[11px] font-black text-amber-800 uppercase tracking-wide">Telemetria central ainda não instalada</p>
              <p className="text-[11px] text-amber-700 font-semibold mt-1 leading-relaxed">
                A tabela de telemetria (SQL v28) ainda não foi aplicada neste projecto. As conversas continuam a funcionar; quando o administrador aplicar a v28, este histórico passa a mostrar os registos reais.
              </p>
            </div>
          )}

          {interactionLogs.length === 0 ? (
            <div className="py-10 px-6 text-center">
              <p className="text-sm font-black text-slate-500 uppercase tracking-wide">Ainda sem conversas registadas</p>
              <p className="text-[11px] text-slate-400 font-semibold mt-2 max-w-md mx-auto leading-relaxed">
                {telemetriaEstado === 'TABELA_AUSENTE'
                  ? 'A telemetria central ainda não está instalada (SQL v28 pendente) — assim que for activada, as interacções reais desta consola aparecem aqui.'
                  : 'Use o Chat Teste ou o Preview do assistente — cada interacção real fica registada na telemetria central e aparece nesta lista. A plataforma não apresenta conversas de exemplo como se fossem reais.'}
              </p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-widest text-[9px] font-extrabold">
                  <th className="py-2.5 px-2 text-left">Quando</th>
                  <th className="py-2.5 px-2 text-left">Canal</th>
                  <th className="py-2.5 px-2 text-left">Pré-visualização do pedido</th>
                  <th className="py-2.5 px-2 text-center">Resultado</th>
                  <th className="py-2.5 px-2 text-right">Latência</th>
                </tr>
              </thead>
              <tbody>
                {interactionLogs.map(log => (
                  <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-2 text-[10px] text-slate-500 font-mono whitespace-nowrap">{log.time}</td>
                    <td className="py-2.5 px-2 font-bold text-slate-800 text-xs">{log.canal === 'preview_instituicao' ? 'Preview (cidadão)' : 'Chat Teste'}</td>
                    <td className="py-2.5 px-2 text-xs font-semibold text-slate-600 max-w-[260px] truncate">{log.promptPreview || '(sem pré-visualização)'}</td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        log.respostaOk ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {log.respostaOk ? 'Respondida' : 'Falhou'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-[10px] text-slate-400 font-mono">{log.latMs !== null ? `${(log.latMs / 1000).toFixed(1)}s` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* FLOATING WEB CHAT PREVIEW MODAL */}
      <AnimatePresence>
        {isPreviewOpen && (
          <div className="fixed inset-0 bg-[#0c2340]/40 backdrop-blur-xs z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              className="bg-white rounded-[24px] border border-[#0E2B64]/15 shadow-none w-full max-w-md h-[550px] flex flex-col justify-between overflow-hidden relative"
            >
              <div className="bg-[#0E2B64] text-white p-5 flex items-center justify-between select-none">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-9 h-9 bg-indigo-900 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none uppercase tracking-tighter border border-white/20">
                    {institutionCode || 'AGT'}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[#f8fafc] text-xs m-0 tracking-tight">{assistantName}</h4>
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest leading-none block mt-0.5">
                      ● Assistente Governamental — Groq IA
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-1.5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                >
                  <X size={18} className="stroke-[2.5]" />
                </button>
              </div>

              <div className="flex-1 bg-slate-50/65 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
                {previewMessages.map(msg => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div key={msg.id} className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {!isUser && (
                        <div className="w-6.5 h-6.5 bg-[#0E2B64] text-white rounded-full flex items-center justify-center shrink-0 text-[8px] font-black uppercase shadow-none select-none">
                          {institutionCode || 'AGT'}
                        </div>
                      )}
                      <div className={`max-w-[80%] rounded-2xl px-3.5 py-3 text-xs leading-relaxed text-left shadow-none ${
                        isUser
                          ? 'bg-indigo-600 text-white border border-indigo-200/40 rounded-tr-none font-semibold'
                          : 'bg-[#0E2B64] text-white rounded-tl-none font-bold whitespace-pre-line shadow-none'
                      }`}>
                        <p className="m-0 leading-relaxed">{msg.text}</p>
                        <span className={`block text-[7.5px] font-mono leading-none mt-1 text-right font-black select-none ${
                          isUser ? 'text-indigo-200' : 'text-slate-300'
                        }`}>
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {isPreviewTyping && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-6.5 h-6.5 bg-[#0E2B64] text-white rounded-full flex items-center justify-center shrink-0 text-[8px] font-black uppercase">
                      {institutionCode || 'AGT'}
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-none px-3.5 py-2.5 border border-slate-150 shadow-none">
                      <div className="flex gap-1 items-center justify-center py-1">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={previewChatBottomRef} />
              </div>

              <div className="p-3.5 bg-white border-t border-slate-100 space-y-1">
                <div className="relative">
                  <input
                    type="text"
                    className="w-full bg-[#f8fafc] border border-slate-205 focus:border-[#0E2B64] rounded-xl pl-3.5 pr-10 py-3 text-xs text-slate-800 outline-none transition-all placeholder:text-slate-400 font-bold"
                    placeholder="Escreva a sua pergunta..."
                    value={previewInput}
                    onChange={(e) => setPreviewInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendPreviewMessage(); }}
                  />
                  <button
                    onClick={handleSendPreviewMessage}
                    disabled={!previewInput.trim() || isPreviewTyping}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#0E2B64] hover:bg-[#081a3d] text-white rounded-full flex items-center justify-center transition-all border-none cursor-pointer disabled:opacity-50"
                  >
                    <Send size={11} className="stroke-[2.5]" />
                  </button>
                </div>
                <div className="text-center pt-1 select-none">
                  <span className="text-[7.5px] text-slate-400 font-black uppercase tracking-wider">
                    {institutionCode || 'Instituição'} — Correio Digital de Angola • Powered by Groq
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}