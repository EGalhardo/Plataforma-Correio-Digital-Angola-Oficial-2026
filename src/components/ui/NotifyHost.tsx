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
import { subscribeNotify, dismissNotify, executarAcaoNotify, abrirDestinoNotify, type CdaToast, type CdaToastDestino } from '../../lib/notify';

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

interface NotifyHostProps {
  /**
   * 2026-11-15 (pedido do dono) — clique no toast preto de notificação:
   * abre a página/correspondência respectiva. Resolvido no App, que já tem o
   * mesmo ponto de decisão usado pelo menu da foto e pelo Centro de Notificações.
   */
  onAbrirDestino?: (destino: CdaToastDestino) => void;
}

export const NotifyHost: React.FC<NotifyHostProps> = ({ onAbrirDestino }) => {
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
          role={t.destino ? 'button' : (t.kind === 'error' ? 'alert' : 'status')}
          tabIndex={t.destino ? 0 : undefined}
          aria-label={t.destino ? `${t.message} — abrir a respectiva página` : undefined}
          data-testid={t.destino ? 'toast-notificacao' : 'toast'}
          data-toast-id={t.id}
          title={t.destino ? 'Clique para abrir a respectiva página' : undefined}
          onClick={t.destino ? () => {
            const d = abrirDestinoNotify(t.id);
            // O host vive em main.tsx (fora do App): o destino segue por evento
            // global e o App resolve a navegação com o mesmo ponto de decisão
            // já usado pelo menu da foto e pelo Centro de Notificações.
            if (d) { onAbrirDestino?.(d); window.dispatchEvent(new CustomEvent('cda:abrir-toast-destino', { detail: d })); }
          } : undefined}
          onKeyDown={t.destino ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              const d = abrirDestinoNotify(t.id);
              if (d) { onAbrirDestino?.(d); window.dispatchEvent(new CustomEvent('cda:abrir-toast-destino', { detail: d })); }
            }
          } : undefined}
          style={{
            pointerEvents: 'auto',
            cursor: t.destino ? 'pointer' : 'default',
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
          {t.destino && (
            <span
              aria-hidden="true"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0,
                fontSize: 10.5, fontWeight: 900, letterSpacing: '.06em',
                textTransform: 'uppercase', color: '#93C5FD', marginTop: 1,
              }}
            >
              Abrir
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </span>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); dismissNotify(t.id); }}
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
