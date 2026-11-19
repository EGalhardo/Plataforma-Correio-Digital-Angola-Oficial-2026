import assert from 'node:assert/strict';
import { firstNoticeIds, flagsFromLocal, homologationInboxId, syncNoticeReads } from '../src/services/homologationReadSync';
import type { HomologationMessage } from '../src/services/homologationStore';

const thread: HomologationMessage[] = [
  { id: 'one', from: 'admin', at: '', text: 'confirma a receção do seu pedido de registo' },
  { id: 'two', from: 'admin', at: '', text: 'identidade HOMOLOGADA e conta oficialmente ATIVA' },
  { id: 'later', from: 'admin', at: '', text: 'identidade HOMOLOGADA e conta oficialmente ATIVA' },
  { id: 'own', from: 'citizen', at: '', text: 'HOMOLOGADA oficialmente ATIVA' },
];
const ids = firstNoticeIds(thread);
assert.deepEqual(ids, { submission: homologationInboxId('one'), approval: homologationInboxId('two') });
assert.deepEqual(flagsFromLocal(thread, new Set([homologationInboxId('later')])), { submission: false, approval: false });
assert.deepEqual(flagsFromLocal(thread, new Set([ids.submission!])), { submission: true, approval: false });

type State = { bi: string; role: string; registration: string; metadata: Record<string, string>; failUpdate?: boolean; calls: string[] };
function fake(state: State): typeof fetch {
  return async (input, init) => {
    const u = String(input); state.calls.push(`${init?.method || 'GET'} ${u.includes('/rest/') ? 'registration' : 'user'}`);
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer scoped-token');
    if (u.includes('/rest/')) return Response.json([{ id: state.registration }]);
    if (init?.method === 'PUT') {
      if (state.failUpdate) return new Response('', { status: 503 });
      Object.assign(state.metadata, JSON.parse(String(init.body)).data);
      return Response.json({});
    }
    return Response.json({ user_metadata: { bi: state.bi, role: state.role, ...state.metadata } });
  };
}
const initial = () => ({ bi: '123LA', role: 'cidadao', registration: 'reg-1', metadata: {}, calls: [] } satisfies State);
const run = (state: State, local = { submission: false, approval: false }, bi = '123LA') => syncNoticeReads({
  url: 'https://example.invalid', key: 'public', token: 'scoped-token', bi,
  local: () => local, fetcher: fake(state),
});
async function main() {
  const s: State = initial();
  assert.deepEqual(await run(s), { submission: false, approval: false });
  assert.equal(s.calls.filter(x => x.startsWith('PUT')).length, 0);
  assert.deepEqual(await run(s, { submission: true, approval: false }), { submission: true, approval: false });
  assert.deepEqual(await run(s), { submission: true, approval: false });
  assert.deepEqual(await run(s, { submission: false, approval: true }), { submission: true, approval: true });
  assert.deepEqual(await run(s), { submission: true, approval: true });
  s.registration = 'reg-2';
  assert.deepEqual(await run(s), { submission: false, approval: false }, 'new registration is unread');
  const before = s.calls.length;
  await assert.rejects(run(s, { submission: true, approval: true }, 'OTHER'));
  assert.deepEqual(s.calls.slice(before), ['GET user'], 'mismatched account never queries or writes');
  s.failUpdate = true;
  await assert.rejects(run(s, { submission: true, approval: false }), /guardar/);
  assert.deepEqual(await run(s), { submission: false, approval: false });
  await assert.rejects(syncNoticeReads({ url: 'https://example.invalid', key: 'public', token: 'scoped-token', bi: '123LA', local: () => ({ submission: true, approval: true }), fetcher: async () => { throw new Error('offline'); } }), /offline/);
  console.log('homologation read synchronization: PASS');
}
void main();
