const { chromium } = require('playwright');
const { login, APP } = require('./scripts/test_interop_contas_reais_playwright.cjs');
(async () => {
  const browser = await chromium.launch();
  for (const [nome, raiz] of [['cidadao',''],['instituicao','/institucional']]) {
    const s = await login(browser, nome, '/home/user/repo/test-artifacts');
    await s.page.goto(`${APP}${raiz}#/correspondencias`, { waitUntil:'networkidle' });
    await s.page.waitForTimeout(6000);
    const abas = await s.page.$$eval('button', els => els.map(e => (e.innerText||'').replace(/\s+/g,' ').trim()).filter(t => /^(TODAS|LIDAS|NÃO LIDAS|ENVIADAS|ELIMINADAS)\s*\d+/i.test(t)));
    const porLer = (await s.page.evaluate(()=>document.body.innerText)).match(/(\d+)\s*MENSAGENS POR LER/i);
    console.log(`\n${nome}:`);
    console.log('  contadores das abas:', JSON.stringify(abas));
    console.log('  «mensagens por ler»:', porLer ? porLer[1] : 'n/d');
    await s.ctx.close();
  }
  await browser.close();
})();
