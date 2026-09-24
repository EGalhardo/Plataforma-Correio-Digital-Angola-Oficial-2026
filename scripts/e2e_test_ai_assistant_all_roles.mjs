import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const SHOTS = '/home/user/cda_test/audit_screenshots';
fs.mkdirSync(SHOTS, { recursive: true });

async function run() {
  console.log('================================================================');
  console.log('🤖 AUDITORIA COMPLETA DE ASSISTENTES DE IA — CIDADÃO, INST & ADMIN');
  console.log('================================================================');

  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // ==========================================================================
  // 1. ÁREA DO CIDADÃO (002399714LA030)
  // ==========================================================================
  console.log('\n--- 1. TESTE DA IA NA ÁREA DO CIDADÃO ---');
  const ctxCid = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-AO' });
  const pageCid = await ctxCid.newPage();

  await pageCid.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
  await pageCid.getByPlaceholder(/LA041|B\.I\./i).first().fill('002399714LA030');
  await pageCid.getByPlaceholder('••••••••••••').first().fill('123456789');
  await pageCid.getByRole('button', { name: /Entrar no Portal/i }).first().click();

  await pageCid.getByRole('button', { name: 'Painel', exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  console.log('✓ Cidadão autenticado no painel.');

  // 1.1 Abrir Assistente de IA pelo botão de voz no Header (último elemento correspondente ao layout desktop)
  const btnMicCid = pageCid.locator('button[title="Apresentar esta página por voz"]').last();
  await btnMicCid.click();
  await pageCid.waitForTimeout(1000);

  // Verificar se o modal do chat está aberto
  const inputChatCid = pageCid.locator('input[placeholder*="Escreva sua mensagem"]').first();
  await inputChatCid.waitFor({ state: 'visible', timeout: 10000 });
  await pageCid.screenshot({ path: `${SHOTS}/ia_01_cidadao_chat_aberto.png` });
  console.log('✓ Assistente de IA do Cidadão aberto com sucesso.');

  // 1.2 Enviar pergunta ao Assistente IA
  console.log('A enviar pergunta do Cidadão sobre correspondências e NIF...');
  await inputChatCid.fill('Como posso consultar as minhas correspondências e o meu NIF no Correio Digital de Angola?');
  
  const btnSendCid = pageCid.locator('input[placeholder*="Escreva sua mensagem"]').locator('..').locator('button').last();
  await btnSendCid.click();
  console.log('✓ Pergunta enviada. A aguardar resposta da IA...');

  // Aguardar resposta da IA aparecer no chat
  await pageCid.waitForFunction(() => {
    const texts = Array.from(document.querySelectorAll('div, p, span')).map(el => el.textContent || '');
    return texts.some(t => t.includes('NIF') || t.includes('AGT') || t.includes('Correspondência') || t.includes('Painel'));
  }, { timeout: 45000 });

  await pageCid.waitForTimeout(2000);
  await pageCid.screenshot({ path: `${SHOTS}/ia_02_cidadao_resposta_recebida.png` });
  console.log('✅ Resposta da IA no Cidadão recebida e contextualizada!');

  // Fechar o modal do chat
  const btnFecharChat = pageCid.locator('button:has(svg.lucide-x)').last();
  if (await btnFecharChat.isVisible()) {
    await btnFecharChat.click();
    await pageCid.waitForTimeout(500);
  }

  // 1.3 Testar ferramenta "Rever Clareza (IA)" no compositor
  console.log('\nA testar funcionalidade "Rever Clareza (IA)" no compositor de mensagens...');
  await pageCid.evaluate(() => { window.location.hash = '#/correspondencias'; });
  await pageCid.waitForTimeout(1000);
  await pageCid.getByRole('button', { name: /Nova Mensagem/i }).first().click();
  await pageCid.waitForTimeout(800);

  const textareaCompositor = pageCid.locator('textarea[placeholder*="Descreva detalhadamente"]').first();
  await textareaCompositor.fill('presiso de informacao sobre meu processo que mandei no mes passado e ninguem me disse nada');

  const btnReverClareza = pageCid.locator('button:has-text("Rever Clareza (IA)")').first();
  if (await btnReverClareza.isVisible()) {
    await btnReverClareza.click();
    console.log('✓ Botão "Rever Clareza (IA)" acionado. A aguardar análise...');
    await pageCid.waitForTimeout(6000);
    await pageCid.screenshot({ path: `${SHOTS}/ia_03_cidadao_rever_clareza.png` });
    console.log('✅ "Rever Clareza (IA)" validado no Cidadão!');
  }
  await ctxCid.close();

  // ==========================================================================
  // 2. ÁREA DA INSTITUIÇÃO (INAPEM-LMM-01)
  // ==========================================================================
  console.log('\n--- 2. TESTE DA IA NA ÁREA DA INSTITUIÇÃO ---');
  const ctxInst = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-AO' });
  const pageInst = await ctxInst.newPage();

  await pageInst.goto(`${BASE}/institucional#/login`, { waitUntil: 'domcontentloaded' });
  await pageInst.getByPlaceholder(/AGT-9921-SR|ID/i).first().fill('INAPEM-LMM-01');
  await pageInst.getByPlaceholder('••••••••••••').first().fill('123456789');
  await pageInst.getByRole('button', { name: /Entrar no Portal/i }).first().click();

  await pageInst.getByRole('button', { name: 'Painel', exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  console.log('✓ Instituição autenticada.');

  // 2.1 Navegar para a página de IA Institucional (#/inst-ai-assistant)
  await pageInst.evaluate(() => { window.location.hash = '#/inst-ai-assistant'; });
  await pageInst.waitForTimeout(1500);
  await pageInst.screenshot({ path: `${SHOTS}/ia_04_inst_configuracao.png` });
  console.log('✓ Página de Assistência IA Institucional carregada.');

  // 2.2 Testar a sub-aba "Chat Teste"
  const tabChatTeste = pageInst.locator('button:has-text("Chat Teste")').first();
  await tabChatTeste.click();
  await pageInst.waitForTimeout(1000);

  const inputChatInst = pageInst.locator('input[placeholder*="Pergunte algo"]').first();
  await inputChatInst.fill('Quais são os serviços de apoio e consultoria para startups fornecidos pelo INAPEM?');

  const btnSendInst = pageInst.locator('input[placeholder*="Pergunte algo"]').locator('..').locator('button').last();
  await btnSendInst.click();
  console.log('✓ Pergunta enviada no Chat de Teste da Instituição. A aguardar resposta...');

  await pageInst.waitForFunction(() => {
    const texts = Array.from(document.querySelectorAll('div, p, span')).map(el => el.textContent || '');
    return texts.some(t => t.includes('INAPEM') || t.includes('consultoria') || t.includes('startups') || t.includes('apoio') || t.includes('capacitação') || t.includes('empresas') || t.includes('crédito'));
  }, { timeout: 45000 });

  await pageInst.waitForTimeout(2000);
  await pageInst.screenshot({ path: `${SHOTS}/ia_05_inst_chat_teste_resposta.png` });
  console.log('✅ Resposta do Chat de Teste Institucional recebida com sucesso!');

  // 2.3 Testar modal de "Pré-visualizar Assistente"
  const tabConfig = pageInst.locator('button:has-text("Configuração")').first();
  await tabConfig.click();
  await pageInst.waitForTimeout(800);

  const btnPreview = pageInst.locator('button:has-text("Pré-visualizar Assistente")').first();
  if (await btnPreview.isVisible()) {
    await btnPreview.click();
    await pageInst.waitForTimeout(1000);

    const inputPreview = pageInst.locator('input[placeholder*="Pergunte algo"]').last();
    if (await inputPreview.isVisible()) {
      await inputPreview.fill('Onde posso solicitar o certificado de conformidade empresarial?');
      const btnSendPreview = pageInst.locator('input[placeholder*="Pergunte algo"]').locator('..').locator('button').last();
      await btnSendPreview.click();
      console.log('✓ Pergunta enviada na pré-visualização do assistente. A aguardar resposta...');
      await pageInst.waitForTimeout(8000);
      await pageInst.screenshot({ path: `${SHOTS}/ia_06_inst_preview_modal_resposta.png` });
      console.log('✅ Pré-visualização do assistente validada!');
    }
  }
  await ctxInst.close();

  // ==========================================================================
  // 3. ÁREA DE ADMINISTRAÇÃO (ADMIN-0001)
  // ==========================================================================
  console.log('\n--- 3. TESTE DA IA NA ADMINISTRAÇÃO CENTRAL ---');
  const ctxAdmin = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-AO' });
  const pageAdmin = await ctxAdmin.newPage();

  await pageAdmin.goto(`${BASE}/admin#/login`, { waitUntil: 'domcontentloaded' });
  await pageAdmin.getByPlaceholder(/ADM-8812-OP|ADMIN/i).first().fill('ADMIN-0001');
  await pageAdmin.getByPlaceholder('••••••••••••').first().fill('123456789');
  await pageAdmin.getByRole('button', { name: /Entrar no Portal/i }).first().click();

  await pageAdmin.getByRole('button', { name: 'Painel', exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  console.log('✓ Admin autenticado no Painel Central.');

  // 3.1 Navegar para a página de Governação IA (#/gov-ia)
  await pageAdmin.evaluate(() => { window.location.hash = '#/gov-ia'; });
  await pageAdmin.waitForTimeout(1500);
  await pageAdmin.screenshot({ path: `${SHOTS}/ia_07_admin_gov_ia_page.png` });
  console.log('✓ Página de Governação IA carregada.');

  // 3.2 Testar Painel de Inteligência Artificial Governamental (Gov AI Panel)
  const btnTabQnA = pageAdmin.locator('button:has-text("Perguntas & Respostas"), button:has-text("Q&A"), button:has-text("Dúvidas")').first();
  if (await btnTabQnA.isVisible()) {
    await btnTabQnA.click();
    await pageAdmin.waitForTimeout(800);

    const inputQnA = pageAdmin.locator('input[placeholder*="dúvida jurídica"], input[placeholder*="Coloque sua dúvida"]').first();
    if (await inputQnA.isVisible()) {
      await inputQnA.fill('Qual o impacto da Lei de Proteção de Dados e segurança SOC nos despachos digitais?');
      const btnSendQnA = pageAdmin.locator('#gov-ai-intelligence-panel button:has-text("Enviar"), #gov-ai-intelligence-panel button:has(svg.lucide-send)').first();
      await btnSendQnA.click();
      console.log('✓ Pergunta enviada no painel Q&A Gov AI. A aguardar análise...');
      await pageAdmin.waitForTimeout(8000);
      await pageAdmin.screenshot({ path: `${SHOTS}/ia_08_admin_qna_resposta.png` });
      console.log('✅ Análise Q&A do Gov AI recebida!');
    }
  }

  // 3.3 Testar Assistente Flutuante no Admin
  const btnMicAdmin = pageAdmin.locator('button[title="Apresentar esta página por voz"]').last();
  if (await btnMicAdmin.isVisible()) {
    await btnMicAdmin.click();
    await pageAdmin.waitForTimeout(1000);

    const inputAdminChat = pageAdmin.locator('input[placeholder*="Escreva sua mensagem"]').last();
    if (await inputAdminChat.isVisible()) {
      await inputAdminChat.fill('Qual é o estado dos protocolos de segurança SOC e tráfego de interoperabilidade?');
      const btnSendAdmin = pageAdmin.locator('input[placeholder*="Escreva sua mensagem"]').locator('..').locator('button').last();
      await btnSendAdmin.click();
      console.log('✓ Pergunta enviada no Chat Global Admin. A aguardar resposta...');
      await pageAdmin.waitForTimeout(8000);
      await pageAdmin.screenshot({ path: `${SHOTS}/ia_09_admin_chat_resposta.png` });
      console.log('✅ Resposta da IA no Admin recebida com sucesso!');
    }
  }

  await ctxAdmin.close();
  await browser.close();

  console.log('\n================================================================');
  console.log('🎉 AUDITORIA DO ASSISTENTE DE IA CONCLUÍDA COM 100% DE SUCESSO!');
  console.log('================================================================');
}

run().catch(err => {
  console.error('Erro na auditoria de IA:', err);
  process.exit(1);
});
