const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch();
 const p=await (await b.newContext()).newPage();
 await p.goto('https://correio-digital-angola-oficial.vercel.app/#/login',{waitUntil:'domcontentloaded'});
 const r=await p.evaluate(async()=>{
   const ice=await (await fetch('/api/webrtc/ice')).json();
   const srvs=[...(ice.ice.stun||[]).map(u=>({urls:u}))];
   if(ice.ice.turn) srvs.push({urls:ice.ice.turn.urls,username:ice.ice.turn.username,credential:ice.ice.turn.credential});
   const pc=new RTCPeerConnection({iceServers:srvs});
   pc.createDataChannel('x');
   const cands=[];
   pc.onicecandidate=e=>{if(e.candidate)cands.push(e.candidate.candidate);};
   await pc.setLocalDescription(await pc.createOffer());
   await new Promise(res=>setTimeout(res,9000));
   pc.close();
   return {servidores:srvs.length, total:cands.length,
     relay:cands.filter(c=>c.includes('typ relay')).length,
     srflx:cands.filter(c=>c.includes('typ srflx')).length,
     host:cands.filter(c=>c.includes('typ host')).length,
     exemplos:cands.slice(0,4).map(c=>c.split(' ').slice(4,8).join(' '))};
 });
 console.log(JSON.stringify(r,null,1));
 await b.close();
})();
