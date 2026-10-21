// VALIDAÇÃO E2E — Nova funcionalidade «Denuncia» (T-v37.79, pedido do dono 2026-09-23)
//  · Painel (Cidadão E Instituição): 5.º atalho «Denuncia» entre «Ocorrência(s)» e «Livro de Reclamações»
//  · Página «Denuncia»: fluxo do Livro de Reclamações, grafia sem acento («Denuncia»)
//  · Popup «Enviar Mensagem»: opção «Denuncia» (Cidadão; instituição também a tem)
//  · E2E: envio cidadão→instituição com prefixo «[REGISTO DE DENÚNCIA]», fase automática,
//    anonimato por família, filas separadas (não aparece no Livro), cronograma partilhado,
//    avanço de fase pela instituição (-01) com notificação «Denuncia — Recebida» (sem acento)
//  · Higiene total no fim (mensagem + histórico + notificações).
// Uso: node --env-file=.env --env-file=.env.local scripts/e2e_nova_denuncia.mjs
// Credenciais via env (NUNCA hardcoded): QA_BI_A / QA_CID_PASS / QA_INST / QA_INST_ORG / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / BASE
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:3000';
const SUPA_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const SR = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!SUPA_URL || !SR) { console.error('ERRO: faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no env.'); process.exit(1); }

const BI_A = (process.env.QA_BI_A || '').trim();            // cidadão (remetente)
const PASS = (process.env.QA_CID_PASS || '').trim();        // senha do cidadão
const INST = (process.env.QA_INST || '').trim();            // ex.: <ORG>-01 (destinatário)
const ORG = (process.env.QA_INST_ORG || '').trim();         // código oficial da instituição, ex.: <ORG>
if (!BI_A || !PASS || !INST || !ORG) {
  console.error('ERRO: defina QA_BI_A, QA_CID_PASS, QA_INST, QA_INST_ORG no env.');
  process.exit(1);
}
const env = { SUPABASE_URL: SUPA_URL, SUPABASE_SERVICE_ROLE_KEY: SR };
const H = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };
const BARE = { apikey: SR, Authorization: `Bearer ${SR}` };
const TOKEN = `QA-NOVA-DEN-${Date.now().toString().slice(-6)}`;
const ASSUNTO = `Fiscalização comunitária ${TOKEN}`;
const PREFIXO_NOVO = '[REGISTO DE DENÚNCIA]';

