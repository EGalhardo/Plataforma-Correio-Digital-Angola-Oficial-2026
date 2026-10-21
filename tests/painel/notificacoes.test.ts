import assert from 'node:assert/strict';
import {
  contarNotificacoesAtalhos as count,
  tipoPorAlvoTitulo as tipo,
  novidadesPorMensagem as nov,
  ligarNotificacoesSessoes as sess,
  isVideoAtendimentoMessage,
  isInqueritoMessage,
  isOcorrenciaMessage,
  isNovaDenunciaMessage,
  isReclamacaoDenunciaMessage
} from '../../src/utils/notificacoesAtalhos';

const n = (id: number, targetTab: string, title = '', unread = true, message = '') => ({
  id,
  targetTab,
  title,
  unread,
  message,
  time: 'Agora',
  type: 'info' as const
});

const m = (id: number, subject: string, unread = 1, extra = {}) => ({
  id,
  details: { subject },
  unread,
  ...extra
} as any);

let checks = 0;

// ============================================================================
// TESTES DO MODO INSTITUIÇÃO (2026-09-28)
// As opções só apresentam badge caso haja correspondência recebida não lida na caixa.
// ============================================================================

// 1. Caixa vazia na Instituição => todas as contagens são rigorosamente 0
assert.deepEqual(count([], [], true), {
  'video-atendimento': 0,
  inqueritos: 0,
  ocorrencias: 0,
  denuncias: 0,
  'nova-denuncia': 0
});
checks++;

// 2. Notificações gerais sem correspondência na caixa => badge é 0
assert.equal(count([n(1, 'video-atendimento', 'Vídeo agendado')], [], true)['video-atendimento'], 0);
checks++;
assert.equal(count([n(2, 'inst-video', 'Aviso')], [], true)['video-atendimento'], 0);
checks++;
assert.equal(count([n(3, 'sondagens', 'Nova resposta')], [], true).inqueritos, 0);
checks++;
assert.equal(count([], [], true, 15).ocorrencias, 0);
checks++;

// 3. Correspondência de Vídeo-Atendimento recebida não lida => badge = 1
const msgVideoNaoLida = m(101, 'Video-atendimento agendado: Reunião Fiscal', 1, { details: { subject: 'Video-atendimento agendado: Reunião Fiscal', actions: ['video-atendimento'] } });
assert.equal(count([], [msgVideoNaoLida], true)['video-atendimento'], 1);
checks++;

// 4. Correspondência de Vídeo-Atendimento lida => badge = 0
const msgVideoLida = m(102, 'Video-atendimento agendado: Reunião Fiscal', 0, { status: 'Lida', details: { subject: 'Video-atendimento agendado: Reunião Fiscal', actions: ['video-atendimento'] } });
assert.equal(count([], [msgVideoLida], true)['video-atendimento'], 0);
checks++;

// 5. Correspondência de Inquérito / Sondagem recebida não lida => badge = 1
const msgInqNaoLida = m(103, 'Inquérito de Satisfação Tributária', 1, { sondagem_id: 'sond_01' });
assert.equal(count([], [msgInqNaoLida], true).inqueritos, 1);
checks++;

// 6. Correspondência de Inquérito lida => badge = 0
const msgInqLida = m(104, 'Inquérito de Satisfação Tributária', 0, { status: 'Lida', sondagem_id: 'sond_01' });
assert.equal(count([], [msgInqLida], true).inqueritos, 0);
checks++;

// 7. Correspondência de Ocorrência recebida não lida => badge = 1
const msgOcoNaoLida = m(105, '[OCORRÊNCIA] Iluminação Pública em Falha', 1, { details: { subject: '[OCORRÊNCIA] Iluminação Pública em Falha', type: 'ocorrencia' } });
assert.equal(count([], [msgOcoNaoLida], true).ocorrencias, 1);
checks++;

// 8. Correspondência de Ocorrência lida => badge = 0
const msgOcoLida = m(106, '[OCORRÊNCIA] Iluminação Pública em Falha', 0, { status: 'Lida', details: { subject: '[OCORRÊNCIA] Iluminação Pública em Falha', type: 'ocorrencia' } });
assert.equal(count([], [msgOcoLida], true).ocorrencias, 0);
checks++;

