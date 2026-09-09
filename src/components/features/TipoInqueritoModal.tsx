// ============================================================================
// TipoInqueritoModal — popup «Tipo de Inquérito» (2026-09-09)
// Área Institucional → Nova Mensagem → «Criar Inquérito».
// O agente escolhe entre Inquérito Normal (manual) e Inquérito IA e confirma
// com «OK»; o popup fecha e abre-se o «Criar Sondagem» no modo escolhido.
// Padrão único de popups do app: CdaModal.
// ============================================================================
import { useEffect, useState } from 'react';
import { FileText, Pencil, BrainCircuit, Check } from 'lucide-react';
import { CdaModal } from '../ui/CdaModal';

export type TipoInquerito = 'normal' | 'ia';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  onConfirmar: (tipo: TipoInquerito) => void;
}

const OPCOES: { tipo: TipoInquerito; titulo: string; descricao: string; Icone: typeof Pencil }[] = [
  { tipo: 'normal', titulo: 'Inquérito Normal', descricao: 'Crie perguntas e opções manualmente.', Icone: Pencil },
  { tipo: 'ia', titulo: 'Inquérito IA', descricao: 'A Inteligência Artificial ajuda a criar o inquérito.', Icone: BrainCircuit },
];

export function TipoInqueritoModal({ aberto, onFechar, onConfirmar }: Props) {
  const [tipo, setTipo] = useState<TipoInquerito>('normal');

  useEffect(() => { if (aberto) setTipo('normal'); }, [aberto]);

  return (
    <CdaModal
      aberto={aberto}
      onFechar={onFechar}
      icone={FileText}
      titulo="Tipo de Inquérito"
      maxW="max-w-xl"
    >
      <div className="space-y-5 text-left">
        <h4 className="font-sans font-black text-sm md:text-base uppercase tracking-wide text-slate-600 m-0">
          Escolha o tipo de inquérito
        </h4>

        <div role="radiogroup" aria-label="Tipo de inquérito" className="space-y-3">
          {OPCOES.map(({ tipo: t, titulo, descricao, Icone }) => {
            const activo = tipo === t;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => setTipo(t)}
                onDoubleClick={() => onConfirmar(t)}
                className={`w-full flex items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-all cursor-pointer active:scale-[0.99] ${
                  activo
                    ? 'border-[#2563eb] bg-blue-50/70 ring-1 ring-[#2563eb]/30'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                }`}
                id={`opcao-inquerito-${t}`}
              >
                <span className="shrink-0 w-12 h-12 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center">
                  <Icone size={22} strokeWidth={2.2} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-black text-slate-900 text-base leading-tight">{titulo}</span>
                  <span className="block text-sm font-medium text-slate-500 mt-0.5">{descricao}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
                    activo ? 'bg-[#2563eb] border-[#2563eb] text-white' : 'border-slate-300 bg-white'
                  }`}
                >
                  {activo && <Check size={15} strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Rodapé — mesma métrica dos botões do «Criar Sondagem» */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={onFechar}
            className="px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-100 bg-white border border-slate-200 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirmar(tipo)}
            className="px-5 py-3 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-widest border-0 cursor-pointer shadow"
            id="btn-tipo-inquerito-ok"
          >
            OK
          </button>
        </div>
      </div>
    </CdaModal>
  );
}
