const supaUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

async function check() {
  const r1 = await fetch(supaUrl + '/rest/v1/profiles?bi=in.(002399714LA030,INAPEM-LMM-01,INAPEM-LMM,INAPEM)&select=*', {
    headers: { apikey: supaKey, Authorization: 'Bearer ' + supaKey }
  });
  console.log('Profiles:', await r1.json());

  const r2 = await fetch(supaUrl + '/rest/v1/solicitacoes_registo?bi_numero=in.(002399714LA030,INAPEM-LMM-01,INAPEM-LMM,INAPEM)&select=*', {
    headers: { apikey: supaKey, Authorization: 'Bearer ' + supaKey }
  });
  console.log('Solicitacoes:', await r2.json());
}

check();
