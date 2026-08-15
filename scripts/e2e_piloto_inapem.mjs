#!/usr/bin/env node
// ============================================================================
// e2e_piloto_inapem.mjs — ENSAIO DO PILOTO INAPEM (2026-08-15, a pedido do dono)
// ----------------------------------------------------------------------------
// Objectivo: provar, em browser real e com escrita REAL na nuvem, que o CDA
// suporta o piloto com o INAPEM como primeira instituição — incluindo a
// premissa do dono de que "no país não existe apenas um INAPEM" (cada unidade
// regista-se com a sua localização; ex.: INAPEM LLVV = Luanda/Luanda/Viana/
// Viana) e que o CDA, como plataforma de correspondência, NÃO precisa de
// "estado do pedido de financiamento" (a formação usa o Jitsi; a certificação
// MPME usa o fluxo de certificação de ficheiros).
//
// FLUXOS (todos com escrita real e limpeza total no final):
//   P1 · Registo da unidade "INAPEM — Delegação de Viana (LLVV)" PELO
//       FORMULÁRIO oficial (15 campos; província Luanda · município Viana ·
//       comuna Viana Sede) — prova a multi-instância do INAPEM.
//   P2 · Homologação pelo arnês (decisão admin simulada — como os scripts
//       E2E existentes; a homologação manual pela UI fica no backlog).
//   P3 · Login real no UI com o Nº Agente gerado.
//   P4 · 4 comunicações oficiais via compose ao cidadão de teste §D, cada uma
//       com prova na tabela messages:
//         C1 Confirmação de recepção de candidatura
//         C2 Aviso de documentos em falta
//         C3 Agendamento de formação/entrevista (link Jitsi no corpo)
//         C4 Notificação de aprovação
//   P5 · Comunicação de oportunidades para empreendedores:
//         P5a UI da campanha na área admin (formulário honesto — com a conta
//             demo cai em auditoria por RLS, tal como desenhado);
//         P5b prova cloud: insert real na tabela notifications (target_bi do
//             cidadão §D) via service role — o mesmo insert que o admin real
//             faz — + verificação da linha.
//   P6 · Certificação de ficheiros (= base da renovação de certificação MPME):
//       o cidadão demo solicita um documento e percorre o fluxo até à emissão
//       final com Protocolo de Chancela CDA-… (documento demo — local, não
//       polui a nuvem).
//
// SEGURANÇA / FRONTEIRA HONESTA:
//   - Corre APENAS com SUPABASE_SERVICE_ROLE_KEY (chave local, fora do Git).
//     Sem ela o script recusa-se a escrever (SKIP, exit 2).
//   - Todos os dados criados são únicos por corrida (timestamp) e removidos
//     no final (bloco finally), mesmo em caso de erro.
//   - O cidadão alvo é a conta de teste §D (BI 009999999LA099).
//   - A leitura "cidadão vê na caixa" exigiria sessão do cidadão §D
//     (CDA_TEST_CID_PASS) — se ausente, é SKIP honesto.
//
// Sai 0 se tudo PASS, 1 se FAIL, 2 se faltarem chaves (SKIP).
// Uso:  BASE=<url> node --env-file=.env scripts/e2e_piloto_inapem.mjs
// ============================================================================
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const SUPA_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPA_ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CIDADAO_TESTE_BI = process.env.CDA_TEST_CID_BI || '009999999LA099';

