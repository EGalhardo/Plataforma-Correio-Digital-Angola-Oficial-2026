// Fase 3 — chat do cidadão. Conta real de cidadão (recebeu o «[TESTE]» da
// Fase 2). Modo: `node testes/e2e_f3_chat_inquerito_ia.mjs [mock|real]`
//  - mock (defeito): /api/inquerito-ia/conversa simulada por page.route
//  - real: IA real (gasta quota; usar 1× na validação final da fase)
import { chromium } from 'playwright';
import fs from 'node:fs';

const modo = process.argv[2] || 'mock';
const cred = fs.readFileSync('/home/user/.credenciais_cda/contas_reais.md', 'utf8');
const BI = process.env.BI || '002399714LA030';
const senha = (cred.match(new RegExp(`${BI}[^\\n]*?(\\d{9})`)) || [])[1] || '';
const ASSUNTO = process.env.ASSUNTO || '[TESTE] Inquérito com IA';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const erros = []; page.on('pageerror', (e) => erros.push(String(e)));
const api = []; page.on('response', (r) => { if (r.url().includes('/api/inquerito-ia/')) api.push(`${r.status()} ${new URL(r.url()).pathname}`); });

let turno = 0;
if (modo === 'mock') {
  await page.route('**/api/inquerito-ia/conversa', async (route) => {
    const body = route.request().postDataJSON();
    turno++;
    const respostas = [
      { proximaMensagem: 'Tem água canalizada em casa?', camposExtraidos: {}, respostaRapida: ['Sim', 'Não'], terminou: false, motivoFim: null },
      { proximaMensagem: 'Onde costuma ir buscar água?', camposExtraidos: { agua_canalizada: 'Não' }, respostaRapida: ['Chafariz', 'Camião cisterna', 'Rio ou nascente', 'Vizinho', 'Outro'], terminou: false, motivoFim: null },
      { proximaMensagem: 'A que distância fica, aproximadamente?', camposExtraidos: { fonte_agua: 'Chafariz' }, respostaRapida: null, terminou: false, motivoFim: null },
      { proximaMensagem: 'Muito obrigado pela sua participação. As suas respostas foram registadas.', camposExtraidos: { distancia_agua: '300 m' }, terminou: true, motivoFim: 'concluido', respostaRapida: null },
    ];
    const r = respostas[Math.min(turno - 1, respostas.length - 1)];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, modelo: 'mock', ...r, historicoRecebido: body.historico.length }) });
  });
}

await page.goto('http://localhost:3000/'); await page.waitForTimeout(2500);
await page.locator('input[name="cda-utilizador"]').fill(BI);
await page.locator('input[name="cda-senha"]').fill(senha);
await page.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click();
await page.waitForTimeout(4000);
await page.evaluate(() => { window.location.hash = '#/correspondencias'; }); await page.waitForTimeout(2500);

