# Registo facial — comparador, medição, consentimento e sincronização

Data: 2026-11-15 · Commits: `1bb5c9a` (consentimento + sincronização), `fea760e` (correção da rota)

A tarefa tinha três partes, por esta ordem: **trocar o comparador → medir → acertar o
texto e o consentimento**. O resultado foi diferente do previsto na primeira parte, e
é importante dizê-lo com clareza.

---

## 1. Comparador — testado, medido, NÃO trocado

Escrevi `scripts/bench_face.cjs`, um banco de ensaio que compara algoritmos sobre o
mesmo corpus: mesma pessoa em três luzes × duas câmaras, contra pessoas diferentes.

Testei **quatro** abordagens:

| Versão | Descritor | Distância |
|---|---|---|
| v1 (em produção) | 32×32 cinza equalizado + Sobel | média absoluta |
| v2 | 24×24 histograma + pooling 12×12 + Sobel, z-score | cosseno |
| v3 | DCT 8×8 AC (4 blocos) | cosseno |
| v4 | LBP uniforme 8,1 em grelha 3×3 | L1 de histogramas |

Resultado no corpus sintético:

| | pior caso mesma pessoa | melhor impostor | separável |
|---|---|---|---|
| v1 | 18,2 | 6,1 | **não** |
| v2 | 99,7 | 16,3 | **não** |
| v3 | 137,3 | 45,2 | **não** |
| v4 | 151,4 | 16,2 | **não** |

**Nenhum separa.** Os limiares que teria de usar deixam passar impostores ou recusam
a própria pessoa. O corpus sintético é insuficiente para decidir (os meus rostos
gerados não têm textura de pele, e é a textura que distingue), mas é suficiente para
uma conclusão: **não tenho dados que justifiquem trocar o comparador em produção.**

Por isso **reverti o v2** que tinha escrito (`git checkout` em `faceAuth.ts`, `App.tsx`,
`FacialLoginSettings.tsx`). Fica registado — alterar o comparador às cegas, com um
limiar inventado, teria degradado um sistema que hoje acerta pelo menos parte das vezes.

**O que falta para decidir:** correr o banco de ensaio com fotos reais.

```
node scripts/bench_face.cjs pasta-com-fotos-suas/
```

Cada ficheiro é um rosto; o script aplica as cinco variações de luz e câmara que
aquele utilizador vive e diz, para cada algoritmo, o limiar e as taxas de erro.
Com 5–10 fotos suas em luzes diferentes, a decisão passa a ser medida e não opinião.

---

## 2. Consentimento — resolvido

O ecrã afirmava, em absoluto, que o registo «não é enviado para a internet». Isso
deixou de ser aceitável assim que existe sincronização, e era falso como promessa
quando o registo se perdia com o navegador.

Agora existe um cartão de consentimento explícito (página Conta → Login Facial):

| Opção | O que acontece |
|---|---|
| **Por omissão — «só neste navegador»** | nada sai do dispositivo; o texto diz que o registo se perde se limpar os dados |
| **«Autorizar e sincronizar»** | o descritor sobe para a plataforma e fica disponível em qualquer navegador |
| **«Retirar autorização»** | apaga o descritor da plataforma e volta ao modo local |

A frase do estado do registo passou a ser condicional: «Só neste navegador — não é
enviado para a internet» **ou** «Neste dispositivo e na plataforma (autorizou abaixo)».
Nunca mais uma promessa absoluta que o código desmente.

## 3. Sincronização — implementada e provada

| Peça | Onde |
|---|---|
| Tabela `face_templates` | Supabase — **RLS ligado, zero políticas**; `anon`/`authenticated` sem acesso |
| Rota | `POST /api/face-template` (`api/index.ts` + `server.ts`), acções `ler` / `gravar` / `apagar` |
| Autorização | só a **identidade do próprio token** (B.I. do `app_metadata` para cidadão, Nº de agente para instituição/administração) |
| O que se guarda | o **vetor matemático**, nunca a fotografia |
| Login facial | consulta a plataforma quando o navegador não tem cópia local |

### Prova — `scripts/provar_face_sincronizacao_playwright.cjs` → **APROVADO**

```
A: cidadão entra · cartão de consentimento existe · texto diz «por omissão, só neste navegador»
A: registo local criado · autorização → "Registo sincronizado com a plataforma"
BASE: existe 1 registo para o B.I. · papel 'user' · guarda o vetor, NÃO a fotografia
B (browser novo): 0 registos locais · sessão activa · plataforma devolve o descritor (2048 valores)
B2: página Conta mostra «registo na plataforma» · reconhecido nesta máquina
ISOLAMENTO: instituição NÃO recebe o registo do cidadão · rota sem sessão → HTTP 401
RETIRAR: registo apagado da plataforma (0 linhas)
LIMPEZA: sem registos de teste na base
```

---

## 4. Limite honesto que continua de pé

O registo na plataforma **exige sessão autenticada** para ser consultado — é o que
impede uma conta de ler o rosto de outra. Consequência: no ecrã de login facial do
*cidadão*, sem sessão de nuvem prévia, a plataforma não é consultável. O cenário
«browser novo, quero entrar só com o rosto» continua a não ser possível; o que passou
a ser possível é **entrar com a senha nesse browser e ter o rosto disponível a partir
daí** — o registo já não se perde.

Para fechar esse último passo seria preciso um endpoint público de *identificação*
(«dado este rosto, quem é?»), que é uma decisão de segurança e não de código: expõe
metadados de contas a pedidos não autenticados e permite sondar o sistema. Não o fiz
sem a sua autorização explícita.
