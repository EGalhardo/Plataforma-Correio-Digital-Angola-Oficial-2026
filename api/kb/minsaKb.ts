// ============================================================================
// KB MINSA — Etapa A / vaga-2 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono:
//  - Portal oficial do Certificado Digital de Vacinação (vacina.gov.ao)
//  - Directório de ministérios do SEPE (contactos do MINSA)
// consultados em 2026-08-05. Conteúdo deliberadamente limitado ao que tem
// fonte — a assistente orientará o cidadão para a unidade sanitária nos
// temas clínicos (não há lista pública única de documentos por hospital).
// ============================================================================

import type { KbInstituicaoLocal } from './registoKb';

export const KB_MINSA: KbInstituicaoLocal = {
  sigla: 'MINSA',
  nome: 'Ministério da Saúde',
  fontes: [
    {
      id: 'minsa-certificado-vacinacao',
      titulo: 'Certificado Digital de Vacinação — como obter no portal oficial',
      tipo: 'procedimento',
      texto: [
        'O Certificado Digital de Vacinação é obtido no portal oficial vacina.gov.ao: abrir a página do «Certificado Digital» e inserir o N.º do documento de identificação OU o Código Individual de vacinação atribuído quando se vacinou.',
        'DIVERGÊNCIAS: se os dados da vacina não coincidirem com os do cartão de vacinas, o próprio portal indica que se envie uma cópia do cartão.',
        'LINHAS DE ATENDIMENTO publicadas no portal: 930 795 019 e 948 477 028. Para TRANSCRIÇÃO DE VACINA administrada no estrangeiro: 930 795 019 (serviço só para utentes vacinados no estrangeiro).',
        'A vacinação de crianças e adultos é registada no cartão de vacinação; o cartão do MINSA acompanha o calendário nacional (por exemplo BCG, poliomielite, DTP, sarampo e febre amarela, além de doses para grávidas e mulheres em idade fértil).',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.vacina.gov.ao/certificado.aspx',
    },
    {
      id: 'minsa-contactos-orientacao',
      titulo: 'Contactos do MINSA e onde tratar documentos de saúde (perguntas frequentes)',
      tipo: 'faq',
      texto: [
        'Q: Onde fica o Ministério da Saúde? R: Rua 17 de Setembro, Luanda; telefone +244 222 338 052; site www.minsa.gov.ao (dados do directório de ministérios do SEPE).',
        'Q: Onde trato atestados médicos, junta médica ou declarações clínicas? R: Esses actos tramitam-se na unidade sanitária (hospital ou centro de saúde) onde o cidadão é assistido; os requisitos variam consoante a unidade — confirmar no próprio estabelecimento. Para atestado de condutor (carta de condução), o modelo usado é o «modelo 2» da Imprensa Nacional.',
        'Q: O atendimento nos hospitais públicos requer documentos? R: Levar sempre um documento de identificação (Bilhete de Identidade) e, quando existir, o cartão/boletim de vacinação ou boletim sanitário da unidade onde é seguido.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.sepe.gov.ao/ao/gov/sepe/ministerios/detalhe/20/',
    },
  ],
};
