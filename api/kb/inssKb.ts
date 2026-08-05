// ============================================================================
// KB INSS — Etapa A / E2-E3 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono, de fontes oficiais:
//  - INSS Virtual (https://virtual.inss.gov.ao)
//  - «Estou Inscrito?» (https://estouinscrito.inss.gov.ao)
//  - Catálogo INSS no portal do Governo/SIAC (https://www.siac.gv.ao/pt/inss)
// consultados em 2026-08-05. As condições de acesso à reforma seguem a regra
// geral da legislação da segurança social (60 anos + 180 meses de
// contribuições, ou 420 meses/35 anos de descontos ininterruptos).
// ============================================================================

import type { KbInstituicaoLocal } from './registoKb';

export const KB_INSS: KbInstituicaoLocal = {
  sigla: 'INSS',
  nome: 'Instituto Nacional de Segurança Social',
  fontes: [
    {
      id: 'inss-virtual-servicos',
      titulo: 'INSS Virtual — serviços electrónicos disponíveis',
      tipo: 'procedimento',
      texto: [
        'O INSS Virtual (virtual.inss.gov.ao) concentra num único ambiente os serviços digitais do Instituto Nacional de Segurança Social.',
        'ENTIDADES EMPREGADORAS (contribuintes): inscrever os seus trabalhadores, gerar as folhas de remunerações, imprimir cartões, consultar a situação contributiva e receber as notificações enviadas pelo INSS.',
        'SEGURADOS E PENSIONISTAS: emitir extractos de contribuições e de pagamentos.',
        'VERIFICAÇÃO DE INSCRIÇÃO sem login: serviço «Estou Inscrito?» (estouinscrito.inss.gov.ao) — com o número do Bilhete de Identidade, o cidadão confirma se já está inscrito na segurança social e, se estiver, pode imprimir o cartão de segurado.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://virtual.inss.gov.ao/',
    },
    {
      id: 'inss-pensao-reforma',
      titulo: 'Pensão de reforma por velhice — condições e documentos',
      tipo: 'procedimento',
      texto: [
        'CONDIÇÕES DE ACESSO (regra geral da legislação da segurança social): 60 anos de idade e pelo menos 180 meses (15 anos) de contribuições no INSS; ou, independentemente da idade, 420 meses (35 anos) de descontos ininterruptos.',
        'DOCUMENTOS (balcões do INSS e do SIAC): 1) Bilhete de Identidade original do segurado; 2) certificado de tempo de serviço emitido pelo(s) empregador(es); 3) certificado de remuneração do último ano, emitido pelo empregador; 4) modelo de requerimento próprio para pensão de velhice, preenchido no balcão.',
        'ONDE DAR ENTRADA: o pedido é formalizado PRESENCIALMENTE numa agência do INSS ou num balcão do SIAC — não é concluído apenas pela internet. Reunir os documentos numa pasta organizada antes de se deslocar.',
        'O VALOR da pensão depende da média dos últimos salários (salário de referência) e do total de anos de descontos — o cálculo exacto é feito pelo INSS no processo.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.siac.gv.ao/pt/inss',
    },
    {
      id: 'inss-inscricao-outros',
      titulo: 'Inscrição inicial e outros benefícios (perguntas frequentes)',
      tipo: 'faq',
      texto: [
        'Q: Como é feito o cadastro inicial (empresa e trabalhadores)? R: Numa agência do INSS ou balcão SIAC, com fotocópia do cartão de contribuinte fiscal da entidade empregadora, fotocópia do Bilhete de Identidade do gestor ou representante legal da empresa e fotocópia do BI dos trabalhadores a inscrever.',
        'Q: Quais os documentos para a PENSÃO DE SOBREVIVÊNCIA? R: Cópia ou certidão da sentença de fixação homologada de alimentos; certidão de nascimento dos descendentes do segurado; certificado escolar de frequência (ensino médio até aos 18 anos; até aos 25 anos se no ensino superior); atestado médico comprovativo de incapacidade para descendentes maiores de 18 anos.',
        'Q: E para o SUBSÍDIO DE ALEITAMENTO? R: Bilhete de Identidade original do(a) segurado(a); certidão de nascimento do filho ou declaração dos serviços de saúde/maternidade; se o pedido for do pai segurado, prova de casamento ou união de facto e Bilhete de Identidade do cônjuge.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.siac.gv.ao/pt/inss',
    },
  ],
};
