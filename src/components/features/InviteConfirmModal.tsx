/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { Send } from 'lucide-react';

interface InviteConfirmModalProps {
  showInviteConfirm: boolean;
  setShowInviteConfirm: (show: boolean) => void;
  contactForm: { name: string };
  handleAddContact: () => void;
}

export function InviteConfirmModal({ 
  showInviteConfirm, 
  setShowInviteConfirm, 
  contactForm, 
  handleAddContact 
}: InviteConfirmModalProps) {
  return (
    <AnimatePresence>
      {showInviteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInviteConfirm(false)}
            className="absolute inset-0 bg-primary/20 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white w-full max-w-sm rounded-[28px] md:rounded-[32px] p-4 sm:p-5 md:p-6 mx-3 shadow-2xl border border-line max-h-[92vh] overflow-y-auto"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Send size={32} className="text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-center text-primary mb-4">Confirmar Envio</h3>
            <div className="space-y-4 mb-8">
              <p className="text-slate-600 text-center leading-relaxed">
                Para garantir a segurança e evitar fraudes, este convite será enviado para validação.
              </p>
              <div className="bg-slate-50 border border-line rounded-2xl p-6 text-sm text-center">
                <p className="text-slate-700 font-semibold mb-2 text-base">
                  Seu pedido será enviado para <span className="text-primary font-bold">"{contactForm.name || "o destinatário"}"</span>.
                </p>
                <p className="text-slate-500 italic leading-relaxed">
                  "Se for aceite, o contacto desta pessoa será automaticamente adicionado à sua lista oficial."
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowInviteConfirm(false)}
                className="py-3.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  handleAddContact();
                  setShowInviteConfirm(false);
                }}
                className="py-3.5 rounded-xl font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
              >
                Confirmar e Enviar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
