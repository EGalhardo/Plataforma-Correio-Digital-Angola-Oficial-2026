// Prova: se um chunk lazy falhar, o ecrã fica branco?
const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1440,height:900}});
 const p=await ctx.newPage();
 const erros=[];p.on('pageerror',e=>erros.push(String(e.message||e).slice(0,200)));
 // Abortar TODOS os pedidos .js que não sejam o inicial (simula falha de chunk/rede)
 let bloqueados=0;
 await p.route('**/*.js',async route=>{
   const u=route.request().url();
   if(/\/assets\/.*\.js/.test(u)){ bloqueados++; return route.abort('failed'); }
   return route.continue();
 });
 await p.goto(`${APP}/#/login`,{waitUntil:'domcontentloaded'}).catch(()=>{});
 await p.waitForTimeout(6000);
 const t1=await p.evaluate(()=>({len:(document.body.innerText||'').trim().length, html:document.body.innerHTML.length}));
 console.log('com chunks bloqueados desde o início →',JSON.stringify(t1),'| pedidos bloqueados:',bloqueados);
 await p.screenshot({path:'test-artifacts/chunk-falha-inicial.png'}).catch(()=>{});
 await ctx.close();

 // Cenário realista: login OK, e o chunk falha quando se muda para uma página lazy
 const ctx2=await b.newContext({viewport:{width:1440,height:900}});
 const p2=await ctx2.newPage();
 const erros2=[];p2.on('pageerror',e=>erros2.push(String(e.message||e).slice(0,200)));
 await p2.goto(`${APP}/#/login`,{waitUntil:'networkidle'});
 await p2.waitForTimeout(1500);
 await p2.fill('input[name="cda-utilizador"]','002399714LA030');
 await p2.fill('input[name="cda-senha"]','123456789');
 await p2.click('button:has-text("ENTRAR NO PORTAL")');
 await p2.waitForTimeout(5500);
 console.log('\napós login → len:',(await p2.evaluate(()=>(document.body.innerText||'').trim().length)));
 // agora bloquear chunks NOVOS e navegar para uma página lazy (Perfil / Contactos)
 let novos=0;
 await p2.route('**/assets/*.js',route=>{novos++;return route.abort('failed');});
 for(const pagina of ['Perfil','Contactos','Correio']){
   await p2.locator(`button:has-text("${pagina}")`).first().click({timeout:6000}).catch(()=>{});
   await p2.waitForTimeout(3500);
   const d=await p2.evaluate(()=>{
     const t=(document.body.innerText||'').replace(/\s+/g,' ').trim();
     return {len:t.length, algo_correu_mal:/algo correu mal/i.test(t), root_filhos:(document.querySelector('#root')?.children.length??0), amostra:t.slice(0,120)};
   });
   console.log(`  → «${pagina}»:`,JSON.stringify(d));
 }
 console.log('  chunks bloqueados ao navegar:',novos);
 console.log('  erros JS:',[...new Set(erros2)].slice(0,4));
 await p2.screenshot({path:'test-artifacts/chunk-falha-navegacao.png'}).catch(()=>{});
 await ctx2.close();await b.close();
})();
