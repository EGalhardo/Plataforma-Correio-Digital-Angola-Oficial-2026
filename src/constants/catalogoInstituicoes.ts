// ============================================================================
// Catálogo de Instituições e Serviços — Fase 1 / S7
// Conteúdo-fonte: documento "PARTE I — UTILIZADORES E SERVIÇOS" aprovado pelo
// dono em 2026-08-05 (22 entidades). NÃO é uma lista de instituições ligadas
// à plataforma: é o CATÁLOGO previsto, exposto no compositor para orientar o
// tipo de correspondência. códigos oficiais só ficam ativos quando a
// instituição formaliza o registo (gate P0-B verifica sempre no envio).
// Pagamentos constam apenas como tipo de correspondência (gateway fora de
// âmbito na Fase 1, por decisão do dono).
// ============================================================================

export interface EntidadeCatalogo {
  sigla: string;
  nome: string;
  /** Código institucional conhecido (demonstração nos mocks oficiais); null = por atribuir. */
  codigoSugerido: string | null;
  /** Existe como demonstração navegável nos mocks oficiais da plataforma. */
  emDemonstracao: boolean;
  servicos: string[];
}

export const CATALOGO_INSTITUICOES: EntidadeCatalogo[] = [
  { sigla: 'INAPEM', nome: 'INAPEM — Instituto Nacional de Apoio as Micro, Pequenas e Médias Empresas.', codigoSugerido: 'INAPEM-001', emDemonstracao: true,
    servicos: ['Aprovação de candidaturas', 'Convites para programas', 'Certificados digitais', 'Editais', 'Avisos', 'Renovação de licenças', 'Formação online', 'Convites para eventos', 'Incubação de startups', 'Comunicação consultores-empresas'] },
  { sigla: 'MINSA', nome: 'Ministério da Saúde', codigoSugerido: null, emDemonstracao: false,
    servicos: ['Marcação de consultas', 'Resultados de exames', 'Receitas médicas digitais', 'Lembretes de vacinação', 'Avisos de campanhas', 'Alertas epidemiológicos', 'Relatórios e estatísticas', 'Notificação de surtos', 'Inventário de medicamentos', 'Transferência de doentes'] },
  { sigla: 'HOSP', nome: 'Hospitais', codigoSugerido: null, emDemonstracao: false,
    servicos: ['Consulta de processos', 'Alta médica', 'Marcação de cirurgia', 'Gestão de filas', 'Notificação de familiares', 'Envio de exames', 'Teleconsulta', 'Histórico do paciente'] },
  { sigla: 'EPAL', nome: 'EPAL — Empresa Pública de Águas de Luanda', codigoSugerido: 'EPAL-001', emDemonstracao: true,
    servicos: ['Faturas digitais', 'Aviso de corte', 'Aviso de manutenção', 'Reclamações', 'Pedido de ligação', 'Comunicação de fuga de água', 'Histórico de consumo', 'Pagamentos'] },
  { sigla: 'ENDE', nome: 'ENDE — Empresa Nacional de Distribuição de Eletricidade', codigoSugerido: 'ENDE-002', emDemonstracao: true,
    servicos: ['Faturas', 'Avisos', 'Interrupções programadas', 'Cortes', 'Religação', 'Pedidos técnicos', 'Reclamações', 'Histórico de consumo'] },
  { sigla: 'CONS', nome: 'Conservatórias', codigoSugerido: null, emDemonstracao: false,
    servicos: ['Certidões digitais autenticadas', 'Marcação de atendimento', 'Aviso de documentos prontos', 'Renovação', 'Pagamentos', 'Consulta de processos'] },
  { sigla: 'TRIB', nome: 'Tribunais', codigoSugerido: null, emDemonstracao: false,
    servicos: ['Citações', 'Notificações judiciais', 'Agendamento', 'Consulta processual', 'Pagamento de custas', 'Histórico processual'] },
  { sigla: 'PN', nome: 'Polícia Nacional', codigoSugerido: null, emDemonstracao: false,
    servicos: ['Convocações', 'Notificações', 'Perda de documentos', 'Avisos', 'Denúncias', 'Agendamento'] },
  { sigla: 'SME', nome: 'SME — Serviço de Migração e Estrangeiros', codigoSugerido: null, emDemonstracao: false,
    servicos: ['Renovação de vistos', 'Aviso de documentos prontos', 'Marcação', 'Estado do processo', 'Pagamentos', 'Notificações'] },
  { sigla: 'AGT', nome: 'AGT — Administração Geral Tributária', codigoSugerido: 'AGT-001', emDemonstracao: true,
    servicos: ['Notificações fiscais', 'Declarações', 'Cobranças', 'Certidões', 'Multas', 'Pagamentos'] },
  { sigla: 'INSS', nome: 'INSS — Segurança Social', codigoSugerido: null, emDemonstracao: false,
    servicos: ['Contribuições', 'Pensões', 'Subsídios', 'Declarações', 'Atualizações cadastrais'] },
  { sigla: 'INE', nome: 'INE — Instituto Nacional de Estatística', codigoSugerido: null, emDemonstracao: false,
    servicos: ['Convites para inquéritos', 'Questionários digitais', 'Estatísticas', 'Divulgação de resultados'] },
  { sigla: 'ENSINO', nome: 'Instituições de Ensino (Universidades, Institutos e Escolas)', codigoSugerido: null, emDemonstracao: false,
    servicos: ['Matrículas', 'Propinas', 'Certificados', 'Diplomas digitais', 'Calendário', 'Pautas', 'Avisos institucionais'] },
  { sigla: 'BANCOS', nome: 'Bancos', codigoSugerido: null, emDemonstracao: false,
    servicos: ['Extratos', 'Contratos', 'Aprovação de crédito', 'Avisos', 'Atualização cadastral', 'Confirmação de operações'] },
  { sigla: 'SEGUROS', nome: 'Seguradoras', codigoSugerido: null, emDemonstracao: false,
    servicos: ['Apólices', 'Sinistros', 'Renovações', 'Pagamentos', 'Reembolsos'] },
  { sigla: 'TELECOM', nome: 'Operadoras de Telecomunicações (Africell, Unitel, Movicel)', codigoSugerido: null, emDemonstracao: false,
    servicos: ['Faturas', 'Promoções', 'Reclamações', 'Mudança de tarifário', 'Portabilidade', 'Renovação de contratos'] },
  { sigla: 'PRIVADAS', nome: 'Empresas Privadas', codigoSugerido: null, emDemonstracao: false,
    servicos: ['Contratos', 'Recursos humanos', 'Recibos de salário', 'Comunicação interna', 'Atendimento ao cliente', 'Reclamações', 'Marketing autorizado'] },
  { sigla: 'MUNIC', nome: 'Municípios e Governos Provinciais', codigoSugerido: null, emDemonstracao: false,
    servicos: ['Editais', 'Licenciamento', 'Taxas', 'Obras', 'Concursos públicos', 'Participação cidadã', 'Orçamento participativo'] },
  { sigla: 'BOMB', nome: 'Bombeiros e Proteção Civil', codigoSugerido: null, emDemonstracao: false,
    servicos: ['Alertas', 'Evacuações', 'Gestão de catástrofes', 'Campanhas preventivas', 'Coordenação em emergências'] },
  { sigla: 'SNE', nome: 'Sistema Nacional de Emergência', codigoSugerido: null, emDemonstracao: false,
    servicos: ['Botão SOS', 'Localização GPS', 'Notificação automática aos contactos de emergência', 'Comunicação simultânea Polícia/Bombeiros/INEMA', 'Envio de fotografias e vídeos', 'Histórico de incidentes'] },
  { sigla: 'DISTRIB', nome: 'Empresas de Distribuição', codigoSugerido: null, emDemonstracao: false,
    servicos: ['Rastreio', 'Gestão de entregas', 'Confirmação digital', 'Assinatura eletrónica', 'Prova de entrega'] },
  { sigla: 'ONG', nome: 'Igrejas, ONGs e Associações', codigoSugerido: null, emDemonstracao: false,
    servicos: ['Convocatórias', 'Eventos', 'Donativos', 'Comunicação com membros', 'Gestão documental'] },
];

export const TOTAL_ENTIDADES_CATALOGO = 22;
