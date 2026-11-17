const { chromium } = require('playwright');
const fs=require('fs');
const env={};for(const l of fs.readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const CANAL='probe-'+Date.now();
(async()=>{
 const b=await chromium.launch();
 const abrir=async(nome)=>{
  const ctx=await b.newContext();
  await ctx.addInitScript(()=>{window.__rec=[];window.__est='?';});
  const p=await ctx.newPage();
  // interceptar o pedido de load do bundle para descobrir o nome actual
  let bundle=null;
  p.on('response',r=>{const u=r.url();if(/\/assets\/supabase-.*\.js/.test(u))bundle=u;});
  await p.goto('https://correio-digital-angola-oficial.vercel.app/#/login',{waitUntil:'networkidle'});
  if(!bundle){console.log(nome,'bundle não encontrado');return p;}
  const est=await p.evaluate(async({url,key,canal,bundle})=>{
    const mod=await import(bundle);
    const createClient=mod.createClient||(mod.default&&mod.default.createClient);
    if(!createClient) return 'sem createClient: '+Object.keys(mod).slice(0,5).join(',');
    const sb=createClient(url,key);
    const ch=sb.channel(canal,{config:{broadcast:{self:false}}});
    ch.on('broadcast',{event:'webrtc'},({payload})=>{window.__rec.push(payload);});
    await new Promise(r=>{const t=setTimeout(r,8000);ch.subscribe(s=>{window.__est=s;clearTimeout(t);r();});});
    window.__ch=ch;
    return window.__est;
  },{url:env.SUPABASE_URL,key:env.SUPABASE_ANON_KEY,canal:CANAL,bundle});
  console.log(nome,'estado do canal:',est);
  return p;
 };
 const A=await abrir('A');
 const B=await abrir('B');
 await new Promise(r=>setTimeout(r,3000));
 await A.evaluate(()=>window.__ch&&window.__ch.send({type:'broadcast',event:'webrtc',payload:{teste:'ola'}}));
 await new Promise(r=>setTimeout(r,4000));
 console.log('B recebeu:',JSON.stringify(await B.evaluate(()=>window.__rec)));
 await b.close();
})();
