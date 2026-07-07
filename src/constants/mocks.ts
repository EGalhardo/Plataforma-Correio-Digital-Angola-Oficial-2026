/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  SessionUser, 
  ActiveProfile, 
  AppMode, 
  Institution, 
  InstitutionCategory, 
  InstitutionStatus,
  Message, 
  Document, 
  Contact, 
  Slide, 
  AppNotification,
  UserRequest,
  DocRequest,
  Correspondence,
  DigitalProtocol
} from '../types';

// ==========================================
// 1. SESSION DOMAIN
// ==========================================
export const MOCK_SESSION_USER: SessionUser = {
  id: "USR-009874562-EDL",
  name: "Edlasio Galhardo",
  firstName: "Edlasio",
  lastName: "Galhardo",
  bi: "009874562LA041",
  nif: "5401329188",
  passport: "AO-P129384",
  phone: "+244 923 000 111",
  email: "edlasio.galhardo@gmail.com",
  birthDate: "12/03/1995",
  filiation: "António Galhardo & Maria Conceição",
  maritalStatus: "Solteiro",
  avatarUrl: "https://i.postimg.cc/J73QvnGv/Foto-Edlasio.png", // Consistent premium photo
  verificationLevel: "Totalmente Verificado",
  confidenceScore: 98,
  lastAccess: "Hoje às 18:45"
};

export const MOCK_SESSION_PROFILES: Record<AppMode, ActiveProfile> = {
  user: {
    mode: "user",
    role: "Cidadão Autenticado",
    permissions: ["read_documents", "request_documents", "receive_correspondence", "manage_contacts"],
  },
  institution: {
    mode: "institution",
    role: "Gestor de Contas Digital",
    institutionName: "Administração Geral Tributária (AGT)",
    departmentName: "Direcção de Atendimento e Fiscalização Digital",
    permissions: ["read_institution_data", "issue_correspondence", "validate_documents", "manage_operations"],
  },
  admin: {
    mode: "admin",
    role: "Administrador de Sistemas Geral",
    institutionName: "Direcção de Tecnologia e Segurança Digital do Estado",
    departmentName: "Gabinete de Operações de Segurança (SOC)",
    permissions: ["all_access", "audit_logs", "system_controls", "emergency_trigger", "admin_workers"],
  }
};

// ==========================================
// 2. INSTITUTIONS DOMAIN
// ==========================================
export const MOCK_INSTITUTIONS: Institution[] = [
  {
    id: "inst-inapem",
    name: "INAPEM",
    fullName: "Instituto de Apoio às Micro, Pequenas e Médias Empresas",
    category: InstitutionCategory.SERVICOS,
    province: "Luanda",
    municipio: "Talatona",
    status: InstitutionStatus.ATIVA,
    totalCorrespondence: 54200,
    totalAgents: 14,
    lastActivity: "Há 5 mins",
    responseRate: "95.0%",
    registrationDate: "04/05/2024",
    aiUsageRate: "81%",
    performanceScore: "94.8%",
    contactEmail: "apoio@inapem.gov.ao",
    contactPhone: "+244 923 888 999",
    responsibleName: "Dr. João Sebastião",
    responsibleRole: "Director Geral",
    instCode: "INAPEM-001",
    typeInst: "Instituto Público",
    cidade: "Luanda (Capital)",
    comuna: "Talatona Sede"
  },
  {
    id: "inst-agt",
    name: "AGT",
    fullName: "Administração Geral Tributária",
    category: InstitutionCategory.FINANCAS,
    province: "Luanda",
    municipio: "Ingombota",
    status: InstitutionStatus.ATIVA,
    totalCorrespondence: 342400,
    totalAgents: 45,
    lastActivity: "Há 1 min",
    responseRate: "97.5%",
    registrationDate: "10/01/2025",
    aiUsageRate: "94%",
    performanceScore: "98.5%",
    contactEmail: "geral@agt.gov.ao",
    contactPhone: "+244 923 111 222",
    responsibleName: "Dr. Francisco Manuel",
    responsibleRole: "Presidente do Conselho de Administração",
    instCode: "AGT-001",
    typeInst: "Administração Geral",
    cidade: "Luanda (Capital)",
    comuna: "Maculusso"
  },
  {
    id: "inst-sme",
    name: "SME",
    fullName: "Serviço de Migração e Estrangeiros",
    category: InstitutionCategory.SEGURANCA,
    province: "Luanda",
    municipio: "Maianga",
    status: InstitutionStatus.ATIVA,
    totalCorrespondence: 198250,
    totalAgents: 32,
    lastActivity: "Há 4 mins",
    responseRate: "94.2%",
    registrationDate: "15/02/2025",
    aiUsageRate: "88%",
    performanceScore: "95.0%",
    contactEmail: "geral@sme.gov.ao",
    contactPhone: "+244 923 000 000",
    responsibleName: "Dr. António Fernando",
    responsibleRole: "Director Geral",
    instCode: "SME-001",
    typeInst: "Serviço Público Regular",
    cidade: "Luanda (Capital)",
    comuna: "Maianga Sede"
  },
  {
    id: "inst-ende",
    name: "ENDE",
    fullName: "Empresa Nacional de Distribuição de Electricidade",
    category: InstitutionCategory.INFRAESTRUTURA,
    province: "Benguela",
    municipio: "Lobito",
    status: InstitutionStatus.ATIVA,
    totalCorrespondence: 92100,
    totalAgents: 18,
    lastActivity: "Há 18 mins",
    responseRate: "89.0%",
    registrationDate: "01/03/2025",
    aiUsageRate: "76%",
    performanceScore: "88.5%",
    contactEmail: "suporte@ende.ao",
    contactPhone: "+244 912 345 678",
    responsibleName: "Dr. Manuel Rebelo",
    responsibleRole: "Administrador Executivo",
    instCode: "ENDE-002",
    typeInst: "Empresa Pública",
    cidade: "Lobito",
    comuna: "Lobito Sede"
  },
  {
    id: "inst-epal",
    name: "EPAL",
    fullName: "Empresa Pública de Águas de Luanda",
    category: InstitutionCategory.INFRAESTRUTURA,
    province: "Luanda",
    municipio: "Viana",
    status: InstitutionStatus.ATIVA,
    totalCorrespondence: 84300,
    totalAgents: 12,
    lastActivity: "Há 22 mins",
    responseRate: "91.8%",
    registrationDate: "12/03/2025",
    aiUsageRate: "82%",
    performanceScore: "91.0%",
    contactEmail: "geral@epal.gov.ao",
    contactPhone: "+244 924 999 888",
    responsibleName: "Engª. Maria da Luz",
    responsibleRole: "Directora de Operações",
    instCode: "EPAL-001",
    typeInst: "Empresa Pública",
    cidade: "Viana",
    comuna: "Viana Sede"
  },
  {
    id: "inst-minjus",
    name: "MINJUS",
    fullName: "Ministério da Justiça e dos Direitos Humanos",
    category: InstitutionCategory.JUSTICA,
    province: "Huíla",
    municipio: "Lubango",
    status: InstitutionStatus.ATIVA,
    totalCorrespondence: 184200,
    totalAgents: 28,
    lastActivity: "Há 8 mins",
    responseRate: "98.2%",
    registrationDate: "20/01/2025",
    aiUsageRate: "91%",
    performanceScore: "97.8%",
    contactEmail: "contacto@minjusdh.gov.ao",
    contactPhone: "+244 921 555 333",
    responsibleName: "Dr. Alberto António",
    responsibleRole: "Delegado Provincial",
    instCode: "MINJUS-005",
    typeInst: "Ministério",
    cidade: "Lubango (Capital)",
    comuna: "Lubango Sede"
  },
  {
    id: "inst-minsa",
    name: "MINSA",
    fullName: "Ministério da Saúde",
    category: InstitutionCategory.SAUDE,
    province: "Huambo",
    municipio: "Huambo",
    status: InstitutionStatus.ATIVA,
    totalCorrespondence: 112400,
    totalAgents: 22,
    lastActivity: "Há 25 mins",
    responseRate: "92.5%",
    registrationDate: "05/04/2025",
    aiUsageRate: "84%",
    performanceScore: "92.1%",
    contactEmail: "provincial@minsa.gov.ao",
    contactPhone: "+244 922 888 777",
    responsibleName: "Dra. Isabel Cândida",
    responsibleRole: "Directora Clínica",
    instCode: "MINSA-002",
    typeInst: "Ministério",
    cidade: "Huambo (Capital)",
    comuna: "Huambo Sede"
  },
  {
    id: "inst-pna",
    name: "PNA",
    fullName: "Polícia Nacional de Angola",
    category: InstitutionCategory.SEGURANCA,
    province: "Cabinda",
    municipio: "Cabinda",
    status: InstitutionStatus.ATIVA,
    totalCorrespondence: 76500,
    totalAgents: 15,
    lastActivity: "Há 2 dias",
    responseRate: "85.4%",
    registrationDate: "18/02/2025",
    aiUsageRate: "65%",
    performanceScore: "84.0%",
    contactEmail: "cabinda@pna.gov.ao",
    contactPhone: "+244 923 444 555",
    responsibleName: "Subcomissário João Bento",
    responsibleRole: "Comandante Provincial",
    instCode: "PNA-010",
    typeInst: "Força de Segurança",
    cidade: "Cabinda (Capital)",
    comuna: "Cabinda Sede"
  },
  {
    id: "inst-inss",
    name: "INSS",
    fullName: "Instituto Nacional de Segurança Social",
    category: InstitutionCategory.SERVICOS,
    province: "Luanda",
    municipio: "Cazenga",
    status: InstitutionStatus.ATIVA,
    totalCorrespondence: 154200,
    totalAgents: 24,
    lastActivity: "Há 3 horas",
    responseRate: "93.0%",
    registrationDate: "12/03/2024",
    aiUsageRate: "79%",
    performanceScore: "94.2%",
    contactEmail: "suporte@inss.gov.ao",
    contactPhone: "+244 932 777 666",
    responsibleName: "Dra. Paula de Carvalho",
    responsibleRole: "Directora de Prestações",
    instCode: "INSS-001",
    typeInst: "Instituto Público",
    cidade: "Luanda (Capital)",
    comuna: "Cazenga Sede"
  },
  {
    id: "inst-cne",
    name: "CNE",
    fullName: "Comissão Nacional Eleitoral",
    category: InstitutionCategory.SERVICOS,
    province: "Luanda",
    municipio: "Ingombota",
    status: InstitutionStatus.ATIVA,
    totalCorrespondence: 45000,
    totalAgents: 10,
    lastActivity: "Há 1 semana",
    responseRate: "90.0%",
    registrationDate: "22/07/2024",
    aiUsageRate: "45%",
    performanceScore: "89.5%",
    contactEmail: "apoio@cne.ao",
    contactPhone: "+244 925 111 222",
    responsibleName: "Dr. Manuel da Silva",
    responsibleRole: "Delegado Nacional",
    instCode: "CNE-001",
    typeInst: "Órgão Independente",
    cidade: "Luanda (Capital)",
    comuna: "Ingombota Sede"
  },
  {
    id: "inst-registocivil",
    name: "Registo Civil",
    fullName: "Conservatória do Registo Civil de Belas",
    category: InstitutionCategory.JUSTICA,
    province: "Luanda",
    municipio: "Belas",
    status: InstitutionStatus.ATIVA,
    totalCorrespondence: 167800,
    totalAgents: 30,
    lastActivity: "Há 12 mins",
    responseRate: "96.4%",
    registrationDate: "14/01/2024",
    aiUsageRate: "89%",
    performanceScore: "95.5%",
    contactEmail: "registo.civil.belas@minjus.gov.ao",
    contactPhone: "+244 933 444 333",
    responsibleName: "Dra. Maria Fernanda",
    responsibleRole: "Conservadora Geral",
    instCode: "RC-002",
    typeInst: "Conservatória",
    cidade: "Luanda",
    comuna: "Talatona"
  },
  {
    id: "inst-notariado",
    name: "Notariado",
    fullName: "Repartição de Notariado de Luanda",
    category: InstitutionCategory.JUSTICA,
    province: "Luanda",
    municipio: "Maianga",
    status: InstitutionStatus.ATIVA,
    totalCorrespondence: 89000,
    totalAgents: 14,
    lastActivity: "Há 45 mins",
    responseRate: "92.0%",
    registrationDate: "20/02/2024",
    aiUsageRate: "70%",
    performanceScore: "91.2%",
    contactEmail: "notariado.maianga@minjus.gov.ao",
    contactPhone: "+244 927 000 888",
    responsibleName: "Dr. Carlos de Matos",
    responsibleRole: "Notário Público do Estado",
    instCode: "NOT-001",
    typeInst: "Notariado",
    cidade: "Luanda",
    comuna: "Maianga Central"
  },
  {
    id: "inst-tribunalcomarca",
    name: "Tribunal de Comarca",
    fullName: "Tribunal de Comarca de Luanda",
    category: InstitutionCategory.JUSTICA,
    province: "Luanda",
    municipio: "Talatona",
    status: InstitutionStatus.ATIVA,
    totalCorrespondence: 184500,
    totalAgents: 40,
    lastActivity: "Há 15 mins",
    responseRate: "95.1%",
    registrationDate: "05/01/2024",
    aiUsageRate: "85%",
    performanceScore: "96.0%",
    contactEmail: "comarca.luanda@tribunais.gov.ao",
    contactPhone: "+244 929 111 999",
    responsibleName: "Dr. Adalberto Costa",
    responsibleRole: "Juiz Presidente de Comarca",
    instCode: "TRIB-CO-001",
    typeInst: "Tribunal de Justiça",
    cidade: "Luanda (Capital)",
    comuna: "Talatona Sede"
  },
  {
    id: "inst-universidadepub",
    name: "Universidade Pública",
    fullName: "Universidade Agostinho Neto (UAN)",
    category: InstitutionCategory.EDUCACAO,
    province: "Luanda",
    municipio: "Belas",
    status: InstitutionStatus.ATIVA,
    totalCorrespondence: 120500,
    totalAgents: 65,
    lastActivity: "Há 2 horas",
    responseRate: "87.8%",
    registrationDate: "10/05/2024",
    aiUsageRate: "62%",
    performanceScore: "89.0%",
    contactEmail: "reitoria@uan.ao",
    contactPhone: "+244 931 222 333",
    responsibleName: "Dr. João Sebastião",
    responsibleRole: "Reitor Académico",
    instCode: "UAN-001",
    typeInst: "Instituição de Ensino Superior",
    cidade: "Luanda (Capital)",
    comuna: "Campus Universitário"
  }
];

