/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, QrCode, ShieldCheck, Info, CreditCard, Globe, Car, FileText, ArrowLeft, Plus, Clock, CheckCircle2, XCircle, Building2, ChevronRight, X } from 'lucide-react';
import { Document, DocRequest, LanguageCode } from '../../types';
import { useInstitutions } from '../../services/institutionStore';
import { useLanguage } from '../../hooks/useLanguage';
import { LazyImage } from '../ui/LazyImage';

export interface WalletContentProps {
  filteredDocs: Document[];
  searchDoc: string;
  setSearchDoc: (search: string) => void;
  setSelectedDoc: (doc: Document) => void;
  setTab: (tab: string) => void;
  logSecurityEvent?: (action: string, type: 'info' | 'warning' | 'critical' | 'success') => void;
  docRequests: DocRequest[];
  onCreateRequest: (docType: string, institution: string) => void;
  emergencyMode?: boolean;
  currentLanguage?: LanguageCode;
}

const CANONICAL_DOC_TYPES: Record<string, string[]> = {
  'AGT': ['NIF Digital', 'Certidão de Contribuinte', 'IPU Simplificado', 'Liquidação de Impostos'],
  'SME': ['Passaporte Digital', 'Autorização de Residência', 'Visto Consular Digital'],
  'ENDE': ['Contrato de Fornecimento', 'Certidão de Quitação ENDE', 'Histórico de Consumos'],
  'EPAL': ['Contrato de Água', 'Certidão de Quitação EPAL', 'Declaração de Abastecimento'],
  'MINJUS': ['Registo Criminal Eletrónico', 'Cédula Pessoal Digital', 'B.I. Digital'],
  'MINSA': ['Cartão de Vacinação Digital', 'Boletim de Saúde', 'Histórico Clínico Unificado'],
  'PNA': ['Carta de Condução', 'Livrete Digital', 'Registo de Propriedade Automóvel'],
  'INSS': ['Extrato de Contribuições', 'Guia de Segurança Social', 'Comprovativo de Pensionista'],
  'CNE': ['Cartão de Eleitor Digital', 'Atestado de Cadastramento'],
  'Registo Civil': ['Assento de Nascimento', 'Certidão de Casamento', 'Certificado de Óbito'],
  'Notariado': ['Escritura Pública Digital', 'Procuração Notarial', 'Reconhecimento de Assinatura'],
  'Tribunal de Comarca': ['Certidão Judicial', 'Sentença Homologada', 'Consulta de Processo'],
  'Universidade Pública': ['Diploma Digital', 'Certificado de Habilitações', 'Cartão de Estudante Digital']
};

