// ============================================================================
// Paridade do núcleo «Inquérito com IA» (PROMPT v3, 2026-09-10)
// ----------------------------------------------------------------------------
// src/services/inqueritoIaCore.ts é importado por server.ts (dev) e copiado
// MANUALMENTE para api/index.ts (Vercel não importa fora de api/). Este teste
// falha se as duas versões divergirem (ignorando a palavra `export`).
// Executar: node testes/paridade_inquerito_ia_core.mjs
// ============================================================================
import { readFileSync } from 'node:fs';

const core = readFileSync(new URL('../src/services/inqueritoIaCore.ts', import.meta.url), 'utf8');
const api = readFileSync(new URL('../api/index.ts', import.meta.url), 'utf8');

const idx = core.indexOf('export type TipoCampoIA');
const corpoCore = idx < 0 ? null : 'type TipoCampoIA' + core.slice(idx + 'export type TipoCampoIA'.length);
const ini = api.indexOf('// ===INQ-IA-CORE-INICIO===');
const fim = api.indexOf('// ===INQ-IA-CORE-FIM===');
if (!corpoCore || ini < 0 || fim < 0) {
  console.error('✘ marcadores do núcleo embutido não encontrados.');
  process.exit(1);
}
const normalizar = (t) => t.replace(/^export /gm, '').replace(/\s+$/gm, '').trim();
const a = normalizar(corpoCore);
const b = normalizar(api.slice(ini + '// ===INQ-IA-CORE-INICIO==='.length, fim));

if (a === b) {
  console.log(`✔ paridade OK — núcleo partilhado (${a.length} chars) idêntico à cópia embutida em api/index.ts`);
  process.exit(0);
}
const la = a.split('\n'), lb = b.split('\n');
for (let i = 0; i < Math.max(la.length, lb.length); i++) {
  if (la[i] !== lb[i]) {
    console.error(`✘ divergência na linha ${i + 1}:\n  core: ${la[i]}\n  api : ${lb[i]}`);
    break;
  }
}
process.exit(1);
