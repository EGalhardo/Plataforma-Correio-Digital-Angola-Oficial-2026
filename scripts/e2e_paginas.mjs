#!/usr/bin/env node
// ============================================================================
// e2e_paginas.mjs — Varredura de TODAS as páginas da plataforma em browser
// sem cabeça (Playwright + Chromium), a pedido do dono (2026-08-08):
// "testa todas as páginas sem que eu precise verificar".
//
// Cobertura (49 verificações):
//   A) Ecrãs públicos de acesso (por papel): página de login, botão
//      «Auto Preencher Demonstração» (funcional: preenche mesmo o campo),
//      página de REGISTO (cidadão=RegisterStepper · instituição=Adesão ·
//      admin=Credencial Operacional — o botão «Registar Admin Alfa» está sempre
//      activo; a duplicação é impedida pela validação do formulário (desde b8e7a26)), página REDEFINIR SENHA (ResetPasswordStepper) e,
//      no cidadão, o ecrã de LOGIN FACIAL.
//   B) Sessão (por papel): login com as 3 identidades de DEMONSTRAÇÃO
//      nativas da app (constam publicamente em src/App.tsx), varredura de
//      cada item da navegação lateral + ligações secundárias do painel.
//   C) Fluxos funcionais: abrir o DETALHE DE UMA MENSAGEM (ABRIR/ANALISAR),
//      selo honesto de gateway na página Pagamentos do cidadão
//      (data-testid="selo-gateway-pendente"), formulário de cobrança na
//      página Pagamentos da instituição (#inst-pagamentos-root) e LOGOUT
//      («Sair do Canal» tem de voltar ao ecrã de login).
//
//   Para cada página: FAIL se botão inexistente, conteúdo quase vazio,
//   exceção JS não apanhada, ou elemento funcional obrigatório em falta;
//   WARN se um marcador de copy não for encontrado (revisão humana seletiva).
//
// FRONTEIRA HONESTA (deliberada): a varredura NÃO submete formulários que
// criem dados reais — registo de contas novas, pedido real de redefinição
// de senha, envio de mensagens ou registo de cobranças ficam fora, para não
// poluir a base de produção. Esses circuitos escrita-real estão cobertos
// pela auditoria §D (contas de teste dedicadas) — ver AUDITORIA_AUTONOMA.md.
//
// Guarda screenshots por página em $SHOTS_DIR (prova visual para o dono).
// Sai != 0 se houver pelo menos 1 FAIL.
//
// Uso:  BASE=https://<url> node scripts/e2e_paginas.mjs
// ============================================================================
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'https://correio-digital-angola-oficial.vercel.app';
const SHOTS = process.env.SHOTS_DIR || '/home/user/cda_test/screenshots';
mkdirSync(SHOTS, { recursive: true });

