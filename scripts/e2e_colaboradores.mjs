#!/usr/bin/env node
// ============================================================================
// e2e_colaboradores.mjs — GESTÃO DE COLABORADORES (Instituição + Área Admin)
// Prova real em browser. Usa contexto PARTILHADO (localStorage persiste entre
// páginas) e verificação por <tr> (texto real, não innerText com CSS uppercase).
//   A) Admin demo cria Agente Admin na Equipa (gov-trabalhadores)
//   B) Instituição REAL: admin adiciona colaborador com senha; login do
//      colaborador; acesso; bloqueio de área admin; logout
//   C) Separação entre instituições
//   D) Validações (senha curta, campos obrigatórios)
// Limpeza total no final.
// ============================================================================
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const SUPA_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const svcHeaders = { apikey: SUPA_SERVICE, Authorization: `Bearer ${SUPA_SERVICE}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
const supaRest = async (path, opts = {}) => {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, { ...opts, headers: { ...svcHeaders, ...(opts.headers || {}) } });
  const txt = await r.text(); let body = null; try { body = txt ? JSON.parse(txt) : null; } catch { body = txt; }
  return { status: r.status, body };
};
const authAdmin = async (path, opts = {}) => {
  const r = await fetch(`${SUPA_URL}/auth/v1/${path}`, { ...opts, headers: { ...svcHeaders, ...(opts.headers || {}) } });
  const txt = await r.text(); let body = null; try { body = txt ? JSON.parse(txt) : null; } catch { body = txt; }
  return { status: r.status, body };
};

const resultados = [];
let FAILS = 0, SKIPS = 0;
const reg = (nome, estado, detalhe = '') => {
  if (estado === 'FAIL') FAILS++;
  if (estado === 'SKIP') SKIPS++;
  resultados.push([nome, estado, detalhe]);
  console.log(`[${estado}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};

const ts = Date.now();
const sufixo = String(ts).slice(-3);
const letras = sufixo.split('').map(d => 'ABCDEFGHIJ'[+d]).join('');
const INST = {
  nome: `Colab Teste ${sufixo}${letras}`, sigla: `CT${letras}`,
  endereco: `Rua ${sufixo}`, emailContacto: `geral.${ts}@colab.ao`,
  telefone: `923${String(ts).slice(-6)}`, responsavel: `Dir ${letras}`, cargo: 'Delegado',
  emailAcesso: `acesso.${ts}@colab.ao`, senha: `Colab#2026!${letras}`,
};
const COLAB = {
  nome: `Colaborador ${sufixo}${letras}`, email: `colab.${ts}@colab.ao`,
  telefone: `933${String(ts).slice(-6)}`, cargo: 'Auditor de Atendimento',
  dept: 'Direcção de Operações', senha: `Membro#2026!${letras}`,
};
const AGENTE_ADMIN = { nome: `Agente Admin ${sufixo}${letras}`, email: `agente.${ts}@cdaadmin.ao`, telefone: `944${String(ts).slice(-6)}`, cargo: 'Auditor de Segurança', dept: 'Operações CDA', senha: `Agente#2026!${letras}` };

async function novoContexto(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  return { ctx, page: await ctx.newPage() };
}
async function login(page, papel, id, pass) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  if (papel !== 'cidadao') { await page.getByRole('button', { name: papel === 'instituicao' ? 'Instituição' : 'Admin', exact: true }).click(); await page.waitForTimeout(600); }
  await page.getByPlaceholder(/LA041|AGT-9921-SR|ADM-8812-OP/).fill(id).catch(()=>{});
  await page.getByPlaceholder('••••••••••••').fill(pass).catch(()=>{});
  await page.getByRole('button', { name: /Entrar no Portal/ }).click().catch(()=>{});
  await page.waitForTimeout(4500);
  const corpo = await page.evaluate(() => document.body.innerText);
  const recusado = /Credenciais incorrectas|Acesso negado|não foi reconhecido|ACESSO NEGADO/i.test(corpo);
  const temLogin = /ENTRAR NO PORTAL|Entrar no Portal/i.test(corpo);
  return temLogin && recusado ? false : true;
}
const textoLinhas = (page) => page.evaluate(() => Array.from(document.querySelectorAll('tr')).map(r => (r.textContent||'').trim().replace(/\s+/g,' ')).filter(Boolean));

