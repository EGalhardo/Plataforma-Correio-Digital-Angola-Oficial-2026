// Dois cenários honestos, com o arranque da app SEMPRE permitido.
const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const ENTRADA='002399714LA030', PASS='123456789';

const entrar=async(b)=>{
 const ctx=await b.newContext({viewport:{width:1440,height:900}});
 const p=await ctx.newPage();
 const erros=[];p.on('pageerror',e=>erros.push(String(e.message||e).slice(0,160)));
 await p.goto(`${APP}/#/login`,{waitUntil:'networkidle'});
 await p.waitForTimeout(1500);
 await p.fill('input[name="cda-utilizador"]',ENTRADA);
 await p.fill('input[name="cda-senha"]',PASS);
 await p.click('button:has-text("ENTRAR NO PORTAL")');
 await p.waitForTimeout(5500);
 return {ctx,p,erros};
};
const estado=(p)=>p.evaluate(()=>{
 const t=(document.body.innerText||'').replace(/\s+/g,' ').trim();
 return {len:t.length, raiz_filhos:(document.querySelector('#root')?.children.length??0),
   recuperacao:/não foi possível abrir a página|esta página não carregou|tentar novamente/i.test(t),
   amostra:t.slice(0,110)};
});

(async()=>{
 const b=await chromium.launch();

 // ---------- CENÁRIO 1: falha passageira (um chunk falha uma vez) ----------
 {
  const s=await entrar(b);
  let bloqueou=false;
  await s.p.route('**/assets/*.js',route=>{
    const u=route.request().url();
    const entradaChunk=/index-/.test(u);
    if(!entradaChunk && !bloqueou){ bloqueou=true; return route.abort('failed'); }
    return route.continue();
  });
  await s.p.locator('button:has-text("Perfil")').first().click({timeout:8000}).catch(()=>{});
  await s.p.waitForTimeout(9000);
  const e=await estado(s.p);
  console.log('CENÁRIO 1 (falha passageira):',JSON.stringify(e));
  console.log('  → recuperou sozinho?', e.len>300 ? 'SIM ✓' : 'NÃO ✗');
  await s.p.screenshot({path:'test-artifacts/branco-c1.png'}).catch(()=>{});
  await s.ctx.close();
 }

 // ---------- CENÁRIO 2: falha persistente do ficheiro da página ----------
 {
  const s=await entrar(b);
  await s.p.route('**/assets/*.js',route=>{
    const u=route.request().url();
    if(/index-/.test(u)) return route.continue();      // arranque da app: sempre OK
    return route.abort('failed');                       // chunks das páginas: sempre falham
  });
  await s.p.locator('button:has-text("Perfil")').first().click({timeout:8000}).catch(()=>{});
  await s.p.waitForTimeout(10000);
  const e=await estado(s.p);
  console.log('\nCENÁRIO 2 (falha persistente):',JSON.stringify(e));
  console.log('  → mostra recuperação em vez de branco?', e.recuperacao ? 'SIM ✓' : 'NÃO ✗');
  await s.p.screenshot({path:'test-artifacts/branco-c2.png'}).catch(()=>{});
  await s.ctx.close();
 }
 await b.close();
})();
