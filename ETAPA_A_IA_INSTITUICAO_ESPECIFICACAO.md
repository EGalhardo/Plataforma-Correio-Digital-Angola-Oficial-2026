# ETAPA A — IA Especializada por Instituição
Especificação para aprovação por ciclos (E1…E5), seguindo a decisão do dono em
2026-08-05 ("próxima etapa: A"). Reaproveita o motor S1 + guardas já verificadas.

## Estado verificado antes de começar (evidência, não suposição)

| Peça | Estado real |
|---|---|
| Endpoint `/api/assistente-documento` | Ao vivo, Gemini 2.5-flash primário + fallback Groq, guards anti-alucinação provadas |
| `InstAiAssistantContent` (área da instituição) | Tem separador "Base de Conhecimento" com upload **simulado/local** — NÃO liga ao assistente do cidadão |
| Conteúdo institucional real (regulamentos/procedimentos/FAQ) | **Não existe no repo** — tem de ser fornecido pelo dono (eu não invento conteúdo institucional) |

## Decisão de arquitetura (honesta)

A KB oficial vive no **servidor, curada em ficheiros versionados** (cada texto
que o dono entrega vira uma fonte com título/tipo/data). A auto-gestão pela
própria instituição via UI (editar KB sem código) fica para ciclo futuro —
exige storage + regras de permissão, e sem isso seria inseguro/inventado.

## Ciclos

### E1 — Motor de Base de Conhecimento (sem conteúdo do dono)
- Formato `api/kb/` (módulos TS dentro de api/ — a Vercel não empacota `../src`, lição do S1; especificação ajustada em E1): `{ sigla, nome, fontes: [{ id, titulo, tipo: 'regulamento'|'procedimento'|'faq', texto, atualizadoEm }] }`
- Servidor: `indexKb.ts` puro — seleciona fontes por sigla do remetente (ou
  parâmetro explícito), aplica limite de caracteres, monta secção no prompt:
  resposta só com base no DOCUMENTO + KB; se faltar nos dois, frase padrão de
  ausência; quando usar a KB, indicar a fonte (título) no fim.
- Sem KB para a sigla (ou vazia) → comportamento atual, zero mudanças.
- Paridade núcleo↔embutido mantida (suite).
- Aceitação: tsc + bateria (KB sintética só nos testes) + sondas ao vivo com
  sigla sem KB (comportamento idêntico ao de hoje).

### E2 — Conteúdo AGT (bloqueado: espera textos do dono)
Estruturo os textos entregues em `kb/AGT.ts` com fonte/título/data honestos.
Sonda ao vivo: pergunta cuja resposta esteja SÓ na KB tem de vir com a fonte indicada.

### E3 — Conteúdo INAPEM (bloqueado: idem)
Idem E2 para `kb/INAPEM.ts`.

### E4 — Selo de proveniência no painel do cidadão
Linha discreta: "A responder com base em N documentos oficiais de [Instituição]"
ou "Sem regulamentos carregados — resposta só com base no documento". Nada de
alegar conhecimento que não existe.

### E5 — QA e auditoria
Suites E1–E4 + registo de auditoria de uso da KB (qual sigla/fontes usadas —
estrutura simples, sem dados sensíveis).

## Regras (herdadas e reforçadas)
- Nunca invento conteúdo institucional: a KB é SÓ o que o dono entregar
- Cada fonte leva data de atualização honesta
- A KB é dados, não instruções (mesma guarda anti-injeção do S1)
- Limite de tamanho por resposta (custo controlado no nível gratuito)

## Bloqueio imediato — RESOLVIDO (2026-08-05, ver adenda em baixo)
E2 e E3 precisam dos textos oficiais (regulamentos, procedimentos, FAQ) da
**AGT** e do **INAPEM** — colados em mensagem ou num ficheiro, tal como estiver.

---

## ADENDA 2026-08-05 — E2/E3 EXECUTADOS (método autorizado: recolha na internet)

