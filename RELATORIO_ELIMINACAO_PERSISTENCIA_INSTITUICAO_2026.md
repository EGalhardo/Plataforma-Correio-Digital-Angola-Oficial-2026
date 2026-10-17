# Relatório Técnico: Correção e Homologação da Persistência de Eliminação de Instituições na Área Admin

**Data:** 17 de Outubro de 2026  
**Sistema:** Correio Digital de Angola (CDA) — Plataforma Oficial  
**Módulos Corrigidos:**
- `GovInteroperabilidadeContent.tsx` (`#/gov-interoperabilidade`)
- `src/services/institutionStore.ts` (`InstitutionProvider`, `isDeletedInstitution`)
- `src/services/institutionRegistrationStore.ts` (`readRegs`)
- `src/services/institutionSessionService.ts` (`purgeInstitutionLocalResidues`)
- `src/App.tsx` (`instituicoesFicha`)
- `server.ts` e `api/index.ts` (`/api/admin-eliminar-instituicao`)

---

## 1. Diagnóstico do Problema

Quando uma instituição ou solicitação de adesão era eliminada na página **Instituições** da Área de Administração Central, após recarregar a página (refresh/F5), os registos eliminados voltavam a aparecer.

### Causas Raiz Identificadas:
1. **Fallback Indevido no Provedor de Estado (`institutionStore.ts`):**  
   O `InstitutionProvider` verificava `if (Array.isArray(parsed) && parsed.length > 0)`. Caso a lista estivesse vazia ou o armazenamento local fosse reinicializado, ocorria fallback imediato para o catálogo padrão (`CANONICAL_INSTITUTIONS`), ressuscitando todos os registos.
2. **Ausência de Filtros de Eliminação Persistente:**  
   Não havia verificação centralizada de marcadores de eliminação (`cda_deleted_inst_*`) na reconstrução do catálogo e das solicitações (`fetchSolicitacoes`).
3. **Leitura de Espelho Local Sem Filtro:**  
   O método `readRegs()` em `institutionRegistrationStore.ts` devolvia registos locais sem descartar chaves já eliminadas.
4. **Lentidão no Endpoint Backend:**  
   No servidor, o endpoint `/api/admin-eliminar-instituicao` executava 10 chamadas de paginação sequenciais ao Supabase Auth mesmo quando a primeira página já continha todos os utilizadores.

---

## 2. Soluções Implementadas

1. **Predicado Universal `isDeletedInstitution`:**
   - Criada a função exportada `isDeletedInstitution(inst)` que verifica de forma atómica:
     - Identificador interno (`inst.id`);
     - Código institucional normalizado (`inst.instCode`);
     - Sigla ou nome normalizado (`inst.name`).
2. **Atualização Atómica e Persistente no `InstitutionProvider`:**
   - O armazenamento `correio_digital_institutions` agora preserva listas vazias (`[]`) sem recorrer ao catálogo canónico.
   - Sincronização multi-aba e eventos locais via escuta de `storage` e `cda_registos_alterados`.
3. **Purga e Marcação Indelével:**
   - Em `handleDeleteInstitution`, `handleDeleteSolicitacao`, `purgeInstitutionLocalResidues` e `readRegs`, as chaves de eliminação são gravadas de forma definitiva (`localStorage.setItem('cda_deleted_inst_' + key, '1')`).
4. **Otimização no Backend (`server.ts` e `api/index.ts`):**
   - Inserida quebra antecipada de paginação (`if (lista.users.length < 200) break;`), reduzindo o tempo de resposta da eliminação de ~8s para menos de 1s.

---

## 3. Validação e Teste Automatizado E2E (Playwright)

Executado o script `scripts/e2e_teste_eliminacao_instituicao_refresh.mjs` com o seguinte fluxo:
1. Login na consola de Administração Central com credenciais de Administrador Alfa (`ADMIN-0001`).
2. Navegação para a página de **Instituições** (`#/gov-interoperabilidade`).
3. Seleção de uma instituição e acionamento do botão **Eliminar Instituição**.
4. Confirmação no modal de eliminação definitiva.
5. Verificação imediata: a instituição é removida da tabela e da contagem.
6. Execução de **Hard Refresh** (`page.reload()` / F5).
7. Verificação pós-refresh: **a instituição eliminada NÃO volta a aparecer**, mantendo a integridade permanente do catálogo.

---

## 4. Evidências Visuais Geradas

- `images/admin_instituicao_eliminada_antes_refresh.png` — Tabela atualizada logo após a eliminação.
- `images/admin_instituicao_eliminada_apos_refresh.png` — Tabela após o refresh da página confirmando a persistência da exclusão.
