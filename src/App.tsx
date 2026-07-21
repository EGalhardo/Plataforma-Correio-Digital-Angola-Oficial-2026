/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Scan, Mail, QrCode, Users, User, Shield, ShieldAlert, Lock, Fingerprint, Smartphone, Key, ShieldCheck, Camera, Wifi, WifiOff, Database, RefreshCw, Signal, AlertTriangle, X, Mic, ArrowLeft, Check, CheckCircle, IdCard, UserPlus, ChevronRight, Lightbulb, Send, Download } from 'lucide-react';

// Components
import {
  Sidebar,
  MobileNavBar,
  Header,
  AIChatAssistant,
  NotificationDropdown,
  NotificationsCenterContent,
  ActivityCenterContent,
  AddContactModal,
  DeleteContactModal,
  InviteConfirmModal,
  HomeContent,
  MailContent,
  DocumentsContent,
  WalletContent,
  ContactsContent,
  ProfileContent,
  MessageDetail,
  DocumentDetail,
  GovDashboard,
  GovEmissaoContent,
  GovDocsContent,
  GovInteroperabilidadeContent,
  GovContactsContent,
  GovPerfilContent,
  GovSegurancaContent,
  GovRelatorioContent,
  GovCorrespondenciasContent,
  PastaDigitalContent,
  SolicitarDocumentoContent,
  RegisterStepper,
  HomologationGate,
  ResetPasswordStepper,
  VoiceGuideAssistant,
  InstitutionDetail,
  InstQrCodeContent,
  InstAiAssistantContent,
  GovIaContent,
  NotificationDetailModal,
  VideoSessionPage,
} from './components';

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
import { Message, Document, Contact, AppNotification, AppMode, UserRequest, DocRequest, Correspondence, LanguageCode } from './types';
import { ensureProtocolOnMessage, ensureProtocolOnDocument, generateProtocol } from './utils/protocolGenerator';
import { OfflineManager, OfflineAction } from './utils/offlineManager';
import { supabaseService, hasValidSupabaseKeys, resolveInstitutionCode, resolveCitizenBi } from './services/supabaseService';
import { homologationStore, normalizeHomologationBi } from './services/homologationStore';
import type { HomologationMessage } from './services/homologationStore';
import { supabase } from './lib/supabaseClient';
import { useSession } from './services/sessionStore';
import { VideoSessionService } from './services/videoSessionService';
import { useLanguage } from './hooks/useLanguage';
import { startImagePreloading, subscribeToPreload } from './utils/imagePreloader';
import { shouldAutoSeedSupabase, shouldUseLocalBootstrap, shouldUseMockFallback } from './config/runtime';