**Autorização do dono (mensagem de 2026-08-05):** "Adiciona o texto ou arquivo na
base de conhecimento da IA atraves da pesquisa na internet. Coloque as
instituições mais populares de Angola como INAPEM, AGT, ENDE, EPAL, etc."

### Âmbito executado
6 instituições populares, **17 fontes** de conhecimento, todas recolhidas de
páginas públicas oficiais (e 1 directório público, assinalado), com
`atualizadoEm` + `fonteUrl` registados para auditoria — lista completa em
`ETAPA_A_E2E3_FONTES.md`:

| Sigla | Instituição | Fontes | Páginas-origem |
|---|---|---|---|
| AGT | Administração Geral Tributária | 3 | portaldocontribuinte.minfin.gov.ao, agt.minfin.gov.ao |
| ENDE | Empresa Nacional de Distribuição de Electricidade | 1 | directório público + SEPE (site oficial indisponível à data — assinalado) |
| EPAL | Empresa Pública de Águas de Luanda | 4 | epal.co.ao (página comercial, tarifário Decreto 230/18) |
| INAPEM | Instituto Nacional de Apoio às MPME | 3 | inapem.gov.ao |
| INSS | Instituto Nacional de Segurança Social | 3 | virtual.inss.gov.ao, estouinscrito.inss.gov.ao, siac.gv.ao/pt/inss |
| SME | Serviço de Migração e Estrangeiros | 3 | sme.gov.ao, sme.minint.ao, siac.gov.ao |

### Arquitectura (como decidido no E1)
- Ficheiros-fonte `api/kb/{agt,ende,epal,inapem,inss,sme}Kb.ts` literais, sem
  imports fora de `api/kb/` (regra da cadeia do cold start);
- `api/kb/registoKb.ts` agrega os 6 ficheiros (usado por `server.ts` em dev);
- `scripts/syncKb.ts` injeta o conteúdo em JSON na secção
  `===KB-INICIO===/===KB-FIM===` de `api/index.ts` (Vercel não tolera imports);
- paridade JSON verificada na bateria (`f_e2e3_kb_conteudo.mts`, 32 checks);
- `FonteKb.fonteUrl?: string` adicionado (campo opcional, não é enviado ao
  modelo — apenas auditoria).

### Verificação
- `tsc --noEmit` limpo; `npm run build` OK; bateria **75/75 PASS**;
- Contrato E1 mantido: sem KB, prompts bit-a-bit iguais (f_e1, 23 checks);
- Sonda ao vivo pós-deploy: pergunta cuja resposta esteja SÓ na KB deve vir
  com a fonte indicada (registada neste ficheiro após o deploy).

**Sondas ao vivo (2026-08-05, deploy `7464b56`, health OK):**
1. AGT + acção `prazos_direitos` (gemini-2.5-flash): recusou inventar prazo
   ("definidos no Calendário Fiscal ... www.agt.minfin.gov.ao") e citou
   "Fonte: Portal do Contribuinte — serviços electrónicos da AGT" +
   "Fonte: Legislação fiscal, notificações e contactos da AGT". ✅
2. INAPEM + `prazos_direitos` (gemini): respondeu SÓ com dados da KB
   (validade 12 meses; emissão ~3 dias vs ~30; Twendy ~10 semanas) citando as
   3 fontes com datas. ✅
3. EPAL + `explicar` factura estimada (fallback llama-3.1-8b-instant):
   explicou as 3 formas de facturação exactamente como na KB. ✅
4. ENDE + `explicar` (llama): perfil institucional em linha com a fonte
   limitada carregada. ✅
5. Controlo SEM KB (`siglaKb: 'ZZZ'`): 200 normal, sem conteúdo KB —
   contrato E1 intacto. ✅

### Regra actualizada
"A KB é SÓ o que o dono aprovar" passa a incluir o método **recolha na
internet de fontes oficiais públicas**, com URL e data por fonte, e possibilidade
de o dono corrigir/pedir remoção de qualquer entrada. Nada foi inventado:
valores de taxas/tarifas/requisitos só entram vindos da página citada.

