# Inquérito com IA (conversacional) — guia técnico

Versão v38 · 2026-09-10 · especificação de origem: PROMPT «Inquérito IA» v3.

## 1. O que é

Uma terceira modalidade de inquérito, ao lado da «Sondagem» (perguntas fixas):
a instituição escreve **apenas dois textos** («O que pretende saber» e «Que
informações quer recolher»), a IA deduz sozinha um **guião** (objectivo,
saudação, lista de informações a recolher, tipos e dependências) e **conversa
com cada cidadão** por texto ou voz, adaptando as perguntas às respostas.

Fluxo completo:

```
Instituição                        Cidadão                          Instituição
Correio › Nova Mensagem            Correspondência recebida         Sondagens (lista)
 └ Criar Inquérito › Inquérito IA   └ container «Inquérito com IA»   └ linha com badge «IA»
   └ 2 campos → pré-visualização      └ «Iniciar Inquérito»              └ «Resultados do Inquérito com IA»
     └ «Criar Inquérito»                └ chat texto/voz (chips)             ├ Enviados/Iniciados/Concluídos/Recusados
       └ bloco no compositor              └ agradecimento → «Concluir»         ├ agregados por campo (barras, %)
         └ Enviar → 1 msg/cidadão           └ pill «Respondido em …»            ├ Exportar CSV
                                                                                  └ Encerrar inquérito
```

Decisões de produto (do dono):

- O cidadão **nunca vê** os dados extraídos — nem resumo, nem confirmação de
  campos. A conversa termina com um agradecimento e um único botão «Concluir».
- O popup de criação tem **exactamente 2 campos obrigatórios**; duração, canal e
  tom vivem em «Opções avançadas» (recolhidas) com predefinições sensatas.
- A instituição só vê **agregados** — nunca respostas individuais. O BI não é
  guardado: `cidadao_bi_hash = sha256(BI + INQUERITO_IA_SAL)`.
- Se a IA não estiver disponível (quota, 503), existe **contingência**: guião
  «template» derivado dos 2 textos e conversa guiada pergunta-a-pergunta.

## 2. Ficheiros

| Ficheiro | Papel |
|---|---|
| `supabase/v38_inqueritos_ia.sql` | Tabelas `inqueritos_ia`, `inquerito_ia_respostas`; colunas `messages.inquerito_ia_id` / `inquerito_ia_ids`; RPCs `cda_inquerito_ia_contadores` e `cda_inquerito_ia_agregados` (`security definer` — devolvem só contagens); RLS. Idempotente. **Já aplicado em produção.** |
| `src/services/inqueritoIaCore.ts` | Núcleo puro partilhado (prompts, validação/normalização do guião e da resposta da IA, guião template, conversa guiada de contingência, `so_se`). Cópia embutida em `api/index.ts` entre `// ===INQ-IA-CORE-INICIO===` / `FIM` — verificada por `testes/paridade_inquerito_ia_core.mjs`. |
| `server.ts` (dev) e `api/index.ts` (Vercel) | Endpoints `POST /api/inquerito-ia/guiao`, `/conversa`, `/hash`. Gemini → Groq (`openai/gpt-oss-120b`) → contingência. Rate-limit por IP+rota (20/min guião, 40/min conversa). **Toda a alteração tem de ser feita nos dois ficheiros.** |
| `src/services/inqueritoIaService.ts` | Cliente: `gerarGuiaoIA`, `criarInqueritoIA`, `expedirInqueritoIA`, `conversarInqueritoIA`, `iniciarOuRetomarRespostaIA`, `guardarProgressoIA`, `concluirRespostaIA`, `recusarRespostaIA`, `listarInqueritosIA`, `encerrarInqueritoIA`, `contadoresInqueritoIA`, `agregadosInqueritoIA`. Escritas passam por `gravarDados` (proxy `/api/dados` quando a sessão não tem JWT). |
| `src/components/features/SondagemModal.tsx` | Modo `ia`: 2 textareas, pré-visualização automática (debounce 1,2 s), opções avançadas recolhidas, botão «Criar Inquérito». |
| `src/components/features/TipoInqueritoModal.tsx` | Opção «Inquérito IA» (subtítulo/ícone). |
| `src/components/features/MailContent.tsx` | Bloco «Inquérito com IA» no compositor (`data-testid=inqueritos-ia-compostos`), destinatário «Todos» automático, expedição (1 mensagem por cidadão + linha TODOS). |
| `src/components/features/MessageDetail.tsx` | Container no detalhe da correspondência: «Iniciar/Retomar Inquérito», pill «Respondido em …», «Encerrado». |
| `src/components/features/InqueritoIaChat.tsx` | Popup de conversa (texto/voz, chips, progresso, recusa, retoma, «Concluir»). |
| `src/components/features/InqueritoIaResultados.tsx` | Popup «Resultados do Inquérito com IA» (contadores, agregados normalizados por campo, CSV, encerrar). |
| `src/components/features/SondagensContent.tsx` | Lista da instituição — inclui os inquéritos IA com badge e contadores. |
| `src/types.ts` | `Message.inqueritoIaId / inqueritoIaIds`. |

