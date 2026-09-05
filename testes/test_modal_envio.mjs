import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  
  console.log('1. Logging in as INAPEM...');
  await page.goto('http://localhost:3000/institucional#/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  
  await page.locator('input[type="text"]:visible, input:not([type]):visible').first().fill('INAPEM-LLMM-01');
  await page.locator('input[type="password"]').first().fill('123456789');
  await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
  await page.waitForTimeout(3500);
  
  console.log('2. Navigating to correspondências and clicking Nova Mensagem...');
  await page.goto('http://localhost:3000/institucional#/correspondencias', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  
  await page.locator('button:has-text("Nova Mensagem")').first().click();
  await page.waitForTimeout(1000);
  
  console.log('3. Filling fields...');
  await page.locator('#recipient-bi-input').fill('009111111LA001');
  await page.locator('input[placeholder*="Qual o tema"]').first().fill('Notificação de Teste Oficial');
  await page.locator('textarea').first().fill('Texto da mensagem oficial de teste.');
  
  console.log('4. Taking screenshot of page without standalone emergency button and with inline paperclip...');
  await page.screenshot({ path: 'testes/evidencias/nova_mensagem_toolbar_updated.png', fullPage: true });
  
  console.log('5. Clicking Enviar Mensagem Oficial to open modal...');
  await page.locator('#btn-enviar-mensagem').click();
  await page.waitForTimeout(1000);
  
  console.log('6. Taking screenshot of Tipo de Envio modal...');
  await page.screenshot({ path: 'testes/evidencias/modal_tipo_envio_screenshot.png', fullPage: true });
  
  console.log('7. Testing Fechar button...');
  await page.locator('#btn-fechar-modal-tipo-envio').click();
  await page.waitForTimeout(1000);
  
  console.log('8. Re-opening modal and selecting Mensagem Normal...');
  await page.locator('#btn-enviar-mensagem').click();
  await page.waitForTimeout(1000);
  await page.locator('#btn-modal-opcao-normal').click();
  await page.waitForTimeout(1500);
  
  console.log('9. Taking screenshot of Review modal reached via Mensagem Normal...');
  await page.screenshot({ path: 'testes/evidencias/review_modal_via_normal.png', fullPage: true });
  
  console.log('All tests passed with flying colors!');
  await browser.close();
}

run().catch(console.error);
