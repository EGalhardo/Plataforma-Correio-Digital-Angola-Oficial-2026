// Teste E2E — Ocorrências: localização automática (GPS) — contas REAIS
//  1. Cidadao Edlasio Galhardo (002399714LA030) cria ocorrencia com GPS
//     (posicao do dispositivo SIMULADA pelo Playwright: centro de Luanda)
//     e destina-a a INAPEM-LLMM.
//  2. Instituicao INAPEM-LLMM-01 verifica a ocorrencia e o mapa.
// NOTA: o sandbox nao tem GPS fisico — o contexto Playwright define a
// geolocalizacao do dispositivo; o fluxo e identico ao de um telemovel
// (diálogo nativo -> coordenadas -> localidade derivada -> envio).
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf-8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const BASE = process.env.BASE || 'http://localhost:3000';
const SUPA = env.SUPABASE_URL;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const SHOT = '/home/user/cda_test/test_ocorrencia_gps';

const LAT = -8.8306; // centro de Luanda (Coreia) — posição do dispositivo
const LON = 13.2225;
const MARC = 'E2E-GPS-1609B';
const LAT5 = LAT.toFixed(5);
const LON5 = LON.toFixed(5);

let FAILS = 0;
const reg = (n, ok, x = '') => {
  console.log(`${ok ? '[PASS]' : '[FALHOU]'} ${n}${x ? ' — ' + x : ''}`);
  if (!ok) FAILS++;
};

const browser = await chromium.launch({ args: ['--no-sandbox'] });

