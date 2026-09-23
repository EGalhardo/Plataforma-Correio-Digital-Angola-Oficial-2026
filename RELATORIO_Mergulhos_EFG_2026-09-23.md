# Relatório — Mergulhos Profundos E/F/G (Portais CDA)
**Data:** 23/09/2026 · **Duração da suite:** 198,1s · **Resultado:** 17/17 PASS (100% VERDE)
Suite: `qa_deep_portais.mjs` (Playwright real, Chromium headless, dev server :3000, Supabase cloud real)

## Cobertura executada
| # | Cenáio | Resultado | Prova |
|---|--------|-----------|-------|
| E1 | Cidadão abre carta do correio → detalhe/consulta visível | PASS | card clicado por ID real; detalhe contém o próprio ID; estado «não lida» restaurado no fim (ground-truth intacta) |
| E1b | Zero erros JS na sessão cidadão | PASS | pageerror watcher |
| E3 | «Ocorrências Locais» (card do Painel) abre página | PASS | texto da página + shot `deep-E3-*` |
| E3b | Zero erros JS | PASS | |
| E2 | «QR Code» institucional é um QR real renderizado | PASS | SVG com paths — `deep-E2-qr.png` |
| E2b | Zero erros JS | PASS | |
| F1 | Chat Teste da IA institucional: pergunta real → resposta | PASS | resposta ~184 chars (Groq configurado, modelo gpt-oss-120b); dumps `deep-F1-chat.txt`, shots `deep-F1-*` |
| F1b | Zero erros JS | PASS | |
| G2 | Painel de Auditoria/Segurança do admin com métricas reais | PASS | «CONTAS COM BIOMETRIA NA BASE = 12» |
| F2a | Sessão A agendada (form real completo + «Verificar» cidadão) | PASS | subject QA-DEEP-VIDEO-…-A na lista |
| F2b | Sessão persistida na nuvem corretamente | PASS | row `institution_code=(QA_INST_ORG)`, status agendada |
| F2c | «Entrar» abre a sala real (P2P) com fake-media concedido | PASS | shot `deep-F2-sala.png` — tile «EU» LIVE com câmara falsa verde, controls Mic/Câmara/Partilhar/Desligar |
| F2d | Zero erros JS na sessão de vídeo | PASS | |
| F2e | Higiene da sessão A (sessão+aviso+notificação) | PASS | DELETEs 204; verificação final zero |
| F2f | Sessão B agendada (para teste de eliminação) | PASS | |
| F2g | «Eliminar» via produto com modal de confirmação | PASS | botão «Eliminar» + «Eliminar» da CdaModal; card ausente depois |
| F2h | Semântica da eliminação do produto | PASS | row marcada `institution_code=REMOVIDA`, `host_bi=REMOVIDA` (o cidadão mantém a cópia até remover) |
| F2i | Higiene da sessão B (sessão+aviso+notificação×2) | PASS | DELETEs 204; zero vestígios |

## Estado da base/ambiente (verificado pós-suite)
- `video_sessions`, `messages`, `notifications`: **0 linhas** com subject/message `QA-DEEP-VIDEO-*` (higiene total, comprovada por query).
- Correio ground-truth BI_A: **17 mensagens pessoais, 3 não lidas** — restaurado no fim (quando a E1 marca a 1.ª não lida como lida, a suite repõe automaticamente + correção one-off documentada abaixo).

## Achados reais do produto (não-bugs, documentados)
1. **A eliminação de sessão é two-step «both-side»:** instituição marca a linha `REMOVIDA`; a linha continua visível para o cidadão até ele remover a sua cópia. O E2E valida exatamente esta semântica (F2h) — não é falha, é design comprovado no `VideoSessionPage.tsx` (2026-08-22).
2. **A agenda aterra na sub-aba VÍDEO após confirmar o agendamento** — a lista de cartões não é a vista ativa; a automação aprendeu a voltar à sub-aba AGENDA / botão «VER AGENDA» (era uma fragilidade do driver, não da app).
3. **O agendamento insere 3 artefactos por sessão:** row `video_sessions` + `messages` («Video-atendimento agendado: …» na caixa do cidadão, NÃO LIDA) + `notifications` (aviso «Caro cidadão …»). A higiene da suite cobre os três.

## Percursos de depuração (memória)
- O clique nativo em botões exige filtro `offsetParent !== null` (existem instâncias keep-alive escondidas) — origem do falso registo da 1.ª corridas.
- A câmara falsa exige Chromium lançado com `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream` + `permissions: ['camera','microphone']`.
- O botão «Desligar Chamada» deve ser procurado por aria-label **nunca** por /SAIR/ genérico (senão clica «SAIR DO CANAL» = logout — e a suite deixa o canal).
- O botão «Voltar» da VideoSessionPage navega para «Correio» — interdetido na automação; navegação é positiva (Painel→cartão).

## Artefactos
- `qa_deep_portais.mjs` · `logs/qa-deep-portais.log` · `screenshots/deep-*.png` (16) · `logs/deep-F1-chat.txt` · `logs/deep-G2-auditoria.txt` · `logs/deep-E1-detalhe.txt`

## Nota de correção one-off (registada 2026-09-23)
A versão inicial da E1 clicou 3 cartas «Não Lida» (AC1-TESTE-ENTREGA-59846742 / -58766399 / -59170948) sem restaurar; as 3 foram repostas `unread=true` via service no fim (3 não lidas / 17 total = ground-truth). A E1 final já restaura sempre o estado no final de cada execução.
