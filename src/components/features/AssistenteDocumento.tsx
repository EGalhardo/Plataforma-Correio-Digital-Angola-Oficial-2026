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
  Languages, Volume2, Square, Loader2, AlertTriangle, PenLine, Send,
} from 'lucide-react';
import { assistenteDocumento } from '../../services/aiDocumentoService';
import { AVISO_IA } from '../../services/aiDocumentoCore';
import type { AcaoDocumento, TipoRascunho, IdiomaTraducao } from '../../services/aiDocumentoCore';

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
];

const RASCUNHOS: Array<{ id: TipoRascunho; label: string }> = [
  { id: 'confirmacao', label: 'Confirmação de receção' },
  { id: 'esclarecimento', label: 'Pedir esclarecimentos' },
  { id: 'recurso', label: 'Intenção de recurso' },
  { id: 'prorrogacao', label: 'Prorrogar prazo' },
];

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
  const [aFalar, setAFalar] = useState<'documento' | 'resposta' | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const vozSuportada = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Nova correspondência aberta => limpar qualquer resposta anterior.
  useEffect(() => {
    setAcaoAtiva(null);
    setLoading(false);
    setResultado(null);
    setModelo(null);
    setErro(null);
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
    u.lang = 'pt-PT';
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
    <div className={`rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 md:p-5 ${className || ''}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Sparkles size={15} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs md:text-sm font-black text-indigo-950 tracking-tight">Assistente do Documento</h4>
            <p className="text-[10px] text-indigo-500 font-bold">Analisa apenas o texto visível desta correspondência</p>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {ACOES_ANALISE.map((a) => botaoChave(a.id, a.label, a.icon))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1">
          <Languages size={12} /> Traduzir:
        </span>
        <div className="flex gap-2 flex-1">
          {IDIOMAS.map((i) => botaoChave(`traduzir:${i.id}`, i.label, null))}
        </div>
      </div>

      {onUsarRascunho && (
        <div className="mt-3 pt-3 border-t border-indigo-100">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <PenLine size={12} /> Responder com ajuda da IA (tu revês sempre):
          </p>
          <div className="grid grid-cols-2 gap-2">
            {RASCUNHOS.map((r) => botaoChave(`rascunho:${r.id}`, r.label, null))}
          </div>
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
