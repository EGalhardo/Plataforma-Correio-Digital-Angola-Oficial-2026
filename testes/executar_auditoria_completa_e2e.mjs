import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:3000';
const SHOT_DIR = path.resolve('testes/evidencias/screenshots/auditoria_master');
const LOG_DIR = path.resolve('testes/evidencias/logs');
const NET_DIR = path.resolve('testes/evidencias/redes');

[SHOT_DIR, LOG_DIR, NET_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const VIEWPORTS = [
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 }
];

const auditFindings = [];
const consoleErrorsGlobal = [];
const pageErrorsGlobal = [];
const networkFailuresGlobal = [];
const executedPages = [];

// ============================================================================
// 1. ANÁLISE ESTÁTICA
// ============================================================================
console.log('🔍 [FASE 1] Executando Análise Estática de Código...');

// 1.1 Typecheck
try {
  console.log('   ↳ Executando TypeScript Typecheck (tsc --noEmit)...');
  execSync('npm run lint', { encoding: 'utf8', stdio: 'pipe' });
  console.log('   ✅ TypeScript Typecheck: 0 erros.');
} catch (e) {
  auditFindings.push({
    severity: '🔴 CRÍTICO',
    area: 'Global',
    page: 'Build/TypeScript',
    file: 'tsconfig.json',
    line: '0',
    title: 'Erro de compilação TypeScript',
    impact: 'Aplicação pode falhar durante a execução.',
    fix: 'Corrigir os tipos TypeScript reportados pelo compilador.',
    evidence: e.stdout || e.stderr || e.message
  });
}

