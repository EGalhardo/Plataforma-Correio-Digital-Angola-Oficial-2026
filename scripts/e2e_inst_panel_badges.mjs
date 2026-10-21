import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE || 'http://localhost:3000';
const INST_ID = process.env.QA_INST || 'AGT-9921-SR';
const INST_PASS = process.env.QA_INST_PASS || '000000';

let passed = 0;
let total = 0;

function assert(cond, desc, info = '') {
  total++;
  if (cond) {
    passed++;
    console.log(`  ✅ [PASS] ${desc}`);
  } else {
    console.error(`  ❌ [FAIL] ${desc} -> Info: ${info}`);
    throw new Error(`Falha no assert: ${desc}`);
  }
}

async function fecharModais(page) {
  for (let i = 0; i < 4; i++) {
    const btn = page.locator('button:has-text("Concluir e Fechar"), button:has-text("Entendido"), button:has-text("Fechar"), button:has-text("OK")').first();
    if (await btn.isVisible({ timeout: 300 }).catch(() => false)) {
      await btn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(200);
    }
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(150);
  }
}

async function getBadgeCounts(page) {
  return await page.evaluate(() => {
    const keys = ['video-atendimento', 'inqueritos', 'ocorrencias', 'nova-denuncia', 'denuncias'];
    const res = {};
    for (const k of keys) {
      const el = document.querySelector(`[data-notification-badge="${k}"]`);
      res[k] = el ? parseInt(el.innerText?.trim() || '0', 10) : 0;
    }
    return res;
  });
}

