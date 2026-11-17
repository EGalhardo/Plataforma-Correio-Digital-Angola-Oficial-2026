const { chromium } = require('playwright');
const fs=require('fs');
const env={};for(const l of fs.readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
(async()=>{
 const b=await chromium.launch();
 const canal='probe-'+Date.now();
 const abrir=async(nome)=>{
  const p=await (await b.newContext()).newPage();
  await p.goto('https://correio-digital-angola-oficial.vercel.app/#/login',{waitUntil:'networkidle'});
  await p.exposeFunction('regista',(m)=>recebidas.push(nome+': '+m));
  await p.evaluate(async({url,key,canal})=>{
    window.recebidas=[];window.__rec=[];
    const src=await (await fetch('/assets/supabase-CHpd3_5m.js')).text();
    // usar o bundle já carregado: procurar createClient no módulo
    const mod=await import('/assets/supabase-CHpd3_5m.js');
    const createClient=mod.createClient||mod.default?.createClient;
    const sb=createClient(url,key);
    const ch=sb.channel(canal,{config:{broadcast:{self:false}}});
    ch.on('broadcast',{event:'webrtc'},({payload})=>{window.__rec.push(JSON.stringify(payload).slice(0,60));});
    await new Promise(r=>ch.subscribe(s=>{window.__estado=s;r();}));
    window.__ch=ch;window.__sb=sb;
    return window.__estado;
  },{url:env.SUPABASE_URL,key:env.SUPABASE_ANON_KEY,canal}).then(e=>console.log(nome,'estado:',e));
  return p;
 };
 const recebidas=[];
 const a=await abrir('A');
 const c=await abrir('B');
 await new Promise(r=>setTimeout(r,2500));
 await a.evaluate(({canal})=>{window.__ch.send({type:'broadcast',event:'webrtc',payload:{teste:'ola',de:'A'}});},{canal});
 await new Promise(r=>setTimeout(r,3000));
 const rec=await c.evaluate(()=>window.__rec);
 console.log('B recebeu:',JSON.stringify(rec));
 await b.close();
})();
