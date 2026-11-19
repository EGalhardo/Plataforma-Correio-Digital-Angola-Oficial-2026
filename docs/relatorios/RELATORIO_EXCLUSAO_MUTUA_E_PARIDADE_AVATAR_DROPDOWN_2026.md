# Relatório Técnico: Invariante de Leitura, Exclusão Mútua e Paridade 1:1 Avatar Dropdown

**Data de Homologação:** 01 de Outubro de 2026  
**Ambiente:** Plataforma de Correio Digital de Angola (CDA) — Versão Oficial 2026  
**Responsável Técnico:** Agente de Engenharia de Software e QA CDA  
**Status do Sistema:** 🟢 **100% Homologado em Produção (12/12 Asserções de Paridade & 0 Erros TypeScript)**

---

## 1. Sumário Executivo

O presente relatório atesta a implementação da **regra estrita de exclusão mútua e consistência de leitura** entre correspondências «Lidas» e «Não Lidas», bem como a **sincronização canónica e paridade matemática 1:1 entre o badge da foto de perfil (Avatar) e o seu menu dropdown**.

---

## 2. Invariante de Leitura (Exclusão Mútua)

1. **Precedência Global e Isolamento Estrito ($\text{Lidas} \cap \text{Não Lidas} = \emptyset$):**
   - Uma correspondência é formalmente classificada como «Lida» quando `unread === 0` ou `status ∈ {'Lida', 'Lido', 'Visualizada'}`.
   - Foram implementados os predicados canónicos `isMensagemLida` e `isMensagemNaoLida` em `src/utils/notificacoesAtalhos.ts`.
   - Nenhuma correspondência marcada como lida (por ID ou protocolo) é computada como pendência nem adicionada ao badge do Avatar ou à aba «Não Lidas».
2. **Persistência Global da Leitura:**
   - A abertura de correspondências no `handleSelectMessage` invoca `persistReadMessageId(bi, baseId, msg.id)` e sincroniza imediatamente o `localStorage` (`correio_digital_inbox`, `correio_digital_sent` e `cda_read_msgs_<BI>`).
   - Sincronização em segundo plano não sobrescreve estados de leitura já consumidos pelo utilizador.

---

## 3. Sintonia Canónica e Paridade 1:1 com o Menu Dropdown do Avatar

1. **Paridade Matemática Rigorosa:**
   $$\text{Count(Badge do Avatar)} \equiv \text{Total de Itens Listados no Dropdown} \equiv \sum \text{Itens Não Lidos}$$
2. **Exibição Integral no Dropdown:**
   - Ao clicar sobre a foto de perfil (Avatar), o menu exibe exatamente a lista dos itens não lidos que compõem o valor numérico do badge.
   - Cada item apresenta o seu remetente, assunto/resumo, data e ícone temático correspondente (Vídeo, Megaphone de Comunicados, Bandeira de Denúncias, Inquérito, Ocorrência ou Correio).
3. **Reatividade Imediata de Leitura:**
   - Ao clicar em qualquer item do dropdown, o item é marcado como lido, decrementando instantaneamente o badge e o contador do menu de $N$ para $N-1$, e removendo o item do dropdown.

---

## 4. Matriz de Testes E2E Automatizados (`scripts/e2e_exclusao_mutua_e_dropdown_avatar.mjs`)

| N.º | Caso de Teste E2E | Resultado |
| :---: | :--- | :---: |
| **1** | Abas «Lidas» e «Não Lidas» disponíveis no Correio | 🟢 **PASS** |
| **2** | Listagem da aba «Lidas» carregada e filtrada | 🟢 **PASS** |
| **3** | Listagem da aba «Não Lidas» contém estritamente correspondências pendentes | 🟢 **PASS** |
| **4** | Exclusão Mútua: Correspondência Lida NÃO aparece na listagem de Não Lidas | 🟢 **PASS** |
| **5** | Badge do Avatar reflete fielmente o total de pendências ativas | 🟢 **PASS** |
| **6** | Abertura do Menu Dropdown ao clicar no Avatar do utilizador | 🟢 **PASS** |
| **7** | Contador do cabeçalho do Menu Dropdown coincide com o Badge do Avatar | 🟢 **PASS** |
| **8** | **PARIDADE 1:1**: Total de itens renderizados no Dropdown é IDÊNTICO ao Badge | 🟢 **PASS** |
| **9** | Leitura via Dropdown: Badge do Avatar decrementa imediatamente | 🟢 **PASS** |
| **10** | Item lido é removido do Dropdown e a contagem restante coincide com o Badge | 🟢 **PASS** |
| **11** | Modo Mobile (390×844): Sintonia e renderização do Badge no telemóvel | 🟢 **PASS** |
| **12** | Modo Mobile (390×844): Paridade 1:1 no menu Dropdown móvel | 🟢 **PASS** |

---

## 5. Compilação TypeScript

- **Comando:** `npx tsc --noEmit`
- **Resultado:** **0 erros** de compilação em toda a base de código.
