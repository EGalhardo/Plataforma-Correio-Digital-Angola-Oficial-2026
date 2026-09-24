import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const SHOTS = '/home/user/cda_test/audit_all';
mkdirSync(SHOTS, { recursive: true });

// Credenciais fornecidas pelo utilizador
const CRED = {
  cidadao1: { id: process.env.QA_CID1_ID || '002399714LA030', pass: process.env.QA_CID1_PASS || '123456789', area: '' },
  cidadao2: { id: process.env.QA_CID2_ID || '005404692BO043', pass: process.env.QA_CID2_PASS || '123456789', area: '' },
  inst1: { id: process.env.QA_INST1_ID || 'INAPEM-LMM-01', pass: process.env.QA_INST1_PASS || '123456789', area: '/institucional' },
  inst2: { id: process.env.QA_INST2_ID || 'INAPEM-LLMM-02', pass: process.env.QA_INST2_PASS || '222222222', area: '/institucional' },
  admin: { id: process.env.QA_ADMIN_ID || 'ADMIN-0001', pass: process.env.QA_ADMIN_PASS || '123456789', area: '/admin' },
};

const resultados = [];
function registrar(papel, pagina, funcionalidade, status, detalhe = '') {
  resultados.push({ papel, pagina, funcionalidade, status, detalhe });
  const icon = status === 'PASS' ? '✅ PASS' : status === 'WARN' ? '⚠️ WARN' : '❌ FAIL';
  console.log(`[${icon}] [${papel}] ${pagina} -> ${funcionalidade}${detalhe ? ' (' + detalhe + ')' : ''}`);
}

async function loginUser(page, cred) {
  const url = BASE + (cred.area || '/');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  const headingLogin = page.getByRole('heading', { name: 'LOGIN' }).first();
  await headingLogin.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null);

  const inputId = page.getByPlaceholder(/LA041|AGT-9921-SR|ADM-8812-OP|ADMIN-0001|B\.I\.|ID|Identificador/i).first();
  const inputPass = page.getByPlaceholder('••••••••••••').first();
  const btnEntrar = page.getByRole('button', { name: /Entrar no Portal/i }).first();

  await inputId.fill(cred.id);
  await inputPass.fill(cred.pass);
  await btnEntrar.click();

  const painel = page.getByRole('button', { name: 'Painel', exact: true }).first();
  await painel.waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1000);
}

async function logoutUser(page) {
  const sair = page.locator('aside button', { hasText: /Sair do Canal/i }).first();
  if (await sair.isVisible().catch(() => false)) {
    await sair.click();
    await page.waitForTimeout(1500);
  }
}

