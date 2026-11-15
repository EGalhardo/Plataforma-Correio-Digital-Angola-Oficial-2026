import type { HomologationMessage } from './homologationStore';
import { homologationInboxId } from './homologationReadSync';

const MARKER_PREFIX = 'cda:institution-homologation-read:';
export const isInstitutionHomologationReadMarker = (key: unknown): boolean =>
  typeof key === 'string' && key.startsWith(MARKER_PREFIX);

export function firstInstitutionReceiptId(thread: HomologationMessage[]): number | undefined {
  const msg = thread.find(m => m.from === 'admin' && m.text.includes('confirma a receção da vossa solicitação de adesão'));
  return msg ? homologationInboxId(msg.id) : undefined;
}

/** Read state belongs to the shared institution mailbox and current registration,
 * not to an individual agent. A read-only marker in notifications is scoped by
 * target and dedupe_key; it is hidden from the user notification list. */
export async function syncInstitutionReceipt(options: {
  url: string; key: string; token: string; code: string;
  localRead: (registrationId: string) => boolean;
  signal?: AbortSignal; fetcher?: typeof fetch;
}): Promise<{ read: boolean; registrationId: string }> {
  const { url, key, token, signal, localRead } = options;
  const code = options.code.trim().toUpperCase();
  const request = options.fetcher || fetch;
  const base = url.replace(/\/$/, '');
  const authHeaders = { apikey: key, Authorization: `Bearer ${token}` };
  const userResponse = await request(`${base}/auth/v1/user`, { headers: authHeaders, signal });
  if (!userResponse.ok) throw new Error('Sessão institucional não verificada');
  const user = await userResponse.json();
  // Nunca aceitar identidade institucional apenas de user_metadata editável.
  if (String(user.app_metadata?.role || '').toLowerCase() !== 'instituicao'
      || String(user.app_metadata?.instituicao || '').trim().toUpperCase() !== code) {
    throw new Error('A sessão não corresponde à instituição');
  }
  const query = new URLSearchParams({ select:'id', bi_numero:`eq.${code}`, order:'criado_em.desc', limit:'1' });
  const regResponse = await request(`${base}/rest/v1/solicitacoes_registo?${query}`, { headers:authHeaders, signal });
  if (!regResponse.ok) throw new Error('Registo institucional indisponível');
  const rows = await regResponse.json();
  const registrationId = Array.isArray(rows) && rows[0]?.id ? String(rows[0].id) : '';
  if (!registrationId) throw new Error('Registo institucional não identificado');
  const dedupeKey = MARKER_PREFIX + registrationId;
  const proxy = async (body: Record<string, unknown>) => {
    const r = await request('/api/dados', { method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body:JSON.stringify(body), signal });
    const json = await r.json().catch(() => null);
    return { ok:r.ok && json?.ok === true, status:r.status, json };
  };
  const lookup = async () => {
    const r = await proxy({ tabela:'notifications', operacao:'select', filtros:{ target_bi:code, dedupe_key:dedupeKey }, limite:5 });
    if (!r.ok || !Array.isArray(r.json?.linhas)) throw new Error('Marcador institucional indisponível');
    return r.json.linhas.some((n: { dedupe_key?: string; target_bi?: string; read_at?: string }) =>
      n.dedupe_key === dedupeKey && String(n.target_bi || '').toUpperCase() === code && !!n.read_at);
  };
  let read = await lookup();
  if (!read && localRead(registrationId)) {
    const inserted = await proxy({ tabela:'notifications', operacao:'insert', dados:[{
      target_bi:code, dedupe_key:dedupeKey, title:'Estado interno de homologação',
      message:'Confirmação de adesão aberta.', time_text:'Agora', type:'info',
      target_tab:'correspondencias', read_at:new Date().toISOString(),
    }] });
    if (inserted.ok) read = true;
    // O UNIQUE parcial de dedupe_key resolve leituras simultâneas entre agentes.
    else if (inserted.status === 409) read = await lookup();
    else throw new Error('Não foi possível guardar a leitura institucional');
  }
  return { read, registrationId };
}
