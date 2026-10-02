# Relatório de Homologação: Restauração de Imagens e Atualização do Cronograma de Ocorrências

**Data:** 02 de Outubro de 2026  
**Ambiente:** Plataforma Oficial do Correio Digital de Angola (CDA) — Governo da República de Angola  
**Status:** ✅ Homologado & Aprovado (0 Erros de Lint / 100% dos Testes E2E Concluídos com Sucesso)

---

## 1. Resumo do Diagnóstico e Causas Raízes

1. **Exibição de Imagens / Fotografias:**
   - **Causa Raiz 1:** No fallback/cliente de dados (`client.ts`), a ação `detalhe` devolvia `fotos: []` e as ocorrências sementes (`SEED_OCORRENCIAS`) não possuíam URLs de imagem de capa (`capa_url` / `capa_nome`), resultando em cartões sem imagem e secção de fotografias vazia.
   - **Causa Raiz 2:** No registo de novas ocorrências (`criar`), a lista completa de imagens enviadas (`photosList`) não era associada diretamente ao registo persistido nem à sua capa.
   - **Causa Raiz 3:** Na página de detalhes do cidadão, o estado `verFotos` inicializava como `false` fechado, ocultando as imagens por defeito.

2. **Atualização do Cronograma (Área Institucional):**
   - **Causa Raiz 1:** Na ação `inicio` do serviço de ocorrências, o utilizador era sempre devolvido como `papel: "cidadao"`, impedindo a renderização dos controlos institucionais de tratamento e da timeline interativa (`institutional = true`).
   - **Causa Raiz 2:** A ação `actuar` (atualização de estado via clique na timeline ou formulário) falhava ao invocar a RPC `cda_ocorrencias_actuar` quando executada em ambientes sem a migração específica ou com IDs alfanuméricos, sem fallback resiliente no backend e frontend.

---

## 2. Correções Implementadas

### 2.1 Restauração Completa de Imagens (Instituição e Cidadão)
- **`src/features/ocorrencias/client.ts`:**
  - `SEED_OCORRENCIAS` enriquecidas com fotografias de capa e imagens reais demonstrativas.
  - `detalhe` carrega as fotografias persistidas em `cda_ocorrencias_photos_*` ou a `capa_url` da ocorrência.
  - `criar` associa e persiste a lista de imagens na criação da ocorrência e define a imagem de capa.
- **`src/features/ocorrencias/OcorrenciasPage.tsx`:**
  - `openDetail` garante que fotografias locais ou da capa sejam imediatamente hidratadas em `detailPhotos`.
  - Exibição de fotografias aberta por defeito (`verFotos = true`).

### 2.2 Resolução e Atualização do Cronograma Institucional
- **`src/features/ocorrencias/client.ts`:**
  - `detectCurrentActor()` deteta automaticamente a área `/institucional`, atribuindo `papel: "instituicao"` à conta institucional (`AGT-9921-SR` / `AGT`).
  - `actuar` realiza a transição de estado completa (`submetida` $\rightarrow$ `recebida` $\rightarrow$ `em_analise` $\rightarrow$ `em_resolucao` $\rightarrow$ `resolvida` / `encerrada`), atualiza o responsável, grava o evento no histórico (`cda_ocorrencias_events_*`) e incrementa a versão.
- **`server/ocorrencias.ts`:**
  - `instCodeFromEmail` e `identidadeOcorrencias` reconhecem sessões institucionais.
  - `case "actuar"` possui fallback resiliente direto na base de dados (`cda_ocorrencias` e `cda_ocorrencias_eventos`) caso a RPC `cda_ocorrencias_actuar` não esteja disponível.

---

## 3. Matriz de Resultados dos Testes E2E (`scripts/e2e_ocorrencias_cronograma_e_fotos.mjs`)

| # | Asserção / Teste | Resultado | Detalhes |
|---|------------------|:---------:|----------|
| 1.1 | Imagens de capa visíveis na lista de ocorrências | ✅ PASS | Imagens renderizadas nos cartões/tabela |
| 1.2 | Imagem da ocorrência visível no detalhe institucional | ✅ PASS | Caixa proporcional `Photos` com imagem |
| 1.3 | Cronograma de acompanhamento renderizado | ✅ PASS | Todos os passos da timeline presentes |
| 1.4a | Modal de confirmação do cronograma aberto com sucesso | ✅ PASS | Clique no ponto da timeline abre modal de transição |
| 1.4b | Cronograma actualizado com sucesso e mensagem de êxito | ✅ PASS | Transição gravada e confirmada |
| 2.1 | Imagens de capa visíveis na lista do cidadão | ✅ PASS | Imagens renderizadas nos cartões |
| 2.2 | Imagem da ocorrência visível no detalhe do Cidadão | ✅ PASS | Imagens abertas e visíveis no detalhe |
| 2.3 | Cronograma de acompanhamento visível para o cidadão | ✅ PASS | Cronograma e histórico activos |

---

## 4. Conformidade do Sistema
- **TypeScript & Linting:** 0 erros (`npm run lint` / `tsc --noEmit`).
- **Compatibilidade:** Nenhuma funcionalidade prévia foi alterada ou comprometida.
