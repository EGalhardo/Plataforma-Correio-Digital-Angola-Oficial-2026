import { chromium } from 'playwright';

(async () => {
  console.log('=== TESTE E2E: Otimização de Padding e Espaçamento Mobile ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
  });
  await context.addInitScript(() => {
    localStorage.setItem('skip_splash_and_show_login', 'true');
  });
  const page = await context.newPage();

  // 1. ADMIN MODE
  console.log('1. A testar Modo Admin em mobile...');
  await page.goto('http://localhost:3000/admin#/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 5000 });
  await page.locator('input[name="cda-utilizador"]').fill('ADMIN-0001');
  await page.locator('input[name="cda-senha"]').fill('GALHARDO');
  await page.getByRole('button', { name: /ENTRAR/i }).first().click();
  await page.waitForTimeout(1000);

  const adminMetrics = await page.evaluate(() => {
    const scroll = document.querySelector('div[data-cda-scroll]');
    const scrollStyle = scroll ? window.getComputedStyle(scroll) : null;
    const firstContent = scroll?.querySelector('h1, h2, h3, section, div');
    return {
      paddingTop: scrollStyle?.paddingTop,
      paddingBottom: scrollStyle?.paddingBottom,
      firstContentTop: firstContent?.getBoundingClientRect().top
    };
  });

  console.log('   Admin Metrics:', adminMetrics);
  if (parseInt(adminMetrics.paddingTop) > 70) {
    throw new Error(`Admin paddingTop excessivo: ${adminMetrics.paddingTop}`);
  }

  // 2. INSTITUTION MODE
  console.log('2. A testar Modo Institucional em mobile...');
  await page.goto('http://localhost:3000/institucional#/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 5000 });
  await page.locator('input[name="cda-utilizador"]').fill('AGT-9921-SR');
  await page.locator('input[name="cda-senha"]').fill('000000');
  await page.getByRole('button', { name: /ENTRAR/i }).first().click();
  await page.waitForTimeout(1000);

  const instMetrics = await page.evaluate(() => {
    const scroll = document.querySelector('div[data-cda-scroll]');
    const scrollStyle = scroll ? window.getComputedStyle(scroll) : null;
    return {
      paddingTop: scrollStyle?.paddingTop,
      paddingBottom: scrollStyle?.paddingBottom
    };
  });
  console.log('   Institution Metrics:', instMetrics);
  if (parseInt(instMetrics.paddingTop) > 70) {
    throw new Error(`Institution paddingTop excessivo: ${instMetrics.paddingTop}`);
  }

  // 3. CITIZEN MODE
  console.log('3. A testar Modo Cidadão em mobile...');
  await page.goto('http://localhost:3000/#/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 5000 });
  await page.locator('input[name="cda-utilizador"]').fill('009874562LA041');
  await page.locator('input[name="cda-senha"]').fill('123456');
  await page.getByRole('button', { name: /ENTRAR/i }).first().click();
  await page.waitForTimeout(1000);

  const userMetrics = await page.evaluate(() => {
    const scroll = document.querySelector('div[data-cda-scroll]');
    const scrollStyle = scroll ? window.getComputedStyle(scroll) : null;
    return {
      paddingTop: scrollStyle?.paddingTop,
      paddingBottom: scrollStyle?.paddingBottom
    };
  });
  console.log('   Citizen Metrics:', userMetrics);
  if (parseInt(userMetrics.paddingTop) > 70) {
    throw new Error(`Citizen paddingTop excessivo: ${userMetrics.paddingTop}`);
  }

  await browser.close();
  console.log('=== TODOS OS TESTES DE LAYOUT MOBILE PASSARAM COM SUCESSO! ===');
})();
