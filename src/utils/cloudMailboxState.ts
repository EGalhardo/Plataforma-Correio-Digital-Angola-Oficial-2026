import type { Message } from '../types';

/**
 * Reconcile per-account mailbox visibility for records confirmed by the cloud.
 * Broadcasts remain local-only: their shared row cannot represent one user's
 * archive/deletion. Records not returned by the query are left untouched.
 */
export function reconcileCloudMailboxState(
  previous: number[], messages: Message[], owner: string, kind: 'archived' | 'hidden',
): number[] {
  const normalize = (value: string) => value.toUpperCase().replace(/\s+/g, '').replace(/-\d{2}$/, '');
  const account = normalize(owner);
  if (!account) return previous;
  const managed = new Set<number>();
  const active = new Set<number>();
  for (const message of messages) {
    if (!Number.isSafeInteger(message.id) || String(message.recipientBi || '').toUpperCase() === 'TODOS') continue;
    const actions = Array.isArray(message.details?.actions) ? message.details.actions : [];
    const hasMarker = (prefix: string) => actions.some(action => typeof action === 'string'
      && action.startsWith(prefix) && normalize(action.slice(prefix.length)) === account);
    const archived = hasMarker('ARQ:') || message.details?.state === 'Arquivada';
    const permanentlyDeleted = hasMarker('ELIM_PERM:') || (message.details?.state === 'EliminadaPermanente'
      && !actions.some(action => typeof action === 'string' && action.startsWith('ELIM_PERM:')));
    managed.add(message.id);
    if (kind === 'archived' ? archived && !permanentlyDeleted : permanentlyDeleted) active.add(message.id);
  }
  return [...new Set([...previous.filter(id => !managed.has(id)), ...active])];
}
