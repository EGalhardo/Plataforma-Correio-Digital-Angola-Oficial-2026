const { chromium } = require('playwright');
const fs=require('fs');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
const env={};for(const l of fs.readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const H={apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
const db=async q=>(await fetch(env.SUPABASE_URL+'/rest/v1/'+q,{headers:H})).json();
async function entrar(b,{base,u,s}){
 const ctx=await b.newContext({viewport:{width:1400,height:950},locale:'pt-PT'});
 const p=await ctx.newPage();
 await p.goto(`${APP}${base}/#/login`,{waitUntil:'networkidle'});await E(1300);
 await p.fill('input[name="cda-utilizador"]',u);await p.fill('input[name="cda-senha"]',s);
 await p.click('button:has-text("ENTRAR NO PORTAL")');await E(6000);
 return {ctx,p};
}
(async()=>{
 const b=await chromium.launch();
 const inst=await entrar(b,{base:'/institucional',u:'AGT-LMM-01',s:'123456789'});
 await inst.p.locator('button:has-text("Correio")').first().click();await E(3500);

 console.log('A. CAIXA «ENVIADAS» → abrir a linha AGT→AGT (a que estava partida)');
 await inst.p.locator('text=ENVIADAS').first().click();await E(3000);
 // linha #3 da amostra: a AUTO-ENVIADA «OI» (AGT-LMM → AGT-LMM)
 const linhaA=inst.p.locator('tr:has-text("#1794922068080955")').first();
 await linhaA.locator('button').first().click();await E(2800);
 await inst.p.locator('button:has-text("Responder")').first().click();await E(2500);
 const destA=await inst.p.locator('input[placeholder*="BI" i], input[placeholder*="Institucional" i]').first().inputValue().catch(()=>'(vazio)');
 console.log('   destinatário ao responder à auto-enviada:',JSON.stringify(destA));
 console.log('   ',destA===''?'✓ já NÃO se endereça à própria instituição':'✗ continua a falar consigo mesma');
 await inst.p.screenshot({path:'test-artifacts/fix-auto-enviada.png'});

 console.log('\nB. tentar ENVIAR para a própria conta (defesa final)');
 await inst.p.locator('button:has-text("Nova Mensagem")').first().click().catch(()=>{});await E(2500);
 const dest=inst.p.locator('input[placeholder*="BI" i], input[placeholder*="Institucional" i]').first();
 await dest.click(); await dest.type('AGT-LMM-01',{delay:50}); await E(1800);
 const tit=inst.p.locator('input[placeholder*="tema" i]').first();
 await tit.click(); await tit.type('TESTE-AUTO-ENVIO');
 const corpo=inst.p.locator('textarea, [contenteditable="true"]').first();
 await corpo.click(); await corpo.type('nao deve enviar');
 await inst.p.locator('button:has-text("Enviar Mensagem Oficial")').first().click();await E(2000);
 await inst.p.locator('text=Mensagem Normal').first().click().catch(()=>{});await E(600);
 await inst.p.locator('button:has-text("OK")').first().click().catch(()=>{});await E(3000);
 for(const sel of ['button:has-text("Enviar mesmo assim")','button:has-text("ENVIAR CORRESPONDÊNCIA")']){
   const l=inst.p.locator(sel).first(); if(await l.count()) await l.click().catch(()=>{}); await E(1500);
 }
 await E(3500);
 const t=(await inst.p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('   aviso mostrado?',/própria conta remetente/i.test(t)?'✓ SIM':'✗ não apareceu');
 const naBase=(await db('messages?select=id&subject=eq.TESTE-AUTO-ENVIO')).length;
 console.log('   gravou na base?',naBase>0?'✗ SIM (mal)':'✓ NÃO (recusado)');
 await inst.p.screenshot({path:'test-artifacts/fix-recusa.png'});
 await b.close();
})();
