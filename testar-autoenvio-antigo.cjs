// A linha AGT-LMM → AGT-LMM do relato: responder agora deve avisar, não endereçar a si mesmo
const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1400,height:950},locale:'pt-PT'});
 const p=await ctx.newPage();
 await p.goto(`${APP}/institucional/#/login`,{waitUntil:'networkidle'});await E(1300);
 await p.fill('input[name="cda-utilizador"]','AGT-LMM-01');await p.fill('input[name="cda-senha"]','123456789');
 await p.click('button:has-text("ENTRAR NO PORTAL")');await E(6000);
 await p.locator('button:has-text("Correio")').first().click();await E(3000);
 await p.locator('text=ENVIADAS').first().click();await E(3000);
 // a mensagem «OI» original (AGT-LMM → AGT-LMM)
 await p.locator('tr:has-text("#1794922068080955")').first().locator('button').first().click();await E(2500);
 await p.locator('button:has-text("Responder")').first().click();await E(2500);
 const dest=await p.locator('input[placeholder*="BI" i]').first().inputValue().catch(()=>'');
 const aviso=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('destinatário:',JSON.stringify(dest));
 console.log('a própria instituição preenchida?', dest==='AGT-LMM'||dest==='AGT-LMM-01'?'✗ SIM (mal)':'✓ NÃO');
 console.log('explicação ao utilizador:',/não é possível responder|sem destinatário|indique o destinatário/i.test(aviso)?'✓ mostrada':'✗ ausente');
 console.log('frase:',aviso.match(/[^.]*responder[^.]*\./i)?.[0]?.slice(0,140));
 await p.screenshot({path:'test-artifacts/auto-envio-corrigido.png'});
 await b.close();
})();
