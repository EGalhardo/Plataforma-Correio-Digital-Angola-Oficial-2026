/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DigitalProtocol {
  internalId: string;
  protocolNumber: string;
  issuerInstitution: string;
  officialIssueDate: string;
  officialTime: string;
  issuerResponsible: string;
  category: string;
  documentType: string;
  currentState: string;
  priority: string;
  deadlineDate: string;
  qrCodeUrl: string;
  digitalSignature: string;
  digitalSeal?: string;
  documentHash?: string;
  institutionalCertificate?: string;
  signatureDate?: string;
  legalValidity?: string;
  archiveReference?: string;
  archiveLocation?: string;
}

export interface CorrespondenceStateEvent {
  state: 'Recebida' | 'Entregue' | 'Visualizada' | 'Confirmada' | 'Respondida' | 'Em análise' | 'Aprovada' | 'Rejeitada' | 'Contestada' | 'Expirada' | 'Arquivada' | 'Encaminhada';
  date: string;
  time: string;
  responsible: string;
  description: string;
}

export interface MessageDetail {
  subject: string;
  body: string;
  deadline?: string;
  state?: string;
  actions?: string[];
  attachments?: string[];
}

export interface Message {
  id: number;
  org: string;
  preview: string;
  date: string;
  unread?: number;
  status: string;
  institution?: string;
  details?: MessageDetail;
  protocol?: DigitalProtocol;
  stateHistory?: CorrespondenceStateEvent[];
  auditLogs?: string[];
  sensitivity?: 'Público' | 'Privado' | 'Sensível' | 'Restrito' | 'Ultra Restrito';
  priorityScale?: 'Normal' | 'Importante' | 'Urgente' | 'Crítico';
  deadlineHoursRemaining?: number;
}

export interface Document {
  name: string;
  validity: string;
  code: string;
  holder: string;
  number: string;
  issuer: string;
  issuedAt: string;
  protocol?: DigitalProtocol;
}

export interface Contact {
  id: number;
  name: string;
  bi: string;
  relation: string;
  status: string;
  type?: 'Normal' | 'Emergência';
  phone?: string;
}

export interface Slide {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  mobileImage?: string;
  btn: string;
  action: string;
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  time: string;
  type: 'success' | 'warning' | 'info';
  targetTab: string;
}

export interface UserRequest {
  id: number;
  user: string;
  type: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  time: string;
  status: 'pendente' | 'urgente' | 'processando' | 'concluido' | 'rejeitado';
  bi: string;
  institution?: string;
  date?: string;
}

export interface DocRequest {
  id: number;
  userName: string;
  userBi: string;
  docType: string;
  institution: string;
  date: string;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado';
  aiStatus?: 'pre-approved' | 'manual-review';
}

export type AppMode = 'user' | 'institution' | 'admin';

export interface SensitivityConfig {
  level: 'Público' | 'Privado' | 'Sensível' | 'Restrito' | 'Ultra Restrito';
  color: string;
  textColor: string;
  borderColor: string;
  badgeBg: string;
  dotColor: string;
  accessRules: string;
  encryption: string;
  sessionTimeout: string;
  sessionTimeoutSeconds: number;
  shareControl: string;
  screenshotProtection: boolean;
}

