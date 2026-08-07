// ============================================================================
// KB Emergências (CISP 111) — Etapa A / vaga-2 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono. Fontes jornalísticas que
// citam directamente as autoridades (porta-voz do Ministério do Interior,
// Mai/2020; Serviço Nacional de Protecção Civil e Bombeiros, Nov/2024).
// HONESTIDADE: os números 113 e 115 foram oficialmente descontinuados —
// a KB regista essa mudança para ninguém ligar números mortos.
// ============================================================================

import type { KbInstituicaoLocal } from './registoKb';

export const KB_CISP: KbInstituicaoLocal = {
  sigla: 'CISP',
  nome: 'Emergências — Centro Integrado de Segurança Pública (111)',
  fontes: [
    {
      id: 'cisp-numero-emergencia',
      titulo: 'Número de emergência em Angola — 111 (e o destino dos antigos 113 e 115)',
      tipo: 'faq',
      texto: [
        'Q: Para que número ligo numa emergência (crime, acidente, incêndio, emergência médica)? R: 111 — terminal telefónico de emergência ÚNICO, coordenado pelo CISP (Centro Integrado de Segurança Pública), ao serviço da população 24 sobre 24 horas. O objectivo do CISP é unificar num só número qualquer situação: acidente de viação, incêndio ou denúncia de um crime.',
        'Q: E os antigos números? R: NÃO USAR — o 113 (antiga linha de emergência policial) foi DESACTIVADO pelo Ministério do Interior (Maio de 2020): quem ligar não será atendido. O 115 (Protecção Civil e Bombeiros) também foi descontinuado e os bombeiros orientam ligar o 111 (rádio RNA, Novembro de 2024).',
        'Q: O 111 funciona em todo o país? R: Foi implantado primeiro em Luanda e Benguela e vai sendo alargado às restantes províncias à medida que são inauguradas delegações do CISP. Onde o 111 ainda não funciona, a orientação oficial do Ministério do Interior é ligar para o comando policial do seu município (os contactos móveis são divulgados pelos comandos provinciais e municipais).',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://rna.ao/rna.ao/2024/11/28/servico-de-proteccao-civil-e-bombeiros-alerta-que-em-caso-de-emergencias-medicas-policiais-ou-de-incendio-os-cidadaos-devem-ligar-para-o-111/',
    },
  ],
};
