# Relatório Técnico de Homologação: Segregação Estrita de Contas na Administração Central

**Data:** 17 de Outubro de 2026  
**Sistema:** Correio Digital de Angola (CDA) — Plataforma Oficial  
**Módulos Auditados:**
- Registo Institucional (`RegisterInstitutionPage.tsx`, `RegisterStepper.tsx`)
- Administração Central — Cidadãos (`GovContactsContent.tsx` / `#/gov-contatos`)
- Administração Central — Instituições (`GovInteroperabilidadeContent.tsx` / `#/gov-interoperabilidade`)

---

## 1. Resumo Executivo

Foi implementada e homologada a **segregação estrita** entre contas de cidadãos e contas institucionais na consola de Administração Central. Quando uma conta institucional é criada ou submetida para adesão, a respetiva entidade passa a figurar exclusivamente na página de **Instituições** (`GovInteroperabilidadeContent`), sendo rigorosamente excluída da página de **Cidadãos** (`GovContactsContent`).

---

## 2. Implementação Técnica

### 2.1. Filtros de Validação e Isolamento (`GovContactsContent.tsx`)
1. **Verificação de Padrão do B.I. Angolano:**
   - Apenas números de Bilhete de Identidade com o formato estrito de 14 caracteres (`9 dígitos + 2 letras maiúsculas + 3 dígitos`, regex: `/^\d{9}[A-Za-z]{2}\d{3}$/`) e sem hífens são aceites na listagem de Cidadãos.
2. **Filtragem de Marcadores Institucionais:**
   - Invocação da função utilitária `isInstitutionObservacao(item.observacoes)`.
   - Exclusão explícita de itens contendo marcadores como `[Instituição]` e `[INST:`.
   - Isolamento das entidades de demonstração e identificadores de órgãos institucionais.
3. **Sincronização de Eventos em Tempo Real:**
   - Escuta ativa do evento global `EVENTO_REGISTOS_ALTERADOS` (`cda_registos_alterados`), garantindo que alterações no registo recarregam os dados imediatamente com os filtros aplicados.

### 2.2. Consolidação de Registo Institucional (`GovInteroperabilidadeContent.tsx`)
1. **Mapeamento de Solicitações da Nuvem e Locais:**
   - Leitura de `solicitacoes_registo` no Supabase e de `gov_admin_institutions` no armazenamento local.
   - Exibição de solicitações pendentes e entidades operacionais (`INAPEM`, `AGT`, `SME`, `ENDE`).
2. **Escuta de Eventos:**
   - O painel de interoperabilidade atualiza a listagem de instituições instantaneamente após nova adesão.

### 2.3. Emissão de Eventos no Registo (`RegisterInstitutionPage.tsx` e `RegisterStepper.tsx`)
- Ao concluir uma solicitação institucional, o sistema invoca `anunciarRegistosAlterados()`, notificando toda a consola administrativa de forma transparente.

---

## 3. Validação e Teste Automatizado E2E (Playwright)

Foi executado o script de validação de ponta a ponta `scripts/e2e_teste_segregacao_instituicao_admin.mjs`:

1. **Submissão de Registo Institucional:**
   - Abertura de `#/registo-instituicao` e submissão de nova entidade ministerial de teste.
2. **Autenticação como Administrador Central:**
   - Login com credenciais de Administrador Alfa (`ADMIN-0001`).
3. **Verificação da Página "Cidadãos":**
   - Confirmação de que nenhuma entidade institucional consta na tabela de cadastros nacionais de cidadãos.
4. **Verificação da Página "Instituições":**
   - Confirmação de que as instituições homologadas (`INAPEM`, `AGT`, etc.) e novas solicitações constam devidamente na secção institucional.

---

## 4. Evidências Visuais

- **Página de Cidadãos (Isolada de Instituições):** `images/admin_segregacao_pagina_cidadaos.png`
- **Página de Gestão Institucional (Instituições Mapeadas):** `images/admin_segregacao_pagina_instituicoes.png`

---

## 5. Conclusão

A segregação entre **Cidadãos** e **Instituições** encontra-se 100% funcional, em total conformidade com a arquitetura de segurança, governança de dados e regras de negócio da plataforma Correio Digital de Angola.
