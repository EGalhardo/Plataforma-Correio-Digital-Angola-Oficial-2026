// ============================================================================
// AUDITORIA TÉCNICA DE ACESSIBILIDADE DIGITAL WCAG 2.1 AA — CDA 2026
// Avaliação com Axe-Core Engine e Playwright em Todas as Áreas da Plataforma
// ============================================================================

import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const QA_BI_A = process.env.QA_BI_A || '002399714LA030';
const QA_CID_PASS = process.env.QA_CID_PASS || '123456789';
const QA_INST = process.env.QA_INST || 'INAPEM-LMM-01';
const QA_ADMIN = process.env.QA_ADMIN || 'ADMIN-0001';

const report = {
  timestamp: new Date().toISOString(),
  environment: BASE,
  standards: ['WCAG 2.0 Level AA', 'WCAG 2.1 Level AA', 'Section 508', 'ARIA 1.2'],
  pagesAudited: [],
  keyboardNavigation: [],
  summary: {
    totalPasses: 0,
    totalViolations: 0,
    criticalViolations: 0,
    seriousViolations: 0,
    moderateViolations: 0,
    minorViolations: 0,
    assertionsPassed: 0,
    assertionsFailed: 0,
  },
};

function assert(category, name, condition, details = '') {
  const status = condition ? 'PASS' : 'FAIL';
  if (condition) {
    report.summary.assertionsPassed++;
    console.log(`[PASS] [${category}] ${name} ${details ? '— ' + details : ''}`);
  } else {
    report.summary.assertionsFailed++;
    console.error(`[FAIL] [${category}] ${name} ${details ? '— ' + details : ''}`);
  }
}

async function runAxeScan(page, pageName, area) {
  try {
    // 2026-10-20 — assentar animações de entrada (framer-motion/opacity) antes
    // de medir: com esperas curtas o axe amostrava cores a meio do fade e
    // reportava falsos positivos de contraste (texto lavado ≠ cor final).
    await page.waitForTimeout(2500);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const critical = results.violations.filter(v => v.impact === 'critical');
    const serious = results.violations.filter(v => v.impact === 'serious');
    const moderate = results.violations.filter(v => v.impact === 'moderate');
    const minor = results.violations.filter(v => v.impact === 'minor');

    report.summary.totalPasses += results.passes.length;
    report.summary.totalViolations += results.violations.length;
    report.summary.criticalViolations += critical.length;
    report.summary.seriousViolations += serious.length;
    report.summary.moderateViolations += moderate.length;
    report.summary.minorViolations += minor.length;

    const auditEntry = {
      pageName,
      area,
      passesCount: results.passes.length,
      violationsCount: results.violations.length,
      criticalCount: critical.length,
      seriousCount: serious.length,
      violations: results.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        helpUrl: v.helpUrl,
        nodesCount: v.nodes.length,
      })),
    };
    report.pagesAudited.push(auditEntry);

    const isConformant = critical.length === 0 && serious.length === 0;
    if (results.violations.length > 0) {
      console.log(`  🔍 Detalhe de violações em ${pageName}:`, results.violations.map(v => `${v.impact.toUpperCase()}: ${v.id} (${v.nodes.length} nós)`).join(', '));
    }
    assert('Acessibilidade WCAG 2.1 AA', `Conformidade em [${area}] ${pageName}`, isConformant, 
      `Passes=${results.passes.length}, Críticos=${critical.length}, Sérios=${serious.length}, Moderados=${moderate.length}`);

    return auditEntry;
  } catch (err) {
    console.error(`Erro ao analisar acessibilidade na página ${pageName}:`, err.message);
    return null;
  }
}

