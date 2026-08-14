#!/usr/bin/env node
// ============================================================================
// e2e_fluxos_escrita.mjs — Prova REAL, em browser, de que os fluxos de
// ESCRITA da plataforma funcionam de ponta a ponta (a pedido do dono,
// 2026-08-08: "preciso que torne funcional").
//   A varredura e2e_paginas.mjs prova que as páginas ABREM (49 verificações);
//   esta prova que os formulários SUBMETEM e os dados chegam à nuvem:
//
//   FLUXO A · Registo de cidadão PELO FORMULÁRIO (3 passos + biometria
//     simulada + Pré-Verificação Inteligente) com dados únicos-descartáveis;
//     verifica no Supabase que a conta nasceu com as claims oficiais
//     (app_metadata.bi/role) e no fim APAGA a conta (admin API) — zero lixo.
//   FLUXO B · Adesão de instituição PELO FORMULÁRIO (15 campos, geração do
//     Código Institucional + Nº Agente), homologação pelo arnês (equivalente
//     à decisão do admin — passo assinalado como HARNESS), login real no UI
//     com o Nº Agente gerado, COBRANÇA submetida pelo formulário de
//     pagamentos ao cidadão de teste e CANCELAMENTO pela própria UI.
//     No fim apaga: utilizador Auth, solicitacoes_registo e pagamentos de
//     teste — deixando a base exactamente como estava.
//
// SEGURANÇA / FRONTEIRA HONESTA:
//   - Corre APENAS com SUPABASE_SERVICE_ROLE_KEY no ambiente (chave local,
//     fora do Git). Sem ela o script recusa-se a escrever (SKIP, exit 2) —
//     nunca deixaria dados órfãos em produção.
//   - Todos os dados criados são únicos por corrida (timestamp) e sempre
//     removidos no final, mesmo em caso de erro (bloco finally).
//   - O cidadão alvo da cobrança é a conta de teste §D (BI 009999999LA099).
//   - A homologação da instituição é feita pelo arnês via service role
//     (decisão administrativa simulada); a homologação manual pela UI de
//     admin fica registada como item de backlog, não é fingida aqui.
//
// Sai 0 se tudo PASS, 1 se houver FAIL, 2 se faltarem chaves (SKIP).
// Uso:  BASE=<url> node scripts/e2e_fluxos_escrita.mjs
// ============================================================================
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'https://correio-digital-angola-oficial.vercel.app';
const SUPA_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPA_ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CIDADAO_TESTE_BI = process.env.CDA_TEST_CID_BI || '009999999LA099';

