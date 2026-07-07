import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// SECURITY FIX: removidas credenciais hardcoded do código-fonte
// Integração Supabase 2026 - Correio Digital Angola
// Project ID: klrclczcahfycfdxzdqs
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://klrclczcahfycfdxzdqs.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const localBootstrap = (process.env.VITE_ENABLE_LOCAL_BOOTSTRAP || 'true') !== 'false';
const mockFallback = (process.env.VITE_ENABLE_MOCK_FALLBACK || 'false') !== 'false';
const autoSeed = (process.env.VITE_ENABLE_SUPABASE_AUTO_SEED || 'false') === 'true';

const key = serviceRoleKey || anonKey;

if (!supabaseUrl || !key) {
  console.error('Missing Supabase credentials. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or ANON key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, key, { realtime: { transport: ws as any } });

const TABLES = [
  'profiles',
  'messages',
  'message_state_history',
  'documents',
  'contacts',
  'notifications',
  'user_requests',
  'document_requests',
  'audit_logs',
  'digital_protocols',
] as const;

async function checkTables() {
  const result: Record<string, { ok: boolean; count?: number; error?: string }> = {};
  for (const table of TABLES) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    result[table] = {
      ok: !error,
      count: typeof count === 'number' ? count : undefined,
      error: error?.message,
    };
  }
  return result;
}

async function main() {
  const tables = await checkTables();
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!serviceRoleKey) warnings.push('SUPABASE_SERVICE_ROLE_KEY ausente: scripts administrativos usam anon key.');
  if (mockFallback) blockers.push('VITE_ENABLE_MOCK_FALLBACK=true — produção deve desativar fallback mock.');
  if (autoSeed) blockers.push('VITE_ENABLE_SUPABASE_AUTO_SEED=true — produção deve desativar auto-seed.');
  if (localBootstrap) warnings.push('VITE_ENABLE_LOCAL_BOOTSTRAP=true — manter apenas se estratégia offline for intencional.');

  for (const [table, info] of Object.entries(tables)) {
    if (!info.ok) blockers.push(`Tabela indisponível: ${table} (${info.error})`);
  }

  console.log(JSON.stringify({
    status: blockers.length === 0 ? 'production-candidate' : 'not-ready',
    runtime: {
      localBootstrap,
      mockFallback,
      autoSeed,
      hasServiceRoleKey: !!serviceRoleKey,
      hasAnonKey: !!anonKey,
      hasSupabaseUrl: !!supabaseUrl,
    },
    tables,
    blockers,
    warnings,
  }, null, 2));
}

main().catch((error) => {
  console.error('Falha ao executar diagnóstico de prontidão de produção:', error);
  process.exit(1);
});
