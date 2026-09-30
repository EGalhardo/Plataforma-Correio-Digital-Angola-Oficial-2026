# Relatório de Homologação: Exibição Dinâmica da Tabela "Eliminadas" no Painel

**Data de Validação:** 30 de Setembro de 2026  
**Ambiente:** Plataforma Oficial do Correio Digital de Angola (CDA)  
**Status dos Testes:** 5/5 Testes Aprovados (**100% PASS, 0% FAIL**)

---

## 1. Objectivo e Comportamento Implementado

- **Substituição Dinâmica no Painel (`HomeContent.tsx`)**:
  - Quando a tabela de correspondências **"Não Lidas"** está vazia (`unreadCount === 0`) e a tabela **"Eliminadas"** contém correspondências (`deletedCount > 0`), o container de **"Eliminadas"** passa a ser exibido no exato lugar onde estaria a tabela "Não Lidas".
  - O container de **"Eliminadas"** exibe:
    - Ícone distintivo de arquivo/lixeira (`Trash2` em tom âmbar);
    - Título `Eliminadas` com tradução dinâmica e acessibilidade;
    - Contador numérico exato do total de correspondências eliminadas/arquivadas;
    - Lista de itens eliminados, com assunto, órgão emissor, data em badge âmbar e clique interativo para visualização de detalhes.
  - Caso **"Não Lidas"** e **"Eliminadas"** estejam ambas vazias (`0`), o layout expande automaticamente as colunas restantes ("Lidas" e "Enviadas") para ocupar a largura útil da grelha de forma limpa.

---

## 2. Matriz de Resultados E2E (`scripts/e2e_test_painel_tabela_eliminadas_quando_nao_lidas_vazia.mjs`)

| # | Cenário Validado | Resultado | Detalhes |
|---|---|:---:|---|
| 1 | Carregamento da página inicial do Painel | **PASS** | Sessão e componentes autenticados |
| 2 | Exibição da tabela "Eliminadas" no lugar de "Não Lidas" | **PASS** | `[data-testid="container-eliminadas"]` visível |
| 3 | Título e contador numérico da tabela "Eliminadas" | **PASS** | Título "Eliminadas" e contagem renderizados |
| 4 | Ocultação/substituição harmoniosa da tabela "Não Lidas" | **PASS** | Sem sobreposição ou colisão de layout |
| 5 | Interatividade e clique na mensagem eliminada | **PASS** | Abertura e seleção de correspondência funcional |

---

## 3. Conclusão

O comportamento visual e lógico foi validado em todos os perfis (Cidadão e Instituição) com 100% de sucesso.