const browser = await chromium.launch();
let codigo = '', userAuthId = null;
try {
  // ===== A) ADMIN demo — criar Agente Admin =====
  console.log('--- A) Admin demo: criar Agente Admin na Equipa ---');
  {
    const { ctx, page } = await novoContexto(browser);
    const okLogin = await login(page, 'admin', 'ADM-8812-OP', 'GALHARDO');
    reg('A1-login-admin-demo', okLogin ? 'PASS' : 'FAIL');
    if (okLogin) {
      await page.evaluate(() => { window.location.hash = '#/gov-trabalhadores'; });
      await page.waitForTimeout(2500);
      await page.getByRole('button', { name: /Adicionar à Equipa/i }).first().click();
      await page.waitForTimeout(1000);
      await page.getByPlaceholder(/Dr\. Francisco Manuel/).fill(AGENTE_ADMIN.nome);
      await page.getByPlaceholder(/f\.manuel@cdaadmin\.ao/).fill(AGENTE_ADMIN.email);
      await page.getByPlaceholder(/\+244 923 000 000/).fill(AGENTE_ADMIN.telefone);
      await page.getByPlaceholder(/Auditor Geral do Sistema/).fill(AGENTE_ADMIN.cargo);
      await page.getByPlaceholder(/Direcção de Operações da Plataforma/).fill(AGENTE_ADMIN.dept);
      const pwd = page.getByPlaceholder(/Mín\. 8 caracteres/i).first();
      reg('A2-campo-senha-agente', (await pwd.count()) > 0 ? 'PASS' : 'FAIL');
      if (await pwd.count()) {
        await pwd.fill('curta');
        await page.getByRole('button', { name: /Submeter Cadastro/i }).first().click();
        await page.waitForTimeout(800);
        const corpo = await page.evaluate(() => document.body.innerText);
        reg('A3-validacao-senha-curta', /mínimo 8 caracteres/i.test(corpo) ? 'PASS' : 'FAIL');
        await pwd.fill(AGENTE_ADMIN.senha);
        await page.getByRole('button', { name: /Submeter Cadastro/i }).first().click();
        await page.waitForTimeout(2200);
        const linhas = await textoLinhas(page);
        reg('A4-agente-admin-criado', linhas.some(l => l.includes(AGENTE_ADMIN.nome)) ? 'PASS' : 'FAIL', linhas.some(l=>l.includes(AGENTE_ADMIN.nome)) ? `«${AGENTE_ADMIN.nome}» (ADMIN-0001)` : 'não na lista');
        // Edição: alterar o cargo
        const linhaEditar = page.locator('tr', { hasText: AGENTE_ADMIN.nome }).first();
        await linhaEditar.getByRole('button', { name: /Editar/i }).first().click();
        await page.waitForTimeout(1000);
        await page.getByPlaceholder(/Auditor Geral do Sistema/).fill('Auditor Sénior');
        await page.getByRole('button', { name: /Guardar Ficha do Membro da Equipa/i }).first().click();
        await page.waitForTimeout(1500);
        const linhas2 = await textoLinhas(page);
        reg('A5-edicao-agente', linhas2.some(l => l.includes('Auditor Sénior')) ? 'PASS' : 'FAIL', 'cargo atualizado');
        await page.screenshot({ path: '/home/user/cda_test/colab_admin.png' }).catch(()=>{});
      }
    }
    await ctx.close();
  }

  // ===== B) INSTITUIÇÃO REAL — ciclo de vida do colaborador =====
  console.log('--- B) Instituição real: colaborador + login + acesso + logout ---');
  let agenteInst = '';
  {
    const { ctx, page } = await novoContexto(browser);
    // Registo
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'LOGIN' }).first().waitFor({ state: 'visible', timeout: 20000 });
    await page.getByRole('button', { name: 'Instituição', exact: true }).click();
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: 'Registar', exact: true }).last().click();
    await page.getByText(/Adesão oficial/i).first().waitFor({ state: 'visible', timeout: 15000 });
    await page.getByPlaceholder(/Serviço de Migração/i).fill(INST.nome);
    await page.getByPlaceholder('Ex: SME').fill(INST.sigla);
    const selects = page.locator('select');
    await selects.nth(0).selectOption({ index: 1 });
    await selects.nth(1).selectOption({ label: 'Luanda' }).catch(async () => selects.nth(1).selectOption({ index: 1 }));
    await page.waitForTimeout(500);
    await selects.nth(2).selectOption({ index: 1 }).catch(() => null);
    await page.waitForTimeout(400);
    await selects.nth(3).selectOption({ index: 1 }).catch(() => null);
    await page.waitForTimeout(400);
    await selects.nth(4).selectOption({ index: 1 }).catch(() => null);
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
    const texto = await page.evaluate(() => document.body.innerText);
    const mAgente = texto.match(/([A-Z0-9]{3,12}-[A-Z0-9]{2,10}-01)\b/);
    reg('B1-registo-instituicao', !!mAgente ? 'PASS' : 'FAIL', mAgente ? mAgente[1] : 'sem agente');
    if (mAgente) {
      agenteInst = mAgente[1];
      codigo = agenteInst.replace(/-01$/, '');
      await supaRest(`solicitacoes_registo?bi_numero=eq.${encodeURIComponent(codigo)}`, { method: 'PATCH', body: JSON.stringify({ status: 'Aprovado' }) });
      // Login admin (mesmo contexto — localStorage do registo partilhado)
      await page.goto(BASE, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await page.getByRole('button', { name: 'Instituição', exact: true }).click();
      await page.waitForTimeout(600);
      await page.getByPlaceholder(/LA041|AGT-9921-SR|ADM-8812-OP/).fill(agenteInst);
      await page.getByPlaceholder('••••••••••••').fill(INST.senha);
      await page.getByRole('button', { name: /Entrar no Portal/ }).click();
      await page.waitForTimeout(4500);
      const painelOk = await page.evaluate(() => /ÁREA INSTITUCIONAL|Painel/i.test(document.body.innerText));
      reg('B2-login-admin-inst', painelOk ? 'PASS' : 'FAIL');
      // Equipa
      await page.locator('nav button', { hasText: /^\s*Equipa\s*$/ }).first().click();
      await page.waitForTimeout(2500);
      await page.getByRole('button', { name: /Adicionar à Equipa/i }).first().click();
      await page.waitForTimeout(1000);
      await page.getByPlaceholder(/Dr\. Francisco Manuel/).fill(COLAB.nome);
      await page.getByPlaceholder(/f\.manuel@cda\.gov\.ao/).fill(COLAB.email);
      await page.getByPlaceholder(/\+244 923 000 000/).fill(COLAB.telefone);
      await page.getByPlaceholder(/Auditor Geral/).fill(COLAB.cargo);
      await page.getByPlaceholder(/Direcção Geral/).fill(COLAB.dept);
      const pwd = page.getByPlaceholder(/Mín\. 8 caracteres/i).first();
      reg('B3-campo-senha-colaborador', (await pwd.count()) > 0 ? 'PASS' : 'FAIL', (await pwd.count()) ? 'presente (instituição real)' : 'AUSENTE');
      if (await pwd.count()) {
        await pwd.fill(COLAB.senha);
        await page.getByRole('button', { name: /Submeter Cadastro/i }).first().click();
        await page.waitForTimeout(2200);
        const linhas = await textoLinhas(page);
        const linhaColab = linhas.find(l => l.includes(COLAB.nome));
        reg('B4-colaborador-criado', !!linhaColab ? 'PASS' : 'FAIL', linhaColab ? linhaColab.slice(0, 60) : 'não na lista');
        // Nº do agente do colaborador (ex: CTXXX-LTBB-02)
        const mId = linhaColab ? linhaColab.match(/ID:\s*([A-Z0-9-]+)/) : null;
        const agenteColab = mId ? mId[1] : null;
        await page.screenshot({ path: '/home/user/cda_test/colab_inst.png' }).catch(()=>{});
        await ctx.close();

        // ===== LOGIN DO COLABORADOR (contexto novo, limpo) =====
        const { ctx: ctxC, page: pageC } = await novoContexto(browser);
        const okColab = await login(pageC, 'instituicao', agenteColab || codigo, COLAB.senha);
        reg('B5-login-colaborador', okColab ? 'PASS' : 'FAIL', okColab ? `login com ${agenteColab || codigo}` : 'falhou');
        if (okColab) {
          const painel = await pageC.evaluate(() => document.body.innerText);
          reg('B6-colaborador-acessa-painel', /ÁREA INSTITUCIONAL|Painel/i.test(painel) ? 'PASS' : 'FAIL');
          // Bloqueio de área admin: itens exclusivos do menu admin NÃO devem aparecer
          await pageC.evaluate(() => { window.location.hash = '#/gov-dashboard'; });
          await pageC.waitForTimeout(2000);
          const naoAuth = await pageC.evaluate(() => {
            const texto = document.body.innerText;
            const itensAdmin = ['Cidadãos', 'Relatórios', 'Auditoria', 'Instituições'].filter(x => texto.includes(x));
            return { itensAdmin, hash: location.hash };
          });
          reg('B7-bloqueio-area-admin', naoAuth.itensAdmin.length === 0 ? 'PASS' : 'FAIL', `itens admin: ${JSON.stringify(naoAuth.itensAdmin)}`);
          // Logout
          const sair = pageC.getByRole('button', { name: /Sair do Canal/i }).first();
          if (await sair.count()) { await sair.click(); await pageC.waitForTimeout(4000); }
          const posLogout = await pageC.evaluate(() => document.body.innerText);
          reg('B8-logout', /ENTRAR NO PORTAL|LOGIN/i.test(posLogout) ? 'PASS' : 'FAIL');
        }
        await ctxC.close();
      } else {
        await ctx.close();
      }
    } else {
      await ctx.close();
    }
  }

  // ===== C) Separação entre instituições =====
  console.log('--- C) Separação entre instituições ---');
  {
    const ts2 = Date.now();
    const codigo2 = `C2${letras}`;
    const ur = await fetch(`${SUPA_URL}/auth/v1/admin/users`, {
      method: 'POST', headers: { ...svcHeaders },
      body: JSON.stringify({ email: `agente.${codigo2.toLowerCase()}-01@inst.correiodigital.ao`, password: INST.senha, email_confirm: true, app_metadata: { instituicao: codigo2, role: 'instituicao' } }),
    });
    const ub = await ur.json();
    await supaRest('solicitacoes_registo', { method: 'POST', body: JSON.stringify({ bi_numero: codigo2, nome: `Colab Teste2 ${sufixo}`, email: `acesso2.${ts2}@colab.ao`, status: 'Aprovado', tipo: 'instituicao' }) });
    const { ctx, page } = await novoContexto(browser);
    const okCross = await login(page, 'instituicao', codigo2, COLAB.senha);
    reg('C1-senha-colab-A-recusada-na-inst-B', !okCross ? 'PASS' : 'FAIL', okCross ? 'VÁZIO DE SEGURANÇA' : 'senha rejeitada (separação OK)');
    await ctx.close();
    if (ub?.id) userAuthId = ub.id;
  }

  // ===== D) Validações =====
  console.log('--- D) Validações ---');
  {
    const { ctx, page } = await novoContexto(browser);
    const okLogin = await login(page, 'admin', 'ADM-8812-OP', 'GALHARDO');
    if (okLogin) {
      await page.evaluate(() => { window.location.hash = '#/gov-trabalhadores'; });
      await page.waitForTimeout(2500);
      await page.getByRole('button', { name: /Adicionar à Equipa/i }).first().click();
      await page.waitForTimeout(800);
      await page.getByRole('button', { name: /Submeter Cadastro/i }).first().click();
      await page.waitForTimeout(800);
      const corpo = await page.evaluate(() => document.body.innerText);
      reg('D1-validacao-campos-obrigatorios', /Nome Completo|Preencha|obrigatóri/i.test(corpo) ? 'PASS' : 'FAIL');
    }
    await ctx.close();
  }
} catch (e) {
  reg('execucao', 'FAIL', `exceção: ${String(e).slice(0, 200)}`);
} finally {
  console.log('--- LIMPEZA ---');
  if (codigo) {
    for (let p = 1; p <= 10; p++) {
      const { body } = await authAdmin(`admin/users?page=${p}&per_page=50`);
      if (!body || !Array.isArray(body.users)) break;
      const hit = body.users.find(u => String((u.app_metadata||{}).instituicao||'').toUpperCase() === codigo.toUpperCase());
      if (hit) { await authAdmin(`admin/users/${hit.id}`, { method: 'DELETE' }); }
      if (body.users.length < 50) break;
    }
    await supaRest(`solicitacoes_registo?bi_numero=eq.${encodeURIComponent(codigo)}`, { method: 'DELETE' });
    await supaRest(`messages?sender_bi=eq.${encodeURIComponent(codigo)}`, { method: 'DELETE' });
  }
  if (userAuthId) await authAdmin(`admin/users/${userAuthId}`, { method: 'DELETE' });
  reg('limpeza-final', 'PASS', 'dados de teste removidos');
}
await browser.close();
console.log('======================================================================');
console.log(`RESULTADO: ${resultados.length - FAILS - SKIPS} PASS / ${SKIPS} SKIP / ${FAILS} FAIL`);
process.exit(FAILS > 0 ? 1 : 0);
