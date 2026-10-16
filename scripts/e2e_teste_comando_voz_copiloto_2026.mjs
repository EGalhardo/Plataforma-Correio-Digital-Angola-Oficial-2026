/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Suite de Teste E2E e Homologação do Assistente IA com Comando por Voz e Texto Unificado
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SHOTS_DIR = '/home/user/Plataforma-Correio-Digital-Angola-Oficial-2026/images';
mkdirSync(SHOTS_DIR, { recursive: true });

async function runUnifiedAIChatVoiceTest() {
  console.log('================================================================');
  console.log('🎙️ INICIANDO SUITE E2E: ASSISTENTE IA (VOZ + TEXTO CHATBOT)');
  console.log(`🌐 Alvo: ${BASE_URL}`);
  console.log('================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  const context = await browser.newContext({
    permissions: ['microphone'],
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('Failed to load resource')) {
      consoleErrors.push(msg.text());
    }
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

  try {
    // -------------------------------------------------------------
    // FASE 0: Login na Conta de Cidadão
    // -------------------------------------------------------------
    console.log('--- FASE 0: Autenticação de Sessão (Cidadão) ---');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const inputId = page.getByPlaceholder(/LA041|AGT-9921-SR|ADM-8812-OP|ADMIN-0001/);
    if (await inputId.isVisible({ timeout: 5000 }).catch(() => false)) {
      await inputId.fill('009874562LA041');
      await page.getByPlaceholder('••••••••••••').fill('123456');
      await page.getByRole('button', { name: /Entrar no Portal/ }).click();
      await page.waitForTimeout(3000);
    }

    const painelVisible = await page.getByRole('button', { name: 'Painel', exact: true }).first().isVisible().catch(() => false);
    assert('Sessão autenticada e Painel do Cidadão carregado', painelVisible);

    // -------------------------------------------------------------
    // FASE 1: Abertura do Assistente IA via Microfone do Cabeçalho
    // -------------------------------------------------------------
    console.log('\n--- FASE 1: Verificação e Abertura do Assistente IA ---');
    const micButton = page.locator('button[aria-label="Ativar Copiloto de Voz e Acessibilidade IA"]:visible').first();
    const micExists = await micButton.count() > 0;
    assert('Botão de Microfone acessível presente no cabeçalho', micExists);
    assert('Botão de Microfone habilitado em todas as páginas', micExists && !(await micButton.isDisabled()));

    await micButton.click();
    await page.waitForTimeout(1000);

    const chatModal = page.locator('text=Assistente Digital').first();
    assert('Modal do Assistente Digital aberto com sucesso', await chatModal.isVisible());

    const inputChat = page.getByPlaceholder(/Escreva sua mensagem/i);
    assert('Campo de texto do Chatbot visível para escrita manual', await inputChat.isVisible());

    // Capturar screenshot do Assistente IA aberto com voz e chat
    await page.screenshot({ path: `${SHOTS_DIR}/cda_assistente_ia_chat_voz.png` });

    // -------------------------------------------------------------
    // FASE 2: Comando de Navegação e Botões de Confirmação
    // -------------------------------------------------------------
    console.log('\n--- FASE 2: Comando de Navegação e Botões de Confirmação ---');
    await inputChat.fill('mostrar a página do correio');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    const confirmText = page.locator('text=Confirma que pretende ir para a página').first();
    assert('Assistente solicita confirmação de navegação', await confirmText.isVisible());

    const btnConfirmar = page.getByRole('button', { name: /Confirmar/i }).first();
    const btnCancelar = page.getByRole('button', { name: /Cancelar/i }).first();
    assert('Botão "Confirmar" visível no chat', await btnConfirmar.isVisible());
    assert('Botão "Cancelar" visível no chat', await btnCancelar.isVisible());

    // Clicar em Confirmar
    await btnConfirmar.click();
    await page.waitForTimeout(2000);

    const onMailPage = await page.getByRole('button', { name: /Nova Mensagem/i }).first().isVisible().catch(() => false) ||
                       await page.getByText(/Caixa de Correio|Correspondências/i).first().isVisible().catch(() => false);
    assert('Navegação confirmada executada para a Caixa de Correio', onMailPage);

    // -------------------------------------------------------------
    // FASE 3: Comando de Interface por Texto/Voz (Modo Escuro / Claro)
    // -------------------------------------------------------------
    console.log('\n--- FASE 3: Comandos de Interface no Chatbot (Modo Escuro / Claro) ---');
    await inputChat.fill('ativar modo escuro');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark') || document.body.classList.contains('dark'));
    assert('Comando "ativar modo escuro" aplicado no chatbot', isDark);

    await inputChat.fill('ativar modo claro');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    const isLight = await page.evaluate(() => !document.documentElement.classList.contains('dark'));
    assert('Comando "ativar modo claro" aplicado no chatbot', isLight);

    // -------------------------------------------------------------
    // FASE 4: Pergunta de Conhecimento Cívico à IA
    // -------------------------------------------------------------
    console.log('\n--- FASE 4: Consulta Cívica ao Assistente IA ---');
    await inputChat.fill('O que é o Correio Digital de Angola?');
    await page.keyboard.press('Enter');
    
    // Aguardar conclusão da resposta da IA
    await page.locator('.animate-spin').waitFor({ state: 'detached', timeout: 15000 }).catch(() => null);
    await page.waitForTimeout(1000);

    const bubbles = page.locator('.p-3.rounded-2xl.text-sm');
    const count = await bubbles.count();
    const lastMsg = count > 0 ? await bubbles.nth(count - 1).textContent() : '';
    assert('Assistente de IA processou e respondeu à dúvida cívica', lastMsg && lastMsg.length > 10);

    // -------------------------------------------------------------
    // FASE 5: Atalho Global Alt + V
    // -------------------------------------------------------------
    console.log('\n--- FASE 5: Atalho Global Alt + V ---');
    await page.keyboard.press('Alt+v');
    await page.waitForTimeout(800);
    assert('Atalho Alt + V fecha o Assistente IA', !(await chatModal.isVisible()));

    await page.keyboard.press('Alt+v');
    await page.waitForTimeout(800);
    assert('Atalho Alt + V reabre o Assistente IA', await chatModal.isVisible());

    // -------------------------------------------------------------
    // FASE 6: Telemetria de Erros de Consola
    // -------------------------------------------------------------
    console.log('\n--- FASE 6: Telemetria de Erros de Consola ---');
    assert('Zero erros críticos de JavaScript na consola', consoleErrors.length === 0);

  } catch (error) {
    console.error('❌ Erro durante o teste E2E do Assistente IA:', error);
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

runUnifiedAIChatVoiceTest();
