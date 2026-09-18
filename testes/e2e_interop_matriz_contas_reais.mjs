// ============================================================================
// e2e_interop_matriz_contas_reais.mjs — MATRIZ DE INTEROPERABILIDADE
// entre as contas REAIS da plataforma (base de dados Supabase real).
//
//   F1  Cidadão Edlasio (002399714LA030)  → Instituição SME-CCCC      (mensagem normal)
//   F2  Cidadão Mario   (005404692BO043)  → Instituição MINFIN-CSSS   (mensagem normal)
//   F3  Instituição INAPEM-LLMM-01        → Cidadão Edlasio           (mensagem oficial)
//   F4  Instituição INAPEM-LLMM-01        → Instituição INAPEM-LLVV   (inter-institucional)
//   F5  Instituição SME-CCCC-01 RESPONDE  → à mensagem F1 do Edlasio  (ciclo fechado)
//   F6  Verificação cruzada: cada destinatário vê o que recebeu; Edlasio vê a resposta.
//
// Uso:  node testes/e2e_interop_matriz_contas_reais.mjs
//       (dev server em http://localhost:3000; senha das contas de teste: 123456789)
// ============================================================================
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const SHOTS = process.env.SHOTS_DIR || '/home/user/evidencias_interop/matriz';
fs.mkdirSync(SHOTS, { recursive: true });
const PASS = '123456789';
// REUSAR_TS=<12 dígitos> → salta F1–F4 (já enviadas) e verifica só recepção/resposta dessa execução
const REUSAR = /^\d{12}$/.test(process.env.REUSAR_TS || '') ? process.env.REUSAR_TS : '';
const TS = REUSAR || new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);

const CID_EDLASIO = { id: '002399714LA030', url: '/#/login', nome: 'Edlasio' };
const CID_MARIO = { id: '005404692BO043', url: '/#/login', nome: 'Mario' };
const INST_INAPEM = { id: 'INAPEM-LLMM-01', cod: 'INAPEM-LLMM', url: '/institucional#/entrar' };
const INST_SME = { id: 'SME-CCCC-01', cod: 'SME-CCCC', url: '/institucional#/entrar' };
const INST_MINFIN = { id: 'MINFIN-CSSS-01', cod: 'MINFIN-CSSS', url: '/institucional#/entrar' };
const INST_LLVV = { id: 'INAPEM-LLVV-01', cod: 'INAPEM-LLVV', url: '/institucional#/entrar' };

const resultados = [];
const ok = (k, v, extra = '') => { resultados.push([k, v ? 'OK' : 'FALHOU', extra]); console.log(`  ${v ? '✓' : '✗'} ${k}${extra ? ' — ' + extra : ''}`); };
let n = 0;
const shot = async (p, nome) => { n++; const f = path.join(SHOTS, `${String(n).padStart(2, '0')}_${nome}.png`); await p.screenshot({ path: f }).catch(() => {}); };
const texto = (p) => p.evaluate(() => document.body.innerText);

async function login(browser, conta) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const p = await ctx.newPage();
  await p.goto(BASE + conta.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await p.waitForTimeout(2200);
  const u = p.locator('input[type="text"]:visible, input:not([type]):visible').first();
  await u.waitFor({ state: 'visible', timeout: 15000 });
  await u.fill(conta.id);
  await p.locator('input[type="password"]:visible').first().fill(PASS);
  await p.getByRole('button', { name: /ENTRAR/i }).first().click();
  await p.waitForTimeout(4500);
  const t = await texto(p);
  if (!/Olá,/.test(t)) throw new Error(`login falhou: ${conta.id}`);
  return { ctx, p };
}

async function irParaCorreio(p) {
  await p.locator('button').filter({ hasText: /^Correio$/i }).first().click();
  await p.waitForTimeout(3000);
}