// =================== PARTE 1 — CIDADÃO EDLASIO ===================
let protocolo = '';
{
  const ctx = await browser.newContext({
    viewport: { width: 1380, height: 960 },
    deviceScaleFactor: 1.5,
    locale: 'pt-PT',
    geolocation: { latitude: LAT, longitude: LON, accuracy: 15 },
    permissions: ['geolocation'],
  });
  const page = await ctx.newPage();
  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push(e.message));

  // --- Login real ---
  await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 40000 });
  await page.locator('input[type="text"], input:not([type])').first().fill('002399714LA030');
  await page.locator('input[type="password"]').first().fill('123456789');
  await page.locator('button', { hasText: /ENTRAR/i }).first().click();
  await page.getByRole('button', { name: 'Painel', exact: true }).first().waitFor({ state: 'visible', timeout: 45000 });
  reg('C1  Login real — Edlasio Galhardo (002399714LA030)', true);

  // --- Página Ocorrências ---
  await page.getByRole('button', { name: 'Ocorrências Locais' }).first().click();
  await page.waitForTimeout(3000);
  const corpoOco = await page.evaluate(() => document.body.innerText);
  reg(
    'C2  Página Ocorrências com sessão REAL (sem bloqueio "sessão na nuvem")',
    !/Inicie sessão na nuvem/.test(corpoOco),
  );
  await page.screenshot({ path: `${SHOT}/01-cidadao-pagina.png`, fullPage: true });

  // --- Abrir formulário ---
  const btnReg = page.getByRole('button', { name: 'Registar ocorrência' }).first();
  if (await btnReg.isVisible().catch(() => false)) {
    await btnReg.click();
    await page.waitForTimeout(800);
  }
  await page.getByLabel('Categoria *').waitFor({ state: 'visible', timeout: 15000 });
  reg('C3  Formulário "Registar ocorrência" aberto', true);

  // --- Preencher dados ---
  await page.getByLabel('Categoria *').selectOption('Iluminação pública');
  await page.getByLabel('Título *').fill(`Poste avariado junto ao bairro Coreia — ${MARC}`);
  await page.getByLabel('Descrição *').fill(
    'Ocorrência de teste E2E para validar a localização automática via GPS do dispositivo. Poste de iluminação sem funcionar há três noites, junto ao bairro Coreia, centro de Luanda.',
  );

  // --- Tab Automático (GPS) ---
  await page.getByRole('tab', { name: /Automático/ }).click();
  await page.waitForTimeout(300);
  const camposOcultos = await page.evaluate(() => {
    const rotulos = [...document.querySelectorAll('label span')].map((s) => s.textContent || '');
    return rotulos.filter((t) =>
      /Província \*|Município \*|Bairro \/ Localidade \*|Rua \/ Ponto de referência \*/.test(t),
    );
  });
  reg(
    'C4  Campos de endereço OCULTOS no modo Automático',
    camposOcultos.length === 0,
    camposOcultos.length ? `ainda visíveis: ${camposOcultos.join(', ')}` : 'nenhum visível',
  );

  // --- Obter GPS ---
  await page.getByRole('button', { name: /Obter localização \(GPS\)/ }).click();
  await page.getByText('Localização obtida', { exact: false }).first().waitFor({ timeout: 25000 });
  reg('C5  GPS obtido do dispositivo (posição simulada pelo Playwright)', true);

  await page.getByText(/Localidade:/).first().waitFor({ timeout: 25000 });
  const linhaLoc = (await page.getByText(/Localidade:/).first().textContent()) || '';
  reg('C6  Localidade derivada do GPS (Coreia · Luanda · Luanda)', /Coreia/.test(linhaLoc) && /Luanda/.test(linhaLoc), linhaLoc.trim());
  await page.screenshot({ path: `${SHOT}/02-cidadao-gps-obtida.png`, fullPage: true });

  // --- Instituição destinatária ---
  await page.getByLabel('Código institucional *').fill('INAPEM-LLMM');
  await page.getByText('Habilitada no CDA').first().waitFor({ timeout: 15000 });
  reg('C7  Instituição INAPEM-LLMM reconhecida («Habilitada no CDA»)', true);
  await page.screenshot({ path: `${SHOT}/03-cidadao-form-completo.png`, fullPage: true });

  // --- Rever ---
  await page.getByRole('button', { name: /Rever ocorrência/ }).click();
  await page.waitForTimeout(900);
  const corpoRev = await page.evaluate(() => document.body.innerText);
  reg('C8  Vista "Rever": tipo = Localização automática (GPS)', /Localização automática \(GPS\)/.test(corpoRev));
  reg('C9  Vista "Rever": coordenadas GPS exactas', corpoRev.includes(LAT5) && corpoRev.includes(LON5), `${LAT5}, ${LON5}`);
  await page.screenshot({ path: `${SHOT}/04-cidadao-rever.png`, fullPage: true });

  // --- Confirmar e enviar ---
  await page.locator('input[type="checkbox"]').first().check();
  await page.getByRole('button', { name: /Enviar ocorrência/ }).click();
  await page.getByText(/submetida\./).first().waitFor({ timeout: 40000 });
  const corpoOk = await page.evaluate(() => document.body.innerText);
  protocolo = corpoOk.match(/OC-\d{6}/)?.[0] || '';
  reg('C10  Ocorrência ENVIADA (submetida à nuvem)', true, `protocolo ${protocolo}`);
  await page.screenshot({ path: `${SHOT}/05-cidadao-sucesso.png`, fullPage: true });

  reg('C11  Sem erros JS durante o fluxo do cidadão', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
  await ctx.close();
}

// =================== VERIFICAÇÃO DIRECTA NA BASE ===================
{
  const r = await fetch(
    `${SUPA}/rest/v1/cda_ocorrencias?titulo=like.*${MARC}*&select=titulo,provincia,municipio,bairro,referencia,instituicao_codigo,criado_em`,
    { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } },
  );
  const linhas = await r.json().catch(() => []);
  const l = Array.isArray(linhas) ? linhas[0] : null;
  reg('B1  Linha criada na base Supabase (REST service_role)', !!l, l ? `id ok` : JSON.stringify(linhas).slice(0, 140));
  if (l) {
    reg('B2  Endereço derivado do GPS gravado (Coreia · Luanda · Luanda)', l.bairro === 'Coreia' && l.municipio === 'Luanda' && l.provincia === 'Luanda', `${l.bairro} · ${l.municipio} · ${l.provincia}`);
    reg('B3  Referência GPS gravada', /GPS: -8\.83060, 13\.22250/.test(l.referencia || ''), l.referencia);
    reg('B4  Instituição destinatária = INAPEM-LLMM', (l.instituicao_codigo || '') === 'INAPEM-LLMM', l.instituicao_codigo);
  }
}

