// e2e_titularidade_notificacoes.mjs — regressão QA-BUG-001 (auditoria 2026-09-22)
// -----------------------------------------------------------------------------
// Eliminar uma correspondência NÃO pode apagar notificações de terceiros.
// Cenário:  duas mensagens DIFERENTES com o MESMO assunto (modela envio em
//           massa/sondagens). A elimina a sua; a notificação de B (sobre a
//           mensagem DELE) tem de SOBREVIVER.
// Uso:     node --env-file=.env --env-file=.env.local scripts/e2e_titularidade_notificacoes.mjs
// Env:     SUPABASE_URL (ou VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
//          SUPABASE_ANON_KEY (ou VITE_SUPABASE_ANON_KEY), BASE (defeito http://localhost:3000)
// Segurança: só contas SINTÉTICAS (padrões do limpezaContasSinteticas.ts),
//            auto-limpeza integral no final (users, profiles, mensagens, notifs).
// -----------------------------------------------------------------------------
const BASE = process.env.BASE || 'http://localhost:3000';
const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const SR = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const ANON = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
if (!URL || !SR || !ANON) { console.error('ERRO: faltam SUPABASE_URL / SERVICE_ROLE / ANON no env.'); process.exit(1); }

const TAG = `QA-TIT-${Date.now()}`;
const BI_A = '900000011LA001', BI_B = '900000012LA001', INST = `QA-TIT-${String(Date.now()).slice(-5)}`;
const PASS = 'CdaTitTest#2026';
const H_SR = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };
const H_AN = { apikey: ANON, 'Content-Type': 'application/json' };
const rest = (p) => `${URL}/rest/v1/${p}`;
const auth = (p) => `${URL}/auth/v1/${p}`;
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };

const criados = { users: [], notifs: [], msgs: [], notifsIds: [], msgsIds: [], profiles: [] };
const passos = [];
const reg = (nome, ok, det = '') => { passos.push({ nome, ok, det }); console.log(`${ok ? '[PASS]' : '[FAIL]'} ${nome}${det ? ' — ' + det : ''}`); };

async function criarUser(email, meta) {
  const r = await fetch(auth('admin/users'), { method: 'POST', headers: H_SR, body: JSON.stringify({ email, password: PASS, email_confirm: true, user_metadata: meta }) });
  const d = await j(r); if (!r.ok) throw new Error(`criar user ${email}: ${r.status} ${JSON.stringify(d).slice(0, 200)}`);
  criados.users.push(d.id); return d;
}
async function login(email) {
  const r = await fetch(auth('token?grant_type=password'), { method: 'POST', headers: H_AN, body: JSON.stringify({ email, password: PASS }) });
  const d = await j(r); if (!d.access_token) throw new Error(`login ${email} falhou`);
  return d.access_token;
}
async function inserirMsg(tok, sender, recipient, assunto) {
  const r = await fetch(rest('messages'), { method: 'POST', headers: { ...H_AN, Authorization: `Bearer ${tok}`, Prefer: 'return=representation' },
    body: JSON.stringify({ sender_bi: sender, recipient_bi: recipient, org: recipient, subject: assunto, body: 'teste titularidade', preview: 't', unread: true, status: 'Normal', workflow_state: 'RECEBIDA' }) });
  const d = await j(r); if (!r.ok) throw new Error(`inserir msg: ${JSON.stringify(d).slice(0, 200)}`);
  criados.msgsIds.push(d[0].id); return d[0].id;
}
async function inserirNotif(target, texto) {
  const r = await fetch(rest('notifications'), { method: 'POST', headers: { ...H_SR, Prefer: 'return=representation' },
    body: JSON.stringify({ target_bi: target, title: 'Nova correspondência', message: texto, time_text: 'Agora', type: 'info', target_tab: 'correspondencias' }) });
  const d = await j(r); if (!r.ok) throw new Error(`notif ${target}: ${JSON.stringify(d).slice(0, 200)}`);
  criados.notifsIds.push(d[0].id); return d[0].id;
}
const existe = async (tabela, id) => {
  const d = await j(await fetch(rest(`${tabela}?id=eq.${id}&select=id`), { headers: H_SR }));
  return Array.isArray(d) && d.length > 0;
};

