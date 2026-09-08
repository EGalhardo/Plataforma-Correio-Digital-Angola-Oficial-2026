import { chromium } from 'playwright';

(async () => {
  console.log('🚀 INICIANDO TESTE E2E DE DESACOPLAMENTO DE NOME / INSTITUIÇÃO');
  const browser = await chromium.launch({ headless: true });

  let allPassed = true;

  // ==========================================
  // 1. ÁREA DO CIDADÃO
  // ==========================================
  console.log('\n--- 1. TESTE ÁREA DO CIDADÃO ---');
  const citCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const citPage = await citCtx.newPage();
  
  await citPage.goto('http://localhost:3000/#/login', { waitUntil: 'domcontentloaded' });
  await citPage.waitForTimeout(600);
  
  await citPage.locator('input[type="text"]:visible, input:not([type]):visible').first().fill('009874562LA041');
  await citPage.locator('input[type="password"]:visible').first().fill('123456');
  await citPage.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first().click();
  await citPage.waitForTimeout(1500);

  await citPage.evaluate(() => { window.location.hash = '#/home'; });
  await citPage.waitForTimeout(800);

  const citHeaderTitle = (await citPage.textContent('div.flex-1 h2').catch(() => ''))?.trim();
  console.log('  [Cidadão] Header Título:', citHeaderTitle);
  if (citHeaderTitle.startsWith('Olá,') || citHeaderTitle.startsWith('Oi')) {
    console.log('  ✅ Cidadão Header OK:', citHeaderTitle);
  } else {
    console.error('  ❌ Cidadão Header Falhou:', citHeaderTitle);
    allPassed = false;
  }

  await citCtx.close();

  // ==========================================
  // 2. ÁREA DA INSTITUIÇÃO
  // ==========================================
  console.log('\n--- 2. TESTE ÁREA DA INSTITUIÇÃO ---');
  const instCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const instPage = await instCtx.newPage();

  await instPage.goto('http://localhost:3000/institucional#/entrar', { waitUntil: 'domcontentloaded' });
  await instPage.waitForTimeout(600);

  await instPage.locator('input[type="text"]:visible, input:not([type]):visible').first().fill('AGT-9921-SR');
  await instPage.locator('input[type="password"]:visible').first().fill('000000');
  await instPage.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first().click();
  await instPage.waitForTimeout(1500);

  await instPage.evaluate(() => { window.location.hash = '#/home'; });
  await instPage.waitForTimeout(800);

  const instHeaderTitle = (await instPage.textContent('div.flex-1 h2').catch(() => ''))?.trim();
  console.log('  [Instituição] Header Título:', instHeaderTitle);
  if (instHeaderTitle.startsWith('Olá,') || instHeaderTitle.startsWith('Oi')) {
    console.log('  ✅ Instituição Header OK (Nome do usuário exibido):', instHeaderTitle);
  } else {
    console.error('  ❌ Instituição Header Falhou (Esperado "Olá, [Nome]", obtido):', instHeaderTitle);
    allPassed = false;
  }

  // Navegar para Perfil Institucional
  await instPage.evaluate(() => { window.location.hash = '#/perfil'; });
  await instPage.waitForTimeout(1000);

  const instFields = await instPage.evaluate(() => {
    return Array.from(document.querySelectorAll('div.grid > div')).map(div => {
      const label = div.querySelector('span, label, p')?.textContent?.trim() || '';
      const val = div.querySelector('p, strong, div, input')?.textContent?.trim() || '';
      return { label, val };
    });
  });

  const nomeField = instFields.find(f => f.label === 'Nome Completo');
  const instSyncField = instFields.find(f => f.label === 'Instituição Sincronizada');
  console.log('  [Instituição Perfil] Campo "Nome Completo":', nomeField?.val);
  console.log('  [Instituição Perfil] Campo "Instituição Sincronizada":', instSyncField?.val);

  if (nomeField && !nomeField.val.includes('Administração Geral Tributária') && nomeField.val.length > 0) {
    console.log('  ✅ Campo "Nome Completo" exibe nome pessoal:', nomeField.val);
  } else {
    console.error('  ❌ Campo "Nome Completo" incorreto:', nomeField?.val);
    allPassed = false;
  }

  if (instSyncField && instSyncField.val.includes('Administração Geral Tributária')) {
    console.log('  ✅ Campo "Instituição Sincronizada" exibe instituição:', instSyncField.val);
  } else {
    console.error('  ❌ Campo "Instituição Sincronizada" incorreto:', instSyncField?.val);
    allPassed = false;
  }

  // Testar Edição de Perfil Institucional
  console.log('\n  -> Testando edição de perfil na Instituição...');
  const btnEditInst = instPage.locator('button:has-text("Editar Perfil")').last();
  if (await btnEditInst.isVisible().catch(() => false)) {
    await btnEditInst.click();
    await instPage.waitForTimeout(500);

    // Mudar nome do usuário
    const nameInput = instPage.locator('div.grid input[type="text"]').first();
    await nameInput.fill('Manuel António Galhardo');
    
    // Salvar ("Gravar")
    const btnSalvar = instPage.locator('button:has-text("Gravar"), button:has-text("Salvar")').first();
    await btnSalvar.click();
    await instPage.waitForTimeout(1000);

    // Verificar se Header foi atualizado com o novo nome
    await instPage.evaluate(() => { window.location.hash = '#/home'; });
    await instPage.waitForTimeout(800);
    const updatedInstHeader = (await instPage.textContent('div.flex-1 h2').catch(() => ''))?.trim();
    console.log('  [Instituição] Header após edição de nome:', updatedInstHeader);
    if (updatedInstHeader.includes('Manuel')) {
      console.log('  ✅ Header atualizado com o novo nome:', updatedInstHeader);
    } else {
      console.error('  ❌ Header não refletiu o novo nome:', updatedInstHeader);
      allPassed = false;
    }

    // Verificar se Instituição permanece intacta
    await instPage.evaluate(() => { window.location.hash = '#/perfil'; });
    await instPage.waitForTimeout(800);
    const postEditFields = await instPage.evaluate(() => {
      return Array.from(document.querySelectorAll('div.grid > div')).map(div => {
        const label = div.querySelector('span, label, p')?.textContent?.trim() || '';
        const val = div.querySelector('p, strong, div, input')?.textContent?.trim() || '';
        return { label, val };
      });
    });
    const postInstSync = postEditFields.find(f => f.label === 'Instituição Sincronizada');
    console.log('  [Instituição Perfil] Campo "Instituição Sincronizada" após edição:', postInstSync?.val);
    if (postInstSync && postInstSync.val.includes('Administração Geral Tributária')) {
      console.log('  ✅ Razão social da Instituição permaneceu preservada!');
    } else {
      console.error('  ❌ Razão social foi corrompida:', postInstSync?.val);
      allPassed = false;
    }
  }

  await instCtx.close();

  // ==========================================
  // 3. ÁREA DA ADMINISTRAÇÃO CENTRAL
  // ==========================================
  console.log('\n--- 3. TESTE ÁREA DA ADMINISTRAÇÃO CENTRAL ---');
  const admCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const admPage = await admCtx.newPage();

  await admPage.goto('http://localhost:3000/admin#/entrar', { waitUntil: 'domcontentloaded' });
  await admPage.waitForTimeout(600);

  await admPage.locator('input[type="text"]:visible, input:not([type]):visible').first().fill('ADM-8812-OP');
  await admPage.locator('input[type="password"]:visible').first().fill('GALHARDO');
  await admPage.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first().click();
  await admPage.waitForTimeout(1500);

  await admPage.evaluate(() => { window.location.hash = '#/gov-dashboard'; });
  await admPage.waitForTimeout(800);

  const admHeaderTitle = (await admPage.textContent('div.flex-1 h2').catch(() => ''))?.trim();
  console.log('  [Admin] Header Título:', admHeaderTitle);
  if (admHeaderTitle.startsWith('Olá,') || admHeaderTitle.startsWith('Oi')) {
    console.log('  ✅ Admin Header OK (Nome do usuário exibido):', admHeaderTitle);
  } else {
    console.error('  ❌ Admin Header Falhou (Esperado "Olá, [Nome]", obtido):', admHeaderTitle);
    allPassed = false;
  }

  // Navegar para Perfil do Admin
  await admPage.evaluate(() => { window.location.hash = '#/gov-perfil'; });
  await admPage.waitForTimeout(1000);

  const admProfileName = await admPage.evaluate(() => {
    const nomeEl = Array.from(document.querySelectorAll('span, div, h1, h3')).find(el => el.textContent.trim() === 'Nome Completo');
    return nomeEl?.parentElement?.querySelector('span.text-xs, div, p')?.textContent?.trim() || '';
  });
  console.log('  [Admin Perfil] Campo "Nome Completo":', admProfileName);
  if (admProfileName.length > 0) {
    console.log('  ✅ Admin Perfil "Nome Completo" OK:', admProfileName);
  } else {
    console.error('  ❌ Admin Perfil "Nome Completo" vazio!');
    allPassed = false;
  }

  await admCtx.close();
  await browser.close();

  if (allPassed) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO (100% OK)!');
    process.exit(0);
  } else {
    console.error('\n❌ ALGUNS TESTES FALHARAM!');
    process.exit(1);
  }
})();
