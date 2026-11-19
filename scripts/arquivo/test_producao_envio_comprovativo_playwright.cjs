/**
 * Fluxo real de cidadão em PRODUÇÃO: entrar, enviar correspondência e ver o
 * comprovativo (protocolo + selo). node scripts/test_producao_envio_comprovativo_playwright.cjs
 *
 * Cria uma conta efémera aprovada, usa a UI real do portal publicado e limpa
 * tudo no fim (conta, perfil, fila, mensagens do teste).
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
// BI com a FORMA de um BI real (começa por dígito): o portal infere o papel
// pela credencial e um BI a começar por letras cairia no canal institucional.
const BI = `9${tag}LA0${(Date.now() % 90 + 10)}`;
const pw = 'Envio!2026' + tag;
const EMAIL = `bi.${BI.toLowerCase()}@cidadao.correiodigital.ao`;
const MARCA = `TESTE-COMPROVATIVO-${tag}`;
const ARTEFACTOS = require('path').join(__dirname, '..', 'test-artifacts');
require('fs').mkdirSync(ARTEFACTOS, { recursive: true });

(async () => {
  const criados = { conta: null };
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await ctx.newPage();
  const out = {};
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e).slice(0, 140)));
  // Diagnóstico: registar as escritas e as respostas da API durante o envio.
  const rede = [];
  page.on('request', (r) => {
    if (r.method() !== 'POST') return;
    const u = r.url();
    if (!/\/api\//.test(u)) return;
    rede.push({ fase: 'pedido', url: u.replace(/^https?:\/\/[^/]+/, ''), corpo: (r.postData() || '').slice(0, 120) });
  });
  page.on('response', async (r) => {
    if (r.request().method() !== 'POST') return;
    const u = r.url();
    if (!/\/api\//.test(u)) return;
    let corpo = '';
    try { corpo = (await r.text()).slice(0, 160); } catch { /* corpo não legível */ }
    rede.push({ fase: 'resposta', url: u.replace(/^https?:\/\/[^/]+/, ''), status: r.status(), corpo });
  });

  try {
    // Conta efémera aprovada (perfil + fila + Auth com identidade).
    await fetch(`${base}/rest/v1/profiles`, {
      method: 'POST', headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify([{ bi: BI, name: `Cidadão Envio ${tag}`, role: 'user' }]),
    });
    await fetch(`${base}/rest/v1/solicitacoes_registo`, {
      method: 'POST', headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify([{ nome: `Cidadão Envio ${tag}`, email: EMAIL, bi_numero: BI, status: 'Aprovado' }]),
    });
    const cu = await (await fetch(`${base}/auth/v1/admin/users`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ email: EMAIL, password: pw, email_confirm: true, app_metadata: { bi: BI, role: 'cidadao' } }),
    })).json();
    criados.conta = cu.id;

    // 1. Login pela UI real.
    await page.goto(APP, { waitUntil: 'networkidle', timeout: 60000 });
    // O portal pode arrancar no canal institucional: escolher o canal cidadão
    // pelo rótulo real do formulário («Nº do BI de Cidadão»).
    for (let i = 0; i < 3; i++) {
      const rotulo = (await page.locator('body').innerText().catch(() => ''));
      if (/Nº do BI de Cidad/i.test(rotulo)) break;
      const alvoCanal = page.getByText(/Cidad[ãa]o/i).first();
      if (await alvoCanal.isVisible().catch(() => false)) await alvoCanal.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1200);
    }
    out.canal_cidadao = /Nº do BI de Cidad/i.test(await page.locator('body').innerText().catch(() => ''));
    await page.locator('input[name="cda-utilizador"]').fill(BI);
    await page.locator('input[name="cda-senha"]').fill(pw);
    await page.getByRole('button', { name: /Entrar no Portal/i }).first().click({ timeout: 15000 });
    await page.waitForTimeout(7000);
    out.entrou = !(await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).first().isVisible().catch(() => false));
    out.ecra_apos_login = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300);
    await page.screenshot({ path: ARTEFACTOS + '/envio-1-apos-login.png' }).catch(() => {});

    // 2. Ir ao correio e compor uma mensagem para a instituição.
    const abaCorreio = page.getByRole('button', { name: /correio|caixa de entrada|mensagens/i }).first();
    if (await abaCorreio.isVisible().catch(() => false)) {
      await abaCorreio.click().catch(() => {});
      await page.waitForTimeout(1500);
    }
    const btnCompor = page.getByRole('button', { name: /compor|nova mensagem|escrever|novo/i }).first();
    out.tem_botao_compor = await btnCompor.isVisible().catch(() => false);
    if (out.tem_botao_compor) {
      await btnCompor.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: ARTEFACTOS + '/envio-2-compor.png' }).catch(() => {});
      // Campos reais do compose (MailContent): destinatário por Código
      // Institucional, «TÍTULO» (#compose-subject-input) e o conteúdo.
      const campoDest = page.locator('input[placeholder*="Código Institucional" i]').first();
      const temDest = await campoDest.isVisible().catch(() => false);
      if (temDest) await campoDest.fill('AGT-LMM');
      const campoAssunto = page.locator('#compose-subject-input, [data-testid="compose-subject-input"]').first();
      const temAssunto = await campoAssunto.isVisible().catch(() => false);
      if (temAssunto) await campoAssunto.fill(MARCA);
      const campoCorpo = page.locator('textarea').first();
      const temCorpo = await campoCorpo.isVisible().catch(() => false);
      if (temCorpo) await campoCorpo.fill(`Mensagem de verificação ${MARCA}`);
      out.preencheu = { destinatario: temDest, titulo: temAssunto, corpo: temCorpo };
      await page.screenshot({ path: ARTEFACTOS + '/envio-2-comprovativo.png' }).catch(() => {});
      const enviar = page.getByRole('button', { name: /^Enviar Mensagem$/i }).first();
      out.tem_botao_enviar = await enviar.isVisible().catch(() => false);
      if (out.tem_botao_enviar) await enviar.click({ timeout: 10000 }).catch(() => {});
      // Popup «Enviar Mensagem» → escolher «Mensagem Normal» (modalidade real).
      const popup = page.locator('[data-testid="popup-enviar-mensagem"]');
      out.abriu_modalidade = await popup.isVisible().catch(() => false);
      const opcaoNormal = page.locator('#btn-modal-opcao-normal').first();
      if (await opcaoNormal.isVisible().catch(() => false)) {
        await opcaoNormal.click({ timeout: 8000 }).catch(() => {});
      }
      await page.waitForTimeout(6000);
      // Revisão pré-envio: com avisos, o portal pede um SEGUNDO clique
      // («Avisos revistos — o próximo clique envia a mensagem»).
      const corpoTexto = await page.locator('body').innerText().catch(() => '');
      // Passos reais do portal: modalidade → revisão → «Enviar Correspondência».
      out.pediu_revisao = /Rever antes de enviar/i.test(corpoTexto);
      out.pediu_confirmacao = /rev[êe] antes de enviar|pr[óo]ximo clique envia/i.test(corpoTexto);
      const btnConf = page.getByRole('button', { name: /Enviar Correspondência/i }).first();
      if (await btnConf.isVisible().catch(() => false)) {
        await btnConf.click({ timeout: 8000 }).catch(() => {});
      } else if (out.pediu_confirmacao) {
        const enviar2 = page.getByRole('button', { name: /^Enviar Mensagem$/i }).first();
        if (await enviar2.isVisible().catch(() => false)) await enviar2.click({ timeout: 8000 }).catch(() => {});
      }
      // O comprovativo (selo + protocolo) só fica no ecrã 5 segundos antes de
      // fechar sozinho: capturá-lo depressa e confirmar o texto nesse momento.
      let protocoloNoEcra = null;
      let seloVisivel = false;
      for (let i = 0; i < 40; i++) {
        await page.waitForTimeout(700);
        const t = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
        const achado = t.match(/CDA[-–][A-Z0-9\-]*\d{2,}/i) || t.match(/AGTLM-[A-Z0-9\-]+/i);
        if (achado) {
          protocoloNoEcra = achado[0];
          seloVisivel = /selo digital|QR Code|comprovativ/i.test(t);
          await page.screenshot({ path: ARTEFACTOS + '/envio-3-comprovativo.png' }).catch(() => {});
          break;
        }
        if (i === 20) await page.screenshot({ path: ARTEFACTOS + '/envio-3-sem-comprovativo.png' }).catch(() => {});
      }
      out.protocolo_no_ecra = protocoloNoEcra;
      out.selo_visivel = seloVisivel;
      await page.waitForTimeout(3000);
      await page.screenshot({ path: ARTEFACTOS + '/envio-3-comprovativo.png' }).catch(() => {});

      const texto = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
      out.texto_apos_envio = texto.slice(0, 600);
      const m = texto.match(/CDA[-–][A-Z0-9\-]*\d{2,}/i);
      out.protocolo_visivel = m ? m[0] : null;
      out.mostrou_selo = /selo digital|QR Code|comprovativ/i.test(texto);
    }

    // 3. Confirmar na base que a mensagem foi gravada com protocolo.
    // 2026-11-16 — a gravação não é instantânea: ler uma única vez logo após o
    // comprovativo dava falsos negativos (o ecrã já mostrava o protocolo e a
    // base ainda não tinha a linha). Repetir até 12 s antes de concluir.
    let minha = [];
    for (let tent = 0; tent < 9; tent++) {
      const msgs = await (await fetch(`${base}/rest/v1/messages?select=id,subject,protocol_number,sender_bi&order=id.desc&limit=20`, { headers: H })).json();
      minha = Array.isArray(msgs) ? msgs.filter((x) => String(x.subject || '').includes(MARCA) || String(x.sender_bi || '') === BI) : [];
      if (minha.length) break;
      await new Promise((r) => setTimeout(r, 1500));
    }
    out.rede_envio = rede.filter((x) => /dados|comprovativo|mensagem/i.test(x.url)).slice(-8);
    out.gravada_na_base = minha.length > 0;
    out.protocolo_na_base = minha[0]?.protocol_number ?? null;

    out.erros_js = [...new Set(erros)].slice(0, 3);
    // O comprovativo visual tem de coincidir com o que ficou gravado na base.
    out.protocolo_confere = !!out.protocolo_no_ecra && out.protocolo_no_ecra === out.protocolo_na_base;
    out.aprovado = out.entrou === true && out.gravada_na_base === true
      && out.selo_visivel === true && out.protocolo_confere === true;
    console.log(JSON.stringify(out, null, 1));
    if (!out.aprovado) process.exitCode = 1;
  } finally {
    // Limpeza: mensagens do teste, perfil, fila e conta.
    const msgs = await (await fetch(`${base}/rest/v1/messages?select=id&subject=like.*${MARCA}*`, { headers: H })).json().catch(() => []);
    for (const m of Array.isArray(msgs) ? msgs : []) {
      await fetch(`${base}/rest/v1/message_state_history?message_id=eq.${m.id}`, { method: 'DELETE', headers: H }).catch(() => {});
      await fetch(`${base}/rest/v1/messages?id=eq.${m.id}`, { method: 'DELETE', headers: H }).catch(() => {});
    }
    await fetch(`${base}/rest/v1/messages?sender_bi=eq.${BI}`, { method: 'DELETE', headers: H }).catch(() => {});
    await fetch(`${base}/rest/v1/notifications?target_bi=eq.${BI}`, { method: 'DELETE', headers: H }).catch(() => {});
    await fetch(`${base}/rest/v1/profiles?bi=eq.${BI}`, { method: 'DELETE', headers: H }).catch(() => {});
    await fetch(`${base}/rest/v1/solicitacoes_registo?bi_numero=eq.${BI}`, { method: 'DELETE', headers: H }).catch(() => {});
    if (criados.conta) await fetch(`${base}/auth/v1/admin/users/${criados.conta}`, { method: 'DELETE', headers: H }).catch(() => {});
    const resto = await (await fetch(`${base}/rest/v1/profiles?bi=eq.${BI}&select=bi`, { headers: H })).json().catch(() => []);
    console.log('limpeza — vestígios restantes:', Array.isArray(resto) ? resto.length : '?');
    await browser.close();
  }
})();
