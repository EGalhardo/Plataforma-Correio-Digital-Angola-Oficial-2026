// ============================================================================
// Preenchimento assistido de metadados na KB da instituição — Etapa #5
// ----------------------------------------------------------------------------
// Serviço PURO (sem React, testável em tsx) que analisa o conteúdo que a
// instituição cola no formulário da Base de Conhecimento e sugere/preenche
// os metadados:
//   • título sugerido (primeira frase significativa do documento);
//   • tipo sugerido (regulamento / procedimento / faq) por heurística
//     determinística em português — SEM chamadas externas (grátis, offline,
//     sem quota; a IA generativa fica para uma etapa futura opcional);
//   • palavras-chave por frequência (com stopwords pt);
//   • resumo curto para revisão.
// NUNCA grava nada: devolve sugestões que o formulário aplica (ou não).
// ============================================================================

export type TipoKb = 'regulamento' | 'procedimento' | 'faq';

export interface KbMetaSugestoes {
  tituloSugerido: string;
  tipoSugerido: TipoKb;
  confiancaTipo: number; // 0..1 (heurística)
  palavrasChave: string[];
  resumoSugerido: string;
  caracteres: number;
  pronto: boolean; // >= comprimento mínimo do formulário (200)
}

export const MIN_TEXTO_KB = 200;
export const MAX_TITULO_KB = 300;

// ---------------------------------------------------------------------------
// Stopwords portuguesas (amostra suficiente para palavras-chave úteis)
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  'a', 'o', 'e', 'é', 'de', 'do', 'da', 'dos', 'das', 'um', 'uma', 'uns', 'umas',
  'em', 'no', 'na', 'nos', 'nas', 'para', 'por', 'com', 'sem', 'sobre', 'entre',
  'que', 'se', 'como', 'quando', 'onde', 'qual', 'quais', 'quem', 'cujo', 'cuja',
  'os', 'as', 'ao', 'aos', 'à', 'às', 'este', 'esta', 'estes', 'estas', 'esse',
  'essa', 'esses', 'essas', 'aquele', 'aquela', 'isto', 'isso', 'aquilo',
  'não', 'nao', 'mais', 'menos', 'muito', 'pouco', 'também', 'tambem', 'já', 'ja',
  'ainda', 'nunca', 'sempre', 'ser', 'são', 'sao', 'foi', 'foram', 'tem', 'têm',
  'tem', 'ter', 'há', 'ha', 'pode', 'podem', 'deve', 'devem', 'será', 'sera',
  'até', 'ate', 'após', 'apos', 'antes', 'depois', 'durante', 'contra', 'per',
  'segundo', 'conforme', 'nos', 'pelo', 'pela', 'pelos', 'pelas', 'num', 'numa',
  'cada', 'todo', 'toda', 'todos', 'todas', 'outro', 'outra', 'outros', 'outras',
  'deste', 'desta', 'destes', 'destas', 'desse', 'dessa', 'daquele', 'daquela',
  'tal', 'tais', 'mesmo', 'mesma', 'próprio', 'proprio', 'via', 'através', 'atraves',
]);

/** Limpa e normaliza uma palavra para contagem (minúsculas, sem pontuação). */
const limparPalavra = (raw: string): string =>
  raw.toLowerCase().replace(/[^a-zà-ú0-9-]/g, '').trim();

// ---------------------------------------------------------------------------
// Título sugerido
// ---------------------------------------------------------------------------

const LIMPAR_TITULO = (s: string): string =>
  s.replace(/\s+/g, ' ').replace(/[.:;,]$/, '').trim();

/** Primeira frase com comprimento útil; fallback para as duas primeiras. */
const primeiraFraseUtil = (texto: string): string => {
  const frases = texto
    .split(/(?<=[.!?])\s+/)
    .map(f => f.trim())
    .filter(Boolean);
  const primeira = frases[0] || '';
  if (primeira.length >= 24) return primeira;
  const duas = frases.slice(0, 2).join(' ');
  return duas.length >= 24 ? duas : texto.slice(0, 90);
};

/**
 * Sugere um título a partir do conteúdo: usa a primeira frase significativa,
 * limita a ~80 caracteres e normaliza maiúsculas (só primeira letra e nomes).
 */
export const sugerirTitulo = (texto: string): string => {
  const limpo = (texto || '').trim();
  if (!limpo) return '';
  let titulo = LIMPAR_TITULO(primeiraFraseUtil(limpo));
  if (titulo.length > 80) titulo = titulo.slice(0, 80).trim();
  // Maiúscula inicial; resto em minúsculas (títulos de documentos oficiais).
  titulo = titulo.charAt(0).toUpperCase() + titulo.slice(1);
  // Não devolver títulos inúteis ("O", "A", "Este documento...").
  if (titulo.length < 8) return '';
  return titulo;
};

// ---------------------------------------------------------------------------
// Tipo sugerido (heurística determinística)
// ---------------------------------------------------------------------------

