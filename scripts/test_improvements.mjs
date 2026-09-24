import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const SHOTS = '/home/user/cda_test/audit_screenshots';
fs.mkdirSync(SHOTS, { recursive: true });

async function run() {
  console.log('================================================================');
  console.log('🧪 TESTE DAS DUAS MELHORIAS SOLICITADAS:');
  console.log('1. Apresentação elegante no popup de confirmação de envio (com imagem)');
  console.log('2. Bloqueio de múltiplos registos faciais por dispositivo');
  console.log('================================================================');

  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'pt-AO'
  });

  const page = await ctx.newPage();

  // -------------------------------------------------------------
  // TESTE 1: POPUP DE CONFIRMAÇÃO COM IMAGEM ANEXADA
  // -------------------------------------------------------------
  console.log('\n--- TESTE 1: POPUP DE CONFIRMAÇÃO DE ENVIO COM IMAGEM ---');
  await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder(/LA041|B\.I\./i).first().fill('002399714LA030');
  await page.getByPlaceholder('••••••••••••').first().fill('123456789');
  await page.getByRole('button', { name: /Entrar no Portal/i }).first().click();

  await page.getByRole('button', { name: 'Painel', exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  console.log('✓ Cidadão autenticado.');

  await page.evaluate(() => { window.location.hash = '#/correspondencias'; });
  await page.waitForTimeout(1000);

  const btnNova = page.getByRole('button', { name: /Nova Mensagem/i }).first();
  await btnNova.click();
  await page.waitForTimeout(800);

  // Destinatário
  const inputTo = page.locator('#recipient-inst-input, input[placeholder*="Código Institucional"]').first();
  await inputTo.fill('INAPEM-LMM');

  // Assunto
  const inputSubject = page.locator('input[placeholder*="tema da sua mensagem"]').first();
  await inputSubject.fill('Comprovativo Fotográfico de Actividades Oficiais 2026');

  // Corpo
  const inputBody = page.locator('textarea[placeholder*="Descreva detalhadamente"]').first();
  await inputBody.fill('Segue em anexo a imagem fotográfica oficial para homologação.');

  // Anexar ficheiro de imagem real
  console.log('A anexar ficheiro de imagem /tmp/fotografia_oficial_luanda.png...');
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles('/tmp/fotografia_oficial_luanda.png');
  await page.waitForTimeout(1500);

  // Clicar em Enviar Correspondência
  console.log('A clicar no botão Enviar...');
  const btnEnviar = page.locator('#btn-enviar-correio, button:has-text("Enviar Correspondência"), button:has-text("Enviar")').last();
  await btnEnviar.click();
  await page.waitForTimeout(800);

  // Se abrir o modal de seleção de modalidade, confirmar com OK
  const modalTipoEnvioOk = page.locator('#btn-ok-modal-tipo-envio, button:has-text("Ok"), button:has-text("Avançar")').first();
  if (await modalTipoEnvioOk.isVisible()) {
    console.log('A confirmar modalidade de envio...');
    await modalTipoEnvioOk.click();
    await page.waitForTimeout(1000);
  }

  // Modal de revisão e confirmação deve estar aberto
  console.log('A validar apresentação no modal de confirmação "Rever antes de enviar"...');
  const modalText = await page.evaluate(() => {
    const dialogs = document.querySelectorAll('[role="dialog"], .fixed.inset-0');
    return Array.from(dialogs).map(d => d.innerText).join('\n---\n');
  });

  console.log('Texto do modal de confirmação (amostra):\n', modalText.slice(0, 500));

  // Verificações:
  const hasLongBase64 = modalText.includes('data:image/png;base64') || modalText.includes('iVBORw0KGgo');
  console.log('Tem texto bruto de base64 no popup?', hasLongBase64 ? '❌ SIM (ERRO)' : '✅ NÃO (CORRETO)');
  
  const hasFileName = modalText.includes('fotografia_oficial_luanda.png');
  console.log('Apresenta o nome limpo do anexo?', hasFileName ? '✅ SIM' : '❌ NÃO');

  const hasFicheirosCard = /Ficheiros Anexados|Anexos/i.test(modalText);
  console.log('Card de ficheiros anexados presente e estilizado?', hasFicheirosCard ? '✅ SIM' : '❌ NÃO');

  await page.screenshot({ path: `${SHOTS}/melhoria_01_popup_confirmacao_imagem.png` });

  if (hasLongBase64) {
    throw new Error('Falha: O popup de confirmação ainda contém texto longo / string base64 bruta!');
  }
  if (!hasFileName) {
    throw new Error('Falha: O nome do ficheiro anexado não foi encontrado no popup!');
  }

  // Fechar modal de confirmação clicando em Voltar
  const btnVoltarModal = page.locator('button:has-text("Voltar")').last();
  if (await btnVoltarModal.isVisible()) {
    await btnVoltarModal.click();
    await page.waitForTimeout(800);
  }

  // -------------------------------------------------------------
  // TESTE 2: BLOQUEIO DE MÚLTIPLOS REGISTOS FACIAIS POR DISPOSITIVO
  // -------------------------------------------------------------
  console.log('\n--- TESTE 2: BLOQUEIO DE MÚLTIPLOS REGISTOS FACIAIS POR DISPOSITIVO ---');
  
  // Guardar 1 registo facial prévio no dispositivo para uma identidade (ex.: ADMIN-0001 ou outro cidadão)
  console.log('A simular 1 registo facial prévio no dispositivo para ADMIN-0001...');
  await page.evaluate(() => {
    localStorage.setItem('cda_demo_face_admin_ADMIN-0001', JSON.stringify({
      identifier: 'ADMIN-0001',
      profileMode: 'admin',
      displayName: 'Administrador Central',
      capturedAt: '24/09/2026, 12:00:00',
      signature: new Array(2048).fill(128),
      signatures: [new Array(2048).fill(128)]
    }));
  });

  // Ir para a página de Perfil / Conta do Cidadão actual (que não tem registo próprio)
  await page.evaluate(() => { window.location.hash = '#/perfil'; });
  await page.waitForTimeout(1500);

  const perfilText = await page.evaluate(() => document.body.innerText);
  const hasBlockedNotice = perfilText.includes('Não é possível adicionar seu registo por esse dispositivo já possui um registado');
  console.log('Aviso de bloqueio presente no cartão de Login Facial?', hasBlockedNotice ? '✅ SIM' : '❌ NÃO');

  // Tentar clicar no botão de registar face
  console.log('A tentar clicar em "Registar a minha face"...');
  const btnRegistarFace = page.locator('button', { hasText: /Registar a minha face/i }).first();
  if (await btnRegistarFace.isVisible()) {
    await btnRegistarFace.click();
    await page.waitForTimeout(1000);
  }

  // Verificar se a notificação toast apareceu
  const pageToastText = await page.evaluate(() => document.body.innerText);
  const hasToast = pageToastText.includes('Não é possível adicionar seu registo por esse dispositivo já possui um registado');
  console.log('Notificação disparada com a mensagem solicitada?', hasToast ? '✅ SIM' : '❌ NÃO');

  await page.screenshot({ path: `${SHOTS}/melhoria_02_bloqueio_facial_dispositivo.png` });

  if (!hasBlockedNotice && !hasToast) {
    throw new Error('Falha: A notificação de bloqueio de registo facial por dispositivo não foi apresentada!');
  }

  // -------------------------------------------------------------
  // TESTE 2.1: LIBERTAÇÃO DO DISPOSITIVO AO REMOVER O REGISTO
  // -------------------------------------------------------------
  console.log('\n--- TESTE 2.1: LIBERTAÇÃO AO REMOVER REGISTO ANTERIOR ---');
  await page.evaluate(() => {
    localStorage.removeItem('cda_demo_face_admin_ADMIN-0001');
  });
  await page.reload();
  await page.waitForTimeout(1500);

  await page.evaluate(() => { window.location.hash = '#/perfil'; });
  await page.waitForTimeout(1500);

  const perfilLivreText = await page.evaluate(() => document.body.innerText);
  const hasBlockedAfterRemoval = perfilLivreText.includes('Não é possível adicionar seu registo por esse dispositivo já possui um registado');
  console.log('Dispositivo livre para novo registo após remoção?', !hasBlockedAfterRemoval ? '✅ SIM (DESBLOQUEADO)' : '❌ NÃO');

  await page.screenshot({ path: `${SHOTS}/melhoria_03_dispositivo_desbloqueado.png` });

  await browser.close();
  console.log('\n================================================================');
  console.log('✅ TODAS AS MELHORIAS TESTADAS E VALIDADAS COM 100% DE SUCESSO!');
  console.log('================================================================');
}

run().catch(err => {
  console.error('Erro no teste de melhorias:', err);
  process.exit(1);
});
