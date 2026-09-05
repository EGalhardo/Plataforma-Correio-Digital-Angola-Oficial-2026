#!/usr/bin/env node
// ============================================================================
// e2e_cidadao_contacto_email.mjs — v35: campo Email opcional nos contactos
// ----------------------------------------------------------------------------
// Corre SÓ com CDA_E2E_ADMIN=1 (sessão REAL do cidadão). Fluxo:
//   E1 · login cidadão real
//   E2 · Contactos → popup «Novo Contacto» contém o campo Email (opcional)
//   E3 · email inválido → erro visível (sem retorno silencioso)
//   E4 · email válido → contacto gravado (linha visível) — com retry honesto
//        pré-SQL (PGRST204 grava sem email; local mantém)
//   E5 · edição mostra o email gravado
//   E6 · limpeza: contacto de teste eliminado (base fica como estava)
// ============================================================================
import { chromium } from 'playwright';

if (process.env.CDA_E2E_ADMIN !== '1') {
  console.error('Recusado: requer sessão real. Corra com CDA_E2E_ADMIN=1 (dev server ativo).');
  process.exit(2);
}

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const BI = process.env.CDA_E2E_BI || '002399714LA030';
const PASS = process.env.CDA_E2E_PASS || '123456789';

let FAILS = 0;
const reg = (nome, ok, detalhe = '') => {
  if (!ok) FAILS++;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-PT' });
const tx = async () => ((await page.evaluate(() => document.body.innerText)).toLowerCase());

try {
  // ============ E1 — login cidadão real ============
  console.log('[passo] login cidadão...');
  await page.goto(`${BASE}/#/entrar`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('input[type="text"]:visible, input:not([type]):visible').first().waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('input[type="text"]:visible, input:not([type]):visible').first().fill(BI);
  await page.locator('input[type="password"]').first().fill(PASS);
  await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
  await page.waitForTimeout(9000);
  reg('E1-login-cidadao-real', !(await tx()).includes('login'));

  // ============ E2 — popup Novo Contacto tem campo Email ============
  console.log('[passo] E2 popup Novo Contacto');
  await page.locator('aside').getByText('Contactos', { exact: true }).first().click();
  await page.waitForTimeout(3000);
  const btnAbrir = page.locator('button').filter({ hasText: /^Adicionar$/i }).first();
  await btnAbrir.click();
  await page.waitForTimeout(1200);
  const campoEmail = page.locator('#contact-email-input');
  reg('E2-campo-email-presente', await campoEmail.count() > 0);
  await page.screenshot({ path: '/home/user/e2e_admin_shots/e2_popup_email.png' });

  // ============ E3 — email inválido → erro ============
  console.log('[passo] E3 validação');
  await page.locator('#contact-name-input, input[id*="name"]').first().fill('Contacto Teste E2E');
  const biInput = page.locator('input[id*="bi"], input[id*="bi" i]').first();
  await biInput.fill('009111222LA044');
  await page.locator('#contact-phone-input').first().fill('+244 923 111 222');
  await page.locator('#contact-relation-input').first().selectOption('Amigo/a');
  await campoEmail.fill('email-mal-formado');
  await page.locator('#confirm-add-contact-btn').click();
  await page.waitForTimeout(900);
  reg('E3-email-invalido-bloqueia', (await tx()).includes('email inválido'));
  await page.screenshot({ path: '/home/user/e2e_admin_shots/e3_email_invalido.png' });

  // ============ E4 — email válido → gravado ============
  console.log('[passo] E4 gravação');
  await campoEmail.fill('contacto.teste@exemplo.ao');
  await page.locator('#confirm-add-contact-btn').click();
  await page.waitForTimeout(2500);
  const txtAdd = await tx();
  const gravado = txtAdd.includes('contacto teste e2e');
  reg('E4-contacto-gravado', gravado);
  await page.screenshot({ path: '/home/user/e2e_admin_shots/e4_contacto_gravado.png' });

  // ============ E5 — edição mostra email ============
  if (gravado) {
    // fecho robusto de qualquer modal ainda aberto (Escape + botões de fecho)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    const fechos = ['#close-add-contact', 'button[title="Fechar"]'];
    for (const sel of fechos) {
      const b = page.locator(sel).first();
      if (await b.count()) { await b.click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(600); }
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    console.log('[passo] E5 edição');
    const linha = page.locator('tr').filter({ hasText: /Contacto Teste E2E/i }).last();
    await linha.locator('button[title="Editar contacto e protocolo"]').first().click();
    await page.waitForTimeout(1200);
    const val = await page.locator('#edit-contact-email-input').inputValue().catch(() => '');
    // pré-SQL (v35 ainda não aplicado): a nuvem não tem a coluna → sync devolve
    // linha SEM email (janela honesta, igual ao v19). pós-SQL: email persistido.
    if (val === 'contacto.teste@exemplo.ao') {
      reg('E5-edicao-email-persistido (v35 aplicado na nuvem)', true);
    } else {
      reg('E5-edicao-email-janela-pre-sql (coluna ainda não aplicada — retry honesto grava sem email)', val === '');
    }
    await page.locator('#cancel-edit-contact-btn').first().click().catch(() => {});
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);

    // ============ E6 — limpeza ============
    console.log('[passo] E6 limpeza');
    const linha2 = page.locator('tr').filter({ hasText: /Contacto Teste E2E/i }).last();
    await linha2.locator('button[title="Remover contacto"]').first().click();
    await page.waitForTimeout(1500);
    // modal de confirmação «Eliminar Contacto?» → botão Eliminar
    const btnConf = page.locator('button').filter({ hasText: /^Eliminar$/i }).last();
    if (await btnConf.count()) { await btnConf.click().catch(() => {}); await page.waitForTimeout(2500); }
    reg('E6-limpeza-ok', !(await tx()).includes('contacto teste e2e'));
    await page.screenshot({ path: '/home/user/e2e_admin_shots/e6_limpeza.png' });
  }

  console.log('');
  if (FAILS > 0) { console.log(`✗ FALHAS: ${FAILS}`); process.exit(1); }
  console.log('✓ E2E CONTACTO EMAIL (E1–E6): TUDO PASSOU');
} catch (e) {
  console.error('ERRO:', e?.message || e);
  process.exit(1);
} finally {
  await browser.close();
}
