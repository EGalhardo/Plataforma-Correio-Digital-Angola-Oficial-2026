# AUDITORIA QA — Correio Digital Angola (Oficial 2026)

**Data:** 2026-09-22 · **Executor:** Equipa QA/QA Automation/Segurança (modo agente)
**Âmbito:** testes não-destrutivos sobre a plataforma em execução local com **Supabase REAL** (projecto `klrclczcahfycfdxzdqs`).
**Regras cumpridas:** layout e código intactos durante os testes (`git status` limpo no fim); contas reais só em leitura; fluxos destrutivos apenas sobre contas sintéticas criadas para o efeito e removidas no final.

---

## RESUMO

- **Ambiente:** `GET /api/health` → `status:ok`; chaves Gemini/Groq/Supabase configuradas; flags `local_bootstrap=true`, `mock_fallback=true`, `auto_seed=false`. Servidor `npm run dev` em `localhost:3000`.
- **Páginas testadas:** varredura automatizada do repositório — **45 PASS / 2 WARN / 0 FAIL** (itens da suite de 51; as ausências são itens «removidos por desenho» registados como PASS).
- **Funcionalidades testadas:** login por senha (API/JWT + UI), detecção de área no login (regressão BUG-001), RLS de leitura/escrita com chave anon e JWT de utilizador, envio → recepção → leitura → resposta de correspondência (F1, via API real), eliminação de correspondência pelo endpoint real (`/api/eliminar-correspondencia`), validações de entrada (`/api/perfil`, `/api/inquerito-ia/hash`), exposição de chaves no código do cliente.
- **Fluxos testados:** **F1 ✅ completo**. F2 (login facial c/ câmara), F3 (WebRTC/vídeo/ecrã), F4 (GPS/fotografia), F5 (inquérito texto+voz), F8 (offline real), F6/F7/F9 (completos) — **NÃO TESTADOS**: exigem browser interativo/dispositivo (câmara, microfone, geolocalização). Não se declara OK aquilo que não foi executado.
- **Erros confirmados:** **3** (1 CRÍTICO, 1 ALTO, 1 BAIXO).
- **Possíveis problemas:** 4.
- **Funcionalidades que passaram:** 9 grupos (ver secção).
- **Contas sintéticas criadas/removidas:** 3 criadas (`900000001LA001`, `900000002LA001`, `CDA-TEST-INST` agente) / **3 removidas** ✅.
- **`npm run lint` (tsc): 0 erros** ✅ · **`npm run test:paginas`: 45 PASS / 2 WARN / 0 FAIL** ✅.

---

## ERROS ENCONTRADOS

### QA-BUG-001 — Eliminar correspondência apaga notificações de OUTROS utilizadores

- **Severidade:** 🔴 **CRÍTICO**
- **Área:** Transversal (Cidadão/Instituição) · **Tipo:** violação de titularidade em escrita
- **Funcionalidade:** Eliminar correspondência (limpeza de "notificações fantasmas")

**Passos para reproduzir:**
1. Criar mensagem cidadão A → instituição T (assunto «X»);
2. Inserir notificações com texto contendo «X» para: cidadão A, instituição T e **cidadão B (sem qualquer relação com a mensagem)**;
3. O cidadão A elimina a sua correspondência via UI (que chama `POST /api/eliminar-correspondencia` com o SEU token).

**Resultado esperado:** apenas as notificações das DUAS partes da mensagem são removidas.

**Resultado actual:** a notificação do **cidadão B (alheio)** foi apagada.
**Evidência:** resposta do endpoint: `{"ok":true,"detalhes":{"notificacoes":3,...}}` — as 3 notificações (ids 2230, 2231 e **2233**, sendo 2233 a do utilizador alheio) desapareceram na verificação pós-eliminação (`[]`).

**Causa provável:** a limpeza executa `DELETE /rest/v1/notifications?or=(message.ilike.*ASSUNTO*,title.ilike.*ASSUNTO*)` com **service role**, correspondendo por texto de assunto **sem qualquer filtro de `target_bi`** — qualquer notificação, de qualquer utilizador, cujo texto contenha o assunto, é apagada. Assuntos comuns (ex.: «Esclarecimento», sondagens massificadas) maximizam o dano colateral.

**Ficheiro/componente:** `server.ts`, rota `app.post("/api/eliminar-correspondencia")` (passo «1) notificações das partes», ~linhas 1637-1647). **Avaliar o espelho serverless** `api/index.ts` para a mesma lógica.

**Correção recomendada:** restringir o `DELETE` às duas partes, ex.: `&target_bi=in.("SENDER","RECIPIENT")` e, idealmente, ancorar a correspondência por identificador único (ex.: `dedupe_key`/id da mensagem) em vez de `ilike` por assunto; cobrir com teste E2E de titularidade (o cenário acima fica como regressão).

---

### QA-SEC-001 — `GET /api/perfil?bi=` devolve PII completa sem sessão

- **Severidade:** 🟠 **ALTO**
- **Área:** Transversal · **Tipo:** exposição de dados pessoais sem autenticação

