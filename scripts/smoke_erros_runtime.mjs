// Smoke test de ERROS à runtime (sem alterar nada): carrega o login, entra com
// a conta de teste e regista erros de consola/página/rede não tratados.
import { chromium } from 'playwright';

const url = 'http://localhost:3000/#/login';
const erros = [];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    const t = msg.text();
    // Filtra ruído benigno (redes de anúncios, favicon, DevTools)
    if (/favicon|net::ERR|Download the React DevTools/i.test(t)) return;
    erros.push(`[console.${msg.type()}] ${t.slice(0, 300)}`);
  }
});
page.on('pageerror', (err) => erros.push(`[pageerror] ${String(err).slice(0, 300)}`));
page.on('requestfailed', (req) => {
  const u = req.url();
  if (/favicon|\.woff|fonts\.|google-analytics/i.test(u)) return;
  erros.push(`[requestfailed] ${req.method()} ${u.slice(0, 160)} — ${req.failure()?.errorText}`);
});

try {
  // 1. Página de login
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(4000);
  console.log('1) Login carregado:', page.url());

  // 2. Login cidadão
  await page.locator('input').first().fill('002399714LA030');
  await page.fill('input[type="password"]', '123456789');
  await page.locator('button:has-text("ENTRAR NO PORTAL"), button:has-text("Entrar")').first().click();
  await page.waitForFunction(() => !location.hash.includes('login'), { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(8000);
  console.log('2) Após login:', page.url());

  // 3. Percorre páginas principais
  for (const [rotulo, hash] of [['Correio', '#/mail'], ['Home', '#/home'], ['Perfil', '#/profile']]) {
    await page.evaluate((h) => { location.hash = h; }, hash);
    await page.waitForTimeout(3500);
    console.log(`3) ${rotulo}:`, page.url());
  }

  await page.screenshot({ path: 'images/smoke_erros_final.png', fullPage: false });
} finally {
  await browser.close();
}

console.log('\n=== ERROS DETETADOS ===');
if (erros.length === 0) console.log('Nenhum erro de consola/página/rede.');
else erros.forEach((e) => console.log(' •', e));
process.exitCode = 0;
