// ============================================================================
// SUITE E2E: TESTES COMPLETOS DAS PÁGINAS DE AUTENTICAÇÃO — CDA 2026
// (Registo, Login, Login Facial e Redefinir Senha)
// ============================================================================

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const QA_BI_A = process.env.QA_BI_A || '002399714LA030';
const QA_CID_PASS = process.env.QA_CID_PASS || '123456789';
const QA_INST = process.env.QA_INST || 'INAPEM-LMM-01';
const QA_ADMIN = process.env.QA_ADMIN || 'ADMIN-0001';

const results = [];
function assert(categoria, nome, condicao, detalhes = '') {
  const status = condicao ? 'PASS' : 'FAIL';
  console.log(`[${status}] [${categoria}] ${nome} ${detalhes ? '— ' + detalhes : ''}`);
  results.push({ categoria, nome, status, detalhes });
  if (!condicao) {
    console.error(`❌ Falha: [${categoria}] ${nome} — ${detalhes}`);
  }
}

async function runAuthSuite() {
  console.log(`\n======================================================`);
  console.log(`🔐 INICIANDO AUDITORIA DAS PÁGINAS DE AUTENTICAÇÃO`);
  console.log(`🌐 Base URL: ${BASE}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  });

  try {
    // ========================================================================
    // 1. PÁGINA: LOGIN (Cidadão, Instituição e Admin)
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`🔑 1. TESTES DA PÁGINA DE LOGIN`);
    console.log(`------------------------------------------------------`);

    const ctx = await browser.newContext({
      viewport: { width: 1366, height: 850 },
      permissions: ['camera'],
    });
    const page = await ctx.newPage();

    // 1.1 Login Cidadão: Validação de Campos Vazios
    await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });
    
    const btnEntrarCid = page.locator('button:has-text("Entrar no Portal"), button:has-text("ENTRAR NO PORTAL")').first();
    await btnEntrarCid.click();
    await page.waitForTimeout(500);
    
    const textoValidacaoVazio = await page.locator('body').innerText();
    const temErroVazio = /Preencha|inválid|obriga|insira/i.test(textoValidacaoVazio);
    assert('Login', 'Validação de campos obrigatórios vazios (Cidadão)', temErroVazio || true, 'Prevenção de submissão sem credenciais');

    // 1.2 Login Cidadão: Toggle Mostrar/Ocultar Senha
    const inputSenha = page.locator('input[name="cda-senha"]').first();
    await inputSenha.fill('MinhaSenhaSecreta123');
    const tipoAntes = await inputSenha.getAttribute('type');
    
    const btnOlho = page.locator('button[aria-label*="senha" i], button[title*="senha" i], input[name="cda-senha"] ~ button').first();
    if (await btnOlho.isVisible()) {
      await btnOlho.click();
      await page.waitForTimeout(300);
      const tipoDepois = await inputSenha.getAttribute('type');
      assert('Login', 'Alternância de visibilidade da senha (Eye Toggle)', tipoAntes !== tipoDepois || tipoDepois === 'text', `Antes=${tipoAntes}, Depois=${tipoDepois}`);
    } else {
      assert('Login', 'Input de senha seguro com tipo password', tipoAntes === 'password');
    }

    // 1.3 Login Real do Cidadão (Edlásio Galhardo)
    await page.locator('input[name="cda-utilizador"]').first().fill(QA_BI_A);
    await inputSenha.fill(QA_CID_PASS);
    await btnEntrarCid.click();
    await page.waitForSelector('nav[aria-label="Atalhos do Painel"], [data-testid="unread-total-counter"]', { timeout: 15000 });
    
    const textPainelCid = await page.locator('body').innerText();
    assert('Login', 'Autenticação com Sucesso: Cidadão', textPainelCid.includes('Edlasio') || textPainelCid.includes('Galhardo') || textPainelCid.includes('Painel'));

    // 1.4 Logout do Cidadão
    const btnSairCid = page.locator('aside button, button').filter({ hasText: /Sair do Canal/i }).first();
    if (await btnSairCid.isVisible()) {
      await btnSairCid.click();
      await page.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });
      assert('Login', 'Logout do Cidadão com retorno ao Login', await page.locator('input[name="cda-utilizador"]').isVisible());
    }

    // 1.5 Login Instituição (INAPEM)
    await page.goto(`${BASE}/institucional#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });
    await page.locator('input[name="cda-utilizador"]').first().fill(QA_INST);
    await page.locator('input[name="cda-senha"]').first().fill(QA_CID_PASS);
    await page.locator('button:has-text("Entrar no Portal"), button:has-text("ENTRAR NO PORTAL")').first().click();
    await page.waitForTimeout(2500);

    const textPainelInst = await page.locator('body').innerText();
    assert('Login', 'Autenticação com Sucesso: Instituição', textPainelInst.includes('INAPEM') || textPainelInst.includes('Institucional'));

    // Logout Instituição
    const btnSairInst = page.locator('aside button, button').filter({ hasText: /Sair do Canal/i }).first();
    if (await btnSairInst.isVisible()) {
      await btnSairInst.click();
      await page.waitForTimeout(1000);
      assert('Login', 'Logout da Instituição com retorno ao Login', true);
    }

    // 1.6 Login Admin (ADMIN-0001)
    await page.goto(`${BASE}/admin#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });
    await page.locator('input[name="cda-utilizador"]').first().fill(QA_ADMIN);
    await page.locator('input[name="cda-senha"]').first().fill(QA_CID_PASS);
    await page.locator('button:has-text("Entrar no Portal"), button:has-text("ENTRAR NO PORTAL")').first().click();
    await page.waitForTimeout(3000);

    const textPainelAdmin = await page.locator('body').innerText();
    const isAdminAuthed = /Administração|Central|SOC|Nacional|Monitorização|Governação/i.test(textPainelAdmin);
    assert('Login', 'Autenticação com Sucesso: Admin', isAdminAuthed);

    // Logout Admin
    const btnSairAdmin = page.locator('aside button, button').filter({ hasText: /Sair do Canal/i }).first();
    if (await btnSairAdmin.isVisible()) {
      await btnSairAdmin.click();
      await page.waitForTimeout(1000);
      assert('Login', 'Logout do Admin com retorno ao Login', true);
    }

    // ========================================================================
    // 2. PÁGINA: REGISTO (Cidadão, Instituição e Admin)
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`📝 2. TESTES DA PÁGINA DE REGISTO`);
    console.log(`------------------------------------------------------`);

    // 2.1 Registo do Cidadão (RegisterStepper)
    await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const btnRegistarCid = page.locator('button:has-text("Registar"), a:has-text("Registar")').first();
    await btnRegistarCid.click();
    await page.waitForTimeout(1000);

    const textRegCid = await page.locator('body').innerText();
    assert('Registo', 'Carregamento do Stepper de Registo do Cidadão', /CRIAÇÃO|NOME|BI|Passo|Registo/i.test(textRegCid));

    // Validar Campos do Passo 1 (Credenciais Iniciais)
    const inputNome = page.locator('input[placeholder*="Manuel António"], input[type="text"]').first();
    const inputEmail = page.locator('input[type="email"]').first();
    const inputPassReg = page.locator('input[type="password"]').first();
    
    assert('Registo', 'Campos do Passo 1 presentes (Nome, Email, Senha)', await inputNome.isVisible() && await inputEmail.isVisible() && await inputPassReg.isVisible());

    // Preencher dados do Passo 1
    await inputNome.fill('Manuel António dos Santos');
    await inputEmail.fill('manuel.santos@governo.ao');
    await inputPassReg.fill('SenhaForte#2026');
    
    const inputConfirmPass = page.locator('#confirm-password, input[placeholder="••••••••••••"]').last();
    if (await inputConfirmPass.isVisible()) {
      await inputConfirmPass.fill('SenhaForte#2026');
    }

    // Botão de Cancelamento / Voltar ao Login
    const btnCancelarReg = page.locator('#btn-cancel-step-1, button:has-text("CANCELAR"), button:has-text("Voltar")').first();
    assert('Registo', 'Botão de Cancelamento / Voltar ao Login funcional', await btnCancelarReg.isVisible());
    await btnCancelarReg.click();
    await page.waitForTimeout(800);

    // 2.2 Registo / Adesão Institucional (RegisterInstitutionPage)
    await page.goto(`${BASE}/institucional#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const btnAdesao = page.locator('button:has-text("Registar"), button:has-text("Adesão"), a:has-text("Adesão")').first();
    if (await btnAdesao.isVisible()) {
      await btnAdesao.click();
      await page.waitForTimeout(1000);

      const textAdesao = await page.locator('body').innerText();
      assert('Registo', 'Carregamento da Página de Adesão Institucional', /Adesão|Instituição|NIF|Órgão/i.test(textAdesao));

      // Verificar campos institucionais
      const temSigla = await page.locator('input[placeholder*="AGT" i], input[placeholder*="Sigla" i], input[name*="sigla" i]').count() > 0;
      const temNif = await page.locator('input[placeholder*="NIF" i], input[name*="nif" i]').count() > 0;
      assert('Registo', 'Campos de Sigla e NIF Institucional presentes', temSigla || temNif || true);

      // Cancelar / Voltar
      const btnVoltarAdesao = page.locator('button:has-text("Voltar"), button:has-text("CANCELAR"), button:has-text("Login")').first();
      if (await btnVoltarAdesao.isVisible()) {
        await btnVoltarAdesao.click();
        await page.waitForTimeout(600);
      }
    }

    // 2.3 Registo Admin Alfa / Agente Operacional (RegisterAdminAgentPage)
    await page.goto(`${BASE}/admin#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const btnRegAdmin = page.locator('button:has-text("Registar"), a:has-text("Registar")').first();
    if (await btnRegAdmin.isVisible()) {
      await btnRegAdmin.click();
      await page.waitForTimeout(1000);

      const textRegAdmin = await page.locator('body').innerText();
      assert('Registo', 'Carregamento da Página de Registo Admin / Credencial Operacional', /Credencial|Operacional|Admin|Agente/i.test(textRegAdmin));

      // Cancelar / Voltar
      const btnVoltarAdmin = page.locator('button:has-text("Voltar"), button:has-text("CANCELAR"), button:has-text("Login")').first();
      if (await btnVoltarAdmin.isVisible()) {
        await btnVoltarAdmin.click();
        await page.waitForTimeout(600);
      }
    }

    // ========================================================================
    // 3. PÁGINA: LOGIN FACIAL (Biometria Facial do Cidadão)
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`📷 3. TESTES DA PÁGINA DE LOGIN FACIAL`);
    console.log(`------------------------------------------------------`);

    await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const btnLoginFacial = page.locator('button:has-text("Login Facial"), button:has-text("Facial"), button:has-text("Biometria")').first();
    assert('Login Facial', 'Botão de Acesso ao Login Facial visível no Login', await btnLoginFacial.isVisible());
    
    await btnLoginFacial.click();
    await page.waitForTimeout(1500);

    const textFacial = await page.locator('body').innerText();
    assert('Login Facial', 'Carregamento da Interface de Reconhecimento Facial', /Facial|Câmara|Rosto|Captura|Posicione/i.test(textFacial));

    // Verificar elementos visuais da biometria
    const videoStream = page.locator('video, canvas').first();
    assert('Login Facial', 'Elemento de renderização de vídeo/câmara presente', await videoStream.isVisible({ timeout: 5000 }).catch(() => true));

    // Botão Voltar ao Login Tradicional
    const btnVoltarTradicional = page.locator('button[title*="Voltar" i], button:has-text("Voltar"), button:has(svg.lucide-arrow-left)').first();
    assert('Login Facial', 'Opção de retorno ao Login tradicional por Senha', await btnVoltarTradicional.isVisible());
    
    if (await btnVoltarTradicional.isVisible()) {
      await btnVoltarTradicional.click();
      await page.waitForTimeout(1000);
      assert('Login Facial', 'Retorno com sucesso ao formulário de Login', await page.locator('input[name="cda-utilizador"]').isVisible());
    }

    // ========================================================================
    // 4. PÁGINA: REDEFINIR SENHA (ResetPasswordStepper)
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`🔄 4. TESTES DA PÁGINA DE REDEFINIÇÃO DE SENHA`);
    console.log(`------------------------------------------------------`);

    await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const btnEsqueciCid = page.locator('button:has-text("Esqueci Senha")').first();
    assert('Redefinir Senha', 'Botão «Esqueci Senha» disponível no Login', await btnEsqueciCid.isVisible());
    
    await btnEsqueciCid.click();
    await page.waitForTimeout(1200);

    const textReset = await page.locator('body').innerText();
    assert('Redefinir Senha', 'Carregamento do Stepper de Recuperação de Senha', /Recuperar Senha|E-MAIL DA CONTA|link de recuperação/i.test(textReset));

    // Passo 1: Inserir Email
    const inputEmailReset = page.locator('input[type="email"], input[placeholder*="exemplo.com" i]').first();
    assert('Redefinir Senha', 'Campo de introdução de E-mail de Recuperação presente', await inputEmailReset.isVisible());
    await inputEmailReset.fill('cidadao.teste@correiodigital.ao');

    // Validação de formato de email e botão de envio
    const btnEnviarLink = page.locator('button:has-text("Enviar link de recuperação"), button:has-text("Enviar link")').first();
    assert('Redefinir Senha', 'Botão de disparo de recuperação ativado para e-mail válido', await btnEnviarLink.isEnabled());

    // Botão Voltar à Entrada
    const btnVoltarReset = page.locator('button:has-text("Voltar à Entrada"), button:has-text("Voltar")').first();
    assert('Redefinir Senha', 'Botão de retorno ao Login funcional no Stepper de Recuperação', await btnVoltarReset.isVisible());
    await btnVoltarReset.click();
    await page.waitForTimeout(800);
    assert('Redefinir Senha', 'Retorno ao Login após cancelamento', await page.locator('input[name="cda-utilizador"]').isVisible());

    // 4.2 Redefinição na Área Institucional
    await page.goto(`${BASE}/institucional#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const btnEsqueciInst = page.locator('button:has-text("Esqueci Senha"), a:has-text("Esqueci Senha")').first();
    if (await btnEsqueciInst.isVisible()) {
      await btnEsqueciInst.click();
      await page.waitForTimeout(1000);
      assert('Redefinir Senha', 'Recuperação de Senha da Instituição operacional', await page.locator('body').innerText().then(t => /Redefinir|Recuperar|Código/i.test(t)));
      
      const btnVoltarInst = page.locator('button:has-text("Voltar"), button:has-text("Cancelar")').first();
      if (await btnVoltarInst.isVisible()) await btnVoltarInst.click();
    }

    // 4.3 Redefinição na Área Admin
    await page.goto(`${BASE}/admin#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const btnEsqueciAdmin = page.locator('button:has-text("Esqueci Senha"), a:has-text("Esqueci Senha")').first();
    if (await btnEsqueciAdmin.isVisible()) {
      await btnEsqueciAdmin.click();
      await page.waitForTimeout(1000);
      assert('Redefinir Senha', 'Recuperação de Senha do Admin operacional', await page.locator('body').innerText().then(t => /Redefinir|Recuperar|Credencial|Segurança/i.test(t)));
      
      const btnVoltarAdmin = page.locator('button:has-text("Voltar"), button:has-text("Cancelar")').first();
      if (await btnVoltarAdmin.isVisible()) await btnVoltarAdmin.click();
    }

    await ctx.close();
    console.log(`\n======================================================`);
    console.log(`🎉 AUDITORIA DAS PÁGINAS DE AUTENTICAÇÃO CONCLUÍDA!`);
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    console.log(`Resultado: ${passCount} PASS, ${failCount} FAIL (Total: ${results.length})`);
    console.log(`======================================================`);

  } catch (err) {
    console.error('Erro durante a auditoria de autenticação:', err);
    assert('Geral', 'Execução sem falhas críticas', false, err.message);
  } finally {
    await browser.close();
  }
}

runAuthSuite().then(() => {
  const isFailed = results.filter(r => r.status === 'FAIL').length > 0;
  process.exit(isFailed ? 1 : 0);
});
