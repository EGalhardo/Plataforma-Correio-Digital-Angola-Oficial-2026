const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=(ms)=>new Promise(r=>setTimeout(r,ms));
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function entrar(b,o){
  const ctx=await b.newContext({viewport:o.viewport,locale:'pt-PT',permissions:['camera','microphone'],...(o.ua?{userAgent:o.ua}:{})});
  const p=await ctx.newPage();
  p.on('console',m=>{const t=m.text();if(/CDA-WebRTC|WebRTC|liga|ofert|respost|poll|signal/i.test(t))console.log(`  [${o.label}] ${t.slice(0,150)}`);});
  p.on('pageerror',e=>console.log(`  [${o.label} ERRO] ${String(e.message).slice(0,150)}`));
  await p.goto(`${APP}${o.base}/#/login`,{waitUntil:'networkidle'});await E(1200);
  await p.fill('input[name="cda-utilizador"]',o.entrada);await p.fill('input[name="cda-senha"]',o.senha);
  await p.click('button:has-text("ENTRAR NO PORTAL")');await E(5500);
  await p.locator('button:has-text("VÍDEO-ATENDIMENTO")').first().click().catch(()=>{});await E(2500);
  return p;
}
// entra na sessão certa: clicar no cartão e depois no botão ENTRAR do cartão
async function entrarSala(p,alvo){
  const cartao=p.locator(`xpath=//h5[contains(.,"${alvo}")]/ancestor::div[contains(@class,"p-4")][1]`).first();
  if(await cartao.count()){ await cartao.click().catch(()=>{}); await E(1200); }
  const btns=p.locator('button:has-text("ENTRAR")');
  console.log('   botões ENTRAR visíveis:',await btns.count());
  await btns.filter({hasNotText:'PRIVADO'}).first().click({timeout:8000}).catch(e=>console.log('   clique falhou:',e.message.slice(0,50)));
}
(async()=>{
  const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
  const inst=await entrar(b,{base:'/institucional',entrada:'AGT-LMM-01',senha:'123456789',viewport:{width:1440,height:900},label:'INST'});
  const cid =await entrar(b,{base:'',entrada:'002399714LA030',senha:'123456789',viewport:{width:390,height:844},ua:UA,label:'CID'});
  const alvo='TESTE-INTEROP-VIDEO-1794826050906';
  console.log('\n== instituição entra ==');await entrarSala(inst,alvo);await E(5000);
  console.log('   inst está em chamada?',await inst.locator('#webrtc-video-call-container').count());
  console.log('\n== cidadão entra ==');await entrarSala(cid,alvo);await E(10000);
  console.log('   cid está em chamada?',await cid.locator('#webrtc-video-call-container').count());
  for(const [n,p] of [['INST',inst],['CID',cid]]){
    const st=await p.evaluate(()=>[...document.querySelectorAll('video')].map(v=>{const s=v.srcObject;
      return {id:v.dataset.testid||'local',vw:v.videoWidth,vh:v.videoHeight,tr:s?s.getTracks().map(t=>t.kind+':'+t.readyState).join(','):'-',paused:v.paused};}));
    console.log(`\n${n}:`,JSON.stringify(st));
    const pc=await p.evaluate(()=>window.__pcstate||null); if(pc)console.log('  pc:',pc);
  }
  await inst.screenshot({path:'test-artifacts/v-inst.png'});await cid.screenshot({path:'test-artifacts/v-cid.png'});
  await b.close();
})();
