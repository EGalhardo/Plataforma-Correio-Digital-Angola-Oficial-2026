import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function run() {
  console.log('🚀 Iniciando bateria E2E de Notificações e Badges para Denúncias e Reclamações...');

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
    // =========================================================================
    // PARTE 1: SESSÃO DO CIDADÃO — VERIFICAÇÃO DE BADGES (DENÚNCIA, RECLAMAÇÃO E AVATAR)
    // =========================================================================
    console.log('\n👤 1. Autenticação na Área do Cidadão (Edlasio Galhardo - 009874562LA041)...');
    const citizenContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const citizenPage = await citizenContext.newPage();

    await citizenPage.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await citizenPage.waitForTimeout(1000);

    const biInput = citizenPage.locator('input[type="text"]:visible, input:not([type]):visible').first();
    await biInput.waitFor({ state: 'visible', timeout: 15000 });
    await biInput.fill('009874562LA041');

    const passInput = citizenPage.locator('input[type="password"]:visible').first();
    await passInput.fill('123456');

    const btnEntrar = citizenPage.getByRole('button', { name: /ENTRAR NO PORTAL/i });
    await btnEntrar.click();
    await citizenPage.waitForTimeout(2500);

    // -------------------------------------------------------------------------
    // Cenário 1: Injeção de atualizações de cronograma em Denúncia e Reclamação
    // -------------------------------------------------------------------------
    console.log('\n🔔 2. Emitindo atualizações de tramitação de cronograma (Denúncia e Reclamação)...');
    await citizenPage.evaluate(() => {
      const citizenKey = '009874562LA041';
      
      const notifDenuncia = {
        id: 8801,
        title: 'Denuncia — Em Análise',
        message: 'A sua denúncia passou para o estado «Em Análise». (Irregularidade Tributária Luanda)',
        time: 'Agora',
        type: 'info',
        targetTab: 'nova-denuncia',
        unread: true,
        ownerId: citizenKey
      };

      const notifReclamacao = {
        id: 8802,
        title: 'Reclamação — Investigação Técnica',
        message: 'A sua reclamação passou para o estado «Investigação Técnica». (Cobrança Indevida ENDE)',
        time: 'Agora',
        type: 'info',
        targetTab: 'denuncias',
        unread: true,
        ownerId: citizenKey
      };

      const mockSent = [
        {
          id: 701,
          org: 'AGT',
          preview: '[NOVA DENÚNCIA] Irregularidade Tributária Luanda',
          date: 'Hoje',
          unread: 1,
          novidade: true,
          status: 'Fase: Em Análise',
          senderKey: citizenKey,
          details: {
            subject: '[REGISTO DE DENÚNCIA] Irregularidade Tributária Luanda',
            body: 'Denúncia de teste de irregularidade fiscal...',
            actions: ['Ver mensagem']
          }
        },
        {
          id: 702,
          org: 'ENDE',
          preview: '[RECLAMAÇÃO] Cobrança Indevida ENDE',
          date: 'Ontem',
          unread: 1,
          novidade: true,
          status: 'Fase: Investigação Técnica',
          senderKey: citizenKey,
          details: {
            subject: '[DENÚNCIA] Cobrança Indevida ENDE',
            body: 'Reclamação de cobrança...',
            actions: ['Ver mensagem']
          }
        }
      ];

      localStorage.setItem('correio_digital_notifications', JSON.stringify([notifDenuncia, notifReclamacao]));
      localStorage.setItem(`cda_notifications_${citizenKey}`, JSON.stringify([notifDenuncia, notifReclamacao]));
      localStorage.setItem('correio_digital_sent', JSON.stringify(mockSent));
      localStorage.setItem('correio_digital_deleted_message_ids', JSON.stringify([]));
      localStorage.setItem('correio_digital_hidden_messages', JSON.stringify([]));
    });

    await citizenPage.reload({ waitUntil: 'networkidle' });
    await citizenPage.waitForTimeout(1500);

    // -------------------------------------------------------------------------
    // 3. Verificar Badges no Painel e no Avatar do Cidadão
    // -------------------------------------------------------------------------
    console.log('🔍 3. Verificando indicadores visuais (badges) no Painel do Cidadão...');

    const badgeNovaDenuncia = citizenPage.locator('[data-testid="atalho-nova-denuncia"] [data-notification-badge="nova-denuncia"]');
    const badgeReclamacao = citizenPage.locator('[data-testid="atalho-denuncias"] [data-notification-badge="denuncias"]');

    await badgeNovaDenuncia.waitFor({ state: 'visible', timeout: 5000 });
    await badgeReclamacao.waitFor({ state: 'visible', timeout: 5000 });

    assert(await badgeNovaDenuncia.isVisible(), 'Botão «Denuncia» exibe badge de notificação');
    assert(await badgeReclamacao.isVisible(), 'Botão «Livro de Reclamações» exibe badge de notificação');

    const numBadgeDenuncia = await badgeNovaDenuncia.locator('span[aria-hidden="true"]').textContent();
    const numBadgeReclamacao = await badgeReclamacao.locator('span[aria-hidden="true"]').textContent();
    console.log(`  🔢 Contadores nos botões: Denúncia=${numBadgeDenuncia.trim()} | Livro de Reclamações=${numBadgeReclamacao.trim()}`);

    assert(parseInt(numBadgeDenuncia.trim(), 10) >= 1, 'Badge «Denuncia» contém contagem positiva');
    assert(parseInt(numBadgeReclamacao.trim(), 10) >= 1, 'Badge «Livro de Reclamações» contém contagem positiva');

    // Verificar badge no Avatar de Perfil (Header)
    const headerAvatarBadge = citizenPage.locator('[data-testid="avatar-unread-badge"]:visible').first();
    assert(await headerAvatarBadge.isVisible(), 'Foto de perfil / Avatar no Header exibe badge de notificações acumuladas');
    const txtAvatarBadge = await headerAvatarBadge.textContent();
    console.log(`  👤 Contador no Avatar: ${txtAvatarBadge.trim()}`);
    assert(parseInt(txtAvatarBadge.trim(), 10) >= 2, 'Contador acumulado no Avatar reflete as novidades não lidas');

    await citizenPage.screenshot({ path: path.join(screenshotDir, 'painel_com_badges_denuncia_reclamacao.png'), fullPage: true });

    // -------------------------------------------------------------------------
    // 4. Interação: Clicar no botão «Denuncia» e abrir o item com novidade
    // -------------------------------------------------------------------------
    console.log('\n👆 4. Clicando no botão de atalho «Denuncia»...');
    const btnAtalhoDenuncia = citizenPage.locator('[data-testid="atalho-nova-denuncia"]');
    await btnAtalhoDenuncia.click();
    await citizenPage.waitForTimeout(1500);

    const headerDenuncia = citizenPage.locator('h2').filter({ hasText: /^Denuncia$/ }).first();
    assert(await headerDenuncia.isVisible(), 'Página da fila de Denúncias aberta com sucesso');

    const itemDenuncia = citizenPage.locator('button[data-msg-id="701"]');
    assert(await itemDenuncia.isVisible(), 'Item de denúncia com actualização (#701) está presente na lista');

    console.log('📖 Abrindo detalhe da denúncia #701...');
    await itemDenuncia.click();
    await citizenPage.waitForTimeout(1500);

    const cronogramaSection = citizenPage.locator('[data-testid="cronograma-denuncia"]');
    assert(await cronogramaSection.isVisible(), 'Cronograma da denúncia visível no detalhe');

    // Voltar para a lista e depois para o Painel inicial
    console.log('🏠 Voltando para o Painel...');
    const btnVoltarMsg = citizenPage.getByRole('button', { name: /Voltar/i }).first();
    await btnVoltarMsg.click();
    await citizenPage.waitForTimeout(1000);

    const btnVoltarLista = citizenPage.getByRole('button', { name: /Voltar/i }).first();
    await btnVoltarLista.click();
    await citizenPage.waitForTimeout(1500);

    // -------------------------------------------------------------------------
    // 5. Verificar que o badge da Denúncia foi limpo / decrementado
    // -------------------------------------------------------------------------
    console.log('🧹 5. Verificando que o badge da «Denuncia» foi decrementado/limpo...');
    const badgeDenunciaApos = await citizenPage.locator('[data-testid="atalho-nova-denuncia"] [data-notification-badge="nova-denuncia"]').isVisible().catch(() => false);
    assert(!badgeDenunciaApos, 'Badge «Denuncia» desapareceu após leitura e consulta do item');

    await citizenPage.screenshot({ path: path.join(screenshotDir, 'painel_apos_leitura_denuncia.png'), fullPage: true });

    // =========================================================================
    // PARTE 2: TESTE EM MODO MOBILE (390x844)
    // =========================================================================
    console.log('\n📱 6. Testando exibição de Badges em Modo Mobile (390x844)...');
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const mobilePage = await mobileContext.newPage();

    await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await mobilePage.waitForTimeout(1000);

    const mobBiInput = mobilePage.locator('input[type="text"]:visible, input:not([type]):visible').first();
    await mobBiInput.waitFor({ state: 'visible', timeout: 15000 });
    await mobBiInput.fill('009874562LA041');

    const mobPassInput = mobilePage.locator('input[type="password"]:visible').first();
    await mobPassInput.fill('123456');

    const mobBtnEntrar = mobilePage.getByRole('button', { name: /ENTRAR NO PORTAL/i });
    await mobBtnEntrar.click();
    await mobilePage.waitForTimeout(2500);

    // Injetar notificação de Reclamação no mobile
    await mobilePage.evaluate(() => {
      const citizenKey = '009874562LA041';
      const notifRec = {
        id: 9901,
        title: 'Reclamação — Em Análise',
        message: 'A sua reclamação passou para o estado «Em Análise». (Cobrança)',
        time: 'Agora',
        type: 'info',
        targetTab: 'denuncias',
        unread: true,
        ownerId: citizenKey
      };
      localStorage.setItem('correio_digital_notifications', JSON.stringify([notifRec]));
      localStorage.setItem(`cda_notifications_${citizenKey}`, JSON.stringify([notifRec]));
    });

    await mobilePage.reload({ waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1500);

    const mobBadgeReclamacao = mobilePage.locator('[data-testid="atalho-denuncias"] [data-notification-badge="denuncias"]');
    assert(await mobBadgeReclamacao.isVisible(), 'Mobile: Botão «Livro de Reclamações» exibe badge de notificação perfeitamente alinhado');

    const mobAvatarBadge = mobilePage.locator('[data-testid="avatar-unread-badge"]:visible').first();
    assert(await mobAvatarBadge.isVisible(), 'Mobile: Avatar superior exibe badge acumulado no topo');

    await mobilePage.screenshot({ path: path.join(screenshotDir, 'painel_mobile_badges_cronograma.png'), fullPage: true });

    await mobileContext.close();
    await citizenContext.close();

    console.log(`\n======================================================`);
    console.log(`🎉 RESULTADO FINAL: ${passedTests} de ${totalTests} asserções PASSARAM COM 100% DE SUCESSO!`);
    console.log(`======================================================`);

  } catch (err) {
    console.error('❌ Falha na execução do teste E2E:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
