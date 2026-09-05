import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const OUT_DIR = '/home/user/testes/evidencias/layout_harmonia';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function runLayoutHarmoniaTest() {
  console.log('🚀 Iniciando teste de verificação de harmonia de layout (Correio vs Nova Mensagem)...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Escuta erros de console
  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  try {
    // 1. Acesso à área institucional
    console.log('1. Acessando portal institucional...');
    await page.goto(`${BASE_URL}/institucional#/entrar`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    
    // Login institucional
    const userInput = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
    await userInput.waitFor({ state: 'visible', timeout: 8000 });
    await userInput.fill('INAPEM-LLMM-01');

    const passInput = page.locator('input[type="password"]:visible').first();
    await passInput.fill('123456789');

    const btnEntrar = page.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first();
    await btnEntrar.click();
    await page.waitForTimeout(2500);

    // 2. Navegar para Correio Institucional
    console.log('2. Acessando Correio Institucional...');
    const btnCorreio = page.locator('button:has-text("Correio"), [data-tab="mail"]').first();
    if (await btnCorreio.isVisible().catch(() => false)) {
      await btnCorreio.click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto(`${BASE_URL}/institucional#/correio`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    }

    // Capturar screenshot do Correio Institucional Desktop
    await page.screenshot({ path: path.join(OUT_DIR, '01_institucional_correio_desktop.png'), fullPage: false });
    console.log('📸 Capturado: 01_institucional_correio_desktop.png');

    // 3. Clicar em "Nova Mensagem" / "Compor"
    console.log('3. Abrindo Nova Mensagem...');
    const composeBtn = page.locator('button:has-text("Nova Mensagem"), button:has-text("Compor Mensagem"), button:has-text("Escrever")').first();
    await composeBtn.click();
    await page.waitForTimeout(1500);

    // Capturar screenshot do Nova Mensagem Desktop
    await page.screenshot({ path: path.join(OUT_DIR, '02_institucional_nova_mensagem_desktop.png'), fullPage: false });
    console.log('📸 Capturado: 02_institucional_nova_mensagem_desktop.png');

    // Preencher alguns campos para verificar o estado preenchido
    console.log('4. Preenchendo campos de Nova Mensagem para teste de harmonia visual...');
    const recipientInput = page.locator('input[placeholder*="Digite o NIF"], input[placeholder*="Pesquisar"], input[placeholder*="Destinatário"]').first();
    if (await recipientInput.isVisible().catch(() => false)) {
      await recipientInput.fill('5001234567');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }

    const subjectInput = page.locator('input[placeholder*="Assunto"], input[name="subject"]').first();
    if (await subjectInput.isVisible().catch(() => false)) {
      await subjectInput.fill('Notificação Oficial sobre Regularização Cadastral');
    }

    await page.screenshot({ path: path.join(OUT_DIR, '03_institucional_nova_mensagem_preenchida_desktop.png'), fullPage: false });
    console.log('📸 Capturado: 03_institucional_nova_mensagem_preenchida_desktop.png');

    // 5. Testar responsividade - Tablet (768x1024)
    console.log('5. Testando Tablet (768x1024)...');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, '04_institucional_nova_mensagem_tablet.png'), fullPage: false });

    // 6. Testar responsividade - Mobile (375x812)
    console.log('6. Testando Mobile (375x812)...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, '05_institucional_nova_mensagem_mobile.png'), fullPage: false });

    // 7. Voltar para Desktop e testar botão "Voltar ao Correio"
    console.log('7. Testando botão Voltar ao Correio em Desktop...');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    const backBtn = page.locator('button:has-text("Voltar ao Correio"), button:has-text("Voltar")').first();
    if (await backBtn.isVisible().catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT_DIR, '06_institucional_correio_apos_voltar.png'), fullPage: false });
      console.log('📸 Capturado: 06_institucional_correio_apos_voltar.png');
    }

    console.log('✅ Testes de harmonia concluídos com sucesso!');
    console.log(`Erros de consola encontrados: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log(consoleErrors);
    }
  } catch (err) {
    console.error('❌ Erro durante o teste:', err);
  } finally {
    await browser.close();
  }
}

runLayoutHarmoniaTest();
