// ============================================================================
// Auto-preenchimento de formulários com dados do perfil — Etapa #2 (Cidadão)
// ----------------------------------------------------------------------------
// Serviço PURO (sem React, testável em tsx) que:
//   • monta o "perfil de auto-preenchimento" a partir dos campos de sessão do
//     cidadão (buildAutoFillProfile);
//   • normaliza o telemóvel angolano para os formulários (normalizarTelefoneAo);
//   • regista em AUDITORIA LOCAL (localStorage) cada utilização — o serviço
//     NUNCA escreve na nuvem; apenas lê e preenche formulários.
// Marcação anti-repetição: cada formulário é auto-preenchido UMA vez por
// sessão (jaAutoPreenchido/marcarAutoPreenchido), para nunca sobrescrever
// edições manuais do utilizador numa segunda visita.
// ============================================================================

export interface CitizenAutoFillProfile {
  bi: string;
  name: string;
  nif: string;
  phone: string;
  email: string;
  morada: string;
  birthDate: string;
  filiation: string;
  maritalStatus: string;
  passport: string;
}

export interface AutoFillFieldEntry {
  campo: string;
  valor: string;
}

/** Monta o perfil de auto-preenchimento — valores em falta ficam vazios. */
export const buildAutoFillProfile = (
  fields: Partial<CitizenAutoFillProfile>,
): CitizenAutoFillProfile => ({
  bi: (fields.bi || '').trim(),
  name: (fields.name || '').trim(),
  nif: (fields.nif || '').trim(),
  phone: (fields.phone || '').trim(),
  email: (fields.email || '').trim(),
  morada: (fields.morada || '').trim(),
  birthDate: (fields.birthDate || '').trim(),
  filiation: (fields.filiation || '').trim(),
  maritalStatus: (fields.maritalStatus || '').trim(),
  passport: (fields.passport || '').trim(),
});

/** O perfil tem algum dado utilizável? */
export const temDadosAutoFill = (p: CitizenAutoFillProfile | null | undefined): boolean =>
  !!p && Object.values(p).some((v) => v && v.trim().length > 0);

/** Campos não vazios do perfil — para o resumo apresentado ao utilizador. */
export const camposDoPerfil = (
  p: CitizenAutoFillProfile | null | undefined,
): AutoFillFieldEntry[] => {
  if (!p) return [];
  const mapa: Array<[string, string]> = [
    ['Nome', p.name],
    ['B.I.', p.bi],
    ['NIF', p.nif],
    ['Telemóvel', p.phone],
    ['E-mail', p.email],
    ['Morada', p.morada],
    ['Data de nascimento', p.birthDate],
    ['Filiação', p.filiation],
    ['Estado civil', p.maritalStatus],
    ['Passaporte', p.passport],
  ];
  return mapa
    .filter(([, v]) => v && v.trim().length > 0)
    .map(([campo, valor]) => ({ campo, valor }));
};

/**
 * Normaliza um número de telemóvel angolano para os formulários locais
 * (9 dígitos, sem prefixo internacional): "+244 923 000 111" → "923000111".
 * Devolve '' se não for possível obter um número válido.
 */
export const normalizarTelefoneAo = (raw: string | undefined | null): string => {
  if (!raw) return '';
  let digitos = raw.replace(/\D/g, '');
  if (!digitos) return '';
  if (digitos.length > 9 && digitos.startsWith('244')) {
    digitos = digitos.slice(3);
  }
  if (digitos.length > 9) digitos = digitos.slice(-9);
  return digitos.length === 9 ? digitos : '';
};

// ---------------------------------------------------------------------------
// Auditoria local (nunca toca na nuvem)
// ---------------------------------------------------------------------------

const AUDIT_KEY = 'cda_autofill_audit_v1';
const MARK_KEY = 'cda_autofill_applied_v1';

export interface AutoFillAuditEntry {
  quando: string; // ISO
  form: string; // identificador do formulário
  campos: string[]; // campos preenchidos
  origem: 'auto' | 'manual';
}

/** Grava a utilização do auto-preenchimento em auditoria local (últimas 50). */
export const registarAutoFillAudit = (
  form: string,
  campos: string[],
  origem: 'auto' | 'manual',
): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    const lista: AutoFillAuditEntry[] = raw ? JSON.parse(raw) : [];
    lista.push({ quando: new Date().toISOString(), form, campos, origem });
    localStorage.setItem(AUDIT_KEY, JSON.stringify(lista.slice(-50)));
  } catch {
    /* sem espaço — sem espelho */
  }
};

/** Este formulário já foi auto-preenchido nesta sessão? (anti-repetição) */
export const jaAutoPreenchido = (form: string): boolean => {
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem(MARK_KEY);
    if (!raw) return false;
    const set: string[] = JSON.parse(raw);
    return set.includes(form);
  } catch {
    return false;
  }
};

/** Marca o formulário como já auto-preenchido nesta sessão. */
export const marcarAutoPreenchido = (form: string): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(MARK_KEY);
    const set: string[] = raw ? JSON.parse(raw) : [];
    if (!set.includes(form)) set.push(form);
    localStorage.setItem(MARK_KEY, JSON.stringify(set));
  } catch {
    /* ignora */
  }
};

/** Formulários com marcador activo — para diagnóstico/tooling. */
export const formulariosJaPreenchidos = (): string[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MARK_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};
