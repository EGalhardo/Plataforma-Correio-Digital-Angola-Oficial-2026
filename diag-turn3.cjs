const { chromium } = require('playwright');
const C=[
 {nome:'a.relay.metered.ca (openrelay creds)',servers:[{urls:['turn:a.relay.metered.ca:80','turns:a.relay.metered.ca:443','turn:a.relay.metered.ca:443?transport=tcp'],username:'openrelayproject',credential:'openrelayproject'}]},
 {nome:'global.relay.metered.ca',servers:[{urls:['turn:global.relay.metered.ca:80','turns:global.relay.metered.ca:443'],username:'openrelayproject',credential:'openrelayproject'}]},
 {nome:'relay1.expressturn (free)',servers:[{urls:['turn:relay1.expressturn.com:3478'],username:'ef9MLVX0RQD5T0T5C0',credential:'Z0mDVN1MJy6Oo8jH'}]},
];
(async()=>{
 const b=await chromium.launch();const p=await (await b.newContext()).newPage();
 await p.goto('https://correio-digital-angola-oficial.vercel.app/#/login',{waitUntil:'domcontentloaded'});
 for(const c of C){
  const r=await p.evaluate(async(cfg)=>{
    const pc=new RTCPeerConnection({iceServers:cfg});pc.createDataChannel('x');
    const cands=[];pc.onicecandidate=e=>{if(e.candidate)cands.push(e.candidate.candidate);};
    await pc.setLocalDescription(await pc.createOffer());
    await new Promise(r=>setTimeout(r,9000));pc.close();
    return {relay:cands.filter(x=>x.includes('typ relay')).length,total:cands.length};
  },c.servers);
  console.log(c.nome.padEnd(38),JSON.stringify(r));
 }
 await b.close();
})();
