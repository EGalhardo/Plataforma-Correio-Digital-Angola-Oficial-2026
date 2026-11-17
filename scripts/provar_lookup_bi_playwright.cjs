/**
 * PROVA — consulta do BI no compositor institucional («Erro real: P0001»).
 *
 *   node scripts/provar_lookup_bi_playwright.cjs
 *
 * 1) conta real AGT-LMM-01 no compositor → o cidadão 002399714LA030 é localizado;
 * 2) token de instituição SEM a marca app_metadata.instituicao (a condição que
 *    produzia o P0001) → a RPC devolve 200 com o cidadão;
 * 3) cidadão e anónimo continuam barrados;
 * 4) as contas de teste são criadas e apagadas aqui — as reais não são tocadas.
 */
const fs = require('fs');
const { chromium } = require('playwright');

const env = {};
for (const l of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const URL_SB = env.SUPABASE_URL, SR = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.SUPABASE_ANON_KEY;
const H = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };
const APP = 'https://correio-digital-angola-oficial.vercel.app';
const BI = '002399714LA030';
const E = (ms) => new Promise((r) => setTimeout(r, ms));
const PROVA = 'prova.lookup.p0001@inst.correiodigital.ao', PASS = 'ProvaLookup!2026';

const rpc = async (tk, fn, bi) => {
  const r = await fetch(`${URL_SB}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_bi: bi }),
  });
  return { status: r.status, body: (await r.text()).slice(0, 200) };
};

(async () => {
  const falhas = [];
  const utilizadores = async () => (await (await fetch(`${URL_SB}/auth/v1/admin/users?page=1&per_page=200`, { headers: H })).json()).users || [];
  const apagarConta = async (email) => {
    for (const u of await utilizadores()) if (u.email === email) await fetch(`${URL_SB}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers: H });
  };
  const reaisAntes = (await utilizadores()).length;

  // ─── 1. compositor real, conta real ───
  console.log('\n1. COMPOSITOR — conta real AGT-LMM-01 procura o BI');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, locale: 'pt-PT' });
  const p = await ctx.newPage();
  let rpcUi = '(sem chamada)';
  p.on('response', async (x) => { if (x.url().includes('cda_cidadao_lookup_bi')) rpcUi = x.status() + ' ' + (await x.text().catch(() => '')).slice(0, 120); });
  await p.goto(`${APP}/institucional/#/login`, { waitUntil: 'networkidle' }); await E(1500);
  await p.fill('input[name="cda-utilizador"]', 'AGT-LMM-01');
  await p.fill('input[name="cda-senha"]', '123456789');
  await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(7000);
  await p.locator('button:has-text("Correio")').first().click(); await E(3000);
  await p.locator('button:has-text("Nova Mensagem")').first().click(); await E(2500);
  const campo = p.locator('input[placeholder*="BI" i]').first();
  await campo.click(); await campo.type(BI, { delay: 60 }); await E(4000);
  await p.click('#recipient-bi-search-btn').catch(() => {}); await E(4000);
  const tela = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  const localizou = /Edlasio Galhardo — BI 002399714LA030/.test(tela);
  const mostrouErro = /P0001|Não foi possível consultar o BI/.test(tela);
  console.log(`   RPC: ${rpcUi}`);
  console.log(`   ecrã: ${localizou ? '✓ cidadão localizado' : mostrouErro ? '✗ erro visível' : '? ' + tela.slice(140, 320)}`);
  if (!localizou || mostrouErro) falhas.push('o compositor não localizou o cidadão');
  await p.screenshot({ path: 'test-artifacts/lookup-bi-final.png' });
  await browser.close();

  // ─── 2. token de instituição SEM a marca (condição do P0001) ───
  console.log('\n2. TOKEN SEM «instituicao» — a condição exacta que produzia o P0001');
  await apagarConta(PROVA);
  await fetch(`${URL_SB}/auth/v1/admin/users`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ email: PROVA, password: PASS, email_confirm: true, app_metadata: { role: 'instituicao', agent: 'AGT-LMM-01' } }),
  });
  const login = async (email, pass) => (await (await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }),
  })).json());
  const s1 = await login(PROVA, PASS);
  const meta = s1.access_token ? JSON.parse(Buffer.from(s1.access_token.split('.')[1], 'base64').toString()).app_metadata : null;
  console.log('   app_metadata do token:', JSON.stringify(meta));
  const semMarca = meta && !meta.instituicao;
  const r1 = s1.access_token ? await rpc(s1.access_token, 'cda_cidadao_lookup_bi', BI) : { status: 'SEM_SESSAO', body: '' };
  console.log(`   lookup: ${r1.status} ${r1.body.slice(0, 90)}`);
  if (!semMarca || r1.status !== 200) falhas.push(`token sem marca não foi aceite (${r1.status})`);
  const rede = s1.access_token ? await rpc(s1.access_token, 'cda_rede_emergencia_bi', BI) : { status: 'SEM_SESSAO' };
  console.log(`   rede de emergência: ${rede.status}`);
  if (rede.status !== 200) falhas.push(`rede de emergência falhou (${rede.status})`);

  // ─── 3. restrições mantidas ───
  console.log('\n3. RESTRIÇÕES — cidadão e anónimo continuam de fora');
  const s2 = await login('bi.002399714la030@cidadao.correiodigital.ao', '123456789');
  const cid = s2.access_token ? await rpc(s2.access_token, 'cda_cidadao_lookup_bi', BI) : { status: 'SEM_SESSAO' };
  console.log(`   cidadão → ${cid.status} ${/P0001/.test(cid.body || '') ? '(barrado ✓)' : '✗'}`);
  if (cid.status !== 400) falhas.push('o cidadão não foi barrado');
  const anon = await rpc(ANON, 'cda_cidadao_lookup_bi', BI);
  console.log(`   sem sessão → ${anon.status} ${/42501|permission denied/.test(anon.body || '') ? '(barrado ✓)' : '✗'}`);
  if (anon.status === 200) falhas.push('sem sessão a RPC respondeu 200');

  // ─── 4. limpeza ───
  await apagarConta(PROVA);
  const reaisDepois = (await utilizadores()).length;
  console.log(`\nlimpeza: contas ${reaisAntes} → ${reaisDepois} (esperado reinar iguais)`);
  if (reaisDepois !== reaisAntes) falhas.push('sobrou uma conta de prova');

  console.log('\n' + '─'.repeat(64));
  if (!falhas.length) { console.log('RESULTADO: APROVADO'); process.exit(0); }
  console.log('RESULTADO: REPROVADO'); falhas.forEach((f) => console.log('  · ' + f)); process.exit(1);
})();
