const { chromium } = require('playwright');
const fs=require('fs');
const env={};for(const l of fs.readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['\"]|['\"]\$/g,'');}
const TOPICO='cda-probe-'+Date.now();
const E=m=>new Promise(r=>setTimeout(r,m));
(async()=>{
 const b=await chromium.launch();
 const p=await (await b.newContext()).newPage();
 await p.addInitScript(()=>{window.__rec=[];});
 await p.goto('https://correio-digital-angola-oficial.vercel.app/#/login',{waitUntil:'networkidle'});
 const sub=await p.evaluate(async({url,key,topico})=>{
   const urls=performance.getEntriesByType('resource').map(e=>e.name).filter(u=>/\/assets\/.*\.js/.test(u));
   let mod={};
   for(const u of urls){try{Object.assign(mod,await import(u));}catch{}}
   let cc=null;
   for(const k of Object.keys(mod)){const v=mod[k];
     if(typeof v==='function'&&/supabaseUrl|supabaseKey|createClient/.test(String(v))){cc=v;window.__info={k,s:String(v).slice(0,120)};break;}}
   if(!cc) return 'nenhum createClient: '+JSON.stringify(Object.keys(mod).slice(0,10));
   window.__info={tipo:typeof cc, chave:Object.keys(mod).slice(0,8), s:String(cc).slice(0,150)};
   console.log('tipo cc:',typeof cc, String(cc).slice(0,120)); window.__cc=typeof mod.al;
   const sb=cc(url,key);
   if(!sb||typeof sb.channel!=='function') return 'sb sem channel: '+JSON.stringify({t:typeof sb,k:sb?Object.keys(sb).slice(0,8):null});
   const ch=sb.channel(topico,{config:{broadcast:{self:false}}});
   ch.on('broadcast',{event:'webrtc'},({payload})=>window.__rec.push(payload));
   const est=await new Promise(r=>{const t=setTimeout(()=>r('timeout'),9000);ch.subscribe(s=>{if(s==='SUBSCRIBED'){clearTimeout(t);r(s);}});});
   window.__ch=ch;
   return est;
 },{url:env.SUPABASE_URL,key:env.SUPABASE_ANON_KEY,topico:TOPICO});
 console.log('subscrição:',sub);
 if(sub!=='SUBSCRIBED'){await b.close();return;}
 const r=await fetch(env.SUPABASE_URL+'/realtime/v1/api/broadcast',{method:'POST',
   headers:{'Content-Type':'application/json',apikey:env.SUPABASE_ANON_KEY,Authorization:'Bearer '+env.SUPABASE_ANON_KEY},
   body:JSON.stringify({messages:[{topic:TOPICO,event:'webrtc',payload:{teste:'entrega-rest'}}]})});
 console.log('envio REST:',r.status);
 await E(4000);
 console.log('recebido:',JSON.stringify(await p.evaluate(()=>window.__rec)));
 await b.close();
})();
