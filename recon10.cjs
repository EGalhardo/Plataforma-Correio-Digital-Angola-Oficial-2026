const { chromium } = require('playwright');
const { login, APP } = require('./scripts/test_interop_contas_reais_playwright.cjs');
(async () => {
  const browser = await chromium.launch();
  const i = await login(browser, 'instituicao', '/home/user/repo/test-artifacts');
  const p = i.page;
  await p.goto(`${APP}/institucional#/correspondencias`, { waitUntil:'networkidle' });
  await p.waitForTimeout(3000);
  await p.locator('tr:has-text("INTEROP")').first().locator('button[title="Analisar"]').click();
  await p.waitForTimeout(3000);
  await p.click('button:has-text("Responder")');
  await p.waitForTimeout(3500);
  const campos = await p.$$eval('input,textarea', els=>els.map(e=>({t:e.tagName,ph:e.placeholder,vis:!!e.offsetParent})).filter(x=>x.vis));
  console.log('campos após Responder:', JSON.stringify(campos));
  const btns = await p.$$eval('button', els=>[...new Set(els.map(e=>(e.innerText||'').trim()).filter(Boolean))].slice(0,30));
  console.log('botões:', JSON.stringify(btns));
  await p.screenshot({ path:'test-artifacts/recon-responder.png', fullPage:true });
  await i.ctx.close(); await browser.close();
})();
