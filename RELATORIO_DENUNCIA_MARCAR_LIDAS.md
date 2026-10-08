# RELATÓRIO DE HOMOLOGAÇÃO: ATUALIZAÇÃO DO ESTADO PARA «LIDA» AO ABRIR DENÚNCIAS

**Data:** 08 de Outubro de 2026  
**Ambiente:** Correio Digital de Angola (CDA) — Homologação Oficial  
**Módulos Validados:** `denuncias` (Livro de Reclamações), `nova-denuncia` (Denúncia Cívica), `MessageDetail`, `App.tsx`  
**Status Global:** **100% OPERACIONAL E TESTADO (11/11 Testes E2E Aprovados)**

---

## 1. Descrição do Problema e Causa Raiz

Na página de **Denúncias** (`#/nova-denuncia` e `#/denuncias`), ao abrir correspondências que indicavam estado "Não Lida" (com badge de novidade ou alertas não lidos):
1. A função `handleSelectMessage` na abertura de denúncias do utilizador não persistia o atributo `status: 'Lida'` nas coleções de estado React (`sentMessages`) nem no armazenamento local (`localStorage: correio_digital_sent`).
2. O efeito de persistência e reposição de leituras (`applyRead`) não cobria a lista `sentMessages`, permitindo que re-renderizações mantivessem a indicação visual de não lida.
3. Os alertas e notificações vinculados por `messageId` ou pelo assunto da denúncia não eram todos varridos por `limparAvisosDaCorrespondencia`, mantendo os badges pulsantes ativos mesmo após a abertura do detalhe da correspondência.

---

## 2. Correções Implementadas

1. **Atualização Atómica em `handleSelectMessage`:**
   - Garantida a transição imediata para `{ unread: 0, status: 'Lida', novidade: false }` tanto na abertura pelo remetente como pelo destinatário (institucional).
   - Sincronização em tempo real de `setInbox`, `setSentMessages`, `setDocInbox`, `setInstInbox`, `setInstDocInbox`.
   - Atualização persistente em `localStorage` (`correio_digital_sent` e `correio_digital_inbox`) e registo no `persistReadMessageId`.
2. **Varredura Completa de Avisos e Notificações (`limparAvisosDaCorrespondencia`):**
   - Suporte expandido para identificadores base (`baseId`) e compostos (`message.id`), além de prefixos normalizados de assunto e notificações da categoria `denuncias` / `nova-denuncia`.
3. **Persistência Global de Leituras (`applyRead`):**
   - Inclusão de `setSentMessages` no ciclo de persistência `applyRead`, assegurando que o estado `'Lida'` permanece estável após recargas de página e trocas de rota.
4. **Cálculo Consistente de Badges e Contadores (`ListaParticipacaoContent` & `notificacoesAtalhos`):**
   - Unificação do parâmetro `fundeNaoLidas = true` para todas as listagens de participação e desambiguação dos contadores do Painel e do cabeçalho.

---

## 3. Resultados dos Testes Automatizados E2E

### Fluxo 1 — Cidadão (`002399714LA030`)
- **[PASS] 1.1** Autenticação do cidadão no portal Correio Digital de Angola.
- **[PASS] 1.2** Acesso à página de Denúncia (`#/nova-denuncia`).
- **[PASS] 1.3** Abertura do detalhe da correspondência de denúncia pendente.
- **[PASS] 1.4** Estado da correspondência atualizado para `"Lida"` (`unread: 0`, `status: 'Lida'`).
- **[PASS] 1.5** Regresso à lista de Denúncias via botão voltar (`BotaoVoltar`).
- **[PASS] 1.6** Badge e contador de não lidas removidos com sucesso da interface.

### Fluxo 2 — Instituição (`INAPEM-LMM-01`)
- **[PASS] 2.1** Autenticação da Instituição com credenciais operacionais.
- **[PASS] 2.2** Acesso à listagem institucional de Denúncias / Reclamações (`#/denuncias`).
- **[PASS] 2.3** Consulta detalhada do processo de denúncia recebido.
- **[PASS] 2.4** Marcação atómica como `"Lida"` na caixa de entrada institucional (`unread: 0`, `status: 'Lida'`).
- **[PASS] 2.5** Regresso concluído com sucesso e contadores sincronizados.

---

## 4. Conclusão

O comportamento foi corrigido e testado de ponta a ponta em múltiplos cenários (Cidadão e Instituição). Ao entrar e abrir qualquer correspondência de denúncia não lida, o estado é imediatamente atualizado para **"Lida"** em toda a aplicação e na base de dados.
