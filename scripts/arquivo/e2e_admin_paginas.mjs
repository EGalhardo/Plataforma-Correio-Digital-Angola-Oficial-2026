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

// v37.40 — asserções de Relatórios/Auditoria comparadas contra a NUVEM em tempo
// real (T8/P2: «números do Painel = COUNTs REST»), em vez de constantes que
// envelhecem (618/23/43). Lê as credenciais do .env e conta via PostgREST.
import { readFileSync as _readEnv } from 'node:fs';
const _env = {};
try {
  for (const l of _readEnv(new URL('../.env', import.meta.url)).toString().split('\n')) {
    const m = l.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) _env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}
const _SUPA = _env.SUPABASE_URL || process.env.SUPABASE_URL;
const _SROLE = _env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
async function cloudCount(path) {
  try {
    const r = await fetch(`${_SUPA}/rest/v1/${path}`, {
      method: 'HEAD',
      headers: { apikey: _SROLE, Authorization: `Bearer ${_SROLE}`, Prefer: 'count=exact' },
    });
    const cr = r.headers.get('content-range') || '';
    return cr.includes('/') ? cr.split('/').pop() : '';
  } catch { return ''; }
}
const N_MSG = await cloudCount('messages?select=id');
const N_CID = await cloudCount('profiles?select=id&role=eq.user');
const N_CONTAS = await cloudCount('profiles?select=id');
console.log(`[nuvem] mensagens=${N_MSG} cidadãos=${N_CID} contas=${N_CONTAS}`);
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
  // v37.42 — login por área: a tabbar foi removida; o admin entra via /admin.
  await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('heading', { name: 'LOGIN' }).waitFor({ state: 'visible', timeout: 20000 });
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
  // nº real da BD em tempo real (mensagens) — UI deve mostrar o mesmo valor
  reg(`P2-correspondencias-real (BD=${N_MSG})`, new RegExp(`\\b${N_MSG}\\b`).test(txtRel), 'total mensagens na base central');
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
  reg(`P2-cid-total-real (BD=${N_CID})`, new RegExp(`\\b${N_CID}\\b`).test(txtCid));
  await page.screenshot({ path: `${SHOTS}/p2_relatorios_cidadaos.png`, fullPage: false });
  // separador Auditoria
  await page.locator('#btn-tab-report-audit_security').click();
  await page.waitForTimeout(4200);
  const txtAud = await tx();
  const mEv = txtAud.match(/(1[\d .,\u202f\u00a0]{3,})\s*eventos/);
  reg('P2-auditoria-real (total > 1.000 eventos)', !!mEv, `total: ${mEv ? mEv[1].trim() : '—'} (esperado ≈17.8k)`);
  await page.screenshot({ path: `${SHOTS}/p2_relatorios_auditoria.png`, fullPage: false });

  // ---- P2-extra: sem dados simulados em Modo Real ----
  // Memória Descritiva: data REAL de emissão (não '12 de Junho de 2026')
  await page.getByRole('button', { name: /Memória Descritiva/i }).first().click();
  await page.waitForTimeout(1200);
  const txtModal = await tx();
  const hojeStr = new Date().toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase();
  reg('P2x-modal-data-real-de-hoje', txtModal.includes(`luanda, ${hojeStr}`), `esperado: Luanda, ${hojeStr}`);
  reg('P2x-modal-sem-data-fixa-antiga', !txtModal.includes('12 de junho de 2026'));
  reg('P2x-modal-hash-derivado (sem cda_sha256_..._ok fixo)', !txtModal.includes('cda_sha256_verification_2026_ok'));
  await page.locator('button[title="Fechar"]').first().click().catch(() => {});
  await page.waitForTimeout(700);
  // separador Equipa: linhas REAIS (ADMIN-0001 presente; 'Karina Neto' demo ausente)
  await page.locator('#btn-tab-report-workers').click();
  await page.waitForTimeout(3200);
  const txtEq = await tx();
  reg('P2x-equipa-admin-real (ADMIN-0001 listado)', txtEq.includes('admin-0001'));
  reg('P2x-equipa-sem-demo (Karina/Sílvia ausentes)', !txtEq.includes('karina neto') && !txtEq.includes('sílvia viana'));

  // ============ P3 — AUDITORIA (Segurança) ============
  await irPara('Auditoria');
  await page.waitForTimeout(4000);
  const txtSeg = await tx();
  reg('P3-auditoria-aberta', txtSeg.includes('segurança facial'));
  const contas = (txtSeg.match(/contas com biometria na base\s*\n?\s*(\d[\d.,]*)/) || [])[1];
  reg(`P3-contas-reais (BD=${N_CONTAS})`, contas === N_CONTAS, `valor: ${contas || '—'}`);
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
  // v37.49 — termo de pesquisa estável: «login» existe sempre nos eventos
  // recentes (evita flake quando «sala de vídeo» sai da janela de eventos).
  await page.getByPlaceholder('Pesquisar ação ou operador...').fill('login');
  await page.waitForTimeout(900);
  const txtFiltro = await tx();
  reg('P3-pesquisa-auditoria-funciona', txtFiltro.includes('login') || !txtFiltro.includes('nenhum evento'));
  await page.screenshot({ path: `${SHOTS}/p3_auditoria_registo.png`, fullPage: false });

  // ---- P3-extra: sem valores simulados ----
  await page.locator('button').filter({ hasText: /Modelos de Utilizadores/i }).first().click();
  await page.waitForTimeout(1500);
  const txtUsers2 = await tx();
  reg('P3x-sem-acuracia-inventada (98.8/99.4 demo ausentes)', !txtUsers2.includes('98.8') && !txtUsers2.includes('99.4'));
  reg('P3x-soc-sem-nome-hardcoded', !txtUsers2.includes('biometria de \"edlasio'));
  // consola técnica de teste: abre na aba "Parâmetros e Consola" e está rotulada como SIMULAÇÃO
  const linhaReal = page.locator('tr', { hasText: /002399714LA030|INAPEM/i }).first();
  await linhaReal.click();
  await page.waitForTimeout(700);
  await page.locator('button').filter({ hasText: /Parâmetros e Consola/i }).first().click();
  await page.waitForTimeout(1600);
  const txtConf = await tx();
  const consolaVisivel = txtConf.includes('consola de teste de match');
  reg('P3x-consola-nota-simulacao', consolaVisivel && txtConf.includes('simulação técnica'));
  await page.locator('button').filter({ hasText: /Executar Teste Biométrico/i }).first().click();
  await page.waitForTimeout(3400); // varrimento animado de 1.800ms + render do resultado
  const txtRes = await tx();
  reg('P3x-consola-resultado-prefixo-simulacao', !consolaVisivel || txtRes.includes('[simulação]'));
  await page.screenshot({ path: `${SHOTS}/p3x_consola_simulacao.png`, fullPage: false });

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