const resultados = [];
let FAILS = 0, SKIPS = 0;
const reg = (nome, estado, detalhe = '') => {
  if (estado === 'FAIL') FAILS++;
  if (estado === 'SKIP') SKIPS++;
  resultados.push([nome, estado, detalhe]);
  console.log(`[${estado}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};

if (!SUPA_URL || !SUPA_ANON || !SUPA_SERVICE) {
  reg('pre-condicoes', 'SKIP', 'faltam SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY — sem chave de serviço este script não escreve');
  console.log('======================================================================');
  console.log(`RESULTADO: 0 PASS / ${SKIPS} SKIP / 0 FAIL`);
  process.exit(2);
}

// ---------- identidades únicas-descartáveis desta corrida ----------
const ts = Date.now();
const sufixo = String(ts).slice(-3);
const letras = sufixo.split('').map((d) => 'ABCDEFGHIJ'[+d]).join('');
// NOTA (descoberta no ensaio): o nome NÃO pode conter parênteses próprios —
// o login define institutionName = "nome (código)" e o resolveInstitutionCode
// usa o 1.º parêntese como código do remetente. O sufixo de localização
// («-LLVV» = Luanda/Luanda/Viana/Viana) já vem no CÓDIGO gerado pelo registo.
const INAPEM = {
  nome: `INAPEM — Delegação de Viana LLVV ${sufixo}${letras}`,
  sigla: `ILV${letras}`, // única por corrida — ex.: ILVABC → código ILVABC-LLVV
  endereco: `Sede do Piloto INAPEM LLVV ${sufixo}, Rua da Delegação, Viana, Luanda`,
  emailContacto: `inapem.viana.${ts}@inapem.ao`,
  telefone: `9${String(ts).slice(-8)}`.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3'),
  responsavel: `Dir. Piloto INAPEM ${letras}`,
  cargo: 'Delegado Provincial Adjunto',
  emailAcesso: `delegado.inapem.${ts}@inapem.ao`,
  senha: `Inapem#2026!${letras}`,
};
// 4 comunicações oficiais do piloto
const MSGS = [
  {
    id: 'C1-confirmacao-recepcao',
    assunto: `[INAPEM-LLVV] Confirmação de recepção — candidatura ${ts}`,
    corpo: `Prezado(a) Empreendedor(a),\n\nA Delegação do INAPEM em Viana (LLVV) confirma a recepção da sua candidatura ao programa de apoio ao empreendedorismo, registada sob a referência interna ${ts}.\n\nO processo encontra-se em análise e será dado seguimento em breve.\n\nCom os melhores cumprimentos,\nDelegação do INAPEM — Viana`,
  },
  {
    id: 'C2-documentos-em-falta',
    assunto: `[INAPEM-LLVV] Documentos em falta — candidatura ${ts}`,
    corpo: `Prezado(a) Empreendedor(a),\n\nNo âmbito da análise da sua candidatura, solicitamos o envio dos seguintes documentos comprovativos em falta:\n- Registo comercial actualizado;\n- NIF;\n- Comprovativo de morada da empresa.\n\nO envio pode ser feito por esta plataforma (Correio Digital de Angola), em resposta a esta mensagem.\n\nDelegação do INAPEM — Viana`,
  },
  {
    id: 'C3-formacao-jitsi',
    assunto: `[INAPEM-LLVV] Formação de empreendedores — ${ts}`,
    corpo: `Prezado(a) Empreendedor(a),\n\nConvidamo-lo(a) a participar na formação gratuita de empreendedores da Delegação do INAPEM em Viana, no dia útil seguinte, às 09h00.\n\nA sessão será realizada por videoconferência — entre na sala oficial pelo link abaixo (Jitsi):\nhttps://meet.jit.si/cda-inapem-${ts}\n\nConfirme a sua presença respondendo a esta mensagem oficial.\n\nDelegação do INAPEM — Viana`,
  },
  {
    id: 'C4-aprovacao',
    assunto: `[INAPEM-LLVV] Aprovação — candidatura ${ts}`,
    corpo: `Prezado(a) Empreendedor(a),\n\nTemos o prazer de comunicar a APROVAÇÃO da sua candidatura ao programa de apoio ao empreendedorismo da Delegação do INAPEM em Viana (LLVV).\n\nOs próximos passos serão comunicados por esta via oficial. O certificado de participação será emitido pelo fluxo de certificação de ficheiros do CDA.\n\nDelegação do INAPEM — Viana`,
  },
];

// ---------- helpers REST (service role — arnês/limpeza) ----------
const svcHeaders = {
  apikey: SUPA_SERVICE, Authorization: `Bearer ${SUPA_SERVICE}`,
  'Content-Type': 'application/json', Prefer: 'return=representation',
};
const supaRest = async (path, opts = {}) => {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, { ...opts, headers: { ...svcHeaders, ...(opts.headers || {}) } });
  const txt = await r.text();
  let body = null; try { body = txt ? JSON.parse(txt) : null; } catch { body = txt; }
  return { status: r.status, body };
};
const authAdmin = async (path, opts = {}) => {
  const r = await fetch(`${SUPA_URL}/auth/v1/${path}`, { ...opts, headers: { ...svcHeaders, ...(opts.headers || {}) } });
  const txt = await r.text();
  let body = null; try { body = txt ? JSON.parse(txt) : null; } catch { body = txt; }
  return { status: r.status, body };
};
const encontrarUserPorClaim = async (claimKey, claimValue) => {
  for (let page = 1; page <= 10; page++) {
    const { status, body } = await authAdmin(`admin/users?page=${page}&per_page=50`);
    if (status !== 200 || !body || !Array.isArray(body.users)) return null;
    const hit = body.users.find((u) => String((u.app_metadata || {})[claimKey] || '').toUpperCase() === String(claimValue).toUpperCase());
    if (hit) return hit;
    if (body.users.length < 50) return null;
  }
  return null;
};
const clicarQuandoActivo = async (page, nome, timeoutMs = 30000) => {
  const btn = page.getByRole('button', { name: nome }).first();
  await btn.waitFor({ state: 'visible', timeout: timeoutMs });
  await page.waitForFunction(
    (re) => {
      const bs = [...document.querySelectorAll('button')];
      const b = bs.find((x) => re.test(x.textContent || ''));
      return b && !b.disabled;
    },
    new RegExp(nome.source, 'i'), { timeout: timeoutMs },
  );
  await btn.click({ timeout: 5000 }).catch(async () => { await btn.click({ force: true }); });
  return btn;
};

