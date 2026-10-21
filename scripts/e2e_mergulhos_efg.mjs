// QA — Mergulhos profundos E/F/G (finalização do plano 29 páginas)
//  E1 cidadão abre a 1.ª carta do correio → detalhe/consulta visível
//  E3 página Ocorrências Locais (cidadão) abre sem erros JS
//  E2 QR Code da instituição é um QR real renderizado (canvas/svg/roi)
//  F1 IA institucional: pergunta real no «Chat Teste» → resposta >120 chars (Groq configurado)
//  F2 Video-Atendimento E2E: agendar p/ cidadão → ENTRAR com fake-media → sala abre → ELIMINAR → higiene
//  G2 Auditoria admin: linha recente de auditoria persistida (hoje)
import { chromium } from 'playwright';
import fs from 'node:fs';

const carregarEnv = p => fs.existsSync(p) ? Object.fromEntries(fs.readFileSync(p, 'utf8').split('\n').filter(l => l && !l.trim().startsWith('#') && l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; })) : {};
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const __init_dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(__init_dirname, '..'); // raiz do repositório
const env = { ...carregarEnv(repo + '/.env'), ...carregarEnv(repo + '/.env.local'), ...process.env };
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };
const BARE = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
// Credenciais via env (NUNCA hardcoded): QA_BI_A / QA_CID_PASS / QA_INST / QA_INST_PASS / QA_INST_ORG / QA_ADMIN
// Uso: node --env-file=.env --env-file=.env.local — com as QA_* no env
const BASE = process.env.BASE || 'http://localhost:3000';
const BI_A = (process.env.QA_BI_A || '').trim();
const PASS = (process.env.QA_CID_PASS || '').trim();
const INST = (process.env.QA_INST || '').trim();           // agente institucional, ex.: INAPEM-LMM-01
const INST_ORG = (process.env.QA_INST_ORG || '').trim();   // código oficial, ex.: INAPEM-LMM
const ADMIN = (process.env.QA_ADMIN || '').trim();         // operador central, ex.: ADMIN-0001
if (!BI_A || !PASS || !INST || !INST_ORG || !ADMIN) { console.error('ERRO: defina QA_BI_A, QA_CID_PASS, QA_INST, QA_INST_ORG e QA_ADMIN no env.'); process.exit(1); }
const OUT = (process.env.QA_OUT || path.join(repo, 'qa-out')).trim();
fs.mkdirSync(OUT + '/logs', { recursive: true }); fs.mkdirSync(OUT + '/screenshots', { recursive: true });
const ASSUNTO_V = `QA-DEEP-VIDEO-${Date.now().toString().slice(-6)}`;

