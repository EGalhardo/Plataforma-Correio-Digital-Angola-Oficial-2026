# Inquérito — causa e prova (AGT-LMM-01)

**Data:** 2026-11-20 · **Produção:** `correio-digital-angola-oficial.vercel.app`
**Commits:** `1db6b2e` → `d25f12a` (deploy `READY d25f12a`)

---

## 1. O erro que o utilizador via

```
new row violates row-level security policy for table "sondagens"
```

Aparecia ao clicar em **Correio → Nova Mensagem → Criar Inquérito → Inquérito Normal →
Criar Sondagem** na conta real `AGT-LMM-01`.

## 2. Causa

Reproduzido com Playwright na conta real. O inquérito **não** era recusado pela
política de segurança por causa do conteúdo: era recusado porque o pedido saía
**sem sessão**.

Sequência observada (browser com a sessão Supabase removida/expirada — o que
acontece ao reabrir a aba, ao cair no login local de emergência ou quando o
token expira):

1. `criarRascunhoSondagem()` chamava o proxy `/api/dados` **sem `Authorization`**
   → o servidor respondia **401** e não gravava nada;
2. `gravarDados()` devolvia `null` e o serviço **repetia o INSERT directo** no
   PostgREST, também sem sessão;
3. esse 2.º caminho é que produzia o `42501 new row violates row-level security
   policy for table "sondagens"` — e era **essa** a mensagem mostrada, escondendo
   a causa real (sessão ausente).

O mesmo defeito afectava o **Inquérito com IA** (`inqueritos_ia`) e o
**eliminar rascunho** (`removerRascunhoSondagem` fazia `DELETE` directo, sempre
bloqueado pela RLS).

Defeitos secundários encontrados no caminho:

- `obterTokenSessao` servia do cache um token **já expirado** durante 60 s;
- nunca se tentava renovar a sessão (`refreshSession`) antes de desistir;
- o proxy do servidor de desenvolvimento (`server.ts`) **não conhecia** as
  tabelas `sondagens`/`sondagem_respostas` (respondia «Tabela desconhecida»), nem
  `DADOS_JSONB.sondagens.opcoes`;
- no `server.ts` o código de identidade institucional vinha de
  `app_metadata.instituicao` e o `agent` era ignorado — a conta `AGT-LMM-01` podia
  ficar sem código e a gravação ser recusada.

## 3. Correção

- **`src/services/supabaseService.ts`**
  - token em cache só é usado enquanto **não** estiver expirado;
  - nova `recuperarSessaoInstituicao()`: tenta `refreshSession()` e, se não
    houver sessão, reautentica com a credencial da instituição validada no
    dispositivo (`cda_inst_regs_v1`), como no login;
  - `gravarDados`/`lerLinhasDados` usam essa recuperação antes de desistir;
  - sem sessão possível, a falha fica marcada como `sem_sessao`.
- **`src/services/sondagemService.ts`**
  - `criarRascunhoSondagem` **deixou de repetir** o INSERT directo cego;
  - `removerRascunhoSondagem` e a activação v37 (legado) passam pelo proxy;
  - mensagens honestas: sessão expirada / sem permissão de instituição / recusa
    de política / sem ligação.
- **`api/index.ts`** — `instituicao_code` normalizado para o código de **âmbito**
  (`AGT-LMM`) quando o token traz o da conta (`AGT-LMM-01`); a identidade passa a
  usar `app_metadata.agent`.
- **`server.ts`** — espelho completo: `sondagens`, `sondagem_respostas`,
  `DADOS_JSONB.sondagens.opcoes` e `instAgent`.

## 4. Prova executada (Playwright, conta real)

`scripts/provar_inquerito_sondagem_playwright.cjs` → **4/4**

| # | Cenário | Resultado |
|---|---------|-----------|
| F1 | Criar inquérito com sessão fresca | **criado**, cartão no compositor, gravado por `/api/dados` com `Authorization` |
| F2 | Sessão Supabase removida do browser | mensagem honesta: «A sua sessão de nuvem expirou. Termine sessão e volte a entrar com a conta da instituição; depois crie o inquérito.» — **sem** o erro cru de RLS |
| F2b | Terminar sessão e voltar a entrar, como a mensagem manda | **criado** |
| F3 | Inquérito **com IA** | guião gerado pela IA + rascunho gravado (`inqueritos_ia`) e cartão no compositor |

Verificação directa na base (produção): registos criados com
`instituicao_code = AGT-LMM`; dados de teste **eliminados** no fim
(`select count(*)` → 0 em `sondagens` e `inqueritos_ia` de teste).

## 5. O que o utilizador deve fazer

1. Se vir a mensagem de sessão expirada: **Sair** e **entrar de novo** com
   `AGT-LMM-01` — a partir daí criar inquéritos funciona (F2b/F3 provam-no).
2. Com a sessão válida, criar inquérito (Normal ou IA) grava e mostra o cartão na
   mensagem em composição, como antes.
