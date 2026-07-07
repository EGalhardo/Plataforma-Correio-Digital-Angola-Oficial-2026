import { Message, Document, DigitalProtocol, CorrespondenceStateEvent } from '../types';

export interface CategoryMetadata {
  name: string;
  icon: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  colorClass: string;
  accentColor: string;
  flow: string[];
}

export const CATEGORY_MAP: Record<string, CategoryMetadata> = {
  'Notificação': {
    name: 'Notificação',
    icon: 'Bell',
    priority: 'Alta',
    colorClass: 'bg-indigo-55 border-indigo-200 text-indigo-800',
    accentColor: 'indigo',
    flow: ['Emissão Oficial', 'Notificação por SMS/Portal', 'Confirmação do Utente', 'Efeito Legal Concluído']
  },
  'Ofício': {
    name: 'Ofício',
    icon: 'Scroll',
    priority: 'Média',
    colorClass: 'bg-slate-100 border-slate-300 text-slate-800',
    accentColor: 'slate',
    flow: ['Elaboração', 'Selo Administrativo', 'Expedição Física/Digital', 'Tratamento de Ofício']
  },
  'Multa': {
    name: 'Multa',
    icon: 'ShieldAlert',
    priority: 'Alta',
    colorClass: 'bg-rose-100 border-rose-300 text-rose-800',
    accentColor: 'rose',
    flow: ['Constatação de Infração', 'Verificação Criptográfica', 'Notificação de Utente', 'Prazo de Reclamação / Pagamento']
  },
  'Fatura': {
    name: 'Fatura',
    icon: 'Receipt',
    priority: 'Média',
    colorClass: 'bg-amber-100 border-amber-300 text-amber-850',
    accentColor: 'amber',
    flow: ['Leitura de Consumo', 'Processamento de Fatura', 'Geração de Referência', 'Reconciliação e Baixa']
  },
  'Convocatória': {
    name: 'Convocatória',
    icon: 'Megaphone',
    priority: 'Alta',
    colorClass: 'bg-purple-100 border-purple-300 text-purple-800',
    accentColor: 'purple',
    flow: ['Escalonamento', 'Envio do Mandato', 'Confirmação de Retorno', 'Audiência Agendada']
  },
  'Processo Administrativo': {
    name: 'Processo Administrativo',
    icon: 'FolderOpen',
    priority: 'Média',
    colorClass: 'bg-cyan-100 border-cyan-300 text-cyan-800',
    accentColor: 'cyan',
    flow: ['Abertura de Auto', 'Instrução do Processo', 'Feedback Legal', 'Homologação e Conclusão']
  },
  'Documento Bancário': {
    name: 'Documento Bancário',
    icon: 'Landmark',
    priority: 'Média',
    colorClass: 'bg-emerald-100 border-emerald-300 text-emerald-800',
    accentColor: 'emerald',
    flow: ['Geração de Transação', 'Validação Digital de Lote', 'Compensação de Valores', 'Custódia de Extrato']
  },
  'Declaração': {
    name: 'Declaração',
    icon: 'CheckSquare',
    priority: 'Média',
    colorClass: 'bg-teal-100 border-teal-300 text-teal-800',
    accentColor: 'teal',
    flow: ['Submissão de Pedido', 'Validação Legal', 'Geração Certificada', 'Arquivo PDF Terminado']
  },
  'Licença': {
    name: 'Licença',
    icon: 'Key',
    priority: 'Alta',
    colorClass: 'bg-lime-100 border-lime-350 text-lime-900',
    accentColor: 'lime',
    flow: ['Abertura de Requisitos', 'Vistoria e Parecer', 'Aprovação de Alvará', 'Retirada da Licença']
  },
  'Certificado': {
    name: 'Certificado',
    icon: 'Award',
    priority: 'Média',
    colorClass: 'bg-orange-100 border-orange-300 text-orange-850',
    accentColor: 'orange',
    flow: ['Abertura de Protocolo', 'Assinatura do Responsável', 'Selo Digital Nacional', 'Distribuição Portável']
  },
  'Petição do Cidadão': {
    name: 'Petição do Cidadão',
    icon: 'User',
    priority: 'Média',
    colorClass: 'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-800',
    accentColor: 'fuchsia',
    flow: ['Apresentação por Utente', 'Triagem de Orgão', 'Análise Fundamentada', 'Feedback / Deferimento']
  },
  'Documento Fiscal': {
    name: 'Documento Fiscal',
    icon: 'Coins',
    priority: 'Alta',
    colorClass: 'bg-pink-100 border-pink-300 text-pink-850',
    accentColor: 'pink',
    flow: ['Imposto Declarado', 'Cálculo de Guia IPU/IVA', 'Auditoria Fiscal Eletrónica', 'Quitação e Liquidação']
  },
  'Documento Judicial': {
    name: 'Documento Judicial',
    icon: 'Scale',
    priority: 'Alta',
    colorClass: 'bg-zinc-200 border-zinc-350 text-zinc-900',
    accentColor: 'zinc',
    flow: ['Distribuição Forense', 'Decisão em Despacho', 'Diligência de Oficial', 'Citação do Réu']
  }
};

