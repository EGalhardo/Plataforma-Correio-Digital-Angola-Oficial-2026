# Integração Supabase — Correio Digital Angola

**Data:** 2026-07-07
**Project:** Correio Digital Angola
**Project ID:** `klrclczcahfycfdxzdqs`

## Credenciais integradas

```text
Project: Correio Digital Angola
Project ID: klrclczcahfycfdxzdqs
URL: https://klrclczcahfycfdxzdqs.supabase.co

Publishable key:
YOUR_SUPABASE_PUBLISHABLE_KEY

Secret key:
YOUR_SUPABASE_SECRET_KEY

anon public (JWT):
YOUR_SUPABASE_ANON_KEY

service_role secret (JWT):
YOUR_SUPABASE_SERVICE_ROLE_KEY

GROQ_API_KEY (Assistente por voz):
YOUR_GROQ_API_KEY
```

> **Nota de segurança:** As chaves reais foram removidas deste documento. Todas as credenciais devem permanecer apenas nos ficheiros `.env` e `.env.local`, que não devem ser versionados no GitHub.

## Arquivos atualizados

1. **`.env`** — completo com:

   * `SUPABASE_URL`
   * `SUPABASE_ANON_KEY`
   * `SUPABASE_SERVICE_ROLE_KEY`
   * `SUPABASE_PUBLISHABLE_KEY`
   * `SUPABASE_SECRET_KEY`
   * `GROQ_API_KEY`
   * `SUPABASE_PROJECT_ID`

2. **`.env.local`** — frontend:

   * `VITE_SUPABASE_URL`
   * `VITE_SUPABASE_ANON_KEY`
   * `VITE_SUPABASE_PUBLISHABLE_KEY`
   * Flags de produção segura.

3. **`.env.example`** — atualizado para 2026, com `mock_fallback=false` e placeholders para todas as variáveis de ambiente.

4. **Código-fonte adaptado para as novas credenciais:**

   * `src/lib/supabaseClient.ts` → suporte a `VITE_SUPABASE_PUBLISHABLE_KEY` como fallback.
   * `server.ts` → suporte a `SUPABASE_SECRET_KEY` e `SUPABASE_PUBLISHABLE_KEY`.
   * `scripts/bootstrapSupabase.ts`
   * `scripts/productionReadiness.ts`
   * `scripts/verifySupabase.ts`
   * `scripts/testInteroperabilidade.ts`

## Validação

```text
npm run production:readiness
→ status: production-candidate
→ blockers: []
→ mockFallback: false
→ hasServiceRoleKey: true
→ hasAnonKey: true

Tabelas OK (10/10):
profiles: 38
messages: 144
message_state_history: 28
documents: 8
contacts: 4
notifications: 100
user_requests: 25
document_requests: 4
audit_logs: 2291
digital_protocols: 18

npm run verify:supabase → OK
npm run build → OK
npm run lint → 0 erros
```

## Estado da integração

* Integração do Supabase concluída com sucesso.
* Integração da API da Groq concluída e validada.
* Assistente por voz operacional através do `server.ts`.
* Configuração preparada para ambiente de produção.
* Credenciais armazenadas exclusivamente através de variáveis de ambiente.

---

**Correio Digital Angola — Supabase 100% integrado e preparado para produção.**
