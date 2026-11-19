#!/usr/bin/env node
// ============================================================================
// e2e_ocorrencia_tirar_foto.mjs
// Teste E2E: Funcionalidade de Tirar Foto com a Câmara e Upload em Ocorrências
// ============================================================================
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const CID_USER = '002399714LA030';
const CID_PASS = '123456789';

let FAILS = 0;
const reg = (nome, ok, detalhe = '') => {
  if (!ok) FAILS++;
  console.log(`  ${ok ? '✅' : '❌'} [${ok ? 'PASS' : 'FAIL'}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};

console.log('🚀 Iniciando Teste E2E: Tirar Foto e Upload de Imagens em Ocorrências...\n');

const browser = await chromium.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
  ],
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'pt-PT',
  permissions: ['camera', 'geolocation'],
  geolocation: { latitude: -8.83833, longitude: 13.23444, accuracy: 2.1 },
});

const page = await context.newPage();

try {
  // 1. Login do Cidadão
  console.log('1. Autenticação do Cidadão...');
  await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 40000 });
  await page.locator('input[type="text"], input:not([type])').first().fill(CID_USER);
  await page.locator('input[type="password"]').first().fill(CID_PASS);
  await page.locator('button', { hasText: /ENTRAR/i }).first().click();
  await page.getByRole('button', { name: 'Painel', exact: true }).first().waitFor({ state: 'visible', timeout: 45000 });
  reg('1.1 - Login do Cidadão efectuado', true);

  // 2. Navegar para Ocorrências Locais
  console.log('2. Navegar para Ocorrências Locais...');
  await page.getByRole('button', { name: 'Ocorrências Locais' }).first().click();
  await page.waitForTimeout(2000);
  reg('2.1 - Navegação para Ocorrências Locais', true);

  // 3. Abrir formulário "Criar Ocorrência"
  console.log('3. Abrir formulário de nova ocorrência...');
  const btnReg = page.locator('button:has-text("Criar Ocorrência"), button:has-text("Registar ocorrência"), [data-testid="btn-criar-ocorrencia"], [data-testid="btn-registar-ocorrencia"]').first();
  if (await btnReg.isVisible().catch(() => false)) {
    await btnReg.click();
    await page.waitForTimeout(1000);
  }
  await page.getByLabel('Categoria *').waitFor({ state: 'visible', timeout: 15000 });
  reg('3.1 - Formulário «Criar Ocorrência» aberto', true);

  // 4. Validar botões de Tirar Foto e Carregar Ficheiro
  console.log('4. Validando presença dos botões de câmara e upload...');
  const btnTirarFoto = page.locator('[data-testid="btn-tirar-foto"]');
  const btnUploadFoto = page.locator('[data-testid="btn-upload-foto"]');

  const tirarFotoVisivel = await btnTirarFoto.isVisible();
  const uploadFotoVisivel = await btnUploadFoto.isVisible();
  reg('4.1 - Botão «Tirar foto com a câmara» visível no formulário', tirarFotoVisivel);
  reg('4.2 - Botão «Carregar do dispositivo» visível no formulário', uploadFotoVisivel);

  // 5. Testar abertura do Modal da Câmara
  console.log('5. Abrindo modal da câmara...');
  await btnTirarFoto.click();
  await page.waitForTimeout(2000);

  const modalCamera = page.locator('text=Tirar Fotografias da Ocorrência');
  const modalAberto = await modalCamera.isVisible();
  reg('5.1 - Modal da câmara aberto com sucesso', modalAberto);

  const shutterBtn = page.locator('[data-testid="camera-shutter-btn"]');
  await shutterBtn.waitFor({ state: 'visible', timeout: 10000 });
  reg('5.2 - Botão disparador (shutter) da câmara ativo e pronto', await shutterBtn.isEnabled());

  // 6. Capturar foto via câmara
  console.log('6. Disparando captura de fotografia...');
  await shutterBtn.click();
  await page.waitForTimeout(1500);

  const btnUsarFoto = page.locator('[data-testid="btn-usar-estas-fotos"], button:has-text("Usar esta foto"), button:has-text("Usar estas fotos")').first();
  await btnUsarFoto.waitFor({ state: 'visible', timeout: 5000 });
  reg('6.1 - Foto capturada exibida com botão «Usar esta foto»', await btnUsarFoto.isVisible());

  // Confirmar e anexar foto
  await btnUsarFoto.click();
  
  // Aguardar processamento da fotografia
  await page.waitForTimeout(3000);

  // 7. Verificar se a foto foi anexada à ocorrência
  const fotosAnexadas = page.locator('img[alt*="foto_ocorrencia"], img[alt*="fotografia"]');
  await fotosAnexadas.first().waitFor({ state: 'visible', timeout: 10000 });
  const fotosAnexadasCount = await fotosAnexadas.count();
  console.log(`  ℹ️ Fotos anexadas detectadas no formulário: ${fotosAnexadasCount}`);
  reg('7.1 - Fotografia tirada com a câmara anexada com sucesso à ocorrência', fotosAnexadasCount >= 1);

  // 8. Testar upload de segunda foto através de ficheiro
  console.log('8. Testando anexação de foto por upload de ficheiro...');
  const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: 'foto_upload_teste.png',
    mimeType: 'image/png',
    buffer: PNG_1x1,
  });
  await page.waitForTimeout(3000);

  const fotosTotalCount = await page.locator('img[alt*="foto_ocorrencia"], img[alt*="foto_upload_teste"], img[alt*="fotografia"]').count();
  console.log(`  ℹ️ Total de fotos anexadas (câmara + upload): ${fotosTotalCount}`);
  reg('8.1 - Upload de ficheiro somado à lista de fotografias da ocorrência', fotosTotalCount >= 2);

  // 9. Preencher o restante formulário da ocorrência
  console.log('9. Preenchendo campos da ocorrência...');
  await page.getByLabel('Categoria *').selectOption('Iluminação pública');
  await page.getByLabel('Título *').fill('Poste avariado com fotos da câmara e upload');
  await page.getByLabel('Descrição *').fill('Detetado poste instável na via pública. Fotografias tiradas no local com a câmara anexadas para comprovação.');
  
  // Localização Manual
  await page.getByLabel('Província *').selectOption('Luanda');
  await page.getByLabel('Município *').selectOption('Luanda');
  await page.getByLabel('Bairro / Localidade *').fill('Maianga');
  await page.getByLabel('Rua / Ponto de referência *').fill('Rua Principal de Luanda, junto ao posto');

  // Selecionar instituição
  await page.getByLabel('Código institucional *').fill('INAPEM-LLMM');
  await page.waitForTimeout(1000);

  // 10. Rever ocorrência
  console.log('10. Rever ocorrência...');
  const btnRever = page.locator('button:has-text("Rever ocorrência")');
  await btnRever.click();
  await page.waitForTimeout(2000);

  const corpoRevisao = await page.evaluate(() => document.body.innerText);
  reg('10.1 - Tela de revisão exibe descrição e fotografias anexadas', corpoRevisao.includes('Poste avariado') && /Fotografias \([1-5]\)/.test(corpoRevisao));

  // 11. Submeter ocorrência
  console.log('11. Submetendo ocorrência com fotografias da câmara...');
  const btnConfirmar = page.locator('button:has-text("Confirmar e enviar"), button:has-text("Submeter ocorrência")').first();
  if (await btnConfirmar.isVisible()) {
    await btnConfirmar.click();
    await page.waitForTimeout(4000);
    const corpoSucesso = await page.evaluate(() => document.body.innerText);
    reg('11.1 - Ocorrência registada com sucesso com número de protocolo', /OCO-|Protocolo|registada/i.test(corpoSucesso));
  }

} catch (err) {
  console.error('❌ Erro durante a execução do teste:', err);
  FAILS++;
} finally {
  await browser.close();
}

console.log(`\n==================================================`);
console.log(`Resultado Final: ${FAILS === 0 ? 'TODOS OS TESTES PASSARAM COM SUCESSO! 🎯' : `${FAILS} falhas encontradas.`}`);
console.log(`==================================================\n`);

process.exit(FAILS === 0 ? 0 : 1);
