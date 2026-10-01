# Relatório Técnico: Notificações e Badges de Atualização de Cronograma em Denúncias e Reclamações

**República de Angola · Plataforma Oficial do Correio Digital de Angola (CDA) — 2026**  
**Data:** 01 de Outubro de 2026  
**Ambiente:** Pré-Produção / Produção (Vite + React + TypeScript + Supabase + Playwright)  
**Autor:** Equipa de Engenharia de Plataforma CDA  

---

## 1. Resumo Executivo

O presente documento relata a implementação e validação do sistema integrado de **notificações em tempo real e indicadores visuais (badges numéricos)** para atualizações de tramitação, despacho e cronograma de **Denúncias e Reclamações** no Correio Digital de Angola.

Sempre que uma Instituição (e.g., AGT, ENDE, EPAL, SME) atualiza o cronograma, marco de tramitação ou despacho de uma Denúncia ou Reclamação:
1. **Emissão de Notificação:** Uma notificação em tempo real é gerada e associada exclusivamente ao identificador do cidadão remetente (`recipientBi` / `ownerId` / `sessionOwnerKey`).
2. **Registo na Correspondência:** A cópia enviada pelo cidadão recebe a marcação de novidade não lida (`unread: 1`, `novidade: true`) com o estado de fase atualizado (`status: 'Fase: ...'`).
3. **Badges no Painel Principal:**
   - **Botão «Denuncia»:** Exibe badge numérico com a contagem exata de atualizações pendentes em denúncias submetidas.
   - **Botão «Livro de Reclamações»:** Exibe badge numérico com a contagem exata de atualizações pendentes em reclamações submetidas.
   - **Ocultação Automática:** Ambos os badges ficam totalmente invisíveis quando `count === 0`.
4. **Badge no Avatar de Perfil (Header):** O indicador numérico superior acumula as correspondências e notificações não lidas em tempo real.
5. **Ciclo de Limpeza:** Ao aceder à lista e abrir a correspondência tramitada para consulta detalhada do cronograma, o sistema marca a novidade como lida e decrementa os contadores instantaneamente.

---

## 2. Arquitetura e Implementação Técnica

### 2.1. Lógica Pura de Classificação e Contagem (`src/utils/notificacoesAtalhos.ts`)
- Implementada a função `contarNotificacoesAtalhos` e `novidadesPorMensagem` com suporte a `poolsContexto` (`poolsPorPapel`), garantindo desambiguação estrita entre a fila de «Denuncia» (`[REGISTO DE DENÚNCIA]`) e «Livro de Reclamações» (`[DENÚNCIA]` / `[RECLAMAÇÃO]`).
- Contabilização exata de novidades por item: mensagens com atualizações de tramitação não lidas (`novidade: true` / `unread: 1`) e notificações em tempo real.
- Suporte a contagem de denúncias/reclamações tanto para a caixa de entrada da instituição (`isInstMode`) quanto para as correspondências enviadas pelo cidadão (`!isInstMode`).

### 2.2. Atualização e Sincronização no Cronograma (`src/components/features/CronogramaDenuncia.tsx`)
- Ao avançar de fase (e.g., *Em Análise*, *Investigação Técnica*, *Despacho Final*), o componente:
  - Regista o evento no histórico da mensagem (`message_state_history`).
  - Cria notificação com `ownerId = senderBi` para direcionamento ao cidadão.
  - Sincroniza via Supabase Realtime e canais locais (`cda_notifications_<bi>`, `correio_digital_sent`, `cda-cronograma-updated`).

### 2.3. Gestão Global de Estado e Limpeza (`src/App.tsx`)
- Adicionado listener de evento customizado `cda-cronograma-updated` para atualização reativa do estado global `sentMessages` e `notifications`.
- No manipulador `handleSelectMessage`, ao abrir a correspondência pelo remetente:
  - Marca `unread: 0` e `novidade: false` na cópia do remetente sem violar a regra de recibo de leitura do destinatário (REGRA R2).
  - Executa `limparAvisosDaCorrespondencia` associando a notificação pelo assunto canónico.
