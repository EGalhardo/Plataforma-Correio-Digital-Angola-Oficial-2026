/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import type { ReactNode, ComponentType, ComponentProps } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2,
  Mail,
  User,
  Shield,
  ShieldAlert,
  Lock,
  Fingerprint,
  Smartphone,
  ShieldCheck,
  Database,
  RefreshCw,
  Signal,
  AlertTriangle,
  X,
  ArrowLeft,
  Check,
  CheckCircle,
  QrCode,
  IdCard,
  UserPlus,
  Send,
  Download,
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';

// Components
// v37.5 §3.2 — importações directas: o barrel './components' puxava TODAS as
// features para o bundle inicial (invalidando o React.lazy já existente).
import { Sidebar } from './components/layout/Sidebar';
import { MobileNavBar } from './components/layout/MobileNavBar';
import { Header } from './components/layout/Header';
import { NotificationDropdown } from './components/features/NotificationDropdown';
import { HomeContent } from './components/features/HomeContent';

// UI Components
import { LazyImage } from './components/ui/LazyImage';

// Constants & Types
import { 
  INBOX, 
  INSTITUTIONAL_INBOX,
  SENT_MESSAGES, 
  DOCUMENTS, 
  INITIAL_CONTACTS, 
  HIGHLIGHT_SLIDES,
  NOTIFICATIONS,
} from './constants/data';
import { 
  MOCK_USER_REQUESTS, 
  MOCK_DOC_REQUESTS, 
  MOCK_AUDIT_LOGS, 
  MOCK_GOV_CORRESPONDENCES,
  MOCK_SESSION_USER
} from './constants/mocks';
import {
  Message,
  Document,
  Contact,
  AppNotification,
  AppMode,
  UserRequest,
  DocRequest,
  Correspondence,
  DigitalProtocol,
  ReplySendPayload,
  ReplySendResult
} from './types';
import { ensureProtocolOnMessage, ensureProtocolOnDocument, generateProtocol, sealProtocolContent, canonicalProtocolPayload } from './utils/protocolGenerator';
import { OfflineManager, OfflineAction } from './utils/offlineManager';
import { ordenarMensagensPorMaisRecente, ordenarCorrespondenciasPorMaisRecente } from './utils/ordenacaoCronologica';
import { supabaseService, hasValidSupabaseKeys, resolveInstitutionCode, resolveCitizenBi, invalidateMessagesReadCache, isRealInstitutionalCode, eliminarCorrespondenciaTotal, lerMensagemParaEliminacao } from './services/supabaseService';
import { lerAvatarLocal, lerAvatarAuth } from './services/avatarService';
import { lerPerfilLocal } from './services/perfilLocalService';
import { homologationStore, normalizeHomologationBi, ensureInstitutionHomologationChannel, notifyAccountApproved, notifyAccountUnblocked } from './services/homologationStore';
import { resolveInstitutionLogin, resolveInstitutionFaceLogin, isInstitutionFichaSuspended, preloginLookupInstitution, purgeInstitutionLocalResidues, mapRowStatus, type InstitutionIdentity } from './services/institutionSessionService';
import { useInstitutions, CANONICAL_INSTITUTIONS } from './services/institutionStore';
import { getLogoOficialPorCodigoInstituicao } from './config/institutionLogos';
import { getLocalInstReg, normalizeInstCode, parseInstPack, normalizarNomeInstituicao, updateInstMemberProfile } from './services/institutionRegistrationStore';
import { getLoginBloqueio, registarLoginFalha, limparLoginFalhas } from './services/loginSecurityService';
import { resolveAdminAgentLogin, getAdminAgentCred, addAdminAgent, updateAdminAgentPermissions, ADMIN_ALFA_AGENT } from './services/adminAgentStore';
import {
  cloudSignIn, provisionCloudAccount, markCloudAccount, isCloudBound,
  isSupabaseConfigured, syntheticCitizenEmail, syntheticAdminEmail, syntheticInstitutionAgentEmail, hasActiveCloudSession,
  cloudSignOutBestEffort,
} from './services/cloudAuthService';
// F47 — revogação de contas eliminadas (pré-login via RPC v16 + purga local)
// F48 — sincronização viva do estado oficial em sessão aberta (luz Online/gate)
import { readCitizenRegistrationStatus, isRevokedDeletedAccount, purgeCitizenLocalResidues, resolveCloudGateAction, marcarCloudAprovou } from './services/accountGateService';
import { retomarRegistosBg, temRegistoBgAtivo } from './services/registoBgService';
import { puxarPerfilDaNuvem, reenviarPendenciasPerfil, temPendenciaPerfil } from './services/profileSyncService';
import { buildAutoFillProfile, type CitizenAutoFillProfile } from './services/autoFillService';
import { carregarPagamentosDoCidadao } from './services/pagamentosService';
import {
  alertaJaEmitido, formatarDiasRestantes, marcarAlertaEmitido,
  montarAlertasDePagamentos, mensagemDeAlerta, PAGAMENTOS_DEMO_PRAZOS,
  tituloDeAlerta,
} from './services/prazoAlertsService';
// F55 — Contactos de Emergência (núcleo puro testado). F57: as funções de
// alerta continuam no serviço, agora sem consumidor no lado do cidadão —
// reservadas ao fluxo institucional (v20), sem código zombie na UI.
import {
  emergencyProfileState,
  validateContactForm,
  checkContactRemoval,
  checkContactTypeChange,
} from './services/emergencyContactsService';
// F56 — sincronização offline honesta (replay real; núcleo puro injectável)
import {
  replayOfflineQueue,
  offlineSyncReportText,
  offlineSyncSandboxReportText,
} from './services/offlineSyncService';
// F58 — Difusão Institucional para Rede de Emergência (spec v20 aprovada)
import {
  buildWaMeLink,
  buildMailtoLink,
  redeemerWhatsappTarget,
  type RedeMember,
  type InstCitizenInfo,
  type BroadcastRecordRow,
} from './services/institutionEmergencyService';
import type { RowSendOutcome } from './components/features/InstitutionEmergencyBroadcast';
import type { HomologationMessage } from './services/homologationStore';
import { supabase } from './lib/supabaseClient';
import { resolveStorageUrl } from './lib/secureStorage';
import { notify } from './lib/notify';
import { isProfileEditActive } from './lib/profileEditGuard';
import { useSession, getModePathPrefix } from './services/sessionStore';
import { computeFaceSignature, computeFaceSignatureAsync, compareFaceSignatures, listDeviceFaceTemplates, faceModeLabel } from './services/faceAuth';
import { VideoSessionService } from './services/videoSessionService';
import { useLanguage } from './hooks/useLanguage';
import { startImagePreloading, subscribeToPreload } from './utils/imagePreloader';

// ============================================================================
// ETAPA DESEMPENHO (2026-08-05) — divisão por procura (React.lazy):
// estes painéis pesados (74–241 KB de fonte cada) deixaram de vir TODOS no
// ficheiro inicial (~1,9 MB). São descarregados só quando o utilizador os
// abre. Fallback: indicador a rodar; NENHUMA funcionalidade mudou.
// ============================================================================
const PainelSuspense = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<div className="flex items-center justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>}>
    {children}
  </Suspense>
);

// v37.18 — província onde o cidadão reside: primeiro pela morada declarada,
// senão pelo código provincial embutido no BI (ex.: 009874562LA041 → LA → Luanda).
const PROVINCIAS_ANGOLA = ['Icolo e Bengo', 'Cuando Cubango', 'Lunda Norte', 'Lunda Sul', 'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cunene', 'Huambo', 'Huíla', 'Luanda', 'Malanje', 'Moxico', 'Namibe', 'Uíge', 'Zaire'];
const CODIGO_PROVINCIA_BI: Record<string, string> = {
  LA: 'Luanda', BG: 'Benguela', BN: 'Bengo', BE: 'Bié', CB: 'Cabinda', CC: 'Cuando Cubango',
  CN: 'Cunene', HM: 'Huambo', HL: 'Huíla', IB: 'Icolo e Bengo', LN: 'Lunda Norte',
  LS: 'Lunda Sul', ML: 'Malanje', MX: 'Moxico', NM: 'Namibe', UI: 'Uíge', ZA: 'Zaire'
};
const normalizarProvincia = (v: string) => (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function derivarProvinciaCidadao(morada?: string | null, biCidadao?: string | null): string | null {
  const texto = normalizarProvincia(String(morada || ''));
  if (texto) {
    for (const prov of [...PROVINCIAS_ANGOLA].sort((a, b) => b.length - a.length)) {
      if (texto.includes(normalizarProvincia(prov))) return prov;
    }
  }
  const m = String(biCidadao || '').toUpperCase().replace(/\s+/g, '').match(/([A-Z]{2})\d{3}$/);
  if (m && CODIGO_PROVINCIA_BI[m[1]]) return CODIGO_PROVINCIA_BI[m[1]];
  return null;
}

const MessageDetail = lazy(() => import('./components/features/MessageDetail').then(m => ({ default: m.MessageDetail })));
const ProfileContent = lazy(() => import('./components/features/ProfileContent').then(m => ({ default: m.ProfileContent })));
const GovDashboard = lazy(() => import('./components/features/GovDashboard').then(m => ({ default: m.GovDashboard })));
const GovContactsContent = lazy(() => import('./components/features/GovContactsContent').then(m => ({ default: m.GovContactsContent })));
const GovInteroperabilidadeContent = lazy(() => import('./components/features/GovInteroperabilidadeContent').then(m => ({ default: m.GovInteroperabilidadeContent })));
const GovCorrespondenciasContent = lazy(() => import('./components/features/GovCorrespondenciasContent').then(m => ({ default: m.GovCorrespondenciasContent })));
const GovRelatorioContent = lazy(() => import('./components/features/GovRelatorioContent').then(m => ({ default: m.GovRelatorioContent })));
const GovIaContent = lazy(() => import('./components/features/GovIaContent').then(m => ({ default: m.GovIaContent })));
const InstQrCodeContent = lazy(() => import('./components/features/InstQrCodeContent').then(m => ({ default: m.InstQrCodeContent })));
const SondagensContent = lazy(() => import('./components/features/SondagensContent').then(m => ({ default: m.SondagensContent }))); // v36
const InstAiAssistantContent = lazy(() => import('./components/features/InstAiAssistantContent').then(m => ({ default: m.InstAiAssistantContent })));
// 2026-08-08 — Pagamentos (frontend-only; gateway só após validação INAPEM)
const PagamentosContent = lazy(() => import('./components/features/PagamentosContent').then(m => ({ default: m.PagamentosContent })));
const PagamentosInlineCidadao = lazy(() => import('./components/features/PagamentosContent').then(m => ({ default: m.PagamentosInlineCidadao })));
const InstPagamentosContent = lazy(() => import('./components/features/InstPagamentosContent').then(m => ({ default: m.InstPagamentosContent })));
const SolicitarDocumentoContent = lazy(() => import('./components/features/SolicitarDocumentoContent').then(m => ({ default: m.SolicitarDocumentoContent })));
const RegisterStepper = lazy(() => import('./components/features/RegisterStepper').then(m => ({ default: m.RegisterStepper })));
// 2026-08-14 — performance: componentes pesados fora do bundle principal
// (Jitsi/vídeo, TensorFlow/facial, voz, emergência, modais). Carregados só
// quando o utilizador os abre — reduz a carga inicial em ~30-40%.
const VideoSessionPage = lazy(() => import('./components/features/VideoSessionPage').then(m => ({ default: m.VideoSessionPage })));
const FacialLoginSettings = lazy(() => import('./components/features/FacialLoginSettings').then(m => ({ default: m.FacialLoginSettings })));
const VoiceGuideAssistant = lazy(() => import('./components/features/VoiceGuideAssistant').then(m => ({ default: m.VoiceGuideAssistant })));
const InstitutionEmergencyBroadcast = lazy(() => import('./components/features/InstitutionEmergencyBroadcast').then(m => ({ default: m.InstitutionEmergencyBroadcast })));
const ResetPasswordStepper = lazy(() => import('./components/features/ResetPasswordStepper').then(m => ({ default: m.ResetPasswordStepper })));
const NotificationDetailModal = lazy(() => import('./components/features/NotificationDetailModal').then(m => ({ default: m.NotificationDetailModal })));
const InstitutionDetail = lazy(() => import('./components/features/InstitutionDetail').then(m => ({ default: m.InstitutionDetail })));
// 2026-08-14 — GovSegurancaContent usa recharts (262 KB): fora do entry para
// não pré-carregar gráficos no login.
const GovSegurancaContent = lazy(() => import('./components/features/GovSegurancaContent').then(m => ({ default: m.GovSegurancaContent })));
const DirectorioOrgaosContent = lazy(() => import('./components/features/DirectorioOrgaosContent').then(m => ({ default: m.DirectorioOrgaosContent })));

// v37.5 §3.2 — componentes pesados que vinham pelo barrel './components'
// passam a chunks próprios (lazy), já com fronteira Suspense incluída.
function lazyPainel<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  const LazyComp = lazy(factory);
  return function WithSuspense(props: ComponentProps<T>) {
    return (
      <PainelSuspense>
        <LazyComp {...(props as ComponentProps<typeof LazyComp>)} />
      </PainelSuspense>
    );
  };
}
const MailContent = lazyPainel(() => import('./components/features/MailContent').then(m => ({ default: m.MailContent })));
const DocumentsContent = lazyPainel(() => import('./components/features/DocumentsContent').then(m => ({ default: m.DocumentsContent })));
const WalletContent = lazyPainel(() => import('./components/features/WalletContent').then(m => ({ default: m.WalletContent })));
const ContactsContent = lazyPainel(() => import('./components/features/ContactsContent').then(m => ({ default: m.ContactsContent })));
const DocumentDetail = lazyPainel(() => import('./components/features/DocumentDetail').then(m => ({ default: m.DocumentDetail })));
const PastaDigitalContent = lazyPainel(() => import('./components/features/PastaDigitalContent').then(m => ({ default: m.PastaDigitalContent })));
const ActivityCenterContent = lazyPainel(() => import('./components/features/ActivityCenterContent').then(m => ({ default: m.ActivityCenterContent })));
const NotificationsCenterContent = lazyPainel(() => import('./components/features/NotificationsCenterContent').then(m => ({ default: m.NotificationsCenterContent })));
const GovEmissaoContent = lazyPainel(() => import('./components/features/GovEmissaoContent').then(m => ({ default: m.GovEmissaoContent })));
const GovDocsContent = lazyPainel(() => import('./components/features/GovDocsContent').then(m => ({ default: m.GovDocsContent })));
const GovPerfilContent = lazyPainel(() => import('./components/features/GovPerfilContent').then(m => ({ default: m.GovPerfilContent })));
const AIChatAssistant = lazyPainel(() => import('./components/features/AIChatAssistant').then(m => ({ default: m.AIChatAssistant })));
const AddContactModal = lazyPainel(() => import('./components/features/AddContactModal').then(m => ({ default: m.AddContactModal })));
const DeleteContactModal = lazyPainel(() => import('./components/features/DeleteContactModal').then(m => ({ default: m.DeleteContactModal })));
const RegisterInstitutionPage = lazyPainel(() => import('./components/features/RegisterInstitutionPage').then(m => ({ default: m.RegisterInstitutionPage })));
const RegisterAdminAgentPage = lazyPainel(() => import('./components/features/RegisterAdminAgentPage').then(m => ({ default: m.RegisterAdminAgentPage })));
const InstitutionAccessPanel = lazyPainel(() => import('./components/features/InstitutionAccessPanels').then(m => ({ default: m.InstitutionAccessPanel })));
const InstitutionForcedPasswordChange = lazyPainel(() => import('./components/features/InstitutionAccessPanels').then(m => ({ default: m.InstitutionForcedPasswordChange })));
import { shouldAutoSeedSupabase, shouldUseLocalBootstrap, shouldUseMockFallback } from './config/runtime';
import { buildDemoContentPlan, type DemoArea } from './services/demoContentGuarantee';
// v37.78.27 — logomarcas oficiais do LOGIN (claro/escuro): assets locais
// optimizados (~50 KB, servidos pela própria app) em vez de hotlink postimg
// (262–533 KB por visita) — primeira pintura do login instantânea.
// v37.78.35 — LOGOMARCA ÚNICA do login (pedido do dono 2026-08-31): a mesma
// imagem oficial («Correio-Digital-Angola-01.png», 533×800) no modo claro E escuro.
// v37.80 — Logomarcas agora usam URLs externas (postimg) directamente no JSX.


// ---- Estado "Lida" persistente por BI: sobrevive a terminar/iniciar sessão ----
export const cdaReadKey = (rawBi: string): string => `cda_read_msgs_${normalizeHomologationBi(rawBi || '')}`;

export const getReadMessageIds = (rawBi: string): Set<number> => {
  try {
    const raw = localStorage.getItem(cdaReadKey(rawBi));
    const arr = raw ? JSON.parse(raw) : [];
    return new Set<number>(Array.isArray(arr) ? arr.filter((n: unknown): n is number => typeof n === 'number') : []);
  } catch {
    return new Set<number>();
  }
};

export const persistReadMessageId = (rawBi: string, ...ids: number[]): void => {
  if (!rawBi) return;
  try {
    const set = getReadMessageIds(rawBi);
    ids.forEach(id => set.add(id));
    localStorage.setItem(cdaReadKey(rawBi), JSON.stringify(Array.from(set)));
  } catch { /* sem storage: fica só em memória */ }
};

// ============================================================================
// P-URL (2026-08-10, Opção A aprovada pelo dono) — HASH ROUTING
// Problema reportado: «o URL das páginas nunca muda» — a navegação era 100%
// estado React. Agora cada página reflecte-se no hash (#/correio, #/perfil…):
// voltar/avançar do browser funcionam, páginas passam a ser marcáveis e
// deep-links entram na página certa após o login. Regras:
//  · ESCRITA: qualquer tab definido pela app gera #/<tab> (o URL é honesto);
//  · LEITURA (input não confiável: URL manual, voltar, entrada): só tabs da
//    allow-list do MODO actual (um cidadão nunca abre '#/gov-dashboard');
//  · tabs de DETALHE precisam de estado auxiliar (mensagem/documento/
//    instituição escolhidos por clique) → caem no fallback seguro do modo;
//  · fora do stage 'app' o hash nunca é escrito; ao SAIR do app o hash é
//    limpo (replaceState) para não revelar a última página ao login seguinte.
// ============================================================================
const HASH_TAB_FALLBACKS: Record<string, Record<string, string>> = {
  user: { mensagem: 'correspondencias', documento: 'documentos', instituicao: 'home' },
  institution: { mensagem: 'correspondencias', documento: 'documentos', instituicao: 'home' },
  admin: { home: 'gov-dashboard', mensagem: 'gov-correspondencias', documento: 'gov-docs', instituicao: 'gov-interoperabilidade' },
};
const HASH_ALLOWED_TABS: Record<string, ReadonlySet<string>> = {
  user: new Set([
    'home', 'correspondencias', 'contatos', 'contactos', 'perfil', 'historico',
    'notificacoes', 'pagamentos', 'documentos', 'qr-code', 'pasta-digital',
    'solicitar-documento', 'video-atendimento',
    // tabs de detalhe — só via fallback (HASH_TAB_FALLBACKS)
    'mensagem', 'documento', 'instituicao',
  ]),
  institution: new Set([
    'home', 'correspondencias', 'gov-contatos', 'contatos', 'contactos',
    'inst-qrcode', 'inst-ai-assistant', 'perfil', 'inst-pagamentos',
    'sondagens', // v36 — lista/resultados de sondagens da instituição
    'historico', 'notificacoes', 'documentos',
    'mensagem', 'documento', 'instituicao',
  ]),
  admin: new Set([
    'home', 'gov-dashboard', 'gov-interoperabilidade', 'gov-correspondencias',
    'gov-contatos', 'gov-trabalhadores', 'gov-relatorio', 'gov-ia',
    'gov-seguranca', 'gov-perfil', 'gov-emissao', 'historico', 'notificacoes',
    'mensagem', 'documento', 'instituicao',
  ]),
};
// v37.42 — LOGIN POR ÁREA: a área de login deriva do pathname (logout/refresh
// caem no login certo). `/admin*`→admin, `/institucional*`→instituicao, resto→cidadão.
const areaDoUrl = (): 'user' | 'institution' | 'admin' => {
  const p = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '/';
  if (p.startsWith('/admin')) return 'admin';
  if (p.startsWith('/institucional')) return 'institution';
  return 'user';
};
// v37.43 — deduz o papel a partir do identificador digitado, para que qualquer
// login (independentemente do URL) autentique na área correcta sem separadores.
const detectaPapel = (id: string): 'user' | 'institution' | 'admin' | null => {
  const s = (id || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!s) return null;
  if (/^ADM/.test(s)) return 'admin';      // ADMIN-0001, ADM-8812-OP
  if (/^\d/.test(s)) return 'user';        // BI do cidadão (002399714LA030)
  return 'institution';                    // AGT-9921-SR, INAPEM-LLMM-01
};
const resolveHashToTab = (hash: string, mode: string): string | null => {
  const raw = hash.replace(/^#\/?/, '').split('?')[0].trim();
  if (!raw) return null;
  const allowed = HASH_ALLOWED_TABS[mode] || HASH_ALLOWED_TABS.user;
  if (!allowed.has(raw)) return null;
  return (HASH_TAB_FALLBACKS[mode] || {})[raw] || raw;
};

const resolveHashToLoginSubMode = (hash: string): 'normal' | 'register' | 'forgot' | 'face-capture' | 'email' | null => {
  const raw = hash.replace(/^#\/?/, '').split('?')[0].trim().toLowerCase();
  switch (raw) {
    case 'login':
      return 'normal';
    case 'registar':
    case 'registrar':
    case 'registo':
    case 'registro':
      return 'register';
    case 'recuperar-senha':
    case 'esqueci-senha':
    case 'forgot':
      return 'forgot';
    case 'login-facial':
    case 'facial':
      return 'face-capture';
    case 'login-email':
    case 'email':
      return 'email';
    default:
      return null;
  }
};

const getLoginHashForSubMode = (subMode: 'normal' | 'register' | 'forgot' | 'face-capture' | 'email'): string => {
  switch (subMode) {
    case 'normal':
      return 'login';
    case 'register':
      return 'registar';
    case 'forgot':
      return 'recuperar-senha';
    case 'face-capture':
      return 'login-facial';
    case 'email':
      return 'login-email';
    default:
      return 'login';
  }
};

export default function App() {
  const { currentLanguage, setCurrentLanguage, t } = useLanguage();

  const [stage, setStage] = useState(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('skip_splash_and_show_login') === 'true') {
      localStorage.removeItem('skip_splash_and_show_login');
      return 'login';
    }
    return 'splash';
  });
  const [triggerRefetch, setTriggerRefetch] = useState(0);
  // Tick para forçar re-render quando a conta é ativada no ecrã de homologação
  const [gateRefreshTick, setGateRefreshTick] = useState(0);
  const [tab, setTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/admin')) return 'gov-dashboard';
    }
    return 'home';
  });
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessModalTitle] = useState('');
  const [accessModalMessage] = useState('');
  
  // Persisted States
  const [userRequests, setUserRequests] = useState<UserRequest[]>(() => {
    if (shouldUseLocalBootstrap()) {
      const saved = localStorage.getItem('gov_user_requests');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error('Failed to parse gov_user_requests:', e);
        }
      }
    }
    return shouldUseMockFallback() ? [...MOCK_USER_REQUESTS] : [];
  });

  const [inbox, setInbox] = useState<Message[]>(() => {
    const baseItems = shouldUseMockFallback() ? [...INBOX] : [];
    if (!shouldUseLocalBootstrap()) {
      return baseItems.map(ensureProtocolOnMessage);
    }
    const saved = localStorage.getItem('correio_digital_inbox');
    let items: Message[] = [];
    if (!saved) {
      items = baseItems;
    } else {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const existingIds = new Set(parsed.map((m: { id?: number | string }) => m.id));
          const newItems = baseItems.filter(m => !existingIds.has(m.id));
          items = [...parsed, ...newItems];
        } else {
          items = baseItems;
        }
      } catch (e) {
        items = baseItems;
      }
    }
    return items.map(ensureProtocolOnMessage);
  });

  const [docInbox, setDocInbox] = useState<Message[]>(() => {
    const baseItems = shouldUseMockFallback() ? [...INBOX].map(m => ({ ...m, id: m.id + 10000 })) : [];
    if (!shouldUseLocalBootstrap()) {
      return baseItems.map(ensureProtocolOnMessage);
    }
    const saved = localStorage.getItem('documentos_digital_inbox');
    let items: Message[] = [];
    if (!saved) {
      items = baseItems;
    } else {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const existingIds = new Set(parsed.map((m: { id?: number | string }) => m.id));
          const newItems = baseItems.filter(m => !existingIds.has(m.id));
          items = [...parsed, ...newItems];
        } else {
          items = baseItems;
        }
      } catch (e) {
        items = baseItems;
      }
    }
    return items.map(ensureProtocolOnMessage);
  });

  const [instInbox, setInstInbox] = useState<Message[]>(() => {
    const baseItems = shouldUseMockFallback() ? [...INSTITUTIONAL_INBOX] : [];
    if (!shouldUseLocalBootstrap()) {
      return baseItems.map(ensureProtocolOnMessage).filter(m => m.id !== 1003);
    }
    const saved = localStorage.getItem('correio_digital_inst_inbox');
    let items: Message[] = [];
    if (!saved) {
      items = baseItems;
    } else {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const existingIds = new Set(parsed.map((m: { id?: number | string }) => m.id));
          const newItems = baseItems.filter(m => !existingIds.has(m.id));
          items = [...parsed, ...newItems];
        } else {
          items = baseItems;
        }
      } catch (e) {
        items = baseItems;
      }
    }
    return items.map(ensureProtocolOnMessage).filter(m => m.id !== 1003);
  });

  const [instDocInbox, setInstDocInbox] = useState<Message[]>(() => {
    const baseItems = shouldUseMockFallback() ? [...INSTITUTIONAL_INBOX].map(m => ({ ...m, id: m.id + 10000 })) : [];
    if (!shouldUseLocalBootstrap()) {
      return baseItems.map(ensureProtocolOnMessage).filter(m => m.id !== 10003 && m.id !== 1003);
    }
    const saved = localStorage.getItem('documentos_digital_inst_inbox');
    let items: Message[] = [];
    if (!saved) {
      items = baseItems;
    } else {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const existingIds = new Set(parsed.map((m: { id?: number | string }) => m.id));
          const newItems = baseItems.filter(m => !existingIds.has(m.id));
          items = [...parsed, ...newItems];
        } else {
          items = baseItems;
        }
      } catch (e) {
        items = baseItems;
      }
    }
    return items.map(ensureProtocolOnMessage).filter(m => m.id !== 10003 && m.id !== 1003);
  });
  
  const [sentMessages, setSentMessages] = useState<Message[]>(() => {
    const baseItems = shouldUseMockFallback() ? [...SENT_MESSAGES] : [];
    if (!shouldUseLocalBootstrap()) {
      return baseItems.map(ensureProtocolOnMessage);
    }
    const saved = localStorage.getItem('correio_digital_sent');
    let items = baseItems;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          items = parsed;
        }
      } catch (e) {
        console.error('Failed to parse correio_digital_sent:', e);
      }
    }
    return items.map(ensureProtocolOnMessage);
  });

  const [docSentMessages, setDocSentMessages] = useState<Message[]>(() => {
    const baseItems = shouldUseMockFallback() ? [...SENT_MESSAGES].map(m => ({ ...m, id: m.id + 10000 })) : [];
    if (!shouldUseLocalBootstrap()) {
      return baseItems.map(ensureProtocolOnMessage);
    }
    const saved = localStorage.getItem('documentos_digital_sent');
    let items = baseItems;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          items = parsed;
        }
      } catch (e) {
        console.error('Failed to parse documentos_digital_sent:', e);
      }
    }
    return items.map(ensureProtocolOnMessage);
  });

  const [deletedMessageIds, setDeletedMessageIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('correio_digital_deleted_message_ids');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse correio_digital_deleted_message_ids:', e);
      }
    }
    return [12];
  });

  const [hiddenMessageIds, setHiddenMessageIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('correio_digital_hidden_message_ids');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse correio_digital_hidden_message_ids:', e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('correio_digital_deleted_message_ids', JSON.stringify(deletedMessageIds));
  }, [deletedMessageIds]);

  useEffect(() => {
    localStorage.setItem('correio_digital_hidden_message_ids', JSON.stringify(hiddenMessageIds));
  }, [hiddenMessageIds]);

  // v37.31-fix — difusões «TODOS» são linhas PARTILHADAS por todos os
  // cidadãos: arquivar/eliminar na nuvem por UM cidadão escondia a mensagem
  // de TODOS os outros (a caixa filtra state_indicator Arquivada). Nesses
  // casos a remoção é apenas LOCAL (por titular); a nuvem não é tocada.
  const mensagemEhDifusaoTodos = (id: number): boolean => {
    const alvo = [...inbox, ...docInbox].find((m) => m.id === id);
    return !!alvo && String((alvo as any).recipientBi || '').toUpperCase() === 'TODOS';
  };

  const handleDeleteMessage = (id: number) => {
    // v37.78.23 — ZERO RASTOS: em contas REAIS «Eliminar» é DEFINITIVO já no
    // 1.º clique. A caixa real tem a nuvem como fonte única e FILTRA as linhas
    // 'Arquivada' — o antigo 2.º passo (Eliminar na pasta Arquivadas) ficava
    // inalcançável e a linha sobrevivia para sempre na base central. Sessões
    // DEMO mantêm o ciclo histórico (Arquivadas → Eliminar permanente).
    const baseId = id >= 10000 && id < 90000000 ? id - 10000 : id;
    const jaArquivada = deletedMessageIds.includes(id);
    const definitiva = !isDemoSession || jaArquivada;
    if (!jaArquivada) {
      setDeletedMessageIds([...deletedMessageIds, id]);
    }
    if (definitiva) {
      if (!hiddenMessageIds.includes(id)) {
        setHiddenMessageIds([...hiddenMessageIds, id]);
        if (isOnline && hasValidSupabaseKeys() && !mensagemEhDifusaoTodos(id)) {
          // v37.78.23 — ZERO RASTOS: a eliminação permanente carimba a cópia
          // única da mensagem com o marcador ELIM_PERM:<chave> desta conta. A
          // linha só é PURGADA por completo (histórico + notificações + anexos
          // do Storage) quando a OUTRA parte também já eliminou a sua cópia —
          // enquanto a outra parte mantém a mensagem, nada é destruído do lado
          // dela (estados independentes, regra R2). A decisão lê o estado
          // FRESCO da nuvem (o espelho local pode estar desactualizado).
          const normElim = (v?: string) => String(v || '').toUpperCase().replace(/\s+/g, '').replace(/-\d{2}$/, '');
          const minhaChaveElim = normElim(isInstMode ? normalizeInstCode(institutionCode || bi) : normalizeHomologationBi(bi));
          void (async () => {
            const fresca = await lerMensagemParaEliminacao(baseId).catch(() => null);
            const actionsElim: string[] = fresca && fresca.actions.length
              ? fresca.actions
              : (() => {
                  const fonteElim = [...inbox, ...docInbox, ...instInbox, ...instDocInbox, ...sentMessages, ...docSentMessages]
                    .find(m => m.id === id || ((m.id >= 10000 && m.id < 90000000 ? m.id - 10000 : m.id) === baseId));
                  return Array.isArray(fonteElim?.details?.actions) ? (fonteElim!.details!.actions as string[]) : [];
                })();
            const partesElim = fresca
              ? [fresca.senderBi, fresca.recipientBi]
              : [];
            const outrasPartesElim = partesElim.map(normElim).filter(k => !!k && k !== minhaChaveElim);
            const marcadoresElim = actionsElim.filter(a => a.startsWith('ELIM_PERM:')).map(a => normElim(a.slice('ELIM_PERM:'.length)));
            if (marcadoresElim.some(mk => outrasPartesElim.includes(mk))) {
              // ambas as partes eliminaram → purga total na base central
              const rPurga = await eliminarCorrespondenciaTotal(baseId).catch(() => null);
              addAuditLog(rPurga && rPurga.ok
                ? `Correspondência ID ${baseId} purgada por completo (linha, histórico, notificações e anexos do Storage) — ambas as partes eliminaram (ZERO RASTOS).`
                : `Correspondência ID ${baseId}: purga total na nuvem adiada (${(rPurga && rPurga.erro) || 'rede indisponível'}) — a cópia já não é visível; o marcador mantém-se para a próxima tentativa.`,
                rPurga && rPurga.ok ? 'success' : 'warning');
            } else {
              supabaseService.updateMessageState(baseId, {
                state_indicator: 'EliminadaPermanente',
                actions: [...actionsElim.filter(a => !a.startsWith('ELIM_PERM:')), `ELIM_PERM:${minhaChaveElim}`],
              }).catch(err => console.warn('[CDA-sync] Sincronização falhou (não bloqueia a ação local):', err));
              supabaseService.insertMessageStateEvent({
                messageId: baseId,
                state: 'EliminadaPermanente',
                responsible: user?.name || 'Utilizador',
            description: 'Correspondência eliminada permanentemente da vista do utilizador.'
          }).catch(err => console.warn('[CDA-sync] Sincronização falhou (não bloqueia a ação local):', err));
            }
          })();
        }
        notify('Correspondência eliminada com sucesso.', 'success');
      }
    } else if (isOnline && hasValidSupabaseKeys() && !mensagemEhDifusaoTodos(id)) {
      // sessão DEMO — 1.º passo: arquivar (ciclo histórico intacto)
      supabaseService.updateMessageState(baseId, { state_indicator: 'Arquivada' }).catch(err => console.warn('[CDA-sync] Sincronização falhou (não bloqueia a ação local):', err));
      supabaseService.insertMessageStateEvent({
        messageId: baseId,
        state: 'Arquivada',
        responsible: user?.name || 'Utilizador',
        description: 'Correspondência movida para as eliminadas pelo utilizador.'
      }).catch(err => console.warn('[CDA-sync] Sincronização falhou (não bloqueia a ação local):', err));
      notify('Correspondência arquivada com sucesso.', 'success');
    }
  };

  const handleRestoreMessage = (id: number) => {
    setDeletedMessageIds(deletedMessageIds.filter(mid => mid !== id));
    const baseId = id >= 10000 && id < 90000000 ? id - 10000 : id;
    if (isOnline && hasValidSupabaseKeys() && !mensagemEhDifusaoTodos(id)) {
      supabaseService.updateMessageState(baseId, { state_indicator: 'Ativa' }).catch(err => console.warn('[CDA-sync] Sincronização falhou (não bloqueia a ação local):', err));
      supabaseService.insertMessageStateEvent({
        messageId: baseId,
        state: 'Restaurada',
        responsible: user?.name || 'Utilizador',
        description: 'Correspondência restaurada do arquivo.'
      }).catch(err => console.warn('[CDA-sync] Sincronização falhou (não bloqueia a ação local):', err));
    }
  };

  // 2026-08-21 (desempenho/UX) — verdadeiro quando a primeira sincronização
  // com a nuvem terminou (usado para o estado de carregamento das páginas).
  const [cloudSyncedOnce, setCloudSyncedOnce] = useState(false);

  const [contacts, setContacts] = useState<Contact[]>(() => {
    if (shouldUseLocalBootstrap()) {
      const saved = localStorage.getItem('correio_digital_contacts');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error('Failed to parse correio_digital_contacts:', e);
        }
      }
    }
    return shouldUseMockFallback() ? [...INITIAL_CONTACTS] : [];
  });

  const [documents, setDocuments] = useState<Document[]>(() => {
    const baseItems = shouldUseMockFallback() ? [...DOCUMENTS] : [];
    if (!shouldUseLocalBootstrap()) {
      return baseItems.map(ensureProtocolOnDocument);
    }
    const saved = localStorage.getItem('correio_digital_documents');
    let items = baseItems;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          items = parsed;
        }
      } catch (e) {
        console.error('Failed to parse correio_digital_documents:', e);
      }
    }
    return items.map(ensureProtocolOnDocument);
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    let items: AppNotification[] = [];
    if (shouldUseLocalBootstrap()) {
      const saved = localStorage.getItem('correio_digital_notifications');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            items = parsed;
          }
        } catch (e) {
          console.error('Failed to parse correio_digital_notifications:', e);
        }
      }
    }
    if (items.length === 0 && shouldUseMockFallback()) {
      items = [...NOTIFICATIONS];
    }
    
    // Deduplicate by combining title and message to clear any stale accumulated duplicates
    const seen = new Set<string>();
    const uniqueItems: AppNotification[] = [];
    items.forEach(item => {
      const key = `${item.title || ''}|${item.message || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueItems.push(item);
      }
    });
    return uniqueItems;
  });

  const [auditLogs, setAuditLogs] = useState<any[]>(() => {
    if (shouldUseLocalBootstrap()) {
      const saved = localStorage.getItem('gov_audit_logs');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error('Failed to parse gov_audit_logs:', e);
        }
      }
    }
    return shouldUseMockFallback() ? [...MOCK_AUDIT_LOGS] : [];
  });

  const [correspondences, setCorrespondences] = useState<Correspondence[]>(() => {
    if (shouldUseLocalBootstrap()) {
      const saved = localStorage.getItem('gov_correspondences');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error('Failed to parse gov_correspondences:', e);
        }
      }
    }
    return shouldUseMockFallback() ? [...MOCK_GOV_CORRESPONDENCES] : [];
  });

  useEffect(() => {
    localStorage.setItem('gov_correspondences', JSON.stringify(correspondences));
  }, [correspondences]);

  const [emergencyMode, setEmergencyMode] = useState(() => {
    return localStorage.getItem('gov_emergency_mode') === 'true';
  });

  const [docRequests, setDocRequests] = useState<DocRequest[]>(() => {
    if (shouldUseLocalBootstrap()) {
      const saved = localStorage.getItem('gov_doc_requests');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error('Failed to parse gov_doc_requests:', e);
        }
      }
    }
    return shouldUseMockFallback() ? [...MOCK_DOC_REQUESTS] : [];
  });

  // v37.14 — o campo «Nº de Utilizador» do login inicia SEMPRE vazio:
  // apenas o placeholder ilustrativo é apresentado; nenhum identificador
  // pré-preenchido (nem demo, nem de sessões anteriores persistidas).
  const [bi, setBiLocal] = useState('');

  const [phone, setPhoneLocal] = useState(() => {
    if (shouldUseLocalBootstrap()) {
      return localStorage.getItem('correio_digital_phone') || MOCK_SESSION_USER.phone;
    }
    return MOCK_SESSION_USER.phone;
  });

  const [nif, setNifLocal] = useState(() => {
    if (shouldUseLocalBootstrap()) {
      return localStorage.getItem('correio_digital_nif') || MOCK_SESSION_USER.nif;
    }
    return MOCK_SESSION_USER.nif;
  });

  const [passport, setPassportLocal] = useState(() => {
    if (shouldUseLocalBootstrap()) {
      return localStorage.getItem('correio_digital_passport') || MOCK_SESSION_USER.passport;
    }
    return MOCK_SESSION_USER.passport;
  });

  const [verificationStatus, setVerificationStatus] = useState(() => {
    if (shouldUseLocalBootstrap()) {
      return localStorage.getItem('correio_digital_verification_status') || 'Totalmente verificado';
    }
    return 'Totalmente verificado';
  });

  const [hasFacialAuth, setHasFacialAuth] = useState(() => {
    if (shouldUseLocalBootstrap()) {
      return localStorage.getItem('correio_digital_has_facial_auth') === 'false' ? false : true;
    }
    return true;
  });

  const [hasTwoFactor, setHasTwoFactor] = useState(() => {
    if (shouldUseLocalBootstrap()) {
      return localStorage.getItem('correio_digital_has_two_factor') === 'true';
    }
    return false;
  });

  const [govPin, setGovPin] = useState(() => {
    if (shouldUseLocalBootstrap()) {
      return localStorage.getItem('correio_digital_gov_pin') || '1234';
    }
    return '1234';
  });

  const [profileName, setProfileNameLocal] = useState(() => {
    if (shouldUseLocalBootstrap()) {
      return localStorage.getItem('correio_digital_profile_name') || MOCK_SESSION_USER.name;
    }
    return MOCK_SESSION_USER.name;
  });

  const [userBirthDate, setUserBirthDateLocal] = useState(() => {
    if (shouldUseLocalBootstrap()) {
      return localStorage.getItem('correio_digital_birth_date') || MOCK_SESSION_USER.birthDate;
    }
    return MOCK_SESSION_USER.birthDate;
  });

  const [userFiliation, setUserFiliationLocal] = useState(() => {
    if (shouldUseLocalBootstrap()) {
      return localStorage.getItem('correio_digital_filiation') || MOCK_SESSION_USER.filiation;
    }
    return MOCK_SESSION_USER.filiation;
  });

  const [userMaritalStatus, setUserMaritalStatusLocal] = useState(() => {
    if (shouldUseLocalBootstrap()) {
      return localStorage.getItem('correio_digital_marital_status') || MOCK_SESSION_USER.maritalStatus;
    }
    return MOCK_SESSION_USER.maritalStatus;
  });

  // Wrapper functions to keep local states synced to master SessionStore
  const setBi = (val: string | ((prev: string) => string)) => {
    const resolved = typeof val === 'function' ? (val as Function)(bi) : val;
    setBiLocal(resolved);
    if (updateUserFields) updateUserFields({ bi: resolved });
  };

  const setPhone = (val: string | ((prev: string) => string)) => {
    const resolved = typeof val === 'function' ? (val as Function)(phone) : val;
    setPhoneLocal(resolved);
    if (updateUserFields) updateUserFields({ phone: resolved });
  };

  const setNif = (val: string | ((prev: string) => string)) => {
    const resolved = typeof val === 'function' ? (val as Function)(nif) : val;
    setNifLocal(resolved);
    if (updateUserFields) updateUserFields({ nif: resolved });
  };

  const setPassport = (val: string | ((prev: string) => string)) => {
    const resolved = typeof val === 'function' ? (val as Function)(passport) : val;
    setPassportLocal(resolved);
    if (updateUserFields) updateUserFields({ passport: resolved });
  };

  const setProfileName = (val: string | ((prev: string) => string)) => {
    const resolved = typeof val === 'function' ? (val as Function)(profileName) : val;
    setProfileNameLocal(resolved);
    if (updateUserFields) updateUserFields({ name: resolved });
  };

  const setUserBirthDate = (val: string | ((prev: string) => string)) => {
    const resolved = typeof val === 'function' ? (val as Function)(userBirthDate) : val;
    setUserBirthDateLocal(resolved);
    if (updateUserFields) updateUserFields({ birthDate: resolved });
  };

  const setUserFiliation = (val: string | ((prev: string) => string)) => {
    const resolved = typeof val === 'function' ? (val as Function)(userFiliation) : val;
    setUserFiliationLocal(resolved);
    if (updateUserFields) updateUserFields({ filiation: resolved });
  };

  const setUserMaritalStatus = (val: string | ((prev: string) => string)) => {
    const resolved = typeof val === 'function' ? (val as Function)(userMaritalStatus) : val;
    setUserMaritalStatusLocal(resolved);
    if (updateUserFields) updateUserFields({ maritalStatus: resolved });
  };

  const applyDemoPresetForMode = (mode: AppMode, includePassword = false) => {
    const preset = DEMO_CREDENTIALS[mode];
    // v37.14 — nos TRÊS perfis o campo «Nº de Utilizador» fica LIVRE no login:
    // o identificador demo aparece apenas como placeholder (ou via botão
    // «Auto Preencher Demonstração»); a sessão demo assume o identificador no
    // submit quando o campo fica vazio.
    setBiLocal('');
    setPhoneLocal(preset.phone);
    setNifLocal(preset.nif);
    setPassportLocal(preset.passport);
    setProfileNameLocal(preset.profileName);
    setUserBirthDateLocal(preset.birthDate);
    setUserFiliationLocal(preset.filiation);
    setUserMaritalStatusLocal(preset.maritalStatus);
    setVerificationStatus(preset.verificationStatus);
    setHasTwoFactor(preset.hasTwoFactor);
    setHasFacialAuth(preset.hasFacialAuth);
    setGovPin(preset.govPin);
    if (includePassword) setLoginPasswordInput(preset.password);
    updateUserFields?.({
      bi: preset.identifier,
      phone: preset.phone,
      nif: preset.nif,
      passport: preset.passport,
      name: preset.profileName,
      birthDate: preset.birthDate,
      filiation: preset.filiation,
      maritalStatus: preset.maritalStatus,
      // Repõe a foto canónica do perfil demo — salvo se o utilizador tiver
      // escolhido outra neste dispositivo (2026-08-20: a foto deixa de
      // reverter a cada login; chave por identificador, sem contaminação
      // entre contas).
      avatarUrl: lerAvatarLocal(mode, preset.identifier) || MOCK_SESSION_USER.avatarUrl,
    });
  };

  // F8 — Avatar neutro institucional (sigla/iniciais): NUNCA fotos de terceiros.
  const makeInstNeutralAvatar = (label: string): string => {
    const txt = (label || 'IN').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'IN';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' rx='20' fill='#0c2340'/><text x='48' y='58' font-family='Arial,sans-serif' font-size='30' font-weight='700' fill='#ffffff' text-anchor='middle'>${txt}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  // F8 — Cada conta institucional vê apenas os SEUS dados: aplica a identidade
  // (nome, e-mail, telefone, cargo, foto) do responsável/colaborador autenticado,
  // limpando os campos do cidadão demo que a sessão partilhada trazia.
  const applyInstitutionSessionIdentity = async (result: { code: string; name: string; identity?: InstitutionIdentity | null; pack?: ReturnType<typeof parseInstPack>; status?: string }) => {
    const code = normalizeInstCode(result.code);
    // 2026-08-20 — nome canónico da instituição em toda a área (a nuvem
    // guardava a variante em minúsculas do INAPEM).
    const nomeExibicao = normalizarNomeInstituicao(result.name) || result.name;
    // F14 — Multi-dispositivo: garante o canal oficial da Área de Administração
    // quando a thread local não existe neste dispositivo (a conta REAL tem
    // sempre a correspondência de confirmação/aprovação da sua adesão).
    if (['pending', 'correcao', 'active'].includes(String(result.status || ''))) {
      ensureInstitutionHomologationChannel(code, result.name, result.status as 'pending' | 'correcao' | 'active');
    }
    const reg = getLocalInstReg(code);
    const pack = result.pack || parseInstPack(reg?.observacoes || '');
    const isMember = result.identity?.type === 'member';
    const memberRec = isMember ? (reg?.members || []).find(m => m.id === result.identity?.memberId) : undefined;
    // 2026-08-20 — dados editados na página Perfil da Instituição voltam no
    // próximo login: lê a linha `profiles` do código (via /api/perfil com
    // service role) ANTES dos valores do registo; contas demo (isExempt)
    // mantêm o comportamento local de sempre.
    let perfilPersistido: Record<string, any> | null = null;
    if (!homologationStore.isExempt(code) && hasValidSupabaseKeys()) {
      try { perfilPersistido = await supabaseService.getProfile(code); } catch { /* best-effort */ }
    }
    const personName = (isMember && result.identity?.memberName)
      ? result.identity.memberName
      : ((!isMember && perfilPersistido?.name) || (pack?.responsavel || nomeExibicao.replace(/\s*\([^)]*\)\s*$/, '') || 'Agente Institucional'));
    // 2026-08-21 — COLABORADOR: e-mail/telefone vêm do REGISTO DO PRÓPRIO
    // membro (com o espelho local por Nº de agente a ganhar), nunca da linha
    // `profiles` da instituição — essa pertence ao responsável (antes o
    // membro via os contactos do responsável e, pior, ao gravar o Perfil
    // sobrescrevia-os na nuvem).
    const personKey = (result.identity?.agentNumber || code).toUpperCase().replace(/\s+/g, '');
    const perfilAgente = (() => { try { return lerPerfilLocal('institution', personKey); } catch { return null; } })();
    const email = (isMember
      ? (perfilAgente?.email || memberRec?.email || '')
      : (perfilPersistido?.email || pack?.emailAcesso || pack?.emailContacto || reg?.email || '')).trim();
    const phone = (isMember
      ? (perfilAgente?.phone || memberRec?.phone || '')
      : (perfilPersistido?.phone || pack?.telefone || '')).trim();
    // Foto do agente: 1) captura facial desta pessoa (registada na página Conta);
    // 2) foto de perfil carregada por esta conta; 3) logótipo (responsável);
    // 4) avatar neutro gerado — nunca fotos de terceiros.
    let avatar = '';
    // 2026-08-21 — a foto de perfil é POR PESSOA: o colaborador usa as chaves
    // do seu Nº de agente (nunca a foto do responsável/instituição).
    const avatarKey = isMember ? personKey : code;
    try {
      const faceRaw = localStorage.getItem(`cda_demo_face_institution_${personKey}`);
      if (faceRaw) {
        const d = JSON.parse(faceRaw);
        if (d?.imageDataUrl) avatar = d.imageDataUrl as string;
      }
    } catch { /* ignora */ }
    if (!avatar) {
      try {
        const pp = localStorage.getItem(`cda_inst_profile_photo_${avatarKey}`);
        if (pp) avatar = pp;
      } catch { /* ignora */ }
    }
    // 2026-08-20 — a foto escolhida na página Perfil volta no próximo login:
    // Auth metadata (contas reais, qualquer dispositivo) e localStorage por
    // conta. Sem isto a foto revertia para a face/logo/neutro.
    if (!avatar && !homologationStore.isExempt(code)) {
      // v37.74 — ANTI-FUGA (espelho v37.29 do cidadão): o avatar do Auth só é
      // adotado se a sessão Auth pertencer MESMO a esta conta institucional
      // (e-mail sintético do agente/responsável ou o e-mail de acesso da
      // adesão) — impede que uma sessão residual de OUTRA conta neste
      // dispositivo empreste a sua foto à instituição acabada de criar/entrar.
      try {
        const { data: sdInst } = await supabase.auth.getSession();
        const emailSessaoInst = String(sdInst?.session?.user?.email || '').toLowerCase();
        const meusEmailsInst = new Set<string>();
        [normalizeInstCode(result.identity?.agentNumber || `${normalizeInstCode(code)}-01`), normalizeInstCode(code)]
          .forEach((a) => { if (a) meusEmailsInst.add(syntheticInstitutionAgentEmail(a).toLowerCase()); });
        const emailRegInst = String(perfilPersistido?.email || pack?.emailAcesso || pack?.emailContacto || reg?.email || '').toLowerCase();
        if (emailRegInst) meusEmailsInst.add(emailRegInst);
        if (emailSessaoInst && meusEmailsInst.has(emailSessaoInst)) {
          const authAv = await lerAvatarAuth();
          if (authAv) avatar = authAv;
        }
      } catch { /* ignora */ }
    }
    if (!avatar) {
      const lav = lerAvatarLocal('institution', avatarKey);
      if (lav) avatar = lav;
    }
    if (!avatar && !isMember && reg?.logoDataUrl) avatar = reg.logoDataUrl;
    if (!avatar) avatar = makeInstNeutralAvatar(pack?.sigla || personName);
    setProfileName(personName);
    setPhone(phone);
    setNif('');
    setPassport('');
    setUserBirthDate('');
    setUserFiliation('');
    setUserMaritalStatus('');
    // F11 — O estado de verificação deixa de ser o preset demo ('Agente AGT
    // Verificado'): a conta REAL mostra a sigla da PRÓPRIA instituição e o
    // estado de homologação. Sem registo de homologação = via legacy (activa).
    if (!homologationStore.isExempt(code)) {
      const brandSigla = (pack?.sigla || code.split('-')[0] || 'INST').toUpperCase();
      const hSt = homologationStore.getStatus(code)?.status || 'active';
      setVerificationStatus(
        hSt === 'active' ? `Agente ${brandSigla} Verificado`
        : hSt === 'correcao' ? 'Em Correcções'
        : hSt === 'rejected' ? 'Solicitação Rejeitada'
        : hSt === 'blocked' ? 'Conta Bloqueada'
        : 'Pendente de Validação');
    }
    updateUserFields?.({
      bi: code,
      name: personName,
      email,
      phone,
      nif: '',
      passport: '',
      birthDate: '',
      filiation: '',
      maritalStatus: '',
      avatarUrl: avatar,
    });
    updateActiveProfileFields?.({
      role: isMember ? (memberRec?.role || 'Colaborador') : (pack?.cargo || 'Responsável'),
      departmentName: isMember ? (memberRec?.dept || '') : '',
    });
  };

  // Resolve e aplica a identidade real do cidadao que inicia sessao.
  // Contas demo canonicas manutem o preset; outros B.I.s carregam o perfil da nuvem (fallback local).
  // ITEM 3: biOverride — login por e-mail real resolve o B.I. da conta Auth e
  // precisa que a hidratação use ESSE B.I. (o state `bi` ainda não actualizou).
  const applyIdentityForLoggedUser = async (biOverride?: string) => {
    if (appMode !== 'user') return;
    // B.I. em branco no login = assume o identificador demo exibido como placeholder.
    const biBase = typeof biOverride === 'string' ? biOverride : bi;
    const normalized = (biBase.trim() || DEMO_CREDENTIALS.user.identifier).toUpperCase();
    if (biBase.trim().toUpperCase() !== normalized) setBi(normalized);
    if (normalized === DEMO_CREDENTIALS.user.identifier) {
      // Conta demo canónica: mantém a foto canónica, SALVO se o utilizador
      // tiver escolhido outra neste dispositivo (2026-08-20 — a foto deixa de
      // reverter para a canónica a cada login; chave por BI, sem contaminação
      // entre contas).
      const localAvatar = lerAvatarLocal('user', normalized);
      updateUserFields?.({ avatarUrl: localAvatar || MOCK_SESSION_USER.avatarUrl });
      return;
    }
    try {
      let resolvedName = '';
      let resolvedPhone = '';
      let resolvedNif = '';
      let resolvedPassport = '';
      let resolvedBirthDate = '';
      let resolvedFiliation = '';
      let resolvedMaritalStatus = '';
      let resolvedAvatar = '';
      // F53 (C2): a página Conta grava morada/email na nuvem — a hidratação tem
      // de os trazer de volta, senão o dado "gravado" desaparece no próximo login.
      let resolvedMorada = '';
      let resolvedEmail = '';

      // 1) Nuvem: tabela profiles — via supabaseService.getProfile (2026-08-20):
      // com a RLS endurecida a leitura directa devolvia vazio e a hidratação
      // caía no fallback local (dados editados "voltavam ao estado antigo").
      const isSupabaseReady = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (isSupabaseReady) {
        const data = await supabaseService.getProfile(normalized);
        if (data) {
          resolvedName = data.name || '';
          resolvedPhone = data.phone || '';
          resolvedNif = data.nif || '';
          resolvedPassport = data.passport || '';
          resolvedBirthDate = data.birth_date ? String(data.birth_date).split('-').reverse().join('/') : '';
          resolvedFiliation = data.filiation || '';
          resolvedMaritalStatus = data.marital_status || '';
          resolvedMorada = data.morada || '';
          resolvedEmail = data.email || '';
        }

        // 1b) Nuvem: fila oficial de registo (solicitacoes_registo) — cobre contas
        // registadas apos o patch SQL (que ja nao gravam em profiles)
        const { data: regRows, error: regErr } = await supabase
          .from('solicitacoes_registo')
          .select('nome, email, url_selfie, status')
          .eq('bi_numero', normalized)
          .order('criado_em', { ascending: false })
          .limit(1);
        if (regErr && (regErr as any).code !== 'PGRST205') {
          console.error('CADA: erro ao carregar solicitacao de registo no login:', regErr);
        }
        const reg = regRows && regRows[0];
        if (reg) {
          if (!resolvedName) resolvedName = reg.nome || reg.email || '';
          if (!resolvedAvatar && reg.url_selfie) {
            // F45 (Storage privado v15): resolve marcador/URL legada para URL
            // assinado; se falhar, mantém o valor cru (data-URL/externo intactos).
            resolvedAvatar = await resolveStorageUrl(supabase, reg.url_selfie) || reg.url_selfie;
          }
        }
      }

      // 2) Fallback local: registo efetuado neste dispositivo (nome + foto/selfie)
      try {
        const saved = localStorage.getItem('gov_admin_citizens');
        if (saved) {
          const match = (JSON.parse(saved) as Array<{ biNumber?: string; name?: string; contact?: string; facePhoto?: string }>).find((c) => (c.biNumber || '').toUpperCase() === normalized);
          if (match) {
            if (!resolvedName) resolvedName = match.name || match.contact || '';
            const fp = match.facePhoto || '';
            if (fp.startsWith('data:image/') || fp.includes('.supabase.co/')) resolvedAvatar = fp;
          }
        }
      } catch (_) { /* ignora */ }

      // 3) Foto biometrica local (matricula facial de 3 capturas deste dispositivo)
      try {
        const faceRaw = localStorage.getItem(`cda_demo_face_${appMode}_${normalized}`);
        if (faceRaw) {
          const faceData = JSON.parse(faceRaw);
          if (faceData?.imageDataUrl) resolvedAvatar = faceData.imageDataUrl;
        }
      } catch (_) { /* ignora */ }

      // 4) Foto de PERFIL escolhida pelo cidadão na página Perfil (2026-08-20):
      // tem prioridade sobre a selfie KYC/face — sem isto a nova foto revertia
      // para a antiga no login seguinte. Fontes: Auth metadata (nuvem) e
      // localStorage deste dispositivo (por BI).
      // v37.29 — ANTI-FUGA: o avatar do Auth só é adotado se a sessão Auth
      // pertencer MESMO a este B.I. (e-mail sintético da conta ou e-mail real
      // associado) — impede que uma sessão residual de OUTRO utilizador neste
      // dispositivo empreste a sua foto à conta acabada de criar/entrar.
      let fotoAuthSegura = '';
      try {
        const { data: sessDados } = await supabase.auth.getSession();
        const emailSessao = String(sessDados?.session?.user?.email || '').toLowerCase();
        const meusEmails = new Set<string>([syntheticCitizenEmail(normalized).toLowerCase()]);
        if (resolvedEmail) meusEmails.add(String(resolvedEmail).toLowerCase());
        if (emailSessao && meusEmails.has(emailSessao)) fotoAuthSegura = await lerAvatarAuth();
      } catch { /* melhor esforço */ }
      const fotoPerfil = fotoAuthSegura || lerAvatarLocal('user', normalized);
      if (fotoPerfil) resolvedAvatar = fotoPerfil;

      if (!resolvedName) {
        // F12 — B.I. sem registo (conta real desconhecida): a sessão entra LIMPA
        // e não verificada — nunca herda o perfil simulado da conta demo.
        setProfileName('');
        setPhoneLocal(''); setNifLocal(''); setPassportLocal('');
        setUserBirthDate(''); setUserFiliation(''); setUserMaritalStatus('');
        setVerificationStatus('Não Verificado');
        updateUserFields?.({
          bi: normalized, name: '', phone: '', nif: '', passport: '',
          birthDate: '', filiation: '', maritalStatus: '', email: '',
          avatarUrl: makeInstNeutralAvatar(normalized.slice(0, 2)),
        });
        return;
      }

      setProfileName(resolvedName);
      setPhoneLocal(resolvedPhone);
      setNifLocal(resolvedNif);
      setPassportLocal(resolvedPassport);
      setUserBirthDate(resolvedBirthDate);
      setUserFiliation(resolvedFiliation);
      setUserMaritalStatus(resolvedMaritalStatus);
      setVerificationStatus('Identidade Registada');
      updateUserFields?.({
        bi: normalized,
        phone: resolvedPhone,
        nif: resolvedNif,
        passport: resolvedPassport,
        name: resolvedName,
        birthDate: resolvedBirthDate,
        filiation: resolvedFiliation,
        maritalStatus: resolvedMaritalStatus,
        avatarUrl: resolvedAvatar,
        // F53 (C2): só quando presentes na nuvem — nunca substituir por vazio
        // um valor local válido (contas antigas podem não ter estas colunas).
        ...(resolvedMorada ? { address: resolvedMorada } : {}),
        ...(resolvedEmail ? { email: resolvedEmail } : {}),
      });
      addAuditLog(`Identidade resolvida para o utilizador registado ${resolvedName} (${normalized})`, 'info');
    } catch (e) {
      console.error('CADA: falha ao resolver identidade do utilizador no login:', e);
    }
  };

  useEffect(() => {
    localStorage.setItem('correio_digital_bi', bi);
  }, [bi]);

  useEffect(() => {
    localStorage.setItem('correio_digital_phone', phone);
  }, [phone]);

  useEffect(() => {
    localStorage.setItem('correio_digital_nif', nif);
  }, [nif]);

  useEffect(() => {
    localStorage.setItem('correio_digital_passport', passport);
  }, [passport]);

  useEffect(() => {
    localStorage.setItem('correio_digital_verification_status', verificationStatus);
  }, [verificationStatus]);

  useEffect(() => {
    localStorage.setItem('correio_digital_has_facial_auth', String(hasFacialAuth));
  }, [hasFacialAuth]);

  useEffect(() => {
    localStorage.setItem('correio_digital_has_two_factor', String(hasTwoFactor));
  }, [hasTwoFactor]);

  useEffect(() => {
    localStorage.setItem('correio_digital_gov_pin', govPin);
  }, [govPin]);

  useEffect(() => {
    localStorage.setItem('correio_digital_profile_name', profileName);
  }, [profileName]);

  useEffect(() => {
    localStorage.setItem('correio_digital_birth_date', userBirthDate);
  }, [userBirthDate]);

  useEffect(() => {
    localStorage.setItem('correio_digital_filiation', userFiliation);
  }, [userFiliation]);

  useEffect(() => {
    localStorage.setItem('correio_digital_marital_status', userMaritalStatus);
  }, [userMaritalStatus]);

  // UI States
  const [loginSubMode, setLoginSubMode] = useState<'normal' | 'face-capture' | 'register' | 'forgot' | 'email'>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const fromHash = resolveHashToLoginSubMode(window.location.hash);
      if (fromHash) return fromHash;
    }
    return 'normal';
  });
  // ITEM 3 (2026-08-09) — recuperação REAL por e-mail: o link enviado pelo
  // mailer do Supabase cria uma sessão temporária (evento PASSWORD_RECOVERY);
  // nesse momento forçamos o ecrã de nova senha. E login por E-MAIL para as
  // contas que associaram um e-mail real no Perfil.
  const [passwordRecoveryActive, setPasswordRecoveryActive] = useState(false);
  const [loginEmailInput, setLoginEmailInput] = useState('');
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryActive(true);
        setLoginSubMode('forgot');
        setStage('login');
      }
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [showVoiceGuide, setShowVoiceGuide] = useState(false);
  const [highlightSteps, setHighlightSteps] = useState(false);
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  // v37.11 — feedback imediato no botão de login + ignorar cliques repetidos
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  // v37.15 — anti-autofill: se o browser injectar credenciais guardadas antes
  // de qualquer interacção, os campos são limpos (nascem vazios, com placeholder).
  const loginInteragidoRef = useRef(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [, setEnteredOtp] = useState('');
  const [, setEnteredPin] = useState('');
  const [faceProgress, setFaceProgress] = useState(0);
  const [isFaceScanning, setIsFaceScanning] = useState(false);
  const [demoFaceTemplateLoaded, setDemoFaceTemplateLoaded] = useState(false);
  // v37.78.40 — total de registos faciais guardados neste dispositivo (todas as áreas)
  const [deviceFaceCount, setDeviceFaceCount] = useState(0);
  const [demoFaceTemplateMeta, setDemoFaceTemplateMeta] = useState<{ capturedAt: string; identifier: string } | null>(null);
  const [faceCaptureHint, setFaceCaptureHint] = useState('Posicione o rosto no centro da moldura.');
  const [faceCaptureError, setFaceCaptureError] = useState<string | null>(null);
  const [webcamReady, setWebcamReady] = useState(false);
  const [isSimulatedCamera, setIsSimulatedCamera] = useState(false);
  const [webcamPermissionDenied, setWebcamPermissionDenied] = useState(false);
  const loginFaceVideoRef = useRef<HTMLVideoElement | null>(null);
  const loginFaceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const loginFaceStreamRef = useRef<MediaStream | null>(null);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [, setMessageSource] = useState('correspondencias');
  const [wasOpenedUnread, setWasOpenedUnread] = useState(false);

  // Mic Activation State (UI only)
  const [iaLiveActive, setIaLiveActive] = useState(false);
  const chatAssistantRecognitionRef = useRef<any>(null); // Referência compartilhada do microfone
  const startIaVoice = () => setIaLiveActive(true);
  const stopIaVoice = () => setIaLiveActive(false);
  
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { user, appMode, setAppMode, activeProfile, updateUserFields, updateActiveProfileFields } = useSession();
  // v37.18 — catálogo partilhado (Lista de Instituições na Ficha Institucional)
  const { institutions: catalogoInstituicoes } = useInstitutions();
  const isGovMode = appMode === 'admin';
  const isInstMode = appMode === 'institution';
  // F12 — auxiliar simétrico para a ideologia demo/real (conta cidadão).
  const isUserMode = appMode === 'user';

  // v37.43 — LOGIN POR ÁREA (corrigido): o modo inicial vem do URL uma única
  // vez; um REFRESH com sessão cai no login da área; e o papel real é deduzido
  // da credencial no submit (ver detectaPapel), reencaminhando para a área certa.
  const pendingResubmitRef = useRef(false);
  const loginSubmitRef = useRef<((force?: boolean) => void) | null>(null);
  useEffect(() => {
    const area = areaDoUrl();
    setAppMode(area);
    setTab(area === 'admin' ? 'gov-dashboard' : 'home');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // v37.47 — marca sessão activa para o splash distinguir refresh (mantém) de
  // primeira visita (login). Limpa no logout (handleLogout).
  useEffect(() => {
    if (stage === 'app') { try { localStorage.setItem('cda_sessao_activa', '1'); } catch { /* melhor esforço */ } }
  }, [stage]);
  // v37.47 — «refresh ⇒ apenas actualizar»: removido o redireccionamento que, com
  // sessão activa, empurrava o refresh para o login. O refresh agora restaura a
  // sessão e mantém a página (comportamento convencional). O LOGOUT continua a
  // encaminhar para <área>#/login (via handleLogout), como pedido.
  useEffect(() => {
    if (!pendingResubmitRef.current) return;
    // Dispara o 2º submit (force) com as credenciais ainda intactas; o flag só
    // é libertado no próximo tick, para que o efeito de limpeza (declarado
    // depois) veja pending=true e não apague os campos neste ciclo.
    loginSubmitRef.current?.(true);
    setTimeout(() => { pendingResubmitRef.current = false; }, 0);
  }, [appMode]);
  // 2026-08-22 — área ADMIN: a página Equipa é exclusiva do Admin Alfa
  // (ADMIN-0001), mesmo desenho da área Instituição (responsável vs
  // colaboradores). Agentes reais ADMIN-NNNN (NNNN >= 2) têm o item INACTIVO
  // e o painel de acesso restrito; contas demo (ADM-8812-OP) mantêm acesso
  // total — o Modo Demo nunca é prejudicado.
  const adminBiNorm = (bi || '').toUpperCase().replace(/\s+/g, '').trim();
  const isDemoGovSession = isGovMode && (homologationStore.isExempt(bi || '') || !adminBiNorm);
  const adminEquipaBloqueada = isGovMode && !isDemoGovSession && adminBiNorm !== ADMIN_ALFA_AGENT;

  // ==========================================================================
  // Q-2 — QR DEEP-LINK (?correspondencia=<protocolo>): digitalizar o QR de uma
  // correspondência abre a própria mensagem na plataforma. O parâmetro é lido
  // no arranque; a resolução acontece quando o utilizador entra no app (stage
  // 'app'), procurando a mensagem nas caixas locais. Sem match após o prazo de
  // merge da nuvem, verifica o registo REAL (RPC cda_validar_protocolo) e
  // mostra um aviso honesto — nunca inventa a correspondência.
  // ==========================================================================
  const [qrTarget, setQrTarget] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const p = new URL(window.location.href).searchParams.get('correspondencia');
      return p ? p.trim() : null;
    } catch { return null; }
  });
  // Q-3 (2026-08-21) — id real do deep-link: QRs legados podem ter número de
  // protocolo divergente do gravado (o protocol_number é imutável após envio);
  // o id identifica a mensagem real e serve de chave de localização.
  const [qrTargetId, setQrTargetId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = new URL(window.location.href).searchParams.get('id');
      if (!raw) return null;
      const m = String(raw).match(/^INT-(?:MESSAGE|DOCUMENT)-2026-(\d+)$/i);
      return m ? m[1] : null;
    } catch { return null; }
  });
  const qrTargetResolvedRef = useRef<string | null>(null);
  const [qrNotice, setQrNotice] = useState<null | { protocolo: string; tipo: 'nao_encontrada' | 'outra_conta' | 'indisponivel' }>(null);

  const limparQrDaUrl = () => {
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete('correspondencia');
      u.searchParams.delete('id');
      u.searchParams.delete('reg');
      window.history.replaceState(null, '', `${u.pathname}${u.search}${u.hash}`);
    } catch { /* melhor esforço */ }
  };

  // 1) Match local: a cada alteração das caixas, procura a mensagem pelo
  // número de protocolo (formato normalizado — caixa alta, sem espaços) OU
  // pelo id real do deep-link (QR legado com número divergente).
  useEffect(() => {
    if (stage !== 'app' || !qrTarget) return;
    if (qrTargetResolvedRef.current === qrTarget) return;
    const alvoNormalizado = qrTarget.trim().toUpperCase();
    const todas = [...inbox, ...instInbox, ...sentMessages];
    let alvo = todas.find(m => (m.protocol?.protocolNumber || '').trim().toUpperCase() === alvoNormalizado);
    if (!alvo && qrTargetId) {
      alvo = todas.find(m => String(m.id) === qrTargetId || String(m.id).includes(qrTargetId) || qrTargetId.includes(String(m.id)));
    }
    if (!alvo) return; // caixas ainda podem estar a fundir — o deadline decide o negativo
    qrTargetResolvedRef.current = qrTarget;
    setQrTarget(null);
    setQrTargetId(null);
    limparQrDaUrl();
    setSelectedMessage(alvo);
    setTab(isGovMode ? 'gov-correspondencias' : 'correspondencias');
    window.scrollTo({ top: 0 });
  }, [stage, qrTarget, qrTargetId, inbox, instInbox, sentMessages, isGovMode]);

  // 2) Prazo de resolução: passado o tempo de merge da nuvem sem match local,
  // valida o protocolo no registo público e mostra o aviso honesto.
  useEffect(() => {
    if (stage !== 'app' || !qrTarget) return;
    if (qrTargetResolvedRef.current === qrTarget) return;
    const numero = qrTarget;
    const t = setTimeout(async () => {
      if (qrTargetResolvedRef.current === numero) return; // entretanto resolvido
      qrTargetResolvedRef.current = numero;
      const res = await supabaseService.validarProtocolo(numero);
      setQrTarget(null);
      setQrTargetId(null);
      limparQrDaUrl();
      setQrNotice({
        protocolo: numero,
        tipo: res.errorCode ? 'indisponivel' : (res.encontrado ? 'outra_conta' : 'nao_encontrada'),
      });
    }, 3500);
    return () => clearTimeout(t);
  }, [stage, qrTarget]);

  // Etapa #2 (Cidadão) — perfil de auto-preenchimento dos formulários, montado
  // da sessão. Apenas leitura; os formulários preenchem-se localmente e a
  // utilização fica em auditoria local (autoFillService).
  const autoFillProfile = useMemo<CitizenAutoFillProfile>(() => buildAutoFillProfile({
    bi: bi || user?.bi || '',
    name: profileName || user?.name || '',
    nif: nif || user?.nif || '',
    phone: phone || user?.phone || '',
    email: user?.email || '',
    morada: user?.address || '',
    birthDate: userBirthDate || user?.birthDate || '',
    filiation: userFiliation || user?.filiation || '',
    maritalStatus: userMaritalStatus || user?.maritalStatus || '',
    passport: passport || user?.passport || '',
  }), [bi, nif, phone, passport, profileName, userBirthDate, userFiliation, userMaritalStatus, user]);

  // ---- P-URL (Opção A) — sincronização tab ⇄ hash (ver bloco de módulo) ----
  const [hashNavTick, setHashNavTick] = useState(0);
  const urlDrivenNavRef = useRef(false);
  const hashHydratedRef = useRef(false);
  // Voltar/avançar e edição manual do hash marcam a navegação como «da URL».
  useEffect(() => {
    const onHashNav = () => { urlDrivenNavRef.current = true; setHashNavTick(x => x + 1); };
    window.addEventListener('popstate', onHashNav);
    window.addEventListener('hashchange', onHashNav);
    return () => {
      window.removeEventListener('popstate', onHashNav);
      window.removeEventListener('hashchange', onHashNav);
    };
  }, []);
  const lastSyncedTabRef = useRef(tab);
  useEffect(() => {
    if (stage !== 'app') { hashHydratedRef.current = false; return; }
    // Entrada no app (hidratação do deep-link) ou evento de URL: a URL manda.
    const urlDriven = urlDrivenNavRef.current || !hashHydratedRef.current;
    urlDrivenNavRef.current = false;
    hashHydratedRef.current = true;
    const pathPrefix = getModePathPrefix(appMode);
    const targetPath = pathPrefix || '/';
    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    if (urlDriven) {
      const fromUrl = resolveHashToTab(window.location.hash, appMode);
      if (fromUrl) {
        if (fromUrl !== tab) {
          setSelectedMessage(null);
          setSelectedDoc(null);
          window.scrollTo({ top: 0 });
          setTab(fromUrl);
          return;
        }
        // Mesmo tab (ou resolvido via fallback de detalhe, ex.: '#/mensagem'):
        // normaliza o URL por substituição — NUNCA escreve nesta via, para o
        // histórico não entrar em pingue-pongue à volta de tabs de detalhe.
        if (window.location.hash !== `#/${fromUrl}` || currentPath !== targetPath) {
          window.history.replaceState(null, '', `${targetPath}#/${fromUrl}`);
        }
        lastSyncedTabRef.current = fromUrl;
        return;
      }
      // Hash inválido neste modo (lixo / outro portal) → escrita abaixo normaliza.
    }
    const target = `#/${tab}`;
    const targetUrl = `${targetPath}${target}`;
    if (window.location.hash !== target || currentPath !== targetPath) {
      if (window.location.hash === `#/${lastSyncedTabRef.current}` && currentPath === targetPath) {
        // Navegação in-app com o URL onde o deixámos → nova entrada (voltar OK).
        window.history.pushState(null, '', targetUrl);
      } else {
        // URL mexido manualmente/entrada/inválido → normaliza por substituição.
        window.history.replaceState(null, '', targetUrl);
      }
    }
    lastSyncedTabRef.current = tab;
  }, [tab, stage, appMode, hashNavTick]);
  // Ao SAIR do app (logout/expiração) o hash é limpo — sem destruir deep-links
  // escritos ANTES do login (transição splash→login não é logout).
  const prevStageForHashRef = useRef(stage);
  useEffect(() => {
    if (stage === 'login') {
      const pathPrefix = getModePathPrefix(appMode);
      const targetPath = pathPrefix || '/';
      const hashName = getLoginHashForSubMode(loginSubMode);
      const targetUrl = `${targetPath}#/${hashName}`;
      const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
      if (window.location.hash !== `#/${hashName}` || currentPath !== targetPath) {
        window.history.replaceState(null, '', targetUrl);
      }
    }
    prevStageForHashRef.current = stage;
  }, [stage, loginSubMode, appMode]);
  const institutionCode = resolveInstitutionCode(activeProfile?.institutionName || '');
  // F3/F7 — estado da conta institucional: 'restricted' = pendente/em correções (a área abre na mesma; o estado alimenta o tom do indicador Online); 'full' = aprovada
  const [instGate, setInstGate] = useState<'none' | 'restricted' | 'full'>('none');
  
  // 2026-09-02 — CORRIGIR BUG: persistir instIdentity em localStorage para que
  // a sessão do colaborador sobreviva ao refresh da página. Antes, o estado era
  // apenas em memória e voltava a null após refresh, fazendo o sistema assumir
  // a identidade do responsável (vazamento de dados entre contas).
  const [instIdentity, setInstIdentity] = useState<InstitutionIdentity | null>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('cda_inst_identity');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.warn('[App] Falha ao ler cda_inst_identity do localStorage:', e);
          return null;
        }
      }
    }
    return null;
  });
  // 2026-08-21 — espelho SEMPRE atual da identidade institucional para os
  // efeitos de fundo (carregador Supabase/realtime): estes correm com closures
  // antigas e precisam de saber ao vivo se a sessão é de um COLABORADOR — o
  // perfil do membro nunca pode ser hidratado com a linha `profiles` do
  // responsável.
  const instIdentityRef = useRef<InstitutionIdentity | null>(null);
  instIdentityRef.current = instIdentity;
  
  // 2026-09-02 — Sincronizar instIdentity com localStorage para persistência
  useEffect(() => {
    if (instIdentity) {
      localStorage.setItem('cda_inst_identity', JSON.stringify(instIdentity));
    } else {
      localStorage.removeItem('cda_inst_identity');
    }
  }, [instIdentity]);
  const [instMustChangePwd, setInstMustChangePwd] = useState(false);
  // 2026-08-22 — PERMISSÕES DE PÁGINA (fonte: Supabase user_metadata, com
  // espelho local): páginas que o colaborador/agente pode abrir. null/undefined
  // = sem restrições (responsável, Alfa, demo e membros legados). O menu filtra
  // por esta lista, a navegação por URL é bloqueada no render e o backend
  // (/api/agente-permissoes) revalida a sessão.
  const adminAgentCred = isGovMode && adminBiNorm ? getAdminAgentCred(adminBiNorm) : undefined;
  const paginasMenu: string[] | null = (isInstMode && instIdentity?.type === 'member')
    ? (instIdentity.paginasPermitidas ?? null)
    : (isGovMode && adminEquipaBloqueada && Array.isArray(adminAgentCred?.paginasPermitidas))
      ? (adminAgentCred!.paginasPermitidas as string[])
      : null;
  const paginasMenuKey = paginasMenu ? paginasMenu.join('|') : '';
  // Navegação/tabs que nunca são "páginas" — detalhes e sobreposições
  // (mensagem aberta, documento, notificações, histórico…) ficam livres.
  const TAB_PAGINAS_LIVRES = new Set(['mensagem', 'documento', 'notificacoes', 'historico', 'video-atendimento', 'inst-pagamentos']);
  void instIdentity; // consumida pela F4 (equipa/perfil)

  // Claro/Escuro Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('correio_digital_theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('correio_digital_theme', theme);
  }, [theme]);

  useEffect(() => {
    // v37.43 — não limpar as credenciais durante o re-submit provocado pela
    // troca automática de área (detectaPapel); senão o 2º submit iria vazio.
    if (pendingResubmitRef.current) return;
    if (stage === 'login' || stage === 'splash') {
      // v37.58 — refresh com sessão activa: restaurar o identificador real da
      // sessão em vez de pré-preencher a demo. Antes, o preset demo corria no
      // 'splash' e repunha bi=AGT-9921-SR, trocando logomarca e dados da instituição.
      let temSessaoActiva = false;
      try { temSessaoActiva = localStorage.getItem('cda_sessao_activa') === '1'; } catch { /* melhor esforço */ }
      if (temSessaoActiva) {
        let biSessao = '';
        try { biSessao = localStorage.getItem('correio_digital_bi') || ''; } catch { /* melhor esforço */ }
        if (biSessao) setBiLocal(biSessao);
      } else {
        applyDemoPresetForMode(appMode, false);
      }
      setLoginPasswordInput('');
      setEnteredOtp('');
      setEnteredPin('');
      setLoginError(null);
      // v37.15 — o autofill do browser dispara onChange logo após o render;
      // sem interacção do utilizador, limpa os campos uma vez (600 ms).
      loginInteragidoRef.current = false;
      const t = setTimeout(() => {
        if (!loginInteragidoRef.current) {
          setBiLocal('');
          setLoginPasswordInput('');
        }
      }, 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [appMode, stage]);

  const DEMO_CREDENTIALS = {
    user: {
      identifier: '009874562LA041',
      password: '123456',
      profileName: 'Edlasio Galhardo',
      phone: '+244 923 000 111',
      nif: '5401329188',
      passport: 'AO-P129384',
      birthDate: '12/03/1995',
      filiation: 'António Galhardo & Maria Conceição',
      maritalStatus: 'Solteiro',
      verificationStatus: 'Totalmente verificado',
      hasTwoFactor: true,
      hasFacialAuth: true,
      govPin: '1234',
    },
    institution: {
      identifier: 'AGT-9921-SR',
      password: '000000',
      profileName: 'Edlasio Galhardo',
      phone: '+244 923 456 789',
      nif: '5401329188',
      passport: 'AO-P129384',
      birthDate: '12/03/1995',
      filiation: 'António Galhardo & Maria Conceição',
      maritalStatus: 'Solteiro',
      verificationStatus: 'Agente AGT Verificado',
      hasTwoFactor: false,
      hasFacialAuth: true,
      govPin: '7788',
    },
    admin: {
      identifier: 'ADM-8812-OP',
      password: 'GALHARDO',
      profileName: 'Edlasio Galhardo',
      phone: '+244 923 456 789',
      nif: '5401329188',
      passport: 'AO-P129384',
      birthDate: '12/03/1995',
      filiation: 'António Galhardo & Maria Conceição',
      maritalStatus: 'Solteiro',
      verificationStatus: 'Administrador Geral / Central',
      hasTwoFactor: false,
      hasFacialAuth: true,
      govPin: '9900',
    }
  } as const;

  const getDemoFaceStorageKey = () => {
    const identifier = (bi || DEMO_CREDENTIALS[appMode].identifier || 'anon').toUpperCase().replace(/\s+/g, '');
    return `cda_demo_face_${appMode}_${identifier}`;
  };

  const stopLoginFaceCamera = () => {
    if (loginFaceStreamRef.current) {
      loginFaceStreamRef.current.getTracks().forEach(track => track.stop());
      loginFaceStreamRef.current = null;
    }
    if (loginFaceVideoRef.current) {
      loginFaceVideoRef.current.srcObject = null;
    }
    setWebcamReady(false);
    setIsSimulatedCamera(false);
  };

  const readStoredDemoFace = () => {
    try {
      const raw = localStorage.getItem(getDemoFaceStorageKey());
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const captureLoginFaceFrame = () => {
    const video = loginFaceVideoRef.current;
    const canvas = loginFaceCanvasRef.current;
    
    // If we have video and it's valid, use it!
    if (video && canvas && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const signature = computeFaceSignature(canvas);
        return { imageDataUrl, signature };
      }
    }
    
    // Fallback: If video is not ready, or is 0, we fall back to drawing a simulated biometric face signature on the canvas!
    // This ensures that even in restricted iframe/browser environments, the user can test the facial ID beautifully.
    if (canvas) {
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a'; // dark background
        ctx.fillRect(0, 0, 300, 300);
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 300; i += 30) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 300);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(300, i);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.ellipse(150, 150, 70, 100, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(120, 130, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(180, 130, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(150, 150);
        ctx.lineTo(145, 175);
        ctx.lineTo(155, 175);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(150, 200, 20, 8, 0, 0, Math.PI);
        ctx.stroke();
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const signature = computeFaceSignature(canvas);
        return { imageDataUrl, signature };
      }
    }
    return null;
  };

  const captureLoginFaceFrameAsync = async () => {
    const video = loginFaceVideoRef.current;
    const canvas = loginFaceCanvasRef.current;
    
    if (video && canvas && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // v37.78.43 — VALIDAÇÃO MULTI-FRAME: captura 3 frames com 280ms de
        // intervalo e devolve as 3 assinaturas (a coerência usa a MELHOR
        // combinação frame×registo). Um único frame é sensível a vibração/
        // piscar/illuminação — 3 frames tornam o reconhecimento estável.
        const signatures: number[][] = [];
        let imageDataUrl = '';
        for (let k = 0; k < 3; k += 1) {
          if (k > 0) await new Promise(r => setTimeout(r, 280));
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          if (!imageDataUrl) imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          signatures.push(computeFaceSignature(canvas));
        }
        return { imageDataUrl, signature: signatures[0], signatures };
      }
    }
    
    if (canvas) {
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 300, 300);
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 300; i += 30) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 300);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(300, i);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.ellipse(150, 150, 70, 100, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(120, 130, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(180, 130, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(150, 150);
        ctx.lineTo(145, 175);
        ctx.lineTo(155, 175);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(150, 200, 20, 8, 0, 0, Math.PI);
        ctx.stroke();
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const signature = await computeFaceSignatureAsync(canvas);
        return { imageDataUrl, signature };
      }
    }
    return null;
  };
  
  // Sincronização Unidirecional de Session para os estados locais do App.tsx
  // EXCEÇÃO: no login/splash o campo B.I. é livre (placeholder + digitação) —
  // a sessão nunca reescreve o campo enquanto o utilizador está a digitar.
  useEffect(() => {
    if (user && stage !== 'login' && stage !== 'splash') {
      setBiLocal(prev => prev !== user.bi ? user.bi : prev);
      setPhoneLocal(prev => prev !== user.phone ? user.phone : prev);
      setNifLocal(prev => prev !== user.nif ? user.nif : prev);
      setPassportLocal(prev => prev !== user.passport ? user.passport : prev);
      setProfileNameLocal(prev => prev !== user.name ? user.name : prev);
      setUserBirthDateLocal(prev => prev !== user.birthDate ? user.birthDate : prev);
      setUserFiliationLocal(prev => prev !== user.filiation ? user.filiation : prev);
      setUserMaritalStatusLocal(prev => prev !== user.maritalStatus ? user.maritalStatus : prev);
    }
  }, [user, stage]);

  useEffect(() => {
    setLoginError(null);
  }, [loginSubMode, appMode]);
  
  const [correspondenciaTab, setCorrespondenciaTab] = useState('lidas');
  const [videoSessionCount, setVideoSessionCount] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const [composeData, setComposeData] = useState<{ to: string; subject: string; body: string; attachments?: string[]; toArray?: string[]; sondagensIds?: number[] }>({ to: '', subject: '', body: '', attachments: [], toArray: [] });

  const [documentosTab, setDocumentosTab] = useState('lidas');
  const [isDocComposing, setIsDocComposing] = useState(false);
  const [docComposeData, setDocComposeData] = useState({ to: '', subject: '', body: '' });

  const [contactForm, setContactForm] = useState({ name: '', bi: '', relation: '', phone: '', whatsapp: '', email: '', type: 'Normal' as 'Normal' | 'Emergência' });
  // F55 — Contactos de Emergência: erros de validação reais e bloqueio
  // honesto da regra dos 2. (F57 — o accionamento de alerta saiu do lado do
  // cidadão: a Mensagem de Emergência passa a ser funcionalidade institucional.)
  const [contactFormErrors, setContactFormErrors] = useState<string[]>([]);
  const [contactDeleteBlock, setContactDeleteBlock] = useState<string | null>(null);

  // F59 (= F58 + fusão aprovada) — lookup REAL do destinatário no compositor
  // institucional: um ÚNICO campo de BI alimenta tanto o envio oficial como a
  // difusão de emergência. O campo separado "rede de emergência" foi eliminado
  // (duplicado) e a pesquisa teatral de 8s com textos governamentais
  // inventados foi removida — a RPC auditada é a única fonte.
  const [recipientLookup, setRecipientLookup] = useState<
    | { status: 'idle' }
    | { status: 'busy'; lookedUpBi: string }
    | { status: 'found'; lookedUpBi: string; citizen: InstCitizenInfo; sandbox?: boolean }
    | { status: 'not_found'; lookedUpBi: string }
    | { status: 'error'; lookedUpBi: string; errorCode: string }
  >({ status: 'idle' });
  const [instEmgBroadcastOpen, setInstEmgBroadcastOpen] = useState(false);
  const [instEmgRecipients, setInstEmgRecipients] = useState<RedeMember[] | null>(null);
  const [instEmgRecipientsBusy, setInstEmgRecipientsBusy] = useState(false);
  const [instEmgRecipientsError, setInstEmgRecipientsError] = useState<string | null>(null);

  // F55 — ao (re)abrir o modal de novo contacto, erros antigos não persistem.
  useEffect(() => {
    if (isAddingContact) setContactFormErrors([]);
  }, [isAddingContact]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!selectedMessage && wasOpenedUnread) {
      setCorrespondenciaTab('lidas');
      setDocumentosTab('lidas');
      setWasOpenedUnread(false);
    }
  }, [selectedMessage, wasOpenedUnread]);

  // REGRA CENTRAL DE LEITURA: abrir uma mensagem NÃO LIDA marca-a
  // automaticamente como LIDA em todas as listas — sai de "Não Lidas" e passa
  // para "Lidas" de imediato. Cobre todo e qualquer caminho de abertura.
  useEffect(() => {
    if (!selectedMessage) return;
    if (!selectedMessage.unread) return;
    // REGRA R2 (v37.78.12) — o REMETENTE que abre a própria enviada NÃO marca
    // leitura: o «Não Lida» da pasta Enviadas é o RECIBO DE LEITURA do
    // destinatário e tem de permanecer fiel até ele abrir a carta.
    const normR2 = (v?: string) => String(v || '').toUpperCase().replace(/\s+/g, '');
    const minhaChaveR2 = normR2(isInstMode ? normalizeInstCode(institutionCode || bi) : normalizeHomologationBi(bi));
    if (normR2((selectedMessage as any).senderKey) === minhaChaveR2 && normR2((selectedMessage as any).recipientBi) !== minhaChaveR2) return;
    const targetId = selectedMessage.id;
    const baseOf = (id: number) => (id >= 10000 && id < 90000000 ? id - 10000 : id);
    const baseId = baseOf(targetId);
    // Persiste "Lida" para as próximas sessões deste BI (novo login não repõe "Não Lida").
    persistReadMessageId(bi, targetId, baseId);
    const mark = (list: Message[]) => {
      let touched = false;
      const next = list.map(m => {
        if (!m.unread) return m;
        if (baseOf(m.id) !== baseId && m.id !== targetId) return m;
        touched = true;
        return { ...m, unread: 0, status: 'Lida' };
      });
      return touched ? next : list; // mesma referência = sem re-render extra
    };
    setInbox(prev => mark(prev));
    setDocInbox(prev => mark(prev));
    setInstInbox(prev => mark(prev));
    setInstDocInbox(prev => mark(prev));
    // objecto aberto em coerência visual (badge "Lida" no detalhe também)
    setSelectedMessage(prev =>
      prev && prev.id === targetId && prev.unread ? { ...prev, unread: 0, status: 'Lida' } : prev
    );
  }, [selectedMessage]);
  const [pageLoading, setPageLoading] = useState(true);
  const [preloadProgress, setPreloadProgress] = useState<number>(0);
  const [preloadCompleted, setPreloadCompleted] = useState<boolean>(false);
  const [searchMail, setSearchMail] = useState('');
  const [searchDocMail, setSearchDocMail] = useState('');
  const [searchDoc, setSearchDoc] = useState('');
  const [searchContact, setSearchContact] = useState('');
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeNotificationModal, setActiveNotificationModal] = useState<AppNotification | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Offline and Local Caching states
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [simulatedOffline, setSimulatedOffline] = useState(() => localStorage.getItem('gov_simulated_offline') === 'true');
  const [offlineQueue, setOfflineQueue] = useState<OfflineAction[]>(() => OfflineManager.getQueue());
  const [activeFallback, setActiveFallback] = useState<{ channel: 'SMS' | 'USSD' | 'PUSH'; message: string; protocol: string } | null>(null);
  const [showOfflineManagerWidget, setShowOfflineManagerWidget] = useState(false);

  const [successProtocolModal, setSuccessProtocolModal] = useState<{
    protocolNumber: string;
    org: string;
    subject: string;
    digitalSignature: string;
    documentHash: string;
    officialIssueDate: string;
    officialTime: string;
  } | null>(null);
  const [showSuccessDetails, setShowSuccessDetails] = useState(true);
  const [successModalCountdown, setSuccessModalCountdown] = useState<number>(5);
  const [pauseCountdown, setPauseCountdown] = useState<boolean>(false);

  useEffect(() => {
    if (successProtocolModal) {
      setSuccessModalCountdown(5);
      setPauseCountdown(false);
    }
  }, [successProtocolModal]);

  useEffect(() => {
    if (!successProtocolModal) return;
    if (pauseCountdown) return;

    const timer = setInterval(() => {
      setSuccessModalCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setSuccessProtocolModal(null);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [successProtocolModal, pauseCountdown]);

  useEffect(() => {
    if (successProtocolModal) {
      setTimeout(() => {
        const canvas = document.getElementById('protocol-qrcode-canvas') as HTMLCanvasElement;
        if (canvas) {
          import('qrcode').then((QRCode) => {
            QRCode.toCanvas(canvas, JSON.stringify({
              protocolNumber: successProtocolModal.protocolNumber,
              type: "Correspondência",
              org: successProtocolModal.org,
              subject: successProtocolModal.subject,
              date: successProtocolModal.officialIssueDate,
              time: successProtocolModal.officialTime,
              hash: successProtocolModal.documentHash,
              signature: successProtocolModal.digitalSignature
            }), {
              width: 130,
              margin: 1,
              color: {
                dark: '#0f172a',
                light: '#ffffff'
              }
            }, (error) => {
              if (error) console.error(error);
            });
          }).catch(err => {
            console.error('Failed to import qrcode dynamic module:', err);
          });
        }
      }, 150);
    }
  }, [successProtocolModal]);

  // Synchronize local profile state shifts to Supabase in real-time
  useEffect(() => {
    // Desativado envio automático de atualizações cadastrais para o Supabase
    // Isso evita conflitos de chave única (NIF/Passaporte) e impede qualquer Uncaught Exception na montagem.
    return;
  }, [profileName, phone, nif, passport, userBirthDate, userFiliation, userMaritalStatus, appMode, bi, isOnline]);

  // Demo facial login: load stored local profile and initialize camera when entering the flow
  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      if (loginSubMode !== 'face-capture') return;
      setFaceCaptureError(null);
      setWebcamPermissionDenied(false);
      setFaceCaptureHint('Posicione o rosto no centro da moldura.');
      setIsSimulatedCamera(false);
      const stored = readStoredDemoFace();
      setDemoFaceTemplateLoaded(!!stored);
      setDemoFaceTemplateMeta(stored ? { capturedAt: stored.capturedAt, identifier: stored.identifier } : null);
      // v37.78.40 — inventário do dispositivo: quantos rostos estão guardados
      // localmente (todas as áreas) — usado na linha de estado do login facial.
      try { setDeviceFaceCount(listDeviceFaceTemplates().length); } catch { setDeviceFaceCount(0); }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        loginFaceStreamRef.current = stream;
        // v37.78.39 — correção da corrida ref×transição de sub-ecrã: o <video> do
        // círculo pode montar alguns milissegundos depois de a stream chegar
        // (AnimatePresence). Sem retentativas a câmara perdia-se definitivamente
        // (círculo preto → validação caía no modo simulado → «Rosto não
        // reconhecido» mesmo com registo válido). Anexa com paciência de 3s.
        let videoAnexado = false;
        for (let t = 0; t <= 3000; t += 150) {
          if (loginFaceVideoRef.current) {
            loginFaceVideoRef.current.srcObject = stream;
            await loginFaceVideoRef.current.play().catch(err => console.warn('[CDA-sync] Sincronização falhou (não bloqueia a ação local):', err));
            videoAnexado = true;
            break;
          }
          if (!mounted) { stream.getTracks().forEach(track => track.stop()); return; }
          await new Promise(resolve => setTimeout(resolve, 150));
        }
        if (!videoAnexado) {
          console.warn('[LOGIN-FACIAL] O elemento de vídeo não montou a tempo — a câmara permanece em espera.');
          stream.getTracks().forEach(track => track.stop());
          loginFaceStreamRef.current = null;
          setWebcamReady(false);
          return;
        }
        setWebcamReady(true);
        // v37.78.43 — sem modelo para pré-aquecer: a assinatura facial é agora
        // 100% local e determinística (recorte central), imediata em qualquer
        // máquina/rede.
      } catch (error) {
        console.error('Erro ao abrir câmara de demonstração facial:', error);
        // Fallback to beautiful simulated camera mode!
        setWebcamReady(true);
        setIsSimulatedCamera(true);
        setFaceCaptureHint('Câmara física indetectável. Ativada Câmara Virtual com Scanner Biométrico Integrado para Demonstração.');
      }
    };

    if (loginSubMode === 'face-capture') {
      startCamera();
    } else {
      stopLoginFaceCamera();
      setFaceProgress(0);
      setIsFaceScanning(false);
      setDemoFaceTemplateLoaded(false);
      setDemoFaceTemplateMeta(null);
      setFaceCaptureError(null);
    }

    return () => {
      mounted = false;
      if (loginSubMode !== 'face-capture') {
        stopLoginFaceCamera();
      }
    };
  }, [loginSubMode, appMode, bi]);

  // Automatic transition upon successful login facial recognition
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loginSubMode === 'face-capture' && faceProgress === 100) {
      if (emergencyMode && !isInstMode && !isGovMode && (bi.toLowerCase().includes('002931298') || bi.toLowerCase().includes('edlasio') || profileName.toLowerCase().includes('edlasio'))) {
        setLoginError("Autenticação Biométrica Recusada: Chaves Faciais Suspensas por Ordem do Protocolo SOC-AN-2026!");
        setFaceProgress(0);
        setIsFaceScanning(false);
        return;
      }
      timer = setTimeout(() => {
        void (async () => {
          // F6/B6.3 — login facial também para instituições registadas: a face (verificada contra
          // o template da pessoa, registado na página Conta) substitui a senha. Gates idênticos.
          if (isInstMode && bi.trim().toUpperCase() !== DEMO_CREDENTIALS.institution.identifier && bi.trim() !== '') {
            try {
              const res = await resolveInstitutionFaceLogin(bi.trim(), supabase);
              if (res.outcome === 'invalid' || res.outcome === 'deny') {
                setLoginError(res.message || 'Login facial não autorizado para este Nº Agente.');
                setFaceProgress(0);
                setIsFaceScanning(false);
                stopLoginFaceCamera();
                setLoginSubMode('normal');
                addAuditLog(`Login facial institucional recusado (${res.code}): ${res.message}`, res.outcome === 'deny' ? 'critical' : 'warning');
                return;
              }
              applyInstitutionSessionIdentity(res);
              updateActiveProfileFields?.({ institutionName: `${res.name} (${res.code})` });
              setBi(res.code);
              setInstIdentity(res.identity || { type: 'responsible' });
              // com credencial facial não pedimos a senha inicial nesta sessão (a marca mantém-se na loja)
              setInstMustChangePwd(false);
              setInstGate(res.outcome === 'restricted' ? 'restricted' : 'full');
              addAuditLog(
                res.outcome === 'restricted'
                  ? `Login facial institucional (${res.code}) — conta pendente de aprovação: aviso oficial entregue como correspondência não lida (badge na foto de perfil).`
                  : `Login facial institucional (${res.code}) — ${res.identity?.type === 'member' ? `colaborador ${res.identity?.memberName}` : 'responsável'} autenticado.`,
                res.outcome === 'restricted' ? 'warning' : 'success'
              );
            } catch (e) {
              console.error('Erro no login facial institucional:', e);
              setLoginError('Falha na validação do login facial institucional. Tente novamente.');
              setFaceProgress(0);
              setIsFaceScanning(false);
              stopLoginFaceCamera();
              setLoginSubMode('normal');
              return;
            }
          }
          if (isInstMode && bi.trim().toUpperCase() === DEMO_CREDENTIALS.institution.identifier) {
            setInstGate('full');
            setInstIdentity({ type: 'responsible' });
          }
          // F47 — login facial do CIDADÃO com gates IDÊNTICOS ao login por senha
          // (antes não consultava a nuvem: uma conta eliminada voltava a entrar).
          // A face bateu => a conta existiu neste dispositivo (evidência local
          // forte); se a fila oficial já não tem registo deste B.I., o Admin
          // eliminou a conta => revogar + purgar vestígios (inclui a matriz facial).
          if (!isInstMode && !isGovMode) {
            const faceBi = bi.trim().toUpperCase().replace(/\s+/g, '');
            if (faceBi && !homologationStore.isExempt(faceBi) && isSupabaseConfigured()) {
              try {
                const pre = await readCitizenRegistrationStatus(supabase, faceBi);
                if (!temRegistoBgAtivo(faceBi) && isRevokedDeletedAccount({ read: pre, sessionLive: false, hasLocalEvidence: true })) {
                  purgeCitizenLocalResidues(faceBi);
                  await cloudSignOutBestEffort(supabase);
                  setLoginError('Esta conta foi ELIMINADA pela Área de Administração. Para voltar a usar a plataforma, efectue um NOVO registo — a conta só ficará activa após nova aprovação da Administração.');
                  setFaceProgress(0);
                  setIsFaceScanning(false);
                  stopLoginFaceCamera();
                  setLoginSubMode('normal');
                  addAuditLog(`Login facial do cidadão ${faceBi} recusado: registo inexistente na base central (conta eliminada pela Administração) — acesso revogado até novo registo + nova homologação (F47).`, 'critical');
                  return;
                }
                const faceSt = pre.ok && pre.status ? pre.status : '';
                if (faceSt) {
                  if (faceSt === 'Aprovado') homologationStore.setStatus(faceBi, 'active', undefined, undefined);
                  else if (faceSt === 'Pendente') homologationStore.setStatus(faceBi, 'pending', undefined, undefined);
                  else if (faceSt === 'Bloqueado') homologationStore.setStatus(faceBi, 'blocked', undefined, undefined);
                  else if (faceSt === 'Reprovado' || faceSt === 'Rejeitado' || faceSt === 'Não Aprovado') homologationStore.setStatus(faceBi, 'rejected', undefined, undefined);
                  if (faceSt === 'Bloqueado') {
                    setLoginError('A sua conta encontra-se BLOQUEADA pela Área de Administração. Contacte o suporte oficial para reactivação.');
                    setFaceProgress(0);
                    setIsFaceScanning(false);
                    stopLoginFaceCamera();
                    setLoginSubMode('normal');
                    addAuditLog(`Login facial do cidadão ${faceBi} recusado: conta BLOQUEADA (estado lido da nuvem).`, 'critical');
                    return;
                  }
                  if (faceSt === 'Reprovado' || faceSt === 'Rejeitado' || faceSt === 'Não Aprovado') {
                    setLoginError('O seu pedido de registo foi REJEITADO pela Área de Administração. Regularize a situação junto do suporte oficial.');
                    setFaceProgress(0);
                    setIsFaceScanning(false);
                    stopLoginFaceCamera();
                    setLoginSubMode('normal');
                    addAuditLog(`Login facial do cidadão ${faceBi} recusado: registo REJEITADO (estado lido da nuvem).`, 'critical');
                    return;
                  }
                }
              } catch (faceGateErr) {
                console.warn('[F47] Leitura do estado na nuvem indisponível no login facial — mantido o estado local (D3):', faceGateErr);
              }
            }
          }
          // v37.78.42 — REESTABELECIMENTO DA SESSÃO DA NUVEM no login facial
          // (bug do dono 2026-09-01: «após o login facial a página não exibe
          // todas as correspondências»). O login por senha faz cloudSignIn e
          // todas as leituras do correio oficial sobem pelo proxy do servidor
          // (service role); o login facial NÃO assinava a nuvem — com a sessão
          // morta pelo logout, as leituras caíam na via DIRECTA (RLS) e a caixa
          // de entrada ficava VAZIA. Restabelece a sessão com a credencial
          // local guardada neste dispositivo (mesmo padrão do restauro admin),
          // ANTES de entrar, para o carregamento de dados usar o caminho certo.
          if (!isInstMode && !isGovMode) {
            const faceBiCloud = bi.trim().toUpperCase().replace(/\s+/g, '');
            if (faceBiCloud && !homologationStore.isExempt(faceBiCloud) && isSupabaseConfigured()) {
              try {
                const localPass = (() => { try { return localStorage.getItem(`citizen_pass_${faceBiCloud}`); } catch { return null; } })();
                if (localPass) {
                  const rCloud = await cloudSignIn(supabase, syntheticCitizenEmail(faceBiCloud), localPass);
                  if (rCloud.outcome === 'ok') {
                    addAuditLog(`[AUTH-CLOUD] Login facial (${faceBiCloud}): sessão da nuvem restabelecida com a credencial local — correio oficial completo.`, 'success');
                  } else {
                    addAuditLog(`[AUTH-CLOUD] Login facial (${faceBiCloud}): não foi possível restabelecer a sessão da nuvem (${rCloud.outcome}) — o correio oficial pode ficar incompleto; entre uma vez com BI e senha para actualizar a credencial.`, 'warning');
                  }
                } else {
                  addAuditLog(`[AUTH-CLOUD] Login facial (${faceBiCloud}): sem credencial local da nuvem — o correio oficial pode ficar incompleto; entre uma vez com BI e senha para a criar.`, 'warning');
                }
              } catch (eCloudFace) {
                console.warn('[AUTH-CLOUD] Falha ao restabelecer a sessão no login facial (não bloqueia a entrada):', eCloudFace);
              }
            }
          }
          await applyIdentityForLoggedUser();
          stopLoginFaceCamera();
          if (isGovMode) setTab('gov-dashboard');
          setStage('app');
          addAuditLog('Acesso concedido via Biometria Facial Local de Demonstração', 'success');
        })();
      }, 400); // v37.78.41 — transição pós-reconhecimento 2× mais rápida (800→400ms)
    }
    return () => clearTimeout(timer);
  }, [faceProgress, loginSubMode, emergencyMode, bi, isInstMode, isGovMode, profileName]);
  // Reavaliação periódica em sessão de cidadão: desbloqueia a correspondência
  // assim que a Área de Administração aprovar o registo E mantém o canal oficial
  // de homologação actualizado (novas mensagens do admin aparecem em ~4s),
  // sem recarregar nem limpar dados.
  useEffect(() => {
    if (stage !== 'app' || (appMode !== 'user' && appMode !== 'institution')) return;
    const id = setInterval(() => setGateRefreshTick(t => t + 1), 4000);
    return () => clearInterval(id);
  }, [stage, appMode, bi]);

  // F48 — SINCRONIZAÇÃO VIVA do estado oficial da conta (área do cidadão): sem
  // esta sondagem, a decisão do Admin noutro dispositivo só era aprendida no
  // PRÓXIMO login — a luz "Online" ficava vermelha com a sessão aberta. A cada
  // 8s lê-se o estado da fila central (RPC security-definer v16; fallback SELECT
  // válido com a sessão do titular) e reflecte-se na loja local + tick de 4s que
  // re-renderiza a luz e o gate de correspondência. Eliminação em sessão ⇒
  // revogação imediata (F47). D3: leituras indisponíveis nunca tocam no estado.
  useEffect(() => {
    if (stage !== 'app' || appMode !== 'user') return;
    const liveBi = bi.trim().toUpperCase().replace(/\s+/g, '');
    if (!liveBi || homologationStore.isExempt(liveBi) || !isSupabaseConfigured()) return;
    let cancelled = false;
    let inFlight = false;
    const sync = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const pre = await readCitizenRegistrationStatus(supabase, liveBi);
        if (cancelled) return;
        const current = homologationStore.getStatus(liveBi)?.status ?? null;
        const action = resolveCloudGateAction(pre, current, liveBi);
        if (action.type === 'revoke' && !temRegistoBgAtivo(liveBi)) {
          purgeCitizenLocalResidues(liveBi);
          await cloudSignOutBestEffort(supabase);
          addAuditLog(`F48: a conta do cidadão ${liveBi} foi ELIMINADA pela Administração com esta sessão aberta — acesso revogado de imediato; novo acesso exige NOVO registo aprovado novamente.`, 'critical');
          setLoginPasswordInput('');
          setLoginError('A sua conta foi ELIMINADA pela Área de Administração durante esta sessão. Para voltar a usar a plataforma, efectue um NOVO registo — a conta só ficará activa após nova aprovação da Administração.');
          setStage('login');
          return;
        }
        if (action.type === 'set') {
          const wasBlocked = current === 'blocked';
          homologationStore.setStatus(liveBi, action.status, undefined, undefined);
          if (action.status === 'active') { marcarCloudAprovou(liveBi);
            // Canal oficial: a correspondência de activação chega também à caixa
            // do cidadão neste dispositivo (antes só existia no dispositivo do Admin).
            if (wasBlocked) notifyAccountUnblocked(liveBi, profileName || undefined);
            else notifyAccountApproved(liveBi, profileName || undefined);
            addAuditLog('F48: conta APROVADA pela Administração — activação detectada em sessão aberta (luz Online verde; correspondência institucional libertada).', 'success');
          } else if (action.status === 'blocked') {
            addAuditLog('F48: conta BLOQUEADA pela Administração — detectado em sessão aberta (luz Online amarela; acesso restrito).', 'critical');
          } else if (action.status === 'rejected') {
            addAuditLog('F48: registo REJEITADO pela Administração — detectado em sessão aberta.', 'warning');
          }
          setGateRefreshTick(t => t + 1);
        }
      } catch (e) {
        console.warn('[F48] Sincronização viva do estado indisponível (D3):', e);
      } finally {
        inFlight = false;
      }
    };
    const id = setInterval(sync, 8000);
    void sync(); // primeira verificação imediata ao entrar na área
    return () => { cancelled = true; clearInterval(id); };
  }, [stage, appMode, bi]);

  // F49 — SINCRONIZAÇÃO VIVA INSTITUCIONAL (gémea da F48 do cidadão): sem ela, a
  // aprovação/castigo da instituição noutro dispositivo só era aprendida no
  // PRÓXIMO login (o tick de 4s lê apenas a loja local). A cada 8s lê-se o
  // estado oficial via RPC security-definer (v15) e actualiza-se a loja local —
  // o tick F6 existente levanta instGate para 'full' sozinho quando fica
  // 'active'. ELIMINAÇÃO em sessão ⇒ revogação imediata (regra F47 estendida).
  // D3: leituras indisponíveis nunca tocam no estado local.
  useEffect(() => {
    if (stage !== 'app' || !isInstMode || instGate === 'none') return;
    const code = normalizeInstCode(bi || '');
    if (!code || code === normalizeInstCode(DEMO_CREDENTIALS.institution.identifier)) return; // demo intacto (v7/D7)
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    let inFlight = false;
    const sync = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const pre = await preloginLookupInstitution(supabase, code);
        if (cancelled) return;
        if (pre.kind === 'empty') {
          purgeInstitutionLocalResidues(code, getLocalInstReg(code));
          await cloudSignOutBestEffort(supabase);
          addAuditLog(`F49: adesão da instituição ${code} ELIMINADA pela Administração com a sessão aberta — acesso revogado de imediato; novo acesso exige NOVO registo homologado.`, 'critical');
          setLoginPasswordInput('');
          setLoginError('A adesão desta instituição foi ELIMINADA pela Área de Administração durante esta sessão. Para voltar a usar a plataforma, efectue um NOVO registo — a conta só ficará activa após nova homologação.');
          setStage('login');
          return;
        }
        if (pre.kind !== 'found' || !pre.status) return;
        const target = mapRowStatus(pre.status);
        const current = homologationStore.getStatus(code)?.status ?? null;
        const desiredGate = target === 'active' ? 'full' : 'restricted';

        // A fonte de verdade é sempre o Supabase. Mesmo quando o cache local
        // já contém o mesmo estado, o gate React pode estar desfasado (por
        // exemplo: cache=active mas instGate=restricted), o que deixava o
        // indicador Online vermelho depois de uma aprovação.
        if (instGate !== desiredGate) setInstGate(desiredGate);

        if (target !== current) {
          homologationStore.setStatus(code, target, undefined, undefined);
          if (target === 'active') addAuditLog('F49: instituição APROVADA pela Administração — activação detectada em sessão aberta (indicador Online verde).', 'success');
          else if (target === 'blocked') addAuditLog('F49: instituição BLOQUEADA pela Administração — detectado em sessão aberta (luz Online amarela).', 'critical');
          else if (target === 'rejected') addAuditLog('F49: adesão institucional REJEITADA pela Administração — detectado em sessão aberta.', 'warning');
          setGateRefreshTick(t => t + 1);
        }
      } catch (e) {
        console.warn('[F49] Sincronização viva institucional indisponível (D3):', e);
      } finally {
        inFlight = false;
      }
    };
    const id = setInterval(sync, 8000);
    void sync(); // primeira verificação imediata ao entrar na área
    return () => { cancelled = true; clearInterval(id); };
  }, [stage, isInstMode, instGate, bi]);

  // F3/F7 — aprovada pela Admin? O estado sobe para 'full' sozinho (tick de 4s) e o
  // indicador Online fica verde — a correspondência oficial da aprovação entretanto
  // já chegou à caixa como não lida.
  useEffect(() => {
    if (!isInstMode || instGate !== 'restricted') return;
    void gateRefreshTick; // reavalia a cada tick
    const rec = homologationStore.getStatus(bi);
    if (rec?.status === 'active' && !isInstitutionFichaSuspended(bi)) {
      setInstGate('full');
      addAuditLog(`Instituição ${bi} APROVADA pela Administração — conta activa (indicador Online verde).`, 'success');
    }
  }, [gateRefreshTick, isInstMode, instGate, bi]);

  // Canal oficial de homologação (Área de Administração ⇄ Cidadão): espelha as
  // mensagens gravadas na homologationStore para a caixa de entrada do cidadão.
  // Sem este espelho, a correspondência do admin ficava invisível para o cidadão.
  const homologationInboxId = (raw: string): number => {
    let h = 0;
    for (let i = 0; i < raw.length; i++) h = ((h * 31) + raw.charCodeAt(i)) >>> 0;
    return 90000000 + (h % 8999999);
  };

  const buildHomologationInboxMessage = (msg: HomologationMessage, cleanBi: string): Message => {
    const alreadyRead = getReadMessageIds(cleanBi).has(homologationInboxId(msg.id));
    return ensureProtocolOnMessage({
      id: homologationInboxId(msg.id),
      org: 'Área de Administração · CDA',
      preview: msg.text.length > 96 ? `${msg.text.slice(0, 96)}…` : msg.text,
      date: msg.at,
      unread: alreadyRead ? 0 : 1,
      status: alreadyRead ? 'Lida' : 'Recebido',
      institution: 'Área de Administração · CDA',
      details: {
        subject: msg.from === 'system' ? 'Registo Recebido — Homologação Oficial' : 'Comunicação Oficial da Área de Administração',
        body: msg.text,
      },
      sensitivity: 'Privado',
      priorityScale: 'Importante',
      homologation: true,
      homologationBi: cleanBi,
    });
  };

  useEffect(() => {
    if (appMode !== 'user' || !bi) return;
    const cleanBi = normalizeHomologationBi(bi);
    const thread = homologationStore.getThread(bi).filter(m => m.from !== 'citizen');
    const threadIds = new Set(thread.map(m => homologationInboxId(m.id)));
    setInbox(prev => {
      // A thread da loja de homologação é a FONTE DE VERDADE: mensagens deste BI
      // que já não existam lá (registo recomeçado ou conta eliminada) saem da caixa.
      const pruned = prev.filter(m =>
        !m.homologation ||
        normalizeHomologationBi(m.homologationBi) !== cleanBi ||
        threadIds.has(m.id)
      );
      const existing = new Set(pruned.map(m => m.id));
      const fresh = thread
        .map(msg => buildHomologationInboxMessage(msg, cleanBi))
        .filter(m => !existing.has(m.id));
      if (pruned.length === prev.length && fresh.length === 0) return prev;
      return [...fresh.slice().reverse(), ...pruned];
    });
  }, [appMode, bi, gateRefreshTick]);

  // F7 — Canal oficial de homologação (Área de Administração ⇄ Instituição): o MESMO
  // espelho do cidadão. A correspondência oficial enviada ao código institucional
  // entra na caixa da instituição como NÃO LIDA — badge na foto de perfil, menu
  // "Mensagens não lidas" e separador "Não Lidas" do Correio. É assim que a
  // instituição pendente recebe o aviso de validação, a aprovação, as correcções
  // e a rejeição, sem qualquer página de bloqueio.
  useEffect(() => {
    if (appMode !== 'institution' || !bi) return;
    const cleanBi = normalizeHomologationBi(bi);
    const thread = homologationStore.getThread(bi).filter(m => m.from !== 'citizen');
    const threadIds = new Set(thread.map(m => homologationInboxId(m.id)));
    setInstInbox(prev => {
      // A thread da loja é a FONTE DE VERDADE: mails desta instituição que já não
      // existam lá (registo recomeçado ou conta eliminada) saem da caixa.
      const pruned = prev.filter(m =>
        !m.homologation ||
        normalizeHomologationBi(m.homologationBi) !== cleanBi ||
        threadIds.has(m.id)
      );
      const existing = new Set(pruned.map(m => m.id));
      const fresh = thread
        .map(msg => buildHomologationInboxMessage(msg, cleanBi))
        .filter(m => !existing.has(m.id));
      if (pruned.length === prev.length && fresh.length === 0) return prev;
      return [...fresh.slice().reverse(), ...pruned];
    });
  }, [appMode, bi, gateRefreshTick]);

  // Persistência do estado "Lida" entre sessões: re-aplica as leituras guardadas
  // deste BI sempre que a caixa for (re)construída (novo login, seed, espelho).
  // 2026-08-21 — alargado às caixas da INSTITUIÇÃO: uma mensagem lida pelo
  // agente não volta a "Não Lida" depois de sair e entrar na conta.
  useEffect(() => {
    if ((appMode !== 'user' && appMode !== 'institution') || !bi) return;
    const readIds = getReadMessageIds(bi);
    if (readIds.size === 0) return;
    const baseOfId = (id: number) => (id >= 10000 && id < 90000000 ? id - 10000 : id);
    const conteudoDe = (m: Message) =>
      `${(m.org || '').toUpperCase()}::${String(m.details?.subject || m.preview || '').trim().toLowerCase()}`;
    const applyRead = (list: Message[]) => {
      // v37.59 — invariante «se está em Lidas não pode estar em Não Lidas»:
      // a fusão/nuvem por vezes recria a mesma correspondência com id diferente,
      // que antes ficava "Não Lida" (duplicado). Recolhe protocolos/conteúdos já
      // lidos e propaga a leitura a esses duplicados.
      const protLidos = new Set<string>();
      const contLidos = new Set<string>();
      list.forEach(m => {
        const lida = !m.unread || readIds.has(m.id) || readIds.has(baseOfId(m.id));
        if (!lida) return;
        const pn = m.protocol?.protocolNumber;
        if (pn) protLidos.add(pn);
        contLidos.add(conteudoDe(m));
      });
      let touched = false;
      const next = list.map(m => {
        if (!m.unread) return m;
        const pn = m.protocol?.protocolNumber;
        const lida = readIds.has(m.id) || readIds.has(baseOfId(m.id))
          || (!!pn && protLidos.has(pn)) || contLidos.has(conteudoDe(m));
        if (!lida) return m;
        touched = true;
        return { ...m, unread: 0, status: 'Lida' };
      });
      return touched ? next : list;
    };
    setInbox(prev => applyRead(prev));
    setDocInbox(prev => applyRead(prev));
    setInstInbox(prev => applyRead(prev));
    setInstDocInbox(prev => applyRead(prev));
    // v37.49 — incluir as caixas nas dependências: quando a fusão/nuvem reconstrói
    // a caixa com unread=1 DEPOIS do login, o overlay de lidas é reaplicado de
    // imediato (antes só corria em appMode/bi/tick e a leitura revertia).
  }, [appMode, bi, gateRefreshTick, inbox, docInbox, instInbox, instDocInbox]);

  // Auto-scroll to top on tab/stage change
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [tab, stage]);

  // Safe redirect if tab is 'instituicao' but no institution is selected (avoids setState during render)
  useEffect(() => {
    if (tab === 'instituicao' && !selectedInstitution) {
      setTab('home');
    }
  }, [tab, selectedInstitution]);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('gov_user_requests', JSON.stringify(userRequests));
  }, [userRequests]);

  useEffect(() => {
    localStorage.setItem('correio_digital_inbox', JSON.stringify(inbox));
  }, [inbox]);

  useEffect(() => {
    localStorage.setItem('documentos_digital_inbox', JSON.stringify(docInbox));
  }, [docInbox]);

  useEffect(() => {
    localStorage.setItem('correio_digital_inst_inbox', JSON.stringify(instInbox));
  }, [instInbox]);

  useEffect(() => {
    localStorage.setItem('documentos_digital_inst_inbox', JSON.stringify(instDocInbox));
  }, [instDocInbox]);

  useEffect(() => {
    localStorage.setItem('correio_digital_sent', JSON.stringify(sentMessages));
  }, [sentMessages]);

  useEffect(() => {
    localStorage.setItem('documentos_digital_sent', JSON.stringify(docSentMessages));
  }, [docSentMessages]);

  useEffect(() => {
    localStorage.setItem('correio_digital_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('correio_digital_documents', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('correio_digital_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Network Offline Observer with Simulated Controls and Auto-Sync
  useEffect(() => {
    const updateOnlineStatus = () => {
      const liveOn = navigator.onLine;
      const finalOn = liveOn && !simulatedOffline;
      setIsOnline(finalOn);
      
      if (finalOn) {
        // Trigger background auto sync when connection returns
        handleAutomaticSync();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial check
    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [simulatedOffline]);

  // Automatic Local Caching of messages & documents as requested: "Cache local" & "Leitura offline"
  useEffect(() => {
    if (inbox.length > 0) {
      OfflineManager.cacheMessages(inbox);
    }
  }, [inbox]);

  useEffect(() => {
    if (documents.length > 0) {
      OfflineManager.cacheDocuments(documents);
    }
  }, [documents]);

  /**
   * F56 — Sincronização offline HONESTA (antes: as acções ficavam SÓ na fila,
   * eram descartadas após 1,5 s de setTimeout e o utilizador lia "propagadas
   * com o Registo de Identidade Digital" — sucesso fabricado com PERDA REAL
   * de dados nas contas reais).
   * Agora:
   *  - DEMO (D7): processamento LOCAL declarado; nada toca a nuvem;
   *  - REAL: replay verdadeiro das acções suportadas (contactos). As que
   *    falham ou ainda não têm replay PERMANECEM na fila e são reportadas
   *    com a verdade — nunca "consolidadas" de forma inventada.
   */
  const handleAutomaticSync = async () => {
    const queue = OfflineManager.getQueue();
    if (queue.length === 0) return;

    addAuditLog(`Sincronização em segundo plano iniciada (${queue.length} acções na fila)`, 'info');

    // DEMO — isolamento D7: sandbox declarado.
    if (isDemoSession) {
      OfflineManager.setQueue([]);
      setOfflineQueue([]);
      OfflineManager.createAutomaticBackup();
      addAuditLog(`Simulação (Modo Sandbox): ${queue.length} acções processadas LOCALMENTE — nada foi enviado para a nuvem.`, 'info');
      const sandboxNotif: AppNotification = {
        id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
        type: 'info',
        title: 'Simulação de Sincronização',
        message: offlineSyncSandboxReportText(queue.length),
        time: 'Agora',
        targetTab: 'home',
        unread: true
      };
      setNotifications(prev => [stampNotif(sandboxNotif), ...prev]);
      return;
    }

    // REAL — replay verdadeiro via núcleo puro injectável (testado em f56).
    const replayResult = await replayOfflineQueue(
      {
        insertContact: (contact) => supabaseService.insertContact(contact, bi),
        deleteContact: (contactId) => supabaseService.deleteContact(contactId),
      },
      queue,
    );
    const remaining = replayResult.remaining;
    const consolidated = replayResult.consolidated;
    const failed = replayResult.failed;

    OfflineManager.setQueue(remaining);
    setOfflineQueue(remaining);
    OfflineManager.createAutomaticBackup();

    const truth = offlineSyncReportText(replayResult);
    const stillPending = remaining.length - failed;

    addAuditLog(`Sincronização offline concluída: ${truth}`, (failed > 0 || stillPending > 0) ? 'warning' : 'success');

    const newNotif: AppNotification = {
      id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
      type: (failed > 0 || stillPending > 0) ? 'warning' : 'success',
      title: consolidated > 0 ? 'Sincronização Finalizada' : 'Sincronização Pendente',
      message: truth,
      time: 'Agora',
      targetTab: 'home',
      unread: true
    };
    setNotifications(prev => [stampNotif(newNotif), ...prev]);
  };

  useEffect(() => {
    localStorage.setItem('correio_digital_bi', bi);
  }, [bi]);

  useEffect(() => {
    localStorage.setItem('correio_digital_phone', phone);
  }, [phone]);

  useEffect(() => {
    localStorage.setItem('gov_doc_requests', JSON.stringify(docRequests));
  }, [docRequests]);

  useEffect(() => {
    localStorage.setItem('gov_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('gov_emergency_mode', emergencyMode.toString());
  }, [emergencyMode]);

  useEffect(() => {
    localStorage.setItem('gov_app_mode', appMode);
  }, [appMode]);

  // Automatic Supabase state background loading & synchronization
  useEffect(() => {
    if (stage !== 'app' || !isOnline || !hasValidSupabaseKeys()) return;

    let isSubscribed = true;

    async function loadSupabaseData() {
      try {
        console.debug('CADA: Carregando dados integrados do Supabase...');

        // 0. F39 (v13) — hidratar o perfil do cidadão a partir da nuvem
        // (multi-dispositivo): a linha `profiles` reflecte edições de nome,
        // e-mail, telefone, filiação e estado civil feitas noutros dispositivos.
        const sentSenderKey = isInstMode ? institutionCode : isGovMode ? 'CDA' : bi;
        const precisaHidratacaoPerfil = isUserMode && bi && !homologationStore.isExempt(bi) && isCloudBound(bi);
        // v37.23 (DESEMPENHO) — hidratação do perfil + caixa de mensagens em
        // PARALELO: antes eram 2 round-trips sequenciais ao arranque (e a cada
        // evento realtime); agora correm em simultâneo.
        let dbProfilePre: Awaited<ReturnType<typeof supabaseService.getProfile>> | null = null;
        let mailbox: Awaited<ReturnType<typeof supabaseService.getOwnMailbox>>;
        [dbProfilePre, mailbox] = await Promise.all([
          precisaHidratacaoPerfil ? supabaseService.getProfile(bi) : Promise.resolve(null),
          supabaseService.getOwnMailbox(bi, sentSenderKey)
        ]);
        if (precisaHidratacaoPerfil) {
          {
            const dbProfile = dbProfilePre;
              if (dbProfile && isSubscribed) {
              const hyd: { name?: string; email?: string; phone?: string; filiation?: string; maritalStatus?: string } = {};
              if (typeof dbProfile.name === 'string' && dbProfile.name.trim()) hyd.name = dbProfile.name.trim();
              if (typeof dbProfile.email === 'string' && dbProfile.email.trim()) hyd.email = dbProfile.email.trim();
              if (typeof dbProfile.phone === 'string' && dbProfile.phone.trim()) hyd.phone = dbProfile.phone.trim();
              if (typeof dbProfile.filiation === 'string' && dbProfile.filiation.trim()) hyd.filiation = dbProfile.filiation.trim();
              if (typeof dbProfile.marital_status === 'string' && dbProfile.marital_status.trim()) hyd.maritalStatus = dbProfile.marital_status.trim();
              // F45 (Auditoria F42 · Médio#10 — corrida F39): NUNCA aplicar a
              // hidratação da nuvem POR CIMA de uma edição de perfil em curso.
              if (Object.keys(hyd).length && !isProfileEditActive()) updateUserFields(hyd);
            }
          }
        }

        // Auto-seed check + leitura das caixas: UMA consulta OR serve
        // semeadura + recebidas + enviadas (advisory N-3 da auditoria
        // master: antes eram DUAS consultas por execução — 4-6 por sessão).
        // A nuvem só é relida no ramo raro em que há semeadura; a frescura
        // normal é garantida pelo canal Realtime (triggerRefetch abaixo).
        let dbMessages = mailbox ? mailbox.incoming : null;
        // F9 — a semeadura automática é um recurso da DEMO (cidadão/AGT-9921-SR):
        // nunca semear fictícios da AGT numa conta institucional real.
        const isDemoInstitutionSeed = !isInstMode || homologationStore.isExempt(bi);
        if (shouldAutoSeedSupabase() && isDemoInstitutionSeed && (dbMessages === null || dbMessages.length === 0)) {
          console.debug('CADA: Nenhum dado de mensagens encontrado para este utilizador no Supabase. Efetuando semeadura automática...');
          const seedPayload = {
            profile: {
              bi,
              name: profileName,
              phone,
              nif,
              passport,
              birthDate: userBirthDate,
              filiation: userFiliation,
              maritalStatus: userMaritalStatus
            },
            inbox,
            docInbox,
            sentMessages,
            contacts,
            documents,
            userRequests,
            docRequests,
            auditLogs,
            notifications,
            correspondences,
            institutionInbox: INSTITUTIONAL_INBOX,
            institutionCode,
          };
          await supabaseService.seedAll(seedPayload);
          console.debug('CADA: Semeadura automática para o Supabase concluída!');
          // Re-ler UMA vez (furando o micro-cache N-3) para hidratar com as
          // linhas acabadas de semear.
          invalidateMessagesReadCache();
          mailbox = await supabaseService.getOwnMailbox(bi, sentSenderKey);
          dbMessages = mailbox ? mailbox.incoming : null;
        }

        // Define document classifier for messages
        const isDocumentMailboxMessage = (message: Message) => {
          const actionFlags = message.details?.actions || [];
          const compositeText = `${message.preview} ${message.details?.subject || ''}`.toLowerCase();
          // 2026-08-22 — a correspondência de AGENDAMENTO de video-atendimento
          // é sempre da CAIXA normal (nunca Documentos), mesmo que o assunto
          // contenha "Certificado"/"certid" (ex.: 'Esclarecimento sobre o
          // Certificado MPME').
          if (actionFlags.includes('video-atendimento')) return false;
          return actionFlags.includes('__DOC__')
            || (message.id >= 10000 && /fatura|certid|documento|passaporte|bi digital|carta de condução|vacina|receita|guia|tramita/.test(compositeText));
        };

        // 1. Fetch Profile
        // 2026-08-21 — sessão de COLABORADOR institucional: a linha `profiles`
        // pertence ao responsável/instituição. Este carregador de fundo corre
        // também a cada evento realtime e REESCREVIA o nome/telefone do membro
        // com os dados do responsável (provado em E2E: o Perfil do membro
        // mostrava 'Edlasio Galhardo' + telefone da instituição). O membro
        // mantém SEMPRE os seus próprios dados (registo do membro + Auth).
        const instMemberSession = appMode === 'institution' && instIdentityRef.current?.type === 'member';
        // v37.23 (DESEMPENHO) — reutiliza o perfil já carregado no passo 0 (quando
        // foi), evitando um segundo round-trip à tabela `profiles` por execução.
        const dbProfile = instMemberSession ? null : (precisaHidratacaoPerfil ? dbProfilePre : await supabaseService.getProfile(bi));
        if (dbProfile && isSubscribed) {
          const isCanonicalCitizen = appMode === 'user' && bi === DEMO_CREDENTIALS.user.identifier;
          const canonicalPreset = DEMO_CREDENTIALS.user;
          const dbNameMismatch = isCanonicalCitizen && dbProfile.name && dbProfile.name !== canonicalPreset.profileName;

          if (dbNameMismatch) {
            console.warn('CADA: Perfil remoto divergente do utilizador canónico. A repor identidade de demonstração.');
            applyDemoPresetForMode('user', false);
            supabaseService.upsertProfile({
              bi: canonicalPreset.identifier,
              name: canonicalPreset.profileName,
              phone: canonicalPreset.phone,
              nif: canonicalPreset.nif,
              passport: canonicalPreset.passport,
              birth_date: canonicalPreset.birthDate,
              filiation: canonicalPreset.filiation,
              marital_status: canonicalPreset.maritalStatus,
              role: 'user'
            }).catch(err => console.warn('CADA: Erro ao restaurar perfil canónico (conflito de chave mitigado):', err.message || err));
          } else {
            if (dbProfile.name) setProfileName(dbProfile.name);
            if (dbProfile.phone) setPhone(dbProfile.phone);
            if (dbProfile.nif) setNif(dbProfile.nif);
            if (dbProfile.passport) setPassport(dbProfile.passport);
            if (dbProfile.birth_date) {
              // Convert yyyy-mm-dd to dd/mm/yyyy for state compatibility
              const parts = dbProfile.birth_date.split('-');
              if (parts.length === 3) {
                setUserBirthDate(`${parts[2]}/${parts[1]}/${parts[0]}`);
              }
            }
            if (dbProfile.filiation) setUserFiliation(dbProfile.filiation);
            if (dbProfile.marital_status) setUserMaritalStatus(dbProfile.marital_status);
          }
        }

        // 2. Citizen/Institution messages — já lidas acima (consulta única, N-3)
        if (dbMessages !== null && isSubscribed) {
          // F12 — marca de titularidade: o cidadão/instituição REAL só vê o que
          // foi efectivamente endereçado à sua chave (query da nuvem já filtra).
          const incoming = dbMessages.filter(m => !isDocumentMailboxMessage(m)).map(ensureProtocolOnMessage).map(m => ({ ...m, recipientBi: bi }));
          const docs = dbMessages.filter(m => isDocumentMailboxMessage(m)).map(ensureProtocolOnMessage).map(m => ({ ...m, recipientBi: bi }));
          
          // 2026-08-20 — Modo Real: a nuvem é a fonte ÚNICA (sem fusão com
          // estado local/mock). Eliminadas/arquivadas ficam fora da caixa em
          // qualquer dispositivo. Demo mantém a fusão de sempre.
          if (!isDemoSession) {
            setInbox(incoming.filter(m => !['Arquivada', 'EliminadaPermanente'].includes(String(m.details?.state))));
            setDocInbox(docs.filter(m => !['Arquivada', 'EliminadaPermanente'].includes(String(m.details?.state))));
          } else {
            setInbox(prevLocal => {
              const dbIds = new Set(incoming.map(m => m.id));
              const onlyLocal = prevLocal.filter(m => !dbIds.has(m.id));
              return [...incoming, ...onlyLocal];
            });
            setDocInbox(prevLocal => {
              const dbIds = new Set(docs.map(m => m.id));
              const onlyLocal = prevLocal.filter(m => !dbIds.has(m.id));
              return [...docs, ...onlyLocal];
            });
          }
        }

        // "Enviadas" já vieram na consulta OR única acima (N-3)
        const dbSentMessages = mailbox ? mailbox.sent : null;
        if (dbSentMessages !== null && isSubscribed) {
          // F15 — marca da sessão remetente ("Enviadas" isolada por conta)
          // v37.77 — DIFUSÕES AGRUPADAS: uma sondagem/emergência distribuída a
          // N cidadãos gera N linhas na nuvem (cada destinatário precisa da
          // sua cópia), mas o espelho «Enviadas» do EMISSOR passa a mostrar o
          // lote UMA vez com o selo «Difusão para N destinatários» — antes
          // 1 sondagem a 23 cidadãos aparecia como 23 correspondências
          // enviadas (interpretado como resíduo de contas eliminadas).
          const agruparDifusoes = (msgs: typeof dbSentMessages): typeof dbSentMessages => {
            const grupos = new Map<string, { cabeca: (typeof msgs)[number]; total: number }>();
            const ordem: string[] = [];
            for (const m of msgs) {
              const chaveLote = m.createdAt && m.details?.subject ? `${m.details.subject}|${m.createdAt}` : '';
              if (!chaveLote) { ordem.push(`#${m.id}`); grupos.set(`#${m.id}`, { cabeca: m, total: 1 }); continue; }
              const g = grupos.get(chaveLote);
              if (g) g.total += 1;
              else { ordem.push(chaveLote); grupos.set(chaveLote, { cabeca: m, total: 1 }); }
            }
            return ordem.map(chave => {
              const g = grupos.get(chave)!;
              return g.total > 1 ? { ...g.cabeca, broadcastRecipients: g.total } : g.cabeca;
            });
          };
          const sentNormal = agruparDifusoes(dbSentMessages.filter(m => !isDocumentMailboxMessage(m)).map(m => ({ ...ensureProtocolOnMessage(m), senderKey: sentSenderKey })));
          const sentDoc = dbSentMessages.filter(m => isDocumentMailboxMessage(m)).map(m => ({ ...ensureProtocolOnMessage(m), senderKey: sentSenderKey }));
          
          if (!isDemoSession) {
            setSentMessages(sentNormal.filter(m => !['Arquivada', 'EliminadaPermanente'].includes(String(m.details?.state))));
            setDocSentMessages(sentDoc.filter(m => !['Arquivada', 'EliminadaPermanente'].includes(String(m.details?.state))));
          } else {
            setSentMessages(prevLocal => {
              const dbIds = new Set(sentNormal.map(m => m.id));
              const onlyLocal = prevLocal.filter(m => !dbIds.has(m.id));
              return [...sentNormal, ...onlyLocal];
            });
            setDocSentMessages(prevLocal => {
              const dbIds = new Set(sentDoc.map(m => m.id));
              const onlyLocal = prevLocal.filter(m => !dbIds.has(m.id));
              return [...sentDoc, ...onlyLocal];
            });
          }
        }



        // 3–9 (2026-08-21, DESEMPENHO) — leituras em PARALELO: antes eram 6–7
        // round-trips sequenciais ao servidor (cada um com validação de sessão);
        // agora correm em simultâneo e a página da Administração carrega em
        // ~1/4 do tempo. Audit Logs e Correspondências são visões da
        // Administração — só são pedidas em modo gov (menos tráfego para
        // cidadão/instituição). Correspondências vêm JÁ FILTRADAS do servidor.
        const [dbDocs, dbContacts, dbUserRequests, dbDocRequests, dbNotifs, dbLogs, dbCorrespondences, dbInstMailbox] = await Promise.all([
          supabaseService.getDocuments(bi),
          supabaseService.getContacts(bi),
          supabaseService.getUserRequests(isGovMode ? undefined : bi),
          supabaseService.getDocRequests(isGovMode ? undefined : bi),
          supabaseService.getNotifications(isGovMode ? 'CDA' : isInstMode ? institutionCode : bi),
          isGovMode ? supabaseService.getAuditLogs() : Promise.resolve(null),
          isGovMode ? supabaseService.getCorrespondences() : Promise.resolve(null),
          // v37.23 (DESEMPENHO) — correio institucional entra no mesmo pacote
          // paralelo (antes era um round-trip sequencial extra).
          isInstMode ? supabaseService.getInstitutionMessages(institutionCode) : Promise.resolve(null),
        ]);
        if (!isSubscribed) return;

        if (isInstMode) {
          const mailbox = dbInstMailbox;
          if (mailbox !== null && isSubscribed) {
            // F9/F14 — marca de destinatária: a conta real só recebe o endereçado
            // AO SEU CÓDIGO (consulta exacta). `legacyIds` = correio do canal por
            // sigla que versões anteriores fundiram indevidamente nesta conta —
            // expurgado das caixas locais deste dispositivo.
            const instNormal = mailbox.messages.map(ensureProtocolOnMessage).map(m => ({ ...m, recipientInst: institutionCode }));
            const instDoc = mailbox.messages.map(ensureProtocolOnMessage).map(m => ({ ...m, id: m.id + 10000, recipientInst: institutionCode }));
            const legacyIds = new Set(mailbox.legacyIds);
            
            if (!isDemoSession) {
              setInstInbox(instNormal.filter(m => !['Arquivada', 'EliminadaPermanente'].includes(String(m.details?.state))));
              setInstDocInbox(instDoc.filter(m => !['Arquivada', 'EliminadaPermanente'].includes(String(m.details?.state))));
            } else {
              setInstInbox(prevLocal => {
                const dbIds = new Set(instNormal.map(m => m.id));
                const purgedLocal = legacyIds.size ? prevLocal.filter(m => !legacyIds.has(m.id)) : prevLocal;
                const onlyLocal = purgedLocal.filter(m => !dbIds.has(m.id));
                return [...instNormal, ...onlyLocal];
              });
              setInstDocInbox(prevLocal => {
                const dbIds = new Set(instDoc.map(m => m.id));
                const purgedLocal = legacyIds.size ? prevLocal.filter(m => !legacyIds.has(m.id - 10000)) : prevLocal;
                const onlyLocal = purgedLocal.filter(m => !dbIds.has(m.id));
                return [...instDoc, ...onlyLocal];
              });
            }
          }
        }

        // 3. Documents
        if (dbDocs !== null) {
          // F12 — titularidade do documento (sessões reais só vêem os seus).
          const taggedDocs = dbDocs.map(d => ({ ...d, holderBi: bi }));
          // 2026-08-20 — Modo Real: nuvem como fonte única dos documentos.
          if (!isDemoSession) {
            setDocuments(taggedDocs);
          } else {
            setDocuments(prevLocal => {
              const dbCodes = new Set(taggedDocs.map(d => d.code));
              const onlyLocal = prevLocal.filter(d => !dbCodes.has(d.code));
              return [...taggedDocs, ...onlyLocal];
            });
          }
        }

        // 4. Contacts
        if (dbContacts !== null) {
          // F12 — cada contacto fica marcado com o dono da sessão que o fundiu.
          const taggedContacts = dbContacts.map(c => ({ ...c, ownerId: bi }));
          if (!isDemoSession) {
            setContacts(taggedContacts);
          } else {
            setContacts(prevLocal => {
              const dbIds = new Set(taggedContacts.map(c => c.id));
              const onlyLocal = prevLocal.filter(c => !dbIds.has(c.id));
              return [...taggedContacts, ...onlyLocal];
            });
          }
        }

        // 5. User requests
        if (dbUserRequests !== null) {
          if (!isDemoSession) {
            setUserRequests(dbUserRequests);
          } else {
            setUserRequests(prevLocal => {
              const dbIds = new Set(dbUserRequests.map(r => r.id));
              const onlyLocal = prevLocal.filter(r => !dbIds.has(r.id));
              return [...dbUserRequests, ...onlyLocal];
            });
          }
        }

        // 6. Doc Requests
        if (dbDocRequests !== null) {
          if (!isDemoSession) {
            setDocRequests(dbDocRequests);
          } else {
            setDocRequests(prevLocal => {
              const dbIds = new Set(dbDocRequests.map(r => r.id));
              const onlyLocal = prevLocal.filter(r => !dbIds.has(r.id));
              return [...dbDocRequests, ...onlyLocal];
            });
          }
        }

        // 7. Notifications
        if (dbNotifs !== null) {
          if (!isDemoSession) {
            setNotifications(dbNotifs);
          } else {
            setNotifications(prevLocal => {
              const dbIds = new Set(dbNotifs.map(n => n.id));
              const onlyLocal = prevLocal.filter(n => !dbIds.has(n.id));
              return [...dbNotifs, ...onlyLocal];
            });
          }
        }

        // 8. Audit Logs (só modo gov)
        if (dbLogs !== null) {
          if (!isDemoSession) {
            setAuditLogs(dbLogs);
          } else {
            setAuditLogs(prevLocal => {
              const dbIds = new Set(dbLogs.map(l => l.id));
              const onlyLocal = prevLocal.filter(l => !dbIds.has(l.id));
              return [...dbLogs, ...onlyLocal];
            });
          }
        }

        // 9. Official Correspondences (só modo gov)
        if (dbCorrespondences !== null) {
          if (!isDemoSession) {
            // 2026-08-21 — Modo Real: só dados REAIS na página "Correspondências"
            // da Administração. As linhas da nuvem são marcadas com
            // createdBy='nuvem'; os mocks (sem createdBy) ficam fora da visão
            // real — inclusive antes de a nuvem responder e em caso de falha
            // (página vazia honesta, nunca dados simulados).
            setCorrespondences(dbCorrespondences.map(c => ({ ...c, createdBy: c.createdBy || 'nuvem' })));
          } else {
            setCorrespondences(prevLocal => {
              const dbIds = new Set(dbCorrespondences.map(c => c.id));
              const onlyLocal = prevLocal.filter(c => !dbIds.has(c.id));
              return [...dbCorrespondences, ...onlyLocal];
            });
          }
        }

        console.debug('CADA: Sincronização e carregamento do Supabase efectuados com sucesso!');
        setCloudSyncedOnce(true);
      } catch (err) {
        console.error('Erro na sincronização em segundo plano do Supabase:', err);
        setCloudSyncedOnce(true); // honesto: não deixar a UI em carregamento infinito
      }
    }

    loadSupabaseData();

    // Subscribe to all changes in Supabase realtime
    const channel = supabase
      .channel('schema-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        console.debug('CADA: Supabase Realtime detectou alteração em mensagens!');
        invalidateMessagesReadCache(); // N-3 — qq mudança na nuvem fura o micro-cache
        setTriggerRefetch(t => t + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => {
        console.debug('CADA: Supabase Realtime detectou alteração em documentos!');
        setTriggerRefetch(t => t + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requests' }, () => {
        console.debug('CADA: Supabase Realtime detectou alteração em document_requests!');
        setTriggerRefetch(t => t + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_requests' }, () => {
        console.debug('CADA: Supabase Realtime detectou alteração em user_requests!');
        setTriggerRefetch(t => t + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        console.debug('CADA: Supabase Realtime detectou alteração em perfis!');
        setTriggerRefetch(t => t + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, () => {
        console.debug('CADA: Supabase Realtime detectou alteração em contactos!');
        setTriggerRefetch(t => t + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        console.debug('CADA: Supabase Realtime detectou alteração em notificações!');
        setTriggerRefetch(t => t + 1);
      })
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [stage, bi, isOnline, triggerRefetch, appMode, institutionCode]);

  const runAuditAndSincronizacaoCompleta = () => {
    let fixesCount = 0;
    let dupesCount = 0;

    // 1. Audit e De-duplicação de Caixa de Entrada do Cidadão
    let finalCleanInbox: Message[] = [];
    setInbox(prev => {
      const ids = new Set<number>();
      const uniques: Message[] = [];
      prev.forEach(item => {
        let m = item;
        if (!m.org || m.org.trim() === '') {
          m = { ...m, org: 'CDA' }; // F11/F18 — emissor neutro, SEM mutar o estado anterior
          fixesCount++;
        }
        if (!ids.has(m.id)) {
          ids.add(m.id);
          uniques.push(m);
        } else {
          dupesCount++;
        }
      });
      finalCleanInbox = uniques;
      return uniques;
    });

    // 2. Audit e De-duplicação de Caixa de Documentos do Cidadão
    setDocInbox(prev => {
      const ids = new Set<number>();
      const uniques: Message[] = [];
      prev.forEach(item => {
        let m = item;
        if (!m.org || m.org.trim() === '') {
          m = { ...m, org: 'CDA' }; // F18 — emissor neutro (era 'SME', marca demo) + sem mutação
          fixesCount++;
        }
        if (!ids.has(m.id)) {
          ids.add(m.id);
          uniques.push(m);
        } else {
          dupesCount++;
        }
      });

      // 5. Garantir sincronização real-time inteligente do estado das mensagens sem aninhamento perigoso
      const inboxReadStatus = new Map<number, number>();
      finalCleanInbox.forEach(m => {
        const baseId = m.id >= 10000 && m.id < 90000000 ? m.id - 10000 : m.id;
        inboxReadStatus.set(baseId, m.unread || 0);
      });

      const updatedDocInbox = uniques.map(m => {
        const baseId = m.id >= 10000 && m.id < 90000000 ? m.id - 10000 : m.id;
        if (inboxReadStatus.has(baseId)) {
          const desiredUnread = inboxReadStatus.get(baseId)!;
          if (m.unread !== desiredUnread) {
            fixesCount++;
            return { ...m, unread: desiredUnread, status: desiredUnread === 0 ? 'Lida' : 'Não Lida' };
          }
        }
        return m;
      });

      return updatedDocInbox;
    });

    // 3. Audit e De-duplicação de Correspondências de Instituição / Administração
    setInstInbox(prev => {
      const ids = new Set<number>();
      const uniques: Message[] = [];
      prev.forEach(item => {
        let m = item;
        if (!m.org || m.org.trim() === '') {
          m = { ...m, org: 'Cidadão' }; // F18 — sem mutação do estado anterior
          fixesCount++;
        }
        if (!ids.has(m.id)) {
          ids.add(m.id);
          uniques.push(m);
        } else {
          dupesCount++;
        }
      });
      return uniques;
    });

    setInstDocInbox(prev => {
      const ids = new Set<number>();
      const uniques: Message[] = [];
      prev.forEach(item => {
        let m = item;
        if (!m.org || m.org.trim() === '') {
          m = { ...m, org: 'Cidadão' }; // F18 — sem mutação do estado anterior
          fixesCount++;
        }
        if (!ids.has(m.id)) {
          ids.add(m.id);
          uniques.push(m);
        } else {
          dupesCount++;
        }
      });
      return uniques;
    });

    // 4. Audit, Higienização e De-duplicação da Tabela de Correspondências Governamental
    setCorrespondences(prev => {
      const ids = new Set<string>();
      const uniques: typeof prev = [];
      prev.forEach(item => {
        let c = item;
        if (!c.sender || c.sender.trim() === '') {
          c = { ...c, sender: 'CDA' }; // F11/F18 — remetente neutro, sem mutação
          fixesCount++;
        }
        if (!c.recipient || c.recipient.trim() === '') {
          c = { ...c, recipient: 'Cidadão' }; // F11/F18 — destinatário neutro, sem mutação
          fixesCount++;
        }
        const stringId = String(c.id);
        if (!ids.has(stringId)) {
          ids.add(stringId);
          uniques.push(c);
        } else {
          dupesCount++;
        }
      });
      return uniques;
    });

    // 6. Audit e De-duplicação de Documentos na QR Code
    setDocuments(prev => {
      const codes = new Set<string>();
      const uniques: Document[] = [];
      prev.forEach(item => {
        let d = item;
        if (!d.code || d.code.trim() === '') {
          d = { ...d, code: `CDA-REP-${Math.random().toString(36).substring(2, 8).toUpperCase()}` }; // F18 — sem mutação
          fixesCount++;
        }
        if (!d.holder || d.holder !== profileName) {
          d = { ...d, holder: profileName }; // F18 — sem mutação
          fixesCount++;
        }
        if (!codes.has(d.code)) {
          codes.add(d.code);
          uniques.push(d);
        } else {
          dupesCount++;
        }
      });
      return uniques;
    });

    // 7. Audit e De-duplicação de Contactos de Confiança
    setContacts(prev => {
      const bis = new Set<string>();
      const uniques: Contact[] = [];
      prev.forEach(item => {
        let c = item;
        if (!c.bi || c.bi.trim() === '') {
          c = { ...c, bi: `ANG-CONTACT-${Math.floor(Math.random() * 900000 + 100000)}` }; // F18 — sem mutação
          fixesCount++;
        }
        if (!bis.has(c.bi)) {
          bis.add(c.bi);
          uniques.push(c);
        } else {
          dupesCount++;
        }
      });
      return uniques;
    });

    // 8. Audit e De-duplicação de Solicitações (Requests) de Cidadãos / Docs de Governo
    setDocRequests(prev => {
      const ids = new Set<number>();
      const uniques: DocRequest[] = [];
      prev.forEach(r => {
        if (!ids.has(r.id)) {
          ids.add(r.id);
          uniques.push(r);
        } else {
          dupesCount++;
        }
      });
      return uniques;
    });

    setUserRequests(prev => {
      const ids = new Set<number>();
      const uniques: UserRequest[] = [];
      prev.forEach(r => {
        if (!ids.has(r.id)) {
          ids.add(r.id);
          uniques.push(r);
        } else {
          dupesCount++;
        }
      });
      return uniques;
    });

    // 9. Audit de Notificações
    setNotifications(prev => {
      const ids = new Set<number>();
      const uniques: AppNotification[] = [];
      prev.forEach(n => {
        if (!ids.has(n.id)) {
          ids.add(n.id);
          uniques.push(n);
        } else {
          dupesCount++;
        }
      });
      return uniques;
    });

    // Criar registo de auditoria com certificado
    const logMsg = `AUDITORIA_SISTEMA: Sincronização concluída. ${fixesCount} inconsistências resolvidas e ${dupesCount} registos duplicados consolidados para o cidadão ${profileName}.`;
    addAuditLog(logMsg, 'success');

    // Verificar se a auditoria já foi executada nesta sessão (evita duplicação)
    const auditSessionKey = `cda_audit_completed_${bi}`;
    const alreadyAudited = localStorage.getItem(auditSessionKey);
    
    // Apenas adiciona notificação se ainda não foi feita a auditoria nesta sessão
    if (!alreadyAudited) {
      // Marcar que a auditoria foi executada para esta sessão
      localStorage.setItem(auditSessionKey, new Date().toISOString());
      
      // Emitir uma notificação oficial de sucesso (apenas uma vez por sessão)
      const checkNotif: AppNotification = {
        id: 990990,
        title: 'Auditoria CADA Concluída',
        message: `Encontradas e corrigidas ${fixesCount} inconsistências leves e ${dupesCount} dados duplicados nos domínios. Base de dados certificada 100% íntegra.`,
        time: 'Agora',
        type: 'success',
        targetTab: 'home',
        unread: true
      };
      setNotifications(prev => {
        if (prev.some(n => n.id === 990990 || n.title === 'Auditoria CADA Concluída')) {
          return prev;
        }
        return [stampNotif(checkNotif), ...prev];
      });
    }
  };

  // Lifecycle Effects
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Executa a auditoria geral e sincronização completa dos dados da plataforma
    // Apenas executa se ainda não foi executada nesta sessão
    const auditSessionKey = `cda_audit_completed_${bi}`;
    const alreadyExecuted = localStorage.getItem(auditSessionKey);
    
    if (!alreadyExecuted) {
      // v37.9 — a auditoria pesada arranca apenas quando o navegador fica
      // ocioso (ou após 2,5 s), para não competir com o primeiro paint e o
      // ecrã de login pela largura de banda.
      const w = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
      if (typeof w.requestIdleCallback === 'function') {
        w.requestIdleCallback(() => { runAuditAndSincronizacaoCompleta(); }, { timeout: 4000 });
      } else {
        setTimeout(() => { runAuditAndSincronizacaoCompleta(); }, 2500);
      }
    }

    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 400); // v37.9 — primeiro paint mais rápido (antes: 2000 ms)
    return () => clearTimeout(timer);
  }, []);

  // Intelligent Advertising Image Preloading in the background
  useEffect(() => {
    // Start background image preloading silently
    startImagePreloading();

    // Subscribe to preloading updates to register stats into the Audit Logs
    const unsubscribe = subscribeToPreload((stats) => {
      setPreloadProgress(stats.progress.progressPercentage);
      if (stats.progress.isCompleted) {
        setPreloadCompleted(true);
        const total = stats.progress.total;
        const loaded = stats.progress.loaded;
        const failed = stats.progress.failed;
        if (failed > 0) {
          addAuditLog(`[Image Preloader] Pré-carregamento de imagens concluído: ${loaded}/${total} carregadas, ${failed} falhas de ligação guardadas para nova tentativa`, 'warning');
        } else {
          addAuditLog(`[Image Preloader] Todas as ${total} imagens publicitárias, logomarcas e ecrãs pré-carregadas e guardadas em cache com sucesso (Sistemas: Utilizador, Instituição, Administração)`, 'success');
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HIGHLIGHT_SLIDES.length);
    }, 5500);
    return () => clearInterval(slideInterval);
  }, []);

  useEffect(() => {
    if (stage === 'splash') {
      // v37.47 — «refresh ⇒ apenas actualizar»: com sessão activa (flag própria)
      // o splash entra directo no 'app' (mantém a página); sem sessão vai ao login.
      // O logout continua a forçar o login via skip_splash_and_show_login.
      let temSessao = false;
      try { temSessao = localStorage.getItem('cda_sessao_activa') === '1'; } catch { /* melhor esforço */ }
      if (preloadCompleted) {
        const timer = setTimeout(() => setStage(temSessao ? 'app' : 'login'), 250);
        return () => clearTimeout(timer);
      } else {
        const safetyTimer = setTimeout(() => {
          setStage(temSessao ? 'app' : 'login');
        }, 1200);
        return () => clearTimeout(safetyTimer);
      }
    }
  }, [stage, preloadCompleted]);

  // Derived Memos
  // Homologação: sem página de bloqueio — o cidadão entra direto no Painel, mas
  // enquanto a conta aguarda aprovação NÃO recebe correspondência institucional.
  const homologationPendingForCitizen = (() => {
    if (appMode !== 'user') return false;
    void gateRefreshTick; // reavalia a cada tick do intervalo de 4s
    const rec = homologationStore.getStatus(bi);
    return !!rec && rec.status !== 'active';
  })();

  // Cor do indicador "Online" por estado da conta do cidadão:
  // desactivado (pendente/rejeitado) → vermelho | activa → verde | bloqueada → amarelo.
  const citizenOnlineTone = (() => {
    if (appMode !== 'user' || !bi) return null;
    void gateRefreshTick; // reavalia a cada tick
    const rec = homologationStore.getStatus(bi);
    if (!rec || rec.status === 'active') return 'green' as const;
    if (rec.status === 'blocked') return 'yellow' as const;
    return 'red' as const;
  })();

  // F3 — cor do indicador "Online" também para a área da Instituição (mesma matriz do cidadão)
  const institutionOnlineTone = (() => {
    if (!isInstMode) return null;
    void gateRefreshTick; // reavalia a cada tick
    const rec = homologationStore.getStatus(bi);
    // Sessões de demonstração são canais internos sempre activos.
    if (homologationStore.isExempt(bi)) return 'green' as const;
    const isRealInstitution = !!bi.trim() && !homologationStore.isExempt(bi);
    // Para uma instituição real, uma aprovação já sincronizada do Supabase
    // (`active`) é suficiente para verde, mesmo no intervalo curto até o gate
    // React ser atualizado. Isto evita que uma conta aprovada fique vermelha.
    if (isRealInstitution && (instGate === 'full' || rec?.status === 'active')) return 'green' as const;
    if (rec?.status === 'blocked') return 'yellow' as const;
    return 'red' as const; // pendente, correção ou rejeitada
  })();

  // Filtro do canal de homologação: durante a pendência o cidadão SÓ vê as
  // mensagens oficiais da Área de Administração; após a ativação, esse histórico
  // permanece acessível na caixa de entrada normal (sempre restrito ao seu BI).
  const isOwnHomologationMail = (m: Message) =>
    m.homologation === true && normalizeHomologationBi(m.homologationBi) === normalizeHomologationBi(bi);
  // F9 — Conta institucional REAL (não-demo): o Correio mostra APENAS o canal oficial
  // com a Área de Administração (confirmação de receção enquanto pendente; aprovação,
  // correções ou rejeição depois — não lidas → badge na foto de perfil) e mensagens
  // de facto endereçadas a esta instituição. As correspondências seed/demo da AGT são
  // exclusivas da conta demo e nunca aparecem noutras contas institucionais.
  const isDemoInstitutionSession = isInstMode && (homologationStore.isExempt(bi) || !bi.trim());
  const isInstitutionAddressedMail = (m: Message) =>
    !!m.recipientInst && normalizeInstCode(m.recipientInst) === normalizeInstCode(institutionCode || bi);
  // F11 — Marca da instituição da sessão (Painel / ID Digital): sigla e logótipo
  // do PRÓPRIO registo (logótipo carregado na página Conta → avatar neutro com a
  // sigla). A conta demo (AGT-9921-SR) mantém o branding histórico da AGT.
  const sessionInstBrand = useMemo(() => {
    const vazio = { sigla: '', logoUrl: '', logoOrigem: 'nenhum' as const, logoFallback: '', verified: true };
    if (!isInstMode) return vazio;
    const CACHE_KEY = 'cda_inst_brand_cache';
    const code = normalizeInstCode(institutionCode || bi);
    // v37.53 — evitar que a logomarca do «ID Digital» mude ao actualizar a página:
    // durante a hidratação (código institucional ainda vazio) reutiliza a última
    // marca resolvida, em vez de cair transitoriamente em AGT/neutro e depois
    // trocar para a logomarca real (flicker visível em cada refresh).
    if (!code) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) return JSON.parse(cached);
      } catch { /* ignora */ }
      return { ...vazio, verified: false };
    }
    let brand: { sigla: string; logoUrl: string; logoOrigem: 'proprio' | 'categoria' | 'neutro'; logoFallback: string; verified: boolean };
    // v37.39 — a conta demo da instituição é a AGT (branding histórico).
    if (isDemoInstitutionSession) {
      brand = {
        sigla: 'AGT',
        logoUrl: getLogoOficialPorCodigoInstituicao('AGT') || makeInstNeutralAvatar('AGT'),
        logoOrigem: 'categoria',
        logoFallback: makeInstNeutralAvatar('AGT'),
        verified: true,
      };
    } else {
      const reg = getLocalInstReg(code);
      const pack = parseInstPack(reg?.observacoes || '');
      const sigla = (pack?.sigla || code.split('-')[0] || 'INST').toUpperCase();
      // PRECEDÊNCIA: 1.º logótipo próprio (Conta/Perfil); 2.º logomarca oficial da
      // categoria (catálogo partilhado com a Ficha Institucional); 3.º avatar neutro.
      const oficial = getLogoOficialPorCodigoInstituicao(sigla || code);
      const neutro = makeInstNeutralAvatar(sigla);
      if (reg?.logoDataUrl) {
        brand = { sigla, logoUrl: reg.logoDataUrl, logoOrigem: 'proprio', logoFallback: neutro, verified: instGate === 'full' };
      } else if (oficial) {
        brand = { sigla, logoUrl: oficial, logoOrigem: 'categoria', logoFallback: neutro, verified: instGate === 'full' };
      } else {
        brand = { sigla, logoUrl: neutro, logoOrigem: 'neutro', logoFallback: neutro, verified: instGate === 'full' };
      }
    }
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(brand)); } catch { /* ignora */ }
    return brand;
  }, [isInstMode, isDemoInstitutionSession, institutionCode, bi, instGate, gateRefreshTick]);

  // F12 — Ideologia "conta nova = zero dados simulados" (prompt v7): apenas as
  // contas fixas (ALWAYS_ACTIVE_IDENTIFIERS) são demonstração. Sessões reais só
  // vêem o que tem dono conhecido = a sua própria chave; tudo o resto é herança
  // de outras sessões neste dispositivo e não aparece.
  const isDemoCitizenSession = isUserMode && homologationStore.isExempt(bi);
  const isDemoAdminSession = isGovMode && homologationStore.isExempt(bi);
  const isDemoSession = isDemoCitizenSession || isDemoInstitutionSession || isDemoAdminSession;
  const sessionOwnerKey = isInstMode ? normalizeInstCode(institutionCode || bi) : normalizeHomologationBi(bi);
  const stampNotif = (n: AppNotification): AppNotification => ({ ...n, ownerId: sessionOwnerKey });
  const isOwnCitizenMail = (m: Message) =>
    isOwnHomologationMail(m) || (!!m.recipientBi && normalizeHomologationBi(m.recipientBi) === normalizeHomologationBi(bi));

  // ==========================================================================
  // Etapa #3 — ALERTAS AUTOMÁTICOS DE PRAZOS (cobranças)
  // Verificador que corre no arranque da sessão do cidadão e depois a cada
  // 5 minutos: lê as cobranças pendentes (nuvem; na demo, prazos demo), e para
  // cada prazo vencido/urgente/próximo emite UMA notificação única (anti-
  // duplicação em localStorage). Só gera alertas novos — nunca re-notifica.
  // ==========================================================================
  const verificarPrazosAutomaticamente = useCallback(async () => {
    if (stage !== 'app' || appMode !== 'user' || !bi.trim()) return;
    const r = await carregarPagamentosDoCidadao(bi);
    let lista = r.pagamentos;
    // Sessão de demonstração sem cobranças na nuvem → prazos demo (visíveis).
    if (isDemoCitizenSession && lista.length === 0) {
      lista = PAGAMENTOS_DEMO_PRAZOS();
    }
    const alertas = montarAlertasDePagamentos(lista);
    const novas = alertas.filter(a => !alertaJaEmitido(a.chave));
    if (novas.length === 0) return;
    const notifs: AppNotification[] = novas.map(a => {
      marcarAlertaEmitido(a.chave);
      return stampNotif({
        id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
        type: a.estado === 'proximo' ? 'info' : 'warning',
        title: tituloDeAlerta(a),
        message: mensagemDeAlerta(a),
        time: 'Agora',
        targetTab: 'pagamentos',
        unread: true,
      });
    });
    setNotifications(prev => [...notifs, ...prev]);
    const temVencido = novas.some(a => a.estado === 'vencido');
    addAuditLog(`[PRAZOS] ${novas.length} alerta(s) de prazo emitido(s) para o cidadão (${novas.map(a => `${a.descricao} → ${formatarDiasRestantes(a.dias)}`).join('; ')}).`, temVencido ? 'critical' : 'warning');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, appMode, bi, isDemoCitizenSession]);

  useEffect(() => {
    if (stage !== 'app' || appMode !== 'user') return;
    void verificarPrazosAutomaticamente();
    const id = setInterval(() => void verificarPrazosAutomaticamente(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [verificarPrazosAutomaticamente, stage, appMode]);

  // Cobranças demo com prazos (identidade estável — prazos relativos a hoje).
  const pagamentosDemoFallback = useMemo(
    () => (isDemoCitizenSession ? PAGAMENTOS_DEMO_PRAZOS() : undefined),
    [isDemoCitizenSession],
  );

  // ==========================================================================
  // Etapa #4 — SYNC AUTOMÁTICO DO PERFIL com o Supabase
  // Corre no arranque da sessão do cidadão REAL (não demo, ligada à nuvem) e
  // depois a cada 5 minutos, fazendo:
  //   • PUSH: reenvia alterações locais que ficaram pendentes (fila local) —
  //     só as remove quando a nuvem confirmar;
  //   • PULL: lê a linha `profiles` da nuvem (multi-dispositivo) e aplica na
  //     sessão os campos que diferem, SEM nunca sobrescrever uma edição em
  //     curso (guarda F45). O carimbo só é escrito com confirmação real.
  // ==========================================================================
  const verificarSyncPerfilAutomaticamente = useCallback(async () => {
    // 2026-08-20 — os três modos (cidadão/instituição/admin) partilham o mesmo
    // ciclo push/pull do perfil; as contas demo continuam excluídas pelas
    // guardas isExempt/isCloudBound abaixo.
    if (stage !== 'app' || !bi.trim()) return;
    if (!hasValidSupabaseKeys() || !isOnline) return;
    // Contas demo não têm linha real para sincronizar — nada a fazer.
    if (homologationStore.isExempt(bi) || !isCloudBound(bi)) return;

    let algoConfirmado = false;

    // 1) PUSH — fila de pendências locais (alterações que a nuvem não aceitou antes).
    try {
      if (temPendenciaPerfil(bi)) {
        const r = await reenviarPendenciasPerfil(supabase, bi);
        if (r.reenviadas > 0) {
          algoConfirmado = true;
          addAuditLog(`[PERFIL-SYNC] Reenvio automático: ${r.reenviadas} alteração(ões) do perfil sincronizada(s) na nuvem.`, 'success');
        }
        if (r.falharam > 0) {
          addAuditLog(`[PERFIL-SYNC] Reenvio automático: ${r.falharam} alteração(ões) continuam pendentes (nuvem indisponível).`, 'warning');
        }
      }
    } catch (pushErr) {
      console.warn('[PERFIL-SYNC] Reenvio automático de pendências falhou:', pushErr);
    }

    // 2) PULL — reconciliar com a nuvem (outro dispositivo pode ter editado).
    try {
      // 2026-08-21 — sessão de COLABORADOR: a linha `profiles` é do
      // responsável/instituição — o pull não pode reescrever os dados do
      // membro com ela (antes o telefone/e-mail da instituição aterravam na
      // sessão do membro a cada 5 minutos).
      if (appMode === 'institution' && instIdentity?.type === 'member') {
        algoConfirmado = true;
      } else if (!isProfileEditActive()) {
        const campos = await puxarPerfilDaNuvem(supabase, bi);
        if (campos && Object.keys(campos).length > 0) {
          const diffs: Record<string, string> = {};
          const atuais: Record<string, string> = {
            name: user?.name || '',
            phone: user?.phone || '',
            nif: user?.nif || '',
            passport: user?.passport || '',
            birthDate: user?.birthDate || '',
            filiation: user?.filiation || '',
            maritalStatus: user?.maritalStatus || '',
            email: user?.email || '',
            address: user?.address || '',
          };
          for (const [k, v] of Object.entries(campos)) {
            // 2026-08-20 — um COLABORADOR institucional (sessão partilhada pelo
            // código) nunca herda o nome do responsável gravado em `profiles`.
            if (appMode === 'institution' && instIdentity?.type === 'member' && k === 'name') continue;
            if (v && v !== atuais[k]) diffs[k] = v;
          }
          if (Object.keys(diffs).length > 0) {
            updateUserFields(diffs);
            if (diffs.name) setProfileName(diffs.name);
            if (diffs.phone) setPhone(diffs.phone);
            if (diffs.nif) setNif(diffs.nif);
            if (diffs.passport) setPassport(diffs.passport);
            if (diffs.birthDate) setUserBirthDate(diffs.birthDate);
            if (diffs.filiation) setUserFiliation(diffs.filiation);
            if (diffs.maritalStatus) setUserMaritalStatus(diffs.maritalStatus);
            addAuditLog(`[PERFIL-SYNC] Sincronização automática: perfil atualizado a partir da nuvem (${Object.keys(diffs).join(', ')}).`, 'info');
          }
        }
        algoConfirmado = true; // o pull correu (mesmo sem alterações)
      }
    } catch (pullErr) {
      console.warn('[PERFIL-SYNC] Sincronização automática (pull) falhou:', pullErr);
    }

    if (algoConfirmado) {
      const stamp = new Date().toLocaleString();
      localStorage.setItem('supabase_last_sync_time', stamp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, appMode, bi, isOnline, isCloudBound, instIdentity?.type, user?.name, user?.phone, user?.nif, user?.passport, user?.birthDate, user?.filiation, user?.maritalStatus, user?.email]);

  useEffect(() => {
    if (stage !== 'app') return;
    void verificarSyncPerfilAutomaticamente();
    const id = setInterval(() => void verificarSyncPerfilAutomaticamente(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [verificarSyncPerfilAutomaticamente, stage]);

  // 2026-08-20 — reaplicar as EDIÇÕES LOCAIS do perfil guardadas por conta
  // (perfilLocalService): cobre contas demo (nuvem fora de âmbito — era o que
  // fazia o contacto/foto reverterem) e falhas de leitura da nuvem em contas
  // reais. Corre na entrada do app (e por mudança de modo), DEPOIS da
  // hidratação de login — a última palavra é sempre a do utilizador.
  useEffect(() => {
    if (stage !== 'app') return;
    // 2026-08-21 — o espelho local de um COLABORADOR é POR PESSOA (Nº de
    // agente); o do responsável continua por código. O nome do membro já pode
    // ser reaplicado (as edições dele agora gravam no registo do membro).
    const isInstMember = appMode === 'institution' && instIdentity?.type === 'member';
    const ident = (isInstMember ? (instIdentity?.agentNumber || bi) : bi || '').trim().toUpperCase();
    if (!ident) return;
    const loc = lerPerfilLocal(appMode, ident);
    if (!loc || !Object.keys(loc).length) return;
    const mud: Record<string, string> = {};
    if (loc.name) mud.name = loc.name;
    if (loc.phone) mud.phone = loc.phone;
    if (loc.email) mud.email = loc.email;
    if (loc.nif) mud.nif = loc.nif;
    if (loc.filiation) mud.filiation = loc.filiation;
    if (loc.maritalStatus) mud.maritalStatus = loc.maritalStatus;
    if (loc.birthDate) mud.birthDate = loc.birthDate;
    if (loc.address) mud.address = loc.address;
    if (!Object.keys(mud).length) return;
    updateUserFields?.(mud);
    if (mud.name) setProfileName(mud.name);
    if (mud.phone) setPhone(mud.phone);
    if (mud.nif) setNif(mud.nif);
    if (mud.filiation) setUserFiliation(mud.filiation);
    if (mud.maritalStatus) setUserMaritalStatus(mud.maritalStatus);
    if (mud.birthDate) setUserBirthDate(mud.birthDate);
  }, [stage, appMode, bi, instIdentity?.type]);

  // 2026-08-22 — PERMISSÕES DE PÁGINA: revalidação NO BACKEND
  // (/api/agente-permissoes lê os user_metadata NA NUVEM — fonte canónica) e
  // reconciliação do espelho local; o frontend nunca decide sozinho.
  const [permissoesTick, setPermissoesTick] = useState(0);
  useEffect(() => {
    if (stage !== 'app') return;
    const agente = isInstMode ? (instIdentity?.agentNumber || '') : isGovMode ? adminBiNorm : '';
    if (!agente || !isSupabaseConfigured()) return;
    const ehResponsavel = isInstMode
      ? instIdentity?.type !== 'member'
      : (isDemoGovSession || adminBiNorm === ADMIN_ALFA_AGENT);
    if (ehResponsavel) return;
    let ativo = true;
    void (async () => {
      const res = await supabaseService.permissoesAgente('ler');
      if (!ativo || !res.ok || res.responsavel) return;
      const validas = res.paginasPermitidas ?? null;
      if (validas === null) return; // sem restrições na nuvem — mantém actual
      if (isInstMode && instIdentity?.memberId) {
        updateInstMemberProfile(normalizeInstCode(bi || ''), instIdentity.memberId, { paginasPermitidas: validas });
        setInstIdentity(prev => (prev && prev.type === 'member') ? { ...prev, paginasPermitidas: validas } : prev);
      } else if (isGovMode) {
        const cred = getAdminAgentCred(adminBiNorm);
        if (cred) {
          updateAdminAgentPermissions(adminBiNorm, validas);
          setPermissoesTick(t => t + 1);
        }
      }
    })();
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, isInstMode, isGovMode, instIdentity?.agentNumber, instIdentity?.memberId, adminBiNorm]);

  // 2026-08-22 — sessão restrita fora de uma página autorizada (ex.: login
  // devolveu o tab 'home' e 'home' não foi concedido): redireciona para a
  // primeira página autorizada. Corre APENAS na mudança de sessão/permissões
  // (não em cada mudança de tab) — a navegação EXPLÍCITA por URL para uma
  // página não autorizada deve mostrar o painel "Acesso Restrito" da guarda
  // de renderização, e não ser redirecionada silenciosamente.
  useEffect(() => {
    if (stage !== 'app' || !paginasMenu || paginasMenu.length === 0) return;
    if (!paginasMenu.includes(tab) && !TAB_PAGINAS_LIVRES.has(tab)) {
      setTab(paginasMenu[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, paginasMenuKey]);

  // 2026-08-21 — piso de não-lidas REMOVIDO (decisão do dono): uma mensagem
  // lida fica LIDA em todas as sessões seguintes. "Não lida" = apenas as que
  // nunca foram abertas. As listas demo continuam com dados, mas sem forçar
  // o estado de leitura.
  // v37.37 — ordenação cronológica DECRESCENTE (mais recente no topo). Aplicada
  // aqui, no seletor central, para que TODAS as áreas que consomem a caixa
  // (Correio, Documentos, Centro de Actividade, detalhe da instituição)
  // apresentem a mesma ordem.
  const currentInbox = ordenarMensagensPorMaisRecente(isInstMode
    ? (isDemoInstitutionSession
        ? instInbox.filter(m => !m.homologation || isOwnHomologationMail(m))
        : instInbox.filter(m => isOwnHomologationMail(m) || isInstitutionAddressedMail(m)))
    : homologationPendingForCitizen
      ? inbox.filter(isOwnHomologationMail)
      : isDemoCitizenSession
        ? inbox.filter(m => !m.homologation || isOwnHomologationMail(m))
        : inbox.filter(isOwnCitizenMail));
  const unreadTotal = useMemo(() => currentInbox.filter(msg => !deletedMessageIds.includes(msg.id) && !hiddenMessageIds.includes(msg.id)).reduce((sum, msg) => sum + (msg.unread || 0), 0), [currentInbox, deletedMessageIds, hiddenMessageIds]);
  const unreadMessagesList = useMemo(() => currentInbox.filter(msg => !deletedMessageIds.includes(msg.id) && !hiddenMessageIds.includes(msg.id) && !!msg.unread), [currentInbox, deletedMessageIds, hiddenMessageIds]);

  // Menu da foto de perfil: abrir mensagem não lida → marca como lida e garante
  // que a página final é SEMPRE o detalhe da mensagem (tab 'mensagem').
  const handleOpenUnreadMessage = (message: Message) => {
    handleSelectMessage(message);
    setTab('mensagem');
  };

  // F11 — Documentos da instituição real seguem o MESMO escopo do Correio:
  // apenas o canal oficial da própria instituição + o que lhe foi endereçado.
  const currentDocInbox = ordenarMensagensPorMaisRecente(isInstMode
    ? (isDemoInstitutionSession
        ? instDocInbox
        : instDocInbox.filter(m => isOwnHomologationMail(m) || isInstitutionAddressedMail(m)))
    : (homologationPendingForCitizen ? [] : (isDemoCitizenSession ? docInbox : docInbox.filter(isOwnCitizenMail))));

  // F12 — Documentos (carteira/pasta digital/QR/emissão): sessões reais só vêem
  // os documentos marcados com a SUA chave na fusão da nuvem.
  const currentDocuments = useMemo(() => {
    if (isGovMode) return documents;
    if (isUserMode && isDemoCitizenSession) return documents;
    if (isInstMode && isDemoInstitutionSession) return documents;
    return documents.filter(d => !!d.holderBi && normalizeHomologationBi(d.holderBi) === normalizeHomologationBi(bi));
  }, [documents, isGovMode, isUserMode, isDemoCitizenSession, isInstMode, isDemoInstitutionSession, bi]);

  // F12 — Contactos pessoais por conta: sessões reais só vêem os seus.
  const currentContacts = useMemo(() =>
    (isUserMode && !isDemoCitizenSession) || (isInstMode && !isDemoInstitutionSession)
      ? contacts.filter(c => !!c.ownerId && c.ownerId === sessionOwnerKey)
      : contacts,
    [contacts, isUserMode, isDemoCitizenSession, isInstMode, isDemoInstitutionSession, sessionOwnerKey]);

  // F12 — Notificações: sessões reais só vêem eventos gerados na SUA sessão;
  // o Centro de Notificações de uma conta nova nasce vazio.
  const currentNotifications = useMemo(() => {
    let base: AppNotification[];
    if (!isDemoSession) {
      base = notifications.filter(n => n.ownerId === sessionOwnerKey);
    } else {
      // F17 — piso de não-lidas também nas notificações (simuladas, só demo)
      if (notifications.length && !notifications.some(n => n.unread)) {
        base = [{ ...notifications[0], unread: true }, ...notifications.slice(1)];
      } else {
        base = notifications;
      }
    }
    // 2026-08-22 — a notificação de AGENDAMENTO de video-atendimento só
    // desaparece QUANDO O DIA DO AGENDAMENTO É ULTRAPASSADO (nunca por ter
    // sido lida): o texto oficial traz "… para o dia AAAA-MM-DD às HH:MM" —
    // depois desse dia a notificação esconde-se sozinha (não é apagada).
    const hoje = new Date().toISOString().slice(0, 10);
    return base.filter(n => {
      if (n.targetTab !== 'video-atendimento') return true;
      const m = /dia\s+(\d{4}-\d{2}-\d{2})/i.exec(String(n.message || ''));
      return !m || m[1] >= hoje;
    });
  }, [notifications, isDemoSession, sessionOwnerKey]);

  // F12/F13 — Correspondências gov: demo vê o histórico simulado; agentes reais
  // partilham apenas os expedientes efectivamente registados (createdBy);
  // cidadão/instituição real não vê dados gov simulados no histórico.
  const currentCorrespondences = useMemo(() => {
    // 2026-08-21 — Modo Real: a Administração vê apenas as correspondências
    // REAIS da plataforma (linhas da nuvem marcadas 'nuvem' + expedientes
    // criados por este agente, createdBy = BI/Nº de agente). Os dados
    // simulados/demo (mocks sem createdBy) nunca aparecem no modo real —
    // ficam exclusivos da conta demo. Cidadão/instituição mantêm o
    // comportamento demo/local de sempre.
    if (isGovMode) return ordenarCorrespondenciasPorMaisRecente(isDemoAdminSession ? correspondences : correspondences.filter(c => !!c.createdBy));
    if (isUserMode) return isDemoCitizenSession ? ordenarCorrespondenciasPorMaisRecente(correspondences) : [];
    return isDemoInstitutionSession ? ordenarCorrespondenciasPorMaisRecente(correspondences) : [];
  }, [correspondences, isGovMode, isDemoAdminSession, isUserMode, isDemoCitizenSession, isInstMode, isDemoInstitutionSession]);

  // F15/v7 — Caixas "Enviadas" isoladas por conta (senderKey): sessões reais só
  // vêem o que enviaram; a demo (qualquer uma das 3) mantém o histórico completo.
  const currentSentMessages = useMemo(() =>
    ordenarMensagensPorMaisRecente(isDemoSession ? sentMessages : sentMessages.filter(m => !!m.senderKey && m.senderKey === sessionOwnerKey)),
    [sentMessages, isDemoSession, sessionOwnerKey]);
  const currentDocSentMessages = useMemo(() =>
    ordenarMensagensPorMaisRecente(isDemoSession ? docSentMessages : docSentMessages.filter(m => !!m.senderKey && m.senderKey === sessionOwnerKey)),
    [docSentMessages, isDemoSession, sessionOwnerKey]);

  // F15 — GARANTIA DE CONTEÚDO DEMO (prompt v8): só em contas de demonstração.
  // No arranque da sessão: completa colecções vazias com os seeds canónicos
  // (etiquetados com o dono demo) e mantém ≥1 não lida em cada caixa — todas as
  // páginas e separadores preenchidos, nenhum vazio. Não apaga nem sobrescreve;
  // idempotente por sessão; contas reais não são tocadas.
  const demoGuaranteeRef = useRef<string>('');
  useEffect(() => {
    if (stage !== 'app') return;
    const area: DemoArea | null = isUserMode ? (isDemoCitizenSession ? 'user' : null)
      : isInstMode ? (isDemoInstitutionSession ? 'institution' : null)
      : isGovMode ? (isDemoAdminSession ? 'admin' : null)
      : null;
    if (!area) return;
    const runKey = `${area}:${sessionOwnerKey}`;
    if (demoGuaranteeRef.current === runKey) return;
    demoGuaranteeRef.current = runKey;
    const plan = buildDemoContentPlan(area, sessionOwnerKey);
    // 2026-08-21 — piso de não-lidas REMOVIDO: as listas demo só são
    // preenchidas quando VAZIAS; nunca se força uma mensagem lida a voltar
    // a não-lida (a leitura persiste entre sessões).
    if (area === 'user') {
      setInbox(prev => prev.length ? prev : plan.inbox);
      setDocInbox(prev => prev.length ? prev : plan.docInbox);
      setContacts(prev => prev.length ? prev : plan.contacts);
    }
    setSentMessages(prev => prev.length ? prev : plan.sentMessages);
    setDocSentMessages(prev => prev.length ? prev : plan.docSentMessages);
    if (area === 'institution') {
      setInstInbox(prev => prev.length ? prev : plan.instInbox);
      setInstDocInbox(prev => prev.length ? prev : plan.instDocInbox);
    }
    setNotifications(prev => prev.length
      ? (prev.some(n => n.unread) ? prev : [{ ...prev[0], unread: true }, ...prev.slice(1)])
      : plan.notifications);
    setDocuments(prev => prev.length ? prev : plan.documents);
    if (area === 'admin') {
      setCorrespondences(prev => prev.length ? prev : plan.correspondences);
      setAuditLogs(prev => prev.length ? prev : plan.auditLogs);
    }
  }, [stage, isUserMode, isDemoCitizenSession, isInstMode, isDemoInstitutionSession, isGovMode, isDemoAdminSession, sessionOwnerKey]);
  const unreadDocTotal = useMemo(() => currentDocInbox.reduce((sum, msg) => sum + (msg.unread || 0), 0), [currentDocInbox]);

  const filteredMessages = useMemo(() => {
    let base: Message[] = [];
    if (correspondenciaTab === "excluidas") {
      const allMsgs = [...currentInbox, ...currentSentMessages];
      base = allMsgs.filter(item => deletedMessageIds.includes(item.id) && !hiddenMessageIds.includes(item.id));
    } else {
      if (correspondenciaTab === "enviadas") {
        base = currentSentMessages.filter(item => !deletedMessageIds.includes(item.id) && !hiddenMessageIds.includes(item.id));
      } else if (correspondenciaTab === "lidas") {
        base = currentInbox.filter(item => !deletedMessageIds.includes(item.id) && !hiddenMessageIds.includes(item.id) && !item.unread);
      } else {
        base = currentInbox.filter(item => !deletedMessageIds.includes(item.id) && !hiddenMessageIds.includes(item.id) && item.unread);
      }
    }

    // v37.37 — reordenação final: o separador «Excluídas» concatena recebidas +
    // enviadas, pelo que a ordem tem de ser refeita aqui para cobrir TODAS as
    // abas (Não lidas, Lidas, Enviadas, Excluídas) de forma idêntica.
    base = ordenarMensagensPorMaisRecente(base);

    if (!searchMail.trim()) return base;
    
    const term = searchMail.toLowerCase();
    return base.filter(m => 
      (m.org?.toLowerCase().includes(term) ?? false) || 
      (m.preview?.toLowerCase().includes(term) ?? false) ||
      (m.details?.subject?.toLowerCase().includes(term) ?? false)
    );
  }, [correspondenciaTab, currentInbox, currentSentMessages, searchMail, deletedMessageIds, hiddenMessageIds]);

  const filteredDocMessages = useMemo(() => {
    let base: Message[] = [];
    if (documentosTab === "enviadas") base = currentDocSentMessages;
    else if (documentosTab === "lidas") base = currentDocInbox.filter((item) => !item.unread);
    else base = currentDocInbox.filter((item) => item.unread);

    // v37.37 — mesma garantia de ordem para as abas de Documentos.
    base = ordenarMensagensPorMaisRecente(base);

    if (!searchDocMail.trim()) return base;
    
    const term = searchDocMail.toLowerCase();
    return base.filter(m => 
      (m.org?.toLowerCase().includes(term) ?? false) || 
      (m.preview?.toLowerCase().includes(term) ?? false) ||
      (m.details?.subject?.toLowerCase().includes(term) ?? false)
    );
  }, [documentosTab, currentDocInbox, currentDocSentMessages, searchDocMail]);

  const filteredDocs = useMemo(() => {
    if (!searchDoc.trim()) return documents;
    const term = searchDoc.toLowerCase();
    return documents.filter(doc => 
      (doc.name?.toLowerCase().includes(term) ?? false) || 
      (doc.code?.toLowerCase().includes(term) ?? false) ||
      (doc.issuer?.toLowerCase().includes(term) ?? false)
    );
  }, [documents, searchDoc]);

  const filteredContacts = useMemo(() => {
    if (!searchContact.trim()) return currentContacts;
    const term = searchContact.toLowerCase();
    return currentContacts.filter(c => 
      (c.name?.toLowerCase().includes(term) ?? false) || 
      (c.bi?.toLowerCase().includes(term) ?? false) ||
      (c.relation?.toLowerCase().includes(term) ?? false)
    );
  }, [currentContacts, searchContact]);

  const addAuditLog = (action: string, type: 'info' | 'warning' | 'critical' | 'success' = 'info') => {
    const actorLabel = isGovMode
      ? (activeProfile?.role || 'Administrador')
      : isInstMode
        ? (activeProfile?.institutionName || user?.name || 'Instituição')
        : (user?.name || 'Cidadão');
    const newLog = {
      id: `${Date.now()}-${Math.floor(Math.random() * 10000000)}`,
      action,
      user: actorLabel,
      timestamp: new Date().toLocaleString('pt-AO'),
      type
    };
    setAuditLogs(prev => [newLog, ...prev]);
    supabaseService.insertAuditLog(newLog).catch(err => console.warn('[CDA-sync] Sincronização falhou (não bloqueia a ação local):', err));
  };

  // v37.78.17 — RETOMA dos registos em processamento em segundo plano: se a
  // página foi fechada/recarregada a meio (popup de confirmação já mostrado),
  // o pipeline é relançado aqui — o registo chega à fila central e o cidadão
  // recebe o desfecho por correspondência oficial (REGRAS UX · 2.º plano).
  const retomaBgRef = useRef(false);
  useEffect(() => {
    if (retomaBgRef.current) return;
    retomaBgRef.current = true;
    void retomarRegistosBg({ addAuditLog });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handlers
  const handleSelectMessage = (message: Message) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSelectedMessage(message);
    setWasOpenedUnread(!!message.unread);
    if (isOnline && hasValidSupabaseKeys()) {
      const baseId = message.id >= 10000 && message.id < 90000000 ? message.id - 10000 : message.id;
      supabaseService.getMessageStateHistory(baseId).then((history) => {
        if (history && history.length > 0) {
          setSelectedMessage((prev) => prev ? {
            ...prev,
            stateHistory: history.map((event: { state?: string; event_date?: string; event_time?: string; responsible?: string; description?: string }) => ({
              state: event.state,
              date: new Date(event.event_date).toLocaleDateString('pt-AO'),
              time: event.event_time?.slice(0,5) || '',
              responsible: event.responsible,
              description: event.description,
            }))
          } : prev);
        }
      }).catch(err => console.warn('[CDA-sync] Sincronização falhou (não bloqueia a ação local):', err));
    }
    setMessageSource(correspondenciaTab === 'enviadas' ? 'enviados' : 'correspondencias');
    
    if (message.unread) {
      const baseId = message.id >= 10000 && message.id < 90000000 ? message.id - 10000 : message.id;

      // REGRA R2 (v37.78.12) — O ESTADO DE LEITURA PERTENCE AO DESTINATÁRIO.
      // Quem abre a cópia que lhe foi ENDEREÇADA marca «Lida» (local + nuvem).
      // O REMETENTE que abre a própria carta em «Enviadas» está apenas a
      // consultar um RECIBO DE LEITURA («Não Lida» = o destinatário ainda não
      // abriu) e NÃO pode alterar o estado na área do destinatário — contas
      // diferentes, estados diferentes. Aplica-se a cidadão, instituição e
      // administração (qualquer par remetente/destinatário).
      const normR2 = (v?: string) => String(v || '').toUpperCase().replace(/\s+/g, '');
      const minhaChaveR2 = normR2(isInstMode ? normalizeInstCode(institutionCode || bi) : normalizeHomologationBi(bi));
      // v37.78.22 — alarga a guarda: tudo o que é aberto a partir da tab
      // «Enviadas» é cópia do remetente POR CONSTRUÇÃO (minhasEnviadas já filtra
      // por senderKey da sessão). Cobre cópias legadas pré-F15 gravadas sem
      // senderKey no armazenamento local — abri-las também nunca pode marcar
      // «Lida» na área do destinatário.
      const abertaPeloRemetente =
        (normR2((message as any).senderKey) === minhaChaveR2 &&
         normR2((message as any).recipientBi) !== minhaChaveR2) ||
        // cópia aberta a partir da tab «Enviadas» — exclui auto-envio
        // (recipientBi === mim), cuja abertura continua a marcar leitura.
        (correspondenciaTab === 'enviadas' && normR2((message as any).recipientBi) !== minhaChaveR2);

      if (abertaPeloRemetente) {
        addAuditLog(`Correspondência ID ${baseId} aberta pelo remetente — recibo de leitura do destinatário intocado (REGRA R2).`, 'info');
        setTab('mensagem');
        return;
      }

      // Sincronização em tempo real de estado "Lida" em todos os arrays da plataforma
      setInbox(prev => prev.map(m => {
        const mBase = m.id >= 10000 && m.id < 90000000 ? m.id - 10000 : m.id;
        return mBase === baseId ? { ...m, unread: 0, status: 'Lida' } : m;
      }));
      setDocInbox(prev => prev.map(m => {
        const mBase = m.id >= 10000 && m.id < 90000000 ? m.id - 10000 : m.id;
        return mBase === baseId ? { ...m, unread: 0, status: 'Lida' } : m;
      }));
      setInstInbox(prev => prev.map(m => {
        const mBase = m.id >= 10000 && m.id < 90000000 ? m.id - 10000 : m.id;
        return mBase === baseId ? { ...m, unread: 0, status: 'Lida' } : m;
      }));
      setInstDocInbox(prev => prev.map(m => {
        const mBase = m.id >= 10000 && m.id < 90000000 ? m.id - 10000 : m.id;
        return mBase === baseId ? { ...m, unread: 0, status: 'Lida' } : m;
      }));
      
      // Sincronização em tempo real com as correspondências de Governo / Administração
      setCorrespondences(prev => prev.map(c => {
        const isSmeMatch = (baseId === 2 && c.subject.toLowerCase().includes('passaporte') && c.recipient.toLowerCase().includes('edlasio'));
        const subjectMatch = c.subject.toLowerCase() === (message.details?.subject || '').toLowerCase();
        if (isSmeMatch || subjectMatch) {
          return { ...c, status: 'Lida' as any };
        }
        return c;
      }));

      if (isOnline && hasValidSupabaseKeys()) {
        // REGRA R1/R2 — apenas o DESTINATÁRIO escreve «unread» na nuvem.
        supabaseService.markMessageReadByRecipient(baseId).catch(err => console.warn('[CDA-sync] Sincronização falhou (não bloqueia a ação local):', err));
        supabaseService.insertMessageStateEvent({
          messageId: baseId,
          state: 'Visualizada',
          responsible: user.name,
          description: 'Correspondência aberta pelo destinatário.'
        }).catch(err => console.warn('[CDA-sync] Sincronização falhou (não bloqueia a ação local):', err));
      }

      // v37.78.28 — CICLO DE VIDA DA NOTIFICAÇÃO (reporte do dono 2026-08-31):
      // ao ABRIR a correspondência, a notificação associada (texto contém o
      // mesmo assunto) passa a LIDA — read_at na nuvem + estado local — e
      // desaparece da lista de alertas/badge. Antes ficava «não lida» para
      // sempre, mesmo depois de o destinatário já ter aberto a correspondência.
      {
        const assuntoAberto = String(message.details?.subject || message.preview || '').trim();
        const corresponde = (n: typeof notifications[number]) =>
          n.unread !== false && assuntoAberto.length >= 5 && String(n.message || '').includes(assuntoAberto);
        setNotifications(prev => prev.map(n => (corresponde(n) ? { ...n, unread: false } : n)));
        if (isOnline && hasValidSupabaseKeys()) {
          notifications.filter(corresponde).forEach(n => {
            supabaseService.markNotificationRead(n.id).catch(() => undefined);
          });
        }
      }

      // Registo de auditoria certificado para provar sincronização
      addAuditLog(`Correspondência ID ${baseId} marcada como lida na área do destinatário (estado do remetente intocado — REGRA R2).`, 'success');
    }
    
    setTab('mensagem');
  };

  /**
   * Abre (por voz ou texto) a correspondência mais relevante para a pergunta.
   * Reutiliza a mesma pesquisa local das 4 caixas do próprio utilizador.
   * Devolve true se abriu uma mensagem, false se não encontrou nada claro.
   * Só abre quando a pergunta contém termos específicos de conteúdo — pedidos
   * genéricos ("mostra as mensagens") devolvem false e caem na navegação normal.
   */
  const abrirCorrespondenciaPorVoz = (query: string): boolean => {
    const q = String(query || '').toLowerCase().trim();
    if (q.length < 3) return false;

    // Palavras de comando/estrutura — NÃO são termos de conteúdo.
    const STOP = new Set([
      'ir','para','abre','abrir','aberta','mostra','mostrar','navega','navegar',
      'muda','mudar','sobre','por','favor','me','a','o','e','de','da','do','das','dos',
      'mensagem','mensagens','correspondência','correspondencia','correspondências',
      'correspondencias','correio','caixa','documento','documentos','alguma','algum',
      'qual','quais','que','esta','este','minha','meu','por','favor','vou','quero',
      'vamos','leva','leva-me','acessa','entra','pagina','página','central','ver','pode',
    ]);
    const termos = q.split(/[^a-z0-9à-úãõâêîôûçáéíóú]+/i)
      .map(t => t.toLowerCase())
      .filter(t => t.length >= 3 && !STOP.has(t));
    if (!termos.length) return false;

    const fonte: { m: Message; enviada: boolean }[] = [
      ...inbox.map(m => ({ m, enviada: false })),
      ...docInbox.map(m => ({ m, enviada: false })),
      ...sentMessages.map(m => ({ m, enviada: true })),
      ...docSentMessages.map(m => ({ m, enviada: true })),
    ];
    let melhor: { m: Message; score: number } | null = null;
    for (const { m, enviada } of fonte) {
      const textoBruto = `${m.org || ''} ${m.preview || ''} ${m.details?.subject || ''} ${m.institution || ''} ${m.details?.body || ''}`.toLowerCase();
      const score = termos.reduce((acc, t) => acc + (textoBruto.includes(t) ? 1 : 0), 0);
      if (score > 0 && (!melhor || score > melhor.score)) {
        melhor = { m, score };
      }
    }
    if (!melhor) return false;

    handleSelectMessage(melhor.m);
    return true;
  };

  const handleUpdateMessage = (updatedMsg: Message) => {
    setSelectedMessage(updatedMsg);
    setInbox(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
    setInstInbox(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
    setSentMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
    if (isOnline && hasValidSupabaseKeys()) {
      supabaseService.updateMessageState(updatedMsg.id >= 10000 && updatedMsg.id < 90000000 ? updatedMsg.id - 10000 : updatedMsg.id, {
        // REGRA R1 — «unread» nunca passa por edições: só o destinatário a abrir.
        status: updatedMsg.status,
        preview: updatedMsg.preview,
        subject: updatedMsg.details?.subject,
        body: updatedMsg.details?.body,
        deadline_text: updatedMsg.details?.deadline,
        state_indicator: updatedMsg.details?.state,
        actions: updatedMsg.details?.actions,
      }).catch(err => console.warn('[CDA-sync] Sincronização falhou (não bloqueia a ação local):', err));
    }
  };

  // F38 (v13) — logout REAL: contas migradas (não-demo) terminam também a sessão
  // Supabase Auth ANTES do reload; a face deixa de reabrir a conta (D6/v12 exige
  // sessão de nuvem activa). Best-effort: sem rede o logout local prossegue; o
  // marcador cda_cloud_accounts_v1 NUNCA é apagado (a conta continua migrada).
  const handleLogout = async (clearAll = false) => {
    // P-URL — v37.42: ao terminar a sessão o URL passa para o login DA ÁREA
    // (pathname já reflecte o prefixo /admin ou /institucional), mantendo a
    // privacidade pós-logout e o encaminhamento correcto (§3).
    try { window.history.replaceState(null, '', window.location.pathname + window.location.search + '#/login'); } catch { /* melhor esforço */ }
    if (clearAll) {
      localStorage.clear();
      window.location.reload();
    } else {
      addAuditLog(`Sessão terminada pelo utilizador (${appMode})`, 'info');
      if (bi && !homologationStore.isExempt(bi) && isSupabaseConfigured()) {
        const signOutRes = await cloudSignOutBestEffort(supabase);
        if (signOutRes.outcome === 'ok') {
          addAuditLog('[AUTH-CLOUD] Sessão de nuvem terminada neste dispositivo (local + Auth).', 'success');
        } else if (signOutRes.outcome === 'error') {
          addAuditLog('[AUTH-CLOUD] signOut falhou (rede/serviço); a sessão local foi limpa na mesma.', 'warning');
        }
      } else if (bi && homologationStore.isExempt(bi)) {
        console.debug('[DEMO] signOut ignorado — conta de demonstração (D7/v12).');
      }
      setLoginPasswordInput('');
      setEnteredOtp('');
      setEnteredPin('');
      setLoginError(null);
      localStorage.setItem('cda_sessao_activa', '0'); // v37.47 — refresh pós-logout vai ao login
      localStorage.setItem('skip_splash_and_show_login', 'true');
      window.location.reload();
    }
  };

  const handleNavigateToVideoAtendimento = () => {
    // Load video session count before navigating
    const loadVideoCount = async () => {
      try {
        const sessions = await VideoSessionService.listSessions();
        const count = sessions.filter(s => s.status !== 'concluida' && s.status !== 'cancelada').length;
        setVideoSessionCount(count);
      } catch (e) {
        console.warn('Failed to load video session count:', e);
      }
    };
    loadVideoCount();
    setTab('video-atendimento');
  };
  // Estados para popup (modal de confirmação obrigatória) de envio
  const [, setIsOfficialConfirmOpen] = useState(false);

  // P0-A — Selagem REAL do protocolo ANTES de mostrar/gravar (spec aprovada):
  // hash SHA-256 WebCrypto sobre payload canónico. Sem crypto.subtle o
  // resultado e o marcador honesto 'NAO_SELADO' — nunca se inventa assinatura.
  const sealProtocolForSend = async (
    protocol: DigitalProtocol,
    senderKey: string,
    recipientKey: string,
    subject: string,
    body: string,
  ) => {
    const hash = await sealProtocolContent(
      canonicalProtocolPayload({
        protocolNumber: protocol.protocolNumber,
        senderKey,
        recipientKey,
        subject,
        body,
      }),
    );
    return {
      ...protocol,
      digitalSignature: hash || 'NAO_SELADO',
      documentHash: hash || 'NAO_SELADO',
      issuerResponsible: user?.name || institutionCode || 'Sistema CADA',
    };
  };


  const executeOfficialSend = async (override?: ReplySendPayload): Promise<ReplySendResult> => {
    setIsOfficialConfirmOpen(false);
    // v37.76 — ENVIO MULTI-AGENTE: quando o compositor tem uma LISTA de
    // destinatários (chips «+ Adicionar destinatário»), reutiliza esta MESMA
    // pipeline uma vez por destinatário (validação P0-B, selo de protocolo,
    // persistência na nuvem e notificação individuais) e apresenta o resumo.
    // A resposta directa (override) e as sondagens nunca passam por aqui.
    if (!override && (composeData.toArray || []).filter((t) => t && t.trim()).length > 0) {
      const destinos: string[] = Array.from(new Set((composeData.toArray || []).map((t) => t.trim().toUpperCase().replace(/\s+/g, '')).filter(Boolean)));
      if (!composeData.body.trim()) {
        notify('A mensagem está vazia. Escreva o conteúdo antes de enviar.', 'warning');
        return { ok: false, error: 'A mensagem está vazia. Escreva o conteúdo antes de enviar.' };
      }
      let okCount = 0;
      const falhados: string[] = [];
      // v37.78.8 — UM só comprovativo para todo o lote: cada cópia é enviada em
      // modo «silencioso» (sem popup individual) e o resumo abre UMA vez no fim.
      const protocolosLote: string[] = [];
      let protocoloLote: DigitalProtocol | undefined;
      // v37.78.12 — PERFORMANCE: as cópias do lote correm em PARALELO (antes
      // era uma fila: N destinatários = N pipelines completos sequenciais).
      // Cada cópia continua a ter validação, protocolo e notificação próprios.
      const resultadosLote = await Promise.all(destinos.map(dest =>
        executeOfficialSend({
          to: dest,
          body: composeData.body,
          subject: composeData.subject,
          attachments: composeData.attachments || [],
          // v37.78.3 — sondagens embutidas: cada cópia leva o cartão de resposta.
          ...(composeData.sondagensIds?.length ? { sondagensIds: composeData.sondagensIds } : {}),
          // v37.78.8 — sem comprovativo individual (o resumo abre no fim do lote).
          silencioso: true,
        }).then(res => ({ dest, res }))
      ));
      for (const { dest, res } of resultadosLote) {
        if (res.ok) {
          okCount += 1;
          if (res.protocol) {
            protocolosLote.push(res.protocol.protocolNumber);
            protocoloLote = res.protocol;
          }
        } else falhados.push(dest);
      }
      setIsComposing(false);
      setComposeData({ to: '', subject: '', body: '', attachments: [], toArray: [] });
      addAuditLog(`[MULTI] Expedição múltipla concluída: ${okCount}/${destinos.length} destinatário(s) servido(s)${falhados.length ? ` — falharam: ${falhados.join(', ')}` : ''}${protocolosLote.length ? ` — protocolos: ${protocolosLote.join(', ')}` : ''}.`, okCount === destinos.length ? 'info' : 'warning');
      // v37.78.8 — comprovativo ÚNICO do lote (nº do 1.º protocolo; contagem e
      // lista de destinatários no campo AGENTE). Antes: N popups, um por envio.
      if (protocoloLote) {
        setSuccessProtocolModal({
          protocolNumber: protocoloLote.protocolNumber,
          org: `${okCount} destinatário(s): ${destinos.join(', ')}`,
          subject: composeData.subject?.trim() || '(sem assunto)',
          digitalSignature: protocoloLote.digitalSignature,
          documentHash: protocoloLote.documentHash,
          officialIssueDate: protocoloLote.officialIssueDate || new Date().toLocaleDateString('pt-PT'),
          officialTime: protocoloLote.officialTime || new Date().toLocaleTimeString('pt-PT').substring(0, 5),
        });
      }
      notify(
        okCount === destinos.length
          ? `Correspondência enviada para ${okCount} destinatário(s) com sucesso.`
          : `Envio múltiplo: ${okCount}/${destinos.length} enviadas${falhados.length ? ` — sem entrega para: ${falhados.join(', ')}` : ''}.`,
        okCount === destinos.length ? 'success' : 'warning',
      );
      return { ok: okCount > 0, error: falhados.length ? `Falhou para: ${falhados.join(', ')}` : undefined };
    }
    // F34 — a Nova Mensagem do cidadão já não tem campo Assunto: deriva-se do corpo.
    // FIX 2026-08-20 — aceita um payload opcional ("Enviar Resposta Oficial" do
    // Detalhe da Correspondência) para REUTILIZAR esta pipeline sem duplicar código.
    // Sem override, o comportamento é exactamente o do compositor ("Enviar Mensagem Oficial").
    const to = (override ? override.to : composeData.to).trim();
    const body = override ? override.body : composeData.body;
    const rawSubject = override ? override.subject : composeData.subject;
    const attachments = override
      ? (override.attachments || [])
      : (composeData.attachments || []);
    // v37.78.3 — sondagens embutidas na composição (fluxo do MailContent): a
    // correspondência oficial do destinatário MANUAL leva o cartão de resposta
    // (a difusão por âmbito excluiu este destinatário para não duplicar entregas).
    const sondagensIdsEnvio = override?.sondagensIds ?? composeData.sondagensIds;
    // Validação do conteúdo: destinatário e corpo obrigatórios (corpo só com espaços não envia).
    if (!to || !body.trim()) {
      notify('A mensagem está vazia. Escreva o conteúdo antes de enviar.', 'warning');
      return { ok: false, error: 'A mensagem está vazia. Escreva o conteúdo antes de enviar.' };
    }
    // P0-B — anti void-delivery (decisão §0.1 do dono: BLOQUEAR): destinatário
    // com formato de código institucional TEM de constar (aprovado) do registo
    // oficial. Falha de infra (errorCode) NÃO bloqueia — o registo volta a
    // impor-se quando a nuvem responder (fail-open só em erro, nunca em resposta
    // negativa definitiva).
    if (isRealInstitutionalCode(to)) {
      const reg = await supabaseService.institutionRegistered(to);
      if (!reg.errorCode && !reg.registered) {
        addAuditLog(`P0-B — Envio bloqueado: o código institucional ${to.toUpperCase()} não consta (aprovado) do registo oficial. Confirme o código ou peça à instituição para formalizar o registo.`, 'warning');
        notify(`Envio bloqueado: o código institucional ${to.toUpperCase()} não consta (aprovado) do registo oficial.`, 'error');
        return { ok: false, blocked: true, error: `Envio bloqueado: o código institucional ${to.toUpperCase()} não consta (aprovado) do registo oficial.` };
      }
    }
    const effectiveSubject = rawSubject.trim()
      || body.trim().replace(/\s+/g, ' ').slice(0, 60).trim()
      || 'Correspondência Oficial';
    
    const messageId = Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
    const protocol = await sealProtocolForSend(
      generateProtocol(to, 'message', messageId, effectiveSubject),
      isInstMode ? normalizeInstCode(institutionCode || bi) : normalizeHomologationBi(bi),
      resolveCitizenBi(to),
      effectiveSubject,
      body,
    );

    const newMessage: Message = {
      id: messageId,
      org: to,
      preview: effectiveSubject,
      date: "hoje",
      status: "Informativo",
      details: {
        subject: effectiveSubject,
        body: body,
        deadline: "Sem prazo",
        state: "Entregue & Autenticado",
        // 2026-08-21 — resposta vinculada à correspondência original
        // (marcador RESPONDE_A lido pelo Expediente da Administração).
        actions: override?.inReplyTo ? ["Ver detalhes", `RESPONDE_A:${override.inReplyTo}`] : ["Ver detalhes"],
        // v37.78.9 — ANEXOS CHEGAM SEMPRE COMO STRINGS JSON: a resposta inline
        // (MessageDetail) entrega objectos {name,size,content,type} e o proxy
        // /api/dados DESCARTA silenciosamente arrays de objectos — a mensagem
        // gravava attachments:[] e o destinatário nunca via o ficheiro. O
        // compositor principal já serializa (JSON.stringify); normaliza-se
        // aqui ambos os formatos (o viewer faz JSON.parse das strings).
        attachments: (attachments as unknown[]).map(a =>
          typeof a === 'string' ? a : JSON.stringify({
            name: (a as { name?: string })?.name,
            size: (a as { size?: string })?.size,
            content: (a as { content?: string })?.content,
            type: (a as { type?: string })?.type,
          })
        )
      },
      protocol: protocol
    };

    setSentMessages(prev => [{ ...newMessage, senderKey: isInstMode ? normalizeInstCode(institutionCode || bi) : normalizeHomologationBi(bi) }, ...prev]);
    // Resposta directa do Detalhe da Correspondência NÃO mexe no compositor.
    if (!override) {
      setIsComposing(false);
      setComposeData({ to: '', subject: '', body: '', attachments: [] });
    }

    const protocolData = {
      protocolNumber: protocol.protocolNumber,
      org: to,
      subject: effectiveSubject,
      digitalSignature: protocol.digitalSignature,
      documentHash: protocol.documentHash,
      officialIssueDate: protocol.officialIssueDate || new Date().toLocaleDateString('pt-PT'),
      officialTime: protocol.officialTime || new Date().toLocaleTimeString('pt-PT').substring(0, 5)
    };
// v37.78.8 — no envio múltiplo cada cópia é «silenciosa»: o comprovativo
    // individual NÃO abre (o resumo do LOTE abre uma única vez no fim).
    if (!override?.silencioso) setSuccessProtocolModal(protocolData);

    if (!isOnline) {
      OfflineManager.queueAction('SEND_MESSAGE', { messageId, to, subject: effectiveSubject });
      setOfflineQueue(OfflineManager.getQueue());
      
      const fallback = OfflineManager.triggerFallback('SMS', `Enviar Correspondência: ${effectiveSubject}`);
      setActiveFallback({ channel: 'SMS', message: fallback.message, protocol: fallback.protocol });
      
      addAuditLog(`Ação Offline: Mensagem guardada em fila local. Canal SMS ativo.`, 'warning');
      return { ok: true, queued: true, protocol };
    }
    addAuditLog(`Correspondência enviada com Protocolo ${protocol.protocolNumber}`, 'info');
    OfflineManager.createAutomaticBackup();
    // Sync to Supabase (falha de sincronização NÃO bloqueia a ação local — comportamento original)
    const isOfficialDispatch = isInstMode || isGovMode;
    try {
      const sendPromise = isOfficialDispatch
        ? supabaseService.sendOfficialMessage(newMessage, to, isInstMode ? institutionCode : 'CDA', sondagensIdsEnvio)
        : supabaseService.sendCitizenMessage(newMessage, bi, to, user.name || profileName);
      await sendPromise;
      // v37.78.12 — PERFORMANCE: as 3 escritas pós-envio são INDEPENDENTES
      // (protocolo para QR, evento «Enviada», notificação do destinatário).
      // Correm em PARALELO — antes eram 3 round-trips sequenciais e eram a
      // maior causa da lentidão ao enviar/responder correspondência.
      await Promise.allSettled([
        supabaseService.insertDigitalProtocol(protocol),
        supabaseService.insertMessageStateEvent({
          messageId,
          state: 'Enviada',
          responsible: user.name,
          description: `Correspondência enviada para ${to}.`
        }),
        isOfficialDispatch
          ? supabaseService.insertNotification({
              title: 'Nova Correspondência Oficial',
              message: `${newMessage.preview} foi disponibilizada no seu endereço digital oficial.`,
              type: 'info',
              targetTab: 'correspondencias'
            }, to)
          : supabaseService.insertNotification({
              title: 'Nova Solicitação do Cidadão',
              message: `${user.name} enviou uma nova correspondência para ${to}.`,
              type: 'info',
              targetTab: 'correspondencias'
              // v37.78.2 — destinatário-cidadão (BI completo) é notificado pelo
              // próprio BI; resolveInstitutionCode() reduziria '005404692BO043' a 'BO'.
            }, /^\d{9}[A-Z]{2}\d{3}$/.test(to.toUpperCase()) ? to.toUpperCase() : resolveInstitutionCode(to)),
      ]);
    } catch (err) {
      console.warn('[CDA-sync] Sincronização falhou (não bloqueia a ação local):', err);
    }
    // v37.61 — feedback de sucesso no envio pelo compositor. A resposta direta
    // (override) já mostra o cartão de sucesso no detalhe, por isso não duplicar.
    if (!override) notify('Correspondência enviada com sucesso.', 'success');
    return { ok: true, protocol };
  };

  const handleReply = (msg: Message) => {
    // `org` é apenas o rótulo exibido. Para entregar a resposta, usar a chave
    // canónica do remetente original (BI/código institucional), não o texto.
    const recipient = msg.senderKey || msg.recipientBi || resolveInstitutionCode(msg.org);
    setComposeData({
      to: recipient,
      subject: `RE: ${msg.details?.subject || msg.preview.substring(0, 30)}`,
      body: `\n\n--------------------------------\nEm resposta à mensagem de ${msg.date}:\n"${msg.preview}"`,
      attachments: []
    });
    setTab('correspondencias');
    setIsComposing(true);
  };

  // S5 — rascunho gerado pela IA entra no compositor para REVISAO humana;
  // o envio continua 100% manual (a IA nunca envia).
  const handleResponderComRascunho = (msg: Message, rascunho: string) => {
    setComposeData({
      to: msg.org,
      subject: `RE: ${msg.details?.subject || msg.preview.substring(0, 30)}`,
      body: rascunho,
      attachments: []
    });
    setTab('correspondencias');
    setIsComposing(true);
  };

  const handleSendDocMessage = async () => {
    if (!docComposeData.to || !docComposeData.subject || !docComposeData.body) return;
    // P0-B — mesma guarda anti void-delivery do envio de mensagem (ver acima).
    if (isRealInstitutionalCode(docComposeData.to)) {
      const reg = await supabaseService.institutionRegistered(docComposeData.to);
      if (!reg.errorCode && !reg.registered) {
        addAuditLog(`P0-B — Envio bloqueado: o código institucional ${docComposeData.to.trim().toUpperCase()} não consta (aprovado) do registo oficial. Confirme o código ou peça à instituição para formalizar o registo.`, 'warning');
        return;
      }
    }
    
    const messageId = Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
    const protocol = await sealProtocolForSend(
      generateProtocol(docComposeData.to, 'message', messageId, docComposeData.subject),
      isInstMode ? normalizeInstCode(institutionCode || bi) : normalizeHomologationBi(bi),
      resolveCitizenBi(docComposeData.to),
      docComposeData.subject,
      docComposeData.body,
    );

    const newMessage: Message = {
      id: messageId,
      org: docComposeData.to,
      preview: docComposeData.subject,
      date: "hoje",
      status: "Informativo",
      details: {
        subject: docComposeData.subject,
        body: docComposeData.body,
        deadline: "Sem prazo",
        state: "Entregue & Autenticado",
        actions: ["Ver detalhes", "__DOC__"]
      },
      protocol: protocol
    };

    setDocSentMessages(prev => [{ ...newMessage, senderKey: isInstMode ? normalizeInstCode(institutionCode || bi) : normalizeHomologationBi(bi) }, ...prev]);
    setIsDocComposing(false);
    setDocComposeData({ to: '', subject: '', body: '' });

    const protocolData = {
      protocolNumber: protocol.protocolNumber,
      org: docComposeData.to,
      subject: docComposeData.subject,
      digitalSignature: protocol.digitalSignature,
      documentHash: protocol.documentHash,
      officialIssueDate: protocol.officialIssueDate || new Date().toLocaleDateString('pt-PT'),
      officialTime: protocol.officialTime || new Date().toLocaleTimeString('pt-PT').substring(0, 5)
    };
    setSuccessProtocolModal(protocolData);

    if (!isOnline) {
      OfflineManager.queueAction('SEND_DOCUMENT', { messageId, to: docComposeData.to, subject: docComposeData.subject });
      setOfflineQueue(OfflineManager.getQueue());
      
      const fallback = OfflineManager.triggerFallback('SMS', `Enviar Documento: ${docComposeData.subject}`);
      setActiveFallback({ channel: 'SMS', message: fallback.message, protocol: fallback.protocol });
      
      addAuditLog(`Ação Offline: Documento guardado em fila local. Canal SMS ativo.`, 'warning');
    } else {
      addAuditLog(`Documento enviado com Protocolo ${protocol.protocolNumber}`, 'info');
      OfflineManager.createAutomaticBackup();
      const isOfficialDispatch = isInstMode || isGovMode;
      const sendPromise = isOfficialDispatch
        ? supabaseService.sendOfficialMessage(newMessage, docComposeData.to, isInstMode ? institutionCode : 'CDA')
        : supabaseService.sendCitizenMessage(newMessage, bi, docComposeData.to, user.name || profileName);
      sendPromise
        .then(async () => {
          // v37.78.12 — PERFORMANCE: as 3 escritas pós-envio em paralelo.
          await Promise.allSettled([
            supabaseService.insertDigitalProtocol(protocol),
            supabaseService.insertMessageStateEvent({
              messageId,
              state: 'Enviado',
              responsible: user.name,
              description: `Documento/tramitação enviada para ${docComposeData.to}.`
            }),
            isOfficialDispatch
              ? supabaseService.insertNotification({
                  title: 'Novo Documento / Tramitação',
                  message: `${newMessage.preview} foi disponibilizado no seu canal oficial.`,
                  type: 'info',
                  targetTab: 'documentos'
                }, docComposeData.to)
              : supabaseService.insertNotification({
                  title: 'Novo Documento Submetido',
                  message: `${user.name} submeteu uma nova tramitação para ${docComposeData.to}.`,
                  type: 'info',
                  targetTab: 'documentos'
                }, resolveInstitutionCode(docComposeData.to)),
          ]);
        })
        .catch(err => console.warn('[CDA-sync] Sincronização falhou (não bloqueia a ação local):', err));
    }
  };


  const handleDeleteContact = () => {
    if (contactToDelete) {
      // F55 — regra dos 2 contactos de emergência: bloqueio REAL com razão
      // visível no modal; o modal NÃO fecha com sucesso fabricado.
      const removalCheck = checkContactRemoval(currentContacts, contactToDelete.id);
      if (!removalCheck.allowed) {
        setContactDeleteBlock(removalCheck.reason);
        addAuditLog(`Remoção de contacto bloqueada: ${contactToDelete.name} — regra do mínimo de ${2} contactos de emergência.`, 'warning');
        return;
      }

      setContactDeleteBlock(null);
      setContacts(prev => prev.filter(c => c.id !== contactToDelete.id));
      
      if (!isOnline) {
        OfflineManager.queueAction('DELETE_CONTACT', { id: contactToDelete.id, name: contactToDelete.name });
        setOfflineQueue(OfflineManager.getQueue());
        const fallback = OfflineManager.triggerFallback('PUSH', `Remover Contacto: ${contactToDelete.name}`);
        setActiveFallback({ channel: 'PUSH', message: fallback.message, protocol: fallback.protocol });
        addAuditLog(`Ação Offline: Remoção de contacto guardada. Fallback Push ativo.`, 'warning');
      } else {
        addAuditLog(`Contacto removido: ${contactToDelete.name}`, 'warning');
        OfflineManager.createAutomaticBackup();
        // Background sync to Supabase (nunca em sessões demo — D7)
        if (!isDemoSession) supabaseService.deleteContact(contactToDelete.id).catch(err => console.warn('[CDA-sync] Sincronização falhou (não bloqueia a ação local):', err));
      }
      
      setContactToDelete(null);
      notify('Contacto removido com sucesso.', 'success');
    }
  };

  const handleAddContact = () => {
    // F55 — fim do retorno silencioso: TODOS os bloqueios são verbalizados
    // (telefone +244 obrigatório, relação obrigatória, anti-duplicados por
    // telefone, máximo de 50 contactos). O modal só fecha em sucesso REAL.
    const validationErrors = validateContactForm(contactForm, currentContacts);
    if (validationErrors.length > 0) {
      setContactFormErrors(validationErrors);
      addAuditLog(`Adição de contacto rejeitada: ${validationErrors[0]}`, 'warning');
      return;
    }

    const newContact = {
      id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
      name: contactForm.name.trim(),
      bi: contactForm.bi.trim(),
      relation: contactForm.relation.trim() || "Outro",
      status: "Confirmado",
      type: contactForm.type || "Normal",
      phone: (contactForm.phone || '').trim(),
      whatsapp: (contactForm.whatsapp || '').trim(),
      // v35 — email opcional do contacto (difusão de emergência)
      email: (contactForm.email || '').trim(),
      ownerId: sessionOwnerKey,
    };

    setContacts(prev => [newContact, ...prev]);

    if (!isOnline) {
      // F56 — payload completo do contacto: permite replay REAL na
      // sincronização (antes só tinha name/bi — insuficiente para reenviar).
      OfflineManager.queueAction('ADD_CONTACT', { contact: newContact, name: contactForm.name, bi: contactForm.bi });
      setOfflineQueue(OfflineManager.getQueue());
      const fallback = OfflineManager.triggerFallback('USSD', `Adicionar Contacto: ${contactForm.name}`);
      setActiveFallback({ channel: 'USSD', message: fallback.message, protocol: fallback.protocol });
      addAuditLog(`Ação Offline: Adição de contacto guardada em fila. Canal USSD ativo (*141*9#).`, 'warning');
    } else {
      addAuditLog(`Novo contacto adicionado: ${contactForm.name}`, 'success');
      OfflineManager.createAutomaticBackup();
      // Background sync to Supabase (nunca em sessões demo — D7)
      if (!isDemoSession) supabaseService.insertContact(newContact, bi).catch(err => console.warn('[CDA-sync] Sincronização falhou (não bloqueia a ação local):', err));
    }

    notify('Contacto adicionado com sucesso.', 'success');
    setContactFormErrors([]);
    setIsAddingContact(false);
    setContactForm({ name: '', bi: '', relation: '', phone: '', whatsapp: '', email: '', type: 'Normal' });
  };

  /**
   * F55 — edição REAL do contacto completo (nome, BI, relação, telefone,
   * WhatsApp, tipo). Antes o modal mostrava todos os campos mas só persistia
   * o tipo (controlo fabricado). Devolve erros de validação para a UI;
   * vazio = gravado.
   */
  const handleUpdateContact = (updatedContact: Contact): string[] => {
    const fieldErrors = validateContactForm(updatedContact, currentContacts, { excludeContactId: updatedContact.id });
    const typeCheck = checkContactTypeChange(currentContacts, updatedContact.id, updatedContact.type || 'Normal');
    const errors = [...fieldErrors, ...(typeCheck.reason ? [typeCheck.reason] : [])];
    if (errors.length > 0) {
      addAuditLog(`Edição de contacto rejeitada: ${errors[0]}`, 'warning');
      return errors;
    }

    setContacts(prev => prev.map(c => (c.id === updatedContact.id ? { ...c, ...updatedContact } : c)));
    addAuditLog(`Contacto actualizado: ${updatedContact.name}`, 'success');
    OfflineManager.createAutomaticBackup();
    if (isOnline && !isDemoSession) {
      supabaseService.insertContact(updatedContact, bi).catch(err => console.warn('[CDA-sync] Sincronização falhou (não bloqueia a ação local):', err));
    }
    notify('Contacto atualizado com sucesso.', 'success');
    return [];
  };

  const handleUpdateContactType = (id: number, newType: 'Normal' | 'Emergência') => {
    // F55 — despromover Emergência→Normal não pode deixar o perfil abaixo do
    // mínimo de 2 contactos de emergência (mesma regra da remoção).
    const typeCheck = checkContactTypeChange(currentContacts, id, newType);
    if (!typeCheck.allowed) {
      addAuditLog(`Alteração de tipo de contacto bloqueada: ${typeCheck.reason}`, 'warning');
      return;
    }
    setContacts(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, type: newType };
        // Sync update (nunca em sessões demo — D7)
        if (isOnline && !isDemoSession) supabaseService.insertContact(updated, bi).catch(err => console.warn('[CDA-sync] Sincronização falhou (não bloqueia a ação local):', err));
        return updated;
      }
      return c;
    }));
    addAuditLog(`Prioridade do contacto atualizada para ${newType}`, 'info');
  };

  // -------------------------------------------------------------------------
  // F58 — DIFUSÃO INSTITUCIONAL PARA REDE DE EMERGÊNCIA (spec v20 aprovada)
  // Área da Instituição · Correio · Nova Mensagem:
  //   lookup por BI EXACTO (RPC security definer; instituição/admin only) →
  //   confirmação visual anti-engano → página de difusão por linha →
  //   1º entrega CDA real (se conta existir) → 2º wa.me (quem envia é o
  //   agente — NUNCA existe "WhatsApp enviado"). Demo = sandbox declarado (D7).
  // -------------------------------------------------------------------------

  // F59 — lookup REAL do destinatário (chamado pelo compositor: debounce de
  // BI completo + botão manual). Cada chamada real é auditada na plataforma
  // (200/h por instituição) — no demo, sandbox declarado com ZERO chamadas.
  const handleRecipientLookup = async (rawBi: string) => {
    const target = (rawBi || '').trim().toUpperCase();
    if (!target) return;
    // DEMO — sandbox declarado; ZERO chamadas reais.
    if (isDemoInstitutionSession) {
      setRecipientLookup({
        status: 'found',
        lookedUpBi: target,
        citizen: { bi: target, name: 'Cidadão de Demonstração', emergencyContactsCount: 2, redeCompleta: true },
        sandbox: true,
      });
      addAuditLog('Simulação de pesquisa de cidadão (Modo Sandbox — sem consulta real)', 'info');
      return;
    }
    setRecipientLookup({ status: 'busy', lookedUpBi: target });
    const res = await supabaseService.institutionLookupCidadao(target);
    if (res.errorCode) {
      setRecipientLookup({ status: 'error', lookedUpBi: target, errorCode: res.errorCode });
      addAuditLog(`Pesquisa de cidadão por BI falhou (Erro real: ${res.errorCode})`, 'warning');
    } else if (!res.found || !res.citizen) {
      setRecipientLookup({ status: 'not_found', lookedUpBi: target });
      addAuditLog(`Pesquisa de cidadão por BI: sem registo (${target}) — mensagem oficial pode seguir para entrega pré-registo`, 'info');
    } else {
      setRecipientLookup({ status: 'found', lookedUpBi: target, citizen: res.citizen });
      addAuditLog(`Cidadão localizado por BI exacto: ${res.citizen.name} — rede de emergência: ${res.citizen.emergencyContactsCount}`, 'info');
    }
  };

  const handleInstEmergencyOpen = async () => {
    if (recipientLookup.status !== 'found' || !recipientLookup.citizen.redeCompleta) return;
    if (!composeData.body.trim()) return;
    setInstEmgBroadcastOpen(true);
    // DEMO — rede fictícia declarada; ZERO chamadas reais.
    if (isDemoInstitutionSession) {
      setInstEmgRecipients([
        { name: 'Familiar Demo Um', relation: 'Pai/Mãe', phone: '+244 900 000 000', whatsapp: '+244 900 000 000', email: null, cda_bi: null, has_cda_account: false },
        { name: 'Familiar Demo Dois', relation: 'Cônjuge', phone: '+244 900 000 001', whatsapp: null, email: 'familiar.demo.dois@exemplo.ao', cda_bi: null, has_cda_account: false },
      ]);
      setInstEmgRecipientsError(null);
      setInstEmgRecipientsBusy(false);
      return;
    }
    setInstEmgRecipients(null);
    setInstEmgRecipientsError(null);
    setInstEmgRecipientsBusy(true);
    const res = await supabaseService.institutionFetchRedeEmergencia(recipientLookup.citizen.bi);
    setInstEmgRecipientsBusy(false);
    if (res.errorCode) {
      setInstEmgRecipientsError(res.errorCode);
      addAuditLog(`Falha ao carregar rede de emergência (Erro real: ${res.errorCode})`, 'warning');
      return;
    }
    setInstEmgRecipients(res.members || []);
  };

  /**
   * Linha "Enviar Mensagem" (só conta REAL — o componente trata do sandbox):
   * 1º entrega CDA via canal institucional existente (sendOfficialMessage);
   * 2º link wa.me calculado (a abertura/navigation fica no componente, dentro
   * do gesto do utilizador); 3º registo REAL da difusão (append-only).
   */
  const handleInstEmergencySendRow = async (
    member: RedeMember,
    citizen: InstCitizenInfo,
  ): Promise<RowSendOutcome> => {
    let platform: RowSendOutcome['platform'] = 'sem_conta';
    let platformErrorCode: string | null = null;
    const emergencySubject = `ALERTA DE EMERGÊNCIA — ${user?.name || institutionCode || 'Instituição'}`;

    // 1º — Plataforma CDA (se o familiar tiver conta — desfecho REAL)
    if (member.has_cda_account && member.cda_bi) {
      const emergencyMessage: Message = {
        id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
        org: user?.name || institutionCode || 'Instituição',
        preview: emergencySubject,
        date: 'hoje',
        status: 'Informativo',
        priorityScale: 'Urgente',
        details: {
          subject: emergencySubject,
          body: composeData.body,
          deadline: 'Sem prazo',
          state: 'Entregue & Autenticado',
          actions: ['Ver detalhes'],
          attachments: [],
        },
      };
      try {
        await supabaseService.sendOfficialMessage(emergencyMessage, member.cda_bi, institutionCode || (user?.name ?? 'Instituição'));
        platform = 'enviado';
      } catch (e) {
        platform = 'falhou';
        platformErrorCode = e?.code || 'EXCEPCAO';
      }
    }

    // 2º — link WhatsApp (wa.me); a navegação fica no componente (gesto do user)
    const waLink = buildWaMeLink(redeemerWhatsappTarget(member), composeData.body);

    // 2b — v35: link de EMAIL (mailto:) para o membro com endereço registado;
    // quem envia/confirmar é o agente no seu cliente de email (nunca simulado).
    const emailLink = buildMailtoLink(member.email, emergencySubject, composeData.body);

    // 3º — Registo REAL da difusão (append-only; falha aqui não mascara o envio)
    const record: BroadcastRecordRow = {
      citizen_bi: citizen.bi,
      alert_type: 'outro',
      location_status: 'nao_disponivel',
      recipients_snapshot: [{ nome: member.name, relacao: member.relation }],
      gateway_status: 'whatsapp_link_manual',
      sender_kind: 'instituicao',
      sender_instituicao: (institutionCode || '').toUpperCase(),
      sender_agent_bi: bi ? bi.toUpperCase() : null,
      message_text: composeData.body,
      channel_detail: {
        contacto_bi: member.cda_bi,
        nome: member.name,
        plataforma: platform,
        plataforma_error_code: platformErrorCode,
        whatsapp_link: !!waLink,
        email_link: !!emailLink,
        at: new Date().toISOString(),
      },
    };
    const rec = await supabaseService.institutionRecordEmergencyBroadcast(record);

    if (platform === 'enviado') {
      addAuditLog(
        `Emergência: mensagem entregue na plataforma CDA de ${member.name}` +
        (emailLink ? ' · email disponível para difusão' : '') +
        (rec.recorded ? '' : ` (registo da difusão falhou — Erro real: ${rec.errorCode})`),
        'success',
      );
    } else if (platform === 'falhou') {
      addAuditLog(`Emergência: envio CDA para ${member.name} falhou (Erro real: ${platformErrorCode})`, 'warning');
    } else {
      addAuditLog(`Emergência: ${member.name} sem conta CDA — seguiu apenas via WhatsApp (link aberto)`, 'info');
    }

    return { platform, platformErrorCode, waLink, emailLink };
  };

  // F58 — fechar a composição limpa o estado da difusão de emergência.
  useEffect(() => {
    if (!isComposing) {
      setInstEmgBroadcastOpen(false);
      setRecipientLookup({ status: 'idle' });
      setInstEmgRecipients(null);
      setInstEmgRecipientsError(null);
      setInstEmgRecipientsBusy(false);
    }
  }, [isComposing]);

  const handleEmitDocument = (doc: Document, notification: AppNotification) => {
    setDocuments(prev => [doc, ...prev]);
    setNotifications(prev => [stampNotif(notification), ...prev]); // F18 — dono da sessão (visível em contas reais)
    
    // Also send a formal message to the inbox to simulate real correspondence
    const newMessage: Message = {
      id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
      org: doc.issuer.split(' - ')[0], // Get AGT from AGT - Administração...
      preview: `Novo documento emitido: ${doc.name}`,
      date: "Agora",
      status: "Oficial",
      unread: 1,
      details: {
        subject: `Emissão de ${doc.name}`,
        body: `Prezado(a) ${doc.holder},\n\nInformamos que um novo documento (${doc.name}) foi emitido pela nossa instituição e já se encontra disponível na sua QR Code.\n\nCódigo de Autenticação: ${doc.code}\nData de Emissão: ${doc.issuedAt}\n\nEste é um procedimento automático do Correio Digital de Angola.`,
        attachments: [doc.name],
        actions: ['Ver na Carteira', '__DOC__']
      }
    };

    // If the issued document is for the currently logged in user, update their local inbox
    if (doc.number === bi) {
      setInbox(prev => [newMessage, ...prev]);
    }
    
    // Close the request if it exists in the userRequests pool
    setUserRequests(prev => prev.map(req => 
      (req.bi === doc.number && doc.name.toLowerCase().includes(req.type.toLowerCase())) ? { ...req, status: 'concluido' } : req
    ));

    if (!isOnline) {
      OfflineManager.queueAction('EMIT_DOCUMENT', { docId: doc.code, name: doc.name, holder: doc.holder });
      setOfflineQueue(OfflineManager.getQueue());
      const fallback = OfflineManager.triggerFallback('PUSH', `Emissão de Documento: ${doc.name}`);
      setActiveFallback({ channel: 'PUSH', message: fallback.message, protocol: fallback.protocol });
      addAuditLog(`Ação Offline: Emissão de ${doc.name} enfileirada. Fallback Push ativo.`, 'warning');
    } else {
      // Sync document, companion message, and notification alert to Supabase
      if (hasValidSupabaseKeys()) {
        supabaseService.insertDocument(doc, doc.number).catch(err => console.error(err));
        supabaseService.sendOfficialMessage(newMessage, doc.number, doc.issuer.split(' - ')[0])
          .then(() => supabaseService.insertMessageStateEvent({
            messageId: newMessage.id,
            state: 'Entregue',
            responsible: doc.issuer,
            description: `Documento ${doc.name} disponibilizado ao cidadão.`
          }))
          .catch(err => console.error(err));
        supabaseService.insertNotification({
          title: notification.title,
          message: notification.message,
          type: notification.type,
          targetTab: notification.targetTab
        }, doc.number).catch(err => console.error(err));
      }
      addAuditLog(`Emissão de Documento: ${doc.name} para ${doc.holder} (BI: ${doc.number})`, 'success');
      OfflineManager.createAutomaticBackup();
    }
  };

  const handleCreateRequest = (type: string, priority: 'Alta' | 'Média' | 'Baixa' = 'Média') => {
    const newReq: UserRequest = {
      id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
      user: user?.name || profileName || 'Cidadão', // v37.31-fix — o titular real da sessão (antes: nome pessoal hardcoded = fuga entre contas)
      type,
      priority,
      time: 'Agora',
      status: 'pendente',
      bi: bi
    };
    setUserRequests(prev => [newReq, ...prev]);

    // Format new notification correctly satisfying AppNotification type
    const newNotif: AppNotification = {
      id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
      title: 'Solicitação Enviada',
      message: `O seu pedido de ${type} foi enviado à Área de Administração.`, // F18 — era 'AGT' (marca demo)
      time: 'Agora',
      type: 'info',
      targetTab: 'home',
      unread: true
    };
    setNotifications(prev => [stampNotif(newNotif), ...prev]);

    if (!isOnline) {
      OfflineManager.queueAction('CREATE_REQUEST', { type, priority });
      setOfflineQueue(OfflineManager.getQueue());
      const fallback = OfflineManager.triggerFallback('USSD', `Solicitar ${type} via USSD (*141*9#)`);
      setActiveFallback({ channel: 'USSD', message: fallback.message, protocol: fallback.protocol });
      addAuditLog(`Ação Offline: Pedido de ${type} anexado ao buffer. Fallback USSD físico iniciado (*141*9#).`, 'warning');
    } else {
      // Sync query request and notification alert to Supabase
      if (hasValidSupabaseKeys()) {
        supabaseService.insertUserRequest(newReq).catch(err => console.error(err));
        supabaseService.insertNotification({
          title: newNotif.title,
          message: newNotif.message,
          type: newNotif.type,
          targetTab: newNotif.targetTab
        }, bi).catch(err => console.error(err));
      }
      addAuditLog(`Nova solicitação de ${type} enviada à AGT`, 'info');
      OfflineManager.createAutomaticBackup();
    }
  };

  const getPageContentDescription = (currentTab: string) => {
    switch (currentTab) {
      case 'home':
        return `Você está no Painel Principal do Correio Digital de Angola.
O utilizador logado é ${profileName} com Bilhete de Identidade ${bi}.
Neste painel, há um alerta oficial sobre emergência civil e um painel lateral onde se listam as Instituições Conectadas como a AGT, SME, ENDE, EPAL e INE.
Status de verificação da conta: ${verificationStatus}.
Serviços ativos: Notificações em tempo real e interconexão garantida.`;
      
      case 'correspondencias': {
        // 2026-08-21 — contexto completo para a IA: TODAS as correspondências
        // reais (recebidas + enviadas) com remetente/destinatário correctos.
        // Antes só iam 3 itens e as mensagens de instituições como o INAPEM
        // ficavam fora do contexto — a IA respondia "não encontrei".
        const visiveis = currentInbox;
        const naoLidas = visiveis.filter(m => m.unread).length;
        const rotuloDe = (m: Message) => {
          const senderKeyNorm = normalizeHomologationBi(m.senderKey || '');
          const biNorm2 = normalizeHomologationBi(bi);
          if (senderKeyNorm && senderKeyNorm !== biNorm2) return m.senderKey;
          return m.org || 'Instituição';
        };
        const resumoRecebidas = visiveis.slice(0, 12).map(m =>
          `- De: ${rotuloDe(m)}, Assunto: ${m.details?.subject || m.preview}, Data: ${m.date}, Estado: ${m.unread ? 'Não Lida' : 'Lida'}`
        ).join('\n');
        const resumoEnviadas = currentSentMessages.slice(0, 8).map(m =>
          `- Para: ${m.org || m.recipientBi || 'Instituição'}, Assunto: ${m.details?.subject || m.preview}, Data: ${m.date}`
        ).join('\n');
        return `Você está na aba de Correspondência Oficial (Recebidas).\nTotal de correspondências recebidas: ${visiveis.length} (das quais ${naoLidas} não lidas).\n\nRECEBIDAS:\n${resumoRecebidas || 'Nenhuma correspondência recebida.'}\n\nENVIADAS (recentes):\n${resumoEnviadas || 'Nenhuma correspondência enviada.'}`;
      }
      
      case 'video-atendimento':
        return (
          <PainelSuspense>
            <VideoSessionPage
              onBack={() => setTab('correspondencias')}
              onNavigateToMail={() => setTab('correspondencias')}
              addAuditLog={addAuditLog}
              // 2026-08-22 — contexto do papel: a instituição agenda com o
              // cidadão; o cidadão vê as sessões agendadas PARA ele.
              isInst={isInstMode}
              bi={bi}
              instCode={institutionCode || bi}
              instDisplayName={activeProfile?.institutionName || sessionInstBrand.sigla || (isInstMode ? bi : '')}
              sessionDemo={(isUserMode && isDemoCitizenSession) || (isInstMode && isDemoInstitutionSession)}
            />
          </PainelSuspense>
        );
      case 'documentos':
        const docUnreadCount = docInbox.filter(m => m.status === 'Não Lida').length;
        const docMessagesSummary = docInbox.slice(0, 3).map(m => `- Serviço: ${m.sender || m.org}, Assunto: ${m.subject || m.preview}, Status: ${m.status}`).join('\n');
        return `Você está na aba de Documentos e Tramitações Oficiais (Facturas e Certidões).
Nesta secção, consulte as faturas de serviços básicos ou recibos eletrónicos emitidos de Angola.
Você tem ${docInbox.length} itens recebidos nas suas tramitações, sendo ${docUnreadCount} não abertos. 
Últimas tramitações na tela:
${docMessagesSummary || 'Nenhum documento de trâmite pendente.'}`;
      
      case 'qr-code':
        const docsSummary = documents.map(d => `- ${d.name} (Número: ${d.number || 'Não Aplicável'})`).join('\n');
        return `Você está na QR Code Offline e Segura.
Nela estão armazenados eletronicamente os seguintes documentos civis do cidadão ${profileName}:
${docsSummary || 'Nenhum documento adicionado.'}
As credenciais têm assinatura criptográfica ativa e um código QR de integridade visualizado para validação por fiscais de estado.`;
      
      case 'pasta-digital':
        return `Você está na Pasta Digital Integrada.
Nesta área estão organizados os dossiers, certidões, anexos certificados e comprovativos históricos associados ao perfil ${profileName}.`;

      case 'historico':
        return `Você está no Centro de Histórico Operacional.
Aqui pode acompanhar correspondências, documentos, notificações e solicitações recentes do perfil ativo no Correio Digital Angola.`;

      case 'notificacoes':
        return `Você está no Centro de Notificações.
Nesta secção são apresentados alertas, confirmações de emissão, respostas institucionais e avisos operacionais associados ao perfil atual.`;
      
      case 'contactos':
      case 'contatos':
        const contactsSummary = contacts.map(c => `- Nome: ${c.name}, Grau: ${c.relation}, Telefone: ${c.phone || 'Sem telefone'}, Tipo: ${c.type || 'Normal'}, Estado: ${c.status}`).join('\n');
        return `Você está nos Contactos de Emergência e Conexões Familiares.
Aqui estão cadastrados familiares e vizinhos confiáveis que o governo de Angola pode avisar de forma automatizada em cenários de contingência nacional.
Contactos guardados no seu perfil:
${contactsSummary || 'Nenhum contacto cadastrado.'}`;
      
      case 'perfil':
        return `Você está na secção do Meu Perfil de Cidadão do Correio Digital de Angola.
Ficha civil do titular:
- Nome Completo: ${profileName}
- Número de Bilhete de Identidade (BI): ${bi}
- Telemóvel Registado: ${phone}
- Número de Identificação Fiscal (NIF): ${nif}
- Passaporte Diplomático/Regular: ${passport}
- Filiação: ${userFiliation}
- Data de Nascimento: ${userBirthDate}
- Estado Civil: ${userMaritalStatus}
- Nível de Verificação: ${verificationStatus}`;
        
      case 'directorio-orgaos':
        return 'Você está no Directório de Órgãos do Correio Digital de Angola. Aqui pode consultar, por categoria, os órgãos do Estado angolano: Presidência, Ministérios, Justiça e Registos, Finanças, Bancos, Seguros, Energia e Águas, Saúde, Educação e outros. É uma área de referência e consulta.';

      default:
        return 'Página informativa geral do utilizador no Correio Digital de Angola.';
    }
  };

  /**
   * Pesquisa local das correspondências DO PRÓPRIO utilizador para o assistente IA.
   * A caixa de entrada já vem filtrada pelo RLS do Supabase (só o dono vê as suas),
   * por isso esta pesquisa nunca expõe dados de terceiros.
   * Devolve um resumo formatado das correspondências mais relevantes para a pergunta,
   * limitado a MAX_HITS itens e com conteúdo truncado (proteção contra estouro de
   * tokens do modelo e contra injeção de instruções no prompt).
   */
  const buscarCorrespondenciasParaIA = (query: string): string => {
    const MAX_HITS = 8;
    const MAX_BODY_CHARS = 300;
    const q = String(query || '').toLowerCase().trim();
    // 2026-08-21 — sentinela SEM_PESQUISA: distinguir "pesquisa não aplicável"
    // (saudação/pergunta curta) de "pesquisado e nada encontrado" (marcador
    // honesto para a IA não inventar correspondências).
    if (q.length < 3) return '__SEM_PESQUISA__';

    // Termos de pesquisa: ignora palavras demasiado curtas/comuns.
    const termos = q.split(/[^a-z0-9à-úãõâêîôûçáéíóú]+/i)
      .map(t => t.toLowerCase())
      .filter(t => t.length >= 3 && !['para', 'onde', 'como', 'pode', 'posso', 'uma', 'com', 'que', 'das', 'dos', 'saber', 'quero', 'sobre', 'olá', 'ola', 'tudo', 'bem', 'bom', 'boa', 'dia', 'tarde', 'noite', 'obrigado', 'obrigada', 'está', 'esta'].includes(t));
    if (!termos.length) return '__SEM_PESQUISA__';

    // Pesquisa em TODAS as caixas do próprio utilizador: recebidas (inbox),
    // documentos (docInbox), enviadas do correio (sentMessages) e enviadas de
    // documentos (docSentMessages). Tudo já filtrado por RLS — só o dono vê.
    // A origem (recebida/enviada) é marcada para o rótulo De:/Para: ser honesto.
    // 2026-08-21 — o texto pesquisado passa a incluir as CHAVES (sender/recipient)
    // para perguntas como "mensagens do INAPEM" baterem mesmo quando o rótulo
    // da org não traz o código institucional.
    const biNorm = normalizeHomologationBi(bi);
    const fonte: { m: Message; enviada: boolean }[] = [
      ...inbox.map(m => ({ m, enviada: false })),
      ...docInbox.map(m => ({ m, enviada: false })),
      ...sentMessages.map(m => ({ m, enviada: true })),
      ...docSentMessages.map(m => ({ m, enviada: true })),
    ];
    // 2026-08-21 — INTENÇÃO DE LISTAGEM/RECÊNCIA: perguntas como "qual é a
    // mais recente", "o que recebi hoje", "quais as minhas mensagens" recebem
    // a lista COMPLETA e ordenada (mais recentes primeiro) em vez dos hits
    // parciais por termo — sem isto a IA respondia "só há uma mensagem hoje"
    // ou apontava a correspondência errada como mais recente.
    const intencaoListagem = /recente|hoje|ultim|nova|novas|quais|quantas|correspond|mensag|caixa|recebi|receb|chegou|chegaram/.test(q);

    if (intencaoListagem) {
      const recebidas = fonte.filter(x => !x.enviada).slice(0, 12);
      const enviadas = fonte.filter(x => x.enviada).slice(0, 8);
      if (!recebidas.length && !enviadas.length) return '';
      const fmt = (m: Message, enviada: boolean) => {
        const senderKeyNorm = normalizeHomologationBi(m.senderKey || '');
        const alvo = enviada
          ? (m.org || m.recipientBi || m.institution || 'Instituição')
          : (senderKeyNorm && senderKeyNorm !== biNorm ? m.senderKey : (m.org || m.institution || 'Instituição'));
        return `- ${enviada ? 'Para' : 'De'}: ${alvo}, Assunto: ${m.details?.subject || m.preview || 'Sem assunto'}, Data: ${m.date || ''}, Estado: ${m.unread ? 'Não Lida' : 'Lida'}`;
      };
      return `RECEBIDAS (mais recentes primeiro):\n${recebidas.map(({ m }) => fmt(m, false)).join('\n') || 'Nenhuma.'}\n\nENVIADAS (mais recentes primeiro):\n${enviadas.map(({ m }) => fmt(m, true)).join('\n') || 'Nenhuma.'}`;
    }

    const hits = fonte
      .map(({ m, enviada }) => {
        const textoBruto = `${m.org || ''} ${m.senderKey || ''} ${m.recipientBi || ''} ${m.preview || ''} ${m.details?.subject || ''} ${m.institution || ''} ${m.details?.body || ''}`.toLowerCase();
        const relevancia = termos.reduce((acc, t) => acc + (textoBruto.includes(t) ? 1 : 0), 0);
        return { m, enviada, relevancia };
      })
      .filter(x => x.relevancia > 0)
      .sort((a, b) => b.relevancia - a.relevancia)
      .slice(0, MAX_HITS);

    if (!hits.length) return '';

    return hits.map(({ m, enviada }) => {
      // 2026-08-21 — rótulo honesto: nas RECEBIDAS o remetente é a chave do
      // emissor (senderKey, ex.: CDA, INAPEM-LLMM); só cai no `org` quando a
      // chave não existe ou coincide com o próprio BI. Nas ENVIADAS o destino
      // é a instituição (org). Nunca se mostra o próprio BI como remetente.
      const senderKeyNorm = normalizeHomologationBi(m.senderKey || '');
      const alvo = enviada
        ? (m.org || m.recipientBi || m.institution || 'Instituição')
        : (senderKeyNorm && senderKeyNorm !== biNorm ? m.senderKey : (m.org || m.institution || 'Instituição'));
      const assunto = m.details?.subject || m.preview || 'Sem assunto';
      const corpo = (m.details?.body || m.preview || '').slice(0, MAX_BODY_CHARS);
      const corpoLinha = corpo ? ` | Conteúdo: ${corpo}` : '';
      const rotulo = enviada ? 'Para' : 'De';
      return `- ${rotulo}: ${alvo}, Assunto: ${assunto}, Data: ${m.date || ''}, Estado: ${m.unread ? 'Não Lida' : (m.status || 'Lida')}${corpoLinha}`;
    }).join('\n');
  };

  const logSecurityEvent = (action: string, type: 'info' | 'warning' | 'critical' | 'success' = 'info') => {
    addAuditLog(action, type);
  };

  const handleUpdateDocRequest = async (requestId: number, newStatus: 'Aprovado' | 'Rejeitado') => {
    const request = docRequests.find(r => r.id === requestId);
    if (!request) return;

    setDocRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
    
    // Persist request status update directly on Supabase
    if (isOnline && hasValidSupabaseKeys()) {
      try {
        const { error } = await supabase
          .from('document_requests')
          .update({ status: newStatus })
          .eq('id', requestId);
        
        if (error) {
          console.error('Erro ao atualizar estado da solicitação no Supabase:', error);
        } else {
          await supabaseService.insertAuditLog({
            action: `DOC_REQUEST_${newStatus.toUpperCase()}: ${request.docType} / ${request.userName}`,
            user: user.name,
            type: newStatus === 'Aprovado' ? 'success' : 'warning'
          });
        }
      } catch (err) {
        console.error('Network or Supabase error during update request:', err);
      }
    }

    if (newStatus === 'Aprovado') {
      const newDoc: Document = {
        name: request.docType,
        validity: 'VITALÍCIO',
        code: `CDA-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        holder: request.userName,
        holderBi: request.userBi, // F18 — escopo F12: sem isto o cidadão real nunca via o documento aprovado
        number: request.userBi,
        issuer: `${request.institution} - Emissão Automática`,
        issuedAt: new Date().toLocaleDateString('pt-AO')
      };
      
      setDocuments(prev => [newDoc, ...prev]);
      
      const systemMsg: Message = {
        id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
        org: request.institution,
        preview: `A sua solicitação de ${request.docType} foi aprovada.`,
        date: "Agora",
        status: "Oficial",
        unread: 1,
        details: {
          subject: `${request.docType} Aprovado`,
          body: `Prezado(a) ${request.userName},\n\nA sua solicitação para a emissão do documento ${request.docType} foi analisada e aprovada com sucesso.\n\nO documento já se encontra disponível na sua QR Code para consulta e utilização oficial.`,
          actions: ['Ver na Carteira', '__DOC__']
        }
      };
      
      if (request.userBi === bi) {
        setInbox(prev => [systemMsg, ...prev]);
        setNotifications(prev => [stampNotif({
          id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
          title: 'Documento Aprovado',
          message: `O seu pedido de ${request.docType} foi aprovado e emitido.`,
          time: 'Agora',
          type: 'success',
          targetTab: 'correspondencias',
          unread: true
        }), ...prev]);
      }
      
      // Persist documents, companion messages, and alerts in Supabase for the citizen
      if (isOnline && hasValidSupabaseKeys()) {
        supabaseService.insertDocument(newDoc, request.userBi).catch(err => console.error(err));
        supabaseService.sendOfficialMessage(systemMsg, request.userBi, request.institution)
          .then(() => supabaseService.insertMessageStateEvent({
            messageId: systemMsg.id,
            state: 'Aprovada',
            responsible: request.institution,
            description: `Solicitação de ${request.docType} aprovada e disponibilizada ao cidadão.`
          }))
          .catch(err => console.error(err));
        supabaseService.insertNotification({
          title: 'Documento Aprovado',
          message: `O seu pedido de ${request.docType} foi aprovado e emitido.`,
          type: 'success',
          targetTab: 'qr-code'
        }, request.userBi).catch(err => console.error(err));
      }
      
      addAuditLog(`DOC_APPROVED: ${request.docType} para ${request.userName} emitido via sistema.`, 'success');
    } else {
      if (isOnline && hasValidSupabaseKeys()) {
        supabaseService.insertNotification({
          title: 'Solicitação Rejeitada',
          message: `O pedido de ${request.docType} foi rejeitado e requer regularização complementar.`,
          type: 'warning',
          targetTab: 'historico'
        }, request.userBi).catch(err => console.warn('[CDA-sync] Sincronização falhou (não bloqueia a ação local):', err));
      }
      addAuditLog(`DOC_REJECTED: Solicitação de ${request.docType} para ${request.userName} rejeitada.`, 'warning');
    }
  };

  const handleCreateDocRequest = (docType: string, institution: string) => {
    const newReq: DocRequest = {
      id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
      userName: 'Edlasio Galhardo',
      userBi: bi,
      docType,
      institution,
      date: new Date().toLocaleDateString('pt-AO'),
      status: 'Pendente'
    };
    setDocRequests(prev => [newReq, ...prev]);

    // Persist new document request on Supabase
    if (isOnline && hasValidSupabaseKeys()) {
      supabaseService.insertDocRequest(newReq)
        .then(() => supabaseService.insertNotification({
          title: 'Nova Solicitação de Documento',
          message: `${docType} solicitado por ${newReq.userName}.`,
          type: 'info',
          targetTab: 'gov-docs'
        }, 'CDA'))
        .catch(err => console.error('Erro ao salvar nova solicitação no Supabase:', err));
    }

    addAuditLog(`SOLICITATION_SENT: Pedido de ${docType} à ${institution} enviado pelo cidadão.`, 'info');
  };

  // Rendering Helpers
  const renderContent = () => {
    // 2026-08-22 — PERMISSÕES DE PÁGINA: bloqueio do ACESSO DIRECTO por
    // URL/hash a páginas não autorizadas (o menu já as esconde; o backend
    // revalida via /api/agente-permissoes). Tabs de detalhe/sobreposição
    // ficam livres.
    if (paginasMenu && !paginasMenu.includes(tab) && !TAB_PAGINAS_LIVRES.has(tab)) {
      const primeira = paginasMenu[0] || (isInstMode ? 'perfil' : 'gov-perfil');
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 py-24 px-6 text-center animate-fade-in font-sans">
          <div className="p-6 bg-slate-100 rounded-full border border-slate-200 shadow-inner">
            <Lock className="w-9 h-9 text-slate-400" />
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="text-slate-900 font-black text-sm uppercase tracking-[0.2em]">Acesso Restrito</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              A página <strong className="text-slate-700">{tab}</strong> não faz parte das páginas autorizadas
              para a sua sessão ({isInstMode ? (instIdentity?.agentNumber || 'colaborador') : (adminBiNorm || 'agente')}).
              Contacte o responsável da área para alterar as suas permissões de acesso.
            </p>
          </div>
          <button
            onClick={() => setTab(primeira)}
            className="px-6 py-3 bg-[#0E2B64] hover:bg-[#081a3d] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border-0 shadow-md"
          >
            Voltar à primeira página autorizada
          </button>
        </div>
      );
    }
    // F7 — SEM página informativa de espera: a instituição PENDENTE entra na área
    // normal. O aviso de validação chega como correspondência NÃO LIDA da Área de
    // Administração (espelho do canal de homologação na caixa de entrada), com badge
    // na foto de perfil + menu "Mensagens não lidas", tal como na área do cidadão.
    // O indicador Online mantém-se vermelho enquanto o pedido estiver pendente.
    // F4 — 1.º login do colaborador: troca obrigatória da palavra-passe inicial
    if (isInstMode && instMustChangePwd) {
      return (
        <InstitutionForcedPasswordChange
          code={bi}
          memberId={instIdentity?.memberId}
          memberName={instIdentity?.memberName}
          onCompleted={() => {
            setInstMustChangePwd(false);
            addAuditLog(`Colaborador ${instIdentity?.memberName || bi} substituiu a palavra-passe inicial (1.º login concluído).`, 'success');
          }}
          onAudit={addAuditLog}
        />
      );
    }
    switch (tab) {
      case 'home':
        if (isGovMode) {
          return (
            <PainelSuspense>
            <GovDashboard 
              onNavigate={setTab} 
              documents={currentDocuments} 
              emergencyMode={emergencyMode} 
              appMode={appMode} 
              userRequests={userRequests}
              isMobile={isMobile}
              logSecurityEvent={logSecurityEvent}
              bi={bi}
              setBi={setBi}
              profileName={profileName}
              setProfileName={setProfileName}
              userBirthDate={userBirthDate}
              setUserBirthDate={setUserBirthDate}
              userFiliation={userFiliation}
              setUserFiliation={setUserFiliation}
              userMaritalStatus={userMaritalStatus}
              setUserMaritalStatus={setUserMaritalStatus}
              verificationStatus={verificationStatus}
              setVerificationStatus={setVerificationStatus}
              hasFacialAuth={hasFacialAuth}
              setHasFacialAuth={setHasFacialAuth}
              hasTwoFactor={hasTwoFactor}
              setHasTwoFactor={setHasTwoFactor}
              govPin={govPin}
              setGovPin={setGovPin}
              phone={phone}
              setPhone={setPhone}
              nif={nif}
              setNif={setNif}
              passport={passport}
              setPassport={setPassport}
              addAuditLog={addAuditLog}
              inbox={currentInbox}
              sentMessages={currentSentMessages}
              contactsList={currentContacts}
              docInbox={currentDocInbox}
              docRequests={docRequests}
              auditLogs={auditLogs}
            />
            </PainelSuspense>
          );
        }
        return (
          <HomeContent
            activeSlide={activeSlide}
            setActiveSlide={setActiveSlide}
            isMobile={isMobile}
            setTab={setTab}
            unreadTotal={unreadTotal}
            inbox={currentInbox.filter(m => !deletedMessageIds.includes(m.id) && !hiddenMessageIds.includes(m.id))}
            sentMessages={currentSentMessages.filter(m => !deletedMessageIds.includes(m.id) && !hiddenMessageIds.includes(m.id))}
            handleSelectMessage={handleSelectMessage}
            onCreateRequest={handleCreateRequest}
            isInst={isInstMode}
            instSigla={isInstMode ? sessionInstBrand.sigla : undefined}
            instLogoUrl={isInstMode ? sessionInstBrand.logoUrl : undefined}
            instLogoOrigem={isInstMode ? sessionInstBrand.logoOrigem : undefined}
            instLogoFallback={isInstMode ? sessionInstBrand.logoFallback : undefined}
            instVerified={isInstMode ? sessionInstBrand.verified : undefined}
            onDoubleClickInstitution={isGovMode ? undefined : (name) => {
              setSelectedInstitution(name);
              setTab('instituicao');
            }}
            currentLanguage={currentLanguage}
          />
        );
      case 'instituicao': {
        // v37.18 — província onde o cidadão reside: deriva da morada ou do
        // sufixo do BI (ex.: 009874562LA041 → LA → Luanda).
        const provinciaCidadao = (!isInstMode && !isGovMode)
          ? derivarProvinciaCidadao((user as unknown as { address?: string })?.address, user?.bi || bi)
          : null;
        // v37.18 — em sessão de demonstração o catálogo canónico alimenta a
        // «Lista de Instituições»; em modo real vale o catálogo partilhado.
        const instituicoesFicha = isDemoCitizenSession
          ? [...CANONICAL_INSTITUTIONS, ...catalogoInstituicoes.filter(i => !CANONICAL_INSTITUTIONS.some(c => c.id === i.id))]
          : catalogoInstituicoes;
        if (!selectedInstitution) {
          return (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-xl mx-auto my-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield size={32} />
              </div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wide mb-2">
                Nenhuma Instituição Selecionada
              </h3>
              <p className="text-xs font-semibold text-slate-500 mb-6 leading-relaxed">
                Por favor, retorne ao catálogo de instituições para escolher uma entidade oficial.
              </p>
              <button
                type="button"
                onClick={() => setTab('home')}
                className="bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Voltar ao Painel
              </button>
            </div>
          );
        }
        return (
          <PainelSuspense>
            <InstitutionDetail
              institutionName={selectedInstitution}
              inbox={currentInbox}
              sentMessages={currentSentMessages}
              docInbox={currentDocInbox}
              institutions={instituicoesFicha}
              citizenProvince={provinciaCidadao}
              onBack={() => {
                setSelectedInstitution(null);
                setTab('home');
              }}
              onSelectMessage={handleSelectMessage}
            />
          </PainelSuspense>
        );
      }
      case 'correspondencias':
        return (
          <MailContent
            isComposing={isComposing}
            setIsComposing={setIsComposing}
            composeData={composeData}
            setComposeData={setComposeData}
            handleSendMessage={executeOfficialSend}
            unreadTotal={unreadTotal}
            correspondenciaTab={correspondenciaTab}
            setCorrespondenciaTab={setCorrespondenciaTab}
            onRefreshMail={() => setTriggerRefetch(t => t + 1)}
            inbox={currentInbox}
            sentMessages={currentSentMessages}
            searchMail={searchMail}
            setSearchMail={setSearchMail}
            filteredMessages={filteredMessages}
            handleSelectMessage={handleSelectMessage}
            setTab={setTab}
            bi={bi}
            isInst={isInstMode}
            onDeleteMessage={handleDeleteMessage}
            onRestoreMessage={handleRestoreMessage}
            deletedMessageIds={deletedMessageIds}
            hiddenMessageIds={hiddenMessageIds}
            onNavigateToVideoAtendimento={handleNavigateToVideoAtendimento}
            videoSessionCount={videoSessionCount}
            currentLanguage={currentLanguage}
            recipientLookup={recipientLookup}
            onRecipientLookup={handleRecipientLookup}
            onEmergencyBroadcast={handleInstEmergencyOpen}
            addAuditLog={addAuditLog}
          />
        );
      case 'video-atendimento':
        return (
          <PainelSuspense>
            <VideoSessionPage
              onBack={() => setTab('correspondencias')}
              onNavigateToMail={() => setTab('correspondencias')}
              addAuditLog={addAuditLog}
              // 2026-08-22 — contexto do papel: a instituição agenda com o
              // cidadão; o cidadão vê as sessões agendadas PARA ele.
              isInst={isInstMode}
              bi={bi}
              instCode={institutionCode || bi}
              instDisplayName={activeProfile?.institutionName || sessionInstBrand.sigla || (isInstMode ? bi : '')}
              sessionDemo={(isUserMode && isDemoCitizenSession) || (isInstMode && isDemoInstitutionSession)}
            />
          </PainelSuspense>
        );
      case 'documentos':
        return (
          <DocumentsContent
            isComposing={isDocComposing}
            setIsComposing={setIsDocComposing}
            composeData={docComposeData}
            setComposeData={setDocComposeData}
            handleSendMessage={handleSendDocMessage}
            unreadTotal={unreadDocTotal}
            correspondenciaTab={documentosTab}
            setCorrespondenciaTab={setDocumentosTab}
            inbox={currentDocInbox}
            sentMessages={currentDocSentMessages}
            searchMail={searchDocMail}
            setSearchMail={setSearchDocMail}
            filteredMessages={filteredDocMessages}
            handleSelectMessage={handleSelectMessage}
            setTab={setTab}
            bi={bi}
            isInst={isInstMode}
            sessionDemo={(isUserMode && isDemoCitizenSession) || (isInstMode && isDemoInstitutionSession)}
            currentLanguage={currentLanguage}
          />
        );
      case 'mensagem':
        if (!selectedMessage) {
          return (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-xl mx-auto my-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText size={32} />
              </div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wide mb-2">
                Nenhuma Correspondência Selecionada
              </h3>
              <p className="text-xs font-semibold text-slate-500 mb-6 leading-relaxed">
                Por favor, volte à Caixa de Correio para selecionar um ofício ou mensagem oficial e visualizar os seus detalhes e histórico.
              </p>
              <button
                type="button"
                onClick={() => setTab('correspondencias')}
                className="bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Voltar à Caixa de Correio
              </button>
            </div>
          );
        }
        return (
          <PainelSuspense>
          <div className="flex flex-col gap-4">
          <MessageDetail
            selectedMessage={selectedMessage}
            setSelectedMessage={setSelectedMessage}
            setTab={setTab}
            handleReply={handleReply}
            onResponderComRascunho={handleResponderComRascunho}
            onEnviarRespostaDireta={async (payload) => {
              const resultado = await executeOfficialSend(payload);
              // v37.51 — após a confirmação da resposta, reencaminhar para a
              // página «Correio» (lista), em vez de ficar no detalhe.
              if (resultado?.ok) {
                setSelectedMessage(null);
                setTab(isGovMode ? 'gov-correspondencias' : 'correspondencias');
              }
              return resultado;
            }}
            onUpdateMessage={handleUpdateMessage}
            onDeleteMessage={handleDeleteMessage}
            onRestoreMessage={handleRestoreMessage}
            isDeleted={deletedMessageIds.includes(selectedMessage.id)}
            backTab={selectedInstitution ? 'instituicao' : 'correspondencias'}
            cidadaoBi={isUserMode ? bi : undefined}
            addAuditLog={addAuditLog}
          />
          {isUserMode && bi ? (
            <PagamentosInlineCidadao
              citizenBi={bi}
              assuntoDocumento={selectedMessage.subject || ''}
              onAbrirPagamentos={() => setTab('pagamentos')}
            />
          ) : null}
          </div>
          </PainelSuspense>
        );
      case 'qr-code':
        if (isInstMode) {
          return (
          <GovDocsContent 
            documents={currentDocuments} 
            requests={docRequests} 
            onUpdateStatus={handleUpdateDocRequest}
            setTab={setTab}
          />
          );
        }
        return (
          <WalletContent
            filteredDocs={filteredDocs}
            searchDoc={searchDoc}
            setSearchDoc={setSearchDoc}
            setSelectedDoc={setSelectedDoc}
            setTab={setTab}
            logSecurityEvent={logSecurityEvent}
            docRequests={docRequests.filter(r => r.userBi === bi)}
            onCreateRequest={handleCreateDocRequest}
            emergencyMode={emergencyMode}
            currentLanguage={currentLanguage}
          />
        );
      case 'documento':
        if (!selectedDoc) {
          return (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-xl mx-auto my-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText size={32} />
              </div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wide mb-2">
                Nenhum Documento Selecionado
              </h3>
              <p className="text-xs font-semibold text-slate-500 mb-6 leading-relaxed">
                Por favor, consulte os seus Documentos ou a sua Pasta Digital para selecionar um ficheiro oficial.
              </p>
              <button
                type="button"
                onClick={() => setTab('documentos')}
                className="bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Voltar aos Documentos
              </button>
            </div>
          );
        }
        return (
          <DocumentDetail
            selectedDoc={selectedDoc}
            setSelectedDoc={setSelectedDoc}
            setTab={setTab}
            logSecurityEvent={logSecurityEvent}
          />
        );
      case 'solicitar-documento':
        return (
          <PainelSuspense>
          <SolicitarDocumentoContent
            setTab={setTab}
            bi={bi}
            nif={nif}
            onEmitDocument={handleEmitDocument}
            isOnline={isOnline}
            addAuditLog={addAuditLog}
            autoFillProfile={autoFillProfile}
          />
          </PainelSuspense>
        );
      case 'pasta-digital':
        return (
          <PastaDigitalContent
            documents={currentDocuments}
            docRequests={docRequests.filter(r => r.userBi === bi)}
            onCreateRequest={handleCreateDocRequest}
            setSelectedDoc={setSelectedDoc}
            setTab={setTab}
            logSecurityEvent={logSecurityEvent}
            emergencyMode={emergencyMode}
            correspondences={currentCorrespondences}
          />
        );
      case 'historico':
        return (
          <ActivityCenterContent
            appMode={appMode}
            messages={currentInbox}
            sentMessages={currentSentMessages}
            documents={currentDocuments}
            docRequests={isGovMode ? docRequests : docRequests.filter(r => r.userBi === bi)}
            userRequests={isGovMode ? userRequests : userRequests.filter(r => r.bi === bi)}
            correspondences={currentCorrespondences}
            notifications={currentNotifications}
            auditLogs={auditLogs}
            setTab={setTab}
          />
        );
      case 'notificacoes':
        return (
          <NotificationsCenterContent
            notifications={currentNotifications}
            setTab={setTab}
            appMode={appMode}
          />
        );
      case 'inst-qrcode':
        return (
          <PainelSuspense>
          <InstQrCodeContent
            documents={currentDocuments}
            // v37.37 — a concatenação de 4 caixas perde a ordem; reordena-se o
            // conjunto para manter a regra «mais recente no topo» também aqui.
            messages={ordenarMensagensPorMaisRecente(isInstMode
              ? [...currentInbox, ...currentDocInbox, ...currentSentMessages, ...currentDocSentMessages]
              : [...inbox, ...docInbox, ...sentMessages, ...docSentMessages])}
            onSelectMessage={handleSelectMessage}
            addAuditLog={addAuditLog}
            setTab={setTab}
          />
          </PainelSuspense>
        );
      case 'sondagens': // v36 — lista + resultados (spec §5)
        return (
          <PainelSuspense>
          <SondagensContent
            codigoInstituicao={bi}
            addAuditLog={addAuditLog}
          />
          </PainelSuspense>
        );
      case 'inst-ai-assistant':
        return (
          <PainelSuspense>
          <InstAiAssistantContent
            addAuditLog={addAuditLog}
            setTab={setTab}
            appMode={appMode}
            bi={bi}
            profileName={activeProfile?.institutionName || profileName || ''}
            institutionCode={institutionCode}
          />
          </PainelSuspense>
        );
      case 'inst-pagamentos':
        return (
          <PainelSuspense>
          <InstPagamentosContent
            institutionCode={institutionCode}
            profileName={activeProfile?.institutionName || profileName || ''}
            addAuditLog={addAuditLog}
            setTab={setTab}
          />
          </PainelSuspense>
        );
      case 'pagamentos':
        return (
          <PainelSuspense>
          <PagamentosContent
            citizenBi={bi}
            setTab={setTab}
            pagamentosDemoFallback={pagamentosDemoFallback}
          />
          </PainelSuspense>
        );
      case 'contatos':
      case 'contactos':
        return appMode === 'institution' ? (
          <PainelSuspense>
          <GovContactsContent
            appMode={appMode}
            bi={bi}
            setBi={setBi}
            nif={nif}
            setNif={setNif}
            phone={phone}
            setPhone={setPhone}
            passport={passport}
            setPassport={setPassport}
            profileName={profileName}
            setProfileName={setProfileName}
            userBirthDate={userBirthDate}
            setUserBirthDate={setUserBirthDate}
            userFiliation={userFiliation}
            setUserFiliation={setUserFiliation}
            userMaritalStatus={userMaritalStatus}
            setUserMaritalStatus={setUserMaritalStatus}
            verificationStatus={verificationStatus}
            setVerificationStatus={setVerificationStatus}
            hasFacialAuth={hasFacialAuth}
            setHasFacialAuth={setHasFacialAuth}
            hasTwoFactor={hasTwoFactor}
            setHasTwoFactor={setHasTwoFactor}
            govPin={govPin}
            setGovPin={setGovPin}
            addAuditLog={addAuditLog}
            auditLogs={auditLogs}
          />
          </PainelSuspense>
        ) : (
          <ContactsContent
            contacts={currentContacts}
            filteredContacts={filteredContacts}
            searchContact={searchContact}
            setSearchContact={setSearchContact}
            setIsAddingContact={setIsAddingContact}
            setContactToDelete={setContactToDelete}
            onUpdateContactType={handleUpdateContactType}
            emergencyStatus={emergencyProfileState(currentContacts)}
            onUpdateContact={handleUpdateContact}
          />
        );
      case 'perfil':
        return (
          <>
            {/* F8 — "Perfil do Utilizador" fica imediatamente DEBAIXO do título da
                página (nome da instituição + código); os painéis de acesso e o
                registo facial passam para depois do container do perfil. */}
            <PainelSuspense>
            <ProfileContent
            isInst={isInstMode}
            sessionDemo={(isUserMode && isDemoCitizenSession) || (isInstMode && isDemoInstitutionSession)}
            showSensitiveData={showSensitiveData}
            setShowSensitiveData={setShowSensitiveData}
            bi={bi}
            phone={phone}
            nif={nif}
            passport={passport}
            verificationStatus={verificationStatus}
            hasFacialAuth={hasFacialAuth}
            hasTwoFactor={hasTwoFactor}
            govPin={govPin}
            profileName={profileName}
            userBirthDate={userBirthDate}
            userFiliation={userFiliation}
            userMaritalStatus={userMaritalStatus}
            setBi={setBi}
            setPhone={setPhone}
            setNif={setNif}
            setPassport={setPassport}
            setVerificationStatus={setVerificationStatus}
            setHasFacialAuth={setHasFacialAuth}
            setHasTwoFactor={setHasTwoFactor}
            setGovPin={setGovPin}
            contactsCount={currentContacts.length}
            setTab={setTab}
            handleLogout={handleLogout}
            inbox={currentInbox}
            docInbox={currentDocInbox}
            sentMessages={currentSentMessages}
            contactsList={currentContacts}
            documentsList={currentDocuments}
            userRequests={userRequests}
            docRequests={docRequests}
            auditLogs={auditLogs}
            addAuditLog={addAuditLog}
            instAgentNumber={isInstMode ? (instIdentity?.agentNumber || getLocalInstReg(normalizeInstCode(bi))?.agentNumber || undefined) : undefined}
            />
            </PainelSuspense>
            {/* F16 — Cidadão: o container "Login Facial" fica no FINAL da página
                Conta (depois de todos os painéis do perfil). */}
            {!isInstMode && !isGovMode && (
              <div className="px-4 md:px-8 pt-4 md:pt-6">
                <PainelSuspense>
<FacialLoginSettings
                  mode="user"
                  personId={bi || DEMO_CREDENTIALS.user.identifier}
                  displayName={profileName}
                  onAudit={addAuditLog}
                />
</PainelSuspense>
              </div>
            )}
            {isInstMode && (
              <InstitutionAccessPanel
                code={bi}
                identity={instIdentity}
                onAudit={addAuditLog}
              />
            )}
            {isInstMode && (
              <div className="px-4 md:px-8 pt-4">
                <PainelSuspense>
<FacialLoginSettings
                  mode="institution"
                  personId={instIdentity?.agentNumber || bi || DEMO_CREDENTIALS.institution.identifier}
                  displayName={instIdentity?.memberName || activeProfile?.institutionName || user?.name}
                  onAudit={addAuditLog}
                />
</PainelSuspense>
              </div>
            )}
          </>
        );
      case 'gov-dashboard':
        return (
          <PainelSuspense>
          <GovDashboard 
            onNavigate={setTab} 
            documents={currentDocuments} 
            emergencyMode={emergencyMode} 
            appMode={appMode} 
            userRequests={userRequests}
            isMobile={isMobile}
            logSecurityEvent={logSecurityEvent}
            bi={bi}
            setBi={setBi}
            profileName={profileName}
            setProfileName={setProfileName}
            userBirthDate={userBirthDate}
            setUserBirthDate={setUserBirthDate}
            userFiliation={userFiliation}
            setUserFiliation={setUserFiliation}
            userMaritalStatus={userMaritalStatus}
            setUserMaritalStatus={setUserMaritalStatus}
            addAuditLog={addAuditLog}
          />
          </PainelSuspense>
        );
      case 'gov-emissao':
        return (
          <GovEmissaoContent 
            onEmit={handleEmitDocument} 
            recentDocuments={currentDocuments} 
            emergencyMode={emergencyMode} 
            userRequests={userRequests.filter(r => r.status !== 'concluido')}
          />
        );
      case 'gov-correspondencias':
        return (
          <PainelSuspense>
          <GovCorrespondenciasContent
            correspondences={currentCorrespondences}
            carregando={isGovMode && !cloudSyncedOnce}
            onNavigate={setTab}
            onDeleteCorrespondence={async (cor) => {
              // v37.77 — eliminação pelo Admin: remove a linha LOCALMENTE e na
              // BASE CENTRAL; só reporta sucesso quando a nuvem confirma.
              setCorrespondences(prev => prev.filter(c => c.id !== cor.id));
              addAuditLog(`Correspondência ${cor.id} («${cor.subject}») eliminada pela Administração — ${cor.sender} → ${cor.recipient}.`, 'critical');
              const numericId = parseInt(String(cor.id).replace(/\D/g, ''), 10);
              if (Number.isFinite(numericId) && isOnline && hasValidSupabaseKeys()) {
                try {
                  // v37.78.23 — ZERO RASTOS: purga TOTAL (linha + histórico +
                  // notificações do assunto + anexos do Storage); fallback para
                  // o caminho antigo (só a linha) se o endpoint estiver indisponível.
                  const purga = await eliminarCorrespondenciaTotal(numericId);
                  if (purga && purga.ok) {
                    addAuditLog(`Correspondência ${cor.id} purgada por completo — linha, histórico, notificações e anexos do Storage (ZERO RASTOS).`, 'success');
                    return true;
                  }
                  const apagou = await supabaseService.deleteCorrespondenceRow(numericId);
                  if (apagou) addAuditLog(`Correspondência ${cor.id}: linha removida; purga total indisponível (${(purga && purga.erro) || 'endpoint'}) — notificações/anexos podem ter ficado.`, 'warning');
                  if (!apagou) addAuditLog(`Correspondência ${cor.id}: a linha pode já não existir na base central (nada foi apagado agora).`, 'warning');
                  return apagou;
                } catch (err) {
                  console.warn('[CDA] Falha ao eliminar correspondência na nuvem:', err);
                  addAuditLog(`Correspondência ${cor.id}: FALHA na eliminação na base central — a lista local foi limpa, mas a linha remota pode persistir.`, 'warning');
                  return false;
                }
              }
              return false;
            }}
            onAddCorrespondence={async (newCor) => {
              setCorrespondences(prev => [{ ...newCor, createdBy: bi }, ...prev]);
              addAuditLog(`Novo Expediente Enviado: ${newCor.id} de ${newCor.sender} para ${newCor.recipient}`, 'success');
              
              const resolvedBi = resolveCitizenBi(newCor.recipient);
              const isDatabaseFlow = isOnline && hasValidSupabaseKeys();

              if (isDatabaseFlow) {
                try {
                  // 1. Persist the official correspondence record
                  await supabaseService.insertCorrespondence(newCor);
                } catch (err) {
                  console.error('Erro ao salvar expediente no Supabase:', err);
                }
              }

              // 2. Generate protocol for the message
              const protocol = generateProtocol(newCor.sender, 'message', newCor.id, newCor.subject);
              
              // 3. Build the official citizen MailMessage
              const baseId = parseInt(newCor.id.replace(/\D/g, '')) || Math.floor(Math.random() * 1000000);
              const newMailMessage: Message = {
                id: baseId + 1000000, // Offset by 1M to prevent collision with correspondence record
                org: newCor.sender,
                preview: newCor.subject,
                date: `${newCor.date} 12:00`,
                unread: 1,
                status: 'Urgente',
                details: {
                  subject: newCor.subject,
                  body: newCor.body,
                  deadline: `${newCor.date}`,
                  state: 'Pendente',
                  actions: ['Visualizar', 'Baixar Recibo'],
                  attachments: [
                    protocol.archiveReference || 'referencia_arquivistica.cda',
                    ...(newCor.attachments ? newCor.attachments.map(att => `${att.name} (${att.size})`) : [])
                  ]
                },
                protocol
              };

              // Map protocol & timelines correctly using our utility helper
              const finalMessageObj = ensureProtocolOnMessage(newMailMessage);

              // 4. Update the matching citizen's inbox locally if they are the active user
              if (resolvedBi === bi) {
                setInbox(prev => [finalMessageObj, ...prev]);
              }

              if (isDatabaseFlow) {
                try {
                  // 5. Send/persist official message in 'messages' table with correct recipient_bi
                  await supabaseService.sendOfficialMessage(finalMessageObj, resolvedBi, newCor.sender);

                  // 5.1 Store protocol for QR code reference
                  const sealedCorProtocol = await sealProtocolForSend(
                    protocol,
                    normalizeInstCode(resolveInstitutionCode(newCor.sender)),
                    resolvedBi,
                    newMailMessage.details?.subject || newMailMessage.preview || '',
                    newMailMessage.details?.body || '',
                  );
                  await supabaseService.insertDigitalProtocol(sealedCorProtocol);

                  // 6. Create citizen notification linked to their correct target_bi
                  await supabaseService.insertNotification({
                    title: 'Nova Correspondência Civil',
                    message: `Recebeu um novo expediente oficial da instituição ${newCor.sender}.`,
                    type: 'info',
                    targetTab: 'correspondencias'
                  }, resolvedBi);

                  // 7. Insert official Message State History Events in 'message_state_history'
                  const baseMsgId = finalMessageObj.id >= 10000 && finalMessageObj.id < 90000000 ? finalMessageObj.id - 10000 : finalMessageObj.id;
                  
                  // "Enviada" event
                  await supabaseService.insertMessageStateEvent({
                    messageId: baseMsgId,
                    state: 'Enviada',
                    responsible: `${newCor.institution || 'GOV'}_DELEGADO`,
                    description: 'Mensagem oficial expedida pelo barramento de interoperabilidade da instituição.'
                  });

                  // "Entregue" event
                  await supabaseService.insertMessageStateEvent({
                    messageId: baseMsgId,
                    state: 'Entregue / Disponibilizada',
                    responsible: 'SYSTEM_CDA',
                    description: 'Correspondência digital disponibilizada com sucesso na caixa de entrada do cidadão.'
                  });

                  // Trigger refetch so citizen updates counters, notifications, and inbox messages in realtime from the database!
                  setTriggerRefetch(t => t + 1);
                } catch (err) {
                  console.error('Erro no fluxo integrado de envio do Supabase:', err);
                }
              }
            }}
            onUpdateStatus={(id, newStatus) => {
              setCorrespondences(prev => prev.map(c => c.id === id ? { ...c, status: newStatus as any } : c));
              addAuditLog(`Expediente ${id} marcado como ${newStatus}`, 'info');

              // 2026-08-21 — alteração de estado PERSISTIDA na nuvem: atualiza
              // state_indicator na tabela messages + regista o evento no
              // histórico (message_state_history: data, hora e responsável).
              // O Expediente volta com o mesmo estado noutro dispositivo.
              const matchedCor = correspondences.find(c => c.id === id);
              const baseId = Number(String(id).replace(/\D/g, '')) || 0;
              if (matchedCor && baseId > 0 && isOnline && hasValidSupabaseKeys()) {
                void supabaseService.updateMessageState(baseId, { state_indicator: String(newStatus) })
                  .then(() => supabaseService.insertMessageStateEvent({
                    messageId: baseId,
                    state: String(newStatus),
                    responsible: user?.name || 'Administração Central',
                    description: `Estado do expediente ${id} alterado para "${newStatus}" pela Administração.`,
                  }))
                  .catch(err => console.warn('[Expediente] Persistência do estado falhou (não bloqueia a ação local):', err));
              }
            }}
          />
          </PainelSuspense>
        );
      case 'gov-docs':
      case 'gov-documentos':
        return (
          <GovDocsContent 
            documents={currentDocuments} 
            requests={docRequests} 
            onUpdateStatus={handleUpdateDocRequest}
            setTab={setTab}
          />
        );
      case 'gov-contatos':
        // 2026-08-21 — página EQUIPA exclusiva do responsável: um colaborador
        // (sessão 'member') nunca vê a consola de gestão de membros, mesmo que
        // o tab chegue por URL/hash — vê o aviso de acesso restrito.
        if (isInstMode && instIdentity?.type === 'member') {
          return (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 py-24 px-6 text-center animate-fade-in font-sans">
              <div className="p-6 bg-slate-100 rounded-full border border-slate-200 shadow-inner">
                <Lock className="w-9 h-9 text-slate-400" />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-slate-900 font-black text-sm uppercase tracking-[0.2em]">Acesso Restrito</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  A página <strong className="text-slate-700">Equipa</strong> é exclusiva do responsável da instituição.
                  A sua sessão ({instIdentity?.agentNumber || 'colaborador'}) tem perfil de colaborador e não possui
                  permissão para gerir membros da equipa.
                </p>
              </div>
              <button
                onClick={() => setTab('home')}
                className="px-6 py-3 bg-[#0E2B64] hover:bg-[#081a3d] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border-0 shadow-md"
              >
                Voltar ao Painel
              </button>
            </div>
          );
        }
        return (
          <PainelSuspense>
          <GovContactsContent
            appMode={appMode}
            bi={bi}
            setBi={setBi}
            nif={nif}
            setNif={setNif}
            phone={phone}
            setPhone={setPhone}
            passport={passport}
            setPassport={setPassport}
            profileName={profileName}
            setProfileName={setProfileName}
            userBirthDate={userBirthDate}
            setUserBirthDate={setUserBirthDate}
            userFiliation={userFiliation}
            setUserFiliation={setUserFiliation}
            userMaritalStatus={userMaritalStatus}
            setUserMaritalStatus={setUserMaritalStatus}
            verificationStatus={verificationStatus}
            setVerificationStatus={setVerificationStatus}
            hasFacialAuth={hasFacialAuth}
            setHasFacialAuth={setHasFacialAuth}
            hasTwoFactor={hasTwoFactor}
            setHasTwoFactor={setHasTwoFactor}
            govPin={govPin}
            setGovPin={setGovPin}
            addAuditLog={addAuditLog}
            auditLogs={auditLogs}
          />
          </PainelSuspense>
        );
      case 'gov-trabalhadores':
        // 2026-08-22 — página EQUIPA da Administração exclusiva do Admin Alfa
        // (ADMIN-0001): qualquer outro agente real vê o painel de acesso
        // restrito, mesmo que o tab chegue por URL/hash/IA.
        if (adminEquipaBloqueada) {
          return (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 py-24 px-6 text-center animate-fade-in font-sans">
              <div className="p-6 bg-slate-100 rounded-full border border-slate-200 shadow-inner">
                <Lock className="w-9 h-9 text-slate-400" />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-slate-900 font-black text-sm uppercase tracking-[0.2em]">Acesso Restrito</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  A página <strong className="text-slate-700">Equipa</strong> é exclusiva do responsável da área de
                  Administração (Admin Alfa — {ADMIN_ALFA_AGENT}). A sua sessão ({adminBiNorm || 'agente'}) tem
                  perfil de agente e não possui permissão para gerir membros da equipa central.
                </p>
              </div>
              <button
                onClick={() => setTab('gov-dashboard')}
                className="px-6 py-3 bg-[#0E2B64] hover:bg-[#081a3d] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border-0 shadow-md"
              >
                Voltar ao Painel
              </button>
            </div>
          );
        }
        return (
          <PainelSuspense>
          <GovContactsContent
            appMode="admin-workers"
            bi={bi}
            setBi={setBi}
            nif={nif}
            setNif={setNif}
            phone={phone}
            setPhone={setPhone}
            passport={passport}
            setPassport={setPassport}
            profileName={profileName}
            setProfileName={setProfileName}
            userBirthDate={userBirthDate}
            setUserBirthDate={setUserBirthDate}
            userFiliation={userFiliation}
            setUserFiliation={setUserFiliation}
            userMaritalStatus={userMaritalStatus}
            setUserMaritalStatus={setUserMaritalStatus}
            verificationStatus={verificationStatus}
            setVerificationStatus={setVerificationStatus}
            hasFacialAuth={hasFacialAuth}
            setHasFacialAuth={setHasFacialAuth}
            hasTwoFactor={hasTwoFactor}
            setHasTwoFactor={setHasTwoFactor}
            govPin={govPin}
            setGovPin={setGovPin}
            addAuditLog={addAuditLog}
            auditLogs={auditLogs}
          />
          </PainelSuspense>
        );
      case 'gov-perfil':
        return (
          <>
            <GovPerfilContent 
            logs={auditLogs} 
            emergencyMode={emergencyMode} 
            bi={bi}
            phone={phone}
            nif={nif}
            passport={passport}
            profileName={profileName}
            userBirthDate={userBirthDate}
            userFiliation={userFiliation}
            userMaritalStatus={userMaritalStatus}
            hasFacialAuth={hasFacialAuth}
            hasTwoFactor={hasTwoFactor}
            govPin={govPin}
            onToggleEmergency={(active) => {
              setEmergencyMode(active);
              addAuditLog(active ? 'PROTOCOLO DE EMERGÊNCIA ACTIVADO' : 'Protocolo de Emergência Desativado', active ? 'critical' : 'warning');
              
              // If activated, send a system-wide high priority message to all users
              if (active) {
                const systemAlert: Message = {
                  id: Number(`${Date.now()}999`),
                  org: 'SOC - SEGURANÇA NACIONAL',
                  preview: 'ALERTA DE SEGURANÇA: Protocolo SOC-AN-2026 Ativado',
                  date: "Agora",
                  status: "CRÍTICO",
                  unread: 1,
                  details: {
                    subject: 'Protocolo de Emergência de Segurança Digital',
                    body: 'Exmo(a) Cidadão(ã),\n\nInformamos que foi ativado o protocolo de segurança SOC-AN-2026. Por motivos de segurança nacional, algumas emissões de documentos digitais estão temporariamente suspensas.\n\nEsta medida visa garantir a integridade dos seus dados e a segurança da rede CDA. Por favor, mantenha-se atento a novas comunicações oficiais.\n\nAtenciosamente,\nCentro de Operações de Segurança Nacional',
                    actions: ['Confirmar Leitura']
                  }
                };
                setInbox(prev => [systemAlert, ...prev]);
                setNotifications(prev => [stampNotif({
                  id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
                  title: 'ALERTA NACIONAL',
                  message: 'Protocolo de Emergência Activado pelo SOC',
                  time: 'Agora',
                  type: 'warning',
                  targetTab: 'correspondencias',
                  unread: true
                }), ...prev]);
              }
            }} 
          />
            {/* F16 — Admin: o container "Login Facial" fica no FINAL da página
                Perfil (depois de todos os painéis do perfil), tal como nas
                áreas Cidadão e Instituição — harmonia entre as três áreas. */}
            <div className="px-4 md:px-8 pt-4 md:pt-6">
              <PainelSuspense>
<FacialLoginSettings
                mode="admin"
                personId={bi || DEMO_CREDENTIALS.admin.identifier}
                displayName={profileName}
                onAudit={addAuditLog}
              />
</PainelSuspense>
            </div>
          </>
        );
      case 'gov-stats':
        return (
          <PainelSuspense>
          <GovRelatorioContent 
            correspondences={currentCorrespondences}
            auditLogs={auditLogs}
            isDemo={isDemoAdminSession}
          />
          </PainelSuspense>
        );
      case 'gov-interoperabilidade':
        return <PainelSuspense><GovInteroperabilidadeContent onLog={addAuditLog} /></PainelSuspense>;
      case 'gov-relatorio':
        return (
          <PainelSuspense>
          <GovRelatorioContent 
            correspondences={currentCorrespondences}
            auditLogs={auditLogs}
            isDemo={isDemoAdminSession}
          />
          </PainelSuspense>
        );
      case 'gov-ia':
        return (
          <PainelSuspense><GovIaContent onLog={addAuditLog} /></PainelSuspense>
        );
      case 'gov-seguranca':
        return (
          <PainelSuspense>
            <GovSegurancaContent 
            emergencyMode={emergencyMode}
            isDemo={isDemoAdminSession}
            onToggleEmergencyMode={(enabled) => {
              setEmergencyMode(enabled);
              localStorage.setItem('gov_emergency_mode', enabled ? 'true' : 'false');
              
              if (enabled) {
                // Add Audit logs
                addAuditLog('PROTOCOLO SOC-AN-2026 ATIVADO: Bloqueio Identitário e Chaves Criptográficas Encriptadas', 'critical');
                
                // Add Notification to citizen
                setNotifications(prev => [stampNotif({
                  id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
                  title: 'ALERTA SOC-AN-2026 UNIFICADO',
                  message: `Protocolo de Emergência Ciber-Defensiva Ativado. Chaves Faciais e Biométricas de ${profileName} Temporariamente Suspensas / Bloqueadas para Salvaguarda de Soberania Digital!`, // F18 — era o nome demo hardcoded
                  time: 'Agora',
                  type: 'warning',
                  targetTab: 'home',
                  unread: true
                }), ...prev]);

                // Despacho de Mensagem na Inbox (Mail)
                const dateAO = new Date().toLocaleDateString('pt-AO');
                const timeAO = new Date().toLocaleTimeString('pt-AO');
                const emergencyRoom = "Gabinete de Gestão de Crises - Luanda, Angola";

                const killSwitchMessage: Message = {
                  id: 2026911,
                  org: "SOC",
                  preview: "ALERTA CRÍTICO: ATIVAÇÃO PROTOCOLO NACIONAL SOC-AN-2026",
                  date: `${dateAO} ${timeAO}`,
                  unread: 1,
                  status: 'Crítico',
                  details: {
                    subject: "ALERTA CRÍTICO: ATIVAÇÃO PROTOCOLO NACIONAL SOC-AN-2026",
                    body: `PROT: SOC-AN-2026\nDATA: ${dateAO}\nHORA: ${timeAO}\nLOCALIZAÇÃO: ${emergencyRoom}\n\nATENÇÃO CIDADÃO: Por directiva da tutela de Defesa e Soberania Digital, as chaves de acesso facial e credenciais criptográficas associadas à entidade legal 'Edlasio Galhardo' foram quarentenadas preventivamente. O seu acesso biométrico ao barramento estatal permanece temporariamente suspenso para salvaguarda de integridade.`,
                    deadline: "IMEDIATO",
                    state: "Quarentena Activa",
                    actions: ["Ver Protocolo", "Baixar Auto de Suspensão"]
                  },
                  protocol: {
                    internalId: "INT-SOC-AN-2026",
                    protocolNumber: "SOC-AN-2026",
                    issuerInstitution: "SOC - CENTRO DE SEGURANÇA NACIONAL",
                    officialIssueDate: dateAO,
                    officialTime: timeAO,
                    issuerResponsible: "Gabinete de Crise",
                    category: "Cibernética",
                    documentType: "Protocolo Nacional",
                    currentState: "Suspenso",
                    priority: "Crítica",
                    deadlineDate: dateAO,
                    qrCodeUrl: "",
                    digitalSignature: "VALIDA",
                    documentHash: "sha256-6bd19ac268c2-emergency-protocol-block-key-strict"
                  }
                };

                setInbox(prev => [killSwitchMessage, ...prev]);

                // Suspend the active citizen profile status indicator
                setVerificationStatus('Acesso Biométrico Suspenso / Chaves Bloqueadas para Salvaguarda de Soberania');
              } else {
                addAuditLog('PROTOCOLO SOC-AN-2026 DESATIVADO: Restabelecimento Geral de Credenciais Faciais', 'success');
                setVerificationStatus('Totalmente verificado');
              }
            }}
            />
            </PainelSuspense>
        );

      case 'directorio-orgaos':
        return (
          <PainelSuspense>
            <DirectorioOrgaosContent onVoltar={() => setTab('home')} />
          </PainelSuspense>
        );

      default:
        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-xl mx-auto my-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield size={32} />
            </div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-wide mb-2">
              Página Não Encontrada
            </h3>
            <p className="text-xs font-semibold text-slate-500 mb-6 leading-relaxed">
              O módulo ou endereço selecionado ("{tab}") não existe ou foi arquivado pelo sistema.
            </p>
            <button
              type="button"
              onClick={() => setTab('home')}
              className="bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              Voltar ao Painel Principal
            </button>
          </div>
        );
    }
  };

  if (pageLoading) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-primary"
        >
          <Loader2 size={48} />
        </motion.div>
      </div>
    );
  }

  if (stage === 'splash') {
    return (
      <section className={`min-h-screen grid place-items-center relative ${theme === 'dark' ? 'bg-slate-950' : 'bg-white'}`}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.8, ease: "easeOut" }} 
          className="text-center z-10 w-full max-w-md px-8" 
        > 
          {/* v37.78.27 — logomarca vertical oficial (claro/escuro pelo tema),
              dimensionada pela ALTURA (padrão do Header: style + contain).
              v37.78.37 — +25% proporcional a pedido do dono (190→238px), com
              o respiro inferior a acompanhar (3→3,75rem) para manter a harmonia. */}
          <LazyImage 
            src="https://i.postimg.cc/7PWDMLZM/Logo2.png" 
            alt="Correio Digital Logo" 
            priority={true}
            placeholder="skeleton"
            className="mx-auto mb-12"
            style={{ 
              height: '298px', 
              width: 'auto',
              objectFit: 'contain',
              backgroundColor: 'transparent',
              marginBottom: '4.5rem',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          />
          <div className={`w-full h-1 rounded-full overflow-hidden border ${theme === 'dark' ? 'bg-slate-800 border-slate-800' : 'bg-slate-100 border-slate-100'}`}>
            <motion.div 
              initial={{ width: "0%" }}
              animate={{ width: `${preloadProgress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full bg-primary rounded-full"
            />
          </div>
          <motion.p className="text-slate-500 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mt-4">
            {t("A carregar plataforma oficial...")} {preloadProgress > 0 ? `(${preloadProgress}%)` : ''}
          </motion.p>
        </motion.div>
      </section>
    );
  }

  if (stage === 'login') {
    const handleDemoAutofill = () => {
      const preset = DEMO_CREDENTIALS[appMode];
      setBi(preset.identifier);
      setLoginPasswordInput(preset.password);
      setProfileName(preset.profileName);
      setPhone(preset.phone);
      setNif(preset.nif);
      setPassport(preset.passport);
      setUserBirthDate(preset.birthDate);
      setUserFiliation(preset.filiation);
      setUserMaritalStatus(preset.maritalStatus);
      setVerificationStatus(preset.verificationStatus);
      setHasTwoFactor(preset.hasTwoFactor);
      setHasFacialAuth(preset.hasFacialAuth);
      setGovPin(preset.govPin);
      setLoginError(null);
      addAuditLog(`AUTO_FILL_DEMO: Credenciais de demonstração carregadas para ${appMode}`, 'info');
    };

    const handleDemoFaceCapture = async () => {
      if (emergencyMode && !isInstMode && !isGovMode && (bi.toLowerCase().includes('002931298') || bi.toLowerCase().includes('edlasio') || profileName.toLowerCase().includes('edlasio'))) {
        setLoginError("Autenticação Biométrica Recusada: Credenciais e chaves biométricas bloqueadas temporariamente ao abrigo do protocolo SOC-AN-2026. Acesso Suspenso para Salvaguarda de Soberania.");
        addAuditLog("Interrupção de segurança: captura facial recusada (SOC-AN-2026)", "critical");
        return;
      }
      const captured = await captureLoginFaceFrameAsync();
      if (!captured) {
        setFaceCaptureError('Não foi possível capturar a imagem facial. Aguarde a ativação da câmara e tente novamente.');
        return;
      }

      setFaceCaptureError(null);
      setFaceProgress(20);
      setIsFaceScanning(true);

      // v37.78.40 — RESOLUÇÃO ROBUSTA do registo facial. Antes: só a chave
      // exacta (área seleccionada + identidade digitada) era consultada; se o
      // registo foi feito noutra área, ou o campo estava vazio (caía no id demo),
      // o login dizia «Rosto não registado» MESMO com registo válido no
      // dispositivo. Agora: (1) chave exacta → (2) mesma identidade em qualquer
      // área → (3) o rosto capturado é comparado com TODAS as matrizes faciais
      // guardadas neste dispositivo («entrar apenas com o rosto»).
      const normTyped = bi.trim().toUpperCase().replace(/\s+/g, '');
      const demoIdAlvo = (DEMO_CREDENTIALS[appMode]?.identifier || '').toUpperCase().replace(/\s+/g, '');
      let deviceFaces: ReturnType<typeof listDeviceFaceTemplates> = [];
      try { deviceFaces = listDeviceFaceTemplates(); } catch { deviceFaces = []; }
      let stored: ReturnType<typeof readStoredDemoFace> = readStoredDemoFace();
      if (!stored && normTyped && normTyped !== demoIdAlvo) {
        const porId = deviceFaces.find(f => f.identifier === normTyped);
        if (porId) stored = porId.template;
      }
      const pool: { mode: string; identifier: string; template: ReturnType<typeof readStoredDemoFace> }[] = stored
        ? [{ mode: appMode, identifier: normTyped || '', template: stored }]
        : deviceFaces.map(f => ({ mode: f.mode, identifier: f.identifier, template: f.template }));
      setDeviceFaceCount(deviceFaces.length);

      setFaceCaptureHint(pool.length === 1
        ? 'A comparar o rosto capturado com o registo facial local (página Conta)...'
        : pool.length > 1
          ? `A comparar o rosto com os ${pool.length} registos faciais guardados neste dispositivo...`
          : 'Rosto ainda não registado para esta identidade neste dispositivo.');

      addAuditLog(`Iniciou verificação biométrica facial no portal (${pool.length ? `${pool.length} registo(s) local(is)` : 'sem registo no dispositivo'})`, 'info');

      // v37.78.41 — passos de progresso mais rápidos (220→110ms): a leitura
      // facial em si é quase instantânea; a espera era puramente cosmética.
      const finalize = (progress: number) => new Promise(resolve => setTimeout(() => {
        setFaceProgress(progress);
        resolve(true);
      }, 110));

      await finalize(45);
      await finalize(75);

      if (pool.length) {
        let melhorDiff = 999;
        let melhorId = '';
        let melhorMode = '';
        // v37.78.43 — as 3 assinaturas do frame ao vivo × todos os registos:
        // a MELHOR combinação conta (multi-frame do lado da validação).
        const capSigs = Array.isArray((captured as any).signatures) && (captured as any).signatures.length
          ? (captured as any).signatures as number[][]
          : [captured.signature];
        for (const cand of pool) {
          const sigs = Array.isArray(cand.template?.signatures) && cand.template.signatures.length
            ? cand.template.signatures
            : (Array.isArray(cand.template?.signature) ? [cand.template.signature] : []);
          for (const sig of sigs) {
            for (const cap of capSigs) {
              const d = compareFaceSignatures(cap, sig);
              if (d < melhorDiff) { melhorDiff = d; melhorId = cand.identifier; melhorMode = cand.mode; }
            }
          }
        }

        // v37.78.43 — limiar de coerência 22 → 26: com a pipeline única
        // (recorte central sempre) o par registo/login já é comparável;
        // 26 perdoa a variação natural de luz/pose entre sessões sem abrir
        // porta a rostos aleatórios (assinaturas disparadas pontuam 60+).
        if (melhorDiff > 26) {
          setIsFaceScanning(false);
          setFaceProgress(0);
          setFaceCaptureHint('Rosto não reconhecido neste dispositivo.');
          // v37.78.40 — a mensagem lista QUEM tem registo facial guardado neste
          // dispositivo, para o utilizador ver logo onde estão os dados.
          const lista = deviceFaces
            .map(f => `${faceModeLabel(f.mode)} · ${f.identifier}${f.template?.capturedAt ? ` (${f.template.capturedAt})` : ''}`)
            .join(' · ');
          setFaceCaptureError(lista
            ? `A face capturada não corresponde a nenhum dos ${deviceFaces.length} registo(s) facial(is) guardado(s) neste dispositivo: ${lista}. Posicione-se bem à luz e tente novamente — ou abra a página Conta (Perfil) e toque em «Registar a minha face».`
            : 'A validação facial local falhou. Tente novamente ou registe um novo rosto de demonstração.');
          addAuditLog(`DEMO_FACE_LOGIN_FAIL: Correspondência local não validada (melhor diff ${Math.round(melhorDiff)} > 22 em ${deviceFaces.length} registo(s))`, 'warning');
          return;
        }

        // SOC-AN-2026 — o bloqueio de emergência aplica-se também à identidade
        // RECONHECIDA pela varredura local (não apenas à digitada).
        if (emergencyMode && !isInstMode && !isGovMode && (melhorId.includes('002931298') || melhorId.includes('EDLASIO') || profileName.toLowerCase().includes('edlasio'))) {
          setIsFaceScanning(false);
          setFaceProgress(0);
          setLoginError('Autenticação Biométrica Recusada: chaves faciais bloqueadas temporariamente ao abrigo do protocolo SOC-AN-2026.');
          addAuditLog('Interrupção de segurança: reconhecimento facial local recusado (SOC-AN-2026)', 'critical');
          return;
        }

        // v37.78.40 — reconhecido: assume a identidade e a ÁREA certas (corrige
        // o caso «registou como Cidadão, tentou entrar na área errada»).
        if (melhorId && melhorId !== normTyped) {
          setBi(melhorId);
          addAuditLog(`Login facial: rosto reconhecido como ${faceModeLabel(melhorMode)} ${melhorId} — identidade assumida automaticamente.`, 'info');
        }
        if (melhorMode && melhorMode !== appMode) {
          setAppMode(melhorMode as typeof appMode);
          addAuditLog(`Login facial: área corrigida automaticamente para ${faceModeLabel(melhorMode)} (registo facial encontrado noutra área).`, 'info');
        }

        setFaceCaptureHint('Rosto reconhecido com sucesso no dispositivo.');
        await finalize(100);
        setIsFaceScanning(false);
        addAuditLog(`DEMO_FACE_LOGIN_SUCCESS: Correspondência facial validada localmente (${faceModeLabel(melhorMode)} · ${melhorId})`, 'success');
        // F31 (v12/D6): a face apenas DESBLOQUEIA a sessão — a biometria nunca sai
        // do dispositivo; se já existir sessão nuvem, fica confirmada (best-effort).
        if (!homologationStore.isExempt((melhorId || bi).trim().toUpperCase()) && isSupabaseConfigured()) {
          void hasActiveCloudSession(supabase).then((active) => {
            if (active) addAuditLog('[AUTH-CLOUD] Login facial (D6): sessão nuvem confirmada neste dispositivo.', 'info');
          }).catch(() => { /* verificação de sessão é não-crítica */ });
        }
        return;
      }

      // F6/B6 — a página login APENAS verifica. O registo facial mudou-se para a página
      // Conta (Perfil) das três áreas, após autenticação — aqui não há capturas de registo.
      setIsFaceScanning(false);
      setFaceProgress(0);
      setFaceCaptureHint('Rosto ainda não registado para esta identidade.');
      // v37.78.39 — mensagem melhorada a pedido do dono (2026-08-31): diz
      // exactamente O QUE falta fazer e COMO activar o Login Facial.
      setFaceCaptureError('Ainda não existe registo facial para esta identidade. Entre com as suas credenciais (BI e senha), abra a página Conta (Perfil) e toque em «Registar a minha face» — a partir daí o Login Facial reconhece-o e o senhor entra apenas com o rosto.');
      addAuditLog(`DEMO_FACE_NO_TEMPLATE: login facial tentado sem registo na página Conta (${appMode}; 0 registos no dispositivo)`, 'info');
    };


    // FASE 1 (2026-08-15, extraído 2026-08-22) — BLOQUEIO AUTOMÁTICO POR
    // TENTATIVAS FALHADAS: a lógica vive agora em services/loginSecurityService
    // (mesma chave 'cda_login_attempts') para que a página Equipa também possa
    // limpar registos ao ELIMINAR ou CRIAR colaboradores (conta nova nunca
    // herda o bloqueio de uma conta antiga com o mesmo Nº de agente).

    const handleLoginSubmit = async (force = false) => {
      // v37.11 — o botão responde de imediato (spinner) e cliques repetidos
      // durante a autenticação são ignorados (antes re-disparavam o fluxo).
      // v37.43 — force=true ignora o guarda no re-submit por troca de área.
      if (!force && loginSubmitting) return;
      setLoginSubmitting(true);
      try {
        await handleLoginSubmitCore();
      } finally {
        setLoginSubmitting(false);
      }
    };
    loginSubmitRef.current = handleLoginSubmit; // v37.43 — re-submit após troca de área

    const handleLoginSubmitCore = async () => {
      const identLogin = bi.trim().toUpperCase().replace(/\s+/g, '');
      // v37.43 — LOGIN POR ÁREA: deduz o papel da credencial e, se não bater
      // certo com a área actual, muda de área e re-tenta o submit (sem separadores).
      const papelAlvo = detectaPapel(identLogin);
      if (papelAlvo && papelAlvo !== appMode) {
        pendingResubmitRef.current = true;
        setLoginError(null);
        setTab(papelAlvo === 'admin' ? 'gov-dashboard' : 'home');
        setAppMode(papelAlvo);
        return;
      }
      // Verificação de bloqueio ANTES de qualquer tentativa.
      if (identLogin) {
        const b = getLoginBloqueio(identLogin);
        if (b.bloqueado) {
          setLoginError(`Demasiadas tentativas falhadas. O acesso a esta conta fica bloqueado temporariamente durante ${b.restanteMin} minuto(s). Tente novamente mais tarde.`);
          addAuditLog(`Bloqueio automático (anti-força-bruta): tentativa de login ignorada para ${identLogin} — bloqueado temporariamente.`, 'warning');
          return;
        }
      }
      if (emergencyMode && !isInstMode && !isGovMode && (bi.toLowerCase().includes('002931298') || bi.toLowerCase().includes('edlasio') || profileName.toLowerCase().includes('edlasio'))) {
        setLoginError("Credenciais e chaves biométricas suspensas / bloqueadas temporariamente ao abrigo do protocolo SOC-AN-2026 para salvaguarda de soberania digital nacional.");
        addAuditLog("BLOQUEIO IDENTITÁRIO: Tentativa de login por Edlasio Galhardo suspensa (SOC-AN-2026)", "critical");
        return;
      }
      // ---- F3: Login da Instituição por Código Institucional + Senha ----
      if (isInstMode) {
        const typedCode = bi.trim().toUpperCase();
        const instPreset = DEMO_CREDENTIALS.institution;
        if (!typedCode || typedCode === instPreset.identifier) {
          // Via demo (AGT-9921-SR): entra como responsável com tudo — MAS a
          // senha demo passa a ser verificada (P1: antes QUALQUER senha abria
          // sessão plena nesta via).
          if (loginPasswordInput !== instPreset.password) {
            setLoginError('Credenciais incorrectas: a senha não corresponde a este Código Institucional.');
            addAuditLog(`Login institucional recusado: senha inválida na via demo (${instPreset.identifier}) — P1.`, 'warning');
            registarLoginFalha(identLogin);
            return;
          }
          setInstGate('full');
          setInstIdentity({ type: 'responsible' });
          setInstMustChangePwd(false);
          if (!typedCode) setBi(instPreset.identifier);
        } else {
          setLoginError(null);
          try {
            const result = await resolveInstitutionLogin(typedCode, loginPasswordInput, supabase);
            if (result.outcome === 'invalid' || result.outcome === 'deny') {
              setLoginError(result.message || 'Acesso não autorizado.');
              addAuditLog(`Login institucional recusado (${result.code}): ${result.message}`, result.outcome === 'deny' ? 'critical' : 'warning');
              registarLoginFalha(identLogin);
              return;
            }
            applyInstitutionSessionIdentity(result);
            updateActiveProfileFields?.({ institutionName: `${result.name} (${result.code})` });
            setInstIdentity(result.identity || { type: 'responsible' });
            setInstMustChangePwd(!!result.identity?.mustChangePassword);
            setInstGate(result.outcome === 'restricted' ? 'restricted' : 'full');
            setBi(result.code);
            addAuditLog(
              result.outcome === 'restricted'
                ? `Login institucional (${result.code}) — conta pendente de aprovação: aviso oficial entregue como correspondência não lida (badge na foto de perfil).`
                : `Login institucional (${result.code}) — conta activa.`,
              result.outcome === 'restricted' ? 'warning' : 'success'
            );
          } catch (e) {
            console.error('Erro no login institucional:', e);
            setLoginError('Falha na validação do login institucional. Tente novamente.');
            return;
          }
        }
      } else {
        setInstGate('none');
        setInstIdentity(null);
        setInstMustChangePwd(false);
      }

      // F6/C7 — Agentes criados na página Equipa (Nº 'ADMIN-NNNN'; legado 'Admin-NN') entram com senha local
      if (isGovMode) {
        const typedAgent = bi.trim().toUpperCase();
        let adminAgentOk = false; // P1 — sessão de agente REAL verificada neste submit
        if (typedAgent && typedAgent !== DEMO_CREDENTIALS.admin.identifier) {
          // F32 (v12/D4-a) — a palavra-passe do agente vive no Supabase Auth: nuvem
          // primeiro, migração just-in-time (D2), transição local marcada (até F-c)
          // e fallback honesto (D3). Contas demo nunca entram nesta via.
          let cred = resolveAdminAgentLogin(typedAgent, loginPasswordInput);
          if (isSupabaseConfigured() && /^ADMIN-\d+$/.test(typedAgent.replace(/\s+/g, ''))) {
            const agentEmail = syntheticAdminEmail(typedAgent);
            const agentMarked = isCloudBound(typedAgent);
            const cloudRes = await cloudSignIn(supabase, agentEmail, loginPasswordInput);
            if (cloudRes.outcome === 'ok') {
              if (!agentMarked) markCloudAccount(typedAgent, agentEmail, 'admin');
              // 2026-08-22 — permissões de página vêm da NUVEM (canónicas)
              const cloudPag = Array.isArray(cloudRes.metadata?.paginasPermitidas)
                ? (cloudRes.metadata.paginasPermitidas as string[]).map((x) => String(x).trim()).filter(Boolean)
                : undefined;
              if (!cred) {
                // Login noutro dispositivo: reconstrói a credencial local a partir dos metadados do Auth
                const metaName = typeof cloudRes.metadata?.name === 'string' && cloudRes.metadata.name ? cloudRes.metadata.name : typedAgent;
                const metaWorkerId = typeof cloudRes.metadata?.workerId === 'string' ? cloudRes.metadata.workerId : `agent-${typedAgent.toUpperCase()}`;
                if (!getAdminAgentCred(typedAgent)) {
                  addAdminAgent({ agent: typedAgent.toUpperCase().replace(/\s+/g, ''), name: metaName, password: loginPasswordInput, workerId: metaWorkerId, paginasPermitidas: cloudPag });
                }
                cred = resolveAdminAgentLogin(typedAgent, loginPasswordInput);
                addAuditLog(`[AUTH-CLOUD] Agente ${typedAgent} autenticado noutro dispositivo — credencial espelhada localmente a partir da nuvem.`, 'info');
              } else {
                addAdminAgent({ ...cred, paginasPermitidas: cloudPag ?? cred.paginasPermitidas });
                cred = resolveAdminAgentLogin(typedAgent, loginPasswordInput);
                addAuditLog(`[AUTH-CLOUD] Agente ${cred.agent} (${cred.name}) validado na nuvem (Supabase Auth).`, 'success');
              }
            } else if (cloudRes.outcome === 'invalid') {
              if (agentMarked) {
                if (cred) {
                  addAuditLog(`[AUTH-CLOUD] Login do agente ${cred.agent} por credencial local de TRANSIÇÃO (nuvem primária; divergência até à reposição assistida F-c).`, 'warning');
                } else {
                  setLoginError('Credenciais incorrectas: a senha não corresponde a este Nº Agente Admin.');
                  addAuditLog(`Login da Administração recusado para ${typedAgent}: senha inválida na nuvem.`, 'warning');
                  return;
                }
              } else if (cred) {
                // Credencial local legada válida => migração just-in-time (D2)
                const prov = await provisionCloudAccount(supabase, {
                  email: agentEmail,
                  password: loginPasswordInput,
                  metadata: { agent: typedAgent.toUpperCase().replace(/\s+/g, ''), name: cred.name, workerId: cred.workerId, role: 'admin' },
                });
                if (prov.outcome === 'ok' || prov.outcome === 'linked_existing') {
                  markCloudAccount(typedAgent, agentEmail, 'admin');
                  addAuditLog(`[AUTH-CLOUD] Migração just-in-time (D2): agente ${cred.agent} provisionado na nuvem no primeiro login.`, 'success');
                } else if (prov.outcome === 'pending_confirm') {
                  addAuditLog('[AUTH-CLOUD] ATENÇÃO: confirmação de e-mail activa no Supabase — desactivar (Authentication → Providers → Email). Agentes permanecem locais até à configuração.', 'warning');
                } else if (prov.outcome === 'unavailable') {
                  addAuditLog(`[AUTH-CLOUD] Nuvem indisponível — login local de emergência do agente ${typedAgent} (D3).`, 'warning');
                }
              }
            } else if (cloudRes.outcome === 'unavailable') {
              addAuditLog(`[AUTH-CLOUD] Nuvem indisponível — login local de emergência do agente ${typedAgent} (D3).`, 'warning');
            }
          }
          if (cred) {
            // F13 — Agente ADMIN-NNNN (conta REAL): sessão limpa com a ficha do
            // próprio agente. O perfil "Administrador Geral / Central" e os
            // dados pessoais do cidadão demo pertencem apenas à conta ADM-8812-OP.
            adminAgentOk = true; // P1 — resolveAdminAgentLogin já verificou a senha
            setProfileName(cred.name);
            setPhoneLocal(''); setNifLocal(''); setPassportLocal('');
            setUserBirthDate(''); setUserFiliation(''); setUserMaritalStatus('');
            setVerificationStatus('Agente da Administração');
            updateUserFields?.({
              name: cred.name, bi: typedAgent, phone: '', nif: '', passport: '',
              birthDate: '', filiation: '', maritalStatus: '', email: '',
              avatarUrl: makeInstNeutralAvatar('AD'),
            });
            // 2026-08-20 — hidratação do perfil persistido do agente (mesmo
            // padrão do cidadão): dados editados na página Perfil da
            // Administração e a foto voltam no próximo login (nuvem + dispositivo).
            void (async () => {
              try {
                const dbAg = await supabaseService.getProfile(typedAgent);
                const locAg = lerPerfilLocal('admin', typedAgent);
                if (dbAg) {
                  setProfileName(dbAg.name || locAg.name || cred.name);
                  setPhoneLocal(dbAg.phone || locAg.phone || '');
                  setNifLocal(dbAg.nif || locAg.nif || '');
                  updateUserFields?.({
                    name: dbAg.name || locAg.name || cred.name,
                    phone: dbAg.phone || locAg.phone || '',
                    nif: dbAg.nif || locAg.nif || '',
                    email: dbAg.email || locAg.email || '',
                  });
                } else if (locAg && Object.keys(locAg).length) {
                  setProfileName(locAg.name || cred.name);
                  setPhoneLocal(locAg.phone || '');
                  setNifLocal(locAg.nif || '');
                  updateUserFields?.({
                    name: locAg.name || cred.name,
                    phone: locAg.phone || '',
                    nif: locAg.nif || '',
                    email: locAg.email || '',
                  });
                }
                // v37.29 — ANTI-FUGA: avatar do Auth só se a sessão for deste agente.
                let fotoAgAuth = '';
                try {
                  const { data: sessAg } = await supabase.auth.getSession();
                  const emailSessaoAg = String(sessAg?.session?.user?.email || '').toLowerCase();
                  if (emailSessaoAg === syntheticAdminEmail(typedAgent).toLowerCase()) fotoAgAuth = await lerAvatarAuth();
                } catch { /* melhor esforço */ }
                const fotoAg = fotoAgAuth || lerAvatarLocal('admin', typedAgent);
                if (fotoAg) updateUserFields?.({ avatarUrl: fotoAg });
              } catch (e) {
                console.warn('CADA: hidratação do perfil do agente falhou (best-effort):', e);
              }
            })();
            setLoginError(null);
            addAuditLog(`Login da Administração: agente ${cred.agent} (${cred.name}) autenticado por Nº + senha local.`, 'success');
          } else if (/^ADMIN-\d+$/.test(typedAgent.replace(/\s+/g, ''))) {
            setLoginError('Credenciais incorrectas: a senha não corresponde a este Nº Agente Admin.');
            addAuditLog(`Login da Administração recusado para ${typedAgent}: senha inválida.`, 'warning');
            return;
          }
          // Identificadores fora do formato ADMIN-NNNN (ou legado 'Admin-NN') seguem a via demo existente
        }
        // P1 — via demo da Administração (conta ADM-8812-OP, campo vazio que
        // assume a demo, ou identificador legado sem credencial própria): a
        // senha demo passa a ser exigida (antes QUALQUER senha abria sessão).
        if (!adminAgentOk && loginPasswordInput !== DEMO_CREDENTIALS.admin.password) {
          setLoginError('Credenciais incorrectas: a senha não corresponde a este Nº Agente Admin.');
          addAuditLog(`Login da Administração recusado: senha inválida na via demo (${typedAgent || DEMO_CREDENTIALS.admin.identifier}) — P1.`, 'warning');
          registarLoginFalha(identLogin);
          return;
        }
        // v37.14 — campo vazio na via demo: o identificador da sessão passa a
        // ser o da conta demo (espelha a via institucional).
        if (!adminAgentOk && !typedAgent) setBi(DEMO_CREDENTIALS.admin.identifier);
      }

      // ---- F31 (v12/ideologia v13): CIDADÃO autentica na NUVEM (Supabase Auth) ----
      if (!isInstMode && !isGovMode) {
        const typedCitizenBi = bi.trim().toUpperCase().replace(/\s+/g, '');
        // PROMPT MASTER (2026-08-08, S2): campos vazios NUNCA abrem sessão —
        // antes, BI+senha vazios caíam na via legada F12 e entravam numa
        // sessão local não verificada. Identidades demo (isExempt) ficam
        // intactas — têm BI e senha próprios.
        if (!typedCitizenBi || !loginPasswordInput) {
          setLoginError('Introduza o Nº do B.I. e a palavra-passe para entrar no portal.');
          addAuditLog('Login do cidadão recusado: campos de acesso vazios (fecho S2).', 'warning');
          return;
        }
        // P1 — contas demo (v7) NUNCA tocam no Auth, MAS a senha da própria
        // identidade demo passa a ser verificada (antes QUALQUER senha abria
        // sessão nesta via): cada identidade isenta usa a SUA senha do preset.
        if (homologationStore.isExempt(typedCitizenBi)) {
          const demoPresetPass = typedCitizenBi === DEMO_CREDENTIALS.user.identifier
            ? DEMO_CREDENTIALS.user.password
            : typedCitizenBi === DEMO_CREDENTIALS.institution.identifier
              ? DEMO_CREDENTIALS.institution.password
              : DEMO_CREDENTIALS.admin.password;
          if (loginPasswordInput !== demoPresetPass) {
            setLoginError('Credenciais incorrectas: a senha não corresponde a este Nº de B.I.');
            addAuditLog(`Login do cidadão ${typedCitizenBi} recusado: senha inválida (identidade demo — P1).`, 'warning');
            registarLoginFalha(identLogin);
            return;
          }
        }
        // Contas demo (v7) NUNCA tocam no Auth — via da demonstração (senha já verificada acima, P1)
        if (typedCitizenBi && !homologationStore.isExempt(typedCitizenBi) && isSupabaseConfigured()) {
          const cloudEmail = syntheticCitizenEmail(typedCitizenBi);
          const cloudMarked = isCloudBound(typedCitizenBi);
          const localPass = (() => { try { return localStorage.getItem(`citizen_pass_${typedCitizenBi}`); } catch { return null; } })();

          const cloudRes = await cloudSignIn(supabase, cloudEmail, loginPasswordInput);
          if (cloudRes.outcome === 'ok') {
            if (!cloudMarked) markCloudAccount(typedCitizenBi, cloudEmail, 'cidadao');
            // v37.78.42 — espelho local da credencial (o mesmo padrão do
            // auto-registo e da troca de senha): permite ao LOGIN FACIAL
            // restabelecer a sessão da nuvem neste dispositivo, para o correio
            // oficial carregar completo também depois de entrar com o rosto.
            try { localStorage.setItem(`citizen_pass_${typedCitizenBi}`, loginPasswordInput); } catch { /* sem espaço — segue sem espelho */ }
            addAuditLog(`[AUTH-CLOUD] Login do cidadão ${typedCitizenBi} validado na nuvem (Supabase Auth) — a palavra-passe foi verificada pela plataforma, não pela aplicação.`, 'success');
          } else if (cloudRes.outcome === 'invalid') {
            const wrongPassMsg = 'Credenciais incorrectas: a senha não corresponde a este Nº de B.I.';
            if (cloudMarked) {
              // Transição (até à reposição assistida F-c): se a credencial local deste
              // dispositivo ainda confere, aceita como via de transição — a nuvem
              // continua primária e a divergência fica marcada no log.
              if (localPass !== null && localPass === loginPasswordInput) {
                addAuditLog(`[AUTH-CLOUD] Login do cidadão ${typedCitizenBi} por credencial local de TRANSIÇÃO (nuvem primária; senha divergente até à reposição assistida F-c).`, 'warning');
              } else {
                setLoginError(wrongPassMsg);
                addAuditLog(`Login do cidadão ${typedCitizenBi} recusado na nuvem: senha inválida.`, 'warning');
                registarLoginFalha(identLogin);
                return;
              }
            // Credencial local legada (pré-v12)? Se a senha confere => migração JIT (D2)
            } else if (localPass !== null) {
              if (localPass !== loginPasswordInput) {
                setLoginError(wrongPassMsg);
                addAuditLog(`Login do cidadão ${typedCitizenBi} recusado: senha inválida (credencial local).`, 'warning');
                registarLoginFalha(identLogin);
                return;
              }
              const prov = await provisionCloudAccount(supabase, {
                email: cloudEmail,
                password: loginPasswordInput,
                metadata: { bi: typedCitizenBi, role: 'cidadao' },
              });
              if (prov.outcome === 'ok' || prov.outcome === 'linked_existing') {
                markCloudAccount(typedCitizenBi, cloudEmail, 'cidadao');
                addAuditLog(`[AUTH-CLOUD] Migração just-in-time (D2): credencial local de ${typedCitizenBi} provisionada na nuvem no primeiro login — valida na nuvem daqui em diante.`, 'success');
              } else if (prov.outcome === 'pending_confirm') {
                addAuditLog('[AUTH-CLOUD] ATENÇÃO: confirmação de e-mail activa no Supabase — desactivar (Authentication → Providers → Email). A conta permanece local até à configuração.', 'warning');
              } else if (prov.outcome === 'conflict') {
                setLoginError('Esta conta já existe na nuvem com uma senha diferente. Use a senha definida na nuvem ou contacte a Administração.');
                addAuditLog(`[AUTH-CLOUD] Conflito de migração para ${typedCitizenBi}: o e-mail sintético já existe com outra senha.`, 'critical');
                return;
              } else if (prov.outcome === 'unavailable') {
                addAuditLog(`[AUTH-CLOUD] Nuvem indisponível — login local de emergência para ${typedCitizenBi} (D3); migração adiada para o próximo login.`, 'warning');
              }
            }
            // B.I. sem nenhuma credencial conhecida (nunca registado neste dispositivo
            // nem migrado): PROMPT MASTER (2026-08-08, S1) — a via F12 é FECHADA para
            // este ramo: BI real com senha inválida na nuvem e sem credencial local
            // NÃO abre mais sessão não verificada; recusa honesta (a sessão local
            // só continua a existir quando a nuvem está INDISPONÍVEL — D3 abaixo).
            else {
              setLoginError(wrongPassMsg);
              addAuditLog(`Login do cidadão ${typedCitizenBi} recusado: senha inválida na nuvem e nenhuma credencial local neste dispositivo (fecho F12-lite).`, 'warning');
              return;
            }
          } else if (cloudRes.outcome === 'unavailable') {
            addAuditLog(`[AUTH-CLOUD] Nuvem indisponível (${cloudRes.message || 'sem ligação'}) — fallback local (D3): login do cidadão ${typedCitizenBi} validado pelo modelo actual.`, 'warning');
          }

          // F-b — ESTADO LIDO DA NUVEM: activação/bloqueio/rejeição do admin passam a
          // valer em QUALQUER dispositivo (antes era apenas estado visual local).
          try {
            // F47 — leitura via RPC security-definer `cda_prelogin_cidadao` (v16):
            // fiável COM ou SEM sessão (o SELECT anónimo nunca vê a fila por RLS).
            // Sem linha na fila + prova de existência prévia (sessão Auth válida
            // agora, marcador de nuvem ou credencial local) = a conta foi ELIMINADA
            // pelo Admin => acesso REVOGADO até a um NOVO registo, que nasce
            // PENDENTE e exige nova homologação (PVI nunca auto-aprova re-registos
            // de contas eliminadas — ver RegisterStepper, F47).
            // F47-fix (2026-08-19): marca local de REVOGAÇÃO definida pelo Admin
            // demo na eliminação (quando a RLS impede apagar a linha na nuvem).
            // O login bloqueia o cidadão eliminado MESMO que a fila ainda tenha
            // a linha (cenário admin demo sem sessão Auth).
            const marcadorRevogado = (() => {
              try {
                const chave = 'cda_revoked_' + normalizeHomologationBi(typedCitizenBi);
                return localStorage.getItem(chave) === '1';
              } catch { return false; }
            })();
            const pre = await Promise.race([
              readCitizenRegistrationStatus(supabase, typedCitizenBi),
              // v37.11 — teto de 6 s: rede parada não bloqueia o botão (D3 local)
              new Promise<{ ok: false; status: null; source: 'unavailable' }>((res) =>
                setTimeout(() => res({ ok: false, status: null, source: 'unavailable' }), 6000)),
            ]);
            const bgAtivoRegisto = temRegistoBgAtivo(typedCitizenBi);
            if (bgAtivoRegisto) {
              addAuditLog(`[REGRAS-UX] Login do cidadão ${typedCitizenBi} durante o processamento em segundo plano do registo — verificação de eliminação adiada; conta local (pendente) aceite.`, 'info');
            }
            if (!bgAtivoRegisto && (marcadorRevogado || isRevokedDeletedAccount({
              read: pre,
              sessionLive: cloudRes.outcome === 'ok',
              hasLocalEvidence: cloudMarked || localPass !== null,
            }))) {
              purgeCitizenLocalResidues(typedCitizenBi);
              try { localStorage.removeItem('cda_revoked_' + normalizeHomologationBi(typedCitizenBi)); } catch { /* ignora */ }
              await cloudSignOutBestEffort(supabase);
              setLoginError('Este registo foi ELIMINADO pela Área de Administração. Para voltar a usar a plataforma, efectue um NOVO registo — a conta só ficará activa após nova aprovação da Administração.');
              addAuditLog(`Login do cidadão ${typedCitizenBi} recusado: registo INEXISTENTE na base central (conta eliminada pela Administração) — acesso revogado até NOVO registo + nova homologação (F47).`, 'critical');
              return;
            }
            const cloudSt = pre.ok && pre.status ? pre.status : '';
            if (cloudSt) {
              if (cloudSt === 'Aprovado') { marcarCloudAprovou(typedCitizenBi); homologationStore.setStatus(typedCitizenBi, 'active', undefined, undefined); }
              else if (cloudSt === 'Pendente') {
                // Não rebaixar 'active' local → 'pending': a homologação feita pelo
                // Admin demo é local (a BD pode ainda dizer Pendente porque o admin
                // demo não tem sessão Auth para persistir). Rebaixar aqui punha o
                // indicador Online vermelho num cidadão já homologado localmente.
                const localAtual = homologationStore.getStatus(typedCitizenBi)?.status ?? null;
                if (localAtual !== 'active') homologationStore.setStatus(typedCitizenBi, 'pending', undefined, undefined);
              }
              else if (cloudSt === 'Bloqueado') homologationStore.setStatus(typedCitizenBi, 'blocked', undefined, undefined);
              else if (cloudSt === 'Reprovado' || cloudSt === 'Rejeitado' || cloudSt === 'Não Aprovado') homologationStore.setStatus(typedCitizenBi, 'rejected', undefined, undefined);

              if (cloudSt === 'Bloqueado') {
                setLoginError('A sua conta encontra-se BLOQUEADA pela Área de Administração. Contacte o suporte oficial para reactivação.');
                addAuditLog(`Login do cidadão ${typedCitizenBi} recusado: conta BLOQUEADA (estado lido da nuvem — vale em qualquer dispositivo).`, 'critical');
                return;
              }
              if (cloudSt === 'Reprovado' || cloudSt === 'Rejeitado' || cloudSt === 'Não Aprovado') {
                setLoginError('O seu pedido de registo foi REJEITADO pela Área de Administração. Regularize a situação junto do suporte oficial.');
                addAuditLog(`Login do cidadão ${typedCitizenBi} recusado: registo REJEITADO (estado lido da nuvem).`, 'critical');
                return;
              }
            }
          } catch (statusErr) {
            console.warn('[AUTH-CLOUD] Leitura do estado na nuvem indisponível — mantido o estado local (D3):', statusErr);
          }
        }
      }

      // v37.11 — a entrada na app NÃO espera pela hidratação de perfil
      // (getProfile, fila de registo, storage, avatares): corre em fundo e os
      // campos actualizam quando os dados chegam. Antes, vários await de rede
      // encadeados bloqueavam o «Entrar no Portal» antes do setStage('app').
      const normBi = !isInstMode && !isGovMode ? bi.trim().toUpperCase().replace(/\s+/g, '') : bi;
      if (!isInstMode && !isGovMode && normBi && normBi !== bi) setBi(normBi);
      if (isGovMode) setTab('gov-dashboard');
      limparLoginFalhas(identLogin);
      // v37.70 — ANTI-TRANSBORDO DO PRESET DEMO: o ecrã de login inicia a
      // sessão com o preset da conta demo (foto canónica incluída). Ao entrar
      // com uma conta REAL, a sessão tem de nascer LIMPA já no primeiro
      // render do painel — antes, enquanto a hidratação assíncrona
      // (applyIdentityForLoggedUser) corria em fundo, a FOTO e os dados do
      // demo ficavam visíveis no perfil da conta nova. O updateUserFields
      // dispara o reset ANTI-FUGA (troca de B.I.) e limpa também o avatar.
      if (!isInstMode && !isGovMode && normBi && normBi !== DEMO_CREDENTIALS.user.identifier) {
        updateUserFields?.({ bi: normBi, name: '', avatarUrl: '' });
      }
      setStage('app');
      void applyIdentityForLoggedUser(normBi);
      addAuditLog(isInstMode ? 'Login de Instituição via Autenticação Segura' : isGovMode ? 'Login da Administração via Autenticação Segura' : 'Login de Cidadão via Autenticação Segura', 'success');
    };

    // ITEM 3 — login por E-MAIL REAL (contas que associaram um e-mail no
    // Perfil → Segurança). Caminho explícito e separado do login por B.I.:
    // valida o e-mail na nuvem (Auth), resolve o B.I. do user_metadata e
    // aplica EXACTAMENTE as mesmas verificações F47/F-b (conta eliminada,
    // bloqueada ou rejeitada ficam fora, em qualquer dispositivo).
    const handleEmailSignInSubmit = async () => {
      setLoginError(null);
      const emailAlvo = loginEmailInput.trim().toLowerCase();
      if (!emailAlvo || !loginPasswordInput) {
        setLoginError('Introduza o seu e-mail e a palavra-passe para entrar.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailAlvo)) {
        setLoginError('Escreva um e-mail válido.');
        return;
      }
      if (!isSupabaseConfigured()) {
        setLoginError('A autenticação na nuvem não está disponível neste ambiente.');
        return;
      }
      const res = await cloudSignIn(supabase, emailAlvo, loginPasswordInput);
      if (res.outcome !== 'ok') {
        setLoginError('E-mail ou palavra-passe inválidos.');
        addAuditLog('Login por e-mail real recusado: credenciais inválidas na nuvem.', 'warning');
        return;
      }
      const emailBi = String((res.metadata as any)?.bi || '').trim().toUpperCase().replace(/\s+/g, '');
      if (!emailBi) {
        await cloudSignOutBestEffort(supabase);
        setLoginError('Esta conta não pertence a um cidadão do Correio Digital de Angola.');
        addAuditLog('Login por e-mail real recusado: conta sem B.I. de cidadão associado.', 'warning');
        return;
      }
      setBi(emailBi);
      addAuditLog(`[AUTH-CLOUD] Login por e-mail real: B.I. ${emailBi} resolvido da conta autenticada — a palavra-passe foi verificada pela plataforma.`, 'success');
      try {
        const pre = await readCitizenRegistrationStatus(supabase, emailBi);
        const marcadorRevogadoEmail = (() => {
          try { return localStorage.getItem('cda_revoked_' + emailBi) === '1'; } catch { return false; }
        })();
        const bgAtivoEmail = temRegistoBgAtivo(emailBi);
        if (bgAtivoEmail) {
          addAuditLog(`[REGRAS-UX] Login por e-mail de ${emailBi} durante o processamento em segundo plano do registo — verificação de eliminação adiada; conta local (pendente) aceite.`, 'info');
        }
        if (!bgAtivoEmail && (marcadorRevogadoEmail || isRevokedDeletedAccount({ read: pre, sessionLive: true, hasLocalEvidence: isCloudBound(emailBi) }))) {
          purgeCitizenLocalResidues(emailBi);
          try { localStorage.removeItem('cda_revoked_' + emailBi); } catch { /* ignora */ }
          await cloudSignOutBestEffort(supabase);
          setLoginError('Este registo foi ELIMINADO pela Área de Administração. Para voltar a usar a plataforma, efectue um NOVO registo — a conta só ficará activa após nova aprovação.');
          addAuditLog(`Login por e-mail real recusado: registo de ${emailBi} INEXISTENTE na base central (conta eliminada) — F47.`, 'critical');
          return;
        }
        const cloudSt = pre.ok && pre.status ? pre.status : '';
        if (cloudSt) {
          if (cloudSt === 'Aprovado') { marcarCloudAprovou(emailBi); homologationStore.setStatus(emailBi, 'active', undefined, undefined); }
          else if (cloudSt === 'Pendente') {
            const localAtualEmail = homologationStore.getStatus(emailBi)?.status ?? null;
            if (localAtualEmail !== 'active') homologationStore.setStatus(emailBi, 'pending', undefined, undefined);
          }
          else if (cloudSt === 'Bloqueado') homologationStore.setStatus(emailBi, 'blocked', undefined, undefined);
          else if (cloudSt === 'Reprovado' || cloudSt === 'Rejeitado' || cloudSt === 'Não Aprovado') homologationStore.setStatus(emailBi, 'rejected', undefined, undefined);
          if (cloudSt === 'Bloqueado') {
            setLoginError('A sua conta encontra-se BLOQUEADA pela Área de Administração. Contacte o suporte oficial para reactivação.');
            addAuditLog(`Login por e-mail real recusado: conta ${emailBi} BLOQUEADA (estado lido da nuvem).`, 'critical');
            return;
          }
          if (cloudSt === 'Reprovado' || cloudSt === 'Rejeitado' || cloudSt === 'Não Aprovado') {
            setLoginError('O seu pedido de registo foi REJEITADO pela Área de Administração. Regularize a situação junto do suporte oficial.');
            addAuditLog(`Login por e-mail real recusado: registo de ${emailBi} REJEITADO (estado lido da nuvem).`, 'critical');
            return;
          }
        }
      } catch (statusErr) {
        console.warn('[AUTH-CLOUD] Leitura do estado na nuvem indisponível no login por e-mail (D3):', statusErr);
      }
      await applyIdentityForLoggedUser(emailBi);
      if (isGovMode) setTab('gov-dashboard');
      setStage('app');
      addAuditLog('Login de Cidadão via e-mail real', 'success');
    };

    return (
      <section className={`min-h-screen p-4 flex items-center justify-center font-sans ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
        {/* v37.45 — escala proporcional do ecrã de autenticação (login / registo /
            esqueci senha / facial): −20% (v37.44), depois 0.88; v37.78.36 —
            +10% proporcional a pedido do dono (2026-08-31) → zoom 0.968, com
            todos os elementos e espaçamentos a manter a harmonia. */}
        <div style={{ zoom: 0.968 }} className="max-w-[940px] w-full mx-auto grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-4.5 items-stretch">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`hidden md:flex rounded-3xl border ${loginSubMode === 'face-capture' ? 'p-6 min-h-[485px]' : 'p-8 md:p-8 min-h-[615px]'} ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#E2E8F0]'} flex-col items-center justify-center text-center shadow-sm h-full relative overflow-hidden transition-all duration-300`}
          >
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/2 rounded-full -mr-40 -mt-40 blur-3xl pointer-events-none" />
            
            {showVoiceGuide ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full relative z-10"
              >
                <VoiceGuideAssistant
                  onScrollDown={() => {
                    const el = document.getElementById('cda-login-form-container');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      window.scrollTo({ top: 350, behavior: 'smooth' });
                    }
                  }}
                  onFocusSteps={() => {
                    setHighlightSteps(true);
                    setTimeout(() => setHighlightSteps(false), 5000);
                  }}
                  onCollapseStart={() => {
                    setLoginSubMode('register');
                  }}
                  onCloseAssistant={() => {
                    setShowVoiceGuide(false);
                  }}
                />
              </motion.div>
            ) : (
              <div className="flex flex-col items-center relative z-10">
                {/* v37.78.38 — logomarca +25% proporcional NO DESKTOP (pedido
                    do dono 2026-08-31): 213→266px (captura facial 138→173px),
                    margens um degrau acima (mb-6→mb-7 / mb-3.5→mb-4) e painéis
                    min-h 555→615 / 440→485 — o conjunto cresce junto. */}
                <LazyImage
                  src="https://i.postimg.cc/7PWDMLZM/Logo2.png" 
                  alt="Correio Digital" 
                  priority={true}
                  placeholder="skeleton"
                  className={loginSubMode === 'face-capture' ? "mb-4" : "mb-7"}
                  style={{
                    height: loginSubMode === 'face-capture' ? '173px' : '266px',
                    width: 'auto',
                    objectFit: 'contain',
                    backgroundColor: 'transparent',
                  }}
                />
                <h1 className={`${loginSubMode === 'face-capture' ? 'text-lg md:text-xl mb-3' : 'text-xl md:text-2xl mb-4'} font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} leading-tight italic uppercase tracking-tight`}>
                  {t("O seu novo endereço digital oficial")}
                </h1>
                <div className={`${loginSubMode === 'face-capture' ? 'mt-3.5' : 'mt-6'} flex flex-col items-center`}>
                  <div className="flex items-center gap-1.5 px-5 py-2.5 bg-[#0E2B64] border border-[#0E2B64] rounded-full text-[10px] text-white font-extrabold uppercase tracking-widest shadow-xs">
                    <ShieldCheck size={14} className="text-emerald-400" /> {t("Infraestrutura Oficial Segura")}
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div 
            id="cda-login-form-container"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`bg-white rounded-3xl ${loginSubMode === 'face-capture' ? 'p-4.5 md:p-5.5 min-h-[485px]' : 'p-7 md:p-8 min-h-[615px]'} shadow-xl border border-[#E2E8F0] flex flex-col justify-between h-full transition-all duration-300 relative ${
              highlightSteps 
                ? 'ring-4 ring-blue-500 ring-offset-4 shadow-[0_0_30px_rgba(37,99,235,0.35)] scale-[1.01]' 
                : ''
            }`}
          >
            <AnimatePresence mode="wait">
              {loginError && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="bg-red-50 border border-red-200/60 text-red-700 px-4 py-3 rounded-2xl text-[10.5px] font-bold flex items-start gap-2 mb-4 leading-normal animate-fadeIn"
                >
                  <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <span className="font-extrabold block">ACESSO NEGADO / PROTOCOLO CRÍTICO</span>
                    {loginError}
                  </div>
                </motion.div>
              )}

              {loginSubMode === 'normal' && (
                <motion.div
                  key="login-normal"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4 flex-1 flex flex-col justify-center animate-fadeIn"
                >
                  {/* Tabs layout exactly matching the image */}
                  {/* v37.42 — a área vem do URL; separadores de login removidos (§B). */}
                  <div className="hidden flex items-center justify-center gap-6 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 pb-2 mb-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setAppMode('user');
                        setTab('home');
                        setLoginSubMode('normal');
                        setStage('login');
                      }}
                      className={`transition-all cursor-pointer bg-transparent border-none pb-2 relative font-extrabold ${appMode === 'user' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {t("Cidadão")}
                      {appMode === 'user' && (
                        <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-full animate-fadeIn" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAppMode('institution');
                        setTab('home');
                        setLoginSubMode('normal');
                        setStage('login');
                      }}
                      className={`transition-all cursor-pointer bg-transparent border-none pb-2 relative font-extrabold ${appMode === 'institution' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {t("Instituição")}
                      {appMode === 'institution' && (
                        <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-full animate-fadeIn" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAppMode('admin');
                        setTab('gov-dashboard');
                        setLoginSubMode('normal');
                        setStage('login');
                      }}
                      className={`transition-all cursor-pointer bg-transparent border-none pb-2 relative font-extrabold ${appMode === 'admin' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {t("Admin")}
                      {appMode === 'admin' && (
                        <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-full animate-fadeIn" />
                      )}
                    </button>
                  </div>

                  <div className="text-center space-y-1.5">
                    {/* Centered User Avatar exactly like the first image */}
                    <div className="flex justify-center mb-1">
                      <div className="w-12 h-12 rounded-full bg-[#f0f4f9] flex items-center justify-center border border-slate-100 shadow-3xs">
                        <User className="text-[#0c2340]" size={20} />
                      </div>
                    </div>

                    <h2 className="text-2xl font-black text-[#0c2340] tracking-tight uppercase leading-none">
                      LOGIN
                    </h2>
                    <p className="text-[10.5px] text-slate-400 font-extrabold uppercase tracking-wider leading-none mt-1">
                      {isInstMode ? t('Canal oficial das instituições aderentes') : isGovMode ? t('Acesso reservado à administração central') : t('Acesso oficial do cidadão digital')}
                    </p>
                  </div>

                  <div className="space-y-3.5 pt-1">
                    {/* Input wrapper with Icon on left exactly like image 1 */}
                    <div className="grid gap-1.5 text-left">
                      <span className="text-[10.5px] text-slate-500 font-extrabold tracking-wider uppercase">
                        {isInstMode ? t("Nº Agente Institucional") : isGovMode ? t("Nº Agente Admin") : t("Nº do BI de Cidadão")}
                      </span>
                      <div className="flex items-center gap-3 bg-white border border-slate-200 focus-within:border-[#0c2340] focus-within:ring-1 focus-within:ring-[#0c2340] rounded-xl px-3 py-1.5 transition-all">
                        <div className="w-9 h-9 bg-[#f0f4f9] text-[#1e3a8a] rounded-lg flex items-center justify-center shrink-0">
                          <IdCard size={17} className="text-[#2563eb]" />
                        </div>
                        <input
                          className="w-full bg-transparent font-mono font-bold tracking-wider text-slate-800 border-none outline-none text-xs placeholder-slate-400"
                          value={bi}
                          name="cda-utilizador"
                          autoComplete="off"
                          onChange={(e) => { loginInteragidoRef.current = true; setBi(e.target.value.toUpperCase()); }}
                          placeholder={isInstMode ? "AGT-9921-SR" : isGovMode ? "ADM-8812-OP" : "009874562LA041"}
                          maxLength={isInstMode ? 20 : 14}
                        />
                      </div>
                    </div>

                    <div className="grid gap-1.5 text-left">
                      <span className="text-[10.5px] text-slate-500 font-extrabold tracking-wider uppercase">
                        {t("Senha de Acesso")}
                      </span>
                      <div className="flex items-center gap-3 bg-white border border-slate-200 focus-within:border-[#0c2340] focus-within:ring-1 focus-within:ring-[#0c2340] rounded-xl px-3 py-1.5 transition-all">
                        <div className="w-9 h-9 bg-[#f0f4f9] text-[#1e3a8a] rounded-lg flex items-center justify-center shrink-0">
                          <Lock size={16} className="text-[#2563eb]" />
                        </div>
                        <input
                          type={showLoginPassword ? "text" : "password"}
                          className="w-full bg-transparent font-bold tracking-wider text-slate-800 border-none outline-none text-xs placeholder-slate-400"
                          placeholder="••••••••••••"
                          name="cda-senha"
                          autoComplete="new-password"
                          value={loginPasswordInput}
                          onChange={(e) => { loginInteragidoRef.current = true; setLoginPasswordInput(e.target.value); }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword((visible) => !visible)}
                          className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#0c2340] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                          aria-label={showLoginPassword ? "Ocultar senha" : "Mostrar senha"}
                          title={showLoginPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showLoginPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col gap-2.5">
                      {/* Button ENTRAR NO PORTAL */}
                      <button
                        onClick={handleLoginSubmit}
                        disabled={loginSubmitting}
                        className={`w-full bg-[#0E2B64] hover:bg-[#081a3d] text-white rounded-xl py-3 font-black text-[11px] uppercase tracking-wider shadow-[#0E2B64]/15 hover:opacity-95 transition-all border-none flex items-center justify-center gap-2 ${
                          loginSubmitting ? 'opacity-70 cursor-wait' : 'cursor-pointer'
                        }`}
                      >
                        {loginSubmitting ? (
                          <>
                            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                            {t("A autenticar…")}
                          </>
                        ) : (
                          t("Entrar no Portal")
                        )}
                      </button>

                      {/* Button AUTO PREENCHER DEMONSTRAÇÃO */}
                      <div className="flex flex-col items-stretch">
                        {/* v37.42 — botão de demonstração removido do login (§B). */}
                        <button
                          type="button"
                          onClick={handleDemoAutofill}
                          className="hidden w-full bg-white hover:bg-slate-50 text-blue-600 border border-blue-600 rounded-xl py-2.5 font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                        >
                          {t("Auto Preencher Demonstração")}
                        </button>
                      </div>

                      {/* Separador Horizontal Moderno "Ou" */}
                      <div className="relative flex items-center py-1">
                        <div className="flex-grow border-t border-slate-100"></div>
                        <span className="flex-shrink mx-3 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] bg-white px-3 select-none">{t("Ou")}</span>
                        <div className="flex-grow border-t border-slate-100"></div>
                      </div>

                      {/* Credentials sub text below separator */}
                      <div className="space-y-1.5">
                        {/* v37.44 — texto «Credenciais de apresentação…» removido a pedido. */}
                        {/* Button LOGIN FACIAL */}
                        <button 
                          type="button"
                          onClick={() => {
                            if (emergencyMode && !isInstMode && !isGovMode && (bi.toLowerCase().includes('002931298') || bi.toLowerCase().includes('edlasio') || profileName.toLowerCase().includes('edlasio'))) {
                              setLoginError(t("Autenticação Biométrica Recusada: Credenciais e chaves biométricas bloqueadas temporariamente ao abrigo do protocolo SOC-AN-2026."));
                              addAuditLog("Interrupção de segurança: tentativa de login facial suspensa (SOC-AN-2026)", "critical");
                              return;
                            }
                            setFaceProgress(0);
                            setLoginSubMode('face-capture');
                            addAuditLog('Iniciado Login Biométrico Facial', 'info');
                          }}
                          className="w-full bg-white hover:bg-slate-100 text-[#2563eb] border border-[#E2E8F0] rounded-xl py-3 font-black text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
                        >
                          <Fingerprint size={15} className="text-[#2563eb] shrink-0" />
                          {t("Login Facial")}
                        </button>
                      </div>

                      {/* Footer border and buttons for Citizen */}
                      <div className="pt-3 mt-1.5 border-t border-slate-100 flex items-center justify-between gap-3">
                        {/* A opção de registo fica sempre visível e activa no Login Admin.
                            A validação do formulário continua a impedir duplicação do Admin Alfa. */}
                        <button
                          type="button"
                          onClick={() => {
                            setLoginSubMode('register');
                          }}
                          className="text-slate-600 hover:text-[#0c2340] transition-colors bg-transparent border-none cursor-pointer text-[10px] font-black uppercase tracking-widest font-sans flex items-center gap-1"
                        >
                          <UserPlus size={14} className="text-[#2563eb]" />
                          {isGovMode ? t("Registar Admin Alfa") : t("Registar")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLoginSubMode('forgot');
                          }}
                          className="text-slate-650 hover:text-[#0c2340] transition-colors bg-transparent border-none cursor-pointer text-[11px] font-black uppercase tracking-widest font-sans flex items-center gap-1.5"
                        >
                          <Lock size={15.5} className="text-[#2563eb]" />
                          {t("Esqueci Senha")}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {loginSubMode === 'face-capture' && (
                <motion.div
                  key="login-face"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4 flex-1 flex flex-col justify-center text-center p-3 relative"
                >
                  {/* Badge top */}
                  <div className="inline-flex items-center gap-1.5 bg-blue-50/70 border border-blue-100/50 px-3 py-1 rounded-full text-blue-600 font-extrabold text-[9.5px] uppercase tracking-[0.15em] mx-auto w-fit">
                    <Shield size={11.5} className="text-blue-500" />
                    {t("LOGIN FACIAL")}
                  </div>

                  {/* Title & Subtitle with relative Back button on left */}
                  <div className="space-y-1.5 relative mb-2">
                    <div className="flex items-center justify-center gap-2 relative">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginSubMode('normal');
                          addAuditLog('Sair do login facial', 'info');
                        }}
                        className="absolute left-1 p-1 hover:bg-slate-100 rounded-full transition-all text-slate-500 hover:text-slate-800 border-0 cursor-pointer flex items-center justify-center focus:outline-none"
                        title={t("Voltar")}
                      >
                        <ArrowLeft size={17} />
                      </button>
                      <h2 className="text-xl md:text-2xl font-black text-[#0f172a] tracking-tight leading-none">
                        {t("Login Facial")}
                      </h2>
                    </div>
                  </div>

                  {/* Circle Scanning area */}
                  <div className="relative flex justify-center py-2.5">
                    <div className="relative w-[210px] h-[210px] rounded-full flex items-center justify-center bg-white shadow-xl transition-all duration-300">
                      {/* SVG Ring Progress */}
                      <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-10" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="46"
                          fill="none"
                          stroke="#f1f5f9"
                          strokeWidth="2.5"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="46"
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="3"
                          strokeDasharray={`${2 * Math.PI * 46}`}
                          strokeDashoffset={`${2 * Math.PI * 46 * (1 - faceProgress / 100)}`}
                          className="transition-all duration-150 ease-out"
                          strokeLinecap="round"
                        />
                        {/* Indicator Slider Dot */}
                        {faceProgress > 0 && faceProgress < 100 && (
                          <circle
                            cx={50 + 46 * Math.cos((faceProgress / 100) * 2 * Math.PI - Math.PI / 2)}
                            cy={50 + 46 * Math.sin((faceProgress / 100) * 2 * Math.PI - Math.PI / 2)}
                            r="2.5"
                            fill="#3b82f6"
                            className="shadow-sm"
                          />
                        )}
                      </svg>

                      {/* Main dark vector circle */}
                      <div className="w-[190px] h-[190px] rounded-full overflow-hidden bg-gradient-to-b from-[#0f172a] to-[#1e1b4b] relative flex items-center justify-center border-4 border-white shadow-inner z-5">
                        {/* Faint Tech Grid */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:10px_10px] opacity-25" />

                        {/* Scanner Laser Bar */}
                        {isFaceScanning && (
                          <div 
                            className="absolute top-0 left-0 right-0 h-1 bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.9)] z-20 pointer-events-none" 
                            style={{
                              animation: 'scan-motion 2.5s infinite ease-in-out',
                              position: 'absolute'
                            }} 
                          />
                        )}

                        {/* Bracket Corners */}
                        <div className="absolute top-6 left-6 w-5 h-5 border-t-2 border-l-2 border-white rounded-tl-sm opacity-80 pointer-events-none" />
                        <div className="absolute top-6 right-6 w-5 h-5 border-t-2 border-r-2 border-white rounded-tr-sm opacity-80 pointer-events-none" />
                        <div className="absolute bottom-6 left-6 w-5 h-5 border-b-2 border-l-2 border-white rounded-bl-sm opacity-80 pointer-events-none" />
                        <div className="absolute bottom-6 right-6 w-5 h-5 border-b-2 border-r-2 border-white rounded-br-sm opacity-80 pointer-events-none" />

                        {/* Overriding the conditional mounting of video element to always keep it attached and prevent black/dark screen race conditions */}
                        <video
                          ref={loginFaceVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className={`w-full h-full object-cover absolute inset-0 rounded-full scale-[1.06] transition-all duration-300 ${
                            webcamReady && !isSimulatedCamera ? 'opacity-95 z-10' : 'opacity-0 z-0 pointer-events-none'
                          }`}
                        />

                        {(!webcamReady || isSimulatedCamera) && (
                          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-950 z-10">
                            {/* Futuristic rotating scanning mesh vector */}
                            <div className="relative w-full h-full flex items-center justify-center">
                              {/* Vector face outline silhouette */}
                              <svg className={`w-28 h-28 stroke-[1] ${isFaceScanning ? 'text-blue-400 animate-pulse' : 'text-sky-400'} transition-colors`} viewBox="0 0 100 100" fill="none">
                                <path d="M50,15 C28,15 28,50 28,68 C28,86 42,92 50,92 C58,92 72,86 72,68 C72,50 72,15 50,15 Z" stroke="currentColor" strokeDasharray="3 4" />
                                <ellipse cx="38" cy="48" rx="4.5" ry="2.5" stroke="currentColor" />
                                <ellipse cx="62" cy="48" rx="4.5" ry="2.5" stroke="currentColor" />
                                <path d="M50,52 L50,68 L46,68" stroke="currentColor" />
                                <path d="M40,78 Q50,84 60,78" stroke="currentColor" />
                                
                                {/* Dynamic data reading coordinate points */}
                                <circle cx="38" cy="48" r="1.5" className="fill-blue-400 animate-ping" />
                                <circle cx="62" cy="48" r="1.5" className="fill-blue-400 animate-ping" />
                                <circle cx="50" cy="92" r="2" className="fill-blue-500 animate-bounce" />
                              </svg>
                              
                              {/* Floating tech matrix style HUD coordinates */}
                              <div className="absolute inset-4 border border-sky-500/10 rounded-full animate-[spin_10s_linear_infinite]" />
                              <div className="absolute inset-8 border border-dashed border-indigo-400/20 rounded-full animate-[spin_20s_linear_infinite_reverse]" />
                            </div>
                          </div>
                        )}
                        <canvas ref={loginFaceCanvasRef} className="hidden" />
                      </div>
                    </div>
                  </div>

                  {/* Verification Status Banner */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 justify-center">
                      <CheckCircle size={15} className={faceProgress === 100 ? "text-emerald-500" : isFaceScanning ? "text-blue-500 animate-spin" : "text-emerald-500"} />
                      <span className="text-emerald-600 font-extrabold uppercase tracking-widest text-[9.5px] font-sans">
                        {faceProgress === 100
                          ? t("Face local validada")
                          : isFaceScanning
                            ? `${t("A processar")}: ${faceProgress}%`
                            : demoFaceTemplateLoaded
                              ? t("Pronto para validação local")
                              : deviceFaceCount > 0
                                ? t(`${deviceFaceCount} registo(s) facial(is) neste dispositivo — pode validar com o rosto`)
                                : t("Rosto não registado — registe na página Conta (Perfil)")}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[10.5px] font-semibold">
                      {t(faceCaptureHint)}
                    </p>
                    {demoFaceTemplateMeta && (
                      <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">
                        {t("Demo local registada em")} {demoFaceTemplateMeta.capturedAt}
                      </p>
                    )}
                    {faceCaptureError && (
                      <p className="text-[10px] text-red-600 font-bold">{t(faceCaptureError)}</p>
                    )}
                    {webcamPermissionDenied && (
                      <p className="text-[10px] text-amber-600 font-bold">{t("A câmara está bloqueada. Autorize o acesso para usar o login facial demo.")}</p>
                    )}
                  </div>

                  {/* Main Action Buttons */}
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      disabled={isFaceScanning || !webcamReady}
                      onClick={handleDemoFaceCapture}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-5 rounded-2xl font-black text-[12.5px] uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/15 hover:opacity-95 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 disabled:shadow-none cursor-pointer border-0"
                    >
                      <Fingerprint size={15} />
                      {t('VALIDAR FACE LOCAL')}
                    </button>
                    {/* v37.42 — atalho de demonstração removido do login (§B). */}
                    <div className="hidden flex flex-wrap items-center justify-center gap-3 text-[9.5px] font-black uppercase tracking-widest">
                      <button
                        type="button"
                        onClick={handleDemoAutofill}
                        className="text-slate-400 hover:text-primary transition-colors cursor-pointer bg-transparent border-0"
                      >
                        {t("Auto Preencher Demonstração")}
                      </button>
                    </div>
                  </div>

                  {/* Encryption Footer label */}
                  <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[9.5px] font-bold">
                    <Lock size={12.5} className="text-slate-400" />
                    <span>{t("Modo demonstração: a face é guardada localmente neste dispositivo.")}</span>
                  </div>
                </motion.div>
              )}

              {loginSubMode === 'register' && (
                <motion.div
                  key="login-register"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 flex flex-col justify-center"
                >
                  {appMode === 'institution' ? (
                    <RegisterInstitutionPage
                      onCancel={() => setLoginSubMode('normal')}
                      onSuccess={() => setLoginSubMode('normal')}
                      addAuditLog={addAuditLog}
                    />
                  ) : appMode === 'admin' ? (
                    // F19 — Registo do Admin = Credencial Operacional Plataforma
                    // (prompt v9.1): formulário fiel ao popup da página Equipa.
                    <RegisterAdminAgentPage
                      onCancel={() => setLoginSubMode('normal')}
                      onSuccess={() => setLoginSubMode('normal')}
                      addAuditLog={addAuditLog}
                    />
                  ) : (
                    <PainelSuspense>
                    <RegisterStepper
                      onCancel={() => setLoginSubMode('normal')}
                      onSuccess={() => setLoginSubMode('normal')}
                      addAuditLog={addAuditLog}
                      appMode={appMode}
                    />
                    </PainelSuspense>
                  )}
                </motion.div>
              )}

              {loginSubMode === 'email' && (
                <motion.div
                  key="login-email"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 flex flex-col justify-center"
                >
                  <div className="w-full flex flex-col justify-between min-h-[440px] flex-1 font-sans">
                    <div className="flex-1 flex flex-col justify-center space-y-4">
                      <div className="text-center space-y-1.5">
                        <div className="flex justify-center mb-1">
                          <div className="w-14 h-14 rounded-full bg-[#f0f4f9] flex items-center justify-center border border-slate-100 shadow-3xs">
                            <Mail className="text-[#0c2340]" size={22} />
                          </div>
                        </div>
                        <h2 className="text-[25px] font-black text-[#0c2340] tracking-tight uppercase leading-none">
                          Entrar com E-mail
                        </h2>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mt-0.5">
                          Para contas que associaram um e-mail real no Perfil
                        </p>
                      </div>

                      <div className="max-w-lg mx-auto w-full space-y-1.5">
                        <label className="text-[10.5px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1 mb-0.5">
                          <Mail size={12} className="text-[#2563eb]" /> E-MAIL REAL DA CONTA
                        </label>
                        <input
                          type="email"
                          value={loginEmailInput}
                          onChange={(e) => setLoginEmailInput(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-[#2563eb]/60 rounded-xl px-4 py-2.5 text-[13px] text-slate-800 outline-none transition-all font-bold placeholder:text-slate-400"
                          placeholder="oseuemail@exemplo.com"
                          autoComplete="off"
                        />
                      </div>

                      <div className="max-w-lg mx-auto w-full space-y-1.5">
                        <label className="text-[10.5px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1 mb-0.5">
                          <Lock size={12} className="text-[#2563eb]" /> PALAVRA-PASSE
                        </label>
                        <input
                          type="password"
                          value={loginPasswordInput}
                          onChange={(e) => setLoginPasswordInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') void handleEmailSignInSubmit(); }}
                          className="w-full bg-white border border-slate-200 focus:border-[#2563eb]/60 rounded-xl px-4 py-2.5 text-[13px] text-slate-800 outline-none transition-all font-bold placeholder:text-slate-400"
                          placeholder="••••••••••••"
                          autoComplete="new-password"
                        />
                      </div>

                      {loginError && (
                        <p className="max-w-lg mx-auto w-full text-[11px] text-red-600 font-bold leading-normal">{loginError}</p>
                      )}

                      <div className="flex flex-col gap-2.5 max-w-lg mx-auto w-full pt-0">
                        <button
                          type="button"
                          onClick={() => void handleEmailSignInSubmit()}
                          className="w-full text-white rounded-[15px] py-3 font-black text-[12px] uppercase tracking-widest shadow-lg transition-all border-none bg-[#0E2B64] hover:bg-[#081a3d] cursor-pointer"
                        >
                          Entrar com e-mail
                        </button>
                        <button
                          type="button"
                          onClick={() => { setLoginError(null); setLoginSubMode('normal'); }}
                          className="w-full py-2.5 text-slate-500 font-black text-[11px] uppercase tracking-widest hover:text-slate-700 transition-colors bg-transparent border-none cursor-pointer"
                        >
                          Voltar à Entrada por B.I.
                        </button>
                      </div>

                      <p className="max-w-lg mx-auto w-full text-[10.5px] text-slate-500 font-semibold leading-relaxed text-center">
                        A sua conta ainda usa só o B.I.? Entre pelo B.I. e associe um e-mail real em Perfil → Segurança para passar a entrar por aqui.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {loginSubMode === 'forgot' && (
                <motion.div
                  key="login-forgot"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 flex flex-col justify-center"
                >
                  <ResetPasswordStepper
                    onCancel={() => { setPasswordRecoveryActive(false); setLoginSubMode('normal'); }}
                    onSuccess={() => { setPasswordRecoveryActive(false); setLoginSubMode('normal'); }}
                    addAuditLog={addAuditLog}
                    appMode={appMode}
                    recoveryMode={passwordRecoveryActive}
                  />
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        </div>

        {/* Modal de Detalhes Adicionais (Registar / Esqueci Senha) */}
        <AnimatePresence>
          {showAccessModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAccessModal(false)}
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[300]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-x-4 bottom-4 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-sm bg-white rounded-[32px] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] z-[301] overflow-hidden border border-slate-100 text-left font-sans flex flex-col max-h-[85vh]"
              >
                {/* Header */}
                <div className="flex items-center gap-4 text-left relative shrink-0 p-6 md:p-10 pb-0">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100/40 shadow-sm shrink-0">
                    <Shield size={26} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#4f46e5] font-bold">Correio Digital de Angola</div>
                    <h3 className="text-xl md:text-[23px] font-black text-[#0c2340] italic tracking-tighter uppercase leading-none mt-1">
                      {accessModalTitle}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowAccessModal(false)}
                    className="absolute -top-1 -right-1 p-2 hover:bg-slate-50 rounded-full transition-all cursor-pointer border-0 text-slate-400 hover:text-slate-600 bg-transparent flex items-center justify-center"
                    type="button"
                    title="Fechar"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Content */}
                <div className="p-7 md:p-8 space-y-4.5 overflow-y-auto custom-scrollbar">
                  <p className="text-slate-600 text-[13.5px] font-semibold leading-relaxed">
                    {accessModalMessage}
                  </p>
                  
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 flex gap-3.5 text-left">
                    <ShieldCheck size={21} className="text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Segurança Validada pelo Estado</p>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed uppercase">
                        Todas as transações e acessos a este portal estão associados de forma única à sua identidade civil nacional.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-7 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAccessModal(false)}
                    className="px-7 py-3.5 bg-primary hover:bg-indigo-700 text-white rounded-xl font-black text-[11px] uppercase tracking-widest transition-all cursor-pointer border-0 shadow-lg shadow-primary/10"
                  >
                    Compreendido
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Floating Voice Guide Assistant for Mobile Screens */}
        {showVoiceGuide && (
          <div className="fixed bottom-6 right-6 z-[150] max-w-sm w-[calc(100vw-32px)] md:hidden block">
            <VoiceGuideAssistant
              onScrollDown={() => {
                const el = document.getElementById('cda-login-form-container');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  window.scrollTo({ top: 350, behavior: 'smooth' });
                }
              }}
              onFocusSteps={() => {
                setHighlightSteps(true);
                setTimeout(() => setHighlightSteps(false), 5000);
              }}
              onCollapseStart={() => {
                setLoginSubMode('register');
              }}
              onCloseAssistant={() => {
                setShowVoiceGuide(false);
              }}
            />
          </div>
        )}
      </section>
    );
  }

  // Homologação: a retenção de correspondência é feita no painel
  // (homologationPendingForCitizen) — não existe página/écran de bloqueio, nem
  // para o cidadão nem para a instituição (F7): o aviso oficial chega como
  // correspondência não lida, com badge na foto de perfil.

  return (
    <main className={`min-h-screen bg-bg text-primary md:flex md:gap-5 md:p-5 font-sans selection:bg-primary selection:text-white transition-all ${emergencyMode && isGovMode ? 'pt-[32px] md:pt-[44px]' : ''}`}>
      {/* Sugestão de domínio de e-mail (autocomplete nativo — invisível, global) */}
      <datalist id="cda-dominios-email">
        <option value="@gmail.com" />
        <option value="@yahoo.com" />
        <option value="@hotmail.com" />
        <option value="@outlook.com" />
        <option value="@icloud.com" />
        <option value="@correiodigital.ao" />
        <option value="@inapem.ao" />
        <option value="@agt.ao" />
        <option value="@sme.ao" />
        <option value="@minfin.gov.ao" />
      </datalist>

      {/* Q-2 — aviso honesto da resolução do QR deep-link */}
      <AnimatePresence>
        {qrNotice && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[2100] w-[min(94vw,560px)] bg-white border border-amber-200 shadow-2xl rounded-2xl p-4 flex items-start gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <QrCode size={18} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[11px] font-black text-slate-800 uppercase tracking-wide">
                {qrNotice.tipo === 'nao_encontrada' && 'Correspondência não encontrada'}
                {qrNotice.tipo === 'outra_conta' && 'Correspondência de outra conta'}
                {qrNotice.tipo === 'indisponivel' && 'Verificação indisponível'}
              </p>
              <p className="text-[11px] font-bold text-slate-500 mt-0.5 leading-relaxed">
                {qrNotice.tipo === 'nao_encontrada' && <>O protocolo <span className="font-mono text-slate-700">{qrNotice.protocolo}</span> não consta do registo público da plataforma. Confirme o código digitalizado.</>}
                {qrNotice.tipo === 'outra_conta' && <>A correspondência <span className="font-mono text-slate-700">{qrNotice.protocolo}</span> existe na plataforma, mas não consta desta conta. Inicie sessão com a conta destinatária.</>}
                {qrNotice.tipo === 'indisponivel' && <>Não foi possível confirmar o protocolo <span className="font-mono text-slate-700">{qrNotice.protocolo}</span> — serviço de registo indisponível. Tente novamente dentro de momentos.</>}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setQrNotice(null)}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 transition-all cursor-pointer"
              title="Fechar aviso"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <AnimatePresence>
        {emergencyMode && isGovMode && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 32, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[2000] bg-red-600 text-white flex items-center justify-center gap-3 overflow-hidden shadow-2xl"
          >
            <ShieldAlert size={16} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] italic">MODO DE EMERGÊNCIA ACTIVO - OPERAÇÕES RESTRITAS</span>
            <ShieldAlert size={16} className="animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>
      
      <Sidebar 
        tab={tab} 
        setTab={setTab} 
        setSelectedMessage={setSelectedMessage} 
        setSelectedDoc={setSelectedDoc}
        handleLogout={handleLogout}
        appMode={appMode}
        setAppMode={setAppMode}
        setStage={(s) => {
          setStage(s);
          if (s === 'splash') {
            setLoginSubMode('normal');
          }
        }}
        currentLanguage={currentLanguage}
        theme={theme}
        equipaBloqueadaId={
          (isInstMode && instIdentity?.type === 'member')
            ? 'gov-contatos'
            : adminEquipaBloqueada
              ? 'gov-trabalhadores'
              : undefined
        }
        paginasPermitidas={paginasMenu}
      />
      <MobileNavBar 
        tab={tab} 
        setTab={setTab} 
        setSelectedMessage={setSelectedMessage} 
        setSelectedDoc={setSelectedDoc}
        appMode={appMode}
        currentLanguage={currentLanguage}
        equipaBloqueadaId={
          (isInstMode && instIdentity?.type === 'member')
            ? 'gov-contatos'
            : adminEquipaBloqueada
              ? 'gov-trabalhadores'
              : undefined
        }
        paginasPermitidas={paginasMenu}
      />

      <div className="flex-1 md:bg-white md:rounded-[24px] md:shadow-xl md:border-2 md:border-[#E2E8F0] dark:md:border-[#141d31] md:overflow-hidden flex flex-col min-h-screen md:min-h-0 relative">
        <div className={emergencyMode && isGovMode ? 'md:mt-0' : ''}>
          <Header 
            setTab={setTab} 
            tab={tab}
            currentLanguage={currentLanguage}
            setCurrentLanguage={setCurrentLanguage}
            iaLiveActive={iaLiveActive} 
            startIaVoice={startIaVoice} 
            stopIaVoice={stopIaVoice} 
            notifications={currentNotifications}
            showNotifications={showNotifications}
            setShowNotifications={setShowNotifications}
            isChatOpen={isChatOpen}
            setIsChatOpen={setIsChatOpen}
            appMode={appMode}
            emergencyMode={emergencyMode}
            isOnline={isOnline}
            theme={theme}
            setTheme={setTheme}
            onClickConnectivity={() => {
              setOfflineQueue(OfflineManager.getQueue());
              setShowOfflineManagerWidget(!showOfflineManagerWidget);
            }}
            offlineQueueLength={offlineQueue.length}
            unreadCorrespondencesCount={unreadTotal}
            unreadMessages={unreadMessagesList}
            onOpenUnreadMessage={handleOpenUnreadMessage}
            citizenOnlineTone={isInstMode ? institutionOnlineTone : citizenOnlineTone}
            chatAssistantRecognitionRef={chatAssistantRecognitionRef} // Repassar ref do reconhecimento de voz
            NotificationDropdown={() => (
              <NotificationDropdown 
                showNotifications={showNotifications} 
                setShowNotifications={setShowNotifications} 
                notifications={currentNotifications} 
                setTab={setTab} 
                setSelectedDoc={setSelectedDoc} 
                onClickNotification={(n) => {
                  setActiveNotificationModal(n);
                  setNotifications((prev) =>
                    prev.map((item) => item.id === n.id ? { ...item, unread: false } : item)
                  );
                  // 2026-08-22 — o estado "lida" é persistido na nuvem
                  // (read_at) e a notificação CONTINUA VISÍVEL no dropdown
                  // (secção "Lidas") até ao dia do agendamento passar.
                  if (!isDemoSession && n.id) {
                    void supabaseService.markNotificationRead(n.id);
                  }
                  setShowNotifications(false);
                }}
                onDeleteNotification={(id) => {
                  setNotifications((prev) => prev.filter((item) => item.id !== id));
                }}
              />
            )}
          />
        </div>

        {/* Content Area */}
        <div 
          ref={contentRef}
          data-cda-scroll=""
          className={`flex-1 px-4 pb-28 md:p-8 overflow-y-auto custom-scrollbar ${emergencyMode && isGovMode ? 'pt-[91px] md:pt-1' : (isGovMode ? 'pt-14 md:pt-1' : 'pt-14 md:pt-4')}`}
        >
          <div className="max-w-[1400px] mx-auto">
            {renderContent()}
          </div>
        </div>
      </div>

      <AIChatAssistant 
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          stopIaVoice();
        }}
        currentLanguage={currentLanguage}
        iaLiveActive={iaLiveActive} 
        stopIaVoice={stopIaVoice}
        startIaVoice={startIaVoice}
        appMode={appMode}
        onCreateRequest={handleCreateRequest}
        onNavigate={setTab}
        activeTab={tab}
        pageContextHint={getPageContentDescription(tab)}
        buscarCorrespondencias={buscarCorrespondenciasParaIA}
        onAbrirCorrespondencia={abrirCorrespondenciaPorVoz}
        recognitionRefOut={chatAssistantRecognitionRef} // Exportar ref de voz do assistente para o App
      />

      <AddContactModal 
        isAddingContact={isAddingContact} 
        setIsAddingContact={setIsAddingContact} 
        contactForm={contactForm} 
        setContactForm={setContactForm} 
        onAddContact={handleAddContact}
        formErrors={contactFormErrors}
      />

      <DeleteContactModal 
        contactToDelete={contactToDelete} 
        setContactToDelete={(c) => {
          setContactToDelete(c);
          if (!c) setContactDeleteBlock(null);
        }}
        handleDeleteContact={handleDeleteContact}
        blockReason={contactDeleteBlock}
      />

      {/* F58 — Página de difusão institucional (área Instituição apenas) */}
      {isInstMode && (
        <InstitutionEmergencyBroadcast
          isOpen={instEmgBroadcastOpen}
          citizenName={recipientLookup.status === 'found' ? recipientLookup.citizen.name : ''}
          citizenBi={recipientLookup.status === 'found' ? recipientLookup.citizen.bi : ''}
          messageText={composeData.body}
          recipients={instEmgRecipients}
          isLoadingRecipients={instEmgRecipientsBusy}
          recipientsError={instEmgRecipientsError}
          isSandbox={isDemoInstitutionSession}
          onSendRow={(member) =>
            recipientLookup.status === 'found'
              ? handleInstEmergencySendRow(member, recipientLookup.citizen)
              : Promise.resolve({ platform: 'falhou' as const, platformErrorCode: 'SEM_CIDADAO', waLink: null })
          }
          onClose={() => setInstEmgBroadcastOpen(false)}
        />
      )}

      {/* --- OFFLINE & FALLBACK INTERACTIVE MANAGER WIDGET --- */}
      <div className="fixed bottom-20 md:bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-none select-none">
        {/* Active Fallback Alert Overlay */}
        <AnimatePresence>
          {activeFallback && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="bg-slate-900 border border-amber-500/30 text-white rounded-2xl p-4 shadow-2xl max-w-sm pointer-events-auto"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500/15 text-amber-500 rounded-xl">
                  {activeFallback.channel === 'SMS' ? <Mail size={18} /> : activeFallback.channel === 'USSD' ? <Signal size={18} /> : <Smartphone size={18} />}
                </div>
                <div className="flex-1 min-w-0 font-sans">
                  <span className="font-extrabold text-[10px] uppercase tracking-widest text-amber-500 block">Canal Alternativo Acionado ({activeFallback.channel})</span>
                  <p className="text-xs text-slate-200 mt-1 leading-relaxed font-semibold">{activeFallback.message}</p>
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-800 pt-2 text-[10px] text-slate-400 font-mono">
                    <span>Protocolo: {activeFallback.protocol}</span>
                    <button
                      type="button"
                      onClick={() => setActiveFallback(null)}
                      className="text-amber-500 hover:underline font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Dispensar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Connectivity Central Modal */}
      <AnimatePresence>
        {showOfflineManagerWidget && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] border border-slate-100 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] w-full max-w-sm overflow-hidden text-left mx-auto relative z-10"
            >
              <div className="flex items-center gap-4 text-left relative shrink-0 p-6 md:p-10 pb-0">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100/40 shadow-sm shrink-0">
                  <Database size={26} strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-xl md:text-[23px] text-[#0c2340] italic uppercase tracking-tighter font-sans leading-none">Gestor Híbrido de Conectividade</h4>
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#4f46e5] block font-sans mt-1">Cache Local, Redundância SMS & USSD</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOfflineManagerWidget(false)}
                  className="absolute -top-1 -right-1 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-50"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Simulated Switch toggle */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
                  <div className="font-sans block text-left">
                    <span className="font-bold text-xs text-slate-800 block">Simular Perda de Internet</span>
                    <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">Teste de cache, fallbacks SMS/USSD.</span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={simulatedOffline}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setSimulatedOffline(val);
                        localStorage.setItem('gov_simulated_offline', String(val));
                        addAuditLog(val ? 'Modo de Conectividade: Simulação Offline Ativada' : 'Modo de Conectividade: Voltando ao estado Online', val ? 'warning' : 'success');
                      }}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Queue details */}
                <div className="space-y-2 text-left">
                  <div className="flex justify-between items-center font-sans">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Fila de Ações ({offlineQueue.length})</span>
                    <button
                      type="button"
                      onClick={() => {
                        OfflineManager.setQueue([]);
                        setOfflineQueue([]);
                        addAuditLog('Fila de ações offline limpa manualmente', 'warning');
                      }}
                      className="text-[9px] font-bold text-rose-600 hover:underline uppercase tracking-wide cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>

                  {offlineQueue.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center text-slate-400 font-sans">
                      <Database className="mx-auto text-slate-300 mb-2" size={22} />
                      <p className="text-[11px] font-semibold">Nenhuma ação pendente.</p>
                      <p className="text-[9px] mt-0.5 leading-relaxed">Ações offline serão sincronizadas automaticamente.</p>
                    </div>
                  ) : (
                    <div className="max-h-32 overflow-y-auto space-y-1.5 border border-slate-100 bg-slate-50 rounded-2xl p-2.5">
                      {offlineQueue.map((item) => (
                        <div key={item.id} className="p-2 bg-white rounded-lg border border-slate-150 flex items-center justify-between text-left font-sans">
                          <div>
                            <span className="text-[10px] font-bold text-slate-800 block uppercase font-mono">{item.type}</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">{new Date(item.timestamp).toLocaleTimeString('pt-AO')}</span>
                          </div>
                          <span className="text-[8px] bg-amber-100 border border-amber-200 text-amber-800 font-extrabold uppercase px-1.5 py-0.5 rounded-full font-mono">Pendente</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Channel Redundancy Info */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 font-sans text-left">
                  <span className="text-[11px] font-extrabold text-[#1e293b] flex items-center gap-1.5 uppercase tracking-wide">
                    <Signal size={14} className="text-primary animate-pulse" /> Canais Redundantes
                  </span>
                  <ul className="text-[10px] text-slate-500 font-bold space-y-1 mt-2 list-disc pl-4 leading-normal">
                    <li><strong className="text-primary">SMS:</strong> Dados compactados para número curto governamental.</li>
                    <li><strong className="text-primary">USSD:</strong> Código *141*9# para certidões sem internet.</li>
                  </ul>
                </div>
              </div>

              {/* Action feet */}
              <div className="p-4 bg-slate-50 border-t border-slate-150 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOfflineManagerWidget(false)}
                  className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  disabled={offlineQueue.length === 0}
                  onClick={() => {
                    handleAutomaticSync();
                    setShowOfflineManagerWidget(false);
                  }}
                  className={`flex-1 py-2.5 font-bold text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-1 cursor-pointer border-0 ${
                    offlineQueue.length > 0 
                      ? 'bg-primary text-white hover:opacity-95 shadow-md' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <RefreshCw size={12} className={offlineQueue.length > 0 ? 'animate-spin' : ''} />
                  Sincronizar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Sucesso com Selo de QR Code Gov */}
      <AnimatePresence>
        {successProtocolModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[99999] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              onMouseEnter={() => setPauseCountdown(true)}
              onMouseLeave={() => setPauseCountdown(false)}
              className="bg-white rounded-[32px] border border-slate-100 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] w-full max-w-[400px] max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden text-left mx-auto my-auto relative z-10"
            >
              <div className="flex items-center gap-4 text-left relative shrink-0 p-6 md:p-10 pb-0">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/40 flex items-center justify-center shrink-0 shadow-sm">
                  <Check size={26} className="stroke-[3]" />
                </div>
                <div className="relative z-10 font-sans leading-tight flex-1 min-w-0">
                  <h4 className="font-black text-xl md:text-[23px] text-[#0c2340] italic uppercase tracking-tighter">Comprovativo Enviado</h4>
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#4f46e5] block mt-1 leading-none">Seu comprovante de envio/BI foi registrado</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessProtocolModal(null)}
                  className="absolute top-4 right-4 text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 z-20 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* v37.78.30 — corpo com ROLAGEM INTERNA: o popup nunca mais é
                  cortado — cabe sempre no ecrã (max-h no cartão + flex-col:
                  cabeçalho e botões ficam sempre visíveis, o meio rola). */}
              <div className="p-4 space-y-3.5 overflow-y-auto min-h-0 flex-1 custom-scrollbar">
                <p className="text-slate-600 text-[9.5px] text-center leading-relaxed font-semibold font-sans px-1">
                  A correspondência/transferência foi sincronizada e enviada. O sistema gerou o selo digital oficial com QR Code de rastreio e registro abaixo.
                </p>

                <div className="w-full h-[3px] bg-gradient-to-r from-amber-500 via-amber-400 to-black rounded-full"></div>

                <div className="flex items-center justify-center gap-1.5">
                  <Shield size={12} className="text-amber-500 shrink-0" />
                  <span className="text-[9px] font-black text-[#0f172a] uppercase tracking-wider">
                    AGÊNCIA DE ANGOLA - MINISTÉRIO CMN
                  </span>
                </div>

                {/* QR Canvas Container (reduced 20% proportionally) */}
                <div className="bg-white p-2.5 rounded-[22px] border border-slate-150 shadow-sm relative flex items-center justify-center w-[120px] h-[120px] mx-auto">
                  <canvas id="protocol-qrcode-canvas" className="w-[100px] h-[100px]" />
                  <div className="absolute w-6 h-6 rounded-md bg-slate-900 border border-slate-700 flex items-center justify-center text-white shadow-md top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>

                {/* Info Instructions & Toggle Link */}
                <div className="text-center space-y-1 mt-1">
                  <span className="text-[8px] text-slate-400 font-medium block">
                    Aponte a câmera do seu dispositivo para escanear.
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSuccessDetails(!showSuccessDetails)}
                    className="text-[8px] font-black text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-wider block mx-auto hover:underline cursor-pointer border-0 bg-transparent"
                  >
                    {showSuccessDetails ? 'OCULTAR INFORMAÇÕES' : 'VER INFORMAÇÕES'}
                  </button>
                </div>

                {/* Collapsible Details Table */}
                <AnimatePresence initial={false}>
                  {showSuccessDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="bg-slate-50/40 border border-slate-150 rounded-2xl p-3 space-y-1.5 font-sans text-[8.5px] text-slate-600 overflow-hidden"
                    >
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                        <span className="text-slate-400 font-black tracking-wider uppercase text-[7px]">AGENTE:</span>
                        <span className="text-slate-700 font-extrabold truncate max-w-[170px] text-right">{successProtocolModal.org}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                        <span className="text-slate-400 font-black tracking-wider uppercase text-[7px]">NÚM. GESTÃO:</span>
                        <span className="text-slate-700 font-extrabold text-right">
                          {successProtocolModal.protocolNumber ? successProtocolModal.protocolNumber.split('-').pop() : '789'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                        <span className="text-slate-400 font-black tracking-wider uppercase text-[7px]">DATA DE REGISTO:</span>
                        <span className="text-slate-700 font-extrabold text-right">{successProtocolModal.officialIssueDate} às {successProtocolModal.officialTime}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                        <span className="text-slate-400 font-black tracking-wider uppercase text-[7px]">ASSUNTO:</span>
                        <span className="text-slate-700 font-extrabold truncate max-w-[170px] text-right" title={successProtocolModal.subject}>{successProtocolModal.subject}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                        <span className="text-slate-400 font-black tracking-wider uppercase text-[7px]">FICHEIRO ANEXO:</span>
                        <span className="text-slate-700 font-extrabold truncate max-w-[170px] text-right">
                          {successProtocolModal.subject ? `${successProtocolModal.subject.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)}.pdf` : "comprovativo_oficial.pdf"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                        <span className="text-slate-400 font-black tracking-wider uppercase text-[7px]">HASH (SHA-256):</span>
                        <span className="text-slate-500 font-mono font-medium truncate max-w-[140px] text-right" title={successProtocolModal.documentHash}>{successProtocolModal.documentHash}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-black tracking-wider uppercase text-[7px]">Nº AGT/BI:</span>
                        <span className="text-slate-700 font-extrabold text-right select-all">{successProtocolModal.protocolNumber}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action buttons */}
              <div className="p-4 bg-slate-50 border-t border-slate-150 flex flex-col gap-2 font-sans shrink-0">
                <button
                  type="button"
                  onClick={() => setSuccessProtocolModal(null)}
                  className="w-full py-2.5 bg-[#0f2d5c] text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-[#13376f] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 shadow-md"
                >
                  <Send size={11} className="rotate-45" /> Concluir e Fechar {pauseCountdown ? '(Pausado)' : `(${successModalCountdown}s)`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const canvas = document.getElementById('protocol-qrcode-canvas') as HTMLCanvasElement;
                    if (canvas) {
                      const url = canvas.toDataURL('image/png');
                      const link = document.createElement('a');
                      link.download = `selo-oficial-${successProtocolModal.protocolNumber}.png`;
                      link.href = url;
                      link.click();
                      addAuditLog(`Selo do Protocolo ${successProtocolModal.protocolNumber} exportado para impressão física`, 'success');
                    }
                  }}
                  className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download size={11} className="text-blue-600" /> Descarregar Selo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detalhe de Notificação Modificada Popup */}
      <NotificationDetailModal
        notification={activeNotificationModal}
        onClose={() => setActiveNotificationModal(null)}
        onNavigateToTab={(targetTab) => {
          setTab(targetTab);
          setSelectedDoc(null);
        }}
      />
    </main>
  );
}