let okGeral = true;
try {
  // 0) contas + perfis sintéticos (padrões reconhecidos pelo script de limpeza)
  await criarUser(`bi.${BI_A.toLowerCase()}@cidadao.correiodigital.ao`, { bi: BI_A, role: 'cidadao' });
  await criarUser(`bi.${BI_B.toLowerCase()}@cidadao.correiodigital.ao`, { bi: BI_B, role: 'cidadao' });
  await criarUser(`agente.${INST.toLowerCase()}-01@inst.correiodigital.ao`, { role: 'instituicao', instituicao: INST, agent: `${INST}-01` });
  for (const [bi, nome] of [[BI_A, 'QA Tit A'], [BI_B, 'QA Tit B'], [INST, INST]]) {
    await fetch(rest('profiles'), { method: 'POST', headers: { ...H_SR, Prefer: 'return=minimal' }, body: JSON.stringify({ bi, name: nome, role: 'user' }) });
    criados.profiles.push(bi);
  }
  const [tokA, tokB] = [await login(`bi.${BI_A.toLowerCase()}@cidadao.correiodigital.ao`), await login(`bi.${BI_B.toLowerCase()}@cidadao.correiodigital.ao`)];
  reg('contas sintéticas criadas (A, B, instituição)', true, TAG);

  // 1) DUAS mensagens diferentes, MESMO assunto (envio em massa/sondagem)
  const ASSUNTO = `${TAG} Esclarecimento oficial`;
  const msgA = await inserirMsg(tokA, BI_A, INST, ASSUNTO);
  const msgB = await inserirMsg(tokB, BI_B, INST, ASSUNTO);
  const notA = await inserirNotif(BI_A, `${ASSUNTO} — enviada.`);
  const notT = await inserirNotif(INST, `${ASSUNTO} — enviada.`);
  const notB = await inserirNotif(BI_B, `${ASSUNTO} — enviada.`);
  reg('duas mensagens com o mesmo assunto + 3 notificações semeadas', true);

  // 2) A elimina a SUA correspondência pelo endpoint real
  const rDel = await fetch(`${BASE}/api/eliminar-correspondencia`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokA}` }, body: JSON.stringify({ id: msgA }) });
  const dDel = await j(rDel);
  reg('endpoint elimina a correspondência de A', rDel.ok && dDel.ok === true, `HTTP ${rDel.status} notifs=${dDel?.detalhes?.notificacoes}`);

  // 3) NOTIFICAÇÃO DO TERCEIRO (B) TEM DE SOBREVIVER  ← asserção da regressão
  const bVive = await existe('notifications', notB);
  okGeral = okGeral && bVive;
  reg('notificação de B (terceiro, mesmo assunto) SOBREVIVE', bVive, bVive ? `id ${notB}` : 'FALHA — titularidade violada');

  // 4) as notificações das duas partes são removidas (comportamento original preservado)
  const aMorreu = !(await existe('notifications', notA));
  const tMorreu = !(await existe('notifications', notT));
  okGeral = okGeral && aMorreu && tMorreu;
  reg('notificações das DUAS PARTES removidas (fantasma)', aMorreu && tMorreu, `A:${aMorreu} inst:${tMorreu}, apagadas=${dDel?.detalhes?.notificacoes}`);

  // 5) a mensagem de B (mesmo assunto) permanece intacta
  const msgBVive = await existe('messages', msgB);
  okGeral = okGeral && msgBVive;
  reg('mensagem de B (mesmo assunto) permanece', msgBVive);
} catch (e) {
  okGeral = false;
  console.error('EXCEÇÃO:', String(e).slice(0, 300));
} finally {
  // auto-limpeza integral dos artefactos criados por ESTE teste
  for (const id of criados.notifsIds) await fetch(rest(`notifications?id=eq.${id}`), { method: 'DELETE', headers: H_SR }).catch(() => null);
  for (const id of criados.msgsIds) {
    await fetch(rest(`message_state_history?message_id=eq.${id}`), { method: 'DELETE', headers: H_SR }).catch(() => null);
    await fetch(rest(`messages?id=eq.${id}`), { method: 'DELETE', headers: H_SR }).catch(() => null);
  }
  for (const bi of criados.profiles) await fetch(rest(`profiles?bi=eq.${encodeURIComponent(bi)}`), { method: 'DELETE', headers: H_SR }).catch(() => null);
  for (const id of criados.users) await fetch(auth(`admin/users/${id}`), { method: 'DELETE', headers: H_SR }).catch(() => null);
  console.log(`\n=== RESULTADO: ${passos.filter(p => p.ok).length}/${passos.length} PASS — ${okGeral ? 'TITULARIDADE OK ✅' : 'REGRESSÃO PRESENTE ❌'} ===`);
  process.exit(okGeral ? 0 : 1);
}
