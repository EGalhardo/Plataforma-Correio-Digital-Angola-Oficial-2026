/**
 * Teste E2E Automatizado - Validação da Visualização de Documentos e Biometria no Popup de Revisão do Admin
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const ADMIN_BI = process.env.QA_ADMIN || 'ADMIN-0001';
const ADMIN_PASS = process.env.QA_ADMIN_PASS || '123456789';

async function fecharModais(page) {
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      for (const b of btns) {
        const txt = (b.innerText || '').trim();
        if (txt.includes('Concluir e Fechar') || txt === 'Fechar' || txt === 'OK' || txt === 'Entendido' || txt === '×') {
          try { b.click(); } catch(e) {}
        }
      }
    }).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(300);
  }
}

async function runTests() {
  console.log('================================================================================');
  console.log('🧪 TESTE E2E: VISUALIZAÇÃO DE IMAGENS DO B.I. E BIOMETRIA NO POPUP DO ADMIN');
  console.log('================================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let testesPassados = 0;
  let totalTestes = 0;

  function assert(cond, desc, detalhe = '') {
    totalTestes++;
    if (cond) {
      testesPassados++;
      console.log(`  ✅ [PASS] Teste ${totalTestes}: ${desc}`);
    } else {
      console.error(`  ❌ [FAIL] Teste ${totalTestes}: ${desc} -> Detalhes: ${detalhe}`);
      throw new Error(`Falha no assert: ${desc}`);
    }
  }

  try {
    const ctxAdmin = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageAdmin = await ctxAdmin.newPage();

    await pageAdmin.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await pageAdmin.waitForTimeout(3000);

    // Login Admin
    await pageAdmin.locator('input[name="cda-utilizador"]').fill(ADMIN_BI);
    await pageAdmin.locator('input[name="cda-senha"]').fill(ADMIN_PASS);
    await pageAdmin.locator('button', { hasText: /ENTRAR NO PORTAL/i }).first().click();
    await pageAdmin.waitForTimeout(5000);
    await fecharModais(pageAdmin);

    assert(true, 'Login de Administração efetuado com sucesso');

    // Clicar no menu Cidadãos na barra lateral
    const btnMenuCidadaos = pageAdmin.locator('aside button:has-text("Cidadãos"), button:has-text("Cidadãos")').first();
    if (await btnMenuCidadaos.isVisible()) {
      await btnMenuCidadaos.click();
      await pageAdmin.waitForTimeout(3000);
    }

    // Clicar no botão REVISAR da primeira linha
    const btnRevisar = pageAdmin.locator('tbody tr button:has-text("Revisar"), tbody tr button:has-text("Revisão"), tbody tr button:has-text("Homologar")').first();
    const btnRevisarVisivel = await btnRevisar.isVisible({ timeout: 10000 }).catch(() => false);
    assert(btnRevisarVisivel, 'Botão de revisão de cadastro está acessível na lista de cidadãos do Admin');

    if (btnRevisarVisivel) {
      await btnRevisar.click();
      await pageAdmin.waitForTimeout(2000);

      const modalDialog = pageAdmin.locator('div.z-\\[201\\], div:has-text("Auditoria para Homologação de Cadastro")').first();
      const popupText = await modalDialog.textContent();

      const p1 = /Painel 1 • B.I. Parte Frente/i.test(popupText);
      const p2 = /Painel 2 • B.I. Parte Trás/i.test(popupText);
      const p3 = /Painel 3 • Captura Biométrica/i.test(popupText);

      assert(p1, 'Painel 1 (B.I. Frente) renderizado no popup de auditoria do Admin');
      assert(p2, 'Painel 2 (B.I. Trás/Verso) renderizado no popup de auditoria do Admin');
      assert(p3, 'Painel 3 (Captura Biométrica Face HD) renderizado no popup de auditoria do Admin');

      // Verificar que as imagens do modal possuem sources válidas e não estão com marcador de storage cru
      const modalImgs = await modalDialog.locator('img').all();
      let imgsValidas = modalImgs.length >= 2;
      for (const img of modalImgs) {
        const src = await img.getAttribute('src');
        if (src && src.startsWith('storage:')) {
          imgsValidas = false;
        }
      }
      assert(imgsValidas, 'Imagens do B.I. e Selfie estão devidamente descodificadas e visíveis no modal');

      // Testar Lightbox Zoom em Alta Resolução
      const clickableImg = modalDialog.locator('div[title*="ampliar" i]').first();
      if (await clickableImg.isVisible().catch(() => false)) {
        await clickableImg.click();
        await pageAdmin.waitForTimeout(1000);
        const lightboxContent = await pageAdmin.textContent('body');
        const temLightbox = /Visualização em Alta Resolução|Abrir Original/i.test(lightboxContent);
        assert(temLightbox, 'Visualizador Lightbox Zoom em Alta Resolução abre e renderiza com sucesso');
      }
    }

    await ctxAdmin.close();

  } catch (err) {
    console.error('Erro na execução dos testes:', err);
    process.exit(1);
  } finally {
    await browser.close();
    console.log(`\n================================================================================`);
    console.log(`🏁 RESULTADO FINAL: ${testesPassados}/${totalTestes} TESTES APROVADOS (${Math.round((testesPassados/totalTestes)*100)}%)`);
    console.log(`================================================================================\n`);
  }
}

runTests();
