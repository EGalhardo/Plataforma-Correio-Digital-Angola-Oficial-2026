import type { AppNotification, Message } from '../types';
import { listarParticipacao, temInqueritoNormal, temInqueritoIA } from './listasParticipacao';
import { ehAssuntoDenuncia, ehAssuntoNovaDenuncia, ehAssuntoComunicado } from '../services/denunciaCore';

// 2026-09-23 (T-v37.79) — 'nova-denuncia': 5.º atalho do Painel («Denuncia»).
// 2026-10-01 — 'comunicados': 3.º atalho do Painel («Comunicados»).
export type AtalhoPainel = 'video-atendimento' | 'inqueritos' | 'comunicados' | 'ocorrencias' | 'nova-denuncia' | 'denuncias';
export type ContagensAtalhos = Record<AtalhoPainel, number>;
/** Domínios com correspondências/notificações (ocorrências vêm da API própria). */
export type TipoDominio = Exclude<AtalhoPainel, 'ocorrencias'>;
export type TipoLista = 'inqueritos' | 'denuncias' | 'nova-denuncia' | 'comunicados';

const normalizar = (s: string) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
/** Normalização partilhada (ciclo de vida v37.78.28 usa a mesma regra). */
export const normalizarTexto = (s: string): string => normalizar(s);

/**
 * Invariante de Leitura (Exclusão Mútua):
 * Uma correspondência é considerada Lida quando unread <= 0 ou o status for 'Lida'/'Lido'/'Visualizada'.
 * Nunca pode coexistir em 'Não Lidas' se for 'Lida'.
 */
export function isMensagemLida(m: Message | any): boolean {
  if (!m) return true;
  if (!m.unread || m.unread === 0 || m.unread === false) return true;
  const st = String(m.status || '').toLowerCase().trim();
  if (st === 'lida' || st === 'lido' || st === 'visualizada' || st === 'visualizado' || st === 'arquivada' || st === 'arquivado') return true;
  return false;
}

export function isMensagemNaoLida(m: Message | any): boolean {
  return !isMensagemLida(m);
}

export const isVideoAtendimentoMessage = (m: Message): boolean => {
  if (!m) return false;
  if ((m.details?.actions || []).some(a => String(a).toLowerCase().includes('video-atendimento') || String(a).toLowerCase().includes('video'))) return true;
  if ((m.details as any)?.type === 'video-session' || (m.details as any)?.type === 'video' || (m.details as any)?.type === 'video-atendimento') return true;
  const texto = normalizar(`${m.details?.subject || ''} ${m.preview || ''} ${m.details?.body || ''}`);
  return texto.includes('video-atendimento') ||
         texto.includes('videoatendimento') ||
         texto.includes('videochamada') ||
         texto.includes('videoconferencia') ||
         texto.includes('video atendimento') ||
         texto.includes('vídeo atendimento') ||
         texto.includes('video chamada') ||
         texto.includes('vídeo chamada') ||
         texto.includes('video-chamada');
};

export const isInqueritoMessage = (m: Message): boolean => {
  if (!m) return false;
  if (temInqueritoNormal(m) || temInqueritoIA(m)) return true;
  if ((m.details as any)?.type === 'sondagem' || (m.details as any)?.type === 'inquerito' || (m.details as any)?.type === 'inqueritos') return true;
  if ((m.details?.actions || []).some(a => /sondagem|inquerito/i.test(String(a)))) return true;
  const texto = normalizar(`${m.details?.subject || ''} ${m.preview || ''} ${m.details?.body || ''}`);
  return texto.includes('inquerito') ||
         texto.includes('sondagem') ||
         texto.includes('questionario') ||
         texto.includes('pesquisa de satisfacao') ||
         texto.includes('inquerito de opiniao');
};

