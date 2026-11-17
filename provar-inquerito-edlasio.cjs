// O cenário exato do utilizador: «Inquerito 123bbbbbbbbbbbbbb» com #229/#230 em rascunho.
const { chromium }=require('playwright');
const fs=require('fs');
const env={}; for(const l of fs.readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const H={apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1400,height:1100},locale:'pt-PT'});
 const p=await ctx.newPage();
 p.on('response',async r=>{const t=await r.text().catch(()=>''); if(/row-level|ok":false/.test(t)) console.log('  ⚠',r.status(),t.slice(0,180));});
 await p.goto(`${APP}/#/login`,{waitUntil:'networkidle'}); await E(1400);
 await p.fill('input[name="cda-utilizador"]','002399714LA030'); await p.fill('input[name="cda-senha"]','123456789');
 await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(7000);
 await p.locator('button:has-text("Correio")').first().click(); await E(3500);
 console.log('a abrir «Inquerito 123bbbbbbbbbbbbbb»...');
 await p.locator('tr:has-text("Inquerito 123")').first().locator('button').first().click(); await E(6000);
 let tela=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('cartão com opções?', /dfsdfdfsf|werwer/.test(tela)?'✓ sim':'✗ não');
 await p.screenshot({path:'test-artifacts/edlasio-1-aberto.png'});
 // escolher uma opção de cada sondagem
 const opcoes=p.locator('text=/dfsdfdfsf|werwer/');
 console.log('opções encontradas:',await opcoes.count());
 for(let i=0;i<Math.min(await opcoes.count(),2);i++){ await opcoes.nth(i).click().catch(()=>{}); await E(900); }
 await p.locator('button:has-text("Responder")').first().click(); await E(2500);
 tela=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 const semEscolha=(tela.match(/Sem escolha/g)||[]).length;
 console.log('modal — «Sem escolha» ×', semEscolha, semEscolha===0?'✓':'✗');
 await p.screenshot({path:'test-artifacts/edlasio-2-modal.png'});
 if(semEscolha===0){
   await p.locator('button:has-text("CONFIRMAR RESPOSTAS")').first().click(); await E(5000);
   await p.screenshot({path:'test-artifacts/edlasio-3-confirmado.png'});
 }
 const resp=await (await fetch(env.SUPABASE_URL+'/rest/v1/sondagem_respostas?select=sondagem_id,escolhas&sondagem_id=in.(229,230)',{headers:H})).json();
 console.log('respostas na base:',JSON.stringify(resp));
 const est=await (await fetch(env.SUPABASE_URL+'/rest/v1/sondagens?select=id,status&id=in.(229,230)',{headers:H})).json();
 console.log('estado das sondagens:',JSON.stringify(est));
 await b.close();
})();
