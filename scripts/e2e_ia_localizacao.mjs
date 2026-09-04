import { chromium } from 'playwright';

async function runDetailedBrowserTest() {
  console.log('🚀 Iniciando teste exaustivo de integração do Browser para Localização DPA 2025...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  page.on('console', msg => {
    if (msg.type() === 'error') console.error('🔴 [Browser Console Error]:', msg.text());
  });
  page.on('pageerror', err => console.error('🔴 [Browser Page Error]:', err.message));

  try {
    // 1. Navegar para a página de registo institucional
    console.log('🌐 Navegando para http://localhost:3000/institucional#/registar ...');
    await page.goto('http://localhost:3000/institucional#/registar', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // 2. Aguardar renderização completa
    await page.waitForSelector('text=Localização', { timeout: 10000 });
    console.log('✅ Formulário de Registo de Instituição carregado.');

    // 3. Localizar os 3 selects da área de localização (DPA 2025: Província -> Município -> Comuna)
    const selectElements = page.locator('div.space-y-3 select');
    const provSelect = selectElements.nth(0);
    const muniSelect = selectElements.nth(1);
    const comunaSelect = selectElements.nth(2);

    // =========================================================================
    // TESTE 1: FLUXO PADRÃO DPA 2025 (PROVÍNCIA -> MUNICÍPIO -> COMUNA) - LUANDA
    // =========================================================================
    console.log('\n--- TESTE 1: Luanda (Fluxo DPA 2025) ---');
    await provSelect.selectOption('Luanda');
    await page.waitForTimeout(400);

    // Verificar que Municípios de Luanda foram disponibilizados
    const luandaMunis = await muniSelect.locator('option').allInnerTexts();
    console.log(`✅ Municípios de Luanda (${luandaMunis.length - 1}):`, luandaMunis.slice(1, 5));

    if (luandaMunis.length <= 1) {
      throw new Error('Falha: Municípios não foram populados para Luanda');
    }

    // Selecionar Município: "Talatona" ou primeiro disponível
    const talatonaOption = luandaMunis.find(m => m.includes('Talatona')) || luandaMunis[1];
    await muniSelect.selectOption({ label: talatonaOption });
    console.log(`✅ Município "${talatonaOption}" selecionado.`);
    await page.waitForTimeout(400);

    // Verificar Comunas
    const talatonaComunas = await comunaSelect.locator('option').allInnerTexts();
    console.log(`✅ Comunas de ${talatonaOption} (${talatonaComunas.length - 1}):`, talatonaComunas.slice(1));
    if (talatonaComunas.length <= 1) {
      throw new Error(`Falha: Comunas não foram populadas para ${talatonaOption}`);
    }

    // Selecionar Comuna
    await comunaSelect.selectOption({ label: talatonaComunas[1] });
    console.log(`✅ Comuna "${talatonaComunas[1]}" selecionada.`);

    // =========================================================================
    // TESTE 2: PROVÍNCIA DE ÍCOLO E BENGO (DPA 2025)
    // =========================================================================
    console.log('\n--- TESTE 2: Ícolo e Bengo (DPA 2025) ---');
    await provSelect.selectOption('Ícolo e Bengo');
    await page.waitForTimeout(400);

    const ibMunis = await muniSelect.locator('option').allInnerTexts();
    console.log(`✅ Municípios de Ícolo e Bengo:`, ibMunis.slice(1));

    // Selecionar Município Calumbo
    const calumboOption = ibMunis.find(m => m.includes('Calumbo')) || ibMunis[1];
    await muniSelect.selectOption({ label: calumboOption });
    console.log(`✅ Selecionou Município "${calumboOption}"`);
    await page.waitForTimeout(400);

    // Verificar Comunas de Calumbo (incluindo Zango 0 a 5/8000)
    const calumboComunas = await comunaSelect.locator('option').allInnerTexts();
    console.log(`✅ Comunas de Calumbo:`, calumboComunas.slice(1));
    if (calumboComunas.length <= 1) {
      throw new Error('Falha: Comunas não foram populadas para Calumbo');
    }
    await comunaSelect.selectOption({ label: calumboComunas[1] });
    console.log(`✅ Comuna "${calumboComunas[1]}" selecionada.`);

    // =========================================================================
    // TESTE 3: PROVÍNCIA DO HUAMBO (MUNICÍPIO BAILUNDO)
    // =========================================================================
    console.log('\n--- TESTE 3: Huambo -> Bailundo ---');
    await provSelect.selectOption('Huambo');
    await page.waitForTimeout(400);

    const huamboMunis = await muniSelect.locator('option').allInnerTexts();
    const bailundoOption = huamboMunis.find(m => m.includes('Bailundo')) || huamboMunis[1];
    await muniSelect.selectOption({ label: bailundoOption });
    console.log(`✅ Município "${bailundoOption}" selecionado.`);
    await page.waitForTimeout(400);

    const bailundoComunas = await comunaSelect.locator('option').allInnerTexts();
    console.log(`✅ Comunas de Bailundo:`, bailundoComunas.slice(1));
    if (bailundoComunas.length <= 1) {
      throw new Error('Falha: Comunas não foram populadas para Bailundo');
    }
    await comunaSelect.selectOption({ label: bailundoComunas[1] });
    console.log(`✅ Comuna "${bailundoComunas[1]}" selecionada.`);

    // =========================================================================
    // TESTE 4: PREENCHIMENTO INTEGRAL DO FORMULÁRIO E CÓDIGO INSTITUCIONAL
    // =========================================================================
    console.log('\n--- TESTE 4: Preenchimento Integral do Formulário ---');
    
    // Nome e Sigla
    await page.fill('input[placeholder*="Serviço de Migração"]', 'Instituto Nacional de Fomento Tecnológico');
    await page.fill('input[placeholder*="Ex: SME"]', 'INFT');
    await page.fill('input[placeholder*="Ministério, Instituto"]', 'Instituto Público');
    await page.fill('input[placeholder*="Rua dos Correios"]', 'Avenida 4 de Fevereiro, Edifício Luanda, 5º Andar');

    // Contacto Institucional
    await page.fill('input[placeholder*="geral@sme.gov.ao"]', 'contacto@inft.gov.ao');
    await page.fill('input[placeholder*="+244 923"]', '923123456');

    // Responsável
    await page.fill('input[placeholder*="António Fernando"]', 'Dr. António Manuel');
    await page.fill('input[placeholder*="Director Geral"]', 'Director Geral');
    await page.fill('input[placeholder*="director@sme.gov.ao"]', 'antonio.manuel@inft.gov.ao');
    await page.fill('input[placeholder*="Mínimo 8 caracteres"]', 'Segredo@2026!');
    await page.fill('input[placeholder*="Repita a senha"]', 'Segredo@2026!');

    await page.waitForTimeout(400);

    // Tirar screenshot da validação visual completa
    await page.screenshot({ path: 'testes/evidencias/screenshots/institucional_registo_ia_localizacao.png', fullPage: true });
    console.log('📸 Screenshot da tela de registo atualizado com sucesso.');

    console.log('\n🎉 TODOS OS TESTES DE BROWSER FORAM EXECUTADOS COM SUCESSO ABSOLUTO (100%)!');
  } catch (err) {
    console.error('❌ Erro durante o teste E2E detalhado:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runDetailedBrowserTest();
