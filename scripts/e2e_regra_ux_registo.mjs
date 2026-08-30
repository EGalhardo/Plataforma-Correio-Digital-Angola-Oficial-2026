// ============================================================================
// e2e — REGRA UX: PROCESSAMENTO EM SEGUNDO PLANO E FEEDBACK IMEDIATO
// (v37.78.17 · docs/REGRAS_UX_PROCESSAMENTO_EM_SEGUNDO_PLANO.md)
//
// Fluxo base: Registo de Cidadão (RegisterStepper). Verifica:
//   T1  confirmação IMEDIATA — popup «Registo Concluído» (Nº de Acesso = B.I.
//       + senha do passo 1 + «está a ser analisado») aparece <4s após o clique
//       em «VALIDAR COM IA E CONCLUIR» (antes, os uploads+PVI bloqueavam);
//   T2  distinção recebido≠concluído — o popup diz «recebido … a ser analisado»
//       e o ecrã de sucesso mostra o chip vivo «Análise em curso»;
//   T3  conta utilizável IMEDIATAMENTE — login com B.I.+senha entra na app com
//       a conta ainda pendente (gravação local instantânea, D3);
//   T4  correspondência oficial de recepção no canal da Administração
//       (homologationStore: thread + status pending);
//   T5  o processamento em segundo plano CORRE — em ≤150s ocorre um desfecho:
//       aprovado (thread de aprovação + status active) | correcções (thread com
//       «necessitam de correcção») | pendente p/ homologação (linha na nuvem
//       solicitacoes_registo com o B.I. — a IA não aprovou, F28);
//   T6  gravação local actualizada pelo desfecho (gov_admin_citizens).
//       analiseEstado ∈ {em_analise, aprovado, correcoes};
//   T7  dup-check SÍNCRONO — repetir o registo com o MESMO B.I. dá erro
//       legítimo («já se encontra registado») no passo 3, SEM popup de sucesso.
// Uso: BASE=<url> node scripts/e2e_regra_ux_registo.mjs   (sai 0 se tudo PASS)
// ============================================================================
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const TS = Date.now();
const TESTE = {
  bi: '008471205LA045',
  nome: 'UX Teste Automato',
  email: 'ux.teste.auto@cda-test.ao',
  email2: 'ux.teste.auto2@cda-test.ao',
  senha: 'TesteUx2026!',
  nascimento: '1990-05-12',
};
const FRENTE = '/home/user/cda_test/bi_teste_ux_frente.png';
const VERSO = '/home/user/cda_test/bi_teste_ux_verso.png';
const SS = '/home/user/cda_test/screenshots';

const env = {};
for (const linha of readFileSync('/home/user/Plataforma-Correio-Digital-Angola-Oficial-2026/.env', 'utf8').split('\n')) {
  const m = linha.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, '');
}
const SUPA = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' };

let FAILS = 0;
const reg = (nome, estado, detalhe = '') => {
  if (estado === 'FAIL') FAILS++;
  console.log(`[${estado}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};
const supa = async (path, opts = {}) => {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  return { status: r.status, body: await r.json().catch(() => null) };
};

// ---------- limpeza prévia (nuvem) para re-execuções determinísticas ----------
const limparNuvem = async () => {
  try {
    await supa(`solicitacoes_registo?bi_numero=eq.${TESTE.bi}`, { method: 'DELETE' });
    await supa(`solicitacoes_registo?email=eq.${encodeURIComponent(TESTE.email)}`, { method: 'DELETE' });
    await supa(`profiles?bi_number=eq.${TESTE.bi}`, { method: 'DELETE' });
    await supa(`notifications?target_bi=eq.${TESTE.bi}`, { method: 'DELETE' });
    const au = await fetch(`${SUPA}/auth/v1/admin/users`, { headers: H });
    const lista = au.ok ? await au.json() : { users: [] };
    for (const u of lista.users || []) {
      if (u.email === TESTE.email || (u.user_metadata || {}).bi === TESTE.bi) {
        await fetch(`${SUPA}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers: H });
      }
    }
    reg('X-limpeza-previa', 'PASS', 'resíduos de execuções anteriores removidos (fila, profiles, Auth, notificações)');
  } catch (e) {
    reg('X-limpeza-previa', 'PASS', 'best-effort (ignorado): ' + String(e).slice(0, 80));
  }
};
await limparNuvem();

const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'pt-PT' });
const page = await ctx.newPage();
const errosJs = [];
page.on('pageerror', (e) => errosJs.push(String(e).slice(0, 150)));

const limparEstado = async () => { await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }); };

