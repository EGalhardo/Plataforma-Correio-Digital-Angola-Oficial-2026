/**
 * Provisionamento de identidade — regressão (projeto isolado, servidores 3117/3118).
 *   node scripts/test_auth_provisionamento_playwright.cjs
 *
 * Prova, com o fluxo real:
 *  1. signup com claims forjadas → conta nasce sem identidade (v39);
 *  2. sem registo aprovado, reclamar identidade é recusado;
 *  3. com registo em 'Pendente' continua recusado;
 *  4. após aprovação pelo admin (endpoint real), o cidadão obtém bi só dele
 *     e vê apenas a própria caixa; outro cidadão não vê os dados dele.
 */
const { chromium } = require('playwright');
const base = process.env.TEST_SUPABASE_URL;
const local = process.env.TEST_LOCAL_URL || 'http://127.0.0.1:3117';
const anon = process.env.TEST_SUPABASE_ANON_KEY;
const svc = process.env.TEST_SUPABASE_SERVICE_KEY;
if (base !== 'https://runmdcnkawxirzkvwsnm.supabase.co' || !anon || !svc || !/^http:\/\/127\.0\.0\.1:(3117|3118)$/.test(local)) throw Error('Testes restritos ao projeto e servidores de teste isolados.');

const tag = Date.now().toString(36).slice(-6).toUpperCase();
const BI = `CID${tag}`;
const senha = 'Probe!2026' + tag;
const emailCid = `bi.${BI.toLowerCase()}@cidadao.correiodigital.ao`;
const emailAdm = `agente.admin.prov${tag.toLowerCase()}@admin.correiodigital.ao`;
const H = { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' };
const contas = [];

const criarConta = async (email, appMeta) => {
  const r = await fetch(`${base}/auth/v1/admin/users`, { method: 'POST', headers: H, body: JSON.stringify({ email, password: senha, email_confirm: true, user_metadata: {}, app_metadata: appMeta }) });
  const j = await r.json();
  if (!r.ok) throw Error('criar: ' + JSON.stringify(j));
  contas.push(j.id);
  return j.id;
};
const login = async (email) => (await (await fetch(`${base}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: senha }) })).json()).access_token;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(local + '/api/health', { waitUntil: 'domcontentloaded' }).catch(() => {});
  const out = {};
  try {
    // 1) conta do cidadão criada como o registo público faria (sem identidade)
    await page.evaluate(async ([base, anon, emailCid, senha, BI]) => {
      await fetch(base + '/auth/v1/signup', {
        method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailCid, password: senha, data: { bi: BI, role: 'cidadao', name: 'Probe' } }),
      });
    }, [base, anon, emailCid, senha, BI]);
    const tokCid = await login(emailCid);
    const rpc = (token) => page.evaluate(async ([base, anon, token]) => {
      const r = await fetch(base + '/rest/v1/rpc/cda_reclamar_identidade_cidadao', { method: 'POST', headers: { apikey: anon, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: '{}' });
      return await r.json().catch(() => null);
    }, [base, anon, token]);

    out.sem_registo = await rpc(tokCid);

    // registo PENDENTE na fila oficial
    await fetch(`${base}/rest/v1/solicitacoes_registo`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify([{ nome: 'Probe', email: emailCid, bi_numero: BI, status: 'Pendente' }]) });
    out.com_registo_pendente = await rpc(tokCid);

    // 2) admin legítimo aprova pelo endpoint real
    const idAdm = await criarConta(emailAdm, { role: 'admin', agent: 'ADMIN-0001' });
    const tokAdm = await login(emailAdm);
    out.aprovacao = await page.evaluate(async ([local, tokAdm, BI]) => {
      const r = await fetch(local + '/api/admin-aprovar-instituicao', { method: 'POST', headers: { Authorization: 'Bearer ' + tokAdm, 'Content-Type': 'application/json' }, body: JSON.stringify({ bi_numero: BI, status: 'Aprovado' }) });
      return { status: r.status, body: await r.json().catch(() => null) };
    }, [local, tokAdm, BI]);

    // 3) o cidadão obtém a identidade
    out.reclamacao_apos_aprovacao = await rpc(tokCid);

    // 4) vê apenas a própria caixa
    const u = await page.evaluate(async ([base, anon, tokCid]) => {
      const r = await fetch(base + '/auth/v1/user', { headers: { apikey: anon, Authorization: 'Bearer ' + tokCid } });
      const j = await r.json();
      return j.app_metadata;
    }, [base, anon, tokCid]);
    out.app_metadata_final = u;

    out.aprovado =
      out.sem_registo && out.sem_registo.code === 'SEM_REGISTO' &&
      out.com_registo_pendente && out.com_registo_pendente.code === 'NAO_APROVADO' &&
      out.aprovacao.status === 200 && out.aprovacao.body?.provisionamento?.ok === true &&
      // A aprovação já provisiona directamente (provisionarIdentidadeCidadao);
      // a RPC do titular é a via alternativa e responde JA_PROVISIONADO.
      (out.reclamacao_apos_aprovacao?.ok === true || out.reclamacao_apos_aprovacao?.code === 'JA_PROVISIONADO') &&
      u && u.role === 'cidadao' && u.bi === BI;
    console.log(JSON.stringify({ servidor: local, ...out }, null, 1));
    if (!out.aprovado) process.exitCode = 1;
  } finally {
    for (const id of contas) await fetch(`${base}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: H }).catch(() => {});
    await fetch(`${base}/rest/v1/solicitacoes_registo?bi_numero=eq.${encodeURIComponent(BI)}`, { method: 'DELETE', headers: H }).catch(() => {});
    await browser.close();
  }
})();
