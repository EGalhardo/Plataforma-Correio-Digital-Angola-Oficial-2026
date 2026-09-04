/**
 * Teste E2E de validação da página "Nova Mensagem" na Área da Instituição:
 * - Login institucional com credenciais oficiais (PIN 000000)
 * - Navegação para Correio -> "Nova Mensagem"
 * - Verificação de que NÃO existe tabbar / alternância Cidadão vs Interinstitucional
 * - Verificação de que o campo "Destinatário (Nº do BI — exacto)" é o único destino direto
 * - Captura de screenshot de evidência visual
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function run() {
  console.log('🚀 Iniciando verificação E2E da página Nova Mensagem institucional limpa...');
  
  const screenshotsDir = 'testes/evidencias/screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      console.log(`[Browser error]: ${msg.text()}`);
    }
  });

  try {
    console.log('🌐 1. Acedendo à área institucional (/institucional)...');
    await page.goto('http://localhost:3000/institucional', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const passwordInput = page.locator('input[type="password"]');
    if (await passwordInput.isVisible()) {
      console.log('🔑 Preenchendo credenciais institucionais...');
      await passwordInput.fill('000000');
      const entrarBtn = page.getByRole('button', { name: /ENTRAR NO PORTAL/i });
      await entrarBtn.click();
      await page.waitForTimeout(2000);
    }

    console.log('📬 2. Navegando para o Correio...');
    const correioTab = page.locator('aside nav button:has-text("Correio"), button:has-text("Correio")').first();
    await correioTab.click();
    await page.waitForTimeout(1000);

    console.log('✍️ 3. Clicando em "Nova Mensagem"...');
    const novaMsgBtn = page.locator('button:has-text("Nova Mensagem")').first();
    await novaMsgBtn.click();
    await page.waitForTimeout(1000);

    // 4. Verificar ausência de tabbar / botões interinstitucionais
    console.log('🔍 4. Verificando ausência de seletores interinstitucionais...');
    const btnInter = page.locator('#btn-dest-interinstitucional, button:has-text("OUTRA INSTITUIÇÃO")');
    const hasInter = await btnInter.isVisible().catch(() => false);
    if (hasInter) {
      throw new Error('ERRO: O seletor interinstitucional ainda está visível no DOM!');
    }
    console.log('✅ Confirmado: NENHUM tabbar ou botão interinstitucional presente no formulário.');

    // 5. Verificar presença exclusiva do campo de B.I.
    console.log('👤 5. Verificando campo exclusivo de Destinatário Cidadão...');
    const biLabel = page.locator('text=Destinatário (Nº do BI — exacto)').first();
    await biLabel.waitFor({ state: 'visible', timeout: 5000 });
    const biInput = page.locator('#recipient-bi-input');
    await biInput.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ Campo de B.I. do cidadão verificado com sucesso.');

    // 6. Capturar screenshot
    const screenshotPath = path.join(screenshotsDir, 'institucional_nova_mensagem_limpa.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`📸 Screenshot guardado com sucesso em: ${screenshotPath}`);

    console.log('\n🎉 VERIFICAÇÃO CONCLUÍDA COM 100% DE SUCESSO!\n');
  } catch (err) {
    console.error('❌ Erro na verificação:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
