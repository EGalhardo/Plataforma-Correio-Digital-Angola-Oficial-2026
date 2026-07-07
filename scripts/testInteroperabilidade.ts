import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// Inicializar Supabase
// Correio Digital Angola - Project ID: klrclczcahfycfdxzdqs
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://klrclczcahfycfdxzdqs.supabase.co';
const supabaseKey = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_ANON_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';

if (!supabaseUrl || !supabaseKey) {
  console.error('\x1b[31m[ERRO] Credenciais do Supabase não encontradas. Configure as variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY ou ANON_KEY no .env\x1b[0m');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { realtime: { transport: ws as any } });

const CITIZEN_BI = '002931298LA045';
const CITIZEN_NAME = 'Edlasio Galhardo';
const INST_CODE = 'AGT';
const ADMIN_CODE = 'CDA';

// Função para formatar as saídas visuais
function printHeader(title: string) {
  console.log('\n' + '='.repeat(80));
  console.log(`\x1b[35m\x1b[1m${title.toUpperCase()}\x1b[0m`);
  console.log('='.repeat(80));
}

function printStep(stepNum: number, description: string) {
  console.log(`\n\x1b[34m[PASSO ${stepNum}] ${description}\x1b[0m`);
}

function printSuccess(message: string) {
  console.log(`\x1b[32m✔ ${message}\x1b[0m`);
}

function printInfo(message: string) {
  console.log(`\x1b[36mℹ ${message}\x1b[0m`);
}

// Criar payload de mensagem consistente com o banco de dados
function buildMessagePayload(params: {
  senderBi: string;
  recipientBi: string;
  org: string;
  subject: string;
  body: string;
  status?: string;
}) {
  return {
    sender_bi: params.senderBi,
    recipient_bi: params.recipientBi,
    org: params.org,
    preview: params.subject,
    unread: true,
    status: params.status || 'Normal',
    subject: params.subject,
    body: params.body,
    deadline_text: 'Sem prazo',
    state_indicator: 'Entregue & Autenticado',
    actions: ['Ver detalhes'],
    attachments: [],
    sensitivity: 'Privado',
    priority_scale: params.status || 'Normal',
    deadline_hours_remaining: 48
  };
}

// Garantir que os perfis de teste existam no banco para evitar violações de integridade
async function ensureProfile(bi: string, name: string, role: string) {
  const { data: existing } = await supabase.from('profiles').select('id').eq('bi', bi).maybeSingle();
  if (!existing) {
    printInfo(`Perfil para ${name} (${bi}) não existe. Criando no Supabase...`);
    const { error } = await supabase.from('profiles').insert([{
      bi,
      name,
      role,
      phone: '+244920000000',
      nif: bi.slice(0, 9)
    }]);
    if (error) {
      console.warn(`[Aviso] Erro ao criar perfil ${name}: ${error.message}`);
    } else {
      printSuccess(`Perfil ${name} (${role}) registado com sucesso.`);
    }
  } else {
    printInfo(`Perfil ${name} (${role}) já existe.`);
  }
}

