const { chromium } = require('playwright');
const C=[
 {n:'numb.viagenie.ca',s:[{urls:['turn:numb.viagenie.ca:3478','turns:numb.viagenie.ca:5349'],username:'webrtc@live.com',credential:'muazkh'}]},
 {n:'relay1.expressturn (real acct?)',s:[{urls:['turn:relay1.expressturn.com:3478'],username:'000000002068309060',credential:'qXj0FmHhcyMgTzMBO1'}]},
 {n:'metered global port80',s:[{urls:['turn:global.relay.metered.ca:80?transport=tcp','turn:global.relay.metered.ca:443?transport=tcp'],username:'openrelayproject',credential:'openrelayproject'}]},
];
(async()=>{
 const b=await chromium.launch();const p=await (await b.newContext()).newPage();
 await p.goto('https://correio-digital-angola-oficial.vercel.app/#/login',{waitUntil:'domcontentloaded'});
 for(const c of C){
  const r=await p.evaluate(async(cfg)=>{const pc=new RTCPeerConnection({iceServers:cfg});pc.createDataChannel('x');
    const cd=[];pc.onicecandidate=e=>{if(e.candidate)cd.push(e.candidate.candidate);};
    await pc.setLocalDescription(await pc.createOffer());await new Promise(r=>setTimeout(r,10000));pc.close();
    return {relay:cd.filter(x=>x.includes('typ relay')).length,total:cd.length};},c.s);
  console.log(c.n.padEnd(32),JSON.stringify(r));
 }
 await b.close();
})();
