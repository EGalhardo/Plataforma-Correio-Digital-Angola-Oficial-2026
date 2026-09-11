/**
 * T41 — Ficha de contacto (demonstração) no Directório de Órgãos:
 * logomarca, contactos, mapa e «Enviar Mensagem» pré-preenchido.
 *
 * Conta demo do cidadão (sem IA, sem escrita na base). Verifica:
 *  (a) ficha mostra logomarca, telemóvel, endereço, e-mail, «Ver no mapa» e «Enviar Mensagem»;
 *  (b) «Ver no mapa» expande iframe OSM (ou fallback) + link Google Maps com as coordenadas;
 *  (c) «Enviar Mensagem» leva a #/correspondencias em modo Nova Mensagem;
 *  (d) Destinatário contém o código simulado do órgão;
 *  (e) #btn-enviar-mensagem activa após preencher o Título;
 *  (f) seta de voltar / «Sair» regressa ao Correio (lista);
 *  (g) código estável (ficha ↔ compositor, duas aberturas);
 *  (h) sem erros JS; (i) capturas desktop/mobile/escuro.
 *
 * Uso: node testes/e2e_t41_directorio_ficha_orgao.mjs   (BASE=https://… para produção)
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
  await page.waitForTimeout(4500);
  return !/login/.test(page.url());
};
const irHash = async (page, h) => { await page.evaluate((h) => { window.location.hash = `#/${h}`; }, h); await page.waitForTimeout(1800); };
const hashActual = (page) => page.evaluate(() => window.location.hash.replace(/^#\//, ''));
// cabeçalho do compositor (h3) — não confundir com o botão «Nova Mensagem» da lista
const compositorAberto = (page) => page.locator('h3', { hasText: /^NOVA MENSAGEM$/ }).first().isVisible().catch(() => false);

const abrirFichaAGT = async (page) => {
  await irHash(page, 'contatos');
  await page.locator('#tab-contactos-instituicoes').click(); await page.waitForTimeout(800);
  const busca = page.getByPlaceholder(/Pesquisar órgão/i).first();
  await busca.fill('AGT'); await page.waitForTimeout(600);
  const item = page.locator('button', { hasText: /Administração Geral Tributária|AGT/ }).filter({ hasNot: page.locator('#tab-contactos-instituicoes') }).first();
  await item.click(); await page.waitForTimeout(800);
  return page.locator('[data-testid="directorio-ficha-orgao"]');
};

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const erros = []; page.on('pageerror', (e) => erros.push(String(e?.message || e)));
  // limpa rascunho local do compositor para um arranque previsível
  ok(await login(page), 'login cidadão (demo)');
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('cda_rascunho_composicao_')) localStorage.removeItem(k); });

  // (a) ficha
  const ficha = await abrirFichaAGT(page);
  ok(await ficha.count() === 1 && await ficha.isVisible(), '(a) ficha do órgão aberta');
  ok(await ficha.locator('[data-testid="directorio-ficha-logo"] img').count() >= 1, '(a) logomarca (InstitutionLogo) renderizada');
  const tel = (await ficha.locator('[data-testid="directorio-ficha-telemovel"]').innerText()).trim();
  ok(/\+244 9\d{2} \d{3} \d{3}/.test(tel), `(a) telemóvel no formato +244 9XX XXX XXX (${tel.split('\n').pop()})`);
  ok(/^tel:\+2449\d{8}$/.test(await ficha.locator('[data-testid="directorio-ficha-telemovel"]').getAttribute('href') || ''), '(a) telemóvel clicável (tel:)');
  const end = (await ficha.locator('[data-testid="directorio-ficha-endereco"]').innerText()).trim();
  ok(/Luanda/.test(end) && /n\.º/.test(end), `(a) endereço (${end.split('\n').pop()})`);
  const mail = await ficha.locator('[data-testid="directorio-ficha-email"]').getAttribute('href');
  ok(/^mailto:geral@agt\.gov\.ao$/.test(mail || ''), `(a) e-mail clicável (${mail})`);
  ok(await page.locator('#btn-directorio-ver-mapa').isVisible(), '(a) botão «Ver no mapa» visível');
  ok(await page.locator('#btn-directorio-enviar-mensagem').isVisible(), '(a) botão «Enviar Mensagem» visível');
  ok(await ficha.getByText('Demonstração').count() >= 1, '(a) selo «Demonstração» presente');
  const codigoFicha = (await ficha.locator('[data-testid="directorio-ficha-codigo"]').innerText()).trim();
  ok(/^AGT-\d{4}-[A-Z]{2}$/.test(codigoFicha), `(a) código institucional simulado no padrão (${codigoFicha})`);
  await page.screenshot({ path: 'testes/evidencias/t41_ficha_desktop.png', fullPage: false });

  // (b) mapa
  ok(await page.locator('[data-testid="directorio-ficha-mapa"]').count() === 0, '(b) mapa NÃO carregado antes de expandir (lazy)');
  await page.locator('#btn-directorio-ver-mapa').click(); await page.waitForTimeout(1500);
  const mapa = page.locator('[data-testid="directorio-ficha-mapa"]');
  ok(await mapa.isVisible(), '(b) secção do mapa expandida');
  const iframe = mapa.locator('iframe'); const fallback = mapa.locator('[data-testid="directorio-ficha-mapa-fallback"]');
  ok((await iframe.count()) === 1 || (await fallback.count()) === 1, '(b) iframe OpenStreetMap ou fallback presente');
  if (await iframe.count()) {
    const src = await iframe.getAttribute('src');
    ok(/openstreetmap\.org\/export\/embed\.html\?bbox=.*marker=-8\.\d+%2C13\.\d+/.test(src || ''), '(b) iframe com bbox e marcador em Luanda');
    const alt = await iframe.evaluate((el) => el.getBoundingClientRect().height);
    ok(alt >= 270 && alt <= 290, `(b) altura do mapa em desktop ≈ 280 px (${Math.round(alt)})`);
  }
  const gm = mapa.locator('[data-testid="directorio-ficha-link-google-maps"]');
  const gmHref = await gm.getAttribute('href');
  ok(/^https:\/\/www\.google\.com\/maps\?q=-8\.\d{5},13\.\d{5}$/.test(gmHref || '') && (await gm.getAttribute('target')) === '_blank' && /noopener/.test(await gm.getAttribute('rel') || ''), `(b) link Google Maps com coordenadas (${gmHref})`);
  await page.screenshot({ path: 'testes/evidencias/t41_ficha_mapa_desktop.png', fullPage: false });
  // voltar em níveis: seta com mapa aberto fecha o mapa, não a ficha
  await page.locator('[data-testid="directorio-ficha-orgao"]').locator('xpath=ancestor::div[@role="tabpanel"]').locator('[data-cda-voltar]').first().click(); await page.waitForTimeout(500);
  ok(await page.locator('[data-testid="directorio-ficha-mapa"]').count() === 0 && await ficha.isVisible(), '(b) seta com mapa aberto → fecha o mapa e mantém a ficha');

  // (c)(d) Enviar Mensagem
  await page.locator('#btn-directorio-enviar-mensagem').click(); await page.waitForTimeout(1800);
  ok((await hashActual(page)) === 'correspondencias', '(c) navegou para #/correspondencias');
  ok(await compositorAberto(page), '(c) compositor «Nova Mensagem» aberto');
  const dest = page.locator('#recipient-inst-input');
  ok((await dest.inputValue()) === codigoFicha, `(d) destinatário pré-preenchido com o código simulado (${await dest.inputValue()})`);
  await page.screenshot({ path: 'testes/evidencias/t41_compositor_desktop.png', fullPage: false });

  // (e) o cidadão só preenche Título e Corpo → «Enviar» activa
  const enviar = page.locator('#btn-enviar-mensagem');
  ok(await enviar.isDisabled(), '(e) «Enviar» desactivado sem título/corpo');
  await page.getByPlaceholder(/Qual o tema da sua mensagem/i).fill('Pedido de informação (T41 — demonstração)');
  await page.locator('textarea').first().fill('Texto de demonstração — não enviado.');
  await page.waitForTimeout(1200);
  ok(!(await enviar.isDisabled()), '(e) «Enviar» activo após preencher Título e Corpo (destinatário já vinha da ficha)');

  // (f) seta de voltar do compositor: com conteúdo pede confirmação de descarte
  await page.locator('[data-cda-scroll] [data-cda-voltar]').first().click(); await page.waitForTimeout(700);
  const descartar = page.getByRole('button', { name: /^Descartar$/i }).first();
  ok(await descartar.count() === 1, '(f) seta com rascunho → confirmação de descarte');
  if (await descartar.count()) { await descartar.click(); await page.waitForTimeout(1000); }
  ok((await hashActual(page)) === 'correspondencias' && !(await compositorAberto(page)), '(f) após descartar regressa à lista do Correio');

  // (g) estabilidade: reabrir a ficha e o compositor dá o mesmo código
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('cda_rascunho_composicao_')) localStorage.removeItem(k); });
  const ficha2 = await abrirFichaAGT(page);
  const codigo2 = (await ficha2.locator('[data-testid="directorio-ficha-codigo"]').innerText()).trim();
  ok(codigo2 === codigoFicha, `(g) código estável entre aberturas (${codigo2})`);
  await page.locator('#btn-directorio-enviar-mensagem').click(); await page.waitForTimeout(1500);
  ok((await page.locator('#recipient-inst-input').inputValue()) === codigoFicha, '(g) compositor com o mesmo código na 2.ª abertura');
  // «Sair» sem conteúdo (apenas destinatário) → volta à lista sem confirmação
  await page.getByRole('button', { name: /^Sair$/i }).first().click(); await page.waitForTimeout(900);
  ok(!(await compositorAberto(page)), '(f) «Sair» regressa à lista do Correio');

  // Modo escuro
  const ficha3 = await abrirFichaAGT(page);
  const toggle = page.getByRole('button', { name: /Modo escuro/i }).first();
  if (await toggle.count()) {
    await toggle.click(); await page.waitForTimeout(700);
    const bg = await ficha3.evaluate((el) => getComputedStyle(el).backgroundColor);
    ok(!/rgb\(255, 255, 255\)/.test(bg), `(i) modo escuro — ficha com fundo escuro (${bg})`);
    await page.locator('#btn-directorio-ver-mapa').click(); await page.waitForTimeout(800);
    await page.screenshot({ path: 'testes/evidencias/t41_ficha_escuro.png', fullPage: false });
    await page.getByRole('button', { name: /Modo claro/i }).first().click(); await page.waitForTimeout(400);
  }

  ok(erros.length === 0, `(h) sem erros JS ${erros.length ? '— ' + erros.slice(0, 2).join(' | ') : ''}`);
  await ctx.close();

  // Mobile
  const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pm = await ctxM.newPage();
  const errosM = []; pm.on('pageerror', (e) => errosM.push(String(e?.message || e)));
  ok(await login(pm), '[mobile] login');
  const fichaM = await abrirFichaAGT(pm);
  ok(await fichaM.isVisible() && await pm.locator('#btn-directorio-enviar-mensagem').isVisible(), '[mobile] ficha com «Enviar Mensagem»');
  await pm.locator('#btn-directorio-ver-mapa').click(); await pm.waitForTimeout(1200);
  const ifM = pm.locator('[data-testid="directorio-ficha-mapa"] iframe');
  if (await ifM.count()) {
    const altM = await ifM.evaluate((el) => el.getBoundingClientRect().height);
    ok(altM >= 210 && altM <= 230, `[mobile] altura do mapa ≈ 220 px (${Math.round(altM)})`);
  }
  await pm.locator('[data-testid="directorio-ficha-mapa"]').scrollIntoViewIfNeeded();
  await pm.screenshot({ path: 'testes/evidencias/t41_ficha_mobile.png', fullPage: false });
  await pm.locator('#btn-directorio-enviar-mensagem').click(); await pm.waitForTimeout(1500);
  ok((await hashActual(pm)) === 'correspondencias' && (await pm.locator('#recipient-inst-input').inputValue()) === codigoFicha, '[mobile] compositor com destinatário pré-preenchido');
  ok(errosM.length === 0, `[mobile] sem erros JS ${errosM.length ? '— ' + errosM.slice(0, 2).join(' | ') : ''}`);
  await ctxM.close();
} finally {
  await browser.close();
}
console.log(`\n=== RESULTADO: ${okN}/${total} verificações OK ===`);
if (falhas.length) { console.log('Falhas:\n - ' + falhas.join('\n - ')); process.exit(1); }
