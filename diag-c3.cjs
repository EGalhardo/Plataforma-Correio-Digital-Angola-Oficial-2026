const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1440,height:900}});
 const p=await ctx.newPage();
 let nav=0;
 p.on('framenavigated',f=>{ if(f===p.mainFrame()){nav++;console.log('  [nav]',nav,f.url().slice(-40));}});
 const logs=[];
 p.on('console',m=>{const t=m.text();if(/Fronteira|Error|error/i.test(t))logs.push(`[${m.type()}] ${t.slice(0,150)}`);});
 await p.goto(`${APP}/#/login`,{waitUntil:'networkidle'});
 await p.waitForTimeout(1500);
 await p.fill('input[name="cda-utilizador"]','002399714LA030');
 await p.fill('input[name="cda-senha"]','123456789');
 await p.click('button:has-text("ENTRAR NO PORTAL")');
 await p.waitForTimeout(5500);
 await p.route('**/assets/*.js',r=>/index-/.test(r.request().url())?r.continue():r.abort('failed'));
 await p.locator('button:has-text("Perfil")').first().click({timeout:8000}).catch(()=>{});
 for (const t of [3000,6000,12000,20000]) {
   await p.waitForTimeout(t===3000?3000:t-[3000,6000,12000,20000][[3000,6000,12000,20000].indexOf(t)-1]);
   const e=await p.evaluate(()=>({len:(document.body.innerText||'').replace(/\s+/g,' ').trim().length,
     raiz:(document.querySelector('#root')?.children.length??0),
     flag:sessionStorage.getItem('cda_recarga_por_chunk'),
     txt:(document.body.innerText||'').replace(/\s+/g,' ').trim().slice(0,90)}));
   console.log(`t=${t}ms`,JSON.stringify(e));
 }
 console.log('--- consola ---');[...new Set(logs)].slice(0,10).forEach(l=>console.log(' ',l));
 await ctx.close();await b.close();
})();
