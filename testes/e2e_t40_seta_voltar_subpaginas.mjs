/**
 * T40 — Seta de voltar (<BotaoVoltar />) em TODAS as subpáginas, na parte
 * superior da área central de conteúdo, com regresso à página ANTERIOR.
 *
 * Cobre os três portais (contas demo, sem IA):
 *  · presença da seta em cada subpágina (não no Painel);
 *  · a seta está na área central (dentro de [data-cda-scroll]) e no topo;
 *  · clicar volta à página de onde se veio (pilha), não a um destino fixo;
 *  · sem histórico (deep-link directo) volta ao Painel do portal;
 *  · detalhe de mensagem → volta ao Correio; detalhe de documento → Carteira;
 *  · modo escuro: botão com a paleta escura;
 *  · sem erros JS.
 *
 * Uso: node testes/e2e_t40_seta_voltar_subpaginas.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const CONTAS = {
  cidadao: { path: '/', user: '009874562LA041', pass: '123456', painel: 'home' },
  instituicao: { path: '/institucional', user: 'AGT-9921-SR', pass: '000000', painel: 'home' },
  admin: { path: '/admin', user: 'ADMIN-0001', pass: 'GALHARDO', painel: 'gov-dashboard' },
};
// Subpáginas por portal (hash → deve ter seta). O Painel NÃO deve ter.
const SUBPAGINAS = {
  cidadao: ['correspondencias', 'documentos', 'qr-code', 'pasta-digital', 'historico', 'notificacoes', 'contatos', 'perfil', 'pagamentos', 'solicitar-documento', 'video-atendimento', 'directorio-orgaos'],
  instituicao: ['correspondencias', 'gov-contatos', 'inst-qrcode', 'inst-ai-assistant', 'perfil', 'inst-pagamentos', 'sondagens', 'historico', 'notificacoes', 'documentos', 'video-atendimento'],
  admin: ['gov-interoperabilidade', 'gov-correspondencias', 'gov-contatos', 'gov-trabalhadores', 'gov-relatorio', 'gov-ia', 'gov-seguranca', 'gov-perfil', 'gov-emissao', 'historico', 'notificacoes'],
};

let total = 0, okN = 0;
const falhas = [];
const ok = (cond, msg) => { total++; if (cond) { okN++; console.log(`✔ ${msg}`); } else { falhas.push(msg); console.log(`✘ ${msg}`); } };

const login = async (page, c) => {
  await page.goto(`${BASE}${c.path}`); await page.waitForTimeout(2500);
  await page.locator('input[name="cda-utilizador"]').fill(c.user);
  await page.locator('input[name="cda-senha"]').fill(c.pass);
  await page.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click();
  await page.waitForTimeout(4500);
  return !/login/.test(page.url());
};
const irHash = async (page, h) => { await page.evaluate((h) => { window.location.hash = `#/${h}`; }, h); await page.waitForTimeout(1800); };
const hashActual = (page) => page.evaluate(() => window.location.hash.replace(/^#\//, ''));
const setaVisivel = async (page) => {
  const s = page.locator('[data-cda-scroll] [data-cda-voltar]').first();
  if (!(await s.count())) return null;
  if (!(await s.isVisible())) return null;
  return s;
};
const infoSeta = async (page) => {
  const s = await setaVisivel(page);
  if (!s) return null;
  return s.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const area = el.closest('[data-cda-scroll]').getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { top: r.top - area.top, left: r.left - area.left, w: r.width, h: r.height, radius: cs.borderRadius, bg: cs.backgroundColor, color: cs.color, title: el.getAttribute('title') };
  });
};

const browser = await chromium.launch();
try {
  for (const [portal, conta] of Object.entries(CONTAS)) {
    console.log(`\n=== ${portal.toUpperCase()} ===`);
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(String(e?.message || e)));
    ok(await login(page, conta), `${portal}: login`);

    // Painel: sem seta
    await irHash(page, conta.painel);
    ok(!(await setaVisivel(page)), `${portal}: Painel sem seta de voltar`);

    // Cada subpágina: seta presente, no topo da área central, circular
    let semSeta = [];
    let foraTopo = [];
    for (const sp of SUBPAGINAS[portal]) {
      await irHash(page, sp);
      const info = await infoSeta(page);
      if (!info) { semSeta.push(sp); continue; }
      if (info.top > 260 || info.left < 0) foraTopo.push(`${sp}(top=${Math.round(info.top)})`);
    }
    ok(semSeta.length === 0, `${portal}: seta presente em todas as subpáginas ${semSeta.length ? '— em falta: ' + semSeta.join(', ') : `(${SUBPAGINAS[portal].length})`}`);
    ok(foraTopo.length === 0, `${portal}: seta no topo da área central ${foraTopo.length ? '— fora: ' + foraTopo.join(', ') : ''}`);

    // Pilha: Painel → A → B → seta → A → seta → Painel
    const [A, B] = SUBPAGINAS[portal];
    await irHash(page, conta.painel);
    await irHash(page, A);
    await irHash(page, B);
    await (await setaVisivel(page)).click(); await page.waitForTimeout(1500);
    ok((await hashActual(page)) === A, `${portal}: seta em «${B}» volta a «${A}» (página anterior)`);
    await (await setaVisivel(page)).click(); await page.waitForTimeout(1500);
    ok((await hashActual(page)) === conta.painel, `${portal}: seta em «${A}» volta ao Painel`);

    // Sem histórico (nova sessão de navegação): deep-link directo → Painel
    const page2 = await ctx.newPage();
    await page2.goto(`${BASE}${conta.path}#/${B}`); await page2.waitForTimeout(4000);
    const s2 = await setaVisivel(page2);
    if (s2) { await s2.click(); await page2.waitForTimeout(1500); }
    ok(!!s2 && (await hashActual(page2)) === conta.painel, `${portal}: deep-link «${B}» sem histórico → seta volta ao Painel`);
    await page2.close();

    // Modo escuro: paleta escura no botão
    await irHash(page, A);
    const toggle = page.getByRole('button', { name: /Modo escuro/i }).first();
    if (await toggle.count()) {
      await toggle.click(); await page.waitForTimeout(800);
      const info = await infoSeta(page);
      ok(!!info && /rgb\(15, 26, 51\)/.test(info.bg) && /rgb\(157, 184, 255\)/.test(info.color), `${portal}: modo escuro — botão com paleta escura (${info?.bg} / ${info?.color})`);
      await page.getByRole('button', { name: /Modo claro/i }).first().click(); await page.waitForTimeout(500);
    } else {
      ok(true, `${portal}: (sem toggle de tema visível — verificação de modo escuro ignorada)`);
    }

    // Detalhe de mensagem (cidadão/instituição): abrir e voltar → Correio
    if (portal !== 'admin') {
      await irHash(page, conta.painel);
      await irHash(page, 'correspondencias');
      let aberto = false;
      for (const sep of [/^Não lidas/i, /^Lidas/i, /^Enviadas/i]) {
        const b = page.getByRole('button', { name: sep }).first();
        if (await b.count()) { await b.click(); await page.waitForTimeout(1200); }
        const abrir = page.getByRole('button', { name: /^(Abrir|Analisar)$/i }).first();
        if (await abrir.count() && await abrir.isVisible()) { await abrir.click(); await page.waitForTimeout(2000); aberto = true; break; }
      }
      if (aberto) {
        const s = await setaVisivel(page);
        ok(!!s, `${portal}: detalhe de mensagem tem seta no topo`);
        if (s) { await s.click(); await page.waitForTimeout(1500); }
        ok((await hashActual(page)) === 'correspondencias', `${portal}: seta no detalhe volta ao Correio`);
      } else {
        ok(true, `${portal}: (sem mensagens para abrir — detalhe ignorado)`);
      }
    }

    // Cidadão: documento da carteira → seta volta à Carteira
    if (portal === 'cidadao') {
      await irHash(page, 'qr-code');
      const verDoc = page.getByRole('button', { name: /Ver|Abrir|Visualizar/i }).first();
      if (await verDoc.count() && await verDoc.isVisible()) {
        await verDoc.click(); await page.waitForTimeout(1500);
        if ((await hashActual(page)) === 'documento') {
          const s = await setaVisivel(page);
          if (s) { await s.click(); await page.waitForTimeout(1500); }
          ok(!!s && (await hashActual(page)) === 'qr-code', `${portal}: detalhe de documento → seta volta à Carteira`);
        }
      }
    }

    ok(erros.length === 0, `${portal}: sem erros JS ${erros.length ? '— ' + erros.slice(0, 2).join(' | ') : ''}`);
    await page.screenshot({ path: `testes/evidencias/t40_seta_voltar_${portal}.png` });
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(`\n=== RESULTADO: ${okN}/${total} verificações OK ===`);
if (falhas.length) { console.log('Falhas:\n - ' + falhas.join('\n - ')); process.exit(1); }
