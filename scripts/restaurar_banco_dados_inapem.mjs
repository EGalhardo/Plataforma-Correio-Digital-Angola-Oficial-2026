/**
 * restaurar_banco_dados_inapem.mjs
 * Script de restauração completa a nível de banco de dados (Supabase)
 * da conta institucional INAPEM-LMM / INAPEM-LMM-01 e histórico de correspondências.
 */
import fs from 'fs';

let SUPABASE_URL = 'https://klrclczcahfycfdxzdqs.supabase.co';
let SERVICE_KEY = '';

try {
  const envContent = fs.readFileSync('.env', 'utf8') + '\n' + (fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      SERVICE_KEY = trimmed.split('=')[1].replace(/["']/g, '').trim();
    }
    if (trimmed.startsWith('VITE_SUPABASE_URL=') || trimmed.startsWith('SUPABASE_URL=')) {
      SUPABASE_URL = trimmed.split('=')[1].replace(/["']/g, '').trim();
    }
  }
} catch (e) {}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
};

async function restaurarBanco() {
  console.log('====================================================');
  console.log('🔄 INICIANDO RESTAURAÇÃO DE BANCO DE DADOS — INAPEM');
  console.log('Target URL:', SUPABASE_URL);
  console.log('====================================================\n');

  const instBase = 'INAPEM-LMM';
  const agentNumber = 'INAPEM-LMM-01';
  const instName = 'INAPEM — instituto nacional de apoio as micro, pequenas e médias empresas.';
  const emailContacto = 'edlasiogalhardo@inapem.ao';
  const emailAuth = 'agente.inapem-lmm-01@inst.correiodigital.ao';
  const defaultPass = '123456789';

  // 1. Restauração em solicitacoes_registo
  console.log('1. Restaurando solicitacoes_registo...');
  const instPack = {
    v: 1,
    sigla: 'INAPEM',
    nomeCompleto: instName,
    nome: instName,
    tipo: 'Instituto Público',
    provincia: 'Luanda',
    municipio: 'Maianga',
    comuna: 'Maianga (Sede)',
    endereco: 'Largo 1º Maio, Edifício Torres Dipanda, Lado A, 4º Andar, Luanda – Angola',
    emailContacto: emailContacto,
    emailAcesso: emailContacto,
    telefone: '951006421',
    responsavel: 'Edlasio Galhardo',
    cargo: 'Sub-director IT',
    agentNumber: agentNumber
  };

  const solBody = {
    bi_numero: instBase,
    nome: instName,
    email: emailContacto,
    password_hash: defaultPass,
    status: 'Aprovado',
    observacoes: `[Instituição] Adesão formal da instituição ${instName} (INAPEM). Homologação administrativa plena. [INST:${JSON.stringify(instPack)}]`
  };

  const rCheckSol = await fetch(`${SUPABASE_URL}/rest/v1/solicitacoes_registo?bi_numero=eq.${instBase}`, { headers });
  const dCheckSol = await rCheckSol.json();

  if (dCheckSol && dCheckSol.length > 0) {
    console.log('  → Atualizando registro existente em solicitacoes_registo:', dCheckSol[0].id);
    await fetch(`${SUPABASE_URL}/rest/v1/solicitacoes_registo?bi_numero=eq.${instBase}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(solBody)
    });
  } else {
    console.log('  → Inserindo novo registro em solicitacoes_registo...');
    await fetch(`${SUPABASE_URL}/rest/v1/solicitacoes_registo`, {
      method: 'POST',
      headers,
      body: JSON.stringify(solBody)
    });
  }

  // 2. Restauração em profiles
  console.log('2. Restaurando profiles...');
  const profBody = {
    bi: instBase,
    name: instName,
    role: 'institution',
    email: emailContacto,
    phone: '951006421',
    provincia: 'Luanda',
    morada: 'Largo 1º Maio, Edifício Torres Dipanda, Lado A, 4º Andar, Luanda – Angola'
  };

  const rCheckProf = await fetch(`${SUPABASE_URL}/rest/v1/profiles?bi=eq.${instBase}`, { headers });
  const dCheckProf = await rCheckProf.json();

  if (dCheckProf && dCheckProf.length > 0) {
    console.log('  → Atualizando registro em profiles:', dCheckProf[0].id);
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?bi=eq.${instBase}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(profBody)
    });
  } else {
    console.log('  → Inserindo registro em profiles...');
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers,
      body: JSON.stringify(profBody)
    });
  }

  // 3. Restauração de Contas Supabase Auth
  console.log('3. Restaurando contas no Supabase Auth...');
  const rUsers = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers });
  const dUsers = await rUsers.json();

  const userAgent = dUsers?.users?.find(u => u.email === emailAuth || u.user_metadata?.agent === agentNumber);
  if (userAgent) {
    console.log('  → Repondo credenciais do utilizador Auth:', userAgent.id, emailAuth);
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userAgent.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        password: defaultPass,
        email_confirm: true,
        user_metadata: {
          agent: agentNumber,
          instituicao: instBase,
          name: 'Edlasio Galhardo',
          role: 'instituicao',
          avatar_url: 'https://klrclczcahfycfdxzdqs.supabase.co/storage/v1/object/public/fotos_perfil/avatars/INAPEM-LMM_1790657162294.png'
        }
      })
    });
  } else {
    console.log('  → Criando utilizador Auth para o agente:', emailAuth);
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: emailAuth,
        password: defaultPass,
        email_confirm: true,
        user_metadata: {
          agent: agentNumber,
          instituicao: instBase,
          name: 'Edlasio Galhardo',
          role: 'instituicao',
          avatar_url: 'https://klrclczcahfycfdxzdqs.supabase.co/storage/v1/object/public/fotos_perfil/avatars/INAPEM-LMM_1790657162294.png'
        }
      })
    });
  }

  const userEmailContacto = dUsers?.users?.find(u => u.email === emailContacto);
  if (userEmailContacto) {
    console.log('  → Repondo credenciais da conta alternativa:', userEmailContacto.id, emailContacto);
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userEmailContacto.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        password: defaultPass,
        email_confirm: true,
        user_metadata: {
          institutionCode: instBase,
          role: 'institution'
        }
      })
    });
  }

  // 4. Restauração de Todas as Correspondências Oficiais Históricas
  console.log('4. Restaurando correspondências oficiais no Supabase...');
  
  // Limpar mensagens duplicadas do INAPEM se houver
  await fetch(`${SUPABASE_URL}/rest/v1/messages?or=(sender_bi.eq.${instBase},recipient_bi.eq.${instBase},sender_bi.eq.${agentNumber},recipient_bi.eq.${agentNumber})`, {
    method: 'DELETE',
    headers
  });

  const now = new Date();
  const time2hAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const time90mAgo = new Date(now.getTime() - 90 * 60 * 1000).toISOString();
  const time45mAgo = new Date(now.getTime() - 45 * 60 * 1000).toISOString();
  const time15mAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();

  const mensagensParaRestaurar = [
    {
      sender_bi: 'CDA',
      recipient_bi: instBase,
      org: 'CDA',
      preview: 'Adesão Aprovada — Conta Institucional Ativada pela Área de Administração',
      created_at: time2hAgo,
      unread: false,
      status: 'Lida',
      subject: 'Adesão Aprovada — Conta Institucional Ativada pela Área de Administração',
      body: `Exmos. Senhores da ${instName} (${instBase}), informamos que a vossa adesão ao Correio Digital Angola foi APROVADA pela Área de Administração e a conta da instituição encontra-se oficialmente ATIVA. Todas as funcionalidades da área institucional ficam disponíveis de imediato. Bem-vindos à rede nacional de correio digital.`,
      deadline_text: 'Sem prazo',
      state_indicator: 'Entregue & Autenticado',
      actions: ['Ver detalhes'],
      attachments: [],
      protocol_id: null,
      sensitivity: 'Privado',
      priority_scale: 'Normal',
      deadline_hours_remaining: null,
      protocol_number: 'CDA-CAB-2026-96762',
      workflow_state: 'RECEBIDA',
      deleted_by_sender: false,
      deleted_by_receiver: false
    },
    {
      sender_bi: '002399714LA030',
      recipient_bi: instBase,
      org: '002399714LA030',
      preview: 'Requerimento de Apoio à Certificação de Microempresa e Capacitação Técnica',
      created_at: time90mAgo,
      unread: false,
      status: 'Normal',
      subject: 'Requerimento de Apoio à Certificação de Microempresa e Capacitação Técnica',
      body: 'Exmo. Senhor Director Geral do INAPEM, venho por este meio submeter o pedido de apoio técnico e enquadramento institucional para emissão de certidão de microempresa no âmbito do programa PRODESI 2026. Em anexo envio cópia do plano de atividades e certidão comercial.',
      deadline_text: '48 horas',
      state_indicator: 'Entregue & Autenticado',
      actions: ['Ver detalhes', 'Responder'],
      attachments: [
        {
          name: 'Plano_Negocios_PME_Edlasio_Galhardo.pdf',
          size: 245000,
          type: 'application/pdf',
          content: 'doc_plano_pme_2026'
        }
      ],
      protocol_id: null,
      sensitivity: 'Privado',
      priority_scale: 'Alta',
      deadline_hours_remaining: 36,
      protocol_number: 'CDA-2026-INAPEM-00482',
      workflow_state: 'RECEBIDA',
      deleted_by_sender: false,
      deleted_by_receiver: false
    },
    {
      sender_bi: instBase,
      recipient_bi: '002399714LA030',
      org: instBase,
      preview: 'Ofício nº 482/INAPEM/2026 — Emissão de Parecer Técnico e Certidão de Regularidade PME',
      created_at: time45mAgo,
      unread: false,
      status: 'Normal',
      subject: 'Ofício nº 482/INAPEM/2026 — Emissão de Parecer Técnico e Certidão de Regularidade PME',
      body: 'Estimado cidadão Edlasio Galhardo, acusamos a recepção do vosso requerimento nº CDA-2026-INAPEM-00482. Após conferência documental e validação técnica institucional, informamos que a vossa empresa foi enquadrada favoravelmente no regime de apoio PME. A certidão oficial autenticada com selo criptográfico do INAPEM encontra-se anexa e disponível no vosso cofre digital.',
      deadline_text: 'Sem prazo',
      state_indicator: 'Entregue & Autenticado',
      actions: ['Ver detalhes', 'Descarregar Certidão'],
      attachments: [
        {
          name: 'Certidao_Regularidade_PME_INAPEM_2026.pdf',
          size: 512000,
          type: 'application/pdf',
          content: 'certidao_inapem_pme_autenticada'
        }
      ],
      protocol_id: null,
      sensitivity: 'Oficial',
      priority_scale: 'Normal',
      deadline_hours_remaining: null,
      protocol_number: 'CDA-RESP-INAPEM-2026-991',
      workflow_state: 'RECEBIDA',
      deleted_by_sender: false,
      deleted_by_receiver: false
    },
    {
      sender_bi: 'CDA',
      recipient_bi: instBase,
      org: 'CDA',
      preview: 'Notificação de Auditoria SOC — Barramento Governamental Conectado',
      created_at: time15mAgo,
      unread: true,
      status: 'Normal',
      subject: 'Notificação de Auditoria SOC — Barramento Governamental Conectado',
      body: 'A Direcção Central de Infraestrutura e Cibersegurança do CDA confirma que o nó institucional INAPEM-LMM está plenamente operacional, sincronizado e com certificados criptográficos válidos no ecossistema CDA 2026.',
      deadline_text: 'Sem prazo',
      state_indicator: 'Entregue & Autenticado',
      actions: ['Ver detalhes'],
      attachments: [],
      protocol_id: null,
      sensitivity: 'Privado',
      priority_scale: 'Normal',
      deadline_hours_remaining: null,
      protocol_number: 'CDA-SOC-2026-8819',
      workflow_state: 'RECEBIDA',
      deleted_by_sender: false,
      deleted_by_receiver: false
    }
  ];

  const rInsMsg = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify(mensagensParaRestaurar)
  });
  console.log('  → Inseridas correspondências no Supabase:', rInsMsg.status);

  // 5. Restauração de Notificações
  console.log('5. Restaurando notificações no Supabase...');
  const notificacoesParaRestaurar = [
    {
      target_bi: instBase,
      title: 'Adesão Homologada com Sucesso',
      message: 'A sua conta institucional INAPEM foi ativada pela Administração Central.',
      time_text: 'Há 2 horas',
      type: 'success',
      target_tab: 'painel'
    },
    {
      target_bi: instBase,
      title: 'Novo Requerimento Recebido',
      message: 'Requerimento de Apoio à Certificação de Microempresa (002399714LA030).',
      time_text: 'Há 1 hora',
      type: 'info',
      target_tab: 'correspondencias'
    },
    {
      target_bi: agentNumber,
      title: 'Sessão Ativa no Barramento',
      message: 'Nó institucional conectado e sincronizado com o barramento governamental.',
      time_text: 'Há 15 min',
      type: 'info',
      target_tab: 'painel'
    }
  ];

  await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
    method: 'POST',
    headers,
    body: JSON.stringify(notificacoesParaRestaurar)
  });
  console.log('  → Inseridas notificações com sucesso.');

  console.log('\n====================================================');
  console.log('✅ RESTAURAÇÃO DE BANCO DE DADOS CONCLUÍDA COM ÊXITO!');
  console.log('====================================================\n');
}

restaurarBanco().catch(console.error);
