// ============================================================================
// InqueritoIaResultados — popup «Resultados do Inquérito com IA» (Instituição)
// 2026-09-10, PROMPT_inquerito_ia v3 §4.5. ÚNICA vista dos dados extraídos:
// por campo do guião, barras horizontais com percentagens (só agregados —
// nunca respostas individuais); texto livre → 10 valores mais frequentes;
// «Exportar CSV» (agregados); «Encerrar inquérito» com CdaConfirmModal.
// 2026-09-11 — cada valor desdobra-se pelas especificações concretas que os
// cidadãos deram («Emprego — (1 Motorista), (3 Arquitecto)»), continuando a
// mostrar apenas contagens.
// Padrão único de popups do app: CdaModal.
// ============================================================================
import { useEffect, useMemo, useState } from 'react';
import { MessagesSquare, Download, Lock, Loader2, Users, CheckCircle2, XCircle, Send, PlayCircle } from 'lucide-react';
import { CdaModal } from '../ui/CdaModal';
import { CdaConfirmModal } from '../ui/CdaConfirm';
import {
  agregadosInqueritoIA, contadoresInqueritoIA, encerrarInqueritoIA,
  type AgregadoInqueritoIA, type ContadoresInqueritoIA, type InqueritoIA, type CampoGuiaoIA,
} from '../../services/inqueritoIaService';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  inquerito: InqueritoIA;
  /** Chamado após encerrar com sucesso (a lista actualiza o estado). */
  onEncerrado?: (id: number) => void;
  addAuditLog?: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
}

const CORES = ['#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#64748b', '#0c2340'];

/** Normaliza valores para agregação: números/distâncias reduzem-se ao valor
 *  numérico + unidade canónica («300 m», «300 metros», «300 M» ⇒ «300 m»);
 *  sim/não e escolhas ficam com capitalização uniforme. */
export const normalizarValorAgregado = (campo: CampoGuiaoIA | undefined, bruto: string): string => {
  const v = String(bruto || '').trim();
  if (!v) return v;
  const tipo = campo?.tipo;
  if (tipo === 'numero' || tipo === 'distancia') {
    const m = v.replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(quil[óo]metros?|metros?|minutos?|horas?|anos?|kwanzas?|kz|km|min|h|m)?\b/i);
    if (m) {
      const n = Number(m[1]);
      const u = (m[2] || '').toLowerCase();
      const unidade = /^(quil|km)/.test(u) ? 'km' : /^(met|m)$/.test(u) || u === 'm' ? 'm' : /^min/.test(u) ? 'min' : /^h/.test(u) ? 'h' : /^ano/.test(u) ? 'anos' : /^(kw|kz)/.test(u) ? 'Kz' : '';
      if (tipo === 'distancia' && unidade === 'km') return `${n * 1000} m`;
      if (tipo === 'distancia' && !unidade) return `${n} m`;
      return unidade ? `${n} ${unidade}` : String(n);
    }
  }
  const low = v.toLowerCase();
  if (tipo === 'sim_nao') {
    if (/^(sim|s)$/.test(low) || /^sim\b/.test(low)) return 'Sim';
    if (/^(n[ãa]o|n)$/.test(low) || /^n[ãa]o\b/.test(low)) return 'Não';
  }
  return v.charAt(0).toUpperCase() + v.slice(1);
};

export interface LinhaResultado { valor: string; total: number; detalhes: { valor: string; total: number }[] }

/** Texto do desdobramento de uma linha: «(1 Motorista), (3 Arquitecto)». */
export const textoDetalhes = (detalhes: { valor: string; total: number }[]): string =>
  detalhes.map((d) => `(${d.total} ${d.valor})`).join(', ');

/** Agrupa agregados por campo, normalizando e ordenando por total. Os
 *  detalhes (2026-09-11) de valores que se fundem após a normalização são
 *  somados por especificação. Exportado para os testes unitários. */
export const agruparPorCampo = (agr: AgregadoInqueritoIA[], guiao: InqueritoIA['guiao']) => {
  const porCampo = new Map<string, Map<string, { total: number; detalhes: Map<string, number> }>>();
  for (const a of agr) {
    const campo = guiao.campos.find((c) => c.chave === a.chave);
    const valor = normalizarValorAgregado(campo, a.valor);
    if (!valor) continue;
    if (!porCampo.has(a.chave)) porCampo.set(a.chave, new Map());
    const m = porCampo.get(a.chave)!;
    const linha = m.get(valor) || { total: 0, detalhes: new Map<string, number>() };
    linha.total += a.total;
    for (const d of a.detalhes || []) linha.detalhes.set(d.valor, (linha.detalhes.get(d.valor) || 0) + d.total);
    m.set(valor, linha);
  }
  // ordem do guião primeiro; chaves desconhecidas no fim
  const ordem = [...guiao.campos.map((c) => c.chave), ...[...porCampo.keys()].filter((k) => !guiao.campos.some((c) => c.chave === k))];
  return ordem.filter((k) => porCampo.has(k)).map((chave) => {
    const campo = guiao.campos.find((c) => c.chave === chave);
    const linhas: LinhaResultado[] = [...porCampo.get(chave)!.entries()]
      .map(([valor, l]) => ({
        valor, total: l.total,
        detalhes: [...l.detalhes.entries()].map(([v, t]) => ({ valor: v, total: t })).sort((a, b) => b.total - a.total || a.valor.localeCompare(b.valor)),
      }))
      .sort((a, b) => b.total - a.total);
    const total = linhas.reduce((s, l) => s + l.total, 0);
    const textoLivre = !campo || campo.tipo === 'texto_curto';
    return { chave, rotulo: campo?.rotulo || chave, tipo: campo?.tipo || 'texto_curto', total, linhas: textoLivre ? linhas.slice(0, 10) : linhas, truncado: textoLivre && linhas.length > 10 };
  });
};

