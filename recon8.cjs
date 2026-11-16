const { chromium } = require('playwright');
const { login, APP } = require('./scripts/test_interop_contas_reais_playwright.cjs');
(async () => {
  const browser = await chromium.launch();
  const i = await login(browser, 'instituicao', '/home/user/repo/test-artifacts');
  const p = i.page;
  await p.goto(`${APP}/institucional#/correspondencias`, { waitUntil:'networkidle' });
  await p.waitForTimeout(3000);
  const row = p.locator('tr:has-text("INTEROP")').first();
  const html = await row.evaluate(e => e.outerHTML);
  console.log('--- elementos clicáveis na linha ---');
  const clicaveis = await row.evaluate(e => [...e.querySelectorAll('button,a,[role="button"],svg')].map(x => ({tag:x.tagName, txt:(x.innerText||'').trim().slice(0,20), title:x.getAttribute('title'), cls:(x.getAttribute('class')||'').slice(0,50)})));
  console.log(JSON.stringify(clicaveis, null, 0).slice(0, 1200));
  await i.ctx.close(); await browser.close();
})();
