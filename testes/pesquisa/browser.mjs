import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
let passes=0;
try {
for (const width of [1440,390]) {
const page=await browser.newPage({viewport:{width,height:900}});
const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message)});
await page.route('**/*',route=>new URL(route.request().url()).hostname==='localhost'?route.continue():route.abort());
await page.goto('http://localhost:3010/testes/pesquisa/index.html');
const test=async(name,fn)=>{await fn();passes++;console.log(`PASS ${width}: ${name}`)};
await test('Pesquisa pessoal sem acentos/espaços',async()=>{await page.getByPlaceholder('Procurar por Contactos Pessoais').fill('  JOSE  ');await page.getByText('José Teste',{exact:true}).filter({visible:true}).waitFor();assert.equal(await page.getByText('Clínica Fictícia',{exact:true}).count(),0)});
await test('Pesquisa pessoal por email',async()=>{await page.getByPlaceholder('Procurar por Contactos Pessoais').fill('jose@example.test');await page.getByText('José Teste',{exact:true}).filter({visible:true}).waitFor()});
await test('Sem resultados',async()=>{await page.getByPlaceholder('Procurar por Contactos Pessoais').fill('zzzinexistente');await page.getByText('Nenhum resultado para "zzzinexistente"').waitFor()});
await test('Separador institucional e isolamento',async()=>{await page.getByRole('tab',{name:'Contactos Institucionais',exact:true}).click();await page.getByPlaceholder('Procurar por Contactos institucionais').waitFor();await page.getByText('Clínica Fictícia',{exact:true}).waitFor();assert.equal(await page.getByText('José Teste',{exact:true}).count(),0)});
await test('Pesquisa institucional no directório',async()=>{await page.getByPlaceholder('Procurar por Contactos institucionais').fill('AGT');await page.getByRole('button').filter({hasText:'Administração Geral Tributária'}).waitFor()});
await test('Pesquisa institucional adicionada',async()=>{await page.getByPlaceholder('Procurar por Contactos institucionais').fill('clinica');await page.getByText('Clínica Fictícia',{exact:true}).waitFor()});
await test('Popup institucional adaptado',async()=>{await page.getByPlaceholder('Procurar por Contactos institucionais').fill('');await page.getByRole('button',{name:'Adicionar',exact:true}).click();await page.getByText('Nova Instituição',{exact:true}).waitFor();assert.equal(await page.locator('#contact-relation-input').isVisible(),false);assert.equal(await page.locator('#tab-emergency-contact').isVisible(),false);await page.getByText('NIF / Código Institucional *',{exact:true}).waitFor()});
await test('Validação institucional',async()=>{await page.locator('#contact-name-input').fill('Instituição Teste Nova');await page.locator('#contact-bi-input').fill('NIF-ISOLADO');await page.locator('#confirm-add-contact-btn').click();await page.getByText('O telefone da instituição é obrigatório.',{exact:true}).waitFor()});
await test('Adicionar instituição com telefone fixo',async()=>{await page.locator('#contact-phone-input').fill('+244 222 333 444');await page.locator('#confirm-add-contact-btn').click();await page.getByText('Instituição Teste Nova',{exact:true}).waitFor()});
await test('Nova instituição não aparece nos pessoais',async()=>{await page.getByRole('tab',{name:'Contactos Pessoais',exact:true}).click();assert.equal(await page.getByText('Instituição Teste Nova',{exact:true}).count(),0)});
await test('Popup pessoal restaurado',async()=>{await page.getByRole('button',{name:'Adicionar',exact:true}).click();await page.getByText('Novo Contacto Pessoal',{exact:true}).waitFor();assert.equal(await page.locator('#contact-relation-input').isVisible(),true);await page.locator('#close-add-contact').click()});
await test('Correio: pesquisa por assunto sem acentos',async()=>{await page.locator('#test-mail').click();await page.getByPlaceholder('Pesquisar correspondência oficial...').fill('  renovacao  ');await page.getByText('Instituição Alfa',{exact:true}).filter({visible:true}).first().waitFor();assert.equal(await page.getByText('Entidade Beta',{exact:true}).count(),0)});
await test('Correio: pesquisa no corpo',async()=>{await page.getByPlaceholder('Pesquisar correspondência oficial...').fill('documento especial');await page.getByText('Instituição Alfa',{exact:true}).filter({visible:true}).first().waitFor()});
await test('Correio: vazio restaura mensagens',async()=>{await page.getByPlaceholder('Pesquisar correspondência oficial...').fill('');await page.getByText('Entidade Beta',{exact:true}).filter({visible:true}).first().waitFor()});
assert.deepEqual(errors,[]);await page.close();
}
console.log(`${passes} testes aprovados; sem erros JavaScript.`);
}finally{await browser.close()}
