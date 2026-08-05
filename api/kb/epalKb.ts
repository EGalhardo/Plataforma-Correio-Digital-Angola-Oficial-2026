// ============================================================================
// KB EPAL — Etapa A / E2-E3 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono, da fonte oficial:
//  - Página Comercial da EPAL (https://www.epal.co.ao/comercial.php)
// consultado em 2026-08-05. Valores de taxas e tarifas tal como publicados
// pela EPAL; confirmar sempre no balcão antes de pagar.
// ============================================================================

import type { KbInstituicaoLocal } from './registoKb';

export const KB_EPAL: KbInstituicaoLocal = {
  sigla: 'EPAL',
  nome: 'Empresa Pública de Águas de Luanda',
  fontes: [
    {
      id: 'epal-nova-ligacao',
      titulo: 'Nova ligação de água — como celebrar o contrato (segmento doméstico)',
      tipo: 'procedimento',
      texto: [
        'Para celebrar o contrato de abastecimento de água no segmento DOMÉSTICO, o cliente dirige-se a uma agência/balcão comercial da EPAL apresentando:',
        '1) cópia do Bilhete de Identidade;',
        '2) documento que comprove que o cliente é o legítimo titular do local a abastecer;',
        '3) valor de 600,00 Kz;',
        '4) Taxa de Ligação de 15.000,00 Kz (Projecto 700.000 ligações).',
        'Os valores são os publicados na página comercial da EPAL (www.epal.co.ao) à data da recolha; confirmar sempre no balcão antes de pagar.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.epal.co.ao/comercial.php',
    },
    {
      id: 'epal-facturacao-pagamento',
      titulo: 'Facturação e modalidades de pagamento',
      tipo: 'procedimento',
      texto: [
        'FACTURAÇÃO (três formas): 1) LEITURA DE CONTADOR — baseada na leitura do contador; 2) CONSUMO ESTIMADO — na ausência de contador, o consumo é facturado por estimativa em função do sector e subsector de actividade; 3) MÉDIA DE CONSUMO — na ausência de leitura, com base na média dos consumos reais anteriores, regularizada imediatamente após uma nova leitura.',
        'MODALIDADES DE PAGAMENTO: Multicaixa (num ATM, seguindo as instruções de pagamento); depósito à ordem; numerário ou cartão Multicaixa nos balcões da EPAL; pagamento directo nos balcões dos bancos BCA e Sol (não carece de reconciliação nos balcões da EPAL); internet banking e transferência bancária; ordem de saque.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.epal.co.ao/comercial.php',
    },
    {
      id: 'epal-tarifario',
      titulo: 'Plano tarifário da água potável — Decreto Executivo Conjunto n.º 230/18',
      tipo: 'regulamento',
      texto: [
        'O Plano Tarifário de água potável para a Província de Luanda foi aprovado pelo Decreto Executivo Conjunto n.º 230/18, de 12 de Junho (Ministério das Finanças e Ministério da Energia e Águas).',
        'DOMÉSTICOS: tarifa básica 59 Kz/m³ (consumo de 0 a 10 m³); tarifa de transição 94 Kz/m³ (10 a 15 m³); tarifa básica 137 Kz/m³ com tarifa fixa mensal de 332 Kz (consumo acima de 15 m³).',
        'COMÉRCIO E SERVIÇOS: 137 Kz/m³, com tarifa fixa mensal de 3.900 Kz. INDÚSTRIA: 124 Kz/m³, com tarifa fixa mensal de 11.700 Kz. CHAFARIZ: 42 Kz/m³. GIRAFA: 137 Kz/m³.',
        'O diploma e a tabela completa estão publicados no site da EPAL (www.epal.co.ao, secção Comercial > Tarifário).',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.epal.co.ao/comercial.php',
    },
    {
      id: 'epal-atendimento',
      titulo: 'Atendimento ao cliente, reclamações e balcões (perguntas frequentes)',
      tipo: 'faq',
      texto: [
        'Q: Como faço uma reclamação (falta de água, avaria, factura errada)? R: Piquete da EPAL: (+244) 942 454 897; outros contactos telefónicos: 993 009 582, 921 553 333 e 226 431 561; e-mail geral@epal.co.ao; página oficial no Facebook «Epal de Luanda»; ou presencialmente num balcão comercial.',
        'Q: Onde são os balcões? R: A EPAL tem dezanove balcões de atendimento em Luanda — por exemplo Coqueiros, Valódia, Terra Nova, Viana, Kilamba, Maianga, Camama, Cacuaco, Cazenga, Mulemba, Zango, Benfica e Sequele — mais sub-agências (Kifica, Nova Vida, Golfe) e postos comerciais (Kero Cacuaco; SIAC do Cazenga, Talatona e Zango; Vida Pacífica; Vila Marina), além de postos móveis em zonas sem balcão fixo.',
        'Q: O que tratam os balcões comerciais? R: Atendimento ao cliente, entrega de facturas ao domicílio, cadastramento de clientes, leitura de contadores, gestão de reclamações e celebração de contratos.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.epal.co.ao/comercial.php',
    },
  ],
};
