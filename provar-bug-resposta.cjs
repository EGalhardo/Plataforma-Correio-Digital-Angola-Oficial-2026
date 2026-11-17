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
 await p.locator('button:has-text("Correio")').first().click();await E(3000);
 await p.locator('text=ENVIADAS').first().click();await E(3000);
 await p.screenshot({path:'test-artifacts/bug-enviadas.png'});
 const txt=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('ENVIADAS da instituição (amostra):',txt.slice(200,560));
 // abrir a primeira mensagem enviada
 // abrir a mensagem «OI» (a original, enviada pela própria instituição para si mesma)
 const linha=p.locator('tr:has-text("RE: OI-956966")').first();
 await linha.locator('button').first().click().catch(()=>{});await E(2800);
 console.log('  detalhe aberto:',(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ').slice(0,180));
 await p.locator('button:has-text("Responder")').first().click().catch(()=>{});await E(2500);
 const dest=await p.locator('input[placeholder*="BI" i], input[placeholder*="Institucional" i]').first().inputValue().catch(()=>'(sem valor)');
 console.log('DESTINATÁRIO preenchido ao responder a uma ENVIADA:',JSON.stringify(dest));
 await p.screenshot({path:'test-artifacts/bug-responder-enviada.png'});
 await b.close();
})();
