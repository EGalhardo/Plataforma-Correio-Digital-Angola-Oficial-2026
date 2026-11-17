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
 await p.locator('button:has-text("Correio")').first().click();await E(3500);
 const linha=p.locator('tr:has-text("OI-956966")').first();  // a mensagem que o cidadão enviou
 console.log('linha encontrada:',await linha.count());
 await linha.locator('button').first().click().catch(()=>{});
 await E(3000);
 await p.locator('button:has-text("Responder")').first().click().catch(()=>{});
 await E(2000);
 await p.screenshot({path:'test-artifacts/resp-form.png'});
 console.log('\nformulário:',(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ').slice(300,900));
 // preencher a resposta
 const campo=p.locator('textarea').first();
 await campo.click().catch(()=>{}); await campo.type('OI').catch(()=>{});
 await p.screenshot({path:'test-artifacts/resp-preenchida.png'});
 const enviar=p.locator('button:has-text("Enviar Resposta"), button:has-text("Submeter Resposta"), button:has-text("ENVIAR")').first();
 console.log('botão de envio da resposta:',await enviar.count(),await enviar.innerText().catch(()=>''));
 await enviar.click().catch(e=>console.log('clique falhou:',e.message.slice(0,60)));
 await E(5000);
 await p.screenshot({path:'test-artifacts/resp-depois.png'});
 console.log('\nbase (últimas 2):');
 (await db('messages?select=id,subject,sender_bi,recipient_bi,created_at&order=created_at.desc&limit=2')).forEach(m=>console.log('  ',m.sender_bi,'→',m.recipient_bi,'|',JSON.stringify(String(m.subject).slice(0,30))));
 await b.close();
})();
