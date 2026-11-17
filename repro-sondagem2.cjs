const { chromium }=require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1400,height:950},locale:'pt-PT'});
 const p=await ctx.newPage();
 p.on('response',async r=>{ if(/sondagens|\/api\/dados/.test(r.url()) && r.request().method()!=='GET'){
   const t=await r.text().catch(()=>''); if(/sondagens/.test(r.url())||/"ok":false/.test(t)) console.log('  ←',r.status(),t.slice(0,300)); } });
 p.on('request',r=>{ const d=r.postData()||''; if(d.includes('sondagens')) console.log('  →',r.url().replace(APP,'').slice(0,40),d.slice(0,260)); });
 await p.goto(`${APP}/institucional/#/login`,{waitUntil:'networkidle'}); await E(1400);
 await p.fill('input[name="cda-utilizador"]','AGT-LMM-01'); await p.fill('input[name="cda-senha"]','123456789');
 await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(7000);
 await p.locator('button:has-text("Correio")').first().click(); await E(3000);
 await p.locator('button:has-text("Nova Mensagem")').first().click(); await E(2500);
 await p.locator('button:has-text("Criar Inquérito")').first().click(); await E(2500);
 await p.locator('button:has-text("OK")').last().click(); await E(2500);
 await p.screenshot({path:'test-artifacts/sond-3-form.png'});
 const tela=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('formulário aberto?', /Criar Sondagem|PERGUNTA|Pergunta/.test(tela)?'sim':'não');
 // listar campos
 const campos=await p.evaluate(()=>[...document.querySelectorAll('textarea,input[type=text]')].map(e=>({tag:e.tagName,ph:e.placeholder,id:e.id})).slice(-8));
 console.log('campos:',JSON.stringify(campos));
 await b.close();
})();
