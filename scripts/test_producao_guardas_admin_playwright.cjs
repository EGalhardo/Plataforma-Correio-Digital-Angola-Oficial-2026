/**
 * Guardas de administração em PRODUÇÃO — prova positiva e negativa.
 *   node scripts/test_producao_guardas_admin_playwright.cjs
 *
 * Negativo: sem sessão → 401; sessão de cidadão → 403.
 * Positivo: sessão de admin → a operação corre (com um cadastro efémero
 * criado por este teste e eliminado logo a seguir).
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
const BI_ALVO = `GDA${tag}`;
const pw = 'Guarda!2026' + tag;
const conta = async (email, meta) => {
  const r = await fetch(`${base}/auth/v1/admin/users`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ email, password: pw, email_confirm: true, app_metadata: meta }),
  });
  const j = await r.json();
  if (!r.ok) throw Error('conta: ' + JSON.stringify(j).slice(0, 160));
  return j.id;
};
const token = async (email) => {
  const r = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pw }),
  });
  const j = await r.json();
  if (!j.access_token) throw Error(`login ${email}: ${r.status} ${JSON.stringify(j).slice(0, 160)}`);
  return j.access_token;
};

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  const contas = [];
  const out = {};
  try {
    await page.goto(APP, { waitUntil: 'domcontentloaded' });
    const pedir = (tokenSessao, rota, corpo) => page.evaluate(async ([APP, tokenSessao, rota, corpo]) => {
      const r = await fetch(APP + rota, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(tokenSessao ? { Authorization: 'Bearer ' + tokenSessao } : {}) },
        body: JSON.stringify(corpo),
      });
      return { status: r.status, body: await r.json().catch(() => null) };
    }, [APP, tokenSessao, rota, corpo]);

    // Cadastro efémero: perfil + linha na fila (como um cidadão registado).
    await fetch(`${base}/rest/v1/profiles`, {
      method: 'POST', headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify([{ bi: BI_ALVO, name: 'Alvo Guarda', role: 'user' }]),
    });
    await fetch(`${base}/rest/v1/solicitacoes_registo`, {
      method: 'POST', headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify([{ nome: 'Alvo Guarda', bi_numero: BI_ALVO, status: 'Aprovado' }]),
    });

    // Cidadão legítimo (com identidade) — deve ser recusado com 403.
    const idCid = await conta(`bi.${BI_ALVO.toLowerCase()}@cidadao.correiodigital.ao`, { bi: BI_ALVO, role: 'cidadao' });
    contas.push(idCid);
    const tokCid = await token(`bi.${BI_ALVO.toLowerCase()}@cidadao.correiodigital.ao`);
    out.cidadao_elimina_cidadao = await pedir(tokCid, '/api/admin-cidadao', { bi: BI_ALVO });

    // Sem sessão → 401 (já provado por curl; aqui reconfirmado no browser).
    out.sem_sessao = (await pedir(null, '/api/admin-cidadao', { bi: BI_ALVO })).status;

    // O cadastro tem de continuar intacto após as tentativas recusadas.
    const vivos = await (await fetch(`${base}/rest/v1/profiles?bi=eq.${BI_ALVO}&select=bi`, { headers: H })).json();
    out.intacto_apos_recusas = Array.isArray(vivos) && vivos.length === 1;

    // Admin real → a eliminação em cascata corre de facto.
    const idAdm = await conta(`agente.guarda.${tag.toLowerCase()}@admin.correiodigital.ao`, { role: 'admin', agent: 'ADMIN-0001' });
    contas.push(idAdm);
    const tokAdm = await token(`agente.guarda.${tag.toLowerCase()}@admin.correiodigital.ao`);
    out.admin_elimina = await pedir(tokAdm, '/api/admin-cidadao', { bi: BI_ALVO });

    const depois = await (await fetch(`${base}/rest/v1/profiles?bi=eq.${BI_ALVO}&select=bi`, { headers: H })).json();
    out.apagado_pelo_admin = Array.isArray(depois) && depois.length === 0;

    // Rate-limit das rotas de e-mail. O contador é POR IP e é partilhado com
    // todas as suites desta ronda, por isso o índice do primeiro 429 depende
    // do tráfego anterior — a asserção correcta é «o limite dispara e mantém-
    // se disparado», não «é exactamente a 6.ª chamada».
    const codigos = [];
    for (let i = 0; i < 6; i++) codigos.push((await pedir(null, '/api/enviar-email-boas-vindas', { nome: 'x', email: `rl${i}@example.com`, chaveAcesso: 'X', senha: 'y' })).status);
    out.rate_limit_email = codigos;
    out.rate_limit_activo = codigos.includes(429) && codigos[codigos.length - 1] === 429;

    out.aprovado =
      out.cidadao_elimina_cidadao.status === 403 &&
      out.sem_sessao === 401 &&
      out.intacto_apos_recusas === true &&
      out.admin_elimina.status === 200 &&
      out.apagado_pelo_admin === true &&
      out.rate_limit_activo === true;

    console.log(JSON.stringify(out, null, 1));
    if (!out.aprovado) process.exitCode = 1;
  } finally {
    await fetch(`${base}/rest/v1/profiles?bi=eq.${BI_ALVO}`, { method: 'DELETE', headers: H }).catch(() => {});
    await fetch(`${base}/rest/v1/solicitacoes_registo?bi_numero=eq.${BI_ALVO}`, { method: 'DELETE', headers: H }).catch(() => {});
    for (const id of contas) await fetch(`${base}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: H }).catch(() => {});
    const resto = await (await fetch(`${base}/rest/v1/profiles?bi=eq.${BI_ALVO}&select=bi`, { headers: H })).json().catch(() => []);
    console.log('limpeza — perfis de teste restantes:', Array.isArray(resto) ? resto.length : '?');
    await browser.close();
  }
})();
