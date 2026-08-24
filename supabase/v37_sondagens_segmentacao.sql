-- ============================================================================
-- v37 — SONDAGENS: COMPOSIÇÃO + SEGMENTAÇÃO INTELIGENTE
-- ----------------------------------------------------------------------------
-- PROMPT_SONDAGEM_v37.md · APLICAR NO SQL EDITOR DO SUPABASE (padrão v12..v36)
--
-- 1) profiles.abrangencia  — classificação oficial da instituição
--    ('nacional' | 'regional' | 'local'; NULL = ainda não classificada).
-- 2) profiles.provincia    — província do cidadão/instituição (backfill
--    best-effort a partir de morada; NULL quando não detectável).
-- 3) messages.sondagem_ids — mensagens com várias sondagens embutidas
--    (mantém messages.sondagem_id da v36 para retrocompatibilidade).
-- 4) sondagens.destinatarios — quantidade real de cidadãos alcançados.
-- 5) RPC cda_audiencia_sondagem_v2(p_code) — audiência segundo a
--    classificação oficial: NACIONAL → todos os cidadãos; REGIONAL →
--    cidadãos da província da instituição; LOCAL → cidadãos com relação
--    pré-existente (união da v36). STABLE + security definer (padrão v36).
--    Classificação ausente ⇒ 'local' por defeito (menor jurisdição).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Classificação oficial das instituições
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists abrangencia text null;

alter table public.profiles
  add column if not exists provincia text null;

create index if not exists idx_profiles_provincia on public.profiles(provincia);

-- Backfill best-effort de provincia a partir de morada (18 províncias + novas
-- divisões). Só preenche quando o nome aparece inequivocamente; caso
-- contrário mantém NULL (cidadão excluído de sondagens REGIONAL com aviso).
update public.profiles
set provincia = case
  when morada ilike '%luanda%' then 'Luanda'
  when morada ilike '%benguela%' then 'Benguela'
  when morada ilike '%huambo%' then 'Huambo'
  when morada ilike '%hu%la%' then 'Huíla'
  when morada ilike '%cabinda%' then 'Cabinda'
  when morada ilike '%malanje%' or morada ilike '%malange%' then 'Malanje'
  when morada ilike '%namibe%' or morada ilike '%mo%amedes%' then 'Namibe'
  when morada ilike '%bi%' and morada ilike '%cu%' then 'Bié'
  when morada ilike '%uanza norte%' or morada ilike '%kwanza norte%' then 'Cuanza Norte'
  when morada ilike '%uanza sul%' or morada ilike '%kwanza sul%' then 'Cuanza Sul'
  when morada ilike '%cunene%' then 'Cunene'
  when morada ilike '%uando%' then 'Cuando Cubango'
  when morada ilike '%unda norte%' then 'Lunda Norte'
  when morada ilike '%unda sul%' then 'Lunda Sul'
  when morada ilike '%moxico%' then 'Moxico'
  when morada ilike '%bengo%' then 'Bengo'
  when morada ilike '%uige%' or morada ilike '%uíge%' then 'Uíge'
  when morada ilike '%zaire%' or morada ilike '%soyo%' or morada ilike '%m%banza congo%' then 'Zaire'
  else null
end
where provincia is null and morada is not null and length(trim(morada)) > 0;

-- ---------------------------------------------------------------------------
-- 2) Mensagens com múltiplas sondagens embutidas
-- ---------------------------------------------------------------------------
alter table public.messages
  add column if not exists sondagem_ids bigint[] null;

-- ---------------------------------------------------------------------------
-- 3) Contagem real de destinatários por sondagem
-- ---------------------------------------------------------------------------
alter table public.sondagens
  add column if not exists destinatarios integer null;

-- Nota: sondagens.status é varchar(20) desde a v36 — o novo valor
-- 'rascunho' não exige alteração de esquema (validado na aplicação).

-- ---------------------------------------------------------------------------
-- 4) RPC audiência v37 (segmentação por classificação oficial)
-- ---------------------------------------------------------------------------
create or replace function public.cda_audiencia_sondagem_v2(p_code text)
returns table(classificacao text, bi text)
language sql stable security definer
set search_path = public
as $$
  with inst as (
    select coalesce(nullif(trim(abrangencia), ''), 'local') as classe,
           nullif(trim(provincia), '') as prov
    from public.profiles
    where lower(bi) = lower(p_code)
    limit 1
  )
  -- NACIONAL: 100% dos cidadãos registados
  select 'nacional'::text, p.bi::text
  from public.profiles p
  where p.role = 'user'
    and (select classe from inst) = 'nacional'
  union all
  -- REGIONAL: cidadãos da província da instituição (sem província = excluído)
  select 'regional'::text, p.bi::text
  from public.profiles p
  where p.role = 'user'
    and (select classe from inst) = 'regional'
    and (select prov from inst) is not null
    and lower(p.provincia) = lower((select prov from inst))
  union all
  -- LOCAL: cidadãos com relação pré-existente com a instituição (v36)
  select 'local'::text, u.user_bi::text
  from public.user_requests u
  where (select classe from inst) = 'local'
    and (lower(u.institution) = lower(p_code)
      or lower(u.institution) = lower(split_part(p_code, '-', 1)))
  union all
  select 'local'::text, d.user_bi::text
  from public.document_requests d
  where (select classe from inst) = 'local'
    and (lower(d.institution) = lower(p_code)
      or lower(d.institution) = lower(split_part(p_code, '-', 1)))
  union all
  select 'local'::text, m.recipient_bi::text
  from public.messages m
  where (select classe from inst) = 'local'
    and m.sender_bi = p_code and m.recipient_bi ~ '^[0-9]'
  union all
  select 'local'::text, m.sender_bi::text
  from public.messages m
  where (select classe from inst) = 'local'
    and m.recipient_bi = p_code and m.sender_bi ~ '^[0-9]'
$$;

-- A RPC v36 cda_audiencia_sondagem(p_code) mantém-se intocada
-- (retrocompatibilidade com fluxos/relatórios existentes).

-- ---------------------------------------------------------------------------
-- 5) RPCs de classificação (security definer — o browser institucional pode
--    não ter sessão Auth; as políticas RLS de profiles não podem bloquear a
--    segmentação oficial. Mesmo padrão da RPC v36.)
-- ---------------------------------------------------------------------------
create or replace function public.cda_classificacao_inst(p_code text)
returns table(abrangencia text, provincia text)
language sql stable security definer
set search_path = public
as $$
  select coalesce(nullif(trim(pr.abrangencia), ''), 'local'),
         nullif(trim(pr.provincia), '')
  from public.profiles pr
  where lower(pr.bi) = lower(p_code)
  limit 1
$$;

create or replace function public.cda_definir_classificacao_inst(
  p_code text, p_classe text, p_provincia text default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if p_classe not in ('nacional', 'regional', 'local') then
    raise exception 'Classificação inválida: %', p_classe;
  end if;
  if p_classe = 'regional' and (p_provincia is null or length(trim(p_provincia)) = 0) then
    raise exception 'Indique a província para classificação REGIONAL.';
  end if;
  update public.profiles
  set abrangencia = p_classe,
      provincia = case when p_classe = 'regional' then trim(p_provincia) else provincia end
  where lower(bi) = lower(p_code);
end;
$$;

-- Contagem de cidadãos sem província (aviso honesto em sondagens REGIONAL)
create or replace function public.cda_cidadaos_sem_provincia()
returns bigint
language sql stable security definer
set search_path = public
as $$
  select count(*) from public.profiles
  where role = 'user' and provincia is null
$$;
