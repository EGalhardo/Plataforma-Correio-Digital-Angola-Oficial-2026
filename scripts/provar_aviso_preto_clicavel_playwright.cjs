/**
 * PROVA — o aviso PRETO do canto superior direito é clicável e abre a página
 * respectiva, nas três áreas (Cidadão, Instituição, Administração).
 *
 *   node scripts/provar_aviso_preto_clicavel_playwright.cjs
 *
 * Regra pedida pelo dono: «em alguns casos nas opções de funcionalidades e na
 * parte superior direito com fundo preto. Preciso que ao clicar nessa última
 * notificação com fundo preto seja exibido a respectiva página.»
 *
 * O aviso é o toast do NotifyHost (fundo #0F172A) que anuncia uma notificação
 * nova. Como o realtime não está disponível no ambiente de teste, a suite força
 * o mesmo caminho que o utilizador percorre (evento `focus`/`hashchange`, que
 * dispara a sincronização) depois de criar a notificação na base.
 */
const { chromium } = require('playwright');
const fs = require('fs');

const env = {};
for (const l of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const SR = env.SUPABASE_SERVICE_ROLE_KEY, U = env.SUPABASE_URL;
const H = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };
const APP = 'https://correio-digital-angola-oficial.vercel.app';
const E = (ms) => new Promise((r) => setTimeout(r, ms));
const MARCA = 'AVISO-PRETO';
const FALHAS = [];
const ok = (c, m) => { console.log(`   ${c ? '✓' : '✗'} ${m}`); if (!c) FALHAS.push(m); };

async function notificar(target, titulo, mensagem, tab) {
  const r = await fetch(`${U}/rest/v1/notifications`, {
    method: 'POST', headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify([{ target_bi: target, title: titulo, message: mensagem, time_text: 'Agora', type: 'info', target_tab: tab }]),
  });
  return (await r.json())[0];
}
const apagarNotif = (id) => fetch(`${U}/rest/v1/notifications?id=eq.${id}`, { method: 'DELETE', headers: H });

async function entrar(browser, user, senha, area) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'pt-PT' });
  const p = await ctx.newPage();
  await p.goto(`${APP}/${area}#/login`, { waitUntil: 'networkidle' }); await E(1500);
  await p.fill('input[name="cda-utilizador"]', user);
  await p.fill('input[name="cda-senha"]', senha);
  await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(11000);
  return { ctx, p };
}

const texto = async (p) => (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');

/** Força a sincronização que traria a notificação nova (o mesmo que o realtime faria). */
async function sincronizar(p) {
  await p.evaluate(() => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new HashChangeEvent('hashchange')); });
  await E(9000);
}

async function caixaDoAviso(p) {
  return p.evaluate(() => {
    const alvo = [...document.querySelectorAll('[data-testid="toast-notificacao"]')];
    return alvo.map((el) => {
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), right: Math.round(window.innerWidth - r.right), bg: getComputedStyle(el).backgroundColor, txt: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 120) };
    });
  });
}

(async () => {
  const browser = await chromium.launch();

  const AREAS = [
    { nome: 'CIDADÃO',      user: '002399714LA030', senha: '123456789', area: '',              target: '002399714LA030', tab: 'correspondencias', esperado: /Correio|Correspond/i },
    { nome: 'INSTITUIÇÃO',  user: 'AGT-LMM-01',     senha: '123456789', area: 'institucional/', target: 'AGT-LMM',        tab: 'inqueritos',       esperado: /Crie e realize inquéritos|Inquéritos/i },
    { nome: 'ADMINISTRAÇÃO',user: 'ADMIN-0001',     senha: '987654321', area: 'admin/',         target: 'CDA',     tab: 'gov-correspondencias', esperado: /Correspondências|Expediente|Governa/i },
  ];

  for (const a of AREAS) {
    console.log(`\n═══ ${a.nome} — aviso preto clicável ═══`);
    const id = Date.now().toString().slice(-6);
    const titulo = `Aviso ${MARCA} ${id}`;
    const s = await entrar(browser, a.user, a.senha, a.area);
    const notif = await notificar(a.target, titulo, `${MARCA} ${id} — nova informação disponível.`, a.tab);
    await sincronizar(s.p);

    const caixas = await caixaDoAviso(s.p);
    const aviso = caixas.find((c) => c.txt.includes(MARCA));
    ok(!!aviso, `${a.nome}: o aviso preto aparece no canto superior direito`);
    if (aviso) {
      ok(aviso.top < 120 && aviso.right < 620, `${a.nome}: está no topo/direita (top=${aviso.top}, right=${aviso.right})`);
      ok(/rgb\(15, 23, 42\)|rgb\(2, 6, 23\)/.test(aviso.bg) || /#0F172A/i.test(aviso.bg), `${a.nome}: fundo preto confirmado (${aviso.bg})`);
      ok(/Abrir/i.test(aviso.txt), `${a.nome}: o aviso mostra o sinal «Abrir»`);
    }

    const antes = await texto(s.p);
    const toast = s.p.locator(`[data-testid="toast-notificacao"]:has-text("${MARCA}")`).first();
    ok(await toast.count() > 0, `${a.nome}: o aviso é um elemento clicável (role=button)`);
    if (await toast.count()) {
      await toast.click(); await E(8000);
      const depois = await texto(s.p);
      const mudou = depois !== antes;
      ok(mudou, `${a.nome}: o clique produziu navegação (a página mudou)`);
      ok(a.esperado.test(depois), `${a.nome}: abriu a página respectiva (${a.esperado.source.slice(0, 40)}…)`);
      ok(await s.p.locator(`[data-testid="toast-notificacao"]:has-text("${MARCA}")`).count() === 0, `${a.nome}: o aviso fechou depois do clique`);
    }
    await s.p.screenshot({ path: `test-artifacts/aviso-preto-${a.nome.toLowerCase()}.png` });
    await s.ctx.close();
    if (notif?.id) await apagarNotif(notif.id);
  }

  // limpeza de restos de execuções anteriores
  const restos = await (await fetch(`${U}/rest/v1/notifications?select=id&title=like.*${encodeURIComponent(MARCA)}*`, { headers: H })).json();
  for (const r of restos) await apagarNotif(r.id);
  console.log(`\nlimpeza: ${restos.length === 0 ? '✓ 0 restantes' : '✓ ' + restos.length + ' removidas'}`);

  await browser.close();
  console.log('\n' + '─'.repeat(70));
  if (!FALHAS.length) { console.log('RESULTADO: APROVADO'); process.exit(0); }
  console.log('RESULTADO: REPROVADO');
  FALHAS.forEach((f) => console.log('  · ' + f));
  process.exit(1);
})();
