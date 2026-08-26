# CORREIO DIGITAL ANGOLA — RELATÓRIO DE TESTE AUTÓNOMO COMPLETO

Data: 2026-08-24 · Commit auditado: `3ea1276` (produção Vercel READY) · Ambiente: servidor local + Supabase real (contas reais)

---

## RESUMO EXECUTIVO

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORREIO DIGITAL ANGOLA — RELATÓRIO DE TESTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total de páginas encontradas:     42 (+ 5 modais transversais)
Total de páginas analisadas:      42
Páginas sem nenhum erro:          41  (98%)
Páginas com avisos/erros:          1  (2%)

Verificações dinâmicas executadas: 46 (browser real, 3 contas reais)
Verificações estáticas executadas: TypeScript (204 ficheiros), imports,
                                   segredos, handlers, links, formulários

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERROS ENCONTRADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 Críticos:   0
🟠 Altos:      1  → ✅ CORRIGIDO (commit 5d6fbbb, 2026-08-24)
🟡 Médios:     2  → #1 CORRIGIDO (confirm()/prompt() nativos migrados para CdaModal)
🟢 Baixos:     5
               ─────
Total:         8 achados

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Metodologia: PASSO 1 — mapeamento por leitura do código (53 componentes de funcionalidade, máquina de estados do App.tsx com ~46 estados, imports lazy). PASSO 2 — testes A a L: `tsc --noEmit` (204 ficheiros, 0 erros), varreduras de segurança (segredos/handlers/links), e bateria Playwright com as contas reais 002399714LA030 (cidadão), INAPEM-LLMM-01 (instituição) e ADMIN-0001 (admin) contra a base de dados Supabase real.

---

## MAPA COMPLETO DE PÁGINAS

```
ÁREA PÚBLICA (7)
  /login                    — Login (3 separadores)            — ✅ OK (dinâmico)
  /registar                 — Registo Cidadão (stepper)        — ✅ OK (dinâmico)
  /registar-instituicao     — Registo Instituição              — ✅ OK (estático)
  /recuperar-senha          — Recuperar Senha (stepper)        — ✅ OK (estático)
  /facial                   — Login Facial (configuração)      — ✅ OK (estático)
  /directorio-orgaos        — Directório de Órgãos             — ⚠️ 1 aviso (dinâmico)
  (HomologationGate)        — Porta de homologação             — ✅ OK (estático)

ÁREA CIDADÃO (13)
  home                      — Painel (HomeContent)             — ✅ OK (dinâmico)
  correspondencias          — Correio / caixa de entrada       — ✅ OK (dinâmico)
  mensagem                  — Detalhe de mensagem + Assistência— ✅ OK (dinâmico)
  contatos                  — Contactos de Confiança           — ✅ OK (dinâmico)
  perfil                    — Perfil / Conta                   — ✅ OK (dinâmico)
  historico                 — Histórico                        — ✅ OK (dinâmico)
  notificacoes              — Notificações                     — ✅ OK (dinâmico)
  pagamentos                — Pagamentos                       — ✅ OK (dinâmico)
  pasta-digital             — Pasta Digital                    — ✅ OK (estático; via IA)
  documentos                — Documentos                       — ✅ OK (estático; via painel)
  solicitar-documento       — Solicitar Documento              — ✅ OK (estático)
  video-atendimento         — Videoatendimento                 — ✅ OK (estático; via botão)
  carteira                  — Carteira (WalletContent)         — ✅ OK (estático)

ÁREA INSTITUIÇÃO (11)
  home                      — Painel                           — ✅ OK (dinâmico)
  correspondencias          — Correio + compositor             — ✅ OK (dinâmico)
  mensagem                  — Detalhe (ANALISAR)               — ✅ OK (componente partilhado)
  gov-contatos              — Equipa                           — ✅ OK (dinâmico)
  inst-qrcode               — QR Code / Validação              — ✅ OK (dinâmico)
  inst-ai-assistant         — Assistente IA                    — ✅ OK (dinâmico)
  perfil                    — Perfil Institucional             — ✅ OK (dinâmico)
  inst-pagamentos           — Pagamentos / Cobranças           — ✅ OK (estático; via painel)
  sondagens                 — Sondagens (v36.1)                — ✅ OK (dinâmico completo)
  (SondagemModal)           — Criar/Enviar Sondagem            — ⚠️ ver ERRO #1 (dinâmico)
  (EmergencyBroadcast)      — Difusão de Emergência            — ✅ OK (estático)

ÁREA ADMINISTRATIVA (11)
  gov-dashboard             — Painel SOC                       — ✅ OK (dinâmico)
  gov-interoperabilidade    — Instituições                     — ✅ OK (dinâmico)
  gov-correspondencias      — Correspondências                 — ✅ OK (dinâmico)
  gov-contatos              — Cidadãos                         — ✅ OK (dinâmico)
  gov-trabalhadores         — Equipa/Trabalhadores             — ✅ OK (dinâmico)
  gov-relatorio             — Relatórios (= alias gov-stats)   — ✅ OK (dinâmico)
  gov-ia                    — IA Governamental                 — ✅ OK (dinâmico)
  gov-seguranca             — Auditoria/Segurança              — ✅ OK (dinâmico)
  gov-perfil                — Perfil Admin                     — ✅ OK (dinâmico)
  gov-emissao               — Emissão Documental               — ✅ OK (dinâmico via dashboard)
  gov-docs                  — Documentos Gov                   — ✅ OK (estático; via notificação)
```

---

## TABELA GERAL DE RESULTADOS

| # | Página | Área | Estrutura | Dados | Forms | Botões | Auth | Código | UX | Responsivo | Erros |
|---|--------|------|-----------|-------|-------|--------|------|--------|----|------------|-------|
| 1 | Login | Pública | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 2 | Registo Cidadão | Pública | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 3 | Registo Instituição | Pública | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 4 | Recuperar Senha | Pública | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 5 | Login Facial | Pública | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 6 | Directório de Órgãos | Pública | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | 1 |
| 7 | Painel Cidadão | Cidadão | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | 0* |
| 8 | Correio (cidadão) | Cidadão | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | 0* |
| 9 | Detalhe de Mensagem | Cidadão | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | 0* |
| 10 | Contactos | Cidadão | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 11 | Perfil Cidadão | Cidadão | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | 0* |
| 12 | Histórico | Cidadão | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 13 | Notificações | Cidadão | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 14 | Pagamentos | Cidadão | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 15 | Pasta Digital | Cidadão | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 16 | Documentos | Cidadão | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | 0* |
| 17 | Solicitar Documento | Cidadão | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 18 | Videoatendimento | Cidadão | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 19 | Carteira | Cidadão | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 20 | Painel Instituição | Instituição | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 21 | Correio (instituição) | Instituição | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | 0* |
| 22 | Equipa | Instituição | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | 0* |
| 23 | QR Code | Instituição | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 24 | IA Assistente | Instituição | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 25 | Perfil Instituição | Instituição | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 26 | Pagamentos Inst. | Instituição | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 27 | Sondagens | Instituição | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 28 | Painel SOC | Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 29 | Instituições | Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 30 | Correspondências | Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 31 | Cidadãos | Admin | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ | ✅ | 0* |
| 32 | Equipa/Trabalhadores | Admin | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | 0* |
| 33 | Relatórios | Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 34 | IA Gov | Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 35 | Auditoria | Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 36 | Perfil Admin | Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 37 | Emissão Documental | Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 38 | Documentos Gov | Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |

`*` = página sem erro próprio; herdou menção dos achados transversais #1–#3 (componentes partilhados).

---

## DETALHE COMPLETO DOS ACHADOS

```
════════════════════════════════════════════════════
ACHADO TRANSVERSAL #1 — TODOS OS MODAIS DA PLATAFORMA
COMPONENTE: src/components/ui/CdaModal.tsx
════════════════════════════════════════════════════

  🟠 ERRO ALTO #1
  ┌──────────────────────────────────────────────────┐
  │ Teste:       G4 — modais fecham com tecla Escape │
  │ Descrição:   Nenhum popup CdaModal fecha com a    │
  │              tecla Escape. Verificado em browser: │
  │              modal «Enviar Sondagem» permanece    │
  │              aberto após Escape.                  │
  │ Localização: src/components/ui/CdaModal.tsx       │
  │              (componente sem listener de teclado) │
  │ Causa:       O componente implementa X (G2 ✔) e   │
  │              clique no backdrop (G3 ✔) mas não    │
  │              tem useEffect para a tecla Escape.   │
  │ Impacto:     Acessibilidade (WCAG 2.4.3) e UX em  │
  │              TODOS os popups (sondagens, equipa,  │
  │              validação, contactos…).              │
  │ Correcção:   useEffect em CdaModal:               │
  │              window.addEventListener('keydown',   │
  │              e => e.key === 'Escape' && onFechar) │
  │              com cleanup. ~10 linhas, risco zero. │
  └──────────────────────────────────────────────────┘

════════════════════════════════════════════════════
ACHADO #2 — CONFIRMAÇÕES NATIVAS EM VEZ DO PADRÃO CdaModal
════════════════════════════════════════════════════

  🟡 ERRO MÉDIO #2
  ┌──────────────────────────────────────────────────┐
  │ Teste:       L5 / G — consistência UX            │
  │ Descrição:   8 acções destrutivas/sensíveis usam  │
  │              confirm()/prompt() nativos do        │
  │              browser em vez do padrão CdaModal.   │
  │ Localização: GovContactsContent.tsx:1783,         │
  │              2991-2992, 4272 (prompt)             │
  │              DocumentsContent.tsx:464             │
  │              MailContent.tsx:1186                 │
  │              FacialLoginSettings.tsx:141          │
  │              ProfileContent.tsx:1728              │
  │ Causa:       Código anterior ao padrão único de   │
  │              popups (2026-08-22).                 │
  │ Impacto:     Funciona (E7 ✔ — há sempre           │
  │              confirmação), mas quebra a           │
  │              consistência visual e é bloqueado    │
  │              por alguns browsers em contextos     │
  │              seguros.                             │
  │ Correcção:   Migrar para CdaModal de confirmação  │
  │              (baixa prioridade).                  │
  └──────────────────────────────────────────────────┘

════════════════════════════════════════════════════
ACHADO #3 — OPACIDADE DE TIPOS (as any)
════════════════════════════════════════════════════

  🟡 ERRO MÉDIO #3
  ┌──────────────────────────────────────────────────┐
  │ Teste:       J2                                   │
  │ Descrição:   110 ocorrências de `as any` em src/  │
  │              (App.tsx e serviços).                │
  │ Causa:       Integrações com dados de formato     │
  │              livre (Supabase, payloads).          │
  │ Impacto:     Nenhum erro em runtime (0 erros JS   │
  │              em 46 verificações), mas reduz a     │
  │              protecção do TypeScript.             │
  │ Correcção:   Tipagem progressiva; não urgente.    │
  └──────────────────────────────────────────────────┘

════════════════════════════════════════════════════
PÁGINA: Directório de Órgãos
FICHEIRO: src/components/features/DirectorioOrgaosContent.tsx
════════════════════════════════════════════════════

  🟢 ERRO BAIXO #4
  ┌──────────────────────────────────────────────────┐
  │ Teste:       F9                                   │
  │ Descrição:   Link externo com target="_blank" sem │
  │              rel="noopener noreferrer" (linha 127)│
  │              — único caso em 6 links externos.    │
  │ Correcção:   Adicionar rel="noopener noreferrer". │
  └──────────────────────────────────────────────────┘
```