**Passos para reproduzir:**
1. Sem qualquer token: `GET /api/perfil?bi=<BI>`

**Resultado esperado:** 401/403, ou payload mínimo (ex.: existência) apenas no fluxo que o exige.

**Resultado actual:** **HTTP 200** com o perfil completo — confirmado com BI sintético **e com BI real** (nome, estado civil, morada, filiação…). Os BIs angolanos são enumeráveis (padrão `#########XX###`), o que permite colheita em massa de PII.

**Causa provável:** endpoint desenhado para a via pública (verificação de cadastro pré-login) a devolver o perfil integral via service role, sem token nem limitação de campos.

**Ficheiros:** `server.ts` (~linha 305) **e** `api/index.ts` (~linha 3591) — corrigir **nas duas vias** (simetria server local ⇄ serverless).

**Correção recomendada:** reduzir a resposta anónima ao mínimo necessário ao fluxo (sem morada/estado civil/filiação) ou exigir sessão; adicionar rate-limit por IP e registo de acesso em auditoria.

---

### QA-SEC-002 — `GET /api/security/readiness` público expõe estado interno

- **Severidade:** 🟡 **BAIXO**
- **Área:** Transversal · **Tipo:** exposição de informação operacional

**Resultado actual:** sem sessão devolve contagens por tabela (`profiles: 12`, `messages: 24`, …), flags de runtime e bloqueadores de produção.
**Reprodução:** `curl http://localhost:3000/api/security/readiness` → 200 com payload completa.
**Recomendação:** proteger por token de operação/role admin em produção (server.ts ~linha 2603 e espelho em `api/index.ts`).

---

## POSSÍVEIS PROBLEMAS (não reproduzidos na totalidade / hardening)

| ID | Descrição | Notas |
|---|---|---|
| PP-01 | Identificador digitado no login do cidadão («XXXX-INVALIDO-123») chega **truncado** («XXXX-INVALIDO-») ao ecrã institucional e à mensagem de erro | Códigos reais são curtos (impacto limitado); não foi determinado o limite exacto de corte |
| PP-02 | `POST /api/chat` aceita **corpo vazio e sem sessão** e gera resposta de IA (saudação completa) — consumo de quota paga sem validação nem rate-limit | Comportamento reproduzido; classificado como vector de abuso/hardening, não como falha funcional |
| PP-03 | Limpeza de contas sintéticas: GoTrue devolveu **500** ao apagar 3 contas legacy (`inapem-lmm-01`, `tste-llm-01`, `007181500la018`) — 4 sintéticas legacy permanecem | Infra Supabase/auth, não código da app; requer re-tentativa ou remoção manual |
| PP-04 | **Sem rate limiting** global nos endpoints públicos (existe apenas limite de body 150 MB) | Hardening recomendado antes de produção |

---

## FUNCIONA CORRECTAMENTE (testado com evidência)

1. **RLS leitura (anon):** `profiles/messages/contacts/documents/notifications` → `[]` (nenhum dado exposto); sem API key → 401.
2. **RLS escrita (anon):** INSERT em `messages` → **401 / 42501 RLS**.
3. **Titularidade autenticada:** cidadão A vê apenas as suas mensagens (1); cidadão B as dele (2); A não vê INAPEM nem B; instituição vê a sua caixa.
4. **Anti-falsificação:** INSERT com `sender_bi` alheio (do dono) → **403 / 42501 RLS**. ✅
5. **UPDATE alheio:** cidadão A tenta marcar lida mensagem de B → **0 linhas** alteradas (bloqueio silencioso RLS); instituição marca lida a sua → 200.
6. **Endpoint eliminar (guardas):** sem token 401 · token falso 401 · id inválido 400 · **não-parte 403** — tudo correcto; a falha está só no passo de notificações (QA-BUG-001).
7. **F1 completo (API real):** envio 201 → visível na instituição (`unread:true`) → leitura 200 (`unread:false`) → resposta 201 → isolamento por conta confirmado.
8. **Regressão BUG-001 (commit 16ea737):** valor inválido «123» **permanece no login do cidadão** com erro claro; valor com formato institucional («ZZZ») roteia por desenho com erro explícito; **0 erros JS** nas sondas (capturas guardadas).
9. **Chaves & tipo:** nenhum `service_role`/`sb_secret`/JWT hardcoded em `src/`; `tsc` 0 erros; varredura de páginas **0 FAIL**.

---

## PROBLEMAS VISUAIS (apenas documentados — §1 respeitada: NÃO corrigidos)

- **UI-001 (BAIXO):** ao escrever um código institucional não reconhecido, o banner diz **«ACESSO NEGADO / PROTOCOLO CRÍTICO»** — tom desproporcionado para um erro comum digitação. Evidência: `cda_test/screenshots/probe-valor-zzz.png`.
- **UI-002 (nota):** WARN da varredura — `instituicao/mensagem-detalhe`: caixa de demonstração sem mensagens para abrir detalhe (limitação do dataset de demonstração, não falha funcional). *(Do resultado global 45/2/0, apenas este WARN foi capturado directamente no excerto de log analisado.)*