// ==========================================
// 3. USERS DOMAIN (Registered accounts)
// ==========================================
export interface MockUserEntity {
  id: string;
  name: string;
  email: string;
  bi: string;
  nif: string;
  role: 'citizen' | 'worker' | 'admin';
  avatarUrl: string;
  status: 'Ativo' | 'Pendente' | 'Bloqueado';
  lastLogin: string;
}

export const MOCK_USERS: MockUserEntity[] = [
  {
    id: "USR-009874562-EDL",
    name: "Edlasio Galhardo",
    email: "edlasio.galhardo@gmail.com",
    bi: "009874562LA041",
    nif: "5401329188",
    role: "citizen",
    avatarUrl: "https://i.postimg.cc/J73QvnGv/Foto-Edlasio.png",
    status: "Ativo",
    lastLogin: "Hoje às 18:45"
  },
  {
    id: "usr-maria",
    name: "Maria Antónia",
    email: "maria.antonia@gmail.com",
    bi: "008812342LA011",
    nif: "5412889311",
    role: "citizen",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
    status: "Ativo",
    lastLogin: "Ontem às 10:20"
  },
  {
    id: "usr-jose",
    name: "José Kalunga",
    email: "jose.kalunga@gmail.com",
    bi: "007712342LA021",
    nif: "5412889422",
    role: "citizen",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
    status: "Ativo",
    lastLogin: "Hoje às 11:15"
  },
  {
    id: "usr-ana",
    name: "Ana Baptista",
    email: "ana.baptista@gmail.com",
    bi: "009991332LA018",
    nif: "5412889533",
    role: "citizen",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150",
    status: "Pendente",
    lastLogin: "Há 3 dias"
  },
  {
    id: "usr-carlos",
    name: "Carlos Manuel",
    email: "carlos.manuel@outlook.com",
    bi: "001122334LA055",
    nif: "5412889644",
    role: "citizen",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150",
    status: "Ativo",
    lastLogin: "Ontem às 15:30"
  },
  {
    id: "usr-beatriz",
    name: "Beatriz Costa",
    email: "beatriz.costa@hotmail.com",
    bi: "002233445LA066",
    nif: "5412889755",
    role: "citizen",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
    status: "Ativo",
    lastLogin: "Ontem às 17:10"
  },
  {
    id: "usr-antonio",
    name: "António Lopes",
    email: "antonio.lopes@gmail.com",
    bi: "003344556LA077",
    nif: "5412889866",
    role: "citizen",
    avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=150",
    status: "Ativo",
    lastLogin: "Há 4 dias"
  }
];

// ==========================================
// 4. CITIZENS DOMAIN (Civil Identities)
// ==========================================
export interface MockCitizenEntity {
  bi: string;
  nif: string;
  passport: string;
  fullName: string;
  birthDate: string;
  filiation: string;
  maritalStatus: string;
  phone: string;
  email: string;
  municipio: string;
  province: string;
  verificationLevel: string;
  confidenceScore: number;
}

export const MOCK_CITIZENS: MockCitizenEntity[] = [
  {
    bi: "009874562LA041",
    nif: "5401329188",
    passport: "AO-P129384",
    fullName: "Edlasio Galhardo",
    birthDate: "12/03/1995",
    filiation: "António Galhardo & Maria Conceição",
    maritalStatus: "Solteiro",
    phone: "+244 923 000 111",
    email: "edlasio.galhardo@gmail.com",
    municipio: "Maianga",
    province: "Luanda",
    verificationLevel: "Totalmente Verificado",
    confidenceScore: 98
  },
  {
    bi: "008812342LA011",
    nif: "5412889311",
    passport: "AO-P238491",
    fullName: "Maria Antónia",
    birthDate: "24/09/1988",
    filiation: "Manuel Francisco & Ana Antónia",
    maritalStatus: "Casada",
    phone: "+244 924 111 222",
    email: "maria.antonia@gmail.com",
    municipio: "Ingombota",
    province: "Luanda",
    verificationLevel: "Totalmente Verificado",
    confidenceScore: 95
  },
  {
    bi: "007712342LA021",
    nif: "5412889422",
    passport: "AO-P349502",
    fullName: "José Kalunga",
    birthDate: "05/11/1982",
    filiation: "Pedro Kalunga & Filomena Kalunga",
    maritalStatus: "Casado",
    phone: "+244 912 333 444",
    email: "jose.kalunga@gmail.com",
    municipio: "Cazenga",
    province: "Luanda",
    verificationLevel: "Totalmente Verificado",
    confidenceScore: 92
  },
  {
    bi: "009991332LA018",
    nif: "5412889533",
    passport: "AO-P459613",
    fullName: "Ana Baptista",
    birthDate: "15/07/1993",
    filiation: "Mateus Baptista & Sara Baptista",
    maritalStatus: "Solteira",
    phone: "+244 933 555 666",
    email: "ana.baptista@gmail.com",
    municipio: "Viana",
    province: "Luanda",
    verificationLevel: "Pendente",
    confidenceScore: 78
  },
  {
    bi: "001122334LA055",
    nif: "5412889644",
    passport: "AO-P569724",
    fullName: "Carlos Manuel",
    birthDate: "02/02/1990",
    filiation: "João Manuel & Marta Manuel",
    maritalStatus: "Divorciado",
    phone: "+244 921 777 888",
    email: "carlos.manuel@outlook.com",
    municipio: "Maianga",
    province: "Luanda",
    verificationLevel: "Totalmente Verificado",
    confidenceScore: 96
  }
];

// ==========================================
// 5. WORKERS DOMAIN (Administrative Officers)
// ==========================================
export interface MockWorkerEntity {
  id: string;
  name: string;
  email: string;
  institutionId: string; // Relational link to institution
  role: string;
  avatarUrl: string;
  lastActive: string;
}

export const MOCK_WORKERS: MockWorkerEntity[] = [
  {
    id: "WRK-AGT-01",
    name: "Dr. Francisco Manuel",
    email: "francisco.manuel@agt.gov.ao",
    institutionId: "inst-agt",
    role: "Presidente do Conselho",
    avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150",
    lastActive: "Há 1 min"
  },
  {
    id: "WRK-SME-01",
    name: "Dr. António Fernando",
    email: "antonio.fernando@sme.gov.ao",
    institutionId: "inst-sme",
    role: "Director Geral",
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150",
    lastActive: "Há 4 mins"
  },
  {
    id: "WRK-ENDE-01",
    name: "Dr. Manuel Rebelo",
    email: "manuel.rebelo@ende.ao",
    institutionId: "inst-ende",
    role: "Adm. Executivo",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150",
    lastActive: "Há 18 mins"
  },
  {
    id: "WRK-EPAL-01",
    name: "Engª. Maria da Luz",
    email: "maria.luz@epal.gov.ao",
    institutionId: "inst-epal",
    role: "Directora de Operações",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150",
    lastActive: "Há 22 mins"
  }
];

