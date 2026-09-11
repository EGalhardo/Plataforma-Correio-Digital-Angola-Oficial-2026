// Instituição — container «Inquérito com IA» na correspondência ENVIADA
// (estado do cidadão + contadores + «Ver Resultados»). Conta real INAPEM-LLMM-01,
// só leitura. Env ASSUNTO (defeito «Condicoes de Vida»).
import { chromium } from 'playwright'; import fs from 'node:fs';
const ASSUNTO = process.env.ASSUNTO || 'Condicoes de Vida';
const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(`${c ? '✔' : '✘'} ${n}${x ? ' — ' + x : ''}`); };
const cred=fs.readFileSync('/home/user/.credenciais_cda/contas_reais.md','utf8'); const senha=(cred.match(/INAPEM-LLMM-01[^\n]*?(\d{9})/)||[])[1];
const browser=await chromium.launch(); const page=await (await browser.newContext({viewport:{width:1366,height:900}})).newPage();
const erros=[]; page.on('pageerror',e=>erros.push(String(e)));
await page.goto('http://localhost:3000/institucional'); await page.waitForTimeout(2500);
await page.locator('input[name="cda-utilizador"]').fill('INAPEM-LLMM-01'); await page.locator('input[name="cda-senha"]').fill(senha);
await page.getByRole('button',{name:/Entrar|Aceder|Iniciar/i}).first().click(); await page.waitForTimeout(4500);
await page.evaluate(()=>{window.location.hash='#/correspondencias';}); await page.waitForTimeout(2500);
const env=page.getByRole('button',{name:/^Enviadas/i}).first(); if(await env.count()){await env.click(); await page.waitForTimeout(2500);}
// linhas com o assunto
const linhas=page.locator('tr, [class*="rounded"]').filter({hasText:ASSUNTO});
const abrir=page.getByRole('button',{name:/^Abrir$/i}); let clicou=false;
for(let i=0;i<await abrir.count();i++){const b=abrir.nth(i); if(!(await b.isVisible())) continue; const t=await b.evaluate(el=>(el.closest('tr')||el.closest('[class*="rounded"]')||el.parentElement).innerText); if(t.includes(ASSUNTO)){await b.click(); clicou=true; break;}}
if(!clicou){ const ts=page.getByText(ASSUNTO); for(let i=0;i<await ts.count();i++){ if(await ts.nth(i).isVisible()){ const row=ts.nth(i).locator('xpath=ancestor::*[self::tr or contains(@class,"rounded")][1]'); const btns=row.getByRole('button'); if(await btns.count()) await btns.first().click(); else await ts.nth(i).click(); clicou=true; break; } } }
await page.waitForTimeout(3000);
const det=page.getByRole('button',{name:/Ver detalhes Completos/i}); if(await det.count()){await det.first().click(); await page.waitForTimeout(2000);}
await page.screenshot({path:'testes/evidencias/f4_inst_correspondencia_desktop.png',fullPage:true});
const body=await page.locator('body').innerText();
ok('container «Inquérito com IA» no detalhe da correspondência enviada', (await page.locator('[data-testid="inquerito-ia-cartao-inst"]').count())>0);
ok('estado «Este cidadão respondeu» (pelo state_indicator, sem conteúdo)', (await page.locator('[data-testid="inquerito-ia-inst-respondido"]').count())>0);
ok('nenhuma resposta individual no DOM', !/Camião cisterna|Casa alugada|vendedora|motorista/i.test(body));
await page.waitForFunction(()=>/enviados/.test(document.querySelector('[data-testid="inquerito-ia-cartao-inst"]')?.textContent||''),null,{timeout:20000}).catch(()=>{});
const txtCartao=(await page.locator('[data-testid="inquerito-ia-cartao-inst"]').innerText()).replace(/\n+/g,' | ');
ok('contadores (enviados inclui destinatários manuais)', /\d+ enviados · \d+ iniciados · \d+ concluídos · \d+ recusados/.test(txtCartao), txtCartao.match(/\d+ enviados[^|]*/)?.[0]);
await page.locator('[data-testid="inquerito-ia-cartao-inst"]').scrollIntoViewIfNeeded(); await page.screenshot({path:'testes/evidencias/f4_inst_container_desktop.png'});
await page.locator('button[id^="btn-resultados-inquerito-ia-"]').click(); await page.locator('[data-testid="inquerito-ia-resultados"]').waitFor({timeout:15000});
await page.waitForFunction(()=>document.querySelectorAll('[data-testid="inquerito-ia-campo"]').length>=1,null,{timeout:20000});
ok('«Ver Resultados» abre o popup de agregados', (await page.locator('[data-testid="inquerito-ia-campo"]').count())>=1, `${await page.locator('[data-testid="inquerito-ia-campo"]').count()} campos`);
await page.screenshot({path:'testes/evidencias/f4_inst_resultados_desktop.png'});
ok('sem erros JS', erros.length===0, erros.join(' | ')); await browser.close();
console.log(`\n=== ${R.filter(Boolean).length}/${R.length} OK ===`); process.exit(R.every(Boolean)?0:1);