/** Compõe e envia uma mensagem. tipoDest: 'cidadao' | 'instituicao' (só relevante para remetente instituição). */
async function enviarMensagem(p, { isInst, tipoDest, destinatario, titulo, corpo, etiqueta }) {
  await irParaCorreio(p);
  await p.locator('button').filter({ hasText: /Nova Mensagem/i }).first().click();
  await p.waitForTimeout(2500);
  if (isInst) {
    const alvo = tipoDest === 'cidadao' ? /^Cidadão$/i : /^Instituição$/i;
    const btnTipo = p.locator('button').filter({ hasText: alvo }).first();
    if (await btnTipo.isVisible().catch(() => false)) { await btnTipo.click(); await p.waitForTimeout(800); }
  }
  const inputId = isInst && tipoDest === 'cidadao' ? '#recipient-bi-input' : '#recipient-inst-input';
  const dest = p.locator(inputId);
  await dest.waitFor({ state: 'visible', timeout: 10000 });
  await dest.fill(destinatario);
  await p.waitForTimeout(3000); // lookup do destinatário
  const tit = p.locator('input[placeholder*="Qual o tema"], input[placeholder*="Assunto"], input[placeholder*="assunto"]').first();
  if (await tit.isVisible().catch(() => false)) await tit.fill(titulo);
  await p.locator('textarea[placeholder*="Descreva detalhadamente"]').first().fill(corpo);
  await p.waitForTimeout(600);
  await shot(p, `${etiqueta}_composta`);
  const lookupTxt = await texto(p);
  const destValidado = /registad[ao] na plataforma|entrega garantida|verificad[ao]|encontrad[ao]| — BI \d{9}[A-Z]{2}\d{3}/i.test(lookupTxt);
  // Enviar → popup de modalidade → Normal → modal de revisão → Enviar Correspondência
  await p.locator('button').filter({ hasText: /Enviar Mensagem/i }).first().click();
  await p.waitForTimeout(1800);
  const opNormal = p.locator('#btn-modal-opcao-normal');
  if (await opNormal.isVisible().catch(() => false)) { await opNormal.click(); await p.waitForTimeout(2200); }
  let btnEnv = p.locator('button').filter({ hasText: /Enviar Correspondência/i }).first();
  if (!(await btnEnv.isVisible().catch(() => false))) {
    // avisos → «Enviar mesmo assim» / 2.º clique
    const mesmoAssim = p.locator('button').filter({ hasText: /mesmo assim|Continuar|Prosseguir/i }).first();
    if (await mesmoAssim.isVisible().catch(() => false)) { await mesmoAssim.click(); await p.waitForTimeout(1500); }
    else if (/Avisos revistos/.test(await texto(p))) {
      console.log('    (avisos revistos → 2.º clique em Enviar)');
      await p.locator('button').filter({ hasText: /Enviar Mensagem/i }).first().click(); await p.waitForTimeout(2500);
      if (await opNormal.isVisible().catch(() => false)) { await opNormal.click(); await p.waitForTimeout(2200); }
    } else {
      await p.locator('button').filter({ hasText: /Enviar Mensagem/i }).first().click(); await p.waitForTimeout(1500);
      if (await opNormal.isVisible().catch(() => false)) { await opNormal.click(); await p.waitForTimeout(2200); }
    }
    btnEnv = p.locator('button').filter({ hasText: /Enviar Correspondência/i }).first();
  }
  await shot(p, `${etiqueta}_revisao`);
  await btnEnv.waitFor({ state: 'visible', timeout: 15000 });
  await btnEnv.click();
  await p.waitForTimeout(6000);
  await shot(p, `${etiqueta}_enviada`);
  const pos = await texto(p);
  const erro = /erro ao enviar|não foi possível enviar|falhou/i.test(pos);
  const sucesso = /enviada com sucesso|COMPROVATIVO ENVIADO/i.test(pos);
  // fechar o comprovativo (modal) para libertar a UI
  const fechar = p.locator('button').filter({ hasText: /CONCLUIR E FECHAR/i }).first();
  if (await fechar.isVisible().catch(() => false)) { await fechar.click(); await p.waitForTimeout(2000); }
  const fecharToast = p.locator('button[aria-label*="echar"], button:has(svg.lucide-x)').first();
  if (await fecharToast.isVisible().catch(() => false)) { await fecharToast.click().catch(() => {}); }
  // confirmação: painel «Enviadas» ou toast
  return { destValidado, enviada: sucesso && !erro };
}