const csvEscape = (s: string) => /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;

export function InqueritoIaResultados({ aberto, onFechar, inquerito, onEncerrado, addAuditLog }: Props) {
  const [agr, setAgr] = useState<AgregadoInqueritoIA[] | null>(null);
  const [cont, setCont] = useState<ContadoresInqueritoIA | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmarEncerrar, setConfirmarEncerrar] = useState(false);
  const [aEncerrar, setAEncerrar] = useState(false);
  const [status, setStatus] = useState(inquerito.status);

  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    setAgr(null); setCont(null); setErro(null); setStatus(inquerito.status);
    (async () => {
      const [a, c] = await Promise.all([agregadosInqueritoIA(inquerito.id), contadoresInqueritoIA(inquerito)]);
      if (!vivo) return;
      if (!a.ok) setErro(a.mensagem || 'Não foi possível carregar os resultados.');
      setAgr(a.ok ? a.dados || [] : []);
      setCont(c);
    })();
    return () => { vivo = false; };
  }, [aberto, inquerito]);

  const grupos = useMemo(() => (agr ? agruparPorCampo(agr, inquerito.guiao) : []), [agr, inquerito.guiao]);
  const concluidos = cont?.concluidos ?? 0;

  const exportarCsv = () => {
    const linhas = [['inquerito_id', 'campo', 'rotulo', 'valor', 'total', 'percentagem', 'detalhes']];
    for (const g of grupos) for (const l of g.linhas) {
      linhas.push([String(inquerito.id), g.chave, g.rotulo, l.valor, String(l.total), g.total ? `${Math.round((l.total / g.total) * 100)}%` : '0%', textoDetalhes(l.detalhes)]);
    }
    const csv = '\ufeff' + linhas.map((r) => r.map((c) => csvEscape(String(c))).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `inquerito-ia-${inquerito.id}-agregados.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    addAuditLog?.(`Agregados do inquérito com IA #${inquerito.id} exportados em CSV.`, 'info');
  };

  const encerrar = async () => {
    setConfirmarEncerrar(false); setAEncerrar(true);
    const r = await encerrarInqueritoIA(inquerito.id);
    setAEncerrar(false);
    if (!r.ok) { setErro(r.mensagem || 'Não foi possível encerrar o inquérito.'); return; }
    setStatus('encerrado');
    addAuditLog?.(`Inquérito com IA «${(inquerito.guiao?.objectivo || inquerito.o_que_pretende_saber).slice(0, 60)}» encerrado.`, 'info');
    onEncerrado?.(inquerito.id);
  };

  return (
    <>
      <CdaModal
        aberto={aberto}
        onFechar={onFechar}
        icone={MessagesSquare}
        titulo="Resultados do Inquérito com IA"
        subtitulo={inquerito.instituicao_nome}
        maxW="max-w-4xl"
      >
        <div className="space-y-5 text-left" data-testid="inquerito-ia-resultados">
          {/* Cabeçalho do inquérito */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 m-0">Objectivo</p>
            <p className="text-sm font-bold text-slate-800 m-0 mt-1 leading-snug">{inquerito.guiao?.objectivo || inquerito.o_que_pretende_saber}</p>
            <p className="text-[11px] font-medium text-slate-500 m-0 mt-1.5">
              {new Date(inquerito.created_at).toLocaleDateString('pt-PT')} · âmbito {inquerito.abrangencia === 'nacional' ? 'Nacional' : inquerito.abrangencia === 'regional' ? 'Regional' : 'Local'}
              {' · '}{inquerito.guiao?.campos?.length || 0} informações · até {inquerito.guiao?.maxPerguntas} perguntas
              {' · '}<span className={status === 'ativo' ? 'text-emerald-600 font-bold' : 'text-slate-500 font-bold'}>{status}</span>
              {inquerito.guiao_origem === 'template' && <span className="ml-1 text-amber-600 font-bold">· guião simplificado</span>}
            </p>
          </div>

          {/* Contadores */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="inquerito-ia-contadores">
            {[
              { r: 'Enviados', v: cont?.enviados, I: Send, cor: 'text-slate-600 bg-slate-50 border-slate-200' },
              { r: 'Iniciados', v: cont?.iniciados, I: PlayCircle, cor: 'text-blue-700 bg-blue-50 border-blue-100' },
              { r: 'Concluídos', v: cont?.concluidos, I: CheckCircle2, cor: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
              { r: 'Recusados', v: cont?.recusados, I: XCircle, cor: 'text-rose-700 bg-rose-50 border-rose-100' },
            ].map(({ r, v, I, cor }) => (
              <div key={r} className={`rounded-xl border px-4 py-3 ${cor}`}>
                <p className="text-[10px] font-black uppercase tracking-widest m-0 flex items-center gap-1.5 opacity-80"><I size={12} /> {r}</p>
                <p className="text-2xl font-black m-0 mt-0.5 leading-none">{v === undefined ? '…' : v}</p>
              </div>
            ))}
          </div>

          {/* Resultados por campo */}
          {agr === null ? (
            <p className="m-0 flex items-center gap-2 text-sm font-medium text-slate-500 py-6 justify-center"><Loader2 size={15} className="animate-spin" /> A carregar resultados…</p>
          ) : grupos.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center">
              <p className="text-sm font-semibold text-slate-500 m-0">{erro || 'Ainda não há respostas concluídas. Os resultados aparecem à medida que os cidadãos concluem a conversa.'}</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[48vh] overflow-y-auto pr-1">
              {grupos.map((g, gi) => (
                <div key={g.chave} className="rounded-xl border border-slate-200 bg-white px-4 py-3" data-testid="inquerito-ia-campo">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-[13px] font-bold text-slate-800 m-0">{g.rotulo}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 m-0 flex items-center gap-1"><Users size={11} /> {g.total} resposta(s)</p>
                  </div>
                  <div className="space-y-1.5">
                    {g.linhas.map((l, i) => {
                      const pct = g.total ? Math.round((l.total / g.total) * 100) : 0;
                      return (
                        <div key={l.valor} data-testid="inquerito-ia-valor">
                          <div className="flex items-center gap-3">
                            <span className="w-36 sm:w-44 shrink-0 text-[12px] font-semibold text-slate-700 truncate" title={l.valor}>{l.valor}</span>
                            <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 2)}%`, background: CORES[(gi + i) % CORES.length] }} />
                            </div>
                            <span className="w-16 shrink-0 text-right text-[11px] font-black text-slate-700 tabular-nums">{pct}% <span className="text-slate-400 font-semibold">({l.total})</span></span>
                          </div>
                          {/* 2026-09-11 — desdobramento pelas especificações dadas pelos cidadãos
                              («Emprego — (1 Motorista), (3 Arquitecto)»). Só contagens, nunca quem. */}
                          {l.detalhes.length > 0 && (
                            <p className="m-0 mt-0.5 pl-1 text-[11px] font-medium text-slate-500 leading-snug" data-testid="inquerito-ia-detalhes">
                              <span className="text-slate-400">↳ </span>{textoDetalhes(l.detalhes)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {g.truncado && <p className="text-[10px] font-medium text-slate-400 m-0 mt-1.5">Mostram-se os 10 valores mais frequentes.</p>}
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] font-medium text-slate-400 m-0 flex items-center gap-1.5">
            <Lock size={11} /> Resultados agregados de {concluidos} participação(ões) concluída(s). As respostas individuais são anónimas e nunca são apresentadas.
          </p>

          {erro && grupos.length > 0 && <p className="text-[11px] font-semibold text-rose-600 m-0">{erro}</p>}

          {/* Rodapé */}
          <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
            <div>
              {status === 'ativo' && (
                <button
                  type="button"
                  onClick={() => setConfirmarEncerrar(true)}
                  disabled={aEncerrar}
                  className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-[10px] font-black uppercase tracking-widest bg-transparent cursor-pointer disabled:opacity-60"
                  id="btn-encerrar-inquerito-ia"
                >
                  {aEncerrar ? 'A encerrar…' : 'Encerrar inquérito'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={exportarCsv}
                disabled={grupos.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-100 bg-white border border-slate-200 cursor-pointer disabled:opacity-50"
                id="btn-exportar-csv-inquerito-ia"
              >
                <Download size={14} /> Exportar CSV
              </button>
              <button
                type="button"
                onClick={onFechar}
                className="px-5 py-2.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-widest border-0 cursor-pointer shadow"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </CdaModal>

      <CdaConfirmModal
        aberto={confirmarEncerrar}
        titulo="Encerrar Inquérito"
        mensagem="Encerrar este inquérito? Os cidadãos deixam de poder participar e os resultados ficam apenas em consulta. Esta acção não pode ser anulada."
        textoConfirmar="Encerrar"
        perigoso
        onConfirmar={encerrar}
        onCancelar={() => setConfirmarEncerrar(false)}
      />
    </>
  );
}
