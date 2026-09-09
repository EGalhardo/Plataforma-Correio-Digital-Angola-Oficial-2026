/**
 * Auditoria do selector de língua (área central de conteúdo).
 * Login real (cidadão) → captura texto visível por página em PT →
 * muda para língua nacional → recaptura → mede taxa de tradução.
 * Só leitura: não envia mensagens nem altera dados.
 *
 * Uso: node testes/e2e_selector_lingua_audit.mjs [lang=um] [perfil=cidadao|instituicao|admin]
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const LANG = process.argv[2] || 'um';
const PERFIL = process.argv[3] || 'cidadao';
const OUT = process.env.SHOTS_DIR || '/home/user/cda_test/lingua';
mkdirSync(OUT, { recursive: true });

const CONTAS = {
  cidadao:     { tab: 'Cidadão',     id: '009874562LA041', pass: '123456',   tabs: ['home', 'correspondencias', 'contatos', 'perfil'] },
  instituicao: { tab: 'Instituição', id: 'AGT-9921-SR',    pass: '000000',   tabs: ['home', 'correspondencias', 'gov-contatos', 'inst-qrcode', 'inst-ai-assistant', 'perfil'] },
  admin:       { tab: 'Admin',       id: 'ADM-8812-OP',    pass: 'GALHARDO', tabs: ['gov-dashboard', 'gov-interoperabilidade', 'gov-correspondencias', 'gov-contatos'] },
};
const cfg = CONTAS[PERFIL];
const LABEL = { um: 'Umbundu', ki: 'Kimbundu', kk: 'Kikongo', ch: 'Chokwe', ng: 'Ngangela', kw: 'Kwanyama', nh: 'Nhaneca', fi: 'Fiote' }[LANG];

// Texto visível da área central (main), excluindo header/sidebar/nav
async function textoCentral(page) {
  return page.evaluate(() => {
    const root = document.querySelector('main') || document.body;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        const el = n.parentElement;
        if (!el) return NodeFilter.FILTER_REJECT;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) return NodeFilter.FILTER_REJECT;
        const t = n.textContent.trim();
        // ignorar números, datas, códigos, emails, 1 carácter
        if (t.length < 2 || /^[\d\s.,:/%+()-]+$/.test(t) || /@/.test(t) || /^[A-Z0-9-]{6,}$/.test(t)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const out = [];
    let n; while ((n = walker.nextNode())) out.push(n.textContent.trim());
    return out;
  });
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'pt-AO' });
const page = await ctx.newPage();
const consoleErrs = [];
const translateReqs = [];   // { t, n } — pedidos reais ao /api/translate
page.on('request', (r) => { if (r.url().includes('/api/translate')) { try { translateReqs.push({ t: Date.now(), n: (JSON.parse(r.postData() || '{}').texts || []).length }); } catch { translateReqs.push({ t: Date.now(), n: -1 }); } } });
page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => consoleErrs.push('PAGEERROR ' + e.message.slice(0, 200)));

// ---- Login real -----------------------------------------------------------
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => { localStorage.removeItem('cda_current_language'); localStorage.removeItem('cda_dynamic_translation_cache'); });
await page.reload({ waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: cfg.tab, exact: true }).first().click().catch(() => {});
await page.getByPlaceholder(/LA041|AGT-9921-SR|ADM-8812-OP/).fill(cfg.id);
await page.getByPlaceholder('••••••••••••').fill(cfg.pass);
await page.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click();
await page.waitForSelector('main', { timeout: 30000 });
await page.waitForTimeout(2500);
console.log(`✔ login ${PERFIL} (${cfg.id})`);

// navegar por tab id (a app usa estado interno; usar os botões da sidebar)
async function irPara(tab) {
  const btn = page.locator(`[data-tab="${tab}"], #nav-${tab}, button[id*="${tab}"]`).first();
  if (await btn.count()) { await btn.click(); }
  else {
    // fallback: sidebar por texto conhecido
    const nomes = { home: /Painel/i, correspondencias: /Correio|Correspond/i, contatos: /Contactos/i, perfil: /Perfil/i, 'gov-contatos': /Equipa|Cidadãos/i, 'inst-qrcode': /QR/i, 'inst-ai-assistant': /IA/i, 'gov-dashboard': /Painel/i, 'gov-interoperabilidade': /Instituições/i, 'gov-correspondencias': /Correspond/i };
    await page.locator('aside, nav').getByRole('button', { name: nomes[tab] }).first().click().catch(() => {});
  }
  await page.waitForTimeout(1200);
}

// ---- Captura PT -----------------------------------------------------------
const pt = {};
for (const tab of cfg.tabs) { await irPara(tab); pt[tab] = await textoCentral(page); }
console.log('✔ PT capturado:', Object.fromEntries(Object.entries(pt).map(([k, v]) => [k, v.length])));

// ---- Mudar língua via selector real ---------------------------------------
await irPara(cfg.tabs[0]);
const t0 = Date.now();
await page.locator('button:has(svg.lucide-globe):visible').first().click();
await page.getByRole('button', { name: new RegExp(LABEL, 'i') }).first().click();
// esperar até 6 s de silêncio no /api/translate (máx. 120 s)
let esperou = 0;
while (esperou < 120000) {
  await page.waitForTimeout(1000); esperou += 1000;
  const ultimo = translateReqs.length ? translateReqs[translateReqs.length - 1].t : t0;
  if (esperou > 3000 && Date.now() - ultimo > 6000) break;
}
const nReq = translateReqs.length;
const nTextos = translateReqs.reduce((a, r) => a + Math.max(r.n, 0), 0);
const tTrad = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`✔ língua mudada para ${LABEL}: ${nReq} pedido(s) /api/translate (${nTextos} textos), ${tTrad}s`);

// ---- Captura traduzida + métricas -----------------------------------------
const rel = { lang: LANG, perfil: PERFIL, tempo_s: tTrad, pedidos_translate: nReq, textos_enviados: nTextos, paginas: {}, erros_console: consoleErrs };
for (const tab of cfg.tabs) {
  await irPara(tab);
  const tr = await textoCentral(page);
  const setPT = new Set(pt[tab]);
  const iguais = tr.filter((s) => setPT.has(s));
  const taxa = tr.length ? Math.round(((tr.length - iguais.length) / tr.length) * 100) : 0;
  rel.paginas[tab] = { total: tr.length, traduzidos: tr.length - iguais.length, taxa_pct: taxa, nao_traduzidos: [...new Set(iguais)].slice(0, 40) };
  await page.screenshot({ path: `${OUT}/${PERFIL}_${LANG}_${tab}.png`, fullPage: false });
  console.log(`  ${tab.padEnd(22)} ${String(taxa).padStart(3)}% traduzido (${tr.length - iguais.length}/${tr.length})`);
}
writeFileSync(`${OUT}/relatorio_${PERFIL}_${LANG}.json`, JSON.stringify(rel, null, 2));
console.log('erros consola:', consoleErrs.length);
await browser.close();
