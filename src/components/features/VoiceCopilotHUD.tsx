/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  X, 
  HelpCircle, 
  Compass, 
  Sun, 
  Moon, 
  BookOpen, 
  Mail, 
  ChevronUp, 
  ChevronDown,
  Bot,
  CheckCircle2,
  AlertCircle,
  Radio
} from 'lucide-react';
import { AppMode } from '../../types';
import { VoiceCommandIntent, VoiceActionType } from '../../services/voiceCopilotService';

export interface VoiceCopilotHUDProps {
  isOpen: boolean;
  onClose: () => void;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  transcript: string;
  lastFeedback: string;
  lastAction: string | null;
  appMode: AppMode;
  currentTab: string;
  theme: 'light' | 'dark';
  onToggleListen: () => void;
  onStopSpeech: () => void;
  onExecuteCustomText: (text: string) => void;
}

export function VoiceCopilotHUD({
  isOpen,
  onClose,
  isListening,
  isSpeaking,
  isProcessing,
  transcript,
  lastFeedback,
  lastAction,
  appMode,
  currentTab,
  theme,
  onToggleListen,
  onStopSpeech,
  onExecuteCustomText
}: VoiceCopilotHUDProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Sugestões de comandos contextuais por papel
  const suggestedCommands = appMode === 'admin' 
    ? [
        { label: 'Painel Nacional', cmd: 'Ir para o Painel Nacional' },
        { label: 'Interoperabilidade', cmd: 'Abrir Interoperabilidade' },
        { label: 'Ler Ecrã', cmd: 'Ler Ecrã' },
        { label: 'Alternar Tema', cmd: 'Mudar Tema' }
      ]
    : appMode === 'institution'
    ? [
        { label: 'Expediente', cmd: 'Ir para o Correio' },
        { label: 'Gestão de Equipa', cmd: 'Abrir Equipa' },
        { label: 'Validar QR', cmd: 'Abrir Validador QR' },
        { label: 'Ler Ecrã', cmd: 'Ler Ecrã' }
      ]
    : [
        { label: 'Abrir Correio', cmd: 'Ir para o Correio' },
        { label: 'Ver Notificações', cmd: 'Ver Notificações' },
        { label: 'Vídeo-Atendimento', cmd: 'Abrir Vídeo-Atendimento' },
        { label: 'Ler Ecrã', cmd: 'Ler Ecrã' },
        { label: 'Modo Escuro', cmd: 'Ativar Modo Escuro' }
      ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        aria-label="Copiloto de Voz e Acessibilidade IA"
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-[120] max-w-[calc(100vw-32px)] md:max-w-[420px] w-full"
      >
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-2xl rounded-3xl overflow-hidden transition-all duration-300">
          
          {/* Header do Copiloto */}
          <div className="p-4 bg-gradient-to-r from-[#0c2340] to-[#1e3a8a] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <Sparkles size={16} className="text-amber-300 animate-pulse" />
                {isListening && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-[#0c2340] animate-ping" />
                )}
              </div>
              <div>
                <h2 className="text-xs font-black tracking-wide uppercase flex items-center gap-1.5">
                  Copiloto Cívico IA
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded-full font-bold">
                    Voz Activa
                  </span>
                </h2>
                <p className="text-[10px] text-white/70 font-medium">
                  {isListening ? '🎙️ A ouvir a sua voz...' : isSpeaking ? '🔊 A responder...' : isProcessing ? '⚡ A processar comando...' : '💤 Pronto para escutar'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
                title="Comandos e Ajuda"
                aria-label="Ajuda de comandos de voz"
              >
                <HelpCircle size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
                title={isMinimized ? "Expandir" : "Minimizar"}
                aria-label={isMinimized ? "Expandir copiloto" : "Minimizar copiloto"}
              >
                {isMinimized ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
                title="Fechar Copiloto (Alt+V)"
                aria-label="Fechar copiloto de voz"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Conteúdo Expansível */}
          {!isMinimized && (
            <div className="p-4.5 space-y-4">
              
              {/* Visualizador de Ondas Sonoras e Estado Central */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 flex flex-col items-center justify-center text-center relative overflow-hidden">
                
                {/* Ondas Sonoras Animadas */}
                <div className="flex items-center justify-center gap-1.5 h-10 mb-2">
                  {[...Array(9)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        height: isListening 
                          ? [`${20 + (i % 3) * 15}%`, `${80 - (i % 2) * 20}%`, `${30 + (i % 4) * 15}%`]
                          : isSpeaking 
                          ? [`${15 + (i % 2) * 20}%`, `${95 - (i % 3) * 10}%`, `${25 + (i % 2) * 20}%`]
                          : '15%'
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: isListening ? 0.45 + (i * 0.05) : 0.35 + (i * 0.04),
                        ease: "easeInOut"
                      }}
                      className={`w-1.5 rounded-full transition-colors ${
                        isListening 
                          ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' 
                          : isSpeaking 
                          ? 'bg-blue-600 shadow-xs shadow-blue-500/50' 
                          : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    />
                  ))}
                </div>

                {/* Transcrição em Tempo Real */}
                <div 
                  className="w-full min-h-[44px] flex items-center justify-center px-2 py-1"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {transcript ? (
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 italic">
                      "{transcript}"
                    </p>
                  ) : isListening ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium animate-pulse">
                      <Radio size={12} className="text-emerald-500" />
                      Fale agora... (Ex: "Ir para o Correio", "Modo Escuro")
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Toque no microfone ou prima <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-mono">Alt + V</kbd> para falar.
                    </p>
                  )}
                </div>

                {/* Feedback / Ação Recente */}
                {lastFeedback && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2.5 w-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-xl p-2.5 text-left text-[11px] text-blue-900 dark:text-blue-200 font-medium leading-relaxed"
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        {lastAction && (
                          <span className="block font-bold text-blue-700 dark:text-blue-300 text-[10px] uppercase tracking-wider mb-0.5">
                            {lastAction}
                          </span>
                        )}
                        <span>{lastFeedback}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Botões de Ação de Voz */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleListen}
                  className={`flex-1 py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all focus:outline-hidden focus-visible:ring-2 ${
                    isListening
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 focus-visible:ring-rose-500'
                      : 'bg-[#0c2340] hover:bg-[#1a3a60] text-white shadow-[#0c2340]/20 focus-visible:ring-primary'
                  }`}
                  aria-pressed={isListening}
                >
                  {isListening ? (
                    <>
                      <MicOff size={16} />
                      <span>Pausar Escuta</span>
                    </>
                  ) : (
                    <>
                      <Mic size={16} className="text-emerald-400" />
                      <span>Ouvir Comando</span>
                    </>
                  )}
                </button>

                {isSpeaking && (
                  <button
                    type="button"
                    onClick={onStopSpeech}
                    className="py-3 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
                    title="Silenciar Resposta de Voz"
                    aria-label="Silenciar fala do assistente"
                  >
                    <VolumeX size={16} className="text-rose-500" />
                    <span>Silenciar</span>
                  </button>
                )}
              </div>

              {/* Sugestões Rápidas de Comandos */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Compass size={11} />
                  Atalhos Rápidos de Voz:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedCommands.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onExecuteCustomText(item.cmd)}
                      className="text-[11px] font-medium px-2.5 py-1 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guia de Ajuda de Comandos (Modal/Drawer Integrado) */}
              <AnimatePresence>
                {showHelp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 space-y-2 overflow-hidden"
                  >
                    <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      <HelpCircle size={13} className="text-primary" />
                      O que pode dizer ao Copiloto:
                    </p>
                    <ul className="space-y-1 pl-4 list-disc text-[10.5px]">
                      <li><strong>Navegação:</strong> "Ir para o Correio", "Ver Perfil", "Abrir Ocorrências", "Vídeo-Atendimento".</li>
                      <li><strong>Ações:</strong> "Ativar Modo Escuro", "Ativar Modo Claro", "Ler Ecrã", "Nova Mensagem".</li>
                      <li><strong>Acessibilidade:</strong> "Aumentar Fonte", "Diminuir Fonte", "Alto Contraste".</li>
                      <li><strong>Perguntas Cívicas:</strong> "Como funciona a certidão de nascimento?", "O que é o CDA?".</li>
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          )}

        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
