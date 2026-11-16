const { chromium } = require('playwright');
const { login, APP } = require('./scripts/test_interop_contas_reais_playwright.cjs');
(async () => {
  const browser = await chromium.launch();
  const c = await login(browser, 'cidadao', '/home/user/repo/test-artifacts');
  await c.page.goto(`${APP}/#/nova-denuncia`, { waitUntil:'networkidle' });
  await c.page.waitForTimeout(4000);
  await c.page.click('button:has-text("Criar Denuncia")');
  await c.page.waitForTimeout(3500);
  const campos = await c.page.$$eval('input,textarea,select', els=>els.map(e=>({t:e.tagName,ty:e.type,ph:e.placeholder,vis:!!e.offsetParent})).filter(x=>x.vis));
  console.log('campos:', JSON.stringify(campos));
  const btns = await c.page.$$eval('button', els=>[...new Set(els.map(e=>(e.innerText||'').trim()).filter(Boolean))].slice(-12));
  console.log('botões:', JSON.stringify(btns));
  await c.page.screenshot({ path:'test-artifacts/recon-denuncia-form.png', fullPage:true });
  await c.ctx.close();

  // admin: comunicados
  const a = await login(browser, 'admin', '/home/user/repo/test-artifacts');
  const nav = await a.page.$$eval('button,a', els=>[...new Set(els.map(e=>(e.innerText||'').trim()).filter(t=>(t)&&t.length<30))].slice(0,30));
  console.log('nav admin:', JSON.stringify(nav));
  await a.ctx.close(); await browser.close();
})();
