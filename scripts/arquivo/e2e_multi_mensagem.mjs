import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const BASE = process.env.BASE || 'http://localhost:3000';
const env = Object.fromEntries(readFileSync('.env','utf8').split('\n').filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')).trim(), l.slice(l.indexOf('=')+1).trim()]));
const SUPA = env.SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}` };
const resultados = []; let FAILS = 0;
const reg = (n, ok, d='') => { if(!ok) FAILS++; resultados.push(`${ok?'PASS':'FAIL'} ${n}${d?' — '+d:''}`); console.log(`[${ok?'PASS':'FAIL'}] ${n}${d?' — '+d:''}`); };

const browser = await chromium.launch();

// contador de aberturas do "Comprovativo Enviado" + modais vistos
const instrumentar = (page, estado) => {
  page.on('console', m => { const t = m.text(); if (/pageerror|uncaught/i.test(t)) console.log('[cons-erro]', t.slice(0,150)); });
  return page.evaluate((st) => {
    window.__cda = st;
    const eraComprovativo = () => [...document.querySelectorAll('div.fixed')].find(d => d.getBoundingClientRect().width > 50 && /comprovativo enviado/i.test(d.innerText || ''));
    setInterval(() => {
      const m = eraComprovativo();
      const agora = !!m;
      if (agora && !window.__cda.aberto) {
        window.__cda.aberturas++;
        const t = (m.innerText.match(/\d+ destinat[^\n]*/i) || [null])[0];
        if (t && !window.__cda.resumo) window.__cda.resumo = t.trim();
        console.log('[cda] comprovativo ABRIU (#' + window.__cda.aberturas + ') ' + (t || ''));
      }
      window.__cda.aberto = agora;
    }, 300);
  }, estado).catch(() => {});
};

const login = async (page, area, id, senha) => {
  await page.context().clearCookies();
  const rota = area === 'inst' ? '/institucional' : area === 'admin' ? '/admin' : '/';
  await page.goto(`${BASE}${rota}?cb=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
  await page.goto(`${BASE}${rota}?cb=${Date.now()}#/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 40000 });
  await page.locator('input[type="text"], input:not([type])').first().fill(id);
  await page.locator('input[type="password"]').first().fill(senha);
  await page.locator('button', { hasText: /ENTRAR/i }).first().click().catch(() => {});
  await page.waitForTimeout(13000);
  return !(await page.evaluate(() => document.body.innerText)).match(/Credenciais incorrectas|ACESSO NEGADO/i);
};

const comporMulti = async (page, dests, assunto, corpo, area) => {
  // abrir compositor
  await page.evaluate(() => { window.location.hash = '#/correspondencias'; });
  await page.waitForTimeout(5000);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /nova mensagem|nova correspond/i.test((e.textContent||'').trim()));
    if (b.length) b[0].click();
  });
  await page.waitForTimeout(3000);
  const selDest = area === 'inst' ? '#recipient-bi-input' : 'input[placeholder*="Código Institucional" i]';
  for (const d of dests) {
    await page.locator(selDest).fill(d);
    await page.waitForTimeout(350);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /adicionar destinat/i.test((e.textContent||'').trim()) && !e.disabled);
      if (b.length) b[0].click();
    });
    await page.waitForTimeout(700);
  }
  const nChips = await page.evaluate(() => parseInt((document.body.innerText.match(/(\d+) destinat/i) || ['0','0'])[1], 10));
  const assuntoEl = page.locator('input[placeholder*="tema da sua mensagem" i]');
  if (await assuntoEl.count()) await assuntoEl.fill(assunto);
  await page.locator('textarea[placeholder*="Descreva detalhadamente"]').fill(corpo);
  await page.waitForTimeout(500);
  return nChips;
};

const enviarEConfirmar = async (page) => {
  // 1.º clique pode mostrar AVISOS ('Enviar mesmo assim'); depois abre a revisão
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /^enviar mensagem oficial$|^enviar mesmo assim$/i.test((e.textContent||'').trim()));
      if (b.length) b[b.length-1].click();
    });
    await page.waitForTimeout(2200);
    const temRevisao = await page.evaluate(() => [...document.querySelectorAll('div.fixed')].some(d => d.getBoundingClientRect().width > 50 && /rever antes de enviar/i.test(d.innerText||'')));
    if (temRevisao) break;
  }
  // confirmar na revisão
  await page.evaluate(() => {
    const modais = [...document.querySelectorAll('div.fixed')].filter(d => d.getBoundingClientRect().width > 50);
    const m = modais[modais.length-1];
    if (!m) return;
    const b = [...m.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /enviar correspond/i.test((e.textContent||'').trim()));
    if (b.length) b[0].click();
  });
};

const contarComprovativos = (page) => page.evaluate(() => window.__cda ? window.__cda.aberturas : -1);

const entrega = async (filtro) => {
  const r = await fetch(`${SUPA}/rest/v1/messages?${filtro}`, { headers: H });
  return await r.json();
};

try {
  // ========== A) INSTITUIÇÃO → 2 cidadãos ==========
  console.log('--- A) Instituição: multi para 2 destinatários ---');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    const est = { aberturas: 0, aberto: false };
    reg('A1-login-inst', await login(page, 'inst', 'INAPEM-LLMM-01', '123456789'));
    await instrumentar(page, est);
    const chips = await comporMulti(page, ['002399714LA030', '005404692BO043'], 'Multi Inst v788', 'Teste v37.78.8: envio múltiplo da instituição para dois cidadãos.', 'inst');
    reg('A2-chips-2-destinatarios', chips === 2, `chips=${chips}`);
    await page.screenshot({ path: '/home/user/cda_test/screenshots/multi_inst_composer.png' }).catch(()=>{});
    await enviarEConfirmar(page);
    await page.waitForTimeout(16000);
    const n = await contarComprovativos(page);
    reg('A3-UM-so-comprovativo', n === 1, `aberturas=${n}`);
    const resumo = await page.evaluate(() => (window.__cda && window.__cda.resumo) || null);
    reg('A4-resumo-lote-no-modal', !!resumo && /2 destinat/i.test(resumo || ''), resumo || 'sem resumo');
    await page.screenshot({ path: '/home/user/cda_test/screenshots/multi_inst_comprovativo.png' }).catch(()=>{});
    await ctx.close();
  }
  {
    const a = await entrega('select=id,sender_bi,recipient_bi,preview&recipient_bi=eq.002399714LA030&preview=like.*Multi%20Inst%20v788*');
    const b = await entrega('select=id,sender_bi,recipient_bi,preview&recipient_bi=eq.005404692BO043&preview=like.*Multi%20Inst%20v788*');
    reg('A5-entrega-cid-A', a.length >= 1, `${a.length} linha(s)`);
    reg('A6-entrega-cid-B', b.length >= 1, `${b.length} linha(s)`);
  }

  // ========== B) CIDADÃO → 2 destinatários ==========
  console.log('--- B) Cidadão: multi para 2 destinatários ---');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    const est = { aberturas: 0, aberto: false };
    reg('B1-login-cidadao', await login(page, 'cid', '002399714LA030', '123456789'));
    await instrumentar(page, est);
    const chips = await comporMulti(page, ['INAPEM-LLMM', 'SME'], 'Multi Cid v788', 'Teste v37.78.8: envio múltiplo do cidadão para duas instituições.', 'cid');
    reg('B2-chips-2-destinatarios', chips === 2, `chips=${chips}`);
    await enviarEConfirmar(page);
    await page.waitForTimeout(16000);
    const n = await contarComprovativos(page);
    reg('B3-UM-so-comprovativo', n === 1, `aberturas=${n}`);
    await page.screenshot({ path: '/home/user/cda_test/screenshots/multi_cid_comprovativo.png' }).catch(()=>{});
    await ctx.close();
  }
  {
    const i = await entrega('select=id,sender_bi,recipient_bi,preview&sender_bi=eq.002399714LA030&recipient_bi=eq.INAPEM-LLMM&preview=like.*m%C3%BAltiplo%20do%20cidad%C3%A3o*');
    const m = await entrega('select=id,sender_bi,recipient_bi,preview&sender_bi=eq.002399714LA030&recipient_bi=eq.SME&preview=like.*m%C3%BAltiplo%20do%20cidad%C3%A3o*');
    reg('B4-entrega-INAPEM', i.length >= 1, `${i.length} linha(s)`);
    reg('B5-entrega-SME', m.length >= 1, `${m.length} linha(s)`);
  }
} catch (e) {
  console.log('EXCEPÇÃO:', String(e).slice(0, 300)); FAILS++;
} finally {
  await browser.close();
}
console.log('\n==== RESUMO v37.78.8 ====');
resultados.forEach(r => console.log(r));
console.log(FAILS === 0 ? 'TODOS PASS' : `${FAILS} FALHAS`);
process.exit(FAILS === 0 ? 0 : 1);
