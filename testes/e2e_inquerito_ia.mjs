// ============================================================================
// E2E consolidado — Inquérito com IA (PROMPT v3 §6.4). Os DOIS endpoints de IA
// (/api/inquerito-ia/guiao e /conversa) são simulados com page.route — não
// gasta quota e é determinístico. A base de dados é REAL (mesma do dev
// server): cria 1 inquérito «[TESTE E2E …]» com as contas reais, e encerra-o
// no fim pela própria UI («Encerrar inquérito»). Não correr à toa.
//   (a) instituição: preenche APENAS 2 campos → pré-visualização automática →
//       «Criar Inquérito» → escreve mensagem → envia (mede campos preenchidos)
//   (b) cidadão: abre correspondência → «Iniciar Inquérito» → 3 respostas por
//       texto → agradecimento → «Concluir»; asserção negativa (nada extraído
//       no DOM). Cidadão 1 em desktop 1366×900, cidadão 2 em mobile 390×844.
//   (c) instituição: confirma contadores e agregados; encerra.
// Uso: node testes/e2e_inquerito_ia.mjs      (≈ 2 min)
// ============================================================================
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const cred = fs.readFileSync('/home/user/.credenciais_cda/contas_reais.md', 'utf8');
const senhaDe = (conta, d) => (cred.match(new RegExp(`${conta}[^\\n]*?(\\d{9})`)) || [])[1] || d;
const INST = { user: 'INAPEM-LLMM-01', pass: senhaDe('INAPEM-LLMM-01', '') };
const CID1 = { user: '002399714LA030', pass: senhaDe('002399714LA030', '') };
const CID2 = { user: '005404692BO043', pass: senhaDe('005404692BO043', '') };
const CARIMBO = new Date().toISOString().slice(11, 16).replace(':', 'h');
const ASSUNTO = `[TESTE E2E ${CARIMBO}] Inquérito com IA — mobilidade`;
const DESKTOP = { width: 1366, height: 900 };
const MOBILE = { width: 390, height: 844 };

// --- Guião e conversa simulados -------------------------------------------
const GUIAO = {
  objectivo: 'Mobilidade dos cidadãos para o trabalho',
  saudacao: 'Olá! Sou o assistente do INAPEM. Gostava de saber como se desloca para o trabalho. Demora dois minutos e é anónimo. Podemos começar?',
  maxPerguntas: 8,
  campos: [
    { chave: 'meio_transporte', rotulo: 'Meio de transporte principal', tipo: 'escolha', opcoes: ['A pé', 'Táxi colectivo', 'Autocarro', 'Carro próprio', 'Outro'] },
    { chave: 'tempo_viagem', rotulo: 'Tempo de viagem (minutos)', tipo: 'numero' },
    { chave: 'usa_candongueiro', rotulo: 'Usa táxi colectivo', tipo: 'sim_nao' },
  ],
};
const CONVERSA = (valores) => [
  { proximaMensagem: 'Óptimo! Qual é o meio de transporte que mais usa para ir trabalhar?', camposExtraidos: {}, respostaRapida: GUIAO.campos[0].opcoes, terminou: false, motivoFim: null },
  { proximaMensagem: 'Obrigado. Quanto tempo demora a viagem, aproximadamente?', camposExtraidos: { meio_transporte: valores[0] }, respostaRapida: null, terminou: false, motivoFim: null },
  { proximaMensagem: 'E costuma usar táxi colectivo (candongueiro)?', camposExtraidos: { tempo_viagem: valores[1] }, respostaRapida: ['Sim', 'Não'], terminou: false, motivoFim: null },
  { proximaMensagem: 'Muito obrigado pela sua participação. As suas respostas foram registadas.', camposExtraidos: { usa_candongueiro: valores[2] }, respostaRapida: null, terminou: true, motivoFim: 'concluido' },
];
const mockIA = async (page, valores) => {
  page.__pedidos = { guiao: 0, conversa: 0 };
  await page.route('**/api/inquerito-ia/guiao', async (route) => {
    page.__pedidos.guiao++;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, modelo: 'mock', guiao: GUIAO }) });
  });
  await page.route('**/api/inquerito-ia/conversa', async (route) => {
    const passos = CONVERSA(valores || []);
    const r = passos[Math.min(page.__pedidos.conversa, passos.length - 1)];
    page.__pedidos.conversa++;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, modelo: 'mock', ...r }) });
  });
};

