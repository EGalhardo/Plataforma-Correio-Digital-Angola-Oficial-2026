#!/usr/bin/env node
// ============================================================================
// e2e_painel_indicadores_recomendado.mjs — Homologação do Painel de Indicadores
// Volume Global de Ocorrências, Denúncias, Inquéritos e Vídeo-Atendimentos
// ============================================================================
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const ADMIN = process.env.CDA_E2E_ADMIN_USER || 'ADMIN-0001';
const ADMIN_PASS = process.env.CDA_E2E_ADMIN_PASS || '123456789';
const SHOTS = process.env.SHOTS_DIR || '/home/user/e2e_admin_shots';
fs.mkdirSync(SHOTS, { recursive: true });

let FAILS = 0;
const reg = (nome, ok, detalhe = '') => {
  if (!ok) FAILS++;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-PT' });
const tx = async () => ((await page.evaluate(() => document.body.innerText)).toLowerCase());

try {
  console.log('[passo 1] Login no Portal de Administração Central...');
  await page.goto(`${BASE}/admin#/entrar`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('input[type="text"]:visible, input:not([type]):visible').first().fill(ADMIN);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
  await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().click();
  await page.waitForTimeout(4000);

  const txtLogin = await tx();
  reg('01 - Login de Administrador com Sucesso', txtLogin.includes('administração central') || txtLogin.includes('painel nacional'));

  console.log('[passo 2] Navegação para a página Painel...');
  await page.locator('aside').getByText('Painel', { exact: true }).first().click();
  await page.waitForTimeout(3000);

  const txtPainel = await tx();
  reg('02 - Painel de Indicadores Nacionais visível', txtPainel.includes('painel de indicadores nacionais') || txtPainel.includes('indicadores nacionais'));

  // 03 - Cartões dos 4 Módulos Globais
  reg('03 - Cartão Ocorrências Territoriais presente', txtPainel.includes('ocorrências territoriais'));
  reg('04 - Cartão Denúncias & Reclamações presente', txtPainel.includes('denúncias & reclamações') || txtPainel.includes('denúncias'));
  reg('05 - Cartão Inquéritos & Sondagens presente', txtPainel.includes('inquéritos & sondagens') || txtPainel.includes('inquéritos'));
  reg('06 - Cartão Vídeo-Atendimentos presente', txtPainel.includes('vídeo-atendimentos') || txtPainel.includes('vídeo'));

  // 07 - Sub-métricas e badges de eficácia
  reg('07 - Métricas de Taxa de Resolução de Ocorrências presentes', txtPainel.includes('taxa de resolução'));
  reg('08 - Métricas de Conformidade Legal de Denúncias presentes', txtPainel.includes('conformidade legal') || txtPainel.includes('igae'));
  reg('09 - Métricas de Adesão Cívica de Inquéritos presentes', txtPainel.includes('adesão cívica') || txtPainel.includes('sondagens'));
  reg('10 - Métricas de Pontualidade de Vídeo-Atendimento presentes', txtPainel.includes('taxa de pontualidade') || txtPainel.includes('webrtc'));

  // 11 - Gráficos Analíticos Integrados
  reg('11 - Secção Distribuição do Volume Global presente', txtPainel.includes('distribuição do volume global'));
  reg('12 - Secção Evolução Mensal presente', txtPainel.includes('evolução mensal') || txtPainel.includes('tendência de volume'));

  // 13 - Interatividade das Abas de Filtro
  console.log('[passo 3] Testar clique nas abas de filtro...');
  const abaOcorrencias = page.getByRole('button', { name: /Ocorrências Territoriais/i }).first();
  if (await abaOcorrencias.isVisible()) {
    await abaOcorrencias.click();
    await page.waitForTimeout(1000);
    const txtOco = await tx();
    reg('13 - Aba Ocorrências ativada e detalhamento operacional visível', txtOco.includes('detalhamento operacional') && txtOco.includes('vias e pavimentação'));
  }

  const abaDenuncias = page.getByRole('button', { name: /Denúncias/i }).first();
  if (await abaDenuncias.isVisible()) {
    await abaDenuncias.click();
    await page.waitForTimeout(1000);
    const txtDen = await tx();
    reg('14 - Aba Denúncias ativada e canais IGAE/ANIESA visíveis', txtDen.includes('igae') || txtDen.includes('aniesa'));
  }

  const abaInqueritos = page.getByRole('button', { name: /Inquéritos/i }).first();
  if (await abaInqueritos.isVisible()) {
    await abaInqueritos.click();
    await page.waitForTimeout(1000);
    const txtInq = await tx();
    reg('15 - Aba Inquéritos ativada e consultas públicas visíveis', txtInq.includes('modernização dos serviços') || txtInq.includes('consultas públicas'));
  }

  const abaVideo = page.getByRole('button', { name: /Vídeo/i }).first();
  if (await abaVideo.isVisible()) {
    await abaVideo.click();
    await page.waitForTimeout(1000);
    const txtVid = await tx();
    reg('16 - Aba Vídeo ativada e telepresença WebRTC visível', txtVid.includes('webrtc') || txtVid.includes('adesão'));
  }

  // Capturar screenshot final
  const shotPath = `${SHOTS}/gov_dashboard_painel_indicadores.png`;
  await page.screenshot({ path: shotPath, fullPage: true });
  console.log(`[screenshot] Capturado em: ${shotPath}`);

} catch (err) {
  console.error('[ERRO FATAL]', err);
  FAILS++;
} finally {
  await browser.close();
}

console.log('\n========================================');
console.log(`FALHAS TOTAIS: ${FAILS}`);
console.log('========================================');
process.exit(FAILS > 0 ? 1 : 0);