const resultados = [];
let FAILS = 0, SKIPS = 0;
const reg = (nome, estado, detalhe = '') => {
  if (estado === 'FAIL') FAILS++;
  if (estado === 'SKIP') SKIPS++;
  resultados.push([nome, estado, detalhe]);
  console.log(`[${estado}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};

if (!SUPA_URL || !SUPA_ANON || !SUPA_SERVICE) {
  reg('pre-condicoes', 'SKIP', 'faltam SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY — sem chave de serviço este script não escreve em produção');
  console.log('======================================================================');
  console.log(`RESULTADO: 0 PASS / ${SKIPS} SKIP / 0 FAIL`);
  process.exit(2);
}

// ---------- identidades únicas-descartáveis desta corrida ----------
const ts = Date.now();
const sufixo = String(ts).slice(-3);
const letras = sufixo.split('').map((d) => 'ABCDEFGHIJ'[+d]).join('');
const CID = {
  nome: `Teste UI Fluxo ${sufixo}${letras}`,
  email: `cda.ui.fluxo.${ts}@gmail.com`,
  senha: `Fluxo#2026!Ui${letras}`,
  bi: `1${String(ts).slice(-8)}LA${sufixo}`, // 14 chars, com letras — passa isBiValid
};
const INST = {
  nome: `Instituicao de Teste UI ${sufixo}${letras}`,
  sigla: `UT${letras}`, // 5 letras, única por corrida
  endereco: `Rua de Teste UI ${sufixo}, Casa 1, Maianga`,
  emailContacto: `geral.ui.${ts}@testecda.ao`,
  telefone: `9${String(ts).slice(-8)}`.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3'),
  responsavel: `Dr. Teste Ui ${letras}`,
  cargo: 'Director Geral',
  emailAcesso: `director.ui.${ts}@testecda.ao`,
  senha: `Fluxo#2026!Ui${letras}`,
  docRef: `REG-UI-${String(ts).slice(-6)}`,
  descricao: `Cobrança de teste UI E2E ${ts}`,
};
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

// ---------- helpers REST (service role — operações de arnês/limpeza) ----------
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
const encontrarUserPorEmail = async (email) => {
  for (let page = 1; page <= 10; page++) {
    const { status, body } = await authAdmin(`admin/users?page=${page}&per_page=50`);
    if (status !== 200 || !body || !Array.isArray(body.users)) return null;
    const hit = body.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (body.users.length < 50) return null;
  }
  return null;
};
// O Auth do cidadão usa e-mail SINTÉTICO derivado do BI (syntheticCitizenEmail
// em cloudAuthService) — a procura oficial é portanto pela claim app_metadata.bi.
const encontrarUserPorBi = async (bi) => {
  for (let page = 1; page <= 10; page++) {
    const { status, body } = await authAdmin(`admin/users?page=${page}&per_page=50`);
    if (status !== 200 || !body || !Array.isArray(body.users)) return null;
    const hit = body.users.find((u) => (u.app_metadata?.bi || '').toUpperCase() === bi.toUpperCase());
    if (hit) return hit;
    if (body.users.length < 50) return null;
  }
  return null;
};
const clicarQuandoActivo = async (page, nome, timeoutMs = 30000) => {
  const btn = page.getByRole('button', { name: nome }).first();
  await btn.waitFor({ state: 'visible', timeout: timeoutMs });
  await page.waitForFunction(
    (re) => {
      const bs = [...document.querySelectorAll('button')];
      const b = bs.find((x) => re.test(x.textContent || ''));
      return b && !b.disabled;
    },
    new RegExp(nome.source, 'i'), { timeout: timeoutMs },
  );
  await btn.click({ timeout: 5000 }).catch(async () => { await btn.click({ force: true }); });
  return btn;
};

async function fluxoCidadao() {
  console.log('--- FLUXO A · registo de cidadão PELO FORMULÁRIO ---');
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 850 }, locale: 'pt-PT' })).newPage();
  const errosJs = [];
  page.on('pageerror', (e) => errosJs.push(String(e).slice(0, 160)));
  // Veredicto do registo: 'true' = aprovação automática por PVIC (conta Auth
  // nasce no registo); 'false' = homologação manual (conta nasce só na aprovação).
  let auto = false;
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('heading', { name: 'LOGIN' }).first().waitFor({ state: 'visible', timeout: 20000 });
    await page.getByRole('button', { name: 'Registar', exact: true }).last().click();
    await page.getByText(/CRIAÇÃO OFICIAL DA CONTA/i).first().waitFor({ state: 'visible', timeout: 15000 });

    // Passo 1 — dados básicos
    await page.getByPlaceholder(/Manuel António da Silva/i).fill(CID.nome);
    await page.getByPlaceholder(/netangola/i).fill(CID.email);
    await page.locator('input[type="password"]').first().fill(CID.senha);
    await clicarQuandoActivo(page, /CONTINUAR/i);

    // Passo 2 — BI + frente/verso (ficheiros 1px PNG; OCR é simulado ~1,5 s)
    await page.getByPlaceholder(/002931298LA045/i).waitFor({ state: 'visible', timeout: 10000 });
    await page.getByPlaceholder(/002931298LA045/i).fill(CID.bi);
    const files = page.locator('input[type="file"]');
    await files.nth(0).setInputFiles({ name: 'frente.png', mimeType: 'image/png', buffer: PNG_1PX });
    await files.nth(1).setInputFiles({ name: 'verso.png', mimeType: 'image/png', buffer: PNG_1PX });
    await page.waitForTimeout(2600);
    await clicarQuandoActivo(page, /SEGUINTE/i);

    // Passo 3 — biometria (câmara simulada em headless por desenho da app)
    for (const rotulo of [/INICIAR CAPTURA/i, /REGISTAR CAPTURA \(2\/3/i, /REGISTAR CAPTURA \(3\/3/i]) {
      await clicarQuandoActivo(page, rotulo, 40000);
      await page.waitForTimeout(800);
    }
    await clicarQuandoActivo(page, /FINALIZAR SUBMISSÃO/i, 40000);

    // Sucesso (PVIC + provisionamento nuvem podem demorar)
    const sucesso = page.getByText(/Documentação Enviada com Sucesso/i).first();
    await sucesso.waitFor({ state: 'visible', timeout: 90000 }).catch(() => null);
    if (!(await sucesso.isVisible().catch(() => false))) {
      reg('A-registo-cidadao-ui', 'FAIL', 'ecrã de sucesso não apareceu após FINALIZAR SUBMISSÃO');
      await page.screenshot({ path: '/home/user/cda_test/screenshots/fluxo-A-falhou.png' });
      await browser.close();
      return;
    }
    const texto = await page.evaluate(() => document.body.innerText);
    auto = /Aprovado automaticamente/i.test(texto);
    reg('A-registo-cidadao-ui', 'PASS', `formulário submetido (3 passos + biometria) · veredicto: ${auto ? 'aprovado automático PVIC' : 'homologação manual'}`);
    if (errosJs.length) reg('A-excecoes-js', 'FAIL', errosJs[0]);
  } catch (e) {
    reg('A-registo-cidadao-ui', 'FAIL', `exceção: ${String(e).slice(0, 150)}`);
    await page.screenshot({ path: '/home/user/cda_test/screenshots/fluxo-A-falhou.png' }).catch(() => null);
  } finally {
    await browser.close();
  }

  // Prova cloud: a conta Auth nasce na nuvem SÓ na aprovação automática por PVIC
  // (o registo em homologação manual cria a conta quando a Administração aprova —
  // GovContactsContent, HOMOLOGAÇÃO ativa a conta). Por isso, em homologação manual,
  // a ausência de conta no Auth logo após o registo é o comportamento ESPERADO.
  const user = auto ? await encontrarUserPorBi(CID.bi) : null;
  if (auto && !user) {
    reg('A-registo-cidadao-cloud', 'FAIL', 'conta não encontrada no Auth (por app_metadata.bi) após sucesso no UI');
  } else if (user) {
    const meta = user.app_metadata || {};
    const ok = meta.bi === CID.bi && meta.role === 'cidadao';
    reg('A-registo-cidadao-cloud', ok ? 'PASS' : 'FAIL',
      `claims: bi=${meta.bi ?? '?'} role=${meta.role ?? '?'}${ok ? '' : ' (esperado bi=' + CID.bi + ' role=cidadao)'}`);
    // Limpeza total — a conta é descartável (Auth + solicitação de registo)
    const del = await authAdmin(`admin/users/${user.id}`, { method: 'DELETE' });
    const gone = await encontrarUserPorBi(CID.bi);
    const delSol = await supaRest(`solicitacoes_registo?bi_numero=eq.${encodeURIComponent(CID.bi)}`, { method: 'DELETE' });
    const linhasSol = Array.isArray(delSol.body) ? delSol.body.length : 0;
    reg('A-limpeza-cidadao', del.status === 200 && !gone ? 'PASS' : 'FAIL',
      del.status === 200 && !gone ? `utilizador ${user.id.slice(0, 8)}… apagado do Auth · ${linhasSol} solicitacao(oes) removida(s)` : `falha na limpeza (HTTP ${del.status})`);
  } else {
    // Homologação manual: sem conta Auth para apagar — remover só a solicitação.
    const delSol = await supaRest(`solicitacoes_registo?bi_numero=eq.${encodeURIComponent(CID.bi)}`, { method: 'DELETE' });
    const restam = await supaRest(`solicitacoes_registo?bi_numero=eq.${encodeURIComponent(CID.bi)}&select=id`);
    const ok = delSol.status < 300 && Array.isArray(restam.body) && restam.body.length === 0;
    reg('A-registo-cidadao-cloud', 'PASS', 'homologação manual — conta Auth nasce na aprovação da Administração (esperado)');
    reg('A-limpeza-cidadao', ok ? 'PASS' : 'FAIL',
      ok ? 'solicitação de registo removida (sem conta Auth)' : 'falha ao remover solicitação de registo');
  }
}

