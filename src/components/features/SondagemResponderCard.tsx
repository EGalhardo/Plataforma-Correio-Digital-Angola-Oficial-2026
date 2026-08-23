// ============================================================================
// SondagemResponderCard — área Cidadão (v36.1, spec §4)
// Cartão da sondagem dentro do detalhe da mensagem + botão «Responder à
// Sondagem» que confirma o preenchimento. 1 voto por cidadão; re-votável
// enquanto ativa (upsert). Validação com popup CdaModal (spec §4.3).
// ============================================================================
import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, Send } from 'lucide-react';
import { CdaModal } from '../ui/CdaModal';
import {
  buscarSondagem, minhaResposta, responderSondagem, type Sondagem,
} from '../../services/sondagemService';

interface Props {
  sondagemId: number;
  cidadaoBi: string;
  addAuditLog?: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
}

export function SondagemResponderCard({ sondagemId, cidadaoBi, addAuditLog }: Props) {
  const [sondagem, setSondagem] = useState<Sondagem | null>(null);
  const [escolhas, setEscolhas] = useState<string[]>([]);
  const [estado, setEstado] = useState<'a_carregar' | 'pronto' | 'indisponivel'>('a_carregar');
  const [enviando, setEnviando] = useState(false);
  const [registada, setRegistada] = useState(false);
  const [alerta, setAlerta] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await buscarSondagem(sondagemId);
      if (!r.ok || !r.dados) { setEstado('indisponivel'); return; }
      setSondagem(r.dados);
      const m = await minhaResposta(sondagemId, cidadaoBi);
      if (m.ok && m.dados && m.dados.length) { setEscolhas(m.dados); setRegistada(true); }
      setEstado('pronto');
    })();
  }, [sondagemId, cidadaoBi]);

  if (estado === 'indisponivel') return null;
  if (estado === 'a_carregar' || !sondagem) {
    return (
      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
        <p className="text-[12px] font-semibold text-slate-500">A carregar sondagem…</p>
      </div>
    );
  }

  const fechada = sondagem.status === 'encerrada';

  const alternar = (id: string) => {
    if (fechada) return;
    setEscolhas(prev => {
      if (sondagem.permitir_varias) return prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      return [id];
    });
    setRegistada(false);
  };

  const responder = async () => {
    if (fechada) { setAlerta('Esta sondagem já foi encerrada pela instituição.'); return; }
    if (escolhas.length === 0) {
      setAlerta('Na sua sondagem está a faltar preencher alguns campos: seleccione pelo menos uma opção.');
      return;
    }
    setEnviando(true);
    const r = await responderSondagem(sondagemId, cidadaoBi, escolhas);
    setEnviando(false);
    if (!r.ok) { setAlerta(r.mensagem || 'Não foi possível registar a resposta.'); return; }
    setRegistada(true);
    addAuditLog?.(`Cidadão respondeu à sondagem «${sondagem.pergunta.slice(0, 60)}».`, 'info');
  };

  return (
    <div className="mt-8 rounded-2xl border border-indigo-100 bg-white shadow-sm overflow-hidden" data-testid="sondagem-card">
      <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100 flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0"><BarChart3 size={16} /></span>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-500">Sondagem · {sondagem.instituicao_nome}</p>
          <p className="text-sm font-bold text-slate-800 leading-snug">{sondagem.pergunta}</p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-2">
        {sondagem.opcoes.map((o) => {
          const marcada = escolhas.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => alternar(o.id)}
              disabled={fechada}
              className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed bg-transparent ${
                marcada ? 'border-[#2563eb] bg-blue-50/70 text-[#0c2340]' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className={`shrink-0 w-5 h-5 border-2 flex items-center justify-center ${
                sondagem.permitir_varias ? 'rounded-md' : 'rounded-full'
              } ${marcada ? 'border-[#2563eb] bg-[#2563eb]' : 'border-slate-300'}`}>
                {marcada && <span className="w-2 h-2 bg-white rounded-full" />}
              </span>
              {o.texto}
            </button>
          );
        })}
        <p className="text-[10px] font-medium text-slate-400 pt-1">
          {sondagem.permitir_varias ? 'Pode seleccionar várias opções.' : 'Seleccione uma opção.'}
          {fechada && ' Sondagem encerrada — só leitura.'}
        </p>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={responder}
            disabled={enviando || fechada}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 disabled:opacity-60 text-white text-[10px] font-black uppercase tracking-widest border-0 cursor-pointer shadow"
          >
            <Send size={13} /> {enviando ? 'A registar…' : 'Responder à Sondagem'}
          </button>
          {registada && !fechada && (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 text-[11px] font-bold">
              <CheckCircle2 size={14} /> Resposta registada ✔
            </span>
          )}
        </div>
      </div>

      <CdaModal
        aberto={!!alerta}
        onFechar={() => setAlerta(null)}
        icone={AlertTriangle}
        titulo="Sondagem"
        tomIcone="bg-amber-50 text-amber-600 border-amber-100"
        maxW="max-w-md"
      >
        <p className="text-sm font-semibold text-slate-700 text-left">{alerta}</p>
      </CdaModal>
    </div>
  );
}
