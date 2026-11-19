#!/usr/bin/env node
// ============================================================================
// e2e_resposta_anexo.mjs — v37.78.9: RESPOSTA COM ANEXO (Cidadão → Instituição)
//   1) Cidadão B abre carta do INAPEM → «Responder ao Documento» → texto + PNG
//   2) Linha na NUVEM com attachments [{name,size,content(storage:…),type}]
//   3) Instituição (INAPEM-LLMM-01) abre a resposta e VÊ o anexo (nome + imagem
//      renderizada por URL assinada)
//   F) Limpeza das próprias mensagens/ficheiros de teste (repetível em prod).
// Uso: node scripts/e2e_resposta_anexo.mjs   |   BASE=https://…vercel.app node …
// ============================================================================
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
const PNG_PATH = '/tmp/cda_anexo_e2e.png';
writeFileSync(PNG_PATH, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
const BASE = process.env.BASE || 'http://localhost:3000';
const env = Object.fromEntries(readFileSync('.env','utf8').split('\n').filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')).trim(), l.slice(l.indexOf('=')+1).trim()]));
const SUPA = env.SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}` };
const resultados = []; let FAILS = 0;
const reg = (n, ok, d='') => { if(!ok) FAILS++; resultados.push(`${ok?'PASS':'FAIL'} ${n}`); console.log(`[${ok?'PASS':'FAIL'}] ${n}${d?' — '+d:''}`); };
const browser = await chromium.launch();
try {
  // ===== 1) CIDADÃO: responder com anexo =====
  const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx1.newPage();
  await page.context().clearCookies();
  await page.goto(`${BASE}?cb=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
  await page.goto(`${BASE}?cb=${Date.now()}#/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('input[type="text"], input:not([type])').first().fill('005404692BO043');
  await page.locator('input[type="password"]').first().fill('123456789');
  await page.locator('button', { hasText: /ENTRAR/i }).first().click().catch(() => {});
  await page.waitForTimeout(14000);
  await page.evaluate(() => { window.location.hash = '#/correspondencias'; });
  await page.waitForTimeout(6000);
  await page.evaluate(() => {
    const tr = [...document.querySelectorAll('tr')].reverse().find(r => /INAPEM/i.test(r.textContent || ''));
    if (tr) { const b = [...tr.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0); if (b.length) b[0].click(); else tr.click(); }
  });
  await page.waitForTimeout(5000);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /ver detalhes completos/i.test((e.textContent||'').trim()));
    if (b.length) b[0].click();
  });
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /responder ao documento/i.test((e.textContent||'').trim()));
    if (b.length) b[0].click();
  });
  await page.waitForTimeout(2500);
  reg('C1-caixa-resposta', !!(await page.locator('textarea[placeholder*="resposta oficial" i]').count()));
  await page.locator('textarea[placeholder*="resposta oficial" i]').fill('Envio do documento solicitado (teste v37.78.9).');
  await page.locator('input[type="file"][accept*="png"]').last().setInputFiles('/tmp/cda_anexo_e2e.png');
  await page.waitForTimeout(5000);
  reg('C2-anexo-no-editor', await page.evaluate(() => document.body.innerText.includes('cda_anexo_e2e.png')));
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /enviar resposta oficial/i.test((e.textContent||'').trim()));
    if (b.length) b[0].click();
  });
  await page.waitForTimeout(18000);
  await page.screenshot({ path: '/home/user/cda_test/screenshots/v7899_cid_respondeu.png' }).catch(() => {});
  await ctx1.close();

  // ===== 2) BD: anexo gravado =====
  const rows = await (await fetch(`${SUPA}/rest/v1/messages?select=id,subject,attachments,actions&sender_bi=eq.005404692BO043&order=id.desc&limit=1`, { headers: H })).json();
  const m = rows[0] || {};
  globalThis.alvoId = m.id;
  let anexoOk = false, refStorage = '';
  try {
    const a = Array.isArray(m.attachments) ? m.attachments[0] : null;
    const obj = a ? JSON.parse(a) : null;
    anexoOk = !!(obj && obj.name === 'cda_anexo_e2e.png' && String(obj.content || '').startsWith('storage:correspondencias_anexos/'));
    refStorage = obj ? String(obj.content) : '';
  } catch {}
  reg('D1-anexo-persistido-na-NUVEM', anexoOk, `${m.id} ${refStorage.slice(0, 60)}`);

  // ===== 3) INSTITUIÇÃO: abrir a resposta e VER o anexo =====
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page2 = await ctx2.newPage();
  await page2.context().clearCookies();
  await page2.goto(`${BASE}/institucional?cb=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page2.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
  await page2.goto(`${BASE}/institucional?cb=${Date.now()}#/login`, { waitUntil: 'domcontentloaded' });
  await page2.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 30000 });
  await page2.locator('input[type="text"], input:not([type])').first().fill('INAPEM-LLMM-01');
  await page2.locator('input[type="password"]').first().fill('123456789');
  await page2.locator('button', { hasText: /ENTRAR/i }).first().click().catch(() => {});
  await page2.waitForTimeout(14000);
  await page2.evaluate(() => { window.location.hash = '#/correspondencias'; });
  await page2.waitForTimeout(7000);
  // separador «Não Lidas» (a resposta chega como não lida)
  await page2.evaluate(() => {
    const b = [...document.querySelectorAll('button, [role="tab"]')].filter(e => e.getBoundingClientRect().width > 0 && /^(não lidas|nao lidas)/i.test((e.textContent||'').trim()));
    if (b.length) b[0].click();
  });
  await page2.waitForTimeout(4000);
  // v37.78.18 — retry: em produção a lista pode ainda estar a carregar quando
  // procuramos a linha (1.ª corrida falhou por timing, não por defeito).
  let abriu = false;
  for (let tentativaAbertura = 0; tentativaAbertura < 6 && !abriu; tentativaAbertura += 1) {
    if (tentativaAbertura > 0) await page2.waitForTimeout(3000);
    abriu = await page2.evaluate((alvoId) => {
      const tr = [...document.querySelectorAll('tr')].find(r => (r.textContent || '').includes(String(alvoId)));
      if (!tr) return false;
      const b = [...tr.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0);
      if (b.length) { b[0].click(); return true; }
      tr.click(); return true;
    }, globalThis.alvoId);
  }
  reg('I1-abrir-resposta-do-cidadao', !!abriu);
  await page2.waitForTimeout(6000);
  await page2.evaluate(() => {
    const b = [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width > 0 && /ver detalhes completos/i.test((e.textContent||'').trim()));
    if (b.length) b[0].click();
  });
  await page2.waitForTimeout(6000);
  const vis = await page2.evaluate(() => {
    const txt = document.body.innerText;
    const imgs = [...document.querySelectorAll('img')].filter(i => i.getBoundingClientRect().width > 0 && !/logomarca|svg/.test(i.src || ''));
    return {
      nomeAnexo: txt.includes('cda_anexo_e2e.png'),
      imgs: imgs.length,
      srcSample: imgs.map(i => (i.src || '').slice(0, 80)).slice(0, 3),
    };
  });
  reg('I2-nome-do-anexo-visivel', vis.nomeAnexo, JSON.stringify(vis.srcSample));
  reg('I3-imagem-renderizada', vis.imgs > 0, `${vis.imgs} img(s) visíveis`);
  await page2.screenshot({ path: '/home/user/cda_test/screenshots/v7899_inst_ve_anexo.png' }).catch(() => {});
  await ctx2.close();

  // ===== F) LIMPEZA das próprias linhas de teste =====
  try {
    const del = await fetch(`${SUPA}/rest/v1/messages?sender_bi=eq.005404692BO043&subject=eq.${encodeURIComponent('RE: Teste 123')}`, { method: 'DELETE', headers: H });
    console.log('[limpeza] mensagens:', del.status);
    const ls2 = await fetch(`${SUPA}/storage/v1/object/list/correspondencias_anexos`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: '005404692BO043/', limit: 100 }) });
    const f2 = await ls2.json();
    for (const f of (f2 || []).filter(x => /cda_anexo_e2e/.test(x.name))) {
      const d = await fetch(`${SUPA}/storage/v1/object/correspondencias_anexos/005404692BO043/${encodeURIComponent(f.name)}`, { method: 'DELETE', headers: H });
      console.log('[limpeza] storage:', f.name, d.status);
    }
  } catch {}
} catch (e) {
  console.log('EXCEPÇÃO:', String(e).slice(0, 300)); FAILS++;
} finally { await browser.close(); }
console.log(FAILS === 0 ? 'TODOS PASS' : `${FAILS} FALHAS`);
process.exit(FAILS === 0 ? 0 : 1);
