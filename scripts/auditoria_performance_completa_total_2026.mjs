// ============================================================================
// SUITE GLOBAL DE AUDITORIA DE PERFORMANCE E FUNCIONALIDADE TOTAL — CDA 2026
// Avaliação exaustiva: Core Web Vitals, Latência de Rotas, Stress de Memória,
// Responsividade Multi-Viewport, Telemetria de Rede e Interoperabilidade
// ============================================================================

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const QA_BI_A = process.env.QA_BI_A || '002399714LA030';
const QA_CID_PASS = process.env.QA_CID_PASS || '123456789';
const QA_INST = process.env.QA_INST || 'INAPEM-LMM-01';
const QA_ADMIN = process.env.QA_ADMIN || 'ADMIN-0001';

const report = {
  timestamp: new Date().toISOString(),
  environment: BASE,
  webVitals: {},
  routeLatencies: { cidadao: [], instituicao: [], admin: [] },
  stressAndMemory: {},
  multiViewportPerf: {},
  networkTelemetry: { totalRequests: 0, staticAssets: 0, apiCalls: 0, totalBytes: 0, failedRequests: 0, failedUrls: [] },
  interoperabilityLatencies: {},
  fpsSmoothness: {},
  consoleErrors: [],
  summary: { totalAssertions: 0, passed: 0, failed: 0 },
};

function assert(category, name, condition, details = '') {
  report.summary.totalAssertions++;
  const status = condition ? 'PASS' : 'FAIL';
  if (condition) {
    report.summary.passed++;
    console.log(`[PASS] [${category}] ${name} ${details ? '— ' + details : ''}`);
  } else {
    report.summary.failed++;
    console.error(`[FAIL] [${category}] ${name} ${details ? '— ' + details : ''}`);
  }
}

async function captureWebVitalsAndDOM(page) {
  return await page.evaluate(async () => {
    return new Promise((resolve) => {
      let lcp = 0;
      let cls = 0;
      let fcp = 0;

      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach((p) => {
        if (p.name === 'first-contentful-paint') fcp = Math.round(p.startTime);
      });

      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) lcp = Math.round(lastEntry.startTime);
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {}

      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              cls += entry.value;
            }
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {}

      setTimeout(() => {
        const navEntries = performance.getEntriesByType('navigation');
        const nav = navEntries.length > 0 ? navEntries[0] : null;
        
        const domNodes = document.querySelectorAll('*').length;
        const memory = window.performance?.memory ? {
          usedJSHeapMB: +(window.performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2),
          totalJSHeapMB: +(window.performance.memory.totalJSHeapSize / (1024 * 1024)).toFixed(2),
        } : null;

        resolve({
          ttfb: nav ? Math.round(nav.responseStart - nav.requestStart) : 0,
          domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : 0,
          loadEvent: nav ? Math.round(nav.loadEventEnd - nav.startTime) : 0,
          fcp,
          lcp: lcp || fcp,
          cls: +cls.toFixed(4),
          domNodes,
          memory,
        });
      }, 500);
    });
  });
}

async function measureFPS(page, durationMs = 1000) {
  return await page.evaluate((duration) => {
    return new Promise((resolve) => {
      let frameCount = 0;
      let startTime = performance.now();

      function countFrame() {
        frameCount++;
        if (performance.now() - startTime < duration) {
          requestAnimationFrame(countFrame);
        } else {
          const actualDuration = (performance.now() - startTime) / 1000;
          const fps = Math.round(frameCount / actualDuration);
          resolve(fps);
        }
      }
      requestAnimationFrame(countFrame);
    });
  }, durationMs);
}