const PADRAO_FAQ = [
  /\?/, /pergunta/i, /resposta\s*:/i, /como (posso|devo|faço|solicito)/i,
  /quanto custa/i, /qual (é )?o (prazo|valor|custo)/i, /o que é/i, /é possível/i,
  /posso (solicitar|fazer|pedir)/i, /dúvidas?/i, /perguntas? frequentes/i,
];

const PADRAO_REGULAMENTO = [
  /lei|decreto|regulamento|artigo|parágrafo|§|disposição/i,
  /proibido|proíbe|obrigatóri|sanção|sanções|multa|coima/i,
  /nos termos|conforme (a|o) (lei|regulamento|estatuto)|estabelece/i,
  /jurídic|legal|normativ|vigor|revogad/i,
  /competência|atribuiç/i,
];

const PADRAO_PROCEDIMENTO = [
  /passo\s*\d|primeiro (passo|deve|deve-se)|em seguida|depois de|por fim/i,
  /^\s*\d+[.)]\s+/m, /\d+\.\s+\d+\.\s+\d+\./,
  /solicitar|apresentar|dirigir-se|preencher|entregar|enviar|submeter/i,
  /prazo|prazos|documento (necessário|exigido|requerido)|requisitos/i,
  /procedimento|tramitaç/i,
];

/**
 * Classifica o conteúdo em tipo KB por heurística de padrões em português.
 * FAQ tem prioridade (perguntas explícitas), depois regulamento (normas),
 * por fim procedimento (passos). Devolve também a confiança (0..1).
 */
export const classificarTipo = (texto: string): { tipo: TipoKb; confianca: number } => {
  const t = (texto || '').toLowerCase();
  const conta = (padroes: RegExp[]): number =>
    padroes.reduce((acc, re) => acc + (re.test(t) ? 1 : 0), 0);

  const faq = conta(PADRAO_FAQ);
  const reg = conta(PADRAO_REGULAMENTO);
  const proc = conta(PADRAO_PROCEDIMENTO);

  if (faq >= 2 || (faq === 1 && /^\s*(pergunta|como|qual|o que|posso)/i.test(t))) {
    return { tipo: 'faq', confianca: faq >= 3 ? 0.9 : 0.7 };
  }
  if (reg >= 2) return { tipo: 'regulamento', confianca: reg >= 4 ? 0.9 : 0.75 };
  if (reg === 1 && proc <= 1) return { tipo: 'regulamento', confianca: 0.55 };
  return { tipo: 'procedimento', confianca: proc >= 2 ? 0.8 : 0.6 };
};

// ---------------------------------------------------------------------------
// Palavras-chave por frequência
// ---------------------------------------------------------------------------

export const sugerirPalavrasChave = (texto: string, max = 6): string[] => {
  const t = (texto || '').toLowerCase();
  const contagem = new Map<string, number>();
  for (const raw of t.split(/[\s,.;:()"\u201C\u201D-]+/)) {
    const palavra = limparPalavra(raw);
    if (!palavra || palavra.length < 4 || STOPWORDS.has(palavra)) continue;
    if (/^\d+$/.test(palavra)) continue;
    contagem.set(palavra, (contagem.get(palavra) || 0) + 1);
  }
  return Array.from(contagem.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([p]) => p);
};

// ---------------------------------------------------------------------------
// Resumo curto
// ---------------------------------------------------------------------------

/** Primeiras ~140 caracteres cortados em limite de palavra (sem cortar a meio). */
export const gerarResumoSugerido = (texto: string, maxLen = 140): string => {
  const limpo = (texto || '').trim().replace(/\s+/g, ' ');
  if (!limpo) return '';
  if (limpo.length <= maxLen) return limpo;
  const corte = limpo.slice(0, maxLen);
  const ultimoEspaco = corte.lastIndexOf(' ');
  return ultimoEspaco > 40 ? `${corte.slice(0, ultimoEspaco)}…` : `${corte}…`;
};

// ---------------------------------------------------------------------------
// Análise consolidada
// ---------------------------------------------------------------------------

export const analisarConteudoKb = (texto: string): KbMetaSugestoes => {
  const t = (texto || '').trim();
  const caracteres = t.length;
  const pronto = caracteres >= MIN_TEXTO_KB;
  const { tipo, confianca } = classificarTipo(t);
  return {
    tituloSugerido: pronto ? sugerirTitulo(t) : '',
    tipoSugerido: tipo,
    confiancaTipo: confianca,
    palavrasChave: pronto ? sugerirPalavrasChave(t) : [],
    resumoSugerido: gerarResumoSugerido(t),
    caracteres,
    pronto,
  };
};

/** Rótulo legível do tipo sugerido (para a UI). */
export const ROTULO_TIPO_KB: Record<TipoKb, string> = {
  regulamento: 'Regulamento / Lei',
  procedimento: 'Procedimento',
  faq: 'Pergunta frequente',
};
