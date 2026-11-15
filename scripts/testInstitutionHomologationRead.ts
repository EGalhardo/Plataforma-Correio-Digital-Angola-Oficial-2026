import assert from 'node:assert/strict';
import { firstInstitutionReceiptId, isInstitutionHomologationReadMarker, syncInstitutionReceipt } from '../src/services/institutionHomologationRead';
import { homologationInboxId } from '../src/services/homologationReadSync';
const text = 'Exmos. Senhores, confirma a receção da vossa solicitação de adesão.';
assert.equal(firstInstitutionReceiptId([{id:'a',from:'admin',at:'',text}]), homologationInboxId('a'));
assert.equal(firstInstitutionReceiptId([{id:'b',from:'admin',at:'',text:'Aprovação'}]), undefined);
let role='instituicao', code='AGT-LMM', registration='reg-1', stored=new Set<string>(), writes=0, conflict=false, fail=false;
const fetcher: typeof fetch = async (input, init) => {
  const url = String(input);
  if (url.includes('/auth/v1/user')) return Response.json({app_metadata:{role,instituicao:code}});
  if (url.includes('/rest/v1/solicitacoes_registo')) return Response.json([{id:registration}]);
  const body=JSON.parse(String(init?.body));
  if (body.operacao==='select') return Response.json({ok:true,linhas:stored.has(body.filtros.dedupe_key)?[{target_bi:code,dedupe_key:body.filtros.dedupe_key,read_at:'now'}]:[]});
  writes++;
  if (fail) return Response.json({ok:false},{status:503});
  const row=body.dados[0];
  if (conflict) { stored.add(row.dedupe_key); return Response.json({ok:false},{status:409}); }
  stored.add(row.dedupe_key);return Response.json({ok:true});
};
const run=(read:boolean)=>syncInstitutionReceipt({url:'https://example.invalid',key:'public',token:'token',code:'AGT-LMM',localRead:()=>read,fetcher});
async function main(){
 assert.equal((await run(false)).read,false);assert.equal(writes,0,'unopened is not written');
 assert.equal((await run(true)).read,true);assert.equal(writes,1);assert.equal((await run(false)).read,true);
 registration='reg-2';assert.equal((await run(false)).read,false,'new registration is unread');
 role='cidadao';await assert.rejects(run(true),/sessão não corresponde/);role='instituicao';
 code='OTHER';await assert.rejects(run(true),/sessão não corresponde/);code='AGT-LMM';
 conflict=true;assert.equal((await run(true)).read,true,'concurrent duplicate resolved');
 registration='reg-3';conflict=false;fail=true;await assert.rejects(run(true),/guardar/);
 assert.equal(isInstitutionHomologationReadMarker('cda:institution-homologation-read:reg-1'),true);
 assert.equal(isInstitutionHomologationReadMarker('cda:message:1:AGT-LMM'),false);
 console.log('institution homologation read: PASS');
}
void main();
