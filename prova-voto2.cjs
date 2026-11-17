const { chromium }=require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1400,height:1600},locale:'pt-PT'});
 const p=await ctx.newPage();
 await p.goto(`${APP}/#/login`,{waitUntil:'networkidle'}); await E(1400);
 await p.fill('input[name="cda-utilizador"]','002399714LA030'); await p.fill('input[name="cda-senha"]','123456789');
 await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(7000);
 await p.locator('button:has-text("Correio")').first().click(); await E(3500);
 await p.locator('tr:has-text("PROVA CICLO 100131")').first().locator('button').first().click(); await E(4500);
 for(let i=0;i<6;i++){ await p.mouse.wheel(0,900); await E(700); }
 const tela=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('cartão com opções?', /Concordo/.test(tela)?'✓ sim':'✗ não');
 console.log('excerto final:',tela.slice(-400));
 await p.screenshot({path:'test-artifacts/sond-voto-3.png',fullPage:true});
 await b.close();
})();
