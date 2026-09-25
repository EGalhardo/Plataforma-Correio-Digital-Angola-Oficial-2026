import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('================================================================');
  console.log('🧪 TESTE E2E: LOGIN FACIAL A PARTIR DA PÁGINA ADMIN');
  console.log('Cenário: Face registada no INAPEM -> Login na tela de Admin -> Login Facial');
  console.log('Expectativa: Entrar 100% na Área Institucional (Home / Painel INAPEM)');
  console.log('================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'pt-AO',
    permissions: ['camera']
  });

  await ctx.addInitScript(() => {
    localStorage.setItem('skip_splash_and_show_login', 'true');
    localStorage.setItem('cda_sessao_activa', '0');
  });

  const page = await ctx.newPage();

  try {
    // 1. Entrar no INAPEM
    console.log('1. A entrar na conta INAPEM-LMM-01...');
    await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 15000 });
    await page.locator('input[name="cda-utilizador"]').fill('INAPEM-LMM-01');
    await page.locator('input[name="cda-senha"]').fill('123456789');
    await page.locator('button:has-text("Entrar no Portal"), button:has-text("Entrar")').first().click();
    await page.waitForTimeout(3500);

    // 2. Ir ao Perfil e registar face
    console.log('2. A registar face no Perfil do INAPEM...');
    const perfilBtn = page.locator('button:has-text("Perfil"), nav button:has-text("Perfil")').first();
    if (await perfilBtn.count()) {
      await perfilBtn.click({ force: true });
    } else {
      await page.goto(`${BASE_URL}/institucional#/perfil`, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(2000);

    const enrollBtn = page.locator('button:has-text("Registar a minha face"), button:has-text("Registar Face"), button:has-text("Alterar Face")').first();
    if (await enrollBtn.isVisible()) {
      await enrollBtn.click({ force: true });
      await page.waitForTimeout(1000);
      for (let s = 1; s <= 3; s++) {
        const capBtn = page.locator('button:has-text("Capturar Rosto"), button:has-text("Capturar"), button:has-text("Confirmar Captura")').first();
        if (await capBtn.isVisible()) {
          await capBtn.click({ force: true });
          await page.waitForTimeout(1200);
        }
      }
      await page.waitForTimeout(2000);
    }
    console.log('✓ Face do INAPEM registada.');

    // 3. Sair da conta
    console.log('3. A terminar sessão...');
    const logoutBtn = page.locator('button:has-text("SAIR DO CANAL"), button:has-text("Terminar Sessão"), button:has-text("Sair")').first();
    if (await logoutBtn.count()) await logoutBtn.click({ force: true });
    await page.waitForTimeout(2000);

    // 4. Ir para a página de Login Admin
    console.log('4. A aceder à tela de Login da ADMINISTRAÇÃO...');
    await page.goto(`${BASE_URL}/admin#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 15000 });
    await page.waitForTimeout(600);

    // Confirmar que estamos na aba Admin
    const adminTab = page.locator('button:has-text("Admin")').first();
    if (await adminTab.isVisible()) await adminTab.click({ force: true });
    await page.waitForTimeout(500);

    // 5. Clicar em Login Facial na tela Admin
    console.log('5. A clicar em Login Facial a partir da tela de Admin...');
    const faceBtn = page.locator('button:has-text("LOGIN FACIAL"), button:has-text("Login Facial"), button:has-text("Reconhecimento Facial")').first();
    await faceBtn.click({ force: true });
    await page.waitForTimeout(1000);

    const startScan = page.locator('button:has-text("Iniciar Reconhecimento"), button:has-text("Validar Face"), button:has-text("Entrar com Face")').first();
    if (await startScan.isVisible()) {
      await startScan.click({ force: true });
    } else {
      const scannerCircle = page.locator('video, svg.animate-pulse, [data-testid="face-scanner"]').first();
      if (await scannerCircle.isVisible()) await scannerCircle.click({ force: true });
    }
    await page.waitForTimeout(5000);

    // 6. Verificar o resultado pós-login facial
    const currentUrl = page.url();
    const bodyText = await page.evaluate(() => document.body.innerText);

    console.log(`URL final: ${currentUrl}`);
    const isInstArea = bodyText.includes('ÁREA INSTITUCIONAL') || bodyText.includes('INAPEM-LMM') || bodyText.includes('INSTITUIÇÃO / PRIVADO');
    const hasAdminLeak = bodyText.includes('ÁREA DE ADMINISTRAÇÃO') || bodyText.includes('Painel Nacional') || bodyText.includes('Central Admin');

    console.log(`Conteúdo Institucional presente: ${isInstArea}`);
    console.log(`Conteúdo Admin presente (não deve existir): ${hasAdminLeak}`);

    if (isInstArea && !hasAdminLeak && currentUrl.includes('/institucional')) {
      console.log('\n🏆 SUCESSO TOTAL: O Login Facial na tela de Admin redirecionou corretamente para a Área Institucional com os conteúdos 100% corretos do INAPEM!');
    } else {
      console.error('\n❌ ERRO DETETADO: URL ou conteúdos divergentes.');
      process.exit(1);
    }

  } catch (err) {
    console.error('Erro no teste:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
