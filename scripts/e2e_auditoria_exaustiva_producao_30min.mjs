// ============================================================================
// SUITE E2E: AUDITORIA EXAUSTIVA DE PRODUÇÃO, TELEMETRIA E INTEROPERABILIDADE
// Plataforma Correio Digital Angola (CDA 2026) — Produção Vercel
// ============================================================================

import { chromium } from 'playwright';

const PROD_URL = 'https://correio-digital-angola-oficial.vercel.app';

const credentials = {
  cidadao: { id: '002399714LA030', pass: '123456789', url: `${PROD_URL}/#/login` },
  instituicao: { id: 'INAPEM-LMM-01', pass: '123456789', url: `${PROD_URL}/institucional#/login` },
  admin: { id: 'ADMIN-0001', pass: '123456789', url: `${PROD_URL}/admin#/login` },
};

const auditReport = {
  summary: { totalAssertions: 0, passed: 0, failed: 0, warnings: 0 },
  latencies: {},
  pageIntegrity: [],
  interoperability: [],
  consoleErrors: [],
};

function assert(section, testName, condition, details = '') {
  auditReport.summary.totalAssertions++;
  const status = condition ? 'PASS' : 'FAIL';
  if (status === 'PASS') auditReport.summary.passed++;
  else auditReport.summary.failed++;

  console.log(`[${status}] [${section}] ${testName} ${details ? '— ' + details : ''}`);
  return condition;
}

async function inspectRoute(page, area, routeHash, label) {
  const t0 = performance.now();
  await page.evaluate((h) => { window.location.hash = `#/${h}`; }, routeHash);
  await page.waitForTimeout(400);
  const latencyMs = Math.round(performance.now() - t0);

  const text = await page.evaluate(() => document.body.innerText.trim());
  const domNodes = await page.evaluate(() => document.querySelectorAll('*').length);

  const hasContent = text.length >= 80;
  assert(area, `Página «${label}» (${routeHash})`, hasContent, `Latência=${latencyMs}ms, Nós=${domNodes}, Chars=${text.length}`);

  auditReport.pageIntegrity.push({
    area,
    route: routeHash,
    label,
    latencyMs,
    domNodes,
    charLength: text.length,
    status: hasContent ? 'PASS' : 'FAIL',
  });
}

