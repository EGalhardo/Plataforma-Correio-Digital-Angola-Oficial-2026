/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Send,
  Mail,
  Plus,
  Search,


  ShieldAlert,



  Landmark,






  FileText,
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
import { Message, LanguageCode } from '../../types';
import { translateText } from '../../utils/translator';
import { useLanguage } from '../../hooks/useLanguage';
import { Video, Loader2, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
// F59 — a pesquisa teatral de 8s com textos governamentais inventados e
// correspondência em MOCK_CITIZENS/MOCK_USERS foi REMOVIDA: o lookup do
// destinatário é REAL (RPC auditada) e chega por props do App.
import { supabase } from '../../lib/supabaseClient';
import { isCompleteBiFormat } from '../../services/institutionEmergencyService';
import { supabaseService, isRealInstitutionalCode } from '../../services/supabaseService';
import { validarEnvio } from '../../services/validacaoEnvio';
import { assistenteDocumento } from '../../services/aiDocumentoService';
import { MARCADOR_CLAREZA_SUGESTAO } from '../../services/aiDocumentoCore';
import type { ResultadoValidacaoEnvio } from '../../services/validacaoEnvio';
import { CATALOGO_INSTITUICOES } from '../../constants/catalogoInstituicoes';
import { buildStorageRef } from '../../lib/secureStorage';


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
    return 'bg-orange-50 text-orange-900 border-orange-200';
  } else if (o === 'EPAL' || o.includes('ÁGUA')) {
    return 'bg-sky-50 text-sky-900 border-sky-200';
  }
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

interface MailContentProps {
  isComposing: boolean;
  setIsComposing: (composing: boolean) => void;
  composeData: { to: string; subject: string; body: string; attachments?: string[] };
  setComposeData: (data: { to: string; subject: string; body: string; attachments?: string[] }) => void;
  handleSendMessage: () => void;
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
  /**
   * F59 (substitui o slot F58) — lookup REAL do destinatário, área Instituição.
   * Estado levantado no App (a RPC cda_cidadao_lookup_bi é auditada/anti-abuso).
   */
  recipientLookup?: {
    status: 'idle' | 'busy' | 'found' | 'not_found' | 'error';
    lookedUpBi?: string;
    citizen?: {
      bi: string;
      name: string;
      emergencyContactsCount: number;
      redeCompleta: boolean;
    };
    errorCode?: string | null;
    /** Apenas no sandbox de demonstração: marca o cartão como dados fictícios. */
    sandbox?: boolean;
  };
  onRecipientLookup?: (bi: string) => void;
  /** Abre o modal de difusão F58 alimentado pelo BI verificado no Destinatário. */
  onEmergencyBroadcast?: () => void;
}

