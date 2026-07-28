// ============================================================================
// F45 — notify(): substituto não bloqueante do alert() (Auditoria F42 · Médio#4)
// ----------------------------------------------------------------------------
// API mínima, módulo PURO (sem React — seguro para suites tsx):
//   import { notify } from '../lib/notify';  // ou ../../lib/notify
//   notify('Mensagem...')  // tal como alert(), mas toast tematizado
// O NotifyHost (components/ui/NotifyHost.tsx) subscreve e renderiza.
// Sem host montado (ambiente de teste) as mensagens são simplesmente largadas.
// ============================================================================

export type CdaToastKind = 'info' | 'success' | 'warning' | 'error';

export interface CdaToast {
  id: number;
  message: string;
  kind: CdaToastKind;
}

type NotifyListener = (toasts: CdaToast[]) => void;

let toasts: CdaToast[] = [];
let seq = 1;
const listeners = new Set<NotifyListener>();
const TOAST_TTL_MS = 4200;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

const emit = () => listeners.forEach(l => { try { l([...toasts]); } catch { /* ignora */ } });

const dismiss = (id: number) => {
  const t = timers.get(id);
  if (t) { clearTimeout(t); timers.delete(id); }
  if (toasts.some(x => x.id === id)) {
    toasts = toasts.filter(x => x.id !== id);
    emit();
  }
};

/**
 * Drop-in do alert(): afixamento não bloqueante. Idêntico em semântica de
 * chamada (void, mensagem única) — nunca lança, seguro em qualquer handler.
 */
export const notify = (message: unknown, kind: CdaToastKind = 'info'): void => {
  try {
    const text = String(message ?? '');
    if (!text) return;
    const id = seq++;
    toasts = [...toasts.slice(-4), { id, message: text, kind }]; // máx. 5 empilhados
    emit();
    timers.set(id, setTimeout(() => dismiss(id), TOAST_TTL_MS));
  } catch { /* nunca propagar — tal como alert() nunca devolve erro */ }
};

/** Subscrição do host. Devolve a função de unsubscribe. */
export const subscribeNotify = (listener: NotifyListener): (() => void) => {
  listeners.add(listener);
  try { listener([...toasts]); } catch { /* ignora */ }
  return () => { listeners.delete(listener); };
};

/** Introspecção para suites: mensagens actualmente visíveis. */
export const __peekToasts = (): readonly CdaToast[] => toasts;

/** Esvazia (suites/logout). */
export const __resetNotify = (): void => {
  timers.forEach(t => clearTimeout(t));
  timers.clear();
  toasts = [];
  emit();
};