// 9. Correspondência de Denúncia (nova fila «Denuncia») recebida não lida => badge = 1
const msgNovaDenNaoLida = m(107, '[REGISTO DE DENÚNCIA] Denúncia de Fraude Fiscal', 1);
assert.equal(count([], [msgNovaDenNaoLida], true)['nova-denuncia'], 1);
checks++;

// 10. Correspondência de Denúncia lida => badge = 0
const msgNovaDenLida = m(108, '[REGISTO DE DENÚNCIA] Denúncia de Fraude Fiscal', 0, { status: 'Lida' });
assert.equal(count([], [msgNovaDenLida], true)['nova-denuncia'], 0);
checks++;

// 11. Correspondência de Reclamação (Livro de Reclamações) recebida não lida => badge = 1
const msgRecNaoLida = m(109, '[DENÚNCIA] Reclamação de Atendimento ao Balcão', 1);
assert.equal(count([], [msgRecNaoLida], true).denuncias, 1);
checks++;

// 12. Correspondência de Reclamação lida => badge = 0
const msgRecLida = m(110, '[DENÚNCIA] Reclamação de Atendimento ao Balcão', 0, { status: 'Lida' });
assert.equal(count([], [msgRecLida], true).denuncias, 0);
checks++;

// 13. Múltiplas correspondências mistas não lidas e lidas na Instituição
const caixaMista = [
  msgVideoNaoLida,
  msgVideoLida,
  msgInqNaoLida,
  msgOcoNaoLida,
  msgNovaDenNaoLida,
  msgNovaDenLida,
  msgRecNaoLida,
  m(111, '[REGISTO DE DENÚNCIA] Segunda Denúncia', 1)
];
const contagemMista = count([n(1, 'video-atendimento'), n(2, 'denuncias')], caixaMista, true);
assert.deepEqual(contagemMista, {
  'video-atendimento': 1,
  inqueritos: 1,
  ocorrencias: 1,
  'nova-denuncia': 2,
  denuncias: 1
});
checks++;

// ============================================================================
// TESTES DO MODO CIDADÃO (Comportamento Preservado)
// ============================================================================
assert.equal(count([n(1, 'video-atendimento')], [], false)['video-atendimento'], 1);
checks++;
assert.equal(count([n(1, 'video-atendimento', '', false)], [], false)['video-atendimento'], 0);
checks++;
assert.equal(count([n(1, 'correspondencias', 'Denúncia — Em análise')], [], false).denuncias, 1);
checks++;
// 16. No Cidadão, correspondência de Reclamação recebida não lida na caixa => badge = 1
assert.equal(count([], [m(1, '[DENÚNCIA] Teste', 1)], false).denuncias, 1);
checks++;
// 17. No Cidadão, correspondência de Reclamação lida => badge = 0
assert.equal(count([], [m(1, '[DENÚNCIA] Teste', 0, { status: 'Lida' })], false).denuncias, 0);
checks++;
assert.equal(count([], [m(1, 'Consulta de teste', 1, { sondagem_id: 'x' })], false).inqueritos, 1);
checks++;
assert.equal(count([], [m(1, 'Consulta de teste', 0, { sondagem_id: 'x' })], false).inqueritos, 0);
checks++;
assert.equal(count([], [], false, 12).ocorrencias, 12);
checks++;

// Classificação directa por alvo + título
assert.equal(tipo(n(1, 'video-atendimento', 'X')), 'video-atendimento');
checks++;
assert.equal(tipo(n(1, 'correspondencias', 'Denúncia — Recebida')), 'denuncias');
checks++;
assert.equal(tipo(n(1, 'correspondencias', 'Novo Inquérito Oficial')), 'inqueritos');
checks++;
assert.equal(tipo(n(1, 'correspondencias', 'Nova Sondagem Oficial')), 'inqueritos');
checks++;

console.log(`\n🎉 ${checks} VERIFICAÇÕES DE CONTAGEM E REGRAS DE BADGE APROVADAS COM SUCESSO!`);