// ==========================================
// 6. CORRESPONDENCES DOMAIN (Unified Emails/Mails)
// ==========================================
export const MOCK_CORRESPONDENCES: Message[] = [
  {
    id: 1,
    org: "AGT",
    preview: "Imposto pendente no valor de 18.500 Kz com prazo definido.",
    date: "09:10",
    unread: 1,
    status: "Urgente",
    details: {
      subject: "Pagamento Pendente IPU",
      body: "Foi identificado um imposto pendente no seu registro fiscal referente ao exercício anterior no valor de 18.500 Kz.\nEste valor inclui taxas de serviço governamentais e eventuais multas aplicadas pelo atraso na regularização voluntária.\nPedimos que efetue o pagamento o mais breve possível para evitar a aplicação de juros de mora adicionais sobre o montante.\nO pagamento pode ser realizado através de qualquer canal bancário utilizando a referência que será gerada no sistema.\nApós a liquidação, o seu certificado de conformidade fiscal será atualizado de forma automática no portal oficial.",
      deadline: "25 de Maio de 2026",
      state: "Pagamento pendente",
      actions: ["Ver detalhes", "Gerar referencia", "Efetuar pagamento"],
    },
    sensitivity: "Sensível",
    priorityScale: "Urgente",
    deadlineHoursRemaining: 48
  },
  {
    id: 2,
    org: "SME",
    preview: "Seu Bilhete de Identidade está pronto para levantamento presencial.",
    date: "Ontem",
    unread: 2,
    status: "Urgente",
    details: {
      subject: "Levantamento de BI",
      body: "O seu novo Bilhete de Identidade foi emitido com sucesso e já se encontra pronto para o levantamento presencial.\nO documento poderá ser recolhido no posto de atendimento onde efectuou o pedido original durante o horário de expediente.\nÉ obrigatório apresentar o talão de requerimento original e, se possível, o documento de identificação anterior para triagem.\nO nosso serviço de atendimento ao público funciona ininterruptamente das 08h00 às 15h00 nos dias úteis da semana.\nRecomendamos o agendamento prévio através deste portal para evitar tempos de espera prolongados nas filas de atendimento.",
      deadline: "30 de Maio de 2026",
      state: "Aguardando levantamento",
      actions: ["Ver local", "Agendar horario", "Baixar comprovativo"],
    },
    sensitivity: "Privado",
    priorityScale: "Urgente",
    deadlineHoursRemaining: 36
  },
  {
    id: 3,
    org: "ENDE",
    preview: "Nova factura de energia emitida com desconto por pagamento antecipado.",
    date: "Ontem",
    status: "Informativo",
    details: {
      subject: "Factura de Energia #ENDE-2026-9921",
      body: "A sua fatura de energia referente ao consumo do mês passado já foi emitida e está disponível para liquidação.\nO valor apurado de 11.200 Kz contempla o seu consumo real medido, acrescido das taxas de iluminação pública.\nInformamos que ao efetuar o pagamento até 5 dias antes do prazo, poderá beneficiar de um desconto de pontualidade.\nEvite cortes no fornecimento regularizando a sua situação financeira através dos canais de pagamento habilitados.\nPoderá também aderir ao débito direto para maior comodidade e garantia de que as suas faturas estarão sempre em dia.",
      deadline: "10 de Junho de 2026",
      state: "Em aberto",
      actions: ["Ver consumo", "Gerar referencia", "Pagar agora"],
    },
    sensitivity: "Público",
    priorityScale: "Normal"
  },
  {
    id: 4,
    org: "EPAL",
    preview: "Conta de água com ajuste de leitura automática confirmado.",
    date: "Seg",
    status: "Informativo",
    details: {
      subject: "Factura e Ajuste de Consumo",
      body: "Informamos que foi efectuado um ajuste na sua leitura de consumo de água após a verificação técnica do contador.\nO valor final da sua conta foi retificado para 6.430 Kz, corrigindo as estimativas baseadas em consumos anteriores.\nEste ajuste garante que pagará apenas pelo volume de água efetivamente utilizado na sua residência ou empresa.\nCaso note alguma discrepância persistente na sua faturação, poderá solicitar uma nova vistoria técnica ao domicílio.\nEstamos a modernizar os nossos sistemas de leitura para reduzir estas ocorrências e aumentar a precisão da cobrança.",
      deadline: "12 de Junho de 2026",
      state: "Pronto para pagamento",
      actions: ["Consultar historico", "Solicitar revisao", "Efetuar pagamento"],
    },
    sensitivity: "Público",
    priorityScale: "Normal"
  },
  {
    id: 5,
    org: "Tribunal",
    preview: "Notificação judicial digital para confirmação de comparecimento.",
    date: "Dom",
    status: "Urgente",
    details: {
      subject: "Notificação Judicial",
      body: "Fica V. Exa. notificado para comparecer na audiência de conciliação agendada para o Tribunal Provincial de Luanda.\nA sua presença é fundamental para o esclarecimento célere dos pontos em discórdia no processo em curso número 2026/A12.\nPoderá fazer-se acompan por um representative legal ou advogado devidamente credenciado junto da Ordem dos Advogados.\nO não comparecimento sem justificação plausível poderá resultar na aplicação de sanções previstas no código de processo civil.\nQualquer pedido de adiamento deverá ser submetido digitalmente através deste portal com 48 horas de antecedência.",
      deadline: "02 de Junho de 2026",
      state: "Resposta obrigatoria",
      actions: ["Ler notificacao", "Confirmar presenca", "Solicitar adiamento"],
    },
    sensitivity: "Restrito",
    priorityScale: "Crítico",
    deadlineHoursRemaining: 12
  },
  {
    id: 6,
    org: "Hospital",
    preview: "Resultado de exame pronto e disponível para consulta protegida.",
    date: "Sab",
    status: "Informativo",
    details: {
      subject: "Resultado Clínico",
      body: "O relatório detalhado dos seus exames laboratoriais realizados recentemente já foi processado pelo laboratório central.\nOs resultados estão agora disponíveis para consulta na sua área de paciente, protegida por criptografia de ponta a ponta.\nRelembramos que a interpretação destes dados deve ser feita obrigatoriamente por um profissional de saúde qualificado.\nAgende uma consulta de retorno para discutir estes resultados e definir os próximos passos do seu plano de saúde.\nO documento digital tem validade legal e pode ser partilhado diretamente com o seu médico assistente via e-mail.",
      deadline: "Sem prazo",
      state: "Disponivel para leitura",
      actions: ["Abrir resultado", "Partilhar com medico", "Marcar consulta"],
    },
    sensitivity: "Sensível",
    priorityScale: "Normal"
  },
  {
    id: 7,
    org: "AGT",
    preview: "Notificação de auditoria fiscal para o próximo trimestre.",
    date: "10:30",
    unread: 1,
    status: "Informativo",
    details: {
      subject: "Auditoria Fiscal Geral",
      body: "Informamos que foi programada uma auditoria fiscal de rotina às suas contas referente ao último ciclo trimestral.\nEste procedimento faz parte do plano anual de conformidade tributária para garantir a integridade dos dados declarados.\nSolicitamos que tenha disponível toda a documentação de suporte a receitas e despesas para consulta durante a inspeção.\nA nossa equipa técnica entrará em contacto via telefone para confirmar a modalidade da auditoria (presencial ou digital).\nCaso tenha alguma dúvida sobre os procedimentos, poderá consultar o manual de boas práticas fiscais disponível em anexo.",
      deadline: "15 de Agosto de 2026",
      state: "Agendado",
      actions: ["Ver documentos", "Falar com suporte", "Confirmar"],
    },
    sensitivity: "Sensível",
    priorityScale: "Importante"
  },
  {
    id: 11,
    org: "AGT",
    preview: "Notificação de liquidação do Imposto sobre Veículos Motorizados (IVM).",
    date: "Hoje",
    unread: 1,
    status: "Urgente",
    details: {
      subject: "Liquidação de IVM - Matrícula LD-23-45-AO",
      body: "Exmo. Senhor Edlasio Galhardo,\n\nServimo-nos da presente para notificar que a liquidação do Imposto sobre Veículos Motorizados (IVM) referente à sua viatura com matrícula LD-23-45-AO encontra-se pendente de pagamento.\n\nO prazo regulamentar para liquidação voluntária sem juros de mora termina no final do corrente mês. Poderá proceder ao pagamento em qualquer terminal automático (Multicaixa) ou através de homebanking utilizando as coordenadas de referência geradas no nosso portal.\n\nAgradecemos a sua cooperação para a regularização tempestiva do seu cadastro fiscal.\n\nAtentamente,\nRegisto de Contribuintes - AGT",
      state: "Envio Eletrônico",
      deadline: "30 de Junho de 2026",
      actions: ["Ver taxas", "Gerar DLI", "Pagar"]
    },
    sensitivity: "Sensível",
    priorityScale: "Urgente"
  },
  {
    id: 12,
    org: "SME",
    preview: "Solicitação de agendamento biométrico para renovação de Passaporte Ordinário.",
    date: "Hoje",
    unread: 1,
    status: "Não Lida",
    details: {
      subject: "Agendamento de Biometria - Passaporte Ordinário",
      body: "Caro Cidadão Edlasio Galhardo,\n\nInformamos que o seu pedido virtual de renovação de Passaporte Ordinário foi pré-processado pela nossa Direção de Atendimento Público.\n\nPara prosseguir com a recolha de impressões digitais, fotografia física e assinatura digitalizada, solicitamos que formalize o agendamento no Posto de Atendimento do SME mais próximo das suas conveniências.\n\nApresente este comprovativo oficial juntamente com o seu Bilhete de Identidade original válido no dia selecionado.\n\nMelhores cumprimentos,\nServiço de Migração e Estrangeiros",
      state: "Pendente Agendamento",
      deadline: "15 de Julho de 2026",
      actions: ["Reservar Data", "Localizar Posto", "Imprimir Guia"]
    },
    sensitivity: "Privado",
    priorityScale: "Normal"
  },
  {
    id: 13,
    org: "ENDE",
    preview: "Notificação técnica sobre manutenção programada de rede elétrica no seu bairro.",
    date: "Hoje",
    unread: 1,
    status: "Informativo",
    details: {
      subject: "Interrupção Temporária de Eletricidade - Maianga",
      body: "Exmo. Cliente Edlasio Galhardo,\n\nA Empresa Nacional de Distribuição de Electricidade (ENDE) comunica aos seus estimados utentes residentes na comuna da Maianga que, por motivos de intervenção técnica preventiva no posto de transformação local, haverá interrupção programada no fornecimento elétrico.\n\nData da intervenção: Próximo sábado, no intervalo das 08h00 às 13h00.\n\nAgradecemos desde já a sua melhor compreensão pelos eventuais transtornos decorrentes deste trabalho indispensável para a melhoria e estabilidade da rede de distribuição.\n\nCom os melhores cumprimentos,\nServiço Técnico ENDE",
      state: "Divulgação Ativa",
      deadline: "Sem prazo",
      actions: ["Ver Mapa de Cortes", "Falar com Apoio"]
    },
    sensitivity: "Público",
    priorityScale: "Normal"
  },
  {
    id: 14,
    org: "EPAL",
    preview: "Confirmação de vistoria periódica homologada do contador de água residencial.",
    date: "Hoje",
    unread: 1,
    status: "Informativo",
    details: {
      subject: "Vistoria Técnica de Medidor Realizada",
      body: "Estimado Utente Edlasio Galhardo,\n\nServimo-nos do presente para informar que a nossa equipa de técnicos especializados realizou com sucesso a vistoria periódica ao medidor de águas instalado no seu domicílio.\n\nO aparelho foi inspecionado, higienizado e recalibrado para certificar a perfeita exatidão nas próximas leituras de facturação. Não foram registadas fugas físicas no circuito de entrada oficial.\n\nA transparência e o controlo do seu consumo doméstico representam prioridades fundamentais nos nossos serviços.\n\nAtentamente,\nDireção de Inspeção EPAL",
      state: "Inspecionado",
      deadline: "Sem prazo",
      actions: ["Visualizar Relatório", "Contactar Inspetor"]
    },
    sensitivity: "Público",
    priorityScale: "Normal"
  },
  {
    id: 15,
    org: "MINJUS",
    preview: "Notificação oficial sobre registo de marca corporativa validado sob processo #9011.",
    date: "Hoje",
    unread: 1,
    status: "Urgente",
    details: {
      subject: "Registo de Propriedade Intelectual Homologado",
      body: "Exmo. Requerente Edlasio Galhardo,\n\nA Direção Nacional da Propriedade Intelectual do Ministério da Justiça e dos Direitos Humanos tem a honra de comunicar que foi deferido o seu pedido de registo de marca corporativa.\n\nCom a conclusão da fase de publicação em Diário da República sem oposições legais de terceiros, o seu título definitivo de propriedade e exploração exclusiva encontra-se devidamente registado e protegido ao abrigo de leis vigentes.\n\nO certificado oficial já se encontra disponível para descarga em formato PDF assinado digitalmente com chaves de segurança do Estado.\n\nAtentamente,\nDirecção Nacional de Propriedade Intelectual",
      state: "Concluído",
      deadline: "20 de Julho de 2026",
      actions: ["Descarregar Certificado", "Ver Publicação"]
    },
    sensitivity: "Restrito",
    priorityScale: "Importante"
  },
  {
    id: 16,
    org: "MINSA",
    preview: "Notificação do Programa Nacional de Vacinação e reforço vacinal.",
    date: "Hoje",
    unread: 1,
    status: "Não Lida",
    details: {
      subject: "Reforço Vacinal Disponível - Campanha Nacional",
      body: "Caro Cidadão Edlasio Galhardo,\n\nO Ministério da Saúde (MINSA) informa que o seu histórico clínico digital sinaliza a elegibilidade para receber a dose anual de reforço vacinal correspondente ao plano de prevenção nacional.\n\nCampanha em curso de segunda a sexta-feira em qualquer centro médico ou posto de vacinação comunitário habilitado no país.\n\nProteja-se e contribua para a imunidade coletiva nacional. O atendimento realiza-se com a apresentação simples do seu Bilhete de Identidade.\n\nAtenciosamente,\nDireção Geral de Saúde Pública",
      state: "Elegível",
      deadline: "Sem prazo",
      actions: ["Agendar Vacinação", "Ver Centros de Saúde"]
    },
    sensitivity: "Privado",
    priorityScale: "Normal"
  },
  {
    id: 17,
    org: "PNA",
    preview: "Notificação administrativa sobre registo de propriedade móvel e trânsito.",
    date: "Hoje",
    unread: 1,
    status: "Não Lida",
    details: {
      subject: "Atualização de Registo Automóvel no Sistema Integrado",
      body: "Prezado Proprietário Edlasio Galhardo,\n\nInformamos que a Direção de Trânsito e Segurança Rodoviária da Polícia Nacional de Angola registou uma alteração cadastral com sucesso na propriedade do seu veículo automóvel.\n\nOs registos de transferência de título foram unificados eletronicamente com as tabelas da AGT e da Direção Geral de Registos do MINJUS, assegurando conformidade às leis rodoviárias em vigor no território nacional.\n\nSugerimos o porte do seu título unificado na app móvel em qualquer fiscalização de trânsito rotineira.\n\nCom os melhores cumprimentos,\nGabinete de Comunicações PNA",
      state: "Registo Atualizado",
      deadline: "Sem prazo",
      actions: ["Verificar Automóveis", "Baixar Título"]
    },
    sensitivity: "Privado",
    priorityScale: "Normal"
  },
  {
    id: 18,
    org: "INSS",
    preview: "Extrato de contribuições de segurança social atualizado para o primeiro quadrimestre.",
    date: "Hoje",
    unread: 1,
    status: "Informativo",
    details: {
      subject: "Extrato Técnico de Segurança Social - Q1 2026",
      body: "Estimado Beneficiário Edlasio Galhardo,\n\nO Instituto Nacional de Segurança Social (INSS) torna público o extrato consolidado de contribuições previdenciárias vinculadas ao seu Número de Inscrição Social referente ao primeiro quadrimestre do ano corrente.\n\nAs deduções salariais regulamentares foram devidamente canalizadas e homologadas pelo seu empregador habitual dentro dos prazos de lei.\n\nA salvaguarda da sua carreira contributiva futura é gerida com o máximo rigor técnico nos nossos servidores.\n\nCom estima,\nGabinete Contributivo - INSS",
      state: "Dados Consolidados",
      deadline: "Sem prazo",
      actions: ["Consultar Extrato Completo", "Fazer Simulação"]
    },
    sensitivity: "Privado",
    priorityScale: "Normal"
  },
  {
    id: 19,
    org: "CNE",
    preview: "Notificação informativa sobre atualização do seu posto de registo eleitoral automático.",
    date: "Hoje",
    unread: 1,
    status: "Não Lida",
    details: {
      subject: "Confirmação de Posto de Voto Registado",
      body: "Exmo. Cidadão Edlasio Galhardo,\n\nA Comissão Nacional Eleitoral (CNE), no âmbito da organização dos cadernos de registo cívico e eleitoral, informa que o seu credenciamento e correspondente assembleia de voto padrão foram atualizados de forma automática com base no seu domicílio fiscal declarado.\n\nAssembleia associada: Escola Primária nº 1045 - Maianga Sede, Luanda.\n\nO exercício pleno do dever e direito cívico constitui a fundação da estabilidade das instituições nacionais.\n\nAtenciosamente,\nDireção de Organização Eleitoral",
      state: "Posto Atribuído",
      deadline: "Sem prazo",
      actions: ["Confirmar Domicílio", "Ver Regulamento"]
    },
    sensitivity: "Público",
    priorityScale: "Normal"
  },
  {
    id: 20,
    org: "Registo Civil",
    preview: "Informação técnica referente ao cancelamento de averbamento manual duplicado.",
    date: "Hoje",
    unread: 1,
    status: "Urgente",
    details: {
      subject: "Saneamento de Duplicidade de Assento de Nascimento",
      body: "Prezado Requerente Edlasio Galhardo,\n\nA Conservatória do Registo Civil informa que concluiu as dligências técnicas e de verificação no âmbito do programa nacional de higienização do arquivo civil unificado digital.\n\nFoi detetado e devidamente anulado um registo duplicado residual de assento de nascimento originado nos livros manuscritos antigos da província. O seu assento principal número 990184/2012 permanece intacto e plenamente válido para todo e qualquer efeito legal.\n\nEsta medida assegura a integridade cívica e evita fraudes de duplicidade de chaves identitárias.\n\nAtenciosamente,\nConservador-Chefe de Registo de Luanda",
      state: "Saneado",
      deadline: "Sem prazo",
      actions: ["Obter Assento Autêntico", "Relatar Inconsistência"]
    },
    sensitivity: "Sensível",
    priorityScale: "Urgente"
  }
];