// =================== PARTE 2 — INSTITUIÇÃO INAPEM ===================
{
  const ctx = await browser.newContext({
    viewport: { width: 1380, height: 960 },
    deviceScaleFactor: 1.5,
    locale: 'pt-PT',
  });
  const page = await ctx.newPage();
  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push(e.message));

  // --- Login real ---
  await page.goto(`${BASE}/institucional#/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 40000 });
  await page.locator('input[type="text"], input:not([type])').first().fill('INAPEM-LLMM-01');
  await page.locator('input[type="password"]').first().fill('123456789');
  await page.locator('button', { hasText: /ENTRAR/i }).first().click();
  await page.getByRole('button', { name: 'Painel', exact: true }).first().waitFor({ state: 'visible', timeout: 45000 });
  reg('I1  Login real — INAPEM-LLMM-01', true);

  // --- Ocorrências recebidas ---
  await page.getByRole('button', { name: 'Ocorrências recebidas' }).first().click();
  await page.waitForTimeout(3500);
  const corpoLista = await page.evaluate(() => document.body.innerText);
  reg('I2  Ocorrência visível na lista «Ocorrências recebidas»', corpoLista.includes(MARC), `protocolo ${protocolo}`);
  await page.screenshot({ path: `${SHOT}/06-instituicao-lista.png`, fullPage: true });

  // --- Abrir detalhe ---
  const linha = page.locator('tr', { hasText: MARC }).first();
  const btnVer = (await linha.getByRole('button', { name: 'Ver' }).first().isVisible().catch(() => false))
    ? linha.getByRole('button', { name: 'Ver' }).first()
    : page.getByRole('button', { name: 'Ver' }).first();
  await btnVer.click();
  await page.waitForTimeout(3000);
  const corpoDet = await page.evaluate(() => document.body.innerText);
  reg('I3  Detalhe aberto com o título do teste', corpoDet.includes(MARC));

  const temEtiquetaAuto = /Localização automática \(GPS\)/.test(corpoDet);
  const temCoord = corpoDet.includes(LAT5) && corpoDet.includes(LON5);
  reg('I4  Detalhe exibe «Localização automática (GPS)»', temEtiquetaAuto, temEtiquetaAuto ? '' : 'mostra «Localização manual» (migração 002 ainda não aplicada)');
  reg('I5  Detalhe exibe as coordenadas GPS exactas', temCoord, temCoord ? `${LAT5}, ${LON5}` : 'sem linha de coordenadas (migração 002 ainda não aplicada)');

  // --- Mapa ---
  const iframe = page.locator('iframe').first();
  const srcMapa = await iframe.getAttribute('src').catch(() => '');
  let mapaInfo = 'sem iframe';
  if (srcMapa) {
    const dec = decodeURIComponent(srcMapa);
    const u = new URL(dec);
    const params = new URLSearchParams(u.search);
    const center = params.get('mlat') || params.get('marker') || '';
    const zoom = params.get('zoom') || '';
    mapaInfo = `center=${center || '(sem pino)'} zoom=${zoom}`;
    const exato =
      dec.includes(`${LAT},${LON}`) ||
      dec.includes(`${LAT5},${LON5}`) ||
      center.startsWith(String(LAT)) ||
      center.startsWith(LAT5);
    reg('I6  Mapa centrado na posição GPS EXACTA do cidadão', exato, mapaInfo);
  } else {
    reg('I6  Mapa centrado na posição GPS EXACTA do cidadão', false, mapaInfo);
  }
  await page.screenshot({ path: `${SHOT}/07-instituicao-detalhe-mapa.png`, fullPage: true });

  reg('I7  Sem erros JS no fluxo da instituição', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
  await ctx.close();
}

await browser.close();
console.log('==============================');
console.log(`RESULTADO: ${FAILS === 0 ? 'TUDO PASSOU' : FAILS + ' FALHA(S)'} · protocolo=${protocolo}`);
process.exit(FAILS === 0 ? 0 : 1);
