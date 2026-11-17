# Correio cidadão ↔ instituição — causa raiz, correção e prova

**Data:** 2026-11-17 · **Produção:** commit `42506dc` (READY) · `correio-digital-angola-oficial.vercel.app`

---

## O que o dono relatou

Enviei «OI» da conta **Edlasio** (`002399714LA030`) para a **AGT-LMM-01**. Na conta da AGT respondi «OI». Voltei a entrar como Edlasio e **nem a mensagem enviada nem a resposta aparecem**.

## Causa raiz (provada na base de dados)

`resolverDestinatarioResposta`, em `src/App.tsx`, comparava o remetente da mensagem com a chave da sessão **por texto exacto**:

- na instituição, a sessão é o login do agente — `AGT-LMM-01`;
- as linhas de correspondência guardam o **código-base** — `AGT-LMM`;
- `'AGT-LMM' === 'AGT-LMM-01'` → **falso**, logo a mensagem era classificada como «recebida»;
- o destinatário da resposta saía como o **próprio remetente** → nasceram as linhas `AGT-LMM → AGT-LMM` (`13:27 OI`, `13:28 RE: OI`).

Resultado: uma **caixa morta**. Ninguém a podia responder (o destinatário era o remetente) e o cidadão nunca recebia a resposta. A mensagem do cidadão aparecia-lhe apenas porque o «enviado» ficou na caixa ENVIADAS — a resposta é que se perdia.

## Correções

1. **`chaveCaixaNormalizada()` + `resolverDestinatarioResposta` reescritos** — o sufixo `-01` de código institucional deixa de contar; se a mensagem foi enviada por mim e o destinatário original não é a minha chave, devolve o destinatário original; BIs ficam intactos.
2. **Guarda anti auto-envio em `executeOfficialSend`** — enviar para a própria conta é recusado com aviso e registo de auditoria; nada é gravado.
3. **«Responder» a uma mensagem enviada pela própria conta** abre o compositor **vazio** (em vez de o endereçar a si mesmo) e explica porquê, com um aviso no topo do formulário: *«Esta mensagem foi enviada pela sua própria conta e não tem destinatário registado a quem responder. Indique abaixo o cidadão ou a instituição a quem quer responder.»*

## Prova com as duas contas reais (Playwright, produção)

`node scripts/test_correio_ida_e_resposta_playwright.cjs`

```
1. CIDADÃO envia «OI»     base: 002399714LA030 → AGT-LMM ✓
2. INSTITUIÇÃO            mensagem visível na caixa: ✓
                          destinatário da resposta: "002399714LA030" ✓
                          base: AGT-LMM → 002399714LA030 ✓
                          endereçadas a si próprio: 0 ✓
3. CIDADÃO volta a entrar resposta visível na entrada: ✓
                          enviada visível em ENVIADAS: ✓
RESULTADO: APROVADO
```

- **Guarda no cidadão:** aviso *«ATENÇÃO: O destinatário indicado é a própria conta remetente»* e **0 registos** gravados.
- **Guarda na instituição:** responder à antiga auto-enviada deixa o destinatário vazio e mostra a explicação.
- **Não-regressão da vídeo-chamada:** `test_videochamada_2contas_playwright.cjs` → imagem do interlocutor nos dois ecrãs em **3/3** voltas, `RESULTADO: APROVADO`.

## Nota honesta sobre o passa-a-passa

O envio só se conclui depois de três confirmações: **modalidade de envio → «Enviar mesmo assim» → «Enviar Correspondência»**. Um teste que clique apenas em «Enviar Mensagem» não grava nada e dá a falsa impressão de defeito — foi o que aconteceu na primeira execução desta prova. O botão final escreve-se **«Enviar Correspondência»** e é ele que grava.

## Pendente, fora do âmbito desta correção

- **TURN continua por configurar** (`turnConfigurado: false`): a vídeo-chamada funciona com STUN em redes simples, mas pode falhar atrás de NAT simétrico.
