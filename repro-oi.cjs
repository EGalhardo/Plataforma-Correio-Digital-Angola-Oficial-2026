const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
async function entrar(b,{base,u,s,label}){
 const ctx=await b.newContext({viewport:{width:1400,height:900},locale:'pt-PT'});
 const p=await ctx.newPage();
 p.on('console',m=>{const t=m.text();if(/erro|error|Supabase|messages/i.test(t)&&!/shimmer/.test(t))console.log(`  [${label}] ${t.slice(0,150)}`);});
 await p.goto(`${APP}${base}/#/login`,{waitUntil:'networkidle'});await E(1300);
 await p.fill('input[name="cda-utilizador"]',u);await p.fill('input[name="cda-senha"]',s);
 await p.click('button:has-text("ENTRAR NO PORTAL")');await E(5500);
 return {ctx,p};
}
(async()=>{
 const b=await chromium.launch();
 console.log('→ cidadão entra');
 const cid=await entrar(b,{base:'',u:'002399714LA030',s:'123456789',label:'CID'});
 await cid.p.locator('button:has-text("Correio")').first().click().catch(()=>{});await E(3000);
 const txt=(await cid.p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('  caixa do cidadão (início):',txt.slice(0,300));
 await cid.p.screenshot({path:'test-artifacts/oi-1-correio-cid.png'});
 // abrir compositor
 for(const sel of ['button:has-text("Nova Mensagem")','button:has-text("NOVA MENSAGEM")','button:has-text("Escrever")','button:has-text("Compor")']){
   const l=cid.p.locator(sel).first();
   if(await l.count()){console.log('  compositor via:',sel);await l.click().catch(()=>{});break;}
 }
 await E(2000);
 await cid.p.screenshot({path:'test-artifacts/oi-2-compositor.png'});
 console.log('  ecrã após abrir compositor:',(await cid.p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ').slice(0,400));
 await b.close();
})();
