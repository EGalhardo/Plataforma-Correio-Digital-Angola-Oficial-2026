// QA — «Nova Mensagem»: entrega comandada pelo campo Destinatário (instituição)
// AC1: envio ao B.I. A  → 1 linha na nuvem para esse B.I.; chega a A, NÃO a B.
// AC2: envio ao B.I. B  → idem simétrico.
// AC3: difusão «Todos»   → fan-out individual EXACTAMENTE para o pool de cidadãos
//                          com contacto prévio (RPC cda_audiencia_sondagem v36);
//                          zero linhas partilhadas recipient_bi='TODOS'.
// Uso: node --env-file=.env --env-file=.env.local scripts/e2e_nova_mensagem_destinatario.mjs
// Credenciais via env (NUNCA hardcoded): QA_INST / QA_INST_PASS / QA_BI_A / QA_BI_B / QA_CID_PASS / BASE
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const SR = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!URL || !SR) { console.error('ERRO: faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no env.'); process.exit(1); }

const INST = (process.env.QA_INST || '').trim();            // ex.: INAPEM-LMM-01
const INST_PASS = (process.env.QA_INST_PASS || '').trim();
const INST_ORG = (process.env.QA_INST_ORG || '').trim();     // código oficial da instituição, ex.: INAPEM-LMM
const BI_A = (process.env.QA_BI_A || '').trim();             // cidadão A
const BI_B = (process.env.QA_BI_B || '').trim();             // cidadão B
const CID_PASS = (process.env.QA_CID_PASS || '').trim();
if (!INST || !INST_PASS || !INST_ORG || !BI_A || !BI_B || !CID_PASS) {
  console.error('ERRO: defina QA_INST, QA_INST_PASS, QA_INST_ORG, QA_BI_A, QA_BI_B, QA_CID_PASS no env.');
  process.exit(1);
}

