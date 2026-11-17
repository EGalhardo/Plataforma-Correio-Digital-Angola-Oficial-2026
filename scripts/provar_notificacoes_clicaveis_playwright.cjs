/**
 * PROVA — as notificações são CLICÁVEIS e abrem a respectiva página/item,
 * nas três áreas: Cidadão, Instituição e Administração.
 *
 *   node scripts/provar_notificacoes_clicaveis_playwright.cjs
 *
 * Regra pedida pelo dono: «Quando o utilizador preenche o inquérito e envia para
 * a instituição apenas aparece uma notificação. Torne possível clicar nas
 * notificações. Ao clicar deverá exibir a respectiva página.»
 *
 * Fluxo real: a instituição cria um inquérito normal, o cidadão responde, a
 * instituição recebe «Resposta ao Inquérito / Sondagem» e o clique tem de abrir
 * o inquérito correspondente em destaque. No fim os dados de teste são apagados.
 */
const { chromium } = require('playwright');
const fs = require('fs');

const env = {};
for (const l of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const URL_SB = env.SUPABASE_URL, SR = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };
const APP = 'https://correio-digital-angola-oficial.vercel.app';
const E = (ms) => new Promise((r) => setTimeout(r, ms));
const MARCA = 'NOTIF-CLIQ';
const q = async (s) => (await fetch(`${URL_SB}/rest/v1/${s}`, { headers: H })).json();

const falhas = [];
const ok = (cond, msg) => { console.log(`   ${cond ? '✓' : '✗'} ${msg}`); if (!cond) falhas.push(msg); };

async function entrar(browser, u, s, area = '') {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1250 }, locale: 'pt-PT' });
  const p = await ctx.newPage();
  // O portal tem três entradas: cidadão (#/login), instituição (#/institucional) e
  // administração (#/admin). Entrar pelo portal errado põe a conta no modo cidadão.
  await p.goto(`${APP}/${area}#/login`, { waitUntil: 'networkidle' }); await E(1400);
  await p.fill('input[name="cda-utilizador"]', u);
  await p.fill('input[name="cda-senha"]', s);
  await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(8000);
  return { ctx, p };
}

