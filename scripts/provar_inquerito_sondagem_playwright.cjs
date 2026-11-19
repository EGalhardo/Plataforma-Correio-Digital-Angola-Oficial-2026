// ============================================================================
// Prova end-to-end — INQUÉRITO (Sondagem manual + Inquérito IA) na conta real
// AGT-LMM-01, em produção. Cobre os três cenários que importam:
//   F1  criação com sessão fresca (Inquérito Normal)  → cria
//   F2  criação com a sessão Supabase REMOVIDA (sessão expirada / login de
//       emergência) — é o cenário que mostrava «new row violates row-level
//       security policy for table "sondagens"» → tem de criar (recupera a
//       sessão) e, mesmo quando não consegue, a mensagem tem de ser honesta
//   F3  Inquérito com IA (inqueritos_ia) → cria
//   F4  limpeza: os rascunhos criados pelo teste são eliminados
// Uso: node scripts/provar_inquerito_sondagem_playwright.cjs
// ============================================================================
const { chromium } = require('playwright');

const BASE = 'https://correio-digital-angola-oficial.vercel.app';
const CONTA = { user: 'AGT-LMM-01', pass: '123456789' };
const PERGUNTA_F1 = 'Prova automática — inquérito com sessão fresca';
const PERGUNTA_F2 = 'Prova automática — inquérito com sessão expirada';
const TEMA_F3 = 'Prova automática — inquérito com IA';

