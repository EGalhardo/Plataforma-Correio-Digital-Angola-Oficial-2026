const { chromium }=require('playwright');
const fs=require('fs');
const env={}; for(const l of fs.readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const URL=env.SUPABASE_URL, SR=env.SUPABASE_SERVICE_ROLE_KEY;
const H={apikey:SR,Authorization:'Bearer '+SR};
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
(async()=>{
 const q=async(s)=>(await (await fetch(`${URL}/rest/v1/${s}`,{headers:H})).json());
 const alvo=(await q('sondagens?select=id,pergunta&status=eq.ativa&order=id.desc&limit=1'))[0];
 console.log('sondagem:',JSON.stringify(alvo));
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1400,height:1000},locale:'pt-PT'});
 const p=await ctx.newPage();
 p.on('response',async r=>{ const t=await r.text().catch(()=>''); if(/row-level|ok":false|sondagem_respostas/.test(t)&&r.request().method()!=='GET') console.log('  ⚠',r.status(),t.slice(0,200)); });
 await p.goto(`${APP}/#/login`,{waitUntil:'networkidle'}); await E(1400);
 await p.fill('input[name="cda-utilizador"]','002399714LA030'); await p.fill('input[name="cda-senha"]','123456789');
 await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(7000);
 await p.locator('button:has-text("Correio")').first().click(); await E(3500);
 await p.locator(`tr:has-text("${alvo.pergunta}")`).first().locator('button').first().click(); await E(4000);
 await p.locator('button:has-text("Responder")').first().click(); await E(3000);
 let tela=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('modal de resposta abriu?', /Concordo/.test(tela)?'✓ sim':'✗ não');
 await p.screenshot({path:'test-artifacts/sond-voto-4.png'});
 if(/Concordo/.test(tela)){
   await p.locator('text=Concordo').first().click().catch(()=>{}); await E(1200);
   const confirmar=p.locator('button:has-text("Confirmar"), button:has-text("Enviar Resposta"), button:has-text("Submeter"), button:has-text("Registar")');
   console.log('botões:',await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\s+/g,' ').trim()).filter(t=>t&&t.length<40).slice(-8)));
   if(await confirmar.count()){ await confirmar.first().click().catch(()=>{}); await E(4000); }
   await p.screenshot({path:'test-artifacts/sond-voto-5-confirmado.png'});
 }
 console.log('respostas na base:',JSON.stringify(await q(`sondagem_respostas?select=cidadao_bi,escolhas&sondagem_id=eq.${alvo.id}`)));
 await b.close();
})();
