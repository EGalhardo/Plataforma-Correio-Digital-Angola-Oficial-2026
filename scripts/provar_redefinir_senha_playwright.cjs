/**
 * PROVA — REDEFINIR A PALAVRA-PASSE nos dois sítios onde o dono reportou falha:
 *   A) popup «Configuração de Segurança» (cidadão) e «Segurança de Agente do
 *      Estado» (instituição);
 *   B) página «Redefinir Senha» («Esqueci Senha») — fluxo REAL por e-mail,
 *      incluindo o link que o mailer envia.
 *
 *   node scripts/provar_redefinir_senha_playwright.cjs
 *
 * Contas REAIS de produção. A suite termina sempre com as senhas originais
 * (123456789) — não deixa o ambiente alterado.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP = 'https://correio-digital-angola-oficial.vercel.app';
const SUPA = 'https://klrclczcahfycfdxzdqs.supabase.co';
const E = (ms) => new Promise((r) => setTimeout(r, ms));
const FALHAS = [];
const ok = (cond, msg) => { console.log(`   ${cond ? '✓' : '✗'} ${msg}`); if (!cond) FALHAS.push(msg); };

const env = (() => {
  const txt = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  const out = {};
  for (const l of txt.split('\n')) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^"|"$/g, '');
  }
  return out;
})();
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

const EMAIL_CIDADAO = 'bi.002399714la030@cidadao.correiodigital.ao';
const CONTAS = [
  { nome: 'CIDADÃO', user: '002399714LA030', senha: '123456789', area: '', botao: 'Alterar Palavra-passe', titulo: 'Configuração de Segurança' },
  { nome: 'INSTITUIÇÃO', user: 'AGT-LMM-01', senha: '123456789', area: 'institucional/', botao: 'Alterar Senha & 2FA', titulo: 'Segurança de Agente do Estado' },
];

const texto = async (p) => (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');

async function entrar(browser, c, senha) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1250 }, locale: 'pt-PT' });
  const p = await ctx.newPage();
  await p.goto(`${APP}/${c.area}#/login`, { waitUntil: 'networkidle' }); await E(1500);
  await p.fill('input[name="cda-utilizador"]', c.user);
  await p.fill('input[name="cda-senha"]', senha);
  await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(9000);
  const t = await texto(p);
  return { ctx, p, entrou: !/ENTRAR NO PORTAL/i.test(t.slice(0, 500)) };
}

/** Login com repetição: o portal pode demorar a hidratar e o 1.º render ainda
 *  mostrar o formulário, o que produzia falsos negativos na verificação final
 *  (comprovado: o Auth aceita a senha e a suite irmã passa). */
async function entrarComRetry(browser, c, senha, tentativas = 3) {
  let ultima = null;
  for (let i = 0; i < tentativas; i++) {
    const s = await entrar(browser, c, senha);
    if (s.entrou) { if (i > 0) console.log(`   (login confirmado à ${i + 1}.ª tentativa)`); return s; }
    ultima = s; await s.ctx.close();
    await E(3000);
  }
  return ultima;
}

async function abrirPopup(p, c) {
  await p.locator('button:has-text("Perfil")').first().click().catch(() => {}); await E(4500);
  const btn = p.locator(`button:has-text("${c.botao}")`).first();
  if (!await btn.count()) return false;
  await btn.click(); await E(2500);
  return /ALTERAR PALAVRA-PASSE DE ACESSO/i.test(await texto(p));
}

async function submeter(p, actual, nova) {
  await p.locator('[data-testid="campo-senha-actual"]').first().fill(actual);
  await p.locator('[data-testid="campo-senha-nova"]').first().fill(nova);
  await p.locator('[data-testid="campo-senha-confirmar"]').first().fill(nova);
  await p.locator('[data-testid="botao-actualizar-senha"]').first().click();
  await E(6000);
  const erro = await p.locator('[data-testid="senha-erro"]').first().innerText().catch(() => '');
  const sucesso = await p.locator('[data-testid="senha-sucesso"]').first().innerText().catch(() => '');
  return { erro: (erro || '').trim(), sucesso: (sucesso || '').trim() };
}

