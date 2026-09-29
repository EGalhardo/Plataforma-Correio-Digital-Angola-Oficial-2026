/**
 * Teste Unitário & Integração:
 * 1. Registo de Cidadão -> Eliminação por Admin -> Re-registo com as MESMAS credenciais
 * 2. Registo de Instituição -> Eliminação por Admin -> Re-registo com as MESMAS credenciais
 * 3. Validação de purga completa de dados órfãos e ausência de bloqueios em cascata
 */

import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE || 'http://localhost:3000';
const supaUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const h = { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey, 'Content-Type': 'application/json' };

async function assert(cond: boolean, desc: string, details: string = '') {
  if (cond) {
    console.log(`  ✅ [PASS] ${desc}`);
  } else {
    console.error(`  ❌ [FAIL] ${desc} -> ${details}`);
    throw new Error(`Falha no assert: ${desc}`);
  }
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('🧪 TESTES: ELIMINAÇÃO TOTAL DE DADOS ÓRFÃOS E RE-REGISTO COM MESMAS CREDENCIAIS');
  console.log('='.repeat(80) + '\n');

  const testBi = '002399714LA030';
  const testEmail = 'bi.002399714la030@cidadao.correiodigital.ao';
  const testInstCode = 'TESTE-LMM-99';
  const testInstEmail = 'contacto@teste-inst.ao';

  // ---------------------------------------------------------------------------
  // TESTE 1: Purga e eliminação completa de cidadão via endpoint /api/admin-cidadao
  // ---------------------------------------------------------------------------
  console.log('--- TESTE 1: Eliminação em Cascata de Cidadão ---');
  
  // Inserir registo temporário se não existir para simular conta ativa
  await fetch(`${supaUrl}/rest/v1/solicitacoes_registo`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      bi_numero: testBi,
      nome: 'Edlasio Adjamiro Galhardo',
      email: testEmail,
      status: 'Aprovado',
      observacoes: 'Registo de teste para validação de ciclo'
    })
  });

  await fetch(`${supaUrl}/rest/v1/profiles`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      bi: testBi,
      name: 'Edlasio Adjamiro Galhardo',
      role: 'user',
      email: testEmail
    })
  });

  // Executa eliminação administrativa
  const delResp = await fetch(`${BASE_URL}/api/admin-cidadao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bi: testBi, email: testEmail })
  });
  const delResult = await delResp.json();
  console.log('  Resultado da eliminação:', delResult);
  assert(delResult.ok === true, 'Endpoint /api/admin-cidadao executado com sucesso');

  // Verifica se o BI foi removido de solicitacoes_registo
  const checkSol = await fetch(`${supaUrl}/rest/v1/solicitacoes_registo?bi_numero=eq.${testBi}`, { headers: h });
  const rowsSol = await checkSol.json();
  assert(Array.isArray(rowsSol) && rowsSol.length === 0, 'solicitacoes_registo limpo sem resíduos para o BI');

  // Verifica se o BI foi removido de profiles
  const checkProf = await fetch(`${supaUrl}/rest/v1/profiles?bi=eq.${testBi}`, { headers: h });
  const rowsProf = await checkProf.json();
  assert(Array.isArray(rowsProf) && rowsProf.length === 0, 'profiles limpo sem resíduos para o BI');

  // ---------------------------------------------------------------------------
  // TESTE 2: Re-registo com as MESMAS credenciais de Cidadão
  // ---------------------------------------------------------------------------
  console.log('\n--- TESTE 2: Re-registo com as Mesmas Credenciais de Cidadão ---');
  
  // Simula consulta de dup-check pré-registo (mesma query executada pelo RegisterStepper)
  const dupCheckRes = await fetch(`${supaUrl}/rest/v1/solicitacoes_registo?or=(bi_numero.eq.${testBi},email.eq.${encodeURIComponent(testEmail)})`, { headers: h });
  const dupRows = await dupCheckRes.json();
  assert(Array.isArray(dupRows) && dupRows.length === 0, 'Dup-check pré-registo confirma disponibilidade total para novo registo');

  // Submete novo registo com o mesmo BI
  const newRegResp = await fetch(`${supaUrl}/rest/v1/solicitacoes_registo`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      bi_numero: testBi,
      nome: 'Edlasio Adjamiro Galhardo',
      email: testEmail,
      status: 'Pendente',
      observacoes: 'Novo registo submetido após eliminação prévia'
    })
  });
  assert(newRegResp.ok, 'Novo registo com as mesmas credenciais gravado com sucesso em solicitacoes_registo');

  // Limpa novamente para deixar o banco em estado limpo
  await fetch(`${BASE_URL}/api/admin-cidadao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bi: testBi })
  });

  // ---------------------------------------------------------------------------
  // TESTE 3: Eliminação e Re-registo de Instituição
  // ---------------------------------------------------------------------------
  console.log('\n--- TESTE 3: Eliminação e Re-registo de Instituição ---');

  // Inserir instituição de teste
  await fetch(`${supaUrl}/rest/v1/solicitacoes_registo`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      bi_numero: testInstCode,
      nome: 'Instituição de Teste CDA',
      email: testInstEmail,
      status: 'Aprovado',
      observacoes: '[Instituição] Adesão formal. [INST:{"v":1,"sigla":"TESTE","nome":"Instituição de Teste CDA","tipo":"Pública","provincia":"Luanda","municipio":"Luanda","comuna":"Ingombota","endereco":"Av. 4 de Fevereiro","emailContacto":"contacto@teste-inst.ao","emailAcesso":"acesso@teste-inst.ao","telefone":"923000000","responsavel":"Director Geral","cargo":"Director"}]'
    })
  });

  // Elimina instituição via endpoint /api/admin-eliminar-instituicao
  const delInstResp = await fetch(`${BASE_URL}/api/admin-eliminar-instituicao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bi_numero: testInstCode, agentes: [testInstCode, `${testInstCode}-01`] })
  });
  const delInstResult = await delInstResp.json();
  console.log('  Resultado da eliminação da instituição:', delInstResult);
  assert(delInstResult.ok === true, 'Endpoint /api/admin-eliminar-instituicao executado com sucesso');

  // Verifica que a instituição foi removida de solicitacoes_registo
  const checkInstSol = await fetch(`${supaUrl}/rest/v1/solicitacoes_registo?bi_numero=eq.${testInstCode}`, { headers: h });
  const rowsInstSol = await checkInstSol.json();
  assert(Array.isArray(rowsInstSol) && rowsInstSol.length === 0, 'solicitacoes_registo limpo sem resíduos para a Instituição');

  // Re-registo com o mesmo código/email institucional
  const newInstRegResp = await fetch(`${supaUrl}/rest/v1/solicitacoes_registo`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      bi_numero: testInstCode,
      nome: 'Instituição de Teste CDA Re-criada',
      email: testInstEmail,
      status: 'Pendente',
      observacoes: '[Instituição] Adesão formal re-submetida.'
    })
  });
  assert(newInstRegResp.ok, 'Re-registo institucional com as mesmas credenciais efetuado com sucesso');

  // Limpa novamente a instituição de teste
  await fetch(`${BASE_URL}/api/admin-eliminar-instituicao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bi_numero: testInstCode, agentes: [testInstCode, `${testInstCode}-01`] })
  });

  console.log('\n' + '='.repeat(80));
  console.log('🎉 TODOS OS TESTES UNITÁRIOS E DE INTEGRAÇÃO PASSARAM COM 100% DE SUCESSO!');
  console.log('='.repeat(80));
}

runTests().catch(err => {
  console.error('Falha nos testes:', err);
  process.exit(1);
});
