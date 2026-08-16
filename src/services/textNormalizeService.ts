// ============================================================================
// Normalização e sugestão leve de texto — camada "autocomplete/sugestão"
// ----------------------------------------------------------------------------
// A pedido do dono (2026-08-15): evitar que os utilizadores guardem dados com
// erros ortográficos. Estratégia equilibrada (não "autocomplete em tudo"):
//   1) NORMALIZAÇÃO SILENCIOSA ao sair do campo (blur) — maiúsculas corretas,
//      espaços duplos removidos, sem alterar o sentido do que foi escrito.
//   2) SUGESTÃO COM CONFIRMAÇÃO — o utilizador escolhe; nunca substituição
//      automática em campos de texto livre.
//   3) AVISO GENTIL — em texto curto com padrões suspeitos (letras repetidas,
//      caracteres estranhos), sugere rever a escrita — sem bloquear.
// Serviço PURO (sem React, testável em tsx).
// ============================================================================

/** Remove espaços duplos/tabs e trim. */
export const limparEspacos = (texto: string): string =>
  (texto || '').replace(/\s+/g, ' ').trim();

/** Partículas que ficam em minúsculas num nome próprio português. */
const PARTICULAS = new Set([
  'de', 'da', 'do', 'dos', 'das', 'e', 'em', 'a', 'o', 'ao', 'aos', 'à', 'às',
  'com', 'por', 'para', 'sem', 'sobre', 'entre', 'el', 'la', 'los', 'las',
]);

/** Siglas institucionais longas (>5 letras) que devem preservar maiúsculas. */
const SIGLAS_LONGAS = new Set(['INAPEM', 'MINJUS', 'MINSA', 'CORREIO']);

/**
 * Uma palavra totalmente maiúscula é sigla? — curta (2–5), não é partícula
 * comum, ou é uma sigla institucional longa conhecida. Evita tratar caps lock
 * (ex.: "GALHARDO", "INSTRUÇÃO") como sigla.
 */
const ehSigla = (palavra: string): boolean => {
  if (palavra.length < 2) return false;
  const upper = palavra.toUpperCase();
  if (SIGLAS_LONGAS.has(upper)) return true;
  if (palavra !== palavra.toUpperCase()) return false; // só se totalmente maiúscula
  if (!/^[A-ZÀ-Ú0-9]+$/.test(palavra)) return false;
  if (palavra.length > 5) return false; // caps lock de palavra longa → normalizar
  if (PARTICULAS.has(palavra.toLowerCase())) return false;
  return true;
};

/**
 * Normaliza um NOME PRÓPRIO: primeira letra de cada palavra em maiúscula,
 * partículas (de/da/do/dos/e/…) em minúscula, siglas preservadas, espaços
 * limpos. Ex.: "  edlasio  GALHARDO " → "Edlasio Galhardo"
 */
export const normalizarNome = (texto: string): string => {
  const limpo = limparEspacos(texto);
  if (!limpo) return '';
  return limpo
    .split(' ')
    .map((palavra) => {
      if (ehSigla(palavra)) return palavra.toUpperCase();
      // preserva hífen (ex.: "José-Maria")
      const partes = palavra.split('-');
      const normalizadas = partes.map((p, i) => {
        if (i > 0 && PARTICULAS.has(p.toLowerCase())) return p.toLowerCase();
        const lower = p.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      });
      return normalizadas.join('-');
    })
    .map((palavra, i) => {
      const lower = palavra.toLowerCase();
      if (PARTICULAS.has(lower)) {
        return i === 0 ? palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase() : lower;
      }
      return palavra;
    })
    .join(' ');
};

/**
 * Normaliza um TÍTULO de documento/assunto: só a primeira letra maiúscula,
 * o resto em minúsculas (preservando siglas), espaços limpos.
 * Ex.: "INSTRUÇÃO PARA RENOVAÇÃO DE LICENÇAS" → "Instrução para renovação de licenças"
 */
export const normalizarTitulo = (texto: string): string => {
  const limpo = limparEspacos(texto);
  if (!limpo) return '';
  const comMinusculas = limpo
    .split(' ')
    .map((palavra) => {
      if (ehSigla(palavra)) return palavra.toUpperCase();
      return palavra.toLowerCase();
    })
    .join(' ');
  return comMinusculas.charAt(0).toUpperCase() + comMinusculas.slice(1);
};

