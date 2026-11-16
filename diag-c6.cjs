const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
(async()=>{
 const b=await chromium.launch();
 const p=await (await b.newContext()).newPage();
 const js=[];
 p.on('response',r=>{const u=r.url();if(/\/assets\/.*\.js/.test(u))js.push(u.split('/').pop());});
 await p.goto(`${APP}/#/login`,{waitUntil:'networkidle'});
 await p.waitForTimeout(1200);
 await p.fill('input[name="cda-utilizador"]','002399714LA030');
 await p.fill('input[name="cda-senha"]','123456789');
 await p.click('button:has-text("ENTRAR NO PORTAL")');
 await p.waitForTimeout(6000);
 console.log('JS carregados no arranque+login:'); console.log(' ',js.join('\n  '));
 await b.close();
})();
