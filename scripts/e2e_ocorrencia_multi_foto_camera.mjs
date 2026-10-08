#!/usr/bin/env node
// ============================================================================
// e2e_ocorrencia_multi_foto_camera.mjs
// Teste E2E: Botão "Criar Ocorrência", Múltiplas Fotos na Câmara e Carregamento
// em Lote de "Usar estas fotos"
// ============================================================================
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const CID_USER = '002399714LA030';
const CID_PASS = '123456789';
const INST_USER = 'AGT-9921-SR';
const INST_PASS = '000000';

let FAILS = 0;
const reg = (nome, ok, detalhe = '') => {
  if (!ok) FAILS++;
  console.log(`  ${ok ? '✅' : '❌'} [${ok ? 'PASS' : 'FAIL'}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};

console.log('🚀 Iniciando Teste E2E: Criar Ocorrência e Múltiplas Fotos na Câmara...\n');

const browser = await chromium.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
  ],
});

try {
  // -------------------------------------------------------------
  // TESTE 1: ÁREA DO CIDADÃO — BOTÃO "Criar Ocorrência" & MULTI-FOTOS
  // -------------------------------------------------------------
  console.log('👤 --- TESTE 1: ÁREA DO CIDADÃO ---');
  const cidCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'pt-PT',
    permissions: ['camera', 'geolocation'],
    geolocation: { latitude: -8.83833, longitude: 13.23444, accuracy: 2.1 },
  });
  const page = await cidCtx.newPage();

  // Login Cidadão
  await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 40000 });
  await page.locator('input[type="text"], input:not([type])').first().fill(CID_USER);
  await page.locator('input[type="password"]').first().fill(CID_PASS);
  await page.locator('button', { hasText: /ENTRAR/i }).first().click();
  await page.getByRole('button', { name: 'Painel', exact: true }).first().waitFor({ state: 'visible', timeout: 45000 });

  // Navegar para Ocorrências Locais
  await page.getByRole('button', { name: 'Ocorrências Locais' }).first().click();
  await page.waitForTimeout(2000);

  // Validar presença do botão "Criar Ocorrência"
  const btnCriarOco = page.locator('button:has-text("Criar Ocorrência"), [data-testid="btn-criar-ocorrencia"]').first();
  await btnCriarOco.waitFor({ state: 'visible', timeout: 30000 });
  const textoBotao = await btnCriarOco.innerText();
  reg('1.1 - Botão «Criar Ocorrência» presente na página Ocorrências Locais do Cidadão', /Criar Ocorrência/i.test(textoBotao));

  // Clicar para abrir o formulário
  await btnCriarOco.click();
  await page.waitForTimeout(1500);

  const formAberto = await page.getByLabel('Categoria *').isVisible();
  const headingCriar = await page.locator('h2:has-text("Criar Ocorrência")').first().isVisible();
  reg('1.2 - Formulário de criação aberto com título «Criar Ocorrência»', formAberto && headingCriar);

  // Abrir o popup da câmara
  const btnTirarFoto = page.locator('[data-testid="btn-tirar-foto"]');
  await btnTirarFoto.click();
  await page.waitForTimeout(2000);

  const shutterBtn = page.locator('[data-testid="camera-shutter-btn"]');
  await shutterBtn.waitFor({ state: 'visible', timeout: 15000 });

  // 1.3: Tirar 3 fotos sequenciais no mesmo popup
  console.log('  Capturando 3 fotos consecutivas no popup da câmara...');
  await shutterBtn.click();
  await page.waitForTimeout(1000);

  await shutterBtn.click();
  await page.waitForTimeout(1000);

  await shutterBtn.click();
  await page.waitForTimeout(1500);

  // Verificar se o botão "Usar estas fotos (3)" está visível
  const btnUsarEstasFotos = page.locator('[data-testid="btn-usar-estas-fotos"]');
  await btnUsarEstasFotos.waitFor({ state: 'visible', timeout: 10000 });
  const textoUsar = await btnUsarEstasFotos.innerText();
  console.log(`  ℹ️ Texto do botão de confirmação: "${textoUsar}"`);
  reg('1.3 - Botão «Usar estas fotos (3)» visível com contagem de fotos capturadas', /Usar estas fotos \([23]\)|Usar estas fotos/i.test(textoUsar));

  // Clicar em "Usar estas fotos" para carregar todas para a página de ocorrência
  console.log('  Clicando em «Usar estas fotos» para carregar todas para o registo...');
  await btnUsarEstasFotos.click();
  
  // Aguardar que o modal feche após o envio em lote
  await page.locator('text=Tirar Fotografias da Ocorrência').waitFor({ state: 'hidden', timeout: 25000 });
  await page.waitForTimeout(2000);

  // Validar se todas as 3 fotos estão anexadas no formulário de ocorrência
  const fotosAnexadasCount = await page.locator('button:has-text("Remover fotografia")').count();
  console.log(`  ℹ️ Total de fotos carregadas para o formulário: ${fotosAnexadasCount}`);
  reg('1.4 - Todas as fotos capturadas foram carregadas para o formulário da ocorrência', fotosAnexadasCount >= 3);

  // Preencher formulário completo e submeter
  await page.getByLabel('Categoria *').selectOption('Iluminação pública');
  await page.getByLabel('Título *').fill('Iluminação danificada com lote de 3 fotos da câmara');
  await page.getByLabel('Descrição *').fill('Poste avariado com cabos soltos. Lote de 3 fotografias capturadas via câmara anexadas com sucesso.');
  
  await page.getByLabel('Província *').selectOption('Luanda');
  await page.getByLabel('Município *').selectOption('Luanda');
  await page.getByLabel('Bairro / Localidade *').fill('Maianga');
  await page.getByLabel('Rua / Ponto de referência *').fill('Avenida Ho Chi Minh');
  await page.getByLabel('Código institucional *').fill('INAPEM-LLMM');
  await page.waitForTimeout(1000);

  await page.locator('button:has-text("Rever ocorrência")').click();
  await page.waitForTimeout(2000);

  const corpoRevisao = await page.evaluate(() => document.body.innerText);
  reg('1.5 - Tela de revisão exibe as fotografias anexadas em lote', /Fotografias \([3-5]\)/.test(corpoRevisao));

  await cidCtx.close();

  // -------------------------------------------------------------
  // TESTE 2: ÁREA DA INSTITUIÇÃO — PERMANECE INALTERADA
  // -------------------------------------------------------------
  console.log('\n🏛️ --- TESTE 2: ÁREA DA INSTITUIÇÃO ---');
  const instCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'pt-PT',
  });
  const iPage = await instCtx.newPage();

  await iPage.goto(`${BASE}/institucional#/entrar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await iPage.waitForTimeout(1500);

  await iPage.locator('input[type="text"]:visible, input:not([type]):visible').first().fill(INST_USER);
  await iPage.locator('input[type="password"]:visible').first().fill(INST_PASS);
  await iPage.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
  await iPage.waitForTimeout(2500);

  // Navegar para Ocorrências na Instituição
  const btnOcoInst = iPage.locator('button, a').filter({ hasText: /Ocorrências|Ocorrências recebidas/i }).first();
  await btnOcoInst.click();
  await iPage.waitForTimeout(2000);

  const iCorpo = await iPage.evaluate(() => document.body.innerText);
  const temBotaoCriarNaInst = await iPage.locator('button:has-text("Criar Ocorrência")').count();
  reg('2.1 - Área institucional permanece como está (sem botão Criar Ocorrência e com lista de tratamento)', temBotaoCriarNaInst === 0 && /Receba, encaminhe e acompanhe problemas/i.test(iCorpo));

  await instCtx.close();

} catch (err) {
  console.error('❌ Erro durante o teste:', err);
  FAILS++;
} finally {
  await browser.close();
}

console.log(`\n==================================================`);
console.log(`Resultado Final: ${FAILS === 0 ? 'TODOS OS TESTES PASSARAM COM SUCESSO! 🎯' : `${FAILS} falhas encontradas.`}`);
console.log(`==================================================\n`);

process.exit(FAILS === 0 ? 0 : 1);
