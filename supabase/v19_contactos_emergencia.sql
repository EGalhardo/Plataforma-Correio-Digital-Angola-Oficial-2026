-- ============================================================================
-- v19 — Contactos de Emergência + Alertas de Emergência (Área do Cidadão)
-- ----------------------------------------------------------------------------
-- APLICAR NO SQL EDITOR DO SUPABASE (único caminho de DDL disponível).
--
-- O que este ficheiro faz:
--   1) contacts: acrescenta as colunas phone e whatsapp (hoje o telefone do
--      contacto só vive no browser; sem coluna na nuvem um contacto de
--      emergência é inútil noutro dispositivo).
--   2) emergency_alerts: NOVA tabela apêndice-only com o registo real de cada
--      alerta accionado pelo cidadão (tipo, GPS consentido ou honesto
--      'nao_disponivel', snapshot dos destinatários, estado do gateway).
--   3) RLS de emerg_alerts ao mesmo padrão v14-v18:
--        - cidadão insere/lê APENAS os próprios alertas (claim app_metadata bi)
--        - admin lê tudo
--        - instituições SEM acesso
--        - sem update/delete para ninguém (apêndice-only)
--
-- NÃO toca nas políticas existentes de contacts (já verificadas ao vivo).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) contacts: novas colunas de contacto telefónico
-- ---------------------------------------------------------------------------
alter table public.contacts
  add column if not exists phone text;

alter table public.contacts
  add column if not exists whatsapp text;

-- ---------------------------------------------------------------------------
-- 2) emergency_alerts: registo real, apêndice-only
-- ---------------------------------------------------------------------------
create table if not exists public.emergency_alerts (
  id                  uuid primary key default gen_random_uuid(),
  citizen_bi          text not null,
  alert_type          text not null,          -- 'saude' | 'seguranca' | 'acidente' | 'outro'
  lat                 double precision null,  -- só com consentimento; null quando não disponível
  lng                 double precision null,
  location_status     text not null default 'nao_disponivel', -- 'consentida' | 'nao_disponivel'
  recipients_snapshot jsonb not null default '[]'::jsonb,      -- destinatários no momento do alerta
  gateway_status      text not null default 'sem_gateway',     -- 'sem_gateway' | 'pendente_envio' | 'enviado' | 'falhado'
  created_at          timestamptz not null default now()
);

comment on table public.emergency_alerts is
  'v19 — alertas de emergência reais do cidadão. Apêndice-only: sem update/delete via RLS.';

-- ---------------------------------------------------------------------------
-- 3) RLS de emergency_alerts (padrão v14-v18: claims em app_metadata)
-- ---------------------------------------------------------------------------
alter table public.emergency_alerts enable row level security;

drop policy if exists "emergalerts_insert_proprio" on public.emergency_alerts;
create policy "emergalerts_insert_proprio"
  on public.emergency_alerts for insert
  with check (
    citizen_bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "emergalerts_select_proprio_ou_admin" on public.emergency_alerts;
create policy "emergalerts_select_proprio_ou_admin"
  on public.emergency_alerts for select
  using (
    citizen_bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- (Sem políticas de update/delete: apêndice-only — um alerta registado não pode
--  ser alterado nem apagado via API. Instituições não recebem qualquer ramo.)

-- ---------------------------------------------------------------------------
-- VERIFICAÇÃO (correr depois de aplicar — esperado sem erros):
--   ① select column_name from information_schema.columns
--      where table_name = 'contacts' and column_name in ('phone','whatsapp');
--      → 2 linhas: phone, whatsapp
--   ② select polname from pg_policy join pg_class on pg_class.oid = polrelid
--      where relname = 'emergency_alerts';
--      → 2 políticas: emergalerts_insert_proprio, emergalerts_select_proprio_ou_admin
--   ③ select polname from pg_policy join pg_class on pg_class.oid = polrelid
--      where relname = 'emergency_alerts' and polname in
--        (select polname from pg_policy join pg_class c on c.oid = polrelid
--          where relname = 'emergency_alerts')
--        and polqual::text like '%instituicao%';
--      → 0 linhas (instituição sem qualquer acesso)
-- ============================================================================
-- ROLLBACK (se necessário):
--   drop table if exists public.emergency_alerts;
--   alter table public.contacts drop column if exists whatsapp;
--   alter table public.contacts drop column if exists phone;
-- ============================================================================
