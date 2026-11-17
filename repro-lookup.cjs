const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1400,height:950},locale:'pt-PT'});
 const p=await ctx.newPage();
 const chamadas=[];
 p.on('request',r=>{ if(r.url().includes('cda_cidadao_lookup_bi')) chamadas.push({auth:(r.headers()['authorization']||'').slice(0,25), body:r.postData()}); });
 p.on('response',async r=>{ if(r.url().includes('cda_cidadao_lookup_bi')){ let t=''; try{t=await r.text();}catch{} console.log('  RPC →',r.status(),t.slice(0,260)); } });
 await p.goto(`${APP}/institucional/#/login`,{waitUntil:'networkidle'});await E(1300);
 await p.fill('input[name="cda-utilizador"]','AGT-LMM-01');await p.fill('input[name="cda-senha"]','123456789');
 await p.click('button:has-text("ENTRAR NO PORTAL")');await E(6500);

 // o que vai no JWT (app_metadata)
 const jwt=await p.evaluate(()=>{
   for(const k of Object.keys(localStorage)){ const v=localStorage.getItem(k);
     if(v && v.includes('access_token')){ try{ const o=JSON.parse(v); const tk=o.access_token||(o.currentSession&&o.currentSession.access_token);
       if(tk){ const pl=JSON.parse(atob(tk.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); return {chave:k, app_metadata:pl.app_metadata, role:pl.role, exp:new Date(pl.exp*1000).toISOString()}; } }catch{} } }
   return null;
 });
 console.log('JWT app_metadata:',JSON.stringify(jwt));

 await p.locator('button:has-text("Correio")').first().click();await E(3000);
 await p.locator('button:has-text("Nova Mensagem")').first().click();await E(2500);
 const d=p.locator('input[placeholder*="BI" i]').first();
 await d.click(); await d.type('002399714LA030',{delay:60}); await E(4000);
 const tela=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('resultado na tela:', /Não foi possível consultar o BI/.test(tela)? 'ERRO P0001 reproduzido' : /Edlasio/.test(tela)? 'cidadão localizado ✓' : tela.slice(200,420));
 await p.screenshot({path:'test-artifacts/lookup-repro.png'});
 console.log('pedidos capturados:',chamadas.length, JSON.stringify(chamadas[0]||{}).slice(0,160));
 await b.close();
})();
