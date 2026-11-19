/**
 * DIAGNÓSTICO 2 — o registo facial DESAPARECEU ou apenas DEIXOU DE BATER?
 *
 *  (a) registo facial do cidadão pela UI (câmara simulada do Chromium);
 *  (b) logins reais de instituição e administração NO MESMO domínio;
 *  (c) sobrevivência do template ao logout;
 *  (d) tentativa de login facial e resultado da comparação;
 *  (e) leitura dos registos de auditoria (gov_audit_logs) — quem apagou o quê.
 *
 *   node scripts/diag_face.cjs
 */
const { chromium } = require('playwright');

const APP = 'https://correio-digital-angola-oficial.vercel.app';
const E = (ms) => new Promise((r) => setTimeout(r, ms));

const ler = (p) => p.evaluate(() => {
  const out = [];
  for (const k of Object.keys(localStorage)) {
    if (!k.startsWith('cda_demo_face_')) continue;
    try {
      const t = JSON.parse(localStorage.getItem(k));
      out.push({ chave: k, id: t.identifier, modo: t.profileMode, capturado: t.capturedAt,
        pontos: (t.signature || []).length, nSigs: (t.signatures || []).length });
    } catch { out.push({ chave: k, erro: 'corrompido' }); }
  }
  return out;
});

const audit = (p) => p.evaluate(() => {
  try {
    const l = JSON.parse(localStorage.getItem('gov_audit_logs') || '[]');
    return l.slice(0, 12).map((x) => `${x.timestamp} · ${String(x.action).slice(0, 110)}`);
  } catch { return []; }
});

async function entrar(p, area, user, senha) {
  await p.goto(`${APP}/${area}#/login`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await E(6000);
  const campo = p.locator('input[name="cda-utilizador"]');
  if (!await campo.count()) {
    // Sem formulário: a área abriu JÁ AUTENTICADA (sessão partilhada entre
    // separadores/áreas do mesmo domínio) — registo e seguimos.
    const t = ((await p.evaluate(() => document.body.innerText)) || '').replace(/\s+/g, ' ');
    console.log('   ⚠ sem formulário — área já autenticada (sessão partilhada):', t.slice(0, 90));
    return 'ja_autenticado';
  }
  await campo.fill(user);
  await p.fill('input[name="cda-senha"]', senha);
  await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(9000);
  return !/ENTRAR NO PORTAL/i.test(((await p.evaluate(() => document.body.innerText)) || '').slice(0, 500));
}

(async () => {
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1300 },
    locale: 'pt-PT', permissions: ['camera'] });

  console.log('═══ (a) CIDADÃO — registo facial ═══');
  const pCid = await ctx.newPage();
  console.log('   login:', await entrar(pCid, '', '002399714LA030', '123456789'));
  await pCid.goto(`${APP}/#/perfil`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {}); await E(6000);
  const btn = pCid.locator('button:has-text("Registar a minha face")').first();
  await btn.click(); await E(3000);
  const capturar = pCid.locator('button:has-text("Capturar")').first();
  for (let i = 0; i < 3; i++) { await capturar.click().catch(() => {}); await E(2300); }
  await E(2500);
  const t1 = (await pCid.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  console.log('   concluído:', /registad|sucesso|guardad/i.test(t1));
  console.log('   template:', JSON.stringify(await ler(pCid)));

  console.log('\n═══ (b) OUTRAS CONTAS no mesmo domínio (sequencial) ═══');
  const pInst = await ctx.newPage();
  console.log('   login instituição:', await entrar(pInst, 'institucional/', 'AGT-LMM-01', '123456789'));
  console.log('   template visto do separador da instituição:', JSON.stringify(await ler(pInst)));
  await pInst.close();

  const pAdm = await ctx.newPage();
  await pAdm.goto('about:blank');
  console.log('   login admin:', await entrar(pAdm, 'admin/', 'ADMIN-0001', '987654321'));
  console.log('   template visto do separador do admin:', JSON.stringify(await ler(pAdm)));
  await pAdm.close();

  console.log('   → template no separador do cidadão depois dos outros logins:', JSON.stringify(await ler(pCid)));

  console.log('\n═══ (c) LOGOUT do cidadão ═══');
  await pCid.goto(`${APP}/#/perfil`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {}); await E(4000);
  const sair = pCid.locator('button:has-text("SAIR"), button:has-text("Sair do Canal")').first();
  console.log('   botão sair:', await sair.count());
  if (await sair.count()) { await sair.click(); await E(6000); }
  console.log('   template depois do logout:', JSON.stringify(await ler(pCid)));

  console.log('\n═══ (d) LOGIN FACIAL ═══');
  const pFace = await ctx.newPage();
  await pFace.goto(`${APP}/#/login`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {}); await E(5000);
  const txt = await pFace.evaluate(() => document.body.innerText);
  console.log('   botões com "Facial/Rosto":', JSON.stringify((txt.match(/[^\n]*(Facial|Rosto)[^\n]*/gi) || []).slice(0, 6).map(s => s.trim().slice(0, 70))));
  const bf = pFace.locator('button').filter({ hasText: /Facial|Rosto/i }).first();
  console.log('   botão encontrado:', await bf.count());
  if (await bf.count()) {
    await bf.click(); await E(4500);
    const lista = await pFace.locator('button').allInnerTexts();
    console.log('   botões no ecrã facial:', JSON.stringify(lista.map(b => b.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 10)));
    const val = pFace.locator('button').filter({ hasText: /Validar|Verificar|Autenticar|Capturar|Continuar/i }).first();
    if (await val.count()) {
      await val.click(); await E(10000);
      const t3 = (await pFace.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
      const m = t3.match(/.{0,100}(não reconhecid|não corresponde|não registad|registo\(s\) facial|sucesso|reconhecido).{0,240}/i);
      console.log('   resultado:', m ? m[0] : '(sem mensagem)');
    }
  }
  console.log('   template no momento da validação:', JSON.stringify(await ler(pFace)));

  console.log('\n═══ (e) AUDITORIA (gov_audit_logs) ═══');
  (await audit(pFace)).forEach((l) => console.log('   ' + l));

  await browser.close();
})().catch((e) => { console.error('FALHA:', e.message); process.exit(1); });
