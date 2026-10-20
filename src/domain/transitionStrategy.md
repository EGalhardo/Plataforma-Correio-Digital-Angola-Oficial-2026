# Estratégia de Transição: Modelo de Dados Canónico
*Seguro, escalável e alinhado com o Barramento Governamental de Angola*

Este documento descreve a transição operacional do frontend experimental (baseado em mocks locais) para o **Modelo Relacionamento Canónico** centralizado em tabelas relacionais do PostgreSQL/Supabase.

---

## 1. Mapeamento de Entidades

A tabela abaixo expressa a correspondência direta entre as estruturas temporárias no frontend, o domínio TypeScript estruturado e o backend relacional do banco de dados:

| Componente Mock Atual | Interface TypeScript Canónica (`/src/domain/types.ts`) | Tabela Relacional SQL (`/src/domain/schema.sql`) | Chaves Primárias / Estrangeiras (Relações) |
| :--- | :--- | :--- | :--- |
| **USER_PROFILE** | `DbCitizen` | `citizens` | **PK:** `bi` \| **FK:** `user_id` -> `system_users(id)` |
| **PROFILES_MAP** | `DbUser` & `DbWorker` | `system_users` & `workers` | **PK:** `id` \| **FK:** `institution_id` -> `institutions(id)` |
| **CANONICAL_INSTITUTIONS**| `DbInstitution` | `institutions` | **PK:** `id` |
| **INBOX / SENT** | `DbCorrespondence` | `correspondences` | **PK:** `id` \| **FK:** `recipient_bi` -> `citizens(bi)` |
| **STATE_HISTORY** | `DbCorrespondenceStateEvent` | `correspondence_transitions` | **PK:** `id` \| **FK:** `correspondence_id` -> `correspondences(id)` |
| **DOCUMENTS (WALLET)** | `DbDocument` | `documents` | **PK:** `id` \| **FK:** `holder_bi` -> `citizens(bi)`, `protocol_id` |
| **NOTIFICATIONS** | `DbNotification` | `system_notifications` | **PK:** `id` \| **FK:** `target_bi` -> `citizens(bi)` |
| **CONTACTS_LIST** | `DbTrustContact` | `contacts_circle` | **PK:** `id` \| **FK:** `owner_bi` -> `citizens(bi)` |
| **SERVICES_PROCESSES** | `DbProcess` | `user_requests` | **PK:** `id` \| **FK:** `user_bi` -> `citizens(bi)` |
| **BILLING_INVOICES** | `DbInvoice` | `invoices` | **PK:** `id` \| **FK:** `institution_id` -> `institutions(id)` |
| **PAYMENT_RECOR_LIST** | `DbPaymentRecord` | `payment_records` | **PK:** `id` (Referência bancária indexada) |

---

## 2. Padrão de Serviço de Mapeamento (Mappers / Clients)

Para ligar as tabelas sem quebrar a renderização atual na aplicação React, inserimos uma camada de serviços isolados. Esta camada descompacta respostas relacionais do Supabase e converte-as para os formatos consumidos pela UI.

### Exemplo: Serviço de Mapeamento do Cidadão (Citizen Mapper)

```typescript
import { DbCitizen } from '../domain/types';
import { SessionUser } from '../types';

/**
 * Converte o Cidadão extraído das tabelas relacionais do Estado
 * para o formato esperado pelo Gestor de Sessão do Cidadão no Frontend.
 */
export function mapDbCitizenToSessionUser(citizen: DbCitizen): SessionUser {
  const [firstName, ...lastNameParts] = citizen.fullName.split(' ');
  const lastName = lastNameParts.join(' ') || '';

  return {
    id: citizen.userId || `USR-${citizen.bi}`,
    name: citizen.fullName,
    firstName,
    lastName,
    bi: citizen.bi,
    nif: citizen.nif,
    passport: citizen.passport,
    phone: citizen.phone,
    email: citizen.email,
    birthDate: citizen.birthDate,
    filiation: citizen.filiation,
    maritalStatus: citizen.maritalStatus,
    avatarUrl: citizen.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format",
    verificationLevel: citizen.verificationLevel,
    confidenceScore: citizen.confidenceScore,
    lastAccess: "Hoje às " + new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
  };
}
```

### Exemplo: Serviço de Carregamento de Correspondências e Histórico

```typescript
import { DbCorrespondence, DbCorrespondenceStateEvent } from '../domain/types';
import { Message, DigitalProtocol } from '../types';

/**
 * Une a correspondência física, o protocolo digital HSM e 
 * o histórico de eventos de controle em um objeto unificado para a tela.
 */
export function combineCorrespondenceToMessage(
  core: DbCorrespondence,
  history: DbCorrespondenceStateEvent[],
  protocol?: DbDigitalProtocol
): Message {
  return {
    id: core.id,
    org: core.org,
    preview: core.preview,
    date: new Date(core.createdAt).toLocaleDateString('pt-AO'),
    unread: core.unread ? 1 : 0,
    status: core.priorityScale,
    details: {
      subject: core.subject,
      body: core.body,
      actions: core.actions,
      attachments: core.attachments,
    },
    protocol: protocol ? {
      internalId: protocol.id,
      protocolNumber: protocol.protocolNumber,
      issuerInstitution: protocol.issuerInstitution,
      officialIssueDate: protocol.officialIssueDate,
      officialTime: protocol.officialTime,
      issuerResponsible: protocol.issuerResponsible,
      category: protocol.category,
      documentType: protocol.documentType,
      currentState: protocol.currentState,
      priority: protocol.priority,
      deadlineDate: protocol.deadlineDate,
      qrCodeUrl: protocol.qrCodeUrl,
      digitalSignature: protocol.digitalSignature,
    } : undefined,
    stateHistory: history.map(h => ({
      state: h.state,
      date: h.date,
      time: h.time,
      responsible: h.responsible,
      description: h.description,
    })),
    sensitivity: core.sensitivity,
    priorityScale: core.priorityScale,
    deadlineHoursRemaining: core.deadlineHoursRemaining
  };
}
```

---

## 3. Plano Operacional de Integração

1. **Atentado ao Isolamento**: Nenhuma das mudanças estruturais ou de tipos no backend deve alterar o layout das visualizações do React. A ordem das secções, tabelas e cabeçalhos, e o design system permanecem intatos.
2. **Camada Rest-Client (Supabase)**: Criar sub-rotas nos stores utilizando o `useContext` atual, buscando e escrevendo com o cliente do SDK (`SupabaseClient`).
3. **Mecanismo Desligado (Offline fallback)**: O `OfflineManager` de cookies/Sync local atual interceptará a chamada se falhar a rede, armazenando eventos pendentes que serão descarregados assim que a conectividade esteja estabelecida.