export function getCategoryMetadata(categoryName: string): CategoryMetadata {
  return CATEGORY_MAP[categoryName] || {
    name: categoryName,
    icon: 'Scroll',
    priority: 'Média',
    colorClass: 'bg-slate-100 border-slate-350 text-slate-800',
    accentColor: 'slate',
    flow: ['Emissão', 'Processamento', 'Validação', 'Conclusão']
  };
}

// Lists of authentic-looking names for responsible issuers
const RESPONSIBLE_NAMES = [
  'Dr. Edmilson de Carvalho',
  'Dra. Maria Antónia Bento',
  'Eng. Carlos Adriano Lopes',
  'Dra. Josefa Gouveia Neto',
  'Dr. Mateus Francisco Dongala',
  'Dr. Manuel da Silva Ramos',
  'Eng. Amilcar de Sousa Costa',
  'Dra. Isabel Catarina Lemos',
];

// Angolan province short codes
const PROVINCES = ['LDA', 'LUA', 'CAB', 'BIE', 'HUA', 'LNO', 'LSU', 'BGO', 'HUI', 'ZAI'];

function createSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickBySeed<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function generateDeterministicSHA256Hash(seedInput: string): string {
  const chars = '0123456789abcdef';
  let seed = createSeed(seedInput);
  let hash = '0x';
  for (let i = 0; i < 40; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    hash += chars[seed % chars.length];
  }
  return hash;
}

