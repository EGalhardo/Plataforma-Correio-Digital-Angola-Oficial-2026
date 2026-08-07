// ============================================================================
// KB Conservatória do Registo Civil — Etapa A / vaga-2 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono, da página oficial de
// serviços do Registo Civil no portal do Governo/SIAC:
//  https://siac.gov.ao/servico/registo-civil/ (consultado em 2026-08-05)
// ============================================================================

import type { KbInstituicaoLocal } from './registoKb';

export const KB_REGCIVIL: KbInstituicaoLocal = {
  sigla: 'REGCIVIL',
  nome: 'Conservatória do Registo Civil',
  fontes: [
    {
      id: 'regcivil-nascimento-obito',
      titulo: 'Registo de nascimento e registo de óbito — documentos necessários',
      tipo: 'procedimento',
      texto: [
        'REGISTO DE NASCIMENTO (e passagem de boletim): presença dos progenitores, caso não sejam casados ou tenham documentos não averbados (se tiverem, apresentam o assento de casamento); Bilhete de Identidade, cédula pessoal ou certidão de nascimento dos pais, dentro do prazo de validade; cartão da maternidade, se houver; passaporte dos pais (se estrangeiros), dentro do prazo de validade; comprovativo do pagamento da taxa-emolumento.',
        'REGISTO DE ÓBITO: Bilhete de Identidade, cédula pessoal ou certidão de nascimento do falecido (original e cópia); certificado de óbito passado pelo médico (original e cópia); documento de identificação do declarante (Bilhete de Identidade, cédula pessoal ou carta de condução — original e cópia, dentro do prazo); comprovativo do pagamento da taxa-emolumento. Também existe via com boletim de óbito + comprovativo do emolumento.',
        'NOTA NUC: para registos feitos depois de Março de 2021, o boletim com o NUC (Número Único do Cidadão) substitui a certidão na emissão do Bilhete de Identidade.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://siac.gov.ao/servico/registo-civil/',
    },
    {
      id: 'regcivil-certidoes-actos',
      titulo: 'Certidões, filiação e actos especiais do Registo Civil',
      tipo: 'procedimento',
      texto: [
        'FILIAÇÃO (acrescentar filiação a um registo): Bilhete de Identidade (original), dentro do prazo de validade; cédula pessoal, boletim ou certidão de nascimento da pessoa que se quer filiar; se for adulta, necessita do consentimento da mesma; comprovativo do emolumento.',
        'ACTOS ESPECIAIS (por exemplo divórcio, rectificação ou averbamento de assento): requerimento com assinatura reconhecida por NOTÁRIO; conforme o acto, acrescentam-se peças como certidão de casamento, certidão de nascimento dos cônjuges, certidão de cópia integral, certidão passada pelo tribunal (divórcio com filhos menores), atestado de residência e Bilhete de Identidade (original e fotocópia, dentro do prazo).',
        'NATURALIZAÇÃO: requerimento com assinatura reconhecida por notário; certidão de nascimento; declaração emitida pelo Governo provincial; cartão de estrangeiro residente; fotocópia do passaporte dentro do prazo; todos os documentos em língua estrangeira devem estar traduzidos para português.',
        'Onde tratar: conservatórias, lojas dos registos e balcões do SIAC; requisitos por acto em siac.gov.ao, serviço «Conservatória do Registo Civil».',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://siac.gov.ao/servico/registo-civil/',
    },
  ],
};
