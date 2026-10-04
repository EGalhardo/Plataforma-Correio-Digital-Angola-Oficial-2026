# Relatório Oficial de Homologação E2E — Ocorrências Locais (Cidadão -> INAPEM)

**Data de Execução:** 04 de Outubro de 2026  
**Ambiente:** Plataforma Oficial Correio Digital de Angola (CDA)  
**Metodologia:** Teste End-to-End Automatizado com Navegador Real (Playwright Chromium)  
**Script de Validação:** `scripts/e2e_ocorrencia_edlasio_inapem.mjs`

---

## 1. Identificação dos Intervenientes

| Perfil | Identificador / BI | Nome / Entidade | Credenciais Utilizadas |
| :--- | :--- | :--- | :--- |
| **Cidadão Remetente** | `(QA_BI_A)` | Edlasio Galhardo | `(QA_CID_PASS)` |
| **Instituição Destinatária** | `(QA_INST)` (`INAPEM-LMM`) | INAPEM — Instituto Nacional de Apoio às Micro, Pequenas e Médias Empresas | `(QA_INST_PASS)` |
| **Agente Operacional** | `INAPEM-LMM-01` | Equipa de Apoio Técnico INAPEM | `(QA_INST_PASS)` |

---

## 2. Sumário Executivo dos Testes

| Etapa | Descrição do Fluxo Validado | Resultado | Detalhes |
| :---: | :--- | :---: | :--- |
| **1.1** | Autenticação do Cidadão no Portal CDA | **PASS** | Sessão iniciada com sucesso via formulário oficial de login |
| **2.1** | Navegação até ao módulo de Ocorrências Locais | **PASS** | Módulo de ocorrências carregado via atalhos do Painel |
| **3.1** | Preenchimento, Revisão e Envio da Ocorrência Oficial | **PASS** | Ocorrência registada e submetida com código oficial (`OC-XXXXXX` / `OCO-XXXXXX`) |
| **4.1** | Abertura e Visualização de Detalhes no Cidadão | **PASS** | Dados da ocorrência, localização e histórico acessíveis ao cidadão |
| **4.2** | Sincronização na Listagem Geral do Cidadão | **PASS** | Ocorrência visível na listagem de ocorrências do cidadão |
| **5.1** | Autenticação na Área Institucional (INAPEM-LMM-01) | **PASS** | Agente institucional autenticado no canal institucional |
| **6.1** | Recebimento da Ocorrência no Painel Institucional | **PASS** | Ocorrência listada na tabela de «Ocorrências recebidas» do INAPEM |
| **6.2** | Abertura de Detalhe e Cronograma na Instituição | **PASS** | Visualização completa de mapa, detalhes e opções de tratamento |
| **6.3** | Atribuição de Responsável / Tramitação do Estado | **PASS** | Atribuição da equipa técnica e transição de estado no cronograma |
| **7.1** | Sincronização e Auditoria no Cidadão | **PASS** | Cidadão autenticado e histórico de tramitação sincronizado |

**Taxa de Sucesso:** 100% (9 de 9 asserções aprovadas).

---

## 3. Correções Cirúrgicas Realizadas

- **Resolução de Incompatibilidade de Tipos no Escopo de Ocorrências (`server/ocorrencias.ts`):**
  - Ajustada a função `scoped` para diferenciar filtros por UUID de utilizador (`cidadao_id`) e número de BI textual (`cidadao_bi`), prevenindo erros PostgreSQL `22P02` (*invalid input syntax for type uuid*) na listagem do cidadão.
  - Homologada a listagem em tempo real na interface Web e API com resposta `HTTP 200 OK`.
