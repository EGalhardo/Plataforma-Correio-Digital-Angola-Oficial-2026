// ============================================================================
// KB ENDE — Etapa A / E2-E3 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono.
// HONESTIDADE DE FONTE: o site oficial da ENDE (www.ende.co.ao) não respondeu
// à data da recolha; os dados abaixo vêm de directório público de contactos
// (2024) e da referência do SEPE ao Provedor do Cliente ENDE. Por isso esta
// base fica limitada a canais oficiais de atendimento — NÃO foram incluídos
// valores de tarifas nem requisitos de ligação sem fonte oficial verificável.
// ============================================================================

import type { KbInstituicaoLocal } from './registoKb';

export const KB_ENDE: KbInstituicaoLocal = {
  sigla: 'ENDE',
  nome: 'Empresa Nacional de Distribuição de Electricidade',
  fontes: [
    {
      id: 'ende-atendimento-canais',
      titulo: 'Atendimento ao cliente, Provedor do Cliente e canais de reclamação',
      tipo: 'faq',
      texto: [
        'A ENDE — Empresa Nacional de Distribuição de Electricidade — é a empresa pública de distribuição de electricidade em Angola, tutelada pelo Ministério da Energia e Águas, com sede na Rua Cónego Manuel das Neves, 234, Luanda.',
        'Q: Como contactar a ENDE? R: Central de atendimento telefónico +244 222 641 750 (linha principal divulgada publicamente); Instagram oficial @ende_oficial.',
        'Q: A reclamação não foi resolvida? R: Existe o PROVEDOR DO CLIENTE ENDE, serviço de aproximação entre a empresa e o consumidor, que pode ser contactado por formulário próprio na área de eServiços do SEPE (Portal dos Serviços Públicos Electrónicos do Governo de Angola, sepe.gov.ao). Em alternativa, o consumidor pode expor a situação ao INADEC (Instituto Nacional de Defesa do Consumidor).',
        'NOTA DE CONFIANÇA: estes contactos foram recolhidos de directórios públicos e do portal SEPE. Para serviços novos (pedidos de ligação, contadores, tarifas), confirmar SEMPRE junto da ENDE — presencialmente num centro de atendimento ou pelos canais acima — pois só a ENDE é fonte autorizada.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://telefone-numero.com/ende-contactos',
    },
  ],
};
