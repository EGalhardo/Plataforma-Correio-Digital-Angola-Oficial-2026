import { chromium } from 'playwright';

(async () => {
  console.log('🚀 INICIANDO TESTE E2E: EDIÇÃO DE NOME COMPLETO & PRESERVAÇÃO DE BRANDING/LOGOMARCA');
  const browser = await chromium.launch({ headless: true });

  let allPassed = true;

  // ==========================================
  // 1. ÁREA DA INSTITUIÇÃO
  // ==========================================
  console.log('\n==================================================');
  console.log('1. TESTE: ÁREA DA INSTITUIÇÃO');
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

  const preInstHeader = (await instPage.textContent('div.flex-1 h2').catch(() => ''))?.trim();
  const preInstSubHeader = (await instPage.textContent('div.flex-1 small').catch(() => ''))?.trim();
  const preInstLogoSrc = await instPage.getAttribute('div.group div.rounded-2xl img', 'src').catch(() => null);
  const preInstSummary = (await instPage.textContent('div.group div.text-slate-900').catch(() => ''))?.trim();

  console.log('[Painel Institucional - Inicial]');
  console.log('  - Header:', preInstHeader);
  console.log('  - Subtitle:', preInstSubHeader);
  console.log('  - Logomarca:', preInstLogoSrc);
  console.log('  - ID Digital:', preInstSummary);

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

  // Verificar se o Perfil mantém os campos desacoplados
  await instPage.evaluate(() => { window.location.hash = '#/perfil'; });
  await instPage.waitForTimeout(1000);

  const postFields = await instPage.evaluate(() => {
    return Array.from(document.querySelectorAll('div.grid > div')).map(div => {
      const label = div.querySelector('span, label, p')?.textContent?.trim() || '';
      const val = div.querySelector('p, strong, div, input')?.textContent?.trim() || '';
      return { label, val };
    });
  });

  const finalNome = postFields.find(f => f.label === 'Nome Completo')?.val;
  const finalInst = postFields.find(f => f.label === 'Instituição Sincronizada')?.val;

  console.log('  [Perfil Institucional] Nome Completo:', finalNome);
  console.log('  [Perfil Institucional] Instituição Sincronizada:', finalInst);

  if (finalNome === 'Dra. Paula Fernandes Silva') {
    console.log('  ✅ Nome Completo no Perfil atualizado corretamente:', finalNome);
  } else {
    console.error('  ❌ Nome Completo incorreto no Perfil:', finalNome);
    allPassed = false;
  }

  if (finalInst && finalInst.includes('Administração Geral Tributária')) {
    console.log('  ✅ Instituição Sincronizada preservada:', finalInst);
  } else {
    console.error('  ❌ Instituição Sincronizada corrompida:', finalInst);
    allPassed = false;
  }

  await instCtx.close();

  // ==========================================
  // 2. ÁREA DA ADMINISTRAÇÃO CENTRAL
  // ==========================================
  console.log('\n==================================================');
  console.log('2. TESTE: ÁREA DA ADMINISTRAÇÃO CENTRAL');
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

  console.log('[Painel Admin - Inicial]');
  console.log('  - Header:', preAdmHeader);
  console.log('  - Subtitle:', preAdmSubHeader);
  console.log('  - Logomarca:', preAdmLogoSrc);

  // Navegar para Perfil do Admin
  await admPage.evaluate(() => { window.location.hash = '#/gov-perfil'; });
  await admPage.waitForTimeout(1000);

  // Editar Nome Completo do Admin
  const btnEditAdm = admPage.locator('button:has-text("Editar Perfil")').first();
  if (await btnEditAdm.isVisible().catch(() => false)) {
    await btnEditAdm.click();
    await admPage.waitForTimeout(500);

    const admNameInput = admPage.locator('div.grid input[type="text"]').first();
    await admNameInput.fill('Comandante Geral António Lourenço');

    const btnSalvarAdm = admPage.locator('button:has-text("Gravar"), button:has-text("Salvar"), button:has-text("Guardar")').first();
    await btnSalvarAdm.click();
    await admPage.waitForTimeout(1000);
  }

  // Voltar ao Painel Admin
  await admPage.evaluate(() => { window.location.hash = '#/gov-dashboard'; });
  await admPage.waitForTimeout(1000);

  const postAdmHeader = (await admPage.textContent('div.flex-1 h2').catch(() => ''))?.trim();
  const postAdmSubHeader = (await admPage.textContent('div.flex-1 small').catch(() => ''))?.trim();
  const postAdmLogoSrc = await admPage.getAttribute('div.rounded-2xl.bg-white img', 'src').catch(() => null);

  console.log('\n[Painel Admin - Pós-Edição de Nome]');
  console.log('  - Header:', postAdmHeader);
  console.log('  - Subtitle:', postAdmSubHeader);
  console.log('  - Logomarca:', postAdmLogoSrc);

  // Verificações Admin
  if (postAdmHeader.includes('Comandante') || postAdmHeader.includes('António')) {
    console.log('  ✅ Header Admin atualizou com o novo nome da pessoa:', postAdmHeader);
  } else {
    console.error('  ❌ Header Admin não atualizou com o novo nome:', postAdmHeader);
    allPassed = false;
  }

  if (postAdmSubHeader.includes('Administração Central')) {
    console.log('  ✅ Subtítulo da Administração Central mantido:', postAdmSubHeader);
  } else {
    console.error('  ❌ Subtítulo Admin foi alterado:', postAdmSubHeader);
    allPassed = false;
  }

  if (postAdmLogoSrc && postAdmLogoSrc.includes('Icone-Correio-Angola')) {
    console.log('  ✅ Logomarca oficial do Governo/Correio mantida:', postAdmLogoSrc);
  } else {
    console.error('  ❌ Logomarca oficial do Governo foi alterada:', postAdmLogoSrc);
    allPassed = false;
  }

  // Verificar Perfil Admin
  await admPage.evaluate(() => { window.location.hash = '#/gov-perfil'; });
  await admPage.waitForTimeout(1000);

  const admFinalName = await admPage.evaluate(() => {
    const nomeEl = Array.from(document.querySelectorAll('span, div, h1, h3')).find(el => el.textContent.trim() === 'Nome Completo');
    return nomeEl?.parentElement?.querySelector('span.text-xs, div, p')?.textContent?.trim() || '';
  });

  console.log('  [Perfil Admin] Nome Completo:', admFinalName);
  if (admFinalName === 'Comandante Geral António Lourenço') {
    console.log('  ✅ Nome Completo no Perfil Admin atualizado corretamente:', admFinalName);
  } else {
    console.error('  ❌ Nome Completo incorreto no Perfil Admin:', admFinalName);
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
