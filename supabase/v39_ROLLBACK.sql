-- ============================================================================
-- CDA · v39 — ROLLBACK (repor o estado anterior do trigger e das 8 funções)
-- Usar SÓ se a v39 causar regressão funcional. Repõe exactamente o definido
-- antes (claims do signup promovidas + leitura de user_metadata). Mantém-se no
-- repositório como plano de reversão documentado.
-- ============================================================================
begin;

create or replace function public.cda_sync_claims_to_app_metadata()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  j jsonb := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
begin
  if TG_OP = 'INSERT' then
    NEW.raw_app_meta_data := coalesce(NEW.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('bi', j->>'bi', 'role', j->>'role', 'instituicao', j->>'instituicao');
  else
    if NEW.raw_app_meta_data is not distinct from OLD.raw_app_meta_data then
      NEW.raw_app_meta_data := coalesce(OLD.raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object(
             'bi',          coalesce(OLD.raw_app_meta_data->>'bi',          j->>'bi'),
             'role',        coalesce(OLD.raw_app_meta_data->>'role',        j->>'role'),
             'instituicao', coalesce(OLD.raw_app_meta_data->>'instituicao', j->>'instituicao')
           );
    end if;
  end if;
  return NEW;
end
$function$;

-- As 8 funções voltam a ler user_metadata: para reverter sem reescrever corpo,
-- basta trocar a fonte de claims numa cópia guardada em supabase/v39_rollback_funcoes.sql
-- (ver nota no README da migration). O essencial do rollback é o trigger acima,
-- que é o que promove privilégios no registo.

grant execute on function public.cda_hide_message(bigint, boolean)        to anon;
grant execute on function public.cda_mark_all_notifications_read()        to anon;
grant execute on function public.cda_mark_notification_read(bigint)       to anon;
grant execute on function public.cda_record_document_revision(text, jsonb) to anon;
grant execute on function public.cda_revoke_document(text, text)          to anon;

-- NOTA: cda_consume_send_quota, cda_open_service_ticket e cda_advance_service_ticket
-- foram eliminadas (dependiam de tabelas inexistentes) e NÃO são recriadas pelo
-- rollback — recriá-las exigiria criar antes send_quota/service_tickets.

commit;
