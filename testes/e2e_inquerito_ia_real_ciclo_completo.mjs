// Ciclo completo REAL do Inquérito com IA (Fases 1–3) com as contas reais.
// Servidor local (código da branch) + base de dados real + IA real (sem mocks).
// Uso: node testes/e2e_inquerito_ia_real_ciclo_completo.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const cred = fs.readFileSync('/home/user/.credenciais_cda/contas_reais.md', 'utf8');
const senhaDe = (conta, defeito) => (cred.match(new RegExp(`${conta}[^\\n]*?(\\d{9})`)) || [])[1] || defeito;
const INST = { user: 'INAPEM-LLMM-01', pass: senhaDe('INAPEM-LLMM-01', '') };
const CID1 = { user: '002399714LA030', pass: senhaDe('002399714LA030', '') };
const CID2 = { user: '005404692BO043', pass: senhaDe('005404692BO043', '') };
const CARIMBO = new Date().toISOString().slice(11, 16).replace(':', 'h');
const ASSUNTO = process.env.ASSUNTO || `[TESTE ${CARIMBO}] Inquérito com IA — transportes`;
const SO_CD = !!process.env.ASSUNTO; // retomar apenas as secções C e D

const R = []; // resultados
const ok = (nome, cond, extra = '') => { R.push({ nome, ok: !!cond, extra }); console.log(`${cond ? '✔' : '✘'} ${nome}${extra ? ' — ' + extra : ''}`); };

const browser = await chromium.launch();
const novaPagina = async (vp = { width: 1366, height: 900 }) => {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  page.__erros = []; page.on('pageerror', (e) => page.__erros.push(String(e)));
  return page;
};
const login = async (page, path, c) => {
  await page.goto(`${BASE}${path}`); await page.waitForTimeout(2500);
  await page.locator('input[name="cda-utilizador"]').fill(c.user);
  await page.locator('input[name="cda-senha"]').fill(c.pass);
  await page.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click();
  await page.waitForTimeout(4500);
  return !/login/.test(page.url());
};
const irCorreio = async (page) => { await page.evaluate(() => { window.location.hash = '#/correspondencias'; }); await page.waitForTimeout(2500); };
const abrirMsgPorAssunto = async (page, assunto) => {
  for (const sep of [/^Não lidas/i, /^Lidas/i]) {
    const b = page.getByRole('button', { name: sep }).first();
    if (await b.count()) { await b.click(); await page.waitForTimeout(1500); }
    const abrir = page.getByRole('button', { name: /^Abrir$/i });
    for (let i = 0; i < await abrir.count(); i++) {
      const a = abrir.nth(i);
      if (!(await a.isVisible())) continue;
      const t = await a.evaluate((el) => (el.closest('tr') || el.closest('[class*="rounded"]') || el.parentElement).innerText);
      if (t.includes(assunto)) { await a.click(); await page.waitForTimeout(2500); return true; }
    }
    // Mobile: lista em cartões sem botão «Abrir» — clica-se no cartão (h5 do assunto)
    const h5 = page.locator('h5', { hasText: assunto });
    for (let i = 0; i < await h5.count(); i++) {
      if (await h5.nth(i).isVisible()) { await h5.nth(i).click(); await page.waitForTimeout(2500); return true; }
    }
  }
  return false;
};
const cartao = (page) => page.locator('[data-testid="inquerito-ia-cartao"]').first();
const abrirChat = async (page) => {
  await cartao(page).locator('button[id^="btn-iniciar-inquerito-ia-"]').click();
  await page.locator('[data-testid="inquerito-ia-chat"]').waitFor({ timeout: 15000 });
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="bolha-ia"]').length >= 1, null, { timeout: 20000 });
};
const responder = async (page, t) => {
  const n = await page.locator('[data-testid="bolha-ia"]').count();
  await page.locator('#inquerito-ia-input').fill(t);
  await page.locator('#btn-inquerito-ia-enviar').click();
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="bolha-ia"]').length > n, n, { timeout: 90000 });
  const ult = await page.locator('[data-testid="bolha-ia"]').last().innerText();
  console.log(`     ${t}  →  «${ult}»`);
  return ult;
};
const ultimaIa = async (page) => page.locator('[data-testid="bolha-ia"]').last().innerText();

