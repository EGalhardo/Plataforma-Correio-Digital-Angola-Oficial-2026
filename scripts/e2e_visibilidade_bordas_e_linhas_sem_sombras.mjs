import { chromium } from 'playwright';

async function testBordasLinhasSemSombras() {
  console.log('🚀 Iniciando Bateria E2E: Visibilidade de Bordas/Linhas (Mesma Espessura do Modo Escuro) e Zero Sombras...');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  
  const page = await context.newPage();
  let passes = 0;
  
  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FALHA: ${message}`);
      throw new Error(message);
    }
    passes++;
    console.log(`  ✅ [PASS ${passes}] ${message}`);
  }

  try {
    console.log('\n🔑 1. Autenticação na Área do Cidadão (009874562LA041)...');
    await page.goto('http://localhost:3000/#/entrar', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const citizenKey = '009874562LA041';
    const biInput = page.locator('input[name="cda-utilizador"], input[type="text"]:visible, input:not([type]):visible').first();
    await biInput.waitFor({ state: 'visible', timeout: 15000 });
    await biInput.fill(citizenKey);
    const passInput = page.locator('input[name="cda-senha"], input[type="password"]:visible').first();
    await passInput.fill('123456');

    const submitBtn = page.locator('button[type="submit"]:visible, button:has-text("Entrar"):visible, button:has-text("Aceder"):visible').first();
    await submitBtn.click();
    await page.waitForTimeout(2000);

    console.log('\n📐 --- TESTE 1: BARRA LATERAL (SIDEBAR) SEM SOMBRAS E COM BORDAS border-2 ---');
    const sidebar = page.locator('aside').first();
    await sidebar.waitFor({ state: 'visible', timeout: 10000 });
    
    const sidebarClass = await sidebar.getAttribute('class');
    assert(sidebarClass.includes('shadow-none'), 'Barra lateral sem sombras difusas (shadow-none)');
    assert(sidebarClass.includes('border-2') && sidebarClass.includes('border-slate-300'), 'Barra lateral com bordas nítidas border-2 border-slate-300');

    console.log('\n📐 --- TESTE 2: ÁREA CENTRAL DE CONTEÚDO SEM SOMBRAS E COM BORDAS border-2 ---');
    const mainWrapper = page.locator('.flex-1.md\\:bg-white').first();
    const mainClass = await mainWrapper.getAttribute('class');
    assert(mainClass.includes('shadow-none'), 'Área central de conteúdo sem sombras difusas (shadow-none)');
    assert(mainClass.includes('md:border-2') && mainClass.includes('border-slate-300'), 'Área central com bordas nítidas md:border-2 md:border-slate-300');

    console.log('\n📐 --- TESTE 3: LINHAS DIVISÓRIAS DO CABEÇALHO (HEADER) border-b-2 ---');
    const header = page.locator('div.hidden.md\\:flex').first();
    const headerClass = await header.getAttribute('class');
    assert(headerClass.includes('shadow-none'), 'Header Desktop sem sombras');
    assert(headerClass.includes('border-b-2') && headerClass.includes('border-slate-300'), 'Linha divisória do Header com border-b-2 border-slate-300');

    console.log('\n📐 --- TESTE 4: CARDS DO PAINEL PRINCIPAL (HOME) COM BORDAS VISÍVEIS E SEM SOMBRAS ---');
    const cardUnread = page.locator('[data-testid="card-unread-messages"]').first();
    await cardUnread.waitFor({ state: 'visible', timeout: 10000 });
    
    const containerLidas = page.locator('[data-testid="container-lidas"]').first();
    const lidasClass = await containerLidas.getAttribute('class');
    assert(lidasClass.includes('border-2') && lidasClass.includes('border-slate-300'), 'Container «Lidas» com borda nítida border-2 border-slate-300');
    assert(lidasClass.includes('shadow-none'), 'Container «Lidas» sem sombras (shadow-none)');

    const containerNaoLidas = page.locator('[data-testid="container-nao-lidas"]').first();
    const naoLidasClass = await containerNaoLidas.getAttribute('class');
    assert(naoLidasClass.includes('border-2') && naoLidasClass.includes('border-slate-300'), 'Container «Não Lidas» com borda nítida border-2 border-slate-300');
    assert(naoLidasClass.includes('shadow-none'), 'Container «Não Lidas» sem sombras (shadow-none)');

    console.log('\n📬 --- TESTE 5: CORREIO DIGITAL OFICIAL (MAIL CONTENT) BORDAS E LINHAS ---');
    await page.locator('div[role="button"]:has-text("Novas Mensagens")').first().click();
    await page.waitForTimeout(1000);

    const tabsContainer = page.locator('[data-testid="tab-lidas"]').first();
    await tabsContainer.waitFor({ state: 'visible', timeout: 10000 });
    const tabParent = page.locator('div:has(> [data-testid="tab-lidas"])').first();
    const tabParentClass = await tabParent.getAttribute('class');
    assert(tabParentClass.includes('border-2') && tabParentClass.includes('border-slate-300'), 'Tabs de Correspondência com bordas border-2 border-slate-300');

    console.log('\n📱 --- TESTE 6: RESPONSIVIDADE MOBILE (390x844) & APPBAR/NAVBAR ---');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);

    const mobileHeader = page.locator('header.md\\:hidden').first();
    const mobileHeaderClass = await mobileHeader.getAttribute('class');
    assert(mobileHeaderClass.includes('border-b-2') && mobileHeaderClass.includes('border-slate-300'), 'Mobile AppBar com linha divisória nítida border-b-2');
    assert(mobileHeaderClass.includes('shadow-none'), 'Mobile AppBar sem sombras (shadow-none)');

    const mobileNav = page.locator('nav.cda-mobile-nav').first();
    const mobileNavClass = await mobileNav.getAttribute('class');
    assert(mobileNavClass.includes('border-t-2') && mobileNavClass.includes('border-slate-300'), 'Mobile NavBar com linha divisória nítida border-t-2');
    assert(mobileNavClass.includes('shadow-none'), 'Mobile NavBar sem sombras (shadow-none)');

    console.log('\n======================================================');
    console.log(`🎉 BATERIA DE HOMOLOGAÇÃO CONCLUÍDA: ${passes} de ${passes} asserções PASSARAM COM 100% DE SUCESSO!`);
    console.log('======================================================');

  } catch (err) {
    console.error('Erro na execução do teste:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testBordasLinhasSemSombras();
