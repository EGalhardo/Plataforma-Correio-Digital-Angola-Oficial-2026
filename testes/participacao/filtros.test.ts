import assert from 'node:assert/strict';
import {listarParticipacao} from '../../src/utils/listasParticipacao';
import type {Message} from '../../src/types';
const base = {org:'Nome reservado',preview:'Correspondência',date:'01/01/2000',status:'Normal'};
const msgs:Message[]=[
 {...base,id:1,details:{subject:'Ofício normal',body:''}},
 {...base,id:2,sondagem_id:20},
 {...base,id:3,sondagem_ids:[21,22]},
 {...base,id:4,inquerito_ia_id:30},
 {...base,id:5,inquerito_ia_ids:[31]},
 {...base,id:6,sondagem_id:20,inquerito_ia_id:30},
 {...base,id:7,details:{subject:'[DENÚNCIA] Cobrança irregular',body:''}},
 {...base,id:8,details:{subject:'[denuncia] Abuso',body:''}},
 {...base,id:9,details:{subject:'Informação sobre denúncias e inquéritos',body:''}},
];
assert.deepEqual(listarParticipacao(msgs,'inqueritos').map(m=>m.id),[2,3,4,5,6]);
assert.deepEqual(listarParticipacao(msgs,'denuncias').map(m=>m.id),[7,8]);
assert.equal(listarParticipacao(msgs,'inqueritos','6').length,1);
assert.equal(listarParticipacao(msgs,'denuncias','  COBRANCA  ').length,1);
assert.equal(listarParticipacao(msgs,'denuncias','Nome reservado',true).length,0);
assert.equal(listarParticipacao(msgs,'denuncias','Nome reservado',false).length,2);
assert.equal(listarParticipacao(msgs,'inqueritos','inexistente').length,0);
assert.equal(listarParticipacao([], 'denuncias').length,0);
assert.equal(listarParticipacao(msgs,'inqueritos','   ').length,5);
assert.equal(listarParticipacao(msgs,'denuncias','abuso',true)[0].id,8);
assert.equal(msgs.length,9);
console.log('11 verificações aprovadas: classificação, legado, IA, duplicação, pesquisa, privacidade e ausência de mutações.');
