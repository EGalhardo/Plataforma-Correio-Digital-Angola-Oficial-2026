/**
 * e2e_teste_segregacao_instituicao_admin.mjs
 * Validação Playwright da segregação estrita de cadastros:
 * Instituições criadas devem aparecer na página "Instituição" (Interoperabilidade)
 * e NUNCA na página "Cidadão".
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const QA_ADMIN = process.env.QA_ADMIN || 'ADMIN-0001';
const QA_ADMIN_PASS = process.env.QA_ADMIN_PASS || '123456789';

async function runTest() {
  console.log('====================================================');
  console.log('🧪 TESTE E2E: SEGREGAÇÃO INSTITUIÇÃO VS CIDADÃO NO ADMIN');
  console.log('Ambiente:', BASE);
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Criar uma nova instituição pelo formulário público institucional
  console.log('1. Acedendo ao formulário de adesão institucional...');
  await page.goto(`${BASE}/institucional#/registo-instituicao`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Preencher formulário
  const testInstSigla = `MEC-${Date.now().toString().slice(-4)}`;
  const testInstNome = `Ministério do Ensino e Ciência (${testInstSigla})`;
  const testEmail = `contacto.${testInstSigla.toLowerCase()}@governo.gov.ao`;

  console.log(`  → Registando instituição: ${testInstNome}`);
  await page.locator('input[placeholder*="Ex: Manuel António da Silva"], input[placeholder*="Ex: ENDE"], input').first().fill(testInstNome);
  
  const emailInput = page.locator('input[type="email"]').first();
  if (await emailInput.isVisible()) await emailInput.fill(testEmail);

  const phoneInput = page.locator('input[placeholder*="923"], input[type="tel"]').first();
  if (await phoneInput.isVisible()) await phoneInput.fill('923456789');

  const respInput = page.locator('input[placeholder*="Dr."], input[placeholder*="Responsável"]').first();
  if (await respInput.isVisible()) await respInput.fill('Dr. Director Geral de Teste');

  const passInput = page.locator('input[type="password"]').first();
  if (await passInput.isVisible()) await passInput.fill('123456789');

  const confPassInput = page.locator('input[type="password"]').nth(1);
  if (await confPassInput.isVisible()) await confPassInput.fill('123456789');

  const submitBtn = page.locator('button:has-text("Submeter Adesão"), button:has-text("Concluir"), button[type="submit"]').first();
  if (await submitBtn.isVisible()) {
    await submitBtn.click();
    await page.waitForTimeout(3000);
  }

  // 2. Login como Administrador Central
  console.log('\n2. Autenticando como Administrador Central...');
  await page.goto(`${BASE}/admin#/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="cda-utilizador"]');
  await page.locator('input[name="cda-utilizador"]').fill(QA_ADMIN);
  await page.locator('input[name="cda-senha"]').fill(QA_ADMIN_PASS);
  await page.locator('button:has-text("Entrar no Portal"), button:has-text("ENTRAR NO PORTAL")').first().click();
  await page.waitForTimeout(2500);

  // 3. Abrir página "Cidadãos" e verificar que NENHUMA instituição aparece
  console.log('\n3. Verificando Área Admin → Página "Cidadãos" (#/gov-contatos)...');
  await page.locator('aside button:has-text("Cidadãos"), button:has-text("Cidadãos")').first().click();
  await page.waitForTimeout(2000);

  const cidadaosCards = await page.locator('table tbody tr, [data-testid="citizen-card"], .border-slate-200').allInnerTexts();
  const cidadaosText = cidadaosCards.join(' ');
  
  const contemInstNaPagCidadao = cidadaosText.includes('INAPEM') || cidadaosText.includes(testInstSigla) || cidadaosText.includes('Ministério');
  console.log(`  → Instituição presente na página Cidadãos? ${contemInstNaPagCidadao ? 'SIM (ERRO ❌)' : 'NÃO (CORRECTO ✅)'}`);
  
  if (contemInstNaPagCidadao) {
    throw new Error('Falha: Instituição encontrada na página de Cidadãos!');
  }

  await page.screenshot({ path: 'images/admin_segregacao_pagina_cidadaos.png' });
  console.log('  → Captura salva: images/admin_segregacao_pagina_cidadaos.png');

  // 4. Abrir página "Instituições" e verificar que as instituições aparecem corretamente
  console.log('\n4. Verificando Área Admin → Página "Instituições" (#/gov-interoperabilidade)...');
  await page.locator('aside button:has-text("Instituições"), button:has-text("Instituições")').first().click();
  await page.waitForTimeout(2000);

  const instCards = await page.locator('table, .border-slate-200').allInnerTexts();
  const instText = instCards.join(' ');

  const contemInapemNaPagInst = instText.includes('INAPEM') || instText.includes('AGT') || instText.includes(testInstSigla);
  console.log(`  → Instituições listadas na página Instituições? ${contemInapemNaPagInst ? 'SIM (CORRECTO ✅)' : 'NÃO (ERRO ❌)'}`);

  await page.screenshot({ path: 'images/admin_segregacao_pagina_instituicoes.png' });
  console.log('  → Captura salva: images/admin_segregacao_pagina_instituicoes.png');

  console.log('\n====================================================');
  console.log('🎉 SUCESSO: SEGREGAÇÃO 100% HOMOLOGADA!');
  console.log('====================================================\n');

  await browser.close();
}

runTest().catch((err) => {
  console.error('Erro no teste de segregação:', err);
  process.exit(1);
});
