/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// =========================================================================
// CANONICAL DOMAIN ENUMS
// =========================================================================

export enum AppMode {
  USER = 'user',
  INSTITUTION = 'institution',
  ADMIN = 'admin'
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

export enum SensitivityLevel {
  PUBLICO = "Público",
  PRIVADO = "Privado",
  SENSIVEL = "Sensível",
  RESTRITO = "Restrito",
  ULTRA_RESTRITO = "Ultra Restrito"
}

export enum PriorityScale {
  NORMAL = "Normal",
  IMPORTANTE = "Importante",
  URGENTE = "Urgente",
  CRITICO = "Crítico"
}

export enum CorrespondenceStatus {
  NAO_LIDA = "Não Lida",
  LIDA = "Lida",
  ENVIADA = "Enviada",
  RECEBIDA = "Recebida",
  EM_ANALISE = "Em Análise",
  RESPONDIDA = "Respondida",
  ARQUIVADA = "Arquivada",
  CANCELADA = "Cancelada"
}

export enum ProcessPriority {
  ALTA = "Alta",
  MEDIA = "Média",
  BAIXA = "Baixa"
}

export enum ProcessStatus {
  PENDENTE = "Pendente",
  URGENTE = "Urgente",
  PROCESSANDO = "Processando",
  CONCLUIDO = "Concluido",
  REJEITADO = "Rejeitado"
}

export enum AIPreApprovalStatus {
  PRE_APPROVED = "pre-approved",
  MANUAL_REVIEW = "manual-review"
}

export enum ContactStatus {
  PENDENTE = "Pendente",
  CONFIRMADO = "Confirmado"
}

export enum ContactType {
  NORMAL = "Normal",
  EMERGENCIA = "Emergência"
}

export enum InvoiceStatus {
  PENDENTE = "Pendente",
  PAGO = "Pago",
  ATRASADO = "Atrasado"
}

export enum PaymentMethod {
  MULTICAIXA_EXPRESS = "Multicaixa Express",
  ATM_REFERENCE = "Atm / Referência",
  TRANSFERENCIA = "Transferência",
  CARTEIRA_DIGITAL = "Carteira Digital"
}

export enum NotificationType {
  SUCCESS = "success",
  WARNING = "warning",
  INFO = "info"
}

// =========================================================================
// CANONICAL DOMAIN ENTITY INTERFACES
// =========================================================================

/**
 * 1. INSTITUTIONS
 * Represents government or utility entities registered on the portal.
 */
export interface DbInstitution {
  id: string;               // PK, e.g. "inst-agt"
  name: string;             // Short name, e.g. "AGT"
  fullName: string;         // Full name, e.g. "Administração Geral Tributária"
  category: InstitutionCategory;
  province: string;
  municipio: string;
  status: InstitutionStatus;
  instCode: string;         // Unique registration code, e.g. "AGT-001"
  typeInst: string;         // e.g. "Administração Geral", "Empresa Pública"
  cidade: string;
  comuna: string;
  address?: string;
  contactEmail: string;
  contactPhone: string;
  responsibleName: string;
  responsibleRole: string;
  registrationDate: string;  // ISO format or simple date
  logoUrl?: string;
  
