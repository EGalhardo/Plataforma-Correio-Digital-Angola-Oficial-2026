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
 *
 * 2026-09-18 — para deployments de produção confirma também que o domínio
 * de produção (correio-digital-angola-oficial.vercel.app) passou a apontar
 * para o novo deployment. Já aconteceu o build ficar READY sem a Vercel
 * trocar o alias (aliasAssigned=false); nesse caso o script promove o
 * deployment via API (POST /v10/projects/{id}/promote/{deploymentId}) e
 * volta a confirmar. Só termina com sucesso quando a produção serve o
 * commit pedido.
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(raiz);

const PROJETO_ID = 'prj_ostCSaPP5KvYcUeqk8wSsIHjs2Xn'; // correio-digital-angola-oficial
const DOMINIO_PRODUCAO = 'correio-digital-angola-oficial.vercel.app';
const API = 'https://api.vercel.com';
const ESPERA_ENTRE_POLLS_MS = 5000;
const TEMPO_LIMITE_MS = 300000; // 5 minutos
const TEMPO_LIMITE_ALIAS_MS = 180000; // 3 minutos para a troca do alias de produção

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

async function apiVercel(caminho, token, metodo = 'GET') {
  const res = await fetch(`${API}${caminho}`, { method: metodo, headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Vercel API ${res.status}: ${await res.text()}`);
  const texto = await res.text();
  return texto ? JSON.parse(texto) : {};
}

/** Deployment (url) para o qual o domínio de produção aponta neste momento. */
async function alvoDoDominioProducao(token) {
  const { aliases } = await apiVercel(`/v4/aliases?projectId=${PROJETO_ID}&limit=50`, token);
  const a = (aliases || []).find((x) => x.alias === DOMINIO_PRODUCAO);
  return a?.deployment?.url || null;
}

/**
 * Garante que o domínio de produção serve o deployment indicado. Se ao fim
 * de 60 s a Vercel ainda não tiver trocado o alias, promove o deployment
 * pela API e continua a aguardar até TEMPO_LIMITE_ALIAS_MS.
 */
async function confirmarAliasProducao(dep, token) {
  const inicioAlias = Date.now();
  let promovido = false;
  let ultimoAlvo = null;
  while (Date.now() - inicioAlias < TEMPO_LIMITE_ALIAS_MS) {
    const alvo = await alvoDoDominioProducao(token);
    if (alvo !== ultimoAlvo) {
      console.log(`  ${DOMINIO_PRODUCAO} → ${alvo || '(sem alias)'}`);
      ultimoAlvo = alvo;
    }
    if (alvo === dep.url) return true;
    if (!promovido && Date.now() - inicioAlias > 60000) {
      console.log('  … a Vercel não trocou o alias de produção; a promover o deployment via API.');
      await apiVercel(`/v10/projects/${PROJETO_ID}/promote/${dep.uid}`, token, 'POST');
      promovido = true;
    }
    await new Promise((r) => setTimeout(r, ESPERA_ENTRE_POLLS_MS));
  }
  return false;
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
    console.log(`\n✓ Build concluído (${alvo}): https://${dep.url}`);
    if (dep.target === 'production') {
      console.log(`→ A confirmar que ${DOMINIO_PRODUCAO} aponta para este deployment…`);
      const ok = await confirmarAliasProducao(dep, token);
      if (!ok) {
        console.error(`\n✗ ${DOMINIO_PRODUCAO} continua a servir outro deployment. Veja em https://vercel.com/dashboard`);
        process.exit(4);
      }
      console.log(`\n✓ Produção actualizada: https://${DOMINIO_PRODUCAO} (commit ${shaAlvo.slice(0, 7)})`);
    }
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
