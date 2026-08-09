/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { notify } from '../../lib/notify';
import {
  BadgeCheck,
  ShieldCheck,
  Lock,
  Fingerprint,
  History,
  Settings,
  Languages,
  Bell,
  Scan,
  IdCard,
  Plane,
  Key,
  Smartphone,
  Camera,
  Check,
  X,
  ChevronRight,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  Award,
  Landmark,
  CheckCircle2,
  Cpu,
  Server,
  Laptop,
  WifiOff,
  Clock,
  Sparkles,
  Mail
} from 'lucide-react';
import { OfflineManager } from '../../utils/offlineManager';
import { motion, AnimatePresence } from 'motion/react';
import { Message, Document, Contact, UserRequest, DocRequest } from '../../types';
import { supabaseService, hasValidSupabaseKeys } from '../../services/supabaseService';
import { supabase } from '../../lib/supabaseClient';
import { syncProfileToCloud } from '../../services/profileSyncService';
import { beginProfileEdit, endProfileEdit } from '../../lib/profileEditGuard';
import { cloudChangePassword, hasActiveCloudSession, isCloudBound, cloudUpdateEmailReal, isEmailPlausivel, hasCloudEmailReal } from '../../services/cloudAuthService';
import { homologationStore } from '../../services/homologationStore';
import { CitizenProfile } from './CitizenProfile';
import { InstitutionProfile } from './InstitutionProfile';
import { useSession } from '../../services/sessionStore';


interface ProfileContentProps {
  isInst?: boolean;
  /** F12 — true apenas nas contas de demonstração (conteúdo simulado permitido). */
  sessionDemo?: boolean;
  showSensitiveData: boolean;
  setShowSensitiveData: (show: boolean) => void;
  bi: string;
  phone: string;
  nif: string;
  passport: string;
  verificationStatus: string;
  hasFacialAuth: boolean;
  hasTwoFactor: boolean;
  govPin: string;
  profileName?: string;
  userBirthDate?: string;
  userFiliation?: string;
  userMaritalStatus?: string;
  setBi: (bi: string) => void;
  setPhone: (phone: string) => void;
  setNif: (nif: string) => void;
  setPassport: (passport: string) => void;
  setVerificationStatus: (status: string) => void;
  setHasFacialAuth: (val: boolean) => void;
  setHasTwoFactor: (val: boolean) => void;
  setGovPin: (pin: string) => void;
  contactsCount: number;
  setTab: (tab: string) => void;
  handleLogout: (clearAll?: boolean) => void;
  inbox?: Message[];
  docInbox?: Message[];
  sentMessages?: Message[];
  contactsList?: Contact[];
  documentsList?: Document[];
  userRequests?: UserRequest[];
  docRequests?: DocRequest[];
  instAgentNumber?: string;
  auditLogs?: Array<{ action: string; time: string }>;
  addAuditLog?: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
}

