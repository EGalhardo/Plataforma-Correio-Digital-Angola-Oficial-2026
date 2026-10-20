// ============================================================================
// CdaConfirm — confirmações e pedidos de input no padrão único de popups
// (auditoria 2026-08-24, achado 🟡 #2): substitui os confirm()/prompt()
// nativos do browser por modais CdaModal, coerentes com o resto da
// plataforma e compatíveis com browsers que bloqueiam diálogos nativos.
// ============================================================================
import { useEffect, useState } from 'react';
import { AlertTriangle, MessageSquareText } from 'lucide-react';
import { CdaModal } from './CdaModal';

interface CdaConfirmModalProps {
  aberto: boolean;
  titulo: string;
  subtitulo?: string;
  mensagem: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  /** Acção destrutiva → botão vermelho (rosa) em vez de indigo. */
  perigoso?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function CdaConfirmModal({
  aberto,
  titulo,
  subtitulo = 'Confirmação necessária',
  mensagem,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  perigoso = false,
  onConfirmar,
  onCancelar,
}: CdaConfirmModalProps) {
  return (
    <CdaModal
      aberto={aberto}
      onFechar={onCancelar}
      icone={AlertTriangle}
      titulo={titulo}
      subtitulo={subtitulo}
      maxW="max-w-xl"
      tomIcone={perigoso ? 'bg-rose-50 text-rose-600 border-rose-100/60' : 'bg-amber-50 text-amber-600 border-amber-100/60'}
      padding="p-6 md:p-8"
    >
      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line m-0">{mensagem}</p>
      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
        <button
          type="button"
          onClick={onCancelar}
          className="px-6 py-3 rounded-2xl font-bold text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer border-none"
        >
          {textoCancelar}
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-white transition-colors cursor-pointer border-none shadow-sm ${
            perigoso ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {textoConfirmar}
        </button>
      </div>
    </CdaModal>
  );
}

interface CdaPromptModalProps {
  aberto: boolean;
  titulo: string;
  subtitulo?: string;
  mensagem?: string;
  placeholder?: string;
  textoConfirmar?: string;
  /** Quando true, o botão de confirmar só activa com texto preenchido. */
  obrigatorio?: boolean;
  onConfirmar: (valor: string) => void;
  onCancelar: () => void;
}

export function CdaPromptModal({
  aberto,
  titulo,
  subtitulo = 'Informação necessária',
  mensagem,
  placeholder = 'Escreva aqui…',
  textoConfirmar = 'Confirmar',
  obrigatorio = true,
  onConfirmar,
  onCancelar,
}: CdaPromptModalProps) {
  const [valor, setValor] = useState('');
  useEffect(() => { if (aberto) setValor(''); }, [aberto]);
  const valido = !obrigatorio || valor.trim().length > 0;
  return (
    <CdaModal
      aberto={aberto}
      onFechar={onCancelar}
      icone={MessageSquareText}
      titulo={titulo}
      subtitulo={subtitulo}
      maxW="max-w-xl"
      padding="p-6 md:p-8"
    >
      {mensagem ? <p className="text-sm text-slate-600 leading-relaxed m-0">{mensagem}</p> : null}
      <label className="block">
        <textarea
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
        />
      </label>
      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
        <button
          type="button"
          onClick={onCancelar}
          className="px-6 py-3 rounded-2xl font-bold text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer border-none"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!valido}
          onClick={() => valido && onConfirmar(valor.trim())}
          className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer border-none shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {textoConfirmar}
        </button>
      </div>
    </CdaModal>
  );
}
