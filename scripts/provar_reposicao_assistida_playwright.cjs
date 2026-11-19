/**
 * PROVA — REPOSIÇÃO ASSISTIDA DE PALAVRA-PASSE pela Administração.
 *
 * Motivo: as contas reais só têm e-mail TÉCNICO (bi.<bi>@cidadao… /
 * agente.*@inst|admin…), domínio sem correio que o mailer do Supabase recusa
 * («email_address_invalid»). Sem esta via, quem esquece a senha ficava sem
 * qualquer saída. A Admin repõe uma senha temporária e o titular troca-a no
 * Perfil → Segurança.
 *
 *   node scripts/provar_reposicao_assistida_playwright.cjs
 *
 * Contas reais. No fim, repõe 123456789 nas duas contas tocadas.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP = 'https://correio-digital-angola-oficial.vercel.app';
const SUPA = 'https://klrclczcahfycfdxzdqs.supabase.co';
const E = (ms) => new Promise((r) => setTimeout(r, ms));
const FALHAS = [];
const ok = (c, m) => { console.log(`   ${c ? '✓' : '✗'} ${m}`); if (!c) FALHAS.push(m); };

const env = (() => {
  const txt = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  const o = {};
  for (const l of txt.split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim().replace(/^"|"$/g, ''); }
  return o;
})();
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

const texto = async (p) => (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');

async function reporApi(email, senha) {
  const lista = await (await fetch(`${SUPA}/auth/v1/admin/users?per_page=200`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })).json();
  const u = (lista.users || []).find((x) => x.email === email);
  if (!u) throw new Error('conta não encontrada: ' + email);
  const r = await fetch(`${SUPA}/auth/v1/admin/users/${u.id}`, {
    method: 'PUT', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: senha }),
  });
  return r.ok;
}

(async () => {
  const browser = await chromium.launch();
  const temp = `Temp${Date.now().toString().slice(-6)}X`;

  // 1. ADMIN entra e abre Segurança → Utilizadores
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1300 }, locale: 'pt-PT' });
  const p = await ctx.newPage();
  await p.goto(`${APP}/admin/#/login`, { waitUntil: 'networkidle' }); await E(1500);
  await p.fill('input[name="cda-utilizador"]', 'ADMIN-0001');
  await p.fill('input[name="cda-senha"]', '987654321');
  await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(9000);
  ok(!/ENTRAR NO PORTAL/i.test((await texto(p)).slice(0, 400)), 'ADMIN entra no portal');

  await p.goto(`${APP}/admin/#/gov-seguranca`, { waitUntil: 'networkidle' }); await E(6000);
  const aba = p.locator('button:has-text("Utilizadores")').first();
  if (await aba.count()) { await aba.click(); await E(2500); }
  ok(/Utilizadores Cadastrados/i.test(await texto(p)), 'Segurança → Utilizadores está aberta');

  // 2. Repor a senha do cidadão real pela consola
  const btn = p.locator('[data-testid="repor-senha-002399714LA030"]').first();
  ok(await btn.count() > 0, 'existe o botão «Repor senha» para o cidadão real');
  await btn.click(); await E(1500);
  ok(await p.locator('[data-testid="modal-repor-senha"]').count() > 0, 'abre o modal de reposição');

  // 2a. senha curta → recusa no cliente
  await p.locator('[data-testid="campo-senha-temporaria"]').fill('abc');
  await p.locator('[data-testid="confirmar-repor-senha"]').click(); await E(1500);
  ok(/pelo menos 8/i.test(await p.locator('[data-testid="repor-senha-erro"]').innerText().catch(() => '')), 'senha curta é recusada');

  // 2b. senha válida → reposta
  await p.locator('[data-testid="campo-senha-temporaria"]').fill(temp);
  await p.locator('[data-testid="confirmar-repor-senha"]').click(); await E(7000);
  ok(await p.locator('[data-testid="modal-repor-senha"]').count() === 0, 'modal fecha após a reposição');
  await ctx.close();

  // 3. o cidadão entra com a senha temporária
  const ctx2 = await browser.newContext({ viewport: { width: 1400, height: 1250 }, locale: 'pt-PT' });
  const p2 = await ctx2.newPage();
  await p2.goto(`${APP}/#/login`, { waitUntil: 'networkidle' }); await E(1500);
  await p2.fill('input[name="cda-utilizador"]', '002399714LA030');
  await p2.fill('input[name="cda-senha"]', temp);
  await p2.click('button:has-text("ENTRAR NO PORTAL")'); await E(9000);
  ok(!/ENTRAR NO PORTAL/i.test((await texto(p2)).slice(0, 400)), 'cidadão entra com a senha temporária reposta');
  await ctx2.close();

  // 4. a senha ANTIGA já não abre
  const ctx3 = await browser.newContext({ viewport: { width: 1400, height: 1250 }, locale: 'pt-PT' });
  const p3 = await ctx3.newPage();
  await p3.goto(`${APP}/#/login`, { waitUntil: 'networkidle' }); await E(1500);
  await p3.fill('input[name="cda-utilizador"]', '002399714LA030');
  await p3.fill('input[name="cda-senha"]', '123456789');
  await p3.click('button:has-text("ENTRAR NO PORTAL")'); await E(9000);
  ok(/ENTRAR NO PORTAL/i.test((await texto(p3)).slice(0, 400)), 'a senha antiga já não entra');
  await ctx3.close();

  // 5. utilizador comum NÃO pode usar o endpoint (autorização no servidor)
  const r = await fetch(`${APP}/api/repor-senha`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bi: 'AGT-LMM-02', senha: temp }) });
  ok(r.status === 401, `sem sessão a rota recusa (HTTP ${r.status})`);

  // 6. limpeza: senha original de volta
  ok(await reporApi('bi.002399714la030@cidadao.correiodigital.ao', '123456789'), 'senha original do cidadão reposta');

  await browser.close();
  console.log(`\n${FALHAS.length === 0 ? 'RESULTADO: APROVADO' : `RESULTADO: FALHOU (${FALHAS.length})`}`);
  FALHAS.forEach((f) => console.log('  ✗ ' + f));
  process.exit(FALHAS.length === 0 ? 0 : 1);
})().catch((e) => { console.error('ERRO FATAL:', e); process.exit(1); });