// 1.2 Secrets Check (Hardcoded keys check)
console.log('   ↳ Verificando ausência de segredos sensíveis no código cliente (src/)...');
try {
  const secretPatterns = [
    { name: 'SUPABASE_SERVICE_ROLE_KEY', pattern: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][a-zA-Z0-9_\-\.]{20,}['"]/ },
    { name: 'Hardcoded Bearer Token', pattern: /Bearer\s+ey[A-Za-z0-9_\-\.]{40,}/ },
    { name: 'OpenAI/Groq Secret Key', pattern: /['"]gsk_[a-zA-Z0-9]{20,}['"]/ },
    { name: 'Google API Secret Hardcoded', pattern: /['"]AIza[0-9A-Za-z-_]{35}['"]/ }
  ];

  const srcFiles = [];
  function scanDir(dir) {
    fs.readdirSync(dir).forEach(file => {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) scanDir(full);
      else if (/\.(tsx?|jsx?)$/.test(file)) srcFiles.push(full);
    });
  }
  scanDir('src');

  for (const f of srcFiles) {
    const content = fs.readFileSync(f, 'utf8');
    for (const sp of secretPatterns) {
      if (sp.pattern.test(content)) {
        auditFindings.push({
          severity: '🔴 CRÍTICO',
          area: 'Segurança',
          page: 'Cliente',
          file: f,
          line: '0',
          title: `Possível segredo exposto no cliente: ${sp.name}`,
          impact: 'Risco de segurança / vazamento de credenciais administrativas.',
          fix: 'Mover segredo para variáveis de ambiente no servidor (server.ts / .env).',
          evidence: `Padrão ${sp.name} encontrado em ${f}`
        });
      }
    }
  }
  console.log(`   ✅ Varredura de segredos concluída (${srcFiles.length} ficheiros analisados).`);
} catch (secErr) {
  console.error('Erro na varredura de segredos:', secErr);
}

// ============================================================================
// 2. AUDITORIA DINÂMICA COM PLAYWRIGHT (Chromium)
// ============================================================================
console.log('\n🌐 [FASE 2] Executando Auditoria Dinâmica no Browser Real...');

async function runDynamicAudit() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--use-file-for-fake-video-capture=/tmp/static_face.y4m'
    ]
  });

  // Função auxiliar para criar página com listeners estritos
  async function createAuditPage(context, roleTag) {
    const page = await context.newPage();

    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrorsGlobal.push({ role: roleTag, text, url: page.url() });
      }
    });

    page.on('pageerror', err => {
      pageErrorsGlobal.push({ role: roleTag, message: err.message, stack: err.stack, url: page.url() });
    });

    page.on('response', resp => {
      const status = resp.status();
      const url = resp.url();
      if (status >= 400 && !url.includes('/api/health') && !url.includes('favicon')) {
        networkFailuresGlobal.push({ role: roleTag, status, url });
      }
    });

    return page;
  }

  // Helper de checagem de overflow horizontal
  async function checkHorizontalOverflow(page, roleName, pageName, vpName) {
    const overflow = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth || document.body.scrollWidth,
        clientWidth: window.innerWidth,
        hasOverflow: (document.documentElement.scrollWidth || document.body.scrollWidth) > window.innerWidth + 2
      };
    });

    if (overflow.hasOverflow) {
      auditFindings.push({
        severity: '🟡 MÉDIO',
        area: roleName,
        page: pageName,
        file: 'src/components/layout/',
        line: 'responsive',
        title: `Overflow horizontal detectado em ${vpName} (${overflow.scrollWidth}px > ${overflow.clientWidth}px)`,
        impact: 'Causa rolagem horizontal indesejada em telas móveis.',
        fix: 'Adicionar overflow-x-hidden no container raiz ou ajustar larguras fixas.',
        evidence: `Viewport: ${vpName} | scrollWidth: ${overflow.scrollWidth} | clientWidth: ${overflow.clientWidth}`
      });
    }
  }

  // --------------------------------------------------------------------------
  // ÁREA 1: CIDADÃO
  // --------------------------------------------------------------------------
  console.log('\n--- AUDITORIA: ÁREA DO CIDADÃO ---');
  for (const vp of VIEWPORTS) {
    console.log(`📱 Testando Cidadão em Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await createAuditPage(context, `Cidadao-${vp.name}`);

    try {
      // 1. Login Público / Landing
      await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SHOT_DIR, `cidadao_${vp.name}_01_login.png`), fullPage: true });
      await checkHorizontalOverflow(page, 'Cidadão', 'Login', vp.name);

      // 2. Formulário de Registo
      await page.goto(`${BASE_URL}/#/registo`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SHOT_DIR, `cidadao_${vp.name}_02_registo.png`), fullPage: true });
      await checkHorizontalOverflow(page, 'Cidadão', 'Registo', vp.name);

      // 3. Redefinir Senha
      await page.goto(`${BASE_URL}/#/redefinir-senha`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SHOT_DIR, `cidadao_${vp.name}_03_redefinir_senha.png`), fullPage: true });

      // 4. Login Facial Ecrã
      await page.goto(`${BASE_URL}/#/login-facial`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SHOT_DIR, `cidadao_${vp.name}_04_login_facial.png`), fullPage: true });

      // 5. Autenticação na Sessão do Cidadão (novo contexto para limpar stage)
      await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'domcontentloaded' });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);

      const biInput = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
      await biInput.waitFor({ state: 'visible', timeout: 8000 });
      await biInput.fill('009111111LA001');
      const passInput = page.locator('input[type="password"]:visible').first();
      await passInput.fill('123456789');
      const btnEntrar = page.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first();
      await btnEntrar.click();
      await page.waitForTimeout(1500);

      // 6. Navegação em TODAS as páginas do Cidadão
      const cidadaoPages = [
        { id: 'home', label: 'Painel', tab: 'home' },
        { id: 'correspondencias', label: 'Correio', tab: 'correspondencias' },
        { id: 'contatos', label: 'Contactos', tab: 'contatos' },
        { id: 'perfil', label: 'Perfil', tab: 'perfil' },
        { id: 'historico', label: 'Histórico', tab: 'historico' },
        { id: 'notificacoes', label: 'Notificações', tab: 'notificacoes' },
        { id: 'pagamentos', label: 'Pagamentos', tab: 'pagamentos' },
        { id: 'video-atendimento', label: 'Video-Atendimento', tab: 'video-atendimento' },
        { id: 'directorio', label: 'Directório de Órgãos', tab: 'directorio' },
        { id: 'sondagens', label: 'Sondagens', tab: 'sondagens' },
        { id: 'wallet', label: 'Carteira Digital', tab: 'wallet' },
        { id: 'pasta-digital', label: 'Pasta Digital', tab: 'pasta-digital' },
        { id: 'solicitar-documento', label: 'Solicitar Atos', tab: 'solicitar-documento' }
      ];

      for (const p of cidadaoPages) {
        await page.evaluate(t => { window.location.hash = `#/${t}`; }, p.tab);
        await page.waitForTimeout(400);

        const shotP = path.join(SHOT_DIR, `cidadao_${vp.name}_page_${p.id}.png`);
        await page.screenshot({ path: shotP, fullPage: true });
        await checkHorizontalOverflow(page, 'Cidadão', p.label, vp.name);

        executedPages.push({ area: 'Cidadão', page: p.label, viewport: vp.name, status: 'PASS' });
      }

    } catch (e) {
      console.error(`Erro no teste Cidadão ${vp.name}:`, e.message);
      auditFindings.push({
        severity: '🟠 ALTO',
        area: 'Cidadão',
        page: 'Navegação',
        file: 'src/App.tsx',
        line: '0',
        title: `Falha na navegação Cidadão em ${vp.name}`,
        impact: 'Impede o fluxo normal do cidadão.',
        fix: 'Ajustar seletores e montagem de componentes.',
        evidence: e.message
      });
    } finally {
      await context.close();
    }
  }

  // --------------------------------------------------------------------------
  // ÁREA 2: INSTITUCIONAL (Responsável e Colaborador)
  // --------------------------------------------------------------------------
  console.log('\n--- AUDITORIA: ÁREA INSTITUCIONAL ---');
  for (const vp of VIEWPORTS) {
    console.log(`🏢 Testando Institucional em Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await createAuditPage(context, `Inst-${vp.name}`);

    try {
      // 1. Registo Institucional
      await page.goto(`${BASE_URL}/institucional#/registar`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SHOT_DIR, `inst_${vp.name}_01_registar.png`), fullPage: true });
      await checkHorizontalOverflow(page, 'Instituição', 'Registo DPA 2025', vp.name);

      // 2. Redefinir Senha Institucional
      await page.goto(`${BASE_URL}/institucional#/redefinir-senha`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SHOT_DIR, `inst_${vp.name}_02_redefinir_senha.png`), fullPage: true });

      // 3. Login Institucional em nova navegação limpa
      await page.goto(`${BASE_URL}/institucional#/entrar`, { waitUntil: 'domcontentloaded' });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);

      const codeInput = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
      await codeInput.waitFor({ state: 'visible', timeout: 8000 });
      await codeInput.fill('INAPEM-LLMM-01');
      const passInput = page.locator('input[type="password"]:visible').first();
      await passInput.fill('123456789');
      const btnEntrar = page.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first();
      await btnEntrar.click();
      await page.waitForTimeout(1500);

      const instPages = [
        { id: 'home', label: 'Painel', tab: 'home' },
        { id: 'correspondencias', label: 'Correio', tab: 'correspondencias' },
        { id: 'equipa', label: 'Equipa', tab: 'gov-contatos' },
        { id: 'inst-qrcode', label: 'QR Code', tab: 'inst-qrcode' },
        { id: 'inst-ai-assistant', label: 'Assistente IA', tab: 'inst-ai-assistant' },
        { id: 'perfil', label: 'Perfil', tab: 'perfil' },
        { id: 'inst-pagamentos', label: 'Pagamentos / Cobrança', tab: 'inst-pagamentos' },
        { id: 'inst-emergencia', label: 'Emergência Governamental', tab: 'inst-emergencia' }
      ];

      for (const p of instPages) {
        await page.evaluate(t => { window.location.hash = `#/${t}`; }, p.tab);
        await page.waitForTimeout(400);

        const shotP = path.join(SHOT_DIR, `inst_${vp.name}_page_${p.id}.png`);
        await page.screenshot({ path: shotP, fullPage: true });
        await checkHorizontalOverflow(page, 'Instituição', p.label, vp.name);

        executedPages.push({ area: 'Institucional', page: p.label, viewport: vp.name, status: 'PASS' });
      }

      // Testar Modal Nova Mensagem com TabBar (Cidadão / Instituição)
      await page.evaluate(() => { window.location.hash = '#/correspondencias'; });
      await page.waitForTimeout(400);
      const btnNovaMsg = page.locator('button:has-text("Nova Correspondência"), button:has-text("Escrever")').first();
      if (await btnNovaMsg.isVisible().catch(() => false)) {
        await btnNovaMsg.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(SHOT_DIR, `inst_${vp.name}_modal_nova_msg.png`), fullPage: true });

        // Fechar modal
        const btnFechar = page.locator('button[aria-label="Fechar"], button:has-text("Cancelar"), [data-close-modal]').first();
        if (await btnFechar.isVisible().catch(() => false)) await btnFechar.click().catch(() => null);
      }

    } catch (e) {
      console.error(`Erro no teste Institucional ${vp.name}:`, e.message);
      auditFindings.push({
        severity: '🟠 ALTO',
        area: 'Institucional',
        page: 'Navegação',
        file: 'src/App.tsx',
        line: '0',
        title: `Falha na navegação Institucional em ${vp.name}`,
        impact: 'Impede o fluxo operacional do gestor/agente.',
        fix: 'Ajustar rotas institucionais e permissões.',
        evidence: e.message
      });
    } finally {
      await context.close();
    }
  }

  // --------------------------------------------------------------------------
  // ÁREA 3: ADMINISTRAÇÃO CENTRAL
  // --------------------------------------------------------------------------
  console.log('\n--- AUDITORIA: ÁREA DE ADMINISTRAÇÃO CENTRAL ---');
  for (const vp of VIEWPORTS) {
    console.log(`🛡️ Testando Admin em Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await createAuditPage(context, `Admin-${vp.name}`);

    try {
      // 1. Registo de Admin Alfa
      await page.goto(`${BASE_URL}/admin#/registar-admin`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SHOT_DIR, `admin_${vp.name}_01_registar_alfa.png`), fullPage: true });
      await checkHorizontalOverflow(page, 'Admin', 'Registo Alfa', vp.name);

      // 2. Redefinir Senha Admin
      await page.goto(`${BASE_URL}/admin#/redefinir-senha`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SHOT_DIR, `admin_${vp.name}_02_redefinir_senha.png`), fullPage: true });

      // 3. Login Admin em navegação limpa
      await page.goto(`${BASE_URL}/admin#/entrar`, { waitUntil: 'domcontentloaded' });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);

      const agentInput = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
      await agentInput.waitFor({ state: 'visible', timeout: 8000 });
      await agentInput.fill('ADMIN-0001');
      const passInput = page.locator('input[type="password"]:visible').first();
      await passInput.fill('123456789');
      const btnEntrar = page.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first();
      await btnEntrar.click();
      await page.waitForTimeout(1500);

      const adminPages = [
        { id: 'gov-dashboard', label: 'Painel Central', tab: 'gov-dashboard' },
        { id: 'gov-interoperabilidade', label: 'Interoperabilidade', tab: 'gov-interoperabilidade' },
        { id: 'gov-correspondencias', label: 'Auditoria de Correspondências', tab: 'gov-correspondencias' },
        { id: 'gov-contatos', label: 'Cidadãos (PVI & Homologação)', tab: 'gov-contatos' },
        { id: 'gov-trabalhadores', label: 'Equipa & Agentes', tab: 'gov-trabalhadores' },
        { id: 'gov-relatorio', label: 'Relatórios Executivos', tab: 'gov-relatorio' },
        { id: 'gov-ia', label: 'Monitor de IA', tab: 'gov-ia' },
        { id: 'gov-seguranca', label: 'Segurança & SOC', tab: 'gov-seguranca' },
        { id: 'gov-perfil', label: 'Perfil Admin', tab: 'gov-perfil' },
        { id: 'gov-emissao', label: 'Emissão em Massa', tab: 'gov-emissao' }
      ];

      for (const p of adminPages) {
        await page.evaluate(t => { window.location.hash = `#/${t}`; }, p.tab);
        await page.waitForTimeout(400);

        const shotP = path.join(SHOT_DIR, `admin_${vp.name}_page_${p.id}.png`);
        await page.screenshot({ path: shotP, fullPage: true });
        await checkHorizontalOverflow(page, 'Admin', p.label, vp.name);

        executedPages.push({ area: 'Admin', page: p.label, viewport: vp.name, status: 'PASS' });
      }

    } catch (e) {
      console.error(`Erro no teste Admin ${vp.name}:`, e.message);
      auditFindings.push({
        severity: '🟠 ALTO',
        area: 'Admin',
        page: 'Navegação',
        file: 'src/App.tsx',
        line: '0',
        title: `Falha na navegação Admin em ${vp.name}`,
        impact: 'Impede o controle da administração.',
        fix: 'Ajustar rotas administrativas.',
        evidence: e.message
      });
    } finally {
      await context.close();
    }
  }

  await browser.close();
}

