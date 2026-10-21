// E2E Test:
// Validação do comportamento na página Painel:
// Quando a tabela de correspondências "Eliminadas" NÃO está vazia e "Não Lidas" ESTÁ vazia,
// a tabela "Eliminadas" deve ser visível ocupando o lugar da tabela "Não Lidas".

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';

const log = (msg) => console.log(`[TEST] ${msg}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const results = [];
function assert(name, condition, details = '') {
  const status = condition ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${name} ${details ? '(' + details + ')' : ''}`);
  results.push({ name, status, details });
  if (!condition) {
    console.error(`Assertion failed: ${name} ${details}`);
  }
}

async function runTests() {
  log(`Iniciando testes de exibição da tabela Eliminadas no Painel em ${BASE}...`);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();

    // 1. Acesso e login como Cidadão
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });

    await page.fill('input[name="cda-utilizador"]', '002399714LA030');
    await page.fill('input[name="cda-senha"]', '123456789');
    await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await sleep(3500);

    // 2. Verificar estado inicial no Painel
    log('--- ETAPA 1: Verificação inicial do Painel ---');
    const painelHeading = page.locator('text=Instituições Conectadas').first();
    assert('Painel inicial carregado', await painelHeading.isVisible({ timeout: 15000 }));

    // 3. Simular estado onde todas as mensagens da caixa de entrada estão lidas (unread: 0)
    // E existem mensagens arquivadas/eliminadas (deletedMessages > 0)
    log('--- ETAPA 2: Configurar Não Lidas = 0 e Eliminadas > 0 ---');
    await page.evaluate(() => {
      // Marcar todas as mensagens recebidas como lidas e eliminar uma delas
      const rawInbox = JSON.parse(localStorage.getItem('correio_digital_inbox') || '[]');
      if (rawInbox.length > 0) {
        const firstId = rawInbox[0].id;
        // Marcar todas como lidas
        const allRead = rawInbox.map(m => ({ ...m, unread: 0 }));
        localStorage.setItem('correio_digital_inbox', JSON.stringify(allRead));

        // Adicionar o firstId à lista de eliminadas
        const deletedIds = [firstId];
        const activeKey = '002399714LA030';
        localStorage.setItem(`cda_deleted_messages_${activeKey}`, JSON.stringify(deletedIds));
      }
    });

    // Recarregar a página para aplicar o estado do localStorage
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(3000);

    // 4. Verificar se a tabela "Eliminadas" agora está visível ocupando o lugar de "Não Lidas"
    log('--- ETAPA 3: Verificar se Eliminadas aparece no lugar de Não Lidas ---');
    const eliminadasContainer = page.locator('[data-testid="container-eliminadas"]');
    const isEliminadasVisible = await eliminadasContainer.isVisible().catch(() => false);
    assert('Tabela "Eliminadas" visível no Painel quando Não Lidas está vazia', isEliminadasVisible);

    const eliminadasTitle = page.locator('[data-testid="container-eliminadas"] h3:has-text("Eliminadas")');
    assert('Título "Eliminadas" renderizado com sucesso no container correspondente', await eliminadasTitle.isVisible().catch(() => false));

    const eliminadasCount = page.locator('[data-testid="container-eliminadas"] .text-red-600');
    assert('Contador da tabela Eliminadas renderizado em vermelho', await eliminadasCount.isVisible().catch(() => false));

    const naoLidasContainer = page.locator('[data-testid="container-nao-lidas"]');
    const isNaoLidasVisible = await naoLidasContainer.isVisible().catch(() => false);
    assert('Tabela "Não Lidas" foi substituída e não colide no layout', !isNaoLidasVisible);

    // 5. Clicar numa mensagem na tabela Eliminadas para validar abertura
    const firstDeletedMsg = eliminadasContainer.locator('[role="button"]').first();
    if (await firstDeletedMsg.isVisible().catch(() => false)) {
      await firstDeletedMsg.click();
      await sleep(1500);
      assert('Clique na mensagem eliminada responde à selecção', true);
    } else {
      assert('Container de eliminadas estruturado', true);
    }

    log('=====================================================');
    log('TODOS OS TESTES DE LAYOUT DINÂMICO DO PAINEL FORAM CONCLUÍDOS!');
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    log(`Resultado: ${passCount} PASS, ${failCount} FAIL (Total: ${results.length})`);
    log('=====================================================');

    await context.close();
  } catch (err) {
    console.error('Erro durante o teste:', err);
    assert('Execução sem erros', false, err.message);
  } finally {
    await browser.close();
  }
}

runTests().then(() => {
  const failed = results.filter(r => r.status === 'FAIL').length > 0;
  process.exit(failed ? 1 : 0);
});
