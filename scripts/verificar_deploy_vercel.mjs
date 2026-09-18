#!/usr/bin/env node
/**
 * CDA — Verificar deploy na Vercel após push para o GitHub.
 * Uso:   node scripts/verificar_deploy_vercel.mjs [commit-sha]
 *        (sem argumento: usa o último commit local)
 * Requer: .env.deploy com VERCEL_TOKEN=... (gitignored)
 *
 * A Vercel está ligada ao repositório GitHub; cada push dispara um
 * deployment. Este script acompanha o deployment até ao estado final
 * (READY / ERROR / CANCELED) e devolve o URL de produção.
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(raiz);

const PROJETO_ID = 'prj_ostCSaPP5KvYcUeqk8wSsIHjs2Xn'; // correio-digital-angola-oficial
const API = 'https://api.vercel.com';
const ESPERA_ENTRE_POLLS_MS = 5000;
const TEMPO_LIMITE_MS = 300000; // 5 minutos

function lerToken() {
  const ficheiro = path.join(raiz, '.env.deploy');
  if (!existsSync(ficheiro)) {
    console.error('ERRO: falta .env.deploy com VERCEL_TOKEN.');
    process.exit(1);
  }
  const linha = readFileSync(ficheiro, 'utf8').split('\n').find((l) => l.startsWith('VERCEL_TOKEN='));
  const token = (linha || '').split('=').slice(1).join('=').trim().replace(/"/g, '');
  if (!token) {
    console.error('ERRO: VERCEL_TOKEN vazio em .env.deploy.');
    process.exit(1);
  }
  return token;
}

async function apiVercel(caminho, token) {
  const res = await fetch(`${API}${caminho}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Vercel API ${res.status}: ${await res.text()}`);
  return res.json();
}

const shaAlvo = process.argv[2] || execSync('git rev-parse HEAD').toString().trim();
const token = lerToken();
console.log(`→ A acompanhar deployment da Vercel para o commit ${shaAlvo.slice(0, 12)}…`);

const inicio = Date.now();
let ultimoEstado = null;
while (Date.now() - inicio < TEMPO_LIMITE_MS) {
  const { deployments } = await apiVercel(`/v6/deployments?projectId=${PROJETO_ID}&limit=10`, token);
  const dep = deployments.find((d) => (d.meta?.githubCommitSha || '').startsWith(shaAlvo));

  if (!dep) {
    if (!ultimoEstado) console.log('  … deployment ainda não criado pela Vercel (webhook do GitHub).');
    await new Promise((r) => setTimeout(r, ESPERA_ENTRE_POLLS_MS));
    continue;
  }

  if (dep.state !== ultimoEstado) {
    console.log(`  estado: ${dep.state}`);
    ultimoEstado = dep.state;
  }

  if (dep.state === 'READY') {
    const alvo = dep.target === 'production' || dep.target === 'staging' ? dep.target : 'preview';
    console.log(`\n✓ Deploy concluído (${alvo}): https://${dep.url}`);
    process.exit(0);
  }
  if (['ERROR', 'CANCELED'].includes(dep.state)) {
    console.error(`\n✗ Deploy falhou com estado ${dep.state}. Veja em https://vercel.com/dashboard`);
    process.exit(2);
  }
  await new Promise((r) => setTimeout(r, ESPERA_ENTRE_POLLS_MS));
}
console.error('\n✗ Tempo limite excedido à espera do deployment.');
process.exit(3);
