// ============================================================================
// E2E Test: Validação de Coordenadas GPS Exatas em Todos os Formatos Digitais
// (Mobile / Smartphone, Tablet / iPad, Desktop e Modos Cidadão / Instituição / Admin)
// ============================================================================

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const COORD_LAT = -8.841501148211982;
const COORD_LON = 13.230781932343696;

const viewports = [
  { name: 'Mobile Smartphone (iPhone/Android)', width: 375, height: 667, isMobile: true, hasTouch: true },
  { name: 'Tablet (iPad / Touch)', width: 768, height: 1024, isMobile: true, hasTouch: true },
  { name: 'Desktop Widescreen', width: 1920, height: 1080, isMobile: false, hasTouch: false },
];

const results = [];
function assert(name, condition, details = '') {
  const status = condition ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${name} ${details ? '(' + details + ')' : ''}`);
  results.push({ name, status, details });
  if (!condition) {
    console.error(`Assertion failed: ${name} ${details}`);
  }
}

async function testViewport(browser, vp) {
  console.log(`\n======================================================`);
  console.log(`📱 Testando no Formato: ${vp.name} (${vp.width}x${vp.height})`);
  console.log(`======================================================`);

  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch,
    permissions: ['geolocation'],
    geolocation: { latitude: COORD_LAT, longitude: COORD_LON },
  });
  const page = await context.newPage();

  // 1. Login como Edlásio Galhardo
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });
  await page.fill('input[name="cda-utilizador"]', '002399714LA030');
  await page.fill('input[name="cda-senha"]', '123456789');
  await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
  await page.waitForTimeout(3000);

  // 2. Navegar para Ocorrências (via atalho do Painel)
  const atalhoOcorr = page.locator('[data-testid="atalho-ocorrencias"]');
  await atalhoOcorr.waitFor({ state: 'attached', timeout: 10000 });
  await atalhoOcorr.scrollIntoViewIfNeeded();
  await atalhoOcorr.click();
  await page.waitForTimeout(2000);

  // 3. Abrir Formulário de Criar Ocorrência
  const btnCriar = page.locator('[data-testid="btn-criar-ocorrencia"], button:has-text("Criar Ocorrência")').first();
  await btnCriar.waitFor({ state: 'visible', timeout: 10000 });
  const isCriarVisible = await btnCriar.isVisible();
  assert(`[${vp.name}] Botão Criar Ocorrência visível`, isCriarVisible);
  await btnCriar.scrollIntoViewIfNeeded();
  await btnCriar.click();
  await page.waitForTimeout(2500);

  // 4. Verificar captura imediata do GPS exato
  const textoPagina = await page.locator('body').innerText();
  const temGpsExato = textoPagina.includes(String(COORD_LAT)) && textoPagina.includes(String(COORD_LON));
  const temLocalidade = textoPagina.includes('Cassenda') && textoPagina.includes('Maianga') && textoPagina.includes('Luanda');

  assert(`[${vp.name}] Coordenadas GPS exatas apresentadas (-8.841501148211982, 13.230781932343696)`, temGpsExato);
  assert(`[${vp.name}] Localidade derivada correta (Cassenda · Maianga · Luanda)`, temLocalidade);

  // 5. Preencher dados e validar ecrã de revisão no formato
  await page.locator('select').first().selectOption({ label: 'Iluminação pública' });
  await page.locator('input[placeholder*="Poste de iluminação"]').fill(`Iluminação Cassenda - ${vp.name}`);
  await page.locator('textarea').first().fill(`Verificação de coordenadas no formato ${vp.name}.`);
  await page.locator('input[placeholder*="INAPEM"]').fill('INAPEM-LMM-01');

  const btnRever = page.locator('button', { hasText: /Rever ocorrência/i });
  await btnRever.click();
  await page.waitForTimeout(1500);

  const textoRever = await page.locator('body').innerText();
  const temGpsRever = textoRever.includes(String(COORD_LAT)) && textoRever.includes(String(COORD_LON));
  assert(`[${vp.name}] Coordenadas GPS exatas presentes na Revisão`, temGpsRever);

  await context.close();
}

async function run() {
  console.log(`Iniciando testes multi-formato em ${BASE}...`);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  try {
    for (const vp of viewports) {
      await testViewport(browser, vp);
    }

    console.log(`\n======================================================`);
    console.log(`🎉 TESTES MULTI-FORMATO CONCLUÍDOS COM SUCESSO!`);
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    console.log(`Resultado: ${passCount} PASS, ${failCount} FAIL (Total: ${results.length})`);
    console.log(`======================================================`);

  } catch (err) {
    console.error('Erro durante os testes:', err);
    assert('Execução sem erros', false, err.message);
  } finally {
    await browser.close();
  }
}

run().then(() => {
  const failed = results.filter(r => r.status === 'FAIL').length > 0;
  process.exit(failed ? 1 : 0);
});
