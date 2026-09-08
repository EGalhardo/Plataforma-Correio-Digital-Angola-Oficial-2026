import { chromium } from 'playwright';

(async () => {
  console.log('🚀 INICIANDO TESTE E2E COMPLETO: ADMIN & INSTITUIÇÃO (PERFIL E PAINEL)');
  const browser = await chromium.launch({ headless: true });

  let allPassed = true;

  // ==========================================
  // 1. TESTE: ÁREA DA ADMINISTRAÇÃO CENTRAL
  // ==========================================
  console.log('\n==================================================');
  console.log('1. TESTE: ÁREA DA ADMINISTRAÇÃO CENTRAL');
  console.log('==================================================');
  const admCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const admPage = await admCtx.newPage();

  // Login como Admin
  await admPage.goto('http://localhost:3000/admin#/entrar', { waitUntil: 'domcontentloaded' });
  await admPage.waitForTimeout(600);
  await admPage.locator('input[type="text"]:visible, input:not([type]):visible').first().fill('ADM-8812-OP');
  await admPage.locator('input[type="password"]:visible').first().fill('GALHARDO');
  await admPage.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first().click();
  await admPage.waitForTimeout(1500);

  // Painel Admin Antes da Edição
  await admPage.evaluate(() => { window.location.hash = '#/gov-dashboard'; });
  await admPage.waitForTimeout(1000);

  const preAdmHeader = (await admPage.textContent('div.flex-1 h2').catch(() => ''))?.trim();
  const preAdmSubHeader = (await admPage.textContent('div.flex-1 small').catch(() => ''))?.trim();
  const preAdmLogoSrc = await admPage.getAttribute('div.rounded-2xl.bg-white img', 'src').catch(() => null);
  const preAdmIdDigital = (await admPage.textContent('div.min-w-0 div.text-base, div.min-w-0 div.text-xl').catch(() => ''))?.trim();

  console.log('[Painel Admin - Inicial]');
  console.log('  - Header:', preAdmHeader);
  console.log('  - Subtitle:', preAdmSubHeader);
  console.log('  - Logomarca:', preAdmLogoSrc);
  console.log('  - ID Digital:', preAdmIdDigital);

  // Navegar para Perfil do Admin
  await admPage.evaluate(() => { window.location.hash = '#/gov-perfil'; });
  await admPage.waitForTimeout(1000);

  const preProfileGreeting = (await admPage.textContent('h1').catch(() => ''))?.trim();
  const preProfileName = (await admPage.textContent('h3.text-xl').catch(() => ''))?.trim();
  console.log('  [Perfil Admin - Inicial]');
  console.log('    - Saudação:', preProfileGreeting);
  console.log('    - Nome no Card:', preProfileName);

  // Editar Nome Completo do Admin
  const btnEditAdm = admPage.locator('button:has-text("Editar Perfil")').first();
  if (await btnEditAdm.isVisible().catch(() => false)) {
    await btnEditAdm.click();
    await admPage.waitForTimeout(500);

    const admNameInput = admPage.locator('div.grid input[type="text"]').first();
    await admNameInput.fill('Comandante Geral António Lourenço');

    const admPhoneInput = admPage.locator('div.grid input[type="text"]').nth(1);
    await admPhoneInput.fill('+244 923 888 999');

    const admNifInput = admPage.locator('div.grid input[type="text"]').nth(2);
    await admNifInput.fill('5401999777');

    const btnSalvarAdm = admPage.locator('button:has-text("Gravar"), button:has-text("Salvar"), button:has-text("Guardar")').first();
    await btnSalvarAdm.click();
    await admPage.waitForTimeout(1000);
  } else {
    console.error('❌ Botão "Editar Perfil" não encontrado na página Perfil Admin');
    allPassed = false;
  }

  // Verificar na própria página Perfil do Admin
  const postProfileGreeting = (await admPage.textContent('h1').catch(() => ''))?.trim();
  const postProfileName = (await admPage.textContent('h3.text-xl').catch(() => ''))?.trim();

  const admFinalNameField = await admPage.evaluate(() => {
    const nomeEl = Array.from(document.querySelectorAll('span, div, h1, h3')).find(el => el.textContent.trim() === 'Nome Completo');
    return nomeEl?.parentElement?.querySelector('span.text-xs, div, p')?.textContent?.trim() || '';
  });

  console.log('\n[Perfil Admin - Pós-Edição]');
  console.log('  - Saudação:', postProfileGreeting);
  console.log('  - Nome no Card:', postProfileName);
  console.log('  - Campo Nome Completo:', admFinalNameField);

  if (postProfileGreeting.includes('Comandante') || postProfileGreeting.includes('António')) {
    console.log('  ✅ Saudação do Perfil atualizada:', postProfileGreeting);
  } else {
    console.error('  ❌ Saudação do Perfil não atualizou:', postProfileGreeting);
    allPassed = false;
  }

  if (postProfileName === 'Comandante Geral António Lourenço') {
    console.log('  ✅ Nome no Card do Perfil atualizado:', postProfileName);
  } else {
    console.error('  ❌ Nome no Card do Perfil não atualizou:', postProfileName);
    allPassed = false;
  }

  if (admFinalNameField === 'Comandante Geral António Lourenço') {
    console.log('  ✅ Campo "Nome Completo" no Perfil atualizado:', admFinalNameField);
  } else {
    console.error('  ❌ Campo "Nome Completo" no Perfil não atualizou:', admFinalNameField);
    allPassed = false;
  }

  // Voltar ao Painel Admin
  await admPage.evaluate(() => { window.location.hash = '#/gov-dashboard'; });
  await admPage.waitForTimeout(1000);

  const postAdmHeader = (await admPage.textContent('div.flex-1 h2').catch(() => ''))?.trim();
  const postAdmSubHeader = (await admPage.textContent('div.flex-1 small').catch(() => ''))?.trim();
  const postAdmLogoSrc = await admPage.getAttribute('div.rounded-2xl.bg-white img', 'src').catch(() => null);
  const postAdmIdDigital = (await admPage.textContent('div.min-w-0 div.text-base, div.min-w-0 div.text-xl').catch(() => ''))?.trim();

  console.log('\n[Painel Admin - Pós-Edição de Nome]');
  console.log('  - Header:', postAdmHeader);
  console.log('  - Subtitle:', postAdmSubHeader);
  console.log('  - Logomarca:', postAdmLogoSrc);
  console.log('  - ID Digital:', postAdmIdDigital);

  // Verificações Admin
  if (postAdmHeader.includes('Comandante') || postAdmHeader.includes('António')) {
    console.log('  ✅ Header Admin atualizou com o novo nome da pessoa:', postAdmHeader);
  } else {
    console.error('  ❌ Header Admin não atualizou com o novo nome:', postAdmHeader);
    allPassed = false;
  }

  if (postAdmSubHeader.includes('Administração Central')) {
    console.log('  ✅ Subtítulo da Administração Central mantido intacto:', postAdmSubHeader);
  } else {
    console.error('  ❌ Subtítulo Admin foi corrompido:', postAdmSubHeader);
    allPassed = false;
  }

  if (postAdmLogoSrc && postAdmLogoSrc.includes('Icone-Correio-Angola')) {
    console.log('  ✅ Logomarca oficial do Governo/Correio mantida intacta:', postAdmLogoSrc);
  } else {
    console.error('  ❌ Logomarca oficial do Governo foi alterada:', postAdmLogoSrc);
    allPassed = false;
  }

  if (postAdmIdDigital && postAdmIdDigital.includes('Gestor Operativo Verificado')) {
    console.log('  ✅ ID Digital do Admin mantido ("Gestor Operativo Verificado"):', postAdmIdDigital);
  } else {
    console.error('  ❌ ID Digital do Admin corrompido:', postAdmIdDigital);
    allPassed = false;
  }

  // Testar Persistência após Reload
  console.log('\n[Teste de Persistência - Reload]');
  await admPage.reload({ waitUntil: 'domcontentloaded' });
  await admPage.waitForTimeout(1000);

  const reloadedAdmHeader = (await admPage.textContent('div.flex-1 h2').catch(() => ''))?.trim();
  console.log('  - Header após reload:', reloadedAdmHeader);

  if (reloadedAdmHeader.includes('Comandante') || reloadedAdmHeader.includes('António')) {
    console.log('  ✅ Persistência confirmada: Header manteve o nome atualizado após reload');
  } else {
    console.error('  ❌ Persistência falhou: Header perdeu o nome após reload:', reloadedAdmHeader);
    allPassed = false;
  }

  await admCtx.close();

  // ==========================================
  // 2. TESTE: ÁREA DA INSTITUIÇÃO
  // ==========================================
  console.log('\n==================================================');
  console.log('2. TESTE: ÁREA DA INSTITUIÇÃO');
  console.log('==================================================');
  const instCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const instPage = await instCtx.newPage();

  // Login como Instituição
  await instPage.goto('http://localhost:3000/institucional#/entrar', { waitUntil: 'domcontentloaded' });
  await instPage.waitForTimeout(600);
  await instPage.locator('input[type="text"]:visible, input:not([type]):visible').first().fill('AGT-9921-SR');
  await instPage.locator('input[type="password"]:visible').first().fill('000000');
  await instPage.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first().click();
  await instPage.waitForTimeout(1500);

  // Painel Antes da Edição
  await instPage.evaluate(() => { window.location.hash = '#/home'; });
  await instPage.waitForTimeout(1000);

  // Navegar para Perfil
  await instPage.evaluate(() => { window.location.hash = '#/perfil'; });
  await instPage.waitForTimeout(1000);

  // Editar Nome Completo
  const btnEditInst = instPage.locator('button:has-text("Editar Perfil")').last();
  await btnEditInst.click();
  await instPage.waitForTimeout(500);

  const nameInput = instPage.locator('div.grid input[type="text"]').first();
  await nameInput.fill('Dra. Paula Fernandes Silva');

  const btnSalvar = instPage.locator('button:has-text("Gravar"), button:has-text("Salvar")').first();
  await btnSalvar.click();
  await instPage.waitForTimeout(1000);

  // Voltar ao Painel
  await instPage.evaluate(() => { window.location.hash = '#/home'; });
  await instPage.waitForTimeout(1000);

  const postInstHeader = (await instPage.textContent('div.flex-1 h2').catch(() => ''))?.trim();
  const postInstSubHeader = (await instPage.textContent('div.flex-1 small').catch(() => ''))?.trim();
  const postInstLogoSrc = await instPage.getAttribute('div.group div.rounded-2xl img', 'src').catch(() => null);
  const postInstSummary = (await instPage.textContent('div.group div.text-slate-900').catch(() => ''))?.trim();

  console.log('\n[Painel Institucional - Pós-Edição de Nome]');
  console.log('  - Header:', postInstHeader);
  console.log('  - Subtitle:', postInstSubHeader);
  console.log('  - Logomarca:', postInstLogoSrc);
  console.log('  - ID Digital:', postInstSummary);

  // Verificações
  if (postInstHeader.includes('Dra.') || postInstHeader.includes('Paula')) {
    console.log('  ✅ Header atualizou com o novo nome da pessoa:', postInstHeader);
  } else {
    console.error('  ❌ Header não atualizou com o novo nome:', postInstHeader);
    allPassed = false;
  }

  if (postInstSubHeader.includes('Institucional')) {
    console.log('  ✅ Subtítulo da Área Institucional mantido:', postInstSubHeader);
  } else {
    console.error('  ❌ Subtítulo da Área foi alterado:', postInstSubHeader);
    allPassed = false;
  }

  if (postInstLogoSrc && postInstLogoSrc.includes('AGT')) {
    console.log('  ✅ Logomarca oficial da AGT permaneceu intacta:', postInstLogoSrc);
  } else {
    console.error('  ❌ Logomarca oficial foi alterada ou corrompida:', postInstLogoSrc);
    allPassed = false;
  }

  if (postInstSummary && postInstSummary.includes('AGT')) {
    console.log('  ✅ ID Digital Institucional mantido ("Agente AGT Verificado"):', postInstSummary);
  } else {
    console.error('  ❌ ID Digital foi corrompido:', postInstSummary);
    allPassed = false;
  }

  await instCtx.close();
  await browser.close();

  if (allPassed) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO (100% OK)!');
    process.exit(0);
  } else {
    console.error('\n❌ ALGUNS TESTES FALHARAM!');
    process.exit(1);
  }
})();
