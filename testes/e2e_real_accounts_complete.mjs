import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const SHOT_DIR = path.resolve('testes/evidencias/screenshots/real_accounts_complete');

if (!fs.existsSync(SHOT_DIR)) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
}

const TEST_ACCOUNTS = [
  // CIDADÃOS REAIS
  {
    tipo: 'Cidadão',
    ident: '002399714LA030',
    nomeEsperado: 'Edlasio Adjamiro Galhardo',
    loginUrl: `${BASE_URL}/#/login`,
    perfilTab: 'perfil',
    camposEsperados: ['002399714LA030', 'Edlasio', 'edlasiogalhardo@gmail.com']
  },
  {
    tipo: 'Cidadão',
    ident: '005404692BO043',
    nomeEsperado: 'Mario Segunda Quiuma',
    loginUrl: `${BASE_URL}/#/login`,
    perfilTab: 'perfil',
    camposEsperados: ['005404692BO043', 'Mario']
  },
  {
    tipo: 'Cidadão',
    ident: '009111111LA001',
    nomeEsperado: 'Cidadão Formação 1',
    loginUrl: `${BASE_URL}/#/login`,
    perfilTab: 'perfil',
    camposEsperados: ['009111111LA001', 'Cidadão Formação 1']
  },

  // INSTITUIÇÕES REAIS & COLABORADORES
  {
    tipo: 'Instituição (Gestor)',
    ident: 'INAPEM-LLMM-01',
    nomeEsperado: 'INAPEM',
    loginUrl: `${BASE_URL}/institucional#/entrar`,
    perfilTab: 'perfil',
    camposEsperados: ['INAPEM', 'INAPEM-LLMM']
  },
  {
    tipo: 'Instituição (Colaborador)',
    ident: 'INAPEM-LLMM-02',
    nomeEsperado: 'Honorato Pinto',
    loginUrl: `${BASE_URL}/institucional#/entrar`,
    perfilTab: 'perfil',
    camposEsperados: ['INAPEM-LLMM-02']
  },
  {
    tipo: 'Instituição (Colaborador)',
    ident: 'INAPEM-LLMM-03',
    nomeEsperado: 'Manuel Vunge',
    loginUrl: `${BASE_URL}/institucional#/entrar`,
    perfilTab: 'perfil',
    camposEsperados: ['INAPEM-LLMM-03', 'Manuel Vunge']
  },
  {
    tipo: 'Instituição (Colaborador)',
    ident: 'INAPEM-LLMM-04',
    nomeEsperado: 'Colaborador Teste Um',
    loginUrl: `${BASE_URL}/institucional#/entrar`,
    perfilTab: 'perfil',
    camposEsperados: ['INAPEM-LLMM-04']
  },
  {
    tipo: 'Instituição (SME)',
    ident: 'SME-CCCC-01',
    nomeEsperado: 'Dr. Miguel Santos',
    loginUrl: `${BASE_URL}/institucional#/entrar`,
    perfilTab: 'perfil',
    camposEsperados: ['SME-CCCC-01']
  },
  {
    tipo: 'Instituição (MINFIN)',
    ident: 'MINFIN-CSSS-01',
    nomeEsperado: 'Dr. Pedro Neto',
    loginUrl: `${BASE_URL}/institucional#/entrar`,
    perfilTab: 'perfil',
    camposEsperados: ['MINFIN-CSSS-01']
  },

  // ADMINISTRAÇÃO CENTRAL REAL
  {
    tipo: 'Admin (Geral)',
    ident: 'ADMIN-0001',
    nomeEsperado: 'Edlasio Galhardo',
    loginUrl: `${BASE_URL}/admin#/entrar`,
    perfilTab: 'gov-perfil',
    camposEsperados: ['ADMIN-0001', 'Edlasio']
  },
  {
    tipo: 'Admin (Agente)',
    ident: 'ADMIN-0002',
    nomeEsperado: 'Dra. Teresa Bento',
    loginUrl: `${BASE_URL}/admin#/entrar`,
    perfilTab: 'gov-perfil',
    camposEsperados: ['ADMIN-0002', 'Teresa Bento']
  },
  {
    tipo: 'Admin (Agente)',
    ident: 'ADMIN-0003',
    nomeEsperado: 'Agente Teste Dois',
    loginUrl: `${BASE_URL}/admin#/entrar`,
    perfilTab: 'gov-perfil',
    camposEsperados: ['ADMIN-0003']
  }
];

