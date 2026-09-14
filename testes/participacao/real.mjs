import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch();let count=0;
try{
const accounts=JSON.parse(process.env.CDA_TEST_ACCOUNTS || '[]');
if (!accounts.length) throw new Error('Defina CDA_TEST_ACCOUNTS como JSON: [[institucional, caminho, acesso, senha], ...].');
for(const [institution,path,id,password] of accounts){
 const p=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto((process.env.CDA_TEST_BASE||'http://localhost:3000')+path+'/#/login',{waitUntil:'networkidle'});
 await p.locator('input:not([type]),input[type=text]').first().fill(id);await p.locator('input[type=password]').first().fill(password);await p.getByRole('button',{name:/ENTRAR NO PORTAL|ACEDER|ENTRAR/i}).first().click();await p.locator('aside').waitFor();
 const nav=p.getByRole('navigation',{name:'Atalhos do Painel'});await nav.waitFor();
 await nav.getByRole('button',{name:'Inquéritos',exact:true}).click();await p.getByRole('heading',{name:'Inquéritos',exact:true}).waitFor();count++;
 await p.reload({waitUntil:'networkidle'});await p.getByRole('heading',{name:'Inquéritos',exact:true}).waitFor();count++;
 if(!institution){await p.getByRole('searchbox',{name:'Procurar inquéritos',exact:true}).fill('ZZZ_INEXISTENTE_TESTE');await p.getByText('Nenhum resultado para esta procura.',{exact:true}).waitFor();count++}
 await p.locator('aside').getByText('Painel',{exact:true}).click();await nav.getByRole('button',{name:institution?'Denúncias recebidas':'Denúncias',exact:true}).click();await p.getByRole('heading',{name:institution?'Denúncias recebidas':'Denúncias',exact:true}).waitFor();count++;
 await p.reload({waitUntil:'networkidle'});await p.getByRole('heading',{name:institution?'Denúncias recebidas':'Denúncias',exact:true}).waitFor();count++;
 await p.getByRole('searchbox',{name:'Procurar denúncias',exact:true}).fill('ZZZ_INEXISTENTE_TESTE');await p.getByText('Nenhum resultado para esta procura.',{exact:true}).waitFor();count++;
 await p.setViewportSize({width:390,height:900});const box=await p.getByRole('searchbox',{name:'Procurar denúncias',exact:true}).boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390);count++;
 await p.setViewportSize({width:1440,height:1000});await p.locator('aside').getByText('Correio',{exact:true}).click();await p.getByPlaceholder('Pesquisar correspondência oficial...').waitFor();assert.equal(await p.getByRole('button',{name:/^VideoAtendimento$|^Vídeo-Atendimento$/}).count(),0);count++;
 await p.locator('aside').getByText('Painel',{exact:true}).click();assert.ok(await nav.getByRole('button',{name:'Vídeo-Atendimento',exact:true}).isVisible());count++;
 assert.deepEqual(errors,[]);console.log('PASS listas, pesquisa, reload, mobile e vídeo:',institution?'Instituição':'Cidadão');await p.close();
}
console.log('TOTAL',count,'verificações aprovadas');
}finally{await browser.close()}