let audiencia = Number(process.env.AUDIENCIA || 0);
let page;
if (!SO_CD) {
// =========================================================================
console.log(`\n=== A) INSTITUIÇÃO ${INST.user} cria e envia «${ASSUNTO}» ===`);
page = await novaPagina();
ok('A1 login instituição', await login(page, '/institucional', INST));
await irCorreio(page);
await page.getByRole('button', { name: /Nova Mensagem/i }).first().click(); await page.waitForTimeout(1000);
await page.locator('#btn-criar-inquerito').click();
await page.locator('#opcao-inquerito-ia').click();
await page.locator('#btn-tipo-inquerito-ok').click(); await page.waitForTimeout(600);
ok('A2 popup «Criar Inquérito com IA» aberto', await page.getByText('Criar Inquérito com IA').first().isVisible());
const nCampos = await page.locator('[role="dialog"] textarea, .fixed textarea').count();
ok('A3 exactamente 2 campos de texto', nCampos === 2, `${nCampos}`);
await page.locator('#inquerito-ia-temas').fill('Como os cidadãos se deslocam para o trabalho e que dificuldades têm com os transportes públicos');
await page.locator('#inquerito-ia-informacoes').fill('Meio de transporte principal; tempo de viagem em minutos; custo diário; usa táxi colectivo (candongueiro); principal problema');
await page.locator('#btn-gerar-guiao-ia').click(); // 2026-09-11 — geração a pedido
let preview = '';
try {
  await page.waitForFunction(() => /informaç/.test(document.querySelector('[data-testid="inquerito-ia-preview"]')?.textContent || ''), null, { timeout: 90000 });
  preview = await page.locator('[data-testid="inquerito-ia-preview"]').innerText();
} catch { preview = await page.locator('[data-testid="inquerito-ia-preview"]').innerText(); }
ok('A4 pré-visualização automática (IA real)', /informaç/.test(preview) && /«/.test(preview), preview.split('\n').filter(Boolean).slice(-2).join(' / ').slice(0, 160));
await page.screenshot({ path: 'testes/evidencias/ciclo_A_popup.png' });
await page.locator('#btn-criar-inquerito-ia').click();
await page.locator('[data-testid="inqueritos-ia-compostos"]').waitFor({ timeout: 30000 });
ok('A5 bloco no compositor', true);
const paraTodos = await page.evaluate(() => Array.from(document.querySelectorAll('input')).some((i) => /^todos$/i.test(i.value)));
ok('A6 destinatário automático «Todos»', paraTodos);
await page.locator('input[placeholder="Qual o tema da sua mensagem?"]').fill(ASSUNTO); await page.waitForTimeout(300);
await page.screenshot({ path: 'testes/evidencias/ciclo_A_compositor.png', fullPage: true });
await page.locator('#btn-enviar-mensagem').click(); await page.waitForTimeout(800);
await page.getByText('Mensagem Normal').first().click();
await page.waitForSelector('text=/Correspondência enviada com sucesso/', { timeout: 60000 });
const txtSucesso = await page.locator('text=/Correspondência enviada com sucesso/').innerText();
ok('A7 expedição concluída', true, txtSucesso);
audiencia = Number((txtSucesso.match(/(\d+) cidadão/) || [])[1] || 0);
await page.screenshot({ path: 'testes/evidencias/ciclo_A_enviado.png' });
// «Enviadas» tem a linha TODOS
const fechar = page.getByRole('button', { name: /^(OK|Fechar|Entendido)$/i }).first();
if (await fechar.count()) await fechar.click();
await page.waitForTimeout(800);
const env = page.getByRole('button', { name: /^Enviadas/i }).first();
if (await env.count()) { await env.click(); await page.waitForTimeout(2500); }
ok('A8 registo na lista «Enviadas»', (await page.getByText(ASSUNTO).count()) > 0);
ok('A9 sem erros JS (instituição)', page.__erros.length === 0, page.__erros.join(' | '));
await page.context().close();

// =========================================================================
console.log(`\n=== B) CIDADÃO 01 ${CID1.user}: recusa, depois participa (retoma) ===`);
page = await novaPagina();
ok('B1 login cidadão 01', await login(page, '/', CID1));
await irCorreio(page);
ok('B2 correspondência recebida e aberta', await abrirMsgPorAssunto(page, ASSUNTO));
const det = page.getByRole('button', { name: /Ver detalhes Completos/i });
if (await det.count()) { await det.first().click(); await page.waitForTimeout(1500); }
await cartao(page).waitFor({ timeout: 15000 });
ok('B3 container «Inquérito com IA» visível', true, (await cartao(page).innerText()).replace(/\n+/g, ' | ').slice(0, 160));
ok('B4 botão «Iniciar Inquérito»', /Iniciar Inquérito/i.test(await cartao(page).innerText()));
await page.screenshot({ path: 'testes/evidencias/ciclo_B_cartao.png' });
await abrirChat(page);
const saud = await ultimaIa(page);
ok('B5 saudação do guião apresentada', saud.length > 20, saud.slice(0, 120));
ok('B6 chips de consentimento', (await page.locator('[data-testid="respostas-rapidas"] button').count()) === 2);
// Recusa
await page.locator('[data-testid="respostas-rapidas"] button', { hasText: 'Agora não' }).click();
await page.waitForSelector('#btn-inquerito-ia-concluir', { timeout: 15000 });
const msgRecusa = await ultimaIa(page);
ok('B7 recusa → mensagem de despedida + só «Concluir»', /Compreendo|Obrigado/i.test(msgRecusa) && (await page.locator('#inquerito-ia-input').count()) === 0, msgRecusa);
await page.locator('#btn-inquerito-ia-concluir').click(); await page.waitForTimeout(2500);
ok('B8 após recusa: cartão continua a permitir participar', /Iniciar Inquérito|Retomar Inquérito/i.test(await cartao(page).innerText()), (await cartao(page).innerText()).split('\n').pop());
// Participa por texto (IA real), fechando a meio e retomando
await abrirChat(page);
await responder(page, 'Sim, podemos');
await responder(page, 'Vou de candongueiro');
// fecha a meio
await page.getByRole('button', { name: 'Fechar' }).last().click(); await page.waitForTimeout(2500);
const txtRetomar = await cartao(page).innerText();
ok('B9 fechar a meio → «Retomar Inquérito»', /Retomar Inquérito/i.test(txtRetomar));
await abrirChat(page);
const nBolhasRetoma = await page.locator('[data-testid="bolha-ia"]').count();
ok('B10 retoma com histórico preservado', nBolhasRetoma >= 2, `${nBolhasRetoma} mensagens da IA`);
const respostasB = ['Uns 45 minutos', '600 kwanzas por dia', 'Sim', 'A demora e a lotação', 'Não', 'Nenhum', 'Sim', 'Outro'];
for (const r of respostasB) { if (await page.locator('#btn-inquerito-ia-concluir').count()) break; await responder(page, r); }
await page.waitForSelector('#btn-inquerito-ia-concluir', { timeout: 20000 });
const domB = await page.locator('[data-testid="inquerito-ia-chat"]').innerText();
ok('B11 fim: agradecimento + «Concluir», sem resumo/campos', /obrigad/i.test(await ultimaIa(page)) && !/meio_transporte|tempo_viagem|custo|Resumo/i.test(domB.replace(/custo diário/gi, '')) );
await page.screenshot({ path: 'testes/evidencias/ciclo_B_fim.png' });
await page.locator('#btn-inquerito-ia-concluir').click();
  await page.locator('[data-testid="inquerito-ia-confirmacao"]').waitFor({ timeout: 15000 }).catch(() => {});
  { const v = page.locator('#btn-inquerito-ia-voltar'); if (await v.count()) await v.click(); }
  await page.waitForTimeout(2500);
ok('B12 pill «Respondido em …»', (await page.locator('[data-testid="inquerito-ia-respondido"]').count()) > 0, await page.locator('[data-testid="inquerito-ia-respondido"]').innerText().catch(() => ''));
await page.screenshot({ path: 'testes/evidencias/ciclo_B_respondido.png' });
// Reabrir a correspondência: estado persistente
await page.reload(); await page.waitForTimeout(4000); await irCorreio(page);
await abrirMsgPorAssunto(page, ASSUNTO);
const det2 = page.getByRole('button', { name: /Ver detalhes Completos/i });
if (await det2.count()) { await det2.first().click(); await page.waitForTimeout(1500); }
await cartao(page).waitFor({ timeout: 15000 });
ok('B13 após reload continua «Respondido» (persistência)', (await page.locator('[data-testid="inquerito-ia-respondido"]').count()) > 0);
ok('B14 sem erros JS (cidadão 01)', page.__erros.length === 0, page.__erros.join(' | '));
await page.context().close();
}

