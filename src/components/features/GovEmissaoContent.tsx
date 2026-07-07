import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ShieldCheck, FileText, Send, User, ArrowLeft, CheckCircle2, Clock, Upload, X, Paperclip, ArrowRight, Search, Plus } from 'lucide-react';
import { Document, AppNotification, UserRequest } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';

interface GovEmissaoContentProps {
  onEmit: (doc: Document, notification: AppNotification) => void;
  recentDocuments?: Document[];
  emergencyMode?: boolean;
  userRequests?: UserRequest[];
  setTab?: (tab: string) => void;
}

export function GovEmissaoContent({ 
  onEmit, 
  recentDocuments = [], 
  emergencyMode = false,
  userRequests = []
}: GovEmissaoContentProps) {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [correspondenciaTab, setCorrespondenciaTab] = useState('lidas');
  const [searchMail, setSearchMail] = useState('');

  const [formData, setFormData] = useState({
    subject: 'Notificação de Cumprimento Fiscal',
    holder: 'MANUEL SILVA',
    bi: '',
    content: 'Prezado cidadão, informamos que o seu processo relativo ao NIF supra mencionado foi actualizado com sucesso no nosso sistema.',
    issuer: 'AGT - Administração Geral Tributária',
  });

  const instituicaoInbox = useMemo(() => [
    ...userRequests.map(req => ({
      id: req.id,
      user: req.user,
      subject: `Pedido: ${req.type}`,
      preview: `Solicitação de ${req.type} submetida através do Correio Digital Angola. Aguardando análise institucional.`,
      date: req.time,
      unread: req.status === 'pendente' || req.status === 'urgente',
      type: req.type,
      bi: req.bi
    })),
    { 
      id: 9991, 
      user: 'SME - Serviço de Migração e Estrangeiros', 
      subject: 'Partilha de Dados Interoperáveis', 
      preview: 'Solicitação de consulta de dados fiscais para o processo de visto nº 8823/24...', 
      date: 'Ontem', 
      unread: false,
      type: 'Institucional'
    }
  ], [userRequests]);

  const handleSelectRequest = (item: any) => {
    setFormData({
      ...formData,
      holder: item.user,
      bi: item.bi || '',
      subject: item.subject.startsWith('Pedido:') ? `Resposta ao ${item.subject}` : `Comunicação: ${item.subject}`,
      content: `Prezado(a) ${item.user},\n\nEm resposta à sua solicitação/mensagem de ${item.date}, informamos que...`
    });
    setCorrespondenciaTab('lidas'); // Keep context
    setShowForm(true);
  };

  const filteredMessages = useMemo(() => {
    let base = [];
    if (correspondenciaTab === 'enviadas') {
      base = recentDocuments.map(doc => ({
        id: doc.code,
        user: doc.holder,
        subject: doc.name,
        preview: `Mensagem oficial emitida em ${doc.issuedAt}. Código: ${doc.code}`,
        date: doc.issuedAt,
        unread: false,
        type: 'Enviada'
      }));
    } else if (correspondenciaTab === 'naoLidas') {
      base = instituicaoInbox.filter(m => m.unread);
    } else {
      base = instituicaoInbox.filter(m => !m.unread);
    }

    if (!searchMail) return base;
    const s = searchMail?.toLowerCase() || '';
    return base.filter(m => 
      (m.user?.toLowerCase().includes(s) ?? false) || 
      (m.subject?.toLowerCase().includes(s) ?? false) || 
      (m.preview?.toLowerCase().includes(s) ?? false)
    );
  }, [correspondenciaTab, instituicaoInbox, recentDocuments, searchMail]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEmitting(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 100);

    setTimeout(() => {
      const newDoc: Document = {
        name: formData.subject,
        holder: formData.holder,
        issuer: formData.issuer,
        validity: 'Oficial',
        number: formData.bi || `MSG-${Math.floor(100000 + Math.random() * 900000)}`,
        code: `CDA-${Math.floor(10000000 + Math.random() * 90000000)}`,
        issuedAt: new Date().toLocaleDateString('pt-AO'),
      };

      const newNotification: AppNotification = {
        id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
        title: 'Nova Correspondência Oficial',
        message: `Recebeu uma mensagem de ${formData.issuer}: "${formData.subject}". ${selectedFile ? `Contém anexo: ${selectedFile.name}` : ''}`,
        time: 'Agora',
        type: 'info',
        targetTab: 'correspondencias'
      };

      onEmit(newDoc, newNotification);
      setIsEmitting(false);
      setIsSuccess(true);
      setSelectedFile(null);
      
      setTimeout(() => {
        setIsSuccess(false);
        setCorrespondenciaTab('enviadas');
        setShowForm(false);
      }, 3000);
    }, 2500);
  };

  if (isEmitting) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[600px] bg-white border border-slate-100 rounded-[48px] shadow-sm">
        <div className="relative w-40 h-40 mb-10">
           <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-[6px] border-slate-50 border-t-red-600 rounded-full"
           />
           <div className="absolute inset-0 flex items-center justify-center">
              <ShieldCheck size={56} className="text-red-600 animate-pulse" />
           </div>
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-2 italic tracking-tighter uppercase leading-none">Criptografando Mensagem</h2>
        <p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.2em] mb-10">Garantindo Sigilo via Canal Seguro CDA</p>
        
        <div className="w-full max-w-sm bg-slate-100 h-3 rounded-full overflow-hidden mb-4 shadow-inner">
           <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
           />
        </div>
        <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{progress}% COMPLETO</span>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[600px] bg-white border border-slate-100 rounded-[48px] shadow-sm">
        <motion.div 
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          className="w-32 h-32 bg-emerald-50 text-emerald-600 rounded-[40px] flex items-center justify-center mb-8 border border-emerald-100 shadow-xl shadow-emerald-900/5"
        >
          <CheckCircle2 size={64} />
        </motion.div>
        <h2 className="text-4xl font-black text-slate-900 mb-2 italic tracking-tighter uppercase leading-none">Correio Enviado!</h2>
        <p className="text-slate-700 font-bold uppercase tracking-widest text-[10px] max-w-sm">A correspondência oficial foi devidamente assinada, encriptada e enviada para o cidadão.</p>
      </div>
    );
  }

  const unreadTotal = instituicaoInbox.filter(m => m.unread).length;

  return (
    <div className="pb-32 relative md:pt-2 space-y-6">
       {/* Emergency Overlay Block */}
       <AnimatePresence>
         {emergencyMode && (
           <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-slate-50/10 backdrop-blur-[2px] rounded-[40px] flex items-center justify-center p-8"
           >
              <div className="bg-red-600 text-white p-12 rounded-[50px] shadow-2xl max-w-md text-center border-4 border-white">
                 <ShieldCheck size={64} className="mx-auto mb-6 animate-pulse" />
                 <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-4 leading-tight">Comunicações Suspensas</h2>
                 <p className="text-sm font-black opacity-100 leading-relaxed uppercase tracking-widest">
                   Protocolo de Segurança Nacional Activo. O canal de envio de correspondências foi bloqueado centralmente.
                 </p>
                 <div className="mt-8 pt-8 border-t border-white/20">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-bounce">Aguarde instruções do SOC</p>
                 </div>
              </div>
           </motion.div>
         )}
       </AnimatePresence>

       {showForm ? (
         <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => setShowForm(false)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-950 transition-colors border-0 cursor-pointer shrink-0"
              title="Voltar ao Correio"
            >
              <ArrowLeft size={16} />
            </button>
         </div>
       ) : (
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 border border-red-100">
                <Mail size={20} className="md:w-6 md:h-6" />
              </div>
              <div>
                <h3 className="text-lg md:text-2xl font-black text-slate-950 leading-tight italic tracking-tighter uppercase">Correio Oficial</h3>
                <p className="text-[10px] md:text-sm text-slate-600 font-black uppercase tracking-widest leading-none mt-1">{unreadTotal} mensagens pendentes</p>
              </div>
            </div>
            
            <button 
              onClick={() => !emergencyMode && setShowForm(true)}
              disabled={emergencyMode}
              className="bg-red-600 text-white rounded-2xl px-6 py-3.5 flex items-center justify-center gap-3 shadow-xl shadow-red-200 hover:scale-[1.02] active:scale-95 transition-all text-xs md:text-sm font-black uppercase tracking-widest disabled:opacity-50"
            >
              <Plus size={18} />
              Nova Mensagem
            </button>
         </div>
       )}

      <AnimatePresence mode="wait">
        {!showForm ? (
          <div className="space-y-6">
            {/* Filters & Tabs Container */}
            <div className="bg-white border border-slate-100 rounded-[32px] p-2 shadow-sm flex flex-col lg:flex-row gap-3">
              <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-2xl lg:min-w-[420px]">
                {[
                  { id: 'naoLidas', label: 'Não Lidas', count: instituicaoInbox.filter(m => m.unread).length },
                  { id: 'lidas', label: 'Lidas', count: instituicaoInbox.filter(m => !m.unread).length },
                  { id: 'enviadas', label: 'Enviadas', count: recentDocuments.length }
                ].map(t => {
                  const isActive = correspondenciaTab === t.id;
                  let activeStyle = '';
                  let badgeStyle = 'bg-slate-350 text-slate-700';

                  if (isActive) {
                    if (t.id === 'lidas') {
                      activeStyle = 'bg-emerald-600 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-600';
                      badgeStyle = 'bg-white text-emerald-700';
                    } else if (t.id === 'naoLidas') {
                      activeStyle = 'bg-red-600 text-white shadow-md shadow-red-200 ring-2 ring-red-600';
                      badgeStyle = 'bg-white text-red-600';
                    } else if (t.id === 'enviadas') {
                      activeStyle = 'bg-blue-600 text-white shadow-md shadow-blue-200 ring-2 ring-blue-600';
                      badgeStyle = 'bg-white text-blue-600';
                    }
                  } else {
                    activeStyle = 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50';
                  }

                  return (
                    <button 
                      key={t.id}
                      onClick={() => setCorrespondenciaTab(t.id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] md:text-xs font-black uppercase tracking-tight transition-all ${activeStyle}`}
                    >
                      {t.label}
                      {t.count > 0 && (
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${badgeStyle}`}>
                          {t.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Pesquisar por cidadão ou assunto..."
                  value={searchMail}
                  onChange={(e) => setSearchMail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3 md:py-3.5 text-xs md:text-sm font-bold text-slate-900 focus:ring-4 focus:ring-red-50 focus:bg-white focus:border-red-600 transition-all outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Message List */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredMessages.length > 0 ? (
                filteredMessages.map((item, index) => {
                  const activeColorClass = 
                    correspondenciaTab === 'naoLidas' ? 'bg-red-600' :
                    correspondenciaTab === 'lidas' ? 'bg-slate-400' : 'bg-red-900';
                  
                  const activeTextClass = 
                    correspondenciaTab === 'naoLidas' ? 'text-red-600' :
                    correspondenciaTab === 'lidas' ? 'text-slate-600' : 'text-red-900';

                  const activeBgLight = 
                    correspondenciaTab === 'naoLidas' ? 'bg-red-50' :
                    correspondenciaTab === 'lidas' ? 'bg-slate-50' : 'bg-red-50';

                  return (
                    <motion.button 
                      layout
                      key={item.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleSelectRequest(item)}
                      className="w-full text-left bg-white border border-slate-100 rounded-[28px] p-5 md:p-6 hover:border-red-200 hover:shadow-xl hover:shadow-slate-100 transition-all group relative overflow-hidden"
                    >
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${activeColorClass}`} />

                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-xl ${activeBgLight} flex items-center justify-center text-[10px] font-black ${activeTextClass} border border-black/5`}>
                              {item.user.substring(0, 3).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <strong className="text-slate-950 font-black text-sm md:text-lg italic tracking-tighter uppercase leading-none">{item.user}</strong>
                                {item.unread && <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.5)]" />}
                              </div>
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1">
                                {correspondenciaTab === 'enviadas' ? 'Cidadão Destinatário' : 'Remetente Autorizado'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="pl-13">
                            <h4 className="text-xs md:text-base font-black text-slate-800 line-clamp-1 mb-1 tracking-tight">
                              {item.subject}
                            </h4>
                            <p className="text-slate-600 text-[11px] md:text-sm font-medium line-clamp-1 leading-relaxed">
                              {item.preview}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right flex flex-col items-end gap-3 shrink-0">
                          <div className="flex items-center gap-1.5 font-black text-[9px] md:text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                            <Clock size={12} />
                            {item.date}
                          </div>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-slate-100 text-slate-400 group-hover:bg-red-600 group-hover:text-white">
                             <ArrowRight size={14} />
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-100 rounded-[40px] p-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-white rounded-[24px] flex items-center justify-center mx-auto shadow-sm text-slate-200">
                    <Mail size={32} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-600 italic tracking-tighter uppercase">Caixa Limpa</h4>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                      {searchMail ? `Nenhum resultado para "${searchMail}"` : 'Todas as comunicações foram processadas.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <motion.form 
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleSubmit}
            className="bg-white p-8 md:p-12 rounded-[48px] border border-slate-100 shadow-sm max-w-3xl"
          >
            <div className="flex items-center gap-3 mb-10">
               <div className="w-1.5 h-8 bg-red-600 rounded-full" />
               <h3 className="text-2xl font-black text-slate-950 italic tracking-tighter uppercase leading-none">Enviar Correio Oficial</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Destinatário (Nome)</label>
                <div className="relative">
                  <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    required
                    type="text"
                    placeholder="Nome do Cidadão"
                    value={formData.holder}
                    onChange={(e) => setFormData({...formData, holder: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-13 pr-5 py-5 font-black text-slate-900 focus:ring-4 focus:ring-red-50 focus:bg-white focus:border-red-600 outline-none transition-all placeholder:text-slate-300 italic"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Identificação (BI ou NIF)</label>
                <div className="relative">
                  <ShieldCheck size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    required
                    type="text"
                    placeholder="Ex: 001234567LA011"
                    value={formData.bi}
                    onChange={(e) => setFormData({...formData, bi: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-13 pr-5 py-5 font-black text-slate-900 focus:ring-4 focus:ring-red-50 focus:bg-white focus:border-red-600 outline-none transition-all placeholder:text-slate-300 uppercase"
                  />
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Assunto da Mensagem</label>
                <div className="relative">
                  <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    required
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-5 font-black text-slate-900 focus:ring-4 focus:ring-red-50 focus:bg-white focus:border-red-600 outline-none transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Corpo da Mensagem (Texto Oficial)</label>
                <textarea 
                  required
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-[32px] p-6 font-medium text-slate-900 focus:ring-4 focus:ring-red-50 focus:bg-white focus:border-red-600 outline-none transition-all text-sm leading-relaxed"
                />
              </div>

              {/* File Upload Area */}
              <div className="col-span-1 md:col-span-2 space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Anexo à Mensagem (Opcional)</label>
                {!selectedFile ? (
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files[0];
                      if (file) setSelectedFile(file);
                    }}
                    className={`relative border-2 border-dashed rounded-[32px] p-10 transition-all flex flex-col items-center justify-center text-center group ${
                      isDragging ? 'border-red-600 bg-red-50' : 'border-slate-100 hover:border-red-300 hover:bg-slate-50'
                    }`}
                  >
                    <input 
                      type="file" 
                      id="file-upload"
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setSelectedFile(file);
                      }}
                      accept=".pdf,.doc,.docx,.jpg,.png"
                    />
                    <label 
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all ${
                        isDragging ? 'bg-red-600 text-white scale-110 shadow-xl shadow-red-200' : 'bg-slate-50 text-slate-300 group-hover:bg-red-100 group-hover:text-red-500'
                      }`}>
                        <Upload size={28} />
                      </div>
                      <p className="text-base font-black text-slate-900 italic tracking-tighter uppercase mb-1">Arraste o ficheiro oficial</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">PDF ou Documentos Digitalizados (Máx. 16MB)</p>
                    </label>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-100 p-6 rounded-[32px] flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-red-200 border-2 border-white">
                        <Paperclip size={24} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900 truncate max-w-[240px] italic">{selectedFile.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                           <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Documento Pré-Validado</div>
                        </div>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="w-10 h-10 flex items-center justify-center bg-white text-slate-400 hover:text-red-600 rounded-xl transition-all shadow-sm border border-slate-100"
                    >
                      <X size={20} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-12 pt-10 border-t border-slate-50">
              <button 
                type="submit"
                className="w-full bg-red-600 text-white py-6 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-4 shadow-2xl shadow-red-100 hover:-translate-y-1 active:scale-95"
              >
                Criptografar e Enviar Correio
                <Send size={24} />
              </button>
              <div className="mt-6 flex items-center justify-center gap-3">
                 <div className="h-1 flex-1 bg-slate-50 rounded-full" />
                 <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] px-4 whitespace-nowrap">
                   Certificado Digital CDA v4.1
                 </p>
                 <div className="h-1 flex-1 bg-slate-50 rounded-full" />
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
