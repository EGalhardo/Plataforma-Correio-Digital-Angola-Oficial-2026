const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=(ms)=>new Promise(r=>setTimeout(r,ms));
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function dentro(b,o){
 const ctx=await b.newContext({viewport:o.vp,locale:'pt-PT',permissions:['camera','microphone'],...(o.ua?{userAgent:o.ua}:{})});
 const p=await ctx.newPage();
 await p.goto(`${APP}${o.base}/#/login`,{waitUntil:'networkidle'});await E(1200);
 await p.fill('input[name="cda-utilizador"]',o.u);await p.fill('input[name="cda-senha"]',o.s);
 await p.click('button:has-text("ENTRAR NO PORTAL")');await E(5500);
 await p.locator('button:has-text("VÍDEO-ATENDIMENTO")').first().click().catch(()=>{});await E(2500);
 // abrir a sessão e entrar
 const cartao=p.locator('xpath=//h5[contains(.,"teste 1234")]/ancestor::div[contains(@class,"p-4")][1]').first();
 if(await cartao.count()){await cartao.click().catch(()=>{});await E(1200);}
 await p.locator('button:has-text("ENTRAR")').filter({hasNotText:'PRIVADO'}).first().click({timeout:6000}).catch(()=>{});
 await E(7000);
 return p;
}
const medir=(p)=>p.evaluate(()=>{
  const box=document.querySelector('#webrtc-video-call-container');
  const grande=box?box.querySelector('.aspect-video'):null;
  const rem=document.querySelector('[data-testid="remote-video"]');
  const r=(e)=>{if(!e)return null;const b=e.getBoundingClientRect();const s=getComputedStyle(e);
    return {w:Math.round(b.width),h:Math.round(b.height),bg:s.backgroundColor,op:s.opacity};};
  return {container:r(box),grande:r(grande),remoto:r(rem), remotoPx:rem?[rem.videoWidth,rem.videoHeight]:null,
    overlays:[...document.querySelectorAll('#webrtc-video-call-container .absolute.inset-0')].map(e=>e.innerText.replace(/\s+/g,' ').slice(0,40)),
    texto:box?box.innerText.replace(/\s+/g,' ').slice(0,140):'SEM CONTAINER'};
});
(async()=>{
 const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 const cid=await dentro(b,{base:'',u:'002399714LA030',s:'123456789',vp:{width:390,height:844},ua:UA});
 console.log('CID mobile:',JSON.stringify(await medir(cid),null,1));
 await cid.screenshot({path:'test-artifacts/sozinho-mobile.png'});
 const inst=await dentro(b,{base:'/institucional',u:'AGT-LMM-01',s:'123456789',vp:{width:1366,height:768}});
 console.log('\nINST desktop:',JSON.stringify(await medir(inst),null,1));
 await inst.screenshot({path:'test-artifacts/sozinho-desktop.png'});
 await b.close();
})();
