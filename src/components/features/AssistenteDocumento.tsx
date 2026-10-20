// ============================================================================
// Painel "Assistente do Documento" — Fase 1 (S2 + S3 tradução + S4 voz + S5
// rascunhos). Todas as respostas vêm de POST /api/assistente-documento (S1)
// com o selo AVISO_IA; leitura por voz é local (SpeechSynthesis, custo zero);
// rascunhos só aparecem quando o pai fornece onUsarRascunho (envio fica humano).
// Estados: loading honesto, erro honesto; nunca texto fingido.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Sparkles, MessageCircleQuestion, AlignLeft, ListOrdered, CalendarClock,
  Languages, Volume2, Square, Loader2, AlertTriangle, PenLine, Send, BookOpen,
  ChevronDown, Check, Clock3, Scale,
} from 'lucide-react';
import { assistenteDocumento, seloKb } from '../../services/aiDocumentoService';
import type { AssistenteKb } from '../../services/aiDocumentoService';
import { AVISO_IA } from '../../services/aiDocumentoCore';
import type { AcaoDocumento, TipoRascunho, IdiomaTraducao } from '../../services/aiDocumentoCore';
import { aplicarVozPt } from '../../utils/vozTts';

// Chave de ação ativa: ação simples, tradução com idioma ou rascunho com tipo.
type ChaveAcao = string;

const ACOES_ANALISE: Array<{ id: Exclude<AcaoDocumento, 'rascunho' | 'traduzir'>; label: string; icon: ReactNode }> = [
  { id: 'explicar', label: 'Explicar', icon: <MessageCircleQuestion size={14} /> },
  { id: 'resumir', label: 'Resumir', icon: <AlignLeft size={14} /> },
  { id: 'passos', label: 'Próximos passos', icon: <ListOrdered size={14} /> },
  { id: 'prazos_direitos', label: 'Prazos e direitos', icon: <CalendarClock size={14} /> },
];

const IDIOMAS: Array<{ id: IdiomaTraducao; label: string }> = [
  { id: 'pt-simples', label: 'PT simples' },
  { id: 'en', label: 'EN' },
  { id: 'fr', label: 'FR' },
  // Línguas nacionais (2026-08-07): etiqueta honesta — a qualidade da IA
  // nestas línguas é variável; o prompt manda-a dizer quando não consegue.
  { id: 'umbundu', label: 'Umbundu (experimental)' },
  { id: 'kimbundu', label: 'Kimbundu (experimental)' },
  { id: 'kikongo', label: 'Kikongo (experimental)' },
  { id: 'cokwe', label: 'Cokwe (experimental)' },
  { id: 'kwanyama', label: 'Kwanyama (experimental)' },
];

const RASCUNHOS: Array<{ id: TipoRascunho; label: string }> = [
  { id: 'confirmacao', label: 'Confirmação de receção' },
  { id: 'esclarecimento', label: 'Pedir esclarecimentos' },
  { id: 'recurso', label: 'Intenção de recurso' },
  { id: 'prorrogacao', label: 'Prorrogar prazo' },
];

// Ícones dos rascunhos (só apresentação — as ações continuam as mesmas)
const RASCUNHO_ICONES: Record<TipoRascunho, ReactNode> = {
  confirmacao: <Check size={13} />,
  esclarecimento: <MessageCircleQuestion size={13} />,
  recurso: <Scale size={13} />,
  prorrogacao: <Clock3 size={13} />,
};