// ---------- preencher o stepper até ao passo 3 ----------
let seqPreenchimento = 0;
const preencherRegisto = async (email, senha) => {
  seqPreenchimento += 1;
  await page.goto(`${BASE}?cb=${TS}-r${seqPreenchimento}#/registar`, { waitUntil: 'domcontentloaded' });
  const inputNome = page.locator('input[type="text"], input:not([type])').first();
  try {
    await inputNome.waitFor({ state: 'visible', timeout: 20000 });
  } catch {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await inputNome.waitFor({ state: 'visible', timeout: 25000 });
  }
  // passo 1 — nome, email, senha, confirmação
  await page.locator('input[type="text"], input:not([type])').first().fill(TESTE.nome);
  await page.locator('input[type="email"]').first().fill(email);
  const passes = page.locator('input[type="password"]');
  await passes.nth(0).fill(senha);
  await passes.nth(1).fill(senha);
  await page.screenshot({ path: `${SS}/regraUX_passo1.png` });
  await page.getByRole('button', { name: /continuar/i }).first().click();
  // passo 2 — B.I., data de nascimento, sexo, frente+verso
  await page.locator('input[type="date"]').first().waitFor({ state: 'visible', timeout: 30000 });
  const biInput = page.locator('input[type="text"], input:not([type])').first();
  await biInput.fill(TESTE.bi);
  await page.locator('input[type="date"]').first().fill(TESTE.nascimento);
  await page.locator('select').first().selectOption('M');
  const files = page.locator('input[type="file"]');
  await files.nth(0).setInputFiles(FRENTE);
  await files.nth(1).setInputFiles(VERSO);
  await page.waitForTimeout(1500); // leitura/preview das faces
  await page.screenshot({ path: `${SS}/regraUX_passo2.png` });
  await page.getByRole('button', { name: /seguinte/i }).first().click();
  // passo 3 — pronto para concluir
  await page.getByRole('button', { name: /validar com ia e concluir/i }).first().waitFor({ state: 'visible', timeout: 30000 });
  await page.screenshot({ path: `${SS}/regraUX_passo3.png` });
};

// ============================================================ T1+T2 · IMEDIATO
await limparEstado();
await preencherRegisto(TESTE.email, TESTE.senha);
const t0 = Date.now();
await page.getByRole('button', { name: /validar com ia e concluir/i }).first().click();
const modalSeletor = 'text=/Registo Concluído/i';
await page.locator(modalSeletor).first().waitFor({ state: 'visible', timeout: 30000 });
const tPopup = Date.now() - t0;
const modalTxt = await page.evaluate(() => document.body.innerText);
reg('T1-popup-imediato', tPopup < 4000 ? 'PASS' : 'FAIL', `popup «Registo Concluído» visível ${tPopup}ms após o clique (meta <4000ms; antes a PVI bloqueava dezenas de segundos)`);
const dizAnalisado = /recebido com sucesso e está a ser analisado/i.test(modalTxt);
const temBI = modalTxt.includes(TESTE.bi);
const temSenha = modalTxt.includes(TESTE.senha);
const temNumAcesso = /nº de acesso/i.test(modalTxt);
reg('T2-recebido-vs-concluido', dizAnalisado && temBI && temSenha && temNumAcesso ? 'PASS' : 'FAIL',
  `popup distingue «recebido» de «concluído»: analisado=${dizAnalisado} · Nº de Acesso=${temNumAcesso} · B.I.=${temBI} · senha=${temSenha}`);
await page.screenshot({ path: `${SS}/regraUX_T1_popup_credenciais.png` });

// chip vivo no ecrã de sucesso
let chipAnalise = false;
for (let tent = 0; tent < 5 && !chipAnalise; tent += 1) {
  await page.waitForTimeout(700);
  chipAnalise = await page.evaluate(() => /análise em curso|aprovado|correc/i.test(document.body.innerText));
}
reg('T2-chip-analise-em-curso', chipAnalise ? 'PASS' : 'FAIL', 'ecrã de sucesso mostra o estado vivo da análise (chip)');

// ============================================================ T3 · LOGIN IMEDIATO
await page.getByRole('button', { name: /^ok$/i }).first().click();
await page.waitForTimeout(800);
await page.goto(`${BASE}?cb=${TS + 1}#/login`, { waitUntil: 'domcontentloaded' });
await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 30000 });
await page.locator('input[type="text"], input:not([type])').first().fill(TESTE.bi);
await page.locator('input[type="password"]').first().fill(TESTE.senha);
await page.screenshot({ path: `${SS}/regraUX_T3_login_pendente.png` });
await page.getByRole('button', { name: /entrar/i }).first().click().catch(() => {});
await page.waitForTimeout(13000);
const txtPosLogin = await page.evaluate(() => document.body.innerText);
const entrou = !/iniciar sessão/i.test(txtPosLogin) && ( /correio|contactos|documento/i.test(txtPosLogin) );
const estadoPendenteVisivel = /pendente|homologa|análise/i.test(txtPosLogin);
reg('T3-login-imediato-conta-pendente', entrou ? 'PASS' : 'FAIL',
  entrou ? `login com B.I.+senha funcionou com a análise ainda a decorrer${estadoPendenteVisivel ? ' (estado pendente/analise visível)' : ''}` : 'não entrou na aplicação com a conta recém-criada');
