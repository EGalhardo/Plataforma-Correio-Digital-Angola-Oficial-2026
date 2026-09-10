-- ============================================================================
-- v38 — INQUÉRITO COM IA (conversacional, texto/voz, adaptativo)
-- ----------------------------------------------------------------------------
-- PROMPT v3 «Inquérito com IA» (2026-09-10) · APLICAR NO SQL EDITOR DO
-- SUPABASE (único caminho de DDL disponível — mesmo padrão das migrações
-- v12..v37). Idempotente: pode ser executado mais do que uma vez.
--
-- 1) inqueritos_ia            — cabeçalho do inquérito: os 2 textos que a
--    instituição escreve + o GUIÃO estruturado que a IA deduziu (jsonb).
-- 2) inquerito_ia_respostas   — 1 linha por cidadão (UNIQUE), com o
--    histórico da conversa e os campos extraídos. O BI NUNCA é guardado em
--    claro: cidadao_bi_hash = sha256(BI + sal do servidor) — a participação
--    é anónima (só a instituição vê agregados; o cidadão nunca vê os campos).
-- 3) messages.inquerito_ia_id / inquerito_ia_ids — ligação da difusão ao
--    cabeçalho (nullable; os fluxos antigos ignoram-nas), espelho de
--    sondagem_id / sondagem_ids (v36/v37).
-- 4) RPC cda_inquerito_ia_agregados(p_inquerito_id) — contagens por
--    campo/valor SEM expor respostas individuais (STABLE, security definer,
--    mesmo espírito da v36).
--
-- RLS: estilo permissivo idêntico ao das sondagens (v36) — a plataforma
-- autentica os papéis na camada de aplicação e as contas demo nunca têm
-- sessão Auth. Endurecimento fica para uma versão dedicada, como nas
-- restantes tabelas (ver production_hardening.sql).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) inqueritos_ia
-- ---------------------------------------------------------------------------
create table if not exists public.inqueritos_ia (
  id                    bigserial primary key,
  instituicao_code      varchar(20)  not null,
  instituicao_nome      text         not null,
  o_que_pretende_saber  text         not null,               -- campo 1 do popup
  informacoes           text         not null,               -- campo 2 do popup
  guiao                 jsonb        not null,               -- {objectivo, saudacao, campos[], maxPerguntas}
  guiao_origem          varchar(10)  not null default 'ia',  -- 'ia' | 'template' (contingência)
  duracao               varchar(10)  not null default 'normal', -- 'curto' | 'normal' | 'completo'
  canal                 varchar(10)  not null default 'ambos',  -- 'ambos' | 'texto'
  tom                   varchar(10)  not null default 'proximo', -- 'proximo' | 'formal'
  status                varchar(20)  not null default 'rascunho', -- 'rascunho' | 'ativo' | 'encerrado'
  abrangencia           varchar(10)  not null default 'local',    -- 'nacional' | 'regional' | 'local'
  audiencia_total       integer      not null default 0,
  destinatarios         integer      null,
  criado_por            varchar(40)  not null,
  created_at            timestamptz  not null default now(),
  encerrado_em          timestamptz  null
);
create index if not exists idx_inqueritos_ia_inst on public.inqueritos_ia(instituicao_code);
create index if not exists idx_inqueritos_ia_status on public.inqueritos_ia(status);

-- ---------------------------------------------------------------------------
-- 2) inquerito_ia_respostas
-- ---------------------------------------------------------------------------
create table if not exists public.inquerito_ia_respostas (
  id               bigserial primary key,
  inquerito_id     bigint       not null references public.inqueritos_ia(id) on delete cascade,
  cidadao_bi_hash  varchar(64)  not null,                    -- sha256(BI + sal) — nunca o BI em claro
  estado           varchar(12)  not null default 'em_curso', -- 'em_curso' | 'concluido' | 'recusado'
  historico        jsonb        not null default '[]'::jsonb, -- [{"de":"ia"|"cidadao","texto":"..."}]
  campos           jsonb        not null default '{}'::jsonb, -- {"agua_canalizada":"Não", ...} (uso interno)
  canal_usado      varchar(10)  null,                        -- 'texto' | 'voz' | 'guiado'
  n_perguntas      integer      not null default 0,
  iniciado_em      timestamptz  not null default now(),
  actualizado_em   timestamptz  not null default now(),
  concluido_em     timestamptz  null,
  unique (inquerito_id, cidadao_bi_hash)
);
create index if not exists idx_inq_ia_resp_inq on public.inquerito_ia_respostas(inquerito_id);
create index if not exists idx_inq_ia_resp_estado on public.inquerito_ia_respostas(inquerito_id, estado);

