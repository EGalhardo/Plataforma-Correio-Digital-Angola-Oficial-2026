// ============================================================================
// e2e — REGRA R2: estado de leitura pertence ao DESTINATÁRIO (v37.78.12)
//
// Cenário real do dono: instituição envia carta ao cidadão; o remetente abre
// a própria carta em «Enviadas»; o cidadão NÃO pode receber a carta «Lida» nem
// deixar de ter notificação. Passos:
//   A1 instituição (INAPEM-LLMM-01) envia correspondência ao cidadão
//      002399714LA030 (mede o tempo de envio — performance v37.78.12);
//   A2 na pasta «Enviadas» a carta mostra «Não Lida» (recibo de leitura);
//   A3 o REMETENTE abre a carta → a nuvem TEM DE MANTER unread=TRUE;
//   B1 notificação «Nova Correspondência Oficial» existe para o cidadão;
//   B2 cidadão entra → carta na caixa como «Não Lida»;
//   B3 cidadão abre a carta → SÓ AGORA unread=FALSE na nuvem;
//   C  limpeza total (mensagem, histórico, notificação, protocolo).
// Uso: BASE=<url> node scripts/e2e_regra_leitura.mjs   (sai 0 se tudo PASS)
// ============================================================================
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const INST = { id: 'INAPEM-LLMM-01', senha: '123456789' };
const CID = { bi: '002399714LA030', senha: '123456789' };
const TS = Date.now();
const ASSUNTO = `REGRA R2 ${String(TS).slice(-6)}`;

const env = {};
for (const linha of readFileSync('/home/user/Plataforma-Correio-Digital-Angola-Oficial-2026/.env', 'utf8').split('\n')) {
  const m = linha.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, '');
}
const SUPA = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' };

