import { ListaRolavel } from '../ui/ListaRolavel';
// ============================================================================
// SondagensContent — lista de sondagens da instituição + resultados expandidos
// (v36.1, spec §5). Gráfico de barras via recharts (chunk «charts» já existe).
// Pastas por correspondência (estilo Gmail): todas as perguntas/inquéritos da
// MESMA correspondência ficam na mesma pasta; abrir mostra um gráfico por
// pergunta. Perguntas sem correspondência (difusão por âmbito) ficam em pasta
// própria.
// ============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, BarChart3, ChevronDown, ChevronUp, Lock, Users, MessagesSquare, Loader2, ClipboardList, Bot, FolderOpen } from 'lucide-react';
import { BotaoVoltar } from '../ui/BotaoVoltar';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import {
  encerrarSondagem, listarSondagens, resultadosSondagem, sondagensDisponiveis,
  type Sondagem,
} from '../../services/sondagemService';
// 2026-09-10 — Inquéritos com IA (PROMPT v3 §4.5): aparecem na mesma lista
// com badge «IA», contadores e popup «Resultados do Inquérito com IA».
import {
  inqueritosIaDisponiveis, listarInqueritosIA, contadoresInqueritoIA,
  type InqueritoIA, type ContadoresInqueritoIA,
} from '../../services/inqueritoIaService';
import { InqueritoIaResultados } from './InqueritoIaResultados';
import type { Message } from '../../types';
import { agruparConversas, type Conversa } from '../../utils/conversasThread';

const CORES = ['#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#64748b', '#0c2340'];

interface Props {
  codigoInstituicao: string;
  title?: string;
  onBack?: () => void;
  onCreate?: () => void;
  addAuditLog: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
  /** Avisos não lidos sobre inquéritos (mesma contagem do badge do atalho). */
  novidadesNaoLidas?: number;
  onVerNotificacoes?: () => void;
  /** Enviadas da instituição: ligam cada pergunta à sua correspondência. */
  mensagensEnviadas?: Message[];
}

interface Pasta<T> {
  chave: string;
  conversa: Conversa | null;
  itens: T[];
}

function dataConversa(c: Conversa): string {
  if (c.representante.createdAt) {
    const d = new Date(c.representante.createdAt);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('pt-PT');
  }
  return c.representante.date || '';
}

