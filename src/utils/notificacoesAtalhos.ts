import type { AppNotification, Message } from '../types';
import { listarParticipacao, temInqueritoNormal, temInqueritoIA } from './listasParticipacao';
import { ehAssuntoDenuncia, ehAssuntoNovaDenuncia } from '../services/denunciaCore';
// 2026-09-23 (T-v37.79) — 'nova-denuncia': 5.º atalho do Painel («Denuncia»).
export type AtalhoPainel = 'video-atendimento' | 'inqueritos' | 'ocorrencias' | 'denuncias' | 'nova-denuncia';
export type ContagensAtalhos = Record<AtalhoPainel, number>;
/** Domínios com correspondências/notificações (ocorrências vêm da API própria). */
export type TipoDominio = Exclude<AtalhoPainel, 'ocorrencias'>;
export type TipoLista = 'inqueritos' | 'denuncias' | 'nova-denuncia';

const normalizar = (s: string) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
/** Normalização partilhada (ciclo de vida v37.78.28 usa a mesma regra). */
export const normalizarTexto = (s: string): string => normalizar(s);

export const isVideoAtendimentoMessage = (m: Message): boolean => {
  if ((m.details?.actions || []).includes('video-atendimento')) return true;
  if ((m.details as any)?.type === 'video-session' || (m.details as any)?.type === 'video') return true;
  const texto = normalizar(`${m.details?.subject || ''} ${m.preview || ''}`);
  return texto.includes('video-atendimento') || texto.includes('videoatendimento') || texto.includes('videochamada') || texto.includes('videoconferencia');
};

export const isInqueritoMessage = (m: Message): boolean => {
  if (temInqueritoNormal(m) || temInqueritoIA(m)) return true;
  const texto = normalizar(`${m.details?.subject || ''} ${m.preview || ''}`);
  return texto.includes('inquerito') || texto.includes('sondagem');
};

export const isOcorrenciaMessage = (m: Message): boolean => {
  if ((m.details?.actions || []).includes('ocorrencia') || (m.details?.actions || []).includes('ocorrencias')) return true;
  if ((m.details as any)?.type === 'ocorrencia' || (m.details as any)?.type === 'ocorrencias') return true;
  const texto = normalizar(`${m.details?.subject || ''} ${m.preview || ''}`);
  return texto.includes('ocorrencia') || texto.includes('[gps]');
};

export const isNovaDenunciaMessage = (m: Message): boolean => {
  return ehAssuntoNovaDenuncia(m.details?.subject || m.preview);
};

export const isReclamacaoDenunciaMessage = (m: Message): boolean => {
  return ehAssuntoDenuncia(m.details?.subject || m.preview);
};

/** Assunto canónico de correspondência (mesma regra do ciclo de vida v37.78.28:
 *  retira o prefixo [ETIQUETA] para ligar «Denúncia — Em análise» à mensagem). */
export const assuntoChave = (m: Message): string =>
  normalizar((m.details?.subject ?? (m as unknown as { preview?: string }).preview) || '')
    .replace(/^\[[^\]]*\]\s*/, '').trim();

/** 1) Classificação directa por alvo+título (sem mensagens). */
export function tipoPorAlvoTitulo(n: AppNotification): TipoDominio | undefined {
  const target = n.targetTab;
  const titulo = normalizar(n.title);
  if (['video-atendimento', 'inst-video'].includes(target)) return 'video-atendimento';
  if (target === 'denuncias' || /denuncia/.test(titulo)) return 'denuncias';
  if (['inqueritos', 'sondagens'].includes(target) || /inquerito|sondagem/.test(titulo)) return 'inqueritos';
  return undefined;
}

export interface PoolMensagens { tipo: TipoLista; m: Message; funde: boolean }

/** 2) Associação notificação→mensagem por assunto (mesma regra do ciclo de vida).
 *  `funde` indica caixa de ENTRADA (alerta+mensagem valem 1 novidade) vs
 *  ENVIADAS (recibo de leitura — o aviso conta sempre, nunca funde). */
