-- ============================================================================
-- v36 — SONDAGENS (enquetes estilo WhatsApp) · spec ESPECIFICACAO_SONDAGENS_v36.md
-- ----------------------------------------------------------------------------
-- APLICAR NO SQL EDITOR DO SUPABASE (único caminho de DDL disponível — mesmo
-- padrão das migrações v12..v35).
--
-- 1) sondagens          — cabeçalho único da sondagem (payload NÃO duplicado).
-- 2) sondagem_respostas — 1 voto por cidadão (UNIQUE); re-voto = upsert.
-- 3) messages.sondagem_id — ligação da difusão ao cabeçalho (nullable; os
--    fluxos antigos ignoram-na).
-- 4) RPC cda_audiencia_sondagem(p_code) — cidadãos com relação pré-existente
--    com a instituição (STABLE, só lê, security definer para ver as tabelas
--    independentemente da sessão — mesmo espírito da v20).
--
-- RLS: estilo permissivo idêntico ao da tabela messages («Permitir tudo»,
-- schema.sql §194) — a plataforma autentica os papéis na camada de aplicação
-- e as contas demo nunca têm sessão Auth (D7). Endurecimento fica para uma
-- versão dedicada, tal como nas restantes tabelas.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) sondagens
-- ---------------------------------------------------------------------------
create table if not exists public.sondagens (
  id               bigserial primary key,
  instituicao_code varchar(20)  not null,
  instituicao_nome text         not null,
  pergunta         text         not null,
  opcoes           jsonb        not null,              -- [{"id":"a","texto":"..."}] 2..10
  permitir_varias  boolean      not null default false,
  status           varchar(20)  not null default 'ativa',  -- 'ativa' | 'encerrada'
  abrangencia      varchar(10)  not null default 'nacional', -- 'nacional' | 'local'
  audiencia_total  integer      not null default 0,
  criada_por       varchar(40)  not null,
  created_at       timestamptz  not null default now()
);
create index if not exists idx_sondagens_inst on public.sondagens(instituicao_code);

-- ---------------------------------------------------------------------------
-- 2) sondagem_respostas
-- ---------------------------------------------------------------------------
create table if not exists public.sondagem_respostas (
  id          bigserial primary key,
  sondagem_id bigint      not null references public.sondagens(id) on delete cascade,
  cidadao_bi  varchar(20) not null,
  escolhas    jsonb       not null,                    -- ["a","c"] ids das opções
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (sondagem_id, cidadao_bi)
);
create index if not exists idx_sondagem_respostas_sond on public.sondagem_respostas(sondagem_id);

-- ---------------------------------------------------------------------------
-- 3) messages.sondagem_id
-- ---------------------------------------------------------------------------
alter table public.messages
  add column if not exists sondagem_id bigint null
  references public.sondagens(id) on delete set null;
create index if not exists idx_messages_sondagem on public.messages(sondagem_id);

-- ---------------------------------------------------------------------------
-- 4) RPC audiência local (cidadãos registados no sistema da instituição)
-- ---------------------------------------------------------------------------
create or replace function public.cda_audiencia_sondagem(p_code text)
returns setof text
language sql stable security definer
set search_path = public
as $$
  select user_bi from public.user_requests
    where lower(institution) = lower(p_code)
       or lower(institution) = lower(split_part(p_code, '-', 1))
  union
  select user_bi from public.document_requests
    where lower(institution) = lower(p_code)
       or lower(institution) = lower(split_part(p_code, '-', 1))
  union
  select recipient_bi from public.messages
    where sender_bi = p_code and recipient_bi ~ '^[0-9]'
  union
  select sender_bi from public.messages
    where recipient_bi = p_code and sender_bi ~ '^[0-9]'
$$;

-- ---------------------------------------------------------------------------
-- 5) RLS (estilo permissivo, idêntico a messages)
-- ---------------------------------------------------------------------------
alter table public.sondagens enable row level security;
alter table public.sondagem_respostas enable row level security;

drop policy if exists "Permitir tudo para sondagens" on public.sondagens;
create policy "Permitir tudo para sondagens" on public.sondagens
  for all using (true) with check (true);

drop policy if exists "Permitir tudo para sondagem_respostas" on public.sondagem_respostas;
create policy "Permitir tudo para sondagem_respostas" on public.sondagem_respostas
  for all using (true) with check (true);
