# Relatório Oficial: Auditoria e Correção do Envio de Correspondências

**Data:** 30 de Setembro de 2026  
**Sistema:** Plataforma Oficial do Correio Digital de Angola (CDA)  
**Módulos Corrigidos:** `src/App.tsx`, `src/components/features/MailContent.tsx`, `src/services/sondagemService.ts`

---

## 1. Objectivos e Requisitos Concluídos

1. **Envio Individual de Correspondência**:
   - Quando o campo Destinatário contém um número de BI específico (ex.: `002399714LA030`) ou um código institucional (ex.: `AGT-9921-SR`, `INAPEM-LLMM`), é gerada e expedida **exatamente UMA (1) correspondência** exclusivamente para esse destinatário.
   - Eliminadas quaisquer mensagens espelho ou difusões secundárias indesejadas que ocorriam ao anexar blocos de sondagens ou inquéritos inteligentes.

2. **Envio em Massa ("Todos")**:
   - Quando o campo Destinatário for `Todos`, a correspondência é enviada **para todos os contactos que tenham histórico de troca de contacto e correspondência com a conta atual** (cidadão ou instituição).
   - O envio para `Todos` opera via fan-out individual com protocolo digital, registo de estado oficial e notificação para cada destinatário da audiência.

---

## 2. Diagnóstico e Correções Técnicas

### A. Eliminação de Difusão Ampla em Envios Individuais com Sondagens (`MailContent.tsx` e `sondagemService.ts`)
- **Causa:** No envio de mensagens com sondagens, o sistema disparava `distribuirSondagensCompostas` que enviava a mensagem para todos os cidadãos da base institucional, excluindo apenas o destinatário manual, e depois criava uma nova mensagem para o destinatário manual.
- **Solução:** Implementada a função `ativarSondagensParaDestinatarios`. Quando o destinatário é um BI específico (`!paraTodos`), as sondagens são ativadas apenas para os destinatários indicados e seguem embutidas na mensagem única dirigida a eles, sem qualquer difusão para terceiros.

### B. Envio para "Todos" Unificado e Baseado no Histórico da Conta (`App.tsx`)
- **Causa:** O envio `to === 'TODOS'` bloqueava cidadãos e, nas instituições, dependia apenas de RPC na nuvem sem fallback para os contactos e histórico de mensagens da sessão.
- **Solução:** O envio para `Todos` unifica a lista de cidadãos com contacto prévio, os contactos registados (`contacts`) e os intervenientes das correspondências anteriores (`inbox` e `sentMessages`) da conta atual, entregando uma cópia individual a cada contacto relevante.

### C. Gestão de Múltiplos Destinatários e Chips
- **Causa:** Possibilidade de desfasamento entre `composeData.to` e `composeData.toArray`.
- **Solução:** Deduplicação estrita via `Set` em `executeOfficialSend`.

---

## 3. Estado dos Ficheiros

- `src/services/sondagemService.ts` — Adicionada função `ativarSondagensParaDestinatarios`.
- `src/components/features/MailContent.tsx` — Envio individual de mensagens com sondagens (`!paraTodos`) sem disparar difusão global.
- `src/App.tsx` — Pipeline `executeOfficialSend` com suporte total a envio individual de 1 correspondência e envio a `Todos` baseado no histórico de contactos.
