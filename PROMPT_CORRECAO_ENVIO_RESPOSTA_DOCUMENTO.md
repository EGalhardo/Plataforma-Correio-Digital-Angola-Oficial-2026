# PROMPT — CORREÇÃO DO ENVIO DA "RESPOSTA OFICIAL" NO DETALHE DA CORRESPONDÊNCIA

> **Versão:** 1.0 · **Data:** 2026-08-20
> **Âmbito:** `src/components/features/MessageDetail.tsx` + `src/App.tsx`
> **Tipo de tarefa:** correção de bug (o envio não acontece — a mensagem nunca chega ao destinatário)
>
> Base factual: análise do código em 2026-08-20 (commit `bb16b66`). Todas as referências abaixo
> correspondem ao código real do repositório.

---

## FUNÇÃO DA IA

Atua como **engenheiro sénior de frontend** no Correio Digital Angola (React + TypeScript + Supabase).

O teu objetivo é corrigir um fluxo partido na página **"Detalhe da Correspondência"** (`MessageDetail.tsx`):

- Ao clicar no botão **"Responder ao Documento"**, abre-se uma área de escrita de resposta;
- Ao clicar em **"Enviar Resposta Oficial"**, **a resposta NÃO é enviada** — fica apenas num estado
  local da interface (cartão de sucesso), nunca é entregue ao destinatário, nunca aparece em
  "Enviados" e nunca é persistida no Supabase.

Quero que esta resposta seja **realmente enviada**, exatamente como acontece no fluxo que já funciona:
**"Responder"** (na mesma página) → compositor → **"Enviar Mensagem Oficial"**.

---

## 1. DIAGNÓSTICO (causa raiz — já confirmado)

Ficheiro: `src/components/features/MessageDetail.tsx`.

O handler inline do botão **"Enviar Resposta Oficial"** (localiza por `Enviar Resposta Oficial`,
dentro do bloco do editor `isReplyingInDetails` com a `textarea` ligada a `detailReplyText`)
faz APENAS o seguinte:

1. `if (!detailReplyText.trim()) return;` — guarda de texto vazio;
2. `generateProtocol(...)` — protocolo gerado **em memória** (nunca selado nem persistido);
3. `onUpdateMessage({ ...selectedMessage, details.state = 'Respondida', auditLogs })` — **só** marca
   a mensagem localmente;
4. `setDetailReplySuccess({ ... })` — cartão de sucesso **local** (o texto da resposta fica aqui e
   desaparece ao fechar);
5. Limpa a textarea e fecha o editor.

Ou seja: **nenhuma chamada à pipeline real de envio**. Não existe `sendOfficialMessage` /
`sendCitizenMessage`, não existe `sealProtocolForSend`, não há `insertDigitalProtocol`, não há
notificações, não há entrada em `sentMessages` e não há fallback de fila offline. Os anexos
adicionados no editor (`inlineAttachedFiles`) só são mencionados no audit log — também não são entregues.

## 2. COMPORTAMENTO DE REFERÊNCIA (o fluxo que JÁ funciona)

Ficheiro: `src/App.tsx`.

- Botão **"Responder"** (`MessageDetail.tsx`, barra superior, prop `handleReply`) →
- `handleReply(msg)` em `App.tsx`: resolve o **destinatário canónico**
  (`msg.senderKey || msg.recipientBi || resolveInstitutionCode(msg.org)`), pré-preenche o compositor
  (`to`, `subject: "RE: ..."`, corpo com citação) e abre o compositor →
