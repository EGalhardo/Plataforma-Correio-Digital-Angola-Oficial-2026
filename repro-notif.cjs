const { chromium } = require('playwright');
const fs = require('fs');
const env = {}; for (const l of fs.readFileSync('.env','utf8').split('\n')) { const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,''); }
const SR=env.SUPABASE_SERVICE_ROLE_KEY, U=env.SUPABASE_URL;
const H={apikey:SR,Authorization:`Bearer ${SR}`,'Content-Type':'application/json'};
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=ms=>new Promise(r=>setTimeout(r,ms));
const q=async s=>(await fetch(`${U}/rest/v1/${s}`,{headers:H})).json();
(async()=>{
  // 1) notificações recentes da instituição AGT-LMM-01
  const notifs = await q(`notifications?select=id,target_bi,title,message,target_tab,read_at,created_at&target_bi=eq.AGT-LMM-01&order=id.desc&limit=8`);
  console.log('notifs AGT-LMM-01:', JSON.stringify(notifs,null,1));
  // 2) notificações do cidadão
  const nc = await q(`notifications?select=id,target_bi,title,message,target_tab,read_at&target_bi=eq.002399714LA030&order=id.desc&limit=6`);
  console.log('\nnotifs cidadão:', JSON.stringify(nc,null,1));
})();