await runDynamicAudit();

// ============================================================================
// 3. GRAVAÇÃO DE RELATÓRIO E EVIDÊNCIAS
// ============================================================================
const auditReport = {
  timestamp: new Date().toISOString(),
  totalPaginasTestadas: executedPages.length,
  findingsCount: {
    critico: auditFindings.filter(f => f.severity.includes('CRÍTICO')).length,
    alto: auditFindings.filter(f => f.severity.includes('ALTO')).length,
    medio: auditFindings.filter(f => f.severity.includes('MÉDIO')).length,
    baixo: auditFindings.filter(f => f.severity.includes('BAIXO')).length,
  },
  findings: auditFindings,
  consoleErrors: consoleErrorsGlobal,
  pageErrors: pageErrorsGlobal,
  networkFailures: networkFailuresGlobal,
  executedPages
};

fs.writeFileSync(path.join(LOG_DIR, 'relatorio_auditoria_autonoma_completa.json'), JSON.stringify(auditReport, null, 2));
console.log('\n=============================================================');
console.log(`✅ AUDITORIA COMPLETA CONCLUÍDA! Total de páginas executadas: ${executedPages.length}`);
console.log(`   🔴 Crítico: ${auditReport.findingsCount.critico}`);
console.log(`   🟠 Alto: ${auditReport.findingsCount.alto}`);
console.log(`   🟡 Médio: ${auditReport.findingsCount.medio}`);
console.log(`   🟢 Baixo: ${auditReport.findingsCount.baixo}`);
console.log(`   Erros de consola não tratados: ${pageErrorsGlobal.length}`);
console.log(`   Falhas de rede silenciosas (4xx/5xx): ${networkFailuresGlobal.length}`);
console.log('=============================================================');
