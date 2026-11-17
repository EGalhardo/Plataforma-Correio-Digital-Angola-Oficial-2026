const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
(async()=>{
 const b=await chromium.launch();
 const abrir=async(n)=>{
  const ctx=await b.newContext();
  await ctx.addInitScript(()=>{
    window.__rt={rec:[],est:'?',canais:[]};
    // observar WebSockets do Realtime
    const Orig=window.WebSocket;
    window.WebSocket=function(u,p){const ws=new Orig(u,p);window.__rt.ws=(window.__rt.ws||[]).concat(u);
      ws.addEventListener('open',()=>window.__rt.wsOpen=(window.__rt.wsOpen||0)+1);
      ws.addEventListener('close',()=>window.__rt.wsClose=(window.__rt.wsClose||0)+1);
      return ws;};
    window.WebSocket.prototype=Orig.prototype;
  });
  const p=await ctx.newPage();
  p.on('console',m=>{if(/CDA-WebRTC/.test(m.text()))console.log(`   [${n}] ${m.text().slice(0,110)}`);});
  await p.goto(APP+'/#/login',{waitUntil:'networkidle'});await E(1200);
  await p.fill('input[name="cda-utilizador"]','002399714LA030');await p.fill('input[name="cda-senha"]','123456789');
  await p.click('button:has-text("ENTRAR NO PORTAL")');await E(5500);
  await p.locator('button:has-text("VÍDEO-ATENDIMENTO")').first().click().catch(()=>{});await E(2500);
  const c=p.locator('xpath=//h5[contains(.,"TESTE-INTEROP-VIDEO-1794826050906")]/ancestor::div[contains(@class,"p-4")][1]').first();
  if(await c.count()){await c.click().catch(()=>{});await E(1000);}
  await p.locator('button:has-text("ENTRAR")').filter({hasNotText:'PRIVADO'}).first().click({timeout:5000}).catch(()=>{});
  await E(6000);
  console.log(n,'websockets:',JSON.stringify(await p.evaluate(()=>window.__rt)));
  return p;
 };
 await abrir('A');await abrir('B');
 await b.close();
})();
