// ============================================================================
// REGISTO de Base de Conhecimento por instituição — Etapa A (E1/E2/E3).
// Localização deliberada em api/kb/: o runtime serverless da Vercel só
// empacota imports dentro de api/ (cold start falhou com ../src em S1).
// server.ts (esbuild) e api/index.ts (Vercel) importam DESTE ficheiro —
// fonte única de conteúdo, sem duplicação.
// E1: registo VAZIO (comportamento idêntico ao de hoje). E2/E3: acrescentar
// os textos oficiais AGT/INAPEM tal como o dono os entregar — nunca inventar.
// ============================================================================

export interface FonteKbLocal {
  id: string;
  titulo: string;
  tipo: 'regulamento' | 'procedimento' | 'faq';
  texto: string;
  atualizadoEm: string;
}

export interface KbInstituicaoLocal {
  sigla: string;
  nome: string;
  fontes: FonteKbLocal[];
}

export const KB_REGISTO: KbInstituicaoLocal[] = [];
