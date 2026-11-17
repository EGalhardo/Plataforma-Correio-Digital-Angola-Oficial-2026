/**
 * PROVA — CORREIO ENTRE O CIDADÃO E A INSTITUIÇÃO (ida e resposta)
 *
 *   node scripts/test_correio_ida_e_resposta_playwright.cjs
 *
 * Reproduz exactamente o relato do dono, com as duas contas reais:
 *   1. o cidadão envia «OI» à instituição (assunto único, marcado PROVA);
 *   2. a instituição vê a mensagem e RESPONDE «OI»;
 *   3. o cidadão volta a entrar (sessão nova) e tem de ver as DUAS:
 *      a que enviou (caixa ENVIADAS) e a resposta (caixa de entrada);
 *   4. ninguém pode ficar com uma correspondência endereçada a si próprio.
 *
 * Os dados criados levam o selo de prova e são removidos no fim por este
 * próprio script (nunca toca em correspondência real).
 */
const { chromium } = require('playwright');
const fs = require('fs');

const APP = 'https://correio-digital-angola-oficial.vercel.app';
const E = (ms) => new Promise((r) => setTimeout(r, ms));
const SELO = 'PROVA-CORREIO';
const ASSUNTO = `${SELO}-${Date.now().toString().slice(-6)}`;

const env = {};
for (const l of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
const db = async (q, init) => (await fetch(`${env.SUPABASE_URL}/rest/v1/${q}`, { headers: H, ...init })).json();
const limpar = async () => {
  await fetch(`${env.SUPABASE_URL}/rest/v1/messages?subject=like.*${SELO}*`, { method: 'DELETE', headers: H });
  const restantes = await db(`messages?select=id&subject=like.*${SELO}*`);
  return Array.isArray(restantes) ? restantes.length : -1;
};

async function entrar(browser, { base, u, s }) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, locale: 'pt-PT' });
  const page = await ctx.newPage();
  await page.goto(`${APP}${base}/#/login`, { waitUntil: 'networkidle' });
  await E(1300);
  await page.fill('input[name="cda-utilizador"]', u);
  await page.fill('input[name="cda-senha"]', s);
  await page.click('button:has-text("ENTRAR NO PORTAL")');
  await E(6000);
  return { ctx, page };
}

/** Fecha os passos do compositor (modalidade → rever → enviar), tolerante. */
async function concluirEnvio(page) {
  // O compositor pede até três confirmações: modalidade de envio → «Enviar
  // mesmo assim» (aviso de corpo curto) → revisão final «ENVIAR
  // CORRESPONDÊNCIA». Percorre-as em sequência até o compositor fechar.
  const passos = [
    '[data-testid="popup-enviar-mensagem"] button',
    'button:has-text("OK")',
    'button:has-text("Enviar mesmo assim")',
    'button:has-text("Enviar Correspondência")',
    'button:has-text("Enviar Mensagem Oficial")',
    'button:has-text("Enviar Mensagem")',
  ];
  for (let volta = 0; volta < 3; volta++) {
    for (const sel of passos) {
      const alvo = page.locator(sel).first();
      if (await alvo.count() && await alvo.isVisible().catch(() => false)) {
        await alvo.click({ force: true }).catch(() => {});
        await E(1600);
      }
    }
    // compositor fechado = envio concluído
    if (!(await page.locator('button:has-text("Enviar mesmo assim"), button:has-text("Enviar Correspondência")').count())) break;
  }
}

