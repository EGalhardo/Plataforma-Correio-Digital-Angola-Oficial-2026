// ============================================================================
// e2e_auditoria_total.mjs — AUDITORIA AUTÓNOMA DE TODAS AS PÁGINAS (modo real)
// ----------------------------------------------------------------------------
// Mapeado do código (App.tsx switch 5358+ / Sidebar.tsx menus). Por ÁREA:
//   - navegação REAL pelos botões da sidebar (menu) em 1440px;
//   - acesso DIRECTO por hash a cada rota da área (H10) em 1440px e 375px;
//   - captura por página: pageerror · console.error · HTTP>=400 (fora auth) ·
//     página em branco · redirect de rota · overflow horizontal (K4).
// Credenciais reais de produção. Uso:
//   BASE=<url> node scripts/e2e_auditoria_total.mjs   (saída JSON no fim)
// ============================================================================
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const CRED = {
  cidadao: { user: '002399714LA030', pass: '123456789' },
  instituicao: { user: 'INAPEM-LLMM-01', pass: '123456789' },
  admin: { user: 'ADMIN-0001', pass: '123456789' },
};

// --- mapa extraído do código (Sidebar.tsx + switch do App.tsx) ---
const AREAS = {
  publico: {
    entry: `${BASE}/#/login`,
    rotas: [
      ['#/login', 'Login Cidadão'],
      ['#/registar', 'Registo de Cidadão'],
      ['#/login-email', 'Login por E-mail'],
      ['#/login-facial', 'Login Facial'],
      ['#/esqueci-senha', 'Recuperação de Senha'],
    ],
    extra: [
      ['/institucional#/login', 'Login Instituição'],
      ['/institucional#/registar', 'Registo de Instituição'],
      ['/admin#/login', 'Login Admin'],
    ],
  },
  cidadao: {
    entry: `${BASE}/#/login`,
    rotas: [
      ['#/home', 'Painel'],
      ['#/correspondencias', 'Correio'],
      ['#/documentos', 'Documentos'],
      ['#/pasta-digital', 'Pasta Digital'],
      ['#/historico', 'Histórico'],
      ['#/notificacoes', 'Notificações'],
      ['#/contatos', 'Contactos'],
      ['#/directorio-orgaos', 'Directório de Órgãos'],
      ['#/solicitar-documento', 'Solicitar Documento'],
      ['#/video-atendimento', 'Videoatendimento'],
      ['#/pagamentos', 'Pagamentos'],
      ['#/perfil', 'Perfil'],
    ],
  },
  instituicao: {
    entry: `${BASE}/institucional#/login`,
    rotas: [
      ['#/home', 'Painel'],
      ['#/correspondencias', 'Correio'],
      ['#/documentos', 'Documentos'],
      ['#/sondagens', 'Sondagens'],
      ['#/inst-qrcode', 'Validação QR'],
      ['#/inst-ai-assistant', 'Assistência IA'],
      ['#/inst-pagamentos', 'Pagamentos'],
      ['#/video-atendimento', 'Videoatendimento'],
      ['#/pasta-digital', 'Pasta Digital'],
      ['#/notificacoes', 'Notificações'],
      ['#/historico', 'Histórico'],
      ['#/gov-contatos', 'Equipa'],
      ['#/perfil', 'Perfil'],
    ],
  },
  admin: {
    entry: `${BASE}/admin#/login`,
    rotas: [
      ['#/gov-dashboard', 'Painel'],
      ['#/gov-interoperabilidade', 'Instituições'],
      ['#/gov-correspondencias', 'Correspondências'],
      ['#/gov-contatos', 'Cidadãos'],
      ['#/gov-trabalhadores', 'Equipa'],
      ['#/gov-relatorio', 'Relatórios'],
      ['#/gov-ia', 'IA'],
      ['#/gov-seguranca', 'Auditoria'],
      ['#/gov-perfil', 'Perfil'],
      ['#/gov-emissao', 'Emissão'],
      ['#/gov-docs', 'Documentos'],
      ['#/gov-stats', 'Estatísticas'],
    ],
  },
};

const IGNORE_URL = (u) =>
  u.includes('supabase.co/auth') ||           // 401/400 esperados em fluxos de auth
  u.includes('googleapis.com') ||             // IA externa pode 429/503 (não é página)
  u.includes('/api/verificar-cadastro') ||    // PVI externa (dependência IA)
  u.includes('favicon');

const results = [];
const reg = (area, rota, nome, tipo, detalhe) => {
  results.push({ area, rota, nome, tipo, detalhe: String(detalhe).slice(0, 220) });
  console.log(`[!] ${area} ${rota} (${nome}) · ${tipo}: ${String(detalhe).slice(0, 140)}`);
};

const instrumentar = (page, area, rota, nome) => {
  page.on('pageerror', (e) => reg(area, rota, nome, 'pageerror', e));
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const t = m.text();
      // erros de rede de recursos externos monitorizados à parte; aqui só JS
      if (!/failed to load resource/i.test(t)) reg(area, rota, nome, 'console.error', t);
    }
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && !IGNORE_URL(r.url()) && !r.url().startsWith('data:')) {
      reg(area, rota, nome, `http ${r.status()}`, `${r.request().method()} ${r.url().slice(0, 130)}`);
    }
  });
};

