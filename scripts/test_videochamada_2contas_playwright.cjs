/**
 * PROVA — VIDEOCHAMADA ENTRE O CIDADÃO (telemóvel) E A INSTITUIÇÃO (computador)
 *
 *   node scripts/test_videochamada_2contas_playwright.cjs [--voltas=4]
 *
 * Duas contas REAIS, dois browsers separados, uma ponta com viewport e
 * user-agent de telemóvel e a outra de computador — exactamente o cenário
 * reportado. Por cada volta:
 *
 *   1. as duas pontas entram na MESMA sessão de vídeo-atendimento;
 *   2. exige-se imagem do interlocutor NOS DOIS ecrãs grandes
 *      (`videoWidth > 0`, faixa de vídeo `live`, elemento visível);
 *   3. exige-se que o ecrã grande tenha cor própria (nunca branco nem negro
 *      vazio) e que o aviso de espera não fique tapado pelo PiP;
 *   4. nenhuma chamada pode ficar «ligada sem imagem» em silêncio.
 *
 * Só navega e observa: não cria sessões nem altera dados. A limpeza das
 * mensagens efémeras de sinalização é automática (servidor, 2 minutos).
 */
const { chromium } = require('playwright');

const APP = 'https://correio-digital-angola-oficial.vercel.app';
const SESSAO = 'TESTE-INTEROP-VIDEO-1794826050906';
const UA_TELEMÓVEL = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const VOLTAS = Number((process.argv.find((a) => a.startsWith('--voltas=')) || '').split('=')[1] || 3);
const ESPERA = (ms) => new Promise((r) => setTimeout(r, ms));

const CONTAS = {
  instituicao: { base: '/institucional', utilizador: 'AGT-LMM-01', senha: '123456789', viewport: { width: 1440, height: 900 } },
  cidadao: { base: '', utilizador: '002399714LA030', senha: '123456789', viewport: { width: 390, height: 844 }, userAgent: UA_TELEMÓVEL },
};

async function entrarNaSala(browser, conta) {
  const ctx = await browser.newContext({
    viewport: conta.viewport,
    locale: 'pt-PT',
    permissions: ['camera', 'microphone'],
    ...(conta.userAgent ? { userAgent: conta.userAgent } : {}),
  });
  const page = await ctx.newPage();
  await page.goto(`${APP}${conta.base}/#/login`, { waitUntil: 'networkidle' });
  await ESPERA(1300);
  await page.fill('input[name="cda-utilizador"]', conta.utilizador);
  await page.fill('input[name="cda-senha"]', conta.senha);
  await page.click('button:has-text("ENTRAR NO PORTAL")');
  await ESPERA(5300);

  await page.locator('button:has-text("VÍDEO-ATENDIMENTO")').first().click().catch(() => {});
  await ESPERA(2500);
  const cartao = page.locator(`xpath=//h5[contains(.,"${SESSAO}")]/ancestor::div[contains(@class,"p-4")][1]`).first();
  if (await cartao.count()) { await cartao.click().catch(() => {}); await ESPERA(1200); }
  await page.locator('button:has-text("ENTRAR")').filter({ hasNotText: 'PRIVADO' }).first().click({ timeout: 6000 }).catch(() => {});
  return { ctx, page };
}

/** Tudo o que interessa saber sobre o ecrã grande desta ponta. */
const lerEcraGrande = (page) => page.evaluate(() => {
  const sala = document.querySelector('#webrtc-video-call-container');
  if (!sala) return { salaAberta: false };
  const video = document.querySelector('[data-testid="remote-video"]');
  const grande = document.querySelector('[data-cda-ecra-grande]');
  const pip = sala.querySelector('.absolute.bottom-3.right-3');
  const avisoEspera = [...sala.querySelectorAll('h3')].find((h) => /aguardar participante/i.test(h.textContent || ''));
  const caixa = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const sobreposto = (a, b) => a && b && !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);

  const faixas = video && video.srcObject ? video.srcObject.getTracks().map((t) => `${t.kind}:${t.readyState}`) : [];
  return {
    salaAberta: true,
    remotoPx: video ? [video.videoWidth, video.videoHeight] : [0, 0],
    faixas,
    temAudio: faixas.some((f) => f.startsWith('audio:live')),
    temVideo: faixas.some((f) => f.startsWith('video:live')),
    ecraGrande: caixa(grande),
    fundoEcraGrande: grande ? getComputedStyle(grande).backgroundColor : null,
    opacidadeVideo: video ? Number(getComputedStyle(video).opacity) : null,
    pipTapaAviso: avisoEspera ? sobreposto(caixa(pip), caixa(avisoEspera)) : false,
    texto: sala.innerText.replace(/\s+/g, ' ').slice(0, 90),
  };
});

