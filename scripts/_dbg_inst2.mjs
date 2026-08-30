import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
page.on('response', async (r) => {
  if (r.url().includes('/api/dados')) console.log('[resp]', r.status(), r.request().method(), (await r.text().catch(() => '')).slice(0, 200));
});
page.on('console', (m) => { if (m.type() === 'error') console.log('[console-err]', m.text().slice(0, 200)); });

// 1) login prévio do cidadão de teste (replica o estado do e2e)
await page.goto(`${BASE}?d=${Date.now()}#/login`, { waitUntil: 'domcontentloaded' });
await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 30000 });
await page.locator('input[type="text"], input:not([type])').first().fill('008471205LA045');
await page.locator('input[type="password"]').first().fill('TesteUx2026!');
await page.getByRole('button', { name: /entrar/i }).first().click().catch(() => {});
await page.waitForTimeout(8000);
console.log('[login feito] url=', page.url());

// 2) registo de instituição no MESMO contexto
const page2 = await ctx.newPage();
await page2.goto(`${BASE}/institucional?d=${Date.now()}#/registar`, { waitUntil: 'domcontentloaded' });
await page2.locator('input[placeholder*="Serviço de Migração"]').waitFor({ state: 'visible', timeout: 25000 });
await page2.locator('input[placeholder*="Serviço de Migração"]').fill('Dbg Dois Bg');
await page2.locator('input[placeholder*="Rua dos Correios"]').fill('Rua Debug 2, Luanda');
await page2.locator('input[placeholder*="geral@sme"]').fill('dbg2.inst@cda-test.ao');
await page2.locator('input[placeholder*="+244 923"]').fill('+244 923 555 002');
await page2.locator('input[placeholder*="Dr. António"]').fill('Resp Debug Dois');
await page2.locator('input[placeholder*="Director Geral"]').fill('Director');
await page2.locator('input[placeholder*="director@sme"]').fill('dbg2.resp@cda-test.ao');
const pw = page2.locator('input[type="password"]');
await pw.nth(0).fill('TesteUx2026!');
await pw.nth(1).fill('TesteUx2026!');
await page2.getByRole('button', { name: /finalizar registo/i }).click();
await page2.locator('text=/Pedido de Adesão Registado/i').first().waitFor({ state: 'visible', timeout: 30000 });
console.log('[ok] conclusão visível');
for (let i = 0; i < 8; i += 1) {
  await page2.waitForTimeout(3000);
  const chip = await page2.evaluate(() => {
    const t = document.body.innerText;
    if (/Solicitação entregue/i.test(t)) return 'ok';
    if (/Tentar novamente/i.test(t)) return 'falhou';
    if (/A entregar/i.test(t)) return 'a_enviar';
    return '?';
  });
  console.log(`[t+${(i + 1) * 3}s] sync=${chip}`);
  if (chip !== 'a_enviar' && chip !== '?') break;
}
await browser.close();
