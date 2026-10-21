// Voz automática + ecrã «Participação registada» (conta real, IA simulada por
// page.route; speechSynthesis e SpeechRecognition SIMULADOS no browser porque o
// headless não tem áudio nem microfone). Usa o inquérito activo mais recente.
import { chromium } from 'playwright';
import fs from 'node:fs';
const cred = fs.readFileSync('/home/user/.credenciais_cda/contas_reais.md', 'utf8');
const BI = process.env.BI || '005404692BO043';
const senha = (cred.match(new RegExp(`${BI}[^\\n]*?(\\d{9})`)) || [])[1] || '';
const ASSUNTO = process.env.ASSUNTO || '';
const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(`${c ? '✔' : '✘'} ${n}${x ? ' — ' + x : ''}`); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['microphone'] });
const page = await ctx.newPage();
const erros = []; page.on('pageerror', (e) => erros.push(String(e)));
// --- simuladores de voz (registam o que foi falado; o "microfone" devolve a resposta programada após 300 ms)
await page.addInitScript(() => {
  const w = window;
  w.__falado = []; w.__micAbriu = 0; w.__respostasMic = ['Sim, podemos', 'Vou de candongueiro', 'Uns 45 minutos', 'Sim'];
  const voz = { name: 'Google português de Portugal', lang: 'pt-PT', voiceURI: 'pt', localService: false, default: false };
  const synth = {
    speaking: false, pending: false, paused: false, onvoiceschanged: null,
    getVoices: () => [voz], cancel() { this.speaking = false; }, pause() {}, resume() {},
    speak(u) { this.speaking = true; w.__falado.push(u.text); setTimeout(() => { u.onstart && u.onstart({}); }, 10); setTimeout(() => { this.speaking = false; u.onend && u.onend({}); }, 400); },
    addEventListener() {}, removeEventListener() {},
  };
  Object.defineProperty(w, 'speechSynthesis', { value: synth, configurable: true });
  w.SpeechSynthesisUtterance = function (t) { this.text = t; this.voice = null; this.lang = ''; this.rate = 1; this.pitch = 1; this.onend = null; this.onstart = null; this.onerror = null; };
  const Rec = function () {
    this.lang = ''; this.continuous = false; this.interimResults = false;
    this.start = () => {
      w.__micAbriu++;
      const dito = w.__respostasMic.shift();
      if (!dito) { setTimeout(() => this.onend && this.onend({}), 200); return; }
      setTimeout(() => this.onresult && this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: dito }], { isFinal: false })] }), 150);
      setTimeout(() => this.onresult && this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: dito }], { isFinal: true })] }), 300);
      setTimeout(() => this.onend && this.onend({}), 600);
    };
    this.stop = () => { setTimeout(() => this.onend && this.onend({}), 50); };
    this.abort = this.stop;
  };
  // o Chromium headless expõe um webkitSpeechRecognition NATIVO (sem microfone) — substituir à força
  Object.defineProperty(w, 'webkitSpeechRecognition', { value: Rec, configurable: true, writable: true });
  Object.defineProperty(w, 'SpeechRecognition', { value: Rec, configurable: true, writable: true });
});
let turno = 0;
await page.route('**/api/inquerito-ia/conversa', async (route) => {
  turno++;
  const passos = [
    { proximaMensagem: 'Óptimo! Como costuma deslocar-se para o trabalho?', camposExtraidos: {}, respostaRapida: null, terminou: false, motivoFim: null },
    { proximaMensagem: 'E quanto tempo demora a viagem, aproximadamente?', camposExtraidos: {}, respostaRapida: null, terminou: false, motivoFim: null },
    { proximaMensagem: 'Costuma usar táxi colectivo?', camposExtraidos: {}, respostaRapida: ['Sim', 'Não'], terminou: false, motivoFim: null },
    { proximaMensagem: 'Muito obrigado pela sua participação. As suas respostas foram registadas.', camposExtraidos: {}, terminou: true, motivoFim: 'concluido', respostaRapida: null },
  ];
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, modelo: 'mock', ...passos[Math.min(turno - 1, 3)] }) });
});
// Não gravar respostas reais neste teste de UI: intercepta ESCRITAS em
// inquerito_ia_respostas (proxy /api/dados: {tabela, operacao}) — leituras passam.
const mockResposta = { id: 999999, inquerito_id: 0, cidadao_bi_hash: 'x', estado: 'em_curso', historico: [], campos: {}, n_perguntas: 0, canal_usado: null };
await page.route('**/api/dados', async (route) => {
  const body = route.request().postDataJSON?.() || {};
  if (body.tabela === 'inquerito_ia_respostas' && body.operacao && body.operacao !== 'select') {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, linhas: [mockResposta], escrito: true }) });
  }
  return route.continue();
});
await page.route(/rest\/v1\/inquerito_ia_respostas/, async (route) => {
  const m = route.request().method();
  if (m === 'GET' || m === 'HEAD') return route.continue();
  return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([mockResposta]) });
});

