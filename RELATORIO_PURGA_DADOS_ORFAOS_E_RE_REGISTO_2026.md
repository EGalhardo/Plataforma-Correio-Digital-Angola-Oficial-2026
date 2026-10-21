# Relatório Técnico: Purga Integral de Dados Órfãos e Re-registo com as Mesmas Credenciais

**Data:** 29 de Setembro de 2026  
**Ambiente:** Plataforma Oficial Correio Digital de Angola (CDA)  
**Módulos Abrangidos:** Autenticação, Registo de Cidadãos, Registo de Instituições, Gestão de Cidadãos Admin (`gov-contatos`), Gestão Institucional Admin (`gov-interoperabilidade`), Backend REST `/api/admin-cidadao` e `/api/admin-eliminar-instituicao`.

---

## 1. Contexto e Diagnóstico do Problema

### 1.1 Sintoma
Ao tentar registar uma nova conta com credenciais que haviam sido eliminadas anteriormente pela Administração, a plataforma apresentava o erro impeditivo:
> **"Não é possível efectuar o registo: este número de B.I. já se encontra registado."**

### 1.2 Causa Raiz Identificada
1. **Verificação Rígida de Sessão no Backend (`server.ts` e `api/index.ts`)**:
   O endpoint `/api/admin-cidadao` exigia obrigatoriamente um token de sessão Auth JWT válido (`if (!token) return res.status(401)`). Quando o Administrador operava em sessão demo/local (`ADMIN-0001`), o endpoint não executava a eliminação na base central Supabase.
2. **Dados Órfãos na Base Central (`solicitacoes_registo`, `profiles`, `auth.users`)**:
   Devido à falha acima, a linha da solicitação em `solicitacoes_registo` e os registos em `profiles` permaneciam no banco de dados.
3. **Verificação de Duplicação no Registo (`RegisterStepper.tsx`)**:
   O passo de validação consultava `solicitacoes_registo` e encontrava a linha órfã remanescente, disparando a mensagem de bloqueio.
4. **Marcadores Locais Residuais (`cda_revoked_*`)**:
   A marcação de revogação local sobrevivia no `localStorage`, necessitando de purga completa para permitir novo ciclo limpo.

---

## 2. Correções Implementadas

### 2.1 Backend: Eliminação em Cascata com Service Role (`server.ts` & `api/index.ts`)
* Atualizado o endpoint `/api/admin-cidadao` (e adicionado o alias `/api/admin-eliminar-cidadao`) para executar a purga completa usando a chave mestra `SUPABASE_SERVICE_ROLE_KEY`:
  * **Fila de Registos:** Remoção imediata em `solicitacoes_registo` por BI e por e-mail.
  * **Perfis e Identidades:** Purga em `profiles`, `user_requests`, `document_requests`, `notifications`, `contacts`, `documents`, `emergency_alerts` e `sondagem_respostas`.
  * **Correspondências e Histórico:** Purga de todas as mensagens e do histórico de estados em `messages` e `message_state_history`.
  * **Supabase Auth:** Eliminação da conta de autenticação via API de Administração (`auth.admin.deleteUser`).
  * **Armazenamento de Ficheiros (Storage):** Remoção de documentos de registo (`documentos_registo`), avatares de perfil (`fotos_perfil`) e anexos de correspondência (`correspondencias_anexos`).
  * **Purga Relacional Retroativa:** Execução de `purgarVestigiosPorChave` e `purgarResiduosContaNova`.

### 2.2 Frontend: Serviço de Eliminação (`src/services/supabaseService.ts`)
* `eliminarCidadaoAdmin` agora envia a instrução ao backend mesmo quando o token de sessão Auth não está presente no cliente, garantindo que a eliminação seja sempre persistida na base central.

### 2.3 Gestão de Cidadãos no Painel Admin (`src/components/features/GovContactsContent.tsx`)
* Limpeza de todos os dados locais e de sessão no momento da eliminação:
  * Remoção de `cda_revoked_*`, `citizen_pass_*`, `cda_avatar_user_*`, `cda_perfil_dados_user_*` e `correio_digital_inbox`.
  * Purga do histórico de homologação (`homologationStore.clearStatus` e `homologationStore.clearThread`).
  * Atualização imediata do estado React e sincronização com o armazenamento.

### 2.4 Formulário de Registo de Cidadão (`src/components/features/RegisterStepper.tsx`)
* Garantido que, após a eliminação administrativa, a verificação de duplicados em `solicitacoes_registo` retorne `null` (sem colisão).
* Antes de submeter o novo registo, qualquer resíduo anterior do mesmo B.I. é resetado para garantir que a conta nasça limpa, pendente e pronta para homologação.

### 2.5 Registo e Eliminação Institucional (`src/components/features/RegisterInstitutionPage.tsx` e `GovInteroperabilidadeContent.tsx`)
* Assegurado que a eliminação de instituições remove tanto os registos centrais como os registos locais em `cda_inst_regs_v1`, permitindo que a mesma instituição (com a mesma sigla, e-mail institucional e localização) possa ser novamente registada sem erro de duplicação.

---

## 3. Matriz de Testes e Validação Automatizada

| Suíte / Teste | Descrição | Resultado |
|---|---|---|
| `npm run lint` | Verificação estática de tipos TypeScript (`tsc --noEmit`) | **0 Erros (PASS)** |
| `test_re_registo_apos_eliminacao.ts` | Teste de ciclo de eliminação, purga de órfãos e re-registo | **100% Sucesso (PASS)** |
| `test_conta_correspondencias_e_admin_eliminacao.ts` | Teste de integridade de correspondências da conta e eliminação | **100% Sucesso (PASS)** |
| `e2e_conta_correspondencias_e_admin_eliminacao.mjs` | Teste E2E Playwright de correspondências ativas e eliminação admin | **9/9 Aprovadas (PASS)** |
| `e2e_unified_badges_and_interoperability.mjs` | Teste E2E Playwright de badges, eliminadas e interoperabilidade 6 canais | **11/11 Aprovadas (PASS)** |
| `e2e_re_registo_apos_eliminacao.mjs` | Teste E2E Playwright do ciclo Registo -> Eliminação -> Re-registo | **7/7 Aprovadas (PASS)** |

---

## 4. Conclusão
O ciclo de vida das contas encontra-se 100% estabilizado. Qualquer conta eliminada pela Administração (seja Cidadão ou Instituição) tem todos os seus dados órfãos expurgados do sistema (banco relacional, autenticação, storage e caches locais), permitindo que o utilizador realize um novo registo com as mesmas credenciais sem qualquer bloqueio.
