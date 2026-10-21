/**
 * T55 — (a) Tabela do Correio: acções «Abrir/Analisar» e «Eliminar» em ÍCONES
 *          circulares (tooltip + aria-label), «Restaurar» em «Eliminadas»;
 *          harmonia: mesmo tamanho, alinhados ao centro; escuro sem disco branco.
 *       (b) Aviso ACTIVO ao cidadão quando a instituição activa uma fase da
 *          denúncia: toast «Denúncia — X» aparece SEM recarregar e o Centro de
 *          Notificações passa a listar a nova linha. Contas REAIS.
 * Uso: node testes/e2e_t55_icones_correio_e_aviso_notificacao.mjs   (BASE=…)
 * Requer SUPABASE_SERVICE_ROLE_KEY e VITE_SUPABASE_ANON_KEY.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const SUPA = 'https://klrclczcahfycfdxzdqs.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const CID = { user: '002399714LA030', pass: '123456789' };
const RESP = { user: 'INAPEM-LLMM-01', pass: '123456789', email: 'agente.inapem-llmm-01@inst.correiodigital.ao' };
const MARCA = `T55 ${Date.now().toString().slice(-6)}`;

let total = 0, okN = 0; const falhas = [];
const ok = (c, m) => { total++; if (c) { okN++; console.log(`✔ ${m}`); } else { falhas.push(m); console.log(`✘ ${m}`); } };
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const rest = (q) => fetch(`${SUPA}/rest/v1/${q}`, { headers: H }).then((r) => r.json()).catch(() => []);
const tokenDe = async (email, pass) => (await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }),
}).then((r) => r.json())).access_token || '';
const apiFase = (tok, id, fase) => fetch(`${BASE}/api/denuncia/fase`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ id, fase }),
}).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
const erros = [];
const login = async (page, portal, user, pass) => {
  await page.goto(`${BASE}${portal}#/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 30000 });
  await page.fill('input[name="cda-utilizador"]', user); await page.fill('input[name="cda-senha"]', pass);
  await page.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click();
  await page.waitForFunction(() => !/login/.test(location.hash), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  return !/login/.test(page.url());
};
const irCorreio = async (page) => { await page.evaluate(() => { window.location.hash = '#/correspondencias'; }); await page.waitForTimeout(3000); };
const novaPagina = async (browser, vp) => {
  const ctx = await browser.newContext({ viewport: vp || { width: 1366, height: 900 } });
  const page = await ctx.newPage(); page.on('pageerror', (e) => erros.push(String(e?.message || e)));
  return { ctx, page };
};

const browser = await chromium.launch();
try {
  if (!KEY || !ANON) throw new Error('Chaves Supabase em falta no ambiente.');

  // ───────────── (a) Ícones na tabela — cidadão ─────────────
  const c = await novaPagina(browser);
  ok(await login(c.page, '/', CID.user, CID.pass), 'a. login cidadão REAL');
  await irCorreio(c.page);
  const linhas = c.page.locator('[data-testid="acoes-linha"]');
  ok((await linhas.count()) > 0, `a. células de acções presentes (${await linhas.count()})`);
  const primeira = linhas.first();
  const bAbrir = primeira.locator('[data-acao="abrir"]'); const bElim = primeira.locator('[data-acao="eliminar"]');
  ok(await bAbrir.isVisible() && await bElim.isVisible(), 'a. botões Abrir e Eliminar visíveis');
  ok((await bAbrir.innerText()).trim() === '' && (await bElim.innerText()).trim() === '', 'a. botões SEM texto (só ícone)');
  ok((await bAbrir.locator('svg').count()) === 1 && (await bElim.locator('svg').count()) === 1, 'a. cada botão tem um ícone SVG');
  ok((await bAbrir.getAttribute('aria-label')) === 'Abrir' && (await bElim.getAttribute('aria-label')) === 'Eliminar', 'a. aria-label «Abrir» / «Eliminar»');
  ok(!!(await bAbrir.getAttribute('title')) && !!(await bElim.getAttribute('title')), 'a. tooltips (title) presentes');
  const ba = await bAbrir.boundingBox(); const be = await bElim.boundingBox();
  ok(Math.abs(ba.width - be.width) < 1 && Math.abs(ba.height - be.height) < 1 && Math.abs(ba.width - ba.height) < 1, `a. botões do mesmo tamanho e circulares (${ba.width.toFixed(0)}px)`);
  ok(Math.abs((ba.y + ba.height / 2) - (be.y + be.height / 2)) < 1, 'a. alinhados na mesma linha');
  const cel = await primeira.evaluate((el) => el.closest('td').getBoundingClientRect().toJSON());
  const centroGrupo = (ba.x + be.x + be.width) / 2; const centroCel = cel.x + cel.width / 2;
  ok(Math.abs(centroGrupo - centroCel) < 6, `a. grupo centrado na célula (Δ=${Math.abs(centroGrupo - centroCel).toFixed(1)}px)`);
  ok((await c.page.getByText(/^ABRIR$/).count()) === 0 && (await c.page.locator('table').getByText(/^Eliminar$/).count()) === 0, 'a. textos «ABRIR»/«Eliminar» desapareceram da tabela');
  ok((await c.page.getByRole('button', { name: /^Abrir$/ }).count()) === (await linhas.count()), 'a. compatibilidade: getByRole(«Abrir») continua a encontrar todas as linhas');
  const radius = await bAbrir.evaluate((el) => getComputedStyle(el).borderRadius);
  ok(/9999px|50%/.test(radius) || parseFloat(radius) >= ba.width / 2 - 1, `a. forma circular (border-radius ${radius})`);
  // Abrir funciona
  await bAbrir.click(); await c.page.waitForTimeout(2500);
  ok(/mensagem/.test(c.page.url()) || (await c.page.getByRole('button', { name: /Ver detalhes Completos/i }).count()) > 0, 'a. ícone «Abrir» abre o detalhe');
  await irCorreio(c.page);
  // Eliminar abre confirmação (não confirma)
  await c.page.locator('[data-testid="acoes-linha"]').first().locator('[data-acao="eliminar"]').click(); await c.page.waitForTimeout(800);
  ok((await c.page.getByText(/Eliminar Correspondência\?/i).count()) >= 1, 'a. ícone «Eliminar» abre a confirmação');
  await c.page.getByRole('button', { name: /^Cancelar$|^Fechar$/i }).first().click().catch(() => {}); await c.page.waitForTimeout(500);
  // Eliminadas → Restaurar
  await c.page.getByRole('button', { name: /^Eliminadas/i }).first().click().catch(() => {}); await c.page.waitForTimeout(1500);
  const nElim = await c.page.locator('[data-testid="acoes-linha"]').count();
  if (nElim > 0) {
    const p0 = c.page.locator('[data-testid="acoes-linha"]').first();
    ok((await p0.locator('[data-acao="restaurar"]').count()) === 1 && (await p0.locator('[data-acao="eliminar"]').getAttribute('aria-label')) === 'Eliminar permanentemente', 'a. «Eliminadas»: ícones Restaurar + Eliminar permanentemente');
  } else console.log('  (sem correspondências eliminadas — verificação de «Restaurar» saltada)');
  await c.page.getByRole('button', { name: /^Lidas/i }).first().click().catch(() => {}); await c.page.waitForTimeout(800);
  // Escuro
  await c.page.evaluate(() => document.documentElement.classList.add('dark')); await c.page.waitForTimeout(500);
  const bgDark = await c.page.locator('[data-testid="acoes-linha"]').first().locator('[data-acao="abrir"]').evaluate((el) => getComputedStyle(el).backgroundColor);
  ok(!/rgb\(255,\s*255,\s*255\)|oklch\(1 /.test(bgDark), `a. escuro: sem disco branco (bg ${bgDark})`);
  await c.page.screenshot({ path: 'testes/evidencias/t55_tabela_escuro.png' });
  await c.page.evaluate(() => document.documentElement.classList.remove('dark'));
  await c.page.screenshot({ path: 'testes/evidencias/t55_tabela_claro.png' });

  // ───────────── (a2) Instituição: «Analisar» ─────────────
  const i = await novaPagina(browser);
  ok(await login(i.page, '/institucional', RESP.user, RESP.pass), 'a2. login responsável');
  await irCorreio(i.page);
  const li = i.page.locator('[data-testid="acoes-linha"]').first();
  ok((await li.locator('[data-acao="abrir"]').getAttribute('aria-label')) === 'Analisar', 'a2. instituição: ícone com aria-label «Analisar»');
  ok((await i.page.getByText(/^ANALISAR$/).count()) === 0, 'a2. texto «ANALISAR» removido da tabela');
  await i.ctx.close();

  // ───────────── (b) Aviso activo de notificação ─────────────
  // cidadão envia denúncia; instituição activa «Recebida» via API; o cidadão
  // (sessão aberta, sem reload) tem de ver o toast e a linha nas notificações.
  await irCorreio(c.page);
  await c.page.getByRole('button', { name: /Nova Mensagem/i }).first().click();
  await c.page.waitForSelector('#btn-enviar-mensagem', { timeout: 20000 });
  await c.page.locator('input[placeholder*="Código Institucional"]').fill('INAPEM-LLMM');
  await c.page.locator('input[placeholder="Qual o tema da sua mensagem?"]').fill(`Denúncia de teste ${MARCA}`);
  await c.page.locator('textarea').first().fill(`Denúncia de TESTE automatizado (${MARCA}) — validação do aviso de notificação. Pode ser ignorada.`);
  await c.page.waitForFunction(() => !document.querySelector('#btn-enviar-mensagem')?.disabled, null, { timeout: 20000 }).catch(() => {});
  await c.page.locator('#btn-enviar-mensagem').click(); await c.page.waitForTimeout(600);
  await c.page.locator('#btn-modal-opcao-denunciar').click(); await c.page.waitForTimeout(800);
  await c.page.getByRole('button', { name: /^Enviar Correspondência$/ }).first().click();
  await c.page.waitForFunction(() => !document.querySelector('#btn-enviar-mensagem'), null, { timeout: 60000 }).catch(() => {});
  await c.page.waitForTimeout(6000);
  await c.page.getByRole('button', { name: /Concluir e Fechar/i }).first().click().catch(() => {});
  const rows = await rest(`messages?select=id,subject&sender_bi=eq.${CID.user}&subject=ilike.${encodeURIComponent('*' + MARCA + '*')}&limit=1`);
  const idMsg = Number(rows?.[0]?.id || 0);
  ok(idMsg > 0, `b. denúncia criada na nuvem (#${idMsg})`);
  await c.page.evaluate(() => { window.location.hash = '#/home'; }); await c.page.waitForTimeout(4000); // 1.ª leitura já memorizou os ids
  const tokR = await tokenDe(RESP.email, RESP.pass);
  const r = await apiFase(tokR, idMsg, 'recebida');
  ok(r.status === 200 && r.json?.notificado === true, `b. responsável activa «Recebida» (HTTP ${r.status}, notificado=${r.json?.notificado})`);
  // toast sem reload (realtime ou polling 15 s)
  let toast = false;
  for (let k = 0; k < 12 && !toast; k++) { await c.page.waitForTimeout(2500); toast = (await c.page.getByText(/Denúncia — Recebida/).count()) > 0; }
  ok(toast, 'b. cidadão vê o AVISO «Denúncia — Recebida» sem recarregar a página');
  await c.page.screenshot({ path: 'testes/evidencias/t55_toast_notificacao.png' });
  await c.page.evaluate(() => { window.location.hash = '#/notificacoes'; }); await c.page.waitForTimeout(3000);
  const txt = await c.page.locator('body').innerText();
  ok(/Denúncia — Recebida/.test(txt) && txt.includes(MARCA), 'b. Centro de Notificações lista a notificação da nova fase');
  await c.ctx.close();

  ok(erros.length === 0, `c. sem erros JS (${erros.length})`);
  if (erros.length) console.log(JSON.stringify(erros.slice(0, 5)));
} catch (e) {
  console.error('EXCEPÇÃO:', e); falhas.push(`excepção: ${e?.message || e}`); total++;
} finally { await browser.close(); }
console.log(`\nRESULTADO T55: ${okN}/${total}` + (falhas.length ? `\nFALHAS:\n - ${falhas.join('\n - ')}` : ''));
process.exit(falhas.length ? 1 : 0);
