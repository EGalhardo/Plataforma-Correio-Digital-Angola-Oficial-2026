/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, FileText, AlertTriangle, ShieldCheck, HelpCircle, Eye, RefreshCw, Send, ArrowRight } from 'lucide-react';

interface GovernmentAIPanelProps {
  documentTitle: string;
  rawText: string;
  contextType: 'document' | 'message';
  onLogMsg?: (action: string, type: 'info' | 'warning' | 'critical' | 'success') => void;
}

type AIAction = 'summarize' | 'explain' | 'urgency' | 'classify' | 'fraud' | 'qna';

export function GovernmentAIPanel({
  documentTitle,
  rawText,
  contextType,
  onLogMsg,
}: GovernmentAIPanelProps) {
  const [activeTab, setActiveTab] = useState<AIAction>('summarize');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [customQuestion, setCustomQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);

  const tabMeta: Array<{ id: AIAction; label: string; icon: ReactNode; desc: string }> = [
    { 
      id: 'summarize', 
      label: 'Resumo Inteligente', 
      icon: <FileText size={16} />, 
      desc: 'Simplifica a burocracia e destaca o essencial do documento.' 
    },
    { 
      id: 'explain', 
      label: 'Explicar Termos', 
      icon: <Eye size={16} />, 
      desc: 'Traduz termos jurídicos complicados e siglas oficiais do Estado.' 
    },
    { 
      id: 'urgency', 
      label: 'Grau de Urgência', 
      icon: <AlertTriangle size={16} />, 
      desc: 'Determina gravidade e prazos limites regulamentares.' 
    },
    { 
      id: 'classify', 
      label: 'Classificação', 
      icon: <Sparkles size={16} />, 
      desc: 'Detecta categorias oficiais e órgãos emissores prováveis.' 
    },
    { 
      id: 'fraud', 
      label: 'Verificar Fraude', 
      icon: <ShieldCheck size={16} />, 
      desc: 'Analisa chaves de segurança para prevenir phishing ou falsificações.' 
    },
    { 
      id: 'qna', 
      label: 'Ajudar Cidadão', 
      icon: <HelpCircle size={16} />, 
      desc: 'Responde quaisquer dúvidas contextuais sobre este trâmite.' 
    },
  ];

  const triggerAIAction = async (action: AIAction, overrideText?: string) => {
    const textToAnalyze = overrideText || rawText;
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/gov-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          text: textToAnalyze,
          context: `Documento ou Mensagem analisada: ${documentTitle} (${contextType})`
        })
      });

      const data = await response.json();
      if (response.ok && data.result) {
        if (action === 'qna') {
          setChatHistory(prev => [
            ...prev,
            { role: 'assistant', text: data.result }
          ]);
        } else {
          setResults(prev => ({ ...prev, [action]: data.result }));
        }
        
        // Log to security log if possible
        if (onLogMsg) {
          const tabLabel = tabMeta.find(t => t.id === action)?.label || action;
          onLogMsg(`Análise de IA Governamental: ${tabLabel} realizada para ${documentTitle}`, 'success');
        }
      } else {
        throw new Error(data.error || 'Erro na resposta do serviço de IA');
      }
    } catch (err: any) {
      console.error(err);
      const fallbackResult = `Erro ao aceder ao núcleo de Inteligência Artificial: ${err.message || 'Serviço temporariamente indisponível'}`;
      if (action === 'qna') {
        setChatHistory(prev => [...prev, { role: 'assistant', text: fallbackResult }]);
      } else {
        setResults(prev => ({ ...prev, [action]: fallbackResult }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const currentResult = results[activeTab];

  const handleSendQuestion = () => {
    if (!customQuestion.trim() || isLoading) return;
    const question = customQuestion;
    setChatHistory(prev => [...prev, { role: 'user', text: question }]);
    setCustomQuestion('');
    triggerAIAction('qna', question);
  };

  return (
    <div id="gov-ai-intelligence-panel" className="bg-[#f8fafc] border border-slate-200/80 rounded-[28px] p-5 md:p-6 shadow-sm space-y-5 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-xs">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <h4 className="font-extrabold text-[#111A2E] text-sm md:text-base uppercase tracking-wider">
              Análise de Inteligência Artificial Governamental
            </h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">
              Assistência Digital Avançada Integrada
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 bg-white border border-slate-200 rounded-full px-3 py-1 text-[9px] font-black uppercase text-slate-600 tracking-wider shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block shrink-0" />
          Núcleo de IA Activo
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex flex-wrap gap-2">
        {tabMeta.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                // Trigger action automatically if it has not been loaded yet
                if (!results[tab.id] && tab.id !== 'qna') {
                  triggerAIAction(tab.id);
                }
              }}
              className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 ${
                isSelected
                  ? 'bg-primary text-white shadow-md shadow-primary/10'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500 font-semibold italic bg-slate-100/40 p-2.5 rounded-xl">
        💡 {tabMeta.find(t => t.id === activeTab)?.desc}
      </p>

      {/* Main Response Area */}
      <div className="bg-white border border-slate-200/60 rounded-2xl min-h-[160px] flex flex-col justify-between overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab !== 'qna' ? (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="p-4 md:p-5 space-y-4 text-xs md:text-sm text-slate-700 leading-relaxed font-medium"
            >
              {currentResult ? (
                <div className="whitespace-pre-wrap select-text break-words">
                  {currentResult.startsWith('Erro') ? (
                    <div className="flex items-start gap-2.5 text-rose-650 bg-rose-50/40 p-3 rounded-xl border border-rose-100 font-bold">
                      <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                      <span>{currentResult}</span>
                    </div>
                  ) : (
                    <div>
                      {/* Structure markdown-like items elegantly for readibilty */}
                      {currentResult.split('\n').map((line, idx) => {
                        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                          return (
                            <div key={idx} className="flex items-start gap-2 pl-2 mt-1 select-text">
                              <span className="text-primary font-black shrink-0 mt-0.5">•</span>
                              <span className="select-text">{line.replace(/^[-*]\s+/, '')}</span>
                            </div>
                          );
                        }
                        if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
                          return (
                            <h5 key={idx} className="font-extrabold text-[#111A2E] text-xs uppercase tracking-wider mt-3 mb-1 block select-text">
                              {line.replace(/\*\*/g, '')}
                            </h5>
                          );
                        }
                        return <p key={idx} className="mt-1 select-text">{line}</p>;
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400 font-medium">
                  {isLoading ? (
                    <Loader2 size={24} className="text-primary animate-spin mb-2" />
                  ) : (
                    <Sparkles size={24} className="text-slate-300 mb-2" />
                  )}
                  <p className="text-xs uppercase tracking-wider font-extrabold text-slate-400">
                    {isLoading ? 'Análise De IA Em Curso...' : 'Pronto para analisar'}
                  </p>
                  {!isLoading && (
                    <button
                      onClick={() => triggerAIAction(activeTab)}
                      className="mt-3 bg-primary text-white text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-primary/95 transition-all flex items-center gap-1.5 shadow-xs"
                    >
                      Processar {tabMeta.find(t => t.id === activeTab)?.label}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            /* QnA Interactive Chatbot inside Panel */
            <motion.div
              key="qna-chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col divide-y divide-slate-100"
            >
              <div className="p-4 md:p-5 max-h-[250px] overflow-y-auto space-y-4 custom-scrollbar text-xs md:text-sm">
                {chatHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-400 font-medium">
                    <HelpCircle size={24} className="text-slate-300 mb-1" />
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest text-center">
                      Formule dúvidas sobre prazos, guias, ou termos jurídicos fiscais aplicáveis.
                    </p>
                  </div>
                ) : (
                  chatHistory.map((chat, idx) => (
                    <div
                      key={idx}
                      className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`p-3 rounded-2xl max-w-[85%] font-medium leading-relaxed ${
                        chat.role === 'user'
                          ? 'bg-primary text-white rounded-tr-none text-right'
                          : 'bg-slate-50 text-slate-700 border border-slate-200/70 rounded-tl-none'
                      }`}>
                        {chat.text}
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="p-3 bg-slate-50 animate-pulse rounded-2xl rounded-tl-none border border-slate-200/70">
                      <Loader2 size={16} className="text-primary animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-slate-50/50 flex gap-2">
                <input
                  type="text"
                  placeholder="Coloque sua dúvida jurídica/fiscal sobre este documento..."
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendQuestion()}
                  className="flex-1 bg-white border border-slate-200 focus:border-primary/40 focus:ring-2 focus:ring-primary/5 rounded-xl px-3.5 py-1.5 outline-none text-xs md:text-sm font-semibold transition-all"
                />
                <button
                  type="button"
                  onClick={handleSendQuestion}
                  disabled={isLoading || !customQuestion.trim()}
                  className="bg-primary text-white hover:bg-primary/95 flex items-center justify-center px-4 rounded-xl disabled:opacity-50 transition-all font-black text-xs uppercase"
                >
                  <Send size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Indicator Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-3xs flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/95 border border-slate-100 rounded-full shadow-lg">
              <Loader2 size={16} className="text-primary animate-spin" />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest animate-pulse">Consultando Servidor IA...</span>
            </div>
          </div>
        )}
      </div>

      {/* Recalculate helper button */}
      {currentResult && !isLoading && (
        <button
          onClick={() => triggerAIAction(activeTab)}
          className="bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors self-start duration-150"
        >
          <RefreshCw size={11} /> Reanalisar Documento
        </button>
      )}
    </div>
  );
}
