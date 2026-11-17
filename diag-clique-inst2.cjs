const { chromium } = require('playwright');
const fs=require('fs');
const env={};for(const l of fs.readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const H={apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1400,height:1250},locale:'pt-PT'});
  const p=await ctx.newPage();
  await p.goto(`${APP}/#/institucional`,{waitUntil:'networkidle'}); await E(1400);
  await p.fill('input[name="cda-utilizador"]','AGT-LMM-01'); await p.fill('input[name="cda-senha"]','123456789');
  await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(9000);
  const perfis=p.locator('[aria-label="Menu de Perfil e Notificações"]');
  for(let i=0;i<await perfis.count();i++){ const v=await perfis.nth(i).isVisible().catch(()=>false); if(v){ await perfis.nth(i).click(); break; } }
  await E(2000);
  const itens=p.locator('[data-testid="menu-item-notificacao"]');
  console.log('itens no menu:', await itens.count());
  let primeiro=null; for(let i=0;i<await itens.count();i++){ if(await itens.nth(i).isVisible().catch(()=>false)){ primeiro=itens.nth(i); break; } }
  console.log('texto do 1.º:', (await primeiro.innerText()).replace(/\s+/g,' '));
  await primeiro.click(); await E(8000);
  const t=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
  console.log('URL/hash:', p.url());
  console.log('tem "Crie e realize inquéritos":', /Crie e realize inquéritos/i.test(t));
  console.log('pastas normais:',await p.locator('[data-testid="sondagem-pasta"]').count(),'| pastas IA:',await p.locator('[data-testid="inquerito-ia-pasta"]').count(),'| destaques:',await p.locator('[data-destaque="sim"]').count());
  console.log('excerto:', t.slice(0,300));
  await p.screenshot({path:'test-artifacts/diag-clique-inst2.png',fullPage:true});
  await b.close();
})();
