/**
 * F56 — Sincronização offline HONESTA.
 *
 * Antes desta correção, o `handleAutomaticSync` descartava TODA a fila offline
 * após 1,5 s de setTimeout e declarava "propagadas com o Registo de Identidade
 * Digital" — sucesso fabricado com PERDA REAL de dados em contas reais.
 *
 * Este núcleo puro executa o REPLAY verdadeiro das acções suportadas e devolve
 * o desfecho real para relatório fiel. As operações de nuvem são INJECTADAS
 * (FAKE nos testes; sem gates de import.meta.env — basta `if (!ops)`).
 *
 * Tipos de acção sem replay implementado (mensagens/documentos/pedidos) ou
 * com payload insuficiente PERMANECEM na fila — nunca são declaradas como
 * consolidadas.
 */

import { Contact } from '../types';
import type { OfflineAction } from '../utils/offlineManager';

export type OfflineActionLike = OfflineAction;

/** Operações de nuvem injectadas (reais via supabaseService ou FAKE nos testes). */
export interface ContactSyncOps {
  insertContact: (contact: Contact) => Promise<unknown>;
  deleteContact: (id: number) => Promise<unknown>;
}

export interface OfflineReplayResult {
  /** acções efectivamente consolidadas na nuvem durante este replay. */
  consolidated: number;
  /** acções suportadas cujo replay FALHOU (permanecem na fila para retentativa). */
  failed: number;
  /** acções que ficam na fila (falhadas + sem replay implementado/legadas). */
  remaining: OfflineActionLike[];
  /** 2026-11-16 — motivo REAL por acção que não foi consolidada, para o
   *  utilizador saber o que fazer (antes ficava só «pendente» sem explicação). */
  motivos: Array<{ id: string; tipo: string; motivo: string }>;
}

/** Tipos com replay implementado hoje (fonte única da verdade para o relatório). */
export const REPLAYABLE_ACTION_TYPES = ['ADD_CONTACT', 'DELETE_CONTACT'] as const;

/**
 * Executa o replay honesto da fila offline.
 * `if (!ops)`: nada é consolidado; tudo permanece — desfecho real.
 */
export async function replayOfflineQueue(
  ops: ContactSyncOps | null,
  actions: OfflineActionLike[],
): Promise<OfflineReplayResult> {
  const remaining: OfflineActionLike[] = [];
  const motivos: Array<{ id: string; tipo: string; motivo: string }> = [];
  let consolidated = 0;
  let failed = 0;

  for (const action of actions || []) {
    if (!ops) {
      remaining.push(action);
      motivos.push({ id: action.id, tipo: action.type, motivo: 'Sem sessão de nuvem — nada foi reenviado.' });
      continue;
    }
    try {
      if (action.type === 'ADD_CONTACT' && action.payload?.contact) {
        await ops.insertContact(action.payload.contact);
        consolidated++;
      } else if (action.type === 'DELETE_CONTACT' && action.payload?.id != null) {
        await ops.deleteContact(action.payload.id);
        consolidated++;
      } else {
        // Sem replay implementado (SEND_MESSAGE, SEND_DOCUMENT, EMIT_DOCUMENT,
        // CREATE_REQUEST…) ou payload legado insuficiente → fica na fila.
        // 2026-11-16 — o reenvio de correspondência é recusado de propósito:
        // a mensagem já pode ter chegado e ser reenviada em duplicado.
        const motivo = action.type === 'SEND_MESSAGE' || action.type === 'SEND_DOCUMENT'
          ? 'Mensagem não reenviada automaticamente (evita entrega em duplicado). Verifique «Enviadas» e reenvie manualmente se necessário.'
          : action.type === 'EMIT_DOCUMENT'
            ? 'Emissão de documento não repetida automaticamente. Confirme nos Documentos antes de emitir de novo.'
            : action.type === 'CREATE_REQUEST'
              ? 'Pedido não reenviado automaticamente. Registe-o novamente no serviço pretendido.'
              : 'Acção sem reenvio automático disponível.';
        remaining.push(action);
        motivos.push({ id: action.id, tipo: action.type, motivo });
      }
    } catch (e) {
      failed++;
      remaining.push(action);
      motivos.push({
        id: action.id, tipo: action.type,
        motivo: `Falhou ao reenviar: ${String((e as Error)?.message || e).slice(0, 120)}. Fica na fila para nova tentativa.`,
      });
    }
  }

  return { consolidated, failed, remaining, motivos };
}

/**
 * Relatório textual HONESTO do desfecho. É proibido aqui qualquer forma de
 * "propagada/consolidada" que não corresponda ao contador real.
 */
export function offlineSyncReportText(result: OfflineReplayResult): string {
  const stillPending = result.remaining.length - result.failed;
  const parts = [
    result.consolidated > 0 ? `${result.consolidated} acção(ões) consolidada(s) com a nuvem` : null,
    result.failed > 0 ? `${result.failed} falharam (Erro real: será retentado na próxima sincronização)` : null,
    stillPending > 0 ? `${stillPending} permanecem pendentes — o modo offline não propaga automaticamente este tipo de acção` : null,
  ].filter(Boolean);
  return (parts.length ? parts.join('; ') : 'Sem acções a processar') + '.';
}

/** Texto do ramo DEMO (D7): sandbox declarado, sem qualquer afirmação de envio. */
export function offlineSyncSandboxReportText(queueLength: number): string {
  return `${queueLength} acções processadas em Modo Sandbox. Nenhum dado foi enviado à nuvem.`;
}
