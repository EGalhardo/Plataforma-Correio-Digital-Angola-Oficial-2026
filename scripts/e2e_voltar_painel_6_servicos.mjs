#!/usr/bin/env node
// ============================================================================
// e2e_voltar_painel_6_servicos.mjs — Validação da navegação Voltar ao Painel
// nas 6 páginas: Video-atendimento, Inquéritos, Comunicados, Ocorrências, Denúncias e Reclamações
// ============================================================================
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const USER = process.env.CDA_E2E_USER || '002399714LA030';
const PASS = process.env.CDA_E2E_PASS || '123456789';
const SHOTS = process.env.SHOTS_DIR || '/home/user/e2e_admin_shots';
fs.mkdirSync(SHOTS, { recursive: true });

let FAILS = 0;
const reg = (nome, ok, detalhe = '') => {
  if (!ok) FAILS++;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-PT' });
const tx = async () => ((await page.evaluate(() => document.body.innerText)).toLowerCase());

try {
  console.log('[passo 1] Login no Portal do Cidadão...');
  await page.goto(`${BASE}/#/entrar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2000);

  const biInput = page.locator('input[name="cda-utilizador"], input[type="text"]:visible, input:not([type]):visible').first();
  await biInput.waitFor({ state: 'visible', timeout: 15000 });
  await biInput.fill(USER);

  const passInput = page.locator('input[type="password"]:visible').first();
  await passInput.fill(PASS);

  const submitBtn = page.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first();
  await submitBtn.click();
  await sleep(4000);

  let bodyText = await tx();
  reg('01 - Login de Cidadão com Sucesso', bodyText.includes('edlásio') || bodyText.includes('instituições') || bodyText.includes('serviços'));

  const clicarAtalho = async (nome) => {
    return await page.evaluate((alvo) => {
      const botoes = Array.from(document.querySelectorAll('button'));
      const b = botoes.find(x => (x.textContent || '').trim().toLowerCase().includes(alvo.toLowerCase()));
      if (b && b.offsetParent !== null) {
        b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return true;
      }
      return false;
    }, nome);
  };

  const clicarVoltar = async () => {
    return await page.evaluate(() => {
      const b = document.querySelector('button[data-cda-voltar], button[aria-label="Voltar"], button[title="Voltar"], .cda-btn-voltar');
      if (b) {
        b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return true;
      }
      return false;
    });
  };

  // 1. Testar Vídeo-Atendimento
  console.log('[passo 2] Testar navegação e botão voltar em Vídeo-Atendimento...');
  await clicarAtalho('Vídeo-Atendimento');
  await sleep(2000);
  bodyText = await tx();
  reg('02 - Página Vídeo-Atendimento carregada', bodyText.includes('videoatendimento') || bodyText.includes('vídeo-atendimento'));

  await clicarVoltar();
  await sleep(2000);
  bodyText = await tx();
  reg('03 - Vídeo-Atendimento: Voltou ao Painel Principal', bodyText.includes('instituições') || bodyText.includes('serviços') || bodyText.includes('edlásio'));

  // 2. Testar Inquéritos
  console.log('[passo 3] Testar navegação e botão voltar em Inquéritos...');
  await clicarAtalho('Inquéritos');
  await sleep(2000);
  bodyText = await tx();
  reg('04 - Página Inquéritos carregada', bodyText.includes('inquéritos'));

  await clicarVoltar();
  await sleep(2000);
  bodyText = await tx();
  reg('05 - Inquéritos: Voltou ao Painel Principal', bodyText.includes('instituições') || bodyText.includes('serviços') || bodyText.includes('edlásio'));

  // 3. Testar Comunicados
  console.log('[passo 4] Testar navegação e botão voltar em Comunicados...');
  await clicarAtalho('Comunicados');
  await sleep(2000);
  bodyText = await tx();
  reg('06 - Página Comunicados carregada', bodyText.includes('comunicados'));

  await clicarVoltar();
  await sleep(2000);
  bodyText = await tx();
  reg('07 - Comunicados: Voltou ao Painel Principal', bodyText.includes('instituições') || bodyText.includes('serviços') || bodyText.includes('edlásio'));

  // 4. Testar Ocorrências
  console.log('[passo 5] Testar navegação e botão voltar em Ocorrências...');
  await clicarAtalho('Ocorrências');
  await sleep(2000);
  bodyText = await tx();
  reg('08 - Página Ocorrências carregada', bodyText.includes('ocorrências'));

  await clicarVoltar();
  await sleep(2000);
  bodyText = await tx();
  reg('09 - Ocorrências: Voltou ao Painel Principal', bodyText.includes('instituições') || bodyText.includes('serviços') || bodyText.includes('edlásio'));

  // 5. Testar Denúncia
  console.log('[passo 6] Testar navegação e botão voltar em Denúncia...');
  await clicarAtalho('Denuncia');
  await sleep(2000);
  bodyText = await tx();
  reg('10 - Página Denúncia carregada', bodyText.includes('denuncia') || bodyText.includes('denúncia'));

  await clicarVoltar();
  await sleep(2000);
  bodyText = await tx();
  reg('11 - Denúncia: Voltou ao Painel Principal', bodyText.includes('instituições') || bodyText.includes('serviços') || bodyText.includes('edlásio'));

  // 6. Testar Livro de Reclamações
  console.log('[passo 7] Testar navegação e botão voltar em Livro de Reclamações...');
  await clicarAtalho('Livro de Reclamações');
  await sleep(2000);
  bodyText = await tx();
  reg('12 - Página Livro de Reclamações carregada', bodyText.includes('reclamações') || bodyText.includes('aniesa'));

  await clicarVoltar();
  await sleep(2000);
  bodyText = await tx();
  reg('13 - Livro de Reclamações: Voltou ao Painel Principal', bodyText.includes('instituições') || bodyText.includes('serviços') || bodyText.includes('edlásio'));

  // Screenshot final
  const shotPath = `${SHOTS}/voltar_painel_6_servicos.png`;
  await page.screenshot({ path: shotPath, fullPage: false });
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
