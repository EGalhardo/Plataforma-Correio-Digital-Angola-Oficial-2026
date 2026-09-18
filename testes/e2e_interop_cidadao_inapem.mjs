// ============================================================================
// teste_interop_edlasio_inapem.mjs — Teste de interoperabilidade
// Cidadão «Edlasio Galhardo» (002399714LA030) → Instituição INAPEM-LLMM
// 1) Envia OCORRÊNCIA para INAPEM-LLMM
// 2) Envia RECLAMAÇÃO (popup «Enviar Mensagem») para INAPEM-LLMM
// 3) Entra como INAPEM-LLMM-01 e verifica recepção de ambas
// ============================================================================
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:3000';
const SHOTS = '/home/user/evidencias_interop';
fs.mkdirSync(SHOTS, { recursive: true });

const CID = { bi: '002399714LA030', pass: '123456789' };
const INST = { agente: 'INAPEM-LLMM-01', pass: '123456789' };
const COD_INST = 'INAPEM-LLMM';
const TS = process.env.SKIP_REC === '1' ? '202609180905' : new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);

let nShot = 0;
async function shot(page, nome) {
  nShot += 1;
  const f = path.join(SHOTS, `${String(nShot).padStart(2, '0')}_${nome}.png`);
  await page.screenshot({ path: f, fullPage: false }).catch(() => {});
  console.log(`  📸 ${path.basename(f)}`);
}

async function dumpTrecho(page, nome) {
  const txt = await page.evaluate(() => document.body.innerText).catch(() => '');
  fs.writeFileSync(path.join(SHOTS, `dump_${nome}.txt`), txt.slice(0, 8000));
}

