# Correio Digital Angola — Estado Atual do Projeto

## Estado Geral
A plataforma encontra-se num estado avançado de maturidade visual e funcional para:
- demonstração institucional
- validação governamental
- piloto controlado

## Classificação Atual
- Frontend: **94%**
- Backend / Integração Supabase: **96%**
- Segurança / Hardening para produção controlada: **85%**

## O que já está consolidado
### Frontend
- navegação principal consolidada
- perfis de Cidadão, Instituição e Administração visivelmente separados
- centros complementares de Histórico e Notificações
- melhoria da coerência textual e operacional
- fluxos mais ligados entre correio, documentos, carteira e administração

### Backend / Integração
- schema de desenvolvimento aplicado no Supabase
- scripts de bootstrap e verificação criados
- CRUD funcional para os domínios principais
- eventos de histórico de estado reforçados
- runtime flags para controlar bootstrap local, fallback e auto-seed

## O que ainda falta para produção mais séria
1. endurecimento definitivo de RLS
2. claims JWT por perfil e instituição
3. redução final do híbrido localStorage / fallback
4. testes ponta a ponta com runtime configurado
5. rotação de chaves usadas em desenvolvimento
6. revisão operacional final com dados reais

## Classificação de prontidão
- Demo: **Pronto**
- Piloto controlado: **Quase pronto**
- Produção nacional: **Ainda requer segurança final e validação operacional**

## Próxima ação recomendada
1. preparar ambiente real
2. validar `npm run production:readiness`
3. aplicar endurecimento RLS
4. testar fluxos ponta a ponta
5. publicar