await page.screenshot({ path: `${SS}/regraUX_T3_dentro.png` });

// ============================================================ T4 · recepção oficial
const homol = await page.evaluate((bi) => {
  const st = JSON.parse(localStorage.getItem('cda_homologation_statuses_v1') || '{}');
  const th = JSON.parse(localStorage.getItem('cda_homologation_threads_v1') || '{}');
  const cid = (JSON.parse(localStorage.getItem('gov_admin_citizens') || '[]')).find((c) => String(c.biNumber || '').toUpperCase() === bi);
  const thread = th[bi] || [];
  return {
    status: st[bi] ? st[bi].status : null,
    temMsgRecepcao: thread.some((m) => /recebido|registo foi submetido|homologação/i.test(m.text || '')),
    nMsgs: thread.length,
    analiseEstado: cid ? cid.analiseEstado : null,
    statusLocal: cid ? cid.status : null,
  };
}, TESTE.bi);
reg('T4-correspondencia-recepcao', homol.temMsgRecepcao ? 'PASS' : 'FAIL',
  `canal da Administração: status=${homol.status} · ${homol.nMsgs} msg(s)${homol.temMsgRecepcao ? ' com recepção oficial' : ' SEM mensagem de recepção'}`);
reg('T4-conta-local-criada', homol.statusLocal ? 'PASS' : 'FAIL',
  `gov_admin_citizens: status="${homol.statusLocal}" · analiseEstado="${homol.analiseEstado}"`);

// ============================================================ T5+T6 · desfecho bg
let desfecho = null;
const tIni = Date.now();
while (Date.now() - tIni < 150000) {
  await page.waitForTimeout(5000);
  const s = await page.evaluate((bi) => {
    const st = JSON.parse(localStorage.getItem('cda_homologation_statuses_v1') || '{}');
    const th = JSON.parse(localStorage.getItem('cda_homologation_threads_v1') || '{}');
    const cid = (JSON.parse(localStorage.getItem('gov_admin_citizens') || '[]')).find((c) => String(c.biNumber || '').toUpperCase() === bi);
    const thread = th[bi] || [];
    return {
      homStatus: st[bi] ? st[bi].status : null,
      aprovadoMsg: thread.some((m) => /aprovad/i.test(m.text || '')),
      correcoesMsg: thread.some((m) => /necessitam de correcção|correc/i.test(m.text || '')),
      analiseEstado: cid ? cid.analiseEstado : null,
    };
  }, TESTE.bi);
  if (s.aprovadoMsg || s.homStatus === 'active' || s.analiseEstado === 'aprovado') { desfecho = { tipo: 'aprovado', ...s }; break; }
  if (s.correcoesMsg || s.analiseEstado === 'correcoes') { desfecho = { tipo: 'correcoes', ...s }; break; }
  // F28 legítimo: a IA não aprovou ⇒ fila na nuvem com Pendente
  const fila = (await supa(`solicitacoes_registo?select=id,status,bi_numero&bi_numero=eq.${TESTE.bi}&limit=1`)).body;
  if (fila && fila.length) { desfecho = { tipo: `pendente-homologacao (fila status="${fila[0].status}")`, ...s }; break; }
}
if (desfecho) {
  reg('T5-processamento-segundo-plano', 'PASS', `desfecho em ${Math.round((Date.now() - tIni) / 1000)}s: ${desfecho.tipo} · homStatus=${desfecho.homStatus}`);
  reg('T6-registo-local-actualizado', desfecho.analiseEstado ? 'PASS' : 'FAIL', `analiseEstado="${desfecho.analiseEstado}"`);
} else {
  reg('T5-processamento-segundo-plano', 'FAIL', 'sem desfecho em 150s (nem fila na nuvem nem notificação)');
  reg('T6-registo-local-actualizado', 'FAIL', 'sem desfecho para avaliar');
}
await page.screenshot({ path: `${SS}/regraUX_T5_desfecho.png` });