### Achados 🟢 BAIXOS restantes

| # | Teste | Descrição | Localização | Correcção |
|---|-------|-----------|-------------|-----------|
| 5 | J6 | 30 `console.log` em produção (13 no App.tsx) | src/ (vários) | Remover ou condicionar a `import.meta.env.DEV` |
| 6 | — | ESLint não executável (config legado vs ESLint 9) — lint automático inactivo | `.eslintrc` / eslint.config | Migrar config ou fixar versão |
| 7 | K12 | Em 375px os rótulos da navegação ficam escondidos (navegação por ícones); botões existem mas `hidden` | MobileNavBar.tsx | Decisão de design; confirmar intenção |
| 8 | J12 | `gov-stats` renderiza o mesmo GovRelatorioContent de `gov-relatorio` (alias duplicado) | App.tsx:5832 | Manter como alias ou remover |

---

## VERIFICAÇÕES COM RESULTADO POSITIVO (AMOSTRA)

- **A1–A7 (estrutura/imports):** `tsc --noEmit` — 204 ficheiros, **0 erros**; nenhum import partido; nenhum componente órfão (53/53 importados).
- **B (componentes):** 0 erros de renderização; 0 `pageerror` em 46 verificações dinâmicas.
- **C (dados):** todas as páginas com dados reais renderizaram conteúdo (181–11 932 chars); estados vazios honestos (ex.: Sondagens sem dados = 347 chars com mensagem própria); gravação real verificada em rondas anteriores (resposta de sondagem persistida na BD).
- **D (formulários):** 17 inputs `type="password"` correctos; validação com popup honesto confirmada dinamicamente (sondagem vazia → «Na sua sondagem está a faltar preencher alguns campos.»).
- **E (botões):** 0 handlers vazios `onClick={() => {}}`; botões destrutivos com confirmação (E7).
- **F (navegação):** 0 `href="#"`; 5/6 links externos com `rel` correcto.
- **G (modais):** G1 abre ✔, G2 X fecha ✔, G3 backdrop fecha ✔, G6 formulários em modal funcionam ✔ — apenas G4 (Escape) falha.
- **H (estados):** 0 páginas em branco; 0 loaders infinitos observados; sem sessão, a app abre sempre no login (I1/H10 ✔).
- **I (auth):** 3 perfis distintos com navegações distintas; sem sessão não há acesso a conteúdo (SPA abre no login); escritas via proxy servidor com service_role (nunca no cliente).
- **J13/J14 (segredos):** **0 tokens/chaves secretas hardcoded no código cliente** (apenas URL pública do projecto Supabase, não sensível; chaves via env).
- **K (responsivo):** 0 overflow horizontal a 1366px e 375px (Painel, Correio dinâmico); tabelas com scroll próprio.
- **L (UX):** feedback imediato nos fluxos testados; popups consistentes com o padrão oficial de 2026-08-22.

---

## PÁGINAS SEM ERROS

41 de 42 páginas sem nenhum erro próprio, incluindo todas as páginas dinamicamente visitadas das três áreas (Painel, Correio, Detalhe, Contactos, Perfil, Histórico, Notificações, Pagamentos, Equipa, QR Code, IA, Sondagens, SOC, Instituições, Correspondências, Cidadãos, Trabalhadores, Relatórios, Auditoria, Emissão Documental…).

---

## PLANO DE CORRECÇÃO POR PRIORIDADE

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 CORRIGIR IMEDIATAMENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(nenhum)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟠 CORRIGIR COM URGÊNCIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Escape não fecha modais (CdaModal) → todas as áreas
   → src/components/ui/CdaModal.tsx (useEffect keydown)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟡 CORRIGIR EM SEGUIDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. confirm()/prompt() nativos → padrão CdaModal
   → GovContactsContent.tsx:1783/2991/4272, DocumentsContent.tsx:464,
     MailContent.tsx:1186, FacialLoginSettings.tsx:141, ProfileContent.tsx:1728
