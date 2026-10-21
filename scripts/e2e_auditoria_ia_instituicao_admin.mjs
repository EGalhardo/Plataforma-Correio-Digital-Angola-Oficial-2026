import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE || 'http://localhost:3000';

async function testarArea(nome, appMode, isGov, isInst, page, pergunta, palavrasEsperadas) {
  console.log(`\n🔍 Testando ${nome}: "${pergunta.slice(0, 60)}..."`);
  const inicio = Date.now();
  try {
    const resp = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: pergunta }],
        appMode,
        isGovMode: isGov,
        isInstMode: isInst,
        currentPage: page,
        language: 'pt'
      })
    });
    const duracao = Date.now() - inicio;
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const txt = json.message || '';
    const encontrou = palavrasEsperadas.filter(p => txt.toLowerCase().includes(p.toLowerCase()));
    const ok = txt.length > 50 && encontrou.length >= 2;
    console.log(`  ${ok ? '✅ PASS' : '⚠️ WARN'} (${duracao}ms) - Termos identificados: ${encontrou.join(', ')}`);
    return ok;
  } catch (err) {
    console.error(`  ❌ FAIL: ${err.message}`);
    return false;
  }
}

async function run() {
  console.log('🚀 Iniciando Validação E2E de Enquadramento Contextual da IA (Instituição e Admin)...');

  let total = 0;
  let passados = 0;

  // 1. Instituição
  total++;
  if (await testarArea(
    'Área Institucional - Módulos',
    'institution', false, true, 'home',
    'Quais são as minhas principais atribuições e páginas operacionais aqui na Área Institucional?',
    ['institui', 'correio', 'equipa', 'valida', 'qr', 'ocorrênci', 'inquérito']
  )) passados++;

  total++;
  if (await testarArea(
    'Área Institucional - Correspondência',
    'institution', false, true, 'correspondencias',
    'Como posso emitir e enviar uma correspondência oficial com protocolo e selo digital para um cidadão identificado pelo BI?',
    ['protocolo', 'bi', 'cidad', 'selo', 'ofício', 'enviar']
  )) passados++;

  // 2. Admin
  total++;
  if (await testarArea(
    'Área Admin - SOC e Dashboard',
    'admin', true, false, 'gov-dashboard',
    'Quais são os módulos e ferramentas operacionais disponíveis para a Administração Central no Gov Dashboard e SOC?',
    ['soc', 'dashboard', 'segurança', 'interoperabilidade', 'correspondências', 'auditoria']
  )) passados++;

  total++;
  if (await testarArea(
    'Área Admin - Relatórios',
    'admin', true, false, 'gov-relatorio',
    'Como são gerados os relatórios consolidados e estatísticas estratégicas de interoperabilidade nacional?',
    ['relatório', 'estatística', 'indicador', 'interoperabilidade', 'nacional']
  )) passados++;

  console.log(`\n======================================================`);
  console.log(`🎉 VALIDAÇÃO CONCLUÍDA: ${passados}/${total} TESTES APROVADOS (${Math.round((passados / total) * 100)}% SUCESSO)!`);
  console.log(`======================================================`);

  if (passados < total * 0.75) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Falha geral:', err);
  process.exit(1);
});
