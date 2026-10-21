/**
 * T57 — Páginas Login / Registo / Redefinir Senha: contentores principais com
 *       altura −10% (min-h 615→554; painel interno 440→396) mantendo harmonia:
 *       sem overflow interno em nenhum estado, painel esquerdo e formulário com
 *       a mesma altura, escuro e mobile intactos.
 * Uso: node testes/e2e_t57_altura_login_registo_senha.mjs   (BASE=…)
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const ALVO = Math.round(554 * 0.968); // min-h × zoom do ecrã de autenticação
let total = 0, okN = 0; const falhas = []; const erros = [];
const ok = (c, m) => { total++; if (c) { okN++; console.log(`✔ ${m}`); } else { falhas.push(m); console.log(`✘ ${m}`); } };

const medir = (page) => page.evaluate(() => {
  const f = document.getElementById('cda-login-form-container'); const esq = f?.previousElementSibling;
  const h = (e) => (e ? Math.round(e.getBoundingClientRect().height) : 0);
  const overflow = [...f.querySelectorAll('*')].some((e) => {
    const cs = getComputedStyle(e);
    return cs.overflowY === 'visible' && e.clientHeight > 0 && e.scrollHeight > e.clientHeight + 2 && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName);
  });
  return { form: h(f), esq: h(esq), minH: f.className.match(/min-h-\[(\d+)px\]/)?.[1], overflow, esqVisivel: !!esq && getComputedStyle(esq).display !== 'none' };
});
const goLogin = async (page, portal = '/') => {
  await page.goto(`${BASE}${portal}#/login`, { waitUntil: 'domcontentloaded' });
  await page.reload(); await page.waitForSelector('#cda-login-form-container', { timeout: 30000 }); await page.waitForTimeout(1500);
};
const verificar = async (page, nome, { esperarAlvo = true } = {}) => {
  await page.waitForTimeout(1500); // deixa terminar a animação de entrada (framer-motion)
  const m = await medir(page);
  if (esperarAlvo) ok(m.minH === '554' && Math.abs(m.form - ALVO) <= 2, `${nome}: contentor a 554px (−10% de 615) → ${m.form}px renderizados`);
  if (m.esqVisivel) ok(m.form === m.esq, `${nome}: painel esquerdo (${m.esq}) e formulário (${m.form}) com a mesma altura`);
  ok(!m.overflow, `${nome}: sem overflow interno`);
  await page.screenshot({ path: `testes/evidencias/t57_${nome}.png` });
  return m;
};

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage(); page.on('pageerror', (e) => erros.push(String(e?.message || e)));

  // Login
  await goLogin(page); await verificar(page, 'login');
  // Redefinir Senha
  await page.getByRole('button', { name: /Esqueci Senha/i }).first().click(); await verificar(page, 'senha');
  ok((await page.getByText(/Recuperar Senha/i).count()) > 0, 'senha: título «Recuperar Senha» visível');
  // Registo — passo 1 e passo 2
  await goLogin(page);
  await page.getByRole('button', { name: /^Registar$/i }).first().click(); await verificar(page, 'registo_passo1');
  await page.fill('input[placeholder*="Manuel"]', 'Teste Altura T57');
  await page.fill('input[placeholder*="netangola"]', 'teste.t57@example.com');
  const pw = page.locator('input[placeholder="••••••••••••"]'); await pw.nth(0).fill('Teste12345'); await pw.nth(1).fill('Teste12345');
  await page.getByRole('button', { name: /Continuar/i }).first().click(); await verificar(page, 'registo_passo2');
  ok((await page.getByText(/Submissão Oficial de Identidade/i).count()) > 0, 'registo: passo 2 «Identidade» visível');
  // Login facial mantém a sua altura própria (485) — inalterado
  await goLogin(page); await page.getByRole('button', { name: /Login Facial/i }).first().click(); await page.waitForTimeout(700);
  const mf = await medir(page); ok(mf.minH === '485' && Math.abs(mf.form - Math.round(485 * 0.968)) <= 2, `facial: altura própria inalterada (${mf.form}px, min-h ${mf.minH})`);
  // Escuro
  await goLogin(page); await page.evaluate(() => document.documentElement.classList.add('dark')); await verificar(page, 'login_escuro');
  // Registo de instituição e admin: cresce com o conteúdo (min-h é mínimo) — sem overflow
  await goLogin(page, '/institucional'); await page.getByRole('button', { name: /^Registar$/i }).first().click();
  const mi = await verificar(page, 'registo_instituicao', { esperarAlvo: false }); ok(mi.form >= ALVO, `instituição: formulário cresce com o conteúdo (${mi.form}px ≥ ${ALVO})`);
  await goLogin(page, '/admin'); await page.getByRole('button', { name: /Registar/i }).first().click();
  const ma = await verificar(page, 'registo_admin', { esperarAlvo: false }); ok(ma.form >= ALVO, `admin: formulário cresce com o conteúdo (${ma.form}px ≥ ${ALVO})`);
  // Mobile
  await page.setViewportSize({ width: 390, height: 844 }); await goLogin(page); await verificar(page, 'login_mobile');
  await page.getByRole('button', { name: /^Registar$/i }).first().click(); await verificar(page, 'registo_mobile', { esperarAlvo: false });
  await ctx.close();

  ok(erros.length === 0, `sem erros JS (${erros.length})`);
  if (erros.length) console.log(JSON.stringify(erros.slice(0, 5)));
} catch (e) {
  console.error('EXCEPÇÃO:', e); falhas.push(`excepção: ${e?.message || e}`); total++;
} finally { await browser.close(); }
console.log(`\nRESULTADO T57: ${okN}/${total}` + (falhas.length ? `\nFALHAS:\n - ${falhas.join('\n - ')}` : ''));
process.exit(falhas.length ? 1 : 0);