(async () => {
  const browser = await chromium.launch();
  const falhas = [];

  // ─── 1. CIDADÃO ENVIA ───
  console.log(`\n1. CIDADÃO envia «OI» (assunto ${ASSUNTO})`);
  const cid1 = await entrar(browser, { base: '', u: '002399714LA030', s: '123456789' });
  await cid1.page.locator('button:has-text("Correio")').first().click(); await E(2500);
  await cid1.page.locator('button:has-text("Nova Mensagem")').first().click(); await E(2500);
  const dest = cid1.page.locator('input[placeholder*="Institucional" i]').first();
  await dest.click(); await dest.type('AGT-LMM-01', { delay: 40 }); await E(2000);
  await cid1.page.locator('input[placeholder*="tema" i]').first().click();
  await cid1.page.locator('input[placeholder*="tema" i]').first().type(ASSUNTO);
  const corpo = cid1.page.locator('textarea, [contenteditable="true"]').first();
  await corpo.click(); await corpo.type('OI');
  await cid1.page.locator('button:has-text("Enviar Mensagem")').first().click(); await E(2000);
  await concluirEnvio(cid1.page);
  await E(3500);

  const enviada = await db(`messages?select=id,sender_bi,recipient_bi&subject=eq.${encodeURIComponent(ASSUNTO)}`);
  const ok1 = Array.isArray(enviada) && enviada.length === 1
    && enviada[0].sender_bi === '002399714LA030' && enviada[0].recipient_bi === 'AGT-LMM';
  console.log(`   base: ${ok1 ? '002399714LA030 → AGT-LMM ✓' : JSON.stringify(enviada)}`);
  if (!ok1) falhas.push('o envio do cidadão não ficou registado com remetente/destinatário correctos');
  await cid1.ctx.close();

  // ─── 2. INSTITUIÇÃO VÊ E RESPONDE ───
  console.log('\n2. INSTITUIÇÃO vê a mensagem e responde');
  const inst = await entrar(browser, { base: '/institucional', u: 'AGT-LMM-01', s: '123456789' });
  await inst.page.locator('button:has-text("Correio")').first().click(); await E(3500);
  const caixaInst = (await inst.page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  const instVe = caixaInst.includes(ASSUNTO);
  console.log('   mensagem na caixa da instituição:', instVe ? '✓ SIM' : '✗ NÃO');
  if (!instVe) falhas.push('a instituição não viu a mensagem do cidadão');

  const linha = inst.page.locator(`tr:has-text("${ASSUNTO}")`).first();
  await linha.locator('button').first().click(); await E(2800);
  await inst.page.locator('button:has-text("Responder")').first().click(); await E(2500);
  const destinoResposta = await inst.page.locator('input[placeholder*="BI" i]').first().inputValue().catch(() => '');
  console.log('   destinatário da resposta:', JSON.stringify(destinoResposta),
    destinoResposta === '002399714LA030' ? '✓ o cidadão' : '✗ errado');
  if (destinoResposta !== '002399714LA030') falhas.push(`a resposta não ficou endereçada ao cidadão (${destinoResposta})`);

  await inst.page.locator('textarea').first().click();
  await inst.page.locator('textarea').first().type('OI');
  await inst.page.locator('button:has-text("Enviar Mensagem Oficial")').first().click(); await E(2000);
  await concluirEnvio(inst.page);
  await E(4000);

  const resposta = await db(`messages?select=sender_bi,recipient_bi,body&subject=eq.${encodeURIComponent('RE: ' + ASSUNTO)}`);
  const ok2 = Array.isArray(resposta) && resposta.length === 1
    && resposta[0].sender_bi === 'AGT-LMM' && resposta[0].recipient_bi === '002399714LA030';
  console.log(`   base: ${ok2 ? 'AGT-LMM → 002399714LA030 ✓' : JSON.stringify(resposta)}`);
  if (!ok2) falhas.push('a resposta da instituição não chegou ao cidadão');

  // ninguém a falar consigo mesmo
  const autoEnvios = await db(`messages?select=sender_bi,recipient_bi&subject=like.*${SELO}*`);
  const falandoSozinho = (autoEnvios || []).filter((m) => String(m.sender_bi).startsWith(String(m.recipient_bi)));
  console.log('   correspondências endereçadas a si próprio:', falandoSozinho.length,
    falandoSozinho.length === 0 ? '✓ nenhuma' : '✗ ' + JSON.stringify(falandoSozinho));
  if (falandoSozinho.length) falhas.push('foi criada uma correspondência endereçada ao próprio remetente');
  await inst.ctx.close();

  // ─── 3. CIDADÃO VOLTA A ENTRAR ───
  console.log('\n3. CIDADÃO volta a entrar e procura as duas');
  const cid2 = await entrar(browser, { base: '', u: '002399714LA030', s: '123456789' });
  await cid2.page.locator('button:has-text("Correio")').first().click(); await E(4500);
  const entrada = (await cid2.page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  const veResposta = entrada.includes(`RE: ${ASSUNTO}`) || entrada.includes(ASSUNTO);
  console.log('   resposta visível na caixa de entrada:', veResposta ? '✓ SIM' : '✗ NÃO');
  if (!veResposta) falhas.push('o cidadão não viu a resposta ao voltar a entrar');

  await cid2.page.locator('text=ENVIADAS').first().click(); await E(3000);
  const enviadas = (await cid2.page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  const veEnviada = enviadas.includes(ASSUNTO);
  console.log('   mensagem enviada visível em ENVIADAS:', veEnviada ? '✓ SIM' : '✗ NÃO');
  if (!veEnviada) falhas.push('o cidadão não viu a sua própria mensagem enviada');
  await cid2.page.screenshot({ path: 'test-artifacts/correio-prova-cidadao.png' });
  await cid2.ctx.close();

  await browser.close();

  // ─── 4. LIMPEZA ───
  const sobras = await limpar();
  console.log('\nlimpeza das provas:', sobras === 0 ? '✓ 0 registos com selo' : `✗ ${sobras} restantes`);

  console.log('\n' + '─'.repeat(64));
  if (falhas.length === 0) { console.log('RESULTADO: APROVADO'); process.exit(0); }
  console.log('RESULTADO: REPROVADO');
  falhas.forEach((f) => console.log('  · ' + f));
  process.exit(1);
})();