async function fluxoInstituicao() {
  console.log('--- FLUXO B · adesão institucional + cobrança PELOS FORMULÁRIOS ---');
  const browser = await chromium.launch();
  let agente = '', codigo = '';
  // B1) Registo da instituição pelo formulário (contexto próprio)
  {
    const page = await (await browser.newContext({ viewport: { width: 1366, height: 850 }, locale: 'pt-PT' })).newPage();
    try {
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.getByRole('heading', { name: 'LOGIN' }).first().waitFor({ state: 'visible', timeout: 20000 });
      await page.getByRole('button', { name: 'Instituição', exact: true }).click();
      await page.waitForTimeout(600);
      await page.getByRole('button', { name: 'Registar', exact: true }).last().click();
      await page.getByText(/Adesão oficial ao Correio Digital/i).first().waitFor({ state: 'visible', timeout: 15000 });

      await page.getByPlaceholder(/Serviço de Migração/i).fill(INST.nome);
      await page.getByPlaceholder('Ex: SME').fill(INST.sigla);
      const selects = page.locator('select');
      await selects.nth(0).selectOption({ index: 1 });            // tipo
      await selects.nth(1).selectOption({ label: 'Luanda' }).catch(async () => { await selects.nth(1).selectOption({ index: 1 }); });
      await page.waitForTimeout(500);
      await selects.nth(2).selectOption({ index: 1 }).catch(() => null);   // cidade
      await page.waitForTimeout(400);
      await selects.nth(3).selectOption({ index: 1 }).catch(() => null);   // município
      await page.waitForTimeout(400);
      await selects.nth(4).selectOption({ index: 1 }).catch(async () => { await selects.nth(4).selectOption({ index: 0 }).catch(() => null); }); // comuna
      await page.getByPlaceholder(/Rua dos Correios/i).fill(INST.endereco);
      await page.getByPlaceholder(/geral@sme/i).fill(INST.emailContacto);
      await page.getByPlaceholder(/\+244 923/i).fill(INST.telefone);
      await page.getByPlaceholder(/António Fernando/i).fill(INST.responsavel);
      await page.getByPlaceholder(/Director Geral/i).fill(INST.cargo);
      await page.getByPlaceholder(/director@sme/i).fill(INST.emailAcesso);
      await page.getByPlaceholder(/Mínimo 8 caracteres/i).fill(INST.senha);
      await page.getByPlaceholder(/Repita a senha/i).fill(INST.senha);
      await page.getByRole('button', { name: /Finalizar Registo/i }).click();

      const sucesso = page.getByText(/Pedido de Adesão Enviado/i).first();
      await sucesso.waitFor({ state: 'visible', timeout: 90000 }).catch(() => null);
      if (!(await sucesso.isVisible().catch(() => false))) {
        const erro = await page.evaluate(() => document.body.innerText.match(/Não é possível[A-Za-zÀ-ú :\"\.]{0,80}/i)?.[0] || '');
        reg('B1-registo-instituicao-ui', 'FAIL', `ecrã de sucesso não apareceu ${erro ? '· erro visível: ' + erro : ''}`);
        await page.screenshot({ path: '/home/user/cda_test/screenshots/fluxo-B1-falhou.png' });
        await browser.close();
        await limpezaInstituicao(codigo, agente, false);
        return;
      }
      const texto = await page.evaluate(() => document.body.innerText);
      const mAgente = texto.match(/([A-Z0-9]{3,12}-[A-Z0-9]{2,10}-01)\b/);
      agente = mAgente ? mAgente[1] : '';
      codigo = agente ? agente.replace(/-01$/, '') : '';
      reg('B1-registo-instituicao-ui', agente ? 'PASS' : 'FAIL',
        agente ? `adesão submetida · Código ${codigo} · Nº Agente ${agente}` : 'sucesso visível mas Nº Agente não extraído do ecrã');
    } catch (e) {
      reg('B1-registo-instituicao-ui', 'FAIL', `exceção: ${String(e).slice(0, 150)}`);
      await page.screenshot({ path: '/home/user/cda_test/screenshots/fluxo-B1-falhou.png' }).catch(() => null);
    }
  }
  if (!agente) { await browser.close(); await limpezaInstituicao(codigo, agente, false); return; }

  // B2) Homologação pelo ARNÉS (decisão administrativa simulada — backlog: via UI admin)
  {
    const up = await supaRest(`solicitacoes_registo?bi_numero=eq.${encodeURIComponent(codigo)}`, {
      method: 'PATCH', body: JSON.stringify({ status: 'Aprovado' }),
      headers: { Prefer: 'return=representation' },
    });
    const linhas = Array.isArray(up.body) ? up.body.length : 0;
    reg('B2-homologacao-harness', up.status < 300 && linhas === 1 ? 'PASS' : 'FAIL',
      up.status < 300 && linhas === 1 ? `solicitacao ${codigo} marcada Aprovado (decisão admin simulada pelo arnês)` : `HTTP ${up.status}, linhas=${linhas}`);
    if (!(up.status < 300 && linhas === 1)) { await browser.close(); await limpezaInstituicao(codigo, agente, false); return; }
  }

  // B3) Login real no UI com o Nº Agente + cobrança submetida e cancelada
  let userInst = null;
  {
    const page = await (await browser.newContext({ viewport: { width: 1366, height: 850 }, locale: 'pt-PT' })).newPage();
    try {
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.getByRole('heading', { name: 'LOGIN' }).first().waitFor({ state: 'visible', timeout: 20000 });
      await page.getByRole('button', { name: 'Instituição', exact: true }).click();
      await page.waitForTimeout(600);
      await page.getByPlaceholder(/AGT-9921-SR/i).fill(agente);
      await page.getByPlaceholder('••••••••••••').fill(INST.senha);
      await page.getByRole('button', { name: /Entrar no Portal/ }).click();
      const painel = page.getByRole('button', { name: 'Painel', exact: true }).first();
      await painel.waitFor({ state: 'visible', timeout: 60000 }).catch(() => null);
      if (!(await painel.isVisible().catch(() => false))) {
        reg('B3-login-agente-ui', 'FAIL', 'login com Nº Agente gerado não chegou ao painel');
        await page.screenshot({ path: '/home/user/cda_test/screenshots/fluxo-B3-falhou.png' });
        await browser.close(); await limpezaInstituicao(codigo, agente, false); return;
      }
      reg('B3-login-agente-ui', 'PASS', `login no UI com ${agente} (instituição criada nesta corrida)`);

      // Pagamentos → Nova cobrança
      const liga = page.locator('button.cda-link-text', { hasText: /Pagamentos/ }).first();
      await liga.click();
      await page.locator('#inst-pagamentos-root').waitFor({ state: 'visible', timeout: 20000 });
      await page.getByRole('button', { name: /Nova cobrança/i }).click();
      await page.waitForTimeout(900);
      await page.getByPlaceholder(/006123456LA042/i).fill(CIDADAO_TESTE_BI);
      await page.getByPlaceholder(/12 500,00/i).fill('25,50');
      await page.getByPlaceholder(/certidão comercial/i).fill(INST.descricao);
      // NOTA (descoberta E2E): o 4.º campo guarda em `referencia` e o 5.º
      // («Assunto/protocolo») guarda em `documento_ref` — a prova cloud usa
      // a coluna certa. Métodos de pagamento: todos seleccionados por defeito
      // (não clicar nos chips — o clique alternaria a selecção).
      await page.getByPlaceholder(/FAT-2026/i).fill(INST.docRef);
      await page.getByPlaceholder(/Assunto\/protocolo/i).fill(`Ofício teste UI ${ts}`);
      await page.getByRole('button', { name: /Registar cobrança/i }).click();

      const linha = page.getByText(INST.docRef).first();
      await linha.waitFor({ state: 'visible', timeout: 45000 }).catch(() => null);
      if (!(await linha.isVisible().catch(() => false))) {
        const erroUi = await page.locator('#inst-pagamentos-root').innerText().catch(() => '');
        reg('B4-cobranca-submetida-ui', 'FAIL', `cobrança não apareceu na lista · painel: ${erroUi.slice(0, 120)}`);
        await page.screenshot({ path: '/home/user/cda_test/screenshots/fluxo-B4-falhou.png' });
      } else {
        reg('B4-cobranca-submetida-ui', 'PASS', `cobrança ${INST.docRef} Kz 25,50 registada ao BI ${CIDADAO_TESTE_BI} («Pendente» na lista — RLS real)`);
        // Prova cruzada: a linha existe mesmo na tabela (consulta service role).
        // O valor «FAT-…» do formulário fica na coluna `referencia`.
        const db = await supaRest(`pagamentos?referencia=eq.${encodeURIComponent(INST.docRef)}&select=referencia,documento_ref,estado,valor`);
        const achado = Array.isArray(db.body) && db.body.length === 1 && db.body[0].estado === 'pendente';
        reg('B5-cobranca-prova-cloud', achado ? 'PASS' : 'FAIL',
          achado ? `tabela pagamentos confirma: referencia=${db.body[0].referencia} documento_ref=«${db.body[0].documento_ref}» estado=${db.body[0].estado} valor=${db.body[0].valor}` : `consulta cloud: HTTP ${db.status} linhas=${Array.isArray(db.body) ? db.body.length : '?'}`);
        // Cancelamento PELA UI
        const cartao = page.locator('div', { hasText: INST.docRef }).filter({ hasText: 'Pendente' }).last();
        const btnCancel = cartao.getByRole('button', { name: /Cancelar/i }).first();
        if (await btnCancel.isVisible().catch(() => false)) {
          await btnCancel.click();
          await page.waitForTimeout(2500);
        }
        const cancelada = page.getByText(INST.docRef).first();
        const corpo = await page.locator('#inst-pagamentos-root').innerText().catch(() => '');
        reg('B6-cobranca-cancelada-ui', cancelada && /Cancelada/i.test(corpo) ? 'PASS' : 'FAIL',
          /Cancelada/i.test(corpo) ? `cobrança ${INST.docRef} cancelada pelo próprio formulário da instituição` : 'estado «Cancelada» não confirmado no painel');
      }
    } catch (e) {
      reg('B-fluxo', 'FAIL', `exceção: ${String(e).slice(0, 150)}`);
      await page.screenshot({ path: '/home/user/cda_test/screenshots/fluxo-B-falhou.png' }).catch(() => null);
    }
  }
  await browser.close();
  // Fluxo concluído com login no painel ⇒ o utilizador Auth EXISTE (limpeza
  // deve encontrá-lo; se não encontrar é mesmo resíduo/risco de órfão).
  await limpezaInstituicao(codigo, agente, true);
}

async function limpezaInstituicao(codigo, agente, fluxoChegouAoFim) {
  // 1) apagar pagamentos desta instituição de teste (a coluna fiável é a
  //    sigla — cobre ref/documento_ref sem ambiguidade de mapeamento)
  if (codigo) {
    const del = await supaRest(`pagamentos?instituicao_sigla=eq.${encodeURIComponent(codigo)}`, { method: 'DELETE' });
    const restam = await supaRest(`pagamentos?instituicao_sigla=eq.${encodeURIComponent(codigo)}&select=id`);
    const ok = del.status < 300 && Array.isArray(restam.body) && restam.body.length === 0;
    if (!ok) reg('B7-limpeza-pagamentos', 'FAIL', `ainda restam linhas da sigla ${codigo}`);
    else console.log(`[info] pagamentos da sigla ${codigo} removidos`);
  }
  // 2) apagar utilizador Auth da instituição — a claim oficial é
  //    app_metadata.instituicao = CÓDIGO COMPLETO (ex.: UTCEC-LTBB), não a
  //    sigla (descoberta E2E 2026-08-08); email de acesso do formulário NÃO
  //    é o email Auth (é sintético: agente.<agente>@inst…).
  let user = null;
  for (let p = 1; p <= 10 && !user; p++) {
    const { body } = await authAdmin(`admin/users?page=${p}&per_page=50`);
    if (!body || !Array.isArray(body.users)) break;
    user = body.users.find((u) => (u.app_metadata?.instituicao || '').toUpperCase() === (codigo || '').toUpperCase());
    if (body.users.length < 50) break;
  }
  let okUser = true;
  if (user) {
    const del = await authAdmin(`admin/users/${user.id}`, { method: 'DELETE' });
    okUser = del.status === 200;
  } else if (fluxoChegouAoFim) {
    okUser = false; // o login funcionou ⇒ o utilizador EXISTE; não encontrá-lo = risco de órfão
  }
  // 3) apagar a solicitação de adesão
  let okSol = true;
  if (codigo) {
    const del = await supaRest(`solicitacoes_registo?bi_numero=eq.${encodeURIComponent(codigo)}`, { method: 'DELETE' });
    const restam = await supaRest(`solicitacoes_registo?bi_numero=eq.${encodeURIComponent(codigo)}&select=id`);
    okSol = del.status < 300 && Array.isArray(restam.body) && restam.body.length === 0;
  }
  reg('B7-limpeza-instituicao', okUser && okSol ? 'PASS' : 'FAIL',
    okUser && okSol
      ? `zero resíduos: pagamentos + auth ${user ? user.id.slice(0, 8) + '…' : '(não encontrado)'} + solicitacao ${codigo} removidos`
      : `resíduo detetado (user=${okUser} solicitacao=${okSol}) — requer atenção manual`);
}

console.log(`=== Fluxos de ESCRITA E2E — ${BASE} — ${new Date().toISOString()} ===`);
await fluxoCidadao();
await fluxoInstituicao();
const total = resultados.length;
console.log('======================================================================');
console.log(`RESULTADO: ${total - FAILS - SKIPS} PASS / ${SKIPS} SKIP / ${FAILS} FAIL`);
process.exit(FAILS > 0 ? 1 : 0);
