/**
 * Reprodução completa do relato do dono:
 *   1. cidadão envia «OI» à instituição;
 *   2. instituição responde «OI»;
 *   3. cidadão volta a entrar e procura as duas.
 * Regista o que fica na base em cada passo e o que aparece no ecrã.
 */
const { chromium } = require('playwright');
const fs = require('fs');

const APP = 'https://correio-digital-angola-oficial.vercel.app';
const E = (ms) => new Promise((r) => setTimeout(r, ms));
const env = {};
for (const l of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
const db = async (q) => (await fetch(`${env.SUPABASE_URL}/rest/v1/${q}`, { headers: H })).json();
const ultimas = async (n = 3) => {
  const rows = await db(`messages?select=id,subject,sender_bi,recipient_bi,created_at,state_indicator&order=created_at.desc&limit=${n}`);
  return rows.map((m) => `${m.sender_bi}→${m.recipient_bi} «${String(m.subject).slice(0, 22)}»`);
};

async function entrar(browser, { base, u, s, vp = { width: 1400, height: 900 } }) {
  const ctx = await browser.newContext({ viewport: vp, locale: 'pt-PT' });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    const t = m.text();
    if (/Supabase .*error|Error:|erro ao/i.test(t) && !/shimmer/.test(t)) console.log('   LOG:', t.slice(0, 150));
  });
  await page.goto(`${APP}${base}/#/login`, { waitUntil: 'networkidle' });
  await E(1300);
  await page.fill('input[name="cda-utilizador"]', u);
  await page.fill('input[name="cda-senha"]', s);
  await page.click('button:has-text("ENTRAR NO PORTAL")');
  await E(6000);
  return { ctx, page };
}

const ASSUNTO = `OI-${Date.now().toString().slice(-6)}`;

(async () => {
  const browser = await chromium.launch();

  // ─────────── 1. CIDADÃO ENVIA ───────────
  console.log(`\n═══ 1. CIDADÃO ENVIA «OI» (assunto ${ASSUNTO}) ═══`);
  const cid1 = await entrar(browser, { base: '', u: '002399714LA030', s: '123456789' });
  await cid1.page.locator('button:has-text("Correio")').first().click(); await E(2500);
  await cid1.page.locator('button:has-text("Nova Mensagem")').first().click(); await E(2000);
  const dest = cid1.page.locator('input[placeholder*="Institucional" i]').first();
  await dest.click(); await dest.type('AGT-LMM-01', { delay: 50 }); await E(2000);
  const tit = cid1.page.locator('input[placeholder*="tema" i]').first();
  await tit.click(); await tit.type(ASSUNTO);
  const corpo = cid1.page.locator('textarea, [contenteditable="true"]').first();
  await corpo.click(); await corpo.type('OI');
  await cid1.page.locator('button:has-text("Enviar Mensagem")').first().click(); await E(1500);
  await cid1.page.locator('text=Mensagem Normal').first().click().catch(() => {}); await E(500);
  await cid1.page.locator('button:has-text("OK")').first().click().catch(() => {}); await E(2000);
  const rever = cid1.page.locator('button:has-text("ENVIAR CORRESPONDÊNCIA")').first();
  if (await rever.count()) await rever.click(); else {
    await cid1.page.locator('button:has-text("Enviar mesmo assim")').first().click().catch(() => {});
    await E(1000);
    await cid1.page.locator('button:has-text("Enviar mesmo assim"), button:has-text("Enviar Mensagem")').first().click().catch(() => {});
    await E(1500);
    await cid1.page.locator('button:has-text("ENVIAR CORRESPONDÊNCIA")').first().click().catch(() => {});
  }
  await E(5000);
  console.log('  base:', await ultimas(1));
  await cid1.ctx.close();

  // ─────────── 2. INSTITUIÇÃO RESPONDE ───────────
  console.log('\n═══ 2. INSTITUIÇÃO RESPONDE «OI» ═══');
  const inst = await entrar(browser, { base: '/institucional', u: 'AGT-LMM-01', s: '123456789' });
  await inst.page.locator('button:has-text("Correio")').first().click(); await E(3500);
  const caixa = (await inst.page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  console.log('  a mensagem está na caixa da instituição?', caixa.includes(ASSUNTO) ? 'SIM' : 'NÃO');
  await inst.page.locator(`text=${ASSUNTO}`).first().click({ timeout: 8000 }).catch((e) => console.log('  abrir msg:', e.message.slice(0, 50)));
  await E(3000);
  await inst.page.screenshot({ path: 'test-artifacts/fluxo-1-msg-inst.png' });
  // procurar acção de responder
  const botoes = await inst.page.evaluate(() => [...document.querySelectorAll('button')]
    .filter((b) => /responder|replicar|reply/i.test(b.innerText || '')).map((b) => b.innerText.trim().slice(0, 30)));
  console.log('  botões de resposta:', JSON.stringify(botoes));
  const resp = inst.page.locator('button:has-text("Responder"), button:has-text("RESPONDER")').first();
  if (await resp.count()) {
    await resp.click(); await E(2500);
    await inst.page.screenshot({ path: 'test-artifacts/fluxo-2-resposta.png' });
    const c2 = inst.page.locator('textarea, [contenteditable="true"]').first();
    await c2.click().catch(() => {}); await c2.type('OI').catch(() => {});
    const dest2 = await inst.page.locator('input[placeholder*="Institucional" i], input[placeholder*="destinat" i]').first().inputValue().catch(() => '(sem campo)');
    console.log('  destinatário no compositor da resposta:', dest2);
    await inst.page.locator('button:has-text("Enviar Mensagem"), button:has-text("Enviar Resposta")').first().click().catch(() => {});
    await E(1500);
    await inst.page.locator('text=Mensagem Normal').first().click().catch(() => {}); await E(500);
    await inst.page.locator('button:has-text("OK")').first().click().catch(() => {}); await E(2000);
    const rev2 = inst.page.locator('button:has-text("ENVIAR CORRESPONDÊNCIA"), button:has-text("Enviar mesmo assim")').first();
    if (await rev2.count()) await rev2.click().catch(() => {});
    await E(2000);
    const rev3 = inst.page.locator('button:has-text("ENVIAR CORRESPONDÊNCIA")').first();
    if (await rev3.count()) await rev3.click().catch(() => {});
    await E(5000);
  } else {
    console.log('  ⚠ não há botão «Responder» na mensagem');
  }
  console.log('  base:', await ultimas(2));
  await inst.page.screenshot({ path: 'test-artifacts/fluxo-3-inst-depois.png' });
  await inst.ctx.close();

  // ─────────── 3. CIDADÃO VOLTA A ENTRAR ───────────
  console.log('\n═══ 3. CIDADÃO VOLTA A ENTRAR ═══');
  const cid2 = await entrar(browser, { base: '', u: '002399714LA030', s: '123456789' });
  await cid2.page.locator('button:has-text("Correio")').first().click(); await E(4000);
  const t2 = (await cid2.page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  console.log('  enviada visível na caixa?', t2.includes(ASSUNTO) ? 'SIM' : 'NÃO');
  await cid2.page.locator('text=ENVIADAS').first().click().catch(() => {}); await E(2500);
  const t3 = (await cid2.page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  console.log('  enviada visível em ENVIADAS?', t3.includes(ASSUNTO) ? 'SIM' : 'NÃO');
  await cid2.page.screenshot({ path: 'test-artifacts/fluxo-4-cid-enviadas.png' });
  await cid2.ctx.close();

  await browser.close();
})();