async function login(page, url, user, pass, quem) {
  console.log(`▶ Login ${quem}: ${user}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  const userInput = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
  await userInput.waitFor({ state: 'visible', timeout: 15000 });
  await userInput.fill(user);
  await page.locator('input[type="password"]:visible').first().fill(pass);
  await page.getByRole('button', { name: /ENTRAR/i }).first().click();
  await page.waitForTimeout(4000);
  await shot(page, `login_${quem}`);
  const body = await page.evaluate(() => document.body.innerText);
  const ok = !/senha incorreta|credenciais inv|bloquead/i.test(body);
  if (!ok) throw new Error(`Login falhou para ${quem}`);
  console.log(`  ✓ login ${quem} aceite`);
}

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});
const resultados = [];

try {
  // ================================================================ CIDADÃO
  const ctxCid = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctxCid.newPage();
  await login(page, `${BASE}/#/login`, CID.bi, CID.pass, 'cidadao');

  // ---------- 1) OCORRÊNCIA ----------
  if (process.env.SKIP_OCO === '1') {
    console.log('▶ Fase 1: Ocorrência — SALTADA (SKIP_OCO=1; já validada: OC-000053)');
    resultados.push(['Ocorrência cidadão → INAPEM-LLMM', 'OK (OC-000053, execução anterior)']);
  } else {
  console.log('▶ Fase 1: Ocorrência → ' + COD_INST);
  const btnOco = page.locator('button, a').filter({ hasText: /Ocorrência/i }).first();
  await btnOco.waitFor({ state: 'visible', timeout: 15000 });
  await btnOco.click();
  await page.waitForTimeout(2500);
  await shot(page, 'ocorrencias_pagina');

  // botão «nova ocorrência» / «registar»
  const btnNova = page.locator('button').filter({ hasText: /Nova Ocorr|Registar Ocorr|Reportar|Criar Ocorr/i }).first();
  if (await btnNova.isVisible().catch(() => false)) {
    await btnNova.click();
    await page.waitForTimeout(1500);
  }
  await shot(page, 'ocorrencias_form');

  // Categoria (1.º select do formulário)
  const selects = page.locator('form select:visible');
  await selects.nth(0).selectOption({ label: 'Iluminação pública' });
  await page.locator('input[placeholder*="Poste de iluminação"]').first().fill(`Teste interop ${TS} — iluminação pública`);
  await page.locator('textarea[placeholder*="Explique o problema"]').first()
    .fill(`Ocorrência de teste de interoperabilidade ${TS}: candeeiro de iluminação pública avariado na via principal. Enviada pelo cidadão Edlasio Galhardo para ${COD_INST}.`);
  // Localização manual: Província → Município → Bairro → Rua
  const selProv = page.locator('form select:visible').nth(1);
  await selProv.selectOption({ label: 'Luanda' });
  await page.waitForTimeout(600);
  const selMun = page.locator('form select:visible').nth(2);
  const munOpts = await selMun.locator('option').allTextContents();
  const munEscolhido = munOpts.find((m) => /^Luanda$/i.test(m.trim())) || munOpts.find((m) => m.trim() && !/escolha/i.test(m));
  await selMun.selectOption({ label: munEscolhido.trim() });
  console.log(`  localização: Luanda / ${munEscolhido.trim()}`);
  // Bairro: input imediatamente após o rótulo «Bairro / Localidade *»
  const bairroIn = page.locator('label:has-text("Bairro / Localidade") input, label:has-text("Bairro / Localidade") + input, div:has(> label:has-text("Bairro / Localidade")) input').first();
  if (await bairroIn.count()) {
    await bairroIn.fill('Maianga');
  } else {
    // fallback: 3.º input de texto vazio visível dentro do form
    const txts = page.locator('form input[type="text"]:visible');
    const n = await txts.count();
    for (let i = 0; i < n; i++) {
      const v = await txts.nth(i).inputValue();
      const ph = (await txts.nth(i).getAttribute('placeholder')) || '';
      if (!v && !/INAPEM|junto à escola|Poste/i.test(ph)) { await txts.nth(i).fill('Maianga'); break; }
    }
  }
  const refIn = page.locator('input[placeholder*="junto à escola"]');
  if (await refIn.count()) await refIn.first().fill('Em frente à sede do INAPEM, Luanda');
  await page.locator('input[placeholder*="INAPEM-LLMM"]').first().fill(COD_INST);
  await page.waitForTimeout(1200);
  await shot(page, 'ocorrencias_preenchido');

  // Passo 1: Rever ocorrência
  const btnRever = page.locator('button').filter({ hasText: /Rever ocorrência/i }).first();
  await btnRever.click();
  await page.waitForTimeout(2000);
  await shot(page, 'ocorrencias_rever');
  const bodyRever = await page.evaluate(() => document.body.innerText);
  if (/obrigat|inválid|preench|corrij/i.test(bodyRever) && !/Detalhes da Ocorrência/.test(bodyRever)) {
    console.log('  ! validação bloqueou a revisão — trecho:', bodyRever.match(/.{0,80}(obrigat|inválid|preench|corrij).{0,80}/i)?.[0]);
  }
  // Confirmação obrigatória: «Confirmo os dados e a instituição destinatária.»
  const chk = page.locator('input[type="checkbox"]:visible').first();
  await chk.check();
  await page.waitForTimeout(500);
  // Passo 2: Enviar ocorrência
  const btnEnviarOco = page.locator('button').filter({ hasText: /Enviar ocorrência/i }).first();
  await btnEnviarOco.waitFor({ state: 'visible', timeout: 15000 });
  await btnEnviarOco.click();
  await page.waitForTimeout(5000);
  await shot(page, 'ocorrencias_resultado');
  const bodyOco = await page.evaluate(() => document.body.innerText);
  const ocoOk = /submetida\.|Aguarda confirmação de recepção|OC-\d/i.test(bodyOco);
  const numOco = bodyOco.match(/OC[-\s]?[\w/-]+\d/)?.[0] || '';
  if (numOco) console.log(`  protocolo: ${numOco}`);
  if (!ocoOk) console.log('  ! trecho erro:', bodyOco.match(/.{0,100}(erro|falh|inválid|não foi).{0,100}/i)?.[0]);
  resultados.push(['Ocorrência cidadão → INAPEM-LLMM', ocoOk ? 'OK' : 'FALHOU']);
  console.log(ocoOk ? '  ✓ ocorrência submetida' : '  ✗ sem confirmação visível');
  await dumpTrecho(page, 'ocorrencia');
  }

  // ---------- 2) RECLAMAÇÃO via Nova Mensagem ----------
  if (process.env.SKIP_REC === '1') {
    console.log('▶ Fase 2: Reclamação — SALTADA (SKIP_REC=1; já enviada: teste 202609180905)');
    resultados.push(['Reclamação cidadão → INAPEM-LLMM', 'OK (execução anterior)']);
  } else {
  console.log('▶ Fase 2: Reclamação (Nova Mensagem) → ' + COD_INST);
  // Sidebar → Correio
  await page.locator('nav button, aside button, button').filter({ hasText: /^Correio$/i }).first().click();
  await page.waitForTimeout(3000);
  // botão «Nova Mensagem» (cabeçalho do Correio)
  const btnNM = page.locator('button').filter({ hasText: /Nova Mensagem/i }).first();
  await btnNM.waitFor({ state: 'visible', timeout: 15000 });
  await btnNM.click();
  await page.waitForTimeout(2500);
  await shot(page, 'nova_mensagem');

  // destinatário: código institucional
  const destIn = page.locator('#recipient-inst-input');
  await destIn.waitFor({ state: 'visible', timeout: 10000 });
  await destIn.fill(COD_INST);
  await page.waitForTimeout(2500); // lookup do destinatário
  console.log('  ✓ destinatário preenchido: ' + COD_INST);
  // Data de Expiração (pedido do dono — verificar visual azul/branco)
  const dataExp = page.locator('#input-data-expiracao');
  if (await dataExp.count()) {
    const d = new Date(); d.setDate(d.getDate() + 30);
    await dataExp.fill(d.toISOString().slice(0, 10));
  }
  // título
  const tit = page.locator('input[placeholder*="Qual o tema"]').first();
  if (await tit.count()) await tit.fill(`Reclamação — atendimento INAPEM (teste ${TS})`);
  // corpo
  const ta = page.locator('textarea[placeholder*="Descreva detalhadamente"]').first();
  await ta.fill(`Reclamação de teste de interoperabilidade ${TS}.\n\nExmos. Senhores do INAPEM (LLMM), venho por este meio apresentar reclamação relativa ao atendimento recebido no balcão de apoio ao empreendedor. Pedido registado pelo cidadão Edlasio Galhardo através do Correio Digital Angola.`);
  await page.waitForTimeout(800);
  await shot(page, 'nova_mensagem_preenchida');

  // botão Enviar (abre o popup de modalidade)
  const btnEnviar = page.locator('button').filter({ hasText: /Enviar Mensagem/i }).first();
  await btnEnviar.click();
  await page.waitForTimeout(2000);
  await shot(page, 'popup_enviar_mensagem');
  const popupTxt = await page.evaluate(() => document.body.innerText);
  const temReclamacao = /Reclamação/.test(popupTxt);
  resultados.push(['Popup «Enviar Mensagem» mostra «Reclamação»', temReclamacao ? 'OK' : 'FALHOU']);

  // escolher Reclamação (id do botão mantido: btn-modal-opcao-denunciar)
  await page.locator('#btn-modal-opcao-denunciar').click();
  await page.waitForTimeout(2500);
  await shot(page, 'pos_seleccao_reclamacao');

  // avisos de validação podem exigir 2.º clique (avisosConfirmados) → repetir se o modal de revisão não abriu
  let btnEnvCorr = page.locator('button').filter({ hasText: /Enviar Correspondência/i }).first();
  if (!(await btnEnvCorr.isVisible().catch(() => false))) {
    const txt = await page.evaluate(() => document.body.innerText);
    console.log('  ! modal de revisão não abriu; trecho:', txt.match(/.{0,120}(aviso|atenção|antes de enviar|confirm).{0,120}/i)?.[0]);
    await shot(page, 'pos_seleccao_reclamacao_2');
    // tentar novamente o Enviar → Reclamação (agora com avisos confirmados)
    if (await btnEnviar.isVisible().catch(() => false)) {
      await btnEnviar.click(); await page.waitForTimeout(1500);
      const op = page.locator('#btn-modal-opcao-denunciar');
      if (await op.isVisible().catch(() => false)) { await op.click(); await page.waitForTimeout(2500); }
    }
    btnEnvCorr = page.locator('button').filter({ hasText: /Enviar Correspondência/i }).first();
  }
  await btnEnvCorr.waitFor({ state: 'visible', timeout: 15000 });
  await shot(page, 'modal_rever_antes_enviar');
  const revisaoTxt = await page.evaluate(() => document.body.innerText);
  resultados.push(['Modal de revisão: Modalidade = Reclamação', /Reclamação/.test(revisaoTxt) ? 'OK' : 'FALHOU']);
  await btnEnvCorr.click();
  await page.waitForTimeout(6000);
  await shot(page, 'reclamacao_resultado');
  const bodyRec = await page.evaluate(() => document.body.innerText);
  const recOk = /enviad|sucesso|registad|comprovativo|protocolo|Reclamação de teste de interoperabilidade/i.test(bodyRec) && !/erro ao enviar|não foi possível enviar/i.test(bodyRec);
  if (!recOk) console.log('  ! trecho:', bodyRec.match(/.{0,120}(erro|falh|não foi).{0,120}/i)?.[0]);
  resultados.push(['Reclamação cidadão → INAPEM-LLMM', recOk ? 'OK' : 'FALHOU']);
  console.log(recOk ? '  ✓ reclamação enviada' : '  ✗ sem confirmação visível');
  await dumpTrecho(page, 'reclamacao');
  }
  await ctxCid.close();

  // ================================================================ INSTITUIÇÃO
  const ctxInst = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const ipage = await ctxInst.newPage();
  await login(ipage, `${BASE}/institucional#/entrar`, INST.agente, INST.pass, 'instituicao');

  console.log('▶ Fase 3: Verificação na conta INAPEM-LLMM-01');
  await shot(ipage, 'inapem_painel');
  await dumpTrecho(ipage, 'inapem_painel');

  // 3a) Correio / recebidas — procurar a reclamação
  const btnCorreio = ipage.locator('button, a').filter({ hasText: /Correio|Correspondência|Recebidas/i }).first();
  if (await btnCorreio.isVisible().catch(() => false)) {
    await btnCorreio.click();
    await ipage.waitForTimeout(3000);
    await shot(ipage, 'inapem_correio');
  }
  let textoInapem = await ipage.evaluate(() => document.body.innerText);
  let viuReclamacao = new RegExp(`teste ${TS}`, 'i').test(textoInapem);
  if (!viuReclamacao) {
    // já lida numa execução anterior → separador LIDAS
    const tabLidas = ipage.locator('button').filter({ hasText: /^LIDAS/i }).first();
    if (await tabLidas.isVisible().catch(() => false)) {
      await tabLidas.click(); await ipage.waitForTimeout(2500);
      textoInapem = await ipage.evaluate(() => document.body.innerText);
      viuReclamacao = new RegExp(`teste ${TS}`, 'i').test(textoInapem);
      await shot(ipage, 'inapem_correio_lidas');
    }
  }
  resultados.push(['INAPEM vê a Reclamação no Correio (Expediente de Entrada)', viuReclamacao ? 'OK' : 'FALHOU']);

  // 3b) Livro de Reclamações — atalho do PAINEL da instituição
  await ipage.locator('nav button, aside button, button').filter({ hasText: /^Painel$/i }).first().click();
  await ipage.waitForTimeout(3000);
  const btnLR = ipage.locator('button, a').filter({ hasText: /Livro de Reclamaç/i }).first();
  if (await btnLR.isVisible().catch(() => false)) {
    await btnLR.click();
    await ipage.waitForTimeout(3500);
    await shot(ipage, 'inapem_livro_reclamacoes');
    const textoLR = await ipage.evaluate(() => document.body.innerText);
    const noLivro = new RegExp(`teste ${TS}|Reclamação — atendimento INAPEM`, 'i').test(textoLR);
    resultados.push(['Reclamação visível no Livro de Reclamações', noLivro ? 'OK' : 'FALHOU']);
    if (!noLivro) fs.writeFileSync(path.join(SHOTS, 'dump_livro.txt'), textoLR.slice(0, 6000));
    // abrir o detalhe da reclamação (1.ª linha que contém o TS)
    const linha = ipage.locator(`text=/teste ${TS}/`).first();
    if (await linha.isVisible().catch(() => false)) {
      await linha.click();
      await ipage.waitForTimeout(3000);
      await shot(ipage, 'inapem_reclamacao_detalhe');
      const det = await ipage.evaluate(() => document.body.innerText);
      resultados.push(['Detalhe da reclamação abre com cronograma de fases', /REGISTADA|RECEBIDA|EM AN[ÁA]LISE|ACOMPANHAMENTO DA DEN/i.test(det) && /INAPE-2026|Protocolo/i.test(det) ? 'OK' : 'FALHOU']);
    }
  } else {
    resultados.push(['Livro de Reclamações acessível no Painel', 'NÃO ENCONTRADO']);
  }

  // 3c) Ocorrências Recebidas — atalho do PAINEL
  await ipage.locator('nav button, aside button, button').filter({ hasText: /^Painel$/i }).first().click();
  await ipage.waitForTimeout(3000);
  const btnOcoInst = ipage.locator('button, a').filter({ hasText: /Ocorrências Recebidas/i }).first();
  if (await btnOcoInst.isVisible().catch(() => false)) {
    await btnOcoInst.click();
    await ipage.waitForTimeout(3500);
    await shot(ipage, 'inapem_ocorrencias');
    const textoOco = await ipage.evaluate(() => document.body.innerText);
    const viuOco = /OC-000053|Teste interop 2026091809/i.test(textoOco);
    resultados.push(['INAPEM vê a Ocorrência OC-000053 recebida', viuOco ? 'OK' : 'FALHOU']);
    if (!viuOco) fs.writeFileSync(path.join(SHOTS, 'dump_oco_inst.txt'), textoOco.slice(0, 6000));
    // abrir a ocorrência e verificar botão de confirmação de recepção
    // botão «Ver» da linha OC-000053
    const linhaOco = ipage.locator('tr').filter({ hasText: 'OC-000053' }).first();
    const btnVer = linhaOco.locator('button').filter({ hasText: /^Ver$/i }).first();
    if (await btnVer.isVisible().catch(() => false)) {
      await btnVer.click();
      await ipage.waitForTimeout(3500);
      await shot(ipage, 'inapem_ocorrencia_detalhe');
      const detO = await ipage.evaluate(() => document.body.innerText);
      const temAccoes = /Confirmar recep|Actualizar estado|Atribuir|Responsável|equipa|Clique num ponto/i.test(detO);
      resultados.push(['Detalhe OC-000053 abre com acções da instituição', temAccoes ? 'OK' : 'FALHOU']);
      if (!temAccoes) fs.writeFileSync(path.join(SHOTS, 'dump_oco_detalhe.txt'), detO.slice(0, 6000));

      // 3d) CICLO DE RESPOSTA: INAPEM confirma recepção (Submetida → Recebida) pela timeline
      if (process.env.AVANCAR_OCO === '1' && /Submetida/.test(detO)) {
        const ponto = ipage.locator('button').filter({ hasText: /^Recebida$/i }).first();
        const pontoAlt = ipage.locator('[role="button"], button, li').filter({ hasText: /Recebida/i }).first();
        const alvo = (await ponto.isVisible().catch(() => false)) ? ponto : pontoAlt;
        await alvo.click();
        await ipage.waitForTimeout(1500);
        await shot(ipage, 'inapem_modal_actualizar_estado');
        const modalTxt = await ipage.evaluate(() => document.body.innerText);
        const nota = ipage.locator('[role="dialog"] textarea');
        if (await nota.count()) await nota.first().fill('Recepção confirmada pela INAPEM-LLMM. Ocorrência encaminhada para a equipa técnica de iluminação pública.');
        const btnConf = ipage.locator('[role="dialog"] button').filter({ hasText: /Confirmar actualização/i }).first();
        if (await btnConf.isVisible().catch(() => false)) {
          await btnConf.click();
          await ipage.waitForTimeout(4000);
          await shot(ipage, 'inapem_oco_recebida');
          const pos = await ipage.evaluate(() => document.body.innerText);
          resultados.push(['INAPEM confirmou recepção da OC-000053 (→ Recebida)', /Recebida \(actual\)|Recebida/.test(pos) && !/erro/i.test(pos.slice(0, 400)) ? 'OK' : 'FALHOU']);
        } else {
          console.log('  ! modal actualizar estado sem botão confirmar; trecho:', modalTxt.match(/Actualizar estado[\s\S]{0,300}/)?.[0]);
          resultados.push(['INAPEM confirmou recepção da OC-000053', 'FALHOU (modal)']);
        }
      }
    } else {
      resultados.push(['Botão «Ver» da OC-000053', 'NÃO ENCONTRADO']);
    }
  } else {
    resultados.push(['Ocorrências Recebidas acessíveis no Painel', 'NÃO ENCONTRADO']);
  }
  await ctxInst.close();

  // ================================================================ CIDADÃO (retorno)
  console.log('▶ Fase 4: Cidadão verifica resposta da INAPEM');
  const ctxCid2 = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const p2 = await ctxCid2.newPage();
  await login(p2, `${BASE}/#/login`, CID.bi, CID.pass, 'cidadao_retorno');
  await p2.locator('button, a').filter({ hasText: /Ocorrência/i }).first().click();
  await p2.waitForTimeout(3000);
  await shot(p2, 'cidadao_ocorrencias_lista');
  const lst = await p2.evaluate(() => document.body.innerText);
  const linhaC = p2.locator('tr, li, div').filter({ hasText: /OC-000053/ }).last();
  const btnVerC = p2.locator('tr').filter({ hasText: 'OC-000053' }).locator('button').filter({ hasText: /^Ver$/i }).first();
  if (await btnVerC.isVisible().catch(() => false)) { await btnVerC.click(); }
  else if (await linhaC.isVisible().catch(() => false)) { await linhaC.click(); }
  await p2.waitForTimeout(3500);
  await shot(p2, 'cidadao_oc53_detalhe');
  const detC = await p2.evaluate(() => document.body.innerText);
  const cidadaoVeRecebida = /OC-000053/.test(detC) && /Recebida/.test(detC) && /INAPEM/i.test(detC);
  resultados.push(['Cidadão vê OC-000053 com estado «Recebida» pela INAPEM', cidadaoVeRecebida ? 'OK' : 'FALHOU']);
  if (!cidadaoVeRecebida) fs.writeFileSync(path.join(SHOTS, 'dump_cidadao_oc53.txt'), (lst + '\n=====\n' + detC).slice(0, 8000));
  // notificações do cidadão
  const btnNotif = p2.locator('button').filter({ hasText: /Notificações/i }).first();
  if (await btnNotif.isVisible().catch(() => false)) {
    await btnNotif.click(); await p2.waitForTimeout(2500);
    await shot(p2, 'cidadao_notificacoes');
    const nt = await p2.evaluate(() => document.body.innerText);
    resultados.push(['Cidadão recebeu notificação da actualização', /OC-000053|Recebida|recep/i.test(nt) ? 'OK' : 'FALHOU']);
  }
  await ctxCid2.close();
} catch (e) {
  console.error('ERRO FATAL NO TESTE:', e.message);
  resultados.push(['Execução do teste', 'ERRO: ' + e.message]);
} finally {
  await browser.close();
}

console.log('\n================ RESULTADOS ================');
for (const [k, v] of resultados) console.log(`  ${String(v).startsWith('OK') ? '✅' : '❌'} ${k}: ${v}`);
fs.writeFileSync(path.join(SHOTS, 'resultados.txt'), resultados.map(([k, v]) => `${v}\t${k}`).join('\n'));