export const MOCK_INSTITUTIONAL_INBOX: Message[] = [
  {
    id: 2001,
    org: "Cidadão: Edlasio Galhardo",
    institution: "AGT",
    preview: "Divergência na declaração anual de imposto sobre rendimento de trabalho.",
    date: "08:15",
    unread: 1,
    status: "Urgente",
    details: {
      subject: "Divergência Tributária - Declaração de IRT",
      body: "Exmos. Senhores da Administração Geral Tributária (AGT),\n\nSubmeti a minha declaração anual de imposto sobre o rendimento de trabalho (IRT) através do portal eletrónico e recebi uma notificação sobre uma suposta divergência de valores declarados pela minha entidade patronal.\n\nAnexei os meus recibos de vencimento homologados e o respetivo extrato bancário comprovando que os valores declarados coincidem exatamente com o auferido. Solicito a revisão urgente e a oportuna correção técnica das vossas bases tributárias para evitar multas processuais indevidas.\n\nAtentamente,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Analisar Declaração", "Agendar Audiência", "Arquivar"]
    },
    priorityScale: "Importante"
  },
  {
    id: 2002,
    org: "Cidadão: Edlasio Galhardo",
    institution: "AGT",
    preview: "Reclamação de dupla cobrança de Imposto Predial Urbano.",
    date: "08:30",
    unread: 0,
    status: "Lida",
    details: {
      subject: "Duplicidade de Cobrança IPU - Imóvel Maianga",
      body: "Exmos. Senhores,\n\nVenho por este meio manifestar a minha profunda preocupação face à cobrança duplicada que consta no sistema referente ao Imposto Predial Urbano (IPU) do meu imóvel localizado na Maianga.\n\nA fatura correspondente ao exercício fiscal de 2025 foi devidamente quitada via Multicaixa em 12 de Fevereiro de 2026, porém, o vosso sistema continua a assinalar o montante como pendente de liquidação e gerou uma nova cobrança de penalização.\n\nSolicito o cruzamento urgente do meu comprovativo de pagamento eletrónico para a regularização definitiva deste saldo devedor fantasma.\n\nCom elevados cumprimentos,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Conciliar Saldo", "Verificar Guias", "Responder"]
    },
    priorityScale: "Normal"
  },
  {
    id: 2003,
    org: "Cidadão: Edlasio Galhardo",
    institution: "SME",
    preview: "Atraso excedido no prazo regulamentar para entrega de visto de turismo de familiar.",
    date: "08:45",
    unread: 1,
    status: "Urgente",
    details: {
      subject: "Revisão de Visto Ordinário de Familiar Pendente",
      body: "Ilustres Senhores Diretores do Serviço de Migração e Estrangeiros (SME),\n\nSubmeti uma petição formal de concessão de Visto Ordinário para reagrupamento familiar em benefício de um parente direto de nacionalidade estrangeira há mais de 45 dias úteis.\n\nO prazo oficial para deferimento já expirou e até ao momento não obtivemos qualquer atualização sobre o estado real do processo eletrónico. Tratando-se de uma urgência de caráter de saúde familiar, imploro pelo vosso célere deferimento técnico ou esclarecimento de pendência imediata.\n\nCordialmente,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Verificar Visto", "Deferir Processo", "Chamar Cidadão"]
    },
    priorityScale: "Urgente"
  },
  {
    id: 2004,
    org: "Cidadão: Edlasio Galhardo",
    institution: "SME",
    preview: "Pedido de prorrogação extraordinária de permanência de passaporte estrangeiro.",
    date: "09:00",
    unread: 0,
    status: "Lida",
    details: {
      subject: "Prorrogação de Permanência Extraordinária",
      body: "Exmos. Senhores do SME,\n\nFormulo por este meio um pedido para prorrogação do período de permanência de passaporte ordinário de visitante oficial, ao abrigo do artigo 12.º do Regulamento Geral de Estrangeiros na República de Angola.\n\nO voo de regresso originalmente agendado para o estrangeiro sofreu um cancelamento técnico fortuito pela companhia aérea operadora, e a próxima data viável situa-se além do atual termo legal de permanência autorizado.\n\nSubmeto a documentação comprovativa da transportadora aérea para validação das chaves biométricas de entrada.\n\nAtentamente,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Aprovar Extensão", "Comprovar Bilhete", "Indefirir"]
    },
    priorityScale: "Normal"
  },
  {
    id: 2005,
    org: "Cidadão: Edlasio Galhardo",
    institution: "ENDE",
    preview: "Participação oficial de corte indevido de fornecimento por avaria técnica.",
    date: "09:15",
    unread: 1,
    status: "Urgente",
    details: {
      subject: "Corte Indevido e Reclamação de Quebra de Fase",
      body: "Exma. Gerência Técnica da ENDE,\n\nSubmeto esta reclamação urgente face à brusca interrupção do fornecimento elétrico regular na minha residência, ocorrida hoje às 07h15.\n\nO corte de energia ocorreu sem qualquer aviso prévio ou histórico de faturas em aberto no vosso sistema. Constatamos, no entanto, que o disjuntor geral da rua apresenta fumo e sobreaquecimento, sugerindo uma grave avaria de fase técnica na rede local.\n\nSolicito o envio urgente de uma equipa técnica de piquete de manutenção para prevenir eventuais incêndios ou danos adicionais na vizinhança.\n\nMelhores cumprimentos,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Acionar Piquete", "Verificar Consumo", "Enviar Alerta"]
    },
    priorityScale: "Crítico"
  },
  {
    id: 2006,
    org: "Cidadão: Edlasio Galhardo",
    institution: "ENDE",
    preview: "Solicitação de substituição definitiva de contador analógico por contador pré-pago.",
    date: "09:30",
    unread: 0,
    status: "Lida",
    details: {
      subject: "Migração Obrigatória para Sistema de Energia Pré-Pago",
      body: "Caros Senhores do Apoio Técnico ENDE,\n\nSolicito formalmente a substituição do medidor analógico convencional instalado no meu domicílio por um contador moderno do sistema pré-pago (Credelec).\n\nAs leituras estimadas que constam nas minhas faturas anteriores registam valores que excedem de sobremaneira o consumo real dos aparelhos domésticos activos. A migração técnica permitirá um melhor autocontrol e racionalização diária de energia.\n\nSubmeto a cópia do meu contrato assinado para formalidades contratuais.\n\nAtentamente,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Agendar Instalação", "Verificar Cadastro", "Arquivar"]
    },
    priorityScale: "Normal"
  },
  {
    id: 2007,
    org: "Cidadão: Edlasio Galhardo",
    institution: "EPAL",
    preview: "Denúncia de rotura na tubagem principal da via pública na comuna de Belas.",
    date: "09:45",
    unread: 1,
    status: "Urgente",
    details: {
      subject: "Inundação Técnica - Rotura na Distribuição Pública",
      body: "Exmos. Senhores da Empresa Pública de Águas de Luanda (EPAL),\n\nParticipo a ocorrência de uma severa rutura técnica na conduta principal de abastecimento localizada na passadeira de peões da entrada principal de Belas.\n\nA vazão contínua de água potável inundou integralmente o asfalto, constrangendo severamente a circulação de peões e de trânsito rodoviário. Centenas de milhares de litros estão a ser desperdiçados no local.\n\nPede-se o envio urgente de engenharia hidráulica de emergência para bloquear a conduta e reparar o rompimento estrutural.\n\nMelhores cumprimentos,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Enviar Brigada", "Cortar Válvula", "Notificar Autoridades"]
    },
    priorityScale: "Crítico"
  },
  {
    id: 2008,
    org: "Cidadão: Edlasio Galhardo",
    institution: "EPAL",
    preview: "Reclamação sobre baixa pressão persistente na rede doméstica de águas.",
    date: "10:05",
    unread: 0,
    status: "Lida",
    details: {
      subject: "Reclamação de Débito de Pressão Insuficiente",
      body: "Estimada Direção de Abastecimento da EPAL,\n\nVenho manifestar a minha desilusão face à severa e contínua insuficiência na pressão da rede de abastecimento que abastece as nossas moradias há mais de uma semana.\n\nA fraca pressão inviabiliza que o fluxo hídrico chegue aos reservatórios elevados dos andares residenciais superiores, forçando o transporte manual penoso. Solicitamos uma auditoria técnica às vossas bombas de propulsão zonais.\n\nAtentamente,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Monitorar Pressão", "Enviar Técnico", "Indefirir"]
    },
    priorityScale: "Normal"
  },
  {
    id: 2009,
    org: "Cidadão: Edlasio Galhardo",
    institution: "MINJUS",
    preview: "Pedido de emissão eletrónica de certidão de registo comercial de sociedade.",
    date: "10:15",
    unread: 1,
    status: "Urgente",
    details: {
      subject: "Pedido Urgente de Certidão Comercial de Sociedade",
      body: "Excelentíssimo Senhor Conservador do Registo Comercial,\n\nEu, Edlasio Galhardo, na qualidade de sócio-gerente, solicito a emissão por via eletrónica da certidão de teor de registo comercial atualizado da sociedade comercial registada sob a firma 'Galhardo Digital Soluções Limitada'.\n\nEste documento é peremptório para a nossa participação iminente num concurso público internacional de infraestruturas tecnológicas.\n\nEfectuei o pagamento correspondente de emolumentos por transferência imediata e solicito o envio digital na minha Pasta Digital de Angola.\n\nCom respeito,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Emitir Certidão", "Confirmar Pagamento", "Arquivar"]
    },
    priorityScale: "Importante"
  },
  {
    id: 2010,
    org: "Cidadão: Edlasio Galhardo",
    institution: "MINJUS",
    preview: "Reclamação referente a erro ortográfico no assento de registo civil digital.",
    date: "10:30",
    unread: 1,
    status: "Informativo",
    details: {
      subject: "Retificação Administrativa de Nome Civil",
      body: "Exmos. Senhores Conservadores de Registo Civil,\n\nDetetei um erro material de digitação no meu assento de nascimento eletrónico emitido na vossa plataforma.\n\nO nome do meu progenitor paternal foi incorretamente digitado como 'Antonio Galhardo' quando a ortografia correta é 'António Galhardo' com o respetivo acento gráfico que consta na certidão original e física de arquivo.\n\nSolicito o saneamento gratuito e imediato desta incoerência ortográfica digital para garantir a plena conformidade documental e evitar impedimentos futuros.\n\nAtentamente,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Retificar Nome", "Aceder ao Livro", "Notificar Mudança"]
    },
    priorityScale: "Normal"
  },
  {
    id: 2011,
    org: "Cidadão: Edlasio Galhardo",
    institution: "MINSA",
    preview: "Solicitação de alteração de posto médico de família atribuído no plano nacional.",
    date: "10:45",
    unread: 1,
    status: "Informativo",
    details: {
      subject: "Reatribuição de Centro de Saúde de Família",
      body: "Estimada Coordenação do Programa de Saúde Primária,\n\nEu, Edlasio Galhardo, venho solicitar a reatribuição do posto médico onde estou inscrito clinicamente no sistema de saúde nacional.\n\nDevido à recente alteração definitiva do meu domicílio residencial para a comuna de Cacuaco, o anterior hospital atribuído na Maianga tornou-se geograficamente inacessível para consultas regulares e assistência primária de urgência.\n\nAnexo o comprovativo do novo domicílio fiscal emitido pela AGT para efeitos de conformidade e atualização do meu registo clínico.\n\nAtentamente,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Alterar Posto", "Transferir Prontuário", "Arquivar"]
    },
    priorityScale: "Normal"
  },
  {
    id: 2012,
    org: "Cidadão: Edlasio Galhardo",
    institution: "PNA",
    preview: "Participação eletrónica de sinistro rodoviário menor para efeitos de seguradora.",
    date: "11:00",
    unread: 1,
    status: "Urgente",
    details: {
      subject: "Participação de Acidente de Trânsito com Danos Materiais",
      body: "Exmos. Senhores da Direção de Trânsito da Polícia Nacional,\n\nVenho submeter uma participação eletrónica de sinistro rodoviário sem vítimas pessoais, ocorrido em 20 de Junho de 2026 pelas 18h30 na Avenida Deolinda Rodrigues, Luanda.\n\nO veículo de outrem efetuou uma manobra inadequada colidindo contra a traseira do meu automóvel de matrícula LD-23-45-AO. Ambas as partes acordaram amigavelmente no ato, porém, necessito do vosso registo de ocorrência oficial visado para efeito de participação em seguradoras e requisição de reembolso de reparação.\n\nAtentamente,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Homologar Sinistro", "Agendar Peritagem", "Verificar Fotos"]
    },
    priorityScale: "Importante"
  },
  {
    id: 2013,
    org: "Cidadão: Edlasio Galhardo",
    institution: "INSS",
    preview: "Reclamação de períodos de contribuições em falta do ano de 2024 na folha patronal.",
    date: "11:15",
    unread: 1,
    status: "Urgente",
    details: {
      subject: "Períodos Contributivos em Falta - 2024",
      body: "Estimados Senhores Administradores do INSS,\n\nApós consultar detidamente o meu extrato contributivo através do Vosso novo portal online de segurança social, detetei com enorme indignação a absoluta ausência de registo de contribuições para os meses de Setembro e Outubro de 2024.\n\nSaliento que o meu vencimento sofreu os descontos obrigatórios na folha salarial pela minha entidade patronal à época. Solicito uma fiscalização extraordinária ao cadastro contributivo da referida empresa para reposição integral desses dois meses essenciais na minha contagem futura de aposentação.\n\nAtentamente,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Auditar Empresa", "Atualizar Contagem", "Responder"]
    },
    priorityScale: "Importante"
  },
  {
    id: 2014,
    org: "Cidadão: Edlasio Galhardo",
    institution: "CNE",
    preview: "Pedido de alteração extraordinária do domicílio de assembleia eleitoral.",
    date: "11:30",
    unread: 1,
    status: "Informativo",
    details: {
      subject: "Alteração Excecional de Assembleia de Voto",
      body: "Exmos. Senhores da Comissão Nacional Eleitoral (CNE),\n\nEu, Edlasio Galhardo, inscrito na base de eleitores, solicito uma alteração excecional da assembleia de voto que me foi atribuída por defeito no sistema.\n\nPor força de compromissos profissionais inadiáveis de relevante utilidade estatal na província de Benguela no dia regulamentar do escrutínio, estarei impedido de exercer o meu dever cívico na assembleia original em Luanda. Solicito que o meu registo eleitoral provisório seja ativado no posto de voto mais adequado de Benguela Centro.\n\nCom elevados cumprimentos,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Transferir Eleitor", "Emitir Credencial", "Arquivar"]
    },
    priorityScale: "Normal"
  },
  {
    id: 2015,
    org: "Cidadão: Edlasio Galhardo",
    institution: "Registo Civil",
    preview: "Solicitação eletrónica de reemissão de assento de registo matrimonial.",
    date: "11:45",
    unread: 1,
    status: "Informativo",
    details: {
      subject: "Pedido de Assento de Casamento Digitalizado",
      body: "Ilustre Conservador de Registo Civil,\n\nSolicito por este meio a reemissão e autenticação digital em formato eletrónico CDA da cópia integral de assento de casamento civil consensual, lavrado sob o Livro de Matrimónios do ano de 2022 desta Conservatória de Registo Civil de Belas, sob titularidade de Edlasio Galhardo.\n\nA certidão destina-se a fins puramente administrativos internos e requerimento de crédito de habitação bonificada para jovem casal.\n\nEfectuei o pagamento legal emolumentar e remeti comprovativos bancários em anexo.\n\nSubmeto com devoção,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Reemitir Assento", "Validar Assinatura", "Responder"]
    },
    priorityScale: "Normal"
  },
  {
    id: 2016,
    org: "Cidadão: Edlasio Galhardo",
    institution: "Notariado",
    preview: "Pedido de reconhecimento presencial com depósito de assinatura digitalizada.",
    date: "12:00",
    unread: 1,
    status: "Urgente",
    details: {
      subject: "Agendamento de Depósito de Assinatura Presencial",
      body: "Excelentíssimo Senhor Tabelião,\n\nGostaria de solicitar o agendamento de uma sessão notarial formal para depósito legal e chancela pública da minha assinatura pessoal manuscrita, para conversão subsequente em assinatura eletrónica qualificada e fidedigna no barramento digital do Estado.\n\nEstes trâmites de autenticação fidedigna são cruciais para a validação das procurações que passarei a emitir virtualmente de forma desmaterializada a favor de advogados constituídos.\n\nCom respeito profissional,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Confirmar Sessão", "Validar Assinatura", "Recusar"]
    },
    priorityScale: "Importante"
  },
  {
    id: 2017,
    org: "Cidadão: Edlasio Galhardo",
    institution: "Tribunal de Comarca",
    preview: "Reclamação de sobreposição horária em audiências judiciais arbitrais concorrentes.",
    date: "12:15",
    unread: 1,
    status: "Urgente",
    details: {
      subject: "Reclamação de Sobreposição - Conflito de Agendas Judiciais",
      body: "Exmos. Senhores Oficiais de Justiça do Tribunal de Comarca,\n\nParticipo-vos a existência de uma sobreposição absoluta de horários nas audiências arbitrais judiciais eletrónicas unificadas que me foram notificadas no meu portal do CDA.\n\nTenho agendada uma sessão processual cível para o dia 30 de Junho às 10h00, e simultaneamente uma sessão fiscal no âmbito das reclamações da AGT às 10h15. Torna-se fisicamente impossível comparecer em ambas as chamadas virtuais concorrentes.\n\nSolicito o adiamento amigável e readequação de horários da audiência fiscal.\n\nAtentamente,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Remarcar Sessão", "Adiar Audiência", "Contactar Partes"]
    },
    priorityScale: "Importante"
  },
  {
    id: 2018,
    org: "Cidadão: Edlasio Galhardo",
    institution: "Universidade Pública",
    preview: "Pedido de emissão de diploma eletrónico assinado por reitoria da UAN.",
    date: "12:30",
    unread: 1,
    status: "Informativo",
    details: {
      subject: "Emissão de Diploma Eletrónico de Licenciatura - UAN",
      body: "Ilustre Gabinete Académico da Reitoria da Universidade Agostinho Neto,\n\nEu, Edlasio Galhardo, diplomado do curso de Licenciatura em Engenharia Informática e de Sistemas, formulo a petição para emissão eletrónica de cópia definitiva do meu diploma de licenciatura qualificado pela tecnologia CDA do Estado angolano.\n\nConcluí a minha formação e respetiva homologação do trabalho de fim de curso em Outubro de 2025. O documento assinado digitalmente com certificado da Reitoria facilitará a minha candidatura de inserção ao mercado de trabalho exterior.\n\nCumprimentos,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Chancelar Diploma", "Ver Histórico", "Responder"]
    },
    priorityScale: "Normal"
  },
  {
    id: 2019,
    org: "Cidadão: Edlasio Galhardo",
    institution: "AGT",
    preview: "Dúvida cadastral referente a isenção de imposto de selo em transação imobiliária.",
    date: "12:45",
    unread: 1,
    status: "Informativo",
    details: {
      subject: "Esclarecimento Cadastral - Imposto de Selo Jovem",
      body: "Exmos. Senhores Técnicos de Atendimento da AGT,\n\nNa qualidade de jovem agregador, pretendo solicitar um esclarecimento prático sobre a aplicação real da cláusula de isenção de imposto de selo em contratos de arrendamento habitacional celebrados com jovens ao abrigo das medidas municipais de habitação social.\n\nO simulador automático no Vosso balcão emitiu uma guia contendo a cobrança integral, desrespeitando o previsto no código de isenções vigentes. Solicito a clarificação ou a correção automática da minha simulação número #88219.\n\nCordialmente,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Rever Isenção", "Recalcular Guia", "Arquivar"]
    },
    priorityScale: "Normal"
  },
  {
    id: 2020,
    org: "Cidadão: Edlasio Galhardo",
    institution: "SME",
    preview: "Comunicação de extravio físico de passaporte ordinário requirindo anulação no sistema.",
    date: "13:00",
    unread: 1,
    status: "Urgente",
    details: {
      subject: "Cancelamento de Passaporte Ordinário Extraviado",
      body: "Exmos. Senhores do Serviço de Migração e Estrangeiros (SME),\n\nParticipo formalmente pelo presente canal eletrónico o furto e consequente extravio definitivo do meu passaporte ordinário de categoria nacional, ocorrido no passado fim-de-semana.\n\nAo abrigo das orientações de segurança cívica, requeiro o cancelamento imediato das respetivas chaves eletrónicas e impressões digitais holográficas associadas de forma preventiva, impossibilitando qualquer tentativa de usurpação de identidade no exterior. Anexo o auto de queixa da Polícia Nacional.\n\nAtentamente,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Anular Passaporte", "Registrar Sinistro", "Oficiar PNA"]
    },
    priorityScale: "Urgente"
  },
  {
    id: 1001,
    org: "Cidadão: Edlasio Galhardo",
    institution: "AGT",
    preview: "Pedido de esclarecimento sobre submissão de NIF.",
    date: "08:45",
    unread: 1,
    status: "Urgente",
    details: {
      subject: "Esclarecimento de Pendência NIF",
      body: "Exmos. Senhores da AGT,\n\nGostaria de solicitar um esclarecimento sobre o estado da minha submissão de NIF realizada há duas semanas. Ainda não recebi a confirmação oficial no meu portal.\n\nPoderiam verificar se existe alguma pendência nos meus dados?\n\nAtentamente,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Responder", "Ver Cadastro", "Encaminhar"],
    },
    priorityScale: "Importante"
  },
  {
    id: 1002,
    org: "Cidadão: Maria Antónia",
    preview: "Envio de comprovativo de pagamento de taxa industrial.",
    date: "09:30",
    unread: 1,
    status: "Informativo",
    details: {
      subject: "Taxa Industrial do 1º Trimestre",
      body: "Bom dia,\n\nAnexo envio o comprovativo de pagamento da taxa industrial do primeiro trimestre de 2026. Peço que procedam à baixa da nota de liquidação no sistema correspondente.\n\nMelhores cumprimentos,\nMaria Antónia\nBI: 008812342LA011",
      actions: ["Validar Recibo", "Arquivar", "Responder"],
    },
    priorityScale: "Normal"
  },
  {
    id: 1004,
    org: "Cidadão: José Kalunga",
    preview: "Dedução fiscal não aplicada em fatura de saúde.",
    date: "11:00",
    unread: 1,
    status: "Informativo",
    details: {
      subject: "Solicitação de Dedução Fiscal de Saúde",
      body: "Caros colegas,\n\nNotei que uma fatura de despesas médicas não foi considerada para dedução automática no meu IRT fiscal regular. Gostaria de saber como proceder para a devida correção manual no sistema.\n\nObrigado.\n\nAtentamente,\nJosé Kalunga",
      actions: ["Analisar Fatura", "Corrigir Saldo", "Responder"],
    },
    priorityScale: "Normal"
  },
  {
    id: 2021,
    org: "Cidadão: Edlasio Galhardo",
    institution: "AGT",
    preview: "Reclamação de erro na liquidação do Imposto de Selo referente ao ano transacto.",
    date: "12:15",
    unread: 1,
    status: "Normal",
    details: {
      subject: "Reclamação de Liquidação Tributária de IS do Ano de 2025",
      body: "Exmos. Senhores da Administração Geral Tributária (AGT),\n\nVenho por este meio requerer a vossa atenção para um erro grave na liquidação de Imposto de Selo (IS) efectuado sobre a minha conta bancária pessoal em Fevereiro de 2025.\n\nFui tributado erroneamente com uma taxa agravada de 10%, quando a legislação específica prevê uma isenção total para as contas de aforro e habitação jovem. Peço a reapreciação deste lançamento fiscal indevido.\n\nCom os melhores cumprimentos,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Analisar Reclamação", "Rever Liquidação", "Arquivar"]
    },
    priorityScale: "Normal"
  },
  {
    id: 2022,
    org: "Cidadão: Edlasio Galhardo",
    institution: "AGT",
    preview: "Apresentação de documentos de Prova de Vida para requerer isenção fiscal juvenil.",
    date: "12:30",
    unread: 1,
    status: "Informativo",
    details: {
      subject: "Submissão de Prova de Vida para Efeitos de Isenção Fiscal Jovem",
      body: "Estimados Senhores do Atendimento Electrónico,\n\nSubmeto por esta via o meu atestado de Prova de Vida, devidamente chancelado, para efeitos de renovação do benefício de Isenção Fiscal Jovem sobre o arrendamento urbano.\n\nSolicito que os vossos serviços procedam à actualização do meu perfil contributivo para que o benefício seja reflectido nas próximas guias de pagamento automatizado.\n\nAtentamente,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Processar Prova", "Validar Cadastro", "Arquivar"]
    },
    priorityScale: "Normal"
  },
  {
    id: 2023,
    org: "Cidadão: Edlasio Galhardo",
    institution: "AGT",
    preview: "Solicitação de clarificação técnica sobre o cálculo de deduções do IRT.",
    date: "12:45",
    unread: 1,
    status: "Informativo",
    details: {
      subject: "Pedido de Esclarecimento sobre Cálculo de Retenção na Fonte de IRT",
      body: "Exma. Repartição Fiscal Virtual,\n\nVerifico que, nas últimas três liquidações automatizadas de IRT, a taxa aplicada excedeu o indexante salarial estipulado para a minha faixa de rendimento declarada no sistema.\n\nPeço que me informem se houve alguma alteração regulamentar recente ou se se trata de uma incoerência na tabela de processamento digital do barramento da AGT.\n\nMelhores cumprimentos,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Auditar Alíquotas", "Ver Histórico", "Responder"]
    },
    priorityScale: "Normal"
  },
  {
    id: 2024,
    org: "Cidadão: Edlasio Galhardo",
    institution: "AGT",
    preview: "Reclamação referente a juros de mora acumulados indevidamente em guia de liquidação.",
    date: "13:00",
    unread: 1,
    status: "Urgente",
    details: {
      subject: "Reclamação de Cobrança Indevida de Juros de Mora em Guia Liquidada",
      body: "Exmos. Senhores do Apoio ao Contribuinte,\n\nSubmeto a presente reclamação motivada pela imposição de juros de mora na guia de liquidação n.º GD-88219. A referida guia foi devidamente liquidada no próprio dia de emissão oficial.\n\nApesar disso, o sistema continuou a assinalar a dívida como activa por mais 15 dias, gerando a mora indevida. Solicito o estorno imediato dos juros cobrados na minha conta virtual.\n\nAtentamente,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Verificar Comprovativo", "Anular Mora", "Responder"]
    },
    priorityScale: "Importante"
  },
  {
    id: 2025,
    org: "Cidadão: Edlasio Galhardo",
    institution: "AGT",
    preview: "Comunicação oficial de venda de morada tributária para actualização cadastral.",
    date: "13:15",
    unread: 1,
    status: "Informativo",
    details: {
      subject: "Notificação de Venda de Imóvel Maianga para Actualização de Cadastro",
      body: "Prezada Direcção de Cadastro Imobiliário,\n\nVenho comunicar oficialmente a alienação do imóvel sito na Maianga, registado sob o artigo matricial n.º 1293-A, efectuada a favor do novo proprietário.\n\nRemeto cópia da escritura pública lavrada para que procedam com urgência à desvinculação deste imóvel do meu cadastro e cessação das minhas obrigações perante o IPU correspondente.\n\nCumprimentos,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Actualizar Cadastro", "Baixar IPU", "Arquivar"]
    },
    priorityScale: "Normal"
  },
  {
    id: 2026,
    org: "Cidadão: Edlasio Galhardo",
    institution: "AGT",
    preview: "Submissão de impugnação de multa aduaneira imputada em mercadoria informática.",
    date: "13:30",
    unread: 1,
    status: "Urgente",
    details: {
      subject: "Impugnação de Auto de Infracção Aduaneira",
      body: "Exma. Alfândega de Luanda,\n\nImpugno o Auto de Infracção em relação ao desembaraço das minhas ferramentas de desenvolvimento de software portáteis. A mercadoria foi catalogada indevidamente como insumo comercial.\n\nTrata-se de ferramentas de uso exclusivamente profissional e pessoal de um cidadão, que gozam de isenção aduaneira directa segundo o Estatuto de Mobilidade Digital angolano.\n\nCom respeito,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Rever Pauta", "Chancelar Isenção", "Responder"]
    },
    priorityScale: "Urgente"
  },
  {
    id: 2027,
    org: "Cidadão: Edlasio Galhardo",
    institution: "AGT",
    preview: "Pedido urgente de emissão de Certidão de Não Devedor para candidatura pública.",
    date: "13:45",
    unread: 1,
    status: "Urgente",
    details: {
      subject: "Solicitação de Certidão Negativa de Dívida Tributária de Urgência",
      body: "Exmos. Senhores,\n\nSolicito a pronta emissão da minha Certidão de Não Devedor por via desmaterializada no portal do Cidadão.\n\nPreenchi todos os pré-requisitos cadastrais e não tenho quaisquer débitos activos registados perante o Estado Angolano. Este documento é o último que falta submeter para a nossa empresa poder concorrer ao contrato de fornecimento governamental.\n\nAtentamente,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Emitir Certidão", "Validar Débito", "Arquivar"]
    },
    priorityScale: "Crítico"
  },
  {
    id: 2028,
    org: "Cidadão: Edlasio Galhardo",
    institution: "AGT",
    preview: "Solicitação de compensação de saldos credores de IVA em cobranças tributárias futuras.",
    date: "14:00",
    unread: 1,
    status: "Normal",
    details: {
      subject: "Pedido de Compensação de Créditos de IVA em Conta Corrente Fiscal",
      body: "Estimada Direcção Geral da AGT,\n\nFormulo um pedido de compensação de créditos acumulados do imposto sobre o valor acrescentado (IVA), no valor global de 450.000 Kz, para amortização directa da minha próxima guia de IPU.\n\nOs comprovativos de facturação electrónica em modelo SAF-T foram submetidos e validados previamente na vossa plataforma. Peço a regularização respectiva na minha conta corrente fiscal.\n\nCom os melhores cumprimentos,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Liquidar Crédito", "Cruzamento Dados", "Responder"]
    },
    priorityScale: "Normal"
  },
  {
    id: 2029,
    org: "Cidadão: Edlasio Galhardo",
    institution: "AGT",
    preview: "Clarificação sobre declaração de mais-valias de criptomoedas em Angola.",
    date: "14:15",
    unread: 1,
    status: "Informativo",
    details: {
      subject: "Dúvida sobre Tratamento Tributário de Criptoactivos no Novo Código",
      body: "Caros Técnicos de Atendimento,\n\nGostaria de obter uma nota técnica explicativa sobre o tratamento de imposto incidente sobre mais-valias obtidas através de negociação em moedas digitais e criptoactivos no território nacional.\n\nO novo código geral prevê a tributação sobre investimentos imobiliários convencionais, mas permanece omisso quanto a activos digitais. Gostaria de declarar voluntariamente em conformidade.\n\nRespeitosamente,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Emitir Nota Técnica", "Agendar Esclarecimento", "Arquivar"]
    },
    priorityScale: "Normal"
  },
  {
    id: 2030,
    org: "Cidadão: Edlasio Galhardo",
    institution: "AGT",
    preview: "Aviso urgente sobre erro intermitente de segurança no barramento de validação de XML.",
    date: "14:30",
    unread: 1,
    status: "Normal",
    details: {
      subject: "Participação de Falha no Mecanismo do Portal de Factura Electrónica",
      body: "Exmos. Senhores Administradores Técnicos TI da AGT,\n\nIdentifiquei uma intermitência técnica recorrente no vosso módulo de recepção e processamento de ficheiros SAF-T de facturação electrónica, que gera um erro '502 Bad Gateway'.\n\nEssa falha impede a integridade da submissão em tempo útil das facturas de prestação de serviços dos contribuintes. Espero que esta informação sirva para acelerar a correcção por parte das vossas equipas de engenharia informática.\n\nAtentamente,\nEdlasio Galhardo\nBI: 009874562LA041",
      actions: ["Avisar Equipa Dev", "Ver Relatório", "Responder"]
    },
    priorityScale: "Normal"
  }
];

