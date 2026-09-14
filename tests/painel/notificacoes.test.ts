import assert from 'node:assert/strict';
import {contarNotificacoesAtalhos as count, tipoPorAlvoTitulo as tipo, novidadesPorMensagem as nov, ligarNotificacoesSessoes as sess} from '../../src/utils/notificacoesAtalhos';
const n=(id:number,targetTab:string,title='',unread=true,message='')=>({id,targetTab,title,unread,message,time:'Agora',type:'info' as const});
const m=(id:number,subject:string,unread=1,extra={})=>({id,details:{subject},unread,...extra} as any);
let checks=0;
assert.deepEqual(count([],[],false),{'video-atendimento':0,inqueritos:0,ocorrencias:0,denuncias:0});checks++;
assert.equal(count([n(1,'video-atendimento')],[],false)['video-atendimento'],1);checks++;
assert.equal(count([n(1,'video-atendimento','',false)],[],false)['video-atendimento'],0);checks++;
assert.equal(count([n(1,'inst-video')],[],true)['video-atendimento'],1);checks++;
assert.equal(count([n(1,'video-atendimento'),n(1,'video-atendimento')],[],false)['video-atendimento'],1);checks++;
assert.equal(count([n(1,'correspondencias','Denúncia — Em análise')],[],false).denuncias,1);checks++;
assert.equal(count([], [m(1,'[DENÚNCIA] Teste')], false).denuncias,0);checks++;
assert.equal(count([], [m(1,'[DENÚNCIA] Teste')], true).denuncias,1);checks++;
assert.equal(count([], [m(1,'Consulta de teste',1,{sondagem_id:'x'})], false).inqueritos,1);checks++;
assert.equal(count([], [m(1,'Consulta de teste',0,{sondagem_id:'x'})], false).inqueritos,0);checks++;
assert.equal(count([], [m(1,'Consulta de teste',1,{sondagem_id:'x'})], true).inqueritos,0);checks++;
assert.equal(count([n(1,'correspondencias','Nova mensagem',true,'Consulta de teste')], [m(1,'Consulta de teste',1,{sondagem_id:'x'})], false).inqueritos,1);checks++;
assert.equal(count([n(1,'sondagens','Nova resposta')],[],true).inqueritos,1);checks++;
assert.equal(count([],[],false,12).ocorrencias,12);checks++;
assert.equal(count([n(1,'home','Mensagem normal')],[],false).denuncias,0);checks++;
// classificação directa por alvo+título
assert.equal(tipo(n(1,'video-atendimento','X')),'video-atendimento');checks++;
assert.equal(tipo(n(1,'correspondencias','Denúncia — Recebida')),'denuncias');checks++;
assert.equal(tipo(n(1,'correspondencias','Novo Inquérito Oficial')),'inqueritos');checks++;
assert.equal(tipo(n(1,'correspondencias','Nova Sondagem Oficial')),'inqueritos');checks++;
assert.equal(tipo(n(1,'home','Solicitação Enviada')),undefined);checks++;
// enviadas do cidadão: genérica ligada conta; não-lida da enviada não conta nem funde
const sentDen=[m(9,'[DENÚNCIA] Buraco na rua',1)];
assert.equal(count([n(2,'correspondencias','Actualização',true,'Sobre Buraco na rua, novidades')],[],false,0,sentDen).denuncias,1);checks++;
assert.equal(count([n(2,'correspondencias','Denúncia — Em análise',true,'Buraco na rua passou a análise')],[],false,0,sentDen).denuncias,1);checks++;
assert.equal(count([],[m(9,'[DENÚNCIA] X',1)],false,0,[]).denuncias,0);checks++;
// novidadesPorMensagem: soma exacta do badge
const r1=nov([n(2,'correspondencias','Denúncia — Em análise',true,'Buraco na rua passou a análise')],sentDen,'denuncias',false);
assert.equal(r1.porMensagem.get(9)?.atualizacoes,1);checks++;
assert.equal(r1.orfas,0);checks++;
const r2=nov([n(3,'correspondencias','Denúncia — Recebida',true,'Outra coisa qualquer sem assunto')],sentDen,'denuncias',false);
assert.equal(r2.orfas,1);checks++;
const r3=nov([n(4,'correspondencias','Denúncia — Recebida',true,'Falta de água registada')],[m(5,'[DENÚNCIA] Falta de água',1)],'denuncias',true);
assert.equal(r3.porMensagem.get(5)?.naoLida,true);checks++;
assert.equal(r3.porMensagem.get(5)?.atualizacoes,0);checks++;
const r4=nov([n(5,'correspondencias','Denúncia — Em análise',true,'Falta de luz em análise')],[m(6,'[DENÚNCIA] Falta de luz',0)],'denuncias',true);
assert.equal(r4.porMensagem.get(6)?.atualizacoes,1);checks++;
// invariante: badge == soma das novidades da lista + órfãs
const nb=count([n(2,'correspondencias','Denúncia — Em análise',true,'Buraco na rua passou a análise')],[],false,0,sentDen).denuncias;
const nl=nov([n(2,'correspondencias','Denúncia — Em análise',true,'Buraco na rua passou a análise')],sentDen,'denuncias',false);
let soma=nl.orfas; nl.porMensagem.forEach(v=>{ if(v.naoLida)soma++; soma+=v.atualizacoes; });
assert.equal(nb,soma);checks++;
// sessões de vídeo: citação exacta + fallback + lidas fora + sem sessão fora
const S=[{id:'s1',subject:'Teste 123'},{id:'s2',subject:'Outro tema aqui'}];
assert.deepEqual(sess([n(10,'video-atendimento','Video-atendimento agendado',true,'Assunto da chamada: Teste 123')],S).get('s1'),[10]);checks++;
assert.deepEqual(sess([n(11,'video-atendimento','Video-atendimento cancelado',true,'cancelou o video-atendimento "outro tema aqui" marcado')],S).get('s2'),[11]);checks++;
assert.equal(sess([n(12,'video-atendimento','Video-atendimento agendado',false,'Assunto da chamada: Teste 123')],S).size,0);checks++;
assert.equal(sess([n(13,'video-atendimento','Video-atendimento agendado',true,'Assunto da chamada: Sessão eliminada')],S).size,0);checks++;
console.log(`${checks} verificações de contagem aprovadas.`);
