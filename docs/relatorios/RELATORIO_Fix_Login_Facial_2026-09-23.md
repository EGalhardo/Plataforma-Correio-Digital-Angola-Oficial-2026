# Fix — Login Facial (dois bugs do dono) · 2026-09-23

## Bugs reportados
1. **«Quando abro com outra conta e volto, o login facial não funciona»** — com a coerência presa à chave exacta, depois de usar outra conta (ou cair na identidade demo implícita) o rosto era comparado **só contra aquela conta**; as restantes contas com face registada ficavam intransitáveis («Rosto não reconhecido»).
2. **«Entro sem ter mudado de utilizador, faço login facial e não exibe todas as correspondências»** — o restauro da sessão da nuvem no login facial depende do espelho local `citizen_pass_{BI}`; após **recuperação de senha**, o espelho ficava obsoleto (a nuvem com a nova senha, o espelho com a velha) → `cloudSignIn` inválido → sem sessão → F50-bis mantinha conteúdo antigo/semeado → a caixa de correio aparecia **incompleta**.

## Correções aplicadas (cirúrgicas, lint+tsc verdes)
| Ficheiro | Mudança |
|---|---|
| `src/services/faceAuth.ts` | **Nova função pura testável `buildFaceMatchPool`**: a coerência facial usa SEMPRE todas as matrizes do dispositivo; a candidata em memória só fica 1.ª na fila (mesma UX), nunca exclui. |
| `src/App.tsx` | O `handleDemoFaceCapture` consome `buildFaceMatchPool` (eliminada a regra «pool = 1 se a chave exacta existir» — causa do bug 1). |
| `src/components/features/ResetPasswordStepper.tsx` | Após gravar a nova senha na nuvem (PASSWORD_RECOVERY), o B.I. da sessão de recuperação é extraído do e-mail sintético e o **espelho `citizen_pass_{BI}` é actualizado** (causa do bug 2). Segurança: o espelho já vivia no mesmo dispositivo/conta. |

Segurança do Login Facial mantida: a face tem de bater o limiar (26) contra ALGUM registo local; gates F47 (conta eliminada/bloqueada/rejeitada) intactos. Modo demo-100% local inalterado (a face nunca sai do dispositivo).

## Verificação (contas reais, Supabase real, Chromium headless via simulada determinística)
**Teste unitário da função real** (`qa_face_pool_unit.mjs` — `faceAuth.ts` transpilado com esbuild e importado): **7/7**
- pool c/ identidade vazia = todas (n=2); reordenação sem exclusão; pré-fix ficaria preso ao veneno (1) pós-fix passa pelas 2; assinatura simulada determinística (diff 0 na mesma semente; >53 em sementes diferentes); pool multi-área.

**E2E no produto** (`qa_login_facial_fix.mjs`): **14 PASS**
- B1 (bug 1): login senha → registo facial → injecção de «veneno» na chave demo implícita (pior caso real) → hint em tempo real «A comparar o rosto com os **2** registos faciais…» → **face login ENTRA** → **correio = 17/17** (idêntico ao controlo por senha).
- B2 (bug 2): recuperação E2E REAL (generate_link → PASSWORD_RECOVERY → «Gravar nova senha») → **espelho local actualizado** → nuvem aceita nova senha → **login facial seguinte ENTRA com correio completo (17 = BD)** → senha original «(QA_CID_PASS)» **restaurada e verificada** (admin=200, login=200) com guarda dupla de crash-safety.

**Regressão**: `qa_portais_tabs.mjs` pós-fix — **34/34 tabs dos 3 portais verdes, zero erros JS** (149 s).

## Notas de cobertura
- O caminho sem-câmara é 100% determinístico nas duas extremidades (mesma assinatura sintética no registo e na validação) — usado para invalidar a LÓGICA (o caminho do bug).
- O caminho com câmara real usa a mesma pipeline de comparação com limiar 26 + validação multi-frame (3 frames); a distinção entre rostos reais depende da fotografia real — comportamento validado pelo limiar unitariamente (>53 pontos para sementes/rostos distintos).

**Senhas da conta `(QA_BI_A)` repostas («(QA_CID_PASS)») confirmadas ao terminar (login directo 200).** Base central sem qualquer alteração fora da conta de teste de QA — nenhuma linha persistida da rodada.