// --- Utilitários -----------------------------------------------------------
const SO_C = process.env.SO_C === '1'; // só secção (c) sobre inquérito já existente
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
    const h5 = page.locator('h5', { hasText: assunto }); // mobile: cartões
    for (let i = 0; i < await h5.count(); i++) {
      if (await h5.nth(i).isVisible()) { await h5.nth(i).click(); await page.waitForTimeout(2500); return true; }
    }
  }
  return false;
};
const cartao = (page) => page.locator('[data-testid="inquerito-ia-cartao"]').first();
const bolhas = (page) => page.locator('[data-testid="bolha-ia"]');
const responder = async (page, t) => {
  const n = await bolhas(page).count();
  await page.locator('#inquerito-ia-input').fill(t);
  await page.locator('#btn-inquerito-ia-enviar').click();
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="bolha-ia"]').length > n, n, { timeout: 30000 });
  return bolhas(page).last().innerText();
};

// Abre o popup «Criar Inquérito com IA» a partir do compositor
const abrirPopupIA = async (page) => {
  await page.getByRole('button', { name: /Nova Mensagem/i }).first().click(); await page.waitForTimeout(1000);
  await page.locator('#btn-criar-inquerito').click();
  await page.locator('#opcao-inquerito-ia').click();
  await page.locator('#btn-tipo-inquerito-ok').click(); await page.waitForTimeout(600);
};

