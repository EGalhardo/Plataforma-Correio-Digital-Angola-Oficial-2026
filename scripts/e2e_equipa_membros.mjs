#!/usr/bin/env node
// ============================================================================
// _e2_equipa_v37786.mjs — FIX v37.78.6 «Registar Novo Membro da Equipa»
// Prova real em browser (Modo Real, credenciais prod):
//   A) Instituição: criar colaborador (páginas limitadas) → aparece na lista
//      → persiste após reload → ficha `profiles` + conta Auth na nuvem
//   B) Login do colaborador (nº + senha) → menu restrito → URL bloqueada
//   C) Admin: criar agente ADMIN-NNNN → lista → persiste → nuvem
//   D) Login do agente admin → menu restrito → URL bloqueada
//   E) Limpeza via UI (eliminar) + verificação final cloud limpa
// ============================================================================
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const BASE = 'http://localhost:3000';
const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.trim().startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const SUPA = env.SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}` };
const SS = '/home/user/cda_test/screenshots';

const resultados = []; let FAILS = 0;
const reg = (n, ok, d = '') => { if (!ok) FAILS++; resultados.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`); console.log(`[${ok ? 'PASS' : 'FAIL'}] ${n}${d ? ' — ' + d : ''}`); };

const COLAB = { nome: 'Colaborador Teste Um', email: 'colab.teste1@inapem.ao', tel: '+244 923 111 222', cargo: 'Técnico de Atendimento', dept: 'Delegação de Luanda', senha: 'SenhaColab1' };
const AGENTE = { nome: 'Agente Teste Dois', email: 'agente.teste2@cda.ao', tel: '+244 923 333 444', cargo: 'Auditor de Atendimento', dept: 'Operações CDA', senha: 'SenhaAgente1' };

const restGet = async (q) => (await fetch(`${SUPA}/rest/v1/${q}`, { headers: H })).json();
// ATENÇÃO: o filtro ?email= do Admin API não é exacto (devolve utilizadores
// não relacionados) — filtra client-side por igualdade estrita.
const authUser = async (email) => {
  const r = await fetch(`${SUPA}/auth/v1/admin/users?per_page=200&page=1`, { headers: H });
  const j = await r.json().catch(() => ({}));
  return (j.users || []).find(u => String(u.email || '').toLowerCase() === email.toLowerCase()) || null;
};

const linhasTr = (page) => page.evaluate(() => Array.from(document.querySelectorAll('tr'))
  .map(r => (r.textContent || '').trim().replace(/\s+/g, ' ')).filter(Boolean));

const novoCtx = async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'pt-PT' });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  [pageerror]', String(e).slice(0, 140)));
  return { ctx, page };
};

const loginInst = async (page, id, senha) => {
  await page.context().clearCookies();
  await page.goto(`${BASE}/institucional?cb=${Date.now()}#/login`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('input[type="text"], input:not([type])').first().fill(id);
  await page.locator('input[type="password"]').first().fill(senha);
  await page.locator('button', { hasText: /ENTRAR/i }).first().click().catch(() => {});
  await page.waitForTimeout(9000);
  return !(await page.evaluate(() => document.body.innerText)).match(/Credenciais incorrectas|ACESSO NEGADO/i);
};

const loginAdmin = async (page, id, senha) => {
  await page.context().clearCookies();
  await page.goto(`${BASE}/admin?cb=${Date.now()}#/login`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('input[type="text"], input:not([type])').first().fill(id);
  await page.locator('input[type="password"]').first().fill(senha);
  await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click().catch(() => {});
  await page.waitForTimeout(10000);
  return !(await page.evaluate(() => document.body.innerText)).match(/Credenciais incorrectas|ACESSO NEGADO/i);
};

const abrirModalEquipa = async (page) => {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /novo membro|adicionar/i.test((e.textContent || '').trim()));
    if (b.length) b[0].click();
  });
  await page.waitForTimeout(1800);
  return !!(await page.locator('#wk-campo-nome').count());
};

