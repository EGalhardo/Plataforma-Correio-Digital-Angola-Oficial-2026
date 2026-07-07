# Guia de Deploy — Correio Digital Angola

## 1. Instalação
```bash
npm install
```

## 2. Configurar ambiente do frontend
Criar `.env.local` com:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ENABLE_LOCAL_BOOTSTRAP=true
VITE_ENABLE_MOCK_FALLBACK=false
VITE_ENABLE_SUPABASE_AUTO_SEED=false
```

## 3. Configurar ambiente dos scripts / servidor
Criar `.env` com:

```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GROQ_API_KEY=...
```

## 4. Aplicar schema
Abrir o SQL Editor do Supabase e colar:
- `supabase/schema.sql`

## 5. Verificar Supabase
```bash
npm run verify:supabase
```

## 6. (Opcional) Popular ambiente de demo/piloto
```bash
npm run seed:supabase
```

## 7. Validar prontidão
```bash
npm run production:readiness
```

## 8. Testar localmente
```bash
npm run dev
```

## 9. Build
```bash
npm run lint
npm run build
```

## 10. Publicação
Depois do build validado, publicar o projeto no destino escolhido.

## Observações
- Em produção, desativar fallback mock sempre que possível.
- Não usar auto-seed em produção.
- Rever o ficheiro `supabase/production_hardening.sql` antes do go-live.
