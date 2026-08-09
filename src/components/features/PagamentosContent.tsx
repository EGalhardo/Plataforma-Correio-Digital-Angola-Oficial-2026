/**
 * Pagamentos — lado do CIDADÃO (frontend-only — decisão do dono)
 * ----------------------------------------------------------------------------
 * Lista as cobranças registadas pelas instituições na tabela public.pagamentos
 * (v26) e apresenta os métodos como PREVISTOS. Desde a v29 (nova decisão do
 * dono, 2026-08-09) o cidadão pode percorrer o fluxo completo de SIMULAÇÃO de
 * pagamento: escolher método → confirmar → registo real na mesma tabela como
 * 'paga_simulada' → comprovativo. Cada passo está rotulado como SIMULAÇÃO e
 * o comprovativo só aparece depois do registo ter mesmo ficado gravado —
 * se a migração v29 não estiver aplicada, o ecrã diz que a simulação não
 * ficou registada. Coerente com a regra da plataforma: nada de fingimentos.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, Banknote, CalendarClock, CreditCard, FileText, Info,
  Loader2, RefreshCw, Wallet, AlertTriangle, XCircle, CheckCircle2,
  Download, FlaskConical,
} from 'lucide-react';
import {
  FRASE_GATEWAY_PENDENTE, METODOS_PAGAMENTO, MetodoPagamento, Pagamento,
  carregarPagamentosDoCidadao, documentoRefCombina, formatarKz,
  gerarReferenciaSimulada, marcarPagamentoSimulado,
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

const ChipEstado = ({ estado }: { estado: Pagamento['estado'] }) => {
  if (estado === 'paga_simulada') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-[10px] font-black uppercase tracking-wider px-2 py-0.5">
        <FlaskConical className="w-3 h-3" /> Paga (simulação)
      </span>
    );
  }
  return estado === 'pendente' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black uppercase tracking-wider px-2 py-0.5">
      Por pagar
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider px-2 py-0.5">
      <XCircle className="w-3 h-3" /> Cancelada
    </span>
  );
};

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
// Modal do fluxo completo de SIMULAÇÃO (v29)
// ---------------------------------------------------------------------------

type PassoSim = 'metodo' | 'confirmar' | 'a_registar' | 'comprovativo' | 'falha';

interface SimulacaoModalProps {
  pagamento: Pagamento;
  onFechar: () => void;
  onSucesso: () => void;
}

const SeloSimulacao = () => (
  <div className="flex items-center gap-2 rounded-xl bg-violet-600 text-white px-3 py-2" data-testid="selo-modo-simulacao">
    <FlaskConical className="w-4 h-4 shrink-0" />
    <p className="text-[10px] font-black uppercase tracking-widest m-0 leading-tight">
      MODO SIMULAÇÃO — nenhum valor real é cobrado
    </p>
  </div>
);

function SimulacaoPagamentoModal({ pagamento, onFechar, onSucesso }: SimulacaoModalProps) {
  const [passo, setPasso] = useState<PassoSim>('metodo');
  const [metodo, setMetodo] = useState<MetodoPagamento | null>(null);
  const [erro, setErro] = useState('');
  const refSimulada = gerarReferenciaSimulada(pagamento.id);
  const metodoInfo = metodo ? METODOS_PAGAMENTO.find(m => m.id === metodo) : null;

  const registar = async () => {
    if (!metodo) return;
    setPasso('a_registar');
    setErro('');
    const r = await marcarPagamentoSimulado(pagamento.id, metodo);
    if (r.ok) {
      setPasso('comprovativo');
    } else {
      setErro(r.erro);
      setPasso('falha');
    }
  };

  const descarregarComprovativo = () => {
    const linhas = [
      '========================================================',
      '  COMPROVATIVO DE PAGAMENTO *** S I M U L A D O ***',
      '  Correio Digital de Angola — nenhum valor real foi cobrado',
      '========================================================',
      `Instituição:   ${pagamento.instituicao_sigla}`,
      `Descrição:     ${pagamento.descricao}`,
      `Valor:         ${formatarKz(pagamento.valor)} (SIMULADO)`,
      `Método:        ${metodoInfo?.rotulo || metodo} (previsto/simulado)`,
      `Referência:    ${refSimulada}`,
      `Data simulada: ${new Date().toLocaleString('pt-AO')}`,
      '--------------------------------------------------------',
      'Este comprovativo NÃO tem valor fiscal nem bancário.',
      'Serve apenas para testar o fluxo, enquanto o gateway',
      'real (previsto após validação INAPEM) não estiver ativo.',
    ].join('\n');
    const url = URL.createObjectURL(new Blob([linhas], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprovativo-simulado-${refSimulada}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#0c2340]/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Simulação de pagamento">
      <div className="bg-white rounded-[24px] border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="p-4 space-y-3 border-b border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <SeloSimulacao />
            <button onClick={onFechar} className="text-slate-400 hover:text-slate-700 text-lg font-bold leading-none px-2" aria-label="Fechar">×</button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {passo === 'metodo' && (
            <>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 m-0">{pagamento.instituicao_sigla}</p>
                <h3 className="text-base font-black text-slate-900 m-0 mt-0.5">{pagamento.descricao}</h3>
                <p className="text-2xl font-black text-[#0c2340] m-0 mt-1">{formatarKz(pagamento.valor)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Como pretende simular o pagamento?</p>
                <div className="space-y-2">
                  {pagamento.metodos.map(id => {
                    const m = METODOS_PAGAMENTO.find(mm => mm.id === id);
                    if (!m) return null;
                    const activo = metodo === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setMetodo(id)}
                        className={`w-full text-left flex items-center gap-3 rounded-xl border p-3 transition-all ${activo ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        <CreditCard className={`w-4 h-4 shrink-0 ${activo ? 'text-violet-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold text-slate-700">
                          {m.rotulo} <em className="not-italic text-slate-400">(previsto)</em>
                        </span>
                        {activo && <CheckCircle2 className="w-4 h-4 text-violet-600 ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={() => setPasso('confirmar')}
                disabled={!metodo}
                className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-black uppercase tracking-widest py-3 transition-colors"
              >
                Continuar (simulação)
              </button>
            </>
          )}

          {passo === 'confirmar' && metodoInfo && (
            <>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 m-0">Confirme os dados simulados</p>
                <div className="text-xs space-y-1.5">
                  <p className="m-0 flex justify-between"><span className="text-slate-500 font-semibold">Entidade</span><span className="font-bold text-slate-700">00000 (simulada)</span></p>
                  <p className="m-0 flex justify-between"><span className="text-slate-500 font-semibold">Referência</span><span className="font-bold text-slate-700 font-mono">{refSimulada}</span></p>
                  <p className="m-0 flex justify-between"><span className="text-slate-500 font-semibold">Método</span><span className="font-bold text-slate-700">{metodoInfo.rotulo}</span></p>
                  <p className="m-0 flex justify-between"><span className="text-slate-500 font-semibold">Valor</span><span className="font-black text-[#0c2340]">{formatarKz(pagamento.valor)}</span></p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed m-0 text-left">
                Ao confirmar, a cobrança fica registada na plataforma como <strong>paga em simulação</strong>. Como não há gateway ligado, nenhum dinheiro se move — serve para testar o fluxo completo.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPasso('metodo')}
                  className="flex-1 rounded-xl border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest py-3 hover:bg-slate-50 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={() => void registar()}
                  className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black uppercase tracking-widest py-3 transition-colors"
                >
                  Confirmar simulação
                </button>
              </div>
            </>
          )}

          {passo === 'a_registar' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
              <p className="text-xs font-bold text-slate-600 m-0">A simular o pagamento junto da plataforma…</p>
            </div>
          )}

          {passo === 'comprovativo' && (
            <>
              <div className="flex flex-col items-center text-center gap-2 py-2">
                <CheckCircle2 className="w-10 h-10 text-violet-600" />
                <h3 className="text-base font-black text-slate-900 m-0">Pagamento simulado registado</h3>
                <p className="text-[11px] text-slate-500 font-semibold m-0 leading-relaxed">
                  A cobrança passou ao estado «paga (simulação)». Nenhum valor real foi cobrado.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-left text-xs space-y-1.5">
                <p className="m-0 flex justify-between"><span className="text-slate-500 font-semibold">Referência</span><span className="font-bold text-slate-700 font-mono">{refSimulada}</span></p>
                <p className="m-0 flex justify-between"><span className="text-slate-500 font-semibold">Método</span><span className="font-bold text-slate-700">{metodoInfo?.rotulo}</span></p>
                <p className="m-0 flex justify-between"><span className="text-slate-500 font-semibold">Valor</span><span className="font-black text-[#0c2340]">{formatarKz(pagamento.valor)} (SIMULADO)</span></p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={descarregarComprovativo}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-200 text-violet-700 text-xs font-black uppercase tracking-widest py-3 hover:bg-violet-50 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Comprovativo (TXT)
                </button>
                <button
                  onClick={onSucesso}
                  className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black uppercase tracking-widest py-3 transition-colors"
                >
                  Concluir
                </button>
              </div>
            </>
          )}

          {passo === 'falha' && (
            <>
              <div className="flex flex-col items-center text-center gap-2 py-2">
                <XCircle className="w-10 h-10 text-rose-500" />
                <h3 className="text-base font-black text-slate-900 m-0">A simulação não ficou registada</h3>
                <p className="text-[11px] text-rose-600 font-semibold m-0 leading-relaxed">{erro}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onFechar}
                  className="flex-1 rounded-xl border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest py-3 hover:bg-slate-50 transition-colors"
                >
                  Fechar
                </button>
                <button
                  onClick={() => setPasso('confirmar')}
                  className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black uppercase tracking-widest py-3 transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página «Pagamentos» do cidadão
// ---------------------------------------------------------------------------

export interface PagamentosContentProps {
  citizenBi: string;
  setTab: (tab: string) => void;
}

type FiltroEstado = 'todas' | 'pendente' | 'paga_simulada' | 'cancelado';

export function PagamentosContent({ citizenBi, setTab }: PagamentosContentProps) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [selecionado, setSelecionado] = useState<Pagamento | null>(null);
  const [aSimular, setASimular] = useState<Pagamento | null>(null);
  const [filtro, setFiltro] = useState<FiltroEstado>('todas');

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
  const visiveis = filtro === 'todas' ? pagamentos : pagamentos.filter(p => p.estado === filtro);

  const concluirSimulacao = () => {
    setASimular(null);
    setSelecionado(null);
    void carregar();
  };

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

          {selecionado.estado === 'pendente' && (
            <div className="space-y-3">
              <button
                onClick={() => setASimular(selecionado)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black uppercase tracking-widest py-3.5 transition-colors"
              >
                <FlaskConical className="w-4 h-4" /> Simular pagamento
              </button>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed m-0">
                Percorre o fluxo completo de pagamento em modo simulação: nenhum valor real é cobrado e a cobrança fica marcada como «paga (simulação)».
              </p>
            </div>
          )}

          {selecionado.estado === 'paga_simulada' && (
            <div className="rounded-xl bg-violet-50 border border-violet-200 p-4 space-y-1.5 text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-700 m-0 inline-flex items-center gap-1">
                <FlaskConical className="w-3 h-3" /> Pagamento simulado
              </p>
              <p className="text-xs text-violet-900 font-semibold m-0">
                Referência {gerarReferenciaSimulada(selecionado.id)}
                {selecionado.metodo_simulado ? ` · ${METODOS_PAGAMENTO.find(m => m.id === selecionado.metodo_simulado)?.rotulo || selecionado.metodo_simulado}` : ''}
              </p>
              {selecionado.pago_em && (
                <p className="text-[10px] text-violet-700 font-semibold m-0">Simulado em {new Date(selecionado.pago_em).toLocaleString('pt-AO')}</p>
              )}
              <p className="text-[10px] text-violet-600 font-semibold m-0">Nenhum valor real foi cobrado — o gateway só será ligado após validação INAPEM.</p>
            </div>
          )}

          <SeloGateway />
        </div>

        {aSimular && (
          <SimulacaoPagamentoModal
            pagamento={aSimular}
            onFechar={() => setASimular(null)}
            onSucesso={concluirSimulacao}
          />
        )}
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

      {!carregando && !erro && pagamentos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {([
            ['todas', 'Todas'],
            ['pendente', 'Por pagar'],
            ['paga_simulada', 'Pagas (simulação)'],
            ['cancelado', 'Canceladas'],
          ] as [FiltroEstado, string][]).map(([id, rotulo]) => (
            <button
              key={id}
              onClick={() => setFiltro(id)}
              className={`rounded-full text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border transition-colors ${filtro === id ? 'bg-[#0c2340] text-white border-[#0c2340]' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
            >
              {rotulo}
            </button>
          ))}
        </div>
      )}

      {!carregando && !erro && pendentes.length > 0 && (
        <p className="text-xs font-black text-slate-500 m-0 uppercase tracking-widest">
          {pendentes.length} por pagar — total {formatarKz(totalPendente)}
        </p>
      )}

      {!carregando && !erro && (
        <ul className="space-y-3">
          {visiveis.map(p => (
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

      {aSimular && (
        <SimulacaoPagamentoModal
          pagamento={aSimular}
          onFechar={() => setASimular(null)}
          onSucesso={concluirSimulacao}
        />
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
  onAbrirPagamentos?: () => void;
}

export function PagamentosInlineCidadao({ citizenBi, assuntoDocumento, onAbrirPagamentos }: PagamentosInlineCidadaoProps) {
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
      {onAbrirPagamentos && pendenteTotal > 0 && (
        <button
          onClick={onAbrirPagamentos}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-black uppercase tracking-widest py-2.5 transition-colors"
        >
          <FlaskConical className="w-3.5 h-3.5" /> Pagar (simulação) na página Pagamentos
        </button>
      )}
      <SeloGateway />
    </div>
  );
}

export default PagamentosContent;
