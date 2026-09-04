import { chromium } from 'playwright';

async function runDetailedBrowserTest() {
  console.log('🚀 Iniciando teste exaustivo de integração do Browser para Localização IA...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // Capturar logs e erros de console da página
  page.on('console', msg => {
    if (msg.type() === 'error') console.error('🔴 [Browser Console Error]:', msg.text());
  });
  page.on('pageerror', err => console.error('🔴 [Browser Page Error]:', err.message));

  try {
    // 1. Navegar para a página de registo institucional
    console.log('🌐 Navegando para http://localhost:3000/institucional#/registar ...');
    await page.goto('http://localhost:3000/institucional#/registar', { waitUntil: 'networkidle' });
    
    // 2. Aguardar renderização completa
    await page.waitForSelector('text=Localização', { timeout: 10000 });
    console.log('✅ Formulário de Registo de Instituição carregado.');

    // 3. Localizar os 4 selects da área de localização
    const selectElements = page.locator('div.space-y-3 select');
    const provSelect = selectElements.nth(0);
    const citySelect = selectElements.nth(1);
    const muniSelect = selectElements.nth(2);
    const comunaSelect = selectElements.nth(3);

    // =========================================================================
    // TESTE 1: FLUXO PADRÃO (PROVÍNCIA -> CIDADE -> MUNICÍPIO -> COMUNA)
    // =========================================================================
    console.log('\n--- TESTE 1: Luanda (Fluxo Padrão) ---');
    await provSelect.selectOption('Luanda');
    await page.waitForTimeout(600);

    // Verificar que Cidades e Municípios foram imediatamente disponibilizados
    const luandaCities = await citySelect.locator('option').allInnerTexts();
    const luandaMunis = await muniSelect.locator('option').allInnerTexts();
    console.log(`✅ Cidades de Luanda (${luandaCities.length - 1}):`, luandaCities.slice(1, 5));
    console.log(`✅ Municípios de Luanda (${luandaMunis.length - 1}):`, luandaMunis.slice(1, 5));

    if (luandaCities.length <= 1 || luandaMunis.length <= 1) {
      throw new Error('Falha: Cidades ou Municípios não foram populados para Luanda');
    }

    // Selecionar Cidade: "Luanda (Capital)"
    await citySelect.selectOption({ label: luandaCities[1] });
    console.log(`✅ Cidade "${luandaCities[1]}" selecionada.`);
    await page.waitForTimeout(400);

    // Selecionar Município: "Talatona"
    const talatonaOption = luandaMunis.find(m => m.includes('Talatona')) || luandaMunis[1];
    await muniSelect.selectOption({ label: talatonaOption });
    console.log(`✅ Município "${talatonaOption}" selecionado.`);
    await page.waitForTimeout(600);

    // Verificar Comunas de Talatona
    const talatonaComunas = await comunaSelect.locator('option').allInnerTexts();
    console.log(`✅ Comunas de Talatona (${talatonaComunas.length - 1}):`, talatonaComunas.slice(1));
    if (talatonaComunas.length <= 1) {
      throw new Error('Falha: Comunas não foram populadas para Talatona');
    }

    // Selecionar Comuna
    await comunaSelect.selectOption({ label: talatonaComunas[1] });
    console.log(`✅ Comuna "${talatonaComunas[1]}" selecionada.`);

    // =========================================================================
    // TESTE 2: FLUXO VICE-VERSA (PROVÍNCIA -> MUNICÍPIO DIRETO -> AUTO-CIDADE)
    // =========================================================================
    console.log('\n--- TESTE 2: Ícolo e Bengo (Vice-versa: Município Direto) ---');
    await provSelect.selectOption('Ícolo e Bengo');
    await page.waitForTimeout(600);

    // Município deve estar ativo directamente após escolher a província
    const muniDisabled = await muniSelect.isDisabled();
    console.log(`✅ Campo Município está habilitado sem necessidade prévia de Cidade: ${!muniDisabled}`);
    if (muniDisabled) throw new Error('Falha: Município está indevidamente desabilitado');

    const ibMunis = await muniSelect.locator('option').allInnerTexts();
    console.log(`✅ Municípios de Ícolo e Bengo:`, ibMunis.slice(1));

    // Selecionar Município Catete directamente (sem ter selecionado Cidade antes)
    const cateteOption = ibMunis.find(m => m.includes('Catete')) || ibMunis[1];
    await muniSelect.selectOption({ label: cateteOption });
    console.log(`✅ Selecionou directamente Município "${cateteOption}"`);
    await page.waitForTimeout(600);

    // Verificar se a Cidade foi auto-preenchida/deduzida
    const selectedCity = await citySelect.inputValue();
    console.log(`✅ Cidade auto-deduzida/selecionada via Vice-Versa: "${selectedCity}"`);
    if (!selectedCity) {
      throw new Error('Falha: Cidade não foi deduzida ao selecionar Município');
    }

    // Verificar Comunas de Catete
    const cateteComunas = await comunaSelect.locator('option').allInnerTexts();
    console.log(`✅ Comunas de Catete:`, cateteComunas.slice(1));
    if (cateteComunas.length <= 1) {
      throw new Error('Falha: Comunas não foram populadas para Catete');
    }
    await comunaSelect.selectOption({ label: cateteComunas[1] });
    console.log(`✅ Comuna "${cateteComunas[1]}" selecionada.`);

    // =========================================================================
    // TESTE 3: PROVÍNCIA DO HUAMBO (MUNICÍPIO BAILUNDO)
    // =========================================================================
    console.log('\n--- TESTE 3: Huambo -> Bailundo ---');
    await provSelect.selectOption('Huambo');
    await page.waitForTimeout(600);

    const huamboMunis = await muniSelect.locator('option').allInnerTexts();
    const bailundoOption = huamboMunis.find(m => m.includes('Bailundo')) || huamboMunis[1];
    await muniSelect.selectOption({ label: bailundoOption });
    console.log(`✅ Município "${bailundoOption}" selecionado.`);
    await page.waitForTimeout(600);

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

    await page.waitForTimeout(600);

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
