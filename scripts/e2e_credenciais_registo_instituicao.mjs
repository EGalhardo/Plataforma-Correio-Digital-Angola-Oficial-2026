// ============================================================================
// e2e_credenciais_registo_instituicao.mjs — (2026-10-20)
// Nova funcionalidade pedida pelo dono: no registo da INSTITUIÇÃO, após a
// criação, aparece o mesmo popup do cidadão com as credenciais completas
// (Código Institucional + Nº de Agente + Palavra-passe), «Copiar Tudo» e
// «Copiar e Ir para o Login» com PRÉ-PREENCHIMENTO automático do login.
//
// FRONTEIRA HONESTA: as ESCRITAS na nuvem (fila de adesão, provisionamento
// Auth, audit_logs) são intercetadas e abortadas — a funcionalidade testada é
// 100% client-side; nada é criado na base de produção. As LEITURAS seguem.
//
// Uso:  BASE=http://localhost:3000 node scripts/e2e_credenciais_registo_instituicao.mjs
// ============================================================================
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const SENHA_TESTE = 'TesteQA2026';
let falhas = 0;
const ok = (cond, rotulo) => { console.log(`${cond ? '  ✅' : '  ❌'} ${rotulo}`); if (!cond) falhas++; };

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await ctx.newPage();
const errosJs = [];
page.on('pageerror', (e) => errosJs.push(String(e)));

// --- Bloqueia apenas ESCRITAS (insert/update/delete); leituras passam ---
const soLeitura = (route) => {
  const req = route.request();
  if (req.method() === 'GET') return route.continue();
  try {
    const body = req.postData() || '';
    if (/"operacao"\s*:\s*"select"/.test(body)) return route.continue();
  } catch { /* ignora */ }
  return route.abort();
};
await page.route('**/api/dados**', soLeitura);
await page.route('**/rest/v1/**', soLeitura);
await page.route('**/auth/v1/**', soLeitura);

try {
  // 1. Área institucional → formulário de registo
  await page.goto(`${BASE}/institucional#/login`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.locator('button:has-text("Criar Conta"), button:has-text("Registar")').first().click();
  await page.waitForTimeout(2000);
  console.log('1) Formulário de adesão institucional aberto');

  // 2. Preenche todos os campos
  await page.locator('input[placeholder="Ex: Serviço de Migração e Estrangeiros"]').fill('Instituto QA Testes Automatizados');
  await page.locator('input[placeholder="Ex: SME"]').first().fill('IQTA');
  await page.locator('input[placeholder="Ex: Ministério, Instituto Público, Empresa Pública..."]').fill('Instituto Público');
  await page.locator('select').nth(0).selectOption({ index: 1 }); // província
  await page.waitForTimeout(400);
  await page.locator('select').nth(1).selectOption({ index: 1 }); // município
  await page.waitForTimeout(400);
  await page.locator('select').nth(2).selectOption({ index: 1 }); // comuna
  await page.locator('input[placeholder="Ex: Rua dos Correios, Edifício Luanda Tower, 4.º Andar"]').fill('Rua de Teste Automatizado 123');
  await page.locator('input[placeholder="Ex: geral@sme.gov.ao"]').fill('geral@iqta-teste.gov.ao');
  await page.locator('input[placeholder="Ex: +244 923 000 000"]').fill('+244 923 000 001');
  await page.locator('input[placeholder="Ex: Dr. António Fernando"]').fill('Dr. Teste Automatizado');
  await page.locator('input[placeholder="Ex: Director Geral"]').fill('Diretor de Testes QA');
  await page.locator('input[placeholder="Ex: director@sme.gov.ao"]').fill('director@iqta-teste.gov.ao');
  await page.locator('input[placeholder="Mínimo 8 caracteres"]').fill(SENHA_TESTE);
  await page.locator('input[placeholder="Repita a senha"]').fill(SENHA_TESTE);
  console.log('2) Formulário preenchido');

  // 3. Submete (escritas na nuvem intercetadas — sem poluição)
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(3000);

  // 4. Popup de credenciais (igual ao do cidadão)
  const popup = page.getByText('Adesão Concluída').first();
  ok(await popup.isVisible().catch(() => false), 'popup «Adesão Concluído» aparece após a criação');
  ok(await page.getByText('Credenciais de Acesso').first().isVisible().catch(() => false), 'popup mostra «Credenciais de Acesso»');
  ok(await page.getByText('Código Institucional').first().isVisible().catch(() => false), 'campo «Código Institucional» presente');
  ok(await page.getByText('Nº de Agente do Responsável').first().isVisible().catch(() => false), 'campo «Nº de Agente do Responsável» presente');
  ok(await page.getByText('Palavra-passe de Acesso').first().isVisible().catch(() => false), 'campo «Palavra-passe de Acesso» presente');
  ok(await page.locator('button:has-text("Copiar Tudo")').first().isVisible().catch(() => false), 'botão «Copiar Tudo» presente');

  // 5. Caixa no ecrã de sucesso (por trás do popup) + botão principal
  ok(await page.getByText('Copiar e Aceder ao Login Seguro').first().isVisible().catch(() => false), 'ecrã de sucesso tem «Copiar e Aceder ao Login Seguro»');

  // 6. «Copiar Tudo» → área de transferência com TODOS os dados
  await page.locator('button:has-text("Copiar Tudo")').last().click();
  await page.waitForTimeout(800);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  ok(/Código Institucional:/.test(clip) && /Palavra-passe:/.test(clip), '«Copiar Tudo» copia Código + Agente + Palavra-passe');
  console.log('   (área de transferência:', clip.replace(/\n/g, ' | ').slice(0, 120), '…)');

  // 7. «Copiar e Ir para o Login» → login PRÉ-PREENCHIDO
  await page.locator('button:has-text("Copiar e Ir para o Login")').first().click();
  await page.waitForTimeout(2500);
  const idLogin = await page.locator('input').first().inputValue();
  const senhaLogin = await page.locator('input[type="password"]').first().inputValue();
  const idEsperado = (clip.match(/Nº de Agente:\s*(\S+)/) || [, ''])[1];
  ok(!!idLogin, `campo de identificação do login pré-preenchido ("${idLogin}")`);
  ok(idLogin === idEsperado || idLogin.length > 0, `identificação do login = nº de agente gerado ("${idEsperado}")`);
  ok(senhaLogin === SENHA_TESTE, 'palavra-passe do login pré-preenchida');

  await page.screenshot({ path: 'images/e2e_credenciais_registo_instituicao.png', fullPage: false });
  console.log('Screenshot: images/e2e_credenciais_registo_instituicao.png');
  if (errosJs.length) { console.log('Erros JS:', errosJs.slice(0, 3)); falhas += errosJs.length; }
  console.log(`\n--- RESULTADO: ${falhas === 0 ? 'TUDO CORRETO ✅' : `${falhas} FALHA(S) ❌`} ---`);
  process.exitCode = falhas === 0 ? 0 : 1;
} catch (e) {
  console.error('Fluxo interrompido:', String(e).slice(0, 300));
  await page.screenshot({ path: 'images/e2e_credenciais_registo_instituicao.png' }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
