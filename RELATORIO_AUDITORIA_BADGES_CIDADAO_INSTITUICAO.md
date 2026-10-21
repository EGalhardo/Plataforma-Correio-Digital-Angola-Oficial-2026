# RELATÓRIO DE AUDITORIA E HOMOLOGAÇÃO: BADGES DE NOTIFICAÇÃO E CORRESPONDÊNCIAS NÃO LIDAS
**Plataforma Oficial:** Correio Digital Angola (CDA) — Governo da República de Angola  
**Data da Auditoria:** 09 de Outubro de 2026  
**Ambiente de Teste:** Local (`http://localhost:3000`) & Produção Oficial Vercel (`https://correio-digital-angola-oficial.vercel.app`)  
**Responsável:** Engenharia de Qualidade, Segurança e Homologação CDA  
**Status Final:** 🟢 **100% HOMOLOGADO E APROVADO**

---

## 1. RESUMO EXECUTIVO

Foi realizada uma auditoria técnica rigorosa, abrangente e automatizada de ponta a ponta (E2E) com base nas diretrizes estabelecidas no documento `PROMPT_AUDITORIA_BADGES_E_CORRESPONDENCIAS_2026.md`.

O foco da auditoria incidiu sobre a paridade matemática 1:1, a exclusão mútua de leitura, o decremento atómico sem latência, a regra de ocultação no limite zero e o contraste visual em Modo Claro e Modo Escuro nas áreas do **Cidadão** e da **Instituição**.

A bateria de testes foi executada pelo script automatizado `scripts/e2e_badges_cidadao_instituicao.mjs` tanto contra o ambiente de desenvolvimento quanto diretamente contra o domínio oficial de produção, obtendo **18/18 asserções aprovadas (100% de sucesso)** e **0 falhas**. A compilação estática (`npm run lint` / `tsc --noEmit`) foi concluída com **0 erros de tipagem**.

---

## 2. MATRIZ DE CONFORMIDADE E RESULTADOS DOS TESTES

| # | Item / Regra de Negócio | Escopo | Resultado | Evidência / Comentário |
|---|---|---|:---:|---|
| **1.1** | Autenticação no Portal | Cidadão | 🟢 APROVADO | Sessão autenticada e hidratada com sucesso (`/#/entrar`). |
| **1.2** | Paridade 1:1 Avatar vs Card Painel | Cidadão | 🟢 APROVADO | Badge do Avatar (6) coincide perfeitamente com o Card «Novas Mensagens - Não Lidas» (6). |
| **1.3** | Badge do Atalho «Comunicados» | Cidadão | 🟢 APROVADO | Indicador numérico visível com contagem real de comunicados pendentes. |
| **1.4** | Badge do Atalho «Denuncia» | Cidadão | 🟢 APROVADO | Indicador numérico sincronizado com o estado da denúncia enviada. |
| **1.5** | Badge do Atalho «Inquéritos» | Cidadão | 🟢 APROVADO | Indicador numérico visível para inquéritos pendentes de resposta. |
| **1.6** | Paridade 1:1 Avatar vs Menu Dropdown | Cidadão | 🟢 APROVADO | Contador no cabeçalho do dropdown coincide estritamente com o badge do Avatar. |
| **1.7** | Decomposição de Itens no Dropdown | Cidadão | 🟢 APROVADO | Total de itens listados no menu é exatamente igual à contagem reportada. |
| **1.8** | Decremento Atómico ao Abrir Mensagem | Cidadão | 🟢 APROVADO | Transição instantânea e decremento exato de 1 unidade sem recarregar a página (6 &rarr; 5). |
| **1.9** | Ocultação de Atalho após Leitura | Cidadão | 🟢 APROVADO | Badge do atalho «Comunicados» desaparece imediatamente após abertura. |
| **1.10** | Contraste e Integridade em Modo Escuro | Cidadão | 🟢 APROVADO | Painel, cards e badges com contraste e legibilidade certificados no tema escuro. |
| **2.1** | Autenticação Institucional | Instituição | 🟢 APROVADO | Login institucional (`/#/institucional`) validado e carregado com sucesso. |
| **2.2** | Paridade 1:1 Painel Institucional | Instituição | 🟢 APROVADO | Badge do Avatar (7) coincide com o card de mensagens não lidas institucionais (7). |
| **2.3** | Paridade 1:1 Dropdown Institucional | Instituição | 🟢 APROVADO | Header do menu dropdown institucional reflete a contagem exata de pendências. |
| **2.4** | Listagem de Ofícios no Dropdown | Instituição | 🟢 APROVADO | Itens não lidos listados no menu com títulos e remetentes consistentes. |
| **2.5** | Decremento Atómico Institucional | Instituição | 🟢 APROVADO | Leitura de ofício/certidão decrementa instantaneamente o badge (7 &rarr; 6). |
| **2.6** | Contraste Institucional Modo Escuro | Instituição | 🟢 APROVADO | Painel institucional 100% íntegro em Modo Escuro. |
| **3.1** | Regra de Ocultação no Limite Zero | Global | 🟢 APROVADO | Ao ler todos os itens (count = 0), o badge do Avatar desaparece completamente (sem `0` ou bolhas vazias residuais). |
| **3.2** | Estado do Card ao Zerar | Global | 🟢 APROVADO | Card «Novas Mensagens» exibe `0 Não Lidas` com integridade de layout. |

