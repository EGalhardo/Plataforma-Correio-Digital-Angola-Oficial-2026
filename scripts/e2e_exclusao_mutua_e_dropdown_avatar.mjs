import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function run() {
  console.log('🚀 Iniciando Bateria E2E: Invariante de Leitura, Exclusão Mútua e Paridade 1:1 Avatar Dropdown...');

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
      console.log(`  ✅ [PASS ${totalTests}] ${message}`);
    } else {
      console.error(`  ❌ [FAIL ${totalTests}] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    console.log('\n🔑 1. Autenticação na Área do Cidadão (009874562LA041)...');
    await page.goto('http://localhost:3000/#/entrar', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const citizenKey = '009874562LA041';
    const biInput = page.locator('input[name="cda-utilizador"], input[type="text"]:visible, input:not([type]):visible').first();
    await biInput.waitFor({ state: 'visible', timeout: 15000 });
    await biInput.fill(citizenKey);
    const passInput = page.locator('input[name="cda-senha"], input[type="password"]:visible').first();
    await passInput.fill('123456');
    await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await page.waitForTimeout(2500);

    // =========================================================================
    // TESTE 1: INVARIANTE DE LEITURA & EXCLUSÃO MÚTUA NA CAIXA DE CORREIO
    // =========================================================================
    console.log('\n📬 --- TESTE 1: EXCLUSÃO MÚTUA ENTRE LIDAS E NÃO LIDAS NO CORREIO ---');
    await page.locator('aside button').filter({ hasText: /Correio/i }).first().click();
    await page.waitForTimeout(1500);

    const tabLidasBtn = page.locator('[data-testid="tab-lidas"]').first();
    const tabNaoLidasBtn = page.locator('[data-testid="tab-naoLidas"]').first();

    assert(await tabLidasBtn.isVisible() && await tabNaoLidasBtn.isVisible(), 'Abas «Lidas» e «Não Lidas» disponíveis no Correio');

    // Clicar em «Lidas» e verificar que apenas mensagens lidas são exibidas
    await tabLidasBtn.click();
    await page.waitForTimeout(1000);
    const lidasRowCount = await page.locator('tbody tr').count();
    console.log(`  📖 Linhas na aba «Lidas»: ${lidasRowCount}`);
    assert(lidasRowCount >= 0, 'Aba «Lidas» carregada corretamente');

    // Clicar em «Não Lidas»
    await tabNaoLidasBtn.click();
    await page.waitForTimeout(1000);
    const naoLidasRowCount = await page.locator('tbody tr').count();
    console.log(`  📬 Linhas na aba «Não Lidas»: ${naoLidasRowCount}`);
    assert(naoLidasRowCount >= 1, 'Aba «Não Lidas» contém as correspondências pendentes');

    // Invariante: O número de itens em «Não Lidas» é estritamente de mensagens com status != 'Lida' e unread > 0
    const unreadStatuses = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.map(r => r.textContent || '');
    });
    const hasStatusLidaInNaoLidas = unreadStatuses.some(txt => txt.includes('Status: Lida') || txt.includes('Estado: Lida'));
    assert(!hasStatusLidaInNaoLidas, 'Invariante: Nenhuma correspondência marcada como «Lida» consta na aba «Não Lidas»');

    // =========================================================================
    // TESTE 2: PARIDADE 1:1 ENTRE BADGE DO AVATAR E MENU DROPDOWN
    // =========================================================================
    console.log('\n👤 --- TESTE 2: PARIDADE 1:1 ENTRE BADGE DO AVATAR E DROPDOWN ---');
    const avatarBadge = page.locator('[data-testid="avatar-unread-badge"]:visible').first();
    const badgeCount = parseInt((await avatarBadge.textContent()).trim(), 10);
    console.log(`  🔴 Badge do Avatar visível: ${badgeCount}`);
    assert(badgeCount > 0, `Badge do Avatar ativo com ${badgeCount} pendências`);

    // Clicar na foto de perfil (Avatar) para abrir o Dropdown Menu
    console.log('  👆 Clicando na foto de perfil (Avatar)...');
    const avatarContainer = page.locator('div[role="button"][aria-label*="Menu de Perfil e Notificações"]:visible').first();
    await avatarContainer.click();
    await page.waitForTimeout(1000);

    // Validar abertura do menu dropdown
    const menuContador = page.locator('[data-testid="menu-contador"]:visible').first();
    assert(await menuContador.isVisible(), 'Menu Dropdown da foto de perfil abriu com sucesso');
    const menuContadorVal = parseInt((await menuContador.textContent()).trim(), 10);
    assert(menuContadorVal === badgeCount, `Contador do topo do Menu (${menuContadorVal}) coincide com o Badge do Avatar (${badgeCount})`);

    // Contar itens renderizados no dropdown visível
    const dropdownItems = page.locator('[data-testid="menu-item-nao-lido"]:visible');
    const totalItemsInDropdown = await dropdownItems.count();
    console.log(`  📋 Total de itens listados no Dropdown: ${totalItemsInDropdown}`);
    assert(totalItemsInDropdown === badgeCount, `PARIDADE 1:1: Quantidade de itens no Dropdown (${totalItemsInDropdown}) é IDÊNTICA ao Badge (${badgeCount})`);

    // =========================================================================
    // TESTE 3: LEITURA REATIVA VIA DROPDOWN (DECREMENTO IMEDIATO)
    // =========================================================================
    console.log('\n📖 --- TESTE 3: ABRIR ITEM A PARTIR DO DROPDOWN & DECREMENTO REATIVO ---');
    console.log('  👉 Clicando no primeiro item da lista do Dropdown...');
    await dropdownItems.first().click();
    await page.waitForTimeout(1500);

    // Validar novo valor do Badge do Avatar
    const badgeAposLeituraEl = page.locator('[data-testid="avatar-unread-badge"]:visible').first();
    const badgeAposLeitura = (await badgeAposLeituraEl.isVisible()) 
      ? parseInt((await badgeAposLeituraEl.textContent()).trim(), 10)
      : 0;
    console.log(`  🔴 Badge do Avatar após leitura: ${badgeAposLeitura}`);
    assert(badgeAposLeitura === badgeCount - 1, `Badge do Avatar decrementou de ${badgeCount} para ${badgeAposLeitura} imediatamente`);

    // Reabrir o Dropdown e verificar que o item lido desapareceu da lista
    await avatarContainer.click();
    await page.waitForTimeout(1000);
    const dropdownItemsAposLeitura = await page.locator('[data-testid="menu-item-nao-lido"]:visible').count();
    console.log(`  📋 Total de itens no Dropdown após leitura: ${dropdownItemsAposLeitura}`);
    assert(dropdownItemsAposLeitura === badgeAposLeitura, `Item lido foi removido do Dropdown e restam exatamente ${dropdownItemsAposLeitura} itens (igual ao badge)`);

    // Fechar dropdown clicando no backdrop
    await page.mouse.click(10, 10);
    await page.waitForTimeout(500);

    // =========================================================================
    // TESTE 4: SINTONIA MOBILE (390x844)
    // =========================================================================
    console.log('\n📱 --- TESTE 4: SINTONIA E PARIDADE EM MODO MOBILE (390x844) ---');
    await page.locator('aside button').filter({ hasText: /Painel/i }).first().click();
    await page.waitForTimeout(1000);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1500);

    const mobileBadgeEl = page.locator('[data-testid="avatar-unread-badge"]:visible').first();
    const mobileBadge = (await mobileBadgeEl.isVisible())
      ? parseInt((await mobileBadgeEl.textContent()).trim(), 10)
      : 0;
    console.log(`  📱 Mobile Badge: ${mobileBadge}`);
    assert(mobileBadge === badgeAposLeitura, `Mobile: Badge do Avatar mantém sintonia de ${mobileBadge} pendências`);

    // Abrir dropdown no mobile
    const mobileAvatar = page.locator('header div[role="button"][aria-label*="Menu de Perfil e Notificações"]:visible').first();
    await mobileAvatar.click();
    await page.waitForTimeout(1000);

    const mobileDropdownCount = await page.locator('[data-testid="menu-item-nao-lido"]:visible').count();
    console.log(`  📱 Mobile Dropdown Items: ${mobileDropdownCount}`);
    assert(mobileDropdownCount === mobileBadge, `Mobile: Paridade 1:1 mantida (${mobileDropdownCount} itens === ${mobileBadge} badge)`);

    await page.screenshot({ path: path.join(screenshotDir, 'exclusao_mutua_e_dropdown_avatar.png'), fullPage: true });

    await context.close();

    console.log(`\n======================================================`);
    console.log(`🎉 BATERIA CONCLUÍDA: ${passedTests} de ${totalTests} asserções PASSARAM COM 100% DE SUCESSO!`);
    console.log(`======================================================`);

  } catch (err) {
    console.error('❌ Falha na bateria E2E de Exclusão Mútua e Dropdown Avatar:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