export const SENSITIVITY_LEVELS: Record<'Público' | 'Privado' | 'Sensível' | 'Restrito' | 'Ultra Restrito', SensitivityConfig> = {
  'Público': {
    level: 'Público',
    color: 'emerald',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-150',
    badgeBg: 'bg-emerald-50/50',
    dotColor: 'bg-emerald-500',
    accessRules: 'Acesso público sem restrições regulamentares. Qualquer cidadão autenticado pode visualizar.',
    encryption: 'Segurança de Infraestrutura em canal TLS 1.3 padrão.',
    sessionTimeout: 'Sem limite de tempo por inatividade.',
    sessionTimeoutSeconds: 0,
    shareControl: 'Permitido reencaminhar, arquivar, descarregar e partilhar sem restrições.',
    screenshotProtection: false,
  },
  'Privado': {
    level: 'Privado',
    color: 'blue',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-150',
    badgeBg: 'bg-blue-50/50',
    dotColor: 'bg-blue-500',
    accessRules: 'Acesso restrito ao titular mediante logon seguro individual no portal.',
    encryption: 'Cifragem AES-256 com chaves padrão do sistema de correio digital.',
    sessionTimeout: '60 minutos de sessão.',
    sessionTimeoutSeconds: 3600,
    shareControl: 'Permitido arquivar e descarregar. Partilha com aposição de marca de água do destinatário.',
    screenshotProtection: false,
  },
  'Sensível': {
    level: 'Sensível',
    color: 'amber',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    badgeBg: 'bg-amber-50/50',
    dotColor: 'bg-amber-500',
    accessRules: 'Acesso seguro por dupla confirmação integrada de identidade biométrica ou PIN ativa.',
    encryption: 'Cifragem simétrica AES-GCM-256 com chave sob custódia de HSM dedicado do Estado.',
    sessionTimeout: '15 minutos sob inatividade.',
    sessionTimeoutSeconds: 900,
    shareControl: 'Bloqueado o envio para canais externos não governamentais. Reencaminhamento auditado.',
    screenshotProtection: true,
  },
  'Restrito': {
    level: 'Restrito',
    color: 'orange',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    badgeBg: 'bg-orange-50/50',
    dotColor: 'bg-orange-500',
    accessRules: 'Acesso controlado. Requer verificação contínua do token do dispositivo oficial cadastrado.',
    encryption: 'Criptografia em trânsito ECDH com chaves temporárias efémeras exclusivas.',
    sessionTimeout: '5 minutos de sessão activa antes de reautenticação compulsória.',
    sessionTimeoutSeconds: 300,
    shareControl: 'Reencaminhamento desativado de forma absoluta. Apenas leitura e auditoria.',
    screenshotProtection: true,
  },
  'Ultra Restrito': {
    level: 'Ultra Restrito',
    color: 'red',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    badgeBg: 'bg-red-50/50',
    dotColor: 'bg-red-500',
    accessRules: 'Alto nível de segurança. Acesso apenas após reintrodução imprevista de credencial e registo imediato no SOC.',
    encryption: 'Criptografia híbrida Pós-Quântica (Kyber-1024) com verificação de integridade forte SHA-512.',
    sessionTimeout: '2 minutos sob vigilância cibernética ativa.',
    sessionTimeoutSeconds: 120,
    shareControl: 'Bloqueado qualquer tipo de reencaminhamento, resposta ou descarregamento tradicional.',
    screenshotProtection: true,
  }
};

export interface PriorityConfig {
  priority: 'Normal' | 'Importante' | 'Urgente' | 'Crítico';
  color: string;
  textColor: string;
  borderColor: string;
  badgeBg: string;
  dotColor: string;
  defaultHours: number;
  consequence: string;
  autoAlerts: string[];
  escalationLevels: string[];
}

export const PRIORITY_CONFIGS: Record<'Normal' | 'Importante' | 'Urgente' | 'Crítico', PriorityConfig> = {
  'Normal': {
    priority: 'Normal',
    color: 'slate',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-200',
    badgeBg: 'bg-slate-55',
    dotColor: 'bg-slate-400',
    defaultHours: 120,
    consequence: 'Arquivamento tardio com advertência administrativa simples.',
    autoAlerts: ['Notificação por email institucional após 24 horas', 'Alerta visual padrão no painel.'],
    escalationLevels: ['Lembrete preventivo simples no painel de correio eletrónico.', 'Arquivamento simples por decurso de prazo oficial sem sanção patrimonial.']
  },
  'Importante': {
    priority: 'Importante',
    color: 'blue',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    badgeBg: 'bg-blue-50',
    dotColor: 'bg-blue-500',
    defaultHours: 72,
    consequence: 'Perda do bónus ou redução opcional de 15% na taxa administrativa regulamentar.',
    autoAlerts: ['Alerta push diário automático.', 'Notificação com contagem decrescente no sumário semanal.'],
    escalationLevels: ['Confirmação de recepção reenviada para o portal.', 'Petição de esclarecimento preventivo de inatividade governamental.']
  },
  'Urgente': {
    priority: 'Urgente',
    color: 'amber',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    badgeBg: 'bg-amber-50',
    dotColor: 'bg-amber-500',
    defaultHours: 48,
    consequence: 'Suspensão e retenção temporária do serviço de emissão de novas guias e certidões no portal.',
    autoAlerts: ['Notificador fixo no cabeçalho.', 'Contacto telefónico assistido ou correio expresso sob custódia.'],
    escalationLevels: ['Comunicação eletrónica alternativa para serviços autorizados.', 'Envio urgente de estafeta de notificação física ao domicílio tributário.']
  },
  'Crítico': {
    priority: 'Crítico',
    color: 'red',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    badgeBg: 'bg-red-50/70',
    dotColor: 'bg-red-600',
    defaultHours: 24,
    consequence: 'Execução fiscal imediata pela AGT ou impugnação legal definitiva de direitos.',
    autoAlerts: ['Notificação sonora imersiva recursiva.', 'Envio de aviso prévio prioritário de Execução a cada 4 horas.'],
    escalationLevels: ['Submissão imediata de dossiê de contencioso eletrónico ao Executivo Judicial.', 'Emissão de mandado administrativo e fiscal em coordenação policial ou militar.']
  }
};

