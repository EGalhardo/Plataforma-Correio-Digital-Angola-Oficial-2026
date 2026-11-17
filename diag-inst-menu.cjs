const { chromium } = require('playwright');
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
  const n=await perfis.count();
  console.log('cópias do menu:',n);
  for(let i=0;i<n;i++){
    const vis=await perfis.nth(i).isVisible().catch(()=>false);
    console.log('  cópia',i,'visível:',vis);
  }
  for(let i=0;i<n;i++){
    if(!await perfis.nth(i).isVisible().catch(()=>false)) continue;
    await perfis.nth(i).click().catch(e=>console.log('  click erro:',e.message.slice(0,80)));
    await E(1800);
    console.log('  após clique na cópia',i,': menu-decomposicao=',await p.locator('[data-testid="menu-decomposicao"]').count(),
      'menu-notificacoes=',await p.locator('[data-testid="menu-notificacoes"]').count());
    await p.screenshot({path:`test-artifacts/diag-inst-menu-${i}.png`});
    break;
  }
  console.log('texto do header:', (await p.locator('header').first().innerText().catch(()=>'')).replace(/\s+/g,' ').slice(0,200));
  await b.close();
})();
