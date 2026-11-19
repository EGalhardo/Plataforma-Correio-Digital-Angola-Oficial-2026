# Relatório de Homologação: Sincronização Reativa e Decremento de Badges de Notificação (CDA 2026)

**Data de Execução:** 04 de Outubro de 2026  
**Ambiente:** Plataforma Oficial Correio Digital de Angola (CDA)  
**Status Geral:** 100% HOMOLOGADO E CONFORME

---

## 1. Módulos Abrangidos e Regras de Negócio

| Módulo | Ação de Leitura / Abertura | Comportamento do Badge | Persistência & Sincronização |
| :--- | :--- | :--- | :--- |
| **Correspondências (Correio / Mensagens)** | Abertura da mensagem na caixa de entrada ou detalhe | Decrementa de imediato em 1 unidade no Card do Painel e no Avatar. Se `count === 0`, o badge fica totalmente oculto. | Gravado localmente (`localStorage`) e persistido via `supabaseService.markMessageReadByRecipient` e `markNotificationRead`. |
| **Vídeo-Atendimento** | Entrada na sessão ou consulta do agendamento assinalado | Reduz o contador do atalho *Vídeo-Atendimento* e do badge do Avatar. Oculta o badge quando chega a 0. | Sincronizado via `VideoSessionService` e notificações de sessão em tempo real. |
| **Inquéritos** | Abertura ou resposta ao inquérito/sondagem | Decrementa o badge do atalho *Inquéritos* e do Avatar em tempo real. Desaparece quando não há inquéritos pendentes. | Atualizado via `ListaParticipacaoContent` e `SondagensContent`. |
| **Ocorrências (Locais & Institucionais)** | Leitura do detalhe da ocorrência ou atualização do cronograma | Decrementa o badge de *Ocorrências* e atualiza o estado em ambas as áreas (Cidadão e Instituição). Desaparece quando `0`. | Persistência direta em `cda_ocorrencias` / `ocorrenciasApi("ler_notificacao")`. |
| **Denúncias / Livro de Reclamações** | Consulta da tramitação ou abertura da reclamação/denúncia | Decrementa os badges dos respetivos atalhos (*Denuncia* e *Livro de Reclamações*) e do Avatar instantaneamente. | Persistido com rastreio de cronograma e histórico de eventos. |
| **Comunicados Oficiais** | Abertura e visualização do comunicado emitido | Decrementa o contador do atalho *Comunicados* e limpa o badge ao atingir 0. | Sincronizado na caixa de entrada e na listagem de comunicados. |

---

## 2. Invariantes de Interface e Regra do Zero

1. **Decremento Imediato:** Quando o utilizador abre ou visualiza um item que se encontrava não lido, a contagem do respetivo badge diminui imediatamente (ex.: de 3 para 2).
2. **Regra do Zero (`count === 0`):** Quando a contagem atinge zero, o elemento visual do badge é completamente ocultado da interface (não exibe '0', nem círculos residuais).
3. **Harmonia 1:1:** O total exibido no badge do Avatar do cabeçalho reflete a soma exata de todas as notificações e correspondências não lidas, mantendo paridade com o dropdown de notificações e os atalhos do painel.

---

## 3. Resultados dos Testes Automatizados E2E

- `scripts/e2e_badges_harmonia_sintonia.mjs`: **21/21 testes aprovados (100% PASS)**
- `scripts/e2e_notificacoes_cronograma_denuncia_completo.mjs`: **9/9 testes aprovados (100% PASS)**
- `scripts/e2e_ocorrencias_cronograma_e_fotos.mjs`: **100% PASS (0 falhas)**
- `npm run lint`: **0 erros / 0 avisos**
