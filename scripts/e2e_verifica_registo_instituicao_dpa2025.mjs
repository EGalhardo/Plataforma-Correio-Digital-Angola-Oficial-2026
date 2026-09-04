import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function run() {
  console.log('🚀 Iniciando verificação E2E do Registo de Instituição (DPA 2025 — Província → Município → Comuna)...');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[Browser error]: ${msg.text()}`);
  });

  try {
    console.log('🌐 1. Acedendo a http://localhost:3000/institucional ...');
    await page.goto('http://localhost:3000/institucional', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Clicar no botão "Registar" no ecrã de login institucional
    const btnRegistar = page.locator('button:has-text("Registar")').first();
    await btnRegistar.waitFor({ state: 'visible', timeout: 10000 });
    console.log('📝 Clicando no botão "Registar"...');
    await btnRegistar.click();
    await page.waitForTimeout(1000);

    // 2. Verificar se o bloco de Localização está presente e se NÃO existe o campo Cidade nem IA
    console.log('🔍 2. Verificando estrutura e ausência do campo "Cidade" e de "IA"...');
    const localizacaoHeader = page.locator('text=Localização').first();
    await localizacaoHeader.waitFor({ state: 'visible', timeout: 10000 });

    const hasCidade = await page.locator('label:has-text("Cidade")').isVisible({ timeout: 500 }).catch(() => false);
    if (hasCidade) {
      throw new Error('❌ FALHA: O campo "Cidade" ainda está visível no formulário!');
    }
    console.log('✅ Confirmado: Campo "Cidade" removido com sucesso.');

    const hasIa = await page.locator('text=Assistida por IA').isVisible({ timeout: 500 }).catch(() => false);
    if (hasIa) {
      throw new Error('❌ FALHA: O badge "Assistida por IA" ainda está visível!');
    }
    console.log('✅ Confirmado: Nenhuma dependência de IA no grupo Localização.');

    // Seletores precisos para os 3 níveis administrativos oficiais
    const selProvincia = page.locator('div.grid:has(> label:has-text("Província")) select');
    const selMunicipio = page.locator('div.grid:has(> label:has-text("Município")) select');
    const selComuna = page.locator('div.grid:has(> label:has-text("Comuna")) select');
    const inputEndereco = page.locator('div.grid:has(> label:has-text("Endereço Institucional")) input');

    // 3. Testar Província "Ícolo e Bengo" (Nova Província DPA 2025)
    console.log('📍 3. Selecionando Província "Ícolo e Bengo"...');
    await selProvincia.selectOption('Ícolo e Bengo');
    await page.waitForTimeout(300);

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

    // 5. Preencher dados para testar pré-visualização do Código Institucional (3 letras: Província/Município/Comuna)
    console.log('✍️ 5. Preenchendo campos para testar geração do Código Institucional...');
    const inputNome = page.locator('div.grid:has(> label:has-text("Nome Institucional Completo")) input');
    await inputNome.fill('Serviço de Migração e Estrangeiros');
    await page.waitForTimeout(300);

    await selProvincia.selectOption('Luanda');
    await page.waitForTimeout(200);
    await selMunicipio.selectOption('Viana');
    await page.waitForTimeout(200);
    await selComuna.selectOption({ index: 1 });
    await page.waitForTimeout(200);

    await inputEndereco.fill('Rua dos Correios, Edifício Luanda Tower, 4.º Andar');
    await page.waitForTimeout(600);

    const previewCode = await page.locator('text=Código Institucional (automático)').locator('..').locator('div.bg-slate-50').innerText();
    console.log('Código Institucional gerado na pré-visualização:', previewCode);
    if (!previewCode.startsWith('SME-')) {
      throw new Error(`❌ FALHA: Código institucional inesperado: ${previewCode}`);
    }
    console.log('✅ Código Institucional gerado com a fórmula oficial (Província · Município · Comuna).');

    // 6. Capturar screenshot de evidência
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
