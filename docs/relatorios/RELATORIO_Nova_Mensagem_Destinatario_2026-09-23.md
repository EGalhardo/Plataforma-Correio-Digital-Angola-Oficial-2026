# Nova Mensagem — Entrega pelo campo Destinatário (QA completo)

**Data:** 23/09/2026 · **Conta institucional de teste:** INAPEM-LMM-01 · **Cidadãos:** Edlasio Galhardo (002399714LA030), Mario Quiuma (005404692BO043)

## 1. O problema encontrado (análise)

O **«Nova Mensagem»** entregava correctamente para *um* B.I., mas havia duas entregas erradas:

| Campo Destinatário | O que acontecia ANTES | Consequência |
|---|---|---|
| `Todos` (texto simples) | Gravava **uma linha partilhada** `recipient_bi = 'TODOS'`, que a regra antiga (v37.31) mostra a **TODO o cidadão registado** | Cidadãos que **nunca** contactaram a instituição recebiam a carta — **fuga de alcance** |
| `Todos` digitado por *cidadão* | Seguia o mesmo caminho e difundia para todos | Sem qualquer controlo |

## 2. A correcção aplicada (3 ficheiros)

O campo Destinatário comanda SEMPRE a entrega real:

1. **`src/App.tsx` — novo ramo de difusão «Todos»** em `executeOfficialSend`:
   - *Instituição* envia para `Todos` → calcula primeiro os **cidadãos que já trocaram contacto com esta instituição** (a mesma regra oficial das sondagens: pedidos + correspondência trocada, RPC `cda_audiencia_sondagem`) e envia **uma cópia individual com protocolo + notificação a cada um**. A linha partilhada `'TODOS'` **nunca mais é gravada**.
   - Se não houver contactos prévios → **nada é enviado** e o utilizador é avisado (avisada «Indique o(s) B.I.»).
   - *Cidadão* tenta enviar para `Todos` → **bloqueado** com aviso honesto («difusão é prerrogativa de instituição oficial») e registo de auditoria.
2. **`src/services/supabaseService.ts`** — novo `listarCidadaosComContacto(codigo)`: devolve a lista exacta de B.I.; em falha de consulta devolve erro e **não se envia nada** (nunca difundir aos errados).
3. **`src/components/features/MailContent.tsx`** — quando o destinatário é `Todos`, já não aparece o cartão âmbar «cidadão não registado» (era enganador para um canal de difusão).

Validação de tipos (`npm run lint` / tsc): **0 erros**.

## 3. Teste E2E (contas reais, navegador + base de dados)

Teste automático com 3 sessões em simultâneo (instituição + 2 cidadãos), marcadores únicos por envio e verificação **dentro da caixa do cidadão** + na **base de dados oficial**:

### AC1 — enviar para o B.I. do Edlasio
| Verificação | Resultado |
|---|---|
| Envio confirmado na interface da instituição | Passa |
| Base de dados: **exactamente 1 linha**, destinatário = `002399714LA030` | Passa |
| Chega à caixa do Edlasio (não lida) | Passa (em ~8 s) |
| Caixa do Mario **NÃO** recebe cópia | Passa |

### AC2 — enviar para o B.I. do Mario
| Verificação | Resultado |
|---|---|
| Envio confirmado + **exactamente 1 linha** para `005404692BO043` | Passa |
| Chega à caixa do Mario | Passa |
| Caixa do Edlasio **NÃO** recebe cópia | Passa |

### AC3 — enviar para «Todos»
O universo oficial calculado = **4 cidadãos** com contacto prévio com INAPEM-LMM (os 2 de teste + 2 contas de QA com histórico).
| Verificação | Resultado |
|---|---|
| Difusão confirmada («Correspondência distribuída a 4 cidadão(s)») | Passa |
| Base de dados: destinatários = **EXACTAMENTE** os 4 do universo | Passa |
| **Zero** linhas partilhadas `recipient_bi='TODOS'` | Passa (fuga eliminada) |
| Edlasio e Mario recebem na caixa | Passa |
| **1 notificação por cidadão** do universo («Nova Correspondência Oficial»), não lidas | Passa |

### Comportamento do botão «Adicionar destinatário» (já existente — confirmado na análise)
Uma lista de vários B.I. gera **uma cópia selada por destinatário**, sem duplicados (a lista é deduplicada por construção).

## 4. Observação (não bloqueante)

O **cartão verde** «destinatário verificado» no compositor não chegou a confirmar o B.I. durante os testes (a consulta do destinatário fica lenta). Isto **não impede nem afecta a entrega** — as 5 verificações de entrega acima são provas reais. Ponto aberto para ronda futura de UX, se quiser.

## 5. Estado

- Código corrigido e testado em **local** ligado à mesma nuvem oficial de produção.
- **Ainda não subiu** ao GitHub/Vercel — à espera da sua autorização de commit (3 ficheiros: `App.tsx`, `supabaseService.ts`, `MailContent.tsx`).

## 6. Como reproduzir (QA script)

```
node --env-file=.env --env-file=.env.local scripts/e2e_nova_mensagem_destinatario.mjs
```

Com credenciais definidas via variáveis de ambiente: `QA_INST`, `QA_INST_PASS`, `QA_INST_ORG`, `QA_BI_A`, `QA_BI_B`, `QA_CID_PASS`, `BASE` (nunca gravadas no repositório). Resultado desta ronda: **13/13 verificações verdes** (23/09/2026, contas reais, commit `29c326d`).
