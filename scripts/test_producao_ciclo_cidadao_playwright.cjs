/**
 * Ciclo real em PRODUÇÃO (app publicado): registo de cidadão → aprovação
 * administrativa → login → acesso apenas aos próprios dados.
 *   node scripts/test_producao_ciclo_cidadao_playwright.cjs
 *
 * Usa o endpoint de aprovação do app publicado (não SQL), para provar que o
 * provisionamento de identidade que corre lá dentro funciona.
 * Todas as contas e linhas criadas são apagadas no fim.
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
const BI = `PRB${tag}`;
const pw = 'Ciclo!2026' + tag;
const emailCid = `bi.${BI.toLowerCase()}@cidadao.correio digital`.replace(' ', '') + '.ao';
const emailAdm = `agente.ciclo.${tag.toLowerCase()}@admin.correiodigital.ao`;
const criados = { contas: [], registos: [] };

const criarConta = async (email, appMeta) => {
  const r = await fetch(`${base}/auth/v1/admin/users`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ email, password: pw, email_confirm: true, app_metadata: appMeta }),
  });
  const j = await r.json();
  if (!r.ok) throw Error('criar conta: ' + JSON.stringify(j).slice(0, 200));
  criados.contas.push(j.id);
  return j.id;
};
const loginToken = async (email) => {
  const r = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pw }),
  });
  const j = await r.json();
  if (!j.access_token) throw Error(`login(${email}) status=${r.status}: ` + JSON.stringify(j).slice(0, 200));
  return j.access_token;
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e).slice(0, 120)));

  const out = {};
  try {
    // Sessão de administrador usada pelo browser (token real passado no pedido).
    await criarConta(emailAdm, { role: 'admin', agent: 'ADMIN-0001' });
    const tokAdm = await loginToken(emailAdm);

    // 1. O cidadão registra-se como o formulário público faria (sem identidade).
    await page.goto(APP, { waitUntil: 'domcontentloaded' });
    const signup = await page.evaluate(async ([base, anon, emailCid, pw, BI]) => {
      const r = await fetch(base + '/auth/v1/signup', {
        method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailCid, password: pw, data: { bi: BI, role: 'cidadao', name: 'Ciclo' } }),
      });
      const j = await r.json();
      return { status: r.status, id: j.user?.id, app_metadata: j.user?.app_metadata };
    }, [base, anon, emailCid, pw, BI]);
    out.registo = { status: signup.status, identidade_no_registo: signup.app_metadata?.bi ?? null };
    criados.contas.push(signup.id);

    // 2. A linha da fila de registo (o registo público insere-a; aqui via serviço).
    await fetch(`${base}/rest/v1/solicitacoes_registo`, {
      method: 'POST', headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify([{ nome: 'Ciclo', email: emailCid, bi_numero: BI, status: 'Pendente' }]),
    });
    criados.registos.push(BI);

    // 3. Login antes da aprovação: não vê nada.
    const tokAntes = await loginToken(emailCid);
    out.antes_da_aprovacao = await page.evaluate(async ([APP, tokAntes]) => {
      const r = await fetch(APP + '/api/dados', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tokAntes, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabela: 'notifications', operacao: 'select', filtros: {}, limite: 2000 }),
      });
      const j = await r.json().catch(() => null);
      return { status: r.status, ok: j?.ok ?? null, total: Array.isArray(j?.linhas) ? j.linhas.length : null };
    }, [APP, tokAntes]);

    // 4. Aprovação no app publicado, com sessão de administrador real.
    out.aprovacao = await page.evaluate(async ([APP, tokAdm, BI]) => {
      const r = await fetch(APP + '/api/admin-aprovar-instituicao', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tokAdm, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bi_numero: BI, status: 'Aprovado' }),
      });
      return { status: r.status, body: await r.json().catch(() => null) };
    }, [APP, tokAdm, BI]);

    // 5. Aprovação sem sessão de admin tem de ser recusada.
    out.aprovacao_sem_admin = await page.evaluate(async ([APP, BI]) => {
      const r = await fetch(APP + '/api/admin-aprovar-instituicao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bi_numero: BI, status: 'Aprovado' }),
      });
      return r.status;
    }, [APP, BI]);

    // 6. Depois da aprovação: identidade atribuída pelo servidor e dados próprios só.
    const tokDepois = await loginToken(emailCid);
    out.depois_da_aprovacao = await page.evaluate(async ([base, anon, APP, tokDepois]) => {
      const me = await (await fetch(base + '/auth/v1/user', { headers: { apikey: anon, Authorization: 'Bearer ' + tokDepois } })).json();
      const bi = me.app_metadata?.bi ?? null;
      const pedir = async (token) => {
        const r = await fetch(APP + '/api/dados', {
          method: 'POST',
          headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Content-Type': 'application/json' },
          body: JSON.stringify({ tabela: 'notifications', operacao: 'select', filtros: {}, limite: 2000 }),
        });
        const j = await r.json().catch(() => null);
        return { status: r.status, linhas: Array.isArray(j?.linhas) ? j.linhas : null };
      };
      const propria = await pedir(tokDepois);
      const anonima = await pedir(null);
      // e uma tabela de outro cidadão não deve ser legível em nome alheio
      const perfis = await fetch(APP + '/api/dados', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tokDepois, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabela: 'profiles', operacao: 'select', filtros: {}, limite: 2000 }),
      });
      const pj = await perfis.json().catch(() => null);
      return {
        claims: { bi, role: me.app_metadata?.role ?? null },
        caixa_status: propria.status,
        caixa_total: propria.linhas ? propria.linhas.length : null,
        todas_suas: propria.linhas ? propria.linhas.every((n) => !n.target_bi || n.target_bi === bi) : null,
        sem_sessao_bloqueado: anonima.status >= 400 || anonima.linhas === null || anonima.linhas.length === 0,
        perfis_alheios: pj?.linhas ? pj.linhas.filter((x) => x.bi && x.bi !== bi).length : null,
      };
    }, [base, anon, APP, tokDepois]);

    out.erros_js_no_browser = erros.slice(0, 3);
    out.aprovado =
      out.registo.identidade_no_registo === null &&
      out.aprovacao.status === 200 && out.aprovacao.body?.provisionamento?.ok === true &&
      out.aprovacao_sem_admin === 401 &&
      out.depois_da_aprovacao.claims.bi === BI &&
      out.depois_da_aprovacao.claims.role === 'cidadao' &&
      out.depois_da_aprovacao.todas_suas !== false &&
      out.depois_da_aprovacao.perfis_alheios === 0;

    console.log(JSON.stringify(out, null, 1));
    if (!out.aprovado) process.exitCode = 1;
  } finally {
    for (const id of criados.contas) {
      if (id) await fetch(`${base}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: H }).catch(() => {});
    }
    for (const bi of criados.registos) {
      await fetch(`${base}/rest/v1/solicitacoes_registo?bi_numero=eq.${bi}`, { method: 'DELETE', headers: H }).catch(() => {});
    }
    const restantes = await (await fetch(`${base}/rest/v1/solicitacoes_registo?bi_numero=eq.${BI}&select=id`, { headers: H })).json().catch(() => []);
    console.log('limpeza — linhas de teste restantes:', Array.isArray(restantes) ? restantes.length : '?');
    await browser.close();
  }
})();
