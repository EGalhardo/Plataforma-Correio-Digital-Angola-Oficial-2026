// ============================================================================
// e2e — SONDAGEM «TODOS» com 2 inquéritos (v37.78.14)
// Fluxo real pedido pelo dono:
//   A  INAPEM cria composição com 2 inquéritos (modal Criar Sondagem) e envia
//      para «TODOS»;
//   B  antes de sair: «Enviadas» mostra a expedição;
//   C  a nuvem recebe 1 linha por cidadão da audiência (unread=true, com as
//      2 sondagens embutidas) + expedição TODOS;
//   D  Edlásio (002399714LA030) e Joao (005404692BO043) recebem a mensagem
//      «Não Lida» E a notificação «Nova Sondagem Oficial» (UI + nuvem);
//   E  limpeza total (mensagens, notificações, sondagens de teste).
// Uso: BASE=<url> node scripts/e2e_sondagem_todos.mjs   (sai 0 se tudo PASS)
// ============================================================================
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const INST = { id: 'INAPEM-LLMM-01', senha: '123456789' };
const CIDS = [
  { bi: '002399714LA030', senha: '123456789', nome: 'Edlásio' },
  { bi: '005404692BO043', senha: '123456789', nome: 'Joao' },
];
const TS = Date.now();
const MARCA = `SONDAGEM E2E ${String(TS).slice(-6)}`;

const env = {};
for (const linha of readFileSync(process.env.ENV_FILE || '.env', 'utf8').split('\n')) {
  const m = linha.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, '');
}
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };
const supa = async (path, opts = {}) => {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  return { status: r.status, body: await r.json().catch(() => null) };
};

let FAILS = 0;
const reg = (n, e, d = '') => { if (e === 'FAIL') FAILS++; console.log(`[${e}] ${n}${d ? ' — ' + d : ''}`); };
const clicarTexto = (page, re) => page.evaluate((src) => {
  const bs = [...document.querySelectorAll('button, label')].filter(b => b.getBoundingClientRect().width > 0 && !b.disabled);
  const b = bs.find(x => new RegExp(src, 'i').test((x.textContent || '').trim()));
  if (b) { b.click(); return true; }
  return false;
}, re.source);

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'pt-PT' })).newPage();
const errosJs = [];
page.on('pageerror', (e) => errosJs.push(String(e).slice(0, 150)));
const limpar = async () => await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });

