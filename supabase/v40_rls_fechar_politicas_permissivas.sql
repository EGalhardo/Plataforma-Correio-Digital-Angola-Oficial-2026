-- ============================================================================
-- CDA · v40 — RLS: remover as políticas "Permitir tudo" que anulam o RLS
-- ----------------------------------------------------------------------------
-- PROBLEMA CONFIRMADO AO VIVO (2026-11-16, produção klrclczcahfycfdxzdqs):
--   Com a chave pública (anon) e SEM sessão:
--     GET /rest/v1/notifications?select=*&limit=2  → 200 com dados reais
--     GET /rest/v1/messages?select=*&limit=2       → 200 com dados reais
--     GET /rest/v1/profiles?select=*&limit=2       → 200 com dados reais
--   Causa: 22 políticas `FOR ALL USING (true) WITH CHECK (true)` (herança do
--   schema.sql de desenvolvimento) continuam ACTIVAS. Em RLS as políticas são
--   OU-lógicas: enquanto existir uma permissiva, as restritivas não contam.
--   As migrações posteriores (v12, v13, v14) criaram políticas correctas mas
--   nunca removeram todas as permissivas — o RLS estava efectivamente desligado.
--
-- O que esta migration faz:
--   1. Remove as políticas `true` de 21 tabelas de dados (todas as que têm uma
--      política restritiva equivalente já activa).
--   2. `institutions` é EXCEPÇÃO DELIBERADA: mantém
--      `institutions_leitura` (SELECT true) porque é o catálogo público de
--      instituições que o registo/validação usa sem sessão; remove apenas
--      `institutions_escrita` (ALL true), que permitia a qualquer visitante
--      criar/apagar instituições.
--   3. NÃO mexe em `solicitacoes_registo`: já tem políticas correctas
--      (insert público validado, select/update/delete de admin) e o formulário
--      público depende delas.
--
-- Dependência de aplicação: o código do servidor (server.ts / api/index.ts)
-- tem de estar publicado com o endurecimento da v39 — passa a ler só
-- app_metadata e a fazer o CRUD pela service role (/api/dados). O cliente lê
-- através desse proxy com sessão real.
-- ============================================================================

begin;

do $$
declare
  t text;
  tabelas text[] := array[
    'audit_logs','contacts','digital_protocols','document_requests',
    'documents','inquerito_ia_respostas','inqueritos_ia','message_state_history',
    'messages','notifications','profiles','sondagem_respostas','sondagens',
    'sondagens_classificacoes','user_requests','video_session_events',
    'video_session_notifications','video_sessions'
  ];
begin
  foreach t in array tabelas loop
    execute format('drop policy if exists %I on public.%I', 'Permitir tudo para ' || t, t);
  end loop;
end $$;

-- institutions: catálogo público mantém-se; escrita passa a exigir admin
drop policy if exists "institutions_escrita" on public.institutions;
drop policy if exists "institutions_escrita_admin" on public.institutions;
create policy "institutions_escrita_admin" on public.institutions
  for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ---------------------------------- Verificação -----------------------------
-- (executar à parte, esperado: 0 linhas)
--   select c.relname, p.polname from pg_policy p join pg_class c on c.oid=p.polrelid
--    where pg_get_expr(p.polqual,p.polrelid)='true' and c.relname <> 'institutions';

commit;
