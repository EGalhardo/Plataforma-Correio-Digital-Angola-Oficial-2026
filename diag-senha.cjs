const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch();
  for (const [nome,u,senha,area] of [['CIDADÃO','002399714LA030','123456789',''],['INSTITUIÇÃO','AGT-LMM-01','123456789','institucional/']]) {
    const ctx=await b.newContext({viewport:{width:1400,height:1250},locale:'pt-PT'});
    const p=await ctx.newPage();
    p.on('console',m=>{const t=m.text(); if(/AUTH|senha|password|Sess/i.test(t)) console.log('   [console]',t.slice(0,150));});
    await p.goto(`${APP}/${area}#/login`,{waitUntil:'networkidle'}); await E(1500);
    await p.fill('input[name="cda-utilizador"]',u); await p.fill('input[name="cda-senha"]',senha);
    await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(9000);
    console.log(`\n### ${nome}`);
    // sessão de nuvem presente?
    const sess = await p.evaluate(()=>{
      const k=Object.keys(localStorage).filter(k=>k.includes('auth-token'));
      return k.map(k=>k+' => '+(localStorage.getItem(k)||'').slice(0,40));
    });
    console.log('   localStorage auth-token:', JSON.stringify(sess));
    // abrir Perfil
    await p.locator('button:has-text("Perfil")').first().click().catch(()=>{}); await E(4000);
    const btn = p.locator('button:has-text("Alterar Palavra-passe"), button:has-text("Alterar Palavra")').first();
    console.log('   botão alterar palavra-passe:', await btn.count());
    if(await btn.count()){ await btn.click(); await E(2500); }
    const campos = p.locator('input[placeholder="Palavra-passe actual"]');
    console.log('   campo senha actual visível:', await campos.count() ? await campos.first().isVisible() : false);
    // preencher
    await p.locator('input[placeholder="Palavra-passe actual"]').first().fill(senha).catch(()=>{});
    await p.locator('input[placeholder="Nova palavra-passe (mín. 8 caracteres)"]').first().fill('TesteSenha123').catch(()=>{});
    await p.locator('input[placeholder="Confirmar nova palavra-passe"]').first().fill('TesteSenha123').catch(()=>{});
    await p.locator('button:has-text("Actualizar Palavra-passe")').first().click().catch(()=>{});
    await E(6000);
    const t=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
    const m=t.match(/[^.]*(senha|palavra-passe)[^.]*\./gi);
    console.log('   mensagens:', m ? m.slice(0,4) : '(nenhuma)');
    await p.screenshot({path:`test-artifacts/diag-senha-${nome}.png`,fullPage:false});
    await ctx.close();
  }
  await b.close();
})();
