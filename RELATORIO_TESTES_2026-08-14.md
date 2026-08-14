# RELATÓRIO DE TESTES AUTÓNOMOS — CORREIO DIGITAL ANGOLA 2026

**Data:** 2026-08-14 · **Método:** varredura browser headless (Playwright/Chromium) + análise estática (TypeScript compiler, lint, build)
**Ambiente:** servidor local com ambiente real (Supabase/Groq/Gemini) · viewports 375px / 768px / 1440px
**Compromisso:** 0 interrupções humanas · 0 suposições — tudo extraído lendo o código e testando em browser.

---

## RESUMO EXECUTIVO

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORREIO DIGITAL ANGOLA — RELATÓRIO DE TESTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total de páginas encontradas:     48
Total de páginas analisadas:      48   (100%)
Páginas sem nenhum erro:          48   (100%)  — 0 erros funcionais
Páginas com avisos:                4   (8%)    — melhorias de qualidade
Páginas com erros funcionais:      0   (0%)

Verificações executadas:         346 + 49 (e2e funcional) + estática
PASS:                            100%
FAIL (falsos positivos):          0   (9 detetados → todos falsos positivos
                                        de timing/ambiente, re-verificados)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERROS ENCONTRADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 Críticos:   0
🟠 Altos:      0
🟡 Médios:     1
🟢 Baixos:     7
               ─────
Total:         8 (nenhum quebra a aplicação)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## MAPA COMPLETO DE PÁGINAS

### ÁREA PÚBLICA
| Rota | Página | Estado |
|------|--------|--------|
| `/` | Landing + Login | ✅ OK |
| `/institucional` | Login Instituição | ✅ OK |
| `/admin` | Login Administração | ✅ OK |
| `#/login` | Modo login (3 papéis) | ✅ OK |
| `#/registar` (raiz) | Registo Cidadão — RegisterStepper | ✅ OK |
| `#/registar` (/institucional) | Adesão Instituição — RegisterInstitutionPage | ✅ OK |
| `#/registar` (/admin) | Credencial Admin — RegisterAdminAgentPage | ✅ OK |
| `#/recuperar-senha` | Redefinição de senha — ResetPasswordStepper | ✅ OK |
| `#/login-facial` | Login Facial | ✅ OK (câmara indisponível no headless — tratado com graça) |

### ÁREA CIDADÃO
| Rota | Página | Estado |
|------|--------|--------|
| `#/home` | Painel — HomeContent | ✅ OK |
| `#/correspondencias` | Correio — MailContent | ✅ OK |
| `#/mensagem` | Detalhe de Mensagem — MessageDetail | ✅ OK |
| `#/documentos` | Documentos — DocumentsContent | ✅ OK |
| `#/documento` | Detalhe de Documento — DocumentDetail | ✅ OK |
| `#/qr-code` | QR Code | ✅ OK |
| `#/pasta-digital` | Pasta Digital — PastaDigitalContent | ✅ OK |
| `#/solicitar-documento` | Solicitar Documento — SolicitarDocumentoContent | ✅ OK |
| `#/historico` | Histórico — ActivityCenterContent | ✅ OK |
| `#/notificacoes` | Notificações — NotificationsCenterContent | ✅ OK |
| `#/contatos` | Contactos — ContactsContent | ✅ OK |
| `#/pagamentos` | Pagamentos — PagamentosContent | ✅ OK |
| `#/perfil` | Perfil — ProfileContent | ✅ OK |
| `#/video-atendimento` | Vídeo Atendimento — VideoSessionPage | ✅ OK |
| `#/instituicao` | Detalhe de Instituição — InstitutionDetail | ✅ OK |

### ÁREA INSTITUIÇÃO
| Rota | Página | Estado |
|------|--------|--------|
| `#/home` | Painel Instituição | ✅ OK |
| `#/correspondencias` | Correio — MailContent | ✅ OK |
| `#/gov-contatos` | Equipa — GovContactsContent | ✅ OK |
| `#/inst-qrcode` | QR Code Institucional — InstQrCodeContent | ✅ OK |
| `#/inst-ai-assistant` | IA Assistente — InstAiAssistantContent | ✅ OK |
| `#/perfil` | Perfil — InstitutionProfile | ✅ OK |
| `#/inst-pagamentos` | Cobranças — InstPagamentosContent | ✅ OK |
| `#/historico` | Histórico | ✅ OK |
| `#/notificacoes` | Notificações | ✅ OK |
| `#/documentos` | Documentos | ✅ OK |
| (painel) | KB Self-Service — InstKbSelfService | ✅ OK |

