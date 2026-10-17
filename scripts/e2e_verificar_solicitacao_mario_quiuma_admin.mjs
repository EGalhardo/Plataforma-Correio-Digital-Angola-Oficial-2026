/**
 * e2e_verificar_solicitacao_mario_quiuma_admin.mjs
 * Script para aceder à Área Admin, navegar para a secção "Cidadãos" e auditar
 * detalhadamente qualquer solicitação/registo existente para o cidadão "Mario Quiuma".
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SCREENSHOT_DIR = path.resolve('images');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function verificarAdminCidadaoMarioQuiuma() {
  console.log('================================================================');
  console.log('🔍 AUDITORIA ADMIN: VERIFICAÇÃO DE SOLICITAÇÃO - MARIO QUIUMA');
  console.log(`🌐 Alvo: ${BASE_URL}/#/admin`);
  console.log('================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  try {
    // 1. Aceder ao Painel Admin
    console.log('1️⃣ Acedendo à Área de Administração Central...');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Se estiver na tela de login de Admin, autenticar
    const passInput = page.locator('input[type="password"]');
    if (await passInput.isVisible()) {
      console.log('🔑 Preenchendo credenciais de operador administrativo...');
      await passInput.fill('123456789');
      const enterBtn = page.locator('button:has-text("ENTRAR"), button:has-text("Entrar"), button:has-text("ACEDER")').first();
      await enterBtn.click();
      await page.waitForTimeout(2500);
    }

    // 2. Navegar para a aba "Cidadãos"
    console.log('2️⃣ Navegando para o módulo de "Cidadãos"...');
    const cidadaosMenu = page.locator('button:has-text("Cidadãos"), a:has-text("Cidadãos"), span:has-text("Cidadãos")').first();
    await cidadaosMenu.waitFor({ state: 'visible', timeout: 10000 });
    await cidadaosMenu.click();
    await page.waitForTimeout(2000);

    // 3. Capturar estado inicial da tabela com todos os registos
    console.log('3️⃣ Extraindo registos do Quadro de Cadastros Nacionais...');
    const tableScreenshot1 = path.join(SCREENSHOT_DIR, 'admin_cidadaos_lista_geral.png');
    await page.screenshot({ path: tableScreenshot1, fullPage: true });
    console.log(`📸 Screenshot geral guardada em: ${tableScreenshot1}`);

    // 4. Pesquisar especificamente por "Mario Quiuma"
    console.log('4️⃣ Filtrando pela barra de pesquisa por "Mario Quiuma"...');
    const searchInput = page.locator('input[placeholder*="Pesquisar B.I., Nome, E-mail..."]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill('Mario Quiuma');
    await page.waitForTimeout(1000);

    // Capturar screenshot filtrada
    const tableScreenshot2 = path.join(SCREENSHOT_DIR, 'admin_cidadaos_pesquisa_mario_quiuma.png');
    await page.screenshot({ path: tableScreenshot2, fullPage: true });
    console.log(`📸 Screenshot filtrada por Mario Quiuma em: ${tableScreenshot2}`);

    // 5. Analisar linhas da tabela correspondentes a Mario Quiuma
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    console.log(`\n📊 Registos visíveis após pesquisa: ${rowCount}`);

    const resultados = [];

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const text = await row.innerText();
      if (text.toLowerCase().includes('mario') || text.toLowerCase().includes('quiuma')) {
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        resultados.push({ index: i + 1, rawText: text, lines });
      }
    }

    console.log('\n================================================================');
    console.log(`📋 RESULTADOS ENCONTRADOS PARA "MARIO QUIUMA": ${resultados.length}`);
    console.log('================================================================');

    resultados.forEach((res, idx) => {
      console.log(`\n--- Solicitação #${idx + 1} ---`);
      res.lines.forEach(line => console.log(`  • ${line}`));
    });

    // 6. Se houver registo, abrir o modal de auditoria ("Analisar" ou "Revisar")
    if (resultados.length > 0) {
      console.log('\n5️⃣ Abrindo modal de auditoria e validação biométrica do primeiro registo encontrado...');
      const targetRow = rows.first();
      const actionBtn = targetRow.locator('button:has-text("Analisar"), button:has-text("REVISAR"), button:has-text("Revisar")').first();
      
      if (await actionBtn.count() > 0) {
        await actionBtn.click();
      } else {
        await targetRow.click();
      }

      await page.waitForTimeout(2000);

      // Extrair informações do modal
      const modal = page.locator('div[role="dialog"], div.fixed.inset-0').last();
      const modalScreenshot = path.join(SCREENSHOT_DIR, 'admin_modal_auditoria_mario_quiuma.png');
      await page.screenshot({ path: modalScreenshot, fullPage: true });
      console.log(`📸 Screenshot do modal de auditoria guardada em: ${modalScreenshot}`);

      // Ler dados do modal
      const modalText = await page.locator('body').innerText();
      console.log('\n🔬 Detalhes da Auditoria no Modal:');
      const lines = modalText.split('\n').map(l => l.trim()).filter(Boolean);
      const relevantLines = lines.filter(l => 
        l.includes('NOME') || 
        l.includes('B.I.') || 
        l.includes('ELETRÓNICO') || 
        l.includes('SUBMISSÃO') || 
        l.includes('PAINEL') || 
        l.includes('FOTO') || 
        l.includes('CORRESP') || 
        l.includes('OCR') || 
        l.includes('COERÊNCIA') ||
        l.includes('HOMOLOGAR') ||
        l.includes('RECUSAR') ||
        l.includes('PENDENTE')
      );
      relevantLines.forEach(l => console.log(`  🔍 ${l}`));
    } else {
      console.log('ℹ️ Nenhuma solicitação encontrada com o nome "Mario Quiuma" no momento.');
    }

    console.log('\n================================================================');
    console.log('✅ AUDITORIA CONCLUÍDA COM SUCESSO');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ Erro durante a auditoria admin:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_auditoria_error.png') });
  } finally {
    await browser.close();
  }
}

verificarAdminCidadaoMarioQuiuma();
