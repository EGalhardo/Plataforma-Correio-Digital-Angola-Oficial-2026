# «new row violates row-level security policy for table "sondagens"» — causa e prova

**Data:** 2026-11-17 · **Deploy:** `5ebb77b` + `5b231b7` (READY) · `correio-digital-angola-oficial.vercel.app`

---

## O que se viu

Ao criar um **inquérito normal** (compositor → `Criar Inquérito` → `Inquérito
Normal` → `CRIAR SONDAGEM`), a operação falhava com:

> **new row violates row-level security policy for table "sondagens"**

## Causa raiz (duas, em série)

1. **A tabela `sondagens` tinha RLS ligada e ZERO políticas.** Qualquer INSERT
   directo do cliente era recusado com o código `42501` — exactamente a
   mensagem reportada. Era literalmente impossível criar uma sondagem.
2. **O caminho canónico de escrita da aplicação nem sequer cobria esta tabela.**
   As escritas reais passam pelo proxy `/api/dados` (service role, com
   titularidade injectada a partir do token), mas `sondagens` e
   `sondagem_respostas` **não estavam declaradas** no mapa do proxy. O serviço
   de sondagens, por sua vez, ainda tentava o INSERT directo, que morria na RLS.

## Correções

### Base de dados — políticas reais (defesa em profundidade)

`public.sondagens`:

| Política | Efeito |
|---|---|
| `sondagens_leitura_activas` (SELECT) | leitura para autenticados: sondagens já lançadas; **rascunhos só para a instituição dona** |
| `sondagens_instituicao_escreve` (INSERT) | só a instituição dona (ou admin) cria, comparando o `instituicao_code` com o token |
| `sondagens_instituicao_actualiza` (UPDATE) | mesma titularidade, com `USING`/`WITH CHECK` |

`public.sondagem_respostas`: cada cidadão só escreve/lê as **suas** respostas
(`cidadao_bi` = BI do token); instituição e admin podem ler.

### Servidor — proxy `/api/dados`

`sondagens` e `sondagem_respostas` passaram a ser tabelas conhecidas pelo proxy,
com colunas declaradas e **titularidade injectada**:

- a instituição só cria/edita as suas (`instituicao_code` vem do token, nunca do
  cliente);
- o cidadão nunca cria sondagens e as respostas ficam presas ao seu BI;
- admin mantém acesso total.

### Cliente — `sondagemService`

`criarRascunhoSondagem`, `responderSondagem`, `encerrarSondagem` e
`eliminarSondagem` passaram a escrever pelo proxy, mantendo o insert directo
apenas como recurso de último uso (modo sem proxy), onde o erro real é devolvido
por inteiro em vez de desaparecer.

### Interface — o cartão que faltava

O cartão de resposta (`SondagemResponderCard`) só existia nas vistas
secundárias («Ver detalhes» / conteúdo completo). Na **vista principal** o
cidadão via a mensagem, mas o «Responder» pedia escolhas que não tinha onde
fazer — o modal dizia «Sem escolha». O cartão passou a ser renderizado no topo
da vista principal.

## Prova (Playwright, contas reais)

`node scripts/provar_sondagem_playwright.cjs`

```
1. INSTITUIÇÃO cria «PROVA SONDAGEM …»
   RLS bloqueou? ✓ não
   na base: id 228 · AGT-LMM · rascunho
2. INSTITUIÇÃO envia a mensagem     → 002399714LA030 ← sondagem_ids [228]
3. CIDADÃO abre e responde          → cartão visível ✓
                                      voto na base: [{"cidadao_bi":"002399714LA030","escolhas":["A"]}]
4. RASCUNHO                         → cidadão vê rascunho alheio? ✓ não
5. LIMPEZA                          → 0 sondagens e 0 mensagens de prova
RESULTADO: APROVADO
```

Capturas: `test-artifacts/sondagem-prova-1-criada.png` (compositor com o cartão
do inquérito), `-2-cidadao.png` (cartão na vista principal), `-3-voto.png`
(«RESPOSTA REGISTADA — PARTICIPAÇÃO CONFIRMADA»).

## Limpeza

As sondagens de teste criadas durante a investigação (`PROVA CICLO …`,
`TESTE-INTEROP …`) foram removidas com as respostas associadas. Ficaram apenas
as sondagens que já existiam antes (ids 213, 214, 215, 218).
