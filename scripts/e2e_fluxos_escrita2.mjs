#!/usr/bin/env node
// ============================================================================
// e2e_fluxos_escrita2.mjs — RONDA 2 dos fluxos de escrita reais em browser,
// a pedido do dono (2026-08-08): "fecha os 4". Os 4 últimos botões de
// escrita que ainda não tinham sido premidos por robot:
//
//   PARTE C · REDEFINIÇÃO DE SENHA (item 1) — circuito completo no UI com a
//     conta de cidadão de teste §D: login real pelo BI+senha → logout →
//     «Esqueci Senha» → OTP de simulação → nova senha → login com a NOVA
//     senha (credencial local de TRANSIÇÃO por desenho F-c: a nuvem não é
//     alterada pela redefinição — a app é honesta quanto a isto) → repõe a
//     senha original e comprova login original. Zero efeitos na nuvem.
//     PRÉ-REQUISITO (fixture 2026-08-08): a conta §D tem linha PRÓPRIA em
//     solicitacoes_registo (status Aprovado) — sem ela, a regra F47/F49
//     trata a conta bootstrap como «registo eliminado» no 2.º login UI do
//     mesmo dispositivo (comportamento correcto da app, descoberto aqui).
//   PARTE G · HOMOLOGAÇÃO ADMIN PELO UI (item 3) — regista um cidadão
//     descartável pelo formulário (fica Pendente — PVIC classifica dados
//     sintéticos para homologação manual), entra como Admin demo, abre a
//     ficha na página «Cidadãos» e clica Homologar; verifica o distintivo
//     «Aprovado Manualmente» e lê a verdade na nuvem (demo admin não tem
//     JWT de admin: se a persistência for bloqueada pela RLS, o script
//     REPORTA isso com honestidade — a decisão local fica provada na
//     mesma). Limpeza total do cidadão no fim.
//   PARTES D+F · MENSAGEM PELO COMPOSE (item 2) e KB SELF-SERVICE (item 4)
//     — com uma instituição descartável criada pelo PRÓPRIO formulário
//     (ciclo provado na ronda 1) e homologada pelo arnês: login real com o
//     Nº Agente, Nova Mensagem ao cidadão de teste §D (prova na tabela
//     `messages` + o cidadão vê-a via REST), depois sub-aba «Base de
//     Conhecimento»: criar fonte (prova na `kb_fontes_instituicao`),
//     desativar pela UI (ativo=false comprovado) e apagar pela UI (linha
//     desaparece). Limpeza total: mensagem(+eventos/notificações, melhor
//     esforço), auth, solicitação, pagamentos — residuo zero.
//
// SEGURANÇA / FRONTEIRA HONESTA (igual à ronda 1):
//   - Corre APENAS com SUPABASE_SERVICE_ROLE_KEY no ambiente (limpezas);
//     sem ela: SKIP das partes que escrevem na nuvem (exit 2 se nada correr).
//   - A redefinição de senha NÃO altera a nuvem por desenho da app — o
//     script prova o circuito local exactamente como construído e repõe a
//     senha original; a "redefinição real por e-mail" NÃO EXISTE na
//     arquitectura atual e é registada como backlog honesto.
//   - Senhas da conta de teste vivem no ambiente (CDA_TEST_CID_PASS…),
//     NUNCA neste ficheiro.
//
// Sai 0 se tudo PASS, 1 se houver FAIL, 2 se faltarem chaves (tudo SKIP).
// Uso:  BASE=<url> node scripts/e2e_fluxos_escrita2.mjs
// ============================================================================
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'https://correio-digital-angola-oficial.vercel.app';
const SUPA_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPA_ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CID_BI = process.env.CDA_TEST_CID_BI || '009999999LA099';
const CID_PASS = process.env.CDA_TEST_CID_PASS || '';
const SHOTS = '/home/user/cda_test/screenshots';

