// ============================================================================
// erroAmigavel — tradução de erros técnicos para mensagens compreensíveis
// (Auditoria UX v37.78 · §5/§6/§18)
// ----------------------------------------------------------------------------
// Regra: o utilizador comum NUNCA vê «Error 500 / Request Failed». O detalhe
// técnico fica registado na consola (diagnóstico) e a mensagem apresentada
// diz O QUE FALHOU e O QUE FAZER a seguir.
//
//   import { traduzirErro } from '../lib/erroAmigavel';
//   notify(traduzirErro(err, 'enviar a correspondência'), 'error', { ... });
// ============================================================================

/** §18 — frase única de sessão expirada, reutilizada em todo o sistema. */
export const MSG_SESSAO_EXPIRADA =
  'A sua sessão expirou por motivos de segurança. Saia e entre novamente para continuar.';

const semLigacao = (contexto: string) =>
  `Sem ligação à internet. Não foi possível ${contexto}. Os seus dados foram preservados — verifique a ligação e tente novamente.`;

const serviçoIndisponivel = (contexto: string) =>
  `O serviço está temporariamente indisponível. Não foi possível ${contexto}. O seu pedido não foi perdido — tente novamente dentro de momentos.`;

interface ErroNormalizado {
  texto: string;
  status?: number;
}

const normalizar = (e: unknown): ErroNormalizado => {
  if (!e) return { texto: '' };
  if (typeof e === 'number') return { texto: '', status: e };
  const s = String((e as any)?.message ?? e);
  const status = (e as any)?.status ?? (e as any)?.statusCode;
  return { texto: s, status: typeof status === 'number' ? status : undefined };
};

/**
 * Converte qualquer erro (fetch, HTTP, exceção) numa frase amigável em PT-PT.
 * `contexto` entra na frase: «Não foi possível enviar a correspondência…».
 * O erro original é registado na consola para diagnóstico interno (§5).
 */
export const traduzirErro = (e: unknown, contexto = 'concluir a operação'): string => {
  const { texto, status } = normalizar(e);
  try { console.warn('[CDA] Erro técnico (diagnóstico):', texto || e, status ? `HTTP ${status}` : ''); } catch { /* ignora */ }

  const t = texto.toLowerCase();
  const st = status ?? (t.match(/\b(401|403|404|408|429|500|502|503|504)\b/)?.[0] ? Number(t.match(/\b(401|403|404|408|429|500|502|503|504)\b/)![0]) : undefined);

  if (st === 401 || st === 403) return MSG_SESSAO_EXPIRADA;
  if (/failed to fetch|networkerror|net::err|fetch failed|load failed|offline|sem ligação|internet/.test(t)) {
    return typeof navigator !== 'undefined' && navigator.onLine === false
      ? semLigacao(contexto)
      : serviçoIndisponivel(contexto);
  }
  if (/timeout|abort|demorou/.test(t)) return `A operação demorou demasiado. Não foi possível ${contexto}. Verifique a sua ligação e tente novamente.`;
  if (st && st >= 500) return serviçoIndisponivel(contexto);
  if (st === 404) return `O registo pedido já não se encontra disponível (${contexto}). Atualize a lista e tente novamente.`;
  if (st === 429) return `Demasiadas tentativas seguidas. Aguarde alguns segundos antes de tentar ${contexto} novamente.`;
  if (/sessão|sessao|session|token|expirad/i.test(t)) return MSG_SESSAO_EXPIRADA;
  if (/json|parse|unexpected token/i.test(t)) return serviçoIndisponivel(contexto);

  // Erro desconhecido: mensagem genérica honesta, SEM detalhe técnico.
  return `Não foi possível ${contexto}. Verifique a sua ligação à internet e tente novamente.`;
};
