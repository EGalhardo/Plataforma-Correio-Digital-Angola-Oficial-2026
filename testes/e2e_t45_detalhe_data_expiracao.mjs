/**
 * T45 — Data de Expiração visível no «Detalhe da Correspondência» e em
 * «Ver detalhes Completos» (cidadão). Só leitura (conta real 002399714LA030,
 * carta «Teste Correspondencia» com deadline 14/09/2026 enviada pelo INAPEM).
 * Uso: node testes/e2e_t45_detalhe_data_expiracao.mjs   (BASE=https://… para produção)
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const ASSUNTO = process.env.ASSUNTO || 'Teste Correspondencia';
const ESPERADO = process.env.ESPERADO || '14/09/2026';
let total = 0, okN = 0; const falhas = [];
const ok = (c, m) => { total++; if (c) { okN++; console.log(`✔ ${m}`); } else { falhas.push(m); console.log(`✘ ${m}`); } };

const login = async (page) => {
  await page.goto(`${BASE}/`); await page.waitForTimeout(2500);
  await page.locator('input[name="cda-utilizador"]').fill('002399714LA030');
  await page.locator('input[name="cda-senha"]').fill('123456789');
  await page.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click();
  await page.waitForFunction(() => !/login/.test(location.hash), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  return !/login/.test(page.url());
};
const abrirCarta = async (page, mobile) => {
  await page.evaluate(() => { window.location.hash = '#/correspondencias'; }); await page.waitForTimeout(3000);
  const linha = () => (mobile ? page.locator('h5', { hasText: ASSUNTO }).first() : page.locator('tr', { hasText: ASSUNTO }).first());
  if (!(await linha().count())) { await page.getByRole('button', { name: /^Lidas/i }).first().click().catch(() => {}); await page.waitForTimeout(2500); }
  if (!(await linha().count())) return false;
  if (mobile) await linha().click(); else await linha().getByRole('button', { name: /ABRIR/i }).first().click();
  await page.waitForTimeout(3000);
  return true;
};
const esc = ESPERADO.replace(/\//g, '\\/');

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await ctx.newPage();
  const erros = []; page.on('pageerror', (e) => erros.push(String(e?.message || e)));
  ok(await login(page), 'login cidadão real (Edlasio)');
  ok(await abrirCarta(page, false), `carta «${ASSUNTO}» aberta (Detalhe da Correspondência)`);

  // Detalhe — faixa Data | Hora | Localidade | Data de Expiração
  const faixa = page.locator('[data-testid="detalhe-data-expiracao"]');
  ok(await faixa.isVisible(), '(detalhe) Data de Expiração na faixa de metadados (junto a Data/Hora/Localidade)');
  ok(new RegExp(esc).test(await faixa.innerText()), `(detalhe) faixa mostra ${ESPERADO}`);
  const localidade = page.locator('[title="Clique para ver no mapa"]').first();
  const bF = await faixa.boundingBox(); const bL = await localidade.boundingBox();
  ok(bF && bL && Math.abs((bF.y + bF.height / 2) - (bL.y + bL.height / 2)) < 12, '(detalhe) na mesma linha da Localidade (mapa)');
  ok(/Faltam \d+ dias|Expira hoje|Expira amanhã|Expirada/i.test(await faixa.innerText()), '(detalhe) descrição relativa (Faltam N dias / Expira hoje / Expirada)');
  // Detalhe — grelha do protocolo
  const grelha = page.locator('[data-testid="detalhe-grelha-data-expiracao"]');
  ok(await grelha.isVisible(), '(detalhe) Data de Expiração na grelha do protocolo');
  ok(/DATA DE EXPIRAÇÃO/i.test(await grelha.innerText()) && new RegExp(esc).test(await grelha.innerText()), `(detalhe) grelha: rótulo + ${ESPERADO}`);
  ok((await page.getByText(/Prazo Limite Regulamentar/i).count()) === 0, '(detalhe) rótulo antigo «Prazo Limite Regulamentar» substituído');
  await page.screenshot({ path: 'testes/evidencias/t45_detalhe_desktop.png', fullPage: true });

  // Ver detalhes Completos
  await page.getByRole('button', { name: /Ver detalhes Completos/i }).first().click(); await page.waitForTimeout(2000);
  const completo = page.locator('[data-testid="completo-data-expiracao"]');
  ok(await completo.isVisible(), '(completo) Data de Expiração visível em «Ver detalhes Completos»');
  ok(new RegExp(esc).test(await completo.innerText()), `(completo) mostra ${ESPERADO}`);
  const bC = await completo.boundingBox(); const bT = await page.getByText('Conteúdo do Documento').first().boundingBox();
  ok(bC && bT && Math.abs((bC.y + bC.height / 2) - (bT.y + bT.height / 2)) < 20, '(completo) alinhada com o título «Conteúdo do Documento»');
  await page.screenshot({ path: 'testes/evidencias/t45_completo_desktop.png', fullPage: true });

  // modo escuro
  await page.getByRole('button', { name: /Modo escuro/i }).first().click().catch(() => {}); await page.waitForTimeout(800);
  const corEscuro = await completo.locator('span.font-mono').evaluate((el) => getComputedStyle(el).color);
  ok(await completo.isVisible(), `(completo) visível em modo escuro (cor ${corEscuro})`);
  await page.screenshot({ path: 'testes/evidencias/t45_completo_escuro.png', clip: { x: 280, y: 60, width: 980, height: 260 } });
  await page.getByRole('button', { name: /Modo claro/i }).first().click().catch(() => {});

  // Mobile
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage(); mp.on('pageerror', (e) => erros.push(String(e?.message || e)));
  ok(await login(mp), '(mobile) login');
  ok(await abrirCarta(mp, true), '(mobile) carta aberta');
  const mf = mp.locator('[data-testid="detalhe-data-expiracao"]');
  await mf.scrollIntoViewIfNeeded().catch(() => {});
  ok(await mf.isVisible() && new RegExp(esc).test(await mf.innerText()), `(mobile) Data de Expiração ${ESPERADO} no detalhe`);
  const mb = await mf.boundingBox();
  ok(mb && mb.x + mb.width <= 390, '(mobile) sem transbordo horizontal');
  await mp.screenshot({ path: 'testes/evidencias/t45_detalhe_mobile.png', fullPage: true });
  await mctx.close();

  ok(erros.length === 0, `sem erros JS (${erros.length})`);
  if (erros.length) console.log(JSON.stringify(erros.slice(0, 3)));
} finally { await browser.close(); }
console.log(`=== RESULTADO: ${okN}/${total} verificações OK ===`);
if (falhas.length) console.log('FALHAS: ' + JSON.stringify(falhas));
process.exit(falhas.length ? 1 : 0);
