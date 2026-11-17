const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1400,height:1250},locale:'pt-PT'});
  const p=await ctx.newPage();
  await p.goto(`${APP}/institucional#/login`,{waitUntil:'networkidle'}); await E(1500);
  await p.fill('input[name="cda-utilizador"]','AGT-LMM-01'); await p.fill('input[name="cda-senha"]','123456789');
  await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(9000);
  await p.locator('button:has-text("Perfil")').first().click().catch(()=>{}); await E(4500);
  const btn = p.locator('button:has-text("Alterar Senha & 2FA")').first();
  console.log('botão "Alterar Senha & 2FA":', await btn.count());
  if(await btn.count()){ await btn.click(); await E(2500); }
  const t=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
  console.log('popup abriu:', /SEGURANÇA DE AGENTE DO ESTADO/i.test(t));
  console.log('campo palavra-passe actual:', await p.locator('input[placeholder="Palavra-passe actual"]').count());
  console.log('botão actualizar:', await p.locator('button:has-text("Actualizar Palavra-passe")').count());
  // tentar preencher
  await p.locator('input[placeholder="Palavra-passe actual"]').first().fill('123456789').catch(()=>{});
  await p.locator('input[placeholder="Nova palavra-passe (mín. 8 caracteres)"]').first().fill('TesteSenha123').catch(()=>{});
  await p.locator('input[placeholder="Confirmar nova palavra-passe"]').first().fill('TesteSenha123').catch(()=>{});
  await p.locator('button:has-text("Actualizar Palavra-passe")').first().click().catch(()=>{});
  await E(6000);
  const t2=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
  const m=t2.match(/(Serviço temporariamente indisponível|Sessão segura inactiva|Palavra-passe actualizada|não coincidem|pelo menos 8)[^.]*/gi);
  console.log('resultado:', m ? m.slice(0,3) : '(sem mensagem)');
  await p.screenshot({path:'test-artifacts/diag-inst-senha.png',fullPage:false});
  await b.close();
})();
