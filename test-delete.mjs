// Teste direto do endpoint de eliminação
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
    console.log('Status Text:', resp.statusText);
    
    const json = await resp.json();
    console.log('Response:', JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Erro:', err);
  }
}

testDeleteEndpoint();
