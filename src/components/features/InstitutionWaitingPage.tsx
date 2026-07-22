// ============================================================================
// Página Informativa de Espera — Instituição Pendente / Em Correções
// ----------------------------------------------------------------------------
// Renderizada dentro da área da Instituição enquanto a conta aguarda a decisão
// da Área de Administração (mesmo papel desempenhado pela homologação no
// cidadão). Mostra thread oficial + botão "Atualizar Estado".
// ============================================================================

import { useState } from 'react';
import { Landmark, RefreshCw, ShieldCheck, Clock, Send, AlertTriangle, Ban } from 'lucide-react';
import { homologationStore } from '../../services/homologationStore';

interface InstitutionWaitingPageProps {
  code: string;
  name: string;
  onRefresh: () => void;
}

export function InstitutionWaitingPage({ code, name, onRefresh }: InstitutionWaitingPageProps) {
  const [input, setInput] = useState('');
  const [tick, setTick] = useState(0);
  const rec = homologationStore.getStatus(code);
  void tick;

  const status: 'pending' | 'correcao' | 'rejected' | 'blocked' =
    rec?.status === 'correcao' ? 'correcao' :
    rec?.status === 'rejected' ? 'rejected' :
    rec?.status === 'blocked' ? 'blocked' : 'pending';

  const titles: Record<typeof status, string> = {
    pending: '🟡 Pendente de Aprovação',
    correcao: '🟠 Em Correções',
    rejected: '🔴 Rejeitada',
    blocked: '🔴 Suspensa',
  };

  const handleSend = () => {
    if (!input.trim()) return;
    homologationStore.addMessage(code, 'citizen', input.trim());
    setInput('');
    setTick(t => t + 1);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center max-w-3xl mx-auto w-full">
      <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 mb-5">
        <Clock size={30} className="animate-pulse" />
      </div>

      <h2 className="text-lg md:text-2xl font-black text-[#0c2340] uppercase tracking-tight leading-tight mb-3">
        {name}
      </h2>

      <p className="text-[11.5px] md:text-xs text-slate-600 font-medium leading-relaxed max-w-xl mb-4">
        A sua instituição encontra-se em processo de validação pela Administração do Correio Digital Angola.
        O pedido foi recebido com sucesso e será analisado brevemente.
        Assim que a instituição for aprovada, todas as funcionalidades ficarão automaticamente disponíveis.
      </p>

      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[11px] font-black uppercase tracking-widest mb-5 ${
        status === 'pending' ? 'bg-amber-50 border-amber-200 text-amber-700' :
        status === 'correcao' ? 'bg-orange-50 border-orange-200 text-orange-700' :
        'bg-rose-50 border-rose-200 text-rose-700'
      }`}>
        {status === 'blocked' || status === 'rejected' ? <Ban size={13} /> : <Clock size={13} />}
        Estado do pedido: {titles[status]}
      </div>

      {(status === 'correcao' || status === 'rejected' || status === 'blocked') && rec?.reason && (
        <div className="flex items-start gap-2 bg-orange-50/80 border border-orange-200 rounded-2xl px-4 py-3 text-left mb-5 max-w-xl">
          <AlertTriangle size={14} className="text-orange-500 shrink-0 mt-0.5" />
          <p className="text-[10.5px] font-bold text-orange-800 leading-snug">
            {status === 'correcao' ? 'Correções solicitadas: ' : 'Motivo: '}
            <span className="font-medium">{rec.reason}</span>
          </p>
        </div>
      )}

      <button
        onClick={onRefresh}
        className="bg-[#0E2B64] hover:bg-[#081a3d] text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer border-none flex items-center gap-2 mb-7 shadow-lg shadow-[#0E2B64]/15"
      >
        <RefreshCw size={13} />
        Atualizar Estado
      </button>

      {/* Canal oficial da homologação */}
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm text-left">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <ShieldCheck size={14} className="text-[#2563eb]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Canal Oficial — Área de Administração (Código: {code})</span>
        </div>
        <div className="max-h-[240px] overflow-y-auto custom-scrollbar p-4 space-y-2.5">
          {homologationStore.getThread(code).length === 0 && (
            <p className="text-[10px] text-slate-400 font-bold">A aguardar a primeira comunicação da Área de Administração.</p>
          )}
          {homologationStore.getThread(code).map((m) => (
            <div
              key={m.id}
              className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[10.5px] font-medium leading-snug ${
                m.from === 'admin'
                  ? 'bg-blue-50 text-blue-950 border border-blue-100'
                  : 'bg-emerald-50 text-emerald-950 border border-emerald-100 ml-auto'
              }`}
            >
              <span className="block text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">
                {m.from === 'admin' ? 'Área de Administração' : (name === code ? 'Instituição' : name)} · {m.at}
              </span>
              {m.text}
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 p-3.5 flex items-center gap-2">
          <Landmark size={13} className="text-slate-400 shrink-0" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Responder ao canal oficial da Administração…"
            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10.5px] font-bold text-slate-800 outline-none focus:border-[#2563eb]/40"
          />
          <button
            onClick={handleSend}
            className="bg-[#2563eb] hover:bg-[#0E2B64] text-white px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer border-none flex items-center gap-1.5"
          >
            <Send size={11} /> Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