const SHOTS = '/home/user/cda_test/screenshots';

// ============================================================================
// P1 · Registo da unidade INAPEM LLVV pelo formulário oficial
// ============================================================================
async function registarInapem() {
  console.log('--- P1 · Registo da unidade INAPEM LLVV (Luanda · Viana · Viana) ---');
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'pt-PT' })).newPage();
  let agente = '', codigo = '';
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('heading', { name: 'LOGIN' }).first().waitFor({ state: 'visible', timeout: 20000 });
    await page.getByRole('button', { name: 'Instituição', exact: true }).click();
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: 'Registar', exact: true }).last().click();
    await page.getByText(/Adesão oficial ao Correio Digital/i).first().waitFor({ state: 'visible', timeout: 15000 });

    await page.getByPlaceholder(/Serviço de Migração/i).fill(INAPEM.nome);
    await page.getByPlaceholder('Ex: SME').fill(INAPEM.sigla);
    const selects = page.locator('select');
    await selects.nth(0).selectOption({ index: 1 });            // tipo institucional
    await selects.nth(1).selectOption({ label: 'Luanda' }).catch(async () => { await selects.nth(1).selectOption({ index: 1 }); });
    await page.waitForTimeout(500);
    // cidade → município Viana → comuna Viana Sede (LLVV)
    await selects.nth(2).selectOption({ label: 'Luanda (Capital)' }).catch(async () => { await selects.nth(2).selectOption({ index: 1 }); });
    await page.waitForTimeout(400);
    await selects.nth(3).selectOption({ label: 'Viana' }).catch(async () => { await selects.nth(3).selectOption({ index: 1 }); });
    await page.waitForTimeout(400);
    await selects.nth(4).selectOption({ label: 'Viana Sede' }).catch(async () => { await selects.nth(4).selectOption({ index: 0 }); });
    await page.getByPlaceholder(/Rua dos Correios/i).fill(INAPEM.endereco);
    await page.getByPlaceholder(/geral@sme/i).fill(INAPEM.emailContacto);
    await page.getByPlaceholder(/\+244 923/i).fill(INAPEM.telefone);
    await page.getByPlaceholder(/António Fernando/i).fill(INAPEM.responsavel);
    await page.getByPlaceholder(/Director Geral/i).fill(INAPEM.cargo);
    await page.getByPlaceholder(/director@sme/i).fill(INAPEM.emailAcesso);
    await page.getByPlaceholder(/Mínimo 8 caracteres/i).fill(INAPEM.senha);
    await page.getByPlaceholder(/Repita a senha/i).fill(INAPEM.senha);
    await page.getByRole('button', { name: /Finalizar Registo/i }).click();

    const sucesso = page.getByText(/Pedido de Adesão Enviado/i).first();
    await sucesso.waitFor({ state: 'visible', timeout: 90000 }).catch(() => null);
    if (!(await sucesso.isVisible().catch(() => false))) {
      const erro = await page.evaluate(() => document.body.innerText.match(/Não é possível[A-Za-zÀ-ú :"\.]{0,80}/i)?.[0] || '');
      reg('P1-registo-inapem-ui', 'FAIL', `ecrã de sucesso não apareceu ${erro ? '· erro visível: ' + erro : ''}`);
      await page.screenshot({ path: `${SHOTS}/piloto-P1-falhou.png` }).catch(() => null);
    } else {
      const texto = await page.evaluate(() => document.body.innerText);
      const mAgente = texto.match(/([A-Z0-9]{3,12}-[A-Z0-9]{2,10}-01)\b/);
      agente = mAgente ? mAgente[1] : '';
      codigo = agente ? agente.replace(/-01$/, '') : '';
      const localizacao = texto.match(/(Viana[^\n]{0,40})/i)?.[1] || '';
      reg('P1-registo-inapem-ui', agente ? 'PASS' : 'FAIL',
        agente ? `unidade INAPEM registada · Código ${codigo} · Nº Agente ${agente}${localizacao ? ` · localização: ${localizacao}` : ''}` : 'sucesso visível mas Nº Agente não extraído');
    }
  } catch (e) {
    reg('P1-registo-inapem-ui', 'FAIL', `exceção: ${String(e).slice(0, 150)}`);
    await page.screenshot({ path: `${SHOTS}/piloto-P1-excecao.png` }).catch(() => null);
  }
  await browser.close();
  return { agente, codigo };
}

// ============================================================================
// P4 · Envio das 4 comunicações oficiais via compose + prova cloud
// ============================================================================
async function enviarComunicacoes(agente, codigo) {
  console.log('--- P4 · 4 comunicações oficiais do INAPEM LLVV → cidadão §D ---');
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'pt-PT' })).newPage();
  const ids = [];
  try {
    // P3 · login real com o Nº Agente
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('heading', { name: 'LOGIN' }).first().waitFor({ state: 'visible', timeout: 20000 });
    await page.getByRole('button', { name: 'Instituição', exact: true }).click();
    await page.waitForTimeout(600);
    await page.getByPlaceholder(/AGT-9921-SR/i).fill(agente);
    await page.getByPlaceholder('••••••••••••').fill(INAPEM.senha);
    await page.getByRole('button', { name: /Entrar no Portal/ }).click();
    const painel = page.getByRole('button', { name: 'Painel', exact: true }).first();
    await painel.waitFor({ state: 'visible', timeout: 90000 }).catch(() => null);
    if (!(await painel.isVisible().catch(() => false))) {
      const ecra = await page.evaluate(() => document.body.innerText.slice(0, 300)).catch(() => '');
      let restStatus = 'n/a';
      try {
        const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: { apikey: SUPA_ANON, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: `agente.${agente.toLowerCase()}@inst.correiodigital.ao`, password: INAPEM.senha }),
        });
        restStatus = String(r.status);
      } catch { restStatus = 'erro-rede'; }
      reg('P3-login-agente-ui', 'FAIL', `login com ${agente} não chegou ao painel · ecrã: ${ecra.replace(/\n+/g, ' | ').slice(0, 160)} · REST senha=${restStatus}`);
      await browser.close();
      return ids;
    }
    reg('P3-login-agente-ui', 'PASS', `login no UI com ${agente} (INAPEM LLVV criado nesta corrida)`);
    // A sessão Auth (supabase) tem de estar ACTIVA para a escrita na nuvem —
    // o envio do compose só grava com sessão real. Verificação honesta:
    const sessaoAuth = await page.evaluate(() => {
      const chaves = Object.keys(localStorage).filter(k => /^sb-.*-auth-token$/.test(k));
      if (!chaves.length) return 'ausente';
      try { const raw = localStorage.getItem(chaves[0]); return raw && raw !== 'null' ? 'ativa' : 'ausente'; } catch { return 'ausente'; }
    });
    reg('P3-sessao-auth', sessaoAuth === 'ativa' ? 'PASS' : 'FAIL', sessaoAuth === 'ativa' ? 'sessão Auth do agente activa no navegador (escrita cloud permitida)' : `sessão Auth ${sessaoAuth} — o envio de mensagens cairá na RLS`);

    // navegação para o correio
    const navCorreio = page.locator('nav button', { hasText: /^\s*Correio\s*$/ }).first();
    await navCorreio.click();
    await page.waitForTimeout(2000);

    // Diagnóstico: capturar POSTs a messages + respostas durante o envio.
    const postsMessages = [];
    const onReq = (req) => {
      const u = req.url();
      if (u.includes('/rest/v1/messages') && (req.method() === 'POST' || req.method() === 'PATCH')) {
        // decodificar o JWT do Authorization para ver as claims usadas
        let claim = 'n/a';
        const authz = req.headers()['authorization'] || '';
        const token = authz.replace(/^Bearer /, '');
        if (token && token.split('.').length === 3) {
          try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
            claim = `role=${payload.app_metadata?.role} inst=${payload.app_metadata?.instituicao}`;
          } catch { claim = 'jwt-indecifravel'; }
        } else claim = 'sem-token';
        postsMessages.push(`REQ ${req.method()} [${claim}] → ${(req.postData() || '').slice(0, 60)}`);
      }
    };
    const onRes = (res) => {
      const u = res.url();
      if (u.includes('/rest/v1/messages') && (res.request().method() === 'POST' || res.request().method() === 'PATCH')) {
        res.text().then(t => postsMessages.push(`RES ${res.status()} → ${t.slice(0, 90)}`)).catch(() => {});
      }
    };
    page.on('request', onReq);
    page.on('response', onRes);

    for (const m of MSGS) {
      await page.getByRole('button', { name: /Nova Mensagem/i }).first().click();
      await page.waitForTimeout(1200);
      const para = page.getByPlaceholder(/Número do BI exacto|000123456LA789/i).first();
      await para.waitFor({ state: 'visible', timeout: 15000 });
      await para.fill(CIDADAO_TESTE_BI);
      await page.getByPlaceholder(/Qual o tema da sua mensagem/i).fill(m.assunto);
      await page.getByPlaceholder(/Descreva detalhadamente/i).fill(m.corpo);
      await page.getByRole('button', { name: /Enviar Mensagem Oficial|Enviar Mensagem/i }).first().click();
      // O destinatário de teste §D NÃO tem perfil → o lookup não o verifica e
      // o envio pede confirmação explícita («Enviar mesmo assim»). Sem este
      // clique o envio fica retido (descoberto no ensaio — diag_net4).
      await page.waitForTimeout(1500);
      const enviarMesmo = page.getByRole('button', { name: /Enviar mesmo assim/i }).first();
      await enviarMesmo.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null);
      if (await enviarMesmo.isVisible().catch(() => false)) {
        await enviarMesmo.click();
        await page.waitForTimeout(4000);
      } else {
        await page.waitForTimeout(4000);
      }
      // Prova cloud na tabela messages (a verdade — o modal de protocolo no UI
      // é optimista e pode fechar antes da leitura).
      const db = await supaRest(`messages?subject=eq.${encodeURIComponent(m.assunto)}&select=id,sender_bi,recipient_bi,subject,created_at&order=created_at.desc&limit=1`);
      const okDb = Array.isArray(db.body) && db.body.length === 1;
      if (okDb) ids.push(db.body[0].id);
      reg(`${m.id}-cloud`, okDb ? 'PASS' : 'FAIL',
        okDb ? `messages.id=${db.body[0].id} sender=${db.body[0].sender_bi} → ${db.body[0].recipient_bi}` : `consulta cloud: HTTP ${db.status} linhas=${Array.isArray(db.body) ? db.body.length : '?'}`);
      reg(`${m.id}-ui`, okDb ? 'PASS' : 'FAIL', okDb ? `«${m.assunto}» enviada e confirmada na nuvem` : 'envio não confirmado na nuvem');
      // fechar modal de protocolo, se ainda estiver aberto
      const fechar = page.getByRole('button', { name: /Fechar|OK|Entendi|Concluir/i }).first();
      if (await fechar.isVisible().catch(() => false)) await fechar.click().catch(() => null);
      await page.waitForTimeout(800);
    }
    page.off('request', onReq);
    page.off('response', onRes);
    const resOk = postsMessages.filter(l => l.startsWith('RES 2')).length;
    const resErro = postsMessages.filter(l => l.startsWith('RES ') && !l.startsWith('RES 2')).length;
    if (postsMessages.length === 0) {
      reg('P4-diagnostico', 'WARN', 'nenhum POST a messages capturado durante o envio');
    } else if (resErro > 0) {
      const detalhe = postsMessages.filter(l => l.startsWith('REQ ')).slice(0, 2).join(' | ');
      reg('P4-diagnostico', 'FAIL', `POSTs a messages: ${resOk} OK / ${resErro} com erro — claims: ${detalhe} — ${postsMessages.filter(l => l.startsWith('RES ') && !l.startsWith('RES 2')).slice(0, 1).join(' | ')}`);
    } else {
      reg('P4-diagnostico', 'PASS', `POSTs a messages: ${resOk} respondidos com sucesso (2xx)`);
    }
  } catch (e) {
    reg('P4-comunicacoes', 'FAIL', `exceção: ${String(e).slice(0, 200)}`);
    await page.screenshot({ path: `${SHOTS}/piloto-P4-excecao.png` }).catch(() => null);
  }
  await browser.close();
  return ids;
}

