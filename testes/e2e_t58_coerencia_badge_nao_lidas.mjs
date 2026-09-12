/**
 * T58 — Coerência entre o badge da foto, o menu «Mensagens e Notificações» e o
 *       painel «Não Lidas» — para TODAS as contas reais:
 *   (a) invariante: badge = correio não lido («Não Lidas» do Painel) +
 *       notificações não lidas; o menu mostra a decomposição («N correio ·
 *       M notificações») e o mesmo total;
 *   (b) correspondência eliminada apenas pela OUTRA parte continua visível
 *       (e contada) na caixa do destinatário — antes desaparecia da caixa mas
 *       ficava «não lida» na nuvem (badge ≠ «Não Lidas»);
 *   (c) «Marcar notificações como lidas»: um clique limpa as notificações não
 *       lidas (local + nuvem) e o badge passa a reflectir só o correio;
 *   (d) segurança do servidor: uma conta não consegue marcar notificações de
 *       outra conta (403) nem sem filtro de linha.
 * NOTA: (c) altera dados reais (read_at) — só corre na conta do 2.º cidadão
 *       de teste (005404692BO043) para não mexer nas notificações do dono.
 * Uso: node testes/e2e_t58_coerencia_badge_nao_lidas.mjs   (BASE=…)
 * Requer SUPABASE_SERVICE_ROLE_KEY e VITE_SUPABASE_ANON_KEY.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const SUPA = 'https://klrclczcahfycfdxzdqs.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const CONTAS = [
  { portal: '/', user: '002399714LA030', pass: '123456789', chave: '002399714LA030', rotulo: 'cidadão Edlasio' },
  { portal: '/', user: '005404692BO043', pass: '123456789', chave: '005404692BO043', rotulo: 'cidadão 2' },
  { portal: '/institucional', user: 'INAPEM-LLMM-01', pass: '123456789', chave: 'INAPEM-LLMM', rotulo: 'responsável INAPEM' },
  { portal: '/institucional', user: 'INAPEM-LLMM-02', pass: '222222222', chave: 'INAPEM-LLMM', rotulo: 'colaborador INAPEM' },
];
const RESP = { email: 'agente.inapem-llmm-01@inst.correiodigital.ao', pass: '123456789' };
const CID2 = { email: null, bi: '005404692BO043' };

let total = 0, okN = 0; const falhas = []; const erros = [];
const ok = (c, m) => { total++; if (c) { okN++; console.log(`✔ ${m}`); } else { falhas.push(m); console.log(`✘ ${m}`); } };
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const rest = (q) => fetch(`${SUPA}/rest/v1/${q}`, { headers: H }).then((r) => r.json()).catch(() => []);
const contar = async (q) => { const r = await fetch(`${SUPA}/rest/v1/${q}`, { method: 'HEAD', headers: { ...H, Prefer: 'count=exact' } }); return Number((r.headers.get('content-range') || '/0').split('/')[1] || 0); };
// Regra do cliente (App.tsx, 2026-08-22): notificações de video-atendimento cujo
// «dia AAAA-MM-DD» já passou ficam escondidas (não contam para o badge).
const naoLidasVisiveisNuvem = async (chave) => {
  const rows = await rest(`notifications?select=id,message,target_tab&target_bi=eq.${chave}&read_at=is.null`);
  const hoje = new Date().toISOString().slice(0, 10);
  return (rows || []).filter((n) => { if (n.target_tab !== 'video-atendimento') return true; const m = /dia\s+(\d{4}-\d{2}-\d{2})/i.exec(String(n.message || '')); return !m || m[1] >= hoje; }).length;
};
const tokenDe = async (email, pass) => (await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }),
}).then((r) => r.json())).access_token || '';
const dados = (tok, body) => fetch(`${BASE}/api/dados`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify(body) })
  .then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
const login = async (page, portal, user, pass) => {
  await page.goto(`${BASE}${portal}#/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 30000 });
  await page.fill('input[name="cda-utilizador"]', user); await page.fill('input[name="cda-senha"]', pass);
  await page.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click();
  await page.waitForFunction(() => !/login/.test(location.hash), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);
  return !/login/.test(page.url());
};
const avatar = (page) => page.getByRole('button', { name: 'Menu de Perfil e Notificações' }).first();
const badge = async (page) => { const el = avatar(page).locator('div.bg-red-600').first(); return (await el.count()) ? Number((await el.innerText()).trim()) : 0; };
// cartão «Novas Mensagens» do Painel: «<n>\nNão Lidas» (o texto da página pode ter outros «Não Lidas» antes)
const painelNaoLidas = async (page) => { const t = await page.locator('body').innerText(); const m = /NOVAS MENSAGENS\s*\n\s*(\d+)\s*\n?\s*Não Lidas/i.exec(t); return m ? Number(m[1]) : -1; };
const abrirMenu = async (page) => { await avatar(page).click(); await page.waitForTimeout(700); };
const menuInfo = async (page) => {
  const c = Number((await page.locator('[data-testid="menu-contador"]:visible').first().innerText().catch(() => '0')).trim() || 0);
  const d = (await page.locator('[data-testid="menu-decomposicao"]:visible').first().innerText().catch(() => '')).trim();
  const m = /(\d+)\s*correio\s*·\s*(\d+)\s*notifica/i.exec(d);
  return { contador: c, correio: m ? Number(m[1]) : -1, notifs: m ? Number(m[2]) : -1, texto: d };
};
const fecharMenu = async (page) => { await page.keyboard.press('Escape'); await page.mouse.click(5, 5); await page.waitForTimeout(300); };

const browser = await chromium.launch();
try {
  if (!KEY || !ANON) throw new Error('Chaves Supabase em falta no ambiente.');

  // ───────────── (a)+(b) invariante em TODAS as contas reais ─────────────
  for (const c of CONTAS) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage(); page.on('pageerror', (e) => erros.push(`${c.user}: ${e?.message || e}`));
    ok(await login(page, c.portal, c.user, c.pass), `${c.rotulo}: login REAL`);
    // espera pela estabilidade (o contador do Painel é animado e o correio de
    // homologação chega uns segundos depois): 2 leituras iguais seguidas
    let b = await badge(page), nl = await painelNaoLidas(page);
    for (let k = 0; k < 8; k++) { await page.waitForTimeout(2000); const b2 = await badge(page), nl2 = await painelNaoLidas(page); if (b2 === b && nl2 === nl) break; b = b2; nl = nl2; }
    await abrirMenu(page); const m = await menuInfo(page);
    ok(m.correio >= 0 && m.notifs >= 0, `${c.rotulo}: menu mostra a decomposição («${m.texto}»)`);
    ok(m.contador === b, `${c.rotulo}: contador do menu (${m.contador}) = badge (${b})`);
    ok(m.correio === nl, `${c.rotulo}: «correio» do menu (${m.correio}) = painel «Não Lidas» (${nl})`);
    ok(b === nl + m.notifs, `${c.rotulo}: badge (${b}) = Não Lidas (${nl}) + notificações não lidas (${m.notifs})`);
    // nuvem: notificações não lidas da conta = parcela do menu
    const nuvemNotifs = await naoLidasVisiveisNuvem(c.chave);
    if (c.chave.startsWith('INAPEM')) {
      // instituição: o colaborador não vê denúncias (T53) — o total pode ser menor
      ok(m.notifs <= nuvemNotifs, `${c.rotulo}: notificações não lidas no menu (${m.notifs}) ≤ nuvem (${nuvemNotifs})`);
    } else {
      ok(m.notifs === nuvemNotifs, `${c.rotulo}: notificações não lidas no menu (${m.notifs}) = nuvem (${nuvemNotifs})`);
    }
    await page.screenshot({ path: `testes/evidencias/t58_${c.user}.png` });
    await fecharMenu(page);
    c._ctx = ctx; c._page = page; c._badge = b; c._nl = nl; c._notifs = m.notifs;
  }

  // (b) Edlasio: a correspondência «[TESTE T34 12h52] Sondagem normal — água»
  // (eliminada só pela instituição, unread=true na nuvem) TEM de estar na caixa
  const ed = CONTAS[0];
  const linhaB = await rest(`messages?select=id,unread,state_indicator,actions&id=eq.1789131178035640`);
  const soOutraParte = linhaB?.[0]?.state_indicator === 'EliminadaPermanente' && !(linhaB[0].actions || []).some((a) => String(a).includes('002399714LA030'));
  if (soOutraParte) {
    await ed._page.evaluate(() => { window.location.hash = '#/correspondencias'; }); await ed._page.waitForTimeout(3000);
    const txt = await ed._page.locator('body').innerText();
    ok(txt.includes('T34 12h52'), 'b. Edlasio: correspondência eliminada SÓ pela instituição continua visível na sua caixa');
    ok(linhaB[0].unread ? ed._nl >= 1 : true, `b. Edlasio: «Não Lidas» (${ed._nl}) conta essa correspondência não lida`);
  } else {
    ok(true, 'b. (linha de referência já não está no estado «eliminada só pela outra parte» — verificação estrutural via invariante (a))');
  }
  // fecha sessões do Edlasio e da instituição (não alteramos os dados deles)
  for (const c of [CONTAS[0], CONTAS[2], CONTAS[3]]) await c._ctx.close();

  // ───────────── (c) «Marcar notificações como lidas» — cidadão 2 ─────────────
  const c2 = CONTAS[1]; const page = c2._page;
  // garante ≥1 notificação não lida: responsável activa uma fase numa denúncia do cidadão 2, se existir; senão insere via serviço (dados de teste)
  let antesNuvem = await naoLidasVisiveisNuvem(c2.chave);
  if (antesNuvem === 0) {
    await fetch(`${SUPA}/rest/v1/notifications`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ target_bi: c2.chave, title: 'Aviso de teste T58', message: 'Notificação de teste automatizado (pode ser ignorada).', time_text: 'Agora', type: 'info', target_tab: 'home' }) });
    await page.reload(); await page.waitForTimeout(5000);
    antesNuvem = await naoLidasVisiveisNuvem(c2.chave);
  }
  const bAntes = await badge(page); const nlAntes = await painelNaoLidas(page);
  await abrirMenu(page); const mAntes = await menuInfo(page);
  ok(mAntes.notifs >= 1 && mAntes.notifs === antesNuvem, `c. cidadão 2: ${mAntes.notifs} notificações não lidas antes (nuvem ${antesNuvem})`);
  const btn = page.locator('[data-testid="menu-marcar-todas-lidas"]:visible');
  ok((await btn.count()) === 1, 'c. botão «Marcar notificações como lidas» visível no menu');
  await btn.click(); await page.waitForTimeout(3000);
  if (!(await page.locator('[data-testid="menu-contador"]:visible').count())) await abrirMenu(page); // o menu pode fechar com o re-render
  const mDepois = await menuInfo(page); const bDepois = await badge(page);
  ok(mDepois.notifs === 0, `c. menu passa a 0 notificações não lidas (${mAntes.notifs} → ${mDepois.notifs})`);
  ok(bDepois === nlAntes && mDepois.contador === nlAntes, `c. badge (${bDepois}) e contador (${mDepois.contador}) ficam = só correio não lido (${nlAntes})`);
  ok((await btn.count()) === 0, 'c. botão desaparece quando não há notificações por ler');
  const depoisNuvem = await contar(`notifications?select=id&target_bi=eq.${c2.chave}&read_at=is.null`);
  ok(depoisNuvem === 0, `c. nuvem: 0 notificações não lidas para ${c2.chave} (antes ${antesNuvem})`);
  await page.screenshot({ path: 'testes/evidencias/t58_marcar_todas.png' });
  // persistência: recarrega → badge continua só com correio
  await page.reload(); await page.waitForTimeout(6000);
  ok((await badge(page)) === (await painelNaoLidas(page)), 'c. após recarregar, badge = «Não Lidas» (notificações continuam lidas)');
  await c2._ctx.close();

  // ───────────── (d) segurança do servidor ─────────────
  const tokR = await tokenDe(RESP.email, RESP.pass);
  ok(!!tokR, 'd. token do responsável INAPEM obtido');
  const r1 = await dados(tokR, { tabela: 'notifications', operacao: 'update', filtros: { target_bi: '002399714LA030' }, dados: { read_at: new Date().toISOString() }, isNull: ['read_at'] });
  ok(r1.status === 403, `d. instituição NÃO consegue marcar notificações do cidadão (HTTP ${r1.status})`);
  const r2 = await dados(tokR, { tabela: 'notifications', operacao: 'update', filtros: {}, dados: { read_at: new Date().toISOString() } });
  ok(r2.status === 400, `d. update sem filtro de linha é recusado (HTTP ${r2.status})`);
  const idAlheia = (await rest(`notifications?select=id&target_bi=eq.002399714LA030&read_at=is.null&limit=1`))?.[0]?.id;
  if (idAlheia) {
    const r3 = await dados(tokR, { tabela: 'notifications', operacao: 'update', filtros: { id: idAlheia }, dados: { read_at: new Date().toISOString() } });
    const aindaNaoLida = (await rest(`notifications?select=read_at&id=eq.${idAlheia}`))?.[0]?.read_at === null;
    ok(r3.status !== 200 && aindaNaoLida, `d. instituição não marca notificação alheia por id (HTTP ${r3.status}; continua não lida=${aindaNaoLida})`);
  }
  const edNaoLidasFim = await naoLidasVisiveisNuvem('002399714LA030');
  ok(edNaoLidasFim === CONTAS[0]._notifs, `d. notificações do Edlasio intactas (${edNaoLidasFim})`);

  ok(erros.length === 0, `e. sem erros JS (${erros.length})`);
  if (erros.length) console.log(JSON.stringify(erros.slice(0, 5)));
} catch (e) {
  console.error('EXCEPÇÃO:', e); falhas.push(`excepção: ${e?.message || e}`); total++;
} finally { await browser.close(); }
console.log(`\nRESULTADO T58: ${okN}/${total}` + (falhas.length ? `\nFALHAS:\n - ${falhas.join('\n - ')}` : ''));
process.exit(falhas.length ? 1 : 0);