// =========================================================================
console.log(`\n=== C) CIDADÃO 02 ${CID2.user}: participa por chips + texto em ecrã mobile ===`);
page = await novaPagina({ width: 390, height: 844 });
ok('C1 login cidadão 02', await login(page, '/', CID2));
await irCorreio(page);
ok('C2 correspondência recebida e aberta (mobile)', await abrirMsgPorAssunto(page, ASSUNTO));
const det3 = page.getByRole('button', { name: /Ver detalhes Completos/i });
if (await det3.count()) { await det3.first().click(); await page.waitForTimeout(1500); }
await cartao(page).waitFor({ timeout: 15000 });
await cartao(page).scrollIntoViewIfNeeded();
await page.screenshot({ path: 'testes/evidencias/ciclo_C_cartao_mobile.png' });
await abrirChat(page);
await page.locator('[data-testid="respostas-rapidas"] button', { hasText: /Sim/ }).click();
await page.waitForFunction(() => document.querySelectorAll('[data-testid="bolha-ia"]').length >= 2, null, { timeout: 90000 });
console.log(`     [chip Sim]  →  «${await ultimaIa(page)}»`);
const respostasC = ['Vou a pé', '20 minutos', 'Não gasto nada', 'Não uso', 'Falta de autocarros', 'Não', 'Nenhum', 'Sim'];
let usouChip = false;
for (const r of respostasC) {
  if (await page.locator('#btn-inquerito-ia-concluir').count()) break;
  const chips = page.locator('[data-testid="respostas-rapidas"] button');
  if (!usouChip && await chips.count() > 0) {
    const n = await page.locator('[data-testid="bolha-ia"]').count();
    const txt = await chips.first().innerText();
    await chips.first().click();
    await page.waitForFunction((n) => document.querySelectorAll('[data-testid="bolha-ia"]').length > n, n, { timeout: 90000 });
    console.log(`     [chip ${txt}]  →  «${await ultimaIa(page)}»`); usouChip = true; continue;
  }
  await responder(page, r);
}
await page.waitForSelector('#btn-inquerito-ia-concluir', { timeout: 20000 });
ok('C3 conversa terminou com agradecimento', /obrigad/i.test(await ultimaIa(page)));
await page.screenshot({ path: 'testes/evidencias/ciclo_C_fim_mobile.png' });
await page.locator('#btn-inquerito-ia-concluir').click();
  await page.locator('[data-testid="inquerito-ia-confirmacao"]').waitFor({ timeout: 15000 }).catch(() => {});
  { const v = page.locator('#btn-inquerito-ia-voltar'); if (await v.count()) await v.click(); }
  await page.waitForTimeout(2500);