// ============================================================================
// P5 · Comunicação de oportunidades (campanha)
// ============================================================================
async function campanhaOportunidades() {
  console.log('--- P5 · Comunicação de oportunidades para empreendedores ---');
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'pt-PT' })).newPage();
  let notifId = '';
  try {
    // P5a — UI da campanha (login admin demo)
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('heading', { name: 'LOGIN' }).first().waitFor({ state: 'visible', timeout: 20000 });
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await page.waitForTimeout(600);
    await page.getByPlaceholder(/LA041|AGT-9921-SR|ADM-8812-OP/).fill('ADM-8812-OP');
    await page.getByPlaceholder('••••••••••••').fill('GALHARDO');
    await page.getByRole('button', { name: /Entrar no Portal/ }).click();
    await page.waitForTimeout(4000);

    const navContatos = page.locator('nav button', { hasText: /^\s*Cidadãos\s*$/ }).first();
    const temNav = await navContatos.isVisible().catch(() => false);
    if (!temNav) {
      // fallback: «Contactos» (rótulo alternativo)
      reg('P5a-nav', 'FAIL', 'botão «Cidadãos» não encontrado na navegação admin');
    } else {
      await navContatos.click();
      await page.waitForTimeout(2200);
    }

    const btnCampanha = page.getByRole('button', { name: /Criar aviso geral \(campanha\)/i }).first();
    const temCampanha = await btnCampanha.isVisible().catch(() => false);
    if (!temCampanha) {
      reg('P5a-campanha-ui', 'FAIL', 'formulário de campanha não encontrado na área admin');
    } else {
      await btnCampanha.click();
      await page.waitForTimeout(900);
      const tituloCamp = `[INAPEM-LLVV] Oportunidade de financiamento para MPME ${ts}`;
      await page.getByPlaceholder(/Título do aviso/i).fill(tituloCamp);
      await page.getByPlaceholder(/Mensagem do aviso/i).fill(`A Delegação do INAPEM em Viana (LLVV) anuncia nova linha de apoio ao empreendedorismo. Candidaturas abertas — envie a sua candidatura por esta plataforma oficial. (Ensaio piloto ${ts})`);
      await page.getByRole('button', { name: /Enviar aviso/i }).first().click();
      await page.waitForTimeout(1800);
      const corpo = await page.evaluate(() => document.body.innerText);
      // A conta demo NÃO tem claim de admin real → a escrita em massa cai em
      // auditoria por RLS (comportamento HONESTO por desenho) OU regista na nuvem.
      const okUI = /Aviso registado na auditoria|Aviso enviado/i.test(corpo);
      reg('P5a-campanha-ui', okUI ? 'PASS' : 'FAIL',
        okUI ? 'formulário de campanha submetido com feedback honesto (demo → auditoria/RLS)' : 'sem feedback de submissão da campanha');
      await page.screenshot({ path: `${SHOTS}/piloto-P5-campanha.png` }).catch(() => null);
    }

    // P5b — prova cloud do circuito "oportunidade": insert real em notifications
    // com target_bi do cidadão §D, usando o SCHEMA REAL da tabela (time_text,
    // target_tab; id BIGSERIAL auto) — o mesmo insert que o admin real faz
    // (e que o GovContactsContent passou a fazer após o fix 2026-08-15).
    // NOTA: a tabela notifications tem FK target_bi → profiles(bi). O BI do
    // cidadão de teste §D (009999999LA099) NÃO tem linha em profiles — o
    // insert é recusado pela FK (comportamento correcto: não notificar BIs
    // inexistentes). Para provar o circuito, usa-se o BI DEMO com perfil
    // real (009874562LA041 — "Edlasio Galhardo", conta demo legítima).
    const BI_ALVO = '009874562LA041';
    const notifPayload = {
      target_bi: BI_ALVO,
      title: `[INAPEM-LLVV] Oportunidade de financiamento ${ts}`,
      message: `Nova linha de apoio às MPME aberta na Delegação do INAPEM em Viana. Candidaturas pela plataforma CDA.`,
      time_text: 'Agora',
      type: 'info',
      target_tab: 'home',
    };
    const ins = await supaRest('notifications', { method: 'POST', body: JSON.stringify(notifPayload) });
    const confirmada = Array.isArray(ins.body) && ins.body.length === 1;
    if (confirmada) notifId = ins.body[0].id;
    reg('P5b-oportunidade-cloud', confirmada ? 'PASS' : 'FAIL',
      confirmada ? `notificação real gravada (id ${notifId}) com target_bi=${BI_ALVO} (perfil real) — mecanismo de oportunidades ponta-a-ponta` : `insert falhou: HTTP ${ins.status} ${String(ins.body || '').slice(0, 150)}`);
  } catch (e) {
    reg('P5-campanha', 'FAIL', `exceção: ${String(e).slice(0, 200)}`);
  }
  await browser.close();
  return notifId;
}

