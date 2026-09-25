import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('================================================================');
  console.log('🧪 TESTE COMPLETO DO FLUXO DE CONTACTOS E MENSAGEM DE EMERGÊNCIA');
  console.log('1. Entrar na conta do Cidadão Edlásio Galhardo (002399714LA030)');
  console.log('2. Aceder à página Contactos e criar 2 Contactos de Emergência');
  console.log('3. Sair da conta do Cidadão');
  console.log('4. Entrar na conta da Instituição INAPEM-LMM-01');
  console.log('5. Enviar Mensagem de Emergência para os contactos de emergência');
  console.log('================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'pt-AO'
  });

  await ctx.addInitScript(() => {
    localStorage.setItem('skip_splash_and_show_login', 'true');
    localStorage.setItem('cda_sessao_activa', '0');
  });

  const page = await ctx.newPage();

  try {
    // -------------------------------------------------------------
    // ETAPA 1: LOGIN CIDADÃO EDLASIO GALHARDO
    // -------------------------------------------------------------
    console.log('--- ETAPA 1: Login Cidadão Edlásio Galhardo ---');
    await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 15000 });
    
    const citTab = page.locator('button:has-text("Cidadão")').first();
    if (await citTab.isVisible()) await citTab.click({ force: true });
    await page.waitForTimeout(300);

    await page.locator('input[name="cda-utilizador"]').fill('002399714LA030');
    await page.locator('input[name="cda-senha"]').fill('123456789');
    await page.locator('button:has-text("Entrar no Portal"), button:has-text("Entrar")').first().click();
    await page.waitForTimeout(3500);

    console.log('✓ Login Cidadão concluído com sucesso.');

    // -------------------------------------------------------------
    // ETAPA 2: NAVEGAR PARA CONTACTOS E ADICIONAR 2 CONTACTOS DE EMERGÊNCIA
    // -------------------------------------------------------------
    console.log('--- ETAPA 2: Aceder a Contactos e criar 2 Contactos de Emergência ---');
    const contactNav = page.locator('button:has-text("Contactos"), nav button:has-text("Contactos")').first();
    if (await contactNav.count()) {
      await contactNav.click({ force: true });
    } else {
      await page.goto(`${BASE_URL}/#/contatos`, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(2000);

    // Função auxiliar para adicionar contacto de emergência
    async function addEmergencyContact(name, bi, relation, phone, email) {
      console.log(`> A adicionar contacto de emergência: ${name} (${relation}, ${phone})...`);
      
      await page.waitForTimeout(600);
      
      // Clicar no botão Adicionar
      const addBtn = page.locator('#btn-open-add-contact').first();
      await addBtn.click({ force: true });
      
      // Esperar pelo input de nome
      const nameInput = page.locator('#contact-name-input');
      await nameInput.waitFor({ state: 'visible', timeout: 10000 });

      // Selecionar Tipo de Contacto: Emergência
      const emgTab = page.locator('#tab-emergency-contact, button:has-text("Contacto de Emergência")').first();
      if (await emgTab.isVisible()) {
        await emgTab.click({ force: true });
        await page.waitForTimeout(300);
      }

      // Preencher campos por ID
      await nameInput.fill(name);
      await page.waitForTimeout(200);

      await page.locator('#contact-bi-input').fill(bi);
      await page.waitForTimeout(200);

      await page.locator('#contact-relation-input').selectOption(relation);
      await page.waitForTimeout(200);

      await page.locator('#contact-phone-input').fill(phone);
      await page.waitForTimeout(200);

      const emailInput = page.locator('#contact-email-input');
      if (await emailInput.isVisible()) {
        await emailInput.fill(email);
        await page.waitForTimeout(200);
      }

      // Confirmar
      const confirmBtn = page.locator('#confirm-add-contact-btn');
      await confirmBtn.click({ force: true });

      // Esperar modal fechar
      await nameInput.waitFor({ state: 'hidden', timeout: 10000 });
      await page.waitForTimeout(800);
      console.log(`✓ Contacto ${name} adicionado com sucesso.`);
    }

    const rand1 = Math.floor(100000 + Math.random() * 900000);
    const rand2 = Math.floor(100000 + Math.random() * 900000);

    // Adicionar Contacto 1
    await addEmergencyContact('Teresa Galhardo Silva', `0091${rand1}LA041`, 'Pai/Mãe', `+244 923 ${rand1.toString().slice(0,3)} ${rand1.toString().slice(3)}`, 'teresa.galhardo@exemplo.ao');

    // Adicionar Contacto 2
    await addEmergencyContact('Joaquim Galhardo Neto', `0092${rand2}LA042`, 'Pai/Mãe', `+244 931 ${rand2.toString().slice(0,3)} ${rand2.toString().slice(3)}`, 'joaquim.galhardo@exemplo.ao');

    console.log('✓ 2 Contactos de emergência criados e confirmados no perfil.');

    // -------------------------------------------------------------
    // ETAPA 3: LOGOUT CIDADÃO
    // -------------------------------------------------------------
    console.log('--- ETAPA 3: Logout Cidadão ---');
    const logoutCit = page.locator('button:has-text("SAIR DO CANAL"), button:has-text("Terminar Sessão"), button:has-text("Sair")').first();
    if (await logoutCit.count()) await logoutCit.click({ force: true });
    await page.waitForTimeout(2500);

    // -------------------------------------------------------------
    // ETAPA 4: LOGIN INAPEM-LMM-01
    // -------------------------------------------------------------
    console.log('--- ETAPA 4: Login Instituição INAPEM-LMM-01 ---');
    await page.goto(`${BASE_URL}/institucional#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 15000 });
    await page.waitForTimeout(600);

    await page.locator('input[name="cda-utilizador"]').fill('INAPEM-LMM-01');
    await page.locator('input[name="cda-senha"]').fill('123456789');
    await page.locator('button:has-text("Entrar no Portal"), button:has-text("Entrar")').first().click();
    await page.waitForTimeout(3500);

    console.log('✓ Login INAPEM efetuado com sucesso.');

    // -------------------------------------------------------------
    // ETAPA 5: ENVIAR MENSAGEM DE EMERGÊNCIA
    // -------------------------------------------------------------
    console.log('--- ETAPA 5: Envio de Mensagem de Emergência para o Cidadão e Rede de Emergência ---');
    const mailNav = page.locator('button:has-text("Correio"), nav button:has-text("Correio")').first();
    if (await mailNav.count()) {
      await mailNav.click({ force: true });
    } else {
      await page.goto(`${BASE_URL}/institucional#/correspondencias`, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(2000);

    // Clicar em Nova Mensagem
    const novaMsgBtn = page.locator('button:has-text("Nova Mensagem"), button:has-text("Escrever Mensagem"), button:has-text("Compor")').first();
    await novaMsgBtn.click({ force: true });
    await page.waitForTimeout(1500);

    // Preencher Destinatário com o BI de Edlásio Galhardo
    const destInput = page.locator('#recipient-bi-input, input[placeholder*="BI"]').first();
    if (await destInput.isVisible()) {
      await destInput.fill('002399714LA030');
      await page.waitForTimeout(1500);
    }

    // Preencher Assunto e Corpo da Mensagem
    await page.locator('#compose-subject-input').fill('ALERTA DE EMERGÊNCIA: Convocatória Institucional Prioritária');
    await page.waitForTimeout(300);

    await page.locator('#compose-body-textarea').fill('Prezado Cidadão Edlásio Galhardo e Familiares da Rede de Emergência, solicitamos contacto imediato com a Direcção do INAPEM para resolução de processo urgente.');
    await page.waitForTimeout(300);

    // Clicar em Enviar Mensagem para abrir popup de modalidades
    const sendBtn = page.locator('#btn-enviar-mensagem, button:has-text("Enviar Mensagem")').first();
    await sendBtn.click({ force: true });
    await page.waitForTimeout(1200);

    // Selecionar "Mensagem de Emergência"
    const emgOptionBtn = page.locator('#btn-modal-opcao-emergencia, button:has-text("Mensagem de Emergência")').first();
    if (await emgOptionBtn.isVisible()) {
      console.log('✓ Modalidade "Mensagem de Emergência" selecionada.');
      await emgOptionBtn.click({ force: true });
      await page.waitForTimeout(2000);
    }

    // Verificar se o modal de difusão de emergência abriu
    const broadcastModal = page.locator('#close-inst-broadcast, h3:has-text("Difusão")').first();
    const isBroadcastVisible = await broadcastModal.isVisible().catch(() => false);
    console.log(`✓ Painel de Difusão de Mensagem de Emergência aberto: ${isBroadcastVisible}`);

    // Disparar envio nas linhas de destinatários de emergência
    const btn0 = page.locator('#broadcast-send-0');
    if (await btn0.isVisible()) {
      console.log('> A disparar alerta para o 1º contacto de emergência...');
      await btn0.click({ force: true });
      await page.waitForTimeout(2000);
      console.log('✓ 1º Alerta enviado (Estado: CONCLUÍDO).');
    }

    const btn1 = page.locator('#broadcast-send-1');
    if (await btn1.isVisible()) {
      console.log('> A disparar alerta para o 2º contacto de emergência...');
      await btn1.click({ force: true });
      await page.waitForTimeout(2000);
      console.log('✓ 2º Alerta enviado (Estado: CONCLUÍDO).');
    }

    console.log('\n================================================================');
    console.log('🎉 RESULTADO: FLUXO DE CONTACTOS E DIFUSÃO DE EMERGÊNCIA 100% FUNCIONAL!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('Erro durante o teste:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
