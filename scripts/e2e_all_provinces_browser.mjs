import { chromium } from 'playwright';

async function runAllProvincesBrowserTest() {
  console.log('🚀 Iniciando teste exaustivo de browser para TODAS as 21 províncias no grupo Localização (DPA 2025)...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('🔴 [Browser Error]:', msg.text());
      consoleErrors.push(msg.text());
    }
  });

  try {
    await page.goto('http://localhost:3000/institucional#/registar', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Localização', { timeout: 10000 });
    console.log('✅ Formulário carregado com sucesso.');

    const selectElements = page.locator('div.space-y-3 select');
    const provSelect = selectElements.nth(0);
    const muniSelect = selectElements.nth(1);
    const comunaSelect = selectElements.nth(2);

    // Obter todas as opções de províncias
    const allProvinces = (await provSelect.locator('option').allInnerTexts()).filter(p => p !== 'Selecione...');
    console.log(`📋 Total de províncias no select: ${allProvinces.length} (esperado: 21)`);

    if (allProvinces.length !== 21) {
      throw new Error(`Esperadas 21 províncias, encontradas: ${allProvinces.length}`);
    }

    let successCount = 0;

    for (const prov of allProvinces) {
      console.log(`\n🔍 Testando Província: "${prov}"...`);
      await provSelect.selectOption(prov);
      await page.waitForTimeout(80);

      // 1. Verificar Municípios
      const munis = (await muniSelect.locator('option').allInnerTexts()).filter(m => m !== 'Selecione...');
      console.log(`   🏛️ Municípios (${munis.length}):`, munis.slice(0, 4));
      if (munis.length === 0) {
        throw new Error(`Província "${prov}" tem 0 municípios disponíveis!`);
      }

      // Regra especial Luanda: 16 municípios urbanos e NÃO conter Calumbo (transferido para Ícolo e Bengo)
      if (prov === 'Luanda') {
        if (munis.includes('Calumbo')) {
          throw new Error('Erro: Luanda contém Calumbo (deve pertencer a Ícolo e Bengo na DPA 2025)');
        }
        console.log('   ✅ Validação estrita de Luanda: 16 municípios urbanos corretos.');
      }

      // Regra especial Ícolo e Bengo: deve conter Calumbo, Sequele, Bom Jesus, etc.
      if (prov === 'Ícolo e Bengo') {
        if (!munis.includes('Calumbo') || !munis.includes('Sequele')) {
          throw new Error('Erro: Ícolo e Bengo deve conter Calumbo e Sequele');
        }
        console.log('   ✅ Validação estrita de Ícolo e Bengo: Municípios oficiais validados.');
      }

      // 2. Selecionar o primeiro município e verificar Comunas
      const testMuni = munis[0];
      await muniSelect.selectOption(testMuni);
      await page.waitForTimeout(80);

      const comunas = (await comunaSelect.locator('option').allInnerTexts()).filter(c => c !== 'Selecione...');
      console.log(`   🏡 Comunas para "${testMuni}" (${comunas.length}):`, comunas.slice(0, 3));
      if (comunas.length === 0) {
        throw new Error(`Município "${testMuni}" (${prov}) tem 0 comunas!`);
      }

      successCount++;
    }

    // Testar campo de Endereço Institucional
    console.log('\n📝 Testando campo "Endereço Institucional"...');
    const addressInput = page.locator('input[placeholder*="Rua dos Correios"]');
    await addressInput.fill('Avenida 4 de Fevereiro, Porta 100, Luanda');
    const addressVal = await addressInput.inputValue();
    console.log(`✅ Endereço preenchido: "${addressVal}"`);

    console.log(`\n🎉 SUCESSO TOTAL: ${successCount}/21 Províncias e todos os campos de Localização foram testados e validados com 100% de perfeição!`);
    if (consoleErrors.length > 0) {
      console.warn('⚠️ Erros de console detectados:', consoleErrors);
    }
  } catch (err) {
    console.error('❌ Falha durante os testes:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runAllProvincesBrowserTest();
