const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
async function tentar(b,{nome,base,u,s}){
 const ctx=await b.newContext({viewport:{width:1400,height:950},locale:'pt-PT'});
 const p=await ctx.newPage();
 let rpc='(sem chamada)';
 p.on('response',async r=>{ if(r.url().includes('cda_cidadao_lookup_bi')){ rpc=r.status()+' '+(await r.text().catch(()=>'')).slice(0,180); } });
 await p.goto(`${APP}${base}/#/login`,{waitUntil:'networkidle'});await E(1500);
 await p.fill('input[name="cda-utilizador"]',u);await p.fill('input[name="cda-senha"]',s);
 await p.click('button:has-text("ENTRAR NO PORTAL")');await E(6500);
 const jwt=await p.evaluate(()=>{ for(const k of Object.keys(localStorage)){ const v=localStorage.getItem(k); if(v&&v.includes('access_token')){ try{const o=JSON.parse(v);const t=o.access_token||(o.currentSession||{}).access_token; if(t){const pl=JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return pl.app_metadata;} }catch{} } } return null; });
 // abrir correio + nova mensagem (se existir)
 const btnCorreio=p.locator('button:has-text("Correio")').first();
 if(await btnCorreio.count()) { await btnCorreio.click(); await E(2500); }
 const nova=p.locator('button:has-text("Nova Mensagem")').first();
 if(!await nova.count()){ console.log(`${nome}: sem compositor (app_metadata=${JSON.stringify(jwt)})`); await ctx.close(); return; }
 await nova.click(); await E(2500);
 const campo=p.locator('input[placeholder*="BI" i], input[placeholder*="Institucional" i]').first();
 if(!await campo.count()){ console.log(`${nome}: compositor sem campo BI`); await ctx.close(); return; }
 await campo.click(); await campo.type('002399714LA030',{delay:60}); await E(4000);
 await p.click('#recipient-bi-search-btn').catch(()=>{});
 await E(3500);
 const tela=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log(`${nome}: app_metadata=${JSON.stringify(jwt)}`);
 console.log(`  RPC: ${rpc}`);
 console.log(`  tela: ${/Não foi possível consultar o BI/.test(tela)?'ERRO P0001 ✗':/Edlasio/.test(tela)?'localizado ✓':'— '+tela.slice(150,320)}`);
 await p.screenshot({path:`test-artifacts/lookup-${nome}.png`});
 await ctx.close();
}
(async()=>{
 const b=await chromium.launch();
 await tentar(b,{nome:'admin',base:'',u:'ADMIN-0001',s:'987654321'});
 await tentar(b,{nome:'cidadao',base:'',u:'002399714LA030',s:'123456789'});
 await b.close();
})();
