const { chromium } = require('playwright');
const { sessao } = require('./session-helper.cjs');
(async () => {
  const browser = await chromium.launch();
  const s = await sessao(browser, 'cidadao');
  console.log('login:', s.ok, s.url);
  await s.page.click('button:has-text("Correio"), a:has-text("Correio")').catch(()=>{});
  await s.page.waitForTimeout(3000);
  console.log('url correio:', s.page.url());
  const botoes = await s.page.$$eval('button', els=>[...new Set(els.map(e=>(e.innerText||'').trim()).filter(Boolean))].slice(0,40));
  console.log('botões:', JSON.stringify(botoes));
  const inputs = await s.page.$$eval('input,textarea', els=>els.map(e=>({tag:e.tagName,type:e.type,ph:e.placeholder,nm:e.name})).slice(0,20));
  console.log('campos:', JSON.stringify(inputs));
  await s.page.screenshot({ path:'test-artifacts/recon-correio-cidadao.png', fullPage:true });
  await browser.close();
})();
