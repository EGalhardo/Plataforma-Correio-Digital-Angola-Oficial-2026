const { chromium } = require('playwright');
const fs=require('fs');
const env={};for(const l of fs.readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const SR=env.SUPABASE_SERVICE_ROLE_KEY,U=env.SUPABASE_URL;
const H={apikey:SR,Authorization:'Bearer '+SR,'Content-Type':'application/json'};
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1400,height:900},locale:'pt-PT'});
  const p=await ctx.newPage();
  await p.goto(`${APP}/#/login`,{waitUntil:'networkidle'}); await E(1500);
  await p.fill('input[name="cda-utilizador"]','002399714LA030'); await p.fill('input[name="cda-senha"]','123456789');
  await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(11000);
  const r=await fetch(`${U}/rest/v1/notifications`,{method:'POST',headers:{...H,Prefer:'return=representation'},
    body:JSON.stringify([{target_bi:'002399714LA030',title:'Nova Correspondência Oficial',message:'TOAST-PROVA foi disponibilizada no seu endereço digital oficial.',time_text:'Agora',type:'info',target_tab:'correspondencias'}])});
  const linha=(await r.json())[0];
  console.log('id', linha.id);
  // forçar refetch como o Realtime faria: mudar de aba e voltar + focus
  await p.evaluate(()=>{ window.dispatchEvent(new Event('focus')); window.dispatchEvent(new HashChangeEvent('hashchange')); });
  await E(9000);
  let achou = await p.evaluate(()=>{
    const alvo=[...document.querySelectorAll('div')].filter(el=>{
      const cs=getComputedStyle(el); if(cs.position!=='fixed') return false;
      const t=(el.innerText||'');
      return t.includes('TOAST-PROVA') && t.length<400;
    });
    return alvo.map(el=>{const r=el.getBoundingClientRect(); return {top:Math.round(r.top),left:Math.round(r.left),w:Math.round(r.width),h:Math.round(r.height),bg:getComputedStyle(el).backgroundColor,txt:el.innerText.replace(/\s+/g,' ').slice(0,120),html:el.outerHTML.slice(0,300)};});
  });
  console.log('após focus/hashchange:', JSON.stringify(achou,null,1));
  if(!achou.length){
    await p.locator('button:has-text("Correio")').first().click().catch(()=>{}); await E(7000);
    achou = await p.evaluate(()=>{
      const alvo=[...document.querySelectorAll('div')].filter(el=>{
        const cs=getComputedStyle(el); if(cs.position!=='fixed') return false;
        const t=(el.innerText||''); return t.includes('TOAST-PROVA') && t.length<400;
      });
      return alvo.map(el=>{const r=el.getBoundingClientRect(); return {top:Math.round(r.top),left:Math.round(r.left),w:Math.round(r.width),bg:getComputedStyle(el).backgroundColor,txt:el.innerText.replace(/\s+/g,' ').slice(0,140)};});
    });
    console.log('após ir ao Correio:', JSON.stringify(achou,null,1));
  }
  await p.screenshot({path:'test-artifacts/diag-toast2.png'});
  await fetch(`${U}/rest/v1/notifications?id=eq.${linha.id}`,{method:'DELETE',headers:H});
  await b.close();
})();