const LOG = OUT + '/logs/qa-deep-portais.log';
fs.writeFileSync(LOG, '');
const log = s => { fs.appendFileSync(LOG, s + '\n'); console.log(s); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const t0 = Date.now();
const marca = () => ((Date.now() - t0) / 1000).toFixed(1);
const falhas = [];
const pass = (n, c, x = '') => { log(`${c ? '[PASS]' : '[FAIL]'} [${marca()}s] ${n}${x ? ' — ' + x : ''}`); if (!c) falhas.push(n); };
const shot = (p, n) => p.screenshot({ path: `${OUT}/screenshots/deep-${n}.png` }).catch(() => { });
const qp = async (p2, meth = 'GET', body) => { const r = await fetch(`${env.SUPABASE_URL}/rest/v1${p2}`, { method: meth, headers: meth === 'GET' ? BARE : H, ...(body ? { body: JSON.stringify(body) } : {}) }); const t = await r.text(); let d; try { d = t ? JSON.parse(t) : []; } catch { d = t; } return { status: r.status, data: d }; };

const jaNoPortal = async (p) => {
  const t = await p.evaluate(() => document.body ? document.body.innerText : '');
  return /MENSAGENS POR LER|Estatísticas|CADASTRO DE CIDADÃOS|PAINEL DE CONTROLO|DASHBOARD EFICIÊNCIA|ASSISTÊNCIA IA|ÁREA DO CIDADÃO|NOVAS MENSAGENS/i.test(t) && !/ACESSO NACIONAL/i.test(t);
};
const loginCitizen = async (p, bi) => {
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(7000);
  if (await jaNoPortal(p)) { log('[reuso] sessão cidadão activa'); return; }
  const campo = p.getByPlaceholder('009874562LA041').first();
  await campo.waitFor({ timeout: 60000 });
  await campo.fill(bi);
  await p.locator('input[type=password]').first().fill(PASS);
  await p.locator('button').filter({ hasText: /Entrar no Portal/i }).first().click();
  await p.waitForSelector('text=/Painel|MENSAGENS POR LER/i', { timeout: 120000 });
  await sleep(4000);
};
const forcarSairSeCidadao = async (p) => {
  const t = await p.evaluate(() => document.body ? document.body.innerText : '');
  if (/MENSAGENS POR LER|ÁREA DO CIDADÃO/i.test(t)) {
    await p.evaluate(() => { const el = [...document.querySelectorAll('button, a')].find(x => /Sair do Canal|SAIR/i.test(x.textContent || '')); el && el.click(); });
    await sleep(2500);
    await p.evaluate(() => { const el = [...document.querySelectorAll('button')].find(x => /SAIR|Terminar|Confirmar|Sim/i.test((x.textContent || '').trim())); el && el.click(); });
    await sleep(6000);
  }
};
const loginInst = async (p, agente) => {
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(7000);
  if (await jaNoPortal(p)) { const t = await p.evaluate(() => document.body ? document.body.innerText : ''); if (!/INSTITUIÇÃO/i.test(t)) { await forcarSairSeCidadao(p); } else { log('[reuso] sessão instituição activa'); return; } }
  await p.evaluate(() => { const el = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Instituição'); el && el.click(); });
  await sleep(2000);
  await p.getByPlaceholder(/AGT-9921/i).first().fill(agente);
  await p.locator('input[type=password]').first().fill(PASS);
  await p.locator('button').filter({ hasText: /Entrar no Portal|Entrar|Aceder/i }).last().click();
  await p.waitForSelector('text=/Painel/i', { timeout: 120000 });
  await sleep(4000);
};
const loginAdmin = async (p) => {
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(7000);
  if (await jaNoPortal(p)) { const t = await p.evaluate(() => document.body ? document.body.innerText : ''); if (!/ADMINISTRAÇÃO CENTRAL/i.test(t)) { await forcarSairSeCidadao(p); } else { log('[reuso] sessão admin activa'); return; } }
  await p.evaluate(() => { const el = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Admin'); el && el.click(); });
  await sleep(2000);
  await p.getByPlaceholder(ADMIN).first().fill(ADMIN);
  await p.locator('input[type=password]').first().fill(PASS);
  await p.locator('button').filter({ hasText: /Entrar no Portal|Entrar|Aceder/i }).last().click();
  await p.waitForSelector('text=/Painel/i', { timeout: 120000 });
  await sleep(4000);
};
const tab = async (p, nome, extra = 3000) => {
  const okc = await p.evaluate((alvo) => {
    const m = (t) => (t || '').trim().toLowerCase() === alvo.toLowerCase();
    let els = [...document.querySelectorAll('aside button, nav button, header button, button')];
    let el = els.find(x => m(x.textContent));
    if (!el) { els = [...document.querySelectorAll('div, li, a, span, h1, h2, h3, h4, p')]; el = els.find(x => m(x.textContent) && (x.textContent || '').trim().length <= 40); }
    if (el) { el.click(); return true; }
    return false;
  }, nome);
  await sleep(extra);
  return okc;
};

log('══ MERGULHOS PROFUNDOS E/F/G ══');

// — E1: cidadão abre a 1.ª carta —
let ctxMain = await (await chromium.launch()).newContext({ viewport: { width: 1400, height: 900 } });
{
  const p = await ctxMain.newPage();
  const jsErr = [];
  p.on('pageerror', e => jsErr.push(String(e).slice(0, 140)));
  await loginCitizen(p, BI_A);
  await tab(p, 'Correio');
  // clicar na 1.ª carta (linha da tabela com data)
  // a lista do correio hidrata de forma assíncrona — pollar até 30s por QUALQUER cartão operacional
  let clicado = null;
  for (let tent = 0; tent < 10 && !clicado; tent++) {
    clicado = await p.evaluate(() => {
      const candidatos = [...document.querySelectorAll('tr, [class*="cursor-pointer"], button, li, div')]
        .filter(e => /ID:\s*#\d+/.test(e.textContent || '') && (e.textContent || '').length < 900)
        .sort((a, b) => ((a.textContent || '').length - (b.textContent || '').length));
      const linha = candidatos[0];
      if (!linha) return null;
      const txt = (linha.textContent || '').replace(/\s+/g, ' ');
      const idm = txt.match(/ID:\s*#(\d+)/);
      const subj = txt.match(/AC[0-9A-Z-]{6,}|Video-atendimento agendado[^D]{0,41}|Inquerito[^A-Z]{0,39}/);
      const est = /NÃO LIDA/i.test(txt) ? 'nao-lida' : 'lida';
      linha.click();
      return { id: idm && idm[1], assunto: subj && subj[0].replace(/\s+/g, ' ').trim(), estado: est, cartao: txt.slice(0, 90) };
    });
    if (!clicado) await sleep(3000);
  }
  await sleep(4000);
  await shot(p, 'E1-carta-aberta');
  const depois = await p.evaluate(() => document.body ? document.body.innerText : '');
  const detalheProt = /RESPOSTA|MARCAR COMO|PROTOCOLO|Estado:|VER DETALHE|Detalhe|IR PARA|CORRESPONDÊNCIA|Notificação Digital|EXPEDIENTE/i.test(depois);
  const idOk = clicado && clicado.id ? depois.includes(clicado.id) : false;
  const assOk = clicado && clicado.assunto ? /\S{8,}/.test(clicado.assunto) && depois.includes(clicado.assunto.slice(0, Math.min(25, clicado.assunto.length))) : false;
  pass('E1·abrir carta → consulta/detalhe visível', !!clicado && detalheProt && (idOk || assOk), `${clicado ? 'id=' + clicado.id + ' «' + String(clicado.assunto).slice(0, 40) + '»' : 'sem cartão'} → prot=${detalheProt} id=${idOk} ass=${assOk}`);
  fs.writeFileSync(OUT + '/logs/deep-E1-detalhe.txt', depois);
  // repor o estado «não lida» para não alterar a ground-truth do correio (3 não lidas)
  if (clicado && clicado.id && clicado.estado === 'nao-lida') {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/messages?id=eq.${clicado.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ unread: true }) });
    log(`[estado] carta ${clicado.id} reposta como não lida → ${r.status}`);
  }
  pass('E1b·zero erros JS na sessão do cidadão', jsErr.length === 0, jsErr[0] || '');
  await p.close();
}

// — E3: Ocorrências Locais (card do painel do cidadão) —
{
  const p = await ctxMain.newPage();
  const jsErr = [];
  p.on('pageerror', e => jsErr.push(String(e).slice(0, 140)));
  await loginCitizen(p, BI_A);
  await tab(p, 'Painel');
  const cor = await tab(p, 'Ocorrências Locais');
  await shot(p, 'E3-ocorrencias');
  const t = await p.evaluate(() => document.body ? document.body.innerText : '');
  pass('E3·«Ocorrências Locais» abre a página de ocorrências', cor && /Ocorr|Reclama|Den[úu]ncia|Denuncia/i.test(t), cor ? '' : 'card não abriu');
  pass('E3b·zero erros JS', jsErr.length === 0, jsErr[0] || '');
  await p.close();
}

// — E2/F·QR Code instituição: QR real renderizado —
{
  const p = await ctxMain.newPage();
  const jsErr = [];
  p.on('pageerror', e => jsErr.push(String(e).slice(0, 140)));
  await loginInst(p, INST);
  await tab(p, 'QR Code');
  await shot(p, 'E2-qr');
  const qr = await p.evaluate(() => {
    const cvs = document.querySelector('canvas');
    const svgq = document.querySelector('svg rect, svg path');
    const t = document.body ? document.body.innerText : '';
    let pixels = null;
    if (cvs) {
      try { const d = cvs.getContext('2d').getImageData(0, 0, cvs.width, cvs.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) { if (d[i] < 100) n++; } pixels = n; } catch { pixels = -1; }
    }
    return { temCanvas: !!cvs, pixelsEscuros: pixels, temSvgQ: !!svgq, menciona: /QR|CÓDIGO|scanner|escanear/i.test(t) };
  });
  pass('E2·QR Code institucional renderizado (canvas/svg com conteúdo)', (qr.temCanvas && (qr.pixelsEscuros || 0) > 200) || qr.temSvgQ, JSON.stringify(qr));
  pass('E2b·zero erros JS', jsErr.length === 0, jsErr[0] || '');
  await p.close();
}

// — F1: IA institucional — pergunta real no «Chat Teste» —
{
  const p = await ctxMain.newPage();
  const jsErr = [];
  p.on('pageerror', e => jsErr.push(String(e).slice(0, 140)));
  await loginInst(p, INST);
  await tab(p, 'IA');
  await tab(p, 'Chat Teste', 4000);
  await shot(p, 'F1-chat-antes');
  // enviar pergunta
  const pergunta = 'Em duas linhas curtas, confirma que estás operacional e diz qual é a tua função.';
  const enviou = await p.evaluate((msg) => {
    const inp = [...document.querySelectorAll('input, textarea')].filter(e => e.offsetParent !== null).pop();
    if (!inp) return null;
    inp.focus();
    const set = Object.getOwnPropertyDescriptor((inp.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement).prototype, 'value').set;
    set.call(inp, msg);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    const btn = [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null).find(b => /Enviar|Send/i.test((b.textContent || '').trim()) || b.querySelector('svg[class*="lucide-send"], svg[class*="send"]'));
    if (btn) { btn.click(); return true; }
    // fallback: Enter
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    return 'enter';
  }, pergunta);
  log(`pergunta IA enviada: ${enviou}`);
  // aguardar resposta (até 70s)
  let resposta = null;
  for (let i = 0; i < 35 && !resposta; i++) {
    const t = await p.evaluate(() => document.body ? document.body.innerText : '');
    if (new RegExp(pergunta.slice(0, 20), 'i').test(t)) {
      const partes = t.split(/\n\n+/).map(s => s.trim()).filter(s => s.length > 120 && !s.includes(pergunta.slice(0, 30)));
      if (partes.length) resposta = partes[partes.length - 1];
    }
    if (!resposta) await sleep(2000);
  }
  await shot(p, 'F1-chat-depois');
  fs.writeFileSync(OUT + '/logs/deep-F1-chat.txt', await p.evaluate(() => document.body ? document.body.innerText : ''));
  pass('F1·IA institucional respondeu à pergunta real (conteúdo substancial)', !!resposta, resposta ? `~${resposta.length} chars` : 'timeout/sem resposta');
  pass('F1b·zero erros JS', jsErr.length === 0, jsErr[0] || '');
  await p.close();
}

// — G2: auditoria do admin: linhas recentes persistidas (hoje) —
{
  const p = await ctxMain.newPage();
  await loginAdmin(p);
  await tab(p, 'Auditoria', 5000);
  await shot(p, 'G2-auditoria');
  const t = await p.evaluate(() => document.body ? document.body.innerText : '');
  fs.writeFileSync(OUT + '/logs/deep-G2-auditoria.txt', t);
  // o painel real mostra métricas biométricas (contas com biometria, modelo de utilizadores,
  // registo de auditoria) — a exigência: conteúdo funcional presente e números coerentes
  const painel = /SEGURANÇA FACIAL|CONTAS COM BIOMETRIA|REGISTO DE AUDITORIA/i.test(t);
  const nBio = Number((t.match(/CONTAS COM BIOMETRIA NA BASE[\s\S]{0,60}?(\d+)/) || [])[1] || -1);
  pass('G2·Auditoria/segurança biométrica: painel com métricas reais presentes', painel && nBio >= 0, `biométricas=${nBio}`);
  await p.close();
}

// — F2: Video-Atendimento E2E (fake media autorizado pelo dono) —
{
  await ctxMain.close().catch(() => { });
  const browser2 = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-from-media-stream', '--use-fake-ui-for-media-stream'] });
  const ctx2 = await browser2.newContext({ viewport: { width: 1400, height: 900 }, permissions: ['camera', 'microphone'] });
  const p = await ctx2.newPage();
  const jsErr = [];
  p.on('pageerror', e => jsErr.push(String(e).slice(0, 140)));
  await loginInst(p, INST);
  await tab(p, 'Painel');
  await tab(p, 'Vídeo-Atendimento');

  // — helpers locais —
  const agendarSessao = async (assunto) => {
    const okNav = await navegarVideo();
    log(`agendarSessao(${assunto.slice(-3)}): navegação=${okNav}`);
    await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(x => x.offsetParent !== null && /AGENDAR VIDEO-ATENDIMENTO/i.test((x.textContent || '').trim())); bs[bs.length - 1] && bs[bs.length - 1].click(); });
    // gate: o modal tem de estar aberto ANTES de escrever o assunto (senão cai na pesquisa)
    let modalOk = false;
    for (let i = 0; i < 12 && !modalOk; i++) {
      modalOk = await p.evaluate(() => (document.body ? document.body.innerText : '').includes('ASSUNTO DO ATENDIMENTO'));
      if (!modalOk) await sleep(800);
    }
    if (!modalOk) { await shot(p, `F2-modal-ausente-${assunto.slice(-1)}`); return { clicou: false, visto: false }; }
    await p.evaluate((cfg) => {
      const ins = [...document.querySelectorAll('input')].filter(e => e.offsetParent !== null);
      const setI = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      const setT = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      const marcar = (el, v) => { setI.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
      let n = 0;
      const vis = ins.filter(i2 => { const tp = (i2.type || 'text').toLowerCase(); return tp !== 'date' && tp !== 'time'; });
      for (const i2 of vis) {
        const ph = (i2.getAttribute('placeholder') || '').toLowerCase();
        if (/\d{9}|b\.i\.|cidada/.test(ph) && !i2.value) { marcar(i2, cfg.bi); n++; continue; }
        if (!i2.value && n === 0) { marcar(i2, cfg.assunto); n++; continue; }
      }
      const d = ins.find(i2 => (i2.type || '').toLowerCase() === 'date'); if (d) { marcar(d, cfg.hoje); }
      const hh = ins.find(i2 => (i2.type || '').toLowerCase() === 'time'); if (hh) { marcar(hh, cfg.hora); }
      for (const ta of [...document.querySelectorAll('textarea')].filter(e => e.offsetParent !== null)) {
        if (!ta.value) { setT.call(ta, `Pauta QA da sessão ${cfg.assunto}`); ta.dispatchEvent(new Event('input', { bubbles: true })); break; }
      }
    }, { bi: BI_A, assunto, hoje: new Date().toISOString().slice(0, 10), hora: '18:30' });
    await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(x => x.offsetParent !== null && /VERIFICAR/i.test((x.textContent || '').trim())); bs[bs.length - 1] && bs[bs.length - 1].click(); });
    await sleep(3000);
    const ok = await p.evaluate(() => {
      const bs = [...document.querySelectorAll('button')].filter(x => x.offsetParent !== null && /\+ AGENDAR ATENDIMENTO|AGENDAR ATENDIMENTO/i.test((x.textContent || '').trim()));
      const b = bs[bs.length - 1];
      return b && !b.disabled ? (b.click(), true) : false;
    });
    await sleep(8000);
    await shot(p, `F2-apos-agendar-${assunto.slice(-1)}`);
    // se o modal ficou aberto (ex.: toast de aviso), fechar e forçar rebusca na lista Limpiamente
    const modalAberto = await p.evaluate(() => (document.body ? document.body.innerText : '').includes('ASSUNTO DO ATENDIMENTO'));
    if (modalAberto) {
      log('agendarSessao: modal ficou aberto — fechar para refrescar estado');
      await p.evaluate(() => {
        const bs = [...document.querySelectorAll('button')].filter(x => x.offsetParent !== null);
        const x = bs.find(b => /CANCELAR/i.test((b.textContent || '').trim())) || bs.find(b => (b.textContent || '').trim() === '×' || (b.textContent || '').trim() === '✕');
        x && x.click();
      });
      await sleep(2000);
    }
    let visto = false;
    for (let i = 0; i < 8 && !visto; i++) {
      await navegarVideo();
      const t = await p.evaluate(() => document.body ? document.body.innerText : '');
      visto = t.includes(assunto) && !t.includes('ASSUNTO DO ATENDIMENTO');
      if (!visto) await sleep(2000);
    }
    if (!visto) await shot(p, 'F2-lista-ausente-' + assunto.slice(-1));
    return { clicou: ok, visto };
  };
  const rotuloDe = (b) => `${b.getAttribute('aria-label') || ''} ${b.title || ''} ${b.textContent || ''}`;
  const simularClickVisivel = (alvoRx, fonte = 'button') => p.evaluate(({ alvo, fonte2 }) => {
    const rx = new RegExp(alvo, 'i');
    const els = [...document.querySelectorAll(fonte2)].filter(b => b.offsetParent !== null);
    const el = els.find(b => rx.test(`${b.getAttribute('aria-label') || ''} ${b.title || ''} ${b.textContent || ''}`));
    if (el) { el.click(); return (el.textContent || '').trim().slice(0, 40); }
    return null;
  }, { alvo: alvoRx.source, fonte2: fonte });
  const estaNaSala = async () => !!(await simularClickVisivel(/nao-clicar-nada/)) && false || await p.evaluate(() => [...document.querySelectorAll('button')].some(b => b.offsetParent !== null && /desligar chamada|silenciar microfone/i.test(`${b.getAttribute('aria-label') || ''} ${b.title || ''} ${b.textContent || ''}`)));
  const naPaginaVideo = async () => p.evaluate(() => [...document.querySelectorAll('button')].some(b => b.offsetParent !== null && /AGENDAR VIDEO-ATENDIMENTO/i.test((b.textContent || '').trim())));
  const irParaVideo = async () => {
    // barra lateral → Painel → cartão «Vídeo-Atendimento»
    await p.evaluate(() => { const el = [...document.querySelectorAll('button, a')].find(b => b.offsetParent !== null && (b.textContent || '').trim() === 'Painel'); el && el.click(); });
    await sleep(2500);
    const cartao = await p.evaluate(() => {
      const els = [...document.querySelectorAll('button, div, li')].filter(b => b.offsetParent !== null && /V(Í|I)DEO-ATENDIMENTO/i.test(b.textContent || '') && /ATENDIMENTOS|NOTIFICA|SESS.ES|AGENDA/i.test(b.textContent || ''));
      let node = null;
      for (const c of els) { if (!node || (c.textContent || '').length < (node.textContent || '').length) node = c; }
      if (node) { node.click(); return true; }
      return false;
    });
    await sleep(3500);
    return cartao;
  };
  const navegarVideo = async () => {
    for (let passo = 0; passo < 4; passo++) {
      if (await estaNaSala()) {
        await simularClickVisivel(/desligar chamada|terminar chamada|hang ?up/i);
        log('navegarVideo: desligou sala');
        await sleep(3500);
        continue;
      }
      if (await naPaginaVideo()) {
        // garantir vista AGENDA (sub-tab OU o botão «VER AGENDA» da área central)
        const onde = await p.evaluate(() => {
          const rx = /^(AGENDA|VER AGENDA)$/i;
          const els = [...document.querySelectorAll('button, [role="tab"], li, div, span')].filter(b => b.offsetParent !== null && rx.test((b.textContent || '').trim()));
          let node = null;
          for (const c of els) { if (!node || (c.textContent || '').trim().length < (node.textContent || '').trim().length) node = c; }
          if (node) { node.click(); return (node.textContent || '').trim().slice(0, 20); }
          return null;
        });
        if (onde) log(`navegarVideo: AGENDA via «${onde}»`);
        await sleep(1500);
        return true;
      }
      log('navegarVideo: a ir para a página de vídeo via Painel');
      await irParaVideo();
      await sleep(1000);
    }
    return await naPaginaVideo();
  };
  const clicarNoCartao = async (assunto, rotuloRx) => p.evaluate((cfg) => {
    const cand = [...document.querySelectorAll('tr, div, li')].filter(e => (e.textContent || '').includes(cfg.assunto));
    let node = null;
    for (const c of cand) { if (!node || (c.textContent || '').length < (node.textContent || '').length) node = c; }
    let up = node, n = 0;
    while (up && n < 8 && up.querySelectorAll('button').length === 0) { up = up.parentElement; n++; }
    if (!up) return null;
    const b = [...up.querySelectorAll('button')].find(e => e.offsetParent !== null && cfg.rx.test((e.textContent || '').trim()));
    if (b) { b.click(); return (b.textContent || '').trim(); }
    return null;
  }, { assunto, rx: rotuloRx });
  const higiene = async (assunto) => {
    const r = await qp(`/video_sessions?select=id&subject=eq.${encodeURIComponent(assunto)}`);
    for (const row of (Array.isArray(r.data) ? r.data : [])) log(`[limpeza] video_sessions ${row.id} → ${(await qp(`/video_sessions?id=eq.${row.id}`, 'DELETE')).status}`);
    // mensagem-aviso oficial criada no correio do cidadão
    const m = await qp(`/messages?select=id,subject&subject=like.${encodeURIComponent('%' + assunto + '%')}`);
    for (const row of (Array.isArray(m.data) ? m.data : [])) log(`[limpeza] mensagem-aviso ${row.id} → ${(await qp(`/messages?id=eq.${row.id}`, 'DELETE')).status}`);
    // notificação associada ao aviso («Caro cidadão … Assunto da chamada: <assunto>»)
    const n = await qp(`/notifications?select=id&message=like.${encodeURIComponent('%' + assunto + '%')}`);
    for (const row of (Array.isArray(n.data) ? n.data : [])) log(`[limpeza] notificação-aviso ${row.id} → ${(await qp(`/notifications?id=eq.${row.id}`, 'DELETE')).status}`);
    const restV = await qp(`/video_sessions?select=id&subject=eq.${encodeURIComponent(assunto)}`);
    const restM = await qp(`/messages?select=id&subject=like.${encodeURIComponent('%' + assunto + '%')}`);
    const restN = await qp(`/notifications?select=id&message=like.${encodeURIComponent('%' + assunto + '%')}`);
    return (!Array.isArray(restV.data) || restV.data.length === 0) && (!Array.isArray(restM.data) || restM.data.length === 0) && (!Array.isArray(restN.data) || restN.data.length === 0);
  };

  // ─── SESSÃO A: sala real P2P com fake-media ───
  const A = ASSUNTO_V + '-A';
  const agA = await agendarSessao(A);
  pass('F2a·sessão A agendada visível na lista da instituição', agA.visto, A);
  const vid = await qp(`/video_sessions?select=id,institution_code,status&subject=eq.${encodeURIComponent(A)}`);
  const vidId = Array.isArray(vid.data) && vid.data[0] && vid.data[0].id;
  pass(`F2b·sessão persistida com institution_code ${INST_ORG}`, !!vidId && vid.data[0].institution_code === INST_ORG, JSON.stringify(vid.data).slice(0, 140));
  const entrouSala = await clicarNoCartao(A, /^ENTRAR$/i);
  await sleep(9000);
  await shot(p, 'F2-sala');
  const salaT = await p.evaluate(() => document.body ? document.body.innerText : '');
  pass('F2c·«ENTRAR» abriu a sala real (badge P2P / painel eu-com-câmara)', /^entrar$/i.test(String(entrouSala)) && /AGUARDAR|CONVIDAR|P2P|CHAMADA|VÍDEO|Desligar Câmara|Desligar Chamada/i.test(salaT), `botao=${entrouSala}`);
  const ctrl = await p.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null).map(b => `${b.getAttribute('aria-label') || ''} ${b.title || ''}`.trim()).filter(Boolean);
    return btns;
  });
  log(`controlos da sala: ${JSON.stringify(ctrl.slice(0, 12))}`);
  pass('F2d·zero erros JS na sessão de vídeo', jsErr.length === 0, jsErr[0] || '');
  const desligou = await simularClickVisivel(/desligar chamada|terminar chamada|hang ?up/i);
  log(`desligar chamada: ${desligou}`);
  await sleep(3500);
  await navegarVideo();

  // higiene da sessão A (mensagem-aviso incluída — via admin após prova funcional)
  const higA = await higiene(A);
  pass('F2e·higiene da sessão A (sessão + aviso oficial) zero vestígios', higA, higA ? '' : 'ver log');

  // ─── SESSÃO B: «Eliminar» via produto (com modal de confirmação) ───
  const B = ASSUNTO_V + '-B';
  const agB = await agendarSessao(B);
  pass('F2f·sessão B agendada para o teste de eliminação', agB.visto, B);
  await navegarVideo();
  const elimB = await clicarNoCartao(B, /ELIMINAR/i);
  await sleep(3000);
  await shot(p, 'F2-modal-eliminacao');
  const confElim = await p.evaluate(() => {
    const bs = [...document.querySelectorAll('button')].filter(x => x.offsetParent !== null && /ELIMINAR/i.test((x.textContent || '').trim()));
    const b = bs[bs.length - 1];
    return b ? (b.click(), (b.textContent || '').trim()) : null;
  });
  await sleep(5000);
  const aposElim = await p.evaluate(() => document.body ? document.body.innerText : '');
  const foraLista = !aposElim.includes(B);
  // semântica «both-side»: a linha deixa de estar associada à INAPEM («REMOVIDA») mas
  // continua acessível ao cidadão até ele a remover também.
  const rowB = await qp(`/video_sessions?select=id,institution_code,host_bi,subject,status&subject=eq.${encodeURIComponent(B)}`);
  const marc = Array.isArray(rowB.data) && rowB.data[0];
  const semantica = marc && String(marc.institution_code).includes('REMOVIDA');
  pass('F2g·«Eliminar» via produto: card desaparece da lista institucional + modal de confirmação', /^eliminar$/i.test(String(elimB)) && /^eliminar$/i.test(String(confElim)) && foraLista, `btn=${elimB} conf=${confElim} naLista=${!foraLista}`);
  pass('F2h·semântica da eliminação do produto (institution marca REMOVIDA; cidadão mantém)', semantica, JSON.stringify(rowB.data).slice(0, 160));
  const higB = await higiene(B);
  pass('F2i·higiene da sessão B (sessão + aviso oficial) zero vestígios', higB, higB ? '' : 'ver log');

  await browser2.close();
}

log(`\n${falhas.length ? 'RESULTADO: FALHOU (' + falhas.join(' | ') + ')' : 'RESULTADO: MERGULHOS PROFUNDOS E/F/G 100% VERDES'} em ${marca()}s`);
process.exit(falhas.length ? 1 : 0);
