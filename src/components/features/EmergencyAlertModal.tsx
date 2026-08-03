/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * F55 — Mensagem de Emergência (Área do Cidadão)
 * Modal de accionamento do alerta real. SEM simulação:
 *  - o resultado mostrado vem sempre do desfecho real (registado / falhou /
 *    sandbox demo);
 *  - sem gateway configurado, o texto diz explicitamente que nenhuma
 *    notificação foi enviada.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, X, MapPin, HeartPulse, Shield, Car, HelpCircle, Loader2 } from 'lucide-react';
import {
  EMERGENCY_ALERT_TYPES,
  EMERGENCY_ALERT_TYPE_LABELS,
  EmergencyAlertType,
} from '../../services/emergencyContactsService';

export type EmergencyAlertPhase = 'choose' | 'sending' | 'result';

interface EmergencyAlertModalProps {
  isOpen: boolean;
  phase: EmergencyAlertPhase;
  feedbackText: string;
  /** true em contas demo: o rótulo deixará claro que é simulação sandbox. */
  sandbox: boolean;
  recipientCount: number;
  onConfirm: (type: EmergencyAlertType) => void;
  onClose: () => void;
}

const TYPE_ICONS: Record<EmergencyAlertType, any> = {
  saude: HeartPulse,
  seguranca: Shield,
  acidente: Car,
  outro: HelpCircle,
};

export function EmergencyAlertModal({
  isOpen,
  phase,
  feedbackText,
  sandbox,
  recipientCount,
  onConfirm,
  onClose,
}: EmergencyAlertModalProps) {
  const [selectedType, setSelectedType] = useState<EmergencyAlertType | null>(null);

  const handleClose = () => {
    setSelectedType(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { if (phase !== 'sending') handleClose(); }}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.93, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 15 }}
            className="relative bg-white w-full max-w-[480px] rounded-[28px] shadow-2xl border border-red-100 p-6 md:p-8 space-y-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center shrink-0 border border-red-100">
                <ShieldAlert size={26} strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-black text-red-700 uppercase tracking-tighter leading-none mb-1">
                  Mensagem de Emergência
                </h3>
                <p className="text-red-500 font-extrabold text-[10px] uppercase tracking-widest leading-none">
                  {sandbox ? 'Modo Sandbox — simulação sem envio real' : `${recipientCount} destinatário(s) registado(s)`}
                </p>
              </div>
              {phase !== 'sending' && (
                <button
                  onClick={handleClose}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-50 rounded-full"
                  id="close-emergency-alert"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {phase === 'choose' && (
              <div className="space-y-5">
                <p className="text-slate-600 text-sm leading-relaxed">
                  Seleccione o tipo de emergência. O alerta fica <strong>registado na sua rede de confiança</strong> e,
                  <strong> mediante autorização do browser</strong>, a sua localização GPS é anexada.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {EMERGENCY_ALERT_TYPES.map((t) => {
                    const Icon = TYPE_ICONS[t];
                    const active = selectedType === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedType(t)}
                        className={`py-4 px-3 rounded-2xl border-2 flex flex-col items-center gap-2 font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                          active
                            ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50/40'
                        }`}
                        id={`emergency-type-${t}`}
                      >
                        <Icon size={22} />
                        {EMERGENCY_ALERT_TYPE_LABELS[t]}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                  <MapPin size={16} className="text-slate-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    A localização só é recolhida com o seu consentimento explícito (pedido do browser).
                    Se recusar, o alerta é registado <strong>sem coordenadas</strong> — nunca inventadas.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!selectedType}
                  onClick={() => selectedType && onConfirm(selectedType)}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg ${
                    selectedType
                      ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200 active:scale-[0.98] cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                  id="confirm-emergency-alert"
                >
                  {sandbox ? 'Simular Alerta (Sandbox)' : 'Confirmar e Registar Alerta'}
                </button>
              </div>
            )}

            {phase === 'sending' && (
              <div className="flex flex-col items-center py-8 gap-4">
                <Loader2 size={36} className="text-red-600 animate-spin" />
                <p className="text-slate-600 text-sm font-bold text-center">
                  {sandbox ? 'A simular o alerta…' : 'A registar o alerta na nuvem…'}
                </p>
              </div>
            )}

            {phase === 'result' && (
              <div className="space-y-5">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                    {feedbackText}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-4 rounded-2xl bg-[#0c2340] text-white font-black text-sm uppercase tracking-widest hover:bg-[#142f52] transition-all cursor-pointer"
                  id="close-emergency-alert-result"
                >
                  Entendido
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
