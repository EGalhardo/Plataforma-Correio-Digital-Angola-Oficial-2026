/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Dispatch, SetStateAction } from 'react';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Bell,
  CreditCard,
  Users,
  Phone,
  Mail,
  CheckCircle,
  Info,
  X,
  Check,
  ChevronDown,
  Edit
} from 'lucide-react';

import { CONTACT_RELATION_OPTIONS } from '../../services/emergencyContactsService';
import { normalizarNome } from '../../services/textNormalizeService';

// Espelha o useState do compositor de contactos no App (fonte única da forma).
interface ContactoForm {
  name: string; bi: string; relation: string; phone: string; whatsapp: string;
  email: string;
  type: 'Normal' | 'Emergência';
}

interface AddContactModalProps {
  isAddingContact: boolean;
  setIsAddingContact: (isAdding: boolean) => void;
  contactForm: { name: string; bi: string; relation: string; phone?: string; whatsapp?: string; email?: string; type?: 'Normal' | 'Emergência' };
  setContactForm: Dispatch<SetStateAction<ContactoForm>>;
  onAddContact: () => void;
  /** F55 — erros de validação reais (telefone +244, duplicados, relação…). */
  formErrors?: string[];
}

export function AddContactModal({ 
  isAddingContact, 
  setIsAddingContact, 
  contactForm, 
  setContactForm, 
  onAddContact,
  formErrors = [],
}: AddContactModalProps) {
  // G4 — fecho por tecla Escape (acessibilidade de teclado)
  useEffect(() => {
    if (!isAddingContact) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAddingContact(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isAddingContact, setIsAddingContact]);

  return (
    <AnimatePresence>
      {isAddingContact && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsAddingContact(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" 
          />
          <motion.div 
            initial={{ scale: 0.93, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 15 }}
            className="relative bg-white w-full max-w-[540px] max-h-[95vh] rounded-[32px] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] border border-slate-100 flex flex-col overflow-hidden mx-auto p-6 md:p-10 space-y-6 z-10"
          >
            {/* Header Area - MESMO ESTILO DO EDITAR CONTACTO */}
            <div className="flex items-center gap-4 text-left relative shrink-0">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                <Edit size={24} className="text-blue-600" strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl md:text-[23px] font-black text-[#0c2340] italic uppercase tracking-tighter leading-none mb-1">
                  Novo Contacto
                </h3>
                <p className="text-blue-600 font-extrabold text-[10px] uppercase tracking-widest font-sans leading-none">
                  PROTOCOLO DE REDES DE SEGURANÇA
                </p>
              </div>
              {/* Corner close button */}
              <button 
                onClick={() => setIsAddingContact(false)} 
                className="absolute top-0 right-0 text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-50 rounded-full"
                id="close-add-contact"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Form Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-1 text-left">
              {/* Identificação do Contacto Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-700 font-bold uppercase tracking-wider text-xs">
                  <User size={16} />
                  <span>Identificação do Contacto</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Tipo de Contacto *</label>
                  <div className="bg-slate-50/50 p-1 rounded-2xl flex w-full border border-slate-200">
                    <button 
                      type="button"
                      onClick={() => setContactForm((prev) => ({ ...prev, type: 'Normal' }))}
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        (contactForm.type || 'Normal') === 'Normal'
                          ? 'bg-[#0c2340] text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50 bg-transparent border-0'
                      }`}
                      id="tab-normal-contact"
                    >
                      <User size={14} />
                      Contacto Normal
                    </button>
                    <button 
                      type="button"
                      onClick={() => setContactForm((prev) => ({ ...prev, type: 'Emergência' }))}
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        contactForm.type === 'Emergência'
                          ? 'bg-[#0c2340] text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50 bg-transparent border-0'
                      }`}
                      id="tab-emergency-contact"
                    >
                      <Bell size={14} />
                      Contacto de Emergência
                    </button>
                  </div>
                </div>

                {/* Form fields in grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nome Completo */}
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome Completo *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <User size={15} />
                      </span>
                      <input 
                        placeholder="Ex: Edlasio Galhardo" 
                        value={contactForm.name}
                        onChange={e => setContactForm((prev) => ({ ...prev, name: e.target.value }))}
                        onBlur={() => { const n = normalizarNome(contactForm.name); if (n !== contactForm.name) setContactForm((prev) => ({ ...prev, name: n })); }}
                        className="w-full bg-white border border-slate-200 focus:border-[#0c2340] rounded-2xl pl-11 pr-4 py-3.5 text-xs text-slate-800 outline-none transition-all font-bold placeholder:text-slate-400"
                        id="contact-name-input"
                      />
                    </div>
                  </div>

                  {/* Número de BI Oficial */}
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Número de BI Oficial *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <CreditCard size={15} />
                      </span>
                      <input 
                        placeholder="000000000LA000" 
                        value={contactForm.bi}
                        onChange={e => setContactForm((prev) => ({ ...prev, bi: e.target.value }))}
                        className="w-full bg-white border border-slate-200 focus:border-[#0c2340] rounded-2xl pl-11 pr-4 py-3.5 text-xs text-slate-800 outline-none transition-all font-mono font-bold tracking-wider placeholder:text-slate-400"
                        maxLength={14}
                        id="contact-bi-input"
                      />
                    </div>
                  </div>

                  {/* Grau de Parentesco — F55: SELECT fechado (spec chat-approved) */}
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Grau de Parentesco / Relação *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
                        <Users size={15} />
                      </span>
                      <select
                        value={contactForm.relation}
                        onChange={e => setContactForm((prev) => ({ ...prev, relation: e.target.value }))}
                        className="w-full bg-white border border-slate-200 focus:border-[#0c2340] rounded-2xl pl-11 pr-4 py-3.5 text-xs text-slate-800 outline-none transition-all font-bold appearance-none cursor-pointer"
                        id="contact-relation-input"
                      >
                        <option value="" disabled>Seleccionar relação…</option>
                        {CONTACT_RELATION_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Contacto / Telefone */}
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contacto / Telefone *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Phone size={15} />
                      </span>
                      <input 
                        placeholder="+244 923 000 000" 
                        value={contactForm.phone || ''}
                        onChange={e => setContactForm((prev) => ({ ...prev, phone: e.target.value }))}
                        className="w-full bg-white border border-slate-200 focus:border-[#0c2340] rounded-2xl pl-11 pr-4 py-3.5 text-xs text-slate-800 outline-none transition-all font-bold placeholder:text-slate-400"
                        id="contact-phone-input"
                      />
                    </div>
                  </div>

                  {/* WhatsApp — F55 (opcional) */}
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">WhatsApp (opcional)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Phone size={15} />
                      </span>
                      <input 
                        placeholder="+244 923 000 000" 
                        value={contactForm.whatsapp || ''}
                        onChange={e => setContactForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                        className="w-full bg-white border border-slate-200 focus:border-[#0c2340] rounded-2xl pl-11 pr-4 py-3.5 text-xs text-slate-800 outline-none transition-all font-bold placeholder:text-slate-400"
                        id="contact-whatsapp-input"
                      />
                    </div>
                  </div>

                  {/* Email — v35 (opcional; usado na difusão de emergência) */}
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email (opcional)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Mail size={15} />
                      </span>
                      <input 
                        type="email"
                        placeholder="exemplo@gmail.com" 
                        value={contactForm.email || ''}
                        onChange={e => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="w-full bg-white border border-slate-200 focus:border-[#0c2340] rounded-2xl pl-11 pr-4 py-3.5 text-xs text-slate-800 outline-none transition-all font-bold placeholder:text-slate-400"
                        id="contact-email-input"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>

                {/* F55 — erros de validação reais (visíveis, sem retorno silencioso) */}
                {formErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-1.5" id="add-contact-errors">
                    {formErrors.map((err, i) => (
                      <p key={i} className="text-red-700 text-xs font-bold leading-relaxed flex items-start gap-2">
                        <X size={13} className="shrink-0 mt-0.5" />
                        {err}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Line Divider */}
              <div className="border-t border-dashed border-slate-200 my-1" />

              {/* Estágio de Autorização Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#10b981] font-bold uppercase tracking-wider text-xs">
                  <CheckCircle size={16} />
                  <span>Estágio de Autorização</span>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Permissão de Acesso *</label>
                  <div className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-800">
                      <CheckCircle size={16} className="text-[#10b981]" />
                      <span className="text-xs font-bold">Autorizado</span>
                    </div>
                    <ChevronDown size={14} className="text-slate-400" />
                  </div>
                </div>

                {/* Info block */}
                <div className="bg-[#f0fdf4] border border-emerald-100 p-4 rounded-2xl flex gap-3 items-start select-none">
                  <Info size={18} className="text-[#10b981] shrink-0 mt-0.5" />
                  <p className="text-slate-700 text-[10.5px] font-medium leading-relaxed">
                    Utilizadores autorizados poderão aceder aos dados de contacto em situações previstas no protocolo institucional de segurança e emergência.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions Area */}
            <div className="flex items-center gap-3 pt-2 shrink-0">
              <button 
                type="button"
                onClick={() => setIsAddingContact(false)}
                className="flex-1 bg-white border border-slate-200 text-slate-700 py-3.5 rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-all"
                id="cancel-add-contact-btn"
              >
                <X size={14} />
                Cancelar
              </button>
              
              <button 
                type="button"
                onClick={() => {
                  // F55 — SEM retorno silencioso e SEM fecho fabricado: o App
                  // valida, mostra erros reais e só fecha o modal em caso de
                  // sucesso confirmado.
                  onAddContact();
                }}
                disabled={!contactForm.name || !contactForm.bi}
                className="flex-[2] bg-[#0c2340] hover:bg-[#152e4d] text-white py-3.5 rounded-full font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none cursor-pointer active:scale-98"
                id="confirm-add-contact-btn"
              >
                <Check size={14} />
                Adicionar Contacto
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
