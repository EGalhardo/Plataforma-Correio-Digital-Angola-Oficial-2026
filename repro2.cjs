const { chromium }=require('playwright');
const fs=require('fs');
const env={}; for(const l of fs.readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const H={apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
const marca='REPRO-'+Date.now().toString().slice(-5);
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1400,height:1000},locale:'pt-PT'});
 const p=await ctx.newPage();
 p.on('request',r=>{const d=r.postData()||''; if(/sondagens/.test(r.url())||/sondagens/.test(d)) console.log('  →',r.method(),r.url().replace(APP,'').slice(0,50),d.slice(0,150));});
 p.on('response',async r=>{const t=await r.text().catch(()=>''); if(/sondagens/.test(r.url())&&r.request().method()!=='OPTIONS') console.log('  ←',r.status(),t.slice(0,150));});
 await p.goto(`${APP}/institucional/#/login`,{waitUntil:'networkidle'}); await E(1400);
 await p.fill('input[name="cda-utilizador"]','AGT-LMM-01'); await p.fill('input[name="cda-senha"]','123456789');
 await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(7000);
 await p.locator('button:has-text("Correio")').first().click(); await E(3000);
 await p.locator('button:has-text("Nova Mensagem")').first().click(); await E(2500);
 await p.locator('input[placeholder*="BI" i]').first().fill('002399714LA030'); await E(2500);
 // criar duas sondagens, como o utilizador fez
 for(const n of ['1','2']){
   await p.locator('button:has-text("Criar Inquérito")').first().click(); await E(1800);
   await p.locator('button:has-text("OK")').last().click(); await E(2200);
   await p.locator('input[placeholder="Escreva a pergunta da sondagem"]').fill(`${marca} PERGUNTA ${n}`);
   await p.locator('input[placeholder="Texto A"]').fill('Opcao A'+n);
   await p.locator('input[placeholder="Texto B"]').fill('Opcao B'+n);
   await p.locator('button:has-text("CRIAR SONDAGEM")').click(); await E(4500);
   console.log(`criada sondagem ${n}`);
 }
 await p.locator('input[placeholder*="tema" i]').first().fill(marca+' ASSUNTO');
 await E(800);
 await p.locator('button:has-text("Enviar Mensagem Oficial")').first().click(); await E(2500);
 for(let v=0;v<4;v++){
   for(const sel of ['[data-testid="popup-enviar-mensagem"] button','button:has-text("Enviar mesmo assim")','button:has-text("Enviar Correspondência")']){
     const l=p.locator(sel).first();
     if(await l.count()&&await l.isVisible().catch(()=>false)){ console.log('   clique',sel); await l.click({force:true}).catch(()=>{}); await E(1800); }
   }
 }
 await E(5000);
 const telas=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('\necra:',telas.slice(0,220));
 await p.screenshot({path:'test-artifacts/repro2.png'});
 const s=await (await fetch(env.SUPABASE_URL+'/rest/v1/sondagens?select=id,status,destinatarios&pergunta=like.*'+encodeURIComponent(marca)+'*',{headers:H})).json();
 console.log('sondagens:',JSON.stringify(s));
 const m=await (await fetch(env.SUPABASE_URL+'/rest/v1/messages?select=id,sondagem_ids&subject=like.*'+encodeURIComponent(marca)+'*',{headers:H})).json();
 console.log('mensagem:',JSON.stringify(m));
 await b.close();
})();
