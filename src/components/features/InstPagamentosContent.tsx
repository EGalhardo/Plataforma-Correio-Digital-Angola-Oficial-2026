/**
 * Pagamentos — lado da INSTITUIÇÃO (frontend-only, 2026-08-08 — decisão do dono)
 * ----------------------------------------------------------------------------
 * Regista cobranças na tabela public.pagamentos (v26): valor, referência,
 * prazo e os métodos que a instituição PREVÊ aceitar. Honestidade por desenho:
 * aqui não se processa dinheiro — a integração com o gateway (EMIS/Multicaixa/
 * bancos) fica para depois da validação do projecto pelo INAPEM. O estado de
 * uma cobrança é «pendente» ou «cancelada»; «pago» só existirá com o gateway.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, Banknote, CheckCircle2, CreditCard, Info, Loader2,
  Plus, RefreshCw, Save, Trash2,
} from 'lucide-react';
import {
  FRASE_GATEWAY_PENDENTE, MAX_DESCRICAO, METODOS_PAGAMENTO, MIN_DESCRICAO,
  MetodoPagamento, Pagamento, cancelarPagamento, carregarPagamentosDaInstituicao,
  criarPagamento, formatarKz, limparBi, normalizarValorAoa,
} from '../../services/pagamentosService';

export interface InstPagamentosContentProps {
  institutionCode?: string;
  profileName?: string;
  addAuditLog?: (action: string, detalhe?: string) => void;
  setTab?: (tab: string) => void;
}

interface FormState {
  destinatario_bi: string;
  descricao: string;
  valor: string;
  referencia: string;
  documento_ref: string;
  prazo: string;
  metodos: MetodoPagamento[];
}

const FORM_VAZIO: FormState = {
  destinatario_bi: '',
  descricao: '',
  valor: '',
  referencia: '',
  documento_ref: '',
  prazo: '',
  metodos: METODOS_PAGAMENTO.map(m => m.id),
};

export function InstPagamentosContent({ institutionCode = '', addAuditLog }: InstPagamentosContentProps) {
  const sigla = institutionCode.trim().toUpperCase();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);

  const carregar = useCallback(async () => {
    if (!sigla) { setCarregando(false); return; }
    setCarregando(true);
    const r = await carregarPagamentosDaInstituicao(sigla);
    setPagamentos(r.pagamentos);
    if (r.erro) setErro(prev => prev || r.erro);
    setCarregando(false);
  }, [sigla]);

  useEffect(() => { void carregar(); }, [carregar]);

  const alternarMetodo = (id: MetodoPagamento) => {
    setForm(f => ({
      ...f,
      metodos: f.metodos.includes(id) ? f.metodos.filter(m => m !== id) : [...f.metodos, id],
    }));
  };

  const problemas = (): string => {
    if (!sigla) return 'Sigla da instituição em falta — sem ela a RLS não deixa registar.';
    if (limparBi(form.destinatario_bi).length < 5) return 'Indique o BI do cidadão destinatário.';
    const d = form.descricao.trim();
    if (d.length < MIN_DESCRICAO || d.length > MAX_DESCRICAO) return `A descrição tem de ter entre ${MIN_DESCRICAO} e ${MAX_DESCRICAO} caracteres.`;
    if (normalizarValorAoa(form.valor) === null) return 'Valor inválido — use por exemplo «12500» ou «12 500,50».';
    if (form.metodos.length === 0) return 'Escolha pelo menos um método previsto.';
    return '';
  };

  const guardar = async () => {
    const problema = problemas();
    if (problema) { setErro(problema); return; }
    setSalvando(true);
    setErro('');
    setOkMsg('');
    const r = await criarPagamento(sigla, {
      destinatario_bi: form.destinatario_bi,
      descricao: form.descricao,
      valor: normalizarValorAoa(form.valor) as number,
      metodos: form.metodos,
      referencia: form.referencia || undefined,
      documento_ref: form.documento_ref || undefined,
      prazo: form.prazo || undefined,
    });
    setSalvando(false);
    if (!r.ok) { setErro(r.erro); return; }
    setOkMsg(`Cobrança de ${formatarKz(normalizarValorAoa(form.valor) as number)} registada para o BI ${limparBi(form.destinatario_bi)}. O cidadão já a vê na área «Pagamentos».`);
    addAuditLog?.('pagamento_criado', `${sigla} registou cobrança pendente (valor oculto no log)`);
    setForm(FORM_VAZIO);
    setMostrarForm(false);
    await carregar();
  };

  const cancelar = async (p: Pagamento) => {
    setErro('');
    const r = await cancelarPagamento(p.id);
    if (!r.ok) { setErro(r.erro); return; }
    addAuditLog?.('pagamento_cancelado', `${sigla} cancelou cobrança ${p.id.slice(0, 8)}…`);
    await carregar();
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto w-full pb-10 animate-fade-in" id="inst-pagamentos-root">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-black text-slate-900 m-0 inline-flex items-center gap-2">
            <Banknote className="w-5 h-5 text-[#0c2340]" /> Pagamentos — cobranças {sigla && <span className="text-slate-400">({sigla})</span>}
          </h1>
          <p className="text-[11px] text-slate-500 font-semibold m-0 mt-0.5">
            Registe taxas, faturas e outras cobranças; o cidadão vê-as na área «Pagamentos» dele.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void carregar()}
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} /> Atualizar
          </button>
          <button
            onClick={() => { setMostrarForm(v => !v); setErro(''); setOkMsg(''); }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0c2340] text-white text-[11px] font-black uppercase tracking-widest px-3 py-2 hover:bg-[#14365f] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nova cobrança
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-900 font-semibold leading-relaxed m-0">
          <strong className="font-black uppercase tracking-wide mr-1">Sem gateway por agora.</strong>
          {FRASE_GATEWAY_PENDENTE} O registo aqui é apenas informativo — não movimenta dinheiro.
        </p>
      </div>

      {okMsg && (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-emerald-800 m-0">{okMsg}</p>
        </div>
      )}
      {erro && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-rose-800 m-0">{erro}</p>
        </div>
      )}

      {mostrarForm && (
        <div className="bg-white border border-slate-200 rounded-[24px] p-5 space-y-4">
          <h2 className="text-sm font-black text-slate-800 m-0 uppercase tracking-wide">Nova cobrança</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">BI do cidadão destinatário *</span>
              <input
                value={form.destinatario_bi}
                onChange={e => setForm(f => ({ ...f, destinatario_bi: e.target.value }))}
                placeholder="Ex.: 006123456LA042"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0c2340]/30"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor (AOA) *</span>
              <input
                value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                placeholder="Ex.: 12 500,00"
                inputMode="decimal"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0c2340]/30"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Descrição * ({form.descricao.trim().length}/{MAX_DESCRICAO} — mín. {MIN_DESCRICAO})
            </span>
            <input
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Ex.: Taxa de emissão de certidão comercial — 2.ª via"
              maxLength={MAX_DESCRICAO + 20}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0c2340]/30"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Referência interna</span>
              <input
                value={form.referencia}
                onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))}
                placeholder="Ex.: FAT-2026/0187"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0c2340]/30"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Documento associado</span>
              <input
                value={form.documento_ref}
                onChange={e => setForm(f => ({ ...f, documento_ref: e.target.value }))}
                placeholder="Assunto/protocolo do documento"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0c2340]/30"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prazo</span>
              <input
                type="date"
                value={form.prazo}
                onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0c2340]/30"
              />
            </label>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Métodos que a instituição prevê aceitar *</p>
            <div className="flex flex-wrap gap-2">
              {METODOS_PAGAMENTO.map(m => {
                const ativo = form.metodos.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => alternarMetodo(m.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold transition-colors ${
                      ativo
                        ? 'border-[#0c2340] bg-[#0c2340] text-white'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" /> {m.rotulo}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => void guardar()}
              disabled={salvando}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest px-4 py-2.5 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Registar cobrança
            </button>
            <button
              onClick={() => setMostrarForm(false)}
              className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {carregando && (
        <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-sm font-semibold">
          <Loader2 className="w-4 h-4 animate-spin" /> A carregar as cobranças registadas…
        </div>
      )}

      {!carregando && pagamentos.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
          <Banknote className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-black text-slate-600 m-0">Ainda não registou cobranças</p>
          <p className="text-[11px] text-slate-400 font-semibold m-0 mt-1">
            Use «Nova cobrança» para registar a primeira — o cidadão passa a vê-la de imediato.
          </p>
        </div>
      )}

      {!carregando && pagamentos.length > 0 && (
        <ul className="space-y-3">
          {pagamentos.map(p => (
            <li key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 m-0">
                  BI {p.destinatario_bi}{p.referencia ? ` · ref. ${p.referencia}` : ''}{p.prazo ? ` · prazo ${p.prazo}` : ''}
                </p>
                <p className="text-sm font-bold text-slate-800 m-0 mt-0.5">{p.descricao}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-base font-black text-[#0c2340]">{formatarKz(p.valor)}</span>
                {p.estado === 'pendente' ? (
                  <>
                    <span className="rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black uppercase tracking-wider px-2 py-0.5">Pendente</span>
                    <button
                      onClick={() => void cancelar(p)}
                      className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-700 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Cancelar
                    </button>
                  </>
                ) : (
                  <span className="rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider px-2 py-0.5">Cancelada</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default InstPagamentosContent;
