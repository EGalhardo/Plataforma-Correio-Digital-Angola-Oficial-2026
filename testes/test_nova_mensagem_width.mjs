import { chromium } from 'playwright';

(async () => {
  console.log('=== TESTE E2E: Alinhamento e Largura da Página Nova Mensagem (Cidadão) ===');
  const browser = await chromium.launch({ headless: true });

  // 1. DESKTOP TEST
  const contextDesktop = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  await contextDesktop.addInitScript(() => {
    localStorage.setItem('skip_splash_and_show_login', 'true');
  });
  const pageDesktop = await contextDesktop.newPage();

  console.log('1. A testar modo Desktop (1280x800)...');
  await pageDesktop.goto('http://localhost:3000/#/login', { waitUntil: 'domcontentloaded' });
  await pageDesktop.waitForSelector('input[name="cda-utilizador"]', { timeout: 5000 });
  await pageDesktop.locator('input[name="cda-utilizador"]').fill('009874562LA041');
  await pageDesktop.locator('input[name="cda-senha"]').fill('123456');
  await pageDesktop.getByRole('button', { name: /ENTRAR/i }).first().click();
  await pageDesktop.waitForTimeout(1000);

  // Navigate to Correio and open Nova Mensagem
  await pageDesktop.evaluate(() => { window.location.hash = '#/correspondencias'; });
  await pageDesktop.waitForTimeout(800);
  await pageDesktop.getByRole('button', { name: /Nova Mensagem/i }).first().click();
  await pageDesktop.waitForTimeout(800);

  const desktopWidths = await pageDesktop.evaluate(() => {
    const scroll = document.querySelector('div[data-cda-scroll]');
    const maxWWrapper = scroll?.firstElementChild;
    const formMotionDiv = maxWWrapper?.firstElementChild;
    const sectionDest = formMotionDiv?.querySelector('div.bg-white');

    return {
      maxWWrapperW: maxWWrapper?.getBoundingClientRect().width,
      formMotionDivW: formMotionDiv?.getBoundingClientRect().width,
      sectionDestW: sectionDest?.getBoundingClientRect().width
    };
  });

  console.log('   Desktop Widths:', desktopWidths);
  if (Math.abs(desktopWidths.maxWWrapperW - desktopWidths.formMotionDivW) > 2) {
    throw new Error(`O formulário Nova Mensagem não preenche a largura total do contentor: maxWWrapper=${desktopWidths.maxWWrapperW}, form=${desktopWidths.formMotionDivW}`);
  }

  // 2. MOBILE TEST
  const contextMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
  });
  await contextMobile.addInitScript(() => {
    localStorage.setItem('skip_splash_and_show_login', 'true');
  });
  const pageMobile = await contextMobile.newPage();

  console.log('2. A testar modo Mobile (390x844)...');
  await pageMobile.goto('http://localhost:3000/#/login', { waitUntil: 'domcontentloaded' });
  await pageMobile.waitForSelector('input[name="cda-utilizador"]', { timeout: 5000 });
  await pageMobile.locator('input[name="cda-utilizador"]').fill('009874562LA041');
  await pageMobile.locator('input[name="cda-senha"]').fill('123456');
  await pageMobile.getByRole('button', { name: /ENTRAR/i }).first().click();
  await pageMobile.waitForTimeout(1000);

  // Navigate to Correio and open Nova Mensagem
  await pageMobile.evaluate(() => { window.location.hash = '#/correspondencias'; });
  await pageMobile.waitForTimeout(800);
  await pageMobile.getByRole('button', { name: /Nova Mensagem/i }).first().click();
  await pageMobile.waitForTimeout(800);

  const mobileWidths = await pageMobile.evaluate(() => {
    const scroll = document.querySelector('div[data-cda-scroll]');
    const maxWWrapper = scroll?.firstElementChild;
    const formMotionDiv = maxWWrapper?.firstElementChild;
    const sectionDest = formMotionDiv?.querySelector('div.bg-white');

    return {
      maxWWrapperW: maxWWrapper?.getBoundingClientRect().width,
      formMotionDivW: formMotionDiv?.getBoundingClientRect().width,
      sectionDestW: sectionDest?.getBoundingClientRect().width
    };
  });

  console.log('   Mobile Widths:', mobileWidths);
  if (Math.abs(mobileWidths.maxWWrapperW - mobileWidths.formMotionDivW) > 2) {
    throw new Error(`O formulário Nova Mensagem não preenche a largura total no mobile: maxWWrapper=${mobileWidths.maxWWrapperW}, form=${mobileWidths.formMotionDivW}`);
  }

  await browser.close();
  console.log('=== TESTE DE ALINHAMENTO CONCLUÍDO COM 100% DE SUCESSO! ===');
})();
