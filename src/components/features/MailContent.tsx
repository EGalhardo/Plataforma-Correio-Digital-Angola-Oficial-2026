/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Send, 
  ShieldCheck, 
  Mail, 
  Plus, 
  Clock, 
  Search, 
  Fingerprint,
  Bell,
  Scroll,
  ShieldAlert,
  Receipt,
  Megaphone,
  FolderOpen,
  Landmark,
  CheckSquare,
  Key,
  Award,
  User,
  Coins,
  Scale,
  FileText,
  Lock,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  Quote,
  Eraser,
  Trash2,
  Paperclip,
  Edit2
} from 'lucide-react';
import { Message, SENSITIVITY_LEVELS, PRIORITY_CONFIGS, LanguageCode } from '../../types';
import { getCategoryMetadata } from '../../utils/protocolGenerator';
import { translateText } from '../../utils/translator';
import { useLanguage } from '../../hooks/useLanguage';
import { Video, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { MOCK_CITIZENS, MOCK_USERS } from '../../constants/mocks';
import { supabase } from '../../lib/supabaseClient';


const getOrgBadgeStyles = (org: string) => {
  const o = org.toUpperCase();
  if (o.includes('SOC') || o.includes('EMERGÊNCIA')) {
    return 'bg-red-50 text-red-700 border-red-200';
  } else if (o === 'AGT' || o.includes('FINANÇAS') || o.includes('MINFIN') || o.includes('CONTRIBUINTE')) {
    return 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (o === 'SME' || o.includes('MIGRAÇÃO') || o.includes('ESTRANGEIROS')) {
    return 'bg-blue-50 text-blue-800 border-blue-200';
  } else if (o === 'MINJUS' || o.includes('JUSTIÇA') || o.includes('REGISTO') || o.includes('CONSERVATÓRIA')) {
    return 'bg-teal-50 text-teal-800 border-teal-200';
  } else if (o.includes('TRIBUNAL') || o.includes('SUPREMO') || o.includes('COMARCA')) {
    return 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200';
  } else if (o === 'ENDE' || o.includes('ELETRICIDADE') || o.includes('FORÇA')) {
    return 'bg-orange-50 text-orange-850 border-orange-200';
  } else if (o === 'EPAL' || o.includes('ÁGUA')) {
    return 'bg-sky-50 text-sky-850 border-sky-200';
  }
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

function renderCategoryIcon(iconName: string, size = 10) {
  switch (iconName) {
    case 'Bell': return <Bell size={size} />;
    case 'Scroll': return <Scroll size={size} />;
    case 'ShieldAlert': return <ShieldAlert size={size} />;
    case 'Receipt': return <Receipt size={size} />;
    case 'Megaphone': return <Megaphone size={size} />;
    case 'FolderOpen': return <FolderOpen size={size} />;
    case 'Landmark': return <Landmark size={size} />;
    case 'CheckSquare': return <CheckSquare size={size} />;
    case 'Key': return <Key size={size} />;
    case 'Award': return <Award size={size} />;
    case 'User': return <User size={size} />;
    case 'Coins': return <Coins size={size} />;
    case 'Scale': return <Scale size={size} />;
    default: return <FileText size={size} />;
  }
}

interface MailContentProps {
  isComposing: boolean;
  setIsComposing: (composing: boolean) => void;
  composeData: { to: string; subject: string; body: string; attachments?: string[] };
  setComposeData: (data: { to: string; subject: string; body: string; attachments?: string[] }) => void;
  handleSendMessage: () => void;
  handleSendUrgentMessage?: () => void; // Adicionar handler de envio de mensagem urgente
  unreadTotal: number;
  correspondenciaTab: string;
  setCorrespondenciaTab: (tab: string) => void;
  inbox: Message[];
  sentMessages: Message[];
  searchMail: string;
  setSearchMail: (search: string) => void;
  filteredMessages: Message[];
  handleSelectMessage: (msg: Message) => void;
  setTab: (tab: string) => void;
  bi: string;
  isInst?: boolean;
  onDeleteMessage?: (id: number) => void;
  onRestoreMessage?: (id: number) => void;
  deletedMessageIds?: number[];
  hiddenMessageIds?: number[];
  onNavigateToVideoAtendimento?: () => void;
  videoSessionCount?: number;
  currentLanguage?: LanguageCode;
}

export function MailContent({
  isComposing,
  setIsComposing,
  composeData = { to: '', subject: '', body: '', attachments: [] },
  setComposeData,
  handleSendMessage,
  handleSendUrgentMessage, // Handler urgente injetado
  unreadTotal,
  correspondenciaTab,
  setCorrespondenciaTab,
  inbox = [],
  sentMessages = [],
  searchMail,
  setSearchMail,
  filteredMessages = [],
  handleSelectMessage,
  setTab,
  bi,
  isInst,
  onDeleteMessage,
  onRestoreMessage,
  deletedMessageIds = [],
  hiddenMessageIds = [],
  onNavigateToVideoAtendimento,
  videoSessionCount = 0,
  currentLanguage: propLanguage = 'pt'
}: MailContentProps) {
  const { currentLanguage, t } = useLanguage();
  const [editorBold, setEditorBold] = useState(false);
  const [editorItalic, setEditorItalic] = useState(false);
  const [editorUnderline, setEditorUnderline] = useState(false);
  const [editorFont, setEditorFont] = useState('sans-serif');
  const [editorFontSize, setEditorFontSize] = useState('base');
  const [editorAlignment, setEditorAlignment] = useState('left');
  const [editorColor, setEditorColor] = useState('#1e293b');
  const [editorIsQuote, setEditorIsQuote] = useState(false);
  const [editorListType, setEditorListType] = useState<string | null>(null);

  const [textHistory, setTextHistory] = useState<string[]>([composeData.body || '']);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [provincia, setProvincia] = useState('Luanda');
  const [cidade, setCidade] = useState('Luanda');
  const [municipio, setMunicipio] = useState('Benfica');

  const [isSearchingRecipient, setIsSearchingRecipient] = useState(false);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
  const [searchStatusText, setSearchStatusText] = useState('');
  const [searchFeedback, setSearchFeedback] = useState<{
    status: 'idle' | 'searching' | 'found' | 'not_found';
    message: string;
    citizen?: any;
  }>({ status: 'idle', message: '' });
  const [searchProgress, setSearchProgress] = useState(0);

  const [editingAttachmentIdx, setEditingAttachmentIdx] = useState<number | null>(null);
  const [editingAttachmentContent, setEditingAttachmentContent] = useState<string>('');
  const [messageToDelete, setMessageToDelete] = useState<{ id: number; isPermanent: boolean } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMessage, setUploadProgressMessage] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Estados para popup (modal de confirmação obrigatória)
  const [isOfficialConfirmOpen, setIsOfficialConfirmOpen] = useState(false);
  const [isUrgentConfirmOpen, setIsUrgentConfirmOpen] = useState(false);

  const triggerRecipientSearch = (value: string) => {
    const term = value.trim();
    if (!term) {
      setSearchFeedback({ status: 'idle', message: '' });
      setIsSearchingRecipient(false);
      return;
    }

    if (searchTimer) {
      clearTimeout(searchTimer);
    }
    
    setIsSearchingRecipient(true);
    setSearchProgress(0);
    setSearchFeedback({ status: 'searching', message: 'Iniciando pesquisa na base de dados...' });
    
    const statusLogs = [
      "A ligar ao Servidor de Identificação Civil Nacional...",
      "A consultar índice de Bilhetes de Identidade...",
      "A ler base de dados governamental (SME & Registo Civil)...",
      "A analisar padrões de nomes e caracteres...",
      "A verificar assinaturas digitais e biometria associada...",
      "A cruzar dados com a rede central de Luanda...",
      "A autenticar integridade dos dados obtidos...",
      "A finalizar compilação de resultados..."
    ];

    let currentProgress = 0;
    const intervalTime = 500; // update progress twice a second
    const totalDuration = 8000; // exactly 8 seconds
    
    const interval = setInterval(() => {
      currentProgress += (100 / (totalDuration / intervalTime));
      const nextProgress = Math.min(Math.round(currentProgress), 100);
      setSearchProgress(nextProgress);
      
      const logIndex = Math.min(
        Math.floor((nextProgress / 100) * statusLogs.length),
        statusLogs.length - 1
      );
      setSearchStatusText(statusLogs[logIndex]);
    }, intervalTime);

    setSearchStatusText(statusLogs[0]);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setIsSearchingRecipient(false);
      
      const normalized = term.toLowerCase();
      const matched = MOCK_CITIZENS.find(c => 
        c.bi.toLowerCase() === normalized || 
        c.fullName.toLowerCase() === normalized ||
        c.fullName.toLowerCase().includes(normalized)
      );

      if (matched) {
        setSearchFeedback({
          status: 'found',
          message: `Cidadão Localizado: ${matched.fullName}`,
          citizen: matched
        });
        setComposeData({
          ...composeData,
          to: matched.bi
        });
      } else {
        const matchedUser = MOCK_USERS.find(u => 
          u.bi.toLowerCase() === normalized || 
          u.name.toLowerCase() === normalized ||
          u.name.toLowerCase().includes(normalized)
        );
        if (matchedUser) {
          setSearchFeedback({
            status: 'found',
            message: `Cidadão Localizado: ${matchedUser.name}`,
            citizen: matchedUser
          });
          setComposeData({
            ...composeData,
            to: matchedUser.bi
          });
        } else {
          setSearchFeedback({
            status: 'not_found',
            message: 'Dado não encontrado!'
          });
        }
      }
    }, totalDuration);

    setSearchTimer(timeout);
  };

  useEffect(() => {
    return () => {
      if (searchTimer) {
        clearTimeout(searchTimer);
      }
    };
  }, [searchTimer]);

  useEffect(() => {
    if (!composeData.to.trim()) {
      setSearchFeedback({ status: 'idle', message: '' });
      setIsSearchingRecipient(false);
      return;
    }

    if (searchFeedback.status === 'found') {
      const cit = searchFeedback.citizen;
      if (cit && (composeData.to === cit.bi || composeData.to === cit.fullName)) {
        return;
      }
    }
    
    if (isSearchingRecipient) {
      return;
    }

    const debounceTimeout = setTimeout(() => {
      if (composeData.to.trim().length >= 3) {
        triggerRecipientSearch(composeData.to);
      }
    }, 1500);

    return () => clearTimeout(debounceTimeout);
  }, [composeData.to]);

  const PROVINCIAS_OPCOES = [
    { value: 'Luanda', label: 'Luanda' },
    { value: 'Benguela', label: 'Benguela' },
    { value: 'Huíla', label: 'Huíla' },
    { value: 'Cabinda', label: 'Cabinda' },
  ];

  const CIDADES_OPCOES: Record<string, { value: string; label: string }[]> = {
    Luanda: [
      { value: 'Luanda', label: 'Luanda' },
      { value: 'Talatona', label: 'Talatona' },
      { value: 'Cacuaco', label: 'Cacuaco' },
      { value: 'Viana', label: 'Viana' }
    ],
    Benguela: [
      { value: 'Benguela', label: 'Benguela' },
      { value: 'Lobito', label: 'Lobito' },
      { value: 'Catumbela', label: 'Catumbela' }
    ],
    Huíla: [
      { value: 'Lubango', label: 'Lubango' },
      { value: 'Humpata', label: 'Humpata' },
      { value: 'Chibia', label: 'Chibia' }
    ],
    Cabinda: [
      { value: 'Cabinda', label: 'Cabinda' },
      { value: 'Cacongo', label: 'Cacongo' }
    ]
  };

  const MUNICIPIOS_OPCOES: Record<string, { value: string; label: string }[]> = {
    Luanda: [
      { value: 'Benfica', label: 'Benfica' },
      { value: 'Belas', label: 'Belas' },
      { value: 'Sambizanga', label: 'Sambizanga' },
      { value: 'Cazenga', label: 'Cazenga' }
    ],
    Talatona: [
      { value: 'Talatona Centro', label: 'Talatona Centro' },
      { value: 'Camama', label: 'Camama' }
    ],
    Cacuaco: [
      { value: 'Cacuaco Sede', label: 'Cacuaco Sede' },
      { value: 'Kicolo', label: 'Kicolo' }
    ],
    Viana: [
      { value: 'Viana Sede', label: 'Viana Sede' },
      { value: 'Estalagem', label: 'Estalagem' }
    ],
    Benguela: [
      { value: 'Benguela Sede', label: 'Benguela Sede' },
      { value: 'Baía Farta', label: 'Baía Farta' }
    ],
    Lobito: [
      { value: 'Lobito Sede', label: 'Lobito Sede' },
      { value: 'Canata', label: 'Canata' }
    ],
    Catumbela: [
      { value: 'Catumbela Sede', label: 'Catumbela Sede' }
    ],
    Lubango: [
      { value: 'Lubango Sede', label: 'Lubango Sede' },
      { value: 'Arriba', label: 'Arriba' }
    ],
    Humpata: [
      { value: 'Humpata Sede', label: 'Humpata Sede' }
    ],
    Chibia: [
      { value: 'Chibia Sede', label: 'Chibia Sede' }
    ],
    Cabinda: [
      { value: 'Cabinda Sede', label: 'Cabinda Sede' },
      { value: 'Landana', label: 'Landana' }
    ],
    Cacongo: [
      { value: 'Cacongo Sede', label: 'Cacongo Sede' }
    ]
  };

  useEffect(() => {
    if (isComposing) {
      setTextHistory([composeData.body || '']);
      setHistoryIndex(0);
    }
  }, [isComposing]);

  const updateBodyText = (newText: string) => {
    setComposeData({ ...composeData, body: newText });
    const nextHistory = textHistory.slice(0, historyIndex + 1);
    setTextHistory([...nextHistory, newText]);
    setHistoryIndex(nextHistory.length);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setComposeData({ ...composeData, body: textHistory[prevIdx] });
    }
  };

  const handleRedo = () => {
    if (historyIndex < textHistory.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setComposeData({ ...composeData, body: textHistory[nextIdx] });
    }
  };

  const clearFormatting = () => {
    setEditorBold(false);
    setEditorItalic(false);
    setEditorUnderline(false);
    setEditorFont('sans-serif');
    setEditorFontSize('base');
    setEditorAlignment('left');
    setEditorColor('#1e293b');
    setEditorIsQuote(false);
    setEditorListType(null);
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    setUploadError(null);
    if (files && files.length > 0) {
      const currentList = composeData.attachments || [];
      const totalCount = currentList.length + files.length;
      if (totalCount > 20) {
        setUploadError(
          `Não é possível enviar ${totalCount} ficheiros de uma só vez. ` +
          "O limite de segurança para anexos é de 20 ficheiros por mensagem. " +
          "Para enviar 109 ficheiros ou uma quantidade elevada, recomendamos agrupar os ficheiros num arquivo compactado (.zip ou .rar) ou enviá-los de forma fracionada."
        );
        return;
      }
      setIsUploading(true);
      setUploadProgressMessage(t("A carregar ficheiros para o arquivo digital central..."));
      const promises = Array.from(files).map((file: any) => {
        return new Promise<string>((resolve) => {
          const readAsLocalFallback = (f: File, res: (val: string) => void) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              let content = '';
              if (f.type.startsWith('image/')) {
                content = event.target?.result as string || ''; // data URL
              } else {
                content = event.target?.result as string || ''; // text content
              }
              if (!content) {
                content = `Este é o conteúdo do documento oficial '${f.name}' anexado a esta correspondência.`;
              }
              res(JSON.stringify({
                name: f.name,
                size: `${(f.size / 1024).toFixed(1)} KB`,
                content: content,
                type: f.type
              }));
            };
            reader.onerror = () => {
              res(JSON.stringify({
                name: f.name,
                size: `${(f.size / 1024).toFixed(1)} KB`,
                content: `Erro ao ler o ficheiro ${f.name}.`,
                type: f.type
              }));
            };
            if (f.type.startsWith('image/')) {
              reader.readAsDataURL(f);
            } else {
              reader.readAsText(f);
            }
          };

          const isSupabaseReady = (import.meta as any).env.VITE_SUPABASE_URL && (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
          if (isSupabaseReady) {
            const fileExt = file.name.split('.').pop() || 'dat';
            const fileCleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
            const filePath = `${bi || 'geral'}/${Date.now()}_${fileCleanName}.${fileExt}`;
            
            supabase.storage
              .from('correspondencias_anexos')
              .upload(filePath, file)
              .then(({ error: uploadErr }) => {
                if (uploadErr) {
                  console.error('Erro upload anexo:', uploadErr);
                  readAsLocalFallback(file, resolve);
                } else {
                  const { data } = supabase.storage.from('correspondencias_anexos').getPublicUrl(filePath);
                  resolve(JSON.stringify({
                    name: file.name,
                    size: `${(file.size / 1024).toFixed(1)} KB`,
                    content: data.publicUrl, // URL in Supabase Storage
                    type: file.type
                  }));
                }
              })
              .catch((err) => {
                console.error('Catch erro upload anexo:', err);
                readAsLocalFallback(file, resolve);
              });
          } else {
            readAsLocalFallback(file, resolve);
          }
        });
      });

      Promise.all(promises).then((newSerializedFiles) => {
        const existingNames = currentList.map(item => {
          try {
            if (item.trim().startsWith('{')) {
              return JSON.parse(item).name;
            }
          } catch {}
          return item;
        });

        const filteredNewFiles = newSerializedFiles.filter(item => {
          try {
            const name = JSON.parse(item).name;
            return !existingNames.includes(name);
          } catch {
            return !existingNames.includes(item);
          }
        });

        setComposeData({
          ...composeData,
          attachments: [...currentList, ...filteredNewFiles]
        });
        setIsUploading(false);
        setUploadProgressMessage('');
      }).catch(() => {
        setIsUploading(false);
        setUploadProgressMessage('');
      });
    }
  };

  const handleFileRemove = (rawString: string) => {
    const currentList = composeData.attachments || [];
    setComposeData({
      ...composeData,
      attachments: currentList.filter(f => f !== rawString)
    });
  };

  const handleCreateVirtualAttachment = () => {
    const defaultName = `anexo_correspondencia_${Date.now().toString().slice(-4)}.txt`;
    const newAttachment = JSON.stringify({
      name: defaultName,
      size: '1.0 KB',
      content: `Este é o conteúdo do documento anexado '${defaultName}'.`,
      type: 'text/plain'
    });
    const currentList = composeData.attachments || [];
    setComposeData({
      ...composeData,
      attachments: [...currentList, newAttachment]
    });
    setEditingAttachmentIdx(currentList.length);
    setEditingAttachmentContent(`Este é o conteúdo do documento anexado '${defaultName}'.`);
  };

  const handleSaveAttachmentContent = (newName: string) => {
    if (editingAttachmentIdx === null || !composeData.attachments) return;
    const currentList = [...composeData.attachments];
    const item = currentList[editingAttachmentIdx];
    let name = item;
    let size = '1.0 KB';
    let type = 'text/plain';

    if (item.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(item);
        name = newName || parsed.name;
        size = parsed.size;
        type = parsed.type;
      } catch (e) {}
    } else {
      name = newName || item;
    }

    const byteCount = new Blob([editingAttachmentContent]).size;
    if (byteCount < 1024) {
      size = `${byteCount} B`;
    } else if (byteCount < 1024 * 1024) {
      size = `${(byteCount / 1024).toFixed(1)} KB`;
    } else {
      size = `${(byteCount / (1024 * 1024)).toFixed(1)} MB`;
    }

    currentList[editingAttachmentIdx] = JSON.stringify({
      name: name,
      size: size,
      content: editingAttachmentContent,
      type: type
    });

    setComposeData({
      ...composeData,
      attachments: currentList
    });
    setEditingAttachmentIdx(null);
  };

  if (isComposing) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => setIsComposing(false)}
            className="flex items-center justify-center w-10 h-10 bg-white border-2 border-[#d1dbe5] rounded-full text-[#384e6e] hover:bg-slate-50 transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 shrink-0"
            aria-label="Voltar"
            title="Voltar ao Correio"
          >
            <ArrowLeft size={16} className="text-[#384e6e]" />
          </button>
          <div>
            <h3 className="text-base md:text-xl font-black text-primary leading-none">Nova Mensagem</h3>
            <p className="text-[9px] md:text-[10px] text-slate-700 font-black uppercase tracking-widest mt-1">Comunicação Oficial Directa</p>
          </div>
        </div>

        <div className="bg-white border border-line rounded-[24px] md:rounded-[32px] p-5 md:p-10 shadow-sm space-y-5 md:space-y-6">
          {isInst ? (
            <div className="grid grid-cols-1 gap-5 md:gap-6">
              <div className="space-y-2">
                <label className="text-[10px] md:text-sm font-black text-slate-600 uppercase tracking-widest pl-1">
                  Destinatário
                </label>
                <div className="relative flex items-center">
                  <input 
                    type="text"
                    placeholder="Introduz o N-BI ou Nome Completo"
                    value={composeData.to}
                    onChange={(e) => {
                      setComposeData({ ...composeData, to: e.target.value });
                    }}
                    disabled={isSearchingRecipient}
                    className="w-full bg-white border border-line rounded-2xl pl-5 pr-12 py-3.5 md:py-4 text-xs md:text-sm font-mono font-bold text-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none disabled:opacity-75 disabled:bg-slate-50"
                  />
                  <div className="absolute right-4 flex items-center gap-2">
                    {isSearchingRecipient ? (
                      <Loader2 className="animate-spin text-indigo-600" size={18} />
                    ) : (
                      <button
                        onClick={() => triggerRecipientSearch(composeData.to)}
                        type="button"
                        title="Procurar na base de dados"
                        className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                        disabled={!composeData.to.trim()}
                      >
                        <Search size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Animated searching block & results */}
                <AnimatePresence mode="wait">
                  {isSearchingRecipient && (
                    <motion.div 
                      key="searching-state"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mt-2 space-y-3">
                        <div className="flex items-center gap-3">
                          <Loader2 className="animate-spin text-indigo-600 shrink-0" size={18} />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-indigo-950 block">A pesquisar base de dados civil...</span>
                            <span className="text-[10px] text-indigo-600 font-semibold block truncate animate-pulse">
                              {searchStatusText}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full shrink-0">
                            {searchProgress}%
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-indigo-600"
                            initial={{ width: '0%' }}
                            animate={{ width: `${searchProgress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {!isSearchingRecipient && searchFeedback.status === 'found' && (
                    <motion.div 
                      key="found-state"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mt-2 flex items-start gap-3">
                        <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-extrabold text-emerald-950 block">Cidadão Localizado com Sucesso</span>
                          <p className="text-[11px] text-emerald-800 font-bold mt-1">
                            {searchFeedback.citizen?.fullName || searchFeedback.message}
                          </p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 pt-2 border-t border-emerald-100/60 text-[9.5px] font-mono text-emerald-700 font-bold">
                            <div>BI: {searchFeedback.citizen?.bi}</div>
                            <div>NIF: {searchFeedback.citizen?.nif || 'Não associado'}</div>
                            <div>Tel: {searchFeedback.citizen?.phone || 'Não associado'}</div>
                            <div>Província: {searchFeedback.citizen?.province || 'Não associado'}</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {!isSearchingRecipient && searchFeedback.status === 'not_found' && (
                    <motion.div 
                      key="not-found-state"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mt-2 flex items-center gap-3">
                        <AlertTriangle className="text-rose-600 shrink-0" size={18} />
                        <div>
                          <span className="text-xs font-black text-rose-950 block">Dado não encontrado!</span>
                          <span className="text-[10px] text-rose-700 font-bold block mt-0.5">
                            Por favor, verifique se o número de BI ou nome completo foi inserido correctamente e tente novamente.
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] md:text-sm font-black text-slate-600 uppercase tracking-widest pl-1">Assunto</label>
                <input 
                  type="text"
                  placeholder="Qual o tema da sua mensagem?"
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  className="w-full bg-white border border-line rounded-2xl px-5 py-3.5 md:py-4 text-xs md:text-sm font-bold text-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-5 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] md:text-sm font-black text-slate-600 uppercase tracking-widest pl-1">
                    Destinatário Institucional
                  </label>
                  <div className="relative">
                    <select 
                      value={composeData.to}
                      onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                      className="w-full bg-white border border-line rounded-2xl px-5 py-3.5 md:py-4 text-xs md:text-sm font-bold text-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none appearance-none cursor-pointer"
                    >
                      <option value="">Selecione uma instituição...</option>
                      {["INAPEM", "SME", "AGT", "ENDE", "EPAL", "Tribunal", "Hospital", "Registo Civil", "INE"].map(org => (
                        <option key={org} value={org}>{org}</option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ArrowLeft className="-rotate-90" size={14} />
                    </div>
                  </div>
                </div>
 
                <div className="space-y-2">
                  <label className="text-[10px] md:text-sm font-black text-slate-600 uppercase tracking-widest pl-1">
                    Província
                  </label>
                  <div className="relative">
                    <select 
                      value={provincia}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProvincia(val);
                        const firstCity = CIDADES_OPCOES[val]?.[0]?.value || '';
                        setCidade(firstCity);
                        const listM = MUNICIPIOS_OPCOES[firstCity] || MUNICIPIOS_OPCOES[val] || [];
                        setMunicipio(listM[0]?.value || '');
                      }}
                      className="w-full bg-white border border-line rounded-2xl px-5 py-3.5 md:py-4 text-xs md:text-sm font-bold text-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none appearance-none cursor-pointer"
                    >
                      {PROVINCIAS_OPCOES.map(prov => (
                        <option key={prov.value} value={prov.value}>{prov.label}</option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ArrowLeft className="-rotate-90" size={14} />
                    </div>
                  </div>
                </div>
 
                <div className="space-y-2">
                  <label className="text-[10px] md:text-sm font-black text-slate-600 uppercase tracking-widest pl-1">
                    Cidade
                  </label>
                  <div className="relative">
                    <select 
                      value={cidade}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCidade(val);
                        const listM = MUNICIPIOS_OPCOES[val] || [];
                        setMunicipio(listM[0]?.value || '');
                      }}
                      className="w-full bg-white border border-line rounded-2xl px-5 py-3.5 md:py-4 text-xs md:text-sm font-bold text-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none appearance-none cursor-pointer"
                    >
                      {(CIDADES_OPCOES[provincia] || []).map(cid => (
                        <option key={cid.value} value={cid.value}>{cid.label}</option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ArrowLeft className="-rotate-90" size={14} />
                    </div>
                  </div>
                </div>
 
                <div className="space-y-2">
                  <label className="text-[10px] md:text-sm font-black text-slate-600 uppercase tracking-widest pl-1">
                    Município
                  </label>
                  <div className="relative">
                    <select 
                      value={municipio}
                      onChange={(e) => setMunicipio(e.target.value)}
                      className="w-full bg-white border border-line rounded-2xl px-5 py-3.5 md:py-4 text-xs md:text-sm font-bold text-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none appearance-none cursor-pointer"
                    >
                      {(MUNICIPIOS_OPCOES[cidade] || MUNICIPIOS_OPCOES[provincia] || []).map(mun => (
                        <option key={mun.value} value={mun.value}>{mun.label}</option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ArrowLeft className="-rotate-90" size={14} />
                    </div>
                  </div>
                </div>
              </div>
 
              <div className="space-y-2">
                <label className="text-[10px] md:text-sm font-black text-slate-600 uppercase tracking-widest pl-1">Assunto</label>
                <input 
                  type="text"
                  placeholder="Qual o tema da sua mensagem?"
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  className="w-full bg-white border border-line rounded-2xl px-5 py-3.5 md:py-4 text-xs md:text-sm font-bold text-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                />
              </div>
            </div>
          )}
 
          <div className="space-y-2">
            <label className="text-[10px] md:text-sm font-black text-slate-600 uppercase tracking-widest pl-1">Conteúdo da Mensagem</label>
            
            {/* Rich text Toolbar for composing, styled exactly like the official responder */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white border border-slate-200 rounded-2xl mb-2 shadow-xs">
              {/* Undo / Redo */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyIndex === 0}
                  title="Desfazer (Undo)"
                  className={`p-2 rounded-xl hover:bg-slate-200/80 active:scale-95 transition-all ${
                    historyIndex === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Undo size={14} className="stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={historyIndex >= textHistory.length - 1}
                  title="Refazer (Redo)"
                  className={`p-2 rounded-xl hover:bg-slate-200/80 active:scale-95 transition-all ${
                    historyIndex >= textHistory.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Redo size={14} className="stroke-[2.5]" />
                </button>
              </div>

              <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

              {/* Font Family Selector Dropdown */}
              <div className="relative">
                <select
                  value={editorFont}
                  onChange={(e) => setEditorFont(e.target.value)}
                  className="bg-transparent text-slate-700 text-xs font-semibold py-1 pl-2 pr-5 border border-transparent rounded-xl hover:bg-slate-200/60 cursor-pointer focus:outline-none appearance-none font-sans"
                >
                  <option value="sans-serif">Sans Serif</option>
                  <option value="serif">Serif (Editorial)</option>
                  <option value="monospace">Monospace</option>
                </select>
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[8px] font-black">▼</div>
              </div>

              <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

              {/* Font Size Selector Dropdown "tT" */}
              <div className="relative flex items-center">
                <span className="text-[10px] font-black mr-1 text-slate-500">tT</span>
                <select
                  value={editorFontSize}
                  onChange={(e) => setEditorFontSize(e.target.value)}
                  className="bg-transparent text-slate-700 text-xs font-semibold py-1 pl-1.5 pr-4 border border-transparent rounded-xl hover:bg-slate-200/60 cursor-pointer focus:outline-none appearance-none font-sans"
                >
                  <option value="sm">Pequeno</option>
                  <option value="base">Normal</option>
                  <option value="lg">Grande</option>
                  <option value="xl">Título</option>
                </select>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[8px] font-black">▼</div>
              </div>

              <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

              {/* Inline formatting styles B, I, U */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setEditorBold(!editorBold)}
                  title="Negrito (Bold)"
                  className={`p-1.5 rounded-xl active:scale-95 transition-all font-black text-xs min-w-[28px] flex items-center justify-center ${
                    editorBold 
                      ? 'bg-indigo-100/80 text-indigo-755 border border-indigo-200/30' 
                      : 'text-slate-650 hover:bg-slate-200/60 hover:text-slate-900'
                  }`}
                >
                  <Bold size={13} className="stroke-[3]" />
                </button>

                <button
                  type="button"
                  onClick={() => setEditorItalic(!editorItalic)}
                  title="Itálico (Italic)"
                  className={`p-1.5 rounded-xl active:scale-95 transition-all font-black text-xs min-w-[28px] flex items-center justify-center ${
                    editorItalic 
                      ? 'bg-indigo-100/80 text-indigo-755 border border-indigo-200/30' 
                      : 'text-slate-650 hover:bg-slate-200/60 hover:text-slate-900'
                  }`}
                >
                  <Italic size={13} className="stroke-[3]" />
                </button>

                <button
                  type="button"
                  onClick={() => setEditorUnderline(!editorUnderline)}
                  title="Sublinhado (Underline)"
                  className={`p-1.5 rounded-xl active:scale-95 transition-all font-black text-xs min-w-[28px] flex items-center justify-center ${
                    editorUnderline 
                      ? 'bg-indigo-100/80 text-indigo-755 border border-indigo-200/30' 
                      : 'text-slate-650 hover:bg-slate-200/60 hover:text-slate-900'
                  }`}
                >
                  <Underline size={13} className="stroke-[3]" />
                </button>
              </div>

              <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

              {/* Font Color Selection */}
              <div className="relative group">
                <button
                  type="button"
                  title="Cor do Texto"
                  className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span className="font-extrabold text-xs border-b-2 leading-none" style={{ borderColor: editorColor }}>A</span>
                  <span className="text-[6px]">▼</span>
                </button>
                <div className="absolute left-0 top-8 hidden group-hover:flex group-focus-within:flex flex-col bg-white border border-slate-200 rounded-xl p-2 shadow-xl z-20 min-w-[130px] gap-1 text-left">
                  <span className="text-[8px] font-bold text-slate-400 select-none uppercase tracking-widest px-1">Cor da Fonte</span>
                  <div className="grid grid-cols-5 gap-1 pt-1">
                    {[
                      { label: 'Slate', value: '#1e293b', bgClass: 'bg-slate-800' },
                      { label: 'Red', value: '#dc2626', bgClass: 'bg-red-600' },
                      { label: 'Blue', value: '#2563eb', bgClass: 'bg-blue-600' },
                      { label: 'Green', value: '#16a34a', bgClass: 'bg-green-600' },
                      { label: 'Gold', value: '#ca8a04', bgClass: 'bg-yellow-600' }
                    ].map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setEditorColor(color.value)}
                        title={color.label}
                        className={`w-3.5 h-3.5 rounded-full border transition-all cursor-pointer ${color.bgClass} ${
                          editorColor === color.value ? 'ring-2 ring-indigo-500 ring-offset-1 border-white' : 'border-black/5'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

              {/* Paragraph Alignment Selector Button Row */}
              <div className="flex items-center gap-0.5">
                {[
                  { val: 'left', icon: <AlignLeft size={13} />, title: 'Alinhar à Esquerda' },
                  { val: 'center', icon: <AlignCenter size={13} />, title: 'Alinhar ao Centro' },
                  { val: 'right', icon: <AlignRight size={13} />, title: 'Alinhar à Direita' },
                  { val: 'justify', icon: <AlignJustify size={13} />, title: 'Justificar' }
                ].map((align) => (
                  <button
                    key={align.val}
                    type="button"
                    onClick={() => setEditorAlignment(align.val)}
                    title={align.title}
                    className={`p-1.5 rounded-xl active:scale-95 transition-all text-slate-600 cursor-pointer ${
                      editorAlignment === align.val 
                        ? 'bg-indigo-100/85 text-indigo-755 border border-indigo-200/30' 
                        : 'hover:bg-slate-200/60 hover:text-slate-900'
                    }`}
                  >
                    {align.icon}
                  </button>
                ))}
              </div>

              <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

              {/* List Type Bullet/Ordered Toggles */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (editorListType === 'bullet') {
                      setEditorListType(null);
                    } else {
                      setEditorListType('bullet');
                      if (!composeData.body.trim().startsWith('•') && !composeData.body.trim().startsWith('-')) {
                        updateBodyText(`• ` + composeData.body);
                      }
                    }
                  }}
                  title="Lista de Marcadores (Bullets)"
                  className={`p-1.5 rounded-xl active:scale-95 transition-all cursor-pointer ${
                    editorListType === 'bullet'
                      ? 'bg-indigo-100/85 text-indigo-755 border border-indigo-200/30'
                      : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                  }`}
                >
                  <List size={13} />
                </button>
              </div>

              <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

              {/* Blockquote Toggle */}
              <button
                type="button"
                onClick={() => setEditorIsQuote(!editorIsQuote)}
                title="Citação (Blockquote)"
                className={`p-1.5 rounded-xl active:scale-95 transition-all cursor-pointer ${
                  editorIsQuote
                    ? 'bg-indigo-100/85 text-indigo-755 border border-indigo-200/30'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                }`}
              >
                <Quote size={13} />
              </button>

              {/* Clear formatting Eraser */}
              <button
                type="button"
                onClick={clearFormatting}
                title="Limpar Formatação"
                className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-200 hover:text-red-650 hover:bg-red-50/70 active:scale-95 transition-all ml-auto cursor-pointer"
              >
                <Eraser size={13} />
              </button>
            </div>

            <textarea 
              rows={8}
              placeholder="Descreva detalhadamente o seu pedido ou informação..."
              value={composeData.body}
              onChange={(e) => updateBodyText(e.target.value)}
              className={`w-full bg-white border border-line rounded-2xl px-5 py-3.5 md:py-4 text-xs md:text-sm font-semibold focus:ring-4 focus:ring-primary/5 transition-all outline-none resize-none leading-relaxed ${
                editorFont === 'serif' ? 'font-serif' : editorFont === 'monospace' ? 'font-mono' : 'font-sans'
              } ${
                editorFontSize === 'sm' ? 'text-xs' : editorFontSize === 'lg' ? 'text-base md:text-lg' : editorFontSize === 'xl' ? 'text-lg md:text-xl font-bold' : 'text-sm'
              } ${
                editorAlignment === 'center' ? 'text-center' : editorAlignment === 'right' ? 'text-right' : editorAlignment === 'justify' ? 'text-justify' : 'text-left'
              }`}
              style={{
                fontWeight: editorBold ? 'bold' : 'normal',
                fontStyle: editorItalic ? 'italic' : 'normal',
                textDecoration: editorUnderline ? 'underline' : 'none',
                color: editorColor,
                borderLeft: editorIsQuote ? '4px solid #6366f1' : undefined,
                paddingLeft: editorIsQuote ? '1rem' : undefined,
              }}
            />
          </div>

          {isUploading && (
            <div className="flex items-center gap-2.5 p-4 bg-indigo-50 border border-indigo-150 rounded-2xl text-indigo-800 text-xs font-black animate-pulse mt-4">
              <Loader2 size={16} className="animate-spin text-indigo-600 shrink-0" />
              <span>{uploadProgressMessage}</span>
            </div>
          )}

          {uploadError && (
            <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-150 rounded-2xl text-rose-800 text-xs font-bold mt-4 animate-fadeIn">
              <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-black block uppercase tracking-wider mb-1 text-rose-950">Limite de Anexos Excedido</span>
                <span className="text-rose-700 leading-relaxed font-semibold">{uploadError}</span>
              </div>
            </div>
          )}

          {/* List of Attached Files */}
          {composeData.attachments && composeData.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl mt-4">
              {composeData.attachments.map((item, fIdx) => {
                let name = item;
                let size = '150 KB';
                if (item.trim().startsWith('{')) {
                  try {
                    const parsed = JSON.parse(item);
                    name = parsed.name;
                    size = parsed.size;
                  } catch (e) {}
                }
                return (
                  <div 
                    key={fIdx} 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-xs text-[11px] font-bold text-slate-700 animate-fadeIn"
                  >
                    <FileText size={13} className="text-indigo-600 shrink-0" />
                    <span className="truncate max-w-[160px] select-none" title={name}>{name}</span>
                    <span className="text-[9px] text-slate-400 font-mono select-none">({size})</span>
                    
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingAttachmentIdx(fIdx);
                        let initialContent = '';
                        if (item.trim().startsWith('{')) {
                          try {
                            initialContent = JSON.parse(item).content || '';
                          } catch {}
                        } else {
                          initialContent = `Este é o conteúdo do documento oficial '${name}' anexado a esta correspondência.`;
                        }
                        setEditingAttachmentContent(initialContent);
                      }}
                      className="p-0.5 hover:bg-indigo-50 text-slate-450 hover:text-indigo-600 rounded transition-colors cursor-pointer ml-1"
                      title="Editar conteúdo do anexo"
                    >
                      <Edit2 size={11} />
                    </button>

                    <button 
                      type="button"
                      onClick={() => handleFileRemove(item)}
                      className="p-0.5 hover:bg-red-50 text-slate-450 hover:text-red-500 rounded transition-colors cursor-pointer ml-0.5"
                      title="Remover anexo"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2 md:pt-4 flex flex-col md:flex-row gap-3 md:gap-4 items-center">
            <button 
              onClick={handleSendMessage}
              disabled={!composeData.to || !composeData.subject || !composeData.body}
              className="w-full md:flex-[2] bg-primary text-white py-4 rounded-2xl font-black text-sm md:text-base shadow-xl shadow-primary/25 hover:bg-primary/95 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 md:gap-3 cursor-pointer"
            >
              <Send size={18} />
              Enviar Mensagem Oficial
            </button>

            {/* Novo botão Enviar Mensagem Urgente para Área Institucional autorizada */}
            {isInst && (
              <button 
                onClick={handleSendUrgentMessage}
                disabled={!composeData.to || !composeData.subject || !composeData.body}
                className="w-full md:flex-[2] bg-red-600 text-white py-4 rounded-2xl font-black text-sm md:text-base shadow-xl shadow-red-200 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 md:gap-3 cursor-pointer border-0"
              >
                <AlertTriangle size={18} className="text-white animate-pulse" />
                Enviar Mensagem Urgente
              </button>
            )}

            <label 
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-sm rounded-2xl transition-all cursor-pointer active:scale-95 border border-slate-300 relative shadow-sm shrink-0"
              title="Anexar múltiplos ficheiros"
            >
              <Paperclip size={18} className="stroke-[2.5] text-slate-500" />
              <span>Anexar Ficheiros</span>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx"
                className="hidden"
                onChange={handleFileAdd}
              />
              {composeData.attachments && composeData.attachments.length > 0 && (
                <span className="bg-primary text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs ml-1 shrink-0">
                  {composeData.attachments.length}
                </span>
              )}
            </label>

            <button 
              onClick={() => {
                if(confirm("Deseja descartar este rascunho?")) setIsComposing(false);
              }}
              className="w-full md:flex-1 py-4 px-8 rounded-2xl font-bold text-xs md:text-sm text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Descartar
            </button>
          </div>
        </div>

        {/* POPUP DE CONFIRMAÇÃO OBRIGATÓRIA - MENSAGEM OFICIAL */}
        <AnimatePresence>
          {isOfficialConfirmOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOfficialConfirmOpen(false)}
                className="absolute inset-0 bg-[#0c2340]/40 backdrop-blur-xs"
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="relative bg-white rounded-[32px] p-6 md:p-8 shadow-2xl max-w-md w-full text-left"
              >
                <h3 className="text-lg md:text-xl font-black text-slate-900 mb-3">
                  Confirmar Envio da Mensagem Oficial
                </h3>
                <p className="text-slate-600 text-xs md:text-sm leading-relaxed mb-6 font-medium">
                  Tem a certeza de que pretende enviar esta <strong className="text-primary font-black">Mensagem Oficial</strong>?
                  <br /><br />
                  Após a confirmação, a mensagem será enviada ao destinatário selecionado e ficará registada no histórico de comunicações da plataforma.
                </p>
                <div className="flex gap-3 justify-end">
                  <button 
                    type="button"
                    onClick={() => setIsOfficialConfirmOpen(false)}
                    className="px-5 py-3 bg-slate-100 text-slate-600 font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-200 transition-all cursor-pointer border-0 outline-none"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsOfficialConfirmOpen(false);
                      // Chamar a função original de envio injetada nas props
                      handleSendMessage();
                    }}
                    className="px-5 py-3 bg-primary text-white font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-95 transition-all cursor-pointer border-0 outline-none shadow-md shadow-primary/20"
                  >
                    Confirmar Envio
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* POPUP DE CONFIRMAÇÃO OBRIGATÓRIA - MENSAGEM URGENTE */}
        <AnimatePresence>
          {isUrgentConfirmOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsUrgentConfirmOpen(false)}
                className="absolute inset-0 bg-[#0c2340]/40 backdrop-blur-xs"
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="relative bg-white rounded-[32px] p-6 md:p-8 shadow-2xl max-w-md w-full text-left border-2 border-red-500"
              >
                <h3 className="text-lg md:text-xl font-black text-red-650 mb-3 flex items-center gap-2">
                  <AlertTriangle className="text-red-600 animate-pulse shrink-0" size={20} />
                  ⚠ Confirmar Envio da Mensagem Urgente
                </h3>
                <p className="text-slate-600 text-xs md:text-sm leading-relaxed mb-6 font-medium">
                  Está prestes a enviar uma <strong className="text-red-600 font-black">Mensagem Urgente</strong>.
                  <br /><br />
                  Esta mensagem será enviada imediatamente ao cidadão destinatário e, caso existam contactos de emergência registados na página <strong className="text-slate-900 font-black">"Contactos"</strong>, será igualmente enviada para todos esses contactos.
                  <br /><br />
                  Certifique-se de que esta comunicação corresponde efetivamente a uma situação de emergência.
                </p>
                <div className="flex gap-3 justify-end">
                  <button 
                    type="button"
                    onClick={() => setIsUrgentConfirmOpen(false)}
                    className="px-5 py-3 bg-slate-100 text-slate-600 font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-200 transition-all cursor-pointer border-0 outline-none"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsUrgentConfirmOpen(false);
                      if (handleSendUrgentMessage) {
                        handleSendUrgentMessage();
                      }
                    }}
                    className="px-5 py-3 bg-red-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-red-700 transition-all cursor-pointer border-0 outline-none shadow-md shadow-red-200"
                  >
                    Enviar Mensagem Urgente
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {editingAttachmentIdx !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans"
              onClick={() => setEditingAttachmentIdx(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="bg-white rounded-[24px] border border-slate-150 shadow-2xl w-full max-w-xl flex flex-col overflow-hidden text-left"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="bg-[#0c2340] p-5 text-white flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                      <FileText size={16} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-xs uppercase tracking-wider text-white">Editar Conteúdo do Anexo</h3>
                      <p className="text-[10px] text-slate-300 font-mono tracking-tight">O conteúdo editado será guardado digitalmente no anexo</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingAttachmentIdx(null)}
                    className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-white font-bold text-xs"
                  >
                    ✕
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-450 tracking-wider mb-1.5">Nome do Ficheiro</label>
                    <input 
                      type="text" 
                      id="edit-att-name"
                      defaultValue={(() => {
                        const item = composeData.attachments?.[editingAttachmentIdx];
                        if (item && item.trim().startsWith('{')) {
                          try {
                            return JSON.parse(item).name;
                          } catch {}
                        }
                        return item || '';
                      })()}
                      placeholder="nome_do_anexo.txt"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl px-4 py-2.5 text-xs font-bold font-sans outline-none transition-all text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-450 tracking-wider mb-1.5">Conteúdo / Texto do Documento</label>
                    <textarea
                      rows={10}
                      value={editingAttachmentContent}
                      onChange={(e) => setEditingAttachmentContent(e.target.value)}
                      placeholder="Escreva aqui o conteúdo que será lido ao abrir o documento anexo..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-2xl px-4 py-3.5 text-xs md:text-sm font-semibold outline-none transition-all resize-none leading-relaxed text-slate-700"
                    />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 flex justify-between">
                      <span>Tamanho aproximado: {new Blob([editingAttachmentContent]).size} bytes</span>
                      <button
                        type="button"
                        onClick={() => setEditingAttachmentContent(composeData.body)}
                        className="text-indigo-650 hover:text-indigo-800 hover:underline transition-colors cursor-pointer text-[9px]"
                      >
                        Copia corpo da mensagem
                      </button>
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 border-t border-slate-150 p-4 flex justify-end gap-2.5 shrink-0">
                  <button
                    onClick={() => setEditingAttachmentIdx(null)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      const nameInput = document.getElementById('edit-att-name') as HTMLInputElement;
                      handleSaveAttachmentContent(nameInput?.value || '');
                    }}
                    className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-md shadow-indigo-500/20"
                  >
                    Guardar no Anexo
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }


  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Mail size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <h3 className="text-lg md:text-2xl font-black text-primary leading-tight">{translateText("Correio Digital", currentLanguage)}</h3>
            <p className="text-[10px] md:text-sm text-slate-600 font-black uppercase tracking-widest">{unreadTotal} {translateText("mensagens por ler", currentLanguage)}</p>
          </div>
        </div>
        <button 
          onClick={() => setIsComposing(true)}
          className="bg-primary text-white rounded-2xl px-6 py-3.5 flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs md:text-sm font-black"
        >
          <Plus size={18} />
          {translateText("Nova Mensagem", currentLanguage)}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-1 text-[10px] font-black uppercase tracking-widest">
        <button 
          onClick={onNavigateToVideoAtendimento}
          className="text-indigo-600 hover:text-indigo-800 font-black uppercase tracking-widest text-[10px] transition-colors flex items-center gap-1.5 cursor-pointer bg-transparent border-0"
        >
          <Video size={14} className="shrink-0" />
          VideoAtendimento
          {videoSessionCount > 0 && (
            <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse ml-1">
              {videoSessionCount}
            </span>
          )}
        </button>
        {isInst && <button onClick={() => setTab('inst-qrcode')} className="cda-link-text">{translateText("Validação QR", currentLanguage)}</button>}
      </div>

      {/* Filters & Tabs Container */}
      <div className="bg-white border border-slate-300 rounded-[32px] p-2.5 shadow-sm flex flex-col lg:flex-row gap-3">
        <div className="flex flex-wrap md:flex-nowrap gap-1.5 p-1 bg-white border border-slate-200 rounded-2xl lg:min-w-[500px] w-full lg:w-auto">
          {[
            { id: 'lidas', label: 'Lidas', count: inbox.filter(m => !deletedMessageIds.includes(m.id) && !hiddenMessageIds.includes(m.id) && !m.unread).length },
            { id: 'naoLidas', label: 'Não Lidas', count: inbox.filter(m => !deletedMessageIds.includes(m.id) && !hiddenMessageIds.includes(m.id) && m.unread).length },
            { id: 'enviadas', label: 'Enviadas', count: sentMessages.filter(m => !deletedMessageIds.includes(m.id) && !hiddenMessageIds.includes(m.id)).length },
            { id: 'excluidas', label: 'Arquivadas', count: [...inbox, ...sentMessages].filter(m => deletedMessageIds.includes(m.id) && !hiddenMessageIds.includes(m.id)).length }
          ].map(tab => {
            const isActive = correspondenciaTab === tab.id;
            let activeStyle = '';
            let badgeStyle = '';

            if (isActive) {
              if (tab.id === 'lidas') {
                activeStyle = 'bg-emerald-600 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-600';
                badgeStyle = 'bg-white text-emerald-700';
              } else if (tab.id === 'naoLidas') {
                activeStyle = 'bg-red-600 text-white shadow-md shadow-red-200 ring-2 ring-red-600';
                badgeStyle = 'bg-white text-red-600';
              } else if (tab.id === 'enviadas') {
                activeStyle = 'bg-blue-600 text-white shadow-md shadow-blue-200 ring-2 ring-blue-600';
                badgeStyle = 'bg-white text-blue-600';
              } else if (tab.id === 'excluidas') {
                activeStyle = 'bg-rose-600 text-white shadow-md shadow-rose-200 ring-2 ring-rose-600';
                badgeStyle = 'bg-white text-rose-600';
              }
            } else {
              activeStyle = 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50';
              if (tab.id === 'lidas') {
                badgeStyle = 'bg-emerald-600 text-white';
              } else if (tab.id === 'naoLidas') {
                badgeStyle = 'bg-red-600 text-white';
              } else if (tab.id === 'enviadas') {
                badgeStyle = 'bg-blue-600 text-white';
              } else if (tab.id === 'excluidas') {
                badgeStyle = 'bg-rose-600 text-white';
              }
            }

            return (
              <button 
                key={tab.id}
                onClick={() => setCorrespondenciaTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] md:text-xs font-black uppercase tracking-tight transition-all border-0 cursor-pointer ${activeStyle}`}
              >
                {translateText(tab.label, currentLanguage)}
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-black ${badgeStyle}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-550" size={16} />
          <input 
            type="text"
            placeholder={translateText("Pesquisar correspondência oficial...", currentLanguage)}
            value={searchMail}
            onChange={(e) => setSearchMail(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-2xl pl-12 pr-4 py-3 md:py-3.5 text-xs md:text-sm font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/30 transition-all outline-none placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Message List */}
      <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6">
          <div>
            <h4 className="font-black text-slate-900 text-lg md:text-xl italic uppercase tracking-tight flex items-center gap-2">
              <Mail size={20} className="text-indigo-600" />
              {isInst ? 'Correio Institucional: Expediente de Entrada' : 'Correio Oficial Digital: Caixa de Entrada'}
            </h4>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-1">
              {isInst ? 'Gestão de submissões de cidadãos, requerimentos e auditorias pendentes de resposta' : 'Consulta e acompanhamento de certidões, avisos, pendências tributárias e faturas oficiais'}
            </p>
          </div>
        </div>

        {filteredMessages.length > 0 ? (
          <div className="overflow-auto rounded-[24px] bg-slate-50/20 custom-scrollbar max-h-[500px]">
            <table className="mobile-data-table w-full text-left border-collapse min-w-[900px]">
              <thead className="sticky top-0 z-10 bg-primary">
                <tr className="bg-primary text-white text-[10px] font-black uppercase tracking-widest">
                  <th className="py-4 px-5 rounded-l-2xl">{isInst ? t("Cidadão / Requerente") : t("Órgão Emissor")}</th>
                  <th className="py-4 px-5">{t("Assunto / Tema")}</th>
                  <th className="py-4 px-5">{t("Conteúdo / Detalhe")}</th>
                  <th className="py-4 px-5">{t("Data de Expiração")}</th>
                  <th className="py-4 px-5 text-center">{t("Hora / Data")}</th>
                  <th className="py-4 px-5 text-center">{t("Prioridade")}</th>
                  <th className="py-4 px-5 text-center rounded-r-2xl">{t("Ações")}</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredMessages.map((item) => {
                  const isUrgente = item.status === 'Urgente' || item.priorityScale === 'Crítico' || item.priorityScale === 'Urgente';
                  return (
                    <tr key={item.id} className="text-xs text-[#334155] hover:bg-slate-50/60 transition-colors">
                      {/* Cidadão / Órgão Emissor Column */}
                      <td className="py-5 px-5">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              item.unread 
                                ? 'bg-red-600 text-white border border-red-605' 
                                : 'bg-emerald-600 text-white border border-emerald-605'
                            }`}>
                              {t(item.unread ? 'Não Lida' : 'Lida')}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${getOrgBadgeStyles(item.org)}`}>
                              {t(item.org.toUpperCase().startsWith('SOC - ') ? 'SOC' : item.org)}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 font-mono">ID: #{item.id}</span>
                            {item.unread && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#f87171] inline-block animate-pulse shrink-0" />
                            )}
                          </div>
                          <div className="font-black italic text-slate-900 text-[11px] md:text-sm tracking-tight leading-none">
                            {t(isInst 
                              ? item.org
                                  .replace(/^Cidadão:\s*Cidadão:\s*/i, '')
                                  .replace(/^CIDADÃO:\s*CIDADÃO:\s*/i, '')
                                  .replace(/^CIDADÃO:\s*Cidadão:\s*/i, '')
                                  .replace(/^Cidadão:\s*CIDADÃO:\s*/i, '')
                                  .replace(/^Cidadão:\s*/i, '')
                                  .replace(/^CIDADÃO:\s*/i, '')
: (item.org.startsWith('SOC - ') 
                                   ? item.org.replace('SOC - ', '') 
                                   : item.org
                                 )
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Assunto Tema Column */}
                      <td className="py-5 px-5">
                        <div className="space-y-1 text-left">
                          <div className="font-extrabold text-[#1e293b] text-xs md:text-sm tracking-tight">
                            {t(item.details?.subject || item.preview.substring(0, 30))}
                          </div>
                          <div className="text-[9px] text-[#94a3b8] font-black tracking-widest leading-none">
                            {isInst ? t('Requerimento Fiscal') : t(item.protocol?.category || 'Notificação Digital')}
                          </div>
                        </div>
                      </td>

                      {/* Conteúdo / Detalhe Column */}
                      <td className="py-5 px-5">
                        <div className="text-[#64748b] text-[11px] font-medium max-w-[280px] break-words whitespace-normal leading-relaxed" title={t(item.preview)}>
                          {t(item.preview)}
                        </div>
                      </td>

                      {/* Data de Expiração Column */}
                      <td className="py-5 px-5">
                        <div className="flex items-center">
                          <span className="inline-flex items-center gap-1.5 text-[#e05252] text-[9px] font-semibold tracking-wider font-sans">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#f87171] animate-pulse shrink-0" />
                            EXPIRA: {item.details?.deadline || item.protocol?.deadlineDate || '30 DE JUNHO DE 2026'}
                          </span>
                        </div>
                      </td>

                      {/* Hora / Data Column */}
                      <td className="py-5 px-5 text-center">
                        <div className="text-slate-800 font-bold font-mono text-[11px] tracking-tight">
                          {item.protocol?.officialTime || '11:00'}
                          <div className="text-[9.5px] font-bold text-slate-400 font-sans mt-0.5">{item.date}</div>
                        </div>
                      </td>

                      {/* Prioridade Column */}
                      <td className="py-5 px-5 text-center">
                        <span className={`text-[9px] font-black uppercase tracking-widest leading-none inline-block ${
                          isUrgente
                            ? 'text-[#e05252]'
                            : 'text-indigo-600'
                        }`}>
                          {isUrgente ? 'Urgente' : 'Normal'}
                        </span>
                      </td>

                      {/* Ações Column */}
                      <td className="py-5 px-5 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleSelectMessage(item)}
                            className="text-[9.5px] font-black uppercase text-indigo-650 hover:text-indigo-850 transition-colors tracking-widest hover:underline cursor-pointer bg-transparent border-0 outline-none"
                          >
                            {isInst ? 'ANALISAR' : 'ABRIR'}
                          </button>
                          {correspondenciaTab === 'excluidas' ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onRestoreMessage && onRestoreMessage(item.id)}
                                className="text-[9.5px] font-black uppercase text-emerald-600 hover:text-emerald-700 transition-colors tracking-widest hover:underline cursor-pointer bg-transparent border-0 outline-none"
                              >
                                Restaurar
                              </button>
                              <span className="text-slate-350">|</span>
                              <button
                                type="button"
                                onClick={() => setMessageToDelete({ id: item.id, isPermanent: true })}
                                className="text-[9.5px] font-black uppercase text-rose-600 hover:text-rose-800 transition-colors tracking-widest hover:underline cursor-pointer bg-transparent border-0 outline-none"
                              >
                                Eliminar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setMessageToDelete({ id: item.id, isPermanent: false })}
                              className="text-[9.5px] font-black uppercase text-rose-600 hover:text-rose-800 transition-colors tracking-widest hover:underline cursor-pointer bg-transparent border-0 outline-none"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[24px] md:rounded-[32px] p-12 md:p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-slate-200">
              <Mail size={32} />
            </div>
            <div>
              <h4 className="text-base md:text-lg font-black text-slate-600 uppercase">Silêncio de Comunicações</h4>
              <p className="text-xs md:text-sm text-slate-600 font-bold">
                {searchMail ? `Nenhuma mensagem localizada para "${searchMail}"` : 'Todas as correspondências oficiais e petições encontram-se despachadas.'}
              </p>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {messageToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMessageToDelete(null)}
              className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[28px] md:rounded-[32px] p-5 sm:p-6 md:p-8 shadow-2xl max-w-md w-full text-center max-h-[92vh] overflow-y-auto"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} className="text-red-600" />
              </div>
              <h3 className="text-xl font-black text-primary mb-3">
                {messageToDelete.isPermanent ? t("Eliminar Permanentemente?") : t("Eliminar Correspondência?")}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-8">
                {messageToDelete.isPermanent 
                  ? t("Deseja eliminar permanentemente esta correspondência oficial? Ela não será mais visível no seu portal, mas continuará registada no sistema do Estado.")
                  : t("Tem a certeza que deseja eliminar esta correspondência oficial? Ela será movida para as Eliminadas.")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => setMessageToDelete(null)}
                  className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors cursor-pointer border-0 outline-none"
                >
                  {t("Cancelar")}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (onDeleteMessage) {
                      onDeleteMessage(messageToDelete.id);
                    }
                    setMessageToDelete(null);
                  }}
                  className="py-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-colors cursor-pointer border-0 outline-none"
                >
                  {t("Eliminar")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
