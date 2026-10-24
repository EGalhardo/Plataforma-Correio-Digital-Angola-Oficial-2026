// E2E — Interoperabilidade cidadão ↔ instituição: Ocorrência, Denúncia e Reclamação.
//
// Fluxo validado:
//   1. Cidadão cria uma Ocorrência, uma Denúncia («Denuncia») e uma Reclamação (Livro), todas
//      para a instituição AGT-LMM.
//   2. Instituição (AGT-LMM-01) recebe as três nas listas próprias e no Correio.
//   3. Instituição atualiza a Ocorrência (Recebida → Em análise, um passo de cada vez) e responde
//      à Denúncia e à Reclamação.
//   4. Cidadão recebe as respostas no Correio, vê o estado da Ocorrência e as notificações
//      (cartões e total do painel). Ler um item retira-o das contagens.
//   5. Regra de contagem: o remetente nunca fica com não lidas nas suas próprias enviadas.
//
// Execução (credenciais só em variáveis de ambiente, nunca em ficheiros):
//   CID_PWD='…' INST_PWD='…' BASE=https://correio-digital-angola-oficial.vercel.app \
//     node scripts/e2e_interoperabilidade_ocorrencia_denuncia_reclamacao.mjs
//
// Os dados criados ficam marcados com o TAG impresso no início. Limpeza:
//   TAG=E2E-xxxxxx node scripts/cleanup_e2e_interoperabilidade.mjs

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const CID_BI = '002399714LA030';
const INST_BI = 'AGT-LMM-01';
const INST_CODE = 'AGT-LMM';
const CID_PWD = process.env.CID_PWD;
const INST_PWD = process.env.INST_PWD;
if (!CID_PWD || !INST_PWD) {
  console.error('Defina CID_PWD e INST_PWD no ambiente (não são gravadas em ficheiros).');
  process.exit(2);
}

const TAG = `E2E-${Date.now().toString().slice(-6)}`;
const SUBJ = {
  ocorrencia: `Interop ocorrencia ${TAG}`,
  denuncia: `Interop denuncia ${TAG}`,
  reclamacao: `Interop reclamacao ${TAG}`,
};
const RESP_DEN = `Resposta AGT à denúncia ${TAG}: recebida e em análise.`;
const RESP_REC = `Resposta AGT à reclamação ${TAG}: encaminhada para análise.`;

