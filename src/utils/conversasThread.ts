import type { Message } from '../types';

// ============================================================================
// Conversas (vista estilo Gmail) — Correio Digital Angola
// ----------------------------------------------------------------------------
// Um envio para N destinatários gera N linhas na nuvem (cada destinatário
// precisa da sua cópia), mas para o EMISSOR é UMA correspondência. Tal como o
// Gmail agrupa por (remetente, assunto, conteúdo), aqui a chave da conversa é:
// remetente + dia + assunto normalizado + impressão do corpo + sondagens.
// Respostas (RESPONDE_A) nunca se agrupam: cada uma é a sua linha.
// Sem migração de base de dados — tudo derivado dos campos existentes.
// ============================================================================

export interface Conversa {
  chave: string;
  assunto: string;
  remetente: string;
  /** Todas as cópias (mais recente primeiro — respeita a ordem de entrada). */
  copias: Message[];
  representante: Message;
  /** Rótulos únicos dos destinatários, por ordem de envio. */
  destinatarios: string[];
  total: number;
  multiplos: boolean;
  sondagemIds: number[];
  inqueritoIaIds: number[];
}

const PREFIXOS_ASSUNTO = /^(re|fw|fwd|enc|res|r|aw|sv)\s*:/i;

export function normalizarAssunto(s?: string): string {
  let t = (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  for (let i = 0; i < 5 && PREFIXOS_ASSUNTO.test(t); i++) t = t.replace(PREFIXOS_ASSUNTO, '').trim();
  return t;
}

/** Impressão estável do corpo: comprimento + hash djb2 (colisões irrelevantes aqui). */
export function impressaoCorpo(s?: string): string {
  const t = (s || '').trim().replace(/\s+/g, ' ');
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0;
  return `${t.length}:${h.toString(36)}`;
}

export function diaDe(m: Message): string {
  const iso = (m.createdAt || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : 'sem-data';
}

export function ehResposta(m: Message): boolean {
  return (m.details?.actions || []).some(a => String(a).startsWith('RESPONDE_A:'));
}

export function idsSondagemDe(m: Message): number[] {
  const v = m.sondagem_ids?.length ? m.sondagem_ids : (m.sondagem_id ? [m.sondagem_id] : []);
  return [...new Set(v.map(Number).filter(n => Number.isFinite(n) && n > 0))].sort((a, b) => a - b);
}

export function idsInqueritoIaDe(m: Message): number[] {
  const v = m.inquerito_ia_ids?.length ? m.inquerito_ia_ids : (m.inquerito_ia_id ? [m.inquerito_ia_id] : []);
  return [...new Set(v.map(Number).filter(n => Number.isFinite(n) && n > 0))].sort((a, b) => a - b);
}

export function remetenteDe(m: Message): string {
  return String((m as { senderKey?: unknown }).senderKey || '').toUpperCase().trim();
}

export function rotuloDestinatario(m: Message): string {
  const r = String(m.recipientBi || m.org || '').trim();
  return r || '—';
}

export function assuntoDe(m: Message): string {
  return (m.details?.subject || m.preview || '').trim() || 'Correspondência Oficial';
}

export function chaveConversa(m: Message): string {
  if (ehResposta(m)) return `unica:${m.id}`;
  return [
    remetenteDe(m),
    diaDe(m),
    normalizarAssunto(assuntoDe(m)),
    impressaoCorpo(m.details?.body || ''),
    `s:${idsSondagemDe(m).join(',')}`,
    `q:${idsInqueritoIaDe(m).join(',')}`,
  ].join('|');
}

function montar(chave: string, copias: Message[]): Conversa {
  const rep = copias[0];
  const dests: string[] = [];
  for (const c of copias) {
    const r = rotuloDestinatario(c);
    if (r && !dests.includes(r)) dests.push(r);
  }
  return {
    chave,
    assunto: assuntoDe(rep),
    remetente: remetenteDe(rep),
    copias,
    representante: rep,
    destinatarios: dests,
    total: copias.length,
    multiplos: copias.length > 1,
    sondagemIds: idsSondagemDe(rep),
    inqueritoIaIds: idsInqueritoIaDe(rep),
  };
}

/** Agrupa mensagens em conversas, preservando a ordem de entrada. */
export function agruparConversas(msgs: Message[]): Conversa[] {
  const grupos = new Map<string, Message[]>();
  const ordem: string[] = [];
  for (const m of msgs) {
    const k = chaveConversa(m);
    const g = grupos.get(k);
    if (g) g.push(m);
    else { ordem.push(k); grupos.set(k, [m]); }
  }
  return ordem.map(k => montar(k, grupos.get(k)!));
}

/** Envolve uma mensagem avulsa como conversa singular (listas sem agrupar). */
export function conversaUnica(m: Message): Conversa {
  return montar(`unica:${m.id}`, [m]);
}

/** Encontra a conversa que contém a mensagem (ou null). */
export function conversaDe(conversas: Conversa[], id: number): Conversa | null {
  for (const c of conversas) {
    if (c.copias.some(m => m.id === id)) return c;
  }
  return null;
}

/** Resumo curto «A, B +N» para as linhas da lista. */
export function resumoDestinatarios(c: Conversa, max = 2): string {
  if (c.destinatarios.length <= max) return c.destinatarios.join(', ');
  return `${c.destinatarios.slice(0, max).join(', ')} +${c.destinatarios.length - max}`;
}
