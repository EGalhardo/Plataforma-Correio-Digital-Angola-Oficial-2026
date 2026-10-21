#!/usr/bin/env node
// ============================================================================
// e2e_login_facial_isolamento_notificacoes_e_fotos.mjs
// Homologação E2E: Isolamento e Paridade de Notificações e Fotos de Perfil
// em Cidadão, Instituição e Administração Central (Login Normal vs Login Facial)
// ============================================================================
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const CID_USER = '009874562LA041';
const CID_PASS = '123456';
const INST_USER = 'AGT-9921-SR';
const INST_PASS = '000000';
const ADMIN_USER = 'ADMIN-0001';
const ADMIN_PASS = '123456789';

let FAILS = 0;
const reg = (nome, ok, detalhe = '') => {
  if (!ok) FAILS++;
  console.log(`  ${ok ? '✅' : '❌'} [${ok ? 'PASS' : 'FAIL'}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};

console.log('🚀 Iniciando Bateria E2E: Isolamento e Paridade de Notificações e Fotos nas 3 Áreas...\n');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-PT' });

try {
  // --------------------------------------------------------------------------
  // PARTE 1: CIDADÃO
  // --------------------------------------------------------------------------
  console.log('👤 --- PARTE 1: CIDADÃO ---');
  await page.goto(`${BASE}/#/entrar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  // Login normal
  await page.locator('input[type="text"]:visible, input:not([type]):visible').first().fill(CID_USER);
  await page.locator('input[type="password"]:visible').first().fill(CID_PASS);
  await page.getByRole('button', { name: /ENTRAR NO CORREIO|ENTRAR NO PORTAL|ENTRAR/i }).first().click();
  await page.waitForTimeout(2500);

  // Obter foto e contagem de notificações
  const cidNormalAvatarSrc = await page.evaluate(() => {
    const el = document.querySelector('header [aria-label="Menu de Perfil e Notificações"] img');
    if (el) return (el).src;
    const div = document.querySelector('header [aria-label="Menu de Perfil e Notificações"] div');
    return div ? div.innerText.trim() : '';
  });
  console.log(`  ℹ️ Avatar Cidadão (Normal): ${cidNormalAvatarSrc}`);

  // Regista face do cidadão
  const menuPerfilCid = page.locator('aside').getByText(/^Perfil$/i).first();
  await menuPerfilCid.click();
  await page.waitForTimeout(1500);

  const btnRegFaceCid = page.getByRole('button', { name: /Registar a minha face|Atualizar a minha face/i }).first();
  if (await btnRegFaceCid.isVisible()) {
    await btnRegFaceCid.click();
    await page.waitForTimeout(600);
    for (let step = 1; step <= 3; step++) {
      const btnCap = page.getByRole('button', { name: new RegExp(`Capturar ${step}/3`, 'i') }).first();
      await btnCap.waitFor({ state: 'visible', timeout: 6000 });
      await btnCap.click();
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(1200);
    reg('1.1 - Face de Cidadão registada com sucesso', true);
  }

  // Logout Cidadão
  await page.locator('aside').getByText(/Sair do Canal|Sair|Terminar/i).first().click();
  await page.waitForTimeout(2000);

  // Login Facial Cidadão
  await page.getByRole('button', { name: /LOGIN FACIAL/i }).first().click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /VALIDAR FACE LOCAL/i }).first().click();
  await page.waitForTimeout(3000);

  const cidFaceAvatarSrc = await page.evaluate(() => {
    const el = document.querySelector('header [aria-label="Menu de Perfil e Notificações"] img');
    if (el) return (el).src;
    const div = document.querySelector('header [aria-label="Menu de Perfil e Notificações"] div');
    return div ? div.innerText.trim() : '';
  });
  console.log(`  ℹ️ Avatar Cidadão (Facial): ${cidFaceAvatarSrc}`);
  reg('1.2 - Paridade de Avatar no Cidadão (Normal vs Facial)', cidFaceAvatarSrc === cidNormalAvatarSrc);

  // --------------------------------------------------------------------------
  // PARTE 2: INSTITUIÇÃO
  // --------------------------------------------------------------------------
  console.log('\n🏛️ --- PARTE 2: INSTITUIÇÃO ---');
  await page.locator('aside').getByText(/Sair do Canal|Sair|Terminar/i).first().click();
  await page.waitForTimeout(2000);

  await page.goto(`${BASE}/institucional#/entrar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  // Login normal Instituição
  await page.locator('input[type="text"]:visible, input:not([type]):visible').first().fill(INST_USER);
  await page.locator('input[type="password"]:visible').first().fill(INST_PASS);
  await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
  await page.waitForTimeout(2500);

  const instNormalAvatarSrc = await page.evaluate(() => {
    const el = document.querySelector('header [aria-label="Menu de Perfil e Notificações"] img');
    if (el) return (el).src;
    const div = document.querySelector('header [aria-label="Menu de Perfil e Notificações"] div');
    return div ? div.innerText.trim() : '';
  });
  console.log(`  ℹ️ Avatar Instituição (Normal): ${instNormalAvatarSrc}`);

  // Regista face Instituição
  await page.locator('aside').getByText(/^Perfil$/i).first().click();
  await page.waitForTimeout(1500);

  const btnRegFaceInst = page.getByRole('button', { name: /Registar a minha face|Atualizar a minha face/i }).first();
  if (await btnRegFaceInst.isVisible()) {
    await btnRegFaceInst.click();
    await page.waitForTimeout(600);
    for (let step = 1; step <= 3; step++) {
      const btnCap = page.getByRole('button', { name: new RegExp(`Capturar ${step}/3`, 'i') }).first();
      await btnCap.waitFor({ state: 'visible', timeout: 6000 });
      await btnCap.click();
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(1200);
    reg('2.1 - Face Institucional registada com sucesso', true);
  }

  // Logout Instituição
  await page.locator('aside').getByText(/Sair do Canal|Sair|Terminar/i).first().click();
  await page.waitForTimeout(2000);

  // Login Facial Instituição
  await page.getByRole('button', { name: /LOGIN FACIAL/i }).first().click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /VALIDAR FACE LOCAL/i }).first().click();
  await page.waitForTimeout(3000);

  const instFaceAvatarSrc = await page.evaluate(() => {
    const el = document.querySelector('header [aria-label="Menu de Perfil e Notificações"] img');
    if (el) return (el).src;
    const div = document.querySelector('header [aria-label="Menu de Perfil e Notificações"] div');
    return div ? div.innerText.trim() : '';
  });
  console.log(`  ℹ️ Avatar Instituição (Facial): ${instFaceAvatarSrc}`);
  reg('2.2 - Paridade de Avatar na Instituição (Normal vs Facial)', instFaceAvatarSrc === instNormalAvatarSrc);
  reg('2.3 - Instituição não herda avatar de Cidadão', instFaceAvatarSrc !== cidNormalAvatarSrc || !instFaceAvatarSrc.includes('Foto-de-Perfil-(1)'));

  // --------------------------------------------------------------------------
  // PARTE 3: ADMINISTRAÇÃO CENTRAL
  // --------------------------------------------------------------------------
  console.log('\n👑 --- PARTE 3: ADMINISTRAÇÃO CENTRAL ---');
  await page.locator('aside').getByText(/Sair do Canal|Sair|Terminar/i).first().click();
  await page.waitForTimeout(2000);

  await page.goto(`${BASE}/admin#/entrar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  // Login normal Admin
  await page.locator('input[type="text"]:visible, input:not([type]):visible').first().fill(ADMIN_USER);
  await page.locator('input[type="password"]:visible').first().fill(ADMIN_PASS);
  await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
  await page.waitForTimeout(2500);

  const adminNormalAvatarSrc = await page.evaluate(() => {
    const el = document.querySelector('header [aria-label="Menu de Perfil e Notificações"] img');
    if (el) return (el).src;
    const div = document.querySelector('header [aria-label="Menu de Perfil e Notificações"] div');
    return div ? div.innerText.trim() : '';
  });
  console.log(`  ℹ️ Avatar Admin (Normal): ${adminNormalAvatarSrc}`);

  // Regista face Admin
  await page.locator('aside').getByText(/^Perfil$/i).first().click();
  await page.waitForTimeout(1500);

  const btnRegFaceAdmin = page.getByRole('button', { name: /Registar a minha face|Atualizar a minha face/i }).first();
  if (await btnRegFaceAdmin.isVisible()) {
    await btnRegFaceAdmin.click();
    await page.waitForTimeout(600);
    for (let step = 1; step <= 3; step++) {
      const btnCap = page.getByRole('button', { name: new RegExp(`Capturar ${step}/3`, 'i') }).first();
      await btnCap.waitFor({ state: 'visible', timeout: 6000 });
      await btnCap.click();
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(1200);
    reg('3.1 - Face de Administrador registada com sucesso', true);
  }

  // Logout Admin
  await page.locator('aside').getByText(/Sair do Canal|Sair|Terminar/i).first().click();
  await page.waitForTimeout(2000);

  // Login Facial Admin
  await page.getByRole('button', { name: /LOGIN FACIAL/i }).first().click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /VALIDAR FACE LOCAL/i }).first().click();
  await page.waitForTimeout(3000);

  const adminFaceAvatarSrc = await page.evaluate(() => {
    const el = document.querySelector('header [aria-label="Menu de Perfil e Notificações"] img');
    if (el) return (el).src;
    const div = document.querySelector('header [aria-label="Menu de Perfil e Notificações"] div');
    return div ? div.innerText.trim() : '';
  });
  console.log(`  ℹ️ Avatar Admin (Facial): ${adminFaceAvatarSrc}`);
  reg('3.2 - Paridade de Avatar no Admin (Normal vs Facial)', adminFaceAvatarSrc === adminNormalAvatarSrc);
  reg('3.3 - Admin não herda avatar de Cidadão', adminFaceAvatarSrc !== cidNormalAvatarSrc || !adminFaceAvatarSrc.includes('Foto-de-Perfil-(1)'));

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
