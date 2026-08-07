// ============================================================================
// REGISTO de Base de Conhecimento por instituição — Etapa A (E1/E2/E3).
// Localização deliberada em api/kb/: o runtime serverless da Vercel só
// empacota imports dentro de api/ (cold start falhou com ../src em S1 e com
// ./kb no E1 — confirmado 2x em 2026-08-05). Por isso:
//   - server.ts (dev/esbuild) importa DESTE ficheiro;
//   - api/index.ts (Vercel) NÃO importa: recebe o conteúdo injetado pelo
//     scripts/syncKb.ts entre os marcadores ===KB-INICIO===/===KB-FIM===.
// Fonte única do conteúdo: os ficheiros api/kb/*Kb.ts abaixo.
//
// E2/E3 (2026-08-05): conteúdo RECOLHIDO NA INTERNET a pedido do dono
// ("Adiciona o texto ou arquivo na base de conhecimento da IA atraves da
// pesquisa na internet. Coloque as instituições mais populares de Angola
// como INAPEM, AGT, ENDE, EPAL, etc.").
// VAGA-2 (2026-08-05, "Podes alargar a base"): +7 instituições
// (DNIRN/BI+registo criminal, Conservatória, DTSER, SIAC, MINED, MINSA,
// Emergências CISP 111). Cada fonte regista fonteUrl e atualizadoEm.
// Regra mantida: nunca inventar regras/valores sem fonte.
// ============================================================================

import { KB_AGT } from './agtKb';
import { KB_CISP } from './cispKb';
import { KB_DNIRN } from './dnirnKb';
import { KB_DTSER } from './dtserKb';
import { KB_ENDE } from './endeKb';
import { KB_EPAL } from './epalKb';
import { KB_INAPEM } from './inapemKb';
import { KB_INSS } from './inssKb';
import { KB_MINED } from './minedKb';
import { KB_MINSA } from './minsaKb';
import { KB_REGCIVIL } from './regcivilKb';
import { KB_SIAC } from './siacKb';
import { KB_SME } from './smeKb';

export interface FonteKbLocal {
  id: string;
  titulo: string;
  tipo: 'regulamento' | 'procedimento' | 'faq';
  texto: string;
  atualizadoEm: string;
  fonteUrl?: string;
}

export interface KbInstituicaoLocal {
  sigla: string;
  nome: string;
  fontes: FonteKbLocal[];
}

export const KB_REGISTO: KbInstituicaoLocal[] = [
  KB_AGT,
  KB_CISP,
  KB_DNIRN,
  KB_DTSER,
  KB_ENDE,
  KB_EPAL,
  KB_INAPEM,
  KB_INSS,
  KB_MINED,
  KB_MINSA,
  KB_REGCIVIL,
  KB_SME,
  // SIAC em ÚLTIMO lugar de propósito: find() devolve o 1.º match e uma
  // mensagem "SIAC — balcão SME/DNIRN" deve bater no organismo específico.
  KB_SIAC,
];
