// Validação REAL da Fase 2 (uma única expedição «[TESTE]»): INAPEM-LLMM-01
// cria um Inquérito com IA (guião gerado pela IA real) e envia a «Todos».
import { chromium } from 'playwright';
import fs from 'node:fs';
const cred = fs.readFileSync('/home/user/.credenciais_cda/contas_reais.md', 'utf8');
const senha = (cred.match(/INAPEM-LLMM-01[^\n]*?(\d{9})/) || [])[1] || '';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const erros = []; page.on('pageerror', (e) => erros.push(String(e)));
const apiLog = [];
page.on('response', (r) => { if (r.url().includes('/api/inquerito-ia/')) apiLog.push(`${r.status()} ${new URL(r.url()).pathname}`); });

await page.goto('http://localhost:3000/institucional'); await page.waitForTimeout(2500);
await page.locator('input[name="cda-utilizador"]').fill('INAPEM-LLMM-01');
await page.locator('input[name="cda-senha"]').fill(senha);
await page.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click();
await page.waitForTimeout(4000);
console.log('login ok:', !/login/.test(page.url()), page.url());
await page.evaluate(() => { window.location.hash = '#/correspondencias'; }); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Nova Mensagem/i }).first().click(); await page.waitForTimeout(1000);

await page.locator('#btn-criar-inquerito').click();
await page.locator('#opcao-inquerito-ia').click();
await page.locator('#btn-tipo-inquerito-ok').click();
await page.waitForTimeout(600);
await page.locator('#inquerito-ia-temas').fill('[TESTE] Se as famílias do bairro têm acesso a água potável e energia eléctrica e quais as maiores dificuldades');
await page.locator('#inquerito-ia-informacoes').fill('Tem água canalizada em casa; onde vai buscar água; distância; horas de energia por dia; principal problema');
// espera pela pré-visualização real (IA)
await page.waitForFunction(() => /informaç/.test(document.querySelector('[data-testid="inquerito-ia-preview"]')?.textContent || ''), null, { timeout: 90000 });
const preview = await page.locator('[data-testid="inquerito-ia-preview"]').innerText();
console.log('PREVIEW REAL:\n' + preview);
await page.screenshot({ path: 'testes/evidencias/f2_real_preview.png' });
await page.locator('#btn-criar-inquerito-ia').click();
try {
  await page.waitForFunction(() => !!document.querySelector('[data-testid="inqueritos-ia-compostos"]'), null, { timeout: 30000 });
  console.log('bloco no compositor: sim');
} catch {
  await page.screenshot({ path: 'testes/evidencias/f2_real_falha_criar.png' });
  const dlg = await page.locator('[role="dialog"], .fixed').allInnerTexts();
  console.log('SEM BLOCO. Diálogos visíveis:', JSON.stringify(dlg.slice(-3)));
  await browser.close(); process.exit(1);
}
const para = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => i.value).filter(v => /todos/i.test(v)));
console.log('destinatário:', para);
// assunto
await page.locator('input[placeholder="Qual o tema da sua mensagem?"]').fill('[TESTE] Inquérito com IA — água e energia');
await page.waitForTimeout(300);
await page.screenshot({ path: 'testes/evidencias/f2_real_compositor.png', fullPage: true });
await page.locator('#btn-enviar-mensagem').click();
await page.waitForTimeout(800);
await page.getByText('Mensagem Normal').first().click();
await page.waitForTimeout(15000);
const sucesso = await page.getByText(/Correspondência enviada com sucesso/).count();
const aviso = await page.locator('text=/Não foi possível|Não há cidadãos|aguarda a migração/').count();
console.log('sucesso:', sucesso > 0, '| aviso:', aviso > 0);
if (sucesso) console.log(await page.locator('text=/Correspondência enviada com sucesso/').innerText());
await page.screenshot({ path: 'testes/evidencias/f2_real_enviado.png' });
console.log('api:', apiLog);
console.log('erros:', erros.length ? erros : 'nenhum');
await browser.close();
