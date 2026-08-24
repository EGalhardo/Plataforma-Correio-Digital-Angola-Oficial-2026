-- ============================================================================
-- v37.2 — CORRECÇÃO DA CLASSIFICAÇÃO OFICIAL (colar no SQL Editor após v37)
-- ----------------------------------------------------------------------------
-- Motivo: as instituições não têm linha em `profiles` com o código completo
-- usado pela aplicação (ex.: 'INAPEM-LLMM-01'; em profiles surge 'INAPEM-LLMM'
-- ou apenas siglas). A classificação passa a viver numa tabela própria,
-- chaveada pelo código institucional exacto. As colunas
-- profiles.abrangencia/provincia criadas na v37 mantêm-se (inofensivas) e o
-- backfill de provincia dos cidadãos continua válido para a segmentação
-- REGIONAL.
--
-- Inclui também: cidadãos = BI começado por dígito (contas institucionais com
-- role 'user' deixam de contar como cidadãos na audiência NACIONAL/REGIONAL).
-- ============================================================================

-- 1) Tabela de classificação oficial (chave = código institucional)
create table if not exists public.sondagens_classificacoes (
  codigo_instituicao text primary key,
  abrangencia text not null default 'local'
    check (abrangencia in ('nacional', 'regional', 'local')),
  provincia text null,
  actualizado_em timestamptz not null default now()
);

alter table public.sondagens_classificacoes enable row level security;

drop policy if exists "cda_sondagens_classificacoes_all" on public.sondagens_classificacoes;
create policy "cda_sondagens_classificacoes_all"
  on public.sondagens_classificacoes
  for all
  using (true)
  with check (true);

-- 2) Leitura da classificação (vazio ⇒ ainda não classificada)
create or replace function public.cda_classificacao_inst(p_code text)
returns table(abrangencia text, provincia text)
language sql stable security definer
set search_path = public
as $$
  select sc.abrangencia, nullif(trim(sc.provincia), '')
  from public.sondagens_classificacoes sc
  where lower(sc.codigo_instituicao) = lower(p_code)
  limit 1
$$;

-- 3) Definição/upsert da classificação (Admin/Gov + auto-classificação)
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
  insert into public.sondagens_classificacoes as sc (codigo_instituicao, abrangencia, provincia, actualizado_em)
  values (p_code, p_classe, case when p_classe = 'regional' then trim(p_provincia) else null end, now())
  on conflict (codigo_instituicao) do update
    set abrangencia = excluded.abrangencia,
        provincia = case when excluded.abrangencia = 'regional' then excluded.provincia else sc.provincia end,
        actualizado_em = now();
end;
$$;

-- 4) Audiência v37 revista (classificação da tabela própria; cidadãos = BI
--    começado por dígito)
create or replace function public.cda_audiencia_sondagem_v2(p_code text)
returns table(classificacao text, bi text)
language sql stable security definer
set search_path = public
as $$
  with inst as (
    select coalesce(nullif(trim(sc.abrangencia), ''), 'local') as classe,
           nullif(trim(sc.provincia), '') as prov
    from public.sondagens_classificacoes sc
    where lower(sc.codigo_instituicao) = lower(p_code)
    limit 1
  )
  -- NACIONAL: 100% dos cidadãos registados (BI começado por dígito)
  select 'nacional'::text, p.bi::text
  from public.profiles p
  where p.role = 'user' and p.bi ~ '^[0-9]'
    and (select coalesce(classe, 'local') from inst) = 'nacional'
  union all
  -- REGIONAL: cidadãos da província da instituição (sem província = excluído)
  select 'regional'::text, p.bi::text
  from public.profiles p
  where p.role = 'user' and p.bi ~ '^[0-9]'
    and (select coalesce(classe, 'local') from inst) = 'regional'
    and (select prov from inst) is not null
    and lower(p.provincia) = lower((select prov from inst))
  union all
  -- LOCAL: cidadãos com relação pré-existente com a instituição (v36)
  select 'local'::text, u.user_bi::text
  from public.user_requests u
  where (select coalesce(classe, 'local') from inst) = 'local'
    and (lower(u.institution) = lower(p_code)
      or lower(u.institution) = lower(split_part(p_code, '-', 1)))
  union all
  select 'local'::text, d.user_bi::text
  from public.document_requests d
  where (select coalesce(classe, 'local') from inst) = 'local'
    and (lower(d.institution) = lower(p_code)
      or lower(d.institution) = lower(split_part(p_code, '-', 1)))
  union all
  select 'local'::text, m.recipient_bi::text
  from public.messages m
  where (select coalesce(classe, 'local') from inst) = 'local'
    and m.sender_bi = p_code and m.recipient_bi ~ '^[0-9]'
  union all
  select 'local'::text, m.sender_bi::text
  from public.messages m
  where (select coalesce(classe, 'local') from inst) = 'local'
    and m.recipient_bi = p_code and m.sender_bi ~ '^[0-9]'
$$;

-- cda_cidadaos_sem_provincia() mantém-se da v37 (contagem de cidadãos sem
-- província para o aviso honesto em sondagens REGIONAL).
