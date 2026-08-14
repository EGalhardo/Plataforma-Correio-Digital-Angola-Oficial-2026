/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, ShieldAlert } from 'lucide-react';
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
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white rounded-[28px] md:rounded-[32px] p-5 sm:p-6 md:p-8 shadow-2xl max-w-sm w-full text-center max-h-[92vh] overflow-y-auto"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} className="text-red-600" />
            </div>
            <h3 className="text-2xl font-black text-primary mb-3">Eliminar Contacto?</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-8">
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
