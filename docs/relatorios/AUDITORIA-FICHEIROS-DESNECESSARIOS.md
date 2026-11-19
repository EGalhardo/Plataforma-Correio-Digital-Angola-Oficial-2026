# Auditoria de ficheiros desnecessários — Correio Digital Angola

Data: 2026-11-16 · Repositório `EGalhardo/Plataforma-Correio-Digital-Angola-Oficial-2026`

---

## 1. Capturas de ecrã e artefactos de teste

**Não existe nenhuma captura de ecrã versionada.** Confirmado: das imagens no
repositório só há três, e todas são logótipos usados pela aplicação:

| Ficheiro | Usos no código |
|---|---|
| `src/assets/images/logomarca_login_2026.png` | 1 |
| `src/assets/images/logomarca_modo_claro_crop.png` | 2 |
| `src/assets/images/logomarca_modo_escuro_crop.png` | 1 |

Os 38 PNG gerados pelos testes desta ronda vivem em `test-artifacts/` (7,1 MB),
que já está no `.gitignore` — não entram no repositório nem no deploy.

**Lixo local (não versionado, seguro apagar):** `test-artifacts/` e o
directório vazio `script/`.

---

## 2. Scripts de teste órfãos — 67 de 144

Dos 144 ficheiros versionados em `scripts/`, **67 não são referenciados por nada**
(nem pelo `package.json`, nem por outro script, nem pela documentação). São
restos de rondas antigas, muitos com nomes de pessoas e de contas de teste
específicas: `e2e_piloto_inapem.mjs`, `e2e_denuncia_edlasio_inapem.mjs`,
`e2e_mergulhos_efg.mjs`, `e2e_g10_scroll_lock.mjs`, entre outros. O mais antigo
é de 2026-08-15.

**Nenhum script referenciado no `package.json` está em falta** — verificado, os
18 comandos `npm run` apontam todos para ficheiros existentes.

---

## 3. Documentação acumulada — 81 ficheiros `.md`

Só na raiz estão **58 relatórios e prompts** de rondas anteriores
(`RELATORIO_…2026.md`, `PROMPT_AUDITORIA_…`), quase todos com **zero**
referências no código. A raiz do repositório está poluída com o histórico de
auditorias em vez de ter o código.

---

## 4. O que encontrei de realmente sensível

**Palavras-passe em claro em scripts de teste** (7 ocorrências de `123456789`,
mais `987654321`, `TesteUx2026!`, `SenhaColab1`, `SenhaAgente1`, `GALHARDO`).
Cinco destes scripts estão órfãos. Estão no repositório, no histórico do Git.
Isto é mais grave do que o espaço que ocupam.

**BIs reais em código de teste** — `002399714LA030` aparece em vários scripts e
em nomes de ficheiro (`e2e_admin_cidadao_edlasio_e_instituicoes.mjs`).

---

## 5. Recomendação, por ordem de risco

| # | Acção | Risco | Precisa de autorização |
|---|---|---|---|
| 1 | Apagar `test-artifacts/` e `script/` (locais, não versionados) | nenhum | não |
| 2 | Mover os 67 órfãos para `scripts/arquivo/` e manter os que têm valor | baixo | sim |
| 3 | Mover os 58 relatórios da raiz para `docs/relatorios/` | baixo (só arruma) | sim |
| 4 | **Retirar palavras-passe em claro** dos scripts e do histórico | médio — reescreve histórico | sim |

Não apaguei nem movi nada: são ficheiros seus e a remoção de histórico Git é
irreversível. Diga-me quais dos quatro quer que execute e faço-o com commit e
deploy.
