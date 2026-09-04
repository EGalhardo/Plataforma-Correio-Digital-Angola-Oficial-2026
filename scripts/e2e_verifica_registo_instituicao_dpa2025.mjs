import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function run() {
  console.log('🚀 Iniciando verificação E2E do Registo de Instituição (DPA 2025 sem IA)...');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    console.log('🌐 1. Acedendo a http://localhost:3000/institucional#/registar ...');
    await page.goto('http://localhost:3000/institucional#/registar', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Se não estiver directamente no formulário de registo, clica no botão "Registar Nova Instituição"
    const btnRegistar = page.locator('button:has-text("Registar Nova Instituição"), button:has-text("Adesão Institucional"), a:has-text("Registar")').first();
    if (await btnRegistar.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('📝 Clicando para abrir formulário de adesão...');
      await btnRegistar.click();
      await page.waitForTimeout(800);
    }

    // 2. Verificar se o bloco de Localização está presente
    console.log('🔍 2. Verificando cabeçalho de Localização e ausência de IA...');
    const localizacaoHeader = page.locator('text=Localização').first();
    await localizacaoHeader.waitFor({ state: 'visible', timeout: 10000 });

    const iaBadge = page.locator('text=Assistida por IA');
    const hasIaBadge = await iaBadge.isVisible({ timeout: 500 }).catch(() => false);
    if (hasIaBadge) {
      throw new Error('❌ FALHA: O badge "Assistida por IA" ainda está visível!');
    }
    console.log('✅ Confirmado: Badge "Assistida por IA" NÃO existe.');

    // Seletores precisos baseados nas labels dos campos
    const selProvincia = page.locator('div.grid:has(> label:has-text("Província")) select');
    const selCidade = page.locator('div.grid:has(> label:has-text("Cidade")) select');
    const selMunicipio = page.locator('div.grid:has(> label:has-text("Município")) select');
    const selComuna = page.locator('div.grid:has(> label:has-text("Comuna")) select');

    // 3. Testar Província "Ícolo e Bengo" (Nova Província DPA 2025)
    console.log('📍 3. Selecionando Província "Ícolo e Bengo"...');
    await selProvincia.selectOption('Ícolo e Bengo');
    await page.waitForTimeout(300);

    // Verificar Municípios de Ícolo e Bengo
    const munisIcolo = await selMunicipio.locator('option').allInnerTexts();
    console.log('Municípios em Ícolo e Bengo:', munisIcolo);
    if (!munisIcolo.includes('Calumbo') || !munisIcolo.includes('Sequele') || !munisIcolo.includes('Bom Jesus')) {
      throw new Error('❌ FALHA: Municípios de Ícolo e Bengo incompletos!');
    }
    console.log('✅ Municípios de Ícolo e Bengo confirmados com sucesso.');

    // 4. Selecionar Município "Calumbo" e testar comunas com Zango 0-5
    console.log('🏘️ 4. Selecionando Município "Calumbo"...');
    await selMunicipio.selectOption('Calumbo');
    await page.waitForTimeout(300);

    const comunasCalumbo = await selComuna.locator('option').allInnerTexts();
    console.log('Comunas em Calumbo:', comunasCalumbo);
    if (!comunasCalumbo.some(c => c.includes('Zango 0')) || !comunasCalumbo.some(c => c.includes('8000'))) {
      throw new Error('❌ FALHA: Zango / Centralidade 8000 não encontrados em Calumbo!');
    }
    console.log('✅ Comunas de Calumbo (incluindo Zango 0 a 5/8000) verificadas.');

    // 5. Testar Província "Cuando" (Nova Província DPA 2025)
    console.log('📍 5. Selecionando Província "Cuando"...');
    await selProvincia.selectOption('Cuando');
    await page.waitForTimeout(300);

    const munisCuando = await selMunicipio.locator('option').allInnerTexts();
    console.log('Municípios em Cuando:', munisCuando);
    if (!munisCuando.includes('Mavinga') || !munisCuando.includes('Cuito Cuanavale')) {
      throw new Error('❌ FALHA: Municípios do Cuando incompletos!');
    }
    console.log('✅ Província do Cuando verificada com sucesso.');

    // 6. Testar Província "Moxico Leste" (Nova Província DPA 2025)
    console.log('📍 6. Selecionando Província "Moxico Leste"...');
    await selProvincia.selectOption('Moxico Leste');
    await page.waitForTimeout(300);

    const munisMoxicoLeste = await selMunicipio.locator('option').allInnerTexts();
    console.log('Municípios em Moxico Leste:', munisMoxicoLeste);
    if (!munisMoxicoLeste.includes('Cazombo') || !munisMoxicoLeste.includes('Luau')) {
      throw new Error('❌ FALHA: Municípios de Moxico Leste incompletos!');
    }
    console.log('✅ Província de Moxico Leste verificada com sucesso.');

    // 7. Testar Província "Luanda" (16 municípios urbanos)
    console.log('📍 7. Selecionando Província "Luanda"...');
    await selProvincia.selectOption('Luanda');
    await page.waitForTimeout(300);

    const munisLuanda = await selMunicipio.locator('option').allInnerTexts();
    console.log('Municípios em Luanda:', munisLuanda);
    if (munisLuanda.includes('Calumbo')) {
      throw new Error('❌ FALHA: Calumbo ainda aparece em Luanda (deve estar apenas em Ícolo e Bengo)!');
    }
    console.log('✅ Luanda confirmada (Calumbo transferido correctamente para Ícolo e Bengo).');

    // 8. Capturar screenshot de evidência
    const screenshotDir = path.resolve('testes/evidencias/screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(screenshotDir, 'registo_instituicao_dpa2025_sem_ia.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot guardado com sucesso em: ${screenshotPath}`);

    console.log('\n🎉 VERIFICAÇÃO CONCLUÍDA COM 100% DE SUCESSO!');
  } catch (err) {
    console.error('❌ Erro no teste E2E:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
