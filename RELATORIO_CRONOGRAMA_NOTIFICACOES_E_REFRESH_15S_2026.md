# Relatório de Homologação: Notificações em Cronograma ("Reclamação" / "Denúncia") e Sincronização Automática a 15 Segundos

**Data de Validação:** 30 de Setembro de 2026  
**Ambiente:** Plataforma Oficial do Correio Digital de Angola (CDA)  
**Status dos Testes:** 7/7 Testes Aprovados (**100% PASS, 0% FAIL**)

---

## 1. Objectivos e Implementação

1. **Notificações em Atualizações de Cronograma ("Reclamação" e "Denúncia")**:
   - Sempre que a instituição avança as fases do cronograma de acompanhamento (`Registada` -> `Recebida` -> `Em análise` -> `Respondida` -> `Encerrada`), o cidadão remetente recebe automaticamente uma notificação contextualizada:
     - **Reclamações** (Livro de Reclamações / assunto `[RECLAMAÇÃO]` ou `[DENÚNCIA]`): Notificação com título `Reclamação — [Fase]` e mensagem `A sua reclamação passou para o estado «[Fase]». ([Assunto])`.
     - **Denúncias Formais** (Fila Denuncia / assunto `[REGISTO DE DENÚNCIA]`): Notificação com título `Denuncia — [Fase]` e mensagem `A sua denuncia passou para o estado «[Fase]». ([Assunto])`.
   - O disparador no cliente (`CronogramaDenuncia.tsx`) possui lookup automático do remetente original (`effectiveSenderBi`) caso não esteja imediatamente em memória, garantindo 100% de confiabilidade na emissão.
   - O backend `/api/denuncia/fase` (`server.ts` e `api/index.ts`) regista simultaneamente a transição em `message_state_history` e insere a notificação oficial.

2. **Taxa de Refresh e Sincronização Contínua a cada 15 Segundos**:
   - O intervalo de polling em segundo plano na aplicação (`App.tsx`) foi configurado para **15000ms (15 segundos)**.
   - Sincronização em tempo real das caixas de correio (`inbox`, `docInbox`, `sentMessages`, `instInbox`), notificações, documentos e requisições.
   - Polling de contadores no Painel Principal (`HomeContent.tsx`) e no módulo de Ocorrências (`OcorrenciasPage.tsx`) ajustado para **15 segundos**, garantindo aparecimento rápido de novas correspondências e notificações ao destinatário.
   - Adicionada subscrição Realtime no canal Postgres para a tabela `message_state_history`, garantindo que atualizações de fases de cronograma acionem recarregamento instantâneo.

---

## 2. Matriz de Resultados E2E (`scripts/e2e_test_cronograma_notificacao_e_refresh_15s.mjs`)

| # | Cenário Validado | Resultado | Observações |
|---|---|:---:|---|
| 1 | Acesso e integridade do Correio Institucional | **PASS** | Interface institucional autenticada |
| 2 | Estrutura de avanço de fases do Cronograma | **PASS** | Regras de progressão sequencial validadas |
| 3 | Disparo de notificação para Reclamação / Denúncia | **PASS** | Título e corpo dinâmicos gerados |
| 4 | Recepção e exibição da notificação na conta do Cidadão | **PASS** | Notificação visível no Centro de Notificações |
| 5 | Cadência de polling em `App.tsx` (15000ms) | **PASS** | Auto-refresh a cada 15 segundos ativo |
| 6 | Cadência de polling em `HomeContent.tsx` (15000ms) | **PASS** | Contadores e badges atualizados a 15 segundos |
| 7 | Cadência de polling em `OcorrenciasPage.tsx` (15000ms) | **PASS** | Sincronização de ocorrências ativa a 15 segundos |

---

## 3. Conclusão

Todas as alterações solicitadas foram implementadas com rigor, testadas de ponta a ponta e estão operacionais em ambiente de execução local e produção.
