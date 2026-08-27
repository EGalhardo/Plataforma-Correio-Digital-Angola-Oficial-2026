/**
 * ordenacaoCronologica.ts — Ordenação cronológica DECRESCENTE das listas de
 * correspondência (2026-08-27).
 * ----------------------------------------------------------------------------
 * PROBLEMA
 *   O campo `date` dos itens é um RÓTULO DE APRESENTAÇÃO, não um carimbo
 *   temporal. Os mapeadores da nuvem produzem formatos diferentes consoante a
 *   caixa:
 *     · correio do cidadão / enviadas  → toLocaleDateString('pt-AO') = "20/05/2026"
 *     · caixa institucional            → toLocaleTimeString('pt-AO') = "14:35"
 *   e as seeds de demonstração usam rótulos relativos ("Hoje", "Ontem", "Seg",
 *   "Dom", "09:10"). Nenhum destes valores é interpretável de forma fiável:
 *   `new Date("20/05/2026")` devolve Invalid Date (o mês 20 não existe) e
 *   "14:35" perde o dia por completo.
 *
 *   Também não serve ordenar pelo `id`: os ids da nuvem são gerados em lote e
 *   NÃO são monótonos com `created_at` (verificado na base real: id
 *   1781799547568361 descodifica para 18/06 enquanto a linha é de 26/08, e
 *   ordenar por id DESC ≠ ordenar por created_at DESC em 826 mensagens).
 *
 * SOLUÇÃO
 *   1.º — carimpo bruto `createdAt` (ISO), preenchido pelos mapeadores da nuvem;
 *   2.º — na sua ausência, um rótulo de data completa (DD/MM/AAAA[ HH:MM]);
 *   3.º — sem nenhum dos dois, o comparador devolve 0 e o `Array.prototype.sort`
 *         (estável por especificação desde ES2019) preserva a ordem de origem,
 *         que nas seeds de demonstração já é a ordem pretendida — mais recente
 *         primeiro. Nunca embaralha o que não consegue datar.
 *
 * O resultado é sempre uma cópia nova: nunca muta a lista recebida.
 */
import type { Correspondence, Message } from '../types';

/**
 * Converte um rótulo de data de apresentação em milissegundos epoch.
 * Devolve `null` quando o rótulo não é uma data reconhecível (ex.: "Hoje",
 * "Ontem", "Seg", "14:35", "Recente") — o chamador trata `null` como
 * "ordem desconhecida" e preserva a posição relativa.
 */
export function carimboDeRotuloData(rotulo?: string | null): number | null {
  if (!rotulo) return null;
  const texto = String(rotulo).trim();
  if (!texto) return null;

  // ISO 8601 — "2026-08-26T18:47:37.900341+00:00" ou "2026-08-26"
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
    const t = Date.parse(texto);
    return Number.isNaN(t) ? null : t;
  }

  // DD/MM/AAAA opcionalmente seguido de hora — "20/05/2026" ou "20/05/2026 14:35"
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(texto);
  if (m) {
    const dia = Number(m[1]);
    const mes = Number(m[2]);
    const ano = Number(m[3]);
    const hora = m[4] === undefined ? 0 : Number(m[4]);
    const minuto = m[5] === undefined ? 0 : Number(m[5]);
    const segundo = m[6] === undefined ? 0 : Number(m[6]);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
    const t = new Date(ano, mes - 1, dia, hora, minuto, segundo).getTime();
    return Number.isNaN(t) ? null : t;
  }

  return null;
}

/**
 * Ordena uma lista por carimbo temporal DECRESCENTE (mais recente no topo,
 * mais antiga em baixo). Estável: itens sem carimbo reconhecível mantêm a
 * ordem relativa que traziam. Devolve uma cópia; não muta a lista recebida.
 */
export function ordenarPorMaisRecente<T>(
  lista: readonly T[],
  obterCarimbo: (item: T) => { criadoEm?: string | null; rotulo?: string | null },
): T[] {
  const decorados = lista.map((item) => {
    const fontes = obterCarimbo(item) || {};
    const bruto = fontes.criadoEm ? Date.parse(fontes.criadoEm) : NaN;
    const carimbo = Number.isNaN(bruto) ? carimboDeRotuloData(fontes.rotulo) : bruto;
    return { item, carimbo };
  });

  decorados.sort((a, b) => {
    // Sem carimbo reconhecível de um dos lados → 0 (ordem de origem preservada).
    if (a.carimbo === null || b.carimbo === null) return 0;
    return b.carimbo - a.carimbo;
  });

  return decorados.map((d) => d.item);
}

/** Correspondências (caixas de correio, documentos, enviadas, actividade). */
export function ordenarMensagensPorMaisRecente(lista: readonly Message[]): Message[] {
  return ordenarPorMaisRecente(lista, (m) => ({
    criadoEm: m?.createdAt,
    rotulo: m?.date,
  }));
}

/** Expedientes da Administração (histórico de correspondências gov). */
export function ordenarCorrespondenciasPorMaisRecente(lista: readonly Correspondence[]): Correspondence[] {
  return ordenarPorMaisRecente(lista, (c) => ({
    criadoEm: c?.createdAt,
    // `date` + `time` recompõem a data completa quando a hora está presente.
    rotulo: c?.time ? `${c.date} ${c.time}` : c?.date,
  }));
}