export const isOcorrenciaMessage = (m: Message): boolean => {
  if (!m) return false;
  if ((m.details?.actions || []).some(a => /ocorrencia/i.test(String(a)))) return true;
  if ((m.details as any)?.type === 'ocorrencia' || (m.details as any)?.type === 'ocorrencias') return true;
  const texto = normalizar(`${m.details?.subject || ''} ${m.preview || ''} ${m.details?.body || ''}`);
  return texto.includes('ocorrencia') ||
         texto.includes('[gps]') ||
         texto.includes('incidente') ||
         texto.includes('relato de ocorrencia') ||
         texto.includes('registo de ocorrencia');
};

export const isNovaDenunciaMessage = (m: Message): boolean => {
  if (!m) return false;
  if (ehAssuntoNovaDenuncia(m.details?.subject || m.preview)) return true;
  if ((m.details as any)?.type === 'nova-denuncia') return true;
  if ((m.details?.actions || []).some(a => /nova-denuncia/i.test(String(a)))) return true;
  const texto = normalizar(`${m.details?.subject || ''} ${m.preview || ''} ${m.details?.body || ''}`);
  return texto.includes('[registo de denuncia]') ||
         texto.includes('[nova denuncia]') ||
         texto.includes('denuncia anonima') ||
         texto.includes('denuncia publica') ||
         (texto.includes('denuncia') && !texto.includes('reclamacao') && !texto.includes('livro'));
};

export const isComunicadoMessage = (m: Message): boolean => {
  if (!m) return false;
  if (ehAssuntoComunicado(m.details?.subject || m.preview)) return true;
  if ((m.details as any)?.type === 'comunicado' || (m.details as any)?.type === 'comunicados') return true;
  if (m.details?.category === 'Comunicado Oficial' || m.details?.category === 'Comunicado') return true;
  if ((m.details?.actions || []).some(a => /comunicado/i.test(String(a)))) return true;
  const texto = normalizar(`${m.details?.subject || ''} ${m.preview || ''} ${m.details?.body || ''}`);
  return texto.includes('[comunicado oficial]') ||
         texto.includes('[comunicado]') ||
         texto.includes('comunicado oficial') ||
         texto.includes('comunicado de imprensa') ||
         texto.includes('comunicado publico');
};

export const isReclamacaoDenunciaMessage = (m: Message): boolean => {
  if (!m) return false;
  if (ehAssuntoDenuncia(m.details?.subject || m.preview)) return true;
  if ((m.details as any)?.type === 'reclamacao' || (m.details as any)?.type === 'denuncias' || (m.details as any)?.type === 'livro-reclamacoes') return true;
  if ((m.details?.actions || []).some(a => /reclamacao|denuncias/i.test(String(a)))) return true;
  const texto = normalizar(`${m.details?.subject || ''} ${m.preview || ''} ${m.details?.body || ''}`);
  return texto.includes('reclamacao') ||
         texto.includes('livro de reclamacoes') ||
         texto.includes('[denuncia]') ||
         texto.includes('queixa');
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
  if (target === 'comunicados' || /comunicado/.test(titulo)) return 'comunicados';
  if (target === 'denuncias' || target === 'nova-denuncia' || /denuncia|reclamacao|queixa/.test(titulo)) {
    return familiaDenunciaPorTituloCru(String(n.title || ''));
  }
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
  if (n.messageId) {
    const byId = pools.find(({ m }) => m.id === n.messageId);
    if (byId) return byId;
  }
  const nMsg = normalizar(n.message || '');
  const nTit = normalizar(n.title || '');
  return pools.find(({ m }) => {
    if (m.id && n.messageId && m.id === n.messageId) return true;
    const assunto = assuntoChave(m);
    if (assunto.length >= 4 && (nMsg.includes(assunto) || nTit.includes(assunto))) return true;
    const fullSubj = normalizar(m.details?.subject || m.preview || '');
    if (fullSubj.length >= 4 && (nMsg.includes(fullSubj) || nTit.includes(fullSubj))) return true;
    return false;
  });
}

/** 2026-09-23 (T-v37.79) — desambigua «Denúncia» (Livro, acentuada) e
 *  «Denuncia» (nova fila, sem acento) usando o TÍTULO CRU (pré-normalização):
 *  a normalização retira acentos e tornaria as duas iguais. */
