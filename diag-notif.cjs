const { chromium } = require('playwright');
const fs = require('fs');
const env = {}; for (const l of fs.readFileSync('.env','utf8').split('\n')) { const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,''); }
const SR=env.SUPABASE_SERVICE_ROLE_KEY, U=env.SUPABASE_URL;
const H={apikey:SR,Authorization:`Bearer ${SR}`,'Content-Type':'application/json'};
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=ms=>new Promise(r=>setTimeout(r,ms));
async function entrar(b, u, s) {
  const ctx = await b.newContext({ viewport:{width:1400,height:1250}, locale:'pt-PT' });
  const p = await ctx.newPage();
  await p.goto(`${APP}/#/login`,{waitUntil:'networkidle'}); await E(1400);
  await p.fill('input[name="cda-utilizador"]', u); await p.fill('input[name="cda-senha"]', s);
  await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(8000);
  return { ctx, p };
}
(async()=>{
  const b = await chromium.launch();
  for (const [nome,u,s] of [['CIDADÃO','002399714LA030','123456789'],['INSTITUIÇÃO','AGT-LMM-01','123456789'],['ADMIN','ADMIN-0001','987654321']]) {
    const {ctx,p} = await entrar(b,u,s);
    // abrir o sino: procurar botão com badge / aria
    const sino = p.locator('button[aria-label*="otifica" i], button[title*="otifica" i]').first();
    const existe = await sino.count();
    if (existe) { await sino.click(); await E(2000); }
    const txt = (await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
    const m = txt.match(/Notificações[^]*?(?=Ver Centro|$)/i);
    console.log(`\n### ${nome} — sino encontrado: ${existe? 'sim':'NÃO'}`);
    console.log('   dropdown:', m ? m[0].slice(0,300) : '(não abriu)');
    const itens = await p.locator('div[class*="divide-y"] > div[class*="cursor-pointer"]').count();
    console.log('   itens clicáveis no dropdown:', itens);
    await p.screenshot({path:`test-artifacts/notif-${nome}.png`,fullPage:false});
    await ctx.close();
  }
  await b.close();
})();