- **"Enviar Mensagem Oficial"** (`MailContent.tsx` → `tentarEnviar` → prop `handleSendMessage` =
  `executeOfficialSend` em `App.tsx`) executa a pipeline REAL:
  1. guarda P0-B anti *void-delivery* (`supabaseService.institutionRegistered` — destinatário
     institucional tem de constar do registo oficial; erro de infra não bloqueia, resposta negativa bloqueia);
  2. `sealProtocolForSend(...)` — protocolo digital selado;
  3. nova `Message` adicionada a `sentMessages` (visível em "Enviados");
  4. persistência Supabase: `supabaseService.sendOfficialMessage` (área instituição) ou
     `supabaseService.sendCitizenMessage` (área cidadão);
  5. `insertDigitalProtocol`, `insertMessageStateEvent`, `insertNotification` (x2);
  6. fallback: offline → fila local + audit log honesto ("Mensagem guardada em fila local").

**Regra de ouro:** a resposta do fluxo partido tem de percorrer **esta mesma pipeline**, com os
mesmos efeitos observáveis: destinatário recebe, "Enviados" mostra a mensagem, Supabase persiste
protocolo/mensagem/notificações, e os audit logs refletem o desfecho real.

## 3. COMPORTAMENTO EXIGIDO APÓS A CORREÇÃO

Ao clicar em **"Enviar Resposta Oficial"**:

1. **Validações** (antes de qualquer envio):
   - `detailReplyText.trim()` não vazio (manter a guarda atual e o `disabled` do botão);
   - guarda P0-B igual à de `executeOfficialSend` quando o destinatário for código institucional;
   - manter o bloqueio por nível de sensibilidade `Ultra Restrito` (o botão "Responder ao Documento"
     já fica desabilitado nesse nível — não criar bypass).
2. **Payload da resposta** — mapeamento EXATO para a pipeline existente:
   - `to` = destinatário canónico: `selectedMessage.senderKey || selectedMessage.recipientBi || resolveInstitutionCode(selectedMessage.org)` (NUNCA usar `selectedMessage.org` diretamente — é rótulo, não chave de entrega);
   - `subject` = `RE: ${selectedMessage.details?.subject || selectedMessage.preview}`;
   - `body` = `detailReplyText` (o texto digitado no editor; se aplicares formatação do toolbar — negrito/itálico/etc. — documenta a conversão; se mantiveres texto simples, indica-o explicitamente no código);
   - `attachments` = `inlineAttachedFiles` (os anexos do editor passam a ser ENTREGUES, não apenas mencionados em log).
3. **Envio pela pipeline real** — reutilizar, sem duplicar, o caminho de `executeOfficialSend`
   (ou extrair uma função partilhada). O resultado tem de incluir: protocolo selado
   (`sealProtocolForSend`) + persistência (`sendOfficialMessage`/`sendCitizenMessage`,
   `insertDigitalProtocol`, `insertMessageStateEvent`, `insertNotification`) + entrada em
   `sentMessages` + fallback de fila offline com audit log honesto.
4. **Feedback de UI**:
   - sucesso: limpar editor (`detailReplyText`, `inlineAttachedFiles`), fechar `isReplyingInDetails`,
     manter (ou evoluir) o cartão `detailReplySuccess` com o protocolo REAL selado — nunca um
     protocolo fictício de memória — e a mensagem deve aparecer em "Enviados";
   - falha/offline: NUNCA perder o texto escrito — mostrar erro claro, manter o editor aberto com o
     conteúdo e deixar tentar de novo;
   - estado `isSubmittingAction`-like enquanto o envio corre (botão com spinner/desabilitado, sem duplo envio).
5. **Auditoria honesta**: o `addAuditLogToMessage`/`onUpdateMessage` só deve marcar `'Respondida'`
   e registar sucesso **depois** do desfecho real (enviado, ou em fila offline). Em falha, registar
   a falha. Remover a atualização local que simulava o envio.

## 4. ORIENTAÇÃO DE IMPLEMENTAÇÃO

Duas abordagens aceitáveis — usa a que tiver menor risco e menor duplicação:

