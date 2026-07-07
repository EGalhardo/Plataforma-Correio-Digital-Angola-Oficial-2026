# Correio Digital Angola

Plataforma nacional de correspondência digital preparada para operar entre:

- Cidadãos
- Instituições Públicas
- Instituições Privadas
- Administração Central

O projeto foi estruturado para manter uma experiência moderna, simples e atraente no frontend, enquanto evolui gradualmente para uma operação integrada com Supabase.

---

## Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Supabase
- Motion
- Recharts
- QRCode
- Express (server local)

---

## Estrutura principal

- `src/App.tsx` — orquestra a navegação, estados globais e carregamento de dados
- `src/components/` — páginas, layouts e componentes de funcionalidades
- `src/services/supabaseService.ts` — camada de integração com Supabase
- `src/services/sessionStore.ts` — sessão canónica do utilizador e perfis
- `src/utils/offlineManager.ts` — suporte offline / fila local
- `supabase/schema.sql` — schema de desenvolvimento
- `supabase/production_hardening.sql` — endurecimento de segurança para produção
- `scripts/bootstrapSupabase.ts` — bootstrap/seed de demonstração
- `scripts/verifySupabase.ts` — verificação rápida do estado da base

---

## Instalação

```bash
npm install
```

---

## Configuração de ambiente

Cria um `.env.local` para o frontend:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key
VITE_ENABLE_LOCAL_BOOTSTRAP=true
VITE_ENABLE_MOCK_FALLBACK=true
VITE_ENABLE_SUPABASE_AUTO_SEED=false
```

Se fores usar os scripts de backend/seed/verificação, cria também um `.env`:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GROQ_API_KEY=your_groq_api_key
```

---

## Preparar o Supabase

### 1. Aplicar o schema de desenvolvimento
No SQL Editor do Supabase, cola e executa:

- `supabase/schema.sql`

### 1.1 Patch opcional de registo civil
Se quiser manter o fluxo administrativo de análise de registos civis do frontend atual, aplica também:

- `supabase/registration_requests_patch.sql`

### 2. (Opcional) Popular a base para demonstração
```bash
npm run seed:supabase
```

### 3. Verificar o estado do projeto Supabase
```bash
npm run verify:supabase
```

---

## Rodar localmente

```bash
npm run dev
```

Servidor local disponível em:

- `http://127.0.0.1:3000`

### Health endpoint
```bash
GET /api/health
```

Exibe:
- estado do servidor
- configuração das chaves
- flags de runtime

---

## Build

```bash
npm run lint
npm run build
```

---

## Scripts disponíveis

```bash
npm run dev
npm run lint
npm run build
npm run seed:supabase
npm run verify:supabase
```

---

## Flags de runtime

A app já suporta uma operação híbrida controlada:

- `VITE_ENABLE_LOCAL_BOOTSTRAP=true|false`
- `VITE_ENABLE_MOCK_FALLBACK=true|false`
- `VITE_ENABLE_SUPABASE_AUTO_SEED=true|false`

### Recomendação
#### Demonstração / piloto
```env
VITE_ENABLE_LOCAL_BOOTSTRAP=true
VITE_ENABLE_MOCK_FALLBACK=true
VITE_ENABLE_SUPABASE_AUTO_SEED=false
```

#### Produção controlada
```env
VITE_ENABLE_LOCAL_BOOTSTRAP=true
VITE_ENABLE_MOCK_FALLBACK=false
VITE_ENABLE_SUPABASE_AUTO_SEED=false
```

---

## Produção

Antes de considerar produção real:

1. Rever políticas RLS permissivas do `schema.sql`
2. Aplicar o endurecimento de segurança em:
   - `supabase/production_hardening.sql`
3. Garantir claims JWT por perfil
4. Validar os fluxos ponta a ponta
5. Rodar as chaves utilizadas em desenvolvimento/teste

Checklist completa em:

- `supabase/production_checklist.md`
- `supabase/rls_production_notes.md`
- `SECURITY_ACTIONS_REQUIRED.md`
- `FINAL_HANDOFF.md`

## Diagnóstico rápido de prontidão

```bash
npm run production:readiness
```

Este comando devolve:
- estado geral de prontidão
- tabelas verificadas
- bloqueadores de produção
- avisos de runtime

---

## Estado atual

- Frontend: praticamente finalizado
- Backend / Supabase: integração funcional avançada
- Próxima prioridade para produção real:
  - hardening de segurança
  - RLS por perfil
  - redução final do híbrido local
  - validação ponta a ponta

---

## Nota

O projeto está preparado para continuar a evoluir sem alterar a identidade visual do portal, preservando simplicidade, atratividade e foco institucional.
