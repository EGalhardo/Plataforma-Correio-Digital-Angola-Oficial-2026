# REGRAS DE ESTADO DE CORRESPONDÊNCIA — Correio Digital Angola (v37.78.12)

Criadas a pedido do dono após o bug gravíssimo: **o remetente abriu a própria
carta em «Enviadas» e a carta ficou «Lida» na área do destinatário** (que nunca
a viu nem recebeu notificação). Regra de base (melhores práticas de correio):

> **O estado de leitura pertence a quem RECEBE. Contas diferentes = estados
> diferentes. Quem enviou pode consultar, nunca mutar.**

## R1 — «unread» tem um único escritor: o destinatário
- `messages.unread` (nuvem) só pode ser escrito por
  `supabaseService.markMessageReadByRecipient(id)` — método criado v37.78.12.
- O `updateMessageState` genérico **não aceita mais `unread`** (removido da
  assinatura → o compilador apanha qualquer tentativa futura).
- `handleUpdateMessage` (edições) deixou de escrever `unread`: editar conteúdo
  nunca muda estado de leitura.
- No **envio**, `unread:true` é fixado na criação da linha (INSERT) — único
  outro toque permitido no campo.

## R2 — Abrir a própria enviada é só leitura de recibo
- `handleSelectMessage` e o efeito central de leitura (App.tsx) comparam
  `senderKey`/`recipientBi` com a chave da sessão:
  - **Destinatário abre** → marca «Lida» local + nuvem + evento «Visualizada».
  - **Remetente abre a enviada** → NÃO escreve nada na nuvem, NÃO marca local;
    o «Não Lida» da pasta Enviadas é o **recibo de leitura** e permanece fiel
    até o destinatário abrir.
- Vale para qualquer par: cidadão↔instituição, cidadão↔cidadão,
  instituição↔instituição, administração↔qualquer.

## R3 — Eventos de história descrevem QUEM agiu
- `message_state_history` «Visualizada» só é criado pelo destinatário, com
  descrição «Aberta pelo destinatário» (antes: nome do remetente aparecia como
  quem leu — histórico mentiroso).

## R4 — Notificações pertencem ao destinatário
- A notificação «Nova Correspondência Oficial» é criada no envio com
  `target_bi` = destinatário (visível só na sessão dele). Nenhum estado da
  sessão do remetente (abrir/arquivar/editar enviadas) cria, consome ou lê
  notificações do destinatário.

## R5 — Acções de caixa (arquivar/eliminar/restaurar) são locais ao titular
- Mantém-se a salvaguarda de difusões «TODOS» (linhas partilhadas nunca são
  alteradas na nuvem por um só titular). Para correspondências 1→1, o
  `state_indicator` é escrito pela pessoa que age na sua própria caixa;
  nenhuma acção do remetente sobre a enviada o escreve.

## R6 — Teste de regressão permanente
- `scripts/e2e_regra_leitura.mjs` reproduz o cenário completo do dono:
  instituição envia → remetente abre a enviada → **unread mantém-se TRUE na
  nuvem** → cidadão entra e vê «Não Lida» + notificação → cidadão abre →
  só então `unread=false`. Qualquer regressão destas regras falha o suite.

## PERFORMANCE (mesma versão)
- Escritas pós-envio (protocolo, evento «Enviada», notificação) agora em
  **paralelo** (eram 3+ round-trips sequenciais) — nos envios simples e de
  documento.
- **Envio múltiplo**: as N cópias correm em paralelo (eram sequenciais).
- `insertMessageStateEvent` deixou de fazer SELECT de existência prévia
  (−1 round-trip por evento).
- Garantias de perfil do remetente/destinatário em paralelo no envio.
