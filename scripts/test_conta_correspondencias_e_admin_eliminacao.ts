import assert from 'node:assert/strict';
import { homologationStore, ensureCitizenHomologationChannel } from '../src/services/homologationStore.js';

console.log('--- TESTE 1: Correspondências da Conta Aberta (Edlasio Galhardo) ---');
const biEdlasio = '002399714LA030';
homologationStore.clearThread(biEdlasio);
homologationStore.clearStatus(biEdlasio);

// Assegura canal de homologação e ativação para a conta
ensureCitizenHomologationChannel(biEdlasio, 'Edlasio Galhardo', 'active');

const thread = homologationStore.getThread(biEdlasio);
console.log(`Total de correspondências na conta: ${thread.length}`);
assert.equal(thread.length, 2, 'A conta deve apresentar exatamente 2 correspondências oficiais');

const msg1 = thread.find(m => m.text.includes('confirma a receção do seu pedido de registo'));
const msg2 = thread.find(m => m.text.includes('HOMOLOGADA') || m.text.includes('oficialmente ATIVA'));

assert.ok(msg1, 'Mensagem 1 (confirmação de registo) deve estar presente');
assert.ok(msg2, 'Mensagem 2 (ativação e homologação) deve estar presente');
console.log('✅ TESTE 1 APROVADO: As 2 correspondências da conta estão ativas e completas.');

console.log('\n--- TESTE 2: Idempotência de ensureCitizenHomologationChannel ---');
ensureCitizenHomologationChannel(biEdlasio, 'Edlasio Galhardo', 'active');
const thread2 = homologationStore.getThread(biEdlasio);
assert.equal(thread2.length, 2, 'Não devem ser criadas mensagens duplicadas');
console.log('✅ TESTE 2 APROVADO: Idempotência garantida (sempre 2 correspondências).');

console.log('\n--- TESTE 3: Eliminação de Contacto / Cidadão ---');
const dummyBi = '009888777LA111';
ensureCitizenHomologationChannel(dummyBi, 'Cidadao Dummy Teste', 'active');
homologationStore.clearThread(dummyBi);
homologationStore.clearStatus(dummyBi);
assert.equal(homologationStore.getThread(dummyBi).length, 0, 'Thread limpa após eliminação');
assert.equal(homologationStore.getStatus(dummyBi), null, 'Status limpo após eliminação');
console.log('✅ TESTE 3 APROVADO: Eliminação total de dados e correspondências executada.');

// Re-assegura o canal permanente para Edlasio
ensureCitizenHomologationChannel(biEdlasio, 'Edlasio Adjamiro Galhardo', 'active');

console.log('\nTODOS OS TESTES UNITÁRIOS FORAM CONCLUÍDOS COM 100% DE SUCESSO!');