export const MOCK_SENT_MESSAGES: Message[] = [
  {
    id: 101,
    org: "SME",
    preview: "Resposta enviada: Solicito reagendamento para sexta-feira.",
    date: "Hoje",
    status: "Informativo",
    details: {
      subject: "Solicitação de Reagendamento de Atendimento",
      body: "Exmos. Senhores do Serviço de Migração e Estrangeiros,\n\nNa sequência do agendamento inicial que havia realizado para esta quarta-feira, venho por este meio solicitar respeitosamente o reagendamento para a próxima sexta-feira no período da manhã.\n\nInformo que o motivo desta alteração prende-se com um compromisso profissional inadiável que surgiu de forma imprevista e que me impossibilita de comparecer no horário inicialmente acordado.\n\nComprometo-me a apresentar-me no posto de atendimento na nova data às 09h00 munido de toda a documentação necessária para o efeito.\n\nAgradeço a compreensão e aguardo confirmação do novo horário.\n\nCom os melhores cumprimentos,\nEdlasio Galhardo\nBI: 009874562LA041\nTelefone: +244 923 000 111",
      deadline: "Sem prazo",
      state: "Enviada & Registada",
      actions: ["Ver mensagem", "Cancelar envio"]
    },
    sensitivity: "Público",
    priorityScale: "Normal"
  },
  {
    id: 102,
    org: "AGT",
    preview: "Comprovativo fiscal enviado em anexo para validação.",
    date: "Ontem",
    status: "Informativo",
    details: {
      subject: "Envio de Comprovativo Fiscal para Validação",
      body: "Exmos. Senhores da Administração Geral Tributária,\n\nVenho por este meio submeter o comprovativo de pagamento referente à minha obrigação fiscal do último período declaratório.\n\nO documento em anexo comprova a liquidação integral do valor de 18.500 Kz relativo ao Imposto Único Predial (IPU) do exercício em curso. O pagamento foi efetuado através de referência bancária gerada no sistema da AGT.\n\nSolicito a gentileza de proceder à validação e baixa do respetivo recibo no sistema de conformidade fiscal, de modo a que o meu certificado de situação perante o fisco seja atualizado.\n\nFico ao dispor para qualquer esclarecimento adicional que se faça necessário.\n\nAtenciosamente,\nEdlasio Galhardo\nNIF: 5401329188\nBI: 009874562LA041\n\n[ANEXO] Comprovativo_AGT_IPU_2026.pdf",
      deadline: "Sem prazo",
      state: "Enviada & Pendente Validação",
      actions: ["Ver mensagem", "Baixar anexo", "Confirmar envio"]
    },
    sensitivity: "Sensível",
    priorityScale: "Normal"
  },
  {
    id: 103,
    org: "Hospital",
    preview: "Pedido de segunda via de relatório clínico submetido.",
    date: "Seg",
    status: "Informativo",
    details: {
      subject: "Solicitação de Segunda Via de Relatório Clínico",
      body: "Exmos. Senhores do Serviço Clínico,\n\nVenho por este meio solicitar a emissão de uma segunda via do relatório clínico correspondente ao meu último ato médico realizado nessa instituição de saúde.\n\nO relatório original foi emitido no passado mês de Abril e é necessário para fins de seguro de saúde e reembolso de despesas médicas junto da minha seguradora.\n\nSolicito que o documento seja emitido com todas as informações clínicas constantes no relatório original, incluindo diagnóstico, medicação prescrita e orientações médicas subsequentes.\n\nCaso necessitem de algum dado adicional para processar este pedido, por favor entrem em contacto através do meu número de telefone registado no sistema.\n\nAgradeço a atenção e aguardo o processamento do pedido.\n\nCom respeito,\nEdlasio Galhardo\nBI: 009874562LA041\nTelefone: +244 923 000 111",
      deadline: "15 de Junho de 2026",
      state: "Em Processamento",
      actions: ["Ver mensagem", "Submeter documento", "Contactar clínica"]
    },
    sensitivity: "Sensível",
    priorityScale: "Normal"
  },
  {
    id: 104,
    org: "ENDE",
    preview: "Reclamação de cobrança indevida registada sob protocolo #9901.",
    date: "Ter",
    status: "Informativo",
    details: {
      subject: "Reclamação de Cobrança Indevida de Energia Elétrica",
      body: "Exmos. Senhores da Empresa Nacional de Distribuição de Electricidade (ENDE),\n\nVenho por este meio apresentar uma reclamação formal relativa a uma cobrança indevida na minha fatura de energia elétrica do corrente mês.\n\nNo resumo da minha conta foi включена uma taxa adicional de 3.500 Kz referente a um \"acerto de consumo\" que não corresponde a qualquer consumo efetuado no meu endereço. O consumo normal da minha residência varia entre 8.000 e 12.000 Kz mensais, e a fatura atual apresenta um valor total desproporcional ao histórico de consumo.\n\nReclamo que esta cobrança seja investigada e que me seja fornecido um relatório detalhado do consumo faturado, incluindo as leituras do contador correspondentes ao período em causa.\n\nSolicito igualmente a retificação imediata da fatura e o cancelamento da cobrança indevida enquanto a questão não for clarificada.\n\nEste pedido está registado sob o protocolo oficial #9901 do Correio Digital de Angola e aguardo um pronunciamento no prazo legal de 30 dias.\n\nCom os melhores cumprimentos,\nEdlasio Galhardo\nBI: 009874562LA041\nContrato: 9910245021\nTelefone: +244 923 000 111",
      deadline: "30 de Junho de 2026",
      state: "Em Análise",
      actions: ["Ver mensagem", "Anexar prova", "Acompanhar estado"]
    },
    sensitivity: "Público",
    priorityScale: "Importante"
  }
];

