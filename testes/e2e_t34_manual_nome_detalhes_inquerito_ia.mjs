// ============================================================================
// E2E — Tarefa 34 (2026-09-11): (a) destinatário MANUAL + «Todos» recebe a
// correspondência E a notificação; (b) a IA recebe o nome OFICIAL da
// instituição com sessão (não o código); (c) «Resultados» desdobram cada
// valor pelos detalhes («Emprego — (1 Motorista)»).
// IA simulada com page.route (determinístico, sem quota); BD REAL (contas
// reais): cria 1 inquérito «[TESTE T34 …]» e encerra-o no fim pela UI.
// Uso: node testes/e2e_t34_manual_nome_detalhes_inquerito_ia.mjs   (≈ 2 min)
// ============================================================================
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const cred = fs.readFileSync('/home/user/.credenciais_cda/contas_reais.md', 'utf8');
const senhaDe = (conta, d) => (cred.match(new RegExp(`${conta}[^\\n]*?(\\d{9})`)) || [])[1] || d;
const INST = { user: 'INAPEM-LLMM-01', pass: senhaDe('INAPEM-LLMM-01', '') };
const CID1 = { user: '002399714LA030', pass: senhaDe('002399714LA030', '') };
const NOME_OFICIAL = 'INAPEM — Instituto Nacional de Apoio as Micro, Pequenas e Médias Empresas';
const CARIMBO = new Date().toISOString().slice(11, 16).replace(':', 'h');
const ASSUNTO = `[TESTE T34 ${CARIMBO}] Inquérito com IA — rendimento`;
const DESKTOP = { width: 1366, height: 900 };