const linhas = page.getByText(new RegExp(ASSUNTO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
const total = await linhas.count();
let linha = null;
for (let i = 0; i < total; i++) { if (await linhas.nth(i).isVisible()) { linha = linhas.nth(i); break; } }
console.log('mensagem visível:', !!linha, `(${total} ocorrências)`);
if (!linha) { await page.screenshot({ path: 'testes/evidencias/f3_sem_msg.png' }); await browser.close(); process.exit(1); }
// Abrir pela acção «ABRIR» da linha (o texto não é clicável)
const fila = linha.locator('xpath=ancestor::tr[1] | ancestor::*[contains(@class,"rounded")][1]').first();
const abrir = page.getByRole('button', { name: /^Abrir$/i });
let clicou = false;
for (let i = 0; i < await abrir.count(); i++) {
  const b = abrir.nth(i);
  if (await b.isVisible()) {
    const linhaTexto = await b.evaluate((el) => (el.closest('tr') || el.closest('[class*="rounded"]') || el.parentElement).innerText);
    if (linhaTexto.includes(ASSUNTO)) { await b.click(); clicou = true; break; }
  }
}
if (!clicou) { await linha.click(); }
await page.waitForTimeout(2500);
const detalhes = page.getByRole('button', { name: /Ver detalhes Completos/i });
if (await detalhes.count()) { await detalhes.first().click(); await page.waitForTimeout(1500); }

const cartao = page.locator('[data-testid="inquerito-ia-cartao"]').first();
try { await cartao.waitFor({ timeout: 15000 }); } catch {
  await page.screenshot({ path: 'testes/evidencias/f3_sem_cartao.png', fullPage: true });
  const tem = await page.locator('[data-testid="inquerito-ia-cartoes"]').count();
  const sond = await page.locator('[data-testid="sondagem-card"]').count();
  const dados = await page.evaluate(() => (window).__cdaSelectedMsg || null);
  console.log('SEM CARTÃO. contentor:', tem, '| cartões sondagem:', sond, '| url:', page.url());
  console.log('texto da página (excerto):', (await page.locator('body').innerText()).slice(0, 1500).replace(/\n+/g, ' | '));
  await browser.close(); process.exit(1);
}
const textoCartao = await cartao.innerText();
console.log('cartão:', textoCartao.replace(/\n/g, ' | '));
await page.screenshot({ path: `testes/evidencias/f3_${modo}_cartao.png` });

const btn = cartao.locator('button[id^="btn-iniciar-inquerito-ia-"]');
if ((await btn.count()) === 0) {
  console.log('sem botão (estado encerrado/respondido) — fim do teste.');
  console.log('erros:', erros.length ? erros : 'nenhum');
  await browser.close(); process.exit(0);
}
console.log('botão:', await btn.innerText());
await btn.click();
const chat = page.locator('[data-testid="inquerito-ia-chat"]');
await chat.waitFor({ timeout: 15000 });
await page.waitForFunction(() => document.querySelectorAll('[data-testid="bolha-ia"]').length >= 1, null, { timeout: 20000 });
console.log('saudação:', await page.locator('[data-testid="bolha-ia"]').first().innerText());
console.log('chips saudação:', await page.locator('[data-testid="respostas-rapidas"] button').allInnerTexts());
console.log('microfone presente:', await page.locator('#btn-inquerito-ia-mic').count() > 0);
await page.screenshot({ path: `testes/evidencias/f3_${modo}_saudacao.png` });

const responder = async (t) => {
  const nIa = await page.locator('[data-testid="bolha-ia"]').count();
  await page.locator('#inquerito-ia-input').fill(t);
  await page.locator('#btn-inquerito-ia-enviar').click();
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="bolha-ia"]').length > n, nIa, { timeout: 90000 });
  const ult = await page.locator('[data-testid="bolha-ia"]').last().innerText();
  console.log(`  eu: «${t}»  →  IA: «${ult}»`);
  return ult;
};

await responder('Sim, podemos');
let respostas = ['Não tenho', 'No chafariz do bairro', 'Uns 300 metros', 'Não', 'Nenhuma', 'Falta de água', 'Sim', '4 horas', 'Cortes de luz', 'Não'];
for (let i = 0; i < respostas.length; i++) {
  if (await page.locator('#btn-inquerito-ia-concluir').count()) break;
  await responder(respostas[i]);
}
await page.waitForSelector('#btn-inquerito-ia-concluir', { timeout: 20000 });
const domChat = await chat.innerText();
// Asserção negativa: nenhum rótulo/valor extraído no DOM
const vazou = /agua_canalizada|fonte_agua|distancia_agua|Resumo|registad[oa]s?:|campos/i.test(domChat) && !/foram registadas/i.test(domChat);
console.log('sem resumo/campos no DOM:', !vazou, '| bolhas IA:', await page.locator('[data-testid="bolha-ia"]').count());
console.log('sem caixa de texto no fim:', (await page.locator('#inquerito-ia-input').count()) === 0);
await page.screenshot({ path: `testes/evidencias/f3_${modo}_fim.png` });
await page.locator('#btn-inquerito-ia-concluir').click();
await page.waitForTimeout(3000);
console.log('chat fechado:', (await chat.count()) === 0);
console.log('pill Respondido:', await page.locator('[data-testid="inquerito-ia-respondido"]').count() > 0);
await page.screenshot({ path: `testes/evidencias/f3_${modo}_respondido.png` });
console.log('api:', api);
console.log('erros:', erros.length ? erros : 'nenhum');
await browser.close();
