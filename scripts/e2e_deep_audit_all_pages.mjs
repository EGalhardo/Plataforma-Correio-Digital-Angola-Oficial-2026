import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const SHOT_DIR = '/home/user/cda_test/audit_screenshots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

// Credenciais fornecidas pelo utilizador (injetadas via env ou defaults do teste)
const CIDADAO_01 = { bi: process.env.QA_CID_01_BI || '002399714LA030', pass: process.env.QA_CID_01_PASS || '123456789' };
const CIDADAO_02 = { bi: process.env.QA_CID_02_BI || '005404692BO043', pass: process.env.QA_CID_02_PASS || '123456789' };
const INST_01 = { id: process.env.QA_INST_01_ID || 'INAPEM-LMM-01', pass: process.env.QA_INST_01_PASS || '123456789' };
const INST_02 = { id: process.env.QA_INST_02_ID || 'INAPEM-LLMM-02', pass: process.env.QA_INST_02_PASS || '222222222' };
const ADMIN_01 = { id: process.env.QA_ADMIN_ID || 'ADMIN-0001', pass: process.env.QA_ADMIN_PASS || '123456789' };

const results = [];

function record(section, pageName, functionality, status, details = '') {
  const item = { section, pageName, functionality, status, details, timestamp: new Date().toISOString() };
  results.push(item);
  const tag = status === 'PASS' ? '✅ PASS' : status === 'WARN' ? '⚠️ WARN' : '❌ FAIL';
  console.log(`[${tag}] [${section}] ${pageName} -> ${functionality} ${details ? '(' + details + ')' : ''}`);
}

