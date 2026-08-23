#!/usr/bin/env node
// ============================================================================
// e2e_admin_modo_real_global.mjs — REGRESSÃO ANTI-SIMULAÇÃO GLOBAL (Modo Real)
// ----------------------------------------------------------------------------
// Corre SÓ com CDA_E2E_ADMIN=1 (sessão REAL de administração). Leitura apenas.
//
//   P5x · Painel: Resumo Geral com números da BASE CENTRAL (618 mensagens
//        reais; nunca 1.248.752/2.300.000/85.230/155min/12.540), atividade
//        recente real de audit_logs (sem eventos fixos de 20/05/2025) e
//        auditoria de video-atendimento com as 5 sessões reais.
//   P6x · Instituições: 18 contas institucionais reais + volume 618 real,
//        sem "+12.4%" inventado e SLA honesto.
//   P7x · Cidadãos: sem "Kilamba" hardcoded nem "99.9% DISP" fictício.
//   P8x · Equipa: agentes REAIS da base central listados (ADMIN-0001) —
//        nunca "nenhum membro" com a base a ter admins.
//   P9x · IA: painel abre; contadores vêm da telemetria real (ia_conversas_log)
//        ou ficam honestamente em «—»/0.
// ============================================================================
import { chromium } from 'playwright';
import fs from 'node:fs';

if (process.env.CDA_E2E_ADMIN !== '1') {
  console.error('Recusado: requer sessão real. Corra com CDA_E2E_ADMIN=1 (dev server ativo).');
  process.exit(2);
}

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const ADMIN = process.env.CDA_E2E_ADMIN_USER || 'ADMIN-0001';
const ADMIN_PASS = process.env.CDA_E2E_ADMIN_PASS || '123456789';
const SHOTS = process.env.SHOTS_DIR || '/home/user/e2e_admin_shots';
fs.mkdirSync(SHOTS, { recursive: true });

let FAILS = 0;
const reg = (nome, ok, detalhe = '') => {
  if (!ok) FAILS++;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-PT' });
const tx = async () => ((await page.evaluate(() => document.body.innerText)).toLowerCase());

const irPara = async (item) => {
  await page.locator('aside').getByText(item, { exact: true }).first().click();
  await page.waitForTimeout(2600);
};

const rolarFundo = async () => {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1400);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
};

try {
  // ============ LOGIN (sessão real) ============
  console.log('[passo] login...');
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('heading', { name: 'LOGIN' }).waitFor({ state: 'visible', timeout: 20000 });
  await page.getByRole('button', { name: 'Admin', exact: true }).first().click();
  await page.waitForTimeout(600);
  await page.locator('input[type="text"]:visible, input:not([type]):visible').first().fill(ADMIN);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
  await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
  await page.waitForTimeout(9000);
  reg('login admin real', (await tx()).includes('administração central'));

  // ============ P5x — PAINEL ============
  console.log('[passo] P5x Painel');
  await page.locator('aside').getByText('Painel', { exact: true }).first().click();
  await page.waitForTimeout(5000);
  await rolarFundo();
  const txtPainel = await tx();
  reg('P5x-painel-total-real (618 mensagens da BD)', /\b618\b/.test(txtPainel));
  reg('P5x-painel-sem-milhoes-ficticios', !txtPainel.includes('1.248.752') && !txtPainel.includes('2.300.000') && !txtPainel.includes('85.230') && !txtPainel.includes('12.540'));
  reg('P5x-painel-sem-155min-inventado', !txtPainel.includes('155 min'));
  reg('P5x-painel-video-real (auditoria de videoatendimento)', txtPainel.includes('sessões registadas'));
  await page.screenshot({ path: `${SHOTS}/p5x_painel_resumo_real.png`, fullPage: false });

  // Atividade recente real (secção dobrada)
  await page.locator('button').filter({ hasText: /Mostrar Atividade Completa/i }).first().click();
  await page.waitForTimeout(1800);
  const txtAtiv = await tx();
  reg('P5x-atividade-real (sem eventos fixos 20/05/2025)', !txtAtiv.includes('20/05/2025'));
  await page.screenshot({ path: `${SHOTS}/p5x_painel_atividade_real.png`, fullPage: false });

  // ============ P6x — INSTITUIÇÕES ============
  console.log('[passo] P6x Instituições');
  await irPara('Instituições');
  const txtInst = await tx();
  reg('P6x-inst-18-reais (18 contas institucionais)', /\b18\b/.test(txtInst));
  reg('P6x-inst-volume-618-real', /\b618\b/.test(txtInst));
  reg('P6x-inst-sem-12.4-inventado', !txtInst.includes('+12.4%'));
  await page.screenshot({ path: `${SHOTS}/p6x_instituicoes_reais.png`, fullPage: false });

  // ============ P7x — CIDADÃOS ============
  console.log('[passo] P7x Cidadãos');
  await irPara('Cidadãos');
  const txtCid = await tx();
  reg('P7x-cidadao-real-na-tabela (Edlasio/BI real)', txtCid.includes('002399714la030'));
  reg('P7x-sem-kilamba-hardcoded', !txtCid.includes('kilamba'));
  reg('P7x-sem-99.9-ficticio', !txtCid.includes('99.9%'));
  await page.screenshot({ path: `${SHOTS}/p7x_cidadaos_reais.png`, fullPage: false });

  // ============ P8x — EQUIPA ============
  console.log('[passo] P8x Equipa');
  await irPara('Equipa');
  await page.waitForTimeout(2000);
  const txtEq = await tx();
  reg('P8x-equipa-admin-real (ADMIN-0001 da base central)', txtEq.includes('admin-0001'));
  reg('P8x-equipa-nao-vazia (base tem admins)', !txtEq.includes('nenhum membro da equipa localizado'));
  await page.screenshot({ path: `${SHOTS}/p8x_equipa_reais.png`, fullPage: false });

  // ============ P9x — IA ============
  console.log('[passo] P9x IA');
  await irPara('IA');
  await page.waitForTimeout(2500);
  const txtIa = await tx();
  reg('P9x-ia-aberta', txtIa.includes('assistência ia nacional'));
  reg('P9x-ia-sem-acuracia-demo (98.8/99.4 ausentes)', !txtIa.includes('98.8') && !txtIa.includes('99.4'));
  await page.screenshot({ path: `${SHOTS}/p9x_ia_real.png`, fullPage: false });

  console.log('');
  if (FAILS > 0) {
    console.log(`✗ FALHAS: ${FAILS}`);
    process.exit(1);
  }
  console.log('✓ REGRESSÃO ANTI-SIMULAÇÃO GLOBAL (P5x–P9x): TUDO PASSOU');
} catch (e) {
  console.error('ERRO:', e?.message || e);
  process.exit(1);
} finally {
  await browser.close();
}
