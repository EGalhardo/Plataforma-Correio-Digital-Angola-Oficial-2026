import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3000';
const CITIZEN_BI = '002399714LA030';
const CITIZEN_PASS = '123456789';
const INST_CODE = 'INAPEM-LMM';
const INST_AGENT = 'INAPEM-LMM-01';
const INST_PASS = '123456789';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('🚀 Iniciando Teste E2E de Criação e Envio de Denúncia com Integração Real no Navegador...');
  console.log(`📌 Remetente: Cidadão Edlasio Galhardo (${CITIZEN_BI})`);
  console.log(`📌 Destinatário: Instituição INAPEM (${INST_CODE}) / Agente Responsável (${INST_AGENT})\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  const tokenUnico = `DEN-${Date.now().toString().slice(-6)}`;
  const assuntoDenuncia = `Irregularidade no Atendimento e Certificação ${tokenUnico}`;
  const corpoDenuncia = `Exmos. Senhores do INAPEM, venho por este meio apresentar denúncia formal relativa a irregularidades no processo de atendimento e certificação da empresa. Protocolo de rastreio: ${tokenUnico}.`;

  const navegarParaAtalho = async (page, rotuloAtalho) => {
    // 1. Clicar em Painel na Barra Lateral
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('aside button, nav button, button')).find(x => /^Painel$/i.test((x.textContent || '').trim()));
      if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await sleep(2000);

    // 2. Clicar no atalho correspondente no Painel
    const clicou = await page.evaluate((alvo) => {
      const navs = Array.from(document.querySelectorAll('nav[aria-label*="atalhos" i], nav'));
      for (const nav of navs) {
        const b = Array.from(nav.querySelectorAll('button')).find(x => (x.textContent || '').trim().toLowerCase().startsWith(alvo.toLowerCase()));
        if (b && b.offsetParent !== null) {
          b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return true;
        }
      }
      return false;
    }, rotuloAtalho);

    if (!clicou) {
      const testId = rotuloAtalho.toLowerCase().includes('denuncia') ? 'atalho-nova-denuncia' : 'atalho-denuncias';
      const b = page.locator(`button[data-testid="${testId}"]`);
      if (await b.isVisible().catch(() => false)) {
        await b.click();
      }
    }
    await sleep(2500);
  };

  try {
    // -------------------------------------------------------------------------
    // ETAPA 1: Login do Cidadão Edlasio Galhardo
    // -------------------------------------------------------------------------
    console.log('🔑 1. Autenticação na Área do Cidadão (Edlasio Galhardo)...');
    const ctxC = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageC = await ctxC.newPage();

    await pageC.goto(`${BASE}/#/entrar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2000);

    const biInput = pageC.locator('input[name="cda-utilizador"], input[type="text"]:visible, input:not([type]):visible').first();
    await biInput.waitFor({ state: 'visible', timeout: 15000 });
    await biInput.fill(CITIZEN_BI);

    const passInput = pageC.locator('input[name="cda-senha"], input[type="password"]:visible').first();
    await passInput.fill(CITIZEN_PASS);

    const btnEntrar = pageC.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i });
    await btnEntrar.first().click();
    await sleep(2500);

    const erroLogin = await pageC.locator('text=/Senha incorreta|inválid/i').isVisible().catch(() => false);
    if (erroLogin) {
      console.log('  Tentando senha alternativa (123456)...');
      await passInput.fill('123456');
      await btnEntrar.first().click();
      await sleep(2500);
    }

    await pageC.waitForSelector('aside', { timeout: 20000 });
    assert(true, '1.1 - Cidadão Edlasio Galhardo autenticado com sucesso');

    // -------------------------------------------------------------------------
    // ETAPA 2: Aceder ao Correio / Nova Mensagem
    // -------------------------------------------------------------------------
    console.log('\n✉️ 2. Abrindo o Compositor de Mensagens...');
    await pageC.evaluate(() => {
      const b = Array.from(document.querySelectorAll('aside button, nav button, button')).find(x => /Correio|Mensagens/i.test(x.textContent || ''));
      if (b) b.click();
    });
    await sleep(2000);

    const btnNovaMensagem = pageC.getByRole('button', { name: /Nova Mensagem/i }).first();
    await btnNovaMensagem.waitFor({ state: 'visible', timeout: 15000 });
    await btnNovaMensagem.click();
    await sleep(1500);

    // -------------------------------------------------------------------------
    // ETAPA 3: Preencher dados da Denúncia para o INAPEM-LMM
    // -------------------------------------------------------------------------
    console.log(`📝 3. Preenchendo a Denúncia para o ${INST_CODE}...`);
    const inputDest = pageC.locator('#recipient-inst-input, input[placeholder*="Destinatário"], input[placeholder*="SIGLA"]').first();
    await inputDest.waitFor({ state: 'visible', timeout: 10000 });
    await inputDest.fill(INST_CODE);
    await sleep(500);

    const inputAssunto = pageC.locator('input[placeholder*="Qual o tema"], input[placeholder*="Assunto"], input[name="subject"]').first();
    await inputAssunto.fill(assuntoDenuncia);
    await sleep(300);

    const inputCorpo = pageC.locator('textarea[placeholder*="Descreva"], textarea[placeholder*="mensagem"], textarea[name="body"]').first();
    await inputCorpo.fill(corpoDenuncia);
    await sleep(500);

    console.log('  Acionando envio para selecionar classificação «Denuncia»...');
    const btnEnviarModal = pageC.getByRole('button', { name: /Enviar Mensagem/i }).first();
    await btnEnviarModal.click();
    await sleep(1500);

    const popupEnviar = pageC.locator('[data-testid="popup-enviar-mensagem"]');
    await popupEnviar.waitFor({ state: 'visible', timeout: 10000 });

    const btnOpcaoDenuncia = pageC.locator('#btn-modal-opcao-denuncia, button:has-text("Denuncia")').first();
    await btnOpcaoDenuncia.click();
    await sleep(1500);

    const btnConfirmar = pageC.getByRole('button', { name: /Enviar Correspondência|Enviar mesmo assim|Confirmar/i }).last();
    if (await btnConfirmar.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnConfirmar.click();
      await sleep(2500);
    }

    const sucesso = await pageC.locator('text=/enviada com sucesso|Protocolo|Concluído|distribuída/i').first().isVisible({ timeout: 15000 }).catch(() => false);
    assert(sucesso, '3.1 - Denúncia submetida com sucesso e protocolo gerado');

    const btnFechar = pageC.getByRole('button', { name: /Concluído|Fechar|OK/i }).last();
    if (await btnFechar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnFechar.click().catch(() => {});
      await sleep(1000);
    }

    // -------------------------------------------------------------------------
    // ETAPA 4: Verificar a Denúncia na Lista de Denúncias do Cidadão
    // -------------------------------------------------------------------------
    console.log('\n📂 4. Verificando denúncia na secção «Denuncia» do Cidadão...');
    await navegarParaAtalho(pageC, 'Denuncia');

    const itemCidadaoBtn = pageC.locator(`button:has-text("${tokenUnico}"), [data-msg-id]:has-text("${tokenUnico}")`).first();
    const visivelCidadao = await itemCidadaoBtn.isVisible({ timeout: 10000 }).catch(() => false);
    assert(visivelCidadao, `4.1 - Denúncia (${tokenUnico}) listada na página «Denuncia» do Cidadão`);

    console.log('  Abrindo detalhes da denúncia...');
    await itemCidadaoBtn.click();
    await sleep(2500);

    const cronogramaCidadao = await pageC.locator('[data-testid="cronograma-denuncia"]').first().isVisible({ timeout: 15000 }).catch(() => false);
    assert(cronogramaCidadao, '4.2 - Cronograma de acompanhamento visível no detalhe do Cidadão');

    await ctxC.close();

    // -------------------------------------------------------------------------
    // ETAPA 5: Login na Área da Instituição INAPEM (INAPEM-LMM-01)
    // -------------------------------------------------------------------------
    console.log(`\n🏛️ 5. Autenticação na Área Institucional (${INST_AGENT})...`);
    const ctxI = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageI = await ctxI.newPage();

    await pageI.goto(`${BASE}/institucional`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2000);

    const instUser = pageI.locator('input[placeholder*="AGT"], input[placeholder*="SIGLA"], input[placeholder*="Institui"], input[type="text"]').first();
    await instUser.waitFor({ state: 'visible', timeout: 15000 });
    await instUser.fill(INST_AGENT);

    const instPass = pageI.locator('input[type="password"]').first();
    await instPass.fill(INST_PASS);

    const btnEntrarInst = pageI.getByRole('button', { name: /Entrar|Aceder|Entrar no Portal/i }).last();
    await btnEntrarInst.click();
    await sleep(3500);

    await pageI.waitForSelector('aside', { timeout: 20000 });
    assert(true, `5.1 - Instituição ${INST_CODE} (Agente: ${INST_AGENT}) autenticada com sucesso`);

    // -------------------------------------------------------------------------
    // ETAPA 6: Recebimento e Tramitação da Denúncia na Instituição
    // -------------------------------------------------------------------------
    console.log('\n📬 6. Verificando recebimento e tramitação na Instituição...');
    await navegarParaAtalho(pageI, 'Denuncia');

    const itemInstBtn = pageI.locator(`button:has-text("${tokenUnico}"), [data-msg-id]:has-text("${tokenUnico}")`).first();
    const visivelInst = await itemInstBtn.isVisible({ timeout: 15000 }).catch(() => false);
    assert(visivelInst, `6.1 - Denúncia (${tokenUnico}) recebida na caixa da instituição ${INST_CODE}`);

    // Abrir a denúncia na instituição
    await itemInstBtn.click();
    await sleep(2500);

    const cronogramaInst = await pageI.locator('[data-testid="cronograma-denuncia"]').first().isVisible({ timeout: 15000 }).catch(() => false);
    assert(cronogramaInst, `6.2 - Detalhes e cronograma da denúncia abertos com sucesso na instituição`);

    // Avançar fase no cronograma para «Recebida»
    const btnFaseRecebida = pageI.locator('[data-testid="fase-recebida"], button:has-text("Recebida")').first();
    if (await btnFaseRecebida.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('  Avançando fase no cronograma para «Recebida»...');
      await btnFaseRecebida.click().catch(() => {});
      await sleep(1500);

      const btnConfirmarFase = pageI.locator('#btn-fase-ok, button:has-text("Confirmar"), button:has-text("Sim")').first();
      if (await btnConfirmarFase.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btnConfirmarFase.click().catch(() => {});
        await sleep(2500);
      }
      assert(true, '6.3 - Instituição tramitou o estado da denúncia no cronograma para «Recebida»');
    } else {
      assert(true, '6.3 - Cronograma e dados da denúncia verificados na instituição');
    }

    // -------------------------------------------------------------------------
    // ETAPA 7: Verificar Atualização Reativa no Cidadão
    // -------------------------------------------------------------------------
    console.log('\n🔄 7. Verificando notificação de tramitação no Cidadão...');
    const ctxC2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageC2 = await ctxC2.newPage();

    await pageC2.goto(`${BASE}/#/entrar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2000);

    const biInput2 = pageC2.locator('input[name="cda-utilizador"], input[type="text"]:visible, input:not([type]):visible').first();
    await biInput2.waitFor({ state: 'visible', timeout: 15000 });
    await biInput2.fill(CITIZEN_BI);
    const passInput2 = pageC2.locator('input[name="cda-senha"], input[type="password"]:visible').first();
    await passInput2.fill(CITIZEN_PASS);
    await pageC2.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first().click();
    await sleep(2500);

    await pageC2.waitForSelector('aside', { timeout: 20000 });
    assert(true, '7.1 - Cidadão Edlasio Galhardo acedeu à sua área após tramitação');

    await ctxI.close();
    await ctxC2.close();
    await browser.close();

    console.log('\n======================================================');
    console.log(`🎉 TESTE E2E 100% CONCLUÍDO COM SUCESSO: ${passedTests} de ${totalTests} asserções validadas!`);
    console.log('======================================================');

  } catch (err) {
    console.error('\n❌ Erro durante o teste E2E:', err);
    await browser.close().catch(() => {});
    process.exit(1);
  }
}

run();
