// ============================================================================
// AUDITORIA TÉCNICA DE PERFORMANCE E INTEROPERABILIDADE - CDA 2026
// Especialista em Engenharia de Performance Web e Otimização de Sistemas
// ============================================================================

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';

const auditResults = {
  vitals: [],
  pages: [],
  network: { totalRequests: 0, totalBytes: 0, staticAssets: 0, apiCalls: 0 },
  interopLatency: {},
  memoryProfile: {},
  diagnostics: [],
};

async function collectPagePerformance(page, area, pageName) {
  return await page.evaluate((info) => {
    const navEntries = performance.getEntriesByType('navigation');
    const nav = navEntries.length > 0 ? navEntries[0] : null;
    const paintEntries = performance.getEntriesByType('paint');
    
    let fcp = 0;
    paintEntries.forEach((p) => {
      if (p.name === 'first-contentful-paint') fcp = Math.round(p.startTime);
    });

    const domNodes = document.querySelectorAll('*').length;
    const jsHeap = window.performance?.memory ? {
      usedJSHeapSizeMB: +(window.performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2),
      totalJSHeapSizeMB: +(window.performance.memory.totalJSHeapSize / (1024 * 1024)).toFixed(2),
    } : null;

    return {
      area: info.area,
      pageName: info.pageName,
      ttfb: nav ? Math.round(nav.responseStart - nav.requestStart) : 0,
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : 0,
      loadTime: nav ? Math.round(nav.loadEventEnd - nav.startTime) : 0,
      fcp,
      domNodes,
      jsHeap,
    };
  }, { area, pageName });
}

