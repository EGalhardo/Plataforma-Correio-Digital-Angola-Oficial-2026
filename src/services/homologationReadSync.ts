import type { HomologationMessage } from './homologationStore';
import { normalizeHomologationBi } from './homologationStore';

export type NoticeKind = 'submission' | 'approval';
export type NoticeFlags = Record<NoticeKind, boolean>;
const keys: Record<NoticeKind, string> = {
  submission: 'cda_registration_notice_read_for',
  approval: 'cda_approval_notice_read_for',
};

export function homologationInboxId(raw: string): number {
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = ((h * 31) + raw.charCodeAt(i)) >>> 0;
  return 90000000 + (h % 8999999);
}

/** Only the first notice of each kind is canonical; later decisions remain distinct. */
export function firstNoticeIds(thread: HomologationMessage[]): Partial<Record<NoticeKind, number>> {
  const ids: Partial<Record<NoticeKind, number>> = {};
  for (const message of thread) {
    if (message.from !== 'admin') continue;
    if (ids.submission == null && message.text.includes('confirma a receção do seu pedido de registo')) ids.submission = homologationInboxId(message.id);
    if (ids.approval == null && message.text.includes('HOMOLOGADA') && message.text.includes('oficialmente ATIVA')) ids.approval = homologationInboxId(message.id);
  }
  return ids;
}

export function flagsFromLocal(thread: HomologationMessage[], readIds: Set<number>): NoticeFlags {
  const ids = firstNoticeIds(thread);
  return { submission: ids.submission != null && readIds.has(ids.submission), approval: ids.approval != null && readIds.has(ids.approval) };
}

/** State is bound to both the validated Auth user and the current registration row.
 * A deleted/re-registered BI can retain its Auth user, but gets a new row id. */
export async function syncNoticeReads(options: {
  url: string; key: string; token: string; bi: string;
  local: (registrationId: string) => NoticeFlags;
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}): Promise<NoticeFlags> {
  const { url, key, token, bi, local, signal } = options;
  const request = options.fetcher || fetch;
  const base = url.replace(/\/$/, '');
  const headers = { apikey: key, Authorization: `Bearer ${token}` };
  const userResponse = await request(`${base}/auth/v1/user`, { headers, signal });
  if (!userResponse.ok) throw new Error('Sessão de homologação não verificada');
  const user = await userResponse.json();
  const meta = user.user_metadata || {};
  if (String(meta.role || '').toLowerCase() !== 'cidadao' || normalizeHomologationBi(meta.bi) !== normalizeHomologationBi(bi)) {
    throw new Error('Identidade da sessão não corresponde ao cidadão');
  }
  const query = new URLSearchParams({ select: 'id', bi_numero: `eq.${normalizeHomologationBi(bi)}`, order: 'criado_em.desc', limit: '1' });
  const registrationResponse = await request(`${base}/rest/v1/solicitacoes_registo?${query}`, { headers, signal });
  if (!registrationResponse.ok) throw new Error('Registo oficial indisponível');
  const rows = await registrationResponse.json();
  const registrationId = Array.isArray(rows) && rows[0]?.id ? String(rows[0].id) : '';
  if (!registrationId) throw new Error('Registo oficial não identificado');
  const localFlags = local(registrationId); // read after network awaits, to include concurrent openings
  const flags: NoticeFlags = { submission: meta[keys.submission] === registrationId, approval: meta[keys.approval] === registrationId };
  const patch: Record<string, string> = {};
  for (const kind of ['submission', 'approval'] as const) {
    if (localFlags[kind] && !flags[kind]) patch[keys[kind]] = registrationId;
  }
  if (Object.keys(patch).length) {
    const response = await request(`${base}/auth/v1/user`, {
      method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: patch }), signal,
    });
    if (!response.ok) throw new Error('Não foi possível guardar as leituras');
  }
  return { submission: flags.submission || localFlags.submission, approval: flags.approval || localFlags.approval };
}
