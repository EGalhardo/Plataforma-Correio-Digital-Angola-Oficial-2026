import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const SHOT_DIR = '/home/user/cda_test/screenshots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

async function run() {
  console.log('=== Teste de Recuperação de Senha & Chave Resend API ===');
  
  // 1. Teste de endpoint direto
  console.log('1. A testar o endpoint /api/enviar-email-recuperacao...');
  const res = await fetch(`${BASE}/api/enviar-email-recuperacao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'delivered@resend.dev',
      link: 'https://correio-digital-angola-oficial.vercel.app'
    })
  });
  const data = await res.json();
  console.log('Status endpoint:', res.status, 'Resposta:', data);
  if (!res.ok || !data.ok) {
    throw new Error('Falha no endpoint /api/enviar-email-recuperacao');
  }

  // 2. Teste no navegador com Playwright
  console.log('2. A testar fluxo visual e interactivo na Página Redefinir Senha...');
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 1380, height: 960 },
    deviceScaleFactor: 1.5,
    locale: 'pt-AO',
  });
  const page = await context.newPage();

  // Aceder à página de login
  await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Clicar em "Esqueci Senha"
  const esqueceuLink = page.locator('button:has-text("Esqueci Senha"), button:has-text("Esqueceu")').first();
  await esqueceuLink.click();
  await page.waitForTimeout(1000);

  // Capturar ecrã inicial de redefinição
  await page.screenshot({ path: `${SHOT_DIR}/redefinir-senha-identificar.png`, fullPage: false });
  console.log('✓ Ecrã de identificação guardado em redefinir-senha-identificar.png');

  // Preencher email
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.fill('cidadao.teste@correiodigital.ao');
  await page.waitForTimeout(500);

  // Clicar em "Enviar link de recuperação"
  const enviarBtn = page.locator('button:has-text("Enviar link"), button:has-text("Recuperar")').first();
  await enviarBtn.click();
  console.log('A submeter pedido de recuperação...');

  // Aguardar transição para passo "enviado"
  await page.locator('text=/Verifique o seu e-mail|E-mail enviado/i').first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(1000);

  // Capturar ecrã de confirmação de envio
  await page.screenshot({ path: `${SHOT_DIR}/redefinir-senha-enviado.png`, fullPage: false });
  console.log('✓ Ecrã de confirmação guardado em redefinir-senha-enviado.png');

  await browser.close();
  console.log('=== Teste de Recuperação de Senha Concluído com 100% de Sucesso ===');
}

run().catch((err) => {
  console.error('Erro no teste:', err);
  process.exit(1);
});
