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
- Formato `src/constants/kb/<SIGLA>.ts`: `{ sigla, nome, fontes: [{ id, titulo, tipo: 'regulamento'|'procedimento'|'faq', texto, atualizadoEm }] }`
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

## Bloqueio imediato
E2 e E3 precisam dos textos oficiais (regulamentos, procedimentos, FAQ) da
**AGT** e do **INAPEM** — colados em mensagem ou num ficheiro, tal como estiver.
