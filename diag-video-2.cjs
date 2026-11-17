const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=(ms)=>new Promise(r=>setTimeout(r,ms));
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
async function entrar(b,o){
 const ctx=await b.newContext({viewport:o.vp,locale:'pt-PT',permissions:['camera','microphone'],...(o.ua?{userAgent:o.ua}:{})});
 const p=await ctx.newPage();
 p.on('console',m=>{const t=m.text();if(/CDA-WebRTC/.test(t))console.log(`  [${o.tag}] ${t.slice(0,120)}`);});
 await p.goto(`${APP}${o.base}/#/login`,{waitUntil:'networkidle'});await E(1200);
 await p.fill('input[name="cda-utilizador"]',o.u);await p.fill('input[name="cda-senha"]',o.s);
 await p.click('button:has-text("ENTRAR NO PORTAL")');await E(5500);
 await p.locator('button:has-text("VÍDEO-ATENDIMENTO")').first().click().catch(()=>{});await E(2500);
 return p;
}
async function entrarSessao(p,sess){
 const c=p.locator(`xpath=//h5[contains(.,"${sess}")]/ancestor::div[contains(@class,"p-4")][1]`).first();
 if(await c.count()){await c.click().catch(()=>{});await E(1000);}
 await p.locator('button:has-text("ENTRAR")').filter({hasNotText:'PRIVADO'}).first().click({timeout:5000}).catch(()=>{});
 await E(6000);
}
const st=(p)=>p.evaluate(()=>({ videos:[...document.querySelectorAll('video')].map(v=>({id:v.dataset.testid||'local',px:[v.videoWidth,v.videoHeight],
  tracks:v.srcObject?v.srcObject.getTracks().map(t=>t.kind+':'+t.readyState).join(','):'-'})),
  texto:(document.querySelector('#webrtc-video-call-container')?.innerText||'').replace(/\s+/g,' ').slice(0,120)}));
(async()=>{
 const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 const inst=await entrar(b,{base:'/institucional',u:'AGT-LMM-01',s:'123456789',vp:{width:1440,height:900},tag:'INST'});
 await entrarSessao(inst,'TESTE-INTEROP-VIDEO-1794826050906');
 console.log('INST sozinha:',JSON.stringify(await st(inst)));
 const cid=await entrar(b,{base:'',u:'002399714LA030',s:'123456789',vp:{width:390,height:844},ua:UA,tag:'CID'});
 await entrarSessao(cid,'TESTE-INTEROP-VIDEO-1794826050906');
 for(let i=1;i<=3;i++){
   await E(6000);
   console.log(`\n--- t=${i*6}s ---`);
   console.log(' INST:',JSON.stringify(await st(inst)));
   console.log(' CID :',JSON.stringify(await st(cid)));
 }
 await inst.screenshot({path:'test-artifacts/final-inst.png'});
 await cid.screenshot({path:'test-artifacts/final-cid.png'});
 await b.close();
})();
