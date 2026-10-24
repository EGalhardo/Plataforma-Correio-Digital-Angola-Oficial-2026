// Limpeza dos dados criados por scripts/e2e_interoperabilidade_ocorrencia_denuncia_reclamacao.mjs.
// Apaga apenas o que contém o TAG indicado: ocorrências (com eventos e notificações),
// correspondências (com o histórico de estados) e respostas.
//
// Uso:  TAG=E2E-xxxxxx node scripts/cleanup_e2e_interoperabilidade.mjs
// Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ficheiro .env.local (não são impressas).

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const TAG = process.env.TAG;
if (!/^E2E-\d{6}$/.test(TAG || '')) {
  console.error('Indique TAG=E2E-xxxxxx (o valor impresso pelo teste).');
  process.exit(2);
}

globalThis.WebSocket = globalThis.WebSocket || (await import('ws')).default;
const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ocs = await sb.from('cda_ocorrencias').select('id,numero').ilike('titulo', `%${TAG}%`);
if (ocs.error) throw ocs.error;
const ocIds = (ocs.data || []).map((o) => o.id);
if (ocIds.length) {
  const n = await sb.from('cda_ocorrencias_notificacoes').delete({ count: 'exact' }).in('ocorrencia_id', ocIds);
  const e = await sb.from('cda_ocorrencias_eventos').delete({ count: 'exact' }).in('ocorrencia_id', ocIds);
  const o = await sb.from('cda_ocorrencias').delete({ count: 'exact' }).in('id', ocIds);
  if (n.error || e.error || o.error) throw n.error || e.error || o.error;
  console.log(`ocorrências apagadas ${o.count} (notificações ${n.count}, eventos ${e.count})`);
} else {
  console.log('ocorrências: nenhuma');
}

// Avisos (notifications) criados pelas correspondências e ocorrências de teste.
// Sem os apagar, continuam «não lidos» e distorcem os cartões e o sino.
const avisos = await sb.from('notifications').delete({ count: 'exact' }).or(`message.ilike.%${TAG}%,title.ilike.%${TAG}%`);
if (avisos.error) throw avisos.error;
console.log(`avisos apagados ${avisos.count}`);

const msgs = await sb.from('messages').select('id').ilike('subject', `%${TAG}%`);
if (msgs.error) throw msgs.error;
const msgIds = (msgs.data || []).map((m) => m.id);
if (msgIds.length) {
  const h = await sb.from('message_state_history').delete({ count: 'exact' }).in('message_id', msgIds);
  if (h.error) throw h.error;
  const m = await sb.from('messages').delete({ count: 'exact' }).in('id', msgIds);
  if (m.error) throw m.error;
  console.log(`correspondências apagadas ${m.count} (histórico ${h.count})`);
} else {
  console.log('correspondências: nenhuma');
}

const restam = await sb.from('messages').select('id').ilike('subject', `%${TAG}%`);
const restamOc = await sb.from('cda_ocorrencias').select('id').ilike('titulo', `%${TAG}%`);
console.log(`restam: ${(restam.data || []).length} correspondências, ${(restamOc.data || []).length} ocorrências`);
process.exit((restam.data || []).length || (restamOc.data || []).length ? 1 : 0);
