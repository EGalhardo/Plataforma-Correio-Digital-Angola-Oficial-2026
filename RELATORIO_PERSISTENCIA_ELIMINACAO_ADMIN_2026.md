# Relatório de Diagnóstico e Validação: Eliminação Definitiva e Persistência de Cadastros no Admin (2026)

## 1. Contexto e Diagnóstico do Problema

Durante a gestão de utilizadores na Área de Administração (`GovContactsContent.tsx`), identificou-se um comportamento anómalo no fluxo de eliminação de cidadãos:
1. **Reaparecimento por Polling Automático**: A função `fetchSupabaseCitizens`, executada periodicamente (ciclo de 15 segundos) e no evento de foco na janela (`window.focus`), realizava uma injeção sintética incondicional e mesclava pedidos locais sem consultar as flags de revogação/eliminação persistidas no cliente (`cda_deleted_${normKey}` e `cda_revoked_${normKey}`).
2. **Inconsistência de Estado no Componente**: Em `confirmDeleteCitizen`, a chave `cda_revoked_` e `cda_deleted_` era removida indevidamente de algumas estruturas ou o `setCitizens` era atrasado por chamadas de rede assíncronas.
3. **Resíduos em Coleções Locais**: Registos provenientes de `citizenRows`, `profileCitizens`, `localMap` e do estado anterior (`prev`) persistiam em cache e voltavam a ser adicionados à lista principal de cidadãos.

---

## 2. Correções Implementadas

### A. Persistência de Flags Anti-Reaparecimento em `GovContactsContent.tsx`
- Ao confirmar a eliminação de um cadastro (`confirmDeleteCitizen`):
  - É imediatamente persistida a flag `cda_deleted_${normKey} = '1'` e `cda_revoked_${normKey} = '1'`.
  - O estado da interface (`setCitizens`) é atualizado instantaneamente, filtrando o ID e o BI normalizado do alvo sem causar bloqueios ou espera na renderização.
  - A purga em cascata limpa `homologationStore`, `citizen_pass_${biKey}`, mensagens oficiais em cache (`correio_digital_inbox`), biometria local, avatares e dispara a eliminação na base de dados central / endpoints administrativos (`eliminarCidadaoAdmin`).

### B. Filtragem Universal em Ciclos de Leitura e Sincronização (`fetchSupabaseCitizens`)
- A função `fetchSupabaseCitizens` foi refatorada para:
  1. **Remover injeções sintéticas incondicionais**.
  2. **Verificar flags de eliminação em todas as fontes**:
     - `solicitacoes_registo` (Nuvem).
     - `profiles` (Perfis do Supabase).
     - `localMap` (Solicitações criadas localmente).
     - `prev` (Estado anterior do React).
  3. **Aplicar filtro final estrito**: Nenhum registo cujo BI conste em `cda_deleted_` ou `cda_revoked_` é inserido na tabela, mesmo durante recargas automáticas de página ou alternância de abas.

---

## 3. Matriz de Testes e Validação E2E

| Teste | Descrição | Resultado |
|---|---|---|
| `e2e_test_eliminacao_persistencia.mjs` | Inserção de registo, eliminação confirmada no Admin, espera por ciclos de sincronização (15s) e verificação de não-reaparecimento | **100% APROVADO** (3/3) |
| `e2e_re_registo_apos_eliminacao.mjs` | Ciclo completo: 1.º registo, eliminação administrativa, re-registo com as mesmas credenciais sem erro de duplicado | **100% APROVADO** (7/7) |
| `e2e_admin_cidadao_edlasio_e_instituicoes.mjs` | Exibição de Edlasio Galhardo, modal de revisão documental/biométrica e gestão de solicitações institucionais | **100% APROVADO** (9/9) |
| `e2e_conta_correspondencias_e_admin_eliminacao.mjs` | Correspondências oficiais ativas (registo + ativação), integridade da caixa de correio e eliminação no painel admin | **100% APROVADO** (9/9) |
| `npm run lint` (`tsc --noEmit`) | Validação estática de tipagem e integridade do código TypeScript | **0 ERROS** |

---

## 4. Conclusão

O fluxo de eliminação de cidadãos e instituições na consola de Administração Governamental está consolidado, resiliente e sincronizado entre nuvem e cliente. Registos eliminados permanecem definitivamente expurgados até que o utilizador realize voluntariamente um novo processo de registo no portal.
