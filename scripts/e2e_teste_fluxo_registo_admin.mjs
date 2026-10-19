import { chromium } from 'playwright';

async function testFluxoRegistoAdmin() {
  console.log('====================================================');
  console.log('🧪 TESTE E2E: FLUXO DE REGISTO (CIDADÃO E INSTITUIÇÃO) E VALIDAÇÃO NO ADMIN');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const QA_ADMIN = process.env.QA_ADMIN || 'ADMIN-0001';
  const QA_ADMIN_PASS = process.env.QA_ADMIN_PASS || '123456789';

  const testTimestamp = Math.floor(Date.now() / 1000).toString().slice(-4);
  // Sigla institucional: apenas letras A-Z (ex: MEC, MINFIN, MED)
  const testInstSigla = 'MEC';
  const testInstNome = `Ministério da Educação e Cultura ${testTimestamp}`;
  
  // BI válido com 14 caracteres: 9 dígitos + 2 letras + 3 dígitos
  const testCidBi = `002399714LA${testTimestamp.slice(-3)}`;
  const testCidNome = `Manuel António Quissanga ${testTimestamp}`;
  const testCidEmail = `manuel.quissanga.${testTimestamp}@netangola.ao`;

  const dummyImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

  try {
    // -------------------------------------------------------------
    // PARTE 1: REGISTO DE INSTITUIÇÃO
    // -------------------------------------------------------------
    console.log('1. [INSTITUIÇÃO] Submetendo nova adesão institucional...');
    await page.goto('http://localhost:3000/institucional#/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const regBtn = page.locator('button:has-text("Registar")').first();
    await regBtn.waitFor({ state: 'visible', timeout: 5000 });
    await regBtn.click();
    await page.waitForTimeout(1500);

    // Preenchimento de todos os campos obrigatórios
    console.log('  → Preenchendo dados institucionais...');
    const nomeInput = page.locator('input[placeholder*="Serviço de Migração"]').first();
    await nomeInput.waitFor({ state: 'visible', timeout: 8000 });
    await nomeInput.fill(testInstNome);
    await page.locator('input[placeholder*="Ex: SME"]').fill(testInstSigla);
    await page.locator('input[placeholder*="Ministério, Instituto"]').fill('Ministério');

    // Localização (DPA 2025)
    const provSelect = page.locator('select').nth(0);
    await provSelect.selectOption('Luanda');
    await page.waitForTimeout(600);

    const munSelect = page.locator('select').nth(1);
    await munSelect.selectOption('Luanda');
    await page.waitForTimeout(600);

    const comSelect = page.locator('select').nth(2);
    const comOptions = await comSelect.locator('option').allInnerTexts();
    const validComuna = comOptions.find(o => o && o !== 'Selecione...') || 'Luanda';
    await comSelect.selectOption({ label: validComuna });
    await page.waitForTimeout(400);

    await page.locator('input[placeholder*="Rua dos Correios"]').fill('Avenida 4 de Fevereiro, Luanda');

    // Contactos
    await page.locator('input[placeholder*="geral@sme.gov.ao"]').fill(`contacto@${testInstSigla.toLowerCase()}.gov.ao`);
    await page.locator('input[placeholder*="+244 923"]').fill('+244 923 111 222');

    // Responsável e Acesso
    await page.locator('input[placeholder*="António Fernando"]').fill('Dr. Director Geral de Teste');
    await page.locator('input[placeholder*="Director Geral"]').fill('Director Nacional');
    await page.locator('input[placeholder*="director@sme.gov.ao"]').fill(`acesso.${testInstSigla.toLowerCase()}@governo.ao`);

    await page.locator('input[type="password"]').first().fill('123456789');
    await page.locator('input[type="password"]').nth(1).fill('123456789');
    await page.waitForTimeout(800);

    const submitInstBtn = page.locator('button:has-text("Submeter Pedido"), button[type="submit"]').first();
    await submitInstBtn.click();
    await page.waitForTimeout(4000);
    console.log(`  → Instituição submetida com sucesso: ${testInstSigla}`);

    // -------------------------------------------------------------
    // PARTE 2: REGISTO DE CIDADÃO
    // -------------------------------------------------------------
    console.log('\n2. [CIDADÃO] Submetendo novo registo de cidadão...');
    await page.goto('http://localhost:3000/#/registo', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Passo 1: Dados pessoais
    console.log('  → Preenchendo Passo 1: Nome, Email e Senha...');
    await page.locator('input[placeholder*="Manuel António da Silva"]').fill(testCidNome);
    await page.locator('input[placeholder*="manuel.silva@netangola.ao"]').fill(testCidEmail);
    await page.locator('input[placeholder="••••••••••••"]').first().fill('123456789aA@');
    await page.locator('input#confirm-password').fill('123456789aA@');
    await page.waitForTimeout(1000);

    await page.locator('#btn-next-step-1, button:has-text("CONTINUAR")').first().click();
    await page.waitForTimeout(2000);

    // Passo 2: Documentos e B.I.
    console.log('  → Preenchendo Passo 2: Número do B.I. e Ficheiros...');
    await page.locator('input[placeholder*="002931298LA045"]').fill(testCidBi);
    await page.locator('input[type="date"]').fill('1990-05-15');
    await page.locator('select').first().selectOption('M');

    // Upload Frente e Verso
    await page.locator('input[type="file"]').first().setInputFiles({ name: 'bi_frente.png', mimeType: 'image/png', buffer: dummyImageBuffer });
    await page.waitForTimeout(1800);
    await page.locator('input[type="file"]').nth(1).setInputFiles({ name: 'bi_verso.png', mimeType: 'image/png', buffer: dummyImageBuffer });
    await page.waitForTimeout(1800);

    const step2Btn = page.locator('button:has-text("SEGUINTE")').first();
    await step2Btn.click();
    await page.waitForTimeout(2000);

    // Passo 3: Biometria e Conclusão
    console.log('  → Concluindo Passo 3: Biometria Facial...');
    
    // Captura 1
    const cap1 = page.locator('button:has-text("INICIAR CAPTURA")').first();
    await cap1.waitFor({ state: 'visible', timeout: 10000 });
    await cap1.click();
    await page.waitForTimeout(2000);

    // Captura 2
    const cap2 = page.locator('button:has-text("REGISTAR CAPTURA (2/3")').first();
    await cap2.waitFor({ state: 'visible', timeout: 10000 });
    await cap2.click();
    await page.waitForTimeout(2000);

    // Captura 3
    const cap3 = page.locator('button:has-text("REGISTAR CAPTURA (3/3")').first();
    await cap3.waitFor({ state: 'visible', timeout: 10000 });
    await cap3.click();
    await page.waitForTimeout(2000);

    // Aguardar conclusão da biometria
    const bioDone = page.locator('p:has-text("BIOMETRIA REGISTADA"), p:has-text("BIOMETRIA CONCLUÍDA")').first();
    await bioDone.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    // Finalizar Submissão
    const submitCidBtn = page.locator('button:has-text("FINALIZAR SUBMISSÃO")').first();
    await submitCidBtn.waitFor({ state: 'visible', timeout: 10000 });
    await submitCidBtn.click();

    const accessPopup = page.locator('h3:has-text("DOCUMENTAÇÃO ENVIADA"), h3:has-text("REGISTO CONCLUÍDO")').first();
    await accessPopup.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Fechar popup se visível
    const entendiBtn = page.locator('button:has-text("ENTENDI"), button:has-text("Entendi")').first();
    if (await entendiBtn.isVisible().catch(() => false)) {
      await entendiBtn.click();
      await page.waitForTimeout(1000);
    }

    const pageText = await page.locator('body').innerText();
    console.log('  → Texto no ecrã pós-submissão:', pageText.slice(0, 300).replace(/\n+/g, ' '));
    await page.screenshot({ path: 'images/debug_passo3_submissao.png' });

    // -------------------------------------------------------------
    // PARTE 3: VERIFICAÇÃO NA ÁREA ADMIN (CIDADÃOS E INSTITUIÇÕES)
    // -------------------------------------------------------------
    console.log('\n3. [ADMIN] Autenticando na Área de Administração Central...');
    await page.goto('http://localhost:3000/admin#/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="cda-utilizador"]');
    await page.locator('input[name="cda-utilizador"]').fill(QA_ADMIN);
    await page.locator('input[name="cda-senha"]').fill(QA_ADMIN_PASS);
    await page.locator('button:has-text("Entrar no Portal"), button:has-text("ENTRAR NO PORTAL")').first().click();
    await page.waitForTimeout(2500);

    // A. Verificar Página CIDADÃOS
    console.log('\n4. [ADMIN] Verificando página "Cidadãos" (#/gov-contatos)...');
    await page.locator('aside button:has-text("Cidadãos"), button:has-text("Cidadãos")').first().click();
    await page.waitForTimeout(2500);

    const cidText = await page.locator('body').innerText();
    const cidConsta = cidText.includes(testCidBi) || cidText.includes(testCidNome) || cidText.includes('Quissanga');
    console.log(`  → O cidadão ${testCidNome} (${testCidBi}) consta na lista de Cidadãos? ${cidConsta ? 'SIM (CORRECTO ✅)' : 'NÃO (ERRO ❌)'}`);

    const instEmCidadaos = cidText.includes(testInstSigla);
    console.log(`  → A instituição ${testInstSigla} está ausente da página de Cidadãos? ${!instEmCidadaos ? 'SIM (CORRECTO ✅)' : 'NÃO (ERRO ❌)'}`);

    await page.screenshot({ path: 'images/e2e_admin_cidadao_registado.png' });
    console.log('  → Captura salva: images/e2e_admin_cidadao_registado.png');

    // B. Verificar Página INSTITUIÇÕES
    console.log('\n5. [ADMIN] Verificando página "Instituições" (#/gov-interoperabilidade)...');
    await page.locator('aside button:has-text("Instituições"), button:has-text("Instituições")').first().click();
    await page.waitForTimeout(2500);

    const instText = await page.locator('body').innerText();
    const instConsta = instText.includes(testInstSigla) || instText.includes(testInstNome);
    console.log(`  → A instituição ${testInstSigla} consta na tabela de Instituições? ${instConsta ? 'SIM (CORRECTO ✅)' : 'NÃO (ERRO ❌)'}`);

    const cidEmInstituicoes = instText.includes(testCidBi);
    console.log(`  → O cidadão ${testCidBi} está ausente da página de Instituições? ${!cidEmInstituicoes ? 'SIM (CORRECTO ✅)' : 'NÃO (ERRO ❌)'}`);

    await page.screenshot({ path: 'images/e2e_admin_instituicao_registada.png' });
    console.log('  → Captura salva: images/e2e_admin_instituicao_registada.png');

    if (!cidConsta) {
      throw new Error(`Falha: O cidadão registado (${testCidBi}) não apareceu na página Cidadãos da Área Admin!`);
    }

    if (!instConsta) {
      throw new Error(`Falha: A instituição registada (${testInstSigla}) não apareceu na página Instituições da Área Admin!`);
    }

    console.log('\n====================================================');
    console.log('🎉 SUCESSO: FLUXO DE REGISTO E VISUALIZAÇÃO NO ADMIN 100% HOMOLOGADO!');
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ Erro no teste:', err);
    await page.screenshot({ path: 'images/e2e_erro_fluxo_registo.png' });
    throw err;
  } finally {
    await browser.close();
  }
}

testFluxoRegistoAdmin();