function familiaDenunciaPorTituloCru(tituloRaw: string): 'denuncias' | 'nova-denuncia' {
  if (/reclama/i.test(tituloRaw) || /denúncia/i.test(tituloRaw) || /livro/i.test(tituloRaw)) {
    return 'denuncias';
  }
  return 'nova-denuncia';
}

/** Classificação completa: alvo+título, com fallback «correspondencias»→assunto. */
export function classificarNotificacao(
  n: AppNotification, pools: PoolMensagens[],
): TipoDominio | undefined {
  const direto = tipoPorAlvoTitulo(n);
  if (direto === 'comunicados') return 'comunicados';
  if (direto === 'denuncias' || direto === 'nova-denuncia') {
    const assoc = associarMensagem(n, pools.filter(({ tipo }) => tipo === 'denuncias' || tipo === 'nova-denuncia'));
    if (assoc) return assoc.tipo;
    return familiaDenunciaPorTituloCru(String(n.title || ''));
  }
  if (direto) return direto;
  if (n.targetTab === 'correspondencias' || n.targetTab === 'mensagem') return associarMensagem(n, pools)?.tipo;
  return undefined;
}

/** Pools por papel — fonte única usada pelo contador E pelas listas. */
export function poolsPorPapel(inbox: Message[], enviadas: Message[], institucional: boolean): PoolMensagens[] {
  const inq: PoolMensagens[] = (institucional ? [] : listarParticipacao(inbox, 'inqueritos'))
    .map(m => ({ tipo: 'inqueritos' as const, m, funde: true }));
  const den = listarParticipacao(institucional ? inbox : enviadas, 'denuncias')
    .map(m => ({ tipo: 'denuncias' as const, m, funde: institucional }));
  const nov = listarParticipacao(institucional ? inbox : enviadas, 'nova-denuncia')
    .map(m => ({ tipo: 'nova-denuncia' as const, m, funde: institucional }));
  const com = listarParticipacao(institucional ? [...enviadas, ...inbox] : inbox, 'comunicados')
    .map(m => ({ tipo: 'comunicados' as const, m, funde: true }));
  return [...inq, ...den, ...nov, ...com];
}

/**
 * Contagem rigorosa de correspondências e notificações não lidas para os 6 atalhos do Painel:
 */
