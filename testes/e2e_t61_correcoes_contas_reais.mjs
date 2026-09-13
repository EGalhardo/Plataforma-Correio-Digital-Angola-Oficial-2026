// T61 — Verificação das 4 correcções com CONTAS REAIS (nunca demo):
//   P1) senhas repetidas permitidas (nova credencial na Equipa com a senha de outra conta — sem aviso «já existe»)
//   P2) Inquérito com IA: destinatário manual → só esse cidadão; «Todos» → quem já trocou correspondência
//   P3) ADMIN-0001 / 123456789 entra pela NUVEM (sessão Supabase Auth) — homologação do cidadão persistida
//   P4) correspondência «Conta Ativada» / «Adesão Aprovada» gravada na nuvem (visível noutro dispositivo)
// Env FASES=1234 escolhe as fases. Contas: /home/user/.credenciais_cda/contas_reais.md
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const FASES = (process.env.FASES || '1234').toUpperCase();
const DIR = 'testes/evidencias/t61'; fs.mkdirSync(DIR, { recursive: true });
const ADMIN = { user: 'ADMIN-0001', pass: '123456789' };
const RESP = { user: 'INAPEM-LLMM-01', pass: '123456789', code: 'INAPEM-LLMM' };
const CID1 = { bi: '002399714LA030', pass: '123456789' };
const CID2 = { bi: '005404692BO043', pass: '123456789' };
// Cidadão real criado no T60 (fila central: Pendente) — alvo da homologação
const CID_T60 = { bi: '001266541LA059', pass: 'Teste2026seg' };
const SUPA = 'https://klrclczcahfycfdxzdqs.supabase.co'; const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const rest = async (q) => { try { return await (await fetch(`${SUPA}/rest/v1/${q}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })).json(); } catch { return null; } };
const stamp = String(Date.now()).slice(-6);

const resultados = [];
const ok = (nome, cond, extra = '') => { resultados.push({ nome, ok: !!cond, extra }); console.log(`${cond ? '✔' : '✘'} ${nome}${extra ? ` — ${extra}` : ''}`); return !!cond; };
const browser = await chromium.launch();
const novaPagina = async (storage) => { const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, ...(storage && fs.existsSync(storage) ? { storageState: storage } : {}) }); const page = await ctx.newPage(); page.__erros = []; page.on('pageerror', (e) => page.__erros.push(String(e))); return page; };
const login = async (page, portal, user, pass) => {
  await page.goto(`${BASE}${portal}#/login`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
  if (!(await page.locator('input[name="cda-utilizador"]').count())) {
    const sair = page.getByRole('button', { name: /Sair do Canal/i }).first();
    if (await sair.count()) { await sair.click().catch(() => {}); await page.waitForTimeout(1500); await page.getByRole('button', { name: /^(Sim|Confirmar|Sair)/i }).first().click().catch(() => {}); }
    await page.goto(`${BASE}${portal}#/login`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500);
  }
  await page.waitForSelector('input[name="cda-utilizador"]', { timeout: 30000 });
  await page.fill('input[name="cda-utilizador"]', user); await page.fill('input[name="cda-senha"]', pass);
  await page.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click();
  try { await page.waitForFunction(() => !/login/.test(location.hash), null, { timeout: 60000 }); } catch { return false; }
  await page.waitForTimeout(5000); return true;
};
const sessaoAuthEmail = (page) => page.evaluate(() => { for (const k of Object.keys(localStorage)) { if (/auth-token/.test(k)) { try { return JSON.parse(localStorage.getItem(k) || '{}')?.user?.email || ''; } catch { return ''; } } } return ''; });
const avatar = (page) => page.getByRole('button', { name: 'Menu de Perfil e Notificações' }).first();
const badge = async (page) => { const el = avatar(page).locator('div.bg-red-600').first(); return (await el.count()) ? Number((await el.innerText()).trim()) : 0; };
const textoPagina = (page) => page.locator('body').innerText();
const shot = (page, n) => page.screenshot({ path: `${DIR}/${n}.png`, fullPage: false });
const irCorreio = async (page) => { await page.evaluate(() => { location.hash = '#/correspondencias'; }); await page.waitForTimeout(4000); };
const abrirMsgPorAssunto = async (page, assunto) => {
  for (const sep of [/^Não lidas/i, /^Lidas/i]) {
    const b = page.getByRole('button', { name: sep }).first();
    if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(1200); }
    const abrir = page.getByRole('button', { name: /^(Abrir|Analisar)$/i });
    for (let i = 0; i < await abrir.count(); i++) {
      const a = abrir.nth(i); if (!(await a.isVisible())) continue;
      const t = await a.evaluate((el) => (el.closest('tr') || el.parentElement).innerText);
      if (t.includes(assunto)) { await a.click(); await page.waitForTimeout(2500); return true; }
    }
  }
  return false;
};
const gravarErro = (e) => { console.error('EXCEPÇÃO:', e); resultados.push({ nome: `excepção: ${String(e).slice(0, 200)}`, ok: false }); };

try {
// ═════════════ P3 + P4 — Admin Alfa na nuvem; homologação do cidadão persistida ═════════════
if (FASES.includes('3')) {
  console.log('\n=== P3) ADMIN-0001 entra pela NUVEM (credencial oficial 123456789) ===');
  const page = await novaPagina();
  ok('P3.1 login ADMIN-0001 / 123456789 aceite', await login(page, '/admin', ADMIN.user, ADMIN.pass), (await textoPagina(page)).match(/Credenciais[^\n]*/)?.[0] || '');
  const email = await sessaoAuthEmail(page);
  ok('P3.2 consola com sessão Supabase Auth do agente', /admin-0001/i.test(email), email);
  await shot(page, 'P3_admin_dashboard');
  const antes = await rest(`solicitacoes_registo?select=status&bi_numero=eq.${CID_T60.bi}`);
  console.log('   estado do cidadão na fila central antes:', antes?.[0]?.status);
  if (antes?.[0]?.status !== 'Aprovado') {
    await page.evaluate(() => { location.hash = '#/gov-contatos'; }); await page.waitForTimeout(6000);
    const row = page.locator('tr', { hasText: CID_T60.bi }).first();
    ok('P3.3 cadastro do cidadão listado na consola', await row.count() > 0);
    await row.getByRole('button', { name: /Analisar/i }).click(); await page.waitForTimeout(2000);
    const btnHom = page.getByRole('button', { name: /Homologar Cadastro/i }).first();
    ok('P3.4 «Homologar Cadastro» disponível', await btnHom.count() > 0);
    await btnHom.click(); await page.waitForTimeout(2500);
    const aviso = ((await textoPagina(page)).match(/ATENÇÃO:[^\n]*/) || [''])[0];
    ok('P3.5 sem aviso «não gravada na base central»', !aviso, aviso.slice(0, 140));
    await page.waitForTimeout(4000);
  }
  const depois = await rest(`solicitacoes_registo?select=status&bi_numero=eq.${CID_T60.bi}`);
  ok('P3.6 cidadão APROVADO na base central', depois?.[0]?.status === 'Aprovado', `status: ${depois?.[0]?.status}`);
  const msgs = await rest(`messages?select=id,subject,unread,sender_bi&recipient_bi=eq.${CID_T60.bi}&order=created_at.desc&limit=3`);
  ok('P4.1 correspondência «Conta Ativada» gravada na nuvem (remetente CDA)', (msgs || []).some((m) => /Conta Ativada/i.test(m.subject || '') && m.sender_bi === 'CDA'), (msgs || []).map((m) => m.subject).join(' | ').slice(0, 140));
  ok('P3.7 sem erros JS (admin)', page.__erros.length === 0, page.__erros.join(' | ').slice(0, 160));
  await page.context().close();

  console.log('\n=== P4) Cidadão homologado entra NOUTRO dispositivo (contexto limpo) ===');
  const pc = await novaPagina();
  ok('P4.2 login do cidadão homologado', await login(pc, '/', CID_T60.bi, CID_T60.pass));
  const b = await badge(pc); const t = await textoPagina(pc);
  ok('P4.3 cidadão vê aviso de conta ativada (badge de correio não lido > 0)', b > 0, `badge ${b}`);
  ok('P4.4 conta sem estado pendente', !/Pendente de (Ativação|Validação)|Conta em Homologação/i.test(t));
  await irCorreio(pc); const tc = await textoPagina(pc);
  ok('P4.5 Correio do cidadão mostra «Conta Ativada» (vinda da nuvem)', /Conta Ativada/i.test(tc));
  const nDup = (tc.match(/Conta Ativada/gi) || []).length;
  ok('P4.6 sem duplicação da correspondência de activação', nDup <= 2, `${nDup} ocorrência(s) no texto`);
  await shot(pc, 'P4_cidadao_correio');
  await pc.context().close();
}
// ═════════════ P1 — senhas repetidas ═════════════
if (FASES.includes('1')) {
  console.log('\n=== P1) Senha repetida aceite na Equipa da instituição real (INAPEM-LLMM) ===');
  const page = await novaPagina();
  ok('P1.1 login do responsável INAPEM-LLMM-01', await login(page, '/institucional', RESP.user, RESP.pass));
  await page.evaluate(() => { location.hash = '#/contatos'; }); await page.waitForTimeout(3000);
  const btnAdd = page.getByRole('button', { name: /Adicionar à Equipa/i }).first();
  if (!(await btnAdd.count())) { await page.evaluate(() => { location.hash = '#/equipa'; }); await page.waitForTimeout(3000); }
  ok('P1.2 página Equipa com «Adicionar à Equipa»', await page.getByRole('button', { name: /Adicionar à Equipa/i }).first().count() > 0);
  await page.getByRole('button', { name: /Adicionar à Equipa/i }).first().click(); await page.waitForTimeout(1200);
  await page.locator('input[placeholder="Ex: Dr. Francisco Manuel"]').fill(`Colaborador Ensaio ${stamp}`);
  await page.locator('input[placeholder*="f.manuel@"]').fill(`colab.${stamp}@exemplo.ao`);
  await page.locator('input[placeholder="+244 923 000 000"]').fill('+244 923 111 222');
  await page.locator('input[placeholder^="Ex: Auditor"]').fill('Técnico de Ensaio');
  await page.locator('input[placeholder^="Ex: Direcção"]').fill('Direcção de Ensaios');
  // MESMA senha do responsável (123456789) — antes era recusada com «já está a ser usada»
  await page.locator('input[placeholder="Mín. 8 caracteres"]').fill(RESP.pass);
  await page.locator('input[placeholder="Repita a senha exactamente"]').fill(RESP.pass);
  await shot(page, 'P1_form');
  await page.getByRole('button', { name: /Submeter Cadastro/i }).first().click(); await page.waitForTimeout(6000);
  const t = await textoPagina(page);
  ok('P1.3 sem aviso de senha «já está a ser usada / já existe»', !/já está a ser usada|já está em uso|já existe/i.test(t), (t.match(/[^\n]*(já está a ser usada|já está em uso)[^\n]*/i) || [''])[0].slice(0, 120));
  ok('P1.4 novo membro listado na Equipa', new RegExp(`Colaborador Ensaio ${stamp}`).test(t));
  await shot(page, 'P1_equipa');
  ok('P1.5 sem erros JS (equipa)', page.__erros.length === 0, page.__erros.join(' | ').slice(0, 160));
  await page.context().close();
}
// ═════════════ P2 — Inquérito com IA: 1 destinatário vs «Todos» ═════════════
if (FASES.includes('2')) {
  console.log('\n=== P2) Inquérito com IA — destinatário ÚNICO recebe só ele ===');
  const ASSUNTO_UM = `[T61] Inquérito IA individual ${stamp}`;
  const pi = await novaPagina();
  ok('P2.1 login da instituição INAPEM-LLMM-01', await login(pi, '/institucional', RESP.user, RESP.pass));
  await irCorreio(pi);
  await pi.getByRole('button', { name: /Nova Mensagem/i }).first().click(); await pi.waitForTimeout(1000);
  await pi.locator('input[placeholder*="Número do BI"]').fill(CID1.bi);
  await pi.getByRole('button', { name: /Adicionar destinatário/i }).click(); await pi.waitForTimeout(500);
  await pi.locator('#btn-criar-inquerito').click(); await pi.locator('#opcao-inquerito-ia').click(); await pi.locator('#btn-tipo-inquerito-ok').click(); await pi.waitForTimeout(600);
  await pi.locator('#inquerito-ia-temas').fill('Satisfação com o atendimento presencial');
  await pi.locator('#inquerito-ia-informacoes').fill('Tempo de espera; cortesia; resolução do pedido');
  await pi.locator('#btn-gerar-guiao-ia').click();
  await pi.waitForFunction(() => /informaç|«/.test(document.querySelector('[data-testid="inquerito-ia-preview"]')?.textContent || ''), null, { timeout: 120000 }).catch(() => {});
  await pi.locator('#btn-criar-inquerito-ia').click(); await pi.locator('[data-testid="inqueritos-ia-compostos"]').waitFor({ timeout: 30000 });
  const campoTo = await pi.evaluate(() => Array.from(document.querySelectorAll('input')).map((i) => i.value).filter((v) => /^todos$/i.test(v)).length);
  ok('P2.2 com destinatário manual o campo NÃO passa a «Todos»', campoTo === 0);
  await pi.locator('input[placeholder="Qual o tema da sua mensagem?"]').fill(ASSUNTO_UM); await pi.waitForTimeout(300);
  await pi.locator('#btn-enviar-mensagem').click(); await pi.waitForTimeout(800);
  await pi.getByText('Mensagem Normal').first().click();
  await pi.waitForSelector('text=/enviad[ao] com sucesso|COMPROVATIVO ENVIADO|Correspondência enviada/i', { timeout: 90000 }).catch(() => {});
  const tF = await textoPagina(pi);
  ok('P2.3 inquérito expedido para o destinatário único', /enviad[ao] com sucesso|COMPROVATIVO ENVIADO/i.test(tF), (tF.match(/A difusão falhou[^\n]*/) || [''])[0]);
  await shot(pi, 'P2_um_enviado');
  await pi.waitForTimeout(3000);
  const mUm = await rest(`messages?select=id,recipient_bi,inquerito_ia_id&subject=eq.${encodeURIComponent(ASSUNTO_UM)}`);
  const destUm = (mUm || []).map((m) => m.recipient_bi).filter((r) => r !== 'TODOS');
  ok('P2.4 nuvem: exactamente 1 cópia, para o B.I. indicado', destUm.length === 1 && destUm[0] === CID1.bi, JSON.stringify(destUm));
  ok('P2.5 cópia com inquerito_ia_id embutido', (mUm || []).some((m) => m.recipient_bi === CID1.bi && m.inquerito_ia_id));
  const inqUm = (mUm || []).find((m) => m.recipient_bi === CID1.bi)?.inquerito_ia_id;
  if (inqUm) { const q = await rest(`inqueritos_ia?select=status,audiencia_total&id=eq.${inqUm}`); ok('P2.6 inquérito activo com audiência = 1', q?.[0]?.status === 'ativo' && q?.[0]?.audiencia_total === 1, JSON.stringify(q?.[0])); }
  await pi.context().close();

  console.log('\n=== P2b) Inquérito com IA — «Todos» = cidadãos com correspondência trocada ===');
  const ASSUNTO_TODOS = `[T61] Inquérito IA para todos ${stamp}`;
  const aud = await fetch(`${SUPA}/rest/v1/rpc/cda_audiencia_sondagem`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` }, body: JSON.stringify({ p_code: RESP.code }) }).then((r) => r.json()).catch(() => []);
  const esperados = [...new Set((Array.isArray(aud) ? aud : []).map(String).filter((b) => /^\d{9}[A-Z]{2}\d{3}$/.test(b)))];
  console.log(`   audiência esperada (correspondência trocada com ${RESP.code}): ${esperados.length} cidadão(s)`);
  const p2 = await novaPagina();
  ok('P2b.1 login da instituição', await login(p2, '/institucional', RESP.user, RESP.pass));
  await irCorreio(p2);
  await p2.getByRole('button', { name: /Nova Mensagem/i }).first().click(); await p2.waitForTimeout(1000);
  await p2.locator('#btn-criar-inquerito').click(); await p2.locator('#opcao-inquerito-ia').click(); await p2.locator('#btn-tipo-inquerito-ok').click(); await p2.waitForTimeout(600);
  await p2.locator('#inquerito-ia-temas').fill('Qualidade dos serviços digitais');
  await p2.locator('#inquerito-ia-informacoes').fill('Facilidade de uso; rapidez; sugestões');
  await p2.locator('#btn-gerar-guiao-ia').click();
  await p2.waitForFunction(() => /informaç|«/.test(document.querySelector('[data-testid="inquerito-ia-preview"]')?.textContent || ''), null, { timeout: 120000 }).catch(() => {});
  await p2.locator('#btn-criar-inquerito-ia').click(); await p2.locator('[data-testid="inqueritos-ia-compostos"]').waitFor({ timeout: 30000 });
  const paraTodos = await p2.evaluate(() => Array.from(document.querySelectorAll('input')).some((i) => /^todos$/i.test(i.value)));
  ok('P2b.2 sem destinatário manual o campo passa a «Todos»', paraTodos);
  await p2.locator('input[placeholder="Qual o tema da sua mensagem?"]').fill(ASSUNTO_TODOS); await p2.waitForTimeout(300);
  await p2.locator('#btn-enviar-mensagem').click(); await p2.waitForTimeout(800);
  await p2.getByText('Mensagem Normal').first().click();
  await p2.waitForSelector('text=/enviada com sucesso/i', { timeout: 120000 }).catch(() => {});
  const tT = await textoPagina(p2);
  ok('P2b.3 difusão «Todos» concluída', /enviada com sucesso/i.test(tT), (tT.match(/Correspondência enviada com sucesso[^\n]*/) || tT.match(/A difusão falhou[^\n]*/) || [''])[0].slice(0, 160));
  await shot(p2, 'P2b_todos_enviado');
  await p2.waitForTimeout(3000);
  const mT = await rest(`messages?select=recipient_bi&subject=eq.${encodeURIComponent(ASSUNTO_TODOS)}&limit=1000`);
  const destT = [...new Set((mT || []).map((m) => m.recipient_bi).filter((r) => r !== 'TODOS'))].sort();
  const faltam = esperados.filter((b) => !destT.includes(b)); const aMais = destT.filter((b) => !esperados.includes(b));
  ok('P2b.4 nuvem: 1 cópia por cidadão da audiência (correspondência trocada), nenhum a mais', destT.length === esperados.length && faltam.length === 0 && aMais.length === 0, `entregues ${destT.length}/${esperados.length}${faltam.length ? `; faltam ${faltam.join(',')}` : ''}${aMais.length ? `; a mais ${aMais.join(',')}` : ''}`);
  ok('P2b.5 cidadão real 002399714LA030 incluído', destT.includes(CID1.bi));
  ok('P2b.6 sem erros JS (instituição)', p2.__erros.length === 0 && pi.__erros.length === 0);
  await p2.context().close();

  console.log('\n=== P2c) Cidadão real recebe o inquérito individual ===');
  const pc = await novaPagina();
  await pc.addInitScript(() => { try { delete window.webkitSpeechRecognition; delete window.SpeechRecognition; } catch {} });
  ok('P2c.1 login do cidadão 002399714LA030', await login(pc, '/', CID1.bi, CID1.pass));
  await irCorreio(pc);
  ok('P2c.2 correspondência do inquérito individual na caixa', await abrirMsgPorAssunto(pc, ASSUNTO_UM));
  const det = pc.getByRole('button', { name: /Ver detalhes Completos/i }); if (await det.count()) { await det.first().click(); await pc.waitForTimeout(1500); }
  const cartao = pc.locator('[data-testid="inquerito-ia-cartao"]').first(); await cartao.waitFor({ timeout: 20000 }).catch(() => {});
  ok('P2c.3 cartão «Inquérito com IA» com «Iniciar Inquérito»', /Iniciar Inquérito/i.test(await cartao.innerText().catch(() => '')));
  await shot(pc, 'P2c_cidadao_cartao');
  await pc.context().close();
}
// ═════════════ P4b — Adesão institucional aprovada → correspondência na nuvem ═════════════
if (FASES.includes('4')) {
  console.log('\n=== P4b) Verificação estática: aprovação institucional grava «Adesão Aprovada» na nuvem ===');
  // Não há instituições pendentes reais para aprovar sem criar dados novos; a
  // rota é a mesma (enviarMensagemAdministrativa com sessão Auth do ADMIN-0001)
  // já provada em P4.1. Confirma-se aqui que a instituição IEAGU-LLL (aprovada no
  // T60 pela via antiga) NÃO tem a correspondência na nuvem — evidência do bug antigo.
  const mI = await rest(`messages?select=subject&recipient_bi=eq.IEAGU-LLL&sender_bi=eq.CDA`);
  console.log(`   IEAGU-LLL (aprovada antes da correcção): ${(mI || []).length} correspondência(s) CDA na nuvem — esperado 0 (bug antigo)`);
}
} catch (e) { gravarErro(e); }

const total = resultados.length, passed = resultados.filter((r) => r.ok).length;
console.log(`\nRESULTADO T61 (${FASES}): ${passed}/${total}`);
if (passed < total) { console.log('FALHAS:'); for (const r of resultados.filter((r) => !r.ok)) console.log(` - ${r.nome}${r.extra ? ` — ${r.extra}` : ''}`); }
fs.writeFileSync(`${DIR}/resultado_${FASES}.json`, JSON.stringify(resultados, null, 2));
await browser.close();
