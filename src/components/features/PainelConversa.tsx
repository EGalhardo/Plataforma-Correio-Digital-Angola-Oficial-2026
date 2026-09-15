import { useState } from 'react';
import { Users, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import type { Message } from '../../types';
import type { Conversa } from '../../utils/conversasThread';
import { rotuloDestinatario } from '../../utils/conversasThread';

// ============================================================================
// PainelConversa — cabeçalho da conversa (estilo Gmail) no detalhe da
// correspondência enviada: uma linha por destinatário, conteúdo idêntico.
// Clicar num destinatário troca a cópia em detalhe (mesmo conteúdo).
// ============================================================================

interface Props {
  conversa: Conversa;
  selectedId: number;
  onSelect: (m: Message) => void;
}

function dataCopia(m: Message): string {
  if (m.createdAt) {
    const d = new Date(m.createdAt);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  return m.date || '—';
}

export function PainelConversa({ conversa, selectedId, onSelect }: Props) {
  const [aberto, setAberto] = useState(true);
  return (
    <div className="bg-white border border-indigo-200 rounded-3xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto(a => !a)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-transparent border-0 cursor-pointer text-left hover:bg-indigo-50/40 transition-colors"
        aria-expanded={aberto}
      >
        <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
          <Users size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-[#0c2340] uppercase tracking-tight">
            Conversa · {conversa.total} {conversa.total === 1 ? 'destinatário' : 'destinatários'}
          </span>
          <span className="block text-[11px] font-semibold text-slate-500 truncate">
            {conversa.assunto} — conteúdo idêntico enviado a todos
          </span>
        </span>
        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest">
          {conversa.total} {aberto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>
      {aberto && (
        <ul className="m-0 p-2 pt-0 space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
          {conversa.copias.map(c => {
            const activo = c.id === selectedId;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c)}
                  title={activo ? 'Cópia em detalhe' : 'Ver esta cópia em detalhe'}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl border text-left transition-colors cursor-pointer ${
                    activo
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50'
                  }`}
                >
                  <span className={`min-w-0 flex-1 truncate text-xs font-bold ${activo ? 'text-white' : 'text-slate-800'}`}>
                    {rotuloDestinatario(c)}
                  </span>
                  <span className={`shrink-0 text-[10px] font-semibold ${activo ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {dataCopia(c)}
                  </span>
                  <span className={`shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                    activo ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  }`}>
                    {c.details?.state || 'Enviada'}
                  </span>
                  {activo && <CheckCircle2 size={14} className="shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
