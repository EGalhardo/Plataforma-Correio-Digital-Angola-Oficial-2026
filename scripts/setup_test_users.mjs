const supaUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const headers = {
  'apikey': supaKey,
  'Authorization': `Bearer ${supaKey}`,
  'Content-Type': 'application/json'
};

async function setup() {
  const cidBi = process.env.QA_BI_A || '002399714LA030';
  const cidPass = process.env.QA_CID_PASS || '123456789';
  const cidEmail = `bi.${cidBi.toLowerCase()}@cidadao.correiodigital.ao`;
  const cidName = 'Edlasio Adjamiro Galhardo';

  console.log('1. Setting up citizen:', cidBi);
  // List users from Auth
  const listResp = await fetch(`${supaUrl}/auth/v1/admin/users?per_page=1000`, { headers });
  const usersData = await listResp.json();
  const existingCidUser = usersData?.users?.find(u => u.email === cidEmail || u.user_metadata?.bi === cidBi);
  
  if (existingCidUser) {
    console.log('Updating password for existing Auth user:', existingCidUser.id);
    await fetch(`${supaUrl}/auth/v1/admin/users/${existingCidUser.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        password: cidPass,
        user_metadata: { bi: cidBi, full_name: cidName, role: 'user' }
      })
    });
  } else {
    console.log('Creating new Auth user for citizen...');
    await fetch(`${supaUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: cidEmail,
        password: cidPass,
        email_confirm: true,
        user_metadata: { bi: cidBi, full_name: cidName, role: 'user' }
      })
    });
  }

  // solicitacoes_registo
  const solResp = await fetch(`${supaUrl}/rest/v1/solicitacoes_registo?bi_numero=eq.${cidBi}`, { headers });
  const solData = await solResp.json();
  if (!solData || solData.length === 0) {
    console.log('Inserting into solicitacoes_registo...');
    await fetch(`${supaUrl}/rest/v1/solicitacoes_registo`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        bi_numero: cidBi,
        nome: cidName,
        email: cidEmail,
        status: 'Aprovado',
        observacoes: 'Conta oficial homologada para testes'
      })
    });
  } else {
    console.log('Updating solicitacoes_registo status to Aprovado...');
    await fetch(`${supaUrl}/rest/v1/solicitacoes_registo?bi_numero=eq.${cidBi}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'Aprovado' })
    });
  }

  // profiles
  const profResp = await fetch(`${supaUrl}/rest/v1/profiles?bi=eq.${cidBi}`, { headers });
  const profData = await profResp.json();
  if (!profData || profData.length === 0) {
    console.log('Inserting into profiles...');
    await fetch(`${supaUrl}/rest/v1/profiles`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        bi: cidBi,
        name: cidName,
        role: 'user',
        provincia: 'Luanda'
      })
    });
  }

  // 2. Setting up institution: INAPEM-LMM-01
  const instCode = process.env.QA_INST || 'INAPEM-LMM-01';
  const instBase = process.env.QA_INST_BASE || 'INAPEM-LMM';
  const instPass = process.env.QA_INST_PASS || '123456789';
  const instEmail = process.env.QA_INST_EMAIL || 'edlasiogalhardo@inapem.ao';
  const instName = 'INAPEM — instituto nacional de apoio as micro, pequenas e médias empresas.';

  console.log('\n2. Setting up institution:', instCode);
  const existingInstUser = usersData?.users?.find(u => u.email === instEmail || u.user_metadata?.institutionCode === instBase || u.user_metadata?.institutionCode === instCode);
  
  if (existingInstUser) {
    console.log('Updating password for existing Auth institution user:', existingInstUser.id);
    await fetch(`${supaUrl}/auth/v1/admin/users/${existingInstUser.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        password: instPass,
        user_metadata: { institutionCode: instBase, role: 'institution' }
      })
    });
  } else {
    console.log('Creating Auth user for institution...');
    await fetch(`${supaUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: instEmail,
        password: instPass,
        email_confirm: true,
        user_metadata: { institutionCode: instBase, role: 'institution' }
      })
    });
  }

  await fetch(`${supaUrl}/rest/v1/solicitacoes_registo?bi_numero=eq.${instBase}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'Aprovado' })
  });

  const profInstResp = await fetch(`${supaUrl}/rest/v1/profiles?bi=eq.${instBase}`, { headers });
  const profInst = await profInstResp.json();
  if (!profInst || profInst.length === 0) {
    await fetch(`${supaUrl}/rest/v1/profiles`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        bi: instBase,
        name: instName,
        role: 'institution',
        provincia: 'Luanda'
      })
    });
  }

  console.log('\nSetup complete!');
}

setup().catch(console.error);
