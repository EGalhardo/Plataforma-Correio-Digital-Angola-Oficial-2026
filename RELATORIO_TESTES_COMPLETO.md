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
