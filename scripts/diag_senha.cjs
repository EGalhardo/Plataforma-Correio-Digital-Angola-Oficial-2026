/**
 * DIAGNÓSTICO — por que falha «redefinir a senha» nos dois sítios:
 *   A) popup «Configuração de Segurança» (cidadão)
 *   B) página «Redefinir Senha» (Esqueci Senha)
 *
 * node scripts/diag_senha.cjs
 * Não altera nada (usa senha actual ERRADA de propósito no teste A).
 */
const { chromium } = require('playwright');
const APP = 'https://correio-digital-angola-oficial.vercel.app';
const E = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1250 }, locale: 'pt-PT' });
  const p = await ctx.newPage();
  const rede = [];
  p.on('response', async (r) => {
    const u = r.url();
    if (/auth\/v1|api\/enviar-email|api\//.test(u)) {
      let corpo = '';
      try { corpo = (await r.text()).slice(0, 400); } catch {}
      rede.push(`${r.status()} ${r.request().method()} ${u.replace(APP, '').slice(0, 120)} :: ${corpo.replace(/\s+/g, ' ')}`);
    }
  });
  p.on('console', (m) => { const t = m.text(); if (/AUTH-CLOUD|error|Error|supabase/i.test(t)) console.log('  [console]', t.slice(0, 220)); });

  console.log('═══ A) POPUP «Configuração de Segurança» (cidadão) ═══');
  await p.goto(`${APP}/#/login`, { waitUntil: 'networkidle' }); await E(1500);
  await p.fill('input[name="cda-utilizador"]', '002399714LA030');
  await p.fill('input[name="cda-senha"]', '123456789');
  await p.click('button:has-text("ENTRAR NO PORTAL")'); await E(9000);
  // sessão de nuvem activa?
  const sess = await p.evaluate(async () => {
    const k = Object.keys(localStorage).filter((x) => /auth-token/.test(x));
    return { chaves: k, temSessao: k.length > 0 };
  });
  console.log('  localStorage auth-token:', JSON.stringify(sess));

  await p.locator('button:has-text("Perfil")').first().click().catch(() => {}); await E(4500);
  const btn = p.locator('button:has-text("Alterar Palavra-passe")').first();
  console.log('  botão "Alterar Palavra-passe" encontrado:', await btn.count());
  await btn.click(); await E(2500);
  await p.locator('[data-testid="campo-senha-actual"]').first().fill('SenhaErrada999');
  await p.locator('[data-testid="campo-senha-nova"]').first().fill('Diagnostico123');
  await p.locator('[data-testid="campo-senha-confirmar"]').first().fill('Diagnostico123');
  await p.locator('[data-testid="botao-actualizar-senha"]').first().click();
  await E(7000);
  console.log('  erro  :', (await p.locator('[data-testid="senha-erro"]').first().innerText().catch(() => '(nenhum)')).slice(0, 200));
  console.log('  sucesso:', (await p.locator('[data-testid="senha-sucesso"]').first().innerText().catch(() => '(nenhum)')).slice(0, 200));

  console.log('\n═══ B) PÁGINA «Redefinir Senha» (Esqueci Senha) ═══');
  const ctx2 = await browser.newContext({ viewport: { width: 1400, height: 1250 }, locale: 'pt-PT' });
  const p2 = await ctx2.newPage();
  p2.on('response', async (r) => {
    const u = r.url();
    if (/auth\/v1|api\//.test(u)) {
      let c = ''; try { c = (await r.text()).slice(0, 300); } catch {}
      rede.push(`[B] ${r.status()} ${r.request().method()} ${u.replace(APP, '').slice(0, 120)} :: ${c.replace(/\s+/g, ' ')}`);
    }
  });
  await p2.goto(`${APP}/#/login`, { waitUntil: 'networkidle' }); await E(1500);
  await p2.locator('button:has-text("Esqueci Senha")').first().click(); await E(2000);
  const txt = (await p2.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  console.log('  ecrã mostra "Recuperar Senha":', /Recuperar Senha/i.test(txt));
  const email = p2.locator('input[type="email"]').first();
  console.log('  campo de e-mail presente:', await email.count());
  await email.fill('bi.002399714la030@cidadao.correiodigital.ao');
  const btns = await p2.locator('button').allInnerTexts();
  console.log('  botões no ecrã:', JSON.stringify(btns.map((b) => b.replace(/\s+/g, ' ').trim()).filter(Boolean)));
  const enviar = p2.locator('button:has-text("Enviar")').first();
  console.log('  botão enviar presente:', await enviar.count());
  if (await enviar.count()) {
    await enviar.click(); await E(9000);
    const t2 = (await p2.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
    console.log('  ecrã após envio:', t2.slice(0, 500));
  }
  await p2.screenshot({ path: '/tmp/diag-reset.png' });

  console.log('\n═══ REDE ═══');
  rede.forEach((l) => console.log('  ' + l));
  await browser.close();
})().catch((e) => { console.error('FALHA:', e.message); process.exit(1); });
