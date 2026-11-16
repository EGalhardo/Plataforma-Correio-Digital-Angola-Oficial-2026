const { chromium } = require('playwright');
const { login, APP } = require('./scripts/test_interop_contas_reais_playwright.cjs');
(async () => {
  const browser = await chromium.launch();
  const c = await login(browser, 'cidadao', '/home/user/repo/test-artifacts');
  const p = c.page;
  await p.click('text=OCORRÊNCIAS LOCAIS').catch(async()=>{ await p.click('button:has-text("Painel")'); });
  await p.waitForTimeout(9000);
  console.log('url:', p.url());
  const btns = await p.$$eval('button', els=>[...new Set(els.map(e=>(e.innerText||'').trim()).filter(Boolean))].slice(0,25));
  console.log('botões:', JSON.stringify(btns));
  const campos = await p.$$eval('input,textarea,select', els=>els.map(e=>({t:e.tagName,ph:e.placeholder,vis:!!e.offsetParent})).filter(x=>x.vis).slice(0,15));
  console.log('campos:', JSON.stringify(campos));
  console.log('ecrã:', (await p.evaluate(()=>document.body.innerText.replace(/\s+/g,' '))).slice(0,500));
  await p.screenshot({ path:'test-artifacts/recon-ocorrencias-cidadao.png', fullPage:true });
  await c.ctx.close(); await browser.close();
})();
