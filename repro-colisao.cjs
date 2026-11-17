const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
const lerMeta=async(p)=>p.evaluate(()=>{ for(const k of Object.keys(localStorage)){ const v=localStorage.getItem(k); if(!v||!v.includes('access_token')) continue; try{ const o=JSON.parse(v); const t=o.access_token||(o.currentSession||{}).access_token; if(!t) continue; const pl=JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); return {chave:k,app_metadata:pl.app_metadata}; }catch(e){} } return null; });
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1400,height:950},locale:'pt-PT'});
 // ABA A — instituição
 const A=await ctx.newPage();
 await A.goto(`${APP}/institucional/#/login`,{waitUntil:'networkidle'});await E(1500);
 await A.fill('input[name="cda-utilizador"]','AGT-LMM-01');await A.fill('input[name="cda-senha"]','123456789');
 await A.click('button:has-text("ENTRAR NO PORTAL")');await E(6500);
 console.log('ABA A (instituição) meta:',JSON.stringify((await lerMeta(A)).app_metadata));
 await A.locator('button:has-text("Correio")').first().click();await E(2500);
 await A.locator('button:has-text("Nova Mensagem")').first().click();await E(2500);
 const campo=A.locator('input[placeholder*="BI" i]').first();
 await campo.click(); await campo.type('002399714LA030',{delay:50}); await E(3000);

 // ABA B — cidadão no MESMO navegador (mesma origem → mesma chave de sessão)
 const B=await ctx.newPage();
 await B.goto(`${APP}/#/login`,{waitUntil:'networkidle'});await E(1500);
 await B.fill('input[name="cda-utilizador"]','002399714LA030');await B.fill('input[name="cda-senha"]','123456789');
 await B.click('button:has-text("ENTRAR NO PORTAL")');await E(6500);
 console.log('ABA B (cidadão) meta:',JSON.stringify((await lerMeta(B)).app_metadata));
 console.log('chave de sessão partilhada?', (await lerMeta(A)).chave === (await lerMeta(B)).chave);

 // voltar à ABA A e consultar o BI
 const resposta=[];
 A.on('response',async r=>{ if(r.url().includes('cda_cidadao_lookup_bi')) resposta.push(r.status()+' '+(await r.text().catch(()=>'')).slice(0,200)); });
 await A.bringToFront();
 await A.click('#recipient-bi-search-btn').catch(()=>{});
 await E(4000);
 const tela=(await A.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('RPC da aba instituição:',resposta[0]||'(sem chamada)');
 console.log('ecrã:', /Não foi possível consultar o BI \(Erro real: P0001\)/.test(tela) ? 'P0001 REPRODUZIDO ✗' : tela.slice(120,340));
 await A.screenshot({path:'test-artifacts/lookup-colisao.png'});
 await b.close();
})();
