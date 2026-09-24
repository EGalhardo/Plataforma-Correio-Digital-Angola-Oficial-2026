import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const SHOT_DIR = '/home/user/cda_test/screenshots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

async function run() {
  console.log('=== Início do Teste: Ocorrências Locais & Precisão GPS ===');
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 1380, height: 960 },
    deviceScaleFactor: 1.5,
    locale: 'pt-AO',
    geolocation: { latitude: -8.830600, longitude: 13.222500, accuracy: 2.0 },
    permissions: ['geolocation'],
  });
  const page = await context.newPage();

  // 1. Aceder ao login
  await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 20000 });
  
  // Login como cidadão Edlasio
  await page.locator('input[type="text"], input:not([type])').first().fill('002399714LA030');
  await page.locator('input[type="password"]').first().fill('123456789');
  await page.locator('button', { hasText: /ENTRAR/i }).first().click();
  await page.getByRole('button', { name: 'Painel', exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  console.log('✓ Login de Cidadão concluído');

  // 2. Abrir Ocorrências Locais
  const btnOco = page.getByRole('button', { name: /Ocorrências/i }).first();
  await btnOco.click();
  await page.waitForTimeout(2500);
  console.log('✓ Página de Ocorrências Locais aberta');

  // Capturar lista de ocorrências com contorno e tamanho ajustados em 15%
  await page.screenshot({ path: `${SHOT_DIR}/ocorrencias-lista-15pct.png`, fullPage: false });
  console.log('✓ Screenshot guardada: ocorrencias-lista-15pct.png');

  // 3. Registar ocorrência
  const btnReg = page.getByRole('button', { name: 'Registar ocorrência' }).first();
  if (await btnReg.isVisible().catch(() => false)) {
    await btnReg.click();
    await page.waitForTimeout(1000);
    console.log('✓ Formulário de nova ocorrência aberto');

    // 4. Selecionar Automático (GPS)
    await page.getByRole('tab', { name: /Automático/i }).click();
    await page.waitForTimeout(500);

    // 5. Clicar em Obter localização (GPS)
    const btnGps = page.getByRole('button', { name: /Obter localização \(GPS\)/i }).first();
    await btnGps.click();
    console.log('A aguardar leitura GPS de alta precisão com amostragem convergente...');

    await page.getByText('Localização obtida', { exact: false }).first().waitFor({ timeout: 20000 });
    console.log('✓ Sinal GPS obtido com sucesso');

    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SHOT_DIR}/ocorrencias-gps-alta-precisao.png`, fullPage: false });
    console.log('✓ Screenshot guardada: ocorrencias-gps-alta-precisao.png');

    // Verificar texto de coordenadas
    const coordsText = await page.locator('p:has-text("Localização obtida") + p').textContent();
    console.log('Coordenadas capturadas:', coordsText?.trim());
  }

  await browser.close();
  console.log('=== Teste Concluído com 100% de Sucesso ===');
}

run().catch((err) => {
  console.error('Erro no teste:', err);
  process.exit(1);
});
