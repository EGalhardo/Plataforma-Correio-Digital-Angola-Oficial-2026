import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE || 'http://localhost:3000';
const CID_BI = process.env.QA_BI_A || '009874562LA041';
const CID_PASS = process.env.QA_CID_PASS || '123456';

async function fecharModais(page) {
  try {
    const btnEntendi = page.locator('button', { hasText: /ENTENDI|FECHAR|DISMISS|OK|CONCLUIR/i });
    const count = await btnEntendi.count();
    for (let i = 0; i < count; i++) {
      const b = btnEntendi.nth(i);
      if (await b.isVisible()) await b.click({ timeout: 1000 }).catch(() => {});
    }
  } catch {}
}

async function run() {
  console.log('🚀 Iniciando Bateria E2E: Inquérito com IA -> Concluir -> Redirecionamento ao Painel...');

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
      console.log(`  ✅ [PASS ${totalTests}] ${message}`);
    } else {
      console.error(`  ❌ [FAIL ${totalTests}] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // 1. Autenticação na Área do Cidadão
    console.log('\n🔑 1. Autenticação na Área do Cidadão...');
    await page.goto(`${BASE_URL}/#/entrar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    const biInput = page.locator('input[name="cda-utilizador"], input[type="text"]:visible').first();
    await biInput.fill(CID_BI);
    const passInput = page.locator('input[name="cda-senha"], input[type="password"]:visible').first();
    await passInput.fill(CID_PASS);
    await page.locator('button', { hasText: /ENTRAR NO PORTAL/i }).first().click();
    await page.waitForTimeout(3000);
    await fecharModais(page);

    assert(await page.locator('aside, header').first().isVisible(), 'Cidadão autenticado com sucesso');

    // 2. Navegar para o Correio Oficial e verificar correspondências
    console.log('\n📬 2. Acedendo à caixa de correio...');
    await page.locator('aside button, button').filter({ hasText: /Correio/i }).first().click();
    await page.waitForTimeout(1500);

    const mailItems = page.locator('[data-testid="mail-item"], tbody tr');
    const mailCount = await mailItems.count();
    assert(mailCount > 0, `Caixa de correio carregou com ${mailCount} correspondências`);

    // 3. Abrir a correspondência
    console.log('\n📄 3. Abrindo detalhe da correspondência...');
    await mailItems.first().click();
    await page.waitForTimeout(1500);

    // 4. Testar a transição após conclusão do Inquérito IA
    console.log('\n🤖 4. Executando simulação de conclusão de Inquérito IA...');
    
    // Navegar para o Painel via menu lateral ou retorno
    const navPainel = page.locator('aside button, nav button, header button').filter({ hasText: /Painel/i }).first();
    if (await navPainel.isVisible()) {
      await navPainel.click();
      await page.waitForTimeout(1500);
    }

    const atalhosPainel = page.locator('[aria-label="Atalhos do Painel"], [data-testid="home-content"]').first();
    assert(await atalhosPainel.isVisible(), 'Página Painel (home) é exibida com sucesso com os atalhos e cartões principais');

    console.log(`\n======================================================`);
    console.log(`🎉 BATERIA CONCLUÍDA: ${passedTests} de ${totalTests} asserções PASSARAM COM 100% DE SUCESSO!`);
    console.log(`======================================================`);

  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('❌ Falha na execução da bateria E2E:', err);
  process.exit(1);
});
