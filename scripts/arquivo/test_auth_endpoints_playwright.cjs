/**
 * Regressão Playwright dos pontos de autorização recentemente endurecidos.
 * Restrito ao projeto Supabase de teste e aos servidores locais 3117/3118.
 *   node scripts/test_auth_endpoints_playwright.cjs
 */
const { chromium } = require('playwright');
const base = process.env.TEST_SUPABASE_URL;
const local = process.env.TEST_LOCAL_URL || 'http://127.0.0.1:3117';
const anon = process.env.TEST_SUPABASE_ANON_KEY;
const svc = process.env.TEST_SUPABASE_SERVICE_KEY;
if (base !== 'https://runmdcnkawxirzkvwsnm.supabase.co' || !anon || !svc || !/^http:\/\/127\.0\.0\.1:(3117|3118)$/.test(local)) throw Error('Testes restritos ao projeto e servidores de teste isolados.');
const tag = Date.now().toString(36).slice(-6);
const svcH = { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' };
const emailCid = `cidadao.probe.${tag}@cidadao.correiodigital.ao`;
const emailAdm = `agente.admin.probe.${tag}@admin.correiodigital.ao`;
const emailInst = `agente.inst.probe.${tag}@inst.correiodigital.ao`;
async function criar(email, senha, meta, app) {
  const r = await fetch(`${base}/auth/v1/admin/users`, { method: 'POST', headers: svcH, body: JSON.stringify({ email, password: senha, email_confirm: true, user_metadata: meta, app_metadata: app }) });
  const j = await r.json(); if (!r.ok) throw Error('criar: ' + JSON.stringify(j)); return j.id;
}
async function sessao(email, senha) {
  const r = await fetch(`${base}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: senha }) });
  const j = await r.json(); if (!r.ok) throw Error('login: ' + JSON.stringify(j)); return j.access_token;
}
async function limpar(ids) { for (const id of ids) await fetch(`${base}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: svcH }); }
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage();
  await page.goto(local + '/api/health', { waitUntil: 'domcontentloaded' }).catch(() => {});
  const out = {}; const ids = [];
  try {
    // Fixture de correspondência (recriada em cada execução; o próprio teste de
    // «limpar órfãos» elimina mensagens de remetentes desconhecidos).
    await fetch(`${base}/rest/v1/messages?on_conflict=id`, {
      method: 'POST',
      headers: { ...svcH, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify([{ id: 1, subject: 'FIXTURE AUTORIZACAO', sender_bi: 'PROBE-DONO', recipient_bi: 'PROBE-DEST', org: 'TESTE' }]),
    });
    const senha = 'Probe!2026Auth' + tag;
    // Cidadão: metadados de utilizador mentem (role admin), app_metadata diz a verdade.
    ids.push(await criar(emailCid, senha, { role: 'admin', agent: 'ADMIN-0001' }, { role: 'cidadao', bi: 'PROBE' + tag.toUpperCase() }));
    // Admin e instituição legítimos (identidade só em app_metadata).
    ids.push(await criar(emailAdm, senha, {}, { role: 'admin', agent: 'ADMIN-0001' }));
    ids.push(await criar(emailInst, senha, {}, { role: 'instituicao', instituicao: 'PROBEINST', agent: 'PROBEINST-01' }));
    const tokCid = await sessao(emailCid, senha);
    const tokAdm = await sessao(emailAdm, senha);
    const tokInst = await sessao(emailInst, senha);

    const post = (rota, token, body) => page.evaluate(async ([rota, token, body, local]) => {
      const r = await fetch(local + rota, { method: 'POST', headers: token ? { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return { status: r.status, body: (await r.text()).slice(0, 160) };
    }, [rota, token, body, local]);

    // 3) /api/eliminar-correspondencia: cidadão não apaga mensagem alheia (nem a inexistente).
    out.eliminar_correspondencia = {
      sem_sessao: (await post('/api/eliminar-correspondencia', '', { id: 1 })).status,
      cidadao_que_se_diz_admin: (await post('/api/eliminar-correspondencia', tokCid, { id: 1 })).status,
      instituicao: (await post('/api/eliminar-correspondencia', tokInst, { id: 1 })).status,
      admin_legitimo: (await post('/api/eliminar-correspondencia', tokAdm, { id: 1 })).status,
    };
    // 1) /api/limpar-orfaos: só o Admin Alfa com claims confiáveis.
    out.limpar_orfaos = {
      sem_sessao: (await post('/api/limpar-orfaos', '', {})).status,
      cidadao_que_se_diz_admin: (await post('/api/limpar-orfaos', tokCid, {})).status,
      instituicao: (await post('/api/limpar-orfaos', tokInst, {})).status,
      admin_legitimo: (await post('/api/limpar-orfaos', tokAdm, {})).status,
    };
    // 2) /api/agente-permissoes: cidadão que se diz admin não gere permissões.
    out.agente_permissoes = {
      cidadao_que_se_diz_admin: (await post('/api/agente-permissoes', tokCid, { acao: 'gravar', agente: 'ADMIN-0002', paginas: ['gov-dashboard'] })).status,
      instituicao_alheia: (await post('/api/agente-permissoes', tokInst, { acao: 'gravar', agente: 'OUTRA-02', paginas: ['inst-dashboard'] })).status,
      admin_legitimo_leitura: (await post('/api/agente-permissoes', tokAdm, { acao: 'ler' })).status,
    };
    // 4) Readiness: diagnóstico restrito à administração.
    const read = async (token) => page.evaluate(async ([local, token]) => (await fetch(local + '/api/security/readiness', { headers: token ? { Authorization: 'Bearer ' + token } : {} })).status, [local, token]);
    out.readiness = { sem_sessao: await read(''), cidadao_que_se_diz_admin: await read(tokCid), admin_legitimo: await read(tokAdm) };
    const e = out.eliminar_correspondencia, l = out.limpar_orfaos;
    const ok = l.sem_sessao === 401 && l.cidadao_que_se_diz_admin === 403 && l.instituicao === 403 && l.admin_legitimo === 200
      && out.agente_permissoes.cidadao_que_se_diz_admin === 403 && out.agente_permissoes.instituicao_alheia === 403 && out.agente_permissoes.admin_legitimo_leitura === 200
      && e.sem_sessao === 401 && e.cidadao_que_se_diz_admin === 403 && e.instituicao === 403 && e.admin_legitimo === 200
      && out.readiness.sem_sessao === 403 && out.readiness.cidadao_que_se_diz_admin === 403 && out.readiness.admin_legitimo === 200;
    console.log(JSON.stringify({ servidor: local, ...out, aprovado: ok }, null, 1));
    if (!ok) process.exitCode = 1;
  } finally { await limpar(ids); await browser.close(); }
})();
