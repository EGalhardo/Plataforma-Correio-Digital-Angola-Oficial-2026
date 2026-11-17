const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1400,height:900},locale:'pt-PT'});
 const p=await ctx.newPage();
 p.on('console',m=>{const t=m.text();if(/erro|error/i.test(t)&&!/shimmer|Realtime/i.test(t))console.log('  LOG:',t.slice(0,140));});
 await p.goto(`${APP}/institucional/#/login`,{waitUntil:'networkidle'});await E(1300);
 await p.fill('input[name="cda-utilizador"]','AGT-LMM-01');await p.fill('input[name="cda-senha"]','123456789');
 await p.click('button:has-text("ENTRAR NO PORTAL")');await E(6000);
 await p.locator('button:has-text("Correio")').first().click().catch(()=>{});await E(3500);
 const txt=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('AG praça — OI-TESTE na caixa:',/OI-TESTE/i.test(txt)?'APARECE':'não aparece');
 console.log('texto:',txt.slice(0,700));
 await p.screenshot({path:'test-artifacts/resp-1-inbox-agt.png'});
 // abrir a mensagem OI-TESTE do cidadão
 await p.locator('text=OI-TESTE-PLAYWRIGHT').first().click().catch(e=>console.log('  clique msg falhou:',e.message.slice(0,50)));
 await E(3000);
 await p.screenshot({path:'test-artifacts/resp-2-msg-aberta.png'});
 console.log('\napós abrir a mensagem:',(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ').slice(0,520));
 for(const sel of ['button:has-text("Responder")','button:has-text("RESPONDER")','button:has-text("Reencaminhar")']){
   const l=p.locator(sel).first();
   if(await l.count()){console.log('  botão:',sel);}
 }
 await b.close();
})();
