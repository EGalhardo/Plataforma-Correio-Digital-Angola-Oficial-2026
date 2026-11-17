const { chromium } = require('playwright');
const sets=[
 {n:'relay.metered.ca udp80',u:['turn:relay.metered.ca:80'],un:'openrelayproject',cr:'openrelayproject'},
 {n:'relay.metered.ca tcp80',u:['turn:relay.metered.ca:80?transport=tcp'],un:'openrelayproject',cr:'openrelayproject'},
 {n:'relay.metered.ca tls443',u:['turns:relay.metered.ca:443?transport=tcp'],un:'openrelayproject',cr:'openrelayproject'},
 {n:'a.relay tls443',u:['turns:a.relay.metered.ca:443?transport=tcp'],un:'openrelayproject',cr:'openrelayproject'},
];
(async()=>{
 const b=await chromium.launch();const p=await (await b.newContext()).newPage();
 await p.goto('https://correio-digital-angola-oficial.vercel.app/#/login',{waitUntil:'domcontentloaded'});
 for(const s of sets){
  const r=await p.evaluate(async(c)=>{const pc=new RTCPeerConnection({iceServers:[{urls:c.u,username:c.un,credential:c.cr}]});
   pc.createDataChannel('x');const cd=[];pc.onicecandidate=e=>{if(e.candidate)cd.push(e.candidate.candidate);};
   await pc.setLocalDescription(await pc.createOffer());await new Promise(r=>setTimeout(r,10000));pc.close();
   return {relay:cd.filter(x=>x.includes('typ relay')).length};},s);
  console.log(s.n.padEnd(24),JSON.stringify(r));
 }
 await b.close();
})();
