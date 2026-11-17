/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Resolução de uma notificação → destino real (página ou correspondência).
 *
 * 2026-11-15 (pedido do dono): clicar numa notificação tem de abrir a respectiva
 * página. Antes, o destino era apenas `targetTab` — a instituição caía na lista
 * geral de Inquéritos, sem qualquer relação com a notificação clicada, e as
 * notificações de «Resposta ao Inquérito» não abriam a correspondência certa.
 *
 * Ordem de resolução (da mais específica para a mais genérica):
 *  1. `messageId` gravado na notificação (`dedupe_key` da nuvem) → abre a
 *     correspondência exacta;
 *  2. assunto citado no texto (entre « » ou parênteses) → abre a correspondência
 *     cujo assunto coincide;
 *  3. página indicada por `targetTab`.
 */
import type { AppNotification, Message } from '../types';
import { normalizarTexto } from './notificacoesAtalhos';

/** Assunto citado no texto da notificação («…» ou (…)), normalizado. */
export function assuntoCitado(mensagem: string): string {
  const texto = String(mensagem || '');
  const aspas = /[«"“']([^»"”']{3,160})[»"”']/.exec(texto);
  const alvo = aspas?.[1] || /\(([^)]{3,160})\)/.exec(texto)?.[1] || '';
  return normalizarTexto(alvo).replace(/^[^a-z0-9]*/, '').trim();
}

const assuntoDe = (m: Message): string =>
  String(m?.details?.subject || (m as any)?.subject || m?.preview || '');

export interface DestinoNotificacao {
  /** Correspondência concreta a abrir (quando resolvida). */
  mensagem?: Message;
  /** Página a mostrar quando não há correspondência concreta. */
  pagina: string;
  /** Motivo da escolha (auditoria/depuração e testes). */
  via: 'messageId' | 'assunto' | 'pagina';
}

export function resolverDestinoNotificacao(
  notificacao: Pick<AppNotification, 'title' | 'message' | 'targetTab' | 'messageId'>,
  candidatos: Message[],
  opcoes: { tabPorDefeito?: string } = {},
): DestinoNotificacao {
  const tab = String(notificacao.targetTab || opcoes.tabPorDefeito || 'home');
  const pagina = tab === 'mensagem' ? 'correspondencias' : tab;
  const lista = Array.isArray(candidatos) ? candidatos : [];

  // 1. vínculo directo gravado na nuvem
  if (notificacao.messageId) {
    const directo = lista.find((m) => Number(m?.id) === Number(notificacao.messageId));
    if (directo) return { mensagem: directo, pagina, via: 'messageId' };
  }

  // 2. assunto citado no texto da notificação
  const citado = assuntoCitado(notificacao.message || '');
  if (citado.length >= 3) {
    const porAssunto = lista.find((m) => {
      const assunto = normalizarTexto(assuntoDe(m)).replace(/^\[[^\]]*\]\s*/, '');
      if (assunto.length < 3) return false;
      return assunto === citado || assunto.includes(citado) || citado.includes(assunto);
    });
    if (porAssunto) return { mensagem: porAssunto, pagina, via: 'assunto' };
  }

  // 3. página genérica
  return { pagina, via: 'pagina' };
}
