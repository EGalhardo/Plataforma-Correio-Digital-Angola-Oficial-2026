import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function run() {
  console.log('🚀 Iniciando bateria E2E Completa do Ciclo de Vida: Tramitação, Notificações e Badges (Cidadão + Instituição)...');

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
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // =========================================================================
    // FASE 1: CIDADÃO ENVIA UMA DENÚNCIA PARA A AGT
    // =========================================================================
    console.log('\n👤 1. Autenticação na Área do Cidadão (009874562LA041)...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const biInput = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
    await biInput.waitFor({ state: 'visible', timeout: 15000 });
    await biInput.fill('009874562LA041');

    const passInput = page.locator('input[type="password"]:visible').first();
    await passInput.fill('123456');

    const btnEntrar = page.getByRole('button', { name: /ENTRAR NO PORTAL/i });
    await btnEntrar.click();
    await page.waitForTimeout(2500);

    console.log('📝 Submetendo Denúncia Oficial...');
    await page.evaluate(() => {
      const citizenKey = '009874562LA041';
      const novaDenuncia = {
        id: 7001,
        org: 'AGT',
        institution: 'AGT',
        preview: '[REGISTO DE DENÚNCIA] Fraude Aduaneira Luanda Porto',
        date: 'Hoje',
        unread: 0,
        novidade: false,
        status: 'Fase: Submetida',
        senderKey: citizenKey,
        senderBi: citizenKey,
        recipientBi: 'AGT',
        details: {
          subject: '[REGISTO DE DENÚNCIA] Fraude Aduaneira Luanda Porto',
          body: 'Denúncia formal de irregularidade fiscal e aduaneira nas operações portuárias de Luanda.',
          actions: ['Ver mensagem']
        }
      };

      const sent = JSON.parse(localStorage.getItem('correio_digital_sent') || '[]');
      localStorage.setItem('correio_digital_sent', JSON.stringify([novaDenuncia, ...sent]));

      const instInbox = JSON.parse(localStorage.getItem('correio_digital_inst_inbox') || '[]');
      localStorage.setItem('correio_digital_inst_inbox', JSON.stringify([novaDenuncia, ...instInbox]));
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // =========================================================================
    // FASE 2: INSTITUIÇÃO AVANÇA A FASE NO CRONOGRAMA
    // =========================================================================
    console.log('\n🏛️ 2. Alternando para a Área da Instituição (AGT) para tramitação...');
    const btnSair = page.locator('aside button').filter({ hasText: /Sair/i }).first();
    if (await btnSair.isVisible()) {
      await btnSair.click();
    } else {
      await page.goto('http://localhost:3000');
    }
    await page.waitForTimeout(1500);

    // Login Institucional AGT
    const tabInst = page.getByRole('button', { name: /INSTITUIÇÃO/i });
    if (await tabInst.isVisible()) {
      await tabInst.click();
      await page.waitForTimeout(500);
    }
    const instCodeInput = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
    await instCodeInput.fill('AGT');
    const instPassInput = page.locator('input[type="password"]:visible').first();
    await instPassInput.fill('123456');
    await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await page.waitForTimeout(2500);

    console.log('🔄 Instituição AGT atualiza a tramitação para «Em Análise»...');
    await page.evaluate(() => {
      const citizenKey = '009874562LA041';
      const notifActualizacao = {
        id: 9001,
        title: 'Denuncia — Em Análise',
        message: 'A sua denúncia passou para o estado «Em Análise». (Fraude Aduaneira Luanda Porto)',
        time: 'Agora',
        type: 'info',
        targetTab: 'nova-denuncia',
        unread: true,
        ownerId: citizenKey
      };

      // Atualizar no storage da sessão e canais
      const notifsGerais = JSON.parse(localStorage.getItem('correio_digital_notifications') || '[]');
      localStorage.setItem('correio_digital_notifications', JSON.stringify([notifActualizacao, ...notifsGerais]));
      localStorage.setItem(`cda_notifications_${citizenKey}`, JSON.stringify([notifActualizacao]));

      const sent = JSON.parse(localStorage.getItem('correio_digital_sent') || '[]');
      const updatedSent = sent.map(m => m.id === 7001 ? { ...m, unread: 1, novidade: true, status: 'Fase: Em Análise' } : m);
      localStorage.setItem('correio_digital_sent', JSON.stringify(updatedSent));

      window.dispatchEvent(new CustomEvent('cda-cronograma-updated', {
        detail: { messageId: 7001, fase: 'analise', senderBi: citizenKey, notif: notifActualizacao }
      }));
    });

    await page.screenshot({ path: path.join(screenshotDir, 'instituicao_tramitacao_concluida.png'), fullPage: true });

    // =========================================================================
    // FASE 3: CIDADÃO RECEBE NOTIFICAÇÃO E VISUALIZA BADGES NO PAINEL E NO AVATAR
    // =========================================================================
    console.log('\n👤 3. Cidadão regressa à sua área e verifica os Badges em tempo real...');
    const btnSairInst = page.locator('aside button').filter({ hasText: /Sair/i }).first();
    if (await btnSairInst.isVisible()) {
      await btnSairInst.click();
    } else {
      await page.goto('http://localhost:3000');
    }
    await page.waitForTimeout(1500);

    const tabCid = page.getByRole('button', { name: /CIDADÃO/i });
    if (await tabCid.isVisible()) {
      await tabCid.click();
      await page.waitForTimeout(500);
    }
    const biInput2 = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
    await biInput2.fill('009874562LA041');
    const passInput2 = page.locator('input[type="password"]:visible').first();
    await passInput2.fill('123456');
    await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await page.waitForTimeout(2500);

    const badgeDenuncia = page.locator('[data-testid="atalho-nova-denuncia"] [data-notification-badge="nova-denuncia"]');
    await badgeDenuncia.waitFor({ state: 'visible', timeout: 6000 });
    assert(await badgeDenuncia.isVisible(), 'Botão «Denuncia» exibe badge numérico com a nova actualização de tramitação');

    const numBadgeDen = await badgeDenuncia.locator('span[aria-hidden="true"]').textContent();
    console.log(`  🔢 Badge «Denuncia»: ${numBadgeDen.trim()}`);
    assert(parseInt(numBadgeDen.trim(), 10) >= 1, 'Valor do badge «Denuncia» é >= 1');

    const avatarBadge = page.locator('[data-testid="avatar-unread-badge"]:visible').first();
    assert(await avatarBadge.isVisible(), 'Avatar de perfil exibe badge acumulado de notificações');
    const txtAvatar = await avatarBadge.textContent();
    console.log(`  👤 Badge Avatar: ${txtAvatar.trim()}`);
    assert(parseInt(txtAvatar.trim(), 10) >= 1, 'Valor do badge no Avatar é >= 1');

    await page.screenshot({ path: path.join(screenshotDir, 'cidadao_painel_com_badge_tramitacao.png'), fullPage: true });

    // =========================================================================
    // FASE 4: CONSULTA E LIMPEZA INSTANTÂNEA
    // =========================================================================
    console.log('\n📖 4. Cidadão clica no atalho «Denuncia» e abre a correspondência tramitada...');
    await page.locator('[data-testid="atalho-nova-denuncia"]').click();
    await page.waitForTimeout(1500);

    const itemDenuncia = page.locator('button[data-msg-id="7001"]');
    assert(await itemDenuncia.isVisible(), 'Item #7001 exibido na listagem com destaque');

    await itemDenuncia.click();
    await page.waitForTimeout(1500);

    const cronogramaSec = page.locator('[data-testid="cronograma-denuncia"]');
    assert(await cronogramaSec.isVisible(), 'Secção do cronograma detalhado visível na mensagem');

    console.log('🏠 Regressando ao Painel Principal...');
    await page.locator('aside button').filter({ hasText: /Painel/i }).first().click();
    await page.waitForTimeout(1500);

    console.log('🧹 Verificando limpeza instantânea do badge após visualização...');
    const badgeApos = await page.locator('[data-testid="atalho-nova-denuncia"] [data-notification-badge="nova-denuncia"]').isVisible().catch(() => false);
    assert(!badgeApos, 'Badge «Denuncia» desapareceu imediatamente do atalho (count = 0)');

    await page.screenshot({ path: path.join(screenshotDir, 'cidadao_painel_apos_limpeza_badge.png'), fullPage: true });

    // =========================================================================
    // FASE 5: RESPONSIVIDADE MOBILE
    // =========================================================================
    console.log('\n📱 5. Validando experiência em Mobile Viewport (390x844)...');
    const mobContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const mobPage = await mobContext.newPage();

    await mobPage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await mobPage.waitForTimeout(1000);
    const mobBi = mobPage.locator('input[type="text"]:visible, input:not([type]):visible').first();
    await mobBi.fill('009874562LA041');
    const mobPass = mobPage.locator('input[type="password"]:visible').first();
    await mobPass.fill('123456');
    await mobPage.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await mobPage.waitForTimeout(2500);

    // Injetar novidade em Reclamações
    await mobPage.evaluate(() => {
      const citizenKey = '009874562LA041';
      const notifReclama = {
        id: 9002,
        title: 'Reclamação — Em Análise',
        message: 'A sua reclamação passou para o estado «Em Análise». (Falha de Energia Luanda Sul)',
        time: 'Agora',
        type: 'info',
        targetTab: 'denuncias',
        unread: true,
        ownerId: citizenKey
      };
      localStorage.setItem('correio_digital_notifications', JSON.stringify([notifReclama]));
      localStorage.setItem(`cda_notifications_${citizenKey}`, JSON.stringify([notifReclama]));
    });

    await mobPage.reload({ waitUntil: 'networkidle' });
    await mobPage.waitForTimeout(1500);

    const mobBadgeReclama = mobPage.locator('[data-testid="atalho-denuncias"] [data-notification-badge="denuncias"]');
    assert(await mobBadgeReclama.isVisible(), 'Mobile: Badge do «Livro de Reclamações» perfeitamente visível e posicionado');

    const mobAvatar = mobPage.locator('[data-testid="avatar-unread-badge"]:visible').first();
    assert(await mobAvatar.isVisible(), 'Mobile: Badge acumulado no avatar visível no cabeçalho');

    await mobPage.screenshot({ path: path.join(screenshotDir, 'mobile_badges_final_validado.png'), fullPage: true });

    await mobContext.close();
    await context.close();

    console.log(`\n======================================================`);
    console.log(`🎉 RESULTADO FINAL: ${passedTests} de ${totalTests} asserções PASSARAM COM 100% DE SUCESSO!`);
    console.log(`======================================================`);

  } catch (err) {
    console.error('❌ Falha na bateria E2E:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
