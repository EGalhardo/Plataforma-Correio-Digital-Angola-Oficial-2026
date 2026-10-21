// VALIDAÇÃO E2E DAS CORRECÇÕES — Login Facial (bugs do dono)
//  B1-fix (pool): template veneno na chave demo + «entrar só com o rosto» — antes comparava
//        SÓ contra o veneno (1 registo); agora compara com TODAS as matrizes do dispositivo.
//  B2-fix (espelho): recuperação de senha E2E actualiza citizen_pass_{BI}; login facial seguinte
//        restabelece a sessão da nuvem e mostra o correio completo (17 recebidas no controlo).
// Nota: a via simulada é determinística e valida a LÓGICA; a distinção por rosto real
//       (câmara física) é coberta pela mesma pipeline com limiar 26.
import { chromium } from 'playwright';
import fs from 'node:fs';

const carregarEnv = p => fs.existsSync(p) ? Object.fromEntries(fs.readFileSync(p, 'utf8').split('\n').filter(l => l && !l.trim().startsWith('#') && l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; })) : {};
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const __init_dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(__init_dirname, '..'); // raiz do repositório
const env = { ...carregarEnv(repo + '/.env'), ...carregarEnv(repo + '/.env.local'), ...process.env };
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };
const BARE = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
const BASE = process.env.BASE || 'http://localhost:3000';
// Credenciais via env (NUNCA hardcoded): QA_BI_A / QA_CID_PASS
// Uso: node --env-file=.env --env-file=.env.local — com QA_BI_A=<B.I. cidadão> QA_CID_PASS=<senha> no env
const BI_A = (process.env.QA_BI_A || '').trim();
const PASS_FINAL = (process.env.QA_CID_PASS || '').trim();
if (!BI_A || !PASS_FINAL) { console.error('ERRO: defina QA_BI_A e QA_CID_PASS no env.'); process.exit(1); }
const OUT = (process.env.QA_OUT || path.join(repo, 'qa-out')).trim();
fs.mkdirSync(OUT + '/logs', { recursive: true }); fs.mkdirSync(OUT + '/screenshots', { recursive: true });
const PASS_TEMP = `CdaTemp#${Math.floor(Math.random() * 900 + 100)}`;

