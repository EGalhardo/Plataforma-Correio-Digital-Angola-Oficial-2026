/**
 * F55 — Contactos de Emergência + Mensagem de Emergência (Área do Cidadão)
 *
 * Núcleo PURO e testável:
 *   - validação do formato angolano (+244 9XX XXX XXX);
 *   - regra dos 2 contactos de emergência (perfil completo/incompleto);
 *   - anti-duplicados por telefone, máximo de 50 contactos;
 *   - bloqueio honesto de remoção/despromoção que deixe <2 contactos de emergência;
 *   - construção do registo REAL do alerta (snapshot de destinatários,
 *     localização honesta, estado do gateway SEM simulação);
 *   - inserção do alerta com cliente INJECTADO (FAKE nos testes — sem gates
 *     de import.meta.env; basta `if (!client)`).
 *
 * REGRA DE OURO (anti-simulação):
 *   Sem gateway real integrado, o alerta é REGISTADO mas NUNCA declarado como
 *   enviado. gateway_status: 'sem_gateway'.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { Contact } from '../types';

// ---------------------------------------------------------------------------
// Constantes da regra de negócio
// ---------------------------------------------------------------------------
export const MIN_EMERGENCY_CONTACTS = 2;
export const MAX_CONTACTS = 50;

/** Tipos de emergência accionáveis pelo cidadão (chave interna → rótulo). */
export const EMERGENCY_ALERT_TYPES = ['saude', 'seguranca', 'acidente', 'outro'] as const;
export type EmergencyAlertType = (typeof EMERGENCY_ALERT_TYPES)[number];

export const EMERGENCY_ALERT_TYPE_LABELS: Record<EmergencyAlertType, string> = {
  saude: 'Saúde',
  seguranca: 'Segurança',
  acidente: 'Acidente',
  outro: 'Outro',
};

/** Graus de parentesco/relação permitidos no registo de contacto (select). */
export const CONTACT_RELATION_OPTIONS = [
  'Pai/Mãe',
  'Cônjuge',
  'Filho/a',
  'Irmão/ã',
  'Amigo/a',
  'Outro',
] as const;

/**
 * Estado real do gateway de notificações. Hoje NÃO existe qualquer gateway
 * (Twilio / WhatsApp Business API / Africa's Talking) integrado na plataforma —
 * por isso as notificações nunca podem ser declaradas como "enviadas".
 * Quando o proprietário integrar um provider (via Edge Function, SERVICE key
 * apenas no servidor), esta constante evolui e o feedback passa a vir do
 * resultado real do provider.
 */
export const EMERGENCY_GATEWAY_CONFIGURED = false as const;

export type GatewayStatus = 'sem_gateway' | 'pendente_envio' | 'enviado' | 'falhado';
export type LocationStatus = 'consentida' | 'nao_disponivel';

// ---------------------------------------------------------------------------
// Validação de telefone angolano (+244 9XX XXX XXX)
// ---------------------------------------------------------------------------

/** Remove tudo o que não é dígito nem o prefixo '+' inicial. */
export function normalizeAoPhone(raw: string): string {
  const trimmed = (raw || '').trim();
  const compact = trimmed.replace(/[\s.\-()]/g, '');
  // 00244 → +244
  if (compact.startsWith('00244')) return `+244${compact.slice(5)}`;
  return compact;
}

/**
 * Aceita:
 *   +244 9XX XXX XXX · +2449XXXXXXXX · 002449XXXXXXXX · 9XXXXXXXX
 * (9 dígitos nacionais a começar por 9, com ou sem indicativo).
 * Se existir indicativo tem de ser exactamente +244 / 00244.
 */
export function isValidAoPhone(raw: string): boolean {
  const n = normalizeAoPhone(raw);
  if (!n) return false;
  if (n.startsWith('+')) return /^\+2449\d{8}$/.test(n);
  return /^9\d{8}$/.test(n);
}

/** Forma canónica para comparação anti-duplicados: dígitos nacionais (9XXXXXXXX). */
export function aoPhoneKey(raw: string): string {
  const n = normalizeAoPhone(raw);
  if (!n) return '';
  if (n.startsWith('+244')) return n.slice(4);
  if (n.startsWith('244') && n.length === 12) return n.slice(3);
  return n;
}