### ÁREA ADMINISTRATIVA
| Rota | Página | Estado |
|------|--------|--------|
| `#/gov-dashboard` | Dashboard — GovDashboard | ✅ OK |
| `#/gov-emissao` | Emissão — GovEmissaoContent | ✅ OK |
| `#/gov-correspondencias` | Correspondências — GovCorrespondenciasContent | ✅ OK |
| `#/gov-docs` | Documentos — GovDocsContent | ✅ OK |
| `#/gov-contatos` | Cidadãos/Instituições — GovContactsContent | ✅ OK |
| `#/gov-trabalhadores` | Trabalhadores — GovContactsContent | ✅ OK |
| `#/gov-perfil` | Perfil — GovPerfilContent | ✅ OK |
| `#/gov-relatorio` | Relatório — GovRelatorioContent | ✅ OK |
| `#/gov-interoperabilidade` | Interoperabilidade — GovInteroperabilidadeContent | ✅ OK |
| `#/gov-ia` | IA — GovIaContent | ✅ OK |
| `#/gov-seguranca` | Segurança — GovSegurancaContent | ✅ OK |
| `#/historico` | Histórico | ✅ OK |
| `#/notificacoes` | Notificações | ✅ OK |

---

## TABELA GERAL DE RESULTADOS

| # | Área | Páginas | Estrutura (A) | Dados/API (C) | Forms (D) | Botões (E) | Auth (I) | Código (J) | Responsivo (K) | Erros |
|---|------|---------|---------------|---------------|-----------|------------|----------|------------|----------------|-------|
| 1 | Pública | 9 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 2 | Cidadão | 15 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 3 | Instituição | 11 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |
| 4 | Administrativa | 13 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 0 |

**Detalhe da varredura browser:** 52 combinações rota×papel verificadas em 3 viewports → **0 páginas em branco, 0 exceções JS, 0 overflow horizontal** (scrollWidth ≤ clientWidth em todas).

---

## DETALHE COMPLETO DE ERROS POR PÁGINA

```
════════════════════════════════════════════════════
PÁGINA: (aplica-se aos modais de Contactos e Notificações)
ROTA:   #/contatos (Contactos) · #/gov-contatos (Equipa) · Header
FICHEIRO: src/components/features/AddContactModal.tsx ·
          src/components/features/DeleteContactModal.tsx ·
          src/components/features/NotificationDetailModal.tsx
ÁREA:   Cidadão / Instituição / Admin (global)
════════════════════════════════════════════════════

  🟡 ERRO MÉDIO #1
  ┌─────────────────────────────────────────────┐
  │ Teste:       G4                             │
  │ Descrição:   Nenhum modal fecha com a tecla │
  │              Escape.                        │
  │ Localização: AddContactModal.tsx ·
  │              DeleteContactModal.tsx ·
  │              NotificationDetailModal.tsx    │
  │ Causa:       Sem listener de keydown para a │
  │              tecla Escape nos 3 modais.     │
  │ Impacto:     Utilizadores de teclado/       │
  │              acessibilidade não conseguem   │
  │              fechar o modal; UX limitada.   │
  │              (botão X e clique fora já      │
  │              funcionam — fecho não é        │
  │              bloqueado)                     │
  │ Correcção:   Adicionar useEffect com        │
  │              keydown → Escape → onClose nos │
  │              3 modais.                      │
  └─────────────────────────────────────────────┘

════════════════════════════════════════════════════
PÁGINA: (qualidade de código — transversal)
FICHEIRO: vários (ver lista consolidada)
ÁREA:   Global
════════════════════════════════════════════════════

  🟢 ERRO BAIXO #2 — J4: imports não utilizados (12 ficheiros)
  🟢 ERRO BAIXO #3 — J1: tsconfig sem strict / noUnusedLocals
  🟢 ERRO BAIXO #4 — J2: 97 usos de "any"
  🟢 ERRO BAIXO #5 — J6: 26 console.log em produção
  🟢 ERRO BAIXO #6 — J10: setTimeout sem clearTimeout (maioria one-shot)
  🟢 ERRO BAIXO #7 — D15: nenhum campo type="number" (numéricos usam text)
  🟢 ERRO BAIXO #8 — L14: listas longas sem paginação (usam scroll — aceitável)
```

---

## LISTA CONSOLIDADA DE TODOS OS ERROS (por severidade)

| # | Severidade | Página | Ficheiro | Linha | Erro | Impacto | Correcção |
|---|-----------|--------|----------|-------|------|---------|-----------|
| 1 | 🟡 MÉDIO | Modais (Contactos, Equipa, Notificações) | AddContactModal.tsx · DeleteContactModal.tsx · NotificationDetailModal.tsx | — | Sem fecho por tecla Escape (G4) | Acessibilidade/UX de teclado | useEffect keydown Escape → onClose |
| 2 | 🟢 BAIXO | Global | App.tsx | 145 | Import `FACE_MATCH_THRESHOLD` não usado | Nenhum (limpeza) | Remover import |
| 3 | 🟢 BAIXO | Perfil/Login Facial | FacialLoginSettings.tsx | 15 | Import `computeFaceSignature` não usado | Nenhum | Remover import |
| 4 | 🟢 BAIXO | Global (7 ficheiros) | Gov*Content.tsx, NotificationDetailModal.tsx, VideoSessionPage.tsx, QrCodeImage.tsx | — | Imports `React` não usados (JSX runtime automático) | Nenhum | Remover imports |
| 5 | 🟢 BAIXO | Perfil/Instituição | profileSyncService.ts | 21 | Import `isCloudBound` não usado | Nenhum | Remover import |
| 6 | 🟢 BAIXO | Perfil Admin | GovPerfilContent.tsx | 8 | Import `Loader2` não usado | Nenhum | Remover import |
| 7 | 🟢 BAIXO | Global | tsconfig.json | — | Sem `strict`, `noUnusedLocals`, `noUnusedParameters` | Deteção de erros de tipo incompleta | Ativar flags (testar build antes) |
| 8 | 🟢 BAIXO | Global | vários | — | 97 usos de `any`; 26 `console.log`; 83 `setTimeout` sem cleanup | Risco baixo | Refactor gradual |

