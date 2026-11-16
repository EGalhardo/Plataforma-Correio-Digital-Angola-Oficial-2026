/**
 * CONTADORES DO CORREIO — paridade 1:1 entre o número da aba e as linhas que ela abre.
 * Entra com as contas reais e, para cada aba, compara o badge com as linhas visíveis.
 * Uso: node scripts/test_contadores_correio_playwright.cjs
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP = 'https://correio-digital-angola-oficial.vercel.app';
const CONTAS = {
  cidadao: { url: `${APP}/#/login`, user: '002399714LA030', pass: '123456789', raiz: '' },
  instituicao: { url: `${APP}/institucional#/login`, user: 'AGT-LMM-01', pass: '123456789', raiz: '/institucional' },
};

const login = async (browser, chave) => {
  const c = CONTAS[chave];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await ctx.newPage();
  await page.goto(c.url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.fill('input[name="cda-utilizador"]', c.user);
  await page.fill('input[name="cda-senha"]', c.pass);
  await page.click('button:has-text("ENTRAR NO PORTAL")');
  await page.waitForTimeout(5000);
  await page.goto(`${APP}${c.raiz}#/correspondencias`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);
  return { ctx, page, ok: !/login/i.test(page.url()) };
};

const lerAbas = (page) => page.$$eval('button', (els) => {
  const out = {};
  for (const b of els) {
    const t = (b.innerText || '').replace(/\s+/g, ' ').trim();
    const m = t.match(/^(Todas|Lidas|Não Lidas|Enviadas|Arquivadas|Eliminadas)\s+(\d+)$/i);
    if (m) out[m[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '')] = Number(m[2]);
  }
  return out;
});

const contarLinhas = async (page) => page.evaluate(() => {
  // linhas de correspondência (excluir cabeçalho)
  const linhas = [...document.querySelectorAll('table tbody tr')];
  const uteis = linhas.filter((tr) => (tr.innerText || '').trim().length > 20);
  return uteis.length;
});

const corpo = (page) => page.evaluate(() => document.body.innerText);
const totalDeclarado = (page) => page.evaluate(() => {
  const t = document.body.innerText.match(/(\d+)\s+de\s+(\d+)\s+correspond/i) || document.body.innerText.match(/(\d+)\s+de\s+(\d+)\s+mensage/i);
  return t ? Number(t[2]) : null;
});

async function main() {
  const browser = await chromium.launch();
  const out = { contas: {} };
  try {
    for (const chave of Object.keys(CONTAS)) {
      const s = await login(browser, chave);
      const r = { login: s.ok, abas: {}, divergencias: [] };
      try {
        if (!s.ok) throw new Error('login falhou');
        const abas = await lerAbas(s.page);
        r.abas = abas;
        r.cabecalho_por_ler = (await corpo(s.page)).match(/(\d+)\s*MENSAGENS POR LER/i)?.[1] ?? null;

        const nomes = { todas: 'Todas', lidas: 'Lidas', naolidas: 'Não Lidas', enviadas: 'Enviadas', arquivadas: 'Arquivadas', eliminadas: 'Eliminadas' };
        for (const [id, label] of Object.entries(nomes)) {
          // clicar o botão cujo texto é EXACTAMENTE «Label N»
          const alvo = await s.page.evaluateHandle((lab) => {
            const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();
            return [...document.querySelectorAll('button')].find((b) => {
              const t = norm(b.innerText);
              return new RegExp('^' + lab + '\\s+\\d+$', 'i').test(t);
            }) || null;
          }, label);
          const el = alvo.asElement();
          if (!el) continue;
          await el.click({ force: true });
          await s.page.waitForTimeout(2500);
          const linhas = await contarLinhas(s.page);
          const badge = abas[id] ?? null;
          r[id] = { badge, linhas_visiveis: linhas, total_declarado: await totalDeclarado(s.page) };
          if (badge !== null && linhas !== badge) r.divergencias.push(`${label}: badge ${badge} vs ${linhas} linhas`);
        }

        // coerência aritmética
        if (r.todas !== undefined) {
          const soma = (r.lidas?.badge ?? 0) + (r.naolidas?.badge ?? 0);
          r.lidas_mais_naolidas = { soma, todas: r.todas.badge, coincide: soma === r.todas.badge };
          if (!r.lidas_mais_naolidas.coincide) r.divergencias.push(`Lidas+Não Lidas ${soma} ≠ Todas ${r.todas.badge}`);
          const cab = Number(r.cabecalho_por_ler);
          r.cabecalho_coerente = Number.isFinite(cab) ? cab === r.naolidas?.badge : null;
          if (r.cabecalho_coerente === false) r.divergencias.push(`cabeçalho ${cab} ≠ aba Não Lidas ${r.naolidas?.badge}`);
        }
        r.aprovado = s.ok && r.divergencias.length === 0;
      } catch (e) {
        r.erro = String(e.message || e).slice(0, 200);
        r.aprovado = false;
      } finally {
        await s.ctx.close().catch(() => {});
      }
      out.contas[chave] = r;
    }
    out.aprovado = Object.values(out.contas).every((c) => c.aprovado === true);
  } finally {
    await browser.close();
    console.log(JSON.stringify(out, null, 1));
    process.exitCode = out.aprovado ? 0 : 1;
  }
}
main();
