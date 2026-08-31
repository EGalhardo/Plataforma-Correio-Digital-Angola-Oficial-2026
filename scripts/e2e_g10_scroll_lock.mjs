// v37.78.21 — Validação G10 (bloqueio do scroll do fundo com modal aberto)
// Fluxo: login cidadão real → #/documentos → abrir modal «Descartar» (CdaModal)
//        → assert overflow hidden (body + [data-cda-scroll]) → Escape → assert restauro.
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const erros = [];
const ok = (nome, cond) => { console.log(`${cond ? '[PASS]' : '[FALHOU]'} ${nome}`); if (!cond) erros.push(nome); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));

// login cidadão (padrão dos e2e existentes)
await page.goto(`${BASE}/?cb=${Date.now()}#/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 40000 });
await page.locator('input[type="text"], input:not([type])').first().fill('002399714LA030');
await page.locator('input[type="password"]').first().fill('123456789');
await page.locator('button', { hasText: /ENTRAR/i }).first().click().catch(() => {});
await page.waitForTimeout(13000);
ok('login cidadão entrou', !(await page.evaluate(() => document.body.innerText)).match(/Credenciais incorrectas|ACESSO NEGADO/i));

// correio → composer → modal «Descartar» (CdaConfirmModal ≡ CdaModal)
await page.goto(`${BASE}/#/correspondencias`);
await page.waitForTimeout(2000);
await page.locator('button', { hasText: /Nova Mensagem/i }).first().click();
await page.waitForTimeout(1200);
await page.locator('button', { hasText: /^Descartar$/ }).first().click();
await page.waitForTimeout(700);

const estado = await page.evaluate(() => {
  const shell = document.querySelector('[data-cda-scroll]');
  return {
    bodyOv: getComputedStyle(document.body).overflow,
    shellOv: shell ? getComputedStyle(shell).overflow : 'SEM-SHELL',
    modalVisivel: !!document.querySelector('.fixed.inset-0.z-\\[99999\\]'),
  };
});
ok('modal aberto (CdaModal visível)', estado.modalVisivel);
ok('body overflow=hidden com modal aberto', estado.bodyOv === 'hidden');
ok('shell [data-cda-scroll] overflow=hidden', estado.shellOv === 'hidden');

// Escape fecha (G4) e o scroll é restaurado
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
const pos = await page.evaluate(() => {
  const shell = document.querySelector('[data-cda-scroll]');
  return {
    bodyOv: getComputedStyle(document.body).overflow,
    shellOv: shell ? getComputedStyle(shell).overflow : 'SEM-SHELL',
    modalFechado: !document.querySelector('.fixed.inset-0.z-\\[99999\\]'),
  };
});
ok('modal fechou com Escape', pos.modalFechado);
ok('body overflow restaurado', pos.bodyOv !== 'hidden');
ok('shell overflow restaurado', pos.shellOv !== 'hidden');

await browser.close();
if (erros.length) { console.log('ERROS: ' + erros.join(' | ')); process.exit(1); }
console.log('G10 OK — ' + BASE);
