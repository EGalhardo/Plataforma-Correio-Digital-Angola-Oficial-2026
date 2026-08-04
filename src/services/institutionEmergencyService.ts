/**
 * F58 / v20 — Difusão Institucional para Rede de Emergência.
 *
 * Núcleo PURO e testável (clientes INJECTADOS — FAKE nos testes; sem gates
 * de import.meta.env; basta `if (!client)`):
 *   - buildWaMeLink: link wa.me canónico com validação +244 (reuso F55);
 *   - lookupCidadaoByBi: RPC cda_cidadao_lookup_bi (BI exacto, instituição-only);
 *   - fetchRedeEmergencia: RPC cda_rede_emergencia_bi (rede tipo «Emergência»);
 *   - recordInstitutionBroadcast: registo real em emergency_alerts (ramo inst);
 *   - textos HONESTOS dos chips por canal (matriz única da spec §3.4) —
 *     "WhatsApp enviado" NÃO EXISTE em lado nenhum e não pode existir.
 */

import { isValidAoPhone, aoPhoneKey } from './emergencyContactsService';

// ---------------------------------------------------------------------------
// F59 — Formato do BI angolano usado pela plataforma (9 dígitos + 2 letras +
// 3 dígitos). Serve APENAS para gatilho automático do lookup no compositor
// (debounce) — a RPC é sempre a autoridade final (faz upper/trim/exacto).
// ---------------------------------------------------------------------------

export const CDA_BI_COMPLETO_RE = /^\d{9}[A-Za-z]{2}\d{3}$/;

export function isCompleteBiFormat(raw: string | null | undefined): boolean {
  return CDA_BI_COMPLETO_RE.test((raw || '').trim());
}

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export interface InstCitizenInfo {
  bi: string;
  name: string;
  emergencyContactsCount: number;
  redeCompleta: boolean;
}

export interface InstCitizenLookupResult {
  found: boolean;
  citizen: InstCitizenInfo | null;
  /** código de erro real quando a RPC falha (ex.: P0001, P0002, PGRST202). */
  errorCode: string | null;
}

export interface RedeMember {
  name: string;
  relation: string;
  phone: string | null;
  whatsapp: string | null;
  /** BI do familiar — só vem preenchido quando EXISTE conta CDA. */
  cda_bi: string | null;
  has_cda_account: boolean;
}

export interface FetchRedeResult {
  members: RedeMember[] | null;
  errorCode: string | null;
}

// ---------------------------------------------------------------------------
// buildWaMeLink — link wa.me canónico (validação +244 reutilizada do F55)
// ---------------------------------------------------------------------------

/**
 * Gera `https://wa.me/244<nacionais>?text=<msg encodada>`.
 * Devolve null quando o número não é um telefone angolano móvel válido —
 * a UI NUNCA deve abrir um link com número inválido.
 */
export function buildWaMeLink(rawPhone: string | null | undefined, text: string): string | null {
  const phone = (rawPhone || '').trim();
  if (!phone || !isValidAoPhone(phone)) return null;
  const national = aoPhoneKey(phone);
  if (!/^9\d{8}$/.test(national)) return null;
  const msg = (text || '').trim();
  const suffix = msg ? `?text=${encodeURIComponent(msg)}` : '';
  return `https://wa.me/244${national}${suffix}`;
}

/** Melhor número para WhatsApp do membro da rede: whatsapp próprio, senão telefone. */
export function redeemerWhatsappTarget(member: RedeMember): string | null {
  const candidates = [member.whatsapp, member.phone];
  for (const c of candidates) {
    const v = (c || '').trim();
    if (v && isValidAoPhone(v)) return v;
  }
  return null;
}

// ---------------------------------------------------------------------------
// RPC — lookup do cidadão por BI exacto (instituição/admin)
// ---------------------------------------------------------------------------

export async function lookupCidadaoByBi(client: any, rawBi: string): Promise<InstCitizenLookupResult> {
  const bi = (rawBi || '').trim();
  if (!client) return { found: false, citizen: null, errorCode: 'SEM_CLIENTE' };
  if (!bi) return { found: false, citizen: null, errorCode: 'BI_VAZIO' };
  try {
    const { data, error } = await client.rpc('cda_cidadao_lookup_bi', { p_bi: bi });
    if (error) return { found: false, citizen: null, errorCode: error.code || 'DESCONHECIDO' };
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { found: false, citizen: null, errorCode: null };
    return {
      found: true,
      citizen: {
        bi: row.bi,
        name: row.name,
        emergencyContactsCount: row.emergency_contacts_count ?? 0,
        redeCompleta: !!row.rede_completa,
      },
      errorCode: null,
    };
  } catch (e: any) {
    return { found: false, citizen: null, errorCode: e?.code || 'EXCEPCAO' };
  }
}

