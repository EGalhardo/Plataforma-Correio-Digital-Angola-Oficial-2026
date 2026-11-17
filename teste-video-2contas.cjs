const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=(ms)=>new Promise(r=>setTimeout(r,ms));
const SESS='teste 1234';   // sessão com estado definido, usada nas duas contas
const UA_MOB='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function entrar(b,{base,entrada,senha,viewport,ua,label}){
  const ctx=await b.newContext({viewport,locale:'pt-PT',permissions:['camera','microphone'],
    args:[],...(ua?{userAgent:ua}:{})});
  const p=await ctx.newPage();
  p.on('console',m=>{const t=m.text();if(/CDA-WebRTC|Estado da liga|iceConfig|TURN|STUN/.test(t))console.log(`   [${label}] ${t.slice(0,120)}`);});
  await p.goto(`${APP}${base}/#/login`,{waitUntil:'networkidle'});
  await E(1200);
  await p.fill('input[name="cda-utilizador"]',entrada);
  await p.fill('input[name="cda-senha"]',senha);
  await p.click('button:has-text("ENTRAR NO PORTAL")');await E(5500);
  return {ctx,p};
}

// estado real dos dois elementos <video> e dos media tracks
const lerEcrãs=(p)=>p.evaluate(()=>{
  const q=(s)=>document.querySelector(s);
  const info=(v)=>{
    if(!v) return null;
    const r=v.getBoundingClientRect();
    const so=v.srcObject;
    const vt=so?so.getVideoTracks():[];
    return {w:Math.round(r.width),h:Math.round(r.height),visivel:r.width>0&&r.height>0,
      temStream:!!so, tracks:so?so.getTracks().map(t=>`${t.kind}:${t.readyState}`):[],
      videoLive:vt.filter(t=>t.readyState==='live').length,
      vw:v.videoWidth,vh:v.videoHeight, pronta:v.readyState, pausado:v.paused, muted:v.muted,
      opacidade:getComputedStyle(v).opacity};
  };
  const vids=[...document.querySelectorAll('video')];
  return {quantos:vids.length, remoto:info(q('[data-testid="remote-video"]')),
    todos:vids.map(v=>({testid:v.getAttribute('data-testid')||'(sem id)',...info(v)})),
    texto:(document.body.innerText||'').replace(/\s+/g,' ').slice(0,220)};
});

(async()=>{
  const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
  const inst=await entrar(b,{base:'/institucional',entrada:'AGT-LMM-01',senha:'123456789',viewport:{width:1440,height:900},label:'INST'});
  const cid =await entrar(b,{base:'',entrada:'002399714LA030',senha:'123456789',viewport:{width:390,height:844},ua:UA_MOB,label:'CID-MOB'});

  for (const c of [inst,cid]) {
    await c.p.locator('button:has-text("VÍDEO-ATENDIMENTO")').first().click().catch(()=>{});
    await E(2500);
  }
  // entrar na MESMA sessão nas duas contas
  console.log('\n→ instituição entra na sessão');
  await inst.p.locator(`text=${SESS}`).first().click().catch(()=>{});
  await E(1200);
  await inst.p.locator('button:has-text("ENTRAR")').first().click().catch((e)=>console.log('   inst ENTRAR:',e.message.slice(0,60)));
  await E(4000);
  console.log('→ cidadão entra na sessão');
  await cid.p.locator(`text=${SESS}`).first().click().catch(()=>{});
  await E(1200);
  await cid.p.locator('button:has-text("ENTRAR")').first().click().catch((e)=>console.log('   cid ENTRAR:',e.message.slice(0,60)));
  await E(9000);

  for (const [n,c] of [['INSTITUIÇÃO (desktop)',inst],['CIDADÃO (mobile)',cid]]) {
    const e=await lerEcrãs(c.p);
    console.log(`\n=== ${n} ===`);
    console.log(' vídeos na página:',e.quantos);
    e.todos.forEach((v,i)=>console.log(`  [${i}] ${v.testid} ${v.w}x${v.h} vis=${v.visivel} stream=${v.temStream} tracks=[${v.tracks}] video=${v.vw}x${v.vh} ready=${v.pronta} paused=${v.pausado} muted=${v.muted} op=${v.opacidade}`));
    console.log(' texto:',e.texto.slice(0,150));
    await c.p.screenshot({path:`test-artifacts/video-${n.includes('INST')?'inst':'cid'}-chamada.png`});
  }
  await b.close();
})();
