import { chromium } from 'playwright';
const BASE = 'https://correio-digital-angola-oficial.vercel.app';
const A = '002399714LA030', B = '005404692BO043';
const R = {};
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
R.erros = [];
page.on('pageerror', e => R.erros.push('A:' + String(e).slice(0, 90)));
page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) R.erros.push('C:' + m.text().slice(0, 90)); });
const btn = async (rx) => { const l = page.locator('button', { hasText: rx }).first(); try { await l.click({ timeout: 8000 }); return true; } catch { try { await l.click({ force: true, timeout: 4000 }); return true; } catch { return false; } } };
const login = async (bi) => {
  await page.context().clearCookies();
  await page.goto(`${BASE}/?limpa=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
  await page.goto(`${BASE}/?cb=${Date.now()}#/login`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('input[type="text"], input:not([type])').first().fill(bi);
  await page.locator('input[type="password"]').first().fill('123456789');
  await btn(/ENTRAR/i);
  await page.waitForTimeout(9000);
};

/* ---- A envia para B ---- */
await login(A);
const assunto = `Correio Real A→B ${Date.now()}`;
R.assunto = assunto;
await btn(/Correio/i); await page.waitForTimeout(4500);
await btn(/Nova Mensagem/i); await page.waitForTimeout(2500);
await page.locator('input[placeholder*="Código Institucional"], input[placeholder*="destinat" i]').first().fill(B);
await page.locator('textarea').first().fill(`${assunto}\n\nMensagem real de teste ponta-a-ponta entre cidadãos. Por favor responda.`);
// assunto: campo próprio? (cidadão pode não ter campo assunto — usar o corpo)
await page.waitForTimeout(900);
await btn(/Enviar Mensagem/i); await page.waitForTimeout(1300);
const b1 = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Enviar/i.test(x.textContent || '') && x.offsetParent !== null); return b ? b.textContent.trim() : '—'; });
if (/Enviar mesmo assim/i.test(b1)) { await btn(/Enviar mesmo assim/i); await page.waitForTimeout(1300); }
R.revisao = await page.evaluate(() => /Rever antes de enviar/i.test(document.body.innerText));
const conf = page.locator('button', { hasText: /Enviar Correspondência/i }).first();
R.confirmouEnvio = await conf.isVisible().catch(() => false);
if (R.confirmouEnvio) { await conf.click(); await page.waitForTimeout(9000); }
R.sucessoA = await page.evaluate(() => /Correspondência enviada com sucesso|Sucesso/i.test(document.body.innerText));
await page.screenshot({ path: '/home/user/cda_test/screenshots/r1_envio_A.png' });

/* ---- B recebe, abre, responde ---- */
await login(B);
await btn(/Correio/i); await page.waitForTimeout(5000);
// procurar em Não Lidas e Lidas
let linha = null;
for (const aba of ['NÃO LIDAS', 'LIDAS']) {
  const b = page.locator('button', { hasText: aba }).first();
  if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await page.waitForTimeout(2500); }
  const cand = page.locator('tr,[class*=row]').filter({ hasText: /Correio Real A→B/i }).first();
  if (await cand.isVisible({ timeout: 3000 }).then(() => true).catch(() => false)) { linha = cand; break; }
}
R.recebidaB = !!linha;
if (linha) {
  await linha.locator('button', { hasText: /ABRIR|ANALISAR/i }).first().click().catch(async () => btn(/ABRIR|ANALISAR/i));
  await page.waitForTimeout(4500);
  R.conteudoB = await page.evaluate(() => /teste ponta-a-ponta entre cidadãos/i.test(document.body.innerText));
  await page.screenshot({ path: '/home/user/cda_test/screenshots/r1_detalhe_B.png' });
  // responder a partir do detalhe
  const resp = page.locator('button', { hasText: /Responder/i }).first();
  if (await resp.isVisible().catch(() => false)) {
    await resp.click(); await page.waitForTimeout(2500);
    const ta = page.locator('textarea').first();
    if (await ta.isVisible().catch(() => false)) {
      await ta.fill('Resposta real de B — recebido com sucesso.');
      await page.waitForTimeout(800);
      await btn(/Enviar Mensagem/i); await page.waitForTimeout(1300);
      const b2 = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Enviar/i.test(x.textContent || '') && x.offsetParent !== null); return b ? b.textContent.trim() : '—'; });
      if (/Enviar mesmo assim/i.test(b2)) { await btn(/Enviar mesmo assim/i); await page.waitForTimeout(1300); }
      const rev = await page.evaluate(() => /Rever antes de enviar/i.test(document.body.innerText));
      const c2 = page.locator('button', { hasText: /Enviar Correspondência/i }).first();
      if (await c2.isVisible().catch(() => false)) { await c2.click(); await page.waitForTimeout(8000); }
      R.respostaEnviada = rev;
    }
  } else R.respostaEnviada = 'sem-botão-responder';
}
/* ---- A vê a resposta ---- */
await login(A);
await btn(/Correio/i); await page.waitForTimeout(5000);
let achouResposta = false;
for (const aba of ['LIDAS', 'NÃO LIDAS', 'ENVIADAS']) {
  const b = page.locator('button', { hasText: aba }).first();
  if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await page.waitForTimeout(2500); }
  if (await page.locator('tr,[class*=row]').filter({ hasText: /Resposta real de B/i }).first().isVisible({ timeout: 2500 }).then(() => true).catch(() => false)) { achouResposta = true; break; }
}
R.A_veResposta = achouResposta;
/* notificação (sino) */
R.notificacao = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /notifica/i.test((x.textContent || '') + (x.getAttribute('aria-label') || ''))); return !!b; });
await browser.close();
console.log(JSON.stringify(R, null, 1));
