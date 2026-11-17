// Prova os três caminhos: (a) instituição sem marca → localiza; (b) cidadão → barrado;
// (c) serviço → barrado (não inventa) ; (d) limpeza da conta de prova.
const fs=require('fs');
const env={}; for(const l of fs.readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const URL=env.SUPABASE_URL, SR=env.SUPABASE_SERVICE_ROLE_KEY, ANON=env.SUPABASE_ANON_KEY;
const EMAIL='prova.lookup.p0001@inst.correiodigital.ao', PASS='ProvaLookup!2026';
const rpc=async(tk,fn,bi)=>{const r=await fetch(`${URL}/rest/v1/rpc/${fn}`,{method:'POST',headers:{apikey:ANON,Authorization:'Bearer '+tk,'Content-Type':'application/json'},body:JSON.stringify({p_bi:bi})});return r.status+' '+(await r.text()).slice(0,120);};
const login=async(email,pass)=>{const r=await fetch(`${URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:ANON,'Content-Type':'application/json'},body:JSON.stringify({email,password:pass})});return (await r.json());};
(async()=>{
  // criar a conta de prova (instituição SEM a marca «instituicao» no JWT)
  const lista0=await (await fetch(`${URL}/auth/v1/admin/users?page=1&per_page=200`,{headers:{apikey:SR,Authorization:'Bearer '+SR}})).json();
  for(const u of (lista0.users||[])) if(u.email===EMAIL) await fetch(`${URL}/auth/v1/admin/users/${u.id}`,{method:'DELETE',headers:{apikey:SR,Authorization:'Bearer '+SR}});
  await fetch(`${URL}/auth/v1/admin/users`,{method:'POST',headers:{apikey:SR,Authorization:'Bearer '+SR,'Content-Type':'application/json'},
    body:JSON.stringify({email:EMAIL,password:PASS,email_confirm:true,app_metadata:{role:'instituicao',agent:'AGT-LMM-01'}})});
  const s1=await login(EMAIL,PASS);
  console.log('(a) instituição sem marca no JWT → lookups:', s1.access_token?'sessão ok':'FALHOU');
  if(s1.access_token){
    console.log('    lookup  :', await rpc(s1.access_token,'cda_cidadao_lookup_bi','002399714LA030'));
    console.log('    rede    :', await rpc(s1.access_token,'cda_rede_emergencia_bi','002399714LA030'));
  }
  const s2=await login('bi.002399714la030@cidadao.correiodigital.ao','123456789');
  console.log('(b) cidadão → lookup:', s2.access_token? await rpc(s2.access_token,'cda_cidadao_lookup_bi','002399714LA030') : 'sem sessão');
  console.log('(c) sem token (anon) → lookup:', await rpc(ANON,'cda_cidadao_lookup_bi','002399714LA030'));

  // limpeza da conta de prova
  const lista=await (await fetch(`${URL}/auth/v1/admin/users?page=1&per_page=200`,{headers:{apikey:SR,Authorization:'Bearer '+SR}})).json();
  for(const u of (lista.users||[])) if(u.email===EMAIL){ await fetch(`${URL}/auth/v1/admin/users/${u.id}`,{method:'DELETE',headers:{apikey:SR,Authorization:'Bearer '+SR}}); console.log('(d) conta de prova removida:',u.id.slice(0,8)+'…'); }
  const depois=await (await fetch(`${URL}/auth/v1/admin/users?page=1&per_page=200`,{headers:{apikey:SR,Authorization:'Bearer '+SR}})).json();
  console.log('    contas restantes:', (depois.users||[]).length, '(esperado 3 reais)');
})();
