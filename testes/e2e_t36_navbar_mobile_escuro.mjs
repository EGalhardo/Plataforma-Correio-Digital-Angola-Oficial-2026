// E2E — Tarefa 36 (2026-09-11): navbar mobile (barra inferior) no MODO ESCURO
// com as mesmas cores do AppBar mobile, nas 3 áreas (cidadão/instituição/admin).
// Contas demo locais. Uso: node testes/e2e_t36_navbar_mobile_escuro.mjs
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:3000';
const CONTAS = [
  { area: 'cidadão', path: '/', user: '009874562LA041', pass: '123456' },
  { area: 'instituição', path: '/institucional', user: 'AGT-9921-SR', pass: '000000' },
  { area: 'admin', path: '/admin', user: 'ADMIN-0001', pass: 'GALHARDO' },
];
const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(`${c ? '✔' : '✘'} ${n}${x ? ' — ' + x : ''}`); };
const browser = await chromium.launch();
for (const c of CONTAS) {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await page.goto(`${BASE}${c.path}`); await page.waitForTimeout(2500);
  await page.locator('input[name="cda-utilizador"]').fill(c.user);
  await page.locator('input[name="cda-senha"]').fill(c.pass);
  await page.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click();
  await page.waitForTimeout(4500);
  const nav = page.locator('nav.cda-mobile-nav');
  const header = page.locator('header.md\\:hidden');
  const cores = async () => ({
    nav: await nav.evaluate((el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, border: s.borderTopColor, shadow: s.boxShadow }; }),
    header: await header.evaluate((el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, border: s.borderBottomColor }; }),
    activo: await nav.locator('button[data-ativo]').first().evaluate((el) => getComputedStyle(el).color).catch(() => ''),
    inactivo: await nav.locator('button:not([data-ativo])').first().evaluate((el) => getComputedStyle(el).color).catch(() => ''),
  });
  const claro = await cores();
  ok(`[${c.area}] modo claro: navbar branco como o appbar`, /rgba?\(255, 255, 255|oklab\(0\.9999/.test(claro.nav.bg) && /rgb\(255, 255, 255\)/.test(claro.header.bg), `${claro.nav.bg} / ${claro.header.bg}`);
  // activar modo escuro pelo botão do appbar (o mesmo que o utilizador usa)
  await page.getByRole('button', { name: /^Modo escuro$/ }).first().click(); await page.waitForTimeout(800);
  const escuro = await cores();
  const temDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  ok(`[${c.area}] modo escuro activado`, temDark);
  ok(`[${c.area}] navbar com fundo escuro rgb(9,17,36) = appbar`, /rgba?\(9, 17, 36/.test(escuro.nav.bg) && /rgba?\(9, 17, 36/.test(escuro.header.bg), `nav ${escuro.nav.bg} / appbar ${escuro.header.bg}`);
  ok(`[${c.area}] linha do navbar rgb(38,52,85) = appbar`, escuro.nav.border === 'rgb(38, 52, 85)' && escuro.header.border === 'rgb(38, 52, 85)', `nav ${escuro.nav.border} / appbar ${escuro.header.border}`);
  ok(`[${c.area}] sem sombra no escuro`, escuro.nav.shadow === 'none', escuro.nav.shadow);
  ok(`[${c.area}] item activo azul claro, inactivos cinza claro`, escuro.activo === 'rgb(157, 184, 255)' && escuro.inactivo === 'rgb(148, 163, 184)', `${escuro.activo} / ${escuro.inactivo}`);
  await page.screenshot({ path: `testes/evidencias/t36_navbar_escuro_${c.area.normalize('NFD').replace(/[^a-z]/gi, '')}.png` });
  // repor claro (preferência fica em localStorage do contexto — descartado)
  await page.getByRole('button', { name: /^Modo claro$/ }).first().click(); await page.waitForTimeout(400);
  await page.context().close();
}
await browser.close();
const f = R.filter((x) => !x).length; console.log(`\n${R.length - f}/${R.length} verificações OK`); process.exit(f ? 1 : 0);
