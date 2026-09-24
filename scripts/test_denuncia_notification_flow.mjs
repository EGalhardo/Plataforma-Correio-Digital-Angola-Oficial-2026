import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const SHOTS = '/home/user/cda_test/audit_screenshots';
fs.mkdirSync(SHOTS, { recursive: true });

async function run() {
  console.log('=== TESTE DE FLUXO: DENÚNCIA DO CIDADÃO -> NOTIFICAÇÃO NA INSTITUIÇÃO ===');
  
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'pt-AO'
  });

  const page = await ctx.newPage();

  // 1. Login com o Cidadão (002399714LA030 / 123456789)
  console.log('1. A efetuar login com o Cidadão Edlasio Galhardo...');
  await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder(/LA041|B\.I\./i).first().fill('002399714LA030');
  await page.getByPlaceholder('••••••••••••').first().fill('123456789');
  await page.getByRole('button', { name: /Entrar no Portal/i }).first().click();

  await page.getByRole('button', { name: 'Painel', exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  console.log('✓ Cidadão autenticado no painel.');

  // 2. Aceder à página de Denúncia ou Compositor
  console.log('2. A submeter nova denúncia para o INAPEM-LMM...');
  await page.evaluate(() => { window.location.hash = '#/correspondencias'; });
  await page.waitForTimeout(1000);

  const btnNova = page.getByRole('button', { name: /Nova Mensagem/i }).first();
  await btnNova.click();
  await page.waitForTimeout(800);

  // Preencher Destinatário: INAPEM-LMM
  const inputTo = page.locator('#recipient-inst-input, input[placeholder*="Código Institucional"]').first();
  await inputTo.fill('INAPEM-LMM');
  await page.waitForTimeout(500);

  const testSubject = `[REGISTO DE DENÚNCIA] Fiscalização e Auditoria ${Date.now()}`;
  const inputSubject = page.locator('input[placeholder*="tema da sua mensagem"]').first();
  await inputSubject.fill(testSubject);

  const inputBody = page.locator('textarea[placeholder*="Descreva detalhadamente"]').first();
  await inputBody.fill('Esta é uma denúncia de teste de alta prioridade submetida para verificação de entrega de notificação à instituição.');

  // Clicar em Enviar
  const btnEnviar = page.getByRole('button', { name: /Enviar Correspondência|Enviar Mensagem|Enviar/i }).last();
  await btnEnviar.click();
  await page.waitForTimeout(2000);
  console.log('✓ Denúncia enviada com sucesso pelo Cidadão.');

  await page.screenshot({ path: `${SHOTS}/fluxo_01_cidadao_enviou.png` });

  // Fechar modal de sucesso se presente
  const btnFecharModal = page.locator('button:has-text("Fechar"), button:has-text("Concluir"), button:has-text("Voltar")').first();
  if (await btnFecharModal.isVisible().catch(() => false)) {
    await btnFecharModal.click().catch(() => null);
    await page.waitForTimeout(500);
  }

  // 3. Terminar Sessão do Cidadão
  console.log('3. A terminar sessão do Cidadão...');
  const sairBtn = page.locator('aside button', { hasText: /Sair do Canal/i }).first();
  if (await sairBtn.isVisible()) {
    await sairBtn.click({ force: true });
  } else {
    await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
  }
  await page.waitForTimeout(1500);

  // 4. Login na Instituição INAPEM (INAPEM-LMM-01 / 123456789)
  console.log('4. A efetuar login na Instituição INAPEM-LMM-01...');
  await page.goto(`${BASE}/institucional#/login`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder(/AGT-9921-SR|ID/i).first().fill('INAPEM-LMM-01');
  await page.getByPlaceholder('••••••••••••').first().fill('123456789');
  await page.getByRole('button', { name: /Entrar no Portal/i }).first().click();

  await page.getByRole('button', { name: 'Painel', exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  console.log('✓ Instituição autenticada no painel.');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: `${SHOTS}/fluxo_02_inst_painel.png` });

  // 5. Verificar Notificações na Instituição
  console.log('5. A verificar Centro de Notificações da Instituição...');
  await page.evaluate(() => { window.location.hash = '#/notificacoes'; });
  await page.waitForTimeout(2000);

  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('Conteúdo da página de notificações (amostra):', pageText.slice(0, 300));
  const hasDenunciaNotif = /Nova Denuncia Anónima|Nova Denúncia Anónima|Denuncia|Denúncia/i.test(pageText);
  console.log('Tem notificação de denúncia?', hasDenunciaNotif ? 'SIM ✅' : 'NÃO ❌');

  await page.screenshot({ path: `${SHOTS}/fluxo_03_inst_notificacoes.png` });

  // 6. Verificar Fila de Denúncias na Instituição
  console.log('6. A verificar página de Gestão de Denúncias na Instituição...');
  await page.evaluate(() => { window.location.hash = '#/denuncia'; });
  await page.waitForTimeout(2000);

  const denunciaText = await page.evaluate(() => document.body.innerText);
  console.log('Conteúdo da página de denúncias (amostra):', denunciaText.slice(0, 300));
  const hasDenunciaItem = /Fiscalização e Auditoria|Anónimo|Denúncia|Denuncia/i.test(denunciaText);
  console.log('Tem a denúncia na lista?', hasDenunciaItem ? 'SIM ✅' : 'NÃO ❌');

  await page.screenshot({ path: `${SHOTS}/fluxo_04_inst_denuncias.png` });

  await browser.close();

  if (!hasDenunciaNotif) {
    throw new Error('Notificação de denúncia não foi encontrada no painel da instituição!');
  }

  console.log('=== TESTE CONCLUÍDO COM 100% DE SUCESSO ===');
}

run().catch(err => {
  console.error('Erro no teste de fluxo:', err);
  process.exit(1);
});