export function ProfileContent({
  isInst = false,
  sessionDemo,
  showSensitiveData,
  bi,
  phone,
  nif,
  passport,
  hasFacialAuth,
  hasTwoFactor,
  govPin,
  profileName = 'Edlasio Galhardo',
  userBirthDate = '12/03/1995',
  userFiliation = 'António Galhardo & Maria Conceição',
  userMaritalStatus = 'Solteiro',
  setBi,
  setPhone,
  setNif,
  setPassport,
  setVerificationStatus,
  setHasFacialAuth,
  setHasTwoFactor,
  setGovPin,
  setTab,
  inbox = [],
  docInbox = [],
  sentMessages = [],
  contactsList = [],
  documentsList = [],
  userRequests = [],
  docRequests = [],
  instAgentNumber,
  auditLogs: passedAuditLogs = [],
  addAuditLog
}: ProfileContentProps) {
  const { user, activeProfile } = useSession();
  // Modal states
  const [isVerifying, setIsVerifying] = useState(false);
  const [isConfiguringSecurity, setIsConfiguringSecurity] = useState(false);

  // Citizen Preferences states
  const [isPrefsOpen, setIsPrefsOpen] = useState(false);
  const [prefSubTab, setPrefSubTab] = useState<'geral' | 'notificacoes' | 'conectividade' | 'privacidade' | 'supabase'>('geral');
  const [prefLanguage, setPrefLanguage] = useState(() => localStorage.getItem('gov_pref_language') || 'pt');
  const [prefNotificationSMS, setPrefNotificationSMS] = useState(() => localStorage.getItem('gov_pref_notif_sms') !== 'false');
  const [prefNotificationEmail, setPrefNotificationEmail] = useState(() => localStorage.getItem('gov_pref_notif_email') !== 'false');
  const [prefNotificationPush, setPrefNotificationPush] = useState(() => localStorage.getItem('gov_pref_notif_push') !== 'false');
  const [prefNotificationApp] = useState(() => localStorage.getItem('gov_pref_notif_app') !== 'false');
  const [prefPreferredHours, setPrefPreferredHours] = useState(() => localStorage.getItem('gov_pref_hours') || 'business'); // 'any' | 'business' | 'night'
  const [prefBiometricsEnabled, setPrefBiometricsEnabled] = useState(() => localStorage.getItem('gov_pref_biometrics') !== 'false');
  const [prefPrivacyLevel, setPrefPrivacyLevel] = useState(() => localStorage.getItem('gov_pref_privacy') || 'standard'); // 'standard' | 'maximum'
  const [prefPrivacyLogs, setPrefPrivacyLogs] = useState(() => localStorage.getItem('gov_pref_privacy_logs') !== 'false');
  const [prefEcoMode, setPrefEcoMode] = useState(() => localStorage.getItem('gov_pref_eco_mode') === 'true');
  const [prefOfflineUse, setPrefOfflineUse] = useState(() => localStorage.getItem('gov_pref_offline') === 'true');
  const [prefCommChannel, setPrefCommChannel] = useState(() => localStorage.getItem('gov_pref_comm_channel') || 'Notificação Push'); // 'SMS' | 'E-mail' | 'Notificação Push' | 'Correio Físico'
  
  // Edit profile states
  const { updateUserFields, updateActiveProfileFields } = useSession();
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editFiliation, setEditFiliation] = useState(user?.filiation || '');
  const [editMaritalStatus, setEditMaritalStatus] = useState(user?.maritalStatus || 'Solteiro');
  const [editRole, setEditRole] = useState(activeProfile?.role || '');
  const [editDepartment, setEditDepartment] = useState(activeProfile?.departmentName || '');
  const [editInstitution, setEditInstitution] = useState(activeProfile?.institutionName || '');

  // F45 (Auditoria F42 · Médio#10 — corrida F39): enquanto as Preferências /
  // edição de dados estiverem abertas, a hidratação da nuvem não pisa os campos.
  useEffect(() => {
    if (!isPrefsOpen) { endProfileEdit(); return; }
    beginProfileEdit();
    return () => endProfileEdit();
  }, [isPrefsOpen]);

  useEffect(() => {
    if (isPrefsOpen) {
      setEditName(user?.name || '');
      setEditEmail(user?.email || '');
      setEditPhone(user?.phone || '');
      setEditFiliation(user?.filiation || '');
      setEditMaritalStatus(user?.maritalStatus || 'Solteiro');
      setEditRole(activeProfile?.role || '');
      setEditDepartment(activeProfile?.departmentName || '');
      setEditInstitution(activeProfile?.institutionName || '');
    }
  }, [isPrefsOpen, user, activeProfile]);
  
  // Dynamic arrays for Sessions and Devices that can be removed/updated
  const [activeSessions, setActiveSessions] = useState(() => {
    const cached = localStorage.getItem('gov_pref_sessions');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Failed to parse gov_pref_sessions:', e);
      }
    }
    return [
      { id: 'sess-1', device: 'iPhone 15 Pro Max', location: 'Luanda, AO', ip: '197.231.42.10', date: 'Ativo agora', isCurrent: true },
      { id: 'sess-2', device: 'Chrome / Windows 11', location: 'Talatona, AO', ip: '102.219.16.42', date: 'Hoje às 08:14', isCurrent: false },
      { id: 'sess-3', device: 'Safari / iPad Air', location: 'Benguela, AO', ip: '197.231.15.55', date: '21 Mai, 16:45', isCurrent: false }
    ];
  });

  const [connectedDevices, setConnectedDevices] = useState(() => {
    const cached = localStorage.getItem('gov_pref_devices');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Failed to parse gov_pref_devices:', e);
      }
    }
    return [
      { id: 'dev-1', name: 'iPhone de Edlasio (Telemóvel Principal)', icon: 'smartphone', date: 'Autorizado em 12/03/2026', authorized: true },
      { id: 'dev-2', name: 'ThinkPad Lenovo X1 (Computador Fisco)', icon: 'laptop', date: 'Autorizado em 05/04/2026', authorized: true },
      { id: 'dev-3', name: 'Huawei MatePad 11 (Tablet Casa)', icon: 'tablet', date: 'Pendente de assinatura PIN', authorized: false }
    ];
  });

  // Verification Wizard states
  const [verifyStep, setVerifyStep] = useState(1);
  const [tempBi, setTempBi] = useState(bi);
  const [tempNif, setTempNif] = useState(nif);
  const [tempPassport, setTempPassport] = useState(passport);
  const [tempPhone, setTempPhone] = useState(phone);
  
  // Biometric capture states
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [captureSuccess, setCaptureSuccess] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [webcamBlocked, setWebcamBlocked] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Security configuration states
  const [tempPin, setTempPin] = useState(govPin);
  const [temp2FA, setTemp2FA] = useState(hasTwoFactor);
  const [tempFacial, setTempFacial] = useState(hasFacialAuth);

  // Log audit logs local helper simulate
  const [auditLogs, setAuditLogs] = useState<Array<{action: string, time: string}>>([
    { action: 'Acesso renovado via BI Digital', time: 'Hoje, 15:30' },
    { action: 'Sincronização com Registos SME', time: 'Ontem, 09:24' },
    { action: 'Verificação Parcial Validada', time: '12/05/2026' }
  ]);

  const [backupsList, setBackupsList] = useState(() => OfflineManager.getBackups());

  // Supabase states
  const [supabaseTesting, setSupabaseTesting] = useState(false);
  const [supabaseSyncing, setSupabaseSyncing] = useState(false);
  const [supabaseStatusMsg, setSupabaseStatusMsg] = useState<string>('');
  const [supabaseErrorMsg, setSupabaseErrorMsg] = useState<string>('');
  const [supabaseSuccessMsg, setSupabaseSuccessMsg] = useState<string>('');
  const [supabaseStats, setSupabaseStats] = useState<any>(null);

  const handleTestSupabaseConnection = async () => {
    setSupabaseTesting(true);
    setSupabaseErrorMsg('');
    setSupabaseSuccessMsg('');
    setSupabaseStatusMsg('A testar ligação ao servidor Supabase...');

    try {
      const result = await supabaseService.testConnection();
      if (result.success) {
        setSupabaseSuccessMsg(result.message);
        if (addAuditLog) {
          addAuditLog('Ligação ao Supabase testada com sucesso', 'success');
        }
      } else {
        setSupabaseErrorMsg(result.message);
        if (addAuditLog) {
          addAuditLog('Falha ao testar ligação do Supabase', 'warning');
        }
      }
    } catch (e) {
      setSupabaseErrorMsg(e?.message || 'Erro inesperado.');
    } finally {
      setSupabaseTesting(false);
      setSupabaseStatusMsg('');
    }
  };

  const handleSyncWithSupabase = async () => {
    setSupabaseSyncing(true);
    setSupabaseErrorMsg('');
    setSupabaseSuccessMsg('');
    setSupabaseStatusMsg('A iniciar sincronização e semeadura de dados com Supabase...');

    // Prepare profile packet
    const profilePacket = {
      bi,
      name: profileName,
      phone,
      nif,
      passport,
      birthDate: userBirthDate,
      filiation: userFiliation,
      maritalStatus: userMaritalStatus
    };

    try {
      const result = await supabaseService.seedAll({
        profile: profilePacket,
        inbox,
        docInbox,
        sentMessages,
        contacts: contactsList,
        documents: documentsList,
        userRequests,
        docRequests,
        auditLogs: passedAuditLogs
      });

      if (result.success) {
        setSupabaseSuccessMsg(result.message);
        setSupabaseStats(result.counts);
        if (addAuditLog) {
          addAuditLog('Sincronização bidireccional completa com Supabase', 'success');
        }
      } else {
        setSupabaseErrorMsg(result.message);
        if (result.counts) {
          setSupabaseStats(result.counts);
        }
      }
      return result;
    } catch (e) {
      const errMsg = e?.message || 'Erro de rede ou permissões ao sincronizar.';
      setSupabaseErrorMsg(errMsg);
      return { success: false, message: errMsg };
    } finally {
      setSupabaseSyncing(false);
      setSupabaseStatusMsg('');
    }
  };

  // Handle webcam stream start
  const startWebcam = async () => {
    setIsCapturing(true);
    setCaptureProgress(0);
    setCaptureSuccess(false);
    setWebcamBlocked(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 320, facingMode: 'user' } 
      });
      setWebcamStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera fallback triggered or blocked:", err);
      setWebcamBlocked(true);
    }
  };

  // Stop Webcam stream
  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    setIsCapturing(false);
  };

  // Biometric Progress Simulation effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCapturing && captureProgress < 100) {
      timer = setTimeout(() => {
        setCaptureProgress(prev => {
          const next = prev + Math.floor(Math.random() * 15) + 5;
          return next >= 100 ? 100 : next;
        });
      }, 300);
    } else if (isCapturing && captureProgress === 100) {
      setCaptureSuccess(true);
      stopWebcam();
    }
    return () => clearTimeout(timer);
  }, [isCapturing, captureProgress]);

  // Clean up webcam on unmount / modal close
  useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [webcamStream]);

  // Confirm verification process
  const handleFinalizeVerification = () => {
    setBi(tempBi);
    setNif(tempNif);
    setPassport(tempPassport);
    setPhone(tempPhone);
    setGovPin(tempPin);
    setHasTwoFactor(temp2FA);
    setHasFacialAuth(tempFacial);
    setVerificationStatus('Totalmente verificado');
    
    // Add event log
    const newLog = { action: 'Autenticação Avançada validada pelo SME', time: 'Agora mesmo' };
    setAuditLogs(prev => [newLog, ...prev]);

    setIsVerifying(false);
    setVerifyStep(1);
    setCaptureSuccess(false);
  };

  const handleUpdateSecuritySettings = () => {
    setGovPin(tempPin);
    setHasTwoFactor(temp2FA);
    setHasFacialAuth(tempFacial);
    
    const newLog = { action: 'Definições de PIN segurança atualizadas', time: 'Agora mesmo' };
    setAuditLogs(prev => [newLog, ...prev]);
    setIsConfiguringSecurity(false);
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');

  // F40 (v13) — alteração de palavra-passe REAL na nuvem (Supabase Auth):
  // contas migradas (não-demo) com sessão activa mudam a senha em TODOS os
  // dispositivos; a credencial local do cidadão é espelhada (transição v12 até
  // F-c). Sem sessão activa → mensagem honesta (nada quebra). Demos mantêm o
  // comportamento simulado anterior, com desvio explícito no log.
  const submitPasswordChange = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setPasswordSuccess(false);
    setPasswordSuccessMsg('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Por favor, preencha todos os campos.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas introduzidas não coincidem.');
      return;
    }
    const targetBi = (user?.bi || bi || '').trim();
    if (!!sessionDemo || homologationStore.isExempt(targetBi)) {
      console.log('[DEMO] cloudChangePassword ignorado — conta de demonstração (D7/v12).');
      setPasswordError('');
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('A nova palavra-passe deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('A nova palavra-passe deve ser diferente da senha atual.');
      return;
    }
    if (!hasValidSupabaseKeys()) {
      setPasswordError('Serviço temporariamente indisponível. A sua senha actual mantém-se válida — tente mais tarde.');
      return;
    }
    const sessionActive = await hasActiveCloudSession(supabase);
    if (!sessionActive) {
      setPasswordError(
        isCloudBound(targetBi)
          ? 'Sessão segura inactiva. Saia e entre novamente com a senha actual para activar a sessão de nuvem.'
          : 'Esta conta ainda não está ligada à nuvem — a alteração da palavra-passe fica disponível após o próximo início de sessão com senha.'
      );
      return;
    }
    const res = await cloudChangePassword(supabase, newPassword);
    if (res.outcome === 'ok') {
      // Espelho local da transição (v12/D3) — apenas na área do cidadão
      if (!isInst && targetBi) {
        try { localStorage.setItem(`citizen_pass_${targetBi}`, newPassword); } catch { /* sem espaço — sem espelho */ }
      }
      setPasswordError('');
      setPasswordSuccess(true);
      setPasswordSuccessMsg('Palavra-passe actualizada. Passe a usar a nova palavra-passe em todos os dispositivos.');
      addAuditLog?.('[AUTH-CLOUD] Palavra-passe actualizada na nuvem pelo próprio titular', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else if (res.outcome === 'weak') {
      setPasswordError('A nova palavra-passe foi recusada pelo serviço de autenticação — escolha uma mais forte (mínimo 8 caracteres).');
    } else if (res.outcome === 'no_session') {
      setPasswordError('Sessão segura inactiva. Saia e entre novamente com a senha actual.');
    } else {
      setPasswordError('Serviço temporariamente indisponível. A sua senha actual mantém-se válida — tente mais tarde.');
    }
  };

  // ITEM 3 (2026-08-09) — e-mail REAL de recuperação: torna possível o
  // "Esqueci Senha" por e-mail. A conta nasce com um e-mail técnico interno
  // que não recebe correio; aqui o titular associa um endereço entregável.
  const [emailInfo, setEmailInfo] = useState<{ email: string; isReal: boolean } | null>(null);
  const [novoEmailReal, setNovoEmailReal] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ texto: string; ok: boolean } | null>(null);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      if (!hasValidSupabaseKeys()) return;
      const r = await hasCloudEmailReal(supabase);
      if (vivo && r.outcome === 'ok') setEmailInfo({ email: r.email, isReal: r.isReal });
    })();
    return () => { vivo = false; };
  }, []);

  const submitEmailRealChange = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setEmailMsg(null);
    const alvo = novoEmailReal.trim().toLowerCase();
    if (!isEmailPlausivel(alvo)) {
      setEmailMsg({ texto: 'Escreva um e-mail válido (ex.: oseunome@gmail.com).', ok: false });
      return;
    }
    const targetBi = (user?.bi || bi || '').trim();
    if (!!sessionDemo || homologationStore.isExempt(targetBi)) {
      setEmailMsg({ texto: 'As contas de demonstração não aceitam e-mail de recuperação real (são locais, sem nuvem).', ok: false });
      return;
    }
    if (!hasValidSupabaseKeys()) {
      setEmailMsg({ texto: 'Serviço de autenticação indisponível neste ambiente.', ok: false });
      return;
    }
    setEmailBusy(true);
    const sessionActive = await hasActiveCloudSession(supabase);
    if (!sessionActive) {
      setEmailBusy(false);
      setEmailMsg({ texto: 'Sessão segura inactiva. Saia e entre novamente para associar o e-mail.', ok: false });
      return;
    }
    const res = await cloudUpdateEmailReal(supabase, alvo);
    setEmailBusy(false);
    if (res.outcome === 'ok') {
      setEmailMsg({
        texto: 'Pedido registado. Se o serviço pedir confirmação, receberá um e-mail no NOVO endereço — clique no link para concluir. A partir daí, entre pelo e-mail (verá a opção "Entrar com e-mail" no ecrã de entrada) e o "Esqueci Senha" passa a funcionar nesse endereço.',
        ok: true,
      });
      addAuditLog?.('[AUTH-CLOUD] Pedido de associação de e-mail real de recuperação efectuado pelo titular', 'success');
      setNovoEmailReal('');
      // Actualiza o estado do card já com optimismo honesto (a confirmação
      // pode ainda ser exigida — o texto acima explica isso)
      const r2 = await hasCloudEmailReal(supabase);
      if (r2.outcome === 'ok') setEmailInfo({ email: r2.email, isReal: r2.isReal });
    } else if (res.outcome === 'invalid_email') {
      setEmailMsg({ texto: res.message || 'E-mail inválido.', ok: false });
    } else if (res.outcome === 'no_session') {
      setEmailMsg({ texto: 'Sessão segura inactiva. Saia e entre novamente.', ok: false });
    } else {
      setEmailMsg({ texto: res.message || 'Não consegui associar o e-mail. Tente mais tarde.', ok: false });
    }
  };

  const correspondenceCount = (inbox || []).length + (docInbox || []).length + (sentMessages || []).length;
  const institutionsCount = new Set([
    ...(inbox || []).map((item) => item?.org).filter(Boolean),
    ...(docInbox || []).map((item) => item?.org).filter(Boolean),
    ...(sentMessages || []).map((item) => item?.org).filter(Boolean),
    ...(userRequests || []).map((item) => item?.institution).filter(Boolean),
    ...(docRequests || []).map((item) => item?.institution).filter(Boolean)
  ]).size;

  const renderProfileBody = () => {
    if (!isInst) {
      return (
        <CitizenProfile
          userProfilePhoto={user?.avatarUrl}
          setIsPrefsOpen={setIsPrefsOpen}
          setPrefSubTab={setPrefSubTab}
          setIsConfiguringSecurity={setIsConfiguringSecurity}
          setTab={setTab}
          profileName={user?.name}
          bi={user?.bi}
          phone={user?.phone}
          email={user?.email}
          userFiliation={user?.filiation}
          contactsList={contactsList}
          documentsList={documentsList}
          correspondencesCount={correspondenceCount}
          institutionsCount={institutionsCount}
          lastAccess={user?.lastAccess}
          onSyncSupabase={handleSyncWithSupabase}
          isSyncingSupabase={supabaseSyncing}
          addAuditLog={addAuditLog}
          sessionDemo={sessionDemo}
        />
      );
    }

    return (
      <InstitutionProfile
        userProfilePhoto={user?.avatarUrl}
        setIsPrefsOpen={setIsPrefsOpen}
        setPrefSubTab={setPrefSubTab}
        setIsConfiguringSecurity={setIsConfiguringSecurity}
        setTab={setTab}
        profileName={user?.name}
        nif={user?.nif}
        showSensitiveData={showSensitiveData}
        phone={user?.phone}
        bi={user?.bi}
        email={user?.email}
        role={activeProfile?.role}
        department={activeProfile?.departmentName}
        institution={activeProfile?.institutionName}
        lastAccess={user?.lastAccess}
        agentNumber={instAgentNumber}
        addAuditLog={addAuditLog}
      />
    );
  };

  // F43 (Auditoria F42, Médio#6): protótipo morto `old_renderProfileBody`
  //  (424 linhas, NUNCA chamado — origem do incidente F40-b) removido.
  //  A via única e viva é `renderProfileBody` (476–524).