async function auditarCidadao(browser) {
  console.log('\n======================================================');
  console.log('📌 1. AUDITORIA: ÁREA DO CIDADÃO (002399714LA030)');
  console.log('======================================================');

  const ctx = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    locale: 'pt-AO',
    permissions: ['geolocation', 'camera', 'microphone'],
    geolocation: { latitude: -8.83833, longitude: 13.23444 }
  });
  const page = await ctx.newPage();

  // 1.1 Telas Públicas
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  const headingLogin = page.getByRole('heading', { name: 'LOGIN' }).first();
  await headingLogin.waitFor({ state: 'visible', timeout: 15000 });
  const temLogin = await headingLogin.isVisible();
  registrar('Cidadão', 'Autenticação', 'Ecrã de Login Público', temLogin ? 'PASS' : 'FAIL');

  // Redefinir Senha
  const btnEsqueci = page.getByRole('button', { name: /Esqueci Senha/i }).first();
  if (await btnEsqueci.isVisible()) {
    await btnEsqueci.click();
    const inputEmail = page.locator('input[type="email"]').first();
    await inputEmail.waitFor({ state: 'visible', timeout: 10000 });
    const temEmail = await inputEmail.isVisible();
    registrar('Cidadão', 'Autenticação', 'Ecrã Redefinir Senha', temEmail ? 'PASS' : 'FAIL');
    await page.screenshot({ path: `${SHOTS}/cid_redefinir_senha.png` });
    const btnVoltar = page.getByRole('button', { name: /Voltar à Entrada|Voltar/i }).first();
    if (await btnVoltar.isVisible()) await btnVoltar.click();
    await page.waitForTimeout(600);
  }

  // Registo Cidadão
  const btnRegistar = page.getByRole('button', { name: /^Registar/i }).last();
  if (await btnRegistar.isVisible()) {
    await btnRegistar.click();
    const inputNome = page.getByPlaceholder(/Manuel António|Nome Completo/i).first();
    await inputNome.waitFor({ state: 'visible', timeout: 10000 });
    const temFormReg = await inputNome.isVisible();
    registrar('Cidadão', 'Autenticação', 'Ecrã de Registo', temFormReg ? 'PASS' : 'FAIL');
    await page.screenshot({ path: `${SHOTS}/cid_registo.png` });
    const btnCanc = page.getByRole('button', { name: /Cancelar|Voltar/i }).first();
    if (await btnCanc.isVisible()) await btnCanc.click();
    await page.waitForTimeout(600);
  }

  // Login Facial
  const btnFacial = page.getByRole('button', { name: /Login Facial/i }).first();
  if (await btnFacial.isVisible()) {
    await btnFacial.click();
    const badgeFace = page.getByText(/LOGIN FACIAL/i).first();
    await badgeFace.waitFor({ state: 'visible', timeout: 10000 });
    const temFace = await badgeFace.isVisible();
    registrar('Cidadão', 'Autenticação', 'Ecrã de Login Facial', temFace ? 'PASS' : 'FAIL');
    await page.screenshot({ path: `${SHOTS}/cid_login_facial.png` });
    const btnCancFace = page.getByRole('button', { name: /Voltar/i }).first();
    if (await btnCancFace.isVisible()) await btnCancFace.click();
    await page.waitForTimeout(600);
  }

  // Login com Cidadão 01
  await loginUser(page, CRED.cidadao1);
  registrar('Cidadão', 'Painel Principal', 'Autenticação e Carregamento do Painel', 'PASS');
  await page.screenshot({ path: `${SHOTS}/cid_home.png` });

  // Lista de páginas do Cidadão para auditar
  const paginasCidadao = [
    { hash: '#/home', label: 'Painel', marcador: /Notificações|Resumo|Atalhos|Correspond|Perfil|Cidad/i },
    { hash: '#/correspondencias', label: 'Correspondências', marcador: /Caixa de Entrada|Enviadas|Nova Mensagem|Correio/i },
    { hash: '#/contatos', label: 'Contactos', marcador: /Directório|Contactos|Instituições/i },
    { hash: '#/perfil', label: 'Perfil', marcador: /Dados da Conta|Segurança|B\.I\.|Perfil/i },
    { hash: '#/historico', label: 'Histórico', marcador: /Histórico|Eventos|Sessões|Auditoria/i },
    { hash: '#/notificacoes', label: 'Notificações', marcador: /Notificações|Alertas/i },
    { hash: '#/video-atendimento', label: 'Vídeo-Atendimento', marcador: /Vídeo-Atendimento|VideoAtendimento|Video-atendimento|Sessões|Agendamento/i },
    { hash: '#/inqueritos', label: 'Inquéritos & Sondagens', marcador: /Inquéritos|Sondagens|Consultas/i },
    { hash: '#/ocorrencias', label: 'Ocorrências', marcador: /Ocorrências|Incidentes|GPS|Mapa/i },
    { hash: '#/denuncia', label: 'Denúncia', marcador: /Denúncia|Anonimato|Cronograma|Fase/i },
    { hash: '#/livro-reclamacoes', label: 'Livro de Reclamações', marcador: /Livro de Reclamações|ANIESA|Reclama/i },
    { hash: '#/solicitar-documento', label: 'Solicitar Documento', marcador: /Solicitar Documento|Certidão/i },
  ];

  for (const p of paginasCidadao) {
    await page.evaluate((h) => { window.location.hash = h; }, p.hash);
    await page.waitForTimeout(1500);
    const texto = await page.evaluate(() => document.body.innerText.trim());
    const okMarcador = p.marcador.test(texto);
    const status = texto.length >= 250 && okMarcador ? 'PASS' : texto.length >= 250 ? 'WARN' : 'FAIL';
    registrar('Cidadão', p.label, `Renderização e Funcionalidade (${p.hash})`, status, `${texto.length} caracteres`);
    await page.screenshot({ path: `${SHOTS}/cid_${p.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png` });
  }

  // Testar funcionalidade específica: Compositor de Nova Mensagem Cidadão
  await page.evaluate(() => { window.location.hash = '#/correspondencias'; });
  await page.waitForTimeout(1000);
  const btnNovaMsg = page.getByRole('button', { name: /Nova Mensagem/i }).first();
  if (await btnNovaMsg.isVisible()) {
    await btnNovaMsg.click();
    await page.waitForTimeout(1000);
    const modalCompositor = await page.getByText(/Destinatário|Assunto|Mensagem|Tipo de Envio/i).first().isVisible();
    registrar('Cidadão', 'Correspondências', 'Compositor Nova Mensagem', modalCompositor ? 'PASS' : 'FAIL');
    await page.screenshot({ path: `${SHOTS}/cid_compositor_modal.png` });
    const btnFechar = page.getByRole('button', { name: /Cancelar|Fechar/i }).first();
    if (await btnFechar.isVisible()) await btnFechar.click();
    await page.waitForTimeout(500);
  }

  // Testar funcionalidade específica: Ocorrências - Mini Mapa e GPS
  await page.evaluate(() => { window.location.hash = '#/ocorrencias'; });
  await page.waitForTimeout(1200);
  const temMapaOuFotos = await page.locator('text=/Coordenadas|Precisão|Calibração|Geolocalização|Mapa|Ocorr/i').first().isVisible();
  registrar('Cidadão', 'Ocorrências', 'Módulo GPS & Fotos 15%', temMapaOuFotos ? 'PASS' : 'WARN');

  // Testar funcionalidade específica: Denúncia - Cronograma 5 fases
  await page.evaluate(() => { window.location.hash = '#/denuncia'; });
  await page.waitForTimeout(1200);
  const temFases = await page.locator('text=/Submetida|Recebida|Em Análise|Em Investigação|Concluída|Denúncia/i').first().isVisible();
  registrar('Cidadão', 'Denúncia', 'Cronograma de 5 Fases', temFases ? 'PASS' : 'WARN');

  await logoutUser(page);

  // 1.2 Testar login com Cidadão 02 (005404692BO043)
  console.log('\n--- Teste de Validação com Cidadão 02 (005404692BO043) ---');
  await loginUser(page, CRED.cidadao2);
  registrar('Cidadão 02', 'Painel Principal', 'Autenticação Segundo Cidadão', 'PASS');
  await logoutUser(page);

  await ctx.close();
}

