const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
(async()=>{
 const b=await chromium.launch();const p=await (await b.newContext()).newPage();
 await p.goto(APP+'/#/login',{waitUntil:'networkidle'});
 const r=await p.evaluate(async()=>{
   // o cliente é criado pela app: procurar no módulo do vendor
   const urls=performance.getEntriesByType('resource').map(e=>e.name).filter(u=>/assets\/.*\.js/.test(u));
   const res={};
   for(const u of urls){
     try{const m=await import(u);const k=Object.keys(m);
       if(k.some(x=>/createClient/i.test(x))) res[u.split('/').pop()]=k.filter(x=>/createClient/i.test(x));
     }catch{}
   }
   return {bundles:urls.map(u=>u.split('/').pop()), achou:res};
 });
 console.log(JSON.stringify(r,null,1).slice(0,900));
 await b.close();
})();
