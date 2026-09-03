// Teste direto do endpoint de eliminação
const fetch = require('node-fetch');

async function testDeleteEndpoint() {
  const url = 'https://correio-digital-angola-oficial.vercel.app/api/admin-eliminar-instituicao';
  
  try {
    console.log('Testando endpoint:', url);
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bi_numero: 'TEST-1234' })
    });
    
    console.log('Status:', resp.status);
    console.log('Headers:', resp.headers.raw());
    
    const json = await resp.json();
    console.log('Response:', json);
  } catch (err) {
    console.error('Erro:', err);
  }
}

testDeleteEndpoint();