/** Reposição garantida da senha pelo Admin API (só usada se a UI falhar). */
async function reporPorApi(email, senha) {
  const r = await fetch(`${SUPA}/auth/v1/admin/users/${encodeURIComponent(email)}`, {
    method: 'PUT',
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: senha, email_confirm: true }),
  });
  if (!r.ok) {
    const lista = await (await fetch(`${SUPA}/auth/v1/admin/users?per_page=200`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })).json();
    const u = (lista.users || []).find((x) => x.email === email);
    if (!u) throw new Error(`conta ${email} não encontrada`);
    const r2 = await fetch(`${SUPA}/auth/v1/admin/users/${u.id}`, {
      method: 'PUT',
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: senha, email_confirm: true }),
    });
    return r2.ok;
  }
  return true;
}

async function linkDeRecuperacao(email) {
  const r = await fetch(`${SUPA}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'recovery', email, options: { redirectTo: APP } }),
  });
  const j = await r.json().catch(() => ({}));
  return String(j.action_link || '');
}

(async () => {
  if (!SERVICE || !ANON) { console.error('Faltam chaves Supabase no .env'); process.exit(1); }
  const browser = await chromium.launch();

  // ───────────────────────────── A) POPUPS DE SEGURANÇA ─────────────────────
  for (const c of CONTAS) {
    console.log(`\n═══ A) ${c.nome} — popup «${c.titulo}» ═══`);
    const nova = `Troca${Date.now().toString().slice(-7)}A`;
    let s = await entrar(browser, c, c.senha);
    ok(s.entrou, `${c.nome}: entra no portal com a senha actual`);

    ok(await abrirPopup(s.p, c), `${c.nome}: o popup «${c.titulo}» abre com o formulário`);
    ok(await s.p.locator('[data-testid="campo-senha-actual"]').count() > 0, `${c.nome}: campos de palavra-passe presentes`);
    ok(await s.p.locator('[data-testid="botao-recuperar-senha-popup"]').count() > 0,
      `${c.nome}: existe saída «Não sabe a palavra-passe actual? Recuperar por e-mail»`);

    // 1. senha actual errada → erro claro + via de recuperação (nunca «indisponível»)
    let r = await submeter(s.p, 'SenhaErrada999', nova);
    ok(/actual está incorrecta/i.test(r.erro), `${c.nome}: senha actual errada → erro claro (${r.erro.slice(0, 55)}…)`);
    ok(!/indisponível/i.test(r.erro), `${c.nome}: já não cai no genérico «Serviço temporariamente indisponível»`);
    ok(/recuper/i.test(r.erro), `${c.nome}: o erro indica a recuperação por e-mail como alternativa`);

    // 2. nova senha fraca
    r = await submeter(s.p, c.senha, 'abc');
    ok(/pelo menos 8|mais forte/i.test(r.erro), `${c.nome}: nova senha fraca é recusada`);

    // 3. alteração válida
    r = await submeter(s.p, c.senha, nova);
    ok(/actualizada|sucesso/i.test(r.sucesso), `${c.nome}: alteração válida → «${r.sucesso.slice(0, 45)}…»`);
    ok(await s.p.locator('[data-testid="botao-sair-com-nova-senha"]').count() > 0,
      `${c.nome}: após o sucesso aparece «Sair e entrar com a nova palavra-passe»`);
    await s.ctx.close();

    // 4. a nova senha entra mesmo (prova no Auth) e a antiga já não
    const s2 = await entrar(browser, c, nova);
    ok(s2.entrou, `${c.nome}: entra com a NOVA palavra-passe`);
    await s2.ctx.close();
    const s3 = await entrar(browser, c, c.senha);
    ok(!s3.entrou, `${c.nome}: a palavra-passe ANTIGA já não entra`);
    await s3.ctx.close();

    // 5. repor pela própria UI
    let s5 = await entrar(browser, c, nova);
    const abriu = await abrirPopup(s5.p, c);
    ok(abriu, `${c.nome}: popup reabre para repor a senha`);
    if (abriu) {
      const rr = await submeter(s5.p, nova, c.senha);
      ok(/actualizada|sucesso/i.test(rr.sucesso), `${c.nome}: senha original reposta pela UI`);
    }
    await s5.ctx.close();

    // 6. confirmação final
    const s4 = await entrarComRetry(browser, c, c.senha);
    ok(s4.entrou, `${c.nome}: conta reposta — entra com a senha original`);
    await s4.ctx.close();
    if (!s4.entrou) { await reporPorApi(c.email || (c.nome === 'CIDADÃO' ? EMAIL_CIDADAO : 'agente.agt-lmm-01@inst.correiodigital.ao'), c.senha); }
  }

  // ─────────────────── B) PÁGINA «REDEFINIR SENHA» (link real) ───────────────
  console.log('\n═══ B) CIDADÃO — página «Redefinir Senha» (Esqueci Senha / link do e-mail) ═══');
  const novaRec = `Recup${Date.now().toString().slice(-7)}B`;
  const ctxB = await browser.newContext({ viewport: { width: 1400, height: 1250 }, locale: 'pt-PT' });
  const pb = await ctxB.newPage();
  const respostas = [];
  pb.on('response', async (r) => {
    if (r.url().includes('/api/enviar-email-recuperacao')) {
      let corpo = ''; try { corpo = await r.text(); } catch {}
      respostas.push({ status: r.status(), corpo });
    }
  });
  await pb.goto(`${APP}/#/login`, { waitUntil: 'networkidle' }); await E(1500);
  await pb.locator('button:has-text("Esqueci Senha")').first().click(); await E(2500);
  ok(/Recuperar Senha/i.test(await texto(pb)), 'B: «Esqueci Senha» abre a página Redefinir Senha');

  const campoEmail = pb.locator('input[type="email"]').first();
  ok(await campoEmail.count() > 0, 'B: campo de e-mail presente');
  await campoEmail.fill(EMAIL_CIDADAO);
  await pb.locator('button:has-text("Enviar")').first().click(); await E(9000);
  const tEnvio = await texto(pb);
  ok(/VERIFIQUE O SEU E-MAIL/i.test(tEnvio), 'B: pedido aceite — ecrã «Verifique o seu e-mail»');
  const resp = respostas[respostas.length - 1];
  ok(!!resp && resp.status === 200, `B: POST /api/enviar-email-recuperacao responde 200 (${resp ? resp.status : 'sem pedido'})`);
  ok(!!resp && /"ok":true/.test(resp.corpo), `B: resposta neutra anti-enumeração (${resp ? resp.corpo.slice(0, 60) : '—'})`);
  ok(/nunca chegará|e-mail técnico|Administração/i.test(tEnvio), 'B: o ecrã explica honestamente o caso das contas só com B.I.');
  await ctxB.close();

  const link = await linkDeRecuperacao(EMAIL_CIDADAO);
  ok(!!link, 'B: a plataforma gera o link de recuperação');
  ok(!/localhost/.test(link), `B: o link aponta para PRODUÇÃO e não para localhost (${link.slice(0, 80)}…)`);

  const ctxC = await browser.newContext({ viewport: { width: 1400, height: 1250 }, locale: 'pt-PT' });
  const pc = await ctxC.newPage();
  await pc.goto(link, { waitUntil: 'networkidle' }).catch(() => {}); await E(8000);
  ok(/recuperar-senha/.test(pc.url()), `B: o link abre a página de nova senha (${pc.url().slice(-40)})`);
  ok(/DEFINIR NOVA SENHA/i.test(await texto(pc)), 'B: a página mostra «Definir Nova Senha» (sessão de recuperação válida)');
  const campos = pc.locator('input[type="password"]');
  ok(await campos.count() >= 2, 'B: campos «nova senha» e «confirmar» presentes');
  await campos.nth(0).fill(novaRec);
  await campos.nth(1).fill(novaRec);
  await pc.locator('button:has-text("GRAVAR")').first().click(); await E(8000);
  const tGrav = await texto(pc);
  ok(/NOVA SENHA GRAVADA/i.test(tGrav), 'B: a nova senha é GRAVADA na plataforma');
  await ctxC.close();

  const cCid = CONTAS[0];
  const sNova = await entrar(browser, cCid, novaRec);
  ok(sNova.entrou, 'B: entra no portal com a senha definida pela recuperação');
  await sNova.ctx.close();

  // repor a senha original (o ambiente fica como estava)
  const reposto = await reporPorApi(EMAIL_CIDADAO, cCid.senha);
  ok(reposto, 'B: senha original reposta na conta real');
  const sFinal = await entrarComRetry(browser, cCid, cCid.senha);
  ok(sFinal.entrou, 'B: confirmação final — entra com a senha original');
  await sFinal.ctx.close();

  await browser.close();
  console.log(`\n${FALHAS.length === 0 ? 'RESULTADO: APROVADO' : `RESULTADO: FALHOU (${FALHAS.length})`}`);
  FALHAS.forEach((f) => console.log('  ✗ ' + f));
  process.exit(FALHAS.length === 0 ? 0 : 1);
})().catch((e) => { console.error('ERRO FATAL:', e); process.exit(1); });
