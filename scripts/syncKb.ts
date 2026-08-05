// ============================================================================
// syncKb.ts — Etapa A / E2 (2026-08-05)
// Injeta o conteúdo de api/kb/* (FONTE ÚNICA) na secção marcada de
// api/index.ts, porque a Vercel não tolera imports locais novos no entry
// (FUNCTION_INVOCATION_FAILED confirmado 2x em 2026-08-05).
//
// Uso (a partir da raiz do repo):
//   npx tsx scripts/syncKb.ts
//
// Depois de correr: tsc --noEmit + bateria (f_e2e3_kb_conteudo.mts valida a
// paridade byte-a-byte do JSON injetado vs. api/kb/registoKb.ts).
// ============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { KB_REGISTO } from '../api/kb/registoKb';

const API_PATH = 'api/index.ts';

const api = readFileSync(API_PATH, 'utf8');

const MARCADOR_INICIO = '// ===KB-INICIO===';
const MARCADOR_FIM = '// ===KB-FIM===';
const padrao = new RegExp(
  `${MARCADOR_INICIO.replace(/[/]/g, '\\/')}[\\s\\S]*?${MARCADOR_FIM.replace(/[/]/g, '\\/')}`
);
const alvo = api.match(padrao);
if (!alvo) {
  console.error('ERRO: marcadores ===KB-INICIO===/===KB-FIM=== não encontrados em api/index.ts');
  process.exit(1);
}

const totalFontes = KB_REGISTO.reduce((acc, inst) => acc + inst.fontes.length, 0);
const bloco = [
  `${MARCADOR_INICIO} (GERADO por scripts/syncKb.ts — NÃO EDITAR A MÃO: editar api/kb/*Kb.ts e correr "npx tsx scripts/syncKb.ts")`,
  `const KB_REGISTO: KbInstituicao[] = ${JSON.stringify(KB_REGISTO, null, 2)};`,
  MARCADOR_FIM,
].join('\n');

writeFileSync(API_PATH, api.replace(alvo[0], bloco));
console.log(`KB sincronizada em ${API_PATH}: ${KB_REGISTO.length} instituições, ${totalFontes} fontes.`);
