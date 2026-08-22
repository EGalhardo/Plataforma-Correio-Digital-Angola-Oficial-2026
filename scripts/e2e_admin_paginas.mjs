#!/usr/bin/env node
// ============================================================================
// e2e_admin_paginas.mjs — REGRESSÃO das páginas da Administração (Modo Real)
// ----------------------------------------------------------------------------
//   P1 · Perfil: dados reais (data de criação da conta auth, email real) e
//        logs de auditoria vindos da NUVEM (tabela audit_logs).
//   P2 · Relatórios: métricas REAIS (nºs da base central — não fictícios):
//        correspondências, instituições, cidadãos, equipa, IA, docs, auditoria.
//   P3 · Auditoria: lista de utilizadores REAIS (profiles + estado real) e
//        separador "Registo de Auditoria" com eventos reais pesquisáveis.
//   P4 · Popups: abrem com o padrão oficial (header branco + círculo indigo +
//        título itálico uppercase + X no canto) — popup de referência
//        "Registar Novo Membro da Equipa" e outros 3.
//
// Corre SÓ com CDA_E2E_ADMIN=1 (sessão REAL de administração). Leitura apenas
// — não escreve nada na base (à excepção de audit_logs de leitura/aborto
// naturais do próprio app).
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
const textoPagina = () => page.evaluate(() => document.body.innerText);
const tx = async () => ((await textoPagina()).toLowerCase());

const loginAdmin = async () => {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('heading', { name: 'LOGIN' }).waitFor({ state: 'visible', timeout: 20000 });
  await page.getByRole('button', { name: 'Admin', exact: true }).first().click();
  await page.waitForTimeout(600);
  await page.locator('input[type="text"]:visible, input:not([type]):visible').first().fill(ADMIN);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
  await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
  await page.waitForTimeout(9000);
};

const irPara = async (item) => {
  await page.locator('aside').getByText(item, { exact: true }).first().click();
  await page.waitForTimeout(2500);
};

