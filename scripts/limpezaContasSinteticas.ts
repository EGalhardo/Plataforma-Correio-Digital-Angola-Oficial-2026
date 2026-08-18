/**
 * limpezaContasSinteticas.ts — Etapa 3: remover contas de TESTE sintéticas
 * ----------------------------------------------------------------------------
 * Apaga do auth.users (Admin API) e de TODAS as tabelas de dados os registos
 * associados a contas sintéticas criadas pelas suites E2E/pilotos:
 *   - cidadãos: bi.XXXXXXXXXlaXXX@cidadao.correiodigital.ao
 *   - agentes:  agente.XXXX@inst.correiodigital.ao
 *
 * PROTECÇÃO ABSOLUTA (nunca apaga):
 *   - bi.002399714la030@cidadao.correiodigital.ao  (dono — Edlasio Galhardo)
 *   - cda.teste.instituicao.2026@gmail.com         (instituição legítima)
 *   - agente.admin-0001@admin.correiodigital.ao    (agente admin real)
 *
 * Uso: npx tsx scripts/limpezaContasSinteticas.ts
 * Requer backup recente (npm run backup:supabase) antes de executar.
 */
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const URL = (process.env.VITE_SUPABASE_URL || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const sb = createClient(URL, KEY, { realtime: { transport: ws as any } });

const EXCLUIR = new Set([
  'bi.002399714la030@cidadao.correiodigital.ao',
  'cda.teste.instituicao.2026@gmail.com',
  'agente.admin-0001@admin.correiodigital.ao',
]);
const ehSintetico = (email: string) =>
  /^bi\.\d{9}la\d{3}@cidadao\.correiodigital\.ao$/i.test(email) ||
  /^agente\.[a-z0-9-]+@inst\.correiodigital\.ao$/i.test(email);

// Tabelas com colunas por BI a varrer (todas as que referenciam cidadãos)
const TABELAS_BI: Record<string, string[]> = {
  messages: ['recipient_bi', 'sender_bi'],
  documents: ['owner_bi', 'bi'],
  contacts: ['owner_bi', 'bi'],
  notifications: ['target_bi', 'bi'],
  user_requests: ['user_bi', 'bi'],
  document_requests: ['user_bi', 'bi'],
  pagamentos: ['destinatario_bi'],
  digital_protocols: ['holder_bi', 'bi'],
  message_state_history: ['message_owner_bi', 'bi'],
};

let apagados = 0, erros = 0;

const resp = await fetch(`${URL}/auth/v1/admin/users?per_page=200`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
const d = await resp.json();
const users: any[] = d.users || [];
const alvo = users.filter(u => ehSintetico(u.email || '') && !EXCLUIR.has((u.email || '').toLowerCase()));

console.log(`🔍 ${alvo.length} contas sintéticas a apagar (de ${users.length} auth users)`);

for (const u of alvo) {
  const email = u.email;
  const bi = /^bi\.(\d{9}la\d{3})@/i.test(email) ? email.replace(/^bi\.(\d{9}la\d{3})@.*$/i, '$1').toUpperCase() : null;
  try {
    // 1) Apagar auth user
    const del = await fetch(`${URL}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    if (!del.ok && del.status !== 404) throw new Error(`auth delete ${del.status}`);
    apagados++;

    // 2) Apagar profile (se existir) + dados por BI
    if (bi) {
      await sb.from('profiles').delete().eq('bi', bi);
      for (const [tabela, colunas] of Object.entries(TABELAS_BI)) {
        for (const col of colunas) {
          await sb.from(tabela).delete().eq(col, bi);
        }
      }
    } else {
      // agente — apagar profile por worker/local-part
      const local = email.split('@')[0];
      await sb.from('profiles').delete().eq('bi', local);
      await sb.from('profiles').delete().eq('email', email);
    }
    console.log(`  ✅ apagado: ${email}${bi ? ` (BI ${bi})` : ''}`);
  } catch (e: any) {
    erros++;
    console.log(`  ❌ erro: ${email} — ${e.message}`);
  }
}

// Verificação final
const resp2 = await fetch(`${URL}/auth/v1/admin/users?per_page=200`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
const d2 = await resp2.json();
const restantes = (d2.users || []).filter(u => ehSintetico(u.email || ''));
const { data: perfis } = await sb.from('profiles').select('bi,email');
console.log(`\n══════════════════════════════════════════`);
console.log(`Apagadas: ${apagados} · Erros: ${erros}`);
console.log(`Auth users restantes: ${(d2.users || []).length} (sintéticas restantes: ${restantes.length})`);
console.log(`Profiles restantes: ${perfis?.length || 0}`);
console.log(restantes.length === 0 && erros === 0 ? '✅ LIMPEZA COMPLETA' : '⚠️ rever pendentes');
