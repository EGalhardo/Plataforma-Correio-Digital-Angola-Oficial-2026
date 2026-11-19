import dotenv from 'dotenv';
dotenv.config({ path: ['.env', '.env.local'] });

const BASE = 'http://localhost:3000';

async function testAreaAwareChat() {
  console.log('🧪 Testando IA com Consciência de Área (Cidadão, Instituição, Admin)...\n');

  const modes = [
    { mode: 'user', name: 'Área do Cidadão', expected: ['Painel', 'Correio', 'Contactos', 'Perfil', 'Solicitar Documento', 'Ocorrências Locais'] },
    { mode: 'institution', name: 'Área Institucional', expected: ['Painel Institucional', 'Correio Institucional', 'Equipa', 'Validação por QR Code', 'Assistência IA', 'Ocorrências Recebidas'] },
    { mode: 'admin', name: 'Área de Administração Central (SOC / Governo)', expected: ['Painel Nacional', 'Interoperabilidade', 'Cidadãos', 'Equipa Central', 'Relatórios', 'Auditoria e Segurança'] }
  ];

  for (const m of modes) {
    console.log(`📡 [${m.name}] Enviando: "Indica-me as páginas presentes"...`);
    const resp = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Indica-me as páginas presentes na minha área.' }],
        appMode: m.mode,
        isGovMode: m.mode === 'admin',
        isInstMode: m.mode === 'institution',
        language: 'pt'
      })
    });

    const data = await resp.json();
    console.log(`  HTTP Status: ${resp.status}`);
    console.log(`  Resposta da IA:\n---\n${data.message || data.error}\n---`);

    let matched = 0;
    for (const term of m.expected) {
      const hasTerm = (data.message || '').toLowerCase().includes(term.toLowerCase());
      console.log(`  - Contém "${term}": ${hasTerm ? '✅' : '❌'}`);
      if (hasTerm) matched++;
    }
    console.log(`  Resultado: ${matched}/${m.expected.length} termos da área presentes.\n`);
  }
}

testAreaAwareChat().catch(console.error);
