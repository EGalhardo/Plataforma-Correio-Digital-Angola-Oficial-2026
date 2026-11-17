/**
 * PROVA — «Confirmar Respostas às Sondagens · 2 sondagens · Sem escolha»
 *
 *   node scripts/provar_inquerito_2sondagens_playwright.cjs
 *
 * Reproduz o relato: a instituição cria DUAS sondagens no compositor e envia ao
 * cidadão Edlasio. Depois:
 *   1. verifica que as sondagens ficam ATIVAS (não presas em rascunho);
 *   2. o cidadão abre a correspondência e vê as duas com opções;
 *   3. escolhe uma opção em cada e confirma — sem nenhum «Sem escolha»;
 *   4. as respostas ficam gravadas com o BI do cidadão;
 *   5. RESGATE: forçando as sondagens de volta a rascunho (o defeito original),
 *      o cidadão volta a abrir e continua a conseguir responder;
 *   6. limpeza total.
 */
const { chromium } = require('playwright');
const fs = require('fs');

const env = {};
for (const l of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const URL_SB = env.SUPABASE_URL, SR = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };
const APP = 'https://correio-digital-angola-oficial.vercel.app';
const E = (ms) => new Promise((r) => setTimeout(r, ms));
const MARCA = 'PROVA2';
const ASSUNTO = `${MARCA} ${Date.now().toString().slice(-6)}`;
const q = async (s) => (await fetch(`${URL_SB}/rest/v1/${s}`, { headers: H })).json();

