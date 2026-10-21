import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function run() {
  console.log('🚀 Iniciando bateria completa de testes E2E do Painel de Correspondências...');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const screenshotDir = path.resolve('testes/evidencias/screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // =========================================================================
    // PARTE 1: MODO DESKTOP (1440x900) - ORDENAÇÃO E VISIBILIDADE CONDICIONAL
    // =========================================================================
    console.log('\n🖥️ --- TESTES MODO DESKTOP (>= 1024px) ---');
    const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    console.log('🌐 1. Login na Área do Cidadão...');
    await desktopPage.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await desktopPage.waitForTimeout(1000);

    const biInput = desktopPage.locator('input[type="text"]:visible, input:not([type]):visible').first();
    await biInput.waitFor({ state: 'visible', timeout: 15000 });
    await biInput.fill('009874562LA041');

    const passInput = desktopPage.locator('input[type="password"]:visible').first();
    await passInput.fill('123456');

    const btnEntrar = desktopPage.getByRole('button', { name: /ENTRAR NO PORTAL/i });
    await btnEntrar.click();
    await desktopPage.waitForTimeout(2500);

    // -------------------------------------------------------------------------
    // Cenário 1: Estado com Enviadas > 0 (Lidas + Não Lidas + Enviadas = 3 containers)
    // -------------------------------------------------------------------------
    console.log('\n📦 Cenário 1: Lidas > 0, Não Lidas > 0, Enviadas > 0');
    await desktopPage.evaluate(() => {
      const citizenKey = '009874562LA041';
      localStorage.setItem('correio_digital_deleted_message_ids', JSON.stringify([]));
      localStorage.setItem(`cda_deleted_messages_${citizenKey}`, JSON.stringify([]));
      localStorage.setItem('correio_digital_hidden_messages', JSON.stringify([]));
      localStorage.setItem(`cda_hidden_messages_${citizenKey}`, JSON.stringify([]));
    });
    await desktopPage.reload({ waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1500);

    const cLidas1 = desktopPage.locator('[data-testid="container-lidas"]');
    const cNaoLidas1 = desktopPage.locator('[data-testid="container-nao-lidas"]');
    const cEnviadas1 = desktopPage.locator('[data-testid="container-enviadas"]');
    const cEliminadas1 = desktopPage.locator('[data-testid="container-eliminadas"]');

    assert(await cLidas1.isVisible(), 'Cenário 1: Container «Lidas» está visível');
    assert(await cNaoLidas1.isVisible(), 'Cenário 1: Container «Não Lidas» está visível');
    assert(await cEnviadas1.isVisible(), 'Cenário 1: Container «Enviadas» está visível quando sentCount > 0');
    assert(!(await cEliminadas1.isVisible().catch(() => false)), 'Cenário 1: Container «Eliminadas» NÃO está visível quando «Enviadas» contém itens');

    // Verificar ordenação da esquerda para a direita (X coordinate)
    const boxLidas1 = await cLidas1.boundingBox();
    const boxNaoLidas1 = await cNaoLidas1.boundingBox();
    const boxEnviadas1 = await cEnviadas1.boundingBox();

    assert(boxLidas1.x < boxNaoLidas1.x, 'Cenário 1: «Lidas» está à esquerda de «Não Lidas»');
    assert(boxNaoLidas1.x < boxEnviadas1.x, 'Cenário 1: «Não Lidas» está à esquerda de «Enviadas»');
    console.log(`  📐 Posições X Desktop: Lidas=${Math.round(boxLidas1.x)}px, Não Lidas=${Math.round(boxNaoLidas1.x)}px, Enviadas=${Math.round(boxEnviadas1.x)}px`);

    await desktopPage.screenshot({ path: path.join(screenshotDir, 'painel_desktop_cenario1_3col_enviadas.png'), fullPage: true });

    // -------------------------------------------------------------------------
    // Cenário 2: Enviadas === 0, Eliminadas > 0 (Lidas + Não Lidas + Eliminadas = 3 containers)
    // -------------------------------------------------------------------------
    console.log('\n📦 Cenário 2: Lidas > 0, Não Lidas > 0, Enviadas === 0, Eliminadas > 0');
    await desktopPage.evaluate(() => {
      const citizenKey = '009874562LA041';
      // Todas as enviadas (101..110, 10101..10110) marcadas como deletadas
      const sentIds = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 201, 202, 10101, 10102, 10103, 10104];
      localStorage.setItem('correio_digital_deleted_message_ids', JSON.stringify(sentIds));
      localStorage.setItem(`cda_deleted_messages_${citizenKey}`, JSON.stringify(sentIds));
      localStorage.setItem('correio_digital_hidden_messages', JSON.stringify([]));
      localStorage.setItem(`cda_hidden_messages_${citizenKey}`, JSON.stringify([]));
    });
    await desktopPage.reload({ waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1500);

    const cLidas2 = desktopPage.locator('[data-testid="container-lidas"]');
    const cNaoLidas2 = desktopPage.locator('[data-testid="container-nao-lidas"]');
    const cEnviadas2 = desktopPage.locator('[data-testid="container-enviadas"]');
    const cEliminadas2 = desktopPage.locator('[data-testid="container-eliminadas"]');

    assert(await cLidas2.isVisible(), 'Cenário 2: Container «Lidas» está visível');
    assert(await cNaoLidas2.isVisible(), 'Cenário 2: Container «Não Lidas» está visível');
    assert(!(await cEnviadas2.isVisible().catch(() => false)), 'Cenário 2: Container «Enviadas» oculto quando vazio (sentCount === 0)');
    assert(await cEliminadas2.isVisible(), 'Cenário 2: Container «Eliminadas» visível quando deletedCount > 0 E sentCount === 0');

    // Verificar ordenação da esquerda para a direita (X coordinate)
    const boxLidas2 = await cLidas2.boundingBox();
    const boxNaoLidas2 = await cNaoLidas2.boundingBox();
    const boxEliminadas2 = await cEliminadas2.boundingBox();

    assert(boxLidas2.x < boxNaoLidas2.x, 'Cenário 2: «Lidas» está à esquerda de «Não Lidas»');
    assert(boxNaoLidas2.x < boxEliminadas2.x, 'Cenário 2: «Não Lidas» está à esquerda de «Eliminadas»');
    console.log(`  📐 Posições X Desktop: Lidas=${Math.round(boxLidas2.x)}px, Não Lidas=${Math.round(boxNaoLidas2.x)}px, Eliminadas=${Math.round(boxEliminadas2.x)}px`);

    await desktopPage.screenshot({ path: path.join(screenshotDir, 'painel_desktop_cenario2_3col_eliminadas.png'), fullPage: true });

    // -------------------------------------------------------------------------
    // Cenário 3: Enviadas === 0, Eliminadas === 0 (Lidas + Não Lidas = Mínimo 2 containers lado a lado 50/50)
    // -------------------------------------------------------------------------
    console.log('\n📦 Cenário 3: Enviadas === 0, Eliminadas === 0 (Mínimo 2 containers)');
    await desktopPage.evaluate(() => {
      const citizenKey = '009874562LA041';
      const sentIds = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 201, 202, 10101, 10102, 10103, 10104];
      localStorage.setItem('correio_digital_deleted_message_ids', JSON.stringify([]));
      localStorage.setItem(`cda_deleted_messages_${citizenKey}`, JSON.stringify([]));
      localStorage.setItem('correio_digital_hidden_messages', JSON.stringify(sentIds));
      localStorage.setItem(`cda_hidden_messages_${citizenKey}`, JSON.stringify(sentIds));
    });
    await desktopPage.reload({ waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1500);

    const cLidas3 = desktopPage.locator('[data-testid="container-lidas"]');
    const cNaoLidas3 = desktopPage.locator('[data-testid="container-nao-lidas"]');
    const cEnviadas3 = desktopPage.locator('[data-testid="container-enviadas"]');
    const cEliminadas3 = desktopPage.locator('[data-testid="container-eliminadas"]');

    assert(await cLidas3.isVisible(), 'Cenário 3: Container «Lidas» está visível');
    assert(await cNaoLidas3.isVisible(), 'Cenário 3: Container «Não Lidas» está visível');
    assert(!(await cEnviadas3.isVisible().catch(() => false)), 'Cenário 3: Container «Enviadas» oculto');
    assert(!(await cEliminadas3.isVisible().catch(() => false)), 'Cenário 3: Container «Eliminadas» oculto');

    const boxLidas3 = await cLidas3.boundingBox();
    const boxNaoLidas3 = await cNaoLidas3.boundingBox();
    assert(boxLidas3.x < boxNaoLidas3.x, 'Cenário 3: «Lidas» está à esquerda de «Não Lidas»');
    assert(Math.abs(boxLidas3.width - boxNaoLidas3.width) < 5, 'Cenário 3: «Lidas» e «Não Lidas» dividem o espaço igualmente (50%/50%)');
    console.log(`  📐 Largura 2 colunas Desktop: Lidas=${Math.round(boxLidas3.width)}px, Não Lidas=${Math.round(boxNaoLidas3.width)}px`);

    await desktopPage.screenshot({ path: path.join(screenshotDir, 'painel_desktop_cenario3_2col.png'), fullPage: true });

    // -------------------------------------------------------------------------
    // Cenário 4: Todas vazias (Lidas = 0, Não Lidas = 0, Enviadas = 0, Eliminadas = 0)
    // -------------------------------------------------------------------------
    console.log('\n📦 Cenário 4: Todas vazias (Lidas e Não Lidas exibem estado vazio padrão)');
    await desktopPage.evaluate(({ citizenKey }) => {
      const ids = [];
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        try {
          const val = JSON.parse(localStorage.getItem(k));
          if (Array.isArray(val)) {
            val.forEach(item => {
              if (item && item.id != null) ids.push(item.id);
            });
          }
        } catch {}
      }
      for (let i = 1; i <= 3000; i++) ids.push(i, i + 10000);

      localStorage.setItem('correio_digital_deleted_message_ids', JSON.stringify([]));
      localStorage.setItem(`cda_deleted_messages_${citizenKey}`, JSON.stringify([]));
      localStorage.setItem('correio_digital_hidden_messages', JSON.stringify(ids));
      localStorage.setItem(`cda_hidden_messages_${citizenKey}`, JSON.stringify(ids));
    }, { citizenKey: '009874562LA041' });
    await desktopPage.reload({ waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1500);

    const cLidas4 = desktopPage.locator('[data-testid="container-lidas"]');
    const cNaoLidas4 = desktopPage.locator('[data-testid="container-nao-lidas"]');

    assert(await cLidas4.isVisible(), 'Cenário 4: Container «Lidas» SEMPRE visível mesmo com 0 correspondências');
    assert(await cNaoLidas4.isVisible(), 'Cenário 4: Container «Não Lidas» SEMPRE visível mesmo com 0 correspondências');
    assert(await cLidas4.locator('text=/Sem mensagens lidas|Sem correspondências/i').isVisible(), 'Cenário 4: Container «Lidas» exibe estado vazio padrão');
    assert(await cNaoLidas4.locator('text=/Sem mensagens novas/i').isVisible(), 'Cenário 4: Container «Não Lidas» exibe estado vazio padrão');

    await desktopPage.screenshot({ path: path.join(screenshotDir, 'painel_desktop_cenario4_vazio.png'), fullPage: true });
    await desktopPage.close();

    // =========================================================================
    // PARTE 2: MODO MOBILE / TABLET (< 768px) - LINHA INDIVIDUAL (1 COLUNA)
    // =========================================================================
    console.log('\n📱 --- TESTES MODO MOBILE (< 768px - Viewport 390x844) ---');
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });

    console.log('🌐 Login no Mobile...');
    await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await mobilePage.waitForTimeout(1000);

    const mobBiInput = mobilePage.locator('input[type="text"]:visible, input:not([type]):visible').first();
    await mobBiInput.waitFor({ state: 'visible', timeout: 15000 });
    await mobBiInput.fill('009874562LA041');

    const mobPassInput = mobilePage.locator('input[type="password"]:visible').first();
    await mobPassInput.fill('123456');

    const mobBtnEntrar = mobilePage.getByRole('button', { name: /ENTRAR NO PORTAL/i });
    await mobBtnEntrar.click();
    await mobilePage.waitForTimeout(2500);

    // Cenário Mobile com Enviadas > 0:
    console.log('\n📱 Cenário Mobile 1: Lidas, Não Lidas e Enviadas empilhados verticalmente');
    await mobilePage.evaluate(() => {
      const citizenKey = '009874562LA041';
      localStorage.setItem('correio_digital_deleted_message_ids', JSON.stringify([]));
      localStorage.setItem(`cda_deleted_messages_${citizenKey}`, JSON.stringify([]));
      localStorage.setItem('correio_digital_hidden_messages', JSON.stringify([]));
      localStorage.setItem(`cda_hidden_messages_${citizenKey}`, JSON.stringify([]));
    });
    await mobilePage.reload({ waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1500);

    const mobLidas = mobilePage.locator('[data-testid="container-lidas"]');
    const mobNaoLidas = mobilePage.locator('[data-testid="container-nao-lidas"]');
    const mobEnviadas = mobilePage.locator('[data-testid="container-enviadas"]');

    assert(await mobLidas.isVisible(), 'Mobile: Container «Lidas» está visível');
    assert(await mobNaoLidas.isVisible(), 'Mobile: Container «Não Lidas» está visível');
    assert(await mobEnviadas.isVisible(), 'Mobile: Container «Enviadas» está visível');

    // Verificar empilhamento vertical (cada um em sua própria linha: Y coordinate crescente, X coordinates similares)
    const mobBoxLidas = await mobLidas.boundingBox();
    const mobBoxNaoLidas = await mobNaoLidas.boundingBox();
    const mobBoxEnviadas = await mobEnviadas.boundingBox();

    assert(mobBoxLidas.y < mobBoxNaoLidas.y, 'Mobile: «Lidas» fica na 1ª linha (acima de «Não Lidas»)');
    assert(mobBoxNaoLidas.y < mobBoxEnviadas.y, 'Mobile: «Não Lidas» fica na 2ª linha (acima de «Enviadas»)');
    assert(Math.abs(mobBoxLidas.x - mobBoxNaoLidas.x) < 5, 'Mobile: Containers alinhados verticalmente na mesma coluna');
    console.log(`  📐 Posições Y Mobile: Lidas=${Math.round(mobBoxLidas.y)}px, Não Lidas=${Math.round(mobBoxNaoLidas.y)}px, Enviadas=${Math.round(mobBoxEnviadas.y)}px`);

    await mobilePage.screenshot({ path: path.join(screenshotDir, 'painel_mobile_empilhado.png'), fullPage: true });
    await mobilePage.close();

    console.log(`\n======================================================`);
    console.log(`🎉 RESULTADO FINAL: ${passedTests} de ${totalTests} asserções PASSARAM COM 100% DE SUCESSO!`);
    console.log(`======================================================`);

  } catch (err) {
    console.error('❌ Falha na execução do teste E2E:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
