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
 await p.goto(`${APP}/institucional/#/login`,{waitUntil:'networkidle'});await E(1300);
 await p.fill('input[name="cda-utilizador"]','AGT-LMM-01');await p.fill('input[name="cda-senha"]','123456789');
 await p.click('button:has-text("ENTRAR NO PORTAL")');await E(6000);
 await p.locator('button:has-text("Correio")').first().click();await E(2500);
 await p.locator('button:has-text("Nova Mensagem")').first().click();await E(2500);
 const dest=p.locator('input[placeholder*="BI" i]').first();
 await dest.click(); await dest.type('AGT-LMM-01',{delay:50}); await E(1800);
 const tit=p.locator('input[placeholder*="tema" i]').first();
 await tit.click(); await tit.type('AUTO-ENVIO-BLOQUEADO');
 const corpo=p.locator('textarea').first();
 await corpo.click(); await corpo.type('nao deve enviar');
 // pipeline completa
 await p.locator('button:has-text("Enviar Mensagem Oficial")').first().click();await E(1800);
 // escolher a modalidade: clicar no cartão e só depois em OK
 await p.locator('[data-testid="popup-enviar-mensagem"] button').first().click({force:true});await E(2500);
 console.log('   modal fechou?', !(await p.locator('text=SELECIONE A MODALIDADE').count()));
 for(const sel of ['button:has-text("Enviar mesmo assim")','button:has-text("Enviar Mensagem Oficial")','button:has-text("ENVIAR CORRESPONDÊNCIA")']){
   const l=p.locator(sel).first(); if(await l.count()) { await l.click().catch(()=>{}); await E(1500); }
 }

 // observar o aviso durante 8 s
 let aviso=false, texto='';
 for(let i=0;i<16;i++){
   texto=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
   if(/própria conta remetente/i.test(texto)){aviso=true;await p.screenshot({path:'test-artifacts/guarda-aviso.png'});break;}
   await E(500);
 }
 console.log('aviso «destinatário é a própria conta»:',aviso?'✓ APARECEU':'✗ não apareceu');
 console.log('frase no ecrã:',texto.match(/[^.]*própria conta remetente[^.]*\./i)?.[0]||'(nenhuma)');
 await p.screenshot({path:'test-artifacts/guarda-final.png'});
 const n=(await db('messages?select=id&subject=eq.AUTO-ENVIO-BLOQUEADO')).length;
 console.log('gravado na base:',n,'→',n===0?'✓ recusado, nada criado':'✗ criou registo');
 // e a mensagem continua no compositor para o utilizador corrigir?
 console.log('rascunho preservado:',/AUTO-ENVIO-BLOQUEADO/.test(texto)?'✓ SIM':'✗ perdeu-se');
 await b.close();
})();
