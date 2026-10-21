#!/usr/bin/env node
// ============================================================================
// e2e_ocorrencias_cronograma_e_fotos.mjs
// Validação E2E: Exibição de Imagens e Atualização de Cronograma em Ocorrências
// (Área Institucional e Área do Cidadão)
// ============================================================================
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const INST_USER = 'AGT-9921-SR';
const INST_PASS = '000000';
const CID_USER = '009874562LA041';
const CID_PASS = '123456';

let FAILS = 0;
const reg = (nome, ok, detalhe = '') => {
  if (!ok) FAILS++;
  console.log(`  ${ok ? '✅' : '❌'} [${ok ? 'PASS' : 'FAIL'}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};

console.log('🚀 Iniciando Bateria E2E: Ocorrências — Imagens e Atualização de Cronograma...\n');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-PT' });

try {
  // --------------------------------------------------------------------------
  // TESTE 1: ÁREA DA INSTITUIÇÃO — OCORRÊNCIAS, IMAGENS E CRONOGRAMA
  // --------------------------------------------------------------------------
  console.log('🏛️ --- TESTE 1: ÁREA INSTITUCIONAL ---');
  await page.goto(`${BASE}/institucional#/entrar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  // Login Institucional
  await page.locator('input[type="text"]:visible, input:not([type]):visible').first().fill(INST_USER);
  await page.locator('input[type="password"]:visible').first().fill(INST_PASS);
  await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
  await page.waitForTimeout(2500);

  // Navegar para Ocorrências no Painel da Instituição
  console.log('  1.1: Acedendo à página Ocorrências na Instituição...');
  const btnOcoInst = page.locator('button, a').filter({ hasText: /Ocorrências|Ocorrências recebidas/i }).first();
  await btnOcoInst.click();
  await page.waitForTimeout(2000);

  // Verificar se há ocorrências na lista e se exibem imagens
  const listPhotosCount = await page.locator('img[src*="http"], img[src*="data:"]').count();
  console.log(`  ℹ️ Imagens de capa encontradas na lista: ${listPhotosCount}`);
  reg('1.1 - Imagens de capa visíveis na lista de ocorrências', listPhotosCount > 0);

  // Abrir o primeiro item de ocorrência
  console.log('  1.2: Abrindo detalhes da ocorrência na Instituição...');
  const firstCard = page.locator('table tbody tr button:has-text("Ver"), button:has-text("Ver detalhes")').first();
  await firstCard.click();
  await page.waitForTimeout(2000);

  // Verificar se a imagem da ocorrência aparece no detalhe institucional ("Tratar ocorrência")
  const detailImgCount = await page.locator('img[alt*="fotografia"], img[alt*="jpg"], img[alt*="iluminacao"], img[alt*="tubagem"], img[src*="http"], img[src*="data:"]').count();
  console.log(`  ℹ️ Imagens visíveis no detalhe da ocorrência: ${detailImgCount}`);
  reg('1.2 - Imagem da ocorrência visível no detalhe institucional', detailImgCount > 0);

  // Verificar presença do cronograma / acompanhamento
  const timelineExists = await page.locator('ol li, button[title*="Mudar estado"]').count();
  console.log(`  ℹ️ Passos do cronograma encontrados: ${timelineExists}`);
  reg('1.3 - Cronograma de acompanhamento renderizado', timelineExists > 0);

  // Testar atualização do cronograma por clique no ponto do cronograma
  console.log('  1.4: Testando actualização do cronograma por clique na timeline...');
  const timelinePoint = page.locator('div:has-text("Acompanhamento") ol button').filter({ hasText: /Recebida|Em análise|Em resolução|Resolvida/i }).first();
  if (await timelinePoint.isVisible()) {
    await timelinePoint.click();
    await page.waitForTimeout(1000);

    const modalDialog = page.getByRole('dialog').filter({ hasText: /Actualizar estado/i }).first();
    const modalVisible = await modalDialog.isVisible();
    reg('1.4a - Modal de confirmação do cronograma aberto com sucesso', modalVisible);

    if (modalVisible) {
      // Se tiver textarea para justificativa, preenche
      const noteInput = modalDialog.locator('textarea').first();
      if (await noteInput.isVisible()) {
        await noteInput.fill('Análise técnica iniciada pela equipa de fiscalização.');
      }
      const btnConfirmar = modalDialog.getByRole('button', { name: /Confirmar actualização|Confirmar/i }).first();
      if (await btnConfirmar.isVisible()) {
        await btnConfirmar.click();
        await page.waitForTimeout(2500);
        const successMsg = await page.locator('div, p').filter({ hasText: /Actualização guardada/i }).count();
        reg('1.4b - Cronograma actualizado com sucesso e mensagem de êxito exibida', successMsg > 0);
      }
    }
  } else {
    // Testar actualização pelo formulário directo
    console.log('  1.4 (alt): Testando actualização pelo formulário directo...');
    const selectEstado = page.locator('select').filter({ hasText: /Seleccione o novo estado/i }).first();
    if (await selectEstado.isVisible()) {
      await selectEstado.selectOption({ index: 1 });
      const textArea = page.locator('textarea[placeholder*="Descreva a intervenção"]').first();
      if (await textArea.isVisible()) {
        await textArea.fill('Análise técnica em curso pela equipa responsável.');
      }
      await page.getByRole('button', { name: /Guardar actualização/i }).first().click();
      await page.waitForTimeout(2500);
      const successMsg = await page.locator('div, p').filter({ hasText: /Actualização guardada/i }).count();
      reg('1.4b - Estado actualizado com sucesso via formulário institucional', successMsg > 0);
    }
  }


  // --------------------------------------------------------------------------
  // TESTE 2: ÁREA DO CIDADÃO — OCORRÊNCIA LOCAL E IMAGENS
  // --------------------------------------------------------------------------
  console.log('\n👤 --- TESTE 2: ÁREA DO CIDADÃO ---');
  // Logout
  await page.locator('aside').getByText(/Sair do Canal|Sair|Terminar/i).first().click();
  await page.waitForTimeout(2000);

  // Login Cidadão
  await page.goto(`${BASE}/#/entrar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  await page.locator('input[type="text"]:visible, input:not([type]):visible').first().fill(CID_USER);
  await page.locator('input[type="password"]:visible').first().fill(CID_PASS);
  await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
  await page.waitForTimeout(2500);

  // Navegar para Ocorrências Locais
  console.log('  2.1: Acedendo a Ocorrências Locais no Cidadão...');
  const btnOcoCid = page.locator('button, a').filter({ hasText: /Ocorrências|Ocorrências Locais/i }).first();
  await btnOcoCid.click();
  await page.waitForTimeout(2000);

  // Verificar se há imagens de capa na lista de ocorrências locais
  const cidListImgCount = await page.locator('img[src*="http"], img[src*="data:"]').count();
  console.log(`  ℹ️ Imagens de capa na lista do cidadão: ${cidListImgCount}`);
  reg('2.1 - Imagens de capa visíveis na lista de ocorrências do cidadão', cidListImgCount > 0);

  // Abrir o detalhe da ocorrência
  console.log('  2.2: Abrindo detalhe da ocorrência no Cidadão...');
  await page.locator('button:has-text("Ver detalhes")').first().click();
  await page.waitForTimeout(2000);

  // Verificar que a imagem aparece no detalhe da ocorrência local
  const cidDetailImg = await page.locator('img[alt*="fotografia"], img[alt*="jpg"], img[alt*="iluminacao"], img[alt*="tubagem"], img[src*="http"], img[src*="data:"]').count();
  console.log(`  ℹ️ Imagens no detalhe da ocorrência do cidadão: ${cidDetailImg}`);
  reg('2.2 - Imagem da ocorrência visível no detalhe do Cidadão', cidDetailImg > 0);

  // Verificar o cronograma no cidadão
  const cidTimelineCount = await page.locator('ol li').count();
  reg('2.3 - Cronograma de acompanhamento visível para o cidadão', cidTimelineCount > 0);

} catch (err) {
  console.error('❌ Erro durante execução E2E:', err);
  FAILS++;
} finally {
  await browser.close();
  console.log('\n========================================');
  console.log(`FALHAS TOTAIS: ${FAILS}`);
  console.log('========================================');
  process.exit(FAILS > 0 ? 1 : 0);
}
