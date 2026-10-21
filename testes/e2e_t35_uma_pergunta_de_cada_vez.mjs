// ============================================================================
// E2E — Tarefa 35 (2026-09-11): «UMA pergunta de cada vez» com IA REAL.
// Reproduz o cenário real do inquérito #21 (instituição INAPEM-LLMM-01, textos
// exactamente como a instituição os escreveu, com gralhas) e verifica, turno a
// turno, na conversa por TEXTO do cidadão real, que:
//   • cada mensagem da IA tem UMA única pergunta (≤ 1 «?»)
//   • nunca junta «rendimento» com «água»/«luz» na mesma pergunta
//   • a IA aprofunda (n.º de perguntas > n.º de temas da instituição)
//   • o guião não é o template (origem «ia») e tem campos atómicos
// Sem mocks: servidor local + BD real + IA real. Cria 1 inquérito «[TESTE T35 …]»
// e encerra-o no fim pela UI. Uso: node testes/e2e_t35_uma_pergunta_de_cada_vez.mjs
// ============================================================================
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const cred = fs.readFileSync('/home/user/.credenciais_cda/contas_reais.md', 'utf8');
const senhaDe = (conta, d) => (cred.match(new RegExp(`${conta}[^\\n]*?(\\d{9})`)) || [])[1] || d;
const INST = { user: 'INAPEM-LLMM-01', pass: senhaDe('INAPEM-LLMM-01', '') };
const CID = { user: process.env.BI || '005404692BO043', pass: senhaDe(process.env.BI || '005404692BO043', '') };
const CARIMBO = new Date().toISOString().slice(11, 16).replace(':', 'h');
const ASSUNTO = `[TESTE T35 ${CARIMBO}] Condições de vida`;
const TEMA = 'Condicoes de vida da populacao.';
const INFOS = 'Fonte de rendimento, se tem agua canlaizada e luz electrica.';
const DESKTOP = { width: 1366, height: 900 };

