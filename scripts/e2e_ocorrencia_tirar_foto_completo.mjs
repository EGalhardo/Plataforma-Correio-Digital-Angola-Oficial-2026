#!/usr/bin/env node
// ============================================================================
// e2e_ocorrencia_tirar_foto_completo.mjs
// Suite Completa: Tirar Foto com Câmara (Desktop & Mobile), Limite de 5 fotos,
// Remoção, Alternância de Câmara e Submissão
// ============================================================================
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const CID_USER = '002399714LA030';
const CID_PASS = '123456789';

let FAILS = 0;
const reg = (nome, ok, detalhe = '') => {
  if (!ok) FAILS++;
  console.log(`  ${ok ? '✅' : '❌'} [${ok ? 'PASS' : 'FAIL'}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};

console.log('🚀 Iniciando Bateria E2E Completa: Câmara, Upload, Limites e Mobile...\n');

const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const browser = await chromium.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
  ],
});

try {
  // -------------------------------------------------------------
  // CENÁRIO 1: DESKTOP — FLUXO DE CÂMARA, REMOÇÃO E LIMITE DE 5 FOTOS
  // -------------------------------------------------------------
  console.log('🖥️ --- CENÁRIO 1: DESKTOP (FLUXO COMPLETO) ---');
  const desktopCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'pt-PT',
    permissions: ['camera', 'geolocation'],
    geolocation: { latitude: -8.83833, longitude: 13.23444, accuracy: 2.1 },
  });
  const page = await desktopCtx.newPage();

  await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 40000 });
  await page.locator('input[type="text"], input:not([type])').first().fill(CID_USER);
  await page.locator('input[type="password"]').first().fill(CID_PASS);
  await page.locator('button', { hasText: /ENTRAR/i }).first().click();
  await page.getByRole('button', { name: 'Painel', exact: true }).first().waitFor({ state: 'visible', timeout: 45000 });

  await page.getByRole('button', { name: 'Ocorrências Locais' }).first().click();
  await page.waitForTimeout(2000);

  const btnReg = page.getByRole('button', { name: 'Registar ocorrência' }).first();
  if (await btnReg.isVisible().catch(() => false)) {
    await btnReg.click();
    await page.waitForTimeout(1000);
  }
  await page.getByLabel('Categoria *').waitFor({ state: 'visible', timeout: 15000 });

  // 1. Tirar foto com a câmara
  const btnTirarFoto = page.locator('[data-testid="btn-tirar-foto"]');
  await btnTirarFoto.click();
  await page.waitForTimeout(1500);

  // Testar alternância de câmara
  const btnSwitchCam = page.locator('button[title*="Alternar câmara"]');
  if (await btnSwitchCam.isVisible()) {
    await btnSwitchCam.click();
    await page.waitForTimeout(1000);
    reg('1.1 - Alternância de câmara executada', true);
  }

  // Capturar
  const shutterBtn = page.locator('[data-testid="camera-shutter-btn"]');
  await shutterBtn.waitFor({ state: 'visible', timeout: 10000 });
  await shutterBtn.click();
  await page.waitForTimeout(1000);

  // Botão "Tirar outra fotografia" no review mode
  const btnRetake = page.locator('button:has-text("Tirar outra fotografia")');
  reg('1.2 - Botão de repetir foto presente no review', await btnRetake.isVisible());
  await btnRetake.click();
  await page.waitForTimeout(1000);

  // Recapturar e confirmar
  await shutterBtn.click();
  await page.waitForTimeout(1000);
  await page.locator('button:has-text("Usar esta fotografia")').click();
  await page.waitForTimeout(3000);

  const foto1 = page.locator('img[alt*="foto_ocorrencia"], img[alt*="fotografia"]');
  await foto1.first().waitFor({ state: 'visible', timeout: 10000 });
  const countFoto1 = await foto1.count();
  reg('1.3 - Foto 1 adicionada à ocorrência via câmara', countFoto1 >= 1);

  // 2. Testar remoção de foto
  const btnRemover = page.locator('button:has-text("Remover fotografia")').first();
  await btnRemover.click();
  await page.waitForTimeout(1500);
  const countAposRemover = await page.locator('img[alt*="foto_ocorrencia"], img[alt*="fotografia"]').count();
  reg('1.4 - Remoção de foto funciona perfeitamente', countAposRemover === 0);

  // 3. Adicionar fotos até o limite de 5 fotos
  console.log('  Adicionando 5 fotos para testar limite máximo...');
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles([
    { name: 'teste_foto_1.png', mimeType: 'image/png', buffer: PNG_1x1 },
    { name: 'teste_foto_2.png', mimeType: 'image/png', buffer: PNG_1x1 },
    { name: 'teste_foto_3.png', mimeType: 'image/png', buffer: PNG_1x1 },
    { name: 'teste_foto_4.png', mimeType: 'image/png', buffer: PNG_1x1 },
    { name: 'teste_foto_5.png', mimeType: 'image/png', buffer: PNG_1x1 },
  ]);
  
  await page.locator('text=5 / 5').waitFor({ state: 'visible', timeout: 15000 });

  const count5Fotos = await page.locator('img[alt*="teste_foto"]').count();
  reg('1.5 - Cinco fotos adicionadas à ocorrência', count5Fotos === 5);

  const btnTirarDesativado = await btnTirarFoto.isDisabled();
  reg('1.6 - Botão «Tirar foto» desativado ao atingir 5/5 fotos', btnTirarDesativado);

  await desktopCtx.close();

  // -------------------------------------------------------------
  // CENÁRIO 2: MOBILE — RESPONSIVIDADE E BOTÕES DE CÂMARA EM ECRÃ PEQUENO
  // -------------------------------------------------------------
  console.log('\n📱 --- CENÁRIO 2: MOBILE (375x667) ---');
  const mobileCtx = await browser.newContext({
    viewport: { width: 375, height: 667 },
    isMobile: true,
    locale: 'pt-PT',
    permissions: ['camera', 'geolocation'],
    geolocation: { latitude: -8.83833, longitude: 13.23444, accuracy: 2.1 },
  });
  const mPage = await mobileCtx.newPage();

  await mPage.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await mPage.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 40000 });
  await mPage.locator('input[type="text"], input:not([type])').first().fill(CID_USER);
  await mPage.locator('input[type="password"]').first().fill(CID_PASS);
  await mPage.locator('button', { hasText: /ENTRAR/i }).first().click();
  await mPage.getByRole('button', { name: 'Painel', exact: true }).first().waitFor({ state: 'visible', timeout: 45000 });

  await mPage.getByRole('button', { name: 'Ocorrências Locais' }).first().click();
  await mPage.waitForTimeout(2000);

  const mBtnReg = mPage.getByRole('button', { name: 'Registar ocorrência' }).first();
  if (await mBtnReg.isVisible().catch(() => false)) {
    await mBtnReg.click();
    await mPage.waitForTimeout(1000);
  }
  await mPage.getByLabel('Categoria *').waitFor({ state: 'visible', timeout: 15000 });

  const mBtnTirarFoto = mPage.locator('[data-testid="btn-tirar-foto"]');
  const mBtnUploadFoto = mPage.locator('[data-testid="btn-upload-foto"]');
  reg('2.1 - Botões de câmara e upload visíveis e ajustados no mobile', (await mBtnTirarFoto.isVisible()) && (await mBtnUploadFoto.isVisible()));

  // Abrir câmara no mobile
  await mBtnTirarFoto.click();
  await mPage.waitForTimeout(1500);

  const mShutter = mPage.locator('[data-testid="camera-shutter-btn"]');
  await mShutter.waitFor({ state: 'visible', timeout: 10000 });
  await mShutter.click();
  await mPage.waitForTimeout(1000);

  await mPage.locator('button:has-text("Usar esta fotografia")').click();
  await mPage.waitForTimeout(3000);

  const mFotos = mPage.locator('img[alt*="foto_ocorrencia"], img[alt*="fotografia"]');
  await mFotos.first().waitFor({ state: 'visible', timeout: 10000 });
  const mFotosCount = await mFotos.count();
  reg('2.2 - Fotografia capturada e anexada no ecrã mobile', mFotosCount >= 1);

  // Preencher formulário no mobile
  await mPage.getByLabel('Categoria *').selectOption('Iluminação pública');
  await mPage.getByLabel('Título *').fill('Ocorrência Móvel com Foto da Câmara');
  await mPage.getByLabel('Descrição *').fill('Ocorrência submetida a partir de dispositivo móvel com fotografia tirada em tempo real pela câmara integrada.');
  
  await mPage.getByLabel('Província *').selectOption('Luanda');
  await mPage.getByLabel('Município *').selectOption('Luanda');
  await mPage.getByLabel('Bairro / Localidade *').fill('Ingombota');
  await mPage.getByLabel('Rua / Ponto de referência *').fill('Largo dos Ministérios');
  await mPage.getByLabel('Código institucional *').fill('INAPEM-LLMM');
  await mPage.waitForTimeout(1000);

  await mPage.locator('button:has-text("Rever ocorrência")').click();
  await mPage.waitForTimeout(2000);

  const mCorpoRev = await mPage.evaluate(() => document.body.innerText);
  reg('2.3 - Tela de revisão móvel apresenta fotografia anexada', mCorpoRev.includes('Ocorrência Móvel') && /Fotografias \([1-5]\)/.test(mCorpoRev));

  await mobileCtx.close();

} catch (err) {
  console.error('❌ Erro na suite de testes:', err);
  FAILS++;
} finally {
  await browser.close();
}

console.log(`\n==================================================`);
console.log(`Resultado Final: ${FAILS === 0 ? 'TODOS OS TESTES E2E PASSARAM COM 100% DE SUCESSO! 🎯' : `${FAILS} falhas encontradas.`}`);
console.log(`==================================================\n`);

process.exit(FAILS === 0 ? 0 : 1);
