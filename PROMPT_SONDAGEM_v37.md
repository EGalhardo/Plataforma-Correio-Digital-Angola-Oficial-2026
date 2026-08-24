# PROMPT MELHORADO — FUNCIONALIDADE «SONDAGEM» (v37 — Composição + Segmentação Inteligente)
### Correio Digital Angola · pronto a implementar · 2026-08-24
### Evolução da v36.1: sondagem como bloco de conteúdo da mensagem + distribuição automática por âmbito

És um programador especialista do projecto **Correio Digital Angola**
(React + Vite + TypeScript, Supabase, Vercel). Implementa as alterações abaixo
**sem quebrar nem danificar nenhum fluxo existente** (as varreduras
`scripts/e2e_paginas.mjs` e `e2e_contas_reais.mjs` devem continuar 100%
verdes), usando apenas os padrões reais do código: popups via `CdaModal` /
`CdaConfirmModal`, auditoria via `addAuditLog`/`audit_logs`, i18n via
`translationService`, gráficos `recharts`, fan-out por `sondagemService.ts`,
RPC `cda_audiencia_sondagem` e migração nova
`supabase/v37_sondagens_segmentacao.sql` (aplicada pelo dono no SQL Editor).
Tudo o que abaixo se descreve é **aditivo** excepto onde marcado [SUBSTITUI].

---

## 0 · ESTADO ACTUAL (não inventar; partir daqui)

- Tabelas `sondagens` e `sondagem_respostas` (migração v36 aplicada em produção).
- `sondagens.abrangencia` hoje é `'nacional' | 'local'`, **inferida por heurística**
  (`RE_NACIONAL` + lista de códigos em `sondagemService.ts`) — não é persistida
  como classificação oficial da instituição.
- O popup `SondagemModal.tsx` cria **e envia imediatamente** (botão «Enviar
  Sondagem»): grava a sondagem, calcula a audiência via RPC e faz fan-out de
  mensagens com `messages.sondagem_id` (1 sondagem por mensagem).
- O cidadão responde no detalhe da mensagem via `SondagemResponderCard`
  (montado quando `selectedMessage.sondagem_id` existe).
- `profiles` tem as colunas: `id, bi, name, phone, nif, passport, birth_date,
  filiation, marital_status, role, email, morada` — **não existe província**.

---

## 1 · COMPOSITOR: «CRIAR SONDAGEM» INSERE NA ÁREA DE CONTEÚDO [SUBSTITUI §1.4 v36]

1.1. No popup «Criar Sondagem» (aberto por `#btn-criar-sondagem` no compositor
de «Nova Mensagem», área Instituição), o botão final **«Enviar Sondagem» passa
a chamar-se «Criar Sondagem»**.

1.2. [SUBSTITUI] Clicar em «Criar Sondagem» **já não envia nada**. Validações
mantidas (pergunta ≤ 280, ≥ 2 opções ≤ 120 cada, sem duplicadas; popup
*«Na sua sondagem está a faltar preencher alguns campos.»* quando incompleto).
Com validação OK, o popup fecha e a sondagem é **inserida como bloco na área de
conteúdo da mensagem em composição**: um cartão compacto (pergunta + opções A/B/…
+ interruptor de várias respostas + linha de âmbito calculada + botão de remover
com `CdaConfirmModal`).

1.3. É possível **adicionar várias sondagens à mesma mensagem**: o botão
«Criar Sondagem» permanece activo enquanto o compositor estiver aberto; cada
sondagem criada é mais um bloco de conteúdo. Limite: **5 sondagens por mensagem**
(mensagem clara ao tentar exceder).

1.4. As sondagens em composição são guardadas na BD com
`sondagens.status = 'rascunho'` (novo valor) imediatamente ao «Criar Sondagem»,
associadas à instituição (`instituicao_codigo` já existente). Remover o bloco no
compositor elimina o rascunho (com confirmação `CdaConfirmModal`). Descartar a
mensagem inteira elimina todos os rascunhos dessa composição.

1.5. O envio passa a ser feito pelo botão existente **«Enviar Mensagem
Oficial»**: nesse momento o sistema (a) passa os rascunhos a `ativa`, (b) faz o
fan-out **uma única vez por cidadão destinatário** com todas as sondagens da
mensagem embutidas (ver §4), (c) regista a auditoria (§6). Se a mensagem ficar
sem texto **e** sem sondagens, mantém-se a validação actual de envio.