- Cálculo de `unreadTotal` integrado para o avatar do cabeçalho superior.

### 2.4. Indicadores Visuais no Painel e Cabeçalho (`HomeContent.tsx`, `Header.tsx`, `ListaParticipacaoContent.tsx`)
- **Botões do Painel:** Badges estilizados com `data-notification-badge="nova-denuncia"` e `data-notification-badge="denuncias"`.
- **Cabeçalho:** `data-testid="avatar-unread-badge"` no avatar de perfil em Desktop e Mobile.
- **Listagem de Itens:** Badge pulsante por item (`data-testid="badge-item-<id>"`) destacando ocorrências e denúncias com novidades.

---

## 3. Cobertura de Testes Automatizados E2E (Playwright)

Foram executadas duas suítes dedicadas de testes ponta a ponta simulando o ciclo de vida completo:

### Suíte 1: `scripts/e2e_test_notificacoes_cronograma_denuncia_reclamacao.mjs`
- **Asserções:** 12/12 aprovadas (100% de sucesso).
- **Cenários Cobertos:**
  1. Injeção de atualizações de cronograma em denúncias e reclamações para o cidadão `(QA_BI_A)`.
  2. Validação visual e acessibilidade dos badges nos botões «Denuncia» e «Livro de Reclamações».
  3. Validação do badge acumulado no avatar de perfil do Header.
  4. Navegação para a lista de denúncias e consulta da correspondência com cronograma.
  5. Limpeza e decremento instantâneo dos badges após visualização.
  6. Responsividade mobile (viewport 390x844).

### Suíte 2: `scripts/e2e_notificacoes_cronograma_denuncia_completo.mjs`
- **Asserções:** 9/9 aprovadas (100% de sucesso).
- **Cenários Cobertos:**
  1. Submissão inicial de denúncia pelo cidadão para a instituição AGT.
  2. Login institucional da AGT e avanço de fase no cronograma para «Em Análise».
  3. Receção em tempo real e renderização dos badges de notificação na área do cidadão.
  4. Visualização do cronograma pelo cidadão e reposição do contador para 0.
  5. Validação em modo mobile.

### Tabela Resumo dos Testes

| Teste / Verificação | Viewport | Asserções | Resultado |
|---|---|:---:|:---:|
| Badges Atalhos Painel («Denuncia» e «Reclamações») | 1440x900 (Desktop) | 4 | ✅ Aprovado |
| Badge Acumulado Avatar de Perfil | 1440x900 (Desktop) | 2 | ✅ Aprovado |
| Consulta e Abertura do Detalhe com Cronograma | 1440x900 (Desktop) | 3 | ✅ Aprovado |
| Limpeza Instantânea do Badge ao Regressar | 1440x900 (Desktop) | 1 | ✅ Aprovado |
| Badges e Alinhamento em Modo Mobile | 390x844 (Mobile) | 2 | ✅ Aprovado |
| Fluxo Completo Multi-Actor (Cidadão + AGT) | 1440x900 / 390x844 | 9 | ✅ Aprovado |
| **Total Consolidado** | — | **21 / 21** | **✅ 100% Sucesso** |

---

## 4. Validação de Regressão e Integridade do Sistema

Todas as ferramentas de validação do repositório foram executadas com sucesso:

- `npm run test:interop`: 14 mensagens reais testadas no Supabase com sincronização bidirecional aprovada.
- `npm run test:pilot`: 35/35 testes com Supabase aprovados (0 erros, 0 falhas).
- `npm run production:readiness`: Estado `production-candidate` confirmado.
- `tsc --noEmit`: **0 erros de compilação TypeScript**.

---

## 5. Conclusão

A funcionalidade cumpre integralmente todos os requisitos funcionais e de experiência de utilizador:
- Emissão em tempo real e visibilidade de badges em desktop e mobile.
- Persistência e isolamento por utilizador (`ownerKey` / `BI`).
- Limpeza imediata no consumo da correspondência.
- Código seguro, sem credenciais expostas no repositório.
