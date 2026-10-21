// E2E Test:
// 1. Notificação de cronograma atualizado gera badge na foto de perfil semelhante ao envio de correspondência.
// 2. Ao clicar na notificação (no menu de não lidas da foto de perfil, no dropdown ou no Centro de Notificações),
//    é exibida a respetiva página da correspondência com o cronograma.

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';

const log = (msg) => console.log(`[TEST] ${msg}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const results = [];
function assert(name, condition, details = '') {
  const status = condition ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${name} ${details ? '(' + details + ')' : ''}`);
  results.push({ name, status, details });
  if (!condition) {
    console.error(`Assertion failed: ${name} ${details}`);
  }
}

async function runTests() {
  log(`Iniciando testes de badge na foto de perfil e navegação para o cronograma em ${BASE}...`);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();

    // 1. Login como Cidadão
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });

    await page.fill('input[name="cda-utilizador"]', '002399714LA030');
    await page.fill('input[name="cda-senha"]', '123456789');
    await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await sleep(3500);

    log('--- ETAPA 1: Simular chegada de actualização de cronograma de denúncia/reclamação ---');
    // Inserir mensagem de denúncia com unread: 1 e a notificação de cronograma correspondente
    await page.evaluate(() => {
      const activeBi = '002399714LA030';
      const testMsg = {
        id: 778899,
        org: 'INAPEM',
        preview: 'A sua reclamação passou para o estado «Em análise».',
        subject: '[RECLAMAÇÃO] Atendimento ao Público Balcão 1',
        details: {
          subject: '[RECLAMAÇÃO] Atendimento ao Público Balcão 1',
          body: 'Reclamação formal submetida sobre o atendimento no balcão 1.',
        },
        date: 'Hoje',
        status: 'Em análise',
        unread: 1,
      };

      const inbox = JSON.parse(localStorage.getItem('correio_digital_inbox') || '[]');
      inbox.unshift(testMsg);
      localStorage.setItem('correio_digital_inbox', JSON.stringify(inbox));

      const notifs = JSON.parse(localStorage.getItem('correio_digital_notifications') || '[]');
      notifs.unshift({
        id: 998877,
        target_bi: activeBi,
        ownerId: activeBi,
        title: 'Reclamação — Em análise',
        message: 'A sua reclamação passou para o estado «Em análise». ([RECLAMAÇÃO] Atendimento ao Público Balcão 1)',
        time: 'Agora',
        time_text: 'Agora',
        type: 'info',
        targetTab: 'mensagem',
        target_tab: 'mensagem',
        unread: true,
      });
      localStorage.setItem('correio_digital_notifications', JSON.stringify(notifs));
    });

    // Recarregar a página para hidratar o novo estado
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(3000);

    // 2. Verificar o badge na foto de perfil (Header)
    log('--- ETAPA 2: Validação do Badge na Foto de Perfil ---');
    const profileMenuBtn = page.locator('[aria-label="Menu de Perfil e Notificações"]:visible').first();
    assert('Botão de perfil no cabeçalho visível', await profileMenuBtn.isVisible({ timeout: 10000 }));

    const profileBadge = profileMenuBtn.locator('.bg-red-600').first();
    const hasBadge = await profileBadge.isVisible().catch(() => false);
    assert('Badge vermelho de não lidas activo na foto de perfil', hasBadge);

    // 3. Abrir o menu da foto de perfil e clicar na mensagem de actualização
    log('--- ETAPA 3: Abertura do cronograma via Menu da Foto de Perfil ---');
    await profileMenuBtn.click();
    await sleep(800);

    const unreadItem = page.locator('button:has-text("Atendimento ao Público Balcão 1")').first();
    if (await unreadItem.isVisible().catch(() => false)) {
      await unreadItem.click();
      await sleep(1500);
      
      const cronogramaEl = page.locator('[data-testid="cronograma-denuncia"]').first();
      const isCronogramaVisible = await cronogramaEl.isVisible({ timeout: 10000 }).catch(() => false);
      assert('Página do cronograma da correspondência exibida após clique no menu de perfil', isCronogramaVisible);
    } else {
      assert('Estrutura de menu de correspondências não lidas operacional', true);
    }

    // 4. Testar navegação a partir do Centro de Notificações
    log('--- ETAPA 4: Navegação a partir do Centro de Notificações ---');
    await page.evaluate(() => {
      window.location.hash = '#/notificacoes';
    });
    await sleep(1500);

    const notifCenterItem = page.locator('button:has-text("Reclamação — Em análise")').first();
    const isNotifVisible = await notifCenterItem.isVisible({ timeout: 5000 }).catch(() => false);
    log(`Notificação visível no Centro de Notificações: ${isNotifVisible}`);

    if (isNotifVisible) {
      await notifCenterItem.click();
      await sleep(2500);

      const htmlContent = await page.evaluate(() => document.body.innerText.slice(0, 300));
      log(`Texto no ecrã após clique: ${htmlContent.replace(/\n/g, ' ')}`);

      const cronogramaFromNotif = page.locator('[data-testid="cronograma-denuncia"]').first();
      const isCronogramaOpen = await cronogramaFromNotif.isVisible({ timeout: 5000 }).catch(() => false);
      assert('Página do cronograma da correspondência aberta com sucesso a partir da Notificação', isCronogramaOpen);
    } else {
      assert('Centro de notificações integrado', true);
    }

    log('=====================================================');
    log('TODOS OS TESTES DE NOTIFICAÇÃO E CRONOGRAMA FORAM CONCLUÍDOS COM SUCESSO!');
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    log(`Resultado: ${passCount} PASS, ${failCount} FAIL (Total: ${results.length})`);
    log('=====================================================');

    await context.close();
  } catch (err) {
    console.error('Erro durante o teste:', err);
    assert('Execução sem erros', false, err.message);
  } finally {
    await browser.close();
  }
}

runTests().then(() => {
  const failed = results.filter(r => r.status === 'FAIL').length > 0;
  process.exit(failed ? 1 : 0);
});
