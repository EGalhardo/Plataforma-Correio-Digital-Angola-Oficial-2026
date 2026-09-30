import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE || 'http://localhost:3000';
const CID_BI = process.env.QA_BI_A || '009874562LA041';
const CID_PASS = process.env.QA_CID_PASS || '123456';

let passed = 0;
let total = 0;

function assert(cond, desc, details = '') {
  total++;
  if (cond) {
    passed++;
    console.log(`  ✅ [PASS] ${total}: ${desc}`);
  } else {
    console.error(`  ❌ [FAIL] ${total}: ${desc} -> ${details}`);
    throw new Error(`Falha no assert: ${desc}`);
  }
}

async function run() {
  console.log('='.repeat(80));
  console.log('🧪 TESTE E2E: CONTAGEM EXATA DE BADGES NOS ATALHOS DO PAINEL (CDA 2026)');
  console.log('='.repeat(80) + '\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 850 },
      locale: 'pt-PT'
    });
    const page = await context.newPage();

    // 1. Injetar correspondências de teste não lidas para cada uma das 5 categorias no localStorage
    console.log('👉 [ETAPA 1] Preparando correspondências não lidas de teste...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      const msgs = [
        {
          id: 99101,
          unread: true,
          status: 'Recebida',
          sender: 'AGT - Administração Geral Tributária',
          preview: 'Agendamento de Video-Atendimento Tributário',
          details: {
            subject: 'Notificação de Vídeo-Atendimento AGT #99101',
            body: 'Caro cidadão, foi agendado um vídeo-atendimento oficial.',
            actions: ['video-atendimento']
          }
        },
        {
          id: 99102,
          unread: true,
          status: 'Recebida',
          sender: 'Governo de Luanda',
          preview: 'Sondagem de Satisfação Municipal 2026',
          details: {
            subject: 'Inquérito de Opinião Pública sobre Serviços Locais',
            body: 'Participe na sondagem oficial.',
            actions: ['sondagem']
          }
        },
        {
          id: 99103,
          unread: true,
          status: 'Recebida',
          sender: 'Polícia Nacional',
          preview: 'Registo e Actualização de Ocorrência #99103',
          details: {
            subject: 'Relato de Ocorrência de Trânsito [GPS]',
            body: 'A sua ocorrência foi registada.',
            actions: ['ocorrencia']
          }
        },
        {
          id: 99104,
          unread: true,
          status: 'Recebida',
          sender: 'Inspecção Geral do Estado',
          preview: 'Registo de Denúncia Anónima',
          details: {
            subject: '[REGISTO DE DENÚNCIA] Denúncia de irregularidade administrativa',
            body: 'A sua denúncia foi acolhida.',
            actions: ['nova-denuncia']
          }
        },
        {
          id: 99105,
          unread: true,
          status: 'Recebida',
          sender: 'ENDE Distribuição',
          preview: 'Resposta à Reclamação de Facturação',
          details: {
            subject: '[DENÚNCIA] Reclamação sobre corte indevido de energia',
            body: 'A sua reclamação está em tratamento.',
            actions: ['reclamacao']
          }
        }
      ];

      localStorage.setItem('correio_digital_inbox', JSON.stringify(msgs));
    });

    // Recarregar a página para o estado refletir a caixa com as mensagens de teste
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 2. Fazer login se necessário
    const biInput = page.locator('input[name="cda-utilizador"], input[placeholder*="009874562LA041"], input[placeholder*="B.I."]').first();
    if (await biInput.count() > 0 && await biInput.isVisible()) {
      await biInput.fill(CID_BI);
      await page.locator('input[name="cda-senha"], input[type="password"]').first().fill(CID_PASS);
      await page.locator('button:has-text("Entrar no Portal"), button[type="submit"]').first().click();
      await page.waitForTimeout(2500);
    }

    // 3. Validar a presença dos 5 atalhos no Painel
    console.log('👉 [ETAPA 2] Verificando badges nas 5 opções do Painel...');
    const atalhos = [
      { key: 'video-atendimento', label: 'Vídeo-Atendimento', expected: '1' },
      { key: 'inqueritos', label: 'Inquéritos', expected: '1' },
      { key: 'ocorrencias', label: 'Ocorrências Locais', expected: '1' },
      { key: 'nova-denuncia', label: 'Denuncia', expected: '1' },
      { key: 'denuncias', label: 'Livro de Reclamações', expected: '1' },
    ];

    for (const atalho of atalhos) {
      const badgeLocator = page.locator(`span[data-notification-badge="${atalho.key}"]`).first();
      await badgeLocator.waitFor({ state: 'visible', timeout: 5000 });
      const badgeVal = (await badgeLocator.locator('span[aria-hidden="true"]').innerText()).trim();
      console.log(`    📊 Badge [${atalho.label}] -> Valor exibido: "${badgeVal}" (Esperado: "${atalho.expected}")`);
      assert(badgeVal === atalho.expected, `Badge de "${atalho.label}" corresponde a ${atalho.expected} correspondência não lida`);
    }

    // 4. Testar clique em Vídeo-Atendimento e verificação da navegação
    console.log('👉 [ETAPA 3] Testando navegação direta pelo atalho com badge...');
    const btnVideo = page.locator('nav button').filter({ hasText: /Vídeo-Atendimento|VideoAtendimento/i }).first();
    await btnVideo.click();
    await page.waitForTimeout(2000);
    const heading = page.locator('h3').filter({ hasText: /Video|Vídeo/i }).first();
    await heading.waitFor({ state: 'visible', timeout: 10000 });
    assert(await heading.isVisible(), 'Navegação por clique no atalho com badge 100% funcional');

    console.log('\n' + '='.repeat(80));
    console.log(`🎉 SUÍTE CONCLUÍDA: ${passed}/${total} ASSERÇÕES APROVADAS (100% SUCESSO)!`);
    console.log('='.repeat(80) + '\n');
  } catch (err) {
    console.error('❌ Falha no teste:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