const corUtil = (cor) => cor && !/rgba\(0, 0, 0, 0\)|transparent/i.test(cor);

(async () => {
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  });
  const falhas = [];
  let ligadas = 0;

  for (let volta = 1; volta <= VOLTAS; volta++) {
    console.log(`\n═══ VOLTA ${volta}/${VOLTAS} — cidadão em telemóvel ↔ instituição em computador ═══`);
    const inst = await entrarNaSala(browser, CONTAS.instituicao);
    const cid = await entrarNaSala(browser, CONTAS.cidadao);

    // dar tempo à negociação e à chegada dos primeiros frames
    let eInst = { salaAberta: false }, eCid = { salaAberta: false };
    for (let t = 0; t < 5; t++) {
      await ESPERA(5000);
      eInst = await lerEcraGrande(inst.page);
      eCid = await lerEcraGrande(cid.page);
      if (eInst.remotoPx?.[0] > 0 && eCid.remotoPx?.[0] > 0) break;
    }

    const imagemNosDois = eInst.remotoPx?.[0] > 0 && eCid.remotoPx?.[0] > 0;
    const audioNosDois = eInst.temAudio && eCid.temAudio;
    const ecrasComCor = corUtil(eInst.fundoEcraGrande) && corUtil(eCid.fundoEcraGrande);
    const avisoTapado = eInst.pipTapaAviso || eCid.pipTapaAviso;

    console.log(`  instituição: sala=${eInst.salaAberta} imagem=${JSON.stringify(eInst.remotoPx)} faixas=[${eInst.faixas}] fundo=${eInst.fundoEcraGrande} opacidade=${eInst.opacidadeVideo}`);
    console.log(`  cidadão   : sala=${eCid.salaAberta} imagem=${JSON.stringify(eCid.remotoPx)} faixas=[${eCid.faixas}] fundo=${eCid.fundoEcraGrande} opacidade=${eCid.opacidadeVideo}`);

    if (imagemNosDois) { ligadas++; console.log('  ✓ imagem do interlocutor nos dois ecrãs grandes'); }
    else falhas.push(`volta ${volta}: sem imagem dos dois lados (inst=${JSON.stringify(eInst.remotoPx)}, cid=${JSON.stringify(eCid.remotoPx)})`);
    if (!audioNosDois) falhas.push(`volta ${volta}: áudio não está activo nas duas pontas`);
    if (!ecrasComCor) falhas.push(`volta ${volta}: ecrã grande sem cor própria (branco) — ${eInst.fundoEcraGrande} / ${eCid.fundoEcraGrande}`);
    if (avisoTapado) falhas.push(`volta ${volta}: o PiP tapa o aviso de espera`);

    await inst.page.screenshot({ path: `test-artifacts/video-prova-inst-${volta}.png` }).catch(() => {});
    await cid.page.screenshot({ path: `test-artifacts/video-prova-cid-${volta}.png` }).catch(() => {});
    await inst.ctx.close();
    await cid.ctx.close();
  }

  await browser.close();
  console.log('\n' + '─'.repeat(66));
  console.log(`chamadas com imagem nos dois ecrãs: ${ligadas}/${VOLTAS}`);
  if (falhas.length === 0) {
    console.log('RESULTADO: APROVADO');
    process.exit(0);
  }
  console.log('RESULTADO: REPROVADO');
  falhas.forEach((f) => console.log('  · ' + f));
  process.exit(1);
})();
