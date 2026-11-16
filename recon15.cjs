const { chromium } = require('playwright');
const { login, APP } = require('./scripts/test_interop_contas_reais_playwright.cjs');
(async () => {
  const browser = await chromium.launch();
  // denúncia/reclamação do cidadão
  const c = await login(browser, 'cidadao', '/home/user/repo/test-artifacts');
  await c.page.goto(`${APP}/#/home`, { waitUntil:'networkidle' });
  await c.page.waitForTimeout(6000);
  const botoes = await c.page.$$eval('button', els=>[...new Set(els.map(e=>(e.innerText||'').trim()).filter(Boolean))].slice(0,40));
  console.log('botões do painel:', JSON.stringify(botoes.filter(b=>/DEN|RECLAM|INQU|COMUNIC/i.test(b))));
  const den = await c.page.$('text=/DENUNCIA|DENÚNCIA/i');
  if (den) { await den.click({force:true}); await c.page.waitForTimeout(3500);
    console.log('url denúncia:', c.page.url());
    console.log('ecrã:', (await c.page.evaluate(()=>document.body.innerText.replace(/\s+/g,' '))).slice(0,400));
  }
  await c.page.screenshot({ path:'test-artifacts/recon-denuncia.png', fullPage:true });
  await c.ctx.close(); await browser.close();
})();
