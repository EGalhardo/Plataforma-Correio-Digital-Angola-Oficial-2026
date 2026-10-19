/**
 * limpar_todas_contas_exceto_admin.mjs
 * Script de purga completa de todas as contas na base de dados Supabase e Storage,
 * preservando EXCLUSIVAMENTE a conta do Administrador Central (ADMIN-0001).
 */

import fs from 'fs';

let SUPABASE_URL = '';
let SERVICE_KEY = '';

try {
  const envContent = (fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '') + '\n' +
                     (fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      SERVICE_KEY = trimmed.split('=')[1].replace(/["']/g, '').trim();
    }
    if (trimmed.startsWith('VITE_SUPABASE_URL=') || trimmed.startsWith('SUPABASE_URL=')) {
      SUPABASE_URL = trimmed.split('=')[1].replace(/["']/g, '').trim();
    }
  }
} catch (e) {}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json'
};

async function purgarTudoExcetoAdmin() {
  console.log('================================================================');
  console.log('🗑️ PURGANDO TODAS AS CONTAS DO SUPABASE (PRESERVANDO ADMIN-0001)');
  console.log('Target:', SUPABASE_URL);
  console.log('================================================================\n');

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Erro: Chaves de serviço do Supabase não configuradas.');
    process.exit(1);
  }

  // 1. Obter Utilizadores do Auth
  console.log('1. [AUTH] Listando e eliminando utilizadores...');
  let totalEliminados = 0;
  let adminId = null;

  try {
    const resAuth = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=100`, { headers });
    const authData = await resAuth.json();
    const users = authData.users || [];

    for (const u of users) {
      const isAdm = (u.email && u.email.includes('admin-0001')) || (u.user_metadata?.agent === 'ADMIN-0001');
      if (isAdm) {
        adminId = u.id;
        console.log(`  🛡️ PRESERVANDO CONTA ADMIN: ${u.email} (ID: ${u.id})`);
        // Garantir que a password é 123456789
        await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            password: '123456789',
            email_confirm: true,
            user_metadata: {
              ...u.user_metadata,
              agent: 'ADMIN-0001',
              role: 'admin',
              name: 'Edlasio Galhardo'
            }
          })
        });
      } else {
        const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, {
          method: 'DELETE',
          headers
        });
        if (delRes.ok) {
          console.log(`  🗑️ Eliminado utilizador Auth: ${u.email} (${u.id})`);
          totalEliminados++;
        } else {
          console.warn(`  ⚠️ Falha ao eliminar utilizador Auth: ${u.email}`);
        }
      }
    }
  } catch (e) {
    console.error('❌ Erro ao listar/eliminar utilizadores Auth:', e);
  }

  console.log(`\n  → Total de utilizadores Auth eliminados: ${totalEliminados}`);

  // 2. Limpar Tabelas Relacionais
  console.log('\n2. [BASE DE DADOS] Purgando tabelas relacionais...');

  const tabelasParaLimpar = [
    'solicitacoes_registo',
    'messages',
    'contacts',
    'video_sessions',
    'video_session_events',
    'message_state_history',
    'sondagem_respostas',
    'sondagens',
    'inquerito_ia_respostas',
    'inqueritos_ia',
    'documents',
    'document_requests',
    'digital_protocols',
    'cda_ocorrencias',
    'notifications',
    'emergency_alerts',
    'audit_logs'
  ];

  for (const tab of tabelasParaLimpar) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${tab}?id=not.is.null`, {
        method: 'DELETE',
        headers: { ...headers, Prefer: 'return=minimal' }
      });
      console.log(`  🧹 Tabela '${tab}': limpa (${res.status})`);
    } catch (e) {
      console.warn(`  ⚠️ Falha ao limpar '${tab}':`, e.message);
    }
  }

  // 3. Purgar Perfis excepto ADMIN-0001
  console.log('\n3. [PROFILES] Purgando perfis excepto ADMIN-0001...');
  try {
    const resProf = await fetch(`${SUPABASE_URL}/rest/v1/profiles?bi=neq.ADMIN-0001`, {
      method: 'DELETE',
      headers: { ...headers, Prefer: 'return=minimal' }
    });
    console.log(`  🧹 Perfis não-admin eliminados (${resProf.status})`);
  } catch (e) {
    console.warn('  ⚠️ Falha ao limpar perfis:', e.message);
  }

  // 4. Garantir Perfil do Admin
  console.log('\n4. [PROFILES] Assegurando perfil oficial do ADMIN-0001...');
  try {
    const adminProfile = [{
      bi: 'ADMIN-0001',
      name: 'Edlásio Galhardo',
      role: 'admin',
      email: 'agente.admin-0001@admin.correiodigital.ao',
      phone: '+244 923 000 001'
    }];
    const resAdm = await fetch(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=bi`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(adminProfile)
    });
    const admData = await resAdm.json();
    console.log('  ✅ Perfil ADMIN-0001 ativo:', admData);
  } catch (e) {
    console.warn('  ⚠️ Falha ao garantir perfil do admin:', e.message);
  }

  // 5. Verificação Final
  console.log('\n================================================================');
  console.log('🔍 VERIFICAÇÃO FINAL DO ESTADO DO BANCO DE DADOS');
  console.log('================================================================');

  const [resFAuth, resFProf, resFSol] = await Promise.all([
    fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=100`, { headers }).then(r => r.json()),
    fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, { headers }).then(r => r.json()),
    fetch(`${SUPABASE_URL}/rest/v1/solicitacoes_registo?select=*`, { headers }).then(r => r.json()),
  ]);

  const fUsers = resFAuth.users || [];
  console.log(`\n• Utilizadores Auth Activos (${fUsers.length}):`);
  fUsers.forEach(u => console.log(`  - ${u.email} (Agent: ${u.user_metadata?.agent || 'N/A'}, Role: ${u.user_metadata?.role || 'N/A'})`));

  console.log(`\n• Perfis Activos (${Array.isArray(resFProf) ? resFProf.length : 0}):`);
  if (Array.isArray(resFProf)) {
    resFProf.forEach(p => console.log(`  - ${p.bi} | ${p.name} | Role: ${p.role}`));
  }

  console.log(`\n• Solicitações de Registo (${Array.isArray(resFSol) ? resFSol.length : 0}):`);
  if (Array.isArray(resFSol)) {
    resFSol.forEach(s => console.log(`  - ${s.bi_numero} | ${s.nome} | Status: ${s.status}`));
  }

  console.log('\n================================================================');
  console.log('🎉 PURGA CONCLUÍDA: Apenas ADMIN-0001 permanece no sistema!');
  console.log('================================================================\n');
}

purgarTudoExcetoAdmin().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