// Identidades de demonstração nativas da app (constam publicamente de App.tsx)
const PAPEL = {
  cidadao: {
    tab: 'Cidadão', id: '009874562LA041', pass: '123456',
    registoMarker: /CRIAÇÃO OFICIAL DA CONTA|NOME COMPLETO|CONTINUAR/i,
    facial: true,
    nav: [
      ['home', 'Painel', /Institui/i], ['correspondencias', 'Correio', /Caixa|Receb|Nova Mensagem|Correio/i],
      ['contatos', 'Contactos', /Confian|Contact/i], ['perfil', 'Perfil', /Conta|Perfil|Verifica/i],
    ],
    extras: [ // botões "cda-link-text" no painel principal
      ['historico', 'Ver Histórico', /Hist[óo]rico/i],
      ['notificacoes', 'Notificações', /Notifica/i],
      ['pagamentos', 'Pagamentos', /gateway|INAPEM|Por pagar|Pagamentos/i],
    ],
  },
  instituicao: {
    tab: 'Instituição', id: 'AGT-9921-SR', pass: '000000',
    registoMarker: /Adesão oficial ao Correio Digital|Dados da Instituição/i,
    facial: false,
    nav: [
      ['home', 'Painel', /Valida|Institui|QR/i], ['correspondencias', 'Correio', /Caixa|Receb|Nova Mensagem|Correio/i],
      ['gov-contatos', 'Equipa', /Equipa|Membro|Colaborador/i], ['inst-qrcode', 'QR Code', /Valida|QR/i],
      ['inst-ai-assistant', 'IA', /IA|Assistente|Groq|Conhecimento/i], ['perfil', 'Perfil', /Conta|Perfil|Verifica|Institui/i],
    ],
    extras: [['inst-pagamentos', 'Pagamentos', /Cobran|gateway|Pagamentos|BI do cidad/i]],
  },
  admin: {
    tab: 'Admin', id: 'ADM-8812-OP', pass: 'GALHARDO',
    registoMarker: /Credencial Operacional Plataforma/,
    facial: false,
    nav: [
      ['gov-dashboard', 'Painel', /Painel|SOC|Govern|Seguran/i], ['gov-interoperabilidade', 'Instituições', /Institui/i],
      // NOTA (descoberta 2026-08-08): a mesma pagina tem rotulos diferentes
      // na Sidebar ('Correspondências', desktop) e na MobileNavBar ('Correios',
      // mobile) — inconsistencia cosmetica da app registada para o backlog.
      ['gov-correspondencias', 'Correspondências', /Correio|Correspond/i], ['gov-contatos', 'Cidadãos', /Cidad/i],
      ['gov-trabalhadores', 'Equipa', /Equipa|Trabalh|Agente/i], ['gov-relatorio', 'Relatórios', /Relat[óo]rio|Estat/i],
      ['gov-ia', 'IA', /IA|Groq|Assistente/i], ['gov-seguranca', 'Auditoria', /Auditoria|Seguran/i],
      ['gov-perfil', 'Perfil', /Perfil|Conta|Admin/i],
    ],
    extras: [],
  },
};