export function SondagensContent({ codigoInstituicao, addAuditLog, title = 'Sondagens', onBack, onCreate, novidadesNaoLidas = 0, onVerNotificacoes, mensagensEnviadas = [] }: Props) {
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [lista, setLista] = useState<Sondagem[]>([]);
  const [pastaAberta, setPastaAberta] = useState<string | null>(null);
  const [dados, setDados] = useState<Record<number, { rotulo: string; votos: number }[]>>({});
  const [carregando, setCarregando] = useState(false);
  // Inquéritos com IA
  const [listaIA, setListaIA] = useState<InqueritoIA[]>([]);
  const [contIA, setContIA] = useState<Record<number, ContadoresInqueritoIA>>({});
  const [resultadosIA, setResultadosIA] = useState<InqueritoIA | null>(null);
  const [aba, setAba] = useState<'normal' | 'ia'>('normal');

  const carregar = useCallback(async () => {
    setCarregando(true);
    const ok = await sondagensDisponiveis();
    setDisponivel(ok);
    if (ok) {
      const r = await listarSondagens(codigoInstituicao);
      // v37: rascunhos vivem apenas no compositor — a lista mostra ativa/encerrada
      if (r.ok) setLista((r.dados || []).filter(s => s.status !== 'rascunho'));
      if (await inqueritosIaDisponiveis()) {
        const q = await listarInqueritosIA(codigoInstituicao);
        if (q.ok) {
          const itens = q.dados || [];
          setListaIA(itens);
          // contadores em paralelo (RPC leve); falhas individuais não bloqueiam
          const pares = await Promise.all(itens.map(async (i) => [i.id, await contadoresInqueritoIA(i)] as const));
          setContIA(Object.fromEntries(pares));
        }
      }
    }
    setCarregando(false);
  }, [codigoInstituicao]);

  useEffect(() => { carregar(); }, [carregar]);

  // --- Pastas por correspondência -------------------------------------------
  const conversasEnv = useMemo(() => agruparConversas(mensagensEnviadas || []), [mensagensEnviadas]);
  const conversaPorSondagem = useMemo(() => {
    const m = new Map<number, Conversa>();
    for (const c of conversasEnv) for (const id of c.sondagemIds) if (!m.has(id)) m.set(id, c);
    return m;
  }, [conversasEnv]);
  const conversaPorIA = useMemo(() => {
    const m = new Map<number, Conversa>();
    for (const c of conversasEnv) for (const id of c.inqueritoIaIds) if (!m.has(id)) m.set(id, c);
    return m;
  }, [conversasEnv]);
  const pastas: Pasta<Sondagem>[] = useMemo(() => {
    const out: Pasta<Sondagem>[] = [];
    const idx = new Map<string, Pasta<Sondagem>>();
    for (const s of lista) {
      const c = conversaPorSondagem.get(s.id) || null;
      const chave = c ? `t:${c.chave}` : `s:${s.id}`;
      let p = idx.get(chave);
      if (!p) { p = { chave, conversa: c, itens: [] }; idx.set(chave, p); out.push(p); }
      p.itens.push(s);
    }
    return out;
  }, [lista, conversaPorSondagem]);
  const pastasIA: Pasta<InqueritoIA>[] = useMemo(() => {
    const out: Pasta<InqueritoIA>[] = [];
    const idx = new Map<string, Pasta<InqueritoIA>>();
    for (const q of listaIA) {
      const c = conversaPorIA.get(q.id) || null;
      const chave = c ? `t:${c.chave}` : `q:${q.id}`;
      let p = idx.get(chave);
      if (!p) { p = { chave, conversa: c, itens: [] }; idx.set(chave, p); out.push(p); }
      p.itens.push(q);
    }
    return out;
  }, [listaIA, conversaPorIA]);

  const carregarResultados = useCallback(async (s: Sondagem) => {
    const r = await resultadosSondagem(s.id);
    if (!r.ok) return;
    const cont: Record<string, number> = {};
    for (const resp of r.dados || []) for (const esc of resp.escolhas) cont[esc] = (cont[esc] || 0) + 1;
    setDados(prev => {
      if (prev[s.id]) return prev;
      return {
        ...prev,
        [s.id]: s.opcoes.map(o => ({ rotulo: o.texto.length > 26 ? o.texto.slice(0, 23) + '…' : o.texto, votos: cont[o.id] || 0 })),
      };
    });
  }, []);

  const abrirPasta = (p: Pasta<Sondagem>) => {
    if (pastaAberta === p.chave) { setPastaAberta(null); return; }
    setPastaAberta(p.chave);
    // um gráfico por pergunta: carrega em paralelo os que ainda faltam
    for (const s of p.itens) {
      if (!dados[s.id]) void carregarResultados(s);
    }
  };

  const encerrar = async (s: Sondagem) => {
    const r = await encerrarSondagem(s.id);
    if (r.ok) {
      addAuditLog(`Sondagem «${s.pergunta.slice(0, 60)}» encerrada.`, 'info');
      setLista(prev => prev.map(p => p.id === s.id ? { ...p, status: 'encerrada' } : p));
      setPastaAberta(null);
    }
  };

  return (
    <div className="space-y-4" data-testid="sondagens-root">
      <div className="flex flex-wrap items-center gap-3">
        <BotaoVoltar onClick={onBack} />
        <span className="p-2 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
          <img
            src="https://i.postimg.cc/L4gTRJfp/Inquerito-(1).png"
            alt="Inquéritos"
            loading="lazy"
            className="h-[72px] w-[72px] md:h-[88px] md:w-[88px] object-contain rounded-xl"
          />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-sans font-black text-[#0c2340] text-xl md:text-2xl tracking-tight">{title}</h2>
          <p className="text-xs md:text-sm text-slate-500 font-medium">Sondagens e inquéritos com IA criados por {codigoInstituicao} — clique para ver os resultados.</p>
        </div>
      <div role="tablist" aria-label="Tipo de inquérito" data-aba-inquerito={aba}
        className="flex items-end gap-1.5 md:gap-5 border-b border-slate-200 overflow-x-auto custom-scrollbar-h shrink-0">
        {([
          { a: 'normal', rotulo: 'Normal', Icone: ClipboardList },
          { a: 'ia', rotulo: 'IA', Icone: Bot },
        ] as const).map(({ a, rotulo, Icone }) => {
          const activo = aba === a;
          return (
            <button key={a} type="button" role="tab" aria-selected={activo} data-aba={a} id={`tab-inqueritos-${a}`}
              onClick={() => setAba(a)}
              className={`relative flex items-center gap-2.5 px-3 md:px-6 py-2.5 md:py-3 -mb-px whitespace-nowrap text-[0.7rem] md:text-[0.9rem] font-black transition-colors bg-transparent border-0 border-b-2 cursor-pointer ${
                activo ? 'text-primary border-primary' : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}>
              <Icone size={18} className="md:w-[1.4rem] md:h-[1.4rem] shrink-0" strokeWidth={activo ? 2.2 : 1.8} />
              {rotulo}
            </button>
          );
        })}
      </div>
        <div className="flex-1" aria-hidden="true" />
        {onCreate && <button type="button" onClick={onCreate} className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-primary text-white rounded-2xl px-5 py-3 text-xs font-black shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors">
          <Plus size={17} aria-hidden="true" />Criar Inquéritos
        </button>}
      </div>

      {novidadesNaoLidas > 0 && (
        <button type="button" onClick={onVerNotificacoes} data-novidades-inqueritos={novidadesNaoLidas}
          className="w-full rounded-2xl border border-red-200 bg-red-50 px-5 py-3 flex items-center gap-3 text-left hover:bg-red-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors cursor-pointer">
          <span className="shrink-0 min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-black tabular-nums leading-none" role="status">{novidadesNaoLidas}</span>
          <span className="text-[12px] font-bold text-red-800">{novidadesNaoLidas === 1 ? 'novidade não lida sobre inquéritos' : 'novidades não lidas sobre inquéritos'} — ver notificações</span>
        </button>
      )}

      {disponivel === false && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-center gap-3" data-testid="selo-sondagens-migracao">
          <Lock size={16} className="text-amber-600 shrink-0" />
          <p className="text-[12px] font-semibold text-amber-800">
            Funcionalidade disponível em Modo Real (Supabase) — aguarda a aplicação da migração <code>v36_sondagens.sql</code> no SQL Editor do Supabase.
          </p>
        </div>
      )}

      {disponivel === true && !carregando && aba === 'normal' && lista.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center">
          <p className="text-sm font-semibold text-slate-500">Ainda não criou sondagens normais. Use «Criar Inquérito» na página Correio.</p>
        </div>
      )}
      {disponivel === true && !carregando && aba === 'ia' && listaIA.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center">
          <p className="text-sm font-semibold text-slate-500">Ainda não criou inquéritos com IA. Use «Criar Inquérito» na página Correio.</p>
        </div>
      )}

      <ListaRolavel count={aba === 'ia' ? pastasIA.length : pastas.length} label="Lista de inquéritos">
      {aba === 'ia' && (<>
      {/* Inquéritos com IA (conversacionais), agrupados por correspondência */}
      {pastasIA.map((p) => {
        const aberta = pastaAberta === p.chave;
        const titulo = p.conversa ? p.conversa.assunto : (p.itens[0]?.guiao?.objectivo || p.itens[0]?.o_que_pretende_saber || 'Inquérito com IA');
        return (
          <div key={p.chave} className="rounded-2xl border border-indigo-100 bg-white shadow-sm overflow-hidden" data-testid="inquerito-ia-pasta">
            <button
              type="button"
              onClick={() => setPastaAberta(aberta ? null : p.chave)}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-transparent border-0 cursor-pointer text-left hover:bg-indigo-50/40 transition-colors"
              title={p.conversa ? 'Ver inquéritos desta correspondência' : 'Ver resultados do inquérito com IA'}
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate m-0 flex items-center gap-2">
                  <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest"><MessagesSquare size={10} /> IA</span>
                  {p.conversa && <FolderOpen size={14} className="text-indigo-500 shrink-0" />}
                  <span className="truncate">{titulo}</span>
                </p>
                <p className="text-[11px] font-medium text-slate-500 mt-1 m-0 flex items-center gap-x-1.5 flex-wrap">
                  {p.conversa ? (
                    <>{dataConversa(p.conversa)} · {p.itens.length} {p.itens.length === 1 ? 'inquérito' : 'inquéritos'} · {p.conversa.total} {p.conversa.total === 1 ? 'destinatário' : 'destinatários'}</>
                  ) : (
                    <>{p.itens[0] && new Date(p.itens[0].created_at).toLocaleDateString('pt-PT')} · âmbito {p.itens[0]?.abrangencia === 'nacional' ? 'Nacional' : p.itens[0]?.abrangencia === 'regional' ? 'Regional' : 'Local'}</>
                  )}
                </p>
              </div>
              {aberta ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
            </button>
            {aberta && (
              <div className="px-3 pb-3 pt-1 border-t border-slate-100 space-y-2">
                {p.itens.map((q) => {
                  const c = contIA[q.id];
                  const tituloQ = q.guiao?.objectivo || q.o_que_pretende_saber;
                  return (
                    <div key={`ia-${q.id}`} className="rounded-xl border border-slate-200 bg-white overflow-hidden" data-testid="inquerito-ia-linha">
                      <button
                        type="button"
                        onClick={() => setResultadosIA(q)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-transparent border-0 cursor-pointer text-left hover:bg-indigo-50/40 transition-colors"
                        title="Ver resultados do inquérito com IA"
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-slate-800 truncate m-0">{tituloQ}</p>
                          <p className="text-[11px] font-medium text-slate-500 mt-1 m-0 flex items-center gap-x-1.5 flex-wrap">
                            {new Date(q.created_at).toLocaleDateString('pt-PT')} · âmbito {q.abrangencia === 'nacional' ? 'Nacional' : q.abrangencia === 'regional' ? 'Regional' : 'Local'} ·{' '}
                            <span className={q.status === 'ativo' ? 'text-emerald-600 font-bold' : 'text-slate-500 font-bold'}>{q.status}</span>
                            <span className="text-slate-300">|</span>
                            {c ? (
                              <span className="tabular-nums" data-testid="inquerito-ia-contadores-linha">
                                <b className="text-slate-700">{c.enviados}</b> enviados · <b className="text-blue-700">{c.iniciados}</b> iniciados · <b className="text-emerald-700">{c.concluidos}</b> concluídos · <b className="text-rose-700">{c.recusados}</b> recusados
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> a contar…</span>
                            )}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-indigo-600">Resultados</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      </>)}

      {aba === 'normal' && (<>
      {/* Sondagens normais, agrupadas por correspondência: um gráfico por pergunta */}
      {pastas.map((p) => {
        const aberta = pastaAberta === p.chave;
        const unica = !p.conversa && p.itens.length === 1;
        const titulo = p.conversa ? p.conversa.assunto : p.itens[0].pergunta;
        return (
          <div key={p.chave} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden" data-testid="sondagem-pasta">
            <button
              type="button"
              onClick={() => abrirPasta(p)}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-transparent border-0 cursor-pointer text-left hover:bg-slate-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate flex items-center gap-2">
                  {p.conversa && <FolderOpen size={15} className="text-indigo-500 shrink-0" />}
                  <span className="truncate">{titulo}</span>
                </p>
                <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                  {p.conversa ? (
                    <>{dataConversa(p.conversa)} · {p.itens.length} {p.itens.length === 1 ? 'pergunta' : 'perguntas'} · {p.conversa.total} {p.conversa.total === 1 ? 'destinatário' : 'destinatários'}</>
                  ) : (
                    <>{new Date(p.itens[0].created_at).toLocaleDateString('pt-PT')} · âmbito {p.itens[0].abrangencia === 'nacional' ? 'Nacional' : p.itens[0].abrangencia === 'regional' ? 'Regional' : 'Local'} · {p.itens[0].destinatarios ?? p.itens[0].audiencia_total} destinatários ·{' '}
                    <span className={p.itens[0].status === 'ativa' ? 'text-emerald-600 font-bold' : 'text-slate-500 font-bold'}>{p.itens[0].status}</span></>
                  )}
                </p>
              </div>
              {aberta ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
            </button>

            {aberta && (
              <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4">
                {p.itens.map((s) => {
                  const totalVotos = (dados[s.id] || []).reduce((a, b) => a + b.votos, 0);
                  return (
                    <div key={s.id} className={p.itens.length > 1 ? 'rounded-xl border border-slate-200 bg-white px-4 py-3' : ''}>
                      {(!unica || p.itens.length > 1) && (
                        <p className="text-[13px] font-bold text-slate-800 m-0 mb-2">{s.pergunta}</p>
                      )}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        {p.itens.length === 1 && (
                          <>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 m-0">Pergunta da sondagem</p>
                            <p className="text-[13px] font-bold text-slate-800 m-0">{s.pergunta}</p>
                          </>
                        )}
                        <p className={`text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 m-0 ${p.itens.length === 1 ? 'mt-3' : ''}`}>Opções</p>
                        <ul className="m-0 pl-4 space-y-1">
                          {s.opcoes.map(o => (
                            <li key={o.id} className="text-[12px] font-semibold text-slate-700">{o.texto}</li>
                          ))}
                        </ul>
                      </div>
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
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      </>)}
      </ListaRolavel>
      {resultadosIA && (
        <InqueritoIaResultados
          aberto
          onFechar={() => setResultadosIA(null)}
          inquerito={resultadosIA}
          addAuditLog={addAuditLog}
          onEncerrado={(id) => setListaIA((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'encerrado' } : p)))}
        />
      )}
    </div>
  );
}