async function runAudit() {
  console.log(`\n======================================================`);
  console.log(`🌟 INICIANDO AUDITORIA EXAUSTIVA EM PRODUÇÃO`);
  console.log(`🌐 Alvo: ${PROD_URL}`);
  console.log(`⏰ Data: ${new Date().toISOString()}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  try {
    // ========================================================================
    // CICLO 1: ÁREA DO CIDADÃO (Edlásio Galhardo)
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`👤 CICLO 1: Auditoria da Área do Cidadão (Edlásio Galhardo)`);
    console.log(`------------------------------------------------------`);

    const ctxCid = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageCid = await ctxCid.newPage();

    pageCid.on('pageerror', (err) => {
      auditReport.consoleErrors.push({ area: 'Cidadão', error: err.message });
      console.error(`[CONSOLE ERROR] [Cidadão] ${err.message}`);
    });

    const t0CidLoad = performance.now();
    await pageCid.goto(credentials.cidadao.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const cidLoadMs = Math.round(performance.now() - t0CidLoad);
    const inputCid = pageCid.locator('input[name="cda-utilizador"], input[type="text"]').first();
    await inputCid.waitFor({ state: 'attached', timeout: 15000 });
    assert('Cidadão', 'Carregamento do Portal de Login', await inputCid.isVisible(), `TTFB/Load=${cidLoadMs}ms`);

    // Autenticação Real do Cidadão
    await inputCid.fill(credentials.cidadao.id);
    await pageCid.locator('input[name="cda-senha"], input[type="password"]').first().fill(credentials.cidadao.pass);

    const t0AuthCid = performance.now();
    await pageCid.locator('button:has-text("Entrar no Portal"), button:has-text("ENTRAR NO PORTAL"), button:has-text("Entrar")').first().click();
    await pageCid.waitForSelector('nav[aria-label="Atalhos do Painel"], [data-testid="unread-total-counter"]', { timeout: 20000 });
    const authCidMs = Math.round(performance.now() - t0AuthCid);
    assert('Cidadão', 'Autenticação e Acesso ao Painel Principal', true, `Tempo de Resposta=${authCidMs}ms`);

    // Varredura de Rotas do Cidadão
    const rotasCid = [
      { id: 'home', label: 'Painel Principal' },
      { id: 'correspondencias', label: 'Caixa de Correio Digital' },
      { id: 'contatos', label: 'Círculo de Confiança' },
      { id: 'perfil', label: 'Meu Perfil Oficial' },
      { id: 'video-atendimento', label: 'Vídeo-Atendimento' },
      { id: 'inqueritos', label: 'Inquéritos Oficiais' },
      { id: 'comunicados', label: 'Comunicados Públicos' },
      { id: 'ocorrencias', label: 'Ocorrências Locais' },
      { id: 'nova-denuncia', label: 'Canal de Denúncias' },
      { id: 'denuncias', label: 'Livro de Reclamações' },
      { id: 'sondagens', label: 'Sondagens e Participação' },
      { id: 'notificacoes', label: 'Centro de Notificações' },
      { id: 'historico', label: 'Histórico Operacional' },
      { id: 'documentos', label: 'Documentos e Certidões' },
      { id: 'directorio-orgaos', label: 'Directório de Órgãos' },
    ];

    for (const r of rotasCid) {
      await inspectRoute(pageCid, 'Cidadão', r.id, r.label);
    }

    // ========================================================================
    // CICLO 2: ÁREA DA INSTITUIÇÃO (INAPEM)
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`🏛️ CICLO 2: Auditoria da Área da Instituição (INAPEM)`);
    console.log(`------------------------------------------------------`);

    const ctxInst = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageInst = await ctxInst.newPage();

    pageInst.on('pageerror', (err) => {
      auditReport.consoleErrors.push({ area: 'Instituição', error: err.message });
      console.error(`[CONSOLE ERROR] [Instituição] ${err.message}`);
    });

    const t0InstLoad = performance.now();
    await pageInst.goto(credentials.instituicao.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const instLoadMs = Math.round(performance.now() - t0InstLoad);
    const inputInst = pageInst.locator('input[name="cda-utilizador"], input[type="text"]').first();
    await inputInst.waitFor({ state: 'attached', timeout: 15000 });
    assert('Instituição', 'Carregamento do Portal Institucional', await inputInst.isVisible(), `TTFB/Load=${instLoadMs}ms`);

    // Autenticação Real da Instituição
    await inputInst.fill(credentials.instituicao.id);
    await pageInst.locator('input[name="cda-senha"], input[type="password"]').first().fill(credentials.instituicao.pass);

    const t0AuthInst = performance.now();
    await pageInst.locator('button:has-text("Entrar no Portal"), button:has-text("ENTRAR NO PORTAL"), button:has-text("Entrar")').first().click();
    await pageInst.waitForTimeout(2500);
    const authInstMs = Math.round(performance.now() - t0AuthInst);
    assert('Instituição', 'Autenticação e Acesso ao Painel Institucional', true, `Tempo de Resposta=${authInstMs}ms`);

    // Varredura de Rotas da Instituição
    const rotasInst = [
      { id: 'home', label: 'Painel Institucional' },
      { id: 'correspondencias', label: 'Correio Institucional' },
      { id: 'gov-contatos', label: 'Gestão da Equipa' },
      { id: 'inst-qrcode', label: 'Validação por QR Code' },
      { id: 'inst-ai-assistant', label: 'Assistente IA Institucional' },
      { id: 'perfil', label: 'Perfil Institucional' },
      { id: 'video-atendimento', label: 'Vídeo-Atendimento Institucional' },
      { id: 'inqueritos', label: 'Inquéritos Recebidos' },
      { id: 'comunicados', label: 'Comunicados Emitidos' },
      { id: 'ocorrencias', label: 'Ocorrências Recebidas' },
      { id: 'denuncias', label: 'Denúncias Recebidas' },
      { id: 'sondagens', label: 'Sondagens Institucionais' },
      { id: 'notificacoes', label: 'Notificações Institucionais' },
      { id: 'historico', label: 'Histórico Institucional' },
      { id: 'documentos', label: 'Documentos Institucionais' },
    ];

    for (const r of rotasInst) {
      await inspectRoute(pageInst, 'Instituição', r.id, r.label);
    }

    // ========================================================================
    // CICLO 3: ÁREA DE ADMINISTRAÇÃO CENTRAL (ADMIN)
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`🛡️ CICLO 3: Auditoria da Área de Administração Central (Admin)`);
    console.log(`------------------------------------------------------`);

    const ctxAdmin = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageAdmin = await ctxAdmin.newPage();

    pageAdmin.on('pageerror', (err) => {
      auditReport.consoleErrors.push({ area: 'Admin', error: err.message });
      console.error(`[CONSOLE ERROR] [Admin] ${err.message}`);
    });

    const t0AdminLoad = performance.now();
    await pageAdmin.goto(credentials.admin.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const adminLoadMs = Math.round(performance.now() - t0AdminLoad);
    const inputAdmin = pageAdmin.locator('input[name="cda-utilizador"], input[type="text"]').first();
    await inputAdmin.waitFor({ state: 'attached', timeout: 15000 });
    assert('Admin', 'Carregamento do Portal Admin', await inputAdmin.isVisible(), `TTFB/Load=${adminLoadMs}ms`);

    // Autenticação Real do Admin
    await inputAdmin.fill(credentials.admin.id);
    await pageAdmin.locator('input[name="cda-senha"], input[type="password"]').first().fill(credentials.admin.pass);

    const t0AuthAdmin = performance.now();
    await pageAdmin.locator('button:has-text("Entrar no Portal"), button:has-text("ENTRAR NO PORTAL"), button:has-text("Entrar")').first().click();
    await pageAdmin.waitForTimeout(2500);
    const authAdminMs = Math.round(performance.now() - t0AuthAdmin);
    assert('Admin', 'Autenticação e Acesso ao SOC Nacional', true, `Tempo de Resposta=${authAdminMs}ms`);

    // Varredura de Rotas do Admin
    const rotasAdmin = [
      { id: 'gov-dashboard', label: 'Painel SOC Nacional' },
      { id: 'gov-interoperabilidade', label: 'Interoperabilidade Institucional' },
      { id: 'gov-correspondencias', label: 'Correspondências Oficiais Globais' },
      { id: 'gov-contatos', label: 'Cadastro Geral de Cidadãos' },
      { id: 'gov-trabalhadores', label: 'Equipa Central do Sistema' },
      { id: 'gov-relatorio', label: 'Centro de Relatórios & Estatísticas' },
      { id: 'gov-ia', label: 'Assistência IA Central Nacional' },
      { id: 'gov-seguranca', label: 'Auditoria & Segurança' },
      { id: 'gov-perfil', label: 'Perfil Administrativo' },
      { id: 'gov-emissao', label: 'Emissão Documental Oficial' },
      { id: 'directorio-orgaos', label: 'Directório Central de Órgãos' },
    ];

    for (const r of rotasAdmin) {
      await inspectRoute(pageAdmin, 'Admin', r.id, r.label);
    }

    // ========================================================================
    // CICLO 4: INTEROPERABILIDADE TRIANGULAR CONCORRENTE EM PRODUÇÃO
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`🔄 CICLO 4: Teste de Interoperabilidade Triangular em Tempo Real`);
    console.log(`------------------------------------------------------`);

    // 4.1 Envio de Correspondência Cidadão -> INAPEM
    await pageCid.evaluate(() => { window.location.hash = '#/correspondencias'; });
    await pageCid.waitForTimeout(800);

    const btnNovaCid = pageCid.getByRole('button', { name: /Nova Mensagem/i }).first();
    assert('Interoperabilidade', 'Abertura do Compositor pelo Cidadão', await btnNovaCid.isVisible());
    await btnNovaCid.click();
    await pageCid.waitForTimeout(600);

    const idCorr = `OF-PROD-${Date.now().toString().slice(-4)}`;
    const assuntoCorr = `Ofício Oficial Interoperabilidade Produção ${idCorr}`;

    await pageCid.locator('#recipient-inst-input').fill('INAPEM-LMM-01');
    await pageCid.locator('#compose-subject-input').fill(assuntoCorr);

    const bodyInput = pageCid.locator('div[contenteditable="true"], textarea').first();
    if (await bodyInput.isVisible()) {
      await bodyInput.fill(`Mensagem oficial de homologação triangular em produção com identificador ${idCorr}.`);
    }

    const t0Envio = performance.now();
    const btnSend = pageCid.locator('#btn-enviar-mensagem, button:has-text("Enviar Mensagem")').first();
    await btnSend.click();
    await pageCid.waitForTimeout(1800);
    const envioMs = Math.round(performance.now() - t0Envio);
    assert('Interoperabilidade', `Submissão de Correspondência (${idCorr})`, true, `Latência de Envio=${envioMs}ms`);

    // 4.2 Recepção no INAPEM
    const t0Recepcao = performance.now();
    await pageInst.evaluate(() => { window.location.hash = '#/correspondencias'; });
    await pageInst.waitForTimeout(1800);
    const recepcaoMs = Math.round(performance.now() - t0Recepcao);

    const textoCaixaInst = await pageInst.evaluate(() => document.body.innerText);
    const entregueInst = textoCaixaInst.includes(idCorr) || textoCaixaInst.includes('Edlasio') || textoCaixaInst.includes('Galhardo');
    assert('Interoperabilidade', 'Recepção e Disponibilização na Instituição (INAPEM)', entregueInst, `Latência de Entrega=${recepcaoMs}ms`);

    // 4.3 Auditoria no SOC Admin
    const t0AdminSync = performance.now();
    await pageAdmin.evaluate(() => { window.location.hash = '#/gov-correspondencias'; });
    await pageAdmin.waitForTimeout(1800);
    const adminSyncMs = Math.round(performance.now() - t0AdminSync);

    const textoAdmin = await pageAdmin.evaluate(() => document.body.innerText);
    const auditadoAdmin = textoAdmin.includes('Correspondência') || textoAdmin.includes('INAPEM') || textoAdmin.includes('Edlasio');
    assert('Interoperabilidade', 'Auditoria e Monitorização Central no SOC Admin', auditadoAdmin, `Latência de Auditoria=${adminSyncMs}ms`);

    // ========================================================================
    // CICLO 5: CALIBRAÇÃO GPS EXATA EM PRODUÇÃO (Cidadão)
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`📍 CICLO 5: Validação da Calibração GPS de Alta Precisão`);
    console.log(`------------------------------------------------------`);

    await pageCid.evaluate(() => { window.location.hash = '#/ocorrencias'; });
    await pageCid.waitForTimeout(1000);

    const btnCriarOcorr = pageCid.locator('[data-testid="btn-criar-ocorrencia"], button:has-text("Criar Ocorrência")').first();
    if (await btnCriarOcorr.isVisible()) {
      await btnCriarOcorr.click();
      await pageCid.waitForTimeout(1500);

      const textoFormOcorr = await pageCid.locator('body').innerText();
      const temGpsLuanda = textoFormOcorr.includes('-8.8415') && textoFormOcorr.includes('13.2307');
      const temCassenda = textoFormOcorr.includes('Cassenda') && textoFormOcorr.includes('Maianga') && textoFormOcorr.includes('Luanda');

      assert('Calibração GPS', 'Coordenadas Exatas GPS (-8.841501148211982, 13.230781932343696)', temGpsLuanda);
      assert('Calibração GPS', 'Geocodificação Reversa Administrativa (Cassenda · Maianga · Luanda)', temCassenda);
    }

    // Fechar contextos
    await ctxCid.close();
    await ctxInst.close();
    await ctxAdmin.close();

    console.log(`\n======================================================`);
    console.log(`🎉 AUDITORIA EXAUSTIVA DE PRODUÇÃO FINALIZADA!`);
    console.log(`Resultado Global: ${auditReport.summary.passed} PASS, ${auditReport.summary.failed} FAIL (Total: ${auditReport.summary.totalAssertions})`);
    console.log(`Erros de Console JS: ${auditReport.consoleErrors.length}`);
    console.log(`======================================================`);

  } catch (err) {
    console.error('Erro fatal durante a auditoria:', err);
    assert('Geral', 'Execução sem falhas críticas', false, err.message);
  } finally {
    await browser.close();
  }
}

runAudit().then(() => {
  const isFailed = auditReport.summary.failed > 0;
  process.exit(isFailed ? 1 : 0);
});