const preencherModal = async (page, m) => {
  await page.locator('#wk-campo-nome').fill(m.nome);
  await page.locator('#wk-campo-email').fill(m.email);
  await page.locator('#wk-campo-tel').fill(m.tel);
  await page.locator('#wk-campo-perfil').fill(m.cargo);
  await page.evaluate(({ dept, senha }) => {
    const setVal = (el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
    const vis = e => e.getBoundingClientRect().width > 0;
    const d = [...document.querySelectorAll('input[type="text"]')].filter(vis).find(e => /direc/i.test(e.placeholder || ''));
    if (d) setVal(d, dept);
    const pw = [...document.querySelectorAll('input[type="password"]')].filter(vis);
    if (pw[0]) setVal(pw[0], senha);
    if (pw[1]) setVal(pw[1], senha);
  }, { dept: m.dept, senha: m.senha });
};

// desmarca todas as páginas excepto as indicadas (labels exactos)
const marcarSo = async (page, manter) => {
  await page.evaluate((manterArr) => {
    const modal = [...document.querySelectorAll('div.fixed')].filter(d => d.getBoundingClientRect().width > 50).pop();
    if (!modal) return;
    [...modal.querySelectorAll('label')].forEach(lb => {
      const txt = (lb.textContent || '').replace(/obrigatória/i, '').trim();
      const cb = lb.querySelector('input[type="checkbox"]');
      if (!cb || cb.disabled) return;
      const quer = manterArr.includes(txt);
      if (cb.checked !== quer) cb.click();
    });
  }, manter);
  await page.waitForTimeout(400);
};

const submeter = async (page) => {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /submeter cadastro/i.test((e.textContent || '').trim()));
    if (b.length) b[0].click();
  });
};

const esperarMembro = async (page, nome, ms = 20000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    await page.waitForTimeout(2000);
    const est = await page.evaluate((nm) => ({
      fechou: !document.querySelector('#wk-campo-nome'),
      naLista: document.body.innerText.toLowerCase().includes(nm.toLowerCase()),
    }), nome);
    if (est.fechou && est.naLista) return est;
  }
  return await page.evaluate((nm) => ({ fechou: !document.querySelector('#wk-campo-nome'), naLista: document.body.innerText.toLowerCase().includes(nm.toLowerCase()) }), nome);
};

const esperarTexto = async (page, texto, ms = 20000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    await page.waitForTimeout(2000);
    if ((await page.evaluate(() => document.body.innerText.toLowerCase())).includes(texto.toLowerCase())) return true;
  }
  return false;
};

const eliminarPelaUI = async (page, nome) => {
  await page.waitForTimeout(1500);
  await page.evaluate((nm) => {
    const tr = [...document.querySelectorAll('tr')].find(r => (r.textContent || '').includes(nm));
    if (!tr) return false;
    const b = [...tr.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /eliminar|trash|lixeira/i.test((e.textContent || '') + (e.getAttribute('aria-label') || '') + (e.title || '')));
    if (!b.length) return false;
    b[0].click(); return true;
  }, nome);
  await page.waitForTimeout(2200);
  await page.evaluate(() => {
    const modais = [...document.querySelectorAll('div.fixed')].filter(d => d.getBoundingClientRect().width > 50);
    const m = modais[modais.length - 1];
    if (!m) return false;
    const b = [...m.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /^eliminar$/i.test((e.textContent || '').trim()));
    if (!b.length) return false;
    b[b.length - 1].click(); return true;
  });
  await page.waitForTimeout(9000);
};

