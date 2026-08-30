// ============================================================================
// notify(): substituto não bloqueante do alert() (Auditoria F42 · Médio#4)
// ----------------------------------------------------------------------------
// API mínima, módulo PURO (sem React — seguro para suites tsx):
//   import { notify } from '../lib/notify';  // ou ../../lib/notify
//   notify('Mensagem...')                    // tal como alert(), mas toast tematizado
//   notify('Não foi possível enviar…', 'error', {
//     acao: { rotulo: 'Tentar novamente', executar: () => enviar() },
//     duracaoMs: 9000,
//   })
// O NotifyHost (components/ui/NotifyHost.tsx) subscreve e renderiza.
// Sem host montado (ambiente de teste) as mensagens são simplesmente largadas.
//
// v37.78 — Auditoria UX §1/§5/§10/§19:
//   · duração por tipo (erros/avisos ficam mais tempo no ecrã);
//   · deduplicação: a mesma mensagem disparada 2× seguidas (double-click)
//     não empilha — apenas repõe o cronómetro;
//   · ação opcional (ex.: «Tentar novamente», «Entrar novamente»).
// ============================================================================

export type CdaToastKind = 'info' | 'success' | 'warning' | 'error';

export interface CdaToastAcao {
  rotulo: string;
  executar: () => void;
}

export interface CdaToastOpcoes {
  /** Milissegundos que a notificação fica visível (0 = só fecha manualmente). */
  duracaoMs?: number;
  /** Botão de ação dentro do toast (ex.: Tentar novamente). */
  acao?: CdaToastAcao;
}

export interface CdaToast {
  id: number;
  message: string;
  kind: CdaToastKind;
  acao?: CdaToastAcao;
}

type NotifyListener = (toasts: CdaToast[]) => void;

let toasts: CdaToast[] = [];
let seq = 1;
const listeners = new Set<NotifyListener>();

// §10 — as notificações não devem desaparecer antes de poderem ser consultadas:
// erros e avisos ficam visíveis mais tempo que as de sucesso/info.
const TTL_POR_TIPO_MS: Record<CdaToastKind, number> = {
  error: 9000,
  warning: 7000,
  success: 6000,
  info: 5000,
};

const timers = new Map<number, ReturnType<typeof setTimeout>>();

const emit = () => listeners.forEach(l => { try { l([...toasts]); } catch { /* ignora */ } });

const armTimer = (id: number, duracaoMs: number) => {
  const t = timers.get(id);
  if (t) clearTimeout(t);
  if (duracaoMs > 0) {
    timers.set(id, setTimeout(() => dismiss(id), duracaoMs));
  } else {
    timers.delete(id); // 0 = permanece até fecho manual
  }
};

const dismiss = (id: number) => {
  const t = timers.get(id);
  if (t) { clearTimeout(t); timers.delete(id); }
  if (toasts.some(x => x.id === id)) {
    toasts = toasts.filter(x => x.id !== id);
    emit();
  }
};

/**
 * Drop-in do alert(): afixamento não bloqueante. Idêntica em semântica de
 * chamada (void, mensagem única) — nunca lança, seguro em qualquer handler.
 */
export const notify = (message: unknown, kind: CdaToastKind = 'info', opcoes?: CdaToastOpcoes): void => {
  try {
    const text = String(message ?? '');
    if (!text) return;
    // §3 (acções duplicadas) — a mesma mensagem disparada em rajada não empilha:
    // actualiza a existente e repõe o cronómetro.
    const existente = toasts.find(x => x.message === text && x.kind === kind);
    if (existente) {
      armTimer(existente.id, opcoes?.duracaoMs ?? TTL_POR_TIPO_MS[kind]);
      return;
    }
    const id = seq++;
    toasts = [...toasts.slice(-4), { id, message: text, kind, acao: opcoes?.acao }]; // máx. 5 empilhados
    emit();
    armTimer(id, opcoes?.duracaoMs ?? TTL_POR_TIPO_MS[kind]);
  } catch { /* nunca propagar — tal como alert() nunca devolve erro */ }
};

/** Fecha uma notificação específica (botão × do host). */
export const dismissNotify = (id: number): void => {
  try { dismiss(id); } catch { /* ignora */ }
};

/** Executa a ação da notificação e fecha-a de seguida. */
export const executarAcaoNotify = (id: number): void => {
  try {
    const t = toasts.find(x => x.id === id);
    dismiss(id);
    t?.acao?.executar();
  } catch { /* ignora */ }
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
