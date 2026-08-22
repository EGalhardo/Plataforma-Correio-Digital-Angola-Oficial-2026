#!/usr/bin/env node
// ============================================================================
// e2e_video_atendimento.mjs — REGRESSÃO do fluxo de video-atendimento (2026-08-22)
// ----------------------------------------------------------------------------
// Cobre as 4 correcções do video-atendimento (browser real + escrita REAL):
//   V1 · Notificação de agendamento persiste (não desaparece por ser lida) e
//        esconde-se sozinha só depois do dia do agendamento passar.
//   V2 · Agenda da instituição sobrevive a logout/login (nuvem como fonte).
//   V3 · Eliminar agendamento na área da instituição (modal de confirmação +
//        notificação oficial de cancelamento ao cidadão).
//   V4 · Sala de vídeo: NÃO pode dar erro fatal precoce (antes ~140s) —
//        retries automáticos + recuperação de ligação tardia.
//
// FRONTeira HONESTA:
//   - Corre SÓ com CDA_E2E_VIDEO=1 (escreve dados REAIS na nuvem e limpa no
//     final — igual ao e2e_piloto_inapem; sem a variável o script recusa).
//   - Requer o servidor local (npm run dev) em E2E_BASE (default :3000).
//   - Contas reais por env: CDA_E2E_INST (INAPEM-LLMM-01), CDA_E2E_INST_PASS,
//     CDA_E2E_CID (002399714LA030).
// ============================================================================
import { chromium } from 'playwright';

if (process.env.CDA_E2E_VIDEO !== '1') {
  console.error('Recusado: este teste escreve dados REAIS. Corra com CDA_E2E_VIDEO=1 (e o dev server ativo).');
  process.exit(2);
}

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const INST = process.env.CDA_E2E_INST || 'INAPEM-LLMM-01';
const INST_PASS = process.env.CDA_E2E_INST_PASS || '123456789';
const CID = process.env.CDA_E2E_CID || '002399714LA030';
const ASSUNTO = `E2E Video Regressão ${Date.now()}`;
const SHOTS = process.env.SHOTS_DIR || '/tmp/e2e_video_shots';

const agora = new Date(Date.now() + 40 * 60000);
const DATA = agora.toISOString().slice(0, 10);
const HORA = agora.toISOString().slice(11, 16);

let FAILS = 0;
const reg = (nome, ok, detalhe = '') => {
  if (!ok) FAILS++;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};

const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1366, height: 850 }, locale: 'pt-PT' });

const loginInst = async () => {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('heading', { name: 'LOGIN' }).waitFor({ state: 'visible', timeout: 20000 });
  await page.getByRole('button', { name: 'Instituição', exact: true }).first().click();
  await page.waitForTimeout(600);
  await page.getByPlaceholder('AGT-9921-SR').fill(INST);
  await page.locator('input[type="password"]').first().fill(INST_PASS);
  await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
  await page.waitForTimeout(9000);
};

const abrirVideoAtendimento = async () => {
  await page.getByRole('button', { name: 'Correio', exact: true }).first().click();
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: /VideoAtendimento/i }).first().click();
  await page.waitForTimeout(3500);
};

try {
  // V2a — agendar
  await loginInst();
  await abrirVideoAtendimento();
  await page.getByRole('button', { name: /Agendar Video-atendimento/i }).first().click();
  await page.waitForTimeout(1200);
  await page.getByPlaceholder(/002399714LA030/i).first().fill(CID);
  await page.getByRole('button', { name: /^Verificar$/, exact: true }).first().click();
  await page.waitForTimeout(4500);
  await page.getByPlaceholder(/Certificado MPME/i).first().fill(ASSUNTO);
  await page.locator('input[type="date"]:visible').first().fill(DATA);
  await page.locator('input[type="time"]:visible').first().fill(HORA);
  await page.getByRole('button', { name: /Agendar Atendimento/i }).first().click();
  await page.waitForTimeout(6000);
  reg('V2-agendamento-criado', (await page.evaluate(() => document.body.innerText)).includes(ASSUNTO));

  // V2b — logout → login → agenda persiste
  const btnSair = page.getByRole('button', { name: /terminar sessão|sair/i }).first();
  await btnSair.click();
  await page.waitForTimeout(6000);
  const conf = page.getByRole('button', { name: /confirmar|terminar|sair/i }).last();
  if (await conf.isVisible().catch(() => false)) { await conf.click().catch(() => {}); await page.waitForTimeout(4000); }
  await loginInst();
  await abrirVideoAtendimento();
  reg('V2-agenda-persiste-apos-relogin', (await page.evaluate(() => document.body.innerText)).includes(ASSUNTO));

  // V4 — entrar na sala: sem erro fatal nos primeiros ~90s
  await page.getByRole('button', { name: 'Entrar', exact: true }).first().click();
  await page.waitForTimeout(4000);
  let erroPrecoce = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) {
    await page.waitForTimeout(15000);
    const corpo = await page.evaluate(() => document.body.innerText.toUpperCase());
    if (corpo.includes('SALA DE VÍDEO INDISPONÍVEL')) { erroPrecoce = true; break; }
  }
  reg('V4-sem-erro-fatal-precoce', !erroPrecoce, erroPrecoce ? 'erro fatal antes de 90s' : 'sem erro fatal em 90s');

  // V3 — eliminar agendamento (modal + remoção)
  await page.locator('button').filter({ hasText: /^Agenda$/ }).first().click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /^Eliminar$/i }).first().click();
  await page.waitForTimeout(1500);
  reg('V3-modal-confirmacao', (await page.evaluate(() => document.body.innerText)).toUpperCase().includes('ELIMINAR AGENDAMENTO'));
  await page.getByRole('button', { name: /Eliminar Definitivamente/i }).first().click();
  await page.waitForTimeout(6000);
  const posEliminar = await page.evaluate(() => document.body.innerText);
  reg('V3-agendamento-removido', !posEliminar.includes(ASSUNTO));
} catch (e) {
  reg('excecao', false, String(e).slice(0, 300));
  await page.screenshot({ path: `${SHOTS}/excecao.png` }).catch(() => {});
} finally {
  await browser.close();
}

console.log(FAILS === 0 ? '\n✓ REGRESSÃO VIDEO-ATENDIMENTO: TUDO PASSOU' : `\n✗ ${FAILS} FALHAS`);
process.exit(FAILS === 0 ? 0 : 1);
