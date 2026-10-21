#!/usr/bin/env node
// ============================================================================
// e2e_gov_dashboard_indicador_verde.mjs — Homologação do Painel Admin & Indicador Verde
// ============================================================================
import { chromium } from 'playwright';
import fs from 'node:fs';

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

try {
  console.log('[passo] Login no Portal de Administração Central...');
  await page.goto(`${BASE}/admin#/entrar`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('input[type="text"]:visible, input:not([type]):visible').first().fill(ADMIN);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
  await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
  await page.waitForTimeout(5000);

  const txtLogin = await tx();
  reg('01 - Login de Administrador com Sucesso', txtLogin.includes('administração central') || txtLogin.includes('painel nacional'));

  console.log('[passo] Navegação para a página Painel...');
  await page.locator('aside').getByText('Painel', { exact: true }).first().click();
  await page.waitForTimeout(3000);

  const header = page.locator('#gov-header');
  await header.waitFor({ state: 'visible', timeout: 10000 });
  reg('02 - Cabeçalho do Painel Carregado (#gov-header visível)', await header.isVisible());

  // Verificar título
  const titleText = await header.locator('h1').innerText();
  reg('03 - Título Oficial Correto', /Painel Nacional de Correspondência/i.test(titleText));

  // Verificar o texto do subtítulo
  const subTitleText = await header.locator('p').innerText();
  const subTitleLower = subTitleText.toLowerCase();
  reg('04 - Subtítulo Oficial Correto', subTitleLower.includes('correio digital angola') && subTitleLower.includes('administração central'), subTitleText);

  // Verificar o indicador de status (bullet)
  const indicator = header.locator('p span.rounded-full').first();
  const indicatorClasses = await indicator.getAttribute('class');
  console.log('[info] Classes do Indicador:', indicatorClasses);

  const isGreen = indicatorClasses.includes('bg-emerald-500');
  const isRed = indicatorClasses.includes('bg-red-600') || indicatorClasses.includes('bg-red-500');
  const hasPulse = indicatorClasses.includes('animate-pulse');

  reg('05 - Indicador possui classe de cor verde (bg-emerald-500)', isGreen, indicatorClasses);
  reg('06 - Indicador NÃO possui classe de cor vermelha (bg-red-*)', !isRed);
  reg('07 - Indicador possui animação de pulsação ativa (animate-pulse)', hasPulse);

  // Verificar badge de monitoramento ativo
  const monBadge = header.locator('div.rounded-full').filter({ hasText: /Monitoramento Ativo|Monitorização Ativa/i }).first();
  const hasMonBadge = await monBadge.count() > 0;
  reg('08 - Badge de Monitoramento Central Ativo presente', hasMonBadge);

  // Verificar ID Digital do Gestor e Módulos do Painel
  const txtCorpo = await tx();
  reg('09 - ID Digital do Gestor renderizado', txtCorpo.includes('id digital') || txtCorpo.includes('administrador central') || txtCorpo.includes('admin-0001'));
  reg('10 - Métricas do Painel renderizadas', txtCorpo.includes('resumo geral') || txtCorpo.includes('correspondências') || txtCorpo.includes('total'));
  reg('11 - Auditoria de Vídeo-atendimento presente', txtCorpo.includes('vídeo') || txtCorpo.includes('video') || txtCorpo.includes('sessões') || txtCorpo.includes('atendimento'));

  // Capturar screenshot
  const shotPath = `${SHOTS}/gov_dashboard_indicador_verde.png`;
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log(`[screenshot] Capturado em: ${shotPath}`);

} catch (err) {
  console.error('[ERRO FATAL]', err);
  FAILS++;
} finally {
  await browser.close();
}

console.log('\n========================================');
console.log(`FALHAS TOTAIS: ${FAILS}`);
console.log('========================================');
process.exit(FAILS > 0 ? 1 : 0);