- **Opção A (recomendada): envio direto com payload próprio.**
  Refatorar `executeOfficialSend` em `App.tsx` para aceitar um payload opcional
  (ex.: `executeOfficialSend(override?: { to: string; subject: string; body: string; attachments: ... })`),
  mantendo o comportamento atual quando chamado sem argumentos. Expor uma nova prop em
  `MessageDetail` (ex.: `onEnviarRespostaDireta`) que o botão "Enviar Resposta Oficial" chama com o
  payload do §3.2, devolvendo `Promise<{ ok: boolean; error?: string; queued?: boolean }>` para o
  componente dar o feedback do §3.4.
- **Opção B (simples, mais um clique): ponte para o compositor.**
  Fazer o botão chamar a prop existente `handleReply`/`onResponderComRascunho` com
  `(selectedMessage, detailReplyText)`, abrindo o compositor pré-preenchido (incluindo anexos), onde
  o utilizador confirma com "Enviar Mensagem Oficial" — pipeline 100% reutilizada, zero duplicação.
  Escolher esta opção APENAS se for aceitável o passo intermédio de confirmação; documentar a escolha.

Em ambos os casos:
- **Proibido** duplicar a lógica de envio dentro de `MessageDetail.tsx`;
- **Proibido** inventar novas tabelas/endpoints — usar exclusivamente o que `executeOfficialSend` já usa;
- Manter intactos os outros trâmites do `handleOfficialActionSubmit` (Confirmar leitura, Assinar,
  Revisão, Contestação, Anexar, Agendar, Encaminhar) — a correção é só para a resposta;
- Manter intactos os fluxos "Responder" da barra superior e "Sugerir resposta com IA";
- Respeitar as convenções de tradução (`t(...)`) usadas no ficheiro;
- Atualizar os comentários de código que descreviam o comportamento antigo.

## 5. VERIFICAÇÃO OBRIGATÓRIA

1. `npm run lint` — zero erros;
2. `npm run build` — build de produção limpo;
3. Teste manual (área CIDADÃO):
   - abrir mensagem recebida → "Responder ao Documento" → escrever resposta (+ 1 anexo) →
     "Enviar Resposta Oficial" → a resposta aparece em **Enviados**, a mensagem original fica
     "Respondida", e o destinatário (outra conta/visão) recebe a resposta com anexo e notificação;
4. Teste manual (área INSTITUIÇÃO): mesmo fluxo com destinatário BI (F59) — enviar ao cidadão;
5. Teste de falha: com a rede/Supabase indisponível, o envio cai na fila offline (audit log honesto)
   ou mostra erro — em NENHUM caso o texto escrito se perde;
6. Teste de bloqueio: destinatário institucional NÃO registado → envio bloqueado com aviso (P0-B),
   sem cartão de sucesso falso;
7. Confirmar que `npm run dev` arranca sem erros e que nenhum `about:blank`/regressão foi introduzido.

## 6. CRITÉRIOS DE ACEITAÇÃO

- [ ] "Enviar Resposta Oficial" entrega a resposta pela mesma pipeline de "Enviar Mensagem Oficial";
- [ ] A resposta aparece em "Enviados" e na caixa do destinatário (com anexos);
- [ ] Protocolo digital selado e persistido (`digital_protocols`); mensagem, estado e notificações no Supabase;
- [ ] Sem perda de texto em caso de falha; sem envios duplicados; sem estados "Respondida" falsos;
- [ ] Audit logs refletem o desfecho real (enviado / fila offline / bloqueado P0-B / falha);
- [ ] Nenhum outro fluxo alterado; lint e build limpos.

## 7. SAÍDA ESPERADA

1. Alterações de código (mínimas e cirúrgicas) nos ficheiros identificados;
2. Descrição curta da abordagem escolhida (Opção A ou B) e do mapeamento de payload;
3. Comando `git diff --stat` revisto;
4. Commit com mensagem no padrão do repo, ex.:
   `fix(correio): "Enviar Resposta Oficial" passa a entregar a resposta pela pipeline oficial (protocolo selado, persistência Supabase, anexos e fila offline)`.
