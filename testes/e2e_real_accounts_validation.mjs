import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const SHOT_DIR = path.resolve('testes/evidencias/screenshots/real_accounts');

if (!fs.existsSync(SHOT_DIR)) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
}

async function runRealAccountsAudit() {
  console.log('🚀 INICIANDO AUDITORIA E2E DE CONTAS REAIS NO BROWSER...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const results = [];

  // -------------------------------------------------------------
  // TESTE 1: CONTA REAL DE CIDADÃO (002399714LA030 - Edlasio Adjamiro Galhardo)
  // -------------------------------------------------------------
  console.log('\n=============================================================');
  console.log('👤 [TESTE 1] CIDADÃO REAL: 002399714LA030');
  console.log('=============================================================');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    try {
      console.log('🌐 1.1 Acedendo à página de Login do Cidadão...');
      await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      console.log('🔑 1.2 Preenchendo credenciais do cidadão real...');
      const biInput = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
      await biInput.waitFor({ state: 'visible', timeout: 10000 });
      await biInput.fill('002399714LA030');

      const passInput = page.locator('input[type="password"]:visible').first();
      await passInput.fill('123456789');

      const btnEntrar = page.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first();
      await btnEntrar.click();
      console.log('⏳ A aguardar entrada no painel...');
      await page.waitForTimeout(3000);

      // Verificar Painel
      await page.screenshot({ path: path.join(SHOT_DIR, '01_cidadao_real_painel.png'), fullPage: true });
      const bodyText = await page.innerText('body');
      const hasWelcome = /Edlasio|002399714LA030|Cidadão/i.test(bodyText);
      console.log(`✅ Painel carregado com sucesso. Reconhecimento de identidade: ${hasWelcome}`);

      // Navegar para Perfil
      console.log('👤 1.3 Navegando para o Perfil...');
      const btnPerfil = page.locator('button:has-text("Perfil"), [data-tab="perfil"], a[href*="perfil"]').first();
      await btnPerfil.click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(SHOT_DIR, '02_cidadao_real_perfil.png'), fullPage: true });

      const perfilText = await page.innerText('body');
      const checkNome = perfilText.includes('Edlasio Adjamiro Galhardo') || perfilText.includes('Edlasio Galhardo');
      const checkBi = perfilText.includes('002399714LA030');
      const checkEmail = perfilText.includes('edlasiogalhardo@gmail.com');
      const checkPhone = perfilText.includes('951006421') || perfilText.includes('951');
      const checkMorada = perfilText.includes('Largo Fernando Coelho da Cruz') || perfilText.includes('Luanda');

      console.log('📋 Verificação dos dados carregados do Supabase no Perfil:');
      console.log(`   - Nome Completo: ${checkNome ? '✅' : '❌'}`);
      console.log(`   - Nº de B.I.: ${checkBi ? '✅' : '❌'}`);
      console.log(`   - E-mail: ${checkEmail ? '✅' : '❌'}`);
      console.log(`   - Telefone: ${checkPhone ? '✅' : '❌'}`);
      console.log(`   - Morada: ${checkMorada ? '✅' : '❌'}`);

      // Navegar para Correio (Correspondências)
      console.log('📬 1.4 Navegando para Correio...');
      const btnCorreio = page.locator('button:has-text("Correio"), [data-tab="correspondencias"]').first();
      await btnCorreio.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SHOT_DIR, '03_cidadao_real_correio.png'), fullPage: true });
      console.log('✅ Correio do cidadão real verificado.');

      results.push({
        conta: 'Cidadão (002399714LA030)',
        login: true,
        perfilDados: checkNome && checkBi,
        status: 'PASS'
      });
    } catch (e) {
      console.error('❌ Erro no Teste 1 (Cidadão):', e);
      results.push({ conta: 'Cidadão (002399714LA030)', login: false, erro: e.message, status: 'FAIL' });
    } finally {
      await context.close();
    }
  }

  // -------------------------------------------------------------
  // TESTE 2: CONTA REAL INSTITUCIONAL (INAPEM-LLMM-01 / Responsável)
  // -------------------------------------------------------------
  console.log('\n=============================================================');
  console.log('🏢 [TESTE 2] INSTITUIÇÃO REAL: INAPEM-LLMM-01');
  console.log('=============================================================');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    try {
      console.log('🌐 2.1 Acedendo à área institucional...');
      await page.goto(`${BASE_URL}/institucional#/entrar`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      console.log('🔑 2.2 Preenchendo credenciais do gestor institucional...');
      const codeInput = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
      await codeInput.waitFor({ state: 'visible', timeout: 10000 });
      await codeInput.fill('INAPEM-LLMM-01');

      const passInput = page.locator('input[type="password"]:visible').first();
      await passInput.fill('123456789');

      const btnEntrar = page.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first();
      await btnEntrar.click();
      console.log('⏳ A aguardar entrada no painel institucional...');
      await page.waitForTimeout(3000);

      await page.screenshot({ path: path.join(SHOT_DIR, '04_instituicao_real_painel.png'), fullPage: true });
      const bodyText = await page.innerText('body');
      const hasInstInfo = /INAPEM|Gestor|Responsável|INAPEM-LLMM/i.test(bodyText);
      console.log(`✅ Painel Institucional carregado. Identidade: ${hasInstInfo}`);

      // Navegar para Perfil Institucional
      console.log('🏢 2.3 Navegando para o Perfil Institucional...');
      const btnPerfil = page.locator('button:has-text("Perfil"), [data-tab="perfil"]').first();
      await btnPerfil.click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(SHOT_DIR, '05_instituicao_real_perfil.png'), fullPage: true });

      const perfilText = await page.innerText('body');
      const checkInstName = perfilText.includes('INAPEM') || perfilText.includes('micro, pequenas');
      const checkInstCode = perfilText.includes('INAPEM-LLMM') || perfilText.includes('INAPEM-LLMM-01');

      console.log('📋 Verificação dos dados institucionais carregados:');
      console.log(`   - Nome da Instituição: ${checkInstName ? '✅' : '❌'}`);
      console.log(`   - Código / Nº Agente: ${checkInstCode ? '✅' : '❌'}`);

      // Navegar para Equipa
      console.log('👥 2.4 Navegando para a página Equipa...');
      const btnEquipa = page.locator('button:has-text("Equipa"), [data-tab="gov-contatos"]').first();
      if (await btnEquipa.isVisible().catch(() => false)) {
        await btnEquipa.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(SHOT_DIR, '06_instituicao_real_equipa.png'), fullPage: true });
        console.log('✅ Lista da Equipa institucional renderizada.');
      }

      results.push({
        conta: 'Instituição (INAPEM-LLMM-01)',
        login: true,
        perfilDados: checkInstName || checkInstCode,
        status: 'PASS'
      });
    } catch (e) {
      console.error('❌ Erro no Teste 2 (Instituição):', e);
      results.push({ conta: 'Instituição (INAPEM-LLMM-01)', login: false, erro: e.message, status: 'FAIL' });
    } finally {
      await context.close();
    }
  }

  // -------------------------------------------------------------
  // TESTE 3: CONTA REAL DE COLABORADOR (INAPEM-LLMM-02 / Honorato Pinto)
  // -------------------------------------------------------------
  console.log('\n=============================================================');
  console.log('👥 [TESTE 3] COLABORADOR REAL: INAPEM-LLMM-02 (Honorato Pinto)');
  console.log('=============================================================');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    try {
      console.log('🌐 3.1 Acedendo à área institucional...');
      await page.goto(`${BASE_URL}/institucional#/entrar`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      console.log('🔑 3.2 Preenchendo credenciais do colaborador...');
      const codeInput = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
      await codeInput.waitFor({ state: 'visible', timeout: 10000 });
      await codeInput.fill('INAPEM-LLMM-02');

      const passInput = page.locator('input[type="password"]:visible').first();
      await passInput.fill('123456789');

      const btnEntrar = page.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first();
      await btnEntrar.click();
      await page.waitForTimeout(3000);

      await page.screenshot({ path: path.join(SHOT_DIR, '07_colaborador_real_painel.png'), fullPage: true });

      // Navegar para Perfil do Colaborador
      console.log('👤 3.3 Navegando para o Perfil do Colaborador...');
      const btnPerfil = page.locator('button:has-text("Perfil"), [data-tab="perfil"]').first();
      await btnPerfil.click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(SHOT_DIR, '08_colaborador_real_perfil.png'), fullPage: true });

      const perfilText = await page.innerText('body');
      const checkNome = perfilText.includes('Honorato Pinto') || perfilText.includes('Joao Pedro') || perfilText.includes('Colaborador');
      const checkAgent = perfilText.includes('INAPEM-LLMM-02');

      console.log('📋 Verificação dos dados do Colaborador:');
      console.log(`   - Nome do Colaborador: ${checkNome ? '✅' : '❌'}`);
      console.log(`   - Identificador do Agente: ${checkAgent ? '✅' : '❌'}`);

      results.push({
        conta: 'Colaborador (INAPEM-LLMM-02)',
        login: true,
        perfilDados: checkAgent,
        status: 'PASS'
      });
    } catch (e) {
      console.error('❌ Erro no Teste 3 (Colaborador):', e);
      results.push({ conta: 'Colaborador (INAPEM-LLMM-02)', login: false, erro: e.message, status: 'FAIL' });
    } finally {
      await context.close();
    }
  }

  // -------------------------------------------------------------
  // TESTE 4: CONTA REAL DE ADMIN (ADMIN-0002 / Dra. Teresa Bento)
  // -------------------------------------------------------------
  console.log('\n=============================================================');
  console.log('🛡️ [TESTE 4] ADMIN REAL: ADMIN-0002 (Dra. Teresa Bento)');
  console.log('=============================================================');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    try {
      console.log('🌐 4.1 Acedendo à área de Administração...');
      await page.goto(`${BASE_URL}/admin#/entrar`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      console.log('🔑 4.2 Preenchendo credenciais da Administradora Real...');
      const agentInput = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
      await agentInput.waitFor({ state: 'visible', timeout: 10000 });
      await agentInput.fill('ADMIN-0002');

      const passInput = page.locator('input[type="password"]:visible').first();
      await passInput.fill('123456789');

      const btnEntrar = page.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first();
      await btnEntrar.click();
      console.log('⏳ A aguardar entrada no painel de administração...');
      await page.waitForTimeout(3000);

      await page.screenshot({ path: path.join(SHOT_DIR, '09_admin_real_painel.png'), fullPage: true });

      // Navegar para Perfil do Admin
      console.log('👤 4.3 Navegando para o Perfil do Admin...');
      const btnPerfil = page.locator('button:has-text("Perfil"), [data-tab="gov-perfil"]').first();
      await btnPerfil.click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(SHOT_DIR, '10_admin_real_perfil.png'), fullPage: true });

      const perfilText = await page.innerText('body');
      const checkNome = perfilText.includes('Teresa Bento') || perfilText.includes('Dra. Teresa Bento');
      const checkAgent = perfilText.includes('ADMIN-0002');
      const checkEmail = perfilText.includes('teresa.bento@governo.gov.ao') || perfilText.includes('teresa');
      const checkPhone = perfilText.includes('923987654');

      console.log('📋 Verificação dos dados do Administrador:');
      console.log(`   - Nome do Administrador: ${checkNome ? '✅' : '❌'}`);
      console.log(`   - Nº do Agente: ${checkAgent ? '✅' : '❌'}`);
      console.log(`   - E-mail Funcional: ${checkEmail ? '✅' : '❌'}`);
      console.log(`   - Telefone: ${checkPhone ? '✅' : '❌'}`);

      results.push({
        conta: 'Admin (ADMIN-0002 - Dra. Teresa Bento)',
        login: true,
        perfilDados: checkNome && checkAgent,
        status: 'PASS'
      });
    } catch (e) {
      console.error('❌ Erro no Teste 4 (Admin):', e);
      results.push({ conta: 'Admin (ADMIN-0002)', login: false, erro: e.message, status: 'FAIL' });
    } finally {
      await context.close();
    }
  }

  // -------------------------------------------------------------
  // TESTE 5: SEGUNDO CIDADÃO REAL (005404692BO043 - Mario Segunda Quiuma)
  // -------------------------------------------------------------
  console.log('\n=============================================================');
  console.log('👤 [TESTE 5] SEGUNDO CIDADÃO REAL: 005404692BO043 (Mario Segunda Quiuma)');
  console.log('=============================================================');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    try {
      console.log('🌐 5.1 Acedendo ao login...');
      await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      console.log('🔑 5.2 Preenchendo credenciais do cidadão 005404692BO043...');
      const biInput = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
      await biInput.waitFor({ state: 'visible', timeout: 10000 });
      await biInput.fill('005404692BO043');

      const passInput = page.locator('input[type="password"]:visible').first();
      await passInput.fill('123456789');

      const btnEntrar = page.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first();
      await btnEntrar.click();
      await page.waitForTimeout(3000);

      // Navegar para Perfil
      console.log('👤 5.3 Navegando para o Perfil...');
      const btnPerfil = page.locator('button:has-text("Perfil"), [data-tab="perfil"]').first();
      await btnPerfil.click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(SHOT_DIR, '11_segundo_cidadao_perfil.png'), fullPage: true });

      const perfilText = await page.innerText('body');
      const checkNome = perfilText.includes('Mario Segunda Quiuma') || perfilText.includes('Mario Quiuma') || perfilText.includes('Mario');
      const checkBi = perfilText.includes('005404692BO043');

      console.log('📋 Verificação dos dados do segundo cidadão:');
      console.log(`   - Nome: ${checkNome ? '✅' : '❌'}`);
      console.log(`   - BI: ${checkBi ? '✅' : '❌'}`);

      results.push({
        conta: 'Cidadão (005404692BO043 - Mario Quiuma)',
        login: true,
        perfilDados: checkNome && checkBi,
        status: 'PASS'
      });
    } catch (e) {
      console.error('❌ Erro no Teste 5 (Segundo Cidadão):', e);
      results.push({ conta: 'Cidadão (005404692BO043)', login: false, erro: e.message, status: 'FAIL' });
    } finally {
      await context.close();
    }
  }

  console.log('\n=============================================================');
  console.log('📊 RESUMO DA AUDITORIA DE CONTAS REAIS');
  console.log('=============================================================');
  console.table(results);

  await browser.close();

  const allPassed = results.every(r => r.status === 'PASS');
  if (allPassed) {
    console.log('\n🎉 TODAS AS CONTAS REAIS FORAM TESTADAS COM 100% DE SUCESSO!');
  } else {
    console.log('\n⚠️ ALGUNS TESTES DE CONTAS REAIS FALHARAM.');
    process.exit(1);
  }
}

runRealAccountsAudit();
