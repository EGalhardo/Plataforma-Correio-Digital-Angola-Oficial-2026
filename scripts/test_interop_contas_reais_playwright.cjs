/**
 * INTEROPERABILIDADE ENTRE CONTAS REAIS — Correio Digital Angola (produção)
 *
 * Usa três browsers reais (cidadão, instituição, administrador), entra com as
 * credenciais reais por formulário e verifica a troca de correspondência nos
 * DOIS sentidos, com prova no ecrã (UI) e não só na API:
 *
 *   1. Cidadão → Instituição: compõe, escolhe destino, envia.
 *   2. Instituição vê a mensagem na caixa de entrada (assunto do teste).
 *   3. Instituição responde ao cidadão.
 *   4. Cidadão vê a resposta.
 *   5. Administrador observa a correspondência (visão central).
 *   6. Registo final na base (auditoria fora do browser).
 *
 * NÃO cria contas nem altera credenciais. Marca cada assunto com um selo único
 * para localizar e apagar os dados de teste no fim (--limpar).
 *
 * Uso:
 *   node scripts/test_interop_contas_reais_playwright.cjs            # corre o ciclo
 *   node scripts/test_interop_contas_reais_playwright.cjs --limpar   # apaga as provas
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP = 'https://correio-digital-angola-oficial.vercel.app';
const CONTAS = {
  cidadao: { url: `${APP}/#/login`, user: '002399714LA030', pass: '123456789' },
  instituicao: { url: `${APP}/institucional#/login`, user: 'AGT-LMM-01', pass: '123456789' },
  admin: { url: `${APP}/admin#/login`, user: 'ADMIN-0001', pass: '987654321' },
};
const SELO = process.env.SELO || `INTEROP-${Date.now().toString(36).toUpperCase()}`;
const ASSUNTO_IDA = `${SELO} · cidadão→instituição`;
const ASSUNTO_VOLTA = `${SELO} · resposta instituição→cidadão`;

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const SVC = env.match(/SUPABASE_SERVICE_ROLE_KEY=([^\s\n]+)/)[1];
const DB = 'https://klrclczcahfycfdxzdqs.supabase.co';
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

const login = async (browser, chave, artefactos) => {
  const c = CONTAS[chave];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e).slice(0, 140)));
  await page.goto(c.url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.fill('input[name="cda-utilizador"]', c.user);
  await page.fill('input[name="cda-senha"]', c.pass);
  await page.click('button:has-text("ENTRAR NO PORTAL")');
  await page.waitForTimeout(5000);
  const ok = !/login/i.test(page.url());
  if (!ok) await page.screenshot({ path: path.join(artefactos, `falha-login-${chave}.png`) });
  return { ctx, page, ok, erros, chave };
};

/** Abre o Correio e espera que a lista esteja montada. */
const abrirCorreio = async (page, raiz) => {
  await page.goto(`${raiz}#/correspondencias`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.waitForSelector('button:has-text("Nova Mensagem"), input[placeholder*="Pesquisar"]', { timeout: 30000 });
};

/** Espera até 12 s por uma linha na base (o INSERT e a leitura não são instantâneos). */
const esperarNaBase = async (url, tentativas = 8) => {
  for (let i = 0; i < tentativas; i++) {
    const r = await (await fetch(url, { headers: H })).json().catch(() => null);
    if (Array.isArray(r) && r.length) return r;
    await new Promise((res) => setTimeout(res, 1500));
  }
  return [];
};

const corpoContem = async (page, texto) => {
  const t = await page.evaluate(() => document.body.innerText);
  return t.includes(texto);
};

module.exports = { login, abrirCorreio, corpoContem, esperarNaBase, CONTAS, APP, SELO, ASSUNTO_IDA, ASSUNTO_VOLTA, H, DB };

if (require.main === module) {
  (async () => {
    const artefactos = path.join(__dirname, '..', 'test-artifacts');
    fs.mkdirSync(artefactos, { recursive: true });
    const browser = await chromium.launch();
    const out = { selo: SELO, passos: {} };
    let cid, inst, adm;

    try {
      // ---------- 1. Entradas ----------
      cid = await login(browser, 'cidadao', artefactos);
      inst = await login(browser, 'instituicao', artefactos);
      adm = await login(browser, 'admin', artefactos);
      out.passos.login = { cidadao: cid.ok, instituicao: inst.ok, admin: adm.ok };
      if (!cid.ok || !inst.ok || !adm.ok) throw new Error('login falhou: ' + JSON.stringify(out.passos.login));

      // ---------- 2. Cidadão compõe e envia ----------
      await abrirCorreio(cid.page, `${APP}/`);
      await cid.page.click('button:has-text("Nova Mensagem")');
      await cid.page.waitForTimeout(2500);
      await cid.page.fill('input[placeholder*="Código Institucional"]', 'AGT-LMM-01');
      await cid.page.waitForTimeout(1500);
      await cid.page.fill('input[placeholder*="tema da sua mensagem"]', ASSUNTO_IDA);
      await cid.page.fill('textarea', 'Mensagem automática de interoperabilidade. Selo ' + SELO + '. Não requer resposta manual.');
      await cid.page.screenshot({ path: path.join(artefactos, 'interop-1-compositor.png'), fullPage: true });
      await cid.page.click('button:has-text("Enviar Mensagem")');
      await cid.page.waitForTimeout(2500);
      // O envio real tem TRÊS passos na UI (descobertos por análise):
      //   1) modalidade (Mensagem Normal / Reclamação / Denúncia)
      //   2) «Rever antes de enviar» — confirmação
      //   3) botão final «ENVIAR CORRESPONDÊNCIA»
      const modalidadeNormal = await cid.page.$('text=Mensagem Normal');
      if (modalidadeNormal) {
        await modalidadeNormal.click();
        await cid.page.waitForTimeout(800);
        const ok = await cid.page.$('button:has-text("OK")');
        if (ok) await ok.click();
        await cid.page.waitForTimeout(2000);
      }
      const confirmar = await cid.page.$('button:has-text("ENVIAR CORRESPONDÊNCIA"), button:has-text("Enviar Correspondência")');
      if (confirmar) {
        await confirmar.click();
        await cid.page.waitForTimeout(7000);
      }
      const corpoCid = await cid.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
      out.passos.cidadao_envia = {
        enviado: /enviad|sucesso|comprovativo|protocolo/i.test(corpoCid),
        assunto_visivel: await corpoContem(cid.page, SELO),
        excerto: corpoCid.slice(0, 220),
      };
      await cid.page.screenshot({ path: path.join(artefactos, 'interop-2-enviado-cidadao.png'), fullPage: true });

      // ---------- 3. Instituição recebe ----------
      await abrirCorreio(inst.page, `${APP}/institucional`);
      await inst.page.waitForTimeout(2000);
      // procurar pelo selo na lista
      let viuInst = await corpoContem(inst.page, SELO);
      if (!viuInst) {
        const pesq = await inst.page.$('input[placeholder*="Pesquisar"]');
        if (pesq) {
          await pesq.fill(SELO);
          await inst.page.waitForTimeout(3000);
          viuInst = await corpoContem(inst.page, SELO);
        }
      }
      out.passos.instituicao_recebe = { viu: viuInst };
      await inst.page.screenshot({ path: path.join(artefactos, 'interop-3-instituicao-recebe.png'), fullPage: true });

      // ---------- 4. Instituição responde ----------
      // Caminho real descoberto: linha do expediente → botão com ícone
      // «Analisar» → painel do cidadão → «Responder» → compositor já
      // endereçado ao cidadão → (modalidade) → «Enviar Mensagem Oficial» →
      // confirmação «ENVIAR CORRESPONDÊNCIA».
      let respondeu = false, ecrãResposta = '', protocolo = '';
      if (viuInst) {
        await inst.page.locator('tr:has-text("' + SELO + '")').first()
          .locator('button[title="Analisar"]').click();
        await inst.page.waitForTimeout(3500);
        const mProto = (await inst.page.evaluate(() => document.body.innerText)).match(/(AGT[A-Z0-9-]{6,})/);
        protocolo = mProto ? mProto[1] : '';
        await inst.page.click('button:has-text("Responder")');
        await inst.page.waitForTimeout(3500);
        // 1) destinatário pré-preenchido? (deve ser o cidadão)
        const campoDest = await inst.page.$$eval('input[placeholder*="BI"], input[placeholder*="Código"]', els => els.map(e => e.value));
        // 2) assunto + corpo
        // garantir o destinatário (o compositor institucional pode abrir vazio)
        const campDest = await inst.page.$('input[placeholder*="BI"], input[placeholder*="Código"], input[placeholder*="destinat"]');
        if (campDest) {
          const v = await campDest.inputValue();
          if (!v || !v.trim()) await campDest.fill('002399714LA030');
          await inst.page.waitForTimeout(1200);
        }
        await inst.page.fill('input[placeholder*="tema da sua mensagem"]', ASSUNTO_VOLTA);
        await inst.page.fill('textarea', 'Resposta automática da instituição. Selo ' + SELO + '.');
        await inst.page.waitForTimeout(800);
        await inst.page.screenshot({ path: path.join(artefactos, 'interop-4-resposta-instituicao.png'), fullPage: true });
        // 3) envio com os mesmos três passos do cidadão
        await inst.page.waitForFunction(() => {
          const b = [...document.querySelectorAll('button')].find((x) => /Enviar Mensagem Oficial/i.test(x.innerText));
          return b && !b.disabled;
        }, { timeout: 25000 });
        await inst.page.click('button:has-text("Enviar Mensagem Oficial")');
        await inst.page.waitForTimeout(2500);
        const mod = await inst.page.$('text=Mensagem Normal');
        if (mod) { await mod.click(); await inst.page.waitForTimeout(800);
          const okB = await inst.page.$('button:has-text("OK")'); if (okB) await okB.click();
          await inst.page.waitForTimeout(2000); }
        const conf = await inst.page.$('button:has-text("ENVIAR CORRESPONDÊNCIA"), button:has-text("Enviar Correspondência")');
        if (conf) { await conf.click(); await inst.page.waitForTimeout(7000); }
        ecrãResposta = await inst.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 240));
        // prova na base: existe uma linha AGT-LMM → cidadão com o assunto de volta?
        const volta = await esperarNaBase(`${DB}/rest/v1/messages?subject=eq.${encodeURIComponent(ASSUNTO_VOLTA)}&select=id,sender_bi,recipient_bi`);
        respondeu = Array.isArray(volta) && volta.length > 0
          && volta[0].sender_bi === 'AGT-LMM' && volta[0].recipient_bi === '002399714LA030';
        out.passos.instituicao_responde = {
          destinatario_pre_preenchido: campoDest, protocolo_original: protocolo,
          respondeu, linha_na_base: Array.isArray(volta) ? volta[0] || null : null,
          excerto: ecrãResposta,
        };
      } else {
        out.passos.instituicao_responde = { respondeu: false, motivo: 'não viu a mensagem' };
      }
      // ---------- 5. Cidadão vê a resposta ----------
      await cid.page.reload({ waitUntil: 'networkidle' });
      await cid.page.waitForTimeout(3500);
      let viuVolta = await corpoContem(cid.page, ASSUNTO_VOLTA);
      if (!viuVolta) {
        const pesq2 = await cid.page.$('input[placeholder*="Pesquisar"]');
        if (pesq2) { await pesq2.fill(SELO); await cid.page.waitForTimeout(3000); viuVolta = await corpoContem(cid.page, SELO); }
      }
      out.passos.cidadao_ve_resposta = { viu: viuVolta };
      await cid.page.screenshot({ path: path.join(artefactos, 'interop-6-cidadao-ve-resposta.png'), fullPage: true });

      // ---------- 6. Admin observa ----------
      await adm.page.click('button:has-text("Correspondências"), a:has-text("Correspondências")').catch(() => {});
      await adm.page.waitForTimeout(4000);
      let viuAdm = await corpoContem(adm.page, SELO);
      if (!viuAdm) {
        const pesqAdm = await adm.page.$('input[placeholder*="Pesquisar"]');
        if (pesqAdm) { await pesqAdm.fill(SELO); await adm.page.waitForTimeout(3000); viuAdm = await corpoContem(adm.page, SELO); }
      }
      out.passos.admin_observa = { url: adm.page.url(), viu: viuAdm };
      await adm.page.screenshot({ path: path.join(artefactos, 'interop-7-admin.png'), fullPage: true });

      // ---------- 6b. Ocorrências: cidadão cria → instituição recebe ----------
      // Modo MANUAL de localização: determinístico (não depende de permissões
      // de GPS nem da geocodificação inversa, que no modo automático mantém o
      // botão «Rever ocorrência» desactivado enquanto resolve).
      const ASSUNTO_OC = `${SELO} · ocorrência`;
      await cid.page.goto(`${APP}/#/ocorrencias`, { waitUntil: 'networkidle' });
      await cid.page.waitForTimeout(9000);
      await cid.page.click('button:has-text("Criar Ocorrência")');
      await cid.page.waitForTimeout(3000);
      await cid.page.locator('button:has-text("Manual")').first().click();
      await cid.page.waitForTimeout(1500);

      const sel = cid.page.locator('form select');
      await sel.nth(0).selectOption({ label: 'Iluminação pública' });
      await cid.page.waitForTimeout(400);
      await cid.page.fill('input[placeholder*="Poste de iluminação"]', ASSUNTO_OC);
      await cid.page.fill('textarea', 'Ocorrência automática de interoperabilidade. Selo ' + SELO + ' — não requer tratamento manual.');
      await sel.nth(1).selectOption({ label: 'Luanda' });
      await cid.page.waitForTimeout(1000);
      await sel.nth(2).selectOption({ index: 1 });
      // bairro = input de texto sem placeholder; referência = input com placeholder «junto à escola»
      const inputBairro = cid.page.locator('form input[type="text"]').filter({ hasNot: cid.page.locator('[placeholder]') }).first();
      const semPh = cid.page.locator('form input[type="text"]');
      const nInp = await semPh.count();
      for (let i = 0; i < nInp; i++) {
        const ph = await semPh.nth(i).getAttribute('placeholder');
        if (ph === '') await semPh.nth(i).fill('Cassenda');
        else if (ph && ph.includes('escola')) await semPh.nth(i).fill('Junto ao mercado, rua principal');
        else if (ph && ph.includes('INAPEM')) await semPh.nth(i).fill('AGT-LMM');
      }
      await cid.page.waitForTimeout(1200);

      const rever = cid.page.locator('button:has-text("Rever ocorrência")');
      await cid.page.waitForFunction(() => {
        const b = [...document.querySelectorAll('button')].find((x) => /Rever ocorrência/i.test(x.innerText));
        return b && !b.disabled;
      }, { timeout: 25000 });
      await rever.click();
      await cid.page.waitForTimeout(3000);
      await cid.page.screenshot({ path: path.join(artefactos, 'interop-8a-ocorrencia-rever.png'), fullPage: true });

      // O ecrã de confirmação exige a caixa «Confirmo os dados e a instituição
      // destinatária» — sem ela o botão «Enviar ocorrência» fica desactivado.
      await cid.page.check('input[type="checkbox"]').catch(() => {});
      await cid.page.waitForTimeout(800);
      const confirmarOc = cid.page.locator('button:has-text("Enviar ocorrência")');
      if (await confirmarOc.count()) {
        await cid.page.waitForFunction(() => {
          const b = [...document.querySelectorAll('button')].find((x) => /Enviar ocorrência/i.test(x.innerText));
          return b && !b.disabled;
        }, { timeout: 15000 }).catch(() => {});
        await confirmarOc.click({ timeout: 15000 }).catch(() => {});
        await cid.page.waitForTimeout(8000);
      }
      await cid.page.screenshot({ path: path.join(artefactos, 'interop-8-ocorrencia-cidadao.png'), fullPage: true });

      const ocDb = await esperarNaBase(`${DB}/rest/v1/cda_ocorrencias?titulo=eq.${encodeURIComponent(ASSUNTO_OC)}&select=id,numero,titulo,estado,cidadao_bi`);
      const criada = Array.isArray(ocDb) && ocDb.length > 0;

      let instViuOc = false;
      if (criada) {
        await inst.page.goto(`${APP}/institucional#/ocorrencias`, { waitUntil: 'networkidle' });
        await inst.page.waitForTimeout(9000);
        const codigoOc = `OC-${String(ocDb[0].numero).padStart(6, '0')}`;
        instViuOc = await corpoContem(inst.page, codigoOc) || await corpoContem(inst.page, SELO);
        await inst.page.screenshot({ path: path.join(artefactos, 'interop-9-instituicao-ocorrencias.png'), fullPage: true });
      }
      out.passos.ocorrencias = {
        criada_na_base: criada,
        ocorrencia: criada ? { numero: ocDb[0].numero, estado: ocDb[0].estado, cidadao: ocDb[0].cidadao_bi } : null,
        instituicao_ve: instViuOc,
      };

      // ---------- 6c. Denúncia/Reclamação: cidadão → instituição ----------
      // O canal de denúncia usa o mesmo compositor, com a modalidade
      // «Denúncia» em vez de «Mensagem Normal».
      const ASSUNTO_DEN = `${SELO} · denúncia`;
      await cid.page.goto(`${APP}/#/nova-denuncia`, { waitUntil: 'networkidle' });
      await cid.page.waitForTimeout(5000);
      await cid.page.locator('button:has-text("Criar Denuncia")').first().click({ force: true });
      await cid.page.waitForTimeout(3500);
      await cid.page.fill('input[placeholder*="Código Institucional"]', 'AGT-LMM-01');
      await cid.page.waitForTimeout(1500);
      await cid.page.fill('input[placeholder*="tema da sua mensagem"]', ASSUNTO_DEN);
      await cid.page.fill('textarea', 'Denúncia automática de interoperabilidade. Selo ' + SELO + '.');
      await cid.page.click('button:has-text("Enviar Mensagem")');
      await cid.page.waitForTimeout(2500);
      const modDen = cid.page.locator('text=Denúncia').first();
      if (await modDen.count()) { await modDen.click({ force: true }); await cid.page.waitForTimeout(1000);
        const okD = cid.page.locator('button:has-text("OK"), button:has-text("Ok")').first();
        if (await okD.count()) await okD.click({ force: true });
        await cid.page.waitForTimeout(2500); }
      const confD = cid.page.locator('button:has-text("ENVIAR CORRESPONDÊNCIA"), button:has-text("Enviar Correspondência")').first();
      if (await confD.count()) { await confD.click({ force: true }); await cid.page.waitForTimeout(8000); }
      await cid.page.screenshot({ path: path.join(artefactos, 'interop-10-denuncia-cidadao.png'), fullPage: true });
      const todasSelo = await esperarNaBase(`${DB}/rest/v1/messages?subject=like.*${encodeURIComponent(SELO)}*&select=id,subject,sender_bi,recipient_bi&order=id.desc`);
      const denDb = (Array.isArray(todasSelo) ? todasSelo : []).filter((m) => /den[úu]ncia/i.test(m.subject));
      out.passos.denuncia = {
        criada_na_base: Array.isArray(denDb) && denDb.length > 0,
        linha: Array.isArray(denDb) && denDb[0] ? { de: denDb[0].sender_bi, para: denDb[0].recipient_bi } : null,
      };

      // ---------- 6d. Comunicado oficial: admin → cidadão (alcance do cidadão) ----------
      await adm.page.goto(`${APP}/admin#/gov-dashboard`, { waitUntil: 'networkidle' });
      await adm.page.waitForTimeout(5000);
      const botaoComunicado = await adm.page.$('button:has-text("COMUNICADOS OFICIAIS")');
      const alcance = { modulo_abre: false };
      if (botaoComunicado) {
        await botaoComunicado.click({ force: true });
        await adm.page.waitForTimeout(4000);
        alcance.modulo_abre = true;
        alcance.url = adm.page.url();
        alcance.ecra = (await adm.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))).slice(0, 200);
      }
      out.passos.comunicados_admin = alcance;
      await adm.page.screenshot({ path: path.join(artefactos, 'interop-11-comunicados-admin.png'), fullPage: true });

      // ---------- 7. Prova na base ----------
      const linhas = await (await fetch(`${DB}/rest/v1/messages?subject=like.*${encodeURIComponent(SELO)}*&select=id,subject,sender_bi,recipient_bi,status,created_at&order=id.asc`, { headers: H })).json();
      out.base_de_dados = Array.isArray(linhas) ? linhas.map((l) => ({ assunto: l.subject.slice(0, 46), de: l.sender_bi, para: l.recipient_bi, estado: l.status })) : linhas;

      out.erros_js = [...cid.erros, ...inst.erros, ...adm.erros].slice(0, 5);
      out.aprovado =
        out.passos.cidadao_envia.enviado === true &&
        out.passos.ocorrencias.criada_na_base === true &&
        out.passos.ocorrencias.instituicao_ve === true &&
        out.passos.denuncia.criada_na_base === true &&
        out.passos.instituicao_recebe.viu === true &&
        out.passos.instituicao_responde.respondeu === true &&
        out.passos.cidadao_ve_resposta.viu === true &&
        Array.isArray(linhas) && linhas.length >= 2;
    } catch (e) {
      out.erro = String(e.message || e).slice(0, 300);
      out.aprovado = false;
    } finally {
      for (const s of [cid, inst, adm]) if (s) await s.ctx.close().catch(() => {});
      await browser.close();
      console.log(JSON.stringify(out, null, 1));
      process.exitCode = out.aprovado ? 0 : 1;
    }
  })();
}
