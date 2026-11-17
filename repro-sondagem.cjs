const { chromium }=require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1400,height:950},locale:'pt-PT'});
 const p=await ctx.newPage();
 p.on('request',r=>{ if(r.url().includes('sondagens')||r.url().includes('/api/dados')) console.log('  →',r.method(),r.url().replace(APP,'').slice(0,60), (r.postData()||'').slice(0,180)); });
 p.on('response',async r=>{ if(r.url().includes('sondagens')||r.url().includes('/api/dados')) console.log('  ←',r.status(),(await r.text().catch(()=>'')).slice(0,240)); });
 await p.goto(`${APP}/institucional/#/login`,{waitUntil:'networkidle'}); await E(1400);
 await p.fill('input[name="cda-utilizador"]','AGT-LMM-01'); await p.fill('input[name="cda-senha"]','123456789');
 await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(7000);
 await p.locator('button:has-text("Correio")').first().click(); await E(3000);
 await p.locator('button:has-text("Nova Mensagem")').first().click(); await E(2500);
 await p.locator('button:has-text("Criar Inquérito")').first().click(); await E(2500);
 // escolher «Inquérito Normal»
 const normal=p.locator('text=Normal').first();
 if(await normal.count()) { await normal.click().catch(()=>{}); await E(1200); }
 const okBtn=p.locator('button:has-text("OK")').last();
 if(await okBtn.count()){ await okBtn.click().catch(()=>{}); await E(2000); }
 await p.screenshot({path:'test-artifacts/sond-2-form.png'});
 console.log('\nformulário:',(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ').match(/Criar Sondagem.{0,160}/)?.[0] || 'não abriu');
 // preencher pergunta e opções
 const campos=p.locator('textarea');
 console.log('textareas:',await campos.count());
 for(let i=0;i<await campos.count();i++){ const ph=await campos.nth(i).getAttribute('placeholder'); console.log('  ',i,ph); }
 await b.close();
})();