await page.goto('http://localhost:3000/'); await page.waitForTimeout(2500);
await page.locator('input[name="cda-utilizador"]').fill(BI);
await page.locator('input[name="cda-senha"]').fill(senha);
await page.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click(); await page.waitForTimeout(4500);
await page.evaluate(() => { window.location.hash = '#/correspondencias'; }); await page.waitForTimeout(2500);
// abre a correspondência com inquérito activo (a mais recente «Inquérito» ou ASSUNTO)
let aberta = false;
for (const sep of [/^Não lidas/i, /^Lidas/i]) {
  const b = page.getByRole('button', { name: sep }).first(); if (await b.count()) { await b.click(); await page.waitForTimeout(1200); }
  const h5 = page.locator('h5', { hasText: ASSUNTO || /inqu[ée]rito/i });
  for (let i = 0; i < await h5.count(); i++) { if (await h5.nth(i).isVisible()) { await h5.nth(i).click(); aberta = true; break; } }
  if (aberta) break;
}
ok('correspondência aberta', aberta);
await page.waitForTimeout(2500);
const det = page.getByRole('button', { name: /Ver detalhes Completos/i }); if (await det.count()) { await det.first().click(); await page.waitForTimeout(1500); }
const cartao = page.locator('[data-testid="inquerito-ia-cartao"]').first(); await cartao.waitFor({ timeout: 15000 });
const btn = cartao.locator('button[id^="btn-iniciar-inquerito-ia-"]');
if (!(await btn.count())) { console.log('cartão sem botão (já respondido/encerrado):', (await cartao.innerText()).replace(/\n/g,' | ')); await browser.close(); process.exit(1); }
await btn.click();
const chat = page.locator('[data-testid="inquerito-ia-chat"]'); await chat.waitFor({ timeout: 15000 });
await page.waitForFunction(() => document.querySelectorAll('[data-testid="bolha-ia"]').length >= 1, null, { timeout: 15000 });
await page.waitForTimeout(1500);
const estado0 = await page.evaluate(() => ({ falado: window.__falado, mic: window.__micAbriu }));
ok('voz ligada por defeito (botão «Voz» activo)', await page.locator('#btn-inquerito-ia-ler[aria-pressed="true"]').count() === 1);
ok('saudação LIDA em voz alta automaticamente', estado0.falado.length >= 1 && /INAPEM|inquérito|estudo|assistente/i.test(estado0.falado[0]), `«${(estado0.falado[0] || '').slice(0, 70)}…»`);
ok('microfone abriu sozinho após a leitura', estado0.mic >= 1, `${estado0.mic}×`);
// a conversa deve prosseguir sozinha: 4 respostas pelo "microfone"
await page.waitForSelector('#btn-inquerito-ia-concluir', { timeout: 40000 });
const fim = await page.evaluate(() => ({ falado: window.__falado, mic: window.__micAbriu }));
const bolhasCid = await page.locator('[data-testid="bolha-cidadao"]').allInnerTexts();
ok('4 respostas dadas por VOZ sem tocar no teclado', bolhasCid.length === 4 && fim.mic >= 4, bolhasCid.join(' / '));
ok('todas as perguntas foram lidas em voz alta (5 falas)', fim.falado.length === 5, `${fim.falado.length} falas`);
ok('agradecimento final lido, sem abrir microfone depois', /obrigado/i.test(fim.falado[4] || '') && fim.mic === 4);
await page.screenshot({ path: 'testes/evidencias/f3_voz_fim_mobile.png' });
// Concluir → ecrã de confirmação → Voltar à mensagem
await page.locator('#btn-inquerito-ia-concluir').click();
const conf = page.locator('[data-testid="inquerito-ia-confirmacao"]'); await conf.waitFor({ timeout: 15000 });
ok('ecrã «Participação registada» após Concluir', /Participação registada/.test(await conf.innerText()) && (await chat.count()) === 0);
await page.screenshot({ path: 'testes/evidencias/f3_confirmacao_mobile.png' });
await page.locator('#btn-inquerito-ia-voltar').click(); await page.waitForTimeout(1500);
ok('«Voltar à mensagem» fecha o popup e fica no detalhe da correspondência', (await conf.count()) === 0 && (await page.locator('[data-testid="inquerito-ia-cartao"]').count()) === 1);
await page.screenshot({ path: 'testes/evidencias/f3_apos_confirmacao_mobile.png' });
// Botão «Texto»: desligar a voz cancela TTS/mic
ok('sem erros JS', erros.length === 0, erros.join(' | '));
await browser.close();
console.log(`\n=== ${R.filter(Boolean).length}/${R.length} OK ===`); process.exit(R.every(Boolean) ? 0 : 1);
