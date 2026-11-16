const { chromium } = require('playwright');
const { login, APP } = require('./scripts/test_interop_contas_reais_playwright.cjs');
(async () => {
  const browser = await chromium.launch();
  const c = await login(browser, 'cidadao', '/home/user/repo/test-artifacts');
  const p = c.page;
  await p.goto(`${APP}/#/ocorrencias`, { waitUntil:'networkidle' });
  await p.waitForTimeout(8000);
  await p.click('button:has-text("Criar Ocorrência")');
  await p.waitForTimeout(3000);
  const campos = await p.$$eval('input,textarea,select', els=>els.map(e=>({t:e.tagName,ty:e.type,ph:e.placeholder,nm:e.name,vis:!!e.offsetParent})).filter(x=>x.vis));
  console.log('campos do formulário:', JSON.stringify(campos,null,0));
  const opts = await p.$$eval('select', els=>els.map(s=>[...s.options].map(o=>o.text).slice(0,8)));
  console.log('opções dos selects:', JSON.stringify(opts));
  const btns = await p.$$eval('button', els=>[...new Set(els.map(e=>(e.innerText||'').trim()).filter(Boolean))].slice(-12));
  console.log('botões:', JSON.stringify(btns));
  await p.screenshot({ path:'test-artifacts/recon-criar-ocorrencia.png', fullPage:true });
  await c.ctx.close(); await browser.close();
})();
