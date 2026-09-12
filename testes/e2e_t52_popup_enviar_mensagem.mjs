// T52 — Popup «Enviar Mensagem» (modalidade de envio) nas duas áreas.
//   Cidadão:     «Mensagem Normal» / «Denunciar»  (denúncia prefixa o assunto)
//   Instituição: «Mensagem Normal» / «Mensagem de Emergência» (layout novo)
// Uso: BASE=http://localhost:3000 node testes/e2e_t52_popup_enviar_mensagem.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const SHOT = process.env.SHOT === '1';
let total = 0, ok = 0;
const check = (nome, cond) => { total++; if (cond) { ok++; console.log(`  ✔ ${nome}`); } else console.log(`  ✘ ${nome}`); };

async function login(page, portal, user, pass) {
  await page.goto(`${BASE}${portal}#/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="cda-utilizador"]', user);
  await page.fill('input[name="cda-senha"]', pass);
  await page.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click();
  await page.waitForFunction(() => !/login/.test(location.hash), null, { timeout: 60000 });
  await page.waitForTimeout(1200);
}

async function abrirCompositor(page) {
  await page.goto(`${BASE}${page.url().includes('/institucional') ? '/institucional' : '/'}#/correspondencias`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /Nova Mensagem/i }).first().click();
  await page.waitForSelector('#btn-enviar-mensagem', { timeout: 20000 });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();

// ─── Área do Cidadão ───────────────────────────────────────────────────────
console.log('\n[Cidadão]');
await login(page, '/', '009874562LA041', '123456');
await abrirCompositor(page);
await page.fill('input[placeholder*="Código Institucional"]', 'AGT-9921-SR');
await page.fill('input[placeholder="Qual o tema da sua mensagem?"]', 'Teste T52');
await page.locator('textarea').first().fill('Conteúdo de teste do popup Enviar Mensagem (T52). Não enviar.');
await page.waitForTimeout(800);
const btnEnviar = page.locator('#btn-enviar-mensagem');
check('botão «Enviar Mensagem» activo', await btnEnviar.isEnabled());
await btnEnviar.click();
const popup = page.locator('[data-testid="popup-enviar-mensagem"]');
await popup.waitFor({ timeout: 5000 }).catch(() => {});
check('popup «Enviar Mensagem» abre', await popup.isVisible());
check('título «Enviar Mensagem»', await page.getByRole('heading', { name: /^Enviar Mensagem$/i }).first().isVisible());
check('opção «Mensagem Normal» presente', await page.locator('#btn-modal-opcao-normal').isVisible());
check('opção «Denunciar» presente', await page.locator('#btn-modal-opcao-denunciar').isVisible());
check('sem «Mensagem de Emergência» no cidadão', (await page.locator('#btn-modal-opcao-emergencia').count()) === 0);
check('etiqueta OFICIAL', await page.locator('#btn-modal-opcao-normal').getByText('Oficial', { exact: true }).isVisible());
check('botões «Fechar» e «Ok»', await page.locator('#btn-fechar-modal-tipo-envio').isVisible() && await page.locator('#btn-ok-modal-tipo-envio').isVisible());
check('«Mensagem Normal» realçada por defeito', (await page.locator('#btn-modal-opcao-normal').getAttribute('aria-pressed')) === 'true');
if (SHOT) await page.screenshot({ path: 'testes/evidencias/t52_cidadao_popup.png' });

// Fechar cancela
await page.locator('#btn-fechar-modal-tipo-envio').click();
await page.waitForTimeout(400);
check('«Fechar» fecha o popup sem avançar', (await popup.count()) === 0 && (await page.getByText('Rever antes de enviar').count()) === 0);

// Ok com a opção por defeito → revisão como Mensagem Normal
await btnEnviar.click();
await popup.waitFor();
await page.locator('#btn-ok-modal-tipo-envio').click();
await page.waitForTimeout(600);
check('«Ok» avança para «Rever antes de enviar»', await page.getByText('Rever antes de enviar').first().isVisible());
check('revisão indica «Mensagem Normal»', /Mensagem Normal/.test(await page.locator('[data-testid="rever-modalidade"]').innerText()));
check('assunto sem prefixo', (await page.inputValue('input[placeholder="Qual o tema da sua mensagem?"]')) === 'Teste T52');
await page.getByRole('button', { name: /^Voltar$/ }).click();
await page.waitForTimeout(400);

// Denunciar → prefixo + revisão «Denúncia»
await btnEnviar.click();
await popup.waitFor();
await page.locator('#btn-modal-opcao-denunciar').click();
await page.waitForTimeout(800);
check('«Denunciar» avança para revisão', await page.getByText('Rever antes de enviar').first().isVisible());
const assunto = await page.inputValue('input[placeholder="Qual o tema da sua mensagem?"]');
check('assunto prefixado com [DENÚNCIA]', assunto === '[DENÚNCIA] Teste T52');
check('revisão indica «Denúncia»', /Denúncia/.test(await page.locator('[data-testid="rever-modalidade"]').innerText()));
if (SHOT) await page.screenshot({ path: 'testes/evidencias/t52_cidadao_revisao_denuncia.png' });
await page.getByRole('button', { name: /^Voltar$/ }).click();
await page.waitForTimeout(300);

// Repetir Denunciar não duplica o prefixo
await btnEnviar.click();
await popup.waitFor();
await page.locator('#btn-modal-opcao-denunciar').click();
await page.waitForTimeout(600);
check('prefixo não duplica', (await page.inputValue('input[placeholder="Qual o tema da sua mensagem?"]')) === '[DENÚNCIA] Teste T52');
await page.getByRole('button', { name: /^Voltar$/ }).click();

// Limpar rascunho local do teste (não enviar nada)
await page.evaluate(() => { Object.keys(localStorage).filter(k => k.startsWith('cda_rascunho_composicao_')).forEach(k => localStorage.removeItem(k)); });

// ─── Área Institucional ────────────────────────────────────────────────────
console.log('\n[Instituição]');
await ctx.close();
const ctx2 = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page2 = await ctx2.newPage();
await login(page2, '/institucional', 'AGT-9921-SR', '000000');
const popup2 = page2.locator('[data-testid="popup-enviar-mensagem"]');
await abrirCompositor(page2);
await page2.fill('input[placeholder*="Código Institucional"]', '009874562LA041').catch(async () => {
  await page2.locator('input[placeholder*="BI"], input[placeholder*="Destinat"]').first().fill('009874562LA041');
});
await page2.fill('input[placeholder="Qual o tema da sua mensagem?"]', 'Teste T52 inst');
await page2.locator('textarea').first().fill('Conteúdo de teste institucional (T52). Não enviar.');
await page2.waitForTimeout(800);
const btnInst = page2.locator('#btn-enviar-mensagem');
check('botão «Enviar Mensagem Oficial»', /Enviar Mensagem Oficial/.test(await btnInst.innerText()));
if (await btnInst.isEnabled()) {
  await btnInst.click();
  await popup2.waitFor({ timeout: 5000 }).catch(() => {});
  check('popup abre na instituição', await popup2.isVisible());
  check('«Mensagem Normal» presente', await page2.locator('#btn-modal-opcao-normal').isVisible());
  check('«Mensagem de Emergência» presente', await page2.locator('#btn-modal-opcao-emergencia').isVisible());
  check('etiqueta PRIORITÁRIO', await page2.locator('#btn-modal-opcao-emergencia').getByText('Prioritário', { exact: true }).isVisible());
  check('sem «Denunciar» na instituição', (await page2.locator('#btn-modal-opcao-denunciar').count()) === 0);
  check('botões «Fechar» e «Ok»', await page2.locator('#btn-fechar-modal-tipo-envio').isVisible() && await page2.locator('#btn-ok-modal-tipo-envio').isVisible());
  if (SHOT) await page2.screenshot({ path: 'testes/evidencias/t52_instituicao_popup.png' });
  await page2.locator('#btn-fechar-modal-tipo-envio').click();
  await page2.waitForTimeout(300);
  check('«Fechar» fecha o popup', (await popup2.count()) === 0);
} else {
  check('botão institucional activo (destinatário aceite)', false);
}
await page2.evaluate(() => { Object.keys(localStorage).filter(k => k.startsWith('cda_rascunho_composicao_')).forEach(k => localStorage.removeItem(k)); });

await browser.close();
console.log(`\nResultado: ${ok}/${total}`);
process.exit(ok === total ? 0 : 1);