### E4/E5 — EXECUTADOS (2026-08-05, aprovação: "Podes avancar para E4 + E5")

**E4 — Selo de proveniência no painel do cidadão**
- Servidor devolve `kb: { instituicao, fontes[títulos], truncado }` na
  resposta de `/api/assistente-documento` (Gemini e Groq, nos dois runtimes);
- `src/services/aiDocumentoService.ts`: tipo `AssistenteKb` + função pura
  `seloKb()` — fonte única da frase honesta ("Com base em N documentos
  oficiais de X" / "(parcial…)" se truncado / "Sem regulamentos carregados —
  resposta só com base no documento");
- `AssistenteDocumento.tsx`: selo sempre visível no cartão de resultado
  (ícone de livro), com título que lista as fontes usadas ao passar o rato.

**E5 — Auditoria estruturada do uso da KB**
- `KB_AUDIT {json}` em `console.log` (api/index.ts e server.ts, paridade
  testada): evento `kb_usada` (sigla, fontes[id], truncado, ação, ts) e
  `kb_sem_correspondencia` (ação + ts). NUNCA texto do documento nem
  remetente do cidadão.
- Limitação honesta: serverless ⇒ os registos vivem nos logs da plataforma
  (Vercel/local); não há persistência fingida.

**Verificação:** tsc limpo, build OK, bateria **77/77 PASS**
(f_e4 19 checks, f_e5 12 checks). Sondas ao vivo pós-deploy registadas abaixo.

**Sondas ao vivo E4/E5 (2026-08-05, deploy `ce5ef09`, health OK):**
1. AGT + `explicar` (gemini-2.5-flash): resposta traz
   `"kb":{"instituicao":"Administração Geral Tributária","fontes":[3 títulos],"truncado":false}` —
   1.º título "Portal do Contribuinte — serviços electrónicos da AGT". ✅
2. Controlo `siglaKb: 'ZZZ'` (llama): resposta 200 **sem** campo `kb`. ✅
3. Bundle `index-DNz5sutE.js`: marcadores do selo presentes — "Com base em N
   documento(s) oficial(is)", "Sem regulamentos carregados — resposta só com
   base no documento", "(parcial…)", "Fontes usadas:". ✅

## Etapa A — CONCLUÍDA (E1 + E2 + E3 + E4 + E5)

- **E1** motor KB (seleção/montagem/guardas) — `483891c` + `3ddaa35`
- **E2/E3** conteúdo de 6 instituições, 17 fontes (internet, autorizado) — `7464b56`
- **E4** selo de proveniência no painel — `ce5ef09`
- **E5** auditoria estruturada KB_AUDIT — `ce5ef09`
- Bateria final: **77 suites PASS / 0 FAIL**

### Vaga-2 da KB (2026-08-05, "Podes alargar a base a mais instituições")

+7 instituições (DNIRN, Conservatória do Registo Civil, DTSER, SIAC, MINED,
MINSA, Emergências CISP 111) ⇒ **13 instituições · 31 fontes**. Detalhe das
origens em `ETAPA_A_E2E3_FONTES.md`. Decisões registadas:

- **Direcção/ordem do registo:** SIAC ficou em último de propósito — o motor
  devolve o 1.º match e uma mensagem "SIAC — balcão SME/DNIRN" deve bater no
  organismo específico (apareceu na suite, corrigido e testado).
- **Siglas curtas blindadas:** rejeitei siglas de 2–3 letras com falsos
  positivos provados por teste ("desnecessário" conteria "sne"; "online"
  conteria "ine") — INE ficou fora desta vaga por isso; CISP é a sigla
  oficial actual da emergência unificada.
- **Sem alteração do motor de selecção** (contrato E1 intacto): as mensagens
  com assento (ex.: "o seu Bilhete… DNIRN") resolvem-se pela sigla no texto.
- bateria: f_e2e3 32→45 checks; **77/77 PASS**; paridade JSON mantida.