  // Computed statistical properties (derived or aggregated)
  totalCorrespondence: number;
  totalAgents: number;
  lastActivity: string;
  responseRate: string;
  aiUsageRate: string;
  performanceScore: string;
}

/**
 * 2. PROFILES / USERS
 * Base authentication accounts for citizens, institutional workers, and system admins.
 */
export interface DbUser {
  id: string;               // PK, UUID matching Supabase Auth id
  email: string;            // Unique login email
  role: AppMode;            // Role determining dashboard layout
  status: 'Ativo' | 'Pendente' | 'Bloqueado';
  lastLogin: string;
}

/**
 * 3. CITIZENS
 * Civil identity records. Represents the official demographic and identification database.
 * Relates 1:1 to users (the profile of a citizen) if they register on the platform.
 */
export interface DbCitizen {
  bi: string;               // PK, unique Angolan ID Number, e.g. "009874562LA041"
  nif: string;              // Unique Tax Number
  passport: string;         // Passport Number
  fullName: string;
  birthDate: string;
  filiation: string;
  maritalStatus: string;
  phone: string;
  email: string;
  municipio: string;
  province: string;
  verificationLevel: 'Verificado' | 'Totalmente Verificado' | 'Pendente';
  confidenceScore: number;  // Biometric / credential score (e.g. 98)
  userId?: string;          // FK -> DbUser.id (optional, populated when registered)
  avatarUrl?: string;       // Public URL of profile picture
}

/**
 * 4. WORKERS
 * Institutional agents and workers registered to manage operations.
 * Relates 1:1 to DbUser. Holds association with an Institution.
 */
export interface DbWorker {
  id: string;               // PK, matching DbUser.id
  name: string;
  email: string;
  institutionId: string;    // FK -> DbInstitution.id
  role: string;             // Professional role, e.g. "Director Geral"
  avatarUrl: string;
  lastActive: string;
}

/**
 * 5. DIGITAL PROTOCOLS
 * Cryptographic sealing entity certifying valid correspondence or certificate issuing.
 */
export interface DbDigitalProtocol {
  id: string;               // PK, UUID
  protocolNumber: string;   // Unique format: "CDA-2026-PT-XXXXXX"
  issuerInstitution: string; // Institution name
  officialIssueDate: string;
  officialTime: string;
  issuerResponsible: string;
  category: string;
  documentType: string;
  currentState: string;
  priority: string;
  deadlineDate: string;
  qrCodeUrl: string;
  digitalSignature: string;   // Base64 or crypt signature
  digitalSeal?: string;       // HSM Seal Reference
  documentHash?: string;      // Computed SHA-256 hash of message body/doc
  institutionalCertificate?: string; // SN certificate serial number
  signatureDate?: string;
  legalValidity?: string;     // References legal decree
}

/**
 * 6. CORRESPONDENCES
 * Represents secure postal emails or official circulars exchanged on the network.
 */
export interface DbCorrespondence {
  id: number;               // PK
  senderBi: string;         // FK -> DbCitizen.bi or Institution system
  recipientBi: string;       // FK -> DbCitizen.bi
  org: string;              // Sender visual label, e.g. "AGT"
  preview: string;
  createdAt: string;        // Timestamp
  unread: boolean;
  subject: string;
  body: string;
  sensitivity: SensitivityLevel;
  priorityScale: PriorityScale;
  stateIndicator?: string;  // e.g. "Pagamento pendente"
  actions: string[];        // Array of action buttons enabled for the user
  attachments: string[];    // Array of attachment URLs/names
  protocolId?: string;      // FK -> DbDigitalProtocol.id (optional cryptographic seal)
  deadlineHoursRemaining?: number;
}

/**
 * 7. CORRESPONDENCE STATE HISTORY
 * Event audit log for individual correspondences demonstrating tracking status.
 */
export interface DbCorrespondenceStateEvent {
  id: string;               // PK, UUID
  correspondenceId: number; // FK -> DbCorrespondence.id
  state: CorrespondenceStatus;
  date: string;
  time: string;
  responsible: string;
  description: string;
}

/**
 * 8. DOCUMENTS (Digital Wallet Items)
 * Holds official digitised original papers inside the Digital Purse.
 */
export interface DbDocument {
  id: string;               // PK, UUID
  holderBi: string;         // FK -> DbCitizen.bi (associated with citizen holder)
  name: string;             // e.g. "BI Digital"
  validity: string;         // Validity status text
  code: string;             // Serialization code, e.g. "AO-BI-9281"
  documentNumber: string;   // Document serial number
  issuer: string;           // Issuer institution or department, e.g. "SME"
  issuedAt: string;         // Issue Date
  protocolId?: string;      // FK -> DbDigitalProtocol.id (cryptographic validation seal)
}

/**
 * 9. AUDIT LOGS
 * Security event logger tracking system and administrator events.
 */
export interface DbAuditLog {
  id: string;               // PK, BIGINT/Serial converted to string or UUID
  action: string;
  username: string;         // Actor identification (email, BI, or SYSTEM)
  timestamp: string;        // ISO DateTime
  actionType: NotificationType | 'danger' | 'info' | string;
}

/**
 * 10. SYSTEM NOTIFICATIONS
 * Alerts pushed to active user accounts.
 */
export interface DbNotification {
  id: number;               // PK
  targetBi: string;         // FK -> DbCitizen.bi
  title: string;
  message: string;
  timeText: string;         // e.g. "2h atrás"
  type: NotificationType;
  targetTab: string;        // Route/Tab target redirects
}

/**
 * 11. PROCESSES (User Service Requests)
 * Processes requested by citizens like tax forms or certificate issuances.
 */
export interface DbProcess {
  id: number;               // PK
  userBi: string;           // FK -> DbCitizen.bi
  userName: string;         // Redundant Denormalized name
  serviceType: string;      // e.g. "NIF", "IPU", "Certidão"
  priority: ProcessPriority;
  timeText: string;         // Elapsed time indicator
  status: ProcessStatus;
  institution?: string;     // Target Institution short name
  requestDate: string;      // ISO format date
}

/**
 * 12. DOCUMENT ISSUANCE REQUESTS (Internal processes)
 * Internal review flow for certifying digital identity papers.
 */
export interface DbDocRequest {
  id: number;               // PK
  userBi: string;           // FK -> DbCitizen.bi
  userName: string;
  docType: string;          // e.g. "BI Digital"
  institution: string;      // Target Institution, e.g. "SME"
  requestDate: string;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado';
  aiStatus: AIPreApprovalStatus;
}

/**
 * 13. TRUST CONTACTS (Circle of confidence)
 * Auxiliary networks for alerts and vital health data synchronization.
 */
export interface DbTrustContact {
  id: number;               // PK
  ownerBi: string;          // FK -> DbCitizen.bi (associated owner)
  name: string;
  bi: string;               // Contact Person's BI
  relation: string;         // e.g. "Mãe", "Irmão"
  status: ContactStatus;
  type: ContactType;
  phone: string;
}

/**
 * 14. UTILITY SERVICES BILLS / INVOICES
 * Unpaid debts synchronised automatically.
 */
export interface DbInvoice {
  id: string;               // PK, e.g. "FAT-ENDE-2026-991"
  institutionId: string;    // FK -> DbInstitution.id
  contractNumber: string;   // Associated client number
  reference: string;        // Pay reference
  amount: string;           // e.g. "11.200 Kz"
  amountKz: number;         // Numeric currency representation
  period: string;           // e.g. "Maio/2026"
  dueDate: string;          // Limit date
  status: InvoiceStatus;
}

/**
 * 15. PAYMENTS (Receipts history)
 * Transaction records of processed service fees.
 */
export interface DbPaymentRecord {
  id: string;               // PK, e.g. "PAY-00129"
  reference: string;        // Payment target reference code
  amount: string;           // e.g. "45.000 Kz"
  institutionName: string;   // target
  paymentMethod: PaymentMethod;
  dateTime: string;         // ISO timestamp
  receiptNumber: string;    // Document serial code of transaction proof
  status: 'Liquidado' | 'Estornado';
}

/**
 * 16. AI ASSISTANT CONFIGURATIONS
 * Represents digital assistant settings mapped to institutional roles.
 */
export interface DbAIAssistantConfig {
  id: string;               // PK, UUID or specific code
  name: string;
  avatarUrl: string;
  promptTheme: string;      // Context instructions
  greetingMessage: string;
  voicePitch: number;       // Speech factors
  voiceSpeed: number;
}

/**
 * 17. AI KNOWLEDGE BASE CHUNKS
 * Relational context documentation to ground Gemini responses dynamically per institution.
 */
export interface DbAiKnowledgeBaseChunk {
  id: string;               // PK, UUID
  institutionId: string;    // FK -> DbInstitution.id
  title: string;            // Document title, e.g. "Código Tributário Seccional"
  content: string;          // Text block
  updateDate: string;
}