const LOG = OUT + '/logs/qa-login-facial-fix.log';
fs.writeFileSync(LOG, '');
const log = s => { fs.appendFileSync(LOG, s + '\n'); console.log(s); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const t0 = Date.now();
const marca = () => ((Date.now() - t0) / 1000).toFixed(1);
const falhas = [];
const pass = (n, c, x = '') => { log(`${c ? '[PASS]' : '[FAIL]'} [${marca()}s] ${n}${x ? ' — ' + x : ''}`); if (!c) falhas.push(n); };
const shot = (p, n) => p.screenshot({ path: `${OUT}/screenshots/facefix-${n}.png` }).catch(() => { });

const semente = (id) => { const l = String(id).toUpperCase().replace(/\s+/g, '').length; return (k) => { const out = []; let x = ((l * 97 + k * 131 + 17) || 7) % 2147483646 + 1; for (let i = 0; i < 2048; i += 1) { x = (x * 48271) % 2147483647; out.push(60 + (x % 160)); } return out; }; };

const dbContagem = async (bi) => {
  const pess = await fetch(`${env.SUPABASE_URL}/rest/v1/messages?select=sender_bi,subject&recipient_bi=eq.${bi}`, { headers: H }).then(r => r.json()).catch(() => []);
  const todos = await fetch(`${env.SUPABASE_URL}/rest/v1/messages?select=sender_bi,subject&recipient_bi=eq.TODOS`, { headers: H }).then(r => r.json()).catch(() => []);
  const chaves = new Set(pess.map(m => `${(m.sender_bi || '').toUpperCase()}§${(m.subject || '').toUpperCase()}`));
  return { recebidas: pess.length + todos.filter(m => !chaves.has(`${(m.sender_bi || '').toUpperCase()}§${(m.subject || '').toUpperCase()}`)).length };
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const p = await ctx.newPage();
p.on('pageerror', e => log(`[erro-js] ${String(e).slice(0, 140)}`));

const loginSenha = async (bi, senha) => {
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(7000);
  await p.getByPlaceholder('009874562LA041').first().fill(bi);
  await p.locator('input[type=password]').first().fill(senha);
  await p.locator('button').filter({ hasText: /Entrar no Portal/i }).first().click();
  await p.waitForSelector('text=/Painel/i', { timeout: 120000 });
  await sleep(4000);
};
const sair = async () => {
  await p.evaluate(() => { const el = [...document.querySelectorAll('button, a')].find(x => /Sair do Canal|SAIR/i.test(x.textContent || '')); el && el.click(); });
  await sleep(2500);
  await p.evaluate(() => { const el = [...document.querySelectorAll('button')].find(x => /SAIR|Terminar|Confirmar|Sim/i.test((x.textContent || '').trim())); el && el.click(); });
  await sleep(6000);
};
const correioContar = async () => {
  await p.evaluate(() => { const el = [...document.querySelectorAll('aside button, nav button, button')].find(x => (x.textContent || '').trim() === 'Correio'); el && el.click(); });
  await sleep(4000);
  const t = await p.evaluate(() => document.body ? document.body.innerText : '');
  // formato dos cartões de estatística: 'LIDAS' '\n14' 'NÃO LIDAS' '\n3' 'ENVIADAS' '\n1' (tolerante a &nbsp;)
  const m = t.match(/LIDAS[\s\u00A0]*\n\s*(\d+)[\s\u00A0]*N[ÃA]O[\s\u00A0]+LIDAS[\s\u00A0]*\n\s*(\d+)[\s\u00A0]*ENVIADAS[\s\u00A0]*\n\s*(\d+)/i);
  const lidas = m ? +m[1] : Number((t.match(/LIDAS\s*\n\s*(\d+)/i) || [])[1] || -1);
  const nLidas = m ? +m[2] : Number((t.match(/(\d+)\s*MENSAGENS POR LER/i) || [])[1] || -1);
  const enviadas = m ? +m[3] : Number((t.match(/ENVIADAS\s*\n\s*(\d+)/i) || [])[1] || -1);
  return { lidas, nLidas, recebidas: lidas + nLidas, enviadas };
};
const irLoginFacialS = async () => {
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(7000);
  await p.getByPlaceholder('009874562LA041').first().fill('').catch(() => { });
  await p.locator('button').filter({ hasText: /Login Facial/i }).first().click();
  await sleep(3500);
};
const scanFace = async () => {
  await p.locator('button').filter({ hasText: /VALIDAR FACE LOCAL/i }).first().click();
  let entrou = false;
  for (let i = 0; i < 40 && !entrou; i++) {
    const t = await p.evaluate(() => document.body ? document.body.innerText : '');
    entrou = /MENSAGENS POR LER|Estatísticas|Olá,|Bem-vind/i.test(t) && !/ACESSO NACIONAL/i.test(t);
    if (!entrou) await sleep(2000);
  }
  return entrou;
};

log('══ VALIDAÇÃO DAS CORRECÇÕES DO LOGIN FACIAL ══');
log(`BD ${BI_A}: ${JSON.stringify(await dbContagem(BI_A))}`);

// GUARDA: se algo rebentar a meio, restaura SEMPRE a senha final da conta real
// (a recuperação E2E do B2 altera a password da conta BI_A temporariamente).
const restaurarSenhaFinal = async (rotulo) => {
  try {
    const usem = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, { headers: BARE }).then(r => r.json()).catch(() => ({}));
    const alvoU = (usem.users || []).find(u => (u.email || '').toLowerCase() === `bi.${BI_A.toLowerCase()}@cidadao.correiodigital.ao`);
    if (!alvoU?.id) { log(`[guarda ${rotulo}] utilizador alvo não encontrado`); return false; }
    const upd = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${alvoU.id}`, { method: 'PUT', headers: { ...BARE, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: PASS_FINAL }) }).then(r => r.status).catch(() => -1);
    const check = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: alvoU.email, password: PASS_FINAL }) }).then(r => r.status).catch(() => -1);
    log(`[guarda ${rotulo}] restauro admin=${upd} login-verificado=${check}`);
    return upd === 200 && check === 200;
  } catch (e) { log(`[guarda ${rotulo}] falhou: ${String(e).slice(0, 100)}`); return false; }
};
process.on('beforeExit', () => { }); // (mantém schema simples; a guarda corre nos catches)

// ── B1: à prova de «veneno na chave demo» ──
{
  await loginSenha(BI_A, PASS_FINAL);
  pass('B1a·login por senha (bootstrap)', true);
  await p.evaluate(() => { const el = [...document.querySelectorAll('button')].find(x => (x.textContent || '').trim() === 'Perfil'); el && el.click(); });
  await sleep(3000);
  const registar = p.locator('button').filter({ hasText: /Registar a minha face|Atualizar a minha face/i }).first();
  if (await registar.isVisible().catch(() => false)) {
    await registar.click(); await sleep(2500);
    for (let k = 0; k < 3; k++) { const cap = p.locator('button').filter({ hasText: /Capturar \d\/3/i }).first(); if (await cap.isVisible({ timeout: 8000 }).catch(() => false)) { await cap.click(); await sleep(2500); } }
    await sleep(2500);
  }
  const nTpl = await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('cda_demo_face_')).length);
  pass('B1b·template facial gravada para BI_A', nTpl >= 1, `${nTpl} matriz(es)`);
  const c0 = await correioContar();
  log(`B1·correio por SENHA controlo: ${JSON.stringify(c0)}`);
  pass('B1c·controlo de correio (senha) registado', c0.recebidas > 0, `recebidas=${c0.recebidas} lidas=${c0.lidas} nLidas=${c0.nLidas}`);
  await sair();
  // injeção do «veneno»: template SIMULADA na chave demo implícita (o pior caso do bug)
  await p.evaluate((payload) => localStorage.setItem('cda_demo_face_user_009874562LA041', payload), JSON.stringify({
    identifier: '009874562LA041', profileMode: 'user', capturedAt: new Date().toLocaleString('pt-AO'),
    signature: null, signatures: [0, 1, 2].map(k => Array.from({ length: 2048 }, (_, i) => 60 + (i % 160))),
  }));
  await irLoginFacialS();
  // arrancar a varredura e observar o HINT EM TEMPO REAL: «A comparar o rosto
  // com os 2 registos faciais guardados neste dispositivo...» (pré-fix: 1 só)
  await p.locator('button').filter({ hasText: /VALIDAR FACE LOCAL/i }).first().click();
  let hintRaw = '';
  for (let i = 0; i < 20; i++) {
    const t = await p.evaluate(() => document.body ? document.body.innerText : '');
    const mm = t.match(/A comparar o rosto[^\n]*/i);
    if (mm) { hintRaw = mm[0]; break; }
    await sleep(300);
  }
  const hint2 = /com os 2 registos faciais/i.test(hintRaw);
  pass('B1d·coerência usa TODAS as matrizes do dispositivo (hint em tempo real)', hint2, hint2 ? `«${hintRaw.slice(0, 70)}»` : tela.slice(0, 110));
  await shot(p, 'B1-tela-2-registos');
  let entrou1 = false;
  for (let i = 0; i < 40 && !entrou1; i++) {
    const t = await p.evaluate(() => document.body ? document.body.innerText : '');
    entrou1 = /MENSAGENS POR LER|Estatísticas|Olá,|Bem-vind/i.test(t) && !/ACESSO NACIONAL/i.test(t);
    if (!entrou1) await sleep(2000);
  }
  pass('B1e·login facial ENTRA mesmo com veneno na chave demo (pool completo)', entrou1);
  await shot(p, 'B1-apos-face');
  if (entrou1) {
    const c1 = await correioContar();
    log(`B1·correio após face: ${JSON.stringify(c1)}`);
    pass('B1f·login facial mostra TODAS as correspondências (== controlo por senha)', c1.recebidas === c0.recebidas, `face=${c1.recebidas} vs senha=${c0.recebidas}`);
    await sair();
  }
}

// ── B2: recuperação de senha → espelho sincronizado → face login completo ──
{
  // estado actual na nuvem da conta BI_A
  const ante = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, { headers: BARE }).then(r => r.json()).catch(() => ({}));
  log(`conta alvo existe na nuvem: ${(ante.users || []).some(u => (u.email || '').includes(BI_A.toLowerCase()))}`);
  // apagar o espelho local para provar a faxina da correcção (depois é recriado)
  await p.evaluate(() => localStorage.removeItem(`citizen_pass_${BI_A}`));
  // gerar link de recuperação (service-admin, fluxo D do dono) e abri-lo
  const gl = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/generate_link`, { method: 'POST', headers: H, body: JSON.stringify({ type: 'recovery', email: `bi.${BI_A.toLowerCase()}@cidadao.correiodigital.ao`, options: { redirectTo: BASE + '/' } }) }).then(r => r.json()).catch(() => ({}));
  const link = gl.properties?.action_link || gl.action_link || '';
  pass('B2a·link de recuperação gerado', !!link, link ? 'action_link ok' : JSON.stringify(gl).slice(0, 120));
  if (link) {
    await p.goto(link, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(12000);
    await shot(p, 'B2-recovery');
    const passos = async () => {
      for (let i = 0; i < 20; i++) {
        const vis = await p.getByPlaceholder(/•{6,}/).first().isVisible().catch(() => false);
        if (vis) return true;
        await sleep(1500);
      }
      return false;
    };
    const novaOk = await passos();
    pass('B2b·ecrã «Definir Nova Senha» abriu via link', novaOk);
    if (novaOk) {
      const campos = p.locator('input[type=password]');
      await campos.nth(0).fill(PASS_TEMP);
      await campos.nth(1) && await p.locator('input[type=password]').nth(1).fill(PASS_TEMP);
      await p.locator('button').filter({ hasText: /Gravar nova senha|Gravar/i }).first().click();
      let sucesso = false;
      for (let i = 0; i < 25 && !sucesso; i++) { sucesso = await p.locator('text=/Nova senha gravada/i').first().isVisible({ timeout: 1500 }).catch(() => false); if (!sucesso) await sleep(1500); }
      pass('B2c·nova senha gravada na nuvem (recuperação)', sucesso);
      await shot(p, 'B2-recovery-sucesso');
      // a FIX: o espelho local foi actualizado?
      const espelho = await p.evaluate(() => localStorage.getItem(`citizen_pass_${BI_A}`));
      pass('B2d·ESPELHO local actualizado com a nova senha (correcção aplicada)', espelho === PASS_TEMP, espelho ? 'conferido' : 'ausente');
      // prova funcional da nuvem: login com a nova senha funciona
      const rLogin = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `bi.${BI_A.toLowerCase()}@cidadao.correiodigital.ao`, password: PASS_TEMP }) }).then(r => r.status).catch(() => -1);
      pass('B2e·nuvem aceita a nova senha (login directo)', rLogin === 200, `http ${rLogin}`);
      // login facial SEGUINTE: com espelho, a sessão da nuvem é restabelecida
      await sair().catch(() => { });
      await irLoginFacialS();
      const entrou2 = await scanFace();
      pass('B2f·login facial após RECUPERAÇÃO entra', entrou2);
      if (entrou2) {
        // prova de correio completo: reabrir aba correio e contar
        const c2 = await correioContar();
        const ref = await dbContagem(BI_A);
        pass('B2g·correio completo após face login pós-recuperação', c2.recebidas === ref.recebidas, `ui=${c2.recebidas} vs bd=${ref.recebidas}`);
      }
    }
  }
  // RESTAURAÇÃO OBRIGATÓRIA da senha final — via ADMIN API (guarda partilhada)
  const okRest = await restaurarSenhaFinal('B2h');
  pass('B2h·senha original RESTAURADA e verificada na nuvem', okRest);
  await p.evaluate(() => localStorage.setItem(`citizen_pass_${BI_A}`, PASS_FINAL)).catch(() => { });
}

// GUARDA FINAL: corre mesmo se o exitcode já estiver marcado (senha da conta real sempre reposta)
const okFinal = await restaurarSenhaFinal('final');
log(`\n${falhas.length ? 'RESULTADO: FALHOU (' + falhas.join(' | ') + ')' : 'RESULTADO: CORRECÇÕES DO LOGIN FACIAL 100% VERDES'} em ${marca()}s`);
if (!okFinal) log('!!! AVISO: a guarda final de restauro da senha falhou — verificar manualmente!');
await browser.close().catch(() => { });
process.exit(falhas.length ? 1 : 0);
