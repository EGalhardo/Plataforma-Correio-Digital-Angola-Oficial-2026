/**
 * T46 — Pino de localização sobre os mapas embutidos:
 *  (a) «Ver Localização» do Detalhe da Correspondência (Google embed);
 *  (b) «Ver no mapa» da ficha do órgão no Directório (OpenStreetMap embed).
 * Verifica: pino visível, centrado no contentor do mapa (ponta = centro),
 * sem capturar eventos (pointer-events: none), rótulo, e capturas.
 * Uso: node testes/e2e_t46_pino_mapa.mjs   (BASE=https://… para produção)
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
let total = 0, okN = 0; const falhas = [];
const ok = (c, m) => { total++; if (c) { okN++; console.log(`✔ ${m}`); } else { falhas.push(m); console.log(`✘ ${m}`); } };

const login = async (page) => {
  await page.goto(`${BASE}/`); await page.waitForTimeout(2500);
  await page.locator('input[name="cda-utilizador"]').fill('009874562LA041');
  await page.locator('input[name="cda-senha"]').fill('123456');
  await page.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click();
  await page.waitForFunction(() => !/login/.test(location.hash), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  return !/login/.test(page.url());
};
const centroPino = async (pino) => {
  // ponta do pino = origem do contentor (top-left transformado para o centro do mapa)
  return pino.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top }; });
};
const centroMapa = async (pino) => pino.evaluate((el) => { const r = el.parentElement.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; });

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await ctx.newPage();
  const erros = []; page.on('pageerror', (e) => erros.push(String(e?.message || e)));
  ok(await login(page), 'login cidadão (demo)');

  // (a) Detalhe → Ver Localização
  await page.evaluate(() => { window.location.hash = '#/correspondencias'; }); await page.waitForTimeout(3000);
  const linha = page.locator('tr').filter({ has: page.getByRole('button', { name: /ABRIR/i }) }).first();
  await linha.getByRole('button', { name: /ABRIR/i }).first().click(); await page.waitForTimeout(2500);
  await page.locator('[title="Clique para ver no mapa"]').first().click(); await page.waitForTimeout(1500);
  const pinoA = page.locator('[data-testid="pino-mapa-detalhe"]');
  await pinoA.waitFor({ state: 'attached', timeout: 15000 });
  await page.waitForFunction(() => { const el = document.querySelector('[data-testid="pino-mapa-detalhe"]'); return el && getComputedStyle(el).opacity === '1'; }, null, { timeout: 20000 }).catch(() => {});
  ok(await pinoA.isVisible(), '(a) pino visível no mapa do Detalhe («Ver Localização»)');
  ok(await pinoA.locator('svg path').count() === 1, '(a) pino desenhado (SVG)');
  const cA = await centroPino(pinoA); const mA = await centroMapa(pinoA);
  ok(Math.abs(cA.x - mA.x) < 3 && Math.abs(cA.y - mA.y) < 3, `(a) ponta do pino no centro do mapa (Δ ${Math.abs(cA.x - mA.x).toFixed(1)}, ${Math.abs(cA.y - mA.y).toFixed(1)} px)`);
  ok(await pinoA.evaluate((el) => getComputedStyle(el).pointerEvents === 'none'), '(a) pino não bloqueia interacção com o mapa (pointer-events: none)');
  const rotA = (await pinoA.innerText()).trim();
  ok(rotA.length > 0, `(a) rótulo por cima do pino («${rotA}»)`);
  await page.screenshot({ path: 'testes/evidencias/t46_pino_detalhe.png', fullPage: false });
  // satélite mantém o pino
  await page.getByRole('button', { name: /^Satélite$/i }).first().click(); await page.waitForTimeout(1500);
  await page.waitForFunction(() => { const el = document.querySelector('[data-testid="pino-mapa-detalhe"]'); return el && getComputedStyle(el).opacity === '1'; }, null, { timeout: 20000 }).catch(() => {});
  ok(await pinoA.isVisible(), '(a) pino mantém-se na vista Satélite');

  // (b) Directório → ficha AGT → Ver no mapa
  await page.evaluate(() => { window.location.hash = '#/contatos'; }); await page.waitForTimeout(2000);
  await page.locator('#tab-contactos-instituicoes').click(); await page.waitForTimeout(800);
  await page.getByPlaceholder(/Pesquisar órgão/i).first().fill('AGT'); await page.waitForTimeout(600);
  await page.locator('button', { hasText: /Administração Geral Tributária|AGT/ }).filter({ hasNot: page.locator('#tab-contactos-instituicoes') }).first().click(); await page.waitForTimeout(800);
  await page.locator('#btn-directorio-ver-mapa').click(); await page.waitForTimeout(1500);
  const pinoB = page.locator('[data-testid="pino-mapa-directorio"]');
  await pinoB.scrollIntoViewIfNeeded().catch(() => {});
  ok(await pinoB.isVisible(), '(b) pino visível no mapa da ficha do órgão (Directório)');
  const cB = await centroPino(pinoB); const mB = await centroMapa(pinoB);
  ok(Math.abs(cB.x - mB.x) < 3 && Math.abs(cB.y - mB.y) < 3, `(b) ponta do pino no centro do mapa (Δ ${Math.abs(cB.x - mB.x).toFixed(1)}, ${Math.abs(cB.y - mB.y).toFixed(1)} px)`);
  ok(/AGT/.test(await pinoB.innerText()), '(b) rótulo = sigla do órgão (AGT)');
  ok(/marker=-8\.\d+%2C13\.\d+/.test(await page.locator('[data-testid="directorio-ficha-mapa-iframe"]').getAttribute('src') || ''), '(b) URL do embed continua com marker= (redundância)');
  await page.waitForTimeout(3000);
  await page.locator('[data-testid="directorio-ficha-mapa"]').screenshot({ path: 'testes/evidencias/t46_pino_directorio.png' });

  // mobile
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage(); mp.on('pageerror', (e) => erros.push(String(e?.message || e)));
  ok(await login(mp), '(mobile) login');
  await mp.evaluate(() => { window.location.hash = '#/contatos'; }); await mp.waitForTimeout(2000);
  await mp.locator('#tab-contactos-instituicoes').click(); await mp.waitForTimeout(800);
  await mp.getByPlaceholder(/Pesquisar órgão/i).first().fill('AGT'); await mp.waitForTimeout(600);
  await mp.locator('button', { hasText: /Administração Geral Tributária|AGT/ }).filter({ hasNot: mp.locator('#tab-contactos-instituicoes') }).first().click(); await mp.waitForTimeout(800);
  await mp.locator('#btn-directorio-ver-mapa').click(); await mp.waitForTimeout(1500);
  const pinoM = mp.locator('[data-testid="pino-mapa-directorio"]');
  await pinoM.scrollIntoViewIfNeeded().catch(() => {});
  const cM = await centroPino(pinoM); const mM = await centroMapa(pinoM);
  ok(await pinoM.isVisible() && Math.abs(cM.x - mM.x) < 3 && Math.abs(cM.y - mM.y) < 3, '(mobile) pino centrado no mapa');
  await mp.waitForTimeout(3000);
  await mp.locator('[data-testid="directorio-ficha-mapa"]').screenshot({ path: 'testes/evidencias/t46_pino_directorio_mobile.png' });
  await mctx.close();

  ok(erros.length === 0, `sem erros JS (${erros.length})`);
  if (erros.length) console.log(JSON.stringify(erros.slice(0, 3)));
} finally { await browser.close(); }
console.log(`=== RESULTADO: ${okN}/${total} verificações OK ===`);
if (falhas.length) console.log('FALHAS: ' + JSON.stringify(falhas));
process.exit(falhas.length ? 1 : 0);
