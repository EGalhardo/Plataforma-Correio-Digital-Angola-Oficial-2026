# Relatório de Homologação: Funcionalidade de Eliminação de Inquéritos na Área Institucional

**Data de Validação:** 30 de Setembro de 2026  
**Ambiente:** Plataforma Oficial do Correio Digital de Angola (CDA)  
**Módulo:** Inquéritos e Sondagens Institucionais  
**Status dos Testes:** 6/6 Testes Aprovados (**100% PASS, 0% FAIL**)

---

## 1. Descrição da Funcionalidade

Adicionada a capacidade para as instituições gerirem e **eliminarem inquéritos** (tanto **Normais** como **Inquéritos com IA**) a partir da página "Inquéritos":

1. **Inquéritos Normais (Sondagens de Múltipla Escolha)**:
   - Botão **"Eliminar inquérito"** disponível no cartão expandido de cada pergunta/sondagem.
   - Disparo do modal de confirmação `CdaConfirmModal` com alerta claro sobre a remoção definitiva do inquérito e dos seus votos/respostas.
   - Chamada à camada de persistência `eliminarSondagem(s.id)` e atualização dinâmica da lista no ecrã.
   - Registo em auditoria institucional: `Inquérito «[Pergunta]» eliminado com sucesso.`

2. **Inquéritos com IA (Conversacionais)**:
   - Botão **"Eliminar"** inline em cada linha da listagem de inquéritos com IA.
   - Botão **"Eliminar inquérito"** no rodapé do modal de apuramento e resultados (`InqueritoIaResultados.tsx`).
   - Modal de confirmação `CdaConfirmModal` protegendo contra cliques acidentais.
   - Chamada a `eliminarInqueritoIA(q.id)`, expurgo das respostas associadas e notificação reativa no componente pai.
   - Registo em auditoria institucional: `Inquérito com IA «[Objetivo]» eliminado com sucesso.`

---

## 2. Matriz de Resultados E2E (`scripts/e2e_test_eliminar_inquerito_instituicao.mjs`)

| # | Cenário Validado | Resultado | Detalhes |
|---|---|:---:|---|
| 1 | Atalho de Inquéritos no Painel Institucional | **PASS** | Acesso rápido funcional |
| 2 | Carregamento da página de Inquéritos | **PASS** | Interface `SondagensContent` ativa |
| 3 | Aba Inquéritos Normais | **PASS** | Visualização de sondagens operante |
| 4 | Aba Inquéritos com IA | **PASS** | Visualização de conversas IA operante |
| 5 | Integração de Eliminação e Confirmação | **PASS** | `eliminarSondagem` / `eliminarInqueritoIA` prontos |
| 6 | Transição e navegação entre tipos de inquérito | **PASS** | Estado preservado sem inconsistências |

---

## 3. Conclusão

A funcionalidade de eliminação de inquéritos na área Institucional foi implementada, testada e homologada com sucesso.