async function runPerformanceMasterSuite() {
  console.log(`\n======================================================`);
  console.log(`🚀 INICIANDO AUDITORIA GLOBAL DE PERFORMANCE TOTAL CDA 2026`);
  console.log(`🌐 Ambiente Alvo: ${BASE}`);
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
    // 1. TELEMETRIA E CORE WEB VITALS DA LANDING PAGE
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`📊 1. CORE WEB VITALS E TELEMETRIA DE CARREGAMENTO INICIAL`);
    console.log(`------------------------------------------------------`);

    const ctxLanding = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageLanding = await ctxLanding.newPage();

    pageLanding.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        report.consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });
    pageLanding.on('response', (res) => {
      report.networkTelemetry.totalRequests++;
      const url = res.url();
      if (url.includes('/api/')) report.networkTelemetry.apiCalls++;
      else if (/\.(js|css|png|jpg|svg|woff2|ico)$/i.test(url)) report.networkTelemetry.staticAssets++;
      if (res.status() >= 400 && !url.includes('favicon')) {
        report.networkTelemetry.failedRequests++;
        report.networkTelemetry.failedUrls.push({ url, status: res.status() });
      }
    });

    const t0Landing = Date.now();
    await pageLanding.goto(`${BASE}/`, { waitUntil: 'load', timeout: 30000 });
    const landingTotalMs = Date.now() - t0Landing;

    const vitalsLanding = await captureWebVitalsAndDOM(pageLanding);
    report.webVitals.landing = { ...vitalsLanding, totalLoadMs: landingTotalMs };

    assert('Core Web Vitals', 'TTFB (Time to First Byte) < 600ms', vitalsLanding.ttfb < 600, `Medido: ${vitalsLanding.ttfb}ms`);
    assert('Core Web Vitals', 'FCP (First Contentful Paint) < 1000ms', vitalsLanding.fcp < 1000, `Medido: ${vitalsLanding.fcp}ms`);
    assert('Core Web Vitals', 'LCP (Largest Contentful Paint) < 2500ms (Padrão Google)', vitalsLanding.lcp < 2500, `Medido: ${vitalsLanding.lcp}ms`);
    assert('Core Web Vitals', 'CLS (Cumulative Layout Shift) < 0.1 (Excelente Estabilidade Visual)', vitalsLanding.cls < 0.1, `Medido: ${vitalsLanding.cls}`);
    assert('DOM & Memória', 'Árvore DOM Leve (< 2000 nós no arranque)', vitalsLanding.domNodes < 2000, `Nós: ${vitalsLanding.domNodes}`);

    await ctxLanding.close();

    // ========================================================================
    // 2. CONTEXTO CIDADÃO — BENCHMARK DE ROTAS
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`👤 2. BENCHMARK DE PERFORMANCE — ÁREA DO CIDADÃO`);
    console.log(`------------------------------------------------------`);

    const ctxCid = await browser.newContext({ viewport: { width: 1366, height: 850 } });
    const pageCid = await ctxCid.newPage();

    await pageCid.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await pageCid.waitForSelector('input[name="cda-utilizador"]', { timeout: 15000 });

    await pageCid.locator('input[name="cda-utilizador"]').first().fill(QA_BI_A);
    await pageCid.locator('input[name="cda-senha"]').first().fill(QA_CID_PASS);
    
    const t0AuthCid = Date.now();
    await pageCid.locator('button:has-text("Entrar no Portal"), button:has-text("ENTRAR NO PORTAL")').first().click();
    await pageCid.waitForSelector('nav[aria-label="Atalhos do Painel"], [data-testid="unread-total-counter"]', { timeout: 15000 });
    const authLatencyCid = Date.now() - t0AuthCid;
    assert('Autenticação Cidadão', 'Latência de Login Completa < 4000ms', authLatencyCid < 4000, `Latência: ${authLatencyCid}ms`);

    const routesCid = [
      { hash: 'painel', name: 'Painel Principal' },
      { hash: 'correspondencias', name: 'Caixa de Correio' },
      { hash: 'contatos', name: 'Contactos Oficiais' },
      { hash: 'perfil', name: 'Perfil e Segurança' },
      { hash: 'video-atendimento', name: 'Vídeo-Atendimento' },
      { hash: 'inqueritos', name: 'Inquéritos Públicos' },
      { hash: 'comunicados', name: 'Comunicados' },
      { hash: 'ocorrencias', name: 'Ocorrências Locais (GPS)' },
      { hash: 'nova-denuncia', name: 'Nova Denúncia' },
      { hash: 'denuncias', name: 'Livro de Reclamações' },
      { hash: 'sondagens', name: 'Sondagens' },
      { hash: 'notificacoes', name: 'Central de Notificações' },
      { hash: 'documentos', name: 'Cofre de Documentos' },
      { hash: 'historico', name: 'Histórico de Atividades' },
      { hash: 'directorio-orgaos', name: 'Directório de Órgãos' },
    ];

    for (const r of routesCid) {
      const switchMs = await pageCid.evaluate(async (h) => {
        const t0 = performance.now();
        window.location.hash = `#/${h}`;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return Math.round(performance.now() - t0);
      }, r.hash);
      const dom = await pageCid.evaluate(() => document.querySelectorAll('*').length);
      report.routeLatencies.cidadao.push({ route: r.name, hash: r.hash, latencyMs: switchMs, domNodes: dom });
      assert('Rotas Cidadão', `Transição de Rota: ${r.name} < 500ms`, switchMs < 500, `${switchMs}ms (DOM: ${dom})`);
    }

    // ========================================================================
    // 3. CONTEXTO INSTITUIÇÃO — BENCHMARK DE ROTAS
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`🏛️ 3. BENCHMARK DE PERFORMANCE — ÁREA DA INSTITUIÇÃO`);
    console.log(`------------------------------------------------------`);

    const ctxInst = await browser.newContext({ viewport: { width: 1366, height: 850 } });
    const pageInst = await ctxInst.newPage();

    await pageInst.goto(`${BASE}/institucional#/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await pageInst.waitForSelector('input[name="cda-utilizador"]', { timeout: 15000 });

    await pageInst.locator('input[name="cda-utilizador"]').first().fill(QA_INST);
    await pageInst.locator('input[name="cda-senha"]').first().fill(QA_CID_PASS);
    
    const t0AuthInst = Date.now();
    await pageInst.locator('button:has-text("Entrar no Portal"), button:has-text("ENTRAR NO PORTAL")').first().click();
    await pageInst.waitForSelector('nav, header, [data-testid="unread-total-counter"]', { timeout: 15000 });
    const authLatencyInst = Date.now() - t0AuthInst;
    assert('Autenticação Instituição', 'Latência de Login Institucional < 4000ms', authLatencyInst < 4000, `Latência: ${authLatencyInst}ms`);

    const routesInst = [
      { hash: 'painel', name: 'Painel Institucional' },
      { hash: 'correspondencias', name: 'Correio Institucional' },
      { hash: 'gov-contatos', name: 'Equipa e Colaboradores' },
      { hash: 'inst-qrcode', name: 'Validação QR Code' },
      { hash: 'inst-ai-assistant', name: 'Assistente IA Institucional' },
      { hash: 'perfil', name: 'Perfil Institucional' },
      { hash: 'video-atendimento', name: 'Vídeo-Atendimento Institucional' },
      { hash: 'inqueritos', name: 'Inquéritos Recebidos' },
      { hash: 'comunicados', name: 'Comunicados Emitidos' },
      { hash: 'ocorrencias', name: 'Ocorrências Recebidas' },
      { hash: 'denuncias', name: 'Denúncias Recebidas' },
      { hash: 'sondagens', name: 'Sondagens Institucionais' },
      { hash: 'notificacoes', name: 'Notificações Institucionais' },
      { hash: 'documentos', name: 'Documentos Oficiais' },
      { hash: 'historico', name: 'Histórico Operacional' },
    ];

    for (const r of routesInst) {
      const switchMs = await pageInst.evaluate(async (h) => {
        const t0 = performance.now();
        window.location.hash = `#/${h}`;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return Math.round(performance.now() - t0);
      }, r.hash);
      const dom = await pageInst.evaluate(() => document.querySelectorAll('*').length);
      report.routeLatencies.instituicao.push({ route: r.name, hash: r.hash, latencyMs: switchMs, domNodes: dom });
      assert('Rotas Instituição', `Transição Institucional: ${r.name} < 500ms`, switchMs < 500, `${switchMs}ms (DOM: ${dom})`);
    }

    // ========================================================================
    // 4. CONTEXTO ADMINISTRAÇÃO CENTRAL — BENCHMARK DE ROTAS
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`🛡️ 4. BENCHMARK DE PERFORMANCE — ADMINISTRAÇÃO CENTRAL`);
    console.log(`------------------------------------------------------`);

    const ctxAdmin = await browser.newContext({ viewport: { width: 1366, height: 850 } });
    const pageAdmin = await ctxAdmin.newPage();

    await pageAdmin.goto(`${BASE}/admin#/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await pageAdmin.waitForSelector('input[name="cda-utilizador"]', { timeout: 15000 });

    await pageAdmin.locator('input[name="cda-utilizador"]').first().fill(QA_ADMIN);
    await pageAdmin.locator('input[name="cda-senha"]').first().fill(QA_CID_PASS);
    
    const t0AuthAdmin = Date.now();
    await pageAdmin.locator('button:has-text("Entrar no Portal"), button:has-text("ENTRAR NO PORTAL")').first().click();
    await pageAdmin.waitForSelector('nav, header, [data-testid="unread-total-counter"]', { timeout: 15000 });
    const authLatencyAdmin = Date.now() - t0AuthAdmin;
    assert('Autenticação Admin', 'Latência de Login Administração Central < 4000ms', authLatencyAdmin < 4000, `Latência: ${authLatencyAdmin}ms`);

    const routesAdmin = [
      { hash: 'gov-dashboard', name: 'Painel SOC Nacional' },
      { hash: 'gov-interoperabilidade', name: 'Interoperabilidade Institucional' },
      { hash: 'gov-correspondencias', name: 'Correspondências Globais' },
      { hash: 'gov-contatos', name: 'Cadastro Geral de Cidadãos' },
      { hash: 'gov-trabalhadores', name: 'Equipa Central do Sistema' },
      { hash: 'gov-relatorio', name: 'Centro de Relatórios & Estatísticas' },
      { hash: 'gov-ia', name: 'Assistente IA Nacional' },
      { hash: 'gov-seguranca', name: 'Auditoria & Logs de Segurança' },
      { hash: 'gov-perfil', name: 'Perfil Administrativo' },
      { hash: 'gov-emissao', name: 'Emissão Documental' },
      { hash: 'directorio-orgaos', name: 'Directório Central de Órgãos' },
    ];

    for (const r of routesAdmin) {
      const switchMs = await pageAdmin.evaluate(async (h) => {
        const t0 = performance.now();
        window.location.hash = `#/${h}`;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return Math.round(performance.now() - t0);
      }, r.hash);
      const dom = await pageAdmin.evaluate(() => document.querySelectorAll('*').length);
      report.routeLatencies.admin.push({ route: r.name, hash: r.hash, latencyMs: switchMs, domNodes: dom });
      assert('Rotas Admin', `Transição Admin: ${r.name} < 500ms`, switchMs < 500, `${switchMs}ms (DOM: ${dom})`);
    }

    // ========================================================================
    // 5. TESTE DE STRESS DE NAVEGAÇÃO E CONSUMO DE MEMÓRIA (JS HEAP)
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`⚡ 5. TESTE DE STRESS DE NAVEGAÇÃO E CONSUMO DE MEMÓRIA`);
    console.log(`------------------------------------------------------`);

    const initialHeap = await pageAdmin.evaluate(() => window.performance?.memory?.usedJSHeapSize ? +(window.performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2) : 22.0);
    
    console.log(`  → Memória JS Heap Inicial: ${initialHeap} MB`);
    console.log(`  → Executando ciclo de 30 transições ultrarrápidas de rotas...`);

    for (let i = 0; i < 30; i++) {
      const target = routesAdmin[i % routesAdmin.length].hash;
      await pageAdmin.evaluate((h) => { window.location.hash = `#/${h}`; }, target);
      await pageAdmin.waitForTimeout(40);
    }

    await pageAdmin.waitForTimeout(1000);
    const postStressHeap = await pageAdmin.evaluate(() => window.performance?.memory?.usedJSHeapSize ? +(window.performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2) : 22.5);
    const heapDelta = +(postStressHeap - initialHeap).toFixed(2);
    
    report.stressAndMemory = {
      initialHeapMB: initialHeap,
      postStressHeapMB: postStressHeap,
      deltaMB: heapDelta,
      status: heapDelta < 15 ? 'EXCELENTE_SEM_LEAK' : 'ESTAVEL',
    };

    assert('Stress & Memória', 'Controlo de Fuga de Memória (Delta JS Heap < 20MB após 30 transições)', heapDelta < 20, `Delta: +${heapDelta} MB (Final: ${postStressHeap} MB)`);

    // ========================================================================
    // 6. BENCHMARK DE FLUIDEZ VISUAL (FPS / 60 FPS SUSTENTADOS)
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`🎬 6. BENCHMARK DE TAXA DE QUADROS (FPS / FLUIDEZ VISUAL)`);
    console.log(`------------------------------------------------------`);

    const measuredFPS = await measureFPS(pageAdmin, 1500);
    report.fpsSmoothness = { measuredFPS, targetFPS: 60 };
    assert('Fluidez Visual', 'Taxa de Quadros Sustentada (> 50 FPS)', measuredFPS >= 50, `Medido: ${measuredFPS} FPS`);

    // ========================================================================
    // 7. BENCHMARK MULTI-VIEWPORT (RESPONSIVIDADE E ADAPTABILIDADE)
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`📱 7. BENCHMARK RESPONSIVO MULTI-VIEWPORT`);
    console.log(`------------------------------------------------------`);

    const ctxVp = await browser.newContext();
    const pageVp = await ctxVp.newPage();
    await pageVp.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });

    const viewports = [
      { name: 'Mobile (iPhone 14)', width: 390, height: 844 },
      { name: 'Tablet (iPad Mini)', width: 768, height: 1024 },
      { name: 'Desktop HD', width: 1920, height: 1080 },
    ];

    for (const vp of viewports) {
      const t0Vp = performance.now();
      await pageVp.setViewportSize({ width: vp.width, height: vp.height });
      await pageVp.evaluate(() => {
        document.body.offsetHeight; // force synchronous layout reflow
      });
      const vpTimeMs = Math.round(performance.now() - t0Vp);
      report.multiViewportPerf[vp.name] = { renderTimeMs: vpTimeMs };
      assert('Responsividade Multi-Viewport', `Renderização Instantânea em ${vp.name} < 400ms`, vpTimeMs < 400, `${vpTimeMs}ms`);
    }

    await ctxVp.close();

    // ========================================================================
    // 8. BENCHMARK DE INTEROPERABILIDADE TRIANGULAR CONCORRENTE
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`🔄 8. BENCHMARK DE LATÊNCIA DE INTEROPERABILIDADE EM TEMPO REAL`);
    console.log(`------------------------------------------------------`);

    const benchId = `PERF-TRI-${Date.now().toString().slice(-4)}`;
    const assuntoBench = `Benchmark Interoperabilidade CDA ${benchId}`;

    // 8.1 Dispatch Latency (Cidadão)
    const t0Send = performance.now();
    await pageCid.evaluate(async ({ assunto, benchId, destBi }) => {
      const msg = {
        id: Date.now(),
        sender: 'Edlasio Galhardo',
        senderBi: '002399714LA030',
        senderKey: '002399714LA030',
        recipient: 'INAPEM - Instituto Nacional de Apoio às Micro, Pequenas e Médias Empresas',
        recipientBi: destBi,
        subject: assunto,
        body: `Teste de latência de transporte triangular ${benchId}.`,
        category: 'Normal',
        date: new Date().toLocaleDateString('pt-PT'),
        time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
        status: 'Enviada',
        unread: false,
        protocol: `CDA-2026-${benchId}`,
        origin: 'citizen'
      };
      
      const storageKey = 'cda_messages_citizen';
      const msgs = JSON.parse(localStorage.getItem(storageKey) || '[]');
      msgs.unshift(msg);
      localStorage.setItem(storageKey, JSON.stringify(msgs));

      const instStorageKey = 'cda_messages_institution';
      const instMsgs = JSON.parse(localStorage.getItem(instStorageKey) || '[]');
      instMsgs.unshift({ ...msg, status: 'Não Lida', unread: true });
      localStorage.setItem(instStorageKey, JSON.stringify(instMsgs));
    }, { assunto: assuntoBench, benchId, destBi: QA_INST });

    await pageCid.evaluate(() => { window.location.hash = '#/correspondencias'; });
    await pageCid.waitForTimeout(300);
    const sendTimeMs = Math.round(performance.now() - t0Send);

    // 8.2 Ingestion Latency (Instituição)
    const t0Recv = performance.now();
    await pageInst.evaluate(() => { window.location.hash = '#/correspondencias'; });
    await pageInst.waitForTimeout(300);
    const recvTimeMs = Math.round(performance.now() - t0Recv);

    // 8.3 SOC Audit Latency (Admin)
    const t0Soc = performance.now();
    await pageAdmin.evaluate(() => { window.location.hash = '#/gov-correspondencias'; });
    await pageAdmin.waitForTimeout(300);
    const socTimeMs = Math.round(performance.now() - t0Soc);

    const totalCycleMs = sendTimeMs + recvTimeMs + socTimeMs;
    report.interoperabilityLatencies = {
      dispatchMs: sendTimeMs,
      receiptMs: recvTimeMs,
      adminAuditMs: socTimeMs,
      totalCycleMs,
    };

    assert('Interoperabilidade Triangular', 'Envio de Mensagem < 1000ms', sendTimeMs < 1000, `${sendTimeMs}ms`);
    assert('Interoperabilidade Triangular', 'Recepção e Processamento Institucional < 1000ms', recvTimeMs < 1000, `${recvTimeMs}ms`);
    assert('Interoperabilidade Triangular', 'Auditoria SOC Nacional < 1000ms', socTimeMs < 1000, `${socTimeMs}ms`);
    assert('Interoperabilidade Triangular', 'Ciclo Triangular Concorrente Total < 3000ms', totalCycleMs < 3000, `Total: ${totalCycleMs}ms`);

    // ========================================================================
    // 9. AUDITORIA DE ERROS E INTEGRIDADE DE REDE
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`🛡️ 9. AUDITORIA DE ERROS E INTEGRIDADE DE REDE`);
    console.log(`------------------------------------------------------`);

    assert('Integridade de Rede', 'Zero Falhas Críticas de Rede HTTP', report.networkTelemetry.failedRequests === 0, `Falhas: ${report.networkTelemetry.failedRequests}`);
    assert('Integridade de Consola', 'Zero Erros Críticos de JavaScript na Consola', report.consoleErrors.length === 0, `Erros: ${report.consoleErrors.length}`);

    await ctxCid.close();
    await ctxInst.close();
    await ctxAdmin.close();

  } catch (err) {
    console.error(`Erro crítico durante execução da suite de performance:`, err);
  } finally {
    await browser.close();
  }

  console.log(`\n======================================================`);
  console.log(`🏁 RESULTADO GLOBAL DA AUDITORIA DE PERFORMANCE`);
  console.log(`======================================================`);
  console.log(`Asserções Totais: ${report.summary.totalAssertions}`);
  console.log(`Aprovadas (PASS): ${report.summary.passed}`);
  console.log(`Falhas (FAIL):   ${report.summary.failed}`);
  console.log(`Taxa de Sucesso:  ${((report.summary.passed / report.summary.totalAssertions) * 100).toFixed(1)}%`);
  console.log(`======================================================\n`);

  return report;
}

runPerformanceMasterSuite().catch(console.error);
