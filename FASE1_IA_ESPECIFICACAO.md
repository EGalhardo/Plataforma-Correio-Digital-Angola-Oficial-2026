# FASE 1 — Assistente IA de Documentos + Catálogo de Serviços

> **ESTADO: CONCLUÍDA (2026-08-05)** — S1…S7 implementados, 73/73 testes, tudo verificado ao vivo. Commits: a817ffd/a5e0c37/8fcc038 (S1), 9f483eb (S2), fe33c1c (S3+S4), 15be20a (S5), 50c2046 (S6+S7).
Especificação para aprovação por ciclos (S1…S7). Cada ciclo: implemento → tsc → build → bateria → commit → push → verificação ao vivo → reporto. Nada entra sem o teu "podes implementar" no ciclo correspondente.

Aprovado pelo dono em 2026-08-05: **Fase 1 SEM gateway de pagamentos; IA Gemini em modo teste** (plano pago Gemini só após aprovação dos resultados).

## Estado verificado (evidência, não suposição)

| Peça | Estado real (2026-08-05) |
|---|---|
| `/api/chat` | Existe — Groq primário + fallback Gemini; aceita `currentPage`, `pageContext`, `language` (9 variantes incl. línguas nacionais) |
| `/api/translate` | Existe |
| `/api/gov-ai`, `/api/verificar-cadastro` (visão) | Existem (padrão fail-safe: erro técnico nunca aprova nada) |
| Chaves em produção (`/api/health` ao vivo) | `groq_key_configured: true` / **`ai_key_configured: false`** (Gemini por configurar) |
| `AIChatAssistant`, `VoiceGuideAssistant`, `InstAiAssistantContent` | Existem e estão ligados no App |
| O que FALTA | Ações **no documento** (explicar/resumir/passos/prazos), rascunhos de resposta, validação pré-envio de mensagens, catálogo das 22 instituições |

## Pré-requisito do dono (uma vez, ~3 min)
1. Google AI Studio → gerar chave gratuita (modo teste)
2. Vercel → projeto → Settings → Environment Variables → `GEMINI_API_KEY` = chave → Production+Preview → Redeploy
3. Local: preencher `GEMINI_API_KEY` no `.env`
Até lá, tudo funciona via Groq (já ativo); o código novo será **Gemini-primeiro com fallback Groq** — como `/api/chat` já faz.

## Ciclos

### S1 — Endpoint `/api/assistente-documento` (servidor)
Ações: `explicar | resumir | passos | prazos_direitos | rascunho(tipo)`.
Guardas anti-alucinação no prompt: responder APENAS com base no texto enviado; se algo não constar, dizer "não consta do documento"; não inventar prazos, valores nem leis; tom PT-AO; sem formatação Markdown.
Fail-safe: sem chaves → HTTP honesto; erro de IA → erro honesto (nunca texto fingido).
Aceitação: sondas curl com/sem chave; shape de resposta documentado; testes na bateria.

### S2 — Painel "Assistente do Documento" (MessageDetail + DocumentDetail)
Botões: Explicar · Resumir · Próximos passos · Prazos e direitos.
Painel com loading, estado de erro honesto, e selo permanente "Conteúdo gerado por IA — confirme sempre na fonte oficial".
Aceitação: build + bateria + verificação do bundle ao vivo.

### S3 — Tradução do documento (PT simples / EN / FR)
No mesmo painel; reutiliza `/api/translate` se o shape servir, senão ação no S1. Línguas nacionais: NÃO nesta fase (cobertura fraca dos modelos — fase futura, como o próprio plano prevê).
Selo de IA idêntico.

### S4 — Leitura por voz (custo zero)
Botão Ouvir/Parar no painel e/ou no corpo do documento via SpeechSynthesis (pt-PT), sem custo de API. Mensagem honesta se o browser não suportar.

### S5 — Rascunhos de resposta (envio continua humano)
4 tipos: Confirmação de receção · Pedido de esclarecimentos · Intenção de recurso · Prorrogação de prazo.
Gerado pela IA (S1) → abre o compositor PRÉ-PREENCHIDO com etiqueta "Rascunho gerado por IA — revê antes de enviar". O utilizador revê/edita/carrega Enviar. A IA nunca envia.

### S6 — Deteção de erros pré-envio (compositor)
Determinística primeiro (gratuita, offline): campos obrigatórios vazios, destinatário inválido (liga ao gate P0-B existente), anexos acima do limite/tipo, corpo quase vazio, aviso se o texto sugere prazo sem data.
Camada IA OPCIONAL (só se chave ativa): revisão de clareza/inconsistências — com fail-safe: falha de IA nunca bloqueia o envio.
> ✅ 2026-08-07: camada IA ATIVADA (ação `rever_clareza`, marcador de corte, botões usar/manter no compositor). Ver `CORRECOES_APLICADAS_2026-08-07.md`.

### S7 — Catálogo de serviços das 22 instituições (dados + UI honesta)
Ficheiro de config com as 22 entidades e os serviços da tua Parte I (sem gateway).
Etiqueta honesta: disponível vs demonstração (coerente com o backlog "classificar páginas Gov demo").
Superfície inicial: seleção de tipo de correspondência no compositor + página de diretório. Sem inventar integrações.

## Fora de âmbito na Fase 1 (registado para não se perder)
Pagamentos/gateway · dados clínicos · assinatura qualificada · RAG completo por instituição · SOS GPS/multimédia.
> ✅ 2026-08-07: «línguas nacionais na IA de documentos» SAIU desta lista — tradução experimental para 5 línguas nacionais com guardas de honestidade (anti-eco + anti-degeneração) e painel marcado «(experimental)». Ver `CORRECOES_APLICADAS_2026-08-07.md`.
> ◐ 2026-08-08 (decisão do dono): «Pagamentos» sai PARCIALMENTE — entra já o frontend + registo de cobranças (v26, tabela `pagamentos`, RLS na convenção v14/v19/v25; de propósito SEM estado 'pago'); o **gateway/backend (EMIS/Multicaixa/bancos) fica para depois da validação do projecto pelo INAPEM**.

## Regras de segurança/custo (todos os ciclos)
- Chaves SÓ no servidor (nunca `VITE_`)
- Conteúdo de cartas vai à IA apenas sob ação explícita do utilizador
- Selo "Gerado por IA" em tudo o que for gerado
- Anti-injeção: o documento é dados, não instruções (prompt delimitado)
- Custo: ações curtas; voz via browser (grátis); plano pago só após a tua aprovação
