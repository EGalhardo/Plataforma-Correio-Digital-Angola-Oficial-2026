// ============================================================================
// KB SME — Etapa A / E2-E3 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono, de fontes oficiais:
//  - Portal do SME (https://www.sme.gov.ao e https://sme.minint.ao)
//  - Catálogo SME no portal do Governo (https://siac.gov.ao/servico/sme-migracao-e-estrangeiros/)
// consultados em 2026-08-05. Requisitos transcritos/resumidos tal como publicados.
// ============================================================================

import type { KbInstituicaoLocal } from './registoKb';

export const KB_SME: KbInstituicaoLocal = {
  sigla: 'SME',
  nome: 'Serviço de Migração e Estrangeiros',
  fontes: [
    {
      id: 'sme-passaporte-requisitos',
      titulo: 'Passaporte — requisitos (normal, diplomático, segunda via e alteração de dados)',
      tipo: 'procedimento',
      texto: [
        'PASSAPORTE NORMAL: fotocópia a cores do Bilhete de Identidade (acompanhada do original), dentro do prazo de validade; três fotografias tipo passe, coloridas, recentes, com fundo branco; formulário devidamente preenchido com assinatura legível, disponível no portal da SME; comprovativo do pagamento da taxa-emolumento. Se o requerente reside no exterior, o comprovativo de residência no estrangeiro pode suprir a ausência do atestado de residência; se não exerce actividade remunerada, apresenta declaração de desemprego passada pela administração municipal.',
        'PASSAPORTE DIPLOMÁTICO: despacho de nomeação e/ou Diário da República ou termo de posse; fotografia tipo passe actualizada com fundo branco; comprovativo do pagamento da taxa-emolumento. PASSAPORTE DE SERVIÇO: via específica, com elementos-base indicados no portal da SME (cópia do BI no prazo de validade, três fotografias tipo passe coloridas com fundo branco).',
        'SEGUNDA VIA: fotocópia a cores do passaporte anterior (1.ª, 2.ª e última página) — em falta, a cópia do BI; norma dirigida ao SME em que o requerente se compromete a devolver o passaporte caso venha a encontrá-lo; comprovativo do pagamento da taxa-emolumento.',
        'ALTERAÇÃO DE DADOS (fisionomia ou estado civil): comprovativo da mudança a efectuar (BI com fisionomia ou estado civil actualizado, ou declaração de serviço); formulário do portal da SME preenchido; comprovativo do pagamento da taxa-emolumento.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://siac.gov.ao/servico/sme-migracao-e-estrangeiros/',
    },
    {
      id: 'sme-vistos-requisitos',
      titulo: 'Vistos de entrada em Angola — requisitos por tipo',
      tipo: 'procedimento',
      texto: [
        'ELEMENTOS COMUNS: formulário preenchido (obtido gratuitamente no portal da SME); fotografias tipo passe 4x5 cm, coloridas, recentes, fundo branco; passaporte válido e reconhecido pelas autoridades angolanas; comprovativo do pagamento do acto migratório.',
        'VISTO DE TURISMO: 2 fotografias; certificado internacional de vacinas; comprovativo de meios de subsistência nos termos da lei; declaração de compromisso de respeitar as leis da República de Angola.',
        'VISTO DE TRÂNSITO: 3 fotografias; comprovativo de ser titular de visto de entrada (ou isenção) no país de destino; bilhete de passagem para o país de destino; certificado internacional de vacinas.',
        'VISTO DE CURTA DURAÇÃO: 2 fotografias; bilhete de passagem para a República de Angola com retorno; certificado internacional de vacinas; comprovativo de meios de subsistência; documento comprovativo dos objectivos da entrada.',
        'VISTO DE TRABALHO: contrato de trabalho ou contrato-promessa de trabalho; certificado de habilitações literárias e profissionais autenticado e traduzido para português; curriculum vitae traduzido; certificado de registo criminal do país de origem ou residência habitual, traduzido e reconhecido; atestado médico do país de origem traduzido em português e devidamente reconhecido; parecer do Ministério da Administração Pública, Emprego e Segurança Social (instituições/empresas públicas) ou do órgão de tutela da actividade (instituições e empresas privadas).',
        'VISTO DE ESTUDO: certificado de registo criminal do país de origem ou residência habitual, traduzido e devidamente reconhecido; atestado médico do país de origem traduzido em português e reconhecido; comprovativo de meios de subsistência; entre outros, comprovativo da matrícula em estabelecimento de ensino devidamente reconhecido.',
        'As listas completas, por tipo de visto, estão em www.sme.gov.ao, secção Serviços > «Requisitos dos Actos Migratórios».',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.sme.gov.ao/estrangeiros/',
    },
    {
      id: 'sme-visto-online',
      titulo: 'Pedido de visto online — instruções oficiais (perguntas frequentes)',
      tipo: 'faq',
      texto: [
        'Q: Posso pedir o visto de entrada pela internet? R: Sim, através do portal da SME. Antes de iniciar o pedido, assegurar: 1) passaporte com validade mínima de UM ANO e pelo menos QUATRO páginas em branco; 2) fotografia recente com fundo branco, adequada a uso oficial; 3) todos os documentos originais de apoio exigidos para o tipo de visto pretendido.',
        'Q: Como envio os documentos? R: Os documentos são carregados no portal em imagens digitalizadas de boa qualidade, no formato .jpg/.jpeg, respeitando as dimensões mínimas/máximas e o tamanho máximo de ficheiro indicados nas instruções do portal (por exemplo, foto de cara com mínimo 496 px de altura e ficheiros até 200 KB).',
        'Q: O pedido online dispensa a ida ao consulado? R: NÃO. Mesmo aprovado o pedido pela internet, é obrigatório levar os documentos originais ao consulado para recolha de dados biométricos e entrevista, para fins de verificação.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://sme.minint.ao/ao/servicos/vistos/instrucoes/',
    },
  ],
};
