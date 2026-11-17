// Ciclo completo: criar → distribuir (mensagem com sondagem) → cidadão responde.
const { chromium }=require('playwright');
const fs=require('fs');
const env={}; for(const l of fs.readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const URL=env.SUPABASE_URL, SR=env.SUPABASE_SERVICE_ROLE_KEY, ANON=env.SUPABASE_ANON_KEY;
const H={apikey:SR,Authorization:'Bearer '+SR,'Content-Type':'application/json'};
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
const PERGUNTA='PROVA CICLO '+Date.now().toString().slice(-6);
const q=async(s)=>(await (await fetch(`${URL}/rest/v1/${s}`,{headers:H})).json());
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1400,height:950},locale:'pt-PT'});
 const p=await ctx.newPage();
 p.on('response',async r=>{ const t=await r.text().catch(()=>''); if(/row-level|ok":false/.test(t)&&!/sondagens\?select/.test(r.url())) console.log('  ⚠',r.status(),t.slice(0,220)); });
 await p.goto(`${APP}/institucional/#/login`,{waitUntil:'networkidle'}); await E(1400);
 await p.fill('input[name="cda-utilizador"]','AGT-LMM-01'); await p.fill('input[name="cda-senha"]','123456789');
 await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(7000);
 await p.locator('button:has-text("Correio")').first().click(); await E(3000);
 await p.locator('button:has-text("Nova Mensagem")').first().click(); await E(2500);
 // destinatário: o cidadão real
 await p.locator('input[placeholder*="BI" i]').first().fill('002399714LA030'); await E(2500);
 await p.locator('button:has-text("Criar Inquérito")').first().click(); await E(2000);
 await p.locator('button:has-text("OK")').last().click(); await E(2500);
 await p.locator('input[placeholder="Escreva a pergunta da sondagem"]').fill(PERGUNTA);
 await p.locator('input[placeholder="Texto A"]').fill('Concordo');
 await p.locator('input[placeholder="Texto B"]').fill('Discordo');
 await p.locator('button:has-text("CRIAR SONDAGEM")').click(); await E(6000);
 // título obrigatório para o envio ficar activo
 await p.locator('input[placeholder*="tema" i]').first().fill(PERGUNTA); await E(800);
 const bloco=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('sondagem anexada à mensagem?', new RegExp(PERGUNTA).test(bloco)?'✓ sim':'✗ não');
 await p.screenshot({path:'test-artifacts/sond-ciclo-1.png'});
 // enviar a mensagem com a sondagem
 await p.locator('button:has-text("Enviar Mensagem Oficial")').first().click({timeout:15000}); await E(2500);
 for(let v=0;v<4;v++){
   for(const sel of ['[data-testid="popup-enviar-mensagem"] button','button:has-text("Enviar mesmo assim")','button:has-text("Enviar Correspondência")','button:has-text("Enviar Mensagem Oficial")']){
     const l=p.locator(sel).first();
     if(await l.count()&&await l.isVisible().catch(()=>false)){ await l.click({force:true}).catch(()=>{}); await E(1800); }
   }
 }
 await E(4000);
 await p.screenshot({path:'test-artifacts/sond-ciclo-2-enviada.png'});
 const s=await q(`sondagens?select=id,status,pergunta&pergunta=eq.${encodeURIComponent(PERGUNTA)}`);
 console.log('sondagem na base:',JSON.stringify(s));
 const msgs=await q(`messages?select=id,sondagem_ids,subject&sondagem_ids=not.is.null&order=id.desc&limit=3`);
 console.log('mensagens com sondagem embutida:',JSON.stringify(msgs));
 const depois=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('ecrã final:', depois.slice(0,170));
 await b.close();
})();