1.6. No detalhe do cidadão, o `MessageDetail` mostra **um cartão de resposta por
sondagem embutida** (reutilizar `SondagemResponderCard`, repetido por cada id),
no fim da Assistência do Documento — comportamento actual mantém-se para
mensagens antigas com `sondagem_id` único.

---

## 2 · CLASSIFICAÇÃO OFICIAL DA INSTITUIÇÃO (NACIONAL / REGIONAL / LOCAL)

2.1. Migração v37 adiciona `profiles.abrangencia text` (valores: `nacional`,
`regional`, `local`; NULL = não classificado) e `profiles.provincia text`
(NULL permitido). `provincia` deve ser tentada preencher por *backfill* a
partir de `morada` (correspondência simples por nomes das 18 províncias de
Angola, sem inventar quando não for detectável).

2.2. **Classificação automática inicial** (reutilizar e persistir a heurística
existente): ao carregar/criar o perfil institucional, se `abrangencia` estiver
NULL, o sistema sugere com `abrangenciaSugerida()` actual e grava. Órgãos da
lista nacional (Presidência, Ministérios, INE, INAPEM, etc.) ficam
`nacional`; conservatórias, administrações municipais/comunais e serviços
locais ficam `local`; `regional` só por definição administrativa (2.3).

2.3. Na área **Admin/Gov** (página Instituições — `GovInteroperabilidadeContent`),
cada instituição mostra a sua classificação e o administrador pode alterá-la
(`CdaModal` de selecção NACIONAL/REGIONAL/LOCAL + província quando REGIONAL),
com auditoria. Instituições não classificadas e sem heurística possível ficam
`local` por defeito (princípio da menor jurisdição) — nunca `nacional`.

2.4. O sistema **valida a classificação antes de criar/enviar** qualquer
sondagem: classificação ausente/corrompida ⇒ popup honesto e nada é criado.

---

## 3 · REGRAS DE DISTRIBUIÇÃO POR ÂMBITO

3.1. **NACIONAL** → 100% dos cidadãos registados na plataforma
(`profiles.role = 'user'`), independentemente de província, município,
residência ou instituição local associada.

3.2. **REGIONAL** → cidadãos cujo `profiles.provincia` corresponda à província
da instituição. Cidadãos sem província conhecida são **excluídos** e a linha de
âmbito mostra aviso honesto: *«N cidadãos sem província registada não serão
abrangidos.»* Se a instituição for REGIONAL sem província definida, o envio é
bloqueado com popup a pedir a classificação correcta (não silenciar).

3.3. **LOCAL** → exclusivamente cidadãos com relação pré-existente com a
instituição (comportamento actual do RPC `cda_audiencia_sondagem`: pedidos,
documentos ou correspondência). Audiência vazia ⇒ popup honesto, nada é criado
(regra v36 mantida).

3.4. A **linha de âmbito/audiência** no popup e nos blocos de conteúdo mostra
sempre o número real calculado (ex.: *«Âmbito: Nacional — 23 cidadãos»*,
*«Âmbito: Local — 4 cidadãos desta instituição»*) calculado por RPC com
`count` — nunca estimativas.

3.5. RPC actualizado `cda_audiencia_sondagem(p_code)` devolve também a
classificação usada e a lista de BI deduplicada; nova variante/parâmetro para
REGIONAL por província. `security definer` + `STABLE` mantidos.

---

## 4 · MODELO DE DADOS E ENVIO (MIGRAÇÃO v37)

4.1. `messages.sondagem_ids bigint[]` (nova coluna, NULL por defeito) para
mensagens com várias sondagens. **Manter `messages.sondagem_id`** para
compatibilidade com as mensagens antigas; o código lê `sondagem_ids` se
presente, senão `sondagem_id`.

4.2. Fan-out no envio (§1.5): audiência calculada **uma vez** pela classificação
da instituição; mensagens criadas em lotes (padrão actual de 25) com
`sondagem_ids` preenchido; **deduplicação garantida** (audiência é um conjunto
de BI únicos — nunca duas mensagens da mesma sondagem ao mesmo cidadão).

4.3. Uma instituição nacional **não pode limitar** o alcance: a UI não mostra
selector de audiência para `nacional` e o backend ignora qualquer tentativa de
filtro (regra de segurança). Instituição local/regional **não consegue** enviar
fora da sua jurisdição: o RPC só devolve a audiência juridicamente válida — a
restrição vive no servidor, não apenas na UI.

