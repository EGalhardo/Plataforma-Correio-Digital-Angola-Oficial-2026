/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Message, Document, Contact, Slide, AppNotification } from '../types';
import { 
  MOCK_CORRESPONDENCES, 
  MOCK_INSTITUTIONAL_INBOX, 
  MOCK_SENT_MESSAGES, 
  MOCK_DOCUMENTS, 
  MOCK_CONTACTS, 
  MOCK_NOTIFICATIONS,
  MOCK_SESSION_USER
} from './mocks';

// Re-export the consistent domains under standard names for backwards compatibility
export const INBOX: Message[] = MOCK_CORRESPONDENCES;
export const INSTITUTIONAL_INBOX: Message[] = MOCK_INSTITUTIONAL_INBOX;
export const SENT_MESSAGES: Message[] = MOCK_SENT_MESSAGES;
export const DOCUMENTS: Document[] = MOCK_DOCUMENTS;
export const INITIAL_CONTACTS: Contact[] = MOCK_CONTACTS;
export const NOTIFICATIONS: AppNotification[] = MOCK_NOTIFICATIONS;
export const USER_PROFILE_PHOTO = MOCK_SESSION_USER.avatarUrl;

// Verification slides used across the platform and parsed by the background preloader
export const HIGHLIGHT_SLIDES: Slide[] = [
  {
    id: 1,
    title: "Seu BI é o seu endereço digital",
    subtitle: "Aceda a correspondências e documentos oficiais de forma segura e centralizada em qualquer lugar.",
    image: "https://i.postimg.cc/s24k4tkd/1-Desktop.png",
    mobileImage: "https://i.postimg.cc/PxyLsDRC/1.png",
    btn: "Ver Correspondências",
    action: "correspondencias"
  },
  {
    id: 3,
    title: "Segurança de Nível Estatal",
    subtitle: "Dados protegidos por criptografia de ponta a ponta e biometria para garantir a total privacidade do cidadão.",
    image: "https://i.postimg.cc/DwVRkvFK/3-Desktop.png",
    mobileImage: "https://i.postimg.cc/8P0Zgf8G/3.png",
    btn: "Configurar Segurança",
    action: "perfil"
  },
  {
    id: 4,
    title: "Notificações em Tempo Real",
    subtitle: "Receba alertas instantâneos sobre multas, impostos e agendamentos governamentais.",
    image: "https://i.postimg.cc/k45pFDNC/4-Desktop.png",
    mobileImage: "https://i.postimg.cc/1XgNGtvV/4.png",
    btn: "Ver Alertas",
    action: "correspondencias"
  },
  {
    id: 5,
    title: "Contactos de Emergência",
    subtitle: "Mantenha a sua rede de confiança atualizada para situações críticas.",
    image: "https://i.postimg.cc/br7VhT7R/5-Desktop.png",
    mobileImage: "https://i.postimg.cc/pTSmLvPd/5.png",
    btn: "Gerir Contactos",
    action: "contatos"
  },
  {
    id: 6,
    title: "Assistência por IA Oficial",
    subtitle: "Tire dúvidas sobre processos burocráticos e receba orientações personalizadas.",
    image: "https://i.postimg.cc/PqLKHcdm/6-Desktop.png",
    mobileImage: "https://i.postimg.cc/Bv6DSM2R/6.png",
    btn: "Abrir Conversa",
    action: "home"
  },
  {
    id: 7,
    title: "Angola Digital em Movimento",
    subtitle: "A modernização dos serviços públicos ao serviço de todos os angolanos.",
    image: "https://i.postimg.cc/NMjsL1zv/7.png",
    mobileImage: "https://i.postimg.cc/9MgLXD41/7.png",
    btn: "Saber Mais",
    action: "home"
  }
];

export const GOV_HIGHLIGHT_SLIDES: Slide[] = [
  {
    id: 1,
    title: "Portal do Agente AGT",
    subtitle: "Gestão centralizada de serviços tributários e comunicações oficiais.",
    image: "https://i.postimg.cc/ydQKDYCd/1-Desktop.png",
    mobileImage: "https://i.postimg.cc/QxWDM34x/1.png",
    btn: "Ver Mensagens",
    action: "gov-emissao"
  },
  {
    id: 3,
    title: "Instituições Conectadas",
    subtitle: "Gestão de agências e conectividade avançada entre instituições governamentais.",
    image: "https://i.postimg.cc/4ddkRkHY/2.png",
    btn: "Monitorar Rede",
    action: "gov-interoperabilidade"
  },
  {
    id: 4,
    title: "Segurança Cibernética SOC",
    subtitle: "Proteção de dados e integridade da identidade digital do cidadão angolano.",
    image: "https://i.postimg.cc/434Ny0h4/3.png",
    btn: "Configurar SOC",
    action: "gov-dashboard"
  },
  {
    id: 5,
    title: "Emissão de Documentos",
    subtitle: "Processamento célere e seguro de atos administrativos e certidões digitais.",
    image: "https://i.postimg.cc/63kXrbTK/4.png",
    btn: "Ver Emissões",
    action: "gov-docs"
  },
  {
    id: 6,
    title: "Eficiência Governamental",
    subtitle: "Angola Digital: Modernização dos serviços públicos para maior transparência.",
    image: "https://i.postimg.cc/4NzJ5GzM/5.png",
    btn: "Explorar Serviços",
    action: "gov-dashboard"
  }
];

export const INST_HIGHLIGHT_SLIDES: Slide[] = [
  {
    id: 1,
    title: "Interoperabilidade Ativa",
    subtitle: "Conectividade em tempo real entre todas as instituições do Estado para um serviço público ágil.",
    image: "https://i.postimg.cc/Z5WRTqbM/e1.png",
    btn: "Ver Redes",
    action: "home"
  },
  {
    id: 2,
    title: "Comunicação Consular e Diplomática",
    subtitle: "Expediente digital seguro para embaixadas, consulados e missões diplomáticas no exterior.",
    image: "https://i.postimg.cc/sfKD7Wvd/e2.png",
    btn: "Ver Mensagens",
    action: "home"
  },
  {
    id: 3,
    title: "Segurança de Dados Institucionais",
    subtitle: "Criptografia avançada e auditoria permanente em todos os fluxos de correspondência oficial.",
    image: "https://i.postimg.cc/dQWwLKxJ/e3.png",
    btn: "Auditoria",
    action: "home"
  },
  {
    id: 4,
    title: "Modernização Administrativa",
    subtitle: "Redução de burocracia e facilitação de processos de emissão de certidões e alvarás.",
    image: "https://i.postimg.cc/qMPf3Bc8/e4.png",
    btn: "Consultar",
    action: "home"
  },
  {
    id: 5,
    title: "Angola Digital 2026",
    subtitle: "Uma era de governação eletrónica mais eficiente, inclusiva e transparente.",
    image: "https://i.postimg.cc/rwXbpncJ/e5.png",
    btn: "Saber Mais",
    action: "home"
  },
  {
    id: 6,
    title: "Gestão Integrada de Redes",
    subtitle: "Monitorização em tempo real da conectividade e tráfego de dados intergovenamentais.",
    image: "https://i.postimg.cc/nVspjW8N/e6.png",
    btn: "Monitor de Tráfego",
    action: "home"
  }
];