## 3. Contratos da API

```
POST /api/inquerito-ia/guiao
  { oQuePretendeSaber, informacoes, instituicao, duracao?: 'curto'|'medio'|'longo', tom?: 'proximo'|'formal' }
  → { ok, modelo, guiao: { objectivo, saudacao, maxPerguntas, campos: [{ chave, rotulo, tipo, so_se?, opcoes? }] } }
     tipo ∈ sim_nao | escolha | texto_curto | distancia | numero

POST /api/inquerito-ia/conversa
  { guiao, historico: [{ de: 'ia'|'cidadao', texto }], camposRecolhidos, instituicao, tom }
  → { ok, modelo, proximaMensagem, camposExtraidos, respostaRapida: string[]|null, terminou, motivoFim }
     O cliente sobrepõe SEMPRE camposRecolhidos com camposExtraidos (o valor mais recente vence).

POST /api/inquerito-ia/hash   { bi } → { ok, hash }
```

Erros: `503 { ok:false, mensagem }` quando nenhum modelo responde — o cliente
cai na conversa guiada do núcleo (sem IA), sem bloquear o cidadão.

## 4. Como aplicar / configurar

1. **SQL**: `supabase/v38_inqueritos_ia.sql` no SQL Editor do Supabase (já
   aplicado; é idempotente).
2. **Variáveis** (Vercel e `.env` local): `GEMINI_API_KEY` e/ou `GROQ_API_KEY`
   (já existentes) e `INQUERITO_IA_SAL` — sal do hash SHA-256 do BI
   (`sha256(BI|SAL)`), gerado com `openssl rand -hex 32`. **Definida na Vercel
   em 2026-09-10** (Production/Preview/Development, encriptada) e no cofre
   local do dono. Cadeia de recurso no código: `INQUERITO_IA_SAL` →
   `SUPABASE_SERVICE_ROLE_KEY` → constante interna. **Nunca alterar** depois do
   1.º inquérito real: mudar o sal quebra a ligação participação ↔ cidadão nos
   inquéritos activos (os encerrados mantêm os agregados).
3. Não há passos de build adicionais.

## 5. Testes

| Script | O que faz | Custo |
|---|---|---|
| `npx tsx testes/unit_inquerito_ia_core.mjs` | 12 testes unitários do núcleo | nenhum |
| `node testes/paridade_inquerito_ia_core.mjs` | garante `inqueritoIaCore.ts` ≡ cópia em `api/index.ts` | nenhum |
| `node testes/e2e_inquerito_ia.mjs` | **E2E consolidado (spec §6.4)**: IA simulada com `page.route`; contas reais; (a) popup 2 campos + expedição, (b) 2 cidadãos (desktop 1366×900 e mobile 390×844) com asserção negativa, (c) resultados + encerrar pela UI. `SO_C=1 AUDIENCIA=n` repete só a secção (c). | cria 1 inquérito «[TESTE E2E …]» real na BD |
| `node testes/e2e_f2_popup_inquerito_ia.mjs` | popup com conta demo (nada escrito) | nenhum |
| `node testes/e2e_f3_chat_inquerito_ia.mjs [mock\|real]` | chat do cidadão sobre uma correspondência já existente | mock: nenhum |
| `node testes/e2e_f4_resultados_inquerito_ia.mjs` | resultados na instituição sobre dados existentes | nenhum |
| `node testes/e2e_inquerito_ia_real_ciclo_completo.mjs` | ciclo real com IA real (validação final) | quota + 1 inquérito real |

Evidências em `testes/evidencias/e2e_*.png`, `ciclo_*.png`, `f2_*`, `f3_*`, `f4_*`.

## 6. Limitações e decisões em aberto

- **Quotas**: Gemini free-tier (429 diário) e Groq (limite por dia) — a
  contingência guiada mantém o serviço mas com perguntas menos naturais.
- **Latência**: um turno com IA real pode demorar 5–60 s; a UI mostra «a pensar…».
- **Voz**: `webkitSpeechRecognition` (Chrome/Edge/Android); no iOS Safari cai
  para texto. `speechSynthesis` lê as perguntas quando o canal o permite.
- **Normalização de agregados** é feita no cliente (`normalizarValorAgregado`):
  distâncias em metros, números sem unidade duplicada, Sim/Não uniformes. Texto
  livre mostra os 10 valores mais frequentes. Uma normalização no RPC seria mais
  robusta para exportações externas — em aberto.
- **Audiência**: contabilizada no envio (`audiencia_total`); cidadãos registados
  depois não recebem a correspondência.
- **Sem edição do guião** após criar (por desenho: simplicidade). Para alterar,
  remover o bloco do compositor e criar de novo.
- **Reabertura** de inquéritos encerrados não existe na UI (só via BD).
