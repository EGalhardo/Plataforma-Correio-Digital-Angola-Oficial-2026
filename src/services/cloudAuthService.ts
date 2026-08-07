import type { SupabaseClient } from '@supabase/supabase-js';
// ============================================================================
// Autenticação na Nuvem (Supabase Auth) — Prompt v12 / Ideologia v13 (F31/F32)
// ----------------------------------------------------------------------------
// · A palavra-passe passa a viver EXCLUSIVAMENTE no Supabase Auth (bcrypt da
//   plataforma) — a aplicação deixa de a guardar/validar para contas novas.
// · O identificador visível (B.I., ADMIN-NNNN, SME-LLVV-NN) vira um e-mail
//   SINTÉTICO DETERMINÍSTICO que o utilizador nunca vê — a UX não muda.
// · Contas demo (ideologia v7) NUNCA tocam no Auth (D7).
// · Migração just-in-time (D2): 1.º login com credencial local válida provisiona
//   a conta no Auth e fica nuvem-primária (marcador local cda_cloud_accounts_v1).
// · Fallback honesto (D3): nuvem indisponível => modelo local actual, marcado
//   no log — a nuvem nunca piora o estado actual.
// · Login Facial (D6): biometria fica no dispositivo; só "desbloqueia" a sessão.
//
// O cliente Supabase é INJECTADO (nunca importado aqui) — o módulo é puro e
// seguro para testes lógicos (mesmo padrão do institutionSessionService).
// ============================================================================

// ---- Domínios sintéticos internos (detalhe técnico — o utilizador nunca vê) --
export const CLOUD_AUTH_DOMAIN_CIDADAO = 'cidadao.correiodigital.ao';
export const CLOUD_AUTH_DOMAIN_INSTITUICAO = 'inst.correiodigital.ao';
export const CLOUD_AUTH_DOMAIN_ADMIN = 'admin.correiodigital.ao';

const normalizeForEmail = (raw?: string): string =>
  (raw || '').toLowerCase().replace(/\s+/g, '').trim();

// ---- E-mails sintéticos determinísticos (D1/D4) ------------------------------
export const syntheticCitizenEmail = (bi: string): string =>
  `bi.${normalizeForEmail(bi)}@${CLOUD_AUTH_DOMAIN_CIDADAO}`;

export const syntheticAdminEmail = (agent: string): string =>
  `agente.${normalizeForEmail(agent)}@${CLOUD_AUTH_DOMAIN_ADMIN}`;

export const syntheticInstitutionAgentEmail = (agentNumber: string): string =>
  `agente.${normalizeForEmail(agentNumber)}@${CLOUD_AUTH_DOMAIN_INSTITUICAO}`;

// ---- Registo local de contas nuvem-primárias (marcador, sem segredos) -------
export interface CloudAccountMark {
  email: string;
  role: 'cidadao' | 'instituicao' | 'admin';
  at: string;
}

const CLOUD_ACCOUNTS_KEY = 'cda_cloud_accounts_v1';

