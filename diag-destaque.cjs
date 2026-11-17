const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1400,height:1250},locale:'pt-PT'});
  const p=await ctx.newPage();
  p.on('console',m=>{const t=m.text(); if(/Sondagens|foco|destaque|erro/i.test(t)) console.log('  [browser]',t.slice(0,180));});
  await p.goto(`${APP}/#/institucional`,{waitUntil:'networkidle'}); await E(1400);
  await p.fill('input[name="cda-utilizador"]','AGT-LMM-01'); await p.fill('input[name="cda-senha"]','123456789');
  await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(9000);
  // abrir Inquéritos directamente para ver o estado base
  await p.locator('button:has-text("INQUÉRITOS"), button:has-text("Inquéritos")').first().click().catch(()=>{}); await E(6000);
  const t1=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
  console.log('página inquéritos?', /Inquéritos/i.test(t1));
  console.log('pastas normais:', await p.locator('[data-testid="sondagem-pasta"]').count());
  console.log('pastas IA:', await p.locator('[data-testid="inquerito-ia-pasta"]').count());
  console.log('destaques:', await p.locator('[data-destaque="sim"]').count());
  console.log('excerto:', t1.slice(0,400));
  await p.screenshot({path:'test-artifacts/diag-destaque-base.png',fullPage:true});
  await b.close();
})();
