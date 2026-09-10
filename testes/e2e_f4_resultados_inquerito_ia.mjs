// Fase 4 — resultados na instituição (conta real INAPEM-LLMM-01, dados reais).
import { chromium } from 'playwright';
import fs from 'node:fs';
const cred = fs.readFileSync('/home/user/.credenciais_cda/contas_reais.md', 'utf8');
const senha = (cred.match(/INAPEM-LLMM-01[^\n]*?(\d{9})/) || [])[1] || '';
const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(`${c ? '✔' : '✘'} ${n}${x ? ' — ' + x : ''}`); };
const browser = await chromium.launch();
for (const vp of [{ w: 1366, h: 900, tag: 'desktop' }, { w: 390, h: 844, tag: 'mobile' }]) {
  const page = await (await browser.newContext({ viewport: { width: vp.w, height: vp.h }, acceptDownloads: true })).newPage();
  const erros = []; page.on('pageerror', (e) => erros.push(String(e)));
  await page.goto('http://localhost:3000/institucional'); await page.waitForTimeout(2500);
  await page.locator('input[name="cda-utilizador"]').fill('INAPEM-LLMM-01');
  await page.locator('input[name="cda-senha"]').fill(senha);
  await page.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click(); await page.waitForTimeout(4500);
  await page.evaluate(() => { window.location.hash = '#/sondagens'; }); await page.waitForTimeout(3000);
  const linhas = page.locator('[data-testid="inquerito-ia-linha"]');
  await linhas.first().waitFor({ timeout: 20000 });
  ok(`[${vp.tag}] lista mostra inquéritos IA com badge`, (await linhas.count()) >= 2 && /IA/.test(await linhas.first().innerText()), `${await linhas.count()} linhas`);
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="inquerito-ia-contadores-linha"]').length >= 1, null, { timeout: 20000 });
  const cont = await page.locator('[data-testid="inquerito-ia-contadores-linha"]').first().innerText();
  ok(`[${vp.tag}] contadores na linha`, /enviados.*iniciados.*concluídos.*recusados/.test(cont), cont);
  await page.screenshot({ path: `testes/evidencias/f4_${vp.tag}_lista.png`, fullPage: true });
  await linhas.first().locator('button').first().click();
  const modal = page.locator('[data-testid="inquerito-ia-resultados"]');
  await modal.waitFor({ timeout: 15000 });
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="inquerito-ia-campo"]').length >= 1, null, { timeout: 20000 });
  const campos = await page.locator('[data-testid="inquerito-ia-campo"]').count();
  const txt = await modal.innerText();
  ok(`[${vp.tag}] popup «Resultados» com campos agregados e percentagens`, campos >= 3 && /%/.test(txt), `${campos} campos`);
  ok(`[${vp.tag}] contadores no popup`, /Enviados[\s\S]*Iniciados[\s\S]*Concluídos[\s\S]*Recusados/i.test(txt));
  ok(`[${vp.tag}] sem respostas individuais / hash no DOM`, !/[0-9a-f]{64}/.test(txt) && !/002399714|005404692/.test(txt));
  await page.screenshot({ path: `testes/evidencias/f4_${vp.tag}_resultados.png` });
  if (vp.tag === 'desktop') {
    // Encerrar via UI (o inquérito #11 foi reaberto só para este teste)
    const btnEnc = page.locator('#btn-encerrar-inquerito-ia');
    ok('[desktop] inquérito activo → botão «Encerrar inquérito»', (await btnEnc.count()) === 1);
    await btnEnc.click(); await page.waitForTimeout(500);
    ok('[desktop] confirmação CdaConfirm (perigoso)', await page.getByText(/Encerrar este inquérito\?/).isVisible());
    await page.screenshot({ path: 'testes/evidencias/f4_desktop_confirmar_encerrar.png' });
    await page.getByRole('button', { name: /^Encerrar$/ }).click(); await page.waitForTimeout(2500);
    const txt2 = await modal.innerText();
    ok('[desktop] após encerrar: estado «encerrado» e botão desaparece', /encerrado/.test(txt2) && (await btnEnc.count()) === 0);
  } else {
    ok(`[${vp.tag}] inquérito encerrado → sem botão Encerrar`, (await page.locator('#btn-encerrar-inquerito-ia').count()) === 0);
  }
  if (vp.tag === 'desktop') {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.locator('#btn-exportar-csv-inquerito-ia').click()]);
    const p = await dl.path(); const csv = fs.readFileSync(p, 'utf8');
    ok('[desktop] Exportar CSV', /inquerito_id;campo;rotulo;valor;total;percentagem/.test(csv) && csv.split('\n').length > 3, `${dl.suggestedFilename()} (${csv.split('\n').length - 1} linhas)`);
    console.log(csv.split('\n').slice(0, 6).map((l) => '     ' + l).join('\n'));
  }
  ok(`[${vp.tag}] sem erros JS`, erros.length === 0, erros.join(' | '));
  await page.context().close();
}
await browser.close();
console.log(`\n=== ${R.filter(Boolean).length}/${R.length} OK ===`);
process.exit(R.every(Boolean) ? 0 : 1);
