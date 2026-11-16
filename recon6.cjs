const { chromium } = require('playwright');
const { login, APP } = require('./scripts/test_interop_contas_reais_playwright.cjs');
(async () => {
  const browser = await chromium.launch();
  const i = await login(browser, 'instituicao', '/home/user/repo/test-artifacts');
  const p = i.page;
  await p.goto(`${APP}/institucional#/correspondencias`, { waitUntil:'networkidle' });
  await p.waitForTimeout(3000);
  const rows = await p.$$eval('tr', els=>els.map(e=>e.innerText.replace(/\s+/g,'|').slice(0,80)).slice(0,8));
  console.log('linhas <tr>:', JSON.stringify(rows,null,0));
  // procurar o item INTEROP e clicar no elemento clicável mais próximo
  const alvo = await p.$('text=/INTEROP/i');
  console.log('encontrou texto INTEROP?', !!alvo);
  if (alvo) {
    const box = await alvo.boundingBox(); console.log('box:', JSON.stringify(box));
    await alvo.click();
    await p.waitForTimeout(4000);
    const btns = await p.$$eval('button', els=>[...new Set(els.map(e=>(e.innerText||'').trim()).filter(Boolean))].slice(0,35));
    console.log('botões após abrir:', JSON.stringify(btns));
    console.log('ecrã:', (await p.evaluate(()=>document.body.innerText.replace(/\s+/g,' '))).slice(0,500));
    await p.screenshot({ path:'test-artifacts/recon-detalhe-inst2.png', fullPage:true });
  }
  await i.ctx.close(); await browser.close();
})();
