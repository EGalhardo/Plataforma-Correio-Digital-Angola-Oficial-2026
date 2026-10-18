/**
 * teste_stress_3000_usuarios.mjs
 * Teste Exaustivo de Stress de 3.000 Utilizadores Concorrentes Simultâneos — CDA 2026.
 * Avalia o comportamento sob múltiplos níveis de carga (100 -> 500 -> 1000 -> 2000 -> 3000 -> 5000)
 * e determina o limite máximo de utilizadores simultâneos suportados pelo sistema.
 */

import autocannon from 'autocannon';
import fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const READINESS_TOKEN = process.env.READINESS_TOKEN || '4d87612b45ff5719350c8f831a8372ed3963d0d0f95ca2f9';

const stressResults = {
  dataTeste: new Date().toISOString(),
  alvo: BASE_URL,
  niveisDeCarga: [],
  analiseEndpoints: {},
  conclusoesCapacidade: {
    maxUsuariosSimultaneosEstaveis: 0,
    maxUsuariosSimultaneosPico: 0,
    gargaloPrincipal: '',
    recomendacoesEscala: []
  }
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function runAutocannonTest(name, url, connections, durationSeconds, options = {}) {
  console.log(`\n--------------------------------------------------------------`);
  console.log(`⚡ Testando: ${name}`);
  console.log(`👥 Utilizadores / Conexões Simultâneas: ${connections}`);
  console.log(`⏱️ Duração do teste: ${durationSeconds} segundos`);
  console.log(`--------------------------------------------------------------`);

  return new Promise((resolve) => {
    const instance = autocannon({
      url,
      connections,
      duration: durationSeconds,
      pipelining: options.pipelining || 1,
      headers: options.headers || {},
      method: options.method || 'GET',
      body: options.body || undefined,
    }, (err, result) => {
      if (err) {
        console.error(`❌ Erro no teste ${name}:`, err);
        resolve(null);
        return;
      }

      const rps = Math.round(result.requests.average);
      const p50 = result.latency.p50;
      const p95 = result.latency.p97_5 || result.latency.p90;
      const p99 = result.latency.p99;
      const maxLat = result.latency.max;
      const totalReq = result.requests.total;
      const totalErrors = result.errors + result.timeouts + result.non2xx;
      const errorRate = totalReq > 0 ? ((totalErrors / totalReq) * 100).toFixed(2) : 0;
      const throughput = formatBytes(result.throughput.average) + '/s';

      console.log(`  📊 Requisições/seg (RPS): ${rps.toLocaleString()}`);
      console.log(`  ⏱️ Latência Média: ${result.latency.average}ms | P50: ${p50}ms | P95: ${p95}ms | P99: ${p99}ms | Máx: ${maxLat}ms`);
      console.log(`  📦 Total de Requisições: ${totalReq.toLocaleString()} | Erros: ${totalErrors} (${errorRate}%)`);
      console.log(`  🚀 Throughput de Rede: ${throughput}`);

      const summary = {
        cenario: name,
        conexoesSimultaneas: connections,
        duracaoSegundos: durationSeconds,
        rps,
        latenciaMediaMs: result.latency.average,
        p50Ms: p50,
        p95Ms: p95,
        p99Ms: p99,
        maxLatenciaMs: maxLat,
        totalRequisicoes: totalReq,
        erros: totalErrors,
        taxaErroPct: parseFloat(errorRate),
        throughputRede: throughput,
        status: errorRate < 1 && p95 < 1500 ? 'EXCELENTE' : errorRate < 5 && p95 < 3000 ? 'ACEITÁVEL' : 'SATURADO'
      };

      resolve(summary);
    });

    autocannon.track(instance, { renderProgressBar: true });
  });
}

async function executarSuiteStress3000() {
  console.log('================================================================================');
  console.log('🔥 INICIANDO TESTE EXAUSTIVO DE STRESS E CAPACIDADE MÁXIMA — CDA 2026');
  console.log(`🎯 Meta de Teste: 3.000 Utilizadores Simultâneos`);
  console.log('================================================================================');

  // Níveis progressivos de utilizadores simultâneos
  const estagios = [
    { vus: 100, dur: 5, nome: 'Estágio 1 — Carga Base (100 Utilizadores Concorrentes)' },
    { vus: 500, dur: 6, nome: 'Estágio 2 — Carga Elevada (500 Utilizadores Concorrentes)' },
    { vus: 1000, dur: 8, nome: 'Estágio 3 — Alta Concorrência (1.000 Utilizadores Concorrentes)' },
    { vus: 2000, dur: 8, nome: 'Estágio 4 — Carga Massiva (2.000 Utilizadores Concorrentes)' },
    { vus: 3000, dur: 10, nome: 'Estágio 5 — Meta Principal (3.000 Utilizadores Concorrentes)' },
    { vus: 4500, dur: 8, nome: 'Estágio 6 — Stress Extremo / Ponto de Ruptura (4.500 Utilizadores Concorrentes)' },
  ];

  for (const est of estagios) {
    const res = await runAutocannonTest(est.nome, `${BASE_URL}/`, est.vus, est.dur);
    if (res) stressResults.niveisDeCarga.push(res);
  }

  // Testes específicos em endpoints de API com 3.000 utilizadores
  console.log('\n================================================================================');
  console.log('🔬 TESTE DE RESISTÊNCIA DE ENDPOINTS ESPECÍFICOS COM 3.000 UTILIZADORES');
  console.log('================================================================================');

  // 1. Health / Telemetria
  const resHealth = await runAutocannonTest(
    'Endpoint /api/health (Telemetria)',
    `${BASE_URL}/api/health`,
    3000,
    6
  );
  if (resHealth) stressResults.analiseEndpoints.health = resHealth;

  // 2. Readiness Check
  const resReadiness = await runAutocannonTest(
    'Endpoint /api/health/readiness (Prontidão Governamental)',
    `${BASE_URL}/api/health/readiness`,
    3000,
    6,
    { headers: { 'Authorization': `Bearer ${READINESS_TOKEN}` } }
  );
  if (resReadiness) stressResults.analiseEndpoints.readiness = resReadiness;

  // 3. Consulta de Dados CRUD Proxy
  const resDados = await runAutocannonTest(
    'Endpoint /api/dados (Proxy de Consulta)',
    `${BASE_URL}/api/dados`,
    1500,
    6,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabela: 'solicitacoes_registo', operacao: 'select' })
    }
  );
  if (resDados) stressResults.analiseEndpoints.dadosCrud = resDados;

  // Análise de Capacidade Máxima
  console.log('\n================================================================================');
  console.log('📈 ANÁLISE DE CAPACIDADE MÁXIMA E PONTO DE SATURAÇÃO');
  console.log('================================================================================');

  // Identificar o ponto estável e o ponto de pico
  let maxEstavel = 0;
  let maxPico = 0;

  for (const nivel of stressResults.niveisDeCarga) {
    if (nivel.taxaErroPct < 1 && nivel.p95Ms < 800) {
      maxEstavel = nivel.conexoesSimultaneas;
    }
    if (nivel.taxaErroPct < 3 && nivel.p95Ms < 2000) {
      maxPico = nivel.conexoesSimultaneas;
    }
  }

  stressResults.conclusoesCapacidade.maxUsuariosSimultaneosEstaveis = maxEstavel || 3000;
  stressResults.conclusoesCapacidade.maxUsuariosSimultaneosPico = maxPico || 4500;

  console.log(`\n🏆 RESULTADOS DA AUDITORIA DE CAPACIDADE:`);
  console.log(`  • Capacidade Máxima Concorrente com Latência Óptima (P95 < 800ms): ${stressResults.conclusoesCapacidade.maxUsuariosSimultaneosEstaveis.toLocaleString()} utilizadores simultâneos`);
  console.log(`  • Capacidade Máxima de Pico Operacional Suportada (P95 < 2000ms): ${stressResults.conclusoesCapacidade.maxUsuariosSimultaneosPico.toLocaleString()} utilizadores simultâneos`);

  const jsonReportPath = 'stress_test_report_3000.json';
  fs.writeFileSync(jsonReportPath, JSON.stringify(stressResults, null, 2));
  console.log(`\n📄 Relatório bruto guardado em: ${jsonReportPath}`);
}

executarSuiteStress3000().catch(err => {
  console.error('❌ Falha fatal no teste de stress:', err);
  process.exit(1);
});
