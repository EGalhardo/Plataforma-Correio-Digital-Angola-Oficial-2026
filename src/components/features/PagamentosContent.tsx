/**
 * Pagamentos — lado do CIDADÃO (frontend-only, 2026-08-08 — decisão do dono)
 * ----------------------------------------------------------------------------
 * Lista as cobranças registadas pelas instituições na tabela public.pagamentos
 * (v26) e apresenta os métodos como PREVISTOS. O botão de pagamento explica o
 * estado (gateway só após validação pelo INAPEM) em vez de simular um checkout
 * — coerente com a regra da plataforma: nada de simulações que finjam funcionar.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, Banknote, CalendarClock, CreditCard, FileText, Info,
  Loader2, RefreshCw, Wallet, AlertTriangle, XCircle,
} from 'lucide-react';
import {
  FRASE_GATEWAY_PENDENTE, METODOS_PAGAMENTO, Pagamento, carregarPagamentosDoCidadao,
  documentoRefCombina, formatarKz,
} from '../../services/pagamentosService';

// ---------------------------------------------------------------------------
// Blocos partilhados
// ---------------------------------------------------------------------------

const SeloGateway = () => (
  <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3" data-testid="selo-gateway-pendente">
    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
    <p className="text-[11px] text-amber-900 font-semibold leading-relaxed m-0">
      <strong className="font-black uppercase tracking-wide mr-1">Gateway previsto após validação INAPEM.</strong>
      {FRASE_GATEWAY_PENDENTE}
    </p>
  </div>
);

const ChipEstado = ({ estado }: { estado: Pagamento['estado'] }) => (
  estado === 'pendente' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black uppercase tracking-wider px-2 py-0.5">
      Por pagar
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider px-2 py-0.5">
      <XCircle className="w-3 h-3" /> Cancelada
    </span>
  )
);

const MetodosPrevistos = ({ metodos }: { metodos: Pagamento['metodos'] }) => (
  <div className="flex flex-wrap gap-1.5">
    {metodos.map(id => {
      const m = METODOS_PAGAMENTO.find(mm => mm.id === id);
      if (!m) return null;
      return (
        <span key={id} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-[10px] font-bold px-2 py-1">
          <CreditCard className="w-3 h-3 text-slate-400" />
          {m.rotulo} <em className="not-italic text-slate-400">(previsto)</em>
        </span>
      );
    })}
  </div>
);

// ---------------------------------------------------------------------------
// Página «Pagamentos» do cidadão
// ---------------------------------------------------------------------------

export interface PagamentosContentProps {
  citizenBi: string;
  setTab: (tab: string) => void;
}

export function PagamentosContent({ citizenBi, setTab }: PagamentosContentProps) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [selecionado, setSelecionado] = useState<Pagamento | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    const r = await carregarPagamentosDoCidadao(citizenBi);
    setPagamentos(r.pagamentos);
    setErro(r.erro);
    setCarregando(false);
  }, [citizenBi]);

  useEffect(() => { void carregar(); }, [carregar]);

  const pendentes = pagamentos.filter(p => p.estado === 'pendente');
  const totalPendente = pendentes.reduce((acc, p) => acc + p.valor, 0);

  if (selecionado) {
    return (
      <div className="space-y-5 max-w-3xl mx-auto w-full pb-10 animate-fade-in">
        <button
          onClick={() => setSelecionado(null)}
          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar às cobranças
        </button>

        <div className="bg-white border border-slate-200 rounded-[24px] p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 m-0">{selecionado.instituicao_sigla}</p>
              <h2 className="text-lg font-black text-slate-900 m-0 mt-1">{selecionado.descricao}</h2>
            </div>
            <ChipEstado estado={selecionado.estado} />
          </div>

          <p className="text-3xl font-black text-[#0c2340] m-0">{formatarKz(selecionado.valor)}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {selecionado.referencia && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 m-0">Referência da instituição</p>
                <p className="font-bold text-slate-700 m-0 mt-1">{selecionado.referencia}</p>
              </div>
            )}
            {selecionado.documento_ref && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 m-0 inline-flex items-center gap-1"><FileText className="w-3 h-3" /> Documento associado</p>
                <p className="font-bold text-slate-700 m-0 mt-1">{selecionado.documento_ref}</p>
              </div>
            )}
            {selecionado.prazo && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 m-0 inline-flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Prazo</p>
                <p className="font-bold text-slate-700 m-0 mt-1">{selecionado.prazo}</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Métodos que a instituição prevê aceitar</p>
            <MetodosPrevistos metodos={selecionado.metodos} />
          </div>

          <SeloGateway />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto w-full pb-10 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTab('home')}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 m-0 inline-flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#0c2340]" /> Pagamentos
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold m-0">Cobranças registadas pelas instituições no seu nome</p>
          </div>
        </div>
        <button
          onClick={() => void carregar()}
          className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      <SeloGateway />

      {carregando && (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-400 text-sm font-semibold">
          <Loader2 className="w-4 h-4 animate-spin" /> A carregar as suas cobranças…
        </div>
      )}

      {!carregando && erro && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-rose-800 m-0">Não consegui carregar as cobranças.</p>
            <p className="text-[11px] text-rose-700 m-0 mt-1">{erro}</p>
          </div>
        </div>
      )}

      {!carregando && !erro && pagamentos.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
          <Banknote className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-black text-slate-600 m-0">Nenhuma cobrança no seu nome</p>
          <p className="text-[11px] text-slate-400 font-semibold m-0 mt-1">
            Quando uma instituição registar uma cobrança para si (taxa, fatura, multa), aparece aqui.
          </p>
        </div>
      )}

      {!carregando && !erro && pendentes.length > 0 && (
        <p className="text-xs font-black text-slate-500 m-0 uppercase tracking-widest">
          {pendentes.length} por pagar — total {formatarKz(totalPendente)}
        </p>
      )}

      {!carregando && !erro && (
        <ul className="space-y-3">
          {pagamentos.map(p => (
            <li key={p.id}>
              <button
                onClick={() => setSelecionado(p)}
                className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 m-0">{p.instituicao_sigla}</p>
                  <p className="text-sm font-bold text-slate-800 m-0 mt-0.5 truncate">{p.descricao}</p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <p className="text-base font-black text-[#0c2340] m-0">{formatarKz(p.valor)}</p>
                  <ChipEstado estado={p.estado} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel inline — cobranças ligadas ao documento que o cidadão está a ler
// ---------------------------------------------------------------------------

export interface PagamentosInlineCidadaoProps {
  citizenBi: string;
  assuntoDocumento: string;
}

export function PagamentosInlineCidadao({ citizenBi, assuntoDocumento }: PagamentosInlineCidadaoProps) {
  const [relacionados, setRelacionados] = useState<Pagamento[]>([]);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      if (!citizenBi.trim() || !assuntoDocumento.trim()) return;
      const r = await carregarPagamentosDoCidadao(citizenBi);
      if (!vivo || r.erro) return;
      setRelacionados(r.pagamentos.filter(p => documentoRefCombina(p.documento_ref, assuntoDocumento)));
    })();
    return () => { vivo = false; };
  }, [citizenBi, assuntoDocumento]);

  if (relacionados.length === 0) return null;
  const pendenteTotal = relacionados.filter(p => p.estado === 'pendente').reduce((a, p) => a + p.valor, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-[24px] p-5 space-y-3 max-w-5xl mx-auto" data-testid="pagamentos-inline-documento">
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 m-0 inline-flex items-center gap-2">
        <Banknote className="w-4 h-4 text-[#0c2340]" /> Cobrança associada a este documento
      </h3>
      <ul className="space-y-2">
        {relacionados.map(p => (
          <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
            <span className="text-xs font-bold text-slate-700 truncate">{p.descricao}</span>
            <span className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-black text-[#0c2340]">{formatarKz(p.valor)}</span>
              <ChipEstado estado={p.estado} />
            </span>
          </li>
        ))}
      </ul>
      {pendenteTotal > 0 && (
        <p className="text-[11px] font-black text-slate-600 m-0">Total por pagar: {formatarKz(pendenteTotal)}</p>
      )}
      <SeloGateway />
    </div>
  );
}

export default PagamentosContent;
