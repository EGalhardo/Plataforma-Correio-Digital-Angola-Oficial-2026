const { chromium } = require('playwright');
const C=[
 {n:'turnix.io',s:[{urls:['turn:turnix.io:3478','turns:turnix.io:5349'],username:'free',credential:'free'}]},
 {n:'fastturn.net',s:[{urls:['turn:fastturn.net:3478'],username:'free',credential:'free'}]},
 {n:'xirsys demo',s:[{urls:['turn:turn.xirsys.com:80?transport=udp'],username:'webrtc',credential:'webrtc'}]},
 {n:'stun cloudflare (controlo)',s:[{urls:['stun:stun.cloudflare.com:3478']}]},
];
(async()=>{
 const b=await chromium.launch();const p=await (await b.newContext()).newPage();
 await p.goto('https://correio-digital-angola-oficial.vercel.app/#/login',{waitUntil:'domcontentloaded'});
 for(const c of C){
  const r=await p.evaluate(async(cfg)=>{const pc=new RTCPeerConnection({iceServers:cfg});pc.createDataChannel('x');
    const cd=[];pc.onicecandidate=e=>{if(e.candidate)cd.push(e.candidate.candidate);};
    await pc.setLocalDescription(await pc.createOffer());await new Promise(r=>setTimeout(r,9000));pc.close();
    return {relay:cd.filter(x=>x.includes('typ relay')).length,srflx:cd.filter(x=>x.includes('typ srflx')).length};},c.s);
  console.log(c.n.padEnd(28),JSON.stringify(r));
 }
 await b.close();
})();