const resultados = [];
let FAILS = 0, WARNS = 0;
const reg = (role, pagina, estado, detalhe = '') => {
  if (estado === 'FAIL') FAILS++;
  if (estado === 'WARN') WARNS++;
  resultados.push([role, pagina, estado, detalhe]);
  console.log(`[${estado}] ${role}/${pagina}${detalhe ? ' — ' + detalhe : ''}`);
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function correrPapel(role, cfg) {
  const errosJs = [];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 850 }, locale: 'pt-PT' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errosJs.push(String(e).slice(0, 200)));

  const headingLogin = page.getByRole('heading', { name: 'LOGIN' }).first();
  const selecionarTab = async () => {
    await page.getByRole('button', { name: cfg.tab, exact: true }).click();
    await page.waitForTimeout(600);
  };
  // Cancela o sub-ecrã de acesso (registo/redefinir/facial) pelo próprio botão
  // da app; se não houver botão óbvio ou não voltar, recarrega a página.
  const voltarAoLogin = async () => {
    const cancel = page.getByRole('button', { name: /Cancelar|Voltar/i }).first();
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click().catch(() => null);
      await page.waitForTimeout(1200);
      if (await headingLogin.isVisible().catch(() => false)) return true;
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await headingLogin.waitFor({ state: 'visible', timeout: 20000 }).catch(() => null);
    const ok = await headingLogin.isVisible().catch(() => false);
    if (ok) await selecionarTab();
    return ok;
  };

  try {
    // 0) página pública (login) também é uma página a testar
    // (correção de flake 2026-08-08: aguardar o texto com timeout proprio,
    //  nao um sleep fixo — em cold fetch o h2 chega depois de ~2.5s)
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await headingLogin.waitFor({ state: 'visible', timeout: 20000 }).catch(() => null);
    const loginOk = await headingLogin.isVisible().catch(() => false);
    reg(role, 'login-publica', loginOk ? 'PASS' : 'FAIL', loginOk ? '' : 'ecrã de login não renderizou');
    await page.screenshot({ path: `${SHOTS}/${role}-00-login.png` });
    await selecionarTab();

    // 0a) «Auto Preencher Demonstração» — funcional: tem de encher o campo
    {
      const btnAuto = page.getByRole('button', { name: /Auto Preencher Demonstra/i }).first();
      if (!(await btnAuto.isVisible().catch(() => false))) {
        reg(role, 'auto-preencher', 'FAIL', 'botão «Auto Preencher Demonstração» inexistente');
      } else {
        await btnAuto.click();
        await page.waitForTimeout(700);
        const valor = await page.getByPlaceholder(/LA041|AGT-9921-SR|ADM-8812-OP/).inputValue().catch(() => '');
        reg(role, 'auto-preencher', valor.trim() ? 'PASS' : 'FAIL',
          valor.trim() ? `campo preenchido (${valor.trim().length} chars)` : 'clique não preencheu o campo de identificação');
      }
    }

    // 0b) página de REGISTO (render + marcador; nunca submete — ver fronteira honesta)
    {
      // 2026-08-23: desde b8e7a26 («destacar registo do Admin Alfa») o botão do
      // Admin chama-se «Registar Admin Alfa»; cidadão/instituição mantêm «Registar».
      // O botão fica sempre activo — a duplicação do Admin Alfa é impedida pela
      // validação do próprio formulário (RegisterAdminAgentPage).
      const btnRegistar = page.getByRole('button', { name: /^Registar/ }).last();
      if (!(await btnRegistar.isVisible().catch(() => false))) {
        reg(role, 'registo', 'FAIL', 'botão «Registar»/«Registar Admin Alfa» inexistente no rodapé do login');
      } else if (!(await btnRegistar.isEnabled().catch(() => false))) {
        reg(role, 'registo', 'PASS', 'registo encerrado por desenho (Admin Alfa já registado)');
      } else {
        await btnRegistar.click();
        const marc = page.getByText(cfg.registoMarker).first();
        await marc.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null);
        const ok = await marc.isVisible().catch(() => false);
        const texto = await page.evaluate(() => document.body.innerText.trim());
        reg(role, 'registo', ok ? 'PASS' : 'FAIL',
          ok ? `formulário renderizado (${texto.length} chars)` : 'marcador do formulário de registo não apareceu');
        await page.screenshot({ path: `${SHOTS}/${role}-02-registo.png` });
        await voltarAoLogin();
      }
    }

    // 0c) página REDEFINIR SENHA (render + marcador; nunca submete)
    {
      const btnEsqueci = page.getByRole('button', { name: /Esqueci Senha/ }).first();
      if (!(await btnEsqueci.isVisible().catch(() => false))) {
        reg(role, 'redefinir-senha', 'FAIL', 'botão «Esqueci Senha» inexistente');
      } else {
        await btnEsqueci.click();
        const marc = page.getByText(/Operação protegida por verificação de identidade civil|Dica de Simulação|Recuperar Senha|Receba um link de recuperação no seu e-mail/i).first();
        await marc.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null);
        const ok = await marc.isVisible().catch(() => false);
        reg(role, 'redefinir-senha', ok ? 'PASS' : 'FAIL',
          ok ? 'stepper de redefinição renderizado' : 'marcador do stepper de redefinição não apareceu');
        await page.screenshot({ path: `${SHOTS}/${role}-03-redefinir.png` });
        await voltarAoLogin();
      }
    }

    // 0d) ecrã de LOGIN FACIAL (apenas cidadão; o fluxo é simulado localmente)
    if (cfg.facial) {
      const btnFacial = page.getByRole('button', { name: /Login Facial/ }).first();
      if (!(await btnFacial.isVisible().catch(() => false))) {
        reg(role, 'login-facial-ecra', 'FAIL', 'botão «Login Facial» inexistente');
      } else {
        await btnFacial.click();
        const marc = page.getByText(/LOGIN FACIAL/).first();
        await marc.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null);
        const ok = await marc.isVisible().catch(() => false);
        reg(role, 'login-facial-ecra', ok ? 'PASS' : 'FAIL',
          ok ? 'ecrã de captura renderizado' : 'badge «LOGIN FACIAL» não apareceu');
        await page.screenshot({ path: `${SHOTS}/${role}-04-facial.png` });
        await voltarAoLogin();
      }
    }

    // 1) login
    await page.getByPlaceholder(/LA041|AGT-9921-SR|ADM-8812-OP/).fill(cfg.id);
    await page.getByPlaceholder('••••••••••••').fill(cfg.pass);
    await page.getByRole('button', { name: /Entrar no Portal/ }).click();
    const painel = page.getByRole('button', { name: 'Painel', exact: true }).first();
    await painel.waitFor({ state: 'visible', timeout: 45000 }).catch(() => null);
    if (!(await painel.isVisible().catch(() => false))) {
      await page.screenshot({ path: `${SHOTS}/${role}-XX-login-falhou.png` });
      reg(role, 'login-sessao', 'FAIL', 'não chegou ao painel após Entrar no Portal');
      await browser.close();
      return;
    }
    reg(role, 'login-sessao', 'PASS');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SHOTS}/${role}-01-home.png` });

    // 2) percorre a navegação lateral
    for (const [id, label, marcador] of cfg.nav) {
      const alvo = page.locator('nav button', { hasText: new RegExp(`^\\s*${esc(label)}\\s*$`) }).first();
      if (!(await alvo.isVisible().catch(() => false))) {
        reg(role, id, 'FAIL', `botão «${label}» inexistente na navegação`);
        continue;
      }
      await alvo.click();
      await page.waitForTimeout(1800);
      const texto = await page.evaluate(() => document.body.innerText.trim());
      if (texto.length < 400) {
        reg(role, id, 'FAIL', `conteúdo quase vazio (${texto.length} chars)`);
        await page.screenshot({ path: `${SHOTS}/${role}-${id}-VAZIO.png` });
        continue;
      }
      if (!marcador.test(texto)) reg(role, id, 'WARN', `marcador ${marcador} não encontrado`);
      else reg(role, id, 'PASS', `${texto.length} chars`);
      await page.screenshot({ path: `${SHOTS}/${role}-${id}.png` });
    }

    // 3) páginas secundárias a partir do painel
    const btnPainel = page.locator('nav button', { hasText: /^\s*Painel\s*$/ }).first();
    for (const [id, label, marcador] of cfg.extras) {
      if (await btnPainel.isVisible().catch(() => false)) { await btnPainel.click(); await page.waitForTimeout(1200); }
      const alvo = page.locator('button.cda-link-text', { hasText: new RegExp(esc(label)) }).first();
      if (!(await alvo.isVisible().catch(() => false))) {
        reg(role, id, 'FAIL', `liga secundária «${label}» não encontrada no painel`);
        continue;
      }
      await alvo.click();
      await page.waitForTimeout(1800);
      const texto = await page.evaluate(() => document.body.innerText.trim());
      if (texto.length < 400) { reg(role, id, 'FAIL', `conteúdo quase vazio (${texto.length} chars)`); continue; }
      if (!marcador.test(texto)) reg(role, id, 'WARN', `marcador ${marcador} não encontrado`);
      else reg(role, id, 'PASS', `${texto.length} chars`);
      await page.screenshot({ path: `${SHOTS}/${role}-${id}.png` });

      // 3a) verificações funcionais dentro das páginas de pagamentos
      if (id === 'pagamentos') {
        const selo = page.locator('[data-testid="selo-gateway-pendente"]').first();
        const ok = await selo.isVisible().catch(() => false);
        reg(role, 'pagamentos-selo', ok ? 'PASS' : 'FAIL',
          ok ? 'selo honesto de gateway pendente presente' : 'selo data-testid="selo-gateway-pendente" em falta');
      }
      if (id === 'inst-pagamentos') {
        const root = page.locator('#inst-pagamentos-root').first();
        const okRoot = await root.isVisible().catch(() => false);
        // O formulário de cobrança abre recolhido por desenho — clicar
        // «Nova cobrança» antes de exigir os campos (correção 2026-08-08).
        const toggle = page.getByRole('button', { name: /Nova cobrança/i }).first();
        if (okRoot && await toggle.isVisible().catch(() => false)) {
          await toggle.click();
          await page.waitForTimeout(900);
        }
        const nInputs = okRoot ? await root.locator('input, textarea').count().catch(() => 0) : 0;
        reg(role, 'inst-pagamentos-form', okRoot && nInputs > 0 ? 'PASS' : 'FAIL',
          okRoot ? `formulário de cobrança presente (${nInputs} campos)` : '#inst-pagamentos-root não renderizou');
      }
    }

    // 4) fluxo funcional: abrir o detalhe de uma mensagem (ABRIR / ANALISAR)
    if (role === 'cidadao' || role === 'instituicao') {
      const navCorreio = page.locator('nav button', { hasText: /^\s*Correio\s*$/ }).first();
      if (await navCorreio.isVisible().catch(() => false)) {
        await navCorreio.click();
        await page.waitForTimeout(1800);
        const abrir = page.getByRole('button', { name: role === 'cidadao' ? 'ABRIR' : 'ANALISAR', exact: true }).first();
        if (!(await abrir.isVisible().catch(() => false))) {
          reg(role, 'mensagem-detalhe', 'WARN', 'caixa sem mensagens de demonstração para abrir');
        } else {
          await abrir.click();
          await page.waitForTimeout(1800);
          const texto = await page.evaluate(() => document.body.innerText.trim());
          const ok = texto.length >= 400 && /Remetente|Assunto|Responder|Arquivar|Analisar|Mensagem/i.test(texto);
          reg(role, 'mensagem-detalhe', texto.length < 400 ? 'FAIL' : ok ? 'PASS' : 'WARN',
            `${texto.length} chars${ok ? '' : ' · marcador do detalhe não encontrado'}`);
          await page.screenshot({ path: `${SHOTS}/${role}-mensagem-detalhe.png` });
        }
      } else {
        reg(role, 'mensagem-detalhe', 'FAIL', 'navegação «Correio» não encontrada para o fluxo');
      }
    }

    // 5) logout: «Sair do Canal» tem de terminar a sessão e voltar ao login
    {
      // NOTA (correção 2026-08-08): o botão «Sair do Canal» vive na <aside> da
      // Sidebar, FORA do <nav> (que só contém os itens de página).
      const sair = page.locator('aside button', { hasText: /Sair do Canal/ }).first();
      if (!(await sair.isVisible().catch(() => false))) {
        reg(role, 'logout', 'FAIL', 'botão «Sair do Canal» inexistente na navegação');
      } else {
        await sair.click();
        await headingLogin.waitFor({ state: 'visible', timeout: 30000 }).catch(() => null);
        const ok = await headingLogin.isVisible().catch(() => false);
        reg(role, 'logout', ok ? 'PASS' : 'FAIL',
          ok ? 'sessão terminada, ecrã de login restaurado' : 'após sair, o ecrã de login não reapareceu');
      }
    }
  } catch (e) {
    reg(role, 'excecao-geral', 'FAIL', String(e).slice(0, 160));
  }

  if (errosJs.length > 0) reg(role, 'excecoes-js', 'FAIL', `${errosJs.length} exceção(ões) não apanhada(s): ${errosJs[0]}`);
  else reg(role, 'excecoes-js', 'PASS');

  await browser.close();
}

console.log(`=== Varredura de páginas — ${BASE} — ${new Date().toISOString()} ===`);
for (const [role, cfg] of Object.entries(PAPEL)) {
  await correrPapel(role, cfg);
}
const total = resultados.length;
console.log('======================================================================');
console.log(`RESULTADO: ${total - FAILS - WARNS} PASS / ${WARNS} WARN / ${FAILS} FAIL  (screenshots em ${SHOTS})`);
process.exit(FAILS > 0 ? 1 : 0);