// ============================================================ T7 · dup-check síncrono
await limparEstado();
await preencherRegisto(TESTE.email2, TESTE.senha);
await page.getByRole('button', { name: /validar com ia e concluir/i }).first().click();
await page.waitForTimeout(9000); // dup-check é rápido, mas o bg pode ter acabado de gravar
const txtDup = await page.evaluate(() => document.body.innerText);
const erroDup = /já se encontra registado/i.test(txtDup);
const semPopupSucesso = !/Registo Concluído/i.test(txtDup);
reg('T7-dup-check-sincrono', erroDup && semPopupSucesso ? 'PASS' : 'FAIL',
  erroDup ? 'erro legítimo de duplicado mostrado no passo 3, SEM popup de sucesso (o fluxo não mascara erros)' : `erro de duplicado não apareceu (erro? popup=${!/Registo Concluído/i.test(txtDup) ? 'ausente' : 'PRESENTE'})`);
await page.screenshot({ path: `${SS}/regraUX_T7_duplicado.png` });

// ============================================================ T8 · RETOMA (fecho a meio)
// O utilizador fecha a página logo após o popup (bg morre a meio); ao voltar,
// o arranque da aplicação RETOMA o job — o registo não se perde.
await limparNuvem();
await limparEstado();
await preencherRegisto(TESTE.email, TESTE.senha);
await page.getByRole('button', { name: /validar com ia e concluir/i }).first().click();
await page.locator(modalSeletor).first().waitFor({ state: 'visible', timeout: 30000 });
await page.getByRole('button', { name: /^ok$/i }).first().click();
const jobGravado = await page.evaluate((bi) => {
  const jobs = JSON.parse(localStorage.getItem('cda_registo_bg_v1') || '{}');
  return !!jobs[bi];
}, TESTE.bi);
reg('T8-job-persistido-antes-do-bg', jobGravado ? 'PASS' : 'FAIL', 'job do pipeline gravado no localStorage antes do desfecho');
// mata o JS da página (bg morre) e reabre — a retoma arranca no boot da app
await page.close();
const page2 = await ctx.newPage();
await page2.goto(`${BASE}?cb=${TS + 2}#/login`, { waitUntil: 'domcontentloaded' });
let filaPosRetoma = null;
const tRet = Date.now();
while (Date.now() - tRet < 150000) {
  await page2.waitForTimeout(6000);
  const fila = (await supa(`solicitacoes_registo?select=id,status&bi_numero=eq.${TESTE.bi}&limit=1`)).body;
  if (fila && fila.length) { filaPosRetoma = fila[0]; break; }
}
reg('T8-retoma-apos-fecho', filaPosRetoma ? 'PASS' : 'FAIL',
  filaPosRetoma ? `página fechada antes do desfecho; na reabertura a retoma concluiu o registo (fila status="${filaPosRetoma.status}") em ${Math.round((Date.now() - tRet) / 1000)}s` : 'a fila não recebeu o registo após a retoma');
const jobsFinais = await page2.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('cda_registo_bg_v1') || '{}')));
reg('T8-job-concluido-e-limpo', jobsFinais.length === 0 ? 'PASS' : 'FAIL', jobsFinais.length ? `jobs remanescentes: ${jobsFinais.join(', ')}` : 'job apagado após o desfecho');
await page2.screenshot({ path: `${SS}/regraUX_T8_retoma.png` });

// ---------- limpeza final (nuvem de produção volta limpa) ----------
await (async () => {
  try {
    await supa(`solicitacoes_registo?bi_numero=eq.${TESTE.bi}`, { method: 'DELETE' });
    await supa(`solicitacoes_registo?email=eq.${encodeURIComponent(TESTE.email)}`, { method: 'DELETE' });
    await supa(`solicitacoes_registo?email=eq.${encodeURIComponent(TESTE.email2)}`, { method: 'DELETE' });
    await supa(`profiles?bi_number=eq.${TESTE.bi}`, { method: 'DELETE' });
    await supa(`notifications?target_bi=eq.${TESTE.bi}`, { method: 'DELETE' });
    const au = await fetch(`${SUPA}/auth/v1/admin/users`, { headers: H });
    const lista = au.ok ? await au.json() : { users: [] };
    for (const u of lista.users || []) {
      if (u.email === TESTE.email || u.email === TESTE.email2 || (u.user_metadata || {}).bi === TESTE.bi) {
        await fetch(`${SUPA}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers: H });
      }
    }
    reg('X-limpeza-final', 'PASS', 'linha de teste, profiles, Auth e notificações removidos da nuvem');
  } catch (e) {
    reg('X-limpeza-final', 'FAIL', String(e).slice(0, 120));
  }
})();

// ---------- erros de página ----------
reg('X-sem-erros-js', errosJs.length === 0 ? 'PASS' : 'FAIL', errosJs.length ? errosJs.slice(0, 3).join(' | ') : 'sem pageerror');

await browser.close();
console.log(errosJs.length === 0 && FAILS === 0 ? `\nTODOS PASS (${BASE})` : `\n${FAILS} FALHA(S) (${BASE})`);
process.exit(FAILS === 0 ? 0 : 1);
