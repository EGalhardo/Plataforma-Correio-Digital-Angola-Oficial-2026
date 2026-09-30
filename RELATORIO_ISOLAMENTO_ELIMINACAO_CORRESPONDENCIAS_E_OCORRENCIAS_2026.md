# Relatório de Homologação: Isolamento de Eliminação por Conta (Correspondências e Ocorrências)

**Data de Validação:** 30 de Setembro de 2026  
**Ambiente:** Plataforma Oficial do Correio Digital de Angola (CDA)  
**Status dos Testes Automatizados:** 8/8 Testes Aprovados (**100% PASS, 0% FAIL**)

---

## 1. Resumo Executivo e Objectivo

Implementação e validação do princípio de **Isolamento Estrito por Conta e Interlocutor** nas operações de eliminação e arquivamento de correspondências e de ocorrências:
- **Correspondências Oficiais**: Quando uma das partes (Cidadão ou Instituição) move uma correspondência para o arquivo/eliminadas ou a elimina permanentemente da sua conta, a outra parte mantém a sua cópia integralmente acessível e inalterada. A purga definitiva da mensagem na base de dados central ocorre apenas quando **ambas as partes** tiverem eliminado a correspondência das respetivas contas.
- **Ocorrências Municipais e Institucionais**: Quando um cidadão elimina uma ocorrência da sua lista, a ocorrência deixa de ser exibida no seu perfil, mas permanece intacta e plenamente auditável na conta da instituição destinatária (e vice-versa). A purga do registo e dos anexos associados ocorre exclusivamente sob eliminação bilateral.

---

## 2. Arquitectura Implementada

### 2.1. Correspondências (`src/App.tsx`)
1. **Escopo de Armazenamento por Conta Ativa (`activeUserStorageKey`)**:
   - `cda_deleted_messages_${activeUserStorageKey}`
   - `cda_hidden_messages_${activeUserStorageKey}`
   - Cada perfil autenticado (cidadão ou instituição) mantém a sua própria lista de mensagens arquivadas/eliminadas, evitando contaminação cruzada no mesmo dispositivo ou navegador.
2. **Marcadores de Ação Criptográficos e Auditáveis**:
   - Arquivo: `ARQ:${titular}` gravado na lista de ações da mensagem sem sobrescrever o `state_indicator` global.
   - Eliminação Permanente: `ELIM_PERM:${titular}` gravado na lista de ações.
   - Purga Central: Acionada via `purgarMensagemSeAmbasPartesEliminaram` apenas se ambos os interlocutores tiverem registado o marcador `ELIM_PERM:`.

### 2.2. Ocorrências (`server/ocorrencias.ts`)
1. **Eventos de Soft-Delete por Papel**:
   - Cidadão: Ação `eliminar` grava evento `eliminar_cidadao`.
   - Instituição: Ação `eliminar` grava evento `eliminar_instituicao`.
2. **Filtro Scoped nas Consultas de Listagem (`case "listar"`)**:
   - A listagem de ocorrências exclui apenas os IDs cujo evento de eliminação foi emitido pelo próprio utilizador/instituição autenticado.
3. **Purga Definitiva Bilateral**:
   - Verificação mútua: `temCid && temInst` desencadeia a remoção física de notificações, leituras, eventos, fotografias do storage e do registo mestre da ocorrência.

---

## 3. Matriz de Resultados E2E (`scripts/e2e_test_isolamento_eliminacao_correspondencias_e_ocorrencias.mjs`)

| # | Cenário de Teste | Resultado | Detalhes |
|---|---|:---:|---|
| 1 | Inicialização e isolamento da chave do Cidadão | **PASS** | `activeUserStorageKey` gerada com sucesso |
| 2 | Registo de eliminação restrito ao escopo do Cidadão | **PASS** | Mensagem arquivada gravada isoladamente no perfil do cidadão |
| 3 | Inicialização da chave da Instituição (`INAPEM-LMM-01`) | **PASS** | Chave institucional isolada |
| 4 | Verificação de não-contaminação de dados institucionais | **PASS** | Instituição preserva correspondências sem herdar exclusões do remetente |
| 5 | Acesso e integridade da Caixa de Correio Institucional | **PASS** | Navegação e busca ativas na caixa da instituição |
| 6 | Disponibilidade dos filtros de pesquisa institucional | **PASS** | Barra de pesquisa e listagem funcionais |
| 7 | Soft-delete escopado no backend de Ocorrências | **PASS** | Handlers de isolamento `eliminar_cidadao` / `eliminar_instituicao` validados |
| 8 | Purga bilateral definitiva de ocorrências | **PASS** | Regra de eliminação mútua respeitada |

---

## 4. Conclusão

O isolamento por conta para correspondências e ocorrências encontra-se totalmente funcional, homologado e aderente aos requisitos de segurança e conformidade do Correio Digital de Angola.
