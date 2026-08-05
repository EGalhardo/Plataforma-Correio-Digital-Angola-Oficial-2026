// ============================================================================
// KB INAPEM — Etapa A / E2-E3 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono (dono: "Adiciona o texto ou
// arquivo na base de conhecimento da IA atraves da pesquisa na internet").
// Fonte oficial: website do INAPEM (https://www.inapem.gov.ao), consultado em
// 2026-08-05; passos da Plataforma de Certificação conforme anúncio oficial do
// INAPEM (Maio/2023). Nenhum número ou regra foi inventado.
// ============================================================================

import type { KbInstituicaoLocal } from './registoKb';

export const KB_INAPEM: KbInstituicaoLocal = {
  sigla: 'INAPEM',
  nome: 'Instituto Nacional de Apoio às Micro, Pequenas e Médias Empresas',
  fontes: [
    {
      id: 'inapem-cert-oque',
      titulo: 'Certificado MPME — o que é, validade e benefícios',
      tipo: 'procedimento',
      texto: [
        'O Certificado MPME é o documento oficial do INAPEM que atesta a classificação formal de uma empresa como MICRO, PEQUENA ou MÉDIA empresa.',
        'VALIDADE: 12 meses, findo o qual deve ser RENOVADO para manter os benefícios associados.',
        'BENEFÍCIOS do certificado: acesso a linhas de crédito com condições especiais; participação em programas de apoio e incentivos governamentais; maior visibilidade e credibilidade no mercado; acesso a capacitação e formação especializada; oportunidades de networking e parcerias estratégicas.',
        'A certificação destina-se às MPME que precisam de fazer prova do estatuto junto de entidades da Administração Pública — atribuição de apoios ou outras formas de discriminação positiva de micro, pequenas e médias empresas.',
        'Portal oficial: www.inapem.gov.ao',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.inapem.gov.ao',
    },
    {
      id: 'inapem-cert-pedido',
      titulo: 'Como pedir o Certificado MPME online',
      tipo: 'procedimento',
      texto: [
        'O pedido do Certificado MPME é feito À DISTÂNCIA, sem deslocação física nem entrega presencial de documentos, na Plataforma de Certificação do INAPEM, que está interligada com o canal da AGT.',
        'PASSOS: 1) aceder a www.inapem.gov.ao; 2) no menu «Serviços» escolher a subcategoria «Certificação»; 3) premir «Ver mais» e depois «Solicitar» — o requerente é reencaminhado para a plataforma, que valida os dados da empresa junto da AGT.',
        'O certificado emitido tem código QR para reforço da segurança e geolocalização da empresa.',
        'Segundo anúncio do INAPEM (Maio de 2023), a plataforma reduziu o período médio de emissão do certificado de cerca de 30 dias para cerca de 3 dias.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.inapem.gov.ao',
    },
    {
      id: 'inapem-programas-faq',
      titulo: 'Programas e produtos do INAPEM (perguntas frequentes)',
      tipo: 'faq',
      texto: [
        'Q: Que outros apoios o INAPEM dá às MPME? R: REDE INAPEM — plataforma digital que dá maior visibilidade no mercado aos prestadores de serviços angolanos e os liga a potenciais clientes e parceiros. SELO «FEITO EM ANGOLA» — certificação oficial de origem e qualidade que identifica, valoriza e promove produtos fabricados em território nacional. MEU GESTOR — consultores especializados dão apoio técnico personalizado directamente nas instalações das micro e pequenas empresas (diagnóstico de desempenho, recomendações práticas de gestão, implementação de soluções). NOSSO SABER — plataforma de e-learning com cursos, webinars e materiais educativos para empreendedores, no seu próprio ritmo, com certificação de conclusão. KAWENAINVEST — ligação de MPME a investidores e oportunidades de capital, com orientação para acesso a linhas de crédito e programas de garantia pública. TWENDY — programa nacional de incubação e aceleração de startups, com ciclos intensivos de cerca de 10 semanas, mentoria, recursos e redes de parceiros.',
        'Q: Onde faço a candidatura a estes programas? R: Em www.inapem.gov.ao, menu «Serviços», escolhendo o produto pretendido.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.inapem.gov.ao',
    },
  ],
};
