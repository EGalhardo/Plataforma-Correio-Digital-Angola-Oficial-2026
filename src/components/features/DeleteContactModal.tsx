/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { Contact } from '../../types';

interface DeleteContactModalProps {
  contactToDelete: Contact | null;
  setContactToDelete: (contact: Contact | null) => void;
  handleDeleteContact: () => void;
}

export function DeleteContactModal({ 
  contactToDelete, 
  setContactToDelete, 
  handleDeleteContact 
}: DeleteContactModalProps) {
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
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setContactToDelete(null)}
                className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  handleDeleteContact();
                  setContactToDelete(null);
                }}
                className="py-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-colors"
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
