/**
 * face_templates no servidor — leitura e gravação do descritor facial.
 * ---------------------------------------------------------------------------
 * Regra de segurança desta rota:
 *   · o token tem de ser válido (Auth) e a IDENTIDADE gravada tem de ser a do
 *     próprio titular (B.I. no app_metadata para cidadão; Nº de agente para
 *     instituição/administração). Ninguém grava nem lê o rosto de outra pessoa.
 *   · a tabela tem RLS ligado e ZERO políticas: anon/authenticated não a vêem;
 *     só o service_role (este módulo) lhe toca.
 *   · guarda-se o VETOR (matemática), nunca a fotografia.
 *
 * Nunca lança: devolve sempre `{ ok, ... }`.
 */

export type FaceSyncResult = { ok: boolean; erro?: string; descritor?: number[]; algoritmo?: string; atualizadoEm?: string };

const identidadeDoUtilizador = (user: any): { identidade: string; papel: string } | null => {
  const meta = { ...(user?.app_metadata || {}), ...(user?.user_metadata || {}) };
  const papel = String(meta.role || '').toLowerCase();
  const bi = String(meta.bi || '').trim().toUpperCase().replace(/\s+/g, '');
  const agente = String(meta.agent || '').trim().toUpperCase().replace(/\s+/g, '');
  if (papel === 'cidadao' && bi) return { identidade: bi, papel: 'user' };
  if (papel === 'instituicao' && agente) return { identidade: agente, papel: 'institution' };
  if (papel === 'admin' && agente) return { identidade: agente, papel: 'admin' };
  if (bi) return { identidade: bi, papel: 'user' };
  if (agente) return { identidade: agente, papel: 'institution' };
  return null;
};

export async function tratarFaceTemplate(
  supabaseUrl: string,
  serviceKey: string,
  body: { acao?: string; token?: string; descritor?: number[]; algoritmo?: string },
): Promise<FaceSyncResult & { status: number }> {
  try {
    if (!supabaseUrl || !serviceKey) return { ok: false, status: 500, erro: 'Serviço indisponível.' };
    const token = String(body?.token || '').trim();
    if (!token) return { ok: false, status: 401, erro: 'Sessão obrigatória.' };
    const h = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

    const rUser = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: `Bearer ${token}` } });
    if (!rUser.ok) return { ok: false, status: 401, erro: 'Sessão inválida.' };
    const sess = await rUser.json().catch(() => null);
    const dono = identidadeDoUtilizador(sess?.user || sess);
    if (!dono) return { ok: false, status: 403, erro: 'Conta sem identidade reconhecida.' };

    const filtro = `identidade=eq.${encodeURIComponent(dono.identidade)}&papel=eq.${encodeURIComponent(dono.papel)}`;

    if ((body?.acao || 'ler') === 'ler') {
      const r = await fetch(`${supabaseUrl}/rest/v1/face_templates?select=descritor,algoritmo,atualizado_em&${filtro}`, { headers: h });
      if (!r.ok) return { ok: false, status: 500, erro: (await r.text()).slice(0, 160) };
      const linhas = await r.json().catch(() => []);
      if (!Array.isArray(linhas) || !linhas.length) return { ok: false, status: 200, erro: 'sem-registo' };
      const l = linhas[0];
      return { ok: true, status: 200, descritor: (l.descritor?.v || l.descritor) as number[], algoritmo: l.algoritmo, atualizadoEm: l.atualizado_em };
    }

    if (body?.acao === 'gravar') {
      const descritor = body?.descritor;
      if (!Array.isArray(descritor) || descritor.length < 64 || descritor.length > 4096) {
        return { ok: false, status: 400, erro: 'Descritor facial inválido.' };
      }
      if (!descritor.every((v) => typeof v === 'number' && Number.isFinite(v))) {
        return { ok: false, status: 400, erro: 'Descritor facial com valores inválidos.' };
      }
      const r = await fetch(`${supabaseUrl}/rest/v1/face_templates?on_conflict=identidade,papel`, {
        method: 'POST',
        headers: { ...h, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{
          identidade: dono.identidade,
          papel: dono.papel,
          algoritmo: String(body?.algoritmo || 'v1').slice(0, 12),
          descritor: { v: descritor },
          consentimento_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        }]),
      });
      if (!r.ok) return { ok: false, status: 500, erro: (await r.text()).slice(0, 160) };
      return { ok: true, status: 200, algoritmo: String(body?.algoritmo || 'v1') };
    }

    if (body?.acao === 'apagar') {
      const r = await fetch(`${supabaseUrl}/rest/v1/face_templates?${filtro}`, { method: 'DELETE', headers: h });
      if (!r.ok) return { ok: false, status: 500, erro: (await r.text()).slice(0, 160) };
      return { ok: true, status: 200 };
    }

    return { ok: false, status: 400, erro: 'Acção desconhecida.' };
  } catch (e: any) {
    return { ok: false, status: 500, erro: String(e?.message || e).slice(0, 160) };
  }
}
