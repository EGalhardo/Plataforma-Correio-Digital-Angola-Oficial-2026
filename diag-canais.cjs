const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=(ms)=>new Promise(r=>setTimeout(r,ms));
async function entrar(b,o){
 const ctx=await b.newContext({viewport:o.vp,locale:'pt-PT',permissions:['camera','microphone']});
 const p=await ctx.newPage();
 if(o.bloquearSig) await p.route('**/api/webrtc/**',r=>r.abort('failed'));
 if(o.bloquearRT) await p.route('**/realtime/**',r=>r.abort('failed'));
 await p.goto(`${APP}/#/login`,{waitUntil:'networkidle'});await E(1200);
 await p.fill('input[name="cda-utilizador"]',o.u);await p.fill('input[name="cda-senha"]',o.s);
 await p.click('button:has-text("ENTRAR NO PORTAL")');await E(5000);
 await p.locator('button:has-text("VÍDEO-ATENDIMENTO")').first().click().catch(()=>{});await E(2000);
 return p;
}
async function sessao(p,s){
 const c=p.locator(`xpath=//h5[contains(.,"${s}")]/ancestor::div[contains(@class,"p-4")][1]`).first();
 if(await c.count()){await c.click().catch(()=>{});await E(1000);}
 await p.locator('button:has-text("ENTRAR")').filter({hasNotText:'PRIVADO'}).first().click({timeout:5000}).catch(()=>{});
 await E(12000);
}
const ok=(p)=>p.evaluate(()=>{const v=document.querySelector('[data-testid="remote-video"]');return {vw:v?v.videoWidth:0,tr:v&&v.srcObject?v.srcObject.getTracks().map(t=>t.kind).join(','):'-'};});
(async()=>{
 const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 const CEN=[
  {n:'A. tudo ligado (controlo)',a:{},c:{}},
  {n:'B. SEM /api/webrtc (só Supabase Realtime)',a:{bloquearSig:true},c:{bloquearSig:true}},
  {n:'C. SEM Supabase Realtime (só /api/webrtc)',a:{bloquearRT:true},c:{bloquearRT:true}},
 ];
 for(const c of CEN){
  const inst=await entrar(b,{u:'AGT-LMM-01',s:'123456789',vp:{width:1200,height:800},...c.a});
  await sessao(inst,'TESTE-INTEROP-VIDEO-1794826050906');
  const cid=await entrar(b,{u:'002399714LA030',s:'123456789',vp:{width:1200,height:800},...c.c});
  await sessao(cid,'TESTE-INTEROP-VIDEO-1794826050906');
  await E(6000);
  const [i,cd]=[await ok(inst),await ok(cid)];
  console.log(`${c.n}\n   INST ${JSON.stringify(i)}  CID ${JSON.stringify(cd)}  → ${i.vw>0&&cd.vw>0?'LIGOU':'NÃO ligou'}`);
  await inst.context().close();await cid.context().close();
 }
 await b.close();
})();
