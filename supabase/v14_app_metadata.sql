-- ============================================================================
-- v14 (2026-07-27) — F43 / FASE 1 da Auditoria F42 — BUG #1 (P0)
-- ----------------------------------------------------------------------------
-- ESCALONAMENTO DE PRIVILÉGIO provado ao vivo (relatório auditoria_f42):
--   conta descartável com bi=QA-AUDIT-TEMP fez
--     PUT /auth/v1/user {"data":{"bi":"009874562LA041","role":"admin"}}
--   → HTTP 200 → refresh do token → leu messages de terceiros, audit_logs e
--   solicitacoes_registo. Causa: as ~30 políticas liam claims de
--   'user_metadata' — que o PRÓPRIO utilizador edita livremente via updateUser.
--
-- FIX: a confiança migra para 'app_metadata' (o updateUser NÃO o toca; só a
-- admin API com service_role o altera):
--   §1) Trigger em auth.users: no INSERT copia claims user→app; no UPDATE
--       re-força os valores ANTIGOS (imutáveis) — mas respeita edições feitas
--       directamente em app_metadata via admin API (suporte assistido);
--   §2) Backfill das contas já existentes;
--   §3) Reescrita das 32 políticas (1:1, só troca 'user_metadata'→'app_metadata'),
--       idempotente: drop if exists + create policy nos casos de colisão.
--
-- EXECUÇÃO: SQL Editor → colar TUDO → Run. Esperado: Success + várias listagens.
-- VERIFICAÇÃO (o assistente re-executa o exploit — TEM de falhar com []).
-- ROLLBACK: última secção.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- §1) TRIGGER de sincronização de claims  user_metadata → app_metadata
-- ----------------------------------------------------------------------------
create or replace function public.cda_sync_claims_to_app_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  j jsonb := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
begin
  if TG_OP = 'INSERT' then
    -- Nascimento da conta: as claims declaradas no registo tornam-se oficiais
    NEW.raw_app_meta_data := coalesce(NEW.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object(
           'bi',          j->>'bi',
           'role',        j->>'role',
           'instituicao', j->>'instituicao'
         );
  else
    -- UPDATE: se o app_metadata foi alterado EXPLICITAMENTE (admin API /
    -- suporte assistido), a edição é respeitada; caso contrário (ex.: o
    -- utilizador editou o seu user_metadata via updateUser), re-forçamos os
    -- valores ANTIGOS — as claims de identidade ficam IMUTÁVEIS para o titular.
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
$$;

drop trigger if exists cda_claims_sync on auth.users;
create trigger cda_claims_sync
  before insert or update on auth.users
  for each row execute function public.cda_sync_claims_to_app_metadata();

-- ----------------------------------------------------------------------------
-- §2) BACKFILL — contas existentes ganham app_metadata a partir do declarado
--     (idempotente: só preenche onde ainda não existe claim oficial)
-- ----------------------------------------------------------------------------
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object(
       'bi',          raw_user_meta_data->>'bi',
       'role',        raw_user_meta_data->>'role',
       'instituicao', raw_user_meta_data->>'instituicao'
     )
where raw_app_meta_data is null
   or raw_app_meta_data->>'bi' is null;

-- ----------------------------------------------------------------------------
-- §3) REESCRITA DAS 32 POLÍTICAS — 'user_metadata' → 'app_metadata' (1:1)
-- ----------------------------------------------------------------------------

-- 1. solicitacoes_registo ------------------------------------------------------------
drop policy if exists "solicitacoes_select_propria_ou_admin" on solicitacoes_registo;
drop policy if exists "solicitacoes_update_admin" on solicitacoes_registo;
drop policy if exists "solicitacoes_delete_admin" on solicitacoes_registo;

