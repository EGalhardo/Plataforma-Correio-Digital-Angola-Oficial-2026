const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
(async()=>{
 const b=await chromium.launch();
 for (const alvo of ['Correio','Contactos','Perfil']) {
  const ctx=await b.newContext({viewport:{width:1440,height:900}});
  const p=await ctx.newPage();
  const logs=[];
  p.on('console',m=>{const t=m.text();if(/FronteiraDePagina|dynamically imported/.test(t))logs.push(t.slice(0,90));});
  await p.goto(`${APP}/#/login`,{waitUntil:'networkidle'});
  await p.waitForTimeout(1200);
  await p.fill('input[name="cda-utilizador"]','002399714LA030');
  await p.fill('input[name="cda-senha"]','123456789');
  await p.click('button:has-text("ENTRAR NO PORTAL")');
  await p.waitForTimeout(5000);
  await p.route('**/assets/*.js',r=>/index-/.test(r.request().url())?r.continue():r.abort('failed'));
  await p.locator(`button:has-text("${alvo}")`).first().click({timeout:8000}).catch(()=>{});
  await p.waitForTimeout(11000);
  const e=await p.evaluate(()=>{const t=(document.body.innerText||'').replace(/\s+/g,' ').trim();
    return {len:t.length,raiz:(document.querySelector('#root')?.children.length??0),
      rec:/tentar novamente/i.test(t),ini:t.slice(0,70)};});
  console.log(`\n== ${alvo} ==`,JSON.stringify(e));
  console.log('   logs:',logs.filter((l,i)=>logs.indexOf(l)===i).join(' | ')||'(nenhum)');
  console.log('   boundaries apanhados:',logs.filter(l=>/FronteiraDePagina/.test(l)).length,
              '| imports falhados:',logs.filter(l=>/dynamically imported/.test(l)).length);
  await ctx.close();
 }
 await b.close();
})();
