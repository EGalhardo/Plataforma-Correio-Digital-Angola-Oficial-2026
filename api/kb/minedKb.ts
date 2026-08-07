// ============================================================================
// KB Ministério da Educação (MINED) — Etapa A / vaga-2 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono:
//  - Decreto Presidencial n.º 163/25 (Regulamento de homologação,
//    reconhecimento e equivalência de estudos) — texto via Angolex.
//  - Projecto SIMPLIFICA: reconhecimento de certificado do ensino secundário
//    do II ciclo — tabela de simplificação via Angolex.
// Angolex é repositório jurídico que reproduz diplomas oficiais (DR).
// ============================================================================

import type { KbInstituicaoLocal } from './registoKb';

export const KB_MINED: KbInstituicaoLocal = {
  sigla: 'MINED',
  nome: 'Ministério da Educação',
  fontes: [
    {
      id: 'mined-equivalencia-dp163',
      titulo: 'Equivalência e reconhecimento de estudos — Decreto Presidencial n.º 163/25',
      tipo: 'regulamento',
      texto: [
        'O Decreto Presidencial n.º 163/25 aprovou o Regulamento sobre as regras e procedimentos de HOMOLOGAÇÃO, RECONHECIMENTO e concessão de EQUIVALÊNCIA de estudos da educação pré-escolar, do ensino primário e do ensino secundário.',
        'HOMOLOGAÇÃO: confirma a validade de atestados, declarações, certificados e diplomas emitidos em território nacional — para efeitos legais ou para a continuação de estudos NO EXTERIOR.',
        'RECONHECIMENTO: aplica-se a documentos escolares obtidos em sistemas educativos ESTRANGEIROS (educação pré-escolar, ensino primário, ensino secundário geral e técnico-profissional), para obter habilitações equivalentes do sistema angolano.',
        'EQUIVALÊNCIA: as instituições de ensino devem exigir ao aluno recém-chegado ao país a declaração de equivalência NO PRAZO DE ATÉ 30 DIAS após o processo de inscrição.',
        'Na prática, os processos pedem normalmente: documento escolar original devidamente autenticado (diploma/certificado), certificado de notas ou histórico escolar, documento de identificação, e — para documentos em língua estrangeira — legalização/apostila e tradução certificada para português. Confirmar os detalhes junto dos serviços provinciais do Ministério da Educação, com antecedência.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://angolex.com/paginas/decreto-presidencial/regras-e-procedimentos-para-homologacao-reconhecimento-e-concessao-de-equivalencia-de-estudos-163a-25a.html',
    },
    {
      id: 'mined-reconhecimento-ii-ciclo',
      titulo: 'Reconhecimento de certificado do ensino secundário (II ciclo) — procedimento simplificado',
      tipo: 'procedimento',
      texto: [
        'RECONHECIMENTO DE CERTIFICADO/DECLARAÇÃO DO ENSINO SECUNDÁRIO DO II CICLO (medida do Projecto SIMPLIFICA):',
        'REQUISITOS ACTUAIS: 1) declaração ou certificado original de estudo; 2) cópia do Bilhete de Identidade do estudante.',
        'O QUE FOI SIMPLIFICADO: foi eliminado o visto do Gabinete Provincial da Educação e da Direcção Municipal da Educação para o reconhecimento destes documentos, SALVO nos casos de continuidade de estudos no exterior do país — nesses casos continuam a intervir o Ministro da Educação e o Ministério das Relações Exteriores (MIREX).',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://angolex.com/paginas/diversos/procedimento-de-reconhecimento-de-certificado-do-ensino-do-segundo-ciclo.html',
    },
  ],
};
