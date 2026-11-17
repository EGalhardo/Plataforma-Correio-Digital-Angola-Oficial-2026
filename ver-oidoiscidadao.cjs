const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
async function entrar(b,{base,u,s}){
 const ctx=await b.newContext({viewport:{width:1400,height:900},locale:'pt-PT'});
 const p=await ctx.newPage();
 await p.goto(`${APP}${base}/#/login`,{waitUntil:'networkidle'});await E(1300);
 await p.fill('input[name="cda-utilizador"]',u);await p.fill('input[name="cda-senha"]',s);
 await p.click('button:has-text("ENTRAR NO PORTAL")');await E(6000);
 return p;
}
(async()=>{
 const b=await chromium.launch();
 const cid=await entrar(b,{base:'',u:'002399714LA030',s:'123456789'});
 console.log('PAINEL do cidadão:',(await cid.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ').slice(0,700));
 await cid.locator('button:has-text("Correio")').first().click().catch(()=>{});await E(3500);
 const correio=(await cid.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('\nCORREIO — procurar OI-TESTE:',/OI-TESTE/i.test(correio)?'APARECE':'NÃO APARECE');
 console.log('CORREIO (texto):',correio.slice(0,900));
 await cid.screenshot({path:'test-artifacts/oidois-cid-correio.png'});
 // aba enviadas
 await cid.locator('text=ENVIADAS').first().click().catch(()=>{});await E(2500);
 const env=(await cid.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('\nENVIADAS — OI-TESTE:',/OI-TESTE/i.test(env)?'APARECE':'NÃO APARECE');
 await cid.screenshot({path:'test-artifacts/oidois-cid-enviadas.png'});
 await b.close();
})();
