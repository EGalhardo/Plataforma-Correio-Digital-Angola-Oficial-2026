/**
 * PROVA PONTA-A-PONTA — criar inquérito/sondagem com contas reais.
 * 1. instituição cria «Inquérito Normal» no compositor;
 * 2. a sondagem fica na base como rascunho da instituição;
 * 3. o cidadão vê e responde;
 * 4. limpeza das sondagens de prova.
 */
const { chromium }=require('playwright');
const fs=require('fs');
const env={}; for(const l of fs.readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const URL=env.SUPABASE_URL, SR=env.SUPABASE_SERVICE_ROLE_KEY;
const H={apikey:SR,Authorization:'Bearer '+SR,'Content-Type':'application/json'};
const APP='https://correio-digital-angola-oficial.vercel.app';
const E=m=>new Promise(r=>setTimeout(r,m));
const PERGUNTA='PROVA SONDAGEM '+Date.now().toString().slice(-6);
const consultar=async(q)=>(await (await fetch(`${URL}/rest/v1/${q}`,{headers:H})).json());
(async()=>{
 const falhas=[];
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1400,height:950},locale:'pt-PT'});
 const p=await ctx.newPage();
 let insercao='(sem pedido)';
 p.on('request',r=>{ const d=r.postData()||''; if(d.includes('"tabela":"sondagens"')) insercao=d.slice(0,200); });
 p.on('response',async r=>{ const t=await r.text().catch(()=>''); if(/sondagens/.test(t)&&/ok":false/.test(t)) console.log('  erro do proxy:',t.slice(0,200)); });

 console.log(`\n1. INSTITUIÇÃO cria o inquérito «${PERGUNTA}»`);
 await p.goto(`${APP}/institucional/#/login`,{waitUntil:'networkidle'}); await E(1400);
 await p.fill('input[name="cda-utilizador"]','AGT-LMM-01'); await p.fill('input[name="cda-senha"]','123456789');
 await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(7000);
 await p.locator('button:has-text("Correio")').first().click(); await E(3000);
 await p.locator('button:has-text("Nova Mensagem")').first().click(); await E(2500);
 await p.locator('button:has-text("Criar Inquérito")').first().click(); await E(2000);
 await p.locator('button:has-text("OK")').last().click(); await E(2500);
 await p.locator('input[placeholder="Escreva a pergunta da sondagem"]').fill(PERGUNTA);
 await p.locator('input[placeholder="Texto A"]').fill('Concordo');
 await p.locator('input[placeholder="Texto B"]').fill('Discordo');
 await E(500);
 await p.locator('button:has-text("CRIAR SONDAGEM")').click(); await E(6000);
 const tela=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 const mostrouErro=/row-level security|Não foi possível criar/i.test(tela);
 console.log('   erro na tela:', mostrouErro?'✗ SIM':'✓ nenhum');
 if(mostrouErro) falhas.push('o erro RLS continuou a aparecer');
 console.log('   pedido ao proxy:', insercao);
 await p.screenshot({path:'test-artifacts/sond-prova-1-criada.png'});

 const linhas=await consultar(`sondagens?select=id,instituicao_code,status,pergunta&pergunta=eq.${encodeURIComponent(PERGUNTA)}`);
 console.log('   na base:',JSON.stringify(linhas));
 if(!Array.isArray(linhas)||linhas.length!==1||linhas[0].instituicao_code!=='AGT-LMM') falhas.push('a sondagem não ficou gravada com a instituição correcta');
 const id=linhas?.[0]?.id;
 await ctx.close();

 // cidadão vê? (leitura directa com o token do cidadão)
 console.log('\n2. CIDADÃO tenta ler a sondagem recém-criada (rascunho)');
 const login=async(email,pass)=>(await (await fetch(`${URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:env.SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password:pass})})).json());
 const cid=await login('bi.002399714la030@cidadao.correiodigital.ao','123456789');
 const r=await fetch(`${URL}/rest/v1/sondagens?id=eq.${id}&select=id,status`,{headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:'Bearer '+cid.access_token}});
 const viu=await r.json();
 console.log('   rascunho visível ao cidadão?', Array.isArray(viu)&&viu.length?'✗ SIM (não devia)':'✓ não (correcto)');
 if(Array.isArray(viu)&&viu.length) falhas.push('o cidadão vê rascunhos da instituição');

 // a instituição também lê via cliente autenticado (política nova)
 const inst=await login('agente.agt-lmm-01@inst.correiodigital.ao','123456789');
 const r2=await fetch(`${URL}/rest/v1/sondagens?id=eq.${id}&select=id,status,instituicao_code`,{headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:'Bearer '+inst.access_token}});
 const leu=await r2.json();
 console.log('   instituição lê a sua sondagem?', Array.isArray(leu)&&leu.length?'✓ sim':'✗ não', JSON.stringify(leu));

 // limpeza
 await fetch(`${URL}/rest/v1/sondagens?pergunta=eq.${encodeURIComponent(PERGUNTA)}`,{method:'DELETE',headers:H});
 const sobra=await consultar(`sondagens?select=id&pergunta=eq.${encodeURIComponent(PERGUNTA)}`);
 console.log('\nlimpeza:', Array.isArray(sobra)&&sobra.length===0?'✓ 0 restantes':`✗ ${sobra.length}`);
 await b.close();
 console.log('\n'+'─'.repeat(60));
 if(!falhas.length){ console.log('RESULTADO: APROVADO'); process.exit(0); }
 console.log('RESULTADO: REPROVADO'); falhas.forEach(f=>console.log('  · '+f)); process.exit(1);
})();