// artefactos opcionais (screenshots/log): só com QA_OUT_DIR definido
const OUT = (process.env.QA_OUT_DIR || '').trim();
if (OUT) { fs.mkdirSync(OUT + '/logs', { recursive: true }); fs.mkdirSync(OUT + '/screenshots', { recursive: true }); }
const LOG = OUT ? OUT + '/logs/qa-nova-denuncia.log' : null;
if (LOG) fs.writeFileSync(LOG, '');
const log = s => { if (LOG) fs.appendFileSync(LOG, s + '\n'); console.log(s); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const t0 = Date.now();
const marca = () => ((Date.now() - t0) / 1000).toFixed(1);
const falhas = [];
const pass = (n, c, x = '') => { log(`${c ? '[PASS]' : '[FAIL]'} [${marca()}s] ${n}${x ? ' — ' + x : ''}`); if (!c) falhas.push(n); };
const shot = (p, n) => OUT ? p.screenshot({ path: `${OUT}/screenshots/novaden-${n}.png` }).catch(() => { }) : Promise.resolve();
const qp = async (path, meth = 'GET', body) => { const r = await fetch(`${env.SUPABASE_URL}/rest/v1${path}`, { method: meth, headers: meth === 'GET' ? BARE : H, ...(body ? { body: JSON.stringify(body) } : {}) }); const t = await r.text(); let d; try { d = t ? JSON.parse(t) : []; } catch { d = t; } return { status: r.status, data: d }; };
const texto = (p) => p.evaluate(() => document.body ? document.body.innerText : '');

const ordemAtalhos = async (p) => p.evaluate(() => {
  const nav = [...document.querySelectorAll('nav')].find(nv => (nv.getAttribute('aria-label') || '').toLowerCase().includes('atalhos'));
  if (!nav) return null;
  return [...nav.querySelectorAll('button')].map(b => (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40));
});

const irPara = async (p, rotuloAtalho, ariaPagina, arg0, arg1) => {
  // 1) Painel na barra lateral (clique JS — overlays não intercetam)
  for (let tent = 0; tent < 5; tent++) {
    const foi = await p.evaluate(() => {
      const b = Array.from(document.querySelectorAll('nav button, aside button, [role=navigation] button, button'))
        .find(e => e.offsetParent !== null && /^painel$/i.test((e.textContent || '').replace(/\s+/g, ' ').trim()));
      if (!b) return false;
      b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return true;
    });
    if (foi) break;
    await sleep(1500);
  }
  await p.waitForSelector('nav[aria-label*="atalhos" i]', { timeout: 40000 });
  await sleep(1800);
  // 2) atalho pretendido
  const seguiu = await p.evaluate((alvo) => {
    const navs = Array.from(document.querySelectorAll('nav[aria-label]')).filter(n => /atalhos/i.test(n.getAttribute('aria-label') || ''));
    for (const nav of navs) {
      const b = Array.from(nav.querySelectorAll('button')).find(x => (x.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase().startsWith(alvo.toLowerCase()));
      if (b && b.offsetParent !== null) { b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return true; }
    }
    return false;
  }, rotuloAtalho);
  if (!seguiu) throw new Error('atalho não encontrado no painel: ' + rotuloAtalho);
  await p.waitForSelector(`section[aria-label="${ariaPagina}"]`, { timeout: 40000 });
  await sleep(2500);
};

// abre (numa página-lista) o item cujo texto contém o fragmento — clica o contentor mais estreito
const abrirItem = async (p, fragmento) => await p.evaluate((alvo) => {
  const todos = Array.from(document.querySelectorAll('li, tr, button, h3, div, span'))
    .filter(e => e.offsetParent !== null && (e.textContent || '').includes(alvo));
  if (!todos.length) return 0;
  const diana = todos.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0];
  const alv = diana.closest('li, tr, button, [role=button], [data-testid]') || diana;
  alv.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  return (diana.textContent || '').length;
}, fragmento);

const clicarAtalho = async (p, rotulo) => p.evaluate((alvo) => {
  const b = [...document.querySelectorAll('nav button')].find(x => ((x.textContent || '').replace(/\s+/g, ' ').trim()).toLowerCase().startsWith(alvo.toLowerCase()));
  if (b) { b.click(); return true; }
  return false;
}, rotulo);

const loginCid = async (p) => {
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  await p.getByPlaceholder(/LA041/).first().fill(BI_A);
  await p.getByPlaceholder('••••••••••••').first().fill(PASS);
  await p.getByRole('button', { name: /Entrar no Portal/ }).first().click();
  await p.waitForSelector('text=/MENSAGENS POR LER|Novas Mensagens/i', { timeout: 180000 }).catch(() => null);
  await sleep(3000);
};
const loginInst = async (p) => {
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  await p.evaluate(() => { const el = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Instituição'); el && el.click(); });
  await sleep(1500);
  let campo = p.getByPlaceholder(/AGT|SIGLA|Institu/i).first();
  if (await campo.count() === 0 || !(await campo.isVisible().catch(() => false))) campo = p.locator('input').first();
  await campo.fill(INST);
  await p.locator('input[type=password]').first().fill(PASS);
  await p.getByRole('button', { name: /Entrar|Aceder/i }).last().click();
  await p.waitForSelector('text=/Painel|ÁREA INSTITUCIONAL/i', { timeout: 180000 }).catch(() => null);
  await sleep(3000);
};

log('══ QA «Denuncia» (T-v37.79) ══');
// baseline: a notificação «Nova Denuncia Anónima» tem de ter id posterior a este momento
const preNotif = await qp(`/notifications?select=id&order=id.desc&limit=1`);
const baselineNotifId = Array.isArray(preNotif.data) && preNotif.data[0] ? Number(preNotif.data[0].id) : 0;
log(`baseline notificação id=${baselineNotifId}`);
const browser = await chromium.launch();

// ── C1/C2: painel + página (cidadão) ──
let ctxC = await browser.newContext({ viewport: { width: 1400, height: 900 } });
let pc = await ctxC.newPage();
const jsErr = [];
pc.on('pageerror', e => jsErr.push(String(e).slice(0, 140)));
await loginCid(pc);
await shot(pc, 'C1-painel-cidadao');
const ordemC = await ordemAtalhos(pc);
log('atalhos cidadão: ' + JSON.stringify(ordemC));
const esperadaC = ['Vídeo-Atendimento', 'Inquéritos', 'Ocorrências Locais', 'Denuncia', 'Livro de Reclamações'];
const ordemOk = (ordemC || []).map(o => esperadaC.findIndex(e => o.startsWith(e)));
pass('C1·Painel cidadão: 5 atalhos na ordem pedida (…Ocorrência → Denuncia → Livro…)',
  Array.isArray(ordemC) && ordemOk.join(',') === '0,1,2,3,4', JSON.stringify(ordemC));

await clicarAtalho(pc, 'Denuncia');
await sleep(3500);
await shot(pc, 'C2-pagina-denuncia');
const tDen = await texto(pc);
const secDen = await pc.evaluate(() => ({
  pagina: !!document.querySelector('section[aria-label="Denuncia"]'),
  h2: Array.from(document.querySelectorAll('h2')).map(h => (h.textContent || '').trim()),
  placeholder: (document.querySelector('input[type=search]') || {}).placeholder || '',
}));
log(`secção Denuncia: ${JSON.stringify(secDen)}`);
pass('C2·Página «Denuncia» (cidadão): título, «Criar Denuncia», pesquisa e vazio na grafia sem acento',
  secDen.pagina && secDen.h2.includes('Denuncia') && tDen.includes('Criar Denuncia')
  && /^Procurar denuncias por assunto ou número/.test(secDen.placeholder) && tDen.includes('Ainda não enviou denuncias.'),
  `h2=${secDen.h2.join('|')} ph=${secDen.placeholder} criar=${tDen.includes('Criar Denuncia')}`);

// ── C3: compositor + popup com «Denuncia» + envio real ──
for (let i = 0; i < 4; i++) { if (await pc.locator('text=/Nova Mensagem/i').first().isVisible({ timeout: 4000 }).catch(() => false)) break; await pc.locator('button, a, [role=tab]').filter({ hasText: /Correio|Mensagens|Correspondê/i }).first().click().catch(() => { }); await sleep(1200); }
await pc.getByText(/Nova Mensagem/i).first().click();
await pc.waitForSelector('#recipient-inst-input', { timeout: 20000 });
await pc.fill('#recipient-inst-input', INST);
await pc.getByPlaceholder('Qual o tema da sua mensagem?').fill(ASSUNTO);
await pc.getByPlaceholder(/Descreva detalhadamente/).fill(`Denuncia de verificação automática (${TOKEN}). A irregularidade ocorreu no bairro Vida Estrela, frente ao mercado municipal.`);
await sleep(1500);
await pc.getByRole('button', { name: /Enviar Mensagem/i }).first().click();
// popup «Enviar Mensagem»: as três opções têm de estar presentes (cidadão)
await pc.waitForSelector('[data-testid="popup-enviar-mensagem"]', { timeout: 12000 });
await shot(pc, 'C3-popup-enviar');
const ids = await pc.evaluate(() => ['btn-modal-opcao-normal', 'btn-modal-opcao-denunciar', 'btn-modal-opcao-denuncia'].map(id => ({ id, presente: !!document.getElementById(id) })));
log('opções no popup: ' + JSON.stringify(ids));
pass('C3·Popup «Enviar Mensagem» (cidadão): opções Normal + Reclamação + Denuncia', ids.every(x => x.presente));
// escolher «Denuncia» e confirmar — o envio avança de imediato
await pc.locator('#btn-modal-opcao-denuncia').click();
await sleep(1200);
try { const av = pc.getByRole('button', { name: /Enviar mesmo assim|Enviar Mensagem Oficial/i }).last(); if (await av.isVisible({ timeout: 2500 })) await av.click(); } catch { }
const btnRev = pc.getByRole('button', { name: /Enviar Correspondência/i }).last();
let revOk = false;
for (let i = 0; i < 8 && !revOk; i++) { revOk = await btnRev.isVisible({ timeout: 2000 }).catch(() => false); if (revOk) await btnRev.click(); else await sleep(1500); }
log(`revisão ${revOk ? 'CONFIRMADA' : 'NÃO apareceu'}`);
let sucesso = false;
for (let i = 0; i < 14 && !sucesso; i++) {
  sucesso = await pc.locator('text=/enviada com sucesso|Protocolo|Concluído|distribuída/i').first().isVisible({ timeout: 2500 }).catch(() => false);
  if (!sucesso) await sleep(2000);
}
await shot(pc, 'C3-enviada');
pass('C3b·Mensagem enviada com sucesso via opção «Denuncia»', sucesso && revOk, `rev=${revOk} sucesso=${sucesso}`);
for (const rx of [/Concluído|Concluido|OK|Fechar|Entendi/i]) {
  try { const b = pc.getByRole('button', { name: rx }).last(); if (await b.isVisible({ timeout: 2000 })) { await b.click(); await sleep(800); } } catch { }
}
await pc.keyboard.press('Escape').catch(() => { });

// ── C4: nuvem — linha com marca própria, fase automática, notificação anónima ──
await sleep(3000);
const msgs = await qp(`/messages?select=id,sender_bi,recipient_bi,subject,org&subject=like.*${TOKEN}*`);
const msg = Array.isArray(msgs.data) && msgs.data[0];
pass('C4·Nuvem: mensagem com subject «[REGISTO DE DENÚNCIA]» e org preservado',
  !!msg && String(msg.subject || '').startsWith(PREFIXO_NOVO), JSON.stringify(msg).slice(0, 220));
const msgId = msg && msg.id;
const hist = msgId ? await qp(`/message_state_history?select=state&message_id=eq.${msgId}`) : { data: [] };
pass('C4b·Fase automática «DENUNCIA:registada» registada no envio',
  Array.isArray(hist.data) && hist.data.some(h => h.state === 'DENUNCIA:registada'),
  JSON.stringify(hist.data).slice(0, 160));
const notInst = await qp(`/notifications?select=id,title&message=like.*${TOKEN}*`);
log(`notificações por TOKEN: ${JSON.stringify(notInst.data).slice(0, 200)}`);
// decisivo: título com grafia «Denuncia» SEM acento, criado DEPOIS do baseline
const notFamilia = await qp(`/notifications?select=id,title,target_bi&title=like.*Denuncia*&order=id.desc&limit=10`);
const novaAnon = Array.isArray(notFamilia.data) && notFamilia.data.filter(n => n.title === 'Nova Denuncia Anónima' && Number(n.id) > baselineNotifId);
pass('C4c·Notificação «Nova Denuncia Anónima» (sem acento) para a instituição',
  novaAnon.length > 0,
  `auditadas: ${JSON.stringify(notFamilia.data).slice(0, 240)}`);

// ── C5: filas separadas no cidadão (Denuncia mostra; Livro não) ──
await irPara(pc, 'Denuncia', 'Denuncia');
pass('C5·Página «Denuncia» do cidadão lista o envio', (await texto(pc)).includes(TOKEN.substring(3)), ASSUNTO);
await irPara(pc, 'Livro de Reclamações', 'Livro de Reclamações');
const tLivro = await texto(pc);
const temLivro = tLivro.includes(TOKEN.substring(3));
pass('C5b·Livro de Reclamações NÃO lista a nova denuncia (fila limpa por família)', !temLivro, '');

// ── C6: cidadão abre o detalhe — cronograma partilhado em modo leitura ──
await irPara(pc, 'Denuncia', 'Denuncia');
const abriuC = await abrirItem(pc, TOKEN.substring(3));
await pc.waitForSelector('[data-testid="cronograma-denuncia"]', { timeout: 30000 }).catch(() => null);
await sleep(2500);
await shot(pc, 'C6-detalhe-cronograma');
const c6 = await pc.evaluate(() => {
  const crono = document.querySelector('[data-testid="cronograma-denuncia"]');
  return crono ? (crono.textContent || '') : null;
});
pass('C6·Detalhe: cronograma partilhado visível (fases Registada…Encerrada, modo leitura)',
  abriuC > 0 && !!c6 && /Registada/.test(c6) && /Recebida/.test(c6) && /Encerrada/.test(c6) && /só leitura/i.test(c6),
  `item=${abriuC > 0} crono=${c6 ? c6.slice(0, 80) : 'ausente'}`);
pass('C7·Nenhum erro JS durante o percurso do cidadão', jsErr.length === 0, jsErr[0] || '');
await pc.keyboard.press('Escape').catch(() => { });
await ctxC.close().catch(() => { });

// ── I1/I2: instituição — mesma linha de atalhos + fila com anonimato ──
const ctxI = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const pi = await ctxI.newPage();
pi.on('pageerror', e => jsErr.push(String(e).slice(0, 140)));
await loginInst(pi);
await shot(pi, 'I1-painel-inst');
const ordemI = await ordemAtalhos(pi);
log('atalhos instituição: ' + JSON.stringify(ordemI));
const esperadaI = ['Vídeo-Atendimento', 'Inquéritos', 'Ocorrências recebidas', 'Denuncia', 'Livro de Reclamações'];
const ordemOkI = (ordemI || []).map(o => esperadaI.findIndex(e => o.startsWith(e)));
pass('I1·Painel instituição: 5 atalhos na ordem pedida (…Ocorrências → Denuncia → Livro…)',
  Array.isArray(ordemI) && ordemOkI.join(',') === '0,1,2,3,4', JSON.stringify(ordemI));
await irPara(pi, 'Denuncia', 'Denuncia');
await shot(pi, 'I2-pagina-inst');
const tI = await texto(pi);
const secDenI = await pi.evaluate(() => ({
  pagina: !!document.querySelector('section[aria-label="Denuncia"]'),
  h2: Array.from(document.querySelectorAll('h2')).map(h => (h.textContent || '').trim()),
  placeholder: (document.querySelector('input[type=search]') || {}).placeholder || '',
}));
pass('I2·Página «Denuncia» da instituição: título + item com «Remetente: Anónimo» + pesquisa própria',
  secDenI.pagina && secDenI.h2.includes('Denuncia') && /^Procurar denuncias/.test(secDenI.placeholder)
  && tI.includes('Remetente: Anónimo') && tI.includes(TOKEN.substring(3)),
  `anon=${tI.includes('Remetente: Anónimo')} item=${tI.includes(TOKEN.substring(3))} h2=${secDenI.h2.join('|')}`);
// filas por família na instituição: o Livro NÃO pode mostrar o item da nova fila
await irPara(pi, 'Livro de Reclamações', 'Livro de Reclamações');
const tLivroI = await texto(pi);
pass('I2b·Instituição NÃO vê o item no Livro de Reclamações (filas por família)',
  !tLivroI.includes(TOKEN.substring(3)), '');
await irPara(pi, 'Denuncia', 'Denuncia');

// ── I3: avanço de fase pela instituição (-01) via UI ──
const abriuI = await abrirItem(pi, TOKEN.substring(3));
const faseBtn = await pi.waitForSelector('[data-testid="cronograma-denuncia"] button[data-testid="fase-recebida"]', { timeout: 30000 }).catch(() => null);
await sleep(2000);
await shot(pi, 'I3-detalhe-inst');
// o ring seguinte («Recebida») está clicável para a instituição gestora
const clicouFase = !!faseBtn && await pi.evaluate(() => {
  const b = document.querySelector('[data-testid="cronograma-denuncia"] button[data-testid="fase-recebida"]');
  if (!b || b.disabled || b.getAttribute('data-estado') !== 'aguardar') return false;
  b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  return true;
});
await pi.waitForSelector('[data-testid="popup-activar-fase"]', { timeout: 20000 }).catch(() => null);
await sleep(1500);
await shot(pi, 'I3-popup-fase');
const confirmou = await pi.evaluate(() => {
  const b = document.querySelector('#btn-fase-ok');
  if (!b || b.disabled) return null;
  const rotulo = (b.textContent || '').trim();
  b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  return rotulo;
});
await pi.waitForSelector('[data-testid="cronograma-denuncia"][data-fase-actual="recebida"]', { timeout: 40000 }).catch(() => null);
await sleep(4000);
const histDepois = await qp(`/message_state_history?select=state&message_id=eq.${msgId}`);
pass('I3·Instituição (-01) avançou a fase para «Recebida» (UI→API)', abriuI > 0 && clicouFase && !!confirmou && Array.isArray(histDepois.data) && histDepois.data.some(h => h.state === 'DENUNCIA:recebida'),
  `item=${abriuI > 0} click=${clicouFase} conf=${confirmou} hist=${JSON.stringify(histDepois.data).slice(0, 120)}`);
await shot(pi, 'I3-fase-avancada');

// ── C8: notificação ao cidadão com grafia «Denuncia — Recebida» (sem acento) ──
const notCid = await qp(`/notifications?select=id,title,target_bi&message=like.*Fiscalização%20comunitária%20${TOKEN}*`);
const notCidV2 = await qp(`/notifications?select=id,title&message=like.*${TOKEN}*`);
const todas = Array.isArray(notCid.data) && notCid.data.length ? notCid.data : (Array.isArray(notCidV2.data) ? notCidV2.data : []);
log('notificações com token: ' + JSON.stringify(todas).slice(0, 300));
pass('C8·Cidadão notificado como «Denuncia — Recebida» (grafia sem acento = nova fila)',
  todas.some(n => String(n.title || '').startsWith('Denuncia — Recebida')),
  JSON.stringify(todas.map(n => n.title)).slice(0, 200));
pass('I4·Nenhum erro JS durante o percurso da instituição', jsErr.length === 0, jsErr[0] || '');
await ctxI.close().catch(() => { });

// ── Higiene total: mensagem + histórico + notificações geradas nesta ronda ──
log('\n══ HIGIENE ══');
if (msgId) log(`[limpeza] message_state_history → ${(await qp(`/message_state_history?message_id=eq.${msgId}`, 'DELETE')).status}`);
if (msgId) log(`[limpeza] messages ${msgId} → ${(await qp(`/messages?id=eq.${msgId}`, 'DELETE')).status}`);
for (const n of (Array.isArray(notFamilia.data) ? notFamilia.data : [])) log(`[limpeza] notificação inst ${n.id} → ${(await qp(`/notifications?id=eq.${n.id}`, 'DELETE')).status}`);
for (const n of todas) if (n.id) log(`[limpeza] notificação cid ${n.id} → ${(await qp(`/notifications?id=eq.${n.id}`, 'DELETE')).status}`);
const restM = await qp(`/messages?select=id&subject=like.*${TOKEN}*`);
const restN = await qp(`/notifications?select=id&message=like.*${TOKEN}*`);
const restH = msgId ? await qp(`/message_state_history?select=id&message_id=eq.${msgId}`) : { data: [] };
pass('H·Zero vestígios (mensagem, histórico, notificações)', 
  (!Array.isArray(restM.data) || restM.data.length === 0) &&
  (!Array.isArray(restN.data) || restN.data.length === 0) &&
  (!Array.isArray(restH.data) || restH.data.length === 0),
  `m=${Array.isArray(restM.data) ? restM.data.length : '?'} n=${Array.isArray(restN.data) ? restN.data.length : '?'} h=${Array.isArray(restH.data) ? restH.data.length : '?'}`);

await browser.close();
log(`\n${falhas.length ? 'RESULTADO: FALHOU (' + falhas.join(' | ') + ')' : 'RESULTADO: «Denuncia» 100% VERDE'} em ${marca()}s`);
process.exit(falhas.length ? 1 : 0);
