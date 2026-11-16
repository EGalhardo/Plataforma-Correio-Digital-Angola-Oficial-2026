const { chromium } = require('playwright');
const { login, APP, SELO } = require('./scripts/test_interop_contas_reais_playwright.cjs');
(async () => {
  const browser = await chromium.launch();
  // ---- INSTITUIÇÃO: abrir a mensagem recebida
  const i = await login(browser, 'instituicao', '/home/user/repo/test-artifacts');
  const p = i.page;
  await p.goto(`${APP}/institucional#/correspondencias`, { waitUntil:'networkidle' });
  await p.waitForTimeout(3000);
  const pesq = await p.$('input[placeholder*="Pesquisar"]');
  if (pesq) { await pesq.fill('INTEROP'); await p.waitForTimeout(3000); }
  const itens = await p.$$eval('[class*="cursor"]', els=>els.map(e=>e.innerText.replace(/\s+/g,' ').slice(0,60)).filter(Boolean).slice(0,6));
  console.log('itens da lista:', JSON.stringify(itens));
  await p.click('text=INTEROP').catch(()=>{});
  await p.waitForTimeout(3000);
  const btns = await p.$$eval('button', els=>[...new Set(els.map(e=>(e.innerText||'').trim()).filter(Boolean))].slice(0,30));
  console.log('botões no detalhe:', JSON.stringify(btns));
  const campos = await p.$$eval('textarea,input', els=>els.map(e=>({t:e.tagName,ph:e.placeholder,vis:!!e.offsetParent})).filter(x=>x.vis));
  console.log('campos:', JSON.stringify(campos));
  console.log('ecrã:', (await p.evaluate(()=>document.body.innerText.replace(/\s+/g,' '))).slice(0,400));
  await p.screenshot({ path:'test-artifacts/recon-detalhe-inst.png', fullPage:true });
  await i.ctx.close();

  // ---- ADMIN: página de correspondências
  const a = await login(browser, 'admin', '/home/user/repo/test-artifacts');
  console.log('\nadmin url após login:', a.page.url());
  const nav = await a.page.$$eval('button,a', els=>[...new Set(els.map(e=>(e.innerText||'').trim()).filter(t=>t&&t.length<40))].slice(0,40));
  console.log('nav admin:', JSON.stringify(nav));
  console.log('ecrã admin:', (await a.page.evaluate(()=>document.body.innerText.replace(/\s+/g,' '))).slice(0,400));
  await a.page.screenshot({ path:'test-artifacts/recon-admin.png', fullPage:true });
  await a.ctx.close(); await browser.close();
})();
