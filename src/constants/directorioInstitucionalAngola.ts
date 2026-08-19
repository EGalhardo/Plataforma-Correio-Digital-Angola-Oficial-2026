// ============================================================================
// Directório Institucional de Referência de Angola — Correio Digital Angola
// ----------------------------------------------------------------------------
// Fonte única do DIRECTÓRIO (papel INFORMATIVO, não de adesão).
//   • Cada instituição só troca correspondência quando se REGISTA formalmente
//     e obtém o seu código/ID (gate P0-B + RLS) — este directório estático NÃO
//     concede envio/recepção a ninguém.
//   • `referenciaDinamica: true` = listas mutáveis (bancos, seguradoras,
//     ministros) — actualização via fonte oficial (BNA / ARSEG / Executivo);
//     nunca são emissores, nunca têm nomes de titulares hardcoded.
//   • Províncias/municípios/comunas reutilizam MUNICIPALITIES_BY_PROVINCE —
//     NÃO duplicar aqui.
//   • Aditivo: não substitui `catalogoInstituicoes.ts` nem `institutionCatalog.ts`.
// ============================================================================

export type CategoriaDirectorio =
  | 'Presidencia' | 'Governo' | 'Justica' | 'Financas' | 'Bancos'
  | 'Seguros' | 'Economia' | 'EnergiaAgua' | 'PetroleoGas'
  | 'Telecomunicacoes' | 'Saude' | 'Educacao' | 'AgriculturaPescas'
  | 'Transportes' | 'ObrasPublicas' | 'Provincial' | 'ComunicacaoSocial';

export const CATEGORIAS_DIRECTORIO: { chave: CategoriaDirectorio; rotulo: string }[] = [
  { chave: 'Presidencia', rotulo: 'Presidência da República' },
  { chave: 'Governo', rotulo: 'Ministérios (Executivo)' },
  { chave: 'Justica', rotulo: 'Justiça, Registos e Notariado' },
  { chave: 'Financas', rotulo: 'Administração Tributária e Finanças' },
  { chave: 'Bancos', rotulo: 'Bancos e Sistema Financeiro' },
  { chave: 'Seguros', rotulo: 'Seguradoras e Regulação' },
  { chave: 'Economia', rotulo: 'Apoio às Empresas e Economia' },
  { chave: 'EnergiaAgua', rotulo: 'Energia e Águas' },
  { chave: 'PetroleoGas', rotulo: 'Petróleo, Gás e Mineração' },
  { chave: 'Telecomunicacoes', rotulo: 'Telecomunicações e Tecnologia' },
  { chave: 'Saude', rotulo: 'Saúde' },
  { chave: 'Educacao', rotulo: 'Educação' },
  { chave: 'AgriculturaPescas', rotulo: 'Agricultura e Pescas' },
  { chave: 'Transportes', rotulo: 'Transportes' },
  { chave: 'ObrasPublicas', rotulo: 'Obras Públicas, Urbanismo e Habitação' },
  { chave: 'Provincial', rotulo: 'Administração Provincial e Local' },
  { chave: 'ComunicacaoSocial', rotulo: 'Comunicação Social' },
];

export interface EntidadeDirectorio {
  id: string;
  categoria: CategoriaDirectorio;
  sigla: string;
  nome: string;
  /** Listas mutáveis (bancos, seguradoras, ministros) — nunca emissores. */
  referenciaDinamica: boolean;
  /** Serviços que o órgão presta (para a IA e para orientar o cidadão). */
  servicos?: string[];
  /** Contacto público oficial (ex.: site) — para a área de referência. */
  contactoPublico?: string;
  /** Fonte da informação. */
  fonte?: string;
  /** Sub-entidades (ex.: conservatórias, hospitais, repartições). */
  filhos?: EntidadeDirectorio[];
}

const justicaServicos = ['Certidões digitais', 'Marcação de atendimento', 'Aviso de documentos prontos', 'Consulta de processos'];
const ministerio = (sigla: string, nome: string): EntidadeDirectorio => ({
  id: sigla.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  categoria: 'Governo',
  sigla,
  nome,
  referenciaDinamica: true, // composição do Executivo muda — fonte oficial
  fonte: 'Executivo (Portal Oficial)',
});

