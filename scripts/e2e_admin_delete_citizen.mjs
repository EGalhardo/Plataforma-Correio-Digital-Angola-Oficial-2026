import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE || 'http://localhost:3000';
const ADMIN_ID = process.env.QA_ADMIN || 'ADMIN-0001';
const ADMIN_PASS = process.env.QA_ADMIN_PASS || '123456789';
const CID_ID = process.env.QA_BI_A || '009874562LA041';
const CID_PASS = process.env.QA_CID_PASS || '123456';
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

async function main() {
  console.log('='.repeat(80));
  console.log('🧪 SUÍTE DE TESTES E2E: ESTABILIDADE DE CAIXA + ELIMINAÇÃO NO PAINEL ADMIN');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

  // TESTE 1: ESTABILIDADE DE CORRESPONDÊNCIAS NA CAIXA DO CIDADÃO (15 SEGUNDOS)
  console.log('\n--- [TESTE 1/2] Monitorização da Caixa de Correspondências do Cidadão ---');
  const ctxCid = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageCid = await ctxCid.newPage();

  let refetchCount = 0;
  pageCid.on('console', msg => {
    const text = msg.text();
    if (text.includes('loadSupabaseData') || text.includes('Supabase Realtime detectou alteração')) {
      refetchCount++;
    }
  });

  await pageCid.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await pageCid.waitForTimeout(1000);

  await pageCid.locator('input[name="cda-utilizador"]').fill(CID_ID);
  await pageCid.locator('input[name="cda-senha"]').fill(CID_PASS);
  await pageCid.locator('button', { hasText: /ENTRAR NO PORTAL/i }).first().click();
  await pageCid.waitForTimeout(3000);

  const btnCorreio = pageCid.locator('aside button:has-text("Correio"), button:has-text("Correio")').first();
  if (await btnCorreio.isVisible()) await btnCorreio.click();
  await pageCid.waitForTimeout(1000);

  let initialCards = 0;
  let hasFlickered = false;

  for (let s = 1; s <= 15; s++) {
    const count = await pageCid.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div.cursor-pointer, tr, [data-testid*="message-item"]'))
        .filter(el => {
          const t = el.innerText || '';
          return t.includes('AGT') || t.includes('Notificação') || t.includes('Ofício') || t.includes('Sondagem') || t.includes('Ativação') || t.includes('CDA');
        });
      return items.length;
    });

    if (s === 1) {
      initialCards = count;
      console.log(`  [Seg 01] Correspondências renderizadas inicialmente: ${count}`);
    } else {
      if (count !== initialCards) {
        console.warn(`  ⚠️ Oscilação detectada no segundo ${s}: ${initialCards} -> ${count}`);
        hasFlickered = true;
      }
    }
    await pageCid.waitForTimeout(1000);
  }

  console.log(`  [Diagnóstico] Oscilação visual: ${hasFlickered ? 'DETECTADA (ERRO)' : 'NENHUMA (100% ESTÁVEL)'}`);
  console.log(`  [Diagnóstico] Disparos excessivos em Realtime: ${refetchCount}`);
  if (hasFlickered) throw new Error('A caixa de mensagens do cidadão oscilou.');

  await ctxCid.close();

  // TESTE 2: CRIAÇÃO, HOMOLOGAÇÃO E ELIMINAÇÃO DEFINITIVA VIA INTERFACE DO ADMIN
  console.log('\n--- [TESTE 2/2] Inserção e Eliminação em Cascata de Cidadão no Painel Admin ---');
  const testBi = '002399714LA030';
  const testName = 'Edlasio Adjamiro Galhardo (Auditoria de Eliminação)';

  // Inserir registo no Supabase
  await fetch(`${supabaseUrl}/rest/v1/solicitacoes_registo`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      bi_numero: testBi,
      nome: testName,
      status: 'Pendente',
      observacoes: 'Registo de validação de eliminação de conta'
    })
  });

  const ctxAdmin = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageAdmin = await ctxAdmin.newPage();

  pageAdmin.on('console', msg => console.log(`  [Admin Console] ${msg.text()}`));

  await pageAdmin.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
  await pageAdmin.waitForTimeout(1000);

  await pageAdmin.locator('input[name="cda-utilizador"]').fill(ADMIN_ID);
  await pageAdmin.locator('input[name="cda-senha"]').fill(ADMIN_PASS);
  await pageAdmin.locator('button', { hasText: /ENTRAR NO PORTAL/i }).first().click();
  await pageAdmin.waitForTimeout(3000);

  const btnCidTab = pageAdmin.locator('aside button:has-text("Cidadãos"), button:has-text("Cidadãos")').first();
  if (await btnCidTab.isVisible()) {
    await btnCidTab.click();
    await pageAdmin.waitForTimeout(2000);
  }

  const rowsBefore = await pageAdmin.evaluate(() => {
    return Array.from(document.querySelectorAll('table tbody tr')).map(r => r.innerText.replace(/\s+/g, ' ').slice(0, 80));
  });
  console.log(`  Linhas na tabela antes da eliminação (${rowsBefore.length}):`, rowsBefore);

  const row = pageAdmin.locator('table tbody tr', { hasText: testBi }).first();
  const rowVisible = await row.isVisible().catch(() => false);
  console.log(`  Cidadão de teste (${testBi}) visível na tabela Admin: ${rowVisible}`);

  if (!rowVisible) {
    throw new Error(`O cidadão ${testBi} não apareceu na lista de cidadãos.`);
  }

  console.log('  Acionando botão "Eliminar" na linha da tabela...');
  await row.locator('button:has-text("Eliminar")').first().click();
  await pageAdmin.waitForTimeout(1000);

  console.log('  Confirmando no Modal ("Eliminar Definitivamente")...');
  const modalBtn = pageAdmin.locator('button:has-text("Eliminar Definitivamente")').first();
  await modalBtn.click();
  await pageAdmin.waitForTimeout(5000);

  const rowsAfter = await pageAdmin.evaluate(() => {
    return Array.from(document.querySelectorAll('table tbody tr')).map(r => r.innerText.replace(/\s+/g, ' ').slice(0, 80));
  });
  console.log(`  Linhas na tabela após eliminação (${rowsAfter.length}):`, rowsAfter);

  const rowAfter = rowsAfter.some(r => r.includes(testBi));
  console.log(`  Registo ${testBi} presente nas linhas pós-eliminação: ${rowAfter ? 'SIM (ERRO)' : 'NÃO (REMOVIDO DA VISTA)'}`);

  // Verificar na base de dados
  const checkDb = await fetch(`${supabaseUrl}/rest/v1/solicitacoes_registo?bi_numero=eq.${testBi}`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const dbData = await checkDb.json();
  const dbPurged = Array.isArray(dbData) && dbData.length === 0;
  console.log(`  Purga definitiva confirmada na base de dados: ${dbPurged ? 'SIM (100% PURGADO)' : 'NÃO (RESTOS ENCONTRADOS)'}`);

  await ctxAdmin.close();
  await browser.close();

  if (rowAfter || !dbPurged) {
    throw new Error('Falha na eliminação do cidadão.');
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 TODOS OS TESTES DE VALIDAÇÃO E ESTABILIDADE FORAM APROVADOS COM SUCESSO (100%)!');
  console.log('='.repeat(80));
}

main().catch(err => {
  console.error('Falha nos testes:', err);
  process.exit(1);
});
