import assert from 'node:assert/strict';
import { resolveTrustedAuthIdentity } from '../api/adminIdentity';

const spoofed = resolveTrustedAuthIdentity({
  id: 'attacker',
  user_metadata: { role: 'admin', agent: 'ADMIN-0001', bi: 'fake' },
  app_metadata: {},
});
assert.equal(spoofed.isAdmin, false, 'user_metadata não pode conceder privilégios Admin');
assert.equal(spoofed.role, '', 'papel Admin não confiável deve ser removido');
assert.equal(spoofed.agent, '', 'número Admin não confiável não deve ser aceite');

const trusted = resolveTrustedAuthIdentity({
  id: 'approved-admin',
  user_metadata: { role: 'citizen', agent: 'spoofed' },
  app_metadata: { role: 'admin', agent: 'ADMIN-0001' },
});
assert.equal(trusted.isAdmin, true, 'app_metadata server-side deve autorizar o Admin');
assert.equal(trusted.role, 'admin');
assert.equal(trusted.agent, 'ADMIN-0001', 'app_metadata deve vencer metadados editáveis pelo utilizador');

const invalidAgent = resolveTrustedAuthIdentity({
  app_metadata: { role: 'admin', agent: 'NOT-AN-ADMIN' },
  user_metadata: { role: 'admin', agent: 'ADMIN-0001' },
});
assert.equal(invalidAgent.isAdmin, false, 'papel Admin exige número de agente ADMIN-NNNN confiável');

const institution = resolveTrustedAuthIdentity({
  user_metadata: { role: 'instituicao', instituicao: 'AGT-0001', agent: 'AGT-0001-01' },
  app_metadata: {},
});
assert.equal(institution.isAdmin, false);
assert.equal(institution.role, 'instituicao', 'login institucional mantém o seu papel');

console.log('Admin identity guard: 4/4 verificações passaram.');