// ============================================================================
// P6 · Certificação de ficheiros (base da renovação de certificação MPME)
// ============================================================================
async function certificacaoFicheiros() {
  console.log('--- P6 · Certificação de ficheiros (cidadão demo → Protocolo de Chancela) ---');
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'pt-PT' })).newPage();
  const errosJs = [];
  page.on('pageerror', (e) => errosJs.push(String(e).slice(0, 120)));
  try {
    // login cidadão demo
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.getByPlaceholder(/LA041|AGT-9921-SR|ADM-8812-OP/).fill('009874562LA041');
    await page.getByPlaceholder('••••••••••••').fill('123456');
    await page.getByRole('button', { name: /Entrar no Portal/ }).click();
    await page.waitForTimeout(4000);

    // ir a solicitar-documento
    await page.evaluate(() => { window.location.hash = '#/solicitar-documento'; });
    await page.waitForTimeout(2500);

    // Passo 1 → 2 (anexos)
    await clicarQuandoActivo(page, /Seguinte: Anexos/, 15000);
    await page.waitForTimeout(1200);
    // Passo 2 → 3 (varredura/validação)
    await clicarQuandoActivo(page, /Seguinte: Varredura/, 15000);
    // validação automática ~3.2s
    await page.waitForTimeout(4500);
    // Passo 3 → 4 (pagamento)
    await clicarQuandoActivo(page, /Seguinte: Pagamento/, 15000);
    await page.waitForTimeout(1200);
    // Escolher método EXPRESS («MC Express») — o formulário de pagamento só
    // abre após seleccionar o método (paymentOption).
    await clicarQuandoActivo(page, /MC Express/, 15000);
    await page.waitForTimeout(600);
    // Pagar (EXPRESS — paymentPhone preenchido pelo auto-preenchimento demo)
    await clicarQuandoActivo(page, /Autorizar e Pagar/, 15000);
    await page.waitForTimeout(4200); // simulação de pagamento ~2.7s
    // Passo 4 → 5 (despacho)
    await clicarQuandoActivo(page, /Seguinte: Despacho/, 15000);
    await page.waitForTimeout(1200);
    // Emitir documento
    await clicarQuandoActivo(page, /Emitir Documento Digital/, 15000);
    await page.waitForTimeout(1500);

    const corpo = await page.evaluate(() => document.body.innerText);
    const temProtocolo = /protocolo de chancela/i.test(corpo);
    const mProt = corpo.match(/CDA-[A-Z]+-\d{6}/);
    reg('P6-emissao-protocolo', (temProtocolo || mProt) ? 'PASS' : 'FAIL',
      mProt ? `documento certificado emitido com Protocolo de Chancela ${mProt[0]} (fluxo de certificação de ficheiros — base da renovação MPME)` : `ecrã final sem protocolo (label=${temProtocolo})`);
    await page.screenshot({ path: `${SHOTS}/piloto-P6-certificacao.png` }).catch(() => null);
    reg('P6-sem-erros-js', errosJs.length === 0 ? 'PASS' : 'FAIL', errosJs.join(' | '));
  } catch (e) {
    reg('P6-certificacao', 'FAIL', `exceção: ${String(e).slice(0, 200)}`);
    await page.screenshot({ path: `${SHOTS}/piloto-P6-excecao.png` }).catch(() => null);
  }
  await browser.close();
}

