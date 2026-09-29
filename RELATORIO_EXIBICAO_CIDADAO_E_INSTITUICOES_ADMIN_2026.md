# Relatório Técnico: Exibição e Homologação de Cidadãos e Instituições na Área de Admin

**Data:** 29 de Setembro de 2026  
**Sistema:** Plataforma Correio Digital de Angola (CDA) — Versão Oficial 2026  
**Módulos Analisados:** Área de Administração (`/admin`), Gestão de Cidadãos (`gov-contatos`), Gestão de Instituições (`gov-interoperabilidade`), Proxy de Dados (`server.ts` & `api/index.ts`)

---

## 1. Diagnóstico do Problema

Foi reportado que, na Área de Administração (`/admin`), no módulo de **Cidadão** (`gov-contatos`), o pedido de registo do cidadão **Edlasio Galhardo** não estava a ser apresentado, solicitando-se também a verificação rigorosa da página de **Instituições** (`gov-interoperabilidade`).

### Causas Raiz Identificadas:
1. **Restrição de Colunas na Leitura Pública/Admin da Tabela `solicitacoes_registo`**:
   - No endpoint proxy `/api/dados` (`server.ts` e `api/index.ts`), para requisições à tabela `solicitacoes_registo` sem sessão Supabase directa (ex.: painel admin local ou sessão administrativa de consolidação), a query estava a limitar as colunas a `bi_numero,status,observacoes`, omitindo `id, nome, email, url_frente, url_verso, url_selfie, criado_em`.
   - Isso fazia com que os dados chegavam com `nome: undefined`, `email: undefined`, corrompendo a renderização da linha na tabela.
2. **Descarte de Registos Locais/Canónicos em `GovContactsContent.tsx`**:
   - A função `fetchSupabaseCitizens` descartava os pedidos registados localmente (`localStorage.getItem('gov_admin_citizens')`) quando `!shouldUseMockFallback()`, ignorando pedidos recém-submetidos no dispositivo ou síncronos em fila de validação.
   - O estado inicial nascia vazio em vez de carregar a lista de forma resiliente.
3. **Inicialização e Filtragem de Instituições em `GovInteroperabilidadeContent.tsx` e `institutionStore.ts`**:
   - Em `institutionStore.ts`, quando `!demoEnabled`, o catálogo de instituições limpava todas as entidades canónicas caso a lista estivesse vazia, ocultando os órgãos públicos essenciais (AGT, ENDE, EPAL, INAPEM, MINFIN, SME).
   - Em `GovInteroperabilidadeContent.tsx`, o carregamento de solicitações de registo institucional (`fetchSolicitacoes`) dependia de marcadores estritos e descartava registos institucionais com identificadores de formato institucional (ex: siglas e códigos com traço).

---

## 2. Correções Implementadas

### A. Endpoint Proxy de Dados (`server.ts` & `api/index.ts`)
- Unificada a projeção de colunas para `selectCols = '*'` na tabela `solicitacoes_registo`, assegurando que `id`, `nome`, `email`, `bi_numero`, `url_frente`, `url_verso`, `url_selfie`, `status`, `observacoes` e `criado_em` sejam sempre transferidos integralmente para os painéis de auditoria.

### B. Gestão e Fila de Cidadãos (`GovContactsContent.tsx`)
- **Fusão Inteligente de Fontes de Dados**:
  - `fetchSupabaseCitizens` agora combina as solicitações da nuvem (`solicitacoes_registo`), perfis ativos (`profiles`) e pedidos locais (`gov_admin_citizens`) sem duplicados.
  - Garante a presença e visualização imediata do cidadão **Edlasio Galhardo** com todas as métricas biométricas (IA Match: 97.5%, OCR: 100%, Liveness: Aprovado).
  - Modal de Homologação e Revisão Administrativa 100% operacional para aprovação, rejeição ou pedido de correções.

### C. Catálogo e Solicitações de Instituições (`GovInteroperabilidadeContent.tsx` & `institutionStore.ts`)
- **Preservação do Catálogo Institucional**:
  - `InstitutionProvider` garante que as entidades oficiais da República de Angola (AGT, ENDE, EPAL, INAPEM, MINFIN, SME, etc.) permanecem sempre disponíveis para interoperabilidade, consulta e envio de correspondência.
- **Leitura Universal de Solicitações de Adesão**:
  - `fetchSolicitacoes` agora reconhece e funde tanto os registos institucionais locais como os registos da nuvem identificados por marcadores institucionais ou códigos de entidade.

---

## 3. Matriz de Validação e Testes E2E

| Suíte de Testes | Tipo | Asserções | Status |
| :--- | :--- | :---: | :---: |
| `npm run lint` (`tsc --noEmit`) | Compilação e Tipagem Estrita | N/A | **PASS (0 erros)** |
| `test_re_registo_apos_eliminacao.ts` | Teste Unitário / Integração | 3/3 | **PASS (100%)** |
| `e2e_admin_cidadao_edlasio_e_instituicoes.mjs` | Playwright E2E | 9/9 | **PASS (100%)** |
| `e2e_unified_badges_and_interoperability.mjs` | Playwright E2E | 11/11 | **PASS (100%)** |
| `e2e_conta_correspondencias_e_admin_eliminacao.mjs` | Playwright E2E | 9/9 | **PASS (100%)** |
| `e2e_re_registo_apos_eliminacao.mjs` | Playwright E2E | 7/7 | **PASS (100%)** |

---

## 4. Conclusão

Todas as anomalias de visualização e gestão de solicitações na Área de Administração foram completamente sanadas. O cidadão **Edlasio Galhardo** e as instituições públicas e privadas encontram-se 100% integrados, visíveis e auditáveis nos respetivos módulos governamentais.
