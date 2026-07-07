import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  Mail,
  FileText,
  Send,
  Clock,
  ArrowRight,
  RefreshCcw,
  X,
  Activity,
  Database,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  MapPin,
  User,
  Shield,
  Scan,
  Fingerprint,
  Lock,
  ShieldAlert,
  UserCheck,
  Plus,
  FolderArchive,
  Ban,
  Share2,
  Search,
  Brain,
  QrCode,
  Bell,
  Building2,
  Users,
  Video,
} from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label as RechartsLabel,
} from "recharts";

import { Document, AppMode, UserRequest, VideoSession, VideoSessionEvent } from "../../types";
import { GOV_HIGHLIGHT_SLIDES } from "../../constants/data";
import { useInstitutions } from "../../services/institutionStore";
import { VideoSessionService } from "../../services/videoSessionService";
import { LazyImage } from "../ui/LazyImage";
import { AnimatedCounter } from "../ui/AnimatedCounter";

interface Institution {
  name: string;
  status: "online" | "manutenção" | "offline";
  delay: string;
  baseDelay: number;
}

interface ProvinceData {
  name: string;
  count: number;
  id: string;
}

interface GovDashboardProps {
  onNavigate?: (tabId: string) => void;
  documents?: Document[];
  emergencyMode?: boolean;
  userRequests?: UserRequest[];
  isMobile?: boolean;
  logSecurityEvent?: (action: string, type: 'info' | 'warning' | 'critical' | 'success') => void;
  bi?: string;
  setBi?: (val: string) => void;
  profileName?: string;
  setProfileName?: (val: string) => void;
  userBirthDate?: string;
  setUserBirthDate?: (val: string) => void;
  userFiliation?: string;
  setUserFiliation?: (val: string) => void;
  userMaritalStatus?: string;
  setUserMaritalStatus?: (val: string) => void;
  addAuditLog?: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
}

export interface QueueItem {
  id: string;
  citizenName: string;
  biNumber: string;
  documentType: string;
  institution: string;
  date: string;
  status: 'Pendente' | 'Assinado' | 'Aprovado' | 'Rejeitado' | 'Encaminhado' | 'Arquivado' | 'Expirado';
  priority: 'normal' | 'urgente' | 'critica' | 'expirada';
  description: string;
}

const INITIAL_QUEUE_ITEMS: QueueItem[] = [
  {
    id: "OP-PEN-101",
    citizenName: "Domingos Kassanga",
    biNumber: "00987123LA098",
    documentType: "Certificado de Residência",
    institution: "Administração Geral Tributária",
    date: "23/05/2026",
    status: "Pendente",
    priority: "normal",
    description: "Solicitação pendente de validação de morada fiscal para isenção de IPU residência primária."
  },
  {
    id: "OP-PEN-102",
    citizenName: "Amélia Chinguto",
    biNumber: "00456789BO011",
    documentType: "Alvará Comercial Simplificado",
    institution: "Ministério do Comércio",
    date: "22/05/2026",
    status: "Pendente",
    priority: "normal",
    description: "Alvará para micro-empresa de distribuição de hortícolas no mercado integrado do Lobito."
  },
  {
    id: "OP-URG-201",
    citizenName: "Manuel Diogo",
    biNumber: "00224411HU045",
    documentType: "Emissão Especial de Passaporte",
    institution: "SME",
    date: "23/05/2026",
    status: "Pendente",
    priority: "urgente",
    description: "Urgência por motivo de evacuação médica internacional urgente. Validação imediata solicitada."
  },
  {
    id: "OP-URG-202",
    citizenName: "Filomena de Sousa",
    biNumber: "00778811LA022",
    documentType: "Declaração de Isenção IRT",
    institution: "MINFIN",
    date: "23/05/2026",
    status: "Pendente",
    priority: "urgente",
    description: "Revisão tributária prioritária para portadores de incapacidade severa em trâmite ministerial."
  },
  {
    id: "OP-CRI-301",
    citizenName: "Desconhecido (#SpoofTentative)",
    biNumber: "00000000LA000",
    documentType: "Alerta de Liveness Detetado",
    institution: "SME Core Neural",
    date: "23/05/2026",
    status: "Pendente",
    priority: "critica",
    description: "Aviso crítico! Múltiplas falhas consecutivas de validação biométrica facial com vetor facial estático suspeito."
  },
  {
    id: "OP-CRI-302",
    citizenName: "Sebastião Gouveia",
    biNumber: "00889922BE056",
    documentType: "Substituição de Certificado Digital Raiz",
    institution: "Registo Civil",
    date: "22/05/2026",
    status: "Pendente",
    priority: "critica",
    description: "Conflito de par de chaves públicas no assento de óbito lavrado por conservador não autorizado."
  },
  {
    id: "OP-EXP-401",
    citizenName: "Isabel Valente",
    biNumber: "00115599LN004",
    documentType: "Licença Temporária de Condução",
    institution: "Polícia Nacional",
    date: "14/03/2026",
    status: "Expirado",
    priority: "expirada",
    description: "Licença provisória emitida pré-renovação da carta física. Vencida em março sem prorrogação registrada."
  },
  {
    id: "OP-EXP-402",
    citizenName: "Mateus Pedro",
    biNumber: "00334466LA011",
    documentType: "Certidão de Não Devedor",
    institution: "AGT",
    date: "10/04/2026",
    status: "Expirado",
    priority: "expirada",
    description: "Certidão de conformidade aduaneira para desembaraço expirada após prazo regulamentar de 180 dias."
  }
];

export type GovRole = 'supervisor' | 'operador' | 'auditor' | 'administrador';

export interface PermMatrix {
  create: boolean;
  sign: boolean;
  approve: boolean;
  reject: boolean;
  forward: boolean;
  archive: boolean;
}

const ROLE_PERMISSIONS: Record<GovRole, { label: string; desc: string; perms: PermMatrix }> = {
  operador: {
    label: "Operador",
    desc: "Suporta criação inicial de processos e encaminhamento setorial governamental.",
    perms: { create: true, sign: false, approve: false, reject: false, forward: true, archive: false }
  },
  supervisor: {
    label: "Supervisor",
    desc: "Despacha decisões, aplica assinaturas criptográficas oficiais e julga aprovações.",
    perms: { create: false, sign: true, approve: true, reject: true, forward: true, archive: false }
  },
  auditor: {
    label: "Auditor",
    desc: "Acompanha a legalidade, emite perícias, audita ocorrências e arquiva expedientes.",
    perms: { create: false, sign: false, approve: false, reject: false, forward: false, archive: true }
  },
  administrador: {
    label: "Administrador",
    desc: "Gestor principal. Detém autorização integral regulamentar do Estado.",
    perms: { create: true, sign: true, approve: true, reject: true, forward: true, archive: true }
  }
};

