/**
 * Remove os cidadãos de demonstração inseridos em `profiles` para testes.
 *
 * Inseridos em 2026-11-04 a partir de MOCK_USERS (src/constants/mocks.ts).
 * Nenhum destes BI existia em `profiles` antes — as 7 linhas pré-existentes
 * (002399714LA030, 005404692BO043, ADMIN-0001, AGT, AGT-LMM, AGT-LMM-01, CDA)
 * NÃO são tocadas.
 *
 * Uso:
 *   node scripts/limpar_seed_profiles.mjs            # simulação (mostra o que faria)
 *   node scripts/limpar_seed_profiles.mjs --aplicar  # remove de facto
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const aplicar = process.argv.includes('--aplicar');

function lerEnv() {
  const env = {};
  for (const f of ['.env', '.env.local']) {
    try {
      for (const linha of readFileSync(path.join(raiz, f), 'utf8').split('\n')) {
        const m = linha.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)$/);
        if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    } catch { /* opcional */ }
  }
  return { ...env, ...process.env };
}

const env = lerEnv();
const URL_BASE = env.SUPABASE_URL;
const SR = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !SR) {
  console.error('ERRO: faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env');
  process.exit(1);
}

const SEED = [
  '009874562LA041', '008812342LA011', '007712342LA021', '009991332LA018',
  '001122334LA055', '002233445LA066', '003344556LA077',
];

const hdr = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };

const atuais = await (await fetch(`${URL_BASE}/rest/v1/profiles?select=bi,name&order=bi`, { headers: hdr })).json();
const alvo = atuais.filter(r => SEED.includes(String(r.bi).toUpperCase()));

console.log(`Linhas em profiles: ${atuais.length}`);
console.log(`Correspondem ao seed: ${alvo.length}`);
for (const r of alvo) console.log(`  - ${r.bi} | ${r.name}`);

if (!alvo.length) { console.log('\nNada a remover.'); process.exit(0); }
if (!aplicar) {
  console.log('\n(simulação) Correr com --aplicar para remover.');
  process.exit(0);
}

const filtro = alvo.map(r => `"${r.bi}"`).join(',');
const url = `${URL_BASE}/rest/v1/profiles?bi=in.(${filtro})`;
const res = await fetch(url, { method: 'DELETE', headers: { ...hdr, Prefer: 'return=representation' } });
const removidas = res.ok ? await res.json() : null;
console.log(`\nDELETE -> HTTP ${res.status} | removidas: ${Array.isArray(removidas) ? removidas.length : 0}`);

const depois = await (await fetch(`${URL_BASE}/rest/v1/profiles?select=bi`, { headers: hdr })).json();
console.log(`Linhas em profiles agora: ${depois.length}`);
