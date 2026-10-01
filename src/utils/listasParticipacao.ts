import type { Message } from '../types';
import { ehAssuntoDenuncia, ehAssuntoNovaDenuncia, ehAssuntoComunicado } from '../services/denunciaCore';
import { correspondePesquisa } from './pesquisaContactosCorreio';

export const temInqueritoNormal = (m: Message) => Boolean(m.sondagem_id || m.sondagem_ids?.length);
export const temInqueritoIA = (m: Message) => Boolean(m.inquerito_ia_id || m.inquerito_ia_ids?.length);

const normalizar = (s: string) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const isInqueritoTexto = (m: Message): boolean => {
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

// 2026-09-23 (T-v37.79) — «nova-denuncia»: nova fila «Denuncia» do Painel.
// 2026-10-01 — «comunicados»: nova fila de «Comunicados Oficiais» do Estado.
export function listarParticipacao(
  messages: Message[],
  tipo: 'inqueritos' | 'denuncias' | 'nova-denuncia' | 'comunicados',
  query = '',
  anonimizar = false
): Message[] {
  return messages.filter(m => {
    const pertence = tipo === 'inqueritos'
      ? isInqueritoTexto(m)
      : tipo === 'nova-denuncia'
        ? ehAssuntoNovaDenuncia(m.details?.subject || m.preview)
        : tipo === 'comunicados'
          ? (ehAssuntoComunicado(m.details?.subject || m.preview) || (m.details as any)?.type === 'comunicado' || m.details?.category === 'Comunicado Oficial' || m.details?.category === 'Comunicado')
          : (ehAssuntoDenuncia(m.details?.subject || m.preview) && !ehAssuntoComunicado(m.details?.subject || m.preview));
    return pertence && correspondePesquisa(query, [m.id, m.details?.subject, m.date,
      ...(anonimizar ? [] : [m.org, m.preview])]);
  });
}

export type AbaInquerito = 'normal' | 'ia';

/** Filtro da tabbar Normal/IA da página Inquéritos (estilo Contactos). Itens
 *  com ambos os tipos aparecem nas duas abas — pertencem legitimamente a cada
 *  uma (têm sondagem normal E inquérito com IA para responder). */
export function filtrarAbaInquerito(messages: Message[], aba: AbaInquerito): Message[] {
  return messages.filter(m => aba === 'ia' ? temInqueritoIA(m) : (temInqueritoNormal(m) || !temInqueritoIA(m)));
}
