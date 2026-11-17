const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const b=await chromium.launch();
 const mk=async()=>{const c=await b.newContext();const p=await c.newPage();
   await p.goto(APP+'/#/login',{waitUntil:'domcontentloaded'});return p;};
 const a=await mk(), c=await mk();
 const r=await Promise.all([a.evaluate(async()=>{
   const {createClient}=await import('/assets/supabase-CHpd3_5m.js').catch(()=>({}));
   return 'sem modulo';
 }),c.evaluate(()=>1)]).catch(()=>[]);
 // caminho mais simples: usar o cliente já exposto pela app
 const res=await a.evaluate(async()=>{
   // procurar o cliente supabase global que a app usa
   const mod=await import('/src/lib/supabaseClient.ts').catch(()=>null);
   return {temModulo:!!mod};
 });
 console.log('import directo:',JSON.stringify(res));
 // teste directo com a chave anon do .env
 const fs=require('fs');
 const env={};for(const l of fs.readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
 const info={url:env.SUPABASE_URL,key:(env.SUPABASE_ANON_KEY||'').slice(0,20)+'…'};
 console.log('cred:',JSON.stringify(info));
 await b.close();
})();