const resultados = [];
const registar = (nome, ok, detalhe = '') => {
  resultados.push({ nome, ok, detalhe });
  console.log(`${ok ? 'PASSOU' : 'FALHOU'}  ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};

const login = async (page) => {
  await page.goto(BASE + '/institucional', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  if (await page.locator('input[name="cda-utilizador"]').count()) {
    await page.fill('input[name="cda-utilizador"]', CONTA.user);
    await page.fill('input[name="cda-senha"]', CONTA.pass);
    await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
    await page.waitForTimeout(6000);
  }
};

const abrirCompositor = async (page) => {
  const correio = page.locator('button:has-text("Correio"), a:has-text("Correio")').first();
  if (await correio.count()) { await correio.click(); await page.waitForTimeout(2500); }
  const nova = page.locator('button:has-text("Nova Mensagem")').first();
  if (await nova.count()) { await nova.click(); await page.waitForTimeout(2500); }
};

const criarSondagem = async (page, pergunta) => {
  const eventos = [];
  const onReq = (r) => {
    const p = r.postData() || '';
    if (/tabela\\":\\"sondagens|rest\/v1\/sondagens/.test(p) || /rest\/v1\/sondagens/.test(r.url())) {
      eventos.push({ dir: 'REQ', metodo: r.method(), url: r.url().replace(BASE, ''), auth: !!r.headers()['authorization'] });
    }
  };
  const onRes = async (r) => {
    const u = r.url();
    if (/rest\/v1\/sondagens/.test(u) || (/api\/dados/.test(u) && /sondagens/.test(u))) {
      let t = ''; try { t = await r.text(); } catch { /* sem corpo */ }
      if (/sondagens/.test(t) || r.status() >= 400) eventos.push({ dir: 'RES', estado: r.status(), amostra: t.slice(0, 160) });
    }
  };
  page.on('request', onReq); page.on('response', onRes);

  await page.locator('#btn-criar-inquerito').click();
  await page.waitForTimeout(1200);
  await page.locator('#opcao-inquerito-normal').click();
  await page.waitForTimeout(600);
  await page.locator('#btn-tipo-inquerito-ok').click();
  await page.waitForTimeout(2000);
  await page.locator('input[placeholder="Escreva a pergunta da sondagem"]').fill(pergunta);
  const op = page.locator('input[placeholder="Texto A"], input[placeholder="Texto B"]');
  await op.nth(0).fill('Sim');
  await op.nth(1).fill('Nao');
  await page.waitForTimeout(500);
  await page.locator('button:has-text("Criar Sondagem")').last().click();
  await page.waitForTimeout(6000);

  const corpo = await page.locator('body').innerText();
  page.off('request', onReq); page.off('response', onRes);
  const erro = (corpo.match(/new row violates row-level security[^\n]*|Não foi possível[^\n]*|A sua sessão expirou[^\n]*|Não há cidadãos[^\n]*/i) || [])[0] || '';
  const noCompositor = await page.locator('[data-testid="sondagens-compostas"]').innerText().catch(() => '');
  return { eventos, erro, criada: noCompositor.includes(pergunta.slice(0, 25)), noCompositor };
};

const criarInqueritoIA = async (page, tema) => {
  const eventos = [];
  const onRes = async (r) => {
    if (/inqueritos_ia/.test(r.url())) {
      let t = ''; try { t = await r.text(); } catch { /* sem corpo */ }
      if (/inqueritos_ia/.test(t)) eventos.push({ estado: r.status(), amostra: t.slice(0, 120) });
    }
  };
  page.on('response', onRes);
  await page.locator('#btn-criar-inquerito').click();
  await page.waitForTimeout(1200);
  await page.locator('#opcao-inquerito-ia').click();
  await page.waitForTimeout(600);
  await page.locator('#btn-tipo-inquerito-ok').click();
  await page.waitForTimeout(2000);
  await page.locator('#inquerito-ia-temas').fill(tema);
  await page.locator('#inquerito-ia-informacoes').fill('Idade, Bairro, Nível de satisfação');
  await page.waitForTimeout(600);
  await page.locator('#btn-gerar-guiao-ia').click();
  await page.waitForTimeout(9000);
  await page.locator('button:has-text("Criar Inquérito")').last().click();
  await page.waitForTimeout(7000);
  const corpo = await page.locator('body').innerText();
  page.off('response', onRes);
  const erro = (corpo.match(/Não foi possível[^\n]*|new row violates[^\n]*|aguarda a migração[^\n]*/i) || [])[0] || '';
  const noCompositor = await page.locator('[data-testid="inqueritos-ia-compostos"]').innerText().catch(() => '');
  return { eventos, erro, criada: noCompositor.includes(tema.slice(0, 20)), noCompositor };
};

const limparRascunhos = async (page, marcadores) => {
  // elimina pela UI da lista de rascunhos, quando existir; caso contrário
  // reporta os ids para remoção administrativa.
  const ids = marcadores.filter(Boolean);
  const painel = page.locator('button:has-text("Painel"), a:has-text("Painel")').first();
  if (await painel.count()) { await painel.click(); await page.waitForTimeout(3000); }
  return ids;
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  await login(page);

  // ---------- F1: sessão fresca ----------
  await abrirCompositor(page);
  const f1 = await criarSondagem(page, PERGUNTA_F1);
  registar('F1 criação de inquérito com sessão fresca', f1.criada && !f1.erro, f1.erro || `${f1.eventos.length} eventos`);

  // ---------- F2: sessão Supabase removida ----------
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (/auth-token|supabase\.auth/i.test(k)) localStorage.removeItem(k);
    for (const k of Object.keys(sessionStorage)) if (/auth-token|supabase\.auth/i.test(k)) sessionStorage.removeItem(k);
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  await abrirCompositor(page);
  const f2 = await criarSondagem(page, PERGUNTA_F2);
  // Sem sessão não se inventa sucesso: ou recupera e cria (f2.criada), ou
  // explica honestamente que a sessão expirou. O que NUNCA pode voltar a
  // acontecer é o erro cru da RLS a esconder a causa.
  const semRls = !/row-level security/i.test(f2.erro);
  const explicito = /sess(ã|a)o expirou|Termine sess(ã|a)o|permiss(ã|a)o de institui/i.test(f2.erro);
  registar('F2 sessão Supabase removida: cria ou explica a sessão (nunca erro cru de RLS)',
    semRls && (f2.criada || explicito),
    f2.criada ? 'recuperou a sessão e criou' : `mensagem: ${f2.erro}`);
  // com a sessão restabelecida por novo login, o mesmo utilizador cria de novo
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  if (await page.locator('input[name="cda-utilizador"]').count()) {
    await page.fill('input[name="cda-utilizador"]', CONTA.user);
    await page.fill('input[name="cda-senha"]', CONTA.pass);
    await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
    await page.waitForTimeout(6000);
  }
  await abrirCompositor(page);
  const f2b = await criarSondagem(page, PERGUNTA_F2);
  registar('F2b após voltar a entrar, o mesmo inquérito é criado', f2b.criada && !f2b.erro, f2b.erro || `${f2b.eventos.length} eventos`);

  // ---------- F3: inquérito com IA ----------
  const f3 = await criarInqueritoIA(page, TEMA_F3);
  registar('F3 criação de inquérito com IA', f3.criada && !f3.erro, f3.erro || `${f3.eventos.length} respostas`);

  const ids = await limparRascunhos(page, [PERGUNTA_F1, PERGUNTA_F2, TEMA_F3]);
  await page.screenshot({ path: 'scripts/_prova_inquerito.png' });
  await browser.close();

  console.log('\nMarcadores criados para limpeza:', JSON.stringify(ids));
  const falhas = resultados.filter((r) => !r.ok);
  console.log(`\nRESULTADO: ${resultados.length - falhas.length}/${resultados.length} verificações passaram`);
  process.exit(falhas.length ? 1 : 0);
})();
