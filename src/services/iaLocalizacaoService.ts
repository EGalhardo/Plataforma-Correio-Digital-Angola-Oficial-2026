// ============================================================================
// Serviço de Sugestão de Localização por IA — Correio Digital Angola
// ----------------------------------------------------------------------------
// Fornece sugestões inteligentes contextuais para Província, Cidade,
// Município e Comuna (Lei n.º 14/24 - DPA Angola 2025) via IA (Gemini/Groq)
// com fallback resiliente instantâneo ao catálogo local partilhado.
// ============================================================================

import {
  MUNICIPALITIES_BY_PROVINCE,
  CITIES_BY_PROVINCE,
  COMMUNES_BY_MUNICIPALITY
} from '../config/institutionCatalog';

export interface LocalizacaoSugestoes {
  cidades: string[];
  municipios: string[];
  comunas: string[];
  origem: 'ia' | 'catalogo_local';
  explicacao?: string;
}

export interface LocalizacaoParams {
  provincia?: string;
  cidade?: string;
  municipio?: string;
  comuna?: string;
}

// Cache em memória para respostas instantâneas
const cacheLocalizacao = new Map<string, LocalizacaoSugestoes>();

const gerarChaveCache = (p: LocalizacaoParams): string => {
  return `${(p.provincia || '').trim()}|${(p.cidade || '').trim()}|${(p.municipio || '').trim()}|${(p.comuna || '').trim()}`.toLowerCase();
};

/**
 * Fallback local imediato baseado no catálogo institucional oficial de Angola
 */
export const obterSugestoesLocais = (params: LocalizacaoParams): LocalizacaoSugestoes => {
  const prov = params.provincia || '';
  const muni = params.municipio || '';

  const cidades = prov ? (CITIES_BY_PROVINCE[prov] || ['Sede']) : [];
  const municipios = prov ? (MUNICIPALITIES_BY_PROVINCE[prov] || []).filter(m => m !== 'Todos') : [];
  const comunas = muni ? (COMMUNES_BY_MUNICIPALITY[muni] || [`${muni} Sede`, 'Sede']) : [];

  return {
    cidades,
    municipios,
    comunas,
    origem: 'catalogo_local',
    explicacao: 'Divisão Político-Administrativa Oficial de Angola (Lei n.º 14/24)'
  };
};

/**
 * Consulta o endpoint de IA para obter sugestões contextuais
 */
export const consultarIaLocalizacao = async (
  params: LocalizacaoParams,
  abortSignal?: AbortSignal
): Promise<LocalizacaoSugestoes> => {
  const chave = gerarChaveCache(params);
  if (cacheLocalizacao.has(chave)) {
    return cacheLocalizacao.get(chave)!;
  }

  // Se nenhum campo foi passado, retorna vazio
  if (!params.provincia && !params.cidade && !params.municipio && !params.comuna) {
    return {
      cidades: [],
      municipios: [],
      comunas: [],
      origem: 'catalogo_local'
    };
  }

  try {
    const res = await fetch('/api/ia-localizacao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params),
      signal: abortSignal
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.ok) {
        const resultado: LocalizacaoSugestoes = {
          cidades: Array.isArray(data.cidades) && data.cidades.length > 0 ? data.cidades : (CITIES_BY_PROVINCE[params.provincia || ''] || ['Sede']),
          municipios: Array.isArray(data.municipios) && data.municipios.length > 0 ? data.municipios : (MUNICIPALITIES_BY_PROVINCE[params.provincia || ''] || []).filter(m => m !== 'Todos'),
          comunas: Array.isArray(data.comunas) && data.comunas.length > 0 ? data.comunas : (params.municipio ? (COMMUNES_BY_MUNICIPALITY[params.municipio] || [`${params.municipio} Sede`, 'Sede']) : []),
          origem: 'ia',
          explicacao: data.explicacao || 'Sugestão contextual por Inteligência Artificial'
        };
        cacheLocalizacao.set(chave, resultado);
        return resultado;
      }
    }
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      console.warn('[IA-LOCALIZACAO] Falha na chamada da IA, a usar catálogo local:', err?.message || err);
    }
  }

  // Fallback robusto
  const fallback = obterSugestoesLocais(params);
  cacheLocalizacao.set(chave, fallback);
  return fallback;
};