const texto = async (p) => (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');

/** Clica na primeira CÓPIA VISÍVEL (o cabeçalho existe em duplicado: desktop e móvel). */
async function clicarVisivel(locator) {
  const total = await locator.count();
  for (let i = 0; i < total; i++) {
    const alvo = locator.nth(i);
    if (await alvo.isVisible().catch(() => false)) { await alvo.click().catch(() => {}); return true; }
  }
  return false;
}
async function contarVisiveis(locator) {
  const total = await locator.count();
  let n = 0;
  for (let i = 0; i < total; i++) if (await locator.nth(i).isVisible().catch(() => false)) n++;
  return n;
}

/** Abre o menu da foto (o sino visível em todas as áreas da app). */
async function abrirMenuNotificacoes(p) {
  // Há duas cópias do cabeçalho (desktop/móvel) — clicar na que está visível.
  const perfis = p.locator('[aria-label="Menu de Perfil e Notificações"]');
  const total = await perfis.count();
  for (let i = 0; i < total; i++) {
    const alvo = perfis.nth(i);
    if (!await alvo.isVisible().catch(() => false)) continue;
    await alvo.click().catch(() => {}); await E(1600);
    if (await p.locator('[data-testid="menu-notificacoes"], [data-testid="menu-decomposicao"]').count() > 0) return true;
  }
  return false;
}

(async () => {
  const browser = await chromium.launch();

  // restos de execuções anteriores (a suite apaga sempre o que criou)
  const velhas = await q(`messages?select=id,sondagem_ids&subject=like.*${encodeURIComponent(MARCA)}*`);
  for (const v of velhas) {
    const ss = v.sondagem_ids || [];
    if (ss.length) {
      await fetch(`${URL_SB}/rest/v1/sondagem_respostas?sondagem_id=in.(${ss.join(',')})`, { method: 'DELETE', headers: H });
      await fetch(`${URL_SB}/rest/v1/sondagens?id=in.(${ss.join(',')})`, { method: 'DELETE', headers: H });
    }
    await fetch(`${URL_SB}/rest/v1/messages?id=eq.${v.id}`, { method: 'DELETE', headers: H });
  }
  const notifVelhas = await q(`notifications?select=id&message=like.*${encodeURIComponent(MARCA)}*`);
  for (const x of notifVelhas) await fetch(`${URL_SB}/rest/v1/notifications?id=eq.${x.id}`, { method: 'DELETE', headers: H });

  // ─── 1. INSTITUIÇÃO cria um inquérito NORMAL para o cidadão real ───
  console.log('\n1. INSTITUIÇÃO — criar inquérito');
  const inst = await entrar(browser, 'AGT-LMM-01', '123456789', 'institucional/');
  const assunto = `${MARCA} ${Math.floor(Math.random() * 90000) + 10000}`;
  await inst.p.locator('button:has-text("Correio")').first().click(); await E(3000);
  await inst.p.locator('button:has-text("Nova Mensagem")').first().click(); await E(2500);
  await inst.p.locator('input[placeholder*="BI" i]').first().fill('002399714LA030'); await E(2000);
  // inquérito NORMAL (mesma sequência da suite de detalhes)
  await inst.p.locator('button:has-text("Criar Inquérito")').first().click(); await E(1800);
  await inst.p.locator('button:has-text("OK")').last().click(); await E(2200);
  await inst.p.locator('input[placeholder="Escreva a pergunta da sondagem"]').fill(`Pergunta ${MARCA}`);
  await inst.p.locator('input[placeholder="Texto A"]').fill('Opção UNO');
  await inst.p.locator('input[placeholder="Texto B"]').fill('Opção DOIS');
  await inst.p.locator('button:has-text("CRIAR SONDAGEM")').click(); await E(4500);
  await inst.p.locator('input[placeholder*="tema" i]').first().fill(assunto); await E(800);
  await inst.p.locator('button:has-text("Enviar Mensagem Oficial")').first().click(); await E(2500);
  for (let v = 0; v < 4; v++) {
    for (const sel of ['[data-testid="popup-enviar-mensagem"] button', 'button:has-text("Enviar mesmo assim")', 'button:has-text("Enviar Correspondência")']) {
      const l = inst.p.locator(sel).first();
      if (await l.count() && await l.isVisible().catch(() => false)) { await l.click({ force: true }).catch(() => {}); await E(1800); }
    }
  }
  await E(4500);

  const msgs = await q(`messages?select=id,subject,recipient_bi,sondagem_ids&subject=like.*${encodeURIComponent(MARCA)}*&order=id.desc`);
  const msg = msgs[0];
  if (!msg) { console.log('   ✗ a mensagem não foi criada — a suite não pode continuar'); await browser.close(); process.exit(1); }
  console.log(`   mensagem ${msg.id} «${msg.subject}» · sondagens ${JSON.stringify(msg.sondagem_ids)}`);

  // ─── 2. CIDADÃO recebe, abre a NOTIFICAÇÃO e cai no sítio certo ───
  console.log('\n2. CIDADÃO — clicar na notificação da nova correspondência');
  const cid = await entrar(browser, '002399714LA030', '123456789');
  const menuCid = await abrirMenuNotificacoes(cid.p);
  ok(menuCid, 'cidadão: menu com notificações abre');
  const itemCid = cid.p.locator(`[data-testid="menu-item-notificacao"]:has-text("${assunto}")`);
  const temItemCid = await contarVisiveis(itemCid) > 0;
  ok(temItemCid, 'cidadão: a notificação da mensagem está no menu');
  if (temItemCid) {
    await clicarVisivel(itemCid); await E(6000);
    const t = await texto(cid.p);
    ok(new RegExp(assunto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(t), 'cidadão: o clique abriu a correspondência');
  }
  await cid.p.screenshot({ path: 'test-artifacts/notif-cidadao-clique.png', fullPage: false });

  // responder para a instituição receber a notificação de resposta
  console.log('\n3. CIDADÃO — responder ao inquérito');
  await cid.p.locator('button:has-text("Ver detalhes Completos")').first().click().catch(() => {}); await E(4000);
  await cid.p.locator('text=Opção UNO').first().click().catch(() => {}); await E(1200);
  await cid.p.locator('button:has-text("Responder ao Documento")').first().click().catch(() => {}); await E(2500);
  await cid.p.locator('button:has-text("CONFIRMAR RESPOSTAS")').first().click().catch(() => {}); await E(5000);
  const resp = await q(`sondagem_respostas?select=sondagem_id&sondagem_id=in.(${(msg.sondagem_ids || []).join(',')})`);
  ok(resp.length > 0, 'cidadão: resposta registada');
  await cid.ctx.close();

  // ─── 4. INSTITUIÇÃO vê e clica na notificação de resposta ───
  console.log('\n4. INSTITUIÇÃO — clicar na notificação «Resposta ao Inquérito»');
  const notifInst = await q(`notifications?select=id,target_bi,title,message&title=like.*Resposta*&order=id.desc&limit=20`);
  const minha = notifInst.find((x) => String(x.message || '').includes(assunto));
  ok(!!minha, `instituição: notificação de resposta gravada (target_bi=${minha?.target_bi || '—'})`);

  await inst.p.goto(`${APP}/institucional#/home`, { waitUntil: 'networkidle' }).catch(() => {});
  await E(4000);
  await inst.p.keyboard.press('Escape').catch(() => {});
  const menuInst = await abrirMenuNotificacoes(inst.p);
  ok(menuInst, 'instituição: menu com notificações abre');
  const contador = await contarVisiveis(inst.p.locator('[data-testid="menu-item-notificacao"]'));
  ok(contador > 0, `instituição: notificações clicáveis no menu (${contador})`);
  const itemInst = inst.p.locator(`[data-testid="menu-item-notificacao"]:has-text("${assunto}")`);
  const achou = await contarVisiveis(itemInst) > 0;
  ok(achou, 'instituição: VÊ a notificação «Resposta ao Inquérito» (antes era descartada)');
  if (achou) {
    await clicarVisivel(itemInst); await E(7000);
    const t = await texto(inst.p);
    ok(/Inquéritos/i.test(t), 'instituição: o clique abriu a página Inquéritos');
    const destaque = await inst.p.locator('[data-destaque="sim"]').count();
    ok(destaque > 0, 'instituição: o inquérito respondido ficou em destaque');
  }
  await inst.p.screenshot({ path: 'test-artifacts/notif-instituicao-clique.png', fullPage: false });

  // Centro de Notificações: atalho + item em destaque + navegação
  await abrirMenuNotificacoes(inst.p);
  const verCentro = inst.p.locator('[data-testid="menu-ver-centro-notificacoes"]');
  const temVerCentro = await contarVisiveis(verCentro) > 0;
  ok(temVerCentro, 'instituição: atalho «Ver Centro de Notificações» presente');
  if (temVerCentro) {
    await clicarVisivel(verCentro); await E(5000);
    ok(/Centro de Notificações/i.test(await texto(inst.p)), 'instituição: Centro de Notificações abre pelo atalho');
  }

  // clicar na linha DENTRO do Centro → abre a página respectiva com o item em destaque
  const itemCentro = inst.p.locator(`[data-testid="centro-item-notificacao"]:has-text("${assunto}")`);
  const achouCentro = await contarVisiveis(itemCentro) > 0;
  ok(achouCentro, 'instituição: a notificação está listada no Centro');
  if (achouCentro) {
    await clicarVisivel(itemCentro); await E(8000);
    const tCentro = await texto(inst.p);
    ok(/Crie e realize inquéritos/i.test(tCentro), 'instituição: o clique no Centro abriu a página Inquéritos');
    const destaqueCentro = await contarVisiveis(inst.p.locator('[data-destaque="sim"]'));
    ok(destaqueCentro > 0, 'instituição: o inquérito respondido aparece em destaque');
  }

  // «Abrir inquéritos» a partir do cartão em destaque do Centro
  await abrirMenuNotificacoes(inst.p);
  if (await contarVisiveis(inst.p.locator('[data-testid="menu-ver-centro-notificacoes"]')) > 0) {
    await clicarVisivel(inst.p.locator('[data-testid="menu-ver-centro-notificacoes"]')); await E(5000);
    const irInq = inst.p.locator('[data-testid="notificacao-ir-inqueritos"]');
    if (await contarVisiveis(irInq) > 0) {
      await clicarVisivel(irInq); await E(6000);
      ok(/Crie e realize inquéritos/i.test(await texto(inst.p)), 'instituição: «Abrir inquéritos» leva à página correcta');
    }
  }

  await inst.ctx.close();

  // ─── 5. ADMINISTRAÇÃO — notificação real → clique abre a página respectiva ───
  console.log('\n5. ADMINISTRAÇÃO — clicar numa notificação real');
  // A Administração não emite notificações para si própria (só registos por
  // homologar e avisos operacionais), por isso a suite cria a sua: um aviso
  // operacional real endereçado ao agente ADMIN-0001, como o sistema faria.
  const tituloAdm = `Aviso Operacional ${MARCA} ${Date.now().toString().slice(-5)}`;
  const inseridoAdm = await fetch(`${URL_SB}/rest/v1/notifications`, {
    method: 'POST', headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify([{ target_bi: 'ADMIN-0001', title: tituloAdm, message: `Expediente registado para revisão. ${MARCA}`, time_text: 'Agora', type: 'info', target_tab: 'gov-correspondencias' }]),
  }).then((r) => r.json()).catch(() => []);
  const notifAdmId = Array.isArray(inseridoAdm) ? inseridoAdm[0]?.id : undefined;

  const adm = await entrar(browser, 'ADMIN-0001', '987654321', 'admin/');
  const menuAdm = await abrirMenuNotificacoes(adm.p);
  ok(menuAdm, 'admin: menu abre');
  const itemAdm = adm.p.locator(`[data-testid="menu-item-notificacao"]:has-text("${tituloAdm}")`);
  const achouAdm = await contarVisiveis(itemAdm) > 0;
  ok(achouAdm, 'admin: a notificação do agente está no menu e é clicável');
  if (achouAdm) {
    await clicarVisivel(itemAdm); await E(7000);
    const tAdm = await texto(adm.p);
    const naPagina = /Correspondências|Expediente|Governa/i.test(tAdm);
    ok(naPagina, 'admin: o clique abriu a página respectiva');
  }
  const centroAdm = adm.p.locator('[data-testid="menu-ver-centro-notificacoes"]');
  await abrirMenuNotificacoes(adm.p);
  const temCentro = await contarVisiveis(centroAdm) > 0;
  ok(temCentro, 'admin: atalho para o Centro de Notificações disponível');
  if (temCentro) {
    await clicarVisivel(centroAdm); await E(5000);
    ok(/Centro de Notificações/i.test(await texto(adm.p)), 'admin: Centro de Notificações abre');
  }
  await adm.p.screenshot({ path: 'test-artifacts/notif-admin.png', fullPage: false });
  await adm.ctx.close();

  // ─── limpeza ───
  const sids = msg.sondagem_ids || [];
  if (sids.length) {
    await fetch(`${URL_SB}/rest/v1/sondagem_respostas?sondagem_id=in.(${sids.join(',')})`, { method: 'DELETE', headers: H });
    await fetch(`${URL_SB}/rest/v1/sondagens?id=in.(${sids.join(',')})`, { method: 'DELETE', headers: H });
  }
  await fetch(`${URL_SB}/rest/v1/messages?id=eq.${msg.id}`, { method: 'DELETE', headers: H });
  if (minha) await fetch(`${URL_SB}/rest/v1/notifications?id=eq.${minha.id}`, { method: 'DELETE', headers: H });
  if (notifAdmId) await fetch(`${URL_SB}/rest/v1/notifications?id=eq.${notifAdmId}`, { method: 'DELETE', headers: H });
  const notifCid = await q(`notifications?select=id,target_bi,message&message=like.*${encodeURIComponent(assunto)}*`);
  for (const x of notifCid) await fetch(`${URL_SB}/rest/v1/notifications?id=eq.${x.id}`, { method: 'DELETE', headers: H });
  const sondOrfas = await q(`sondagens?select=id&pergunta=like.*${encodeURIComponent(MARCA)}*`);
  for (const sx of sondOrfas) {
    await fetch(`${URL_SB}/rest/v1/sondagem_respostas?sondagem_id=eq.${sx.id}`, { method: 'DELETE', headers: H });
    await fetch(`${URL_SB}/rest/v1/sondagens?id=eq.${sx.id}`, { method: 'DELETE', headers: H });
  }
  const sobra = await q(`messages?select=id&subject=like.*${encodeURIComponent(MARCA)}*`);
  console.log(`\nlimpeza: ${sobra.length === 0 ? '✓ 0 restantes' : '✗ ' + sobra.length}`);

  await browser.close();
  console.log('\n' + '─'.repeat(68));
  if (!falhas.length) { console.log('RESULTADO: APROVADO'); process.exit(0); }
  console.log('RESULTADO: REPROVADO');
  falhas.forEach((f) => console.log('  · ' + f));
  process.exit(1);
})();