const readCloudAccounts = (): Record<string, CloudAccountMark> => {
  try {
    const raw = localStorage.getItem(CLOUD_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeCloudAccounts = (all: Record<string, CloudAccountMark>): void => {
  try {
    localStorage.setItem(CLOUD_ACCOUNTS_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('[CloudAuth] Falha ao gravar o marcador de conta nuvem:', e);
  }
};

const keyOf = (identifier: string): string => (identifier || '').toUpperCase().replace(/\s+/g, '').trim();

/** Conta já ligada à nuvem? (a partir daí a senha vive no Auth — cloud-first) */
export const isCloudBound = (identifier: string): boolean => {
  const all = readCloudAccounts();
  return !!all[keyOf(identifier)];
};

export const getCloudAccountMark = (identifier: string): CloudAccountMark | null =>
  readCloudAccounts()[keyOf(identifier)] || null;

export const markCloudAccount = (
  identifier: string,
  email: string,
  role: CloudAccountMark['role'],
): void => {
  const k = keyOf(identifier);
  if (!k) return;
  const all = readCloudAccounts();
  all[k] = { email, role, at: new Date().toISOString() };
  writeCloudAccounts(all);
};

export const unmarkCloudAccount = (identifier: string): void => {
  const all = readCloudAccounts();
  const k = keyOf(identifier);
  if (all[k]) {
    delete all[k];
    writeCloudAccounts(all);
  }
};

// ---- Helpers de ambiente ------------------------------------------------------
export const isSupabaseConfigured = (): boolean => {
  try {
    const env = (import.meta as any).env || {};
    return !!env.VITE_SUPABASE_URL && !!env.VITE_SUPABASE_ANON_KEY;
  } catch {
    return false;
  }
};

// ---- Classificação de erros do Auth (decide se D3 pode recuar ao local) ------
export type CloudErrorKind = 'invalid_credentials' | 'already_registered' | 'unavailable' | 'other';

export const classifyAuthError = (err: unknown): CloudErrorKind => {
  const e = err as { message?: string; status?: number; statusCode?: number } | null | undefined;
  const msg = `${e?.message || err || ''}`.toLowerCase();
  const status = e?.status ?? e?.statusCode;
  if (msg.includes('already registered') || msg.includes('já registado') || msg.includes('already been registered')) {
    return 'already_registered';
  }
  if (msg.includes('invalid login') || msg.includes('invalid credentials') || status === 400) {
    return 'invalid_credentials';
  }
  if (
    msg.includes('failed to fetch') || msg.includes('network') || msg.includes('timeout') ||
    msg.includes('fetch') || msg.includes('econn') || status === 0 || status === 500 || status === 502 || status === 503
  ) {
    return 'unavailable';
  }
  return 'other';
};

// ---- Resultados tipados -------------------------------------------------------
export type CloudSignInOutcome =
  | 'ok'              // sessão válida na nuvem
  | 'invalid'         // credenciais recusadas pela nuvem (conta existe OU não)
  | 'unavailable'     // rede/serviço em baixo => fallback local (D3)
  | 'error';

export interface CloudSignInResult {
  outcome: CloudSignInOutcome;
  message?: string;
  /** user_metadata do Auth (ex.: nome guardado no provisionamento) */
  metadata?: Record<string, any>;
}

export type CloudProvisionOutcome =
  | 'ok'                // conta criada na nuvem, sessão activa
  | 'linked_existing'   // já existia na nuvem e a senha confere => ligada
  | 'pending_confirm'   // CONFIRMAÇÃO DE E-MAIL ACTIVA no Supabase (desactivar!)
  | 'conflict'          // e-mail já existe com OUTRA senha
  | 'unavailable'       // D3
  | 'error';

export interface CloudProvisionResult {
  outcome: CloudProvisionOutcome;
  message?: string;
}

// ---- Operações Auth (cliente injectado; NUNCA lançam excepção) ---------------
export const cloudSignIn = async (
  client: SupabaseClient,
  email: string,
  password: string,
): Promise<CloudSignInResult> => {
  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      const kind = classifyAuthError(error);
      if (kind === 'unavailable') return { outcome: 'unavailable', message: error.message };
      if (kind === 'invalid_credentials') return { outcome: 'invalid', message: error.message };
      return { outcome: 'error', message: error.message };
    }
    if (!data?.session) {
      // Sessão ausente com credenciais válidas => confirmação de e-mail activa no painel
      return { outcome: 'invalid', message: 'Sessão não criada (confirmação de e-mail activa?).' };
    }
    return { outcome: 'ok', metadata: (data.user?.user_metadata as Record<string, any>) || {} };
  } catch (e) {
    const kind = classifyAuthError(e);
    return { outcome: kind === 'unavailable' ? 'unavailable' : 'error', message: e?.message || String(e) };
  }
};

export const cloudSignUp = async (
  client: SupabaseClient,
  email: string,
  password: string,
  metadata: Record<string, any>,
): Promise<CloudProvisionResult> => {
  try {
    const { data, error } = await client.auth.signUp({ email, password, options: { data: metadata } });
    if (error) {
      const kind = classifyAuthError(error);
      if (kind === 'already_registered') return { outcome: 'conflict', message: error.message };
      if (kind === 'unavailable') return { outcome: 'unavailable', message: error.message };
      return { outcome: 'error', message: error.message };
    }
    if (!data?.session) {
      // Utilizador criado MAS à espera de confirmação — a definição do painel está activa
      return { outcome: 'pending_confirm', message: 'Conta criada mas pendente de confirmação de e-mail (desactivar no painel Supabase).' };
    }
    return { outcome: 'ok' };
  } catch (e) {
    const kind = classifyAuthError(e);
    if (kind === 'already_registered') return { outcome: 'conflict', message: e?.message || String(e) };
    return { outcome: kind === 'unavailable' ? 'unavailable' : 'error', message: e?.message || String(e) };
  }
};

/**
 * Provisionamento idempotente (usado no registo de contas novas E na migração
 * just-in-time): tenta criar; se já existir, tenta entrar com a mesma senha —
 * conferindo, liga a conta local à nuvem; divergindo, reporta conflito.
 */
export const provisionCloudAccount = async (
  client: SupabaseClient,
  params: { email: string; password: string; metadata: Record<string, any> },
): Promise<CloudProvisionResult> => {
  const up = await cloudSignUp(client, params.email, params.password, params.metadata);
  if (up.outcome !== 'conflict') return up;
  const relog = await cloudSignIn(client, params.email, params.password);
  if (relog.outcome === 'ok') return { outcome: 'linked_existing' };
  if (relog.outcome === 'unavailable') return { outcome: 'unavailable', message: relog.message };
  return { outcome: 'conflict', message: relog.message || 'O e-mail sintético já existe com outra senha.' };
};

/** D6 — confirma suave de sessão nuvem após login facial (nunca bloqueia). */
export const hasActiveCloudSession = async (client: SupabaseClient): Promise<boolean> => {
  try {
    const { data } = await client.auth.getSession();
    return !!data?.session;
  } catch {
    return false;
  }
};

// ---- F38 (v13) — encerrar a sessão de nuvem (logout real) --------------------
export type CloudSignOutOutcome =
  | 'ok'      // sessão Auth terminada no dispositivo
  | 'no_op'   // cliente Auth ausente (nada a fazer)
  | 'error';  // falha de rede/serviço — o logout LOCAL deve prosseguir na mesma

export interface CloudSignOutResult {
  outcome: CloudSignOutOutcome;
  message?: string;
}

/**
 * F38 — signOut best-effort: NUNCA lança e NUNCA apaga o marcador
 * (cda_cloud_accounts_v1) — a conta continua migrada e o próximo login volta a
 * exigir a senha real. Demos: o desvio é feito no CHAMADOR (App decide a isenção
 * via homologationStore); aqui garantimos apenas a operação Auth em si.
 */
export const cloudSignOutBestEffort = async (client: SupabaseClient): Promise<CloudSignOutResult> => {
  try {
    if (!client?.auth?.signOut) return { outcome: 'no_op', message: 'cliente Auth ausente.' };
    const { error } = await client.auth.signOut();
    if (error) return { outcome: 'error', message: error.message };
    console.log('[AUTH-CLOUD] Sessão Auth terminada (signOut).');
    return { outcome: 'ok' };
  } catch (e) {
    return { outcome: 'error', message: e?.message || String(e) };
  }
};

// ---- F40 (v13) — alteração de palavra-passe self-service na nuvem -----------
export type CloudPasswordChangeOutcome =
  | 'ok'          // senha actualizada no Auth (nova passa a valer em todo o lado)
  | 'no_session'  // sem sessão de nuvem activa — o utilizador deve re-entrar
  | 'weak'        // recusada: fraca (< 8 chars) ou rejeitada pelo servidor
  | 'unavailable' // rede/serviço em baixo — a senha actual mantém-se
  | 'error';

export interface CloudPasswordChangeResult {
  outcome: CloudPasswordChangeOutcome;
  message?: string;
}

/**
 * F40 — `auth.updateUser({ password })` funciona com a anon key quando há sessão
 * activa (não precisa de service_role). NUNCA lança. Após o sucesso, encerra as
 * OUTRAS sessões (best-effort, scope 'others') para que a senha antiga deixe de
 * valer também nos outros dispositivos. Demos/contas não migradas: o desvio é
 * decidido no chamador (Perfil), que conhece a identidade e o modo da sessão.
 */
export const cloudChangePassword = async (
  client: SupabaseClient,
  newPassword: string,
): Promise<CloudPasswordChangeResult> => {
  try {
    if (!newPassword || newPassword.length < 8) {
      return { outcome: 'weak', message: 'A palavra-passe deve ter pelo menos 8 caracteres.' };
    }
    if (!client?.auth?.updateUser) return { outcome: 'unavailable', message: 'cliente Auth ausente.' };
    if (!(await hasActiveCloudSession(client))) return { outcome: 'no_session' };
    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) {
      const kind = classifyAuthError(error);
      if (kind === 'unavailable') return { outcome: 'unavailable', message: error.message };
      const msg = `${error.message || ''}`.toLowerCase();
      if (msg.includes('password') && (msg.includes('at least') || msg.includes('weak') || msg.includes('strong') || msg.includes('same'))) {
        return { outcome: 'weak', message: error.message };
      }
      return { outcome: 'error', message: error.message };
    }
    // Encerrar as OUTRAS sessões (best-effort): a senha antiga deixa de reabrir
    // sessões noutros dispositivos; a sessão actual permanece activa.
    try { await client.auth.signOut({ scope: 'others' }); } catch { /* best-effort */ }
    console.log('[AUTH-CLOUD] Palavra-passe actualizada na nuvem.');
    return { outcome: 'ok' };
  } catch (e) {
    const kind = classifyAuthError(e);
    return { outcome: kind === 'unavailable' ? 'unavailable' : 'error', message: e?.message || String(e) };
  }
};
