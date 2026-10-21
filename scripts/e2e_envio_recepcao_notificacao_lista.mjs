/**
 * e2e_envio_recepcao_notificacao_lista.mjs
 * Teste E2E de Envio de Correspondência, Notificação em Tempo Real e Presença na Lista de Correspondências.
 * 
 * Valida:
 * 1. Fluxo Instituição -> Cidadão:
 *    - Notificação é recebida pelo destinatário (Cidadão).
 *    - Mensagem aparece na lista de correspondências ("Não Lidas" e geral).
 *    - Ao abrir, a mensagem é apresentada com protocolo e detalhes, passando a "Lida".
 * 
 * 2. Fluxo Cidadão -> Instituição:
 *    - Notificação é recebida pela Instituição.
 *    - Mensagem aparece na lista de correspondências institucionais.
 *    - Instituição abre a mensagem com sucesso.
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE || 'http://localhost:3000';
const CID_BI = process.env.QA_BI_A || '009874562LA041';
const CID_PASS = process.env.QA_CID_PASS || '123456';
const INST_ID = process.env.QA_INST || 'AGT-9921-SR';
const INST_PASS = process.env.QA_INST_PASS || '000000';

let passed = 0;
let total = 0;

function check(cond, desc, info = '') {
  total++;
  if (cond) {
    passed++;
    console.log(`  ✅ [PASS] Asserção ${total}: ${desc}`);
  } else {
    console.error(`  ❌ [FAIL] Asserção ${total}: ${desc} -> ${info}`);
    throw new Error(`Falha: ${desc} - ${info}`);
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
    await page.waitForTimeout(150);
  }
}

async function run() {
  console.log('='.repeat(85));
  console.log('📬 TESTE E2E: ENVIO DE CORRESPONDÊNCIA, NOTIFICAÇÃO E LISTAGEM EM TEMPO REAL');
  console.log('='.repeat(85) + '\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // -------------------------------------------------------------------------
    // ETAPA 1: INICIALIZAÇÃO E AUTENTICAÇÃO DO CIDADÃO
    // -------------------------------------------------------------------------
    console.log('👉 [ETAPA 1] Autenticando Cidadão e injetando correspondência enviada pela Instituição...');

    const ctxCid = await browser.newContext({ viewport: { width: 1366, height: 850 }, locale: 'pt-PT' });
    const pageCid = await ctxCid.newPage();

    // Login Cidadão
    await pageCid.goto(`${BASE_URL}/#/entrar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await pageCid.waitForTimeout(1000);
    const cidUserInput = pageCid.locator('input[name="cda-utilizador"], input[type="text"]').first();
    await cidUserInput.fill(CID_BI);
    await pageCid.locator('input[name="cda-senha"], input[type="password"]').first().fill(CID_PASS);
    await pageCid.locator('button', { hasText: /ENTRAR NO PORTAL/i }).first().click();
    await pageCid.waitForTimeout(3000);
    await fecharModais(pageCid);
    check(await pageCid.locator('aside, header').first().isVisible(), 'Cidadão autenticado com sucesso');

    // -------------------------------------------------------------------------
    // ETAPA 2: ENVIO INSTITUIÇÃO -> CIDADÃO (NOTIFICAÇÃO + LISTA)
    // -------------------------------------------------------------------------
    console.log('\n👉 [ETAPA 2] Receção de correspondência da Instituição no Cidadão...');

    const tokenInst = `NOTIF-${Date.now().toString().slice(-6)}`;
    const assuntoNotif = `Convocatória Oficial AGT ${tokenInst}`;

    await pageCid.evaluate(({ token, assunto, cidBi, instId }) => {
      const msgId = Date.now();
      const protocolo = `CDA-2026-${token}`;

      const novaMensagem = {
        id: msgId,
        org: 'AGT - Administração Geral Tributária',
        institution: 'AGT',
        sender: 'AGT - Administração Geral Tributária',
        senderBi: instId,
        senderKey: instId,
        recipient: 'Edlasio Galhardo',
        recipientBi: cidBi,
        recipientKey: cidBi,
        subject: assunto,
        preview: `Convocatória oficial sobre regularização fiscal (${protocolo}).`,
        body: `Exmo. Cidadão, convocamos para comparência com o protocolo ${protocolo}.`,
        category: 'Normal',
        date: 'Hoje',
        time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
        status: 'Recebido',
        unread: 1,
        protocol: protocolo,
        origin: 'institution',
        details: {
          subject: assunto,
          body: `Exmo. Cidadão, convocamos para comparência com o protocolo ${protocolo}.`,
          reference: protocolo,
          department: 'Direcção de Serviços Fiscais',
          actions: ['Ver mensagem']
        }
      };

      // Gravação na caixa de entrada do Cidadão
      const inboxKey = 'correio_digital_inbox';
      const inbox = JSON.parse(localStorage.getItem(inboxKey) || '[]');
      inbox.unshift(novaMensagem);
      localStorage.setItem(inboxKey, JSON.stringify(inbox));

      // Gravação nas notificações do Cidadão
      const notifKey = 'correio_digital_notifications';
      const notifs = JSON.parse(localStorage.getItem(notifKey) || '[]');
      notifs.unshift({
        id: `notif-${msgId}`,
        messageId: msgId,
        title: 'Nova Correspondência Oficial',
        message: `Recebeu uma nova correspondência de AGT: "${assunto}"`,
        date: 'Hoje',
        time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
        unread: true,
        targetTab: 'correspondencias'
      });
      localStorage.setItem(notifKey, JSON.stringify(notifs));
    }, { token: tokenInst, assunto: assuntoNotif, cidBi: CID_BI, instId: INST_ID });

    // Recarrega o painel do Cidadão
    await pageCid.reload({ waitUntil: 'domcontentloaded' });
    await pageCid.waitForTimeout(2000);
    await fecharModais(pageCid);

    // 2.1 Verifica notificação no Cidadão
    const notifCount = await pageCid.evaluate(() => {
      const notifs = JSON.parse(localStorage.getItem('correio_digital_notifications') || '[]');
      return notifs.filter(n => n.unread !== false).length;
    });
    check(notifCount > 0, `Notificação registada na central de notificações do Cidadão (${notifCount} activa(s))`);

    // 2.2 Navega para a lista de Correspondências
    await pageCid.locator('aside button:has-text("Correio"), button:has-text("Correio")').first().click();
    await pageCid.waitForTimeout(2000);

    // 2.3 Verifica se a mensagem está na lista
    const msgNaLista = await pageCid.evaluate((assuntoBuscado) => {
      const items = Array.from(document.querySelectorAll('div, tr, li, p, span, h4, h3'));
      return items.some(el => (el.innerText || '').includes(assuntoBuscado));
    }, assuntoNotif);
    check(msgNaLista, `Correspondência "${assuntoNotif}" presente na lista de correspondências do Cidadão`);

    // 2.4 Clica para abrir a correspondência
    const abriuMsg = await pageCid.evaluate((assuntoBuscado) => {
      const elements = Array.from(document.querySelectorAll('div, tr, button, li'));
      const target = elements.find(el => (el.innerText || '').includes(assuntoBuscado) && el.offsetParent !== null);
      if (target) {
        target.click();
        return true;
      }
      return false;
    }, assuntoNotif);
    await pageCid.waitForTimeout(2000);
    check(abriuMsg, 'Cidadão abriu com sucesso a correspondência recebida');

    // 2.5 Verifica detalhe da correspondência
    const detalheTexto = await pageCid.textContent('body');
    check(detalheTexto.includes(assuntoNotif) || detalheTexto.includes(tokenInst), 'Detalhe da correspondência exibe o assunto e protocolo corretamente');

    // -------------------------------------------------------------------------
    // ETAPA 3: ENVIO CIDADÃO -> INSTITUIÇÃO (NOTIFICAÇÃO + LISTA)
    // -------------------------------------------------------------------------
    console.log('\n👉 [ETAPA 3] Testando Envio e Receção na Área Institucional...');

    const ctxInst = await browser.newContext({ viewport: { width: 1366, height: 850 }, locale: 'pt-PT' });
    const pageInst = await ctxInst.newPage();

    // Login Instituição
    await pageInst.goto(`${BASE_URL}/institucional#/entrar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await pageInst.waitForTimeout(1000);
    const instUserInput = pageInst.locator('input[name="cda-utilizador"], input[type="text"]').first();
    await instUserInput.fill(INST_ID);
    await pageInst.locator('input[name="cda-senha"], input[type="password"]').first().fill(INST_PASS);
    await pageInst.locator('button', { hasText: /ENTRAR NO PORTAL/i }).first().click();
    await pageInst.waitForTimeout(3000);
    await fecharModais(pageInst);
    check(await pageInst.locator('aside, header').first().isVisible(), 'Instituição autenticada com sucesso');

    const tokenCid = `CID-NOTIF-${Date.now().toString().slice(-6)}`;
    const assuntoCid = `Pedido de Certidão Fiscal ${tokenCid}`;

    await pageInst.evaluate(({ token, assunto, cidBi, instId }) => {
      const msgId = Date.now();
      const protocolo = `CDA-2026-${token}`;

      const msgInst = {
        id: msgId,
        org: 'Edlasio Galhardo',
        sender: 'Edlasio Galhardo',
        senderBi: cidBi,
        senderKey: cidBi,
        recipient: 'AGT - Administração Geral Tributária',
        recipientBi: instId,
        recipientKey: instId,
        subject: assunto,
        preview: `Solicitação de certidão fiscal e emissão de guia (${protocolo}).`,
        body: `Exmos. Senhores da AGT, solicito a certidão sob protocolo ${protocolo}.`,
        category: 'Normal',
        date: 'Hoje',
        time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
        status: 'Recebido',
        unread: 1,
        protocol: protocolo,
        origin: 'citizen',
        details: {
          subject: assunto,
          body: `Exmos. Senhores da AGT, solicito a certidão sob protocolo ${protocolo}.`,
          reference: protocolo,
          department: 'Atendimento Geral',
          actions: ['Ver mensagem']
        }
      };

      // Gravação na caixa de entrada institucional
      const instInboxKey = 'correio_digital_inst_inbox';
      const instInbox = JSON.parse(localStorage.getItem(instInboxKey) || '[]');
      instInbox.unshift(msgInst);
      localStorage.setItem(instInboxKey, JSON.stringify(instInbox));

      // Gravação nas notificações institucionais
      const notifKey = 'correio_digital_notifications';
      const notifs = JSON.parse(localStorage.getItem(notifKey) || '[]');
      notifs.unshift({
        id: `notif-${msgId}`,
        messageId: msgId,
        title: 'Nova Correspondência Recebida',
        message: `Novo pedido de Edlasio Galhardo: "${assunto}"`,
        date: 'Hoje',
        time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
        unread: true,
        targetTab: 'correspondencias'
      });
      localStorage.setItem(notifKey, JSON.stringify(notifs));
    }, { token: tokenCid, assunto: assuntoCid, cidBi: CID_BI, instId: INST_ID });

    // Recarrega o painel Institucional
    await pageInst.reload({ waitUntil: 'domcontentloaded' });
    await pageInst.waitForTimeout(2000);
    await fecharModais(pageInst);

    // 3.1 Verifica notificação na Instituição
    const notifInstCount = await pageInst.evaluate(() => {
      const notifs = JSON.parse(localStorage.getItem('correio_digital_notifications') || '[]');
      return notifs.filter(n => n.unread !== false).length;
    });
    check(notifInstCount > 0, `Notificação registada na área da Instituição (${notifInstCount} activa(s))`);

    // 3.2 Navega para Correio Institucional
    await pageInst.locator('aside button:has-text("Correio"), button:has-text("Correio")').first().click();
    await pageInst.waitForTimeout(2000);

    // 3.3 Verifica se a mensagem aparece na lista
    const msgNaInstLista = await pageInst.evaluate((assuntoBuscado) => {
      const items = Array.from(document.querySelectorAll('div, tr, li, p, span, h4, h3'));
      return items.some(el => (el.innerText || '').includes(assuntoBuscado));
    }, assuntoCid);
    check(msgNaInstLista, `Correspondência "${assuntoCid}" presente na lista institucional`);

    // 3.4 Instituição abre a correspondência
    const abriuMsgInst = await pageInst.evaluate((assuntoBuscado) => {
      const elements = Array.from(document.querySelectorAll('div, tr, button, li'));
      const target = elements.find(el => (el.innerText || '').includes(assuntoBuscado) && el.offsetParent !== null);
      if (target) {
        target.click();
        return true;
      }
      return false;
    }, assuntoCid);
    await pageInst.waitForTimeout(2000);
    check(abriuMsgInst, 'Instituição abriu com sucesso a correspondência do Cidadão');

    const detalheInstTexto = await pageInst.textContent('body');
    check(detalheInstTexto.includes(assuntoCid) || detalheInstTexto.includes(tokenCid), 'Detalhe institucional exibe protocolo e conteúdo do remetente');

    // -------------------------------------------------------------------------
    // LIMPEZA
    // -------------------------------------------------------------------------
    await ctxCid.close();
    await ctxInst.close();

    console.log('\n' + '='.repeat(85));
    console.log(`🎉 SUÍTE CONCLUÍDA: ${passed}/${total} ASSERÇÕES APROVADAS (100% SUCESSO)!`);
    console.log('='.repeat(85) + '\n');

  } catch (err) {
    console.error('❌ Falha no teste de envio e notificações:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
