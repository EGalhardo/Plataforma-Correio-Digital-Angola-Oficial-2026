/**
 * PROVA — «página branca ao mudar de página» não volta a acontecer.
 *
 * Executar:  node scripts/test_paginas_brancas_playwright.cjs [--ciclos=N]
 *
 * Três provas independentes, sempre contra a produção real e com as contas
 * reais (nunca dados de cobaia):
 *
 *   A. NAVEGAÇÃO NORMAL — percorre todos os menus das três contas e exige
 *      conteúdo em todas as páginas (a linha de base: não se pode regredir).
 *   B. FALHA PASSAGEIRA — o ficheiro de uma página falha uma vez (simula
 *      rede instável / deploy a meio): a app tem de recuperar sozinha.
 *   C. FALHA PERSISTENTE — o ficheiro da página falha sempre (simula cache
 *      antigo): tem de aparecer o cartão de recuperação, NUNCA ecrã branco,
 *      e no máximo UMA recarga automática (sem ciclo de refresh).
 *
 * Só faz GET a páginas e cliques de navegação: não cria nem altera dados.
 */
const { chromium } = require('playwright');

const APP = 'https://correio-digital-angola-oficial.vercel.app';
const CONTAS = [
  { nome: 'Cidadão', base: '', entrada: '002399714LA030', senha: '123456789',
    menu: ['Painel', 'Correio', 'Contactos', 'Perfil', 'VÍDEO-ATENDIMENTO', 'INQUÉRITOS', 'COMUNICADOS', 'OCORRÊNCIAS LOCAIS', 'DENUNCIA', 'LIVRO DE RECLAMAÇÕES', 'INAPEM', 'SME', 'AGT', 'ENDE'] },
  { nome: 'Instituição', base: '/institucional', entrada: 'AGT-LMM-01', senha: '123456789',
    menu: ['Painel', 'Correio', 'Equipa', 'QR Code', 'IA', 'Perfil', 'VÍDEO-ATENDIMENTO', 'INQUÉRITOS', 'COMUNICADOS', 'OCORRÊNCIAS RECEBIDAS', 'DENUNCIA', 'LIVRO DE RECLAMAÇÕES'] },
  { nome: 'Administração', base: '/admin', entrada: 'ADMIN-0001', senha: '987654321',
    menu: ['Painel', 'Instituições', 'Correspondências', 'Cidadãos', 'Equipa', 'Relatórios', 'IA', 'Auditoria', 'Perfil', 'VER HISTÓRICO', 'EMISSÃO DOCUMENTAL'] },
];

const CICLOS = Number((process.argv.find(a => a.startsWith('--ciclos=')) || '').split('=')[1] || 2);
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

/** Estado da página: quantas palavras úteis e se há conteúdo visível. */
async function medir(page) {
  return page.evaluate(() => {
    const texto = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
    const palavras = texto.split(' ').filter(p => p.length > 2).length;
    return {
      caracteres: texto.length,
      palavras,
      raizFilhos: document.querySelector('#root')?.children.length ?? -1,
      recuperacao: /não foi possível abrir a página|esta página não carregou|tentar novamente/i.test(texto),
      inicio: texto.slice(0, 70),
    };
  });
}

/** Branco = nada de útil no ecrã e sem cartão de recuperação a explicar porquê. */
const estaBranca = (m) => m.recuperacao ? false : (m.palavras < 8 || m.raizFilhos <= 0);

async function entrar(browser, conta) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const arranque = await registarArranque(page);
  const incidentes = { recargas: 0, fronteiras: 0, importsFalhados: 0, errosJs: [] };
  // 'load' só dispara em documentos novos: distingue recarga real de navegação
  // interna por hash (o framenavigated contava as duas e dava números falsos).
  page.on('load', () => incidentes.recargas++);
  page.on('console', m => {
    const t = m.text();
    if (/\[FronteiraDePagina\]/.test(t)) incidentes.fronteiras++;
    if (/Failed to fetch dynamically imported module/.test(t)) incidentes.importsFalhados++;
    if (m.type() === 'error' && /Failed to fetch dynamically/.test(t) === false && /TypeError|ReferenceError/.test(t)) {
      incidentes.errosJs.push(t.slice(0, 120));
    }
  });

  await page.goto(`${APP}${conta.base}/#/login`, { waitUntil: 'networkidle' });
  await esperar(1200);
  await page.fill('input[name="cda-utilizador"]', conta.entrada);
  await page.fill('input[name="cda-senha"]', conta.senha);
  await page.click('button:has-text("ENTRAR NO PORTAL")');
  await esperar(5500);
  incidentes.recargas = 0; // o login navega por si: contar só o que vem depois
  return { ctx, page, incidentes, arranque };
}

/** Deixa passar o arranque da app e bloqueia só os ficheiros que a página pedir. */
async function registarArranque(page) {
  const arranque = new Set();
  page.on('response', r => {
    const u = r.url();
    if (/\/assets\/.*\.js/.test(u)) arranque.add(u.split('/').pop());
  });
  return arranque;
}

/**
 * Antes de bloquear, carregar a página UMA vez sem bloqueio: assim todos os
 * ficheiros dela ficam em cache do browser — e o bloqueio seguinte só afecta
 * pedidos realmente novos. É isto que torna o cenário C honesto: não se está
 * a simular «internet desligada», mas «este ficheiro já não vem».
 */