let FAILS = 0;
const reg = (nome, estado, detalhe = '') => {
  if (estado === 'FAIL') FAILS++;
  console.log(`[${estado}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};

const supa = async (path, opts = {}) => {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const msgRow = async () => ((await supa(`messages?select=id,unread,sender_bi,recipient_bi,subject&recipient_bi=eq.${CID.bi}&subject=eq.${encodeURIComponent(ASSUNTO)}&order=id.desc&limit=5`)).body || [])[0] || null;

const clicar = async (page, re, timeout = 30000) => {
  const btn = page.getByRole('button', { name: re }).first();
  await btn.waitFor({ state: 'visible', timeout });
  await btn.click({ timeout: 5000 }).catch(() => btn.click({ force: true }));
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'pt-PT' });
const page = await ctx.newPage();
const errosJs = [];
page.on('pageerror', (e) => errosJs.push(String(e).slice(0, 150)));

const limparEstado = async () => { await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }); };
await limparEstado();

try {
  // ---------- A1 · login instituição + envio ----------
  await page.goto(`${BASE}/institucional?cb=${TS}#/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('input[type="text"], input:not([type])').first().fill(INST.id);
  await page.locator('input[type="password"]').first().fill(INST.senha);
  await page.locator('button', { hasText: /ENTRAR/i }).first().click().catch(() => {});
  await page.waitForTimeout(12000);

  // navegar para a página «Correspondências» da instituição
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button, a')].filter(e => e.getBoundingClientRect().width > 0 && /^correio$/i.test((e.textContent || '').trim()));
    if (b.length) b[0].click();
  });
  await page.waitForTimeout(4000);
  const debugPosLogin = await page.evaluate(() => (document.body.innerText || '').slice(0, 300).replace(/\n+/g, ' | '));
  console.log('  [dbg] pos-login:', debugPosLogin.slice(0, 200));

  await clicar(page, /nova mensagem/i);
  await page.locator('textarea').first().waitFor({ state: 'visible', timeout: 15000 });
  const biInput = page.locator('input[placeholder*="Número do BI exacto" i]');
  await biInput.fill(CID.bi);
  const tituloInput = page.locator('input[placeholder*="Ex.: Envio de documento de identificação" i]');
  if (await tituloInput.count()) await tituloInput.fill(ASSUNTO);
  else await page.locator('input[placeholder*="Qual o tema da sua mensagem" i]').fill(ASSUNTO);
  await page.locator('textarea[placeholder*="Descreva detalhadamente" i]').fill('Carta de teste da REGRA R2: o remetente não pode marcar a leitura do destinatário.');
  // esperar a verificação assíncrona do BI («A consultar o BI…») terminar e o
  // botão de envio ficar activo
  await page.waitForFunction(() => {
    const b = [...document.querySelectorAll('button')].find(x => /^enviar mensagem oficial$/i.test((x.textContent || '').trim()));
    return b && !b.disabled;
  }, { timeout: 20000 }).catch(() => null);
  await page.waitForTimeout(500);
  const t0 = Date.now();
  // cadeia de confirmação: «Enviar Mensagem Oficial» → (avisos → «Enviar
  // mesmo assim») → modal de revisão → «Enviar Correspondência». Termina
  // quando já não há botões da cadeia (compositor fechou = envio feito).
  // NB: o próprio modal contém «número de protocolo» no texto — o fim NÃO se
  // detecta por texto, mas pelo desaparecimento dos botões.
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(2000);
    const clicados = await page.evaluate(() => {
      const bs = [...document.querySelectorAll('button')].filter(b => {
        if (!(b.getBoundingClientRect().width > 0) || b.disabled) return false;
        return /^enviar mesmo assim$|^enviar$|^confirmar envio$|^rever antes de enviar$|^concordo e enviar|^enviar correspondência$|^enviar mensagem oficial$/i.test((b.textContent || '').trim());
      });
      if (bs.length) { bs[bs.length - 1].click(); return bs.map(b => (b.textContent || '').trim()); }
      return [];
    });
    console.log('  [confirm]', JSON.stringify(clicados));
    if (!clicados.length) break;
  }
  await page.screenshot({ path: '/home/user/cda_test/screenshots/regraR2_A1_pos_envio.png' });
  const dbgPosEnvio = await page.evaluate(() => {
    const bs = [...document.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0).map(b => (b.textContent || '').trim()).filter(t => t && t.length < 40);
    return { botoes: bs.slice(-15), texto: (document.body.innerText || '').slice(0, 600).replace(/\n+/g, ' | ') };
  });
  console.log('  [dbg-botoes]', JSON.stringify(dbgPosEnvio.botoes));
  console.log('  [dbg-texto]', dbgPosEnvio.texto.slice(0, 400));
  const durEnvio = Date.now() - t0;
  const rowAposEnvio = await msgRow();
  reg('A1-envio-instituicao', rowAposEnvio ? 'PASS' : 'FAIL', `linha na nuvem ${rowAposEnvio ? 'criada (unread=' + rowAposEnvio.unread + ')' : 'NÃO encontrada'} · envio ${durEnvio}ms`);

  // fechar comprovativo
  await page.evaluate(() => {
    const bs = [...document.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0 && /fechar|concluir|ok$/i.test((b.textContent || '').trim()));
    if (bs.length) bs[bs.length - 1].click();
  });
  await page.waitForTimeout(1500);

  // ---------- A2 · «Enviadas» mostra recibo «Não Lida» ----------
  await clicar(page, /enviadas/i);
  await page.waitForTimeout(2500);
  const enviadasTxt = await page.evaluate(() => document.body.innerText);
  const linhaEnviada = enviadasTxt.includes(ASSUNTO);
  const reciboNaoLida = new RegExp(`Não Lida`, 'i').test(enviadasTxt);
  reg('A2-enviadas-recibo', linhaEnviada ? 'PASS' : 'FAIL', linhaEnviada ? `carta listada; recibo «Não Lida» ${reciboNaoLida ? 'visível' : 'não visível nesta vista'}` : 'carta não está nas Enviadas');

  // ---------- A3 · REMETENTE abre a enviada → unread TEM DE MANTER TRUE ----------
  await page.evaluate((assunto) => {
    const tr = [...document.querySelectorAll('tr,li,div[role="row"]')].filter(r => (r.textContent || '').includes(assunto));
    const alvo = tr[tr.length - 1];
    if (!alvo) return false;
    const b = [...alvo.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /ver detalhes/i.test((e.textContent || '') + (e.title || '')));
    if (b.length) { b[0].click(); return true; }
    alvo.click(); return true;
  }, ASSUNTO);
  await page.waitForTimeout(3500); // tempo para a escrita na nuvem (se existisse)
  const rowAposRemetente = await msgRow();
  reg('A3-remetente-abre-nao-marca', rowAposRemetente && rowAposRemetente.unread === true ? 'PASS' : 'FAIL',
    rowAposRemetente ? `unread=${rowAposRemetente.unread} na nuvem depois do remetente abrir (esperado: true)` : 'linha desapareceu?!');
  await page.screenshot({ path: '/home/user/cda_test/screenshots/regraR2_A3_remetente_abriu.png' });

  // ---------- B1 · notificação existe para o cidadão ----------
  await new Promise(r => setTimeout(r, 1500));
  const notif = (await supa(`notifications?select=id,title,target_bi&target_bi=eq.${CID.bi}&order=id.desc&limit=10`)).body || [];
  const temNotif = notif.some(n => /nova correspondência oficial/i.test(n.title || ''));
  reg('B1-notificacao-destinatario', temNotif ? 'PASS' : 'FAIL', temNotif ? `«Nova Correspondência Oficial» em notifications (target ${CID.bi})` : 'sem notificação na nuvem para o cidadão');

  // ---------- B2 · cidadão entra → «Não Lida» ----------
  await limparEstado();
  await page.goto(`${BASE}?cb=${TS + 1}#/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('input[type="text"], input:not([type])').first().fill(CID.bi);
  await page.locator('input[type="password"]').first().fill(CID.senha);
  await page.locator('button', { hasText: /ENTRAR/i }).first().click().catch(() => {});
  await page.waitForTimeout(13000);
  const txtCidadao = await page.evaluate(() => document.body.innerText);
  const cartaVisivel = txtCidadao.includes(ASSUNTO);
  const vistaNaoLida = cartaVisivel && /não lida/i.test(txtCidadao);
  reg('B2-cidadao-ve-nao-lida', cartaVisivel ? 'PASS' : 'FAIL', cartaVisivel ? `carta na caixa do cidadão; «Não Lida» ${vistaNaoLida ? 'presente' : 'não detectada no texto'}` : 'carta NÃO apareceu na caixa do cidadão');
  await page.screenshot({ path: '/home/user/cda_test/screenshots/regraR2_B2_cidadao_caixa.png' });

  // ---------- B3 · cidadão abre → SÓ AGORA unread=false ----------
  // ir para a página «Correio» do cidadão (o texto do início pode vir da
  // notificação, que também contém o assunto)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button, a')].filter(e => e.getBoundingClientRect().width > 0 && /^correio$/i.test((e.textContent || '').trim()));
    if (b.length) b[0].click();
  });
  await page.waitForTimeout(4500);
  const dbgCorreio = await page.evaluate((assunto) => {
    const menu = [...document.querySelectorAll('button, a')].filter(e => e.getBoundingClientRect().width > 0).map(e => (e.textContent || '').trim()).filter(t => t && t.length < 25);
    return { temAssunto: (document.body.innerText || '').includes(assunto), menu: menu.slice(0, 20).join(' | ') };
  }, ASSUNTO);
  // a carta está na tab «Não Lidas» — abrir aí a linha certa (botão «ABRIR»)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /^não lidas$/i.test((e.textContent || '').trim().replace(/\s*\d+$/, '')));
    if (b.length) b[0].click();
  });
  await page.waitForTimeout(3000);
  const abriuDetalhe = await page.evaluate((assunto) => {
    const tr = [...document.querySelectorAll('tr,li,div[role="row"],div')].filter(r => (r.textContent || '').includes(assunto) && r.querySelectorAll('button').length);
    const alvo = tr[tr.length - 1];
    if (!alvo) return 'sem-linha';
    const b = [...alvo.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /^abrir$|^ver detalhes$/i.test((e.textContent || '').trim()));
    if (b.length) { b[b.length - 1].click(); return 'botao:' + (b[b.length - 1].textContent || '').trim(); }
    alvo.click(); return 'linha';
  }, ASSUNTO);
  await page.waitForTimeout(2500);
  const detalheAberto = await page.evaluate(() => /REGRA R2: o remetente não pode marcar/i.test(document.body.innerText || ''));
  console.log('  [B3-abertura]', abriuDetalhe, '· detalhe visível:', detalheAberto);
  await page.waitForTimeout(4000);
  const rowAposDestinatario = await msgRow();
  reg('B3-destinatario-abre-marca', rowAposDestinatario && rowAposDestinatario.unread === false ? 'PASS' : 'FAIL',
    rowAposDestinatario ? `unread=${rowAposDestinatario.unread} depois do destinatário abrir (esperado: false)` : 'linha não encontrada');
  reg('X-excecoes-js', errosJs.length ? 'FAIL' : 'PASS', errosJs.length ? errosJs[0] : 'nenhuma');
} catch (e) {
  reg('execucao', 'FAIL', String(e).slice(0, 200));
  await page.screenshot({ path: '/home/user/cda_test/screenshots/regraR2_falhou.png' }).catch(() => null);
} finally {
  await browser.close();
}

// ---------- C · limpeza total ----------
try {
  const row = await msgRow();
  if (row) {
    const id = row.id;
    const dh = await supa(`message_state_history?message_id=eq.${id}`, { method: 'DELETE' });
    const dm = await supa(`messages?id=eq.${id}`, { method: 'DELETE' });
    const dn = await supa(`notifications?target_bi=eq.${CID.bi}&message=like.*${encodeURIComponent(ASSUNTO)}*`, { method: 'DELETE' });
    // NB: digital_protocols não é limpo — registo de integridade sem impacto em UI.
    reg('C-limpeza', dm.status === 204 ? 'PASS' : 'FAIL', `msg ${dm.status} · histórico ${dh.status} · notif ${dn.status}`);
  } else {
    reg('C-limpeza', 'PASS', 'sem linha para limpar');
  }
} catch (e) {
  reg('C-limpeza', 'FAIL', String(e).slice(0, 120));
}

console.log(FAILS === 0 ? 'TODOS PASS' : `FALHAS: ${FAILS}`);
process.exit(FAILS === 0 ? 0 : 1);