// ---------------------------------------------------------------------------
// Regra dos 2 contactos de emergência
// ---------------------------------------------------------------------------

export function countEmergencyContacts(contacts: Contact[]): number {
  return (contacts || []).filter(c => (c?.type || 'Normal') === 'Emergência').length;
}

/** Quantos contactos de emergência faltam para o mínimo (0 = atingido). */
export function emergencyContactShortfall(contacts: Contact[]): number {
  return Math.max(0, MIN_EMERGENCY_CONTACTS - countEmergencyContacts(contacts));
}

export interface EmergencyProfileState {
  complete: boolean;
  emergencyCount: number;
  missing: number;
}

/** Estado do perfil face à regra: completo = ≥2 contactos do tipo Emergência. */
export function emergencyProfileState(contacts: Contact[]): EmergencyProfileState {
  const emergencyCount = countEmergencyContacts(contacts || []);
  const missing = Math.max(0, MIN_EMERGENCY_CONTACTS - emergencyCount);
  return { complete: missing === 0, emergencyCount, missing };
}

// ---------------------------------------------------------------------------
// Validação de novo contacto / edição de contacto
// ---------------------------------------------------------------------------

export interface ContactFormInput {
  name: string;
  bi: string;
  relation: string;
  phone?: string;
  whatsapp?: string;
  /** v35 — opcional; validado apenas quando preenchido. */
  email?: string;
  type?: 'Normal' | 'Emergência';
}

/** v35 — formato de email simples e honesto (nome@dominio.tld). */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(raw: string | null | undefined): boolean {
  const v = (raw || '').trim();
  return !!v && EMAIL_RE.test(v);
}

/**
 * Devolve a lista de erros (vazia = válido). NUNCA decide silenciosamente —
 * todos os bloqueios são verbalizados para a UI.
 *
 * @param excludeContactId  ao EDITAR, exclui o próprio contacto da verificação
 *                          de duplicados por telefone.
 */
