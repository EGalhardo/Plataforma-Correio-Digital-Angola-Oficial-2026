import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function run() {
  console.log('🚀 Iniciando Bateria E2E de Harmonia e Sintonia dos Indicadores de Notificação (Badges)...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const screenshotDir = path.resolve('testes/evidencias/screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await desktopContext.newPage();

    console.log('🔑 1. Efetuando Login como Cidadão (009874562LA041)...');
    await page.goto('http://localhost:3000/#/entrar', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const citizenKey = '009874562LA041';
    const biInput = page.locator('input[name="cda-utilizador"], input[type="text"]:visible, input:not([type]):visible').first();
    await biInput.waitFor({ state: 'visible', timeout: 15000 });
    await biInput.fill(citizenKey);
    const passInput = page.locator('input[name="cda-senha"], input[type="password"]:visible').first();
    await passInput.fill('123456');
    await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await page.waitForTimeout(2500);

    console.log('📥 2. Injetando correspondências e notificações de múltiplos tipos para o Cidadão...');
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
    }, { citizenKey });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // =========================================================================
    // VERIFICAÇÃO 1: SINTONIA MATEMÁTICA ENTRE AVATAR, PAINEL E ATALHOS
    // =========================================================================
    console.log('\n📊 3. Verificando a Sintonia Canónica entre o Avatar e o Painel Principal...');

    // Esperar pelo badge do Avatar
    const avatarBadge = page.locator('[data-testid="avatar-unread-badge"]:visible').first();
    await avatarBadge.waitFor({ state: 'visible', timeout: 10000 });
    const avatarCountText = await avatarBadge.textContent();
    const avatarTotal = parseInt(avatarCountText.trim(), 10);
    console.log(`  👤 Badge do Avatar: ${avatarTotal}`);

    // Card do Painel: "Não Lidas"
    const cardEl = page.locator('[data-testid="unread-total-counter"]');
    await cardEl.waitFor({ state: 'visible', timeout: 5000 });
    const cardTotalAttr = await cardEl.getAttribute('data-unread-count');
    const cardTotal = parseInt(cardTotalAttr || '0', 10);
    console.log(`  📦 Card «Novas Mensagens - Não Lidas»: ${cardTotal}`);

    assert(avatarTotal === cardTotal, `Avatar Badge (${avatarTotal}) coincide exatamente com o Card do Painel (${cardTotal})`);
    assert(avatarTotal >= 4, `Total de correspondências não lidas é >= 4 (calculado: ${avatarTotal})`);

    // Verificar badges individuais dos 6 atalhos:
    const badgeComunicados = await page.locator('[data-testid="atalho-comunicados"] [data-notification-badge="comunicados"] span[aria-hidden="true"]').textContent();
    const badgeDenuncia = await page.locator('[data-testid="atalho-nova-denuncia"] [data-notification-badge="nova-denuncia"] span[aria-hidden="true"]').textContent();
    const badgeInqueritos = await page.locator('[data-testid="atalho-inqueritos"] [data-notification-badge="inqueritos"] span[aria-hidden="true"]').textContent();

    console.log(`  📢 Badge «Comunicados»: ${badgeComunicados.trim()}`);
    console.log(`  🚩 Badge «Denuncia»: ${badgeDenuncia.trim()}`);
    console.log(`  📋 Badge «Inquéritos»: ${badgeInqueritos.trim()}`);

    assert(parseInt(badgeComunicados.trim(), 10) === 1, 'Atalho «Comunicados» tem badge = 1');
    assert(parseInt(badgeDenuncia.trim(), 10) === 1, 'Atalho «Denuncia» tem badge = 1');
    assert(parseInt(badgeInqueritos.trim(), 10) === 1, 'Atalho «Inquéritos» tem badge = 1');

    // Atalhos sem mensagens não lidas não devem ter badge visível
    const badgeReclamacoesVisivel = await page.locator('[data-testid="atalho-denuncias"] [data-notification-badge="denuncias"]').isVisible().catch(() => false);
    const badgeVideoVisivel = await page.locator('[data-testid="atalho-video-atendimento"] [data-notification-badge="video-atendimento"]').isVisible().catch(() => false);
    assert(!badgeReclamacoesVisivel, 'Atalho «Livro de Reclamações» oculto quando count === 0');
    assert(!badgeVideoVisivel, 'Atalho «Vídeo-Atendimento» oculto quando count === 0');

    await page.screenshot({ path: path.join(screenshotDir, 'sintonia_painel_avatar_4_itens.png'), fullPage: true });

    // =========================================================================
    // VERIFICAÇÃO 2: ABERTURA DO COMUNICADO E DECREMENTO SIMULTÂNEO EM CASCATA
    // =========================================================================
    console.log('\n📖 4. Cidadão abre a fila de Comunicados e lê a mensagem #102...');
    await page.locator('[data-testid="atalho-comunicados"]').click();
    await page.waitForTimeout(1500);

    const itemComunicado = page.locator('button[data-msg-id="102"]');
    await itemComunicado.click();
    await page.waitForTimeout(1500);

    // Regressar ao Painel
    await page.locator('aside button').filter({ hasText: /Painel/i }).first().click();
    await page.waitForTimeout(1500);

    // Verificar se todos os contadores atualizaram decrementando em 1
    const avatarTotalPosCom = parseInt((await avatarBadge.textContent()).trim(), 10);
    const cardTotalPosCom = parseInt((await page.locator('[data-testid="unread-total-counter"]').getAttribute('data-unread-count')) || '0', 10);
    const badgeComunicadosPos = await page.locator('[data-testid="atalho-comunicados"] [data-notification-badge="comunicados"]').isVisible().catch(() => false);

    console.log(`  👤 Avatar após leitura do Comunicado: ${avatarTotalPosCom}`);
    console.log(`  📦 Card Painel após leitura do Comunicado: ${cardTotalPosCom}`);

    assert(avatarTotalPosCom === avatarTotal - 1, `Avatar decrementou exatamente em 1 (${avatarTotal} -> ${avatarTotalPosCom})`);
    assert(cardTotalPosCom === avatarTotalPosCom, `Card do Painel (${cardTotalPosCom}) coincide com o Avatar (${avatarTotalPosCom})`);
    assert(!badgeComunicadosPos, 'Badge «Comunicados» desapareceu do atalho (count = 0)');

    // =========================================================================
    // VERIFICAÇÃO 3: ABERTURA DA DENÚNCIA E NOVO DECREMENTO EM 1
    // =========================================================================
    console.log('\n📖 5. Cidadão abre a fila de Denúncia e lê o item #103...');
    await page.locator('[data-testid="atalho-nova-denuncia"]').click();
    await page.waitForTimeout(1500);

    const itemDenuncia = page.locator('button[data-msg-id="103"]');
    await itemDenuncia.click();
    await page.waitForTimeout(1500);

    // Regressar ao Painel
    await page.locator('aside button').filter({ hasText: /Painel/i }).first().click();
    await page.waitForTimeout(1500);

    const avatarTotalPosDen = parseInt((await avatarBadge.textContent()).trim(), 10);
    const cardTotalPosDen = parseInt((await page.locator('[data-testid="unread-total-counter"]').getAttribute('data-unread-count')) || '0', 10);
    const badgeDenunciaPos = await page.locator('[data-testid="atalho-nova-denuncia"] [data-notification-badge="nova-denuncia"]').isVisible().catch(() => false);

    console.log(`  👤 Avatar após leitura da Denúncia: ${avatarTotalPosDen}`);
    console.log(`  📦 Card Painel após leitura da Denúncia: ${cardTotalPosDen}`);

    assert(avatarTotalPosDen === avatarTotalPosCom - 1, `Avatar decrementou exatamente em 1 (${avatarTotalPosCom} -> ${avatarTotalPosDen})`);
    assert(cardTotalPosDen === avatarTotalPosDen, `Card do Painel (${cardTotalPosDen}) coincide com o Avatar (${avatarTotalPosDen})`);
    assert(!badgeDenunciaPos, 'Badge «Denuncia» desapareceu do atalho (count = 0)');

    // =========================================================================
    // VERIFICAÇÃO 4: ABERTURA DO INQUÉRITO
    // =========================================================================
    console.log('\n📋 6. Cidadão abre a fila de Inquéritos e lê o item #104...');
    await page.locator('[data-testid="atalho-inqueritos"]').click();
    await page.waitForTimeout(1500);

    const itemInquerito = page.locator('button[data-msg-id="104"]');
    await itemInquerito.click();
    await page.waitForTimeout(1500);

    // Regressar ao Painel
    await page.locator('aside button').filter({ hasText: /Painel/i }).first().click();
    await page.waitForTimeout(1500);

    const avatarTotalPosInq = parseInt((await avatarBadge.textContent()).trim(), 10);
    const cardTotalPosInq = parseInt((await page.locator('[data-testid="unread-total-counter"]').getAttribute('data-unread-count')) || '0', 10);
    const badgeInqPos = await page.locator('[data-testid="atalho-inqueritos"] [data-notification-badge="inqueritos"]').isVisible().catch(() => false);

    console.log(`  👤 Avatar após leitura do Inquérito: ${avatarTotalPosInq}`);
    console.log(`  📦 Card Painel após leitura do Inquérito: ${cardTotalPosInq}`);

    assert(avatarTotalPosInq === avatarTotalPosDen - 1, `Avatar decrementou em 1 (${avatarTotalPosDen} -> ${avatarTotalPosInq})`);
    assert(cardTotalPosInq === avatarTotalPosInq, `Card do Painel (${cardTotalPosInq}) coincide com o Avatar (${avatarTotalPosInq})`);
    assert(!badgeInqPos, 'Badge «Inquéritos» desapareceu do atalho (count = 0)');

    // =========================================================================
    // VERIFICAÇÃO 5: LEITURA DE CORRESPONDÊNCIA GERAL NO CORREIO
    // =========================================================================
    console.log('\n📬 7. Cidadão navega para o Correio e abre uma correspondência geral não lida...');
    await page.locator('aside button').filter({ hasText: /Correio/i }).first().click();
    await page.waitForTimeout(1500);

    // Clicar no botão de abrir correspondência
    const btnAbrirMsg = page.locator('button[data-acao="abrir"]').first();
    if (await btnAbrirMsg.isVisible()) {
      await btnAbrirMsg.click();
      await page.waitForTimeout(1500);
    }

    // Regressar ao Painel e verificar sincronização
    await page.locator('aside button').filter({ hasText: /Painel/i }).first().click();
    await page.waitForTimeout(1500);

    const avatarFinal = parseInt((await avatarBadge.textContent()).trim(), 10);
    const cardFinal = parseInt((await page.locator('[data-testid="unread-total-counter"]').getAttribute('data-unread-count')) || '0', 10);

    console.log(`  👤 Avatar após leitura no Correio: ${avatarFinal}`);
    console.log(`  📦 Card Painel após leitura no Correio: ${cardFinal}`);

    assert(avatarFinal === cardFinal, `Avatar (${avatarFinal}) e Card do Painel (${cardFinal}) permanecem rigorosamente sincronizados`);
    assert(avatarFinal === avatarTotalPosInq - 1, `Avatar decrementou exatamente em 1 após leitura no Correio (${avatarTotalPosInq} -> ${avatarFinal})`);

    await page.screenshot({ path: path.join(screenshotDir, 'sintonia_painel_avatar_final.png'), fullPage: true });

    // =========================================================================
    // VERIFICAÇÃO 6: RESPONSIVIDADE MOBILE (390x844)
    // =========================================================================
    console.log('\n📱 8. Testando Sincronização em Modo Mobile (390x844)...');
    const mobContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const mobPage = await mobContext.newPage();

    await mobPage.goto('http://localhost:3000/#/entrar', { waitUntil: 'domcontentloaded' });
    await mobPage.waitForTimeout(1000);

    const mobBi = mobPage.locator('input[name="cda-utilizador"], input[type="text"]:visible, input:not([type]):visible').first();
    await mobBi.fill(citizenKey);
    const mobPass = mobPage.locator('input[name="cda-senha"], input[type="password"]:visible').first();
    await mobPass.fill('123456');
    await mobPage.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await mobPage.waitForTimeout(2500);

    // Injetar 1 Comunicado no mobile
    await mobPage.evaluate(({ citizenKey }) => {
      const msg1 = {
        id: 301,
        org: 'SME',
        institution: 'SME',
        preview: 'Emissão de Passaporte Eletrónico',
        date: 'Hoje',
        unread: 1,
        status: 'Recebido',
        recipientBi: citizenKey,
        details: { subject: 'Emissão de Passaporte Eletrónico', body: 'O seu passaporte está pronto para levantamento.' }
      };
      const msg2 = {
        id: 302,
        org: 'Governo Provincial de Luanda',
        institution: 'GPL',
        preview: '[COMUNICADO OFICIAL] Obras na Marginal',
        date: 'Hoje',
        unread: 1,
        status: 'Recebido',
        recipientBi: citizenKey,
        details: { subject: '[COMUNICADO OFICIAL] Obras na Marginal', body: 'Condicionamento de trânsito.', category: 'Comunicado Oficial' }
      };
      const notifCom = {
        id: 402,
        title: 'Comunicado Oficial',
        message: 'Aviso de obras na marginal de Luanda',
        targetTab: 'comunicados',
        unread: true,
        messageId: 302
      };
      localStorage.setItem('correio_digital_inbox', JSON.stringify([msg1, msg2]));
      localStorage.setItem('correio_digital_notifications', JSON.stringify([notifCom]));
    }, { citizenKey });

    await mobPage.reload({ waitUntil: 'domcontentloaded' });
    await mobPage.waitForTimeout(2000);

    const mobAvatarBadge = mobPage.locator('[data-testid="avatar-unread-badge"]:visible').first();
    await mobAvatarBadge.waitFor({ state: 'visible', timeout: 5000 });
    const mobAvatarCount = parseInt((await mobAvatarBadge.textContent()).trim(), 10);
    const mobCardTotal = parseInt((await mobPage.locator('[data-testid="unread-total-counter"]').getAttribute('data-unread-count')) || '0', 10);
    console.log(`  📱 Mobile Avatar Badge: ${mobAvatarCount}`);
    console.log(`  📱 Mobile Card Painel: ${mobCardTotal}`);
    assert(mobAvatarCount === mobCardTotal, `Mobile: Avatar Badge (${mobAvatarCount}) coincide exatamente com o Card do Painel (${mobCardTotal})`);
    assert(mobAvatarCount >= 2, 'Mobile: Contagem acumulada é >= 2');

    const mobBadgeComunicados = mobPage.locator('[data-testid="atalho-comunicados"] [data-notification-badge="comunicados"]');
    await mobBadgeComunicados.waitFor({ state: 'visible', timeout: 5000 });
    assert(await mobBadgeComunicados.isVisible(), 'Mobile: Badge «Comunicados» perfeitamente visível na grelha');

    await mobPage.screenshot({ path: path.join(screenshotDir, 'mobile_sintonia_badges.png'), fullPage: true });

    await mobContext.close();
    await desktopContext.close();

    console.log(`\n======================================================`);
    console.log(`🎉 RESULTADO FINAL: ${passedTests} de ${totalTests} asserções PASSARAM COM 100% DE SUCESSO!`);
    console.log(`======================================================`);

  } catch (err) {
    console.error('❌ Falha na bateria E2E de Sintonia de Badges:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
