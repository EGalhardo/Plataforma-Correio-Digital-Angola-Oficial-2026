# Aviso preto do canto superior direito — clicável (3 áreas)

**Pedido do dono:** «No app quando uma mensagem é recebida costuma exibir uma notificação no badge da
foto de perfil, na lista de mensagens não lidas, em alguns casos nas opções de funcionalidades e na
parte superior direito com fundo preto. Preciso que ao clicar nessa última notificação com fundo
preto seja exibida a respectiva página.»

**Estado:** implementado e provado com as contas reais, em produção.

---

## Qual era o elemento

Não era um banner nem um dropdown — era o **toast global** do `NotifyHost`, o aviso que anuncia
notificações novas:

- posição `fixed`, `top: max(16px, env(safe-area-inset-top))`, centrado no topo (fica no canto
  superior direito no ecrã largo);
- fundo `#0F172A` (preto), barra colorida à esquerda conforme o tipo;
- texto no formato `«Título: mensagem»` — ex.: *«Nova Correspondência Oficial: … foi disponibilizada
  no seu endereço digital oficial.»*

Era **puramente informativo**: `role="status"`, sem qualquer `onClick`. Confirmado por inspecção do
DOM em produção: `top=16`, `right=460`, `background-color: rgb(15, 23, 42)`.

Origem do aviso (`App.tsx`, sincronização de notificações): as linhas novas não vistas na sessão
disparam `notify(...)` — até 3 por ciclo. O primeiro carregamento só memoriza os ids, sem toast.

---

## O que passa a acontecer

1. O aviso transporta a **origem** da notificação (`target_tab`, vínculo `messageId` e o texto).
2. O cartão do toast passa a ser um **botão** (`role="button"`, `tabIndex=0`, `aria-label`,
   `Enter`/`Espaço`), com o sinal **«Abrir ›»** e cursor de clique.
3. O clique fecha o aviso e entrega o destino ao **mesmo ponto de decisão** já usado pelo menu da
   foto e pelo Centro de Notificações (`resolverDestinoNotificacao`):
   - avisos de página própria (inquéritos, correspondências, notificações, ocorrências…) → abre a
     **página** indicada;
   - notificações ligadas a uma correspondência → abre a **correspondência** exacta.
4. O botão **×** continua a fechar sem navegar (`stopPropagation`).

Como o `NotifyHost` está montado em `main.tsx` (fora do `App`), o destino segue por evento global
(`cda:abrir-toast-destino`) e o `App` resolve a navegação — evita passar props de navegação através
de todo o `App` e mantém um único caminho para todas as notificações.

---

## A prova (`scripts/provar_aviso_preto_clicavel_playwright.cjs`)

Para cada área: cria a notificação na base, força a sincronização (o mesmo caminho do utilizador),
verifica posição/cor/tipo do aviso e clica.

```
═══ CIDADÃO ═══
   ✓ o aviso preto aparece no canto superior direito
   ✓ está no topo/direita (top=16, right=460)
   ✓ fundo preto confirmado (rgb(15, 23, 42))
   ✓ o aviso mostra o sinal «Abrir»
   ✓ o aviso é um elemento clicável (role=button)
   ✓ o clique produziu navegação (a página mudou)
   ✓ abriu a página respectiva
   ✓ o aviso fechou depois do clique

═══ INSTITUIÇÃO ═══    (8/8 — abre Inquéritos)
═══ ADMINISTRAÇÃO ═══  (8/8 — abre Correspondências)

limpeza: ✓ 0 restantes
RESULTADO: APROVADO
```

Duas execuções consecutivas APROVADAS. Não-regressão: `provar_notificacoes_clicaveis` APROVADO.

**Nota sobre a conta de Administração:** por motivos de segurança a palavra-passe do Admin é
`987654321` (não `123456789`), e a Administração lê as notificações com a chave `CDA` — foi assim que
o teste passou a passar. Isto é só relevante para testes, não para o produto.

---

## Detalhes técnicos

- `src/lib/notify.ts` — `CdaToastDestino`, opção `destino` em `notify()` e `abrirDestinoNotify(id)`.
- `src/components/ui/NotifyHost.tsx` — cartão clicável/acessível, sinal «Abrir», `×` sem navegar.
- `src/App.tsx` — o aviso passa a levar `destino`; handler `abrirDestinoDoAviso` reutiliza
  `abrirNotificacao` (via ref, para não quebrar a ordem de declaração).
- Toasts sem destino (validações, erros de envio, confirmações) continuam **exactamente** como eram:
  não ficam clicáveis e não mostram «Abrir».
