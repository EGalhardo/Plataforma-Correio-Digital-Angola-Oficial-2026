/**
 * PROVA — é possível MUDAR A PALAVRA-PASSE nos dois popups de segurança:
 *   · Cidadão      → «Configuração de Segurança» (Identidade Digital de Angola)
 *   · Instituição  → «Segurança de Agente do Estado» (Portal de Serviços)
 *
 *   node scripts/provar_mudanca_senha_playwright.cjs
 *
 * Regra pedida pelo dono: «não é possível mudar a senha (…) corrija e teste de
 * modo que seja possível mudar a senha».
 *
 * Prova em cada área:
 *   1. senha actual ERRADA      → erro claro de senha actual (nunca «indisponível»);
 *   2. nova < 8 caracteres      → recusa de senha fraca;
 *   3. alteração válida         → mensagem de sucesso;
 *   4. SAIR e ENTRAR com a NOVA senha (prova que mudou mesmo no Auth);
 *   5. repor a senha original pela mesma UI (deixa as contas reais como estavam).
 */
const { chromium } = require('playwright');

const APP = 'https://correio-digital-angola-oficial.vercel.app';
const E = (ms) => new Promise((r) => setTimeout(r, ms));
const FALHAS = [];
const ok = (cond, msg) => { console.log(`   ${cond ? '✓' : '✗'} ${msg}`); if (!cond) FALHAS.push(msg); };

const CONTAS = [
  { nome: 'CIDADÃO',     user: '002399714LA030', senha: '123456789', area: '',              botao: 'Alterar Palavra-passe', titulo: /Configuração de Segurança/i },
  { nome: 'INSTITUIÇÃO', user: 'AGT-LMM-01',     senha: '123456789', area: 'institucional/', botao: 'Alterar Senha & 2FA',   titulo: /Segurança de Agente do Estado/i },
];

async function entrar(browser, c, senha) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1250 }, locale: 'pt-PT' });
  const p = await ctx.newPage();
  await p.goto(`${APP}/${c.area}#/login`, { waitUntil: 'networkidle' }); await E(1500);
  await p.fill('input[name="cda-utilizador"]', c.user);
  await p.fill('input[name="cda-senha"]', senha);
  await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(9000);
  return { ctx, p };
}

const texto = async (p) => (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');

async function abrirPopup(p, c) {
  const perfil = p.locator('button:has-text("Perfil")').first();
  await perfil.click().catch(() => {}); await E(4500);
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

(async () => {
  const browser = await chromium.launch();

  for (const c of CONTAS) {
    console.log(`\n═══ ${c.nome} — popup de segurança ═══`);
    const novaSenha = `NovaSenha${Date.now().toString().slice(-6)}`;
    let s = await entrar(browser, c, c.senha);

    ok(await abrirPopup(s.p, c), `${c.nome}: o popup abre (${c.titulo.source.replace(/[\\/i]/g, '')})`);
    ok(await s.p.locator('[data-testid="campo-senha-actual"]').count() > 0, `${c.nome}: formulário de palavra-passe presente`);

    // 1. senha actual ERRADA
    let r = await submeter(s.p, 'SenhaErrada999', novaSenha);
    ok(/actual está incorrecta/i.test(r.erro), `${c.nome}: senha actual errada → «A palavra-passe actual está incorrecta» (recebido: "${r.erro.slice(0, 60)}")`);
    ok(!/indisponível/i.test(r.erro), `${c.nome}: já não aparece «Serviço temporariamente indisponível»`);

    // 2. nova senha fraca
    r = await submeter(s.p, c.senha, 'abc');
    ok(/pelo menos 8|mais forte/i.test(r.erro), `${c.nome}: nova senha fraca é recusada`);

    // 3. alteração válida
    r = await submeter(s.p, c.senha, novaSenha);
    ok(/actualizada|sucesso/i.test(r.sucesso), `${c.nome}: alteração válida → sucesso ("${r.sucesso.slice(0, 60)}")`);
    await s.p.screenshot({ path: `test-artifacts/senha-${c.nome.toLowerCase()}-sucesso.png`, fullPage: false });
    await s.ctx.close();

    // 4. entrar com a NOVA senha (prova real no Auth)
    const s2 = await entrar(browser, c, novaSenha);
    const t2 = await texto(s2.p);
    const entrou = !/ENTRAR NO PORTAL/i.test(t2.slice(0, 400)) && /Painel|Correio|ÁREA/i.test(t2);
    ok(entrou, `${c.nome}: entra com a NOVA palavra-passe`);

    // a senha antiga deixa de funcionar?
    const s3 = await entrar(browser, c, c.senha);
    const t3 = await texto(s3.p);
    const antigaRecusada = /ENTRAR NO PORTAL/i.test(t3.slice(0, 500));
    ok(antigaRecusada, `${c.nome}: a palavra-passe ANTIGA já não entra`);
    await s3.ctx.close();

    // 5. repor a senha original pela MESMA UI (sessão válida com a senha nova)
    let s5 = await entrar(browser, c, novaSenha);
    let okReposicao = await abrirPopup(s5.p, c);
    if (!okReposicao) {
      // o popup pode ficar atrás de um modal; tentar uma vez mais pelo perfil
      await s5.p.keyboard.press('Escape').catch(() => {});
      await E(1200);
      okReposicao = await abrirPopup(s5.p, c);
    }
    ok(okReposicao, `${c.nome}: popup acessível para repor a senha`);
    if (okReposicao) {
      const rr = await submeter(s5.p, novaSenha, c.senha);
      ok(/actualizada|sucesso/i.test(rr.sucesso), `${c.nome}: senha original reposta pela UI ("${rr.sucesso.slice(0, 50)}")`);
    }
    await s5.ctx.close();

    // confirmação final: a conta volta a entrar com a senha original
    const s4 = await entrar(browser, c, c.senha);
    const t4 = await texto(s4.p);
    ok(!/ENTRAR NO PORTAL/i.test(t4.slice(0, 500)), `${c.nome}: conta reposta — entra com a senha original`);
    await s4.ctx.close();
  }

  await browser.close();
  console.log('\n' + '─'.repeat(70));
  if (!FALHAS.length) { console.log('RESULTADO: APROVADO'); process.exit(0); }
  console.log('RESULTADO: REPROVADO');
  FALHAS.forEach((f) => console.log('  · ' + f));
  process.exit(1);
})();
