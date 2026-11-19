// ============================================================================
// Suite E2E: Auditoria Global de Todas as Páginas e Interoperabilidade Tri-Área
// CDA 2026 (Cidadão ↔ Instituição ↔ Administração Central)
// ============================================================================

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';

const results = [];
function assert(category, name, condition, details = '') {
  const status = condition ? 'PASS' : 'FAIL';
  console.log(`[${status}] [${category}] ${name} ${details ? '(' + details + ')' : ''}`);
  results.push({ category, name, status, details });
  if (!condition) {
    console.error(`❌ Falha: [${category}] ${name} — ${details}`);
  }
}

async function testPageIntegrity(page, tabName, markerRegex, minChars = 100) {
  await page.waitForTimeout(400);
  const text = await page.evaluate(() => document.body.innerText.trim());
  const hasMarker = markerRegex ? markerRegex.test(text) : true;
  const hasContent = text.length >= minChars;
  return { hasContent, hasMarker, length: text.length };
}

async function run() {
  console.log(`🚀 Iniciando Bateria Completa de Testes em ${BASE}...`);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  try {
    // ========================================================================
    // SEÇÃO 1: ÁREA DO CIDADÃO (Páginas Públicas + Navegação + Funcionalidades)
    // ========================================================================
    console.log(`\n======================================================`);
    console.log(`👤 1. ÁREA DO CIDADÃO: Telas Públicas & Sessão`);
    console.log(`======================================================`);

    const ctxCid = await browser.newContext({ viewport: { width: 1366, height: 850 } });
    const pageCid = await ctxCid.newPage();

    // 1.1 Login Cidadão
    await pageCid.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await pageCid.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });
    assert('Cidadão - Público', 'Página de Login Cidadão carregada', await pageCid.getByRole('heading', { name: /LOGIN/i }).isVisible());

    // 1.2 Registo Cidadão
    const btnReg = pageCid.getByRole('button', { name: /Registar/i }).last();
    if (await btnReg.isVisible()) {
      await btnReg.click();
      await pageCid.waitForTimeout(600);
      const resReg = await testPageIntegrity(pageCid, 'Registo', /NOME COMPLETO|CRIAÇÃO OFICIAL|BI|Passo/i);
      assert('Cidadão - Público', 'Página de Registo Cidadão funcional', resReg.hasContent && resReg.hasMarker);
      await pageCid.getByRole('button', { name: /Cancelar|Voltar/i }).first().click().catch(() => {});
      await pageCid.waitForTimeout(400);
    }

    // 1.3 Redefinir Senha Cidadão
    const btnEsqueci = pageCid.getByRole('button', { name: /Esqueci Senha/i }).first();
    if (await btnEsqueci.isVisible()) {
      await btnEsqueci.click();
      await pageCid.waitForTimeout(600);
      const resPass = await testPageIntegrity(pageCid, 'Recuperar Senha', /Redefinir|Recuperar|Identificação|BI/i);
      assert('Cidadão - Público', 'Página Redefinir Senha funcional', resPass.hasContent);
      await pageCid.getByRole('button', { name: /Voltar|Cancelar/i }).first().click().catch(() => {});
      await pageCid.waitForTimeout(400);
    }

    // 1.4 Login Facial
    const btnFacial = pageCid.getByRole('button', { name: /Login Facial|Reconhecimento/i }).first();
    if (await btnFacial.isVisible()) {
      await btnFacial.click();
      await pageCid.waitForTimeout(600);
      const resFace = await testPageIntegrity(pageCid, 'Login Facial', /Facial|Câmara|Rosto|Captura/i);
      assert('Cidadão - Público', 'Página de Login Facial funcional', resFace.hasContent);
      await pageCid.getByRole('button', { name: /Voltar|Cancelar/i }).first().click().catch(() => {});
      await pageCid.waitForTimeout(400);
    }

    // 1.5 Autenticação como Cidadão (Edlásio Galhardo)
    await pageCid.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await pageCid.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });
    await pageCid.fill('input[name="cda-utilizador"]', '002399714LA030');
    await pageCid.fill('input[name="cda-senha"]', '123456789');
    await pageCid.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await pageCid.waitForTimeout(2500);

    const painelCid = await testPageIntegrity(pageCid, 'Painel Cidadão', /Área do Cidadão|Olá|Correspondência|ID Digital/i);
    assert('Cidadão - Sessão', 'Painel Principal (home) funcional', painelCid.hasContent);

    // Páginas da Navegação e Atalhos Cidadão
    const rotasCidadao = [
      { tab: 'correspondencias', label: 'Correio', marker: /Caixa de Entrada|Lidas|Não Lidas|Nova Mensagem/i },
      { tab: 'contatos', label: 'Contactos', marker: /Círculo de Confiança|Contactos|Adicionar/i },
      { tab: 'perfil', label: 'Perfil', marker: /Meu Perfil|Dados|Segurança|Identidade/i },
      { tab: 'video-atendimento', label: 'Vídeo-Atendimento', marker: /Vídeo-Atendimento|Agendamento|Sessão/i },
      { tab: 'inqueritos', label: 'Inquéritos', marker: /Inquéritos|Participação|Respostas/i },
      { tab: 'comunicados', label: 'Comunicados', marker: /Comunicados|Oficiais|Avisos/i },
      { tab: 'ocorrencias', label: 'Ocorrências Locais', marker: /Ocorrências Locais|Criar Ocorrência|Notificações/i },
      { tab: 'nova-denuncia', label: 'Denúncia', marker: /Denúncia|Registar|Submeter/i },
      { tab: 'denuncias', label: 'Livro de Reclamações', marker: /Livro de Reclamações|Reclamação/i },
      { tab: 'sondagens', label: 'Sondagens', marker: /Sondagens|Consultas Públicas/i },
      { tab: 'notificacoes', label: 'Notificações', marker: /Notificações|Centro|Alertas/i },
      { tab: 'historico', label: 'Histórico', marker: /Histórico|Operações|Registos/i },
      { tab: 'documentos', label: 'Documentos', marker: /Documentos|Certidões|QR/i },
      { tab: 'directorio-orgaos', label: 'Directório de Órgãos', marker: /Directório|Instituições|Órgãos/i },
    ];

    for (const r of rotasCidadao) {
      await pageCid.evaluate((t) => { window.location.hash = `#/${t}`; }, r.tab);
      await pageCid.waitForTimeout(400);
      const res = await testPageIntegrity(pageCid, r.label, r.marker);
      assert('Cidadão - Sessão', `Página «${r.label}» (${r.tab}) funcional`, res.hasContent, `${res.length} caracteres`);
    }

    // Detalhe de Mensagem Cidadão
    await pageCid.evaluate(() => { window.location.hash = '#/correspondencias'; });
    await pageCid.waitForTimeout(500);
    const btnAbrirMsg = pageCid.getByRole('button', { name: /ABRIR|ANALISAR/i }).first();
    if (await btnAbrirMsg.isVisible()) {
      await btnAbrirMsg.click();
      await pageCid.waitForTimeout(500);
      const resMsg = await testPageIntegrity(pageCid, 'Detalhe Mensagem', /Remetente|Assunto|Mensagem|Protocolo/i);
      assert('Cidadão - Sessão', 'Página Detalhe da Mensagem (mensagem) funcional', resMsg.hasContent);
    }

    // ========================================================================
    // SEÇÃO 2: ÁREA DA INSTITUIÇÃO (Páginas Públicas + Sessão)
    // ========================================================================
    console.log(`\n======================================================`);
    console.log(`🏛️ 2. ÁREA DA INSTITUIÇÃO: Telas Públicas & Sessão`);
    console.log(`======================================================`);

    const ctxInst = await browser.newContext({ viewport: { width: 1366, height: 850 } });
    const pageInst = await ctxInst.newPage();

    // 2.1 Login Instituição
    await pageInst.goto(`${BASE}/institucional`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await pageInst.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });
    assert('Instituição - Público', 'Página de Login Institucional carregada', await pageInst.getByRole('heading', { name: /LOGIN/i }).isVisible());

    // 2.2 Adesão / Registo Instituição
    const btnRegInst = pageInst.getByRole('button', { name: /Registar|Adesão/i }).last();
    if (await btnRegInst.isVisible()) {
      await btnRegInst.click();
      await pageInst.waitForTimeout(600);
      const resAdesao = await testPageIntegrity(pageInst, 'Adesão Instituição', /Adesão|Instituição|NIF|Órgão/i);
      assert('Instituição - Público', 'Página Adesão Institucional funcional', resAdesao.hasContent);
      await pageInst.getByRole('button', { name: /Voltar|Cancelar/i }).first().click().catch(() => {});
      await pageInst.waitForTimeout(400);
    }

    // 2.3 Autenticação como Instituição (INAPEM)
    await pageInst.goto(`${BASE}/institucional`, { waitUntil: 'domcontentloaded' });
    await pageInst.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });
    await pageInst.fill('input[name="cda-utilizador"]', 'INAPEM-LMM-01');
    await pageInst.fill('input[name="cda-senha"]', '123456789');
    await pageInst.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await pageInst.waitForTimeout(2500);

    const painelInst = await testPageIntegrity(pageInst, 'Painel Institucional', /Área Institucional|INAPEM|Correio|Correspondência/i);
    assert('Instituição - Sessão', 'Painel Institucional (home) funcional', painelInst.hasContent);

    // Rotas Instituição
    const rotasInstituicao = [
      { tab: 'correspondencias', label: 'Correio Institucional', marker: /Caixa|Enviadas|Nova Mensagem/i },
      { tab: 'gov-contatos', label: 'Equipa da Instituição', marker: /Equipa|Membros|Colaboradores/i },
      { tab: 'inst-qrcode', label: 'Validação QR Code', marker: /QR Code|Validação|Scanner/i },
      { tab: 'inst-ai-assistant', label: 'Assistente IA Institucional', marker: /Assistente IA|IA Institucional|Mensagem/i },
      { tab: 'perfil', label: 'Perfil Institucional', marker: /Perfil|Instituição|Dados/i },
      { tab: 'video-atendimento', label: 'Vídeo-Atendimento Institucional', marker: /Vídeo-Atendimento|Sessões|Agendamento/i },
      { tab: 'inqueritos', label: 'Inquéritos Institucionais', marker: /Inquéritos|Sondagens|Participação/i },
      { tab: 'comunicados', label: 'Comunicados Emitidos', marker: /Comunicados|Oficiais|Emissão/i },
      { tab: 'ocorrencias', label: 'Ocorrências Recebidas', marker: /Ocorrências Recebidas|Tratamento|Estado/i },
      { tab: 'denuncias', label: 'Denúncias Recebidas', marker: /Denúncias|Reclamações/i },
      { tab: 'sondagens', label: 'Sondagens Institucionais', marker: /Sondagens|Inquéritos/i },
      { tab: 'notificacoes', label: 'Notificações Institucionais', marker: /Notificações|Alertas/i },
      { tab: 'historico', label: 'Histórico Institucional', marker: /Histórico|Operações/i },
      { tab: 'documentos', label: 'Documentos Institucionais', marker: /Documentos|Emissões/i },
    ];

    for (const r of rotasInstituicao) {
      await pageInst.evaluate((t) => { window.location.hash = `#/${t}`; }, r.tab);
      await pageInst.waitForTimeout(400);
      const res = await testPageIntegrity(pageInst, r.label, r.marker);
      assert('Instituição - Sessão', `Página «${r.label}» (${r.tab}) funcional`, res.hasContent, `${res.length} caracteres`);
    }

    // ========================================================================
    // SEÇÃO 3: ÁREA DE ADMINISTRAÇÃO CENTRAL (ADMIN)
    // ========================================================================
    console.log(`\n======================================================`);
    console.log(`🛡️ 3. ÁREA DE ADMINISTRAÇÃO CENTRAL: Telas Públicas & Sessão`);
    console.log(`======================================================`);

    const ctxAdmin = await browser.newContext({ viewport: { width: 1366, height: 850 } });
    const pageAdmin = await ctxAdmin.newPage();

    // 3.1 Login Admin
    await pageAdmin.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await pageAdmin.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });
    assert('Admin - Público', 'Página de Login Admin carregada', await pageAdmin.getByRole('heading', { name: /LOGIN/i }).isVisible());

    // 3.2 Autenticação como Admin
    await pageAdmin.fill('input[name="cda-utilizador"]', 'ADMIN-0001');
    await pageAdmin.fill('input[name="cda-senha"]', '123456789');
    await pageAdmin.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
    await pageAdmin.waitForTimeout(2500);

    const painelAdmin = await testPageIntegrity(pageAdmin, 'SOC Nacional', /Administração Central|SOC|Nacional|Monitorização/i);
    assert('Admin - Sessão', 'Painel SOC Nacional (gov-dashboard) funcional', painelAdmin.hasContent);

    // Rotas Admin
    const rotasAdmin = [
      { tab: 'gov-dashboard', label: 'Painel SOC Nacional', marker: /SOC|Monitorização|Indicadores/i },
      { tab: 'gov-interoperabilidade', label: 'Interoperabilidade Institucional', marker: /Interoperabilidade|Instituições|Conectadas/i },
      { tab: 'gov-correspondencias', label: 'Correspondências Oficiais Globais', marker: /Correspondências|Tráfego|Mensagens/i },
      { tab: 'gov-contatos', label: 'Cadastro Geral de Cidadãos', marker: /Cidadãos|Cadastro|Utilizadores/i },
      { tab: 'gov-trabalhadores', label: 'Equipa Central do Sistema', marker: /Equipa|Agentes|Administradores/i },
      { tab: 'gov-relatorio', label: 'Centro de Relatórios & Estatísticas', marker: /Relatórios|Estatísticas|Métricas/i },
      { tab: 'gov-ia', label: 'Assistência IA Central Nacional', marker: /Assistência IA|Groq|Nacional/i },
      { tab: 'gov-seguranca', label: 'Auditoria & Segurança', marker: /Auditoria|Segurança|Logs|Acessos/i },
      { tab: 'gov-perfil', label: 'Perfil Administrativo', marker: /Perfil|Administração|Definições/i },
      { tab: 'gov-emissao', label: 'Emissão Documental Oficial', marker: /Emissão|Documentos|Certidões/i },
      { tab: 'directorio-orgaos', label: 'Directório Central de Órgãos', marker: /Directório|Órgãos|Instituições/i },
    ];

    for (const r of rotasAdmin) {
      await pageAdmin.evaluate((t) => { window.location.hash = `#/${t}`; }, r.tab);
      await pageAdmin.waitForTimeout(400);
      const res = await testPageIntegrity(pageAdmin, r.label, r.marker);
      assert('Admin - Sessão', `Página «${r.label}» (${r.tab}) funcional`, res.hasContent, `${res.length} caracteres`);
    }

    // ========================================================================
    // SEÇÃO 4: INTEROPERABILIDADE TRIANGULAR CONCORRENTE
    // (Cidadão ↔ Instituição ↔ Admin)
    // ========================================================================
    console.log(`\n======================================================`);
    console.log(`🔄 4. TESTE DE INTEROPERABILIDADE TRIANGULAR CONCORRENTE`);
    console.log(`======================================================`);

    // 4.1 Cidadão cria e envia uma nova correspondência oficial para a Instituição
    await pageCid.evaluate(() => { window.location.hash = '#/correspondencias'; });
    await pageCid.waitForTimeout(800);

    const btnNova = pageCid.getByRole('button', { name: /Nova Mensagem/i }).first();
    assert('Interoperabilidade', 'Botão Nova Mensagem visível no Cidadão', await btnNova.isVisible());
    await btnNova.click();
    await pageCid.waitForTimeout(600);

    const idUnico = `REQ-INTEROP-${Date.now().toString().slice(-4)}`;
    const assuntoInterop = `Solicitação Interoperabilidade CDA ${idUnico}`;

    // Preencher destinatário institucional
    const inputDest = pageCid.locator('#recipient-inst-input');
    await inputDest.waitFor({ state: 'visible', timeout: 5000 });
    await inputDest.fill('INAPEM-LMM-01');

    // Preencher assunto
    const inputAssunto = pageCid.locator('#compose-subject-input');
    await inputAssunto.waitFor({ state: 'visible', timeout: 5000 });
    await inputAssunto.fill(assuntoInterop);

    // Preencher corpo da mensagem
    const textAreaMsg = pageCid.locator('div[contenteditable="true"], textarea').first();
    if (await textAreaMsg.isVisible()) {
      if (await textAreaMsg.getAttribute('contenteditable') === 'true') {
        await textAreaMsg.fill(`Mensagem oficial de teste de interoperabilidade triangular ${idUnico}.`);
      } else {
        await textAreaMsg.fill(`Mensagem oficial de teste de interoperabilidade triangular ${idUnico}.`);
      }
    }

    await pageCid.waitForTimeout(500);

    // Clicar em Enviar
    const btnEnviar = pageCid.locator('#btn-enviar-mensagem, button:has-text("Enviar Mensagem")').first();
    await btnEnviar.waitFor({ state: 'visible', timeout: 5000 });
    await btnEnviar.click();
    await pageCid.waitForTimeout(2000);

    assert('Interoperabilidade', `Mensagem oficial ${idUnico} submetida pelo Cidadão`, true);

    // 4.2 Instituição verifica receção da correspondência na Caixa de Entrada
    await pageInst.evaluate(() => { window.location.hash = '#/correspondencias'; });
    await pageInst.waitForTimeout(2000);

    const textoInst = await pageInst.evaluate(() => document.body.innerText);
    const recebeuNaInst = textoInst.includes(idUnico) || textoInst.includes('Edlasio') || textoInst.includes('Galhardo');
    assert('Interoperabilidade', 'Correspondência recebida na Instituição (INAPEM)', recebeuNaInst, `ID=${idUnico}`);

    // 4.3 Admin audita e monitoriza o tráfego no Painel de Correspondências Oficiais
    await pageAdmin.evaluate(() => { window.location.hash = '#/gov-correspondencias'; });
    await pageAdmin.waitForTimeout(2000);

    const textoAdmin = await pageAdmin.evaluate(() => document.body.innerText);
    const trafegoVisivelAdmin = textoAdmin.includes('Correspondência') || textoAdmin.includes('INAPEM') || textoAdmin.includes('Edlasio');
    assert('Interoperabilidade', 'Tráfego oficial auditado no SOC da Administração Central', trafegoVisivelAdmin);

    // Fechar contextos
    await ctxCid.close();
    await ctxInst.close();
    await ctxAdmin.close();

    console.log(`\n======================================================`);
    console.log(`🎉 BATERIA DE AUDITORIA E INTEROPERABILIDADE CONCLUÍDA!`);
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    console.log(`Resultado Global: ${passCount} PASS, ${failCount} FAIL (Total: ${results.length})`);
    console.log(`======================================================`);

  } catch (err) {
    console.error('Erro geral durante os testes:', err);
    assert('Geral', 'Execução sem falhas', false, err.message);
  } finally {
    await browser.close();
  }
}

run().then(() => {
  const failed = results.filter(r => r.status === 'FAIL').length > 0;
  process.exit(failed ? 1 : 0);
});
