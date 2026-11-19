const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1400,height:900},locale:'pt-PT'});
  const p=await ctx.newPage();
  await p.goto(`${APP}/#/login`,{waitUntil:'networkidle'}); await E(1500);
  await p.fill('input[name="cda-utilizador"]','002399714LA030'); await p.fill('input[name="cda-senha"]','123456789');
  await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(9000);
  for (const espera of [0, 4000, 8000]) {
    await E(espera);
    const caixas = await p.evaluate(()=>{
      const out=[];
      document.querySelectorAll('*').forEach(el=>{
        const cs=getComputedStyle(el);
        if(cs.position!=='fixed') return;
        const r=el.getBoundingClientRect();
        if(r.top>260 || r.right < window.innerWidth-620 || r.width<40 || r.height<20) return;
        const bg=cs.backgroundColor;
        const m=bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if(!m) return;
        const [_,R,G,B]=m.map(Number);
        const escuro = R<70 && G<70 && B<90;
        if(!escuro) return;
        const txt=(el.innerText||'').replace(/\s+/g,' ').slice(0,120);
        if(!txt) return;
        out.push({top:Math.round(r.top), right:Math.round(window.innerWidth-r.right), w:Math.round(r.width), bg, txt});
      });
      return out;
    });
    console.log(`\n[+${espera}ms] caixas escuras fixas no topo direito:`, caixas.length);
    caixas.forEach(c=>console.log('   ', JSON.stringify(c)));
  }
  await p.screenshot({path:'test-artifacts/diag-topo.png'});
  await b.close();
})();