create policy "solicitacoes_select_propria_ou_admin"
  on solicitacoes_registo for select
  using (
    bi_numero = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "solicitacoes_update_admin"
  on solicitacoes_registo for update
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "solicitacoes_delete_admin"
  on solicitacoes_registo for delete
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
-- (solicitacoes_insert_publica: with check (true) — sem claims, não muda)

-- 2. profiles -----------------------------------------------------------------------
drop policy if exists "profiles_select_propria_ou_admin" on profiles;
drop policy if exists "profiles_insert_propria_ou_admin" on profiles;
drop policy if exists "profiles_update_propria" on profiles;

create policy "profiles_select_propria_ou_admin"
  on profiles for select
  using (
    bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "profiles_insert_propria_ou_admin"
  on profiles for insert
  with check (
    bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "profiles_update_propria"
  on profiles for update
  using (bi = (auth.jwt() -> 'app_metadata' ->> 'bi'))
  with check (bi = (auth.jwt() -> 'app_metadata' ->> 'bi'));

-- 3. messages -----------------------------------------------------------------------
drop policy if exists "messages_select_propria_caixa" on messages;
drop policy if exists "messages_insert_remetente_valido" on messages;

create policy "messages_select_propria_caixa"
  on messages for select
  using (
    recipient_bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or recipient_bi = (auth.jwt() -> 'app_metadata' ->> 'instituicao')
    or sender_bi    = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or sender_bi    = (auth.jwt() -> 'app_metadata' ->> 'instituicao')
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "messages_insert_remetente_valido"
  on messages for insert
  with check (
    sender_bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or sender_bi = (auth.jwt() -> 'app_metadata' ->> 'instituicao')
    or (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'instituicao')
  );

-- 4. notifications ------------------------------------------------------------------
drop policy if exists "notifications_select_proprias" on notifications;
drop policy if exists "notifications_insert_papeis" on notifications;

create policy "notifications_select_proprias"
  on notifications for select
  using (
    target_bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or target_bi = (auth.jwt() -> 'app_metadata' ->> 'instituicao')
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "notifications_insert_papeis"
  on notifications for insert
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'instituicao', 'cidadao'));

-- 5. user_requests ------------------------------------------------------------------
drop policy if exists "user_requests_select_proprios_ou_admin" on user_requests;
drop policy if exists "user_requests_insert_proprio" on user_requests;
drop policy if exists "user_requests_update_admin" on user_requests;

create policy "user_requests_select_proprios_ou_admin"
  on user_requests for select
  using (
    user_bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "user_requests_insert_proprio"
  on user_requests for insert
  with check (
    user_bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "user_requests_update_admin"
  on user_requests for update
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 6. audit_logs ---------------------------------------------------------------------
drop policy if exists "audit_select_admin" on audit_logs;

create policy "audit_select_admin"
  on audit_logs for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
-- (audit_insert_aberta: with check (true) — sem claims, não muda)

-- 7. contacts -----------------------------------------------------------------------
drop policy if exists "contacts_select_proprios_ou_admin" on contacts;
drop policy if exists "contacts_insert_proprio" on contacts;
drop policy if exists "contacts_update_proprio" on contacts;
drop policy if exists "contacts_delete_proprio" on contacts;

create policy "contacts_select_proprios_ou_admin"
  on contacts for select
  using (
    owner_bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "contacts_insert_proprio"
  on contacts for insert
  with check (
    owner_bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "contacts_update_proprio"
  on contacts for update
  using (owner_bi = (auth.jwt() -> 'app_metadata' ->> 'bi'))
  with check (owner_bi = (auth.jwt() -> 'app_metadata' ->> 'bi'));

create policy "contacts_delete_proprio"
  on contacts for delete
  using (owner_bi = (auth.jwt() -> 'app_metadata' ->> 'bi'));

-- 8. documents ----------------------------------------------------------------------
drop policy if exists "documents_select_titular_ou_servico" on documents;
drop policy if exists "documents_insert_emissor_ou_titular" on documents;
drop policy if exists "documents_update_emissor_ou_titular" on documents;

create policy "documents_select_titular_ou_servico"
  on documents for select
  using (
    holder_bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'instituicao')
  );

create policy "documents_insert_emissor_ou_titular"
  on documents for insert
  with check (
    holder_bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'instituicao')
  );

create policy "documents_update_emissor_ou_titular"
  on documents for update
  using (
    holder_bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'instituicao')
  )
  with check (
    holder_bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'instituicao')
  );

-- 9. document_requests --------------------------------------------------------------
drop policy if exists "doc_requests_select_escopo" on document_requests;
drop policy if exists "doc_requests_insert_proprio" on document_requests;
drop policy if exists "doc_requests_update_escopo" on document_requests;

create policy "doc_requests_select_escopo"
  on document_requests for select
  using (
    user_bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or institution = (auth.jwt() -> 'app_metadata' ->> 'instituicao')
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "doc_requests_insert_proprio"
  on document_requests for insert
  with check (
    user_bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'instituicao')
  );

create policy "doc_requests_update_escopo"
  on document_requests for update
  using (
    user_bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or institution = (auth.jwt() -> 'app_metadata' ->> 'instituicao')
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    user_bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or institution = (auth.jwt() -> 'app_metadata' ->> 'instituicao')
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- 10. digital_protocols -------------------------------------------------------------
drop policy if exists "protocols_select_institucional" on digital_protocols;
drop policy if exists "protocols_insert_autenticado" on digital_protocols;

create policy "protocols_select_institucional"
  on digital_protocols for select
  using (
    issuer_institution = (auth.jwt() -> 'app_metadata' ->> 'instituicao')
    or (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'instituicao')
  );

create policy "protocols_insert_autenticado"
  on digital_protocols for insert
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('cidadao', 'instituicao', 'admin')
  );

-- 11. message_state_history ---------------------------------------------------------
drop policy if exists "msg_history_select_da_caixa" on message_state_history;
drop policy if exists "msg_history_insert_da_caixa" on message_state_history;

create policy "msg_history_select_da_caixa"
  on message_state_history for select
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or exists (
      select 1 from messages m
      where m.id = message_state_history.message_id
        and (
          m.sender_bi    = (auth.jwt() -> 'app_metadata' ->> 'bi')
          or m.recipient_bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
          or m.sender_bi    = (auth.jwt() -> 'app_metadata' ->> 'instituicao')
          or m.recipient_bi = (auth.jwt() -> 'app_metadata' ->> 'instituicao')
        )
    )
  );

create policy "msg_history_insert_da_caixa"
  on message_state_history for insert
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or exists (
      select 1 from messages m
      where m.id = message_state_history.message_id
        and (
          m.sender_bi    = (auth.jwt() -> 'app_metadata' ->> 'bi')
          or m.recipient_bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
          or m.sender_bi    = (auth.jwt() -> 'app_metadata' ->> 'instituicao')
          or m.recipient_bi = (auth.jwt() -> 'app_metadata' ->> 'instituicao')
        )
    )
  );

-- 12. video_sessions / video_session_events -----------------------------------------
drop policy if exists "video_sessions_admin_e_instituicao" on video_sessions;
drop policy if exists "video_events_admin_e_instituicao" on video_session_events;

create policy "video_sessions_admin_e_instituicao"
  on video_sessions for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'instituicao'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'instituicao'));

