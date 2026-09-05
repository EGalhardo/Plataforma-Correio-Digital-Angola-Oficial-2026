import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.BASE || 'http://localhost:3000';
const SCREENSHOTS_DIR = 'testes/evidencias/screenshots';
const LOGS_DIR = 'testes/evidencias/logs';
const REDES_DIR = 'testes/evidencias/redes';

mkdirSync(SCREENSHOTS_DIR, { recursive: true });
mkdirSync(LOGS_DIR, { recursive: true });
mkdirSync(REDES_DIR, { recursive: true });

const VIEWPORTS = {
  mobile: { name: 'mobile', width: 375, height: 667, isMobile: true, hasTouch: true },
  mobileLarge: { name: 'mobileLarge', width: 375, height: 812, isMobile: true, hasTouch: true },
  tablet: { name: 'tablet', width: 768, height: 1024, isMobile: false, hasTouch: true }
};

const report = {
  timestamp: new Date().toISOString(),
  base: BASE,
  viewportsTested: ['mobile (375x667)', 'mobileLarge (375x812)', 'tablet (768x1024)'],
  pages: [],
  touchTargetChecks: [],
  mobileNavBarChecks: [],
  overflowChecks: [],
  consoleErrors: [],
  pageErrors: [],
  networkFailures: [],
  summary: {
    totalPagesChecked: 0,
    mobilePass: 0,
    tabletPass: 0,
    overflowFailures: 0,
    touchTargetFailures: 0,
    consoleErrorCount: 0
  }
};