export interface Correspondence {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  originProvince: string;
  destinationProvince: string;
  institution: 'AGT' | 'SME' | 'Tribunal Supremo' | 'Registo Civil' | 'ENDE' | 'MINJUS' | string;
  status: 'Enviada' | 'Recebida' | 'Em Análise' | 'Respondida' | 'Arquivada' | 'Cancelada' | string;
  date: string;
  body: string;
  category?: string;
  sentDate?: string;
  receivedDate?: string;
  responseTime?: string;
  priority?: 'Alta' | 'Média' | 'Baixa' | string;
  attachments?: { name: string; size: string }[];
  history?: { action: string; dateTime: string; user: string }[];
  isDelayed?: boolean;
  delayDays?: number;
}

export interface SessionUser {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  bi: string;
  nif: string;
  passport: string;
  phone: string;
  email: string;
  birthDate: string;
  filiation: string;
  maritalStatus: string;
  avatarUrl: string;
  verificationLevel: 'Verificado' | 'Totalmente Verificado' | 'Pendente';
  confidenceScore: number;
  lastAccess: string;
}

export interface ActiveProfile {
  mode: AppMode;
  role: string;
  institutionName?: string;
  departmentName?: string;
  permissions: string[];
}

export enum InstitutionCategory {
  FINANCAS = "Finanças",
  INFRAESTRUTURA = "Infraestrutura",
  SERVICOS = "Serviços",
  SEGURANCA = "Segurança",
  SAUDE = "Saúde",
  JUSTICA = "Justiça",
  EDUCACAO = "Educação"
}

export enum InstitutionStatus {
  ATIVA = "Ativa",
  INATIVA = "Inativa"
}

export interface Institution {
  id: string;
  name: string;
  fullName: string;
  category: InstitutionCategory | string;
  province: string;
  municipio: string;
  status: InstitutionStatus | string;
  totalCorrespondence: number;
  totalAgents: number;
  lastActivity: string;
  responseRate: string;
  typeInst?: string;
  cidade?: string;
  comuna?: string;
  address?: string;
  registrationDate: string;
  aiUsageRate: string;
  performanceScore: string;
  contactEmail: string;
  contactPhone: string;
  responsibleName: string;
  responsibleRole: string;
  logoUrl?: string;
  instCode?: string;
}

export type LanguageCode = 'pt' | 'um' | 'ki' | 'kk' | 'ch' | 'ng' | 'kw' | 'nh' | 'fi';

export interface VideoSession {
  id: string;
  roomName: string;
  subject: string;
  associatedProtocol?: string;
  associatedMessageId?: number;
  status: 'agendada' | 'disponivel' | 'em_curso' | 'concluida' | 'cancelada';
  hostBi: string;
  hostName: string;
  guestBi: string;
  guestName: string;
  scheduledFor: string;
  createdAt: string;
  closedAt?: string;
}

// Extended VideoSession with enhanced features
export interface VideoSessionExtended extends VideoSession {
  agenda?: string;
  notes?: string;
  duration?: number;
  quality?: 'excellent' | 'good' | 'poor';
  participantCount?: number;
}

// Video Session Notification
export interface VideoSessionNotification {
  id: string;
  sessionId: string;
  type: 'reminder' | 'status_change' | 'participant_update' | 'quality_alert';
  message: string;
  timestamp: string;
  read: boolean;
}

export interface VideoSessionParticipant {
  id: string;
  sessionId: string;
  bi: string;
  name: string;
  role: 'host' | 'guest';
  joinedAt: string;
  leftAt?: string;
}

export interface VideoSessionEvent {
  id: string;
  sessionId: string;
  eventType: 'criada' | 'agendada' | 'entrada' | 'saida' | 'iniciada' | 'encerrada' | 'cancelada';
  bi: string;
  userName: string;
  description: string;
  timestamp: string;
}

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  flagCode: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'pt', label: 'Português', flagCode: 'AO' },
  { code: 'um', label: 'Umbundu', flagCode: 'UM' },
  { code: 'ki', label: 'Kimbundu', flagCode: 'KI' },
  { code: 'kk', label: 'Kikongo', flagCode: 'KK' },
  { code: 'ch', label: 'Chokwe', flagCode: 'CH' },
  { code: 'ng', label: 'Ngangela', flagCode: 'NG' },
  { code: 'kw', label: 'Kwanyama', flagCode: 'KW' },
  { code: 'nh', label: 'Nhaneca', flagCode: 'NH' },
  { code: 'fi', label: 'Fiote', flagCode: 'FI' }
];