/** Normaliza texto livre genérico (trim + espaços simples). */
export const normalizarTexto = (texto: string): string => limparEspacos(texto);

// ---------------------------------------------------------------------------
// E-mail — sugestão de domínios comuns + deteção de erros óbvios
// ---------------------------------------------------------------------------

export const DOMINIOS_EMAIL_SUGERIDOS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
  'correiodigital.ao', 'inapem.ao', 'agt.ao', 'sme.ao', 'minfin.gov.ao', 'gmail.co.ao',
];

/** Extrai a parte local (antes de @) — '' se inválido. */
export const parteLocalEmail = (email: string): string => {
  const e = (email || '').trim().toLowerCase();
  const idx = e.indexOf('@');
  return idx > 0 ? e.slice(0, idx) : '';
};

/** Deteta erros comuns de digitação de domínio (ex.: gmial, hotmai, gmai). */
const ERROS_DOMINIO: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com',
  'gmal.com': 'gmail.com', 'hotmai.com': 'hotmail.com', 'hotmal.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com', 'outloo.com': 'outlook.com', 'outlok.com': 'outlook.com',
  'yahoo.co': 'yahoo.com', 'yaho.com': 'yahoo.com',
};

/** Devolve a correção sugerida do domínio se for um erro óbvio; senão ''. */
export const corrigirDominioEmail = (email: string): string => {
  const e = (email || '').trim().toLowerCase();
  const idx = e.indexOf('@');
  if (idx < 0) return '';
  const dominio = e.slice(idx + 1);
  const correcao = ERROS_DOMINIO[dominio];
  if (correcao) return `${e.slice(0, idx)}@${correcao}`;
  return '';
};

/** Sugestões de domínio para o autocomplete (a partir do que o user digitou). */
export const sugerirDominiosEmail = (email: string, max = 3): string[] => {
  const local = parteLocalEmail(email);
  if (!local) return [];
  const digitado = email.trim().toLowerCase().split('@')[1] || '';
  const candidatos = DOMINIOS_EMAIL_SUGERIDOS
    .filter((d) => d.startsWith(digitado) || !digitado)
    .slice(0, max);
  return candidatos.map((d) => `${local}@${d}`);
};

/** Validação básica de e-mail (formato). */
export const emailPareceValido = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((email || '').trim());

// ---------------------------------------------------------------------------
// Aviso ortográfico gentil (texto curto)
// ---------------------------------------------------------------------------

const REPETICAO_SUSPEITA = /([a-zà-ú])\1{2,}/i; // 3+ letras iguais seguidas
const CARACTERES_ESTRANHOS = /[^\p{L}\p{N}\s'’\-&.,]/u;

export interface AvisoOrtografico {
  temAviso: boolean;
  motivo?: string;
}

/**
 * Verifica se um texto curto tem padrões suspeitos de erro de digitação
 * (letras repetidas, caracteres inválidos). NUNCA bloqueia — apenas sugere
 * rever a escrita.
 */
export const verificarAvisoOrtografico = (texto: string): AvisoOrtografico => {
  const t = (texto || '').trim();
  if (!t) return { temAviso: false };
  if (REPETICAO_SUSPEITA.test(t)) {
    return { temAviso: true, motivo: 'letras repetidas em excesso — verifique a escrita' };
  }
  if (CARACTERES_ESTRANHOS.test(t)) {
    return { temAviso: true, motivo: 'caracteres inválidos — verifique a escrita' };
  }
  return { temAviso: false };
};

// ---------------------------------------------------------------------------
// Helper React-friendly: aplica a normalização apenas se mudou algo
// ---------------------------------------------------------------------------

export interface ResultadoNormalizacao {
  valor: string;
  alterado: boolean;
}

/** Aplica a função de normalização e devolve se houve alteração real. */
export const aplicarNormalizacao = (
  atual: string,
  normalizar: (t: string) => string,
): ResultadoNormalizacao => {
  const normalizado = normalizar(atual);
  return {
    valor: normalizado,
    alterado: normalizado !== atual,
  };
};
