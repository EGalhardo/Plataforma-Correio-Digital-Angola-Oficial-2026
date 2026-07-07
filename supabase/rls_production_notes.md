# RLS de Produção — Correio Digital Angola

## Estado atual
O ficheiro `supabase/schema.sql` usa políticas permissivas de desenvolvimento:

```sql
USING (true) WITH CHECK (true)
```

Isto é aceitável apenas para:
- desenvolvimento
- demonstração
- seed inicial
- validação rápida de integração

## Não é adequado para produção nacional
Antes de produção real, é obrigatório:

1. Integrar autenticação real (Supabase Auth ou gateway equivalente)
2. Emitir claims JWT com:
   - `bi`
   - `role`
   - `institution_code`
3. Aplicar as políticas do ficheiro:
   - `supabase/production_hardening.sql`
4. Testar isolamento de acesso para:
   - cidadão
   - instituição
   - administração

## Princípio esperado
- cidadão só lê/escreve os seus próprios dados
- instituição só lê o seu canal institucional e operações autorizadas
- administração central lê e audita de forma controlada
- logs de auditoria não devem ser públicos para todos os perfis

## Ordem recomendada
1. estabilizar frontend e integração
2. validar tabelas e fluxos
3. ativar autenticação real
4. aplicar hardening RLS
5. rodar chaves expostas durante desenvolvimento
6. executar testes ponta a ponta
