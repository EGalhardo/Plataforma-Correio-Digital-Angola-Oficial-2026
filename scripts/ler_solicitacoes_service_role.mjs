/**
 * ler_solicitacoes_service_role.mjs
 */
import fs from 'fs';

let SUPABASE_URL = 'https://klrclczcahfycfdxzdqs.supabase.co';
let SERVICE_KEY = '';

try {
  const envContent = fs.readFileSync('.env', 'utf8') + '\n' + (fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      SERVICE_KEY = trimmed.split('=')[1].replace(/["']/g, '').trim();
    }
    if (trimmed.startsWith('VITE_SUPABASE_URL=') || trimmed.startsWith('SUPABASE_URL=')) {
      SUPABASE_URL = trimmed.split('=')[1].replace(/["']/g, '').trim();
    }
  }
} catch (e) {}

async function run() {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/solicitacoes_registo?select=*`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`
    }
  });

  const data = await resp.json();
  console.log('Total rows in solicitacoes_registo (service role):', data.length);
  data.forEach((r, i) => {
    console.log(`[${i + 1}] ID: ${r.id} | BI: ${r.bi_numero} | Nome: ${r.nome || r.nome_completo || 'N/A'} | Status: ${r.status}`);
  });
}

run().catch(console.error);
