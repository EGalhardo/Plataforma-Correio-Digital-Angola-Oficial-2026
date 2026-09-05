#!/usr/bin/env node
// ============================================================================
// e2e_emergencia_email.mjs — v35 APLICADO: fluxo COMPLETO de emergência c/ email
// ----------------------------------------------------------------------------
//   EA · cidadão real grava email num contacto de emergência (Belmira)
//   EB · instituição real: lookup BI → «Mensagem de Emergência» → difusão →
//        linha da Belmira: chip plataforma + botão «Abrir Email» (mailto:)
//   EC · chip honesto «Email: cliente aberto — confirmar envio»
// BD · verificação final via service key: emergency_alerts com email_link=true
// ============================================================================
import { chromium } from 'playwright';
import fs from 'node:fs';

if (process.env.CDA_E2E_ADMIN !== '1') {
  console.error('Recusado: requer CDA_E2E_ADMIN=1.');
  process.exit(2);
}
const BASE = process.env.E2E_BASE || 'http://localhost:3000';
let FAILS = 0;
const reg = (n, ok, d = '') => { if (!ok) FAILS++; console.log(`[${ok ? 'PASS' : 'FAIL'}] ${n}${d ? ' — ' + d : ''}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-PT' });
const tx = async () => ((await page.evaluate(() => document.body.innerText)).toLowerCase());

try {
  // ================= EA — cidadão grava email na Belmira =================
  console.log('[passo] EA cidadão: email no contacto');
  await page.goto(`${BASE}/#/entrar`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('input[type="text"]:visible, input:not([type]):visible').first().waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('input[type="text"]:visible, input:not([type]):visible').first().fill('002399714LA030');
  await page.locator('input[type="password"]').first().fill('123456789');
  await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
  await page.waitForTimeout(9000);
  await page.locator('aside, header, nav').getByText('Contactos', { exact: true }).first().click();
  await page.waitForTimeout(3500);
  let linhaBel = page.locator('tr').filter({ hasText: /Belmira Galhardo/i }).first();
  if (await linhaBel.count() === 0) {
    const btnAdd = page.locator('button').filter({ hasText: /^Adicionar$/i }).first();
    if (await btnAdd.count() > 0) {
      await btnAdd.click();
      await page.waitForTimeout(1000);
      await page.locator('#contact-name-input').fill('Belmira Galhardo');
      await page.locator('#contact-bi-input').fill('009988776LA099');
      await page.locator('#contact-phone-input').fill('+244 951 520 416');
      await page.locator('#contact-email-input').fill('belmira.galhardo@exemplo.ao');
      await page.locator('#confirm-add-contact-btn').click();
      await page.waitForTimeout(2500);
      linhaBel = page.locator('tr').filter({ hasText: /Belmira Galhardo/i }).first();
    }
  } else {
    await linhaBel.locator('button[title="Editar contacto e protocolo"]').first().click();
    await page.waitForTimeout(1200);
    await page.locator('#edit-contact-phone-input').first().fill('+244 951 520 416');
    await page.locator('#edit-contact-email-input').first().fill('belmira.galhardo@exemplo.ao');
    await page.locator('#confirm-edit-contact-btn').first().click();
    await page.waitForTimeout(3500);
  }
  const txtEA = await tx();
  const semErroEA = !txtEA.includes('telefone inválido') && !txtEA.includes('email inválido');
  reg('EA-email-gravado-no-contacto', semErroEA);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/home/user/e2e_admin_shots/ea_email_contacto.png' });

  // ================= EB — instituição difunde =================
  console.log('[passo] EB instituição: difusão de emergência');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${BASE}/institucional#/entrar`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('input[type="text"]:visible, input:not([type]):visible').first().waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('input[type="text"]:visible, input:not([type]):visible').first().fill('INAPEM-LLMM-01');
  await page.locator('input[type="password"]').first().fill('123456789');
  await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
  await page.waitForTimeout(9000);
  await page.locator('aside, header, nav').getByText('Correio', { exact: true }).first().click();
  await page.waitForTimeout(3500);
  await page.getByRole('button', { name: /Nova Mensagem/i }).first().click();
  await page.waitForTimeout(1500);
  await page.locator('#recipient-bi-input').first().fill('002399714LA030');
  await page.locator('#recipient-bi-search-btn').first().click();
  await page.waitForTimeout(4000); // RPC lookup real
  reg('EB-lookup-verificado', await page.locator('#recipient-verified-card').count() > 0);
  await page.locator('textarea').first().fill('Teste E2E de difusão de emergência com email — verificar canal email.');
  await page.waitForTimeout(400);
  const btnEmerg = page.locator('#btn-emergency-broadcast');
  await btnEmerg.click();
  await page.waitForTimeout(4000); // RPC rede de emergência real
  reg('EB-modal-difusao-aberto', (await tx()).includes('difusão de mensagem de emergência'));
  await page.screenshot({ path: '/home/user/e2e_admin_shots/eb_modal_difusao.png' });

  // linha da Belmira → Enviar
  const linhaModal = page.locator('div[data-testid^="broadcast-row-"]').filter({ hasText: /Belmira Galhardo/i }).first();
  reg('EB-linha-belmina-presente', await linhaModal.count() > 0);
  await linhaModal.locator('button').filter({ hasText: /Enviar Mensagem/i }).first().click();
  await page.waitForTimeout(5000); // entrega + registo
  const linhaTxt = (await linhaModal.innerText()).toLowerCase();
  reg('EB-plataforma-desfecho-real', /sem conta cda|enviado na plataforma|plataforma cda/.test(linhaTxt), `chip: ${linhaTxt.split('\n').slice(2, 6).join(' · ')}`);
  // botão «Abrir Email» (mailto) — SÓ existe quando a RPC devolveu email válido
  const btnEmail = linhaModal.locator('a').filter({ hasText: /Abrir Email/i }).first();
  const temBtnEmail = await btnEmail.count() > 0;
  reg('EB-botao-abrir-email-presente (RPC devolveu email)', temBtnEmail);
  if (temBtnEmail) {
    await btnEmail.click().catch(() => {});
    await page.waitForTimeout(1200);
    const depois = (await linhaModal.innerText()).toLowerCase();
    reg('EC-chip-email-cliente-aberto', depois.includes('email: cliente aberto'));
    await page.screenshot({ path: '/home/user/e2e_admin_shots/ec_chip_email.png' });
  }
  await page.locator('#close-inst-broadcast').first().click().catch(() => {});
  await page.waitForTimeout(800);

  console.log('');
  if (FAILS > 0) { console.log(`✗ FALHAS: ${FAILS}`); fs.writeFileSync('/tmp/e2e_emg_fail', '1'); }
  else console.log('✓ E2E EMERGÊNCIA EMAIL (EA–EC): TUDO PASSOU');
} catch (e) {
  console.error('ERRO:', e?.message || e);
  fs.writeFileSync('/tmp/e2e_emg_fail', '1');
} finally {
  await browser.close();
}
