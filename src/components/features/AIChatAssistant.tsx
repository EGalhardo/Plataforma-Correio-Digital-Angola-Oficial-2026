/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, Bot, User, Loader2, Mic, Shield, ArrowRight, Check, XCircle, Navigation } from 'lucide-react';
import { AppMode, LanguageCode } from '../../types';
import { USER_PROFILE_PHOTO } from '../../constants/data';
import { PAGE_PRESENTATIONS, hasPagePresentation } from '../../services/voicePresentations';

const WELCOME_MESSAGES = {
  pt: {
    welcome: "Seja muito bem-vindo ao Correio Digital Angola. Uma plataforma de correspondência Nacional com o objetivo de unir as Instituições a população.",
    admin: "Saudações. Como posso ser útil na gestão do SOC hoje?",
    inst: "Olá. Em que posso ser útil com suas operações institucionais hoje?"
  },
  um: {
    welcome: "Ukombe uwa weya ko Correio Digital Angola. Ekalo liocisola liasanduka liesunji, liatambula lokuliyaka la kwiye liasole okuatisa omanu valua. Nye ndongola okuvatisa?",
    admin: "Ulandu uwa. Nye ndiyongola okukuvatisako kupange wetu mulo ndeti?",
    inst: "Molo. Nye uyongola okukuatisa mulo kolupange lwave?"
  },
  ki: {
    welcome: "Uayiza kiambote ko Correio Digital Angola. O mbandu iene iangolola o kixilu kioso kiambote, kiabangula o miji moso iangola. Ndikuambela o kitadi kuxi?",
    admin: "Kadiolola. Ndikuambela se mbandu iji ilende o kukuatekesa o kwila?",
    inst: "Molo. Mbandu jiyiji jilenda okukuatekesa o upange wenu lula?"
  },
  kk: {
    welcome: "Tukayidi kiambote o Correio Digital Angola. Kikalulu kia lulendo kia nsamu mia nzo, kia ziku ye zola mu sadila nkangu moso mia nsi. Nki lenda kusadisa?",
    admin: "Mawete. Nki lenda kusadisa muna kisalu lumbu kiaki?",
    inst: "Mbote. Nki lenda kusadisa mu kisalu kianu kiaki?"
  },
  ch: {
    welcome: "Tambulenu hano tawa ko Correio Digital Angola. Chiputo chipema chikata kuhanjika ya kanda yetu, yakasola ye kunyingika mu kukwashila atu eswe. Unjipe mwandu chichina?",
    admin: "Mwenya mwize. Kutambula kulumbunuka kufunga yetu hano?",
    inst: "Moyo. Unjile o upfuma wasola kukukwasha upange wenu?"
  },
  ng: {
    welcome: "Mutende muwa ko Correio Digital Angola. Mukulo wakunyingika vyuma vyoshe, wakukwashila vakwetu muntu mu nkholo yetu. Vyuma vikevi ngukukwashe?",
    admin: "Kulukamona. Vyuma vyoshe vikevi ngukukwashe mu upange wenu lelo?",
    inst: "Mutende. Vikevi vyuma vyakunyingika mu kisalu chenu?"
  },
  kw: {
    welcome: "Ouye muwa ko Correio Digital Angola. Ombila ihapu yokuyandjeka omauyelele, yapongoka okukwatha aantu ayehe moshilongo shetu. Oshike handi ku kwatha?",
    admin: "Mwa aluka. Oshike handi ku kwatha mokukonaakona oupika wetu nena?",
    inst: "Moro. Oshike handi ku kwatha miilonga yenye nena?"
  },
  nh: {
    welcome: "Kombelia onene ko Correio Digital Angola. Omuhonga wokutambula omukanda, wokuvatela ovanthu vetu aveho. Oityi handi kukuata lelo?",
    admin: "Kombelia. Oityi handi kukuata mu upange wetu wovola?",
    inst: "Hola. Oityi handi kukuata mu ovola yo upange wenye?"
  },
  fi: {
    welcome: "Mamboti ko Correio Digital Angola. Nzila ya luzolo ye bumboti mu kusadisa batu boso mu nsi etu. Nki lenda kusadisa?",
    admin: "Mamboti madika. Nki lenda kusadisa mu lumbu lua mutinu?",
    inst: "Mbote. Nki lenda kusadisa mu bisalu bieno mutinu?"
  }
};

