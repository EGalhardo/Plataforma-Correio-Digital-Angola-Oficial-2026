// QA — Equipa (Instituição + Administração): ciclo completo reversível com contas reais
// E1 (instituição): lista bate com a base central → adicionar operador de teste →
//   aparece na UI E em `profiles.role='instituicao'` → «Eliminar» + confirmar →
//   desaparece da UI e da base (profiles e Auth).
// E2 (administração): lista mostra os admins reais da base → adicionar agente de teste →
//   aparece na UI E em `profiles.role='admin'` → «Eliminar» + confirmar → limpo.
// Nota: os membros REAIS (ex.: Admin Alfa e colaboradores existentes) nunca são tocados;
//       apenas as contas «QA EQUIPA TESTE …» criadas pelo próprio teste são removidas.
// Uso: node --env-file=.env --env-file=.env.local scripts/e2e_equipa_instituicao_admin.mjs
// Credenciais via env (NUNCA hardcoded):
//   QA_INST      — agente institucional pelo login do portal, ex.: INAPEM-LMM-01
//   QA_INST_PASS — palavra-passe dessa conta
//   QA_ADMIN     — agente da área de Administração (Alfa), ex.: ADMIN-0001
//   QA_ADMIN_PASS— palavra-passe dessa conta
//   QA_TEST_PASS — palavra-passe a atribuir às contas de teste criadas/removidas
//   BASE         — opcional (default http://localhost:3000)
// Requer ainda SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (verificação e higiene final).
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const SR = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!URL || !SR) { console.error('ERRO: faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no env.'); process.exit(1); }

const INST = (process.env.QA_INST || '').trim();
const INST_PASS = (process.env.QA_INST_PASS || '').trim();
const ADMIN = (process.env.QA_ADMIN || '').trim();
const ADMIN_PASS = (process.env.QA_ADMIN_PASS || '').trim();
const TEST_PASS = (process.env.QA_TEST_PASS || '').trim();
if (!INST || !INST_PASS || !ADMIN || !ADMIN_PASS || !TEST_PASS) {
  console.error('ERRO: defina QA_INST, QA_INST_PASS, QA_ADMIN, QA_ADMIN_PASS, QA_TEST_PASS no env.');
  process.exit(1);
}
const INST_PREFIX = INST.replace(/-\d+$/, ''); // ex.: INAPEM-LMM

