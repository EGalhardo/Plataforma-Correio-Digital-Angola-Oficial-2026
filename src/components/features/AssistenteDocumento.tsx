// ============================================================================
// Painel "Assistente do Documento" — Fase 1 / S2
// Botões Explicar · Resumir · Próximos passos · Prazos e direitos sobre o
// texto visível da correspondência/documento aberto. Cada resposta vem de
// POST /api/assistente-documento (S1) e é acompanhada pelo selo AVISO_IA.
// Estados: loading honesto, erro honesto; nunca texto fingido.
// Rascunhos de resposta NAO entram aqui — são o ciclo S5.
// ============================================================================

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Sparkles, MessageCircleQuestion, AlignLeft, ListOrdered, CalendarClock, Loader2, AlertTriangle } from 'lucide-react';
import { assistenteDocumento } from '../../services/aiDocumentoService';
import { AVISO_IA } from '../../services/aiDocumentoCore';
import type { AcaoDocumento } from '../../services/aiDocumentoCore';

type AcaoPainel = Exclude<AcaoDocumento, 'rascunho'>;

const ACOES: Array<{ id: AcaoPainel; label: string; icon: ReactNode }> = [
  { id: 'explicar', label: 'Explicar', icon: <MessageCircleQuestion size={14} /> },
  { id: 'resumir', label: 'Resumir', icon: <AlignLeft size={14} /> },
  { id: 'passos', label: 'Próximos passos', icon: <ListOrdered size={14} /> },
  { id: 'prazos_direitos', label: 'Prazos e direitos', icon: <CalendarClock size={14} /> },
];

interface AssistenteDocumentoProps {
  texto: string;
  titulo?: string;
  remetente?: string;
  className?: string;
}

export function AssistenteDocumento({ texto, titulo, remetente, className }: AssistenteDocumentoProps) {
  const [acaoAtiva, setAcaoAtiva] = useState<AcaoPainel | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [modelo, setModelo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Nova correspondência aberta => limpar qualquer resposta anterior.
  useEffect(() => {
    setAcaoAtiva(null);
    setLoading(false);
    setResultado(null);
    setModelo(null);
    setErro(null);
  }, [texto]);

  const executar = async (acao: AcaoPainel) => {
    if (loading) return;
    setAcaoAtiva(acao);
    setLoading(true);
    setResultado(null);
    setModelo(null);
    setErro(null);
    const r = await assistenteDocumento({ acao, texto, titulo, remetente });
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

  return (
    <div className={`rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 md:p-5 ${className || ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
          <Sparkles size={15} />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs md:text-sm font-black text-indigo-950 tracking-tight">Assistente do Documento</h4>
          <p className="text-[10px] text-indigo-500 font-bold">Analisa apenas o texto visível desta correspondência</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {ACOES.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => executar(a.id)}
            disabled={loading}
            className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border disabled:opacity-50 ${
              acaoAtiva === a.id && (loading || resultado)
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-indigo-800 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            {loading && acaoAtiva === a.id ? <Loader2 size={14} className="animate-spin" /> : a.icon}
            {a.label}
          </button>
        ))}
      </div>

      {loading && (
        <p className="mt-3 text-[11px] font-bold text-indigo-600 flex items-center gap-2">
          <Loader2 size={13} className="animate-spin" />
          A analisar o documento…
        </p>
      )}

      {erro && !loading && (
        <p className="mt-3 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            {erro}
          </span>
        </p>
      )}

      {resultado && !loading && (
        <div className="mt-3 bg-white border border-indigo-100 rounded-xl p-3.5">
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">{resultado}</p>
          <p className="mt-3 pt-2.5 border-t border-indigo-50 text-[10px] font-bold text-indigo-400">
            {AVISO_IA}{modelo ? ` · Modelo: ${modelo}` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
