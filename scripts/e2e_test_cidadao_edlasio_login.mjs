import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE || 'http://localhost:3000';
const CID_BI = '002399714LA030';
const CID_PASS = '123456789';
const ADMIN_ID = process.env.QA_ADMIN || 'ADMIN-0001';
const ADMIN_PASS = process.env.QA_ADMIN_PASS || '123456789';

let passed = 0;
let total = 0;

function assert(cond, desc, details = '') {
  total++;
  if (cond) {
    passed++;
    console.log(`  ✅ [PASS] ${total}: ${desc}`);
  } else {
    console.error(`  ❌ [FAIL] ${total}: ${desc} -> ${details}`);
    throw new Error(`Falha no assert: ${desc}`);
  }
}

async function run() {
  console.log('='.repeat(80));
  console.log('🧪 TESTE: LOGIN DO CIDADÃO 002399714LA030 E VISIBILIDADE NO ADMIN');
  console.log('='.repeat(80) + '\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 850 }, locale: 'pt-PT' });
    const page = await context.newPage();

    // 1. Login do Cidadão
    console.log('👉 [1] Testando login de Cidadão com 002399714LA030...');
    await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    const biInput = page.locator('input[name="cda-utilizador"], input[placeholder*="B.I."]').first();
    await biInput.waitFor({ state: 'visible', timeout: 10000 });
    const passInput = page.locator('input[name="cda-senha"], input[type="password"]').first();

    await biInput.fill(CID_BI);
    await passInput.fill(CID_PASS);

    const btnEntrar = page.locator('button:has-text("Entrar no Portal"), button[type="submit"]').first();
    await btnEntrar.click();
    await page.waitForTimeout(3000);

    // Verificar se entrou no portal do cidadão
    const welcome = page.locator('body').filter({ hasText: /Edlasio|002399714LA030|Painel|Correio/i }).first();
    await welcome.waitFor({ state: 'visible', timeout: 10000 });
    assert(await welcome.isVisible(), 'Login de cidadão 002399714LA030 realizado com sucesso');

    const bodyText = await page.innerText('body');
    console.log('    📄 Sessão do cidadão aberta com sucesso.');
    assert(bodyText.toLowerCase().includes('edlasio') || bodyText.includes('002399714LA030'), 'Identidade do cidadão reconhecida na sessão');

    // 2. Acesso à Área Admin e Verificação na Lista de Cidadãos
    console.log('\n👉 [2] Testando visibilidade na Área Admin...');
    const adminContext = await browser.newContext({ viewport: { width: 1366, height: 850 }, locale: 'pt-PT' });
    const adminPage = await adminContext.newPage();

    await adminPage.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await adminPage.waitForTimeout(1500);

    const adminBiInput = adminPage.locator('input[name="cda-utilizador"]').first();
    if (await adminBiInput.count() > 0 && await adminBiInput.isVisible()) {
      await adminBiInput.fill(ADMIN_ID);
      await adminPage.locator('input[name="cda-senha"]').first().fill(ADMIN_PASS);
      await adminPage.locator('button:has-text("Entrar no Portal"), button[type="submit"]').first().click();
      await adminPage.waitForTimeout(3000);
    }

    const navCidadaos = adminPage.locator('aside button:has-text("Cidadãos"), nav button:has-text("Cidadãos")').first();
    await navCidadaos.waitFor({ state: 'visible', timeout: 10000 });
    await navCidadaos.click();
    await adminPage.waitForTimeout(2000);

    const edlasioRow = adminPage.locator('tr, div').filter({ hasText: /002399714LA030|Edlasio/i }).first();
    await edlasioRow.waitFor({ state: 'visible', timeout: 10000 });
    assert(await edlasioRow.isVisible(), 'Solicitação / registo do cidadão 002399714LA030 presente na página Cidadão do Admin');

    const rowText = await edlasioRow.innerText();
    console.log('    📄 Linha no Admin:', rowText.replace(/\n+/g, ' | '));
    assert(rowText.includes('002399714LA030') || rowText.toLowerCase().includes('edlasio'), 'BI e nome de Edlasio exibidos na tabela admin');

    console.log('\n' + '='.repeat(80));
    console.log(`🎉 TESTE CONCLUÍDO: ${passed}/${total} ASSERÇÕES PASSARAM COM SUCESSO!`);
    console.log('='.repeat(80) + '\n');
  } catch (err) {
    console.error('❌ Falha no teste:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
