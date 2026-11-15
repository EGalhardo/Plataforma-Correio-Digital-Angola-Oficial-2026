/** Server-side ownership for non-admin notification reads. Never trust a caller's target. */
export function ownNotificationTarget(identity: { bi?: string; instCode?: string }, requested?: string): string | null {
  const own = String(identity.instCode || identity.bi || '').trim().toUpperCase();
  const target = String(requested || '').trim().toUpperCase();
  if (!own || (target && target !== own)) return null;
  return own;
}
