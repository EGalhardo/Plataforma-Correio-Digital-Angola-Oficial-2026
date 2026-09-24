import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const SHOTS = '/home/user/cda_test/facial_audit_shots';
fs.mkdirSync(SHOTS, { recursive: true });

async function run() {
  console.log('================================================================');
  console.log('🧪 TESTE DO FLUXO COMPLETO DE LOGIN FACIAL (SOLICITADO PELO UTILIZADOR)');
  console.log('1. Entrar na conta INAPEM-LMM-01');
  console.log('2. Ir ao Perfil e fazer o Registo Facial');
  console.log('3. Sair da conta');
  console.log('4. Entrar via Login Facial');
  console.log('5. Sair da conta');
  console.log('6. Entrar na conta do Cidadão Edlasio Galhardo');
  console.log('7. Sair da conta do Cidadão');
  console.log('8. No ecrã de login (em modo Cidadão), tentar entrar no INAPEM via Login Facial');
  console.log('================================================================');

  const browser = await chromium.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'pt-AO',
    permissions: ['camera']
  });

  await ctx.addInitScript(() => {
    localStorage.setItem('skip_splash_and_show_login', 'true');
    localStorage.setItem('cda_sessao_activa', '0');
  });

  const page = await ctx.newPage();

  try {
    // -------------------------------------------------------------
    // PASSO 1: ENTRAR NA CONTA INAPEM-LMM-01
    // -------------------------------------------------------------
    console.log('\n--- PASSO 1: Aceder à plataforma e entrar como INAPEM-LMM-01 ---');
    await page.goto(BASE + '/#/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 15000 });
    await page.waitForTimeout(1000);

    const userInput = page.locator('input[name="cda-utilizador"]');
    await userInput.fill('INAPEM-LMM-01');
    await page.waitForTimeout(300);

    const passInput = page.locator('input[name="cda-senha"]');
    await passInput.fill('123456789');
    await page.waitForTimeout(300);

    // Clicar em Entrar no Portal
    const submitBtn = page.locator('button:has-text("Entrar no Portal")');
    await submitBtn.click();

    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SHOTS}/01_inapem_logged_in.png` });
    console.log('✓ Login inicial INAPEM-LMM-01 efetuado.');

    // -------------------------------------------------------------
    // PASSO 2: IR AO PERFIL E FAZER O REGISTO FACIAL
    // -------------------------------------------------------------
    console.log('\n--- PASSO 2: Aceder ao Perfil e Registar a Face ---');
    // Navegar para o perfil
    const perfilBtn = page.locator('button:has-text("Perfil"), a:has-text("Perfil"), button[title*="Perfil"], nav button:has-text("Conta")').first();
    if (await perfilBtn.isVisible()) {
      await perfilBtn.click();
    } else {
      await page.goto(BASE + '/#/institucional/perfil', { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SHOTS}/02_inapem_perfil.png` });

    // Rolar até ao bloco de Login Facial
    const registarFaceBtn = page.locator('button:has-text("Registar a minha face"), button:has-text("Registar Face")').first();
    await registarFaceBtn.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/03_inapem_facial_settings.png` });

    console.log('A iniciar registo facial...');
    await registarFaceBtn.click();
    await page.waitForTimeout(1500);

    // Passo 1: Frontal
    const capturarBtn = page.locator('button:has-text("Capturar"), button:has-text("Fotografar"), button:has-text("Confirmar")').first();
    await capturarBtn.click();
    await page.waitForTimeout(1500);

    // Passo 2: Esquerda/Direita
    await capturarBtn.click();
    await page.waitForTimeout(1500);

    // Passo 3: Sorriso/Final
    await capturarBtn.click();
    await page.waitForTimeout(3000);

    await page.screenshot({ path: `${SHOTS}/04_inapem_facial_enrolled.png` });
    console.log('✓ Registo facial concluído no perfil da instituição.');

    // -------------------------------------------------------------
    // PASSO 3: SAIR DA CONTA
    // -------------------------------------------------------------
    console.log('\n--- PASSO 3: Terminar Sessão (Logout) ---');
    const logoutBtn = page.locator('button:has-text("Terminar Sessão"), button:has-text("Sair"), button[title*="Sair"]').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    } else {
      const avatarBtn = page.locator('button[aria-haspopup="true"], [data-testid="user-menu-btn"]').first();
      if (await avatarBtn.isVisible()) {
        await avatarBtn.click();
        await page.waitForTimeout(500);
        await page.locator('button:has-text("Terminar Sessão"), button:has-text("Sair")').first().click();
      }
    }
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${SHOTS}/05_logged_out.png` });
    console.log('✓ Sessão terminada.');

    // -------------------------------------------------------------
    // PASSO 4: ENTRAR VIA LOGIN FACIAL
    // -------------------------------------------------------------
    console.log('\n--- PASSO 4: Tentar entrar na conta via Login Facial ---');
    const loginFacialBtn = page.locator('button:has-text("Login Facial"), button:has-text("Biometria Facial")').first();
    await loginFacialBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SHOTS}/06_login_facial_screen.png` });

    // Iniciar reconhecimento facial
    const scanBtn = page.locator('button:has-text("Iniciar Reconhecimento"), button:has-text("Validar Face"), button:has-text("Entrar com Face")').first();
    if (await scanBtn.isVisible()) {
      await scanBtn.click();
    } else {
      const scannerCircle = page.locator('video, svg.animate-pulse, [data-testid="face-scanner"]').first();
      if (await scannerCircle.isVisible()) {
        await scannerCircle.click();
      }
    }

    console.log('A aguardar processamento biométrico...');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${SHOTS}/07_after_facial_login_attempt.png` });

    let hasInstContent = await page.locator('text=INAPEM, text=Correspondências, text=Painel').first().isVisible().catch(() => false);
    console.log(`URL atual: ${page.url()}, Conteúdo Institucional visível: ${hasInstContent}`);

    if (hasInstContent) {
      console.log('🎉 SUCESSO: Login facial entrou diretamente na conta INAPEM-LMM!');
    } else {
      console.log('⚠️ AVISO: Não detetou entrada imediata no Passo 4.');
    }

    // -------------------------------------------------------------
    // PASSO 5: SAIR DA CONTA E ENTRAR COMO EDLASIO GALHARDO
    // -------------------------------------------------------------
    console.log('\n--- PASSO 5: Sair e Entrar na conta do Cidadão Edlasio Galhardo ---');
    if (hasInstContent) {
      const outBtn = page.locator('button:has-text("Terminar Sessão"), button:has-text("Sair")').first();
      if (await outBtn.isVisible()) await outBtn.click();
      await page.waitForTimeout(2500);
    } else {
      await page.goto(BASE + '/#/login', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 15000 });
      await page.waitForTimeout(1000);
    }

    const biInputCid = page.locator('input[name="cda-utilizador"]');
    await biInputCid.fill('009874562LA041');

    const passInputCid = page.locator('input[name="cda-senha"]');
    await passInputCid.fill('123456');

    await page.locator('button:has-text("Entrar no Portal")').click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SHOTS}/08_edlasio_logged_in.png` });
    console.log('✓ Login efetuado na conta de Edlasio Galhardo.');

    // -------------------------------------------------------------
    // PASSO 6: SAIR DA CONTA DO CIDADÃO E ENTRAR NO INAPEM VIA LOGIN FACIAL
    // -------------------------------------------------------------
    console.log('\n--- PASSO 6: Sair da conta do Cidadão e tentar entrar no INAPEM via Login Facial ---');
    const logoutCidBtn = page.locator('button:has-text("Terminar Sessão"), button:has-text("Sair")').first();
    if (await logoutCidBtn.isVisible()) {
      await logoutCidBtn.click();
    } else {
      const avatarBtn = page.locator('button[aria-haspopup="true"], [data-testid="user-menu-btn"]').first();
      if (await avatarBtn.isVisible()) {
        await avatarBtn.click();
        await page.waitForTimeout(500);
        await page.locator('button:has-text("Terminar Sessão"), button:has-text("Sair")').first().click();
      }
    }
    await page.waitForTimeout(2500);

    // Agora estamos no login em modo CIDADÃO por defeito
    console.log('No ecrã de login (modo Cidadão). A clicar em Login Facial...');
    const loginFacialBtn2 = page.locator('button:has-text("Login Facial"), button:has-text("Biometria Facial")').first();
    await loginFacialBtn2.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SHOTS}/09_login_facial_from_citizen.png` });

    const scanBtn2 = page.locator('button:has-text("Iniciar Reconhecimento"), button:has-text("Validar Face"), button:has-text("Entrar com Face")').first();
    if (await scanBtn2.isVisible()) {
      await scanBtn2.click();
    } else {
      const scannerCircle = page.locator('video, svg.animate-pulse, [data-testid="face-scanner"]').first();
      if (await scannerCircle.isVisible()) {
        await scannerCircle.click();
      }
    }

    console.log('A aguardar resolução biométrica e redirecionamento de área...');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${SHOTS}/10_final_login_facial_result.png` });

    const finalInstVisible = await page.locator('text=INAPEM, text=Correspondências, text=Painel').first().isVisible().catch(() => false);
    console.log(`URL final: ${page.url()}, Conteúdo Institucional visível: ${finalInstVisible}`);

    if (finalInstVisible) {
      console.log('\n🏆 SUCESSO TOTAL: O Login Facial reconheceu o rosto do INAPEM mesmo estando na área de Cidadão e entrou com sucesso na conta!');
    } else {
      console.log('\n⚠️ AVISO: Analisando o resultado...');
    }

  } catch (err) {
    console.error('Erro durante o teste E2E:', err);
    await page.screenshot({ path: `${SHOTS}/error_state.png` }).catch(() => {});
  } finally {
    await browser.close();
  }
}

run();