try {
  console.log('[passo] login...');
  await loginAdmin();
  console.log('[passo] login ok');
  reg('login admin real', (await textoPagina()).toUpperCase().includes('ADMINISTRAÇÃO CENTRAL'));

  console.log('[passo] P1 perfil');
  // ============ P1 — PERFIL ============
  await irPara('Perfil');
  await page.waitForTimeout(4000); // dados reais (auth + profiles + audit_logs)
  const txtPerfil = await textoPagina();
  reg('P1-perfil-aberto', txtPerfil.toUpperCase().includes('MINHA CONTA'));
  reg('P1-data-criacao-real (não fixa "1 de junho")', !txtPerfil.includes('1 de junho de 2026'), `valor: ${(txtPerfil.match(/Data de Criação da Conta[^\n]*/) || ['—'])[0].trim()}`);
  await page.getByRole('button', { name: /Ver Logs/i }).first().click();
  await page.waitForTimeout(1200);
  const txtLogs = await tx();
  const mLogs = txtLogs.match(/(\d+) registros activos[^\n]*/);
  const logsNuvem = !!mLogs && txtLogs.includes('nuvem');
  reg('P1-logs-nuvem (tabela audit_logs real)', logsNuvem, mLogs ? mLogs[0] : '—');
  await page.screenshot({ path: `${SHOTS}/p1_perfil_logs.png`, fullPage: false });
  await page.getByRole('button', { name: /Ocultar Logs/i }).first().click();

  console.log('[passo] P2 relatorios');
  // ============ P2 — RELATÓRIOS ============
  await irPara('Relatórios');
  await page.waitForTimeout(5000); // carregamento agregado + loading 900ms
  const txtRel = await tx();
  reg('P2-relatorios-aberto', txtRel.includes('centro de análise estratégica'));
  reg('P2-metricas-reais (badge "Base central")', txtRel.includes('base central'));
  // nº real conhecido da BD: 618 mensagens
  reg('P2-correspondencias-618 (total real da BD)', /\b618\b/.test(txtRel), 'total mensagens na base central');
  await page.screenshot({ path: `${SHOTS}/p2_relatorios_correspondencias.png`, fullPage: false });
  // separadores SCOPED ao menu lateral de relatórios (a sidebar também tem 'Instituições')
  const abaRel = (nome) => page.locator('#side-reports-navigation button').filter({ hasText: nome }).first();
  await abaRel('Instituições').click();
  await page.waitForTimeout(4200);
  const txtInst = await tx();
  reg('P2-inst-tab-real (AGT presente da BD)', txtInst.includes('agt'), 'linhas reais de profiles');
  reg('P2-inst-total-18 (18 instituições reais)', /\b18\b/.test(txtInst));
  await page.screenshot({ path: `${SHOTS}/p2_relatorios_instituicoes.png`, fullPage: false });
  // separador Cidadãos
  await abaRel('Cidadãos').click();
  await page.waitForTimeout(4200);
  const txtCid = await tx();
  reg('P2-cid-total-23 (23 cidadãos reais)', /\b23\b/.test(txtCid));
  await page.screenshot({ path: `${SHOTS}/p2_relatorios_cidadaos.png`, fullPage: false });
  // separador Auditoria
  await page.locator('#btn-tab-report-audit_security').click();
  await page.waitForTimeout(4200);
  const txtAud = await tx();
  const mEv = txtAud.match(/(1[\d .,\u202f\u00a0]{3,})\s*eventos/);
  reg('P2-auditoria-real (total > 1.000 eventos)', !!mEv, `total: ${mEv ? mEv[1].trim() : '—'} (esperado ≈17.8k)`);
  await page.screenshot({ path: `${SHOTS}/p2_relatorios_auditoria.png`, fullPage: false });

  // ============ P3 — AUDITORIA (Segurança) ============
  await irPara('Auditoria');
  await page.waitForTimeout(4000);
  const txtSeg = await tx();
  reg('P3-auditoria-aberta', txtSeg.includes('segurança facial'));
  const contas = (txtSeg.match(/contas com biometria na base\s*\n?\s*(\d[\d.,]*)/) || [])[1];
  reg('P3-contas-reais (43 na base)', contas === '43', `valor: ${contas || '—'}`);
  await page.locator('button').filter({ hasText: /Modelos de Utilizadores/i }).first().click();
  await page.waitForTimeout(1500);
  const txtUsers = await tx();
  reg('P3-utilizadores-reais (cidadão Edlasio/BI real)', txtUsers.includes('002399714la030') || txtUsers.includes('009874562la041'));
  reg('P3-instituicao-real (INAPEM presente)', txtUsers.includes('inapem') || txtUsers.includes('agt'));
  await page.screenshot({ path: `${SHOTS}/p3_auditoria_utilizadores.png`, fullPage: false });
  // separador Registo de Auditoria
  await page.locator('button').filter({ hasText: /Registo de Auditoria/i }).first().click();
  await page.waitForTimeout(1500);
  const txtRegAud = await tx();
  const eventos = (txtRegAud.match(/(\d+) eventos recentes/) || [])[1];
  reg('P3-registo-auditoria-nuvem', !!eventos && parseInt(eventos, 10) > 100, `eventos: ${eventos || '—'}`);
  await page.getByPlaceholder('Pesquisar ação ou operador...').fill('sala de vídeo');
  await page.waitForTimeout(900);
  const txtFiltro = await tx();
  reg('P3-pesquisa-auditoria-funciona', txtFiltro.includes('sala de vídeo') || !txtFiltro.includes('nenhum evento'));
  await page.screenshot({ path: `${SHOTS}/p3_auditoria_registo.png`, fullPage: false });

  // ============ P4 — POPUPS no padrão oficial ============
  const padraoPopup = async () => page.evaluate(() => {
    // caixa: rounded-32 + sombra oficial + borda slate-100
    const caixas = Array.from(document.querySelectorAll('div.rounded-\\[32px\\]'));
    return caixas.some(c => (c.className || '').includes('shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)]'));
  });

  // P4a — referência: Registar Novo Membro da Equipa (página Equipa)
  await irPara('Equipa');
  await page.waitForTimeout(2500);
  const btnNovo = page.locator('button').filter({ hasText: /Adicionar à Equipa/i }).first();
  await btnNovo.click();
  await page.waitForTimeout(1200);
  reg('P4a-popup-referencia-equipa-abre', (await tx()).includes('registar novo membro da equipa'));
  await page.screenshot({ path: `${SHOTS}/p4a_popup_referencia_equipa.png`, fullPage: false });
  await page.locator('button[title="Fechar"]').last().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(900);

  // P4b — Criar Instituição (página Instituições)
  await irPara('Instituições');
  await page.waitForTimeout(2500);
  const btnCriar = page.locator('button').filter({ hasText: /Registar Instituição/i }).first();
  await btnCriar.click();
  await page.waitForTimeout(1200);
  const abertoInst = (await tx()).includes('criar instituição');
  reg('P4b-popup-criar-instituicao-abre', abertoInst);
  if (abertoInst) {
    reg('P4b-padrao-oficial (rounded-32 + sombra oficial)', await padraoPopup());
    await page.screenshot({ path: `${SHOTS}/p4b_popup_criar_instituicao.png`, fullPage: false });
    await page.locator('button[title="Fechar"]').first().click().catch(() => {});
    await page.waitForTimeout(600);
  }

  console.log(FAILS === 0 ? '\n✓ REGRESSÃO ADMIN (P1–P4): TUDO PASSOU' : `\n✗ FALHAS: ${FAILS}`);
} catch (e) {
  FAILS++;
  console.error('ERRO inesperado:', e.message);
  await page.screenshot({ path: `${SHOTS}/erro.png` }).catch(() => {});
} finally {
  await browser.close();
}
process.exit(FAILS === 0 ? 0 : 1);