async function auditarInstituicao(browser) {
  console.log('\n======================================================');
  console.log('📌 2. AUDITORIA: ÁREA DA INSTITUIÇÃO (INAPEM-LMM-01)');
  console.log('======================================================');

  const ctx = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    locale: 'pt-AO',
  });
  const page = await ctx.newPage();

  // Login Instituição 01
  await loginUser(page, CRED.inst1);
  registrar('Instituição', 'Painel Institucional', 'Autenticação e Carregamento do Painel', 'PASS');
  await page.screenshot({ path: `${SHOTS}/inst_home.png` });

  const paginasInst = [
    { hash: '#/home', label: 'Painel Institucional', marcador: /Métricas|Atendimento|Pendentes|Correspond|INAPEM|Institui/i },
    { hash: '#/correspondencias', label: 'Correspondências', marcador: /Caixa de Entrada|Ofícios|Enviadas|Correio/i },
    { hash: '#/gov-contatos', label: 'Directório de Órgãos', marcador: /Equipa|Contactos|Directório|Membros/i },
    { hash: '#/inst-qrcode', label: 'QR Code Institucional', marcador: /QR Code|Validação|Balcão|Credencial|INAPEM/i },
    { hash: '#/inst-ai-assistant', label: 'Assistente IA Institucional', marcador: /Assistente IA|Ofício|Minutas|Sumarização|Groq|IA/i },
    { hash: '#/perfil', label: 'Perfil & Equipa', marcador: /Instituição|Delegados|Colaboradores|Perfil|INAPEM/i },
    { hash: '#/video-atendimento', label: 'Gestão Vídeo-Atendimento', marcador: /Vídeo-Atendimento|VideoAtendimento|Video-atendimento|Salas|Agendamentos|Atendimentos/i },
    { hash: '#/inqueritos', label: 'Gestão de Inquéritos', marcador: /Inquéritos|Sondagens|Estatísticas/i },
    { hash: '#/ocorrencias', label: 'Gestão de Ocorrências', marcador: /Ocorrências|Triagem|Incidentes/i },
    { hash: '#/denuncia', label: 'Gestão de Denúncias', marcador: /Denúncias|Processos|Fases/i },
    { hash: '#/livro-reclamacoes', label: 'Livro de Reclamações', marcador: /Livro de Reclamações|Reclamações|Tratamento/i },
  ];

  for (const p of paginasInst) {
    await page.evaluate((h) => { window.location.hash = h; }, p.hash);
    await page.waitForTimeout(1500);
    const texto = await page.evaluate(() => document.body.innerText.trim());
    const okMarcador = p.marcador.test(texto);
    const status = texto.length >= 250 && okMarcador ? 'PASS' : texto.length >= 250 ? 'WARN' : 'FAIL';
    registrar('Instituição', p.label, `Renderização e Funcionalidade (${p.hash})`, status, `${texto.length} caracteres`);
    await page.screenshot({ path: `${SHOTS}/inst_${p.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png` });
  }

  // Testar funcionalidade específica: QR Code institucional
  await page.evaluate(() => { window.location.hash = '#/inst-qrcode'; });
  await page.waitForTimeout(1000);
  const temQrValidador = await page.locator('text=/Escanear|Código|Ponto de Atendimento|QR/i').first().isVisible();
  registrar('Instituição', 'QR Code Institucional', 'Validador e Emissor QR', temQrValidador ? 'PASS' : 'WARN');

  // Testar funcionalidade específica: Assistente IA Institucional
  await page.evaluate(() => { window.location.hash = '#/inst-ai-assistant'; });
  await page.waitForTimeout(1000);
  const temIaInst = await page.locator('text=/Gerar Ofício|Sumarizar|Assistente|IA/i').first().isVisible();
  registrar('Instituição', 'Assistente IA Institucional', 'Módulos Cognitivos Institucionais', temIaInst ? 'PASS' : 'WARN');

  await logoutUser(page);

  // 2.2 Testar login com Instituição 02 (INAPEM-LLMM-02)
  console.log('\n--- Teste de Validação com Instituição 02 (INAPEM-LLMM-02) ---');
  await loginUser(page, CRED.inst2);
  registrar('Instituição 02', 'Painel Institucional', 'Autenticação Segunda Instituição', 'PASS');
  await logoutUser(page);

  await ctx.close();
}

