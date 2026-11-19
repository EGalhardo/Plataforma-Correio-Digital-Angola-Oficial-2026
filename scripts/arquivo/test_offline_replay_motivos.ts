/**
 * Regressão do replay offline (2026-11-16): os motivos reais têm de chegar ao
 * utilizador. Corre com `npx tsx scripts/test_offline_replay_motivos.ts`.
 */
import { replayOfflineQueue, offlineSyncReportText } from '../src/services/offlineSyncService';
import type { OfflineAction } from '../src/utils/offlineManager';

const acao = (id: string, type: string, payload?: Record<string, unknown>): OfflineAction => ({
  id, type, payload, timestamp: new Date().toISOString(), status: 'pending',
});

let falhas = 0;
const verificar = (nome: string, ok: boolean, detalhe?: unknown) => {
  console.log(`${ok ? '✓' : '✗'} ${nome}`, ok ? '' : JSON.stringify(detalhe));
  if (!ok) falhas++;
};

(async () => {
  // 1. Sem operações (sem sessão): nada consolidado e todos os motivos ditos.
  const filaSemSessao = [acao('a1', 'ADD_CONTACT', { contact: { id: 1, name: 'X' } as never })];
  const r1 = await replayOfflineQueue(null, filaSemSessao);
  verificar('sem sessão: nada consolidado', r1.consolidated === 0, r1);
  verificar('sem sessão: fica na fila', r1.remaining.length === 1, r1.remaining);
  verificar('sem sessão: motivo explicado', /sem sessão de nuvem/i.test(r1.motivos[0]?.motivo || ''), r1.motivos);

  // 2. Contagem a falhar: acção fica e o erro real é reportado.
  const r2 = await replayOfflineQueue({
    insertContact: async () => { throw new Error('destinatário inexistente'); },
    deleteContact: async () => undefined,
  }, [acao('a2', 'ADD_CONTACT', { contact: { id: 2, name: 'Y' } as never })]);
  verificar('falha: contada como falha', r2.failed === 1, r2);
  verificar('falha: motivo com o erro do servidor', /destinatário inexistente/.test(r2.motivos[0]?.motivo || ''), r2.motivos);

  // 3. Correspondência NUNCA é reenviada automaticamente (evita duplicados).
  const r3 = await replayOfflineQueue({
    insertContact: async () => undefined,
    deleteContact: async () => undefined,
  }, [acao('a3', 'SEND_MESSAGE', { to: 'AGT-LMM' })]);
  verificar('mensagem: não reenviada', r3.consolidated === 0 && r3.remaining.length === 1, r3);
  verificar('mensagem: motivo explica o duplicado', /duplicado/i.test(r3.motivos[0]?.motivo || ''), r3.motivos);

  // 4. Contacto válido é consolidado e sai da fila.
  const r4 = await replayOfflineQueue({
    insertContact: async () => undefined,
    deleteContact: async () => undefined,
  }, [acao('a4', 'ADD_CONTACT', { contact: { id: 4, name: 'Z' } as never })]);
  verificar('contacto: consolidado', r4.consolidated === 1 && r4.remaining.length === 0, r4);
  verificar('contacto: sem motivos', r4.motivos.length === 0, r4.motivos);
  verificar('relatório honesto', /1/.test(offlineSyncReportText(r4)), offlineSyncReportText(r4));

  console.log(falhas === 0 ? 'TODOS OS CASOS PASSARAM' : `${falhas} caso(s) falharam`);
  process.exit(falhas === 0 ? 0 : 1);
})();