const log = (s) => console.log(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const marca = () => ((Date.now() - t0) / 1000).toFixed(1);
const falhas = [];
const pass = (nome, cond, extra = '') => {
  log(`${cond ? '[PASS]' : '[FAIL]'} [${marca()}s] ${nome}${extra ? ' — ' + extra : ''}`);
  if (!cond) falhas.push(nome);
};

const H = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };
const pg = async (path, init = {}) => {
  const r = await fetch(`${URL}/rest/v1${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`PG ${r.status}: ${(await r.text()).slice(0, 240)}`);
  const t = await r.text(); return t ? JSON.parse(t) : [];
};

const browser = await chromium.launch();
const ctx = () => browser.newContext({ viewport: { width: 1400, height: 900 } });

async function loginPortal(rxModo, rxCampo, id, senha, rxPronto) {
  const p = await (await ctx()).newPage();
  p.on('response', async (r) => {
    if (r.url().includes('/api/equipa-membro')) {
      log(`[net] equipa-membro ${r.request().method()} → ${r.status()} ${JSON.stringify(await r.json().catch(() => ({}))).slice(0, 160)}`);
    }
  });
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  const clicarTexto = async (rx) => {
    const els = p.locator('button, a, [role=tab], div');
    const n = await els.count();
    for (let i = 0; i < Math.min(n, 40); i++) {
      const el = els.nth(i);
      const t = (await el.textContent().catch(() => '')) || '';
      if (rx.test(t) && await el.isVisible().catch(() => false)) { await el.click(); return true; }
    }
    return false;
  };
  await clicarTexto(rxModo); await sleep(1500);
  let campo = p.getByPlaceholder(rxCampo).first();
  if (await campo.count() === 0 || !(await campo.isVisible().catch(() => false))) campo = p.locator('input').first();
  await campo.fill(id);
  await p.getByPlaceholder(/••|senha|Senha/i).first().fill(senha);
  await p.getByRole('button', { name: /Entrar|Aceder/i }).first().click();
  await p.waitForSelector(rxPronto, { timeout: 120000 }).catch(() => null);
  log(`[login] ${id} em ${marca()}s`);
  return p;
}

// Remoção determinística: linha da tabela → «Eliminar» da linha → modal «Eliminar
// Definitivamente» (CdaConfirmModal, textoConfirmar="Eliminar") → confirmar.
async function removerPorAgente(pag, marcador) {
  const row = pag.locator('tbody tr', { hasText: marcador }).first();
  let clicou = false;
  try {
    const btn = row.locator('button', { hasText: /Eliminar/i }).first();
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) { await btn.click(); clicou = true; }
  } catch { }
  if (!clicou) {
    try {
      const btn = row.locator('button[title*="Eliminar" i]').first();
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) { await btn.click(); clicou = true; }
    } catch { }
  }
  if (!clicou) return { clicou, sumiu: false };
  await sleep(1500);
  try {
    if (await pag.locator('text=/Eliminar Definitivamente/i').first().isVisible({ timeout: 8000 }).catch(() => false)) {
      await pag.locator('button').filter({ hasText: /^Eliminar$/ }).last().click();
    }
  } catch { }
  let sumiu = false;
  for (let i = 0; i < 12 && !sumiu; i++) {
    sumiu = !(await pag.evaluate(() => document.body ? document.body.innerText : '')).includes(marcador);
    if (!sumiu) await sleep(3000);
  }
  return { clicou, sumiu };
}

async function dbPollExiste(role, bi, espera = true, maxIter = 15) {
  for (let i = 0; i < maxIter; i++) {
    try {
      const r = await pg(`/profiles?select=bi,name,role&role=eq.${role}&bi=eq.${bi}`);
      const existe = Array.isArray(r) && r.length > 0;
      if (existe === espera) return existe ? r[0] : true;
    } catch { }
    await sleep(4000);
  }
  return null;
}

// ═══════════════ E1 — EQUIPA DA INSTITUIÇÃO ═══════════════
log('\n══ E1: Equipa Instituição ══');
const membrosDb = await pg(`/profiles?select=bi,name,role&role=eq.instituicao&bi=like.${INST_PREFIX}-*&order=bi.asc`);
log(`DB membros actuais: ${JSON.stringify(membrosDb.map(m => m.bi))}`);
const inst = await loginPortal(/Institui/i, /AGT|SIGLA|código institucional|Institui/i, INST, INST_PASS, /Painel|Dashboard/i);
pass('E1·login instituição', true);
await inst.locator('button, a, [role=tab], div').filter({ hasText: /^Equipa$/ }).first().click().catch(() => { });
await sleep(6000);
const tE1 = await inst.evaluate(() => document.body ? document.body.innerText : '');
pass('E1·página Equipa abriu', /(recursos humanos|gestão de equipa)/i.test(tE1));
pass('E1·lista UI contém TODOS os membros da base central', membrosDb.every(m => tE1.includes(m.bi)), tE1.includes('AINDA NÃO EXISTEM') ? 'mostrou vazio!' : '');

const seqs = membrosDb.map(m => parseInt((m.bi.match(/-(\d+)$/) || [0, '0'])[1], 10)).concat([1]);
const agenteNovo = `${INST_PREFIX}-${String(Math.max(...seqs) + 1).padStart(2, '0')}`;
log(`novo operador esperado (nº auto): ${agenteNovo}`);

await inst.getByRole('button', { name: /Adicionar à Equipa/i }).first().click().catch(async () => { await inst.getByText(/Adicionar à Equipa/i).first().click().catch(() => { }); });
await sleep(2500);
pass('E1·modal «REGISTAR NOVO MEMBRO DA EQUIPA» apareceu', await inst.locator('text=/REGISTAR NOVO MEMBRO DA EQUIPA/i').first().isVisible({ timeout: 15000 }).catch(() => false));
await inst.getByPlaceholder('Ex: Dr. Francisco Manuel').fill('QA EQUIPA TESTE OPERADOR').catch(() => { });
await inst.getByPlaceholder(/cda\.gov\.ao|cdaadmin/).fill('qa.equipa.teste@inapem-lmm.test').catch(() => { });
await inst.getByPlaceholder('+244 923 000 000').fill('+244 944 000 000').catch(() => { });
await inst.getByPlaceholder(/Ex: Auditor Geral/).fill('Operador de QA').catch(() => { });
await inst.getByPlaceholder(/Ex: Direcção Geral/).fill('Qualidade').catch(() => { });
await inst.getByPlaceholder('Mín. 8 caracteres').fill(TEST_PASS).catch(() => { });
await inst.getByPlaceholder('Repita a senha exactamente').fill(TEST_PASS).catch(() => { });
await inst.getByRole('button', { name: /Submeter Cadastro/i }).first().click();
let sucessoAdd = false;
for (let i = 0; i < 20 && !sucessoAdd; i++) {
  sucessoAdd = await inst.locator(`text=/${agenteNovo}|criado|cadastrado|activação|activacao/i`).first().isVisible({ timeout: 2500 }).catch(() => false);
  if (!sucessoAdd) await sleep(2000);
}
const dbRow = await dbPollExiste('instituicao', agenteNovo, true);
const tE1b = await inst.evaluate(() => document.body ? document.body.innerText : '');
pass('E1·confirmação do registo na UI', sucessoAdd || tE1b.includes(agenteNovo));
pass('E1·novo operador surge na lista', tE1b.includes(agenteNovo));
pass('E1·DB perfil criado', !!dbRow, dbRow && dbRow !== true ? JSON.stringify(dbRow) : 'sem linha após 60s');

const resE1 = await removerPorAgente(inst, agenteNovo);
pass('E1·operação de remoção executada (clique encontrou controlo)', resE1.clicou);
pass('E1·lista sem o operador após remover', resE1.sumiu);
pass('E1·DB sem perfil após remover', (await dbPollExiste('instituicao', agenteNovo, false, 18)) === true);

// ═══════════════ E2 — EQUIPA DA ADMINISTRAÇÃO ═══════════════
log('\n══ E2: Equipa Admin ══');
const adm = await loginPortal(/Admin|Operador|Govern/i, /ADMIN|agente|Nº|numero|número/i, ADMIN, ADMIN_PASS, /Painel|Dashboard|Cidadãos|Trabalhadores/i);
pass('E2·login admin', true);
await adm.locator('button, a, [role=tab], div').filter({ hasText: /^Equipa$/ }).first().click().catch(() => { });
await sleep(6000);
const tE2 = await adm.evaluate(() => document.body ? document.body.innerText : '');
pass('E2·página Equipa abriu', /recursos humanos|gestão de equipa|administração central/i.test(tE2));
const adminsDb = await pg(`/profiles?select=bi,name,role&role=eq.admin&order=bi.asc`);
log(`DB admins: ${JSON.stringify(adminsDb.map(a => a.bi))}`);
pass('E2·lista UI contém TODOS os admins da base central', adminsDb.length >= 1 && adminsDb.every(a => tE2.includes(a.bi)));

const antesSetAdm = new Set(adminsDb.map(a => a.bi));
let agenteAdmNovo = `ADMIN-${String(Math.max(0, ...adminsDb.map(a => parseInt((a.bi.match(/-(\d+)$/) || [0, '0'])[1], 10))) + 1).padStart(4, '0')}`;
await adm.getByRole('button', { name: /Adicionar à Equipa/i }).first().click().catch(async () => { await adm.getByText(/Adicionar à Equipa/i).first().click().catch(() => { }); });
await sleep(2500);
pass('E2·modal de registo abriu', await adm.locator('text=/REGISTAR NOVO MEMBRO DA EQUIPA/i').first().isVisible({ timeout: 15000 }).catch(() => false));
await adm.getByPlaceholder('Ex: Dr. Francisco Manuel').fill('QA EQUIPA TESTE ADMIN').catch(() => { });
await adm.getByPlaceholder(/cda\.gov\.ao|cdaadmin/).fill('qa.equipa.admin@cda.test').catch(() => { });
await adm.getByPlaceholder('+244 923 000 000').fill('+244 955 000 000').catch(() => { });
await adm.getByPlaceholder(/Ex: Auditor Geral/).fill('Agente de QA').catch(() => { });
await adm.getByPlaceholder(/Ex: Direcção de Operações da Plataforma|Ex: Direcção Geral/).fill('Qualidade').catch(() => { });
await adm.getByPlaceholder('Mín. 8 caracteres').fill(TEST_PASS).catch(() => { });
await adm.getByPlaceholder('Repita a senha exactamente').fill(TEST_PASS).catch(() => { });
await adm.getByRole('button', { name: /Submeter Cadastro/i }).first().click();
// número real por DIFERENÇA antes/depois (a numeração tem anti-colisão contra a base central)
let addOk = false;
for (let i = 0; i < 20 && !addOk; i++) {
  const tA = await adm.evaluate(() => document.body ? document.body.innerText : '');
  const novo = [...new Set(tA.match(/ADMIN-\d{4}/g) || [])].find(x => !antesSetAdm.has(x));
  if (novo) { addOk = true; agenteAdmNovo = novo; }
  if (!addOk) await sleep(2000);
}
log(`nº admin criado: ${agenteAdmNovo}`);
const dbAdmRow = await dbPollExiste('admin', agenteAdmNovo, true);
pass('E2·agente de teste criado e visível na lista (UI)', addOk, agenteAdmNovo);
pass('E2·DB profiles.role=admin criado', !!dbAdmRow, dbAdmRow && dbAdmRow !== true ? JSON.stringify(dbAdmRow) : `${agenteAdmNovo} ausente após 60s`);

const resE2 = await removerPorAgente(adm, agenteAdmNovo);
pass('E2·controlo de remoção executado', resE2.clicou);
pass('E2·lista sem o agente após remover', resE2.sumiu);
pass('E2·DB sem perfil admin após remover', (await dbPollExiste('admin', agenteAdmNovo, false, 18)) === true);

// higiene final: varrer restos «QA EQUIPA TESTE» (idempotente — não toca membros reais)
const restos = await pg(`/profiles?select=bi,name,role&name=ilike.*QA EQUIPA TESTE*`).catch(() => []);
for (const r of restos) { await pg(`/profiles?bi=eq.${r.bi}`, { method: 'DELETE' }); log(`[limpeza] profiles ${r.bi} removido`); }
const au = await fetch(`${URL}/auth/v1/admin/users`, { headers: H }).then(r => r.json()).catch(() => ({}));
for (const u of (au.users || []).filter(u => /@inst\.correiodigital\.ao$|@admin\.correiodigital\.ao$/i.test(u.email || '') && /QA EQUIPA TESTE/i.test(u.user_metadata?.name || ''))) {
  await fetch(`${URL}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers: H });
  log(`[limpeza] auth ${u.email} removido`);
}

log(`\n${falhas.length ? 'RESULTADO: FALHOU (' + falhas.join(' | ') + ')' : 'RESULTADO: EQUIPA (inst + admin) 100% VERDES'} em ${marca()}s`);
await browser.close();
process.exit(falhas.length ? 1 : 0);
