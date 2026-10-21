import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE || 'http://localhost:3000';
const ADMIN_ID = process.env.QA_ADMIN || 'ADMIN-0001';
const ADMIN_PASS = process.env.QA_ADMIN_PASS || '123456789';
const TEST_BI = '007777777LA777';
const TEST_NAME = 'Cidadao Teste Persistencia';

let passed = 0;
let total = 0;

function assert(cond, desc, details = '') {
  total++;
  if (cond) {
    passed++;
    console.log(`  ✅ [PASS] Bloco ${total}: ${desc}`);
  } else {
    console.error(`  ❌ [FAIL] Bloco ${total}: ${desc} -> ${details}`);
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

async function run() {
  console.log('='.repeat(80));
  console.log('🧪 TESTE: ELIMINAÇÃO DEFINITIVA DE CIDADÃO NO ADMIN (SEM REAPARECIMENTO)');
  console.log('='.repeat(80) + '\n');

  // 1. Inserir registo temporário de teste na base de dados
  console.log('👉 [ETAPA 1] Inserindo cidadão de teste:', TEST_BI);
  await fetch(`${BASE_URL}/api/dados`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tabela: 'solicitacoes_registo',
      operacao: 'insert',
      dados: {
        bi_numero: TEST_BI,
        nome: TEST_NAME,
        email: 'teste.persistencia@cda.gov.ao',
        status: 'Pendente',
        observacoes: 'Registo de teste para validação de eliminação definitiva'
      }
    })
  });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 850 }, locale: 'pt-PT' });
    const page = await context.newPage();

    page.on('console', msg => console.log('  [BROWSER CONSOLE]', msg.text()));
    page.on('pageerror', err => console.log('  [BROWSER ERROR]', err));

    // 2. Login Admin e Acesso a Cidadãos
    console.log('👉 [ETAPA 2] Acedendo à Área Admin -> Cidadãos...');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    const biInput = page.locator('input[name="cda-utilizador"]').first();
    if (await biInput.count() > 0 && await biInput.isVisible()) {
      await biInput.fill(ADMIN_ID);
      await page.locator('input[name="cda-senha"]').first().fill(ADMIN_PASS);
      await page.locator('button:has-text("Entrar no Portal"), button[type="submit"]').first().click();
      await page.waitForTimeout(3000);
    }

    const navCidadaos = page.locator('aside button:has-text("Cidadãos"), nav button:has-text("Cidadãos")').first();
    await navCidadaos.waitFor({ state: 'visible', timeout: 10000 });
    await navCidadaos.click();
    await page.waitForTimeout(2000);

    // 3. Verificar que o cidadão de teste aparece na tabela
    console.log('👉 [ETAPA 3] Verificando cidadão na tabela antes da eliminação...');
    const testRow = page.locator('tbody tr').filter({ hasText: TEST_BI }).first();
    await testRow.waitFor({ state: 'visible', timeout: 10000 });
    assert(await testRow.isVisible(), 'Cidadão de teste visível na tabela');

    // 4. Clicar no botão ELIMINAR da linha
    console.log('👉 [ETAPA 4] Executando eliminação do cidadão pelo Admin...');
    const btnEliminar = testRow.locator('button:has-text("ELIMINAR"), button:has-text("Eliminar")').last();
    console.log('    Botão eliminar count:', await btnEliminar.count());
    await btnEliminar.click();
    await page.waitForTimeout(1000);

    const modalCount = await page.locator('.z-\\[301\\]').count();
    console.log('    Modal count:', modalCount);
    if (modalCount > 0) {
      console.log('    Modal text:', await page.locator('.z-\\[301\\]').innerText());
      const btnConfirmar = page.locator('.z-\\[301\\] button').filter({ hasText: /Eliminar Definitivamente/i }).first();
      await btnConfirmar.click({ force: true });
      await page.waitForTimeout(3000);
    }

    // 5. Verificar que desapareceu imediatamente da tabela
    console.log('👉 [ETAPA 5] Verificando que o cidadão desapareceu da tabela...');
    const tbodyText = await page.locator('tbody').innerText();
    console.log('    📄 Tbody rows:\n', tbodyText);
    const countAfterDelete = await page.locator('tbody tr').filter({ hasText: TEST_BI }).count();
    assert(countAfterDelete === 0, 'Cidadão removido com sucesso da tabela');

    // 6. Testar persistência pós-refresh / polling
    console.log('👉 [ETAPA 6] Testando persistência: aguardando ciclo de sincronização e navegando entre abas...');
    // Alterna para outra aba e volta para forçar refrescarTudo
    const navInst = page.locator('aside button:has-text("Instituições"), nav button:has-text("Instituições")').first();
    await navInst.click();
    await page.waitForTimeout(1500);

    await navCidadaos.click();
    await page.waitForTimeout(3000);

    const countAfterRefresh = await page.locator('tbody tr').filter({ hasText: TEST_BI }).count();
    assert(countAfterRefresh === 0, 'Cidadão continua 100% eliminado após refresh e NÃO voltou a aparecer');

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