export function GovDashboard({
  onNavigate,
  documents = [],
  emergencyMode = false,
  appMode = "admin",
  userRequests = [],
  isMobile = false,
  logSecurityEvent,
  bi = '009874562LA041',
  setBi,
  profileName = 'Edlasio Galhardo',
  setProfileName,
  userBirthDate = '12/03/1995',
  setUserBirthDate,
  userFiliation = 'António Galhardo & Maria Conceição',
  setUserFiliation,
  userMaritalStatus = 'Solteiro',
  setUserMaritalStatus,
  addAuditLog,
}: GovDashboardProps & { appMode?: AppMode }) {
  const { institutions: masterInstitutions } = useInstitutions();
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % GOV_HIGHLIGHT_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [matchingThreshold, setMatchingThreshold] = useState(85);
  const [antiSpoofingEnforced, setAntiSpoofingEnforced] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSmartServices, setShowSmartServices] = useState(false);
  const [showRecentActivity, setShowRecentActivity] = useState(false);

  // Operational State Hooks
  const [activeRole, setActiveRole] = useState<GovRole>('administrador');
  const [activeQueue, setActiveQueue] = useState<'pendentes' | 'urgentes' | 'criticas' | 'expiradas'>('pendentes');
  const [queueSearch, setQueueSearch] = useState('');
  const [queueItems, setQueueItems] = useState<QueueItem[]>(INITIAL_QUEUE_ITEMS);
  const [selectedQueueItemId, setSelectedQueueItemId] = useState<string>("OP-PEN-101");
  const [rejectionReason, setRejectionReason] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New item form states
  const [newCitizenName, setNewCitizenName] = useState('');
  const [newBiNumber, setNewBiNumber] = useState('');
  const [newDocType, setNewDocType] = useState('Certificado de Residência');
  const [newQueue, setNewQueue] = useState<'pendentes' | 'urgentes' | 'criticas' | 'expiradas'>('pendentes');
  const [newDescription, setNewDescription] = useState('');

  // Anti-fraud citizen panel state
  const [searchBiQuery, setSearchBiQuery] = useState('');
  const [searchedCitizen, setSearchedCitizen] = useState<{
    name: string;
    bi: string;
    birthDate: string;
    filiation: string;
    maritalStatus: string;
  } | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);

  // Forms for updating
  const [tempProfileName, setTempProfileName] = useState('');
  const [tempBiField, setTempBiField] = useState('');
  const [tempBirthField, setTempBirthField] = useState('');
  const [tempMaritalField, setTempMaritalField] = useState('');
  const [tempFiliationField, setTempFiliationField] = useState('');

  // Seal receipt
  const [lastUpdatedProtocol, setLastUpdatedProtocol] = useState<{
    protocolCode: string;
    time: string;
  } | null>(null);

  // Video Atendimento Audit Metrics
  const [videoSessions, setVideoSessions] = useState<VideoSession[]>([]);
  const [videoEvents, setVideoEvents] = useState<VideoSessionEvent[]>([]);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  const loadVideoAuditData = async () => {
    try {
      const sessions = await VideoSessionService.listSessions();
      setVideoSessions(sessions);
      
      const allEvents: VideoSessionEvent[] = [];
      for (const sess of sessions) {
        const evts = await VideoSessionService.getSessionEvents(sess.id);
        allEvents.push(...evts);
      }
      setVideoEvents(allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (e) {
      console.error('Error fetching video audit metrics:', e);
    } finally {
      setIsVideoLoading(false);
    }
  };

  useEffect(() => {
    loadVideoAuditData();
  }, []);

  const handleQueryCitizen = () => {
    setSearchAttempted(true);
    if (searchBiQuery.trim() === bi) {
      const citizen = {
        name: profileName,
        bi: bi,
        birthDate: userBirthDate,
        filiation: userFiliation,
        maritalStatus: userMaritalStatus
      };
      setSearchedCitizen(citizen);
      setTempProfileName(citizen.name);
      setTempBiField(citizen.bi);
      setTempBirthField(citizen.birthDate);
      setTempMaritalField(citizen.maritalStatus);
      setTempFiliationField(citizen.filiation);
    } else {
      setSearchedCitizen(null);
    }
  };

  const handleUpdateRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchedCitizen || !setProfileName || !setBi || !setUserBirthDate || !setUserFiliation || !setUserMaritalStatus || !addAuditLog) return;

    setProfileName(tempProfileName);
    setBi(tempBiField);
    setUserBirthDate(tempBirthField);
    setUserFiliation(tempFiliationField);
    setUserMaritalStatus(tempMaritalField);

    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const protocolCode = `REG-UP-${randomCode}`;
    const timestampStr = new Date().toLocaleString('pt-AO');

    const logActionText = `[Selo: ${protocolCode}] Atualização de dados cadastrais autorizada e homologada pelo Operador #CDA-401 para o BI ${tempBiField} (Campos Alterados). Assinatura Eletrónica do Emissor válida.`;
    addAuditLog(logActionText, 'success');

    setLastUpdatedProtocol({
      protocolCode,
      time: timestampStr
    });

    setSearchedCitizen({
      name: tempProfileName,
      bi: tempBiField,
      birthDate: tempBirthField,
      filiation: tempFiliationField,
      maritalStatus: tempMaritalField
    });
  };

  const mapPins = useMemo(
    () => [
      { id: "cabinda", name: "Cabinda", top: "5%", left: "21%", count: 86732 },
      { id: "zaire", name: "Zaire", top: "18%", left: "30%", count: 42150 },
      { id: "uige", name: "Uíge", top: "22%", left: "45%", count: 78940 },
      { id: "bengo", name: "Bengo", top: "31%", left: "27%", count: 35420 },
      { id: "luanda", name: "Luanda", top: "33%", left: "21%", count: 412540 },
      { id: "cuanza-norte", name: "Cuanza Norte", top: "31%", left: "38%", count: 52130 },
      { id: "cuanza-sul", name: "Cuanza Sul", top: "45%", left: "33%", count: 89450 },
      { id: "malanje", name: "Malanje", top: "33%", left: "51%", count: 71200 },
      { id: "lunda-norte", name: "Lunda Norte", top: "24%", left: "68%", count: 65410 },
      { id: "lunda-sul", name: "Lunda Sul", top: "38%", left: "74%", count: 58920 },
      { id: "moxico", name: "Moxico", top: "55%", left: "75%", count: 83240 },
      { id: "bie", name: "Bié", top: "53%", left: "52%", count: 76430 },
      { id: "huambo", name: "Huambo", top: "54%", left: "41%", count: 114530 },
      { id: "benguela", name: "Benguela", top: "56%", left: "25%", count: 125430 },
      { id: "huila", name: "Huíla", top: "72%", left: "33%", count: 98234 },
      { id: "namibe", name: "Namibe", top: "74%", left: "18%", count: 62540 },
      { id: "cunene", name: "Cunene", top: "85%", left: "34%", count: 49750 },
      { id: "cuando", name: "Cuando", top: "76%", left: "59%", count: 30744 },
      { id: "cubango", name: "Cubango", top: "78%", left: "64%", count: 20496 },
    ],
    [],
  );

  // BI Data
  const categoryData = useMemo(
    () => [
      { name: "SME", value: 12, color: "#3b82f6" },
      { name: "AGT", value: 15, color: "#dc2626" },
      { name: "ENDE", value: 8, color: "#f59e0b" },
      { name: "EPAL", value: 7, color: "#06b6d4" },
      { name: "Tribunal", value: 10, color: "#8b5cf6" },
      { name: "Hospital", value: 9, color: "#10b981" },
      { name: "Ministerios", value: 11, color: "#0f172a" },
      { name: "Polícia Nacional", value: 6, color: "#1d4ed8" },
      { name: "Notário", value: 5, color: "#ec4899" },
      { name: "Registo Civil", value: 6, color: "#14b8a6" },
      { name: "Seguro Social", value: 6, color: "#f97316" },
      { name: "Administradoras", value: 5, color: "#64748b" },
      { name: "INE", value: 4, color: "#6366f1" },
    ],
    [],
  );

  const provinceData = useMemo<ProvinceData[]>(
    () => [
      { id: "luanda", name: "Luanda", count: 412540 },
      { id: "benguela", name: "Benguela", count: 125430 },
      { id: "huambo", name: "Huambo", count: 114530 },
      { id: "huila", name: "Huíla", count: 98234 },
      { id: "cuanza-sul", name: "Cuanza Sul", count: 89450 },
      { id: "cabinda", name: "Cabinda", count: 86732 },
      { id: "moxico", name: "Moxico", count: 83240 },
      { id: "uige", name: "Uíge", count: 78940 },
      { id: "bie", name: "Bié", count: 76430 },
      { id: "malanje", name: "Malanje", count: 71200 },
      { id: "lunda-norte", name: "Lunda Norte", count: 65410 },
      { id: "namibe", name: "Namibe", count: 62540 },
      { id: "lunda-sul", name: "Lunda Sul", count: 58920 },
      { id: "cuanza-norte", name: "Cuanza Norte", count: 52130 },
      { id: "cuando", name: "Cuando", count: 30744 },
      { id: "cubango", name: "Cubango", count: 20496 },
      { id: "cunene", name: "Cunene", count: 49750 },
      { id: "zaire", name: "Zaire", count: 42150 },
      { id: "bengo", name: "Bengo", count: 35420 },
    ],
    [],
  );

  // KPI Data
  const kpis = useMemo(
    () => [
      {
        label: "Correspondências Enviadas",
        value: "1.248.752",
        change: "+12,5% vs mês anterior",
        up: true,
        color: "text-emerald-500",
      },
      {
        label: "Correspondências Entregues",
        value: "1.000.000",
        change: "+9,8% vs mês anterior",
        up: true,
        color: "text-emerald-500",
      },
      {
        label: "Pendentes",
        value: "100",
        change: "-5,3% vs mês anterior",
        up: false,
        color: "text-red-500",
      },
      {
        label: "Taxa de Sucesso",
        value: "100%",
        change: "+7,6% vs mês anterior",
        up: true,
        color: "text-emerald-500",
      },
    ],
    [],
  );

  const monthlyData = useMemo(() => [
    { name: "Jan", correspondencias: 102400, documentos: 45000 },
    { name: "Fev", correspondencias: 115000, documentos: 52000 },
    { name: "Mar", correspondencias: 135400, documentos: 61000 },
    { name: "Abr", correspondencias: 158200, documentos: 78000 },
    { name: "Mai", correspondencias: 184500, documentos: 95000 },
    { name: "Jun", correspondencias: 248752, documentos: 125000 }
  ], []);

  const topInstitutions = useMemo(() => [
    { name: "SME - Serviço de Migração e Estrangeiros", volume: 342150, color: "bg-indigo-600" },
    { name: "AGT - Administração Geral Tributária", volume: 298450, color: "bg-emerald-600" },
    { name: "MINJUS - Ministério da Justiça", volume: 184200, color: "bg-slate-900" },
    { name: "INSS - Segurança Social", volume: 156300, color: "bg-indigo-500" },
    { name: "MINSA - Ministério da Saúde", volume: 112400, color: "bg-rose-500" },
    { name: "ENDE - Electricidade de Angola", volume: 92100, color: "bg-amber-500" },
    { name: "EPAL - Empresa Pública de Águas", volume: 84300, color: "bg-sky-500" },
    { name: "PNA - Polícia Nacional", volume: 76500, color: "bg-blue-600" },
    { name: "CNE - Comissão Nacional Eleitoral", volume: 62400, color: "bg-red-500" },
    { name: "BPC - Banco Poupança e Crédito", volume: 54100, color: "bg-teal-500" }
  ], []);

  const activities = useMemo(
    () => [
      {
        id: 1,
        action: "Correspondência Fiscal enviada",
        time: "20/05/2025 10:42",
        org: "AGT",
        status: "success",
      },
      {
        id: 2,
        action: "Notificação de Educação entregue",
        time: "20/05/2025 10:35",
        org: "MED",
        status: "success",
      },
      {
        id: 3,
        action: "BI Digital emitido",
        time: "20/05/2025 10:28",
        org: "SME",
        status: "success",
      },
      {
        id: 4,
        action: "Validação por QR Code realizada",
        time: "20/05/2025 10:15",
        org: "Gov",
        status: "success",
      },
      {
        id: 5,
        action: "Correspondência de Justiça entregue",
        time: "20/05/2025 10:05",
        org: "MINJUS",
        status: "success",
      },
    ],
    [],
  );

  const [institutions] = useState<Institution[]>([
    { name: "SME", status: "online", delay: "12ms", baseDelay: 12 },
    { name: "AGT", status: "online", delay: "24ms", baseDelay: 24 },
    { name: "ENDE", status: "online", delay: "18ms", baseDelay: 18 },
    { name: "EPAL", status: "online", delay: "15ms", baseDelay: 15 },
  ]);

  const chartData = useMemo(
    () => [
      { time: "08:00", reqs: 400 },
      { time: "10:00", reqs: 600 },
      { time: "12:00", reqs: 800 },
      { time: "14:00", reqs: 700 },
      { time: "16:00", reqs: 900 },
      { time: "18:00", reqs: 1200 },
      { time: "20:00", reqs: 500 },
    ],
    [],
  );

  const handleRoleChange = (role: GovRole) => {
    setActiveRole(role);
    logSecurityEvent?.(`OPERACIONAL: Alterado perfil activo para ${ROLE_PERMISSIONS[role].label}`, 'info');
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCitizenName || !newBiNumber || !newDescription) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const newItem: QueueItem = {
      id: `OP-${newQueue.toUpperCase().slice(0, 3)}-${100 + queueItems.length + 1}`,
      citizenName: newCitizenName,
      biNumber: newBiNumber,
      documentType: newDocType,
      institution: "Administração Central",
      date: new Date().toLocaleDateString('pt-PT'),
      status: 'Pendente',
      priority: newQueue === 'pendentes' ? 'normal' : newQueue === 'urgentes' ? 'urgente' : newQueue === 'criticas' ? 'critica' : 'expirada',
      description: newDescription
    };

    setQueueItems(prev => [newItem, ...prev]);
    setSelectedQueueItemId(newItem.id);
    setIsCreateModalOpen(false);
    
    // Reset fields
    setNewCitizenName('');
    setNewBiNumber('');
    setNewDescription('');

    logSecurityEvent?.(`OPERACIONAL: Criado novo expediente ${newItem.id} (${newItem.documentType}) para ${newItem.citizenName}`, 'success');
  };

  const updateItemStatus = (id: string, newStatus: QueueItem['status'], reason?: string, targetDept?: string) => {
    setQueueItems(prev => prev.map(item => {
      if (item.id === id) {
        let updatedInstitution = item.institution;
        if (targetDept) {
          updatedInstitution = targetDept;
        }
        return {
          ...item,
          status: newStatus,
          description: reason ? `${item.description} (Motivo: ${reason})` : item.description,
          institution: updatedInstitution
        };
      }
      return item;
    }));
  };

  const handleActionSign = (item: QueueItem) => {
    updateItemStatus(item.id, 'Assinado');
    logSecurityEvent?.(`OPERACIONAL: Assinado digitalmente o expediente ${item.id} (${item.documentType}) de ${item.citizenName}`, 'success');
  };

  const handleActionApprove = (item: QueueItem) => {
    updateItemStatus(item.id, 'Aprovado');
    logSecurityEvent?.(`OPERACIONAL: Aprovado o expediente ${item.id} (${item.documentType}) de ${item.citizenName}`, 'success');
  };

  const handleActionReject = (item: QueueItem) => {
    if (!rejectionReason) {
      alert("Por favor, indique um motivo para a rejeição.");
      return;
    }
    updateItemStatus(item.id, 'Rejeitado', rejectionReason);
    logSecurityEvent?.(`OPERACIONAL: Rejeitado o expediente ${item.id} (${item.documentType}) de ${item.citizenName}. Motivo: ${rejectionReason}`, 'warning');
    setRejectionReason('');
  };

  const handleActionForward = (item: QueueItem, target: string) => {
    updateItemStatus(item.id, 'Encaminhado', undefined, target);
    logSecurityEvent?.(`OPERACIONAL: Encaminhado o expediente ${item.id} (${item.documentType}) para ${target}`, 'info');
  };

  const handleActionArchive = (item: QueueItem) => {
    updateItemStatus(item.id, 'Arquivado');
    logSecurityEvent?.(`OPERACIONAL: Arquivado o expediente ${item.id} (${item.documentType}) no registo permanente`, 'info');
  };

  const filteredQueueItems = useMemo(() => {
    return queueItems.filter(item => {
      // Filter by current active queue tab
      const matchesQueue = 
        (activeQueue === 'pendentes' && item.priority === 'normal') ||
        (activeQueue === 'urgentes' && item.priority === 'urgente') ||
        (activeQueue === 'criticas' && item.priority === 'critica') ||
        (activeQueue === 'expiradas' && item.priority === 'expirada');
      
      const matchesSearch = 
        item.citizenName.toLowerCase().includes(queueSearch.toLowerCase()) ||
        item.id.toLowerCase().includes(queueSearch.toLowerCase()) ||
        item.documentType.toLowerCase().includes(queueSearch.toLowerCase()) ||
        item.description.toLowerCase().includes(queueSearch.toLowerCase());

      return matchesQueue && matchesSearch;
    });
  }, [queueItems, activeQueue, queueSearch]);

  const selectedQueueItem = useMemo(() => {
    return queueItems.find(item => item.id === selectedQueueItemId) || filteredQueueItems[0] || null;
  }, [queueItems, selectedQueueItemId, filteredQueueItems]);

  const queueCounts = useMemo(() => {
    return {
      pendentes: queueItems.filter(i => i.priority === 'normal').length,
      urgentes: queueItems.filter(i => i.priority === 'urgente').length,
      criticas: queueItems.filter(i => i.priority === 'critica').length,
      expiradas: queueItems.filter(i => i.priority === 'expirada').length,
    };
  }, [queueItems]);

  const handleForceSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  return (
    <div
      id="gov-dashboard-wrapper"
      className="min-h-screen bg-white text-slate-600 p-4 md:p-8 font-sans"
    >
      <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
        {/* Top Header Section */}
        <header
          id="gov-header"
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-4 border-b border-slate-100"
        >
          <div>
            <h1 className="text-xl md:text-3xl font-black italic tracking-tighter text-slate-950 uppercase leading-none">
              Painel Nacional de Correspondência
            </h1>
            <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              Correio Digital Angola &bull; Administração Central
            </p>
          </div>
          
          {/* Symmetrical central monitoring badge */}
          <div className="flex items-center gap-2 bg-slate-100/50 border border-slate-200/50 px-3.5 py-1.5 rounded-full shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
            </span>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 font-mono">
              Monitoramento Ativo
            </span>
          </div>
        </header>

        {/* Imagens Publicitárias / Destaques do Governo */}
        <section className="relative h-[280px] md:h-[385px] rounded-[20px] md:rounded-[24px] overflow-hidden shadow-sm border border-slate-200">
          <AnimatePresence mode="wait">
            <motion.div
              key={`gov-destaque-${activeSlide}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0"
            >
              <motion.img 
                src={GOV_HIGHLIGHT_SLIDES[activeSlide % GOV_HIGHLIGHT_SLIDES.length].image} 
                alt={GOV_HIGHLIGHT_SLIDES[activeSlide % GOV_HIGHLIGHT_SLIDES.length].title}
                initial={{ scale: 1.03 }}
                animate={{ scale: 1 }}
                transition={{ duration: 6, ease: "linear" }}
                className="w-full h-full object-cover object-center"
                loading="eager"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </AnimatePresence>

          {/* Slide Indicators */}
          <div className="absolute top-6 right-6 flex gap-1.5 z-10">
            {GOV_HIGHLIGHT_SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-300 border-0 outline-none cursor-pointer ${
                  activeSlide % GOV_HIGHLIGHT_SLIDES.length === i ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        </section>

        {/* ID Digital & Novas Mensagens Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-[28px] md:rounded-[32px] p-5 md:p-6 flex items-center gap-4 md:gap-6 relative overflow-hidden text-left font-sans">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center shrink-0">
              <ShieldCheck size={24} className="md:w-8 md:h-8 text-red-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">ID Digital do Admin</div>
              <div className="text-base md:text-xl font-black text-slate-900 leading-tight italic tracking-tighter">
                Gestor Operativo Verificado
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] md:text-xs font-bold text-slate-655">Acesso Governamental Ativo (100%)</span>
              </div>
            </div>
          </div>
          
          <div 
            role="button"
            onClick={() => onNavigate?.('gov-correspondencias')}
            className="bg-white border border-slate-200 rounded-[28px] md:rounded-[32px] p-5 md:p-6 flex items-center gap-4 md:gap-6 hover:border-red-600/20 transition-all cursor-pointer group relative overflow-hidden text-left font-sans"
          >
            <div className="w-12 h-12 md:w-16 md:h-16 bg-red-500/5 text-red-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform border border-red-500/10">
              <Mail size={24} className="md:w-8 md:h-8" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">Central de Comunicações</div>
              <div className="text-base md:text-xl font-black text-slate-900 leading-tight italic tracking-tighter">Novas Correspondências</div>
              <div className="text-[9px] md:text-xs text-red-650 font-black mt-1">Iniciar Novo Expediente &rarr;</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 px-1 text-[10px] font-black uppercase tracking-widest">
          <button onClick={() => onNavigate?.('historico')} className="cda-link-text">Ver Histórico</button>
          <button onClick={() => onNavigate?.('notificacoes')} className="cda-link-text">Notificações</button>
          <button onClick={() => onNavigate?.('gov-docs')} className="cda-link-text">Emissão Documental</button>
        </div>

        {/* Instituições Conectadas Horizontal Panel */}
        <section className="bg-white border border-slate-200 rounded-[24px] md:rounded-[32px] p-5 overflow-hidden relative text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between md:relative gap-2 mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-6 bg-red-650 rounded-full" />
               <div className="min-w-0">
                  <h3 className="text-slate-950 font-black text-xs md:text-base italic tracking-tighter uppercase leading-none">Instituições Conectadas</h3>
               </div>
            </div>
            <div className="md:absolute md:left-1/2 md:-translate-x-1/2 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center mt-1 md:mt-0">
              Governação Electrónica
            </div>
            <div className="hidden md:block" />
          </div>
          <div className="flex flex-nowrap gap-2 md:gap-3 overflow-x-auto custom-scrollbar-h pb-2">
            {masterInstitutions.map((inst) => {
              const isTargetColor = ['AGT', 'SME', 'ENDE', 'EPAL', 'MINJUS', 'MINSA', 'PNA', 'INSS', 'CNE', 'Registo Civil', 'Notariado', 'Tribunal de Comarca', 'Universidade Pública', 'INAPEM'].includes(inst.name);
              return (
                <button 
                  key={inst.id}
                  type="button" 
                  onClick={() => {
                    onNavigate?.('gov-interoperabilidade');
                  }}
                  className={`px-4 py-2 rounded-xl text-[10px] md:text-xs font-black text-white whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isTargetColor 
                      ? 'bg-[#0E2B64] hover:bg-[#0E2B64]/90 border-[#0E2B64]' 
                      : 'bg-[#0c2340] hover:bg-[#152e4d] border-[#1c3c66]'
                  }`}
                  title={`Visualizar status de interoperabilidade de ${inst.fullName}`}
                >
                  {inst.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* SECÇÃO 1 — RESUMO GERAL */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-red-650 rounded-full" />
            <h2 className="text-base md:text-lg font-black italic tracking-tighter text-slate-900 uppercase">
              Resumo Geral
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {/* Cartão 1 */}
            <div className="bg-white border border-[#0c2340]/12 rounded-[20px] p-6 flex flex-col justify-between min-h-[145px] text-left hover:border-[#0c2340]/25 transition-all">
              <div className="space-y-1">
                <AnimatedCounter
                  to={1248752}
                  duration={2000}
                  suffix=""
                  className="text-3xl font-black text-slate-955 italic tracking-tighter leading-none font-mono"
                />
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                   Correspondências Enviadas
                </div>
              </div>
              <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                ↑ 12,5% vs mês anterior
              </div>
            </div>

            {/* Cartão 2 */}
            <div className="bg-white border border-[#0c2340]/12 rounded-[20px] p-6 flex flex-col justify-between min-h-[145px] text-left hover:border-[#0c2340]/25 transition-all">
              <div className="space-y-1">
                <AnimatedCounter
                  to={1000000}
                  duration={2200}
                  suffix=""
                  className="text-3xl font-black text-slate-955 italic tracking-tighter leading-none font-mono"
                />
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                   Correspondências Entregues
                </div>
              </div>
              <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                ↑ 9,8% vs mês anterior
              </div>
            </div>

            {/* Cartão 3 */}
            <div className="bg-white border border-[#0c2340]/12 rounded-[20px] p-6 flex flex-col justify-between min-h-[145px] text-left hover:border-[#0c2340]/25 transition-all">
              <div className="space-y-1">
                <AnimatedCounter
                  to={100}
                  duration={1800}
                  suffix=""
                  className="text-3xl font-black text-slate-955 italic tracking-tighter leading-none font-mono"
                />
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                   Pendentes
                </div>
              </div>
              <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-rose-600">
                ↓ 5,3% vs mês anterior
              </div>
            </div>

            {/* Cartão 4 */}
            <div className="bg-white border border-[#0c2340]/12 rounded-[20px] p-6 flex flex-col justify-between min-h-[145px] text-left hover:border-[#0c2340]/25 transition-all">
              <div className="space-y-1">
                <AnimatedCounter
                  to={100}
                  duration={2000}
                  decimals={0}
                  suffix="%"
                  className="text-3xl font-black text-slate-955 italic tracking-tighter leading-none font-mono"
                />
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                   Taxa de Sucesso
                </div>
              </div>
              <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                ↑ 7,6% vs mês anterior
              </div>
            </div>
          </div>

          {/* NOVOS CONTAINERS DE RESUMO GERAL ADICIONAIS - IGUAL À IMAGEM ANEXADA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {/* Instituições Ativadas */}
            <div className="bg-white border border-[#0c2340]/12 rounded-[20px] p-6 hover:border-[#0c2340]/25 transition-all flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100/40 shadow-xs">
                <Building2 size={22} className="stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0 text-left space-y-1">
                <div className="text-[11px] md:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                  Instituições Ativadas
                </div>
                <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5 leading-none mt-1 min-w-0">
                  <AnimatedCounter
                    to={masterInstitutions.filter(i => i.status === 'Ativa').length}
                    duration={1500}
                    suffix=""
                    className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight italic shrink-0 font-mono"
                  />
                  <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate max-w-full">
                    de {masterInstitutions.length} integradas
                  </span>
                </div>
                <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-emerald-600 pt-1">
                  ↑ 100% operacional
                </div>
              </div>
            </div>

            {/* Cidadãos Registados */}
            <div className="bg-white border border-[#0c2340]/12 rounded-[20px] p-6 hover:border-[#0c2340]/25 transition-all flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100/40 shadow-xs">
                <Users size={22} className="stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0 text-left space-y-1">
                <div className="text-[11px] md:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                  Cidadãos Registados
                </div>
                <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5 leading-none mt-1 min-w-0">
                  <AnimatedCounter
                    to={2300000}
                    duration={2000}
                    suffix=""
                    className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight italic shrink-0 font-mono"
                  />
                  <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate max-w-full">cidadãos</span>
                </div>
                <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-emerald-600 pt-1">
                  ↑ 85.230 este mês
                </div>
              </div>
            </div>

            {/* Tempo Médio de Resposta */}
            <div className="bg-white border border-[#0c2340]/12 rounded-[20px] p-6 hover:border-[#0c2340]/25 transition-all flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 border border-amber-100/40 shadow-xs">
                <Clock size={22} className="stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0 text-left space-y-1">
                <div className="text-[11px] md:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                  Tempo Médio de Resposta
                </div>
                <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5 leading-none mt-1">
                  <AnimatedCounter
                    to={155}
                    duration={1800}
                    suffix=" min"
                    className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight italic shrink-0 font-mono"
                  />
                </div>
                <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-[#10b981] pt-1">
                  ↓ -18% vs mês anterior
                </div>
              </div>
            </div>

            {/* Pendentes */}
            <div className="bg-white border border-[#0c2340]/12 rounded-[20px] p-6 hover:border-[#0c2340]/25 transition-all flex items-start gap-4 min-w-0">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0 border border-rose-100/40 shadow-xs">
                <Mail size={22} className="stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0 text-left space-y-1 min-w-0">
                <div className="text-[11px] md:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                  Pendentes
                </div>
                <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5 leading-none mt-1 min-w-0">
                  <AnimatedCounter
                    to={12540}
                    duration={1600}
                    suffix=""
                    className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight italic shrink-0 font-mono"
                  />
                  <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate max-w-full block">correspondências</span>
                </div>
                <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-rose-600 pt-1">
                  ↓ -6,7% vs mês anterior
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Anti-Fraud Registry Updates - Exclusive for Operators */}
        {activeRole === 'operador' && (
          <section className="bg-gradient-to-tr from-white to-slate-50 border border-indigo-100 rounded-[32px] p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                <div>
                  <h2 className="text-base md:text-lg font-black italic tracking-tighter text-slate-900 uppercase">
                    Serviço de Prevenção a Fraudes Cadastrais
                  </h2>
                  <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider font-mono">
                    Módulo de Alteração Cadastral Presencial (Operador de Registo Autorizado)
                  </span>
                </div>
              </div>
              <div className="px-3 py-1 bg-indigo-50 border border-indigo-150 rounded-full text-indigo-750 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 self-start sm:self-auto">
                <ShieldAlert size={12} /> Exclusivo Operador
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
              {/* Left Column: Search Citizen */}
              <div className="space-y-4 bg-white border border-slate-200 p-5 rounded-2xl h-fit">
                <div className="space-y-1 text-left">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest font-mono">Pesquisa na Base Central</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase leading-normal">Insira o Nº de Bilhete de Identidade (BI) do cidadão para carregar a ficha cadastral.</p>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="e.g. 009874562LA041"
                      value={searchBiQuery}
                      onChange={(e) => setSearchBiQuery(e.target.value)}
                      className="w-full bg-slate-55 border border-slate-200 focus:border-indigo-550 focus:bg-white rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-900 outline-none placeholder:text-slate-400 font-mono tracking-widest"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleQueryCitizen}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border-0 shadow-sm"
                    >
                      Buscar Cidadão
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchBiQuery('009874562LA041');
                      }}
                      className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-2.5 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border-0"
                    >
                      Carregar Edlasio
                    </button>
                  </div>
                </div>

                {searchedCitizen ? (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-150 rounded-xl space-y-1.5 animate-fadeIn text-left">
                    <div className="flex items-center gap-1.5 text-emerald-700 text-[9px] font-black uppercase tracking-widest font-sans">
                      <CheckCircle2 size={13} className="text-emerald-500" /> Registro Localizado
                    </div>
                    <div className="text-[11px] text-slate-800 font-black uppercase leading-snug font-sans">
                      {searchedCitizen.name}
                    </div>
                    <div className="text-[9px] text-slate-500 font-bold font-mono tracking-wider uppercase">
                      BI: {searchedCitizen.bi} &bull; Estado: Ativo
                    </div>
                  </div>
                ) : searchAttempted ? (
                  <div className="p-3.5 bg-rose-50 border border-rose-150 rounded-xl space-y-1 text-left">
                    <div className="text-rose-700 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 font-sans">
                      <Ban size={13} /> Sem Resultados
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase leading-normal">Nenhum cidadão cadastrado online com o BI fornecido.</p>
                  </div>
                ) : (
                  <div className="p-6 border border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                    <History size={18} className="mx-auto text-slate-300 mb-1.5" />
                    <span className="text-[9px] font-black uppercase tracking-wider block">Aguardando pesquisa...</span>
                  </div>
                )}
              </div>

              {/* Right Column: Update Profile Values */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between text-left">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
                    <div className="space-y-0.5">
                      <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest font-mono">Ficha de Identidade Cadastrada</h4>
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider font-sans">Campos auditáveis sujeitos a alteração estrita</p>
                    </div>
                    <span className="text-[9px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded font-mono font-bold uppercase self-start sm:self-auto">
                      Protocolo Ativo: CDA-R2026
                    </span>
                  </div>

                  <form onSubmit={handleUpdateRegister} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Nome Completo</label>
                      <input
                        type="text"
                        disabled={!searchedCitizen}
                        value={tempProfileName}
                        onChange={(e) => setTempProfileName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 disabled:opacity-50 rounded-xl px-4 py-2.5 text-xs font-black text-slate-850 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Número de BI</label>
                      <input
                        type="text"
                        disabled={!searchedCitizen}
                        value={tempBiField}
                        onChange={(e) => setTempBiField(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 disabled:opacity-50 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-850 outline-none focus:border-indigo-500 focus:bg-white tracking-widest"
                      />
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Data de Nascimento</label>
                      <input
                        type="text"
                        disabled={!searchedCitizen}
                        value={tempBirthField}
                        onChange={(e) => setTempBirthField(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 disabled:opacity-50 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-850 outline-none focus:border-indigo-500 focus:bg-white tracking-wider"
                      />
                    </div>

                    <div className="space-y-1 text-left col-span-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Estado Civil</label>
                      <select
                        disabled={!searchedCitizen}
                        value={tempMaritalField}
                        onChange={(e) => setTempMaritalField(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 disabled:opacity-50 rounded-xl px-3 py-2.5 text-xs font-black text-slate-850 outline-none focus:border-indigo-500 focus:bg-white cursor-pointer"
                      >
                        <option value="Solteiro">Solteiro</option>
                        <option value="Casado">Casado</option>
                        <option value="Divorciado">Divorciado</option>
                        <option value="Viúvo">Viúvo</option>
                      </select>
                    </div>

                    <div className="space-y-1 text-left sm:col-span-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Filiação (Progenitores)</label>
                      <input
                        type="text"
                        disabled={!searchedCitizen}
                        value={tempFiliationField}
                        onChange={(e) => setTempFiliationField(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 disabled:opacity-50 rounded-xl px-4 py-2.5 text-xs font-black text-slate-850 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2 pt-3 flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        disabled={!searchedCitizen}
                        onClick={() => {
                          setTempProfileName(searchedCitizen?.name || '');
                          setTempBiField(searchedCitizen?.bi || '');
                          setTempBirthField(searchedCitizen?.birthDate || '');
                          setTempMaritalField(searchedCitizen?.maritalStatus || '');
                          setTempFiliationField(searchedCitizen?.filiation || '');
                        }}
                        className="flex-1 bg-white border border-slate-250 text-slate-700 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        Descartar
                      </button>
                      <button
                        type="submit"
                        disabled={!searchedCitizen}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-755 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 transition-all cursor-pointer border-0 shadow-md"
                      >
                        Efetuar Atualização Cadastral
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Electronic Seal & Protocol Certificate details below update */}
            <AnimatePresence>
              {lastUpdatedProtocol && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-emerald-50 border border-emerald-250 rounded-[20px] p-5 text-left mt-4 animate-fadeIn"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <h4 className="font-sans text-[11px] font-black text-emerald-950 uppercase tracking-wider mb-1">
                          Selo Eletrónico de Homologação de Dados Cadastrais
                        </h4>
                        <p className="text-[11px] text-emerald-850 font-bold leading-normal">
                          A ficha cadastral foi atualizada com sucesso e enviada ao Registo de Identidade Única do Cidadão. Atualização selada eletronicamente.
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 text-[9px] font-mono leading-none text-emerald-700 font-black uppercase">
                          <span>Selo: <strong className="font-black text-emerald-800">{lastUpdatedProtocol.protocolCode}</strong></span>
                          <span>&bull;</span>
                          <span>Assinatura Digital Emissor: AGENTE_OPERADOR_CDA_401</span>
                          <span>&bull;</span>
                          <span>Timestamp: {lastUpdatedProtocol.time}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLastUpdatedProtocol(null)}
                      className="ml-auto text-[8px] font-mono uppercase font-black text-rose-600 border border-rose-250 hover:bg-rose-100/50 px-2.5 py-1 rounded-lg shrink-0 cursor-pointer transition-colors"
                    >
                      Fechar Recibo
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* Create Expediente Modal */}
        <AnimatePresence>
          {isCreateModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCreateModalOpen(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[600]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 30 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-white rounded-[40px] shadow-3xl z-[601] overflow-hidden flex flex-col border border-slate-100"
              >
                <div className="bg-slate-900 p-6 md:p-8 text-white relative">
                  <span className="text-[10px] font-mono font-black text-red-500 uppercase tracking-widest block font-bold">Operação Governamental Integrada</span>
                  <h3 className="text-base md:text-lg font-black uppercase italic tracking-tight mt-1 mb-0 pb-0 text-white">Instaurar Novo Expediente</h3>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="absolute right-6 top-6 bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition-colors border-0 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleCreateItem} className="p-6 md:p-8 space-y-4 font-sans text-xs">
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Cidadão Contribuinte *</label>
                    <input
                      type="text"
                      required
                      value={newCitizenName}
                      onChange={(e) => setNewCitizenName(e.target.value)}
                      placeholder="Manuel de Vasconcelos"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-slate-800 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NIF / BI de Identidade *</label>
                    <input
                      type="text"
                      required
                      value={newBiNumber}
                      onChange={(e) => setNewBiNumber(e.target.value)}
                      placeholder="00114422LA098"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-800 outline-none focus:border-slate-800 focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Documento</label>
                      <select
                        value={newDocType}
                        onChange={(e) => setNewDocType(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-[11px] font-bold outline-none focus:border-slate-800 appearance-none cursor-pointer text-slate-700 focus:bg-white"
                      >
                        <option value="Certificado de Residência">Certidão de Morada</option>
                        <option value="Bilhete de Identidade">Bilhete Eletrónico</option>
                        <option value="Certidão de Não Devedor">Certidão Fiscal AGT</option>
                        <option value="Passaporte Nacional">Passaporte SME</option>
                        <option value="Alvará Comercial Simplificado">Alvará Comercial</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Fila de Trâmite</label>
                      <select
                        value={newQueue}
                        onChange={(e) => setNewQueue(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-[11px] font-bold outline-none focus:border-slate-800 appearance-none cursor-pointer text-slate-700 focus:bg-white"
                      >
                        <option value="pendentes">Pendentes (Normal)</option>
                        <option value="urgentes">Urgentes</option>
                        <option value="criticas">Críticas (Alta prioridade)</option>
                        <option value="expiradas">Expiradas</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Justificação Administrativa *</label>
                    <textarea
                      required
                      rows={3}
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Forneça detalhes que motivam a emissão do presente expediente..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 leading-relaxed outline-none focus:border-slate-800 resize-none focus:bg-white"
                    />
                  </div>

                  {/* Submit buttons */}
                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="flex-1 bg-white border border-slate-250 text-slate-700 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      Anular
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-slate-900 border-0 text-white hover:bg-slate-850 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-md"
                    >
                      Instaurar & Emitir
                    </button>
                  </div>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* SECÇÃO EXTRA — CONTROLO & MONITORIZAÇÃO DO VIDEOATENDIMENTO OFICIAL */}
        <div className="space-y-6 mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-indigo-650 rounded-full" />
              <h2 className="text-base md:text-lg font-black italic tracking-tighter text-slate-900 uppercase">
                Auditoria de Videoatendimento Integrado
              </h2>
            </div>
            <button 
              onClick={loadVideoAuditData} 
              className="text-[10px] font-black uppercase tracking-widest text-[#0c2340] hover:text-indigo-600 transition-colors cursor-pointer bg-white border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-3xs"
            >
              <RefreshCcw size={10} className={`${isVideoLoading ? 'animate-spin' : 'animate-pulse'}`} />
              Actualizar Barramento
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-left shadow-3xs">
              <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">Total de Sessões</span>
              <span className="text-2xl font-black text-[#0c2340] block tracking-tight mt-1">{videoSessions.length}</span>
              <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wide mt-1">Sessões Registadas</span>
            </div>

            {/* Concluídas */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-left shadow-3xs">
              <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">Concluídas</span>
              <span className="text-2xl font-black text-purple-700 block tracking-tight mt-1">
                {videoSessions.filter(s => s.status === 'concluida').length}
              </span>
              <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wide mt-1">Atendimento Concluído</span>
            </div>

            {/* Em Curso */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-left shadow-3xs">
              <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">Em curso / Ativas</span>
              <span className="text-2xl font-black text-red-650 block tracking-tight mt-1 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
                {videoSessions.filter(s => s.status === 'em_curso').length}
              </span>
              <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wide mt-1">Ligações Activas</span>
            </div>

            {/* Canceladas */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-left shadow-3xs">
              <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">Canceladas</span>
              <span className="text-2xl font-black text-slate-500 block tracking-tight mt-1">
                {videoSessions.filter(s => s.status === 'cancelada').length}
              </span>
              <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wide mt-1">Sessões Inviabilizadas</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[2fr_1.2fr] gap-6 text-left">
            {/* Left Box: Sessions Table / List */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-905 uppercase tracking-widest font-mono flex items-center gap-2">
                  <Video size={14} className="text-indigo-600 animate-pulse" /> Histórico Geral de Sessões por Instituição
                </h3>
              </div>

              <div className="overflow-x-auto min-w-full">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-wider">Protocolo</th>
                      <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-wider">Assunto</th>
                      <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-wider">Instituição</th>
                      <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-wider">Cidadão</th>
                      <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-left">
                    {videoSessions.length > 0 ? (
                      videoSessions.map((sess) => (
                        <tr key={sess.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2.5 font-mono font-bold text-indigo-750 whitespace-nowrap">{sess.associatedProtocol || 'Geral'}</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-800">{sess.subject}</td>
                          <td className="px-3 py-2.5 font-bold text-slate-650 whitespace-nowrap">{sess.hostName}</td>
                          <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{sess.guestName}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {sess.status === 'agendada' && <span className="bg-blue-50 border border-blue-200 text-blue-700 font-extrabold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded">Agendada</span>}
                            {sess.status === 'disponivel' && <span className="bg-emerald-50 border border-emerald-250 text-emerald-700 font-extrabold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded animate-pulse">Livre</span>}
                            {sess.status === 'em_curso' && <span className="bg-red-50 border border-red-250 text-red-700 font-extrabold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 w-fit"><span className="w-1 h-1 rounded-full bg-red-650 animate-ping inline-block" /> Activa</span>}
                            {sess.status === 'concluida' && <span className="bg-purple-50 border border-purple-250 text-purple-700 font-extrabold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded">Concluída</span>}
                            {sess.status === 'cancelada' && <span className="bg-slate-100 border border-slate-300 text-slate-500 font-extrabold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded">Cancelada</span>}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-8 italic text-slate-400">Nenhuma chamada oficial registada no ecossistema.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Box: Audit Log events */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-4">
              <div className="pb-3 border-b border-slate-100 text-left">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-650" /> Log de Auditoria do Atendimento
                </h3>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-3 font-sans text-left">
                {videoEvents.length > 0 ? (
                  videoEvents.map((evt, idx) => (
                    <div key={idx} className="text-[11px] leading-relaxed border-b border-slate-50 pb-2 flex items-start gap-2">
                      <span className="font-mono text-slate-400 font-bold shrink-0">
                        {new Date(evt.timestamp).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div>
                        <span className="font-bold text-slate-800">{evt.userName}</span>{' '}
                        <span className="text-slate-500">({evt.participantBi})</span>:{' '}
                        <span className="text-slate-600 font-medium italic">{evt.description}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs italic text-slate-400 text-center py-6">Sem eventos de transmissão de vídeo registados.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECÇÃO 2 — PAINEL ANALÍTICO */}
        <div className="space-y-6 mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-red-650 rounded-full" />
              <h2 className="text-base md:text-lg font-black italic tracking-tighter text-slate-900 uppercase">
                Painel Analítico
              </h2>
            </div>
            <button onClick={() => setShowAnalytics(prev => !prev)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors cursor-pointer bg-transparent border-0">
              {showAnalytics ? 'Ocultar análise detalhada' : 'Mostrar análise detalhada'}
            </button>
          </div>

          {showAnalytics && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Card Fiscais / Categoria */}
            <div className="bg-white border border-[#0c2340]/15 rounded-[24px] p-6 shadow-xs flex flex-col justify-between min-h-[420px] text-left">
              <div>
                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100">
                  <div className="w-1 h-5 bg-red-650 rounded-full" />
                  <h3 className="text-xs font-black text-slate-950 uppercase tracking-[0.15em] italic">
                    Correspondências por Categoria
                  </h3>
                </div>

                <div className="flex flex-col items-center gap-4 justify-center">
                  {/* Donut Chart */}
                  <div className="w-full h-[160px] relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Fiscais", value: 35.6, color: "#2563eb" },
                            { name: "Educação", value: 25.8, color: "#ef4444" },
                            { name: "Saúde", value: 15.6, color: "#10b981" },
                            { name: "Justiça", value: 12.4, color: "#8b5cf6" },
                            { name: "Outros", value: 10.6, color: "#f97316" }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {[
                            { color: "#2563eb" },
                            { color: "#ef4444" },
                            { color: "#10b981" },
                            { color: "#8b5cf6" },
                            { color: "#f97316" }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[9px] uppercase font-mono tracking-widest text-slate-400 font-bold">
                        Fluxo
                      </span>
                      <span className="text-lg font-black text-slate-955 italic tracking-tighter leading-none mt-0.5">
                        100%
                      </span>
                    </div>
                  </div>

                  {/* Legendas coloridas */}
                  <div className="w-full space-y-2">
                    {[
                      { name: "Fiscais", value: "35,6%", color: "#2563eb" },
                      { name: "Educação", value: "25,8%", color: "#ef4444" },
                      { name: "Saúde", value: "15,6%", color: "#10b981" },
                      { name: "Justiça", value: "12,4%", color: "#8b5cf6" },
                      { name: "Outros", value: "10,6%", color: "#f97316" }
                    ].map((cat) => (
                      <div
                        key={cat.name}
                        className="flex items-center justify-between text-[11px] p-1.5 hover:bg-slate-50 rounded-xl transition-colors border border-transparent"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="font-bold text-slate-650 uppercase tracking-wider text-[10px] truncate">
                            {cat.name}
                          </span>
                        </div>
                        <span className="font-black text-slate-955 font-mono text-[10px] shrink-0 ml-1">
                          {cat.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.('gov-correspondencias')}
                className="w-full bg-[#0c2340] hover:bg-[#091a30] text-white text-[10px] font-black uppercase tracking-widest py-3.5 rounded-2xl border-0 transition-all shadow-none cursor-pointer mt-5"
              >
                Análise de Categorias
              </button>
            </div>

            {/* Card Província */}
            <div className="bg-white border border-[#0c2340]/15 rounded-[24px] p-6 shadow-xs flex flex-col justify-between min-h-[420px] text-left">
              <div>
                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100">
                  <div className="w-1 h-5 bg-red-650 rounded-full" />
                  <h3 className="text-xs font-black text-slate-955 uppercase tracking-[0.15em] italic">
                    Distribuição por Província
                  </h3>
                </div>

                <div className="flex flex-col gap-4 items-center">
                  {/* Visual Map Representation */}
                  <div className="w-full h-[260px] bg-white border border-slate-200 rounded-2xl flex items-center justify-center relative overflow-hidden bg-slate-50/50">
                    <LazyImage
                      src="https://i.postimg.cc/rp2hhzfK/mapa-Angola.jpg"
                      alt="Mapa de Angola Províncias"
                      placeholder="skeleton"
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain',
                        transform: 'scale(1)',
                        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                      className="rounded-xl hover:scale-[1.05]"
                    />
                  </div>

                  {/* Província list */}
                  <div className="w-full max-h-[170px] overflow-y-auto pr-2 space-y-1.5 text-slate-600 scrollbar-thin feedback-scroll">
                    {[
                      { name: "Luanda", count: "412.540", color: "bg-blue-600" },
                      { name: "Benguela", count: "125.450", color: "bg-purple-600" },
                      { name: "Huíla", count: "98.234", color: "bg-amber-600" },
                      { name: "Huambo", count: "89.120", color: "bg-rose-600" },
                      { name: "Cabinda", count: "78.432", color: "bg-teal-600" },
                      { name: "Namibe", count: "62.540", color: "bg-emerald-600" },
                      { name: "Cuanza Sul", count: "55.320", color: "bg-indigo-600" },
                      { name: "Uíge", count: "48.120", color: "bg-orange-600" },
                      { name: "Malanje", count: "42.980", color: "bg-pink-600" },
                      { name: "Bié", count: "39.450", color: "bg-cyan-600" },
                      { name: "Zaire", count: "35.110", color: "bg-lime-600" },
                      { name: "Moxico", count: "32.650", color: "bg-violet-600" },
                      { name: "Lunda Norte", count: "29.740", color: "bg-fuchsia-600" },
                      { name: "Lunda Sul", count: "25.180", color: "bg-sky-600" },
                      { name: "Cunene", count: "21.900", color: "bg-emerald-500" },
                      { name: "Cuanza Norte", count: "19.850", color: "bg-amber-500" },
                      { name: "Cuando", count: "8.600", color: "bg-red-500" },
                      { name: "Cubango", count: "5.720", color: "bg-orange-500" },
                      { name: "Bengo", count: "11.200", color: "bg-slate-500" }
                    ].map((prov) => (
                      <div
                        key={prov.name}
                        className="flex justify-between items-center text-[11px] p-1 border-b border-slate-50"
                      >
                        <span className="font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${prov.color}`} />
                          {prov.name}
                        </span>
                        <span className="font-mono font-black text-slate-900">
                          {prov.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.('gov-relatorio')}
                className="w-full bg-[#0c2340] hover:bg-[#091a30] text-white text-[10px] font-black uppercase tracking-widest py-3.5 rounded-2xl border-0 transition-all shadow-none cursor-pointer mt-5"
              >
                Análise de Províncias
              </button>
            </div>

            {/* Card Notificações Ativa */}
            <div className="bg-white border border-[#0c2340]/15 rounded-[24px] p-6 shadow-xs flex flex-col justify-between min-h-[420px] text-left">
              <div>
                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100">
                  <div className="w-1 h-5 bg-red-650 rounded-full" />
                  <h3 className="text-xs font-black text-slate-955 uppercase tracking-[0.15em] italic">
                    Notificações Ativas
                  </h3>
                </div>

                <div className="space-y-3">
                  {[
                    { name: "Fiscais", count: "128.752", trend: "↑ 11,3%" },
                    { name: "Educação", count: "96.540", trend: "↑ 8,7%" },
                    { name: "Saúde", count: "72.318", trend: "↑ 6,1%" },
                    { name: "Justiça", count: "45.897", trend: "↑ 9,4%" }
                  ].map((notif) => (
                    <div
                      key={notif.name}
                      className="flex justify-between items-center p-2.5 rounded-xl bg-white border border-slate-900/10 hover:bg-slate-50 hover:border-slate-900/15 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                          Categoria
                        </span>
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                          {notif.name}
                        </span>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <span className="font-mono font-black text-slate-900">
                          {notif.count}
                        </span>
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md border text-emerald-600 bg-emerald-50 border-emerald-100 flex items-center gap-0.5 shrink-0">
                          {notif.trend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate?.('gov-relatorio')}
                className="w-full bg-[#0c2340] hover:bg-[#091a30] text-white text-[10px] font-black uppercase tracking-widest py-3.5 rounded-2xl border-0 transition-all shadow-xs cursor-pointer mt-4"
              >
                Ver todas
              </button>
            </div>
          </div>
          )}
        </div>

        {/* SECÇÃO 3 — SERVIÇOS INTELIGENTES */}
        <div className="space-y-6 mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-red-650 rounded-full" />
              <h2 className="text-base md:text-lg font-black italic tracking-tighter text-slate-900 uppercase">
                Serviços Inteligentes
              </h2>
            </div>
            <button onClick={() => setShowSmartServices(prev => !prev)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors cursor-pointer bg-transparent border-0">
              {showSmartServices ? 'Ocultar serviços' : 'Mostrar serviços inteligentes'}
            </button>
          </div>

          {showSmartServices && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Card QR CODE */}
            <div className="bg-white border border-[#0c2340]/15 rounded-[24px] p-6 shadow-xs min-h-[352px] flex flex-col justify-between text-center">
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center gap-2 mb-6 pb-2 border-b border-slate-100 w-full">
                  <div className="w-1 h-5 bg-red-650 rounded-full" />
                  <h3 className="text-xs font-black text-slate-955 uppercase tracking-[0.15em] italic">
                    Validações por QR Code
                  </h3>
                </div>

                {/* QR Code SVG Vector with scanning corner brackets - Centered & Enlarged */}
                <div className="relative p-4 bg-white rounded-2xl shadow-sm mb-5 shrink-0 flex items-center justify-center">
                  {/* Scanner Brackets */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-500 rounded-tl-sm" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-500 rounded-tr-sm" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-500 rounded-bl-sm" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-500 rounded-br-sm" />

                  <img 
                    src="https://i.postimg.cc/7PWwyst7/QR-Code.jpg" 
                    alt="QR Code de Validação" 
                    className="w-24 h-24 aspect-square object-contain" 
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="space-y-2 flex flex-col items-center">
                  <div className="text-3xl font-black text-slate-955 italic tracking-tighter leading-none">
                    <AnimatedCounter to={1108732} className="font-mono" />
                  </div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                     Validações Realizadas
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-[#10b981] bg-emerald-50 w-fit px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center justify-center gap-1.5">
                    <TrendingUp size={12} /> ↑ 14,2% vs mês anterior
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate?.('gov-correspondencias')}
                className="w-full bg-[#0c2340] hover:bg-[#091a30] text-white text-[10px] font-black uppercase tracking-widest py-3.5 rounded-2xl border-0 transition-all shadow-xs cursor-pointer mt-6"
              >
                Verificar Documento
              </button>
            </div>

            {/* Card ASSISTENTE IA */}
            <div className="bg-white border border-[#0c2340]/15 rounded-[24px] p-6 shadow-xs min-h-[352px] flex flex-col justify-between text-center">
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center gap-2 mb-6 pb-2 border-b border-slate-100 w-full">
                  <div className="w-1 h-5 bg-red-650 rounded-full" />
                  <h3 className="text-xs font-black text-slate-955 uppercase tracking-[0.15em] italic">
                    Sobre Assistência IA
                  </h3>
                </div>

                {/* Styled enlarge centered Brain Container */}
                <div className="w-24 h-24 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-5 shrink-0 shadow-sm relative overflow-hidden group">
                  <div className="absolute inset-0 bg-indigo-100/30 scale-75 rounded-full animate-pulse" />
                  <Brain size={42} className="text-indigo-600 relative z-10" />
                </div>

                <div className="space-y-[6px] flex flex-col items-center">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">
                    Assistência Inteligente
                  </h4>
                  <p className="text-[10px] text-slate-500 font-extrabold uppercase leading-relaxed text-center max-w-[240px]">
                    O sistema analisa, classifica e sugere ações para otimizar o fluxo de trabalho institucional.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onNavigate?.('gov-correspondencias');
                }}
                className="w-full bg-[#0c2340] hover:bg-[#091a30] text-white text-[10px] font-black uppercase tracking-widest py-3.5 rounded-2xl border-0 transition-all shadow-xs cursor-pointer mt-6"
              >
                Abrir Assistente IA
              </button>
            </div>

            {/* Card SEGURANÇA */}
            <div className="bg-white border border-[#0c2340]/15 rounded-[24px] p-6 shadow-none min-h-[352px] flex flex-col justify-between text-center">
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center gap-2 mb-6 pb-2 border-b border-slate-100 w-full">
                  <div className="w-1 h-5 bg-red-650 rounded-full" />
                  <h3 className="text-xs font-black text-slate-955 uppercase tracking-[0.15em] italic">
                    Login Biometrico
                  </h3>
                </div>

                {/* Styled enlarge centered Face mesh image container */}
                <div className="w-28 h-28 flex items-center justify-center mb-4 shrink-0 relative overflow-hidden group rounded-2xl">
                  <LazyImage
                    src="https://i.postimg.cc/x88pJx9X/Login-Biometrico.jpg"
                    alt="Login Biométrico"
                    placeholder="skeleton"
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      borderRadius: '0.75rem',
                    }}
                    className="relative z-10 transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="space-y-2 flex flex-col items-center">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    Estatísticas Ativas
                  </div>
                  <div className="text-3xl font-black text-slate-955 italic tracking-tighter leading-none flex items-center justify-center gap-2">
                    <AnimatedCounter to={100} suffix="%" className="font-mono" />
                    <span className="text-xs font-black uppercase text-emerald-600 tracking-wider">
                      Sistema Seguro
                    </span>
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1">
                    Integridade dos Dados
                  </p>
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <div className="p-3 bg-white border border-slate-300 rounded-2xl flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-mono uppercase font-black text-slate-700 tracking-wider">
                    Monitoramento Ativo &bull; CDA-SHIELD
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate?.('gov-seguranca')}
                  className="w-full bg-[#0c2340] hover:bg-[#091a30] text-white text-[10px] font-black uppercase tracking-widest py-3.5 rounded-2xl border-0 transition-all shadow-none cursor-pointer"
                >
                  Auditar Segurança
                </button>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* SECÇÃO 4 — ATIVIDADE RECENTE E STATUS */}
        <div className="space-y-6 mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-red-650 rounded-full" />
              <h2 className="text-base md:text-lg font-black italic tracking-tighter text-slate-900 uppercase">
                Atividade Recente e Status
              </h2>
            </div>
            <button onClick={() => setShowRecentActivity(prev => !prev)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors cursor-pointer bg-transparent border-0">
              {showRecentActivity ? 'Ocultar atividade' : 'Mostrar atividade completa'}
            </button>
          </div>

          {showRecentActivity && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Card Atividade Recente */}
            <div className="bg-white border border-[#0c2340]/15 rounded-[24px] p-6 md:p-8 shadow-xs flex flex-col justify-between text-left">
              <div>
                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100">
                  <div className="w-1 h-5 bg-red-650 rounded-full" />
                  <h3 className="text-xs font-black text-slate-955 uppercase tracking-[0.15em] italic">
                    Atividade Recente
                  </h3>
                </div>

                <div className="space-y-4">
                  {[
                    { desc: "Correspondência Fiscal enviada", time: "20/05/2025 10:42" },
                    { desc: "Notificação de Educação entregue", time: "20/05/2025 10:35" },
                    { desc: "Documento Oficial validado por QR Code", time: "20/05/2025 10:28" },
                    { desc: "Validação por QR Code realizada", time: "20/05/2025 10:15" },
                    { desc: "Correspondência de Justiça entregue", time: "20/05/2025 10:05" }
                  ].map((act, index) => (
                    <div key={index} className="flex justify-between items-center text-[11px] p-2 hover:bg-slate-50 rounded-xl transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="font-bold text-slate-850 uppercase tracking-wide">
                          {act.desc}
                        </span>
                      </div>
                      <span className="font-mono text-slate-400 font-bold shrink-0 ml-2">
                        {act.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate?.('gov-relatorio')}
                className="w-full bg-[#0c2340] hover:bg-[#091a30] text-white text-[10px] font-black uppercase tracking-widest py-3.5 rounded-2xl border-0 transition-all shadow-xs cursor-pointer mt-6"
              >
                Ver todas as atividades
              </button>
            </div>

            {/* Card Status do Sistema */}
            <div className="bg-white border border-[#0c2340]/15 rounded-[24px] p-6 md:p-8 shadow-xs flex flex-col justify-between text-left min-h-[350px]">
              <div>
                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100">
                  <div className="w-1 h-5 bg-red-650 rounded-full" />
                  <h3 className="text-xs font-black text-slate-955 uppercase tracking-[0.15em] italic">
                    Status do Sistema
                  </h3>
                </div>

                <div className="flex flex-col items-center justify-center gap-5 py-10 text-center">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center relative shadow-xs shrink-0">
                    <span className="absolute inset-0 rounded-full border border-emerald-400 animate-ping opacity-25" />
                    <CheckCircle2 size={44} className="text-emerald-500" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <h4 className="text-[22px] font-black text-emerald-600 uppercase tracking-widest leading-none">
                      Operacional
                    </h4>
                    <p className="text-xs text-slate-500 font-extrabold uppercase mt-1">
                      Todos os serviços ativos
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate?.('gov-seguranca')}
                className="w-full bg-[#0c2340] hover:bg-[#091a30] text-white text-[10px] font-black uppercase tracking-widest py-3.5 rounded-2xl border-0 transition-all shadow-xs cursor-pointer mt-6"
              >
                Ver Detalhes
              </button>
            </div>
          </div>
          )}
        </div>

        </div>
      </div>
  );
}