export function associarMensagem(
  n: AppNotification, pools: PoolMensagens[],
): PoolMensagens | undefined {
  return pools.find(({ m }) => {
    const assunto = assuntoChave(m);
    return assunto.length >= 5 && normalizar(n.message).includes(assunto);
  });
}

/** 2026-09-23 (T-v37.79) — desambigua «Denúncia» (Livro, acentuada) e
 *  «Denuncia» (nova fila, sem acento) usando o TÍTULO CRU (pré-normalização):
 *  a normalização retira acentos e tornaria as duas iguais. */
function familiaDenunciaPorTituloCru(tituloRaw: string): 'denuncias' | 'nova-denuncia' {
  return /denúncia/i.test(tituloRaw) ? 'denuncias' : 'nova-denuncia';
}

/** Classificação completa: alvo+título, com fallback «correspondencias»→assunto. */
export function classificarNotificacao(
  n: AppNotification, pools: PoolMensagens[],
): TipoDominio | undefined {
  const direto = tipoPorAlvoTitulo(n);
  if (direto === 'denuncias') {
    // A família certa vem 1) da mensagem associada por assunto (fase do
    // cronograma carrega o assunto na notificação) e 2) do título cru.
    const assoc = associarMensagem(n, pools.filter(({ tipo }) => tipo === 'denuncias' || tipo === 'nova-denuncia'));
    if (assoc) return assoc.tipo;
    return familiaDenunciaPorTituloCru(String(n.title || ''));
  }
  if (direto) return direto;
  if (n.targetTab === 'correspondencias') return associarMensagem(n, pools)?.tipo;
  return undefined;
}

/** Pools por papel — fonte única usada pelo contador E pelas listas.
 *  Cidadão: inquéritos na caixa de ENTRADA, denúncias nas ENVIADAS.
 *  Instituição: ambos na caixa de ENTRADA (inquéritos nunca: a caixa recebe
 *  ecos das próprias difusões, não respostas — respostas vivem em Resultados). */
export function poolsPorPapel(inbox: Message[], enviadas: Message[], institucional: boolean): PoolMensagens[] {
  const inq: PoolMensagens[] = (institucional ? [] : listarParticipacao(inbox, 'inqueritos'))
    .map(m => ({ tipo: 'inqueritos' as const, m, funde: true }));
  const den = listarParticipacao(institucional ? inbox : enviadas, 'denuncias')
    .map(m => ({ tipo: 'denuncias' as const, m, funde: institucional }));
  // 2026-09-23 (T-v37.79) — pool da nova fila «Denuncia» (mesma regra de papel).
  const nov = listarParticipacao(institucional ? inbox : enviadas, 'nova-denuncia')
    .map(m => ({ tipo: 'nova-denuncia' as const, m, funde: institucional }));
  return [...inq, ...den, ...nov];
}

/** Contar novidades recebidas, nunca totais de processos ou mensagens enviadas. */
export function contarNotificacoesAtalhos(
  notificacoes: AppNotification[], inbox: Message[], institucional: boolean,
  ocorrencias = 0, enviadas: Message[] = [],
): ContagensAtalhos {
  const isNaoLida = (m: Message) => Boolean(m.unread && m.status !== 'Lida' && m.status !== 'lida');
  const naoLidas = (inbox || []).filter(isNaoLida);

  const counts: ContagensAtalhos = {
    'video-atendimento': naoLidas.filter(isVideoAtendimentoMessage).length,
    'inqueritos': naoLidas.filter(isInqueritoMessage).length,
    'ocorrencias': naoLidas.filter(isOcorrenciaMessage).length + (institucional ? 0 : (ocorrencias || 0)),
    'nova-denuncia': naoLidas.filter(isNovaDenunciaMessage).length,
    'denuncias': naoLidas.filter(isReclamacaoDenunciaMessage).length,
  };

  // Na Área Institucional, as opções do painel (vídeo-atendimento, inquérito,
  // ocorrência, denúncia e reclamação) SÓ apresentam badge com base em
  // correspondências recebidas na caixa de entrada que ainda não foram lidas.
  if (institucional) {
    return counts;
  }

  // Na Área do Cidadão, além das correspondências não lidas na caixa, adiciona
  // notificações de sistema pendentes que ainda não estejam fundidas.
  const pools = poolsPorPapel(inbox, enviadas, false);
  const vistos = new Set<number>();
  for (const n of notificacoes) {
    if (n.unread === false || vistos.has(n.id)) continue;
    vistos.add(n.id);
    const tipo = classificarNotificacao(n, pools);
    if (!tipo) continue;
    const associada = associarMensagem(n, pools);
    if (associada?.tipo === tipo && associada.funde && associada.m.unread) continue;
    counts[tipo]++;
  }

  return counts;
}

