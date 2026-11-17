// Cria uma conta de instituição de PROVA sem a marca `instituicao` no JWT,
// entra e chama a RPC — reproduz o P0001 que o utilizador viu.
const fs=require('fs');
const env={}; for(const l of fs.readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const URL=env.SUPABASE_URL, SR=env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL='prova.lookup.p0001@inst.correiodigital.ao', PASS='ProvaLookup!2026';
const H={'apikey':SR,'Authorization':'Bearer '+SR,'Content-Type':'application/json'};
(async()=>{
  // 1. apagar se ficou de outra execução
  const lista=await (await fetch(`${URL}/auth/v1/admin/users?page=1&per_page=200`,{headers:H})).json();
  for(const u of (lista.users||[])) if(u.email===EMAIL) await fetch(`${URL}/auth/v1/admin/users/${u.id}`,{method:'DELETE',headers:H});
  // 2. criar conta de instituição SEM app_metadata.instituicao
  const r=await fetch(`${URL}/auth/v1/admin/users`,{method:'POST',headers:H,body:JSON.stringify({
    email:EMAIL, password:PASS, email_confirm:true,
    app_metadata:{role:'instituicao', agent:'AGT-LMM-01'},   // ← falta «instituicao»
  })});
  const user=await r.json();
  console.log('conta de prova criada:', r.status, user.id? user.id.slice(0,8)+'…' : JSON.stringify(user).slice(0,120));
  // 3. entrar e chamar a RPC como essa conta
  const anon=env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_KEY || SR;
  const login=await fetch(`${URL}/auth/v1/token?grant_type=password`,{method:'POST',
    headers:{'apikey':anon||SR,'Content-Type':'application/json'},body:JSON.stringify({email:EMAIL,password:PASS})});
  const sess=await login.json();
  if(!sess.access_token){ console.log('login falhou:',JSON.stringify(sess).slice(0,200)); process.exit(1); }
  const pl=JSON.parse(Buffer.from(sess.access_token.split('.')[1],'base64').toString());
  console.log('JWT app_metadata:',JSON.stringify(pl.app_metadata));
  const rpc=await fetch(`${URL}/rest/v1/rpc/cda_cidadao_lookup_bi`,{method:'POST',
    headers:{'apikey':anon||SR,'Authorization':'Bearer '+sess.access_token,'Content-Type':'application/json'},
    body:JSON.stringify({p_bi:'002399714LA030'})});
  console.log('RPC →',rpc.status, (await rpc.text()).slice(0,200));
  console.log('ID da conta de prova:', user.id);
})();