const env = Object.fromEntries(fs.readFileSync('/home/user/.credenciais_cda/env', 'utf8').split('\n').filter((l) => /=/.test(l) && !/^\s*#/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim().replace(/^export\s+/, ''), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const SUPA = env.VITE_SUPABASE_URL || env.SUPABASE_URL || 'https://klrclczcahfycfdxzdqs.supabase.co';
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const rest = async (q) => (await fetch(`${SUPA}/rest/v1/${q}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })).json();

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
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="bolha-ia"]').length > n, n, { timeout: 120000 });
  return bolhas(page).last().innerText();
};
const analisarPergunta = (txt) => {
  const nQ = (txt.match(/\?/g) || []).length;
  const combinada = /rendimento[\s\S]*(água|agua|luz|energia)|(água|agua)[\s\S]*(luz|energia)/i.test(txt);
  return { nQ, combinada, unica: nQ <= 1 && !combinada };
};

// ============================================================================
console.log(`\n=== (a) INSTITUIÇÃO ${INST.user} cria «${ASSUNTO}» com os textos reais do inquérito #21 (IA real) ===`);
let page = await novaPagina(DESKTOP);
ok('a1 login instituição', await login(page, '/institucional', INST));
await irHash(page, '#/correspondencias');
await page.getByRole('button', { name: /Nova Mensagem/i }).first().click(); await page.waitForTimeout(1000);
await page.locator('#btn-criar-inquerito').click();
await page.locator('#opcao-inquerito-ia').click();
await page.locator('#btn-tipo-inquerito-ok').click(); await page.waitForTimeout(600);
await page.locator('#inquerito-ia-temas').fill(TEMA);
await page.locator('#inquerito-ia-informacoes').fill(INFOS);
// T39 — a IA só é chamada no clique explícito em «Gerar com IA»
await page.locator('#btn-gerar-guiao-ia').click();
let preview = '';
try {
  await page.waitForFunction(() => /informaç/.test(document.querySelector('[data-testid="inquerito-ia-preview"]')?.textContent || ''), null, { timeout: 90000 });
} catch { /* segue com o que houver */ }
preview = await page.locator('[data-testid="inquerito-ia-preview"]').innerText();
const nInfos = Number((preview.match(/(\d+) informaç/) || [])[1] || 0);
ok('a2 pré-visualização com ≥ 3 informações (temas separados, nunca 1 só)', nInfos >= 3, `${nInfos} informações · ${preview.replace(/\s+/g, ' ').slice(0, 140)}`);
await page.locator('#btn-criar-inquerito-ia').click();
await page.locator('[data-testid="inqueritos-ia-compostos"]').waitFor({ timeout: 30000 });
await page.locator('input[placeholder="Qual o tema da sua mensagem?"]').fill(ASSUNTO); await page.waitForTimeout(300);
await page.locator('#btn-enviar-mensagem').click(); await page.waitForTimeout(800);
await page.getByText('Mensagem Normal').first().click();
await page.waitForSelector('text=/Correspondência enviada com sucesso/', { timeout: 90000 });
const txtSucesso = await page.locator('text=/Correspondência enviada com sucesso/').innerText();
ok('a3 expedida', /sucesso/.test(txtSucesso), txtSucesso.slice(0, 120));
ok('a4 sem erros JS (instituição)', page.__erros.length === 0, page.__erros.join(' | '));
await page.context().close();
await new Promise((r) => setTimeout(r, 2500));
const msgs = await rest(`messages?select=recipient_bi,inquerito_ia_id&subject=eq.${encodeURIComponent(ASSUNTO)}&order=id.desc&limit=200`);
const inqId = (Array.isArray(msgs) ? msgs : []).find((m) => m.inquerito_ia_id)?.inquerito_ia_id;
const inq = inqId ? (await rest(`inqueritos_ia?select=id,guiao_origem,guiao&id=eq.${inqId}`))?.[0] : null;
const campos = inq?.guiao?.campos || [];
const rotulos = campos.map((c) => `${c.chave}:${c.tipo}`);
const atomicos = campos.every((c) => !/rendimento[\s\S]*(água|agua|luz)|(água|agua)[\s\S]*luz/i.test(`${c.chave} ${c.rotulo}`));
ok('a5 BD: guião com campos ATÓMICOS (nenhum junta rendimento/água/luz)', !!inq && campos.length >= 3 && atomicos, `#${inqId} origem=${inq?.guiao_origem} · ${rotulos.join(', ')}`);
ok('a6 BD: guião gerado pela IA (não template) — se «template», a IA esteve indisponível', inq?.guiao_origem === 'ia', `origem=${inq?.guiao_origem}`);

// ============================================================================
console.log(`\n=== (b) CIDADÃO ${CID.user} responde por TEXTO (IA real) — cada turno é verificado ===`);
page = await novaPagina(DESKTOP);
ok('b1 login cidadão', await login(page, '/', CID));
await irHash(page, '#/correspondencias');
ok('b2 correspondência aberta', await abrirMsgPorAssunto(page, ASSUNTO));
const det = page.getByRole('button', { name: /Ver detalhes Completos/i });
if (await det.count()) { await det.first().click(); await page.waitForTimeout(1500); }
const cartao = page.locator('[data-testid="inquerito-ia-cartao"]').first();
await cartao.waitFor({ timeout: 15000 });
await cartao.locator('button[id^="btn-iniciar-inquerito-ia-"]').click();
await page.locator('[data-testid="inquerito-ia-chat"]').waitFor({ timeout: 15000 });
await page.waitForFunction(() => document.querySelectorAll('[data-testid="bolha-ia"]').length >= 1, null, { timeout: 15000 });
const saud = await bolhas(page).first().innerText();
console.log(`     IA: «${saud}»`);
ok('b3 saudação sem pontuação duplicada', !/\.\./.test(saud));
// consentimento por texto (não por chip) — é a conversa por texto que está em análise
const respostas = ['Sim, pode perguntar', 'Sou motorista numa empresa privada', '100.000 kwanzas por mês', 'Não, vamos buscar ao chafariz do bairro', 'Sim, mas falha muito', 'Quase todos os dias', 'Somos seis pessoas', 'Sim', 'Casa própria', 'Uns doze anos', 'Sim', 'Não', 'Sim'];
const turnos = [];
for (const r of respostas) {
  if (await page.locator('#btn-inquerito-ia-concluir').count()) break;
  const t = await responder(page, r);
  const a = analisarPergunta(t);
  turnos.push({ cidadao: r, ia: t, ...a });
  console.log(`     ${a.unica ? '  ' : '!!'} ${r}  →  «${t}»`);
}
await page.waitForSelector('#btn-inquerito-ia-concluir', { timeout: 30000 });
const perguntas = turnos.filter((t) => t.nQ >= 1);
ok('b4 TODAS as mensagens da IA têm UMA única pergunta', turnos.every((t) => t.nQ <= 1), turnos.filter((t) => t.nQ > 1).map((t) => `«${t.ia}»`).join(' · ') || `${turnos.length} turnos`);
ok('b5 NENHUMA pergunta junta rendimento/água/luz', turnos.every((t) => !t.combinada), turnos.filter((t) => t.combinada).map((t) => `«${t.ia}»`).join(' · '));
ok('b6 a IA aprofundou (mais perguntas do que os 3 temas escritos pela instituição)', perguntas.length > 3, `${perguntas.length} perguntas`);
ok('b7 conversa terminou com agradecimento', /obrigad/i.test(turnos[turnos.length - 1]?.ia || ''));
// paráfrases contam como repetição (semelhança de palavras ≥ 0,4, como no servidor)
const palavras = (t) => new Set(t.toLowerCase().replace(/[^a-z0-9à-ú ]/gi, ' ').split(/\s+/).filter((w) => w.length > 2));
const jaccard = (a, b) => { let i = 0; for (const w of a) if (b.has(w)) i++; const u = a.size + b.size - i; return u ? i / u : 0; };
const setsIa = turnos.map((t) => palavras(t.ia));
const repetidas = turnos.map((t, i) => [t.ia, setsIa.filter((s) => jaccard(s, setsIa[i]) >= 0.4).length]).filter(([, n]) => n >= 4);
ok('b7b nenhuma pergunta feita/parafraseada 4+ vezes (a IA avança quando o cidadão não responde)', repetidas.length === 0, [...new Set(repetidas.map(([k, n]) => `${n}× «${k}»`))].join(' · '));
ok('b8 modo guiado NÃO ecoa a frase crua da instituição', !turnos.some((t) => /Pode indicar um número para fonte de rendimento, se tem/i.test(t.ia)));
const dom = await page.locator('[data-testid="inquerito-ia-chat"]').innerText();
ok('b9 ASSERÇÃO NEGATIVA: cidadão nunca vê dados extraídos', !/Motorista(?!\s+numa)|fonte_rendimento|__detalhe|Resumo/i.test(dom.replace(/Sou motorista numa empresa privada/g, '')));
await page.screenshot({ path: 'testes/evidencias/t35_b_conversa.png', fullPage: true });
await page.locator('#btn-inquerito-ia-concluir').click();
await page.locator('[data-testid="inquerito-ia-confirmacao"]').waitFor({ timeout: 15000 }).catch(() => {});
{ const v = page.locator('#btn-inquerito-ia-voltar'); if (await v.count()) await v.click(); }
await page.waitForTimeout(2500);
ok('b10 pill «Respondido»', (await page.locator('[data-testid="inquerito-ia-respondido"]').count()) > 0);
ok('b11 sem erros JS (cidadão)', page.__erros.length === 0, page.__erros.join(' | '));
await page.context().close();
const resp = inqId ? (await rest(`inquerito_ia_respostas?select=estado,canal_usado,n_perguntas,campos&inquerito_id=eq.${inqId}&order=id.desc&limit=1`))?.[0] : null;
const nCampos = Object.keys(resp?.campos || {}).filter((k) => !k.endsWith('__detalhe')).length;
ok('b12 BD: resposta concluída pela IA com ≥ 3 campos (fonte, água, luz…)', resp?.estado === 'concluido' && nCampos >= 3, `canal=${resp?.canal_usado} perguntas=${resp?.n_perguntas} campos=${JSON.stringify(resp?.campos)}`);

// ============================================================================
console.log(`\n=== (c) INSTITUIÇÃO — encerra o inquérito de teste pela UI ===`);
page = await novaPagina(DESKTOP);
await login(page, '/institucional', INST);
await irHash(page, '#/sondagens');
// selecciona a linha deste inquérito pelo objectivo exacto do guião (o #21 real, também «Condições…», fica de fora)
const linha = page.locator('[data-testid="inquerito-ia-linha"]', { hasText: (inq?.guiao?.objectivo || TEMA).slice(0, 60) }).first();
await linha.waitFor({ timeout: 20000 });
await linha.locator('button').first().click();
const modal = page.locator('[data-testid="inquerito-ia-resultados"]');
await modal.waitFor({ timeout: 15000 });
await page.waitForFunction(() => document.querySelectorAll('[data-testid="inquerito-ia-campo"]').length >= 1, null, { timeout: 45000 }).catch(() => {});
const txtRes = await modal.innerText();
ok('c1 resultados por campo (fonte de rendimento / água / luz em separado)', /rendimento/i.test(txtRes) && /(água|agua)/i.test(txtRes) && /(luz|energia)/i.test(txtRes));
await page.screenshot({ path: 'testes/evidencias/t35_c_resultados.png' });
if (await page.locator('#btn-encerrar-inquerito-ia').count()) {
  await page.locator('#btn-encerrar-inquerito-ia').click(); await page.waitForTimeout(500);
  await page.getByRole('button', { name: /^Encerrar$/ }).click(); await page.waitForTimeout(2500);
}
ok('c2 inquérito de teste encerrado pela UI', (await page.locator('#btn-encerrar-inquerito-ia').count()) === 0);
await page.context().close();
await browser.close();

fs.writeFileSync('testes/evidencias/t35_conversa.json', JSON.stringify({ assunto: ASSUNTO, inqueritoId: inqId, origem: inq?.guiao_origem, campos: rotulos, saudacao: saud, turnos, resposta: resp }, null, 2));
const falhas = R.filter((r) => !r.ok);
console.log(`\n${R.length - falhas.length}/${R.length} verificações OK${falhas.length ? ' — FALHAS: ' + falhas.map((f) => f.n).join('; ') : ''}`);
process.exit(falhas.length ? 1 : 0);
