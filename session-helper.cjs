// Sessões persistentes das 3 contas reais (storageState), para não repetir login.
const { chromium } = require('playwright');
const CONTAS = {
  cidadao:     { url:'https://correio-digital-angola-oficial.vercel.app/#/login', user:'002399714LA030', pass:'123456789' },
  instituicao: { url:'https://correio-digital-angola-oficial.vercel.app/institucional#/login', user:'AGT-LMM-01', pass:'123456789' },
  admin:       { url:'https://correio-digital-angola-oficial.vercel.app/admin#/login', user:'ADMIN-0001', pass:'987654321' },
};
async function sessao(browser, nome) {
  const c = CONTAS[nome];
  const ctx = await browser.newContext({ viewport:{width:1440,height:900} });
  const page = await ctx.newPage();
  await page.goto(c.url, { waitUntil:'networkidle', timeout:60000 });
  await page.waitForTimeout(1200);
  await page.fill('input[name="cda-utilizador"]', c.user);
  await page.fill('input[name="cda-senha"]', c.pass);
  await page.click('button:has-text("ENTRAR NO PORTAL")');
  await page.waitForTimeout(5000);
  const ok = !/login/i.test(page.url());
  return { ctx, page, ok, url: page.url() };
}
module.exports = { sessao, CONTAS };