const SUGGESTED_ACTIONS_TITLE: Record<string, string> = {
  pt: "Sugestões de Acções",
  um: "Ovilula Viavatilako",
  ki: "Mbanzila ya Jijinga",
  kk: "Yindulula kia Nsadisi",
  ch: "Jinji Jikalila",
  ng: "Vihandeka Vyavo",
  kw: "Omadhiladhilo Omayambidhidho",
  nh: "Omilandu viovola",
  fi: "Nzila ya lusolo"
};

const SUGGESTED_ACTIONS: Record<string, Array<{label: string, type: string, priority: 'Alta' | 'Média' | 'Baixa', ack: string}>> = {
  pt: [
    { label: 'Solicitar NIF (AGT)', type: 'NIF', priority: 'Média', ack: 'Entendido! Já enviei o seu pedido de NIF para a fila de processamento da AGT. Você será notificado assim que o documento for emitido.' },
    { label: 'Solicitar IPU (AGT)', type: 'IPU', priority: 'Alta', ack: 'Entendido! Já enviei o seu pedido de IPU para a fila de processamento da AGT. Você será notificado assim que o documento for emitido.' },
    { label: 'Certidão de Endereço', type: 'Certidão', priority: 'Baixa', ack: 'Entendido! Já registei o seu pedido de Certidão de Endereço. Brevemente estará disponível para consulta na sua QR Code.' },
  ],
  um: [
    { label: 'Ondaka yo NIF (AGT)', type: 'NIF', priority: 'Média', ack: 'Ndacetila! Nda tuma ale ocipango cove co NIF ko AGT ndeti. Olandu woke yove amala vakuavisa.' },
    { label: 'Ondaka yo IPU (AGT)', type: 'IPU', priority: 'Alta', ack: 'Ndacetila! Nda tuma ale ocipango cove co IPU ko AGT ndeti. Olandu woke yove amala vakuavisa.' },
    { label: 'Okanda Komboha', type: 'Certidão', priority: 'Baixa', ack: 'Ndacetila! Nda soneha kenda yove yombola. Woki-feka amala ayulamo ndeti mu okanda cove.' },
  ],
  ki: [
    { label: 'Kuita o NIF (AGT)', type: 'NIF', priority: 'Média', ack: 'Ngabetula! Nga tumene kiá o banzela yé ya NIF mu upange wa AGT. Wa tula o mutume, unda jimbidila.' },
    { label: 'Kuita o IPU (AGT)', type: 'IPU', priority: 'Alta', ack: 'Ngabetula! Nga tumene kiá o banzela yé ya IPU mu upange wa AGT. Wa tula o mutume, unda jimbidila.' },
    { label: 'O Kikoka kia Kunda', type: 'Certidão', priority: 'Baixa', ack: 'Ngabetula! Nga soneha o mukanda wé wa kunda. Mukolo wé mwandu unda tula mu carteira.' },
  ],
  kk: [
    { label: 'Lomba o NIF (AGT)', type: 'NIF', priority: 'Média', ack: 'Kiambote! Ntumene dio kinkulu muna AGT. Kuna nima lenda landa o mambu maku.' },
    { label: 'Lomba o IPU (AGT)', type: 'IPU', priority: 'Alta', ack: 'Kiambote! Ntumene dio kinkulu muna AGT. Kuna nima lenda landa o mambu maku.' },
    { label: 'O nkenda nzila', type: 'Certidão', priority: 'Baixa', ack: 'Kiambote! Sonekani kwa mambu mia nzo we vo lenda tula kaka mu nkenda kaku.' },
  ],
  ch: [
    { label: 'Kusola o NIF (AGT)', type: 'NIF', priority: 'Média', ack: 'Mwenya! Unjape o mukanda wa NIF muna AGT. Nda mutambula o mutume ha ku hita.' },
    { label: 'Kusola o IPU (AGT)', type: 'IPU', priority: 'Alta', ack: 'Mwenya! Unjape o mukanda wa IPU muna AGT. Nda mutambula o mutume ha ku hita.' },
    { label: 'O mukanda wa nzo', type: 'Certidão', priority: 'Baixa', ack: 'Mwenya! Unjape o mukanda wa mufu. Mukolo wenu wa tula kala muna carteira.' },
  ],
  ng: [
    { label: 'Kulomba o NIF (AGT)', type: 'NIF', priority: 'Média', ack: 'Kawa muwa! Nda tuma mukanda wenu wa NIF mu AGT. Mu kunona vyuma vyenu.' },
    { label: 'Kulomba o IPU (AGT)', type: 'IPU', priority: 'Alta', ack: 'Kawa muwa! Nda tuma mukanda wenu wa IPU mu AGT. Mu kunona vyuma vyenu.' },
    { label: 'O mukanda wa kunda', type: 'Certidão', priority: 'Baixa', ack: 'Kawa muwa! Nda soneha mukanda wenu wa kunda mu carteira.' },
  ],
  kw: [
    { label: 'Oshilonga sho NIF (AGT)', type: 'NIF', priority: 'Média', ack: 'Oye! Onda tuma eindilo loye lo NIF ku AGT. Oto mono omukanda goye mbala.' },
    { label: 'Oshilonga sho IPU (AGT)', type: 'IPU', priority: 'Alta', ack: 'Oye! Onda tuma eindilo loye lo IPU ku AGT. Oto mono omukanda goye mbala.' },
    { label: 'Omukanda weumbo', type: 'Certidão', priority: 'Baixa', ack: 'Oye! Onda kwatha eindilo loye lo sanduka. Otali aluka mu carteira yoye nena.' },
  ],
  nh: [
    { label: 'Oityi tyi NIF (AGT)', type: 'NIF', priority: 'Média', ack: 'Elau! Otyi tyakuata NIF ko AGT. Okanda koye katula mbala.' },
    { label: 'Oityi tyi IPU (AGT)', type: 'IPU', priority: 'Alta', ack: 'Elau! Otyi tyakuata IPU ko AGT. Okanda koye katula mbala.' },
    { label: 'Okanda kofuka', type: 'Certidão', priority: 'Baixa', ack: 'Elau! Okanda koye kokutyi katula kala mu carteira.' },
  ],
  fi: [
    { label: 'Lomba NIF (AGT)', type: 'NIF', priority: 'Média', ack: 'Mamboti! Lombele kiá NIF muna AGT. Tukusadisa mu nkenda kaku.' },
    { label: 'Lomba IPU (AGT)', type: 'IPU', priority: 'Alta', ack: 'Mamboti! Lombele kiá IPU muna AGT. Tukusadisa mu nkenda kaku.' },
    { label: 'Mukanda wa kunda', type: 'Certidão', priority: 'Baixa', ack: 'Mamboti! Okanda kofuka katula kala mu carteira yetu.' },
  ]
};

