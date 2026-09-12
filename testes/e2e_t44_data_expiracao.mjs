/**
 * T44 — Selector «Data de Expiração» no compositor «Nova Mensagem».
 * Conta demo do cidadão. Verifica:
 *  (a) selector na MESMA linha do «Anexar», encostado à direita, com rótulo;
 *  (b) min = hoje; escolher data → estado activo + botão limpar;
 *  (c) rascunho local preserva a data (reload);
 *  (d) data passada (forçada) bloqueia o envio com mensagem;
 *  (e) envio real para a instituição demo grava deadline_text (DD/MM/YYYY) e
 *      deadline_at (fim do dia) na nuvem e a lista «Enviadas» mostra «EXPIRA: DD/MM/YYYY»;
 *  (f) sem erros JS; capturas desktop/mobile.
 * Uso: node testes/e2e_t44_data_expiracao.mjs   (BASE=https://… para produção)
 * Requer SUPABASE_SERVICE_ROLE_KEY no ambiente para a verificação (e); sem ela, (e) é saltada.
 */
import { chromium } from 'playwright';

// T52 (2026-09-12) — no cidadão, «Enviar Mensagem» abre primeiro o popup de
// modalidade; confirma-se com «Ok» (Mensagem Normal) antes de prosseguir.
async function clicarEnviarCidadao(pg) {
  await pg.locator('#btn-enviar-mensagem').click(); await pg.waitForTimeout(500);
  const ok = pg.locator('#btn-ok-modal-tipo-envio');
  if (await ok.count()) { await ok.click(); await pg.waitForTimeout(800); }
}

const BASE = process.env.BASE || 'http://localhost:3000';
const SUPA = 'https://klrclczcahfycfdxzdqs.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
let total = 0, okN = 0; const falhas = [];
const ok = (c, m) => { total++; if (c) { okN++; console.log(`✔ ${m}`); } else { falhas.push(m); console.log(`✘ ${m}`); } };

const login = async (page) => {
  await page.goto(`${BASE}/`); await page.waitForTimeout(2500);
  await page.locator('input[name="cda-utilizador"]').fill('009874562LA041');
  await page.locator('input[name="cda-senha"]').fill('123456');
  await page.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click();
  await page.waitForFunction(() => !/login/.test(location.hash), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  return !/login/.test(page.url());
};
const irHash = async (page, h) => { await page.evaluate((h) => { window.location.hash = `#/${h}`; }, h); await page.waitForTimeout(1500); };
const abrirCompositor = async (page) => {
  await irHash(page, 'correspondencias');
  const btn = page.getByRole('button', { name: /Nova Mensagem/i }).first();
  await btn.waitFor({ timeout: 15000 }); await btn.click(); await page.waitForTimeout(1200);
  await page.locator('h3', { hasText: /^NOVA MENSAGEM$/ }).first().waitFor({ timeout: 15000 });
};
const limparRascunho = (page) => page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('cda_rascunho_composicao_')) localStorage.removeItem(k); });

