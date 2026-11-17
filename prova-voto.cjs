// Cidadão real responde à sondagem entregue (upsert via proxy).
const { chromium }=require('playwright');
const fs=require('fs');
const env={}; for(const l of fs.readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const URL=env.SUPABASE_URL, SR=env.SUPABASE_SERVICE_ROLE_KEY;
const H={apikey:SR,Authorization:'Bearer '+SR,'Content-Type':'application/json'};
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
(async()=>{
 const q=async(s)=>(await (await fetch(`${URL}/rest/v1/${s}`,{headers:H})).json());
 const alvo=await q(`sondagens?select=id,pergunta&status=eq.ativa&order=id.desc&limit=1`);
 const s=alvo[0]; console.log('sondagem alvo:',JSON.stringify(s));
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1400,height:950},locale:'pt-PT'});
 const p=await ctx.newPage();
 p.on('response',async r=>{ const t=await r.text().catch(()=>''); if(/row-level|ok":false/.test(t)) console.log('  ⚠',r.status(),t.slice(0,200)); });
 await p.goto(`${APP}/#/login`,{waitUntil:'networkidle'}); await E(1400);
 await p.fill('input[name="cda-utilizador"]','002399714LA030'); await p.fill('input[name="cda-senha"]','123456789');
 await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(7000);
 await p.locator('button:has-text("Correio")').first().click(); await E(3500);
 // abrir a mensagem que traz a sondagem
 await p.locator(`text=${s.pergunta}`).first().click().catch(()=>{}); await E(3000);
 let tela=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 if(!/Concordo/.test(tela)){ // tentar pela linha da tabela
   await p.locator(`tr:has-text("${s.pergunta}")`).first().locator('button').first().click().catch(()=>{}); await E(3000);
   tela=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 }
 console.log('sondagem visível ao cidadão?', /Concordo/.test(tela)?'✓ sim':'✗ não');
 await p.screenshot({path:'test-artifacts/sond-voto-1.png'});
 if(/Concordo/.test(tela)){
   await p.locator('text=Concordo').first().click().catch(()=>{}); await E(1200);
   const enviar=p.locator('button:has-text("Enviar Resposta"), button:has-text("Responder"), button:has-text("Submeter"), button:has-text("Votar")');
   console.log('botões de voto:', await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\s+/g,' ').trim()).filter(t=>/respon|vot|submet|envia/i.test(t)).slice(0,5)));
   if(await enviar.count()){ await enviar.first().click().catch(()=>{}); await E(3500); }
   await p.screenshot({path:'test-artifacts/sond-voto-2.png'});
 }
 const votos=await q(`sondagem_respostas?select=cidadao_bi,escolhas&sondagem_id=eq.${s.id}`);
 console.log('respostas na base:',JSON.stringify(votos));
 await b.close();
})();
