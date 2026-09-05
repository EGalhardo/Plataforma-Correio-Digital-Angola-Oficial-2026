/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ArrowLeft,
  Send,
  Mail,
  Plus,
  Search,


  ShieldAlert,









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
  Edit2,
  BarChart3,
  Building,
  User,
  Building2,
  ListOrdered,
  Info
} from 'lucide-react';
import { Message, LanguageCode } from '../../types';
import { translateText } from '../../utils/translator';
import { useLanguage } from '../../hooks/useLanguage';
import { SondagemModal } from './SondagemModal';
import { CdaConfirmModal } from '../ui/CdaConfirm';
import { CdaModal } from '../ui/CdaModal';
import {
  distribuirSondagensCompostas, removerRascunhoSondagem, registarExpedicaoSondagens, type Sondagem,
} from '../../services/sondagemService';
import { Video, Loader2, CheckCircle2, AlertTriangle, Sparkles, CheckCheck, ClipboardCheck } from 'lucide-react';
// F59 — a pesquisa teatral de 8s com textos governamentais inventados e
// correspondência em MOCK_CITIZENS/MOCK_USERS foi REMOVIDA: o lookup do
// destinatário é REAL (RPC auditada) e chega por props do App.
import { supabase } from '../../lib/supabaseClient';
import { isCompleteBiFormat } from '../../services/institutionEmergencyService';
import { supabaseService, isRealInstitutionalCode, invalidateMessagesReadCache } from '../../services/supabaseService';
import { notify } from '../../lib/notify';
import { traduzirErro } from '../../lib/erroAmigavel';
import { validarEnvio } from '../../services/validacaoEnvio';
import { assistenteDocumento } from '../../services/aiDocumentoService';
import { MARCADOR_CLAREZA_SUGESTAO } from '../../services/aiDocumentoCore';
import type { ResultadoValidacaoEnvio } from '../../services/validacaoEnvio';
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
  composeData: { to: string; subject: string; body: string; attachments?: string[]; toArray?: string[]; sondagensIds?: number[] };
  setComposeData: React.Dispatch<React.SetStateAction<{ to: string; subject: string; body: string; attachments?: string[]; toArray?: string[]; sondagensIds?: number[] }>>;
  handleSendMessage: () => void | Promise<unknown>;
  unreadTotal: number;
  correspondenciaTab: string;
  setCorrespondenciaTab: (tab: string) => void;
  /** v37.5 — força refetch das caixas (usado após expedição «Todos»). */
  onRefreshMail?: () => void;
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
  /** v36 — auditoria para a criação de sondagens (opcional). */
  addAuditLog?: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
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
  onRefreshMail,
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
  addAuditLog,
}: MailContentProps) {
  const { currentLanguage, t } = useLanguage();

  // S6 — validacao deterministica pre-envio (gratuita e offline)
  const [validacao, setValidacao] = useState<ResultadoValidacaoEnvio | null>(null);
  // Auditoria 2026-08-24: confirmação de descarte no padrão CdaModal (sem confirm() nativo)
  const [confirmarDescarteRascunho, setConfirmarDescarteRascunho] = useState(false);
  // v37.78 — §12/§5: revisão antes de enviar + envio com recuperação de erros.
  const [revisaoEnvio, setRevisaoEnvio] = useState(false);

  // v37.78 — §21 RASCUNHO GUARDADO AUTOMATICAMENTE: o conteúdo do compositor
  // (destinatário, assunto, corpo, anexos) é preservado localmente enquanto
  // se escreve — refresh, queda de internet ou navegação acidental não perdem
  // o trabalho. Sai ao enviar com sucesso ou ao Descartar.
  const RASCUNHO_KEY = `cda_rascunho_composicao_${(bi || '').toUpperCase()}`;
  const limparRascunhoLocal = () => { try { localStorage.removeItem(RASCUNHO_KEY); } catch { /* ignora */ } };
  const gravarRascunhoLocal = () => {
    try {
      const temConteudo = (composeData.to || '').trim() || (composeData.toArray || []).length > 0
        || (composeData.subject || '').trim() || (composeData.body || '').trim();
      if (!temConteudo) { limparRascunhoLocal(); return; }
      localStorage.setItem(RASCUNHO_KEY, JSON.stringify({
        to: composeData.to || '',
        toArray: composeData.toArray || [],
        subject: composeData.subject || '',
        body: composeData.body || '',
        attachments: composeData.attachments || [],
        gravadoEm: Date.now(),
      }));
    } catch { /* quota/modo privado — melhor esforço, nunca bloqueia */ }
  };
  const [avisosConfirmados, setAvisosConfirmados] = useState(false);
  // S6-camada-IA — revisao de clareza OPCIONAL (fail-safe: falha da IA nunca
  // bloqueia o envio; o utilizador decide se usa a versão melhorada)
  type EstadoClareza =
    | { estado: 'a_carregar' }
    | { estado: 'ok'; observacoes: string; sugestao: string }
    | { estado: 'erro'; erro: string };
  const [clareza, setClareza] = useState<EstadoClareza | null>(null);

  // v37.78.3 — envio diferido (corpo preenchido automaticamente + sondagens
  // embutidas): o setTimeout tem de invocar a versão MAIS RECENTE da pipeline
  // do App. O closure do render que agendou via o composeData ainda antigo
  // (corpo vazio) e o envio falhava com «A mensagem está vazia» DEPOIS de a
  // difusão já ter sido feita — sondagem entregue, correspondência perdida.
  const handleSendMessageRef = useRef(handleSendMessage);
  useEffect(() => { handleSendMessageRef.current = handleSendMessage; }, [handleSendMessage]);

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

  const tentarEnviar = async () => {
    if (enviando || distribuindoSondagens) return; // v37.62 — anti-duplicação
    const v = validarEnvio(composeData);
    // v37 — com sondagens na composição o corpo pode ir vazio (a distribuição
    // trata do conteúdo); retira apenas o bloqueio de corpo vazio.
    if (isInst && sondagensCompostas.length > 0) {
      v.bloqueios = v.bloqueios.filter((b) => b !== 'Escreve o conteúdo da mensagem antes de enviar.');
    }
    setValidacao(v);
    if (v.bloqueios.length > 0) return;
    if (v.avisos.length > 0 && !avisosConfirmados) {
      setAvisosConfirmados(true);
      return;
    }
    // v37 §1.5 — com sondagens na composição: ativa rascunhos e distribui por
    // âmbito (1 mensagem por cidadão, todas as sondagens embutidas) ANTES do
    // envio normal. Falha na distribuição ⇒ envio abortado com aviso honesto.
    if (isInst && sondagensCompostas.length > 0) {
      setDistribuindoSondagens(true);
      // v37.78.3 — destinatários MANUAIS da composição (to + toArray): excluídos
      // da difusão por âmbito porque recebem a própria correspondência oficial
      // com a(s) sondagem(ns) embutida(s). Antes disto recebiam duas mensagens
      // iguais (a difusão + a expedição manual).
      const manuais = Array.from(new Set(
        [composeData.to, ...(composeData.toArray || [])]
          .map((t) => String(t || '').trim().toUpperCase().replace(/\s+/g, ''))
          .filter((t) => t && t !== 'TODOS'),
      ));
      const dist = await distribuirSondagensCompostas({
        codigo: bi,
        nomeInstituicao: instNomeSondagem || bi,
        sondagens: sondagensCompostas,
        assuntoBase: composeData.subject || '',
        corpoExtra: composeData.body || '',
        excluirBis: manuais,
      });
      // v37.78.14 — ANTI-DUPLICAÇÃO: o flag só desce DEPOIS de o ramo TODOS
      // concluir (popup de sucesso) ou de um erro honesto. Antes, a janela
      // entre o fim da difusão e o popup permitia um 2.º clique duplicar toda
      // a distribuição (44 entregas em vez de 22 — visto em produção).
      if (!dist.ok || !dist.dados) {
        setDistribuindoSondagens(false);
        setAvisoSondagens(
          dist.motivo === 'audiencia_vazia'
            ? 'Não há cidadãos no âmbito desta instituição para receber a sondagem. Nada foi enviado.'
            : dist.mensagem || 'Não foi possível distribuir a sondagem. Nada foi enviado.',
        );
        return;
      }
      addAuditLog?.(
        `${sondagensCompostas.length} sondagem(ns) da instituição ${instNomeSondagem || bi} distribuída(s) a ${dist.dados.audiencia} cidadão(s)${manuais.length ? ` (destinatário(s) manual(is) ${manuais.join(', ')} recebe(m) a correspondência oficial com a(s) sondagem(ns) embutida(s))` : ''} — âmbito ${dist.dados.classificacao}, ${new Date().toLocaleString('pt-PT')}.`,
        'success',
      );
      // Destinatário «Todos» (v37): a difusão pelo âmbito oficial já entregou —
      // regista-se a expedição única (visível em «Enviadas») e confirma-se ao
      // utilizador com popup de sucesso.
      if (String(composeData.to).trim().toUpperCase() === 'TODOS') {
        const assuntoFinal = composeData.subject?.trim()
          || `Sondagem${sondagensCompostas.length > 1 ? 's' : ''}: ${sondagensCompostas[0]?.pergunta || ''}`;
        const corpoFinal = composeData.body?.trim()
          || `${instNomeSondagem || bi} convida-o(a) a participar na(s) sondagem(ns) oficial(is) incluída(s) nesta mensagem. Abra a mensagem, toque em «Ver detalhes Completos», escolha a sua opção e confirme com «Responder».`;
        await registarExpedicaoSondagens({
          codigo: bi,
          nomeInstituicao: instNomeSondagem || bi,
          assunto: assuntoFinal,
          corpo: corpoFinal,
          sondagemIds: sondagensCompostas.map(s => s.id),
        });
        invalidateMessagesReadCache();
        // v37.5 — a linha «TODOS» tem de aparecer de imediato nas «Enviadas»:
        // fura o micro-cache e força o refetch das caixas sem esperar o Realtime.
        onRefreshMail?.();
        setSondagensCompostas([]);
        setComposeData({ ...composeData, to: '', subject: '', body: '' });
        setAvisosConfirmados(false);
        setValidacao({ bloqueios: [], avisos: [] });
        setSucessoSondagens(
          `Correspondência enviada com sucesso: ${dist.dados.audiencia} cidadão(s) no âmbito ${dist.dados.classificacao}. O registo da expedição está na lista «Enviadas».`,
        );
        setDistribuindoSondagens(false);
        return;
      }
      setDistribuindoSondagens(false);
      setSondagensCompostas([]);
      // v37.78.3 — as sondagens seguem EMBUTIDAS na correspondência oficial do
      //(s) destinatário(s) manual(is) (messages.sondagem_ids → cartão de
      // resposta no detalhe). Actualização por updater: segura contra o estado
      // stale do closure (updateBodyText acima também escreve no composeData).
      if (manuais.length) {
        const idsParaEmbutir = sondagensCompostas.map((s) => s.id);
        setComposeData((prev) => ({ ...prev, sondagensIds: idsParaEmbutir }));
      }
      // Sem texto próprio, o corpo descreve as sondagens embutidas (pipeline
      // de envio exige corpo não vazio). O envio segue no tick seguinte para
      // o estado do corpo propagar (v37.78.3: pelo ref, para ler o estado NOVO).
      if (!composeData.body.trim()) {
        updateBodyText(
          `${instNomeSondagem || bi} convida-o(a) a participar na(s) sondagem(ns) oficial(is) incluída(s) nesta mensagem. Abra a mensagem, toque em «Ver detalhes Completos», escolha a sua opção e confirme com «Responder».`,
        );
        setTimeout(() => handleSendMessageRef.current(), 150);
        return;
      }
    }
    // v37.78 — §12 (revisão antes de enviar): o envio normal passa por um
    // resumo de confirmação (destinatário, assunto, anexos). O próprio envio
    // vive em executarEnvio(); as sondagens mantêm o seu fluxo próprio de
    // distribuição/confirmação de âmbito (inalterado).
    setRevisaoEnvio(true);
  };

  // v37.78 — envio efectivo (chamado pelo modal de revisão e por «Tentar
  // novamente» em caso de falha). Anti-duplicação: guardas de enviando/.
  const executarEnvio = () => {
    // v37.78.20 — §13: nunca enviar enquanto um anexo ainda está a ser
    // carregado (o ficheiro em trânsito perder-se-ia).
    if (enviando || distribuindoSondagens || isUploading) return;
    setRevisaoEnvio(false);
    setEnviando(true);
    Promise.resolve(handleSendMessage())
      .then((res: any) => {
        // §21 — o rascunho local só sai quando o envio foi concluído (o App
        // limpa o compositor em caso de sucesso).
        if (res && res.ok === true) limparRascunhoLocal();
      })
      .catch((err: unknown) => {
        // §5/§6 — mensagem compreensível + recuperação; os dados preenchidos
        // PERMANECEM no compositor (nunca se perdem por causa da falha).
        notify(traduzirErro(err, 'enviar a correspondência'), 'error', {
          acao: { rotulo: 'Tentar novamente', executar: () => executarEnvio() },
        });
      })
      .finally(() => setEnviando(false));
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

  // v36 — Sondagens: estado do modal de criação + nome da instituição (profiles)
  const [showSondagemModal, setShowSondagemModal] = useState(false);
  const [instNomeSondagem, setInstNomeSondagem] = useState('');
  // v37 — sondagens inseridas como blocos na área de conteúdo da composição
  const [sondagensCompostas, setSondagensCompostas] = useState<Sondagem[]>([]);
  const [sondagemARemover, setSondagemARemover] = useState<Sondagem | null>(null);
  const [distribuindoSondagens, setDistribuindoSondagens] = useState(false);
  // v37.62 — anti-duplicação + loading no envio normal do compositor.
  const [enviando, setEnviando] = useState(false);
  const [avisoSondagens, setAvisoSondagens] = useState<string | null>(null);
  const [sucessoSondagens, setSucessoSondagens] = useState<string | null>(null);
  // v37.5 §3.2 — listas longas: acima de 100 linhas renderiza as primeiras 100
  // e oferece «Mostrar mais», evitando custo de render em caixas volumosas.
  const LIMITE_LISTA_CORREIO = 100;
  const [limiteListaCorreio, setLimiteListaCorreio] = useState(LIMITE_LISTA_CORREIO);
  // v37.78.30 — DEFAULT INTELIGENTE (reporte do dono 2026-08-31): o Correio
  // abre na tab «Não Lidas» SEMPRE que houver correspondência por ler — era
  // aqui que a resposta de um cidadão «desaparecia»: a tab inicial era
  // «Lidas» e o correio NOVO (não lido) ficava invisível até o utilizador
  // carregar manualmente em «Não Lidas». Sem não-lidas, mantém «Lidas».
  // Executa UMA vez por visita à página (o utilizador pode trocar livremente).
  const autoTabAplicada = useRef(false);
  useEffect(() => {
    if (autoTabAplicada.current) return;
    if (correspondenciaTab !== 'lidas') { autoTabAplicada.current = true; return; }
    const temNaoLidas = inbox.some(m => m.unread && !deletedMessageIds.includes(m.id) && !hiddenMessageIds.includes(m.id));
    if (temNaoLidas) setCorrespondenciaTab('naoLidas');
    autoTabAplicada.current = true;
  }, [inbox, correspondenciaTab, deletedMessageIds, hiddenMessageIds, setCorrespondenciaTab]);

  useEffect(() => { setLimiteListaCorreio(LIMITE_LISTA_CORREIO); }, [correspondenciaTab, searchMail]);
  useEffect(() => {
    if (!isInst || !bi) return;
    (async () => {
      try {
        const { data } = await supabase.from('profiles').select('name').eq('bi', bi).maybeSingle();
        setInstNomeSondagem(data?.name || bi);
      } catch {
        setInstNomeSondagem(bi);
      }
    })();
  }, [isInst, bi]);

  const [textHistory, setTextHistory] = useState<string[]>([composeData.body || '']);
  const [historyIndex, setHistoryIndex] = useState(0);


  // F59 — lookup REAL: o estado vem por props (App → RPC auditada). Aqui só
  // existe o anti-repetição do gatilho automático (não chama a RPC dezenas de
  // vezes — cada chamada é auditada e conta para o limite anti-abuso 200/h).
  const lastLookupBiRef = useRef('');
  // REGRA DE ESTADO DAS ENVIADAS (v37.78.16): a cópia do remetente é sempre
  // apresentada como «Enviada» — nunca «Não Lida»/«Lida». O estado de leitura
  // pertence apenas à cópia do DESTINATÁRIO (regras R1–R6, v37.78.12).
  const minhaChaveEstado = String(bi || '').toUpperCase().replace(/\s+/g, '');
  const ehCopiaEnviadaRemetente = (m: Message): boolean => {
    const sk = String((m as any).senderKey || '').toUpperCase().replace(/\s+/g, '');
    const rb = String((m as any).recipientBi || '').toUpperCase().replace(/\s+/g, '');
    // cópia enviada: o remetente sou eu E o destinatário é outra conta
    if (sk && sk === minhaChaveEstado && rb !== minhaChaveEstado) return true;
    // fallback: na tab «Enviadas» todas as linhas são cópias do remetente
    return correspondenciaTab === 'enviadas';
  };

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

  // v37.80 — TabBar no compositor da Área Institucional: Cidadão vs Instituição
  const [instRecipientType, setInstRecipientType] = useState<'cidadao' | 'instituicao'>('cidadao');

  useEffect(() => {
    if (isComposing) {
      setInstRecipientType('cidadao');
    }
  }, [isComposing]);

  // F59 — gatilho automático do lookup REAL: só na área Instituição (quando selecionado Cidadão), só quando
  // o BI tem formato completo (a RPC continua a ser a autoridade final), com
  // debounce de 900 ms e anti-repetição (ref). Divergência do campo limpa o ref
  // para permitir nova pesquisa do mesmo BI depois de editado.
  useEffect(() => {
    if (!isInst || instRecipientType !== 'cidadao' || !onRecipientLookup) return;
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
  }, [composeData.to, isInst, instRecipientType, onRecipientLookup]);

  // P0-B — verificação REAL do destinatário institucional (área do cidadão ou área institucional com tab Instituição):
  // o código é confirmado contra o registo oficial (RPC cda_instituicao_existe).
  // Estados honestos; 'nao_registada' bloqueia o botão de envio (decisão §0.1).
  const [instRegistry, setInstRegistry] = useState<{ code: string; status: 'checking' | 'registada' | 'nao_registada' | 'erro' } | null>(null);
  const instRegistryReqRef = useRef(0);

  useEffect(() => {
    if (isInst && instRecipientType !== 'instituicao') { setInstRegistry(null); return; }
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
  }, [composeData.to, isInst, instRecipientType]);


  useEffect(() => {
    if (isComposing) {
      setTextHistory([composeData.body || '']);
      setHistoryIndex(0);
    }
  }, [isComposing]);

  // v37.78 — §21: gravação automática (debounce 700ms) enquanto compõe.
  useEffect(() => {
    if (!isComposing) return;
    const t = setTimeout(gravarRascunhoLocal, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComposing, composeData.to, composeData.subject, composeData.body, composeData.attachments, composeData.toArray]);

  // v37.78 — §21: recuperação do rascunho no arranque (refresh / navegação).
  // Só repõe se o compositor estiver vazio — nunca sobrescreve texto actual.
  const rascunhoRestauradoRef = useRef(false);
  useEffect(() => {
    if (rascunhoRestauradoRef.current) return;
    rascunhoRestauradoRef.current = true;
    try {
      const bruto = localStorage.getItem(RASCUNHO_KEY);
      if (!bruto) return;
      const r = JSON.parse(bruto);
      const compositorVazio = !(composeData.to || '').trim() && !((composeData.toArray || []).length)
        && !(composeData.subject || '').trim() && !(composeData.body || '').trim();
      if (compositorVazio && ((r.subject || '').trim() || (r.body || '').trim() || (r.to || '').trim())) {
        setComposeData({
          to: r.to || '',
          subject: r.subject || '',
          body: r.body || '',
          attachments: Array.isArray(r.attachments) ? r.attachments : [],
          toArray: Array.isArray(r.toArray) ? r.toArray : [],
        } as any);
        notify('Rascunho recuperado automaticamente — o seu texto anterior foi preservado.', 'info');
      }
    } catch { /* ignora rascunho corrompido */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // v37.76 — ENVIO MULTI-AGENTE: lista de destinatários (chips) no compositor.
  const destinatariosMulti = composeData.toArray || [];
  const adicionarDestinatarioMulti = () => {
    const v = (composeData.to || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!v || destinatariosMulti.includes(v)) return;
    setComposeData({ ...composeData, to: '', toArray: [...destinatariosMulti, v] });
  };
  const removerDestinatarioMulti = (v: string) => {
    setComposeData({ ...composeData, toArray: destinatariosMulti.filter((d) => d !== v) });
  };
  const multiDestControls = (
    <div className="space-y-1.5" data-testid="multi-destinatarios">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={adicionarDestinatarioMulti}
          disabled={!composeData.to.trim()}
          className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl border border-dashed border-primary/30 text-primary text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-primary/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          title="Adicionar este destinatário à lista de expedição múltipla"
        >
          + Adicionar destinatário (envio múltiplo)
        </button>
      </div>
      {destinatariosMulti.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-1.5 pt-0.5">
          {destinatariosMulti.map((d) => (
            <span key={d} className="inline-flex items-center gap-1.5 bg-primary/5 border border-primary/15 text-primary rounded-full pl-3 pr-1.5 py-1 text-[10px] md:text-[11px] font-black font-mono">
              {d}
              <button
                type="button"
                onClick={() => removerDestinatarioMulti(d)}
                aria-label={`Remover ${d}`}
                className="w-4 h-4 rounded-full bg-primary/10 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-all text-[11px] leading-none cursor-pointer"
              >×</button>
            </span>
          ))}
          <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">→ {destinatariosMulti.length} destinatário(s) na lista</span>
        </div>
      )}
    </div>
  );

  const updateBodyText = (newText: string) => {
    // v37.78.3 — updater funcional: imune ao estado stale do closure (o envio
    // diferido com sondagens escreve sondagensIds no mesmo tick).
    setComposeData((prev) => ({ ...prev, body: newText }));
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
      // v37.78.10 — guarda de tamanho: > 10 MB recusado com aviso claro.
      const dentroLimite = Array.from(files).filter((f: File) => f.size <= 10 * 1024 * 1024) as File[];
      const foraLimite = Array.from(files).filter((f: File) => f.size > 10 * 1024 * 1024) as File[];
      if (foraLimite.length) {
        setUploadError(
          `${foraLimite.map(f => `«${f.name}» (${(f.size / (1024 * 1024)).toFixed(1)} MB)`).join(', ')} excede${foraLimite.length === 1 ? '' : 'm'} o limite de 10 MB por ficheiro. Compacte (zip) ou reduza antes de anexar.`
        );
      }
      if (!dentroLimite.length) { setIsUploading(false); return; }

      // v37.78.29 — ANEXO OTIMISTA (reporte do dono 2026-08-31: «demora muito
      // para anexar»): os chips aparecem JÁ (metadados locais) e o upload
      // corre em 2º plano — cada chip é trocado pelo marcador real quando o
      // SEU upload termina (não espera pelos outros). Antes, o chip só
      // aparecia DEPOIS do upload completo; em rede móvel, MB significavam
      // muitos segundos «a anexar». O envio continua bloqueado enquanto há
      // uploads em trânsito (§13) — nenhum ficheiro se perde.
      const pendentes = dentroLimite.map((file) => ({
        file,
        pendId: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      }));
      const existingNames = currentList.map(item => {
        try {
          if (item.trim().startsWith('{')) {
            return JSON.parse(item).name;
          }
        } catch {}
        return item;
      });
      const novosPendentes = pendentes.filter(p => !existingNames.includes(p.file.name));
      if (!novosPendentes.length) { setIsUploading(false); return; }
      const chipDe = (f: File, pendId: string) =>
        JSON.stringify({ name: f.name, size: `${(f.size / 1024).toFixed(1)} KB`, content: '', type: f.type, pendId });
      const finalizarChip = (pendId: string, finalString: string) => {
        setComposeData(prev => ({
          ...prev,
          attachments: (prev.attachments || []).map(att =>
            att.includes(`"pendId":"${pendId}"`) ? finalString : att,
          ),
        }));
      };
      setComposeData(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...novosPendentes.map(p => chipDe(p.file, p.pendId))],
      }));
      let emTransito = novosPendentes.length;
      const tick = () => {
        emTransito -= 1;
        if (emTransito > 0) setUploadProgressMessage(t(`A carregar anexos (${emTransito} em trânsito)...`));
      };
      setUploadProgressMessage(t("A carregar ficheiros para o arquivo digital central..."));

      const promises = novosPendentes.map(({ file, pendId }) => {
        return new Promise<void>((resolve) => {
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
          const concluir = (finalString: string) => {
            finalizarChip(pendId, finalString);
            tick();
            resolve();
          };

          const isSupabaseReady = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
          if (isSupabaseReady) {
            const fileExt = file.name.split('.').pop() || 'dat';
            const fileCleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
            const filePath = `${bi || 'geral'}/${Date.now()}_${fileCleanName}.${fileExt}`;
            const markerJson = () => JSON.stringify({
              name: file.name,
              size: `${(file.size / 1024).toFixed(1)} KB`,
              // F45 (Storage privado v15): grava-se MARCADOR resolvível —
              // o bucket deixa de ter URL pública; leitura por URL assinado.
              content: buildStorageRef('correspondencias_anexos', filePath),
              type: file.type
            });
            // v37.78.29 — 2ª via quando o RLS recusa o upload directo
            // (42501, visto em produção): proxy autenticado /api/upload
            // (service role) ANTES do fallback base64 — antes pagava-se o
            // round-trip falhado + leitura integral do ficheiro para a
            // mensagem, e o «anexar» parecia travado.
            const viaProxy = () =>
              supabaseService.uploadFile('correspondencias_anexos', filePath, file)
                .then(url => (url ? markerJson() : null))
                .catch(() => null);

            supabase.storage
              .from('correspondencias_anexos')
              .upload(filePath, file)
              .then(async ({ error: uploadErr }) => {
                if (uploadErr) {
                  console.error('Erro upload anexo:', uploadErr);
                  const peloProxy = await viaProxy();
                  if (peloProxy) concluir(peloProxy);
                  else readAsLocalFallback(file, concluir);
                } else {
                  concluir(markerJson());
                }
              })
              .catch(async (err) => {
                console.error('Catch erro upload anexo:', err);
                const peloProxy = await viaProxy();
                if (peloProxy) concluir(peloProxy);
                else readAsLocalFallback(file, concluir);
              });
          } else {
            readAsLocalFallback(file, concluir);
          }
        });
      });

      Promise.allSettled(promises).then(() => {
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

  // v37 — blocos de sondagem na área de conteúdo da composição
  const adicionarSondagemBloco = (s: Sondagem) => {
    setSondagensCompostas(prev => {
      if (prev.length >= 5) {
        setAvisoSondagens('Limite de 5 sondagens por mensagem atingido.');
        return prev;
      }
      // v37 — destinatário automático «Todos» (difusão pelo âmbito oficial)
      if (prev.length === 0 && !composeData.to.trim()) {
        setComposeData({ ...composeData, to: 'Todos' });
      }
      return [...prev, s];
    });
  };

  // v36/v37 — modal de criação de sondagem partilhado pelas duas vistas (compositor e lista)
  const sondagemModalJsx = isInst ? (
    <SondagemModal
      aberto={showSondagemModal}
      onFechar={() => setShowSondagemModal(false)}
      codigoInstituicao={bi}
      nomeInstituicao={instNomeSondagem || bi}
      criadaPor={bi}
      addAuditLog={(a, t) => addAuditLog?.(a, t)}
      onCriarBloco={adicionarSondagemBloco}
    />
  ) : null;

  // Popup de avisos das sondagens (limite, falha de distribuição)
  const avisoSondagensJsx = (
    <CdaModal
      aberto={!!avisoSondagens}
      onFechar={() => setAvisoSondagens(null)}
      icone={AlertTriangle}
      titulo="Sondagens"
      tomIcone="bg-amber-50 text-amber-600 border-amber-100"
      maxW="max-w-md"
    >
      <p className="text-sm font-semibold text-slate-700 text-left m-0">{avisoSondagens}</p>
    </CdaModal>
  );

  // v37.4 — confirmação de sucesso após expedição «Todos»
  // v37.5 — ao fechar (botão, X, backdrop ou Escape) regressa à página
  // «Correio» com a aba «Enviadas» activa, para ver já a expedição registada.
  const fecharSucessoSondagens = () => {
    setSucessoSondagens(null);
    setIsComposing(false);
    setCorrespondenciaTab('enviadas');
  };
  const sucessoSondagensJsx = (
    <CdaModal
      aberto={!!sucessoSondagens}
      onFechar={fecharSucessoSondagens}
      icone={CheckCircle2}
      titulo="Correspondência Enviada"
      subtitulo="Expedição registada"
      tomIcone="bg-emerald-50 text-emerald-600 border-emerald-100"
      maxW="max-w-md"
    >
      <p className="text-sm font-semibold text-slate-700 text-left m-0">{sucessoSondagens}</p>
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={fecharSucessoSondagens}
          className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer border-none shadow-sm"
        >
          Entendi
        </button>
      </div>
    </CdaModal>
  );

  if (isComposing) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 max-w-5xl mx-auto font-sans"
      >
        {/* Header matched 1:1 to uploaded reference */}
        <div className="flex items-center gap-3.5 mb-2">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-blue-600/20 shrink-0">
            <Mail size={22} className="text-white" strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight">NOVA MENSAGEM</h3>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">Envie uma correspondência digital para um cidadão ou instituição.</p>
          </div>
        </div>

        {/* Outer Form Container */}
        <div className="space-y-4 md:space-y-5">
          {/* Section 1: DESTINATÁRIO */}
          <div className="bg-white border border-slate-200/90 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
            <label className="text-[11px] md:text-xs font-black text-slate-800 uppercase tracking-wider block">
              {isInst 
                ? (instRecipientType === 'cidadao' ? 'DESTINATÁRIO (Nº DO BI — EXACTO)' : 'DESTINATÁRIO (CÓDIGO INSTITUCIONAL)')
                : 'DESTINATÁRIO (CÓDIGO INSTITUCIONAL)'}
            </label>

            {isInst && (
              <div className="flex items-center gap-6 border-b border-slate-200 pb-0">
                <button
                  type="button"
                  onClick={() => {
                    setInstRecipientType('cidadao');
                    setComposeData(prev => ({ ...prev, to: '' }));
                  }}
                  className={`pb-2.5 px-1 font-bold text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer border-b-2 ${
                    instRecipientType === 'cidadao'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                  id="tab-destinatario-cidadao"
                >
                  <User size={16} />
                  <span>Cidadão</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInstRecipientType('instituicao');
                    setComposeData(prev => ({ ...prev, to: '' }));
                  }}
                  className={`pb-2.5 px-1 font-bold text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer border-b-2 ${
                    instRecipientType === 'instituicao'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                  id="tab-destinatario-instituicao"
                >
                  <Building2 size={16} />
                  <span>Instituição</span>
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={
                    !isInst || instRecipientType === 'instituicao'
                      ? "Introduza o Código Institucional (ex.: AGT-9921-SR)"
                      : "Número do BI exacto (ex.: 000123456LA789)"
                  }
                  value={composeData.to}
                  onChange={(e) => {
                    const val = (!isInst || instRecipientType === 'instituicao')
                      ? e.target.value.toUpperCase().replace(/\s+/g, '')
                      : e.target.value;
                    setComposeData({ ...composeData, to: val });
                  }}
                  disabled={lookupVisible && recipientLookup?.status === 'busy'}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-11 py-3 text-xs md:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                  id={isInst ? (instRecipientType === 'cidadao' ? 'recipient-bi-input' : 'recipient-inst-input') : 'recipient-inst-input'}
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                  {lookupVisible && recipientLookup?.status === 'busy' ? (
                    <Loader2 className="animate-spin text-blue-600" size={18} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (isInst && instRecipientType === 'cidadao') {
                          fireRecipientLookup(composeData.to);
                        }
                      }}
                      disabled={!composeData.to.trim() || (!onRecipientLookup && isInst && instRecipientType === 'cidadao')}
                      className="text-slate-400 hover:text-blue-600 transition-colors p-1 cursor-pointer disabled:opacity-40"
                      title="Localizar destinatário"
                      id="recipient-bi-search-btn"
                    >
                      <Search size={18} />
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={adicionarDestinatarioMulti}
                disabled={!composeData.to.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-xs md:text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                title="Adicionar este destinatário à lista"
                id="btn-add-multi-dest"
              >
                + Adicionar destinatário
              </button>
            </div>

            <p className="text-[11px] md:text-xs text-blue-500/90 font-medium flex items-center gap-1.5 m-0 pt-0.5">
              <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-blue-500 text-[9px] font-bold">i</span>
              <span>
                {!isInst || instRecipientType === 'instituicao'
                  ? 'Informe o Código Institucional exacto para localizar a instituição.'
                  : 'Informe o número do BI exacto para localizar o destinatário.'}
              </span>
            </p>

            {/* Chips de múltiplos destinatários */}
            {destinatariosMulti.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {destinatariosMulti.map((d) => (
                  <span key={d} className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-full pl-3 pr-1.5 py-1 text-[10px] md:text-[11px] font-bold font-mono">
                    {d}
                    <button
                      type="button"
                      onClick={() => removerDestinatarioMulti(d)}
                      aria-label={`Remover ${d}`}
                      className="w-4 h-4 rounded-full bg-blue-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-all text-[11px] leading-none cursor-pointer"
                    >×</button>
                  </span>
                ))}
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">→ {destinatariosMulti.length} destinatário(s) na lista</span>
              </div>
            )}

            {/* F59 — resultado do lookup REAL (Cidadão) */}
            {isInst && instRecipientType === 'cidadao' && (
              <AnimatePresence mode="wait">
                {lookupVisible && recipientLookup?.status === 'busy' && (
                  <motion.div
                    key="rl-busy"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
                      <Loader2 className="animate-spin text-blue-600 shrink-0" size={16} />
                      <span className="text-xs font-bold text-blue-950">A consultar o BI na plataforma CDA…</span>
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
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3" id="recipient-verified-card">
                      <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-emerald-800 font-bold m-0">
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
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3" id="recipient-not-found">
                      <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                      <div>
                        <span className="text-xs font-black text-amber-950 block">Cidadão ainda não registado na plataforma.</span>
                        <span className="text-[11px] text-amber-800 font-medium block mt-0.5">
                          A mensagem ficará guardada e será entregue quando o cidadão criar a conta com este BI.
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
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-3">
                      <AlertTriangle className="text-rose-600 shrink-0" size={16} />
                      <span className="text-xs font-bold text-rose-900">
                        Não foi possível consultar o BI (Erro real: {recipientLookup.errorCode || 'DESCONHECIDO'}).
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* P0-B — verificação do registo institucional */}
            {(!isInst || instRecipientType === 'instituicao') && instRegistry && instRegistry.code === composeData.to.trim().toUpperCase() && (
              <div className={`rounded-xl border p-3 text-xs font-bold flex items-start gap-2.5 ${
                instRegistry.status === 'registada'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : instRegistry.status === 'nao_registada'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                {instRegistry.status === 'checking' && (<><Loader2 className="animate-spin shrink-0 mt-0.5 text-blue-600" size={16} /><span>A verificar o código no registo institucional…</span></>)}
                {instRegistry.status === 'registada' && (<><CheckCircle2 className="shrink-0 mt-0.5 text-emerald-600" size={16} /><span>Instituição registada na plataforma — entrega garantida ao código {instRegistry.code}.</span></>)}
                {instRegistry.status === 'nao_registada' && (<><AlertTriangle className="shrink-0 mt-0.5 text-amber-600" size={16} /><span>Código não registado na plataforma. Confirme o código da instituição destinatária.</span></>)}
                {instRegistry.status === 'erro' && (<><AlertTriangle className="shrink-0 mt-0.5 text-rose-600" size={16} /><span>Verificação do registo indisponível de momento.</span></>)}
              </div>
            )}
          </div>

          {/* Section 2: TÍTULO */}
          <div className="bg-white border border-slate-200/90 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-xs space-y-2">
            <label className="text-[11px] md:text-xs font-black text-slate-800 uppercase tracking-wider block">TÍTULO</label>
            <input 
              type="text"
              placeholder="Qual o tema da sua mensagem?"
              value={composeData.subject}
              onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
              maxLength={120}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs md:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Section 3: CONTEÚDO DA MENSAGEM */}
          <div className="bg-white border border-slate-200/90 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-xs space-y-3">
            <label className="text-[11px] md:text-xs font-black text-slate-800 uppercase tracking-wider block">CONTEÚDO DA MENSAGEM</label>
            
            {/* Rich text Toolbar */}
            <div className="border border-slate-200 rounded-xl p-2 bg-white flex flex-wrap items-center justify-between gap-1.5 shadow-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Undo / Redo */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={historyIndex === 0}
                    title="Desfazer"
                    className={`p-1.5 rounded-lg hover:bg-slate-100 active:scale-95 transition-all ${
                      historyIndex === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Undo size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={historyIndex >= textHistory.length - 1}
                    title="Refazer"
                    className={`p-1.5 rounded-lg hover:bg-slate-100 active:scale-95 transition-all ${
                      historyIndex >= textHistory.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Redo size={15} />
                  </button>
                </div>

                <div className="w-[1px] h-4 bg-slate-200 mx-1" />

                {/* Font selector */}
                <div className="relative">
                  <select
                    value={editorFont}
                    onChange={(e) => setEditorFont(e.target.value)}
                    className="bg-transparent text-slate-700 text-xs font-semibold py-1 pl-2 pr-5 border border-transparent rounded-lg hover:bg-slate-100 cursor-pointer focus:outline-none appearance-none font-sans"
                  >
                    <option value="sans-serif">Sans Serif</option>
                    <option value="serif">Serif</option>
                    <option value="monospace">Monospace</option>
                  </select>
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[8px]">▼</div>
                </div>

                <div className="w-[1px] h-4 bg-slate-200 mx-1" />

                {/* Size selector */}
                <div className="relative">
                  <select
                    value={editorFontSize}
                    onChange={(e) => setEditorFontSize(e.target.value)}
                    className="bg-transparent text-slate-700 text-xs font-semibold py-1 pl-2 pr-5 border border-transparent rounded-lg hover:bg-slate-100 cursor-pointer focus:outline-none appearance-none"
                  >
                    <option value="base">Normal</option>
                    <option value="sm">Pequeno</option>
                    <option value="lg">Grande</option>
                    <option value="xl">Título</option>
                  </select>
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[8px]">▼</div>
                </div>

                <div className="w-[1px] h-4 bg-slate-200 mx-1" />

                {/* B, I, U, A */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditorBold(!editorBold)}
                    title="Negrito"
                    className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                      editorBold ? 'bg-blue-100 text-blue-700 font-extrabold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorItalic(!editorItalic)}
                    title="Itálico"
                    className={`w-7 h-7 rounded-lg italic font-serif text-xs flex items-center justify-center transition-all ${
                      editorItalic ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorUnderline(!editorUnderline)}
                    title="Sublinhado"
                    className={`w-7 h-7 rounded-lg underline text-xs flex items-center justify-center transition-all ${
                      editorUnderline ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    U
                  </button>
                  <div className="relative group">
                    <button
                      type="button"
                      title="Cor do Texto"
                      className="h-7 px-1.5 rounded-lg text-slate-700 hover:bg-slate-100 flex items-center gap-0.5 text-xs font-bold"
                    >
                      <span className="border-b-2" style={{ borderColor: editorColor }}>A</span>
                      <span className="text-[7px] text-slate-400">▼</span>
                    </button>
                    <div className="absolute left-0 top-8 hidden group-hover:flex group-focus-within:flex flex-col bg-white border border-slate-200 rounded-xl p-2 shadow-xl z-20 min-w-[120px] gap-1 text-left">
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
                              editorColor === color.value ? 'ring-2 ring-blue-500 ring-offset-1 border-white' : 'border-black/5'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-[1px] h-4 bg-slate-200 mx-1" />

                {/* Alignment */}
                <div className="flex items-center gap-1 bg-slate-100/60 p-0.5 rounded-lg border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setEditorAlignment('left')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      editorAlignment === 'left' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                    }`}
                    title="Alinhar à Esquerda"
                  >
                    <AlignLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorAlignment('center')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      editorAlignment === 'center' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                    }`}
                    title="Alinhar ao Centro"
                  >
                    <AlignCenter size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorAlignment('right')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      editorAlignment === 'right' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                    }`}
                    title="Alinhar à Direita"
                  >
                    <AlignRight size={14} />
                  </button>
                </div>

                <div className="w-[1px] h-4 bg-slate-200 mx-1" />

                {/* Lists & Quote */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setEditorListType(editorListType === 'bullet' ? null : 'bullet')}
                    className={`p-1.5 rounded-lg transition-all ${
                      editorListType === 'bullet' ? 'bg-blue-100/80 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title="Lista de Marcadores"
                  >
                    <List size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorListType(editorListType === 'ordered' ? null : 'ordered')}
                    className={`p-1.5 rounded-lg transition-all ${
                      editorListType === 'ordered' ? 'bg-blue-100/80 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title="Lista Numerada"
                  >
                    <ListOrdered size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorIsQuote(!editorIsQuote)}
                    className={`p-1.5 rounded-lg transition-all ${
                      editorIsQuote ? 'bg-blue-100/80 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title="Citação"
                  >
                    <Quote size={14} />
                  </button>
                </div>
              </div>

              {/* Right side: Paperclip "Anexar" button */}
              <label
                className="flex flex-col items-center justify-center text-slate-600 hover:text-blue-600 cursor-pointer px-2 py-1 rounded-lg hover:bg-blue-50/60 transition-colors shrink-0"
                title="Anexar ficheiros"
              >
                <Paperclip size={18} className="text-slate-700 hover:text-blue-600" />
                <span className="text-[10px] font-bold text-slate-600 mt-0.5">Anexar</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.heic,.heif,.txt,.csv,.xls,.xlsx,.ppt,.pptx,.zip"
                  className="hidden"
                  onChange={handleFileAdd}
                />
              </label>
            </div>

            <textarea 
              rows={8}
              placeholder="Descreva detalhadamente o seu pedido ou informação..."
              value={composeData.body}
              onChange={(e) => updateBodyText(e.target.value)}
              className={`w-full bg-white border border-slate-200 rounded-xl p-4 text-xs md:text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none leading-relaxed min-h-[180px] ${
                editorFont === 'serif' ? 'font-serif' : editorFont === 'monospace' ? 'font-mono' : 'font-sans'
              } ${
                editorFontSize === 'sm' ? 'text-xs' : editorFontSize === 'lg' ? 'text-base' : editorFontSize === 'xl' ? 'text-lg font-bold' : 'text-sm'
              } ${
                editorAlignment === 'center' ? 'text-center' : editorAlignment === 'right' ? 'text-right' : editorAlignment === 'justify' ? 'text-justify' : 'text-left'
              }`}
              style={{
                fontWeight: editorBold ? 'bold' : 'normal',
                fontStyle: editorItalic ? 'italic' : 'normal',
                textDecoration: editorUnderline ? 'underline' : 'none',
                color: editorColor,
                borderLeft: editorIsQuote ? '4px solid #3b82f6' : undefined,
                paddingLeft: editorIsQuote ? '1rem' : undefined,
              }}
            />

            {/* Attached files chips */}
            {composeData.attachments && composeData.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl mt-3">
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
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-xs text-xs font-bold text-slate-700 animate-fadeIn"
                    >
                      <FileText size={13} className="text-blue-600 shrink-0" />
                      <span className="truncate max-w-[180px]" title={name}>{name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({size})</span>
                      
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
                        className="p-0.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer ml-1"
                        title="Editar conteúdo do anexo"
                      >
                        <Edit2 size={12} />
                      </button>

                      <button 
                        type="button"
                        onClick={() => handleFileRemove(item)}
                        className="p-0.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer ml-0.5"
                        title="Remover anexo"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* v37 — Sondagens inseridas como blocos na área de conteúdo */}
            {isInst && sondagensCompostas.length > 0 && (
              <div className="space-y-3 mt-4" data-testid="sondagens-compostas">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 m-0">
                  Inquéritos incluídos nesta mensagem ({sondagensCompostas.length}/5)
                </p>
                {sondagensCompostas.map((s) => (
                  <div key={s.id} className="relative">
                    <button
                      type="button"
                      onClick={() => setSondagemARemover(s)}
                      title="Remover inquérito da mensagem"
                      className="absolute -top-2 -right-2 z-10 w-7 h-7 rounded-full bg-white shadow border border-slate-200 text-slate-400 hover:text-rose-500 transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                    <div className="rounded-xl bg-[#d9fdd3] shadow-xs overflow-hidden text-left border border-emerald-200/60">
                      <div className="px-4 pt-3 pb-2">
                        <p className="text-sm font-bold text-[#111b21] m-0 leading-snug">{s.pergunta}</p>
                        <p className="flex items-center gap-1.5 text-xs text-[#546565] font-semibold mt-1.5 m-0">
                          <CheckCheck size={13} className="text-[#53bdeb] shrink-0" />
                          {s.permitir_varias ? 'Selecione uma ou mais opções' : 'Selecione uma opção'}
                        </p>
                        <div className="mt-2 space-y-2.5">
                          {s.opcoes.map((o, i) => (
                            <div key={o.id || i} className="px-1">
                              <div className="flex items-center gap-3">
                                <span className="w-4 h-4 rounded-full border-2 border-[#546565] shrink-0" />
                                <span className="flex-1 min-w-0 text-xs font-medium text-[#111b21] truncate">{String.fromCharCode(65 + i)}) {o.texto}</span>
                                <span className="text-xs font-bold text-[#111b21]">0</span>
                              </div>
                              <div className="mt-1 ml-7 h-1.5 rounded-full bg-[#111b21]/10" />
                            </div>
                          ))}
                        </div>
                        <p className="flex items-center justify-end gap-1 text-[10px] text-[#667781] mt-2 m-0">
                          {new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                          <CheckCheck size={13} className="text-[#53bdeb]" />
                        </p>
                      </div>
                      <div className="bg-[#cfF8c6]/60 border-t border-[#111b21]/5 py-1.5 text-center text-xs font-semibold text-[#546565]">
                        Mostrar votos
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Confirmação de remoção de sondagem */}
            {sondagemARemover && (
              <CdaConfirmModal
                aberto
                titulo="Remover Inquérito"
                mensagem={`Remover o inquérito «${sondagemARemover.pergunta}» desta mensagem? O rascunho será eliminado.`}
                textoConfirmar="Remover"
                perigoso
                onConfirmar={async () => {
                  const alvo = sondagemARemover;
                  setSondagemARemover(null);
                  setSondagensCompostas(prev => prev.filter(x => x.id !== alvo.id));
                  if (sondagensCompostas.length <= 1 && composeData.to.trim().toUpperCase() === 'TODOS') {
                    setComposeData({ ...composeData, to: '' });
                  }
                  await removerRascunhoSondagem(alvo.id);
                }}
                onCancelar={() => setSondagemARemover(null)}
              />
            )}

            {isUploading && (
              <div className="flex items-center gap-2.5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs font-bold animate-pulse mt-3">
                <Loader2 size={16} className="animate-spin text-blue-600 shrink-0" />
                <span>{uploadProgressMessage}</span>
              </div>
            )}

            {uploadError && (
              <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold mt-3 animate-fadeIn">
                <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black block uppercase tracking-wider mb-0.5 text-rose-950">Limite de Anexos Excedido</span>
                  <span className="text-rose-700 leading-relaxed font-semibold">{uploadError}</span>
                </div>
              </div>
            )}

            {/* Validação pré-envio */}
            {validacao && (validacao.bloqueios.length > 0 || validacao.avisos.length > 0) && (
              <div className="space-y-2 mt-3">
                {validacao.bloqueios.length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">
                    <p className="mb-1">Corrige antes de enviar:</p>
                    {validacao.bloqueios.map((b, i) => <p key={i}>• {b}</p>)}
                  </div>
                )}
                {validacao.avisos.length > 0 && !avisosConfirmados && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900">
                    <p className="mb-1">Atenção — revê antes de enviar:</p>
                    {validacao.avisos.map((a, i) => <p key={i}>• {a}</p>)}
                    <p className="mt-2 text-amber-700">Se estiver tudo certo, clica novamente no botão de envio.</p>
                  </div>
                )}
                {validacao.avisos.length > 0 && avisosConfirmados && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900">
                    Avisos revistos — o próximo clique envia a mensagem.
                  </div>
                )}
              </div>
            )}

            {/* Revisão de Clareza IA */}
            {clareza && (
              <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3 text-xs font-bold text-purple-900 space-y-2 mt-3">
                {clareza.estado === 'a_carregar' && (
                  <p className="flex items-center gap-2"><Loader2 size={14} className="animate-spin text-purple-600" /> A IA está a rever a clareza do texto…</p>
                )}
                {clareza.estado === 'erro' && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-900">
                    <p>Revisão por IA indisponível agora ({clareza.erro}).</p>
                    <p className="mt-1">Não precisa dela para enviar — esta revisão é opcional.</p>
                  </div>
                )}
                {clareza.estado === 'ok' && (
                  <>
                    <p className="uppercase tracking-wider text-[11px] font-black text-purple-800">Revisão de clareza (IA) — confirme antes de usar:</p>
                    {clareza.observacoes && <p className="whitespace-pre-wrap font-semibold text-slate-700">{clareza.observacoes}</p>}
                    {clareza.sugestao && (
                      <div className="rounded-lg border border-purple-200 bg-white p-2.5 whitespace-pre-wrap font-semibold text-slate-800 shadow-xs">{clareza.sugestao}</div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {clareza.sugestao && (
                        <button
                          type="button"
                          onClick={() => setComposeData({ ...composeData, body: clareza.sugestao })}
                          className="px-3.5 py-2 rounded-lg bg-purple-600 text-white font-bold cursor-pointer hover:bg-purple-700 active:scale-95 transition-all text-xs"
                        >
                          Usar versão melhorada
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setClareza(null)}
                        className="px-3.5 py-2 rounded-lg border border-purple-300 text-purple-700 font-bold cursor-pointer hover:bg-purple-100 active:scale-95 transition-all text-xs"
                      >
                        Manter o meu texto
                      </button>
                    </div>
                    <p className="text-[10px] text-purple-500 font-medium m-0">Conteúdo sugerido por IA — confirme antes de enviar.</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Bottom Action Bar matching 100% the uploaded reference */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              {/* 1. Enviar Mensagem */}
              <button
                type="button"
                onClick={tentarEnviar}
                disabled={
                  !(composeData.to || (composeData.toArray || []).length > 0) ||
                  (isInst && !composeData.subject) ||
                  (!composeData.body && !(isInst && sondagensCompostas.length > 0)) ||
                  distribuindoSondagens ||
                  enviando ||
                  ((!isInst || instRecipientType === 'instituicao') && !!instRegistry && instRegistry.code === composeData.to.trim().toUpperCase() && instRegistry.status === 'nao_registada')
                }
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs md:text-sm px-5 py-3 rounded-xl shadow-xs active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer"
                id="btn-enviar-mensagem"
              >
                {distribuindoSondagens || enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                <span>
                  {distribuindoSondagens ? 'A distribuir…'
                    : enviando ? 'A enviar…'
                    : avisosConfirmados && validacao && validacao.avisos.length > 0 ? 'Enviar mesmo assim' : 'Enviar Mensagem'}
                </span>
              </button>

              {/* 2. Rever Clareza (IA) */}
              <button
                type="button"
                onClick={reverClareza}
                disabled={!composeData.body?.trim() || clareza?.estado === 'a_carregar'}
                className="border border-purple-200 hover:border-purple-300 text-purple-600 bg-white hover:bg-purple-50/50 font-bold text-xs md:text-sm px-4 py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                id="btn-rever-clareza"
              >
                {clareza?.estado === 'a_carregar' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-purple-600" />}
                <span>{clareza?.estado === 'a_carregar' ? 'A rever…' : 'Rever Clareza (IA)'}</span>
              </button>

              {/* 3. Criar Inquérito (Área Institucional) */}
              {isInst && (
                <button
                  type="button"
                  onClick={() => {
                    if (sondagensCompostas.length >= 5) {
                      setAvisoSondagens('Limite de 5 inquéritos por mensagem atingido.');
                      return;
                    }
                    setShowSondagemModal(true);
                  }}
                  className="border border-blue-200 hover:border-blue-300 text-blue-600 bg-white hover:bg-blue-50/50 font-bold text-xs md:text-sm px-4 py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  id="btn-criar-inquerito"
                >
                  <BarChart3 size={16} className="text-blue-600" />
                  <span>Criar Inquérito</span>
                </button>
              )}

              {/* Botão de Emergência quando aplicável */}
              {isInst && onEmergencyBroadcast && lookupVisible && recipientLookup?.status === 'found' && recipientLookup.citizen?.redeCompleta && !!composeData.body.trim() && (
                <button
                  type="button"
                  onClick={onEmergencyBroadcast}
                  title="Enviar à rede de emergência"
                  className="bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 px-4 py-3 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer"
                  id="btn-emergency-broadcast"
                >
                  <ShieldAlert size={16} />
                  <span>Emergência</span>
                </button>
              )}
            </div>

            {/* Sair / Cancelar */}
            <button
              type="button"
              onClick={() => {
                if (composeData.body?.trim() || composeData.subject?.trim() || (composeData.attachments && composeData.attachments.length > 0)) {
                  setConfirmarDescarteRascunho(true);
                } else {
                  setIsComposing(false);
                }
              }}
              className="text-slate-600 hover:text-slate-900 font-medium text-xs md:text-sm px-4 py-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer self-center sm:self-auto"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Modal de Descarte de Rascunho */}
        {confirmarDescarteRascunho && (
          <CdaConfirmModal
            aberto
            titulo="Descartar Rascunho"
            mensagem="Deseja descartar este rascunho? O conteúdo será eliminado e não poderá ser recuperado."
            textoConfirmar="Descartar"
            perigoso
            onConfirmar={async () => {
              setConfirmarDescarteRascunho(false);
              limparRascunhoLocal();
              for (const s of sondagensCompostas) { await removerRascunhoSondagem(s.id); }
              setSondagensCompostas([]);
              setIsComposing(false);
            }}
            onCancelar={() => setConfirmarDescarteRascunho(false)}
          />
        )}

        {/* Modal de Revisão Antes de Enviar */}
        {revisaoEnvio && (
          <CdaModal
            aberto
            onFechar={() => setRevisaoEnvio(false)}
            icone={ClipboardCheck}
            titulo="Rever antes de enviar"
            subtitulo="Confirme os dados da correspondência"
            maxW="max-w-lg"
            padding="p-6 md:p-8"
          >
            <div className="text-left space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex gap-3 text-sm">
                  <span className="font-black text-slate-400 uppercase text-[10px] tracking-wider w-28 shrink-0 pt-0.5">Destinatário</span>
                  <span className="font-bold text-slate-800 break-words min-w-0">
                    {(composeData.toArray || []).length > 0
                      ? `${composeData.toArray.join(', ')} (${composeData.toArray.length} destinatários)`
                      : composeData.to || '—'}
                  </span>
                </div>
                <div className="flex gap-3 text-sm">
                  <span className="font-black text-slate-400 uppercase text-[10px] tracking-wider w-28 shrink-0 pt-0.5">Assunto</span>
                  <span className="font-bold text-slate-800 break-words min-w-0">{composeData.subject?.trim() || '(sem assunto)'}</span>
                </div>
                <div className="flex gap-3 text-sm">
                  <span className="font-black text-slate-400 uppercase text-[10px] tracking-wider w-28 shrink-0 pt-0.5">Anexos</span>
                  <span className="font-bold text-slate-800 min-w-0">
                    {(composeData.attachments || []).length === 0
                      ? 'Nenhum documento anexado'
                      : <>
                          {(composeData.attachments || []).length} documento(s)
                          <span className="block text-xs font-medium text-slate-500 break-words">
                            {(composeData.attachments || []).slice(0, 4).join(' · ')}
                            {(composeData.attachments || []).length > 4 ? ' …' : ''}
                          </span>
                        </>}
                  </span>
                </div>
              </div>
              {composeData.body?.trim() && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <span className="font-black text-slate-400 uppercase text-[10px] tracking-wider block mb-1.5">Resumo da mensagem</span>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line m-0">
                    {composeData.body.trim().slice(0, 400)}{composeData.body.trim().length > 400 ? '…' : ''}
                  </p>
                </div>
              )}
              <p className="text-[11px] text-slate-400 font-medium m-0">
                Ao tocar em «Enviar Correspondência» a mensagem é registada com número de protocolo e o destinatário é notificado.
              </p>
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setRevisaoEnvio(false)}
                  disabled={enviando}
                  className="px-6 py-3.5 rounded-2xl font-bold text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer border-none disabled:opacity-50"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={executarEnvio}
                  disabled={enviando || isUploading}
                  className="px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all cursor-pointer border-none flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {enviando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  {enviando ? 'A enviar…' : isUploading ? 'A carregar anexos…' : 'Enviar Correspondência'}
                </button>
              </div>
            </div>
          </CdaModal>
        )}

        <AnimatePresence>
          {editingAttachmentIdx !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto font-sans"
              onClick={() => setEditingAttachmentIdx(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="relative bg-white rounded-[32px] border border-slate-100 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] w-full max-w-xl max-h-[95vh] flex flex-col overflow-hidden text-left mx-auto z-10"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center gap-4 text-left relative shrink-0 p-6 md:p-10 pb-0">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0 border border-indigo-100/40 shadow-sm">
                    <FileText size={26} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl md:text-[23px] font-black text-[#0c2340] italic uppercase tracking-tighter leading-none mb-1">Editar Conteúdo do Anexo</h3>
                    <p className="text-[#4f46e5] font-black text-[10px] uppercase tracking-[0.16em] mt-1 m-0 leading-none">O conteúdo editado será guardado digitalmente no anexo</p>
                  </div>
                  <button
                    onClick={() => setEditingAttachmentIdx(null)}
                    className="absolute -top-1 -right-1 text-slate-400 hover:text-slate-600 transition-all p-2 hover:bg-slate-50 rounded-full border-none bg-transparent cursor-pointer"
                    type="button"
                    title="Fechar"
                  >
                    <X size={20} />
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
        {sondagemModalJsx}
        {avisoSondagensJsx}
        {sucessoSondagensJsx}
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
        {/* v37.7 — a opção «Sondagem» deixou a toolbar do Correio: agora só
            existe DENTRO da correspondência seleccionada (MessageDetail), para
            se saber sempre a que correspondência cada sondagem pertence. */}
        {isInst && <button onClick={() => setTab('inst-qrcode')} className="cda-link-text">{translateText("Validação QR", currentLanguage)}</button>}
      </div>

      {/* REGRA DE ESTADO DAS ENVIADAS (v37.78.16): a cópia do remetente é
          sempre «Enviada» — nunca «Não Lida»/«Lida». O estado de leitura
          pertence apenas à cópia do DESTINATÁRIO (regras R1–R6, v37.78.12). */}
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
                {filteredMessages.slice(0, limiteListaCorreio).map((item) => {
                  const isUrgente = item.status === 'Urgente' || item.priorityScale === 'Crítico' || item.priorityScale === 'Urgente';
                  return (
                    <tr key={item.id} className="text-xs text-[#334155] hover:bg-slate-50/60 transition-colors">
                      {/* Cidadão / Órgão Emissor Column */}
                      <td className="py-5 px-5">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              ehCopiaEnviadaRemetente(item)
                                ? 'bg-blue-600 text-white border border-blue-600'
                                : item.unread 
                                ? 'bg-red-600 text-white border border-red-600' 
                                : 'bg-emerald-600 text-white border border-emerald-600'
                            }`}>
                              {t(ehCopiaEnviadaRemetente(item) ? 'Enviada' : (item.unread ? 'Não Lida' : 'Lida'))}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${getOrgBadgeStyles(item.org)}`}>
                              {t((item.org || '').toUpperCase().startsWith('SOC - ') ? 'SOC' : item.org)}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 font-mono">ID: #{item.id}</span>
                            {(item as any).broadcastRecipients ? (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-violet-600 text-white border border-violet-600" title="Uma difusão enviada para vários destinatários — cada um recebeu a sua cópia">
                                {t('Difusão')} · {(item as any).broadcastRecipients} {t('destinatários')}
                              </span>
                            ) : null}
                            {item.unread && !ehCopiaEnviadaRemetente(item) && (
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
            {filteredMessages.length > limiteListaCorreio && (
              <div className="p-3 text-center bg-white border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLimiteListaCorreio(l => l + 200)}
                  className="px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-wider text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer border-none"
                >
                  Mostrar mais ({filteredMessages.length - limiteListaCorreio} linha(s) restante(s))
                </button>
              </div>
            )}
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
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[32px] p-6 md:p-10 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] border border-slate-100 max-w-md w-full text-center max-h-[95vh] overflow-y-auto mx-auto space-y-6 z-10"
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
                  : t("Tem a certeza que deseja eliminar esta correspondência oficial? A cópia da outra parte só é removida quando ela também eliminar.")}
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

      {sondagemModalJsx}
      {avisoSondagensJsx}
        {sucessoSondagensJsx}
    </section>
  );
}