const analisarPagina = async (page, area, rota, nome) => {
  const info = await page.evaluate(() => {
    const t = (document.body.innerText || '').trim();
    return {
      textoLen: t.length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      hash: window.location.hash,
      restrito: /acesso restrito/i.test(t),
    };
  }).catch(() => null);
  if (!info) return;
  if (info.textoLen < 30) reg(area, rota, nome, 'pagina-em-branco', `innerText=${info.textoLen} chars`);
  if (info.overflow > 2) reg(area, rota, nome, 'overflow-horizontal', `${info.overflow}px além do viewport`);
  if (info.restrito) reg(area, rota, nome, 'acesso-restrito', 'página bloqueada por permissões (verificar se esperado)');
  return info;
};

const login = async (page, area) => {
  const c = CRED[area];
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 40000 });
  await page.locator('input[type="text"], input:not([type])').first().fill(c.user);
  await page.locator('input[type="password"]').first().fill(c.pass);
  await page.getByRole('button', { name: /entrar/i }).first().click().catch(() => {});
  await page.waitForTimeout(14000);
};

const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});

// ========================= PÚBLICO =========================
await (async () => {
  const area = 'publico';
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 375, height: 812 }]) {
    const ctx = await browser.newContext({ viewport, locale: 'pt-PT', permissions: ['camera', 'microphone'] });
    const page = await ctx.newPage();
    instrumentar(page, area, 'publico', `viewport ${viewport.width}`);
    for (const [rota, nome] of AREAS[area].rotas) {
      try {
        await page.goto(`${BASE}/${rota.replace('#/', '#/')}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(4500);
        await analisarPagina(page, area, rota, `${nome} @${viewport.width}`);
        console.log(`[ok] ${area} ${nome} @${viewport.width}`);
      } catch (e) { reg(area, rota, nome, 'navegacao', e); }
    }
    for (const [caminho, nome] of AREAS[area].extra) {
      try {
        await page.goto(`${BASE}${caminho}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(4500);
        await analisarPagina(page, area, caminho, `${nome} @${viewport.width}`);
        console.log(`[ok] ${area} ${nome} @${viewport.width}`);
      } catch (e) { reg(area, caminho, nome, 'navegacao', e); }
    }
    await ctx.close();
  }
})();

// ========================= ÁREAS AUTENTICADAS =========================
for (const area of ['cidadao', 'instituicao', 'admin']) {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 375, height: 812 }]) {
    const ctx = await browser.newContext({ viewport, locale: 'pt-PT', permissions: ['camera', 'microphone'] });
    const page = await ctx.newPage();
    try {
      instrumentar(page, area, 'login', `login @${viewport.width}`);
      await page.goto(AREAS[area].entry, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await login(page, area);
      const dentro = await page.evaluate(() => !/iniciar sessão/i.test(document.body.innerText || ''));
      if (!dentro) { reg(area, 'login', 'Login', 'login-falhou', 'sessão não entrou'); await ctx.close(); continue; }
      console.log(`[ok] ${area} login @${viewport.width}`);

      // navegação REAL pelo menu (sidebar em >=768px; mobile usa bottom bar)
      if (viewport.width >= 768) {
        for (const [rota, nome] of AREAS[area].rotas) {
          const clicou = await page.evaluate((label) => {
            const b = [...document.querySelectorAll('button, a')].filter(e => e.getBoundingClientRect().width > 0 && (e.textContent || '').trim().toLowerCase() === label.toLowerCase());
            if (b.length) { b[0].click(); return true; }
            return false;
          }, nome).catch(() => false);
          if (clicou) {
            await page.waitForTimeout(5000);
            await analisarPagina(page, area, rota, `${nome} (menu) @${viewport.width}`);
            console.log(`[ok] ${area} ${nome} via MENU @${viewport.width}`);
          }
        }
      }
      // acesso directo por hash (H10) em TODOS os viewports
      for (const [rota, nome] of AREAS[area].rotas) {
        try {
          await page.evaluate((h) => { window.location.hash = h; }, rota.replace('#/', ''));
          await page.waitForTimeout(5000);
          await analisarPagina(page, area, rota, `${nome} (directo) @${viewport.width}`);
          console.log(`[ok] ${area} ${nome} DIRECTO @${viewport.width}`);
        } catch (e) { reg(area, rota, nome, 'navegacao', `${e} @${viewport.width}`); }
      }
      if (viewport.width === 1440) {
        await page.screenshot({ path: `/home/user/cda_test/screenshots/auditoria_${area}_home.png` }).catch(() => {});
      }
    } finally {
      await ctx.close();
    }
  }
}

await browser.close();

// ---------------- resumo ----------------
const porTipo = {};
results.forEach((r) => { porTipo[r.tipo] = (porTipo[r.tipo] || 0) + 1; });
console.log('\n================ RESUMO AUDITORIA ================');
console.log('eventos:', results.length, JSON.stringify(porTipo, null, 1));
const fs = await import('fs');
fs.writeFileSync('/home/user/cda_test/auditoria_total.json', JSON.stringify(results, null, 1));
console.log('detalhe em /home/user/cda_test/auditoria_total.json');
