# Correio Digital Angola — Checklist de Produção

## 1. Base de Dados
- [ ] Aplicar `supabase/schema.sql`
- [ ] Executar `npm run seed:supabase` apenas em ambiente de demonstração/piloto
- [ ] Desativar `VITE_ENABLE_SUPABASE_AUTO_SEED` em produção
- [ ] Validar contagens com `npm run verify:supabase`

## 2. Segurança
- [ ] Substituir as políticas permissivas do `schema.sql`
- [ ] Aplicar `supabase/production_hardening.sql` após alinhar JWT claims de autenticação
- [ ] Garantir claims:
  - `bi`
  - `role`
  - `institution_code`
- [ ] Rodar as chaves expostas em ambiente de teste anterior

## 3. Runtime
- [ ] Definir `.env` de produção
- [ ] Definir `.env.local` para o frontend
- [ ] Desativar fallback mock em produção: `VITE_ENABLE_MOCK_FALLBACK=false`
- [ ] Manter bootstrap local apenas se necessário: `VITE_ENABLE_LOCAL_BOOTSTRAP=true|false`

## 4. Operação
- [ ] Validar leitura e envio de correspondências entre cidadão, instituição e administração
- [ ] Validar emissão de documentos e chegada à carteira
- [ ] Validar notificações por perfil
- [ ] Validar histórico (`message_state_history`)
- [ ] Validar logs mínimos em `audit_logs`

## 5. Deploy
- [ ] `npm install`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Publicar no host de produção

## 6. Observabilidade
- [ ] Validar `/api/health`
- [ ] Confirmar flags de runtime
- [ ] Rever erros no console do navegador
- [ ] Rever logs do servidor
