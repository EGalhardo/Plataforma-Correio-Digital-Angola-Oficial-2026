/**
 * E2E — CAMINHO REAL do lookup de cidadão (sem modo demo).
 *
 * Prova que, com um JWT de instituição válido, a RPC `cda_cidadao_lookup_bi`
 * devolve o nome oficial a partir de `profiles` — que é o caminho usado em
 * produção (o modo demo tem um ramo próprio em VideoSessionPage.tsx).
 *
 * Cria um utilizador Auth de teste com o claim `instituicao`, faz login, chama
 * a RPC e REMOVE o utilizador no fim (não deixa credenciais na base).
 *
 * Uso: node scripts/e2e_caminho_real_lookup.mjs
 * Requer: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (lê do .env)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function lerEnv() {
  const env = {};
  for (const f of ['.env', '.env.local']) {
    try {
      for (const linha of readFileSync(path.join(raiz, f), 'utf8').split('\n')) {
        const m = linha.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)$/);
        if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    } catch { /* ficheiro opcional */ }
  }
  return { ...env, ...process.env };
}

const env = lerEnv();
const URL_BASE = env.SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

if (!URL_BASE || !SERVICE || !ANON) {
  console.error('ERRO: faltam SUPABASE_URL / SERVICE_ROLE_KEY / ANON_KEY no .env');
  process.exit(1);
}

const EMAIL = 'e2e.instituicao@cda-teste.local';
const PASSWORD = 'CdaE2E!2026#Test';
const CLAIM = { role: 'institution', instituicao: 'AGT-9921-SR', bi: 'AGT-9921-SR' };

let pass = 0, fail = 0;
const check = (nome, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FALHA'} | ${nome}${extra ? ' -> ' + extra : ''}`);
  ok ? pass++ : fail++;
};

const api = async (caminho, opts = {}) => {
  const r = await fetch(`${URL_BASE}${caminho}`, opts);
  const texto = await r.text();
  let json = null;
  try { json = JSON.parse(texto); } catch { /* resposta vazia */ }
  return { status: r.status, json, texto };
};

const hdrServico = {
  apikey: SERVICE,
  Authorization: `Bearer ${SERVICE}`,
  'Content-Type': 'application/json',
};

// --- 1) garantir o utilizador de teste (idempotente) ---
let userId = null;
{
  const lista = await api('/auth/v1/admin/users?per_page=200', { headers: hdrServico });
  const existente = (lista.json?.users || []).find(u => u.email === EMAIL);
  if (existente) {
    userId = existente.id;
    console.log('→ utilizador de teste já existia, a reutilizar');
  } else {
    const criado = await api('/auth/v1/admin/users', {
      method: 'POST',
      headers: hdrServico,
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true, app_metadata: CLAIM }),
    });
    userId = criado.json?.id || null;
    console.log('→ utilizador de teste criado');
  }
}
check('utilizador Auth de teste disponível', !!userId);

// --- 2) login para obter JWT com o claim ---
const login = await api('/auth/v1/token?grant_type=password', {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const token = login.json?.access_token || '';
check('login devolve JWT', !!token, token ? `${token.slice(0, 18)}…` : `HTTP ${login.status}`);
check('JWT contém claim instituicao',
      !!token && (() => {
        try {
          const p = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
          return !!JSON.parse(Buffer.from(p, 'base64').toString()).app_metadata?.instituicao;
        } catch { return false; }
      })());

// --- 3) RPC real ---
const rpc = (bi) => api('/rest/v1/rpc/cda_cidadao_lookup_bi', {
  method: 'POST',
  headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_bi: bi }),
});

for (const [bi, nomeEsperado] of [
  ['009874562LA041', 'Edlasio Galhardo'],
  ['008812342LA011', 'Maria Antónia'],
  ['007712342LA021', 'José Kalunga'],
]) {
  const r = await rpc(bi);
  const linha = Array.isArray(r.json) ? r.json[0] : null;
  check(`RPC real · ${bi}`, r.status === 200 && linha?.name === nomeEsperado,
        linha ? `name="${linha.name}"` : `HTTP ${r.status} ${r.texto.slice(0, 80)}`);
}

{
  const r = await rpc('000000000XX999');
  check('RPC real · BI inexistente devolve vazio',
        r.status === 200 && Array.isArray(r.json) && r.json.length === 0, `HTTP ${r.status}`);
}

// --- 4) controlo negativo: sem JWT o gate recusa (é o comportamento correto) ---
{
  const r = await api('/rest/v1/rpc/cda_cidadao_lookup_bi', {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_bi: '009874562LA041' }),
  });
  check('gate sem JWT recusa (42501)', r.status === 401 || r.json?.code === '42501', `HTTP ${r.status}`);
}

// --- 5) limpar: remover o utilizador de teste ---
if (userId) {
  const del = await api(`/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers: hdrServico });
  check('utilizador de teste removido', del.status === 200 || del.status === 204, `HTTP ${del.status}`);
}

console.log(`\n=== RESULTADO: ${pass} PASS / ${fail} FALHA ===`);
process.exit(fail === 0 ? 0 : 1);
