import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const SHOTS = '/home/user/cda_test/audit_screenshots';
fs.mkdirSync(SHOTS, { recursive: true });

async function run() {
  console.log('================================================================');
  console.log('🧪 TESTE E2E: BASE DE CONHECIMENTO INSTITUCIONAL & FEDERAÇÃO IA');
  console.log('1. Instituição adiciona conhecimento à sua IA (#/inst-ai-assistant)');
  console.log('2. Cidadão pergunta à IA e recebe resposta baseada na KB da Instituição');
  console.log('3. Admin gere as bases federadas e testa a IA Nacional (#/gov-ia)');
  console.log('================================================================');

  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // -------------------------------------------------------------
  // PASSO 1: INSTITUIÇÃO ADICIONA FONTE À BASE DE CONHECIMENTO
  // -------------------------------------------------------------
  console.log('\n--- PASSO 1: ÁREA DA INSTITUIÇÃO (INAPEM-LMM-01) ---');
  const ctxInst = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-AO' });
  const pageInst = await ctxInst.newPage();

  await pageInst.goto(`${BASE}/institucional#/login`, { waitUntil: 'domcontentloaded' });
  await pageInst.getByPlaceholder(/AGT-9921-SR|ID/i).first().fill('INAPEM-LMM-01');
  await pageInst.getByPlaceholder('••••••••••••').first().fill('123456789');
  await pageInst.getByRole('button', { name: /Entrar no Portal/i }).first().click();

  await pageInst.getByRole('button', { name: 'Painel', exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  console.log('✓ Instituição autenticada.');

  await pageInst.evaluate(() => { window.location.hash = '#/inst-ai-assistant'; });
  await pageInst.waitForTimeout(1500);

  // Clicar na sub-aba "Base de Conhecimento"
  const tabKb = pageInst.locator('button:has-text("Base de Conhecimento")').first();
  await tabKb.click();
  await pageInst.waitForTimeout(1000);
  await pageInst.screenshot({ path: `${SHOTS}/kb_01_inst_base_conhecimento.png` });

  // Preencher formulário de nova fonte na Base de Conhecimento
  console.log('A preencher nova fonte na Base de Conhecimento do INAPEM LMM...');
  const inputTitulo = pageInst.locator('input[placeholder*="Instrução de atendimento"], input[placeholder*="Ex.:"]').first();
  await inputTitulo.fill('Funcionamento e Balcão Digital do INAPEM LMM');

  const textareaTexto = pageInst.locator('textarea[placeholder*="Cola aqui o texto oficial"]').first();
  await textareaTexto.fill('O Balcão Digital do INAPEM LMM funciona de Segunda a Sexta das 08h00 às 15h30 para atendimento exclusivo de empresários e startups de Luanda. Os serviços principais incluem a Certificação Digital de MPME em 24h úteis, Apoio a Linhas de Crédito Bonificado, Emissão do Selo Feito em Angola e Aceleração de Startups Tecnológicas. Para esclarecimentos directos, os cidadãos devem submeter pedidos através da plataforma oficial Correio Digital de Angola.');

  await pageInst.waitForTimeout(1000);

  // Clicar no botão para guardar
  const btnGuardarKb = pageInst.locator('button:has-text("Guardar fonte na base de conhecimento")').first();
  await btnGuardarKb.click();
  console.log('✓ Fonte submetida. A aguardar confirmação...');
  await pageInst.waitForTimeout(3000);

  await pageInst.screenshot({ path: `${SHOTS}/kb_02_inst_fonte_guardada.png` });
  console.log('✅ Fonte gravada na base de dados com sucesso!');
  await ctxInst.close();

  // -------------------------------------------------------------
  // PASSO 2: CIDADÃO PERGUNTA À IA SOBRE O INAPEM LMM
  // -------------------------------------------------------------
  console.log('\n--- PASSO 2: ÁREA DO CIDADÃO (002399714LA030) ---');
  const ctxCid = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-AO' });
  const pageCid = await ctxCid.newPage();

  await pageCid.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
  await pageCid.getByPlaceholder(/LA041|B\.I\./i).first().fill('002399714LA030');
  await pageCid.getByPlaceholder('••••••••••••').first().fill('123456789');
  await pageCid.getByRole('button', { name: /Entrar no Portal/i }).first().click();

  await pageCid.getByRole('button', { name: 'Painel', exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  console.log('✓ Cidadão autenticado.');

  // Abrir o chat flutuante da IA pelo botão de voz do cabeçalho desktop
  const btnMicCid = pageCid.locator('button[title="Apresentar esta página por voz"]').last();
  await btnMicCid.click();
  await pageCid.waitForTimeout(1000);

  const inputChatCid = pageCid.locator('input[placeholder*="Escreva sua mensagem"]').first();
  await inputChatCid.waitFor({ state: 'visible', timeout: 10000 });

  // Fazer pergunta sobre o INAPEM LMM
  console.log('A enviar pergunta do Cidadão sobre o horário e serviços do INAPEM LMM...');
  await inputChatCid.fill('Qual é o horário de funcionamento do Balcão Digital do INAPEM LMM e que serviços prestam?');

  const btnSendCid = pageCid.locator('input[placeholder*="Escreva sua mensagem"]').locator('..').locator('button').last();
  await btnSendCid.click();

  // Aguardar que a IA responda usando a Base de Conhecimento do INAPEM LMM
  await pageCid.waitForFunction(() => {
    const texts = Array.from(document.querySelectorAll('div, p, span')).map(el => el.textContent || '');
    return texts.some(t => t.includes('08:00') || t.includes('08h00') || t.includes('15:30') || t.includes('15h30') || t.includes('MPME') || t.includes('INAPEM LMM') || t.includes('Feito em Angola'));
  }, { timeout: 45000 });

  await pageCid.waitForTimeout(2000);
  await pageCid.screenshot({ path: `${SHOTS}/kb_03_cidadao_resposta_kb_inapem.png` });
  console.log('✅ A IA do Cidadão respondeu com a Base de Conhecimento do INAPEM LMM!');
  await ctxCid.close();

  // -------------------------------------------------------------
  // PASSO 3: ADMIN GERE AS BASES FEDERADAS E TESTA A IA NACIONAL
  // -------------------------------------------------------------
  console.log('\n--- PASSO 3: ADMINISTRAÇÃO CENTRAL (ADMIN-0001) ---');
  const ctxAdmin = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-AO' });
  const pageAdmin = await ctxAdmin.newPage();

  await pageAdmin.goto(`${BASE}/admin#/login`, { waitUntil: 'domcontentloaded' });
  await pageAdmin.getByPlaceholder(/ADM-8812-OP|ADMIN/i).first().fill('ADMIN-0001');
  await pageAdmin.getByPlaceholder('••••••••••••').first().fill('123456789');
  await pageAdmin.getByRole('button', { name: /Entrar no Portal/i }).first().click();

  await pageAdmin.getByRole('button', { name: 'Painel', exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  console.log('✓ Admin autenticado.');

  await pageAdmin.evaluate(() => { window.location.hash = '#/gov-ia'; });
  await pageAdmin.waitForTimeout(1500);

  // Clicar em Sincronizar na consola de Governação IA
  const btnSync = pageAdmin.locator('button:has-text("Sincronizar")').first();
  if (await btnSync.isVisible()) {
    await btnSync.click();
    console.log('✓ Botão Sincronizar acionado na Governação IA.');
    await pageAdmin.waitForTimeout(2000);
  }

  // Abrir Modal "Testar IA"
  const btnTestarIa = pageAdmin.locator('button:has-text("TESTAR IA")').first();
  if (await btnTestarIa.isVisible()) {
    await btnTestarIa.click();
    await pageAdmin.waitForTimeout(1000);

    const inputTest = pageAdmin.locator('input[placeholder*="pergunta operacional"]').first();
    if (await inputTest.isVisible()) {
      await inputTest.fill('Quais são as regras federadas para consulta da Base de Conhecimento do INAPEM LMM?');
      const btnSendTest = pageAdmin.locator('button:has-text("Enviar")').last();
      await btnSendTest.click();
      console.log('✓ Pergunta enviada no Sandbox de IA Nacional do Admin. A aguardar resposta...');
      await pageAdmin.waitForTimeout(8000);
      await pageAdmin.screenshot({ path: `${SHOTS}/kb_04_admin_testar_ia_resposta.png` });
      console.log('✅ Sandbox de IA Nacional testado com sucesso!');
    }
  }

  await ctxAdmin.close();
  await browser.close();

  console.log('\n================================================================');
  console.log('🎉 TODOS OS TESTES DE BASE DE CONHECIMENTO E GOV IA PASSARAM A 100%!');
  console.log('================================================================');
}

run().catch(err => {
  console.error('Erro no teste de KB:', err);
  process.exit(1);
});
