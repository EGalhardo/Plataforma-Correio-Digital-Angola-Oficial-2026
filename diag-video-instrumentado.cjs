/**
 * Diagnóstico instrumentado da videochamada entre as duas contas reais.
 * Entra na MESMA sessão nas duas pontas, recolhe todos os registos WebRTC e
 * mede, ao fim de N segundos, se há imagem dos dois lados.
 *
 *   node diag-video-instrumentado.cjs [--sessao="teste 1234"] [--voltas=2]
 */
const { chromium } = require('playwright');

const APP = 'https://correio-digital-angola-oficial.vercel.app';
const E = (ms) => new Promise((r) => setTimeout(r, ms));
const UA_MOB = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || d;
const SESSAO = arg('sessao', 'TESTE-INTEROP-VIDEO-1794826050906');
const VOLTAS = Number(arg('voltas', 2));

async function entrarConta(browser, { base, utilizador, senha, viewport, ua, etiqueta, registos }) {
  const ctx = await browser.newContext({
    viewport, locale: 'pt-PT', permissions: ['camera', 'microphone'], ...(ua ? { userAgent: ua } : {}),
  });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    const t = m.text();
    if (/CDA-WebRTC|Supabase|realtime|ICE|ice/i.test(t)) registos.push(`[${etiqueta}] ${t.slice(0, 200)}`);
  });
  page.on('pageerror', (e) => registos.push(`[${etiqueta} ERRO] ${String(e.message).slice(0, 160)}`));
  await page.goto(`${APP}${base}/#/login`, { waitUntil: 'networkidle' });
  await E(1300);
  await page.fill('input[name="cda-utilizador"]', utilizador);
  await page.fill('input[name="cda-senha"]', senha);
  await page.click('button:has-text("ENTRAR NO PORTAL")');
  await E(5500);
  await page.locator('button:has-text("VÍDEO-ATENDIMENTO")').first().click().catch(() => {});
  await E(2600);
  return { ctx, page };
}

/** Abre o cartão da sessão e clica em ENTRAR; devolve se a sala abriu. */
async function entrarSala(page, sessao, etiqueta, registos) {
  const cartao = page.locator(`xpath=//h5[contains(.,"${sessao}")]/ancestor::div[contains(@class,"p-4")][1]`).first();
  if (await cartao.count()) { await cartao.click().catch(() => {}); await E(1200); }
  else registos.push(`[${etiqueta}] cartão da sessão não encontrado`);
  const entrar = page.locator('button:has-text("ENTRAR")').filter({ hasNotText: 'PRIVADO' }).first();
  await entrar.click({ timeout: 6000 }).catch((e) => registos.push(`[${etiqueta}] clique ENTRAR falhou: ${e.message.slice(0, 60)}`));
  await E(7000);
  const aberta = await page.locator('#webrtc-video-call-container').count();
  if (!aberta) {
    const visivel = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 160);
    registos.push(`[${etiqueta}] sala NÃO abriu. Ecrã: ${visivel}`);
  }
  return !!aberta;
}

const medir = (page) => page.evaluate(() => {
  const v = document.querySelector('[data-testid="remote-video"]');
  const box = document.querySelector('#webrtc-video-call-container');
  return {
    remotoPx: v ? [v.videoWidth, v.videoHeight] : null,
    faixas: v && v.srcObject ? v.srcObject.getTracks().map((t) => `${t.kind}:${t.readyState}`) : [],
    texto: box ? box.innerText.replace(/\s+/g, ' ').slice(0, 90) : 'sem sala',
  };
});

(async () => {
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  });
  const resultados = [];

  for (let volta = 1; volta <= VOLTAS; volta++) {
    const registos = [];
    console.log(`\n════════ VOLTA ${volta} — sessão «${SESSAO}» ════════`);
    const inst = await entrarConta(browser, {
      base: '/institucional', utilizador: 'AGT-LMM-01', senha: '123456789',
      viewport: { width: 1440, height: 900 }, etiqueta: 'INST', registos,
    });
    const abriuInst = await entrarSala(inst.page, SESSAO, 'INST', registos);
    const cid = await entrarConta(browser, {
      base: '', utilizador: '002399714LA030', senha: '123456789',
      viewport: { width: 390, height: 844 }, ua: UA_MOB, etiqueta: 'CID', registos,
    });
    const abriuCid = await entrarSala(cid.page, SESSAO, 'CID', registos);

    let estado = [await medir(inst.page), await medir(cid.page)];
    for (let i = 1; i <= 3; i++) {
      await E(7000);
      estado = [await medir(inst.page), await medir(cid.page)];
      console.log(`  t+${i * 7}s  INST ${JSON.stringify(estado[0].remotoPx)} [${estado[0].faixas}]  CID ${JSON.stringify(estado[1].remotoPx)} [${estado[1].faixas}]`);
    }

    const ok = estado[0].remotoPx?.[0] > 0 && estado[1].remotoPx?.[0] > 0;
    console.log(`  → sala aberta: INST=${abriuInst} CID=${abriuCid} | vídeo nos dois lados: ${ok ? 'SIM ✓' : 'NÃO ✗'}`);
    console.log('  textos:', estado[0].texto, '|', estado[1].texto);
    console.log('  registos relevantes:');
    [...new Set(registos)].slice(0, 22).forEach((r) => console.log('    ' + r));

    await inst.ctx.close();
    await cid.ctx.close();
    resultados.push(ok);
  }

  await browser.close();
  const sucessos = resultados.filter(Boolean).length;
  console.log(`\n──── RESUMO: ${sucessos}/${resultados.length} voltas com vídeo nos dois lados ────`);
  process.exit(sucessos === resultados.length ? 0 : 1);
})();
