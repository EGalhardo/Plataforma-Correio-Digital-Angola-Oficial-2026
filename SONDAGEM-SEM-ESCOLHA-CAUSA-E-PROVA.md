# «Sem escolha — seleccione uma opção na sondagem» × 2 — causa e prova

**Data:** 2026-11-17 · **Deploys:** `609403a` · `13afaba` (READY)

---

## O que se viu

A instituição criou o inquérito e enviou ao cidadão Edlasio. Ao abrir e tocar em
«Responder», aparecia:

> **Confirmar Respostas às Sondagens** · Reveja as suas escolhas · **2 sondagens**
> **Sondagem #229** — Sem escolha — seleccione uma opção na sondagem.
> **Sondagem #230** — Sem escolha — seleccione uma opção na sondagem.

## Causa raiz

As duas sondagens estavam **`status = 'rascunho'`** na base:

| id | pergunta | estado no envio |
|---|---|---|
| 229 | `ffffff…` | **rascunho** |
| 230 | `zzzzz…` | **rascunho** |

Consequência em cadeia:

1. a política de leitura só mostra ao cidadão sondagens **já lançadas** — o
   rascunho é invisível para ele (comportamento correcto);
2. o cartão de resposta não carregava, logo não aparecia nenhum sítio para
   escolher a opção;
3. o modal «Confirmar Respostas» continuava a listar as duas sondagens e dizia
   «Sem escolha» — culpando o cidadão por uma escolha que ele **não tinha onde**
   fazer.

E a causa de terem ficado em rascunho: `ativarSondagensParaDestinatarios` fazia
`UPDATE` e **ignorava o resultado**. Se a linha fosse filtrada, ficava em
rascunho **sem que ninguém soubesse** — a mensagem era entregue na mesma.

## Correções

1. **Activação verificada** (`sondagemService.ativarSondagensParaDestinatarios`):
   cada sondagem é relida do servidor depois do `UPDATE`; se não estiver
   `ativa`, o envio **aborta com erro honesto** em vez de entregar uma
   correspondência que não funciona.
2. **Resgate na leitura** (`buscarSondagem`): uma sondagem embutida numa
   mensagem já entregue que tenha ficado em rascunho é activada ao ser aberta.
3. **RPC `cda_ativar_sondagem_entregue(p_id bigint)`** (`security definer`): só
   activa se quem chama **recebeu** a mensagem com essa sondagem embutida, ou é
   a instituição dona, ou é administração. Impede que um cidadão active
   sondagens alheias. `EXECUTE` só para `authenticated`.
4. **Modal honesto**: quando a sondagem não carregou, a mensagem passou a
   «Esta sondagem não pôde ser carregada…» em vez de «Sem escolha».

## Prova (contas reais, Playwright)

`node scripts/provar_inquerito_2sondagens_playwright.cjs`

```
1. Instituição cria 2 sondagens e envia
   → ids 233 e 234, ambas «ativa» no envio ✓
   → mensagem com sondagem_ids [233,234] ✓
2. Cidadão abre e responde
   → opções visíveis no cartão: 2 de 2 ✓
   → modal: «Sem escolha» × 0 ✓
   → respostas: [{233,["A"]},{234,["A"]}] do BI 002399714LA030 ✓
3. Resgate (sondagens forçadas de volta a rascunho — o defeito original)
   → cartão voltou a funcionar ✓ (estado passou a «ativa»)
   → respondeu às duas, «Sem escolha» × 0 ✓
RESULTADO: APROVADO
```

O caso concreto do relato (`Inquerito 123bbbbbbbbbbbbbb`, sondagens 229/230)
foi também reposto em rascunho, aberto na conta do Edlasio e **respondido com
sucesso** — as duas passaram a `ativa` e as respostas ficaram gravadas.

## Limpeza

Sondagens de diagnóstico (`REPRO-…`, `PROVA2 …`, `PROVA CICLO …`) e respectivas
mensagens removidas. Ficaram as tuas: 229, 230 (agora `ativa`) e as anteriores.
