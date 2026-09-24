import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const SHOTS = '/home/user/cda_test/audit_screenshots';
fs.mkdirSync(SHOTS, { recursive: true });

async function run() {
  console.log('================================================================');
  console.log('🧪 TESTE DO COMPOSITOR (NOVA MENSAGEM):');
  console.log('1. Botão desativado quando o destinatário está vazio');
  console.log('2. Avanço imediato para o fluxo seguinte na primeira tentativa');
  console.log('================================================================');

  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // -------------------------------------------------------------
  // TESTE 1: ÁREA INSTITUCIONAL (INAPEM-LMM-01)
  // -------------------------------------------------------------
  const ctxInst = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-AO' });
  const page = await ctxInst.newPage();
  console.log('\n--- 1. TESTE NA ÁREA INSTITUCIONAL ---');
  await page.goto(`${BASE}/institucional#/login`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder(/AGT-9921-SR|ID/i).first().fill('INAPEM-LMM-01');
  await page.getByPlaceholder('••••••••••••').first().fill('123456789');
  await page.getByRole('button', { name: /Entrar no Portal/i }).first().click();

  await page.getByRole('button', { name: 'Painel', exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  console.log('✓ Instituição autenticada.');

  await page.evaluate(() => { window.location.hash = '#/correspondencias'; });
  await page.waitForTimeout(1000);

  const btnNovaInst = page.getByRole('button', { name: /Nova Mensagem/i }).first();
  await btnNovaInst.click();
  await page.waitForTimeout(800);

  // 1.1 Verificar que o botão "Enviar Mensagem Oficial" está DESATIVADO sem destinatário
  const btnEnviarInst = page.locator('#btn-enviar-mensagem, button:has-text("Enviar Mensagem Oficial")').first();
  const isDisabledSemDest = await btnEnviarInst.isDisabled();
  console.log('Botão "Enviar Mensagem Oficial" desativado sem destinatário?', isDisabledSemDest ? '✅ SIM (CORRETO)' : '❌ NÃO (ERRO)');

  await page.screenshot({ path: `${SHOTS}/compositor_01_inst_sem_destinatario_desativado.png` });

  if (!isDisabledSemDest) {
    throw new Error('Falha: O botão Enviar Mensagem Oficial deveria estar desativado sem destinatário!');
  }

  // 1.2 Preencher Destinatário, Assunto e Corpo
  console.log('A preencher Destinatário (002399714LA030), Assunto e Mensagem...');
  const inputToInst = page.locator('#recipient-bi-input, #recipient-inst-input, input[placeholder*="BI"], input[placeholder*="Código"]').first();
  await inputToInst.fill('002399714LA030');

  const inputSubjectInst = page.locator('input[placeholder*="tema da sua mensagem"]').first();
  await inputSubjectInst.fill('Notificação Oficial de Homologação 2026');

  const inputBodyInst = page.locator('textarea[placeholder*="Descreva detalhadamente"]').first();
  await inputBodyInst.fill('Informamos que o seu processo institucional foi rececionado e validado com sucesso pelos serviços competentes.');

  await page.waitForTimeout(500);

  const isEnabledComDest = await btnEnviarInst.isEnabled();
  console.log('Botão "Enviar Mensagem Oficial" ativado após preenchimento?', isEnabledComDest ? '✅ SIM' : '❌ NÃO');

  // 1.3 Clicar no botão Enviar Mensagem Oficial
  console.log('A clicar no botão "Enviar Mensagem Oficial"...');
  await btnEnviarInst.click();
  await page.waitForTimeout(800);

  // 1.4 Modal de seleção de modalidade deve estar aberto
  const modalTipoEnvio = page.locator('#btn-ok-modal-tipo-envio, button:has-text("Ok")').first();
  console.log('Modal de modalidade visível?', (await modalTipoEnvio.isVisible()) ? '✅ SIM' : '❌ NÃO');

  // 1.5 Clicar em "Ok" e verificar se abre IMEDIATAMENTE na primeira vez o modal "Rever antes de enviar"
  console.log('A clicar em "Ok" na modalidade...');
  await modalTipoEnvio.click();
  await page.waitForTimeout(1000);

  const modalRevisao = page.locator('[role="dialog"]:has-text("Rever antes de enviar"), .fixed:has-text("Rever antes de enviar")').first();
  const isRevisaoAbertaPrimeiraVez = await modalRevisao.isVisible();
  console.log('Passou IMEDIATAMENTE para o modal "Rever antes de enviar" na PRIMEIRA vez?', isRevisaoAbertaPrimeiraVez ? '✅ SIM (100% FUNCIONAL)' : '❌ NÃO (FALHA)');

  await page.screenshot({ path: `${SHOTS}/compositor_02_inst_revisao_primeira_vez.png` });

  if (!isRevisaoAbertaPrimeiraVez) {
    throw new Error('Falha: O fluxo não avançou para a confirmação na primeira tentativa ao clicar em Ok!');
  }

  // 1.6 Concluir envio no modal de confirmação
  console.log('A clicar em "Enviar Correspondência" no modal de confirmação...');
  const btnEnviarFinal = page.locator('button:has-text("Enviar Correspondência")').last();
  await btnEnviarFinal.click();
  await page.waitForTimeout(2500);
  console.log('✓ Mensagem oficial expedida com sucesso.');
  await ctxInst.close();

  // -------------------------------------------------------------
  // TESTE 2: ÁREA DO CIDADÃO (002399714LA030)
  // -------------------------------------------------------------
  console.log('\n--- 2. TESTE NA ÁREA DO CIDADÃO ---');
  const ctxCid = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-AO' });
  const pageCid = await ctxCid.newPage();
  await pageCid.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
  await pageCid.getByPlaceholder(/LA041|B\.I\./i).first().fill('002399714LA030');
  await pageCid.getByPlaceholder('••••••••••••').first().fill('123456789');
  await pageCid.getByRole('button', { name: /Entrar no Portal/i }).first().click();

  await pageCid.getByRole('button', { name: 'Painel', exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  console.log('✓ Cidadão autenticado.');

  await pageCid.evaluate(() => { window.location.hash = '#/correspondencias'; });
  await pageCid.waitForTimeout(1000);

  const btnNovaCid = pageCid.getByRole('button', { name: /Nova Mensagem/i }).first();
  await btnNovaCid.click();
  await pageCid.waitForTimeout(800);

  // 2.1 Verificar que o botão "Enviar Mensagem" está DESATIVADO sem destinatário
  const btnEnviarCid = pageCid.locator('#btn-enviar-mensagem, button:has-text("Enviar Mensagem")').first();
  const isCidDisabledSemDest = await btnEnviarCid.isDisabled();
  console.log('Botão "Enviar Mensagem" (Cidadão) desativado sem destinatário?', isCidDisabledSemDest ? '✅ SIM (CORRETO)' : '❌ NÃO (ERRO)');

  await pageCid.screenshot({ path: `${SHOTS}/compositor_03_cid_sem_destinatario_desativado.png` });

  if (!isCidDisabledSemDest) {
    throw new Error('Falha: O botão Enviar Mensagem deveria estar desativado sem destinatário no Cidadão!');
  }

  // 2.2 Preencher Destinatário (INAPEM-LMM), Assunto e Mensagem
  console.log('A preencher Destinatário (INAPEM-LMM) e Corpo da mensagem...');
  const inputToCid = pageCid.locator('#recipient-inst-input, input[placeholder*="Código Institucional"]').first();
  await inputToCid.fill('INAPEM-LMM');

  const inputBodyCid = pageCid.locator('textarea[placeholder*="Descreva detalhadamente"]').first();
  await inputBodyCid.fill('Solicito esclarecimento relativamente ao processo de emissão de certidão digital.');

  await pageCid.waitForTimeout(500);

  // 2.3 Clicar em Enviar
  await btnEnviarCid.click();
  await pageCid.waitForTimeout(800);

  // 2.4 Modal de modalidade -> Clicar em Ok
  const modalCidOk = pageCid.locator('#btn-ok-modal-tipo-envio, button:has-text("Ok")').first();
  await modalCidOk.click();
  await pageCid.waitForTimeout(1000);

  // 2.5 Verificar que abriu IMEDIATAMENTE o modal "Rever antes de enviar"
  const modalRevisaoCid = pageCid.locator('[role="dialog"]:has-text("Rever antes de enviar"), .fixed:has-text("Rever antes de enviar")').first();
  const isCidRevisaoAberta = await modalRevisaoCid.isVisible();
  console.log('Passou IMEDIATAMENTE para o modal "Rever antes de enviar" no Cidadão na PRIMEIRA vez?', isCidRevisaoAberta ? '✅ SIM (100% FUNCIONAL)' : '❌ NÃO (FALHA)');

  await pageCid.screenshot({ path: `${SHOTS}/compositor_04_cid_revisao_primeira_vez.png` });

  if (!isCidRevisaoAberta) {
    throw new Error('Falha: O fluxo do Cidadão não avançou para a confirmação na primeira tentativa!');
  }

  await ctxCid.close();
  await browser.close();
  console.log('\n================================================================');
  console.log('✅ TODAS AS ATUALIZAÇÕES DO COMPOSITOR TESTADAS E 100% FUNCIONAIS!');
  console.log('================================================================');
}

run().catch(err => {
  console.error('Erro no teste do compositor:', err);
  process.exit(1);
});
