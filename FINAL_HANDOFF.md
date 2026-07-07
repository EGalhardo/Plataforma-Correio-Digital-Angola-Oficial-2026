# Handoff final — Correio Digital Angola

## Estado atual
O projeto encontra-se pronto para:
- demonstração institucional
- piloto controlado
- continuação de integração final com Supabase
- preparação de produção controlada

## Maturidade estimada
- Frontend: 94%
- Backend / Integração Supabase: 96%
- Segurança / Hardening / Produção controlada: 90%

## O que já está feito
- frontend consolidado sem alteração de layout base
- separação funcional dos perfis no mesmo app
- centros complementares de notificações e histórico
- integração funcional com Supabase
- scripts de bootstrap e verificação
- readiness de produção
- documentação de deploy e entrega

## O que ainda depende de ação final
1. aplicar hardening RLS no Supabase
2. configurar claims JWT por perfil
3. rodar as chaves usadas em desenvolvimento
4. validar ponta a ponta com ambiente final
5. fazer push/deploy final

## Comandos úteis
```bash
npm install
npm run lint
npm run build
npm run seed:supabase
npm run verify:supabase
npm run production:readiness
```

## Ficheiros-chave
- `README.md`
- `DEPLOY_GUIDE.md`
- `DELIVERY_CHECKLIST.md`
- `PROJECT_STATUS.md`
- `SECURITY_ACTIONS_REQUIRED.md`
- `supabase/schema.sql`
- `supabase/production_hardening.sql`
- `supabase/production_checklist.md`
- `supabase/rls_production_notes.md`
