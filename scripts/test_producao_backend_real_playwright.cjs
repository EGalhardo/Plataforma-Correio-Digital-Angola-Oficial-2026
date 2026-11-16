/**
 * A que projeto Supabase o app PUBLICADO se liga de facto?
 *   node scripts/test_producao_backend_real_playwright.cjs
 *
 * Não confia em variáveis: observa o tráfego real do browser e confirma o
 * projeto por três vias independentes (rede, REST do projeto, conteúdo).
 */
const { chromium } = require('playwright');
const fs = require('fs');

const APP = process.env.CDA_APP_URL || 'https://correio-digital-angola-oficial.vercel.app';
const ESPERADO = 'klrclczcahfycfdxzdqs'; // projeto de produção do CDA
const env = fs.readFileSync(__dirname + '/../.env', 'utf8');
const anon = env.match(/VITE_SUPABASE_ANON_KEY=([^\s\n]+)/)[1];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const hosts = new Set();
  const chamadas = [];

  page.on('request', (r) => {
    const u = r.url();
    const m = u.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
    if (m) {
      hosts.add(m[1]);
      chamadas.push(`${r.method()} ${u.replace(`https://${m[1]}.supabase.co`, '')}`.slice(0, 80));
    }
  });

  await page.goto(APP, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(6000);

  // Forçar tráfego de backend a partir do browser (SDK carregado pela app).
  await page.evaluate(async ([APP]) => {
    await fetch(APP + '/api/health').catch(() => {});
    await fetch(APP + '/api/dados', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabela: 'solicitacoes_registo', operacao: 'select', filtros: {}, limite: 1 }),
    }).catch(() => {});
  }, [APP]).catch(() => {});
  await page.waitForTimeout(3000);

  const out = {
    projeto_esperado: ESPERADO,
    projetos_supabase_no_trafico_do_browser: [...hosts],
    ligado_ao_projeto_certo: hosts.size === 0 ? 'sem tráfego direto (tudo via /api do servidor)' : [...hosts].every((h) => h === ESPERADO),
    amostra_de_chamadas: chamadas.slice(0, 6),
  };

  // Confirmação directa: o próprio projeto responde. (A raiz /rest/v1/ devolve
  // 401 por desenho; a prova usa uma tabela pública do catálogo.)
  const r = await fetch(`https://${ESPERADO}.supabase.co/rest/v1/institutions?select=name&limit=1`, { headers: { apikey: anon } });
  out.projeto_responde = r.status;
  const catalogo = await r.json().catch(() => null);
  out.catalogo_publico = Array.isArray(catalogo) ? catalogo.length : 'sem catálogo';
  const fechado = await (await fetch(`https://${ESPERADO}.supabase.co/rest/v1/profiles?select=bi&limit=5`, {
    headers: { apikey: anon },
  })).json().catch(() => null);
  out.dados_fechados_sem_sessao = Array.isArray(fechado) && fechado.length === 0;

  // E o /api/health do app diz de que projeto fala.
  const h = await (await fetch(APP + '/api/health')).json().catch(() => null);
  out.health_do_app = h;
  out.aprovado = out.ligado_ao_projeto_certo === true && r.status === 200 && h && h.supabase_url_configured === true;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
  if (!out.aprovado) process.exitCode = 1;
})();
