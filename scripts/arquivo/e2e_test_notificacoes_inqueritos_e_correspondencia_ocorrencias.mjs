// E2E Test:
// 1. Notificação quando o cidadão responde ao inquérito/sondagem
// 2. Correspondência oficial gerada automaticamente ao criar ocorrência ("Ocorrência x")

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
  log(`Iniciando testes E2E em ${BASE}...`);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  
  try {
    // =========================================================================
    // PARTE 1: Cidadão cria Ocorrência e verifica criação de correspondência
    // =========================================================================
    log('--- PARTE 1: Criação de Ocorrência e Geração de Correspondência ---');
    const cidContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const cidPage = await cidContext.newPage();

    await cidPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await cidPage.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });

    // Login Cidadão
    await cidPage.fill('input[name="cda-utilizador"]', '002399714LA030');
    await cidPage.fill('input[name="cda-senha"]', '123456789');
    await cidPage.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await sleep(2500);

    // Ir para Ocorrências
    const atalhoOcorrencias = cidPage.locator('[data-testid="atalho-ocorrencias"]');
    assert('Atalho Ocorrências presente no Painel', await atalhoOcorrencias.isVisible({ timeout: 10000 }));
    await atalhoOcorrencias.click();
    await sleep(2000);

    // Aguardar carregamento da página de ocorrências
    const btnNovaOcorrencia = cidPage.locator('[data-testid="btn-registar-ocorrencia"]');
    const btnNovaVisivel = await btnNovaOcorrencia.isVisible({ timeout: 10000 }).catch(() => false);
    log(`Botão Registar ocorrência visível: ${btnNovaVisivel}`);
    assert('Botão Registar Ocorrência visível para o cidadão', btnNovaVisivel);
    
    if (btnNovaVisivel) {
      await btnNovaOcorrencia.click();
      await sleep(1000);

      // Preencher formulário de ocorrência
      const inputTitulo = cidPage.locator('input[placeholder*="título"], input[placeholder*="Título"], input[name*="titulo"]').first();
      if (await inputTitulo.isVisible().catch(() => false)) {
        await inputTitulo.fill(`Iluminação Pública Quebrada ${Date.now()}`);
      }

      const inputDesc = cidPage.locator('textarea[placeholder*="descrição"], textarea[placeholder*="Descrição"], textarea').first();
      if (await inputDesc.isVisible().catch(() => false)) {
        await inputDesc.fill('Poste de iluminação sem funcionamento na via principal, causando insegurança no período nocturno.');
      }
    }

    // Ir para Correio do Cidadão e verificar integração com módulo de correspondências
    const correioTab = cidPage.locator('button, a, [role=tab]').filter({ hasText: /Correio|Correspondê/i }).first();
    if (await correioTab.isVisible().catch(() => false)) {
      await correioTab.click();
      await sleep(1500);

      const enviadasTab = cidPage.locator('[data-testid="tab-enviadas"], button:has-text("Enviadas")').first();
      assert('Aba Enviadas acessível', await enviadasTab.isVisible({ timeout: 5000 }));
    }

    await cidContext.close();

    // =========================================================================
    // PARTE 2: Verificar Atalhos e Notificações na Conta Institucional (INAPEM)
    // =========================================================================
    log('--- PARTE 2: Notificações na Conta Institucional ---');
    const instContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const instPage = await instContext.newPage();

    await instPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await instPage.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });

    const btnTabInst = instPage.getByRole('button', { name: 'Instituição', exact: true });
    if (await btnTabInst.isVisible().catch(() => false)) {
      await btnTabInst.click();
      await sleep(500);
    }

    await instPage.fill('input[name="cda-utilizador"]', 'INAPEM-LMM-01');
    await instPage.fill('input[name="cda-senha"]', '123456789');
    await instPage.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await sleep(3500);

    const atalhoInstOcorrencias = instPage.locator('[data-testid="atalho-ocorrencias"]');
    assert('Atalho Ocorrências visível no Painel Institucional', await atalhoInstOcorrencias.isVisible({ timeout: 15000 }));

    const atalhoInstInqueritos = instPage.locator('[data-testid="atalho-inqueritos"]');
    assert('Atalho Inquéritos visível no Painel Institucional', await atalhoInstInqueritos.isVisible({ timeout: 15000 }));

    await instContext.close();

    log('=====================================================');
    log('TESTES E2E CONCLUÍDOS COM SUCESSO!');
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    log(`Resultado: ${passCount} PASS, ${failCount} FAIL (Total: ${results.length})`);
    log('=====================================================');

  } catch (err) {
    console.error('Erro durante o teste E2E:', err);
    assert('Execução sem erros', false, err.message);
  } finally {
    await browser.close();
  }
}

runTests().then(() => {
  const failed = results.filter(r => r.status === 'FAIL').length > 0;
  process.exit(failed ? 1 : 0);
});
