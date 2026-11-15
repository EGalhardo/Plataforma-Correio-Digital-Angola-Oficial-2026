/** Link in the existing notifications.dedupe_key column (not in user-visible text). */
export function notificationMessageKey(messageId: number | undefined, target: string): string | undefined {
  if (!Number.isSafeInteger(messageId) || (messageId as number) <= 0 || !target.trim()) return undefined;
  return `cda:message:${messageId}:${encodeURIComponent(target.trim().toUpperCase())}`;
}

export function notificationMessageId(key: unknown): number | undefined {
  if (typeof key !== 'string') return undefined;
  const match = /^cda:message:([1-9]\d*):([^\s]+)$/.exec(key);
  if (!match) return undefined;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) ? id : undefined;
}

/** Match the existing legacy offset for mapped mailbox IDs, without conflating different messages. */
export function sameNotificationMessage(messageId: number, candidateId: number): boolean {
  const base = (id: number) => id >= 10000 && id < 90000000 ? id - 10000 : id;
  return messageId === candidateId || base(messageId) === base(candidateId);
}
