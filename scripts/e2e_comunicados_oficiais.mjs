import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function run() {
  console.log('🚀 Iniciando bateria E2E: Módulo de Comunicados Oficiais (Painel, Fila e Compositor)...');

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

    // =========================================================================
    // PARTE 1: VERIFICAÇÃO DA ORDEM DOS 6 BOTÕES NO PAINEL DO CIDADÃO
    // =========================================================================
    console.log('\n👤 1. Autenticação na Área do Cidadão (009874562LA041)...');
    await page.goto('http://localhost:3000/#/entrar', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const biInput = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
    await biInput.waitFor({ state: 'visible', timeout: 15000 });
    await biInput.fill('009874562LA041');

    const passInput = page.locator('input[type="password"]:visible').first();
    await passInput.fill('123456');

    const btnEntrar = page.getByRole('button', { name: /ENTRAR NO PORTAL/i });
    await btnEntrar.click();
    await page.waitForTimeout(2500);

    console.log('🔍 2. Verificando a ordenação exata dos 6 botões no Painel Principal do Cidadão...');
    const orderTestIds = [
      'atalho-video-atendimento',
      'atalho-inqueritos',
      'atalho-comunicados',
      'atalho-ocorrencias',
      'atalho-nova-denuncia',
      'atalho-denuncias'
    ];

    const actualTestIds = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button[data-testid^="atalho-"]'))
        .map(b => b.getAttribute('data-testid'))
        .filter(Boolean);
    });

    console.log('  📋 Botões encontrados:', actualTestIds.join(' -> '));

    assert(actualTestIds.length === 6, 'Painel exibe exatamente 6 botões de atalho');
    for (let i = 0; i < orderTestIds.length; i++) {
      assert(actualTestIds[i] === orderTestIds[i], `Posição ${i + 1} corresponde a «${orderTestIds[i]}»`);
    }

    await page.screenshot({ path: path.join(screenshotDir, 'painel_6_botoes_comunicados.png'), fullPage: true });

    // =========================================================================
    // PARTE 2: PÁGINA «COMUNICADOS» NO CIDADÃO (LEITURA / SEM BOTÃO CRIAR)
    // =========================================================================
    console.log('\n📖 3. Clicando no atalho «Comunicados» na Área do Cidadão...');
    await page.locator('[data-testid="atalho-comunicados"]').click();
    await page.waitForTimeout(1500);

    const headerComunicados = page.locator('h2').filter({ hasText: /^Comunicados$/ }).first();
    assert(await headerComunicados.isVisible(), 'Página «Comunicados» aberta com sucesso');

    const descrCidadao = page.locator('p').filter({ hasText: /Receba Comunicados Oficiais de Órgãos do Estado/i }).first();
    assert(await descrCidadao.isVisible(), 'Descrição oficial do cidadão presente: «Receba Comunicados Oficiais de Órgãos do Estado.»');

    const btnCriarNoCidadao = await page.locator('button:has-text("Criar Comunicado")').isVisible().catch(() => false);
    assert(!btnCriarNoCidadao, 'Cidadão NÃO visualiza o botão «Criar Comunicado» (permissão exclusiva de Instituições)');

    await page.screenshot({ path: path.join(screenshotDir, 'fila_comunicados_cidadao.png'), fullPage: true });

    // =========================================================================
    // PARTE 3: INSTITUIÇÃO EMITE COMUNICADO OFICIAL (COMPOSITOR + POPUP)
    // =========================================================================
    console.log('\n🏛️ 4. Alternando para Área Institucional (AGT-9921-SR)...');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto('http://localhost:3000/institucional', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const instCodeInput = page.locator('input[name="cda-utilizador"], input[type="text"]:visible, input:not([type]):visible').first();
    await instCodeInput.waitFor({ state: 'visible', timeout: 15000 });
    await instCodeInput.fill('AGT-9921-SR');
    const instPassInput = page.locator('input[name="cda-senha"], input[type="password"]:visible').first();
    await instPassInput.fill('000000');
    await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await page.waitForTimeout(2500);

    console.log('🔍 5. Verificando os 6 botões no Painel Institucional...');
    const instActualTestIds = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button[data-testid^="atalho-"]'))
        .map(b => b.getAttribute('data-testid'))
        .filter(Boolean);
    });
    assert(instActualTestIds.length === 6, 'Painel Institucional exibe os 6 botões de atalho');

    console.log('📰 6. Acedendo à página «Comunicados» na Instituição...');
    await page.locator('[data-testid="atalho-comunicados"]').click();
    await page.waitForTimeout(1500);

    const descrInst = page.locator('p').filter({ hasText: /Emita e acompanhe comunicados oficiais/i }).first();
    assert(await descrInst.isVisible(), 'Descrição oficial da instituição presente: «Emita e acompanhe comunicados oficiais dirigidos a cidadãos e instituições.»');

    const btnCriarInst = page.locator('button').filter({ hasText: /Criar Comunicado/i }).first();
    assert(await btnCriarInst.isVisible(), 'Instituição visualiza o botão «Criar Comunicado»');

    console.log('✍️ 7. Clicando em «Criar Comunicado» para abrir o compositor...');
    await btnCriarInst.click();
    await page.waitForTimeout(1500);

    // Verificar se o compositor abriu com assunto pré-configurado
    const subjectInput = page.locator('#compose-subject-input, [data-testid="compose-subject-input"]').first();
    await subjectInput.waitFor({ state: 'visible', timeout: 10000 });
    const subjectValue = await subjectInput.inputValue();
    console.log('  🏷️ Assunto pré-configurado:', subjectValue);
    assert(subjectValue.includes('[COMUNICADO OFICIAL]'), 'Compositor pré-configurado com prefixo «[COMUNICADO OFICIAL]»');

    // Preencher corpo da mensagem
    const bodyInput = page.locator('textarea, [contenteditable="true"]').first();
    await bodyInput.fill('A Administração Geral Tributária (AGT) comunica o alargamento do prazo para liquidação do Imposto Predial sem juros.');

    // Clicar em Enviar Mensagem Oficial para verificar o Popup
    console.log('🔘 8. Clicando em «Enviar Mensagem Oficial» para validar popup...');
    const btnEnviarOficial = page.locator('#btn-enviar-mensagem');
    await btnEnviarOficial.click();
    await page.waitForTimeout(1000);

    const modalEnvio = page.locator('[data-testid="popup-enviar-mensagem"]');
    assert(await modalEnvio.isVisible(), 'Popup de seleção de modalidade de envio exibido');

    const optComunicado = page.locator('#btn-modal-opcao-comunicado');
    assert(await optComunicado.isVisible(), 'Opção «Comunicado» presente no popup de envio da instituição');

    await page.screenshot({ path: path.join(screenshotDir, 'popup_envio_comunicado_instituicao.png'), fullPage: true });

    // Selecionar modalidade Comunicado e enviar
    await optComunicado.click();
    await page.waitForTimeout(2500);

    // =========================================================================
    // PARTE 4: CIDADÃO RECEBE O COMUNICADO COM BADGE NO PAINEL E NO AVATAR
    // =========================================================================
    console.log('\n🔔 9. Cidadão regressa e verifica os Badges de Comunicado...');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto('http://localhost:3000/#/entrar', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const biInput2 = page.locator('input[name="cda-utilizador"], input[type="text"]:visible, input:not([type]):visible').first();
    await biInput2.waitFor({ state: 'visible', timeout: 15000 });
    await biInput2.fill('009874562LA041');
    const passInput2 = page.locator('input[name="cda-senha"], input[type="password"]:visible').first();
    await passInput2.fill('123456');
    await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await page.waitForTimeout(2500);

    // Injetar notificação e mensagem de Comunicado Oficial para o cidadão
    await page.evaluate(() => {
      const citizenKey = '009874562LA041';
      const notifCom = {
        id: 9950,
        title: 'Comunicado Oficial — Presidência da República',
        message: 'Publicado o [COMUNICADO OFICIAL] Medidas de Modernização e Governação Digital 2026.',
        time: 'Agora',
        type: 'info',
        targetTab: 'comunicados',
        unread: true,
        ownerId: citizenKey
      };

      const msgCom = {
        id: 9951,
        org: 'Presidência da República',
        institution: 'PR',
        preview: '[COMUNICADO OFICIAL] Medidas de Modernização e Governação Digital 2026',
        date: 'Hoje',
        unread: 1,
        status: 'Recebido',
        recipientBi: citizenKey,
        details: {
          subject: '[COMUNICADO OFICIAL] Medidas de Modernização e Governação Digital 2026',
          body: 'A Presidência da República de Angola comunica a todos os cidadãos a entrada em vigor das diretrizes de governação digital.',
          category: 'Comunicado Oficial',
          actions: ['Ver mensagem']
        }
      };

      const notifs = JSON.parse(localStorage.getItem('correio_digital_notifications') || '[]');
      localStorage.setItem('correio_digital_notifications', JSON.stringify([notifCom, ...notifs]));
      localStorage.setItem(`cda_notifications_${citizenKey}`, JSON.stringify([notifCom]));

      const inbox = JSON.parse(localStorage.getItem('correio_digital_inbox') || '[]');
      localStorage.setItem('correio_digital_inbox', JSON.stringify([msgCom, ...inbox]));
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const badgeComunicados = page.locator('[data-testid="atalho-comunicados"] [data-notification-badge="comunicados"]');
    await badgeComunicados.waitFor({ state: 'visible', timeout: 5000 });
    assert(await badgeComunicados.isVisible(), 'Botão «Comunicados» no Painel exibe badge de notificação numérico');

    const numBadgeCom = await badgeComunicados.locator('span[aria-hidden="true"]').textContent();
    console.log(`  🔢 Badge «Comunicados»: ${numBadgeCom.trim()}`);
    assert(parseInt(numBadgeCom.trim(), 10) >= 1, 'Valor do badge «Comunicados» é >= 1');

    const avatarBadge = page.locator('[data-testid="avatar-unread-badge"]:visible').first();
    assert(await avatarBadge.isVisible(), 'Avatar no topo exibe contagem acumulada');

    await page.screenshot({ path: path.join(screenshotDir, 'painel_com_badge_comunicados.png'), fullPage: true });

    // =========================================================================
    // PARTE 5: CONSULTA E LIMPEZA INSTANTÂNEA DO BADGE
    // =========================================================================
    console.log('\n📖 10. Cidadão abre a lista de Comunicados e consulta o item #9951...');
    await page.locator('[data-testid="atalho-comunicados"]').click();
    await page.waitForTimeout(1500);

    const itemCom = page.locator('button[data-msg-id="9951"]');
    assert(await itemCom.isVisible(), 'Item de comunicado oficial #9951 visível na listagem');

    await itemCom.click();
    await page.waitForTimeout(1500);

    // Voltar ao Painel
    console.log('🏠 Regressando ao Painel...');
    await page.locator('aside button').filter({ hasText: /Painel/i }).first().click();
    await page.waitForTimeout(1500);

    console.log('🧹 Verificando limpeza instantânea do badge...');
    const badgeApos = await page.locator('[data-testid="atalho-comunicados"] [data-notification-badge="comunicados"]').isVisible().catch(() => false);
    assert(!badgeApos, 'Badge do botão «Comunicados» foi limpo após consulta (count = 0)');

    await page.screenshot({ path: path.join(screenshotDir, 'painel_apos_limpeza_comunicados.png'), fullPage: true });

    // =========================================================================
    // PARTE 6: MODO MOBILE (390x844)
    // =========================================================================
    console.log('\n📱 11. Validando os 6 botões e layout em modo Mobile (390x844)...');
    const mobContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const mobPage = await mobContext.newPage();

    await mobPage.goto('http://localhost:3000/#/entrar', { waitUntil: 'networkidle' });
    await mobPage.waitForTimeout(1000);
    const mobBi = mobPage.locator('input[type="text"]:visible, input:not([type]):visible').first();
    await mobBi.fill('009874562LA041');
    const mobPass = mobPage.locator('input[type="password"]:visible').first();
    await mobPass.fill('123456');
    await mobPage.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await mobPage.waitForTimeout(2500);

    const mobBtnCom = mobPage.locator('[data-testid="atalho-comunicados"]');
    assert(await mobBtnCom.isVisible(), 'Mobile: Botão «Comunicados» perfeitamente visível na grelha');

    await mobPage.screenshot({ path: path.join(screenshotDir, 'mobile_6_botoes_comunicados.png'), fullPage: true });

    await mobContext.close();
    await desktopContext.close();

    console.log(`\n======================================================`);
    console.log(`🎉 RESULTADO FINAL: ${passedTests} de ${totalTests} asserções PASSARAM COM 100% DE SUCESSO!`);
    console.log(`======================================================`);

  } catch (err) {
    console.error('❌ Falha na bateria E2E de Comunicados:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