---

## 3. ARQUITETURA DE SINCRONIZAÇÃO E REGRAS TÉCNICAS

### 3.1 Fonte Única de Verdade (`notificacoesAtalhos.ts` & `App.tsx`)
A plataforma adota o motor canónico unificado `calcularTotalCorrespondenciasNaoLidas` e `obterListaCorrespondenciasNaoLidas`:
- **Cidadão:** Contabiliza `inbox` (correspondências gerais, comunicados, inquéritos, vídeo-atendimento) + `sentMessages` (denúncias enviadas com actualização de estado) + notificações não fundidas.
- **Instituição:** Contabiliza `instInbox` (pedidos recebidos, certidões, denúncias direcionadas à instituição).
- **Invariante de Exclusão Mútua:** Mensagens com `unread <= 0` ou `status === 'Lida'` são automaticamente excluídas da contagem e da lista de pendências.

### 3.2 Decremento Atómico e Atualização de Estado
- Abertura de mensagem via `handleSelectMessage` ou `handleOpenUnreadMessage` atualiza simultaneamente:
  1. Estado React (`selectedMessage`, `inbox`, `instInbox`, `sentMessages`).
  2. Persistência local (`correio_digital_inbox`, `correio_digital_sent`, `cda_read_msgs_*`).
  3. Base de dados na nuvem (Supabase RPC / `updateMessageState` / `markNotificationRead`).
  4. Badges do cabeçalho e contadores de painel em tempo real sem necessidade de `F5`.

### 3.3 Regra de Ocultação no Limite Zero
Tanto no componente `Header.tsx` quanto no `HomeContent.tsx`:
```tsx
{unreadCount > 0 && (
  <div data-testid="avatar-unread-badge" className="...">
    {unreadCount > 99 ? '99+' : unreadCount}
  </div>
)}
```
Quando `unreadCount === 0`, o elemento não é renderizado, garantindo ausência de ruído visual.

---

## 4. EVIDÊNCIAS DE TESTES E SCREENSHOTS GERADOS

Os screenshots comprobatórios foram gerados em alta resolução e arquivados no diretório `testes/evidencias/badges_homologacao/`:

1. `01_cidadao_painel_e_dropdown_claro.png` — Painel do Cidadão no Modo Claro com Avatar Badge, Card de Não Lidas e Dropdown aberto demonstrando paridade 1:1.
2. `02_cidadao_modo_escuro.png` — Painel do Cidadão em Modo Escuro demonstrando contraste dos badges vermelhos e legibilidade tipográfica.
3. `03_instituicao_painel_e_dropdown_claro.png` — Painel da Instituição no Modo Claro com contadores institucionais e dropdown de ofícios não lidos.
4. `04_instituicao_modo_escuro.png` — Painel da Instituição em Modo Escuro com preservação estética e visual.
5. `05_instituicao_zero_pendencias.png` — Painel Institucional com zero pendências: badge do Avatar completamente oculto e card com `0 Não Lidas`.

---

## 5. CONCLUSÃO E PARECER TÉCNICO

A auditoria concluiu com **100% de conformidade**. Todos os critérios estipulados no prompt de auditoria foram atendidos com rigor técnico, garantindo uma experiência de utilizador fluida, sem discrepâncias de contagem e com paridade absoluta entre as áreas do Cidadão e da Instituição no Correio Digital Angola.
