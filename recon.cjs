const { chromium } = require('playwright');
const PORTAL = { cidadao: 'https://correio-digital-angola-oficial.vercel.app/#/login',
                 instituicao: 'https://correio-digital-angola-oficial.vercel.app/institucional#/login',
                 admin: 'https://correio-digital-angola-oficial.vercel.app/admin#/login' };
(async () => {
  const browser = await chromium.launch();
  for (const [nome, url] of Object.entries(PORTAL)) {
    const page = await browser.newPage();
    const erros = []; page.on('pageerror', e => erros.push(String(e).slice(0,100)));
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    const campos = await page.$$eval('input', els => els.map(e => ({ type: e.type, name: e.name, id: e.id, ph: e.placeholder, ac: e.autocomplete })));
    const botoes = await page.$$eval('button', els => els.map(e => (e.innerText||'').trim().slice(0,30)).filter(Boolean).slice(0,10));
    console.log('\n=== ' + nome + ' | ' + page.url());
    console.log('inputs:', JSON.stringify(campos));
    console.log('botões:', JSON.stringify(botoes));
    console.log('erros js:', erros.length ? erros : 'nenhum');
    await page.screenshot({ path: `test-artifacts/recon-${nome}.png`, fullPage: false });
    await page.close();
  }
  await browser.close();
})();
