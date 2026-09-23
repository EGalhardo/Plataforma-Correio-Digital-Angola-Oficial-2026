# Funcionalidade «Denuncia» (T-v37.79) · 2026-09-23

Pedido do dono (2026-09-23), três aditivos:
1. **Nas áreas Cidadão e Institucional**, página «Painel», zona central, **mesma linha do Vídeo-Atendimento, entre «Ocorrência» e «Livro de Reclamações»** — inserir a funcionalidade **«Denuncia»** (grafia pedida: sem acento).
2. O fluxo deve ser **semelhante ao do Livro de Reclamações**, com os respectivos textos «Denuncia». **O Livro continua a existir separadamente.**
3. Na página «Nova mensagem», ao clicar **«Enviar Mensagem»**, o popup deve também incluir a opção **«Denuncia»**.

## Estratégia

Duas famílias de «denúncia» a coexistir, separadas pela marca no assunto:

| Família | Página | Marca no assunto | Textos do produto |
|---|---|---|---|
| Livro de Reclamações (legado) | «Livro de Reclamações» | `[DENÚNCIA]` | «Denúncia» (com acento) — inalterados |
| **NOVA «Denuncia»** | «Denuncia» | `[REGISTO DE DENÚNCIA]` | **«Denuncia» (sem acento, grafia pedida)** |

A discriminação entre famílias é feita pelo assunto normalizado (NFD + strip-marca, antes da divisão não se confundem) e, nas notificações, pelo assunto associado / título cru (`familiaDenunciaPorTituloCru`). O Livro mantém 100% do seu comportamento; a nova fila partilha a **mesma máquina**: anonymato na instituição, cronograma de 5 fases (Registada → Recebida → Em Análise → Respondida → Encerrada), gestão de fases pela instituição («Pretende activar este ponto do cronograma?»), fase automática no envio e notificações por evento — mas com textos «Denuncia».

## Alterações (cirúrgicas; lógica partilhada espelhada server/edge)

| Ficheiro | Mudança |
|---|---|
| `src/services/denunciaCore.ts` | +`ehAssuntoNovaDenuncia` / `ehAssuntoQualquerDenuncia`; exports espelhados para o servidor. |
| `src/utils/listasParticipacao.ts` | `listarParticipacao` aceita o tipo `'nova-denuncia'` e classifica por família (subject ↔ marca própria). |
| `src/utils/notificacoesAtalhos.ts` | atalho/tab `'nova-denuncia'`; rotas de notificação novidade→página própria; **desambiguação Livro vs Denuncia** pelo título cru (`Nova Denuncia Anónima`, `Denuncia — <fase>`) para os badges ficarem na fila certa. |
| `src/services/supabaseService.ts` | **anonimato das duas famílias**: mensagem da nova fila chega à instituição com `sender_bi`/`sender` mascarados («Remetente: Anónimo», «Cidadão: Anónimo», «CIDADÃO: ANÓNIMO»). |
| `src/App.tsx` | tab `'nova-denuncia'` no conjunto de tabs livres; `case 'nova-denuncia'` recicla `ListaParticipacaoContent`; envio com fase automática e notificação diferenciadas por família. |
| `src/components/features/HomeContent.tsx` | 5.º atalho «Denuncia» (ícone `Flag`) **entre «Ocorrência(s)» e «Livro de Reclamações»** — cidadão e instituição; grelha `xl:grid-cols-5`. |
| `src/components/features/ListaParticipacaoContent.tsx` | tipo `'nova-denuncia'`: título «Denuncia», ícone `Flag`, subtítulos/pesquisa/botão «Criar Denuncia»/contagem/vazio na grafia sem acento. |
| `src/components/features/MailContent.tsx` | `ModalidadeEnvio` +`'nova-denuncia'`; opção **«Denuncia»** no popup «Enviar Mensagem» (`#btn-modal-opcao-denuncia`) — **Cidadão E Instituição** (decisão do dono); `escolherModalidadeEnvio` prefixa `[REGISTO DE DENÚNCIA]` quando escolhida. |
| `src/components/features/MessageDetail.tsx` | cronograma `CronogramaDenuncia` activo para **qualquer** família (`ehAssuntoQualquerDenuncia`). |
| `src/components/features/AIChatAssistant.tsx` | rótulo «Denuncia» nos mapas de contexto dos dois painéis. |
| `src/services/voicePresentations.ts` | apresentações de voz actualizadas («cinco atalhos … Denuncia e Livro …») + entradas `nova-denuncia` (cidadão/instituição). |
| `server.ts` + `api/index.ts` (espelho) | `POST /api/denuncia/fase`: idempotência e título da notificação diferenciados por família — nova fila: `Denuncia — <rótulo>`; Livro: `Denúncia — <rótulo>`. |

