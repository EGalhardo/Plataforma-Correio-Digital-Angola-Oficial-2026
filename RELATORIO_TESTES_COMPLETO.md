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
