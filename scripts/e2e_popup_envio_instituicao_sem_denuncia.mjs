import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function run() {
  console.log('🚀 Iniciando Bateria E2E: Validação das Opções do Popup de Envio na Área Institucional (Sem botão Denunciar)...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const screenshotDir = path.resolve('testes/evidencias/screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS ${totalTests}] ${message}`);
    } else {
      console.error(`  ❌ [FAIL ${totalTests}] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // =========================================================================
    // PARTE 1: ÁREA INSTITUCIONAL (AGT-9921-SR)
    // =========================================================================
    console.log('\n🏛️ 1. Login na Área Institucional (AGT-9921-SR)...');
    await page.goto('http://localhost:3000/institucional#/entrar', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const instCodeInput = page.locator('input[name="cda-utilizador"], input[type="text"]:visible, input:not([type]):visible').first();
    await instCodeInput.waitFor({ state: 'visible', timeout: 15000 });
    await instCodeInput.fill('AGT-9921-SR');
    const instPassInput = page.locator('input[name="cda-senha"], input[type="password"]:visible').first();
    await instPassInput.fill('000000');
    await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await page.waitForTimeout(2500);

    console.log('✍️ 2. Navegando para o Correio Institucional e abrindo Nova Mensagem...');
    await page.locator('aside button').filter({ hasText: /Correio/i }).first().click();
    await page.waitForTimeout(1000);

    const btnNovaMsg = page.locator('button').filter({ hasText: /Nova Mensagem/i }).first();
    await btnNovaMsg.click();
    await page.waitForTimeout(1000);

    console.log('📝 3. Preenchendo campos de correspondência oficial...');
    const toInput = page.locator('input[placeholder*="BI"], input[placeholder*="Código"]').first();
    await toInput.fill('009874562LA041');
    const subjInput = page.locator('#compose-subject-input, [data-testid="compose-subject-input"]').first();
    await subjInput.fill('Notificação de Conformidade Tributária');
    const bodyInput = page.locator('textarea, [contenteditable="true"]').first();
    await bodyInput.fill('Informamos que o seu processo fiscal foi homologado.');

    console.log('🔘 4. Clicando em «Enviar Mensagem Oficial» para validar o popup...');
    const btnEnviar = page.locator('#btn-enviar-mensagem');
    await btnEnviar.click();
    await page.waitForTimeout(1000);

    const popup = page.locator('[data-testid="popup-enviar-mensagem"]');
    assert(await popup.isVisible(), 'Popup de seleção de modalidade de envio visível na Instituição');

    const optNormal = page.locator('#btn-modal-opcao-normal');
    assert(await optNormal.isVisible(), 'Instituição: Opção «Mensagem Normal» presente');

    const optComunicado = page.locator('#btn-modal-opcao-comunicado');
    assert(await optComunicado.isVisible(), 'Instituição: Opção «Comunicado» presente');

    const optEmergencia = page.locator('#btn-modal-opcao-emergencia');
    assert(await optEmergencia.isVisible(), 'Instituição: Opção «Mensagem de Emergência» presente');

    const optDenuncia = await page.locator('#btn-modal-opcao-denuncia, #btn-modal-opcao-denunciar').isVisible().catch(() => false);
    assert(!optDenuncia, 'Instituição: Botão/Opção «Denunciar» / «Denuncia» NÃO ESTÁ PRESENTE no popup (Removido com sucesso)');

    await page.screenshot({ path: path.join(screenshotDir, 'popup_envio_instituicao_sem_denuncia.png'), fullPage: true });

    // =========================================================================
    // PARTE 2: ÁREA DO CIDADÃO (009874562LA041) — CONTRAPROVA
    // =========================================================================
    console.log('\n👤 5. Alternando para a Área do Cidadão para verificar contraprova...');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto('http://localhost:3000/#/entrar', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const biInput = page.locator('input[name="cda-utilizador"], input[type="text"]:visible, input:not([type]):visible').first();
    await biInput.fill('009874562LA041');
    const passInput = page.locator('input[name="cda-senha"], input[type="password"]:visible').first();
    await passInput.fill('123456');
    await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await page.waitForTimeout(2500);

    await page.locator('aside button').filter({ hasText: /Correio/i }).first().click();
    await page.waitForTimeout(1000);

    const btnNovaMsgCid = page.locator('button').filter({ hasText: /Nova Mensagem/i }).first();
    await btnNovaMsgCid.click();
    await page.waitForTimeout(1000);

    const toInputCid = page.locator('input[placeholder*="Código"]').first();
    await toInputCid.fill('AGT');
    const bodyInputCid = page.locator('textarea, [contenteditable="true"]').first();
    await bodyInputCid.fill('Mensagem de teste do cidadão.');

    const btnEnviarCid = page.locator('#btn-enviar-mensagem');
    await btnEnviarCid.click();
    await page.waitForTimeout(1000);

    const popupCid = page.locator('[data-testid="popup-enviar-mensagem"]');
    assert(await popupCid.isVisible(), 'Cidadão: Popup de modalidade visível');

    const optDenunciaCid = page.locator('#btn-modal-opcao-denuncia');
    assert(await optDenunciaCid.isVisible(), 'Cidadão: Opção «Denuncia» visível legitimamente para o cidadão');

    const optReclamacaoCid = page.locator('#btn-modal-opcao-denunciar');
    assert(await optReclamacaoCid.isVisible(), 'Cidadão: Opção «Reclamação» visível legitimamente para o cidadão');

    await page.screenshot({ path: path.join(screenshotDir, 'popup_envio_cidadao_com_denuncia.png'), fullPage: true });

    await context.close();

    console.log(`\n======================================================`);
    console.log(`🎉 BATERIA CONCLUÍDA: ${passedTests} de ${totalTests} asserções PASSARAM COM 100% DE SUCESSO!`);
    console.log(`======================================================`);

  } catch (err) {
    console.error('❌ Falha na bateria de validação do popup:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
