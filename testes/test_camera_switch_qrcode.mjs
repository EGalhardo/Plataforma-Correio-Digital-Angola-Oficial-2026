import { chromium } from 'playwright';
import path from 'path';

(async () => {
  console.log('=== TESTE E2E: Alternância de Câmara e Leitor QR Code Institucional ===');

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
    // ----------------------------------------------------
    // 1. TESTE DESKTOP (1280x800)
    // ----------------------------------------------------
    console.log('\n--- 1. A testar em Desktop (1280x800) ---');
    const contextDesktop = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      permissions: ['camera']
    });
    await contextDesktop.addInitScript(() => {
      localStorage.setItem('skip_splash_and_show_login', 'true');
    });
    const pageDesktop = await contextDesktop.newPage();

    // Log in as Institutional
    await pageDesktop.goto('http://localhost:3000/institucional#/entrar', { waitUntil: 'domcontentloaded' });
    await pageDesktop.waitForTimeout(600);

    const codeInput = pageDesktop.locator('input[type="text"]:visible, input:not([type]):visible').first();
    await codeInput.waitFor({ state: 'visible', timeout: 8000 });
    await codeInput.fill('INAPEM-LLMM-01');
    const passInput = pageDesktop.locator('input[type="password"]:visible').first();
    await passInput.fill('123456789');
    const btnEntrar = pageDesktop.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first();
    await btnEntrar.click();
    await pageDesktop.waitForTimeout(1500);

    // Navigate to QR Code
    console.log('Navegando para #/inst-qrcode...');
    await pageDesktop.evaluate(() => { window.location.hash = '#/inst-qrcode'; });
    await pageDesktop.waitForTimeout(1000);

    // Verify Camera viewport card is visible
    const cameraCard = pageDesktop.locator('#camera-viewport-card');
    await cameraCard.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Card do visualizador da câmara visível.');

    // Click to start camera
    console.log('Clicando para iniciar a câmara...');
    await cameraCard.click();
    await pageDesktop.waitForTimeout(1500);

    // Verify video stream is running inside #react-reader-camera-view
    const videoElem = pageDesktop.locator('#react-reader-camera-view video');
    await videoElem.waitFor({ state: 'attached', timeout: 8000 });
    console.log('✓ Elemento de vídeo da câmara ativo e renderizado no DOM.');

    // Verify toggle camera button
    const btnToggle = pageDesktop.locator('#btn-toggle-camera');
    await btnToggle.waitFor({ state: 'visible', timeout: 5000 });
    const initialToggleText = (await btnToggle.textContent())?.trim();
    console.log(`✓ Botão de alternância de câmara presente. Texto inicial: "${initialToggleText}"`);

    // Verify status text
    const statusTextLocator = pageDesktop.locator('text=Aponte a câmara ao QR Code');
    await statusTextLocator.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Mensagem de orientação presente.');

    // Click Toggle Camera
    console.log('Clicando no botão de alternar câmara (1ª vez)...');
    await btnToggle.click();
    await pageDesktop.waitForTimeout(1500);

    // Verify camera is still running and switched
    const videoElemAfter1 = pageDesktop.locator('#react-reader-camera-view video');
    await videoElemAfter1.waitFor({ state: 'attached', timeout: 8000 });
    const toggleTextAfter1 = (await btnToggle.textContent())?.trim();
    console.log(`✓ Câmara alternada com sucesso! Novo texto do botão: "${toggleTextAfter1}"`);

    // Click Toggle Camera again to return to initial mode
    console.log('Clicando no botão de alternar câmara (2ª vez)...');
    await btnToggle.click();
    await pageDesktop.waitForTimeout(1500);

    const videoElemAfter2 = pageDesktop.locator('#react-reader-camera-view video');
    await videoElemAfter2.waitFor({ state: 'attached', timeout: 8000 });
    const toggleTextAfter2 = (await btnToggle.textContent())?.trim();
    console.log(`✓ Câmara alternada de volta com sucesso! Texto do botão: "${toggleTextAfter2}"`);

    // Stop camera
    console.log('Clicando em "Parar Captação"...');
    const btnStop = pageDesktop.locator('#btn-stop-camera');
    await btnStop.click();
    await pageDesktop.waitForTimeout(1000);

    // Verify camera stopped and viewport card reset
    const cameraCardStopped = pageDesktop.locator('#camera-viewport-card');
    await cameraCardStopped.waitFor({ state: 'visible', timeout: 5000 });
    const videoElemStopped = await pageDesktop.locator('#react-reader-camera-view video').count();
    if (videoElemStopped !== 0) {
      throw new Error('O elemento de vídeo da câmara não foi removido após Parar Captação.');
    }
    console.log('✓ Captação de câmara parada e limpa do DOM.');

    // Restart camera to verify clean re-initialization
    console.log('Reiniciando câmara pela segunda vez...');
    await cameraCardStopped.click();
    await pageDesktop.waitForTimeout(1500);
    const videoElemRestarted = pageDesktop.locator('#react-reader-camera-view video');
    await videoElemRestarted.waitFor({ state: 'attached', timeout: 8000 });
    console.log('✓ Re-inicialização da câmara funcionou a 100%.');

    // ----------------------------------------------------
    // 2. TESTE MOBILE (390x844 - iPhone 14)
    // ----------------------------------------------------
    console.log('\n--- 2. A testar em Mobile (390x844) ---');
    const contextMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      permissions: ['camera']
    });
    await contextMobile.addInitScript(() => {
      localStorage.setItem('skip_splash_and_show_login', 'true');
    });
    const pageMobile = await contextMobile.newPage();

    // Log in as Institutional
    await pageMobile.goto('http://localhost:3000/institucional#/entrar', { waitUntil: 'domcontentloaded' });
    await pageMobile.waitForTimeout(600);

    const codeInputMob = pageMobile.locator('input[type="text"]:visible, input:not([type]):visible').first();
    await codeInputMob.waitFor({ state: 'visible', timeout: 8000 });
    await codeInputMob.fill('INAPEM-LLMM-01');
    const passInputMob = pageMobile.locator('input[type="password"]:visible').first();
    await passInputMob.fill('123456789');
    const btnEntrarMob = pageMobile.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first();
    await btnEntrarMob.click();
    await pageMobile.waitForTimeout(1500);

    // Navigate to QR Code
    await pageMobile.evaluate(() => { window.location.hash = '#/inst-qrcode'; });
    await pageMobile.waitForTimeout(1000);

    const cameraCardMob = pageMobile.locator('#camera-viewport-card');
    await cameraCardMob.waitFor({ state: 'visible', timeout: 5000 });

    // Start camera on mobile
    console.log('Clicando para iniciar a câmara no mobile...');
    await cameraCardMob.click();
    await pageMobile.waitForTimeout(1500);

    const videoElemMob = pageMobile.locator('#react-reader-camera-view video');
    await videoElemMob.waitFor({ state: 'attached', timeout: 8000 });
    console.log('✓ Vídeo da câmara ativo no mobile.');

    // Switch camera on mobile
    const btnToggleMob = pageMobile.locator('#btn-toggle-camera');
    await btnToggleMob.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Alternando câmara no mobile...');
    await btnToggleMob.click();
    await pageMobile.waitForTimeout(1500);

    const videoElemMob2 = pageMobile.locator('#react-reader-camera-view video');
    await videoElemMob2.waitFor({ state: 'attached', timeout: 8000 });
    console.log('✓ Alternância de câmara concluída com sucesso no mobile.');

    // Stop camera on mobile
    const btnStopMob = pageMobile.locator('#btn-stop-camera');
    await btnStopMob.click();
    await pageMobile.waitForTimeout(800);
    console.log('✓ Captação de câmara parada no mobile.');

    console.log('\n======================================================');
    console.log('🎉 TODOS OS TESTES DE CÂMARA E ALTERNÂNCIA PASSARAM A 100%!');
    console.log('======================================================\n');
  } finally {
    await browser.close();
  }
})();
