const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
async function entrar(b,{base,u,s,label}){
 const ctx=await b.newContext({viewport:{width:1400,height:900},locale:'pt-PT'});
 const p=await ctx.newPage();
 p.on('console',m=>{const t=m.text();if(/erro|error|falha|Supabase send|insert/i.test(t)&&!/shimmer/.test(t))console.log(`  [${label}] ${t.slice(0,160)}`);});
 await p.goto(`${APP}${base}/#/login`,{waitUntil:'networkidle'});await E(1300);
 await p.fill('input[name="cda-utilizador"]',u);await p.fill('input[name="cda-senha"]',s);
 await p.click('button:has-text("ENTRAR NO PORTAL")');await E(5500);
 return {ctx,p};
}
(async()=>{
 const b=await chromium.launch();
 const cid=await entrar(b,{base:'',u:'002399714LA030',s:'123456789',label:'CID'});
 await cid.p.locator('button:has-text("Correio")').first().click().catch(()=>{});await E(2500);
 await cid.p.locator('button:has-text("Nova Mensagem")').first().click().catch(()=>{});await E(2000);
 // destinatário
 const dest=cid.p.locator('input[placeholder*="Institucional" i]').first();
 await dest.click(); await dest.type('AGT-LMM-01',{delay:60}); await E(2500);
 await cid.p.screenshot({path:'test-artifacts/oi-dest.png'});
 console.log('  destinatário reconhecido:',/entrega garantida/i.test(await cid.p.evaluate(()=>document.body.innerText)));
 // título + corpo
 const tit=cid.p.locator('input[placeholder*="tema" i], input[placeholder*="Qua" i]').first();
 await tit.click(); await tit.type('OI-TESTE-PLAYWRIGHT');
 const corpo=cid.p.locator('textarea, [contenteditable="true"], [role="textbox"]').first();
 await corpo.click(); await corpo.type('OI');
 await E(800);
 await cid.p.screenshot({path:'test-artifacts/oi-preenchido.png'});
 await cid.p.screenshot({path:'test-artifacts/oi-antes-enviar.png'});
 await cid.p.locator('button:has-text("Enviar Mensagem")').first().click()
 await E(1500);
 // modalidade: Mensagem Normal
 await cid.p.locator('text=Mensagem Normal').first().click().catch(()=>{});
 await E(600);
 await cid.p.locator('button:has-text("OK")').first().click().catch(()=>{})
 await E(2500);
 await cid.p.locator('button:has-text("Enviar mesmo assim")').first().click().catch(()=>{});
 await E(900);
 await cid.p.locator('button:has-text("Enviar Mensagem"), button:has-text("Enviar mesmo assim")').first().click().catch(()=>{});
 await E(1500);
 const final=cid.p.locator('button:has-text("ENVIAR CORRESPONDÊNCIA")').first();
 if(await final.count()){ console.log('  → rever marks: ENVIAR CORRESPONDÊNCIA'); await final.click().catch(()=>{}); }
 await E(5000);
 await cid.p.screenshot({path:'test-artifacts/oi-enviado.png'});
 console.log('  ecrã após enviar:',(await cid.p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ').slice(0,260));
 await b.close();
})();