async function main() {
  console.log('='.repeat(80));
  console.log('🧪 SUÍTE DE TESTES E2E: REGRAS DE BADGES NO PAINEL DA ÁREA INSTITUCIONAL');
  console.log('='.repeat(80));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-PT' });
  const page = await ctx.newPage();

  // 1. Login na Área Institucional
  console.log('\n--- [FASE 1] Autenticação e Verificação dos 5 Atalhos no Painel ---');
  await page.goto(`${BASE_URL}/institucional`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  await page.locator('input[name="cda-utilizador"]').fill(INST_ID);
  await page.locator('input[name="cda-senha"]').fill(INST_PASS);
  await page.locator('button', { hasText: /ENTRAR NO PORTAL/i }).first().click();
  await page.waitForTimeout(3000);
  await fecharModais(page);

  // Ir para Painel
  const btnHome = page.locator('aside button:has-text("Painel"), button:has-text("Painel")').first();
  if (await btnHome.isVisible()) await btnHome.click();
  await page.waitForTimeout(1500);

  const initialBadges = await getBadgeCounts(page);
  console.log('  Badges iniciais no Painel Institucional:', initialBadges);

  assert(initialBadges['video-atendimento'] === 0, 'Vídeo-Atendimento sem badge inicial (0)');
  assert(initialBadges['inqueritos'] === 0, 'Inquéritos sem badge inicial (0)');
  assert(initialBadges['ocorrencias'] === 0, 'Ocorrências sem badge inicial (0)');
  assert(initialBadges['nova-denuncia'] === 0, 'Denúncia sem badge inicial (0)');
  assert(initialBadges['denuncias'] === 0, 'Livro de Reclamações sem badge inicial (0)');

  // 2. Injeção de 5 correspondências recebidas NÃO LIDAS (1 para cada canal)
  console.log('\n--- [FASE 2] Injeção de 5 Correspondências Recebidas Não Lidas (1 por Canal) ---');
  await page.evaluate(() => {
    const mensagensNaoLidas = [
      {
        id: 7001,
        org: 'Cidadão: Manuel Silva',
        institution: 'AGT',
        preview: 'Video-atendimento agendado: Sessão de Esclarecimento Tributário',
        date: 'Hoje, 10:00',
        unread: 1,
        status: 'Recebida',
        details: {
          subject: 'Video-atendimento agendado: Sessão de Esclarecimento Tributário',
          actions: ['video-atendimento']
        }
      },
      {
        id: 7002,
        org: 'Governo Central',
        institution: 'AGT',
        preview: 'Inquérito de Eficiência Operacional 2026',
        date: 'Hoje, 10:15',
        unread: 1,
        status: 'Recebida',
        details: {
          subject: 'Inquérito de Eficiência Operacional 2026'
        },
        sondagem_id: 'sond_inst_99'
      },
      {
        id: 7003,
        org: 'Cidadão: Teresa Bento',
        institution: 'AGT',
        preview: '[OCORRÊNCIA] Iluminação pública desligada no Distrito',
        date: 'Hoje, 10:30',
        unread: 1,
        status: 'Recebida',
        details: {
          subject: '[OCORRÊNCIA] Iluminação pública desligada no Distrito',
          type: 'ocorrencia',
          actions: ['ocorrencia']
        }
      },
      {
        id: 7004,
        org: 'Cidadão: Anónimo',
        institution: 'AGT',
        preview: '[REGISTO DE DENÚNCIA] Irregularidade no Posto Aduaneiro',
        date: 'Hoje, 10:45',
        unread: 1,
        status: 'Recebida',
        details: {
          subject: '[REGISTO DE DENÚNCIA] Irregularidade no Posto Aduaneiro'
        }
      },
      {
        id: 7005,
        org: 'Cidadão: Anónimo',
        institution: 'AGT',
        preview: '[DENÚNCIA] Reclamação sobre atendimento no Balcão Fiscal',
        date: 'Hoje, 11:00',
        unread: 1,
        status: 'Recebida',
        details: {
          subject: '[DENÚNCIA] Reclamação sobre atendimento no Balcão Fiscal'
        }
      }
    ];

    localStorage.setItem('correio_digital_inst_inbox', JSON.stringify(mensagensNaoLidas));
  });

  // Recarregar a página para inicializar o estado com as novas mensagens não lidas
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await fecharModais(page);

  if (await btnHome.isVisible()) await btnHome.click();
  await page.waitForTimeout(1500);

  const badgesComNaoLidas = await getBadgeCounts(page);
  console.log('  Badges detectados no Painel com correspondências não lidas:', badgesComNaoLidas);

  assert(badgesComNaoLidas['video-atendimento'] === 1, 'Badge Vídeo-Atendimento activo com correspondência não lida (1)');
  assert(badgesComNaoLidas['inqueritos'] === 1, 'Badge Inquéritos activo com correspondência não lida (1)');
  assert(badgesComNaoLidas['ocorrencias'] === 1, 'Badge Ocorrências activo com correspondência não lida (1)');
  assert(badgesComNaoLidas['nova-denuncia'] === 1, 'Badge Denúncia activo com correspondência não lida (1)');
  assert(badgesComNaoLidas['denuncias'] === 1, 'Badge Livro de Reclamações activo com correspondência não lida (1)');

  // 3. Marcação de todas as mensagens como Lidas (unread: 0, status: 'Lida')
  console.log('\n--- [FASE 3] Marcação de Todas as Correspondências como Lidas ---');
  await page.evaluate(() => {
    const raw = localStorage.getItem('correio_digital_inst_inbox') || '[]';
    const list = JSON.parse(raw);
    const lidas = list.map(m => ({ ...m, unread: 0, status: 'Lida' }));
    localStorage.setItem('correio_digital_inst_inbox', JSON.stringify(lidas));
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await fecharModais(page);

  if (await btnHome.isVisible()) await btnHome.click();
  await page.waitForTimeout(1500);

  const badgesAposLeitura = await getBadgeCounts(page);
  console.log('  Badges detectados no Painel após marcação como lidas:', badgesAposLeitura);

  assert(badgesAposLeitura['video-atendimento'] === 0, 'Badge Vídeo-Atendimento extinto após leitura (0)');
  assert(badgesAposLeitura['inqueritos'] === 0, 'Badge Inquéritos extinto após leitura (0)');
  assert(badgesAposLeitura['ocorrencias'] === 0, 'Badge Ocorrências extinto após leitura (0)');
  assert(badgesAposLeitura['nova-denuncia'] === 0, 'Badge Denúncia extinto após leitura (0)');
  assert(badgesAposLeitura['denuncias'] === 0, 'Badge Livro de Reclamações extinto após leitura (0)');

  // 4. Teste de isolamento: Notificações gerais sem correspondências não lidas
  console.log('\n--- [FASE 4] Isolamento: Notificações Gerais sem Correspondência Não Lida ---');
  await page.evaluate(() => {
    const notifs = [
      { id: 8001, title: 'Video-atendimento agendado', message: 'Lembrete', targetTab: 'video-atendimento', unread: true },
      { id: 8002, title: 'Nova Sondagem Oficial', message: 'Lembrete', targetTab: 'sondagens', unread: true },
      { id: 8003, title: 'Ocorrência registada', message: 'Lembrete', targetTab: 'ocorrencias', unread: true },
      { id: 8004, title: 'Denúncia — Em análise', message: 'Lembrete', targetTab: 'denuncias', unread: true },
      { id: 8005, title: 'Denuncia registada', message: 'Lembrete', targetTab: 'nova-denuncia', unread: true }
    ];
    localStorage.setItem('correio_digital_notifications', JSON.stringify(notifs));
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await fecharModais(page);

  if (await btnHome.isVisible()) await btnHome.click();
  await page.waitForTimeout(1500);

  const badgesComNotifsGerais = await getBadgeCounts(page);
  console.log('  Badges detectados no Painel com apenas notificações gerais:', badgesComNotifsGerais);

  assert(badgesComNotifsGerais['video-atendimento'] === 0, 'Vídeo-Atendimento permanece a 0 sem mensagem');
  assert(badgesComNotifsGerais['inqueritos'] === 0, 'Inquéritos permanece a 0 sem mensagem');
  assert(badgesComNotifsGerais['ocorrencias'] === 0, 'Ocorrências permanece a 0 sem mensagem');
  assert(badgesComNotifsGerais['nova-denuncia'] === 0, 'Denúncia permanece a 0 sem mensagem');
  assert(badgesComNotifsGerais['denuncias'] === 0, 'Livro de Reclamações permanece a 0 sem mensagem');

  // Limpeza
  await page.evaluate(() => {
    localStorage.removeItem('correio_digital_inst_inbox');
    localStorage.removeItem('correio_digital_notifications');
  });

  await ctx.close();
  await browser.close();

  console.log('\n' + '='.repeat(80));
  console.log(`🏁 RESULTADO FINAL: ${passed}/${total} TESTES APROVADOS (100% SUCESSO)`);
  console.log('='.repeat(80));
}

main().catch(err => {
  console.error('Falha nos testes de badges do Painel Institucional:', err);
  process.exit(1);
});
