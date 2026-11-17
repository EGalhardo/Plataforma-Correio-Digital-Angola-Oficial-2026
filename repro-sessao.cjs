const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1400,height:950},locale:'pt-PT'});
 const p=await ctx.newPage();
 await p.goto(`${APP}/institucional/#/login`,{waitUntil:'networkidle'});await E(1500);
 await p.fill('input[name="cda-utilizador"]','AGT-LMM-01');await p.fill('input[name="cda-senha"]','123456789');
 await p.click('button:has-text("ENTRAR NO PORTAL")');await E(6500);

 // simular sessão inválida: trocar o access_token por um token já expirado (assinatura válida → servidor responde como anon/papel errado)
 await p.evaluate(()=>{
   for(const k of Object.keys(localStorage)){
     const v=localStorage.getItem(k); if(!v||!v.includes('access_token'))continue;
     try{ const o=JSON.parse(v); const t=o.access_token; const parts=t.split('.');
       const pl=JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
       pl.exp = Math.floor(Date.now()/1000) - 60;           // expirado
       const novo = parts[0]+'.'+btoa(JSON.stringify(pl)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')+'.'+parts[2];
       o.access_token = novo; if(o.currentSession) o.currentSession.access_token = novo;
       localStorage.setItem(k, JSON.stringify(o)); console.log('sessão expirada injetada');
     }catch(e){}
   }
 });
 await p.reload({waitUntil:'networkidle'}); await E(5000);

 const rpc=[];
 p.on('response',async r=>{ if(r.url().includes('cda_cidadao_lookup_bi')) rpc.push(r.status()+' '+(await r.text().catch(()=>'')).slice(0,220)); });
 const btn=p.locator('button:has-text("Correio")').first();
 if(await btn.count()){ await btn.click(); await E(2500); }
 const nova=p.locator('button:has-text("Nova Mensagem")').first();
 if(await nova.count()){ await nova.click(); await E(2500);
   const campo=p.locator('input[placeholder*="BI" i]').first();
   await campo.click(); await campo.type('002399714LA030',{delay:50}); await E(4000);
   await p.click('#recipient-bi-search-btn').catch(()=>{}); await E(3500);
 }
 console.log('RPC:',rpc[0]||'(sem chamada — app bloqueou antes)');
 const tela=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('ecrã contém P0001?', /P0001/.test(tela) ? 'SIM ✗ (reproduzido)' : 'não');
 console.log('excerto:',tela.slice(0,200));
 await p.screenshot({path:'test-artifacts/lookup-sessao.png'});
 await b.close();
})();