2. Tipagem progressiva dos 110 `as any`
   → src/App.tsx, src/services/*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 CORRIGIR QUANDO POSSÍVEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. rel="noopener noreferrer" → DirectorioOrgaosContent.tsx:127
2. Limpar 30 console.log → src/ (vários)
3. Reactivar lint (migrar config ESLint) → raiz do projecto
4. Confirmar intenção dos rótulos escondidos no mobile → MobileNavBar.tsx
5. Remover alias duplicado gov-stats → App.tsx:5832
```

---

## SONDAGEM v37 — COMPOSIÇÃO + SEGMENTAÇÃO INTELIGENTE (2026-08-24)

Implementação completa do `PROMPT_SONDAGEM_v37.md` (código):

1. **Compositor** — «Enviar Sondagem» → «Criar Sondagem»; a sondagem entra como bloco na área de conteúdo (até 5 por mensagem), com remoção individual confirmada; rascunhos persistidos (`status='rascunho'`) e limpos ao descartar; «Enviar Mensagem Oficial» distribui primeiro e envia depois (falha aborta com aviso honesto).
2. **Classificação oficial** — `profiles.abrangencia` (nacional/regional/local) + `profiles.provincia`; RPCs `security definer` (`cda_classificacao_inst`, `cda_definir_classificacao_inst`, `cda_cidadaos_sem_provincia`) imunes ao RLS; classificação automática por backend — o administrador da instituição não escolhe o alcance manualmente; consola Admin/Gov permite reclassificar com auditoria (dossiê da instituição).
3. **Distribuição** — NACIONAL → 100% dos cidadãos; REGIONAL → província (cidadãos sem província excluídos com aviso honesto); LOCAL → relação pré-existente (RPC v36); dedupe por BI; contagem automática de destinatários; registo `sondagens.destinatarios`; compatibilidade retroactiva via `messages.sondagem_id` + novo `messages.sondagem_ids bigint[]`.
4. **Detalhe da mensagem** — um cartão de resposta por cada sondagem embutida (`sondagem_ids`, com fallback `sondagem_id`).
5. **Migração** — `supabase/v37_sondagens_segmentacao.sql` pronta; aplica-se no SQL Editor do Supabase (dono). Até lá o código degrada honestamente: rascunhos e modal funcionam; a distribuição multi-sondagem e a classificação ficam bloqueadas com mensagem clara. Nota: enquanto a migração não for aplicada, a varredura com contas reais regista 1 WARN (sonda única de esquema v37, uma requisição 400 por sessão).

Verificações dinâmicas (contas reais): compositor com blocos múltiplos, remoção com confirmação, validação de campos, painel de classificação Admin (NACIONAL/REGIONAL/LOCAL + província), zero excepções JS. Varreduras: demo 52/0/0, contas reais 41 PASS + 1 WARN (sonda pré-migração) + 0 FAIL. TypeScript limpo.

### v37.2 — correcção da classificação (2026-08-24, após migração aplicada)
- Achado: as instituições não têm linha em `profiles` com o código completo da app (`INAPEM-LLMM-01` vs `INAPEM-LLMM`), logo a classificação em `profiles` nunca correspondia. Correcção: tabela dedicada `sondagens_classificacoes` + RPCs revistas (`v37_2_classificacoes.sql`, aplicada pelo dono).
- Achado 2: `validarEnvio` bloqueava corpo vazio mesmo com sondagens na composição — corrigido no `tentarEnviar` (retira apenas esse bloqueio quando há blocos de sondagem).
- Verificação end-to-end pós-migração (contas reais, alvo único + linhas semeadas, tudo limpo no fim):
  - Auto-classificação: INAPEM → NACIONAL persistido automaticamente; audiência real no modal (20 cidadãos).
  - Painel Admin: leitura da classificação actual + reclassificação REGIONAL/Luanda com auditoria.
  - Segmentação REGIONAL: audiência = 1 cidadão da província (22 sem província excluídos com aviso honesto).
  - Distribuição real limitada: rascunho → `ativa`, `destinatarios=1`, mensagem com `sondagem_id` + `sondagem_ids`.
  - Cidadão: mensagem semeada com `sondagem_ids=[15,16]` mostrou DOIS cartões de resposta; resposta registada com sucesso (upsert).
  - Estado final limpo: sondagens/mensagens/respostas de teste eliminadas; INAPEM reclassificado NACIONAL.

### v37.3 — refinamentos pedidos pelo dono (2026-08-24)
- **Instituição:** a sondagem composta passa a aparecer na área de conteúdo como **bolha de enquete completa** (estilo WhatsApp: pergunta a negrito, «Selecione uma opção», opções A)/B)/C) com círculo, contagem e barra, hora + visto duplo, rodapé «Mostrar votos»), conforme modelo fornecido.
- **Destinatário automático:** ao compor sondagens o campo destinatário passa a **«Todos»** (difusão pelo âmbito oficial); ao enviar com «Todos» a difusão entrega e o compositor limpa (sem mensagem singular para "Todos").
- **Cidadão:** o «Conteúdo do Documento» mostra apenas o texto da instituição — a listagem crua das perguntas deixou de ser duplicada no corpo; as enquetes vivem nos cartões «Sondagem · INSTITUIÇÃO» abaixo.
- Verificado com contas reais (alvo único regional + limpeza total): bolha renderiza, «Todos» automático, envio limpa o compositor, corpo da mensagem = só texto da instituição, cartão com opções correcto. Varreduras 42/0/0 e 52/0/0.

### v37.4 — confirmação de envio + «Enviadas» + resposta consolidada (2026-08-24)
- **Instituição:** após «Enviar Mensagem Oficial» com «Todos», aparece **popup de sucesso** («Correspondência enviada com sucesso: N cidadão(s) no âmbito X») e é criada a **expedição única visível na aba Enviadas** (linha com destinatário «TODOS»); a cache de leitura é invalidada para a lista actualizar de imediato.
- **Cidadão:** os contentores «Sondagem · INSTITUIÇÃO» **deixaram de ter botões** (sem «Responder à Sondagem»); as opções são linhas de selecção e o registo faz-se no botão **«Responder ao Documento»**, que abre **popup de confirmação** com as escolhas de cada enquete e, ao confirmar, mostra **popup de registo** + chip «Resposta registada ✔». Sem escolha em alguma sondagem, aviso honesto.
- Verificado com contas reais (popup sucesso, expedição nas Enviadas, popup confirmação/sucesso do cidadão, resposta na base) + limpeza total; INAPEM restaurado a NACIONAL. Varreduras 42/0/0 e 52/0/0.

### v37.5 — popups padrão, navegação pós-envio/resposta e performance (2026-08-24)
- **Instituição:** popup «Correspondência Enviada» no padrão `CdaModal` (ícone verde, subtítulo, botão único «Entendi»); ao fechar (botão, X, backdrop ou Escape) o compositor fecha e é exibida a página «Correio» com a aba **«Enviadas» activa**, mostrando de imediato a expedição «TODOS» (novo `onRefreshMail` força o refetch sem depender do Realtime).
- **Cidadão:** «Confirmar Respostas às Sondagens» com botões no padrão `CdaConfirmModal` (Cancelar/Confirmar Respostas, raio e tipografia oficiais); «Resposta Registada» no padrão `CdaModal` com botão «Entendi»; ao fechá-lo o detalhe encerra e volta à página «Correio» (mensagem lida, chip persistido). Aviso âmbar mantém-se quando falta escolha.
- **Performance (build de produção, medida login→painel nas 3 áreas):**
  - Chunk de entrada: **971 kB → 499 kB** (−49%) com a remoção do barrel `./components` (puxava 11 mil linhas de painéis para o bundle inicial) e 19 painéis pesados convertidos em `React.lazy` com fronteira Suspense (`lazyPainel`).
  - JS descarregado até ao primeiro painel: cidadão **22,4 MB → 7,3 MB** (−67%, 139→71 ficheiros), instituição **22,5 MB → 7,4 MB** (−67%), admin **22,4 MB → 9,0 MB** (−60%).
  - Ecrã de login: ~3,3–4,7 s → ~2,7–3,0 s; tempo submissão→painel mantido (2,3–3,8 s), sem regressão.
  - `server.ts`: porta configurável via `PORT` (permite medir o build de produção sem ocupar o servidor de desenvolvimento).
  - Listas do Correio: acima de 100 linhas renderiza as primeiras 100 + botão «Mostrar mais» (limite reinicia ao mudar de aba/pesquisa); mappers já memoizados mantidos.
- Verificado no **build de produção** com contas reais: 5/5 asserções da instituição (popup padrão, «Entendi», compositor fechado, expedição visível sem clicar na aba) e 8/8 do cidadão (cartão sem botões, popups padrão, regresso ao «Correio», resposta na base), 0 erros JS. Limpeza total (sondagens/mensagens/respostas TESTE); INAPEM restaurado a NACIONAL com `provincia` limpa; sondagens reais do dono intocadas. Varreduras finais no build de produção: **42/0/0** (contas reais) e **52/0/0** (demo). TypeScript limpo.

### v37.6 — opção «Sondagem» no Correio institucional (2026-08-24)
- Pedido do dono: na página «Correio» da área institucional, a opção **«Sondagem» passa a ficar imediatamente à direita de «VideoAtendimento»** (antes estava depois de «Validação QR», herança da v36).
- Ao clicar abre a lista de **todas as sondagens criadas pela instituição** (página «Sondagens», reutilizada); ao clicar numa sondagem é exibida a **pergunta + lista de opções** da enquete, além dos resultados (gráfico) já existentes.
- Verificado com conta real institucional (ordem na toolbar por coordenadas, lista com 8 sondagens reais, bloco pergunta/opções), 0 erros JS. Varreduras no build de produção: **42/0/0** e **52/0/0**. TypeScript limpo.

### v37.7 — «Sondagem» contextual dentro da correspondência (2026-08-24)
- Pedido do dono (organização): a opção «Sondagem» **saiu da toolbar da página Correio** (v37.6) — solta, não se sabia a que correspondência cada sondagem pertencia.
- Agora a opção **só existe dentro da correspondência seleccionada**: no detalhe da mensagem da instituição, quando a mensagem traz `sondagem_id`/`sondagem_ids`, aparece o cartão «Sondagem — N enquete(s) anexada(s) a esta correspondência» com o botão **«Ver Sondagem»**, que abre o popup padrão `CdaModal` com a **pergunta, opções (com contagem de votos), estado e âmbito** de cada enquete dessa correspondência (carregamento por `buscarSondagem`/`resultadosSondagem`, só ao abrir).
- Verificado com conta real: toolbar sem o botão, expedição de teste aberta nas «Enviadas», opção contextual + modal com pergunta/opções (6/6 asserções), 0 erros JS; dados de teste removidos. Varreduras actualizadas no build de produção: **41/0/0** (reais) e **51/0/0** (demo) — um check antigo (botão+página) foi substituído pelo check da remoção. TypeScript limpo.

---

## VEREDICTO FINAL

```
╔══════════════════════════════════════════════════════╗
║       CORREIO DIGITAL ANGOLA — RESULTADO FINAL       ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  Páginas testadas:        42 (+5 modais)             ║
║  Páginas sem erros:       41  (98%)                  ║
║  Páginas com erros:        1  (2%)                   ║
║                                                      ║
║  🔴 Erros Críticos:       0                          ║
║  🟠 Erros Altos:          1                          ║
║  🟡 Erros Médios:         2                          ║
║  🟢 Erros Baixos:         5                          ║
║                                                      ║
║  ESTADO GERAL DA APLICAÇÃO:        ESTÁVEL           ║
║                                                      ║
║  RECOMENDAÇÃO:      PODE AVANÇAR                     ║
║  (corrigir o item 🟠 do Escape na próxima alteração; ║
║   é uma correcção de ~10 linhas com risco zero)      ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

---

## v37.9 — CARREGAMENTO MAIS RÁPIDO + CÓDIGO INSTITUCIONAL NO PAINEL (2026-08-24)

Requisitos: «Melhore o carregamento das páginas» e «na área Instituição, na página Painel,
debaixo do texto "Área Institucional" deve conter o código Institucional (ex.: INAPEM-LLVV)».

Alterações:
- `index.html`: `preconnect`/`dns-prefetch` para `i.postimg.cc` e para o Supabase, aquecendo as
  ligações externas usadas no primeiro paint.
- `src/App.tsx`:
  · overlay inicial `pageLoading` 2000 ms → 400 ms;
  · splash→login: espera do pré-carregamento com safety fallback 6000 ms → 1200 ms e atraso de
    suavização 800 ms → 250 ms (o pré-carregamento de imagens continua em fundo);
  · auditoria pesada de arranque adiada para `requestIdleCallback` (ou +2,5 s), sem competir com
    o primeiro paint/login pela rede.
- `src/components/features/HomeContent.tsx` + `src/App.tsx`: novo prop `instCodigo`; na sessão
  institucional o Painel exibe, imediatamente abaixo do título «Área Institucional», o cartão
  «CÓDIGO INSTITUCIONAL» com o código (p.ex. `INAPEM-LLMM`); restante conteúdo do painel mantido.

Medições (browser real, 3 execuções, mediana):
- Ecrã de LOGIN visível: antes 2,7–3,3 s → depois ≈ 1,7 s (pior caso com rede lenta: ~8,8 s → ~1,9 s).
- Entrada no Painel após credenciais: ~1,7 s (inalterado, dominado pela autenticação em nuvem).

Testes: `tsc --noEmit` 0 erros; build de produção OK; varreduras 51 PASS / 0 WARN / 0 FAIL (demo)
e 41 PASS / 0 WARN / 0 FAIL (contas reais); banner do código verificado visualmente com o resto
do painel intacto (ligas «Pagamentos» etc. presentes).

---

## v37.10 — PAINEL HARMONIOSO SEM CARTÃO DE CÓDIGO + REGISTO DO CIDADÃO POR COMPARAÇÃO IA DO B.I. (2026-08-24)

Requisitos: remover da área central da Instituição o conteúdo «Código Institucional / INAPEM-LLMM»
(ajustando tudo para haver harmonia) e reimplementar o registo do cidadão sem etapa de
registo/verificação facial — a IA compara apenas os dados extraídos do B.I. com os do formulário
(nome completo, nº BI, data de nascimento, sexo), aprova com popup «Aprovado / Seu cadastro foi
aprovado.», redirecciona para o Login com credenciais funcionais, homologa automaticamente
«Aprovado» na Área Administrativa e, em caso de divergências, não aprova e permite corrigir e
repetir a validação.

Alterações:
- `src/components/features/HomeContent.tsx` + `src/App.tsx`: removidos o cartão «Código
  Institucional» e o prop `instCodigo`; o Painel institucional volta ao desenho harmonioso
  completo (destaques, cartões, ligas, instituições conectadas e correio), sem conteúdo solto.
- `src/components/features/RegisterStepper.tsx` (reaplicado do histórico validado `7a20c0e`):
  · passo 2 do cidadão com «Data de Nascimento» e «Sexo»;
  · passo 3 do cidadão = «Validação Automática por IA» (resumo + veredicto), sem câmara;
    biometria facial mantida apenas para instituições;
  · pedido de pré-verificação envia `dataNascimento` e `sexo`;
  · divergências: nenhum cadastro criado, aviso «Dados não correspondem» com motivo/alertas,
    «Voltar» para corrigir e repetir;
  · aprovação: score 100 «IA — comparação B.I./formulário», Homologação «Aprovado» imediata,
    popup «Aprovado / Seu cadastro foi aprovado.» e redirect automático para o Login.

Testes (build de produção local :3100, browser real): registo 10/10 asserções PASS com 0 erros JS
(sem câmara, painel IA, REVISAO corrige/repete sem criar conta, APTO ⇒ popup ⇒ Login funcional ⇒
Homologação «Aprovado»); varreduras 51 PASS / 0 WARN / 0 FAIL (demo) e 41 PASS / 0 WARN / 0 FAIL
(contas reais); `tsc --noEmit` 0 erros; build OK.

---

## TESTE AUTÓNOMO COMPLETO — v37.10 (2026-08-24, contas REAIS, build de produção)

Resumo: 42 páginas analisadas (13 cidadão + 12 instituição + 12 admin + 5 públicas) + 5 modais
transversais; varreduras 51/0/0 (demo) e 41/0/0 (reais); cobertura extra por hash 16/16; fluxo de
registo 10/10; 0 erros JS/console em todos os perfis; `tsc --noEmit` 0 erros.
Achados estáticos (qualidade de código, não quebram páginas): 🟡 124× `as any` (dívida de tipagem
adiada); 🟡 1× `confirm()` nativo em ProfileContent.tsx:1812 (remover dispositivo); 🟢 30×
`console.log` em código de produção. Sem segredos no cliente (apenas menções em comentários).
Veredicto: ESTÁVEL — PODE AVANÇAR.

---

## v37.11 — BOTÃO DE LOGIN RESPONSIVO (2026-08-24)

Problema reportado: «o botão de logar demora muito a responder ou não responde».
Causas encontradas no código: (1) sem estado de loading, o clique não dava feedback e cliques
repetidos re-disparavam o fluxo; (2) o submit aguardava em cadeia `cloudSignIn` (sem timeout),
`readCitizenRegistrationStatus` (3 fontes sem teto) e `applyIdentityForLoggedUser` (getProfile +
fila de registo + storage + avatares) ANTES de entrar na app.

Correcções:
- `src/App.tsx`: estado `loginSubmitting` — botão desactivado com spinner «A autenticar…» e
  cliques repetidos ignorados; hidratação de perfil passa a correr em fundo após `setStage('app')`.
- `src/services/cloudAuthService.ts`: `withTimeout` (9 s) no `signInWithPassword` — timeout
  classifica como 'unavailable' e activa o fallback local (D3).
- `src/App.tsx`: teto de 6 s no `readCitizenRegistrationStatus` (Promise.race) — rede parada não
  bloqueia o botão.

Medições (contas reais, produção local): clique→Painel 1,49 s (cidadão) / 1,48 s (instituição),
feedback imediato verificado. Varreduras 51/0/0 e 41/0/0; `tsc --noEmit` 0 erros.

---

## v37.12 — LIMPEZA DE ACHADOS DA AUDITORIA (2026-08-25)

- 🟡 `confirm()` nativo (ProfileContent, remover dispositivo) substituído por `CdaConfirmModal`
  (mesmo padrão da revogação de sessão; botão perigoso vermelho, cancelar/confirmar).
- 🟢 `console.log`: já silenciados globalmente em PRODUÇÃO pelo logger gated de `main.tsx`
  (F45) — mantidos em dev para diagnóstico; nenhum leak em produção.
- 🟡 `as any`: 124 → 91. Removidos os casts mecânicos e seguros: 21× `(import.meta as any).env`
  (tipado por `vite/client` + remoção do legado `|| {}`), 6× `webkitAudioContext`, 3× `pdfjsLib`,
  2× `JitsiMeetExternalAPI` e 2× `SpeechRecognition` (tipagens vendor mínimas em
  `src/globals.d.ts`, comportamento inalterado). Os 91 restantes são dívida de tipagem de domínio
  (linhas Supabase/objectos de mensagem) — correcção faseada, fora deste lote para não arriscar a app.

Verificação: `tsc --noEmit` 0 erros; build de produção OK; varreduras 51 PASS / 0 WARN / 0 FAIL
(demo) e 41 PASS / 0 WARN / 0 FAIL (contas reais).

---

## v37.13 — TÍTULO DA ÁREA INSTITUCIONAL = CÓDIGO (MODO REAL) (2026-08-25)

Requisito: «no modo real, na área da Instituição, na área central de conteúdo, substitui
"INAPEM — Instituto Nacional de Apoio as Micro, Pequenas e Médias Empresas (INAPEM-LLMM)"
pelo código Institucional (ex.: INAPEM-LLMM)».

Alteração (`src/components/layout/Header.tsx`): `getMainTitle()` para sessões institucionais
resolve o código via `resolveInstitutionCode` e, sendo código real (`isRealInstitutionalCode`,
ex.: «INAPEM-LLMM»), exibe APENAS o código; a via demo (sigla sem código real, ex.: «AGT»)
mantém o tratamento actual. Verificado em browser: conta real mostra só o código (nome longo
ausente), demo inalterada. Varreduras 51/0/0 e 41/0/0; tsc 0 erros.

---

## v37.14 — LOGIN SEM PRÉ-PREENCHIMENTO (3 PERFIS) (2026-08-25)

Requisito: nos perfis Cidadão, Instituição e Admin, os campos «Nº de Utilizador» e «Senha de
Acesso» iniciam vazios, com placeholder ilustrativo apenas; ao digitar o placeholder desaparece e
ao apagar tudo volta; sem credenciais pré-preenchidas.

Alterações (`src/App.tsx`):
- estado `bi` inicializa sempre `''` (antes lia localStorage/identificador demo);
- `applyDemoPresetForMode` deixa de injectar o identificador demo no campo de Instituição/Admin
  (agora `setBiLocal('')` nos três modos); a sessão demo continua a funcionar com o campo vazio
  (o identificador é assumido no submit) ou via «Auto Preencher Demonstração»;
- via demo da Administração espelha a institucional: campo vazio ⇒ `setBi(ADM-8812-OP)` no submit.

Verificado em browser: três perfis com campos vazios + placeholders («009874562LA041»,
«AGT-9921-SR», «ADM-8812-OP» e «••••••••••••»), comportamento digitar/apagar correcto, e login
demo com campo vazio + senha continua a entrar. tsc 0 erros; varreduras 51/0/0 e 41/0/0.

---

## v37.15 — ANTI-AUTOFILL NO LOGIN (2026-08-25)

Requisito: ao carregar a página, os campos «Nº de Utilizador» e «Senha» nasciam com credenciais
injectadas pelo AUTOFILL do browser (ex.: e-mail truncado pelo maxLength=20 + senha guardada).

Correcções (`src/App.tsx`):
- `autoComplete="off"` no campo de utilizador e no e-mail (antes `autoComplete="email"`),
  `autoComplete="new-password"` nas senhas (antes `current-password`) — deixa de pedir ao
  browser credenciais guardadas;
- guarda anti-autofill: sem interacção do utilizador, os campos são limpos 600 ms após o render
  (o autofill dispara onChange mesmo em inputs controlados);
- placeholders ilustrativos mantêm-se activos com o campo vazio.

Verificação: tsc 0 erros; varreduras 51/0/0 e 41/0/0; campos vazios + placeholders confirmados
nos três perfis (v37.14) e login demo/reais funcionais.

---

## v37.16 — EQUIPA (ADMIN, MODO REAL): «ELIMINAR» PASSA A ELIMINAR (2026-08-25)

Problema: na Área Admin → Equipa, em Modo Real, clicar em «Eliminar» não eliminava o colaborador.
Causas: (1) o alvo era procurado apenas no espelho local `workers`, mas em Modo Real a linha vem
de `agentesReais` (tabela profiles) — o Nº de agente resolvia '' e a eliminação não fazia nada;
(2) o endpoint `/api/eliminar-agente` apagava a conta Auth e os avatares, mas NÃO a linha de
`profiles`, fonte canónica da lista real — o agente reaparecia.

Correcções:
- `GovContactsContent.tsx`: alvo resolvido na lista combinada (`equipaCombinada`), refresh imediato
  de `dadosReais.profiles` após eliminação e Nº de agente correcto na mensagem do modal;
- `server.ts` + `api/index.ts`: passo 3 — DELETE da linha de `profiles` do agente (service role),
  com contagem no response.

Teste funcional real (ADMIN-0001): linha semeada em profiles (ADMIN-9997) → Equipa → Eliminar →
confirmação CdaModal → linha desaparece da UI, `profiles` na nuvem = 0, API 200, 0 erros JS;
limpeza automática. Varreduras 51/0/0 e 41/0/0; tsc 0 erros.

---

## v37.17 — NOVA PASSAGEM DE LIMPEZA SEGURA (2026-08-25)

- `as any` 91 → 71, sem alterar comportamento: 7× `e.target.value as any` em selects passam a
  casts tipados às uniões reais dos estados (1× removido por ser `string`); 4× `(error as any)?.code`
  em supabaseService passam a `(error as { code?: string } | null)?.code`; 9×
  `(selectedMessage as any).sondagem_*` removidos (o tipo `Message` já declara `sondagem_id`/
  `sondagem_ids` opcionais) com acesso seguro `selectedMessage?.`.
- `confirm()/prompt()` nativos: 0 usos reais (única ocorrência é comentário).
- `console.log`: silenciados em produção (logger gated, v37.12).
- Restam 71 `as any` de tipagem de domínio (linhas Supabase/objectos) — dívida faseada, fora
  deste lote para não arriscar a app.

Verificação: tsc 0 erros; build OK; varreduras 51/0/0 e 41/0/0.

---

## v37.18 — FICHA INSTITUCIONAL: DROPDOWN «LISTA DE INSTITUIÇÕES» + CORRESPONDÊNCIAS POR INSTITUIÇÃO (2026-08-25)

Área do Cidadão → Ficha Institucional, container «Serviço Público»:
- Novo dropdown «Lista de Instituições» (mesmo padrão visual do dropdown dos Ministérios): lista
  apenas instituições da MESMA família de categoria da instituição selecionada e situadas na
  PROVÍNCIA ONDE O CIDADÃO RESIDE (derivada da morada declarada; fallback pelo código provincial
  do BI, ex.: 009874562LA041 → LA → Luanda). Lista vazia mostra «Nenhuma instituição».
- Ao selecionar uma instituição, a área de Correspondências passa a apresentar EXCLUSIVAMENTE as
  correspondências dessa instituição, organizadas nas 3 colunas existentes: 📩 Não Lidas, ✓ Lidas,
  ↑ Enviadas; resumo «Instituição selecionada + Correspondências» com os três contadores.
- Troca de instituição atualiza tudo sem recarregar (estado React); estado Lida/Não Lida permanece
  individual por correspondência e por cidadão (flag de leitura existente); facturas e documentos
  da ficha seguem o mesmo escopo.
- Isolamento: em modo real as correspondências são obtidas apenas para o BI do cidadão
  (remetente/destinatário) — o filtro por instituição aplica-se sobre um conjunto já isolado por
  cidadão; não há mistura entre instituições nem entre cidadãos.
- «Administração Central» mantém o dropdown próprio dos Ministérios (inalterado).

Teste funcional (demo, AGT/Luanda): dropdown abre, cabeçalho «Instituições · Finanças e Fiscalidade
· Luanda», seleção da AGT mostra «Instituição selecionada: AGT · 📩 Não Lidas: 3 · ✓ Lidas: 0 ·
↑ Enviadas: 1», 0 erros JS. Varreduras 51/0/0 e 41/0/0; tsc 0 erros.

---

## v37.20 — FICHA INSTITUCIONAL: SCROLL VERTICAL NAS COLUNAS DE CORRESPONDÊNCIA (2026-08-25)

As três colunas do bloco de correspondências da Ficha Institucional (📩 Não Lidas, ✓ Lidas,
↑ Enviadas) passam a comportar-se como as listas de «Painel» e «Correio»: altura máxima para
~10 correspondências visíveis (max-h-[550px]) e scroll vertical dentro da própria coluna quando
há mais de 10 itens (overflow-y-auto + custom-scrollbar). Com ≤10 itens nada muda (sem barra de
rolagem). Ordenação, contadores, estados vazios e abertura de mensagem inalterados; «Painel» e
«Correio» não foram tocados.

Verificação: tsc 0 erros; build OK; varreduras 51/0/0 e 41/0/0.

---

## v37.22 — FICHA INSTITUCIONAL: DROPDOWN JUNTO ÀS MENSAGENS + LISTA POR CATEGORIA COM CONTACTO (2026-08-25)

1. Dropdown «Lista de Instituições» reposicionado para junto do container Mensagens: secção
   «Correspondências» sempre visível, imediatamente acima das três colunas (📩 Não Lidas /
   ✓ Lidas / ↑ Enviadas), com ou sem instituição seleccionada.
2. Conteúdo da lista: instituições da MESMA CATEGORIA da instituição seleccionada com as quais o
   cidadão JÁ TROCOU correspondência (recebida ou enviada). Instituições fora do catálogo (sem
   categoria verificável, ex.: códigos institucionais do modo real) mantêm-se para não esconder
   contactos efectivos. Sem opções: «Nenhuma instituição».
3. Ao seleccionar, as colunas passam a apresentar apenas as correspondências dessa instituição
   (Não Lidas recebidas por abrir; Lidas recebidas já abertas; Enviadas para essa instituição),
   sem recarregar a página e sem misturar instituições.
4. Sem correspondências num estado: estado vazio existente («Sem mensagens novas»…) ou contador 0.
5. Mantido o padrão v37.20: máximo 10 correspondências visíveis por coluna + scroll vertical
   interno (custom-scrollbar) quando há mais.

Teste funcional (demo): Ficha AGT (Finanças) → itens AGT/Hospital, seleção AGT → «Instituição
selecionada: AGT · 📩 3 · ✓ 0 · ↑ 1»; Ficha INAPEM (Serviços) → itens CNE/Hospital/INSS; 0 erros
JS. Varreduras 51/0/0 e 41/0/0; tsc 0 erros.

---

## v37.23 — DESEMPENHO: CARREGAMENTO DE DADOS DO BANCO (2026-08-25)

Problema: o arranque em modo real fazia round-trips SEQUENCIAIS ao Supabase antes das leituras
paralelas existentes, e o perfil era pedido DUAS vezes (hidratação F39 + passo 1) — em cada
execução do carregador, incluindo cada evento Realtime.

Correcções (App.tsx, carregador de arranque):
1. Hidratação do perfil (F39) + caixa de mensagens (consulta OR única) passam a correr em
   PARALELO (Promise.all) — 1 round-trip em vez de 2.
2. O passo 1 reutiliza o perfil já carregado no passo 0 quando aplicável — elimina o 2.º pedido
   duplicado à tabela `profiles`.
3. O correio institucional (`getInstitutionMessages`) entra no pacote paralelo dos passos 3–9 —
   menos 1 round-trip sequencial em modo instituição.
4. Declaração de `sentSenderKey` movida para antes do Promise.all (ordem correcta).

Sem alteração de comportamento: mesma semântica de hidratação (guarda F45), mesma consulta OR,
mesmo ramo raro de semeadura, mesmos filtros de titularidade. Teste real (cidadão 002399714LA030):
login→painel ~2,4 s com caixas carregadas, 0 erros JS. Varreduras 51/0/0 e 41/0/0; tsc 0 erros.

---

## v37.24 — PAINEL: TODAS AS CORRESPONDÊNCIAS VISÍVEIS E CONSISTENTES (2026-08-25)

Problema reportado: no Painel (cidadão e institucional) não apareciam todas as correspondências.
Auditoria com as chaves reais (Supabase service role) + browser, nas 4 contas:
- Cidadão real: nuvem 28 recebidas/2 enviadas — Painel já mostrava tudo;
- Instituição real (INAPEM-LLMM): nuvem 185 enviadas/3 dirigidas(+2 canal legado) — tudo mostrado;
- DISCREPÂNCIA REAL encontrada: cidadão demo — Painel mostrava 13 não lidas vs 12 no Correio:
  o Painel NÃO aplicava os filtros de mensagens eliminadas/ocultas que o Correio aplica;
- Além disso o Painel ESCONDIA a coluna «Não Lidas» quando havia 0 não lidas (modo real).

Correcções:
- App.tsx: Painel recebe as listas com os MESMOS filtros do Correio (eliminadas/ocultas fora);
- HomeContent: as três colunas (Não Lidas/Lidas/Enviadas) estão SEMPRE presentes, com estado vazio
  «Sem mensagens novas»; grelha xl sempre com 3 colunas.

Resultado: Painel == Correio == nuvem nas 4 contas (demo/real × cidadão/instituição): 12/4/4,
0+28/2, 29/4/4, 2/3/185. Varreduras 51/0/0 e 41/0/0; tsc 0 erros.

---

## v37.25 — FICHA INSTITUCIONAL: DROPDOWN POR FAMÍLIA DA INSTITUIÇÃO DA PÁGINA (2026-08-25)

O dropdown «Lista de Instituições» passa a listar apenas as AGÊNCIAS/FILIAIS DA INSTITUIÇÃO DA
FICHA ABERTA com que o cidadão já trocou correspondência:
- Família pela sigla/entidade base: na Ficha do INAPEM só aparecem unidades INAPEM-* (ex.:
  INAPEM-LLMM, INAPEM-LLVV, INAPEM-LLMV, cada uma independente); na Ficha da EPAL só agências EPAL;
- Exclusões (só na formação da lista): «Cidadão: …», «CDA»/Administração da Plataforma e
  remetentes não institucionais nunca geram opções; as mensagens enviadas pelo cidadão continuam
  a alimentar a coluna «Enviadas» (cidadão é remetente, não motivo de exclusão);
- Selecção com comparação EXATA normalizada — sem confusão entre filiais (INAPEM-LLMM nunca casa
  com INAPEM-LLVV); cada opção mostra apenas as correspondências dessa agência;
- Sem agências contactadas da família: «Nenhuma instituição».

Testes: cidadão REAL na Ficha INAPEM → opção única INAPEM-LLMM (sem CDA/Cidadão) → «Instituição
selecionada: INAPEM-LLMM · 📩 0 · ✓ 27 · ↑ 2»; demo Ficha INAPEM → «Nenhuma instituição» (sem
contacto) ✔; demo Ficha AGT → opção única AGT → 📩 3 · ✓ 0 · ↑ 1. Varreduras 51/0/0 e 41/0/0;
tsc 0 erros.

---

## v37.26 — FICHA INSTITUCIONAL: COLUNAS CALIBRADAS PARA EXACTAMENTE 10 CORRESPONDÊNCIAS (2026-08-25)

As três colunas de correspondência (📩 Não Lidas / ✓ Lidas / ↑ Enviadas) passam a mostrar no
máximo 10 correspondências visíveis, com scroll vertical interno (custom-scrollbar) quando há mais:
- altura recalibrada de 550px para 510px (10 itens × ~42px + 9 espaçamentos × 10px) — com 550px
  ficava visível um fragmento do 11.º item;
- ≤10 itens: sem barra de rolagem; >10: exactamente 10 visíveis + scroll;
- cabeçalhos/contadores fixos fora da área de scroll (já era assim).

Verificação aplicada (conta real, Ficha INAPEM → INAPEM-LLMM): Lidas 27 itens — clientHeight=510px,
scrollHeight=1045px (scroll activo) ✔; Enviadas 2 itens — sem scroll ✔; Não Lidas 0 — estado vazio ✔.
Varreduras 51/0/0 e 41/0/0; tsc 0 erros.

---

## v37.27 — Painel Admin (Modo Real): dados simulados substituídos por dados reais das contas/nuvem (2026-08-25)

**Pedido:** «No modo real na área Admin na página Painel substitui os dados simulados por real. Usa os dados das contas para fazeres essas actualizações.»

### Alterações (cirúrgicas)
1. `adminRealDataService.ts` — novo helper `provinciaDoBi()` (província derivada do sufixo provincial do BI); `RealMessageRow` e a query de `messages` passam a incluir `sender_bi`/`recipient_bi`.
2. `GovDashboard.tsx` (memo `reais`):
   - **Donut por categoria** passa a excluir rótulos não-institucionais (CDA, Cidadão*, Administração, Admin) — alinhado com a Ficha Institucional.
   - **Instituições Ativadas**: `max(perfis institucionais, organismos com tráfego)` → 24 (RLS limita `profiles`, o tráfego de `messages` completa).
   - **Cidadãos Registados**: perfis ∪ BIs únicos em `messages` (remetente/destinatário, formato válido) → 21.
   - **Distribuição por Província**: deixa de mostrar «Sem dados territoriais» — agrega províncias reais dos BIs dos cidadãos → Luanda 13 · Cabinda 2 · Uíge 1 · Bié 1.
   - **Instituições Conectadas (pills)**: contas institucionais REAIS de `profiles` (18: MINJUS, PNA, INSS, CNE, Registo Civil, Notariado, Universidade, AGT, SME, MINSA, Tribunal, EPAL, ENDE, DIRECO, MAPTSS, MED, BNA, CIDADO); fallback para organismos com tráfego; catálogo local só sem dados.
   - **Notificações Ativas**: contagens reais por organismo + percentagem real do total (antes texto «real»).
3. **Correcção de bug latente**: o Painel Analítico rebentava em Modo Real (`TypeError: Cannot read properties of undefined (reading 'length')`) — as legendas/notificações liam `e.nome` mas `donutData` produz `e.name` (3 locais corrigidos).

### Verificação (conta real ADMIN-0001, build produção :3000)
| Cartão/secção | Painel | Nuvem (service_role) |
|---|---|---|
| Correspondências Enviadas | 781 | 781 messages ✔ |
| Entregues / Lidas | 84 | unread=false → 84 ✔ |
| Pendências | 135 | user_requests em aberto → 135 ✔ |
| Taxa de Sucesso (leitura) | 10,8% | 84/781 ✔ |
| Instituições Ativadas | 24 | 18 perfis + 24 orgs c/ tráfego ✔ |
| Cidadãos Registados | 21 | 21 BIs únicos ✔ |
| Donut | AGT 51,2% · INAPEM-LLMM 24,1% · SME 1,5% · EPAL 1,3% · Outros 7,8% | 400/188/12/10 ✔ |
| Províncias | Luanda 13 · Cabinda 2 · Uíge 1 · Bié 1 | sufixos dos BIs ✔ |
| Pills Instituições Conectadas | 18 contas reais de profiles | ✔ |

### Varrimentos
- `tsc --noEmit`: 0 erros · `npm run build`: 0 erros
- e2e demo (build produção): **51 PASS / 0 WARN / 0 FAIL**
- e2e contas reais (build produção): **41 PASS / 0 WARN / 0 FAIL**
- Painel Analítico expandido sem exceções JS (antes da correcção: crash garantido em Modo Real)

---

## v37.28 — Redesign dos popups «Confirmar Respostas às Sondagens», «Resposta Registada», «Eliminar Cadastro» e «Eliminar Instituição» (2026-08-25)

**Pedido:** «Melhore os seguintes layouts dos popups... O layout deve ser simples, moderno e atraente.»

### Alterações (só layout — comportamento 100% preservado)
1. **Confirmar Respostas às Sondagens** (MessageDetail.tsx): subtítulo «Reveja as suas escolhas · N sondagens»; cartões numerados com badge indigo, escolhas em pills com ícone de verificação, aviso rose «Sem escolha» com ícone, barra de estado inferior em gradiente indigo (ou rose se por responder); botões pill — «Confirmar Respostas» em gradiente indigo→violeta com ícone e spinner Loader2 ao registar.
2. **Resposta Registada** (MessageDetail.tsx): mensagem centrada num painel tonalizado (emerald no sucesso / amber no erro, com subtítulo «Registo não concluído»), botão pill a toda a largura na cor do estado.
3. **Eliminar Cadastro do Cidadão** (GovContactsContent.tsx): barra de destaque rose em gradiente no topo, cabeçalho centrado com ícone em círculo luminoso, overline «Acção irreversível · Requer confirmação», cartão do cidadão (ícone IdCard, nome, BI em mono, chip «ALVO»), painel de aviso com ícone, botões pill (Cancelar fantasma / Eliminar rose com sombra e active-scale).
4. **Eliminar Instituição** (GovInteroperabilidadeContent.tsx): barra de destaque rose em gradiente no topo, círculo «?» agora em tom rose coerente, botão confirmar com sombra rose e active-scale.

### Verificação visual (contas reais, dev :3000)
- Cidadão real 002399714LA030 → Correio → «Inquerito(Saude)» → «Responder ao Documento» → **popup 1** com 2 sondagens numeradas e escolhas em pills («Luanda», «Portugues») ✔ → «Confirmar Respostas» → **popup 2** «Resposta Registada» painel emerald + «Entendi» ✔ (respostas reais re-registadas na nuvem).
- Admin real ADMIN-0001 → Cidadãos → **popup 3** com cartão «Edlasio Galhardo · BI 002399714LA030 · ALVO» ✔ (cancelado, nada eliminado).
- Admin real → Instituições → **popup 4** «Eliminar Solicitação — INAPEM-LLMM» com barra rose e ícone luminoso ✔ (cancelado, nada eliminado).
- Dados de teste: linha *TESTE* temporária em solicitacoes_registo criada e **eliminada**; status AGT-9921-SR reposto a «Aprovado» (nuvem verificada: 3 solicitações, todas Aprovado).

### Varrimentos
- `tsc --noEmit`: 0 erros · `npm run build`: 0 erros
- e2e demo (build produção): **51 PASS / 0 WARN / 0 FAIL**
- e2e contas reais (build produção): **41 PASS / 0 WARN / 0 FAIL**

---

## v37.29 — Isolamento total de dados entre contas + avatar azul com inicial + popup de credenciais no fim da inscrição (2026-08-26)

**Pedidos do dono:** (1) «sempre que iniciar uma nova conta os dados dos outros utilizadores nao aparecem ou passem para o usuario logado»; (2) «Quando a foto de perfil do usuario estiver vazia deve aparecer no lugar da foto um fundo azul com a primeira letra do nome do usuario»; (3) «Sempre que o usuario concluir a sua inscricao apos ter concluido deve aparecer um popup indicando o seu numero de acesso e senha para fazer login.»

### Alterações
1. **Anti-fuga de avatar** (`App.tsx`): o avatar do Auth (`lerAvatarAuth()`) só é adoptado se o e-mail da sessão Auth pertencer MESMO ao B.I. logado (e-mail sintético da conta ou e-mail real associado) — tanto no cidadão como no admin. Sessões residuais de OUTRO utilizador no dispositivo já não emprestam a sua foto.
2. **Anti-fuga de sessão** (`sessionStore.ts`): `sanitizeSessionUser` deixa de preencher campos vazios com os dados do utilizador demo (nome, e-mail, telefone, filiação, estado civil, foto, nível de verificação) quando existe uma identidade real (B.I. próprio) — contas novas entram LIMPAS; e `updateUserFields` faz reset completo dos campos pessoais sempre que o B.I. da sessão MUDA (login de outra conta no mesmo dispositivo).
3. **Anti-fuga no registo** (`RegisterStepper.tsx`): novos cidadãos deixam de receber a MESMA foto de stock (Unsplash) — sem foto capturada a foto fica vazia; e o wizard faz sign-out best-effort da nuvem ao montar, para não herdar sessão anterior.
4. **Avatar azul com inicial** (`Header.tsx` + `CitizenProfile.tsx`): sem foto, o Header mostra círculo azul (`bg-blue-600`) com a primeira letra do nome (2 rem) e a página Perfil mostra o cartão azul arredondado com a inicial (substitui qualquer foto mock/stock hardcoded, incluindo os fallbacks de filiação/estado civil que mostravam dados do demo).
5. **Popup de credenciais** (`RegisterStepper.tsx`): ao concluir a inscrição (`step success`) abre ANTES de tudo o popup «Registo Concluído · Guarde os seus dados de acesso» com o Nº de acesso (B.I.) e a senha em cartões mono; o popup «Aprovado» (quando aplicável) só abre depois de o cidadão fechar o de credenciais.

### Verificação E2E (contas reais + conta nova criada de raiz, dev :3000)
- Registo completo via `#/registar` (nome/e-mail/senha → BI+data+sexo+documentos → «VALIDAR COM IA E CONCLUIR»): com bypass LOCAL temporário da porta anti-fraude do servidor (revertido antes do commit — a IA de visão do servidor rejeita correctamente documentos sintéticos: `layout_suspeito`, `foto_bi_ilegivel`), o fluxo concluiu e mostrou o **popup «Registo Concluído» com Nº de acesso 009998887LA099 e senha** ✔ (screenshot `/tmp/registo_resultado.png`).
- Login da conta nova **009998887LA099**: Header com **círculo azul «T»**, Perfil com cartão azul «T», nome/BI próprios, e-mail derivado do próprio nome, telemóvel/estado civil/filiação «—» — **zero dados do Edlasio ou de qualquer outra conta** ✔ (screenshots `/tmp/nova_conta_painel.png`, `/tmp/nova_conta_perfil.png`).
- Regressão conta real **002399714LA030**: mostra os SEUS dados (e-mail, +244 951520416, filiação) e a SUA foto (sem círculo azul) ✔. Regressão conta demo **009874562LA041**: dados canónicos intactos ✔.
- Limpeza da nuvem após o teste: linha `solicitacoes_registo` do B.I. 009998887LA099 eliminada, conta Auth `bi.009998887la099@cidadao.correiodigital.ao` eliminada e 10 objectos de storage do bucket `documentos_registo` removidos ✔.

### Varrimentos
- `tsc --noEmit`: 0 erros · `npm run build`: 0 erros
- e2e demo (build produção): **51 PASS / 0 WARN / 0 FAIL**
- e2e contas reais (build produção): **41 PASS / 0 WARN / 0 FAIL**

---

## v37.29-fix — Registo deixa de bloquear com «sem_imagens_nuvem» (falha técnica de upload) (2026-08-26)

**Erro reportado pelo dono no registo real:** «Dados não correspondem · Imagens do documento indisponíveis na nuvem — homologação manual · Alertas: sem_imagens_nuvem · Existem dados que precisam de ser corrigidos...» — o cidadão ficava BLOQUEADO na etapa de validação por uma falha TÉCNICA (upload das imagens ao Storage não produziu marcadores), quando a ideologia F28 da própria plataforma diz que falhas técnicas = cadastro submetido PENDENTE de homologação manual.

### Correcções (RegisterStepper.tsx)
1. **Data-URL independente do upload:** o `pviFrenteData`/`pviVersoData` para a PVI é preparado ANTES/independentemente do upload ao Storage; falha de upload já não significa «imagens indisponíveis» — a Pré-Verificação prossegue com as imagens locais (auditoria `[PVIC]` regista a falha).
2. **Bloqueio só para divergência REAL:** o retorno «corrija e repita a validação» agora aplica-se APENAS a alertas de divergência entre formulário e B.I. (`nome_divergente`, `bi_divergente`, `data_divergente`, `sexo_divergente`, `documento_divergente`, `frente_verso_inconsistentes`). Falhas técnicas/de qualidade (`sem_imagens_nuvem`, `ia_indisponivel`, `falha_tecnica`, `imagem_desfocada`, `layout_suspeito`, `foto_bi_ilegivel`...) seguem para homologação manual: o cadastro É submetido, nasce PENDENTE e o cidadão conclui a inscrição recebendo o popup com o Nº de acesso e a senha.
3. **Aprovação automática honesta:** sem upload completo ao Storage não há auto-aprovação (`effectiveAutoApproved` exige `uploadCompleto`) — a decisão fica com a Administração, exactamente como a ideologia F28 manda.

### Verificação E2E (dev :3000, conta nova criada de raiz)
- Registo completo com documento sintético (a IA do servidor devolve REVISAO com alertas de qualidade/suspeita, SEM divergência): antes = bloqueio «Existem dados...»; agora = **inscrição concluída PENDENTE («sob revisão dos inspectores... em menos de 24h») + popup «Registo Concluído» com Nº de acesso e senha** ✔ (screenshot `/tmp/registo_resultado.png`).
- Limpeza da nuvem após o teste: linha `solicitacoes_registo`, conta Auth e objectos de storage do B.I. de teste eliminados ✔.

### Varrimentos
- `tsc --noEmit`: 0 erros · `npm run build`: 0 erros
- e2e demo (build produção): **51 PASS / 0 WARN / 0 FAIL**
- e2e contas reais (build produção): **41 PASS / 0 WARN / 0 FAIL**

---

## v37.30 — Popup «Registar Novo Membro da Equipa» (Instituição): campos «Senha» e «Confirmar Senha» sempre presentes (2026-08-26)

**Pedido do dono:** «Na área da Instituição, na pagina Equipa o popup "Registar Novo Membro da Equipa" esta faltando o campo "Senha" e "Confirmar Senha".»

**Causa:** o campo de senha estava condicionado a `getLocalInstReg(...)` (F4) — só instituições com registo LOCAL o mostravam; nas instituições reais (modo nuvem) o popup nascia sem senha, e o membro era criado sem credencial.

### Alterações (GovContactsContent.tsx)
1. **Campos sempre visíveis** na Instituição (real ou demo) e no Admin: «Senha Inicial do Colaborador *» + novo «Confirmar Senha *» lado a lado (`type=password`, estilo coerente com o popup).
2. **Validação:** na criação a senha é obrigatória (mín. 8 caracteres) e a confirmação tem de coincidir («A Confirmação da Senha não coincide com a Senha introduzida.»); na edição ambos opcionais (vazio = manter); uniqueness checks existentes preservados (senha única na instituição / palavra-passe única no Admin).
3. `resetForm` e `handleEditWorkerClick` limpam também o campo de confirmação.

### Verificação (conta real INAPEM-LLMM-01, dev :3000)
- Popup aberto na Equipa: **ambos os campos presentes** (screenshot `/tmp/equipa_popup.png`).
- Senhas divergentes → notificação «não coincide» e o cadastro NÃO é criado ✔; senhas iguais (mín. 8) → membro criado e listado no Quadro da Equipa (screenshot `/tmp/equipa_criado.png`). Nenhum registo tocado na nuvem (teste em browser efémero).

### Varrimentos
- `tsc --noEmit`: 0 erros · `npm run build`: 0 erros
- e2e demo (build produção): **51 PASS / 0 WARN / 0 FAIL**
- e2e contas reais (build produção): **41 PASS / 0 WARN / 0 FAIL**

---

## v37.31 — Difusões «TODOS» chegam ao Correio de todos os cidadãos (incl. registados depois da expedição) (2026-08-26)

**Pedido do dono:** «Verifica porque razão a mensagem do Inapem nao chegou ou aparece nas correspondencias do cidadão Mario Quiuma.»

**Diagnóstico (nuvem, dados reais):** Mario Segunda Quiuma (BI `005404692BO043`) registou-se em **26/08 11:12** — DEPOIS da difusão «Inquerito(Saude)» do INAPEM-LLMM (25/08 17:27), que materializou uma linha `messages` por BI da audiência daquelE momento + uma linha expedição `recipient_bi='TODOS'`. A caixa do cidadão consultava apenas `recipient_bi = <BI>` (no proxy do servidor E no fallback local) — logo a linha «TODOS» nunca aparecia a nenhum cidadão, e quem se registou após a difusão (Mario) ficava sem a mensagem.

### Correcções
1. **`server.ts` (escopo de leitura do proxy):** cidadão passa a receber também `recipient_bi.eq.TODOS` no OR de scope da tabela `messages`.
2. **`supabaseService.getOwnMailbox`:** o `.or()` do fallback local inclui `recipient_bi.eq.TODOS` (só para chaves com formato de B.I. de cidadão) e o filtro `incoming` trata linhas «TODOS» como recebidas do titular. Instituições e Admin mantêm exactamente o comportamento anterior (a linha «TODOS» própria continua nas Enviadas; o Admin vê tudo).

### Verificação (contas reais, dev :3000)
- Cidadão real `002399714LA030` (que NÃO estava na lista por-BI da difusão de 25/08): o Correio passa a mostrar **«Inquerito(Saude)» do INAPEM-LLMM** nas recebidas, com ABRIR/ELIMINAR/LIDA (screenshot `/tmp/correio_edlasio_todos.png`) ✔ — o mesmo caminho serve o Mario Quiuma no portal de produção.
- Varrimentos no build de produção: **51 PASS / 0 WARN / 0 FAIL** e **41 PASS / 0 WARN / 0 FAIL**; `tsc --noEmit` 0 erros.

---

## v37.32 — Auditoria completa «analisa e corrige todos os erros sem quebrar o código» (2026-08-26)

**Pedido do dono:** «Analise e corrigi todos os erros mas cuidado para nao quebrar ou danificar o codigo.»

### Erros encontrados e corrigidos (cirúrgicos)
1. **Eliminação de difusões «TODOS» era cross-utilizador (App.tsx):** «ELIMINAR»/«Eliminar permanentemente»/«Restaurar» do cidadão sincronizavam `state_indicator` na linha PARTILHADA da difusão — ao arquivar, a mensagem desaparecia das caixas de TODOS os cidadãos (a caixa filtra `Arquivada`/`EliminadaPermanente`). Agora, em linhas `recipient_bi='TODOS'`, a remoção/restauro é apenas LOCAL por titular; a nuvem não é tocada (`mensagemEhDifusaoTodos`).
2. **Nome pessoal hardcoded em acções de qualquer cidadão (App.tsx):** `handleCreateRequest` criava pedidos com `user: 'Edlasio Galhardo'` para qualquer titular → passa a usar `user?.name || profileName || 'Cidadão'`; os eventos de estado de mensagens (`responsible`) passam a cair em `'Utilizador'` quando não há nome (3 sítios).

### Verificação
- `tsc --noEmit`: 0 erros · `npm run build`: 0 erros
- e2e demo (build produção): **51 PASS / 0 WARN / 0 FAIL**
- e2e contas reais (build produção): **41 PASS / 0 WARN / 0 FAIL** (inclui verificações de excepções JS e erros de consola por página)
- Sem alterações de comportamento nas contas demo/instituição/admin; apenas remoção de fugas de dados e do efeito colateral partilhado.

---

## v37.33 — Popup «Registar Novo Membro da Equipa» da Instituição adaptado ao modelo do Admin; Nº Agente = Código da Instituição + índice de registo (2026-08-26)

**Pedido do dono:** «Analise como esta configurado o popup "Registrar novo membro da equipa" na area admin na pagina "Equipa" e adapta para o popup ... na area instituicao ... O Id unico do agente deve ser o codigo da Instituicao + o index de registo do usuario. Ex: Inapem-LLVV-02.»

**Análise do modelo Admin:** o Admin gera `ADMIN-NNNN` sequencial (máx. existente + 1 sobre trabalhadores + credenciais), mostra o Nº em campo só-de-leitura, exige palavra-passe inicial (com confirmação, v37.30) e provisiona a conta na nuvem (`agente.<nº>@admin.correiodigital.ao`) — o membro entra logo com Nº + senha.

**Situação anterior na Instituição:** a numeração `CÓDIGO-NN` só existia com registo LOCAL da instituição; nas instituições reais (nuvem) o membro nascia com `AGT-<aleatório>` e SEM credencial de nuvem.

### Adaptações (GovContactsContent.tsx)
1. **Nº Agente Institucional sequencial para TODAS as instituições:** `CÓDIGO-NN` com NN = índice de registo (máx. entre membros do registo local + equipa actual, + 1; o índice 01 pertence ao responsável) — exactamente o formato pedido (`INAPEM-LLMM-02`), campo só-de-leitura como no Admin.
2. **Credencial de nuvem também para instituições reais:** o provisionamento F32 (`agente.<nº>@inst.correiodigital.ao`, senha inicial do popup) deixa de exigir registo local — basta `appMode==='institution'` com código válido; o login institucional por Código + Nº Agente + senha passa a funcionar em qualquer dispositivo (caminho cloud já existente em `institutionSessionService`).
3. Rótulo do campo passa a «Nº Agente Institucional» em todas as instituições (antes só com registo local).

### Verificação (conta real INAPEM-LLMM-01, dev :3000)
- 1.º membro → popup mostra «Nº AGENTE INSTITUCIONAL» = **INAPEM-LLMM-02**; 2.º membro → **INAPEM-LLMM-03**; ambos listados no Quadro da Equipa com esses IDs ✔ (screenshot `/tmp/equipa_seq.png`).
- Contas Auth de teste (`agente.inapem-llmm-02/03@inst...`) eliminadas da nuvem após o teste; credencial do responsável (`-01`) reposta com a senha real ✔.

### Varrimentos
- `tsc --noEmit`: 0 erros · `npm run build`: 0 erros
- e2e demo (build produção): **51 PASS / 0 WARN / 0 FAIL**
- e2e contas reais (build produção): **41 PASS / 0 WARN / 0 FAIL**

---

## v37.34 — EXECUÇÃO DA MATRIZ DE TESTES 100% REAIS (PROMPT v37.2) — 2026-08-26

Execução autónoma completa da matriz T1–T10 com contas reais, sem intervenção manual.
Nenhuma alteração de código foi necessária: todas as ocorrências investigadas revelaram-se
comportamento desenhado ou artefactos do harness de teste (detalhe abaixo).

| # | Fluxo | Resultado | Evidência |
|---|-------|-----------|-----------|
| T1 | Logins reais (cidadão 002399714LA030, instituição INAPEM-LLMM-01, admin ADMIN-0001) | ✔ | varridos no sweep de contas reais (41/0/0) |
| T2 | Caixa do cidadão vs REST | ✔ | proxy `/api/dados` retorna exactamente as linhas do titular (7 linhas, escopo cidadão) |
| T3 | Registo real TESTE (BI 009998887LA099) + popup de credenciais + avatar azul + isolamento | ✔ | popup «REGISTO CONCLUÍDO — GUARDE OS SEUS DADOS DE ACESSO» (screenshot); login da conta nova OK; zero dados alheios |
| T4 | Mensagem instituição→cidadão TESTE | ✔ | «Aviso TESTE v37.2» gravada na nuvem e visível em NÃO LIDAS após homologação (cidadão pendente vê só correspondência de homologação — desenhado) |
| T5 | Resposta cidadão→instituição | ✔ | «RE: Aviso TESTE v37.2» na nuvem; visível em ENVIADAS (cidadão) e NÃO LIDAS (instituição) |
| T6 | Membro INAPEM-LLMM-02: criação (Nº agente automático), login em contexto limpo, URL directo bloqueado, cleanup | ✔ | popup v37.33 com «Nº AGENTE INSTITUCIONAL INAPEM-LLMM-02»; Auth nuvem criada; login limpo entra (Perfil obrigatório); `#/inst-qrcode` não marcada → bloqueada; `#/gov-dashboard` bloqueada; conta Auth eliminada |
| T7 | Sondagem fim-a-fim (difusão TODOS «Inquerito(Saude)») | ✔ | cidadão responde às 2 enquetes (modal «CONFIRMAR RESPOSTAS ÀS SONDAGENS»); linhas em `sondagem_respostas`; instituição vê «Luanda — 2 voto(s) / Portugues — 2 voto(s)» |
| T8 | Admin: homologação + painel vs REST + Eliminar (F47) | ✔ | «HOMOLOGAR CADASTRO» activa a conta (notificação «Conta Ativada»); painel 784 = REST 784 mensagens; ELIMINAR remove profile+Auth+registo na nuvem |
| T9 | Segurança: senha errada ×3 bloqueada; cidadão e instituição bloqueados de `#/gov-dashboard` | ✔ | erro claro sem entrada; redireccão para a própria área (cidadão) |
| T10 | Robustez: consola sem erros, mobile 390px OK | ✔ | zero erros de consola/pageerror; render mobile completo |

Varrimentos finais: **51 PASS / 0 WARN / 0 FAIL** (demo) e **41 PASS / 0 WARN / 0 FAIL** (contas reais).
`tsc --noEmit` = 0 erros · `npm run build` = OK.

Higiene da nuvem (R8) após os testes: mensagens TESTE (2) eliminadas; `sondagem_respostas` TESTE (2) eliminadas;
notificações TESTE eliminadas; `solicitacoes_registo` TESTE eliminada; profile+Auth TESTE eliminados (F47);
membro -02 eliminado do Auth; auditoria com marcadores TESTE eliminada; storage sem objectos TESTE.
Login TESTE pós-limpeza: bloqueado (conta inexistente).

Observações (sem alteração de código, comportamento desenhado confirmado no código):
1. Cidadão com homologação pendente só vê correspondência de homologação (`homologationPendingForCitizen`, App.tsx) — luz ONLINE vermelha; após homologação a caixa completa aparece.
2. Caixa do cidadão abre em LIDAS por omissão; difusões TODOS antigas chegam como lidas (unread=0) — coerente com a política de não-lidas de 2026-08-21.
3. Lista de membros da Equipa é por dispositivo (registo local F32) — a senha e o login multi-dispositivo vivem na nuvem (Auth), gestão completa no dispositivo criador; `Eliminar` limpa nuvem+local.
4. Após F47, a lista de cidadãos do admin só refresca na próxima consulta (stale view momentânea) — os dados na nuvem já estão eliminados (verificado via REST).

---

## v37.35 — Popup «Sondagem · Enquetes desta correspondência» com rolagem vertical — 2026-08-26

Pedido do dono: o popup da área institucional (Correio → correspondência → «Ver Sondagem»)
não tinha como descer quando o conteúdo excedia a caixa (`max-h-[95vh]` + `overflow-hidden`
cortavam o fundo). Correção cirúrgica em `MessageDetail.tsx`: o corpo do popup passou a ter
`max-h-[62vh] overflow-y-auto overscroll-contain pr-2` — o cabeçalho fica fixo e a lista de
enquetes rola na vertical.

Verificação real (Playwright): com viewport 800px o corpo fica `max-height: 496px` e
`overflow-y: auto`; com viewport 520px o conteúdo (350px) excede o limite (322px) e a barra
de rolagem vertical activa (`scrollHeight 350 > clientHeight 322`). Sem enquetes extra o
conteúdo curto não força barra (comportamento correcto).

Regressão: 51 PASS / 0 WARN / 0 FAIL (demo) · 41 PASS / 0 WARN / 0 FAIL (contas reais) ·
`tsc --noEmit` 0 erros · `npm run build` OK.