async function run() {
  console.log(`\n======================================================`);
  console.log(`🔬 INICIANDO AUDITORIA AVANÇADA DE PERFORMANCE`);
  console.log(`🌐 Base URL: ${BASE}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  // 1. ÁREA DO CIDADÃO
  console.log(`▶ 1. Auditoria de Performance — Área do Cidadão...`);
  const ctxCid = await browser.newContext({ viewport: { width: 1366, height: 850 } });
  const pageCid = await ctxCid.newPage();

  // Monitor de rede
  pageCid.on('response', (res) => {
    auditResults.network.totalRequests++;
    const url = res.url();
    if (url.includes('/api/')) auditResults.network.apiCalls++;
    else if (/\.(js|css|png|jpg|svg|woff2|ico)$/i.test(url)) auditResults.network.staticAssets++;
  });

  const t0LoginCid = Date.now();
  await pageCid.goto(`${BASE}/`, { waitUntil: 'load', timeout: 30000 });
  const ttfbLoginCid = Date.now() - t0LoginCid;
  
  const perfLoginCid = await collectPagePerformance(pageCid, 'Cidadão', 'Login Público');
  auditResults.pages.push({ ...perfLoginCid, ttfb: ttfbLoginCid });

  // Login
  await pageCid.fill('input[name="cda-utilizador"]', '002399714LA030');
  await pageCid.fill('input[name="cda-senha"]', '123456789');
  
  const t0Auth = Date.now();
  await pageCid.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
  await pageCid.waitForSelector('nav[aria-label="Atalhos do Painel"], [data-testid="unread-total-counter"]', { timeout: 15000 });
  const authLatencyCid = Date.now() - t0Auth;

  const perfPainelCid = await collectPagePerformance(pageCid, 'Cidadão', 'Painel Principal');
  auditResults.pages.push({ ...perfPainelCid, authLatency: authLatencyCid });

  // Navegação nas abas do Cidadão
  const tabsCid = [
    { id: 'correspondencias', label: 'Correio' },
    { id: 'contatos', label: 'Contactos' },
    { id: 'perfil', label: 'Meu Perfil' },
    { id: 'video-atendimento', label: 'Vídeo-Atendimento' },
    { id: 'inqueritos', label: 'Inquéritos' },
    { id: 'comunicados', label: 'Comunicados' },
    { id: 'ocorrencias', label: 'Ocorrências Locais' },
    { id: 'nova-denuncia', label: 'Denúncia' },
    { id: 'denuncias', label: 'Livro de Reclamações' },
    { id: 'sondagens', label: 'Sondagens' },
    { id: 'notificacoes', label: 'Notificações' },
    { id: 'historico', label: 'Histórico' },
    { id: 'documentos', label: 'Documentos' },
    { id: 'directorio-orgaos', label: 'Directório de Órgãos' },
  ];

  for (const t of tabsCid) {
    const t0Tab = performance.now();
    await pageCid.evaluate((h) => { window.location.hash = `#/${h}`; }, t.id);
    await pageCid.waitForTimeout(300);
    const renderTime = Math.round(performance.now() - t0Tab);
    const perfTab = await collectPagePerformance(pageCid, 'Cidadão', t.label);
    auditResults.pages.push({ ...perfTab, switchRenderTime: renderTime });
  }

  // 2. ÁREA DA INSTITUIÇÃO
  console.log(`▶ 2. Auditoria de Performance — Área da Instituição...`);
  const ctxInst = await browser.newContext({ viewport: { width: 1366, height: 850 } });
  const pageInst = await ctxInst.newPage();

  const t0LoginInst = Date.now();
  await pageInst.goto(`${BASE}/institucional`, { waitUntil: 'load', timeout: 30000 });
  const perfLoginInst = await collectPagePerformance(pageInst, 'Instituição', 'Login Institucional');
  auditResults.pages.push({ ...perfLoginInst, ttfb: Date.now() - t0LoginInst });

  await pageInst.fill('input[name="cda-utilizador"]', 'INAPEM-LMM-01');
  await pageInst.fill('input[name="cda-senha"]', '123456789');
  
  const t0AuthInst = Date.now();
  await pageInst.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
  await pageInst.waitForTimeout(2000);
  const authLatencyInst = Date.now() - t0AuthInst;

  const perfPainelInst = await collectPagePerformance(pageInst, 'Instituição', 'Painel Institucional');
  auditResults.pages.push({ ...perfPainelInst, authLatency: authLatencyInst });

  const tabsInst = [
    { id: 'correspondencias', label: 'Correio Institucional' },
    { id: 'gov-contatos', label: 'Equipa da Instituição' },
    { id: 'inst-qrcode', label: 'Validação QR Code' },
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

  for (const t of tabsInst) {
    const t0Tab = performance.now();
    await pageInst.evaluate((h) => { window.location.hash = `#/${h}`; }, t.id);
    await pageInst.waitForTimeout(300);
    const renderTime = Math.round(performance.now() - t0Tab);
    const perfTab = await collectPagePerformance(pageInst, 'Instituição', t.label);
    auditResults.pages.push({ ...perfTab, switchRenderTime: renderTime });
  }

  // 3. ÁREA DE ADMINISTRAÇÃO CENTRAL
  console.log(`▶ 3. Auditoria de Performance — Área Admin...`);
  const ctxAdmin = await browser.newContext({ viewport: { width: 1366, height: 850 } });
  const pageAdmin = await ctxAdmin.newPage();

  const t0LoginAdmin = Date.now();
  await pageAdmin.goto(`${BASE}/admin`, { waitUntil: 'load', timeout: 30000 });
  const perfLoginAdmin = await collectPagePerformance(pageAdmin, 'Admin', 'Login Admin');
  auditResults.pages.push({ ...perfLoginAdmin, ttfb: Date.now() - t0LoginAdmin });

  await pageAdmin.fill('input[name="cda-utilizador"]', 'ADMIN-0001');
  await pageAdmin.fill('input[name="cda-senha"]', '123456789');
  
  const t0AuthAdmin = Date.now();
  await pageAdmin.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
  await pageAdmin.waitForTimeout(2000);
  const authLatencyAdmin = Date.now() - t0AuthAdmin;

  const perfPainelAdmin = await collectPagePerformance(pageAdmin, 'Admin', 'Painel SOC Nacional');
  auditResults.pages.push({ ...perfPainelAdmin, authLatency: authLatencyAdmin });

  const tabsAdmin = [
    { id: 'gov-dashboard', label: 'SOC Nacional' },
    { id: 'gov-interoperabilidade', label: 'Interoperabilidade Institucional' },
    { id: 'gov-correspondencias', label: 'Correspondências Globais' },
    { id: 'gov-contatos', label: 'Cadastro Geral de Cidadãos' },
    { id: 'gov-trabalhadores', label: 'Equipa Central do Sistema' },
    { id: 'gov-relatorio', label: 'Centro de Relatórios & Estatísticas' },
    { id: 'gov-ia', label: 'Assistência IA Nacional' },
    { id: 'gov-seguranca', label: 'Auditoria & Segurança' },
    { id: 'gov-perfil', label: 'Perfil Administrativo' },
    { id: 'gov-emissao', label: 'Emissão Documental' },
    { id: 'directorio-orgaos', label: 'Directório Central de Órgãos' },
  ];

  for (const t of tabsAdmin) {
    const t0Tab = performance.now();
    await pageAdmin.evaluate((h) => { window.location.hash = `#/${h}`; }, t.id);
    await pageAdmin.waitForTimeout(300);
    const renderTime = Math.round(performance.now() - t0Tab);
    const perfTab = await collectPagePerformance(pageAdmin, 'Admin', t.label);
    auditResults.pages.push({ ...perfTab, switchRenderTime: renderTime });
  }

  // 4. INTEROPERABILIDADE E LATÊNCIA DE ENVIO/RECEPÇÃO
  console.log(`▶ 4. Benchmark de Interoperabilidade e Latência de Rede...`);
  await pageCid.evaluate(() => { window.location.hash = '#/correspondencias'; });
  await pageCid.waitForTimeout(600);

  const btnNova = pageCid.getByRole('button', { name: /Nova Mensagem/i }).first();
  await btnNova.click();
  await pageCid.waitForTimeout(400);

  const idPerf = `BENCH-${Date.now().toString().slice(-4)}`;
  const inputDest = pageCid.locator('#recipient-inst-input');
  await inputDest.fill('INAPEM-LMM-01');

  const inputAssunto = pageCid.locator('#compose-subject-input');
  await inputAssunto.fill(`Benchmark Latência ${idPerf}`);

  const textAreaMsg = pageCid.locator('div[contenteditable="true"], textarea').first();
  if (await textAreaMsg.isVisible()) {
    await textAreaMsg.fill(`Teste de telemetria e latência de transporte ${idPerf}.`);
  }

  const btnEnviar = pageCid.locator('#btn-enviar-mensagem, button:has-text("Enviar Mensagem")').first();
  
  const t0Send = performance.now();
  await btnEnviar.click();
  await pageCid.waitForTimeout(1000);
  const sendTimeMs = Math.round(performance.now() - t0Send);

  // Tempo até recepção no INAPEM
  const t0Receive = performance.now();
  await pageInst.evaluate(() => { window.location.hash = '#/correspondencias'; });
  await pageInst.waitForTimeout(800);
  const receiveTimeMs = Math.round(performance.now() - t0Receive);

  // Tempo de sincronização no SOC Admin
  const t0SyncAdmin = performance.now();
  await pageAdmin.evaluate(() => { window.location.hash = '#/gov-correspondencias'; });
  await pageAdmin.waitForTimeout(800);
  const syncAdminTimeMs = Math.round(performance.now() - t0SyncAdmin);

  auditResults.interopLatency = {
    submissionTimeMs: sendTimeMs,
    recipientFetchLatencyMs: receiveTimeMs,
    adminSocSyncLatencyMs: syncAdminTimeMs,
    totalRoundTripMs: sendTimeMs + receiveTimeMs + syncAdminTimeMs,
  };

  // Coleta final de memória
  auditResults.memoryProfile = {
    cidadaoHeap: await pageCid.evaluate(() => window.performance?.memory ? +(window.performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2) : 'N/A'),
    instituicaoHeap: await pageInst.evaluate(() => window.performance?.memory ? +(window.performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2) : 'N/A'),
    adminHeap: await pageAdmin.evaluate(() => window.performance?.memory ? +(window.performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2) : 'N/A'),
  };

  await ctxCid.close();
  await ctxInst.close();
  await ctxAdmin.close();
  await browser.close();

  console.log(`\n======================================================`);
  console.log(`✅ AUDITORIA CONCLUÍDA`);
  console.log(`======================================================`);
  console.log(JSON.stringify(auditResults, null, 2));
}

run().catch(console.error);
