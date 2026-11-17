const { chromium } = require('playwright');
const CANDIDATOS=[
 {nome:'openrelay (actual)',urls:['turn:openrelay.metered.ca:80','turn:openrelay.metered.ca:3478','turns:openrelay.metered.ca:443'],username:'openrelayproject',credential:'openrelayproject'},
 {nome:'freeturn.net',urls:['turn:freeturn.net:3478','turn:freeturn.net:3479','turns:freeturn.net:5349'],username:'free',credential:'free'},
 {nome:'metered standard (demo)',urls:['turn:standard.relay.metered.ca:80','turns:standard.relay.metered.ca:443'],username:'openrelayproject',credential:'openrelayproject'},
];
(async()=>{
 const b=await chromium.launch();
 const p=await (await b.newContext()).newPage();
 await p.goto('https://correio-digital-angola-oficial.vercel.app/#/login',{waitUntil:'domcontentloaded'});
 for(const c of CANDIDATOS){
  const r=await p.evaluate(async(c)=>{
    const pc=new RTCPeerConnection({iceServers:[{urls:c.urls,username:c.username,credential:c.credential}]});
    pc.createDataChannel('x');const cands=[];
    pc.onicecandidate=e=>{if(e.candidate)cands.push(e.candidate.candidate);};
    await pc.setLocalDescription(await pc.createOffer());
    await new Promise(r=>setTimeout(r,8000));
    pc.close();
    return {relay:cands.filter(x=>x.includes('typ relay')).length, srflx:cands.filter(x=>x.includes('typ srflx')).length, total:cands.length};
  },c);
  console.log(c.nome.padEnd(26), JSON.stringify(r));
 }
 await b.close();
})();