export function validateContactForm(
  form: ContactFormInput,
  existingContacts: Contact[],
  opts: { excludeContactId?: number } = {},
): string[] {
  const errors: string[] = [];
  const name = (form.name || '').trim();
  const bi = (form.bi || '').trim();
  const relation = (form.relation || '').trim();
  const phone = (form.phone || '').trim();
  const whatsapp = (form.whatsapp || '').trim();

  if (!name) errors.push('O nome completo é obrigatório.');
  if (!bi) errors.push('O número do BI do contacto é obrigatório.');
  if (!relation) errors.push('O grau de parentesco ou relação é obrigatório.');

  if (!phone) {
    errors.push('O número de telefone é obrigatório para contactos de emergência.');
  } else if (!isValidAoPhone(phone)) {
    errors.push('Telefone inválido — use o formato angolano: +244 9XX XXX XXX.');
  }

  if (whatsapp && !isValidAoPhone(whatsapp)) {
    errors.push('Número de WhatsApp inválido — use o formato angolano: +244 9XX XXX XXX.');
  }

  // v35 — email OPCIONAL: vazio passa; preenchido tem de ter formato válido.
  const email = (form.email || '').trim();
  if (email && !EMAIL_RE.test(email)) {
    errors.push('Email inválido — use o formato nome@dominio.com.');
  }

  // Anti-duplicados por telefone (comparação por dígitos nacionais normalizados).
  const phoneKey = aoPhoneKey(phone);
  if (phoneKey) {
    const duplicated = (existingContacts || []).some(c => {
      if (opts.excludeContactId != null && c.id === opts.excludeContactId) return false;
      const cKey = aoPhoneKey(c.phone || '');
      return cKey && cKey === phoneKey;
    });
    if (duplicated) errors.push('Já existe um contacto registado com este número de telefone.');
  }

  if ((existingContacts || []).length >= MAX_CONTACTS && opts.excludeContactId == null) {
    errors.push(`Limite máximo de ${MAX_CONTACTS} contactos atingido.`);
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Bloqueios honestos: remoção e despromoção abaixo do mínimo
// ---------------------------------------------------------------------------

export interface RemovalCheck {
  allowed: boolean;
  reason: string | null;
}

/**
 * A remoção só é permitida se, APÓS remover, restarem ≥2 contactos de
 * emergência. Um contacto Normal pode sempre ser removido.
 */
export function checkContactRemoval(contacts: Contact[], contactId: number): RemovalCheck {
  const target = (contacts || []).find(c => c.id === contactId);
  if (!target) return { allowed: false, reason: 'Contacto não encontrado.' };
  if ((target.type || 'Normal') !== 'Emergência') return { allowed: true, reason: null };

  const remaining = countEmergencyContacts(contacts) - 1;
  if (remaining < MIN_EMERGENCY_CONTACTS) {
    return {
      allowed: false,
      reason: `Não é possível eliminar: o perfil ficaria com ${remaining} contacto(s) de emergência e o mínimo obrigatório é ${MIN_EMERGENCY_CONTACTS}. Elimine primeiro outro contacto de emergência excedente ou classifique outro contacto como Emergência.`,
    };
  }
  return { allowed: true, reason: null };
}

/**
 * Despromover um contacto de Emergência → Normal segue a MESMA regra da
 * remoção: não pode deixar o perfil abaixo do mínimo.
 */
export function checkContactTypeChange(
  contacts: Contact[],
  contactId: number,
  newType: 'Normal' | 'Emergência',
): RemovalCheck {
  const target = (contacts || []).find(c => c.id === contactId);
  if (!target) return { allowed: false, reason: 'Contacto não encontrado.' };
  if ((target.type || 'Normal') === newType) return { allowed: true, reason: null };

  if (newType === 'Normal' && (target.type || 'Normal') === 'Emergência') {
    const remaining = countEmergencyContacts(contacts) - 1;
    if (remaining < MIN_EMERGENCY_CONTACTS) {
      return {
        allowed: false,
        reason: `Não é possível alterar para Normal: o perfil ficaria com apenas ${remaining} contacto(s) de emergência (mínimo obrigatório: ${MIN_EMERGENCY_CONTACTS}).`,
      };
    }
  }
  return { allowed: true, reason: null };
}

// ---------------------------------------------------------------------------
// Mensagem de Emergência — registo REAL e feedback honesto
// ---------------------------------------------------------------------------

export interface AlertRecipient {
  name: string;
  phone: string;
  whatsapp: string | null;
  channel: 'contacto' | 'proprio';
}

/**
 * Destinatários do alerta: TODOS os contactos registados + o WhatsApp do
 * próprio cidadão (quando existir). Snapshot honesto — sem inventar números:
 * contactos sem telefone entram marcados com string vazia e o envio real
 * (quando existir gateway) falharia naturalmente para eles.
 */
export function resolveAlertRecipients(
  contacts: Contact[],
  citizenOwnWhatsapp?: string,
): AlertRecipient[] {
  const recipients: AlertRecipient[] = (contacts || []).map(c => ({
    name: c.name,
    phone: c.phone || '',
    whatsapp: c.whatsapp || null,
    channel: 'contacto' as const,
  }));
  const own = (citizenOwnWhatsapp || '').trim();
  if (own) {
    recipients.push({ name: 'Próprio cidadão', phone: own, whatsapp: own, channel: 'proprio' });
  }
  return recipients;
}

export interface EmergencyAlertInput {
  citizenBi: string;
  alertType: EmergencyAlertType;
  /** posição GPS REAL (já consentida pelo browser) ou null. */
  position: { lat: number; lng: number } | null;
  contacts: Contact[];
  citizenOwnWhatsapp?: string;
}

export interface EmergencyAlertRow {
  citizen_bi: string;
  alert_type: EmergencyAlertType;
  lat: number | null;
  lng: number | null;
  location_status: LocationStatus;
  recipients_snapshot: AlertRecipient[];
  gateway_status: GatewayStatus;
}

/**
 * Constrói a linha REAL para `emergency_alerts`.
 * PROIBIDO inventar coordenadas: position null → location_status 'nao_disponivel'.
 */
export function buildEmergencyAlertRow(input: EmergencyAlertInput): EmergencyAlertRow {
  const hasPosition = !!input.position
    && Number.isFinite(input.position.lat)
    && Number.isFinite(input.position.lng);

  return {
    citizen_bi: (input.citizenBi || '').trim(),
    alert_type: input.alertType,
    lat: hasPosition ? input.position!.lat : null,
    lng: hasPosition ? input.position!.lng : null,
    location_status: hasPosition ? 'consentida' : 'nao_disponivel',
    recipients_snapshot: resolveAlertRecipients(input.contacts, input.citizenOwnWhatsapp),
    gateway_status: EMERGENCY_GATEWAY_CONFIGURED ? 'pendente_envio' : 'sem_gateway',
  };
}

export interface EmergencyAlertOutcome {
  /** true = o alerta ficou REGISTADO na nuvem (não confundir com notificações enviadas). */
  recorded: boolean;
  row: EmergencyAlertRow;
  /** código de erro real quando a gravação falha (ex.: PostgREST/RLS). */
  errorCode: string | null;
  errorMessage: string | null;
  /** true em contas demo / modo sandbox — nada foi escrito nem enviado. */
  sandbox: boolean;
}

/**
 * Feedback HONESTO para o cidadão. Nunca afirma envio de notificações sem
 * gateway real configurado e confirmado.
 */
export function emergencyAlertFeedback(outcome: EmergencyAlertOutcome): string {
  const typeLabel = EMERGENCY_ALERT_TYPE_LABELS[outcome.row.alert_type] || 'Outro';

  if (outcome.sandbox) {
    return `Simulação concluída (Modo Sandbox — sem envio real).\n` +
      `O alerta de ${typeLabel} NÃO foi registado na nuvem e NENHUMA mensagem real ` +
      `foi enviada aos contactos de emergência.`;
  }

  if (!outcome.recorded) {
    const code = outcome.errorCode ? ` (Erro real: ${outcome.errorCode})` : '';
    return `NÃO foi possível registar o alerta de ${typeLabel} na nuvem${code}. ` +
      `Verifique a sua ligação e tente novamente. Nenhuma notificação foi enviada.`;
  }

  const locationNote = outcome.row.location_status === 'consentida'
    ? 'Localização GPS anexada (consentida).'
    : 'Sem localização GPS (não disponível ou não autorizada).';

  if (outcome.row.gateway_status === 'sem_gateway') {
    return `Alerta de ${typeLabel} registado com sucesso na sua rede de confiança. ` +
      `${locationNote}\n` +
      `Envio automático INDISPONÍVEL — gateway de SMS/WhatsApp não configurado. ` +
      `Nenhuma mensagem foi enviada aos ${outcome.row.recipients_snapshot.length} destinatário(s).`;
  }

  // Futuro (gateway integrado): o texto real por destinatário virá do provider.
  if (outcome.row.gateway_status === 'enviado') {
    return `Alerta de ${typeLabel} registado e notificações enviadas com sucesso. ` +
      `${locationNote}`;
  }

  return `Alerta de ${typeLabel} registado. Envio das notificações pendente. ${locationNote}`;
}

/**
 * Insere o alerta com o cliente INJECTADO (real ou FAKE nos testes).
 * `if (!client)`: honesto — o alerta NÃO ficou registado.
 */
export async function insertEmergencyAlertWithClient(
  client: SupabaseClient,
  row: EmergencyAlertRow,
): Promise<EmergencyAlertOutcome> {
  const base: EmergencyAlertOutcome = {
    recorded: false,
    row,
    errorCode: null,
    errorMessage: null,
    sandbox: false,
  };
  if (!client) {
    return { ...base, errorCode: 'SEM_CLIENTE', errorMessage: 'Cliente de nuvem indisponível.' };
  }
  try {
    const { error } = await client.from('emergency_alerts').insert([row]);
    if (error) {
      return { ...base, errorCode: error.code || 'DESCONHECIDO', errorMessage: error.message || '' };
    }
    return { ...base, recorded: true };
  } catch (e) {
    return { ...base, errorCode: e?.code || 'EXCEPCAO', errorMessage: (e as Error)?.message || String(e) };
  }
}
