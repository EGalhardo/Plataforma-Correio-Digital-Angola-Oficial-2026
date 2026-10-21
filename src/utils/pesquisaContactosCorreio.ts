import type { Contact, Message } from '../types';

export const normalizarPesquisa = (value: unknown): string => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

export function correspondePesquisa(query: string, values: unknown[]): boolean {
  const text = normalizarPesquisa(values.filter(v => v != null).join(' '));
  return normalizarPesquisa(query).split(' ').filter(Boolean).every(term => text.includes(term));
}

// Discriminador persistido no campo relation já suportado pela tabela contacts.
export const CONTACTO_INSTITUCIONAL = 'Instituição';
export const isContactoInstitucional = (contact: Pick<Contact, 'relation'>) => contact.relation === CONTACTO_INSTITUCIONAL;
export const pesquisarContacto = (contact: Contact, query: string) => correspondePesquisa(query,
  [contact.name, contact.bi, contact.relation, contact.phone, contact.whatsapp, contact.email]);
export const pesquisarMensagem = (message: Message, query: string) => correspondePesquisa(query,
  [message.org, message.preview, message.details?.subject, message.details?.body,
    message.institution, message.recipientInst, message.recipientBi, message.senderKey,
    message.status, message.date, message.id]);
