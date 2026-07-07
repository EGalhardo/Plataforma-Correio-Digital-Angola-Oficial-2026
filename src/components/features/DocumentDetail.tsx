/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Download, ShieldCheck, QrCode, Info, ExternalLink, Printer, Fingerprint, Sparkles, ArrowRight } from 'lucide-react';
import { Document } from '../../types';
import { USER_PROFILE_PHOTO } from '../../constants/data';
import { generateProtocol } from '../../utils/protocolGenerator';
import { GovernmentAIPanel } from './GovernmentAIPanel';

interface DocumentDetailProps {
  selectedDoc: Document;
  setSelectedDoc: (doc: Document | null) => void;
  setTab: (tab: string) => void;
  logSecurityEvent?: (action: string, type: 'info' | 'warning' | 'critical' | 'success') => void;
}

export function DocumentDetail({
  selectedDoc,
  setSelectedDoc,
  setTab,
  logSecurityEvent,
}: DocumentDetailProps) {
  const [showAIPanel, setShowAIPanel] = useState(false);
  
  const protocol = selectedDoc.protocol || generateProtocol(
    selectedDoc.issuer || 'GOV',
    'document',
    selectedDoc.code || selectedDoc.number,
    selectedDoc.name
  );

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => {
            setSelectedDoc(null);
            setTab('home');
          }}
          className="flex items-center justify-center w-10 h-10 bg-white border-2 border-[#d1dbe5] rounded-full text-[#384e6e] hover:bg-slate-50 transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 shrink-0"
          title="Voltar ao Painel"
        >
          <ArrowLeft size={16} className="text-[#384e6e]" />
        </button>
        <div>
          <h3 className="text-base md:text-xl font-black text-primary leading-none">Visualizar Documento</h3>
          <p className="text-[10px] md:text-sm text-slate-400 font-black uppercase tracking-widest mt-1">Ref: {selectedDoc.code}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-10">
        {/* Document Preview Card */}
        <div className="lg:col-span-3">
          <div className="relative aspect-[1.6/1] w-full bg-slate-900 rounded-[32px] md:rounded-[48px] overflow-hidden shadow-2xl p-6 md:p-10 text-white border-2 border-white/5">
             <div className="absolute inset-0 opacity-20 mix-blend-overlay">
                <svg width="100%" height="100%"><pattern id="grid-doc" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="0.5"/></pattern><rect width="100%" height="100%" fill="url(#grid-doc)" /></svg>
             </div>
             
             <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="flex justify-between items-start">
                   <div className="space-y-1">
                      <div className="w-12 h-8 bg-white/20 rounded-md backdrop-blur-md mb-2" />
                      <h4 className="text-lg md:text-2xl font-black tracking-tight">{selectedDoc.name}</h4>
                      <p className="text-[10px] md:text-xs font-bold text-white/50 tracking-widest uppercase">República de Angola</p>
                   </div>
                   <img 
                      src={USER_PROFILE_PHOTO} 
                      alt="Foto BI" 
                      className="w-14 h-18 md:w-24 md:h-30 rounded-xl md:rounded-2xl border-2 border-white/20 object-cover shadow-lg"
                      referrerPolicy="no-referrer"
                   />
                </div>

                <div className="space-y-4 md:space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="text-[8px] md:text-[9px] font-black text-white/40 uppercase tracking-widest block mb-1">NÚMERO DO DOCUMENTO</label>
                         <div className="text-sm md:text-xl font-mono font-bold tracking-[0.2em]">{selectedDoc.number || '009874562LA041'}</div>
                      </div>
                      <div className="text-right">
                         <label className="text-[8px] md:text-[9px] font-black text-white/40 uppercase tracking-widest block mb-1">CÓDIGO DIGITAL</label>
                         <div className="text-[#FFD700] font-mono font-bold text-sm md:text-lg">{selectedDoc.code}</div>
                      </div>
                   </div>
                   
                   <div className="flex justify-between items-end border-t border-white/10 pt-4 md:pt-6">
                      <div>
                         <label className="text-[8px] md:text-[9px] font-black text-white/40 uppercase tracking-widest block mb-1">TITULAR</label>
                         <div className="text-sm md:text-lg font-black uppercase tracking-tight">{selectedDoc.holder}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                         <div className="text-[8px] md:text-[10px] font-black bg-success/20 text-success px-2 py-0.5 rounded-full border border-success/30 uppercase tracking-widest">
                            Autêntico
                         </div>
                         <div className="text-[8px] font-bold text-white/40">{selectedDoc.validity}</div>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 font-mono">
             {[
                { label: 'Baixar PDF', icon: <Download size={20} />, color: 'bg-primary text-white', action: () => logSecurityEvent?.(`Cidadão baixou cópia PDF: ${selectedDoc.name}`, 'info') },
                { label: 'Imprimir', icon: <Printer size={20} />, color: 'bg-slate-100 text-slate-600', action: () => logSecurityEvent?.(`Cidadão enviou para impressão: ${selectedDoc.name}`, 'info') },
                { label: 'Partilhar', icon: <ExternalLink size={20} />, color: 'bg-slate-100 text-slate-600', action: () => logSecurityEvent?.(`Tentativa de partilha de documento: ${selectedDoc.name}`, 'warning') },
                { label: 'Histórico', icon: <ClockIcon size={20} />, color: 'bg-slate-100 text-slate-600', action: () => {} },
             ].map((btn, i) => (
                <button 
                  key={i} 
                  onClick={btn.action}
                  className={`flex flex-col items-center justify-center p-4 md:p-6 rounded-2xl gap-2 md:gap-3 transition-all hover:scale-105 active:scale-95 ${btn.color} shadow-sm`}
                >
                   {btn.icon}
                   <span className="text-[9px] md:text-xs font-black uppercase tracking-widest">{btn.label}</span>
                </button>
             ))}
          </div>

          {/* AI Assistance Toggle Button */}
          <button 
            type="button"
            onClick={() => {
              setShowAIPanel(!showAIPanel);
              logSecurityEvent?.(`Cidadão accionou IA Governamental: ${selectedDoc.name}`, 'info');
            }}
            className={`w-full mt-6 p-4 md:p-5 rounded-[24px] border transition-all flex items-center justify-between shadow-lg active:scale-98 ${
              showAIPanel 
                ? 'bg-primary text-white border-primary shadow-primary/25' 
                : 'bg-gradient-to-r from-indigo-50/70 to-[#eff6ff] border-blue-200/60 hover:border-blue-300 text-primary shadow-blue-900/5'
            }`}
          >
             <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${showAIPanel ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary'}`}>
                   <Sparkles size={18} className={showAIPanel ? 'animate-spin' : 'animate-pulse'} />
                </div>
                <div className="text-left font-sans">
                   <span className="font-extrabold text-xs md:text-sm uppercase tracking-wider block">Resumo Inteligente (IA)</span>
                   <span className={`text-[9px] md:text-xs font-bold block ${showAIPanel ? 'text-white/75' : 'text-slate-500'}`}>
                      {showAIPanel ? 'Ocultar Análise de IA' : 'Resumir, Explicar termos, Auto-Classificar e Detetar Urgência'}
                   </span>
                </div>
             </div>
             <ArrowRight size={18} className={`transition-transform duration-300 ${showAIPanel ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {showAIPanel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-6"
              >
                <GovernmentAIPanel 
                  documentTitle={selectedDoc.name}
                  rawText={`DOCUMENTO OFICIAL: ${selectedDoc.name}
Código Digital Único: ${selectedDoc.code}
Número do Documento: ${selectedDoc.number}
Titular do Documento: ${selectedDoc.holder}
Emitido por: ${selectedDoc.issuer}
Data de Emissão: ${selectedDoc.issuedAt}
Validade: ${selectedDoc.validity}
Protocolo de Autenticidade: ${protocol.protocolNumber}
Selo de Validação ICP-AO: ${protocol.digitalSignature}
Selo Governamental de Angola: Activo e Autêntico.`}
                  contextType="document"
                  onLogMsg={logSecurityEvent}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Info & Metadata */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
           <div className="bg-white border border-line rounded-[32px] p-6 md:p-8 shadow-sm space-y-6 md:space-y-8">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center text-success">
                    <ShieldCheck size={24} />
                 </div>
                 <div>
                    <h4 className="text-lg md:text-xl font-black text-primary leading-tight">Certificação</h4>
                    <p className="text-[10px] md:text-sm text-slate-400 font-black uppercase tracking-widest">Validade Jurídica Total</p>
                 </div>
              </div>

              <div className="space-y-4 md:space-y-6">
                 {[
                    { label: 'Emitido por', value: selectedDoc.issuer },
                    { label: 'Data de Emissão', value: selectedDoc.issuedAt },
                    { label: 'Estado do Documento', value: 'Vigente / Activo', color: 'text-success' },
                    { label: 'Validado Via QR', value: 'Sim, há 2 horas' }
                 ].map((item, i) => (
                    <div key={i} className="flex justify-between items-start group">
                       <div>
                          <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                          <p className={`text-sm md:text-base font-bold tracking-tight ${item.color || 'text-primary'}`}>{item.value}</p>
                       </div>
                    </div>
                 ))}
              </div>

              <div className="pt-6 border-t border-line/60 flex flex-col items-center gap-4">
                 <div className="p-3 md:p-4 bg-slate-50 rounded-2xl border border-line">
                    <QrCode size={100} className="md:w-[140px] md:h-[140px] text-primary opacity-90" />
                 </div>
                 <p className="text-center text-[10px] md:text-xs text-slate-500 font-medium px-4">
                    Este QR Code permite a qualquer autoridade verificar a autenticidade deste documento em tempo real.
                 </p>
              </div>
           </div>

            {/* National Digital Protocol Registry */}
            <div className="bg-slate-900 text-white border border-slate-800 rounded-[32px] p-6 shadow-xl space-y-6">
               <div className="flex items-center justify-between pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3 text-left">
                     <Fingerprint size={22} className="text-amber-400" />
                     <div>
                        <h4 className="text-xs font-black tracking-widest text-slate-400 uppercase font-mono">Registo de Protocolo</h4>
                        <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest font-mono">Core Digital Ativo</p>
                     </div>
                  </div>
                  <span className="text-[10px] font-mono font-black text-slate-400 bg-white/5 px-2.5 py-1 rounded-md">100% Autêntico</span>
               </div>

               <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs text-left">
                  <div>
                     <span className="text-[9px] text-white/40 font-bold block uppercase tracking-wider mb-0.5">ID Interno</span>
                     <span className="font-mono font-bold text-slate-300">{protocol.internalId}</span>
                  </div>
                  <div>
                     <span className="text-[9px] text-white/40 font-bold block uppercase tracking-wider mb-0.5">Nº Protocolo</span>
                     <span className="font-mono font-black text-amber-400">{protocol.protocolNumber}</span>
                  </div>
                  <div className="col-span-2">
                     <span className="text-[9px] text-white/40 font-bold block uppercase tracking-wider mb-0.5">Instituição Emissora</span>
                     <span className="font-bold text-slate-300 line-clamp-1">{protocol.issuerInstitution}</span>
                  </div>
                  <div>
                     <span className="text-[9px] text-white/40 font-bold block uppercase tracking-wider mb-0.5">Data de Emissão</span>
                     <span className="font-bold text-slate-350">{protocol.officialIssueDate}</span>
                  </div>
                  <div>
                     <span className="text-[9px] text-white/40 font-bold block uppercase tracking-wider mb-0.5">Hora de Emissão</span>
                     <span className="font-mono font-bold text-slate-350">{protocol.officialTime}</span>
                  </div>
                  <div className="col-span-2">
                     <span className="text-[9px] text-white/40 font-bold block uppercase tracking-wider mb-0.5">Responsável</span>
                     <span className="font-bold text-slate-300 line-clamp-1">{protocol.issuerResponsible}</span>
                  </div>
                  <div>
                     <span className="text-[9px] text-white/40 font-bold block uppercase tracking-wider mb-0.5">Categoria</span>
                     <span className="font-bold text-indigo-400">{protocol.category}</span>
                  </div>
                  <div>
                     <span className="text-[9px] text-white/40 font-bold block uppercase tracking-wider mb-0.5">Documento</span>
                     <span className="font-bold text-slate-300 line-clamp-1">{protocol.documentType}</span>
                  </div>
                  <div>
                     <span className="text-[9px] text-white/40 font-bold block uppercase tracking-wider mb-0.5">Estado</span>
                     <span className="font-bold text-emerald-400">{protocol.currentState}</span>
                  </div>
                  <div>
                     <span className="text-[9px] text-white/40 font-bold block uppercase tracking-wider mb-0.5">Prioridade</span>
                     <span className={`font-bold ${protocol.priority === 'Alta' ? 'text-rose-400' : 'text-slate-300'}`}>{protocol.priority}</span>
                  </div>
                  <div className="col-span-2">
                     <span className="text-[9px] text-white/40 font-bold block uppercase tracking-wider mb-0.5">Data Limite</span>
                     <span className="font-bold text-slate-300">{protocol.deadlineDate}</span>
                  </div>
                  {protocol.archiveReference && (
                    <div className="col-span-2">
                       <span className="text-[9px] text-white/40 font-bold block uppercase tracking-wider mb-0.5">Referência de Arquivo</span>
                       <span className="font-mono font-black text-amber-300">{protocol.archiveReference}</span>
                    </div>
                  )}
                  {protocol.archiveLocation && (
                    <div className="col-span-2">
                       <span className="text-[9px] text-white/40 font-bold block uppercase tracking-wider mb-0.5">Localização Formal do Arquivo</span>
                       <span className="font-bold text-slate-300 break-words">{protocol.archiveLocation}</span>
                    </div>
                  )}
               </div>

               <div className="pt-4 border-t border-white/5 space-y-3">
                  <div className="flex justify-between items-center gap-2">
                     <div className="flex-1 min-w-0 text-left">
                        <span className="text-[8px] text-white/40 font-bold uppercase tracking-wider block">Assinatura Digital</span>
                        <div className="font-mono text-[9px] break-all p-2 bg-black/40 rounded-lg text-slate-400 border border-white/5 block">
                           {protocol.digitalSignature}
                        </div>
                     </div>
                     <div className="shrink-0 p-1.5 bg-white rounded-xl shadow-sm">
                        <img 
                          src={protocol.qrCodeUrl} 
                          alt="QR Document Protocolo"
                          className="w-12 h-12 object-contain"
                          referrerPolicy="no-referrer"
                        />
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-primary/5 border border-primary/10 rounded-[28px] p-5 flex gap-4">
              <Info size={20} className="text-primary shrink-0" />
              <p className="text-[11px] md:text-xs text-primary font-bold leading-relaxed">
                 O uso de documentos digitais é facultativo, mas possui a mesma força probatória que os documentos físicos originais.
              </p>
           </div>
        </div>
      </div>
    </motion.div>
  );
}

function ClockIcon({ size, className }: { size?: number, className?: string }) {
  return (
    <svg 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
