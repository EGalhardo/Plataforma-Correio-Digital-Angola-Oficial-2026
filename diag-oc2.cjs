const { chromium } = require('playwright');
const { login, APP } = require('./scripts/test_interop_contas_reais_playwright.cjs');
(async () => {
  const browser = await chromium.launch();
  const c = await login(browser, 'cidadao', '/home/user/repo/test-artifacts');
  const p = c.page;
  await p.goto(`${APP}/#/ocorrencias`, { waitUntil:'networkidle' });
  await p.waitForTimeout(9000);
  await p.click('button:has-text("Criar Ocorrência")');
  await p.waitForTimeout(3000);
  await p.locator('button:has-text("Manual")').first().click();
  await p.waitForTimeout(1500);
  const sel = p.locator('form select');
  await sel.nth(0).selectOption({ label: 'Iluminação pública' });
  await p.waitForTimeout(500);
  // título e descrição: os inputs de texto no modo manual
  const todosInputs = await p.locator('form input').evaluateAll(els=>els.map(e=>({ph:e.placeholder,type:e.type,vis:!!e.offsetParent})));
  console.log('inputs no modo manual:', JSON.stringify(todosInputs));
  await p.fill('input[placeholder*="Poste de iluminação"]', 'DIAG-OC-MANUAL-1');
  await p.fill('textarea', 'Descrição longa o suficiente para a validação automática.');
  await p.waitForTimeout(500);
  const depois = await p.locator('form input').evaluateAll(els=>els.map(e=>({ph:e.placeholder,type:e.type,val:(e.value||'').slice(0,20),vis:!!e.offsetParent})));
  console.log('inputs depois de preencher:', JSON.stringify(depois));
  await p.screenshot({ path:'test-artifacts/diag-oc2-a.png', fullPage:true });
  await c.ctx.close(); await browser.close();
})();