export const MOCK_GOV_CORRESPONDENCES: Correspondence[] = [
  {
    id: "CDA-90118",
    sender: "Ministério das Finanças (MINFIN)",
    recipient: "Manuel de Vasconcelos",
    subject: "Notificação Geral de Isenção Fiscal Sócio-Profissional",
    originProvince: "Luanda",
    destinationProvince: "Benguela",
    institution: "AGT",
    status: "Não Lida",
    date: "02/06/2026",
    body: "Prezado Cidadão, sob a égide da resolução fiscal n. 450 do Ministério das Finanças, confirmamos que a isenção tributária temporária sobre os rendimentos laborais está validada eletronicamente no sistema integrado."
  },
  {
    id: "CDA-88123",
    sender: "SME - Posto Aduaneiro",
    recipient: "Edlasio Galhardo",
    subject: "Homologação de Emissão de Passaporte de Serviço",
    originProvince: "Cabinda",
    destinationProvince: "Luanda",
    institution: "SME",
    status: "Lida",
    date: "01/06/2026",
    body: "Exmo Senhor, informamos que o pedido de emissão de passaporte de categoria de serviço foi deferido pela Direção Geral do Serviço de Migração e Estrangeiros."
  },
  {
    id: "CDA-77123",
    sender: "Tribunal de Comarca de Viana",
    recipient: "Ana Maria dos Santos",
    subject: "Intimação Administrativa Eletrónica Unificada",
    originProvince: "Luanda",
    destinationProvince: "Luanda",
    institution: "Tribunal Supremo",
    status: "Enviada",
    date: "28/05/2026",
    body: "Notificamos o destinatário sobre o parecer homologado de audiência arbitral no âmbito dos registros prediais integrados de Viana."
  }
];