const log = (s) => console.log(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const marca = () => ((Date.now() - t0) / 1000).toFixed(1);

const H = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', 'Accept-Profile': 'public' };
async function pg(path, init = {}) {
  const r = await fetch(`${URL}/rest/v1${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`PG ${r.status}: ${(await r.text()).slice(0, 240)}`);
  return r.json();
}
const enc = (s) => encodeURIComponent(`%${s}%`);
const poolContactos = (code) => pg('/rpc/cda_audiencia_sondagem', { method: 'POST', body: JSON.stringify({ p_code: String(code).trim() }) }).then(r => r.map(x => String(x.bi ?? x)).sort());
const msgsPorAssunto = (infixo) => pg(`/messages?select=id,sender_bi,recipient_bi,subject,unread,org&subject=ilike.${enc(infixo)}&order=id.asc`);
const notifsPorTexto = (infixo) => pg(`/notifications?select=id,target_bi,title,message,read_at&message=ilike.${enc(infixo)}&order=id.asc&limit=60`);

const TS = Date.now().toString().slice(-8);
const SUBJ_A = `AC1-TESTE-ENTREGA-${TS}`;
const SUBJ_B = `AC2-TESTE-ENTREGA-${TS}`;
const SUBJ_T = `AC3-TESTE-DIFUSAO-${TS}`;
const CORPO = (tag) => `Esta é uma correspondência de verificação automática (${tag}). Objectivo: confirmar que a entrega segue o campo Destinatário da Nova Mensagem, sem fugas para outros cidadãos.`;

const falhas = [];
const ok = (nome, cond, extra = '') => { log(`${cond ? '[PASS]' : '[FAIL]'} [${marca()}s] ${nome}${extra ? ' — ' + extra : ''}`); if (!cond) falhas.push(nome); };

const browser = await chromium.launch({ args: ['--window-size=1366,900'] });
const ctxSess = () => browser.newContext({ viewport: { width: 1366, height: 900 } });

async function loginInst() {
  const ctx = await ctxSess(); const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  const tM = async (sel, rx) => { try { const els = p.locator(sel + ', div'); const n = await els.count(); for (let i = 0; i < Math.min(n, 40); i++) { const el = els.nth(i); const t = (await el.textContent().catch(() => '')) || ''; const t2 = (await el.getAttribute('aria-label').catch(() => '')) || ''; if ((rx.test(t) || rx.test(t2)) && await el.isVisible().catch(() => false)) { await el.click(); return true; } } } catch { } return false; };
  await tM('button, a, [role=tab]', /Institui|Instituição|Institucional/i);
  await sleep(1500);
  let campo = p.getByPlaceholder(/AGT|SIGLA|código institucional|Institui/i).first();
  if (await campo.count() === 0 || !(await campo.isVisible().catch(() => false))) campo = p.locator('input').first();
  await campo.fill(INST);
  await p.getByPlaceholder(/••|senha|Senha/i).first().fill(INST_PASS);
  await p.getByRole('button', { name: /Entrar|Aceder/i }).first().click();
  await p.waitForSelector('text=/Painel|Dashboard/i', { timeout: 120000 }).catch(() => null);
  log(`[inst] login em ${marca()}s`);
  return p;
}

async function loginCid(bi, tag) {
  const ctx = await ctxSess(); const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  await p.getByPlaceholder(/LA041/).fill(bi);
  await p.getByPlaceholder('••••••••••••').fill(CID_PASS);
  await p.getByRole('button', { name: /Entrar no Portal/ }).click();
  await p.waitForSelector('text=/MENSAGENS POR LER/i', { timeout: 180000 }).catch(() => null);
  log(`[${tag}] login em ${marca()}s`);
  return p;
}

const [inst, cidA, cidB] = await Promise.all([loginInst(), loginCid(BI_A, 'cid-A'), loginCid(BI_B, 'cid-B')]);

async function enviar(dest, assunto, corpo, tag) {
  for (let i = 0; i < 4; i++) { if (await inst.locator('text=/Nova Mensagem/i').first().isVisible({ timeout: 4000 }).catch(() => false)) break; await inst.locator('button, a, [role=tab]').filter({ hasText: /Correio|Correspondê/i }).first().click().catch(() => { }); await sleep(1200); }
  await inst.getByText(/Nova Mensagem/i).first().click();
  await inst.waitForSelector('#recipient-bi-input', { timeout: 20000 });
  await inst.fill('#recipient-bi-input', dest);
  await inst.getByPlaceholder('Qual o tema da sua mensagem?').fill(assunto);
  await inst.getByPlaceholder(/Descreva detalhadamente/).fill(corpo);
  await sleep(1500);
  await inst.getByRole('button', { name: /Enviar Mensagem Oficial|Enviar Correspondência|Enviar Mensagem/i }).first().click();
  try { await inst.waitForSelector('#btn-ok-modal-tipo-envio', { timeout: 8000 }); await inst.locator('#btn-modal-opcao-normal').click().catch(() => { }); await inst.locator('#btn-ok-modal-tipo-envio').click(); } catch { }
  await sleep(1200);
  try { const av = inst.getByRole('button', { name: /Enviar mesmo assim|Enviar Mensagem Oficial/i }).last(); if (await av.isVisible({ timeout: 2500 })) await av.click(); } catch { }
  const btnRev = inst.getByRole('button', { name: /Enviar Correspondência/i }).last();
  let revOk = false;
  for (let i = 0; i < 8 && !revOk; i++) { revOk = await btnRev.isVisible({ timeout: 2000 }).catch(() => false); if (revOk) await btnRev.click(); else await sleep(1500); }
  log(`[${tag}] revisão ${revOk ? 'CONFIRMADA' : 'NÃO apareceu!'}`);
  let sucesso = false;
  for (let i = 0; i < 12 && !sucesso; i++) {
    sucesso = await inst.locator('text=/enviada com sucesso|distribuída a|Protocolo Digital|Concluído/i').first().isVisible({ timeout: 2500 }).catch(() => false);
    if (!sucesso) await sleep(2000);
  }
  for (const rx of [/Concluído|Concluido|OK|Fechar|Entendi/i]) {
    try { const b = inst.getByRole('button', { name: rx }).last(); if (await b.isVisible({ timeout: 2000 })) { await b.click(); await sleep(800); } } catch { }
  }
  await inst.keyboard.press('Escape').catch(() => { });
  return sucesso;
}

async function cidadaoVe(p, infixo, tag, tentativas = 10) {
  const navegar = async () => {
    for (let i = 0; i < 4; i++) {
      try { const b = p.locator('button, a, [role=tab]').filter({ hasText: /Correio|Mensagens|Correspondê/i }).first(); if (await b.isVisible({ timeout: 4000 })) { await b.click(); break; } }
      catch { await sleep(1000); }
    }
    await sleep(4500);
  };
  await navegar();
  const re = new RegExp(infixo, 'i');
  for (let t = 0; t < tentativas; t++) {
    const texto = await p.evaluate(() => (document.body ? document.body.innerText : '')).catch(() => '');
    if (re.test(texto)) return true;
    log(`[${tag}] tentativa ${t + 1}/${tentativas}: ainda não apareceu`);
    if (t === 4) { await p.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => { }); await p.waitForSelector('text=/MENSAGENS POR LER|Correio/i', { timeout: 60000 }).catch(() => null); await sleep(3000); await navegar(); }
    await sleep(7000);
  }
  return false;
}

// ---- AC1 ----
log(`\n-- AC1: Nova Mensagem para ${BI_A} --`);
const sA = await enviar(BI_A, SUBJ_A, CORPO(SUBJ_A), 'ac1');
ok('AC1 UI: envio confirmado no compositor', sA);
const linhasA = await msgsPorAssunto(SUBJ_A);
ok('AC1 DB: exactamente 1 linha para o B.I. A', linhasA.length === 1 && linhasA[0].recipient_bi === BI_A, `${linhasA.length} linha(s)`);
ok('AC1 UI: caixa do cidadão A mostra a carta', await cidadaoVe(cidA, SUBJ_A.slice(0, 14), 'ac1-cidA'));
ok('AC1 UI: caixa do cidadão B NÃO recebe cópia', !(await cidadaoVe(cidB, SUBJ_A.slice(0, 14), 'ac1-cidB-NEG', 3)));

// ---- AC2 ----
log(`\n-- AC2: Nova Mensagem para ${BI_B} --`);
const sB = await enviar(BI_B, SUBJ_B, CORPO(SUBJ_B), 'ac2');
ok('AC2 UI: envio confirmado no compositor', sB);
const linhasB = await msgsPorAssunto(SUBJ_B);
ok('AC2 DB: exactamente 1 linha para o B.I. B', linhasB.length === 1 && linhasB[0].recipient_bi === BI_B, `${linhasB.length} linha(s)`);
ok('AC2 UI: caixa do cidadão B mostra a carta', await cidadaoVe(cidB, SUBJ_B.slice(0, 14), 'ac2-cidB'));
ok('AC2 UI: caixa do cidadão A NÃO recebe cópia', !(await cidadaoVe(cidA, SUBJ_B.slice(0, 14), 'ac2-cidA-NEG', 3)));

// ---- AC3 ----
log(`\n-- AC3: Nova Mensagem para Todos (difusao) --`);
const poolAntes = await poolContactos(INST_ORG);
log(`pool de contactos prévios: ${JSON.stringify(poolAntes)}`);
const sT = await enviar('Todos', SUBJ_T, CORPO(SUBJ_T), 'ac3');
ok('AC3 UI: difusão confirmada', sT);
await sleep(3000);
const linhasT = await msgsPorAssunto(SUBJ_T);
const dests = linhasT.map(r => r.recipient_bi).sort();
const setIgual = dests.length === poolAntes.length && dests.every((d, i) => d === poolAntes[i]);
ok('AC3 DB: destinatários = EXACTAMENTE o pool de contactos prévios', setIgual, `${dests.length} linha(s): ${dests.join(' | ')}`);
ok('AC3 DB: zero linhas partilhadas recipient_bi=TODOS', linhasT.filter(r => String(r.recipient_bi).toUpperCase() === 'TODOS').length === 0);
ok('AC3 UI: cidadão A (contacto prévio) recebe', await cidadaoVe(cidA, SUBJ_T.slice(0, 14), 'ac3-cidA'));
ok('AC3 UI: cidadão B (contacto prévio) recebe', await cidadaoVe(cidB, SUBJ_T.slice(0, 14), 'ac3-cidB'));
const ntAC3 = (await notifsPorTexto(SUBJ_T.slice(0, 8))).filter(n => /Nova Correspond/i.test(String(n.title)));
ok('AC3 DB: 1 notificação por cidadão do pool', ntAC3.length === poolAntes.length, `${ntAC3.length} notificação(ões)`);

log(`\n${falhas.length ? 'RESULTADO: FALHOU (' + falhas.join(' | ') + ')' : 'RESULTADO: AC1, AC2 e AC3 100% VERDES'} em ${marca()}s`);
await browser.close();
process.exit(falhas.length ? 1 : 0);
