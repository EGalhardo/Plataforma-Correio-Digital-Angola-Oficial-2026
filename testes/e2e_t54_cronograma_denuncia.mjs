/**
 * T54 — Cronograma de acompanhamento da DENÚNCIA (contas REAIS).
 *  1) Cidadão real envia uma denúncia (popup «Denunciar») a INAPEM-LLMM-01;
 *     nuvem: assunto «[DENÚNCIA] …», evento «DENUNCIA:registada», notificação
 *     à instituição SEM o nome do cidadão.
 *  2) Cidadão abre a denúncia em «Enviadas»: cronograma visível, só leitura,
 *     «Registada» activa, na linha do «Ver detalhes Completos» (à direita).
 *  3) Colaborador (INAPEM-LLMM-02) NÃO vê a denúncia na caixa; API → 403.
 *  4) Responsável (INAPEM-LLMM-01) vê a denúncia como «Anónimo» (nunca o nome),
 *     salto de fase é recusado, popup «Activar a fase» com Fechar/Ok, Ok activa
 *     «Recebida» → nuvem (histórico + notificação ao cidadão) → «Em análise».
 *  5) Cidadão (recarregado) vê «Em análise» activa e a notificação.
 *  6) Mobile: cronograma em linha própria abaixo do botão. Sem erros JS.
 * Uso: node testes/e2e_t54_cronograma_denuncia.mjs   (BASE=… para outro alvo)
 * Requer SUPABASE_SERVICE_ROLE_KEY e VITE_SUPABASE_ANON_KEY no ambiente.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const SUPA = 'https://klrclczcahfycfdxzdqs.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const CID = { user: '002399714LA030', pass: '123456789', nome: 'Galhardo' };
const RESP = { user: 'INAPEM-LLMM-01', pass: '123456789', email: 'agente.inapem-llmm-01@inst.correiodigital.ao' };
const MEMB = { user: 'INAPEM-LLMM-02', pass: '222222222', email: 'agente.inapem-llmm-02@inst.correiodigital.ao' };
const MARCA = `T54 ${Date.now().toString().slice(-6)}`;
const ASSUNTO = `Denúncia de teste automatizado ${MARCA}`;

let total = 0, okN = 0; const falhas = [];
const ok = (c, m) => { total++; if (c) { okN++; console.log(`✔ ${m}`); } else { falhas.push(m); console.log(`✘ ${m}`); } };
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const rest = (q) => fetch(`${SUPA}/rest/v1/${q}`, { headers: H }).then((r) => r.json()).catch(() => []);
const tokenDe = async (email, pass) => (await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }),
}).then((r) => r.json())).access_token || '';
const apiFase = (tok, id, fase) => fetch(`${BASE}/api/denuncia/fase`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) }, body: JSON.stringify({ id, fase }),
}).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));

const erros = [];
const login = async (page, portal, user, pass) => {
  await page.goto(`${BASE}${portal}#/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 30000 });
  await page.fill('input[name="cda-utilizador"]', user);
  await page.fill('input[name="cda-senha"]', pass);
  await page.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click();
  await page.waitForFunction(() => !/login/.test(location.hash), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  return !/login/.test(page.url());
};
const irCorreio = async (page) => {
  await page.evaluate(() => { window.location.hash = '#/correspondencias'; });
  await page.waitForTimeout(2500);
};
const abrirLinha = async (page, texto) => {
  // clica no botão ABRIR/ANALISAR da linha cujo texto contém `texto`
  const botoes = page.getByRole('button', { name: /^(Abrir|Analisar)$/i });
  const n = await botoes.count();
  for (let i = 0; i < n; i++) {
    const b = botoes.nth(i);
    if (!(await b.isVisible())) continue;
    const t = await b.evaluate((el) => (el.closest('tr') || el.closest('[class*="rounded"]') || el.parentElement).innerText);
    if (t.includes(texto)) { await b.click(); await page.waitForTimeout(2500); return true; }
  }
  const l = page.getByText(texto).first();
  if (await l.count()) { await l.click(); await page.waitForTimeout(2500); return true; }
  return false;
};
const limparRascunho = (page) => page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('cda_rascunho_composicao_')) localStorage.removeItem(k); });
const novaPagina = async (browser, vp) => {
  const ctx = await browser.newContext({ viewport: vp || { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => erros.push(String(e?.message || e)));
  return { ctx, page };
};

const browser = await chromium.launch();
let idMsg = 0;
try {
  if (!KEY || !ANON) throw new Error('SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY em falta no ambiente.');

  // ───────────── 1) Cidadão envia denúncia ─────────────
  const c1 = await novaPagina(browser);
  ok(await login(c1.page, '/', CID.user, CID.pass), '1. login cidadão REAL');
  await limparRascunho(c1.page); await irCorreio(c1.page);
  await c1.page.getByRole('button', { name: /Nova Mensagem/i }).first().click();
  await c1.page.waitForSelector('#btn-enviar-mensagem', { timeout: 20000 });
  await c1.page.locator('input[placeholder*="Código Institucional"]').fill(RESP.user);
  await c1.page.locator('input[placeholder="Qual o tema da sua mensagem?"]').fill(ASSUNTO);
  await c1.page.locator('textarea').first().fill(`Denúncia de TESTE automatizado (${MARCA}) para validar o cronograma de acompanhamento. Pode ser ignorada.`);
  await c1.page.waitForFunction(() => !document.querySelector('#btn-enviar-mensagem')?.disabled, null, { timeout: 20000 }).catch(() => {});
  await c1.page.locator('#btn-enviar-mensagem').click(); await c1.page.waitForTimeout(600);
  await c1.page.locator('#btn-modal-opcao-denunciar').click(); await c1.page.waitForTimeout(800);
  ok(/Denúncia/.test(await c1.page.locator('[data-testid="rever-modalidade"]').first().innerText().catch(() => '')), '1. revisão indica «Modalidade: Denúncia»');
  await c1.page.getByRole('button', { name: /^Enviar Correspondência$/ }).first().click();
  await c1.page.waitForFunction(() => !document.querySelector('#btn-enviar-mensagem'), null, { timeout: 60000 }).catch(() => {});
  await c1.page.waitForTimeout(6000);
  await c1.page.getByRole('button', { name: /Concluir e Fechar/i }).first().click().catch(() => {});
  await c1.page.waitForTimeout(800);
  // procura pela MARCA única do assunto (os ids não são monótonos no tempo)
  const rows = await rest(`messages?select=id,subject,sender_bi,recipient_bi&sender_bi=eq.${CID.user}&subject=ilike.${encodeURIComponent('*' + MARCA + '*')}&limit=2`);
  ok(rows?.[0]?.recipient_bi === 'INAPEM-LLMM', `1. destinatário normalizado para o código-base (${rows?.[0]?.recipient_bi})`);
  const r0 = rows?.[0];
  idMsg = Number(r0?.id || 0);
  ok(!!r0 && rows.length === 1 && (r0.subject || '').includes(MARCA), `1. nova linha na nuvem (#${idMsg})`);
  ok(/^\[DENÚNCIA\]/.test(r0?.subject || ''), `1. assunto prefixado «[DENÚNCIA]» (${r0?.subject})`);
  const hist0 = await rest(`message_state_history?select=state,responsible&message_id=eq.${idMsg}`);
  ok((hist0 || []).some((h) => h.state === 'DENUNCIA:registada'), '1. evento «DENUNCIA:registada» gravado automaticamente no envio');
  const notInst = await rest(`notifications?select=title,message&target_bi=eq.INAPEM-LLMM&order=id.desc&limit=3`);
  const nI = (notInst || []).find((n) => /Denúncia Anónima/i.test(n.title || ''));
  ok(!!nI, '1. instituição notificada «Nova Denúncia Anónima»');
  ok(!!nI && !/Galhardo|002399714/i.test(`${nI.title} ${nI.message}`), '1. notificação à instituição NÃO revela o nome/BI do cidadão');

  // ───────────── 2) Cidadão vê cronograma (só leitura) ─────────────
  await c1.page.reload(); await c1.page.waitForTimeout(4000); await irCorreio(c1.page);
  await c1.page.getByRole('button', { name: /^Enviadas/i }).first().click().catch(() => {}); await c1.page.waitForTimeout(3000);
  ok(await abrirLinha(c1.page, MARCA), '2. cidadão abre a denúncia em «Enviadas»');
  const cronoC = c1.page.locator('[data-testid="cronograma-denuncia"]').first();
  ok(await cronoC.isVisible().catch(() => false), '2. cronograma visível no detalhe (cidadão)');
  ok((await cronoC.getAttribute('data-fase-actual')) === 'registada', '2. fase actual = Registada');
  ok((await cronoC.innerText()).toLowerCase().includes('só leitura'), '2. marcado «só leitura» para o cidadão');
  ok(await c1.page.locator('[data-testid="fase-recebida"]').first().isDisabled(), '2. pontos desactivados para o cidadão');
  const bBtn = await c1.page.getByRole('button', { name: /Ver detalhes Completos/i }).first().boundingBox();
  const bCr = await cronoC.boundingBox();
  ok(!!bBtn && !!bCr && bCr.x > bBtn.x + bBtn.width && Math.abs(bCr.y - bBtn.y) < 60, `2. cronograma à direita, na linha do botão (Δy=${bBtn && bCr ? Math.abs(bCr.y - bBtn.y).toFixed(0) : '?'}px)`);
  for (const f of ['registada', 'recebida', 'em_analise', 'respondida', 'encerrada']) ok(await c1.page.locator(`[data-testid="fase-${f}"]`).count() === 1, `2. ponto «${f}» presente`);
  await c1.page.screenshot({ path: 'testes/evidencias/t54_cidadao_registada.png', fullPage: false });

  // ───────────── 3) Colaborador não vê ─────────────
  const m1 = await novaPagina(browser);
  ok(await login(m1.page, '/institucional', MEMB.user, MEMB.pass), '3. login colaborador (INAPEM-LLMM-02)');
  await irCorreio(m1.page); await m1.page.waitForTimeout(3000);
  const naoLidasM = m1.page.getByRole('button', { name: /^Não lidas/i }).first();
  if (await naoLidasM.count()) { await naoLidasM.click().catch(() => {}); await m1.page.waitForTimeout(1500); }
  ok((await m1.page.getByText(MARCA).count()) === 0, '3. denúncia AUSENTE na caixa do colaborador (Não lidas)');
  await m1.page.getByRole('button', { name: /^Lidas/i }).first().click().catch(() => {}); await m1.page.waitForTimeout(1500);
  ok((await m1.page.getByText(MARCA).count()) === 0, '3. denúncia AUSENTE na caixa do colaborador (Lidas)');
  const tokM = await tokenDe(MEMB.email, MEMB.pass);
  const rM = await apiFase(tokM, idMsg, 'recebida');
  ok(rM.status === 403, `3. API recusa colaborador (HTTP ${rM.status}: ${rM.json?.erro || ''})`);
  const rSem = await apiFase('', idMsg, 'recebida');
  ok(rSem.status === 401, `3. API sem sessão → 401`);
  const tokC = await tokenDe(`${CID.user.toLowerCase()}@cidadao.correiodigital.ao`, CID.pass).catch(() => '');
  if (tokC) { const rC = await apiFase(tokC, idMsg, 'recebida'); ok(rC.status === 403, `3. API recusa o cidadão (HTTP ${rC.status})`); }
  await m1.ctx.close();

  // ───────────── 4) Responsável ─────────────
  const r1 = await novaPagina(browser);
  ok(await login(r1.page, '/institucional', RESP.user, RESP.pass), '4. login responsável (INAPEM-LLMM-01)');
  await irCorreio(r1.page); await r1.page.waitForTimeout(3000);
  const naoLidasR = r1.page.getByRole('button', { name: /^Não lidas/i }).first();
  if (await naoLidasR.count()) { await naoLidasR.click().catch(() => {}); await r1.page.waitForTimeout(1500); }
  let linhaVis = (await r1.page.getByText(MARCA).count()) > 0;
  if (!linhaVis) { await r1.page.getByRole('button', { name: /^Lidas/i }).first().click().catch(() => {}); await r1.page.waitForTimeout(1500); linhaVis = (await r1.page.getByText(MARCA).count()) > 0; }
  ok(linhaVis, '4. denúncia PRESENTE na caixa do responsável');
  const textoLista = await r1.page.locator('main, body').first().innerText();
  ok(/An[oó]nimo/i.test(textoLista), '4. lista mostra remetente «Anónimo»');
  ok(!/Galhardo/i.test(textoLista), '4. lista NÃO mostra o nome do cidadão');
  ok(await abrirLinha(r1.page, MARCA), '4. responsável abre a denúncia');
  const cronoR = r1.page.locator('[data-testid="cronograma-denuncia"]').first();
  ok(await cronoR.isVisible().catch(() => false), '4. cronograma visível (instituição)');
  ok(!(await cronoR.innerText()).toLowerCase().includes('só leitura'), '4. sem marca «só leitura» para o responsável');
  const textoDet = await r1.page.locator('main, body').first().innerText();
  ok(/An[oó]nimo/i.test(textoDet) && !/Galhardo/i.test(textoDet), '4. detalhe mostra «Anónimo» e nunca o nome do cidadão');
  // salto de fase recusado
  await r1.page.locator('[data-testid="fase-em_analise"]').first().click(); await r1.page.waitForTimeout(700);
  const aviso = r1.page.locator('[data-testid="aviso-denuncia"]').first();
  ok(await aviso.isVisible().catch(() => false) && /Active primeiro a fase «Recebida»/.test(await aviso.innerText()), '4. saltar para «Em análise» é recusado (pede «Recebida» primeiro)');
  await r1.page.locator('#btn-aviso-denuncia-fechar').click(); await r1.page.waitForTimeout(500);
  ok((await r1.page.locator('[data-testid="popup-activar-fase"]').count()) === 0, '4. sem popup de activação após recusa');
  // popup Fechar
  await r1.page.locator('[data-testid="fase-recebida"]').first().click(); await r1.page.waitForTimeout(700);
  const popup = r1.page.locator('[data-testid="popup-activar-fase"]').first();
  ok(await popup.isVisible().catch(() => false), '4. popup «Activar a fase» abre');
  ok((await r1.page.getByText(/Activar a fase «Recebida»/).count()) >= 1, '4. popup nomeia a fase «Recebida»');
  ok(await r1.page.locator('#btn-fase-fechar').isVisible() && await r1.page.locator('#btn-fase-ok').isVisible(), '4. popup tem botões «Fechar» e «Ok»');
  await r1.page.screenshot({ path: 'testes/evidencias/t54_popup_activar.png' });
  await r1.page.locator('#btn-fase-fechar').click(); await r1.page.waitForTimeout(600);
  ok((await popup.count()) === 0 && (await cronoR.getAttribute('data-fase-actual')) === 'registada', '4. «Fechar» não altera a fase');
  // Ok → Recebida
  await r1.page.locator('[data-testid="fase-recebida"]').first().click(); await r1.page.waitForTimeout(600);
  await r1.page.locator('#btn-fase-ok').click();
  await r1.page.waitForFunction(() => document.querySelector('[data-testid="cronograma-denuncia"]')?.getAttribute('data-fase-actual') === 'recebida', null, { timeout: 20000 }).catch(() => {});
  ok((await cronoR.getAttribute('data-fase-actual')) === 'recebida', '4. «Ok» activa «Recebida»');
  ok((await r1.page.locator('[data-testid="fase-registada"]').getAttribute('data-estado')) === 'concluida', '4. «Registada» passa a concluída');
  ok((await r1.page.locator('[data-testid="fase-em_analise"]').getAttribute('data-estado')) === 'aguardar', '4. «Em análise» a aguardar');
  const avisoOk = r1.page.locator('[data-testid="aviso-denuncia"]').first();
  ok(await avisoOk.isVisible().catch(() => false) && /notificado/i.test(await avisoOk.innerText()), '4. confirmação indica cidadão notificado');
  await r1.page.locator('#btn-aviso-denuncia-fechar').click().catch(() => {}); await r1.page.waitForTimeout(500);
  const hist1 = await rest(`message_state_history?select=state,responsible,description&message_id=eq.${idMsg}`);
  ok((hist1 || []).some((h) => h.state === 'DENUNCIA:recebida' && /INAPEM-LLMM/.test(h.responsible || '')), '4. nuvem: evento «DENUNCIA:recebida» com responsável');
  const notC = await rest(`notifications?select=title,message&target_bi=eq.${CID.user}&order=id.desc&limit=3`);
  ok((notC || []).some((n) => /Denúncia — Recebida/.test(n.title || '')), '4. nuvem: notificação «Denúncia — Recebida» ao cidadão');
  // regressão recusada pela API
  const tokR = await tokenDe(RESP.email, RESP.pass);
  const rBack = await apiFase(tokR, idMsg, 'registada');
  ok(rBack.status === 409, `4. API recusa recuar (HTTP ${rBack.status})`);
  const rSkip = await apiFase(tokR, idMsg, 'respondida');
  ok(rSkip.status === 409, `4. API recusa saltar (HTTP ${rSkip.status})`);
  // Em análise via UI
  await r1.page.locator('[data-testid="fase-em_analise"]').first().click(); await r1.page.waitForTimeout(600);
  await r1.page.locator('#btn-fase-ok').click();
  await r1.page.waitForFunction(() => document.querySelector('[data-testid="cronograma-denuncia"]')?.getAttribute('data-fase-actual') === 'em_analise', null, { timeout: 20000 }).catch(() => {});
  ok((await cronoR.getAttribute('data-fase-actual')) === 'em_analise', '4. activa «Em análise»');
  await r1.page.locator('#btn-aviso-denuncia-fechar').click().catch(() => {}); await r1.page.waitForTimeout(400);
  await r1.page.screenshot({ path: 'testes/evidencias/t54_inst_em_analise.png' });
  // clicar numa fase já concluída não abre popup
  await r1.page.locator('[data-testid="fase-registada"]').first().click(); await r1.page.waitForTimeout(600);
  ok((await r1.page.locator('[data-testid="popup-activar-fase"]').count()) === 0, '4. clicar em fase concluída não abre popup (sem recuo)');
  await r1.page.locator('#btn-aviso-denuncia-fechar').click().catch(() => {});
  // auditoria na nuvem da 2.ª activação
  const hist2 = await rest(`message_state_history?select=state,responsible,description&message_id=eq.${idMsg}`);
  ok((hist2 || []).some((h) => h.state === 'DENUNCIA:em_analise' && /Em análise/.test(h.description || '')), '4. nuvem: evento «DENUNCIA:em_analise» com descrição');
  ok((hist2 || []).filter((h) => String(h.state || '').startsWith('DENUNCIA:')).length === 3, '4. nuvem: exactamente 3 eventos de fase (registada, recebida, em_analise)');
  await r1.ctx.close();

  // ───────────── 5) Cidadão vê a fase e a notificação ─────────────
  await c1.page.reload(); await c1.page.waitForTimeout(4000); await irCorreio(c1.page);
  await c1.page.getByRole('button', { name: /^Enviadas/i }).first().click().catch(() => {}); await c1.page.waitForTimeout(3000);
  ok(await abrirLinha(c1.page, MARCA), '5. cidadão reabre a denúncia');
  const cronoC2 = c1.page.locator('[data-testid="cronograma-denuncia"]').first();
  await c1.page.waitForFunction(() => document.querySelector('[data-testid="cronograma-denuncia"]')?.getAttribute('data-fase-actual') === 'em_analise', null, { timeout: 20000 }).catch(() => {});
  ok((await cronoC2.getAttribute('data-fase-actual')) === 'em_analise', '5. cidadão vê «Em análise» activa');
  ok((await c1.page.locator('[data-testid="fase-recebida"]').getAttribute('data-estado')) === 'concluida', '5. «Recebida» concluída para o cidadão');
  await c1.page.screenshot({ path: 'testes/evidencias/t54_cidadao_em_analise.png' });
  await c1.page.evaluate(() => { window.location.hash = '#/notificacoes'; }); await c1.page.waitForTimeout(3000);
  const txtNot = await c1.page.locator('main, body').first().innerText();
  ok(/Em análise/i.test(txtNot) && /den[uú]ncia/i.test(txtNot), '5. página de notificações do cidadão mostra a passagem a «Em análise»');
  await c1.ctx.close();

  // ───────────── 6) Mobile ─────────────
  const mob = await novaPagina(browser, { width: 390, height: 844 });
  ok(await login(mob.page, '/', CID.user, CID.pass), '6. login cidadão (mobile)');
  await irCorreio(mob.page);
  await mob.page.getByRole('button', { name: /^Enviadas/i }).first().click().catch(() => {}); await mob.page.waitForTimeout(3000);
  ok(await abrirLinha(mob.page, MARCA), '6. abre a denúncia (mobile)');
  const cronoM = mob.page.locator('[data-testid="cronograma-denuncia"]').first();
  await cronoM.scrollIntoViewIfNeeded().catch(() => {});
  const bBtnM = await mob.page.getByRole('button', { name: /Ver detalhes Completos/i }).first().boundingBox();
  const bCrM = await cronoM.boundingBox();
  ok(!!bBtnM && !!bCrM && bCrM.y >= bBtnM.y + bBtnM.height - 2, '6. mobile: cronograma em linha própria abaixo do botão');
  ok(!!bCrM && bCrM.width <= 390 && bCrM.x >= 0, '6. mobile: cronograma cabe na largura do ecrã');
  ok((await cronoM.locator('ol').first().getAttribute('data-orientacao')) === 'vertical', '6. mobile: cronograma em orientação VERTICAL');
  const pontosM = await Promise.all(['registada', 'recebida', 'em_analise'].map((f) => mob.page.locator(`[data-testid="fase-${f}"]`).boundingBox()));
  ok(pontosM.every(Boolean) && pontosM[1].y > pontosM[0].y && pontosM[2].y > pontosM[1].y && Math.abs(pontosM[0].x - pontosM[2].x) < 2, '6. mobile: pontos empilhados na vertical (mesma coluna)');
  await mob.page.screenshot({ path: 'testes/evidencias/t54_mobile.png', fullPage: false });
  await mob.ctx.close();

  ok(erros.length === 0, `7. sem erros JS (${erros.length})`);
  if (erros.length) console.log(JSON.stringify(erros.slice(0, 5)));
} catch (e) {
  console.error('EXCEPÇÃO:', e);
  falhas.push(`excepção: ${e?.message || e}`); total++;
} finally {
  await browser.close();
}
console.log(`\nRESULTADO T54: ${okN}/${total}` + (falhas.length ? `\nFALHAS:\n - ${falhas.join('\n - ')}` : ''));
console.log(`mensagem de teste: #${idMsg}`);
process.exit(falhas.length ? 1 : 0);
