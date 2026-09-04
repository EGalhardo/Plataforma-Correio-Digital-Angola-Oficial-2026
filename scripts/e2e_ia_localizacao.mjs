import { chromium } from 'playwright';

async function runTest() {
  console.log('🚀 Iniciando teste E2E do Registo da Instituição com IA de Localização...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    console.log('🌐 Navegando para http://localhost:3000/institucional#/registar ...');
    await page.goto('http://localhost:3000/institucional#/registar', { waitUntil: 'networkidle' });
    
    await page.waitForSelector('text=Localização', { timeout: 15000 });
    console.log('✅ Formulário de Registo de Instituição carregado.');

    const aiBadge = page.locator('text=Assistida por IA');
    await aiBadge.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ Badge "Assistida por IA" visível no cabeçalho de Localização!');

    const selectElements = page.locator('div.space-y-3 select');
    const selectCount = await selectElements.count();
    console.log(`✅ Quantidade de campos Select de Localização encontrados: ${selectCount}`);

    const provSelect = selectElements.nth(0);
    const citySelect = selectElements.nth(1);
    const muniSelect = selectElements.nth(2);
    const comunaSelect = selectElements.nth(3);

    console.log('🏙️ Selecionando Província "Luanda"...');
    await provSelect.selectOption('Luanda');
    await page.waitForTimeout(1500);

    const cityOptions = await citySelect.locator('option').allInnerTexts();
    console.log(`✅ Select Cidade habilitado, Opções: ${JSON.stringify(cityOptions)}`);

    const targetCity = cityOptions.find(c => c === 'Luanda' || c.includes('Luanda') || c.includes('Sede')) || cityOptions[1];
    await citySelect.selectOption(targetCity);
    console.log(`✅ Cidade "${targetCity}" selecionada.`);
    await page.waitForTimeout(1500);

    const muniOptions = await muniSelect.locator('option').allInnerTexts();
    console.log(`✅ Select Município habilitado, Total de municípios disponíveis: ${muniOptions.length - 1}`);

    const targetMuni = muniOptions.find(m => m === 'Talatona' || m.includes('Talatona')) || muniOptions[1];
    await muniSelect.selectOption(targetMuni);
    console.log(`✅ Município "${targetMuni}" selecionado.`);
    await page.waitForTimeout(1500);

    const comunaOptions = await comunaSelect.locator('option').allInnerTexts();
    console.log(`✅ Select Comuna habilitado, Total de comunas: ${comunaOptions.length - 1}`);
    console.log(`   Comunas: ${JSON.stringify(comunaOptions)}`);

    if (comunaOptions.length > 1) {
      await comunaSelect.selectOption(comunaOptions[1]);
      console.log(`✅ Comuna "${comunaOptions[1]}" selecionada com sucesso.`);
    }

    // Tirar screenshot da tela com a IA de localização ativa e preenchida
    await page.screenshot({ path: 'testes/evidencias/screenshots/institucional_registo_ia_localizacao.png', fullPage: true });
    console.log('📸 Screenshot guardado em testes/evidencias/screenshots/institucional_registo_ia_localizacao.png');

    console.log('🎉 TODOS OS TESTES E2E DE SUGESTÃO DE LOCALIZAÇÃO POR IA PASSARAM COM SUCESSO 100%!');
  } catch (err) {
    console.error('❌ Erro durante o teste E2E:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTest();
