# Auditoria de ficheiros desnecessários — verificação de 2026-11-19

Pergunta do dono: «Verifica se no código tem arquivos que não sejam necessários para o app. Ex:
captura de telas.»

Verifiquei os 535 ficheiros versionados. **A aplicação em si está limpa** — o que existe é
acumulação de material de teste e de relatórios à volta dela.

---

## 1. Capturas de ecrã — a resposta directa

**Não há nenhuma captura de ecrã no repositório.** As 57 imagens de teste (7,6 MB) estão em
`test-artifacts/`, que está no `.gitignore` e **nunca foi versionado** (confirmado: `git ls-files
test-artifacts` → 0; o histórico mostra o commit `c1eaf0b “Keep test screenshots out of the
repository”`, que as retirou pela primeira vez).

As únicas 3 imagens versionadas são **logótipos usados pela aplicação**:

| Ficheiro | Dimensões | Usos no código |
|---|---|---|
| `src/assets/images/logomarca_login_2026.png` | 533×800 | 1 |
| `src/assets/images/logomarca_modo_claro_crop.png` | 1141×291 | 2 |
| `src/assets/images/logomarca_modo_escuro_crop.png` | 2157×550 | 1 |

Nota de desperdício (não é “ficheiro inútil”, é peso): os dois logos de cabeçalho são exibidos a
~40 px de altura mas são servidos a 2157 px e 1141 px de largura — 664 KB de PNG no primeiro
carregamento. Converter para WebP e reduzir para 2× do tamanho de exibição pouparia ~85% sem perda
visível. Isto mexe no arranque da app, por isso não o fiz sem autorização.

---

## 2. Código da aplicação — 155 ficheiros `.ts/.tsx`, **nenhum órfão**

Verifiquei cada ficheiro de `src/` à procura de quem o importa (estático ou `import()` dinâmico):

- 2 excepções falsas (`ErrorBoundary.tsx`, `NotifyHost.tsx`) — são importados em `main.tsx` por
  caminho com extensão;
- `src/services/notificationAccess.ts` **não é órfão**: é usado por `server.ts` (validação de
  titularidade nas leituras de notificações) e por `scripts/testNotificationAccess.ts`.

**Conclusão: não há código morto em `src/`.** Todos os 18 comandos `npm run` apontam para ficheiros
existentes.

---

## 3. O que está a mais (fora da aplicação)

| Categoria | Quantos | Peso | Referências |
|---|---|---|---|
| Scripts em `scripts/` | 154 total, **64 órfãos** (40 `.mjs`, 15 `.cjs`, 8 `.ts`, 1 `.sh`) | ~476 KB | ninguém os invoca: nem `package.json`, nem outro script, nem documentação |
| Relatórios/prompts `.md` na raiz | **79** | 457 KB | só 6 têm valor actual (ver §4) |
| Pasta `script/` (singular) | 0 ficheiros | — | **directório vazio** — não versionado, não usado |
| `test-artifacts/` | 57 capturas | 7,6 MB | local, já ignorado (não afecta repo nem deploy) |
| `supabase/*.sql` | 49 | — | migrações históricas aplicadas; valor de auditoria |

Os 64 scripts órfãos são restos de rondas antigas — nomes como
`e2e_auditoria_exaustiva_producao_30min.mjs`, `e2e_ocorrencia_tirar_foto_completo.mjs`,
`e2e_test_homologation_complete.mjs`, `test_auth_producao_playwright.cjs`. Nenhum é referido por
documentação.

---

## 4. O que deve ficar (e que eu **não** recomendo apagar)

- **As 8 suites de prova desta e das últimas rondas** — são a evidência do que foi entregue:
  `provar_sondagem`, `provar_inquerito_2sondagens`, `provar_inqueritos_so_em_detalhes`,
  `provar_lookup_bi`, `provar_notificacoes_clicaveis`, `provar_mudanca_senha`,
  `provar_aviso_preto_clicavel`, `test_videochamada_2contas`.
- **`test_correio_ida_e_resposta_playwright.cjs`** — usado e referido.
- **Os 9 documentos `*-CAUSA-E-PROVA.md` / `*-CORRECAO-E-PROVA.md`** — registo técnico de defeitos
  corrigidos (sondagens RLS, P0001, ecrã branco, senha, avisos…).
- `README.md`, `AGENTS.md`, `DEPLOY_GUIDE.md`, `SECURITY_ACTIONS_REQUIRED.md`, `docs/`,
  `supabase/` (migrações), `tests/` (4 testes unitários), `api/`, `server/`.

---

## 5. Risco que encontrei antes (e continua válido)

A auditoria de 2026-11-16 registou **palavras-passe em claro** em scripts de teste
(`123456789`, `987654321`, `TesteUx2026!`, `SenhaColab1`, `SenhaAgente1`) e **BIs reais**
(`002399714LA030`). Isso está no repositório e no histórico do Git. Continua por resolver — é mais
grave do que o espaço que os ficheiros ocupam, mas corrigi-lo implica reescrever histórico, o que é
irreversível e precisa da sua decisão.

---

## 6. Proposta — por ordem de risco

| # | Acção | Ganho | Risco | Autorização |
|---|---|---|---|---|
| 1 | Apagar `test-artifacts/` e a pasta vazia `script/` | 7,6 MB locais | nenhum (não versionados) | — |
| 2 | Mover os 64 scripts órfãos para `scripts/arquivo/` | raiz de `scripts/` passa de 154 → 90 | baixo | **preciso** |
| 3 | Mover os 73 relatórios históricos da raiz para `docs/relatorios/` | raiz de 79 `.md` → 6 | baixo (só arruma) | **preciso** |
| 4 | Optimizar os 3 logos (WebP, 2× do tamanho de exibição) | ~660 KB → ~100 KB | médio (mexe no arranque) | **preciso** |
| 5 | Tirar palavras-passe/BIs dos scripts e do histórico | segurança | alto (reescreve histórico) | **preciso** |

**Não apaguei nem movi nada** — não o fiz sem a sua decisão, porque mover relatórios e scripts muda
caminhos que outras pessoas podem estar a usar, e reescrever histórico é irreversível.

Diga-me os números que quer que execute (ex.: «faz 1, 2 e 3») e executo com commit, push e deploy.
