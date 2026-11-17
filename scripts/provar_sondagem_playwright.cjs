/**
 * PROVA — «new row violates row-level security policy for table "sondagens"»
 *
 *   node scripts/provar_sondagem_playwright.cjs
 *
 * Ciclo completo com as contas reais:
 *   1. instituição cria «Inquérito Normal» no compositor → fica gravado;
 *   2. anexa a sondagem à mensagem e envia-a ao cidadão;
 *   3. o cidadão abre a mensagem, VÊ o cartão da sondagem e responde;
 *   4. o voto fica na base ligado ao BI do cidadão;
 *   5. rascunhos nunca são visíveis ao cidadão; a instituição lê os seus;
 *   6. limpeza de tudo o que a prova criou.
 */
const { chromium } = require('playwright');
const fs = require('fs');

const env = {};
for (const l of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const URL_SB = env.SUPABASE_URL, SR = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.SUPABASE_ANON_KEY;
const H = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };
const APP = 'https://correio-digital-angola-oficial.vercel.app';
const E = (ms) => new Promise((r) => setTimeout(r, ms));
const SELO = 'PROVA SONDAGEM';
const PERGUNTA = `${SELO} ${Date.now().toString().slice(-6)}`;
const q = async (s) => (await fetch(`${URL_SB}/rest/v1/${s}`, { headers: H })).json();
const login = async (email, pass) => (await (await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: pass }),
})).json());

async function entrar(browser, base, u, s, maxW = 1400) {
  const ctx = await browser.newContext({ viewport: { width: maxW, height: 1100 }, locale: 'pt-PT' });
  const p = await ctx.newPage();
  await p.goto(`${APP}${base}/#/login`, { waitUntil: 'networkidle' }); await E(1400);
  await p.fill('input[name="cda-utilizador"]', u);
  await p.fill('input[name="cda-senha"]', s);
  await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(7000);
  return { ctx, p };
}

