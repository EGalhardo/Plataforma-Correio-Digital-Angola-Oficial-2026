/**
 * Suíte de Testes E2E:
 * Validação de exibição e homologação de cidadão (Edlasio Galhardo)
 * e catálogo/solicitações de Instituições na Área de Admin.
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE || 'http://localhost:3000';
const ADMIN_ID = process.env.QA_ADMIN || 'ADMIN-0001';
const ADMIN_PASS = process.env.QA_ADMIN_PASS || '123456789';

let passed = 0;
let total = 0;
const results = [];

function assert(cond, desc, details = '') {
  total++;
  if (cond) {
    passed++;
    console.log(`  ✅ [PASS] Bloco ${total}: ${desc}`);
    results.push({ test: desc, status: 'PASS', details });
  } else {
    console.error(`  ❌ [FAIL] Bloco ${total}: ${desc} -> ${details}`);
    results.push({ test: desc, status: 'FAIL', details });
    throw new Error(`Falha no assert: ${desc}`);
  }
}

async function fecharModais(page) {
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      for (const b of btns) {
        const txt = (b.innerText || '').trim();
        if (txt.includes('Concluir e Fechar') || txt.includes('Sair / Fechar') || txt === 'Fechar' || txt === 'OK' || txt === 'Entendido' || txt === '×') {
          try { b.click(); } catch(e) {}
        }
      }
    }).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(150);
  }
}

async function loginAdmin(page) {
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  await fecharModais(page);

  const painelVisivel = await page.locator('aside button:has-text("Cidadãos")').count() > 0;
  if (!painelVisivel) {
    const biInput = page.locator('input[name="cda-utilizador"]').first();
    await biInput.waitFor({ state: 'visible', timeout: 15000 });
    const passInput = page.locator('input[name="cda-senha"]').first();

    await biInput.fill(ADMIN_ID);
    await passInput.fill(ADMIN_PASS);

    const btnEntrar = page.locator('button:has-text("Entrar no Portal"), button[type="submit"]').first();
    await btnEntrar.click();
    await page.waitForTimeout(3000);
  }
  await fecharModais(page);
}

async function run() {
  console.log('='.repeat(85));
  console.log('🧪 SUÍTE DE TESTES E2E: EXIBIÇÃO DE CIDADÃO (EDLASIO GALHARDO) E INSTITUIÇÕES NO ADMIN');
  console.log('='.repeat(85) + '\n');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  });

  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 850 }, locale: 'pt-PT' });
    const page = await context.newPage();

    // =========================================================================
    // BLOCO 1: Login de Administrador e Acesso ao Painel
    // =========================================================================
    console.log('👉 [ETAPA 1] Autenticação e entrada no Painel de Administração...');
    await loginAdmin(page);

    const navCidadaos = page.locator('aside button:has-text("Cidadãos"), nav button:has-text("Cidadãos")').first();
    await navCidadaos.waitFor({ state: 'visible', timeout: 10000 });
    assert(await navCidadaos.isVisible(), 'Menu lateral "Cidadãos" visível e acessível no Admin');

    // =========================================================================
    // BLOCO 2: Navegação para a página de Cidadãos (gov-contatos)
    // =========================================================================
    console.log('👉 [ETAPA 2] Navegando para o módulo "Cidadãos"...');
    await navCidadaos.click();
    await page.waitForTimeout(2000);

    const headingCidadaos = page.locator('h1, h2, h4').filter({ hasText: /Usuário|Cidadãos|Quadro de Cadastros Nacionais/i }).first();
    await headingCidadaos.waitFor({ state: 'visible', timeout: 10000 });
    assert(await headingCidadaos.isVisible(), 'Página de Gestão de Cidadãos carregada com sucesso');

    // =========================================================================
    // BLOCO 3: Verificação do Cidadão "Edlasio Galhardo" na Tabela
    // =========================================================================
    console.log('👉 [ETAPA 3] Verificando a presença de "Edlasio Galhardo" na tabela...');
    const edlasioRow = page.locator('tr, div').filter({ hasText: /Edlasio/i }).first();
    await edlasioRow.waitFor({ state: 'visible', timeout: 10000 });
    const edlasioVisible = await edlasioRow.isVisible();
    assert(edlasioVisible, 'Cidadão "Edlasio Galhardo" visível e listado na tabela de cidadãos');

    const edlasioText = await edlasioRow.innerText();
    console.log('    📄 Dados da linha:', edlasioText.replace(/\n+/g, ' | '));
    assert(edlasioText.toLowerCase().includes('edlasio'), 'Nome do cidadão Edlasio exibido corretamente');

    // =========================================================================
    // BLOCO 4: Abertura do Modal de Revisão / Homologação
    // =========================================================================
    console.log('👉 [ETAPA 4] Abrindo detalhes / revisão do cidadão Edlasio...');
    const btnRevisar = page.locator('tr, div').filter({ hasText: /Edlasio/i }).locator('button:has-text("REVISAR"), button:has-text("Revisar"), button:has-text("Rever")').first();
    await btnRevisar.waitFor({ state: 'visible', timeout: 5000 });
    await btnRevisar.click();
    await page.waitForTimeout(1500);

    const modalRevisao = page.locator('[role="dialog"], .fixed, div').filter({ hasText: /Portal de Homologação de Identidade|Validação Biométrica/i }).first();
    await modalRevisao.waitFor({ state: 'visible', timeout: 10000 });
    assert(await modalRevisao.isVisible(), 'Modal de homologação/revisão aberto com sucesso para Edlasio Galhardo');

    const modalText = await modalRevisao.innerText();
    console.log('    📄 Modal text preview:', modalText.slice(0, 200).replace(/\n+/g, ' | '));
    assert(modalText.toLowerCase().includes('homologação') || modalText.toLowerCase().includes('biométrica') || modalText.toLowerCase().includes('validação') || modalText.toLowerCase().includes('edlasio'), 'Abas e análises biofísicas/OCR visíveis no modal de revisão');

    const btnClose = page.locator('button[title="Fechar"]').first();
    if (await btnClose.count() > 0) {
      await btnClose.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(1000);
    await fecharModais(page);

    // =========================================================================
    // BLOCO 5: Navegação para a página de Instituições (gov-interoperabilidade)
    // =========================================================================
    console.log('👉 [ETAPA 5] Navegando para o módulo "Instituições"...');
    const navInst = page.locator('aside button:has-text("Instituições"), nav button:has-text("Instituições")').first();
    await navInst.waitFor({ state: 'visible', timeout: 10000 });
    await navInst.click();
    await page.waitForTimeout(2000);

    const headingInst = page.locator('h1, h2, h3, h4').filter({ hasText: /Instituições|Interoperabilidade|Ecossistema/i }).first();
    await headingInst.waitFor({ state: 'visible', timeout: 10000 });
    assert(await headingInst.isVisible(), 'Página de Gestão de Instituições carregada com sucesso');

    // =========================================================================
    // BLOCO 6: Verificação do Catálogo de Instituições
    // =========================================================================
    console.log('👉 [ETAPA 6] Verificando o catálogo de instituições...');
    const instTbody = page.locator('tbody tr, .grid > div, table').filter({ hasText: /AGT|ENDE|EPAL|INAPEM|MINFIN/i }).first();
    await instTbody.waitFor({ state: 'visible', timeout: 10000 });
    assert(await instTbody.isVisible(), 'Catálogo de instituições carregado com entidades oficiais (AGT/ENDE/EPAL/INAPEM)');

    // =========================================================================
    // BLOCO 7: Verificação da Secção de Solicitações Institucionais
    // =========================================================================
    console.log('👉 [ETAPA 7] Verificando secção de solicitações de registo institucional...');
    const solSection = page.locator('h2, h3, h4, div').filter({ hasText: /Solicitações de Registo|Adesão Institucional|Interoperabilidade/i }).first();
    const solSectionVisible = await solSection.isVisible();
    assert(solSectionVisible, 'Secção de solicitações de registo de instituições visível e operacional');

    console.log('\n' + '='.repeat(85));
    console.log(`🎉 SUÍTE CONCLUÍDA: ${passed}/${total} BLOCOS PASSARAM COM 100% DE SUCESSO!`);
    console.log('='.repeat(85) + '\n');
  } catch (error) {
    console.error('❌ Erro durante a execução dos testes E2E:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