return (
  <>
    {renderProfileBody()}



    {/* --- IDENTITY VERIFICATION WIZARD MODAL --- */}
      <AnimatePresence>
        {isVerifying && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] text-left"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-150 flex justify-between items-center bg-indigo-950 text-white">
                <div>
                  <h3 className="font-extrabold text-white text-base md:text-lg flex items-center gap-2 uppercase tracking-tight">
                    <Scan className="text-orange-400" size={20} />
                    Validação de Identidade Digital
                  </h3>
                  <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold mt-0.5">
                    Processo Homologado pelo SME & Ministério da Ciência
                  </p>
                </div>
                <button 
                  onClick={() => {
                    stopWebcam();
                    setIsVerifying(false);
                  }}
                  className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {verifyStep === 1 && (
                  <div className="space-y-4">
                    {/* Header Badge */}
                    <div className="flex justify-start">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#eff6ff] border border-blue-150 rounded-full text-[#1e3a8a] font-extrabold text-[9px] uppercase tracking-[0.18em]">
                        <Sparkles size={11} className="text-blue-500 fill-blue-100" />
                        <span>VALIDAÇÃO DE CREDENCIAIS</span>
                      </div>
                    </div>

                    <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-3xl flex gap-3 text-xs text-slate-700 leading-relaxed font-semibold">
                      <Landmark className="text-[#2563eb] shrink-0 mt-0.5" size={18} />
                      <span>
                        Para homologar a sua identidade, introduza e valide os seus identificadores oficiais nacionais em vigor. Estes dados serão processados via canais encriptados seguros do SME e AGT.
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* Número de BI */}
                      <div className="space-y-1.5 text-left">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Número de Bilhete de Identidade (BI)</span>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-[16px] bg-[#f0f4ff] border border-[#dbe4ff] flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
                            <IdCard size={18} />
                          </div>
                          <input 
                            type="text"
                            maxLength={14}
                            className="flex-1 h-12 bg-white border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-full px-5 py-3 text-xs md:text-sm font-bold text-slate-800 outline-none transition-all font-mono"
                            value={tempBi}
                            onChange={(e) => setTempBi(e.target.value.toUpperCase())}
                          />
                        </div>
                      </div>

                      {/* Número de NIF */}
                      <div className="space-y-1.5 text-left">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Número de Identificação Fiscal (NIF)</span>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-[16px] bg-[#f0f4ff] border border-[#dbe4ff] flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
                            <Landmark size={18} />
                          </div>
                          <input 
                            type="text"
                            maxLength={10}
                            className="flex-1 h-12 bg-white border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-full px-5 py-3 text-xs md:text-sm font-bold text-slate-800 outline-none transition-all font-mono"
                            value={tempNif}
                            onChange={(e) => setTempNif(e.target.value.replace(/\D/g, ''))}
                          />
                        </div>
                      </div>

                      {/* Número do Passaporte */}
                      <div className="space-y-1.5 text-left">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Número do Passaporte</span>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-[16px] bg-[#f0f4ff] border border-[#dbe4ff] flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
                            <Plane size={18} />
                          </div>
                          <input 
                            type="text"
                            maxLength={9}
                            className="flex-1 h-12 bg-white border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-full px-5 py-3 text-xs md:text-sm font-bold text-slate-800 outline-none transition-all font-mono"
                            value={tempPassport}
                            onChange={(e) => setTempPassport(e.target.value.toUpperCase())}
                          />
                        </div>
                      </div>

                      {/* Telefone Principal */}
                      <div className="space-y-1.5 text-left">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Telefone Principal Associado</span>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-[16px] bg-[#f0f4ff] border border-[#dbe4ff] flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
                            <Smartphone size={18} />
                          </div>
                          <input 
                            type="text"
                            className="flex-1 h-12 bg-white border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-full px-5 py-3 text-xs md:text-sm font-bold text-slate-800 outline-none transition-all font-sans"
                            value={tempPhone}
                            onChange={(e) => setTempPhone(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {verifyStep === 2 && (
                  <div className="space-y-4 text-center">
                    <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl flex gap-3 text-xs text-slate-700 leading-relaxed font-semibold text-left">
                      <Camera className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                      <span>
                        A captura biométrica realiza o mapeamento 3D facial e selfie de autenticação. Os seus vetores biométricos serão selados criptograficamente.
                      </span>
                    </div>

                    {/* Camera Feed Container */}
                    <div className="relative mx-auto w-56 h-56 rounded-full border-4 border-slate-100 overflow-hidden shadow-xl bg-slate-900 flex items-center justify-center">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-10" />
                      
                      {isCapturing && (
                        <div className="absolute inset-0 border-2 border-indigo-400 rounded-full animate-ping pointer-events-none z-20" />
                      )}

                      {/* Moving Scanning Bar */}
                      {isCapturing && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-pulse z-20" style={{
                          animation: 'scan-motion 2s infinite ease-in-out',
                          position: 'absolute'
                        }} />
                      )}

                      {captureSuccess ? (
                        <div className="flex flex-col items-center justify-center text-emerald-400 gap-1.5 z-10 bg-slate-950/80 w-full h-full p-4">
                          <BadgeCheck size={36} className="text-emerald-500" />
                          <span className="text-xs uppercase font-black tracking-widest text-[#10B981]">Biometria Gravada</span>
                          <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Selfie de Identificação Selada</span>
                        </div>
                      ) : isCapturing ? (
                        <div className="w-full h-full relative">
                          {webcamBlocked ? (
                            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-indigo-200 gap-1">
                              <Camera size={26} className="text-indigo-400 animate-bounce" />
                              <span className="text-[10px] font-black uppercase">Detetor de Face</span>
                              <span className="text-[9px] text-slate-300">Biometria simulada inteligente activa</span>
                              <div className="w-32 bg-slate-800 h-1 rounded-full overflow-hidden mt-2">
                                <div className="bg-indigo-400 h-full" style={{ width: `${captureProgress}%` }} />
                              </div>
                              <span className="text-[9px] font-mono mt-1">{captureProgress}%</span>
                            </div>
                          ) : (
                            <>
                              <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className="w-full h-full object-cover rounded-full"
                              />
                              <div className="absolute bottom-4 left-0 right-0 z-20 text-white flex flex-col items-center">
                                <span className="bg-indigo-600/90 text-[8.5px] px-2 py-0.5 rounded-full font-black uppercase text-center tracking-wider block">
                                  A mapear: {captureProgress}%
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-2.5 p-4 text-center">
                          <Camera size={40} className="text-slate-500" />
                          <p className="text-[10px] uppercase font-black tracking-widest text-slate-450 leading-relaxed">
                            Câmara em Espera
                          </p>
                          <p className="text-[8.5px] text-slate-500 font-medium">
                            Clique abaixo para iniciar o reconhecimento facial seguro
                          </p>
                        </div>
                      )}
                    </div>

                    {!isCapturing && !captureSuccess && (
                      <button 
                        onClick={startWebcam}
                        className="w-full max-w-sm mx-auto bg-primary text-white rounded-xl py-3.5 font-bold hover:bg-primary/95 transition-all text-xs uppercase tracking-wider block cursor-pointer border-0 shadow-lg"
                      >
                        Ativar Câmara em modo Biométrico
                      </button>
                    )}

                    {isCapturing && (
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest animate-pulse block">
                        Por favor, olhe fixamente para a câmara e não se mova...
                      </span>
                    )}

                    {captureSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl inline-flex items-center gap-2 max-w-md text-left">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        <span className="text-emerald-800 text-[10.5px] font-bold">
                          Assinatura biométrica facial certificada e vinculada à sua ID do SME nacional.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {verifyStep === 3 && (
                  <div className="space-y-4">
                    <div className="bg-transparent border border-slate-200 p-4 rounded-2xl flex gap-3 text-xs text-slate-700 leading-relaxed font-semibold">
                      <ShieldCheck className="text-primary shrink-0 mt-0.5" size={18} />
                      <span>
                        Configure os seus fatores de segurança fundamentais. O PIN governamental é obrigatório para assinar documentos de validade jurídica civis e fiscais.
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* PIN setup */}
                      <label className="grid gap-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">PIN Governamental de Assinatura (4 dígitos)</span>
                        <input 
                          type="password"
                          maxLength={4}
                          placeholder="••••"
                          value={tempPin}
                          className="w-full bg-transparent border border-slate-200 rounded-xl p-3 text-center text-lg font-mono font-black tracking-[0.5em] focus:outline-none focus:border-indigo-500"
                          onChange={(e) => setTempPin(e.target.value.replace(/\D/g, ''))}
                        />
                      </label>

                      {/* 2FA Toggle */}
                      <div className="bg-transparent border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-800 block">Autenticação em Dois Fatores (2FA)</span>
                          <span className="text-[10.5px] text-slate-400 block font-medium">Requer verificação adicional por código OTP no telemóvel ao fazer login.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={temp2FA}
                            onChange={(e) => setTemp2FA(e.target.checked)}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex flex-col items-center">
                      <div className="bg-emerald-50 border border-emerald-100 p-4.5 rounded-2xl w-full text-center space-y-2">
                        <Award className="text-emerald-600 mx-auto" size={28} />
                        <h4 className="text-slate-800 font-black text-sm uppercase tracking-wide">Pronto Para Selagem de Identidade</h4>
                        <p className="text-slate-500 text-xs">
                          Ao concluir, a sua conta assumirá o estatuto de <strong>Totalmente Verificado</strong> na infraestrutura de Angola.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Buttons */}
              <div className="p-6 border-t border-slate-200 flex gap-3 bg-transparent">
                {verifyStep > 1 && (
                  <button 
                    onClick={() => {
                      stopWebcam();
                      setVerifyStep(prev => prev - 1);
                    }}
                    className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-700 font-extrabold text-xs uppercase rounded-xl hover:bg-slate-100 cursor-pointer"
                  >
                    Retroceder
                  </button>
                )}
                
                {verifyStep < 3 ? (
                  <button 
                    onClick={() => {
                      if (verifyStep === 2 && !captureSuccess) {
                        notify("Por favor, conclua a digitalização biométrica facial antes de avançar.");
                        return;
                      }
                      setVerifyStep(prev => prev + 1);
                    }}
                    className="flex-1 py-3.5 bg-primary text-white font-extrabold text-xs uppercase rounded-xl hover:opacity-95 shadow-md flex items-center justify-center gap-1.5 cursor-pointer border-0"
                  >
                    Avançar <ChevronRight size={14} />
                  </button>
                ) : (
                  <button 
                    onClick={handleFinalizeVerification}
                    disabled={!tempPin || tempPin.length < 4}
                    className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs uppercase rounded-xl hover:opacity-95 shadow-lg flex items-center justify-center gap-1.5 cursor-pointer border-0 disabled:opacity-50"
                  >
                    Concluir e Selar Identidade <Check size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- PIN AND 2FA SECURITY CONFIGURATION PANEL --- */}
      <AnimatePresence>
        {isConfiguringSecurity && (
          <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-[28px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 text-left flex flex-col max-h-[90vh]"
            >
              {/* Header Box mirroring Image 3 */}
              <div className="p-5 md:p-6 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                    <Lock size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm md:text-base uppercase tracking-tight text-[#0c2340] italic leading-tight">
                      {isInst ? "Segurança de Agente do Estado" : "Configuração de Segurança"}
                    </h3>
                    <p className="text-[9px] text-[#2563eb] font-extrabold uppercase tracking-widest leading-none mt-1">
                      {isInst ? "Portal de Serviços da Instituição" : "Identidade Digital de Angola"}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsConfiguringSecurity(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto">
                <div className="space-y-5">
                  {/* ALTERAR PIN Section with dot selectors */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic block">
                      {isInst ? "Alterar PIN de Validação Operacional (4 dígitos) *" : "Alterar Código PIN Governamental (4 dígitos) *"}
                    </label>
                    <div className="relative mt-2">
                      <div className="w-full bg-slate-50/60 border border-slate-200 rounded-2xl py-4 flex items-center justify-center gap-4 cursor-pointer hover:bg-slate-100/50 transition-colors">
                        {[0, 1, 2, 3].map((index) => (
                          <span 
                            key={index}
                            className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                              tempPin.length > index ? 'bg-[#0c2340] scale-110' : 'bg-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      <input 
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={tempPin}
                        className="absolute inset-0 opacity-0 cursor-pointer text-center text-lg font-mono tracking-[0.5em]"
                        style={{ caretColor: 'transparent' }}
                        onChange={(e) => setTempPin(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  </div>

                  {/* F40 (v13) — Palavra-passe de acesso REAL na nuvem (Supabase Auth):
                      ligado aos botões "Alterar Palavra-passe" dos perfis Cidadão e Instituição. */}
                  <form onSubmit={submitPasswordChange} className="p-4 bg-slate-50/60 border border-slate-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center gap-2 text-[#0c2340]">
                      <Key size={14} className="text-indigo-600" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Alterar palavra-passe de acesso</span>
                    </div>
                    <input
                      type="password"
                      placeholder="Palavra-passe actual"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full h-10 bg-white border border-slate-200 focus:border-primary/40 rounded-xl px-4 text-xs font-semibold outline-none transition-all"
                    />
                    <input
                      type="password"
                      placeholder="Nova palavra-passe (mín. 8 caracteres)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full h-10 bg-white border border-slate-200 focus:border-primary/40 rounded-xl px-4 text-xs font-semibold outline-none transition-all"
                    />
                    <input
                      type="password"
                      placeholder="Confirmar nova palavra-passe"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-10 bg-white border border-slate-200 focus:border-primary/40 rounded-xl px-4 text-xs font-semibold outline-none transition-all"
                    />
                    {passwordError && (
                      <div className="text-[11px] text-red-650 font-black bg-red-50 border border-red-150 rounded-xl px-3 py-2">{passwordError}</div>
                    )}
                    {passwordSuccess && (
                      <div className="text-[11px] text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-150 rounded-xl px-3 py-2 flex items-center gap-1.5">
                        <Check size={13} className="text-emerald-600" />
                        {passwordSuccessMsg || 'Palavra-passe alterada com sucesso!'}
                      </div>
                    )}
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#0E2B64] hover:bg-[#081a3d] text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer border-0"
                    >
                      Actualizar Palavra-passe
                    </button>
                    <p className="text-[9px] text-slate-400 font-bold leading-snug">A nova palavra-passe passa a ser exigida em todos os dispositivos.</p>
                  </form>

                  {/* ITEM 3 (2026-08-09) — e-mail REAL de recuperação: activa o
                      "Esqueci Senha" por e-mail e a entrada por e-mail. */}
                  {!isInst && (
                    <form onSubmit={submitEmailRealChange} className="p-4 bg-slate-50/60 border border-slate-200 rounded-2xl space-y-2.5" data-testid="card-email-real">
                      <div className="flex items-center gap-2 text-[#0c2340]">
                        <Mail size={14} className="text-indigo-600" />
                        <span className="text-[10px] font-black uppercase tracking-wider">E-mail real de recuperação</span>
                      </div>
                      {emailInfo && (
                        <p className={`text-[9.5px] font-bold leading-snug m-0 ${emailInfo.isReal ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {emailInfo.isReal
                            ? `E-mail actual da conta: ${emailInfo.email} — já recebe correio; o "Esqueci Senha" funciona neste endereço.`
                            : 'A sua conta ainda usa um e-mail técnico interno que NÃO recebe correio — sem ele, o "Esqueci Senha" por e-mail não funciona. Associe um endereço real abaixo.'}
                        </p>
                      )}
                      <input
                        type="email"
                        placeholder="oseunome@gmail.com"
                        value={novoEmailReal}
                        onChange={(e) => setNovoEmailReal(e.target.value)}
                        className="w-full h-10 bg-white border border-slate-200 focus:border-primary/40 rounded-xl px-4 text-xs font-semibold outline-none transition-all"
                        autoComplete="email"
                      />
                      {emailMsg && (
                        <p className={`text-[10px] font-bold leading-snug m-0 ${emailMsg.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                          {emailMsg.texto}
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={emailBusy}
                        className="w-full py-2.5 bg-[#0E2B64] hover:bg-[#081a3d] disabled:bg-slate-300 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer border-0"
                      >
                        {emailBusy ? 'A registar…' : 'Associar e-mail real'}
                      </button>
                      <p className="text-[9px] text-slate-400 font-bold leading-snug">Depois de associado, pode passar a entrar com o e-mail (opção "Entrar com e-mail" no ecrã de entrada). O B.I. continua a ser a sua identidade na plataforma.</p>
                    </form>
                  )}

                  {/* 2FA Switch Panel */}
                  <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-blue-50/50 text-blue-600 flex items-center justify-center border border-blue-50 shrink-0">
                        <ShieldCheck size={16} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black text-[#0c2340] block truncate">
                          {isInst ? "Autenticação em Dois Fatores (AGT-2FA)" : "Autenticação 2 Fatores (2FA)"}
                        </span>
                        <span className="text-[10px] text-slate-500 block leading-tight truncate mt-0.5">
                          {isInst ? "Requer token OTP institucional no telemóvel" : "Requer confirmação complementar"}
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        checked={temp2FA}
                        onChange={(e) => setTemp2FA(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* Biometria Switch Panel */}
                  <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-indigo-50/50 text-indigo-600 flex items-center justify-center border border-indigo-50 shrink-0">
                        <Fingerprint size={16} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black text-[#0c2340] block truncate">
                          {isInst ? "Validação e Acesso Biométrico Facial" : "Login por Biometria Facial"}
                        </span>
                        <span className="text-[10px] text-slate-500 block leading-tight truncate mt-0.5">
                          {isInst ? "Usar biometria facial na assinatura pública" : "Usar mapeamento facial na autenticação"}
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        checked={tempFacial}
                        onChange={(e) => setTempFacial(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>

                {/* Audit Logs styled list matching Image 3 layout */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-[#4f46e5] font-black uppercase tracking-wider text-[10px] mb-3">
                    <History size={14} className="text-indigo-600" />
                    <span>{isInst ? "Histórico de Logs Tributários do Agente" : "Logs de Atividade Recentes"}</span>
                  </div>
                  
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 max-h-[140px] overflow-y-auto custom-scrollbar">
                    {auditLogs.length > 0 ? (
                      <div className="divide-y divide-slate-150">
                        {auditLogs.map((log, el) => (
                          <div key={el} className="flex justify-between items-center text-[10.5px] py-3 px-4 hover:bg-slate-100/50 transition-colors">
                            <span className="font-bold text-slate-700 truncate mr-2">{log.action}</span>
                            <span className="text-slate-400 font-mono text-[9px] shrink-0 font-semibold">{log.time}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-[10.5px] text-slate-400 font-medium">
                        Nenhum registo de atividade encontrado.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-6 md:p-8 bg-transparent border-t border-slate-150 flex gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsConfiguringSecurity(false)}
                  className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <X size={14} />
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={handleUpdateSecuritySettings}
                  disabled={!tempPin || tempPin.length < 4}
                  className="flex-[2] py-3.5 bg-[#0c2340] hover:bg-[#152e4d] text-white rounded-full font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none cursor-pointer active:scale-98"
                >
                  <Check size={14} />
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- CENTRAL COMPLETA DE PREFERÊNCIAS DO CIDADÃO --- */}
      <AnimatePresence>
        {isPrefsOpen && (
          <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 text-left flex flex-col my-4 max-h-[92vh]"
            >
              {/* Head */}
              <div className="p-3.5 md:p-4.5 bg-[#111A2E] text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 md:p-2 bg-primary/20 rounded-xl text-primary flex items-center justify-center">
                    <Settings size={18} className="animate-spin-slow" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs md:text-sm uppercase tracking-tight text-white leading-tight font-sans">
                      {isInst ? "Central de Preferências do Agente" : "Central de Preferências do Cidadão"}
                    </h3>
                    <p className="text-[8px] text-slate-400 uppercase tracking-widest font-black font-sans leading-none mt-0.5">
                      {isInst ? "Administração Geral Tributária \u2022 Identidade Funcional AGT" : "Correio Digital de Angola \u2022 Governação Inteligente"}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsPrefsOpen(false)}
                  className="text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="bg-transparent px-4 md:px-6 border-b border-slate-150 flex gap-2 overflow-x-auto scrollbar-none py-2 select-none shrink-0">
                {[
                  { id: 'geral', label: isInst ? 'Geral & Idioma AGT' : 'Geral & Idioma', icon: <Languages size={13} /> },
                  { id: 'notificacoes', label: isInst ? 'Canais Tributários' : 'Canais & Notifs', icon: <Bell size={13} /> },
                  { id: 'privacidade', label: isInst ? 'Privacidade & Biometria AGT' : 'Privacidade & Biometria', icon: <ShieldCheck size={13} /> },
                  { id: 'conectividade', label: isInst ? 'Sessões & Terminais' : 'Sessões & Dispositivos', icon: <Smartphone size={13} /> },
                  { id: 'supabase', label: 'Conexão Supabase', icon: <Server size={13} /> }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPrefSubTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border transition-all cursor-pointer duration-155 shrink-0 select-none ${
                      prefSubTab === tab.id
                        ? 'bg-primary border-primary text-white shadow-md shadow-primary/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Body */}
              <div className="p-4 md:p-5 overflow-y-auto space-y-5 flex-1 min-h-[250px]">
                {prefSubTab === 'geral' && (
                  <div className="space-y-5">
                    {/* Dados Pessoais / Editar Informações */}
                    <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-sans border-b border-slate-150 pb-1.5 mb-2 flex items-center gap-1.5">
                        <UserCheck size={14} className="text-primary shrink-0" /> Editar Dados do Perfil
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="space-y-1 block text-left">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                            Nome Completo
                          </label>
                          <input 
                            type="text" 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-850 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div className="space-y-1 block text-left">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                            Telemóvel Registado
                          </label>
                          <input 
                            type="text" 
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-850 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div className="space-y-1 block text-left">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                            Correio Eletrónico (Email)
                          </label>
                          <input 
                            type="email" 
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-850 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div className="space-y-1 block text-left">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                            Estado Civil
                          </label>
                          <select 
                            value={editMaritalStatus}
                            onChange={(e) => setEditMaritalStatus(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-850 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
                          >
                            <option value="Solteiro">Solteiro(a)</option>
                            <option value="Casado">Casado(a)</option>
                            <option value="Divorciado">Divorciado(a)</option>
                            <option value="Viúvo">Viúvo(a)</option>
                          </select>
                        </div>

                        {!isInst && (
                          <div className="space-y-1 block text-left sm:col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                              Filiação (Paternidade & Maternidade)
                            </label>
                            <input 
                              type="text" 
                              value={editFiliation}
                              onChange={(e) => setEditFiliation(e.target.value)}
                              placeholder="Pai & Mãe"
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-850 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        )}

                        {isInst && (
                          <>
                            <div className="space-y-1 block text-left">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                                Cargo Oficial / Função
                              </label>
                              <input 
                                type="text" 
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-850 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                              />
                            </div>

                            <div className="space-y-1 block text-left">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                                Departamento / Repartição
                              </label>
                              <input 
                                type="text" 
                                value={editDepartment}
                                onChange={(e) => setEditDepartment(e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-850 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                              />
                            </div>

                            <div className="space-y-1 block text-left sm:col-span-2">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                                Instituição Sincronizada
                              </label>
                              <input 
                                type="text" 
                                value={editInstitution}
                                onChange={(e) => setEditInstitution(e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-850 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Language select */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-sans">
                        {isInst ? "Selecione o Idioma do Terminal Funcional" : "Selecione o Idioma da plataforma"}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'pt', label: 'Português (AO)' },
                          { id: 'en', label: 'English (US)' },
                          { id: 'ln', label: 'Kimbundu' },
                          { id: 'umb', label: 'Umbundu' }
                        ].map((lang) => (
                          <button
                            key={lang.id}
                            type="button"
                            onClick={() => setPrefLanguage(lang.id)}
                            className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                              prefLanguage === lang.id
                                ? 'bg-primary/5 border-primary text-primary shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{lang.label}</span>
                            {prefLanguage === lang.id && <Check size={14} className="text-primary" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preferred time */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-sans">
                        {isInst ? "Janela Horária Recomendada para Diretivas e Alertas" : "Horário Preferido para Receção de Mensagens"}
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          { id: 'any', label: 'Qualquer hora', desc: 'Alertas sem restrição' },
                          { id: 'business', label: 'Horário Laboral', desc: 'Seg-Sex, 8h às 18h' },
                          { id: 'night', label: 'Período Noturno', desc: 'Fora do horário comercial' }
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setPrefPreferredHours(item.id)}
                            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between h-20 cursor-pointer ${
                              prefPreferredHours === item.id
                                ? 'bg-primary/5 border-primary text-primary shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="font-extrabold text-xs uppercase tracking-tight font-sans">{item.label}</span>
                            <span className="text-[10px] text-slate-400 font-bold font-sans">{item.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Eco and Offline switches */}
                    <div className="space-y-3 pt-2">
                      <div className="bg-transparent border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                        <div className="space-y-1 block text-left">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                            <Cpu size={14} className="text-primary" /> Modo Económico (Poupança de Dados)
                          </span>
                          <span className="text-[10px] text-slate-400 block font-medium font-sans leading-relaxed">
                            {isInst ? "Reduz animações complexas e acelera o carregamento em redes móveis de serviço aduaneiro." : "Reduz animações pesadas e acelera ligações em conexões lentas de dados (GPRS/3G)."}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={prefEcoMode}
                            onChange={(e) => setPrefEcoMode(e.target.checked)}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>

                      <div className="bg-transparent border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                        <div className="space-y-1 block text-left">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                            <WifiOff size={14} className="text-primary" /> Uso Offline de Documentos
                          </span>
                          <span className="text-[10px] text-slate-400 block font-medium font-sans leading-relaxed">
                            {isInst ? "Guarda réplicas seguras dos atos tributários e relatórios para consulta em campo offline." : "Guarda réplicas seguras e cifradas das suas certidões e mensagens de forma local para leitura off-grid."}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={prefOfflineUse}
                            onChange={(e) => setPrefOfflineUse(e.target.checked)}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {prefSubTab === 'notificacoes' && (
                  <div className="space-y-5">
                    {/* Preferred Comm method */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-sans">
                        {isInst ? 'Canal de Comunicação Preferencial da AGT' : 'Canal Preferido de Comunicação do Estado'}
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['Notificação Push', 'SMS', 'E-mail', 'Correio Físico'].map((channel) => (
                          <button
                            key={channel}
                            type="button"
                            onClick={() => setPrefCommChannel(channel)}
                            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-2 h-20 cursor-pointer ${
                              prefCommChannel === channel
                                ? 'bg-primary/5 border-primary text-primary shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="font-extrabold text-xs uppercase tracking-tight font-sans">{channel}</span>
                            {prefCommChannel === channel && <span className="text-[8px] bg-primary text-white font-extrabold uppercase px-1.5 py-0.5 rounded-full font-sans">Activo</span>}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fine-grained notifications checkboxes */}
                    <div className="space-y-3 pt-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-sans">
                        {isInst ? 'Notificações & Diretivas Técnicas da AGT' : 'Notificações e Avisos de Estado'}
                      </label>
                      
                      <div className="bg-transparent border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                        <div className="space-y-0.5 text-left block">
                          <span className="text-xs font-bold text-slate-800 block font-sans">
                            {isInst ? 'Alertas por SMS de Infrações Tributárias/Aduaneiras' : 'Alertas por SMS de Urgência Nacional'}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-medium font-sans">
                            {isInst ? 'Receber alertas imediatos de processos aduaneiros e relatórios urgentes.' : 'Receber avisos imediatos sobre notificações de trânsito urgentes e multas.'}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={prefNotificationSMS} 
                            onChange={(e) => setPrefNotificationSMS(e.target.checked)}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>

                      <div className="bg-transparent border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                        <div className="space-y-0.5 text-left block">
                          <span className="text-xs font-bold text-slate-800 block font-sans">
                            {isInst ? 'Correio Eletrónico Institucional Certificado' : 'E-mail Oficial Certificado'}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-medium font-sans">
                            {isInst ? 'Receber cópia digitalizada de pareceres oficiais e notificações tributárias em formato PDF.' : 'Receber cópia certificada em formato PDF no seu email registado.'}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={prefNotificationEmail} 
                            onChange={(e) => setPrefNotificationEmail(e.target.checked)}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>

                      <div className="bg-transparent border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                        <div className="space-y-0.5 text-left block">
                          <span className="text-xs font-bold text-slate-800 block font-sans">
                            {isInst ? 'Push de Auditoria no Dispositivo Autorizado' : 'Notificação Push no Telemóvel'}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-medium font-sans">
                            {isInst ? 'Alertas instantâneos de logs e acessos no seu terminal móvel de serviço.' : 'Alertas flutuantes rápidos de recepção segura no seu aplicativo.'}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={prefNotificationPush} 
                            onChange={(e) => setPrefNotificationPush(e.target.checked)}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {prefSubTab === 'privacidade' && (
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-sans">
                        {isInst ? "Segurança Facial & Biometria Funcional" : "Segurança Facial & Biometria"}
                      </label>
                      
                      <div className="bg-transparent border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                        <div className="space-y-1 block text-left">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                            <Fingerprint size={15} className="text-primary" /> Habilitar Biometria nos Terminais
                          </span>
                          <span className="text-[10px] text-slate-400 block font-medium font-sans leading-relaxed">
                            {isInst ? "Usa a face digitalizada ou impressão para validar atos oficiais e despachos alfandegários." : "Usa a sua face digitalizada ou impressão para validar as consultas fiscais ao BI ou à AGT."}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={prefBiometricsEnabled} 
                            onChange={(e) => setPrefBiometricsEnabled(e.target.checked)}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-sans">
                        {isInst ? "Nível de Privacidade e Confidencialidade de Dados" : "Nivel de Partilha de Dados e Privacidade"}
                      </label>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { id: 'standard', label: isInst ? "Privacidade Padrão Corporativa" : "Privacidade Padrão", desc: isInst ? "Sincronizar informações apenas na rede interna segura da AGT e SME." : "Sincronizar dados apenas SME e AGT nacionais." },
                          { id: 'maximum', label: isInst ? "Segurança Máxima de Estado" : "Segurança Máxima", desc: isInst ? "Bloqueia acessos externos aos seus logs de serviço tributário temporariamente." : "Bloqueia consultas automáticas por terceiros." }
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setPrefPrivacyLevel(item.id)}
                            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                              prefPrivacyLevel === item.id
                                ? 'bg-primary/5 border-primary text-primary shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="font-extrabold text-xs uppercase tracking-tight font-sans">{item.label}</span>
                            <span className="text-[10px] text-slate-400 font-bold mt-1 leading-normal font-sans">{item.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-transparent border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                      <div className="space-y-0.5 text-left block">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1 font-sans">Wipe de Logs de Segurança</span>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          {isInst ? "Exclusão periódica automática a cada 15 dias para proteger o segredo fiscal e dados aduaneiros." : "Wipe automático dos seus logs locais a cada 15 dias para proteger o seu histórico pessoal."}
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={prefPrivacyLogs} 
                          onChange={(e) => setPrefPrivacyLogs(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {/* CITIZEN BACKUP CENTER */}
                    <div className="border border-slate-200 rounded-3xl p-4 bg-transparent space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="text-left font-sans">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                            {isInst ? 'Arquivos e Backups do Agente' : 'Arquivos e Backups do Cidadão'}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                            {isInst ? 'Cópias cifradas redundantes em sandbox corporativa' : 'Cópias cifradas redundantes de segurança local'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newBackup = OfflineManager.createAutomaticBackup();
                            setBackupsList(OfflineManager.getBackups());
                            setAuditLogs(prev => [{ action: `Backup de Segurança Criado (${newBackup.version})`, time: 'Agora mesmo' }, ...prev]);
                            notify(isInst ? `Chave de Cópia Virtual criada localmente: ${newBackup.version}\nDados salvos com sucesso no browser do Agente.` : `Chave de Cópia Virtual criada localmente: ${newBackup.version}\nDados compactados salvos com sucesso no browser do Cidadão.`);
                          }}
                          className="py-1.5 px-3 bg-primary text-white font-extrabold text-[9px] uppercase tracking-wider rounded-lg hover:opacity-90 transition-all border-0 cursor-pointer"
                        >
                          + Novo Backup
                        </button>
                      </div>

                      {backupsList.length === 0 ? (
                        <div className="text-center p-4 bg-white border border-slate-150 rounded-2xl text-slate-400 text-[10px] font-semibold">
                          {isInst ? "Nenhum backup arquivado na sandbox local do agente." : "Nenhum backup arquivado na sandbox local do cidadão."}
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {backupsList.map((bak) => (
                            <div key={bak.timestamp} className="p-2.5 bg-white border border-slate-150 rounded-xl flex justify-between items-center text-left font-sans text-[10px]">
                              <div>
                                <span className="font-bold text-slate-800 block font-mono">ARQUIVO {bak.version}</span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{new Date(bak.timestamp).toLocaleString('pt-AO')}</span>
                              </div>
                              <span className="text-[9px] bg-slate-100 px-2 py-0.5 font-bold uppercase rounded-full text-slate-600 font-mono">{(bak.dataSize / 1024).toFixed(2)} KB</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {prefSubTab === 'conectividade' && (
                  <div className="space-y-5 text-left">
                    {/* Active Sessions */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-sans">
                          {isInst ? 'Sessões Ativas no Sistema de Fisco AGT' : 'Sessões Ativas no Portal'}
                        </label>
                        <span className="text-[9px] bg-slate-150 px-2.5 py-1 text-[#1e293b] rounded-full font-black uppercase tracking-widest font-sans">{activeSessions.length} Activas</span>
                      </div>

                      <div className="space-y-2 divide-y divide-slate-100 bg-transparent border border-slate-200 rounded-xl p-3">
                        {activeSessions.map((session) => (
                          <div key={session.id} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0 font-medium font-sans">
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5 truncate">
                                <Clock size={12} className="text-primary" /> {session.device} 
                                {session.isCurrent && <span className="text-[8px] bg-emerald-100 text-emerald-700 uppercase font-black px-1.5 py-0.5 rounded-full font-sans">Actual</span>}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-mono mt-0.5">Localização: {session.location} &bull; {session.ip} &bull; {session.date}</span>
                            </div>
                            
                            {!session.isCurrent && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Deseja revogar e terminar a sessão no dispositivo ${session.device}?`)) {
                                    setActiveSessions((prev) => prev.filter((s) => s.id !== session.id));
                                  }
                                }}
                                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-rose-600 bg-white border border-rose-100 rounded-lg hover:bg-rose-50 cursor-pointer"
                              >
                                Revogar
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Connected Devices */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-sans">
                          {isInst ? 'Dispositivos e Terminais Corporativos Autorizados' : 'Dispositivos Autorizados Seguros'}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const name = prompt("Insira o nome amigável do novo dispositivo a autorizar:");
                            if (name) {
                              const newDev = { id: `dev-${Date.now()}`, name, icon: 'smartphone', date: 'Autorizado ontem', authorized: true };
                              setConnectedDevices((prev) => [...prev, newDev]);
                            }
                          }}
                          className="text-[9px] text-primary hover:underline uppercase font-bold tracking-wider font-sans cursor-pointer"
                        >
                          + Adicionar Dispositivo
                        </button>
                      </div>

                      <div className="space-y-2 font-medium">
                        {connectedDevices.map((dev) => (
                          <div key={dev.id} className="p-3.5 bg-white border border-slate-150 rounded-xl flex justify-between items-center">
                            <div className="flex items-center gap-2.5 select-none md:gap-3">
                              <div className="w-9 h-9 rounded-lg bg-indigo-50/50 flex items-center justify-center text-primary border border-slate-200">
                                {dev.icon === 'laptop' ? <Laptop size={15} /> : <Smartphone size={15} />}
                              </div>
                              <div className="text-left font-sans">
                                <span className="font-bold text-xs text-slate-800 block leading-tight">{dev.name}</span>
                                <span className="text-[9px] text-slate-400 block font-bold uppercase mt-0.5">{dev.date}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 font-sans select-none">
                              {dev.authorized ? (
                                <span className="text-[9px] bg-emerald-50 text-emerald-600 font-extrabold uppercase px-2 py-0.5 rounded-full border border-emerald-100">
                                  Confiável
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConnectedDevices((prev) => prev.map((d) => d.id === dev.id ? { ...d, authorized: true, date: 'Autorizado agora' } : d));
                                  }}
                                  className="text-[9px] bg-amber-50 hover:bg-amber-100 text-amber-600 font-extrabold uppercase px-2 py-1 rounded-lg border border-amber-100 cursor-pointer"
                                >
                                  Autorizar PIN
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Remover dispositivo ${dev.name}? Ele precisará de nova verificação de PIN.`)) {
                                    setConnectedDevices((prev) => prev.filter((d) => d.id !== dev.id));
                                  }
                                }}
                                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {prefSubTab === 'supabase' && (
                  <div className="space-y-4 text-left">
                    <div className="bg-slate-900 text-white rounded-2xl p-4 md:p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center border border-slate-800 shadow-lg select-none">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${hasValidSupabaseKeys() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                          <span className="text-[10px] font-black uppercase tracking-widest font-mono text-slate-300">
                            {hasValidSupabaseKeys() ? 'Estado: Chaves Detectadas' : 'Estado: Chaves Ausentes'}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-[#38bdf8] text-base font-sans leading-tight">Project ID: zwusqnrjesyfiocyhrrl</h4>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Servidor: <span className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded text-[9px]">https://zwusqnrjesyfiocyhrrl.supabase.co</span>
                        </p>
                      </div>

                      <div className="flex gap-2 w-full md:w-auto self-stretch md:self-auto font-sans">
                        <button
                          type="button"
                          onClick={handleTestSupabaseConnection}
                          disabled={supabaseTesting || supabaseSyncing}
                          className="flex-1 md:flex-none px-3.5 py-2 text-[10px] uppercase font-black tracking-wider text-white bg-slate-800 hover:bg-slate-705 rounded-xl transition-all border border-slate-700 cursor-pointer disabled:opacity-50 select-none h-10 flex items-center justify-center font-bold"
                        >
                          {supabaseTesting ? 'A Testar...' : 'Testar Ligação'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSyncWithSupabase}
                          disabled={supabaseTesting || supabaseSyncing || !hasValidSupabaseKeys()}
                          className="flex-1 md:flex-none px-4 py-2 text-[10px] uppercase font-black tracking-wider text-slate-900 bg-[#38bdf8] hover:bg-[#38bdf8]/90 rounded-xl transition-all cursor-pointer disabled:opacity-50 select-none h-10 flex items-center justify-center font-bold"
                        >
                          {supabaseSyncing ? 'A Sincronizar...' : 'Sincronizar Tudo (Seed)'}
                        </button>
                      </div>
                    </div>

                    {/* Status Feedback Banners */}
                    {supabaseStatusMsg && (
                      <div className="p-3.5 bg-sky-50 text-sky-805 border border-sky-200 rounded-xl flex items-center gap-2.5 text-xs font-medium font-sans animate-pulse">
                        <RefreshCw size={14} className="animate-spin text-sky-600 shrink-0" />
                        <span>{supabaseStatusMsg}</span>
                      </div>
                    )}

                    {supabaseErrorMsg && (
                      <div className="p-3.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs font-medium font-sans">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-bold">Aviso de Configuração:</p>
                          <p className="text-slate-600 text-[11px] leading-relaxed">{supabaseErrorMsg}</p>
                          <div className="mt-2 text-[10px] bg-white/70 p-2.5 border border-amber-100 rounded-lg text-slate-750 font-sans space-y-1 leading-snug">
                            <span className="font-extrabold uppercase text-[8px] tracking-wider text-slate-500 block">Como Resolver:</span>
                            <p>1. Verifique se adicionou os segredos com os nomes exatos: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-amber-800">VITE_SUPABASE_URL</code> e <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-amber-800">VITE_SUPABASE_ANON_KEY</code>.</p>
                            <p className="mt-1">2. Abra o painel do Supabase, vá ao "SQL Editor", cole o script que preparámos em <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">/supabase/schema.sql</code> e execute para activar as tabelas estruturadas do Correio Digital.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {supabaseSuccessMsg && (
                      <div className="p-3.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs font-medium font-sans">
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div className="space-y-1.5 flex-1 p-0.5">
                          <p className="font-bold text-emerald-850">{supabaseSuccessMsg}</p>
                          <p className="text-slate-600 text-[11px]">Sincronização bidireccional activa nos bastidores do portal nacional de Angola!</p>
                          
                          {supabaseStats && (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                              {[
                                { label: 'Perfis Sincronizados', val: supabaseStats.profiles ?? 0 },
                                { label: 'Correspondências', val: supabaseStats.messages ?? 0 },
                                { label: 'Contactos Seguros', val: supabaseStats.contacts ?? 0 },
                                { label: 'Atos e Documentos', val: supabaseStats.documents ?? 0 },
                                { label: 'Pedidos de Serviços', val: supabaseStats.requests ?? 0 },
                                { label: 'Logs de Auditoria', val: supabaseStats.auditLogs ?? 0 },
                              ].map((stat, idx) => (
                                <div key={idx} className="bg-white/80 p-2 rounded-xl border border-emerald-100 text-center">
                                  <span className="font-mono text-base font-black text-emerald-700 block leading-none">{stat.val}</span>
                                  <span className="text-[8px] font-bold text-slate-500 block uppercase tracking-wider mt-1">{stat.label}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Developer Guide Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <h5 className="font-black text-[10px] uppercase tracking-widest text-slate-400 font-sans">Guia Rápido de Integração</h5>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs text-slate-650 leading-snug">
                        <div className="space-y-1.5">
                          <span className="font-bold text-slate-805 flex items-center gap-1.5 font-sans">
                            <span className="w-4 h-4 rounded-full bg-indigo-50 border border-indigo-150 text-indigo-600 flex items-center justify-center font-mono text-[10px] font-black">1</span>
                            Tabelas no Supabase
                          </span>
                          <p className="pl-5 text-[11px] text-slate-500 leading-normal">
                            Abra o SQL Editor do Supabase no projecto <code className="font-mono px-1 py-0.5 bg-slate-100 rounded text-slate-700">zwusqnrjesyfiocyhrrl</code>, cole o script <code className="font-mono bg-slate-100 text-slate-700 rounded px-1">/supabase/schema.sql</code> e execute para que as tabelas sejam criadas.
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <span className="font-bold text-slate-805 flex items-center gap-1.5 font-sans">
                            <span className="w-4 h-4 rounded-full bg-indigo-50 border border-indigo-150 text-indigo-600 flex items-center justify-center font-mono text-[10px] font-black">2</span>
                            Segurança RLS Activa
                          </span>
                          <p className="pl-5 text-[11px] text-slate-500 leading-normal">
                            As nossas tabelas têm Row Level Security (RLS) habilitada por defeito, garantindo privacidade militar onde cada cidadão só consegue aceder às suas próprias correspondências e documentos.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Foot */}
              <div className="p-4 md:p-6 bg-transparent border-t border-slate-200 flex gap-3 shadow-xs shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsPrefsOpen(false)}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-extrabold text-xs uppercase rounded-xl hover:bg-slate-100 cursor-pointer font-black"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    // Save to local storage
                    localStorage.setItem('gov_pref_language', prefLanguage);
                    localStorage.setItem('gov_pref_notif_sms', String(prefNotificationSMS));
                    localStorage.setItem('gov_pref_notif_email', String(prefNotificationEmail));
                    localStorage.setItem('gov_pref_notif_push', String(prefNotificationPush));
                    localStorage.setItem('gov_pref_notif_app', String(prefNotificationApp));
                    localStorage.setItem('gov_pref_hours', prefPreferredHours);
                    localStorage.setItem('gov_pref_biometrics', String(prefBiometricsEnabled));
                    localStorage.setItem('gov_pref_privacy', prefPrivacyLevel);
                    localStorage.setItem('gov_pref_privacy_logs', String(prefPrivacyLogs));
                    localStorage.setItem('gov_pref_eco_mode', String(prefEcoMode));
                    localStorage.setItem('gov_pref_offline', String(prefOfflineUse));
                    localStorage.setItem('gov_pref_comm_channel', prefCommChannel);
                    localStorage.setItem('gov_pref_sessions', JSON.stringify(activeSessions));
                    localStorage.setItem('gov_pref_devices', JSON.stringify(connectedDevices));

                    // Update the global state with the edited profile fields
                    updateUserFields({
                      name: editName,
                      email: editEmail,
                      phone: editPhone,
                      filiation: editFiliation,
                      maritalStatus: editMaritalStatus
                    });

                    // Update active profile fields if institutional
                    if (isInst && updateActiveProfileFields) {
                      updateActiveProfileFields({
                        role: editRole,
                        departmentName: editDepartment,
                        institutionName: editInstitution
                      });
                    }

                    // F39 (v13) — sync dirigida à nuvem (profileSyncService):
                    // apenas as colunas fornecidas são actualizadas (nunca anula
                    // nif/passport/data como a via antiga fazia); email incluído.
                    if (hasValidSupabaseKeys()) {
                      syncProfileToCloud(supabase, {
                        bi: user?.bi || bi,
                        name: editName,
                        phone: editPhone,
                        email: editEmail,
                        filiation: editFiliation,
                        maritalStatus: editMaritalStatus,
                      })
                      .then(res => {
                        if (!addAuditLog) return;
                        if (res.outcome === 'ok' || res.outcome === 'created' || res.outcome === 'schema_retry') {
                          addAuditLog('[PERFIL-SYNC] Dados de perfil sincronizados na nuvem', 'success');
                        } else if (res.outcome === 'error' || res.outcome === 'unavailable') {
                          addAuditLog('[PERFIL-SYNC] Guardado localmente; sincronização com a nuvem pendente', 'warning');
                        }
                        // demo / not_bound → silêncio (desvio já registado no serviço)
                      })
                      .catch(() => { /* o serviço nunca lança — salvaguarda */ });
                    }

                    const newLog = { action: isInst ? 'Preferências do agente e dados de perfil guardados de forma segura' : 'Preferências do cidadão e dados de perfil guardados de forma segura', time: 'Agora mesmo' };
                    setAuditLogs(prev => [newLog, ...prev]);

                    if (addAuditLog) {
                      addAuditLog(isInst ? 'Preferências do agente e dados do perfil atualizados' : 'Preferências do cidadão e dados do perfil atualizados', 'success');
                    }

                    setIsPrefsOpen(false);
                    notify(isInst ? "Preferências e dados do Agente salvos com sucesso!" : "Preferências e dados do Cidadão salvos com sucesso!");
                  }}
                  className="flex-1 py-3 bg-primary text-white font-black text-xs uppercase rounded-xl hover:opacity-95 shadow-lg cursor-pointer border-0"
                >
                  Gravar Preferências <Check size={14} className="inline-block ml-1" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes scan-motion {
          0%, 100% { top: 0%; }
          50% { top: 100%; }
        }
      `}</style>
    </>
  );
}