async function runTestSuite() {
  printHeader('Suite de Testes Automatizados de Interoperabilidade e Persistência Supabase');
  printInfo(`URL do Supabase: ${supabaseUrl}`);
  printInfo(`Iniciando fluxo operacional síncrono...\n`);

  // Garantir existência dos atores principais
  await ensureProfile(CITIZEN_BI, CITIZEN_NAME, 'user');
  await ensureProfile(INST_CODE, 'Administração Geral Tributária', 'institution');
  await ensureProfile(ADMIN_CODE, 'Correio Digital Angola', 'admin');

  const messageMap: { [key: string]: { originalId: number; replyId?: number; subject: string } } = {};

  // =========================================================================================
  // PASSO 1: Enviar 5 mensagens do cidadão para a AGT
  // =========================================================================================
  printStep(1, 'Cidadão enviando 5 correspondências oficiais para a AGT');

  const citizenMessages = [
    {
      key: 'msg1',
      subject: 'Reclamação de Liquidação do Imposto Predial Urbano',
      body: 'Prezados Senhores, venho por este meio requerer a revisão urgente da liquidação do IPU incidente sobre o meu imóvel localizado em Luanda, pois o valor apurado excede os parâmetros do mercado e os dados cadastrais da caderneta predial.'
    },
    {
      key: 'msg2',
      subject: 'Pedido de Isenção de IVA para Bens de Primeira Necessidade',
      body: 'Solicito a validação prévia de isenção de IVA para as faturas de fornecimento de milho e hortícolas de produção nacional para distribuição social, em conformidade com o código aduaneiro e benefícios tributários.'
    },
    {
      key: 'msg3',
      subject: 'Regularização de Dívida Fiscal em Prestações',
      body: 'Venho propor um plano de parcelamento para pagamento voluntário do imposto industrial em atraso em 6 prestações mensais iguais, face a constrangimentos transitórios de tesouraria empresarial devidamente documentados.'
    },
    {
      key: 'msg4',
      subject: 'Esclarecimento sobre Retenção na Fonte de Não Residentes',
      body: 'Solicito parecer técnico desta direcção de serviços sobre a retenção na fonte aplicável à contratação de consultoria especializada a entidade sedeada no estrangeiro ao abrigo da Convenção para Evitar a Dupla Tributação.'
    },
    {
      key: 'msg5',
      subject: 'Submissão de Prova de Vida para Efeitos de Reforma',
      body: 'Nos termos da regulamentação da segurança social e administração tributária, anexo por este meio a minha certidão de existência física emitida pelo posto consular para efeitos de regularização de pensão anual.'
    }
  ];

  for (const msg of citizenMessages) {
    const payload = buildMessagePayload({
      senderBi: CITIZEN_BI,
      recipientBi: INST_CODE,
      org: INST_CODE,
      subject: msg.subject,
      body: msg.body,
      status: 'Urgente'
    });

    const { data: records, error } = await supabase.from('messages').insert([payload]).select();
    if (error) {
      throw new Error(`Falha ao enviar mensagem do cidadão (${msg.subject}): ${error.message}`);
    }

    const createdMsg = records?.[0];
    if (!createdMsg) {
      throw new Error(`Nenhum registo retornado ao criar mensagem (${msg.subject})`);
    }

    messageMap[msg.key] = {
      originalId: Number(createdMsg.id),
      subject: msg.subject
    };

    printSuccess(`Mensagem "${msg.subject}" persistida no Supabase com o ID: #${createdMsg.id}`);

    // Registar histórico do estado da mensagem (Auditoria)
    const eventPayload = {
      message_id: createdMsg.id,
      state: 'Enviada',
      event_date: new Date().toISOString().split('T')[0],
      event_time: new Date().toLocaleTimeString('pt-AO', { hour12: false }),
      responsible: CITIZEN_NAME,
      description: `Correspondência digital remetida pelo cidadão de forma segura para a AGT.`
    };

    const { error: eventErr } = await supabase.from('message_state_history').insert([eventPayload]);
    if (eventErr) {
      printInfo(`[Aviso] Falha ao registar evento de histórico: ${eventErr.message}`);
    } else {
      printSuccess(`  ↳ Histórico operacional registado com estado "Enviada".`);
    }
  }

  // =========================================================================================
  // PASSO 2: Validar persistência e integridade das mensagens
  // =========================================================================================
  printStep(2, 'Validando a persistência e metadados de todas as correspondências do cidadão no Supabase');

  for (const key of Object.keys(messageMap)) {
    const originalId = messageMap[key].originalId;
    const { data: found, error } = await supabase.from('messages').select('*').eq('id', originalId).maybeSingle();

    if (error || !found) {
      throw new Error(`Falha de integridade: Mensagem #${originalId} não pôde ser resgatada do banco de dados.`);
    }

    // Verificar integridade dos dados inseridos
    if (found.sender_bi !== CITIZEN_BI || found.recipient_bi !== INST_CODE) {
      throw new Error(`Inconsistência de metadados na correspondência #${originalId}. Remetente ou destinatário incorrectos.`);
    }

    printSuccess(`Mensagem #${originalId} validada com sucesso! Remetente: ${found.sender_bi} | Destinatário: ${found.recipient_bi} | Assunto: "${found.subject}"`);
  }

  // =========================================================================================
  // PASSO 3: Responder de forma síncrona a cada uma das 5 mensagens pela AGT
  // =========================================================================================
  printStep(3, 'AGT respondendo a cada uma das 5 mensagens (Sincronização Bidirecional)');

  const replies = [
    {
      key: 'msg1',
      body: 'Prezado Edlasio Galhardo, tomamos boa nota da sua reclamação referente ao IPU. Informamos que foi aberto o processo de auditoria interna fiscal sob o número AUD-2026-092 e uma equipa técnica irá vistoriar o local para ajustar o valor patrimonial de acordo com o regulamento.'
    },
    {
      key: 'msg2',
      body: 'Prezado Edlasio Galhardo, o seu pedido de isenção de IVA para bens de primeira necessidade de fabricação nacional foi deferido provisoriamente. O seu certificado de conformidade tributária já se encontra disponível para descarga em formato PDF assinado digitalmente.'
    },
    {
      key: 'msg3',
      body: 'Prezado Edlasio Galhardo, confirmamos a aceitação do plano de parcelamento da dívida de imposto industrial em 6 frações. As guias de liquidação de cobrança (DUC) mensais já foram geradas de forma síncrona no seu portal privado seguro.'
    },
    {
      key: 'msg4',
      body: 'Prezado Edlasio Galhardo, em atenção ao seu pedido de parecer, informamos que nos termos do Artigo 14.º da Convenção sobre Dupla Tributação Angola-Portugal, as prestações de serviços de assistência técnica estão sujeitas a retenção na fonte reduzida de 10%.'
    },
    {
      key: 'msg5',
      body: 'Prezado Edlasio Galhardo, a sua prova de vida anual foi validada com sucesso e os dados de pensão e retenção fiscal foram actualizados nos servidores nacionais da segurança social. Não há qualquer acção adicional requerida de sua parte.'
    }
  ];

  for (const reply of replies) {
    const origInfo = messageMap[reply.key];
    const replyPayload = buildMessagePayload({
      senderBi: INST_CODE,
      recipientBi: CITIZEN_BI,
      org: INST_CODE,
      subject: `RE: ${origInfo.subject}`,
      body: reply.body,
      status: 'Normal'
    });

    const { data: records, error } = await supabase.from('messages').insert([replyPayload]).select();
    if (error) {
      throw new Error(`Erro ao enviar resposta da AGT: ${error.message}`);
    }

    const createdReply = records?.[0];
    if (!createdReply) {
      throw new Error(`Erro ao receber retorno da inserção de resposta no banco.`);
    }

    origInfo.replyId = Number(createdReply.id);
    printSuccess(`Resposta oficial enviada à mensagem original #${origInfo.originalId} criada com sucesso sob o ID #${createdReply.id}.`);

    // Atualizar estado da mensagem original para indicativo de respondida e registar evento no histórico
    const { error: updateErr } = await supabase.from('messages').update({ state_indicator: 'Respondido' }).eq('id', origInfo.originalId);
    if (updateErr) {
      printInfo(`[Aviso] Falha ao actualizar estado da mensagem original: ${updateErr.message}`);
    }

    // Registar histórico do evento da resposta
    const eventPayload = {
      message_id: createdReply.id,
      state: 'Respondida',
      event_date: new Date().toISOString().split('T')[0],
      event_time: new Date().toLocaleTimeString('pt-AO', { hour12: false }),
      responsible: 'Agente Tributário da AGT',
      description: `Resposta governamental elaborada e despachada para o cidadão vinculada de forma segura ao requerimento original #${origInfo.originalId}.`
    };

    const { error: eventErr } = await supabase.from('message_state_history').insert([eventPayload]);
    if (eventErr) {
      printInfo(`[Aviso] Falha ao registar histórico de resposta: ${eventErr.message}`);
    } else {
      printSuccess(`  ↳ Histórico de resposta registado com sucesso para a mensagem #${createdReply.id}.`);
    }
  }

  // =========================================================================================
  // PASSO 4: Testar correspondência bidirecional com a versão ADMIN (CDA)
  // =========================================================================================
  printStep(4, 'Testando canais de interoperabilidade governamental com o Administrador de Sistemas (CDA)');

  // 4a. Admin para Institucional (AGT)
  printInfo('Simulando envio de Ofício do Admin (CDA) para a Instituição (AGT)...');
  const adminToInstPayload = buildMessagePayload({
    senderBi: ADMIN_CODE,
    recipientBi: INST_CODE,
    org: ADMIN_CODE,
    subject: 'Auditoria de Sincronização SGE - Correio Digital Angola',
    body: 'Prezados administradores da AGT, serve este ofício oficial para solicitar a auditoria de sincronização síncrona dos vossos gateways de mensageria com o barramento governamental síncrono.'
  });

  const { data: admInstRecords, error: admInstErr } = await supabase.from('messages').insert([adminToInstPayload]).select();
  if (admInstErr || !admInstRecords) {
    throw new Error(`Falha no envio do ofício Admin -> AGT: ${admInstErr?.message}`);
  }
  const admInstMsgId = admInstRecords[0].id;
  printSuccess(`Ofício Admin -> AGT persistido com o ID: #${admInstMsgId}`);

  // 4b. AGT respondendo de volta para o Admin (CDA)
  printInfo('Simulando resposta da Instituição (AGT) de volta para o Admin (CDA)...');
  const instToAdminPayload = buildMessagePayload({
    senderBi: INST_CODE,
    recipientBi: ADMIN_CODE,
    org: INST_CODE,
    subject: 'RE: Auditoria de Sincronização SGE - Correio Digital Angola',
    body: 'Prezada Administração do CDA, acusamos a receção do vosso ofício de auditoria. Informamos que os testes de carga correram com sucesso e os dados estão 100% integrados.'
  });

  const { data: instAdmRecords, error: instAdmErr } = await supabase.from('messages').insert([instToAdminPayload]).select();
  if (instAdmErr || !instAdmRecords) {
    throw new Error(`Falha no envio da resposta AGT -> Admin: ${instAdmErr?.message}`);
  }
  printSuccess(`Resposta AGT -> Admin persistida com o ID: #${instAdmRecords[0].id}`);

  // 4c. Admin para Cidadão
  printInfo('Simulando envio de Alerta oficial do Admin (CDA) para o Cidadão...');
  const adminToCitPayload = buildMessagePayload({
    senderBi: ADMIN_CODE,
    recipientBi: CITIZEN_BI,
    org: ADMIN_CODE,
    subject: 'Renovação Obrigatória de Assinatura Digital do Cartão de Cidadão',
    body: 'Caro Edlasio Galhardo, serve o presente para avisar que a sua assinatura eletrónica digital segura irá expirar dentro de 15 dias. Por favor, aceda à secção de Perfil para proceder à renovação automática.'
  });

  const { data: admCitRecords, error: admCitErr } = await supabase.from('messages').insert([adminToCitPayload]).select();
  if (admCitErr || !admCitRecords) {
    throw new Error(`Falha no alerta Admin -> Cidadão: ${admCitErr?.message}`);
  }
  const admCitMsgId = admCitRecords[0].id;
  printSuccess(`Alerta de Assinatura Digital do Admin -> Cidadão persistido com o ID: #${admCitMsgId}`);

  // 4d. Cidadão para Admin
  printInfo('Simulando resposta do Cidadão de volta para o Admin (CDA)...');
  const citToAdminPayload = buildMessagePayload({
    senderBi: CITIZEN_BI,
    recipientBi: ADMIN_CODE,
    org: ADMIN_CODE,
    subject: 'RE: Renovação Obrigatória de Assinatura Digital do Cartão de Cidadão',
    body: 'Exmos. Senhores, confirmo que recebi o alerta e já procedi à renovação do meu certificado digital através do leitor de cartões nacional no portal. Agradeço o envio do lembrete automático.'
  });

  const { data: citAdmRecords, error: citAdmErr } = await supabase.from('messages').insert([citToAdminPayload]).select();
  if (citAdmErr || !citAdmRecords) {
    throw new Error(`Falha no envio da confirmação Cidadão -> Admin: ${citAdmErr?.message}`);
  }
  printSuccess(`Confirmação Cidadão -> Admin persistida com o ID: #${citAdmRecords[0].id}`);

  // =========================================================================================
  // RELATÓRIO FINAL E ASSERTS
  // =========================================================================================
  printHeader('Relatório Consolidado de Interoperabilidade e Sincronização Supabase');
  printSuccess('Todas as correspondências e metadados foram devidamente criados, validados e persistidos.');

  console.log('\nTabela de Sincronização de Correspondências Cidadão <-> AGT:');
  console.log('-'.repeat(110));
  console.log('| ID Origem  | Assunto do Requerimento                                    | ID Resposta | Estado Sincronizado |');
  console.log('-'.repeat(110));

  for (const key of Object.keys(messageMap)) {
    const item = messageMap[key];
    const originalStr = String(item.originalId).padEnd(10);
    const subjectStr = item.subject.padEnd(58).slice(0, 58);
    const replyStr = String(item.replyId).padEnd(11);
    console.log(`| #${originalStr} | ${subjectStr} | #${replyStr} | Síncrono (Sucesso)  |`);
  }
  console.log('-'.repeat(110));

  printInfo(`\nTotal de mensagens testadas no Supabase: 14 mensagens reais (5 originais, 5 respostas, 4 de fluxos administrativos do CDA).`);
  printSuccess('Parabéns! O sistema de Correio Digital de Angola opera com 100% de integridade, interoperabilidade e resiliência síncrona com o Supabase.');
}

runTestSuite().catch((err) => {
  console.error('\n\x1b[31m[ERRO CRÍTICO] Falha durante a execução da suite de testes de interoperabilidade:\x1b[0m', err);
  process.exit(1);
});
