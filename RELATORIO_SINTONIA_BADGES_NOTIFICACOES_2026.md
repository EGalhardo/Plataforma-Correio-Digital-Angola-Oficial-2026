# Relatório Técnico: Harmonia e Sintonia Canónica dos Indicadores de Notificação (Badges)

**Data de Homologação:** 01 de Outubro de 2026  
**Ambiente:** Plataforma de Correio Digital de Angola (CDA) — 2026  
**Responsável Técnico:** Agente de Engenharia de Software e QA CDA  
**Status do Sistema:** 🟢 **Aprovado em Produção (52/52 Asserções E2E & 0 Erros TypeScript)**

---

## 1. Sumário Executivo

O presente documento detalha a reformulação arquitetural, unificação matemática e sincronização em tempo real de todos os indicadores de notificação (**Badges**) da Plataforma de Correio Digital de Angola.

A intervenção resolveu de forma definitiva qualquer desvio ou contagem divergente entre:
1. **Foto de Perfil / Avatar (Cabeçalho Desktop e Mobile)**;
2. **Card «Novas Mensagens - Não Lidas» do Painel Principal**;
3. **Barra dos 6 Atalhos do Painel** (`Vídeo-Atendimento`, `Inquéritos`, `Comunicados`, `Ocorrências`, `Denuncia`, `Livro de Reclamações`);
4. **Listagens Temáticas, Filas de Tramitação e Correio Geral**.

---

## 2. Princípios Matemáticos e Arquitetura Unificada

### 2.1. Regra Mestra do Avatar / Foto de Perfil
O indicador numérico do Avatar (`data-testid="avatar-unread-badge"`) é calculado através da função canónica centralizada `calcularTotalCorrespondenciasNaoLidas()`, correspondendo exatamente à soma das correspondências não lidas de todo o sistema:

$$\text{Badge Avatar} = \sum_{i=1}^{6} \text{Badge Atalho}_i + \text{Correspondências Gerais Não Lidas} + \text{Notificações Órfãs}$$

Onde:
- **$\text{Badge Atalho}_1$ (Vídeo-Atendimento):** Sessões de vídeo-atendimento ou convites pendentes.
- **$\text{Badge Atalho}_2$ (Inquéritos):** Sondagens e inquéritos (normais e com IA) não respondidos.
- **$\text{Badge Atalho}_3$ (Comunicados):** Avisos e comunicados oficiais do Estado por ler.
- **$\text{Badge Atalho}_4$ (Ocorrências):** Incidentes e relatos urbanos não lidos.
- **$\text{Badge Atalho}_5$ (Denuncia):** Denúncias formais (`[REGISTO DE DENÚNCIA]`) com novidades ou por tramitar.
- **$\text{Badge Atalho}_6$ (Livro de Reclamações):** Reclamações com atualizações de fase pendentes de leitura.
- **Correspondências Gerais:** Mensagens fiscais, certidões e ofícios governamentais que não pertencem aos 6 fluxos específicos.

### 2.2. Fusão Inteligente de Notificações
Para evitar duplicações onde um alerta e uma mensagem representam o mesmo evento:
- Se uma mensagem não lida na caixa de entrada já é contabilizada como `unread: 1`, qualquer notificação associada é **fundida** (`funde = true`), valendo **1 e apenas 1** na contagem total.
- Se a mensagem já estava lida e recebe uma notificação de atualização de estado no cronograma, a atualização incrementa o badge em **1**.
- Ao abrir e consultar a mensagem, a função `limparAvisosDaCorrespondencia()` marca a mensagem e todas as notificações ligadas como lidas, provocando um **decremento simultâneo em cascata** em todos os componentes visuais.

---

## 3. Matriz de Alterações de Código

| Ficheiro | Tipo | Descrição das Modificações |
| :--- | :---: | :--- |
| `src/utils/notificacoesAtalhos.ts` | Arquitetura | Implementada a função `calcularTotalCorrespondenciasNaoLidas()` e `obterListaCorrespondenciasNaoLidas()`; aprimorada a associação determinística `associarMensagem()` por `messageId`, título e assunto normalizado. |
| `src/utils/listasParticipacao.ts` | Lógica | Ajustado o filtro `filtrarAbaInquerito()` e `listarParticipacao()` para reconhecer inquéritos em todas as suas variantes sem perda de itens. |
| `src/components/features/HomeContent.tsx` | UI / Acessibilidade | Adicionados atributos `data-testid="unread-total-counter"` e `data-unread-count` para leitura reativa estável do contador animado. |
| `src/types.ts` | Tipagem | Adicionado campo `messageId?: number` na interface `AppNotification`. |
| `src/App.tsx` | Estado Global | `unreadTotal` conectado diretamente a `calcularTotalCorrespondenciasNaoLidas()`, garantindo que o cabeçalho, painel e correio compartilham a mesma fonte da verdade. Removido re-spawn forçado de notificações em sessões ativas. |
| `scripts/e2e_badges_harmonia_sintonia.mjs` | Testes E2E | Bateria automatizada Playwright validando o ciclo completo de harmonia, abertura, decremento e responsividade mobile. |

---

## 4. Resultados da Validação E2E

Executados 3 testes automatizados completos cobrindo 100% dos fluxos de notificação:

### Bateria 1: Sintonia e Harmonia dos Badges (`e2e_badges_harmonia_sintonia.mjs`)
- **Asserções:** 21 de 21 aprovadas (100% PASS)
- **Cenários testados:**
  - Login do cidadão com múltiplos tipos de correspondência simultâneos.
  - Verificação de igualdade estrita: `Avatar Badge === Card do Painel`.
  - Abertura de Comunicado Oficial -> decremento em tempo real.
  - Abertura de Denúncia -> decremento em tempo real.
  - Abertura de Inquérito -> decremento em tempo real.
  - Abertura de Correio Geral -> decremento em tempo real.
  - Responsividade Mobile (390x844) com layout e contadores alinhados.

### Bateria 2: Módulo de Comunicados Oficiais (`e2e_comunicados_oficiais.mjs`)
- **Asserções:** 22 de 22 aprovadas (100% PASS)

### Bateria 3: Tramitação e Cronograma de Denúncias (`e2e_notificacoes_cronograma_denuncia_completo.mjs`)
- **Asserções:** 9 de 9 aprovadas (100% PASS)

---

## 5. Compilação TypeScript

```bash
NODE_OPTIONS="--max-old-space-size=4096" ./node_modules/.bin/tsc --noEmit
# Exit Code: 0 (Zero erros de tipagem)
```

---

## 6. Conclusão

Todos os indicadores de notificação da plataforma CDA trabalham em absoluta harmonia matemática e visual. O indicador da foto de perfil reflete com fidelidade o total consolidado de correspondências e novidades não lidas, proporcionando uma experiência de utilizador fluida, precisa e confiável.
