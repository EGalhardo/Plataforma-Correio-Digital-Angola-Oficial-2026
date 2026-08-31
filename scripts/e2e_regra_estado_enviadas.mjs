// v37.78.22 — REGRA DE ESTADO DAS CORRESPONDÊNCIAS ENVIADAS
// Cenário oficial (João→Maria) materializado com contas REAIS:
//   remetente = INAPEM-LLMM-01 · destinatário = 002399714LA030 (Edlásio)
// 1) envio → cópia do remetente em «Enviadas» com chip ENVIADA (nunca NÃO LIDA)
// 2) remetente ABRE a própria enviada → continua ENVIADA;
//    na área do destinatário continua NÃO LIDA (estado intocado)
// 3) destinatário abre → passa a LIDA; na área do remetente continua ENVIADA
// 4) limpeza total (messages + message_state_history + notifications)
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const env = Object.fromEntries(readFileSync('.env', 'utf-8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const BASE = process.env.BASE || 'http://localhost:3000';
const SUPA = env.SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}` };

const MARKER = `E2E-ESTADO-ENVIADAS-${Date.now()}`;
const REM = { area: 'institucional', id: 'INAPEM-LLMM-01', senha: '123456789' };
const DEST = { bi: '002399714LA030', senha: '123456789' };

let FAILS = 0;
const reg = (nome, ok, extra = '') => { console.log(`${ok ? '[PASS]' : '[FALHOU]'} ${nome}${extra ? ' — ' + extra : ''}`); if (!ok) FAILS++; };

const login = async (page, rota, id, senha) => {
  await page.goto(`${BASE}${rota}?cb=${Date.now()}#/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 40000 });
  await page.locator('input[type="text"], input:not([type])').first().fill(id);
  await page.locator('input[type="password"]').first().fill(senha);
  await page.locator('button', { hasText: /ENTRAR/i }).first().click().catch(() => {});
  await page.waitForTimeout(13000);
  return !(await page.evaluate(() => document.body.innerText)).match(/Credenciais incorrectas|ACESSO NEGADO/i);
};

const irCorreio = async (page) => {
  await page.evaluate(() => { window.location.hash = '#/correspondencias'; });
  await page.waitForTimeout(4000);
};
const clicarTab = async (page, nome) => {
  await page.evaluate((n) => {
    const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && (e.textContent || '').trim().toUpperCase().startsWith(n));
    if (b.length) b[0].click();
  }, nome);
  await page.waitForTimeout(1200);
};
const linhaMarker = (page) => page.evaluate((mk) => {
  const tr = [...document.querySelectorAll('tr')].find(r => (r.innerText || '').includes(mk));
  return tr ? tr.innerText.toUpperCase() : null;
}, MARKER);
const abrirLinha = async (page) => {
  await page.evaluate((mk) => {
    const tr = [...document.querySelectorAll('tr')].find(r => (r.innerText || '').includes(mk));
    if (!tr) return;
    const b = [...tr.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /abrir/i.test((e.textContent || '').trim()));
    if (b.length) b[0].click();
  }, MARKER);
  await page.waitForTimeout(2500);
};
const voltarCorreio = async (page) => {
  // botão principal do detalhe: title/aria «Voltar ao Correio» (há vários
  // «Voltar» internos de sub-cartões que não saem do detalhe)
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      const todos = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0);
      const principal = todos.find(e => /voltar ao correio/i.test(e.getAttribute('title') || '') || /voltar ao correio/i.test(e.textContent || ''));
      const alvo = principal || todos.find(e => /^voltar$/i.test((e.textContent || '').trim()));
      if (alvo) alvo.click();
    });
    await page.waitForTimeout(1600);
    if (await page.evaluate(() => !!document.querySelector('table tbody tr'))) break;
  }
};

