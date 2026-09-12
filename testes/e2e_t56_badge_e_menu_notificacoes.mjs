/**
 * T56 — Badge da foto de perfil e menu «Mensagens e Notificações»:
 *   (a) o badge vermelho da foto indica notificações NÃO LIDAS (não apenas
 *       correio não lido) e coincide com o contador do menu;
 *   (b) as linhas de notificação do menu são CLICÁVEIS: abrem o detalhe
 *       («Fechar»/«Aceder»), marcam como lida (badge decresce, read_at na
 *       nuvem) e «Aceder» navega para a página alvo;
 *   (c) ao vivo: a instituição activa uma fase da denúncia e o badge do
 *       cidadão sobe SEM recarregar a página. Contas REAIS.
 * Uso: node testes/e2e_t56_badge_e_menu_notificacoes.mjs   (BASE=…)
 * Requer SUPABASE_SERVICE_ROLE_KEY e VITE_SUPABASE_ANON_KEY.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const SUPA = 'https://klrclczcahfycfdxzdqs.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const CID = { user: '002399714LA030', pass: '123456789' };
const RESP = { user: 'INAPEM-LLMM-01', pass: '123456789', email: 'agente.inapem-llmm-01@inst.correiodigital.ao' };
const MARCA = `T56 ${Date.now().toString().slice(-6)}`;

let total = 0, okN = 0; const falhas = []; const erros = [];
const ok = (c, m) => { total++; if (c) { okN++; console.log(`✔ ${m}`); } else { falhas.push(m); console.log(`✘ ${m}`); } };
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const rest = (q) => fetch(`${SUPA}/rest/v1/${q}`, { headers: H }).then((r) => r.json()).catch(() => []);
const tokenDe = async (email, pass) => (await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }),
}).then((r) => r.json())).access_token || '';
const apiFase = (tok, id, fase) => fetch(`${BASE}/api/denuncia/fase`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ id, fase }),
}).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
const login = async (page, portal, user, pass) => {
  await page.goto(`${BASE}${portal}#/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 30000 });
  await page.fill('input[name="cda-utilizador"]', user); await page.fill('input[name="cda-senha"]', pass);
  await page.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click();
  await page.waitForFunction(() => !/login/.test(location.hash), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  return !/login/.test(page.url());
};
const avatar = (page) => page.getByRole('button', { name: 'Menu de Perfil e Notificações' }).first();
const badge = async (page) => {
  const el = avatar(page).locator('div.bg-red-600').first();
  return (await el.count()) ? Number((await el.innerText()).trim()) : 0;
};
const abrirMenu = async (page) => { await avatar(page).click(); await page.waitForTimeout(600); };
// NB: o header desktop e o mobile (md:hidden) renderizam ambos o menu — usar só o VISÍVEL.
const contadorMenu = async (page) => Number((await page.locator('div.fixed.z-\\[160\\]:visible span.bg-red-600').first().innerText().catch(() => '0')).trim() || 0);
const naoLidasNuvem = async () => (await rest(`notifications?select=id&target_bi=eq.${CID.user}&read_at=is.null`)).length;

const browser = await chromium.launch();
try {
  if (!KEY || !ANON) throw new Error('Chaves Supabase em falta no ambiente.');
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage(); page.on('pageerror', (e) => erros.push(String(e?.message || e)));

  // ───────────── preparação: garantir ≥1 notificação NÃO LIDA na nuvem ─────────────
  // Reutiliza a última denúncia de teste do cidadão e activa uma fase (gera
  // notificação real «Denúncia — <Fase>»), como faria a instituição.
  const tokR = await tokenDe(RESP.email, RESP.pass);
  // Escolhe a denúncia de teste mais recente com ≥2 fases por activar (o
  // histórico é sequencial: a API devolve 409 se recuar).
  const FASES = ['recebida', 'em_analise', 'respondida', 'encerrada'];
  const dens = await rest(`messages?select=id,subject&sender_bi=eq.${CID.user}&subject=ilike.${encodeURIComponent('*Denúncia de teste*')}&order=created_at.desc&limit=20`);
  let idDen = 0, porFazer = [];
  for (const d of dens || []) {
    const hist = await rest(`message_state_history?select=state&message_id=eq.${d.id}&state=like.DENUNCIA:*`);
    const feitas = new Set((hist || []).map((h) => String(h.state).replace('DENUNCIA:', '')));
    const pf = FASES.filter((f) => !feitas.has(f));
    if (pf.length >= 2) { idDen = Number(d.id); porFazer = pf; break; }
  }
  ok(idDen > 0, `prep. denúncia de teste com fases por activar (#${idDen}: ${porFazer.join(', ')})`);
  if (!idDen) throw new Error('Sem denúncia de teste com fases livres — correr primeiro testes/e2e_t55_… (cria uma nova).');
  const [faseA, faseB] = porFazer;
  const antesNuvem = await naoLidasNuvem();
  const r0 = await apiFase(tokR, idDen, faseA);
  ok(r0.status === 200 && r0.json?.notificado === true, `prep. responsável activa «${faseA}» (HTTP ${r0.status}, notificado=${r0.json?.notificado})`);
  const nuvem0 = await naoLidasNuvem();
  ok(nuvem0 >= 1, `prep. notificações não lidas na nuvem: ${nuvem0} (antes ${antesNuvem})`);

  // ───────────── (a) badge da foto ─────────────
  ok(await login(page, '/', CID.user, CID.pass), 'a. login cidadão REAL');
  await page.waitForTimeout(2500);
  const b0 = await badge(page);
  ok(b0 >= 1, `a. badge da foto VISÍVEL com notificações não lidas (${b0})`);
  await abrirMenu(page);
  const m0 = await contadorMenu(page);
  ok(m0 === b0, `a. contador do menu (${m0}) coincide com o badge (${b0})`);
  const linhas = page.locator('[data-testid="menu-notificacao"]:visible');
  ok((await linhas.count()) > 0, `a. menu lista notificações (${await linhas.count()})`);
  ok((await linhas.first().getAttribute('data-unread')) === '1', 'a. notificações NÃO LIDAS aparecem primeiro');
  await page.screenshot({ path: 'testes/evidencias/t56_menu_com_badge.png' });

  // ───────────── (b) clicar numa notificação ─────────────
  const titulo = (await linhas.first().locator('span.flex-1 > span').first().innerText()).trim();
  ok(titulo.length > 3, `b. linha com título legível («${titulo}»)`);
  await linhas.first().click(); await page.waitForTimeout(800);
  const modal = page.locator('div.fixed.z-\\[200\\]:visible');
  ok(await modal.isVisible(), 'b. clique na linha abre o detalhe da notificação');
  ok((await modal.innerText()).toUpperCase().includes(titulo.toUpperCase()), `b. detalhe mostra o título «${titulo}»`);
  ok((await page.locator('div.fixed.z-\\[160\\]:visible').count()) === 0, 'b. menu da foto fecha ao abrir o detalhe');
  await page.screenshot({ path: 'testes/evidencias/t56_detalhe_notificacao.png' });
  const b1 = await badge(page);
  ok(b1 === b0 - 1, `b. badge decresce após abrir (${b0} → ${b1})`);
  await page.waitForTimeout(2500);
  const nuvem1 = await naoLidasNuvem();
  ok(nuvem1 === nuvem0 - 1, `b. notificação marcada como lida na nuvem (${nuvem0} → ${nuvem1})`);
  await modal.getByRole('button', { name: /Aceder/i }).click(); await page.waitForTimeout(1500);
  ok((await modal.count()) === 0, 'b. «Aceder» fecha o detalhe');
  ok(/correspondencias|notificacoes|home/.test(page.url()), `b. «Aceder» navega para a página alvo (${page.url().split('#')[1]})`);
  // «Fechar» também funciona
  await page.evaluate(() => { window.location.hash = '#/home'; }); await page.waitForTimeout(1500);
  await abrirMenu(page);
  if ((await linhas.count()) > 0) {
    await linhas.first().click(); await page.waitForTimeout(600);
    await modal.getByRole('button', { name: /^Fechar$/i }).click(); await page.waitForTimeout(500);
    ok((await modal.count()) === 0, 'b. «Fechar» fecha o detalhe');
  } else { ok(true, 'b. (sem mais linhas para testar «Fechar»)'); }

  // ───────────── (c) ao vivo: nova fase → badge sobe sem reload ─────────────
  const bAntes = await badge(page);
  const r1 = await apiFase(tokR, idDen, faseB);
  ok(r1.status === 200 && r1.json?.notificado === true, `c. responsável activa «${faseB}» (HTTP ${r1.status}, notificado=${r1.json?.notificado})`);
  let bDepois = bAntes;
  for (let k = 0; k < 12 && bDepois <= bAntes; k++) { await page.waitForTimeout(2500); bDepois = await badge(page); }
  ok(bDepois === bAntes + 1, `c. badge sobe AO VIVO sem recarregar (${bAntes} → ${bDepois})`);
  await abrirMenu(page);
  ok(/^Denúncia — /.test((await linhas.first().innerText()).trim()) && (await linhas.first().getAttribute('data-unread')) === '1', 'c. menu mostra a nova notificação «Denúncia — …» não lida em primeiro');
  await page.screenshot({ path: 'testes/evidencias/t56_badge_ao_vivo.png' });

  // ───────────── (d) instituição: badge também conta notificações ─────────────
  const ctx2 = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const p2 = await ctx2.newPage(); p2.on('pageerror', (e) => erros.push(String(e?.message || e)));
  ok(await login(p2, '/institucional', RESP.user, RESP.pass), 'd. login responsável REAL');
  await p2.waitForTimeout(2500);
  await abrirMenu(p2);
  const mInst = await contadorMenu(p2); const bInst = await badge(p2);
  ok(mInst === bInst, `d. instituição: badge (${bInst}) coincide com o contador do menu (${mInst})`);
  await ctx2.close(); await ctx.close();

  ok(erros.length === 0, `e. sem erros JS (${erros.length})`);
  if (erros.length) console.log(JSON.stringify(erros.slice(0, 5)));
} catch (e) {
  console.error('EXCEPÇÃO:', e); falhas.push(`excepção: ${e?.message || e}`); total++;
} finally { await browser.close(); }
console.log(`\nRESULTADO T56: ${okN}/${total}` + (falhas.length ? `\nFALHAS:\n - ${falhas.join('\n - ')}` : ''));
process.exit(falhas.length ? 1 : 0);
