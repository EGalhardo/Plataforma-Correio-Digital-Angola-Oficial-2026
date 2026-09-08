import { chromium } from 'playwright';

(async () => {
  console.log('🚀 TESTE E2E COMPLETO: ALTERAÇÃO E VALIDAÇÃO DE DADOS NO PERFIL DA ÁREA ADMIN');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let allPassed = true;

  try {
    // 1. Login na Área Admin com ADMIN-0001
    console.log('\n[1] Autenticando na Área Admin (ADMIN-0001 / GALHARDO)...');
    await page.goto('http://localhost:3000/admin#/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    await page.locator('input[name="cda-utilizador"]').fill('ADMIN-0001');
    await page.locator('input[name="cda-senha"]').fill('GALHARDO');
    await page.getByRole('button', { name: /ENTRAR/i }).first().click();
    await page.waitForTimeout(1500);

    console.log('  URL inicial pós-login:', page.url());

    // 2. Navegar para a página Perfil
    console.log('\n[2] Aceder à página Perfil...');
    await page.locator('aside button:has-text("Perfil")').click();
    await page.waitForTimeout(1000);

    // 3. Testar alteração de dados do Perfil para "Gaspar de Almeida"
    console.log('\n[3] Clicar em "Editar Perfil" e preencher novos dados...');
    const btnEdit = page.locator('button:has-text("Editar Perfil")');
    await btnEdit.waitFor({ state: 'visible', timeout: 5000 });
    await btnEdit.click();
    await page.waitForTimeout(500);

    const inputNome = page.locator('label:has-text("Nome Completo") + input');
    const inputTelefone = page.locator('label:has-text("Telefone Principal") + input');
    const inputEmail = page.locator('label:has-text("Email Funcional") + input');
    const inputNif = page.locator('label:has-text("NIF") + input');

    const novoNome = 'Gaspar de Almeida';
    const novoTelefone = '+244 933 777 888';
    const novoEmail = 'gaspar.almeida@mindis.gov.ao';
    const novoNif = '5401998877';

    await inputNome.fill(novoNome);
    await inputTelefone.fill(novoTelefone);
    await inputEmail.fill(novoEmail);
    await inputNif.fill(novoNif);

    console.log('  Dados preenchidos no formulário:');
    console.log(`    - Nome: ${novoNome}`);
    console.log(`    - Telefone: ${novoTelefone}`);
    console.log(`    - Email: ${novoEmail}`);
    console.log(`    - NIF: ${novoNif}`);

    // 4. Gravar alterações
    console.log('\n[4] Gravar alterações...');
    const btnGravar = page.locator('button:has-text("Gravar")');
    await btnGravar.waitFor({ state: 'visible', timeout: 5000 });
    await btnGravar.click();
    await page.waitForTimeout(1500);

    // 5. Verificar atualização imediata no Perfil
    console.log('\n[5] Validar campos na página Perfil imediatamente após Gravar...');
    const h1Perfil = (await page.textContent('h1'))?.trim();
    const h3Perfil = (await page.textContent('h3.text-xl'))?.trim();
    const headerGreeting = (await page.textContent('div.flex-1 h2'))?.trim();

    console.log(`    - Saudação H1 Perfil: ${h1Perfil}`);
    console.log(`    - Nome Card H3 Perfil: ${h3Perfil}`);
    console.log(`    - Cabeçalho Superior: ${headerGreeting}`);

    if (h1Perfil?.includes('Gaspar') && h3Perfil === novoNome && headerGreeting?.includes('Gaspar')) {
      console.log('  ✅ Nome atualizado com sucesso no Perfil e Cabeçalho!');
    } else {
      console.error('  ❌ Falha na atualização do nome:', { h1Perfil, h3Perfil, headerGreeting });
      allPassed = false;
    }

    // Revelar dados para ver telefone e nif completos
    const btnRevelar = page.locator('button:has-text("Revelar")').first();
    if (await btnRevelar.isVisible().catch(() => false)) {
      await btnRevelar.click();
      await page.waitForTimeout(400);
    }

    const camposAposEdicao = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('div.bg-white.border.border-slate-200.p-4')).map(el => {
        const label = el.querySelector('span')?.textContent?.trim() || '';
        const val = el.querySelector('span.text-xs')?.textContent?.trim() || '';
        return { label, val };
      });
    });
    console.log('  Campos renderizados no Perfil:', JSON.stringify(camposAposEdicao, null, 2));

    const campoNome = camposAposEdicao.find(c => c.label.includes('Nome Completo'))?.val;
    const campoEmail = camposAposEdicao.find(c => c.label.includes('Email'))?.val;
    const campoTelefone = camposAposEdicao.find(c => c.label.includes('Telefone'))?.val;
    const campoNif = camposAposEdicao.find(c => c.label.includes('NIF') || c.label.includes('Contribuinte'))?.val;

    if (campoNome === novoNome && campoEmail === novoEmail && campoTelefone === novoTelefone && campoNif === novoNif) {
      console.log('  ✅ Todos os campos (Nome, Email, Telefone, NIF) conferem 100% com os valores editados.');
    } else {
      console.error('  ❌ Divergência nos campos editados:', { campoNome, campoEmail, campoTelefone, campoNif });
      allPassed = false;
    }

    // 6. Navegar entre abas da Área Admin e verificar que o Cabeçalho mantém o nome
    console.log('\n[6] Navegação entre abas da Área Admin...');
    const abas = [
      { name: 'Painel', hash: '#/gov-dashboard' },
      { name: 'Instituições', hash: '#/gov-interoperabilidade' },
      { name: 'Correspondências', hash: '#/gov-correspondencias' },
      { name: 'Cidadãos', hash: '#/gov-contatos' }
    ];

    for (const aba of abas) {
      await page.locator(`aside button:has-text("${aba.name}")`).click();
      await page.waitForTimeout(600);
      const greeting = (await page.textContent('div.flex-1 h2'))?.trim();
      console.log(`    - Aba ${aba.name}: Cabeçalho = "${greeting}"`);
      if (!greeting?.includes('Gaspar')) {
        console.error(`  ❌ Saudação na aba ${aba.name} não contém "Gaspar": ${greeting}`);
        allPassed = false;
      }
    }
    console.log('  ✅ Todas as abas refletem o nome atualizado no Cabeçalho.');

    // 7. Teste de Persistência após Reload (F5)
    console.log('\n[7] Teste de Persistência após Recarregamento da Página (F5)...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const greetingReload = (await page.textContent('div.flex-1 h2'))?.trim();
    console.log(`    - Cabeçalho pós-Reload: "${greetingReload}"`);

    await page.locator('aside button:has-text("Perfil")').click();
    await page.waitForTimeout(1000);

    const h1Reload = (await page.textContent('h1'))?.trim();
    const h3Reload = (await page.textContent('h3.text-xl'))?.trim();
    console.log(`    - H1 Perfil pós-Reload: "${h1Reload}"`);
    console.log(`    - H3 Perfil pós-Reload: "${h3Reload}"`);

    if (greetingReload?.includes('Gaspar') && h1Reload?.includes('Gaspar') && h3Reload === novoNome) {
      console.log('  ✅ Persistência pós-Reload validada com 100% de sucesso!');
    } else {
      console.error('  ❌ Falha de persistência pós-reload:', { greetingReload, h1Reload, h3Reload });
      allPassed = false;
    }

    // 8. Reverter para Edlasio Galhardo
    console.log('\n[8] Atualizar de volta para "Edlasio Galhardo"...');
    const btnEdit2 = page.locator('button:has-text("Editar Perfil")');
    await btnEdit2.waitFor({ state: 'visible', timeout: 5000 });
    await btnEdit2.click();
    await page.waitForTimeout(500);

    const inputNome2 = page.locator('label:has-text("Nome Completo") + input');
    const inputTelefone2 = page.locator('label:has-text("Telefone Principal") + input');
    const inputEmail2 = page.locator('label:has-text("Email Funcional") + input');
    const inputNif2 = page.locator('label:has-text("NIF") + input');

    await inputNome2.fill('Edlasio Galhardo');
    await inputTelefone2.fill('+244 923 456 789');
    await inputEmail2.fill('admin@cda.gov.ao');
    await inputNif2.fill('5401329188');

    const btnGravar2 = page.locator('button:has-text("Gravar")');
    await btnGravar2.waitFor({ state: 'visible', timeout: 5000 });
    await btnGravar2.click();
    await page.waitForTimeout(1500);

    const finalGreeting = (await page.textContent('div.flex-1 h2'))?.trim();
    const finalH3 = (await page.textContent('h3.text-xl'))?.trim();
    console.log(`    - Cabeçalho Final: "${finalGreeting}"`);
    console.log(`    - H3 Final: "${finalH3}"`);

    if (finalGreeting?.includes('Edlasio') && finalH3 === 'Edlasio Galhardo') {
      console.log('  ✅ Reversão e persistência de "Edlasio Galhardo" 100% OK!');
    } else {
      console.error('  ❌ Falha na reversão final:', { finalGreeting, finalH3 });
      allPassed = false;
    }

  } catch (e) {
    console.error('❌ Exceção durante a execução do teste:', e);
    allPassed = false;
  } finally {
    await browser.close();
  }

  if (allPassed) {
    console.log('\n🎉 SUCESSO TOTAL: A ATUALIZAÇÃO DE DADOS NO PERFIL ADMIN FUNCIONA A 100%!');
    process.exit(0);
  } else {
    console.error('\n❌ TESTE FALHOU!');
    process.exit(1);
  }
})();
