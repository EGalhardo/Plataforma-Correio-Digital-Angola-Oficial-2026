/**
 * verifyV28.ts — Verifica se o v28 (storage policies da KB) foi aplicado.
 * Uso: npm run verify:v28  (ou: npx tsx scripts/verifyV28.ts)
 *
 * Confirma:
 *  1. Bucket kb_ficheiros existe e é público (limite 10MB se o v28 correu);
 *  2. Upload directo ANÓNIMO funciona (as policies INSERT/SELECT públicas);
 *  3. Listagem pública de um objeto do bucket.
 *
 * Resultado esperado APÓS aplicar o v28 no SQL Editor:
 *  - bucket ok
 *  - upload anon: 200 OK (antes: 403 RLS)
 */
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const ANON = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
const SERVICE = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!URL || !ANON) {
  console.error('Faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no ambiente.');
  process.exit(1);
}

let falhas = 0;
const reg = (ok: boolean, msg: string) => {
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${msg}`);
  if (!ok) falhas++;
};

const supabaseAnon = createClient(URL, ANON, { realtime: { transport: ws as any } });
const supabaseSvc = SERVICE ? createClient(URL, SERVICE, { realtime: { transport: ws as any } }) : null;

// 1) Bucket existe e é público (listagem exige service_role)
const { data: buckets, error: errB } = await (supabaseSvc
  ? supabaseSvc.storage.listBuckets()
  : Promise.resolve({ data: null as any, error: { message: 'sem service_role' } as any }));
if (errB) {
  reg(false, `listar buckets: ${errB.message}`);
} else {
  const kb = (buckets || []).find((b: any) => b.id === 'kb_ficheiros');
  reg(!!kb, `bucket kb_ficheiros existe`);
  if (kb) reg(kb.public === true, `kb_ficheiros é público`);
}

// 2) Upload directo ANÓNIMO (só funciona com as policies do v28)
const nome = `verify_v28_${Date.now()}.txt`;
const { error: errUp } = await supabaseAnon.storage
  .from('kb_ficheiros')
  .upload(nome, new Blob(['teste v28']), { contentType: 'text/plain', upsert: true });
if (errUp) {
  reg(false, `upload directo anónimo: ${errUp.message} (aplica o v28 no SQL Editor)`);
} else {
  reg(true, `upload directo anónimo OK (policies v28 activas)`);
  // 3) Leitura pública
  const { data: urlPub } = supabaseAnon.storage.from('kb_ficheiros').getPublicUrl(nome);
  const resp = await fetch(urlPub.publicUrl);
  reg(resp.ok, `leitura pública do objeto: HTTP ${resp.status}`);
  // limpeza
  await supabaseSvc?.storage.from('kb_ficheiros').remove([nome]).catch(() => {});
}

console.log(falhas === 0
  ? '\nRESULTADO: v28 aplicado e funcional ✔'
  : `\nRESULTADO: ${falhas} falha(s) — aplica supabase/v28_kb_ficheiros_upload.sql no SQL Editor do Supabase.`);
process.exit(falhas === 0 ? 0 : 1);
