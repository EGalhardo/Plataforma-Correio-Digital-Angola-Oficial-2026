#!/usr/bin/env node
// ============================================================================
// e2e_ocorrencias_integracao_e_eliminacao.mjs
// Homologação:
// 1. Envio de ocorrência pelo cidadão + Notificação & Correspondência na Instituição
// 2. Botão «Ver Ocorrência» na correspondência com navegação direta (deep link)
// 3. Eliminação de Ocorrências 100% Funcional (com confirmação e persistência)
// ============================================================================
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const CID_BI = '009874562LA041';
const CID_PASS = '123456';
const SHOTS = process.env.SHOTS_DIR || '/home/user/e2e_ocorrencias_shots';
fs.mkdirSync(SHOTS, { recursive: true });

let FAILS = 0;
const reg = (nome, ok, detalhe = '') => {
  if (!ok) FAILS++;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-PT' });
const tx = async () => ((await page.evaluate(() => document.body.innerText)).toLowerCase());

try {
  console.log('\n--- 1. AUTENTICAÇÃO COMO CIDADÃO E ENVIO DE OCORRÊNCIA ---');
  await page.goto(`${BASE}/#/entrar`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('input[name="cda-utilizador"], input[type="text"]:visible, input:not([type]):visible').first().fill(CID_BI);
  await page.locator('input[name="cda-senha"], input[type="password"]:visible').first().fill(CID_PASS);
  await page.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first().click();
  await page.waitForTimeout(3000);

  const txtLogin = await tx();
  reg('1.1 - Login do Cidadão com Sucesso', txtLogin.includes('edlásio') || txtLogin.includes('edlasio'));

  // Navegar para Ocorrências
  console.log('[passo] Abrindo Módulo de Ocorrências...');
  const atalhoOco = page.locator('[data-testid="atalho-ocorrencias"]');
  if (await atalhoOco.isVisible()) {
    await atalhoOco.click();
  } else {
    await page.evaluate(() => { window.location.hash = '#/ocorrencias'; });
  }
  await page.waitForTimeout(2500);

  const txtOco = await tx();
  reg('1.2 - Página de Ocorrências Locais Aberta', txtOco.includes('ocorrências locais') || txtOco.includes('registar ocorrência'));

  // Clicar em Registar ocorrência
  console.log('[passo] Abrindo formulário de nova ocorrência...');
  const btnRegistar = page.getByRole('button', { name: /Registar ocorrência/i }).first();
  await btnRegistar.click();
  await page.waitForTimeout(1500);

  // Preencher formulário
  const testTitle = `Iluminação Inoperacional na Marginal ${Date.now() % 10000}`;
  console.log(`[passo] Preenchendo dados da ocorrência: "${testTitle}"...`);
  
  // Categoria
  await page.locator('label').filter({ hasText: /^Categoria/ }).locator('select').selectOption({ label: 'Iluminação pública' });
  // Título
  await page.locator('label').filter({ hasText: /^Título/ }).locator('input').fill(testTitle);
  // Descrição
  await page.locator('label').filter({ hasText: /^Descrição/ }).locator('textarea').fill('Poste de iluminação avariado na marginal há mais de 48 horas.');
  // Província
  await page.locator('label').filter({ hasText: /^Província/ }).locator('select').selectOption({ label: 'Luanda' });
  await page.waitForTimeout(400);
  // Município
  await page.locator('label').filter({ hasText: /^Município/ }).locator('select').selectOption({ label: 'Luanda' });
  // Bairro
  await page.locator('label').filter({ hasText: /^Bairro/ }).locator('input').fill('Ingombota');
  // Referência
  await page.locator('label').filter({ hasText: /^Rua/ }).locator('input').fill('Avenida 4 de Fevereiro');
  // Código institucional
  await page.locator('label').filter({ hasText: /^Código institucional/ }).locator('input').fill('AGT');

  // Clicar Rever ocorrência
  console.log('[passo] Clicando em Rever ocorrência...');
  await page.getByRole('button', { name: /Rever ocorrência/i }).click();
  await page.waitForTimeout(1500);

  // Confirmar checkbox
  await page.locator('input[type="checkbox"]').check();
  await page.waitForTimeout(400);

  // Enviar ocorrência
  console.log('[passo] Enviando ocorrência oficial...');
  await page.getByRole('button', { name: /Enviar ocorrência/i }).click();
  await page.waitForTimeout(3500);

  const txtAposEnvio = await tx();
  reg('1.3 - Ocorrência Submetida com Sucesso', txtAposEnvio.includes('submetida') || txtAposEnvio.includes('oc-'));

  await page.screenshot({ path: `${SHOTS}/01_cidadao_ocorrencia_submetida.png`, fullPage: false });

  console.log('\n--- 2. VERIFICAÇÃO NA ÁREA DA CORRESPONDÊNCIA / MENSAGEM ---');
  // Navegar para Correio -> Enviadas
  await page.locator('aside button').filter({ hasText: /Correio/i }).first().click();
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: /ENVIADAS/i }).click();
  await page.waitForTimeout(2000);

  // Abrir a correspondência da ocorrência enviada
  const btnAbrirMsg = page.locator('button[data-acao="abrir"]').first();
  await btnAbrirMsg.click();
  await page.waitForTimeout(2500);

  const txtMensagem = await tx();
  reg('2.1 - Detalhe da Mensagem de Ocorrência Aberto', txtMensagem.includes('ocorrência') || txtMensagem.includes('registo oficial de ocorrência'));

  // Verificar existência do banner e botões «Ver Ocorrência»
  const btnVerOcorrenciaDestaque = page.locator('[data-testid="btn-ver-ocorrencia-destaque"]');
  const btnVerOcorrenciaMensagem = page.locator('[data-testid="btn-ver-ocorrencia-mensagem"]');
  const temBotaoVer = (await btnVerOcorrenciaDestaque.count() > 0) || (await btnVerOcorrenciaMensagem.count() > 0);
  
  reg('2.2 - Botão «Ver Ocorrência» presente na Correspondência', temBotaoVer);

  await page.screenshot({ path: `${SHOTS}/02_mensagem_com_botao_ver_ocorrencia.png`, fullPage: false });

  // Clicar no botão «Ver Ocorrência» e validar deep linking
  console.log('[passo] Clicando no botão «Ver Ocorrência»...');
  if (await btnVerOcorrenciaDestaque.isVisible()) {
    await btnVerOcorrenciaDestaque.click();
  } else if (await btnVerOcorrenciaMensagem.isVisible()) {
    await btnVerOcorrenciaMensagem.click();
  }
  await page.waitForTimeout(3000);

  const txtAposDeepLink = await tx();
  reg('2.3 - Redirecionamento Imediato para a Página de Ocorrências', txtAposDeepLink.includes('ocorrências locais') || txtAposDeepLink.includes('detalhes') || txtAposDeepLink.includes('oc-'));

  console.log('\n--- 3. TESTE DE ELIMINAÇÃO DE OCORRÊNCIAS (100% FUNCIONAL) ---');
  // Clicar no botão Eliminar
  const btnEliminarDetalhe = page.locator('[data-testid="btn-eliminar-ocorrencia-detalhe"]');
  const btnEliminarLista = page.locator('[data-testid="btn-eliminar-ocorrencia-lista"], [data-testid="btn-eliminar-ocorrencia-card"]').first();

  if (await btnEliminarDetalhe.isVisible()) {
    console.log('[passo] Clicando no botão Eliminar no Detalhe...');
    await btnEliminarDetalhe.click();
  } else if (await btnEliminarLista.isVisible()) {
    console.log('[passo] Clicando no botão Eliminar na Lista...');
    await btnEliminarLista.click();
  }

  await page.waitForTimeout(1500);

  // Verificar diálogo modal de confirmação
  const dialogEliminar = page.locator('div[role="dialog"]');
  const btnConfirmar = page.locator('[data-testid="btn-confirmar-eliminar-ocorrencia"]');
  reg('3.1 - Modal de Confirmação de Eliminação Exibido', await dialogEliminar.isVisible() && await btnConfirmar.isVisible());

  await page.screenshot({ path: `${SHOTS}/03_modal_confirmar_eliminar.png`, fullPage: false });

  // Confirmar eliminação
  console.log('[passo] Confirmando eliminação da ocorrência...');
  await btnConfirmar.click();
  await page.waitForTimeout(3000);

  const txtAposEliminar = await tx();
  reg('3.2 - Alerta de Sucesso na Eliminação Exibido', txtAposEliminar.includes('eliminada com sucesso') || !txtAposEliminar.includes(testTitle.toLowerCase()));

  // Clicar em Actualizar e verificar que a ocorrência eliminada não reaparece
  console.log('[passo] Clicando em Actualizar lista...');
  const btnActualizar = page.getByRole('button', { name: /Actualizar/i }).first();
  if (await btnActualizar.isVisible()) {
    await btnActualizar.click();
    await page.waitForTimeout(2500);
  }

  const txtListaActualizada = await tx();
  const naoContemEliminada = !txtListaActualizada.includes(testTitle.toLowerCase());
  reg('3.3 - Persistência Estrita: Ocorrência Eliminada NÃO reaparece na lista', naoContemEliminada);

  await page.screenshot({ path: `${SHOTS}/04_lista_apos_eliminacao_sucesso.png`, fullPage: false });

} catch (err) {
  console.error('[ERRO FATAL]', err);
  FAILS++;
} finally {
  await browser.close();
}

console.log('\n========================================');
console.log(`FALHAS TOTAIS: ${FAILS}`);
console.log('========================================');
process.exit(FAILS > 0 ? 1 : 0);
