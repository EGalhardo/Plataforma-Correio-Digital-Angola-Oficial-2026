// ============================================================================
// F45 — Toast global (Auditoria F42 · Médio#4: fim dos alert() nativos)
// ----------------------------------------------------------------------------
// O `notify()` (src/lib/notify.ts) é drop-in do alert(): afixamento não
// bloqueante, com o tema da aplicação, auto-fecho e empilhamento. Este host é
// montado UMA vez no topo da árvore (App.tsx).
// ============================================================================

import React, { useEffect, useState } from 'react';
import { subscribeNotify, type CdaToast } from '../../lib/notify';

export const NotifyHost: React.FC = () => {
  const [toasts, setToasts] = useState<CdaToast[]>([]);

  useEffect(() => subscribeNotify(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'max(16px, env(safe-area-inset-top))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: 'min(92vw, 480px)',
        pointerEvents: 'none',
      }}
      role="status"
      aria-live="polite"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            pointerEvents: 'auto',
            background: '#0F172A',
            color: '#F8FAFC',
            border: '1px solid #1E293B',
            borderLeft: `4px solid ${t.kind === 'error' ? '#EF4444' : t.kind === 'warning' ? '#F59E0B' : t.kind === 'success' ? '#22C55E' : '#3B82F6'}`,
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: 14,
            lineHeight: 1.45,
            fontFamily: 'inherit',
            boxShadow: '0 10px 30px rgba(2,6,23,.35)',
            whiteSpace: 'pre-line',
            animation: 'cdaToastIn .18s ease-out',
          }}
        >
          {t.message}
        </div>
      ))}
      <style>{`@keyframes cdaToastIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

export default NotifyHost;