create policy "video_events_admin_e_instituicao"
  on video_session_events for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'instituicao'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'instituicao'));

-- ----------------------------------------------------------------------------
-- AUDITORIA PÓS-APLICAÇÃO
-- ① Espera-se ZERO linhas: nenhuma política pode continuar a ler user_metadata
-- ----------------------------------------------------------------------------
select tablename, policyname, qual, with_check
from pg_policies
where schemaname = 'public'
  and (qual like '%user_metadata%' or with_check like '%user_metadata%')
order by tablename;

-- ② Espera-se 32 políticas a ler app_metadata
select count(*) as politicas_com_app_metadata
from pg_policies
where schemaname = 'public'
  and (qual like '%app_metadata%' or with_check like '%app_metadata%');

-- ③ Trigger instalado?
select tgname, tgrelid::regclass as tabela, tgenabled
from pg_trigger
where tgname = 'cda_claims_sync';

-- ============================================================================
-- ROLLBACK (recria as políticas com 'user_metadata' — ou seja, REABRE o P0;
-- usar só em emergência e re-aplicar de seguida corrigido):
--   Re-executar supabase/v12_rls_policies.sql + supabase/v13_rls_hardening.sql
--   (ambos idempotentes) e, se quiser remover o automatismo:
--   drop trigger if exists cda_claims_sync on auth.users;
--   drop function if exists public.cda_sync_claims_to_app_metadata();
-- ============================================================================
