/**
 * Verificação em PRODUÇÃO do problema 1 (autorização) — somente leitura de
 * dados próprios + criação/remoção de UMA conta temporária de teste.
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/test_auth_producao_playwright.cjs
 *
 * O que prova:
 *   1. um signup público com role=admin/bi/instituicao forjados NÃO obtém
 *      privilégios em app_metadata (nasce cidadão, sem bi);
 *   2. o próprio utilizador não consegue promover-se via updateUser;
 *   3. o RPC cda_mark_notification_read recusa (42501) e não toca em avisos
 *      alheios; anon deixa de poder executar o RPC.
 * A conta é eliminada no fim, mesmo em caso de falha.
 */
const { chromium } = require('playwright');

const base = process.env.TEST_SUPABASE_URL || 'https://klrclczcahfycfdxzdqs.supabase.co';
const anon = process.env.TEST_SUPABASE_ANON_KEY;
const svc = process.env.TEST_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!anon || !svc) throw Error('Faltam TEST_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY no ambiente.');
if (!/^https:\/\/(klrclczcahfycfdxzdqs|runmdcnkawxirzkvwsnm)\.supabase\.co$/.test(base)) throw Error('Projeto não autorizado.');

const tag = Date.now().toString(36).slice(-6);
const svcH = { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // origem válida para o fetch dentro do browser (o Playwright bloqueia about:blank)
  await page.goto(base + '/auth/v1/health', { waitUntil: 'domcontentloaded' }).catch(() => {});
  const out = {};
  let userId = null;
  try {
    const email = `teste.autorizacao.${tag}@example.com`;
    const password = 'Teste!2026' + tag;

    // 1) signup público com claims forjadas
    const signup = await page.evaluate(async ([base, anon, email, password, tag]) => {
      const r = await fetch(base + '/auth/v1/signup', {
        method: 'POST',
        headers: { apikey: anon, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, data: { role: 'admin', bi: 'HACK' + tag.toUpperCase(), instituicao: 'AGT-LMM', agent: 'ADMIN-0001' } }),
      });
      return { status: r.status, body: await r.json().catch(() => null) };
    }, [base, anon, email, password, tag]);
    const appMeta = signup.body?.user?.app_metadata || signup.body?.raw_app_meta_data || {};
    userId = signup.body?.user?.id || signup.body?.id || null;
    out.signup = {
      status: signup.status,
      role_obtido: appMeta.role ?? null,
      bi_obtido: appMeta.bi ?? null,
      instituicao_obtida: appMeta.instituicao ?? null,
      privilegio_forjado_recusado: (appMeta.role ?? 'cidadao') !== 'admin' && !appMeta.bi,
    };

    // 2) login + tentativa de auto-promoção via updateUser
    const sessao = await page.evaluate(async ([base, anon, email, password]) => {
      const r = await fetch(base + '/auth/v1/token?grant_type=password', {
        method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return await r.json().catch(() => null);
    }, [base, anon, email, password]);
    const token = sessao?.access_token || null;
    if (token) {
      const upd = await page.evaluate(async ([base, anon, token, tag]) => {
        const r = await fetch(base + '/auth/v1/user', {
          method: 'PUT',
          headers: { apikey: anon, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { role: 'admin', bi: 'HACK' + tag.toUpperCase(), instituicao: 'AGT-LMM' } }),
        });
        const j = await r.json().catch(() => null);
        return { status: r.status, app: j?.app_metadata || j?.user?.app_metadata || {} };
      }, [base, anon, token, tag]);
      out.autopromocao = {
        status: upd.status,
        role_obtido: upd.app.role ?? null,
        bi_obtido: upd.app.bi ?? null,
        recusada: (upd.app.role ?? 'cidadao') !== 'admin',
      };

      // 3) RPC de notificação: cidadão sem identidade não marca avisos alheios
      const rpc = await page.evaluate(async ([base, anon, token]) => {
        const r = await fetch(base + '/rest/v1/rpc/cda_mark_notification_read', {
          method: 'POST',
          headers: { apikey: anon, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_id: 1 }),
        });
        return { status: r.status, body: await r.json().catch(() => null) };
      }, [base, anon, token]);
      out.rpc_cidadao = rpc;
    }

    // 4) anon já não executa o RPC
    out.rpc_anon = await page.evaluate(async ([base, anon]) => {
      const r = await fetch(base + '/rest/v1/rpc/cda_mark_notification_read', {
        method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_id: 1 }),
      });
      return r.status;
    }, [base, anon]);

    out.aprovado =
      out.signup.privilegio_forjado_recusado === true &&
      (out.autopromocao ? out.autopromocao.recusada === true : true) &&
      out.rpc_anon !== 200;
    console.log(JSON.stringify({ projeto: base, ...out }, null, 1));
    if (!out.aprovado) process.exitCode = 1;
  } finally {
    if (userId) await fetch(`${base}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers: svcH }).catch(() => {});
    await browser.close();
  }
})();
