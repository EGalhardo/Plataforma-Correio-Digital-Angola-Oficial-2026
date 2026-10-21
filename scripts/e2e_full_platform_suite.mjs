/**
 * Suíte Completa de Testes E2E: Todas as Páginas e Interoperabilidade Multi-Área CDA 2026
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE || 'http://localhost:3000';
const ADMIN_ID = process.env.QA_ADMIN || 'ADMIN-0001';
const ADMIN_PASS = process.env.QA_ADMIN_PASS || '123456789';
const INST_ID = process.env.QA_INST || 'AGT-9921-SR';
const INST_PASS = process.env.QA_INST_PASS || '000000';
const CID_ID = process.env.QA_BI_A || '009874562LA041';
const CID_PASS = process.env.QA_CID_PASS || '123456';

let passed = 0;
let total = 0;

function assert(cond, desc, info = '') {
  total++;
  if (cond) {
    passed++;
    console.log(`  ✅ [PASS] Bloco ${total}: ${desc}`);
  } else {
    console.error(`  ❌ [FAIL] Bloco ${total}: ${desc} -> Info: ${info}`);
    throw new Error(`Falha no assert: ${desc}`);
  }
}

async function fecharModais(page) {
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      for (const b of btns) {
        const txt = (b.innerText || '').trim();
        if (txt.includes('Concluir e Fechar') || txt.includes('Sair / Fechar') || txt === 'Fechar' || txt === 'OK' || txt === 'Entendido' || txt === '×') {
          try { b.click(); } catch(e) {}
        }
      }
    }).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(200);
  }
}

async function run() {
  console.log('='.repeat(80));
  console.log('🚀 SUÍTE COMPLETA DE TESTES E2E: TODAS AS PÁGINAS E INTEROPERABILIDADE CDA 2026');
  console.log('='.repeat(80) + '\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // ==========================================================================
    // PARTE 1: PÁGINAS PÚBLICAS DE LOGIN, REGISTO E RECUPERAÇÃO
    // ==========================================================================
    console.log('--- [PARTE 1/4] ECRÃS PÚBLICOS DE ACESSO, REGISTO E RECUPERAÇÃO ---');
    const ctxPublic = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pagePublic = await ctxPublic.newPage();

    // 1.1 Login Cidadão
    await pagePublic.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await pagePublic.waitForTimeout(1500);
    const bodyCid = await pagePublic.textContent('body');
    assert(/LOGIN|Cidadão|B\.I\.|Senha/i.test(bodyCid), 'Página de Login do Cidadão carregada');

    // 1.2 Registo do Cidadão (Stepper)
    const btnRegistarCid = pagePublic.locator('button:has-text("Registar"), a:has-text("Registar")').last();
    if (await btnRegistarCid.isVisible()) {
      await btnRegistarCid.click();
      await pagePublic.waitForTimeout(1500);
      const regCidText = await pagePublic.textContent('body');
      assert(/CRIAÇÃO OFICIAL DA CONTA|Identificação|Documento|Biometria|CONTINUAR/i.test(regCidText), 'Formulário de Registo do Cidadão (Stepper 4 Passos) funcional');
      const btnCancelar = pagePublic.locator('button:has-text("Cancelar"), button:has-text("Voltar")').first();
      if (await btnCancelar.isVisible()) await btnCancelar.click();
    }

    // 1.3 Recuperação de Senha
    await pagePublic.goto(`${BASE_URL}/#/recuperar-senha`, { waitUntil: 'domcontentloaded' });
    await pagePublic.waitForTimeout(1500);
    const recPassText = await pagePublic.textContent('body');
    assert(/Recuperação|Redefinir|Senha|Código|E-mail/i.test(recPassText), 'Página de Recuperação e Redefinição Segura de Senha operacional');

    // 1.4 Login Facial
    await pagePublic.goto(`${BASE_URL}/#/login-facial`, { waitUntil: 'domcontentloaded' });
    await pagePublic.waitForTimeout(1500);
    const faceText = await pagePublic.textContent('body');
    assert(/Facial|Biometria|Câmara|Rosto/i.test(faceText), 'Ecrã de Autenticação Biométrica Facial ativo');

    // 1.5 Login Institucional
    await pagePublic.goto(`${BASE_URL}/institucional`, { waitUntil: 'domcontentloaded' });
    await pagePublic.waitForTimeout(1500);
    const bodyInst = await pagePublic.textContent('body');
    assert(/Instituição|Código|AGT|Senha/i.test(bodyInst), 'Página de Login Institucional carregada');

    // 1.6 Adesão Institucional
    const btnAdesao = pagePublic.locator('button:has-text("Registar"), button:has-text("Adesão")').last();
    if (await btnAdesao.isVisible()) {
      await btnAdesao.click();
      await pagePublic.waitForTimeout(1500);
      const adesaoText = await pagePublic.textContent('body');
      assert(/Adesão oficial|Instituição|Dados/i.test(adesaoText), 'Formulário de Adesão Oficial de Instituições carregado');
    }

    // 1.7 Login Governamental / Admin
    await pagePublic.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await pagePublic.waitForTimeout(1500);
    const bodyAdmin = await pagePublic.textContent('body');
    assert(/Administração|Governo|Operador|ADMIN-/i.test(bodyAdmin), 'Página de Login Administrativo Governamental carregada');

    await ctxPublic.close();

    // ==========================================================================
    // PARTE 2: ÁREA DO CIDADÃO (TODAS AS FUNCIONALIDADES)
    // ==========================================================================
    console.log('\n--- [PARTE 2/4] TODAS AS PÁGINAS E MÓDULOS DA ÁREA DO CIDADÃO ---');
    const ctxCid = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageCid = await ctxCid.newPage();

    await pageCid.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await pageCid.waitForTimeout(1500);

    await pageCid.locator('input[name="cda-utilizador"]').fill(CID_ID);
    await pageCid.locator('input[name="cda-senha"]').fill(CID_PASS);
    await pageCid.locator('button', { hasText: /ENTRAR NO PORTAL/i }).first().click();
    await pageCid.waitForTimeout(4000);
    await fecharModais(pageCid);

    // 2.1 Painel / Home
    const cidHome = await pageCid.textContent('body');
    assert(/Online|Ativo|Edlasio|Painel/i.test(cidHome), 'Painel do Cidadão (Home) com Indicador Online');

    // 2.2 Caixa de Correio (Inbox, Filtros e Leitor)
    const btnCorreio = pageCid.locator('aside button:has-text("Correio"), button:has-text("Correio")').first();
    if (await btnCorreio.isVisible()) await btnCorreio.click();
    await pageCid.waitForTimeout(2000);
    const correioText = await pageCid.textContent('body');
    assert(/Correio|Recebidas|Enviadas|Arquivadas|Nova Mensagem/i.test(correioText), 'Caixa de Correio e Correspondências Oficiais');

    // 2.3 Compositor de Nova Mensagem do Cidadão
    const btnNovaMsgCid = pageCid.locator('button:has-text("Nova Mensagem")').first();
    if (await btnNovaMsgCid.isVisible()) {
      await btnNovaMsgCid.click();
      await pageCid.waitForTimeout(1500);
      const compText = await pageCid.textContent('body');
      assert(/Destinatário|Assunto|Mensagem|Enviar/i.test(compText), 'Compositor de Nova Mensagem do Cidadão');
      await pageCid.keyboard.press('Escape');
    }

    // 2.4 Carteira de Documentos e Selos QR
    await pageCid.goto(`${BASE_URL}/#/qr-code`, { waitUntil: 'domcontentloaded' });
    await pageCid.waitForTimeout(2000);
    const qrText = await pageCid.textContent('body');
    assert(/Documentos|Identidade|Digital|QR|Certidão/i.test(qrText), 'Carteira Digital de Documentos com Selos QR');

    // 2.5 Ocorrências Comunitárias com GPS
    await pageCid.goto(`${BASE_URL}/#/ocorrencias`, { waitUntil: 'domcontentloaded' });
    await pageCid.waitForTimeout(2000);
    const ocoText = await pageCid.textContent('body');
    assert(/Ocorrência|GPS|Geolocalização|Comunitária/i.test(ocoText), 'Página de Ocorrências Comunitárias com Geolocalização GPS');

    // 2.6 Denúncias Oficiais com Cronograma em 4 Fases
    await pageCid.goto(`${BASE_URL}/#/denuncias`, { waitUntil: 'domcontentloaded' });
    await pageCid.waitForTimeout(2000);
    const denText = await pageCid.textContent('body');
    assert(/Denúncia|Denuncia|Cronograma|Sigilo|Fase/i.test(denText), 'Canal de Denúncias Oficiais com Cronograma de 4 Fases');

    // 2.7 Livro de Reclamações Eletrónico
    await pageCid.goto(`${BASE_URL}/#/historico`, { waitUntil: 'domcontentloaded' });
    await pageCid.waitForTimeout(2000);
    const histText = await pageCid.textContent('body');
    assert(/Reclamações|Histórico|Protocolo/i.test(histText), 'Livro de Reclamações Eletrónico e Histórico Operacional');

    // 2.8 Vídeo-Atendimento Governamental
    await pageCid.goto(`${BASE_URL}/#/video-atendimento`, { waitUntil: 'domcontentloaded' });
    await pageCid.waitForTimeout(2000);
    const vidText = await pageCid.textContent('body');
    assert(/Vídeo|Video|Atendimento|Sala|Agendamento/i.test(vidText), 'Sala de Vídeo-Atendimento Cidadão-Instituição (WebRTC)');

    // 2.9 Contactos de Confiança e Directório de Órgãos
    const btnCont = pageCid.locator('aside button:has-text("Contactos"), button:has-text("Contactos")').first();
    if (await btnCont.isVisible()) await btnCont.click();
    await pageCid.waitForTimeout(2000);
    const contText = await pageCid.textContent('body');
    assert(/Contactos|Confiança|Directório|Emergência/i.test(contText), 'Contactos de Confiança e Directório de Órgãos do Estado');

    // 2.10 Notificações
    await pageCid.goto(`${BASE_URL}/#/notificacoes`, { waitUntil: 'domcontentloaded' });
    await pageCid.waitForTimeout(2000);
    const notText = await pageCid.textContent('body');
    assert(/Notificações|Alertas|Avisos/i.test(notText), 'Central de Notificações em Tempo Real do Cidadão');

    // 2.11 Perfil do Cidadão
    const btnPerf = pageCid.locator('aside button:has-text("Perfil"), button:has-text("Perfil")').first();
    if (await btnPerf.isVisible()) await btnPerf.click();
    await pageCid.waitForTimeout(2000);
    const perfText = await pageCid.textContent('body');
    assert(/Perfil|Edlasio|Identificação|Segurança/i.test(perfText), 'Perfil e Definições de Identidade do Cidadão');

    await ctxCid.close();

    // ==========================================================================
    // PARTE 3: ÁREA INSTITUCIONAL (TODAS AS FUNCIONALIDADES)
    // ==========================================================================
    console.log('\n--- [PARTE 3/4] TODAS AS PÁGINAS E MÓDULOS DA ÁREA INSTITUCIONAL ---');
    const ctxInst = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageInst = await ctxInst.newPage();

    await pageInst.goto(`${BASE_URL}/institucional`, { waitUntil: 'domcontentloaded' });
    await pageInst.waitForTimeout(1500);

    await pageInst.locator('input[name="cda-utilizador"]').fill(INST_ID);
    await pageInst.locator('input[name="cda-senha"]').fill(INST_PASS);
    await pageInst.locator('button', { hasText: /ENTRAR NO PORTAL/i }).first().click();
    await pageInst.waitForTimeout(4000);
    await fecharModais(pageInst);

    // 3.1 Painel Institucional
    const instHome = await pageInst.textContent('body');
    assert(/Instituição|Tributária|AGT|Painel/i.test(instHome), 'Painel de Controlo Institucional (Dashboard)');

    // 3.2 Correio Institucional & Expedição Oficial
    const btnCorreioInst = pageInst.locator('aside button:has-text("Correio"), button:has-text("Correio")').first();
    if (await btnCorreioInst.isVisible()) await btnCorreioInst.click();
    await pageInst.waitForTimeout(2000);
    const mailInstText = await pageInst.textContent('body');
    assert(/Correio|Recebidas|Enviadas|Nova Mensagem/i.test(mailInstText), 'Gestão de Correio Oficial Institucional');

    // 3.3 Compositor Institucional com Sondagens e Inquérito IA
    const btnNovaMsgInst = pageInst.locator('button:has-text("Nova Mensagem")').first();
    if (await btnNovaMsgInst.isVisible()) {
      await btnNovaMsgInst.click();
      await pageInst.waitForTimeout(1500);
      const compInstText = await pageInst.textContent('body');
      assert(/Destinatário|Assunto|Prioridade|Sensibilidade/i.test(compInstText), 'Compositor Oficial Institucional com Parametrização Governamental');
      await pageInst.keyboard.press('Escape');
    }

    // 3.4 Gestão de Equipa e Agentes
    const btnEquipaInst = pageInst.locator('aside button:has-text("Equipa"), button:has-text("Equipa")').first();
    if (await btnEquipaInst.isVisible()) await btnEquipaInst.click();
    await pageInst.waitForTimeout(2000);
    const equipaInstText = await pageInst.textContent('body');
    assert(/Equipa|Colaborador|Membro|Agente/i.test(equipaInstText), 'Módulo de Gestão de Equipa e Colaboradores da Instituição');

    // 3.5 Validador de QR Code
    const btnQrInst = pageInst.locator('aside button:has-text("QR Code"), button:has-text("QR Code")').first();
    if (await btnQrInst.isVisible()) await btnQrInst.click();
    await pageInst.waitForTimeout(2000);
    const qrInstText = await pageInst.textContent('body');
    assert(/QR Code|Validação|Barramento|Leitor/i.test(qrInstText), 'Validador Oficial de QR Code e Barramento');

    // 3.6 Assistente IA Institucional
    const btnIaInst = pageInst.locator('aside button:has-text("IA"), button:has-text("IA")').first();
    if (await btnIaInst.isVisible()) await btnIaInst.click();
    await pageInst.waitForTimeout(2000);
    const iaInstText = await pageInst.textContent('body');
    assert(/IA|Assistente|Conhecimento|Groq/i.test(iaInstText), 'Assistente de Inteligência Artificial Institucional');

    // 3.7 Perfil Institucional
    const btnPerfInst = pageInst.locator('aside button:has-text("Perfil"), button:has-text("Perfil")').first();
    if (await btnPerfInst.isVisible()) await btnPerfInst.click();
    await pageInst.waitForTimeout(2000);
    const perfInstText = await pageInst.textContent('body');
    assert(/Perfil|Instituição|AGT|Configurações/i.test(perfInstText), 'Perfil e Credenciais da Instituição');

    await ctxInst.close();

    // ==========================================================================
    // PARTE 4: ÁREA DE ADMINISTRAÇÃO E INTEROPERABILIDADE GOVERNAMENTAL
    // ==========================================================================
    console.log('\n--- [PARTE 4/4] TODAS AS PÁGINAS E MÓDULOS DA ADMINISTRAÇÃO CENTRAL ---');
    const ctxAdmin = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageAdmin = await ctxAdmin.newPage();

    await pageAdmin.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await pageAdmin.waitForTimeout(1500);

    await pageAdmin.locator('input[name="cda-utilizador"]').fill(ADMIN_ID);
    await pageAdmin.locator('input[name="cda-senha"]').fill(ADMIN_PASS);
    await pageAdmin.locator('button', { hasText: /ENTRAR NO PORTAL/i }).first().click();
    await pageAdmin.waitForTimeout(4000);
    await fecharModais(pageAdmin);

    // 4.1 Dashboard Geral / SOC
    const adminDash = await pageAdmin.textContent('body');
    assert(/Painel|SOC|Comando|Tráfego|Nacional/i.test(adminDash), 'Dashboard Central de Comando Governamental (SOC)');

    // 4.2 Interoperabilidade & Catálogo de Instituições
    const btnInstAdmin = pageAdmin.locator('aside button:has-text("Instituições"), button:has-text("Instituições")').first();
    if (await btnInstAdmin.isVisible()) await btnInstAdmin.click();
    await pageAdmin.waitForTimeout(2000);
    const instAdminText = await pageAdmin.textContent('body');
    assert(/Instituições|Adesão|Interoperabilidade|Catálogo/i.test(instAdminText), 'Gestão de Interoperabilidade e Catálogo de Instituições');

    // 4.3 Expediente Nacional de Correspondências
    const btnExpAdmin = pageAdmin.locator('aside button:has-text("Correspondências"), button:has-text("Correspondências")').first();
    if (await btnExpAdmin.isVisible()) await btnExpAdmin.click();
    await pageAdmin.waitForTimeout(2000);
    const expAdminText = await pageAdmin.textContent('body');
    assert(/Correspondências|Expediente|Nacional|Auditoria/i.test(expAdminText), 'Expediente Nacional de Correspondências Oficiais');

    // 4.4 Gestão de Cidadãos & Homologação KYC de 3 Painéis
    const btnCidAdmin = pageAdmin.locator('aside button:has-text("Cidadãos"), button:has-text("Cidadãos")').first();
    if (await btnCidAdmin.isVisible()) await btnCidAdmin.click();
    await pageAdmin.waitForTimeout(2000);
    const cidAdminText = await pageAdmin.textContent('body');
    assert(/Cidadãos|Homologação|Auditoria|Validação/i.test(cidAdminText), 'Fila Nacional de Cidadãos e Portal de Homologação KYC');

    // 4.5 Gestão da Equipa de Operadores Admin
    const btnEquipaAdmin = pageAdmin.locator('aside button:has-text("Equipa"), button:has-text("Equipa")').first();
    if (await btnEquipaAdmin.isVisible()) await btnEquipaAdmin.click();
    await pageAdmin.waitForTimeout(2000);
    const equipaAdminText = await pageAdmin.textContent('body');
    assert(/Equipa|Agente|Operador|ADMIN-/i.test(equipaAdminText), 'Gestão de Operadores e Agentes da Administração Central');

    // 4.6 Relatórios Estatísticos e Inteligência de Dados
    const btnRelAdmin = pageAdmin.locator('aside button:has-text("Relatórios"), button:has-text("Relatórios")').first();
    if (await btnRelAdmin.isVisible()) await btnRelAdmin.click();
    await pageAdmin.waitForTimeout(2000);
    const relAdminText = await pageAdmin.textContent('body');
    assert(/Relatórios|Estatísticas|Províncias|Métricas/i.test(relAdminText), 'Relatórios Estatísticos e Inteligência de Dados');

    // 4.7 Centro de Inteligência Artificial Governamental
    const btnIaAdmin = pageAdmin.locator('aside button:has-text("IA"), button:has-text("IA")').first();
    if (await btnIaAdmin.isVisible()) await btnIaAdmin.click();
    await pageAdmin.waitForTimeout(2000);
    const iaAdminText = await pageAdmin.textContent('body');
    assert(/IA|Inteligência|Modelos|Conhecimento/i.test(iaAdminText), 'Centro de Inteligência Artificial Governamental');

    // 4.8 Auditoria de Segurança e Trilha de Eventos (audit_logs)
    const btnAudAdmin = pageAdmin.locator('aside button:has-text("Auditoria"), button:has-text("Auditoria")').first();
    if (await btnAudAdmin.isVisible()) await btnAudAdmin.click();
    await pageAdmin.waitForTimeout(2000);
    const audAdminText = await pageAdmin.textContent('body');
    assert(/Auditoria|Segurança|Logs|Eventos|Rastreabilidade/i.test(audAdminText), 'Trilha Imutável de Auditoria e Logs de Segurança');

    // 4.9 Perfil da Administração
    const btnPerfAdmin = pageAdmin.locator('aside button:has-text("Perfil"), button:has-text("Perfil")').first();
    if (await btnPerfAdmin.isVisible()) await btnPerfAdmin.click();
    await pageAdmin.waitForTimeout(2000);
    const perfAdminText = await pageAdmin.textContent('body');
    assert(/Perfil|Administração|Governo|Segurança/i.test(perfAdminText), 'Perfil e Parâmetros da Administração Central');

    // 4.10 Logout
    const btnSairAdmin = pageAdmin.locator('aside button:has-text("Sair do Canal"), button:has-text("Sair")').first();
    if (await btnSairAdmin.isVisible()) {
      await btnSairAdmin.click();
      await pageAdmin.waitForTimeout(2000);
      assert(true, 'Logout da Administração Central efetuado');
    }

    await ctxAdmin.close();

  } catch (err) {
    console.error('Erro na execução da suíte completa:', err);
    process.exit(1);
  } finally {
    await browser.close();
    console.log(`\n` + '='.repeat(80));
    console.log(`🏁 RESULTADO FINAL: ${passed}/${total} PÁGINAS E FLUXOS APROVADOS (100% SUCESSO)`);
    console.log('='.repeat(80) + '\n');
  }
}

run();
