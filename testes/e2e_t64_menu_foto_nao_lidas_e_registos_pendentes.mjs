/**
 * T64 — Menu da foto de perfil:
 *  • cidadão/instituição: SÓ correspondências Não Lidas (sem notificações, sem «Marcar»/«Ver Notificações»); contador = badge.
 *  • admin: registos de cidadãos/instituições ainda não aprovados; badge = nº de pendentes; clique abre a página de homologação.
 * Uso: BASE=http://localhost:3000 node testes/e2e_t64_menu_foto_nao_lidas_e_registos_pendentes.mjs
 */
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:3000'; const DIR = 'testes/evidencias/t64'; fs.mkdirSync(DIR, { recursive: true });
const SUPA = 'https://klrclczcahfycfdxzdqs.supabase.co'; const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const rest = async (q) => { try { return await (await fetch(`${SUPA}/rest/v1/${q}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })).json(); } catch { return null; } };
const R = []; const ok = (n, c, e = '') => { R.push({ n, ok: !!c, e }); console.log(`${c ? '✔' : '✘'} ${n}${e ? ' — ' + e : ''}`); return !!c; };
const browser = await chromium.launch();
const nova = async () => { const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } }); const p = await ctx.newPage(); p.__erros = []; p.on('pageerror', (e) => p.__erros.push(String(e))); return p; };
const login = async (p, portal, u, s) => { await p.goto(`${BASE}${portal}#/login`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500); await p.fill('input[name="cda-utilizador"]', u); await p.fill('input[name="cda-senha"]', s); await p.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click(); try { await p.waitForFunction(() => !/login/.test(location.hash), null, { timeout: 60000 }); } catch { return false; } await p.waitForTimeout(7000); return true; };
const avatar = (p) => p.getByRole('button', { name: 'Menu de Perfil e Notificações' }).first();
const badge = async (p) => { const el = avatar(p).locator('div.bg-red-600').first(); return (await el.count()) ? Number((await el.innerText()).trim()) : 0; };
const abrirMenu = async (p) => { await avatar(p).click(); await p.waitForTimeout(900); };
const lerMenu = async (p) => ({
  titulo: (await p.locator('[data-testid="menu-contador"]:visible').first().locator('xpath=..').innerText().catch(() => '')).replace(/\s+/g, ' '),
  cont: (await p.locator('[data-testid="menu-contador"]:visible').first().innerText().catch(() => '')).trim(),
  botoes: (await p.locator('div.z-\\[160\\]:visible button').allInnerTexts()).map((t) => t.trim().replace(/\s+/g, ' ')),
  notifs: await p.locator('[data-testid="menu-notificacao"]:visible').count(),
  pend: await p.locator('[data-testid="menu-registo-pendente"]:visible').allInnerTexts(),
});
// os contadores da instituição estabilizam alguns segundos após a navegação (espelho do canal admin) — lê até coincidirem
const naoLidasPainel = async (p) => { await p.evaluate(() => { location.hash = '#/correspondencias'; }); let t = 0; for (let i = 0; i < 6; i++) { await p.waitForTimeout(2500); t = Number((await p.getByRole('button', { name: /^Não lidas/i }).first().innerText().catch(() => '')).replace(/\D/g, '') || 0); if (t === await badge(p)) break; } return t; };
const contas = [
  { rot: 'cidadão Edlasio', portal: '/', user: '002399714LA030', pass: '123456789' },
  { rot: 'instituição INAPEM-LLMM-01', portal: '/institucional', user: 'INAPEM-LLMM-01', pass: '123456789' },
];
try {
for (const c of contas) {
  const p = await nova(); ok(`${c.rot}: login`, await login(p, c.portal, c.user, c.pass));
  const b = await badge(p); await abrirMenu(p); const m = await lerMenu(p);
  ok(`${c.rot}: menu sem notificações e sem «Marcar»/«Ver Notificações»`, m.notifs === 0 && !m.botoes.some((t) => /Marcar notificações|Ver Notificações/i.test(t)), m.botoes.join(' | '));
  ok(`${c.rot}: contador do menu = badge (${b})`, m.cont === String(b), `cont=${m.cont} título=${m.titulo}`);
  const linhas = await p.locator('div.z-\\[160\\]:visible button').filter({ has: p.locator('span.bg-blue-600') }).count();
  ok(`${c.rot}: nº de linhas listadas = badge`, linhas === b, `linhas=${linhas}`);
  ok(`${c.rot}: «Sair do Canal» presente`, m.botoes.some((t) => /Sair do Canal/i.test(t)));
  await p.screenshot({ path: `${DIR}/${c.user}_menu.png` }); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const nl = await naoLidasPainel(p); const b2 = await badge(p); ok(`${c.rot}: badge = «Não Lidas» do painel (${nl})`, nl === b2, `badge=${b2}`);
  ok(`${c.rot}: sem erros JS`, p.__erros.length === 0, p.__erros.join('|').slice(0, 150)); await p.context().close();
}
// Admin
const pend = await rest('solicitacoes_registo?select=id,nome,bi_numero,status&status=not.in.("Aprovado","Rejeitado","Reprovado","Não Aprovado","Bloqueado")');
console.log('   nuvem pendentes:', JSON.stringify(pend));
const pa = await nova(); ok('admin: login ADMIN-0001', await login(pa, '/admin', 'ADMIN-0001', '123456789'));
await pa.waitForTimeout(4000);
const ba = await badge(pa); ok(`admin: badge = nº de registos pendentes na nuvem (${(pend || []).length})`, ba === (pend || []).length, `badge=${ba}`);
await abrirMenu(pa); const ma = await lerMenu(pa);
ok('admin: menu lista os registos pendentes', ma.pend.length === (pend || []).length && (pend || []).every((r) => ma.pend.some((t) => t.includes(r.bi_numero))), ma.pend.map((t) => t.replace(/\s+/g, ' ')).join(' || '));
ok('admin: contador do menu = badge', ma.cont === String(ba), `título=${ma.titulo}`);
ok('admin: sem notificações nem «Marcar»/«Ver Notificações»', ma.notifs === 0 && !ma.botoes.some((t) => /Marcar notificações|Ver Notificações/i.test(t)));
await pa.screenshot({ path: `${DIR}/admin_menu.png` });
if (ma.pend.length) { await pa.locator('[data-testid="menu-registo-pendente"]:visible').first().click(); await pa.waitForTimeout(6000); const h = await pa.evaluate(() => location.hash); ok('admin: clique abre a página de homologação (Cidadãos)', /gov-contatos|contatos/i.test(h), h); await pa.screenshot({ path: `${DIR}/admin_apos_clique.png` }); }
ok('admin: sem erros JS', pa.__erros.length === 0, pa.__erros.join('|').slice(0, 150)); await pa.context().close();
} catch (e) { console.error('EXCEPÇÃO', e); R.push({ n: 'excepção ' + e.message, ok: false }); }
await browser.close(); const okN = R.filter((r) => r.ok).length; console.log(`\nRESULTADO T64: ${okN}/${R.length}`); if (okN < R.length) console.log('FALHAS:\n' + R.filter((r) => !r.ok).map((r) => ` - ${r.n} — ${r.e}`).join('\n'));
fs.writeFileSync(`${DIR}/resultado.json`, JSON.stringify(R, null, 2));
