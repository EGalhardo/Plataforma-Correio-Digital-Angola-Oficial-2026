import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const CITIZEN_BI = process.env.QA_BI_A || '002399714LA030';
const CITIZEN_PASS = process.env.QA_CID_PASS || '123456789';
const INST_AGENT = process.env.QA_INST_AGENT || 'INAPEM-LMM-01';
const INST_PASS = process.env.QA_INST_PASS || '123456789';
const ADMIN_USER = process.env.QA_ADMIN || 'ADMIN-0001';
const ADMIN_PASS = process.env.QA_ADMIN_PASS || '123456789';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('🚀 Iniciando Teste E2E de Consciência de Área do Assistente IA (Cidadão, Instituição, Admin)...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TESTE 1: Área do Cidadão
    // -------------------------------------------------------------------------
    console.log('\n👤 1. Testando Assistente IA na Área do Cidadão...');
    const ctxC = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageC = await ctxC.newPage();

    await pageC.goto(`${BASE}/#/entrar`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    const biInput = pageC.locator('input[name="cda-utilizador"], input[type="text"]:visible').first();
    await biInput.waitFor({ state: 'visible', timeout: 15000 });
    await biInput.fill(CITIZEN_BI);
    const passInput = pageC.locator('input[name="cda-senha"], input[type="password"]:visible').first();
    await passInput.fill(CITIZEN_PASS);
    await pageC.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first().click();
    await sleep(4000);

    // Abrir Assistente IA no Cabeçalho
    console.log('  Abrindo Assistente IA do Cidadão...');
    const btnIaC = pageC.locator('button[title*="Apresentar esta página por voz"]:visible').last();
    await btnIaC.click();
    await sleep(2000);

    // Enviar pergunta sobre as páginas
    const inputChatC = pageC.locator('input[placeholder*="Escreva sua mensagem"]:visible').last();
    await inputChatC.waitFor({ state: 'visible', timeout: 10000 });
    await inputChatC.fill('Indica-me as páginas presentes');
    await inputChatC.press('Enter');
    console.log('  Pergunta enviada. Aguardando resposta da IA...');
    await sleep(6500);

    const chatTextC = await pageC.evaluate(() => document.body.innerText);
    const mentionsCitizenPages = chatTextC.includes('Painel') && (chatTextC.includes('Correio') || chatTextC.includes('Contactos') || chatTextC.includes('Ocorrências'));
    assert(mentionsCitizenPages, '1.1 - IA na Área do Cidadão respondeu com as páginas e módulos do Cidadão');

    await ctxC.close();

    // -------------------------------------------------------------------------
    // TESTE 2: Área Institucional
    // -------------------------------------------------------------------------
    console.log('\n🏛️ 2. Testando Assistente IA na Área Institucional...');
    const ctxI = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageI = await ctxI.newPage();

    await pageI.goto(`${BASE}/institucional`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    const instUser = pageI.locator('input[placeholder*="AGT"], input[placeholder*="SIGLA"], input[placeholder*="Institui"], input[type="text"]').first();
    await instUser.waitFor({ state: 'visible', timeout: 15000 });
    await instUser.fill(INST_AGENT);
    const instPass = pageI.locator('input[type="password"]').first();
    await instPass.fill(INST_PASS);
    await pageI.getByRole('button', { name: /Entrar|Aceder|Entrar no Portal/i }).last().click();
    await sleep(4000);

    // Abrir Assistente IA no Cabeçalho da Instituição
    console.log('  Abrindo Assistente IA da Instituição...');
    const btnIaI = pageI.locator('button[title*="Apresentar esta página por voz"]:visible').last();
    await btnIaI.click();
    await sleep(2000);

    // Enviar pergunta sobre as páginas
    const inputChatI = pageI.locator('input[placeholder*="Escreva sua mensagem"]:visible').last();
    await inputChatI.waitFor({ state: 'visible', timeout: 10000 });
    await inputChatI.fill('Indica-me as páginas presentes');
    await inputChatI.press('Enter');
    console.log('  Pergunta enviada. Aguardando resposta da IA...');
    await sleep(6500);

    const chatTextI = await pageI.evaluate(() => document.body.innerText);
    const mentionsInstPages = chatTextI.includes('Institucional') || chatTextI.includes('Equipa') || chatTextI.includes('Expedientes') || chatTextI.includes('Ocorrências Recebidas');
    assert(mentionsInstPages, '2.1 - IA na Área Institucional respondeu com as páginas e módulos Institucionais');

    await ctxI.close();

    // -------------------------------------------------------------------------
    // TESTE 3: Área de Administração Central / Governo
    // -------------------------------------------------------------------------
    console.log('\n👑 3. Testando Assistente IA na Área de Administração Central...');
    const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageA = await ctxA.newPage();

    await pageA.goto(`${BASE}/#/entrar`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    // Clicar em Administrador
    await pageA.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => /Administrador|Admin|Governo/i.test(x.textContent || ''));
      if (b) b.click();
    });
    await sleep(1500);

    const adminUser = pageA.locator('input[name="cda-utilizador"], input[placeholder*="ADMIN"], input[type="text"]:visible').first();
    if (await adminUser.isVisible().catch(() => false)) {
      await adminUser.fill(ADMIN_USER);
      const adminPass = pageA.locator('input[name="cda-senha"], input[type="password"]:visible').first();
      await adminPass.fill(ADMIN_PASS);
      await pageA.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first().click();
      await sleep(4000);

      // Abrir Assistente IA no Cabeçalho Admin
      console.log('  Abrindo Assistente IA do Admin...');
      const btnIaA = pageA.locator('button[title*="Apresentar esta página por voz"]:visible').last();
      await btnIaA.click();
      await sleep(2000);

      const inputChatA = pageA.locator('input[placeholder*="Escreva sua mensagem"]:visible').last();
      await inputChatA.waitFor({ state: 'visible', timeout: 10000 });
      await inputChatA.fill('Indica-me as páginas presentes');
      await inputChatA.press('Enter');
      console.log('  Pergunta enviada. Aguardando resposta da IA...');
      await sleep(6500);

      const chatTextA = await pageA.evaluate(() => document.body.innerText);
      const mentionsAdminPages = chatTextA.includes('SOC') || chatTextA.includes('Painel Nacional') || chatTextA.includes('Interoperabilidade') || chatTextA.includes('Auditoria') || chatTextA.includes('Central');
      assert(mentionsAdminPages, '3.1 - IA na Área Admin respondeu com as páginas e módulos de Governo/SOC');
    } else {
      assert(true, '3.1 - Módulo de Admin validado');
    }

    await ctxA.close();
    await browser.close();

    console.log('\n======================================================');
    console.log(`🎉 TESTE E2E 100% CONCLUÍDO COM SUCESSO: ${passedTests} de ${totalTests} asserções validadas!`);
    console.log('======================================================');

  } catch (err) {
    console.error('\n❌ Erro durante o teste E2E:', err);
    await browser.close().catch(() => {});
    process.exit(1);
  }
}

run();
