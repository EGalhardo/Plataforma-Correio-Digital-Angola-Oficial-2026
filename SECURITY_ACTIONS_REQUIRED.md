# Ações obrigatórias de segurança antes de produção

## 1. Rodar credenciais
As credenciais utilizadas durante a fase de desenvolvimento/teste devem ser substituídas antes de qualquer publicação real.

Rodar imediatamente:
- Publishable key
- anon key
- service role key
- GROQ API key
- quaisquer chaves de IA utilizadas em teste

## 2. Aplicar endurecimento RLS
Aplicar e validar:
- `supabase/production_hardening.sql`
- `supabase/rls_production_notes.md`

## 3. JWT / Claims
Garantir emissão das claims:
- `bi`
- `role`
- `institution_code`

## 4. Runtime
Em produção:
- `VITE_ENABLE_MOCK_FALLBACK=false`
- `VITE_ENABLE_SUPABASE_AUTO_SEED=false`
- rever se `VITE_ENABLE_LOCAL_BOOTSTRAP` deve permanecer `true`

## 5. Verificações finais
Executar:
```bash
npm run lint
npm run build
npm run verify:supabase
npm run production:readiness
```

## 6. Requisitos antes do go-live
- testar login cidadão
- testar login instituição
- testar login administração
- validar envio e receção de correspondência
- validar emissão documental
- validar notificações
- validar auditoria mínima
- validar QR Code