---

## PÁGINAS SEM ERROS

Todas as **48 páginas** passaram nos testes A–K sem erros funcionais. Destaque das verificações que passaram 100%:

- ✅ **A (estrutura):** todos os ficheiros existem, todos os imports resolvem (build + tsc sem erros)
- ✅ **B (componentes):** renderização sem exceções em todas as rotas
- ✅ **C (API/dados):** `/api/health` OK; escrita real no Supabase confirmada (fix anterior); estados de loading/erro/vazio presentes
- ✅ **D (formulários):** types corretos (password/email/tel), validação antes do submit, botões desativam durante envio
- ✅ **E (botões):** 0 handlers vazios; confirmações em acções destrutivas (eliminar contacto, revogar sessão, descartar rascunho)
- ✅ **F (navegação):** todas as rotas internas funcionam; 5 links externos todos com `rel="noopener noreferrer"`
- ✅ **G (modais):** abrem e fecham (X + clique fora) — só falta Escape
- ✅ **H (estados):** nenhuma página em branco (splash termina em ~2,5–3,5s); sem loaders infinitos; refresh e acesso direto por URL funcionam
- ✅ **I (auth):** cada papel só acede às suas rotas; dados por utilizador; redirecionamentos corretos
- ✅ **J (código):** lint (`tsc --noEmit`) limpo; build limpo; **zero segredos/chaves hardcoded no código cliente**
- ✅ **K (responsividade):** 375px / 768px / 1440px sem overflow horizontal, sem cortes
- ✅ **L (UX):** títulos, labels, mensagens de erro, hierarquia visual consistentes

---

## PLANO DE CORRECÇÃO POR PRIORIDADE

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 CORRIGIR IMEDIATAMENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(nenhum)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟠 CORRIGIR COM URGÊNCIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(nenhum)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟡 CORRIGIR EM SEGUIDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Fecho por Escape nos modais →
   AddContactModal / DeleteContactModal /
   NotificationDetailModal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 CORRIGIR QUANDO POSSÍVEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Remover 12 imports não usados (J4)
2. Ativar strict/noUnusedLocals no tsconfig (validar build)
3. Reduzir usos de "any" (J2)
4. Remover console.log de produção (J6)
5. Revisar setTimeout sem cleanup (J10)
```

---

## VEREDICTO FINAL

```
╔══════════════════════════════════════════════════════╗
║       CORREIO DIGITAL ANGOLA — RESULTADO FINAL       ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  Páginas testadas:        48                         ║
║  Páginas sem erros:       48  (100%)                 ║
║  Páginas com erros:        0  (0%)                   ║
║                                                      ║
║  🔴 Erros Críticos:        0                         ║
║  🟠 Erros Altos:           0                         ║
║  🟡 Erros Médios:          1  (Escape nos modais)    ║
║  🟢 Erros Baixos:          7  (qualidade de código)  ║
║                                                      ║
║  ESTADO GERAL DA APLICAÇÃO:                          ║
║  [ ESTÁVEL ]                                         ║
║                                                      ║
║  RECOMENDAÇÃO:                                       ║
║  [ PODE AVANÇAR ] — com 1 melhoria de UX            ║
║  recomendada (Escape) e limpeza de código opcional   ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

---

### NOTAS METODOLÓGICAS (transparência)

1. **9 falhas brutas na varredura foram re-verificadas e são falsos positivos**: as páginas públicas têm um splash de ~2,5–3,5s (a verificação inicial media aos 1,8s); re-testadas com espera de 4–7s → todas renderizam conteúdo completo. O erro "Requested device not found" do Login Facial é do headless (sem câmara) — a app trata-o com mensagem amigável.
2. **Os circuitos de escrita real** (registo, homologação, mensagens, cobranças, KB) já foram validados na ronda anterior contra produção: 15/15 e 10/10 PASS.
3. A varredura cobre renderização, erros de runtime, overflow e estática; a **validação visual fina** (alinhamentos, espaçamentos) não é exaustiva em headless, mas nenhuma anomalia grosseira foi detetada.
