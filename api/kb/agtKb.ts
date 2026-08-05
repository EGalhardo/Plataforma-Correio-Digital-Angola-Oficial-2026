// ============================================================================
// KB AGT — Etapa A / E2-E3 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono, de fontes oficiais:
//  - Portal do Contribuinte (https://portaldocontribuinte.minfin.gov.ao)
//  - Portal institucional da AGT (https://agt.minfin.gov.ao)
// consultados em 2026-08-05. Sem invenção de prazos, taxas ou obrigações.
// ============================================================================

import type { KbInstituicaoLocal } from './registoKb';

export const KB_AGT: KbInstituicaoLocal = {
  sigla: 'AGT',
  nome: 'Administração Geral Tributária',
  fontes: [
    {
      id: 'agt-portal-servicos',
      titulo: 'Portal do Contribuinte — serviços electrónicos da AGT',
      tipo: 'procedimento',
      texto: [
        'O Portal do Contribuinte (portaldocontribuinte.minfin.gov.ao) é a plataforma digital oficial da AGT — órgão superintendido pelo Ministério das Finanças — para a relação com os contribuintes, sem deslocação às repartições fiscais e aduaneiras.',
        'ACESSO: na página inicial existe o botão «Solicitar Novo Acesso» (criar registo) e a opção «Recuperar a Palavra-Passe». Quem não tem conta pode seleccionar «Novo Utilizador»; para representar outro contribuinte, «Nova Representação».',
        'SERVIÇOS DO PORTAL: submissão de declarações electrónicas (IVA e demais impostos); liquidação e pagamento de impostos; consulta de facturas; emissão de certidão de conformidade tributária e de certidão de dívida tributária; consulta da conta-corrente do contribuinte; submissão de ficheiros SAF-T (contabilidade e facturação); validação de documentos; registo de facturas electrónicas.',
        'SERVIÇO PÚBLICO SEM LOGIN: «Verificação da Nota de Liquidação» — permite a qualquer pessoa confirmar a validade de uma nota de liquidação da AGT.',
        'PRAZOS: o Calendário Fiscal (edição 2026 em PDF no portal) e os comunicados oficiais definem — e por vezes alargam — os prazos de submissão de declarações e pagamentos. Confirmar sempre no portal ou em www.agt.minfin.gov.ao.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://portaldocontribuinte.minfin.gov.ao',
    },
    {
      id: 'agt-simulador-ivm',
      titulo: 'Simulador Tributário e Imposto sobre os Veículos Motorizados (IVM)',
      tipo: 'procedimento',
      texto: [
        'No site www.agt.minfin.gov.ao, aba «Serviços Electrónicos» > «Simulador Tributário», o contribuinte pode simular o Imposto sobre os Veículos Motorizados (IVM), o Imposto Predial (IP) e o Imposto sobre o Rendimento do Trabalho (IRT); a AGT prevê incluir faseadamente II, IEC, IVA, IS, IAC e IEJ e a componente aduaneira (importação e exportação).',
        'IVM: no próprio site existe a caixa «Imposto Sobre os Veículos Motorizados». Quem NÃO está cadastrado no Portal do Contribuinte escolhe «Cadastrar», digita o NIF e recebe um código de verificação no e-mail ou telemóvel associado ao cadastro; segue os passos para cadastrar o veículo, liquidar, pagar e obter o selo. Também existe «Carregamento em Massa» para frotas.',
        'A AGT publicou no portal um «Passo a Passo» oficial do IVM (cadastrar, liquidar, pagar e obter o selo) e um «Guia rápido» para desassociação de veículos no Portal do Contribuinte.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://portaldocontribuinte.minfin.gov.ao/noticia?id=809086',
    },
    {
      id: 'agt-legislacao-contactos',
      titulo: 'Legislação fiscal, notificações e contactos da AGT (perguntas frequentes)',
      tipo: 'faq',
      texto: [
        'Q: Onde consulto a legislação fiscal e aduaneira? R: Em www.agt.minfin.gov.ao, secção «Legislação» (Legislação Fiscal, Legislação Aduaneira, Tributação Especial, circulares, instrutivos, tipografias/gráficas e programas validados). As medidas fiscais e aduaneiras do Orçamento Geral do Estado estão na secção «OGE» do mesmo portal, e o boletim mensal «Folha Tributária» na Sala de Imprensa.',
        'Q: Como sei da minha situação fiscal ou de notificações? R: A AGT notifica os contribuintes pela caixa do Portal do Contribuinte (anúncios recentes incluíram, por exemplo, notificações de início de fiscalização e de direito de audição prévia relativas ao exercício de 2025). Verificar regularmente a conta no portal.',
        'Q: Existe atendimento rápido por chat? R: Sim — o portal da AGT (www.agt.minfin.gov.ao) divulga contacto por WhatsApp: +244 923 167 011.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://agt.minfin.gov.ao/PortalAGT/#!/',
    },
  ],
};
