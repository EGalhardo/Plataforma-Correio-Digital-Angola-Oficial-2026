// v37.78.23 — ELIMINAÇÃO COMPLETA DE DADOS: ZERO RASTOS, ZERO ÓRFÃOS
// Fluxos validados com contas REAIS:
//  F1: remetente E destinatário eliminam → PURGA TOTAL provada por REST
//      (messages 0 · message_state_history 0 · notifications 0 · anexo no Storage 0)
//  F2: Admin elimina correspondência única → purga total (sem eliminação prévia das partes)
//  F3: avatar substituído → foto ANTIGA removida do Storage (0 órfãos)
//  F4: artigo da KB eliminado → ficheiro do bucket kb_ficheiros removido
// Os dados de teste são purgados no fim (a regra vale para o próprio teste).
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const env = Object.fromEntries(readFileSync('.env', 'utf-8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const BASE = process.env.BASE || 'http://localhost:3000';
const SUPA = env.SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' };

const MK = `E2E-ELIM-TOTAL-${Date.now()}`;
const MK2 = `E2E-ELIM-ADM-${Date.now()}`;
const MKKB = `E2E-ELIM-KB-${Date.now()}`;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

let FAILS = 0;
const reg = (n, ok, x = '') => { console.log(`${ok ? '[PASS]' : '[FALHOU]'} ${n}${x ? ' — ' + x : ''}`); if (!ok) FAILS++; };

const login = async (page, rota, id, senha) => {
  await page.goto(`${BASE}${rota}?cb=${Date.now()}#/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 40000 });
  await page.locator('input[type="text"], input:not([type])').first().fill(id);
  await page.locator('input[type="password"]').first().fill(senha);
  await page.locator('button', { hasText: /ENTRAR/i }).first().click().catch(() => {});
  await page.waitForTimeout(13000);
  return !(await page.evaluate(() => document.body.innerText)).match(/Credenciais incorrectas|ACESSO NEGADO/i);
};

const correio = async (page) => { await page.evaluate(() => { window.location.hash = '#/correspondencias'; }); await page.waitForTimeout(4500); };
const tab = async (page, nome) => {
  await page.evaluate((n) => {
    const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && (e.textContent || '').trim().toUpperCase().startsWith(n));
    if (b.length) b[0].click();
  }, nome);
  await page.waitForTimeout(1400);
};
const linhaDe = (page, mk) => page.evaluate((m) => {
  const tr = [...document.querySelectorAll('tr')].find(r => (r.innerText || '').includes(m));
  return tr ? tr.innerText.toUpperCase() : null;
}, mk);
const eliminarLinha = async (page, mk) => {
  await page.evaluate((m) => {
    const tr = [...document.querySelectorAll('tr')].find(r => (r.innerText || '').includes(m));
    if (!tr) return;
    const b = [...tr.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /eliminar/i.test(e.textContent || ''));
    if (b.length) b[0].click();
  }, mk);
  await page.waitForTimeout(900);
  // confirmar no modal (CdaConfirmModal)
  await page.evaluate(() => {
    const ms = [...document.querySelectorAll('div.fixed')].filter(d => d.getBoundingClientRect().width > 50);
    const m = ms[ms.length - 1];
    if (!m) return;
    const b = [...m.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /eliminar/i.test((e.textContent || '').trim()));
    if (b.length) b[b.length - 1].click();
  });
  await page.waitForTimeout(2500);
};

const compor = async (page, dest, assunto, comAnexo) => {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /nova mensagem/i.test(e.textContent || ''));
    if (b.length) b[0].click();
  });
  await page.waitForTimeout(2600);
  await page.locator('#recipient-bi-input').fill(dest);
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /adicionar destinat/i.test(e.textContent || '') && !e.disabled);
    if (b.length) b[0].click();
  });
  await page.waitForTimeout(800);
  const ass = page.locator('input[placeholder*="tema da sua mensagem" i]');
  if (await ass.count()) await ass.fill(assunto);
  await page.locator('textarea[placeholder*="Descreva detalhadamente"]').fill('Verificação da eliminação completa (zero rastos).');
  if (comAnexo) {
    const inp = page.locator('input[type="file"]').first();
    await inp.setInputFiles({ name: `${assunto}.png`, mimeType: 'image/png', buffer: PNG });
    await page.waitForTimeout(3500); // upload do anexo
  }
  await page.waitForTimeout(500);
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /^enviar mensagem oficial$|^enviar mesmo assim$/i.test((e.textContent || '').trim()));
      if (b.length) b[b.length - 1].click();
    });
    await page.waitForTimeout(2200);
    if (await page.evaluate(() => [...document.querySelectorAll('div.fixed')].some(d => d.getBoundingClientRect().width > 50 && /rever antes de enviar/i.test(d.innerText || '')))) break;
  }
  await page.evaluate(() => {
    const m = [...document.querySelectorAll('div.fixed')].filter(d => d.getBoundingClientRect().width > 50).pop();
    if (!m) return;
    const b = [...m.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /enviar correspond/i.test(e.textContent || ''));
    if (b.length) b[0].click();
  });
  await page.waitForTimeout(7000);
};

const rest = async (path) => (await fetch(`${SUPA}/rest/v1/${path}`, { headers: H })).json();
const linhaMsg = async (mk) => rest(`messages?subject=eq.${encodeURIComponent(mk)}&select=id,attachments,sender_bi,recipient_bi,unread`);
const contar = async (tabela, filtro) => {
  const r = await rest(`${tabela}?${filtro}&select=id`);
  return Array.isArray(r) ? r.length : -1;
};
const listarStorage = async (bucket, prefix) => {
  const r = await fetch(`${SUPA}/storage/v1/object/list/${bucket}`, { method: 'POST', headers: H, body: JSON.stringify({ prefix, limit: 100 }) });
  const j = await r.json().catch(() => []);
  return Array.isArray(j) ? j.map(f => f.name) : [];
};
const caminhoAnexo = (row) => {
  try {
    const a = (row.attachments || [])[0];
    const content = typeof a === 'string' ? (JSON.parse(a).content || '') : '';
    const m = String(content).match(/correspondencias_anexos\/(.+)$/);
    return m ? m[1] : null;
  } catch { return null; }
};
const limparTudo = async () => {
  for (const mk of [MK, MK2]) {
    const rows = await linhaMsg(mk);
    for (const r of rows || []) {
      const anexo = caminhoAnexo(r);
      if (anexo) await fetch(`${SUPA}/storage/v1/object/correspondencias_anexos/${encodeURIComponent(anexo)}`, { method: 'DELETE', headers: H }).catch(() => {});
      await fetch(`${SUPA}/rest/v1/message_state_history?message_id=eq.${r.id}`, { method: 'DELETE', headers: H });
      await fetch(`${SUPA}/rest/v1/notifications?or=(message.like.*${mk}*,title.like.*${mk}*)`, { method: 'DELETE', headers: H });
      await fetch(`${SUPA}/rest/v1/messages?id=eq.${r.id}`, { method: 'DELETE', headers: H });
    }
  }
  for (const p of ['INAPEM-LLMM', 'INAPEM-LLMM-01']) {
    for (const f of await listarStorage('correspondencias_anexos', p)) {
      if (f.includes('E2E-ELIM')) await fetch(`${SUPA}/storage/v1/object/correspondencias_anexos/${encodeURIComponent(`${p}/${f}`)}`, { method: 'DELETE', headers: H }).catch(() => {});
    }
  }
  const limparKbRec = async (prefixo, prof) => {
    if (prof > 3) return;
    for (const nome of await listarStorage('kb_ficheiros', prefixo)) {
      if (/E2E-ELIM|DBG-KB/.test(nome)) {
        await fetch(`${SUPA}/storage/v1/object/kb_ficheiros/${encodeURIComponent(`${prefixo}${nome}`)}`, { method: 'DELETE', headers: H }).catch(() => {});
      } else if (!nome.includes('.')) {
        await limparKbRec(`${prefixo}${nome}/`, prof + 1);
      }
    }
  };
  await limparKbRec('', 1);
  await fetch(`${SUPA}/rest/v1/kb_fontes_instituicao?titulo=like.*${MKKB}*`, { method: 'DELETE', headers: H });
};

const browser = await chromium.launch();
try {
  // ================= F1: purga quando AMBAS as partes eliminam =================
  const c1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p1 = await c1.newPage();
  reg('F1-0 login remetente (INAPEM-LLMM-01)', await login(p1, '/institucional', 'INAPEM-LLMM-01', '123456789'));
  await correio(p1);
  await compor(p1, '002399714LA030', MK, true);

  let rows = await linhaMsg(MK);
  reg('F1-1 envio com anexo registado', rows && rows.length === 1, rows && rows.length ? `id=${rows[0].id}` : 'sem linha');
  const id1 = rows && rows[0] ? rows[0].id : null;
  const anexo1 = rows && rows[0] ? caminhoAnexo(rows[0]) : null;
  reg('F1-2 anexo no Storage antes da eliminação', !!anexo1 && (await listarStorage('correspondencias_anexos', anexo1.split('/')[0])).includes(anexo1.split('/').slice(1).join('/')), anexo1 || 'sem marcador');

  // destinatário elimina (contas reais: 1 clique = DEFINITIVO p/ a sua cópia)
  const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = await c2.newPage();
  reg('F1-3 login destinatário (cidadão)', await login(p2, '/', '002399714LA030', '123456789'));
  await correio(p2); await tab(p2, 'NÃO LIDAS');
  reg('F1-4 linha visível para o destinatário', !!(await linhaDe(p2, MK)));
  await eliminarLinha(p2, MK);                       // definitivo + marcador
  await p2.waitForTimeout(2500);
  reg('F1-5 linha sumiu da caixa do destinatário', !(await linhaDe(p2, MK)));
  const linhaAposDest = await rest(`messages?subject=eq.${encodeURIComponent(MK)}&select=id,state_indicator,actions`);
  const temMarcadorDest = linhaAposDest && linhaAposDest[0] &&
    (linhaAposDest[0].actions || []).some(a => String(a).includes('ELIM_PERM:002399714LA030')) &&
    linhaAposDest[0].state_indicator === 'EliminadaPermanente';
  reg('F1-6 linha retida + marcador ELIM_PERM do destinatário (cópia do remetente intacta)', !!temMarcadorDest, JSON.stringify(linhaAposDest && linhaAposDest[0] && { s: linhaAposDest[0].state_indicator, a: linhaAposDest[0].actions } || {}));

  // remetente elimina a SUA cópia → ambas eliminaram → PURGA TOTAL
  await correio(p1); await tab(p1, 'ENVIADAS');
  reg('F1-7 cópia nas Enviadas do remetente (intacta após eliminação do destinatário)', !!(await linhaDe(p1, MK)));
  await eliminarLinha(p1, MK);                       // definitivo → deteta marcador → PURGA
  await p1.waitForTimeout(6000);                     // purga assíncrona

  const msgsFim = await contar('messages', `subject=eq.${encodeURIComponent(MK)}`);
  const histFim = await contar('message_state_history', id1 ? `message_id=eq.${id1}` : 'id=eq.0');
  const notsFim = await contar('notifications', `or=(message.like.*${MK}*,title.like.*${MK}*)`);
  reg('F1-8 PURGA messages=0', msgsFim === 0, `${msgsFim} linha(s)`);
  reg('F1-9 PURGA histórico=0', histFim === 0, `${histFim} linha(s)`);
  reg('F1-10 PURGA notificações=0', notsFim === 0, `${notsFim} linha(s)`);
  if (anexo1) {
    const pasta = anexo1.split('/')[0];
    const ficheiro = anexo1.split('/').slice(1).join('/');
    const ficou = (await listarStorage('correspondencias_anexos', pasta)).includes(ficheiro);
    reg('F1-11 PURGA anexo do Storage', !ficou, ficou ? ficheiro : anexo1);
  }

  // ================= F2: Admin elimina correspondência única =================
  await correio(p1); await compor(p1, '002399714LA030', MK2, false);
  rows = await linhaMsg(MK2);
  reg('F2-1 envio registado', rows && rows.length === 1);
  const id2 = rows && rows[0] ? rows[0].id : null;

  const c3 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p3 = await c3.newPage();
  reg('F2-2 login Admin', await login(p3, '/admin', 'ADMIN-0001', '123456789'));
  await p3.evaluate(() => { window.location.hash = '#/gov-correspondencias'; });
  await p3.waitForTimeout(6000);
  const achou = await p3.evaluate((mk) => {
    const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /eliminar/i.test(e.textContent || ''));
    const tr = [...document.querySelectorAll('tr')].find(r => (r.innerText || '').includes(mk));
    if (!tr) return 'sem-linha';
    const eb = [...tr.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /eliminar/i.test(e.textContent || ''));
    if (!eb.length) return 'sem-botao';
    eb[0].click();
    return 'ok';
  }, MK2);
  reg('F2-3 linha do Admin encontrada +Eliminar clicado', achou === 'ok', achou);
  await p3.waitForTimeout(1000);
  await p3.evaluate(() => {
    const ms = [...document.querySelectorAll('div.fixed')].filter(d => d.getBoundingClientRect().width > 50);
    const m = ms[ms.length - 1];
    if (!m) return;
    const b = [...m.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /eliminar definitivamente/i.test((e.textContent || '').trim()));
    if (b.length) b[0].click();
  });
  await p3.waitForTimeout(8000);

  const msgsF2 = await contar('messages', `subject=eq.${encodeURIComponent(MK2)}`);
  const histF2 = await contar('message_state_history', id2 ? `message_id=eq.${id2}` : 'id=eq.0');
  const notsF2 = await contar('notifications', `or=(message.like.*${MK2}*,title.like.*${MK2}*)`);
  reg('F2-4 PURGA admin messages=0', msgsF2 === 0, `${msgsF2} linha(s)`);
  reg('F2-5 PURGA admin histórico=0', histF2 === 0, `${histF2} linha(s)`);
  reg('F2-6 PURGA admin notificações=0', notsF2 === 0, `${notsF2} linha(s)`);

  // ================= F3: avatar substituído → foto antiga removida =================
  await p3.evaluate(() => { window.location.hash = '#/gov-perfil'; });
  await p3.waitForTimeout(4000);
  const antes3 = new Set(await listarStorage('fotos_perfil', 'avatars/'));
  const inpFoto = p3.locator('input[type="file"]').first();
  await inpFoto.setInputFiles({ name: 'avatarA_elim.png', mimeType: 'image/png', buffer: PNG });
  await p3.waitForTimeout(8000);
  const aposA = (await listarStorage('fotos_perfil', 'avatars/')).filter(f => !antes3.has(f));
  await inpFoto.setInputFiles({ name: 'avatarB_elim.png', mimeType: 'image/png', buffer: PNG });
  await p3.waitForTimeout(10000);
  const listaFinal = await listarStorage('fotos_perfil', 'avatars/');
  const aposB = listaFinal.filter(f => !antes3.has(f) && !aposA.includes(f));
  reg('F3-1 1.º upload criou exactamente 1 ficheiro novo', aposA.length === 1, aposA.join(' | '));
  reg('F3-2 2.º upload criou exactamente 1 ficheiro novo', aposB.length === 1, aposB.join(' | '));
  reg('F3-3 foto ANTIGA removida do Storage (0 órfãos)', !listaFinal.some(f => aposA.includes(f)), `órfãos: ${listaFinal.filter(f => aposA.includes(f)).join(' | ') || '0'}`);
  reg('F3-4 foto NOVA presente', listaFinal.some(f => aposB.includes(f)));

  // ================= F4: KB — eliminar artigo apaga o ficheiro =================
  await correio(p1);
  await p1.evaluate(() => { window.location.hash = '#/inst-ai-assistant'; });
  await p1.waitForTimeout(5000);
  await tab(p1, 'BASE DE CONHECIMENTO');
  await p1.waitForTimeout(2000);
  const tit = p1.locator('input[placeholder*="Instrução de atendimento" i]');
  if (await tit.count()) {
    await tit.fill(MKKB);
    const kbCard = p1.locator('div', { has: p1.locator('button', { hasText: 'Guardar fonte' }) }).last();
    const fkb = kbCard.locator('input[type="file"]').first();
    await fkb.setInputFiles({ name: `${MKKB}.txt`, mimeType: 'text/plain', buffer: Buffer.from('Regra oficial de eliminacao completa de dados: sempre que um dado for eliminado em qualquer area da plataforma, a eliminacao tem de ser completa e coerente, sem rastos na nuvem, sem dados orfaos em tabelas relacionadas, sem ficheiros no armazenamento, sem chaves locais e sem referencias quebradas na interface do utilizador final.') });
    // o onChange extrai o texto (API externa) e SÓ DEPOIS faz o upload —
    // esperar pelo ficheiro aparecer no bucket antes de gravar a fonte
    let caminhoKbAntes = null;
    const procurarKb = async () => {
      // estrutura: kb_ficheiros/kb/<SIGLA>/<ts>-<ficheiro> (profundidade 3)
      const caminhar = async (prefixo, profundidade) => {
        if (profundidade > 3) return null;
        for (const nome of await listarStorage('kb_ficheiros', prefixo)) {
          if (nome.includes(MKKB)) return `${prefixo}${nome}`;
          if (!nome.includes('.')) {
            const achado = await caminhar(`${prefixo}${nome}/`, profundidade + 1);
            if (achado) return achado;
          }
        }
        return null;
      };
      return await caminhar('', 1);
    };
    for (let i = 0; i < 15 && !caminhoKbAntes; i++) {
      await p1.waitForTimeout(2000);
      caminhoKbAntes = await procurarKb();
    }
    reg('F4-1b ficheiro KB carregado para o Storage', !!caminhoKbAntes, caminhoKbAntes || 'não apareceu (upload falhou?)');
    await p1.evaluate(() => {
      const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /guardar fonte/i.test(e.textContent || ''));
      if (b.length) b[0].click();
    });
    await p1.waitForTimeout(7000);
    const kbCount = await contar('kb_fontes_instituicao', `titulo=like.*${MKKB}*`);
    reg('F4-1 fonte KB criada pela UI (REST)', kbCount === 1, `${kbCount} linha(s)`);
    // caminho real do ficheiro: coluna fonte_url da própria linha
    const kbRowRest = await rest(`kb_fontes_instituicao?titulo=like.*${MKKB}*&select=id,fonte_url`);
    const urlKb = kbRowRest && kbRowRest[0] ? String(kbRowRest[0].fonte_url || '') : '';
    const mKb = urlKb.match(/kb_ficheiros\/(.+)$/);
    const caminhoKb = mKb ? mKb[1].split('?')[0] : null;
    const pastaKb = caminhoKb ? caminhoKb.split('/').slice(0, -1).join('/') : null;
    const ficheiroKb = caminhoKb ? caminhoKb.split('/').pop() : null;
    reg('F4-2 linha referencia o ficheiro (fonte_url preenchido)', !!caminhoKb, caminhoKb || 'fonte_url vazio');
    const antes = caminhoKb && ficheiroKb ? (await listarStorage('kb_ficheiros', pastaKb)).filter(f => f === ficheiroKb) : [];
    reg('F4-2b ficheiro KB no Storage antes', antes.length > 0, caminhoKbAntes || '');
    // eliminar (Eliminar → Confirmar)
    await p1.evaluate((mk) => {
      // as fontes KB renderizam em <li>, não em <tr>
      const linhas = [...document.querySelectorAll('li, tr')].filter(r => (r.innerText || '').includes(mk) && r.querySelectorAll('button').length);
      const alvo = linhas[linhas.length - 1];
      if (!alvo) return;
      const b = [...alvo.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /eliminar/i.test(e.textContent || ''));
      if (b.length) b[0].click();
    }, MKKB);
    await p1.waitForTimeout(1200);
    await p1.evaluate((mk) => {
      const linhas = [...document.querySelectorAll('li, tr')].filter(r => (r.innerText || '').includes(mk) && r.querySelectorAll('button').length);
      const alvo = linhas[linhas.length - 1];
      if (!alvo) return;
      const b = [...alvo.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /^confirmar$/i.test((e.textContent || '').trim()));
      if (b.length) b[0].click();
    }, MKKB);
    await p1.waitForTimeout(7000);
    const kbDepois = await contar('kb_fontes_instituicao', `titulo=like.*${MKKB}*`);
    const depois = caminhoKb && ficheiroKb ? (await listarStorage('kb_ficheiros', pastaKb)).filter(f => f === ficheiroKb) : [];
    reg('F4-3 linha KB eliminada', kbDepois === 0, `${kbDepois} linha(s)`);
    reg('F4-4 ficheiro KB removido do Storage', depois.length === 0, depois.join(' | ') || '0 ficheiros');
  } else {
    reg('F4-1 formulário KB acessível', false, 'campo título não encontrado');
  }

  await c1.close(); await c2.close(); await c3.close();
} catch (e) {
  console.log('EXCEPÇÃO:', String(e).slice(0, 300)); FAILS++;
} finally {
  await limparTudo();
  await browser.close();
  // verificação final da limpeza do próprio teste
  const r1 = await contar('messages', `subject=like.*E2E-ELIM*`);
  const r2 = await contar('kb_fontes_instituicao', `titulo=like.*E2E-ELIM*`);
  reg('X-limpeza-do-próprio-teste', r1 === 0 && r2 === 0, `messages=${r1} kb=${r2}`);
}
console.log(FAILS === 0 ? 'TODOS PASS' : `${FAILS} FALHAS`);
process.exit(FAILS === 0 ? 0 : 1);
