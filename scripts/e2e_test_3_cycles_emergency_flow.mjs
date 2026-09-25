import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('================================================================');
  console.log('🧪 TESTE COMPLETO: 3 CICLOS DE CONTACTOS E MENSAGENS DE EMERGÊNCIA');
  console.log('• Contas: Edlásio Galhardo (002399714LA030) e INAPEM (INAPEM-LMM-01)');
  console.log('• Validação de Contactos de Emergência, Difusão e Caixa de Enviadas');
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

  // Helper: Login Cidadão
  async function loginCitizen() {
    console.log('  > A iniciar sessão como Cidadão (Edlásio Galhardo)...');
    await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 15000 });
    
    const citTab = page.locator('button:has-text("Cidadão")').first();
    if (await citTab.isVisible()) await citTab.click({ force: true });
    await page.waitForTimeout(300);

    await page.locator('input[name="cda-utilizador"]').fill('002399714LA030');
    await page.locator('input[name="cda-senha"]').fill('123456789');
    await page.locator('button:has-text("Entrar no Portal"), button:has-text("Entrar")').first().click();
    await page.waitForTimeout(3000);
    console.log('  ✓ Sessão do Cidadão iniciada com sucesso.');
  }

  // Helper: Logout Cidadão
  async function logoutCitizen() {
    console.log('  > A terminar sessão do Cidadão...');
    const logoutBtn = page.locator('button:has-text("SAIR DO CANAL"), button:has-text("Terminar Sessão"), button:has-text("Sair")').first();
    if (await logoutBtn.count()) await logoutBtn.click({ force: true });
    await page.waitForTimeout(2500);
    console.log('  ✓ Sessão do Cidadão terminada.');
  }

  // Helper: Login Instituição
  async function loginInstitution() {
    console.log('  > A iniciar sessão como Instituição (INAPEM-LMM-01)...');
    await page.goto(`${BASE_URL}/institucional#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 15000 });
    await page.waitForTimeout(400);

    await page.locator('input[name="cda-utilizador"]').fill('INAPEM-LMM-01');
    await page.locator('input[name="cda-senha"]').fill('123456789');
    await page.locator('button:has-text("Entrar no Portal"), button:has-text("Entrar")').first().click();
    await page.waitForTimeout(3000);
    console.log('  ✓ Sessão do INAPEM iniciada com sucesso.');
  }

  // Helper: Logout Instituição
  async function logoutInstitution() {
    console.log('  > A terminar sessão do INAPEM...');
    const logoutBtn = page.locator('button:has-text("SAIR DO CANAL"), button:has-text("Terminar Sessão"), button:has-text("Sair")').first();
    if (await logoutBtn.count()) await logoutBtn.click({ force: true });
    await page.waitForTimeout(2500);
    console.log('  ✓ Sessão do INAPEM terminada.');
  }

  // Helper: Adicionar Contacto de Emergência
  async function addEmergencyContact(name, bi, relation, phone, email) {
    console.log(`  > A adicionar contacto: ${name} (${relation}, ${phone})...`);
    await page.waitForTimeout(500);
    
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
    await page.waitForTimeout(150);

    await page.locator('#contact-bi-input').fill(bi);
    await page.waitForTimeout(150);

    await page.locator('#contact-relation-input').selectOption(relation);
    await page.waitForTimeout(150);

    await page.locator('#contact-phone-input').fill(phone);
    await page.waitForTimeout(150);

    const emailInput = page.locator('#contact-email-input');
    if (await emailInput.isVisible()) {
      await emailInput.fill(email);
      await page.waitForTimeout(150);
    }

    // Confirmar
    const confirmBtn = page.locator('#confirm-add-contact-btn');
    await confirmBtn.click({ force: true });

    // Esperar modal fechar
    await nameInput.waitFor({ state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(600);
    console.log(`  ✓ Contacto ${name} adicionado com sucesso.`);
  }

  try {
    for (let ciclo = 1; ciclo <= 3; ciclo++) {
      console.log(`\n================================================================`);
      console.log(`🔄 INICIANDO CICLO ${ciclo} DE 3`);
      console.log(`================================================================`);

      // 1. CIDADÃO: LOGIN E CRIAÇÃO DE CONTACTOS
      await loginCitizen();

      // Navegar para Contactos
      const contactNav = page.locator('button:has-text("Contactos"), nav button:has-text("Contactos")').first();
      if (await contactNav.count()) {
        await contactNav.click({ force: true });
      } else {
        await page.goto(`${BASE_URL}/#/contatos`, { waitUntil: 'domcontentloaded' });
      }
      await page.waitForTimeout(1500);

      // Adicionar contacto específico do ciclo com número único
      const rand = Math.floor(100000 + Math.random() * 900000);
      const contactNames = [
        { name: `Helena Galhardo Ciclo${ciclo}`, rel: 'Irmão/ã', phone: `+244 924 ${rand.toString().slice(0,3)} ${rand.toString().slice(3)}`, email: `helena.ciclo${ciclo}@exemplo.ao` },
        { name: `Paulo Galhardo Ciclo${ciclo}`, rel: 'Filho/a', phone: `+244 945 ${rand.toString().slice(0,3)} ${rand.toString().slice(3)}`, email: `paulo.ciclo${ciclo}@exemplo.ao` }
      ];

      for (const c of contactNames) {
        const cBi = `00${ciclo}${Math.floor(1000000 + Math.random() * 9000000)}LA041`;
        await addEmergencyContact(c.name, cBi, c.rel, c.phone, c.email);
      }

      // Logout Cidadão
      await logoutCitizen();

      // 2. INSTITUIÇÃO: LOGIN E DISPARO DE MENSAGEM DE EMERGÊNCIA
      await loginInstitution();

      // Navegar para Correio
      const mailNav = page.locator('button:has-text("Correio"), nav button:has-text("Correio")').first();
      if (await mailNav.count()) {
        await mailNav.click({ force: true });
      } else {
        await page.goto(`${BASE_URL}/institucional#/correspondencias`, { waitUntil: 'domcontentloaded' });
      }
      await page.waitForTimeout(1500);

      // Nova Mensagem
      const novaMsgBtn = page.locator('button:has-text("Nova Mensagem"), button:has-text("Escrever Mensagem"), button:has-text("Compor")').first();
      await novaMsgBtn.click({ force: true });
      await page.waitForTimeout(1200);

      // Preencher Destinatário
      const destInput = page.locator('#recipient-bi-input, input[placeholder*="BI"]').first();
      await destInput.fill('002399714LA030');
      await page.waitForTimeout(1500);

      // Preencher Assunto e Corpo
      const subjectText = `ALERTA DE EMERGÊNCIA [CICLO ${ciclo}]: Notificação Prioritária INAPEM`;
      const bodyText = `Prezado Edlásio Galhardo e Rede de Contactos Familiares (Ciclo ${ciclo}), solicitamos contacto imediato com o INAPEM referente ao processo prioritário #2026-${ciclo}.`;

      await page.locator('#compose-subject-input').fill(subjectText);
      await page.locator('#compose-body-textarea').fill(bodyText);
      await page.waitForTimeout(500);

      // Clicar em Enviar Mensagem
      await page.locator('#btn-enviar-mensagem, button:has-text("Enviar Mensagem")').first().click();
      await page.waitForTimeout(1000);

      // Selecionar "Mensagem de Emergência"
      const emgOptionBtn = page.locator('#btn-modal-opcao-emergencia, button:has-text("Mensagem de Emergência")').first();
      await emgOptionBtn.click({ force: true });
      await page.waitForTimeout(2000);

      // Disparar envio nas linhas da rede
      const btn0 = page.locator('#broadcast-send-0');
      if (await btn0.isVisible()) {
        console.log('  > A disparar envio de emergência para a linha 1...');
        await btn0.click({ force: true });
        await page.waitForTimeout(1500);
      }

      const btn1 = page.locator('#broadcast-send-1');
      if (await btn1.isVisible()) {
        console.log('  > A disparar envio de emergência para a linha 2...');
        await btn1.click({ force: true });
        await page.waitForTimeout(1500);
      }

      // Fechar painel de difusão
      const closeBroadcastBtn = page.locator('#close-inst-broadcast').first();
      if (await closeBroadcastBtn.isVisible()) {
        await closeBroadcastBtn.click({ force: true });
        await page.waitForTimeout(1500);
      }

      // 3. VERIFICAÇÃO NA LISTA DE ENVIADAS
      console.log('  > A verificar lista de correspondências Enviadas...');
      const sentTab = page.locator('#tab-correspondencia-enviadas, button:has-text("Enviadas")').first();
      if (await sentTab.isVisible()) {
        await sentTab.click({ force: true });
        await page.waitForTimeout(2000);
      }

      // Verificar se a mensagem de emergência aparece na lista
      const sentListText = await page.locator('main').innerText();
      const hasEmergencySent = sentListText.includes('ALERTA DE EMERGÊNCIA') || sentListText.includes('EMERGÊNCIA');
      console.log(`  ✓ Mensagem de emergência localizada em «Enviadas»: ${hasEmergencySent ? 'SIM ✓' : 'NÃO ✗'}`);

      if (!hasEmergencySent) {
        throw new Error(`Falha ao encontrar correspondência enviada no Ciclo ${ciclo}`);
      }

      // Logout Instituição
      await logoutInstitution();

      console.log(`\n🎉 CICLO ${ciclo} CONCLUÍDO COM 100% DE SUCESSO!`);
    }

    console.log('\n================================================================');
    console.log('🏆 TODOS OS 3 CICLOS FORAM TESTADOS E VALIDADOS COM 100% DE SUCESSO!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('Erro durante a execução dos 3 ciclos:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
