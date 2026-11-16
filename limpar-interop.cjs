const fs=require('fs');
const env=fs.readFileSync('.env','utf8');
const svc=env.match(/SUPABASE_SERVICE_ROLE_KEY=([^\s\n]+)/)[1];
const b='https://klrclczcahfycfdxzdqs.supabase.co';
const H={apikey:svc,Authorization:'Bearer '+svc,'Content-Type':'application/json'};
(async()=>{
 const apagar=(u)=>fetch(b+u,{method:'DELETE',headers:H});
 const msgs=await (await fetch(b+'/rest/v1/messages?select=id,subject,sender_bi,recipient_bi&limit=1000',{headers:H})).json();
 const alvo=msgs.filter(m=>/INTEROP-|DIAG-|RECON-|E2E-|TESTE-/i.test(String(m.subject||'')));
 console.log('mensagens de teste a apagar:',alvo.length);
 console.log('  assuntos:',[...new Set(alvo.map(m=>String(m.subject).slice(0,42)))].slice(0,8));
 for(const m of alvo){
   await apagar('/rest/v1/message_state_history?message_id=eq.'+m.id);
   await apagar('/rest/v1/messages?id=eq.'+m.id);
 }
 const ocs=await (await fetch(b+'/rest/v1/cda_ocorrencias?select=id,numero,titulo&limit=500',{headers:H})).json();
 const ocAlvo=ocs.filter(o=>/INTEROP-|DIAG-|RECON-|E2E-|TESTE-/i.test(String(o.titulo||'')));
 console.log('ocorrências de teste a apagar:',ocAlvo.map(o=>'#'+o.numero).join(' '));
 for(const o of ocAlvo){
   for(const t of ['cda_ocorrencias_eventos','cda_ocorrencias_fotos','cda_ocorrencias_notificacoes'])
     await apagar(`/rest/v1/${t}?ocorrencia_id=eq.${o.id}`);
   await apagar('/rest/v1/cda_ocorrencias?id=eq.'+o.id);
 }
 // notificações criadas pelos testes
 await apagar('/rest/v1/notifications?title=like.*INTEROP*');
 await apagar('/rest/v1/notifications?message=like.*INTEROP*');
 const fim={};
 fim.mensagens=(await (await fetch(b+'/rest/v1/messages?select=id',{headers:H,Prefer:'count=exact'})).json()).length;
 fim.ocorrencias=await (await fetch(b+'/rest/v1/cda_ocorrencias?select=numero,titulo',{headers:H})).json();
 console.log('\nESTADO FINAL:');
 console.log(' mensagens:',fim.mensagens);
 console.log(' ocorrências:',fim.ocorrencias.map(o=>`#${o.numero} ${String(o.titulo).slice(0,40)}`).join(' | '));
 const perfis=await (await fetch(b+'/rest/v1/profiles?select=bi',{headers:H})).json();
 console.log(' perfis:',perfis.map(p=>p.bi).join(', '));
})();
