// Stress de navegação rápida: clicar menu atrás de menu sem esperar, como um utilizador impaciente.
const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const CONTAS={
 cidadao:{url:`${APP}/#/login`,user:'002399714LA030',pass:'123456789',raiz:''},
 instituicao:{url:`${APP}/institucional#/login`,user:'AGT-LMM-01',pass:'123456789',raiz:'/institucional'},
 admin:{url:`${APP}/admin#/login`,user:'ADMIN-0001',pass:'987654321',raiz:'/admin'},
};
const login=async(b,k)=>{const c=CONTAS[k];const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();
 const erros=[];p.on('pageerror',e=>erros.push(String(e.message||e).slice(0,140)));
 p.on('console',m=>{if(m.type()==='error')erros.push('console:'+m.text().slice(0,140));});
 await p.goto(c.url,{waitUntil:'networkidle'});await p.waitForTimeout(1500);
 await p.fill('input[name="cda-utilizador"]',c.user);await p.fill('input[name="cda-senha"]',c.pass);
 await p.click('button:has-text("ENTRAR NO PORTAL")');await p.waitForTimeout(5500);
 return {ctx,p,erros,raiz:c.raiz};};
const diagnostico=(p)=>p.evaluate(()=>{
 const t=(document.body.innerText||'').replace(/\s+/g,' ').trim();
 const temAlgoCorreuMal=/algo correu mal/i.test(t);
 const appMontada=!!document.querySelector('#root')?.children.length;
 return {len:t.length, algo_correu_mal:temAlgoCorreuMal, app_montada:appMontada, amostra:t.slice(0,140)};
});
(async()=>{
 const b=await chromium.launch();
 for(const k of ['cidadao','instituicao','admin']){
  const s=await login(b,k);
  const p=s.p;
  const menu=await p.$$eval('nav button, aside button, button',els=>[...new Set(els.map(e=>(e.innerText||'').replace(/\s+/g,' ').trim().split('\n')[0]).filter(t=>t&&t.length<22&&!/sair|online|ao$|eliminar|enviar|guardar|cancelar/i.test(t)))]);
  console.log(`\n== ${k}: ${menu.length} alvos: ${menu.slice(0,10).join(' · ')}`);
  // navegação RÁPIDA: clicar 8 vezes seguidas com 250ms
  const achados=[];
  for(let i=0;i<Math.min(8,menu.length);i++){
   const alvo=menu[i];
   await p.locator(`button:has-text("${alvo}")`).first().click({timeout:5000}).catch(()=>{});
   await p.waitForTimeout(250);
   const d=await diagnostico(p);
   if(d.algo_correu_mal||!d.app_montada||d.len<200) achados.push({passo:i,alvo,...d});
  }
  await p.waitForTimeout(5000);
  const fim=await diagnostico(p);
  console.log('  após a rajada:',JSON.stringify({len:fim.len,algo_correu_mal:fim.algo_correu_mal,app_montada:fim.app_montada}));
  if(achados.length) console.log('  estados suspeitos durante a rajada:',JSON.stringify(achados.slice(0,3)));
  console.log('  erros JS:',[...new Set(s.erros)].slice(0,5));
  await p.screenshot({path:`test-artifacts/stress-${k}.png`}).catch(()=>{});
  await s.ctx.close();
 }
 await b.close();
})();
