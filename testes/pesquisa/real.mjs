import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parse} from 'dotenv';
const env=parse(fs.readFileSync('.env'));
if (process.env.CDA_REAL_TEST !== '1' || !process.env.CDA_TEST_BI || !process.env.CDA_TEST_PASSWORD) throw new Error('Requer CDA_REAL_TEST=1, CDA_TEST_BI e CDA_TEST_PASSWORD.');
const base=process.env.CDA_TEST_BASE || 'http://localhost:3000';
const stamp=Date.now().toString().slice(-7);const owner=process.env.CDA_TEST_BI;const names=['ZZ Teste Pessoal '+stamp,'ZZ Teste Instituição '+stamp];
const records=[];let passes=0;
const check=(name,ok)=>{assert.ok(ok,name);passes++;console.log('PASS',name)};
async function data(method='GET',ids){
 const filter=ids?'id=in.('+ids.join(',')+')':'owner_bi=eq.'+owner+'&name=in.('+names.map(encodeURIComponent).join(',')+')';
 const r=await fetch(env.SUPABASE_URL+'/rest/v1/contacts?'+filter+(method==='GET'?'&select=id,name,relation,email,phone':''),{method,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,Prefer:'return=representation'}});assert.ok(r.ok,'Supabase '+r.status);return r.json();
}
const b=await chromium.launch();
try {
const p=await b.newPage({viewport:{width:1440,height:1000}});
p.on('pageerror',e=>console.error('PAGEERROR',e.message));
await p.goto(base+'/#/login',{waitUntil:'networkidle'});
await p.locator('input:not([type]),input[type=text]').fill(owner);await p.locator('input[type=password]').fill(process.env.CDA_TEST_PASSWORD);await p.getByRole('button',{name:'ENTRAR NO PORTAL'}).click();await p.locator('aside').waitFor();check('Login real Cidadão 01',true);
await p.locator('aside').getByText('Contactos',{exact:true}).click();await p.getByPlaceholder('Procurar por Contactos Pessoais').waitFor();
for(let i=0;i<2;i++){
 if(i)await p.getByRole('tab',{name:'Contactos Institucionais',exact:true}).click();
 await p.getByRole('button',{name:'Adicionar',exact:true}).click();
 check('Formulário '+i,await p.getByText(i?'Nova Instituição':'Novo Contacto Pessoal',{exact:true}).isVisible());
 await p.locator('#contact-name-input').fill(names[i]);await p.locator('#contact-bi-input').fill('TST'+stamp+i);
 if(!i)await p.locator('#contact-relation-input').selectOption('Amigo/a');
 await p.locator('#contact-phone-input').fill('+244 '+(i?'222':'923')+' '+stamp.slice(-6));
 await p.locator('#contact-email-input').fill('teste'+i+'@example.test');
 await p.locator('#confirm-add-contact-btn').click();await p.locator('#confirm-add-contact-btn').waitFor({state:'hidden'});
 await p.getByText(names[i],{exact:true}).filter({visible:true}).first().waitFor();check('Adição visível '+i,true);
}
for(let i=0;i<15;i++){const rows=await data();if(rows.length===2){records.push(...rows);break}await new Promise(r=>setTimeout(r,500))}
check('Ambos contactos persistidos no Supabase',records.length===2);
check('Classificação institucional persistida',records.some(r=>r.relation==='Instituição'));
await p.reload({waitUntil:'networkidle'});await p.locator('aside').getByText('Contactos',{exact:true}).click();
await p.getByPlaceholder('Procurar por Contactos Pessoais').fill(stamp);await p.getByText(names[0],{exact:true}).filter({visible:true}).waitFor();check('Pessoal após reload',true);check('Instituição excluída de pessoais',await p.getByText(names[1],{exact:true}).count()===0);
await p.getByRole('tab',{name:'Contactos Institucionais',exact:true}).click();await p.getByPlaceholder('Procurar por Contactos institucionais').fill(stamp);await p.getByText(names[1],{exact:true}).waitFor();check('Instituição após reload',true);check('Pessoal excluído de instituições',await p.getByText(names[0],{exact:true}).count()===0);
await p.getByPlaceholder('Procurar por Contactos institucionais').fill('  administracao tributaria  ');await p.getByRole('button').filter({hasText:'Administração Geral Tributária'}).waitFor();check('Directório tolera acentos/espaços',true);
await p.locator('aside').getByText('Correio',{exact:true}).click();const q=p.getByPlaceholder('Pesquisar correspondência oficial...');await q.fill('ZZZ_INEXISTENTE_'+stamp);await p.getByText('Nenhuma mensagem localizada para "ZZZ_INEXISTENTE_'+stamp+'"').waitFor();check('Correio pesquisa sem resultados',true);await q.fill('');
console.log('TOTAL',passes);
}finally{const rows=await data();if(rows.length){await data('DELETE',rows.map(r=>r.id))}check('Limpeza dos registos de teste', (await data()).length===0);await b.close()}
