import { chromium } from 'playwright';

(async () => {
  console.log('🚀 TESTE E2E: ATUALIZAÇÃO DOS DADOS DO ADMIN-0001 NO PERFIL E PAINEL');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let allPassed = true;

  try {
    // 1. Aceder ao login Admin com ADMIN-0001
    console.log('\n[1] Autenticar na Área Admin com ADMIN-0001...');
    await page.goto('http://localhost:3000/admin#/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const userInput = page.locator('input[name="cda-utilizador"]');
    const passInput = page.locator('input[name="cda-senha"]');

    console.log('  Placeholder do identificador:', await userInput.getAttribute('placeholder'));

    await userInput.fill('ADMIN-0001');
    await passInput.fill('GALHARDO');
    await page.getByRole('button', { name: /ENTRAR/i }).first().click();
    await page.waitForTimeout(1500);

    console.log('  URL após login:', page.url());

    // 2. Navegar para o Perfil do Admin
    console.log('\n[2] Navegar para a página Perfil (#/gov-perfil)...');
    await page.evaluate(() => { window.location.hash = '#/gov-perfil'; });
    await page.waitForTimeout(1000);

    // Clicar em "Revelar" para ver o BI completo
    const btnRevelar = page.locator('button:has-text("Revelar")').first();
    if (await btnRevelar.isVisible().catch(() => false)) {
      await btnRevelar.click();
      await page.waitForTimeout(300);
    }

    const biField = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('span')).find(e => e.textContent.trim().startsWith('Bilhete de Identidade'));
      return el?.parentElement?.querySelector('span.text-xs')?.textContent?.trim() || '';
    });

    console.log('  BI / Identificador no Perfil:', biField);
    if (biField.includes('ADMIN-0001')) {
      console.log('  ✅ Identificador ADMIN-0001 confirmado no perfil');
    } else {
      console.error('  ❌ Identificador no perfil não é ADMIN-0001:', biField);
      allPassed = false;
    }

    // 3. Atualizar dados do ADMIN-0001 no Perfil para "Edlasio Galhardo"
    console.log('\n[3] Editar perfil do ADMIN-0001 para "Edlasio Galhardo"...');
    await page.locator('button:has-text("Editar Perfil")').first().click();
    await page.waitForTimeout(500);

    const inputNome = page.locator('label:has-text("Nome Completo") + input');
    const inputTelefone = page.locator('label:has-text("Telefone Principal") + input');
    const inputNif = page.locator('label:has-text("NIF") + input');

    await inputNome.fill('Edlasio Galhardo');
    await inputTelefone.fill('+244 923 456 789');
    await inputNif.fill('5401329188');

    await page.locator('button:has-text("Gravar")').first().click();
    await page.waitForTimeout(1000);

    const postGreeting = (await page.textContent('h1'))?.trim();
    const postCardName = (await page.textContent('h3.text-xl'))?.trim();
    const postNomeField = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('span')).find(e => e.textContent.trim() === 'Nome Completo');
      return el?.parentElement?.querySelector('span.text-xs')?.textContent?.trim() || '';
    });

    console.log('  Dados actualizados no Perfil do ADMIN-0001:');
    console.log('    - Saudação H1:', postGreeting);
    console.log('    - Nome no Card H3:', postCardName);
    console.log('    - Campo Nome Completo:', postNomeField);

    if (postGreeting.includes('Edlasio') && postCardName === 'Edlasio Galhardo' && postNomeField === 'Edlasio Galhardo') {
      console.log('  ✅ Perfil do ADMIN-0001 atualizado para "Edlasio Galhardo" com sucesso.');
    } else {
      console.error('  ❌ Falha na atualização do perfil do ADMIN-0001.');
      allPassed = false;
    }

    // 4. Verificar no Painel (#/gov-dashboard)
    console.log('\n[4] Navegar para o Painel (#/gov-dashboard)...');
    await page.evaluate(() => { window.location.hash = '#/gov-dashboard'; });
    await page.waitForTimeout(1000);

    const headerGreeting = (await page.textContent('div.flex-1 h2'))?.trim();
    const headerSub = (await page.textContent('div.flex-1 small'))?.trim();
    const idDigitalCard = (await page.textContent('div.min-w-0 div.text-base, div.min-w-0 div.text-xl'))?.trim();

    console.log('  Painel Central:');
    console.log('    - Cabeçalho (Header):', headerGreeting);
    console.log('    - Subtítulo:', headerSub);
    console.log('    - ID Digital:', idDigitalCard);

    if (headerGreeting.includes('Edlasio')) {
      console.log('  ✅ Cabeçalho da área central exibe "Olá, Edlasio"');
    } else {
      console.error('  ❌ Cabeçalho da área central não exibe "Edlasio":', headerGreeting);
      allPassed = false;
    }

    if (headerSub.includes('Administração Central')) {
      console.log('  ✅ Subtítulo "Administração Central" mantido intacto');
    } else {
      console.error('  ❌ Subtítulo corrompido:', headerSub);
      allPassed = false;
    }

    if (idDigitalCard && idDigitalCard.includes('Gestor Operativo Verificado')) {
      console.log('  ✅ ID Digital preservado ("Gestor Operativo Verificado")');
    } else {
      console.error('  ❌ ID Digital corrompido:', idDigitalCard);
      allPassed = false;
    }

    // 5. Testar Persistência (Reload/F5)
    console.log('\n[5] Testar Persistência com Recarregamento (Reload)...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const reloadHeader = (await page.textContent('div.flex-1 h2'))?.trim();
    console.log('  Header após Reload:', reloadHeader);

    if (reloadHeader.includes('Edlasio')) {
      console.log('  ✅ Persistência 100% OK após recarregamento da página.');
    } else {
      console.error('  ❌ Persistência falhou após reload:', reloadHeader);
      allPassed = false;
    }

  } catch (e) {
    console.error('❌ Erro durante teste:', e);
    allPassed = false;
  } finally {
    await browser.close();
  }

  if (allPassed) {
    console.log('\n🎉 TODOS OS TESTES PARA ADMIN-0001 PASSARAM COM SUCESSO (100% OK)!');
    process.exit(0);
  } else {
    console.error('\n❌ TESTE FALHOU!');
    process.exit(1);
  }
})();
