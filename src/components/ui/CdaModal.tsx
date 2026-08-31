/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// 2026-08-30 (v37.78.10) — PADRÃO ÚNICO DE POPUPS DA PLATAFORMA
// Layout de referência pedido pelo dono: o popup «Central de Preferências do
// Cidadão» (Área do Cidadão → Perfil):
//   · backdrop  bg-slate-950/60 + backdrop-blur-md (clique fecha)
//   · caixa     bg-white rounded-[32px] sombra oficial borda slate-100,
//               animação scale, max-h-[95vh] com scroll
//   · CABEÇALHO faixa escura #111A2E de largura total: ícone em chip
//               arredondado, título BRANCO uppercase, subtítulo slate-400,
//               X à direita (hover branco)
//   · corpo     branco com scroll, padding generoso
// Todos os popups do app herdam este padrão (CdaModal/CdaConfirm/CdaPrompt).
// ============================================================================

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CdaModalProps {
  aberto: boolean;
  onFechar: () => void;
  /** Ícone do círculo do cabeçalho (ex.: UserPlus, Trash2...) */
  icone: LucideIcon;
  /** Título principal (itálico uppercase, como na referência) */
  titulo: string;
  /** Subtítulo fino indigo por baixo do título */
  subtitulo?: string;
  /** Largura máxima da caixa (padrão do popup de referência: 4xl) */
  maxW?: string;
  /** Cor do círculo do ícone (padrão indigo da referência) */
  tomIcone?: string;
  children: React.ReactNode;
  /** Esconde o cabeçalho padrão (popup já traz o seu próprio interior) */
  semCabecalho?: boolean;
  /** Padding interior da caixa */
  padding?: string;
}

export function CdaModal({
  aberto,
  onFechar,
  icone: Icone,
  titulo,
  subtitulo,
  maxW = 'max-w-4xl',
  tomIcone = 'bg-primary/20 text-primary border-white/10',
  children,
  semCabecalho = false,
  padding = 'p-6 md:p-10',
}: CdaModalProps) {
  // Auditoria 2026-08-24 (G4): fechar com a tecla Escape — acessibilidade
  // (WCAG 2.4.3). Aplicado a todos os popups da plataforma que usam CdaModal.
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aberto, onFechar]);

  // v37.78.21 (G10): bloquear o scroll do fundo enquanto o modal está aberto.
  // O shell da app faz scroll num contentor próprio ([data-cda-scroll],
  // App.tsx) e não no body — travam-se ambos. Save/restore encadeado mantém
  // o comportamento correcto com modais sobrepostos (confirm dentro de modal).
  useEffect(() => {
    if (!aberto) return;
    const scrollShell = document.querySelector<HTMLElement>('[data-cda-scroll]');
    const alvos: HTMLElement[] = [document.body];
    if (scrollShell) alvos.push(scrollShell);
    const anterior = alvos.map((el) => el.style.overflow);
    alvos.forEach((el) => { el.style.overflow = 'hidden'; });
    return () => { alvos.forEach((el, i) => { el.style.overflow = anterior[i]; }); };
  }, [aberto]);

  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onFechar}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
      />

      {/* Corpo */}
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 15 }}
        className={`relative bg-white w-full ${maxW} max-h-[95vh] rounded-[32px] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] border border-slate-100 flex flex-col overflow-hidden mx-auto z-10`}
      >
        {!semCabecalho && (
          <div className="px-5 md:px-7 py-3.5 md:py-4 bg-[#111A2E] text-white flex justify-between items-center gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-1.5 md:p-2 rounded-xl flex items-center justify-center shrink-0 border ${tomIcone}`}>
                <Icone size={18} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-xs md:text-sm uppercase tracking-tight text-white leading-tight truncate">
                  {titulo}
                </h3>
                {subtitulo && (
                  <p className="text-[8px] md:text-[9px] text-slate-400 uppercase tracking-widest font-black m-0 leading-none mt-0.5 truncate">
                    {subtitulo}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onFechar}
              className="text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer shrink-0"
              type="button"
              title="Fechar"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className={`${semCabecalho ? padding : `${padding} space-y-6`} overflow-y-auto flex-1 text-left`}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

/** Classes oficiais do padrão, para popups que preferem compor manualmente.
 *  v37.78.10+ — layout da «Central de Preferências do Cidadão»: faixa de
 *  cabeçalho escura (#111A2E) com ícone em chip, título branco uppercase,
 *  subtítulo slate-400 e X white/60; corpo com padding próprio e scroll. */
export const CDA_MODAL_PADRAO = {
  exterior: 'fixed inset-0 z-[99999] flex items-center justify-center p-4',
  backdrop: 'absolute inset-0 bg-slate-950/60 backdrop-blur-md',
  caixa: (maxW = 'max-w-4xl') =>
    `relative bg-white w-full ${maxW} max-h-[95vh] rounded-[32px] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] border border-slate-100 flex flex-col overflow-hidden mx-auto z-10`,
  faixa: 'px-5 md:px-7 py-3.5 md:py-4 bg-[#111A2E] text-white flex justify-between items-center gap-3 shrink-0',
  corpo: 'p-6 md:p-10 space-y-6 overflow-y-auto flex-1 text-left',
  titulo: 'font-extrabold text-xs md:text-sm uppercase tracking-tight text-white leading-tight truncate',
  subtitulo: 'text-[8px] md:text-[9px] text-slate-400 uppercase tracking-widest font-black mt-0.5 m-0 leading-none truncate',
  icone: 'p-1.5 md:p-2 bg-primary/20 text-primary rounded-xl flex items-center justify-center shrink-0 border border-white/10',
  fechar: 'text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer shrink-0',
};
