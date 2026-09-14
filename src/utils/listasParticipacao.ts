import type { Message } from '../types';
import { ehAssuntoDenuncia } from '../services/denunciaCore';
import { correspondePesquisa } from './pesquisaContactosCorreio';

export const temInqueritoNormal = (m: Message) => Boolean(m.sondagem_id || m.sondagem_ids?.length);
export const temInqueritoIA = (m: Message) => Boolean(m.inquerito_ia_id || m.inquerito_ia_ids?.length);

export function listarParticipacao(messages: Message[], tipo: 'inqueritos' | 'denuncias', query = '', anonimizar = false): Message[] {
  return messages.filter(m => {
    const pertence = tipo === 'inqueritos'
      ? temInqueritoNormal(m) || temInqueritoIA(m)
      : ehAssuntoDenuncia(m.details?.subject || m.preview);
    return pertence && correspondePesquisa(query, [m.id, m.details?.subject, m.date,
      ...(anonimizar ? [] : [m.org, m.preview])]);
  });
}
