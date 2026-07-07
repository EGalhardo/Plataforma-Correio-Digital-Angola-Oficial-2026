/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, Navigation2, ArrowRight, Check, X, ShieldAlert, Radio } from 'lucide-react';

interface VoiceGuideAssistantProps {
  onScrollDown: () => void;
  onFocusSteps: () => void;
  onCollapseStart: () => void;
  onCloseAssistant: () => void;
}

type GuideStep = 'welcome' | 'presentation' | 'register_flow' | 'offer_help' | 'opened_form' | 'custom_help';

export function VoiceGuideAssistant({
  onScrollDown,
  onFocusSteps,
  onCollapseStart,
  onCloseAssistant,
}: VoiceGuideAssistantProps) {
  const [currentStep, setCurrentStep] = useState<GuideStep>('welcome');
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [userTranscript, setUserTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Dialog Texts matching requirements exactly
  const DIALOGS = {
    welcome: {
      text: "Olá! Seja muito bem-vindo ao Correio Digital Angola, o seu novo endereço digital oficial. Eu sou o seu assistente de voz e vou ajudar-te a dar os primeiros passos. Quer que eu faça uma breve apresentação da plataforma?",
      caption: "Boas-vindas ao Correio Digital Angola. Aguardando a sua resposta por voz ou botões."
    },
    presentation: {
      text: "Excelente! Esta é a nossa página principal de acesso. Vamos descer um pouco para ver onde tudo começa. [ACTION: SCROLL_DOWN]",
      caption: "Apresentação da plataforma. Rotação de conteúdos principais..."
    },
    register_flow: {
      text: "Aqui do lado direito, temos as etapas de cadastro. Você começa informando os seus dados de acesso, depois valida com o seu Bilhete de Identidade e, finalmente, fazemos uma rápida captura facial para segurança do seu domicílio digital. [ACTION: FOCUS_STEPS]",
      caption: "Mapeamento do fluxo civil e validação de identidade."
    },
    offer_help: {
      text: "Prefere que comecemos o registo do seu Nome Completo agora ou gostariam de tirar alguma dúvida sobre o Correio Digital?",
      caption: "Pronto para iniciar o registo oficial?"
    },
    opened_form: {
      text: "Perfeito, vou abrir o formulário para si. [ACTION: COLLAPSE_START]",
      caption: "A abrir formulário de registo..."
    }
  };

  const recognitionRef = useRef<any>(null);
  const currentStepRef = useRef<GuideStep>('welcome');
  const isMutedRef = useRef(isMuted);

  // Sync refs to avoid stale closures in browser event loops
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Handle Speech Synthesis (TTS) - Angola Accent / standard Portuguese
  const speak = (text: string, onEndCallback?: () => void) => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    if (isMutedRef.current) {
      if (onEndCallback) onEndCallback();
      return;
    }

    // Filter out visual tags and asterisks for the reader so the speech engine doesn't pronounce stars/asterisks
    const cleanText = text
      .replace(/\[ACTION: [A-Z_]+\]/g, '')
      .replace(/\*/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-AO'; // Angola standard accent
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      // Temporarily stop microphone listening to avoid hearing itself
      if (recognitionRef.current && isListening) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      if (onEndCallback) {
        onEndCallback();
      } else {
        // Restart microphone if we were listening
        if (isListening && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {}
        }
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Setup Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("Reconhecimento de voz não suportado neste navegador. Utilize os botões interativos.");
      return;
    }

    let recognition: any;
    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'pt-AO';
    } catch (err) {
      setSpeechError("Falha ao inicializar os serviços de áudio.");
      return;
    }

    recognition.onresult = (event: any) => {
      const lastIndex = event.results.length - 1;
      const transcript = event.results[lastIndex][0].transcript.toLowerCase().trim();
      setUserTranscript(transcript);
      handleVoiceInput(transcript);
    };

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart listening if voice assistant is active and not speaking
      setTimeout(() => {
        if (!isMutedRef.current && !window.speechSynthesis.speaking && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {}
        }
      }, 400);
    };

    recognition.onerror = (e: any) => {
      if (e.error === 'not-allowed') {
        setSpeechError("Microfone bloqueado. Dê permissão de áudio para falar.");
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    // Speak initial welcome message
    const welcomeTimer = setTimeout(() => {
      speak(DIALOGS.welcome.text, () => {
        if (recognitionRef.current && !isMutedRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {}
        }
      });
    }, 1200);

    return () => {
      clearTimeout(welcomeTimer);
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  // Sync silence auto-trigger speech response again when changing steps
  const triggerStepResponse = (newStep: GuideStep) => {
    setCurrentStep(newStep);
    let delay = 3500;
    if (newStep === 'presentation') {
      onScrollDown();
      delay = 6000; // allow reading more fully
    } else if (newStep === 'register_flow') {
      onFocusSteps();
      delay = 8000;
    } else if (newStep === 'offer_help') {
      delay = 7000;
    } else if (newStep === 'opened_form') {
      onCollapseStart();
      delay = 4000;
    }

    speak(DIALOGS[newStep as keyof typeof DIALOGS]?.text || '', () => {
      // Execute automatic navigation transitions if user didn't interrupt
      if (newStep === 'presentation') {
        setTimeout(() => triggerStepResponse('register_flow'), delay);
      } else if (newStep === 'register_flow') {
        setTimeout(() => triggerStepResponse('offer_help'), delay);
      }
    });
  };

  // Interactive dialog system responding to Angola idioms & words
  const handleVoiceInput = (text: string) => {
    const step = currentStepRef.current;

    if (step === 'welcome') {
      // YES responses in Angola context
      if (text.includes('sim') || text.includes('apresentação') || text.includes('quero') || text.includes('mostrar') || text.includes('de acordo') || text.includes('apresenta') || text.includes('ya') || text.includes('ok')) {
        triggerStepResponse('presentation');
      } else if (text.includes('não') || text.includes('pular') || text.includes('sair')) {
        speak("Entendido. Pode preencher as informações de acesso quando estiver pronto. Desejo-lhe um ótimo dia!", () => {
          onCloseAssistant();
        });
      }
    } else if (step === 'offer_help' || step === 'register_flow' || step === 'presentation') {
      if (text.includes('começar') || text.includes('registar') || text.includes('registo') || text.includes('iniciar') || text.includes('formulário')) {
        triggerStepResponse('opened_form');
      } else if (text.includes('dúvida') || text.includes('pergunta') || text.includes('o que é') || text.includes('ajuda')) {
        speak("O Correio Digital Angola é a sua caixa de correio oficial do Estado, onde receberá notificações do Bilhete de Identidade, da AGT e de outros serviços públicos. Quer começar o seu registo agora?");
      }
    }
  };

  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    } else {
      // Reinforce reading current step dialog on unmute
      speak(DIALOGS[currentStep as keyof typeof DIALOGS]?.text || '');
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-[24px] p-4 border border-slate-800 shadow-2xl relative overflow-hidden transition-all duration-300">
      {/* Absolute futuristic decoration lines */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />

      {/* Header and Controls */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white relative shadow-md shadow-blue-500/20">
            <Radio size={16} className={isSpeaking ? 'animate-pulse' : ''} />
            {isListening && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-slate-900 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">Governo de Angola</span>
              <span className="bg-blue-500/10 text-blue-300 text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-full">CDA</span>
            </div>
            <h4 className="text-xs font-black uppercase tracking-tight text-white flex items-center gap-1">
              Assistente de Voz Oficial
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleMuteToggle}
            className={`p-2 rounded-xl border border-slate-800 transition-all cursor-pointer ${
              isMuted 
                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
            }`}
            title={isMuted ? "Ativar Voz" : "Silenciar Assistente"}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button
            type="button"
            onClick={onCloseAssistant}
            className="p-2 rounded-xl bg-slate-800/50 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Fechar Assistente"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Animated Sound Wave or Active Voice State */}
      <div className="py-2.5 flex items-center justify-center gap-3">
        {isSpeaking ? (
          <div className="flex items-end gap-1 px-3 py-1.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 animate-pulse w-full justify-center">
            {/* Pulsating equalizer representing speech */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ height: ["10%", "100%", "10%"] }}
                transition={{
                  repeat: Infinity,
                  duration: 0.4 + i * 0.1,
                  ease: "easeInOut"
                }}
                className="w-1.5 h-6 bg-blue-500 rounded-full"
              />
            ))}
            <span className="text-[10px] font-black uppercase ml-3 tracking-widest text-blue-400 font-mono">A Falar...</span>
          </div>
        ) : isListening ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 w-full justify-center">
            <Mic size={14} className="text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 font-mono animate-pulse">A escutar a sua voz...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-2xl border border-slate-800 w-full justify-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-widest">Aguardando interação</span>
          </div>
        )}
      </div>

      {/* Assistant Voice response speech text */}
      <div className="mt-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/60 min-h-[90px] flex flex-col justify-between">
        <div>
          <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            {DIALOGS[currentStep as keyof typeof DIALOGS] ? 'Transcrição Oficial' : 'Assistente'}
          </span>
          <p className="text-xs font-semibold text-slate-200 leading-relaxed font-sans">
            {DIALOGS[currentStep as keyof typeof DIALOGS]?.text.replace(/\[ACTION: [A-Z_]+\]/g, '') || "Olá!"}
          </p>
        </div>
        
        <div className="mt-3.5 border-t border-slate-900 pt-2.5 flex items-center justify-between">
          <span className="text-[9px] font-medium text-slate-500 flex items-center gap-1.5">
            <Sparkles size={10} className="text-blue-500" />
            {DIALOGS[currentStep as keyof typeof DIALOGS]?.caption || "Pronto."}
          </span>
          <span className="text-[8.5px] font-mono font-bold bg-slate-850 px-2 py-0.5 rounded text-indigo-300">
            Passo {currentStep === 'welcome' ? '1/4' : currentStep === 'presentation' ? '2/4' : currentStep === 'register_flow' ? '3/4' : '4/4'}
          </span>
        </div>
      </div>

      {/* Real-time speech transcription caption for accessibility and proof of work */}
      <AnimatePresence>
        {userTranscript && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="mt-2.5 bg-blue-950/20 border border-blue-900/30 px-3 py-2 rounded-xl flex items-center gap-2"
          >
            <Mic size={11} className="text-indigo-400 shrink-0" />
            <p className="text-[11px] font-bold text-indigo-300 italic">
              " {userTranscript} "
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Action Buttons so the user has immediate visual walkthrough control as a safeguard */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {currentStep === 'welcome' && (
          <>
            <button
              type="button"
              onClick={() => {
                setUserTranscript('não obrigado');
                speak("Entendido. Pode preencher as informações de acesso quando estiver pronto. Desejo-lhe um ótimo dia!", () => {
                  onCloseAssistant();
                });
              }}
              className="py-2.5 text-[10px] items-center justify-center font-black uppercase tracking-wider bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-750 transition-all cursor-pointer border-0"
            >
              Recusar
            </button>
            <button
              type="button"
              onClick={() => triggerStepResponse('presentation')}
              className="py-2.5 text-[10px] flex items-center justify-center gap-1 font-black uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-500/10 hover:opacity-95 transition-all cursor-pointer border-0"
            >
              Sim, Apresentar <ArrowRight size={12} />
            </button>
          </>
        )}

        {currentStep === 'presentation' && (
          <button
            type="button"
            onClick={() => triggerStepResponse('register_flow')}
            className="col-span-2 py-2.5 text-[10px] flex items-center justify-center gap-1.5 font-black uppercase tracking-widest bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all cursor-pointer border-0"
          >
            Ver Fluxo de Cadastro <ArrowRight size={12} />
          </button>
        )}

        {currentStep === 'register_flow' && (
          <button
            type="button"
            onClick={() => triggerStepResponse('offer_help')}
            className="col-span-2 py-2.5 text-[10px] flex items-center justify-center gap-1.5 font-black uppercase tracking-widest bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all cursor-pointer border-0"
          >
            Ver Oferta de Ajuda <ArrowRight size={12} />
          </button>
        )}

        {currentStep === 'offer_help' && (
          <>
            <button
              type="button"
              onClick={() => speak("O Correio Digital Angola é a plataforma unificada para a correspondência oficial do Estado e para a comunicação segura com os cidadãos.")}
              className="py-2.5 text-[10px] items-center justify-center font-black uppercase tracking-wider bg-slate-800 text-slate-350 rounded-xl hover:bg-slate-750 transition-all cursor-pointer border-0"
            >
              Tirar Dúvida
            </button>
            <button
              type="button"
              onClick={() => triggerStepResponse('opened_form')}
              className="py-2.5 text-[10px] flex items-center justify-center gap-1 font-black uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-500/10 hover:opacity-95 transition-all cursor-pointer border-0"
            >
              Começar Registo <Check size={12} />
            </button>
          </>
        )}

        {currentStep === 'opened_form' && (
          <div className="col-span-2 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-bold p-2.5 rounded-xl text-[10.5px] text-center">
            Formulário aberto com sucesso!
          </div>
        )}
      </div>

      {speechError && (
        <div className="mt-3 flex gap-1.5 items-start bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 text-[10px] text-red-300">
          <ShieldAlert size={12} className="shrink-0 mt-0.5" />
          <p className="leading-tight font-medium">{speechError}</p>
        </div>
      )}
    </div>
  );
}