async function entrar(browser, base, u, s, h = 1150) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: h }, locale: 'pt-PT' });
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

  // ─── 1. instituição cria DUAS sondagens e envia ───
  console.log(`\n1. INSTITUIÇÃO cria 2 sondagens e envia «${ASSUNTO}»`);
  const inst = await entrar(browser, '/institucional', 'AGT-LMM-01', '123456789');
  await inst.p.locator('button:has-text("Correio")').first().click(); await E(3000);
  await inst.p.locator('button:has-text("Nova Mensagem")').first().click(); await E(2500);
  await inst.p.locator('input[placeholder*="BI" i]').first().fill('002399714LA030'); await E(2500);
  for (const n of ['A', 'B']) {
    await inst.p.locator('button:has-text("Criar Inquérito")').first().click(); await E(1800);
    await inst.p.locator('button:has-text("OK")').last().click(); await E(2200);
    await inst.p.locator('input[placeholder="Escreva a pergunta da sondagem"]').fill(`${ASSUNTO} — pergunta ${n}`);
    await inst.p.locator('input[placeholder="Texto A"]').fill(`Primeira opção ${n}`);
    await inst.p.locator('input[placeholder="Texto B"]').fill(`Segunda opção ${n}`);
    await inst.p.locator('button:has-text("CRIAR SONDAGEM")').click(); await E(4500);
  }
  await inst.p.locator('input[placeholder*="tema" i]').first().fill(ASSUNTO); await E(800);
  await inst.p.locator('button:has-text("Enviar Mensagem Oficial")').first().click(); await E(2500);
  for (let v = 0; v < 4; v++) {
    for (const sel of ['[data-testid="popup-enviar-mensagem"] button', 'button:has-text("Enviar mesmo assim")', 'button:has-text("Enviar Correspondência")']) {
      const l = inst.p.locator(sel).first();
      if (await l.count() && await l.isVisible().catch(() => false)) { await l.click({ force: true }).catch(() => {}); await E(1800); }
    }
  }
  await E(4500);
  await inst.ctx.close();

  const sondagens = await q(`sondagens?select=id,status,pergunta&pergunta=like.*${encodeURIComponent(ASSUNTO)}*&order=id.asc`);
  const msg = (await q(`messages?select=id,sondagem_ids&subject=eq.${encodeURIComponent(ASSUNTO)}`))[0];
  const ids = (sondagens || []).map((s) => s.id);
  const todasAtivas = ids.length === 2 && sondagens.every((s) => s.status === 'ativa');
  console.log(`   sondagens: ${JSON.stringify(sondagens)}`);
  console.log(`   mensagem: sondagem_ids ${JSON.stringify(msg?.sondagem_ids)}`);
  console.log(`   todas activas no envio: ${todasAtivas ? '✓ sim' : '✗ não'}`);
  if (!todasAtivas) falhas.push('as sondagens não ficaram activas no envio');

  // ─── 2/3/4. cidadão abre, escolhe e confirma ───
  console.log('\n2. CIDADÃO abre a correspondência e responde às duas');
  const cid = await entrar(browser, '', '002399714LA030', '123456789');
  await cid.p.locator('button:has-text("Correio")').first().click(); await E(3500);
  await cid.p.locator(`tr:has-text("${ASSUNTO}")`).first().locator('button').first().click(); await E(6000);
  let tela = (await cid.p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  const ve2 = (tela.match(/Primeira opção/g) || []).length;
  console.log(`   opções visíveis no cartão: ${ve2} de 2 ${ve2 === 2 ? '✓' : '✗'}`);
  if (ve2 < 2) falhas.push('o cidadão não vê as duas sondagens com opções');
  await cid.p.screenshot({ path: 'test-artifacts/inquerito2-1-aberto.png' });

  for (const n of ['A', 'B']) {
    await cid.p.locator(`text=Primeira opção ${n}`).first().click().catch(() => {});
    await E(900);
  }
  await cid.p.locator('button:has-text("Responder")').first().click(); await E(2500);
  tela = (await cid.p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  const semEscolha = (tela.match(/Sem escolha/g) || []).length;
  const naoCarregou = /não pôde ser carregada/.test(tela);
  console.log(`   modal: «Sem escolha» × ${semEscolha} · «não pôde ser carregada» ${naoCarregou ? 'sim ✗' : 'não ✓'}`);
  if (semEscolha || naoCarregou) falhas.push('o modal voltou a pedir escolhas que não existem');
  await cid.p.screenshot({ path: 'test-artifacts/inquerito2-2-modal.png' });

  await cid.p.locator('button:has-text("CONFIRMAR RESPOSTAS")').first().click(); await E(5000);
  await cid.p.screenshot({ path: 'test-artifacts/inquerito2-3-confirmado.png' });
  const respostas = await q(`sondagem_respostas?select=sondagem_id,escolhas,cidadao_bi&sondagem_id=in.(${ids.join(',')})`);
  const okResp = Array.isArray(respostas) && respostas.length === 2
    && respostas.every((r) => r.cidadao_bi === '002399714LA030' && Array.isArray(r.escolhas) && r.escolhas.length === 1);
  console.log(`   respostas gravadas: ${JSON.stringify(respostas)} ${okResp ? '✓' : '✗'}`);
  if (!okResp) falhas.push('as respostas do cidadão não ficaram gravadas');
  await cid.ctx.close();

  // ─── 5. resgate: voltar as sondagens a rascunho ───
  console.log('\n3. RESGATE — sondagens forçadas de volta a rascunho (o defeito original)');
  await fetch(`${URL_SB}/rest/v1/sondagem_respostas?sondagem_id=in.(${ids.join(',')})`, { method: 'DELETE', headers: H });
  await fetch(`${URL_SB}/rest/v1/sondagens?id=in.(${ids.join(',')})`, { method: 'PATCH', headers: H, body: JSON.stringify({ status: 'rascunho' }) });
  const cid2 = await entrar(browser, '', '002399714LA030', '123456789');
  await cid2.p.locator('button:has-text("Correio")').first().click(); await E(3500);
  await cid2.p.locator(`tr:has-text("${ASSUNTO}")`).first().locator('button').first().click(); await E(6000);
  const tela2 = (await cid2.p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  const recuperou = (tela2.match(/Primeira opção/g) || []).length >= 2;
  console.log(`   cartão voltou a funcionar em rascunho? ${recuperou ? '✓ sim (resgatado)' : '✗ não'}`);
  if (!recuperou) falhas.push('a sondagem em rascunho não foi resgatada');
  const depois = await q(`sondagens?select=id,status&id=in.(${ids.join(',')})`);
  console.log(`   estado após resgate: ${JSON.stringify(depois)}`);
  await cid2.p.locator('text=Primeira opção A').first().click().catch(() => {}); await E(900);
  await cid2.p.locator('text=Primeira opção B').first().click().catch(() => {}); await E(900);
  await cid2.p.locator('button:has-text("Responder")').first().click(); await E(2500);
  const sem2 = ((await cid2.p.evaluate(() => document.body.innerText)).match(/Sem escolha/g) || []).length;
  await cid2.p.locator('button:has-text("CONFIRMAR RESPOSTAS")').first().click(); await E(5000);
  const resp2 = await q(`sondagem_respostas?select=sondagem_id&sondagem_id=in.(${ids.join(',')})`);
  console.log(`   respondeu após resgate: ${sem2 === 0 && resp2.length === 2 ? '✓ sim' : '✗ não'} (Sem escolha × ${sem2})`);
  if (sem2 !== 0 || resp2.length !== 2) falhas.push('não foi possível responder após o resgate');
  await cid2.ctx.close();

  // ─── 6. limpeza ───
  await fetch(`${URL_SB}/rest/v1/sondagem_respostas?sondagem_id=in.(${ids.join(',')})`, { method: 'DELETE', headers: H });
  await fetch(`${URL_SB}/rest/v1/messages?subject=eq.${encodeURIComponent(ASSUNTO)}`, { method: 'DELETE', headers: H });
  await fetch(`${URL_SB}/rest/v1/sondagens?pergunta=like.*${encodeURIComponent(ASSUNTO)}*`, { method: 'DELETE', headers: H });
  const sobra = await q(`sondagens?select=id&pergunta=like.*${encodeURIComponent(ASSUNTO)}*`);
  console.log(`\nlimpeza: ${sobra.length === 0 ? '✓ 0 restantes' : '✗ ' + sobra.length}`);

  await browser.close();
  console.log('\n' + '─'.repeat(66));
  if (!falhas.length) { console.log('RESULTADO: APROVADO'); process.exit(0); }
  console.log('RESULTADO: REPROVADO'); falhas.forEach((f) => console.log('  · ' + f)); process.exit(1);
})();
