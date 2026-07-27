-- ============================================================================
-- DIAGNÓSTICO DE SEGURANÇA — SÓ LEITURA (não altera nada; pode correr à vontade)
-- ----------------------------------------------------------------------------
-- Objectivo: mapear o que o Security Advisor reporta (14 erros / 21 avisos)
-- para eu desenhar a correcção exacta. O Advisor não é consultável via API
-- com a chave anon — este SELECT vai buscar o equivalente no catálogo.
--
-- COMO USAR:
--   1) SQL Editor → colar TUDO → Run;
--   2) Em cada bloco de resultados: "Copy as CSV" (ou screenshot);
--   3) Colar TODOS os blocos aqui no chat.
-- ============================================================================

-- ① RLS ligado/desligado por tabela pública
select schemaname, tablename, rowsecurity as rls_ativo
from pg_tables
where schemaname = 'public'
order by tablename;

-- ② TODAS as políticas activas (aqui vê-se se sobraram "Permitir tudo" ou
--    outras permissivas com nomes desconhecidos)
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- ③ VIEWS (o Advisor acusa "security_definer_view" se alguma usar definer)
select schemaname, viewname, viewowner
from pg_views
where schemaname in ('public', 'storage', 'auth');

-- ④ Views com security definer (o alvo exacto do lint)
select n.nspname as schema, c.relname as view_name, c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'v'
  and n.nspname in ('public', 'storage')
  and c.reloptions is not null;

-- ⑤ MATERIALIZED VIEWS expostas
select schemaname, matviewname, matviewowner
from pg_matviews
where schemaname = 'public';

-- ⑥ EXTENSÕES e respectivo schema (lint "extension_in_public": devem estar
--    em 'extensions', não em 'public')
select e.extname as extensao, n.nspname as schema
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
order by e.extname;

-- ⑦ FUNÇÕES públicas (lint "function_search_path_mutable": proconfig vazio
--    = search_path mutável; o production_hardening.sql criou 3 helpers —
--    preciso saber se alguma vez foi executado)
select n.nspname as schema, p.proname as funcao, p.prosecdef as e_security_definer, p.proconfig as config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;

-- ⑧ BUCKETS de Storage (publico = true expõe ficheiros por URL directo)
select id, name, public as bucket_publico, created_at
from storage.buckets;

-- ⑨ POLÍTICAS do storage.objects (quem pode ler/escrever ficheiros)
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage';

-- ⑩ Colunas das tabelas de vídeo (estão vazias; preciso dos nomes oficiais
--    para futuras políticas)
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('video_sessions', 'video_session_events', 'video_session_notifications')
order by table_name, ordinal_position;

-- ⑪ Contagem de contas Auth (para calibrar o impacto de cada decisão)
select count(*) as contas_auth_reais from auth.users;