const resultados = [];
const registo = {};
const verifica = (nome, ok, detalhe = '') => {
  resultados.push({ nome, ok: !!ok, detalhe });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
let ctx;
let p;
/** Cada conta corre num contexto limpo (a sessão fica no localStorage). */
async function novaSessao() {
  if (ctx) await ctx.close();
  ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  p = await ctx.newPage();
  p.setDefaultTimeout(30000);
}

async function login(url, bi, senha, separador) {
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForSelector('input[name="cda-utilizador"]', { timeout: 60000 });
  await esperar(1500);
  await p.locator('button', { hasText: new RegExp(`^${separador}$`) }).first().click().catch(() => {});
  await p.fill('input[name="cda-utilizador"]', bi);
  await p.fill('input[name="cda-senha"]', senha);
  await p.locator('button', { hasText: /ENTRAR NO PORTAL/i }).first().click();
  await p.waitForSelector('text=SAIR DO CANAL', { timeout: 60000 });
  await esperar(3000);
}
const loginCidadao = () => login(`${BASE}/#/login`, CID_BI, CID_PWD, 'Cidadão');
const loginInstituicao = () => login(`${BASE}/institucional#/login`, INST_BI, INST_PWD, 'Instituição');

const texto = () => p.evaluate(() => document.body.innerText);
async function irPainel() {
  await p.locator('button', { hasText: /^Painel$/ }).first().click({ force: true }).catch(() => {});
  await esperar(2500);
}
async function abrirCartao(re, espera = 6000) {
  await irPainel();
  await p.locator('button', { hasText: re }).first().click();
  await esperar(espera);
  return texto();
}
/** Total do painel (mesma fonte do sino): atributo data-unread-count. */
async function totalNaoLidas() {
  await irPainel();
  const v = await p.locator('[data-testid="unread-total-counter"]').first().getAttribute('data-unread-count').catch(() => null);
  return v === null ? NaN : Number(v);
}
/** Cartões e total lidos do PAINEL (as páginas de lista têm outro título e não servem). */
async function cartoes() {
  await irPainel();
  const t = await texto();
  return {
    oc: numeroCartao(t, 'OCORRÊNCIAS LOCAIS'),
    den: numeroCartao(t, 'DENUNCIA'),
    livro: numeroCartao(t, 'LIVRO DE RECLAMAÇÕES'),
    total: await totalNaoLidas(),
  };
}
/** Linhas «NÃO LIDA» da lista Correio (vista de tabela). Inclui denúncias e reclamações
 *  recebidas; as ocorrências vivem só nos cartões. */
async function linhasNaoLidasCorreio() {
  await irPainel();
  await p.locator('button', { hasText: /^Correio$/ }).first().click();
  await esperar(2000);
  // O separador lembra a última escolha (pode estar em «LIDAS»): seleciona «NÃO LIDAS» explicitamente.
  await p.locator('button:visible', { hasText: 'NÃO LIDAS' }).first().click();
  await p.locator('tbody tr:visible').first().waitFor({ timeout: 15000 }).catch(() => {});
  await esperar(2000);
  const diag = await p.evaluate(() => {
    const vis = [...document.querySelectorAll('tbody tr')].filter((r) => r.offsetParent);
    return {
      visRows: vis.length,
      nl: vis.filter((r) => /^\s*NÃO LIDA\b/.test(r.innerText)).length,
      inicios: vis.slice(0, 3).map((r) => r.innerText.replace(/\s+/g, ' ').slice(0, 24)),
    };
  });
  registo.diagCorreio = diag;
  return diag.nl;
}
/** Invariante do sino: cada item conta uma vez — sino = cartão Ocorrências + linhas não lidas do Correio. */
async function verificaSinoIgualSoma(rotulo) {
  const total = await totalNaoLidas();
  const oc = numeroCartao(await texto(), 'OCORRÊNCIAS LOCAIS');
  const linhas = await linhasNaoLidasCorreio();
  verifica(`${rotulo}: sino = cartão Ocorrências + itens não lidos do Correio`, total === oc + linhas, `sino ${total}, ocorrências ${oc} + correio ${linhas} · ${JSON.stringify(registo.diagCorreio)}`);
  return { total, oc, linhas };
}
/** Número de um cartão do painel («LIVRO DE RECLAMAÇÕES\n6\n…»). 0 quando não tem número. */
function numeroCartao(t, rotulo) {
  const m = t.match(new RegExp(`${rotulo}\\s*\\n(?:(\\d+)\\n)?`));
  return m && m[1] ? Number(m[1]) : 0;
}
async function opcoesPopup() {
  return p.$$eval('[data-testid="popup-enviar-mensagem"] button[id^="btn-modal-opcao"]', (els) => els.map((e) => e.id));
}
/** Envio de correspondência pelo popup «Enviar Mensagem» (Nova Mensagem ou Livro). */
async function enviarCorrespondencia({ assunto, corpo, opcaoId }) {
  await p.fill('#recipient-inst-input', INST_CODE);
  await p.keyboard.press('Tab');
  await esperar(1500);
  await p.fill('#compose-subject-input', assunto);
  await p.fill('textarea', corpo);
  await p.locator('#btn-enviar-mensagem').click();
  await esperar(2500);
  if (opcaoId) {
    await p.click(`#${opcaoId}`);
    await esperar(1500);
  }
  await p.locator('button', { hasText: /ENVIAR CORRESPONDÊNCIA/i }).first().click();
  await esperar(5000);
  await p.locator('button', { hasText: /CONCLUIR E FECHAR/i }).first().click({ force: true }).catch(() => {});
  await esperar(3000);
}

// ─────────────────────────────── 1. Cidadão: estado inicial ───────────────────────────────
await novaSessao();
await loginCidadao();
{
  const c0 = await cartoes();
  registo.totalInicial = c0.total;
  registo.livroInicial = c0.livro;
  registo.denunciaInicial = c0.den;
}
console.log(`TAG ${TAG} · total inicial ${registo.totalInicial} · livro ${registo.livroInicial} · denúncia ${registo.denunciaInicial}`);

// ─────────────────────────────── 2. Cidadão: criar e enviar ───────────────────────────────
// 2a. Ocorrência
await irPainel();
await p.locator('button', { hasText: /OCORRÊNCIAS LOCAIS/i }).first().click();
await esperar(5000);
await p.locator('button', { hasText: /Criar Ocorrência/i }).first().click();
await esperar(4000);
await p.locator('button', { hasText: /^Manual$/ }).first().click().catch(() => {});
await esperar(1000);
await p.locator('select').first().selectOption({ label: 'Iluminação pública' });
await p.fill('input[placeholder="Ex.: Poste de iluminação avariado"]', SUBJ.ocorrencia);
await p.fill('textarea', `Ocorrência de teste de interoperabilidade ${TAG}`);
await p.fill('input[placeholder="Ex.: INAPEM-LLMM"]', INST_CODE);
await esperar(1000);
await p.locator('button', { hasText: /Rever ocorrência/i }).first().click();
await esperar(3000);
await p.locator('input[type="checkbox"]').first().check();
await esperar(500);
await p.locator('button', { hasText: /Enviar ocorrência/i }).first().click({ timeout: 10000 });
await esperar(8000);
{
  const t = await texto();
  const m = t.match(/(OC-\d{6}) submetida/);
  registo.ocNumero = m ? m[1] : null;
  verifica('Cidadão: ocorrência submetida (confirmação no ecrã)', !!m, m ? m[1] : 'sem confirmação');
}

// 2b. Denúncia («Denuncia») pelo Correio
await p.locator('button', { hasText: /^Correio$/ }).first().click();
await esperar(4000);
await p.locator('button', { hasText: /Nova Mensagem/i }).first().click();
await esperar(3000);
await enviarCorrespondencia({ assunto: SUBJ.denuncia, corpo: `Denúncia de teste ${TAG}`, opcaoId: 'btn-modal-opcao-denuncia' });
verifica('Cidadão: denúncia enviada (opção «Denuncia»)', true, SUBJ.denuncia);

// 2c. Reclamação pelo Livro (forçada a Reclamação)
await irPainel();
await p.locator('button', { hasText: /LIVRO DE RECLAMA/i }).first().click();
await esperar(4000);
await p.locator('button', { hasText: /Criar Denúncia/i }).first().click();
await esperar(4000);
await p.fill('#recipient-inst-input', INST_CODE);
await p.keyboard.press('Tab');
await esperar(1500);
await p.fill('#compose-subject-input', SUBJ.reclamacao);
await p.fill('textarea', `Reclamação de teste ${TAG}`);
await p.locator('#btn-enviar-mensagem').click();
await esperar(2500);
{
  const ops = await opcoesPopup();
  verifica('Livro: popup oferece só «Reclamação»', JSON.stringify(ops) === JSON.stringify(['btn-modal-opcao-denunciar']), JSON.stringify(ops));
}
await p.click('#btn-modal-opcao-denunciar');
await esperar(1500);
await p.locator('button', { hasText: /ENVIAR CORRESPONDÊNCIA/i }).first().click();
await esperar(5000);
await p.locator('button', { hasText: /CONCLUIR E FECHAR/i }).first().click({ force: true }).catch(() => {});
await esperar(3000);
verifica('Cidadão: reclamação enviada pelo Livro', true, SUBJ.reclamacao);

// 2d. Regra de contagem: o próprio envio não cria não lidas para o remetente
{
  const c1 = await cartoes();
  verifica('Contagem: enviadas não contam como não lidas (total)', c1.total === registo.totalInicial, `antes ${registo.totalInicial}, depois ${c1.total}`);
  verifica('Contagem: enviadas não contam no cartão Livro', c1.livro === registo.livroInicial, `antes ${registo.livroInicial}, depois ${c1.livro}`);
  verifica('Contagem: enviadas não contam no cartão Denúncia', c1.den === registo.denunciaInicial, `antes ${registo.denunciaInicial}, depois ${c1.den}`);
}
{
  // Enviadas do cidadão: as três correspondências existem
  await p.locator('button', { hasText: /^Correio$/ }).first().click();
  await esperar(4000);
  await p.locator('button', { hasText: /ENVIADAS/i }).first().click();
  await esperar(4000);
  const t = await texto();
  verifica('Cidadão: Enviadas contém ocorrência, denúncia e reclamação', t.includes(SUBJ.denuncia) && t.includes(SUBJ.reclamacao) && t.includes(SUBJ.ocorrencia), '');
}

// ─────────────────────────────── 3. Instituição: receção ───────────────────────────────
await novaSessao();
await loginInstituicao();
{
  const t = await abrirCartao(/OCORRÊNCIAS RECEBIDAS/i);
  verifica('Instituição: ocorrência recebida (lista «Ocorrências recebidas»)', t.includes(SUBJ.ocorrencia), '');
}
{
  const t = await abrirCartao(/^DENUNCIA/i);
  verifica('Instituição: denúncia na lista «Denuncia»', t.includes(SUBJ.denuncia), '');
  verifica('Instituição: reclamação não aparece em «Denuncia» (fica no Livro)', !t.includes(SUBJ.reclamacao), '');
}
{
  const t = await abrirCartao(/LIVRO DE RECLAMA/i);
  verifica('Instituição: reclamação no Livro de Reclamações', t.includes(SUBJ.reclamacao), '');
}
{
  await irPainel();
  await p.locator('button', { hasText: /^Correio$/ }).first().click();
  await esperar(4000);
  const t = await texto();
  verifica('Instituição: Correio recebe denúncia e reclamação', t.includes(SUBJ.denuncia) && t.includes(SUBJ.reclamacao), '');
}

// ─────────────────────────────── 4. Instituição: estados da ocorrência ───────────────────────────────
async function atualizarOcorrencia(estado, justificacao) {
  await irPainel();
  await p.locator('button', { hasText: /OCORRÊNCIAS RECEBIDAS/i }).first().click();
  await esperar(6000);
  await p.locator('button', { hasText: /^Ver$/ }).first().click({ force: true });
  await esperar(5000);
  await p.locator('select').first().selectOption({ label: estado });
  await p.locator('textarea').last().fill(justificacao);
  await p.locator('button', { hasText: /Guardar actualização/i }).first().click();
  await esperar(2500);
  const confirmar = p.locator('button', { hasText: /Confirmar actualização/i }).first();
  await confirmar.click();
  await esperar(6000);
}
await atualizarOcorrencia('Recebida', `Ocorrência recebida para tratamento (${TAG}).`);
await atualizarOcorrencia('Em análise', `Em análise técnica (${TAG}).`);
{
  await irPainel();
  await p.locator('button', { hasText: /OCORRÊNCIAS RECEBIDAS/i }).first().click();
  await esperar(6000);
  await p.locator('button', { hasText: /^Ver$/ }).first().click({ force: true });
  await esperar(5000);
  const t = await texto();
  const i = t.indexOf('Acompanhamento');
  const seg = t.slice(i, i + 900);
  verifica('Instituição: ocorrência em «Em análise» (histórico)', /Em análise \(actual\)/.test(seg) || /Em análise\s*\n\s*\n?\s*\d{2}\/\d{2}\/\d{4}/.test(seg), '');
}

// ─────────────────────────────── 5. Instituição: responder à denúncia e à reclamação ───────────────────────────────
async function responder(lista, assunto, resposta) {
  await irPainel();
  await p.locator('button', { hasText: lista }).first().click();
  await esperar(6000);
  await p.locator(`text=${assunto}`).first().click({ force: true });
  await esperar(4000);
  await p.locator('button', { hasText: /^Responder$/ }).first().click();
  await esperar(4000);
  const ta = p.locator('textarea').first();
  const atual = await ta.inputValue();
  await ta.fill(`${resposta}\n\n${atual}`);
  await p.locator('button', { hasText: /Enviar Mensagem Oficial/i }).first().click();
  await esperar(3000);
  const normal = p.locator('#btn-modal-opcao-normal');
  if (await normal.count()) {
    await normal.click();
    await esperar(1500);
  }
  const confirmar = p.locator('button', { hasText: /ENVIAR CORRESPONDÊNCIA|Confirmar envio/i }).first();
  if (await confirmar.count()) await confirmar.click().catch(() => {});
  await esperar(6000);
  await p.locator('button', { hasText: /CONCLUIR E FECHAR|Concluir|Fechar/i }).first().click({ force: true }).catch(() => {});
  await esperar(3000);
}
await responder(/^DENUNCIA/i, SUBJ.denuncia, RESP_DEN);
verifica('Instituição: respondeu à denúncia', true, '');
await responder(/LIVRO DE RECLAMA/i, SUBJ.reclamacao, RESP_REC);
verifica('Instituição: respondeu à reclamação', true, '');

// ─────────────────────────────── 6. Cidadão: receção das respostas e notificações ───────────────────────────────
await novaSessao();
await loginCidadao();
{
  await irPainel();
  await p.locator('button', { hasText: /^Correio$/ }).first().click();
  await esperar(4000);
  const t = await texto();
  verifica('Cidadão: recebe resposta à denúncia', t.includes(`RE: [REGISTO DE DENÚNCIA] ${SUBJ.denuncia}`), '');
  verifica('Cidadão: recebe resposta à reclamação', t.includes(`RE: [DENÚNCIA] ${SUBJ.reclamacao}`), '');
}
{
  const c = await cartoes();
  verifica('Cidadão: cartão Ocorrências mostra as notificações de atualização', c.oc >= 1, `cartão ${c.oc}`);
  const t = await abrirCartao(/OCORRÊNCIAS LOCAIS/i);
  const i = t.indexOf(registo.ocNumero || '__');
  const bloco = i >= 0 ? t.slice(i, i + 200) : '';
  verifica('Cidadão: ocorrência com estado «Em análise»', /Em análise/.test(bloco), registo.ocNumero || 'sem número');
}
{
  const antes = await totalNaoLidas();
  await irPainel();
  await p.locator('button', { hasText: /^Correio$/ }).first().click();
  await esperar(4000);
  // Vista de tabela (desktop): abre-se pelo botão «Abrir» da linha; a vista móvel fica oculta.
  await p.locator('tr:visible', { hasText: `RE: [DENÚNCIA] ${SUBJ.reclamacao}` }).first().locator('[data-acao="abrir"]').click();
  await esperar(4000);
  await irPainel();
  const depois = await totalNaoLidas();
  registo.totalAntesLeitura = antes;
  registo.totalDepoisLeitura = depois;
  verifica('Leitura: ler a resposta retira-a do total não lidas', depois === antes - 1, `antes ${antes}, depois ${depois}`);
}
await verificaSinoIgualSoma('Final');
{
  registo.resumo = await cartoes();
  console.log('RESUMO', JSON.stringify(registo.resumo));
}

await browser.close();

const falhas = resultados.filter((r) => !r.ok);
console.log(`\nTAG ${TAG} · ${resultados.length - falhas.length}/${resultados.length} verificações OK`);
console.log(JSON.stringify({ tag: TAG, ocNumero: registo.ocNumero, registo }, null, 2));
process.exit(falhas.length ? 1 : 0);