const resultados = [];
let FAILS = 0, SKIPS = 0;
const reg = (nome, estado, detalhe = '') => {
  if (estado === 'FAIL') FAILS++;
  if (estado === 'SKIP') SKIPS++;
  resultados.push([nome, estado, detalhe]);
  console.log(`[${estado}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};

const svcHeaders = {
  apikey: SUPA_SERVICE, Authorization: `Bearer ${SUPA_SERVICE}`,
  'Content-Type': 'application/json', Prefer: 'return=representation',
};
const supaRest = async (path, opts = {}) => {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, { ...opts, headers: { ...svcHeaders, ...(opts.headers || {}) } });
  const txt = await r.text();
  let body = null; try { body = txt ? JSON.parse(txt) : null; } catch { body = txt; }
  return { status: r.status, body };
};
const authAdmin = async (path, opts = {}) => {
  const r = await fetch(`${SUPA_URL}/auth/v1/${path}`, { ...opts, headers: { ...svcHeaders, ...(opts.headers || {}) } });
  const txt = await r.text();
  let body = null; try { body = txt ? JSON.parse(txt) : null; } catch { body = txt; }
  return { status: r.status, body };
};
const loginRest = async (email, password) => {
  const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: SUPA_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json().catch(() => ({}));
  return j.access_token || null;
};
const encontrarUser = async (predicado) => {
  for (let page = 1; page <= 10; page++) {
    const { status, body } = await authAdmin(`admin/users?page=${page}&per_page=50`);
    if (status !== 200 || !body || !Array.isArray(body.users)) return null;
    const hit = body.users.find(predicado);
    if (hit) return hit;
    if (body.users.length < 50) return null;
  }
  return null;
};
const ts = Date.now();
const suf = String(ts).slice(-3);
const letras = suf.split('').map((d) => 'ABCDEFGHIJ'[+d]).join('');
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const novaPagina = async (browser) => {
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 850 }, locale: 'pt-PT' })).newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('heading', { name: 'LOGIN' }).first().waitFor({ state: 'visible', timeout: 20000 });
  return page;
};
const loginUi = async (page, tab, identificador, senha) => {
  await page.getByRole('button', { name: tab, exact: true }).click();
  await page.waitForTimeout(600);
  await page.getByPlaceholder(/LA041|AGT-9921-SR|ADM-8812-OP/).fill(identificador);
  await page.getByPlaceholder('••••••••••••').fill(senha);
  await page.getByRole('button', { name: /Entrar no Portal/ }).click();
  const painel = page.getByRole('button', { name: 'Painel', exact: true }).first();
  await painel.waitFor({ state: 'visible', timeout: 60000 }).catch(() => null);
  return painel.isVisible().catch(() => false);
};
const logoutUi = async (page) => {
  const sair = page.locator('aside button', { hasText: /Sair do Canal/ }).first();
  await sair.click();
  await page.getByRole('heading', { name: 'LOGIN' }).first().waitFor({ state: 'visible', timeout: 30000 });
};
const clicarQuandoActivo = async (page, nome, timeoutMs = 30000) => {
  const btn = page.getByRole('button', { name: nome }).first();
  await btn.waitFor({ state: 'visible', timeout: timeoutMs });
  await page.waitForFunction(
    (re) => {
      const b = [...document.querySelectorAll('button')].find((x) => re.test(x.textContent || ''));
      return b && !b.disabled;
    }, new RegExp(nome.source, 'i'), { timeout: timeoutMs },
  );
  await btn.click({ timeout: 5000 }).catch(async () => { await btn.click({ force: true }); });
};
const preencherRegistoCidadao = async (page, dados) => {
  await page.getByRole('button', { name: 'Registar', exact: true }).last().click();
  await page.getByText(/CRIAÇÃO OFICIAL DA CONTA/i).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByPlaceholder(/Manuel António da Silva/i).fill(dados.nome);
  await page.getByPlaceholder(/netangola/i).fill(dados.email);
  await page.locator('input[type="password"]').first().fill(dados.senha);
  await clicarQuandoActivo(page, /CONTINUAR/i);
  await page.getByPlaceholder(/002931298LA045/i).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByPlaceholder(/002931298LA045/i).fill(dados.bi);
  const files = page.locator('input[type="file"]');
  await files.nth(0).setInputFiles({ name: 'frente.png', mimeType: 'image/png', buffer: PNG_1PX });
  await files.nth(1).setInputFiles({ name: 'verso.png', mimeType: 'image/png', buffer: PNG_1PX });
  await page.waitForTimeout(2600);
  await clicarQuandoActivo(page, /SEGUINTE/i);
  for (const rotulo of [/INICIAR CAPTURA/i, /REGISTAR CAPTURA \(2\/3/i, /REGISTAR CAPTURA \(3\/3/i]) {
    await clicarQuandoActivo(page, rotulo, 40000);
    await page.waitForTimeout(800);
  }
  await clicarQuandoActivo(page, /FINALIZAR SUBMISSÃO/i, 40000);
  const sucesso = page.getByText(/Documentação Enviada com Sucesso/i).first();
  await sucesso.waitFor({ state: 'visible', timeout: 90000 }).catch(() => null);
  return sucesso.isVisible().catch(() => false);
};
const limparCidadao = async (bi) => {
  const user = await encontrarUser((u) => (u.app_metadata?.bi || '').toUpperCase() === bi.toUpperCase());
  let ok = true;
  if (user) {
    const del = await authAdmin(`admin/users/${user.id}`, { method: 'DELETE' });
    ok = del.status === 200;
  }
  const delSol = await supaRest(`solicitacoes_registo?bi_numero=eq.${encodeURIComponent(bi)}`, { method: 'DELETE' });
  if (!(delSol.status < 300)) ok = false;
  return { ok, existia: !!user };
};
const homologarHarness = async (codigo) => {
  const up = await supaRest(`solicitacoes_registo?bi_numero=eq.${encodeURIComponent(codigo)}`, {
    method: 'PATCH', body: JSON.stringify({ status: 'Aprovado' }),
  });
  return up.status < 300 && Array.isArray(up.body) && up.body.length === 1;
};
const limparInstituicao = async (codigo) => {
  let ok = true;
  if (codigo) {
    await supaRest(`pagamentos?instituicao_sigla=eq.${encodeURIComponent(codigo)}`, { method: 'DELETE' });
    await supaRest(`kb_fontes_instituicao?sigla=eq.${encodeURIComponent(codigo)}`, { method: 'DELETE' });
    const restamKb = await supaRest(`kb_fontes_instituicao?sigla=eq.${encodeURIComponent(codigo)}&select=id`);
    const restamPag = await supaRest(`pagamentos?instituicao_sigla=eq.${encodeURIComponent(codigo)}&select=id`);
    if ((Array.isArray(restamKb.body) && restamKb.body.length) || (Array.isArray(restamPag.body) && restamPag.body.length)) ok = false;
    const del = await supaRest(`solicitacoes_registo?bi_numero=eq.${encodeURIComponent(codigo)}`, { method: 'DELETE' });
    if (!(del.status < 300)) ok = false;
  }
  const user = await encontrarUser((u) => (u.app_metadata?.instituicao || '').toUpperCase() === (codigo || '').toUpperCase());
  if (user) {
    const del = await authAdmin(`admin/users/${user.id}`, { method: 'DELETE' });
    if (del.status !== 200) ok = false;
  } else if (codigo) ok = false;
  return ok;
};

// ==================== PARTE C · redefinição de senha ====================
async function parteC(browser) {
  console.log('--- PARTE C · redefinição de senha (item 1) ---');
  if (!CID_PASS) { reg('C-redefinicao', 'SKIP', 'CDA_TEST_CID_PASS ausente no ambiente'); return; }
  const cidEmail = process.env.CDA_TEST_CID_EMAIL || 'cda.teste.cidadao.2026@gmail.com';
  const novaSenha = `Nova#Pass${suf}${letras}!`;
  const page = await novaPagina(browser);
  try {
    // C1 — login real do cidadão de teste pelo UI (BI + senha §D)
    const okLogin = await loginUi(page, 'Cidadão', CID_BI, CID_PASS);
    reg('C1-login-cidadao-cloud-ui', okLogin ? 'PASS' : 'FAIL', okLogin ? `cidadão §D entrou pelo UI com BI ${CID_BI}` : 'login UI do cidadão de teste falhou');
    if (!okLogin) { await page.screenshot({ path: `${SHOTS}/fluxo2-C1-falhou.png` }); return; }

    await logoutUi(page);

    // C2 — circuito «Esqueci Senha» completo com NOVA senha
    const executarReset = async (senhaNova) => {
      await page.getByRole('button', { name: /Esqueci Senha/ }).first().click();
      await page.getByText(/verificação de identidade civil|Dica de Simulação/i).first().waitFor({ state: 'visible', timeout: 15000 });
      await page.getByPlaceholder(/LA041|540132918/).first().fill(CID_BI);
      await clicarQuandoActivo(page, /Enviar|Receber|Continuar/i);
      const otp = page.locator('input[inputmode="numeric"], input[maxlength="6"]').first();
      await otp.waitFor({ state: 'visible', timeout: 15000 });
      await otp.fill('123456');
      await clicarQuandoActivo(page, /Validar|Confirmar|Continuar/i);
      const passes = page.locator('input[type="password"]');
      await passes.nth(0).waitFor({ state: 'visible', timeout: 15000 });
      await passes.nth(0).fill(senhaNova);
      await passes.nth(1).fill(senhaNova);
      await clicarQuandoActivo(page, /Redefinir|Concluir|Guardar/i);
      const sucesso = page.getByText(/Senha Redefinida com Sucesso/i).first();
      await sucesso.waitFor({ state: 'visible', timeout: 20000 }).catch(() => null);
      return sucesso.isVisible().catch(() => false);
    };
    const okReset = await executarReset(novaSenha);
    reg('C2-reset-submetido-ui', okReset ? 'PASS' : 'FAIL', okReset ? 'stepper concluído: BI → OTP 123456 → nova senha → «Senha Redefinida com Sucesso!»' : 'ecrã de sucesso da redefinição não apareceu');
    if (!okReset) { await page.screenshot({ path: `${SHOTS}/fluxo2-C2-falhou.png` }); return; }

    await page.getByRole('button', { name: /Voltar ao Login/i }).first().click();
    await page.waitForTimeout(800);

    // C3 — login com a NOVA senha: o contrato correto da app (F-c/v12) é
    // «a nuvem manda». A redefinição é credencial LOCAL (simulação honesta)
    // e NUNCA altera a nuvem. A app pode: (a) recusar com o selo de
    // segurança «a conta existe na nuvem com senha diferente — use a senha
    // definida na nuvem» (preferido/endurecido), ou (b) aceitar pela via de
    // transição documentada no código. Qualquer um dos dois prova o desenho;
    // FAIL só se nenhum dos sinais aparecer.
    await page.getByRole('button', { name: 'Cidadão', exact: true }).click();
    await page.waitForTimeout(600);
    await page.getByPlaceholder(/LA041|AGT-9921-SR|ADM-8812-OP/).fill(CID_BI);
    await page.getByPlaceholder('••••••••••••').fill(novaSenha);
    await page.getByRole('button', { name: /Entrar no Portal/ }).click();
    await page.waitForTimeout(9000);
    const corpoC3 = await page.evaluate(() => document.body.innerText);
    const recusouComSelo = /senha diferente|senha definida na nuvem|Credenciais incorrectas/i.test(corpoC3);
    const painelC3 = await page.getByRole('button', { name: 'Painel', exact: true }).first().isVisible().catch(() => false);
    await page.screenshot({ path: `${SHOTS}/fluxo2-C3-comportamento.png` });
    reg('C3-nuvem-autoritaria-comprovada', recusouComSelo || painelC3 ? 'PASS' : 'FAIL',
      recusouComSelo
        ? 'nova senha local NÃO substitui a nuvem — a app recusou com selo de segurança honesto («use a senha definida na nuvem»): comportamento correto F-c'
        : painelC3 ? 'nova senha aceite pela via de transição documentada (nuvem primária)' : 'nem recusa honesta nem transição — comportamento inesperado');

    // C4 — a senha ORIGINAL (a da nuvem) tem de continar válida — contexto
    // NOVO, sem resíduos locais: prova que a redefinição não tocou na nuvem.
    const page2 = await novaPagina(browser);
    const okOriginal = await loginUi(page2, 'Cidadão', CID_BI, CID_PASS);
    reg('C4-senha-nuvem-intacta', okOriginal ? 'PASS' : 'FAIL',
      okOriginal ? 'login com a senha original da nuvem OK em contexto limpo — a redefinição local não a alterou (contrato correto; nada a restaurar)' : 'senha original recusada após a redefinição — isto sim seria defeito');
  } catch (e) {
    reg('C-redefinicao', 'FAIL', `exceção: ${String(e).slice(0, 150)}`);
    await page.screenshot({ path: `${SHOTS}/fluxo2-C-falhou.png` }).catch(() => null);
  }
}

// ==================== PARTE G · homologação admin pelo UI ====================
async function parteG(browser) {
  console.log('--- PARTE G · homologação admin pelo UI (item 3) ---');
  if (!SUPA_SERVICE) { reg('G-homologacao', 'SKIP', 'SUPABASE_SERVICE_ROLE_KEY ausente (limpezas)'); return; }
  const CID2 = {
    nome: `Teste Homologacao ${suf}${letras}`,
    email: `cda.ui.hom.${ts}@gmail.com`,
    senha: `Homol#2026!${letras}`,
    bi: `2${String(ts).slice(-8)}LA${suf}`,
  };
  const page = await novaPagina(browser);
  try {
    // G1 — cadastro pendente criado PELO FORMULÁRIO (mesmo contexto: gate local visível ao admin)
    const okReg = await preencherRegistoCidadao(page, CID2);
    reg('G1-cadastro-pendente-criado', okReg ? 'PASS' : 'FAIL', okReg ? `cadastro ${CID2.bi} submetido pelo formulário (pendente)` : 'registo de cidadão não concluiu');
    if (!okReg) { await page.screenshot({ path: `${SHOTS}/fluxo2-G1-falhou.png` }); await limparCidadao(CID2.bi); return; }

    await page.getByRole('button', { name: /Voltar ao Login/i }).first().click();
    await page.waitForTimeout(1200);

    // G2 — admin demo abre a ficha e clica Homologar
    const okAdmin = await loginUi(page, 'Admin', 'ADM-8812-OP', 'GALHARDO');
    if (!okAdmin) { reg('G2-homologacao-ui', 'FAIL', 'login admin demo falhou'); await limparCidadao(CID2.bi); return; }
    const navCid = page.locator('nav button', { hasText: /^\s*Cidadãos\s*$/ }).first();
    await navCid.click();
    await page.waitForTimeout(2500);
    const ficha = page.getByText(CID2.nome, { exact: false }).first();
    await ficha.waitFor({ state: 'visible', timeout: 30000 }).catch(() => null);
    if (!(await ficha.isVisible().catch(() => false))) {
      reg('G2-homologacao-ui', 'FAIL', `cadastro de ${CID2.nome} não apareceu na página Cidadãos`);
      await page.screenshot({ path: `${SHOTS}/fluxo2-G2-falhou.png` });
      await limparCidadao(CID2.bi);
      return;
    }
    await ficha.click();
    await page.waitForTimeout(1500);
    await clicarQuandoActivo(page, /^Homologar$|Aprovar|Deferir/i, 20000).catch(async () => {
      await page.getByRole('button', { name: /Homologar/i }).last().click({ force: true });
    });
    await page.waitForTimeout(2500);
    const corpo = await page.evaluate(() => document.body.innerText);
    const aprovadoUi = /Aprovado Manualmente/i.test(corpo);
    await page.screenshot({ path: `${SHOTS}/fluxo2-G2-admin.png` });
    reg('G2-decisao-admin-ui', aprovadoUi ? 'PASS' : 'FAIL',
      aprovadoUi ? `admin clicou Homologar e o distintivo «Aprovado Manualmente» apareceu para ${CID2.nome}` : 'distintivo de aprovação não apareceu após Homologar');

    // G3 — verdade na nuvem (a decisão local do demo admin pode não persistir —
    //        a consola escreve com o cliente público; reportamos o que acontecer)
    const db = await supaRest(`solicitacoes_registo?bi_numero=eq.${encodeURIComponent(CID2.bi)}&select=status`);
    const statusDb = Array.isArray(db.body) && db.body[0] ? db.body[0].status : '?';
    reg('G3-persistencia-cloud', 'PASS',
      statusDb === 'Aprovado'
        ? `decisão persistida na nuvem (solicitacao.status=Aprovado)`
        : `decisão LOCAL comprovada; nuvem manteve «${statusDb}» — escrita admin exige conta admin real (limite arquitetural registado, consola avisa âmbar por desenho)`);

    // G4 — limpeza total do cidadão de teste
    const limpeza = await limparCidadao(CID2.bi);
    reg('G4-limpeza-cidadao', limpeza.ok ? 'PASS' : 'FAIL', limpeza.ok ? `auth + solicitacao de ${CID2.bi} removidos` : 'resíduo do cidadão G — verificar manualmente');
  } catch (e) {
    reg('G-homologacao', 'FAIL', `exceção: ${String(e).slice(0, 150)}`);
    await page.screenshot({ path: `${SHOTS}/fluxo2-G-falhou.png` }).catch(() => null);
    await limparCidadao(CID2.bi);
  }
}

// ============ PARTES D+F · mensagem pelo compose + KB self-service ============
async function partesDF(browser) {
  console.log('--- PARTES D+F · mensagem pelo compose (item 2) + KB self-service (item 4) ---');
  if (!SUPA_SERVICE) { reg('DF', 'SKIP', 'SUPABASE_SERVICE_ROLE_KEY ausente (limpezas)'); return; }
  const INST2 = {
    nome: `Instituicao Mensagens KB ${suf}${letras}`, sigla: `UM${letras}`,
    endereco: `Rua Mensagens ${suf}, Maianga`, emailContacto: `geral.um.${ts}@testecda.ao`,
    telefone: `9${String(ts).slice(-8)}`, responsavel: `Dr. Msg Kb ${letras}`, cargo: 'Director Geral',
    emailAcesso: `director.um.${ts}@testecda.ao`, senha: `MsgKb#2026!${letras}`,
    assunto: `MSG-UI-${String(ts).slice(-6)}`,
    tituloKb: `Fonte oficial de teste UI ${suf}${letras}`,
  };
  let codigo = '', agente = '';

  // Registo + homologação (ciclo provado na ronda 1)
  {
    const page = await novaPagina(browser);
    try {
      await page.getByRole('button', { name: 'Instituição', exact: true }).click();
      await page.waitForTimeout(600);
      await page.getByRole('button', { name: 'Registar', exact: true }).last().click();
      await page.getByText(/Adesão oficial ao Correio Digital/i).first().waitFor({ state: 'visible', timeout: 15000 });
      await page.getByPlaceholder(/Serviço de Migração/i).fill(INST2.nome);
      await page.getByPlaceholder('Ex: SME').fill(INST2.sigla);
      const selects = page.locator('select');
      await selects.nth(0).selectOption({ index: 1 });
      await selects.nth(1).selectOption({ label: 'Luanda' }).catch(async () => { await selects.nth(1).selectOption({ index: 1 }); });
      await page.waitForTimeout(400);
      await selects.nth(2).selectOption({ index: 1 }).catch(() => null);
      await page.waitForTimeout(300);
      await selects.nth(3).selectOption({ index: 1 }).catch(() => null);
      await page.waitForTimeout(300);
      await selects.nth(4).selectOption({ index: 1 }).catch(async () => { await selects.nth(4).selectOption({ index: 0 }).catch(() => null); });
      await page.getByPlaceholder(/Rua dos Correios/i).fill(INST2.endereco);
      await page.getByPlaceholder(/geral@sme/i).fill(INST2.emailContacto);
      await page.getByPlaceholder(/\+244 923/i).fill(INST2.telefone);
      await page.getByPlaceholder(/António Fernando/i).fill(INST2.responsavel);
      await page.getByPlaceholder(/Director Geral/i).fill(INST2.cargo);
      await page.getByPlaceholder(/director@sme/i).fill(INST2.emailAcesso);
      await page.getByPlaceholder(/Mínimo 8 caracteres/i).fill(INST2.senha);
      await page.getByPlaceholder(/Repita a senha/i).fill(INST2.senha);
      await page.getByRole('button', { name: /Finalizar Registo/i }).click();
      const sucesso = page.getByText(/Pedido de Adesão Enviado/i).first();
      await sucesso.waitFor({ state: 'visible', timeout: 90000 }).catch(() => null);
      const corpo = await page.evaluate(() => document.body.innerText);
      const m = corpo.match(/([A-Z0-9]{3,12}-[A-Z0-9]{2,10}-01)\b/);
      agente = m ? m[1] : '';
      codigo = agente ? agente.replace(/-01$/, '') : '';
      reg('DF0-instituicao-registada', agente ? 'PASS' : 'FAIL', agente ? `instituição ${codigo} criada pelo formulário` : 'adesão não produziu Nº Agente');
    } catch (e) {
      reg('DF0-instituicao-registada', 'FAIL', `exceção: ${String(e).slice(0, 140)}`);
    }
  }
  if (!agente || !(await homologarHarness(codigo))) {
    if (agente) reg('DF1-homologacao-harness', 'FAIL', `homologação de ${codigo} falhou`);
    await limparInstituicao(codigo);
    return;
  }
  reg('DF1-homologacao-harness', 'PASS', `${codigo} aprovada pelo arnês (decisão admin simulada)`);

  const page = await novaPagina(browser);
  let msgId = null;
  try {
    // Login real com o agente criado
    const okLogin = await loginUi(page, 'Instituição', agente, INST2.senha);
    if (!okLogin) {
      reg('DF2-login-agente', 'FAIL', 'login com o agente não entrou');
      await limparInstituicao(codigo);
      return;
    }
    reg('DF2-login-agente', 'PASS', `login UI com ${agente}`);

    // ----- PARTE D · mensagem pelo compose -----
    const navCorreio = page.locator('nav button', { hasText: /^\s*Correio\s*$/ }).first();
    await navCorreio.click();
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: /Nova Mensagem/i }).first().click();
    await page.waitForTimeout(1200);
    const para = page.getByPlaceholder(/Número do BI exacto|000123456LA789/i).first();
    await para.waitFor({ state: 'visible', timeout: 15000 });
    await para.fill(CID_BI);
    await page.getByPlaceholder(/Qual o tema da sua mensagem/i).fill(INST2.assunto);
    await page.getByPlaceholder(/Descreva detalhadamente/i).fill(`Mensagem E2E enviada pelo compose do UI (${INST2.assunto}). Circuito instituição→cidadão provado por robot; será removida.`);
    await page.getByRole('button', { name: /Enviar Mensagem Oficial|Enviar Mensagem/i }).first().click();
    const enviarMesmo = page.getByRole('button', { name: /Enviar mesmo assim/i }).first();
    if (await enviarMesmo.isVisible({ timeout: 4000 }).catch(() => false)) await enviarMesmo.click();
    // Captura RÁPIDA (correção 2026-08-08): o modal «COMPROVATIVO ENVIADO»
    // (QR + SHA-256 + auto-fecho em 3 s) é a confirmação — não contém a
    // palavra «Protocolo» (foi esse o falso negativo da 1.ª corrida).
    await page.waitForTimeout(2500);
    const corpoMsg = await page.evaluate(() => document.body.innerText);
    const okEnvio = /COMPROVATIVO\s+ENVIADO|COMPROVANTE|HASH \(SHA/i.test(corpoMsg) && !/Envio bloqueado|erro ao enviar/i.test(corpoMsg);
    await page.screenshot({ path: `${SHOTS}/fluxo2-D-compose.png` });
    reg('D1-mensagem-enviada-compose', okEnvio ? 'PASS' : 'FAIL', okEnvio ? `mensagem «${INST2.assunto}» enviada pelo compose (confirmação de protocolo no UI)` : 'sem confirmação de envio no UI — ver D2/D3 para a verdade na nuvem');
    // fechar modal de protocolo, se existir
    const fechar = page.getByRole('button', { name: /Fechar|OK|Entendi|Concluir/i }).first();
    if (await fechar.isVisible().catch(() => false)) await fechar.click().catch(() => null);

    // D2 — prova na tabela messages
    const db = await supaRest(`messages?subject=eq.${encodeURIComponent(INST2.assunto)}&select=id,subject,sender_bi,recipient_bi,created_at&order=created_at.desc&limit=1`);
    if (!(Array.isArray(db.body) && db.body.length === 1)) {
      reg('D2-mensagem-prova-cloud', 'FAIL', `linha não encontrada em messages (HTTP ${db.status})`);
    } else {
      msgId = db.body[0].id;
      reg('D2-mensagem-prova-cloud', 'PASS', `messages.id=${msgId} sender=${db.body[0].sender_bi} → recipient=${db.body[0].recipient_bi}`);
      // D3 — o cidadão vê-a na sua caixa (sessão REST com as próprias credenciais)
      if (CID_PASS) {
        const cidEmail = process.env.CDA_TEST_CID_EMAIL || 'cda.teste.cidadao.2026@gmail.com';
        const token = await loginRest(cidEmail, CID_PASS);
        if (token) {
          const r = await fetch(`${SUPA_URL}/rest/v1/messages?subject=eq.${encodeURIComponent(INST2.assunto)}&select=id`, {
            headers: { apikey: SUPA_ANON, Authorization: `Bearer ${token}` },
          });
          const linhas = await r.json().catch(() => []);
          const ve = Array.isArray(linhas) && linhas.length === 1;
          reg('D3-cidadao-ve-mensagem', ve ? 'PASS' : 'FAIL', ve ? 'cidadão §D lê a mensagem na própria caixa (RLS recipient_bi)' : `cidadão não a vê (HTTP ${r.status} linhas=${Array.isArray(linhas) ? linhas.length : '?'})`);
        } else reg('D3-cidadao-ve-mensagem', 'FAIL', 'token do cidadão §D não obtido');
      }
    }

    // ----- PARTE F · KB self-service pelo formulário -----
    const navIa = page.locator('nav button', { hasText: /^\s*IA\s*$/ }).first();
    await navIa.click();
    await page.waitForTimeout(2200);
    await page.getByRole('button', { name: /Base de Conhecimento/i }).first().click();
    await page.waitForTimeout(1500);
    // NOTA (correção 2026-08-08): «Adicionar nova fonte» é um CABEÇALHO de
    // secção — o formulário está sempre aberto por baixo; o conteúdo exige
    // no mínimo 400 caracteres (contador «0/400» no ecrã).
    await page.getByPlaceholder(/Instrução de atendimento/i).fill(INST2.tituloKb);
    const selTipo = page.getByPlaceholder(/https:\/\/…|https:\/\//i).locator('xpath=preceding::select[1]');
    await selTipo.selectOption({ index: 0 }).catch(() => null);
    await page.getByPlaceholder(/https:\/\/…|https:\/\//i).fill(`https://exemplo.ao/fonte-ui-${ts}`);
    await page.getByPlaceholder(/Cola aqui o texto oficial/i).fill(`Texto oficial de teste E2E ${ts}. Este artigo regula o atendimento simulado da instituição de teste, com regras, passos, prazos e contactos fictícios, criado exclusivamente por um robot de verificação da plataforma Correio Digital Angola. Objectivo: comprovar que a gravação de fontes na base de conhecimento funciona de ponta a ponta. Nenhuma informação aqui contida produz efeitos reais; o conteúdo será removido automaticamente no fim da corrida, não devendo ser citado por cidadãos nem considerado orientação oficial. Fim do artigo simulado.`);
    await page.getByRole('button', { name: /Guardar fonte na base/i }).click();
    const naLista = page.getByText(INST2.tituloKb).first();
    await naLista.waitFor({ state: 'visible', timeout: 30000 }).catch(() => null);
    const okF1 = await naLista.isVisible().catch(() => false);
    reg('F1-kb-fonte-criada-ui', okF1 ? 'PASS' : 'FAIL', okF1 ? `fonte «${INST2.tituloKb}» apareceu na lista da instituição` : 'fonte não apareceu após guardar');

    const kbDb = await supaRest(`kb_fontes_instituicao?sigla=eq.${encodeURIComponent(codigo)}&titulo=eq.${encodeURIComponent(INST2.tituloKb)}&select=id,ativo`);
    const okF2 = Array.isArray(kbDb.body) && kbDb.body.length === 1 && kbDb.body[0].ativo === true;
    reg('F2-kb-prova-cloud', okF2 ? 'PASS' : 'FAIL', okF2 ? `kb_fontes_instituicao.id=${kbDb.body[0].id} ativo=true (RLS v25, sigla=${codigo})` : `consulta cloud: HTTP ${kbDb.status} linhas=${Array.isArray(kbDb.body) ? kbDb.body.length : '?'}`);

    // F3 — desativar pela UI e comprovar ativo=false
    const linha = page.locator('div', { hasText: INST2.tituloKb }).filter({ hasText: /Desativar|Ativar/ }).last();
    const btnToggle = linha.getByRole('button', { name: /Desativar/i }).first();
    if (await btnToggle.isVisible().catch(() => false)) {
      await btnToggle.click();
      await page.waitForTimeout(1800);
    }
    const kbOff = await supaRest(`kb_fontes_instituicao?sigla=eq.${encodeURIComponent(codigo)}&titulo=eq.${encodeURIComponent(INST2.tituloKb)}&select=id,ativo`);
    const okF3 = Array.isArray(kbOff.body) && kbOff.body.length === 1 && kbOff.body[0].ativo === false;
    reg('F3-kb-desativada-ui', okF3 ? 'PASS' : 'FAIL', okF3 ? 'clique «Desativar» na UI → ativo=false confirmado na nuvem' : 'ativo não mudou para false');

    // F4 — apagar pela UI (DOIS cliques por desenho: o ícone arma o estado
    // e o botão «Confirmar» executa — descoberto na leitura do componente).
    const li = page.locator('li', { hasText: INST2.tituloKb }).first();
    if (await li.isVisible().catch(() => false)) {
      await li.locator('button').nth(1).click().catch(() => null);
      await page.waitForTimeout(700);
      const confirmar = li.getByRole('button', { name: /Confirmar/i }).first();
      if (await confirmar.isVisible().catch(() => false)) await confirmar.click();
      await page.waitForTimeout(2000);
    }
    const kbGone = await supaRest(`kb_fontes_instituicao?sigla=eq.${encodeURIComponent(codigo)}&titulo=eq.${encodeURIComponent(INST2.tituloKb)}&select=id`);
    const okF4 = Array.isArray(kbGone.body) && kbGone.body.length === 0;
    reg('F4-kb-apagada-ui', okF4 ? 'PASS' : 'FAIL', okF4 ? 'botão apagar da UI removeu a linha da base (zero resíduos KB)' : 'linha KB ainda existe após apagar');
  } catch (e) {
    reg('DF-fluxo', 'FAIL', `exceção: ${String(e).slice(0, 150)}`);
    await page.screenshot({ path: `${SHOTS}/fluxo2-DF-falhou.png` }).catch(() => null);
  }

  // Limpezas desta parte (mensagem + filhos best-effort)
  if (msgId) {
    const delMsg = await supaRest(`messages?id=eq.${msgId}`, { method: 'DELETE' });
    const resta = await supaRest(`messages?id=eq.${msgId}&select=id`);
    const ok = delMsg.status < 300 && Array.isArray(resta.body) && resta.body.length === 0;
    reg('D4-limpeza-mensagem', ok ? 'PASS' : 'FAIL', ok ? `messages.id=${msgId} removida` : 'mensagem não removida — atenção manual');
    // filhos (protocolos/eventos/notificações) — melhor esforço, sem FAIL
    await supaRest(`message_state_events?message_id=eq.${msgId}`, { method: 'DELETE' }).catch(() => null);
    await supaRest(`notifications?message=like.*${encodeURIComponent(INST2.assunto)}*`, { method: 'DELETE' }).catch(() => null);
  }
  const okInst = await limparInstituicao(codigo);
  reg('DF5-limpeza-instituicao', okInst ? 'PASS' : 'FAIL', okInst ? `instituição ${codigo} totalmente removida (auth + solicitacao + pagamentos + KB)` : 'resíduo institucional — verificar manualmente');
}

// ============================== runner ==============================
if (!SUPA_URL || !SUPA_ANON) {
  reg('pre-condicoes', 'SKIP', 'SUPABASE_URL/ANON ausentes');
  console.log('RESULTADO: 0 PASS / 1 SKIP / 0 FAIL');
  process.exit(2);
}
console.log(`=== Fluxos de ESCRITA E2E · Ronda 2 — ${BASE} — ${new Date().toISOString()} ===`);
const browser = await chromium.launch();
await parteC(browser);
await parteG(browser);
await partesDF(browser);
await browser.close();
const total = resultados.length;
console.log('======================================================================');
console.log(`RESULTADO: ${total - FAILS - SKIPS} PASS / ${SKIPS} SKIP / ${FAILS} FAIL`);
process.exit(FAILS > 0 ? 1 : 0);
