/**
 * Um dispositivo partilhado não pode guardar a correspondência do cidadão
 * anterior. Testa: entrar → ver caixa → SAIR → o que fica no localStorage.
 */
const { chromium } = require('playwright');
const fs = require('fs');

const APP = process.env.CDA_APP_URL || 'https://correio-digital-angola-oficial.vercel.app';
const base = 'https://klrclczcahfycfdxzdqs.supabase.co';
const env = fs.readFileSync(__dirname + '/../.env', 'utf8');
const anon = env.match(/VITE_SUPABASE_ANON_KEY=([^\s\n]+)/)[1];
const svc = env.match(/SUPABASE_SERVICE_ROLE_KEY=([^\s\n]+)/)[1];
const H = { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' };

const tag = Date.now().toString(36).slice(-5).toUpperCase();
const BI = `8${tag}LA1${(Date.now() % 90 + 10)}`;
const pw = 'Priv!2026' + tag;
const EMAIL = `bi.${BI.toLowerCase()}@cidadao.correiodigital.ao`;
const ASSUNTO = `CONFIDENCIAL-${tag}`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const out = {};
  let contaId = null;
  let msgId = null;
  try {
    await fetch(`${base}/rest/v1/profiles`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify([{ bi: BI, name: 'Privacidade', role: 'user' }]) });
    await fetch(`${base}/rest/v1/solicitacoes_registo`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify([{ nome: 'Privacidade', email: EMAIL, bi_numero: BI, status: 'Aprovado' }]) });
    const cu = await (await fetch(`${base}/auth/v1/admin/users`, { method: 'POST', headers: H, body: JSON.stringify({ email: EMAIL, password: pw, email_confirm: true, app_metadata: { bi: BI, role: 'cidadao' } }) })).json();
    contaId = cu.id;
    // Uma mensagem privada na caixa deste cidadão.
    const msg = await (await fetch(`${base}/rest/v1/messages`, {
      method: 'POST', headers: { ...H, Prefer: 'return=representation' },
      // A tabela messages exige org/preview/state_indicator (NOT NULL).
      body: JSON.stringify([{
        sender_bi: 'AGT-LMM', recipient_bi: BI, org: 'AGT-LMM',
        preview: ASSUNTO, subject: ASSUNTO, body: 'dados privados do cidadão',
        protocol_number: `PRIV-${tag}`, status: 'Enviada', state_indicator: 'Recebida', unread: true,
      }]),
    })).json().catch(() => []);
    msgId = Array.isArray(msg) ? msg[0]?.id : null;

    await page.goto(APP, { waitUntil: 'networkidle', timeout: 60000 });
    await page.locator('input[name="cda-utilizador"]').fill(BI);
    await page.locator('input[name="cda-senha"]').fill(pw);
    await page.getByRole('button', { name: /Entrar no Portal/i }).first().click({ timeout: 15000 });
    await page.waitForTimeout(9000);

    const corpo = await page.locator('body').innerText().catch(() => '');
    out.viu_mensagem = corpo.includes(ASSUNTO);
    if (!out.viu_mensagem) {
      for (let i = 0; i < 10 && !out.viu_mensagem; i++) {
        await page.waitForTimeout(2000);
        out.viu_mensagem = (await page.locator('body').innerText().catch(() => '')).includes(ASSUNTO);
      }
    }
    const chaves = await page.evaluate(() => Object.keys(localStorage));
    out.chaves_com_dados_em_sessao = chaves.filter((k) => /inbox|sent|messages|correspond/i.test(k));

    // Terminar sessão como um utilizador real.
    // Botão real da barra lateral: «Sair do Canal» (minúsculas no DOM).
    const sair = page.getByRole('button', { name: /Sair do Canal/i }).first();
    out.tem_botao_sair = await sair.isVisible().catch(() => false);
    if (out.tem_botao_sair) await sair.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(8000);

    const depois = await page.evaluate(() => {
      const out = {};
      for (const k of Object.keys(localStorage)) {
        if (/inbox|sent|messages|correspond/i.test(k)) out[k] = String(localStorage.getItem(k) || '').slice(0, 400);
      }
      return out;
    });
    out.chaves_com_dados_apos_sair = Object.keys(depois);
    out.assunto_ainda_no_armazenamento = Object.values(depois).some((v) => v.includes(ASSUNTO));
    out.ecra_apos_sair = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 120);

    out.aprovado = out.viu_mensagem === true && out.assunto_ainda_no_armazenamento === false;
    console.log(JSON.stringify(out, null, 1));
    if (!out.aprovado) process.exitCode = 1;
  } finally {
    if (msgId) {
      await fetch(`${base}/rest/v1/message_state_history?message_id=eq.${msgId}`, { method: 'DELETE', headers: H }).catch(() => {});
      await fetch(`${base}/rest/v1/messages?id=eq.${msgId}`, { method: 'DELETE', headers: H }).catch(() => {});
    }
    await fetch(`${base}/rest/v1/profiles?bi=eq.${BI}`, { method: 'DELETE', headers: H }).catch(() => {});
    await fetch(`${base}/rest/v1/solicitacoes_registo?bi_numero=eq.${BI}`, { method: 'DELETE', headers: H }).catch(() => {});
    if (contaId) await fetch(`${base}/auth/v1/admin/users/${contaId}`, { method: 'DELETE', headers: H }).catch(() => {});
    await browser.close();
  }
})();
