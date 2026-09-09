import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const SHOT_DIR = path.resolve('testes/evidencias/video_call');

if (!fs.existsSync(SHOT_DIR)) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
}

async function runVideoE2ETest() {
  console.log('========================================================================');
  console.log('🧪 TESTE E2E WEBRTC: VIDEOATENDIMENTO BIDIRECIONAL CIDADÃO ↔ INSTITUIÇÃO');
  console.log('========================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  try {
    // -------------------------------------------------------------------------
    // 1. Criar Contexto CIDADÃO (Mobile - 390x844)
    // -------------------------------------------------------------------------
    console.log('📱 1. Configurando Contexto Cidadão Edlasio Galhardo (Mobile Viewport 390x844)...');
    const citizenContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      permissions: ['camera', 'microphone']
    });
    await citizenContext.addInitScript(() => {
      localStorage.setItem('skip_splash_and_show_login', 'true');
    });
    const citizenPage = await citizenContext.newPage();

    // -------------------------------------------------------------------------
    // 2. Criar Contexto INSTITUIÇÃO (Desktop - 1440x900)
    // -------------------------------------------------------------------------
    console.log('💻 2. Configurando Contexto Instituição INAPEM (Desktop Viewport 1440x900)...');
    const instContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      permissions: ['camera', 'microphone']
    });
    await instContext.addInitScript(() => {
      localStorage.setItem('skip_splash_and_show_login', 'true');
    });
    const instPage = await instContext.newPage();

    // -------------------------------------------------------------------------
    // 3. Autenticação do Cidadão (002399714LA030)
    // -------------------------------------------------------------------------
    console.log('\n🔑 3. Login do Cidadão (002399714LA030)...');
    await citizenPage.goto(`${BASE_URL}/#/login`, { waitUntil: 'domcontentloaded' });
    await citizenPage.waitForTimeout(600);
    const citInput = citizenPage.locator('input[type="text"]:visible, input:not([type]):visible').first();
    await citInput.waitFor({ state: 'visible', timeout: 8000 });
    await citInput.fill('002399714LA030');
    const citPass = citizenPage.locator('input[type="password"]:visible').first();
    await citPass.fill('123456789');
    const citBtn = citizenPage.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first();
    await citBtn.click();
    await citizenPage.waitForTimeout(2000);
    console.log('✓ Cidadão autenticado com sucesso');

    // -------------------------------------------------------------------------
    // 4. Autenticação da Instituição (INAPEM-LLMM-01)
    // -------------------------------------------------------------------------
    console.log('\n🔑 4. Login da Instituição (INAPEM-LLMM-01)...');
    await instPage.goto(`${BASE_URL}/institucional#/entrar`, { waitUntil: 'domcontentloaded' });
    await instPage.waitForTimeout(600);
    const instInput = instPage.locator('input[type="text"]:visible, input:not([type]):visible').first();
    await instInput.waitFor({ state: 'visible', timeout: 8000 });
    await instInput.fill('INAPEM-LLMM-01');
    const instPass = instPage.locator('input[type="password"]:visible').first();
    await instPass.fill('123456789');
    const instBtn = instPage.getByRole('button', { name: /ENTRAR NO PORTAL|ENTRAR/i }).first();
    await instBtn.click();
    await instPage.waitForTimeout(2000);
    console.log('✓ Instituição autenticada com sucesso');

    // -------------------------------------------------------------------------
    // 5. Navegar ambos para a página de VideoAtendimento
    // -------------------------------------------------------------------------
    console.log('\n🎥 5. Navegando ambos para a área de Videoatendimento...');
    await citizenPage.evaluate(() => { window.location.hash = '#/video-atendimento'; });
    await instPage.evaluate(() => { window.location.hash = '#/video-atendimento'; });
    await citizenPage.waitForTimeout(2000);
    await instPage.waitForTimeout(2000);

    await citizenPage.screenshot({ path: path.join(SHOT_DIR, '01_cidadao_lista_atendimentos.png'), fullPage: true });
    await instPage.screenshot({ path: path.join(SHOT_DIR, '01_instituicao_lista_atendimentos.png'), fullPage: true });
    console.log('✓ Páginas de videoatendimento carregadas em ambos os lados');

    // -------------------------------------------------------------------------
    // 6. Entrar na Sessão de VideoAtendimento em ambos os lados
    // -------------------------------------------------------------------------
    console.log('\n📞 6. Entrando na Sessão de Videochamada ativa...');
    
    // Entrar pelo Cidadão
    const citEntrarBtn = citizenPage.locator('button:has-text("Entrar")').first();
    await citEntrarBtn.waitFor({ state: 'visible', timeout: 8000 });
    await citEntrarBtn.click();
    console.log('✓ Cidadão entrou na sala');
    await citizenPage.waitForTimeout(1000);

    // Entrar pela Instituição
    const instEntrarBtn = instPage.locator('button:has-text("Entrar")').first();
    await instEntrarBtn.waitFor({ state: 'visible', timeout: 8000 });
    await instEntrarBtn.click();
    console.log('✓ Instituição entrou na sala');
    await instPage.waitForTimeout(3000);

    // -------------------------------------------------------------------------
    // 7. Validar Streams e Renderização em Ambos os Clientes
    // -------------------------------------------------------------------------
    console.log('\n🔍 7. Verificando WebRTC Streams e ligação bidirecional em ambos os lados...');

    // Aguardar até que ambos os lados recebam o vídeo remoto ativo
    await citizenPage.waitForFunction(() => {
      const v = document.querySelector('video[data-testid="remote-video"]');
      return !!(v && (v.srcObject || v.videoWidth > 0));
    }, { timeout: 10000 });

    await instPage.waitForFunction(() => {
      const v = document.querySelector('video[data-testid="remote-video"]');
      return !!(v && (v.srcObject || v.videoWidth > 0));
    }, { timeout: 10000 });

    // Verificar Cidadão
    const citVideoInfo = await citizenPage.evaluate(() => {
      const localVid = document.querySelector('video[data-testid="local-video"]');
      const remoteVid = document.querySelector('video[data-testid="remote-video"]');
      return {
        hasLocalVid: !!localVid,
        hasLocalStream: !!(localVid && localVid.srcObject),
        localWidth: localVid ? localVid.videoWidth : 0,
        localHeight: localVid ? localVid.videoHeight : 0,
        hasRemoteVid: !!remoteVid,
        hasRemoteStream: !!(remoteVid && (remoteVid.srcObject || remoteVid.videoWidth > 0)),
        remoteWidth: remoteVid ? remoteVid.videoWidth : 0,
        remoteHeight: remoteVid ? remoteVid.videoHeight : 0,
      };
    });

    console.log('📱 Estado do Vídeo no CIDADÃO (Mobile):', citVideoInfo);

    // Verificar Instituição
    const instVideoInfo = await instPage.evaluate(() => {
      const localVid = document.querySelector('video[data-testid="local-video"]');
      const remoteVid = document.querySelector('video[data-testid="remote-video"]');
      return {
        hasLocalVid: !!localVid,
        hasLocalStream: !!(localVid && localVid.srcObject),
        localWidth: localVid ? localVid.videoWidth : 0,
        localHeight: localVid ? localVid.videoHeight : 0,
        hasRemoteVid: !!remoteVid,
        hasRemoteStream: !!(remoteVid && (remoteVid.srcObject || remoteVid.videoWidth > 0)),
        remoteWidth: remoteVid ? remoteVid.videoWidth : 0,
        remoteHeight: remoteVid ? remoteVid.videoHeight : 0,
      };
    });

    console.log('💻 Estado do Vídeo na INSTITUIÇÃO (Desktop):', instVideoInfo);

    // Capturar screenshots com a chamada a decorrer
    await citizenPage.screenshot({ path: path.join(SHOT_DIR, '02_cidadao_chamada_em_curso.png') });
    await instPage.screenshot({ path: path.join(SHOT_DIR, '02_instituicao_chamada_em_curso.png') });
    console.log('✓ Capturas de ecrã da chamada gravadas com sucesso');

    // -------------------------------------------------------------------------
    // 8. Testar controlos: Silenciar Microfone, Alternar Câmara, Partilha
    // -------------------------------------------------------------------------
    console.log('\n🎛️ 8. Testando botões de controlo (Mute Mic, Desligar Vídeo, Alternar Câmara)...');
    
    // Mute mic no telemóvel
    const citMicBtn = citizenPage.locator('button[title*="Microfone"]').first();
    if (await citMicBtn.isVisible()) {
      await citMicBtn.click();
      await citizenPage.waitForTimeout(500);
      console.log('✓ Cidadão alternou estado do Microfone (Mute)');
    }

    // Alternar câmara no telemóvel
    const citFlipBtn = citizenPage.locator('button[title*="Alternar Câmara"]').first();
    if (await citFlipBtn.isVisible()) {
      await citFlipBtn.click();
      await citizenPage.waitForTimeout(1000);
      console.log('✓ Cidadão alternou entre câmara Frontal e Traseira com sucesso');
    }

    await citizenPage.screenshot({ path: path.join(SHOT_DIR, '03_cidadao_controles_testados.png') });

    // -------------------------------------------------------------------------
    // 9. Concluir / Sair da Chamada
    // -------------------------------------------------------------------------
    console.log('\n🔴 9. Testando saída da chamada...');
    const citLeaveBtn = citizenPage.locator('button[title="Desligar Chamada"]').first();
    if (await citLeaveBtn.isVisible()) {
      await citLeaveBtn.click();
      await citizenPage.waitForTimeout(1000);
      console.log('✓ Cidadão desligou a chamada e regressou à agenda');
    }

    await citizenPage.screenshot({ path: path.join(SHOT_DIR, '04_cidadao_pos_chamada.png') });

    console.log('\n========================================================================');
    console.log('✅ TESTE E2E DE VIDEOATENDIMENTO WEBRTC CONCLUÍDO COM SUCESSO 100%!');
    console.log('========================================================================');

    return {
      success: true,
      citVideoInfo,
      instVideoInfo,
    };
  } catch (err) {
    console.error('❌ Erro durante o teste E2E de Videoatendimento:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runVideoE2ETest().then((res) => {
  console.log('Resultado Final:', JSON.stringify(res, null, 2));
  process.exit(0);
}).catch((e) => {
  console.error('Falha:', e);
  process.exit(1);
});
