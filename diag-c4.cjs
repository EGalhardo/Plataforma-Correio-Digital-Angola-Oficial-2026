const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1440,height:900}});
 const p=await ctx.newPage();
 await p.addInitScript(()=>{ window.__e=[]; window.addEventListener('error',ev=>{window.__e.push({msg:String(ev.message).slice(0,140),stack:String(ev.error&&ev.error.stack||'').slice(0,900)});},true); });
 await p.goto(`${APP}/#/login`,{waitUntil:'networkidle'});
 await p.waitForTimeout(1500);
 await p.fill('input[name="cda-utilizador"]','002399714LA030');
 await p.fill('input[name="cda-senha"]','123456789');
 await p.click('button:has-text("ENTRAR NO PORTAL")');
 await p.waitForTimeout(5500);
 await p.route('**/assets/*.js',r=>/index-/.test(r.request().url())?r.continue():r.abort('failed'));
 await p.locator('button:has-text("Perfil")').first().click({timeout:8000}).catch(()=>{});
 await p.waitForTimeout(12000);
 const list=await p.evaluate(()=>window.__e||[]);
 console.log('erros capturados:',list.length);
 for(const e of list.slice(0,4)){ console.log('\n### '+e.msg+'\n'+e.stack); }
 await ctx.close();await b.close();
})();
