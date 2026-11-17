const { chromium } = require('playwright');
const fs=require('fs');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
const ASSUNTO='DEPURA-'+Date.now().toString().slice(-5);
const env={};for(const l of fs.readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const H={apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
async function entrar(b,{base,u,s}){
 const ctx=await b.newContext({viewport:{width:1400,height:950},locale:'pt-PT'});
 const p=await ctx.newPage();
 p.on('pageerror',e=>console.log('  ERRO JS:',String(e.message).slice(0,200)));
 p.on('console',m=>{const t=m.text();if(m.type()==='error'||/Supabase|erro|error/i.test(t)){if(!/shimmer|Realtime|video_session/i.test(t))console.log('  LOG:',t.slice(0,200));}});
 await p.goto(`${APP}${base}/#/login`,{waitUntil:'networkidle'});await E(1300);
 await p.fill('input[name="cda-utilizador"]',u);await p.fill('input[name="cda-senha"]',s);
 await p.click('button:has-text("ENTRAR NO PORTAL")');await E(6000);
 return {ctx,p};
}
(async()=>{
 const b=await chromium.launch();
 // cidadão envia primeiro
 const cid=await entrar(b,{base:'',u:'002399714LA030',s:'123456789'});
 await cid.p.locator('button:has-text("Correio")').first().click();await E(2500);
 await cid.p.locator('button:has-text("Nova Mensagem")').first().click();await E(2500);
 const d=cid.p.locator('input[placeholder*="Institucional" i]').first();
 await d.click(); await d.type('AGT-LMM-01',{delay:40}); await E(1800);
 await cid.p.locator('input[placeholder*="tema" i]').first().click();
 await cid.p.locator('input[placeholder*="tema" i]').first().type(ASSUNTO);
 const c=cid.p.locator('textarea, [contenteditable="true"]').first();
 await c.click(); await c.type('OI');
 await cid.p.locator('button:has-text("Enviar Mensagem")').first().click();await E(2000);
 for(const s of ['[data-testid="popup-enviar-mensagem"] button','button:has-text("Enviar mesmo assim")','button:has-text("Enviar Mensagem")','button:has-text("ENVIAR CORRESPONDÊNCIA")']){
   const l=cid.p.locator(s).first(); if(await l.count()){await l.click({force:true}).catch(()=>{});await E(1800);}
 }
 await E(3000); await cid.ctx.close();

 console.log('\n=== INSTITUIÇÃO responde ===');
 const inst=await entrar(b,{base:'/institucional',u:'AGT-LMM-01',s:'123456789'});
 await inst.p.locator('button:has-text("Correio")').first().click();await E(3500);
 await inst.p.locator(`tr:has-text("${ASSUNTO}")`).first().locator('button').first().click();await E(2500);
 await inst.p.locator('button:has-text("Responder")').first().click();await E(2500);
 await inst.p.locator('textarea').first().click();
 await inst.p.locator('textarea').first().type('OI');
 console.log('  antes de enviar. destinatário:',await inst.p.locator('input[placeholder*="BI" i]').first().inputValue().catch(()=>'?'));
 console.log('  botões disponíveis:',JSON.stringify(await inst.p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\s+/g,' ').trim()).filter(t=>t&&t.length<45).slice(-8))));
 await inst.p.locator('button:has-text("Enviar Mensagem Oficial")').first().click();await E(2500);
 await inst.p.screenshot({path:'test-artifacts/dep-1.png'});
 for(const s of ['[data-testid="popup-enviar-mensagem"] button','button:has-text("Enviar mesmo assim")','button:has-text("Enviar Mensagem Oficial")','button:has-text("ENVIAR CORRESPONDÊNCIA")']){
   const l=inst.p.locator(s).first();
   if(await l.count()){ console.log('  clique:',s); await l.click({force:true}).catch(e=>console.log('    falhou:',e.message.slice(0,50))); await E(2000); }
 }
 await E(4000);
 await inst.p.screenshot({path:'test-artifacts/dep-2.png'});
 console.log('  ecrã final:',(await inst.p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ').slice(0,300));
 await b.close();
})();
