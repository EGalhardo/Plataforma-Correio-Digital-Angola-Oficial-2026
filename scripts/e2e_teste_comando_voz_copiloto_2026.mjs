/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Suite de Teste E2E e Homologação Completa do Sistema Global de Comando por Voz com IA (Copiloto Cívico CDA 2026)
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SHOTS_DIR = '/home/user/Plataforma-Correio-Digital-Angola-Oficial-2026/images';
mkdirSync(SHOTS_DIR, { recursive: true });

async function runVoiceCopilotE2ETest() {
  console.log('================================================================');
  console.log('🎙️ INICIANDO SUITE E2E: SISTEMA GLOBAL DE COMANDO POR VOZ COM IA');
  console.log(`🌐 Alvo: ${BASE_URL}`);
  console.log('================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  let totalTests = 0;
  let passedTests = 0;

  function assert(desc, condition) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${desc}`);
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
    }
  }

  const consoleErrors = [];

  try {
    // =============================================================
    // BLOCO 1: ÁREA DO CIDADÃO (Testes Funcionais e de Acessibilidade)
    // =============================================================
    console.log('--- BLOCO 1: Área do Cidadão (Comandos de Voz e HUD) ---');
    const userCtx = await browser.newContext({
      permissions: ['microphone'],
      viewport: { width: 1440, height: 900 }
    });
    const pageUser = await userCtx.newPage();
    pageUser.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        consoleErrors.push(`[Cidadão] ${msg.text()}`);
      }
    });

    await pageUser.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await pageUser.waitForTimeout(1500);

    const inputId = pageUser.getByPlaceholder(/LA041|AGT-9921-SR|ADM-8812-OP|ADMIN-0001/);
    if (await inputId.isVisible({ timeout: 5000 }).catch(() => false)) {
      await inputId.fill('009874562LA041');
      await pageUser.getByPlaceholder('••••••••••••').fill('123456');
      await pageUser.getByRole('button', { name: /Entrar no Portal/ }).click();
      await pageUser.waitForTimeout(3000);
    }

    const painelCidadao = await pageUser.getByRole('button', { name: 'Painel', exact: true }).first().isVisible().catch(() => false);
    assert('Sessão do Cidadão autenticada com sucesso', painelCidadao);

    // 1.1 Verificação do Microfone no Cabeçalho
    const micButton = pageUser.locator('button[aria-label="Ativar Copiloto de Voz e Acessibilidade IA"]:visible').first();
    const micExists = await micButton.count() > 0;
    assert('Botão de Microfone presente no cabeçalho do Cidadão', micExists);
    assert('Botão de Microfone habilitado no Cidadão', micExists && !(await micButton.isDisabled()));

    // 1.2 Ativação via Clique no Microfone
    await micButton.click();
    await pageUser.waitForTimeout(1000);

    const voiceHUD = pageUser.locator('aside[aria-label="Copiloto de Voz e Acessibilidade IA"]');
    assert('HUD do Copiloto de Voz Cívico visível', await voiceHUD.isVisible());
    assert('Título oficial do Copiloto Cívico visível', await pageUser.locator('text=Copiloto Cívico IA').isVisible());

    // Capturar screenshot do Copiloto no Painel do Cidadão
    await pageUser.screenshot({ path: `${SHOTS_DIR}/cda_copiloto_voz_hud_cidadao.png` });

    // 1.3 Teste de Modo Escuro por Voz
    const btnModoEscuro = voiceHUD.locator('button:has-text("Modo Escuro")').first();
    if (await btnModoEscuro.isVisible()) {
      await btnModoEscuro.click();
      await pageUser.waitForTimeout(1000);
      const isDark = await pageUser.evaluate(() => document.documentElement.classList.contains('dark') || document.body.classList.contains('dark'));
      assert('Comando de Voz para Modo Escuro executado', isDark);
    }

    // 1.4 Teste de Leitura de Ecrã por Voz
    const btnLerEcra = voiceHUD.locator('button:has-text("Ler Ecrã")').first();
    if (await btnLerEcra.isVisible()) {
      await btnLerEcra.click();
      await pageUser.waitForTimeout(1000);
      const feedbackText = await voiceHUD.textContent();
      assert('Leitura de Ecrã ativada e narrando página', feedbackText.includes('Leitura de Ecrã') || feedbackText.includes('Painel') || feedbackText.includes('ler') || feedbackText.includes('apresentação'));
    }

    // 1.5 Teste de Navegação por Voz: Correio
    const btnAbrirCorreio = voiceHUD.locator('button:has-text("Abrir Correio")').first();
    if (await btnAbrirCorreio.isVisible()) {
      await btnAbrirCorreio.click();
      await pageUser.waitForTimeout(2000);
      const onMailPage = await pageUser.getByRole('button', { name: /Nova Mensagem/i }).first().isVisible().catch(() => false) ||
                         await pageUser.getByText(/Caixa de Correio|Correspondências/i).first().isVisible().catch(() => false);
      assert('Navegação por voz para Caixa de Correio executada', onMailPage);
    }

    // 1.6 Teste de Navegação por Voz: Vídeo-Atendimento
    const btnVideoAtendimento = voiceHUD.locator('button:has-text("Vídeo-Atendimento")').first();
    if (await btnVideoAtendimento.isVisible()) {
      await btnVideoAtendimento.click();
      await pageUser.waitForTimeout(2000);
      const onVideoPage = await pageUser.getByText(/Vídeo-Atendimento|Agenda/i).first().isVisible().catch(() => false);
      assert('Navegação por voz para Vídeo-Atendimento executada', onVideoPage);
    }

    // 1.7 Teste de Navegação por Voz: Notificações
    const btnNotificacoes = voiceHUD.locator('button:has-text("Ver Notificações")').first();
    if (await btnNotificacoes.isVisible()) {
      await btnNotificacoes.click();
      await pageUser.waitForTimeout(2000);
      const onNotifPage = await pageUser.getByText(/Notificações|Alertas/i).first().isVisible().catch(() => false);
      assert('Navegação por voz para Notificações executada', onNotifPage);
    }

    // 1.8 Teste do Atalho Alt + V
    await pageUser.keyboard.press('Alt+v');
    await pageUser.waitForTimeout(800);
    assert('Atalho Alt + V fecha o Copiloto de Voz', !(await voiceHUD.isVisible()));

    await pageUser.keyboard.press('Alt+v');
    await pageUser.waitForTimeout(800);
    assert('Atalho Alt + V reabre o Copiloto de Voz', await voiceHUD.isVisible());

    // 1.9 Teste de Drawer de Ajuda
    const helpBtn = voiceHUD.locator('button[aria-label="Ajuda de comandos de voz"]');
    if (await helpBtn.isVisible()) {
      await helpBtn.click();
      await pageUser.waitForTimeout(500);
      assert('Guia de ajuda de comandos de voz expandido', await pageUser.locator('text=O que pode dizer ao Copiloto').isVisible());
    }

    await userCtx.close();

    // =============================================================
    // BLOCO 2: ÁREA INSTITUCIONAL (AGT)
    // =============================================================
    console.log('\n--- BLOCO 2: Área Institucional (AGT) ---');
    const instCtx = await browser.newContext({
      permissions: ['microphone'],
      viewport: { width: 1440, height: 900 }
    });
    const pageInst = await instCtx.newPage();
    pageInst.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        consoleErrors.push(`[Inst] ${msg.text()}`);
      }
    });

    await pageInst.goto(`${BASE_URL}/institucional#/login`, { waitUntil: 'domcontentloaded' });
    await pageInst.waitForTimeout(1500);

    const inputInstId = pageInst.getByPlaceholder(/LA041|AGT-9921-SR|ADM-8812-OP|ADMIN-0001/);
    if (await inputInstId.isVisible({ timeout: 5000 }).catch(() => false)) {
      await inputInstId.fill('AGT-9921-SR');
      await pageInst.getByPlaceholder('••••••••••••').fill('000000');
      await pageInst.getByRole('button', { name: /Entrar no Portal/ }).click();
      await pageInst.waitForTimeout(3000);
    }

    const painelInst = await pageInst.getByRole('button', { name: 'Painel', exact: true }).first().isVisible().catch(() => false);
    assert('Sessão Institucional autenticada com sucesso', painelInst);

    const micInst = pageInst.locator('button[aria-label="Ativar Copiloto de Voz e Acessibilidade IA"]:visible').first();
    assert('Botão de Microfone habilitado no cabeçalho institucional', await micInst.isVisible());

    await micInst.click();
    await pageInst.waitForTimeout(1000);
    const voiceHUDInst = pageInst.locator('aside[aria-label="Copiloto de Voz e Acessibilidade IA"]');
    assert('Copiloto de Voz operacional na Área Institucional', await voiceHUDInst.isVisible());

    // Navegar para Equipa Institucional por Voz
    const btnEquipa = voiceHUDInst.locator('button:has-text("Gestão de Equipa")').first();
    if (await btnEquipa.isVisible()) {
      await btnEquipa.click();
      await pageInst.waitForTimeout(2000);
      const onEquipa = await pageInst.getByText(/Equipa|Membro|Colaborador/i).first().isVisible().catch(() => false);
      assert('Navegação por voz para Gestão de Equipa executada', onEquipa);
    }

    await instCtx.close();

    // =============================================================
    // BLOCO 3: ADMINISTRAÇÃO CENTRAL (SOC)
    // =============================================================
    console.log('\n--- BLOCO 3: Administração Central (SOC) ---');
    const adminCtx = await browser.newContext({
      permissions: ['microphone'],
      viewport: { width: 1440, height: 900 }
    });
    const pageAdmin = await adminCtx.newPage();
    pageAdmin.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        consoleErrors.push(`[Admin] ${msg.text()}`);
      }
    });

    await pageAdmin.goto(`${BASE_URL}/admin#/login`, { waitUntil: 'domcontentloaded' });
    await pageAdmin.waitForTimeout(1500);

    const inputAdminId = pageAdmin.getByPlaceholder(/LA041|AGT-9921-SR|ADM-8812-OP|ADMIN-0001/);
    if (await inputAdminId.isVisible({ timeout: 5000 }).catch(() => false)) {
      await inputAdminId.fill('ADM-8812-OP');
      await pageAdmin.getByPlaceholder('••••••••••••').fill('GALHARDO');
      await pageAdmin.getByRole('button', { name: /Entrar no Portal/ }).click();
      await pageAdmin.waitForTimeout(3000);
    }

    const painelAdmin = await pageAdmin.getByText(/SOC|Painel Nacional|Administração/i).first().isVisible().catch(() => false);
    assert('Sessão da Administração Central autenticada com sucesso', painelAdmin);

    const micAdmin = pageAdmin.locator('button[aria-label="Ativar Copiloto de Voz e Acessibilidade IA"]:visible').first();
    assert('Botão de Microfone habilitado no cabeçalho Admin', await micAdmin.isVisible());

    await micAdmin.click();
    await pageAdmin.waitForTimeout(1000);
    const voiceHUDAdmin = pageAdmin.locator('aside[aria-label="Copiloto de Voz e Acessibilidade IA"]');
    assert('Copiloto de Voz operacional na Administração Central', await voiceHUDAdmin.isVisible());

    // Navegar para Interoperabilidade por Voz
    const btnInterop = voiceHUDAdmin.locator('button:has-text("Interoperabilidade")').first();
    if (await btnInterop.isVisible()) {
      await btnInterop.click();
      await pageAdmin.waitForTimeout(2000);
      const onInterop = await pageAdmin.getByText(/Interoperabilidade|Instituições|Solicitações/i).first().isVisible().catch(() => false);
      assert('Navegação por voz para Interoperabilidade executada', onInterop);
    }

    await adminCtx.close();

    // =============================================================
    // BLOCO 4: Telemetria e Zero Erros de Consola
    // =============================================================
    console.log('\n--- BLOCO 4: Telemetria de Erros de Consola ---');
    const criticalJsErrors = consoleErrors.filter(e => 
      !e.includes('Failed to load resource') && 
      !e.includes('net::ERR') && 
      !e.includes('favicon') && 
      !e.includes('404') && 
      !e.includes('401') && 
      !e.includes('400') &&
      !e.includes('speechRecognition')
    );
    if (criticalJsErrors.length > 0) {
      console.log('Detected critical JS errors:', criticalJsErrors);
    }
    assert('Zero erros críticos de JavaScript na consola em todas as 3 áreas', criticalJsErrors.length === 0);

  } catch (error) {
    console.error('❌ Erro durante a execução da suite E2E de Voz:', error);
  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log(`📊 RESULTADO FINAL DA HOMOLOGAÇÃO: ${passedTests}/${totalTests} ASSERÇÕES APROVADAS`);
  console.log('================================================================\n');

  if (passedTests === totalTests && totalTests > 0) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVoiceCopilotE2ETest();
