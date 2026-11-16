const { chromium } = require('playwright');
const { login, APP } = require('./scripts/test_interop_contas_reais_playwright.cjs');
(async () => {
  const browser = await chromium.launch();
  const i = await login(browser, 'instituicao', '/home/user/repo/test-artifacts');
  const p = i.page;
  await p.goto(`${APP}/institucional#/correspondencias`, { waitUntil:'networkidle' });
  await p.waitForTimeout(3000);
  await p.locator('tr:has-text("INTEROP")').first().click();
  await p.waitForTimeout(4000);
  const btns = await p.$$eval('button', els=>[...new Set(els.map(e=>(e.innerText||'').trim()).filter(Boolean))].slice(0,40));
  console.log('botões no detalhe:', JSON.stringify(btns));
  const ta = await p.$$eval('textarea', els=>els.map(e=>({ph:e.placeholder,vis:!!e.offsetParent})));
  console.log('textareas:', JSON.stringify(ta));
  console.log('ecrã detalhe:', (await p.evaluate(()=>document.body.innerText.replace(/\s+/g,' '))).slice(0,700));
  await p.screenshot({ path:'test-artifacts/recon-detalhe-inst3.png', fullPage:true });
  await i.ctx.close(); await browser.close();
})();
