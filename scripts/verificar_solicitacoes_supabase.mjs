/**
 * verificar_solicitacoes_supabase.mjs
 */
import fs from 'fs';

let SUPABASE_URL = 'https://klrclczcahfycfdxzdqs.supabase.co';
let SUPABASE_ANON = '';

try {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('VITE_SUPABASE_URL=') || trimmed.startsWith('SUPABASE_URL=')) {
      SUPABASE_URL = trimmed.split('=')[1].replace(/["']/g, '').trim();
    }
    if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=') || trimmed.startsWith('SUPABASE_ANON_KEY=')) {
      SUPABASE_ANON = trimmed.split('=')[1].replace(/["']/g, '').trim();
    }
  }
} catch (e) {}

async function run() {
  console.log('Querying Supabase solicitacoes_registo at:', SUPABASE_URL);
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/solicitacoes_registo?select=*`, {
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`
    }
  });

  const data = await resp.json();
  console.log('Rows in solicitacoes_registo:', Array.isArray(data) ? data.length : data);
  if (Array.isArray(data)) {
    data.forEach((r, i) => {
      console.log(`[${i + 1}] ID: ${r.id} | BI: ${r.bi_numero} | Nome: ${r.nome_completo || 'N/A'} | Status: ${r.status} | Obs: ${r.observacoes?.slice(0, 50)}`);
    });
  }
}

run().catch(console.error);
