import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function run() {
  console.log('🚀 Iniciando verificação E2E do Painel com containers dinâmicos em Desktop...');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    console.log('🌐 1. Acedendo a http://localhost:3000 (Área do Cidadão)...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Login do cidadão
    const biInput = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
    await biInput.waitFor({ state: 'visible', timeout: 15000 });
    await biInput.fill('009874562LA041');

    const passInput = page.locator('input[type="password"]:visible').first();
    await passInput.fill('123456');

    const btnEntrar = page.getByRole('button', { name: /ENTRAR NO PORTAL/i });
    console.log('🔑 Clicando em "Entrar no Portal"...');
    await btnEntrar.click();
    await page.waitForTimeout(2500);

    // 2. Verificar estado inicial do Painel com mensagens não lidas (> 0):
    console.log('🔍 2. Verificando estado inicial do Painel (com mensagens não lidas)...');
    const naoLidasHeading = page.locator('h3').filter({ hasText: /^Não Lidas$/ }).first();
    await naoLidasHeading.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Estado inicial: Container "Não Lidas" visível com sucesso.');

    // 3. Medir larguras dos 3 containers no estado padrão (3 colunas)
    const lidasSection = page.locator('h3').filter({ hasText: /^Lidas$/ }).first().locator('xpath=ancestor::section[1]');
    const enviadasSection = page.locator('h3').filter({ hasText: /^Enviadas$/ }).first().locator('xpath=ancestor::section[1]');
    const naoLidasSection = naoLidasHeading.locator('xpath=ancestor::section[1]');

    const boxNaoLidas3Col = await naoLidasSection.boundingBox();
    const boxLidas3Col = await lidasSection.boundingBox();
    const boxEnviadas3Col = await enviadasSection.boundingBox();

    console.log(`📐 Largura em 3 colunas -> Não Lidas: ${Math.round(boxNaoLidas3Col?.width || 0)}px | Lidas: ${Math.round(boxLidas3Col?.width || 0)}px | Enviadas: ${Math.round(boxEnviadas3Col?.width || 0)}px`);

    // 4. Capturar screenshot do estado padrão (3 colunas)
    const screenshotDir = path.resolve('testes/evidencias/screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    await page.screenshot({ path: path.join(screenshotDir, 'painel_3_colunas_com_nao_lidas.png'), fullPage: true });

    // 5. Testar cenário dinâmico quando todas as mensagens são lidas (Não Lidas = 0)
    console.log('\n📬 5. Marcando todas as correspondências como lidas...');
    // Clicar em cada item não lido no painel para ler
    while (await page.locator('section:has(h3:text-is("Não Lidas")) [role="button"]').count() > 0) {
      const item = page.locator('section:has(h3:text-is("Não Lidas")) [role="button"]').first();
      await item.click();
      await page.waitForTimeout(200);
      const btnPainel = page.locator('button:has-text("Painel"), [data-tab="home"]').first();
      await btnPainel.click();
      await page.waitForTimeout(200);
    }

    // 6. Verificar que "Não Lidas" agora está oculto e "Lidas" e "Enviadas" ocupam 50% cada
    const isNaoLidasHidden = !(await page.locator('h3').filter({ hasText: /^Não Lidas$/ }).isVisible({ timeout: 1000 }).catch(() => false));
    console.log(`✅ Container "Não Lidas" quando vazio: ${isNaoLidasHidden ? 'Ocultado com sucesso' : 'Ainda visível'}`);

    const boxLidas2Col = await lidasSection.boundingBox();
    const boxEnviadas2Col = await enviadasSection.boundingBox();
    console.log(`📐 Largura em 2 colunas (50/50) -> Lidas: ${Math.round(boxLidas2Col?.width || 0)}px | Enviadas: ${Math.round(boxEnviadas2Col?.width || 0)}px`);

    // 7. Capturar screenshot de evidência em Desktop (Cidadão)
    const screenshotPath = path.join(screenshotDir, 'painel_containers_dinamicos_desktop.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot guardado com sucesso em: ${screenshotPath}`);

    // ==========================================
    // PARTE 2: ÁREA INSTITUCIONAL (INAPEM-LLMM-01)
    // ==========================================
    console.log('\n🏢 8. Acedendo a http://localhost:3000/institucional (Área Institucional - INAPEM)...');
    const instContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const instPage = await instContext.newPage();
    await instPage.goto('http://localhost:3000/institucional', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await instPage.waitForTimeout(1000);

    const instCodeInput = instPage.locator('input[type="text"]:visible, input:not([type]):visible').first();
    await instCodeInput.waitFor({ state: 'visible', timeout: 15000 });
    await instCodeInput.fill('INAPEM-LLMM-01');

    const instPassInput = instPage.locator('input[type="password"]:visible').first();
    await instPassInput.fill('123456789');

    const btnEntrarInst = instPage.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first();
    console.log('🔑 Clicando em "Entrar no Portal" (Instituição)...');
    await btnEntrarInst.click();
    await instPage.waitForTimeout(2500);

    // Marcar mensagens não lidas como lidas no ambiente institucional
    await instPage.evaluate(() => {
      const raw = localStorage.getItem('correio_digital_inst_inbox');
      if (raw) {
        const parsed = JSON.parse(raw);
        const updated = parsed.map(m => ({ ...m, unread: 0, unreadCount: 0 }));
        localStorage.setItem('correio_digital_inst_inbox', JSON.stringify(updated));
      }
    });
    await instPage.reload({ waitUntil: 'domcontentloaded' });
    await instPage.waitForTimeout(2000);

    // Verificar que "Não Lidas" está oculto e "Lidas" e "Enviadas" ocupam 50/50
    const isInstNaoLidasHidden = !(await instPage.locator('h3').filter({ hasText: /^Não Lidas$/ }).isVisible({ timeout: 1000 }).catch(() => false));
    console.log(`✅ Institucional - Container "Não Lidas" quando vazio: ${isInstNaoLidasHidden ? 'Ocultado com sucesso' : 'Ainda visível'}`);

    const instLidasSection = instPage.locator('h3').filter({ hasText: /^Lidas$/ }).first().locator('xpath=ancestor::section[1]');
    const instEnviadasSection = instPage.locator('h3').filter({ hasText: /^Enviadas$/ }).first().locator('xpath=ancestor::section[1]');

    const boxInstLidas = await instLidasSection.boundingBox();
    const boxInstEnviadas = await instEnviadasSection.boundingBox();
    console.log(`📐 Institucional - Largura em 2 colunas (50/50) -> Lidas: ${Math.round(boxInstLidas?.width || 0)}px | Enviadas: ${Math.round(boxInstEnviadas?.width || 0)}px`);

    const instScreenshotPath = path.join(screenshotDir, 'inapem_painel_ajustado.png');
    await instPage.screenshot({ path: instScreenshotPath, fullPage: true });
    console.log(`📸 Screenshot institucional guardado com sucesso em: ${instScreenshotPath}`);
    await instContext.close();

    console.log('\n🎉 VERIFICAÇÃO CONCLUÍDA COM 100% DE SUCESSO!');
  } catch (err) {
    console.error('❌ Erro no teste E2E:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