export function WalletContent({
  filteredDocs,
  searchDoc,
  setSearchDoc,
  setSelectedDoc,
  setTab,
  logSecurityEvent,
  docRequests,
  onCreateRequest,
  emergencyMode = false,
  currentLanguage = 'pt'
}: WalletContentProps) {
  const { institutions } = useInstitutions();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [showRequestsHistory, setShowRequestsHistory] = useState(false);
  const [requestData, setRequestData] = useState({ institution: 'AGT', docType: '' });
  
  const { t: translate } = useLanguage();

  const INSTITUTIONS = institutions.map(i => i.name);
  
  const getDocTypes = (inst: string): string[] => {
    return CANONICAL_DOC_TYPES[inst] || ['Certidão Oficial', 'Declaração Electrónica', 'Guia de Carga'];
  };

  const handleRequestSubmit = () => {
    if (!requestData.docType) return;
    onCreateRequest(requestData.docType, requestData.institution);
    setIsRequestModalOpen(false);
    setRequestData({ institution: 'AGT', docType: '' });
  };

  return (
    <section className="space-y-8 pb-10">
      {/* SOC-AN-2026 Alert Banner inside Wallet */}
      {emergencyMode && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border-2 border-red-500/25 p-5 rounded-[28px] flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-lg shadow-red-500/5"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-red-600 text-white rounded-2xl shrink-0 mt-0.5 animate-pulse">
              <XCircle size={20} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 bg-red-650 text-white text-[8px] font-mono font-black uppercase tracking-widest rounded-full animate-bounce">
                  BLOQUEIO DE SEGURANÇA NACIONAL
                </span>
                <span className="text-[10px] font-mono font-bold text-red-500 uppercase">SOC-AN-2026 ACTIVADO</span>
              </div>
              <h4 className="text-sm font-black uppercase text-slate-900 tracking-tight leading-none italic mt-1 font-sans">
                Chaves Criptográficas Encriptadas e Bloqueadas
              </h4>
              <p className="text-slate-600 text-[11px] leading-relaxed max-w-2xl mt-1">
                Ao abrigo do protocolo de defesa do Estado angolano, as portas biométricas de identificação do cidadão &quot;Edlasio Galhardo&quot; foram recolhidas preventivamente para salvaguardar a soberania digital contra intrusões de redes externas.
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 bg-red-200 text-red-800 text-[9px] font-black uppercase tracking-widest rounded-xl text-center md:self-center shrink-0">
            Acesso Restrito
          </span>
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <QrCode size={24} />
          </div>
          <div>
            <h3 className="text-lg md:text-2xl font-black text-primary leading-tight uppercase italic tracking-tighter">{translate("Carteira Digital")}</h3>
            <p className="text-[10px] md:text-sm text-slate-600 font-black uppercase tracking-widest">{filteredDocs.length} {translate("Documentos Ativos")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            id="btn-solicitar-doc-wizard"
            onClick={() => setTab('solicitar-documento')}
            className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <Plus size={18} /> {translate("Solicitar Documento")}
          </button>
          <div className="hidden md:flex bg-success/10 border border-success/20 px-4 py-2 rounded-xl items-center gap-3 transition-opacity">
            <ShieldCheck size={16} className="text-success" />
            <span className="text-[9px] md:text-xs font-black text-success uppercase tracking-wider">{translate("Segurança CDA")}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-1 text-[10px] font-black uppercase tracking-widest">
        <button onClick={() => setTab('pasta-digital')} className="cda-link-text">{translate("Abrir Pasta Digital")}</button>
        <button onClick={() => setTab('historico')} className="cda-link-text">{translate("Ver Histórico")}</button>
        <button onClick={() => setTab('notificacoes')} className="cda-link-text">{translate("Notificações")}</button>
        <button onClick={() => setShowRequestsHistory(prev => !prev)} className="cda-link-text">
          {showRequestsHistory ? translate('Ocultar solicitações') : translate('Ver solicitações')}
        </button>
      </div>

      <div className="bg-white border border-slate-100 rounded-[32px] p-2 shadow-sm flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Pesquisar na minha carteira..."
            value={searchDoc}
            onChange={(e) => setSearchDoc(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3 md:py-3.5 text-xs md:text-sm font-bold text-slate-900 focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all outline-none placeholder:text-slate-500"
          />
        </div>
        <div className="hidden lg:flex items-center gap-2 px-4 py-1 border-l border-slate-100 italic">
          <Info size={16} className="text-primary" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none pt-1">Validade Jurídica CDA v4.1</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <AnimatePresence mode="popLayout">
          {filteredDocs.map((doc, index) => {
            const docName = doc?.name?.toLowerCase() || '';
            const getIcon = () => {
              if (docName.includes('bi')) return <CreditCard size={20} />;
              if (docName.includes('passaporte')) return <Globe size={20} />;
              if (docName.includes('carta')) return <Car size={20} />;
              return <FileText size={20} />;
            };

            const getTheme = () => {
              if (docName.includes('passaporte')) return 'from-[#8b1a1a] to-[#5a1010] shadow-red-900/20';
              if (docName.includes('carta')) return 'from-emerald-900 to-emerald-800 shadow-emerald-900/20';
              return 'from-[#1e3a8a] to-[#2563eb] shadow-blue-900/20';
            };

            return (
              <motion.button 
                layout
                key={doc.code}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => {
                  if (emergencyMode) {
                    logSecurityEvent?.(`BLOQUEIO DE SEGURANÇA NACIONAL: Acesso ao documento ${doc.name} recusado.`, 'critical');
                    return;
                  }
                  setSelectedDoc(doc);
                  setTab('documento');
                  logSecurityEvent?.(`Acesso ao documento: ${doc.name} (${doc.code})`, 'info');
                }}
                className="w-full text-left relative overflow-hidden rounded-[40px] shadow-2xl group transition-all hover:scale-[1.02] active:scale-95"
              >
                {emergencyMode && (
                  <div className="absolute inset-0 bg-red-950/85 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center transition-all duration-300">
                    <div className="w-12 h-12 rounded-full bg-red-650/30 flex items-center justify-center border border-red-500/40 mb-3 animate-pulse text-red-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-alert"><path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                    </div>
                    <span className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-red-150 bg-red-900/60 border border-red-700/80 px-3 py-1 rounded-full mb-1">
                      PROTOCOLO SOC-AN-2026 ATIVO
                    </span>
                    <h5 className="text-white text-base font-black uppercase italic tracking-tight leading-none">Acesso Temporariamente Restrito</h5>
                    <p className="text-red-200/80 text-[10px] mt-2 leading-relaxed max-w-[240px]">
                      Chaves criptográficas bloqueadas por motivos de segurança e integridade cibernética nacional.
                    </p>
                  </div>
                )}

                {/* Background Pattern */}
                <div className={`absolute inset-0 bg-gradient-to-br ${getTheme()}`} />
                <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none">
                  <svg width="100%" height="100%"><pattern id={`grid-${doc.code}`} width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="0.5"/></pattern><rect width="100%" height="100%" fill={`url(#grid-${doc.code})`} /></svg>
                </div>

                <div className="relative z-10 p-6 md:p-8 flex flex-col h-full space-y-8 md:space-y-10">
                  <div className="flex justify-between items-start">
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl text-white border border-white/20 shadow-xl">
                      {getIcon()}
                    </div>
                    <div className="text-right">
                       <div className="w-12 h-8 ml-auto mb-2 opacity-40">
                         <LazyImage 
                           src="https://i.postimg.cc/Rq5TKbdk/Correio-Digital-Angola.png" 
                           alt="" 
                           style={{ width: '100%', height: '100%', filter: 'invert(1)', backgroundColor: 'transparent' }}
                         />
                       </div>
                      <div className="text-white/70 text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1">Cédula Digital</div>
                      <div className="text-white font-mono text-[10px] md:text-xs font-black tracking-[0.2em]">{doc.code}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-white text-xl md:text-2xl font-black italic tracking-tighter uppercase mb-2">{doc.name}</h4>
                    <div className="flex items-center gap-2">
                       <div className="px-3 py-1 bg-emerald-500/20 backdrop-blur-md text-emerald-400 text-[9px] font-black rounded-lg border border-emerald-500/20 uppercase tracking-[0.2em] flex items-center gap-1.5 shadow-xl">
                         <ShieldCheck size={10} /> Validado
                       </div>
                       <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{doc.validity}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-white/10 pt-6">
                    <div>
                      <div className="text-white/40 text-[8px] font-black uppercase tracking-widest mb-1.5 leading-none">Identificação do Titular</div>
                      <div className="text-white text-sm md:text-lg font-black italic tracking-tight uppercase leading-none">{doc.holder}</div>
                    </div>
                    <div className="flex items-center gap-2 bg-white text-primary px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest group-hover:bg-primary group-hover:text-white transition-all shadow-xl shadow-black/20">
                      Visualizar <ChevronRight size={14} className="ml-1" />
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {docRequests.length > 0 && showRequestsHistory && (
        <div className="space-y-6 pt-10">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h4 className="text-lg font-black text-primary uppercase italic tracking-tighter">Histórico de Solicitações</h4>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {docRequests.map((req, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={req.id}
                className="bg-white border border-slate-100 rounded-[24px] p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/10 transition-all shadow-sm"
              >
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm ${
                    req.status === 'Aprovado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    req.status === 'Rejeitado' ? 'bg-red-50 text-red-600 border-red-100' :
                    'bg-slate-50 text-slate-400 border-slate-100'
                  }`}>
                    {req.status === 'Aprovado' ? <CheckCircle2 size={24} /> :
                     req.status === 'Rejeitado' ? <XCircle size={24} /> :
                     <Clock size={24} className="animate-pulse" />}
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900 text-base md:text-lg italic tracking-tight uppercase leading-none mb-2">{req.docType}</h5>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       <span className="flex items-center gap-1.5 border-r border-slate-200 pr-4">
                         <Building2 size={12} /> {req.institution}
                       </span>
                       <span>Emissão via {req.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                    req.status === 'Aprovado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    req.status === 'Rejeitado' ? 'bg-red-50 text-red-600 border-red-100' :
                    'bg-orange-50 text-orange-600 border-orange-100'
                  }`}>
                    {req.status}
                  </div>
                  {req.status === 'Pendente' && (
                    <div className="text-[10px] font-black text-slate-400 italic bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 uppercase tracking-widest">
                      Aguardando Regularização
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* New Request Modal */}
      <AnimatePresence>
        {isRequestModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRequestModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[500]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-[32px] shadow-3xl z-[501] overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="bg-primary p-6 md:p-8 text-white relative">
                 <button 
                  onClick={() => setIsRequestModalOpen(false)}
                  className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/10 rounded-xl border border-white/20">
                    <FileText size={18} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.3em]">CDA Emission System</span>
                </div>
                <h2 className="text-2xl font-black italic tracking-tighter uppercase">Solicitar Documento</h2>
                <p className="text-white/60 text-[10px] font-medium uppercase tracking-widest mt-1 px-1">Selecione o organismo e o acto digital</p>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instituição Governamental</label>
                    <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-100 border border-slate-200 rounded-xl scrollbar-thin">
                       {INSTITUTIONS.map(inst => (
                         <button
                           key={inst}
                           onClick={() => setRequestData({ institution: inst, docType: '' })}
                           className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                             requestData.institution === inst 
                             ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                             : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-300'
                           }`}
                         >
                           {inst}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Documento Digital</label>
                    <div className="relative">
                      <select
                        value={requestData.docType}
                        onChange={(e) => setRequestData({ ...requestData, docType: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-xs font-black uppercase tracking-widest text-slate-900 focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none appearance-none cursor-pointer"
                      >
                        <option value="" disabled>Selecione o documento...</option>
                        {getDocTypes(requestData.institution).map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-4">
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3">
                     <Info size={16} className="text-primary shrink-0 mt-0.5" />
                     <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed">
                       O sistema CDA verificará a sua regularidade fiscal e civil automaticamente.
                     </p>
                   </div>
                   <button 
                    onClick={handleRequestSubmit}
                    disabled={!requestData.docType}
                    className="w-full bg-primary text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                   >
                     Confirmar Solicitação
                   </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
