// Utilitário: encerra pela UI (instituição) um inquérito com IA de TESTE, pelo id. Uso: ID=23 node testes/util_encerrar_inquerito_ia_ui.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:3000';
const ID = Number(process.env.ID); const OBJ = process.env.OBJECTIVO || ''; if (!ID && !OBJ) throw new Error('ID ou OBJECTIVO em falta');
const cred = fs.readFileSync('/home/user/.credenciais_cda/contas_reais.md', 'utf8');
const pass = (cred.match(/INAPEM-LLMM-01[^\n]*?(\d{9})/) || [])[1];
const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
await page.goto(`${BASE}/institucional`); await page.waitForTimeout(2500);
await page.locator('input[name="cda-utilizador"]').fill('INAPEM-LLMM-01'); await page.locator('input[name="cda-senha"]').fill(pass);
await page.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click(); await page.waitForTimeout(4500);
await page.evaluate(() => { window.location.hash = '#/sondagens'; }); await page.waitForTimeout(3000);
const linhas = page.locator('[data-testid="inquerito-ia-linha"]');
let feito = false;
for (let i = 0; i < await linhas.count(); i++) {
  const t = await linhas.nth(i).innerText();
  if (OBJ && !t.includes(OBJ)) continue;
  await linhas.nth(i).locator('button').first().click();
  const modal = page.locator('[data-testid="inquerito-ia-resultados"]'); await modal.waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  if (await page.locator('#btn-encerrar-inquerito-ia').count()) {
    await page.locator('#btn-encerrar-inquerito-ia').click(); await page.waitForTimeout(500);
    await page.getByRole('button', { name: /^Encerrar$/ }).click(); await page.waitForTimeout(2500);
    feito = (await page.locator('#btn-encerrar-inquerito-ia').count()) === 0; break;
  }
  await page.getByRole('button', { name: /^Fechar$/ }).last().click().catch(() => page.keyboard.press('Escape')); await page.waitForTimeout(800);
}
console.log(feito ? `✔ inquérito #${ID} encerrado pela UI` : `✘ inquérito #${ID} não encontrado/encerrado`);
await browser.close();