## QA E2E — 17/17 PASS (81.9s), higiene total

Driver: `scripts/e2e_nova_denuncia.mjs` — `node --env-file=.env --env-file=.env.local scripts/e2e_nova_denuncia.mjs`
Credenciais só via env: `QA_BI_A` / `QA_CID_PASS` / `QA_INST` / `QA_INST_ORG` / `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (+`BASE` opcional). Artefactos opcionais via `QA_OUT_DIR`.

Execução contra `http://localhost:3000` (produção na nuvem), 2026-09-23 19:36 (Luanda):

- **C1** Painel cidadão: 5 atalhos na ordem pedida (`… Ocorrências Locais → Denuncia → Livro de Reclamações`) ✔
- **C2** Página «Denuncia» (cidadão): `section[aria-label="Denuncia"]`, `h2=Denuncia`, `placeholder="Procurar denuncias por assunto ou número..."`, «Criar Denuncia», vazio «Ainda não enviou denuncias.» ✔
- **C3/C3b** Popup «Enviar Mensagem» com **3 opções** (`btn-modal-opcao-normal`, `btn-modal-opcao-denunciar`, `btn-modal-opcao-denuncia`); envio real via opção «Denuncia» ✔
- **C4** Nuvem: linha com `subject = «[REGISTO DE DENÚNCIA] …»`, `org (QA_INST_ORG)` preservado ✔ · **C4b** fase automática `DENUNCIA:registada` no histórico ✔ · **C4c** notificação à instituição **`Nova Denuncia Anónima`** (sem acento) ✔
- **C5/C5b** Cidadão vê o envio na página «Denuncia» e **NÃO** no Livro de Reclamações ✔
- **C6** Detalhe (cidadão): cronograma partilhado completo em **modo «só leitura»** ✔ · **C7** zero erros JS ✔
- **I1** Painel instituição: mesma ordem dos 5 atalhos ✔ · badges separadas por família (`Denuncia 2`, `Livro … 1`) ✔
- **I2** Página «Denuncia» da instituição: item com **«Remetente: Anónimo»** (e «CIDADÃO: ANÓNIMO» no detalhe) ✔ · **I2b** instituição **não** vê o item no Livro ✔
- **I3** Instituição (-01) avança a fase para **«Recebida»** clicando no ponto 2 do cronograma (popup `#btn-fase-ok`): histórico `… Visualizada, DENUNCIA:recebida` ✔
- **C8** Cidadão notificado com o título **`Denuncia — Recebida`** (grafia sem acento = nova fila) ✔ · **I4** zero erros JS ✔
- **H** Higiene: mensagem, `message_state_history` e notificações do teste eliminados — verificação final `messages[]=[]`, `notifications[]=[]`, `history=0` ✔

## Notas para revisão

- A opção «Denuncia» no popup **também** existe na Instituição (alinhado com o dono), antes de «Emergência».
- O cronograma utiliza o texto legado «Acompanhamento da denúncia» / «Cronograma da denúncia» (componente partilhado com o Livro — semântico em ambas as famílias); os textos visíveis da nova fila usam sempre «Denuncia» sem acento.
- Sem migrações de base de dados: a separação é por convenção de assunto/notificações.
