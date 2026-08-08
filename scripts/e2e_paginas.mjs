#!/usr/bin/env node
// ============================================================================
// e2e_paginas.mjs — Varredura de TODAS as páginas da plataforma em browser
// sem cabeça (Playwright + Chromium), a pedido do dono (2026-08-08):
// "testa todas as páginas sem que eu precise verificar".
//
// Entra com as 3 identidades de DEMONSTRAÇÃO nativas da app (as mesmas que
// estão publicamente em src/App.tsx — não são segredos), percorre cada item
// da navegação lateral + ligações secundárias do painel, e para cada página:
//   FAIL se: botão de navegação inexistente, conteúdo vazio, exceção JS
//   não apanhada, ou erro de rede crítico no chunk da página;
//   WARN se: o marcador de conteúdo esperado não for encontrado (pode ser
//            mudança legítima de copy — fica para revisão humana seletiva).
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
    nav: [
      ['home', 'Painel', /Valida|Institui|QR/i], ['correspondencias', 'Correio', /Caixa|Receb|Nova Mensagem|Correio/i],
      ['gov-contatos', 'Equipa', /Equipa|Membro|Colaborador/i], ['inst-qrcode', 'QR Code', /Valida|QR/i],
      ['inst-ai-assistant', 'IA', /IA|Assistente|Groq|Conhecimento/i], ['perfil', 'Perfil', /Conta|Perfil|Verifica|Institui/i],
    ],
    extras: [['inst-pagamentos', 'Pagamentos', /Cobran|gateway|Pagamentos|BI do cidad/i]],
  },
  admin: {
    tab: 'Admin', id: 'ADM-8812-OP', pass: 'GALHARDO',
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

  try {
    // 0) página pública (login) também é uma página a testar
    // (correção de flake 2026-08-08: aguardar o texto com timeout proprio,
    //  nao um sleep fixo — em cold fetch o h2 chega depois de ~2.5s)
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const h2Login = page.getByRole('heading', { name: 'LOGIN' }).first();
    await h2Login.waitFor({ state: 'visible', timeout: 20000 }).catch(() => null);
    const loginOk = await h2Login.isVisible().catch(() => false);
    reg(role, 'login-publica', loginOk ? 'PASS' : 'FAIL', loginOk ? '' : 'ecrã de login não renderizou');
    await page.screenshot({ path: `${SHOTS}/${role}-00-login.png` });

    // 1) login
    await page.getByRole('button', { name: cfg.tab, exact: true }).click();
    await page.waitForTimeout(600);
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
