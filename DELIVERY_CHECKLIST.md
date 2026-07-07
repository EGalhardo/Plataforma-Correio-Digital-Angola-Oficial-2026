# Correio Digital Angola — Checklist Final de Entrega

## 1. Código
- [ ] `npm install`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Rever `git status`
- [ ] Confirmar que não existem ficheiros `.env` versionados

## 2. Supabase
- [ ] Confirmar que `supabase/schema.sql` foi aplicado
- [ ] Executar `npm run verify:supabase`
- [ ] Executar `npm run seed:supabase` apenas se necessário para demo/piloto
- [ ] Desativar auto-seed em ambientes sérios

## 3. Runtime
- [ ] Configurar `.env.local`
- [ ] Configurar `.env` para scripts administrativos
- [ ] Rever flags:
  - `VITE_ENABLE_LOCAL_BOOTSTRAP`
  - `VITE_ENABLE_MOCK_FALLBACK`
  - `VITE_ENABLE_SUPABASE_AUTO_SEED`

## 4. Segurança
- [ ] Rodar / renovar chaves que tenham sido usadas em desenvolvimento
- [ ] Rever `supabase/production_hardening.sql`
- [ ] Rever `supabase/rls_production_notes.md`
- [ ] Confirmar plano de claims JWT por perfil

## 5. Validação funcional
- [ ] Login Cidadão
- [ ] Login Instituição
- [ ] Login Administração
- [ ] Correspondências
- [ ] Solicitações de documentos
- [ ] Emissão documental
- [ ] Carteira digital
- [ ] Histórico
- [ ] Notificações
- [ ] Auditoria
- [ ] QR Code

## 6. Entrega
- [ ] Rever `README.md`
- [ ] Rever `supabase/production_checklist.md`
- [ ] Rever `PROJECT_STATUS.md`
- [ ] Fazer commit final
- [ ] Push para `main`
