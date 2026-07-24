// F15 — Garantia de Conteúdo Demo (prompt v8): quando a sessão é de uma conta de
// DEMONSTRAÇÃO, todas as páginas e separadores têm dados simulados — nenhuma fica
// vazia. Este módulo constrói o plano canónico de seeds, Etiquetados com o dono
// demo (recipientBi/holderBi/ownerId/senderKey/recipientInst) para nunca vazarem
// para contas reais (ideologia v7 / F12). O App aplica o plano no arranque da
// sessão demo de forma idempotente e não-destrutiva (só colecções vazias + piso
// de não-lidas).

import { Message, AppNotification, Contact, Document } from '../types';
import { ensureProtocolOnMessage, ensureProtocolOnDocument } from '../utils/protocolGenerator';
import {
  INBOX,
  SENT_MESSAGES,
  DOCUMENTS,
  INITIAL_CONTACTS,
  NOTIFICATIONS,
  INSTITUTIONAL_INBOX,
} from '../constants/data';
import { MOCK_GOV_CORRESPONDENCES, MOCK_AUDIT_LOGS } from '../constants/mocks';

export type DemoArea = 'user' | 'institution' | 'admin';

export interface DemoContentPlan {
  inbox: Message[];
  docInbox: Message[];
  sentMessages: Message[];
  docSentMessages: Message[];
  instInbox: Message[];
  instDocInbox: Message[];
  notifications: AppNotification[];
  contacts: Contact[];
  documents: Document[];
  correspondences: any[];
  auditLogs: any[];
}

/** Plano canónico de conteúdo demo para uma área, etiquetado com a chave demo da sessão. */
export const buildDemoContentPlan = (area: DemoArea, ownerKey: string): DemoContentPlan => {
  const mail: Message[] = INBOX.map(m => ({ ...ensureProtocolOnMessage({ ...m }), recipientBi: ownerKey }));
  const docMail: Message[] = mail.map(m => ({ ...m, id: m.id + 10000 }));
  const sent: Message[] = SENT_MESSAGES.map(m => ({ ...ensureProtocolOnMessage({ ...m }), senderKey: ownerKey, unread: 0 }));
  const docSent: Message[] = sent.map(m => ({ ...m, id: m.id + 10000 }));
  const instMail: Message[] = INSTITUTIONAL_INBOX.map(m => ({ ...ensureProtocolOnMessage({ ...m }), recipientInst: ownerKey }));
  const instDoc: Message[] = instMail.map(m => ({ ...m, id: m.id + 10000 }));

  return {
    inbox: area === 'user' ? mail : [],
    docInbox: area === 'user' ? docMail : [],
    // Caixa "Enviadas" partilhada pelas áreas — sempre etiquetada com a sessão demo actual.
    sentMessages: sent,
    docSentMessages: docSent,
    instInbox: area === 'institution' ? instMail : [],
    instDocInbox: area === 'institution' ? instDoc : [],
    notifications: NOTIFICATIONS.map(n => ({ ...n, ownerId: ownerKey })),
    contacts: area === 'user' ? INITIAL_CONTACTS.map(c => ({ ...c, ownerId: ownerKey })) : [],
    documents: DOCUMENTS.map(d => ({ ...ensureProtocolOnDocument({ ...d }), holderBi: ownerKey })),
    // Correspondências gov e auditoria da consola admin: SEM createdBy — ficam
    // invisíveis para agentes reais (F13) e visíveis apenas na conta demo.
    correspondences: area === 'admin' ? MOCK_GOV_CORRESPONDENCES.map(c => ({ ...c })) : [],
    auditLogs: area === 'admin' ? MOCK_AUDIT_LOGS.map(a => ({ ...a })) : [],
  };
};

/**
 * F15 — Piso de não-lidas: garante a mistura de estados exigida (separadores
 * "Lidas" e "Não Lidas" sempre com dados). Se a lista estiver toda lida, força
 * o item do topo para não lido. Devolve a MESMA referência quando nada muda.
 */
export const withUnreadFloor = <T extends { unread?: number | boolean; status?: string }>(list: T[]): T[] => {
  if (!list.length) return list;
  if (list.some(m => !!m.unread)) return list;
  return [{ ...list[0], unread: 1, status: 'Não Lida' }, ...list.slice(1)];
};

/** Remove ids do registo persistente de "Lida" (cda_read_msgs_<BI>) — usado pelo
 *  piso de não-lidas para o estado não ser revertido pelo efeito de persistência. */
export const unmarkReadIds = (rawBi: string, ...ids: number[]): void => {
  try {
    const key = `cda_read_msgs_${(rawBi || '').trim().toUpperCase()}`;
    const raw = localStorage.getItem(key);
    const arr: number[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr) || !arr.length) return;
    const keep = arr.filter(id => !ids.includes(id));
    if (keep.length === arr.length) return;
    localStorage.setItem(key, JSON.stringify(keep));
  } catch { /* sem storage: ignora */ }
};
