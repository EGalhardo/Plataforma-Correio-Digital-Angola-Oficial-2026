import type { AppNotification, Message } from '../types';
import { listarParticipacao } from './listasParticipacao';
export type AtalhoPainel = 'video-atendimento' | 'inqueritos' | 'ocorrencias' | 'denuncias';
export type ContagensAtalhos = Record<AtalhoPainel, number>;
const normalizar = (s: string) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
/** Contar novidades recebidas, nunca totais de processos ou mensagens enviadas. */
export function contarNotificacoesAtalhos(notificacoes: AppNotification[], inbox: Message[], institucional: boolean, ocorrencias = 0): ContagensAtalhos {
  const counts: ContagensAtalhos = {'video-atendimento': 0, inqueritos: 0, ocorrencias, denuncias: 0};
  const mensagens = {
    inqueritos: institucional ? [] : listarParticipacao(inbox, 'inqueritos'),
    denuncias: institucional ? listarParticipacao(inbox, 'denuncias') : [],
  };
  const pendentes = new Set<string>();
  for (const tipo of ['inqueritos', 'denuncias'] as const) {
    for (const m of mensagens[tipo]) if (m.unread) pendentes.add(`${tipo}:mensagem:${m.id}`);
  }
  const vistos = new Set<number>();
  for (const n of notificacoes) {
    if (n.unread === false || vistos.has(n.id)) continue;
    vistos.add(n.id);
    const target = n.targetTab;
    const titulo = normalizar(n.title);
    let tipo: Exclude<AtalhoPainel, 'ocorrencias'> | undefined;
    if (['video-atendimento', 'inst-video'].includes(target)) tipo = 'video-atendimento';
    else if (target === 'denuncias' || /denuncia/.test(titulo)) tipo = 'denuncias';
    else if (['inqueritos', 'sondagens'].includes(target) || /inquerito|sondagem/.test(titulo)) tipo = 'inqueritos';
    // Correspondências com inquérito/denúncia podem ter notificações genéricas.
    const associada = (['inqueritos', 'denuncias'] as const).flatMap(t => mensagens[t].map(m => ({tipo: t, m}))).find(({m}) => {
      const assunto = normalizar(m.details?.subject || m.preview || '').replace(/^\[[^\]]*\]\s*/, '').trim();
      return assunto.length >= 5 && normalizar(n.message).includes(assunto);
    });
    if (!tipo && target === 'correspondencias') tipo = associada?.tipo;
    if (!tipo) continue;
    // O alerta e a correspondência que o originou representam uma novidade.
    if (associada?.tipo === tipo && associada.m.unread) continue;
    pendentes.add(`${tipo}:notificacao:${n.id}`);
  }
  for (const key of pendentes) counts[key.split(':')[0] as AtalhoPainel]++;
  return counts;
}