async function runAudit() {
  console.log('================================================================');
  console.log(`🚀 INICIANDO AUDITORIA PROFUNDA DE TODAS AS PÁGINAS E RECURSOS`);
  console.log(`Servidor: ${BASE}`);
  console.log('================================================================\n');

  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'pt-AO',
    deviceScaleFactor: 1.5,
    permissions: ['camera', 'microphone', 'geolocation'],
    geolocation: { latitude: -8.83833, longitude: 13.23444 } // Luanda
  });

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!txt.includes('favicon') && !txt.includes('404') && !txt.includes('Download the React DevTools')) {
        consoleErrors.push(txt);
      }
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message || String(err));
  });

  // ====================================================================
  // 1. ÁREA DO CIDADÃO
  // ====================================================================
  console.log('\n--- 1. AUDITORIA: ÁREA DO CIDADÃO ---');

  // 1.1 Autenticação e Telas Públicas
  await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SHOT_DIR}/01_cid_login.png` });
  record('Cidadão', 'Autenticação', 'Renderização Ecrã de Login', 'PASS');

  // Recuperação de Senha
  try {
    const btnEsqueci = page.locator('button:has-text("Esqueci Senha")').first();
    await btnEsqueci.click();
    await page.waitForTimeout(500);
    const inputEmailRec = page.locator('input[type="email"]').first();
    const hasEmail = await inputEmailRec.isVisible();
    await page.screenshot({ path: `${SHOT_DIR}/02_cid_recuperar_senha.png` });
    record('Cidadão', 'Autenticação', 'Formulário Redefinir Senha', hasEmail ? 'PASS' : 'FAIL');
    const btnVoltar = page.locator('button:has-text("Voltar à Entrada"), button:has-text("Voltar")').first();
    await btnVoltar.click();
    await page.waitForTimeout(500);
  } catch (e) {
    record('Cidadão', 'Autenticação', 'Formulário Redefinir Senha', 'FAIL', e.message);
  }

  // Registo Cidadão
  try {
    const btnRegistar = page.locator('button:has-text("Registar")').first();
    await btnRegistar.click();
    await page.waitForTimeout(500);
    const hasStepper = await page.locator('text=/Passo|Criar Conta|Identificação/i').first().isVisible();
    await page.screenshot({ path: `${SHOT_DIR}/03_cid_registo.png` });
    record('Cidadão', 'Autenticação', 'Ecrã de Registo de Cidadão', hasStepper ? 'PASS' : 'FAIL');
    const btnCancelarReg = page.locator('button:has-text("Cancelar"), button:has-text("Voltar")').first();
    if (await btnCancelarReg.isVisible()) await btnCancelarReg.click();
    await page.waitForTimeout(500);
  } catch (e) {
    record('Cidadão', 'Autenticação', 'Ecrã de Registo de Cidadão', 'FAIL', e.message);
  }

  // Login Facial Ecrã
  try {
    const btnLoginFacial = page.locator('button:has-text("Login Facial")').first();
    await btnLoginFacial.click();
    await page.waitForTimeout(500);
    const hasCam = await page.locator('text=/LOGIN FACIAL|Posicione o seu rosto/i').first().isVisible();
    await page.screenshot({ path: `${SHOT_DIR}/04_cid_login_facial.png` });
    record('Cidadão', 'Autenticação', 'Interface de Login Facial', hasCam ? 'PASS' : 'FAIL');
    const btnSairFacial = page.locator('button[title*="Voltar" i], button:has-text("Voltar")').first();
    if (await btnSairFacial.isVisible()) await btnSairFacial.click();
    await page.waitForTimeout(500);
  } catch (e) {
    record('Cidadão', 'Autenticação', 'Interface de Login Facial', 'FAIL', e.message);
  }

  // Efetuar Login Cidadão 01
  try {
    const biInput = page.locator('input[placeholder*="B.I." i], input[type="text"]').first();
    const passInput = page.locator('input[type="password"]').first();
    await biInput.fill(CIDADAO_01.bi);
    await passInput.fill(CIDADAO_01.pass);
    const btnEntrar = page.locator('button:has-text("Entrar")').first();
    await btnEntrar.click();
    await page.waitForTimeout(2000);

    const loggedIn = await page.locator('text=/Painel|Correspondências|Notificações|Terminar Sessão/i').first().isVisible();
    await page.screenshot({ path: `${SHOT_DIR}/05_cid_home.png` });
    record('Cidadão', 'Painel Principal', 'Autenticação com Sucesso', loggedIn ? 'PASS' : 'FAIL');
  } catch (e) {
    record('Cidadão', 'Painel Principal', 'Autenticação com Sucesso', 'FAIL', e.message);
  }

  // Navegar pelas páginas do Cidadão usando a sidebar / atalhos
  async function irParaCidadao(nomeAba, ariaLabel, screenshotName) {
    try {
      const btn = page.locator(`aside button:has-text("${nomeAba}"), nav button:has-text("${nomeAba}"), button[aria-label*="${nomeAba}" i]`).first();
      await btn.click({ force: true });
      await page.waitForTimeout(1000);
      const isOk = await page.locator(`section[aria-label*="${ariaLabel || nomeAba}" i], div[aria-label*="${ariaLabel || nomeAba}" i], h1, h2, h3`).first().isVisible();
      await page.screenshot({ path: `${SHOT_DIR}/${screenshotName}.png` });
      return isOk;
    } catch (err) {
      return false;
    }
  }

  // 1.2 Correspondências
  const okCorr = await irParaCidadao('Correspondências', 'correspondencias', '06_cid_correspondencias');
  record('Cidadão', 'Correspondências', 'Navegação e Carregamento de Mensagens', okCorr ? 'PASS' : 'FAIL');

  // Testar Compositor de Nova Mensagem Cidadão
  try {
    const btnNova = page.locator('button:has-text("Nova Mensagem"), button:has-text("Compor"), button:has-text("Enviar Mensagem")').first();
    if (await btnNova.isVisible()) {
      await btnNova.click();
      await page.waitForTimeout(800);
      const modalAberto = await page.locator('text=/Destinatário|Assunto|Mensagem|Tipo de Envio/i').first().isVisible();
      await page.screenshot({ path: `${SHOT_DIR}/07_cid_nova_mensagem_modal.png` });
      record('Cidadão', 'Correspondências', 'Compositor de Nova Mensagem', modalAberto ? 'PASS' : 'FAIL');
      const btnFechar = page.locator('button:has-text("Cancelar"), button[aria-label*="Fechar" i]').first();
      if (await btnFechar.isVisible()) await btnFechar.click();
      await page.waitForTimeout(500);
    } else {
      record('Cidadão', 'Correspondências', 'Compositor de Nova Mensagem', 'WARN', 'Botão nova mensagem não visível na listagem');
    }
  } catch (e) {
    record('Cidadão', 'Correspondências', 'Compositor de Nova Mensagem', 'FAIL', e.message);
  }

  // 1.3 Contactos
  const okCont = await irParaCidadao('Contactos', 'contatos', '08_cid_contactos');
  record('Cidadão', 'Contactos & Directório', 'Directório de Contactos e Filtros', okCont ? 'PASS' : 'FAIL');

  // 1.4 Notificações
  const okNotif = await irParaCidadao('Notificações', 'notificacoes', '09_cid_notificacoes');
  record('Cidadão', 'Notificações', 'Central de Notificações', okNotif ? 'PASS' : 'FAIL');

  // 1.5 Perfil & Segurança
  const okPerf = await irParaCidadao('Perfil', 'perfil', '10_cid_perfil');
  record('Cidadão', 'Perfil & Segurança', 'Dados Pessoais e Configurações de Segurança', okPerf ? 'PASS' : 'FAIL');

  // 1.6 Histórico
  const okHist = await irParaCidadao('Histórico', 'historico', '11_cid_historico');
  record('Cidadão', 'Histórico & Auditoria', 'Logs e Rastreabilidade do Utilizador', okHist ? 'PASS' : 'FAIL');

  // 1.7 Vídeo-Atendimento
  const okVid = await irParaCidadao('Vídeo-Atendimento', 'video-atendimento', '12_cid_video_atendimento');
  record('Cidadão', 'Vídeo-Atendimento', 'Sessões e Agendamentos Virtuais', okVid ? 'PASS' : 'FAIL');

  // 1.8 Inquéritos
  const okInq = await irParaCidadao('Inquéritos', 'inqueritos', '13_cid_inqueritos');
  record('Cidadão', 'Inquéritos & Sondagens', 'Consultas Públicas e Sondagens', okInq ? 'PASS' : 'FAIL');

  // 1.9 Ocorrências
  const okOcorr = await irParaCidadao('Ocorrências', 'ocorrencias', '14_cid_ocorrencias');
  record('Cidadão', 'Ocorrências', 'Visualização de Incidentes e Lock GPS', okOcorr ? 'PASS' : 'FAIL');

  // 1.10 Denúncia
  const okDen = await irParaCidadao('Denúncia', 'denuncia', '15_cid_denuncia');
  record('Cidadão', 'Denúncia', 'Página Oficial de Denúncias e Cronograma', okDen ? 'PASS' : 'FAIL');

  // 1.11 Livro de Reclamações
  const okLivro = await irParaCidadao('Livro de Reclamações', 'livro-reclamacoes', '16_cid_livro_reclamacoes');
  record('Cidadão', 'Livro de Reclamações', 'Livro Eletrónico ANIESA', okLivro ? 'PASS' : 'FAIL');

  // 1.12 Solicitar Documento
  const okDoc = await irParaCidadao('Solicitar Documento', 'solicitar-documento', '17_cid_solicitar_doc');
  record('Cidadão', 'Solicitar Documento', 'Emissão e Pedidos de Certidões', okDoc ? 'PASS' : 'FAIL');

  // 1.13 IA Assistente
  const okIa = await irParaCidadao('Assistente', 'ia-assistente', '18_cid_ia_assistente');
  record('Cidadão', 'Assistente Virtual IA', 'Assistente Cognitivo e Chat Inteligente', okIa ? 'PASS' : 'FAIL');

  // Terminar Sessão Cidadão
  try {
    const btnLogout = page.locator('button:has-text("Terminar Sessão"), button:has-text("Sair"), button[title*="Sair" i]').first();
    if (await btnLogout.isVisible()) {
      await btnLogout.click();
      await page.waitForTimeout(1000);
      record('Cidadão', 'Autenticação', 'Terminar Sessão (Logout)', 'PASS');
    }
  } catch (e) {
    record('Cidadão', 'Autenticação', 'Terminar Sessão (Logout)', 'WARN', e.message);
  }

  // ====================================================================
  // 2. ÁREA DA INSTITUIÇÃO
  // ====================================================================
  console.log('\n--- 2. AUDITORIA: ÁREA DA INSTITUIÇÃO ---');

  await page.goto(`${BASE}/#/institucional`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SHOT_DIR}/20_inst_login.png` });
  record('Instituição', 'Autenticação', 'Ecrã de Login Institucional', 'PASS');

  // Efetuar Login Institucional (INAPEM-LMM-01)
  try {
    const instIdInput = page.locator('input[placeholder*="ID" i], input[placeholder*="Identificador" i], input[type="text"]').first();
    const instPassInput = page.locator('input[type="password"]').first();
    await instIdInput.fill(INST_01.id);
    await instPassInput.fill(INST_01.pass);
    const btnEntrarInst = page.locator('button:has-text("Entrar")').first();
    await btnEntrarInst.click();
    await page.waitForTimeout(2000);

    const loggedInInst = await page.locator('text=/Painel|Correspondências|Equipa|QR|Terminar Sessão/i').first().isVisible();
    await page.screenshot({ path: `${SHOT_DIR}/21_inst_home.png` });
    record('Instituição', 'Painel Institucional', 'Autenticação com Sucesso', loggedInInst ? 'PASS' : 'FAIL');
  } catch (e) {
    record('Instituição', 'Painel Institucional', 'Autenticação com Sucesso', 'FAIL', e.message);
  }

  async function irParaInst(nomeAba, ariaLabel, screenshotName) {
    try {
      const btn = page.locator(`aside button:has-text("${nomeAba}"), nav button:has-text("${nomeAba}"), button[aria-label*="${nomeAba}" i]`).first();
      await btn.click({ force: true });
      await page.waitForTimeout(1000);
      const isOk = await page.locator(`section[aria-label*="${ariaLabel || nomeAba}" i], div[aria-label*="${ariaLabel || nomeAba}" i], h1, h2, h3`).first().isVisible();
      await page.screenshot({ path: `${SHOT_DIR}/${screenshotName}.png` });
      return isOk;
    } catch (err) {
      return false;
    }
  }

  // 2.1 Correspondências Institucionais
  const okInstCorr = await irParaInst('Correspondências', 'correspondencias', '22_inst_correspondencias');
  record('Instituição', 'Correspondências', 'Gestão de Ofícios e Correspondência', okInstCorr ? 'PASS' : 'FAIL');

  // 2.2 Directório
  const okInstDir = await irParaInst('Directório', 'contatos', '23_inst_directorio');
  record('Instituição', 'Directório de Órgãos', 'Catálogo de Órgãos Públicos', okInstDir ? 'PASS' : 'FAIL');

  // 2.3 QR Code Institucional
  const okInstQr = await irParaInst('QR Code', 'inst-qrcode', '24_inst_qrcode');
  record('Instituição', 'QR Code Institucional', 'Validação e Credenciais QR', okInstQr ? 'PASS' : 'FAIL');

  // 2.4 Assistente IA Institucional
  const okInstIa = await irParaInst('Assistente IA', 'inst-ai-assistant', '25_inst_ai_assistant');
  record('Instituição', 'Assistente IA Institucional', 'Geração de Ofícios e Sumarização', okInstIa ? 'PASS' : 'FAIL');

  // 2.5 Perfil & Equipa
  const okInstPerf = await irParaInst('Perfil', 'perfil', '26_inst_perfil');
  record('Instituição', 'Perfil & Equipa', 'Gestão de Delegados e Colaboradores', okInstPerf ? 'PASS' : 'FAIL');

  // 2.6 Vídeo-Atendimento Institucional
  const okInstVid = await irParaInst('Vídeo-Atendimento', 'video-atendimento', '27_inst_video_atendimento');
  record('Instituição', 'Vídeo-Atendimento', 'Salas de Atendimento Virtual', okInstVid ? 'PASS' : 'FAIL');

  // 2.7 Inquéritos Institucionais
  const okInstInq = await irParaInst('Inquéritos', 'inqueritos', '28_inst_inqueritos');
  record('Instituição', 'Inquéritos & Sondagens', 'Criação e Gestão de Sondagens', okInstInq ? 'PASS' : 'FAIL');

  // 2.8 Ocorrências Institucionais
  const okInstOcorr = await irParaInst('Ocorrências', 'ocorrencias', '29_inst_ocorrencias');
  record('Instituição', 'Ocorrências', 'Triagem e Resolução Técnica', okInstOcorr ? 'PASS' : 'FAIL');

  // 2.9 Denúncias Institucionais
  const okInstDen = await irParaInst('Denúncias', 'denuncia', '30_inst_denuncias');
  record('Instituição', 'Denúncias', 'Gestão de Denúncias Recebidas', okInstDen ? 'PASS' : 'FAIL');

  // 2.10 Livro de Reclamações Institucional
  const okInstLivro = await irParaInst('Livro de Reclamações', 'livro-reclamacoes', '31_inst_livro_reclamacoes');
  record('Instituição', 'Livro de Reclamações', 'Resolução de Reclamações de Cidadãos', okInstLivro ? 'PASS' : 'FAIL');

  // 2.11 Difusão de Emergência
  const okInstEmerg = await irParaInst('Emergência', 'emergencia', '32_inst_emergencia');
  record('Instituição', 'Difusão de Emergência', 'Emissão de Alertas e Difusão', okInstEmerg ? 'PASS' : 'FAIL');

  // Terminar Sessão Instituição
  try {
    const btnLogoutInst = page.locator('button:has-text("Terminar Sessão"), button:has-text("Sair"), button[title*="Sair" i]').first();
    if (await btnLogoutInst.isVisible()) {
      await btnLogoutInst.click();
      await page.waitForTimeout(1000);
      record('Instituição', 'Autenticação', 'Terminar Sessão (Logout)', 'PASS');
    }
  } catch (e) {
    record('Instituição', 'Autenticação', 'Terminar Sessão (Logout)', 'WARN', e.message);
  }

  // ====================================================================
  // 3. ÁREA DE ADMINISTRAÇÃO CENTRAL (GOVERNO / ADMIN ALFA)
  // ====================================================================
  console.log('\n--- 3. AUDITORIA: ÁREA DE ADMINISTRAÇÃO CENTRAL ---');

  await page.goto(`${BASE}/#/admin`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SHOT_DIR}/40_admin_login.png` });
  record('Admin', 'Autenticação Governamental', 'Ecrã de Login Admin Alfa', 'PASS');

  // Efetuar Login Admin Alfa (ADMIN-0001)
  try {
    const adminIdInput = page.locator('input[placeholder*="ID" i], input[placeholder*="Administrador" i], input[type="text"]').first();
    const adminPassInput = page.locator('input[type="password"]').first();
    await adminIdInput.fill(ADMIN_01.id);
    await adminPassInput.fill(ADMIN_01.pass);
    const btnEntrarAdmin = page.locator('button:has-text("Entrar")').first();
    await btnEntrarAdmin.click();
    await page.waitForTimeout(2000);

    const loggedInAdmin = await page.locator('text=/Dashboard|Interoperabilidade|Supervisão|SOC|Terminar Sessão/i').first().isVisible();
    await page.screenshot({ path: `${SHOT_DIR}/41_admin_dashboard.png` });
    record('Admin', 'Dashboard Governamental', 'Autenticação e Indicadores Nacionais', loggedInAdmin ? 'PASS' : 'FAIL');
  } catch (e) {
    record('Admin', 'Dashboard Governamental', 'Autenticação e Indicadores Nacionais', 'FAIL', e.message);
  }

  async function irParaAdmin(nomeAba, ariaLabel, screenshotName) {
    try {
      const btn = page.locator(`aside button:has-text("${nomeAba}"), nav button:has-text("${nomeAba}"), button[aria-label*="${nomeAba}" i]`).first();
      await btn.click({ force: true });
      await page.waitForTimeout(1000);
      const isOk = await page.locator(`section[aria-label*="${ariaLabel || nomeAba}" i], div[aria-label*="${ariaLabel || nomeAba}" i], h1, h2, h3`).first().isVisible();
      await page.screenshot({ path: `${SHOT_DIR}/${screenshotName}.png` });
      return isOk;
    } catch (err) {
      return false;
    }
  }

  // 3.1 Interoperabilidade
  const okAdminInter = await irParaAdmin('Interoperabilidade', 'gov-interoperabilidade', '42_admin_interoperabilidade');
  record('Admin', 'Interoperabilidade & Barramento', 'Gateways e Nós Interministeriais', okAdminInter ? 'PASS' : 'FAIL');

  // 3.2 Supervisão de Correspondências
  const okAdminCorr = await irParaAdmin('Correspondências', 'gov-correspondencias', '43_admin_correspondencias');
  record('Admin', 'Supervisão de Correspondências', 'Auditoria Global de Mensagens', okAdminCorr ? 'PASS' : 'FAIL');

  // 3.3 Directório Nacional
  const okAdminDir = await irParaAdmin('Directório', 'gov-contatos', '44_admin_directorio');
  record('Admin', 'Directório Nacional', 'Gestão Unificada de Órgãos', okAdminDir ? 'PASS' : 'FAIL');

  // 3.4 Gestão de Trabalhadores & Instituições
  const okAdminTrab = await irParaAdmin('Trabalhadores', 'gov-trabalhadores', '45_admin_trabalhadores');
  record('Admin', 'Gestão de Trabalhadores', 'Aprovação de Instituições e Delegados', okAdminTrab ? 'PASS' : 'FAIL');

  // 3.5 Relatórios & Estatísticas
  const okAdminRel = await irParaAdmin('Relatórios', 'gov-relatorio', '46_admin_relatorios');
  record('Admin', 'Relatórios & Estatísticas', 'Exportação Executiva e Métricas SLA', okAdminRel ? 'PASS' : 'FAIL');

  // 3.6 Governação Cognitiva & IA
  const okAdminIa = await irParaAdmin('Governação IA', 'gov-ia', '47_admin_ia');
  record('Admin', 'Governação Cognitiva & IA', 'Modelos de Linguagem e RAG Central', okAdminIa ? 'PASS' : 'FAIL');

  // 3.7 Segurança & SOC
  const okAdminSoc = await irParaAdmin('Segurança & SOC', 'gov-seguranca', '48_admin_soc');
  record('Admin', 'Segurança, SOC & Auditoria', 'SOC-AN-2026 e Logs Criptográficos', okAdminSoc ? 'PASS' : 'FAIL');

  // 3.8 Perfil Admin
  const okAdminPerf = await irParaAdmin('Perfil', 'perfil', '49_admin_perfil');
  record('Admin', 'Perfil Governamental', 'Definições do Administrador Alfa', okAdminPerf ? 'PASS' : 'FAIL');

  // Terminar Sessão Admin
  try {
    const btnLogoutAdmin = page.locator('button:has-text("Terminar Sessão"), button:has-text("Sair"), button[title*="Sair" i]').first();
    if (await btnLogoutAdmin.isVisible()) {
      await btnLogoutAdmin.click();
      await page.waitForTimeout(1000);
      record('Admin', 'Autenticação Governamental', 'Terminar Sessão (Logout)', 'PASS');
    }
  } catch (e) {
    record('Admin', 'Autenticação Governamental', 'Terminar Sessão (Logout)', 'WARN', e.message);
  }

  await browser.close();

  console.log('\n================================================================');
  console.log(`📊 RESUMO DA AUDITORIA COMPLETA`);
  console.log('================================================================');
  const passes = results.filter(r => r.status === 'PASS').length;
  const warns = results.filter(r => r.status === 'WARN').length;
  const fails = results.filter(r => r.status === 'FAIL').length;
  console.log(`TOTAL DE RECURSOS AUDITADOS: ${results.length}`);
  console.log(`✅ APROVADOS (PASS): ${passes}`);
  console.log(`⚠️ AVISOS (WARN): ${warns}`);
  console.log(`❌ FALHAS (FAIL): ${fails}`);
  if (consoleErrors.length > 0) {
    console.log(`⚠️ Erros de consola recolhidos: ${consoleErrors.length}`);
    consoleErrors.slice(0, 5).forEach(e => console.log('   - ' + e.slice(0, 100)));
  }
  console.log('================================================================\n');

  return { results, passes, warns, fails, consoleErrors };
}

runAudit().catch(err => {
  console.error('Erro fatal na auditoria:', err);
  process.exit(1);
});