export default function App() {
  const { currentLanguage, setCurrentLanguage, t } = useLanguage();

  const [stage, setStage] = useState(() => {
    if (localStorage.getItem('skip_splash_and_show_login') === 'true') {
      localStorage.removeItem('skip_splash_and_show_login');
      return 'login';
    }
    return 'splash';
  });
  const [triggerRefetch, setTriggerRefetch] = useState(0);
  // Tick para forçar re-render quando a conta é ativada no ecrã de homologação
  const [gateRefreshTick, setGateRefreshTick] = useState(0);
  const [tab, setTab] = useState('home');
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessModalTitle, setAccessModalTitle] = useState('');
  const [accessModalMessage, setAccessModalMessage] = useState('');
  
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
          const existingIds = new Set(parsed.map((m: any) => m.id));
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
          const existingIds = new Set(parsed.map((m: any) => m.id));
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
          const existingIds = new Set(parsed.map((m: any) => m.id));
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
          const existingIds = new Set(parsed.map((m: any) => m.id));
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

  const handleDeleteMessage = (id: number) => {
    if (!deletedMessageIds.includes(id)) {
      setDeletedMessageIds([...deletedMessageIds, id]);
      const baseId = id >= 10000 ? id - 10000 : id;
      if (isOnline && hasValidSupabaseKeys()) {
        supabaseService.updateMessageState(baseId, { state_indicator: 'Arquivada' }).catch(() => {});
        supabaseService.insertMessageStateEvent({
          messageId: baseId,
          state: 'Arquivada',
          responsible: user?.name || 'Edlasio Galhardo',
          description: 'Correspondência movida para as eliminadas pelo utilizador.'
        }).catch(() => {});
      }
    } else {
      if (!hiddenMessageIds.includes(id)) {
        setHiddenMessageIds([...hiddenMessageIds, id]);
        const baseId = id >= 10000 ? id - 10000 : id;
        if (isOnline && hasValidSupabaseKeys()) {
          supabaseService.updateMessageState(baseId, { state_indicator: 'EliminadaPermanente' }).catch(() => {});
          supabaseService.insertMessageStateEvent({
            messageId: baseId,
            state: 'EliminadaPermanente',
            responsible: user?.name || 'Edlasio Galhardo',
            description: 'Correspondência eliminada permanentemente da vista do utilizador.'
          }).catch(() => {});
        }
      }
    }
  };

  const handleRestoreMessage = (id: number) => {
    setDeletedMessageIds(deletedMessageIds.filter(mid => mid !== id));
    const baseId = id >= 10000 ? id - 10000 : id;
    if (isOnline && hasValidSupabaseKeys()) {
      supabaseService.updateMessageState(baseId, { state_indicator: 'Ativa' }).catch(() => {});
      supabaseService.insertMessageStateEvent({
        messageId: baseId,
        state: 'Restaurada',
        responsible: user?.name || 'Edlasio Galhardo',
        description: 'Correspondência restaurada do arquivo.'
      }).catch(() => {});
    }
  };

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

  const [bi, setBiLocal] = useState(() => {
    if (shouldUseLocalBootstrap()) {
      return localStorage.getItem('correio_digital_bi') || MOCK_SESSION_USER.bi;
    }
    return MOCK_SESSION_USER.bi;
  });

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
    setBiLocal(preset.identifier);
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
    });
  };

  // Resolve e aplica a identidade real do cidadao que inicia sessao.
  // Contas demo canonicas manutem o preset; outros B.I.s carregam o perfil da nuvem (fallback local).
  const applyIdentityForLoggedUser = async () => {
    if (appMode !== 'user') return;
    const normalized = bi.trim().toUpperCase();
    if (!normalized) return;
    if (normalized === DEMO_CREDENTIALS.user.identifier) {
      // Conta demo canonica: garante que a foto canonica e restaurada
      updateUserFields?.({ avatarUrl: MOCK_SESSION_USER.avatarUrl });
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

      // 1) Nuvem: tabela profiles (RLS permissivo no schema atual)
      const isSupabaseReady = (import.meta as any).env.VITE_SUPABASE_URL && (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
      if (isSupabaseReady) {
        const { data, error } = await supabase
          .from('profiles')
          .select('name, phone, nif, passport, birth_date, filiation, marital_status')
          .eq('bi', normalized)
          .maybeSingle();
        if (error) console.error('CADA: erro ao carregar perfil da nuvem no login:', error);
        if (data) {
          resolvedName = data.name || '';
          resolvedPhone = data.phone || '';
          resolvedNif = data.nif || '';
          resolvedPassport = data.passport || '';
          resolvedBirthDate = data.birth_date ? String(data.birth_date).split('-').reverse().join('/') : '';
          resolvedFiliation = data.filiation || '';
          resolvedMaritalStatus = data.marital_status || '';
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
          if (!resolvedAvatar && reg.url_selfie) resolvedAvatar = reg.url_selfie;
        }
      }

      // 2) Fallback local: registo efetuado neste dispositivo (nome + foto/selfie)
      try {
        const saved = localStorage.getItem('gov_admin_citizens');
        if (saved) {
          const match = (JSON.parse(saved) as any[]).find((c: any) => (c.biNumber || '').toUpperCase() === normalized);
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

      if (!resolvedName) return; // B.I. desconhecido: mantem comportamento demo atual

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
  const [loginSubMode, setLoginSubMode] = useState<'normal' | 'two-factor' | 'face-capture' | 'register' | 'forgot'>('normal');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [showVoiceGuide, setShowVoiceGuide] = useState(false);
  const [highlightSteps, setHighlightSteps] = useState(false);
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [enteredPin, setEnteredPin] = useState('');
  const [faceProgress, setFaceProgress] = useState(0);
  const [isFaceScanning, setIsFaceScanning] = useState(false);
  const [demoFaceTemplateLoaded, setDemoFaceTemplateLoaded] = useState(false);
  const [demoFaceTemplateMeta, setDemoFaceTemplateMeta] = useState<{ capturedAt: string; identifier: string } | null>(null);
  const [tempFaceCaptures, setTempFaceCaptures] = useState<{ imageDataUrl: string; signature: number[] }[]>([]);
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
  const [messageSource, setMessageSource] = useState('correspondencias');
  const [wasOpenedUnread, setWasOpenedUnread] = useState(false);
  
  // Mic Activation State (UI only)
  const [iaLiveActive, setIaLiveActive] = useState(false);
  const chatAssistantRecognitionRef = useRef<any>(null); // Referência compartilhada do microfone
  const startIaVoice = () => setIaLiveActive(true);
  const stopIaVoice = () => setIaLiveActive(false);
  
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { user, appMode, setAppMode, activeProfile, updateUserFields } = useSession();
  const isGovMode = appMode === 'admin';
  const isInstMode = appMode === 'institution';
  const institutionCode = resolveInstitutionCode(activeProfile?.institutionName || '');

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
    if (stage === 'login' || stage === 'splash') {
      applyDemoPresetForMode(appMode, false);
      setLoginPasswordInput('');
      setEnteredOtp('');
      setEnteredPin('');
      setLoginError(null);
    }
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

  const computeFaceSignature = (canvas: HTMLCanvasElement): number[] => {
    const temp = document.createElement('canvas');
    temp.width = 16;
    temp.height = 16;
    const ctx = temp.getContext('2d');
    if (!ctx) return [];
    ctx.drawImage(canvas, 0, 0, temp.width, temp.height);
    const { data } = ctx.getImageData(0, 0, temp.width, temp.height);
    const signature: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
      signature.push(gray);
    }
    return signature;
  };

  const compareFaceSignatures = (a: number[], b: number[]) => {
    if (!a.length || !b.length || a.length !== b.length) return 999;
    const totalDiff = a.reduce((sum, value, index) => sum + Math.abs(value - b[index]), 0);
    return totalDiff / a.length;
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
        // Draw a premium looking futuristic face mapping silhouette on the canvas
        ctx.fillStyle = '#0f172a'; // dark background
        ctx.fillRect(0, 0, 300, 300);
        
        // Draw some grid lines
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
        
        // Draw glowing face oval
        ctx.beginPath();
        ctx.ellipse(150, 150, 70, 100, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Face points and coordinates
        ctx.fillStyle = '#60a5fa';
        // Eyes
        ctx.beginPath();
        ctx.arc(120, 130, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(180, 130, 4, 0, 2 * Math.PI);
        ctx.fill();
        // Nose
        ctx.beginPath();
        ctx.moveTo(150, 150);
        ctx.lineTo(145, 175);
        ctx.lineTo(155, 175);
        ctx.closePath();
        ctx.stroke();
        // Mouth
        ctx.beginPath();
        ctx.ellipse(150, 200, 20, 8, 0, 0, Math.PI);
        ctx.stroke();
        
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        // Compute signature based on this drawn canvas
        const signature = computeFaceSignature(canvas);
        return { imageDataUrl, signature };
      }
    }
    
    return null;
  };
  
  // Sincronização Unidirecional de Session para os estados locais do App.tsx
  useEffect(() => {
    if (user) {
      setBiLocal(prev => prev !== user.bi ? user.bi : prev);
      setPhoneLocal(prev => prev !== user.phone ? user.phone : prev);
      setNifLocal(prev => prev !== user.nif ? user.nif : prev);
      setPassportLocal(prev => prev !== user.passport ? user.passport : prev);
      setProfileNameLocal(prev => prev !== user.name ? user.name : prev);
      setUserBirthDateLocal(prev => prev !== user.birthDate ? user.birthDate : prev);
      setUserFiliationLocal(prev => prev !== user.filiation ? user.filiation : prev);
      setUserMaritalStatusLocal(prev => prev !== user.maritalStatus ? user.maritalStatus : prev);
    }
  }, [user]);

  useEffect(() => {
    setLoginError(null);
  }, [loginSubMode, appMode]);
  
  const [correspondenciaTab, setCorrespondenciaTab] = useState('lidas');
  const [videoSessionCount, setVideoSessionCount] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const [composeData, setComposeData] = useState<{ to: string; subject: string; body: string; attachments?: string[] }>({ to: '', subject: '', body: '', attachments: [] });

  const [documentosTab, setDocumentosTab] = useState('lidas');
  const [isDocComposing, setIsDocComposing] = useState(false);
  const [docComposeData, setDocComposeData] = useState({ to: '', subject: '', body: '' });

  const [contactForm, setContactForm] = useState({ name: '', bi: '', relation: '', phone: '', type: 'Normal' as 'Normal' | 'Emergência' });
  const [activeSlide, setActiveSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!selectedMessage && wasOpenedUnread) {
      setCorrespondenciaTab('lidas');
      setDocumentosTab('lidas');
      setWasOpenedUnread(false);
    }
  }, [selectedMessage, wasOpenedUnread]);
  const [showInviteConfirm, setShowInviteConfirm] = useState(false);
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

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        loginFaceStreamRef.current = stream;
        if (loginFaceVideoRef.current) {
          loginFaceVideoRef.current.srcObject = stream;
          await loginFaceVideoRef.current.play().catch(() => {});
        }
        setWebcamReady(true);
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
          await applyIdentityForLoggedUser();
          stopLoginFaceCamera();
          setStage('app');
          addAuditLog('Acesso concedido via Biometria Facial Local de Demonstração', 'success');
        })();
      }, 800);
    }
    return () => clearTimeout(timer);
  }, [faceProgress, loginSubMode, emergencyMode, bi, isInstMode, isGovMode, profileName]);

  // Reavaliação periódica em sessão de cidadão: desbloqueia a correspondência
  // assim que a Área de Administração aprovar o registo E mantém o canal oficial
  // de homologação actualizado (novas mensagens do admin aparecem em ~4s),
  // sem recarregar nem limpar dados.
  useEffect(() => {
    if (stage !== 'app' || appMode !== 'user') return;
    const id = setInterval(() => setGateRefreshTick(t => t + 1), 4000);
    return () => clearInterval(id);
  }, [stage, appMode, bi]);

  // Canal oficial de homologação (Área de Administração ⇄ Cidadão): espelha as
  // mensagens gravadas na homologationStore para a caixa de entrada do cidadão.
  // Sem este espelho, a correspondência do admin ficava invisível para o cidadão.
  const homologationInboxId = (raw: string): number => {
    let h = 0;
    for (let i = 0; i < raw.length; i++) h = ((h * 31) + raw.charCodeAt(i)) >>> 0;
    return 90000000 + (h % 8999999);
  };

  const buildHomologationInboxMessage = (msg: HomologationMessage, cleanBi: string): Message =>
    ensureProtocolOnMessage({
      id: homologationInboxId(msg.id),
      org: 'Área de Administração · CDA',
      preview: msg.text.length > 96 ? `${msg.text.slice(0, 96)}…` : msg.text,
      date: msg.at,
      unread: 1,
      status: 'Recebido',
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

  useEffect(() => {
    if (appMode !== 'user' || !bi) return;
    const cleanBi = normalizeHomologationBi(bi);
    const thread = homologationStore.getThread(bi).filter(m => m.from !== 'citizen');
    if (thread.length === 0) return;
    setInbox(prev => {
      const existing = new Set(prev.map(m => m.id));
      const fresh = thread
        .map(msg => buildHomologationInboxMessage(msg, cleanBi))
        .filter(m => !existing.has(m.id));
      return fresh.length > 0 ? [...fresh.slice().reverse(), ...prev] : prev;
    });
  }, [appMode, bi, gateRefreshTick]);

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

  const handleAutomaticSync = () => {
    const queue = OfflineManager.getQueue();
    if (queue.length === 0) return;

    addAuditLog(`Sincronização em segundo plano iniciada (${queue.length} acções na fila)`, 'info');
    
    // In a real application, we would call API endpoints for each queued action.
    // For this prototype, all actions are successfully processed into the active states.
    setTimeout(() => {
      OfflineManager.setQueue([]);
      setOfflineQueue([]);
      
      // Auto backup
      OfflineManager.createAutomaticBackup();
      
      addAuditLog(`Sincronização concluída: ${queue.length} acções propagadas com o Registo de Identidade Digital`, 'success');
      
      // Notify citizen user
      const newNotif: AppNotification = {
        id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
        type: 'success',
        title: 'Sincronização Finalizada',
        message: `${queue.length} acções offline foram consolidadas com a base central. Backup de emergência v1.2 atualizado.`,
        time: 'Agora',
        targetTab: 'home',
        unread: true
      };
      setNotifications(prev => [newNotif, ...prev]);
    }, 1500);
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
        console.log('CADA: Carregando dados integrados do Supabase...');
        
        // Auto-seed check: Check if messages are empty for this user, seed all default data if database is fresh
        const dbMessagesTest = await supabaseService.getMessages(bi);
        if (shouldAutoSeedSupabase() && (dbMessagesTest === null || dbMessagesTest.length === 0)) {
          console.log('CADA: Nenhum dado de mensagens encontrado para este utilizador no Supabase. Efetuando semeadura automática...');
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
          console.log('CADA: Semeadura automática para o Supabase concluída!');
        }

        // Define document classifier for messages
        const isDocumentMailboxMessage = (message: Message) => {
          const actionFlags = message.details?.actions || [];
          const compositeText = `${message.preview} ${message.details?.subject || ''}`.toLowerCase();
          return actionFlags.includes('__DOC__')
            || (message.id >= 10000 && /fatura|certid|documento|passaporte|bi digital|carta de condução|vacina|receita|guia|tramita/.test(compositeText));
        };

        // 1. Fetch Profile
        const dbProfile = await supabaseService.getProfile(bi);
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

        // 2. Fetch Citizen Messages / Institution Messages / Sent messages
        const dbMessages = await supabaseService.getMessages(bi);
        if (dbMessages !== null && isSubscribed) {
          const incoming = dbMessages.filter(m => !isDocumentMailboxMessage(m)).map(ensureProtocolOnMessage);
          const docs = dbMessages.filter(m => isDocumentMailboxMessage(m)).map(ensureProtocolOnMessage);
          
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

        const sentSenderKey = isInstMode ? institutionCode : isGovMode ? 'CDA' : bi;
        const dbSentMessages = await supabaseService.getSentMessagesBySender(sentSenderKey);
        if (dbSentMessages !== null && isSubscribed) {
          const sentNormal = dbSentMessages.filter(m => !isDocumentMailboxMessage(m)).map(ensureProtocolOnMessage);
          const sentDoc = dbSentMessages.filter(m => isDocumentMailboxMessage(m)).map(ensureProtocolOnMessage);
          
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

        if (isInstMode) {
          const dbInstitutionMessages = await supabaseService.getInstitutionMessages(institutionCode);
          if (dbInstitutionMessages !== null && isSubscribed) {
            const instNormal = dbInstitutionMessages.map(ensureProtocolOnMessage);
            const instDoc = dbInstitutionMessages.map(ensureProtocolOnMessage).map(m => ({ ...m, id: m.id + 10000 }));
            
            setInstInbox(prevLocal => {
              const dbIds = new Set(instNormal.map(m => m.id));
              const onlyLocal = prevLocal.filter(m => !dbIds.has(m.id));
              return [...instNormal, ...onlyLocal];
            });
            
            setInstDocInbox(prevLocal => {
              const dbIds = new Set(instDoc.map(m => m.id));
              const onlyLocal = prevLocal.filter(m => !dbIds.has(m.id));
              return [...instDoc, ...onlyLocal];
            });
          }
        }

        // 3. Fetch Documents
        const dbDocs = await supabaseService.getDocuments(bi);
        if (dbDocs !== null && isSubscribed) {
          setDocuments(prevLocal => {
            const dbCodes = new Set(dbDocs.map(d => d.code));
            const onlyLocal = prevLocal.filter(d => !dbCodes.has(d.code));
            return [...dbDocs, ...onlyLocal];
          });
        }

        // 4. Fetch Contacts
        const dbContacts = await supabaseService.getContacts(bi);
        if (dbContacts !== null && isSubscribed) {
          setContacts(prevLocal => {
            const dbIds = new Set(dbContacts.map(c => c.id));
            const onlyLocal = prevLocal.filter(c => !dbIds.has(c.id));
            return [...dbContacts, ...onlyLocal];
          });
        }

        // 5. Fetch User requests
        const dbUserRequests = await supabaseService.getUserRequests(isGovMode ? undefined : bi);
        if (dbUserRequests !== null && isSubscribed) {
          setUserRequests(prevLocal => {
            const dbIds = new Set(dbUserRequests.map(r => r.id));
            const onlyLocal = prevLocal.filter(r => !dbIds.has(r.id));
            return [...dbUserRequests, ...onlyLocal];
          });
        }

        // 6. Fetch Doc Requests
        const dbDocRequests = await supabaseService.getDocRequests(isGovMode ? undefined : bi);
        if (dbDocRequests !== null && isSubscribed) {
          setDocRequests(prevLocal => {
            const dbIds = new Set(dbDocRequests.map(r => r.id));
            const onlyLocal = prevLocal.filter(r => !dbIds.has(r.id));
            return [...dbDocRequests, ...onlyLocal];
          });
        }

        // 7. Fetch Notifications
        const notificationTarget = isGovMode ? 'CDA' : isInstMode ? institutionCode : bi;
        const dbNotifs = await supabaseService.getNotifications(notificationTarget);
        if (dbNotifs !== null && isSubscribed) {
          setNotifications(prevLocal => {
            const dbIds = new Set(dbNotifs.map(n => n.id));
            const onlyLocal = prevLocal.filter(n => !dbIds.has(n.id));
            return [...dbNotifs, ...onlyLocal];
          });
        }

        // 8. Fetch Audit Logs
        const dbLogs = await supabaseService.getAuditLogs();
        if (dbLogs !== null && isSubscribed) {
          setAuditLogs(prevLocal => {
            const dbIds = new Set(dbLogs.map(l => l.id));
            const onlyLocal = prevLocal.filter(l => !dbIds.has(l.id));
            return [...dbLogs, ...onlyLocal];
          });
        }

        // 9. Fetch Official Correspondences
        const dbCorrespondences = await supabaseService.getCorrespondences();
        if (dbCorrespondences !== null && isSubscribed) {
          setCorrespondences(prevLocal => {
            const dbIds = new Set(dbCorrespondences.map(c => c.id));
            const onlyLocal = prevLocal.filter(c => !dbIds.has(c.id));
            return [...dbCorrespondences, ...onlyLocal];
          });
        }

        console.log('CADA: Sincronização e carregamento do Supabase efectuados com sucesso!');
      } catch (err) {
        console.error('Erro na sincronização em segundo plano do Supabase:', err);
      }
    }

    loadSupabaseData();

    // Subscribe to all changes in Supabase realtime
    const channel = supabase
      .channel('schema-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        console.log('CADA: Supabase Realtime detectou alteração em mensagens!');
        setTriggerRefetch(t => t + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => {
        console.log('CADA: Supabase Realtime detectou alteração em documentos!');
        setTriggerRefetch(t => t + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requests' }, () => {
        console.log('CADA: Supabase Realtime detectou alteração em document_requests!');
        setTriggerRefetch(t => t + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_requests' }, () => {
        console.log('CADA: Supabase Realtime detectou alteração em user_requests!');
        setTriggerRefetch(t => t + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        console.log('CADA: Supabase Realtime detectou alteração em perfis!');
        setTriggerRefetch(t => t + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, () => {
        console.log('CADA: Supabase Realtime detectou alteração em contactos!');
        setTriggerRefetch(t => t + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        console.log('CADA: Supabase Realtime detectou alteração em notificações!');
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
      prev.forEach(m => {
        if (!m.org || m.org.trim() === '') {
          m.org = 'AGT'; // Corrige: atribui emissor padrão
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
      prev.forEach(m => {
        if (!m.org || m.org.trim() === '') {
          m.org = 'SME'; // Corrige: atribui emissor padrão
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
        const baseId = m.id >= 10000 ? m.id - 10000 : m.id;
        inboxReadStatus.set(baseId, m.unread || 0);
      });

      const updatedDocInbox = uniques.map(m => {
        const baseId = m.id >= 10000 ? m.id - 10000 : m.id;
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
      prev.forEach(m => {
        if (!m.org || m.org.trim() === '') {
          m.org = 'Cidadão';
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
      prev.forEach(m => {
        if (!m.org || m.org.trim() === '') {
          m.org = 'Cidadão';
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
      const uniques: any[] = [];
      prev.forEach(c => {
        if (!c.sender || c.sender.trim() === '') {
          c.sender = 'AGT';
          fixesCount++;
        }
        if (!c.recipient || c.recipient.trim() === '') {
          c.recipient = 'Edlasio Galhardo';
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
      prev.forEach(d => {
        if (!d.code || d.code.trim() === '') {
          d.code = `CDA-REP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          fixesCount++;
        }
        if (!d.holder || d.holder !== profileName) {
          d.holder = profileName;
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
      prev.forEach(c => {
        if (!c.bi || c.bi.trim() === '') {
          c.bi = `ANG-CONTACT-${Math.floor(Math.random() * 900000 + 100000)}`;
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
        return [checkNotif, ...prev];
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
      runAuditAndSincronizacaoCompleta();
    }

    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 2000); // Reduced a bit for better UX
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
      if (preloadCompleted) {
        // Add a slight delay for visual smoothness before entering login
        const timer = setTimeout(() => setStage('login'), 800);
        return () => clearTimeout(timer);
      } else {
        // Safety fallback timer if connection is slow or an image errors out
        const safetyTimer = setTimeout(() => {
          setStage('login');
        }, 6000);
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

  // Filtro do canal de homologação: durante a pendência o cidadão SÓ vê as
  // mensagens oficiais da Área de Administração; após a ativação, esse histórico
  // permanece acessível na caixa de entrada normal (sempre restrito ao seu BI).
  const isOwnHomologationMail = (m: Message) =>
    m.homologation === true && normalizeHomologationBi(m.homologationBi) === normalizeHomologationBi(bi);
  const currentInbox = isInstMode
    ? instInbox
    : homologationPendingForCitizen
      ? inbox.filter(isOwnHomologationMail)
      : inbox.filter(m => !m.homologation || isOwnHomologationMail(m));
  const unreadTotal = useMemo(() => currentInbox.filter(msg => !deletedMessageIds.includes(msg.id) && !hiddenMessageIds.includes(msg.id)).reduce((sum, msg) => sum + (msg.unread || 0), 0), [currentInbox, deletedMessageIds, hiddenMessageIds]);

  const currentDocInbox = isInstMode ? instDocInbox : (homologationPendingForCitizen ? [] : docInbox);
  const unreadDocTotal = useMemo(() => currentDocInbox.reduce((sum, msg) => sum + (msg.unread || 0), 0), [currentDocInbox]);

  const filteredMessages = useMemo(() => {
    let base: Message[] = [];
    if (correspondenciaTab === "excluidas") {
      const allMsgs = [...currentInbox, ...sentMessages];
      base = allMsgs.filter(item => deletedMessageIds.includes(item.id) && !hiddenMessageIds.includes(item.id));
    } else {
      if (correspondenciaTab === "enviadas") {
        base = sentMessages.filter(item => !deletedMessageIds.includes(item.id) && !hiddenMessageIds.includes(item.id));
      } else if (correspondenciaTab === "lidas") {
        base = currentInbox.filter(item => !deletedMessageIds.includes(item.id) && !hiddenMessageIds.includes(item.id) && !item.unread);
      } else {
        base = currentInbox.filter(item => !deletedMessageIds.includes(item.id) && !hiddenMessageIds.includes(item.id) && item.unread);
      }
    }

    if (!searchMail.trim()) return base;
    
    const term = searchMail.toLowerCase();
    return base.filter(m => 
      (m.org?.toLowerCase().includes(term) ?? false) || 
      (m.preview?.toLowerCase().includes(term) ?? false) ||
      (m.details?.subject?.toLowerCase().includes(term) ?? false)
    );
  }, [correspondenciaTab, currentInbox, sentMessages, searchMail, deletedMessageIds, hiddenMessageIds]);

  const filteredDocMessages = useMemo(() => {
    let base: Message[] = [];
    if (documentosTab === "enviadas") base = docSentMessages;
    else if (documentosTab === "lidas") base = currentDocInbox.filter((item) => !item.unread);
    else base = currentDocInbox.filter((item) => item.unread);

    if (!searchDocMail.trim()) return base;
    
    const term = searchDocMail.toLowerCase();
    return base.filter(m => 
      (m.org?.toLowerCase().includes(term) ?? false) || 
      (m.preview?.toLowerCase().includes(term) ?? false) ||
      (m.details?.subject?.toLowerCase().includes(term) ?? false)
    );
  }, [documentosTab, currentDocInbox, docSentMessages, searchDocMail]);

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
    if (!searchContact.trim()) return contacts;
    const term = searchContact.toLowerCase();
    return contacts.filter(c => 
      (c.name?.toLowerCase().includes(term) ?? false) || 
      (c.bi?.toLowerCase().includes(term) ?? false) ||
      (c.relation?.toLowerCase().includes(term) ?? false)
    );
  }, [contacts, searchContact]);

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
    supabaseService.insertAuditLog(newLog).catch(() => {});
  };

  // Handlers
  const handleSelectMessage = (message: Message) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSelectedMessage(message);
    setWasOpenedUnread(!!message.unread);
    if (isOnline && hasValidSupabaseKeys()) {
      const baseId = message.id >= 10000 ? message.id - 10000 : message.id;
      supabaseService.getMessageStateHistory(baseId).then((history) => {
        if (history && history.length > 0) {
          setSelectedMessage((prev) => prev ? {
            ...prev,
            stateHistory: history.map((event: any) => ({
              state: event.state,
              date: new Date(event.event_date).toLocaleDateString('pt-AO'),
              time: event.event_time?.slice(0,5) || '',
              responsible: event.responsible,
              description: event.description,
            }))
          } : prev);
        }
      }).catch(() => {});
    }
    setMessageSource(correspondenciaTab === 'enviadas' ? 'enviados' : 'correspondencias');
    
    if (message.unread) {
      const baseId = message.id >= 10000 ? message.id - 10000 : message.id;
      
      // Sincronização em tempo real de estado "Lida" em todos os arrays da plataforma
      setInbox(prev => prev.map(m => {
        const mBase = m.id >= 10000 ? m.id - 10000 : m.id;
        return mBase === baseId ? { ...m, unread: 0, status: 'Lida' } : m;
      }));
      setDocInbox(prev => prev.map(m => {
        const mBase = m.id >= 10000 ? m.id - 10000 : m.id;
        return mBase === baseId ? { ...m, unread: 0, status: 'Lida' } : m;
      }));
      setInstInbox(prev => prev.map(m => {
        const mBase = m.id >= 10000 ? m.id - 10000 : m.id;
        return mBase === baseId ? { ...m, unread: 0, status: 'Lida' } : m;
      }));
      setInstDocInbox(prev => prev.map(m => {
        const mBase = m.id >= 10000 ? m.id - 10000 : m.id;
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
        supabaseService.updateMessageState(baseId, { unread: false, status: 'Lida' }).catch(() => {});
        supabaseService.insertMessageStateEvent({
          messageId: baseId,
          state: 'Visualizada',
          responsible: user.name,
          description: 'Correspondência aberta e marcada como lida.'
        }).catch(() => {});
      }

      // Registo de auditoria certificado para provar sincronização
      addAuditLog(`Sincronização: Correspondência ID ${baseId} marcada como lida em todas as visões (Cidadão, Instituição, Administração)`, 'success');
    }
    
    setTab('mensagem');
  };

  const handleUpdateMessage = (updatedMsg: Message) => {
    setSelectedMessage(updatedMsg);
    setInbox(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
    setInstInbox(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
    setSentMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
    if (isOnline && hasValidSupabaseKeys()) {
      supabaseService.updateMessageState(updatedMsg.id >= 10000 ? updatedMsg.id - 10000 : updatedMsg.id, {
        unread: !!updatedMsg.unread,
        status: updatedMsg.status,
        preview: updatedMsg.preview,
        subject: updatedMsg.details?.subject,
        body: updatedMsg.details?.body,
        deadline_text: updatedMsg.details?.deadline,
        state_indicator: updatedMsg.details?.state,
        actions: updatedMsg.details?.actions,
      }).catch(() => {});
    }
  };

  const handleLogout = (clearAll = false) => {
    if (clearAll) {
      localStorage.clear();
      window.location.reload();
    } else {
      addAuditLog(`Sessão terminada pelo utilizador (${appMode})`, 'info');
      setLoginPasswordInput('');
      setEnteredOtp('');
      setEnteredPin('');
      setLoginError(null);
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
  const [isOfficialConfirmOpen, setIsOfficialConfirmOpen] = useState(false);
  const [isUrgentConfirmOpen, setIsUrgentConfirmOpen] = useState(false);

  const handleSendMessage = () => {
    // Para satisfazer as regras de negócio de confirmação do popup
    setIsOfficialConfirmOpen(true);
  };

  const handleSendUrgentMessage = () => {
    setIsUrgentConfirmOpen(true);
  };

  const executeOfficialSend = () => {
    setIsOfficialConfirmOpen(false);
    if (!composeData.to || !composeData.subject || !composeData.body) return;
    
    const messageId = Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
    const protocol = generateProtocol(composeData.to, 'message', messageId, composeData.subject);

    const newMessage: Message = {
      id: messageId,
      org: composeData.to,
      preview: composeData.subject,
      date: "hoje",
      status: "Informativo",
      details: {
        subject: composeData.subject,
        body: composeData.body,
        deadline: "Sem prazo",
        state: "Entregue & Autenticado",
        actions: ["Ver detalhes"],
        attachments: composeData.attachments || []
      },
      protocol: protocol
    };

    setSentMessages(prev => [newMessage, ...prev]);
    setIsComposing(false);
    setComposeData({ to: '', subject: '', body: '', attachments: [] });

    const protocolData = {
      protocolNumber: protocol.protocolNumber,
      org: composeData.to,
      subject: composeData.subject,
      digitalSignature: protocol.digitalSignature || `RSA-AO-2026-CHANCELAR-${protocol.protocolNumber}`,
      documentHash: protocol.documentHash || 'SHA256:d82ebd908e09f87c6533010b9876274',
      officialIssueDate: protocol.officialIssueDate || new Date().toLocaleDateString('pt-PT'),
      officialTime: protocol.officialTime || new Date().toLocaleTimeString('pt-PT').substring(0, 5)
    };
    setSuccessProtocolModal(protocolData);

    if (!isOnline) {
      const q = OfflineManager.queueAction('SEND_MESSAGE', { messageId, to: composeData.to, subject: composeData.subject });
      setOfflineQueue(OfflineManager.getQueue());
      
      const fallback = OfflineManager.triggerFallback('SMS', `Enviar Correspondência: ${composeData.subject}`);
      setActiveFallback({ channel: 'SMS', message: fallback.message, protocol: fallback.protocol });
      
      addAuditLog(`Ação Offline: Mensagem guardada em fila local. Canal SMS ativo.`, 'warning');
    } else {
      addAuditLog(`Correspondência enviada com Protocolo ${protocol.protocolNumber}`, 'info');
      OfflineManager.createAutomaticBackup();
      // Sync to Supabase
      const isOfficialDispatch = isInstMode || isGovMode;
      const sendPromise = isOfficialDispatch
        ? supabaseService.sendOfficialMessage(newMessage, composeData.to, isInstMode ? institutionCode : 'CDA')
        : supabaseService.sendCitizenMessage(newMessage, bi, composeData.to, user.name || profileName);
      sendPromise
        .then(async () => {
          // Store protocol in database for QR code reference
          await supabaseService.insertDigitalProtocol(protocol);
          
          await supabaseService.insertMessageStateEvent({
            messageId,
            state: 'Enviada',
            responsible: user.name,
            description: `Correspondência enviada para ${composeData.to}.`
          });
          if (isOfficialDispatch) {
            await supabaseService.insertNotification({
              title: 'Nova Correspondência Oficial',
              message: `${newMessage.preview} foi disponibilizada no seu endereço digital oficial.`,
              type: 'info',
              targetTab: 'correspondencias'
            }, composeData.to);
          } else {
            await supabaseService.insertNotification({
              title: 'Nova Solicitação do Cidadão',
              message: `${user.name} enviou uma nova correspondência para ${composeData.to}.`,
              type: 'info',
              targetTab: 'correspondencias'
            }, resolveInstitutionCode(composeData.to));
          }
        })
        .catch(() => {});
    }
  };

  const executeUrgentSend = () => {
    setIsUrgentConfirmOpen(false);
    if (!composeData.to || !composeData.subject || !composeData.body) return;

    const messageId = Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
    const protocol = generateProtocol(composeData.to, 'message', messageId, composeData.subject);

    // 4. Identificar como URGENTE com etiqueta vermelha e ícone ⚠
    const newMessage: Message = {
      id: messageId,
      org: composeData.to,
      preview: `⚠ [URGENTE] ${composeData.subject}`,
      date: "hoje",
      status: "Urgente",
      details: {
        subject: `⚠ ${composeData.subject}`,
        body: composeData.body,
        deadline: "IMEDIATO",
        state: "Urgente",
        actions: ["Ver detalhes"],
        attachments: composeData.attachments || []
      },
      protocol: protocol,
      priorityScale: 'Crítico'
    };

    setSentMessages(prev => [newMessage, ...prev]);
    setIsComposing(false);
    setComposeData({ to: '', subject: '', body: '', attachments: [] });

    // 5. Registar na base de dados (e localmente) os contactos notificados, remetente, etc.
    const notifiedContactsNames = contacts.map(c => c.name).join(', ') || 'Nenhum contacto registado';

    const protocolData = {
      protocolNumber: protocol.protocolNumber,
      org: composeData.to,
      subject: `⚠ [URGENTE] ${composeData.subject}`,
      digitalSignature: protocol.digitalSignature || `RSA-AO-2026-URGENTE-CHANCELAR-${protocol.protocolNumber}`,
      documentHash: protocol.documentHash || 'SHA256-URGENTE-b82ebd908e09f87c6533010b9876274',
      officialIssueDate: protocol.officialIssueDate || new Date().toLocaleDateString('pt-PT'),
      officialTime: protocol.officialTime || new Date().toLocaleTimeString('pt-PT').substring(0, 5)
    };
    setSuccessProtocolModal(protocolData);

    const isOfficialDispatch = isInstMode || isGovMode;

    if (!isOnline) {
      const q = OfflineManager.queueAction('SEND_URGENT_MESSAGE', { 
        messageId, 
        to: composeData.to, 
        subject: composeData.subject,
        notifiedContacts: notifiedContactsNames,
        type: 'Urgente'
      });
      setOfflineQueue(OfflineManager.getQueue());
      
      const fallback = OfflineManager.triggerFallback('SMS', `⚠ ALERTA URGENTE: ${composeData.subject}. Notificados: ${notifiedContactsNames}`);
      setActiveFallback({ channel: 'SMS', message: fallback.message, protocol: fallback.protocol });
      
      addAuditLog(`Ação Offline Crítica: Alerta Urgente enfileirado no buffer. Notificados: ${notifiedContactsNames}`, 'critical');
    } else {
      addAuditLog(`ALERTA CRÍTICO: Mensagem Urgente enviada para ${composeData.to}. Contactos notificados de emergência: ${notifiedContactsNames}`, 'critical');
      OfflineManager.createAutomaticBackup();
      
      const sendPromise = isOfficialDispatch
        ? supabaseService.sendOfficialMessage(newMessage, composeData.to, isInstMode ? institutionCode : 'CDA')
        : supabaseService.sendCitizenMessage(newMessage, bi, composeData.to, user.name || profileName);

      sendPromise
        .then(async () => {
          await supabaseService.insertDigitalProtocol(protocol);
          
          await supabaseService.insertMessageStateEvent({
            messageId,
            state: 'Quarentena / Urgência',
            responsible: user.name,
            description: `Mensagem Urgente enviada. Contactos alertados: ${notifiedContactsNames}.`
          });

          // Notificar destinatário principal e contactos
          await supabaseService.insertNotification({
            title: '⚠ ALERTA DE EMERGÊNCIA CRÍTICO',
            message: `Recebeu uma comunicação de emergência urgente de ${newMessage.org}.`,
            type: 'warning',
            targetTab: 'correspondencias'
          }, composeData.to);
        })
        .catch(() => {});
    }
  };

  const handleReply = (msg: Message) => {
    setComposeData({
      to: msg.org,
      subject: `RE: ${msg.details?.subject || msg.preview.substring(0, 30)}`,
      body: `\n\n--------------------------------\nEm resposta à mensagem de ${msg.date}:\n"${msg.preview}"`,
      attachments: []
    });
    setTab('correspondencias');
    setIsComposing(true);
  };

  const handleSendDocMessage = () => {
    if (!docComposeData.to || !docComposeData.subject || !docComposeData.body) return;
    
    const messageId = Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
    const protocol = generateProtocol(docComposeData.to, 'message', messageId, docComposeData.subject);

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

    setDocSentMessages(prev => [newMessage, ...prev]);
    setIsDocComposing(false);
    setDocComposeData({ to: '', subject: '', body: '' });

    const protocolData = {
      protocolNumber: protocol.protocolNumber,
      org: docComposeData.to,
      subject: docComposeData.subject,
      digitalSignature: protocol.digitalSignature || `RSA-AO-2026-CHANCELAR-${protocol.protocolNumber}`,
      documentHash: protocol.documentHash || 'SHA256:d82ebd908e09f87c6533010b9876274',
      officialIssueDate: protocol.officialIssueDate || new Date().toLocaleDateString('pt-PT'),
      officialTime: protocol.officialTime || new Date().toLocaleTimeString('pt-PT').substring(0, 5)
    };
    setSuccessProtocolModal(protocolData);

    if (!isOnline) {
      const q = OfflineManager.queueAction('SEND_DOCUMENT', { messageId, to: docComposeData.to, subject: docComposeData.subject });
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
          // Store protocol in database for QR code reference
          await supabaseService.insertDigitalProtocol(protocol);
          
          await supabaseService.insertMessageStateEvent({
            messageId,
            state: 'Enviado',
            responsible: user.name,
            description: `Documento/tramitação enviada para ${docComposeData.to}.`
          });
          if (isOfficialDispatch) {
            await supabaseService.insertNotification({
              title: 'Novo Documento / Tramitação',
              message: `${newMessage.preview} foi disponibilizado no seu canal oficial.`,
              type: 'info',
              targetTab: 'documentos'
            }, docComposeData.to);
          } else {
            await supabaseService.insertNotification({
              title: 'Novo Documento Submetido',
              message: `${user.name} submeteu uma nova tramitação para ${docComposeData.to}.`,
              type: 'info',
              targetTab: 'documentos'
            }, resolveInstitutionCode(docComposeData.to));
          }
        })
        .catch(() => {});
    }
  };

  const handleDocReply = (msg: Message) => {
    setDocComposeData({
      to: msg.org,
      subject: `RE: ${msg.details?.subject || msg.preview.substring(0, 30)}`,
      body: `\n\n--------------------------------\nEm resposta ao documento de ${msg.date}:\n"${msg.preview}"`
    });
    setTab('documentos');
    setIsDocComposing(true);
  };

  const handleDeleteContact = () => {
    if (contactToDelete) {
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
        // Background sync to Supabase
        supabaseService.deleteContact(contactToDelete.id).catch(() => {});
      }
      
      setContactToDelete(null);
    }
  };

  const handleAddContact = () => {
    if (!contactForm.name || !contactForm.bi) return;
    const newContact = {
      id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
      name: contactForm.name,
      bi: contactForm.bi,
      relation: contactForm.relation || "Contato",
      status: "Confirmado",
      type: contactForm.type || "Normal",
      phone: contactForm.phone || "",
    };

    setContacts(prev => [newContact, ...prev]);

    if (!isOnline) {
      OfflineManager.queueAction('ADD_CONTACT', { name: contactForm.name, bi: contactForm.bi });
      setOfflineQueue(OfflineManager.getQueue());
      const fallback = OfflineManager.triggerFallback('USSD', `Adicionar Contacto: ${contactForm.name}`);
      setActiveFallback({ channel: 'USSD', message: fallback.message, protocol: fallback.protocol });
      addAuditLog(`Ação Offline: Adição de contacto guardada em fila. Canal USSD ativo (*141*9#).`, 'warning');
    } else {
      addAuditLog(`Novo contacto adicionado: ${contactForm.name}`, 'success');
      OfflineManager.createAutomaticBackup();
      // Background sync to Supabase
      supabaseService.insertContact(newContact, bi).catch(() => {});
    }

    setIsAddingContact(false);
    setContactForm({ name: '', bi: '', relation: '', phone: '', type: 'Normal' });
  };

  const handleUpdateContactType = (id: number, newType: 'Normal' | 'Emergência') => {
    setContacts(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, type: newType };
        // Sync update
        supabaseService.insertContact(updated, bi).catch(() => {});
        return updated;
      }
      return c;
    }));
    addAuditLog(`Prioridade do contacto atualizada para ${newType}`, 'info');
  };

  const handleEmitDocument = (doc: Document, notification: AppNotification) => {
    setDocuments(prev => [doc, ...prev]);
    setNotifications(prev => [notification, ...prev]);
    
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
      user: 'Edlasio Galhardo', // Currently logged in user
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
      message: `O seu pedido de ${type} foi enviado à AGT.`,
      time: 'Agora',
      type: 'info',
      targetTab: 'home',
      unread: true
    };
    setNotifications(prev => [newNotif, ...prev]);

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
      
      case 'correspondencias':
        const unreadCount = inbox.filter(m => m.status === 'Não Lida').length;
        const messagesSummary = inbox.slice(0, 3).map(m => `- De: ${m.sender || m.org}, Assunto: ${m.subject || m.preview}, Status: ${m.status}`).join('\n');
        return `Você está na aba de Correspondência Oficial (Recebidas).
Total de correspondências na caixa de entrada: ${inbox.length} mensagens, das quais ${unreadCount} não foram lidas.
Aqui estão algumas correspondências em destaque no ecrã:
${messagesSummary || 'Nenhuma mensagem recente.'}`;
      
      case 'video-atendimento':
        return (
          <VideoSessionPage
            onBack={() => setTab('correspondencias')}
            onNavigateToMail={() => setTab('correspondencias')}
            addAuditLog={addAuditLog}
          />
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
        
      default:
        return 'Página informativa geral do utilizador no Correio Digital de Angola.';
    }
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
        setNotifications(prev => [{
          id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
          title: 'Documento Aprovado',
          message: `O seu pedido de ${request.docType} foi aprovado e emitido.`,
          time: 'Agora',
          type: 'success',
          targetTab: 'correspondencias',
          unread: true
        }, ...prev]);
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
        }, request.userBi).catch(() => {});
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
    switch (tab) {
      case 'home':
        return (
          <HomeContent
            activeSlide={activeSlide}
            setActiveSlide={setActiveSlide}
            isMobile={isMobile}
            setTab={setTab}
            unreadTotal={unreadTotal}
            inbox={currentInbox}
            sentMessages={sentMessages}
            handleSelectMessage={handleSelectMessage}
            onCreateRequest={handleCreateRequest}
            isInst={isInstMode}
            onDoubleClickInstitution={isGovMode ? undefined : (name) => {
              setSelectedInstitution(name);
              setTab('instituicao');
            }}
            currentLanguage={currentLanguage}
          />
        );
      case 'instituicao':
        if (!selectedInstitution) {
          return null;
        }
        return (
          <InstitutionDetail
            institutionName={selectedInstitution}
            inbox={currentInbox}
            sentMessages={sentMessages}
            docInbox={currentDocInbox}
            onBack={() => {
              setSelectedInstitution(null);
              setTab('home');
            }}
            onSelectMessage={handleSelectMessage}
          />
        );
      case 'correspondencias':
        return (
          <MailContent
            isComposing={isComposing}
            setIsComposing={setIsComposing}
            composeData={composeData}
            setComposeData={setComposeData}
            handleSendMessage={executeOfficialSend}
            handleSendUrgentMessage={executeUrgentSend}
            unreadTotal={unreadTotal}
            correspondenciaTab={correspondenciaTab}
            setCorrespondenciaTab={setCorrespondenciaTab}
            inbox={currentInbox}
            sentMessages={sentMessages}
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
          />
        );
      case 'video-atendimento':
        return (
          <VideoSessionPage
            onBack={() => setTab('correspondencias')}
            onNavigateToMail={() => setTab('correspondencias')}
            addAuditLog={addAuditLog}
          />
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
            sentMessages={docSentMessages}
            searchMail={searchDocMail}
            setSearchMail={setSearchDocMail}
            filteredMessages={filteredDocMessages}
            handleSelectMessage={handleSelectMessage}
            setTab={setTab}
            bi={bi}
            isInst={isInstMode}
            currentLanguage={currentLanguage}
          />
        );
      case 'mensagem':
        if (!selectedMessage) return null;
        return (
          <MessageDetail
            selectedMessage={selectedMessage}
            setSelectedMessage={setSelectedMessage}
            setTab={setTab}
            handleReply={handleReply}
            onUpdateMessage={handleUpdateMessage}
            onDeleteMessage={handleDeleteMessage}
            onRestoreMessage={handleRestoreMessage}
            isDeleted={deletedMessageIds.includes(selectedMessage.id)}
            backTab={selectedInstitution ? 'instituicao' : 'correspondencias'}
          />
        );
      case 'qr-code':
        if (isInstMode) {
          return (
          <GovDocsContent 
            documents={documents} 
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
        if (!selectedDoc) return null;
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
          <SolicitarDocumentoContent
            setTab={setTab}
            bi={bi}
            nif={nif}
            onEmitDocument={handleEmitDocument}
            isOnline={isOnline}
            addAuditLog={addAuditLog}
          />
        );
      case 'pasta-digital':
        return (
          <PastaDigitalContent
            documents={documents}
            docRequests={docRequests.filter(r => r.userBi === bi)}
            onCreateRequest={handleCreateDocRequest}
            setSelectedDoc={setSelectedDoc}
            setTab={setTab}
            logSecurityEvent={logSecurityEvent}
            emergencyMode={emergencyMode}
            correspondences={correspondences}
          />
        );
      case 'historico':
        return (
          <ActivityCenterContent
            appMode={appMode}
            messages={currentInbox}
            sentMessages={sentMessages}
            documents={documents}
            docRequests={isGovMode ? docRequests : docRequests.filter(r => r.userBi === bi)}
            userRequests={isGovMode ? userRequests : userRequests.filter(r => r.bi === bi)}
            correspondences={correspondences}
            notifications={notifications}
            auditLogs={auditLogs}
            setTab={setTab}
          />
        );
      case 'notificacoes':
        return (
          <NotificationsCenterContent
            notifications={notifications}
            setTab={setTab}
            appMode={appMode}
          />
        );
      case 'inst-qrcode':
        return (
          <InstQrCodeContent
            documents={documents}
            messages={isInstMode
              ? [...instInbox, ...instDocInbox, ...sentMessages, ...docSentMessages]
              : [...inbox, ...docInbox, ...sentMessages, ...docSentMessages]}
            onSelectMessage={handleSelectMessage}
            addAuditLog={addAuditLog}
            setTab={setTab}
          />
        );
      case 'inst-ai-assistant':
        return (
          <InstAiAssistantContent
            addAuditLog={addAuditLog}
            setTab={setTab}
          />
        );
      case 'contatos':
      case 'contactos':
        return appMode === 'institution' ? (
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
        ) : (
          <ContactsContent
            contacts={contacts}
            filteredContacts={filteredContacts}
            searchContact={searchContact}
            setSearchContact={setSearchContact}
            setIsAddingContact={setIsAddingContact}
            setContactToDelete={setContactToDelete}
            onUpdateContactType={handleUpdateContactType}
          />
        );
      case 'perfil':
        return (
          <ProfileContent
            isInst={isInstMode}
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
            contactsCount={contacts.length}
            setTab={setTab}
            handleLogout={handleLogout}
            inbox={homologationPendingForCitizen ? [] : inbox}
            docInbox={docInbox}
            sentMessages={sentMessages}
            contactsList={contacts}
            documentsList={documents}
            userRequests={userRequests}
            docRequests={docRequests}
            auditLogs={auditLogs}
            addAuditLog={addAuditLog}
          />
        );
      case 'gov-dashboard':
        return (
          <GovDashboard 
            onNavigate={setTab} 
            documents={documents} 
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
        );
      case 'gov-emissao':
        return (
          <GovEmissaoContent 
            onEmit={handleEmitDocument} 
            recentDocuments={documents} 
            emergencyMode={emergencyMode} 
            userRequests={userRequests.filter(r => r.status !== 'concluido')}
          />
        );
      case 'gov-correspondencias':
        return (
          <GovCorrespondenciasContent 
            correspondences={correspondences}
            onNavigate={setTab}
            onAddCorrespondence={async (newCor) => {
              setCorrespondences(prev => [newCor, ...prev]);
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
                  await supabaseService.insertDigitalProtocol(protocol);

                  // 6. Create citizen notification linked to their correct target_bi
                  await supabaseService.insertNotification({
                    title: 'Nova Correspondência Civil',
                    message: `Recebeu um novo expediente oficial da instituição ${newCor.sender}.`,
                    type: 'info',
                    targetTab: 'correspondencias'
                  }, resolvedBi);

                  // 7. Insert official Message State History Events in 'message_state_history'
                  const baseMsgId = finalMessageObj.id >= 10000 ? finalMessageObj.id - 10000 : finalMessageObj.id;
                  
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

              const matchedCor = correspondences.find(c => c.id === id);
              if (matchedCor && isOnline && hasValidSupabaseKeys()) {
                const updated = { ...matchedCor, status: newStatus };
                supabaseService.insertCorrespondence(updated).catch(err => console.error('Erro ao atualizar estado do expediente no Supabase:', err));
              }
            }}
          />
        );
      case 'gov-docs':
      case 'gov-documentos':
        return (
          <GovDocsContent 
            documents={documents} 
            requests={docRequests} 
            onUpdateStatus={handleUpdateDocRequest}
            setTab={setTab}
          />
        );
      case 'gov-contatos':
        return (
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
        );
      case 'gov-trabalhadores':
        return (
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
        );
      case 'gov-perfil':
        return (
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
                setNotifications(prev => [{
                  id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
                  title: 'ALERTA NACIONAL',
                  message: 'Protocolo de Emergência Activado pelo SOC',
                  time: 'Agora',
                  type: 'warning',
                  targetTab: 'correspondencias',
                  unread: true
                }, ...prev]);
              }
            }} 
          />
        );
      case 'gov-stats':
        return null; // Removido ou integrado no painel principal
      case 'gov-interoperabilidade':
        return <GovInteroperabilidadeContent onLog={addAuditLog} />;
      case 'gov-relatorio':
        return (
          <GovRelatorioContent 
            correspondences={correspondences}
            auditLogs={auditLogs}
          />
        );
      case 'gov-ia':
        return (
          <GovIaContent onLog={addAuditLog} />
        );
      case 'gov-seguranca':
        return (
          <GovSegurancaContent 
            emergencyMode={emergencyMode}
            onToggleEmergencyMode={(enabled) => {
              setEmergencyMode(enabled);
              localStorage.setItem('gov_emergency_mode', enabled ? 'true' : 'false');
              
              if (enabled) {
                // Add Audit logs
                addAuditLog('PROTOCOLO SOC-AN-2026 ATIVADO: Bloqueio Identitário e Chaves Criptográficas Encriptadas', 'critical');
                
                // Add Notification to citizen
                setNotifications(prev => [{
                  id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
                  title: 'ALERTA SOC-AN-2026 UNIFICADO',
                  message: 'Protocolo de Emergência Ciber-Defensiva Ativado. Chaves Faciais e Biométricas de Edlasio Galhardo Temporariamente Suspensas / Bloqueadas para Salvaguarda de Soberania Digital!',
                  time: 'Agora',
                  type: 'warning',
                  targetTab: 'home',
                  unread: true
                }, ...prev]);

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
        );

      default:
        return null;
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
      <section className="min-h-screen bg-white grid place-items-center relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center z-10 w-full max-w-md px-8"
        >
          <LazyImage 
            src="https://i.postimg.cc/cCkwskty/Logomarca-Correio-Digital.png" 
            alt="Correio Digital Logo" 
            priority={true}
            placeholder="skeleton"
            className="w-64 md:w-80 h-auto mx-auto mb-12"
            style={{ 
              width: '16rem', 
              height: 'auto',
              marginBottom: '3rem',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          />
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
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
      const captured = captureLoginFaceFrame();
      if (!captured) {
        setFaceCaptureError('Não foi possível capturar a imagem facial. Aguarde a ativação da câmara e tente novamente.');
        return;
      }

      setFaceCaptureError(null);
      setFaceProgress(20);
      setIsFaceScanning(true);
      
      const currentCapturesCount = tempFaceCaptures.length;
      setFaceCaptureHint(demoFaceTemplateLoaded 
        ? 'A comparar o rosto capturado com o perfil local armazenado...' 
        : `A processar captura ${currentCapturesCount + 1} de 3...`);
        
      addAuditLog(`Iniciou digitalização biométrica facial no portal (Captura ${demoFaceTemplateLoaded ? 'Login' : `${currentCapturesCount + 1}/3`})`, 'info');

      const finalize = (progress: number) => new Promise(resolve => setTimeout(() => {
        setFaceProgress(progress);
        resolve(true);
      }, 220));

      await finalize(45);
      await finalize(75);

      if (demoFaceTemplateLoaded) {
        const stored = readStoredDemoFace();
        let diff = 999;
        
        if (stored?.signatures && Array.isArray(stored.signatures)) {
          // Compare against all 3 registered signatures and find the best match
          const diffs = stored.signatures.map((sig: number[]) => compareFaceSignatures(captured.signature, sig));
          diff = Math.min(...diffs);
          console.log("3-Capture matching diffs:", diffs, "Best diff:", diff);
        } else if (stored?.signature) {
          diff = compareFaceSignatures(captured.signature, stored.signature);
        }

        if (!stored || diff > 22) {
          setIsFaceScanning(false);
          setFaceProgress(0);
          setFaceCaptureHint('Rosto não reconhecido neste dispositivo.');
          setFaceCaptureError('A validação facial local falhou. Tente novamente ou registe um novo rosto de demonstração.');
          addAuditLog(`DEMO_FACE_LOGIN_FAIL: Correspondência local não validada para ${appMode}`, 'warning');
          return;
        }
        setFaceCaptureHint('Rosto reconhecido com sucesso no dispositivo.');
        await finalize(100);
        setIsFaceScanning(false);
        addAuditLog(`DEMO_FACE_LOGIN_SUCCESS: Correspondência facial validada localmente para ${appMode}`, 'success');
        return;
      }

      // We are in registration mode
      const nextCaptures = [...tempFaceCaptures, captured];

      if (currentCapturesCount < 2) {
        // Not yet 3 captures. Save temporary progress.
        setTempFaceCaptures(nextCaptures);
        await finalize(100);
        setIsFaceScanning(false);
        setFaceProgress(0);
        
        const nextStep = currentCapturesCount + 2;
        if (nextStep === 2) {
          setFaceCaptureHint('Captura 1/3 gravada! Agora, incline ligeiramente o rosto para a ESQUERDA.');
          addAuditLog(`Biometria facial: Captura 1/3 (Frente) registada para ${appMode}`, 'info');
        } else if (nextStep === 3) {
          setFaceCaptureHint('Captura 2/3 gravada! Agora, sorria ou olhe ligeiramente para CIMA.');
          addAuditLog(`Biometria facial: Captura 2/3 (Esquerda) registada para ${appMode}`, 'info');
        }
        return;
      }

      // This is the 3rd capture! Compile and save.
      const avgSignature: number[] = [];
      const len = nextCaptures[0].signature.length;
      for (let i = 0; i < len; i++) {
        const sum = nextCaptures[0].signature[i] + nextCaptures[1].signature[i] + nextCaptures[2].signature[i];
        avgSignature.push(Math.round(sum / 3));
      }

      const storagePayload = {
        identifier: (bi || DEMO_CREDENTIALS[appMode].identifier).toUpperCase(),
        profileMode: appMode,
        displayName: profileName,
        capturedAt: new Date().toLocaleString('pt-AO'),
        imageDataUrl: captured.imageDataUrl,
        signature: avgSignature,
        signatures: nextCaptures.map(c => c.signature),
      };
      
      localStorage.setItem(getDemoFaceStorageKey(), JSON.stringify(storagePayload));
      setDemoFaceTemplateLoaded(true);
      setDemoFaceTemplateMeta({ capturedAt: storagePayload.capturedAt, identifier: storagePayload.identifier });
      setTempFaceCaptures([]);
      setFaceCaptureHint('Cadastro biométrico robusto concluído! 3/3 faces fundidas criptograficamente.');
      await finalize(100);
      setIsFaceScanning(false);
      addAuditLog(`DEMO_FACE_ENROLLED: Registo de 3 capturas biométricas concluído com sucesso para ${appMode}`, 'success');
    };

    const handleClearDemoFace = () => {
      localStorage.removeItem(getDemoFaceStorageKey());
      setDemoFaceTemplateLoaded(false);
      setDemoFaceTemplateMeta(null);
      setTempFaceCaptures([]);
      setFaceCaptureHint('Registo facial demo removido deste dispositivo.');
      setFaceCaptureError(null);
      setFaceProgress(0);
      addAuditLog(`DEMO_FACE_RESET: Registo facial local removido para ${appMode}`, 'warning');
    };

    const handleLoginSubmit = async () => {
      if (emergencyMode && !isInstMode && !isGovMode && (bi.toLowerCase().includes('002931298') || bi.toLowerCase().includes('edlasio') || profileName.toLowerCase().includes('edlasio'))) {
        setLoginError("Credenciais e chaves biométricas suspensas / bloqueadas temporariamente ao abrigo do protocolo SOC-AN-2026 para salvaguarda de soberania digital nacional.");
        addAuditLog("BLOQUEIO IDENTITÁRIO: Tentativa de login por Edlasio Galhardo suspensa (SOC-AN-2026)", "critical");
        return;
      }
      await applyIdentityForLoggedUser();
      setStage('app');
      addAuditLog('Login de Cidadão via Autenticação Segura', 'success');
    };

    return (
      <section className="min-h-screen p-4 bg-slate-50 flex items-center justify-center font-sans">
        <div className="max-w-[940px] w-full mx-auto grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-4.5 items-stretch">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`hidden md:flex bg-white rounded-3xl ${loginSubMode === 'face-capture' ? 'p-6 min-h-[410px]' : 'p-8 md:p-8 min-h-[510px]'} border border-[#E2E8F0] flex-col items-center justify-center text-center shadow-sm h-full relative overflow-hidden transition-all duration-300`}
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
                <LazyImage
                  src="https://i.postimg.cc/cCkwskty/Logomarca-Correio-Digital.png" 
                  alt="Correio Digital" 
                  priority={true}
                  placeholder="skeleton"
                  className={loginSubMode === 'face-capture' ? "w-35 h-auto mb-3" : "w-51 h-auto mb-5"}
                />
                <h1 className={`${loginSubMode === 'face-capture' ? 'text-lg md:text-xl mb-3' : 'text-xl md:text-2xl mb-4'} font-black text-slate-900 leading-tight italic uppercase tracking-tight`}>
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
            className={`bg-white rounded-3xl ${loginSubMode === 'face-capture' ? 'p-4.5 md:p-5.5 min-h-[410px]' : 'p-7 md:p-8 min-h-[510px]'} shadow-xl border border-[#E2E8F0] flex flex-col justify-between h-full transition-all duration-300 relative ${
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
                  <div className="flex items-center justify-center gap-6 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 pb-2 mb-1.5">
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
                        {(isInstMode || isGovMode) ? t("Número de Agente") : t("Número de BI de Cidadão")}
                      </span>
                      <div className="flex items-center gap-3 bg-white border border-slate-200 focus-within:border-[#0c2340] focus-within:ring-1 focus-within:ring-[#0c2340] rounded-xl px-3 py-1.5 transition-all">
                        <div className="w-9 h-9 bg-[#f0f4f9] text-[#1e3a8a] rounded-lg flex items-center justify-center shrink-0">
                          <IdCard size={17} className="text-[#2563eb]" />
                        </div>
                        <input 
                          className="w-full bg-transparent font-mono font-bold tracking-wider text-slate-800 border-none outline-none text-xs placeholder-slate-400"
                          value={bi}
                          onChange={(e) => setBi(e.target.value.toUpperCase())}
                          placeholder={isInstMode ? "AGT-9921-SR" : isGovMode ? "ADM-8812-OP" : "009874562LA041"}
                          maxLength={14}
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
                          type="password"
                          className="w-full bg-transparent font-bold tracking-wider text-slate-800 border-none outline-none text-xs placeholder-slate-400"
                          placeholder="••••••••••••"
                          value={loginPasswordInput}
                          onChange={(e) => setLoginPasswordInput(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col gap-2.5">
                      {/* Button ENTRAR NO PORTAL */}
                      <button 
                        onClick={handleLoginSubmit}
                        className="w-full bg-[#0E2B64] hover:bg-[#081a3d] text-white rounded-xl py-3 font-black text-[11px] uppercase tracking-wider shadow-[#0E2B64]/15 hover:opacity-95 transition-all cursor-pointer border-none"
                      >
                        {t("Entrar no Portal")}
                      </button>

                      {/* Button AUTO PREENCHER DEMONSTRAÇÃO */}
                      <div className="flex flex-col items-stretch">
                        <button
                          type="button"
                          onClick={handleDemoAutofill}
                          className="w-full bg-white hover:bg-slate-50 text-blue-600 border border-blue-600 rounded-xl py-2.5 font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
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
                        <p className="text-[10px] text-slate-400 font-extrabold text-center uppercase tracking-wider">
                          {isInstMode ? t('Credenciais de apresentação profissional') : isGovMode ? t('Credenciais de apresentação corporativa') : t('CREDENCIAIS DE APRESENTAÇÃO DO CIDADÃO')}
                        </p>

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
                      <div className="pt-3 mt-1.5 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setLoginSubMode('register');
                          }}
                          className="text-slate-600 hover:text-[#0c2340] transition-colors bg-transparent border-none cursor-pointer text-[10px] font-black uppercase tracking-widest font-sans flex items-center gap-1"
                        >
                          <UserPlus size={14} className="text-[#2563eb]" />
                          {t("Registar")}
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
                          ? (demoFaceTemplateLoaded ? t("Face local validada") : t("Face registrada")) 
                          : isFaceScanning 
                            ? `${t("A processar")}: ${faceProgress}%` 
                            : demoFaceTemplateLoaded 
                              ? t("Pronto para validação local") 
                              : tempFaceCaptures.length === 0 
                                ? t("Pronto para registo (Frente)") 
                                : tempFaceCaptures.length === 1 
                                  ? t("Pronto para registo (Esquerda)") 
                                  : t("Pronto para registo (Sorriso)")}
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
                      {demoFaceTemplateLoaded 
                        ? t('VALIDAR FACE LOCAL') 
                        : tempFaceCaptures.length === 0 
                          ? t('INICIAR CAPTURA (1/3: FRENTE)') 
                          : tempFaceCaptures.length === 1 
                            ? t('REGISTAR CAPTURA (2/3: ESQUERDA)') 
                            : t('REGISTAR CAPTURA (3/3: SORRISO)')}
                    </button>
                    <div className="flex flex-wrap items-center justify-center gap-3 text-[9.5px] font-black uppercase tracking-widest">
                      <button
                        type="button"
                        onClick={handleDemoAutofill}
                        className="text-slate-400 hover:text-primary transition-colors cursor-pointer bg-transparent border-0"
                      >
                        {t("Auto Preencher Demonstração")}
                      </button>
                      {demoFaceTemplateLoaded && (
                        <button
                          type="button"
                          onClick={handleClearDemoFace}
                          className="text-rose-500 hover:text-rose-700 transition-colors cursor-pointer bg-transparent border-0"
                        >
                          {t("Limpar Face Demo")}
                        </button>
                      )}
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
                  <RegisterStepper 
                    onCancel={() => setLoginSubMode('normal')} 
                    onSuccess={() => setLoginSubMode('normal')}
                    addAuditLog={addAuditLog}
                    appMode={appMode}
                  />
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
                    onCancel={() => setLoginSubMode('normal')}
                    onSuccess={() => setLoginSubMode('normal')}
                    addAuditLog={addAuditLog}
                    appMode={appMode}
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
                className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-[300]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-x-4 bottom-4 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-sm bg-white rounded-[32px] shadow-2xl z-[301] overflow-hidden border border-[#E2E8F0] text-left font-sans flex flex-col max-h-[85vh]"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white relative">
                  <button
                    onClick={() => setShowAccessModal(false)}
                    className="absolute top-5 right-5 p-1.5 hover:bg-white/10 rounded-full transition-all cursor-pointer border-0 text-white bg-transparent flex items-center justify-center placeholder:hidden"
                    type="button"
                  >
                    <X size={18} />
                  </button>
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 bg-white/10 rounded-[14px] flex items-center justify-center text-white border border-white/20">
                      <Shield size={23} className="text-indigo-200" />
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-300 font-bold">Correio Digital de Angola</div>
                      <h3 className="text-lg font-black italic tracking-tight uppercase leading-none mt-1">
                        {accessModalTitle}
                      </h3>
                    </div>
                  </div>
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
                      <p className="text-[10px] text-slate-450 font-medium leading-relaxed uppercase">
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
  // (homologationPendingForCitizen) — não existe página/écran de bloqueio.

  return (
    <main className={`min-h-screen bg-bg text-primary md:flex md:gap-5 md:p-5 font-sans selection:bg-primary selection:text-white transition-all ${emergencyMode && isGovMode ? 'pt-[32px] md:pt-[44px]' : ''}`}>
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
      />
      <MobileNavBar 
        tab={tab} 
        setTab={setTab} 
        setSelectedMessage={setSelectedMessage} 
        setSelectedDoc={setSelectedDoc}
        appMode={appMode}
        currentLanguage={currentLanguage}
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
            notifications={notifications}
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
            chatAssistantRecognitionRef={chatAssistantRecognitionRef} // Repassar ref do reconhecimento de voz
            NotificationDropdown={() => (
              <NotificationDropdown 
                showNotifications={showNotifications} 
                setShowNotifications={setShowNotifications} 
                notifications={notifications} 
                setTab={setTab} 
                setSelectedDoc={setSelectedDoc} 
                onClickNotification={(n) => {
                  setActiveNotificationModal(n);
                  setNotifications((prev) => 
                    prev.map((item) => item.id === n.id ? { ...item, unread: false } : item)
                  );
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
          className={`flex-1 px-4 pb-32 md:p-8 overflow-y-auto custom-scrollbar ${emergencyMode && isGovMode ? 'pt-[104px] md:pt-1' : (isGovMode ? 'pt-16 md:pt-1' : 'pt-16 md:pt-4')}`}
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
        recognitionRefOut={chatAssistantRecognitionRef} // Exportar ref de voz do assistente para o App
      />

      <AddContactModal 
        isAddingContact={isAddingContact} 
        setIsAddingContact={setIsAddingContact} 
        contactForm={contactForm} 
        setContactForm={setContactForm} 
        onAddContact={handleAddContact} 
      />

      <InviteConfirmModal 
        showInviteConfirm={showInviteConfirm} 
        setShowInviteConfirm={setShowInviteConfirm} 
        contactForm={contactForm} 
        handleAddContact={handleAddContact} 
      />

      <DeleteContactModal 
        contactToDelete={contactToDelete} 
        setContactToDelete={setContactToDelete} 
        handleDeleteContact={handleDeleteContact} 
      />

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
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden text-left mx-3"
            >
              <div className="p-5 bg-slate-950 text-white flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/20 text-primary rounded-xl">
                    <Database size={18} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[12px] uppercase tracking-wider text-white font-sans">Gestor Híbrido de Conectividade</h4>
                    <span className="text-[9px] uppercase tracking-widest text-slate-400 block font-sans">Cache Local, Redundância SMS & USSD</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOfflineManagerWidget(false)}
                  className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10"
                >
                  <X size={18} />
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
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              onMouseEnter={() => setPauseCountdown(true)}
              onMouseLeave={() => setPauseCountdown(false)}
              className="bg-white rounded-[28px] border border-slate-200 shadow-2xl w-full max-w-[360px] overflow-hidden text-left mx-4 my-8"
            >
              <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-950 text-white relative flex items-center gap-3">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl font-sans"></div>
                <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-500/20">
                  <Check size={18} className="stroke-[3]" />
                </div>
                <div className="relative z-10 font-sans leading-tight">
                  <h4 className="font-extrabold text-[13px] uppercase tracking-wider text-white">Comprovativo Enviado</h4>
                  <span className="text-[7.5px] uppercase font-bold tracking-wider text-[#93c5fd] block mt-0.5 leading-none">Seu comprovante de envio/BI foi registrado</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessProtocolModal(null)}
                  className="absolute top-4 right-4 text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 z-20 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-4 space-y-3.5">
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
              <div className="p-4 bg-slate-50 border-t border-slate-150 flex flex-col gap-2 font-sans">
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
