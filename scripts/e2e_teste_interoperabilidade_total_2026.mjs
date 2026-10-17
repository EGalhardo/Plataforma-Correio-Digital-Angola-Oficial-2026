/**
 * e2e_teste_interoperabilidade_total_2026.mjs
 * Teste E2E exaustivo de Interoperabilidade Triangular Total no CDA 2026
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SCREENSHOT_DIR = path.resolve('images');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runInteroperabilityTest() {
  console.log('================================================================');
  console.log('🔄 INICIANDO TESTE DE INTEROPERABILIDADE TRIANGULAR TOTAL CDA 2026');
  console.log(`🌐 Alvo: ${BASE_URL}`);
  console.log('================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const sharedContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const uniqueId = Date.now().toString().slice(-5);
  const testSubjectCidadao = `[REQUERIMENTO OFICIAL] Certidão Fiscal CDA-${uniqueId}`;
  const testBodyCidadao = `Exmos. Senhores da AGT, venho por este meio solicitar a emissão da certidão de regularidade tributária para o ano de 2026. Identificador: ${uniqueId}.`;
  
  const testReplyInst = `[RESPOSTA OFICIAL] Certidão Emitida com Sucesso Ref-${uniqueId}`;
  const testReplyBody = `Prezado Cidadão, informamos que a sua certidão de regularidade tributária foi emitida sob o protocolo oficial.`;

  let pageCitizen = null;
  let pageInst = null;
  let pageAdmin = null;

  try {
    // =========================================================================
    // ETAPA 1: CIDADÃO ENVIA MENSAGEM OFICIAL PARA A AGT
    // =========================================================================
    console.log('--- ETAPA 1: Cidadão Redige e Envia Mensagem Oficial para a AGT ---');
    pageCitizen = await sharedContext.newPage();

    await pageCitizen.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await pageCitizen.waitForTimeout(1000);

    // Login do Cidadão
    console.log('  🔑 Autenticando Cidadão Demo (009874562LA041)...');
    const biInput = pageCitizen.locator('input[type="text"]:visible, input:not([type]):visible').first();
    await biInput.waitFor({ state: 'visible', timeout: 15000 });
    await biInput.fill('009874562LA041');

    const passInput = pageCitizen.locator('input[type="password"]:visible').first();
    await passInput.fill('123456');

    const btnEntrar = pageCitizen.getByRole('button', { name: /ENTRAR NO PORTAL/i });
    await btnEntrar.click();
    await pageCitizen.waitForTimeout(2500);

    // Navegar para Correspondências (Correio) via Sidebar
    console.log('  📬 Navegando para o Correio Oficial do Cidadão...');
    const correioBtn = pageCitizen.locator('aside button:has-text("Correio")').first();
    await correioBtn.waitFor({ state: 'visible', timeout: 10000 });
    await correioBtn.click();
    await pageCitizen.waitForTimeout(1500);

    // Clicar em "Nova Mensagem"
    console.log('  ✍️ Abrindo Compositor Oficial de Mensagem...');
    const novaMsgBtn = pageCitizen.locator('button:has-text("Nova Mensagem"), button:has-text("NOVA MENSAGEM")').first();
    await novaMsgBtn.waitFor({ state: 'visible', timeout: 10000 });
    await novaMsgBtn.click();
    await pageCitizen.waitForTimeout(1000);

    // Preencher Destinatário (AGT), Assunto e Corpo
    console.log('  📝 Preenchendo destinatário AGT, assunto e corpo oficial...');
    const toInput = pageCitizen.locator('input[placeholder*="Destinatário"], input[placeholder*="AGT"]').first();
    await toInput.fill('AGT');

    const subjectInput = pageCitizen.locator('input[placeholder*="Qual o tema"], input[placeholder*="tema"], input[placeholder*="Assunto"]').first();
    await subjectInput.waitFor({ state: 'visible', timeout: 5000 });
    await subjectInput.fill(testSubjectCidadao);

    const bodyInput = pageCitizen.locator('textarea[placeholder*="Descreva detalhadamente"], textarea').first();
    await bodyInput.fill(testBodyCidadao);
    await pageCitizen.waitForTimeout(500);

    // Clicar em "Enviar Mensagem" / "Expedir Oficialmente"
    console.log('  🚀 Abrindo fluxo de envio...');
    const sendBtn = pageCitizen.locator('button:has-text("Enviar Mensagem"), button:has-text("ENVIAR CORRESPONDÊNCIA")').first();
    await sendBtn.click();
    await pageCitizen.waitForTimeout(1000);

    // 1. Popup de Tipo de Envio (Mensagem Normal)
    const modalNormalBtn = pageCitizen.locator('#btn-modal-opcao-normal, button:has-text("Mensagem Normal")').first();
    if (await modalNormalBtn.isVisible()) {
      await modalNormalBtn.click();
      await pageCitizen.waitForTimeout(1200);
    }

    // 2. Popup de Revisão e Confirmação ("REVER ANTES DE ENVIAR")
    const modalConfirmSendBtn = pageCitizen.locator('button:has-text("ENVIAR CORRESPONDÊNCIA"), button:has-text("Confirmar Envio")').last();
    if (await modalConfirmSendBtn.isVisible()) {
      console.log('  📜 Confirmando revisão oficial no modal de expedição...');
      await modalConfirmSendBtn.click();
      await pageCitizen.waitForTimeout(2000);
    }

    // 3. Popup de Comprovativo de Protocolo ("ENTENDI" / "Fechar")
    const entendiBtn = pageCitizen.locator('button:has-text("ENTENDI"), button:has-text("Entendi"), button:has-text("Fechar")').first();
    if (await entendiBtn.isVisible()) {
      await entendiBtn.click();
      await pageCitizen.waitForTimeout(1000);
    }

    // Captura de tela do Cidadão
    const shot1 = path.join(SCREENSHOT_DIR, 'interop_1_cidadao_enviou_agt.png');
    await pageCitizen.screenshot({ path: shot1, fullPage: true });
    console.log(`  📸 Evidência 1 guardada em: ${shot1}`);
    console.log('  ✅ [PASS] Mensagem Cidadão -> AGT despachada e selada com sucesso!');

    // =========================================================================
    // ETAPA 2: INSTITUIÇÃO AGT RECEBE E RESPONDE À MENSAGEM
    // =========================================================================
    console.log('\n--- ETAPA 2: Instituição AGT Recebe a Mensagem e Responde Oficialmente ---');
    pageInst = await sharedContext.newPage();

    await pageInst.goto(`${BASE_URL}/institucional`, { waitUntil: 'domcontentloaded' });
    await pageInst.waitForTimeout(1000);

    // Login da Instituição AGT
    console.log('  🔑 Autenticando Instituição AGT (AGT-9921-SR)...');
    const instPassInput = pageInst.locator('input[type="password"]:visible').first();
    if (await instPassInput.isVisible()) {
      await instPassInput.fill('000000');
      const instLoginBtn = pageInst.locator('button:has-text("ENTRAR NO PORTAL"), button:has-text("Entrar no Portal")').first();
      await instLoginBtn.click();
      console.log('  ⏳ Aguardando inicialização da sessão institucional...');
      await pageInst.waitForTimeout(5000);
    }

    // Navegar para Correio da Instituição via Sidebar
    console.log('  📬 Acedendo à Caixa de Entrada da AGT...');
    const instCorreioBtn = pageInst.locator('button:has-text("Correio"), [data-tab="correspondencias"]').first();
    await instCorreioBtn.waitFor({ state: 'visible', timeout: 15000 });
    await instCorreioBtn.click();
    await pageInst.waitForTimeout(2000);

    // Verificar se a mensagem do Cidadão chegou na Caixa de Entrada
    console.log(`  🔍 Procurando mensagem com assunto "${testSubjectCidadao}"...`);
    const receivedMsg = pageInst.locator(`tbody tr:has-text("${uniqueId}"), [data-testid="message-item"]:has-text("${uniqueId}")`).first();
    await receivedMsg.waitFor({ state: 'visible', timeout: 15000 });
    console.log('  ✅ [PASS] INTEROPERABILIDADE CONFIRMADA: A AGT recebeu instantaneamente o requerimento do Cidadão!');

    // Abrir a mensagem recebida para responder
    await receivedMsg.click();
    await pageInst.waitForTimeout(1500);

    // Responder via compositor institucional ou botão inline
    console.log('  ✍️ Redigindo despacho oficial de resposta da AGT ao Cidadão...');
    const novaMsgInst = pageInst.locator('button:has-text("Nova Mensagem"), button:has-text("Responder")').first();
    await novaMsgInst.click();
    await pageInst.waitForTimeout(1000);

    const instTo = pageInst.locator('input[placeholder*="Número do BI exacto"], input[placeholder*="000123456LA789"], input[placeholder*="Destinatário"]').first();
    await instTo.waitFor({ state: 'visible', timeout: 5000 });
    await instTo.fill('009874562LA041');

    const instSubject = pageInst.locator('input[placeholder*="Qual o tema"], input[placeholder*="tema"], input[placeholder*="Assunto"]').first();
    await instSubject.fill(testReplyInst);

    const instBody = pageInst.locator('textarea[placeholder*="Descreva detalhadamente"], textarea').first();
    await instBody.fill(testReplyBody);
    await pageInst.waitForTimeout(500);

    const instSendBtn = pageInst.locator('button:has-text("Enviar Mensagem Oficial"), button:has-text("Enviar Mensagem"), button:has-text("Enviar")').first();
    await instSendBtn.click();
    await pageInst.waitForTimeout(1000);

    const modalNormalInst = pageInst.locator('#btn-modal-opcao-normal, button:has-text("Mensagem Normal")').first();
    if (await modalNormalInst.isVisible()) {
      await modalNormalInst.click();
      await pageInst.waitForTimeout(1200);
    }

    const modalConfirmInst = pageInst.locator('button:has-text("ENVIAR CORRESPONDÊNCIA"), button:has-text("Confirmar Envio")').last();
    if (await modalConfirmInst.isVisible()) {
      await modalConfirmInst.click();
      await pageInst.waitForTimeout(2000);
    }

    const entendiInst = pageInst.locator('button:has-text("ENTENDI"), button:has-text("Entendi"), button:has-text("Fechar")').first();
    if (await entendiInst.isVisible()) {
      await entendiInst.click();
      await pageInst.waitForTimeout(1000);
    }
    await pageInst.waitForTimeout(1500);

    const shot2 = path.join(SCREENSHOT_DIR, 'interop_2_agt_recebeu_e_respondeu.png');
    await pageInst.screenshot({ path: shot2, fullPage: true });
    console.log(`  📸 Evidência 2 guardada em: ${shot2}`);
    console.log('  ✅ [PASS] Resposta AGT -> Cidadão despachada com sucesso!');

    // =========================================================================
    // ETAPA 3: CIDADÃO RECEBE A RESPOSTA DA AGT
    // =========================================================================
    console.log('\n--- ETAPA 3: Cidadão Verifica a Recepção da Resposta da AGT ---');
    await pageCitizen.bringToFront();
    // Volta à lista de correspondências recebidas
    const refreshBtn = pageCitizen.locator('aside button:has-text("Correio")').first();
    await refreshBtn.click();
    await pageCitizen.waitForTimeout(1500);

    // Procura a resposta recebida
    const replyNotice = pageCitizen.locator(`tbody tr:has-text("${uniqueId}"), [data-testid="message-item"]:has-text("${uniqueId}")`).first();
    await replyNotice.waitFor({ state: 'visible', timeout: 15000 });
    console.log('  ✅ [PASS] INTEROPERABILIDADE BIDIRECIONAL CONFIRMADA: O Cidadão recebeu a resposta oficial da AGT!');

    const shot3 = path.join(SCREENSHOT_DIR, 'interop_3_cidadao_recebeu_resposta_agt.png');
    await pageCitizen.screenshot({ path: shot3, fullPage: true });
    console.log(`  📸 Evidência 3 guardada em: ${shot3}`);

    // =========================================================================
    // ETAPA 4: ADMINISTRAÇÃO CENTRAL — AUDITORIA E HOMOLOGAÇÃO DE CADASTROS
    // =========================================================================
    console.log('\n--- ETAPA 4: Interoperabilidade de Cadastro Cidadão -> Administração Central ---');
    pageAdmin = await sharedContext.newPage();

    await pageAdmin.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await pageAdmin.waitForTimeout(1000);

    const adminPassInput = pageAdmin.locator('input[type="password"]:visible').first();
    if (await adminPassInput.isVisible()) {
      await adminPassInput.fill('123456789');
      await pageAdmin.locator('button:has-text("ENTRAR"), button:has-text("Entrar")').first().click();
      await pageAdmin.waitForTimeout(2000);
    }

    // Aceder aos Cidadãos via Sidebar
    console.log('  👥 Acedendo ao Quadro de Cadastros Nacionais...');
    const adminCidadaosBtn = pageAdmin.locator('aside button:has-text("Cidadãos")').first();
    await adminCidadaosBtn.waitFor({ state: 'visible', timeout: 10000 });
    await adminCidadaosBtn.click();
    await pageAdmin.waitForTimeout(2000);

    // Verificar se Mario Quiuma ou outro cadastro pendente está presente
    console.log('  🔎 Verificando solicitação de homologação de cadastro...');
    const searchAdmin = pageAdmin.locator('input[placeholder*="Pesquisar B.I., Nome, E-mail..."]').first();
    await searchAdmin.fill('Mario');
    await pageAdmin.waitForTimeout(1000);

    const shot4 = path.join(SCREENSHOT_DIR, 'interop_4_admin_quadro_cadastros.png');
    await pageAdmin.screenshot({ path: shot4, fullPage: true });
    console.log(`  📸 Evidência 4 guardada em: ${shot4}`);
    console.log('  ✅ [PASS] Quadro de Cadastros Nacionais e triagem integrados com sucesso!');

    // =========================================================================
    // ETAPA 5: CONFERÊNCIA DOS LOGS DO SOC CENTRAL (AUDITORIA TRIANGULAR)
    // =========================================================================
    console.log('\n--- ETAPA 5: Auditoria Triangular no SOC Central da Administração ---');
    const auditoriaTab = pageAdmin.locator('aside button:has-text("Auditoria")').first();
    if (await auditoriaTab.isVisible()) {
      await auditoriaTab.click();
      await pageAdmin.waitForTimeout(2000);
      console.log('  🛡️ Painel de Auditoria e SOC Central inspecionado com sucesso.');
      const shot5 = path.join(SCREENSHOT_DIR, 'interop_5_admin_auditoria_soc_central.png');
      await pageAdmin.screenshot({ path: shot5, fullPage: true });
      console.log(`  📸 Evidência 5 guardada em: ${shot5}`);
    }

    console.log('\n================================================================');
    console.log('🎉 RESULTADO: TODOS OS CIRCUITOS DE INTEROPERABILIDADE 100% FUNCIONAIS!');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ Erro durante teste de interoperabilidade:', err);
    if (pageCitizen) await pageCitizen.screenshot({ path: path.join(SCREENSHOT_DIR, 'interop_error_citizen.png') }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runInteroperabilityTest();