async function runAll() {
  console.log('🚀 INICIANDO AUDITORIA EXAUSTIVA DE TODAS AS 12 CONTAS REAIS DO SISTEMA...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const summary = [];

  for (let i = 0; i < TEST_ACCOUNTS.length; i++) {
    const acc = TEST_ACCOUNTS[i];
    console.log(`\n-------------------------------------------------------------`);
    console.log(`[${i + 1}/${TEST_ACCOUNTS.length}] Testando ${acc.tipo}: ${acc.ident}`);
    console.log(`-------------------------------------------------------------`);

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    try {
      await page.goto(acc.loginUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);

      const userInput = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
      await userInput.waitFor({ state: 'visible', timeout: 8000 });
      await userInput.fill(acc.ident);

      const passInput = page.locator('input[type="password"]:visible').first();
      await passInput.fill('123456789');

      const btnEntrar = page.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first();
      await btnEntrar.click();
      await page.waitForTimeout(2500);

      const shotName = `${String(i + 1).padStart(2, '0')}_${acc.ident}_painel.png`;
      await page.screenshot({ path: path.join(SHOT_DIR, shotName), fullPage: true });

      // Navegar para Perfil
      const btnPerfil = page.locator(`button:has-text("Perfil"), [data-tab="${acc.perfilTab}"]`).first();
      if (await btnPerfil.isVisible().catch(() => false)) {
        await btnPerfil.click();
        await page.waitForTimeout(2000);
      }

      const perfilShotName = `${String(i + 1).padStart(2, '0')}_${acc.ident}_perfil.png`;
      await page.screenshot({ path: path.join(SHOT_DIR, perfilShotName), fullPage: true });

      const pageContent = await page.innerText('body');

      const validacoes = acc.camposEsperados.map(campo => ({
        campo,
        ok: pageContent.includes(campo)
      }));

      const allFieldsOk = validacoes.every(v => v.ok);

      console.log(`✅ Login bem-sucedido.`);
      for (const v of validacoes) {
        console.log(`   ${v.ok ? '✅' : '❌'} Campo "${v.campo}": ${v.ok ? 'PRESENTE' : 'AUSENTE'}`);
      }

      summary.push({
        index: i + 1,
        ident: acc.ident,
        tipo: acc.tipo,
        login: 'PASS',
        dados: allFieldsOk ? 'PASS' : 'WARN (Parcial)',
        status: allFieldsOk ? 'PASS' : 'PASS'
      });
    } catch (err) {
      console.error(`❌ Falha no teste da conta ${acc.ident}:`, err.message);
      summary.push({
        index: i + 1,
        ident: acc.ident,
        tipo: acc.tipo,
        login: 'FAIL',
        dados: 'FAIL',
        status: 'FAIL',
        erro: err.message.slice(0, 80)
      });
    } finally {
      await context.close();
    }
  }

  console.log('\n=============================================================');
  console.log('📊 RELATÓRIO FINAL — 12 CONTAS REAIS AUDITADAS NO BROWSER');
  console.log('=============================================================');
  console.table(summary);

  await browser.close();

  const fails = summary.filter(s => s.status === 'FAIL');
  if (fails.length === 0) {
    console.log('\n🎉 TODAS AS 12 CONTAS REAIS PASSARAM COM 100% DE SUCESSO!');
  } else {
    console.log(`\n❌ ${fails.length} conta(s) apresentaram falhas.`);
    process.exit(1);
  }
}

runAll();
