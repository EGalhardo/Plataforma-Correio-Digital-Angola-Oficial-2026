const { chromium } = require('playwright');
const { login, APP } = require('./scripts/test_interop_contas_reais_playwright.cjs');
(async () => {
  const browser = await chromium.launch();
  const c = await login(browser, 'cidadao', '/home/user/repo/test-artifacts');
  const p = c.page;
  await p.goto(`${APP}/#/ocorrencias`, { waitUntil:'networkidle' });
  await p.waitForTimeout(9000);
  await p.click('button:has-text("Criar Ocorrência")');
  await p.waitForTimeout(4000);
  await p.selectOption('select', { label: 'Iluminação pública' });
  await p.fill('input[placeholder*="Poste de iluminação"]', 'RECON-VALIDACAO-GPS');
  await p.fill('textarea', 'Descrição suficientemente longa para passar a validação.');
  await p.fill('input[placeholder*="INAPEM"]', 'AGT-LMM');
  await p.waitForTimeout(2000);
  console.log('modo de localização activo:', await p.evaluate(()=>{
    const b=[...document.querySelectorAll('button')].find(x=>/Automático \(GPS\)/.test(x.innerText));
    return b ? b.className.includes('primary')||b.className.includes('bg-') ? b.className.slice(0,80) : b.className.slice(0,80) : 'n/d';
  }));
  await p.click('button:has-text("Rever ocorrência")');
  await p.waitForTimeout(2500);
  const texto = await p.evaluate(()=>document.body.innerText.replace(/\s+/g,' '));
  console.log('contém erro visível?', /indique entre|Ponto de referência|Província:|Bairro/i.test(texto));
  console.log('excerto:', texto.slice(0, 400));
  const alertas = await p.$$eval('[role="alert"]', els=>els.map(e=>e.innerText.replace(/\s+/g,' ').slice(0,120)));
  console.log('role=alert:', JSON.stringify(alertas));
  await p.screenshot({ path:'test-artifacts/recon-validacao-gps.png', fullPage:true });
  await c.ctx.close(); await browser.close();
})();