export function contarNotificacoesAtalhos(
  notificacoes: AppNotification[] = [],
  inbox: Message[] = [],
  institucional = false,
  ocorrencias = 0,
  enviadas: Message[] = [],
): ContagensAtalhos {
  const naoLidas = (inbox || []).filter(isMensagemNaoLida);
  const enviadasNaoLidas = (enviadas || []).filter(isMensagemNaoLida);
  const notifsNaoLidas = (notificacoes || []).filter(n => n && n.unread !== false);

  const baseDenuncias = listarParticipacao(institucional ? inbox : enviadas, 'denuncias');
  const baseNovaDenuncia = listarParticipacao(institucional ? inbox : enviadas, 'nova-denuncia');
  const baseInqueritos = listarParticipacao(inbox, 'inqueritos');
  const baseComunicados = listarParticipacao(institucional ? [...enviadas, ...inbox] : inbox, 'comunicados');
  const todosPools = poolsPorPapel(inbox, enviadas, institucional);

  const novidadesDenuncias = novidadesPorMensagem(notifsNaoLidas, baseDenuncias, 'denuncias', true, todosPools);
  const totalNovidadesDenuncias = Array.from(novidadesDenuncias.porMensagem.values())
    .reduce((acc, cur) => acc + (cur.naoLida ? 1 : 0) + cur.atualizacoes, 0) + novidadesDenuncias.orfas;

  const novidadesNovaDenuncia = novidadesPorMensagem(notifsNaoLidas, baseNovaDenuncia, 'nova-denuncia', true, todosPools);
  const totalNovidadesNovaDenuncia = Array.from(novidadesNovaDenuncia.porMensagem.values())
    .reduce((acc, cur) => acc + (cur.naoLida ? 1 : 0) + cur.atualizacoes, 0) + novidadesNovaDenuncia.orfas;

  const novidadesInqueritos = novidadesPorMensagem(notifsNaoLidas, baseInqueritos, 'inqueritos', true, todosPools);
  const totalNovidadesInqueritos = Array.from(novidadesInqueritos.porMensagem.values())
    .reduce((acc, cur) => acc + (cur.naoLida ? 1 : 0) + cur.atualizacoes, 0) + novidadesInqueritos.orfas;

  const novidadesComunicados = novidadesPorMensagem(notifsNaoLidas, baseComunicados, 'comunicados', true, todosPools);
  const totalNovidadesComunicados = Array.from(novidadesComunicados.porMensagem.values())
    .reduce((acc, cur) => acc + (cur.naoLida ? 1 : 0) + cur.atualizacoes, 0) + novidadesComunicados.orfas;

  const notifsVideo = notifsNaoLidas.filter(n => tipoPorAlvoTitulo(n) === 'video-atendimento').length;
  const videoMsgs = naoLidas.filter(isVideoAtendimentoMessage).length;

  const counts: ContagensAtalhos = {
    'video-atendimento': Math.max(videoMsgs, notifsVideo),
    'inqueritos': Math.max(naoLidas.filter(isInqueritoMessage).length, totalNovidadesInqueritos),
    'comunicados': Math.max(naoLidas.filter(isComunicadoMessage).length, totalNovidadesComunicados),
    'ocorrencias': Math.max(ocorrencias, naoLidas.filter(isOcorrenciaMessage).length),
    'nova-denuncia': Math.max(
      naoLidas.filter(isNovaDenunciaMessage).length + (!institucional ? enviadasNaoLidas.filter(isNovaDenunciaMessage).length : 0),
      totalNovidadesNovaDenuncia
    ),
    'denuncias': Math.max(
      naoLidas.filter(isReclamacaoDenunciaMessage).length + (!institucional ? enviadasNaoLidas.filter(isReclamacaoDenunciaMessage).length : 0),
      totalNovidadesDenuncias
    ),
  };

  return counts;
}

/**
 * Lista consolidada de todas as correspondências e notificações não lidas.
 * Assegura PARIDADE 1:1 rigorosa com o badge da foto de perfil (Avatar) e o seu menu dropdown.
 */
export function obterListaCorrespondenciasNaoLidas(
  inbox: Message[] = [],
  enviadas: Message[] = [],
  institucional = false,
  deletedIds: number[] = [],
  hiddenIds: number[] = [],
  notificacoes: AppNotification[] = [],
  ocorrencias = 0,
  biKey = '',
): Message[] {
  const isExcluded = (m: Message) => !m || deletedIds.includes(m.id) || hiddenIds.includes(m.id);
  const unreadInbox = (inbox || []).filter(m => !isExcluded(m) && isMensagemNaoLida(m));
  const unreadSent = !institucional
    ? (enviadas || []).filter(m => !isExcluded(m) && isMensagemNaoLida(m))
    : [];

  const baseMsgs = [...unreadInbox, ...unreadSent];
  const msgIds = new Set(baseMsgs.map(m => m.id));
  const todosPools = poolsPorPapel(inbox, enviadas, institucional);

  // Notificações genuinamente NÃO lidas que não estão associadas a uma mensagem já não-lida na lista
  const notifsNaoLidas = (notificacoes || []).filter(n => n && n.unread !== false);
  const notifsExtras: Message[] = [];

  for (const n of notifsNaoLidas) {
    if (n.messageId && msgIds.has(n.messageId)) continue;
    const assoc = associarMensagem(n, todosPools);
    if (assoc && assoc.m && msgIds.has(assoc.m.id)) continue;

    const notifMsgItem: Message = {
      id: typeof n.id === 'number' ? n.id : (99000000 + Math.floor(Math.random() * 999999)),
      org: n.title || 'Notificação Oficial',
      preview: n.message || n.title || 'Nova atualização',
      date: n.time || 'Hoje',
      unread: 1,
      status: 'Não Lida',
      recipientBi: biKey,
      details: {
        subject: n.title || 'Notificação Oficial',
        body: n.message || '',
        category: n.targetTab || 'Notificação',
        actions: ['Abrir']
      },
      ...({
        isNotificationItem: true,
        originalNotification: n,
        targetTab: n.targetTab || 'notificacoes'
      } as any)
    };
    notifsExtras.push(notifMsgItem);
  }

  return [...baseMsgs, ...notifsExtras];
}