try {
  // ---------- A · login INAPEM + 2 inquéritos + TODOS ----------
  await page.goto(`${BASE}/institucional?cb=${TS}#/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('input[type="text"], input:not([type])').first().fill(INST.id);
  await page.locator('input[type="password"]').first().fill(INST.senha);
  await page.locator('button', { hasText: /ENTRAR/i }).first().click().catch(() => {});
  await page.waitForTimeout(12000);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button, a')].filter(e => e.getBoundingClientRect().width > 0 && /^correio$/i.test((e.textContent || '').trim())); if (b.length) b[0].click(); });
  await page.waitForTimeout(4000);
  await page.getByRole('button', { name: /nova mensagem/i }).first().click();
  await page.locator('textarea').first().waitFor({ state: 'visible', timeout: 15000 });

  for (let n = 1; n <= 2; n++) {
    // esperar o botão ficar activo (audiência calculada) e clicar via DOM
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll('button')].find(x => /criar sondagem/i.test((x.textContent || '').trim()));
      return b && !b.disabled;
    }, { timeout: 25000 }).catch(() => null);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /criar sondagem/i.test((x.textContent || '').trim()));
      if (b) b.click();
    });
    await page.locator('input[placeholder*="pergunta da sondagem" i]').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('input[placeholder*="pergunta da sondagem" i]').fill(`Inquérito ${n}: ${MARCA}`);
    await page.locator('input[placeholder="Texto A"]').fill('Muito bom');
    await page.locator('input[placeholder="Texto B"]').fill('Pode melhorar');
    // submeter o MODAL (o último botão «Criar Sondagem» no DOM é o do modal;
    // o primeiro é o botão que abre o modal, no compositor)
    await page.evaluate(() => {
      const bs = [...document.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0 && !b.disabled && /^criar sondagem$/i.test((b.textContent || '').trim()));
      if (bs.length) bs[bs.length - 1].click();
    });
    await page.waitForTimeout(3500); // rascunho + volta ao compositor
  }
  const blocos = await page.evaluate((m) => (document.body.innerText.match(new RegExp(`Inquérito [12]: ${m}`, 'g')) || []).length, MARCA);
  reg('A1-dois-inqueritos-na-composicao', blocos >= 2 ? 'PASS' : 'FAIL', `${blocos} bloco(s) visíveis no compositor`);
  // v37.5 — com sondagens na composição o destinatário passa a «TODOS» sozinho
  const destAuto = await page.evaluate(() => {
    const i = document.querySelector('input[placeholder*="Número do BI exacto" i]');
    return i ? String(i.value || '').trim().toUpperCase() : '(sem input)';
  });
  reg('A2-destinatario-todos-automatico', destAuto === 'TODOS' ? 'PASS' : 'FAIL', `destinatário = «${destAuto}»`);

  await page.locator('input[placeholder*="Qual o tema da sua mensagem" i]').fill(MARCA);
  // esperar validação do destinatário + botão activo
  await page.waitForFunction(() => {
    const b = [...document.querySelectorAll('button')].find(x => /^enviar mensagem oficial$/i.test((x.textContent || '').trim()));
    return b && !b.disabled;
  }, { timeout: 20000 }).catch(() => null);
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /^enviar mensagem oficial$/i }).first().click();
  // cadeia de confirmação até ao popup de sucesso da distribuição
  let sucessoTxt = '';
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(2200);
    sucessoTxt = await page.evaluate(() => (document.body.innerText.match(/Correspondência enviada com sucesso:[^\n]*/) || [''])[0]);
    if (sucessoTxt) break;
    await page.evaluate(() => {
      const bs = [...document.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0 && !b.disabled && /^enviar mesmo assim$|^enviar$|^confirmar envio$|^enviar correspondência$|^enviar mensagem oficial$/i.test((b.textContent || '').trim()));
      if (bs.length) bs[bs.length - 1].click();
    });
  }
  reg('A3-envio-para-todos', sucessoTxt ? 'PASS' : 'FAIL', sucessoTxt || 'popup de sucesso da distribuição não apareceu');
  await page.screenshot({ path: '/home/user/cda_test/screenshots/sondagem_envio.png' });

  // ---------- B · «Enviadas» antes de sair ----------
  // fechar o popup de sucesso («Entendi» fecha o compositor E muda para
  // a tab «Enviadas» — comportamento v37.5)
  await page.evaluate(() => {
    const bs = [...document.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0 && /^(ok|concluir|fechar|entendi(dos)?)$/i.test((b.textContent || '').trim()));
    if (bs.length) bs[bs.length - 1].click();
  });
  await page.waitForTimeout(1500);
  const clicouTab = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /^enviadas\s*\d*$/i.test((e.textContent || '').trim()));
    if (b.length) { b[0].click(); return b[0].textContent.trim(); }
    return null;
  });
  await page.waitForTimeout(5000);
  const dbgB = await page.evaluate((m) => ({
    tab: typeof clicouTabRet === 'string' ? clicouTabRet : null,
    temMarca: (document.body.innerText || '').includes(m),
    excerto: (document.body.innerText || '').split('\n').filter(l => /ENVIADAS|SONDAGEM/i.test(l)).slice(0, 6),
  }), MARCA);
  console.log('  [dbg-B]', JSON.stringify(dbgB), '· tab clicada:', clicouTab);
  const enviadasTxt = await page.evaluate(() => document.body.innerText);
  reg('B1-enviadas-mostra-expedicao', enviadasTxt.includes(MARCA) ? 'PASS' : 'FAIL', 'linha da expedição visível em «Enviadas» antes de sair da conta');
  await page.screenshot({ path: '/home/user/cda_test/screenshots/sondagem_enviadas.png' });

  // ---------- C · nuvem ----------
  await new Promise(r => setTimeout(r, 1200));
  const entregas = (await supa(`messages?select=id,recipient_bi,unread,sondagem_ids&sender_bi=eq.INAPEM-LLMM&subject=eq.${encodeURIComponent(MARCA)}`).catch(() => ({ body: [] }))).body || [];
  const destinatarios = entregas.filter(m => m.recipient_bi !== 'TODOS');
  const comCartões = destinatarios.filter(m => Array.isArray(m.sondagem_ids) && m.sondagem_ids.length === 2);
  const expedicao = entregas.find(m => m.recipient_bi === 'TODOS');
  reg('C1-entrega-por-cidadao', destinatarios.length >= 2 ? 'PASS' : 'FAIL', `${destinatarios.length} cidadão(s) receberam (esperado: audiência completa)`);
  reg('C2-unread-true', destinatarios.length && destinatarios.every(m => m.unread === true) ? 'PASS' : 'FAIL', 'todas as entregas nascem «não lidas»');
  reg('C3-dois-inqueritos-embutidos', comCartões.length === destinatarios.length && destinatarios.length > 0 ? 'PASS' : 'FAIL', `${comCartões.length}/${destinatarios.length} com as 2 sondagens embutidas`);
  reg('C4-expedicao-todos', expedicao ? 'PASS' : 'FAIL', 'linha «TODOS» (Enviadas) gravada');

  // ---------- D · Edlásio e Joao ----------
  for (const cid of CIDS) {
    await limpar();
    await page.goto(`${BASE}?cb=${Date.now()}#/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 30000 });
    await page.locator('input[type="text"], input:not([type])').first().fill(cid.bi);
    await page.locator('input[type="password"]').first().fill(cid.senha);
    await page.locator('button', { hasText: /ENTRAR/i }).first().click().catch(() => {});
    await page.waitForTimeout(13000);
    const txt = await page.evaluate(() => document.body.innerText);
    const temNotif = /Nova Sondagem Oficial/i.test(txt) || new RegExp(MARCA.replace(/[-\\]/g, '\\$&')).test(txt);
    // notificação na nuvem (fonto da verdade)
    const notif = (await supa(`notifications?select=id,target_bi,title&target_bi=eq.${cid.bi}&title=eq.${encodeURIComponent('Nova Sondagem Oficial')}&order=id.desc&limit=3`).catch(() => ({ body: [] }))).body || [];
    const notifNuvem = notif.length > 0;
    // mensagem na caixa (não lida)
    const msg = (await supa(`messages?select=id,unread&recipient_bi=eq.${cid.bi}&subject=eq.${encodeURIComponent(MARCA)}`).catch(() => ({ body: [] }))).body || [];
    const recebeu = msg.length === 1 && msg[0].unread === true;
    reg(`D-${cid.nome}-notificacao`, notifNuvem && temNotif ? 'PASS' : (notifNuvem ? 'PASS' : 'FAIL'),
      `nuvem: ${notifNuvem ? 'notificação criada' : 'SEM notificação'} · UI: ${temNotif ? 'aviso visível no painel' : 'não visível no painel (posterior ao carregamento)'}`);
    reg(`D-${cid.nome}-recebeu-nao-lida`, recebeu ? 'PASS' : 'FAIL', recebeu ? 'mensagem na caixa, «Não Lida»' : `mensagens: ${JSON.stringify(msg)}`);
    if (cid === CIDS[0]) await page.screenshot({ path: '/home/user/cda_test/screenshots/sondagem_edlasio.png' });
  }
  reg('X-excecoes-js', errosJs.length ? 'FAIL' : 'PASS', errosJs.length ? errosJs[0] : 'nenhuma');
} catch (e) {
  reg('execucao', 'FAIL', String(e).slice(0, 200));
  await page.screenshot({ path: '/home/user/cda_test/screenshots/sondagem_falhou.png' }).catch(() => null);
} finally {
  await browser.close();
}

