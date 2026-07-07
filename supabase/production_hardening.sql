-- ==========================================================
-- PRODUCTION HARDENING TEMPLATE FOR CORREIO DIGITAL ANGOLA
-- ==========================================================
-- IMPORTANT:
-- This file is a production-oriented template and should only be applied
-- once Supabase Auth / JWT claims are aligned with:
--   - app_metadata.bi
--   - app_metadata.role
--   - app_metadata.institution_code (for institutional users)
--
-- The current development schema uses permissive RLS for rapid prototyping.
-- These policies below illustrate the intended direction for production.

-- Helper functions to read claims safely
create or replace function public.current_bi()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'bi', auth.jwt() ->> 'bi', '');
$$;

create or replace function public.current_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() ->> 'role', '');
$$;

create or replace function public.current_institution_code()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'institution_code', auth.jwt() ->> 'institution_code', '');
$$;

-- Example: restrict profiles to own record, institutions to institution-scoped records, admin to all
alter table public.profiles enable row level security;

drop policy if exists "prod_profiles_select" on public.profiles;
create policy "prod_profiles_select"
on public.profiles
for select
using (
  current_role() = 'admin'
  or bi = current_bi()
  or (current_role() = 'institution' and bi = current_institution_code())
);

drop policy if exists "prod_profiles_update" on public.profiles;
create policy "prod_profiles_update"
on public.profiles
for update
using (
  current_role() = 'admin'
  or bi = current_bi()
)
with check (
  current_role() = 'admin'
  or bi = current_bi()
);

-- Messages: citizens read own inbox/outbox, institutions read inbox addressed to institution code, admins read all
alter table public.messages enable row level security;

drop policy if exists "prod_messages_select" on public.messages;
create policy "prod_messages_select"
on public.messages
for select
using (
  current_role() = 'admin'
  or sender_bi = current_bi()
  or recipient_bi = current_bi()
  or (current_role() = 'institution' and recipient_bi = current_institution_code())
  or (current_role() = 'institution' and sender_bi = current_institution_code())
);

drop policy if exists "prod_messages_insert" on public.messages;
create policy "prod_messages_insert"
on public.messages
for insert
with check (
  current_role() = 'admin'
  or sender_bi = current_bi()
  or sender_bi = current_institution_code()
);

drop policy if exists "prod_messages_update" on public.messages;
create policy "prod_messages_update"
on public.messages
for update
using (
  current_role() = 'admin'
  or sender_bi = current_bi()
  or recipient_bi = current_bi()
  or sender_bi = current_institution_code()
  or recipient_bi = current_institution_code()
)
with check (
  current_role() = 'admin'
  or sender_bi = current_bi()
  or recipient_bi = current_bi()
  or sender_bi = current_institution_code()
  or recipient_bi = current_institution_code()
);

-- Documents: citizens only their documents, institutions/admin according to operational role
alter table public.documents enable row level security;

drop policy if exists "prod_documents_select" on public.documents;
create policy "prod_documents_select"
on public.documents
for select
using (
  current_role() = 'admin'
  or holder_bi = current_bi()
  or current_role() = 'institution'
);

drop policy if exists "prod_documents_insert" on public.documents;
create policy "prod_documents_insert"
on public.documents
for insert
with check (
  current_role() = 'admin' or current_role() = 'institution'
);

-- Contacts: owner only, admin full access
alter table public.contacts enable row level security;

drop policy if exists "prod_contacts_select" on public.contacts;
create policy "prod_contacts_select"
on public.contacts
for select
using (
  current_role() = 'admin' or owner_bi = current_bi()
);

drop policy if exists "prod_contacts_write" on public.contacts;
create policy "prod_contacts_write"
on public.contacts
for all
using (
  current_role() = 'admin' or owner_bi = current_bi()
)
with check (
  current_role() = 'admin' or owner_bi = current_bi()
);

-- Notifications: only target user, institution notifications to institution code, admins read all
alter table public.notifications enable row level security;

drop policy if exists "prod_notifications_select" on public.notifications;
create policy "prod_notifications_select"
on public.notifications
for select
using (
  current_role() = 'admin'
  or target_bi = current_bi()
  or (current_role() = 'institution' and target_bi = current_institution_code())
);

-- Audit logs: admin only by default
alter table public.audit_logs enable row level security;

drop policy if exists "prod_audit_select" on public.audit_logs;
create policy "prod_audit_select"
on public.audit_logs
for select
using (current_role() = 'admin');

drop policy if exists "prod_audit_insert" on public.audit_logs;
create policy "prod_audit_insert"
on public.audit_logs
for insert
with check (current_role() in ('admin', 'institution', 'user'));

-- Requests
alter table public.user_requests enable row level security;
alter table public.document_requests enable row level security;

drop policy if exists "prod_user_requests_select" on public.user_requests;
create policy "prod_user_requests_select"
on public.user_requests
for select
using (
  current_role() = 'admin'
  or user_bi = current_bi()
  or current_role() = 'institution'
);

drop policy if exists "prod_doc_requests_select" on public.document_requests;
create policy "prod_doc_requests_select"
on public.document_requests
for select
using (
  current_role() = 'admin'
  or user_bi = current_bi()
  or current_role() = 'institution'
);

-- NOTE:
-- Before applying these policies in production, remove permissive development policies
-- from supabase/schema.sql and validate JWT claim issuance in the authentication flow.
