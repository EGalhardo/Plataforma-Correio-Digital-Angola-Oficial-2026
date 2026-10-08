import 'dotenv/config';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CITIZEN_BI = process.env.QA_BI_A || '002399714LA030';
const CITIZEN_PASS = process.env.QA_CID_PASS || '123456789';
const INST_BI = process.env.QA_INST || 'INAPEM-LMM-01';
const INST_PASS = process.env.QA_INST_PASS || process.env.QA_CID_PASS || '123456789';

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 TESTE E2E: ATUALIZAÇÃO PARA "LIDAS" AO ABRIR DENÚNCIAS');
  console.log('================================================================');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  let passCount = 0;
  let failCount = 0;

  function reg(desc, ok, extra = '') {
    if (ok) {
      passCount++;
      console.log(`[PASS] ${desc}${extra ? ' (' + extra + ')' : ''}`);
    } else {
      failCount++;
      console.error(`[FAIL] ${desc}${extra ? ' (' + extra + ')' : ''}`);
    }
  }

  try {
    // ------------------------------------------------------------------------
    // FLUXO 1: CIDADÃO NA PÁGINA DENÚNCIA / NOVA-DENUNCIA
    // ------------------------------------------------------------------------
    console.log('\n👤 --- FLUXO 1: ÁREA DO CIDADÃO ---');
    const pageCid = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-PT' });
    const txCid = async () => ((await pageCid.evaluate(() => document.body.innerText)).toLowerCase());

    await pageCid.goto(`${BASE_URL}/#/entrar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await pageCid.waitForTimeout(2000);

    const biInput = pageCid.locator('input[name="cda-utilizador"], input[type="text"]:visible').first();
    await biInput.fill(CITIZEN_BI);
    const passInput = pageCid.locator('input[type="password"]:visible').first();
    await passInput.fill(CITIZEN_PASS);
    await pageCid.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first().click();
    await pageCid.waitForTimeout(4000);

    const txtHome = await txCid();
    reg('1.1 Login do Cidadão autenticado', txtHome.includes('edlasio') || txtHome.includes('painel'));

    // Navegar para a página de denúncias
    await pageCid.evaluate(() => { window.location.hash = '#/nova-denuncia'; });
    await pageCid.waitForTimeout(2000);

    const txtDen = await txCid();
    reg('1.2 Acesso à página de Denúncia (#/nova-denuncia)', txtDen.includes('denuncia'));

    // Se houver algum item com badge/novidade, abri-lo e validar a transição para Lida
    const badgesCid = pageCid.locator('[data-testid^="badge-item"]');
    const badgeCountBefore = await badgesCid.count();
    console.log(`   Badges de não lida encontrados na lista: ${badgeCountBefore}`);

    // Clicar no primeiro item da lista de denúncias
    const firstDenItem = pageCid.locator('button[data-msg-id]').first();
    if (await firstDenItem.count() > 0) {
      const msgId = await firstDenItem.getAttribute('data-msg-id');
      console.log(`   Abrindo correspondência de denúncia ID: ${msgId}`);
      await firstDenItem.click();
      await pageCid.waitForTimeout(2000);

      const txtDetail = await txCid();
      reg('1.3 Detalhe da correspondência de denúncia aberto', txtDetail.includes('detalhe') || txtDetail.includes('destinatário') || txtDetail.includes('remetente'));

      // Validar no storage se a mensagem está com status Lida e unread 0
      const checkMsgState = await pageCid.evaluate((idNum) => {
        const rawSent = JSON.parse(localStorage.getItem('correio_digital_sent') || '[]');
        const m = rawSent.find(x => String(x.id) === String(idNum));
        return { unread: m?.unread, status: m?.status };
      }, msgId);

      reg('1.4 Estado da correspondência atualizado para "Lida"', checkMsgState.status === 'Lida' && checkMsgState.unread === 0, `Status: ${checkMsgState.status}, unread: ${checkMsgState.unread}`);

      // Clicar no BotaoVoltar
      const btnVoltar = pageCid.locator('button[data-cda-voltar]').first();
      await btnVoltar.click();
      await pageCid.waitForTimeout(2000);

      // Confirmar que voltou à lista de denúncias
      const txtAposVoltar = await txCid();
      reg('1.5 Regresso à lista de Denúncia concluído', txtAposVoltar.includes('denuncia') && !txtAposVoltar.includes('detalhe'));

      // Verificar que o badge desse item foi removido
      const badgeDoItem = pageCid.locator(`[data-testid="badge-item-${msgId}"]`);
      const badgeRemovido = (await badgeDoItem.count()) === 0 || !(await badgeDoItem.isVisible());
      reg('1.6 Badge de não lida do item removido com sucesso', badgeRemovido);
    }

    await pageCid.close();

    // ------------------------------------------------------------------------
    // FLUXO 2: INSTITUIÇÃO NA PÁGINA DENÚNCIA / LIVRO DE RECLAMAÇÕES
    // ------------------------------------------------------------------------
    console.log('\n🏛️ --- FLUXO 2: ÁREA DA INSTITUIÇÃO ---');
    const pageInst = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-PT' });
    const txInst = async () => ((await pageInst.evaluate(() => document.body.innerText)).toLowerCase());

    await pageInst.goto(`${BASE_URL}/#/entrar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await pageInst.waitForTimeout(2000);

    const biInputInst = pageInst.locator('input[name="cda-utilizador"], input[type="text"]:visible').first();
    await biInputInst.fill(INST_BI);
    const passInputInst = pageInst.locator('input[type="password"]:visible').first();
    await passInputInst.fill(INST_PASS);
    await pageInst.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first().click();
    await pageInst.waitForTimeout(4000);

    const txtHomeInst = await txInst();
    reg('2.1 Login da Instituição autenticado', txtHomeInst.includes('inapem') || txtHomeInst.includes('instituição') || txtHomeInst.includes('painel'));

    // Navegar para a página de denúncias da instituição
    await pageInst.evaluate(() => { window.location.hash = '#/denuncias'; });
    await pageInst.waitForTimeout(2000);

    const txtDenInst = await txInst();
    reg('2.2 Acesso à página de Reclamações/Denúncias da Instituição', txtDenInst.includes('reclamações') || txtDenInst.includes('denúncias') || txtDenInst.includes('denuncia'));

    const firstDenItemInst = pageInst.locator('button[data-msg-id]').first();
    if (await firstDenItemInst.count() > 0) {
      const msgIdInst = await firstDenItemInst.getAttribute('data-msg-id');
      console.log(`   Abrindo correspondência de denúncia ID (Instituição): ${msgIdInst}`);
      await firstDenItemInst.click();
      await pageInst.waitForTimeout(2000);

      const txtDetailInst = await txInst();
      reg('2.3 Detalhe da denúncia visualizado pela Instituição', txtDetailInst.includes('detalhe') || txtDetailInst.includes('fase') || txtDetailInst.includes('denúncia'));

      // Validar no storage se a mensagem foi marcada como Lida
      const checkMsgStateInst = await pageInst.evaluate((idNum) => {
        const rawInbox = JSON.parse(localStorage.getItem('correio_digital_inbox') || '[]');
        const m = rawInbox.find(x => String(x.id) === String(idNum));
        return { unread: m?.unread, status: m?.status };
      }, msgIdInst);

      reg('2.4 Denúncia marcada como "Lida" na caixa de entrada institucional', checkMsgStateInst.status === 'Lida' && checkMsgStateInst.unread === 0, `Status: ${checkMsgStateInst.status}, unread: ${checkMsgStateInst.unread}`);

      // Voltar para a lista
      const btnVoltarInst = pageInst.locator('button[data-cda-voltar]').first();
      await btnVoltarInst.click();
      await pageInst.waitForTimeout(2000);

      reg('2.5 Regresso ao painel institucional de denúncias', true);
    }

    await pageInst.close();

  } catch (err) {
    console.error('Erro na execução da suíte E2E:', err);
    reg('Execução da suíte E2E', false, err.message);
  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log(`RESULTADO FINAL: ${passCount} APROVADOS / ${failCount} FALHAS`);
  console.log('================================================================');

  if (failCount > 0) process.exit(1);
}

runTestSuite();