// Confirmação de navegação
const NAV_CONFIRM_MESSAGES = {
  pt: {
    ask: "Entendi! Você quer ir para a página de {page}. Deseja confirmar esta navegação?",
    confirmed: "Perfeito! Estou a levá-lo para a página de {page}. Em que mais posso ajudar?",
    cancelled: "Entendido. Cancelei a navegação. Posso ajudar com outra coisa?"
  }
};

const PAGE_FRIENDLY_NAMES: Record<AppMode, Record<string, string>> = {
  user: {
    home: "Painel Principal",
    correspondencias: "Correio Digital",
    contactos: "Círculo de Confiança",
    perfil: "Meu Perfil",
    "video-atendimento": "Video Atendimento"
  },
  institution: {
    home: "Painel Principal",
    correspondencias: "Correio Institucional",
    "gov-contatos": "Equipa",
    "inst-qrcode": "Validação por QR Code",
    "inst-ai-assistant": "Assistência IA",
    perfil: "Perfil Institucional",
    "video-atendimento": "Video Atendimento"
  },
  admin: {
    "gov-dashboard": "Painel Principal SOC",
    "gov-interoperabilidade": "Interoperabilidade",
    "gov-correspondencias": "Correspondências",
    "gov-contatos": "Cidadãos",
    "gov-trabalhadores": "Equipa",
    "gov-relatorio": "Relatórios",
    "gov-ia": "IA (Nacional)",
    "gov-seguranca": "Auditoria de Segurança",
    "gov-perfil": "Perfil Admin",
    "video-atendimento": "Video Atendimento"
  }
};

interface PendingNavigation {
  targetTab: string;
  tabLabel: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  iaLiveActive: boolean;
  stopIaVoice?: () => void;
  startIaVoice?: () => void;
  appMode: AppMode;
  onCreateRequest?: (type: string, priority: 'Alta' | 'Média' | 'Baixa') => void;
  onNavigate?: (tab: string) => void;
  activeTab?: string;
  pageContextHint?: string;
  currentLanguage?: LanguageCode;
}