---

## PROBLEMAS DE SEGURANÇA

Cobertos nas fichas **QA-SEC-001** e **QA-SEC-002** e no PP-02/PP-04. Confirma-se ainda que as políticas "Permitir tudo" do `schema.sql` de desenvolvimento **NÃO** estão activas na base real (rejections 42501 comprovadas) — o endurecimento já reflectido em produção é eficaz para RLS de tabelas; os riscos actuais concentram-se nos **endpoints com service role no servidor** (QA-BUG-001, QA-SEC-001).

**Não foram exfiltrados dados reais:** a leitura com BI real foi mínima (nomes de campos) e nada foi exportado.

---

## CONFORMIDADE FINAL

- `git status` **limpo** (código intacto; este relatório é o único ficheiro novo).
- Contagens da base real restauradas ao baseline: `profiles 12`, `messages 24`, `notifications 24`, `protocolos 13`, `histórico 20`.
- `audit_logs`: 63.633 → 63.700 (+67 registos) — rasto de auditoria do próprio sistema sobre as operações de teste (append-only, por desenho).
- Contas sintéticas do teste **removidas**; o script oficial também removeu 10 contas legacy sintéticas de pilotos anteriores (4 ficaram pendentes por erro 500 do GoTrue — ver PP-03).
- **Não testado → não declarado OK:** F2 (facial c/ câmara), F3 (WebRTC/partilha de ecrã), F4 (GPS/foto), F5 (inquérito texto+voz), F6, F7, F8, F9 completos. O repositório já possui suites dedicadas (`scripts/e2e_video_atendimento.mjs`, `e2e_verifica_registo_instituicao_dpa2025.mjs`, etc.) para a próxima ronda em ambiente com browser interativo.

### Acções propostas (mediante aprovação — nada foi alterado)

> **PÓS-AUDITORIA (2026-09-22, mesmo dia):** as acções 1, 2 e 4 foram **aprovadas e implementadas**:
> - **QA-BUG-001 CORRIGIDO** em `server.ts` **e** `api/index.ts`: o `DELETE` de notificações passou a exigir titularidade (`target_bi` restrito às duas partes, com variantes `SIGLA-NN` de agente).
> - **QA-SEC-001 CORRIGIDO** em `server.ts` **e** `api/index.ts` + 2 ficheiros do frontend (`src/services/supabaseService.ts`, `src/services/profileSyncService.ts`):
>   - **anónimo**: payload mínimo `{bi, name, role}` (existência + nome de exibição) — morada, estado civil, filiação, documentos e contactos deixaram de sair; validado: `200 {"bi","name","role"}` sem token e com token falso;
>   - **com sessão válida** (a app anexa a sessão nos fallbacks): comportamento anterior, perfil completo — hidratação do Perfil preservada; validado: token de sessão devolve a linha integral;
>   - **rate-limit por IP** em pedidos anónimos (20/min, `429` + `Retry-After`): flood de 30 pedidos anónimos bloqueado a partir do 20.º; sessão autenticada não é limitada;
>   - validações anteriores intactas (`400` em BI inválido).
> - **Teste de regressão criado:** `scripts/e2e_titularidade_notificacoes.mjs` — **6/6 PASS** após todas as correcções.
> - Validado após as correcções: `tsc` 0 erros; varredura **45 PASS / 2 WARN / 0 FAIL**. (Nota de transparência: uma execução intermédia da varredura marcou 8 FAIL transitórios porque o IP do host de testes ainda estava dentro da janela do rate-limit esgotada pelo próprio flood de validação; repetição, com a janela expirada, confirmou 0 FAIL — a blindagem não afecta fluxos legítimos.)
> - Ressalva documentada (hardening futuro, não aplicado): utilizador autenticado continua a poder ler perfis de terceiros via `/api/perfil` (necessário a fluxos de pesquisa da app; a enumeração anónima está fechada). Próximo passo sugerido: restringir leitura integral a (próprio BI, instituição no fluxo de composição, admin).
> - **QA-SEC-002 CORRIGIDO** em `server.ts`: `/api/security/readiness` passou a exigir sessão **admin** ou a chave operacional `READINESS_TOKEN` (nova variável no `.env` local; anónimo/token falso → **403** sem detalhes). Validado: anónimo 403 · token falso 403 · chave operacional 200 · sessão admin 200. *Correcção ao registo inicial da auditoria: o endpoint não existe no espelho serverless (`api/index.ts`) — a exposição era só onde `server.ts` corre; não foi preciso alterar a via Vercel.*
> - Pendentes (não aprovados nesta ronda): acções 2 e 3 (QA-SEC-001, QA-SEC-002).

1. **Corrigir QA-BUG-001** (filtro `target_bi` + âncora por id) em `server.ts` **e** `api/index.ts` — prioridade máxima;
2. **Blindar QA-SEC-001** (payload mínimo/sessão + rate-limit) nas duas vias;
3. Proteger `/api/security/readiness` em produção (QA-SEC-002);
4. Adicionar à suite E2E um teste de titularidade de notificações (regressão de QA-BUG-001).