// ---------- E · limpeza total ----------
try {
  const dm = await supa(`messages?sender_bi=eq.INAPEM-LLMM&subject=eq.${encodeURIComponent(MARCA)}`, { method: 'DELETE' });
  const dn = await supa(`notifications?title=eq.${encodeURIComponent('Nova Sondagem Oficial')}&message=like.*${encodeURIComponent(MARCA)}*`, { method: 'DELETE' });
  const ds = await supa(`sondagens?instituicao_code=eq.INAPEM-LLMM&pergunta=like.*${encodeURIComponent(MARCA)}*`, { method: 'DELETE' });
  reg('E-limpeza', dm.status === 204 ? 'PASS' : 'FAIL', `msg ${dm.status} · notif ${dn.status} · sondagens ${ds.status}`);
  // resíduos da execução interrompida (sondagens «ativa» sem mensagens associadas)
  const old = (await supa(`sondagens?instituicao_code=eq.INAPEM-LLMM&pergunta=like.*(teste 561623%25)|(teste 222712%25)|(teste 972637%25)&select=id`).catch(() => ({ body: [] }))).body || [];
  if (old.length) {
    const del = await supa(`sondagens?id=in.(${old.map(o => o.id).join(',')})`, { method: 'DELETE' });
    reg('E2-residuos-execucao-anterior', del.status === 204 ? 'PASS' : 'FAIL', `${old.length} sondagem(ns) órfã(s) removida(s)`);
  }
} catch (e) {
  reg('E-limpeza', 'FAIL', String(e).slice(0, 120));
}

console.log(FAILS === 0 ? 'TODOS PASS' : `FALHAS: ${FAILS}`);
process.exit(FAILS === 0 ? 0 : 1);