const hoje = new Date();
const p2 = (n) => String(n).padStart(2, '0');
const isoHoje = `${hoje.getFullYear()}-${p2(hoje.getMonth() + 1)}-${p2(hoje.getDate())}`;
const alvo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 10);
const isoAlvo = `${alvo.getFullYear()}-${p2(alvo.getMonth() + 1)}-${p2(alvo.getDate())}`;
const rotuloAlvo = `${p2(alvo.getDate())}/${p2(alvo.getMonth() + 1)}/${alvo.getFullYear()}`;

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const erros = []; page.on('pageerror', (e) => erros.push(String(e?.message || e)));
  ok(await login(page), 'login cidadão (demo)');
  await limparRascunho(page);
  await abrirCompositor(page);

  // (a) posição
  const wrap = page.locator('[data-testid="compositor-data-expiracao"]');
  const input = page.locator('#input-data-expiracao');
  const anexar = page.locator('label[title="Anexar ficheiros"]');
  ok(await wrap.isVisible(), '(a) selector «Data de Expiração» visível');
  ok((await wrap.innerText()).toUpperCase().includes('DATA DE EXPIRAÇÃO'), '(a) rótulo «Data de Expiração»');
  const bW = await wrap.boundingBox(); const bA = await anexar.boundingBox();
  const toolbar = await wrap.evaluate((el) => el.parentElement.getBoundingClientRect().toJSON());
  const cyW = bW.y + bW.height / 2, cyA = bA.y + bA.height / 2;
  ok(Math.abs(cyW - cyA) < 8, `(a) mesma linha do «Anexar» (Δy centro = ${Math.abs(cyW - cyA).toFixed(1)}px)`);
  ok(bW.x > bA.x + bA.width, '(a) à direita do «Anexar»');
  ok(toolbar.right - (bW.x + bW.width) < 16, `(a) encostado ao fim direito da barra (folga ${(toolbar.right - (bW.x + bW.width)).toFixed(1)}px)`);
  ok(await input.getAttribute('type') === 'date', '(a) input nativo type=date');

  // (b) min e escolha
  ok(await input.getAttribute('min') === isoHoje, `(b) min = hoje (${isoHoje})`);
  ok(await wrap.locator('button[aria-label="Remover data de expiração"]').count() === 0, '(b) sem botão limpar quando vazio');
  await input.fill(isoAlvo); await page.waitForTimeout(300);
  ok(await input.inputValue() === isoAlvo, `(b) data escolhida (${isoAlvo})`);
  ok(/bg-blue-50/.test(await wrap.getAttribute('class') || ''), '(b) estado activo (destaque azul) com data');
  ok(await wrap.locator('button[aria-label="Remover data de expiração"]').isVisible(), '(b) botão limpar visível');
  await page.screenshot({ path: 'testes/evidencias/t44_data_expiracao_desktop.png', clip: { x: 0, y: 0, width: 1280, height: 900 } });

  // (c) rascunho
  await page.locator('input[placeholder*="Código Institucional"]').fill('AGT-9921-SR');
  await page.locator('input[placeholder="Qual o tema da sua mensagem?"]').fill('[TESTE T44] Data de Expiração');
  await page.locator('textarea').first().fill('Mensagem de teste automatizado T44 — validação do selector de Data de Expiração no compositor.');
  await page.waitForTimeout(800);
  const rascunho = await page.evaluate(() => { const k = Object.keys(localStorage).find((k) => k.startsWith('cda_rascunho_composicao_')); return k ? JSON.parse(localStorage.getItem(k)) : null; });
  ok(rascunho?.dataExpiracao === isoAlvo, '(c) rascunho local guarda dataExpiracao');
  await page.reload(); await page.waitForTimeout(3000);
  if (/login/.test(page.url())) { await login(page); }
  await abrirCompositor(page);
  ok(await input.inputValue() === isoAlvo, '(c) data recuperada do rascunho após reload');

  // (d) data passada bloqueia
  await page.evaluate(() => {
    const el = document.querySelector('#input-data-expiracao');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, '2000-01-01'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(400);
  ok(await input.inputValue() === '2000-01-01', '(d) data passada forçada no estado');
  const btnEnviar = page.locator('#btn-enviar-mensagem');
  await btnEnviar.waitFor({ timeout: 10000 });
  await page.waitForFunction(() => !document.querySelector('#btn-enviar-mensagem')?.disabled, null, { timeout: 15000 }).catch(() => {});
  await clicarEnviarCidadao(page); await page.waitForTimeout(300);
  ok(await page.getByText(/não pode ser anterior a hoje/).count() >= 1, '(d) bloqueio «não pode ser anterior a hoje»');

  // limpar com o botão e voltar a escolher
  await input.fill(isoAlvo); await page.waitForTimeout(200);
  await wrap.locator('button[aria-label="Remover data de expiração"]').click(); await page.waitForTimeout(200);
  ok(await input.inputValue() === '', '(b) botão limpar esvazia a data');
  await input.fill(isoAlvo); await page.waitForTimeout(300);

  // (e) envio real
  await page.waitForFunction(() => !document.querySelector('#btn-enviar-mensagem')?.disabled, null, { timeout: 15000 }).catch(() => {});
  await clicarEnviarCidadao(page); await page.waitForTimeout(700);
  // modal «Rever antes de enviar» mostra a data e confirma o envio
  const rever = page.locator('[data-testid="rever-data-expiracao"]');
  ok(await rever.isVisible().catch(() => false) && (await rever.innerText()).includes(rotuloAlvo), `(e) «Rever antes de enviar» mostra Expira em ${rotuloAlvo}`);
  await page.getByRole('button', { name: /^Enviar Correspondência$/ }).first().click();
  await page.waitForFunction(() => !document.querySelector('#btn-enviar-mensagem'), null, { timeout: 45000 }).catch(() => {});
  const compositorFechou = (await page.locator('h3', { hasText: /^NOVA MENSAGEM$/ }).count()) === 0;
  ok(compositorFechou, '(e) envio concluído (compositor fechou)');
  await page.waitForTimeout(2500);
  // fecha o comprovativo (modal) para libertar a lista
  await page.getByRole('button', { name: /Concluir e Fechar/i }).first().click().catch(() => {}); await page.waitForTimeout(800);
  // lista «Enviadas» (estado local — a conta demo não escreve na nuvem, por desenho)
  await page.getByRole('button', { name: /Enviadas/i }).first().click().catch(() => {}); await page.waitForTimeout(2500);
  const linhaExpira = page.getByText(new RegExp(`EXPIRA:\\s*${rotuloAlvo.replace(/\//g, '\\/')}`)).first();
  ok(await linhaExpira.count() >= 1, `(e) «Enviadas» mostra EXPIRA: ${rotuloAlvo}`);

  // (e2) persistência REAL na nuvem — conta real do cidadão → instituição real
  // (a conta demo é recusada pelo proxy: 403 'demo'). Marcado «[TESTE T44]».
  if (KEY && !process.env.SEM_ENVIO_REAL) {
    const rctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const rp = await rctx.newPage(); rp.on('pageerror', (e) => erros.push(String(e?.message || e)));
    await rp.goto(`${BASE}/`); await rp.waitForTimeout(2500);
    await rp.locator('input[name="cda-utilizador"]').fill('002399714LA030');
    await rp.locator('input[name="cda-senha"]').fill('123456789');
    await rp.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click();
    await rp.waitForFunction(() => !/login/.test(location.hash), null, { timeout: 30000 }).catch(() => {});
    await rp.waitForTimeout(1500);
    ok(!/login/.test(rp.url()), '(e2) login cidadão REAL');
    await limparRascunho(rp); await abrirCompositor(rp);
    await rp.locator('input[placeholder*="Código Institucional"]').fill('INAPEM-LLMM-01');
    await rp.locator('input[placeholder="Qual o tema da sua mensagem?"]').fill('[TESTE T44] Data de Expiração — validação automática');
    await rp.locator('textarea').first().fill('Mensagem de TESTE automatizado (T44) para validar a gravação da Data de Expiração da correspondência. Pode ser ignorada.');
    await rp.locator('#input-data-expiracao').fill(isoAlvo);
    await rp.waitForFunction(() => !document.querySelector('#btn-enviar-mensagem')?.disabled, null, { timeout: 20000 }).catch(() => {});
    const antes = await fetch(`${SUPA}/rest/v1/messages?select=id&sender_bi=eq.002399714LA030&order=id.desc&limit=1`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }).then((r) => r.json()).catch(() => []);
    await clicarEnviarCidadao(rp); await rp.waitForTimeout(700);
    await rp.getByRole('button', { name: /^Enviar Correspondência$/ }).first().click();
    await rp.waitForFunction(() => !document.querySelector('#btn-enviar-mensagem'), null, { timeout: 60000 }).catch(() => {});
    await rp.waitForTimeout(5000);
    await rp.getByRole('button', { name: /Concluir e Fechar/i }).first().click().catch(() => {});
    const rows = await fetch(`${SUPA}/rest/v1/messages?select=id,subject,deadline_text,deadline_at&sender_bi=eq.002399714LA030&order=id.desc&limit=1`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }).then((r) => r.json());
    const r0 = rows?.[0];
    ok(r0 && String(r0.id) !== String(antes?.[0]?.id) && /TESTE T44/.test(r0.subject || ''), `(e2) nova linha na nuvem (#${r0?.id})`);
    ok(r0?.deadline_text === rotuloAlvo, `(e2) deadline_text = ${rotuloAlvo} (obtido: ${r0?.deadline_text})`);
    const dl = r0?.deadline_at ? new Date(r0.deadline_at) : null;
    ok(!!dl && dl.getFullYear() === alvo.getFullYear() && dl.getMonth() === alvo.getMonth() && dl.getDate() === alvo.getDate() && dl.getHours() === 23, `(e2) deadline_at = fim do dia local (${r0?.deadline_at})`);
    await rp.reload(); await rp.waitForTimeout(4000);
    await rp.evaluate(() => { window.location.hash = '#/correspondencias'; }); await rp.waitForTimeout(2500);
    await rp.getByRole('button', { name: /Enviadas/i }).first().click().catch(() => {}); await rp.waitForTimeout(3000);
    ok(await rp.getByText(new RegExp(`EXPIRA:\\s*${rotuloAlvo.replace(/\//g, '\\/')}`)).count() >= 1, `(e2) após reload (lido da nuvem) «Enviadas» mostra EXPIRA: ${rotuloAlvo}`);
    await rctx.close();
  } else console.log('(e2) verificação na nuvem saltada');

  // (f) mobile
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage(); mp.on('pageerror', (e) => erros.push(String(e?.message || e)));
  ok(await login(mp), '(f) login mobile');
  await limparRascunho(mp); await abrirCompositor(mp);
  const mw = mp.locator('[data-testid="compositor-data-expiracao"]');
  await mw.scrollIntoViewIfNeeded();
  ok(await mw.isVisible(), '(f) selector visível em mobile');
  const mb = await mw.boundingBox();
  ok(mb.x + mb.width <= 390, '(f) sem transbordo horizontal em mobile');
  await mp.screenshot({ path: 'testes/evidencias/t44_data_expiracao_mobile.png' });
  await mctx.close();

  ok(erros.length === 0, `(f) sem erros JS (${erros.length})`);
  if (erros.length) console.log(JSON.stringify(erros.slice(0, 3)));
} finally { await browser.close(); }
console.log(`=== RESULTADO: ${okN}/${total} verificações OK ===`);
if (falhas.length) console.log('FALHAS: ' + JSON.stringify(falhas));
process.exit(falhas.length ? 1 : 0);
