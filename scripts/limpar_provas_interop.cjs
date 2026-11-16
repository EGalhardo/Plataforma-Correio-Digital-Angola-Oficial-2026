/**
 * Remove as provas criadas por scripts/test_interop_contas_reais_playwright.cjs
 * (mensagens, ocorrências, eventos e notificações com selo INTEROP-/DIAG-).
 * Uso: node scripts/limpar_provas_interop.cjs
 */
const fs = require('fs');
const path = require('path');
const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const svc = env.match(/SUPABASE_SERVICE_ROLE_KEY=([^\s\n]+)/)[1];
const b = 'https://klrclczcahfycfdxzdqs.supabase.co';
const H = { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' };
const MARCA = /INTEROP-|DIAG-|RECON-|E2E-|TESTE-/i;
const del = (u) => fetch(b + u, { method: 'DELETE', headers: H });

(async () => {
  const msgs = await (await fetch(b + '/rest/v1/messages?select=id,subject&limit=2000', { headers: H })).json();
  const mAlvo = msgs.filter((m) => MARCA.test(String(m.subject || '')));
  for (const m of mAlvo) {
    await del('/rest/v1/message_state_history?message_id=eq.' + m.id);
    await del('/rest/v1/messages?id=eq.' + m.id);
  }
  const ocs = await (await fetch(b + '/rest/v1/cda_ocorrencias?select=id,numero,titulo&limit=2000', { headers: H })).json();
  const oAlvo = ocs.filter((o) => MARCA.test(String(o.titulo || '')));
  for (const o of oAlvo) {
    for (const t of ['cda_ocorrencias_eventos', 'cda_ocorrencias_fotos', 'cda_ocorrencias_notificacoes'])
      await del(`/rest/v1/${t}?ocorrencia_id=eq.${o.id}`);
    await del('/rest/v1/cda_ocorrencias?id=eq.' + o.id);
  }
  await del('/rest/v1/notifications?title=like.*INTEROP*');
  await del('/rest/v1/notifications?message=like.*INTEROP*');

  const fimM = await (await fetch(b + '/rest/v1/messages?select=id&limit=2000', { headers: H })).json();
  const fimO = await (await fetch(b + '/rest/v1/cda_ocorrencias?select=numero', { headers: H })).json();
  console.log(JSON.stringify({
    mensagens_removidas: mAlvo.length,
    ocorrencias_removidas: oAlvo.map((o) => o.numero),
    mensagens_restantes: fimM.length,
    ocorrencias_restantes: fimO.map((o) => o.numero),
    residuo: [...fimM.filter((m) => MARCA.test(String(m.subject || ''))), ...fimO.filter((o) => MARCA.test(String(o.titulo || '')))].length,
  }, null, 1));
})();