-- ---------------------------------------------------------------------------
-- 3) messages.inquerito_ia_id / inquerito_ia_ids
-- ---------------------------------------------------------------------------
alter table public.messages
  add column if not exists inquerito_ia_id bigint null
  references public.inqueritos_ia(id) on delete set null;
alter table public.messages
  add column if not exists inquerito_ia_ids bigint[] null;
create index if not exists idx_messages_inquerito_ia on public.messages(inquerito_ia_id);

-- ---------------------------------------------------------------------------
-- 4) RPC agregados (só contagens; nunca linhas individuais)
-- ---------------------------------------------------------------------------
-- Devolve, para cada chave dos campos extraídos, o valor e o nº de cidadãos
-- que o deram, considerando apenas respostas CONCLUÍDAS. Valores são
-- normalizados (trim + primeira letra maiúscula) para agrupar «não»/«Não».
create or replace function public.cda_inquerito_ia_agregados(p_inquerito_id bigint)
returns table(chave text, valor text, total bigint)
language sql stable security definer
set search_path = public
as $$
  select
    kv.key as chave,
    initcap(trim(kv.value)) as valor,
    count(*)::bigint as total
  from public.inquerito_ia_respostas r
  cross join lateral jsonb_each_text(coalesce(r.campos, '{}'::jsonb)) as kv
  where r.inquerito_id = p_inquerito_id
    and r.estado = 'concluido'
    and kv.value is not null
    and length(trim(kv.value)) > 0
  group by kv.key, initcap(trim(kv.value))
  order by kv.key, total desc, valor
$$;

-- Contadores do cabeçalho (enviados/iniciados/concluídos/recusados) — leitura
-- rápida para a lista da instituição, sem varrer respostas no cliente.
create or replace function public.cda_inquerito_ia_contadores(p_inquerito_id bigint)
returns table(enviados integer, iniciados bigint, concluidos bigint, recusados bigint)
language sql stable security definer
set search_path = public
as $$
  select
    coalesce((select destinatarios from public.inqueritos_ia where id = p_inquerito_id), 0) as enviados,
    (select count(*) from public.inquerito_ia_respostas where inquerito_id = p_inquerito_id) as iniciados,
    (select count(*) from public.inquerito_ia_respostas where inquerito_id = p_inquerito_id and estado = 'concluido') as concluidos,
    (select count(*) from public.inquerito_ia_respostas where inquerito_id = p_inquerito_id and estado = 'recusado') as recusados
$$;

-- ---------------------------------------------------------------------------
-- 5) RLS (estilo permissivo, idêntico a sondagens/v36)
-- ---------------------------------------------------------------------------
alter table public.inqueritos_ia enable row level security;
alter table public.inquerito_ia_respostas enable row level security;

drop policy if exists "Permitir tudo para inqueritos_ia" on public.inqueritos_ia;
create policy "Permitir tudo para inqueritos_ia" on public.inqueritos_ia
  for all using (true) with check (true);

drop policy if exists "Permitir tudo para inquerito_ia_respostas" on public.inquerito_ia_respostas;
create policy "Permitir tudo para inquerito_ia_respostas" on public.inquerito_ia_respostas
  for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Verificação rápida (opcional, após aplicar):
--   select count(*) from public.inqueritos_ia;                       -- 0
--   select * from public.cda_inquerito_ia_agregados(0);              -- 0 linhas
--   select * from public.cda_inquerito_ia_contadores(0);             -- 0,0,0,0
--   select column_name from information_schema.columns
--     where table_name='messages' and column_name like 'inquerito_ia%'; -- 2 linhas
-- ---------------------------------------------------------------------------