export const DIRECTORIO_INSTITUCIONAL_ANGOLA: EntidadeDirectorio[] = [
  // ── PRESIDENCIA ──────────────────────────────────────────────────────────
  { id: 'presidencia-republica', categoria: 'Presidencia', sigla: 'PR', nome: 'Presidência da República', referenciaDinamica: true, fonte: 'Executivo (Portal Oficial)' },
  { id: 'vice-presidencia', categoria: 'Presidencia', sigla: 'VPR', nome: 'Vice-Presidência da República', referenciaDinamica: true, fonte: 'Executivo (Portal Oficial)' },
  { id: 'casa-civil', categoria: 'Presidencia', sigla: 'CC', nome: 'Casa Civil do Presidente da República', referenciaDinamica: true, fonte: 'Executivo (Portal Oficial)' },
  { id: 'casa-militar', categoria: 'Presidencia', sigla: 'CM', nome: 'Casa Militar do Presidente da República', referenciaDinamica: true, fonte: 'Executivo (Portal Oficial)' },
  { id: 'igai', categoria: 'Presidencia', sigla: 'IGAI', nome: 'Inspecção Geral da Administração do Estado', referenciaDinamica: true, servicos: ['Denúncias', 'Auditoria pública'], fonte: 'Executivo (Portal Oficial)' },
  { id: 'ministros-estado', categoria: 'Presidencia', sigla: 'ME', nome: 'Ministros de Estado (Coordenação Económica, Casa Civil, Casa Militar, Área Social)', referenciaDinamica: true, fonte: 'Executivo (Portal Oficial)' },

  // ── GOVERNO — 24 Ministérios ─────────────────────────────────────────────
  ministerio('MINDEF', 'Ministério da Defesa Nacional e Veteranos da Pátria'),
  ministerio('MININT', 'Ministério do Interior'),
  ministerio('MIREX', 'Ministério das Relações Exteriores'),
  ministerio('MAT', 'Ministério da Administração do Território'),
  ministerio('MINJUSDH', 'Ministério da Justiça e dos Direitos Humanos'),
  ministerio('MINFIN', 'Ministério das Finanças'),
  ministerio('MINPLAN', 'Ministério do Planeamento'),
  ministerio('MAPTSS', 'Ministério da Administração Pública, Trabalho e Segurança Social'),
  ministerio('MINAGRIF', 'Ministério da Agricultura e Florestas'),
  ministerio('MINPESCAS', 'Ministério das Pescas e Recursos Marinhos'),
  ministerio('MINDCOM', 'Ministério da Indústria e Comércio'),
  ministerio('MIREMPET', 'Ministério dos Recursos Minerais, Petróleo e Gás'),
  ministerio('MINTRANS', 'Ministério dos Transportes'),
  ministerio('MINEA', 'Ministério da Energia e Águas'),
  ministerio('MINTTICS', 'Ministério das Telecomunicações, Tecnologias de Informação e Comunicação Social'),
  ministerio('MINOTUR', 'Ministério do Turismo'),
  ministerio('MOPUH', 'Ministério das Obras Públicas, Urbanismo e Habitação'),
  ministerio('MESCTI', 'Ministério do Ensino Superior, Ciência, Tecnologia e Inovação'),
  ministerio('MED', 'Ministério da Educação'),
  ministerio('MINSA', 'Ministério da Saúde'),
  ministerio('MASFAMU', 'Ministério da Acção Social, Família e Promoção da Mulher'),
  ministerio('MINAMB', 'Ministério do Ambiente'),
  ministerio('MINJUD', 'Ministério da Juventude e Desportos'),
  ministerio('MINCULT', 'Ministério da Cultura'),

  // ── JUSTIÇA, REGISTOS E NOTARIADO (crítico para o CDA) ──────────────────
  { id: 'conservatoria-registo-civil', categoria: 'Justica', sigla: 'CRC', nome: 'Conservatórias do Registo Civil', referenciaDinamica: false, servicos: justicaServicos, fonte: 'Ministério da Justiça e dos Direitos Humanos' },
  { id: 'conservatoria-registo-predial', categoria: 'Justica', sigla: 'CRP', nome: 'Conservatórias do Registo Predial', referenciaDinamica: false, servicos: justicaServicos, fonte: 'Ministério da Justiça e dos Direitos Humanos' },
  { id: 'conservatoria-registo-comercial', categoria: 'Justica', sigla: 'CRCm', nome: 'Conservatórias do Registo Comercial', referenciaDinamica: false, servicos: justicaServicos, fonte: 'Ministério da Justiça e dos Direitos Humanos' },
  { id: 'conservatoria-registo-automovel', categoria: 'Justica', sigla: 'CRA', nome: 'Conservatórias do Registo Automóvel', referenciaDinamica: false, servicos: justicaServicos, fonte: 'Ministério da Justiça e dos Direitos Humanos' },
  { id: 'conservatoria-registos-centrais', categoria: 'Justica', sigla: 'CRCt', nome: 'Conservatórias dos Registos Centrais', referenciaDinamica: false, servicos: justicaServicos, fonte: 'Ministério da Justiça e dos Direitos Humanos' },
  { id: 'conservatoria-pessoas-colectivas', categoria: 'Justica', sigla: 'CRPC', nome: 'Conservatórias de Registo de Pessoas Colectivas', referenciaDinamica: false, servicos: justicaServicos, fonte: 'Ministério da Justiça e dos Direitos Humanos' },
  { id: 'cartorios-notariais', categoria: 'Justica', sigla: 'CN', nome: 'Cartórios Notariais', referenciaDinamica: false, servicos: ['Escrituras públicas', 'Procurações', 'Testamentos', 'Reconhecimento de assinaturas', 'Autenticação de documentos'], fonte: 'Ministério da Justiça e dos Direitos Humanos' },
  { id: 'tribunal-supremo', categoria: 'Justica', sigla: 'TS', nome: 'Tribunal Supremo', referenciaDinamica: false, servicos: ['Consulta processual', 'Notificações judiciais'], fonte: 'Tribunal Supremo' },
  { id: 'tribunais-relacao', categoria: 'Justica', sigla: 'TR', nome: 'Tribunais da Relação', referenciaDinamica: false, servicos: ['Consulta processual', 'Notificações judiciais'], fonte: 'Tribunal Supremo' },
  { id: 'tribunais-comarca', categoria: 'Justica', sigla: 'TCm', nome: 'Tribunais de Comarca', referenciaDinamica: false, servicos: ['Consulta processual', 'Notificações judiciais', 'Citações'], fonte: 'Tribunal Supremo' },
  { id: 'tribunal-constitucional', categoria: 'Justica', sigla: 'TC', nome: 'Tribunal Constitucional', referenciaDinamica: false, servicos: ['Consulta processual'], fonte: 'Tribunal Constitucional' },
  { id: 'tribunal-contas', categoria: 'Justica', sigla: 'TdC', nome: 'Tribunal de Contas', referenciaDinamica: false, servicos: ['Auditoria pública', 'Consulta processual'], fonte: 'Tribunal de Contas' },
  { id: 'procuradoria-geral', categoria: 'Justica', sigla: 'PGR', nome: 'Procuradoria-Geral da República', referenciaDinamica: false, servicos: ['Denúncias', 'Consulta processual'], fonte: 'Procuradoria-Geral da República' },
  { id: 'inej', categoria: 'Justica', sigla: 'INEJ', nome: 'Instituto Nacional de Estudos Judiciários', referenciaDinamica: false, servicos: ['Formação', 'Concursos'], fonte: 'Ministério da Justiça e dos Direitos Humanos' },
  { id: 'servicos-prisionais', categoria: 'Justica', sigla: 'SP', nome: 'Serviços Prisionais', referenciaDinamica: false, servicos: ['Visitas', 'Informações'], fonte: 'Ministério da Justiça e dos Direitos Humanos' },
  { id: 'provedoria-justica', categoria: 'Justica', sigla: 'PJ', nome: 'Provedoria de Justiça', referenciaDinamica: false, servicos: ['Denúncias', 'Queixas'], fonte: 'Provedoria de Justiça' },
  { id: 'ordem-advogados', categoria: 'Justica', sigla: 'OAA', nome: 'Ordem dos Advogados de Angola', referenciaDinamica: false, servicos: ['Certidões', 'Informações'], fonte: 'Ordem dos Advogados de Angola' },
  { id: 'identificacao-civil-criminal', categoria: 'Justica', sigla: 'ICCC', nome: 'Serviços de Identificação Civil e Criminal', referenciaDinamica: false, servicos: ['BI', 'Antecedentes criminais', 'Marcação'], fonte: 'Ministério do Interior' },
  { id: 'siac', categoria: 'Justica', sigla: 'SIAC', nome: 'SIAC — Serviço Integrado de Atendimento ao Cidadão', referenciaDinamica: false, servicos: ['Marcação de atendimento', 'Emissão de documentos', 'Informações'], fonte: 'Ministério da Justiça e dos Direitos Humanos' },

  // ── FINANÇAS / ADMINISTRAÇÃO TRIBUTÁRIA ─────────────────────────────────
  { id: 'agt', categoria: 'Financas', sigla: 'AGT', nome: 'Administração Geral Tributária', referenciaDinamica: false, servicos: ['Notificações fiscais', 'Declarações', 'Cobranças', 'Certidões', 'Multas'], fonte: 'AGT' },
  { id: 'reparticoes-fiscais', categoria: 'Financas', sigla: 'RF', nome: 'Repartições Fiscais', referenciaDinamica: false, servicos: ['Declarações', 'Pagamentos', 'Certidões'], fonte: 'AGT' },
  { id: 'servicos-aduaneiros', categoria: 'Financas', sigla: 'SA', nome: 'Serviços Aduaneiros', referenciaDinamica: false, servicos: ['Importação/Exportação', 'Notificações'], fonte: 'AGT' },
  { id: 'grandes-contribuintes', categoria: 'Financas', sigla: 'GC', nome: 'Serviços de Grandes Contribuintes', referenciaDinamica: false, servicos: ['Declarações', 'Notificações'], fonte: 'AGT' },
  { id: 'postos-fiscais', categoria: 'Financas', sigla: 'PF', nome: 'Postos Fiscais', referenciaDinamica: false, servicos: ['Informações', 'Pagamentos'], fonte: 'AGT' },

  // ── BANCOS (referência dinâmica — cadastro BNA) ─────────────────────────
  ...['BNA', 'BPC', 'BFA', 'BAI', 'BDA', 'Banco Sol', 'Millennium Atlântico', 'Caixa Geral Angola', 'BNI', 'Banco Comercial do Huambo', 'Banco Prestígio', 'Banco BIC', 'Standard Bank Angola', 'Banco Keve', 'Banco Yetu', 'Banco Económico', 'Banco de Crédito do Sul', 'Banco Valor'].map(nome => ({
    id: 'banco-' + nome.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    categoria: 'Bancos' as CategoriaDirectorio,
    sigla: nome,
    nome: (nome === 'BNA' ? 'Banco Nacional de Angola' : nome) + (nome === 'BNA' ? ' (autoridade monetária)' : ''),
    referenciaDinamica: true,
    servicos: nome === 'BNA' ? ['Regulação', 'Supervisão bancária', 'Informações'] : ['Extratos', 'Contratos', 'Avisos', 'Confirmação de operações'],
    fonte: 'Cadastro oficial do BNA',
  })),

  // ── SEGUROS (referência dinâmica — ARSEG) ───────────────────────────────
  { id: 'arseg', categoria: 'Seguros', sigla: 'ARSEG', nome: 'Agência Angolana de Regulação e Supervisão de Seguros', referenciaDinamica: true, servicos: ['Regulação', 'Supervisão', 'Reclamações'], fonte: 'ARSEG' },
  ...['ENSA', 'Nossa Seguros', 'Fidelidade Angola', 'Sanlam Angola', 'Saham Angola', 'Mundial Seguros', 'Liberty Seguros Angola'].map(nome => ({
    id: 'seguradora-' + nome.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    categoria: 'Seguros' as CategoriaDirectorio,
    sigla: nome,
    nome,
    referenciaDinamica: true,
    servicos: ['Apólices', 'Sinistros', 'Renovações', 'Reembolsos'],
    fonte: 'ARSEG (seguradoras autorizadas)',
  })),

  // ── ECONOMIA ────────────────────────────────────────────────────────────
  { id: 'inapem', categoria: 'Economia', sigla: 'INAPEM', nome: 'INAPEM — Instituto Nacional de Apoio as Micro, Pequenas e Médias Empresas', referenciaDinamica: false, servicos: ['Aprovação de candidaturas', 'Certificados digitais', 'Editais', 'Avisos', 'Formação online', 'Incubação'], fonte: 'INAPEM' },
  { id: 'iapi', categoria: 'Economia', sigla: 'IAPI', nome: 'IAPI — Instituto de Apoio à Produção', referenciaDinamica: false, servicos: ['Avisos', 'Editais', 'Licenciamento'], fonte: 'IAPI' },
  { id: 'aipex', categoria: 'Economia', sigla: 'AIPEX', nome: 'AIPEX — Agência de Investimento Privado e Promoção de Exportações', referenciaDinamica: false, servicos: ['Investimento', 'Exportações', 'Avisos'], fonte: 'AIPEX' },
  { id: 'bda', categoria: 'Economia', sigla: 'BDA', nome: 'Banco de Desenvolvimento de Angola', referenciaDinamica: false, servicos: ['Financiamento', 'Avisos'], fonte: 'BDA' },
  { id: 'facra', categoria: 'Economia', sigla: 'FACRA', nome: 'Fundo Activo de Capital de Risco Angolano', referenciaDinamica: false, servicos: ['Financiamento', 'Avisos'], fonte: 'FACRA' },
  { id: 'fundo-garantia-credito', categoria: 'Economia', sigla: 'FGC', nome: 'Fundo de Garantia de Crédito', referenciaDinamica: false, servicos: ['Garantias', 'Avisos'], fonte: 'FGC' },
  { id: 'ine', categoria: 'Economia', sigla: 'INE', nome: 'INE — Instituto Nacional de Estatística', referenciaDinamica: false, servicos: ['Inquéritos', 'Estatísticas', 'Avisos'], fonte: 'INE' },
  { id: 'cedesa', categoria: 'Economia', sigla: 'CEDESA', nome: 'CEDESA — Centro de Desenvolvimento de Empresas', referenciaDinamica: false, servicos: ['Formação', 'Apoio a empresas'], fonte: 'CEDESA' },

  // ── ENERGIA E ÁGUAS ─────────────────────────────────────────────────────
  { id: 'ende', categoria: 'EnergiaAgua', sigla: 'ENDE', nome: 'ENDE — Empresa Nacional de Distribuição de Eletricidade', referenciaDinamica: false, servicos: ['Faturas', 'Avisos de corte', 'Interrupções programadas', 'Religação', 'Reclamações'], fonte: 'ENDE' },
  { id: 'epal', categoria: 'EnergiaAgua', sigla: 'EPAL', nome: 'EPAL — Empresa Pública de Águas de Luanda', referenciaDinamica: false, servicos: ['Faturas', 'Aviso de corte', 'Reclamações', 'Pedido de ligação', 'Histórico de consumo'], fonte: 'EPAL' },
  { id: 'prodel', categoria: 'EnergiaAgua', sigla: 'PRODEL', nome: 'PRODEL — Produção de Eletricidade', referenciaDinamica: false, servicos: ['Avisos', 'Comunicação de geração'], fonte: 'PRODEL' },
  { id: 'rnt', categoria: 'EnergiaAgua', sigla: 'RNT', nome: 'RNT — Rede Nacional de Transporte de Eletricidade', referenciaDinamica: false, servicos: ['Avisos técnicos'], fonte: 'RNT' },
  { id: 'irsea', categoria: 'EnergiaAgua', sigla: 'IRSEA', nome: 'IRSEA — Instituto Regulador de Serviços de Electricidade e Águas', referenciaDinamica: false, servicos: ['Reclamações', 'Regulação', 'Avisos'], fonte: 'IRSEA' },
  { id: 'concessionarias-agua', categoria: 'EnergiaAgua', sigla: 'ÁGUA', nome: 'Empresas e concessionárias de água (provinciais)', referenciaDinamica: true, servicos: ['Faturas', 'Avisos', 'Reclamações'], fonte: 'MINEA' },
  { id: 'operadores-energia', categoria: 'EnergiaAgua', sigla: 'ENERGIA', nome: 'Empresas e operadores de energia/distribuição', referenciaDinamica: true, servicos: ['Faturas', 'Avisos', 'Reclamações'], fonte: 'MINEA' },

  // ── PETRÓLEO, GÁS E MINERAÇÃO ───────────────────────────────────────────
  { id: 'anpg', categoria: 'PetroleoGas', sigla: 'ANPG', nome: 'ANPG — Agência Nacional de Petróleo, Gás e Biocombustíveis', referenciaDinamica: false, servicos: ['Concessões', 'Avisos'], fonte: 'ANPG' },
  { id: 'sonangol', categoria: 'PetroleoGas', sigla: 'Sonangol', nome: 'Sonangol — Sociedade Nacional de Combustíveis', referenciaDinamica: false, servicos: ['Avisos', 'Compras', 'Comunicação'], fonte: 'Sonangol' },
  { id: 'sonangol-distribuidora', categoria: 'PetroleoGas', sigla: 'SD', nome: 'Sonangol Distribuidora', referenciaDinamica: false, servicos: ['Avisos', 'Combustíveis'], fonte: 'Sonangol' },
  { id: 'endiama', categoria: 'PetroleoGas', sigla: 'ENDIAMA', nome: 'ENDIAMA — Empresa Nacional de Diamantes', referenciaDinamica: false, servicos: ['Avisos', 'Comunicação'], fonte: 'ENDIAMA' },
  { id: 'ferrangol', categoria: 'PetroleoGas', sigla: 'Ferrangol', nome: 'Ferrangol — Empresa Nacional de Ferro', referenciaDinamica: false, servicos: ['Avisos'], fonte: 'Ferrangol' },
  { id: 'sodiam', categoria: 'PetroleoGas', sigla: 'SODIAM', nome: 'Sodiam — Comercialização de Diamantes', referenciaDinamica: false, servicos: ['Avisos'], fonte: 'SODIAM' },
  { id: 'irdp', categoria: 'PetroleoGas', sigla: 'IRDP', nome: 'Instituto Regulador dos Derivados de Petróleo', referenciaDinamica: false, servicos: ['Regulação', 'Avisos'], fonte: 'IRDP' },

  // ── TELECOMUNICAÇÕES E TECNOLOGIA ───────────────────────────────────────
  { id: 'inacom', categoria: 'Telecomunicacoes', sigla: 'INACOM', nome: 'INACOM — Instituto Angolano das Comunicações', referenciaDinamica: false, servicos: ['Regulação', 'Avisos', 'Reclamações'], fonte: 'INACOM' },
  { id: 'ima', categoria: 'Telecomunicacoes', sigla: 'IMA', nome: 'Instituto de Modernização Administrativa', referenciaDinamica: false, servicos: ['Infraestruturas digitais públicas', 'Avisos'], fonte: 'IMA' },
  { id: 'angola-cables', categoria: 'Telecomunicacoes', sigla: 'AC', nome: 'Angola Cables', referenciaDinamica: false, servicos: ['Conectividade', 'Avisos'], fonte: 'Angola Cables' },
  { id: 'unitel', categoria: 'Telecomunicacoes', sigla: 'UNITEL', nome: 'Unitel', referenciaDinamica: false, servicos: ['Faturas', 'Promoções', 'Reclamações'], fonte: 'Unitel' },
  { id: 'africell', categoria: 'Telecomunicacoes', sigla: 'AFRICELL', nome: 'Africell', referenciaDinamica: false, servicos: ['Faturas', 'Promoções', 'Reclamações'], fonte: 'Africell' },
  { id: 'movicel', categoria: 'Telecomunicacoes', sigla: 'MOVICEL', nome: 'Movicel', referenciaDinamica: false, servicos: ['Faturas', 'Promoções', 'Reclamações'], fonte: 'Movicel' },
  { id: 'tvcabo', categoria: 'Telecomunicacoes', sigla: 'TVCABO', nome: 'TVCabo', referenciaDinamica: false, servicos: ['Faturas', 'Reclamações'], fonte: 'TVCabo' },
  { id: 'correios-angola', categoria: 'Telecomunicacoes', sigla: 'CA', nome: 'Correios de Angola', referenciaDinamica: false, servicos: ['Encomendas', 'Avisos', 'Rastreio'], fonte: 'Correios de Angola' },

  // ── SAÚDE ───────────────────────────────────────────────────────────────
  { id: 'minsa-hospitais', categoria: 'Saude', sigla: 'HOSP', nome: 'Hospitais (nacionais, provinciais, gerais, especializados, pediátricos, maternidades)', referenciaDinamica: true, servicos: ['Marcação de consultas', 'Resultados de exames', 'Alta médica', 'Notificação de familiares'], fonte: 'MINSA' },
  { id: 'inema', categoria: 'Saude', sigla: 'INEMA', nome: 'INEMA — Instituto Nacional de Emergência Médica', referenciaDinamica: false, servicos: ['Emergências', 'Alertas'], fonte: 'INEMA' },
  { id: 'clinicas-publicas', categoria: 'Saude', sigla: 'CLIN', nome: 'Clínicas e centros médicos públicos', referenciaDinamica: true, servicos: ['Marcação', 'Resultados'], fonte: 'MINSA' },
  { id: 'farmacias-publicas', categoria: 'Saude', sigla: 'FARM', nome: 'Farmácias públicas', referenciaDinamica: true, servicos: ['Receitas digitais', 'Avisos'], fonte: 'MINSA' },

  // ── EDUCAÇÃO ────────────────────────────────────────────────────────────
  { id: 'escolas-publicas', categoria: 'Educacao', sigla: 'ESCOLA', nome: 'Escolas e colégios públicos (ensino geral)', referenciaDinamica: true, servicos: ['Matrículas', 'Pautas', 'Calendário', 'Avisos'], fonte: 'MED' },
  { id: 'institutos-medios', categoria: 'Educacao', sigla: 'IM', nome: 'Institutos médios e politécnicos', referenciaDinamica: true, servicos: ['Matrículas', 'Pautas', 'Avisos'], fonte: 'MED' },
  { id: 'universidades-publicas', categoria: 'Educacao', sigla: 'UNIV', nome: 'Universidades públicas e institutos superiores', referenciaDinamica: true, servicos: ['Matrículas', 'Propinas', 'Certificados', 'Diplomas', 'Pautas'], fonte: 'MESCTI' },
  { id: 'ensino-superior-privado', categoria: 'Educacao', sigla: 'ESP', nome: 'Instituições privadas de ensino superior', referenciaDinamica: true, servicos: ['Matrículas', 'Propinas', 'Certificados'], fonte: 'MESCTI' },

  // ── AGRICULTURA E PESCAS ────────────────────────────────────────────────
  { id: 'ida', categoria: 'AgriculturaPescas', sigla: 'IDA', nome: 'Instituto de Desenvolvimento Agrário', referenciaDinamica: false, servicos: ['Avisos', 'Editais', 'Formação'], fonte: 'MINAGRIF' },
  { id: 'fada', categoria: 'AgriculturaPescas', sigla: 'FADA', nome: 'Fundo de Apoio ao Desenvolvimento Agrário', referenciaDinamica: false, servicos: ['Financiamento', 'Avisos'], fonte: 'FADA' },
  { id: 'desenvolvimento-florestal', categoria: 'AgriculturaPescas', sigla: 'IDF', nome: 'Instituto de Desenvolvimento Florestal', referenciaDinamica: false, servicos: ['Licenciamento', 'Avisos'], fonte: 'MINAGRIF' },
  { id: 'investigacao-agronomica', categoria: 'AgriculturaPescas', sigla: 'IIA', nome: 'Instituto de Investigação Agronómica', referenciaDinamica: false, servicos: ['Investigação', 'Avisos'], fonte: 'MINAGRIF' },
  { id: 'instituto-pesca', categoria: 'AgriculturaPescas', sigla: 'IP', nome: 'Instituto de Pesca', referenciaDinamica: false, servicos: ['Licenciamento', 'Avisos'], fonte: 'MINPESCAS' },
  { id: 'servicos-veterinarios', categoria: 'AgriculturaPescas', sigla: 'VET', nome: 'Serviços veterinários', referenciaDinamica: true, servicos: ['Certificados', 'Avisos'], fonte: 'MINAGRIF' },

  // ── TRANSPORTES ─────────────────────────────────────────────────────────
  { id: 'antt', categoria: 'Transportes', sigla: 'ANTT', nome: 'ANTT — Agência Nacional de Transportes Terrestres', referenciaDinamica: false, servicos: ['Licenciamento', 'Avisos'], fonte: 'ANTT' },
  { id: 'amn', categoria: 'Transportes', sigla: 'AMN', nome: 'Agência Marítima Nacional', referenciaDinamica: false, servicos: ['Registo electrónico de navios', 'Certificação', 'Avisos'], fonte: 'AMN' },
  { id: 'portos-angola', categoria: 'Transportes', sigla: 'PORTOS', nome: 'Portos de Angola (Luanda, Lobito, Namibe, Soyo)', referenciaDinamica: true, servicos: ['Avisos', 'Operações portuárias'], fonte: 'Portos de Angola' },
  { id: 'caminhos-ferro', categoria: 'Transportes', sigla: 'CF', nome: 'Caminhos de Ferro (Luanda, Benguela, Moçâmedes)', referenciaDinamica: true, servicos: ['Avisos', 'Transporte de carga'], fonte: 'CFL/CFB/CFM' },
  { id: 'taag', categoria: 'Transportes', sigla: 'TAAG', nome: 'TAAG — Linhas Aéreas de Angola', referenciaDinamica: false, servicos: ['Bilhetes', 'Avisos', 'Reclamações'], fonte: 'TAAG' },
  { id: 'enna', categoria: 'Transportes', sigla: 'ENNA', nome: 'ENNA — Empresa Nacional de Navegação', referenciaDinamica: false, servicos: ['Avisos', 'Transporte marítimo'], fonte: 'ENNA' },
  { id: 'aeroportos-angola', categoria: 'Transportes', sigla: 'AERO', nome: 'Aeroportos de Angola / Instituto Nacional da Aviação Civil', referenciaDinamica: true, servicos: ['Avisos', 'Regulação'], fonte: 'INAC' },

  // ── OBRAS PÚBLICAS, URBANISMO E HABITAÇÃO ───────────────────────────────
  { id: 'inea', categoria: 'ObrasPublicas', sigla: 'INEA', nome: 'INEA — Instituto Nacional de Estradas de Angola', referenciaDinamica: false, servicos: ['Manutenção de estradas', 'Avisos'], fonte: 'INEA' },
  { id: 'institutos-urbanismo', categoria: 'ObrasPublicas', sigla: 'URB', nome: 'Institutos de urbanismo', referenciaDinamica: true, servicos: ['Licenciamento', 'Avisos'], fonte: 'MOPUH' },
  { id: 'institutos-habitacao', categoria: 'ObrasPublicas', sigla: 'HAB', nome: 'Institutos de habitação', referenciaDinamica: true, servicos: ['Habitação', 'Avisos'], fonte: 'MOPUH' },
  { id: 'empresas-construcao', categoria: 'ObrasPublicas', sigla: 'CONST', nome: 'Empresas públicas de construção', referenciaDinamica: true, servicos: ['Avisos', 'Obras'], fonte: 'MOPUH' },

  // ── PROVINCIAL (21 províncias — sem duplicar municípios, reutiliza institutionCatalog) ──
  ...['Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando', 'Cubango', 'Cuanza Norte', 'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla', 'Icolo e Bengo', 'Luanda', 'Lunda Norte', 'Lunda Sul', 'Malanje', 'Moxico', 'Moxico Leste', 'Namibe', 'Uíge', 'Zaire'].map(prov => ({
    id: 'provincia-' + prov.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-'),
    categoria: 'Provincial' as CategoriaDirectorio,
    sigla: prov,
    nome: `Governo Provincial de ${prov}`,
    referenciaDinamica: false,
    servicos: ['Editais', 'Licenciamento', 'Taxas', 'Avisos', 'Obras'],
    fonte: 'Administração Provincial — municípios/comunas em institutionCatalog.ts',
  })),

  // ── COMUNICAÇÃO SOCIAL ──────────────────────────────────────────────────
  { id: 'tpa', categoria: 'ComunicacaoSocial', sigla: 'TPA', nome: 'TPA — Televisão Pública de Angola', referenciaDinamica: false, servicos: ['Comunicação', 'Avisos'], fonte: 'TPA' },
  { id: 'rna', categoria: 'ComunicacaoSocial', sigla: 'RNA', nome: 'RNA — Rádio Nacional de Angola', referenciaDinamica: false, servicos: ['Comunicação', 'Avisos'], fonte: 'RNA' },
  { id: 'jornal-angola', categoria: 'ComunicacaoSocial', sigla: 'JA', nome: 'Jornal de Angola', referenciaDinamica: false, servicos: ['Comunicação', 'Avisos'], fonte: 'Jornal de Angola' },
];

