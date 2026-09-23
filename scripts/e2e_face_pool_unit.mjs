// TESTE UNITÁRIO REAL — faceAuth.buildFaceMatchPool (a função EXACTA que o app usa).
// Transpila src/services/faceAuth.ts via esbuild e importa o módulo real.
// Reproduz o bug (pool preso à chave exacta) vs comportamento corrigido.
import { execSync } from 'node:child_process';
import fs from 'node:fs';

import { fileURLToPath } from 'node:url';
import path from 'node:path';
const __init_dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(__init_dirname, '..'); // raiz do repositório
const out = '/tmp/faceAuth_qa.mjs';
execSync(`npx esbuild ${repo}/src/services/faceAuth.ts --format=esm --outfile=${out}`, { stdio: 'pipe' });
const face = await import('file://' + out);

const falhas = [];
const INST = (process.env.QA_INST || '').trim();
if (!INST) { console.error('ERRO: defina QA_INST no env (agente institucional para fixture multi-área).'); process.exit(1); }
const ok = (n, c, x = '') => { console.log(`${c ? '[PASS]' : '[FAIL]'} ${n}${x ? ' — ' + x : ''}`); if (!c) falhas.push(n); };

// fixtures: 2 matrizes no dispositivo — B.I. real (via env QA_BI_A) + «veneno» na chave demo
// público da app (009874562LA041 — já consta do próprio código-fonte de dev-login).
const BI_A = (process.env.QA_BI_A || '').trim();
if (!BI_A) { console.error('ERRO: defina QA_BI_A no env (B.I. de cidadão para fixtures).'); process.exit(1); }
const faces = [
  { key: `cda_demo_face_user_${BI_A}`, mode: 'user', identifier: BI_A },
  { key: 'cda_demo_face_user_009874562LA041', mode: 'user', identifier: '009874562LA041' },
];

// 1) pool vem SEMPRE com todas as matrizes
const p1 = face.buildFaceMatchPool(faces, '');
ok('pool com identidade vazia inclui TODAS as matrizes', p1.length === 2, `n=${p1.length}`);

// 2) a candidata da identidade (última usada) fica 1.ª sem excluir a outra
const p2 = face.buildFaceMatchPool(faces, '009874562LA041');
ok('identidade em memória fica primeiro MAS a outra conta fica elegível', p2.length === 2 && p2[0].identifier === '009874562LA041' && p2.some(f => f.identifier === BI_A), JSON.stringify(p2.map(f => f.identifier)));

// 3) BUG (lógica anterior) vs CORRECÇÃO com a mesma situação real do dono
const stored = faces.find(f => f.key === 'cda_demo_face_user_009874562LA041'); // chave exacta c/ bi vazio → cai no demo
const poolAntiAntes = stored ? [stored] : faces;                         // comportamento pré-fix
const poolDepois = face.buildFaceMatchPool(faces, '');                      // comportamento actual
ok('pré-fix ficaria PRESO ao veneno (1 matriz)', poolAntiAntes.length === 1 && poolAntiAntes[0].identifier === '009874562LA041');
ok('pós-fix coerencia passa pelas 2 matrizes (bug 1 resolvido)', poolDepois.length === 2, `n=${poolDepois.length}`);

// 4) sanidade da assinatura simulada/limiar usada na via sem câmara
const sA = face.makeSimulatedSignature(60);
const sB = face.makeSimulatedSignature(60);
ok('assinatura simulada determinística (mesma semente -> diff 0)', face.compareFaceSignatures(sA, sB) === 0);
const sC = face.makeSimulatedSignature(61);
ok('sementes diferentes ficam acima do limiar 26', face.compareFaceSignatures(sA, sC) > 26, `diff=${face.compareFaceSignatures(sA, sC).toFixed(1)}`);

// 5) listDeviceFaceTemplates com tipos mistos (BI, instituição, admin) — todas elegíveis
const faces3 = [...faces, { key: `cda_demo_face_institution_${INST}`, mode: 'institution', identifier: INST }];
const p3 = face.buildFaceMatchPool(faces3, INST);
ok('pool multi-área inclui instituição e reordena pelo alvo', p3.length === 3 && p3[0].identifier === INST);

console.log(falhas.length ? `\nRESULTADO UNI: FALHOU (${falhas.join(' | ')})` : '\nRESULTADO UNI: VERDE');
process.exit(falhas.length ? 1 : 0);