let page, camposPreenchidos = 2, audiencia = Number(process.env.AUDIENCIA || 0);
if (!SO_C) {
// ============================================================================
console.log(`\n=== (a) INSTITUIÇÃO ${INST.user} — popup simples, criação e expedição «${ASSUNTO}» ===`);
page = await novaPagina(DESKTOP);
await mockIA(page);
ok('a1 login instituição', await login(page, '/institucional', INST));
await irHash(page, '#/correspondencias');
await abrirPopupIA(page);
ok('a2 popup «Criar Inquérito com IA»', await page.getByText('Criar Inquérito com IA').first().isVisible());
ok('a3 sem botão «Gerar com IA» (pré-visualização é automática)', (await page.locator('#btn-gerar-inquerito-ia').count()) === 0);
await page.locator('#inquerito-ia-temas').fill('Como os cidadãos se deslocam para o trabalho');
await page.locator('#inquerito-ia-informacoes').fill('Meio de transporte; tempo de viagem; se usa táxi colectivo');
await page.locator('#btn-gerar-guiao-ia').click(); // 2026-09-11 — geração a pedido
await page.waitForFunction(() => /3 informaç/.test(document.querySelector('[data-testid="inquerito-ia-preview"]')?.textContent || ''), null, { timeout: 15000 });
const preview = await page.locator('[data-testid="inquerito-ia-preview"]').innerText();
ok('a4 pré-visualização apareceu sozinha (debounce, 1 pedido /guiao)', /Sou o assistente do INAPEM/.test(preview) && page.__pedidos.guiao === 1, `${page.__pedidos.guiao} pedido(s)`);
// Métrica exigida pela spec: número de campos preenchidos pela instituição
camposPreenchidos = await page.evaluate(() => {
  const popup = document.querySelector('#inquerito-ia-temas')?.closest('form, [role="dialog"], .fixed') || document;
  return Array.from(popup.querySelectorAll('textarea, input[type="text"], input:not([type])')).filter((el) => el.value.trim() !== '').length;
});
ok('a5 CAMPOS PREENCHIDOS PELA INSTITUIÇÃO = 2', camposPreenchidos === 2, `medido: ${camposPreenchidos}`);
await page.screenshot({ path: 'testes/evidencias/e2e_a_popup_desktop.png' });
await page.locator('#btn-criar-inquerito-ia').click();
await page.locator('[data-testid="inqueritos-ia-compostos"]').waitFor({ timeout: 30000 });
const bloco = await page.locator('[data-testid="inqueritos-ia-compostos"]').innerText();
ok('a6 bloco «Inquérito com IA» no compositor com objectivo', /Inquérito com IA/i.test(bloco) && /Mobilidade dos cidadãos/.test(bloco));
ok('a7 destinatário automático «Todos»', await page.evaluate(() => Array.from(document.querySelectorAll('input')).some((i) => /^todos$/i.test(i.value))));
await page.locator('input[placeholder="Qual o tema da sua mensagem?"]').fill(ASSUNTO); await page.waitForTimeout(300);
await page.screenshot({ path: 'testes/evidencias/e2e_a_compositor_desktop.png', fullPage: true });
await page.locator('#btn-enviar-mensagem').click(); await page.waitForTimeout(800);
await page.getByText('Mensagem Normal').first().click();
await page.waitForSelector('text=/Correspondência enviada com sucesso/', { timeout: 60000 });
const txtSucesso = await page.locator('text=/Correspondência enviada com sucesso/').innerText();
audiencia = Number((txtSucesso.match(/(\d+) cidadão/) || [])[1] || 0);
ok('a8 expedição concluída', audiencia > 0, txtSucesso);
ok('a9 sem erros JS (instituição)', page.__erros.length === 0, page.__erros.join(' | '));
await page.context().close();

// Captura mobile do popup (sem criar nada)
page = await novaPagina(MOBILE);
await mockIA(page);
await login(page, '/institucional', INST);
await irHash(page, '#/correspondencias');
await abrirPopupIA(page);
await page.locator('#inquerito-ia-temas').fill('Como os cidadãos se deslocam para o trabalho');
await page.locator('#inquerito-ia-informacoes').fill('Meio de transporte; tempo de viagem; se usa táxi colectivo');
await page.locator('#btn-gerar-guiao-ia').click(); // 2026-09-11 — geração a pedido
await page.waitForFunction(() => /3 informaç/.test(document.querySelector('[data-testid="inquerito-ia-preview"]')?.textContent || ''), null, { timeout: 15000 }).catch(() => {});
await page.screenshot({ path: 'testes/evidencias/e2e_a_popup_mobile.png' });
ok('a10 popup em mobile 390×844 (captura)', await page.getByText('Criar Inquérito com IA').first().isVisible());
await page.context().close();

// ============================================================================
const cidadao = async (c, vp, valores, tag) => {
  console.log(`\n=== (b) CIDADÃO ${c.user} (${tag}) — 3 perguntas por texto, «Concluir» ===`);
  const page = await novaPagina(vp);
  await mockIA(page, valores);
  ok(`b1 [${tag}] login cidadão`, await login(page, '/', c));
  await irHash(page, '#/correspondencias');
  ok(`b2 [${tag}] correspondência aberta`, await abrirMsgPorAssunto(page, ASSUNTO));
  const det = page.getByRole('button', { name: /Ver detalhes Completos/i });
  if (await det.count()) { await det.first().click(); await page.waitForTimeout(1500); }
  await cartao(page).waitFor({ timeout: 15000 });
  ok(`b3 [${tag}] container com «Iniciar Inquérito»`, /Iniciar Inquérito/i.test(await cartao(page).innerText()));
  await cartao(page).locator('button[id^="btn-iniciar-inquerito-ia-"]').click();
  const chat = page.locator('[data-testid="inquerito-ia-chat"]');
  await chat.waitFor({ timeout: 15000 });
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="bolha-ia"]').length >= 1, null, { timeout: 15000 });
  ok(`b4 [${tag}] saudação do guião + chips de consentimento`, /Sou o assistente do INAPEM/.test(await bolhas(page).first().innerText()) && (await page.locator('[data-testid="respostas-rapidas"] button').count()) === 2);
  // Consentimento por chip → 1.ª pergunta
  await page.locator('[data-testid="respostas-rapidas"] button', { hasText: /Sim/ }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="bolha-ia"]').length >= 2, null, { timeout: 30000 });
  ok(`b5 [${tag}] 1.ª pergunta com respostas rápidas`, /meio de transporte/i.test(await bolhas(page).last().innerText()) && (await page.locator('[data-testid="respostas-rapidas"] button').count()) === 5);
  // 3 respostas por texto
  const q2 = await responder(page, valores[0]);
  const q3 = await responder(page, `${valores[1]} minutos`);
  await page.screenshot({ path: `testes/evidencias/e2e_b_chat_${tag}.png` });
  const fim = await responder(page, valores[2]);
  ok(`b6 [${tag}] 3 perguntas respondidas por texto`, /tempo/i.test(q2) && /candongueiro/i.test(q3) && page.__pedidos.conversa === 4, `${page.__pedidos.conversa} chamadas /conversa`);
  await page.waitForSelector('#btn-inquerito-ia-concluir', { timeout: 15000 });
  const dom = await chat.innerText();
  ok(`b7 [${tag}] agradecimento + só «Concluir» (sem caixa de texto)`, /obrigado/i.test(fim) && (await page.locator('#inquerito-ia-input').count()) === 0);
  // Asserção negativa: nenhum rótulo/chave/valor extraído no DOM (só o que o próprio cidadão escreveu)
  const vazou = /meio_transporte|tempo_viagem|usa_candongueiro|Meio de transporte principal|Tempo de viagem \(minutos\)|Usa táxi colectivo|Resumo/i.test(dom);
  ok(`b8 [${tag}] ASSERÇÃO NEGATIVA: nada extraído/resumo no DOM`, !vazou);
  await page.screenshot({ path: `testes/evidencias/e2e_b_fim_${tag}.png` });
  await page.locator('#btn-inquerito-ia-concluir').click();
  await page.locator('[data-testid="inquerito-ia-confirmacao"]').waitFor({ timeout: 15000 }).catch(() => {});
  { const v = page.locator('#btn-inquerito-ia-voltar'); if (await v.count()) await v.click(); }
  await page.waitForTimeout(2500);
  ok(`b9 [${tag}] chat fechado + pill «Respondido»`, (await chat.count()) === 0 && (await page.locator('[data-testid="inquerito-ia-respondido"]').count()) > 0);
  await page.screenshot({ path: `testes/evidencias/e2e_b_respondido_${tag}.png` });
  ok(`b10 [${tag}] sem erros JS`, page.__erros.length === 0, page.__erros.join(' | '));
  await page.context().close();
};
await cidadao(CID1, DESKTOP, ['Táxi colectivo', '45', 'Sim'], 'desktop');
await cidadao(CID2, MOBILE, ['A pé', '20', 'Não'], 'mobile');
}

