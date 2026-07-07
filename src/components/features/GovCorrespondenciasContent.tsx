import React, { useState, useMemo } from 'react';
import { useInstitutions } from '../../services/institutionStore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Mail, 
  MapPin, 
  Building2, 
  Filter, 
  SlidersHorizontal, 
  ChevronDown, 
  CheckCircle, 
  Inbox, 
  Send,
  Eye,
  X,
  FileText,
  Plus,
  AlertTriangle,
  Clock,
  Paperclip,
  RefreshCw,
  Archive,
  XCircle,
  User,
  ShieldCheck,
  AlertCircle,
  Cpu,
  Share2,
  ArrowLeft,
  Video
} from 'lucide-react';
import { Correspondence } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { VideoSessionPanel } from './VideoSessionPanel';

export interface GovCorrespondenciasContentProps {
  correspondences?: Correspondence[];
  onAddCorrespondence?: (newCor: Correspondence) => void;
  onUpdateStatus?: (id: string, newStatus: string) => void;
  onNavigate?: (tab: string) => void;
}

// Prepare Correspondence function: acts as a data normalizer / enhancer
const prepareCorrespondence = (c: Correspondence) => {
  // Normalize old statuses to match requested set: Enviada, Recebida, Em Análise, Respondida, Arquivada, Cancelada
  let status = c.status;
  if (status === 'Não Lida') status = 'Recebida';
  else if (status === 'Lida') status = 'Respondida';
  else if (status === 'Processando') status = 'Em Análise';
  else if (status === 'Bloqueada') status = 'Cancelada';
  
  // Safe default for standard options
  const validStatusList = ['Enviada', 'Recebida', 'Em Análise', 'Respondida', 'Arquivada', 'Cancelada'];
  if (!validStatusList.includes(status)) {
    status = 'Recebida';
  }

  // default category
  let category = c.category;
  if (!category) {
    if (c.institution === 'AGT') category = 'Finanças';
    else if (c.institution === 'SME') category = 'Segurança';
    else if (c.institution === 'Tribunal Supremo' || c.institution === 'Registo Civil' || c.institution === 'MINJUS') category = 'Justiça';
    else if (c.institution === 'ENDE' || c.institution === 'EPAL') category = 'Operações';
    else category = 'Geral';
  }

  // default dates & timelines
  const sentDate = c.sentDate || c.date;
  const receivedDate = c.receivedDate || (status !== 'Enviada' ? c.date : 'Pendente');
  const responseTime = c.responseTime || (status === 'Respondida' ? '18 horas' : status === 'Arquivada' ? '36 horas' : 'Pendente');
  const priority = c.priority || (c.id === 'CDA-90118' || c.id === 'CDA-77123' ? 'Alta' : c.id === 'CDA-88123' ? 'Média' : 'Baixa');
  
  // default attachments
  const attachments = c.attachments || [
    { name: `oficio_digitalizado_${c.id.toLowerCase()}.pdf`, size: '1.4 MB' }
  ];

  // default delay metric
  const isDelayed = c.isDelayed !== undefined ? c.isDelayed : (c.id === 'CDA-77123'); // Viana marked as delayed
  const delayDays = c.delayDays !== undefined ? c.delayDays : (isDelayed ? 4 : 0);

  // default operational timeline history
  const history = c.history || [
    { action: "Submissão Eletrónica no Barramento Governamental", dateTime: `${c.date} 09:15`, user: `${c.institution}_DELEGADO` },
    ...(status !== 'Enviada' ? [{ action: "Validação Digital pelo CDA Nacional", dateTime: `${c.date} 10:20`, user: "CDA_INTEGRADOR" }] : []),
    ...(status === 'Em Análise' ? [{ action: "Início de Auditoria Administrativa", dateTime: `${c.date} 14:05`, user: "AUDITOR_CDA" }] : []),
    ...(status === 'Respondida' ? [
      { action: "Resposta Elaborada pelo Ofício", dateTime: `${c.date} 15:30`, user: "OPERADOR_BALCAO" },
      { action: "Assinatura Digital de Envio Homologada", dateTime: `${c.date} 16:10`, user: "SUPERVISOR_GERAL" }
    ] : []),
    ...(status === 'Arquivada' ? [{ action: "Processo Arquivado com Sucesso", dateTime: `${c.date} 17:00`, user: "SISTEMA_ARQUIVO" }] : []),
    ...(status === 'Cancelada' ? [{ action: "Emissão Cancelada por Ordem Superior", dateTime: `${c.date} 11:55`, user: "SUPERVISOR_GERAL" }] : [])
  ];

  return {
    ...c,
    status,
    category,
    sentDate,
    receivedDate,
    responseTime,
    priority,
    attachments,
    history,
    isDelayed,
    delayDays
  };
};

