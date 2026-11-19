const { chromium } = require('playwright');
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=(ms)=>new Promise(r=>setTimeout(r,ms));
const logs=(p)=>p.evaluate(()=>{try{return JSON.parse(localStorage.getItem('gov_audit_logs')||'[]').slice(0,8).map(l=>l.action)}catch{return[]}});
const faces=(p)=>p.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('cda_demo_face_')));
(async()=>{
 const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 // CENÁRIO 1: browser novo, SEM sessão, tentar login facial
 console.log('=== CENÁRIO 1: browser novo, sem sessão, login facial ===');
 const c1=await b.newContext({viewport:{width:1500,height:1300},permissions:['camera'],locale:'pt-PT'});
 const p1=await c1.newPage();
 await p1.goto(`${APP}/#/login`,{waitUntil:'domcontentloaded',timeout:60000}); await E(5000);
 console.log('faces locais:',await faces(p1));
 const bf=p1.locator('button').filter({hasText:/LOGIN FACIAL/i}).first();
 await bf.click(); await E(3500);
 console.log('texto antes de validar:', ((await p1.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ')).match(/.{0,90}(registo|dispositivo).{0,90}/i)?.[0]||'—');
 const val=p1.locator('button').filter({hasText:/VALIDAR FACE/i}).first();
 if(await val.count()){ await val.click(); await E(9000); }
 const t1=(await p1.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('resultado:', (t1.match(/.{0,80}(não reconhecid|não registad|não corresponde|registos? facial).{0,180}/i)||['—'])[0]);
 console.log('auditoria:'); (await logs(p1)).forEach(l=>console.log('   ',l.slice(0,150)));
 // CENÁRIO 2: mesmo browser, DEPOIS de entrar com senha (há sessão) mas sem registo
 console.log('\n=== CENÁRIO 2: com sessão, sem registo facial nenhum ===');
 await p1.goto(`${APP}/#/login`,{waitUntil:'domcontentloaded',timeout:60000}); await E(4000);
 const cu=p1.locator('input[name="cda-utilizador"]');
 if(await cu.count()){ await cu.fill('002399714LA030'); await p1.fill('input[name="cda-senha"]','123456789'); await p1.click('button:has-text("ENTRAR NO PORTAL")'); await E(9000);}
 await p1.goto(`${APP}/#/perfil`,{waitUntil:'domcontentloaded',timeout:60000}); await E(5000);
 const t2=(await p1.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 console.log('estado no Perfil:', (t2.match(/.{0,60}(Sem registo|Face registada|registo na plataforma).{0,120}/i)||['—'])[0]);
 console.log('faces locais:',await faces(p1));
 console.log('cartão consentimento presente:', await p1.locator('[data-testid="cartao-consentimento-facial"]').count());
 await b.close();
})();
