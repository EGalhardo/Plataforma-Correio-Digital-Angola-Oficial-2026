const { chromium } = require('playwright');
const { sessao } = require('./session-helper.cjs');
(async () => {
  const browser = await chromium.launch();
  const s = await sessao(browser, 'cidadao');
  const p = s.page;
  await p.goto('https://correio-digital-angola-oficial.vercel.app/#/correspondencias', { waitUntil:'networkidle' });
  await p.waitForTimeout(2000);
  await p.click('button:has-text("Nova Mensagem")');
  await p.waitForTimeout(2500);
  const campos = await p.$$eval('input,textarea,select', els=>els.map(e=>({tag:e.tagName,type:e.type,ph:e.placeholder,nm:e.name,vis:!!(e.offsetParent)})));
  console.log('campos do compositor:', JSON.stringify(campos,null,0));
  const botoes = await p.$$eval('button', els=>[...new Set(els.map(e=>(e.innerText||'').trim()).filter(Boolean))].slice(0,30));
  console.log('botões:', JSON.stringify(botoes));
  await p.screenshot({ path:'test-artifacts/compositor-cidadao.png', fullPage:true });
  await browser.close();
})();