// Supabase (service role) só para VERIFICAR entregas — nunca escreve.
const env = Object.fromEntries(fs.readFileSync('/home/user/.credenciais_cda/env', 'utf8').split('\n').filter((l) => /=/.test(l) && !/^\s*#/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim().replace(/^export\s+/, ''), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const SUPA = env.VITE_SUPABASE_URL || env.SUPABASE_URL || 'https://klrclczcahfycfdxzdqs.supabase.co';
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const rest = async (q) => (await fetch(`${SUPA}/rest/v1/${q}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })).json();

const GUIAO = (inst) => ({
  objectivo: 'Fonte de rendimento das famílias',
  saudacao: `Olá! Sou do ${inst}. Gostava de conhecer a fonte de rendimento da sua família. Posso fazer-lhe algumas perguntas?`,
  maxPerguntas: 6,
  campos: [
    { chave: 'fonte_rendimento', rotulo: 'Fonte de rendimento', tipo: 'escolha', opcoes: ['Emprego', 'Negócio próprio', 'Pensões', 'Outro'], so_se: null },
    { chave: 'tem_agua', rotulo: 'Tem água em casa', tipo: 'sim_nao', so_se: null },
  ],
});
const CONVERSA = [
  { proximaMensagem: 'Qual é a principal fonte de rendimento da sua família?', camposExtraidos: {}, detalhesExtraidos: {}, respostaRapida: ['Emprego', 'Negócio próprio', 'Pensões', 'Outro'], terminou: false, motivoFim: null },
  { proximaMensagem: 'Obrigado. E tem água em casa?', camposExtraidos: { fonte_rendimento: 'Emprego' }, detalhesExtraidos: { fonte_rendimento: 'Motorista' }, respostaRapida: ['Sim', 'Não'], terminou: false, motivoFim: null },
  { proximaMensagem: 'Muito obrigado pela sua participação. As suas respostas foram registadas.', camposExtraidos: { tem_agua: 'Sim' }, detalhesExtraidos: {}, respostaRapida: null, terminou: true, motivoFim: 'concluido' },
];
const mockIA = async (page) => {
  page.__pedidos = { guiao: 0, conversa: 0, instGuiao: null, instConversa: null };
  await page.route('**/api/inquerito-ia/guiao', async (route) => {
    const body = route.request().postDataJSON();
    page.__pedidos.guiao++; page.__pedidos.instGuiao = body?.instituicao;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, modelo: 'mock', guiao: GUIAO(body?.instituicao || 'a instituição') }) });
  });
  await page.route('**/api/inquerito-ia/conversa', async (route) => {
    const body = route.request().postDataJSON();
    page.__pedidos.instConversa = body?.instituicao;
    const r = CONVERSA[Math.min(page.__pedidos.conversa, CONVERSA.length - 1)];
    page.__pedidos.conversa++;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, modelo: 'mock', ...r }) });
  });
};

const R = [];
const ok = (n, c, x = '') => { R.push({ n, ok: !!c }); console.log(`${c ? '✔' : '✘'} ${n}${x ? ' — ' + x : ''}`); };
const browser = await chromium.launch();
const novaPagina = async (vp) => {
  const page = await (await browser.newContext({ viewport: vp })).newPage();
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
const irHash = async (page, h) => { await page.evaluate((h) => { window.location.hash = h; }, h); await page.waitForTimeout(2500); };
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
  }
  return false;
};
const bolhas = (page) => page.locator('[data-testid="bolha-ia"]');
const responder = async (page, t) => {
  const n = await bolhas(page).count();
  await page.locator('#inquerito-ia-input').fill(t);
  await page.locator('#btn-inquerito-ia-enviar').click();
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="bolha-ia"]').length > n, n, { timeout: 30000 });
  return bolhas(page).last().innerText();
};

// ============================================================================
console.log(`\n=== (a) INSTITUIÇÃO ${INST.user} — destinatário manual ${CID1.user} + «Todos» ===`);
let page = await novaPagina(DESKTOP);
await mockIA(page);
ok('a1 login instituição', await login(page, '/institucional', INST));
await irHash(page, '#/correspondencias');
await page.getByRole('button', { name: /Nova Mensagem/i }).first().click(); await page.waitForTimeout(1000);
// destinatário manual → chip (a caixa «Para» fica livre para o «Todos» automático)
await page.locator('input[placeholder*="Número do BI"]').fill(CID1.user);
await page.getByRole('button', { name: /Adicionar destinatário/i }).click(); await page.waitForTimeout(500);
const chipManual = async () => (await page.locator('text=/destinatário\\(s\\) na lista/').count()) > 0 && (await page.locator('span.font-mono', { hasText: CID1.user }).count()) > 0;
ok('a2 chip do destinatário manual', await chipManual());
await page.locator('#btn-criar-inquerito').click();
await page.locator('#opcao-inquerito-ia').click();
await page.locator('#btn-tipo-inquerito-ok').click(); await page.waitForTimeout(600);
await page.locator('#inquerito-ia-temas').fill('Fonte de rendimento das famílias');
await page.locator('#inquerito-ia-informacoes').fill('Fonte de rendimento; se tem água em casa');
await page.waitForFunction(() => /2 informaç/.test(document.querySelector('[data-testid="inquerito-ia-preview"]')?.textContent || ''), null, { timeout: 15000 });
ok('a3 /guiao recebe o NOME OFICIAL da instituição (não o código)', page.__pedidos.instGuiao === NOME_OFICIAL, `instituicao=«${page.__pedidos.instGuiao}»`);
const preview = await page.locator('[data-testid="inquerito-ia-preview"]').innerText();
ok('a4 pré-visualização com o nome oficial na saudação', preview.includes('Sou do INAPEM — Instituto Nacional'));
await page.locator('#btn-criar-inquerito-ia').click();
await page.locator('[data-testid="inqueritos-ia-compostos"]').waitFor({ timeout: 30000 });
ok('a5 destinatário automático «Todos» + chip manual mantido', await page.evaluate(() => Array.from(document.querySelectorAll('input')).some((i) => /^todos$/i.test(i.value))) && await chipManual());
await page.locator('input[placeholder="Qual o tema da sua mensagem?"]').fill(ASSUNTO); await page.waitForTimeout(300);
await page.locator('#btn-enviar-mensagem').click(); await page.waitForTimeout(800);
await page.getByText('Mensagem Normal').first().click();
await page.waitForSelector('text=/Correspondência enviada com sucesso/', { timeout: 90000 });
const txtSucesso = await page.locator('text=/Correspondência enviada com sucesso/').innerText();
const audiencia = Number((txtSucesso.match(/(\d+) cidadão/) || [])[1] || 0);
ok('a6 popup de sucesso menciona a difusão E o destinatário directo', audiencia > 0 && new RegExp(`1 destinatário\\(s\\) directo\\(s\\) \\(${CID1.user}\\)`).test(txtSucesso), txtSucesso);
await page.screenshot({ path: 'testes/evidencias/t34_a_sucesso.png' });
// Verificação na BD (leitura): mensagem + notificação do destinatário manual
await page.waitForTimeout(2500);
const msgs = await rest(`messages?select=recipient_bi,inquerito_ia_ids,protocol_number&subject=eq.${encodeURIComponent(ASSUNTO)}&order=id.desc&limit=100`);
const msgManual = (Array.isArray(msgs) ? msgs : []).find((m) => m.recipient_bi === CID1.user);
const msgTodos = (Array.isArray(msgs) ? msgs : []).find((m) => m.recipient_bi === 'TODOS');
const inqId = msgManual?.inquerito_ia_ids?.[0];
ok('a7 BD: mensagem do destinatário manual com o inquérito embutido + linha «TODOS»', !!msgManual && !!inqId && !!msgTodos, `${(msgs || []).length} linhas; manual=${JSON.stringify(msgManual)}`);
const notifs = await rest(`notifications?select=id,title,message&target_bi=eq.${CID1.user}&order=id.desc&limit=5`);
ok('a8 BD: notificação «Nova Correspondência Oficial» para o destinatário manual', (Array.isArray(notifs) ? notifs : []).some((n) => String(n.message || '').includes(ASSUNTO)), (notifs || []).slice(0, 2).map((n) => n.message).join(' | '));
const inq = inqId ? await rest(`inqueritos_ia?select=instituicao_nome&id=eq.${inqId}`) : [];
ok('a9 BD: inqueritos_ia.instituicao_nome = nome oficial', inq?.[0]?.instituicao_nome === NOME_OFICIAL, inq?.[0]?.instituicao_nome);
ok('a10 sem erros JS (instituição)', page.__erros.length === 0, page.__erros.join(' | '));
await page.context().close();

// ============================================================================
console.log(`\n=== (b) CIDADÃO ${CID1.user} — abre a correspondência recebida e responde («sou motorista») ===`);
page = await novaPagina(DESKTOP);
await mockIA(page);
ok('b1 login cidadão', await login(page, '/', CID1));
await irHash(page, '#/correspondencias');
ok('b2 correspondência do destinatário manual aberta', await abrirMsgPorAssunto(page, ASSUNTO));
const det = page.getByRole('button', { name: /Ver detalhes Completos/i });
if (await det.count()) { await det.first().click(); await page.waitForTimeout(1500); }
const cartao = page.locator('[data-testid="inquerito-ia-cartao"]').first();
await cartao.waitFor({ timeout: 15000 });
await cartao.locator('button[id^="btn-iniciar-inquerito-ia-"]').click();
const chat = page.locator('[data-testid="inquerito-ia-chat"]');
await chat.waitFor({ timeout: 15000 });
await page.waitForFunction(() => document.querySelectorAll('[data-testid="bolha-ia"]').length >= 1, null, { timeout: 15000 });
ok('b3 saudação com o nome oficial da instituição', (await bolhas(page).first().innerText()).includes('Sou do INAPEM — Instituto Nacional'));
await page.locator('[data-testid="respostas-rapidas"] button', { hasText: /Sim/ }).click();
await page.waitForFunction(() => document.querySelectorAll('[data-testid="bolha-ia"]').length >= 2, null, { timeout: 30000 });
ok('b4 /conversa recebe o nome oficial da instituição', page.__pedidos.instConversa === NOME_OFICIAL, `instituicao=«${page.__pedidos.instConversa}»`);
const q2 = await responder(page, 'Sou motorista numa empresa');
const fim = await responder(page, 'Sim');
ok('b5 conversa concluída', /água/i.test(q2) && /obrigado/i.test(fim));
const dom = await chat.innerText();
ok('b6 ASSERÇÃO NEGATIVA: detalhe/campos nunca aparecem ao cidadão', !/Motorista|fonte_rendimento|__detalhe|Resumo/i.test(dom.replace(/Sou motorista numa empresa/g, '')));
await page.locator('#btn-inquerito-ia-concluir').click();
await page.locator('[data-testid="inquerito-ia-confirmacao"]').waitFor({ timeout: 15000 }).catch(() => {});
{ const v = page.locator('#btn-inquerito-ia-voltar'); if (await v.count()) await v.click(); }
await page.waitForTimeout(2500);
ok('b7 pill «Respondido»', (await page.locator('[data-testid="inquerito-ia-respondido"]').count()) > 0);
ok('b8 sem erros JS (cidadão)', page.__erros.length === 0, page.__erros.join(' | '));
await page.context().close();
const resp = inqId ? await rest(`inquerito_ia_respostas?select=estado,campos&inquerito_id=eq.${inqId}`) : [];
ok('b9 BD: campos guardam o detalhe à parte (fonte_rendimento__detalhe=Motorista)', resp?.[0]?.estado === 'concluido' && resp?.[0]?.campos?.fonte_rendimento === 'Emprego' && resp?.[0]?.campos?.fonte_rendimento__detalhe === 'Motorista', JSON.stringify(resp?.[0]?.campos));

// ============================================================================
console.log(`\n=== (c) INSTITUIÇÃO — resultados com desdobramento; encerra ===`);
page = await novaPagina(DESKTOP);
await login(page, '/institucional', INST);
await irHash(page, '#/sondagens');
const linha = page.locator('[data-testid="inquerito-ia-linha"]', { hasText: 'Fonte de rendimento das famílias' }).first();
await linha.waitFor({ timeout: 20000 });
await linha.locator('button').first().click();
const modal = page.locator('[data-testid="inquerito-ia-resultados"]');
await modal.waitFor({ timeout: 15000 });
await page.waitForFunction(() => document.querySelectorAll('[data-testid="inquerito-ia-campo"]').length >= 2, null, { timeout: 20000 });
const txt = await modal.innerText();
ok('c1 «Fonte de rendimento — Emprego 100% (1)» com desdobramento «↳ (1 Motorista)»', /Emprego[\s\S]*100%[\s\S]*\(1\)/.test(txt) && (await page.locator('[data-testid="inquerito-ia-detalhes"]').first().innerText()).includes('(1 Motorista)'));
// o subtítulo vive no cabeçalho do CdaModal (fora do corpo com data-testid)
const cabecalho = await page.evaluate(() => Array.from(document.querySelectorAll('h2, h3, p, span')).find((el) => /Resultados do Inquérito com IA/i.test(el.textContent || ''))?.parentElement?.innerText || '');
ok('c2 subtítulo com o nome oficial e sem BI/hash', /INAPEM — Instituto Nacional/i.test(cabecalho || txt) && !/[0-9a-f]{64}/.test(txt) && !txt.includes(CID1.user));
await page.screenshot({ path: 'testes/evidencias/t34_c_resultados_detalhes.png' });
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.locator('#btn-exportar-csv-inquerito-ia').click()]);
const csv = fs.readFileSync(await dl.path(), 'utf8');
ok('c3 CSV com coluna «detalhes»', /;percentagem;detalhes/.test(csv) && /Emprego;1;100%;\(1 Motorista\)/.test(csv));
await page.locator('#btn-encerrar-inquerito-ia').click(); await page.waitForTimeout(500);
await page.getByRole('button', { name: /^Encerrar$/ }).click(); await page.waitForTimeout(2500);
ok('c4 inquérito de teste encerrado pela UI', /encerrado/.test(await modal.innerText()) && (await page.locator('#btn-encerrar-inquerito-ia').count()) === 0);
ok('c5 sem erros JS (instituição)', page.__erros.length === 0, page.__erros.join(' | '));
await page.context().close();
await browser.close();

const falhas = R.filter((r) => !r.ok);
console.log(`\n${R.length - falhas.length}/${R.length} verificações OK${falhas.length ? ' — FALHAS: ' + falhas.map((f) => f.n).join('; ') : ''}`);
process.exit(falhas.length ? 1 : 0);
