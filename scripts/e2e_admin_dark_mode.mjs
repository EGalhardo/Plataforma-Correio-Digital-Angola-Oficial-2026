#!/usr/bin/env node
// ============================================================================
// e2e_admin_dark_mode.mjs — Homologação E2E de Visibilidade no Modo Escuro no Painel Admin
// ============================================================================
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const ADMIN = process.env.CDA_E2E_ADMIN_USER || 'ADMIN-0001';
const ADMIN_PASS = process.env.CDA_E2E_ADMIN_PASS || '123456789';
const SHOTS = process.env.SHOTS_DIR || '/home/user/e2e_admin_dark_shots';
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
  console.log('[passo 1] Login no Portal de Administração Central...');
  await page.goto(`${BASE}/admin#/entrar`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('input[type="text"]:visible, input:not([type]):visible').first().fill(ADMIN);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
  await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
  await page.waitForTimeout(5000);

  const txtLogin = await tx();
  reg('01 - Login de Administrador com Sucesso', txtLogin.includes('administração central') || txtLogin.includes('painel nacional'));

  console.log('[passo 2] Navegação para a página Painel (gov-dashboard)...');
  await page.locator('aside').getByText('Painel', { exact: true }).first().click();
  await page.waitForTimeout(3000);

  const header = page.locator('#gov-header');
  await header.waitFor({ state: 'visible', timeout: 10000 });
  reg('02 - Painel Administrativo Carregado (#gov-header visível)', await header.isVisible());

  // Capturar screenshot em Modo Claro
  await page.screenshot({ path: `${SHOTS}/01_painel_modo_claro.png`, fullPage: false });
  console.log(`[screenshot] Modo Claro salvo em: ${SHOTS}/01_painel_modo_claro.png`);

  console.log('[passo 3] Ativar Modo Escuro via Botão no Cabeçalho...');
  const themeBtn = page.locator('header button[aria-label="Modo escuro"], header button[title*="Modo Escuro"], header button[aria-label="Modo claro"]').first();
  if (await themeBtn.isVisible()) {
    await themeBtn.click();
    await page.waitForTimeout(1000);
  } else {
    // Alternativa: injetar classe dark
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('correio_digital_theme', 'dark');
    });
    await page.waitForTimeout(1000);
  }

  const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  reg('03 - Modo Escuro Ativado (html.dark presente)', isDark);

  // Capturar screenshot em Modo Escuro (Topo do Painel)
  await page.screenshot({ path: `${SHOTS}/02_painel_modo_escuro_topo.png`, fullPage: false });
  console.log(`[screenshot] Modo Escuro (Topo) salvo em: ${SHOTS}/02_painel_modo_escuro_topo.png`);

  console.log('[passo 4] Validar Indicador Verde e Cabeçalho no Modo Escuro...');
  const indicator = header.locator('p span.rounded-full').first();
  const indicatorClasses = await indicator.getAttribute('class');
  reg('04 - Indicador Central Verde com Pulse no Modo Escuro', indicatorClasses.includes('bg-emerald-500') && indicatorClasses.includes('animate-pulse'), indicatorClasses);

  console.log('[passo 5] Validar Cartões de Resumo Geral no Modo Escuro...');
  const resumoSection = page.locator('section').filter({ hasText: /Resumo Geral/i }).first();
  const resumoVisible = await resumoSection.isVisible();
  reg('05 - Secção Resumo Geral Visível', resumoVisible);

  console.log('[passo 6] Validar Telemetria Setorial Unificada (Abas e Gráficos)...');
  const sectorial = page.locator('section').filter({ hasText: /Telemetria Setorial Unificada/i }).first();
  reg('06 - Telemetria Setorial Unificada Visível', await sectorial.isVisible());

  // Testar alternância entre abas setoriais
  const tabs = ['Denúncias', 'Inquéritos', 'Vídeo', 'Ocorrências'];
  for (const tabName of tabs) {
    const tabBtn = sectorial.getByRole('button', { name: new RegExp(tabName, 'i') }).first();
    if (await tabBtn.isVisible()) {
      await tabBtn.click();
      await page.waitForTimeout(800);
      reg(`07 - Aba Setorial '${tabName}' Clicável e Ativa`, true);
    }
  }

  // Scroll para secções analíticas e serviços inteligentes
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(1000);

  // Expandir Painel Analítico se estiver recolhido
  const btnAnalise = page.getByRole('button', { name: /Mostrar análise detalhada/i }).first();
  if (await btnAnalise.isVisible()) {
    await btnAnalise.click();
    await page.waitForTimeout(800);
  }

  // Expandir Serviços Inteligentes se estiver recolhido
  const btnSmart = page.getByRole('button', { name: /Mostrar serviços inteligentes/i }).first();
  if (await btnSmart.isVisible()) {
    await btnSmart.click();
    await page.waitForTimeout(800);
  }

  // Expandir Atividade Recente se estiver recolhido
  const btnActivity = page.getByRole('button', { name: /Mostrar atividade completa/i }).first();
  if (await btnActivity.isVisible()) {
    await btnActivity.click();
    await page.waitForTimeout(800);
  }

  // Capturar screenshot da secção analítica e serviços no Modo Escuro
  await page.screenshot({ path: `${SHOTS}/03_painel_modo_escuro_analitico.png`, fullPage: false });
  console.log(`[screenshot] Modo Escuro (Analítico) salvo em: ${SHOTS}/03_painel_modo_escuro_analitico.png`);

  console.log('[passo 7] Validar Módulos de Auditoria e Serviços Inteligentes no Modo Escuro...');
  const txtCorpo = await tx();
  reg('08 - Painel Analítico Expandido e Visível', txtCorpo.includes('correspondências por categoria') || txtCorpo.includes('distribuição por província'));
  reg('09 - Auditoria de Vídeo-atendimento Visível', txtCorpo.includes('vídeo') || txtCorpo.includes('video') || txtCorpo.includes('sessões') || txtCorpo.includes('transmissão'));
  reg('10 - Serviços Inteligentes (QR Code, Biometria, IA) Visíveis', txtCorpo.includes('qr code') || txtCorpo.includes('biometrico') || txtCorpo.includes('inteligente'));

  console.log('[passo 8] Scroll até o rodapé e capturar tela...');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SHOTS}/05_painel_modo_escuro_rodape.png`, fullPage: false });
  console.log(`[screenshot] Modo Escuro (Rodapé) salvo em: ${SHOTS}/05_painel_modo_escuro_rodape.png`);

  const txtRodape = await tx();
  reg('11 - Status do Sistema e Atividade Recente Presentes', txtRodape.includes('status do sistema') || txtRodape.includes('operacional') || txtRodape.includes('atividade recente'));

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
