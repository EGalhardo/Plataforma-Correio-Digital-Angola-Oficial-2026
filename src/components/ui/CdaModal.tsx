/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// 2026-08-22 — PADRÃO ÚNICO DE POPUPS DA PLATAFORMA
// Réplicas exactas do layout do popup "Registar Novo Membro da Equipa":
//   · backdrop  bg-slate-950/60 + backdrop-blur-md (clique fecha)
//   · caixa     bg-white rounded-[32px] sombra oficial borda slate-100,
//               animação scale 0.93→1 / y 15→0, max-h-[95vh] com scroll
//   · cabeçalho círculo 64px indigo (ícone), título itálico uppercase preto
//               #0c2340, subtítulo indigo #4f46e5 tracking largo, X no canto
// Todos os popups do app usam este padrão (diretamente ou com as mesmas
// classes) para uma experiência visual coerente em todas as áreas.
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
  tomIcone = 'bg-indigo-50 text-indigo-600 border-indigo-100/40',
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
        className={`relative bg-white w-full ${maxW} max-h-[95vh] rounded-[32px] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] border border-slate-100 flex flex-col overflow-hidden mx-auto ${padding} space-y-6 z-10`}
      >
        {!semCabecalho && (
          <div className="flex items-center gap-4 text-left relative shrink-0">
            <div className={`w-16 h-16 ${tomIcone} rounded-full flex items-center justify-center shrink-0 border shadow-sm`}>
              <Icone size={26} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl md:text-[23px] font-black text-[#0c2340] italic uppercase tracking-tighter leading-none mb-1">
                {titulo}
              </h3>
              {subtitulo && (
                <p className="text-[#4f46e5] font-black text-[10px] uppercase tracking-[0.16em] mt-1 m-0 leading-none">
                  {subtitulo}
                </p>
              )}
            </div>
            <button
              onClick={onFechar}
              className="absolute -top-1 -right-1 text-slate-400 hover:text-slate-600 transition-all p-2 hover:bg-slate-50 rounded-full border-none bg-transparent cursor-pointer"
              type="button"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        )}
        {children}
      </motion.div>
    </div>
  );
}

/** Classes oficiais do padrão, para popups que preferem compor manualmente. */
export const CDA_MODAL_PADRAO = {
  exterior: 'fixed inset-0 z-[99999] flex items-center justify-center p-4',
  backdrop: 'absolute inset-0 bg-slate-950/60 backdrop-blur-md',
  caixa: (maxW = 'max-w-4xl') =>
    `relative bg-white w-full ${maxW} max-h-[95vh] rounded-[32px] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] border border-slate-100 flex flex-col overflow-hidden mx-auto p-6 md:p-10 space-y-6 z-10`,
  titulo: 'text-xl md:text-[23px] font-black text-[#0c2340] italic uppercase tracking-tighter leading-none mb-1',
  subtitulo: 'text-[#4f46e5] font-black text-[10px] uppercase tracking-[0.16em] mt-1 m-0 leading-none',
  icone: 'w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0 border border-indigo-100/40 shadow-sm',
  fechar: 'absolute -top-1 -right-1 text-slate-400 hover:text-slate-600 transition-all p-2 hover:bg-slate-50 rounded-full border-none bg-transparent cursor-pointer',
};
