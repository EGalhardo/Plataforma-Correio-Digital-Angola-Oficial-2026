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
 await inst.p.locator('button:has-text("Correio")').first().click();await E(3500);
 const linha=inst.p.locator('tr:has-text("OI-956966")').first();
 await linha.locator('button').first().click();await E(2500);
 await inst.p.locator('button:has-text("Responder")').first().click();await E(2000);
 const campo=inst.p.locator('textarea').first();
 await campo.click(); await campo.type('OI');
 await inst.p.screenshot({path:'test-artifacts/prova-antecorpo.png'});
 await inst.p.locator('button:has-text("Enviar Mensagem Oficial")').first().click();await E(1500);
 await inst.p.locator('text=Mensagem Normal').first().click().catch(()=>{});await E(600);
 await inst.p.locator('button:has-text("OK")').first().click().catch(()=>{});await E(2500);
 for(const sel of ['button:has-text("Enviar mesmo assim")','button:has-text("Enviar Mensagem Oficial")','button:has-text("ENVIAR CORRESPONDÊNCIA")']){
   const l=inst.p.locator(sel).first();
   if(await l.count()) await l.click().catch(()=>{});
   await E(1200);
 }
 await E(4000);
 console.log('BASE após a resposta da instituição:');
 (await db('messages?select=id,subject,sender_bi,recipient_bi,created_at&order=created_at.desc&limit=2')).forEach(m=>console.log('  ',m.sender_bi,'→',m.recipient_bi,'|',JSON.stringify(String(m.subject).slice(0,24))));
 await inst.ctx.close();
 console.log('\nCIDADÃO volta a entrar:');
 const cid=await entrar(b,{base:'',u:'002399714LA030',s:'123456789'});
 await cid.p.locator('button:has-text("Correio")').first().click();await E(4000);
 const t=(await cid.p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('  vê «RE: OI-956966»?', /RE: OI-956966/i.test(t)?'SIM':'NÃO');
 await cid.p.locator('text=ENVIADAS').first().click().catch(()=>{});await E(2500);
 const t2=(await cid.p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('  vê «OI-956966» em ENVIADAS?', /OI-956966/i.test(t2)?'SIM':'NÃO');
 await cid.p.screenshot({path:'test-artifacts/prova-cid-final.png'});
 await b.close();
})();
