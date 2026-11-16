/**
 * Escopo de titularidade no proxy /api/dados (produção).
 *
 * Prova, com um cidadão efémero criado e apagado por este script, que:
 *   1. contacts/documents/messages só devolvem as linhas do próprio titular;
 *   2. um INSERT com owner_bi forjado é sobreposto pelo servidor;
 *   3. ler as linhas de OUTRO titular devolve zero.
 *
 * Nunca usa contas reais. Uso: node scripts/test_producao_escopo_proxy.cjs
 */
const fs = require('fs');
const path = require('path');

const APP = 'https://correio-digital-angola-oficial.vercel.app';
const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const svc = env.match(/SUPABASE_SERVICE_ROLE_KEY=([^\s\n]+)/)[1];
const B = 'https://klrclczcahfycfdxzdqs.supabase.co';
const H = { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

const BI = '002399731LA711';               // cidadão efémero (formato válido)
const OUTRO = '002399732LA722';            // titular alheio, só para o teste de leitura
const EMAIL = `bi.${BI.toLowerCase()}@cidadao.correiodigital.ao`;
const PASSWORD = `Teste!${Date.now()}`;

const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };

(async () => {
  const res = {};
  let uid = null;
  try {
    // --- conta efémera -------------------------------------------------------
    const cu = await fetch(`${B}/auth/v1/admin/users`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true, app_metadata: { role: 'cidadao', bi: BI } }),
    });
    const u = await j(cu);
    uid = u.id || u.user?.id;
    if (!uid) throw new Error('não foi possível criar a conta efémera: ' + JSON.stringify(u).slice(0, 160));

    const lr = await fetch(`${B}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: svc, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    const tk = (await j(lr)).access_token;
    if (!tk) throw new Error('login do cidadão efémero falhou');

    // linha alheia que NUNCA deve aparecer
    await fetch(`${B}/rest/v1/contacts`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ owner_bi: OUTRO, name: 'CONTACTO-ALHEIO', bi: OUTRO }),
    });

    const call = async (tabela, operacao, extra = {}) => {
      const r = await fetch(`${APP}/api/dados`, {
        method: 'POST', headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabela, operacao, retorno: true, ...extra }),
      });
      return [r.status, await j(r)];
    };
    const n = (x) => (Array.isArray(x?.dados) ? x.dados.length : Array.isArray(x?.linhas) ? x.linhas.length : 0);

    // 1) leitura própria
    for (const t of ['contacts', 'documents']) {
      const [st, b] = await call(t, 'select', { filtros: {} });
      res[`${t}_select_proprio`] = { status: st, linhas: n(b) };
    }

    // 2) insert com owner_bi forjado
    const [sti, bi] = await call('contacts', 'insert', {
      dados: { name: 'CONTACTO-PROPRIO', bi: '999999999ZZ999', relation: 'Familiar', status: 'Pendente', owner_bi: 'BI-FORJADO-ALHEIO' },
    });
    const row = Array.isArray(bi?.linhas) ? bi.linhas[0] : (Array.isArray(bi?.dados) ? bi.dados[0] : bi?.dados);
    res.owner_bi_sobreposto = { status: sti, gravado: row?.owner_bi || null, ok: row?.owner_bi === BI, erro: sti === 200 ? undefined : JSON.stringify(bi).slice(0, 200) };

    // 3) tentar ler as linhas de outro titular
    // O escopo do servidor sobrepõe-se ao filtro pedido: mesmo pedindo o
    // owner_bi alheio, as linhas devolvidas têm de ser sempre minhas.
    const [stx, bx] = await call('contacts', 'select', { filtros: { owner_bi: OUTRO } });
    const donos = (bx?.dados || bx?.linhas || []).map((x) => String(x.owner_bi));
    res.leitura_alheia = { status: stx, linhas: donos.length, donos, ok: donos.every((d) => d === BI) };

    res.aprovado = Object.values(res).every((v) => typeof v !== 'object' || v.ok !== false)
      && res.contacts_select_proprio.status === 200
      && res.documents_select_proprio.status === 200
      && res.owner_bi_sobreposto.ok === true
      && res.leitura_alheia.ok === true;
  } catch (e) {
    res.erro = String(e.message || e);
    res.aprovado = false;
  } finally {
    // --- limpeza total ------------------------------------------------------
    await fetch(`${B}/rest/v1/contacts?owner_bi=in.(${BI},${OUTRO})`, { method: 'DELETE', headers: H });
    await fetch(`${B}/rest/v1/documents?holder_bi=in.(${BI},${OUTRO})`, { method: 'DELETE', headers: H });
    // o proxy garante um `profiles` para o owner_bi de cada contacto — essa
    // linha também é resíduo desta prova e tem de sair com ela.
    await fetch(`${B}/rest/v1/profiles?bi=in.(${BI},${OUTRO})`, { method: 'DELETE', headers: H });
    if (uid) await fetch(`${B}/auth/v1/admin/users/${uid}`, { method: 'DELETE', headers: H });
    const resto = await j(await fetch(`${B}/rest/v1/contacts?select=owner_bi&owner_bi=in.(${BI},${OUTRO})`, { headers: H }));
    const perfis = await j(await fetch(`${B}/rest/v1/profiles?select=bi&bi=in.(${BI},${OUTRO})`, { headers: H }));
    res.residuo_limpo = Array.isArray(resto) && resto.length === 0
      && Array.isArray(perfis) && perfis.length === 0;
    console.log(JSON.stringify(res, null, 1));
    process.exit(res.aprovado && res.residuo_limpo ? 0 : 1);
  }
})();
