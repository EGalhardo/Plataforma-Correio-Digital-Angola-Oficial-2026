import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, 
  Search, 
  FileText, 
  Calendar, 
  Building2, 
  Download, 
  ExternalLink, 
  X, 
  Clock, 
  ShieldCheck, 
  User, 
  Check, 
  XCircle, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Document as DocumentType, DocRequest } from '../../types';

interface GovDocsContentProps {
  documents: DocumentType[];
  requests: DocRequest[];
  onUpdateStatus: (id: number, status: 'Aprovado' | 'Rejeitado') => void;
  setTab?: (tab: string) => void;
}

export function GovDocsContent({ documents, requests, onUpdateStatus, setTab }: GovDocsContentProps) {
  const [activeTab, setActiveTab] = useState<'Todos' | 'Emitidos' | 'Pendentes' | 'Rejeitados'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMetrics, setShowMetrics] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ id: string, message: string } | null>(null);

  const triggerFeedback = (message: string) => {
    const id = Math.random().toString(36);
    setActionFeedback({ id, message });
    setTimeout(() => {
      setActionFeedback(prev => prev?.id === id ? null : prev);
    }, 3000);
  };

  const handleAction = (id: number, status: 'Aprovado' | 'Rejeitado') => {
    onUpdateStatus(id, status);
    triggerFeedback(status === 'Aprovado' ? 'Documento homologado e emitido com sucesso!' : 'Emissão de documento rejeitada pelo sistema.');
  };

  // Metrics calculation
  const totalRequests = requests.length || 1;
  const approvedDocs = requests.filter(r => r.status === 'Aprovado').length + documents.length;
  const pendingDocs = requests.filter(r => r.status === 'Pendente').length;
  const rejectedDocs = requests.filter(r => r.status === 'Rejeitado').length;

  const emissionRate = 89.5; // Institutional default
  const validationRate = 91.2; // Institutional default
  const rejectionRate = 8.8; // Institutional default

  // Custom unified filter
  const unifiedList = useMemo(() => {
    const list: any[] = [];
    
    // Add processed documents
    documents.forEach(doc => {
      list.push({
        id: doc.code || 'DOC-GEN',
        userName: doc.holder || 'N/A',
        userBi: '001249...',
        docType: doc.name,
        date: doc.issuedAt,
        status: 'Aprovado',
        source: 'archive'
      });
    });

    // Add user requests
    requests.forEach(req => {
      // Avoid duplicating archived ones
      if (!list.some(d => d.id === req.id || (req.status === 'Aprovado' && d.docType === req.docType && d.userName === req.userName))) {
        list.push({
          id: req.id,
          userName: req.userName,
          userBi: req.userBi,
          docType: req.docType,
          date: req.date,
          status: req.status,
          source: 'request',
          aiStatus: req.aiStatus
        });
      }
    });

    return list;
  }, [documents, requests]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return unifiedList.filter(item => {
      // Filter by tab
      if (activeTab === 'Emitidos' && item.status !== 'Aprovado') return false;
      if (activeTab === 'Pendentes' && item.status !== 'Pendente') return false;
      if (activeTab === 'Rejeitados' && item.status !== 'Rejeitado') return false;

      // Filter by search text
      return (
        item.userName.toLowerCase().includes(term) ||
        item.userBi.toLowerCase().includes(term) ||
        item.docType.toLowerCase().includes(term) ||
        item.id.toString().toLowerCase().includes(term)
      );
    });
  }, [unifiedList, activeTab, searchTerm]);

  return (
    <div className="pb-32 md:pt-2 font-sans">
      {/* Feedback Toast */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10 backdrop-blur-xl"
          >
            <ShieldCheck size={18} className="text-emerald-500" />
            <span className="text-[11px] font-black uppercase tracking-widest">{actionFeedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-8 border-b border-slate-100 mb-8 font-sans">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none font-sans">
            Controle de Emissão Documental
          </h1>
          <div className="text-slate-400 font-black text-[9px] uppercase tracking-widest mt-1.5 flex items-center gap-2 italic">
            <div className="w-1 h-2 bg-red-650 rounded-full" />
            AGT &bull; Terminal de Rastreamento de Documentos de Angola
          </div>
        </div>
        
        <div className="flex items-center bg-white p-1 rounded-[22px] border border-slate-200 shadow-sm">
          {(['Todos', 'Emitidos', 'Pendentes', 'Rejeitados'] as const).map((tab) => {
            let count = unifiedList.length;
            if (tab === 'Emitidos') count = unifiedList.filter(t => t.status === 'Aprovado').length;
            if (tab === 'Pendentes') count = unifiedList.filter(t => t.status === 'Pendente').length;
            if (tab === 'Rejeitados') count = unifiedList.filter(t => t.status === 'Rejeitado').length;

            return (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-xl text-[9.5px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  activeTab === tab 
                    ? 'bg-white text-indigo-600 shadow-md border-0' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab}
                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black ${
                  activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-1 text-[10px] font-black uppercase tracking-widest">
        <button onClick={() => setTab?.('gov-dashboard')} className="cda-link-text">Voltar ao Painel</button>
        <button onClick={() => setTab?.('historico')} className="cda-link-text">Ver Histórico</button>
        <button onClick={() => setTab?.('notificacoes')} className="cda-link-text">Notificações</button>
        <button onClick={() => setShowMetrics(prev => !prev)} className="cda-link-text">
          {showMetrics ? 'Ocultar métricas' : 'Ver métricas de emissão'}
        </button>
      </div>

      {/* Metrics Section & Gauges */}
      {showMetrics && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 font-sans">
        
        {/* Metric 1: Emission Rate */}
        <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Taxa de Emissão</span>
            <div className="text-2xl font-black text-slate-900 italic font-mono">{emissionRate}%</div>
            <p className="text-[9.5px] text-slate-400 font-medium leading-relaxed">Emissões autorizadas vs requisições.</p>
          </div>
          <div className="w-14 h-14 relative shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="28" cy="28" r="23" className="stroke-slate-100 fill-none" strokeWidth="4.5" />
              <circle cx="28" cy="28" r="23" className="stroke-indigo-600 fill-none" strokeWidth="4.5"
                strokeDasharray="144.5" strokeDashoffset={144.5 * (1 - emissionRate / 100)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-black text-indigo-600">
              {Math.round(emissionRate)}%
            </div>
          </div>
        </div>

        {/* Metric 2: Validation Rate */}
        <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Taxa de Validação</span>
            <div className="text-2xl font-black text-emerald-600 italic font-mono">{validationRate}%</div>
            <p className="text-[9.5px] text-slate-400 font-medium leading-relaxed">Validação instantânea por inteligência artificial.</p>
          </div>
          <div className="w-14 h-14 relative shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="28" cy="28" r="23" className="stroke-slate-100 fill-none" strokeWidth="4.5" />
              <circle cx="28" cy="28" r="23" className="stroke-emerald-500 fill-none" strokeWidth="4.5"
                strokeDasharray="144.5" strokeDashoffset={144.5 * (1 - validationRate / 100)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-black text-emerald-600">
              {Math.round(validationRate)}%
            </div>
          </div>
        </div>

        {/* Metric 3: Rejection Rate */}
        <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Taxa de Rejeição</span>
            <div className="text-2xl font-black text-rose-600 italic font-mono">{rejectionRate}%</div>
            <p className="text-[9.5px] text-slate-400 font-medium leading-relaxed">Indeferidos por falhas documentais ou BI inválido.</p>
          </div>
          <div className="w-14 h-14 relative shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="28" cy="28" r="23" className="stroke-slate-100 fill-none" strokeWidth="4.5" />
              <circle cx="28" cy="28" r="23" className="stroke-rose-500 fill-none" strokeWidth="4.5"
                strokeDasharray="144.5" strokeDashoffset={144.5 * (1 - rejectionRate / 100)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-black text-rose-600">
              {Math.round(rejectionRate)}%
            </div>
          </div>
        </div>

      </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-2 border border-slate-200 rounded-[32px] shadow-sm mb-8 flex flex-col md:flex-row gap-3 font-sans">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Procurar por cidadão, número de bilhete ou tipo de documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-205 rounded-2xl pl-13 pr-5 py-3.5 font-bold text-slate-900 focus:border-slate-800 focus:bg-white outline-none transition-all text-xs"
          />
        </div>
        <div className="hidden md:flex items-center gap-3 px-6 italic border-l border-slate-100">
          <AlertCircle size={15} className="text-red-500" />
          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">Controlo Administrativo Unificado</span>
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        {filteredItems.length > 0 ? (
          filteredItems.map((item, idx) => (
            <div 
              key={item.id}
              className="bg-white p-4 md:p-5 rounded-[28px] border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-slate-350 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs ${
                  item.status === 'Pendente' ? 'bg-orange-50 text-orange-500 border-orange-100' : 
                  item.status === 'Aprovado' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 
                  'bg-red-50 text-red-500 border-red-100'
                }`}>
                  <FileText size={22} className={item.status === 'Pendente' ? 'animate-pulse' : ''} />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="font-black text-slate-950 text-base md:text-lg italic tracking-tight uppercase leading-none font-sans">{item.docType}</h3>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border ${
                      item.status === 'Pendente' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                      item.status === 'Aprovado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      'bg-red-50 text-red-600 border-red-100'
                    }`}>
                      {item.status === 'Aprovado' ? 'Emitido' : item.status}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                    <span>Requerente: <strong className="text-slate-850 font-sans">{item.userName}</strong></span>
                    <span>&bull;</span>
                    <span>NIF/BI: <strong className="font-mono text-slate-850">{item.userBi}</strong></span>
                    <span>&bull;</span>
                    <span>Código: <strong className="font-mono text-slate-800">{item.id}</strong></span>
                    <span>&bull;</span>
                    <span>Data: <strong className="font-mono text-slate-500">{item.date}</strong></span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {item.status === 'Pendente' ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleAction(item.id, 'Rejeitado')}
                    className="p-3 bg-white text-slate-400 border border-slate-205 hover:bg-rose-50 hover:text-red-650 hover:border-red-200 rounded-xl transition-colors shrink-0 cursor-pointer"
                    title="Rejeitar Emissão"
                  >
                    <XCircle size={15} />
                  </button>
                  <button 
                    onClick={() => handleAction(item.id, 'Aprovado')}
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9.5px] uppercase tracking-wider rounded-xl shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check size={14} fill="currentColor" strokeWidth={3} /> Homologar & Emitir
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-[9.5px] font-mono font-black uppercase text-slate-350 italic tracking-wider bg-white px-4 py-2.5 rounded-xl border border-slate-200 border-dashed">
                  Documento Sincronizado <ShieldCheck size={14} className="text-emerald-500 ml-1.5" />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px]">
            <Clock size={36} className="text-slate-300 mx-auto mb-4 animate-spin-slow" />
            <h4 className="text-lg font-black text-slate-400 uppercase italic">Nenhum documento arquivado</h4>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Nenhum registo oficial corresponde à pesquisa efectuada.</p>
          </div>
        )}
      </div>

    </div>
  );
}
