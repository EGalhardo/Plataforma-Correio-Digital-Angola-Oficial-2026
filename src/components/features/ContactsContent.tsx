/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Search, ShieldCheck, Trash2, Info, Edit, User, CreditCard, CheckCircle, X, Check, Bell, Phone, UserPlus, ChevronDown } from 'lucide-react';
import { Contact } from '../../types';

interface ContactsContentProps {
  contacts: Contact[];
  filteredContacts: Contact[];
  searchContact: string;
  setSearchContact: (search: string) => void;
  setIsAddingContact: (isAdding: boolean) => void;
  setContactToDelete: (contact: Contact) => void;
  onUpdateContactType?: (id: number, newType: 'Normal' | 'Emergência') => void;
}

export function ContactsContent({
  contacts,
  filteredContacts,
  searchContact,
  setSearchContact,
  setIsAddingContact,
  setContactToDelete,
  onUpdateContactType,
}: ContactsContentProps) {
  const [selectedClassification, setSelectedClassification] = useState<'Todos' | 'Emergência' | 'Normal'>('Todos');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; bi: string; relation: string; phone?: string; type?: 'Normal' | 'Emergência' }>({
    name: '',
    bi: '',
    relation: '',
    phone: '',
    type: 'Normal',
  });

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setEditForm({
      name: contact.name || '',
      bi: contact.bi || '',
      relation: contact.relation || '',
      phone: (contact as any).phone || '',
      type: contact.type || 'Normal',
    });
  };

  const handleSaveEdit = () => {
    if (editingContact && onUpdateContactType) {
      onUpdateContactType(editingContact.id, editForm.type || 'Normal');
    }
    setEditingContact(null);
  };

  const handleUpdateProtocol = (type: 'Normal' | 'Emergência') => {
    if (editingContact && onUpdateContactType) {
      onUpdateContactType(editingContact.id, type);
      setEditingContact({ ...editingContact, type });
    }
  };

  const finalContacts = filteredContacts.filter(contact => {
    if (selectedClassification === 'Todos') return true;
    const type = contact.type || 'Normal';
    return type === selectedClassification;
  });
  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-lg md:text-2xl font-black text-primary leading-tight">Círculo de Confiança</h3>
            <p className="text-[10px] md:text-sm text-slate-800 font-black uppercase tracking-widest">{contacts.length} Contactos Registados</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsAddingContact(true)}
            className="bg-primary text-white rounded-2xl px-4 md:px-6 py-3 md:py-3.5 flex items-center justify-center gap-2.5 md:gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs md:text-sm font-black"
          >
            <Plus size={18} className="md:w-5 md:h-5" />
            Adicionar
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[32px] p-2 shadow-sm flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
          <input 
            type="text"
            placeholder="Pesquisar no círculo de confiança..."
            value={searchContact}
            onChange={(e) => setSearchContact(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 md:py-3.5 text-xs md:text-sm font-bold text-slate-900 focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all outline-none placeholder:text-slate-500"
          />
        </div>
        <div className="hidden lg:flex items-center gap-2 px-4 py-1 border-l border-slate-200 text-slate-600">
          <ShieldCheck size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">Protocolo Familiar Activo</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[32px] p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <h4 className="font-black text-slate-900 text-lg md:text-xl italic uppercase tracking-tight flex items-center gap-2">
              <Users size={20} className="text-primary" />
              Círculo de Confiança: Registos Autorizados
            </h4>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-1">
              Lista autenticada de familiares, dependentes e contactos oficiais sincronizados
            </p>
          </div>

          {/* Tabbar para filtro de classificação */}
          <div className="flex bg-white p-1 rounded-2xl border border-slate-250 self-start lg:self-center shrink-0 shadow-3xs">
            {(['Todos', 'Emergência', 'Normal'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedClassification(tab)}
                className={`relative px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  selectedClassification === tab
                    ? tab === 'Emergência'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-primary text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {finalContacts.length > 0 ? (
          <div className="overflow-auto rounded-[24px] border border-slate-100 bg-slate-50/20 custom-scrollbar max-h-[500px]">
            <table className="mobile-data-table w-full text-left border-collapse min-w-[700px]">
              <thead className="sticky top-0 z-10 bg-primary">
                <tr className="bg-primary text-white text-[10px] font-black uppercase tracking-wider">
                  <th className="py-4 px-5 rounded-l-2xl">Contacto / Relação</th>
                  <th className="py-4 px-5">Identidade BI</th>
                  <th className="py-4 px-5">Vínculo Família</th>
                  <th className="py-4 px-5">Estado de Vínculo</th>
                  <th className="py-4 px-5 text-center rounded-r-2xl">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence mode="popLayout">
                  {finalContacts.map((contact, index) => (
                    <motion.tr 
                      layout
                      key={contact.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ delay: index * 0.03 }}
                      className="text-xs text-slate-800 hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-primary font-black text-sm border border-slate-200 shadow-3xs uppercase">
                            {(() => {
                              const initials = (contact?.name || 'C').split(' ').map((n: string) => n?.[0] || '').join('').substring(0, 2);
                              return (initials === 'MD' || initials === 'md') ? (
                                <Users size={16} className="text-primary" />
                              ) : (
                                initials
                              );
                            })()}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 text-sm block uppercase italic tracking-tight">{contact.name}</span>
                            <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block mt-0.5">{contact.relation}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-mono font-bold text-slate-700 tracking-wider">
                        {contact.bi}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5 text-indigo-705 font-mono text-[9px] font-black mb-1 border-b border-indigo-50 pb-0.5 max-w-[120px]">
                          <ShieldCheck size={11} className="text-indigo-500" />
                          <span>Protocolo Activo</span>
                        </div>
                        <div className="inline-flex mt-1">
                          {(contact.type || 'Normal') === 'Emergência' ? (
                            <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-50 text-red-700 border border-red-200 shadow-3xs">
                              Emergência
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-3xs">
                              Normal
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider ${
                          contact.status === 'Confirmado' 
                            ? 'text-emerald-600' 
                            : 'text-orange-700'
                        }`}>
                          {contact.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => openEditModal(contact)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border-0 bg-transparent cursor-pointer"
                            title="Editar contacto e protocolo"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => setContactToDelete(contact)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border-0 bg-transparent cursor-pointer"
                            title="Remover contacto"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button 
                            onClick={() => openEditModal(contact)}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all border-0 bg-transparent cursor-pointer"
                            title="Informações de Vínculo"
                          >
                            <Info size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 md:py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] md:rounded-[40px] space-y-3 md:space-y-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-slate-200">
              <Users size={32} className="md:w-10 md:h-10" />
            </div>
            <div>
              <h4 className="text-base md:text-lg font-black text-slate-400">Sem contactos à vista</h4>
              <p className="text-xs md:text-sm text-slate-400 font-medium">
                {searchContact 
                  ? `Nenhum resultado para "${searchContact}"` 
                  : selectedClassification !== 'Todos'
                    ? `Nenhum contacto classificado como "${selectedClassification}" encontrado.`
                    : 'Comece a construir o seu círculo de confiança digital.'}
              </p>
            </div>
            {searchContact && (
              <button 
                onClick={() => setSearchContact('')}
                className="text-primary font-black text-[10px] md:text-xs uppercase tracking-widest hover:underline"
              >
                Limpar Pesquisa
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {editingContact && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingContact(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              className="relative bg-white w-full max-w-[540px] max-h-[95vh] rounded-[28px] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] border border-slate-100 flex flex-col overflow-hidden mx-auto p-6 md:p-8 space-y-6"
            >
              {/* Header Area */}
              <div className="flex items-center gap-4 text-left relative shrink-0">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                  <Edit size={24} className="text-blue-600" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl md:text-[23px] font-black text-[#0c2340] italic uppercase tracking-tighter leading-none mb-1">
                    Editar Contacto
                  </h3>
                  <p className="text-blue-600 font-extrabold text-[10px] uppercase tracking-widest font-sans leading-none">
                    PROTOCOLO DE REDES DE SEGURANÇA
                  </p>
                </div>
                {/* Corner close button */}
                <button
                  onClick={() => setEditingContact(null)}
                  className="absolute top-0 right-0 text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-50 rounded-full"
                  id="close-edit-contact"
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
                        onClick={() => setEditForm(prev => ({ ...prev, type: 'Normal' }))}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          editForm.type === 'Normal'
                            ? 'bg-[#0c2340] text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50 bg-transparent border-0'
                        }`}
                        id="edit-tab-normal-contact"
                      >
                        <User size={14} />
                        Contacto Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditForm(prev => ({ ...prev, type: 'Emergência' }))}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          editForm.type === 'Emergência'
                            ? 'bg-[#0c2340] text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50 bg-transparent border-0'
                        }`}
                        id="edit-tab-emergency-contact"
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
                          value={editForm.name}
                          onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-white border border-slate-200 focus:border-[#0c2340] rounded-2xl pl-11 pr-4 py-3.5 text-xs text-slate-800 outline-none transition-all font-bold placeholder:text-slate-400"
                          id="edit-contact-name-input"
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
                          value={editForm.bi}
                          onChange={e => setEditForm(prev => ({ ...prev, bi: e.target.value }))}
                          className="w-full bg-white border border-slate-200 focus:border-[#0c2340] rounded-2xl pl-11 pr-4 py-3.5 text-xs text-slate-800 outline-none transition-all font-mono font-bold tracking-wider placeholder:text-slate-400"
                          maxLength={14}
                          id="edit-contact-bi-input"
                        />
                      </div>
                    </div>

                    {/* Grau de Parentesco */}
                    <div className="grid gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Grau de Parentesco / Relação *</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          <Users size={15} />
                        </span>
                        <input
                          placeholder="Ex: Mãe, Irmão, Advogado"
                          value={editForm.relation}
                          onChange={e => setEditForm(prev => ({ ...prev, relation: e.target.value }))}
                          className="w-full bg-white border border-slate-200 focus:border-[#0c2340] rounded-2xl pl-11 pr-4 py-3.5 text-xs text-slate-800 outline-none transition-all font-bold placeholder:text-slate-400"
                          id="edit-contact-relation-input"
                        />
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
                          value={editForm.phone || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full bg-white border border-slate-200 focus:border-[#0c2340] rounded-2xl pl-11 pr-4 py-3.5 text-xs text-slate-800 outline-none transition-all font-bold placeholder:text-slate-400"
                          id="edit-contact-phone-input"
                        />
                      </div>
                    </div>
                  </div>
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
                  onClick={() => setEditingContact(null)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 py-3.5 rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-all"
                  id="cancel-edit-contact-btn"
                >
                  <X size={14} />
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={!editForm.name || !editForm.bi}
                  className="flex-[2] bg-[#0c2340] hover:bg-[#152e4d] text-white py-3.5 rounded-full font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none cursor-pointer active:scale-98"
                  id="confirm-edit-contact-btn"
                >
                  <Check size={14} />
                  Guardar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
