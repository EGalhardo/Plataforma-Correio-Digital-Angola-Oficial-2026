import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://klrclczcahfycfdxzdqs.supabase.co';
const supabaseKey = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_ANON_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or ANON key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { realtime: { transport: ws as any } });

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

async function verify() {
  console.log('Verificando o estado do projeto Supabase...');
  for (const table of TABLES) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(`${table}:`, error ? `ERRO -> ${error.message}` : `${count} registos`);
  }

  const { data: latestMessages } = await supabase.from('messages').select('id, org, sender_bi, recipient_bi, subject, created_at').order('created_at', { ascending: false }).limit(5);
  console.log('\nÚltimas mensagens:', latestMessages || []);

  const { data: latestRequests } = await supabase.from('document_requests').select('id, user_name, user_bi, doc_type, status, request_date').order('id', { ascending: false }).limit(5);
  console.log('\nÚltimos pedidos documentais:', latestRequests || []);

  const { data: latestLogs } = await supabase.from('audit_logs').select('id, action, username, timestamp, action_type').order('id', { ascending: false }).limit(5);
  console.log('\nÚltimos logs de auditoria:', latestLogs || []);
}

verify().catch((error) => {
  console.error('Falha ao verificar o Supabase:', error);
  process.exit(1);
});
