const { chromium } = require('playwright');
const fs=require('fs');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
const env={};for(const l of fs.readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const H={apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
const db=async q=>(await fetch(env.SUPABASE_URL+'/rest/v1/'+q,{headers:H})).json();
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1400,height:950},locale:'pt-PT'});
 const p=await ctx.newPage();
 await p.goto(`${APP}/#/login`,{waitUntil:'networkidle'});await E(1300);
 await p.fill('input[name="cda-utilizador"]','002399714LA030');await p.fill('input[name="cda-senha"]','123456789');
 await p.click('button:has-text("ENTRAR NO PORTAL")');await E(6000);
 await p.locator('button:has-text("Correio")').first().click();await E(2500);
 await p.locator('button:has-text("Nova Mensagem")').first().click();await E(2500);
 const dest=p.locator('input[placeholder*="Institucional" i]').first();
 await dest.click(); await dest.type('002399714LA030',{delay:40}); await E(2000);  // o próprio cidadão
 await p.locator('input[placeholder*="tema" i]').first().click();
 await p.locator('input[placeholder*="tema" i]').first().type('AUTO-CIDADAO');
 const corpo=p.locator('textarea, [contenteditable="true"]').first();
 await corpo.click(); await corpo.type('nao deve enviar');
 await p.locator('button:has-text("Enviar Mensagem")').first().click(); await E(2000);
 // modalidade
 if(await p.locator('[data-testid="popup-enviar-mensagem"] button').count()) { await p.locator('[data-testid="popup-enviar-mensagem"] button').first().click(); await E(2500); }
 for(const sel of ['button:has-text("Enviar mesmo assim")','button:has-text("Enviar Mensagem")','button:has-text("ENVIAR CORRESPONDÊNCIA")']){
   const l=p.locator(sel).first(); if(await l.count()){ await l.click().catch(()=>{}); await E(1800); }
 }
 let aviso=false,texto='';
 for(let i=0;i<20;i++){
   texto=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
   if(/própria conta remetente/i.test(texto)){aviso=true;await p.screenshot({path:'test-artifacts/guarda-cid-aviso.png'});break;}
   await E(500);
 }
 console.log('aviso ao cidadão:',aviso?'✓ APARECEU':'✗ não apareceu');
 if(aviso) console.log('  frase:',texto.match(/[^.]*própria conta remetente[^.]*\./i)?.[0]);
 const n=(await db('messages?select=id&subject=eq.AUTO-CIDADAO')).length;
 console.log('gravado na base:',n,n===0?'✓ recusado':'✗ criou');
 await p.screenshot({path:'test-artifacts/guarda-cid-final.png'});
 await b.close();
})();
