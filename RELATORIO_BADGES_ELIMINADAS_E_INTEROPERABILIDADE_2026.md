# Relatório Técnico Oficial: Badges Unificados, Gestão de Correspondências Eliminadas e Interoperabilidade Bidirecional (CDA 2026)

**Data de Emissão:** 29 de Setembro de 2026  
**Ambiente:** Plataforma de Correio Digital de Angola — Edição Oficial 2026  
**Responsável Técnico:** Equipa de Engenharia e Arquitetura de Software CDA  
**Estado Geral:** Homologado e 100% Aprovado em Testes Unitários e E2E  

---

## 1. Sumário Executivo

O presente relatório consolida as intervenções estruturais, correções de ciclo de vida e testes de interoperabilidade bidirecional implementados na plataforma oficial do **Correio Digital de Angola (CDA 2026)**, cobrindo:

1. **Unificação das Regras de Badges e Notificações (Cidadão & Instituição):**
   - O badge no canto superior direito na **Foto de Perfil** reflete rigorosamente o total de correspondências não lidas presentes na caixa de entrada (`unreadTotal`).
   - Cada um dos 5 botões de atalho no Painel (`Vídeo-Atendimento`, `Inquérito`, `Ocorrência`, `Denúncia`, `Reclamações / Livro de Reclamações`) exibe o badge com a contagem exata de correspondências «Não Lidas» do respetivo canal.
   - Extinção imediata dos badges em tempo real assim que as correspondências são marcadas como lidas.
2. **Correção do Ciclo de Vida de Mensagens Eliminadas / Arquivadas no Correio:**
   - Correção do fluxo de eliminação no 1.º clique para que a correspondência passe da caixa ativa para a aba **«ELIMINADAS / ARQUIVADAS»** (`excluidas`).
   - Disponibilização na lista das ações de **Restaurar** (repondo o estado ativo) e **Eliminar Definitivamente** (acionando a purga permanente com marcador e protocolo de zero rastos).
   - Preservação da mensagem na hidratação de dados para que continue visível na pasta de eliminadas entre sessões e recarregamentos.
3. **Interoperabilidade Bidirecional em Tempo Real Cidadão ↔ Instituição:**
   - Validação dos 6 canais integrados entre as contas reais homologadas `002399714LA030` (Cidadão) e `INAPEM-LMM-01` (Instituição):
     - **Canal 1:** Correspondência Oficial Digital (composição, envio, resposta e leitura).
     - **Canal 2:** Vídeo-Atendimento Oficial (agendamento e sala virtual).
     - **Canal 3:** Inquéritos e Sondagens Governamentais.
     - **Canal 4:** Inquérito com Inteligência Artificial Conversacional.
     - **Canal 5:** Ocorrências Locais Georreferenciadas (GPS).
     - **Canal 6:** Denúncias e Livro Oficial de Reclamações.

---

## 2. Detalhe das Implementações

### 2.1. Lógica Pura de Contagem (`src/utils/notificacoesAtalhos.ts`)

A função `contarNotificacoesAtalhos` foi estruturada para manter consistência absoluta tanto no Cidadão como na Instituição:

```typescript
export function contarNotificacoesAtalhos(
  notificacoes: AppNotification[],
  inbox: Message[],
  institucional: boolean,
  ocorrencias = 0,
  enviadas: Message[] = []
): ContagensAtalhos {
  const isNaoLida = (m: Message) => Boolean(m.unread && m.status !== 'Lida' && m.status !== 'lida');
  const naoLidas = (inbox || []).filter(isNaoLida);

  const counts: ContagensAtalhos = {
    'video-atendimento': naoLidas.filter(isVideoAtendimentoMessage).length,
    'inqueritos': naoLidas.filter(isInqueritoMessage).length,
    'ocorrencias': naoLidas.filter(isOcorrenciaMessage).length + (institucional ? 0 : (ocorrencias || 0)),
    'nova-denuncia': naoLidas.filter(isNovaDenunciaMessage).length,
    'denuncias': naoLidas.filter(isReclamacaoDenunciaMessage).length,
  };

  if (institucional) {
    return counts;
  }

  // No modo Cidadão: adiciona notificações de sistema que não estejam fundidas
  const pools = poolsPorPapel(inbox, enviadas, false);
  const vistos = new Set<number>();
  for (const n of notificacoes) {
    if (n.unread === false || vistos.has(n.id)) continue;
    vistos.add(n.id);
    const tipo = classificarNotificacao(n, pools);
    if (!tipo) continue;
    const associada = associarMensagem(n, pools);
    if (associada?.tipo === tipo && associada.funde && associada.m.unread) continue;
    counts[tipo]++;
  }

  return counts;
}
```

### 2.2. Gestão de Eliminadas / Arquivadas (`src/App.tsx`)

1. **Ação `handleDeleteMessage`:**
   - No primeiro clique em «Eliminar», a mensagem é adicionada a `deletedMessageIds`, o estado remoto é atualizado para `Arquivada` e o utilizador é notificado (*«Correspondência movida para as eliminadas.»*).
   - O ID da mensagem NÃO é adicionado a `hiddenMessageIds` no 1.º clique, garantindo que aparece na aba `excluidas`.
   - No segundo clique (dentro da pasta de Eliminadas), a mensagem é adicionada a `hiddenMessageIds` e o marcador `ELIM_PERM:<chave>` é carimbado.
2. **Ação `handleRestoreMessage`:**
   - Remove o ID de `deletedMessageIds`, atualiza o estado remoto para `Ativa` e emite evento no histórico de auditoria.
3. **Filtro de Entrada `foraDaMinhaCaixa`:**
   - Mensagens com `state_indicator === 'Arquivada'` deixam de ser descartadas no carregamento da caixa, permitindo que alimentem a aba `excluidas`.
   - Sincronização automática de `dbArchivedIds` para hidratar `deletedMessageIds` na abertura da sessão.

---

## 3. Resultados dos Testes Automatizados

| Suíte de Testes | Componente / Fluxo | Asserções | Resultado |
| :--- | :--- | :---: | :---: |
| `tests/painel/notificacoes.test.ts` | Regras de Badges e Notificações (Cidadão e Instituição) | 28 / 28 | **APROVADO (100%)** |
| `tests/painel/inqueritos.test.ts` | Estrutura de Inquéritos e Sondagens | 9 / 9 | **APROVADO (100%)** |
| `tests/ocorrencias/model-auth.test.ts` | Modelo e Autorização de Ocorrências | 39 / 39 | **APROVADO (100%)** |
| `scripts/e2e_inst_panel_badges.mjs` | Testes E2E dos 5 Badges Institucionais via Playwright | 20 / 20 | **APROVADO (100%)** |
| `scripts/e2e_unified_badges_and_interoperability.mjs` | E2E Integrado: Badges, Eliminadas e 6 Canais Bidirecionais | 11 / 11 | **APROVADO (100%)** |
| `npm run lint` | Validação Estrita TypeScript (`tsc --noEmit`) | 0 erros | **APROVADO (100%)** |

---

## 4. Conclusão

A arquitetura de notificações e badges, o ciclo de eliminação de correspondência e a interoperabilidade bidirecional encontram-se plenamente alinhados com os requisitos oficiais do Governo de Angola para 2026, com total estabilidade, zero rastos na eliminação definitiva e sincronização fidedigna em tempo real.
