import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const SHOT_DIR = '/home/user/cda_test/screenshots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

async function run() {
  console.log('--- Iniciando Teste E2E de Ocorrências e GPS ---');
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 1380, height: 960 },
    deviceScaleFactor: 1.5,
    locale: 'pt-AO',
    geolocation: { latitude: -8.838333, longitude: 13.234444, accuracy: 2.5 },
    permissions: ['geolocation'],
  });
  const page = await context.newPage();

  // 1. Aceder à plataforma e fazer login como Cidadão
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('A autenticar cidadão de demonstração...');
  const biInput = page.locator('input[type="text"]').first();
  const passInput = page.locator('input[type="password"]').first();
  
  if (await biInput.isVisible()) {
    await biInput.fill('009874562LA041');
    await passInput.fill('123456');
    const submitBtn = page.locator('button[type="submit"], button:has-text("Entrar")').first();
    await submitBtn.click();
    await page.waitForTimeout(2000);
  }

  // 2. Navegar para a página de Ocorrências
  console.log('A navegar para a página de Ocorrências...');
  await page.evaluate(() => {
    window.location.hash = 'ocorrencias';
  });
  await page.waitForTimeout(2000);

  // Capturar a lista de ocorrências
  await page.screenshot({ path: `${SHOT_DIR}/ocorrencias-lista-cidadao.png`, fullPage: false });
  console.log('✓ Captura da lista guardada em ocorrencias-lista-cidadao.png');

  // 3. Clicar em "Registar ocorrência"
  const registarBtn = page.locator('button:has-text("Registar ocorrência")').first();
  if (await registarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await registarBtn.click();
    await page.waitForTimeout(1000);

    // 4. Selecionar "Automático (GPS)"
    const gpsBtn = page.locator('button:has-text("Automático (GPS)")').first();
    if (await gpsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gpsBtn.click();
      await page.waitForTimeout(1000);

      // Clicar em "Obter localização (GPS)"
      const obterGpsBtn = page.locator('button:has-text("Obter localização (GPS)")').first();
      if (await obterGpsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await obterGpsBtn.click();
        console.log('A obter localização GPS de alta precisão...');
        await page.waitForTimeout(4500);
      }
    }

    await page.screenshot({ path: `${SHOT_DIR}/ocorrencias-gps-registar.png`, fullPage: false });
    console.log('✓ Captura do registo GPS guardada em ocorrencias-gps-registar.png');
  }

  await browser.close();
  console.log('--- Teste concluído com sucesso ---');
}

run().catch((err) => {
  console.error('Erro no teste:', err);
  process.exit(1);
});
