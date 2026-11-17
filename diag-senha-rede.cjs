const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1400,height:1250},locale:'pt-PT'});
  const p=await ctx.newPage();
  p.on('response', async r=>{
    const u=r.url();
    if(u.includes('/auth/v1/user')||u.includes('/auth/v1/token')){
      let body=''; try{ body=(await r.text()).slice(0,300);}catch{}
      console.log('   [rede]', r.request().method(), u.replace('https://klrclczcahfycfdxzdqs.supabase.co','SB'), r.status(), body);
    }
  });
  await p.goto(`${APP}/#/login`,{waitUntil:'networkidle'}); await E(1500);
  await p.fill('input[name="cda-utilizador"]','002399714LA030'); await p.fill('input[name="cda-senha"]','123456789');
  await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(9000);
  await p.locator('button:has-text("Perfil")').first().click().catch(()=>{}); await E(4000);
  await p.locator('button:has-text("Alterar Palavra-passe")').first().click().catch(()=>{}); await E(2000);
  await p.locator('input[placeholder="Palavra-passe actual"]').first().fill('123456789');
  await p.locator('input[placeholder="Nova palavra-passe (mín. 8 caracteres)"]').first().fill('TesteSenha123');
  await p.locator('input[placeholder="Confirmar nova palavra-passe"]').first().fill('TesteSenha123');
  await p.locator('button:has-text("Actualizar Palavra-passe")').first().click();
  await E(8000);
  const exp = await p.evaluate(()=>{
    const k=Object.keys(localStorage).find(k=>k.includes('auth-token'));
    if(!k) return 'sem token';
    const t=JSON.parse(localStorage.getItem(k));
    return {temAccess: !!t.access_token, expira: t.expires_at, agora: Math.floor(Date.now()/1000), refresh: !!t.refresh_token};
  });
  console.log('   sessão:', JSON.stringify(exp));
  await b.close();
})();
