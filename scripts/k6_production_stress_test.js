// ============================================================================
// SUITE GRAFANA K6: TESTE DE STRESS E CONCORRÊNCIA EM PRODUÇÃO (VERCEL CDN)
// Plataforma Oficial Correio Digital de Angola (CDA 2026)
// ============================================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('cda_prod_error_rate');
const edgeLatency = new Trend('cda_prod_edge_latency_ms');
const spaLatency = new Trend('cda_prod_spa_latency_ms');
const healthLatency = new Trend('cda_prod_health_latency_ms');
const successfulRequests = new Counter('cda_prod_successful_requests');

export const options = {
  scenarios: {
    production_concurrency: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '5s', target: 30 },   // Rampa inicial: 30 VUs
        { duration: '10s', target: 100 }, // Carga sustentada: 100 VUs
        { duration: '10s', target: 200 }, // Stress de pico: 200 VUs
        { duration: '5s', target: 0 },    // Descompressão
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],                  // Falhas HTTP < 2%
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // 95% < 1000ms
    cda_prod_error_rate: ['rate<0.02'],              // Erros < 2%
  },
};

const PROD_URL = __ENV.BASE || 'https://correio-digital-angola-oficial.vercel.app';

export default function () {
  const headers = {
    'Accept': 'text/html,application/xhtml+xml,application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CDA-K6-LoadTest/2026',
  };

  group('01. Edge CDN & Landing Page', () => {
    const res = http.get(`${PROD_URL}/`, { headers });
    const isOk = check(res, {
      'Edge status 200': (r) => r.status === 200,
      'Conteúdo CDA presente': (r) => r.body && r.body.length > 100,
      'Edge CDN latency < 800ms': (r) => r.timings.duration < 800,
    });
    edgeLatency.add(res.timings.duration);
    errorRate.add(!isOk);
    if (isOk) successfulRequests.add(1);
  });

  group('02. Rotas Públicas SPA em Produção', () => {
    const routes = ['/#/login', '/institucional#/login', '/admin#/login'];
    const r = routes[Math.floor(Math.random() * routes.length)];
    const res = http.get(`${PROD_URL}${r}`, { headers });
    const isOk = check(res, {
      'Rota pública status 200': (r) => r.status === 200,
      'Rota pública latency < 800ms': (r) => r.timings.duration < 800,
    });
    spaLatency.add(res.timings.duration);
    errorRate.add(!isOk);
    if (isOk) successfulRequests.add(1);
  });

  group('03. API Health em Produção', () => {
    const res = http.get(`${PROD_URL}/api/health`, { headers });
    const isOk = check(res, {
      'API Health responde (status < 500)': (r) => r.status < 500,
    });
    healthLatency.add(res.timings.duration);
    errorRate.add(!isOk);
    if (isOk) successfulRequests.add(1);
  });

  sleep(0.08); // Cadência de requisição
}
