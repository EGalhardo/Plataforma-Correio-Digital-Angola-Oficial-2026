import React, { createContext, useContext, useState, useEffect } from "react";
import { SessionUser, ActiveProfile, AppMode } from "../types";
import { MOCK_SESSION_USER, MOCK_SESSION_PROFILES } from "../constants/mocks";

// Canonical Session User: Edlasio Galhardo
export const CANONICAL_USER: SessionUser = MOCK_SESSION_USER;

// Available profiles mapped to user
export const PROFILES_MAP: Record<AppMode, ActiveProfile> = MOCK_SESSION_PROFILES;

// F8 — Base de sessão da área da Instituição: campos limpos, sem os dados demo
// do cidadão — cada conta institucional vê apenas os seus próprios dados.
export const INSTITUTION_BASE_USER: SessionUser = {
  ...CANONICAL_USER,
  id: 'institution-session',
  name: '',
  firstName: '',
  lastName: '',
  bi: '',
  nif: '',
  passport: '',
  phone: '',
  email: '',
  birthDate: '',
  filiation: '',
  maritalStatus: '',
  avatarUrl: '',
  verificationLevel: 'Pendente',
  confidenceScore: 0,
  lastAccess: '',
};

export const resolveAppModeFromPath = (): AppMode | null => {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname.toLowerCase();
  if (path.startsWith('/institucional') || path.startsWith('/instituicao') || path.startsWith('/inst')) return 'institution';
  if (path.startsWith('/admin')) return 'admin';
  return null;
};

export const getModePathPrefix = (mode: AppMode): string => {
  switch (mode) {
    case 'institution':
      return '/institucional';
    case 'admin':
      return '/admin';
    default:
      return '';
  }
};

interface SessionContextType {
  user: SessionUser;
  activeProfile: ActiveProfile;
  appMode: AppMode;
  isEmergencyActive: boolean;
  setAppMode: (mode: AppMode) => void;
  updateUserFields: (fields: Partial<SessionUser>) => void;
  updateActiveProfileFields: (fields: Partial<ActiveProfile>) => void;
  hasPermission: (permission: string) => boolean;
  toggleEmergency: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sanitizeSessionUser = (candidate: Partial<SessionUser> | null | undefined): SessionUser => {
    // F8 — fallback por modo: na área da Instituição os campos vazios NUNCA são
    // preenchidos com os dados demo do cidadão.
    const mode = (localStorage.getItem("gov_app_mode") as AppMode) || "user";
    const base: SessionUser = mode === "institution" ? INSTITUTION_BASE_USER : CANONICAL_USER;
    // v37.29 — ANTI-FUGA + fundo azul/inicial: se a hidratação definiu
    // EXPLICITAMENTE avatarUrl vazio (conta sem foto), NUNCA substituir pela
    // foto demo/mock — o Header/Perfil mostram o círculo azul com a inicial.
    let avatar = (candidate && Object.prototype.hasOwnProperty.call(candidate, 'avatarUrl'))
      ? (candidate.avatarUrl || '')
      : base.avatarUrl;
    if (avatar && (avatar.includes("sxWsYGX2") || avatar.includes("foto_perfil_edlasio"))) {
      avatar = mode === "institution" ? base.avatarUrl : "https://i.postimg.cc/Y92CFNC5/Foto-de-Perfil-(1).png";
    }
    // v37.29 — ANTI-FUGA DE DADOS ENTRE CONTAS: quando existe uma sessão de um
    // utilizador REAL (com B.I. próprio), os campos pessoais vazios NUNCA são
    // preenchidos com os dados do utilizador demo (nome, e-mail, telefone,
    // filiação, estado civil, nível de verificação...) — a conta nova entra
    // LIMPA; cada campo só mostra o que pertence ao próprio titular.
    const temIdentidade = mode === "user" && !!candidate && !!candidate.bi;
    const f = (v: string | undefined | null, fallback: string) =>
      temIdentidade ? (v || "") : (v || fallback);
    return {
      ...base,
      ...(candidate || {}),
      id: candidate?.id || base.id,
      name: f(candidate?.name, base.name),
      firstName: f(candidate?.firstName || candidate?.name?.trim()?.split(' ')?.[0], base.firstName),
      lastName: f(candidate?.lastName || candidate?.name?.trim()?.split(' ')?.slice(-1)?.[0], base.lastName),
      bi: f(candidate?.bi, base.bi),
      nif: f(candidate?.nif, base.nif),
      passport: f(candidate?.passport, base.passport),
      phone: f(candidate?.phone, base.phone),
      email: f(candidate?.email, base.email),
      birthDate: f(candidate?.birthDate, base.birthDate),
      filiation: f(candidate?.filiation, base.filiation),
      maritalStatus: f(candidate?.maritalStatus, base.maritalStatus),
      avatarUrl: avatar,
      verificationLevel: (temIdentidade
        ? (candidate?.verificationLevel || 'Pendente')
        : (candidate?.verificationLevel || base.verificationLevel)),
      confidenceScore: temIdentidade ? (candidate?.confidenceScore ?? 0) : (candidate?.confidenceScore ?? base.confidenceScore),
      lastAccess: candidate?.lastAccess || base.lastAccess,
    };
  };

