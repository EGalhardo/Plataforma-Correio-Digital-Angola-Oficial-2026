const { chromium } = require('playwright');
const CONTAS = {
  cidadao:     { url:'https://correio-digital-angola-oficial.vercel.app/#/login', user:'002399714LA030', pass:'123456789', tab:'Cidadão' },
  instituicao: { url:'https://correio-digital-angola-oficial.vercel.app/institucional#/login', user:'AGT-LMM-01', pass:'123456789', tab:'Instituição' },
  admin:       { url:'https://correio-digital-angola-oficial.vercel.app/admin#/login', user:'ADMIN-0001', pass:'987654321.', tab:'Admin' },
};
const entrar = async (page, c) => {
  await page.goto(c.url, { waitUntil:'networkidle', timeout:60000 });
  await page.waitForTimeout(1500);
  await page.fill('input[name="cda-utilizador"]', c.user);
  await page.fill('input[name="cda-senha"]', c.pass);
  await page.click('button:has-text("ENTRAR NO PORTAL")');
  await page.waitForTimeout(6000);
  return page.url();
};
(async () => {
  const browser = await chromium.launch();
  for (const [nome, c] of Object.entries(CONTAS)) {
    const ctx = await browser.newContext({ viewport:{width:1440,height:900} });
    const page = await ctx.newPage();
    const erros=[]; page.on('pageerror',e=>erros.push(String(e).slice(0,120)));
    const depois = await entrar(page, c);
    const logado = /login/i.test(depois) ? 'NÃO (continua no login)' : 'SIM';
    console.log(`\n===== ${nome} | login: ${logado} | url: ${depois}`);
    const titulos = await page.$$eval('h1,h2,h3', els=>[...new Set(els.map(e=>e.innerText.trim()).filter(Boolean))].slice(0,12));
    console.log('títulos:', JSON.stringify(titulos));
    const nav = await page.$$eval('button,a', els=>[...new Set(els.map(e=>(e.innerText||'').trim()).filter(t=>t && t.length<40))].slice(0,45));
    console.log('navegação:', JSON.stringify(nav));
    const bodyM = await page.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,600));
    console.log('ecrã:', bodyM);
    if (erros.length) console.log('erros js:', erros.slice(0,3));
    await page.screenshot({ path:`test-artifacts/pos-login-${nome}.png`, fullPage:false });
    const store = await page.evaluate(()=>Object.keys(localStorage).filter(k=>/sessao|auth|bi|role/i.test(k)));
    console.log('localStorage chaves:', JSON.stringify(store));
    await ctx.close();
  }
  await browser.close();
})();
