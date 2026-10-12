import { chromium } from 'playwright';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

const BASE_URL = process.env.BASE || 'http://localhost:3000';
const CID_BI = process.env.QA_BI_A || '009874562LA041';
const CID_PASS = process.env.QA_CID_PASS || '123456';
const INST_ID = process.env.QA_INST || 'AGT-9921-SR';
const INST_PASS = process.env.QA_INST_PASS || '000000';

async function fecharModais(page) {
  try {
    const btnEntendi = page.locator('button', { hasText: /ENTENDI|FECHAR|DISMISS|OK|CONCLUIR/i });
    const count = await btnEntendi.count();
    for (let i = 0; i < count; i++) {
      const b = btnEntendi.nth(i);
      if (await b.isVisible()) await b.click({ timeout: 1000 }).catch(() => {});
    }
  } catch {}
}

async function run() {
  console.log('🚀 Iniciando Bateria E2E: Carregamento Integral de Todas as Correspondências...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const screenshotDir = path.resolve('testes/evidencias/screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS ${totalTests}] ${message}`);
    } else {
      console.error(`  ❌ [FAIL ${totalTests}] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // 1. ÁREA DO CIDADÃO
    console.log('\n👤 [ETAPA 1] Verificação na Área do Cidadão...');
    const ctxCid = await browser.newContext({ viewport: { width: 1366, height: 850 }, locale: 'pt-PT' });
    const pageCid = await ctxCid.newPage();

    await pageCid.goto(`${BASE_URL}/#/entrar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await pageCid.waitForTimeout(1000);
    const cidUserInput = pageCid.locator('input[name="cda-utilizador"], input[type="text"]').first();
    await cidUserInput.fill(CID_BI);
    await pageCid.locator('input[name="cda-senha"], input[type="password"]').first().fill(CID_PASS);
    await pageCid.locator('button', { hasText: /ENTRAR NO PORTAL/i }).first().click();
    await pageCid.waitForTimeout(3000);
    await fecharModais(pageCid);

    // Navegar para Correio Oficial
    const btnCorreioCid = pageCid.locator('aside button, button').filter({ hasText: /Correio/i }).first();
    if (await btnCorreioCid.isVisible()) {
      await btnCorreioCid.click();
      await pageCid.waitForTimeout(1500);
    }

    const todasTabCid = pageCid.locator('[data-testid="tab-todas"]').first();
    assert(await todasTabCid.isVisible(), 'Aba «Todas» está visível na Área do Cidadão');

    const isTodasActiveCid = await todasTabCid.evaluate(el => el.className.includes('bg-[#0E2B64]') || el.className.includes('text-white'));
    assert(isTodasActiveCid, 'Aba «Todas» está ativa por padrão na Área do Cidadão');

    const countCidTodas = await todasTabCid.locator('span').last().innerText();
    const numCidTodas = parseInt(countCidTodas.trim(), 10);
    assert(!isNaN(numCidTodas) && numCidTodas >= 0, `Contador de Todas as correspondências do Cidadão é numérico (${numCidTodas})`);

    // 2. EXCLUSÃO MÚTUA E FILTRAGEM
    console.log('\n🔍 [ETAPA 2] Verificação da Filtragem Dinâmica...');
    const tabLidasBtn = pageCid.locator('[data-testid="tab-lidas"]').first();
    const tabNaoLidasBtn = pageCid.locator('[data-testid="tab-naoLidas"]').first();

    await tabLidasBtn.click();
    await pageCid.waitForTimeout(500);
    const isLidasActive = await tabLidasBtn.evaluate(el => el.className.includes('bg-emerald-600'));
    assert(isLidasActive, 'Filtro «Lidas» ativa corretamente com tema esmeralda');

    await tabNaoLidasBtn.click();
    await pageCid.waitForTimeout(500);
    const isNaoLidasActive = await tabNaoLidasBtn.evaluate(el => el.className.includes('bg-red-600'));
    assert(isNaoLidasActive, 'Filtro «Não Lidas» ativa corretamente com tema rubro');

    await todasTabCid.click();
    await pageCid.waitForTimeout(500);
    const isTodasReactivated = await todasTabCid.evaluate(el => el.className.includes('bg-[#0E2B64]'));
    assert(isTodasReactivated, 'Retorno à aba «Todas» reestabelece a visualização integral');

    // 3. ÁREA INSTITUCIONAL
    console.log('\n🏛️ [ETAPA 3] Verificação na Área Institucional...');
    const ctxInst = await browser.newContext({ viewport: { width: 1366, height: 850 }, locale: 'pt-PT' });
    const pageInst = await ctxInst.newPage();

    await pageInst.goto(`${BASE_URL}/institucional#/entrar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await pageInst.waitForTimeout(1000);
    const instUserInput = pageInst.locator('input[name="cda-utilizador"], input[type="text"]').first();
    await instUserInput.fill(INST_ID);
    await pageInst.locator('input[name="cda-senha"], input[type="password"]').first().fill(INST_PASS);
    await pageInst.locator('button', { hasText: /ENTRAR NO PORTAL/i }).first().click();
    await pageInst.waitForTimeout(3000);
    await fecharModais(pageInst);

    // Navegar para Correio Institucional
    const btnCorreioInst = pageInst.locator('aside button, button').filter({ hasText: /Correio/i }).first();
    if (await btnCorreioInst.isVisible()) {
      await btnCorreioInst.click();
      await pageInst.waitForTimeout(1500);
    }

    const todasTabInst = pageInst.locator('[data-testid="tab-todas"]').first();
    assert(await todasTabInst.isVisible(), 'Aba «Todas» está visível na Área Institucional');

    const isTodasActiveInst = await todasTabInst.evaluate(el => el.className.includes('bg-[#0E2B64]') || el.className.includes('text-white'));
    assert(isTodasActiveInst, 'Aba «Todas» está ativa por padrão na Área Institucional');

    const countInstTodas = await todasTabInst.locator('span').last().innerText();
    const numInstTodas = parseInt(countInstTodas.trim(), 10);
    assert(!isNaN(numInstTodas) && numInstTodas >= 0, `Contador de Todas as correspondências da Instituição é numérico (${numInstTodas})`);

    await ctxCid.close();
    await ctxInst.close();

    console.log(`\n======================================================`);
    console.log(`🎉 BATERIA CONCLUÍDA: ${passedTests} de ${totalTests} asserções PASSARAM COM 100% DE SUCESSO!`);
    console.log(`======================================================`);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('❌ Falha na execução da bateria E2E:', err);
  process.exit(1);
});
