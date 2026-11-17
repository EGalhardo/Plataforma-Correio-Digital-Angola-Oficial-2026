const APP='https://correio-digital-angola-oficial.vercel.app';
(async()=>{
 for(let i=1;i<=6;i++){
  const sala='sigtest-'+Date.now();
  const agua=Date.now()-5000;
  const r1=await fetch(APP+'/api/webrtc/signal',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({room:sala,sender:'A',type:'offer',payload:{type:'offer',offer:{sdp:'v=0 teste'}}})});
  // instâncias diferentes: 3 pedidos de poll em paralelo
  const polls=await Promise.all([1,2,3].map(()=>fetch(`${APP}/api/webrtc/poll?room=${sala}&sender=B&sinceTs=${agua}`).then(r=>r.json())));
  const entregues=polls.map(p=>Array.isArray(p.messages)?p.messages.length:0);
  console.log(`ensaio ${i}: signal=${r1.status} | entregas nos 3 polls: ${entregues.join(',')}`);
 }
})();
