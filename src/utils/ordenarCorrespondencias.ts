import type { Message } from '../types';

/**
 * v37.19 — ordenação das listas de correspondência (Lidas / Não Lidas / Enviadas):
 * mais recente no topo, menos recente no fim. O identificador da mensagem é
 * sequencial (maior = mais recente), pelo que serve de chave de ordenação.
 */
export const ordenarPorMaisRecente = (mensagens: Message[]): Message[] =>
  [...mensagens].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
