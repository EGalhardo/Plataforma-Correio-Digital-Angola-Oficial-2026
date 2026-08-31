# RELATÓRIO DE AUDITORIA E VALIDAÇÃO — CORREIO DIGITAL ANGOLA 2026

**Data:** 2026-08-31 · **Base:** commit `55f1512` (v37.78.24) · **Método:** análise estática (tsc) + varredura browser headless (Playwright/Chromium) + sondas REST às integrações
**Ambiente:** servidor local `tsx server.ts` (porta 3000) com ambiente real (Supabase/Groq/Gemini) · Node 20
**Compromisso:** 0 alterações de código — auditoria pura; nenhuma correcção aplicada porque nenhum erro foi encontrado.

---

## RESUMO EXECUTIVO

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORREIO DIGITAL ANGOLA — AUDITORIA 2026-08-31
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. TypeScript (tsc --noEmit)          0 erros
2. e2e_paginas.mjs (49→51 checks)     51 PASS / 0 WARN / 0 FAIL
3. Excepções JS no browser            0 (3 papéis, sessão completa)
4. Erros de servidor (500/stack)      0 durante a varredura
5. Integração Supabase (verify)       OK — dados reais lidos
6. Chaves reais activadas (.env)      Supabase×4, Gemini, Groq —
                                      todas validadas por sondas REST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONCLUSÃO: 0 erros de código encontrados.
Nada a corrigir — o código NÃO foi alterado.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 1. ANÁLISE ESTÁTICA — `tsc --noEmit`

- Resultado: **0 erros, 0 avisos** em todo o gráfico de módulos (src, api, scripts, server.ts).
- O lint do projecto (`npm run lint`) passa limpo.

## 2. VARREDURA E2E DE PÁGINAS — `scripts/e2e_paginas.mjs`

`BASE=http://localhost:3000` · Chromium headless · autenticação real (Supabase) com as
3 identidades de demonstração nativas.

- **Cidadão** (17 PASS): login público, registo, redefinir senha, login facial, sessão,
  home, correspondências, contactos, perfil, histórico, notificações, pagamentos
  (+ selo honesto de gateway), detalhe de mensagem, logout, 0 excepções JS.
- **Instituição** (18 PASS): login público, registo, redefinir senha, sessão, home,
  correspondências, gov-contactos, QR Code, assistente IA, perfil, pagamentos
  (+ formulário de cobrança com 6 campos), detalhe de mensagem, sondagens
  (validação de campos), logout, 0 excepções JS.
- **Admin** (16 PASS): login público, registo, redefinir senha, sessão, dashboard,
  interoperabilidade, correspondências, contactos, trabalhadores, relatório,
  IA, segurança, perfil, logout, 0 excepções JS.

**Total: 51 PASS / 0 WARN / 0 FAIL.**

## 3. INTEGRAÇÕES (sondas REST com as chaves reais, 2026-08-31)

| Integração | Sonda | Resultado |
|---|---|---|
| Supabase anon (JWT) | `GET /rest/v1/profiles` | HTTP 200 (RLS activa) |
| Supabase publishable | `GET /rest/v1/profiles` | HTTP 200 |
| Supabase secret | `GET /rest/v1/` | HTTP 200 |
| Supabase service_role | `GET /rest/v1/profiles` | HTTP 200 + registos |
| Groq | `GET /models` | HTTP 200 (14 modelos) |
| Gemini | `GET /v1beta/models` | HTTP 200 (50 modelos) |
| `npm run verify:supabase` | leitura de 10 tabelas | OK (28 perfis, 620 mensagens, 33 108 logs) |

As chaves residem em `.env` (runtime) e `.env.deploy` (deploy), ambos gitignored
(regra `.env*`) — **nenhum segredo é commitado**. O push autenticado usa
`scripts/push_github.sh` (fluxo nativo do projecto).

## 4. BUILD DE PRODUÇÃO — NOTA DE AMBIENTE

`vite build` transforma os 4 185 módulos com sucesso e termina a fase de transformação,
mas o ambiente de auditoria tem apenas **1,9 GB de RAM**, insuficiente para a fase
*rendering chunks* (kernel mata o processo por OOM). **Não é defeito de código**:
o mesmo commit `55f1512` compilou e deployou na Vercel (produção a verde, pipeline
`correio-digital-angola-oficial`). Nenhuma alteração foi feita ao `vite.config.ts`
por causa desta limitação de ambiente.

## 5. DECISÃO

A base v37.78.24 está **isenta de erros detectáveis** pelas baterias do próprio
projecto (estática + e2e + sondas de integração). Em conformidade com a instrução
de não alterar código sem defeito, **nenhuma correcção foi aplicada** — este
relatório documenta a validação e é o único ficheiro adicionado.
