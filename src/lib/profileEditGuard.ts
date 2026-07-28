// ============================================================================
// F45 — Guarda de hidratação de perfil (Auditoria F42 · Médio#10, corrida F39)
// ----------------------------------------------------------------------------
// Problema: a hidratação da nuvem (App.tsx · loadSupabaseData) podia aplicar
// campos POR CIMA de uma edição em curso no ProfileContent/CitizenProfile.
// Módulo PURO (testável): os ecrãs de perfil marcam início/fim de edição; a
// hidratação consulta `isProfileEditActive()` antes de aplicar.
// Protecção contra flag "presa" (desmontar sem gravar): expira após 15 min.
// ============================================================================

const EDIT_GUARD_TTL_MS = 15 * 60 * 1000;

let editingSince = 0;

/** Chamado quando o utilizador ENTRA em modo de edição de perfil. */
export const beginProfileEdit = (): void => { editingSince = Date.now(); };

/** Chamado quando a edição TERMINA (gravar, cancelar, desmontar). */
export const endProfileEdit = (): void => { editingSince = 0; };

/** Verdadeiro se há uma edição de perfil activa (ou marcada há < 15 min). */
export const isProfileEditActive = (): boolean =>
  editingSince > 0 && Date.now() - editingSince < EDIT_GUARD_TTL_MS;

/** Suites/reset. */
export const __resetProfileEditGuard = (): void => { editingSince = 0; };
