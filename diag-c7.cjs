const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
(async()=>{
 const b=await chromium.launch();
 for (const alvo of ['Correio','Contactos','Perfil']) {
  const ctx=await b.newContext({viewport:{width:1440,height:900}});
  const p=await ctx.newPage();
  const arranque=new Set(); const logs=[];
  p.on('response',r=>{const u=r.url();if(/\/assets\/.*\.js/.test(u))arranque.add(u.split('/').pop());});
  p.on('console',m=>{const t=m.text();if(/FronteiraDePagina|dynamically imported/.test(t))logs.push(t.slice(0,80));});
  await p.goto(`${APP}/#/login`,{waitUntil:'networkidle'});
  await p.waitForTimeout(1200);
  await p.fill('input[name="cda-utilizador"]','002399714LA030');
  await p.fill('input[name="cda-senha"]','123456789');
  await p.click('button:has-text("ENTRAR NO PORTAL")');
  await p.waitForTimeout(5500);
  // bloqueia só o que a página destino precisa (não estava no arranque)
  let bloq=0;
  await p.route('**/assets/*.js',r=>{
    const f=r.request().url().split('/').pop();
    if(!arranque.has(f)){ bloq++; return r.abort('failed'); }
    return r.continue();
  });
  await p.locator(`button:has-text("${alvo}")`).first().click({timeout:8000}).catch(()=>{});
  await p.waitForTimeout(12000);
  const e=await p.evaluate(()=>{const t=(document.body.innerText||'').replace(/\s+/g,' ').trim();
    return {len:t.length,raiz:(document.querySelector('#root')?.children.length??0),ini:t.slice(0,100)};});
  console.log(`\n== ${alvo} ==`,JSON.stringify(e),'| ficheiros bloqueados:',bloq);
  console.log('   fronteiras:',logs.filter(l=>/Fronteira/.test(l)).length,'| imports falhados:',logs.filter(l=>/dynamically/.test(l)).length);
  await p.screenshot({path:`test-artifacts/limpo-${alvo.toLowerCase()}.png`}).catch(()=>{});
  await ctx.close();
 }
 await b.close();
})();
