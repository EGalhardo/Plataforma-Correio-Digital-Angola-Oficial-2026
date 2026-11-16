/**
 * ECRÃS BRANCOS AO MUDAR DE PÁGINA — reprodução e prova.
 *
 * Percorre todas as páginas das três contas reais, navegando pela própria UI
 * (cliques no menu), e detecta:
 *   · ecrã branco (nenhum texto visível além do esqueleto da app);
 *   · erros de JavaScript;
 *   · ciclos de carregamento infinitos («A carregar…» que nunca sai).
 *
 * Uso: node scripts/test_paginas_brancas_playwright.cjs [--ciclos 2]
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP = 'https://correio-digital-angola-oficial.vercel.app';
const CONTAS = {
  cidadao: { url: `${APP}/#/login`, user: '002399714LA030', pass: '123456789', raiz: '' },
  instituicao: { url: `${APP}/institucional#/login`, user: 'AGT-LMM-01', pass: '123456789', raiz: '/institucional' },
  admin: { url: `${APP}/admin#/login`, user: 'ADMIN-0001', pass: '987654321', raiz: '/admin' },
};
const ART = path.join(__dirname, '..', 'test-artifacts');
fs.mkdirSync(ART, { recursive: true });
const CICLOS = Number((process.argv.find((a) => a.startsWith('--ciclos')) || '').split('=')[1] || 2);

// Texto que uma página VAZIA ainda mostra (esqueleto da app) — não conta como conteúdo.
const ESQUELETO = /^(painel|correio|contactos|perfil|sair do canal|ao|online|início|inicio|equipa|qr code|ia|instituições|correspondências|cidadãos|relatórios|auditoria|administração central|área do cidadão|área institucional)$/i;

const login = async (browser, chave) => {
  const c = CONTAS[chave];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e.message || e).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text().slice(0, 160)); });
  await page.goto(c.url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.fill('input[name="cda-utilizador"]', c.user);
  await page.fill('input[name="cda-senha"]', c.pass);
  await page.click('button:has-text("ENTRAR NO PORTAL")');
  await page.waitForTimeout(5500);
  return { ctx, page, erros, ok: !/login/i.test(page.url()), chave, raiz: c.raiz };
};

/** Um ecrã está branco quando não há texto útil nem campos nem listas. */
const diagnosticar = (page) => page.evaluate((esqueletoFonte) => {
  const ESQ = new RegExp(esqueletoFonte, 'i');
  const visivel = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05;
  };
  const body = document.body;
  const texto = (body.innerText || '').replace(/\s+/g, ' ').trim();
  const palavras = texto.split(' ').filter((p) => p.length > 2 && !ESQ.test(p.replace(/[^\wÀ-ÿ]/g, '')));
  const campos = [...document.querySelectorAll('input,textarea,select,table,button[data-testid]')].filter(visivel);
  const cards = [...document.querySelectorAll('main *, [class*="rounded"]')].filter((el) => visivel(el) && (el.innerText || '').trim().length > 20);
  const aCarregar = /a carregar|carregando|loading/i.test(texto);
  return {
    texto_len: texto.length,
    palavras_uteis: palavras.length,
    campos_visiveis: campos.length,
    cards_com_texto: cards.length,
    a_carregar: aCarregar,
    amostra: texto.slice(0, 120),
  };
}, ESQUELETO.source);

const semConteudo = (d) => d.palavras_uteis < 8 && d.campos_visiveis === 0 && d.cards_com_texto === 0;

/** Menu principal: os botões que levam a páginas. */
const menus = (page) => page.$$eval('button, a', (els) => {
  const vistos = new Set();
  const out = [];
  for (const el of els) {
    const t = (el.innerText || '').replace(/\s+/g, ' ').trim().split('\n')[0];
    if (!t || t.length > 28) continue;
    const low = t.toLowerCase();
    if (/sair|logout|ao$|online|fechar|cancelar|eliminar|apagar|enviar|publicar|confirmar|guardar/i.test(low)) continue; // destrutivos
    if (/^\d+$/.test(t)) continue;
    if (vistos.has(low)) continue;
    vistos.add(low);
    out.push(t);
  }
  return out;
});

async function percorrer(s, resultados) {
  const p = s.page;
  const listaMenu = await menus(p);
  const alvos = ['Painel', 'Correio', 'Contactos', 'Perfil', ...listaMenu].filter((v, i, a) => a.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i);
  for (const rotulo of alvos) {
    const antes = p.url();
    const errosAntes = s.erros.length;
    let clicou = false;
    try {
      const btn = p.locator(`button:has-text("${rotulo}")`).first();
      if (await btn.count() && await btn.isVisible()) { await btn.click({ timeout: 8000 }); clicou = true; }
      else {
        const link = p.locator(`a:has-text("${rotulo}")`).first();
        if (await link.count() && await link.isVisible()) { await link.click({ timeout: 8000 }); clicou = true; }
      }
    } catch { clicou = false; }
    if (!clicou) continue;
    // esperar o render estabilizar
    await p.waitForTimeout(3500);
    const d1 = await diagnosticar(p);
    if (semConteudo(d1)) {
      // dar uma segunda oportunidade (carregamentos lentos)
      await p.waitForTimeout(4000);
    }
    const d = await diagnosticar(p);
    const novosErros = s.erros.slice(errosAntes);
    const branco = semConteudo(d);
    const entrada = {
      rota: rotulo,
      url: p.url().replace(APP, ''),
      branco,
      em_carregamento: d.a_carregar,
      palavras: d.palavras_uteis,
      campos: d.campos_visiveis,
      amostra: d.amostra,
      erros: novosErros.slice(0, 3),
    };
    resultados.push(entrada);
    if (branco) {
      await p.screenshot({ path: path.join(ART, `branco-${s.chave}-${rotulo.replace(/\W+/g, '_')}.png`) }).catch(() => {});
    }
    // voltar ao início para o próximo clique
    await p.goto(`${APP}${s.raiz}#/home`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await p.waitForTimeout(2200);
  }
}

(async () => {
  const browser = await chromium.launch();
  const resultado = { ciclos: CICLOS, contas: {}, paginas: [] };
  try {
    for (const chave of Object.keys(CONTAS)) {
      const s = await login(browser, chave);
      const info = { login: s.ok, ciclos: [] };
      try {
        if (!s.ok) throw new Error('login falhou');
        for (let c = 1; c <= CICLOS; c++) {
          const antes = resultado.paginas.length;
          await percorrer(s, resultado.paginas);
          const desteCiclo = resultado.paginas.slice(antes);
          info.ciclos.push({ ciclo: c, paginas: desteCiclo.length, brancas: desteCiclo.filter((x) => x.branco).map((x) => x.rota) });
        }
        info.erros_js = [...new Set(s.erros)].slice(0, 10);
      } catch (e) {
        info.erro = String(e.message || e).slice(0, 200);
      } finally {
        await s.ctx.close().catch(() => {});
      }
      resultado.contas[chave] = info;
    }
  } finally {
    await browser.close();
  }
  const brancas = resultado.paginas.filter((x) => x.branco);
  resultado.total_paginas = resultado.paginas.length;
  resultado.total_brancas = brancas.length;
  resultado.aprovado = brancas.length === 0;
  console.log(JSON.stringify(resultado, null, 1));
  process.exitCode = resultado.aprovado ? 0 : 1;
})();