const browser = await chromium.launch();
try {
  // ========== REMETENTE (instituição) ==========
  const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p1 = await ctx1.newPage();
  reg('R0-login remetente (INAPEM-LLMM-01)', await login(p1, '/institucional', REM.id, REM.senha));

  // compor para o destinatário
  await irCorreio(p1);
  await page_abrirCompositor(p1);
  await p1.locator('#recipient-bi-input').fill(DEST.bi);
  await p1.waitForTimeout(400);
  await p1.evaluate(() => {
    const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /adicionar destinat/i.test((e.textContent || '').trim()) && !e.disabled);
    if (b.length) b[0].click();
  });
  await p1.waitForTimeout(800);
  const ass = p1.locator('input[placeholder*="tema da sua mensagem" i]');
  if (await ass.count()) await ass.fill(MARKER);
  await p1.locator('textarea[placeholder*="Descreva detalhadamente"]').fill('Verificação da regra de estado das correspondências enviadas.');
  await p1.waitForTimeout(500);

  // enviar (avisos → revisão → confirmar)
  for (let i = 0; i < 3; i++) {
    await p1.evaluate(() => {
      const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /^enviar mensagem oficial$|^enviar mesmo assim$/i.test((e.textContent || '').trim()));
      if (b.length) b[b.length - 1].click();
    });
    await p1.waitForTimeout(2200);
    if (await p1.evaluate(() => [...document.querySelectorAll('div.fixed')].some(d => d.getBoundingClientRect().width > 50 && /rever antes de enviar/i.test(d.innerText || '')))) break;
  }
  await p1.evaluate(() => {
    const m = [...document.querySelectorAll('div.fixed')].filter(d => d.getBoundingClientRect().width > 50).pop();
    if (!m) return;
    const b = [...m.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /enviar correspond/i.test((e.textContent || '').trim()));
    if (b.length) b[0].click();
  });
  await p1.waitForTimeout(6000);

  // garantir que a linha da nuvem existe antes de abrir o destinatário
  let cloud = null;
  for (let i = 0; i < 10 && !cloud; i++) {
    const r = await fetch(`${SUPA}/rest/v1/messages?subject=eq.${encodeURIComponent(MARKER)}&select=id,unread,sender_bi,recipient_bi`, { headers: H });
    const j = await r.json();
    if (j && j.length) cloud = j[0];
    else await p1.waitForTimeout(3000);
  }
  reg('R1-envio-registado-na-nuvem', !!cloud, cloud ? `id=${cloud.id} unread=${cloud.unread}` : 'linha não encontrada');

  // tab ENVIAVAS do remetente
  await irCorreio(p1); await clicarTab(p1, 'ENVIADAS');
  let linha = await linhaMarker(p1);
  reg('R2-copia-nas-Enviadas', !!linha);
  reg('R3-chip-ENVIADA-no-remetente', !!linha && linha.includes('ENVIADA'), (linha || '').slice(0, 80));
  reg('R4-nunca-NÃO-LIDA-no-remetente', !!linha && !linha.includes('NÃO LIDA'));

  // remetente ABRE a própria enviada
  await abrirLinha(p1);
  const detalheAberto = await p1.evaluate((mk) => (document.body.innerText || '').includes(mk), MARKER);
  reg('R5-remetente-consulta-a-enviada', detalheAberto);
  await voltarCorreio(p1); await clicarTab(p1, 'ENVIADAS');
  linha = await linhaMarker(p1);
  reg('R6-apos-abrir-continua-ENVIADA', !!linha && linha.includes('ENVIADA') && !linha.includes('NÃO LIDA'));

  // a nuvem NÃO foi marcada lida pela abertura do remetente
  const rNuven = await fetch(`${SUPA}/rest/v1/messages?id=eq.${cloud.id}&select=unread`, { headers: H });
  const nuvemApos = (await rNuven.json())[0];
  reg('R7-nuvem-intocada-pelo-remetente', nuvemApos && nuvemApos.unread === true, `unread=${nuvemApos && nuvemApos.unread}`);

  // ========== DESTINATÁRIO (cidadão) ==========
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = await ctx2.newPage();
  reg('D0-login destinatário (cidadão)', await login(p2, '/', DEST.bi, DEST.senha));
  await irCorreio(p2); await clicarTab(p2, 'NÃO LIDAS');
  let linhaDest = await linhaMarker(p2);
  reg('D1-destinatário-vê-NÃO-LIDA', !!linhaDest && linhaDest.includes('NÃO LIDA'), (linhaDest || '').slice(0, 80));

  // destinatário abre → LIDA
  await abrirLinha(p2);
  reg('D2-destinatário-abre-a-mensagem', await p2.evaluate((mk) => (document.body.innerText || '').includes(mk), MARKER));
  await voltarCorreio(p2); await clicarTab(p2, 'LIDAS');
  linhaDest = await linhaMarker(p2);
  reg('D3-apos-abrir-passa-LIDA', !!linhaDest && linhaDest.includes('LIDA') && !linhaDest.includes('NÃO LIDA'));

  // nuvem: só agora unread=false (único escritor = destinatário)
  const rNuvem2 = await fetch(`${SUPA}/rest/v1/messages?id=eq.${cloud.id}&select=unread`, { headers: H });
  const nuvemFinal = (await rNuvem2.json())[0];
  reg('D4-nuvem-marcada-lida-pelo-destinatário', nuvemFinal && nuvemFinal.unread === false, `unread=${nuvemFinal && nuvemFinal.unread}`);

  // ========== remetente continua ENVIADA (independência total) ==========
  await irCorreio(p1); await clicarTab(p1, 'ENVIADAS');
  linha = await linhaMarker(p1);
  reg('R8-remetente-mantem-ENVIADA-apos-destinatário-ler', !!linha && linha.includes('ENVIADA') && !linha.includes('NÃO LIDA') && !/\bLIDA\b/.test(linha.replace('ENVIADA', '')));

  await ctx1.close(); await ctx2.close();

  // ========== LIMPEZA TOTAL ==========
  const delEv = await fetch(`${SUPA}/rest/v1/message_state_history?message_id=eq.${cloud.id}`, { method: 'DELETE', headers: H });
  const delNt = await fetch(`${SUPA}/rest/v1/notifications?or=(message.like.*${MARKER}*,title.like.*${MARKER}*)`, { method: 'DELETE', headers: H });
  const delMs = await fetch(`${SUPA}/rest/v1/messages?id=eq.${cloud.id}`, { method: 'DELETE', headers: H });
  console.log(`[limpeza] eventos:${delEv.status} notificações:${delNt.status} mensagem:${delMs.status}`);
  const resta = await (await fetch(`${SUPA}/rest/v1/messages?subject=eq.${encodeURIComponent(MARKER)}&select=id`, { headers: H })).json();
  reg('X-limpeza-completa', (!resta || resta.length === 0));
} catch (e) {
  console.log('EXCEPÇÃO:', String(e).slice(0, 300)); FAILS++;
} finally { await browser.close(); }

// helper interno (precisa de page explícito)
async function page_abrirCompositor(p) {
  await p.evaluate(() => {
    const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /nova mensagem|nova correspond/i.test((e.textContent || '').trim()));
    if (b.length) b[0].click();
  });
  await p.waitForTimeout(2500);
}

console.log(FAILS === 0 ? 'TODOS PASS' : `${FAILS} FALHAS`);
process.exit(FAILS === 0 ? 0 : 1);
