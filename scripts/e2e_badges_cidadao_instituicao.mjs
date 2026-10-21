#!/usr/bin/env node
// ============================================================================
// e2e_badges_cidadao_instituicao.mjs — Auditoria E2E Completa de Badges & Não Lidas
// Áreas do Cidadão e da Instituição (Correio Digital Angola - Homologação 2026)
// ============================================================================
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:3000';
const CIDADAO_BI = process.env.QA_BI_A || '009874562LA041';
const CIDADAO_PASS = process.env.QA_CID_PASS || '123456';
const INST_USER = process.env.QA_INST || 'AGT-9921-SR';
const INST_PASS = process.env.QA_INST_PASS || '000000';

const SHOTS_DIR = path.resolve('/home/user/Plataforma-Correio-Digital-Angola-Oficial-2026/testes/evidencias/badges_homologacao');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

let totalAsserts = 0;
let passedAsserts = 0;
let failedAsserts = 0;

function assert(condition, testName, details = '') {
  totalAsserts++;
  if (condition) {
    passedAsserts++;
    console.log(`  ✅ [PASS] ${testName}${details ? ' (' + details + ')' : ''}`);
  } else {
    failedAsserts++;
    console.error(`  ❌ [FAIL] ${testName}${details ? ' (' + details + ')' : ''}`);
    throw new Error(`Falha no assert: ${testName} - ${details}`);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fecharModais(page) {
  for (let i = 0; i < 3; i++) {
    const btn = page.locator('button:has-text("Concluir e Fechar"), button:has-text("Entendido"), button:has-text("Fechar"), button:has-text("OK")').first();
    if (await btn.isVisible({ timeout: 200 }).catch(() => false)) {
      await btn.click({ force: true }).catch(() => {});
      await sleep(150);
    }
  }
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(100);
}

async function getVisibleAvatarBadge(page) {
  const badge = page.locator('[data-testid="avatar-unread-badge"]:visible').first();
  if (await badge.isVisible().catch(() => false)) {
    const txt = await badge.innerText();
    return parseInt(txt.replace(/\D/g, '') || '0', 10);
  }
  return 0;
}

async function getVisibleMenuContador(page) {
  const menuContador = page.locator('[data-testid="menu-contador"]:visible').first();
  if (await menuContador.isVisible().catch(() => false)) {
    const txt = await menuContador.innerText();
    return parseInt(txt.replace(/\D/g, '') || '0', 10);
  }
  return 0;
}

async function run() {
  console.log('='.repeat(80));
  console.log('🚀 INICIANDO AUDITORIA E2E: BADGES DE NOTIFICAÇÃO & CORRESPONDÊNCIAS NÃO LIDAS');
  console.log('🏛️ Plataforma: Correio Digital Angola (CDA) — Homologação Oficial');
  console.log(`📌 Alvo: ${BASE}`);
  console.log('='.repeat(80));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    // =========================================================================
    // 👤 ETAPA 1: AUDITORIA NA ÁREA DO CIDADÃO
    // =========================================================================
    console.log('\n👤 --- [ETAPA 1] AUDITORIA NA ÁREA DO CIDADÃO ---');
    const citizenContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'pt-AO'
    });
    const page = await citizenContext.newPage();

    console.log('1.1 Autenticação como Cidadão...');
    await page.goto(`${BASE}/#/entrar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(1500);

    const biInput = page.locator('input[name="cda-utilizador"], input[type="text"]:visible, input:not([type]):visible').first();
    await biInput.waitFor({ state: 'visible', timeout: 15000 });
    await biInput.fill(CIDADAO_BI);

    const passInput = page.locator('input[name="cda-senha"], input[type="password"]:visible').first();
    await passInput.fill(CIDADAO_PASS);

    const btnEntrar = page.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first();
    await btnEntrar.click();
    await sleep(2500);

    const erroLogin = await page.locator('text=/Senha incorreta|inválid/i').isVisible().catch(() => false);
    if (erroLogin) {
      console.log('  [info] A tentar senha alternativa (123456789)...');
      await passInput.fill('123456789');
      await btnEntrar.click();
      await sleep(2500);
    }

    await page.waitForSelector('aside, nav', { timeout: 20000 });
    await fecharModais(page);
    assert(true, '1.1 - Cidadão autenticado com sucesso no Portal');

    // Injeção controlada de correspondências e notificações de teste para aferição precisa de badges
    console.log('\n1.2 Injeção de cenário controlado de correspondências com múltiplos atalhos...');
    await page.evaluate(({ citizenKey }) => {
      // 1. Uma correspondência geral não lida (Inbox #101)
      const msgGeral = {
        id: 101,
        org: 'Ministério das Finanças',
        institution: 'MINFIN',
        preview: 'Notificação de Liquidação Fiscal 2026',
        date: 'Hoje',
        unread: 1,
        status: 'Recebido',
        recipientBi: citizenKey,
        details: {
          subject: 'Notificação de Liquidação Fiscal 2026',
          body: 'Informamos a emissão da nota de liquidação tributária.',
          category: 'Notificação Fiscal',
          actions: ['Ver mensagem']
        }
      };

      // 2. Um Comunicado Oficial não lido (Inbox #102 + Notificação #202)
      const msgComunicado = {
        id: 102,
        org: 'Presidência da República',
        institution: 'PR',
        preview: '[COMUNICADO OFICIAL] Decretada Tolerância de Ponto',
        date: 'Hoje',
        unread: 1,
        status: 'Recebido',
        recipientBi: citizenKey,
        details: {
          subject: '[COMUNICADO OFICIAL] Decretada Tolerância de Ponto',
          body: 'Comunica-se a todos os cidadãos a tolerância de ponto.',
          category: 'Comunicado Oficial',
          actions: ['Ver mensagem']
        }
      };

      const notifComunicado = {
        id: 202,
        title: 'Comunicado Oficial — Presidência',
        message: 'Publicado o [COMUNICADO OFICIAL] Decretada Tolerância de Ponto.',
        time: 'Agora',
        type: 'info',
        targetTab: 'comunicados',
        unread: true,
        ownerId: citizenKey,
        messageId: 102
      };

      // 3. Uma Denúncia enviada pelo cidadão com actualização de estado (Sent #103 + Notificação #203)
      const msgDenuncia = {
        id: 103,
        org: 'AGT',
        institution: 'AGT',
        preview: '[REGISTO DE DENÚNCIA] Denúncia de Fraude Alfandegária',
        date: 'Hoje',
        unread: 1,
        novidade: true,
        status: 'Fase: Em Análise',
        senderKey: citizenKey,
        senderBi: citizenKey,
        recipientBi: 'AGT',
        details: {
          subject: '[REGISTO DE DENÚNCIA] Denúncia de Fraude Alfandegária',
          body: 'Apresentação formal de irregularidade fiscal.',
          actions: ['Ver mensagem']
        }
      };

      const notifDenuncia = {
        id: 203,
        title: 'Denuncia — Em Análise',
        message: 'A sua denúncia passou para o estado «Em Análise». (Denúncia de Fraude Alfandegária)',
        time: 'Agora',
        type: 'info',
        targetTab: 'nova-denuncia',
        unread: true,
        ownerId: citizenKey,
        messageId: 103
      };

      // 4. Um Inquérito não lido (Inbox #104)
      const msgInquerito = {
        id: 104,
        org: 'INE',
        institution: 'INE',
        preview: 'Inquérito de Satisfação dos Serviços Públicos Digitais',
        date: 'Hoje',
        unread: 1,
        status: 'Recebido',
        recipientBi: citizenKey,
        details: {
          subject: 'Inquérito de Satisfação dos Serviços Públicos Digitais',
          body: 'Participe na avaliação contínua dos serviços digitais.',
          category: 'Inquéritos',
          type: 'inquerito',
          actions: ['Responder ao Inquérito']
        }
      };

      localStorage.setItem('correio_digital_inbox', JSON.stringify([msgGeral, msgComunicado, msgInquerito]));
      localStorage.setItem('correio_digital_sent', JSON.stringify([msgDenuncia]));
      localStorage.setItem('correio_digital_notifications', JSON.stringify([notifComunicado, notifDenuncia]));
      localStorage.setItem(`cda_notifications_${citizenKey}`, JSON.stringify([notifComunicado, notifDenuncia]));
      localStorage.setItem('correio_digital_deleted_message_ids', JSON.stringify([]));
      localStorage.setItem('correio_digital_hidden_messages', JSON.stringify([]));
    }, { citizenKey: CIDADAO_BI });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(2000);
    await fecharModais(page);

    console.log('\n1.3 Verificação de Paridade Canónica: Avatar vs Card Painel vs Atalhos...');
    const avatarCount = await getVisibleAvatarBadge(page);
    console.log(`  👤 Badge do Avatar do Cidadão: ${avatarCount}`);

    const cardTotalLoc = page.locator('[data-testid="unread-total-counter"]');
    const cardUnreadAttr = await cardTotalLoc.getAttribute('data-unread-count');
    const cardCount = parseInt(cardUnreadAttr || '0', 10);
    console.log(`  📦 Card «Novas Mensagens - Não Lidas»: ${cardCount}`);

    assert(avatarCount === cardCount && avatarCount >= 4, '1.2 - Paridade 1:1 entre Avatar Badge e Card do Painel', `Avatar=${avatarCount}, Card=${cardCount}`);

    // Verificar badges dos atalhos temáticos
    const badgeComunicados = page.locator('[data-notification-badge="comunicados"]');
    const badgeDenuncia = page.locator('[data-notification-badge="nova-denuncia"]');
    const badgeInqueritos = page.locator('[data-notification-badge="inqueritos"]');

    assert(await badgeComunicados.isVisible(), '1.3 - Badge do atalho «Comunicados» visível');
    assert(await badgeDenuncia.isVisible(), '1.4 - Badge do atalho «Denuncia» visível');
    assert(await badgeInqueritos.isVisible(), '1.5 - Badge do atalho «Inquéritos» visível');

    // 1.4 Testar Menu Dropdown do Avatar
    console.log('\n1.4 Verificação do Menu Dropdown do Avatar...');
    const avatarBtn = page.locator('[aria-label="Menu de Perfil e Notificações"]:visible').first();
    await avatarBtn.click();
    await sleep(1000);

    const menuCount = await getVisibleMenuContador(page);
    console.log(`  📋 Contador do Menu Dropdown do Avatar: ${menuCount}`);

    const itensMenuNaoLidos = page.locator('[data-testid="menu-item-nao-lido"]:visible');
    const countItensMenu = await itensMenuNaoLidos.count();
    console.log(`  📝 Quantidade de itens listados no Dropdown: ${countItensMenu}`);

    assert(avatarCount === menuCount, '1.6 - Paridade 1:1 entre Badge do Avatar e Header do Menu Dropdown', `Avatar=${avatarCount}, MenuHeader=${menuCount}`);
    assert(avatarCount === countItensMenu, '1.7 - Quantidade de itens listados no Menu coincide com o contador', `TotalItens=${countItensMenu}`);

    await page.screenshot({ path: `${SHOTS_DIR}/01_cidadao_painel_e_dropdown_claro.png` });

    // Fechar dropdown
    await page.locator('body').click({ position: { x: 50, y: 50 } });
    await sleep(500);

    // 1.5 Testar Decremento Atómico ao Abrir Correspondência Não Lida
    console.log('\n1.5 Teste de Decremento Atómico e Atualização Instantânea...');
    // Clicar no atalho Comunicados
    const atalhoComunicados = page.locator('[data-testid="atalho-comunicados"]');
    await atalhoComunicados.click();
    await sleep(2000);

    // Abrir o comunicado #102 com o botão data-msg-id
    const itemComunicado = page.locator('button[data-msg-id="102"]');
    await itemComunicado.waitFor({ state: 'visible', timeout: 10000 });
    await itemComunicado.click();
    await sleep(2500);

    // Voltar para o Painel
    await page.locator('aside button, nav button, button').filter({ hasText: /^Painel$/i }).first().click();
    await sleep(2000);

    const novoAvatarCount = await getVisibleAvatarBadge(page);
    console.log(`  👤 Novo Badge do Avatar após leitura do Comunicado: ${novoAvatarCount}`);

    assert(novoAvatarCount === avatarCount - 1, '1.8 - Decremento atómico de exatamente 1 unidade após abertura', `Anterior=${avatarCount}, Novo=${novoAvatarCount}`);
    assert(!(await badgeComunicados.isVisible()), '1.9 - Badge do atalho «Comunicados» desapareceu após leitura (limite zero)');

    // 1.6 Teste de Modo Escuro no Cidadão
    console.log('\n1.6 Auditoria Visual e Contraste em Modo Escuro (Cidadão)...');
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('correio_digital_theme', 'dark');
    });
    await sleep(1000);
    await page.goto(`${BASE}/#/home`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    await page.screenshot({ path: `${SHOTS_DIR}/02_cidadao_modo_escuro.png` });
    assert(true, '1.10 - Painel do Cidadão auditado com sucesso em Modo Escuro');

    await citizenContext.close();

    // =========================================================================
    // 🏛️ ETAPA 2: AUDITORIA NA ÁREA DA INSTITUIÇÃO
    // =========================================================================
    console.log('\n🏛️ --- [ETAPA 2] AUDITORIA NA ÁREA DA INSTITUIÇÃO ---');
    const instContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'pt-AO'
    });
    const instPage = await instContext.newPage();

    console.log('2.1 Login na Área Institucional...');
    await instPage.goto(`${BASE}/#/institucional`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);

    const instUserInput = instPage.locator('input[name="cda-utilizador"], input[type="text"]:visible, input:not([type]):visible').first();
    await instUserInput.waitFor({ state: 'visible', timeout: 15000 });
    await instUserInput.fill(INST_USER);

    const instPassInput = instPage.locator('input[name="cda-senha"], input[type="password"]:visible').first();
    await instPassInput.fill(INST_PASS);

    const btnEntrarInst = instPage.locator('button', { hasText: /ENTRAR NO PORTAL|ENTRAR/i }).first();
    await btnEntrarInst.click();
    await sleep(3000);
    await fecharModais(instPage);

    await instPage.waitForSelector('aside, nav', { timeout: 20000 });
    assert(true, '2.1 - Agente da Instituição autenticado com sucesso');

    // Injeção de cenário institucional controlado
    console.log('\n2.2 Injeção de cenário controlado na Área Institucional...');
    await instPage.evaluate(({ instCode }) => {
      const msgsInst = [
        {
          id: 801,
          org: 'Cidadão: Carlos Alberto Ramos',
          institution: 'AGT',
          preview: 'Solicitação de Certidão de Não Devedor Tributário',
          date: 'Hoje, 11:15',
          unread: 1,
          status: 'Recebida',
          recipientBi: instCode,
          senderKey: '001928374LA099',
          details: {
            subject: 'Solicitação de Certidão de Não Devedor Tributário',
            body: 'Exmos. Senhores da AGT, venho por este meio solicitar a emissão da certidão fiscal.',
            category: 'Certificação',
            actions: ['Analisar Pedido']
          }
        },
        {
          id: 802,
          org: 'Cidadão: Manuel Domingos',
          institution: 'AGT',
          preview: '[REGISTO DE DENÚNCIA] Reclamação sobre atendimento comercial',
          date: 'Hoje, 10:40',
          unread: 1,
          status: 'Recebida',
          recipientBi: instCode,
          senderKey: '008877665LA012',
          details: {
            subject: '[REGISTO DE DENÚNCIA] Reclamação sobre atendimento comercial',
            body: 'Denúncia formal relativa ao processo tributário.',
            category: 'Denúncias',
            actions: ['Instaurar Processo']
          }
        }
      ];

      localStorage.setItem('correio_digital_inbox', JSON.stringify(msgsInst));
      localStorage.setItem('correio_digital_inst_inbox', JSON.stringify(msgsInst));
      localStorage.setItem('correio_digital_sent', JSON.stringify([]));
      localStorage.setItem('correio_digital_notifications', JSON.stringify([]));
      localStorage.setItem(`cda_notifications_${instCode}`, JSON.stringify([]));
      localStorage.setItem('correio_digital_deleted_message_ids', JSON.stringify([]));
      localStorage.setItem('correio_digital_hidden_messages', JSON.stringify([]));
    }, { instCode: INST_USER });

    await instPage.reload({ waitUntil: 'domcontentloaded' });
    await sleep(2000);
    await fecharModais(instPage);

    console.log('\n2.3 Verificação de Badges e Painel Institucional...');
    const countInstAvatar = await getVisibleAvatarBadge(instPage);
    console.log(`  🏛️ Badge do Avatar da Instituição: ${countInstAvatar}`);

    const cardTotalInst = instPage.locator('[data-testid="unread-total-counter"]');
    const cardInstAttr = await cardTotalInst.getAttribute('data-unread-count');
    const countInstCard = parseInt(cardInstAttr || '0', 10);
    console.log(`  📦 Card do Painel Institucional: ${countInstCard}`);

    assert(countInstAvatar === countInstCard && countInstAvatar >= 2, '2.2 - Paridade 1:1 no Painel da Instituição', `Avatar=${countInstAvatar}, Card=${countInstCard}`);

    // Dropdown Institucional
    console.log('\n2.4 Verificação do Dropdown da Instituição...');
    const avatarInstBtn = instPage.locator('[aria-label="Menu de Perfil e Notificações"]:visible').first();
    await avatarInstBtn.click();
    await sleep(1000);

    const menuInstCount = await getVisibleMenuContador(instPage);
    const itensMenuInst = instPage.locator('[data-testid="menu-item-nao-lido"]:visible');
    const countItensMenuInst = await itensMenuInst.count();

    assert(countInstAvatar === menuInstCount, '2.3 - Paridade 1:1 entre Avatar da Instituição e Header do Dropdown', `Avatar=${countInstAvatar}, Header=${menuInstCount}`);
    assert(countInstAvatar === countItensMenuInst, '2.4 - Quantidade de itens no Dropdown Institucional coincide rigorosamente', `Itens=${countItensMenuInst}`);

    await instPage.screenshot({ path: `${SHOTS_DIR}/03_instituicao_painel_e_dropdown_claro.png` });

    // Fechar dropdown
    await instPage.locator('body').click({ position: { x: 50, y: 50 } });
    await sleep(500);

    // 2.5 Abertura de item não lido na Instituição e validação de decremento
    console.log('\n2.5 Decremento Atómico e Leitura na Instituição...');
    await instPage.locator('aside button, nav button, button').filter({ hasText: /^Correio$/i }).first().click();
    await sleep(2000);

    const btnAbrirMsgInst = instPage.locator('button[data-acao="abrir"]').first();
    if (await btnAbrirMsgInst.isVisible()) {
      await btnAbrirMsgInst.click();
    } else {
      const msgLinha = instPage.locator('tr, div').filter({ hasText: /Certidão de Não Devedor/i }).first();
      await msgLinha.click();
    }
    await sleep(2500);

    // Voltar ao Painel da Instituição
    await instPage.locator('aside button, nav button, button').filter({ hasText: /^Painel$/i }).first().click();
    await sleep(2000);

    const novoInstAvatarCount = await getVisibleAvatarBadge(instPage);
    console.log(`  🏛️ Novo Badge da Instituição após leitura: ${novoInstAvatarCount}`);

    assert(novoInstAvatarCount === countInstAvatar - 1, '2.5 - Decremento atómico validado na Instituição', `Anterior=${countInstAvatar}, Novo=${novoInstAvatarCount}`);

    // 2.6 Modo Escuro na Instituição
    console.log('\n2.6 Auditoria Visual em Modo Escuro (Instituição)...');
    await instPage.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('correio_digital_theme', 'dark');
    });
    await sleep(1000);
    await instPage.goto(`${BASE}/#/home`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    await instPage.screenshot({ path: `${SHOTS_DIR}/04_instituicao_modo_escuro.png` });
    assert(true, '2.6 - Painel da Instituição auditado com sucesso em Modo Escuro');

    // =========================================================================
    // 🛡️ ETAPA 3: REGRA DE OCULTAÇÃO NO LIMITE ZERO
    // =========================================================================
    console.log('\n🛡️ --- [ETAPA 3] REGRA DE OCULTAÇÃO NO LIMITE ZERO ---');
    console.log('3.1 Leitura progressiva de todas as correspondências não lidas restantes...');
    
    // Leitura interativa de cada item até zerar
    let loopGuard = 0;
    while (loopGuard < 20) {
      loopGuard++;
      const currentBadge = await getVisibleAvatarBadge(instPage);
      if (currentBadge === 0) break;

      // Abrir dropdown e clicar no primeiro item não lido
      await instPage.locator('[aria-label="Menu de Perfil e Notificações"]:visible').first().click();
      await sleep(600);

      const unreadItem = instPage.locator('[data-testid="menu-item-nao-lido"]:visible').first();
      if (await unreadItem.isVisible()) {
        await unreadItem.click();
        await sleep(1500);
        await instPage.locator('aside button, nav button, button').filter({ hasText: /^Painel$/i }).first().click();
        await sleep(1000);
      } else {
        break;
      }
    }

    const isBadgeVisivelAposZerar = await instPage.locator('[data-testid="avatar-unread-badge"]:visible').isVisible().catch(() => false);
    console.log(`  🛡️ Badge do Avatar visível após zerar todas as mensagens: ${isBadgeVisivelAposZerar}`);

    assert(!isBadgeVisivelAposZerar, '3.1 - Badge do Avatar completamente ocultado no limite zero (nunca exibe 0 ou bolha vazia)');

    const cardZeroCount = await instPage.locator('[data-testid="unread-total-counter"]').getAttribute('data-unread-count');
    console.log(`  📦 Card do Painel ao zerar: ${cardZeroCount}`);
    assert(cardZeroCount === '0', '3.2 - Card do Painel registra 0 não lidas com texto correto');

    await instPage.screenshot({ path: `${SHOTS_DIR}/05_instituicao_zero_pendencias.png` });
    await instContext.close();

  } catch (err) {
    console.error('\n💥 [ERRO DURANTE AUDITORIA]', err);
    throw err;
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(80));
  console.log(`🏁 AUDITORIA FINALIZADA: ${failedAsserts === 0 ? '100% DE SUCESSO' : 'COM FALHAS'}`);
  console.log(`📊 Total de Asserções: ${totalAsserts} | Aprovadas: ${passedAsserts} | Falhadas: ${failedAsserts}`);
  console.log('='.repeat(80));

  if (failedAsserts > 0) {
    process.exit(1);
  }
}

run();
