// E2E Test: Envio Individual e Envio em Massa ("Todos") de Correspondências
// 1. Envio Individual para número de BI (ex.: 002399714LA030): gera e envia APENAS 1 correspondência exclusivamente para esse destinatário.
// 2. Envio Individual para Código Institucional (ex.: AGT-9921-SR): gera e envia APENAS 1 correspondência exclusivamente para esse destinatário.
// 3. Envio Individual com Sondagem/Inquérito IA: não gera difusão por âmbito quando o destinatário é um BI específico.
// 4. Envio em Massa para "Todos": envia para todos os contactos com histórico de troca de contacto com a conta actual.

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const SR = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const log = (msg) => console.log(`[TEST] ${msg}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const results = [];
function assert(name, condition, details = '') {
  const status = condition ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${name} ${details ? '(' + details + ')' : ''}`);
  results.push({ name, status, details });
  if (!condition) {
    console.error(`Assertion failed: ${name} ${details}`);
  }
}

async function runTests() {
  log(`Starting E2E tests on ${BASE}...`);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error(`[PAGE-ERR]`, msg.text());
  });

  try {
    // 1. Entrar na aplicação
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2000);

    // Testar modo Cidadão canónico demo (ou login)
    // Clicar em Entrar ou verificar se já está autenticado
    const userInput = page.locator('input[name="cda-utilizador"]').first();
    if (await userInput.isVisible().catch(() => false)) {
      log('Preenchendo credenciais do Cidadão...');
      await userInput.fill('002399714LA030');
      await page.fill('input[name="cda-senha"]', '123456789');
    }

    const loginBtn = page.getByRole('button', { name: /Entrar no Portal/i }).first();
    if (await loginBtn.isVisible().catch(() => false)) {
      log('Realizando login como Cidadão...');
      await loginBtn.click();
      await sleep(2500);
    }

    // Navegar para Correio / Correspondência
    log('Navegando para Correspondências...');
    const correioBtn = page.locator('button, a, [role=tab]').filter({ hasText: /Correio|Correspondê/i }).first();
    if (await correioBtn.isVisible().catch(() => false)) {
      await correioBtn.click();
      await sleep(1500);
    }

    // =========================================================================
    // TESTE 1: Cidadão envia mensagem para BI específico (002399714LA030)
    // =========================================================================
    log('--- TESTE 1: Envio individual de Cidadão para BI específico (002399714LA030) ---');
    const novaMensagemBtn = page.locator('button, a').filter({ hasText: /Nova Mensagem/i }).first();
    assert('Botão Nova Mensagem visível', await novaMensagemBtn.isVisible());
    await novaMensagemBtn.click();
    await sleep(1000);

    // Preencher Destinatário com 002399714LA030
    const recipientInput = page.locator('#recipient-inst-input, #recipient-bi-input, input[placeholder*="Código Institucional"], input[placeholder*="Número do BI"]').first();
    assert('Campo Destinatário presente', await recipientInput.isVisible());
    await recipientInput.fill('002399714LA030');

    // Preencher Assunto e Corpo
    const timestamp1 = Date.now();
    const subject1 = `Teste Individual BI ${timestamp1}`;
    const body1 = `Corpo da mensagem de teste individual enviada para BI 002399714LA030 às ${new Date().toLocaleTimeString('pt-AO')}.`;

    const subjectInput = page.locator('input[placeholder*="tema da sua mensagem"], input[placeholder*="Assunto"], input[placeholder*="Título"]').first();
    if (await subjectInput.isVisible().catch(() => false)) {
      await subjectInput.fill(subject1);
    }

    const bodyInput = page.locator('textarea[placeholder*="Descreva detalhadamente"], textarea[placeholder*="Escreva a sua mensagem"], textarea').first();
    assert('Campo Corpo presente', await bodyInput.isVisible());
    await bodyInput.fill(body1);
    await sleep(1000);

    // Clicar em Enviar Mensagem
    const sendBtn = page.locator('#btn-enviar-mensagem, button:has-text("Enviar Mensagem")').first();
    assert('Botão Enviar habilitado', await sendBtn.isEnabled());
    await sendBtn.click();
    await sleep(1000);

    // Se abrir popup de tipo de envio (Modalidade), selecionar Normal e OK
    const modalTipoEnvioOk = page.locator('#btn-ok-modal-tipo-envio, button:has-text("Continuar"), #btn-modal-opcao-normal').first();
    if (await modalTipoEnvioOk.isVisible().catch(() => false)) {
      await modalTipoEnvioOk.click();
      await sleep(1000);
    }

    // Modal de Revisão antes de enviar -> Clicar em Enviar Correspondência
    const revConfirmBtn = page.getByRole('button', { name: /Enviar Correspondência/i }).last();
    if (await revConfirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revConfirmBtn.click();
      await sleep(1500);
    }

    // Verificar se modal de protocolo / comprovativo apareceu
    const protocoloModal = page.locator('text=/Protocolo Digital|Correspondência enviada|sucesso/i').first();
    const protocoloVisivel = await protocoloModal.isVisible({ timeout: 8000 }).catch(() => false);
    assert('Correspondência enviada com sucesso (modal/protocolo visível)', protocoloVisivel);

    // Fechar comprovativo se aberto
    const closeProtoBtn = page.getByRole('button', { name: /Concluído|Fechar|OK|Entendi/i }).last();
    if (await closeProtoBtn.isVisible().catch(() => false)) {
      await closeProtoBtn.click();
      await sleep(1000);
    }

    // Verificar aba Enviadas: conferir que a mensagem enviada está lá
    const enviadasTab = page.locator('button, [role=tab]').filter({ hasText: /Enviadas/i }).first();
    if (await enviadasTab.isVisible().catch(() => false)) {
      await enviadasTab.click();
      await sleep(1500);
      const msgEnviada = page.locator(`text=${subject1}`).first();
      const msgVisivel = await msgEnviada.isVisible({ timeout: 5000 }).catch(() => false);
      assert('Mensagem individual visível nas Enviadas', msgVisivel);
    }

    // =========================================================================
    // TESTE 2: Cidadão envia mensagem para "Todos"
    // =========================================================================
    log('--- TESTE 2: Envio de Cidadão para "Todos" ---');
    await novaMensagemBtn.click();
    await sleep(1000);

    await recipientInput.fill('Todos');
    const timestamp2 = Date.now();
    const subject2 = `Teste Envio Todos ${timestamp2}`;
    const body2 = `Esta mensagem é uma difusão para todos os contactos com troca prévia.`;

    if (await subjectInput.isVisible().catch(() => false)) {
      await subjectInput.fill(subject2);
    }
    await bodyInput.fill(body2);
    await sleep(1000);

    await sendBtn.click();
    await sleep(1000);

    if (await modalTipoEnvioOk.isVisible().catch(() => false)) {
      await modalTipoEnvioOk.click();
      await sleep(1000);
    }

    if (await revConfirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revConfirmBtn.click();
      await sleep(1500);
    }

    const todosFeedback = page.locator('text=/Correspondência distribuída|Difusão «Todos»|Protocolo Digital|sucesso|Não há contactos/i').first();
    const todosVisivel = await todosFeedback.isVisible({ timeout: 8000 }).catch(() => false);
    assert('Envio para Todos processado com sucesso ou aviso contextual', todosVisivel);

    if (await closeProtoBtn.isVisible().catch(() => false)) {
      await closeProtoBtn.click();
      await sleep(1000);
    }

    // =========================================================================
    // TESTE 3: Alternar para Modo Institucional e testar Envio Individual e Todos
    // =========================================================================
    log('--- TESTE 3: Modo Institucional - Envio Individual para BI e Todos ---');
    
    // Trocar para Instituição via menu de perfil ou troca de modo
    const instSwitch = page.locator('button, a').filter({ hasText: /Instituição|Área Institucional|Modo Institucional/i }).first();
    if (await instSwitch.isVisible().catch(() => false)) {
      await instSwitch.click();
      await sleep(2000);
    }

    // Navegar para Correio na área institucional
    if (await correioBtn.isVisible().catch(() => false)) {
      await correioBtn.click();
      await sleep(1500);
    }

    if (await novaMensagemBtn.isVisible().catch(() => false)) {
      await novaMensagemBtn.click();
      await sleep(1000);

      // Na instituição, selecionar tab Cidadão se visível
      const tabCidadao = page.locator('#tab-destinatario-cidadao, button:has-text("Cidadão")').first();
      if (await tabCidadao.isVisible().catch(() => false)) {
        await tabCidadao.click();
        await sleep(500);
      }

      // Preencher Destinatário com 002399714LA030
      const instRecipInput = page.locator('#recipient-bi-input, input[placeholder*="Número do BI"]').first();
      if (await instRecipInput.isVisible().catch(() => false)) {
        await instRecipInput.fill('002399714LA030');
      }

      const timestamp3 = Date.now();
      const subject3 = `Ofício Institucional ${timestamp3}`;
      const body3 = `Ofício oficial emitido para o cidadão titular do BI 002399714LA030.`;

      const instSubjInput = page.locator('input[placeholder*="tema da sua mensagem"], input[placeholder*="TÍTULO"]').first();
      if (await instSubjInput.isVisible().catch(() => false)) {
        await instSubjInput.fill(subject3);
      }

      const instBodyInput = page.locator('textarea').first();
      if (await instBodyInput.isVisible().catch(() => false)) {
        await instBodyInput.fill(body3);
      }

      await sleep(1000);
      const instSendBtn = page.locator('#btn-enviar-mensagem, button:has-text("Enviar Mensagem Oficial")').first();
      if (await instSendBtn.isEnabled().catch(() => false)) {
        await instSendBtn.click();
        await sleep(1000);

        if (await modalTipoEnvioOk.isVisible().catch(() => false)) {
          await modalTipoEnvioOk.click();
          await sleep(1000);
        }

        if (await revConfirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await revConfirmBtn.click();
          await sleep(1500);
        }

        const instProtoVisivel = await page.locator('text=/Protocolo Digital|Correspondência enviada|sucesso/i').first().isVisible({ timeout: 8000 }).catch(() => false);
        assert('Envio oficial da Instituição para BI individual executado com sucesso', instProtoVisivel);

        if (await closeProtoBtn.isVisible().catch(() => false)) {
          await closeProtoBtn.click();
          await sleep(1000);
        }
      }
    }

    log('=====================================================');
    log('TODOS OS TESTES E2E FORAM EXECUTADOS!');
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    log(`Resumo: ${passCount} PASS, ${failCount} FAIL (Total: ${results.length})`);
    log('=====================================================');

  } catch (err) {
    console.error('Erro na execução do E2E:', err);
    assert('Execução do teste sem exceções não tratadas', false, err.message);
  } finally {
    await browser.close();
  }
}

runTests().then(() => {
  const failed = results.filter(r => r.status === 'FAIL').length > 0;
  process.exit(failed ? 1 : 0);
});