/** Verifica na caixa de entrada do destinatário (NÃO LIDAS → LIDAS) se o título aparece. */
async function verificarRecebida(p, titulo, etiqueta) {
  await irParaCorreio(p);
  const chave = titulo.match(/\d{12}/)?.[0] || titulo;
  const temChave = (tx) => tx.includes(chave) && new RegExp(titulo.split(' (')[0].slice(0, 18).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(tx);
  let t = await texto(p);
  let viu = temChave(t);
  if (!viu) {
    const naoLidas = p.locator('button').filter({ hasText: /NÃO LIDAS/i }).first();
    if (await naoLidas.isVisible().catch(() => false)) { await naoLidas.click(); await p.waitForTimeout(2500); t = await texto(p); viu = temChave(t); }
  }
  if (!viu) {
    const lidas = p.locator('button').filter({ hasText: /^LIDAS/i }).first();
    if (await lidas.isVisible().catch(() => false)) { await lidas.click(); await p.waitForTimeout(2500); t = await texto(p); viu = temChave(t); }
  }
  if (!viu) {
    // pesquisa
    const busca = p.locator('input[placeholder*="Pesquisar"]').first();
    if (await busca.isVisible().catch(() => false)) { await busca.fill(chave); await p.waitForTimeout(2500); t = await texto(p); viu = temChave(t); }
  }
  await shot(p, `${etiqueta}_inbox`);
  if (!viu) fs.writeFileSync(path.join(SHOTS, `dump_${etiqueta}.txt`), t.slice(0, 8000));
  return viu;
}

/** Abre uma mensagem recebida pelo título e responde. */
async function responderMensagem(p, titulo, resposta, etiqueta) {
  // a linha da tabela contém o TS do título (o texto pode quebrar em 2 linhas)
  const chave = titulo.match(/\d{12}/)?.[0] || titulo.slice(0, 20);
  const tr = p.locator('tr').filter({ hasText: chave }).first();
  await tr.waitFor({ state: 'visible', timeout: 10000 });
  const olho = tr.locator('button').first(); // 1.º botão de AÇÕES = abrir (olho)
  await olho.click();
  await p.waitForTimeout(3500);
  await shot(p, `${etiqueta}_detalhe`);
  const btnResp = p.locator('button').filter({ hasText: /^Responder$/i }).first();
  await btnResp.waitFor({ state: 'visible', timeout: 10000 });
  await btnResp.click();
  await p.waitForTimeout(2500);
  // «Responder» abre o compositor pré-preenchido (destinatário + «RE: título»)
  const ta = p.locator('textarea[placeholder*="Descreva detalhadamente"]').first();
  await ta.waitFor({ state: 'visible', timeout: 10000 });
  const prefill = await p.locator('#recipient-bi-input, #recipient-inst-input').first().inputValue().catch(() => '');
  await ta.fill(resposta);
  await p.waitForTimeout(3000); // lookup do destinatário pré-preenchido
  await shot(p, `${etiqueta}_resposta_escrita`);
  await p.locator('button').filter({ hasText: /Enviar Mensagem/i }).first().click();
  await p.waitForTimeout(1800);
  const opNormal = p.locator('#btn-modal-opcao-normal');
  if (await opNormal.isVisible().catch(() => false)) { await opNormal.click(); await p.waitForTimeout(2200); }
  // Avisos de validação (ex.: título «RE:» curto) → «Avisos revistos — o próximo clique envia»
  let btnEnv = p.locator('button').filter({ hasText: /Enviar Correspondência/i }).first();
  if (!(await btnEnv.isVisible().catch(() => false)) && /Avisos revistos/.test(await texto(p))) {
    console.log('    (avisos revistos → 2.º clique em Enviar)');
    await p.locator('button').filter({ hasText: /Enviar Mensagem/i }).first().click();
    await p.waitForTimeout(2500);
    if (await opNormal.isVisible().catch(() => false)) { await opNormal.click(); await p.waitForTimeout(2200); }
    btnEnv = p.locator('button').filter({ hasText: /Enviar Correspondência/i }).first();
  }
  if (await btnEnv.isVisible().catch(() => false)) { await btnEnv.click(); }
  await p.waitForTimeout(6000);
  await shot(p, `${etiqueta}_respondida`);
  const t = await texto(p);
  const okResp = /enviada com sucesso|COMPROVATIVO ENVIADO/i.test(t) && !/erro ao|falhou|não foi possível/i.test(t.slice(0, 800));
  if (!okResp) fs.writeFileSync(path.join(SHOTS, `dump_${etiqueta}_resposta.txt`), t.slice(0, 6000));
  const fechar = p.locator('button').filter({ hasText: /CONCLUIR E FECHAR/i }).first();
  if (await fechar.isVisible().catch(() => false)) { await fechar.click(); await p.waitForTimeout(1500); }
  console.log(`    (destinatário pré-preenchido pelo «Responder»: ${prefill || '—'})`);
  return okResp;
}

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
const T1 = `Pedido de esclarecimento SME (interop ${TS})`;
const T2 = `Pedido de certidão MINFIN (interop ${TS})`;
const T3 = `Convocatória INAPEM ao cidadão (interop ${TS})`;
const T4 = `Articulação INAPEM LLMM→LLVV (interop ${TS})`;
const R5 = `Resposta oficial da SME ao pedido ${TS}: o seu processo foi recebido e será tratado no prazo de 5 dias úteis.`;

let s, r;
try {
  if (REUSAR) {
    console.log(`▶ F1–F4 saltadas (REUSAR_TS=${REUSAR}; envios já validados nessa execução)`);
    for (const k of ['F1 mensagem Edlasio → SME-CCCC enviada','F2 mensagem Mario → MINFIN-CSSS enviada','F3 mensagem INAPEM-LLMM → Edlasio enviada','F4 mensagem INAPEM-LLMM → INAPEM-LLVV enviada']) resultados.push([k,'OK','execução anterior']);
  } else {
  // ---------------- F1: Edlasio → SME-CCCC
  console.log('▶ F1  Cidadão Edlasio → SME-CCCC');
  s = await login(browser, CID_EDLASIO);
  r = await enviarMensagem(s.p, { isInst: false, destinatario: INST_SME.cod, titulo: T1, corpo: `Exmos. Senhores da SME (Cabinda), solicito esclarecimento sobre o processo de emissão de passaporte. Teste de interoperabilidade ${TS}.`, etiqueta: 'F1' });
  ok('F1 destinatário SME-CCCC validado no compositor', r.destValidado);
  ok('F1 mensagem Edlasio → SME-CCCC enviada', r.enviada);
  await s.ctx.close();

  // ---------------- F2: Mario → MINFIN-CSSS
  console.log('▶ F2  Cidadão Mario → MINFIN-CSSS');
  s = await login(browser, CID_MARIO);
  r = await enviarMensagem(s.p, { isInst: false, destinatario: INST_MINFIN.cod, titulo: T2, corpo: `Exmos. Senhores do MINFIN (Sumbe), solicito certidão de situação contributiva. Teste de interoperabilidade ${TS}.`, etiqueta: 'F2' });
  ok('F2 destinatário MINFIN-CSSS validado no compositor', r.destValidado);
  ok('F2 mensagem Mario → MINFIN-CSSS enviada', r.enviada);
  await s.ctx.close();

  // ---------------- F3 + F4: INAPEM-LLMM-01 → Edlasio (cidadão) e → INAPEM-LLVV (instituição)
  console.log('▶ F3  INAPEM-LLMM-01 → Cidadão Edlasio');
  s = await login(browser, INST_INAPEM);
  r = await enviarMensagem(s.p, { isInst: true, tipoDest: 'cidadao', destinatario: CID_EDLASIO.id, titulo: T3, corpo: `Prezado cidadão, convocamo-lo para sessão de esclarecimento sobre o programa de apoio ao empreendedorismo. Teste de interoperabilidade ${TS}.`, etiqueta: 'F3' });
  ok('F3 cidadão 002399714LA030 validado no compositor', r.destValidado);
  ok('F3 mensagem INAPEM-LLMM → Edlasio enviada', r.enviada);
  console.log('▶ F4  INAPEM-LLMM-01 → INAPEM-LLVV (inter-institucional)');
  r = await enviarMensagem(s.p, { isInst: true, tipoDest: 'instituicao', destinatario: INST_LLVV.cod, titulo: T4, corpo: `Colegas da Delegação de Viana, segue articulação sobre o calendário conjunto de formações. Teste de interoperabilidade ${TS}.`, etiqueta: 'F4' });
  ok('F4 instituição INAPEM-LLVV validada no compositor', r.destValidado);
  ok('F4 mensagem INAPEM-LLMM → INAPEM-LLVV enviada', r.enviada);
  await s.ctx.close();
  }

  // ---------------- F5: SME-CCCC-01 recebe F1 e RESPONDE
  console.log('▶ F5  SME-CCCC-01 recebe e responde ao Edlasio');
  s = await login(browser, INST_SME);
  let viu = await verificarRecebida(s.p, T1, 'F5_sme');
  ok('F5 SME-CCCC recebeu a mensagem do Edlasio', viu);
  if (viu) {
    const resp = await responderMensagem(s.p, T1, R5, 'F5_sme');
    ok('F5 SME-CCCC respondeu ao Edlasio', resp);
  }
  await s.ctx.close();

  // ---------------- F6: verificações cruzadas
  console.log('▶ F6  MINFIN-CSSS-01 recebe F2');
  s = await login(browser, INST_MINFIN);
  ok('F6 MINFIN-CSSS recebeu a mensagem do Mario', await verificarRecebida(s.p, T2, 'F6_minfin'));
  await s.ctx.close();

  console.log('▶ F6  INAPEM-LLVV-01 recebe F4');
  s = await login(browser, INST_LLVV);
  ok('F6 INAPEM-LLVV recebeu a mensagem inter-institucional', await verificarRecebida(s.p, T4, 'F6_llvv'));
  await s.ctx.close();

  console.log('▶ F6  Edlasio recebe F3 (INAPEM) e a resposta F5 (SME)');
  s = await login(browser, CID_EDLASIO);
  ok('F6 Edlasio recebeu a convocatória da INAPEM-LLMM', await verificarRecebida(s.p, T3, 'F6_edlasio_inapem'));
  const t = await texto(s.p);
  let viuResp = /Resposta oficial da SME|SME-CCCC|SME — Direcção Municipal de Cabinda/i.test(t) && new RegExp(TS).test(t);
  if (!viuResp) {
    // abrir a thread da mensagem original — a resposta vive na conversa
    const busca = s.p.locator('input[placeholder*="Pesquisar"]').first();
    if (await busca.isVisible().catch(() => false)) { await busca.fill('SME'); await s.p.waitForTimeout(2500); }
    const tt = await texto(s.p);
    viuResp = /SME/i.test(tt) && new RegExp(TS).test(tt);
    await shot(s.p, 'F6_edlasio_resposta_sme');
    if (!viuResp) fs.writeFileSync(path.join(SHOTS, 'dump_F6_edlasio_resposta.txt'), tt.slice(0, 8000));
  }
  ok('F6 Edlasio vê a resposta da SME-CCCC (ciclo fechado)', viuResp);
  await s.ctx.close();
} catch (e) {
  console.error('ERRO FATAL:', e.message.split('\n')[0]);
  resultados.push(['Execução', 'ERRO', e.message.split('\n')[0].slice(0, 120)]);
} finally {
  await browser.close();
}

console.log('\n================ MATRIZ DE INTEROPERABILIDADE ================');
let falhas = 0;
for (const [k, v, x] of resultados) { if (v !== 'OK') falhas++; console.log(`  ${v === 'OK' ? '✅' : '❌'} ${k}${x ? '  (' + x + ')' : ''}`); }
console.log(`\n  Total: ${resultados.length}  ·  OK: ${resultados.length - falhas}  ·  Falhas: ${falhas}`);
fs.writeFileSync(path.join(SHOTS, 'resultados.txt'), resultados.map(([k, v, x]) => `${v}\t${k}\t${x}`).join('\n'));
process.exit(falhas ? 1 : 0);