ok('C4 pill «Respondido» (mobile)', (await page.locator('[data-testid="inquerito-ia-respondido"]').count()) > 0);
ok('C5 sem erros JS (cidadão 02)', page.__erros.length === 0, page.__erros.join(' | '));
await page.context().close();
await browser.close();

// =========================================================================
console.log('\n=== D) Base de dados (leitura, service role) ===');
const envTxt = fs.readFileSync('/home/user/.credenciais_cda/env', 'utf8');
const KEY = (envTxt.match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/) || [])[1];
const URL = 'https://klrclczcahfycfdxzdqs.supabase.co';
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const get = async (p) => (await fetch(`${URL}/rest/v1/${p}`, { headers: H })).json();
const rpc = async (n, b) => (await fetch(`${URL}/rest/v1/rpc/${n}`, { method: 'POST', headers: H, body: JSON.stringify(b) })).json();
const msgs = await get(`messages?select=id,recipient_bi,inquerito_ia_id,inquerito_ia_ids&subject=eq.${encodeURIComponent(ASSUNTO)}&order=id.desc`);
const inqId = msgs.find((m) => m.inquerito_ia_id)?.inquerito_ia_id;
ok('D1 mensagens ligadas ao inquérito (1 por cidadão + linha TODOS)', msgs.length === audiencia + 1 && msgs.every((m) => m.inquerito_ia_id === inqId), `${msgs.length} mensagens, inquérito #${inqId}`);
const inq = (await get(`inqueritos_ia?select=id,status,audiencia_total,guiao_origem,guiao&id=eq.${inqId}`))[0];
ok('D2 inquérito activo com audiência', inq?.status === 'ativo' && inq.audiencia_total === audiencia, `status=${inq?.status} audiência=${inq?.audiencia_total} guião=${inq?.guiao_origem} (${inq?.guiao?.campos?.length} campos)`);
const resps = await get(`inquerito_ia_respostas?select=id,cidadao_bi_hash,estado,campos,canal_usado,n_perguntas&inquerito_id=eq.${inqId}&order=id`);
ok('D3 2 respostas concluídas, anónimas (hash 64 hex), com campos', resps.length === 2 && resps.every((r) => r.estado === 'concluido' && /^[0-9a-f]{64}$/.test(r.cidadao_bi_hash) && Object.keys(r.campos || {}).length >= 2), resps.map((r) => `${r.canal_usado}:${Object.keys(r.campos || {}).length} campos/${r.n_perguntas} perg.`).join(', '));
const cont = (await rpc('cda_inquerito_ia_contadores', { p_inquerito_id: inqId }))[0];
ok('D4 contadores RPC', cont?.enviados === audiencia && cont?.iniciados === 2 && cont?.concluidos === 2 && cont?.recusados === 0, JSON.stringify(cont));
const agr = await rpc('cda_inquerito_ia_agregados', { p_inquerito_id: inqId });
ok('D5 agregados RPC (sem respostas individuais)', Array.isArray(agr) && agr.length > 0 && agr.every((a) => 'chave' in a && 'valor' in a && 'total' in a), `${agr.length} linhas`);
const estados = await get(`messages?select=recipient_bi,state_indicator&subject=eq.${encodeURIComponent(ASSUNTO)}&recipient_bi=in.(${CID1.user},${CID2.user})`);
ok('D6 correspondências dos 2 cidadãos em «Respondida»', estados.length === 2 && estados.every((m) => m.state_indicator === 'Respondida'), JSON.stringify(estados));
// Encerrar (protocolo: teste real fechado no fim)
const enc = await (await fetch(`${URL}/rest/v1/inqueritos_ia?id=eq.${inqId}&status=eq.ativo`, { method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify({ status: 'encerrado', encerrado_em: new Date().toISOString() }) })).json();
ok('D7 inquérito de teste encerrado no fim', enc?.[0]?.status === 'encerrado');
console.log('\nCampos extraídos (só visíveis à instituição / BD):');
for (const r of resps) console.log('  ', JSON.stringify(r.campos));

const falhas = R.filter((r) => !r.ok);
console.log(`\n=== RESULTADO: ${R.length - falhas.length}/${R.length} verificações OK ===`);
if (falhas.length) { console.log('FALHAS:', falhas.map((f) => f.nome).join('; ')); process.exit(1); }