export function GovCorrespondenciasContent({
  correspondences: propsCorrespondences,
  onAddCorrespondence,
  onUpdateStatus,
  onNavigate
}: GovCorrespondenciasContentProps) {
  const { currentLanguage, t } = useLanguage();
  const { institutions } = useInstitutions();
  const [showVideoPage, setShowVideoPage] = useState(false);
  const [localCorrespondences, setLocalCorrespondences] = useState<Correspondence[]>([]);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const rawCorrespondences = propsCorrespondences || localCorrespondences;

  // Enhance all correspondences with structured metadata
  const correspondences = useMemo(() => {
    return rawCorrespondences.map(prepareCorrespondence);
  }, [rawCorrespondences]);
  
  const handleAddCorrespondence = (newCor: Correspondence) => {
    if (onAddCorrespondence) {
      onAddCorrespondence(newCor);
    } else {
      setLocalCorrespondences(prev => [newCor, ...prev]);
    }
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    if (onUpdateStatus) {
      onUpdateStatus(id, newStatus);
    } else {
      setLocalCorrespondences(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    }
  };

  // State Management
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<string>('Todas');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Custom interactive mock attachments for dispatch modal
  const [dispatchAttachments, setDispatchAttachments] = useState<{ name: string; size: string }[]>([
    { name: 'documento_expediente_base.pdf', size: '1.2 MB' }
  ]);
  const [newAttachmentName, setNewAttachmentName] = useState('');

  // Forward Action State Inside Detail Modal
  const [isForwarding, setIsForwarding] = useState(false);
  const [forwardRecipient, setForwardRecipient] = useState('');
  const [forwardProvince, setForwardProvince] = useState('Luanda');

  // New Expediente Form State
  const [formData, setFormData] = useState({
    subject: '',
    sender: 'Ministério das Finanças (MINFIN)',
    recipient: 'Edlasio Galhardo',
    institution: 'AGT',
    originProvince: 'Luanda',
    destinationProvince: 'Benguela',
    body: 'Prezado Cidadão, sob a égide dos regulamentos integrados celeres, formalizamos o despacho do presente expediente eletrónico de correspondência governamental.',
    category: 'Finanças',
    priority: 'Alta',
    responseTime: '24 horas'
  });

  // Advanced Search Filters
  const [searchSender, setSearchSender] = useState('');
  const [searchRecipient, setSearchRecipient] = useState('');
  const [searchSubject, setSearchSubject] = useState('');
  const [searchOrigin, setSearchOrigin] = useState('Todas');
  const [searchDestination, setSearchDestination] = useState('Todas');
  const [searchCategory, setSearchCategory] = useState('Todas');
  const [searchPriority, setSearchPriority] = useState('Todas');
  const [filterDelayedOnly, setFilterDelayedOnly] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const provinces = ["Todas", "Luanda", "Benguela", "Huíla", "Cabinda", "Bengo", "Huambo"];
  const categoriesList = ["Todas", "Finanças", "Segurança", "Justiça", "Operações", "Saúde", "Educação", "Geral"];
  const prioritiesList = ["Todas", "Alta", "Média", "Baixa"];
  const availableStatuses = ['Todas', 'Enviada', 'Recebida', 'Em Análise', 'Respondida', 'Arquivada', 'Cancelada'];

  // Filter Logic
  const filteredCorrespondences = useMemo(() => {
    return correspondences.filter(item => {
      // Tab filter (Status)
      if (activeTab !== 'Todas' && item.status !== activeTab) return false;

      // Advanced search filters
      if (searchSender && !item.sender.toLowerCase().includes(searchSender.toLowerCase())) return false;
      if (searchRecipient && !item.recipient.toLowerCase().includes(searchRecipient.toLowerCase())) return false;
      if (searchSubject && !item.subject.toLowerCase().includes(searchSubject.toLowerCase())) return false;
      if (searchOrigin !== 'Todas' && item.originProvince !== searchOrigin) return false;
      if (searchDestination !== 'Todas' && item.destinationProvince !== searchDestination) return false;
      if (searchCategory !== 'Todas' && item.category !== searchCategory) return false;
      if (searchPriority !== 'Todas' && item.priority !== searchPriority) return false;
      if (filterDelayedOnly && !item.isDelayed) return false;

      return true;
    });
  }, [correspondences, activeTab, searchSender, searchRecipient, searchSubject, searchOrigin, searchDestination, searchCategory, searchPriority, filterDelayedOnly]);

  // Aggregate Statistics for operational telemetry cards
  const stats = useMemo(() => {
    const total = correspondences.length;
    const sent = correspondences.filter(c => c.status === 'Enviada').length;
    const received = correspondences.filter(c => c.status === 'Recebida').length;
    const analytical = correspondences.filter(c => c.status === 'Em Análise').length;
    const resolved = correspondences.filter(c => c.status === 'Respondida').length;
    const archived = correspondences.filter(c => c.status === 'Arquivada').length;
    const delayed = correspondences.filter(c => c.isDelayed).length;
    
    // Calculate simulated resolution rate
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    
    return {
      total,
      sent,
      received,
      analytical,
      resolved,
      archived,
      delayed,
      resolutionRate
    };
  }, [correspondences]);

  // Pagination Logic
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCorrespondences.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCorrespondences, currentPage]);

  const totalPages = Math.ceil(filteredCorrespondences.length / itemsPerPage) || 1;

  // Add mock attachment in dispatch form
  const handleAddNewAttachment = () => {
    if (!newAttachmentName.trim()) return;
    const extension = newAttachmentName.includes('.') ? '' : '.pdf';
    setDispatchAttachments(prev => [
      ...prev, 
      { name: `${newAttachmentName}${extension}`, size: '1.5 MB' }
    ]);
    setNewAttachmentName('');
  };

  // Remove mock attachment
  const handleRemoveAttachment = (indexToRemove: number) => {
    setDispatchAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Helper styling function to grab status specific colors
  const getStatusColorStyles = (status: string) => {
    switch(status) {
      case 'Enviada':
        return 'bg-blue-50 border-blue-150 text-blue-700';
      case 'Recebida':
        return 'bg-emerald-50 border-emerald-150 text-emerald-700';
      case 'Em Análise':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'Respondida':
        return 'bg-indigo-50 border-indigo-200 text-indigo-700';
      case 'Arquivada':
        return 'bg-slate-100 border-slate-200 text-slate-700';
      case 'Cancelada':
        return 'bg-rose-50 border-rose-200 text-rose-700';
      default:
        return 'bg-slate-50 border-slate-150 text-slate-700';
    }
  };

  const getPriorityColorStyles = (priority: string) => {
    if (priority === 'Alta') return 'bg-red-50 text-red-700 border-red-100';
    if (priority === 'Média') return 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  if (showVideoPage) {
    return (
      <div className="pb-32 font-sans animate-fadeIn">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-8 border-b border-slate-100 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowVideoPage(false)}
              className="w-10 h-10 md:w-12 md:h-12 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-2xl flex items-center justify-center transition-all active:scale-95 border border-slate-250 cursor-pointer"
              title="Voltar"
            >
              <ArrowLeft size={18} className="md:w-5 md:h-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none font-sans flex items-center gap-2">
                Video Atendimento
              </h1>
              <p className="text-slate-500 font-medium text-xs mt-1 max-w-xl">
                Canais de Conferência Governamental por Vídeo &bull; Centro de Videoatendimentos Ativos e Agendamentos
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[32px] p-6 md:p-8 shadow-xs">
          <VideoSessionPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32 font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-8 border-b border-slate-100 mb-8">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none font-sans flex items-center gap-2">
            Correspondências Digitais
          </h1>
          <p className="text-slate-500 font-medium text-xs mt-1 max-w-xl">
            Centro nacional de controlo e supervisão das comunicações digitais. Monitorização nacional e auditoria sistemática de tráfego administrativo seguro.
          </p>
          <div className="text-slate-400 font-mono text-[8.5px] uppercase tracking-widest mt-2.5 flex items-center gap-2 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
            VIGILÂNCIA DE COMUNICAÇÕES &bull; ASSINATURAS RECONHECIDAS
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button 
            type="button"
            onClick={() => setIsDispatchModalOpen(true)}
            className="w-full sm:w-auto bg-[#0E2B64] hover:bg-[#0E2B64]/90 text-white rounded-2xl px-5 py-3.5 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all text-xs font-black uppercase tracking-wider cursor-pointer border-0 outline-none"
            id="btn_novo_expediente"
          >
            <Plus size={15} /> Novo Expediente
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-1 text-[10px] font-black uppercase tracking-widest mb-6">
        <button onClick={() => setIsDispatchModalOpen(true)} className="cda-link-text">Novo Expediente</button>
        <button 
          onClick={() => setShowVideoPage(true)} 
          className="bg-indigo-50 hover:bg-indigo-150 text-indigo-755 border border-indigo-205 rounded-xl px-3.5 py-1.5 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer text-[10px] font-black uppercase tracking-widest"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          Video Atendimento
        </button>
        <button onClick={() => onNavigate?.('gov-docs')} className="cda-link-text">Emissão Documental</button>
        <button onClick={() => setShowTelemetry(prev => !prev)} className="cda-link-text">
          {showTelemetry ? 'Ocultar métricas operacionais' : 'Mostrar métricas operacionais'}
        </button>
      </div>

      {/* Operational Telemetry Cards / Monitorização Nacional */}
      {showTelemetry && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Metric Card */}
        <div id="stat_total" className="bg-white border border-slate-200 rounded-[24px] p-5 flex items-center gap-4 shadow-3xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900 shrink-0">
            <Mail size={18} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">TOTAL EXPEDIENTES</span>
            <span className="text-xl font-mono font-black text-slate-900 block mt-1 leading-none">{stats.total}</span>
            <span className="text-[10px] text-slate-450 font-bold block mt-1.5 leading-none">Registo Histórico Unificado</span>
          </div>
        </div>

        {/* Action Pending Metric Card */}
        <div id="stat_analise" className="bg-white border border-slate-200 rounded-[24px] p-5 flex items-center gap-4 shadow-3xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Clock size={18} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">EM TRATAMENTO / ANÁLISE</span>
            <span className="text-xl font-mono font-black text-amber-600 block mt-1 leading-none">{stats.analytical + stats.received}</span>
            <span className="text-[10px] text-slate-450 font-bold block mt-1.5 leading-none">Aguardando Despacho Final</span>
          </div>
        </div>

        {/* Resolution SLA Metric Card */}
        <div id="stat_eficiencia" className="bg-white border border-slate-200 rounded-[24px] p-5 flex items-center gap-4 shadow-3xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Cpu size={18} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">TAXA DE SUCESSO SLA</span>
            <span className="text-xl font-mono font-black text-indigo-600 block mt-1 leading-none">{stats.resolutionRate}%</span>
            <span className="text-[10px] text-slate-450 font-bold block mt-1.5 leading-none">Tempo Médio: ~18.5 horas</span>
          </div>
        </div>

        {/* Delays Alert Metric Card */}
        <div id="stat_atrasos" className={`border rounded-[24px] p-5 flex items-center gap-4 shadow-3xs transition-colors ${stats.delayed > 0 ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-200'}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${stats.delayed > 0 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
            <AlertTriangle size={18} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">EXPEDIENTES EM ATRASO</span>
            <span className={`text-xl font-mono font-black block mt-1 leading-none ${stats.delayed > 0 ? 'text-red-700' : 'text-slate-900'}`}>{stats.delayed}</span>
            <span className="text-[10px] text-slate-450 font-bold block mt-1.5 leading-none">Identificação Ativa de Atrasos</span>
          </div>
        </div>
      </div>
      )}

      {/* Advanced Search & Grid Filters */}
      <div className="bg-white border border-slate-200 rounded-[24px] p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-indigo-600" />
            <h3 className="text-[11px] font-black uppercase text-slate-900 tracking-wider">
              Pesquisa Avançada & Filtros de Auditoria
            </h3>
          </div>
          <div className="flex items-center gap-4">
            {/* Quick Delay Filter Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={filterDelayedOnly} 
                onChange={(e) => setFilterDelayedOnly(e.target.checked)}
                className="rounded text-red-600 border-slate-300 focus:ring-red-500 w-3.5 h-3.5"
              />
              <span className="text-[10px] font-black uppercase text-red-600 tracking-wider">Ver Apenas Atrasados</span>
            </label>

            <button 
              onClick={() => setShowAdvanced(!showAdvanced)} 
              className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1.5 border-0 bg-transparent cursor-pointer"
            >
              {showAdvanced ? 'Recolher Filtros' : 'Filtros Geográficos'}
              <ChevronDown size={12} className={`transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Remetente</label>
            <div className="relative">
              <input 
                type="text" 
                value={searchSender} 
                onChange={(e) => setSearchSender(e.target.value)} 
                placeholder="Ex: AGT, SME, MINFIN..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-[11px] font-bold text-slate-800 outline-none focus:border-slate-850"
              />
              <Building2 size={13} className="text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Destinatário</label>
            <div className="relative">
              <input 
                type="text" 
                value={searchRecipient} 
                onChange={(e) => setSearchRecipient(e.target.value)} 
                placeholder="Ex: Cidadão / Beneficiário..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-[11px] font-bold text-slate-800 outline-none focus:border-slate-850"
              />
              <Search size={13} className="text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assunto do Expediente</label>
            <div className="relative">
              <input 
                type="text" 
                value={searchSubject} 
                onChange={(e) => setSearchSubject(e.target.value)} 
                placeholder="Assunto ou termo chave..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-[11px] font-bold text-slate-800 outline-none focus:border-slate-850"
              />
              <Mail size={13} className="text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div className="space-y-1 col-span-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Categoria de Matéria</label>
            <select
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-slate-800 cursor-pointer"
            >
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat === 'Todas' ? 'Todas Categoria' : cat}</option>
              ))}
            </select>
          </div>
        </div>

        {showAdvanced && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100"
          >
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Província de Origem</label>
              <select
                value={searchOrigin}
                onChange={(e) => setSearchOrigin(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-slate-800 focus:bg-white cursor-pointer"
              >
                {provinces.map(prov => (
                  <option key={prov} value={prov}>{prov === 'Todas' ? 'Todas as Províncias' : prov}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Província de Destino</label>
              <select
                value={searchDestination}
                onChange={(e) => setSearchDestination(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-slate-800 focus:bg-white cursor-pointer"
              >
                {provinces.map(prov => (
                  <option key={prov} value={prov}>{prov === 'Todas' ? 'Todas as Províncias' : prov}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prioridade SLA</label>
              <select
                value={searchPriority}
                onChange={(e) => setSearchPriority(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-slate-800 focus:bg-white cursor-pointer"
              >
                {prioritiesList.map(pr => (
                  <option key={pr} value={pr}>{pr === 'Todas' ? 'Todas as Prioridades' : pr}</option>
                ))}
              </select>
            </div>
          </motion.div>
        )}
      </div>

      {/* Tabs Filter matching standard government color styles */}
      <div className="flex items-center overflow-x-auto gap-1 border-b border-slate-200 mb-6 pb-2 scrollbar-none">
        {availableStatuses.map((tab) => {
          const count = tab === 'Todas' 
            ? filteredCorrespondences.length 
            : correspondences.filter(c => c.status === tab).length;
          
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 border-b-2 rounded-t-xl text-[10px] font-extrabold uppercase tracking-widest transition-all whitespace-nowrap border-r-0 border-l-0 border-t-0 cursor-pointer ${
                activeTab === tab 
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/20' 
                  : 'border-transparent text-slate-450 hover:text-slate-750 hover:bg-slate-55'
              }`}
            >
              {tab === 'Todas' ? 'Todos Expedientes' : tab}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-[8.5px] font-mono leading-none ${
                activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tabular/List Layout representing professional system design */}
      <div className="space-y-6">
        {paginatedItems.length > 0 ? (
          <div className="overflow-x-auto rounded-[24px] bg-white border border-slate-200 shadow-3xs max-h-[650px] custom-scrollbar">
            <table className="mobile-data-table w-full text-left border-collapse min-w-[1100px]">
              <thead className="sticky top-0 z-15 bg-[#0E2B64] border-b border-[#0E2B64]/90 text-white text-[9.5px] font-black uppercase tracking-widest">
                <tr>
                  <th className="py-4.5 px-6">Identificador & data</th>
                  <th className="py-4.5 px-5">Emissor / Remetente</th>
                  <th className="py-4.5 px-5">Beneficiário / Destinatário</th>
                  <th className="py-4.5 px-5">Assunto &amp; Matéria</th>
                  <th className="py-4.5 px-5 text-center">Prioridade</th>
                  <th className="py-4.5 px-5 text-center">Estado</th>
                  <th className="py-4.5 px-5 text-center">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-all font-sans">
                    {/* ID & Date */}
                    <td className="py-4.5 px-6 font-bold text-slate-900">
                      <div className="space-y-1">
                        <span className="font-mono text-[9px] font-black text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md inline-block">
                          {item.id}
                        </span>
                        <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                          <Clock size={10} />
                          <span>{item.sentDate}</span>
                        </div>
                      </div>
                    </td>

                    {/* Sender / Issuer */}
                    <td className="py-4.5 px-5 font-bold">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider font-mono">
                            {item.institution}
                          </span>
                          <span className="text-[10.5px] font-mono font-black text-indigo-650 tracking-wider">
                            {t(item.category || '')}
                          </span>
                        </div>
                        <span className="font-sans font-extrabold text-[11px] text-slate-805 uppercase tracking-tight block truncate max-w-[200px]" title={t(item.sender)}>
                          {t(item.sender)}
                        </span>
                      </div>
                    </td>

                    {/* Recipient */}
                    <td className="py-4.5 px-5 font-bold text-slate-700">
                      <div className="flex items-center gap-1.5 font-sans">
                        <User size={12} className="text-slate-400 shrink-0" />
                        <div className="space-y-0.5">
                          <span className="text-[11.5px] font-extrabold text-slate-800 tracking-tight block truncate max-w-[180px]">{t(item.recipient)}</span>
                          <span className="text-[9.5px] font-mono text-slate-400 font-bold block">{t(item.destinationProvince || '')}</span>
                        </div>
                      </div>
                    </td>

                    {/* Subject & Summary */}
                    <td className="py-4.5 px-5 max-w-[280px]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-sans font-black text-slate-800 text-[11.5px] tracking-tight truncate line-clamp-1">
                            {t(item.subject)}
                          </h4>
                          {item.attachments && item.attachments.length > 0 && (
                            <div className="flex items-center gap-0.5 text-slate-400 shrink-0" title={`${item.attachments.length} anexo(s)`}>
                              <Paperclip size={10} className="stroke-[2.5]" />
                              <span className="text-[8.5px] font-extrabold font-mono">{item.attachments.length}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-slate-400 font-medium text-[9.5px] leading-relaxed line-clamp-1">
                          {t(item.body || '')}
                        </p>
                      </div>
                    </td>

                    {/* Priority / Delay Visual Flags */}
                    <td className="py-4.5 px-5 text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 border rounded-full text-[8px] font-black uppercase tracking-wider ${getPriorityColorStyles(item.priority)}`}>
                          {t(item.priority || '')}
                        </span>
                        {item.isDelayed && (
                          <span className="bg-red-100 border border-red-200 text-red-700 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md animate-pulse">
                            {t("Atrasado")} {item.delayDays}D
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status badge with animated pulse helper */}
                    <td className="py-4.5 px-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase border tracking-wider select-none ${getStatusColorStyles(item.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.status === 'Respondida' || item.status === 'Recebida' ? 'bg-emerald-500' :
                          item.status === 'Em Análise' ? 'bg-amber-500 animate-pulse' :
                          item.status === 'Enviada' ? 'bg-blue-500' :
                          item.status === 'Arquivada' ? 'bg-slate-400' : 'bg-rose-500'
                        }`} />
                        {t(item.status || '')}
                      </span>
                    </td>

                    {/* Actions button */}
                    <td className="py-4.5 px-5 text-center">
                      <button 
                        onClick={() => {
                          setSelectedLetter(item);
                          setIsForwarding(false);
                        }}
                        className="py-1.5 px-3 bg-[#0c2340] hover:bg-slate-800 border-0 rounded-xl text-[9px] font-black uppercase text-white tracking-widest transition-colors cursor-pointer inline-flex items-center gap-1"
                        title="Abrir Auditoria / Ficha de Correspondência"
                      >
                        <Eye size={12} /> Ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 bg-white border border-slate-200 rounded-[32px] text-center text-slate-400 italic font-sans shadow-3xs text-xs">
            Nenhuma correspondência governamental corresponde aos filtros de supervisão aplicados.
          </div>
        )}

        {/* List Pagination Footer */}
        {totalPages > 1 && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-5 flex items-center justify-between text-[10.5px] font-black uppercase tracking-wide shadow-3xs">
            <span className="text-slate-400 font-medium">Página {currentPage} de {totalPages}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl disabled:opacity-50 transition-colors cursor-pointer inline-flex items-center"
              >
                Anterior
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl disabled:opacity-50 transition-colors cursor-pointer inline-flex items-center"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail & Administrative Audit Modal */}
      <AnimatePresence>
        {selectedLetter && (
          <>
            <motion.div 
              initial={{ bgOpacity: 0, opacity: 0 }}
              animate={{ bgOpacity: 1, opacity: 1 }}
              exit={{ bgOpacity: 0, opacity: 0 }}
              onClick={() => setSelectedLetter(null)}
              className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs z-[600]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-2xl bg-white rounded-[32px] overflow-hidden shadow-2xl z-[601] border border-slate-100 max-h-[92vh] overflow-y-auto custom-scrollbar"
            >
              {/* Modal Banner Header */}
              <div className="bg-[#0c2340] text-indigo-100 p-6 relative">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center font-mono font-black text-sm uppercase text-white shadow-inner select-none border border-white/15">
                    {selectedLetter.institution.slice(0, 3)}
                  </div>
                  <div>
                    <span className="text-[9px] font-black tracking-widest uppercase text-indigo-300 block leading-none">
                      {t("Centro de Fiscalização Governamental e Interoperabilidade")}
                    </span>
                    <h3 className="text-base md:text-lg font-black uppercase tracking-tight text-white mt-1.5 border-0 leading-none">
                      {t("Ofício Código:")} {selectedLetter.id}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1.5 block">
                      {t("Matéria:")} <span className="font-mono text-indigo-300 uppercase">{t(selectedLetter.category || '')}</span> &bull; {t("Trânsito:")} {t(selectedLetter.originProvince || '')} &rarr; {t(selectedLetter.destinationProvince || '')}
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setSelectedLetter(null)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white border-0 rounded-full p-2.5 cursor-pointer transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 md:p-8 space-y-6">
                
                {/* Meta details grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Participant Information */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 text-slate-900 border-b border-slate-100 pb-1.5">
                      <User size={13} className="stroke-[2.5] text-indigo-650" />
                      <span className="font-black text-[10px] uppercase tracking-wider block">{t("Dados Básicos & Roteamento")}</span>
                    </div>

                    <div className="space-y-3.5 text-[11px] font-medium text-slate-600">
                      <div>
                        <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{t("Entidade Emissora / Remetente")}</span>
                        <span className="font-black text-slate-800 block text-xs uppercase">{t(selectedLetter.sender)}</span>
                      </div>

                      <div>
                        <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block mb-0.5 font-sans">{t("Beneficiário Final / Destinatário")}</span>
                        <span className="font-black text-slate-850 block text-xs">{t(selectedLetter.recipient)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                        <div>
                          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{t("Data de Envio (CDA)")}</span>
                          <span className="font-mono font-extrabold text-slate-750">{selectedLetter.sentDate}</span>
                        </div>
                        <div>
                          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{t("Data Receção (CDA)")}</span>
                          <span className="font-mono font-extrabold text-slate-750">{selectedLetter.receivedDate}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                        <div>
                          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{t("Tempo de Resposta SLA")}</span>
                          <span className="font-mono font-extrabold text-slate-750">{t(selectedLetter.responseTime || '')}</span>
                        </div>
                        <div>
                          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{t("Prioridade de Auditoria")}</span>
                          <span className={`font-mono font-extrabold px-2 py-0.5 rounded text-[9px] border inline-block select-none ${getPriorityColorStyles(selectedLetter.priority)}`}>
                            {t(selectedLetter.priority || '')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operational Timeline / Consulta de histórico */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 text-slate-900 border-b border-slate-100 pb-1.5">
                      <SlidersHorizontal size={13} className="stroke-[2.5] text-indigo-650" />
                      <span className="font-black text-[10px] uppercase tracking-wider block">{t("Auditoria & Historial de Tráfego")}</span>
                    </div>

                    <div className="space-y-3.5 max-h-[190px] overflow-y-auto pr-1 custom-scrollbar">
                      {selectedLetter.history && selectedLetter.history.map((log: any, index: number) => (
                        <div key={index} className="flex gap-2 text-[10.5px] relative pl-4 border-l border-slate-200 last:border-l-0 pb-3">
                          <div className="w-2 h-2 rounded-full bg-indigo-600 absolute -left-1 top-1.5" />
                          <div className="space-y-0.5">
                            <p className="font-black text-slate-750 leading-none">{t(log.action || '')}</p>
                            <div className="flex items-center gap-2 text-[8px] font-mono text-slate-400 uppercase">
                              <span>Inst: {log.user}</span>
                              <span>&bull;</span>
                              <span>{log.dateTime}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Attachments Section */}
                    {selectedLetter.attachments && selectedLetter.attachments.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">{t("Documentos Anexados")} ({selectedLetter.attachments.length})</span>
                        <div className="grid grid-cols-1 gap-1.5">
                          {selectedLetter.attachments.map((file: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-150 rounded-xl text-[10.5px]">
                              <div className="flex items-center gap-2 truncate">
                                <FileText size={13} className="text-slate-400 shrink-0" />
                                <span className="font-bold text-slate-800 truncate" title={file.name}>{t(file.name)}</span>
                              </div>
                              <span className="font-mono text-[9px] text-slate-400 pr-1 shrink-0">{file.size}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Body Message Display */}
                <div className="bg-slate-50 border border-slate-200/50 p-5 rounded-2xl">
                  <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block mb-2 leading-none">{t("Corpo / Teor da Comunicação")}</span>
                  <p className="text-slate-705 leading-relaxed text-xs">{t(selectedLetter.body)}</p>
                </div>

                {/* Cryptographic Integrity seals (Auditoria de Mensagens) */}
                <div className="p-3 bg-indigo-50/10 border border-indigo-100/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[9px] font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                    <span>Selo Verificado: <strong className="text-slate-700">SHA256:8f9cb7...25ea</strong></span>
                  </div>
                  <div className="text-indigo-650 font-bold uppercase tracking-wider">
                    Assinatura Coletiva Válida &bull; Diário da República
                  </div>
                </div>

                {/* Reencaminhamento Action Form */}
                <div className="border-t border-slate-100 pt-4">
                  {isForwarding ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-3"
                    >
                      <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-wider">Configurações de Reencaminhamento Síncrono</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="grid gap-1">
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest">Novo Destinatário (Cidadão / Entidade)</span>
                          <input 
                            type="text"
                            value={forwardRecipient}
                            onChange={(e) => setForwardRecipient(e.target.value)}
                            placeholder="Nome completo..."
                            className="p-2 border border-slate-200 bg-white rounded-xl font-bold text-xs outline-none focus:border-indigo-600"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest">Nova Província de Destino</span>
                          <select
                            value={forwardProvince}
                            onChange={(e) => setForwardProvince(e.target.value)}
                            className="p-2 border border-slate-200 bg-white rounded-xl font-bold text-xs outline-none focus:border-indigo-600 cursor-pointer"
                          >
                            {provinces.filter(p => p !== 'Todas').map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button 
                          onClick={() => setIsForwarding(false)}
                          className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-350 text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer border-0"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={() => {
                            if (!forwardRecipient.trim()) {
                              alert('Por favor insira um destinatário para reencaminhar.');
                              return;
                            }
                            // Append to timeline log & update details
                            const logEntry = {
                              action: `Reencaminhado para ${forwardRecipient} (${forwardProvince})`,
                              dateTime: new Date().toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                              user: "OPERADOR_AUDITOR"
                            };

                            // Mutate locally or update via state
                            selectedLetter.recipient = forwardRecipient;
                            selectedLetter.destinationProvince = forwardProvince;
                            selectedLetter.history = [logEntry, ...selectedLetter.history];
                            
                            // Trigger callback to persist state
                            handleUpdateStatus(selectedLetter.id, selectedLetter.status); 

                            setIsForwarding(false);
                            setForwardRecipient('');
                          }}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer border-0"
                        >
                          Efetuar Reencaminhamento
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <button 
                      onClick={() => {
                        setForwardRecipient(selectedLetter.recipient);
                        setForwardProvince(selectedLetter.destinationProvince);
                        setIsForwarding(true);
                      }}
                      className="px-4.5 py-2.5 bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-indigo-750 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer font-sans flex items-center gap-1.5"
                    >
                      <Share2 size={12} /> Reencaminhar Comunicação
                    </button>
                  )}
                </div>

                {/* Administrative Intervention Control panel (Estados: Enviada, Recebida, Em Análise, Respondida, Arquivada, Cancelada) */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block mb-1">Intervenção Administrativa Direta de Supervisão</span>
                  <div className="flex flex-wrap gap-2">
                    
                    {/* Status change block */}
                    {selectedLetter.status !== 'Em Análise' && (
                      <button
                        onClick={() => {
                          const logEntry = {
                            action: `Instaurado em regime de Análise Administrativa`,
                            dateTime: new Date().toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                            user: "FISCAL_CDA"
                          };
                          selectedLetter.status = 'Em Análise';
                          selectedLetter.history = [logEntry, ...selectedLetter.history];
                          handleUpdateStatus(selectedLetter.id, 'Em Análise');
                        }}
                        className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-[9px] font-black uppercase tracking-wider cursor-pointer"
                      >
                        Iniciar Análise
                      </button>
                    )}

                    {selectedLetter.status !== 'Respondida' && (
                      <button
                        onClick={() => {
                          const logEntry = {
                            action: `Assinalado como Respondido e Concluído pelo Ofício`,
                            dateTime: new Date().toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                            user: "DIRETOR_CDA"
                          };
                          selectedLetter.status = 'Respondida';
                          selectedLetter.history = [logEntry, ...selectedLetter.history];
                          handleUpdateStatus(selectedLetter.id, 'Respondida');
                        }}
                        className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[9px] font-black uppercase tracking-wider cursor-pointer"
                      >
                        Marcar Respondida
                      </button>
                    )}

                    {selectedLetter.status !== 'Arquivada' && (
                      <button
                        onClick={() => {
                          const logEntry = {
                            action: `Processo Arquivado Compulsoriamente`,
                            dateTime: new Date().toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                            user: "AUDITOR_CDA"
                          };
                          selectedLetter.status = 'Arquivada';
                          selectedLetter.history = [logEntry, ...selectedLetter.history];
                          handleUpdateStatus(selectedLetter.id, 'Arquivada');
                        }}
                        className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-wider cursor-pointer"
                      >
                        Arquivar Expediente
                      </button>
                    )}

                    {selectedLetter.status !== 'Cancelada' && (
                      <button
                        onClick={() => {
                          const logEntry = {
                            action: `Ordem de Emissão Cancelada por Anomalia de Dados`,
                            dateTime: new Date().toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                            user: "SUPERVISOR_GERAL"
                          };
                          selectedLetter.status = 'Cancelada';
                          selectedLetter.history = [logEntry, ...selectedLetter.history];
                          handleUpdateStatus(selectedLetter.id, 'Cancelada');
                        }}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[9px] font-black uppercase tracking-wider cursor-pointer"
                      >
                        Cancelar Expediente
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedLetter(null)}
                    className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-colors cursor-pointer border-0"
                  >
                    Fechar Auditoria
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dispatch Modal / Registrar Nova Correspondência */}
      <AnimatePresence>
        {isDispatchModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDispatchModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[600]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-xl bg-white rounded-[32px] overflow-hidden shadow-2xl z-[601] border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="bg-[#0c2340] text-white p-6 relative">
                <span className="text-[9px] font-mono tracking-widest uppercase text-indigo-300 font-bold block">Expedição Administrativa Segura</span>
                <h3 className="text-base font-black uppercase italic tracking-tight text-white mt-1 mb-0">Despachar Novo Ofício Real-Time</h3>
                <button 
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="absolute right-6 top-6 bg-white/10 hover:bg-white/20 text-white border-0 rounded-full p-2 cursor-pointer transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!formData.subject.trim() || !formData.body.trim()) {
                    alert('Por favor preencha o assunto e o corpo oficial do ofício.');
                    return;
                  }
                  
                  const codeNumber = Math.floor(10000 + Math.random() * 90000);
                  const today = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  
                  const newLetter: Correspondence = {
                    id: `CDA-${codeNumber}`,
                    sender: formData.sender,
                    recipient: formData.recipient,
                    subject: formData.subject,
                    originProvince: formData.originProvince,
                    destinationProvince: formData.destinationProvince,
                    institution: formData.institution,
                    status: 'Enviada', // Default state when dispatched
                    date: today,
                    body: formData.body,
                    category: formData.category,
                    sentDate: today,
                    receivedDate: 'Pendente',
                    responseTime: formData.responseTime,
                    priority: formData.priority,
                    attachments: dispatchAttachments,
                    isDelayed: false,
                    delayDays: 0,
                    history: [
                      { 
                        action: "Submissão Síncrona Digital", 
                        dateTime: `${today} 09:00`, 
                        user: `${formData.institution}_INTEGRADO` 
                      }
                    ]
                  };

                  handleAddCorrespondence(newLetter);
                  setIsDispatchModalOpen(false);

                  // Reset states
                  setDispatchAttachments([{ name: 'documento_expediente_base.pdf', size: '1.2 MB' }]);
                  setFormData({
                    subject: '',
                    sender: 'Ministério das Finanças (MINFIN)',
                    recipient: 'Edlasio Galhardo',
                    institution: 'AGT',
                    originProvince: 'Luanda',
                    destinationProvince: 'Benguela',
                    body: 'Prezado Cidadão, sob a égide dos regulamentos integrados celeres, formalizamos o despacho do presente expediente eletrónico de correspondência governamental.',
                    category: 'Finanças',
                    priority: 'Alta',
                    responseTime: '24 horas'
                  });
                }}
                className="p-6 md:p-8 space-y-4 text-slate-755 font-sans"
              >
                {/* Inputs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="grid gap-1">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Órgão Emissor / Remetente</span>
                    <input 
                      type="text"
                      className="border border-slate-200 bg-slate-50/50 rounded-xl p-3 text-xs font-bold outline-none focus:border-indigo-650 focus:bg-white text-slate-900"
                      value={formData.sender}
                      onChange={(e) => setFormData(prev => ({ ...prev, sender: e.target.value }))}
                      required
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Sigla da Instituição</span>
                    <select
                      className="border border-slate-200 bg-slate-50/50 rounded-xl p-3 text-xs font-bold outline-none focus:border-indigo-655 focus:bg-white text-slate-900 cursor-pointer"
                      value={formData.institution}
                      onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))}
                    >
                      {institutions.map(inst => (
                        <option key={inst.id} value={inst.name}>{inst.name}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="grid gap-1">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Cidadão Destinatário</span>
                    <input 
                      type="text"
                      className="border border-slate-200 bg-slate-50/50 rounded-xl p-3 text-xs font-bold outline-none focus:border-indigo-655 focus:bg-white text-slate-900"
                      value={formData.recipient}
                      onChange={(e) => setFormData(prev => ({ ...prev, recipient: e.target.value }))}
                      placeholder="Edlasio Galhardo"
                      required
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Assunto Principal</span>
                    <input 
                      type="text"
                      className="border border-slate-200 bg-slate-50/50 rounded-xl p-3 text-xs font-bold outline-none focus:border-indigo-655 focus:bg-white text-slate-900"
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Ex: Deferimento de Credencial Aduaneira"
                      required
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="grid gap-1">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Categoria</span>
                    <select
                      className="border border-slate-200 bg-slate-50/50 rounded-xl p-3 text-xs font-bold outline-none focus:border-indigo-655 focus:bg-white text-slate-900 cursor-pointer"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="Finanças">Finanças</option>
                      <option value="Segurança">Segurança</option>
                      <option value="Justiça">Justiça</option>
                      <option value="Operações">Operações</option>
                      <option value="Saúde">Saúde</option>
                      <option value="Educação">Educação</option>
                      <option value="Geral">Geral</option>
                    </select>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">SLA Resposta</span>
                    <select
                      className="border border-slate-200 bg-slate-50/50 rounded-xl p-3 text-xs font-bold outline-none focus:border-indigo-655 focus:bg-white text-slate-900 cursor-pointer"
                      value={formData.responseTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, responseTime: e.target.value }))}
                    >
                      <option value="12 horas">12 horas</option>
                      <option value="24 horas">24 horas</option>
                      <option value="48 horas">48 horas</option>
                      <option value="7 dias">7 dias</option>
                    </select>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Prioridade</span>
                    <select
                      className="border border-slate-200 bg-slate-50/50 rounded-xl p-3 text-xs font-bold outline-none focus:border-indigo-655 focus:bg-white text-slate-900 cursor-pointer"
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                    >
                      <option value="Alta">Alta</option>
                      <option value="Média">Média</option>
                      <option value="Baixa">Baixa</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="grid gap-1">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Província Origem</span>
                    <select
                      className="border border-slate-200 bg-slate-50/50 rounded-xl p-3 text-xs font-bold outline-none focus:border-indigo-655 focus:bg-white text-slate-900 cursor-pointer"
                      value={formData.originProvince}
                      onChange={(e) => setFormData(prev => ({ ...prev, originProvince: e.target.value }))}
                    >
                      {provinces.filter(p => p !== 'Todas').map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Província Destino</span>
                    <select
                      className="border border-slate-200 bg-slate-50/50 rounded-xl p-3 text-xs font-bold outline-none focus:border-indigo-655 focus:bg-white text-slate-900 cursor-pointer"
                      value={formData.destinationProvince}
                      onChange={(e) => setFormData(prev => ({ ...prev, destinationProvince: e.target.value }))}
                    >
                      {provinces.filter(p => p !== 'Todas').map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="grid gap-1">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Teor / Conteúdo da Comunicação Oficial</span>
                  <textarea 
                    rows={3}
                    className="border border-slate-200 bg-slate-50/50 rounded-xl p-3 text-xs font-medium outline-none focus:border-indigo-655 focus:bg-white text-slate-900 leading-relaxed resize-none"
                    value={formData.body}
                    onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                    required
                  />
                </label>

                {/* Simulated file uploader picker and attachment list (Anexos) */}
                <div className="space-y-2 border border-slate-205 bg-slate-50/30 p-4 rounded-2xl">
                  <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block leading-none">Anexos do Expediente</span>
                  
                  {/* Mock file drop zone / pick */}
                  <div className="flex gap-2 items-center">
                    <input 
                      type="text"
                      className="flex-1 border border-slate-200 bg-white rounded-xl p-2.5 text-xs outline-none focus:border-indigo-655 text-slate-800 font-medium"
                      value={newAttachmentName}
                      onChange={(e) => setNewAttachmentName(e.target.value)}
                      placeholder="Nome do anexo (ex: comprovativo_fiscal)"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewAttachment}
                      className="px-4 py-2.5 bg-[#4f46e5]/10 hover:bg-[#4f46e5]/20 border border-[#4f46e5]/20 text-[#4f46e5] rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Anexar
                    </button>
                  </div>

                  {/* List of current added attachments with remove buttons */}
                  {dispatchAttachments.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {dispatchAttachments.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-150 rounded-xl text-[10.5px]">
                          <span className="font-bold text-slate-800 truncate pr-1" title={f.name}>{f.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] text-slate-400">{f.size}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(idx)}
                              className="bg-transparent border-0 text-red-500 hover:text-red-700 font-black cursor-pointer p-0.5 leading-none text-xs"
                              title="Remover anexo"
                            >
                              &times;
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form submit/cancel actions */}
                <div className="pt-4 flex gap-3">
                  <button 
                    type="submit"
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 px-4 rounded-xl text-xs uppercase tracking-widest transition-all border-0 flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    id="submit_novo_expediente"
                  >
                    <Send size={12} /> Despachar Ofício
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsDispatchModalOpen(false)}
                    className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-widest rounded-xl transition-all border-0 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
