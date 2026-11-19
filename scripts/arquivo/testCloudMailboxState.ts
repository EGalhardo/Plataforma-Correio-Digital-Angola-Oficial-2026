import assert from 'node:assert/strict';
import type { Message } from '../src/types';
import { reconcileCloudMailboxState } from '../src/utils/cloudMailboxState';

const msg = (id: number, actions: string[] = [], state = 'Entregue & Autenticado', recipientBi = '002399714LA030'): Message => ({
  id, org: 'Teste', preview: 'Teste', date: 'hoje', status: 'Informativo', recipientBi,
  details: { subject: 'Teste', body: 'Teste', state, actions, deadline: '' },
});
const owner = '002399714LA030';
const rows = [
  msg(1), msg(2, [`ARQ:${owner}`]), msg(3, [`ARQ:OUTRA`]),
  msg(4, [`ELIM_PERM:${owner}`]), msg(5, ['ELIM_PERM:OUTRA']),
  msg(6, [], 'Arquivada'), msg(7, [], 'EliminadaPermanente'),
  msg(8, [], 'Entregue & Autenticado', 'TODOS'),
];
assert.deepEqual(reconcileCloudMailboxState([1, 3, 8, 99], rows, owner, 'archived').sort((a,b) => a-b), [2, 6, 8, 99]);
assert.deepEqual(reconcileCloudMailboxState([1, 5, 8, 99], rows, owner, 'hidden').sort((a,b) => a-b), [4, 7, 8, 99]);
assert.deepEqual(reconcileCloudMailboxState([], [msg(10, ['ARQ:AGT-LMM'])], 'AGT-LMM-01', 'archived'), [10]);
assert.deepEqual(reconcileCloudMailboxState([1], rows, '', 'hidden'), [1]);
console.log('cloud mailbox reconciliation: OK');
