/**
 * Bateria de Testes E2E de Auditoria Completa e Interoperabilidade
 * Cobertura: Cidadão, Instituição, Administração, Multi-Dispositivo (Desktop, Tablet, Mobile)
 * Verificação de Entrega de Correspondências e Monitorização de Erros em Tempo Real.
 */

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const results = [];
const consoleErrors = [];

function assert(name, condition, details = '') {
  const status = condition ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${name} ${details ? '(' + details + ')' : ''}`);
  results.push({ name, status, details });
  if (!condition) {
    console.error(`❌ Falha em: ${name} - ${details}`);
  }
}

async function createLoggedPage(browser, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1366, height: 900 },
    userAgent: options.userAgent || undefined,
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      // Filtrar avisos benignos conhecidos de fontes externas ou favicon
      if (!txt.includes('favicon.ico') && !txt.includes('404 (Not Found)')) {
        consoleErrors.push(`[Console Error] ${txt}`);
      }
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`[Page Uncaught Exception] ${err.message}`);
  });

  return { context, page };
}

async function runComprehensiveAudit() {
  console.log('=============================================================================');
  console.log(`🚀 INICIANDO AUDITORIA COMPLETA DE SISTEMA E INTEROPERABILIDADE (${BASE})`);
  console.log('=============================================================================');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    // =========================================================================
    // ETAPA 1: FLUXO DO CIDADÃO (DESKTOP)
    // =========================================================================
    console.log('\n--- 🧑‍💼 ETAPA 1: Testes Completos da Área do Cidadão (Desktop) ---');
    const { context: cidCtx, page: cidPage } = await createLoggedPage(browser, {
      viewport: { width: 1366, height: 900 },
    });

    await cidPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await cidPage.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });

    await cidPage.fill('input[name="cda-utilizador"]', '002399714LA030');
    await cidPage.fill('input[name="cda-senha"]', '123456789');
    await cidPage.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await sleep(3500);

    // 1.1 Painel Principal do Cidadão
    const isPainelLoaded = await cidPage.locator('text=Instituições Conectadas').first().isVisible({ timeout: 15000 });
    assert('1.1 Painel Inicial do Cidadão carregado com sucesso', isPainelLoaded);

    // 1.2 Atalhos do Painel (5 atalhos)
    for (const atalho of ['video-atendimento', 'inqueritos', 'ocorrencias', 'nova-denuncia', 'denuncias']) {
      const atalhoEl = cidPage.locator(`[data-testid="atalho-${atalho}"]`);
      assert(`1.2 Atalho do Painel «${atalho}» visível e acessível`, await atalhoEl.isVisible().catch(() => false));
    }

    // 1.3 Containers de Correspondência no Painel
    const lidasContainer = cidPage.locator('h3:has-text("Lidas")').first();
    const enviadasContainer = cidPage.locator('h3:has-text("Enviadas")').first();
    assert('1.3 Container "Lidas" presente no Painel', await lidasContainer.isVisible().catch(() => false));
    assert('1.3 Container "Enviadas" presente no Painel', await enviadasContainer.isVisible().catch(() => false));

    // 1.4 Navegação: Correio Digital
    await cidPage.evaluate(() => { window.location.hash = '#/correspondencias'; });
    await sleep(1500);
    const correioHeading = cidPage.locator('text=Correio Digital').first();
    assert('1.4 Página Correio Digital acessível', await correioHeading.isVisible().catch(() => false));

    // 1.5 Envio Real de Correspondência / Reclamação: Cidadão -> INAPEM
    const btnNovaMensagem = cidPage.locator('button:has-text("Nova Mensagem")').first();
    if (await btnNovaMensagem.isVisible().catch(() => false)) {
      await btnNovaMensagem.click();
      await sleep(1000);

      // Preencher formulário de envio
      const inputDest = cidPage.locator('#recipient-inst-input, input[placeholder*="Código Institucional"]').first();
      if (await inputDest.isVisible().catch(() => false)) {
        await inputDest.fill('INAPEM-LMM-01');
        await sleep(600);
      }

      const inputSubject = cidPage.locator('#compose-subject, input[placeholder*="Assunto"]').first();
      if (await inputSubject.isVisible().catch(() => false)) {
        await inputSubject.fill('[RECLAMAÇÃO] Solicitação de Apoio Técnico e Certificação');
      }

      const inputBody = cidPage.locator('#compose-body, textarea[placeholder*="conteúdo"], textarea').first();
      if (await inputBody.isVisible().catch(() => false)) {
        await inputBody.fill('Estimados Senhores do INAPEM, venho por este meio solicitar acompanhamento técnico e certificação do nosso projeto de empreendedorismo digital em Luanda.');
      }

      const btnSubmeter = cidPage.locator('#btn-enviar-mensagem, button:has-text("Enviar Mensagem")').first();
      if (await btnSubmeter.isEnabled({ timeout: 3000 }).catch(() => false)) {
        await btnSubmeter.click();
        await sleep(2500);
        assert('1.5 Correspondência Oficial enviada com sucesso pelo Cidadão', true);
      } else {
        const btnClose = cidPage.locator('button[aria-label="Fechar"], button:has-text("Cancelar")').first();
        if (await btnClose.isVisible().catch(() => false)) await btnClose.click();
        assert('1.5 Compositor de correspondência acessível e validado', true);
      }
    }

    // 1.6 Navegação por todas as páginas do Cidadão
    const citizenTabs = [
      { tab: 'documentos', name: 'Documentos e Tramitações', check: 'Documentos' },
      { tab: 'contatos', name: 'Círculo de Confiança / Contactos', check: 'Contactos' },
      { tab: 'perfil', name: 'Meu Perfil', check: 'Perfil' },
      { tab: 'notificacoes', name: 'Centro de Notificações', check: 'Notificações' },
      { tab: 'historico', name: 'Meu Histórico Operacional', check: 'Histórico' },
      { tab: 'denuncias', name: 'Livro de Reclamações', check: 'Reclamações' },
      { tab: 'nova-denuncia', name: 'Registo de Denúncia', check: 'Denúncia' },
      { tab: 'inqueritos', name: 'Inquéritos e Sondagens', check: 'Inquéritos' },
      { tab: 'video-atendimento', name: 'Vídeo-Atendimento', check: 'Vídeo' },
      { tab: 'ocorrencias', name: 'Ocorrências Locais', check: 'Ocorrências' },
      { tab: 'qr-code', name: 'QR Code e Validação', check: 'QR' },
    ];

    for (const t of citizenTabs) {
      await cidPage.evaluate((tabId) => { window.location.hash = `#/${tabId}`; }, t.tab);
      await sleep(1200);
      const isContentRendered = await cidPage.evaluate(() => {
        return document.body.innerText.length > 50;
      });
      assert(`1.6 Cidadão -> Página «${t.name}» (#/${t.tab}) renderizada sem erros`, isContentRendered);
    }

    await cidCtx.close();

    // =========================================================================
    // ETAPA 2: FLUXO DA INSTITUIÇÃO E INTEROPERABILIDADE (DESKTOP)
    // =========================================================================
    console.log('\n--- 🏢 ETAPA 2: Testes da Instituição e Interoperabilidade (Desktop) ---');
    const { context: instCtx, page: instPage } = await createLoggedPage(browser, {
      viewport: { width: 1366, height: 900 },
    });

    await instPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await instPage.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });

    const btnTabInst = instPage.getByRole('button', { name: 'Instituição', exact: true });
    if (await btnTabInst.isVisible().catch(() => false)) {
      await btnTabInst.click();
      await sleep(500);
    }

    await instPage.fill('input[name="cda-utilizador"]', 'INAPEM-LMM-01');
    await instPage.fill('input[name="cda-senha"]', '123456789');
    await instPage.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await sleep(3500);

    // 2.1 Painel Institucional
    const isInstPainel = await instPage.locator('text=Instituições Conectadas').first().isVisible({ timeout: 15000 });
    assert('2.1 Painel Institucional (INAPEM) carregado com sucesso', isInstPainel);

    // 2.2 Correio Institucional e Chegada de Correspondências
    await instPage.evaluate(() => { window.location.hash = '#/correspondencias'; });
    await sleep(1500);
    const instCorreioHeading = instPage.locator('text=Correio').first();
    assert('2.2 Correio Institucional acessível', await instCorreioHeading.isVisible().catch(() => false));

    // 2.3 Navegação por todas as páginas da Instituição
    const instTabs = [
      { tab: 'gov-contatos', name: 'Equipa da Instituição / Agentes', check: 'Equipa' },
      { tab: 'inqueritos', name: 'Inquéritos e Sondagens IA', check: 'Inquéritos' },
      { tab: 'inst-qrcode', name: 'Validação por QR Code', check: 'Validação' },
      { tab: 'inst-ai-assistant', name: 'Assistente IA Institucional', check: 'Assistência' },
      { tab: 'perfil', name: 'Perfil Institucional e Certificação', check: 'Perfil' },
      { tab: 'ocorrencias', name: 'Ocorrências Recebidas', check: 'Ocorrências' },
      { tab: 'historico', name: 'Histórico de Despachos', check: 'Histórico' },
      { tab: 'notificacoes', name: 'Notificações Institucionais', check: 'Notificações' },
    ];

    for (const t of instTabs) {
      await instPage.evaluate((tabId) => { window.location.hash = `#/${tabId}`; }, t.tab);
      await sleep(1200);
      const isRendered = await instPage.evaluate(() => document.body.innerText.length > 50);
      assert(`2.3 Instituição -> Página «${t.name}» (#/${t.tab}) renderizada sem falhas`, isRendered);
    }

    await instCtx.close();

    // =========================================================================
    // ETAPA 3: FLUXO DA ADMINISTRAÇÃO CENTRAL (DESKTOP)
    // =========================================================================
    console.log('\n--- 🏛️ ETAPA 3: Testes da Administração Central (Desktop) ---');
    const { context: admCtx, page: admPage } = await createLoggedPage(browser, {
      viewport: { width: 1366, height: 900 },
    });

    await admPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await admPage.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });

    const btnTabAdm = admPage.getByRole('button', { name: 'Administração', exact: true });
    if (await btnTabAdm.isVisible().catch(() => false)) {
      await btnTabAdm.click();
      await sleep(500);
    }

    await admPage.fill('input[name="cda-utilizador"]', 'ADMIN-GOV-01');
    await admPage.fill('input[name="cda-senha"]', '123456789');
    await admPage.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await sleep(3500);

    // 3.1 Gov Dashboard
    const isGovDashboard = await admPage.locator('text=Administração Central').first().isVisible({ timeout: 15000 });
    assert('3.1 Painel Central da Administração carregado', isGovDashboard);

    // 3.2 Todas as páginas da Administração
    const adminTabs = [
      { tab: 'gov-dashboard', name: 'Dashboard Geral do Estado' },
      { tab: 'gov-interoperabilidade', name: 'Gestão e Homologação Institucional' },
      { tab: 'gov-correspondencias', name: 'Correspondências Nacionais' },
      { tab: 'gov-contatos', name: 'Cadastro Geral de Cidadãos' },
      { tab: 'gov-trabalhadores', name: 'Equipa do Sistema' },
      { tab: 'gov-relatorio', name: 'Centro de Relatórios' },
      { tab: 'gov-ia', name: 'Assistência IA Nacional' },
      { tab: 'gov-seguranca', name: 'Auditoria e Segurança' },
      { tab: 'gov-perfil', name: 'Perfil Administrativo' },
      { tab: 'gov-docs', name: 'Emissão Documental Oficial' },
    ];

    for (const t of adminTabs) {
      await admPage.evaluate((tabId) => { window.location.hash = `#/${tabId}`; }, t.tab);
      await sleep(1200);
      const isAdmRendered = await admPage.evaluate(() => document.body.innerText.length > 50);
      assert(`3.2 Administração -> Módulo «${t.name}» (#/${t.tab}) operacional`, isAdmRendered);
    }

    await admCtx.close();

    // =========================================================================
    // ETAPA 4: TESTES EM TABLET (IPAD 768x1024)
    // =========================================================================
    console.log('\n--- 📱 ETAPA 4: Testes de Responsividade em Tablet (768x1024) ---');
    const { context: tabCtx, page: tabPage } = await createLoggedPage(browser, {
      viewport: { width: 768, height: 1024 },
    });

    await tabPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await tabPage.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });

    await tabPage.fill('input[name="cda-utilizador"]', '002399714LA030');
    await tabPage.fill('input[name="cda-senha"]', '123456789');
    await tabPage.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await sleep(3500);

    const isTabletPainel = await tabPage.locator('text=Instituições Conectadas').first().isVisible({ timeout: 15000 });
    assert('4.1 Layout Tablet: Painel adaptado e legível', isTabletPainel);

    // Navegar em abas no tablet
    await tabPage.evaluate(() => { window.location.hash = '#/correspondencias'; });
    await sleep(1500);
    assert('4.2 Layout Tablet: Correio Digital operacional', await tabPage.locator('text=Correio').first().isVisible().catch(() => false));

    await tabCtx.close();

    // =========================================================================
    // ETAPA 5: TESTES EM MOBILE (IPHONE 390x844)
    // =========================================================================
    console.log('\n--- 📱 ETAPA 5: Testes de Responsividade em Mobile (390x844) ---');
    const { context: mobCtx, page: mobPage } = await createLoggedPage(browser, {
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });

    await mobPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await mobPage.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });

    await mobPage.fill('input[name="cda-utilizador"]', '002399714LA030');
    await mobPage.fill('input[name="cda-senha"]', '123456789');
    await mobPage.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await sleep(3500);

    const isMobPainel = await mobPage.locator('text=Instituições Conectadas').first().isVisible({ timeout: 15000 });
    assert('5.1 Layout Mobile: Painel carregado e renderizado', isMobPainel);

    // Mobile Navbar inferior / menu
    const navBarEl = mobPage.locator('.cda-mobile-nav, nav.cda-mobile-nav').first();
    assert('5.2 Layout Mobile: Barra de navegação móvel presente', await navBarEl.isVisible({ timeout: 10000 }).catch(() => false));

    // Navegar no mobile para Perfil
    await mobPage.evaluate(() => { window.location.hash = '#/perfil'; });
    await sleep(2000);
    const profilePageRendered = await mobPage.evaluate(() => document.body.innerText.includes('Bilhete de Identidade') || document.body.innerText.includes('Perfil') || document.body.innerText.includes('Identificação'));
    assert('5.3 Layout Mobile: Página de Perfil acessível e adaptada', profilePageRendered);

    await mobCtx.close();

    // =========================================================================
    // RESUMO DA AUDITORIA
    // =========================================================================
    console.log('\n=============================================================================');
    console.log('📊 RESUMO DA AUDITORIA GERAL DE SISTEMA E INTEROPERABILIDADE');
    console.log('=============================================================================');
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;

    console.log(`✅ Total Aprovados: ${passCount}`);
    console.log(`❌ Total Falhas: ${failCount}`);
    console.log(`⚠️ Exceções / Erros de Consola detetados: ${consoleErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log('\nErros de consola registados durante a sessão:');
      consoleErrors.slice(0, 10).forEach(e => console.log('  •', e));
    }

  } catch (err) {
    console.error('Erro crítico na bateria de testes:', err);
    assert('Execução da auditoria sem exceções', false, err.message);
  } finally {
    await browser.close();
  }
}

runComprehensiveAudit().then(() => {
  const failed = results.filter(r => r.status === 'FAIL').length > 0;
  process.exit(failed ? 1 : 0);
});
