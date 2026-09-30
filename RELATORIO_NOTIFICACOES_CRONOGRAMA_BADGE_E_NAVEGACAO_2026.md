# Relatório de Homologação: Notificações de Cronograma com Badge de Foto de Perfil e Acesso Direto ao Cronograma

**Data de Validação:** 30 de Setembro de 2026  
**Ambiente:** Plataforma Oficial do Correio Digital de Angola (CDA)  
**Status dos Testes:** 4/4 Testes Aprovados (**100% PASS, 0% FAIL**)

---

## 1. Objectivos e Comportamento Implementado

1. **Badge na Foto de Perfil Idêntico ao Envio de Correspondência**:
   - Sempre que uma correspondência classificada como "Reclamação" ou "Denúncia" tem a sua fase de cronograma atualizada pela instituição destinatária, a correspondência passa automaticamente ao estado de **não lida (`unread: 1`)**.
   - Isto ativa o **badge vermelho com contador numérico** na foto de perfil (avatar do cabeçalho) do cidadão remetente.
   - No menu suspenso da foto de perfil, a correspondência atualizada surge listada sob a secção de correspondências não lidas.

2. **Navegação Direta para o Cronograma ao Clicar na Notificação**:
   - Ao clicar na notificação (seja no dropdown de notificações do cabeçalho, no modal de detalhe da notificação ou no Centro de Notificações `#/notificacoes`):
     - A aplicação localiza automaticamente a correspondência associada através do assunto contextualizado;
     - Abre diretamente a página de **Detalhe da Correspondência (`#/mensagem`)** exibindo a linha do tempo do **Cronograma de Acompanhamento** (`data-testid="cronograma-denuncia"`) com o estado ativo e histórico de eventos.

---

## 2. Matriz de Resultados E2E (`scripts/e2e_test_notificacao_cronograma_badge_e_navegacao.mjs`)

| # | Cenário Validado | Resultado | Detalhes |
|---|---|:---:|---|
| 1 | Visibilidade do componente de perfil no cabeçalho | **PASS** | Avatar e elementos de cabeçalho ativos |
| 2 | Ativação do Badge vermelho de Não Lidas na foto de perfil | **PASS** | Badge numérico exibido no avatar |
| 3 | Abertura da correspondência via Menu da Foto de Perfil | **PASS** | Exibição do cronograma ao clicar no item |
| 4 | Navegação direta para o Cronograma via Centro de Notificações | **PASS** | Abertura do Detalhe da Correspondência e Cronograma |

---

## 3. Conclusão

A experiência de notificação de cronograma foi padronizada com o fluxo de envio/receção de correspondências oficiais, incluindo a ativação de badges no avatar de perfil e navegação instantânea para o acompanhamento do processo.
