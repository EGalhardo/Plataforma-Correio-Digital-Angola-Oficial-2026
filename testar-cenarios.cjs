const { chromium } = require('playwright');
const fs=require('fs');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
const env={};for(const l of fs.readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const H={apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
const db=async q=>(await fetch(env.SUPABASE_URL+'/rest/v1/'+q,{headers:H})).json();
async function entrar(b,{base,u,s}){
 const ctx=await b.newContext({viewport:{width:1400,height:950},locale:'pt-PT'});
 const p=await ctx.newPage();
 await p.goto(`${APP}${base}/#/login`,{waitUntil:'networkidle'});await E(1300);
 await p.fill('input[name="cda-utilizador"]',u);await p.fill('input[name="cda-senha"]',s);
 await p.click('button:has-text("ENTRAR NO PORTAL")');await E(6000);
 return {ctx,p};
}
(async()=>{
 const b=await chromium.launch();
 const inst=await entrar(b,{base:'/institucional',u:'AGT-LMM-01',s:'123456789'});
 await inst.p.locator('button:has-text("Correio")').first().click();await E(3000);

 // CENÁRIO A: responder a uma mensagem ENVIADAS da própria instituição (AGT→AGT)
 console.log('A. responder a «RE: OI-956966» (enviada pela própria instituição)');
 await inst.p.locator('text=ENVIADAS').first().click();await E(3000);
 const linhaA=inst.p.locator('tr:has-text("RE: OI-956966")').first();
 await linhaA.locator('button').first().click();await E(2500);
 await inst.p.locator('button:has-text("Responder")').first().click();await E(2500);
 const destA=await inst.p.locator('input[placeholder*="BI" i], input[placeholder*="Institucional" i]').first().inputValue().catch(()=>'(vazio)');
 console.log('   destinatário preenchido:',JSON.stringify(destA),destA===''?'✓ já NÃO é a própria instituição':'✗ continua errado');

 // CENÁRIO B: responder à mensagem RECEBIDA do cidadão
 console.log('\nB. responder à mensagem recebida do cidadão (OI-956966)');
 await inst.p.locator('button:has-text("Correio")').first().click();await E(2500);
 await inst.p.locator('text=TODAS').first().click().catch(()=>{});await E(2500);
 const linhaB=inst.p.locator('tr:has-text("CIDADÃO: 002399714LA030")').first();
 await linhaB.locator('button').first().click();await E(2500);
 await inst.p.locator('button:has-text("Responder")').first().click();await E(2500);
 const destB=await inst.p.locator('input[placeholder*="BI" i]').first().inputValue().catch(()=>'(vazio)');
 console.log('   destinatário preenchido:',JSON.stringify(destB),destB==='002399714LA030'?'✓ o cidadão':'✗ errado');
 await inst.p.locator('textarea').first().click(); await inst.p.locator('textarea').first().type('OI');
 await inst.p.locator('button:has-text("Enviar Mensagem Oficial")').first().click();await E(1500);
 await inst.p.locator('text=Mensagem Normal').first().click().catch(()=>{});await E(600);
 await inst.p.locator('button:has-text("OK")').first().click().catch(()=>{});await E(2500);
 for(const sel of ['button:has-text("Enviar mesmo assim")','button:has-text("Enviar Mensagem Oficial")','button:has-text("ENVIAR CORRESPONDÊNCIA")']){
   const l=inst.p.locator(sel).first(); if(await l.count()) await l.click().catch(()=>{}); await E(1200);
 }
 await E(4000);
 console.log('   base (última):',(await db('messages?select=sender_bi,recipient_bi,subject&order=created_at.desc&limit=1')).map(m=>`${m.sender_bi}→${m.recipient_bi} «${m.subject}»`));
 await inst.ctx.close();

 console.log('\nC. cidadão reentra — vê a resposta?');
 const cid=await entrar(b,{base:'',u:'002399714LA030',s:'123456789'});
 await cid.p.locator('button:has-text("Correio")').first().click();await E(4000);
 const t=(await cid.p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('   resposta visível na caixa de entrada:',/RE: OI-956966/i.test(t)?'✓ SIM':'✗ NÃO');
 await b.close();
})();
