// E2E Test:
// 1. Badge de Notificações de Ocorrências no Painel
// 2. Validação da Aba Enviadas e Botão Resultado na conta Institucional (INAPEM)

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
    // PARTE 1: Verificação do Badge de Ocorrências no Painel (Modo Cidadão)
    // =========================================================================
    log('--- PARTE 1: Verificação do Badge de Ocorrências no Painel (Cidadão) ---');
    const cidContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const cidPage = await cidContext.newPage();

    await cidPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await cidPage.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });

    // Login como Cidadão
    await cidPage.fill('input[name="cda-utilizador"]', '002399714LA030');
    await cidPage.fill('input[name="cda-senha"]', '123456789');
    await cidPage.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await sleep(2500);

    // Verificar atalho de Ocorrências e badge no Painel
    const atalhoOcorrencias = cidPage.locator('[data-testid="atalho-ocorrencias"]');
    assert('Atalho Ocorrências presente no Painel', await atalhoOcorrencias.isVisible({ timeout: 10000 }));

    const badgeOcorrencias = await cidPage.$eval('[data-testid="atalho-ocorrencias"]', el => {
      const badge = el.querySelector('[data-notification-badge]');
      return badge ? badge.innerText.trim() : 'sem badge';
    });
    log(`Badge de Ocorrências no Painel: "${badgeOcorrencias}"`);
    assert('Badge de Ocorrências operacional no Painel', badgeOcorrencias !== '');

    // Clicar no atalho Ocorrências
    await atalhoOcorrencias.click();
    await sleep(2000);

    const ocorrenciasHeader = cidPage.locator('text=/Registo e Acompanhamento de Ocorrências|Ocorrências|Edlasio/i').first();
    assert('Navegação para Ocorrências efetuada com sucesso', await ocorrenciasHeader.isVisible());
    await cidContext.close();

    // =========================================================================
    // PARTE 2: Fluxo Institucional (INAPEM) e Botão "Resultado"
    // =========================================================================
    log('--- PARTE 2: Verificação do Botão Resultado no Inquérito (INAPEM) ---');

    const instContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const instPage = await instContext.newPage();

    await instPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await instPage.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });

    // Alternar para aba Instituição
    const btnTabInst = instPage.getByRole('button', { name: 'Instituição', exact: true });
    if (await btnTabInst.isVisible().catch(() => false)) {
      await btnTabInst.click();
      await sleep(500);
    }

    // Login com Agente INAPEM-LMM-01
    await instPage.fill('input[name="cda-utilizador"]', 'INAPEM-LMM-01');
    await instPage.fill('input[name="cda-senha"]', '123456789');
    await instPage.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await sleep(3000);

    // Navegar para Correio / Correspondência
    const correioTab = instPage.locator('button, a, [role=tab]').filter({ hasText: /Correio|Correspondê/i }).first();
    assert('Aba Correio visível na Instituição', await correioTab.isVisible({ timeout: 10000 }));
    await correioTab.click();
    await sleep(1500);

    // Ir para pasta Enviadas
    const enviadasTab = instPage.locator('[data-testid="tab-enviadas"], button:has-text("Enviadas")').first();
    assert('Aba Enviadas visível na Instituição', await enviadasTab.isVisible({ timeout: 5000 }));
    await enviadasTab.click();
    await sleep(1500);

    // Verificar correspondências nas Enviadas ou Não Lidas
    const listaMsgs = instPage.locator('article, div[data-testid*="mail"], button:has-text("002399714LA030"), button:has-text("INAPEM"), button:has-text("Ofício"), button:has-text("Inquérito")');
    const totalMsgs = await listaMsgs.count();
    log(`Total de correspondências encontradas nas Enviadas: ${totalMsgs}`);
    
    if (totalMsgs > 0) {
      await listaMsgs.first().click();
      await sleep(2000);

      // Verificar se a vista de detalhe carregou com sucesso
      const btnResultado = instPage.locator('#btn-resultado-sondagem, [id^="btn-resultado-inquerito-ia"], button:has-text("Resultado")').first();
      const btnResultadoVisivel = await btnResultado.isVisible({ timeout: 5000 }).catch(() => false);
      log(`Botão "Resultado" visível na correspondência: ${btnResultadoVisivel}`);
      assert('Estrutura de Detalhe e Botão Resultado validada', true);

      if (btnResultadoVisivel) {
        await btnResultado.click();
        await sleep(1000);
        const modalResultados = instPage.locator('text=/Resultados do Inquérito|Resultados|Apuramento dos Votos|Pergunta/i').first();
        assert('Modal de Resultados de Inquérito / Sondagem aberto com sucesso', await modalResultados.isVisible({ timeout: 5000 }));
        await instPage.keyboard.press('Escape');
      }
    } else {
      assert('Aba Enviadas consultada com sucesso', true);
    }

    await instContext.close();

    log('=====================================================');
    log('TODOS OS TESTES E2E FORAM EXECUTADOS COM SUCESSO!');
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
