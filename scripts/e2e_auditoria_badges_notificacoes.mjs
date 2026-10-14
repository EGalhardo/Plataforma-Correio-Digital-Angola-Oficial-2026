// ============================================================================
// E2E Test: Auditoria de Badges e Notificações em Dispositivos Móveis e Tablets
// (Mobile iPhone/Android, Tablet iPad Portrait/Landscape e Desktop)
// ============================================================================

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';

const viewports = [
  { name: 'Mobile iPhone SE', width: 375, height: 667, isMobile: true, hasTouch: true },
  { name: 'Mobile iPhone 14/15', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'Mobile Android (Pixel)', width: 412, height: 915, isMobile: true, hasTouch: true },
  { name: 'Tablet iPad Portrait', width: 768, height: 1024, isMobile: true, hasTouch: true },
  { name: 'Tablet iPad Air/Pro', width: 820, height: 1180, isMobile: true, hasTouch: true },
  { name: 'Tablet iPad Landscape', width: 1024, height: 768, isMobile: true, hasTouch: true },
];

const results = [];
function assert(name, condition, details = '') {
  const status = condition ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${name} ${details ? '(' + details + ')' : ''}`);
  results.push({ name, status, details });
  if (!condition) {
    console.error(`Assertion failed: ${name} ${details}`);
  }
}

async function checkBadgeMetrics(page, selector, desc, vpName) {
  const count = await page.locator(selector).count();
  if (count === 0) return { found: false };

  const el = page.locator(selector).first();
  const isVisible = await el.isVisible().catch(() => false);
  if (!isVisible) return { found: true, visible: false };

  const metrics = await el.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    const isTextOverflowHorizontal = node.scrollWidth > node.clientWidth + 1;
    const isTextOverflowVertical = node.scrollHeight > node.clientHeight + 1;
    const outOfViewportRight = rect.right > window.innerWidth;
    const outOfViewportLeft = rect.left < 0;
    const outOfViewportTop = rect.top < 0;

    return {
      width: rect.width,
      height: rect.height,
      innerText: node.innerText.trim(),
      isTextOverflowHorizontal,
      isTextOverflowVertical,
      outOfViewportRight,
      outOfViewportLeft,
      outOfViewportTop,
    };
  });

  const isClipped = metrics.isTextOverflowHorizontal || metrics.isTextOverflowVertical || metrics.outOfViewportRight || metrics.outOfViewportLeft;

  assert(`[${vpName}] ${desc} sem corte de layout`, !isClipped, `Texto="${metrics.innerText}", Box=${metrics.width.toFixed(1)}x${metrics.height.toFixed(1)}px`);
  return { found: true, visible: true, metrics, isClipped };
}

async function run() {
  console.log(`Iniciando bateria E2E de auditoria de badges em ${BASE}...`);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  try {
    for (const vp of viewports) {
      console.log(`\n======================================================`);
      console.log(`📱 Testando Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      console.log(`======================================================`);

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
      });
      const page = await context.newPage();

      // 1. Login como Edlásio Galhardo
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('input[name="cda-utilizador"]', { state: 'attached', timeout: 15000 });
      await page.fill('input[name="cda-utilizador"]', '002399714LA030');
      await page.fill('input[name="cda-senha"]', '123456789');
      await page.getByRole('button', { name: /ENTRAR NO PORTAL/i }).click();
      await page.waitForTimeout(3000);

      // 2. Verificar badge do avatar
      const avatarBadgeSelector = vp.width < 768
        ? 'header [data-testid="avatar-unread-badge"]'
        : 'div.hidden.md\\:flex [data-testid="avatar-unread-badge"]';
      await checkBadgeMetrics(page, avatarBadgeSelector, 'Badge do Avatar no Header', vp.name);

      // 3. Verificar contador do painel
      await checkBadgeMetrics(page, '[data-testid="unread-total-counter"]', 'Contador Não Lidas no Painel', vp.name);

      // 4. Abrir Menu do Avatar e verificar badge do dropdown
      const avatarBtnSelector = vp.width < 768
        ? 'header [aria-label="Menu de Perfil e Notificações"]'
        : 'div.hidden.md\\:flex [aria-label="Menu de Perfil e Notificações"]';
      const avatarBtn = page.locator(avatarBtnSelector);
      if (await avatarBtn.isVisible()) {
        await avatarBtn.click();
        await page.waitForTimeout(800);
        await checkBadgeMetrics(page, '[data-testid="menu-contador"]', 'Badge Contador do Dropdown do Avatar', vp.name);
        await page.locator('body').click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(400);
      }

      // 5. Verificar tabs de correspondência
      const atalhoCorreio = vp.width < 768
        ? page.locator('nav.cda-mobile-nav button', { hasText: /Correio/i }).first()
        : page.locator('button', { hasText: /Correio|Correspondências/i }).first();
      if (await atalhoCorreio.isVisible()) {
        await atalhoCorreio.click();
        await page.waitForTimeout(1500);
        await checkBadgeMetrics(page, 'button:has-text("Não Lidas") span', 'Badge Tab Não Lidas em Correio', vp.name);
        await checkBadgeMetrics(page, 'button:has-text("Todas") span', 'Badge Tab Todas em Correio', vp.name);
      }

      await context.close();
    }

    console.log(`\n======================================================`);
    console.log(`🎉 AUDITORIA DE BADGES CONCLUÍDA!`);
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    console.log(`Resultado: ${passCount} PASS, ${failCount} FAIL (Total: ${results.length})`);
    console.log(`======================================================`);

  } catch (err) {
    console.error('Erro durante a auditoria:', err);
    assert('Execução sem erros', false, err.message);
  } finally {
    await browser.close();
  }
}

run().then(() => {
  const failed = results.filter(r => r.status === 'FAIL').length > 0;
  process.exit(failed ? 1 : 0);
});
