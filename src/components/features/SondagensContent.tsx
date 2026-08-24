// ============================================================================
// SondagensContent — lista de sondagens da instituição + resultados expandidos
// (v36.1, spec §5). Gráfico de barras via recharts (chunk «charts» já existe).
// ============================================================================
import { useCallback, useEffect, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, Lock, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import {
  encerrarSondagem, listarSondagens, resultadosSondagem, sondagensDisponiveis,
  type Sondagem,
} from '../../services/sondagemService';

const CORES = ['#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#64748b', '#0c2340'];

interface Props {
  codigoInstituicao: string;
  addAuditLog: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
}

export function SondagensContent({ codigoInstituicao, addAuditLog }: Props) {
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [lista, setLista] = useState<Sondagem[]>([]);
  const [aberta, setAberta] = useState<number | null>(null);
  const [dados, setDados] = useState<Record<number, { rotulo: string; votos: number }[]>>({});
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const ok = await sondagensDisponiveis();
    setDisponivel(ok);
    if (ok) {
      const r = await listarSondagens(codigoInstituicao);
      // v37: rascunhos vivem apenas no compositor — a lista mostra ativa/encerrada
      if (r.ok) setLista((r.dados || []).filter(s => s.status !== 'rascunho'));
    }
    setCarregando(false);
  }, [codigoInstituicao]);

  useEffect(() => { carregar(); }, [carregar]);

  const expandir = async (s: Sondagem) => {
    if (aberta === s.id) { setAberta(null); return; }
    setAberta(s.id);
    if (dados[s.id]) return;
    const r = await resultadosSondagem(s.id);
    if (!r.ok) return;
    const cont: Record<string, number> = {};
    for (const resp of r.dados || []) for (const esc of resp.escolhas) cont[esc] = (cont[esc] || 0) + 1;
    setDados(prev => ({
      ...prev,
      [s.id]: s.opcoes.map(o => ({ rotulo: o.texto.length > 26 ? o.texto.slice(0, 23) + '…' : o.texto, votos: cont[o.id] || 0 })),
    }));
  };

  const encerrar = async (s: Sondagem) => {
    const r = await encerrarSondagem(s.id);
    if (r.ok) {
      addAuditLog(`Sondagem «${s.pergunta.slice(0, 60)}» encerrada.`, 'info');
      setLista(prev => prev.map(p => p.id === s.id ? { ...p, status: 'encerrada' } : p));
      setAberta(null);
    }
  };

  return (
    <div className="space-y-4" data-testid="sondagens-root">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><BarChart3 size={18} /></span>
        <div>
          <h2 className="font-sans font-black text-[#0c2340] text-base uppercase tracking-tight">Sondagens</h2>
          <p className="text-[11px] font-medium text-slate-500">Sondagens criadas por {codigoInstituicao} — clique para ver os resultados.</p>
        </div>
      </div>

      {disponivel === false && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-center gap-3" data-testid="selo-sondagens-migracao">
          <Lock size={16} className="text-amber-600 shrink-0" />
          <p className="text-[12px] font-semibold text-amber-800">
            Funcionalidade disponível em Modo Real (Supabase) — aguarda a aplicação da migração <code>v36_sondagens.sql</code> no SQL Editor do Supabase.
          </p>
        </div>
      )}

      {disponivel === true && !carregando && lista.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center">
          <p className="text-sm font-semibold text-slate-500">Ainda não criou nenhuma sondagem. Use «Criar Sondagem» na página Correio.</p>
        </div>
      )}

      {lista.map((s) => {
        const totalVotos = (dados[s.id] || []).reduce((a, b) => a + b.votos, 0);
        return (
          <div key={s.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => expandir(s)}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-transparent border-0 cursor-pointer text-left hover:bg-slate-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{s.pergunta}</p>
                <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                  {new Date(s.created_at).toLocaleDateString('pt-PT')} · âmbito {s.abrangencia === 'nacional' ? 'Nacional' : s.abrangencia === 'regional' ? 'Regional' : 'Local'} · {s.destinatarios ?? s.audiencia_total} destinatários ·{' '}
                  <span className={s.status === 'ativa' ? 'text-emerald-600 font-bold' : 'text-slate-500 font-bold'}>{s.status}</span>
                </p>
              </div>
              {aberta === s.id ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
            </button>

            {aberta === s.id && (
              <div className="px-5 pb-5 pt-1 border-t border-slate-100">
                {dados[s.id] ? (
                  <>
                    <div className="h-56 w-full mt-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dados[s.id]} margin={{ top: 8, right: 16, left: -18, bottom: 4 }}>
                          <XAxis dataKey="rotulo" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                          <Tooltip />
                          <Bar dataKey="votos" radius={[6, 6, 0, 0]}>
                            <LabelList dataKey="votos" position="top" style={{ fontSize: 11, fontWeight: 800, fill: '#0c2340' }} />
                            {dados[s.id].map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 mt-2 flex items-center gap-1.5">
                      <Users size={13} /> {totalVotos} voto(s) registado(s) de {s.audiencia_total} destinatários.
                    </p>
                  </>
                ) : (
                  <p className="text-[12px] font-medium text-slate-500 py-4">A carregar resultados…</p>
                )}
                {s.status === 'ativa' && (
                  <button
                    type="button"
                    onClick={() => encerrar(s)}
                    className="mt-3 px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-[10px] font-black uppercase tracking-widest bg-transparent cursor-pointer"
                  >
                    Encerrar sondagem
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
