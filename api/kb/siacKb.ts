// ============================================================================
// KB SIAC — Etapa A / vaga-2 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono:
//  - Portal do SIAC (https://siac.gov.ao / https://www.siac.gv.ao)
//  - Ministério da Administração Pública, Trabalho e Segurança Social,
//    «Serviços disponíveis no SIAC», 26-09-2024 (maptss.gov.ao)
// ============================================================================

import type { KbInstituicaoLocal } from './registoKb';

export const KB_SIAC: KbInstituicaoLocal = {
  sigla: 'SIAC',
  nome: 'Serviço Integrado de Atendimento ao Cidadão',
  fontes: [
    {
      id: 'siac-como-funciona',
      titulo: 'O que é o SIAC e como funciona o atendimento',
      tipo: 'faq',
      texto: [
        'Q: O que é o SIAC? R: O Serviço Integrado de Atendimento ao Cidadão — espaços que concentram cerca de 90 serviços públicos de 12 organismos no mesmo local, para o cidadão tratar de vários documentos numa só deslocação (portal siac.gov.ao e siac.gv.ao).',
        'Q: Como sou atendido? R: Ao chegar, tire uma SENHA e verifique junto do orientador de fluxo se a sua documentação está completa; para a área do Registo Civil existe antes uma triagem. O tempo de espera programado para o atendimento é de cerca de 5 minutos (segundo o MAPTSS, Setembro de 2024).',
        'Q: Onde encontro os documentos exigidos por cada serviço? R: No portal www.siac.gov.ao, por organismo/serviço (por exemplo Identificação Civil, Conservatória do Registo Civil, Trânsito/DTSER, SME, INSS, AGT). Os emolumentos costumam ser pagos com comprovativo emitido pelo BPC nos balcões do próprio SIAC.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.maptss.gov.ao/2024/09/26/servicos-disponiveis-no-siac/',
    },
    {
      id: 'siac-servicos-lista',
      titulo: 'Que serviços se tratam no SIAC (por organismo)',
      tipo: 'faq',
      texto: [
        'No mesmo espaço do SIAC o cidadão pode tratar, entre outros (MAPTSS, Set/2024):',
        'IDENTIFICAÇÃO E REGISTOS: registo civil, Bilhete de Identidade, certificado de registo criminal, actos notariais, certificado de admissibilidade de firma, registo de imóvel;',
        'TRÂNSITO: carta de condução (nova, renovação, duplicado), atribuição de matrícula, Título Único de Veículo;',
        'FISCALIDADE E EMPRESA: cartão de contribuinte e pagamento de impostos (AGT), obtenção de alvará comercial, registo geral de empresas;',
        'SEGURANÇA SOCIAL E TRABALHO: pensão de reforma, subsídio de maternidade (INSS), cadastramento nos centros de emprego;',
        'EXTERIOR: autenticação de documentos do Ministério das Relações Exteriores (ICAESC); serviços do SME (migração); área bancária e empresarial.',
        'Antes de se deslocar, confirmar os requisitos do serviço pretendido no portal siac.gov.ao — cada organismo tem a sua página de requisitos.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://siac.gov.ao/',
    },
  ],
};
