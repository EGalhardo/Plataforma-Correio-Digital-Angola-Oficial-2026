-- ============================================================================
-- v28 — Base de Conhecimento: bucket de ficheiros + políticas de storage
-- (2026-08-17 · versão final consolidada — pronta para o SQL Editor)
-- ----------------------------------------------------------------------------
-- O bucket `kb_ficheiros` guarda os ficheiros ORIGINAIS carregados na Base de
-- Conhecimento da IA (PDF/Word/TXT). O texto extraído alimenta a IA; o
-- ficheiro original fica como fonte auditável (fonte_url).
--
-- ESTE SCRIPT É IDEMPOTENTE — pode ser corrido quantas vezes quiser.
-- Depois de correr, valide com:  npm run verify:v28
-- ============================================================================

-- ============================================================================
-- 1) BUCKET — público, limite 10 MB, só PDF/Word/TXT
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kb_ficheiros',
  'kb_ficheiros',
  true,
  10485760, -- 10 MB
  array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','text/markdown','application/octet-stream']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','text/markdown','application/octet-stream'];

-- ============================================================================
-- 2) POLÍTICAS DE storage.objects
-- ----------------------------------------------------------------------------

-- 2.1 INSERT — público (qualquer utilizador autenticado da plataforma carrega;
--     o upload real passa pelo servidor /api/kb-upload com service_role;
--     esta política cobre também o upload direto pelo browser).
drop policy if exists "kbfich_insert_publico" on storage.objects;
create policy "kbfich_insert_publico"
  on storage.objects for insert
  with check (bucket_id = 'kb_ficheiros');

-- 2.2 SELECT — leitura pública (bucket público; os ficheiros são fontes de
--     referência institucional da KB, já públicas por RLS da tabela).
drop policy if exists "kbfich_select_publico" on storage.objects;
create policy "kbfich_select_publico"
  on storage.objects for select
  using (bucket_id = 'kb_ficheiros');

-- 2.3 UPDATE — apenas admin/instituição (evita que anónimos alterem ficheiros
--     de referência). Aplica-se a metadados/overwrite.
drop policy if exists "kbfich_update_admin_inst" on storage.objects;
create policy "kbfich_update_admin_inst"
  on storage.objects for update
  using (
    bucket_id = 'kb_ficheiros'
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'instituicao')
  )
  with check (
    bucket_id = 'kb_ficheiros'
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'instituicao')
  );

-- 2.4 DELETE — apenas admin/instituição.
drop policy if exists "kbfich_delete_admin_inst" on storage.objects;
create policy "kbfich_delete_admin_inst"
  on storage.objects for delete
  using (
    bucket_id = 'kb_ficheiros'
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'instituicao')
  );

-- ============================================================================
-- 3) VERIFICAÇÃO — mostra o estado final (deve devolver 1 linha e 4 políticas)
-- ============================================================================
select
  (select count(*) from storage.buckets where id = 'kb_ficheiros') as bucket_existe,
  (select public from storage.buckets where id = 'kb_ficheiros') as bucket_publico,
  (select file_size_limit from storage.buckets where id = 'kb_ficheiros') as limite_mb_convertido_em_bytes,
  (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'kbfich_%') as politicas_storage_criadas;