export interface NovidadeItem { naoLida: boolean; atualizacoes: number }
export interface NovidadesLista { porMensagem: Map<number, NovidadeItem>; orfas: number }

/** Novidades por item de uma lista (Inquéritos/Denúncias) — soma EXACTA do badge:
 *  cada mensagem não lida (entrada) vale 1; cada aviso não lido ligado vale 1,
 *  excepto fundido na mensagem não lida; avisos sem mensagem são `orfas`. */
export function novidadesPorMensagem(
  notificacoes: AppNotification[], mensagens: Message[],
  tipoLista: TipoLista, fundeNaoLidas: boolean,
): NovidadesLista {
  const porMensagem = new Map<number, NovidadeItem>();
  const pools: PoolMensagens[] = mensagens.map(m => ({ tipo: tipoLista, m, funde: fundeNaoLidas }));
  const vistos = new Set<number>();
  let orfas = 0;
  for (const n of notificacoes) {
    if (n.unread === false || vistos.has(n.id)) continue;
    vistos.add(n.id);
    if (classificarNotificacao(n, pools) !== tipoLista) continue;
    const assoc = associarMensagem(n, pools);
    if (!assoc) { orfas++; continue; }
    if (assoc.funde && assoc.m.unread) continue; // fundida na «Não lida» da mensagem
    const cur = porMensagem.get(assoc.m.id) || { naoLida: false, atualizacoes: 0 };
    cur.atualizacoes++;
    porMensagem.set(assoc.m.id, cur);
  }
  for (const m of mensagens) {
    if (fundeNaoLidas && m.unread) {
      const cur = porMensagem.get(m.id) || { naoLida: false, atualizacoes: 0 };
      cur.naoLida = true;
      porMensagem.set(m.id, cur);
    }
  }
  return { porMensagem, orfas };
}

export interface SessaoVideoLite { id: string; subject?: string | null }

/** Liga avisos de vídeo-atendimento às sessões pelo assunto citado («…»)
 *  com fallback ao assunto normalizado contido na mensagem. */
export function ligarNotificacoesSessoes(
  notificacoes: AppNotification[], sessoes: SessaoVideoLite[],
): Map<string, number[]> {
  const ligadas = new Map<string, number[]>();
  const vistos = new Set<number>();
  for (const n of notificacoes) {
    if (n.unread === false || vistos.has(n.id)) continue;
    if (tipoPorAlvoTitulo(n) !== 'video-atendimento') continue;
    vistos.add(n.id);
    const texto = String(n.message || '');
    const citada = /[«"“]([^«"”]+)[»"”]/.exec(texto)?.[1]?.trim();
    const sessao = sessoes.find(s => {
      const assunto = normalizar(s.subject || '').trim();
      if (assunto.length < 3) return false;
      if (citada && normalizar(citada) === assunto) return true;
      if (citada && assunto.length >= 5 && (normalizar(citada).includes(assunto) || assunto.includes(normalizar(citada)))) return true;
      return assunto.length >= 5 && normalizar(texto).includes(assunto);
    });
    if (!sessao) continue;
    const cur = ligadas.get(sessao.id) || [];
    cur.push(n.id);
    ligadas.set(sessao.id, cur);
  }
  return ligadas;
}
