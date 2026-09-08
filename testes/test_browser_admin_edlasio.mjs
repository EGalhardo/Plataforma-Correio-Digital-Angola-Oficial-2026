import { chromium } from 'playwright';

(async () => {
  console.log('🚀 INICIANDO TESTE E2E: ADMIN PROFILE & DASHBOARD LIVE VERIFICATION');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let allPassed = true;

  try {
    // 1. Entrar na conta admin
    console.log('\n[Passo 1] Aceder a /admin#/login e autenticar...');
    await page.goto('http://localhost:3000/admin#/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    await page.locator('input[name="cda-utilizador"]').fill('ADM-8812-OP');
    await page.locator('input[name="cda-senha"]').fill('GALHARDO');
    await page.getByRole('button', { name: /ENTRAR/i }).first().click();
    await page.waitForTimeout(1500);

    console.log('  URL após login:', page.url());

    // 2. Navegar para a página Perfil
    console.log('\n[Passo 2] Navegar para a página Perfil do Admin (#/gov-perfil)...');
    await page.evaluate(() => { window.location.hash = '#/gov-perfil'; });
    await page.waitForTimeout(1000);

    // 3. Teste 1: Mudar para um nome diferente primeiro (para garantir teste de transição real)
    console.log('\n[Passo 3] Alterar Nome Completo para "Inspetor Geral Alberto"...');
    await page.locator('button:has-text("Editar Perfil")').first().click();
    await page.waitForTimeout(400);

    const inputNome = page.locator('div.grid input[type="text"]').first();
    await inputNome.fill('Inspetor Geral Alberto');

    await page.locator('button:has-text("Gravar"), button:has-text("Salvar")').first().click();
    await page.waitForTimeout(1000);

    let h3 = (await page.textContent('h3.text-xl'))?.trim();
    let h1 = (await page.textContent('h1'))?.trim();
    let field = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('span, div, h1, h3')).find(e => e.textContent.trim() === 'Nome Completo');
      return el?.parentElement?.querySelector('span.text-xs, div, p')?.textContent?.trim() || '';
    });

    console.log('  Resultado da alteração para "Inspetor Geral Alberto":');
    console.log('    - Saudação H1:', h1);
    console.log('    - Card H3:', h3);
    console.log('    - Campo Nome Completo:', field);

    if (h3 === 'Inspetor Geral Alberto' && field === 'Inspetor Geral Alberto') {
      console.log('  ✅ Alteração para "Inspetor Geral Alberto" aplicada com sucesso.');
    } else {
      console.error('  ❌ Falha na alteração para "Inspetor Geral Alberto".');
      allPassed = false;
    }

    // 4. Teste 2: Mudar agora para "Edlasio Galhardo" conforme pedido explícito
    console.log('\n[Passo 4] Alterar Nome Completo no Perfil para "Edlasio Galhardo"...');
    await page.locator('button:has-text("Editar Perfil")').first().click();
    await page.waitForTimeout(400);

    await inputNome.fill('Edlasio Galhardo');

    await page.locator('button:has-text("Gravar"), button:has-text("Salvar")').first().click();
    await page.waitForTimeout(1000);

    h3 = (await page.textContent('h3.text-xl'))?.trim();
    h1 = (await page.textContent('h1'))?.trim();
    field = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('span, div, h1, h3')).find(e => e.textContent.trim() === 'Nome Completo');
      return el?.parentElement?.querySelector('span.text-xs, div, p')?.textContent?.trim() || '';
    });

    console.log('  Resultado da alteração para "Edlasio Galhardo":');
    console.log('    - Saudação H1:', h1);
    console.log('    - Card H3:', h3);
    console.log('    - Campo Nome Completo:', field);

    if (h1.includes('Edlasio') && h3 === 'Edlasio Galhardo' && field === 'Edlasio Galhardo') {
      console.log('  ✅ Nome no Perfil atualizado para "Edlasio Galhardo" com 100% de precisão.');
    } else {
      console.error('  ❌ Nome no Perfil não confere com "Edlasio Galhardo".');
      allPassed = false;
    }

    // 5. Verificar Área Central de Conteúdo no Painel Admin (#/gov-dashboard)
    console.log('\n[Passo 5] Navegar para o Painel (#/gov-dashboard) e verificar área central de conteúdo...');
    await page.evaluate(() => { window.location.hash = '#/gov-dashboard'; });
    await page.waitForTimeout(1000);

    const headerGreeting = (await page.textContent('div.flex-1 h2'))?.trim();
    const headerSub = (await page.textContent('div.flex-1 small'))?.trim();
    const idDigitalTitle = (await page.textContent('div.min-w-0 div.text-base, div.min-w-0 div.text-xl'))?.trim();
    const idDigitalLogo = await page.getAttribute('div.rounded-2xl.bg-white img', 'src').catch(() => null);

    console.log('  Conteúdo do Painel Central:');
    console.log('    - Cabeçalho (Header):', headerGreeting);
    console.log('    - Subtítulo (Header):', headerSub);
    console.log('    - ID Digital Card Cargo:', idDigitalTitle);
    console.log('    - ID Digital Card Logo:', idDigitalLogo);

    if (headerGreeting.includes('Edlasio')) {
      console.log('  ✅ Na área central de conteúdo (Header), o nome "Edlasio" aparece corretamente:', headerGreeting);
    } else {
      console.error('  ❌ Na área central de conteúdo, o nome "Edlasio" não apareceu:', headerGreeting);
      allPassed = false;
    }

    if (headerSub.includes('Administração Central')) {
      console.log('  ✅ Identidade institucional preservada no cabeçalho:', headerSub);
    } else {
      console.error('  ❌ Subtítulo do cabeçalho corrompido:', headerSub);
      allPassed = false;
    }

    if (idDigitalTitle && idDigitalTitle.includes('Gestor Operativo Verificado')) {
      console.log('  ✅ Cartão ID Digital preserva o cargo institucional ("Gestor Operativo Verificado"):', idDigitalTitle);
    } else {
      console.error('  ❌ Cartão ID Digital corrompido:', idDigitalTitle);
      allPassed = false;
    }

    if (idDigitalLogo && idDigitalLogo.includes('Icone-Correio-Angola')) {
      console.log('  ✅ Logomarca oficial do Correio Angola preservada:', idDigitalLogo);
    } else {
      console.error('  ❌ Logomarca oficial corrompida:', idDigitalLogo);
      allPassed = false;
    }

    // 6. Teste de Persistência (Reload)
    console.log('\n[Passo 6] Recarregar a página (F5/Reload) e verificar persistência...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const reloadedGreeting = (await page.textContent('div.flex-1 h2'))?.trim();
    console.log('  Header após Reload:', reloadedGreeting);

    if (reloadedGreeting.includes('Edlasio')) {
      console.log('  ✅ Persistência 100% garantida: Header manteve "Olá, Edlasio" após reload.');
    } else {
      console.error('  ❌ Persistência falhou após reload:', reloadedGreeting);
      allPassed = false;
    }

  } catch (err) {
    console.error('❌ Erro inesperado durante execução:', err);
    allPassed = false;
  } finally {
    await browser.close();
  }

  if (allPassed) {
    console.log('\n🎉 TESTE E2E CONCLUÍDO COM 100% DE SUCESSO!');
    process.exit(0);
  } else {
    console.error('\n❌ O TESTE ENCONTROU FALHAS!');
    process.exit(1);
  }
})();
