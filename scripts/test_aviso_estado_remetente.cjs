/**
 * AVISO AO REMETENTE QUANDO A INSTITUIÇÃO MUDA O ESTADO.
 *
 * Prova, em produção e com as contas reais, a regra pedida pelo dono:
 * quando a instituição actualiza o estado de uma OCORRÊNCIA, RECLAMAÇÃO ou
 * DENÚNCIA, o autor recebe uma MENSAGEM na sua caixa de correio — não apenas
 * uma notificação interna.
 *
 * Tudo o que cria é apagado no fim (selo VERIF-AVISO-…).
 * Uso: node scripts/test_aviso_estado_remetente.cjs
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const B = 'https://klrclczcahfycfdxzdqs.supabase.co';
const APP = 'https://correio-digital-angola-oficial.vercel.app';
const BI = '002399714LA030';
const INST = 'AGT-LMM';
const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const SVC = env.match(/SUPABASE_SERVICE_ROLE_KEY=([^\s\n]+)/)[1];
const ANON = (env.match(/VITE_SUPABASE_ANON_KEY=([^\s\n]+)/) || env.match(/SUPABASE_ANON_KEY=([^\s\n]+)/))[1];
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' };

const login = async (email, pass) => {
  const r = await fetch(`${B}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('login falhou: ' + email);
  return j.access_token;
};
const inbox = async () => (await (await fetch(`${B}/rest/v1/messages?recipient_bi=eq.${BI}&select=id,subject,body,sender_bi&order=id.desc&limit=300`, { headers: H })).json());
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const del = (u) => fetch(B + u, { method: 'DELETE', headers: H });

const ocorrenciasApi = async (tk, body) => {
  const r = await fetch(`${APP}/api/ocorrencias`, {
    method: 'POST', headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return [r.status, await r.json().catch(() => null)];
};

(async () => {
  const out = {};
  const marca = 'VERIF-AVISO-' + Date.now();
  const vestigios = { mensagens: [], ocorrencias: [] };
  try {
    const tcid = await login('bi.002399714la030@cidadao.correiodigital.ao', '123456789');
    const tinst = await login('agente.agt-lmm-01@inst.correiodigital.ao', '123456789');

    // ---------- OCORRÊNCIA ----------
    const antesOc = await inbox();
    const [, criada] = await ocorrenciasApi(tcid, {
      acao: 'criar',
      dados: { categoria: 'Iluminação pública', titulo: marca + ' ocorrência', descricao: 'Verificação automática do aviso de estado ao remetente.', provincia: 'Luanda', municipio: 'Luanda', bairro: 'Cassenda', referencia: 'Junto ao mercado', instituicao_codigo: INST },
      confirmado: true, fotos: [], pedido: crypto.randomUUID(),
    });
    const oco = criada && criada.ocorrencia;
    if (!oco) throw new Error('ocorrência não criada');
    vestigios.ocorrencias.push(oco.id);

    const [s1, r1] = await ocorrenciasApi(tinst, { acao: 'actuar', id: oco.id, versao: oco.versao, operacao: 'receber', dados: { descricao: 'Confirmamos a recepção da ocorrência.' }, pedido: crypto.randomUUID() });
    await esperar(4000);
    const depoisOc = await inbox();
    const novasOc = depoisOc.filter((m) => !antesOc.some((a) => a.id === m.id) && String(m.subject).includes(`OC-${String(oco.numero).padStart(6, '0')}`));
    vestigios.mensagens.push(...novasOc.map((m) => m.id));
    out.ocorrencia = {
      estado_aplicado: s1 === 200 && r1?.aviso_remetente === true,
      mensagem_recebida: novasOc.length > 0,
      assunto: novasOc[0]?.subject || null,
      remetente: novasOc[0]?.sender_bi || null,
      corpo_tem_estado: !!novasOc[0] && /Estado actual/i.test(String(novasOc[0].body || '')),
    };
    out.ocorrencia.ok = out.ocorrencia.estado_aplicado && out.ocorrencia.mensagem_recebida && out.ocorrencia.corpo_tem_estado && out.ocorrencia.remetente === INST;

    // ---------- RECLAMAÇÃO ----------
    const mRec = marca + ' reclamação';
    const antesRec = await inbox();
    await fetch(`${APP}/api/dados`, {
      method: 'POST', headers: { Authorization: `Bearer ${tcid}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabela: 'messages', operacao: 'insert', dados: [{ id: Number(`${Date.now()}1`), sender_bi: BI, recipient_bi: INST, org: INST, preview: mRec, unread: 1, status: 'Informativo', subject: `[RECLAMAÇÃO] ${mRec}`, body: 'Reclamação de verificação.', deadline_text: 'Sem prazo', state_indicator: 'Registada', actions: ['Ver detalhes'], attachments: [], sensitivity: 'Privado', priority_scale: 'Normal', deadline_hours_remaining: null, deadline_at: null }] }),
    });
    const acharRec = async () => (await (await fetch(`${B}/rest/v1/messages?subject=like.*${encodeURIComponent(mRec)}*&select=id&limit=1`, { headers: H })).json())[0];
    let rec = null;
    for (let i = 0; i < 8 && !rec; i++) { rec = await acharRec(); if (!rec) await esperar(1200); }
    if (!rec) throw new Error('reclamação não criada');
    const fase = await fetch(`${APP}/api/denuncia/fase`, { method: 'POST', headers: { Authorization: `Bearer ${tinst}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: rec.id, fase: 'recebida' }) });
    const faseJ = await fase.json().catch(() => ({}));
    await esperar(4000);
    const depoisRec = await inbox();
    const novasRec = depoisRec.filter((m) => !antesRec.some((a) => a.id === m.id) && String(m.subject).includes(mRec));
    vestigios.mensagens.push(...novasRec.map((m) => m.id));
    out.reclamacao = {
      fase_aplicada: fase.status === 200 && faseJ.mensagem === true,
      mensagem_recebida: novasRec.length > 0,
      assunto: novasRec[0]?.subject || null,
      corpo_tem_estados: !!novasRec[0] && /Estado anterior/i.test(String(novasRec[0].body || '')) && /Estado actual/i.test(String(novasRec[0].body || '')),
    };
    out.reclamacao.ok = out.reclamacao.fase_aplicada && out.reclamacao.mensagem_recebida && out.reclamacao.corpo_tem_estados;

    // ---------- DENÚNCIA ----------
    const mDen = marca + ' denúncia';
    const antesDen = await inbox();
    await fetch(`${APP}/api/dados`, {
      method: 'POST', headers: { Authorization: `Bearer ${tcid}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabela: 'messages', operacao: 'insert', dados: [{ id: Number(`${Date.now()}2`), sender_bi: BI, recipient_bi: INST, org: INST, preview: mDen, unread: 1, status: 'Informativo', subject: `[DENÚNCIA] ${mDen}`, body: 'Denúncia de verificação.', deadline_text: 'Sem prazo', state_indicator: 'Registada', actions: ['Ver detalhes'], attachments: [], sensitivity: 'Privado', priority_scale: 'Normal', deadline_hours_remaining: null, deadline_at: null }] }),
    });
    const acharDen = async () => (await (await fetch(`${B}/rest/v1/messages?subject=like.*${encodeURIComponent(mDen)}*&select=id&limit=1`, { headers: H })).json())[0];
    let den = null;
    for (let i = 0; i < 8 && !den; i++) { den = await acharDen(); if (!den) await esperar(1200); }
    if (!den) throw new Error('denúncia não criada');
    const faseD = await fetch(`${APP}/api/denuncia/fase`, { method: 'POST', headers: { Authorization: `Bearer ${tinst}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: den.id, fase: 'recebida' }) });
    const faseDJ = await faseD.json().catch(() => ({}));
    await esperar(4000);
    const depoisDen = await inbox();
    const novasDen = depoisDen.filter((m) => !antesDen.some((a) => a.id === m.id) && String(m.subject).includes(mDen));
    vestigios.mensagens.push(...novasDen.map((m) => m.id));
    out.denuncia = {
      fase_aplicada: faseD.status === 200 && faseDJ.mensagem === true,
      mensagem_recebida: novasDen.length > 0,
      assunto: novasDen[0]?.subject || null,
    };
    out.denuncia.ok = out.denuncia.fase_aplicada && out.denuncia.mensagem_recebida;

    vestigios.mensagens.push(rec.id, den.id);
    out.aprovado = out.ocorrencia.ok && out.reclamacao.ok && out.denuncia.ok;
  } catch (e) {
    out.erro = String(e.message || e).slice(0, 200);
    out.aprovado = false;
  } finally {
    for (const id of vestigios.mensagens) {
      await del(`/rest/v1/message_state_history?message_id=eq.${id}`);
      await del(`/rest/v1/messages?id=eq.${id}`);
    }
    for (const oid of vestigios.ocorrencias) {
      for (const t of ['cda_ocorrencias_eventos', 'cda_ocorrencias_notificacoes', 'cda_ocorrencias_fotos']) await del(`/rest/v1/${t}?ocorrencia_id=eq.${oid}`);
      await del(`/rest/v1/cda_ocorrencias?id=eq.${oid}`);
    }
    await del(`/rest/v1/messages?subject=like.*${encodeURIComponent(marca)}*`);
    const resto = await (await fetch(`${B}/rest/v1/messages?subject=like.*VERIF-AVISO*&select=id`, { headers: H })).json();
    out.residuo_limpo = Array.isArray(resto) && resto.length === 0;
    console.log(JSON.stringify(out, null, 1));
    process.exitCode = out.aprovado && out.residuo_limpo ? 0 : 1;
  }
})();
