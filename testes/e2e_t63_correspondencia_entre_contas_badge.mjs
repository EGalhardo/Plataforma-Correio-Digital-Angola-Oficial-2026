/**
 * T63 — Correspondência entre contas REAIS + badge da foto de perfil.
 *  1) INAPEM-LLMM-01 → cidadão Edlasio (assunto REPETIDO «Sondagem 123» — cenário do relato)
 *  2) INAPEM-LLMM-01 → cidadão Edlasio (assunto novo)
 *  3) Edlasio → INAPEM-LLMM (assunto novo)
 *  4) Cidadão 2 (005404692BO043) → INAPEM-LLMM
 * Em cada recepção: badge antes/depois (+N), correspondência em «Não Lidas», notificação no menu.
 * Uso: BASE=http://localhost:3000 node testes/e2e_t63_correspondencia_entre_contas_badge.mjs
 */
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:3000'; const DIR = 'testes/evidencias/t63'; fs.mkdirSync(DIR, { recursive: true });
const SUPA = 'https://klrclczcahfycfdxzdqs.supabase.co'; const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const rest = async (q) => { try { return await (await fetch(`${SUPA}/rest/v1/${q}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })).json(); } catch { return null; } };
const R = []; const ok = (n, c, e = '') => { R.push({ n, ok: !!c, e }); console.log(`${c ? '✔' : '✘'} ${n}${e ? ' — ' + e : ''}`); return !!c; };
const CID1 = { user: '002399714LA030', pass: '123456789', nome: 'Edlasio' }, CID2 = { user: '005404692BO043', pass: '123456789', nome: 'Mário' }, INST = { user: 'INAPEM-LLMM-01', pass: '123456789', codigo: 'INAPEM-LLMM' };
const stamp = Date.now().toString().slice(-6);
const browser = await chromium.launch();
const nova = async () => { const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } }); const p = await ctx.newPage(); p.__erros = []; p.on('pageerror', (e) => p.__erros.push(String(e))); return p; };
const login = async (p, portal, u, s) => { await p.goto(`${BASE}${portal}#/login`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500); await p.fill('input[name="cda-utilizador"]', u); await p.fill('input[name="cda-senha"]', s); await p.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click(); try { await p.waitForFunction(() => !/login/.test(location.hash), null, { timeout: 60000 }); } catch { return false; } await p.waitForTimeout(6000); return true; };
const avatar = (p) => p.getByRole('button', { name: 'Menu de Perfil e Notificações' }).first();
const badge = async (p) => { const el = avatar(p).locator('div.bg-red-600').first(); return (await el.count()) ? Number((await el.innerText()).trim()) : 0; };
const menu = async (p) => { await avatar(p).click(); await p.waitForTimeout(900); const d = (await p.locator('[data-testid="menu-decomposicao"]:visible').first().innerText().catch(() => '')).replace(/\s+/g, ' '); const cont = (await p.locator('[data-testid="menu-contador"]:visible').first().innerText().catch(() => '')).trim(); const tit = await p.locator('[data-testid="menu-notificacao"]:visible').allInnerTexts(); await p.keyboard.press('Escape'); await p.waitForTimeout(400); return { d, cont, tit: tit.map((t) => t.split('\n')[0]) }; };
const correio = async (p) => {
  // fecha o comprovativo/modal de envio anterior, se ainda estiver aberto
  for (const n of [/Concluir e Fechar/i, /^Fechar$/i, /^Entendi/i, /^Concluir$/i, /^OK$/i]) { const btn = p.getByRole('button', { name: n }).first(); if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); await p.waitForTimeout(500); } }
  await p.evaluate(() => { location.hash = '#/home'; }); await p.waitForTimeout(800);
  await p.evaluate(() => { location.hash = '#/correspondencias'; }); await p.waitForTimeout(3000);
};
const naoLidasTem = async (p, assunto) => { await correio(p); await p.getByRole('button', { name: /^Não lidas/i }).first().click().catch(() => {}); await p.waitForTimeout(1200); return (await p.locator('tbody tr').allInnerTexts()).some((l) => l.includes(assunto)); };
const enviar = async (p, { paraInst, paraBi, assunto, corpo, cidadao }) => {
  await correio(p);
  try { await p.getByRole('button', { name: /Nova Mensagem/i }).first().click({ timeout: 15000 }); }
  catch (e) { await p.screenshot({ path: `${DIR}/_falha_nova_mensagem.png` }); console.log('   botões visíveis:', (await p.locator('button:visible').allInnerTexts()).map((t) => t.trim()).filter(Boolean).join(' | ').slice(0, 400)); throw e; }
  await p.waitForSelector('#btn-enviar-mensagem', { timeout: 20000 });
  if (paraInst) await p.locator('input[placeholder*="Código Institucional"]').fill(paraInst); else await p.locator('input[placeholder*="Número do BI"]').fill(paraBi);
  await p.waitForTimeout(1200);
  await p.locator('input[placeholder="Qual o tema da sua mensagem?"]').fill(assunto); await p.locator('textarea').first().fill(corpo);
  await p.waitForFunction(() => !document.querySelector('#btn-enviar-mensagem')?.disabled, null, { timeout: 20000 }).catch(() => {});
  await p.locator('#btn-enviar-mensagem').click(); await p.waitForTimeout(700);
  // avisos de validação (corpo curto, etc.): o 1.º clique mostra «Avisos revistos», o 2.º envia
  if (/Avisos revistos|próximo clique envia/i.test(await p.locator('body').innerText())) { await p.locator('#btn-enviar-mensagem').click(); await p.waitForTimeout(700); }
  if (cidadao) { await p.locator('#btn-modal-opcao-normal').click(); await p.waitForTimeout(600); await p.locator('#btn-ok-modal-tipo-envio').click().catch(() => {}); await p.getByRole('button', { name: /^Enviar Correspondência$/ }).first().click().catch(() => {}); }
  else { await p.getByText('Mensagem Normal').first().click(); await p.waitForTimeout(800); await p.getByRole('button', { name: /Enviar Correspondência/i }).first().click().catch(() => {}); }
  await p.waitForFunction(() => /enviada com sucesso|Protocolo/i.test(document.body.innerText), null, { timeout: 60000 }).catch(() => {});
  const enviado = /enviada com sucesso|Protocolo/i.test(await p.locator('body').innerText());
  await p.waitForTimeout(1500); const fechar = p.getByRole('button', { name: /Concluir e Fechar/i }).first(); if (await fechar.isVisible().catch(() => false)) { await fechar.click(); await p.waitForTimeout(800); }
  return enviado;
};
// estado inicial dos destinatários
const pc1 = await nova(); ok('0.1 login Edlasio', await login(pc1, '/', CID1.user, CID1.pass)); const b0c1 = await badge(pc1); console.log('   badge inicial Edlasio:', b0c1); await pc1.context().close();
const pi0 = await nova(); ok('0.2 login INAPEM-LLMM-01', await login(pi0, '/institucional', INST.user, INST.pass)); const b0i = await badge(pi0); console.log('   badge inicial INAPEM:', b0i); await pi0.context().close();
try {
// 1+2) instituição → Edlasio  (SALTAR_FASE1=1 reutiliza as correspondências já enviadas)
const A1 = 'Sondagem 123'; const A2 = `[T63] Aviso institucional ${stamp}`;
if (!process.env.SALTAR_FASE1) {
const pi = await nova(); ok('1.1 login da instituição', await login(pi, '/institucional', INST.user, INST.pass));
ok('1.2 enviada «Sondagem 123» (assunto repetido) → Edlasio', await enviar(pi, { paraBi: CID1.user, assunto: A1, corpo: `Exmo. Senhor, esta é uma correspondência de ensaio automatizado T63 (${stamp}) com assunto repetido, para verificar o aviso de nova correspondência na conta do cidadão.` }));
await pi.waitForTimeout(1500);
ok('1.3 enviada assunto novo → Edlasio', await enviar(pi, { paraBi: CID1.user, assunto: A2, corpo: 'Exmo. Senhor, esta é uma correspondência de ensaio automatizado T63 com assunto novo, para verificar o aviso de nova correspondência na conta do cidadão.' }));
await pi.screenshot({ path: `${DIR}/1_inst_enviou.png` }); await pi.context().close();
const m1 = await rest(`messages?select=id,unread,status&recipient_bi=eq.${CID1.user}&sender_bi=eq.${INST.codigo}&created_at=gte.${new Date(Date.now() - 5 * 60000).toISOString()}&order=id.desc`);
ok('1.4 nuvem: 2 novas linhas para Edlasio, unread=true', (m1 || []).length >= 2 && m1.slice(0, 2).every((m) => m.unread === true), JSON.stringify((m1 || []).slice(0, 2)));
const c1 = await nova(); ok('1.5 login Edlasio (dispositivo limpo)', await login(c1, '/', CID1.user, CID1.pass));
const b1 = await badge(c1); ok(`1.6 badge Edlasio subiu +2 (${b0c1} → ${b1})`, b1 === b0c1 + 2, `badge ${b1}`);
const mn1 = await menu(c1); ok('1.7 menu da foto: contador = badge e notificações das 2 correspondências', mn1.cont === String(b1) && mn1.tit.some((t) => /Correspond/i.test(t)), `${mn1.d} | ${mn1.tit.slice(0, 3).join(' / ')}`);
ok('1.8 «Sondagem 123» NOVA em Não Lidas', await naoLidasTem(c1, A1)); ok('1.9 assunto novo em Não Lidas', await naoLidasTem(c1, A2));
await c1.screenshot({ path: `${DIR}/1_edlasio_recebeu.png` });
await c1.context().close(); }
const c1 = await nova(); ok('3.0 login Edlasio', await login(c1, '/', CID1.user, CID1.pass));
// 3) Edlasio → instituição
const A3 = `[T63] Pedido do cidadão ${stamp}`;
ok('3.1 Edlasio envia → INAPEM-LLMM', await enviar(c1, { paraInst: INST.codigo, assunto: A3, corpo: 'Exmos. Senhores, solicito informação no âmbito do ensaio automatizado T63; esta mensagem pode ser ignorada.', cidadao: true }));
ok('3.2 sem erros JS (cidadão)', c1.__erros.length === 0, c1.__erros.join('|').slice(0, 150)); await c1.context().close();
// 4) Mário → instituição
const A4 = `[T63] Pedido do cidadão 2 ${stamp}`;
const c2 = await nova(); ok('4.1 login Mário', await login(c2, '/', CID2.user, CID2.pass));
ok('4.2 Mário envia → INAPEM-LLMM', await enviar(c2, { paraInst: INST.codigo, assunto: A4, corpo: 'Exmos. Senhores, solicito informação no âmbito do ensaio automatizado T63 (cidadão 2); esta mensagem pode ser ignorada.', cidadao: true })); await c2.context().close();
const m3 = await rest(`messages?select=id,sender_bi,subject,unread&recipient_bi=eq.${INST.codigo}&subject=in.("${A3}","${A4}")`);
ok('4.3 nuvem: 2 linhas para a instituição, unread=true', (m3 || []).length === 2 && m3.every((m) => m.unread), JSON.stringify(m3 || []));
const pi2 = await nova(); ok('4.4 login da instituição (dispositivo limpo)', await login(pi2, '/institucional', INST.user, INST.pass));
const b2 = await badge(pi2); ok(`4.5 badge INAPEM subiu +2 (${b0i} → ${b2})`, b2 === b0i + 2, `badge ${b2}`);
const mn2 = await menu(pi2); ok('4.6 menu: contador = badge e notificações «Nova Solicitação»', mn2.cont === String(b2) && mn2.tit.some((t) => /Solicita|Correspond/i.test(t)), `${mn2.d} | ${mn2.tit.slice(0, 3).join(' / ')}`);
ok('4.7 pedido do Edlasio em Não Lidas', await naoLidasTem(pi2, A3)); ok('4.8 pedido do Mário em Não Lidas', await naoLidasTem(pi2, A4));
ok('4.9 sem erros JS (instituição)', pi2.__erros.length === 0, pi2.__erros.join('|').slice(0, 150));
await pi2.screenshot({ path: `${DIR}/4_inst_recebeu.png` }); await pi2.context().close();
} catch (e) { console.error('EXCEPÇÃO', e); R.push({ n: 'excepção ' + e.message, ok: false }); }
await browser.close(); const okN = R.filter((r) => r.ok).length; console.log(`\nRESULTADO T63: ${okN}/${R.length}`); if (okN < R.length) console.log('FALHAS:\n' + R.filter((r) => !r.ok).map((r) => ` - ${r.n} — ${r.e}`).join('\n'));
fs.writeFileSync(`${DIR}/resultado.json`, JSON.stringify(R, null, 2));
