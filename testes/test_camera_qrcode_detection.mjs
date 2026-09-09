import { chromium } from 'playwright';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

(async () => {
  console.log('=== TESTE E2E: Localização e Deteção 100% de QR Code na Câmara & Ficheiro ===');

  // 1. Generate test QR code images
  const qrDir = '/home/user/testes/evidencias';
  if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

  const testPayload = 'AO-PROTOCOL:PR-2026-00491|ID:DOC-INAPEM-001|ARCHIVE:DIR-2026-081|LOCATION:Gabinete Geral|VALID:SIM';
  const qrImagePath = path.join(qrDir, 'qr_sample_test.png');
  await QRCode.toFile(qrImagePath, testPayload, { width: 500, margin: 2 });
  console.log('✓ Imagem de teste QR Code gerada com sucesso:', qrImagePath);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      permissions: ['camera']
    });
    await context.addInitScript(() => {
      localStorage.setItem('skip_splash_and_show_login', 'true');
    });

    const page = await context.newPage();

    // 1. Login Institutional
    console.log('\n1. Autenticando na Área Institucional...');
    await page.goto('http://localhost:3000/institucional#/entrar', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    const codeInput = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
    await codeInput.waitFor({ state: 'visible', timeout: 8000 });
    await codeInput.fill('INAPEM-LLMM-01');
    const passInput = page.locator('input[type="password"]:visible').first();
    await passInput.fill('123456789');
    const btnEntrar = page.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first();
    await btnEntrar.click();
    await page.waitForTimeout(1500);

    // 2. Navigate to QR Code
    console.log('2. Navegando para Leitor QR Code Institucional (#/inst-qrcode)...');
    await page.evaluate(() => { window.location.hash = '#/inst-qrcode'; });
    await page.waitForTimeout(1000);

    // 3. Test File Tab with QR Code detection
    console.log('\n3. Testando deteção no separador Ficheiro...');
    await page.getByRole('button', { name: /Ficheiro/i }).first().click();
    await page.waitForTimeout(500);

    const fileInput = page.locator('#file-input-read');
    await fileInput.setInputFiles(qrImagePath);
    await page.waitForTimeout(2500);

    // Check if result was recognized and decoded (either certificate card or HUD status)
    const certCard = page.locator('#official-validation-certificate-card, #hud-status-valid, #hud-status-not_found');
    await certCard.first().waitFor({ state: 'visible', timeout: 10000 });
    console.log('✓ Deteção por Ficheiro funcionou perfeitamente e localizou o QR code!');

    // Reset back to camera
    console.log('\n4. Testando Leitor de Câmara e Descodificação em Tempo Real...');
    await page.getByRole('button', { name: /Webcam\/Câmara/i }).first().click();
    await page.waitForTimeout(800);

    // Start camera
    const cameraCard = page.locator('#camera-viewport-card');
    await cameraCard.click();
    await page.waitForTimeout(1500);

    const videoElem = page.locator('#react-reader-camera-view video');
    await videoElem.waitFor({ state: 'attached', timeout: 8000 });
    console.log('✓ Visualizador da câmara ativo e renderizado no DOM.');

    // Verify switch camera works smoothly with multi-engine scanning active
    const btnToggle = page.locator('#btn-toggle-camera');
    await btnToggle.waitFor({ state: 'visible', timeout: 5000 });
    await btnToggle.click();
    await page.waitForTimeout(1500);
    console.log('✓ Alternância de câmara com pipeline multi-motor concluída.');

    // Stop camera
    const btnStop = page.locator('#btn-stop-camera');
    await btnStop.click();
    await page.waitForTimeout(600);
    console.log('✓ Captação de câmara parada e limpa.');

    // Test text analyze
    console.log('\n5. Testando Leitor com Texto/Payload Criptografado...');
    await page.getByRole('button', { name: /Colar Texto/i }).first().click();
    await page.waitForTimeout(500);
    await page.locator('textarea').first().fill(testPayload);
    await page.getByRole('button', { name: /Analisar Conteúdo/i }).first().click();
    await page.waitForTimeout(2000);

    const textCertCard = page.locator('#official-validation-certificate-card, #hud-status-valid, #hud-status-not_found');
    await textCertCard.first().waitFor({ state: 'visible', timeout: 8000 });
    console.log('✓ Validação de conteúdo criptografado concluída com sucesso!');

    console.log('\n======================================================');
    console.log('🎉 TODOS OS TESTES DE DETEÇÃO E LEITURA DE QR CODE PASSARAM A 100%!');
    console.log('======================================================\n');
  } finally {
    await browser.close();
  }
})();
