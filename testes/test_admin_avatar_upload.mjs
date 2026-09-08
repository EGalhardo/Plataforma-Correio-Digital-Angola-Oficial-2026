import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  console.log('🚀 TESTE E2E: ATUALIZAÇÃO E PERSISTÊNCIA DA FOTO DE PERFIL NA ÁREA ADMIN');

  // Create a 100x100 solid test image buffer (PNG)
  const samplePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA0SURBVHhe7cEBDQAAAMKg909tDjcgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4Dcx8AAB7yUqawAAAABJRU5ErkJggg==';
  const testImagePath = '/tmp/test_admin_avatar.png';
  fs.writeFileSync(testImagePath, Buffer.from(samplePngBase64, 'base64'));

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

    // 3. Upload da nova foto de perfil
    console.log('\n[3] Selecionar ficheiro de imagem e fazer upload...');
    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(1500);

    // 4. Validar exibição da foto no Perfil
    console.log('\n[4] Validar exibição da foto no Perfil...');
    const perfilAvatarImg = page.locator('div.group img');
    const imgCount = await perfilAvatarImg.count();
    console.log('  Imagens encontradas no cartão de perfil:', imgCount);

    if (imgCount > 0) {
      const src = await perfilAvatarImg.getAttribute('src');
      console.log('  ✅ Foto renderizada no Perfil com sucesso. src =', src?.slice(0, 60) + '...');
    } else {
      console.error('  ❌ Foto não foi renderizada no Perfil após upload.');
      allPassed = false;
    }

    // 5. Validar exibição da foto no Cabeçalho (Header)
    console.log('\n[5] Validar exibição da foto no Cabeçalho (Header)...');
    const headerAvatarImg = page.locator('header img');
    const headerImgCount = await headerAvatarImg.count();
    console.log('  Imagens encontradas no Header:', headerImgCount);

    if (headerImgCount > 0) {
      console.log('  ✅ Foto refletida no Cabeçalho superior com sucesso.');
    } else {
      console.error('  ❌ Foto não apareceu no Cabeçalho.');
      allPassed = false;
    }

    // 6. Validar navegação entre abas mantendo a foto no Cabeçalho
    console.log('\n[6] Navegar entre abas e verificar a foto no Cabeçalho...');
    const abas = [
      { name: 'Painel', selector: 'aside button:has-text("Painel")' },
      { name: 'Instituições', selector: 'aside button:has-text("Instituições")' },
      { name: 'Correspondências', selector: 'aside button:has-text("Correspondências")' }
    ];

    for (const aba of abas) {
      await page.locator(aba.selector).click();
      await page.waitForTimeout(500);
      const hCount = await page.locator('header img').count();
      if (hCount > 0) {
        console.log(`  ✅ Foto do avatar visível no Cabeçalho da aba ${aba.name}`);
      } else {
        console.error(`  ❌ Foto do avatar sumiu no Cabeçalho da aba ${aba.name}`);
        allPassed = false;
      }
    }

    // 7. Testar Persistência da foto após Recarregamento (F5 / Reload)
    console.log('\n[7] Recarregar a página (F5) e verificar persistência da foto...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const hImgCountReload = await page.locator('header img').count();
    if (hImgCountReload > 0) {
      console.log('  ✅ Foto do Cabeçalho persistiu intacta após F5.');
    } else {
      console.error('  ❌ Foto sumiu do Cabeçalho após reload.');
      allPassed = false;
    }

    await page.locator('aside button:has-text("Perfil")').click();
    await page.waitForTimeout(1000);

    const perfilImgReload = await page.locator('div.group img').count();
    if (perfilImgReload > 0) {
      const srcReload = await page.locator('div.group img').getAttribute('src');
      console.log('  ✅ Foto do Perfil persistiu intacta após F5. src =', srcReload?.slice(0, 60) + '...');
    } else {
      console.error('  ❌ Foto sumiu do Perfil após reload.');
      allPassed = false;
    }

    // 8. Testar Persistência após Logout e Re-login
    console.log('\n[8] Testar Persistência após Logout e Re-login...');
    await page.locator('aside button:has-text("SAIR DO CANAL"), aside button:has-text("Sair do Canal")').click();
    await page.waitForTimeout(1000);

    await page.locator('input[name="cda-utilizador"]').fill('ADMIN-0001');
    await page.locator('input[name="cda-senha"]').fill('GALHARDO');
    await page.getByRole('button', { name: /ENTRAR/i }).first().click();
    await page.waitForTimeout(1500);

    await page.locator('aside button:has-text("Perfil")').click();
    await page.waitForTimeout(1000);

    const perfilImgReLogin = await page.locator('div.group img').count();
    if (perfilImgReLogin > 0) {
      console.log('  ✅ Foto de perfil persistiu após novo login!');
    } else {
      console.error('  ❌ Foto de perfil não persistiu após novo login.');
      allPassed = false;
    }

  } catch (e) {
    console.error('❌ Exceção durante a execução do teste:', e);
    allPassed = false;
  } finally {
    await browser.close();
    if (fs.existsSync(testImagePath)) fs.unlinkSync(testImagePath);
  }

  if (allPassed) {
    console.log('\n🎉 SUCESSO TOTAL: ATUALIZAÇÃO DA FOTO DE PERFIL NO ADMIN FUNCIONA A 100%!');
    process.exit(0);
  } else {
    console.error('\n❌ TESTE FALHOU!');
    process.exit(1);
  }
})();