// ==========================================
// 7. DOCUMENTS DOMAIN (Digital Wallet/Folder)
// ==========================================
export const MOCK_DOCUMENTS: Document[] = [
  {
    name: "BI Digital",
    validity: "Válido até 2032",
    code: "AO-BI-9281",
    holder: "Edlasio Galhardo",
    number: "009874562LA041", // Matches CANONICAL_USER
    issuer: "SME",
    issuedAt: "10 de Abril de 2022",
  },
  {
    name: "Passaporte",
    validity: "Válido até 2030",
    code: "AO-PP-7712",
    holder: "Edlasio Galhardo",
    number: "AO-P129384", // Matches CANONICAL_USER
    issuer: "SME",
    issuedAt: "18 de Junho de 2020",
  },
  {
    name: "Carta de condução",
    validity: "Renovação em 2028",
    code: "AO-CD-5534",
    holder: "Edlasio Galhardo",
    number: "CD-244-99310",
    issuer: "Ministério dos Transportes",
    issuedAt: "03 de Novembro de 2023",
  },
  {
    name: "NIF (Número de Identificação Fiscal)",
    validity: "Vitalício",
    code: "AO-NIF-4412",
    holder: "Edlasio Galhardo",
    number: "5401329188", // Matches CANONICAL_USER
    issuer: "AGT",
    issuedAt: "15 de Maio de 2018",
  },
  {
    name: "Certificado de residência",
    validity: "Atualizado",
    code: "AO-CR-9022",
    holder: "Edlasio Galhardo",
    number: "RES-2026-1102",
    issuer: "Administracao Municipal",
    issuedAt: "22 de Janeiro de 2026",
  },
  {
    name: "Certidão de Conformidade Fiscal",
    validity: "Válido por 90 dias",
    code: "AO-CCF-8812",
    holder: "Edlasio Galhardo",
    number: "AGT-2026-CCF-001",
    issuer: "AGT",
    issuedAt: "02 de Maio de 2026",
  }
];

