// ============================================================================
// Toast global (Auditoria F42 · Médio#4: fim dos alert() nativos)
// ----------------------------------------------------------------------------
// O `notify()` (src/lib/notify.ts) é drop-in do alert(): afixamento não
// bloqueante, com o tema da aplicação, auto-fecho e empilhamento. Este host é
// montado UMA vez no topo da árvore (App.tsx).
//
// v37.78 — Auditoria UX §19 (acessibilidade) + §1/§5:
//   · cada toast tem ÍCONE + texto (nunca só cor para indicar o estado);
//   · botão × para fechar (aria-label) — nunca some sem o utilizador decidir;
//   · acção opcional (ex.: «Tentar novamente») executada dentro do toast;
//   · erros usam role="alert" (leitores de ecrã anunciam imediatamente).
// ============================================================================

import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { subscribeNotify, dismissNotify, executarAcaoNotify, type CdaToast } from '../../lib/notify';

const ICONES: Record<CdaToast['kind'], React.ReactNode> = {
  success: <CheckCircle2 size={18} color="#4ADE80" aria-hidden="true" />,
  warning: <AlertTriangle size={18} color="#FBBF24" aria-hidden="true" />,
  error: <XCircle size={18} color="#F87171" aria-hidden="true" />,
  info: <Info size={18} color="#60A5FA" aria-hidden="true" />,
};

const PREFIXO: Record<CdaToast['kind'], string> = {
  success: 'Sucesso:',
  warning: 'Atenção:',
  error: 'Erro:',
  info: '',
};

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
        zIndex: 99999,
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
          role={t.kind === 'error' ? 'alert' : 'status'}
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
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <span style={{ marginTop: 1, flexShrink: 0 }}>{ICONES[t.kind]}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            {PREFIXO[t.kind] && (
              <strong style={{ display: 'block', fontSize: 11, letterSpacing: '.04em', textTransform: 'uppercase', opacity: 0.85 }}>
                {PREFIXO[t.kind]}
              </strong>
            )}
            {t.message}
            {t.acao && (
              <button
                type="button"
                onClick={() => executarAcaoNotify(t.id)}
                style={{
                  marginTop: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#1E293B',
                  color: '#F8FAFC',
                  border: '1px solid #334155',
                  borderRadius: 10,
                  padding: '6px 12px',
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {t.acao.rotulo}
              </button>
            )}
          </span>
          <button
            type="button"
            onClick={() => dismissNotify(t.id)}
            aria-label="Fechar notificação"
            style={{
              background: 'transparent',
              border: 0,
              color: '#94A3B8',
              cursor: 'pointer',
              padding: 2,
              marginTop: -2,
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      ))}
      <style>{`@keyframes cdaToastIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

export default NotifyHost;
