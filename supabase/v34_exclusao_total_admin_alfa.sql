-- CDA v34 — Exclusão total de conta pelo Admin Alfa
-- PRÉ-REQUISITOS: executar v30 e v31 primeiro.
-- Executar no Supabase SQL Editor.
-- A função remove dados relacionais persistidos. Storage e Auth exigem o
-- endpoint backend com service_role; não expor service_role no frontend.

create or replace function public.cda_admin_alfa_eliminar_conta_total(p_identificador text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := upper(trim(coalesce(p_identificador, '')));
  v_messages bigint := 0;
  v_history bigint := 0;
  v_profiles bigint := 0;
  v_registration bigint := 0;
  v_notifications bigint := 0;
  v_requests bigint := 0;
begin
  if not public.cda_admin_alfa_autorizado() then
    raise exception 'ADMIN_ALFA_REQUIRED' using errcode = '42501';
  end if;
  if v_id = '' or length(v_id) > 30 or v_id !~ '^[A-Z0-9-]+$' then
    raise exception 'INVALID_IDENTIFIER' using errcode = '22023';
  end if;

  -- Histórico explícito antes de apagar as mensagens, para instalações sem
  -- ON DELETE CASCADE na tabela message_state_history.
  delete from public.message_state_history
  where message_id in (
    select id from public.messages where sender_bi = v_id or recipient_bi = v_id
  );
  get diagnostics v_history = row_count;

  -- Todas as correspondências: enviadas, recebidas, lidas, não lidas,
  -- arquivadas e qualquer outro estado pertencente ao identificador exacto.
  delete from public.messages where sender_bi = v_id or recipient_bi = v_id;
  get diagnostics v_messages = row_count;

  delete from public.user_requests where user_bi = v_id;
  get diagnostics v_requests = row_count;
  delete from public.document_requests where user_bi = v_id;
  delete from public.notifications where target_bi = v_id;
  get diagnostics v_notifications = row_count;

  -- profiles elimina documentos/contactos que tenham FKs ON DELETE CASCADE.
  delete from public.profiles where bi = v_id;
  get diagnostics v_profiles = row_count;
  delete from public.solicitacoes_registo where bi_numero = v_id;
  get diagnostics v_registration = row_count;

  return jsonb_build_object(
    'ok', true, 'identifier', v_id,
    'messages', v_messages, 'message_history', v_history,
    'requests', v_requests, 'notifications', v_notifications,
    'profiles', v_profiles, 'registrations', v_registration
  );
end;
$$;

revoke all on function public.cda_admin_alfa_eliminar_conta_total(text) from public, anon;
grant execute on function public.cda_admin_alfa_eliminar_conta_total(text) to authenticated;

-- Teste após login novo como ADMIN-0001:
-- select public.cda_admin_alfa_eliminar_conta_total('CODIGO-OU-BI-DE-TESTE');
