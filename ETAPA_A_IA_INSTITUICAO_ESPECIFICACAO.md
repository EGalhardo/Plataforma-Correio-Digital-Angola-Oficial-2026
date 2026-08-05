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

### Regra actualizada
"A KB é SÓ o que o dono aprovar" passa a incluir o método **recolha na
internet de fontes oficiais públicas**, com URL e data por fonte, e possibilidade
de o dono corrigir/pedir remoção de qualquer entrada. Nada foi inventado:
valores de taxas/tarifas/requisitos só entram vindos da página citada.

### E4/E5
Continuam por executar — aguardam "podes implementar" do dono.
