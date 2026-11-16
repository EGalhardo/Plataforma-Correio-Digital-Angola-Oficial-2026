const { chromium } = require('playwright');
const { login, APP } = require('./scripts/test_interop_contas_reais_playwright.cjs');
const passo = (m) => console.log('• ' + m);
(async () => {
  const browser = await chromium.launch();
  const c = await login(browser, 'cidadao', '/home/user/repo/test-artifacts');
  const p = c.page;
  await p.goto(`${APP}/#/ocorrencias`, { waitUntil:'networkidle' });
  await p.waitForTimeout(9000);
  await p.click('button:has-text("Criar Ocorrência")');
  await p.waitForTimeout(3000);
  passo('form aberto');
  const man = p.locator('button:has-text("Manual")').first();
  console.log('  botão Manual existe?', await man.count(), 'habilitado?', await man.isEnabled().catch(()=>'?'));
  await man.click({ timeout: 8000 }).catch(e=>passo('ERRO Manual: '+e.message.slice(0,80)));
  await p.waitForTimeout(1500);
  const sel = p.locator('form select');
  console.log('  selects no form:', await sel.count());
  for (let i=0;i<await sel.count();i++){
    const opts = await sel.nth(i).locator('option').allInnerTexts();
    console.log(`   select[${i}] ${opts.length} opções:`, JSON.stringify(opts.slice(0,4)));
  }
  const inputs = p.locator('form input[type="text"]');
  for (let i=0;i<await inputs.count();i++) console.log(`   input[${i}] ph=`, await inputs.nth(i).getAttribute('placeholder'));
  await c.ctx.close(); await browser.close();
})();
