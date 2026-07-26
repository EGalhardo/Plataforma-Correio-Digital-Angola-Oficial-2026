# v12 — Configuração do Supabase para Autenticação na Nuvem (guia passo-a-passo)

> Fases F-a (F31) e F-b (F32) estão no código e em produção. Estes passos vivem
> **fora do código** (painel do Supabase) e são **obrigatórios** para o login na
> nuvem funcionar de ponta a ponta. Nada aqui é executado pela aplicação.

## Passo 1 — Desactivar a confirmação de e-mail (OBRIGATÓRIO)

Os logins usam **e-mails sintéticos internos** (`bi.<BI>@cidadao.correiodigital.ao`,
`agente.admin-0001@admin.correiodigital.ao`, `agente.sme-llvv-02@inst.correiodigital.ao`).
Esses endereços **nunca recebem correio** — se a confirmação estiver ligada, o
`signUp` fica à espera de um clique que nunca chega e **ninguém entra**.

**Painel Supabase → Authentication → Sign In / Providers → Email → desligar "Confirm email".**

Sintoma de estar ligada: o registo continua a funcionar, mas aparece no log de
auditoria da app:
`[AUTH-CLOUD] ATENÇÃO: confirmação de e-mail activa no Supabase — desactivar …`

## Passo 2 — Verificar as variáveis na Vercel

| Variável | Onde | Estado |
|---|---|---|
| `VITE_SUPABASE_URL` | Vercel env | já existe |
| `VITE_SUPABASE_ANON_KEY` | Vercel env | já existe (chave `anon` — pública por desenho) |
| `GROQ_API_KEY` (ou `GROQ_API_KEY_cda`) | Vercel env | já existe (IA) |
| `SUPABASE_SERVICE_ROLE_KEY` | **só servidor!** | NÃO configurada — só necessária para a **reposição assistida de senha (futura)**; nunca no cliente |

## Passo 3 — Aplicar o RLS (F-c) — DEPOIS de testar F-a/F-b

1. Testa primeiro: regista um cidadão novo → entra **noutro dispositivo** com o mesmo
   B.I. + senha (deve entrar — senha validada na nuvem); faz login com uma conta
   antiga local (migra just-in-time: log `[AUTH-CLOUD] Migração just-in-time`).
2. Faz backup das tabelas (Dashboard → Database → Backups ou export).
3. Dashboard → **SQL Editor** → cola o conteúdo de `supabase/v12_rls_policies.sql`
   → lê o cabeçalho → **Run**.
4. Checklist (com a chave `anon`, na aba Table Editor ou via API):
   `select * from messages`, `profiles`, `user_requests` → **devem falhar/0 linhas**.
5. Activa a sessão de um cidadão real (com Auth) e confirma que a app funciona
   normalmente (correio, notificações, perfil).
6. **Efeito conhecido e aceite:** as contas demo deixam de sincronizar a nuvem
   (são local-first — não muda nada na demonstração).

Rollback: bloco final do próprio ficheiro SQL (`disable row level security`).

## Notas de transição (honestas) até fechar o ciclo

- **Reposição assistida de senha (§3.4 do prompt):** exige `SUPABASE_SERVICE_ROLE_KEY`
  no servidor + endpoint privilegiado com autenticação de admin real. Até lá, uma
  alteração local de senha de conta já migrada **não** actualiza a nuvem — a app
  aceita **a local deste dispositivo como via de transição** (marcado `[AUTH-CLOUD]`
  no log) e a nuvem continua primária. A limpeza final das senhas locais em texto
  simples fica para depois do endpoint (fase F-c completa).
- **B.I. nunca registado** continua a entrar em sessão limpa/não verificada (via F12
  actual); com RLS activo nenhuma correspondência alheia chega a essa sessão (a
  leitura é filtrada pelo JWT).
- **Contas demo** (`009874562LA041`, `AGT-9921-SR`, `ADM-8812-OP`): fora do Auth
  para sempre (ideologia v7).
