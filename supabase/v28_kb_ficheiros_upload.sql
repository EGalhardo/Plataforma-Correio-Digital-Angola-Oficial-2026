-- ============================================================================
-- v28 — Base de Conhecimento: bucket de ficheiros + políticas de storage
-- (2026-08-16 — upload de PDF/Word/TXT na KB da IA)
-- ----------------------------------------------------------------------------
-- O bucket `kb_ficheiros` guarda os ficheiros ORIGINAIS carregados na KB
-- (o texto extraído alimenta a IA; o ficheiro fica como fonte auditável).
--
-- NOTA DE APLICAÇÃO: o bucket foi criado via API (POST /storage/v1/bucket).
-- As políticas abaixo (DDL) devem ser aplicadas no SQL Editor do Supabase,
-- pois a API de gestão do projeto não permite DDL a partir do ambiente de
-- desenvolvimento (401 sem Personal Access Token).
-- ============================================================================

-- 1) Bucket público (conteúdo de referência institucional — mesmo modelo das
--    fontes ativas da KB, que já são públicas por RLS da tabela).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kb_ficheiros', 'kb_ficheiros', true, 10485760, null)
on conflict (id) do update set public = true, file_size_limit = 10485760;

-- 2) Políticas de storage.objects para o bucket
--    INSERT: público (qualquer utilizador da plataforma carrega; o upload real
--    passa pelo servidor /api/kb-upload com service role — esta política cobre
--    clientes autenticados e é tolerante para a demo).
drop policy if exists "kbfich_insert_publico" on storage.objects;
create policy "kbfich_insert_publico"
  on storage.objects for insert
  with check (bucket_id = 'kb_ficheiros');

--    SELECT: leitura pública (bucket público).
drop policy if exists "kbfich_select_publico" on storage.objects;
create policy "kbfich_select_publico"
  on storage.objects for select
  using (bucket_id = 'kb_ficheiros');

--    UPDATE/DELETE: apenas admin/instituição (evita que anónimos apaguem
--    ficheiros de referência).
drop policy if exists "kbfich_update_admin_inst" on storage.objects;
create policy "kbfich_update_admin_inst"
  on storage.objects for update
  using (bucket_id = 'kb_ficheiros' and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'instituicao'))
  with check (bucket_id = 'kb_ficheiros' and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'instituicao'));

drop policy if exists "kbfich_delete_admin_inst" on storage.objects;
create policy "kbfich_delete_admin_inst"
  on storage.objects for delete
  using (bucket_id = 'kb_ficheiros' and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'instituicao'));