export function generateProtocol(
  org: string,
  type: 'message' | 'document',
  customId?: number | string,
  subject?: string
): DigitalProtocol {
  const idValue = customId || 100000;
  const seedInput = `${org}|${type}|${String(idValue)}|${subject || ''}`;
  const seed = createSeed(seedInput);
  const internalId = `INT-${type.toUpperCase()}-2026-${idValue}`;
  
  // Clean org to uppercase acronym
  const cleanOrg = org.replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 5) || 'GOV';
  
  // Deterministic province and sequence for stable archive/protocol references
  const province = pickBySeed(PROVINCES, seed);
  const sequenceStr = String(10000 + (seed % 90000)).padStart(5, '0');
  const year = '2026';
  
  // Stable protocol number pattern
  let protocolNumber = '';
  const patternBucket = seed % 3;
  if (patternBucket === 0) {
    protocolNumber = `${cleanOrg}-${year}-${province}-00${sequenceStr}`;
  } else if (patternBucket === 1) {
    const prefix = cleanOrg === 'HOSPI' ? 'MINSA' : cleanOrg;
    protocolNumber = `${prefix}-${year}-${province}-${sequenceStr}`;
  } else {
    protocolNumber = `${cleanOrg}-${province}-${year}-${sequenceStr}`;
  }

  // Set institution and default docType
  let institution = org;
  let docType = type === 'message' ? 'Correspondência Governamental' : 'Documento Oficial';
  
  const orgUpper = org.toUpperCase();
  const subjLower = (subject || '').toLowerCase();
  
  if (orgUpper.includes('AGT')) {
    institution = 'Administração Geral Tributária (AGT)';
    docType = subjLower.includes('auditoria') ? 'Notificação de Auditoria' : 'Documento de Liquidação';
  } else if (orgUpper.includes('SME')) {
    institution = 'Serviço de Migração e Estrangeiros (SME)';
    docType = 'Guia de Levantamento Recíproco';
  } else if (orgUpper.includes('ENDE')) {
    institution = 'Empresa Nacional de Distribuição de Electricidade (ENDE)';
    docType = 'Aviso de Intervenção Técnica';
  } else if (orgUpper.includes('EPAL')) {
    institution = 'Empresa Pública de Águas de Luanda (EPAL)';
    docType = 'Fatura de Saneamento Digital';
  } else if (orgUpper.includes('TRIBUNAL')) {
    institution = 'Tribunal Municipal e Provincial de Luanda';
    docType = 'Mandato de Notificação Digital';
  } else if (orgUpper.includes('HOSPITAL') || orgUpper.includes('MINSA')) {
    institution = 'Ministério da Saúde - Hospital Central';
    docType = 'Boletim Clínico Integral';
  } else if (orgUpper.includes('CIVIL') || orgUpper.includes('REGISTO')) {
    institution = 'Conservatória do Registo Civil';
    docType = 'Certidão Narrativa Registrada';
  } else if (orgUpper.includes('GOVERNO')) {
    institution = 'Secretaria Geral do Governo da Província';
    docType = 'Decreto Administrativo Digital';
  }

  // Classify under the 13 required official categories
  let category = 'Ofício';
  
  if (subjLower.includes('judicial') || subjLower.includes('tribunal') || subjLower.includes('mandato') || subjLower.includes('custodia') || orgUpper.includes('TRIBUNAL')) {
    category = 'Documento Judicial';
  } else if (subjLower.includes('multa') || subjLower.includes('infração') || subjLower.includes('coima') || subjLower.includes('aviso de corte') || subjLower.includes('regulamento de infração')) {
    category = 'Multa';
  } else if (subjLower.includes('fatura') || subjLower.includes('tarifário') || subjLower.includes('consumo') || subjLower.includes('energia') || subjLower.includes('água') || subjLower.includes('manutencao') || subjLower.includes('interrupção')) {
    category = 'Fatura';
  } else if (subjLower.includes('auditoria') || subjLower.includes('divergência') || subjLower.includes('imposto') || subjLower.includes('fiscal') || subjLower.includes('nif') || subjLower.includes('tributária') || orgUpper.includes('AGT')) {
    category = 'Documento Fiscal';
  } else if (subjLower.includes('comprovativo') || subjLower.includes('recibo') || subjLower.includes('pagamento') || subjLower.includes('bancário') || subjLower.includes('subvenção') || subjLower.includes('banco') || subjLower.includes('financeira')) {
    category = 'Documento Bancário';
  } else if (subjLower.includes('convocatória') || subjLower.includes('consulta') || subjLower.includes('agendamento') || subjLower.includes('reagendar') || subjLower.includes('vagas')) {
    category = 'Convocatória';
  } else if (subjLower.includes('visto de residência') || subjLower.includes('alvará') || subjLower.includes('licença') || subjLower.includes('autorização')) {
    category = 'Licença';
  } else if (subjLower.includes('declaração') || subjLower.includes('atestado') || subjLower.includes('não devedor')) {
    category = 'Declaração';
  } else if (subjLower.includes('certificado') || subjLower.includes('bi digital') || subjLower.includes('bilhete') || subjLower.includes('passaporte') || subjLower.includes('conducao') || subjLower.includes('vacinal')) {
    category = 'Certificado';
  } else if (subjLower.includes('petição') || subjLower.includes('reclamação') || subjLower.includes('esclarecimento') || subjLower.includes('suporte') || subjLower.includes('feedback')) {
    category = 'Petição do Cidadão';
  } else if (subjLower.includes('processamento') || subjLower.includes('solicitação') || subjLower.includes('renovação') || subjLower.includes('levantamento') || subjLower.includes('dados')) {
    category = 'Processo Administrativo';
  } else if (subjLower.includes('notificacao') || subjLower.includes('alerta') || subjLower.includes('aviso')) {
    category = 'Notificação';
  } else {
    category = 'Ofício';
  }

  // Set the automatic priority!
  const meta = CATEGORY_MAP[category] || { priority: 'Média' };
  let priority = meta.priority;

  // Overrule priority if subject specifies higher importance
  if (subjLower.includes('urgente') || subjLower.includes('crítico')) {
    priority = 'Alta';
  }

  const randMin = String(10 + (seed % 50)).padStart(2, '0');
  const hourNum = 8 + (seed % 8);
  const hour = `${String(hourNum).padStart(2, '0')}:${randMin}`;
  
  // Official issue date and time
  const officialIssueDate = '2026-05-21';
  const officialTime = `${hour} UTC`;
  const issuerResponsible = pickBySeed(RESPONSIBLE_NAMES, seed);
  const currentState = 'Assinado & Autenticado';
  const deadlineDate = '30 de Junho de 2026';
  
  // Realistic signature
  const digitalSignature = generateDeterministicSHA256Hash(seedInput);
  const documentHash = `SHA256-${digitalSignature.substring(2).toUpperCase()}`;
  const digitalSeal = `SELO-DIGIT-AO-${cleanOrg}-#${sequenceStr}`;
  const institutionalCertificate = `AC-GOV-AO-${cleanOrg}-QUALIFIED-v3`;
  const signatureDate = `2026-05-21 às ${hour} UTC`;
  const legalValidity = 'Plena validade probatória e jurídica regulada pelo Decreto Presidencial n.º 202/21';
  const archiveReference = `ARQ-${cleanOrg}-${province}-${year}-${sequenceStr}`;
  const archiveLocation = `Arquivo Institucional > ${institution} > ${province} > Série ${type === 'message' ? 'Correspondência' : 'Documento'} > ${archiveReference}`;
  
  const qrPayload = [
    `AO-PROTOCOL:${protocolNumber}`,
    `ID:${internalId}`,
    `SEAL:${digitalSeal}`,
    `HASH:${documentHash}`,
    `CERT:${institutionalCertificate}`,
    `ARCHIVE:${archiveReference}`,
    `LOCATION:${archiveLocation}`,
    `VALID:SIM`
  ].join('|');
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrPayload)}&color=0f172a`;

  return {
    internalId,
    protocolNumber,
    issuerInstitution: institution,
    officialIssueDate,
    officialTime,
    issuerResponsible,
    category,
    documentType: docType,
    currentState,
    priority,
    deadlineDate,
    qrCodeUrl,
    digitalSignature,
    digitalSeal,
    documentHash,
    institutionalCertificate,
    signatureDate,
    legalValidity,
    archiveReference,
    archiveLocation
  };
}

export function generateTimelineEvents(msg: Message, protocol: DigitalProtocol): CorrespondenceStateEvent[] {
  // Use deterministic date relative to when this app was established (May 2026)
  const dateStr = (dayOffset: number) => `2026-05-${String(20 + dayOffset).padStart(2, '0')}`;
  const responsible = protocol.issuerResponsible || 'Eng. Amilcar de Sousa Costa';

  const idMod = msg.id % 6;
  const subj = (msg.details?.subject || msg.preview).toLowerCase();

  const history: CorrespondenceStateEvent[] = [];

  // 1. Recebida is always the first event
  history.push({
    state: 'Recebida',
    date: dateStr(0),
    time: '08:00 UTC',
    responsible: 'Operador de Entrada Principal',
    description: `Correspondência recebida e filtrada sob o lote geral de triagem nº ${Math.floor(Math.random() * 8000 + 1000)}.`
  });

  // 2. Entregue is always the second event
  history.push({
    state: 'Entregue',
    date: dateStr(0),
    time: '08:15 UTC',
    responsible: 'Prisma Core Mailer',
    description: `Entregue eletronicamente com sucesso aos servidores locais da instituição: ${protocol.issuerInstitution}.`
  });

  // 3. Visualizada is almost always there (except if unread is high)
  if (msg.unread === undefined || msg.unread === 0 || idMod !== 0) {
    history.push({
      state: 'Visualizada',
      date: dateStr(0),
      time: '10:30 UTC',
      responsible: 'Assessor de Direção',
      description: 'Correspondência oficial aberta e visualizada nativamente através do portal criptográfico de segurança.'
    });
  }

  // 4. Em análise
  if (subj.includes('auditoria') || subj.includes('pendente') || idMod === 1 || idMod === 3) {
    history.push({
      state: 'Em análise',
      date: dateStr(1),
      time: '14:00 UTC',
      responsible: 'Gabinete Técnico-Jurídico',
      description: 'Ficheiros de manifesto e anexos sob auditoria de conformidade para triagem e revisão formal.'
    });
  }

  // 5. Contestada or Expirada or Rejeitada or Encaminhada or Aprovada or Confirmada or Respondida or Arquivada
  if (subj.includes('pendente') || idMod === 1) {
    history.push({
      state: 'Contestada',
      date: dateStr(2),
      time: '11:00 UTC',
      responsible: responsible,
      description: 'O utente abriu uma contestação formal referente aos montantes preliminares calculados de multas atrasadas.'
    });
  } else if (subj.includes('tarifario') || idMod === 2) {
    history.push({
      state: 'Expirada',
      date: dateStr(2),
      time: '00:00 UTC',
      responsible: 'Serviço Central de Validade',
      description: 'O prazo prescricional para impugnação administrativa do novo tarifário expirou na data oficial limite.'
    });
    history.push({
      state: 'Arquivada',
      date: dateStr(2),
      time: '16:00 UTC',
      responsible: 'Gabinete de Arquivos Digitais',
      description: 'Arquivado permanentemente sob assinatura digital forte com o protocolo de conformidade arquivística.'
    });
  } else if (subj.includes('manutencao') || idMod === 3) {
    history.push({
      state: 'Encaminhada',
      date: dateStr(0),
      time: '13:00 UTC',
      responsible: 'Supervisão Operacional de Redes',
      description: 'Mensagem encaminhada para os departamentos de engenharia municipal e equipas de terreno.'
    });
  } else if (subj.includes('consulta') || idMod === 4) {
    history.push({
      state: 'Confirmada',
      date: dateStr(1),
      time: '09:00 UTC',
      responsible: 'Receção Central de Triagem',
      description: 'Marcação de consulta médica confirmada nas escalas dinâmicas de atendimento especializado.'
    });
    history.push({
      state: 'Respondida',
      date: dateStr(1),
      time: '10:15 UTC',
      responsible: 'Secretariado Executivo Hospitalar',
      description: 'Resposta enviada de forma célere anexando as instruções formais para preparação prévia de atendimento.'
    });
  } else if (subj.includes('levantamento') || idMod === 5) {
    history.push({
      state: 'Aprovada',
      date: dateStr(1),
      time: '08:45 UTC',
      responsible: 'Director SME Executivo',
      description: 'Pedido de levantamento aprovado sob verificação biométrica e aprovação de identificação nacional.'
    });
  } else {
    // Default fallback chains
    history.push({
      state: 'Aprovada',
      date: dateStr(1),
      time: '15:20 UTC',
      responsible: responsible,
      description: 'Assinatura oficial registada e correspondência assinada com certificado digital qualificado.'
    });
  }

  // Inject a 'Rejeitada' scenario for specific messages to demonstrate full coverage
  if (msg.id === 7) {
    history.push({
      state: 'Rejeitada',
      date: dateStr(2),
      time: '17:30 UTC',
      responsible: 'Inspeção Regular Geral',
      description: 'Reclamação indeferida / rejeitada por falta de comprovativos e anexos obrigatórios em formato legal.'
    });
  }

  return history;
}

export function generateInitialAuditLogs(msg: Message): string[] {
  const org = msg.org || 'GOV';
  const baseHour = (msg.id * 3) % 12 + 8; // Deterministic based on message id
  const formatTime = (hour: number, minute: number) => {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  const logs = [
    `${formatTime(baseHour, 15)} - Documento criado`,
    `${formatTime(baseHour, 17)} - Assinado pela ${org}`,
    `${formatTime(baseHour, 20)} - Entregue ao cidadão`
  ];

  if (msg.unread === undefined || msg.unread === 0) {
    logs.push(`${formatTime(baseHour, 30)} - Documento visualizado`);
  }

  return logs;
}

export function getMessageSensitivity(msg: Message): 'Público' | 'Privado' | 'Sensível' | 'Restrito' | 'Ultra Restrito' {
  if (msg.sensitivity) return msg.sensitivity;
  const subj = (msg.details?.subject || msg.preview || '').toLowerCase();
  
  if (subj.includes('judicial') || subj.includes('custódia') || subj.includes('custodia') || msg.id === 5 || msg.id === 15) {
    return 'Ultra Restrito';
  }
  if (subj.includes('auditoria') || subj.includes('divergência') || subj.includes('divergencia') || subj.includes('visto') || msg.id === 7 || msg.id === 18 || msg.id === 22) {
    return 'Restrito';
  }
  if (subj.includes('pagamento') || subj.includes('fatura') || subj.includes('clínico') || subj.includes('clinico') || subj.includes('resultado') || msg.id === 1 || msg.id === 6 || msg.id === 3 || msg.id === 14 || msg.id === 24) {
    return 'Sensível';
  }
  if (subj.includes('bilhete') || subj.includes('bi') || subj.includes('passaporte') || subj.includes('cadastro') || subj.includes('dados') || msg.id === 2 || msg.id === 11 || msg.id === 13 || msg.id === 21) {
    return 'Privado';
  }
  return 'Público';
}

export function getMessagePriority(msg: Message): 'Normal' | 'Importante' | 'Urgente' | 'Crítico' {
  if (msg.priorityScale) return msg.priorityScale;
  const subj = (msg.details?.subject || msg.preview || '').toLowerCase();

  if (subj.includes('execução') || subj.includes('oficial') || subj.includes('judicial') || msg.id === 5 || msg.id === 22) {
    return 'Crítico';
  }
  if (subj.includes('divergência') || subj.includes('auditoria') || subj.includes('pagamento') || msg.id === 1 || msg.id === 7 || msg.id === 18) {
    return 'Urgente'; // Will have 48 hours deadline, perfect!
  }
  if (subj.includes('bilhete') || subj.includes('bi') || subj.includes('resultado') || msg.id === 2 || msg.id === 14) {
    return 'Importante';
  }
  return 'Normal';
}

export function getMessageDeadlineHours(msg: Message, priority: 'Normal' | 'Importante' | 'Urgente' | 'Crítico'): number {
  if (msg.deadlineHoursRemaining !== undefined) return msg.deadlineHoursRemaining;
  if (priority === 'Crítico') return 24;
  if (priority === 'Urgente') return 48; // EXACTLY 48 hours!
  if (priority === 'Importante') return 72;
  return 120; // Normal is 5 days (120 hours)
}


// Function to guarantee every item in a list has a valid protocol and stateHistory
export function ensureProtocolOnMessage(msg: Message): Message {
  const protocol = msg.protocol && msg.protocol.protocolNumber 
    ? msg.protocol 
    : generateProtocol(
        msg.org || 'GOV', 
        'message', 
        msg.id, 
        msg.details?.subject || msg.preview
      );

  const stateHistory = msg.stateHistory && msg.stateHistory.length > 0
    ? msg.stateHistory
    : generateTimelineEvents(msg, protocol);

  const auditLogs = msg.auditLogs && msg.auditLogs.length > 0
    ? msg.auditLogs
    : generateInitialAuditLogs(msg);

  const sensitivity = getMessageSensitivity(msg);
  const priorityScale = getMessagePriority(msg);
  const deadlineHoursRemaining = getMessageDeadlineHours(msg, priorityScale);

  // Guarantee that details and details.body are fully populated with formal written content
  let details = msg.details;
  const subj = msg.preview || 'Comunicação Oficial';
  const orgName = msg.org || 'Governo de Angola';

  if (!details) {
    details = {
      subject: subj,
      body: `Prezado(a) cidadão(ã),\n\nInformamos que foi registada uma nova movimentação oficial associada à sua identidade digital através do barramento integrado do Correio Digital Angola.\n\nEsta comunicação refere-se ao assunto: "${subj}" expedida por ${orgName}.\n\nOs serviços públicos integrados de telecomunicações e tecnologias digitais continuam a reforçar a proximidade dos cidadãos aos órgãos e instituições do Estado angolano com toda a segurança, autenticidade e validade legal garantida por lei.\n\nCaso necessite de apresentar contestação ou solicitar mais esclarecimentos, utilize os botões de resposta formal ou fale diretamente com o nosso assistente inteligente de voz e texto.\n\nAtenciosamente,\nSecretaria-Geral dos Serviços Públicos`,
      state: "Autorizado & Entregue",
      actions: ["Ver detalhes", "Confirmar Recepção"]
    };
  } else {
    let body = details.body;
    if (!body || body.trim() === '') {
      body = `Prezado(a) cidadão(ã),\n\nInformamos que foi registada uma nova movimentação oficial associada à sua identidade digital através do barramento integrado do Correio Digital Angola.\n\nEsta comunicação refere-se ao assunto: "${details.subject || subj}" expedida por ${orgName}.\n\nOs serviços públicos integrados de telecomunicações e tecnologias digitais continuam a reforçar a proximidade dos cidadãos aos órgãos e instituições do Estado angolano com toda a segurança, autenticidade e validade legal garantida por lei.\n\nCaso necessite de apresentar contestação ou solicitar mais esclarecimentos, utilize os botões de resposta formal ou fale diretamente com o nosso assistente inteligente de voz e texto.\n\nAtenciosamente,\nSecretaria-Geral dos Serviços Públicos`;
    }
    let subject = details.subject;
    if (!subject || subject.trim() === '') {
      subject = subj;
    }
    details = {
      ...details,
      subject,
      body
    };
  }

  return {
    ...msg,
    details,
    protocol,
    stateHistory,
    auditLogs,
    sensitivity,
    priorityScale,
    deadlineHoursRemaining
  };
}

export function ensureProtocolOnDocument(doc: Document): Document {
  if (doc.protocol && doc.protocol.protocolNumber) {
    return doc;
  }
  return {
    ...doc,
    protocol: generateProtocol(doc.issuer || 'GOV', 'document', doc.code, doc.name)
  };
}