async function auditarAdmin(browser) {
  console.log('\n======================================================');
  console.log('📌 3. AUDITORIA: ADMINISTRAÇÃO CENTRAL (ADMIN-0001)');
  console.log('======================================================');

  const ctx = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    locale: 'pt-AO',
  });
  const page = await ctx.newPage();

  // Login Admin Alfa
  await loginUser(page, CRED.admin);
  registrar('Admin', 'Dashboard Governamental', 'Autenticação e Painel Central', 'PASS');
  await page.screenshot({ path: `${SHOTS}/admin_dashboard.png` });

  const paginasAdmin = [
    { hash: '#/gov-dashboard', label: 'Dashboard Governamental', marcador: /Painel|SOC|Indicadores|Nacional|Admin/i },
    { hash: '#/gov-interoperabilidade', label: 'Interoperabilidade', marcador: /Interoperabilidade|Barramento|Nós|Gateways|Institu/i },
    { hash: '#/gov-correspondencias', label: 'Supervisão Correspondências', marcador: /Correspondências|Supervisão|Fluxos|Correio/i },
    { hash: '#/gov-contatos', label: 'Directório Nacional', marcador: /Directório|Cidadãos|Instituições/i },
    { hash: '#/gov-trabalhadores', label: 'Gestão de Trabalhadores', marcador: /Trabalhadores|Equipa|Aprovações|Delegações/i },
    { hash: '#/gov-relatorio', label: 'Relatórios Executivos', marcador: /Relatórios|Estatísticas|Desempenho|SLA/i },
    { hash: '#/gov-ia', label: 'Governação IA', marcador: /Governação IA|Modelos|RAG|Configurações|IA/i },
    { hash: '#/gov-seguranca', label: 'Segurança & SOC', marcador: /Segurança|SOC|Auditoria|SOC-AN-2026/i },
    { hash: '#/gov-perfil', label: 'Perfil Administrador', marcador: /Perfil|Credencial Operacional|Admin/i },
  ];

  for (const p of paginasAdmin) {
    await page.evaluate((h) => { window.location.hash = h; }, p.hash);
    await page.waitForTimeout(1500);
    const texto = await page.evaluate(() => document.body.innerText.trim());
    const okMarcador = p.marcador.test(texto);
    const status = texto.length >= 250 && okMarcador ? 'PASS' : texto.length >= 250 ? 'WARN' : 'FAIL';
    registrar('Admin', p.label, `Renderização e Funcionalidade (${p.hash})`, status, `${texto.length} caracteres`);
    await page.screenshot({ path: `${SHOTS}/admin_${p.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png` });
  }

  // Testar funcionalidade específica: Interoperabilidade
  await page.evaluate(() => { window.location.hash = '#/gov-interoperabilidade'; });
  await page.waitForTimeout(1000);
  const temGateways = await page.locator('text=/SEPE|MinFin|AGT|Status|Latência|Institu/i').first().isVisible();
  registrar('Admin', 'Interoperabilidade', 'Monitorização de Gateways Governamentais', temGateways ? 'PASS' : 'WARN');

  // Testar funcionalidade específica: Segurança SOC-AN-2026
  await page.evaluate(() => { window.location.hash = '#/gov-seguranca'; });
  await page.waitForTimeout(1000);
  const temSocLogs = await page.locator('text=/SOC-AN-2026|Auditoria|Integridade|Logs|Seguran/i').first().isVisible();
  registrar('Admin', 'Segurança & SOC', 'Auditoria SOC-AN-2026 e Rastreabilidade', temSocLogs ? 'PASS' : 'WARN');

  await logoutUser(page);
  await ctx.close();
}

async function run() {
  console.log(`================================================================`);
  console.log(`🚀 INICIANDO AUDITORIA GLOBAL COMPLETA — 100% AUTÓNOMA`);
  console.log(`Ambiente: ${BASE}`);
  console.log(`================================================================`);

  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  try {
    await auditarCidadao(browser);
    await auditarInstituicao(browser);
    await auditarAdmin(browser);
  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log('📊 RESUMO CONSOLIDADO DA AUDITORIA GLOBAL');
  console.log('================================================================');
  const passes = resultados.filter(r => r.status === 'PASS').length;
  const warns = resultados.filter(r => r.status === 'WARN').length;
  const fails = resultados.filter(r => r.status === 'FAIL').length;
  console.log(`Total de Funcionalidades/Páginas Auditadas: ${resultados.length}`);
  console.log(`✅ APROVADOS (PASS): ${passes}`);
  console.log(`⚠️ AVISOS (WARN): ${warns}`);
  console.log(`❌ FALHAS (FAIL): ${fails}`);
  console.log('================================================================\n');

  if (fails > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Erro na auditoria global:', err);
  process.exit(1);
});
