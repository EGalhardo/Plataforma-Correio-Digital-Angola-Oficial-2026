const { chromium } = require('playwright');
const fs=require('fs');
const env={};for(const l of fs.readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const TOPICO='cda-probe-'+Date.now();
const E=m=>new Promise(r=>setTimeout(r,m));
(async()=>{
 const b=await chromium.launch();
 const p=await (await b.newContext()).newPage();
 await p.addInitScript(()=>{window.__rec=[];});
 await p.goto('https://correio-digital-angola-oficial.vercel.app/#/login',{waitUntil:'networkidle'});
 // subscrever via o cliente da app (usa supabase-js do bundle vendor)
 const sub=await p.evaluate(async({url,key,topico})=>{
   const mod=await import('/assets/vendor-CDd_VcRR.js');
   const cc=mod.createClient||mod.default?.createClient||window.supabase?.createClient;
   if(!cc) return 'sem createClient ('+Object.keys(mod).slice(0,6).join(',')+')';
   const sb=cc(url,key);
   const ch=sb.channel(topico,{config:{broadcast:{self:false}}});
   ch.on('broadcast',{event:'webrtc'},({payload})=>window.__rec.push(payload));
   const estado=await new Promise(r=>{const t=setTimeout(()=>r('timeout'),9000);ch.subscribe(s=>{if(s==='SUBSCRIBED'){clearTimeout(t);r(s);}});});
   window.__ch=ch;
   return estado;
 },{url:env.SUPABASE_URL,key:env.SUPABASE_ANON_KEY,topico:TOPICO});
 console.log('subscrição:',sub);
 if(sub!=='SUBSCRIBED'){await b.close();return;}
 // enviar por REST de fora do browser (como o servidor faria)
 const r=await fetch(env.SUPABASE_URL+'/realtime/v1/api/broadcast',{method:'POST',
   headers:{'Content-Type':'application/json',apikey:env.SUPABASE_ANON_KEY,Authorization:'Bearer '+env.SUPABASE_ANON_KEY},
   body:JSON.stringify({messages:[{topic:TOPICO,event:'webrtc',payload:{teste:'entrega-rest'}}]})});
 console.log('envio REST:',r.status);
 await E(4000);
 console.log('recebido na página:',JSON.stringify(await p.evaluate(()=>window.__rec)));
 await b.close();
})();
