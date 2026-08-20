-- CDA v30 — Exclusão definitiva administrativa
-- Aplicar no Supabase SQL Editor antes de ativar o endpoint administrativo.
-- A função remove dados relacionais por identificador exacto. Objetos Storage e
-- utilizadores Auth são removidos pelo endpoint server-side, pois exigem service_role.

create or replace function public.cda_admin_pode_eliminar_registos()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

create or replace function public.cda_eliminar_registo_definitivamente(p_identificador text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := upper(trim(coalesce(p_identificador, '')));
  v_messages bigint := 0;
  v_requests bigint := 0;
  v_notifications bigint := 0;
  v_profiles bigint := 0;
  v_registration bigint := 0;
begin
  if not public.cda_admin_pode_eliminar_registos() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if v_id = '' or length(v_id) > 30 or v_id !~ '^[A-Z0-9-]+$' then
    raise exception 'INVALID_IDENTIFIER' using errcode = '22023';
  end if;

  -- Dependências que referenciam o identificador como emissor/destinatário.
  delete from public.messages where sender_bi = v_id or recipient_bi = v_id;
  get diagnostics v_messages = row_count;
  delete from public.user_requests where user_bi = v_id;
  get diagnostics v_requests = row_count;
  delete from public.document_requests where user_bi = v_id;
  delete from public.notifications where target_bi = v_id;
  get diagnostics v_notifications = row_count;

  -- A eliminação do profile aciona as cascatas declaradas para contactos,
  -- documentos e notificações que usem a chave estrangeira do titular.
  delete from public.profiles where bi = v_id;
  get diagnostics v_profiles = row_count;
  delete from public.solicitacoes_registo where bi_numero = v_id;
  get diagnostics v_registration = row_count;

  return jsonb_build_object(
    'ok', true,
    'identifier', v_id,
    'messages', v_messages,
    'requests', v_requests,
    'notifications', v_notifications,
    'profiles', v_profiles,
    'registrations', v_registration
  );
end;
$$;

revoke all on function public.cda_admin_pode_eliminar_registos() from public, anon;
revoke all on function public.cda_eliminar_registo_definitivamente(text) from public, anon;
grant execute on function public.cda_eliminar_registo_definitivamente(text) to authenticated;
