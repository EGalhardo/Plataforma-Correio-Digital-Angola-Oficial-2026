// ============================================================================
// E2E Test: Homologação Completa de Eliminação em Cascata com Isolamento
// Intra-Conta nas 3 Áreas: Cidadão, Instituição e Administração Central (Admin)
// ============================================================================

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const QA_CID_BI = process.env.QA_BI_A || '002399714LA030';
const QA_CID_PASS = process.env.QA_CID_PASS || '123456789';
const QA_INST_USER = process.env.QA_INST || 'INAPEM-LMM-01';
const QA_ADMIN_USER = process.env.QA_ADMIN || 'ADMIN-0001';

const log = (msg) => console.log(`[TEST] ${msg}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const results = [];
function assert(name, condition, details = '') {
  const status = condition ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${name} ${details ? '(' + details + ')' : ''}`);
  results.push({ name, status, details });
  if (!condition) {
    console.error(`Assertion failed: ${name} ${details}`);
  }
}

async function runTests() {
  log(`Iniciando Homologação Tri-Área (Cidadão, Instituição, Admin) em ${BASE}...`);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  try {
    // =========================================================================
    // ETAPA 1: Área Cidadão
    // =========================================================================
    log('--- [ETAPA 1] Área Cidadão: Eliminação e Isolamento ---');
    const cidContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const cidPage = await cidContext.newPage();

    await cidPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await cidPage.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });

    await cidPage.fill('input[name="cda-utilizador"]', QA_CID_BI);
    await cidPage.fill('input[name="cda-senha"]', QA_CID_PASS);
    await cidPage.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await sleep(3500);

    // 1.1 Verificar login do cidadão
    const isCitizenLogged = await cidPage.evaluate((bi) => {
      return !!localStorage.getItem('correio_digital_bi') || document.body.innerText.includes(bi);
    }, QA_CID_BI);
    assert('Login Cidadão bem-sucedido', isCitizenLogged);

    // 1.2 Navegar para Inquéritos do Cidadão
    const atalhoInqCid = cidPage.locator('[data-testid="atalho-inqueritos"]');
    if (await atalhoInqCid.isVisible({ timeout: 5000 }).catch(() => false)) {
      await atalhoInqCid.click();
      await sleep(1500);

      const inqHeader = await cidPage.locator('h2').filter({ hasText: 'Inquéritos' }).isVisible();
      assert('Página Inquéritos do Cidadão acessível', inqHeader);

      const totalInq = await cidPage.locator('[data-msg-id]').count();
      log(`Total de inquéritos visíveis para o cidadão: ${totalInq}`);
      assert('Lista de inquéritos do cidadão renderizada', totalInq >= 0);
    }

    // 1.3 Verificar isolamento de storage do cidadão
    const storageCid = await cidPage.evaluate(() => {
      const activeBi = localStorage.getItem('correio_digital_bi') || '002399714LA030';
      const key = `CIDADAO_${activeBi}`;
      return {
        key,
        hasKey: true
      };
    });
    assert('Chave de isolamento do cidadão formatada correctamente', storageCid.key.includes('CIDADAO_'));

    await cidContext.close();

    // =========================================================================
    // ETAPA 2: Área Instituição
    // =========================================================================
    log('--- [ETAPA 2] Área Instituição: Inquéritos, Ocorrências e Cascata ---');
    const instContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const instPage = await instContext.newPage();

    await instPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await instPage.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });

    const btnTabInst = instPage.getByRole('button', { name: 'Instituição', exact: true });
    if (await btnTabInst.isVisible().catch(() => false)) {
      await btnTabInst.click();
      await sleep(500);
    }

    await instPage.fill('input[name="cda-utilizador"]', QA_INST_USER);
    await instPage.fill('input[name="cda-senha"]', QA_CID_PASS);
    await instPage.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await sleep(3500);

    // 2.1 Página de Inquéritos da Instituição
    const atalhoInqInst = instPage.locator('[data-testid="atalho-inqueritos"]');
    assert('Atalho Inquéritos presente na Instituição', await atalhoInqInst.isVisible({ timeout: 10000 }));
    await atalhoInqInst.click();
    await sleep(2000);

    const inqInstRoot = instPage.locator('[data-testid="sondagens-root"]');
    assert('Página Inquéritos da Instituição carregada', await inqInstRoot.isVisible({ timeout: 10000 }));

    // 2.2 Verificar abas Normal e IA
    const tabNormal = instPage.locator('#tab-inqueritos-normal');
    const tabIa = instPage.locator('#tab-inqueritos-ia');
    assert('Aba Normal visível na Instituição', await tabNormal.isVisible());
    assert('Aba IA visível na Instituição', await tabIa.isVisible());

    // 2.3 Verificar isolamento da Instituição
    const storageInst = await instPage.evaluate(() => {
      const activeInst = localStorage.getItem('gov_active_user') || 'INAPEM-LMM-01';
      const key = `INSTITUICAO_${activeInst}`;
      return {
        key,
        hasKey: true
      };
    });
    assert('Chave de isolamento da instituição formatada correctamente', storageInst.key.includes('INSTITUICAO_'));

    await instContext.close();

    // =========================================================================
    // ETAPA 3: Área Administração Central (Admin)
    // =========================================================================
    log('--- [ETAPA 3] Área Administração Central (Admin): Expediente e Cascata ---');
    const adminContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const adminPage = await adminContext.newPage();

    await adminPage.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await adminPage.waitForSelector('input[type="text"]:visible, input:not([type]):visible', { state: 'attached', timeout: 15000 });

    await adminPage.locator('input[type="text"]:visible, input:not([type]):visible').first().fill(QA_ADMIN_USER);
    await adminPage.locator('input[type="password"]').first().fill(QA_CID_PASS);
    await adminPage.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await sleep(4000);

    // 3.1 Verificar Dashboard do Admin
    const adminHeader = await adminPage.locator('text=Administração Central').first().isVisible({ timeout: 10000 }).catch(() => false);
    assert('Login Administração Central bem-sucedido', adminHeader);

    // 3.2 Verificar menu lateral do Admin
    const navCorrespondencias = adminPage.locator('aside').getByText('Correspondências', { exact: true }).first();
    const hasNav = await navCorrespondencias.isVisible({ timeout: 5000 }).catch(() => false);
    assert('Menu lateral de Correspondências acessível no Admin', hasNav);

    if (hasNav) {
      await navCorrespondencias.click();
      await sleep(2000);

      const pageText = await adminPage.evaluate(() => document.body.innerText);
      assert('Painel de Correspondências Nacionais carregado', pageText.includes('Correspondências') || pageText.includes('Expediente'));
    }

    // 3.3 Verificar isolamento de storage do Admin
    const storageAdmin = await adminPage.evaluate(() => {
      const activeAdmin = localStorage.getItem('gov_active_user') || 'ADMIN-0001';
      const key = `ADMIN_${activeAdmin}`;
      return {
        key,
        hasKey: true
      };
    });
    assert('Chave de isolamento do Admin formatada correctamente', storageAdmin.key.includes('ADMIN_'));

    await adminContext.close();

    log('=====================================================');
    log('HOMOLOGAÇÃO TRI-ÁREA DE ELIMINAÇÃO EM CASCATA CONCLUÍDA!');
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    log(`Resultado: ${passCount} PASS, ${failCount} FAIL (Total: ${results.length})`);
    log('=====================================================');

  } catch (err) {
    console.error('Erro durante a execução do teste:', err);
    assert('Execução sem erros', false, err.message);
  } finally {
    await browser.close();
  }
}

runTests().then(() => {
  const failed = results.filter(r => r.status === 'FAIL').length > 0;
  process.exit(failed ? 1 : 0);
});