(async () => {
  const falhas = [];
  const browser = await chromium.launch();

  // ─── 1. instituição cria a sondagem ───
  console.log(`\n1. INSTITUIÇÃO cria «${PERGUNTA}» no compositor`);
  const inst = await entrar(browser, '/institucional', 'AGT-LMM-01', '123456789');
  let erroRls = false;
  inst.p.on('response', async (r) => {
    const t = await r.text().catch(() => '');
    if (/row-level security/.test(t)) erroRls = true;
  });
  await inst.p.locator('button:has-text("Correio")').first().click(); await E(3000);
  await inst.p.locator('button:has-text("Nova Mensagem")').first().click(); await E(2500);
  await inst.p.locator('input[placeholder*="BI" i]').first().fill('002399714LA030'); await E(2500);
  await inst.p.locator('button:has-text("Criar Inquérito")').first().click(); await E(2000);
  await inst.p.locator('button:has-text("OK")').last().click(); await E(2500);
  await inst.p.locator('input[placeholder="Escreva a pergunta da sondagem"]').fill(PERGUNTA);
  await inst.p.locator('input[placeholder="Texto A"]').fill('Concordo');
  await inst.p.locator('input[placeholder="Texto B"]').fill('Discordo');
  await inst.p.locator('button:has-text("CRIAR SONDAGEM")').click(); await E(6000);

  const criadas = await q(`sondagens?select=id,status,instituicao_code&pergunta=eq.${encodeURIComponent(PERGUNTA)}`);
  const sondagem = Array.isArray(criadas) ? criadas[0] : null;
  console.log(`   RLS bloqueou? ${erroRls ? '✗ SIM' : '✓ não'}`);
  console.log(`   na base: ${sondagem ? `id ${sondagem.id} · ${sondagem.instituicao_code} · ${sondagem.status}` : '✗ nada gravado'}`);
  if (erroRls) falhas.push('o erro de RLS continuou a aparecer');
  if (!sondagem || sondagem.instituicao_code !== 'AGT-LMM') falhas.push('a sondagem não ficou gravada para a instituição');
  await inst.p.screenshot({ path: 'test-artifacts/sondagem-prova-1-criada.png' });

  // ─── 2. envia a mensagem com a sondagem ───
  console.log('\n2. INSTITUIÇÃO envia a mensagem com a sondagem embutida');
  await inst.p.locator('input[placeholder*="tema" i]').first().fill(PERGUNTA); await E(800);
  await inst.p.locator('button:has-text("Enviar Mensagem Oficial")').first().click(); await E(2500);
  for (let v = 0; v < 4; v++) {
    for (const sel of ['[data-testid="popup-enviar-mensagem"] button', 'button:has-text("Enviar mesmo assim")', 'button:has-text("Enviar Correspondência")']) {
      const l = inst.p.locator(sel).first();
      if (await l.count() && await l.isVisible().catch(() => false)) { await l.click({ force: true }).catch(() => {}); await E(1800); }
    }
  }
  await E(4000);
  const msgs = await q(`messages?select=id,sondagem_ids,recipient_bi&subject=eq.${encodeURIComponent(PERGUNTA)}`);
  const msg = Array.isArray(msgs) ? msgs[0] : null;
  const ok2 = msg && Array.isArray(msg.sondagem_ids) && msg.sondagem_ids.includes(sondagem?.id) && msg.recipient_bi === '002399714LA030';
  console.log(`   base: ${ok2 ? `${msg.recipient_bi} ← sondagem_ids [${msg.sondagem_ids}]` : '✗ ' + JSON.stringify(msgs)}`);
  if (!ok2) falhas.push('a mensagem não chegou ao cidadão com a sondagem embutida');
  await inst.ctx.close();

  // ─── 3. cidadão vê e responde ───
  console.log('\n3. CIDADÃO abre a mensagem, vê o cartão e responde');
  const cid = await entrar(browser, '', '002399714LA030', '123456789');
  await cid.p.locator('button:has-text("Correio")').first().click(); await E(3500);
  await cid.p.locator(`tr:has-text("${PERGUNTA}")`).first().locator('button').first().click(); await E(4500);
  const tela = (await cid.p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  const veCartao = /Concordo/.test(tela);
  console.log(`   cartão com opções na vista principal: ${veCartao ? '✓ sim' : '✗ não'}`);
  if (!veCartao) falhas.push('o cidadão não vê o cartão de resposta');
  await cid.p.screenshot({ path: 'test-artifacts/sondagem-prova-2-cidadao.png' });

  await cid.p.locator('text=Concordo').first().click().catch(() => {}); await E(1500);
  await cid.p.locator('button:has-text("Responder")').first().click().catch(() => {}); await E(2500);
  await cid.p.locator('button:has-text("CONFIRMAR RESPOSTAS")').first().click().catch(() => {}); await E(5000);
  await cid.p.screenshot({ path: 'test-artifacts/sondagem-prova-3-voto.png' });
  const votos = await q(`sondagem_respostas?select=cidadao_bi,escolhas&sondagem_id=eq.${sondagem?.id}`);
  const ok3 = Array.isArray(votos) && votos.some((v) => v.cidadao_bi === '002399714LA030');
  console.log(`   voto na base: ${ok3 ? JSON.stringify(votos) : '✗ ' + JSON.stringify(votos)}`);
  if (!ok3) falhas.push('a resposta do cidadão não foi gravada');
  await cid.ctx.close();

  // ─── 4. rascunhos invisíveis ao cidadão ───
  console.log('\n4. RASCUNHO — visibilidade');
  const rascunho = await q('sondagens?select=id,status&status=eq.rascunho&limit=1');
  if (Array.isArray(rascunho) && rascunho[0]) {
    const c = await login('bi.002399714la030@cidadao.correiodigital.ao', '123456789');
    const r = await fetch(`${URL_SB}/rest/v1/sondagens?id=eq.${rascunho[0].id}&select=id`, {
      headers: { apikey: ANON, Authorization: `Bearer ${c.access_token}` },
    });
    const viu = await r.json();
    console.log(`   cidadão vê rascunho alheio? ${Array.isArray(viu) && viu.length ? '✗ SIM' : '✓ não'}`);
    if (Array.isArray(viu) && viu.length) falhas.push('o cidadão vê rascunhos da instituição');
  } else console.log('   (sem rascunhos na base para testar)');

  // ─── 5. limpeza ───
  console.log('\n5. LIMPEZA');
  if (sondagem) await fetch(`${URL_SB}/rest/v1/sondagem_respostas?sondagem_id=eq.${sondagem.id}`, { method: 'DELETE', headers: H });
  await fetch(`${URL_SB}/rest/v1/messages?subject=eq.${encodeURIComponent(PERGUNTA)}`, { method: 'DELETE', headers: H });
  await fetch(`${URL_SB}/rest/v1/sondagens?pergunta=like.*${encodeURIComponent(SELO)}*`, { method: 'DELETE', headers: H });
  const sobraS = await q(`sondagens?select=id&pergunta=like.*${encodeURIComponent(SELO)}*`);
  const sobraM = await q(`messages?select=id&subject=eq.${encodeURIComponent(PERGUNTA)}`);
  console.log(`   sondagens restantes: ${sobraS.length} · mensagens restantes: ${sobraM.length}`);
  if (sobraS.length || sobraM.length) falhas.push('sobraram dados de prova');

  await browser.close();
  console.log('\n' + '─'.repeat(66));
  if (!falhas.length) { console.log('RESULTADO: APROVADO'); process.exit(0); }
  console.log('RESULTADO: REPROVADO'); falhas.forEach((f) => console.log('  · ' + f)); process.exit(1);
})();