// ---------------------------------------------------------------------------
// RPC — rede de emergência do cidadão (só tipo «Emergência»; defesa dupla)
// ---------------------------------------------------------------------------

export async function fetchRedeEmergencia(client: any, rawBi: string): Promise<FetchRedeResult> {
  const bi = (rawBi || '').trim();
  if (!client) return { members: null, errorCode: 'SEM_CLIENTE' };
  if (!bi) return { members: null, errorCode: 'BI_VAZIO' };
  try {
    const { data, error } = await client.rpc('cda_rede_emergencia_bi', { p_bi: bi });
    if (error) return { members: null, errorCode: error.code || 'DESCONHECIDO' };
    const rows = (Array.isArray(data) ? data : []) as any[];
    const members: RedeMember[] = rows.map(r => ({
      name: r.name || '',
      relation: r.relation || '',
      phone: r.phone ?? null,
      whatsapp: r.whatsapp ?? null,
      cda_bi: r.cda_bi ?? null,
      has_cda_account: !!r.has_cda_account,
    }));
    return { members, errorCode: null };
  } catch (e: any) {
    return { members: null, errorCode: e?.code || 'EXCEPCAO' };
  }
}

// ---------------------------------------------------------------------------
// Registo REAL da difusão (append-only, ramo instituição — v20 §2)
// ---------------------------------------------------------------------------

export interface BroadcastRecordRow {
  citizen_bi: string;
  alert_type: 'outro';
  location_status: 'nao_disponivel';
  recipients_snapshot: any[];
  gateway_status: 'whatsapp_link_manual';
  sender_kind: 'instituicao';
  sender_instituicao: string;
  sender_agent_bi: string | null;
  message_text: string;
  channel_detail: {
    contacto_bi: string | null;
    nome: string;
    plataforma: 'enviado' | 'sem_conta' | 'falhou';
    plataforma_error_code: string | null;
    whatsapp_link: boolean;
    at: string;
  };
}

export interface RecordBroadcastResult {
  recorded: boolean;
  errorCode: string | null;
}

export async function recordInstitutionBroadcast(
  client: any,
  row: BroadcastRecordRow,
): Promise<RecordBroadcastResult> {
  if (!client) return { recorded: false, errorCode: 'SEM_CLIENTE' };
  try {
    const { error } = await client.from('emergency_alerts').insert([row]);
    if (error) return { recorded: false, errorCode: error.code || 'DESCONHECIDO' };
    return { recorded: true, errorCode: null };
  } catch (e: any) {
    return { recorded: false, errorCode: e?.code || 'EXCEPCAO' };
  }
}

// ---------------------------------------------------------------------------
// Estados HONESTOS por canal (matriz única — spec v20 §3.4)
// ---------------------------------------------------------------------------

export type PlatformChip = 'a_enviar' | 'enviando' | 'enviado' | 'sem_conta' | 'falhou';
export type WhatsappChip = 'pendente' | 'link_aberto' | 'numero_invalido' | 'popup_bloqueado';
export type SandboxChip = 'sandbox';

/**
 * Texto do chip Plataforma CDA — só desfechos reais.
 */
export function platformChipText(chip: PlatformChip | SandboxChip, errorCode?: string | null): string {
  switch (chip) {
    case 'a_enviar': return 'Plataforma CDA: por enviar';
    case 'enviando': return 'Plataforma CDA: a enviar…';
    case 'enviado': return 'Enviado na plataforma ✓';
    case 'sem_conta': return 'Sem conta CDA — apenas WhatsApp';
    case 'falhou': return `Envio na plataforma falhou (Erro real: ${errorCode || 'desconhecido'})`;
    case 'sandbox': return 'Plataforma CDA: simulado (Modo Sandbox)';
  }
}

/**
 * Texto do chip WhatsApp — NUNCA "enviado" (impossível confirmar via wa.me).
 */
export function whatsappChipText(chip: WhatsappChip | SandboxChip): string {
  switch (chip) {
    case 'pendente': return 'WhatsApp: por abrir';
    case 'link_aberto': return 'Link aberto — confirmar envio no WhatsApp';
    case 'numero_invalido': return 'Sem número de WhatsApp válido';
    case 'popup_bloqueado': return 'Pop-up bloqueado — clique "Abrir WhatsApp"';
    case 'sandbox': return 'WhatsApp: simulado (Modo Sandbox)';
  }
}
