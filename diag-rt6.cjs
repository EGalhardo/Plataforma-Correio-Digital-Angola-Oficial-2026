const { chromium } = require('playwright');
const fs=require('fs');
const env={};for(const l of fs.readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['\"]|['\"]\$/g,'');}
(async()=>{
 const b=await chromium.launch();
 const p=await (await b.newContext()).newPage();
 await p.goto('https://correio-digital-angola-oficial.vercel.app/#/login',{waitUntil:'networkidle'});
 const r=await p.evaluate(async({url,key})=>{
   // procurar o módulo que exporta createClient em TODOS os chunks carregados
   const urls=performance.getEntriesByType('resource').map(e=>e.name).filter(u=>/\/assets\/.*\.js/.test(u));
   let achou=null;
   for(const u of urls){try{const m=await import(u);
     for(const k of Object.keys(m)){const v=m[k];
       if(typeof v==='function'){try{const s=String(v).slice(0,300);if(/supabaseUrl|SUPABASE_URL|supabaseKey/.test(s))achou={u:u.split('/').pop(),k};}catch{}}
       if(v&&typeof v==='object'&&typeof v.createClient==='function')achou={u:u.split('/').pop(),k,kids:Object.keys(v).slice(0,4)};
     }}catch{}}
   return achou;
 },{url:env.SUPABASE_URL,key:env.SUPABASE_ANON_KEY});
 console.log('módulo com createClient:',JSON.stringify(r));
 await b.close();
})();
