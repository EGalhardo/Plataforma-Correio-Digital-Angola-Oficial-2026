# Videochamada cidadão (telemóvel) ↔ instituição (computador) — causa, correcção e prova

**Data:** 17 de Novembro de 2026 · **Estado:** corrigido, publicado e provado em produção
**Produção:** https://correio-digital-angola-oficial.vercel.app · commits `4a9562d` → `2bdaba6`

---

## 1. O que foi reportado

> «Na videochamada ambas as telas maiores não funcionavam. Na tela mobile aparecia um
> fundo branco e no desktop um fundo negro. Ambas as telas pequenas funcionavam.»

Ou seja: a imagem do próprio (janela pequena) aparecia sempre; o **ecrã grande**, que
devia mostrar o interlocutor, ficava vazio. Reproduzido em produção com as duas contas
reais (cidadão `002399714LA030` em viewport/UA de telemóvel, instituição `AGT-LMM-01`
em computador).

## 2. As causas — eram três, não uma

### 2.1 A chamada só ligava metade das vezes (causa principal)

Medido antes de tocar em nada: **1 chamada em 2** ligava. Uma sonda ao sinalizador
mostrou a mensagem (oferta/resposta/candidato) a chegar a **1 em cada 3 pedidos**:

```
ensaio 1: signal=200 | entregas nos 3 polls: 0,1,0
ensaio 2: signal=200 | entregas nos 3 polls: 1,0,0
ensaio 3: signal=200 | entregas nos 3 polls: 1,0,0
```

O servidor de sinalização guardava as mensagens num `Map` **em memória**. Em produção
a função corre em várias instâncias: a instância que guardou a oferta não é a que
responde ao pedido seguinte. O resultado era o pior tipo de falha — a chamada ficava
em «Aguardar Participante» **para sempre, sem um único erro**.

### 2.2 O ecrã grande não tinha cor nem imagem própria

- a caixa do vídeo **não tinha cor de fundo**: no modo claro mostrava o **branco** do
  cartão por baixo (o «fundo branco» do telemóvel);
- o `<video>` do interlocutor ficava com **opacidade 0** até haver faixas, deixando só
  o fundo escuro (o «fundo negro» do computador);
- no telemóvel a **janela pequena (PiP) ficava por cima do centro do ecrã** e tapava o
  aviso «Aguardar Participante» — parecia uma sala vazia.

### 2.3 O relay TURN anunciado estava morto

O endpoint `/api/webrtc/ice` distribuía credenciais de `openrelay.metered.ca`. Esse
serviço foi descontinuado: o nome resolve para um endereço morto (`100::1` / `192.0.2.1`).
Medido em produção: **0 candidatos `relay`**. A app anunciava um relay que não existia —
pior do que não ter nenhum, porque dá falsa confiança.

## 3. O que foi corrigido

| Ficheiro | Correccção |
|---|---|
| `api/index.ts` | Sinalização passa também por transporte **durável** (tabela `cda_webrtc_signal`); o poll junta memória + durável, sem duplicados |
| `api/index.ts` | Relay morto removido; STUN passa a **três operadores** (Google, Cloudflare, Mozilla); o endpoint diz `turnConfigurado` |
| `api/index.ts` | Limpeza automática das mensagens efémeras (> 2 min), no máximo 1×/min por instância |
| `WebRTCVideoCallRoom.tsx` | **Reenvio da oferta** até 4× a cada 4 s enquanto a chamada não liga |
| `WebRTCVideoCallRoom.tsx` | Ecrã grande com **fundo próprio** (nunca herda branco) e `<video>` remoto sempre montado |
| `WebRTCVideoCallRoom.tsx` | Aviso de espera **acima do PiP** — deixa de ser tapado no telemóvel |
| `WebRTCVideoCallRoom.tsx` | Se estiver ligado 10 s sem imagem e sem relay: **aviso honesto** da causa provável |

Tabela criada no Supabase (projecto `klrclczcahfycfdxzdqs`), **efémera por desenho**:
`public.cda_webrtc_signal` com RLS ligado e **sem políticas** — só a service role
(servidor) acede; as linhas com mais de 2 minutos são apagadas automaticamente.
Confirmado no fecho: tabela com **0 linhas**.

## 4. A prova

### `scripts/test_videochamada_2contas_playwright.cjs` — APROVADO 4/4

Duas contas reais, dois browsers separados, cidadão com viewport e user-agent de
telemóvel, instituição em computador.

| Volta | Instituição (ecrã grande) | Cidadão (ecrã grande) |
|---|---|---|
| 1 | imagem 480×270 · áudio+vídeo `live` | imagem 640×360 · áudio+vídeo `live` |
| 2 | imagem 640×360 · áudio+vídeo `live` | imagem 640×360 · áudio+vídeo `live` |
| 3 | imagem 480×270 · áudio+vídeo `live` | imagem 640×360 · áudio+vídeo `live` |
| 4 | imagem 640×360 · áudio+vídeo `live` | imagem 640×360 · áudio+vídeo `live` |

Fundo do ecrã grande com cor própria nas duas pontas · opacidade do vídeo `1` ·
PiP já não tapa o aviso. **Antes: 1/2 chamadas; depois: 4/4.**

### Não-regressão

- `scripts/test_paginas_brancas_playwright.cjs` — **APROVADO** (37 navegações, 0 páginas brancas, recuperação de falha de carregamento intacta)
- `scripts/test_interop_contas_reais_playwright.cjs` — **APROVADO**, `erros_js: []`

## 5. O limite que resta — e que precisa de uma decisão sua

O que foi corrigido garante: a chamada **liga de forma fiável**, a imagem aparece nos
dois ecrãs grandes nas condições testadas, e nunca fica um ecrã vazio sem explicação.

Falta uma peça de infraestrutura, que **não se compra com código**: um **servidor de
relay TURN**. Sem ele, quando as duas pontas estão em **redes diferentes com NAT
restritivo** (o caso típico: telemóvel em dados móveis e instituição atrás de um router
de escritório), os pacotes de vídeo não encontram caminho. É por isso que a chamada
pode ligar numa rede e não noutra.

**Como resolver (5 minutos, sem alterar código):** subscrever um TURN (Metered/Open
Relay, ExpressTURN ou Twilio — há planos gratuitos de 20 GB/mês, mais do que suficiente)
e definir na Vercel, em *Settings → Environment Variables*:

```
ICE_TURN_URLS=turn:relay1.expressturn.com:3478,turns:relay1.expressturn.com:5349
ICE_TURN_USERNAME=<utilizador do fornecedor>
ICE_TURN_CREDENTIAL=<credencial do fornecedor>
```

A app já lê estas variáveis; a partir daí o aviso «a imagem não atravessa a rede»
desaparece e as chamadas funcionam entre quaisquer redes.

**Nota de honestidade sobre o ensaio:** as duas pontas do Playwright correm na mesma
máquina, portanto a imagem que se vê nas capturas é a do dispositivo de teste do
Chromium (o padrão verde), não rostos reais. O que se mede — ligação estabelecida,
faixas `live`, `videoWidth > 0`, áudio activo, ecrã grande com cor e imagem — é real.
A validação do caminho através de redes móveis reais exige o TURN acima.

## 6. Como repetir

```bash
node scripts/test_videochamada_2contas_playwright.cjs --voltas=4
node scripts/test_videochamada_2contas_playwright.cjs --voltas=1   # mais rápido
```

Capturas de cada volta em `test-artifacts/video-prova-*.png`.

A base de dados ficou no estado de referência: mensagens `41`, ocorrências `[186, 212]`,
resíduos de prova `0`, tabela de sinalização `0` linhas.