4.4. Cada sondagem fica associada à instituição responsável
(`sondagens.instituicao_codigo`, já existente) e à mensagem que a transportou
(registar `sondagens.message_id` ou equivalente por instituição/cidadão, sem
quebrar registos antigos).

4.5. `sondagens.status` passa a aceitar `'rascunho'` além de `'ativa'` e
`'encerrada'`. Rascunhos com mais de 7 dias sem envio são ignorados nas listas
públicas (não apagar automaticamente sem regra de limpeza aprovada).

---

## 5 · SEGURANÇA E INTEGRIDADE (RESUMO EXECUTÁVEL)

- Validação da classificação **antes** de criar (2.4).
- Número de destinatários **calculado automaticamente** por RPC com contagem real (3.4).
- Nacional não limita; local/regional não excede jurisdição (4.3).
- Sem envios duplicados ao mesmo cidadão (4.2).
- Sondagem sempre associada à instituição criadora (4.4).
- RLS e padrões de escrita actuais mantidos (service_role só no servidor/proxy).

---

## 6 · AUDITORIA

Por cada sondagem enviada, registar em `audit_logs` (padrão `addAuditLog` +
persistência actual): **instituição (código e nome), pergunta da sondagem,
âmbito/classificação usada, data/hora e quantidade de cidadãos alcançados**.
A página «Sondagens» da instituição mostra, por sondagem, a contagem real de
destinatários (da auditoria ou da contagem do fan-out).

---

## 7 · LIMITES E INVARIANTES MANTIDOS DA v36.1

Opções ≤ 10 · pergunta ≤ 280 · opção ≤ 120 · 3 sondagens **ativas** por
instituição (rascunhos não contam) · popup honesto quando a migração não está
aplicada (`sondagensDisponiveis()`) · 1 voto por cidadão, re-votável enquanto
ativa · gráficos `recharts` e «Encerrar sondagem» sem alteração.

---

## 8 · MIGRAÇÃO E DEPLOY

8.1. Criar `supabase/v37_sondagens_segmentacao.sql` idempotente (`if not
exists`, `create or replace`), com: novas colunas em `profiles` e `messages`,
novo valor de status documentado, RPC actualizado, índices úteis, comentários.
**O dono aplica no SQL Editor** — o código deve degradar com honestidade se a
migração ainda não estiver aplicada (selo/aviso, sem quebrar).

8.2. Commit + push por cada etapa para o Vercel reimplantar; verificar a
migração por REST após aplicação (tabelas/colunas/RPC com código 200).

---

## 9 · TESTES E CRITÉRIOS DE ACEITAÇÃO

9.1. Varreduras `scripts/e2e_paginas.mjs` (demo) e `e2e_contas_reais.mjs`
(contas reais) mantêm-se 100% verdes.

9.2. E2E funcional novo/actualizado (fora do repositório, `/tmp/...`):
(a) compositor: «Criar Sondagem» insere bloco na área de conteúdo; segundo
bloco adicionável; remoção com confirmação; (b) validação do popup mantida;
(c) envio real **apenas com linhas semeadas cirurgicamente** via service_role
(sondagem de teste + mensagem para 1 cidadão de teste) — **nunca disparar
fan-out nacional real em testes**; (d) cidadão vê os cartões e vota; (e)
instituição vê resultados e contagem de destinatários; (f) Admin altera
classificação com auditoria. **Limpar sempre os dados de teste no fim.**

9.3. Cenários de segurança testados: instituição local não alcança cidadãos sem
relação; classificação ausente bloqueia envio com mensagem honesta; dedupe
confirmada na BD (1 linha de mensagem por cidadão por envio).

---

## 10 · REGRAS DE EXECUÇÃO

- Cirúrgico: mínimo de linhas por ficheiro; nada fora deste prompt.
- Reutilizar arquitectura existente (RPC, fan-out em lotes, CdaModal/CdaConfirm,
  auditoria, i18n); nunca duplicar sistemas paralelos.
- Antes de cada alteração, ler o código real envolvido
  (`sondagemService.ts`, `SondagemModal.tsx`, `MailContent.tsx`,
  `MessageDetail.tsx`, `SondagemResponderCard.tsx`, `SondagensContent.tsx`,
  `supabase/v36_sondagens.sql`, `GovInteroperabilidadeContent.tsx`).
- Mensagens de erro e popups sempre honestos (números reais, sem inventar).
- Não escrever segredos em ficheiros versionados.