export function AIChatAssistant({ 
  isOpen, 
  onClose,
  iaLiveActive,
  stopIaVoice,
  startIaVoice,
  appMode,
  onCreateRequest,
  onNavigate,
  activeTab,
  pageContextHint,
  currentLanguage = 'pt'
}: AIChatAssistantProps) {
  const isGov = appMode !== 'user';
  const isAdmin = appMode === 'admin';
  const isInst = appMode === 'institution';

  const getGreetingText = (lang: string) => {
    const key = lang as keyof typeof WELCOME_MESSAGES;
    const item = WELCOME_MESSAGES[key] || WELCOME_MESSAGES.pt;
    return isAdmin ? item.admin : isInst ? item.inst : item.welcome;
  };

  const [messages, setMessages] = useState<Message[]>(() => {
    return [{ role: 'assistant', content: getGreetingText(currentLanguage) }];
  });

  // Estado para navegação pendente de confirmação
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);

  useEffect(() => {
    const currentGreeting = getGreetingText(currentLanguage);
    setMessages(prev => {
      if (iaLiveActive) return prev;
      if (prev.length <= 1) {
        return [{ role: 'assistant', content: currentGreeting }];
      }
      return prev;
    });
  }, [currentLanguage, isAdmin, isInst, iaLiveActive]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isTranscribingRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const iaLiveActiveRef = useRef(iaLiveActive);
  const skipAutoPresentationRef = useRef(false);

  // Sync state with mutable reference to prevent stale closures during asynchronous callbacks
  useEffect(() => {
    iaLiveActiveRef.current = iaLiveActive;
    if (iaLiveActive) {
      if (skipAutoPresentationRef.current) {
        skipAutoPresentationRef.current = false;
        return;
      }
      const modePresentations = PAGE_PRESENTATIONS[appMode];
      const pageText = activeTab && modePresentations ? modePresentations[activeTab] : null;

      if (pageText) {
        // Concatenar a pergunta de ajuda no final da apresentação de forma nativa e estável
        const fullPresentationText = pageText + "\n\nPrecisa de alguma ajuda com as funcionalidades desta página?";

        setMessages(prev => {
          const welcomeText = getGreetingText(currentLanguage);
          if (prev.length <= 1 && (prev.length === 0 || prev[0].content === welcomeText)) {
            return [{ role: 'assistant', content: fullPresentationText }];
          }
          if (prev[prev.length - 1]?.content !== fullPresentationText) {
            return [...prev, { role: 'assistant', content: fullPresentationText }];
          }
          return prev;
        });

        const timer = setTimeout(() => {
          if (currentLanguage === 'pt') {
            speak(fullPresentationText, () => {
              // Reativar microfone automaticamente para captar a resposta do cidadão de forma segura
              if (recognitionRef.current && iaLiveActiveRef.current) {
                try {
                  // Certifica-se de parar qualquer instância residual antes de iniciar
                  recognitionRef.current.stop();
                } catch (e) {}
                setTimeout(() => {
                  if (iaLiveActiveRef.current) {
                    try {
                      recognitionRef.current.start();
                    } catch (e) {}
                  }
                }, 150);
              }
            });
          }
        }, 300);
        return () => clearTimeout(timer);
      } else {
        const welcomeText = getGreetingText(currentLanguage) + "\n\nPrecisa de ajuda com alguma coisa hoje?";
        
        setMessages(prev => {
          if (prev.length === 1 && prev[0].role === 'assistant') {
            return [{ role: 'assistant', content: welcomeText }];
          }
          if (prev[prev.length - 1]?.content !== welcomeText) {
            return [...prev, { role: 'assistant', content: welcomeText }];
          }
          return prev;
        });

        const timer = setTimeout(() => {
          if (currentLanguage === 'pt') {
            speak(welcomeText, () => {
              // Reativar microfone automaticamente para captar a resposta
              if (recognitionRef.current && iaLiveActiveRef.current) {
                try {
                  recognitionRef.current.stop();
                } catch (e) {}
                setTimeout(() => {
                  if (iaLiveActiveRef.current) {
                    try {
                      recognitionRef.current.start();
                    } catch (e) {}
                  }
                }, 150);
              }
            });
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    } else {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        // Desanexar handlers temporariamente para evitar loops
        recognitionRef.current.onstart = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    }
  }, [iaLiveActive, currentLanguage, activeTab, appMode]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const speak = (text: string, onEndCallback?: () => void) => {
    if (currentLanguage !== 'pt') return;
    if (!iaLiveActiveRef.current) return;
    window.speechSynthesis.cancel();
    
    // Stop listening while speaking to avoid echo
    if (recognitionRef.current && isTranscribingRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }

    // Filter out asterisks and markdown formatting symbols so the speech synthesis engine doesn't verbalize stars/asterisks
    const cleanText = text.replace(/\*/g, '').trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-AO';
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    
    utterance.onend = () => {
      if (onEndCallback) {
        onEndCallback();
      } else {
        // Resume listening after speaking if still active
        if (iaLiveActiveRef.current && recognitionRef.current) {
          try { recognitionRef.current.start(); } catch(e) {}
        }
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const getPageFriendlyName = (key: string): string => {
    const modeNames = PAGE_FRIENDLY_NAMES[appMode];
    if (modeNames && modeNames[key]) {
      return modeNames[key];
    }
    // Fallback
    return key
      .replace('gov-', '')
      .replace('inst-', '')
      .replace('-', ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const handleSelectPagePresentation = (pageKey: string) => {
    // 1. Navigate to the page
    if (onNavigate) {
      onNavigate(pageKey);
    }
    
    // 2. Start IA voice mode so it synthesizes speech
    if (startIaVoice) {
      startIaVoice();
    }
    
    // Set skipAutoPresentationRef to true while setting state to avoid double speaking
    skipAutoPresentationRef.current = true;
    
    // 3. Clear speech synthesis and read
    window.speechSynthesis.cancel();
    
    const modePresentations = PAGE_PRESENTATIONS[appMode];
    const pageText = modePresentations ? (modePresentations[pageKey] || modePresentations[pageKey === 'contactos' ? 'contatos' : '']) : null;
    
    if (pageText) {
      const friendlyName = getPageFriendlyName(pageKey);
      const fullPresentationText = pageText + "\n\nPrecisa de alguma ajuda com as funcionalidades desta página?";
      
      // Update message list
      setMessages(prev => {
        // Remove any duplicate consecutive presentation messages to keep chat elegant
        const filtered = prev.filter(m => m.content !== fullPresentationText);
        return [
          ...filtered,
          { role: 'user', content: `Apresentar página: ${friendlyName}` },
          { role: 'assistant', content: fullPresentationText }
        ];
      });
      
      // Speak
      setTimeout(() => {
        if (currentLanguage === 'pt') {
          // Explicitly set voice active so speak succeeds
          iaLiveActiveRef.current = true;
          speak(fullPresentationText, () => {
            // Reativar microfone automaticamente para que o cidadão possa falar
            if (recognitionRef.current && iaLiveActiveRef.current) {
              try {
                recognitionRef.current.stop();
              } catch (e) {}
              setTimeout(() => {
                if (iaLiveActiveRef.current) {
                  try {
                    recognitionRef.current.start();
                  } catch (e) {}
                }
              }, 150);
            }
          });
        }
      }, 400);
    }
  };

  // Confirmar navegação
  const confirmNavigation = () => {
    if (!pendingNavigation || !onNavigate) return;
    
    const { targetTab, tabLabel } = pendingNavigation;
    const confirmMsg = NAV_CONFIRM_MESSAGES.pt.confirmed.replace('{page}', tabLabel);
    
    onNavigate(targetTab);
    setMessages(prev => [...prev, 
      { role: 'assistant', content: confirmMsg }
    ]);
    setPendingNavigation(null);
    
    if (iaLiveActive) {
      speak(confirmMsg);
    }
  };

  // Cancelar navegação
  const cancelNavigation = () => {
    if (!pendingNavigation) return;
    
    const cancelMsg = NAV_CONFIRM_MESSAGES.pt.cancelled;
    setMessages(prev => [...prev, 
      { role: 'assistant', content: cancelMsg }
    ]);
    setPendingNavigation(null);
    
    if (iaLiveActive) {
      speak(cancelMsg);
    }
  };

  // Initialize and Control Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    let recognition: any;
    try {
      recognition = new SpeechRecognition();
    } catch (err) {
      console.warn('SpeechRecognition initialization failed:', err);
      return;
    }

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'pt-AO';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setInput(finalTranscript);
        
        // Debounce: Wait for a short pause of silence before sending
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          handleSendMessage(finalTranscript);
        }, 1200); // 1.2s of silence before sending
      }
    };

    recognition.onstart = () => {
      isTranscribingRef.current = true;
    };

    recognition.onend = () => {
      isTranscribingRef.current = false;
      // Auto-restart only if active and NOT currently speaking
      // Small timeout to avoid rapid restart loops
      setTimeout(() => {
        if (iaLiveActiveRef.current && !window.speechSynthesis.speaking && !isTranscribingRef.current) {
          try {
            recognition.start();
          } catch (e) {}
        }
      }, 300);
    };

    recognition.onerror = (event: any) => {
      // no-speech is a timeout when no one talks, we can ignore it as onend will restart it
      if (event.error === 'no-speech') {
        return;
      }

      console.error('Speech recognition error:', event.error);
      if (event.error === 'network') {
        setTimeout(() => { if (iaLiveActiveRef.current) try { recognition.start(); } catch(e) {} }, 1000);
      }
      if (event.error === 'not-allowed') {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Permissão de microfone negada. Por favor, ative o microfone nas configurações do seu navegador para usar a voz.' }]);
        if (stopIaVoice) {
          try {
            stopIaVoice();
          } catch (e) {}
        }
      }
      isTranscribingRef.current = false;
    };

    recognitionRef.current = recognition;

    if (iaLiveActive) {
      try {
        recognition.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }

    return () => {
      isTranscribingRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      
      // Detach handlers immediately to prevent any async callbacks during aborting or destruction
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;

      try {
        recognition.abort();
      } catch (e) {}
      window.speechSynthesis.cancel();
    };
  }, [iaLiveActive]);

  const handleSendMessage = async (textOverride?: string) => {
    const currentInput = textOverride || input;
    if (!currentInput.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: currentInput };
    
    // Verificar se há navegação pendente para processar
    if (pendingNavigation) {
      const normalizedText = currentInput.toLowerCase().trim();
      
      // Comandos de confirmação
      const confirmCommands = [
        'sim', 'confirmar', 'confirma', 'confirmo', 'ok', 'confirmado', 
        'yes', 'confirm', 'aproved', 'yeap', 'yap'
      ];
      
      // Comandos de cancelamento
      const cancelCommands = [
        'não', 'nao', 'cancelar', 'cancela', 'nao quero', 'não quero',
        'desistir', 'voltar', 'cancelado', 'negado', 'recusar', 'rejeitar'
      ];
      
      const isConfirm = confirmCommands.some(cmd => normalizedText.includes(cmd));
      const isCancel = cancelCommands.some(cmd => normalizedText.includes(cmd));
      
      if (isConfirm) {
        confirmNavigation();
        setInput('');
        return;
      } else if (isCancel) {
        setMessages(prev => [...prev, userMsg]);
        cancelNavigation();
        setInput('');
        return;
      } else {
        setMessages(prev => [...prev, userMsg, { 
          role: 'assistant', 
          content: `Não entendi a sua resposta. Por favor, responda com "Sim" para confirmar ou "Não" para cancelar a navegação para "${pendingNavigation.tabLabel}".` 
        }]);
        setInput('');
        return;
      }
    }
    
    // Command interception (Voice navigation commands)
    const normalizedText = currentInput.toLowerCase().trim();
    let targetTab: string | null = null;
    let tabLabel = "";
    
    if (
      normalizedText.includes("ir para") || 
      normalizedText.includes("abre") || 
      normalizedText.includes("abrir") || 
      normalizedText.includes("navega") || 
      normalizedText.includes("muda para") || 
      normalizedText.includes("mostrar") || 
      normalizedText.includes("mostra")
    ) {
      if (normalizedText.includes("contacto") || normalizedText.includes("vizinho") || normalizedText.includes("emergência") || normalizedText.includes("emergencia") || normalizedText.includes("civil") || normalizedText.includes("parentes")) {
        targetTab = "contactos";
        tabLabel = "Contactos Civis e de Emergência";
      } else if (normalizedText.includes("correio") || normalizedText.includes("mensagem") || normalizedText.includes("mensagens") || normalizedText.includes("correspondência") || normalizedText.includes("correspondencia") || normalizedText.includes("caixa")) {
        targetTab = "correspondencias";
        tabLabel = "Caixa de Correio e Correspondência Oficial";
      } else if (normalizedText.includes("documento") || normalizedText.includes("fatura") || normalizedText.includes("factura") || normalizedText.includes("trâmite") || normalizedText.includes("tramitação")) {
        targetTab = "documentos";
        tabLabel = "Documentos e Tramitação";
      } else if (normalizedText.includes("carteira") || normalizedText.includes("wallet") || normalizedText.includes("bi") || normalizedText.includes("passaporte") || normalizedText.includes("offline")) {
        targetTab = "carteira";
        tabLabel = "QR Code Segura";
      } else if (normalizedText.includes("perfil") || normalizedText.includes("dados") || normalizedText.includes("biometria") || normalizedText.includes("minha conta")) {
        targetTab = "perfil";
        tabLabel = "Meu Perfil de Cidadão";
      } else if (normalizedText.includes("painel") || normalizedText.includes("início") || normalizedText.includes("inicio") || normalizedText.includes("home") || normalizedText.includes("principal") || normalizedText.includes("página inicial") || normalizedText.includes("pagina inicial")) {
        targetTab = "home";
        tabLabel = "Painel Principal";
      }
    }

    if (targetTab && onNavigate) {
      setPendingNavigation({ targetTab, tabLabel });
      
      const askMsg = NAV_CONFIRM_MESSAGES.pt.ask.replace('{page}', tabLabel);
      setMessages(prev => [...prev, userMsg, { role: 'assistant', content: askMsg }]);
      
      setInput('');
      
      if (iaLiveActive) {
        speak(askMsg);
      }
      return;
    }

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          isGovMode: isGov,
          currentPage: activeTab,
          pageContext: pageContextHint,
          language: currentLanguage
        }),
      });

      const data = await response.json();
      if (response.ok && data.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
        if (iaLiveActive) {
          speak(data.message);
        }
      } else {
        const errorMsg = data.error || 'Falha na resposta da IA';
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const userFriendlyError = error.message.includes('not configured') 
        ? 'A chave da API Groq não foi configurada. Por favor, adicione GROQ_API_KEY no painel de Segredos (Settings -> Secrets).'
        : 'Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde.';
      
      setMessages(prev => [...prev, { role: 'assistant', content: userFriendlyError }]);
      if (iaLiveActive) speak(userFriendlyError);
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className={`fixed bottom-24 right-4 md:bottom-8 md:right-8 w-[calc(100vw-32px)] md:w-[400px] h-[min(500px,68vh)] md:h-[500px] bg-white rounded-3xl shadow-2xl border flex flex-col z-[100] overflow-hidden ${
            isAdmin ? 'border-slate-800 shadow-slate-900/50' : isInst ? 'border-red-100 shadow-red-900/5' : 'border-line'
          }`}
        >
          {/* Header */}
          <div className={`p-4 flex items-center justify-between text-white shrink-0 transition-colors ${
            isAdmin ? 'bg-slate-950' : isInst ? 'bg-red-600' : 'bg-primary'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center relative">
                {isGov ? <Shield size={22} className="text-white" /> : <Bot size={24} />}
                {iaLiveActive && (
                  <motion.div 
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 ${
                      isAdmin ? 'bg-white border-slate-900' : isInst ? 'bg-white border-red-600' : 'bg-green-400 border-primary'
                    }`}
                  />
                )}
              </div>
              <div>
                <h3 className="font-bold text-sm">{isAdmin ? 'Admin SOC Secure' : isInst ? 'Operações Institucionais' : 'Assistente Digital'}</h3>
                <p className="text-[10px] text-white/70 uppercase tracking-widest font-black">
                  {isAdmin ? 'Nível Crítico' : isInst ? 'Nível Gestão' : 'Online agora'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50"
          >
            {messages.map((msg, i) => (
              <motion.div
                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center overflow-hidden border-2 shadow-sm ${
                    msg.role === 'user' 
                      ? 'border-white ring-1 ring-primary/10' 
                      : 'bg-white border-line text-primary shadow-sm'
                  }`}>
                    {msg.role === 'user' 
                      ? <img src={USER_PROFILE_PHOTO} alt="Me" className="w-full h-full object-cover" /> 
                      : (isGov ? <Shield size={14} className={isAdmin ? 'text-slate-900' : 'text-red-600'} /> : <Bot size={14} />)
                    }
                  </div>
                  <div className={`p-3 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                    ? (isAdmin ? 'bg-slate-900 text-white rounded-tr-none' : isInst ? 'bg-red-600 text-white rounded-tr-none' : 'bg-primary text-white rounded-tr-none') 
                    : 'bg-white text-slate-700 rounded-tl-none border border-line/50'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-white border border-line text-primary flex items-center justify-center shadow-sm">
                    <Bot size={14} />
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-line/50 shadow-sm animate-pulse">
                    <Loader2 size={16} className={`animate-spin ${isAdmin ? 'text-slate-900' : isInst ? 'text-red-600' : 'text-primary'}`} />
                  </div>
                </div>
              </div>
            )}



            {/* Botões de Confirmação de Navegação */}
            {pendingNavigation && !isLoading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-2 pt-2"
              >
                <div className={`p-3 rounded-xl border ${
                  isAdmin ? 'bg-slate-900/5 border-slate-300' : isInst ? 'bg-red-50 border-red-200' : 'bg-primary/5 border-primary/20'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Navigation size={14} className={isAdmin ? 'text-slate-700' : isInst ? 'text-red-600' : 'text-primary'} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      isAdmin ? 'text-slate-700' : isInst ? 'text-red-600' : 'text-primary'
                    }`}>
                      Navegação Proposta
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-600">
                    Pretende ir para <strong className={isAdmin ? 'text-slate-900' : isInst ? 'text-red-700' : 'text-primary'}>{pendingNavigation.tabLabel}</strong>?
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={confirmNavigation}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      isAdmin 
                        ? 'bg-slate-900 text-white hover:bg-slate-800' 
                        : isInst 
                          ? 'bg-red-600 text-white hover:bg-red-700' 
                          : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                  >
                    <Check size={14} />
                    Confirmar
                  </button>
                  <button 
                    onClick={cancelNavigation}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    <XCircle size={14} />
                    Cancelar
                  </button>
                </div>
                
                <p className="text-[9px] text-slate-400 text-center font-medium">
                  Ou diga "Sim" para confirmar ou "Não" para cancelar
                </p>
              </motion.div>
            )}

            {Object.keys(PAGE_PRESENTATIONS[appMode] || {})
              .filter(pageKey => {
                const isFriendlyNamePage = PAGE_FRIENDLY_NAMES[appMode] && (pageKey in PAGE_FRIENDLY_NAMES[appMode]);
                return isFriendlyNamePage && pageKey !== activeTab;
              }).length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-4 flex flex-col gap-2 border-t border-slate-100/60 mt-2"
              >
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-1">
                  Apresentações Disponíveis
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1 select-none custom-scrollbar">
                  {Object.keys(PAGE_PRESENTATIONS[appMode] || {})
                    .filter(pageKey => {
                      const isFriendlyNamePage = PAGE_FRIENDLY_NAMES[appMode] && (pageKey in PAGE_FRIENDLY_NAMES[appMode]);
                      return isFriendlyNamePage && pageKey !== activeTab;
                    })
                    .map(pageKey => {
                      const label = getPageFriendlyName(pageKey);
                      const hoverBorderClass = isAdmin 
                        ? 'hover:border-slate-800 hover:text-slate-900 focus:border-slate-800' 
                        : isInst 
                          ? 'hover:border-red-600 hover:text-red-700 focus:border-red-600' 
                          : 'hover:border-primary hover:text-primary focus:border-primary';

                      return (
                        <button 
                          key={pageKey}
                          onClick={() => handleSelectPagePresentation(pageKey)}
                          className={`py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 transition-all text-left shadow-2xs flex items-center justify-between group cursor-pointer ${hoverBorderClass}`}
                        >
                          <span className="truncate mr-1">{label}</span>
                          <ArrowRight size={12} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </button>
                      );
                    })}
                </div>
              </motion.div>
            )}
            
            {iaLiveActive && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center"
              >
                <div className={`${isAdmin ? 'bg-slate-900/10 border-slate-900/20' : isInst ? 'bg-red-600/10 border-red-600/20' : 'bg-primary/10 border-primary/20'} px-4 py-2 rounded-full flex items-center gap-2 border shadow-sm`}>
                  <div className="flex gap-1 items-end h-3">
                    <motion.div 
                      animate={{ height: ["20%", "100%", "20%"] }}
                      transition={{ repeat: Infinity, duration: 0.5, delay: 0 }}
                      className={`w-1 rounded-full ${isAdmin ? 'bg-slate-900' : isInst ? 'bg-red-600' : 'bg-primary'}`}
                    />
                    <motion.div 
                      animate={{ height: ["40%", "80%", "40%"] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.1 }}
                      className={`w-1 rounded-full ${isAdmin ? 'bg-slate-900' : isInst ? 'bg-red-600' : 'bg-primary'}`}
                    />
                    <motion.div 
                      animate={{ height: ["30%", "100%", "30%"] }}
                      transition={{ repeat: Infinity, duration: 0.4, delay: 0.2 }}
                      className={`w-1 rounded-full ${isAdmin ? 'bg-slate-900' : isInst ? 'bg-red-600' : 'bg-primary'}`}
                    />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest leading-none ${isAdmin ? 'text-slate-900' : isInst ? 'text-red-600' : 'text-primary'}`}>
                    {isGov ? 'A Captar...' : 'A ouvir...'}
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-line shrink-0">
            <div className="flex gap-2">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={pendingNavigation ? "Responda Sim ou Não..." : "Escreva sua mensagem..."}
                className={`flex-1 bg-slate-50 border rounded-xl px-4 py-2.5 outline-none transition-colors text-sm font-medium ${
                  isAdmin ? 'border-slate-800 focus:border-slate-950' : isInst ? 'border-red-100 focus:border-red-600' : 'border-line focus:border-primary'
                }`}
              />
              <button 
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                className={`text-white p-2.5 rounded-xl transition-all disabled:opacity-50 disabled:grayscale ${
                  isAdmin ? 'bg-slate-900 hover:bg-slate-950' : isInst ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/95'
                }`}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
