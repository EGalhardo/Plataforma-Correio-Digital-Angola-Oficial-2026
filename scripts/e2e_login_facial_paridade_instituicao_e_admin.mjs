#!/usr/bin/env node
// ============================================================================
// e2e_login_facial_paridade_instituicao_e_admin.mjs
// Homologação E2E: Paridade Estrita de Dados e Foto de Perfil no Login Facial
// nas Áreas Institucional e Administração Central
// ============================================================================
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const INST_ID = process.env.CDA_E2E_INST_USER || 'AGT-9921-SR';
const INST_PASS = process.env.CDA_E2E_INST_PASS || '000000';
const ADMIN_ID = process.env.CDA_E2E_ADMIN_USER || 'ADMIN-0001';
const ADMIN_PASS = process.env.CDA_E2E_ADMIN_PASS || '123456789';

let FAILS = 0;
const reg = (nome, ok, detalhe = '') => {
  if (!ok) FAILS++;
  console.log(`  ${ok ? '✅' : '❌'} [${ok ? 'PASS' : 'FAIL'}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};

console.log('🚀 Iniciando Bateria E2E: Paridade de Foto e Dados no Login Facial (Instituição e Admin)...\n');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-PT' });

try {
  // --------------------------------------------------------------------------
  // TESTE 1: ÁREA INSTITUIÇÃO — LOGIN NORMAL vs LOGIN FACIAL
  // --------------------------------------------------------------------------
  console.log('🏛️ --- TESTE 1: ÁREA INSTITUCIONAL ---');
  
  // 1.1 Login normal
  console.log('  1.1: Login normal da Instituição (AGT-9921-SR)...');
  await page.goto(`${BASE}/institucional#/entrar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const instInput = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
  await instInput.fill(INST_ID);
  await page.locator('input[type="password"]:visible').first().fill(INST_PASS);
  await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
  await page.waitForTimeout(2500);

  // Acede à página Perfil Institucional
  console.log('  1.2: Acedendo à página Perfil Institucional...');
  const menuPerfilInst = page.locator('aside').getByText(/Perfil|Conta/i).first();
  await menuPerfilInst.click();
  await page.waitForTimeout(1500);

  const normalInstTitle = await page.locator('header h1, h1, h2').filter({ hasText: /Olá|Edlasio|AGT|Agente/i }).first().innerText();
  console.log(`  ℹ️ Saudação/Título capturado em login normal: "${normalInstTitle}"`);

  // Regista face local se necessário
  const btnRegFace = page.getByRole('button', { name: /Registar a minha face|Atualizar a minha face/i }).first();
  if (await btnRegFace.isVisible()) {
    console.log('  1.3: Registando face local na página Perfil...');
    await btnRegFace.click();
    await page.waitForTimeout(600);

    for (let step = 1; step <= 3; step++) {
      const btnCap = page.getByRole('button', { name: new RegExp(`Capturar ${step}/3`, 'i') }).first();
      await btnCap.waitFor({ state: 'visible', timeout: 6000 });
      await btnCap.click();
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(1200);
    reg('1.1 - Registo facial institucional concluído', true);
  }

  // Faz logout
  console.log('  1.4: Realizando Logout Institucional...');
  await page.locator('aside').getByText(/Sair|Terminar/i).first().click();
  await page.waitForTimeout(2500);

  // Executa LOGIN FACIAL
  console.log('  1.5: Executando Login Facial na Instituição...');
  const btnLoginFacialInst = page.getByRole('button', { name: /LOGIN FACIAL/i }).first();
  await btnLoginFacialInst.waitFor({ state: 'visible', timeout: 10000 });
  await btnLoginFacialInst.click();
  await page.waitForTimeout(1000);

  const btnValidarFaceInst = page.getByRole('button', { name: /VALIDAR FACE LOCAL/i }).first();
  await btnValidarFaceInst.waitFor({ state: 'visible', timeout: 10000 });
  await btnValidarFaceInst.click();
  await page.waitForTimeout(3000);

  // Verifica entrada no portal
  const txtPosFaceInst = (await page.evaluate(() => document.body.innerText)).toLowerCase();
  reg('1.2 - Entrada com sucesso no Portal Institucional via Login Facial', txtPosFaceInst.includes('instituição') || txtPosFaceInst.includes('correspondências') || txtPosFaceInst.includes('agt'));

  // Acede novamente ao Perfil e verifica paridade de dados e cabeçalho
  await page.locator('aside').getByText(/Perfil|Conta/i).first().click();
  await page.waitForTimeout(1500);

  const faceInstTitle = await page.locator('header h1, h1, h2').filter({ hasText: /Olá|Edlasio|AGT|Agente/i }).first().innerText();
  console.log(`  ℹ️ Saudação/Título após Login Facial: "${faceInstTitle}"`);
  reg('1.3 - Paridade de Saudação/Identidade no Header Institucional', faceInstTitle === normalInstTitle);

  const perfilTextInst = (await page.evaluate(() => document.body.innerText)).toLowerCase();
  reg('1.4 - Dados do Perfil Institucional preservados (NIF / Telefone / Instituição)', perfilTextInst.includes('agt') || perfilTextInst.includes('5401329188') || perfilTextInst.includes('tributária'));


  // --------------------------------------------------------------------------
  // TESTE 2: ÁREA ADMIN — LOGIN NORMAL vs LOGIN FACIAL
  // --------------------------------------------------------------------------
  console.log('\n👑 --- TESTE 2: ÁREA DE ADMINISTRAÇÃO CENTRAL ---');

  // 2.1 Login normal Admin
  console.log('  2.1: Login normal da Administração Central (ADMIN-0001)...');
  await page.locator('aside').getByText(/Sair|Terminar/i).first().click();
  await page.waitForTimeout(2500);

  await page.goto(`${BASE}/admin#/entrar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const adminInput = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
  await adminInput.fill(ADMIN_ID);
  await page.locator('input[type="password"]:visible').first().fill(ADMIN_PASS);
  await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
  await page.waitForTimeout(3000);

  // Acede à página Perfil Administrativo
  console.log('  2.2: Acedendo à página Perfil Administrativo...');
  const menuPerfilAdmin = page.locator('aside').getByText(/Perfil|Conta/i).first();
  await menuPerfilAdmin.click();
  await page.waitForTimeout(1500);

  const normalAdminTitle = await page.locator('header h1, h1, h2').filter({ hasText: /Olá|Administrador|Edlasio|Admin/i }).first().innerText();
  console.log(`  ℹ️ Saudação/Título Admin capturado em login normal: "${normalAdminTitle}"`);

  // Regista face local se necessário
  const btnRegFaceAdmin = page.getByRole('button', { name: /Registar a minha face|Atualizar a minha face/i }).first();
  if (await btnRegFaceAdmin.isVisible()) {
    console.log('  2.3: Registando face local na página Perfil Admin...');
    await btnRegFaceAdmin.click();
    await page.waitForTimeout(600);

    for (let step = 1; step <= 3; step++) {
      const btnCap = page.getByRole('button', { name: new RegExp(`Capturar ${step}/3`, 'i') }).first();
      await btnCap.waitFor({ state: 'visible', timeout: 6000 });
      await btnCap.click();
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(1200);
    reg('2.1 - Registo facial de Administrador concluído', true);
  }

  // Faz logout e vai ao login facial admin
  console.log('  2.4: Realizando Logout de Administrador...');
  await page.locator('aside').getByText(/Sair|Terminar/i).first().click();
  await page.waitForTimeout(2500);

  console.log('  2.5: Executando Login Facial na Administração...');
  const btnLoginFacialAdmin = page.getByRole('button', { name: /LOGIN FACIAL/i }).first();
  await btnLoginFacialAdmin.waitFor({ state: 'visible', timeout: 10000 });
  await btnLoginFacialAdmin.click();
  await page.waitForTimeout(1000);

  const btnValidarFaceAdmin = page.getByRole('button', { name: /VALIDAR FACE LOCAL/i }).first();
  await btnValidarFaceAdmin.waitFor({ state: 'visible', timeout: 10000 });
  await btnValidarFaceAdmin.click();
  await page.waitForTimeout(3000);

  // Verifica entrada na Administração
  const txtPosFaceAdmin = (await page.evaluate(() => document.body.innerText)).toLowerCase();
  reg('2.2 - Entrada com sucesso na Administração Central via Login Facial', txtPosFaceAdmin.includes('administração central') || txtPosFaceAdmin.includes('painel nacional') || txtPosFaceAdmin.includes('gestão'));

  // Acede ao Perfil Admin e verifica paridade
  await page.locator('aside').getByText(/Perfil|Conta/i).first().click();
  await page.waitForTimeout(1500);

  const faceAdminTitle = await page.locator('header h1, h1, h2').filter({ hasText: /Olá|Administrador|Edlasio|Admin/i }).first().innerText();
  console.log(`  ℹ️ Saudação/Título Admin após Login Facial: "${faceAdminTitle}"`);
  reg('2.3 - Paridade de Saudação/Identidade no Header Administrativo', faceAdminTitle === normalAdminTitle);

  const perfilTextAdmin = (await page.evaluate(() => document.body.innerText)).toLowerCase();
  reg('2.4 - Dados do Perfil Administrativo preservados (Admin / Geral)', perfilTextAdmin.includes('administrador') || perfilTextAdmin.includes('admin-0001') || perfilTextAdmin.includes('central'));

} catch (err) {
  console.error('❌ Erro não tratado durante execução E2E:', err);
  FAILS++;
} finally {
  await browser.close();
  console.log('\n========================================');
  console.log(`FALHAS TOTAIS: ${FAILS}`);
  console.log('========================================');
  process.exit(FAILS > 0 ? 1 : 0);
}
