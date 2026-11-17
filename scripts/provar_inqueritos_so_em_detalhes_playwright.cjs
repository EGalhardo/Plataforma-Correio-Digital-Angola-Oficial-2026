/**
 * PROVA — os inquéritos só aparecem em «Ver detalhes Completos».
 *
 *   node scripts/provar_inqueritos_so_em_detalhes_playwright.cjs
 *
 * Regra pedida pelo dono: na página «Detalhe da Correspondência» NÃO aparece
 * nenhum inquérito (normal ou com IA). Só depois de clicar em «Ver detalhes
 * Completos» é que os inquéritos ficam visíveis e respondíveis.
 *
 * Testa os dois tipos com as contas reais, e confirma que a resposta continua
 * a funcionar depois da mudança. Cria e remove as suas próprias mensagens.
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
const MARCA = 'SO-DETALHES';
const q = async (s) => (await fetch(`${URL_SB}/rest/v1/${s}`, { headers: H })).json();

async function entrar(browser, base, u, s) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1250 }, locale: 'pt-PT' });
  const p = await ctx.newPage();
  await p.goto(`${APP}${base}/#/login`, { waitUntil: 'networkidle' }); await E(1400);
  await p.fill('input[name="cda-utilizador"]', u);
  await p.fill('input[name="cda-senha"]', s);
  await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(7000);
  return { ctx, p };
}

async function enviar(inst, preencherBloco) {
  await inst.p.locator('button:has-text("Correio")').first().click(); await E(3000);
  await inst.p.locator('button:has-text("Nova Mensagem")').first().click(); await E(2500);
  await inst.p.locator('input[placeholder*="BI" i]').first().fill('002399714LA030'); await E(2000);
  await preencherBloco();
  await inst.p.locator('input[placeholder*="tema" i]').first().fill(ASSUNTO); await E(800);
  await inst.p.locator('button:has-text("Enviar Mensagem Oficial")').first().click(); await E(2500);
  for (let v = 0; v < 4; v++) {
    for (const sel of ['[data-testid="popup-enviar-mensagem"] button', 'button:has-text("Enviar mesmo assim")', 'button:has-text("Enviar Correspondência")']) {
      const l = inst.p.locator(sel).first();
      if (await l.count() && await l.isVisible().catch(() => false)) { await l.click({ force: true }).catch(() => {}); await E(1800); }
    }
  }
  await E(4500);
}

let ASSUNTO = '';
(async () => {
  const falhas = [];
  const browser = await chromium.launch();

  // ─── CASO 1: inquérito NORMAL ───
  ASSUNTO = `${MARCA} NORMAL ${Date.now().toString().slice(-5)}`;
  console.log(`\n1. INQUÉRITO NORMAL — «${ASSUNTO}»`);
  const inst = await entrar(browser, '/institucional', 'AGT-LMM-01', '123456789');
  await enviar(inst, async () => {
    await inst.p.locator('button:has-text("Criar Inquérito")').first().click(); await E(1800);
    await inst.p.locator('button:has-text("OK")').last().click(); await E(2200);
    await inst.p.locator('input[placeholder="Escreva a pergunta da sondagem"]').fill(ASSUNTO);
    await inst.p.locator('input[placeholder="Texto A"]').fill('Opção ALFA');
    await inst.p.locator('input[placeholder="Texto B"]').fill('Opção BETA');
    await inst.p.locator('button:has-text("CRIAR SONDAGEM")').click(); await E(4500);
  });
  await inst.ctx.close();

  // ─── CASO 2: inquérito COM IA ───
  ASSUNTO = `${MARCA} IA ${Date.now().toString().slice(-5)}`;
  console.log(`\n2. INQUÉRITO COM IA — «${ASSUNTO}»`);
  const inst2 = await entrar(browser, '/institucional', 'AGT-LMM-01', '123456789');
  await enviar(inst2, async () => {
    await inst2.p.locator('button:has-text("Criar Inquérito")').first().click(); await E(1800);
    await inst2.p.locator('text=Inquérito IA').first().click().catch(() => {}); await E(1200);
    await inst2.p.locator('button:has-text("OK")').last().click(); await E(2500);
    const campos = inst2.p.locator('textarea');
    const n = await campos.count();
    await campos.nth(n - 2).fill(`${ASSUNTO} — as famílias têm acesso a água e energia?`);
    await campos.nth(n - 1).fill('Número de pessoas em casa; acesso a água; horas de energia por dia.');
    await inst2.p.locator('button:has-text("GERAR COM IA")').first().click().catch(() => {});
    await E(30000);
    await inst2.p.locator('button:has-text("CRIAR INQUÉRITO")').last().click({ timeout: 20000 }).catch(() => {});
    await E(6000);
  });
  await inst2.ctx.close();

  const msgs = await q(`messages?select=id,subject,sondagem_ids,inquerito_ia_ids&subject=like.*${encodeURIComponent(MARCA)}*&order=id.asc`);
  console.log(`\n   mensagens criadas: ${JSON.stringify(msgs.map((m) => ({ s: m.subject, sond: m.sondagem_ids, ia: m.inquerito_ia_ids })))}`);

  // ─── CIDADÃO: verifica as duas vistas ───
  const cid = await entrar(browser, '', '002399714LA030', '123456789');
  await cid.p.locator('button:has-text("Correio")').first().click(); await E(3500);

  const casos = [
    { nome: 'NORMAL', assunto: msgs.find((m) => /NORMAL/.test(m.subject))?.subject, pista: /Opção ALFA/i, nome2: /SONDAGEM/i },
    { nome: 'COM IA', assunto: msgs.find((m) => /IA/.test(m.subject) && !/NORMAL/.test(m.subject))?.subject, pista: /Iniciar Inquérito|Inquérito com IA/i, nome2: /Iniciar Inquérito/i },
  ];

  for (const c of casos) {
    if (!c.assunto) { falhas.push(`${c.nome}: mensagem não foi enviada`); continue; }
    console.log(`\n3.${c.nome === 'NORMAL' ? 'a' : 'b'}. CIDADÃO — «${c.assunto}»`);
    // recarregar a caixa de correio para garantir que a mensagem acabada de criar aparece
    await cid.p.goto(`${APP}/#/correio`, { waitUntil: 'networkidle' }).catch(() => {});
    await E(2000);
    await cid.p.locator('button:has-text("Correio")').first().click().catch(() => {}); await E(3000);
    const linha = cid.p.locator(`tr:has-text("${c.assunto}")`).first();
    await linha.waitFor({ state: 'visible', timeout: 30000 }).catch(async () => {
      await cid.p.reload({ waitUntil: 'networkidle' }); await E(4000);
      await cid.p.locator('button:has-text("Correio")').first().click().catch(() => {}); await E(3000);
    });
    await cid.p.locator(`tr:has-text("${c.assunto}")`).first().locator('button').first().click({ timeout: 30000 }); await E(5500);
    let tela = (await cid.p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
    const visivelNaPagina = c.pista.test(tela) || c.nome2.test(tela);
    console.log(`   Detalhe da Correspondência mostra o inquérito? ${visivelNaPagina ? '✗ SIM' : '✓ não'}`);
    if (visivelNaPagina) falhas.push(`${c.nome}: inquérito visível na página de detalhe`);

    const btn = cid.p.locator('button:has-text("Ver detalhes Completos")').first();
    if (!await btn.count()) { falhas.push(`${c.nome}: botão «Ver detalhes Completos» ausente`); continue; }
    await btn.click(); await E(5000);
    tela = (await cid.p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
    const visivelNaVista = c.pista.test(tela);
    console.log(`   Ver detalhes Completos mostra o inquérito? ${visivelNaVista ? '✓ SIM' : '✗ não'}`);
    if (!visivelNaVista) falhas.push(`${c.nome}: inquérito não aparece em Ver detalhes Completos`);
    await cid.p.screenshot({ path: `test-artifacts/so-detalhes-${c.nome.replace(/ /g, '')}.png`, fullPage: true });

    // responder continua a funcionar
    if (c.nome === 'NORMAL') {
      await cid.p.locator('text=Opção ALFA').first().click().catch(() => {}); await E(1000);
      await cid.p.locator('button:has-text("Responder ao Documento")').first().click().catch(() => {}); await E(2500);
      const sem = ((await cid.p.evaluate(() => document.body.innerText)).match(/Sem escolha/g) || []).length;
      await cid.p.locator('button:has-text("CONFIRMAR RESPOSTAS")').first().click().catch(() => {}); await E(4000);
      const r = await q(`sondagem_respostas?select=sondagem_id&sondagem_id=in.(${(msgs.find((m) => /NORMAL/.test(m.subject))?.sondagem_ids || []).join(',')})`);
      console.log(`   resposta registada? ${sem === 0 && r.length ? '✓ sim' : '✗ não'} (Sem escolha × ${sem})`);
      if (sem !== 0 || !r.length) falhas.push('NORMAL: deixou de ser possível responder');
    } else {
      const inic = cid.p.locator('button:has-text("Iniciar Inquérito")').first();
      if (await inic.count()) {
        await inic.click(); await E(6000);
        const telaChat = (await cid.p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
        console.log(`   conversa do inquérito abre? ${/PERGUNTA 1 DE|Bom dia/i.test(telaChat) ? '✓ sim' : '✗ não'}`);
        if (!/PERGUNTA 1 DE|Bom dia/i.test(telaChat)) falhas.push('COM IA: a conversa não abriu');
        await cid.p.screenshot({ path: 'test-artifacts/so-detalhes-conversa-ia.png' });
      } else falhas.push('COM IA: botão «Iniciar Inquérito» ausente');
    }
  }
  await cid.ctx.close();

  // ─── limpeza ───
  const ids = msgs.map((m) => m.id);
  const sond = msgs.flatMap((m) => m.sondagem_ids || []);
  const ias = msgs.flatMap((m) => m.inquerito_ia_ids || []);
  if (sond.length) {
    await fetch(`${URL_SB}/rest/v1/sondagem_respostas?sondagem_id=in.(${sond.join(',')})`, { method: 'DELETE', headers: H });
    await fetch(`${URL_SB}/rest/v1/sondagens?id=in.(${sond.join(',')})`, { method: 'DELETE', headers: H });
  }
  if (ias.length) {
    await fetch(`${URL_SB}/rest/v1/inquerito_ia_respostas?inquerito_id=in.(${ias.join(',')})`, { method: 'DELETE', headers: H });
    await fetch(`${URL_SB}/rest/v1/inqueritos_ia?id=in.(${ias.join(',')})`, { method: 'DELETE', headers: H });
  }
  if (ids.length) await fetch(`${URL_SB}/rest/v1/messages?id=in.(${ids.join(',')})`, { method: 'DELETE', headers: H });
  const sobra = await q(`messages?select=id&subject=like.*${encodeURIComponent(MARCA)}*`);
  console.log(`\nlimpeza: ${sobra.length === 0 ? '✓ 0 restantes' : '✗ ' + sobra.length}`);

  await browser.close();
  console.log('\n' + '─'.repeat(66));
  if (!falhas.length) { console.log('RESULTADO: APROVADO'); process.exit(0); }
  console.log('RESULTADO: REPROVADO'); falhas.forEach((f) => console.log('  · ' + f)); process.exit(1);
})();
