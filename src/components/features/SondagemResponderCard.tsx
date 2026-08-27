// ============================================================================
// SondagemResponderCard — área Cidadão (v36.1 → v37.4)
// v37.4: o contentor NÃO tem botões de acção — a selecção das opções é
// elevada ao componente pai e o registo da resposta acontece no botão
// «Responder ao Documento», com popup de confirmação (spec do dono).
// 1 voto por cidadão; re-votável enquanto ativa (upsert).
// ============================================================================
import { useEffect, useState } from 'react';
import { BarChart3, CheckCircle2 } from 'lucide-react';
import { buscarSondagem, minhaResposta, type Sondagem } from '../../services/sondagemService';

interface Props {
  sondagemId: number;
  cidadaoBi: string;
  /** selecção actual (controlada pelo pai) */
  escolhas: string[];
  onEscolhas: (ids: string[]) => void;
  /** resposta já registada (o pai controla) */
  registada: boolean;
  /** informa o pai quando a sondagem (e eventual resposta anterior) carrega */
  onCarregar?: (s: Sondagem, respostaExistente: string[]) => void;
}

export function SondagemResponderCard({ sondagemId, cidadaoBi, escolhas, onEscolhas, registada, onCarregar }: Props) {
  const [sondagem, setSondagem] = useState<Sondagem | null>(null);
  const [estado, setEstado] = useState<'a_carregar' | 'pronto' | 'indisponivel'>('a_carregar');

  useEffect(() => {
    let vivo = true;
    (async () => {
      const r = await buscarSondagem(sondagemId);
      if (!vivo) return;
      if (!r.ok || !r.dados) { setEstado('indisponivel'); return; }
      setSondagem(r.dados);
      const m = await minhaResposta(sondagemId, cidadaoBi);
      if (!vivo) return;
      const existente = m.ok && m.dados ? m.dados : [];
      onCarregar?.(r.dados, existente);
      setEstado('pronto');
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (fechada || registada) return;
    onEscolhas(
      sondagem.permitir_varias
        ? (escolhas.includes(id) ? escolhas.filter(x => x !== id) : [...escolhas, id])
        : [id],
    );
  };

  return (
    <div className="cda-sondagem mt-8 rounded-2xl border border-indigo-100 bg-white shadow-sm overflow-hidden" data-testid="sondagem-card">
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
            <div
              key={o.id}
              role="radio"
              aria-checked={marcada}
              tabIndex={0}
              onClick={() => alternar(o.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternar(o.id); } }}
              className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors cursor-pointer select-none bg-transparent ${
                marcada ? 'border-[#2563eb] bg-blue-50/70 text-[#0c2340]' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              } ${fechada || registada ? 'opacity-80 cursor-default' : ''}`}
            >
              <span className={`shrink-0 w-5 h-5 border-2 flex items-center justify-center ${
                sondagem.permitir_varias ? 'rounded-md' : 'rounded-full'
              } ${marcada ? 'border-[#2563eb] bg-[#2563eb]' : 'border-slate-300'}`}>
                {marcada && <span className="w-2 h-2 bg-white rounded-full" />}
              </span>
              {o.texto}
            </div>
          );
        })}
        <p className="text-[10px] font-medium text-slate-400 pt-1 m-0">
          {sondagem.permitir_varias ? 'Pode seleccionar várias opções.' : 'Seleccione uma opção.'}
          {fechada && ' Sondagem encerrada — só leitura.'}
          {' '}Confirme a escolha no botão «Responder ao Documento».
        </p>

        {registada && !fechada && (
          <span className="inline-flex items-center gap-1.5 text-emerald-600 text-[11px] font-bold">
            <CheckCircle2 size={14} /> Resposta registada ✔
          </span>
        )}
      </div>
    </div>
  );
}