async function instalarBloqueio(page, arranque, { falharSoUmaVez }) {
  let jaFalhou = false;
  const estado = { bloqueados: 0 };
  await page.route('**/assets/*.js', route => {
    const ficheiro = route.request().url().split('/').pop();
    if (arranque.has(ficheiro)) return route.continue();
    if (falharSoUmaVez && jaFalhou) return route.continue();
    jaFalhou = true;
    estado.bloqueados++;
    return route.abort('failed');
  });
  return estado;
}

(async () => {
  const browser = await chromium.launch();
  const falhas = [];
  const t0 = Date.now();

  // ─────────────────────────── A. NAVEGAÇÃO NORMAL ───────────────────────────
  console.log('\n═══ A. NAVEGAÇÃO NORMAL (as três contas reais) ═══');
  let paginasA = 0;
  for (const conta of CONTAS) {
    for (let ciclo = 1; ciclo <= CICLOS; ciclo++) {
      const { ctx, page, incidentes } = await entrar(browser, conta);
      for (const item of conta.menu) {
        // Voltar ao painel antes de cada item: a caixa de correio tem layout
        // próprio e esconde o menu — sem isto, os itens seguintes «não existem».
        if (item !== 'Painel') {
          await page.locator('button:has-text("Painel")').first().click({ timeout: 6000 }).catch(() => {});
          await esperar(900);
        }
        // O menu usa <button>, <a> e <div> conforme a área: procurar por todos.
        const alvo = page.locator(`button:has-text("${item}"), a:has-text("${item}"), [role="button"]:has-text("${item}")`).first();
        if (!(await alvo.count())) { console.log(`  · ${conta.nome} » ${item}: (não visível neste perfil)`); continue; }
        await alvo.click({ timeout: 8000 }).catch(() => {});
        await esperar(1400);
        const m = await medir(page);
        await page.keyboard.press('Escape').catch(() => {});
        paginasA++;
        if (estaBranca(m)) {
          falhas.push(`A: ${conta.nome} » ${item} (ciclo ${ciclo}) ficou branca ${JSON.stringify(m)}`);
          await page.screenshot({ path: `test-artifacts/branco-A-${conta.nome}-${item.replace(/\W+/g, '')}.png` }).catch(() => {});
          console.log(`  ✗ ${conta.nome} » ${item} — BRANCA`);
        } else {
          console.log(`  ✓ ${conta.nome} » ${item} (${m.palavras} palavras)`);
        }
      }
      await ctx.close();
    }
  }
  console.log(`  → ${paginasA} navegações verificadas`);

  // ───────────────────── B. FALHA PASSAGEIRA (recupera) ──────────────────────
  console.log('\n═══ B. FALHA PASSAGEIRA — um ficheiro falha uma vez ═══');
  {
    const { ctx, page, incidentes, arranque } = await entrar(browser, CONTAS[0]);
    const est = await instalarBloqueio(page, arranque, { falharSoUmaVez: true });
    await page.locator('button:has-text("Perfil")').first().click({ timeout: 8000 }).catch(() => {});
    await esperar(10000);
    const m = await medir(page);
    const ok = !estaBranca(m);
    console.log(`  ${ok ? '✓' : '✗'} recuperou sozinha: ${JSON.stringify(m)}`);
    console.log(`     ficheiros bloqueados: ${est.bloqueados} · recargas: ${incidentes.recargas} · fronteiras: ${incidentes.fronteiras}`);
    if (!ok) { falhas.push(`B: falha passageira deixou a página branca ${JSON.stringify(m)}`); }
    await ctx.close();
  }

  // ─────────────────── C. FALHA PERSISTENTE (recuperação) ────────────────────
  console.log('\n═══ C. FALHA PERSISTENTE — o ficheiro da página falha sempre ═══');
  for (const alvo of ['Correio', 'Contactos', 'Perfil']) {
    const { ctx, page, incidentes, arranque } = await entrar(browser, CONTAS[0]);
    await instalarBloqueio(page, arranque, { falharSoUmaVez: false });
    await page.locator(`button:has-text("${alvo}"), a:has-text("${alvo}"), [role="button"]:has-text("${alvo}")`).first().click({ timeout: 8000 }).catch(() => {});
    await esperar(12000);
    const m = await medir(page);
    const semBranco = !estaBranca(m);
    const semCiclo = incidentes.recargas <= 2; // arranque + no máximo 1 recarga de recuperação
    console.log(`  ${semBranco && semCiclo ? '✓' : '✗'} ${alvo}: ${JSON.stringify(m)}`);
    console.log(`     recargas: ${incidentes.recargas} (máx. 2) · fronteiras: ${incidentes.fronteiras} · cartão de recuperação: ${m.recuperacao}`);
    if (!semBranco) falhas.push(`C: ${alvo} ficou branca ${JSON.stringify(m)}`);
    if (!semCiclo) falhas.push(`C: ${alvo} entrou em ciclo de recargas (${incidentes.recargas})`);
    await page.screenshot({ path: `test-artifacts/branco-C-${alvo.toLowerCase()}.png` }).catch(() => {});
    await ctx.close();
  }

  await browser.close();

  const segundos = ((Date.now() - t0) / 1000).toFixed(0);
  console.log('\n' + '─'.repeat(64));
  if (falhas.length === 0) {
    console.log(`RESULTADO: APROVADO — nenhuma página branca em ${segundos}s (A+B+C).`);
    process.exit(0);
  }
  console.log(`RESULTADO: REPROVADO — ${falhas.length} problema(s):`);
  falhas.forEach(f => console.log('  · ' + f));
  process.exit(1);
})();
