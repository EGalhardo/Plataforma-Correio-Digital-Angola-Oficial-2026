import type { Message } from '../types';
import { ehAssuntoDenuncia, ehAssuntoNovaDenuncia } from '../services/denunciaCore';
import { correspondePesquisa } from './pesquisaContactosCorreio';

export const temInqueritoNormal = (m: Message) => Boolean(m.sondagem_id || m.sondagem_ids?.length);
export const temInqueritoIA = (m: Message) => Boolean(m.inquerito_ia_id || m.inquerito_ia_ids?.length);

// 2026-09-23 (T-v37.79) — «nova-denuncia»: nova fila «Denuncia» do Painel
// (nova funcionalidade pedida pelo dono). As duas famílias são mutuamente
// exclusivas por construção: «[REGISTO DE DENÚNCIA]» normalizado nunca
// começa por «[DENUNCIA]», logo cada fila só recebe os seus itens.
export function listarParticipacao(messages: Message[], tipo: 'inqueritos' | 'denuncias' | 'nova-denuncia', query = '', anonimizar = false): Message[] {
  return messages.filter(m => {
    const pertence = tipo === 'inqueritos'
      ? temInqueritoNormal(m) || temInqueritoIA(m)
      : tipo === 'nova-denuncia'
        ? ehAssuntoNovaDenuncia(m.details?.subject || m.preview)
        : ehAssuntoDenuncia(m.details?.subject || m.preview);
    return pertence && correspondePesquisa(query, [m.id, m.details?.subject, m.date,
      ...(anonimizar ? [] : [m.org, m.preview])]);
  });
}

export type AbaInquerito = 'normal' | 'ia';

/** Filtro da tabbar Normal/IA da página Inquéritos (estilo Contactos). Itens
 *  com ambos os tipos aparecem nas duas abas — pertencem legitimamente a cada
 *  uma (têm sondagem normal E inquérito com IA para responder). */
export function filtrarAbaInquerito(messages: Message[], aba: AbaInquerito): Message[] {
  return messages.filter(m => aba === 'ia' ? temInqueritoIA(m) : temInqueritoNormal(m));
}
