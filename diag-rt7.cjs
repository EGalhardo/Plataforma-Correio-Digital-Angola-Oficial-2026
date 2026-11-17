const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
(async()=>{
 const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({viewport:{width:1200,height:800},permissions:['camera','microphone']});
 const p=await ctx.newPage();
 p.on('console',m=>{const t=m.text();if(/CDA-WebRTC|Supabase|realtime/i.test(t))console.log('  LOG:',t.slice(0,160));});
 p.on('websocket',ws=>{console.log('  WS aberto:',ws.url().slice(0,50));ws.on('framesent',f=>{const d=String(f.payload);if(/webrtc/.test(d))console.log('  → enviado:',d.slice(0,100));});ws.on('framereceived',f=>{const d=String(f.payload);if(/webrtc/.test(d))console.log('  ← recebido:',d.slice(0,100));});});
 await p.goto(APP+'/#/login',{waitUntil:'networkidle'});await E(1200);
 await p.fill('input[name="cda-utilizador"]','002399714LA030');await p.fill('input[name="cda-senha"]','123456789');
 await p.click('button:has-text("ENTRAR NO PORTAL")');await E(5000);
 await p.locator('button:has-text("VÍDEO-ATENDIMENTO")').first().click().catch(()=>{});await E(2000);
 const c=p.locator('xpath=//h5[contains(.,"TESTE-INTEROP-VIDEO-1794826050906")]/ancestor::div[contains(@class,"p-4")][1]').first();
 if(await c.count()){await c.click().catch(()=>{});await E(1000);}
 await p.locator('button:has-text("ENTRAR")').filter({hasNotText:'PRIVADO'}).first().click({timeout:5000}).catch(()=>{});
 await E(14000);
 await b.close();
})();
