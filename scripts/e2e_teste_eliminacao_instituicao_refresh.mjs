import { chromium } from 'playwright';

async function testEliminacaoInstituicaoRefresh() {
  console.log('====================================================');
  console.log('🧪 TESTE E2E: ELIMINAÇÃO DE INSTITUIÇÃO E PERSISTÊNCIA APÓS REFRESH');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    const QA_ADMIN = process.env.QA_ADMIN || 'ADMIN-0001';
    const QA_ADMIN_PASS = process.env.QA_ADMIN_PASS || '123456789';

    // 1. Aceder ao portal admin
    console.log('1. Acedendo à Área de Administração Central...');
    await page.goto('http://localhost:3000/admin#/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="cda-utilizador"]');
    await page.locator('input[name="cda-utilizador"]').fill(QA_ADMIN);
    await page.locator('input[name="cda-senha"]').fill(QA_ADMIN_PASS);
    await page.locator('button:has-text("Entrar no Portal"), button:has-text("ENTRAR NO PORTAL")').first().click();
    await page.waitForTimeout(2500);

    // 2. Navegar para a página Instituições
    console.log('\n2. Navegando para a página Instituições (#/gov-interoperabilidade)...');
    await page.locator('aside button:has-text("Instituições"), button:has-text("Instituições")').first().click();
    await page.waitForTimeout(2000);

    // Escolher uma instituição na primeira página (ex: SME ou AGT ou ENDE)
    let targetRow = page.locator('table.mobile-data-table tbody tr:has-text("SME"), table tbody tr:has-text("SME")').first();
    let targetName = 'SME';
    if (!(await targetRow.isVisible())) {
      targetRow = page.locator('table.mobile-data-table tbody tr').first();
      targetName = (await targetRow.locator('td').first().innerText()).trim().split('\n')[0];
    }
    
    console.log(`  → Instituição alvo para teste de eliminação: ${targetName}`);

    const targetDeleteBtn = targetRow.locator('button[title="Eliminar Instituição"]').first();
    console.log(`  → Clicando no botão Eliminar da instituição ${targetName}...`);
    await targetDeleteBtn.click();
    await page.waitForTimeout(1000);

    // Confirmar no modal
    const confirmBtn = page.locator('button:has-text("Eliminar Definitivamente")').first();
    await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  → Confirmando eliminação no modal...');
    await confirmBtn.click();
    await page.locator('text=Confirma a eliminação desta instituição?').waitFor({ state: 'hidden', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Verificar na tabela que desapareceu antes do refresh
    const countTableBeforeRefresh = await page.locator(`table tbody tr:has-text("${targetName}")`).count();
    console.log(`  → ${targetName} presente na tabela antes do refresh? ${countTableBeforeRefresh === 0 ? 'NÃO, REMOVIDA (CORRECTO ✅)' : 'SIM (ERRO ❌)'}`);

    await page.screenshot({ path: 'images/admin_instituicao_eliminada_antes_refresh.png' });
    console.log('  → Captura salva: images/admin_instituicao_eliminada_antes_refresh.png');

    if (countTableBeforeRefresh > 0) {
      throw new Error(`Falha: A instituição ${targetName} ainda consta na tabela antes do refresh!`);
    }

    // 3. Fazer REFRESH da página
    console.log('\n3. Realizando REFRESH (F5 / page.reload()) da página...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Garantir que estamos na página de Instituições
    const instNavBtn = page.locator('aside button:has-text("Instituições"), button:has-text("Instituições")').first();
    if (await instNavBtn.isVisible()) {
      await instNavBtn.click();
      await page.waitForTimeout(2000);
    }

    // 4. Verificar se a instituição eliminada voltou ou permaneceu eliminada na tabela
    const countTableAfterRefresh = await page.locator(`table tbody tr:has-text("${targetName}")`).count();
    console.log(`  → ${targetName} presente na tabela após o refresh? ${countTableAfterRefresh === 0 ? 'NÃO, PERMANECE ELIMINADA (CORRECTO ✅)' : 'SIM, REAPARECEU (ERRO ❌)'}`);

    await page.screenshot({ path: 'images/admin_instituicao_eliminada_apos_refresh.png' });
    console.log('  → Captura salva: images/admin_instituicao_eliminada_apos_refresh.png');

    if (countTableAfterRefresh > 0) {
      throw new Error(`Falha: A instituição ${targetName} reapareceu após o refresh!`);
    }

    console.log('\n====================================================');
    console.log('🎉 SUCESSO: ELIMINAÇÃO DE INSTITUIÇÃO HOMOLOGADA COM SUCESSO!');
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ Erro no teste:', err);
    await page.screenshot({ path: 'images/admin_erro_eliminacao.png' });
    throw err;
  } finally {
    await browser.close();
  }
}

testEliminacaoInstituicaoRefresh();