const browser = await chromium.launch();
let numColab = '', numAgente = '';
try {
  // ================= A) INSTITUIÇÃO =================
  console.log('--- A) Instituição real: criar colaborador ---');
  {
    const { ctx, page } = await novoCtx(browser);
    reg('A1-login-responsavel', await loginInst(page, 'INAPEM-LLMM-01', '123456789'));
    await page.locator('button', { hasText: /Equipa/i }).first().click().catch(() => {});
    await page.waitForTimeout(4500);
    reg('A2-abrir-modal', await abrirModalEquipa(page));
    await preencherModal(page, COLAB);
    await marcarSo(page, ['Correio']);
    const numPrevisto = await page.evaluate(() => {
      const modal = [...document.querySelectorAll('div.fixed')].filter(d => d.getBoundingClientRect().width > 50).pop();
      const inp = modal && [...modal.querySelectorAll('input')].find(e => /^INAPEM-LLMM-\d+$/.test(e.value || ''));
      return inp ? inp.value : '';
    });
    console.log('  nº previsto:', numPrevisto);
    await submeter(page);
    const est = await esperarMembro(page, COLAB.nome, 22000);
    reg('A3-modal-fecha-e-membro-na-lista', est.fechou && est.naLista, JSON.stringify(est));
    await page.screenshot({ path: `${SS}/v37786_a_inst_pos_submeter.png`, fullPage: false }).catch(() => {});
    const linhas = await linhasTr(page);
    const linha = linhas.find(l => l.includes(COLAB.nome)) || '';
    numColab = (linha.match(/INAPEM-LLMM-\d+/) || [])[0] || numPrevisto;
    reg('A4-numero-agente-atribuido', !!numColab, numColab);
    // persistência após reload completo
    await page.goto(`${BASE}/institucional?cb=${Date.now()}#/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
    reg('A5-relogin-responsavel', await loginInst(page, 'INAPEM-LLMM-01', '123456789'));
    await page.locator('button', { hasText: /Equipa/i }).first().click().catch(() => {});
    await page.waitForTimeout(5000);
    reg('A6-membro-persiste-apos-reload', (await page.evaluate(b => document.body.innerText.toLowerCase().includes(b.toLowerCase()), COLAB.nome)));
    await page.screenshot({ path: `${SS}/v37786_a_inst_persiste.png` }).catch(() => {});
    await ctx.close();
  }
  // nuvem
  {
    const profs = await restGet(`profiles?bi=eq.${numColab}&select=bi,name,role,phone,email`);
    reg('A7-profiles-row', profs.length === 1 && profs[0].role === 'instituicao' && profs[0].name === COLAB.nome, JSON.stringify(profs));
    const u = await authUser(`agente.${numColab.toLowerCase()}@inst.correiodigital.ao`);
    reg('A8-conta-auth', !!u && (u.user_metadata || {}).agent === numColab, u ? u.email : 'sem conta');
  }

  // ================= B) LOGIN COLABORADOR INST =================
  console.log('--- B) Login do colaborador + acesso limitado ---');
  {
    const { ctx, page } = await novoCtx(browser);
    reg('B1-login-colaborador', await loginInst(page, numColab, COLAB.senha), `${numColab} + senha`);
    const corpo = (await page.evaluate(() => document.body.innerText)).toLowerCase();
    const tem = (s) => corpo.includes(s.toLowerCase());
    reg('B2-menu-so-paginas-concedidas', tem('Correio') && tem('Perfil') && !tem('QR Code') && !tem('Assistência IA'));
    reg('B3-sem-pagina-equipa', !(await page.evaluate(() => document.body.innerText)).match(/Equipa\b/));
    await page.screenshot({ path: `${SS}/v37786_b_colab_inst_menu.png` }).catch(() => {});
    await page.evaluate(() => { window.location.hash = '#/inst-qrcode'; });
    await page.waitForTimeout(4500);
    const corpoQR = await page.evaluate(() => document.body.innerText);
    const bloqueado = /não tem permiss|sem permiss|acesso bloqueado|acesso restrito|não autorizado/i.test(corpoQR);
    const conteudoQR = /Validação por QR Code|Qr? ?Code/i.test(corpoQR) && /validar|verificar documento/i.test(corpoQR);
    reg('B4-url-bloqueada', bloqueado || !conteudoQR, bloqueado ? 'mensagem de bloqueio' : 'conteúdo não renderizado');
    await page.screenshot({ path: `${SS}/v37786_b_colab_inst_url_bloqueada.png` }).catch(() => {});
    await ctx.close();
  }

  // ================= C) ADMIN =================
  console.log('--- C) Admin real: criar agente ADMIN-NNNN ---');
  {
    const { ctx, page } = await novoCtx(browser);
    reg('C1-login-alfa', await loginAdmin(page, 'ADMIN-0001', '123456789'));
    await page.evaluate(() => { window.location.hash = '#/gov-trabalhadores'; });
    await page.waitForTimeout(4500);
    reg('C2-abrir-modal', await abrirModalEquipa(page));
    await preencherModal(page, AGENTE);
    await marcarSo(page, ['Correspondências']);
    await submeter(page);
    const est = await esperarMembro(page, AGENTE.nome, 25000);
    reg('C3-modal-fecha-e-agente-na-lista', est.fechou && est.naLista, JSON.stringify(est));
    await page.screenshot({ path: `${SS}/v37786_c_admin_pos_submeter.png` }).catch(() => {});
    const linhas = await linhasTr(page);
    const linha = linhas.find(l => l.includes(AGENTE.nome)) || '';
    numAgente = (linha.match(/ADMIN-\d{4}/) || [])[0] || '';
    reg('C4-numero-agente-admin', !!numAgente, numAgente);
    await page.goto(`${BASE}/admin?cb=${Date.now()}#/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
    reg('C5-relogin-alfa', await loginAdmin(page, 'ADMIN-0001', '123456789'));
    await page.evaluate(() => { window.location.hash = '#/gov-trabalhadores'; });
    await page.waitForTimeout(3000);
    reg('C6-agente-persiste-apos-reload', await esperarTexto(page, AGENTE.nome, 25000));
    await page.screenshot({ path: `${SS}/v37786_c_admin_persiste.png` }).catch(() => {});
    await ctx.close();
  }
  {
    const profs = await restGet(`profiles?bi=eq.${numAgente}&select=bi,name,role,phone,email`);
    reg('C7-profiles-row', profs.length === 1 && profs[0].role === 'admin' && profs[0].name === AGENTE.nome, JSON.stringify(profs));
    const u = await authUser(`agente.${numAgente.toLowerCase()}@admin.correiodigital.ao`);
    reg('C8-conta-auth', !!u && (u.user_metadata || {}).agent === numAgente, u ? u.email : 'sem conta');
  }

  // ================= D) LOGIN AGENTE ADMIN =================
  console.log('--- D) Login do agente admin + acesso limitado ---');
  {
    const { ctx, page } = await novoCtx(browser);
    reg('D1-login-agente-admin', await loginAdmin(page, numAgente, AGENTE.senha), `${numAgente} + senha`);
    const menu = (await page.evaluate(() => {
      const a = document.querySelector('aside') || document.body;
      return (a.innerText || '').toLowerCase();
    }));
    const tem = (s) => menu.includes(s.toLowerCase());
    reg('D2-menu-so-paginas-concedidas', tem('Correspondências') && tem('Perfil') && !tem('Auditoria') && !tem('Cidadãos') && !tem('Equipa'), JSON.stringify({ menu: menu.slice(0, 120) }));
    await page.screenshot({ path: `${SS}/v37786_d_agente_admin_menu.png` }).catch(() => {});
    await page.evaluate(() => { window.location.hash = '#/gov-seguranca'; });
    await page.waitForTimeout(4500);
    const corpoSeg = await page.evaluate(() => document.body.innerText);
    const bloqueado = /não tem permiss|sem permiss|acesso bloqueado|acesso restrito|não autorizado/i.test(corpoSeg);
    const conteudoSeg = /Auditoria|Registo de Auditoria|audit/i.test(corpoSeg) && /evento|tentativa|sess/i.test(corpoSeg);
    reg('D3-url-bloqueada', bloqueado || !conteudoSeg, bloqueado ? 'mensagem de bloqueio' : 'conteúdo não renderizado');
    await page.screenshot({ path: `${SS}/v37786_d_agente_admin_url_bloqueada.png` }).catch(() => {});
    await ctx.close();
  }

  // ================= E) LIMPEZA VIA UI =================
  console.log('--- E) Limpeza (eliminar via UI) ---');
  {
    const { ctx, page } = await novoCtx(browser);
    await loginInst(page, 'INAPEM-LLMM-01', '123456789');
    await page.locator('button', { hasText: /Equipa/i }).first().click().catch(() => {});
    await page.waitForTimeout(5000);
    await eliminarPelaUI(page, COLAB.nome);
    let profs = [], u = null;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 2000));
      profs = await restGet(`profiles?bi=eq.${numColab}&select=bi`);
      u = await authUser(`agente.${numColab.toLowerCase()}@inst.correiodigital.ao`);
      if (!profs.length && !u) break;
    }
    reg('E1-eliminar-colaborador-inst', profs.length === 0 && !u, `profiles=${JSON.stringify(profs)} auth=${!!u}`);
    await page.screenshot({ path: `${SS}/v37786_e_inst_pos_eliminar.png` }).catch(() => {});
    await ctx.close();
  }
  {
    const { ctx, page } = await novoCtx(browser);
    await loginAdmin(page, 'ADMIN-0001', '123456789');
    await page.evaluate(() => { window.location.hash = '#/gov-trabalhadores'; });
    await page.waitForTimeout(5500);
    await eliminarPelaUI(page, AGENTE.nome);
    let profs = [], u = null;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 2000));
      profs = await restGet(`profiles?bi=eq.${numAgente}&select=bi`);
      u = await authUser(`agente.${numAgente.toLowerCase()}@admin.correiodigital.ao`);
      if (!profs.length && !u) break;
    }
    reg('E2-eliminar-agente-admin', profs.length === 0 && !u, `profiles=${JSON.stringify(profs)} auth=${!!u}`);
    await page.screenshot({ path: `${SS}/v37786_e_admin_pos_eliminar.png` }).catch(() => {});
    await ctx.close();
  }
  const fim = await restGet('profiles?select=bi,role&or=(bi.like.INAPEM-LLMM-*,bi.like.ADMIN-0*)');
  const estranho = fim.filter(p => /^INAPEM-LLMM-\d{2,}$/.test(p.bi) && p.bi !== 'INAPEM-LLMM-01' || /^ADMIN-\d{4}$/.test(p.bi) && p.bi !== 'ADMIN-0001');
  reg('E3-cloud-limpa', estranho.length === 0, estranho.map(p => p.bi).join(',') || 'sem residíduos');
} catch (e) {
  console.log('EXCEPÇÃO:', String(e).slice(0, 400));
  FAILS++;
} finally {
  await browser.close();
}
console.log('\n==== RESUMO v37.78.6 ====');
resultados.forEach(r => console.log(r));
console.log(FAILS === 0 ? 'TODOS PASS' : `${FAILS} FALHAS`);
process.exit(FAILS === 0 ? 0 : 1);
