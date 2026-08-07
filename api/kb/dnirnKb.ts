// ============================================================================
// KB DNIRN (Identificação Civil e Criminal) — Etapa A / vaga-2 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono, de páginas oficiais:
//  - Portal do Governo/SIAC (https://www.siac.gv.ao/pt/dnirn e
//    https://siac.gov.ao/servico/identificacao-civil/)
//  - SEPE (prazo do registo criminal)
// consultados em 2026-08-05. Requisitos transcritos tal como publicados.
// ============================================================================

import type { KbInstituicaoLocal } from './registoKb';

export const KB_DNIRN: KbInstituicaoLocal = {
  sigla: 'DNIRN',
  nome: 'Direcção Nacional de Identificação, Registos e Notário (Identificação Civil)',
  fontes: [
    {
      id: 'dnirn-bi-primeira-renovacao',
      titulo: 'Bilhete de Identidade — 1.ª via e renovação',
      tipo: 'procedimento',
      texto: [
        'QUEM PODE PEDIR A 1.ª VIA: todo o cidadão com idade a partir dos 6 anos. DOCUMENTOS (portal do SIAC): assento de nascimento (original e cópia); se o registo foi feito depois de Março de 2021, não é precisa certidão — basta o boletim de nascimento com o NUC (Número Único do Cidadão, adquirido no acto do registo); cópia do bilhete dos pais, dentro do prazo de validade; comprovativo do pagamento da taxa-emolumento. Quem tem o bilhete ANTIGO (amarelo) apresenta-o acompanhado do assento de nascimento.',
        'RENOVAÇÃO (bilhete fora do prazo de validade): Bilhete de Identidade original + assento de nascimento + comprovativo do pagamento da taxa-emolumento. NOTA: se o BI estiver dentro da validade mas estragado, o serviço correcto é a SUBSTITUIÇÃO, não a renovação.',
        'Os emolumentos são normalmente cobrados com comprovativo emitido pelo BPC nos balcões do próprio SIAC. Requisitos completos em siac.gov.ao, serviço «Identificação Civil».',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://siac.gov.ao/servico/identificacao-civil/',
    },
    {
      id: 'dnirn-bi-segunda-substituicao',
      titulo: 'Bilhete de Identidade — 2.ª via, substituição, averbamento e levantamento por outrem',
      tipo: 'procedimento',
      texto: [
        'SEGUNDA VIA (perda, extravio, roubo): assento de nascimento; bilhete antigo (amarelo), se existir; PARTICIPAÇÃO DA POLÍCIA (obrigatória em caso de extravio); comprovativo do pagamento da taxa-emolumento.',
        'SUBSTITUIÇÃO (bilhete estragado ou em mau estado de conservação): Bilhete de Identidade original + assento de nascimento + comprovativo do emolumento.',
        'AVERBAMENTO (mudança de estado civil etc.): Bilhete de Identidade original ou cópia (se for o BI actual), dentro do prazo; assento de nascimento; assento de casamento, de divórcio ou de óbito do cônjuge, conforme o caso; comprovativo do emolumento.',
        'LEVANTAMENTO DO BILHETE POR OUTRA PESSOA: só a mãe, o pai, um irmão maior de 18 anos ou o cônjuge (com o estado civil averbado no bilhete); no acto de levantamento apresenta-se o Bilhete de Identidade original de quem levanta e o recibo do processo.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.siac.gv.ao/pt/dnirn',
    },
    {
      id: 'dnirn-registo-criminal',
      titulo: 'Certificado de Registo Criminal — requisitos e prazo',
      tipo: 'procedimento',
      texto: [
        'O Certificado de Registo Criminal certifica a situação de identificação criminal do cidadão. PRAZO DE EXECUÇÃO: 72 horas a partir da data de entrada do processo no SIAC (segundo o catálogo de serviços do SEPE).',
        'REQUISITOS: Bilhete de Identidade original, dentro do prazo de validade; NIF actualizado; presença do requerente; comprovativo do pagamento da taxa-emolumento (emitido pelo BPC - SIAC). NOTA: se não tiver o bilhete ou a cópia, o serviço pode ser tratado com o número do bilhete.',
        'ESTRANGEIROS: passaporte com visto dentro do prazo de validade (original e cópia) ou cartão de residente (original e cópia); documento que comprove a filiação do requerente; NIF actualizado.',
        'AUSÊNCIA DO REQUERENTE: procuração — para estrangeiros, procuração original passada pelo cartório notarial do país de origem — e Bilhete de Identidade do requerente e do seu representante legal.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.sepe.gov.ao/ao/catalogo/mais-servicos/direito-e-legislacao/pedido-de-certificado-de-registo-criminal/',
    },
  ],
};