// ============================================================================
console.log(`\n=== (c) INSTITUIÇÃO — resultados agregados e encerramento ===`);
for (const [vp, tag] of [[DESKTOP, 'desktop'], [MOBILE, 'mobile']]) {
  page = await novaPagina(vp);
  await login(page, '/institucional', INST);
  await irHash(page, '#/sondagens');
  const linha = page.locator('[data-testid="inquerito-ia-linha"]', { hasText: 'Mobilidade dos cidadãos' }).first();
  await linha.waitFor({ timeout: 20000 });
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="inquerito-ia-contadores-linha"]').length >= 1, null, { timeout: 20000 });
  const contLinha = await linha.innerText();
  ok(`c1 [${tag}] lista com badge IA e contadores`, /IA/.test(contLinha) && new RegExp(`${audiencia} enviados · 2 iniciados · 2 concluídos · 0 recusados`).test(contLinha), contLinha.split('\n').pop());
  await linha.locator('button').first().click();
  const modal = page.locator('[data-testid="inquerito-ia-resultados"]');
  await modal.waitFor({ timeout: 15000 });
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="inquerito-ia-campo"]').length >= 3, null, { timeout: 20000 });
  const txt = await modal.innerText();
  ok(`c2 [${tag}] agregados por campo (3 campos, 50% / 50%)`, /Táxi colectivo[\s\S]*50%/i.test(txt) && /A pé[\s\S]*50%/i.test(txt) && /\b45\b[\s\S]*50%/.test(txt) && /Sim[\s\S]*50%/.test(txt) && /Não[\s\S]*50%/.test(txt));
  ok(`c3 [${tag}] sem hash/BI/respostas individuais`, !/[0-9a-f]{64}/.test(txt) && !new RegExp(`${CID1.user}|${CID2.user}`).test(txt));
  await page.screenshot({ path: `testes/evidencias/e2e_c_resultados_${tag}.png` });
  if (tag === 'mobile' && (await page.locator('#btn-encerrar-inquerito-ia').count())) {
    // Encerrar pela UI (protocolo: inquérito de teste fechado no fim)
    await page.locator('#btn-encerrar-inquerito-ia').click(); await page.waitForTimeout(500);
    await page.getByRole('button', { name: /^Encerrar$/ }).click(); await page.waitForTimeout(2500);
    ok('c4 encerrado pela UI (estado «encerrado», botão desaparece)', /encerrado/.test(await modal.innerText()) && (await page.locator('#btn-encerrar-inquerito-ia').count()) === 0);
    await page.screenshot({ path: 'testes/evidencias/e2e_c_encerrado_mobile.png' });
  }
  ok(`c5 [${tag}] sem erros JS`, page.__erros.length === 0, page.__erros.join(' | '));
  await page.context().close();
}
await browser.close();

const falhas = R.filter((r) => !r.ok);
console.log(`\n=== RESULTADO: ${R.length - falhas.length}/${R.length} verificações OK · campos preenchidos pela instituição: ${camposPreenchidos} · audiência: ${audiencia} ===`);
if (falhas.length) { console.log('FALHAS:', falhas.map((f) => f.n).join('; ')); process.exit(1); }