  const [user, setUser] = useState<SessionUser>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem("correio_digital_session_user");
      if (saved) {
        try {
          return sanitizeSessionUser(JSON.parse(saved));
        } catch (e) {
          // ignore
        }
      }
    }
    return CANONICAL_USER;
  });

  const [appMode, setAppModeState] = useState<AppMode>(() => {
    const fromPath = resolveAppModeFromPath();
    if (fromPath) return fromPath;
    if (typeof localStorage !== 'undefined') {
      return (localStorage.getItem("gov_app_mode") as AppMode) || "user";
    }
    return "user";
  });

  const [isEmergencyActive, setIsEmergencyActive] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem("gov_emergency_mode") === "true";
    }
    return false;
  });

  const [activeProfiles, setActiveProfiles] = useState<Record<AppMode, ActiveProfile>>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem("gov_active_profiles");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            user: { ...PROFILES_MAP.user, ...(parsed.user || {}) },
            institution: { ...PROFILES_MAP.institution, ...(parsed.institution || {}) },
            admin: { ...PROFILES_MAP.admin, ...(parsed.admin || {}) }
          };
        } catch (e) {
          // ignore
        }
      }
    }
    return PROFILES_MAP;
  });

  const activeProfile = activeProfiles[appMode] || PROFILES_MAP[appMode] || PROFILES_MAP.user;

  // Sync active profiles changes with localStorage
  useEffect(() => {
    localStorage.setItem("gov_active_profiles", JSON.stringify(activeProfiles));
  }, [activeProfiles]);

  // Sync state changes with localStorage and sync with legacy names to keep existing app logic fully compatible
  useEffect(() => {
    localStorage.setItem("correio_digital_session_user", JSON.stringify(user));
    
    // Sync to legacy standard variables so components that read from localStorage don't break
    localStorage.setItem("correio_digital_profile_name", user.name);
    localStorage.setItem("correio_digital_bi", user.bi);
    localStorage.setItem("correio_digital_phone", user.phone);
    localStorage.setItem("correio_digital_nif", user.nif);
    localStorage.setItem("correio_digital_passport", user.passport);
    localStorage.setItem("correio_digital_birth_date", user.birthDate);
    localStorage.setItem("correio_digital_filiation", user.filiation);
    localStorage.setItem("correio_digital_marital_status", user.maritalStatus);
    localStorage.setItem("correio_digital_verification_status", user.verificationLevel);
  }, [user]);

  useEffect(() => {
    localStorage.setItem("gov_app_mode", appMode);
  }, [appMode]);

  useEffect(() => {
    localStorage.setItem("gov_emergency_mode", String(isEmergencyActive));
  }, [isEmergencyActive]);

  const setAppMode = (mode: AppMode) => {
    setAppModeState(mode);
    localStorage.setItem("gov_app_mode", mode);
    setUser(prev => sanitizeSessionUser(prev));
    const prefix = getModePathPrefix(mode);
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
      const targetPath = prefix || '/';
      if (currentPath !== targetPath) {
        const newUrl = `${targetPath}${window.location.search}${window.location.hash}`;
        try { window.history.replaceState(null, '', newUrl); } catch { /* melhor esforço */ }
      }
    }
  };

  const updateUserFields = (fields: Partial<SessionUser>) => {
    setUser(prev => {
      // v37.29 — ANTI-FUGA ENTRE CONTAS: quando o B.I. da sessão MUDA (login de
      // outra conta neste dispositivo), os campos pessoais da conta anterior
      // NUNCA podem sobreviver ao merge — a nova sessão nasce LIMPA e só a
      // hidratação da própria identidade volta a preencher o que existir.
      const nextBi = (fields.bi !== undefined ? fields.bi : prev.bi) || "";
      const identidadeTrocou = !!nextBi && nextBi !== prev.bi;
      const resetIdentidade: Partial<SessionUser> = identidadeTrocou
        ? {
            name: "", firstName: "", lastName: "", nif: "", passport: "",
            phone: "", email: "", birthDate: "", filiation: "", maritalStatus: "",
            avatarUrl: "", verificationLevel: "Pendente", confidenceScore: 0,
          }
        : {};
      const updated = sanitizeSessionUser({ ...prev, ...resetIdentidade, ...fields });
      // Keep name unifiable split if full name updated
      if (fields.name) {
        const parts = fields.name.trim().split(" ");
        updated.firstName = parts[0] || prev.firstName;
        updated.lastName = parts[parts.length - 1] || prev.lastName;
      }
      return updated;
    });
    setActiveProfiles(prev => {
      const currentModeProfile = prev[appMode] || PROFILES_MAP[appMode] || {};
      const updatedProfile = {
        ...currentModeProfile,
        ...(fields.name ? { name: fields.name } : {}),
        ...(fields.email ? { email: fields.email } : {}),
        ...(fields.phone ? { phone: fields.phone } : {})
      };
      const newProfiles = { ...prev, [appMode]: updatedProfile };
      localStorage.setItem("gov_active_profiles", JSON.stringify(newProfiles));
      return newProfiles;
    });
  };

  const updateActiveProfileFields = (fields: Partial<ActiveProfile>) => {
    setActiveProfiles(prev => ({
      ...prev,
      [appMode]: {
        ...prev[appMode],
        ...fields
      }
    }));
  };

  const hasPermission = (permission: string): boolean => {
    const permissions = activeProfile?.permissions || [];
    if (permissions.includes("all_access")) return true;
    return permissions.includes(permission);
  };

  const toggleEmergency = () => {
    setIsEmergencyActive(prev => !prev);
  };

  return React.createElement(
    SessionContext.Provider,
    {
      value: {
        user,
        activeProfile,
        appMode,
        isEmergencyActive,
        setAppMode,
        updateUserFields,
        updateActiveProfileFields,
        hasPermission,
        toggleEmergency
      }
    },
    children
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};
