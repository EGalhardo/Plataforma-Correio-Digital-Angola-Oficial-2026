const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
async function entrar(b,o){
 const ctx=await b.newContext({viewport:o.vp,locale:'pt-PT',permissions:['camera','microphone'],...(o.ua?{userAgent:o.ua}:{})});
 const p=await ctx.newPage();
 await p.goto(`${APP}${o.base}/#/login`,{waitUntil:'networkidle'});await E(1200);
 await p.fill('input[name="cda-utilizador"]',o.u);await p.fill('input[name="cda-senha"]',o.s);
 await p.click('button:has-text("ENTRAR NO PORTAL")');await E(5200);
 await p.locator('button:has-text("VÍDEO-ATENDIMENTO")').first().click().catch(()=>{});await E(2500);
 const c=p.locator('xpath=//h5[contains(.,"TESTE-INTEROP-VIDEO-1794826050906")]/ancestor::div[contains(@class,"p-4")][1]').first();
 if(await c.count()){await c.click().catch(()=>{});await E(1200);}
 await p.locator('button:has-text("ENTRAR")').filter({hasNotText:'PRIVADO'}).first().click({timeout:6000}).catch(()=>{});
 return p;
}
(async()=>{
 const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 const inst=await entrar(b,{base:'/institucional',u:'AGT-LMM-01',s:'123456789',vp:{width:1440,height:900}});
 const cid=await entrar(b,{base:'',u:'002399714LA030',s:'123456789',vp:{width:390,height:844},ua:UA});
 await E(16000);
 for(const [n,p] of [['inst',inst],['cid',cid]]){
   const m=await p.evaluate(()=>{const v=document.querySelector('[data-testid="remote-video"]');
     const g=document.querySelector('[data-cda-ecra-grande]');const r=g.getBoundingClientRect();
     return {remoto:[v.videoWidth,v.videoHeight],ecra:[Math.round(r.width),Math.round(r.height)],
       fundo:getComputedStyle(g).backgroundColor, opacidadeVideo:getComputedStyle(v).opacity,
       texto:document.querySelector('#webrtc-video-call-container').innerText.replace(/\s+/g,' ').slice(0,80)};});
   console.log(n,JSON.stringify(m));
   await p.screenshot({path:`test-artifacts/video-final-${n}.png`});
 }
 await b.close();
})();