export function MailContent({
  isComposing,
  setIsComposing,
  composeData = { to: '', subject: '', body: '', attachments: [] },
  setComposeData,
  handleSendMessage,
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
  recipientLookup,
  onRecipientLookup,
  onEmergencyBroadcast,
}: MailContentProps) {
  const { currentLanguage, t } = useLanguage();

  // S6 — validacao deterministica pre-envio (gratuita e offline)
  const [validacao, setValidacao] = useState<ResultadoValidacaoEnvio | null>(null);
  const [avisosConfirmados, setAvisosConfirmados] = useState(false);
  // S6-camada-IA — revisao de clareza OPCIONAL (fail-safe: falha da IA nunca
  // bloqueia o envio; o utilizador decide se usa a versão melhorada)
  type EstadoClareza =
    | { estado: 'a_carregar' }
    | { estado: 'ok'; observacoes: string; sugestao: string }
    | { estado: 'erro'; erro: string };
  const [clareza, setClareza] = useState<EstadoClareza | null>(null);
  // S7 — visibilidade do catalogo de instituicoes
  const [catalogoAberto, setCatalogoAberto] = useState(false);

  // S6 — qualquer edicao limpa a validacao anterior (avisos exigem nova revisao)
  // e tambem a revisao de clareza (o texto revisto deixou de ser o atual)
  useEffect(() => {
    setValidacao(null);
    setAvisosConfirmados(false);
    setClareza(null);
  }, [composeData.to, composeData.subject, composeData.body, composeData.attachments]);

  // S6-camada-IA — chama o assistente com a acao rever_clareza. Erro/serviço
  // indisponível vira aviso âmbar honesto; NUNCA interfere com tentarEnviar.
  const reverClareza = async () => {
    const corpo = (composeData.body || '').trim();
    if (!corpo || clareza?.estado === 'a_carregar') return;
    setClareza({ estado: 'a_carregar' });
    const r = await assistenteDocumento({ acao: 'rever_clareza', texto: corpo, titulo: composeData.subject });
    if (!r.ok || !r.resultado) {
      setClareza({ estado: 'erro', erro: r.erro || 'O assistente não respondeu.' });
      return;
    }
    const partes = r.resultado.split(MARCADOR_CLAREZA_SUGESTAO);
    setClareza({
      estado: 'ok',
      observacoes: (partes[0] || '').trim(),
      sugestao: (partes[1] || '').trim(),
    });
  };

  const tentarEnviar = () => {
    const v = validarEnvio(composeData);
    setValidacao(v);
    if (v.bloqueios.length > 0) return;
    if (v.avisos.length > 0 && !avisosConfirmados) {
      setAvisosConfirmados(true);
      return;
    }
    handleSendMessage();
  };

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


  // F59 — lookup REAL: o estado vem por props (App → RPC auditada). Aqui só
  // existe o anti-repetição do gatilho automático (não chama a RPC dezenas de
  // vezes — cada chamada é auditada e conta para o limite anti-abuso 200/h).
  const lastLookupBiRef = useRef('');
  const normalizedDestBi = composeData.to.trim().toUpperCase();
  const lookupVisible =
    !!isInst &&
    !!recipientLookup &&
    recipientLookup.status !== 'idle' &&
    recipientLookup.lookedUpBi === normalizedDestBi;

  const fireRecipientLookup = (raw: string) => {
    const target = (raw || '').trim().toUpperCase();
    if (!onRecipientLookup || !target) return;
    lastLookupBiRef.current = target; // impede o debounce de repetir a mesma chamada
    onRecipientLookup(target);
  };

  const [editingAttachmentIdx, setEditingAttachmentIdx] = useState<number | null>(null);
  const [editingAttachmentContent, setEditingAttachmentContent] = useState<string>('');
  const [messageToDelete, setMessageToDelete] = useState<{ id: number; isPermanent: boolean } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMessage, setUploadProgressMessage] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Estados para popup (modal de confirmação obrigatória)

  // F59 — gatilho automático do lookup REAL: só na área Instituição, só quando
  // o BI tem formato completo (a RPC continua a ser a autoridade final), com
  // debounce de 900 ms e anti-repetição (ref). Divergência do campo limpa o ref
  // para permitir nova pesquisa do mesmo BI depois de editado.
  useEffect(() => {
    if (!isInst || !onRecipientLookup) return;
    const target = composeData.to.trim().toUpperCase();
    if (target === lastLookupBiRef.current) return;
    if (!isCompleteBiFormat(target)) {
      lastLookupBiRef.current = '';
      return;
    }
    const t = setTimeout(() => {
      if (lastLookupBiRef.current !== target) {
        lastLookupBiRef.current = target;
        onRecipientLookup(target);
      }
    }, 900);
    return () => clearTimeout(t);
  }, [composeData.to, isInst, onRecipientLookup]);

  // P0-B — verificação REAL do destinatário institucional (área do cidadão):
  // o código é confirmado contra o registo oficial (RPC cda_instituicao_existe).
  // Estados honestos; 'nao_registada' bloqueia o botão de envio (decisão §0.1).
  const [instRegistry, setInstRegistry] = useState<{ code: string; status: 'checking' | 'registada' | 'nao_registada' | 'erro' } | null>(null);
  const instRegistryReqRef = useRef(0);

  useEffect(() => {
    if (isInst) { setInstRegistry(null); return; } // instituição → destinatário é BI (F59)
    const target = composeData.to.trim().toUpperCase();
    if (!isRealInstitutionalCode(target)) { setInstRegistry(null); return; }
    const reqId = ++instRegistryReqRef.current;
    setInstRegistry({ code: target, status: 'checking' });
    const t = setTimeout(async () => {
      const res = await supabaseService.institutionRegistered(target);
      if (instRegistryReqRef.current !== reqId) return;
      if (res.errorCode) setInstRegistry({ code: target, status: 'erro' });
      else setInstRegistry({ code: target, status: res.registered ? 'registada' : 'nao_registada' });
    }, 700);
    return () => clearTimeout(t);
  }, [composeData.to, isInst]);


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
      const promises = Array.from(files).map((file: File) => {
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
                  // F45 (Storage privado v15): grava-se MARCADOR resolvível —
                  // o bucket deixa de ter URL pública; leitura por URL assinado.
                  resolve(JSON.stringify({
                    name: file.name,
                    size: `${(file.size / 1024).toFixed(1)} KB`,
                    content: buildStorageRef('correspondencias_anexos', filePath),
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
                  Destinatário (Nº do BI — exacto)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Número do BI exacto (ex.: 000123456LA789)"
                    value={composeData.to}
                    onChange={(e) => {
                      setComposeData({ ...composeData, to: e.target.value });
                    }}
                    disabled={lookupVisible && recipientLookup?.status === 'busy'}
                    className="w-full bg-white border border-line rounded-2xl pl-5 pr-12 py-3.5 md:py-4 text-xs md:text-sm font-mono font-bold text-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none disabled:opacity-75 disabled:bg-slate-50"
                    id="recipient-bi-input"
                  />
                  <div className="absolute right-4 flex items-center gap-2">
                    {lookupVisible && recipientLookup?.status === 'busy' ? (
                      <Loader2 className="animate-spin text-indigo-600" size={18} />
                    ) : (
                      <button
                        onClick={() => fireRecipientLookup(composeData.to)}
                        type="button"
                        title="Consultar este BI na plataforma CDA (consulta auditada)"
                        className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                        disabled={!composeData.to.trim() || !onRecipientLookup}
                        id="recipient-bi-search-btn"
                      >
                        <Search size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* F59 — resultado do lookup REAL: estados honestos, zero encenação.
                    Não encontrado NÃO bloqueia o envio oficial (entrega pré-registo),
                    mas bloqueia a difusão de emergência (botão na linha de acções). */}
                <AnimatePresence mode="wait">
                  {lookupVisible && recipientLookup?.status === 'busy' && (
                    <motion.div
                      key="rl-busy"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5 mt-2 flex items-center gap-3">
                        <Loader2 className="animate-spin text-indigo-600 shrink-0" size={16} />
                        <span className="text-xs font-bold text-indigo-950">A consultar o BI na plataforma CDA…</span>
                      </div>
                    </motion.div>
                  )}

                  {lookupVisible && recipientLookup?.status === 'found' && recipientLookup.citizen && (
                    <motion.div
                      key="rl-found"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mt-2 flex items-start gap-3" id="recipient-verified-card">
                        <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-emerald-800 font-bold m-0">
                            {recipientLookup.citizen.name} — BI {recipientLookup.citizen.bi}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {lookupVisible && recipientLookup?.status === 'not_found' && (
                    <motion.div
                      key="rl-notfound"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-2 flex items-start gap-3" id="recipient-not-found">
                        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                        <div>
                          <span className="text-xs font-black text-amber-950 block">Cidadão ainda não registado na plataforma.</span>
                          <span className="text-[10.5px] text-amber-800 font-bold block mt-0.5">
                            A mensagem ficará guardada e será entregue quando ele criar a conta com este BI.
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {lookupVisible && recipientLookup?.status === 'error' && (
                    <motion.div
                      key="rl-error"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 mt-2 flex items-center gap-3">
                        <AlertTriangle className="text-rose-600 shrink-0" size={16} />
                        <span className="text-xs font-bold text-rose-900">
                          Não foi possível consultar o BI (Erro real: {recipientLookup.errorCode || 'DESCONHECIDO'}).
                        </span>
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
              <div className="space-y-2">
                <label className="text-[10px] md:text-sm font-black text-slate-600 uppercase tracking-widest pl-1">
                  Destinatário Institucional codigo
                </label>
                <input
                  type="text"
                  placeholder="Introduza o Código Institucional (ex.: AGT-9921-SR)"
                  value={composeData.to}
                  onChange={(e) => setComposeData({ ...composeData, to: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                  className="w-full bg-white border border-line rounded-2xl px-5 py-3.5 md:py-4 text-xs md:text-sm font-mono font-bold text-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                />
                <p className="text-[9px] md:text-[11px] text-slate-500 font-bold pl-1 leading-relaxed">
                  O Código Institucional é fornecido pela instituição destinatária (ex.: AGT-9921-SR, SME-LLVV).
                </p>

                {/* P0-B — resultado da verificação REAL do registo institucional */}
                {instRegistry && instRegistry.code === composeData.to.trim().toUpperCase() && (
                  <div className={`mt-1 rounded-xl border p-3 text-[10px] md:text-[11px] font-bold flex items-start gap-2 ${
                    instRegistry.status === 'registada'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : instRegistry.status === 'nao_registada'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    {instRegistry.status === 'checking' && (<><Loader2 className="animate-spin shrink-0 mt-0.5" size={14} /><span>A verificar o código no registo institucional…</span></>)}
                    {instRegistry.status === 'registada' && (<><CheckCircle2 className="shrink-0 mt-0.5" size={14} /><span>Instituição registada na plataforma — entrega garantida ao código {instRegistry.code}.</span></>)}
                    {instRegistry.status === 'nao_registada' && (<><AlertTriangle className="shrink-0 mt-0.5" size={14} /><span>Código não registado na plataforma. Confirme o código ou peça à instituição para formalizar o registo — o envio fica bloqueado.</span></>)}
                    {instRegistry.status === 'erro' && (<><AlertTriangle className="shrink-0 mt-0.5" size={14} /><span>Verificação do registo indisponível de momento. O envio tentará confirmar novamente ao clicar.</span></>)}
                  </div>
                )}
              </div>
            </div>
          )}
 
          {/* S7 — Catálogo das 22 instituições (Parte I aprovada): escolher entidade
              preenche o código; escolher serviço tipifica o assunto. O envio verifica
              sempre o registo oficial da instituição (gate P0-B). */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setCatalogoAberto(v => !v)}
              className="w-full px-4 py-3 flex items-center justify-between text-[11px] md:text-xs font-black text-slate-700 uppercase tracking-wider"
            >
              <span className="flex items-center gap-2">
                <Landmark size={14} className="text-primary" />
                Catálogo de instituições e serviços (22)
              </span>
              <span className="text-[9px] text-slate-400">{catalogoAberto ? 'Fechar' : 'Abrir'}</span>
            </button>
            {catalogoAberto && (
              <div className="px-3 pb-3 max-h-72 overflow-y-auto space-y-2">
                <p className="text-[10px] text-slate-500 font-bold px-1 leading-relaxed">
                  Catálogo em fase de integração: toca numa instituição com código conhecido para preencher o destinatário, ou num serviço para tipificar o assunto. O envio confirma sempre o registo oficial da instituição.
                </p>
                {CATALOGO_INSTITUICOES.map((ent) => (
                  <details key={ent.sigla} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <summary className="px-3 py-2.5 cursor-pointer text-[11px] font-black text-slate-700 list-none flex items-center justify-between gap-2">
                      <span className="truncate">{ent.sigla} — {ent.nome}</span>
                      <span className="text-[9px] font-bold text-slate-400 shrink-0">{ent.codigoSugerido ? ent.codigoSugerido : 'código por atribuir'}</span>
                    </summary>
                    <div className="px-3 pb-3">
                      {ent.codigoSugerido && (
                        <button
                          type="button"
                          onClick={() => setComposeData({ ...composeData, to: ent.codigoSugerido as string })}
                          className="mb-2 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                        >
                          Usar código {ent.codigoSugerido}
                        </button>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {ent.servicos.map((serv) => (
                          <button
                            key={serv}
                            type="button"
                            onClick={() => setComposeData({ ...composeData, subject: `[${serv}] ${composeData.subject.replace(/^\[[^\]]*\]\s*/, '')}` })}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-800 transition-colors"
                          >
                            {serv}
                          </button>
                        ))}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>

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
                      ? 'bg-indigo-100/80 text-indigo-800 border border-indigo-200/30' 
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
                      ? 'bg-indigo-100/80 text-indigo-800 border border-indigo-200/30' 
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
                      ? 'bg-indigo-100/80 text-indigo-800 border border-indigo-200/30' 
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
                        ? 'bg-indigo-100/85 text-indigo-800 border border-indigo-200/30' 
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
                      ? 'bg-indigo-100/85 text-indigo-800 border border-indigo-200/30'
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
                    ? 'bg-indigo-100/85 text-indigo-800 border border-indigo-200/30'
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
            <div className="flex items-center gap-2.5 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-800 text-xs font-black animate-pulse mt-4">
              <Loader2 size={16} className="animate-spin text-indigo-600 shrink-0" />
              <span>{uploadProgressMessage}</span>
            </div>
          )}

          {uploadError && (
            <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold mt-4 animate-fadeIn">
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
                      className="p-0.5 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded transition-colors cursor-pointer ml-1"
                      title="Editar conteúdo do anexo"
                    >
                      <Edit2 size={11} />
                    </button>

                    <button 
                      type="button"
                      onClick={() => handleFileRemove(item)}
                      className="p-0.5 hover:bg-red-50 text-slate-500 hover:text-red-500 rounded transition-colors cursor-pointer ml-0.5"
                      title="Remover anexo"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* S6 — resultado da validação pré-envio (bloqueios e avisos) */}
          {validacao && (validacao.bloqueios.length > 0 || validacao.avisos.length > 0) && (
            <div className="space-y-2">
              {validacao.bloqueios.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] font-bold text-red-800">
                  <p className="mb-1">Corrige antes de enviar:</p>
                  {validacao.bloqueios.map((b, i) => <p key={i}>• {b}</p>)}
                </div>
              )}
              {validacao.avisos.length > 0 && !avisosConfirmados && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-bold text-amber-900">
                  <p className="mb-1">Atenção — revê antes de enviar:</p>
                  {validacao.avisos.map((a, i) => <p key={i}>• {a}</p>)}
                  <p className="mt-2 text-amber-700">Se estiver tudo certo, clica novamente no botão de envio.</p>
                </div>
              )}
              {validacao.avisos.length > 0 && avisosConfirmados && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-bold text-amber-900">
                  Avisos revistos — o próximo clique envia a mensagem.
                </div>
              )}
            </div>
          )}

          {/* S6-camada-IA — resultado da revisao de clareza (OPCIONAL;
              falha da IA nunca bloqueia o envio — caixa âmbar honesta) */}
          {clareza && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-[11px] font-bold text-violet-900 space-y-2">
              {clareza.estado === 'a_carregar' && (
                <p className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A IA está a rever a clareza do texto…</p>
              )}
              {clareza.estado === 'erro' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-900">
                  <p>Revisão por IA indisponível agora ({clareza.erro}).</p>
                  <p className="mt-1">Não precisas dela para enviar — esta revisão é opcional.</p>
                </div>
              )}
              {clareza.estado === 'ok' && (
                <>
                  <p className="uppercase tracking-wide">Revisão de clareza (IA) — confirma antes de usar:</p>
                  {clareza.observacoes && <p className="whitespace-pre-wrap font-semibold">{clareza.observacoes}</p>}
                  {clareza.sugestao && (
                    <div className="rounded-lg border border-violet-200 bg-white p-2 whitespace-pre-wrap font-semibold text-slate-800">{clareza.sugestao}</div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {clareza.sugestao && (
                      <button
                        type="button"
                        onClick={() => setComposeData({ ...composeData, body: clareza.sugestao })}
                        className="px-3 py-2 rounded-lg bg-violet-600 text-white font-black cursor-pointer hover:bg-violet-700 active:scale-95 transition-all"
                      >
                        Usar versão melhorada
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setClareza(null)}
                      className="px-3 py-2 rounded-lg border border-violet-300 text-violet-700 font-black cursor-pointer hover:bg-violet-100 active:scale-95 transition-all"
                    >
                      Manter o meu texto
                    </button>
                  </div>
                  <p className="text-[9px] text-violet-500">Conteúdo gerado por IA — revê antes de enviar.</p>
                </>
              )}
            </div>
          )}

          <div className="pt-2 md:pt-4 flex flex-col md:flex-row gap-3 md:gap-4 items-center">
            <button 
              onClick={tentarEnviar}
              disabled={!composeData.to || (isInst && !composeData.subject) || !composeData.body
                || (!isInst && !!instRegistry && instRegistry.code === composeData.to.trim().toUpperCase() && instRegistry.status === 'nao_registada')}
              className="w-full md:flex-[2] bg-primary text-white py-4 rounded-2xl font-black text-sm md:text-base shadow-xl shadow-primary/25 hover:bg-primary/95 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 md:gap-3 cursor-pointer"
            >
              <Send size={18} />
              {avisosConfirmados && validacao && validacao.avisos.length > 0 ? 'Enviar mesmo assim' : 'Enviar Mensagem Oficial'}
            </button>

            {/* S6-camada-IA — gatilho da revisão de clareza (opcional) */}
            <button
              type="button"
              onClick={reverClareza}
              disabled={!composeData.body?.trim() || clareza?.estado === 'a_carregar'}
              className="w-full md:w-auto px-5 py-4 rounded-2xl font-black text-sm border-2 border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer"
            >
              {clareza?.estado === 'a_carregar' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {clareza?.estado === 'a_carregar' ? 'A rever…' : 'Rever clareza (IA)'}
            </button>


            {/* F59 — Difusão à rede de emergência do destinatário VERIFICADO.
                Armada apenas com: cidadão encontrado na plataforma + rede
                completa (≥2) + mensagem escrita no corpo. O cidadão-comum
                nunca vê este botão (isInst + prop só passada na área Inst.). */}
            {isInst && onEmergencyBroadcast && (
              <button
                onClick={onEmergencyBroadcast}
                disabled={
                  !(
                    lookupVisible &&
                    recipientLookup?.status === 'found' &&
                    recipientLookup.citizen?.redeCompleta &&
                    !!composeData.body.trim()
                  )
                }
                title="Enviar primeiro à conta CDA dos familiares (quem tiver) e abrir o link WhatsApp para confirmar — nunca inventa envio"
                className="w-full md:flex-[2] bg-white text-red-700 border-2 border-red-600 py-4 rounded-2xl font-black text-sm md:text-base shadow-xl shadow-red-100 hover:bg-red-50 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 disabled:border-slate-200 disabled:text-slate-400 disabled:shadow-none flex items-center justify-center gap-2 md:gap-3 cursor-pointer"
                id="btn-emergency-broadcast"
              >
                <ShieldAlert size={18} />
                Mensagem de Emergência
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
                    <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Nome do Ficheiro</label>
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
                    <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Conteúdo / Texto do Documento</label>
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
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
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
                                ? 'bg-red-600 text-white border border-red-600' 
                                : 'bg-emerald-600 text-white border border-emerald-600'
                            }`}>
                              {t(item.unread ? 'Não Lida' : 'Lida')}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${getOrgBadgeStyles(item.org)}`}>
                              {t((item.org || '').toUpperCase().startsWith('SOC - ') ? 'SOC' : item.org)}
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
: ((item.org || '').startsWith('SOC - ') 
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
                            EXPIRA: {item.details?.deadline || item.protocol?.deadlineDate || '—'}
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
                            className="text-[9.5px] font-black uppercase text-indigo-650 hover:text-indigo-900 transition-colors tracking-widest hover:underline cursor-pointer bg-transparent border-0 outline-none"
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
                              <span className="text-slate-400">|</span>
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
