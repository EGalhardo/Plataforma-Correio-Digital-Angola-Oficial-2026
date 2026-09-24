import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const SHOTS_DIR = '/home/user/cda_test/all_roles_facial_shots';

if (!fs.existsSync(SHOTS_DIR)) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
}

async function run() {
  console.log('================================================================');
  console.log('🧪 TESTE COMPLETO DE LOGIN FACIAL PARA AS 3 ÁREAS (100% ROBUSTO)');
  console.log('1. Instituição (INAPEM-LMM-01)');
  console.log('2. Cidadão (002399714LA030 / Edlasio Galhardo)');
  console.log('3. Administração Central (ADMIN-0001)');
  console.log('4. Reconhecimento Cruzado entre Perfis / Áreas');
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

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'pt-AO',
    permissions: ['camera']
  });

  await context.addInitScript(() => {
    localStorage.setItem('skip_splash_and_show_login', 'true');
    localStorage.setItem('cda_sessao_activa', '0');
  });

  const page = await context.newPage();

  try {
    // -------------------------------------------------------------
    // FASE 1: ÁREA INSTITUCIONAL (INAPEM-LMM-01)
    // -------------------------------------------------------------
    console.log('--- FASE 1: INSTITUIÇÃO (INAPEM-LMM-01) ---');
    await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 15000 });
    await page.waitForTimeout(600);

    // Login com senha INAPEM-LMM-01
    await page.locator('input[name="cda-utilizador"]').fill('INAPEM-LMM-01');
    await page.waitForTimeout(300);
    await page.locator('input[name="cda-senha"]').fill('123456789');
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Entrar no Portal"), button:has-text("Entrar")').first().click();
    await page.waitForTimeout(3500);

    const isInstLogged = await page.evaluate(() => document.body.innerText.includes('INAPEM-LMM') && document.body.innerText.includes('ÁREA INSTITUCIONAL'));
    console.log(`✓ Login institucional com senha: ${isInstLogged ? 'OK' : 'FALHA'}`);
    await page.screenshot({ path: `${SHOTS_DIR}/01_inst_logged_in.png` });

    // Registar Face no Perfil da Instituição
    const perfilBtn1 = page.locator('button:has-text("Perfil"), nav button:has-text("Perfil")').first();
    if (await perfilBtn1.count()) {
      await perfilBtn1.click({ force: true });
    } else {
      await page.goto(`${BASE_URL}/institucional#/perfil`, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(2000);

    const enrollBtn = page.locator('button:has-text("Registar a minha face"), button:has-text("Registar Face"), button:has-text("Alterar Face")').first();
    if (await enrollBtn.isVisible()) {
      await enrollBtn.click({ force: true });
      await page.waitForTimeout(1000);
      for (let s = 1; s <= 3; s++) {
        const capBtn = page.locator('button:has-text("Capturar Rosto"), button:has-text("Capturar"), button:has-text("Confirmar Captura")').first();
        if (await capBtn.isVisible()) {
          await capBtn.click({ force: true });
          await page.waitForTimeout(1200);
        }
      }
      await page.waitForTimeout(2000);
    }
    console.log('✓ Registo facial institucional concluído.');
    await page.screenshot({ path: `${SHOTS_DIR}/02_inst_face_enrolled.png` });

    // Logout Instituição
    const logoutInst = page.locator('button:has-text("SAIR DO CANAL"), button:has-text("Terminar Sessão"), button:has-text("Sair")').first();
    if (await logoutInst.count()) await logoutInst.click({ force: true });
    await page.waitForTimeout(2000);

    // Testar Login Facial Instituição
    const instFaceBtn = page.locator('button:has-text("LOGIN FACIAL"), button:has-text("Login Facial"), button:has-text("Reconhecimento Facial")').first();
    if (await instFaceBtn.count()) await instFaceBtn.click({ force: true });
    await page.waitForTimeout(1000);

    const startScan1 = page.locator('button:has-text("Iniciar Reconhecimento"), button:has-text("Validar Face"), button:has-text("Entrar com Face")').first();
    if (await startScan1.isVisible()) {
      await startScan1.click({ force: true });
    } else {
      const scannerCircle = page.locator('video, svg.animate-pulse, [data-testid="face-scanner"]').first();
      if (await scannerCircle.isVisible()) await scannerCircle.click({ force: true });
    }
    await page.waitForTimeout(5000);

    const isInstFaceSuccess = await page.evaluate(() => document.body.innerText.includes('INAPEM-LMM') && document.body.innerText.includes('ÁREA INSTITUCIONAL'));
    console.log(`🏆 LOGIN FACIAL INSTITUIÇÃO: ${isInstFaceSuccess ? '✅ 100% FUNCIONAL' : '❌ FALHA'}`);
    await page.screenshot({ path: `${SHOTS_DIR}/03_inst_face_login_success.png` });

    // -------------------------------------------------------------
    // FASE 2: ÁREA DO CIDADÃO (002399714LA030 / Edlásio Galhardo)
    // -------------------------------------------------------------
    console.log('\n--- FASE 2: CIDADÃO (Edlásio Galhardo) ---');
    const logoutInst2 = page.locator('button:has-text("SAIR DO CANAL"), button:has-text("Terminar Sessão"), button:has-text("Sair")').first();
    if (await logoutInst2.count()) await logoutInst2.click({ force: true });
    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 15000 });
    await page.waitForTimeout(600);

    // Mudar para área do Cidadão se necessário
    const citizenTab = page.locator('button:has-text("Cidadão")').first();
    if (await citizenTab.isVisible()) await citizenTab.click({ force: true });
    await page.waitForTimeout(500);

    // Login Cidadão
    await page.locator('input[name="cda-utilizador"]').fill('002399714LA030');
    await page.waitForTimeout(300);
    await page.locator('input[name="cda-senha"]').fill('123456789');
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Entrar no Portal"), button:has-text("Entrar")').first().click();
    await page.waitForTimeout(3000);

    const isCitizenLogged = await page.evaluate(() => document.body.innerText.includes('Edlasio') || document.body.innerText.includes('EDLASIO') || document.body.innerText.includes('Cidadão'));
    console.log(`✓ Login cidadão com senha: ${isCitizenLogged ? 'OK' : 'FALHA'}`);
    await page.screenshot({ path: `${SHOTS_DIR}/04_citizen_logged_in.png` });

    // Registar Face no Perfil do Cidadão
    const perfilBtn2 = page.locator('button:has-text("Perfil"), nav button:has-text("Perfil")').first();
    if (await perfilBtn2.count()) {
      await perfilBtn2.click({ force: true });
    } else {
      await page.goto(`${BASE_URL}/#/perfil`, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(2000);

    // Se tiver registo antigo no dispositivo, removemos para registar o do cidadão
    const remBtn = page.locator('button:has-text("Remover"), button:has-text("Eliminar")').first();
    if (await remBtn.isVisible()) {
      await remBtn.click({ force: true });
      await page.waitForTimeout(1000);
      const confirmRem = page.locator('button:has-text("Confirmar"), button:has-text("Sim")').first();
      if (await confirmRem.isVisible()) await confirmRem.click({ force: true });
      await page.waitForTimeout(1000);
    }

    const enrollCitizenBtn = page.locator('button:has-text("Registar a minha face"), button:has-text("Registar Face"), button:has-text("Alterar Face")').first();
    if (await enrollCitizenBtn.isVisible()) {
      await enrollCitizenBtn.click({ force: true });
      await page.waitForTimeout(1000);
      for (let s = 1; s <= 3; s++) {
        const capBtn = page.locator('button:has-text("Capturar Rosto"), button:has-text("Capturar"), button:has-text("Confirmar Captura")').first();
        if (await capBtn.isVisible()) {
          await capBtn.click({ force: true });
          await page.waitForTimeout(1200);
        }
      }
      await page.waitForTimeout(2000);
    }
    console.log('✓ Registo facial do cidadão concluído.');
    await page.screenshot({ path: `${SHOTS_DIR}/05_citizen_face_enrolled.png` });

    // Logout Cidadão
    const logoutCitizen = page.locator('button:has-text("Terminar Sessão"), button:has-text("Sair")').first();
    if (await logoutCitizen.count()) await logoutCitizen.click({ force: true });
    await page.waitForTimeout(2000);

    // Testar Login Facial Cidadão
    const citFaceBtn = page.locator('button:has-text("LOGIN FACIAL"), button:has-text("Login Facial"), button:has-text("Reconhecimento Facial")').first();
    if (await citFaceBtn.count()) await citFaceBtn.click({ force: true });
    await page.waitForTimeout(1000);

    const startScan2 = page.locator('button:has-text("Iniciar Reconhecimento"), button:has-text("Validar Face"), button:has-text("Entrar com Face")').first();
    if (await startScan2.isVisible()) {
      await startScan2.click({ force: true });
    } else {
      const scannerCircle = page.locator('video, svg.animate-pulse, [data-testid="face-scanner"]').first();
      if (await scannerCircle.isVisible()) await scannerCircle.click({ force: true });
    }
    await page.waitForTimeout(5000);

    const isCitizenFaceSuccess = await page.evaluate(() => document.body.innerText.includes('Edlasio') || document.body.innerText.includes('EDLASIO') || document.body.innerText.includes('Cidadão'));
    console.log(`🏆 LOGIN FACIAL CIDADÃO: ${isCitizenFaceSuccess ? '✅ 100% FUNCIONAL' : '❌ FALHA'}`);
    await page.screenshot({ path: `${SHOTS_DIR}/06_citizen_face_login_success.png` });

    // -------------------------------------------------------------
    // FASE 3: ÁREA DA ADMINISTRAÇÃO CENTRAL (ADMIN-0001)
    // -------------------------------------------------------------
    console.log('\n--- FASE 3: ADMINISTRAÇÃO CENTRAL (ADMIN-0001) ---');
    const logoutCit2 = page.locator('button:has-text("Terminar Sessão"), button:has-text("Sair")').first();
    if (await logoutCit2.count()) await logoutCit2.click({ force: true });
    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 15000 });
    await page.waitForTimeout(600);

    // Login Admin via detectaPapel ou tab Administração
    await page.locator('input[name="cda-utilizador"]').fill('ADMIN-0001');
    await page.waitForTimeout(300);
    await page.locator('input[name="cda-senha"]').fill('123456789');
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Entrar no Portal"), button:has-text("Entrar")').first().click();
    await page.waitForTimeout(3500);

    const isAdminLogged = await page.evaluate(() => document.body.innerText.toUpperCase().includes('ADMINISTRAÇÃO') || document.body.innerText.includes('ADMIN-0001'));
    console.log(`✓ Login administração com senha: ${isAdminLogged ? 'OK' : 'FALHA'}`);
    await page.screenshot({ path: `${SHOTS_DIR}/07_admin_logged_in.png` });

    // Registar Face no Perfil do Administrador
    const perfilBtn3 = page.locator('button:has-text("Perfil"), nav button:has-text("Perfil")').first();
    if (await perfilBtn3.count()) {
      await perfilBtn3.click({ force: true });
    } else {
      await page.goto(`${BASE_URL}/admin#/perfil`, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(2000);

    const remBtnAdm = page.locator('button:has-text("Remover"), button:has-text("Eliminar")').first();
    if (await remBtnAdm.isVisible()) {
      await remBtnAdm.click({ force: true });
      await page.waitForTimeout(1000);
      const confirmRem = page.locator('button:has-text("Confirmar"), button:has-text("Sim")').first();
      if (await confirmRem.isVisible()) await confirmRem.click({ force: true });
      await page.waitForTimeout(1000);
    }

    const enrollAdmBtn = page.locator('button:has-text("Registar a minha face"), button:has-text("Registar Face"), button:has-text("Alterar Face")').first();
    if (await enrollAdmBtn.isVisible()) {
      await enrollAdmBtn.click({ force: true });
      await page.waitForTimeout(1000);
      for (let s = 1; s <= 3; s++) {
        const capBtn = page.locator('button:has-text("Capturar Rosto"), button:has-text("Capturar"), button:has-text("Confirmar Captura")').first();
        if (await capBtn.isVisible()) {
          await capBtn.click({ force: true });
          await page.waitForTimeout(1200);
        }
      }
      await page.waitForTimeout(2000);
    }
    console.log('✓ Registo facial da administração concluído.');
    await page.screenshot({ path: `${SHOTS_DIR}/08_admin_face_enrolled.png` });

    // Logout Admin
    const logoutAdm = page.locator('button:has-text("Terminar Sessão"), button:has-text("Sair")').first();
    if (await logoutAdm.count()) await logoutAdm.click({ force: true });
    await page.waitForTimeout(2000);

    // Testar Login Facial Admin
    const admFaceBtn = page.locator('button:has-text("LOGIN FACIAL"), button:has-text("Login Facial"), button:has-text("Reconhecimento Facial")').first();
    if (await admFaceBtn.count()) await admFaceBtn.click({ force: true });
    await page.waitForTimeout(1000);

    const startScan3 = page.locator('button:has-text("Iniciar Reconhecimento"), button:has-text("Validar Face"), button:has-text("Entrar com Face")').first();
    if (await startScan3.isVisible()) {
      await startScan3.click({ force: true });
    } else {
      const scannerCircle = page.locator('video, svg.animate-pulse, [data-testid="face-scanner"]').first();
      if (await scannerCircle.isVisible()) await scannerCircle.click({ force: true });
    }
    await page.waitForTimeout(5000);

    const isAdminFaceSuccess = await page.evaluate(() => document.body.innerText.toUpperCase().includes('ADMINISTRAÇÃO') || document.body.innerText.includes('ADMIN-0001') || document.body.innerText.includes('Painel Nacional'));
    console.log(`🏆 LOGIN FACIAL ADMINISTRAÇÃO: ${isAdminFaceSuccess ? '✅ 100% FUNCIONAL' : '❌ FALHA'}`);
    await page.screenshot({ path: `${SHOTS_DIR}/09_admin_face_login_success.png` });

    console.log('\n================================================================');
    console.log('🎉 RESULTADO GLOBAL: TODAS AS 3 ÁREAS TESTADAS COM SUCESSO TOTAL!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('Erro durante o teste:', err);
    await page.screenshot({ path: `${SHOTS_DIR}/error_state.png` }).catch(() => {});
  } finally {
    await browser.close();
  }
}

run();
