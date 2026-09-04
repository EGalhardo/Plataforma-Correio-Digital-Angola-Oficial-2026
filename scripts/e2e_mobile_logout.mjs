import { chromium } from 'playwright';

async function runMobileLogoutTest() {
  console.log('🚀 Iniciando teste E2E do menu de Perfil e funcionalidade "Sair do Canal" em modo Mobile...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  // Viewport mobile (iPhone 14)
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true
  });

  const page = await context.newPage();

  // Capturar logs e erros de console
  page.on('console', msg => console.log(`[Browser ${msg.type()}]:`, msg.text()));
  page.on('pageerror', err => console.error('[Browser PageError]:', err.message));

  try {
    // 1. Aceder à aplicação
    console.log('🌐 Acedendo a http://localhost:3000 em modo mobile...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // 2. Preencher credenciais de demonstração e entrar
    const biInput = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
    await biInput.waitFor({ state: 'visible', timeout: 10000 });
    await biInput.fill('009874562LA041');

    const passInput = page.locator('input[type="password"]:visible').first();
    await passInput.fill('123456');

    const submitBtn = page.getByRole('button', { name: /Entrar no Portal/i });
    await submitBtn.click();
    console.log('🔑 Clicou em "Entrar no Portal".');
    await page.waitForTimeout(3000);

    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('📄 Body text após login:', bodyText.slice(0, 300));

    // 3. Aguardar renderização da barra de navegação / cabeçalho logado
    const mobileHeader = page.locator('header.md\\:hidden');
    await mobileHeader.waitFor({ state: 'visible', timeout: 15000 });
    console.log('✅ App logado com sucesso (Cabeçalho Mobile visível).');
    await page.waitForTimeout(1000);

    // 4. Localizar a foto de perfil / avatar no cabeçalho mobile
    const avatar = page.locator('header.md\\:hidden [aria-label="Menu de Perfil e Notificações"]');
    await avatar.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ Foto de perfil / avatar localizado no cabeçalho mobile.');

    // 5. Clicar na foto de perfil
    console.log('👆 Clicando na foto de perfil no modo mobile...');
    await avatar.click();
    await page.waitForTimeout(600);

    const menuHtml = await page.evaluate(() => {
      const fixed = Array.from(document.querySelectorAll('.fixed')).map(el => el.innerText);
      return fixed.join('\n---\n');
    });
    console.log('📋 Elementos fixed visíveis no DOM:', menuHtml);

    // 6. Verificar que a funcionalidade "Sair do Canal" está presente NO FINAL do menu (instância visível no viewport mobile)
    const logoutBtn = page.locator('button:has-text("Sair do Canal"):visible');
    await logoutBtn.waitFor({ state: 'visible', timeout: 5000 });
    const logoutVisible = await logoutBtn.isVisible();
    console.log(`✅ Botão "Sair do Canal" visível no final do menu: ${logoutVisible}`);

    if (!logoutVisible) {
      throw new Error('Botão "Sair do Canal" não encontrado no menu mobile!');
    }

    // Tirar screenshot do menu aberto com o botão Sair do Canal
    await page.screenshot({ path: 'testes/evidencias/screenshots/mobile_sair_do_canal.png' });
    console.log('📸 Screenshot guardado em testes/evidencias/screenshots/mobile_sair_do_canal.png');

    // 7. Clicar no botão "Sair do Canal"
    console.log('🚪 Clicando em "Sair do Canal"...');
    await logoutBtn.click();
    await page.waitForTimeout(2000);

    // 8. Verificar redirecionamento para o ecrã de Login
    const loginHeading = page.getByRole('heading', { name: /LOGIN/i });
    await loginHeading.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Redirecionado com sucesso para o ecrã de Login após terminar a sessão.');

    console.log('\n🎉 TESTE DE "SAIR DO CANAL" EM MODO MOBILE PASSOU COM 100% DE SUCESSO!');
  } catch (err) {
    console.error('❌ Erro durante o teste mobile:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runMobileLogoutTest();
