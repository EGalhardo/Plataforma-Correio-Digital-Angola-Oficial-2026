// ============================================================================
// SUITE GRAFANA K6: TESTE DE CARGA MASSIVA E STRESS CONCORRENTE — CDA 2026
// Simulação de Tráfego Cívico Governamental de Alta Escala
// ============================================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Métricas Customizadas de Telemetria
const errorRate = new Rate('cda_error_rate');
const healthLatency = new Trend('cda_health_latency_ms');
const spaLatency = new Trend('cda_spa_latency_ms');
const apiCadastroLatency = new Trend('cda_cadastro_latency_ms');
const webrtcPollLatency = new Trend('cda_webrtc_latency_ms');
const readinessLatency = new Trend('cda_readiness_latency_ms');
const successfulRequests = new Counter('cda_successful_requests');

export const options = {
  scenarios: {
    stress_load_profile: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '5s', target: 50 },    // Estágio 1: Aquecimento rápido (50 VUs)
        { duration: '10s', target: 150 },  // Estágio 2: Carga Operacional Alta (150 VUs)
        { duration: '15s', target: 300 },  // Estágio 3: Pico Massivo Concorrente (300 VUs)
        { duration: '5s', target: 50 },    // Estágio 4: Descompressão
        { duration: '3s', target: 0 },     // Finalização
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],                  // Falhas HTTP < 2%
    http_req_duration: ['p(95)<800', 'p(99)<1500'],  // 95% < 800ms, 99% < 1500ms
    cda_error_rate: ['rate<0.02'],                   // Erros de negócio < 2%
  },
};

const BASE_URL = __ENV.BASE || 'http://localhost:3000';
const READINESS_TOKEN = __ENV.READINESS_TOKEN || '4d87612b45ff5719350c8f831a8372ed3963d0d0f95ca2f9';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'CDA-K6-LoadTesting/2026.1 (GovAngola-LoadSimulator)',
  };

  // 1. Health & Status da Infraestrutura
  group('01. Health Check & Resiliência do Servidor', () => {
    const res = http.get(`${BASE_URL}/api/health`, { headers });
    const isOk = check(res, {
      'Health check status 200': (r) => r.status === 200,
      'Health check latency < 300ms': (r) => r.timings.duration < 300,
      'JSON válido retornado': (r) => r.json('status') === 'ok',
    });
    healthLatency.add(res.timings.duration);
    errorRate.add(!isOk);
    if (isOk) successfulRequests.add(1);
  });

  // 2. Páginas Públicas SPA (HTML & Bundles)
  group('02. Carregamento de Rotas SPA', () => {
    const res = http.get(`${BASE_URL}/`, { headers: { 'Accept': 'text/html' } });
    const isOk = check(res, {
      'Página SPA status 200': (r) => r.status === 200,
      'Página contém dados': (r) => r.body && r.body.length > 50,
      'SPA latency < 500ms': (r) => r.timings.duration < 500,
    });
    spaLatency.add(res.timings.duration);
    errorRate.add(!isOk);
    if (isOk) successfulRequests.add(1);
  });

  // 3. API de Verificação de Cadastro Cívico
  group('03. API de Verificação Cadastral (BI/NIF)', () => {
    const payload = JSON.stringify({
      identificador: '002399714LA030',
      tipo: 'cidadao',
    });
    const res = http.post(`${BASE_URL}/api/verificar-cadastro`, payload, { headers });
    const isOk = check(res, {
      'API Cadastro responde sem erro fatal (status < 500)': (r) => r.status < 500,
      'API Cadastro latency < 800ms': (r) => r.timings.duration < 800,
    });
    apiCadastroLatency.add(res.timings.duration);
    errorRate.add(!isOk);
    if (isOk) successfulRequests.add(1);
  });

  // 4. Polling WebRTC de Vídeo-Atendimento
  group('04. Canal de Vídeo-Atendimento WebRTC', () => {
    const res = http.get(`${BASE_URL}/api/webrtc/poll?room=k6-bench-room&sender=citizen`, { headers });
    const isOk = check(res, {
      'WebRTC Poll status 200': (r) => r.status === 200,
      'WebRTC Poll latency < 300ms': (r) => r.timings.duration < 300,
    });
    webrtcPollLatency.add(res.timings.duration);
    errorRate.add(!isOk);
    if (isOk) successfulRequests.add(1);
  });

  // 5. API de Segurança & Readiness Telemetry (Amostragem Cívica)
  if (Math.random() < 0.05) {
    group('05. Auditoria de Segurança & Readiness', () => {
      const res = http.get(`${BASE_URL}/api/security/readiness`, {
        headers: { ...headers, 'Authorization': `Bearer ${READINESS_TOKEN}` },
      });
      const isOk = check(res, {
        'Readiness status 200': (r) => r.status === 200,
        'Readiness payload válido': (r) => r.json('status') === 'production-candidate' || r.json('status') === 'ok',
      });
      readinessLatency.add(res.timings.duration);
      errorRate.add(!isOk);
      if (isOk) successfulRequests.add(1);
    });
  }

  sleep(0.05); // Pausa realista entre iterações
}