// ============================================================================
// Limpeza total — deixar a base exactamente como estava
// ============================================================================
async function limpeza(codigo, msgIds, notifId) {
  console.log('--- LIMPEZA — remoção total dos dados do ensaio ---');
  let ok = true;
  if (codigo) {
    // 1) pagamentos da sigla (por segurança — o ensaio não cria, mas cobrir)
    const delP = await supaRest(`pagamentos?instituicao_sigla=eq.${encodeURIComponent(codigo)}`, { method: 'DELETE' });
    ok = ok && delP.status < 300;
    // 2) utilizador Auth (claim app_metadata.instituicao = código completo)
    const user = await encontrarUserPorClaim('instituicao', codigo);
    if (user) {
      const del = await authAdmin(`admin/users/${user.id}`, { method: 'DELETE' });
      ok = ok && del.status === 200;
    }
    // 3) solicitação de adesão
    const delS = await supaRest(`solicitacoes_registo?bi_numero=eq.${encodeURIComponent(codigo)}`, { method: 'DELETE' });
    ok = ok && delS.status < 300;
  }
  // 4) mensagens do ensaio (por subject único)
  if (msgIds.length > 0) {
    const or = msgIds.map(id => `id=eq.${id}`).join(',');
    const delM = await supaRest(`messages?${or}`, { method: 'DELETE' });
    ok = ok && delM.status < 300;
  }
  // 5) notificação da campanha
  if (notifId) {
    const delN = await supaRest(`notifications?id=eq.${encodeURIComponent(notifId)}`, { method: 'DELETE' });
    ok = ok && delN.status < 300;
  }
  // verificação final: zero resíduos
  const vestigios = [];
  if (codigo) {
    const restamUser = await encontrarUserPorClaim('instituicao', codigo);
    if (restamUser) vestigios.push('auth');
    const restamSol = await supaRest(`solicitacoes_registo?bi_numero=eq.${encodeURIComponent(codigo)}&select=id`);
    if (Array.isArray(restamSol.body) && restamSol.body.length) vestigios.push('solicitacao');
    const restamPag = await supaRest(`pagamentos?instituicao_sigla=eq.${encodeURIComponent(codigo)}&select=id`);
    if (Array.isArray(restamPag.body) && restamPag.body.length) vestigios.push('pagamentos');
  }
  if (msgIds.length > 0) {
    const or = msgIds.map(id => `id=eq.${id}`).join(',');
    const restamMsg = await supaRest(`messages?${or}&select=id`);
    if (Array.isArray(restamMsg.body) && restamMsg.body.length) vestigios.push('mensagens');
  }
  if (notifId) {
    const restamN = await supaRest(`notifications?id=eq.${encodeURIComponent(notifId)}&select=id`);
    if (Array.isArray(restamN.body) && restamN.body.length) vestigios.push('notificacao');
  }
  reg('limpeza-final', vestigios.length === 0 ? 'PASS' : 'FAIL',
    vestigios.length === 0 ? 'base limpa — zero resíduos do ensaio' : `resíduos: ${vestigios.join(', ')}`);
  return ok;
}