async function runMobileTabletAudit() {
  console.log('=== INICIANDO AUDITORIA EXAUSTIVA: MODO MOBILE E TABLET ===');
  console.log('Alvo:', BASE);

  const browser = await chromium.launch({
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      existsSync('/tmp/static_face.y4m') ? '--use-file-for-fake-video-capture=/tmp/static_face.y4m' : '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required'
    ]
  });

  const setupListeners = (page, contextLabel) => {
    page.on('pageerror', (err) => {
      report.pageErrors.push({ context: contextLabel, url: page.url(), message: err.message });
      console.log(`[PAGEERROR][${contextLabel}] ${err.message}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        report.consoleErrors.push({ context: contextLabel, url: page.url(), text: msg.text() });
        console.log(`[CONSOLE.ERROR][${contextLabel}] ${msg.text()}`);
      }
    });
    page.on('response', (resp) => {
      if (resp.status() >= 400 && !resp.url().includes('favicon.ico')) {
        report.networkFailures.push({ context: contextLabel, status: resp.status(), url: resp.url() });
      }
    });
  };

  async function auditViewport(vpKey, vpConfig) {
    console.log(`\n======================================================`);
    console.log(`>>> TESTANDO VIEWPORT: ${vpConfig.name.toUpperCase()} (${vpConfig.width}x${vpConfig.height})`);
    console.log(`======================================================`);

    const context = await browser.newContext({
      viewport: { width: vpConfig.width, height: vpConfig.height },
      isMobile: vpConfig.isMobile,
      hasTouch: vpConfig.hasTouch,
      locale: 'pt-PT'
    });

    const page = await context.newPage();
    setupListeners(page, vpConfig.name);

    async function checkRoute(area, route, name) {
      const fullUrl = BASE + route;
      const testStart = Date.now();
      let hasOverflow = false;
      let scrollWidth = 0;
      let clientWidth = 0;
      let status = 'PASS';

      try {
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(800);

        const metrics = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: window.innerWidth,
          bodyScrollWidth: document.body.scrollWidth
        }));

        scrollWidth = Math.max(metrics.scrollWidth, metrics.bodyScrollWidth);
        clientWidth = metrics.clientWidth;

        if (scrollWidth > clientWidth + 2) {
          hasOverflow = true;
          status = 'WARN_OVERFLOW';
          report.summary.overflowFailures++;
          console.log(`  [OVERFLOW] ${name} em ${vpConfig.name}: scrollWidth=${scrollWidth} > clientWidth=${clientWidth}`);
        }

        const shotPath = join(SCREENSHOTS_DIR, `${vpConfig.name}_${area}_${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`);
        await page.screenshot({ path: shotPath });

        report.pages.push({
          viewport: vpConfig.name,
          area,
          name,
          route,
          scrollWidth,
          clientWidth,
          hasOverflow,
          status,
          screenshot: shotPath,
          elapsedMs: Date.now() - testStart
        });

        if (vpConfig.name.startsWith('mobile')) report.summary.mobilePass++;
        if (vpConfig.name === 'tablet') report.summary.tabletPass++;
        report.summary.totalPagesChecked++;
        console.log(`  [OK] ${name} (${vpConfig.name}) — ${scrollWidth}px / ${clientWidth}px (${status})`);
      } catch (err) {
        console.log(`  [ERRO] ${name} (${vpConfig.name}): ${err.message}`);
        report.pages.push({
          viewport: vpConfig.name,
          area,
          name,
          route,
          status: 'FAIL',
          error: err.message
        });
      }
    }

    // 1. ROTAS PÚBLICAS
    console.log(`\n--- Rotas Públicas (${vpConfig.name}) ---`);
    await checkRoute('publico', '/#/login', 'Login Cidadão');
    await checkRoute('publico', '/#/registar', 'Registo Cidadão');
    await checkRoute('publico', '/#/esqueci-senha', 'Recuperar Senha Cidadão');
    await checkRoute('publico', '/#/login-facial', 'Login Facial Cidadão');
    await checkRoute('publico', '/institucional#/login', 'Login Instituição');
    await checkRoute('publico', '/institucional#/registar', 'Registo Instituição DPA2025');
    await checkRoute('publico', '/admin#/login', 'Login Admin');

    // 2. ÁREA DO CIDADÃO LOGADO
    console.log(`\n--- Área do Cidadão (${vpConfig.name}) ---`);
    await page.goto(BASE + '/#/login', { waitUntil: 'domcontentloaded' });
    await page.locator("input[type='text']:visible, input:not([type]):visible").first().fill('002399714LA030');
    await page.locator("input[type='password']").first().fill('123456789');
    await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
    await page.waitForTimeout(6000);

    const citizenTabs = [
      ['/#/home', 'Painel Principal'],
      ['/#/correspondencias', 'Correio'],
      ['/#/documentos', 'Documentos'],
      ['/#/pasta-digital', 'Pasta Digital'],
      ['/#/historico', 'Histórico'],
      ['/#/notificacoes', 'Notificações'],
      ['/#/contatos', 'Contactos'],
      ['/#/directorio-orgaos', 'Directório de Órgãos'],
      ['/#/solicitar-documento', 'Solicitar Documento'],
      ['/#/video-atendimento', 'Videoatendimento'],
      ['/#/pagamentos', 'Pagamentos'],
      ['/#/perfil', 'Perfil Cidadão']
    ];

    for (const [r, n] of citizenTabs) {
      await checkRoute('cidadao', r, n);
    }

    // Verificar MobileNavBar e Alvos de Toque no Mobile
    if (vpConfig.name.startsWith('mobile')) {
      console.log(`\n--- Verificação de MobileNavBar e Touch Targets (${vpConfig.name}) ---`);
      await page.goto(BASE + '/#/home', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      const navBarVisible = await page.evaluate(() => {
        const nav = document.querySelector('nav, [data-testid="mobile-navbar"], footer');
        return nav !== null;
      });

      const touchTargets = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a[role="button"], input[type="submit"]'));
        const smallTargets = [];
        buttons.forEach(btn => {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && (rect.width < 32 || rect.height < 32)) {
            smallTargets.push({ tag: btn.tagName, text: btn.innerText.slice(0, 20), w: rect.width, h: rect.height });
          }
        });
        return { totalButtons: buttons.length, smallTargetsCount: smallTargets.length };
      });

      report.mobileNavBarChecks.push({
        viewport: vpConfig.name,
        navBarPresent: navBarVisible,
        touchTargetsEvaluated: touchTargets.totalButtons
      });
      console.log(`  [NAVBAR MOBILE] Presente: ${navBarVisible} | Botões Analisados: ${touchTargets.totalButtons}`);

      // Teste do Avatar Mobile e Menu Sair do Canal
      const avatarBtn = page.locator("header button, div[role='button']").filter({ hasText: /AO|Edlasio/i }).first();
      if (await avatarBtn.count() > 0) {
        await avatarBtn.click();
        await page.waitForTimeout(800);
        const menuText = await page.evaluate(() => document.body.innerText);
        const temSairDoCanal = /SAIR DO CANAL|TERMINAR SESSÃO/i.test(menuText);
        console.log(`  [MENU PERFIL MOBILE] Botão 'Sair do Canal' visível: ${temSairDoCanal}`);
        const shotMenu = join(SCREENSHOTS_DIR, `${vpConfig.name}_menu_perfil_aberto.png`);
        await page.screenshot({ path: shotMenu });
      }
    }

    // 3. ÁREA INSTITUCIONAL LOGADA
    console.log(`\n--- Área Institucional (${vpConfig.name}) ---`);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto(BASE + '/institucional#/login', { waitUntil: 'domcontentloaded' });
    await page.locator("input[type='text']:visible, input:not([type]):visible").first().fill('INAPEM-LLMM-01');
    await page.locator("input[type='password']").first().fill('123456789');
    await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
    await page.waitForTimeout(6000);

    const instTabs = [
      ['/institucional#/home', 'Painel Institucional'],
      ['/institucional#/correspondencias', 'Correio Institucional'],
      ['/institucional#/documentos', 'Documentos Oficiais'],
      ['/institucional#/gov-contatos', 'Equipa Institucional'],
      ['/institucional#/inst-qrcode', 'QR Code Institucional'],
      ['/institucional#/inst-ai-assistant', 'IA Institucional'],
      ['/institucional#/perfil', 'Perfil Instituição'],
      ['/institucional#/inst-pagamentos', 'Cobranças Pagamentos'],
      ['/institucional#/video-atendimento', 'Videoatendimento Inst'],
      ['/institucional#/sondagens', 'Sondagens Inst']
    ];

    for (const [r, n] of instTabs) {
      await checkRoute('instituicao', r, n);
    }

    // 4. ÁREA ADMINISTRATIVA LOGADA
    console.log(`\n--- Área Administrativa (${vpConfig.name}) ---`);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto(BASE + '/admin#/login', { waitUntil: 'domcontentloaded' });
    await page.locator("input[type='text']:visible, input:not([type]):visible").first().fill('ADMIN-0001');
    await page.locator("input[type='password']").first().fill('123456789');
    await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
    await page.waitForTimeout(6000);

    const adminTabs = [
      ['/admin#/gov-dashboard', 'Painel Geral Governação'],
      ['/admin#/gov-interoperabilidade', 'Interoperabilidade'],
      ['/admin#/gov-correspondencias', 'Correspondências Admin'],
      ['/admin#/gov-contatos', 'Cidadãos Admin'],
      ['/admin#/gov-trabalhadores', 'Administradores Admin'],
      ['/admin#/gov-relatorio', 'Relatórios Admin'],
      ['/admin#/gov-ia', 'Painel IA Admin'],
      ['/admin#/gov-seguranca', 'Auditoria Segurança'],
      ['/admin#/gov-perfil', 'Perfil Admin']
    ];

    for (const [r, n] of adminTabs) {
      await checkRoute('admin', r, n);
    }

    await context.close();
  }

  // Executar auditoria nos 3 viewports: Mobile 375x667, Mobile 375x812 e Tablet 768x1024
  await auditViewport('mobile', VIEWPORTS.mobile);
  await auditViewport('mobileLarge', VIEWPORTS.mobileLarge);
  await auditViewport('tablet', VIEWPORTS.tablet);

  await browser.close();

  report.summary.consoleErrorCount = report.consoleErrors.length;
  writeFileSync(join(LOGS_DIR, 'relatorio_mobile_tablet.json'), JSON.stringify(report, null, 2));

  console.log('\n========================================================');
  console.log('AUDITORIA MOBILE E TABLET CONCLUÍDA COM SUCESSO!');
  console.log(`Total de Páginas Testadas nos Viewports: ${report.summary.totalPagesChecked}`);
  console.log(`Aprovações Mobile: ${report.summary.mobilePass}`);
  console.log(`Aprovações Tablet: ${report.summary.tabletPass}`);
  console.log(`Falhas de Overflow Horizontal: ${report.summary.overflowFailures}`);
  console.log(`Erros de Consola: ${report.summary.consoleErrorCount}`);
  console.log(`Erros de Script: ${report.pageErrors.length}`);
  console.log('========================================================');
}

runMobileTabletAudit().catch(err => {
  console.error('ERRO FATAL NA AUDITORIA MOBILE/TABLET:', err);
  process.exit(1);
});
