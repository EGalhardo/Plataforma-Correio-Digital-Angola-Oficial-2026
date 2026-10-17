/**
 * seed_mario_quiuma_supabase.mjs
 * Insere a solicitação de registo do cidadão Mario Quiuma na base central do Supabase
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
  console.log('Inserindo solicitação de registo de Mario Quiuma no Supabase:', SUPABASE_URL);
  
  const payload = {
    nome: 'MARIO SEGUNDA QUIUMA',
    email: 'marioquiuma@gmail.com',
    bi_numero: '005404692BO043',
    status: 'Pendente',
    observacoes: '[PVIC] score:98% | Coerência biofísica e OCR sem desconformidade detetada.',
    url_frente: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&h=400&fit=crop',
    url_verso: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&h=400&fit=crop',
    url_selfie: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face'
  };

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/solicitacoes_registo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  const resText = await resp.text();
  console.log('Status:', resp.status, 'Response:', resText);
}

run().catch(console.error);