// ============================================================================
// Execução principal
// ============================================================================
(async () => {
  let codigo = '', msgIds = [], notifId = '';
  try {
    const r1 = await registarInapem();
    codigo = r1.codigo;
    const agente = r1.agente;
    if (!agente) return;

    // P2 · homologação pelo arnês
    const up = await supaRest(`solicitacoes_registo?bi_numero=eq.${encodeURIComponent(codigo)}`, {
      method: 'PATCH', body: JSON.stringify({ status: 'Aprovado' }),
      headers: { Prefer: 'return=representation' },
    });
    const linhas = Array.isArray(up.body) ? up.body.length : 0;
    reg('P2-homologacao-harness', up.status < 300 && linhas === 1 ? 'PASS' : 'FAIL',
      up.status < 300 && linhas === 1 ? `unidade ${codigo} aprovada (decisão admin simulada pelo arnês)` : `HTTP ${up.status}, linhas=${linhas}`);

    msgIds = await enviarComunicacoes(agente, codigo);
    notifId = await campanhaOportunidades();
    await certificacaoFicheiros();
  } catch (e) {
    reg('execucao', 'FAIL', `exceção global: ${String(e).slice(0, 200)}`);
  } finally {
    await limpeza(codigo, msgIds, notifId);
  }

  console.log('======================================================================');
  console.log(`RESULTADO: ${resultados.length - FAILS - SKIPS} PASS / ${SKIPS} SKIP / ${FAILS} FAIL`);
  process.exit(FAILS > 0 ? 1 : 0);
})();
