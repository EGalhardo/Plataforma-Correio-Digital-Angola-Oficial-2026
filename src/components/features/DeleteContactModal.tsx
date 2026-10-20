/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Trash2, ShieldAlert } from 'lucide-react';
import { Contact } from '../../types';

interface DeleteContactModalProps {
  contactToDelete: Contact | null;
  setContactToDelete: (contact: Contact | null) => void;
  handleDeleteContact: () => void;
  /** F55 — razão REAL de bloqueio (mínimo de 2 contactos de emergência). */
  blockReason?: string | null;
}

export function DeleteContactModal({ 
  contactToDelete, 
  setContactToDelete, 
  handleDeleteContact,
  blockReason = null,
}: DeleteContactModalProps) {
  // G4 — fecho por tecla Escape (acessibilidade de teclado)
  useEffect(() => {
    if (!contactToDelete) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContactToDelete(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [contactToDelete, setContactToDelete]);

  return (
    <AnimatePresence>
      {contactToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setContactToDelete(null)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.93, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 15 }}
            className="relative bg-white rounded-[32px] p-6 md:p-10 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] border border-slate-100 max-w-sm w-full text-center max-h-[95vh] overflow-y-auto mx-auto space-y-6 z-10"
          >
            <div className="flex items-center gap-4 text-left relative shrink-0">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center shrink-0 border border-rose-100/40 shadow-sm">
                <Trash2 size={26} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl md:text-[23px] font-black text-[#0c2340] italic uppercase tracking-tighter leading-none mb-1">Eliminar Contacto?</h3>
                <p className="text-[#4f46e5] font-black text-[10px] uppercase tracking-[0.16em] mt-1 m-0 leading-none">Acção irreversível</p>
              </div>
              <button 
                onClick={() => setContactToDelete(null)}
                className="absolute -top-1 -right-1 text-slate-400 hover:text-slate-600 transition-all p-2 hover:bg-slate-50 rounded-full border-none bg-transparent cursor-pointer"
                type="button"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              Tem a certeza que deseja eliminar <strong>{contactToDelete.name}</strong> da sua rede de confiança? Esta acção não pode ser desfeita.
            </p>
            {/* F55 — bloqueio real: o modal permanece aberto com a razão visível */}
            {blockReason && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-left" id="delete-contact-blocked">
                <p className="text-red-700 text-xs font-bold leading-relaxed flex items-start gap-2">
                  <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                  {blockReason}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setContactToDelete(null)}
                className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  // F55 — o App decide: fecha em sucesso REAL; mantém aberto
                  // com a razão honesta quando a regra dos 2 bloqueia.
                  handleDeleteContact();
                }}
                disabled={!!blockReason}
                className={`py-4 rounded-2xl font-bold transition-colors ${
                  blockReason
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-red-600 text-white shadow-lg shadow-red-200 hover:bg-red-700'
                }`}
              >
                Eliminar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