/**
 * 2026-10-01 — Cálculo Canónico Unificado de Correspondências e Notificações Não Lidas:
 * Garante harmonia e sincronia 100% perfeita entre:
 * 1. Badge do Avatar / Foto de Perfil (Header)
 * 2. Contador do Painel («Novas Mensagens - Não Lidas»)
 * 3. Menu Dropdown da Foto de Perfil (Count(Badge) === Total Itens no Dropdown)
 * 4. Fila e Listagens Temáticas (Inquéritos, Comunicados, Ocorrências, Denúncias, Livro de Reclamações)
 */
export function calcularTotalCorrespondenciasNaoLidas(
  notificacoes: AppNotification[] = [],
  inbox: Message[] = [],
  enviadas: Message[] = [],
  institucional = false,
  ocorrencias = 0,
  deletedIds: number[] = [],
  hiddenIds: number[] = [],
  biKey = '',
): number {
  return obterListaCorrespondenciasNaoLidas(
    inbox,
    enviadas,
    institucional,
    deletedIds,
    hiddenIds,
    notificacoes,
    ocorrencias,
    biKey
  ).length;
}

export interface NovidadeItem { naoLida: boolean; atualizacoes: number }
export interface NovidadesLista { porMensagem: Map<number, NovidadeItem>; orfas: number }

/** Novidades por item de uma lista (Inquéritos/Denúncias) */
export function novidadesPorMensagem(
  notificacoes: AppNotification[], mensagens: Message[],
  tipoLista: TipoLista, fundeNaoLidas: boolean,
  poolsContexto?: PoolMensagens[],
): NovidadesLista {
  const porMensagem = new Map<number, NovidadeItem>();
  const pools: PoolMensagens[] = mensagens.map(m => ({ tipo: tipoLista, m, funde: fundeNaoLidas }));
  const contextPools = poolsContexto || pools;
  const vistos = new Set<number>();
  let orfas = 0;
  for (const n of notificacoes) {
    if (n.unread === false || vistos.has(n.id)) continue;
    vistos.add(n.id);
    if (classificarNotificacao(n, contextPools) !== tipoLista) continue;
    const assoc = associarMensagem(n, pools);
    if (!assoc) { orfas++; continue; }
    if (assoc.funde && isMensagemNaoLida(assoc.m)) continue;
    const cur = porMensagem.get(assoc.m.id) || { naoLida: false, atualizacoes: 0 };
    cur.atualizacoes++;
    porMensagem.set(assoc.m.id, cur);
  }
  for (const m of mensagens) {
    if (fundeNaoLidas && isMensagemNaoLida(m)) {
      const cur = porMensagem.get(m.id) || { naoLida: false, atualizacoes: 0 };
      cur.naoLida = true;
      porMensagem.set(m.id, cur);
    }
  }
  return { porMensagem, orfas };
}

export interface SessaoVideoLite { id: string; subject?: string | null }

/** Liga avisos de vídeo-atendimento às sessões pelo assunto citado */
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
    const m = texto.match(/«([^»]+)»/);
    const citado = m ? normalizar(m[1]) : '';
    const encontrado = sessoes.find(s => {
      const sub = normalizar(s.subject || '');
      if (citado && sub.includes(citado)) return true;
      if (sub.length >= 5 && normalizar(texto).includes(sub)) return true;
      return false;
    });
    if (!encontrado) continue;
    const cur = ligadas.get(encontrado.id) || [];
    cur.push(n.id);
    ligadas.set(encontrado.id, cur);
  }
  return ligadas;
}
