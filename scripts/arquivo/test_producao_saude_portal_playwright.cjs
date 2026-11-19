/**
 * Saúde do portal publicado — carregamento, erros de JS e indicadores visuais.
 *   node scripts/test_producao_saude_portal_playwright.cjs
 */
const { chromium } = require('playwright');

const APP = process.env.CDA_APP_URL || 'https://correio-digital-angola-oficial.vercel.app';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errosJs = [];
  const falhasRede = [];
  const naoEncontrados = [];
  page.on('pageerror', (e) => errosJs.push(String(e).slice(0, 160)));
  page.on('response', (r) => {
    const u = r.url();
    if (r.status() >= 400) falhasRede.push(`${r.status()} ${u.replace(APP, '').slice(0, 90)}`);
    if (r.status() === 404 && !u.includes('favicon')) naoEncontrados.push(u.replace(APP, '').slice(0, 90));
  });

  const out = {};
  const t0 = Date.now();
  await page.goto(APP, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  out.carregou_em_ms = Date.now() - t0;

  // O ecrã inicial deve mostrar a marca e não ficar em branco.
  out.titulo = await page.title();
  out.texto_inicial = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 220);

  // Erros visíveis do React (ecrã branco / "Algo correu mal").
  out.ecra_de_erro_visivel = await page.locator('text=/Algo (correu mal|deu errado)|Unexpected Application Error/i')
    .isVisible().catch(() => false);

  // Imagens da marca presentes (nenhuma quebrada).
  out.imagens_quebradas = await page.evaluate(() => Array.from(document.images)
    .filter((i) => i.complete && i.naturalWidth === 0)
    .map((i) => i.currentSrc.slice(-60)));

  // Fluxo de login acessível a partir do ecrã inicial.
  const btnEntrar = page.getByRole('button', { name: /entrar|iniciar sessão|aceder/i }).first();
  out.tem_botao_entrar = await btnEntrar.isVisible().catch(() => false);
  if (out.tem_botao_entrar) {
    await btnEntrar.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(2500);
    out.apos_clicar_entrar = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 260);
  }

  await page.screenshot({ path: '/home/user/auditoria-interoperabilidade/producao_portal.png', fullPage: false }).catch(() => {});

  out.erros_js = [...new Set(errosJs)].slice(0, 5);
  out.falhas_rede = [...new Set(falhasRede)].slice(0, 8);
  out.aprovado = errosJs.length === 0 && !out.ecra_de_erro_visivel && out.imagens_quebradas.length === 0;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
  if (!out.aprovado) process.exitCode = 1;
})();
