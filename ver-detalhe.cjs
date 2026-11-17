const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1400,height:950},locale:'pt-PT'});
 const p=await ctx.newPage();
 await p.goto(`${APP}/institucional/#/login`,{waitUntil:'networkidle'});await E(1300);
 await p.fill('input[name="cda-utilizador"]','AGT-LMM-01');await p.fill('input[name="cda-senha"]','123456789');
 await p.click('button:has-text("ENTRAR NO PORTAL")');await E(6000);
 await p.locator('button:has-text("Correio")').first().click();await E(3500);
 // abrir pelo ícone do olho da primeira linha "cidadão"
 const linha=p.locator('tr:has-text("CIDADÃO: 002399714LA030")').first();
 await linha.locator('button[title="Ver"], button[title="Visualizar"], button[aria-label*="Ver" i]').first().click().catch(async()=>{
   await linha.locator('button').first().click().catch(()=>{});
 });
 await E(3000);
 const btns=await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\s+/g,' ').trim()).filter(t=>t&&t.length<40));
 console.log('botões na página de detalhe:',JSON.stringify([...new Set(btns)].slice(0,20)));
 await p.screenshot({path:'test-artifacts/detalhe-inst-1.png',fullPage:false});
 console.log('\ntexto:',(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ').slice(0,600));
 await b.close();
})();
