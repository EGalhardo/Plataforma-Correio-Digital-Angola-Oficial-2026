const { chromium } = require('playwright');
const { login, APP } = require('./scripts/test_interop_contas_reais_playwright.cjs');
(async () => {
  const browser = await chromium.launch();
  const s = await login(browser, 'cidadao', '/home/user/repo/test-artifacts');
  const p = s.page;
  const pedidos = [];
  p.on('response', async (r) => {
    const u = r.url();
    if (!/api\/|\/rest\/v1\/|supabase/.test(u)) return;
    let corpo = '';
    try { corpo = (await r.text()).slice(0, 220); } catch {}
    pedidos.push({ m: r.request().method(), s: r.status(), u: u.replace(APP, '').slice(0, 90), corpo });
  });
  await p.goto(`${APP}/#/correspondencias`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);
  await p.click('button:has-text("Nova Mensagem")');
  await p.waitForTimeout(2500);
  await p.fill('input[placeholder*="Código Institucional"]', 'AGT-LMM-01');
  await p.waitForTimeout(1200);
  await p.fill('input[placeholder*="tema da sua mensagem"]', 'DIAG-ENVIO-91');
  await p.fill('textarea', 'Diagnóstico de envio.');
  await p.click('button:has-text("Enviar Mensagem")');
  await p.waitForTimeout(2000);
  const mn = await p.$('text=Mensagem Normal');
  if (mn) { await mn.click(); await p.waitForTimeout(600); const ok = await p.$('button:has-text("OK")'); if (ok) await ok.click(); }
  await p.waitForTimeout(7000);
  console.log('--- pedidos de rede durante o envio ---');
  pedidos.filter(x=>!/GET/.test(x.m) || /api\//.test(x.u)).forEach(x=>console.log(`${x.m} ${x.s} ${x.u}\n     ${x.corpo}`));
  const ls = await p.evaluate(()=>Object.keys(localStorage).filter(k=>/correio|sent|inbox|msg/i.test(k)));
  console.log('--- localStorage ---'); console.log(JSON.stringify(ls));
  console.log('--- ecrã (200 primeiros) ---'); console.log((await p.evaluate(()=>document.body.innerText.replace(/\s+/g,' '))).slice(0,300));
  await p.screenshot({ path:'test-artifacts/diag-envio.png', fullPage:true });
  await s.ctx.close(); await browser.close();
})();