// ============================================================================
// Funções auxiliares (usadas pela IA, registo e UI)
// ============================================================================

/** Devolve as entidades de uma categoria. */
export const porCategoria = (cat: CategoriaDirectorio): EntidadeDirectorio[] =>
  DIRECTORIO_INSTITUCIONAL_ANGOLA.filter(e => e.categoria === cat);

/** Pesquisa no directório por texto (nome, sigla, serviços). */
export const pesquisarDirectorio = (q: string): EntidadeDirectorio[] => {
  const termo = q.trim().toLowerCase();
  if (!termo) return [];
  return DIRECTORIO_INSTITUCIONAL_ANGOLA.filter(e =>
    e.nome.toLowerCase().includes(termo) ||
    e.sigla.toLowerCase().includes(termo) ||
    (e.servicos || []).some(s => s.toLowerCase().includes(termo))
  );
};

/** Resumo compacto por categoria para o contexto da IA (evita estouro de tokens). */
export const directorioParaContextoIA = (): string => {
  const porCat = new Map<CategoriaDirectorio, string[]>();
  for (const e of DIRECTORIO_INSTITUCIONAL_ANGOLA) {
    if (e.referenciaDinamica) continue; // listas mutáveis fora do contexto fixo
    const atual = porCat.get(e.categoria) || [];
    atual.push(`${e.nome} (${e.sigla})`);
    porCat.set(e.categoria, atual);
  }
  const linhas: string[] = [];
  for (const c of CATEGORIAS_DIRECTORIO) {
    const itens = porCat.get(c.chave) || [];
    if (itens.length === 0) continue;
    linhas.push(`- ${c.rotulo}: ${itens.slice(0, 12).join('; ')}${itens.length > 12 ? '; …' : ''}`);
  }
  return linhas.join('\n');
};

/** Nomes/siglas de entidades para sugestão no registo (autocompletar). */
export const sugestoesDirectorio = (texto: string, max = 8): { sigla: string; nome: string; categoria: CategoriaDirectorio }[] =>
  pesquisarDirectorio(texto)
    .slice(0, max)
    .map(e => ({ sigla: e.sigla, nome: e.nome, categoria: e.categoria }));