// Secção expansível comum (200–300 ms: fade + expansão vertical + chevron).
// Fechada: título + ícone + ▼ · Aberta: título + ícone + ▲ + conteúdo.
function Sec({ titulo, icone, subtitulo, aberto, onAlternar, children }: {
  titulo: string;
  icone: ReactNode;
  subtitulo?: string;
  aberto: boolean;
  onAlternar: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-indigo-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={aberto}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-indigo-50/60 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-indigo-500 shrink-0">{icone}</span>
          <span className="min-w-0">
            <span className="block text-[11px] font-black uppercase tracking-wider text-indigo-800 truncate">{titulo}</span>
            {subtitulo && <span className="block text-[10px] font-bold text-indigo-400">{subtitulo}</span>}
          </span>
        </span>
        <ChevronDown size={14} className={`shrink-0 text-indigo-400 transition-transform duration-300 ${aberto ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${aberto ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-2.5 border-t border-indigo-100">{children}</div>
        </div>
      </div>
    </div>
  );
}

interface AssistenteDocumentoProps {
  texto: string;
  titulo?: string;
  remetente?: string;
  className?: string;
  /** S5 — quando presente, mostra os 4 tipos de rascunho e entrega o texto ao compositor. */
  onUsarRascunho?: (texto: string) => void;
}

export function AssistenteDocumento({ texto, titulo, remetente, className, onUsarRascunho }: AssistenteDocumentoProps) {
  const [acaoAtiva, setAcaoAtiva] = useState<ChaveAcao | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [modelo, setModelo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // E4 — proveniência devolvida pelo servidor (null = resposta sem KB).
  const [kb, setKb] = useState<AssistenteKb | null>(null);
  const [aFalar, setAFalar] = useState<'documento' | 'resposta' | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Reorganização UX (2026-08-10, a pedido do dono): secções expansíveis
  // DENTRO deste container — TODAS nascem FECHADAS. Fora dele, nada muda.
  const [infoAberta, setInfoAberta] = useState(false);
  const [traduzirAberto, setTraduzirAberto] = useState(false);
  const [responderAberto, setResponderAberto] = useState(false);

  const vozSuportada = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Nova correspondência aberta => limpar qualquer resposta anterior.
  useEffect(() => {
    setAcaoAtiva(null);
    setLoading(false);
    setResultado(null);
    setModelo(null);
    setErro(null);
    setKb(null);
    pararVoz();
  }, [texto]);

  const pararVoz = () => {
    if (vozSuportada) window.speechSynthesis.cancel();
    utterRef.current = null;
    setAFalar(null);
  };

  const falar = (origem: 'documento' | 'resposta', conteudo: string) => {
    if (!vozSuportada) return;
    if (aFalar === origem) {
      pararVoz();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(conteudo);
    // v37.52 — voz pt natural + ritmo mais humano.
    aplicarVozPt(u);
    u.onend = () => setAFalar((prev) => (prev === origem ? null : prev));
    u.onerror = () => setAFalar((prev) => (prev === origem ? null : prev));
    utterRef.current = u;
    setAFalar(origem);
    window.speechSynthesis.speak(u);
  };

  const executar = async (chave: ChaveAcao) => {
    if (loading) return;
    pararVoz();
    setAcaoAtiva(chave);
    setLoading(true);
    setResultado(null);
    setModelo(null);
    setErro(null);
    setKb(null);

    let pedido: Parameters<typeof assistenteDocumento>[0];
    if (chave.startsWith('traduzir:')) {
      pedido = { acao: 'traduzir', idiomaDestino: chave.split(':')[1] as IdiomaTraducao, texto, titulo, remetente };
    } else if (chave.startsWith('rascunho:')) {
      pedido = { acao: 'rascunho', tipoRascunho: chave.split(':')[1] as TipoRascunho, texto, titulo, remetente };
    } else {
      pedido = { acao: chave as AcaoDocumento, texto, titulo, remetente };
    }

    const r = await assistenteDocumento(pedido);
    setLoading(false);
    if (r.ok) {
      setResultado(r.resultado || null);
      setModelo(r.modelo || null);
      setKb(r.kb ?? null);
    } else {
      setErro(r.erro || 'Não foi possível obter resposta do assistente de IA agora. Tenta novamente dentro de instantes.');
    }
  };

  // Sem texto visível não há nada para analisar — dizê-lo com honestidade.
  if (!texto || texto.trim().length === 0) {
    return null;
  }

  const botaoChave = (chave: ChaveAcao, label: string, icon: ReactNode) => (
    <button
      key={chave}
      type="button"
      onClick={() => executar(chave)}
      disabled={loading}
      className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border disabled:opacity-50 ${
        acaoAtiva === chave && (loading || resultado)
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-white text-indigo-800 border-indigo-200 hover:bg-indigo-100'
      }`}
    >
      {loading && acaoAtiva === chave ? <Loader2 size={14} className="animate-spin" /> : icon}
      {label}
    </button>
  );

  return (
    <div className={`cda-assistente-doc rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 md:p-5 ${className || ''}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Sparkles size={15} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs md:text-sm font-black text-indigo-950 tracking-tight">Assistente do Documento</h4>
          </div>
        </div>
        {vozSuportada && (
          <button
            type="button"
            onClick={() => falar('documento', texto)}
            className="shrink-0 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider bg-white text-indigo-800 border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1.5"
            title="Ler o documento em voz alta"
          >
            {aFalar === 'documento' ? <Square size={13} /> : <Volume2 size={13} />}
            {aFalar === 'documento' ? 'Parar' : 'Ouvir'}
          </button>
        )}
      </div>

      {/* Subtítulo → informação expansível (nasce fechada) */}
      <div className="mb-3">
        <button
          type="button"
          onClick={() => setInfoAberta((v) => !v)}
          aria-expanded={infoAberta}
          className="w-full flex items-center justify-between gap-2 -mx-1 px-1 py-1 rounded-lg text-left hover:bg-indigo-100/50 transition-colors"
        >
          <p className="text-[10px] text-indigo-500 font-bold">Analisa apenas o texto visível desta correspondência</p>
          <ChevronDown size={12} className={`shrink-0 text-indigo-400 transition-transform duration-300 ${infoAberta ? 'rotate-180' : ''}`} />
        </button>
        <div className={`grid transition-all duration-300 ease-in-out ${infoAberta ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <p className="mt-1.5 text-[11px] leading-relaxed font-medium text-indigo-700 bg-indigo-100/60 border border-indigo-200 rounded-lg p-2.5">
              A IA analisa apenas o texto atualmente visível desta correspondência. As sugestões apresentadas devem ser revistas pelo cidadão antes de qualquer envio.
            </p>
          </div>
        </div>
      </div>

      {/* Ações principais — sempre visíveis (não colapsam) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {ACOES_ANALISE.map((a) => botaoChave(a.id, a.label, a.icon))}
      </div>

      {/* Traduzir → accordion (idiomas nascem escondidos; mobile: quebram linha) */}
      <div className="mt-2">
        <Sec
          titulo="Traduzir"
          icone={<Languages size={13} />}
          aberto={traduzirAberto}
          onAlternar={() => setTraduzirAberto((v) => !v)}
        >
          <div className="flex flex-wrap gap-2">
            {IDIOMAS.map((i) => botaoChave(`traduzir:${i.id}`, i.label, null))}
          </div>
        </Sec>
      </div>

      {onUsarRascunho && (
        <div className="mt-2">
          <Sec
            titulo="Responder com ajuda da IA"
            subtitulo="Tu revês sempre"
            icone={<PenLine size={13} />}
            aberto={responderAberto}
            onAlternar={() => setResponderAberto((v) => !v)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {RASCUNHOS.map((r) => botaoChave(`rascunho:${r.id}`, r.label, RASCUNHO_ICONES[r.id]))}
            </div>
          </Sec>
        </div>
      )}

      {loading && (
        <p className="mt-3 text-[11px] font-bold text-indigo-600 flex items-center gap-2">
          <Loader2 size={13} className="animate-spin" />
          A analisar o documento…
        </p>
      )}

      {erro && !loading && (
        <p className="mt-3 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>{erro}</span>
        </p>
      )}

      {resultado && !loading && (
        <div className="mt-3 bg-white border border-indigo-100 rounded-xl p-3.5">
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">{resultado}</p>

          {/* E4 — selo de proveniência: sempre visível, linguagem honesta.
              Com KB: quantos documentos oficiais fundamentaram a resposta
              (título mostra quais). Sem KB: diz que veio só do documento. */}
          <p
            className="mt-2.5 flex items-start gap-1.5 text-[10px] font-bold text-slate-500"
            title={kb ? `Fontes usadas: ${kb.fontes.join(' · ')}` : undefined}
          >
            <BookOpen size={12} className="shrink-0 mt-0.5 text-slate-400" />
            <span>{seloKb(kb)}</span>
          </p>

          <div className="mt-3 pt-2.5 border-t border-indigo-50 flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[10px] font-bold text-indigo-400">
              {AVISO_IA}{modelo ? ` · Modelo: ${modelo}` : ''}
            </p>
            <div className="flex items-center gap-2">
              {vozSuportada && (
                <button
                  type="button"
                  onClick={() => falar('resposta', resultado)}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1"
                >
                  {aFalar === 'resposta' ? <Square size={11} /> : <Volume2 size={11} />}
                  {aFalar === 'resposta' ? 'Parar' : 'Ouvir resposta'}
                </button>
              )}
              {onUsarRascunho && acaoAtiva?.startsWith('rascunho:') && (
                <button
                  type="button"
                  onClick={() => onUsarRascunho(resultado)}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1"
                >
                  <Send size={11} />
                  Usar no compositor
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