// ==========================================
// 8. PROCESSES DOMAIN (User Requests/Doc Requests)
// ==========================================
export const MOCK_USER_REQUESTS: UserRequest[] = [
  { id: 1, user: 'Edlasio Galhardo', type: 'IPU', priority: 'Média', time: '12m atrás', status: 'pendente', bi: '009874562LA041' },
  { id: 2, user: 'Maria Antónia', type: 'NIF', priority: 'Alta', time: '5m atrás', status: 'urgente', bi: '008812342LA011' },
  { id: 3, user: 'José Kalunga', type: 'Certidão', priority: 'Baixa', time: '1h atrás', status: 'processando', bi: '007712342LA021' }
];

export const MOCK_DOC_REQUESTS: DocRequest[] = [
  { id: 1, userName: 'Edlasio Galhardo', userBi: '009874562LA041', docType: 'BI Digital', institution: 'SME', date: '20/05/2026', status: 'Pendente', aiStatus: 'pre-approved' },
  { id: 2, userName: 'Maria Antónia', userBi: '008812342LA011', docType: 'Certidão de Nascimento', institution: 'Registo Civil', date: '19/05/2026', status: 'Aprovado' },
  { id: 3, userName: 'José Kalunga', userBi: '007712342LA021', docType: 'NIF Progressivo', institution: 'AGT', date: '18/05/2026', status: 'Pendente', aiStatus: 'manual-review' },
  { id: 4, userName: 'Ana Baptista', userBi: '009991332LA018', docType: 'Certificado de Residência', institution: 'MINJUS', date: '17/05/2026', status: 'Pendente', aiStatus: 'pre-approved' }
];

// ==========================================
// 9. NOTIFICATIONS DOMAIN (System Alerts)
// ==========================================
export const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: 1, title: 'BI Renovado', message: 'O seu Bilhete de Identidade foi renovado com sucesso.', time: '2h atrás', type: 'success', targetTab: 'correspondencias' },
  { id: 2, title: 'Alerta de Segurança', message: 'Novo acesso detectado a partir de um dispositivo Chrome em Luanda.', time: '5h atrás', type: 'warning', targetTab: 'perfil' },
  { id: 3, title: 'Documento Recebido', message: 'O SME enviou um novo documento para a sua correspondência eletrónica.', time: 'Ontem', type: 'info', targetTab: 'correspondencias' }
];

// ==========================================
// 10. CONTACTS DOMAIN (Emergency circle)
// ==========================================
export const MOCK_CONTACTS: Contact[] = [
  { id: 1, name: "Maria Domingos", bi: "008744221LA011", relation: "Mãe", status: "Confirmado", type: "Emergência", phone: "+244 923 888 111" },
  { id: 2, name: "João Manuel", bi: "007112009LA031", relation: "Irmão", status: "Confirmado", type: "Emergência", phone: "+244 923 888 222" },
  { id: 3, name: "Ana Baptista", bi: "009991332LA018", relation: "Vizinha", status: "Pendente", type: "Normal", phone: "+244 933 555 666" }
];

// ==========================================
// 11. INVOICES DOMAIN (Utility service bills)
// ==========================================
export interface MockInvoice {
  id: string;
  institution: string;
  contractNumber: string;
  reference: string;
  amount: string;
  amountKz: number;
  period: string;
  dueDate: string;
  status: 'Pendente' | 'Pago' | 'Atrasado';
}

export const MOCK_INVOICES: MockInvoice[] = [
  {
    id: "FAT-ENDE-2026-991",
    institution: "ENDE",
    contractNumber: "9910245021",
    reference: "110 245 021",
    amount: "11.200 Kz",
    amountKz: 11200,
    period: "Maio/2026",
    dueDate: "10 de Junho de 2026",
    status: "Pendente"
  },
  {
    id: "FAT-EPAL-2026-382",
    institution: "EPAL",
    contractNumber: "0018442001",
    reference: "001 844 200",
    amount: "6.430 Kz",
    amountKz: 6430,
    period: "Abril/2026",
    dueDate: "12 de Junho de 2026",
    status: "Pendente"
  },
  {
    id: "FAT-AGT-IPU-2026",
    institution: "AGT",
    contractNumber: "NIF-5401329188",
    reference: "889 012 344",
    amount: "18.500 Kz",
    amountKz: 18500,
    period: "Ano Fiscal 2025",
    dueDate: "25 de Maio de 2026",
    status: "Pendente"
  }
];

// ==========================================
// 12. PAYMENTS DOMAIN (Historical Receipts)
// ==========================================
export interface MockPaymentRecord {
  id: string;
  reference: string;
  amount: string;
  institutionName: string;
  paymentMethod: string;
  dateTime: string;
  receiptNumber: string;
  status: string;
}

export const MOCK_PAYMENTS: MockPaymentRecord[] = [
  {
    id: "PAY-00129",
    reference: "878 901 230",
    amount: "45.000 Kz",
    institutionName: "AGT - Imposto Predial",
    paymentMethod: "Multicaixa Express",
    dateTime: "10 de Abril de 2026 14:15",
    receiptNumber: "REC-IPU-9921",
    status: "Liquidado"
  },
  {
    id: "PAY-00124",
    reference: "110 244 955",
    amount: "10.500 Kz",
    institutionName: "SME - Emissão de Passaporte",
    paymentMethod: "Atm / Referência",
    dateTime: "18 de Junho de 2025 09:30",
    receiptNumber: "REC-SME-0021-PP",
    status: "Liquidado"
  }
];

// ==========================================
// 13. CERTIFICATES DOMAIN (Crypto identities)
// ==========================================
export interface MockCertificateEntity {
  id: string;
  holder: string;
  institution: string;
  serialNumber: string;
  notBefore: string;
  notAfter: string;
  sha256Fingerprint: string;
  isActive: boolean;
  sealType: string;
}

export const MOCK_CERTIFICATES: MockCertificateEntity[] = [
  {
    id: "CERT-AGT-01",
    holder: "AGT Administrador",
    institution: "Administração Geral Tributária",
    serialNumber: "SN-99881122AA-AGT",
    notBefore: "01/01/2025",
    notAfter: "01/01/2028",
    sha256Fingerprint: "A9:D2:C3:FF:88:B4:77:E5:66:D1:44:00:22:11:AA:BB:CC:DD:EE:00:23:45:67:89:AB:CD:EF:01:23:45:67",
    isActive: true,
    sealType: "Selo Eletrónico Avançado do Estado"
  },
  {
    id: "CERT-EDL-01",
    holder: "Edlasio Galhardo",
    institution: "CDA - Assinatura Qualificada",
    serialNumber: "SN-009874562-EDL-MINT",
    notBefore: "10/04/2025",
    notAfter: "10/04/2030",
    sha256Fingerprint: "B3:E1:C4:EE:77:A3:66:D4:55:C0:33:11:BB:AA:99:FF:CC:DD:AA:11:22:33:44:55:66:77:88:99:AA:00:11",
    isActive: true,
    sealType: "Assinatura Digital Qualificada de Cidadão"
  }
];

// ==========================================
// 14. AI ASSISTANTS DOMAIN (Chat/Voice Settings)
// ==========================================
export interface MockAIAssistantConfig {
  id: string;
  name: string;
  avatarUrl: string;
  promptTheme: string;
  greetingMessage: string;
  voicePitch: number;
  voiceSpeed: number;
}

export const MOCK_AI_ASSISTANTS: MockAIAssistantConfig[] = [
  {
    id: "ai-gove-voice",
    name: "Guia de Voz Angola Digital",
    avatarUrl: "https://i.postimg.cc/J73QvnGv/Foto-Edlasio.png",
    promptTheme: "Guia falado inclusivo e acessível",
    greetingMessage: "Olá Edlasio! Sou o seu Guia de Voz Oficial do Correio Digital de Angola. Em que posso auxiliá-lo hoje?",
    voicePitch: 1.0,
    voiceSpeed: 0.95
  },
  {
    id: "ai-agt-chat",
    name: "Assistente Fiscal Integrado AGT",
    avatarUrl: "https://i.postimg.cc/J73QvnGv/Foto-Edlasio.png",
    promptTheme: "Consultor Técnico de Impostos do Estado",
    greetingMessage: "Olá! Sou o Assistente Integrado de Inteligência Tributária da AGT. Posso ajudar com levantamento de NIF, cálculo de IPU ou regularização fiscal voluntária.",
    voicePitch: 1.05,
    voiceSpeed: 1.0
  }
];

// ==========================================
// 15. AUDIT LOGS DOMAIN (Activity logging Trail)
// ==========================================
export interface MockAuditLogEntity {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'danger' | string;
}

export const MOCK_AUDIT_LOGS: MockAuditLogEntity[] = [
  { id: '1', action: 'Sistema de Correio Digital Inicializado', user: 'SYSTEM', timestamp: '14/06/2026 08:00', type: 'info' },
  { id: '2', action: 'Login do Administrador SME Autorizado', user: 'Admin SME', timestamp: '14/06/2026 08:30', type: 'success' },
  { id: '3', action: 'Auditoria de Assinaturas Digitais do Cidadão Completa', user: 'Edlasio Galhardo', timestamp: '14/06/2026 09:15', type: 'info' },
  { id: '4', action: 'Selo Eletrónico da AGT Validado para Notificação', user: 'AGT-SOC', timestamp: '14/06/2026 10:10', type: 'success' }
];

// Helper to secure protocol seals on demand (representing official Angolan Gov stamps)
export function generateMockProtocol(id: string | number, type: string, inst: string): DigitalProtocol {
  return {
    internalId: `CDA-PRT-${id}`,
    protocolNumber: `CDA-2026-PT-${Math.floor(100000 + Math.random() * 900000)}`,
    issuerInstitution: inst,
    officialIssueDate: "14/06/2026",
    officialTime: "08:30:15",
    issuerResponsible: inst === 'AGT' ? 'Dr. Francisco Manuel' : 'Dr. António Fernando',
    category: "Notificação Geral e Expediente",
    documentType: type,
    currentState: "Autenticado no Barramento do Estado",
    priority: "Alta",
    deadlineDate: "15 de Agosto de 2026",
    qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=CorreioDigitalAngola-ProtocoloAuth-14-06-2026",
    digitalSignature: "MIIEuwYJKoZIhvcNAQcCoIIErDCCBKgCAQExDzANBglghkgBZQMEAgEFADCBvAYJKoZIhvcNAQcBoIG8BIG5",
    digitalSeal: "HSM-SEAL-CDA-AO-2026",
    documentHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    institutionalCertificate: "SN-99881122AA-AGT",
    signatureDate: "14/06/2026 08:30:15",
    legalValidity: "Lei Geral das Tecnologias de Informação de Angola (Nº 2/14)"
  };
}