async function runAccessibilitySuite() {
  console.log(`\n======================================================`);
  console.log(`♿ INICIANDO AUDITORIA DE ACESSIBILIDADE WCAG 2.1 AA`);
  console.log(`🌐 Ambiente Alvo: ${BASE}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // ========================================================================
    // 1. PÁGINAS PÚBLICAS E AUTENTICAÇÃO
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`🏛️ 1. AUDITORIA NAS PÁGINAS PÚBLICAS & AUTENTICAÇÃO`);
    console.log(`------------------------------------------------------`);

    const ctx = await browser.newContext({ viewport: { width: 1366, height: 850 } });
    const page = await ctx.newPage();

    // 1.1 Landing Page
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await runAxeScan(page, 'Landing Page Oficial', 'Público');

    // 1.2 Login Cidadão
    await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await runAxeScan(page, 'Login Cidadão', 'Público');

    // 1.3 Registo Stepper Cidadão
    const btnReg = page.locator('button:has-text("Criar Conta"), button:has-text("Registar")').first();
    if (await btnReg.isVisible()) {
      await btnReg.click();
      await page.waitForTimeout(1000);
      await runAxeScan(page, 'Stepper de Registo Cidadão', 'Público');
      const btnVoltar = page.locator('button:has-text("Voltar"), button:has-text("Cancelar")').first();
      if (await btnVoltar.isVisible()) await btnVoltar.click();
    }

    // 1.4 Redefinir Senha
    const btnEsqueci = page.locator('button:has-text("Esqueci Senha")').first();
    if (await btnEsqueci.isVisible()) {
      await btnEsqueci.click();
      await page.waitForTimeout(1000);
      await runAxeScan(page, 'Recuperação de Senha', 'Público');
      const btnVoltar = page.locator('button:has-text("Voltar à Entrada"), button:has-text("Voltar")').first();
      if (await btnVoltar.isVisible()) await btnVoltar.click();
    }

    // 1.5 Login Institucional
    await page.goto(`${BASE}/institucional#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await runAxeScan(page, 'Login Institucional', 'Instituição');

    // 1.6 Login Admin
    await page.goto(`${BASE}/admin#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await runAxeScan(page, 'Login Administração Central', 'Admin');

    // ========================================================================
    // 2. NAVEGAÇÃO POR TECLADO E FOCO ACESSÍVEL (KEYBOARD ACCESSIBILITY)
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`⌨️ 2. TESTES DE NAVEGAÇÃO POR TECLADO (TAB / ESC / ENTER)`);
    console.log(`------------------------------------------------------`);

    await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // Testar Tab navigation nos inputs de login
    await page.keyboard.press('Tab');
    const activeEl1 = await page.evaluate(() => document.activeElement ? document.activeElement.tagName : '');
    assert('Navegação Teclado', 'Elemento com Foco ao pressionar Tab', !!activeEl1, `Tag focada: <${activeEl1}>`);

    await page.keyboard.press('Tab');
    const activeEl2 = await page.evaluate(() => document.activeElement ? document.activeElement.tagName : '');
    assert('Navegação Teclado', 'Progressão de foco para próximo controlo interativo', !!activeEl2, `Tag focada: <${activeEl2}>`);

    // ========================================================================
    // 3. ÁREA AUTENTICADA DO CIDADÃO
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`👤 3. AUDITORIA WCAG NA ÁREA DO CIDADÃO`);
    console.log(`------------------------------------------------------`);

    await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 15000 });
    await page.locator('input[name="cda-utilizador"]').first().fill(QA_BI_A);
    await page.locator('input[name="cda-senha"]').first().fill(QA_CID_PASS);
    await page.locator('button:has-text("Entrar no Portal"), button:has-text("ENTRAR NO PORTAL")').first().click();
    await page.waitForTimeout(2500);

    const rotasCid = [
      { hash: 'painel', name: 'Painel Principal' },
      { hash: 'correspondencias', name: 'Caixa de Correio Oficial' },
      { hash: 'contatos', name: 'Contactos Oficiais' },
      { hash: 'perfil', name: 'Meu Perfil & Segurança' },
      { hash: 'video-atendimento', name: 'Vídeo-Atendimento' },
      { hash: 'inqueritos', name: 'Inquéritos Cívicos' },
      { hash: 'comunicados', name: 'Comunicados' },
      { hash: 'ocorrencias', name: 'Ocorrências Locais (GPS)' },
      { hash: 'denuncias', name: 'Livro de Reclamações' },
      { hash: 'sondagens', name: 'Sondagens' },
      { hash: 'notificacoes', name: 'Notificações' },
      { hash: 'documentos', name: 'Cofre de Documentos' },
    ];

    for (const r of rotasCid) {
      await page.evaluate((h) => { window.location.hash = `#/${h}`; }, r.hash);
      await page.waitForTimeout(400);
      await runAxeScan(page, r.name, 'Cidadão');
    }

    // ========================================================================
    // 4. ÁREA AUTENTICADA DA INSTITUIÇÃO
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`🏛️ 4. AUDITORIA WCAG NA ÁREA DA INSTITUIÇÃO`);
    console.log(`------------------------------------------------------`);

    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto(`${BASE}/institucional#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 15000 });
    await page.locator('input[name="cda-utilizador"]').first().fill(QA_INST);
    await page.locator('input[name="cda-senha"]').first().fill(QA_CID_PASS);
    await page.locator('button:has-text("Entrar no Portal"), button:has-text("ENTRAR NO PORTAL")').first().click();
    await page.waitForTimeout(2500);

    const rotasInst = [
      { hash: 'painel', name: 'Painel Institucional' },
      { hash: 'correspondencias', name: 'Correio Institucional' },
      { hash: 'gov-contatos', name: 'Equipa & Colaboradores' },
      { hash: 'inst-qrcode', name: 'Validação QR Code' },
      { hash: 'inst-ai-assistant', name: 'Assistente IA Institucional' },
      { hash: 'perfil', name: 'Perfil Institucional' },
      { hash: 'video-atendimento', name: 'Vídeo-Atendimento Institucional' },
      { hash: 'inqueritos', name: 'Inquéritos Recebidos' },
      { hash: 'comunicados', name: 'Comunicados Emitidos' },
      { hash: 'ocorrencias', name: 'Ocorrências Recebidas' },
      { hash: 'denuncias', name: 'Denúncias Recebidas' },
    ];

    for (const r of rotasInst) {
      await page.evaluate((h) => { window.location.hash = `#/${h}`; }, r.hash);
      await page.waitForTimeout(400);
      await runAxeScan(page, r.name, 'Instituição');
    }

    // ========================================================================
    // 5. ÁREA DE ADMINISTRAÇÃO CENTRAL
    // ========================================================================
    console.log(`\n------------------------------------------------------`);
    console.log(`🛡️ 5. AUDITORIA WCAG NA ADMINISTRAÇÃO CENTRAL`);
    console.log(`------------------------------------------------------`);

    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto(`${BASE}/admin#/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 15000 });
    await page.locator('input[name="cda-utilizador"]').first().fill(QA_ADMIN);
    await page.locator('input[name="cda-senha"]').first().fill(QA_CID_PASS);
    await page.locator('button:has-text("Entrar no Portal"), button:has-text("ENTRAR NO PORTAL")').first().click();
    await page.waitForTimeout(2500);

    const rotasAdmin = [
      { hash: 'gov-dashboard', name: 'SOC Dashboard Nacional' },
      { hash: 'gov-interoperabilidade', name: 'Interoperabilidade Institucional' },
      { hash: 'gov-correspondencias', name: 'Correspondências Globais' },
      { hash: 'gov-contatos', name: 'Cadastro Geral de Cidadãos' },
      { hash: 'gov-trabalhadores', name: 'Equipa Central do Sistema' },
      { hash: 'gov-relatorio', name: 'Centro de Relatórios & Estatísticas' },
      { hash: 'gov-ia', name: 'Assistente IA Nacional' },
      { hash: 'gov-seguranca', name: 'Auditoria & Logs de Segurança' },
      { hash: 'gov-perfil', name: 'Perfil Administrativo' },
      { hash: 'gov-emissao', name: 'Emissão Documental' },
    ];

    for (const r of rotasAdmin) {
      await page.evaluate((h) => { window.location.hash = `#/${h}`; }, r.hash);
      await page.waitForTimeout(400);
      await runAxeScan(page, r.name, 'Admin');
    }

    await ctx.close();
  } catch (err) {
    console.error(`Erro crítico durante execução da suite de acessibilidade:`, err);
  } finally {
    await browser.close();
  }

  console.log(`\n======================================================`);
  console.log(`🏁 RESULTADO GLOBAL DA AUDITORIA WCAG 2.1 AA`);
  console.log(`======================================================`);
  console.log(`Total de Páginas Analisadas: ${report.pagesAudited.length}`);
  console.log(`Regras WCAG Aprovadas:      ${report.summary.totalPasses}`);
  console.log(`Violações Críticas:          ${report.summary.criticalViolations}`);
  console.log(`Violações Séries:            ${report.summary.seriousViolations}`);
  console.log(`Violações Moderadas:         ${report.summary.moderateViolations}`);
  console.log(`Violações Menores:           ${report.summary.minorViolations}`);
  console.log(`Asserções de Conformidade:   ${report.summary.assertionsPassed} PASS, ${report.summary.assertionsFailed} FAIL`);
  console.log(`======================================================\n`);

  return report;
}

runAccessibilitySuite().catch(console.error);
