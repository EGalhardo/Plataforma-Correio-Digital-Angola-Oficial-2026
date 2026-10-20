/**
 * Identidade Auth com fronteira de confiança server-side.
 * `user_metadata` é editável pelo próprio utilizador e nunca concede papel Admin.
 * A Administração só é reconhecida quando `app_metadata` (escrito pelo servidor
 * com service_role) declara role=admin e um número ADMIN-NNNN válido.
 */
export interface TrustedAuthIdentity {
  role: string;
  agent: string;
  institution: string;
  metadata: Record<string, unknown>;
  isAdmin: boolean;
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const normalizar = (value: unknown): string =>
  String(value || '').trim().toUpperCase().replace(/\s+/g, '');

export function resolveTrustedAuthIdentity(user: unknown): TrustedAuthIdentity {
  const u = record(user);
  const appMetadata = record(u.app_metadata);
  const userMetadata = record(u.user_metadata);
  const adminAgent = normalizar(appMetadata.agent);
  const trustedAdmin = String(appMetadata.role || '').trim().toLowerCase() === 'admin'
    && /^ADMIN-\d{4,}$/.test(adminAgent);
  const suppliedRole = String(userMetadata.role || '').trim().toLowerCase();
  const role = trustedAdmin ? 'admin' : suppliedRole === 'admin' ? '' : suppliedRole;
  const metadata: Record<string, unknown> = trustedAdmin
    ? { ...userMetadata, ...appMetadata, role: 'admin', agent: adminAgent }
    : { ...userMetadata, ...appMetadata, role };
  if (!trustedAdmin && suppliedRole === 'admin') delete metadata.agent;

  return {
    role,
    agent: trustedAdmin ? adminAgent : normalizar(metadata.agent),
    institution: normalizar(metadata.instituicao),
    metadata,
    isAdmin: trustedAdmin,
  };
}
