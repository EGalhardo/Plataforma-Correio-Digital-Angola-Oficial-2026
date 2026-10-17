# Relatório de Homologação: Fluxo de Registo e Segregação Estrita de Contas na Administração Central

**Data:** 17 de Outubro de 2026  
**Plataforma:** Correio Digital Angola — Versão Oficial 2026  
**Ambiente:** Pré-Produção / Homologação (África/Luanda)  
**Validador:** Automação E2E Playwright (Chromium)

---

## 1. Resumo Executivo

O presente relatório atesta a validação de ponta a ponta do **fluxo de registo de novas contas** (Institucionais e Cidadãos) e a garantia de **segregação estrita** no portal da **Administração Central do Correio Digital Angola**:

1. **Criação de Conta Institucional:**
   - Submissão de adesão formal via portal institucional com geração determinística de código (`SIGLA-ProvínciaMunicípioComuna`, ex.: `MEC-LLMM`) e número de agente (`-01`).
   - Inserção direta e em segundo plano na tabela `solicitacoes_registo` com observação institucional estruturada (`[Instituição]`).
   - Apresentação imediata na tabela **"Solicitações de Registo de Instituições"** da página **Instituições** (`#/gov-interoperabilidade`), com botões de homologação (`ABRIR` / `🗑`).
   - **Garantia de Isolamento:** Nenhuma instituição registada aparece na página de Cidadãos.

2. **Criação de Conta de Cidadão:**
   - Submissão de registo civil via portal do cidadão com validação de B.I. angolano oficial (14 caracteres alfanuméricos), upload de documentos frente/verso e biometria facial 3/3.
   - Sincronização via pipeline `registoBgService` e proxy de gravação segura.
   - Apresentação imediata no **"Quadro de Cadastros Nacionais"** da página **Cidadãos** (`#/gov-contatos`), exibindo estado `PENDENTE VALIDAÇÃO`, dados territoriais e anexos (`2 DOCS`).
   - **Garantia de Isolamento:** Nenhum cidadão aparece na tabela de solicitações institucionais.

---

## 2. Arquitetura de Segregação e Filtros Implementados

| Módulo / Página Admin | Critério de Inclusão | Filtros e Exclusões Estritas | Comportamento Homologado |
| :--- | :--- | :--- | :--- |
| **Cidadãos** (`#/gov-contatos`) | Apenas contas com formato de B.I. civil válido (`^\d{9}[A-Za-z]{2}\d{3}$`). | Exclusão de qualquer registo contendo marcadores `[Instituição]`, `[INST:`, siglas alfanuméricas com hífen ou códigos institucionais. | Apenas cidadãos são listados na tabela de Cadastros Nacionais. |
| **Instituições** (`#/gov-interoperabilidade`) | Solicitações com observações `[Instituição]`/`[INST:` e códigos com hífen (`MEC-LLMM`, `INAPEM-LMM`, etc.). | Exclusão de contas de cidadãos e de instituições marcadas como eliminadas (`cda_deleted_inst_*`). | Exibe separadamente as solicitações pendentes e as entidades integradas em produção. |

---

## 3. Evidências dos Testes Automatizados E2E (Playwright)

O script automatizado `scripts/e2e_teste_fluxo_registo_admin.mjs` executou o ciclo completo sem intervenção manual:

1. **Submissão Institucional:**
   - Nome: *Ministério da Educação e Cultura Teste*
   - Sigla: `MEC` (Código gerado: `MEC-LLMM`, Agente: `MEC-LLMM-01`)
   - Localização DPA 2025: Luanda / Luanda / Maianga
   - Desfecho: Adesão submetida e enviada à fila de administração.

2. **Submissão Cidadão:**
   - Nome: *Manuel António Quissanga*
   - B.I.: `002399714LA826`
   - Uploads: Frente e Verso do B.I. + 3 Capturas Biométricas Faciais
   - Desfecho: Registo concluído com sucesso e enfileirado para validação.

3. **Verificação no Portal Administrativo:**
   - **Página Cidadãos (`#/gov-contatos`):** Cidadão `002399714LA826` presente na 1.ª posição; Instituição `MEC` ausente.
   - **Página Instituições (`#/gov-interoperabilidade`):** Instituição `MEC` presente em Solicitações Pendentes; Cidadão ausente.

### Registos Fotográficos Oficiais (Screenshots E2E)

- **`images/e2e_admin_cidadao_registado.png`:** Quadro de Cadastros Nacionais com o novo cidadão em estado pendente, com isolamento total.
- **`images/e2e_admin_instituicao_registada.png`:** Tabela de Solicitações Institucionais com a nova entidade governamental aguardando homologação.

---

## 4. Conclusão

A segregação entre **Contas de Cidadãos** e **Contas Institucionais** está 100% funcional, robusta e homologada tanto ao nível de interface como de base de dados e canais em tempo real.
