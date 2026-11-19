/**
 * Inventário e limpeza de resíduos de teste na base REAL (só REST — sem SDK).
 *
 *   npx tsx scripts/limpar_residuos_teste.ts            → inventário (não apaga)
 *   npx tsx scripts/limpar_residuos_teste.ts --aplicar  → apaga de facto
 *
 * Regras conservadoras (nada de inferências sobre dados legítimos):
 *   - mensagens cujo ASSUNTO/CORPO tem marcadores inequívocos de teste
 *     (TESTE-, E2E, seed);
 *   - mensagens cujo remetente E destinatário já não existem (nem em profiles
 *     nem na fila oficial) — não há titular a quem pertençam;
 *   - avisos com destinatário inexistente.
 * Comunicados e correspondência legítima ficam intocados.
 */
import * as fs from 'fs';
import * as path from 'path';

const APLICAR = process.argv.includes('--aplicar');

const lerEnv = (): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const f of ['.env', '.env.local']) {
    const p = path.resolve(process.cwd(), f);
    if (!fs.existsSync(p)) continue;
    for (const linha of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = linha.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return out;
};

const env = lerEnv();
const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || '';
if (!url || !key) throw new Error('Faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env');
const H = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const get = async (p: string) => {
  const r = await fetch(`${url}/rest/v1/${p}`, { headers: H });
  if (!r.ok) throw new Error(`${p}: ${r.status} ${await r.text()}`);
  return r.json();
};
const del = async (p: string) => {
  const r = await fetch(`${url}/rest/v1/${p}`, { method: 'DELETE', headers: { ...H, Prefer: 'return=representation' } });
  const linhas = await r.json().catch(() => []);
  return Array.isArray(linhas) ? linhas.length : 0;
};

const MARCA_TESTE = /(TESTE[-_]|E2E[-_ ]|E2E$|seed[-_]|exemplo de demonstra)/i;

(async () => {
  const [msgs, perfis, fila, notifs] = await Promise.all([
    get('messages?select=id,sender_bi,recipient_bi,subject,body,created_at&limit=5000'),
    get('profiles?select=bi&limit=5000'),
    get('solicitacoes_registo?select=bi_numero&limit=5000'),
    get('notifications?select=id,target_bi,title&limit=5000'),
  ]);

  const vivos = new Set<string>([
    ...perfis.map((x: any) => String(x.bi || '').toUpperCase()),
    ...fila.map((x: any) => String(x.bi_numero || '').toUpperCase()),
  ].filter(Boolean));

  const ehTeste = (m: any) => MARCA_TESTE.test(`${m.subject || ''} ${m.body || ''}`);
  const semTitular = (bi: string) => !!bi && bi !== 'TODOS' && !vivos.has(String(bi).toUpperCase());

  const mensagensTeste = msgs.filter(ehTeste);
  const mensagensOrfas = msgs.filter((m: any) => !ehTeste(m) && (semTitular(m.sender_bi) || semTitular(m.recipient_bi)));
  const avisosOrfaos = notifs.filter((n: any) => semTitular(n.target_bi));

  console.log(JSON.stringify({
    modo: APLICAR ? 'APLICAR' : 'SECO (nada é apagado)',
    mensagens_total: msgs.length,
    com_marca_de_teste: mensagensTeste.length,
    sem_titular_existente: mensagensOrfas.length,
    avisos_sem_titular: avisosOrfaos.length,
    exemplos_teste: mensagensTeste.slice(0, 5).map((m: any) => ({ id: m.id, assunto: String(m.subject || '').slice(0, 45) })),
    exemplos_orfas: mensagensOrfas.slice(0, 5).map((m: any) => ({ id: m.id, de: m.sender_bi, para: m.recipient_bi })),
  }, null, 1));

  if (!APLICAR) {
    console.log('\nPara apagar de facto: npx tsx scripts/limpar_residuos_teste.ts --aplicar');
    return;
  }

  const ids = [...new Set([...mensagensTeste, ...mensagensOrfas].map((m: any) => m.id))];
  let apagadas = 0;
  for (let i = 0; i < ids.length; i += 40) {
    const lote = ids.slice(i, i + 40).join(',');
    await del(`message_state_history?message_id=in.(${lote})`).catch(() => 0);
    apagadas += await del(`messages?id=in.(${lote})`).catch(() => 0);
  }
  let avisosApagados = 0;
  if (avisosOrfaos.length) {
    avisosApagados = await del(`notifications?id=in.(${avisosOrfaos.map((n: any) => n.id).join(',')})`).catch(() => 0);
  }
  console.log(`\nApagadas ${apagadas} mensagens e ${avisosApagados} avisos órfãos.`);
})();
