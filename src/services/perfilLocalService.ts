// ============================================================================
// Persistência LOCAL dos dados editáveis do perfil, por conta (2026-08-20)
// ----------------------------------------------------------------------------
// As páginas Perfil (Cidadão / Instituição / Administração) escrevem na nuvem
// quando a conta é real; contas demo ficam locais por desenho (a nuvem recusa
// os identificadores canónicos). Em AMBOS os casos as edições são espelhadas
// neste armazenamento por conta (localStorage, chave por modo+identificador) e
// reaplicadas na entrada do app — os dados editados voltam no próximo login,
// em qualquer modo, sem contaminar outras contas. É o mesmo padrão do avatar
// (avatarService), alargado a todos os campos do perfil.
// ============================================================================

export type ModoPerfil = 'user' | 'institution' | 'admin';

export interface CamposPerfilLocal {
  name?: string;
  phone?: string;
  email?: string;
  nif?: string;
  address?: string;
  filiation?: string;
  maritalStatus?: string;
  birthDate?: string;
}

const CHAVE = (modo: ModoPerfil, ident: string): string =>
  `cda_perfil_dados_${modo}_${String(ident || '').toUpperCase().replace(/\s+/g, '')}`;

const CAMPOS_PERMITIDOS: ReadonlySet<string> = new Set([
  'name', 'phone', 'email', 'nif', 'address', 'filiation', 'maritalStatus', 'birthDate',
]);

/** Funde os campos editados com o que já estava guardado e persiste. */
export const guardarPerfilLocal = (modo: ModoPerfil, ident: string, campos: CamposPerfilLocal): void => {
  const idNorm = String(ident || '').toUpperCase().replace(/\s+/g, '');
  if (!idNorm) return;
  try {
    const atual = lerPerfilLocal(modo, ident);
    const fundido: Record<string, string> = { ...atual };
    for (const [k, v] of Object.entries(campos)) {
      if (!CAMPOS_PERMITIDOS.has(k)) continue;
      const val = String(v ?? '').trim();
      if (val) fundido[k] = val;
      else delete fundido[k];
    }
    localStorage.setItem(CHAVE(modo, ident), JSON.stringify(fundido));
  } catch { /* melhor esforço */ }
};

/** Lê os campos guardados neste dispositivo para a conta indicada. */
export const lerPerfilLocal = (modo: ModoPerfil, ident: string): CamposPerfilLocal => {
  try {
    const raw = localStorage.getItem(CHAVE(modo, ident));
    if (!raw) return {};
    const j = JSON.parse(raw);
    if (!j || typeof j !== 'object' || Array.isArray(j)) return {};
    const out: CamposPerfilLocal = {};
    for (const k of Object.keys(j)) {
      if (CAMPOS_PERMITIDOS.has(k) && typeof (j as any)[k] === 'string') (out as any)[k] = (j as any)[k];
    }
    return out;
  } catch {
    return {};
  }
};
