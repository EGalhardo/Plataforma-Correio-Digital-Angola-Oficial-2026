// ============================================================================
// KB DTSER (Trânsito e Segurança Rodoviária) — Etapa A / vaga-2 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono, das páginas de serviços
// do portal do Governo/SIAC:
//  - https://www.siac.gv.ao/pt/dtser
//  - https://siac.gov.ao/servico/dtser-transito-e-seguranca-rodoviaria/
// consultados em 2026-08-05.
// ============================================================================

import type { KbInstituicaoLocal } from './registoKb';

export const KB_DTSER: KbInstituicaoLocal = {
  sigla: 'DTSER',
  nome: 'Direcção de Trânsito e Segurança Rodoviária',
  fontes: [
    {
      id: 'dtser-carta-conducao',
      titulo: 'Carta de condução — renovação, duplicado, mudança de residência e troca de carta estrangeira',
      tipo: 'procedimento',
      texto: [
        'ELEMENTO COMUM: os serviços da carta de condução exigem o cadastro de conta STAC (Sistema Tecnológico de Apoio ao Cidadão), criado antecipadamente.',
        'RENOVAÇÃO DA CARTA: conta STAC; atestado médico para condutores (modelo 2, Imprensa Nacional); fotocópia do Bilhete de Identidade; carta de condução original e fotocópia; se estrangeiro, fotocópia do passaporte com visto de trabalho actualizado ou do cartão de estrangeiro residente.',
        'DUPLICADO (segunda via): conta STAC; fotocópia do B.I.; cópia da carta de condução (SADEC).',
        'MUDANÇA DE RESIDÊNCIA NA CARTA: conta STAC; atestado de residência; carta de condução original; fotocópia do B.I.',
        'TROCA DE CARTA DE CONDUÇÃO ESTRANGEIRA: conta STAC; carta de condução estrangeira original e fotocópia; fotocópia do passaporte com visto de trabalho actualizado ou do cartão de estrangeiro; certidão de autenticidade da carta de condução; registo criminal.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.siac.gv.ao/pt/dtser',
    },
    {
      id: 'dtser-veiculo-matricula-tuv',
      titulo: 'Registo de veículo — matrícula, Título Único de Veículo (TUV) e duplicado do livrete',
      tipo: 'procedimento',
      texto: [
        'REGISTO E ATRIBUIÇÃO DE MATRÍCULA DE VEÍCULO: comprovativo do pagamento da taxa-emolumento (emitido pelo BPC - SIAC); formulário Modelo «O»; nota de desalfandegamento; sinopse; documento único; certificado de embarque (emitido pelo Conselho Nacional de Carregadores de Angola); factura de compra e venda do veículo (comercial/invoice).',
        'TUV — TÍTULO ÚNICO DE VEÍCULO: emitido para livretes extraviados e para alteração de características do veículo (serviços anunciados no portal do SIAC).',
        'DUPLICADO DO LIVRETE (para livretes com data de emissão anterior a seis meses): fotocópia do livrete; fotocópia do B.I.; fotocópia do título do registo de propriedade (caso o tenha — se não, dirigir-se primeiro à Conservatória de Propriedade Automóvel para se informar).',
        'Detalhes por serviço em siac.gov.ao, serviço «Trânsito e Segurança Rodoviária (DTSER)».',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://siac.gov.ao/servico/dtser-transito-e-seguranca-rodoviaria/',
    },
  ],
};
