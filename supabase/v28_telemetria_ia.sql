-- ============================================================================
-- v28 (2026-08-09) — ITEM 1 / Telemetria REAL das conversas de IA
-- ----------------------------------------------------------------------------
-- Aprovado pelo dono ("1. Cria a tabela."). As consolas de IA (instituição e
-- admin) já estão honestas desde 352338f, mas não têm ONDE registar o uso
-- real: contadores a zeros e histórico vazio porque a tabela não existia.
-- Passa a existir um registo central, append-only e mínimo:
--   §1) tabela public.ia_conversas_log (append-only; NUNCA update/delete);
--   §2) RLS: insert para qualquer sessão autenticada; leitura de linhas só
--       pela instituição dona (claim app_metadata.instituicao = sigla — mesma
--       convenção provada em v14/v20/v25) e pelo admin global
--       (app_metadata.role = 'admin'); cidadão NÃO lê linhas;
--   §3) view agregada public.ia_telemetria_resumo (dia/sigla/canal → totais),
--       sem conteúdo de conversas, para contadores das consolas;
--   §4) VERIFICAÇÃO (corre à mão depois do Run);
--   §5) ROLLBACK (executar só para reverter TUDO).
--
-- PRIVACIDADE (decisão documentada): guarda-se apenas uma pré-visualização do
-- prompt truncada a 160 caracteres (prompt_preview) — o suficiente para o
-- histórico da consola ser legível, sem diários íntimos. A resposta da IA
-- NÃO é guardada (só se falhou ou não). Quem escreve é sempre a CONSOLA da
-- instituição/admin (testes e previews); o Assistente de Documentos do
-- cidadão NÃO grava aqui nesta ronda.
--
-- EXECUÇÃO: Supabase → SQL Editor → colar TUDO → Run (como v25/v26/v27).
-- O código da aplicação falha ABERTO enquanto isto não for aplicado:
-- a leitura devolve TABELA_AUSENTE e a UI mostra "telemetria ainda não
-- instalada" em vez de números inventados.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- §1) Tabela append-only
-- ----------------------------------------------------------------------------
create table if not exists public.ia_conversas_log (
  id             bigint generated always as identity primary key,
  session_id     uuid not null,
  papel          text not null check (papel in ('cidadao','instituicao','admin')),
  sigla          text check (sigla is null or char_length(sigla) between 2 and 40),
  canal          text not null check (canal in ('consola_instituicao','preview_instituicao','consola_admin')),
  prompt_preview text not null default '' check (char_length(prompt_preview) <= 160),
  resposta_ok    boolean not null default true,
  lat_ms         integer check (lat_ms is null or (lat_ms >= 0 and lat_ms <= 3600000)),
  created_at     timestamptz not null default now()
);

comment on table  public.ia_conversas_log is 'v28 — telemetria mínima e append-only das conversas de IA das consolas (instituição/admin). Nunca guarda a resposta da IA; prompt truncado a 160 chars.';
comment on column public.ia_conversas_log.sigla is 'Instituição dona da conversa (canal consola/preview da instituição); NULL em sessões não atribuíveis.';
comment on column public.ia_conversas_log.prompt_preview is 'Pré-visualização do prompt, truncada client-side a 160 chars e defendida por check.';

create index if not exists ia_conversas_log_sigla_idx   on public.ia_conversas_log (sigla, created_at desc);
create index if not exists ia_conversas_log_created_idx on public.ia_conversas_log (created_at desc);

-- ----------------------------------------------------------------------------
-- §2) Permissões + RLS (append-only: ninguém corrige o passado)
-- ----------------------------------------------------------------------------
revoke all on public.ia_conversas_log from anon, authenticated;
grant insert on public.ia_conversas_log to authenticated;
grant select on public.ia_conversas_log to authenticated;
-- SEM grant de update/delete para ninguém (append-only também para o admin).

alter table public.ia_conversas_log enable row level security;

-- Insert: sessão autenticada regista; contas demo locais (sem sessão) saltam
-- o registo silenciosamente (cliente devolve SEM_SESSAO — honesto, sem spam).
drop policy if exists ia_log_insert_auth on public.ia_conversas_log;
create policy ia_log_insert_auth on public.ia_conversas_log
  for insert to authenticated
  with check (true);

-- Select de linhas: a instituição lê SÓ as suas (claim imutável app_metadata)
-- e o admin global lê tudo. Cidadão e anónimo não leem linhas individuais.
drop policy if exists ia_log_select_dono on public.ia_conversas_log;
create policy ia_log_select_dono on public.ia_conversas_log
  for select to authenticated
  using (
    upper(coalesce(sigla,'')) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'instituicao',''))
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ----------------------------------------------------------------------------
-- §3) View agregada para contadores das consolas (sem conteúdo de conversas)
-- ----------------------------------------------------------------------------
-- Decisão consciente: security definer (owner postgres) para que os contadores
-- agregados por dia/sigla/canal sejam legíveis mesmo por quem não passa na
-- policy de linhas. A view NUNCA expõe prompt_preview nem linhas individuais
-- — apenas volumes. Linhas individuais continuam protegidas pela policy §2.
create or replace view public.ia_telemetria_resumo as
  select
    date_trunc('day', created_at)                    as dia,
    coalesce(sigla, '(sem sigla)')                   as sigla,
    canal,
    count(*)::bigint                                 as total,
    count(*) filter (where resposta_ok)::bigint      as ok,
    count(distinct session_id)::bigint               as sessoes,
    avg(lat_ms)::integer                             as lat_media_ms
  from public.ia_conversas_log
  group by 1, 2, 3;

comment on view public.ia_telemetria_resumo is 'v28 — agregados de telemetria IA (dia/sigla/canal → totais). Sem conteúdo de conversas; definer de propósito.';

revoke all on public.ia_telemetria_resumo from anon, authenticated;
grant select on public.ia_telemetria_resumo to authenticated;

-- ----------------------------------------------------------------------------
-- §4) VERIFICAÇÃO (corre à mão depois do Run — tem de devolver tudo "ok")
-- ----------------------------------------------------------------------------
-- select 'tabela' as alvo, count(*)::text as resultado from public.ia_conversas_log
-- union all
-- select 'policies', string_agg(policyname, ', ' order by policyname) from pg_policies where tablename = 'ia_conversas_log'
-- union all
-- select 'view', count(*)::text from public.ia_telemetria_resumo;
-- Esperado: tabela devolve 0 linhas; policies = ia_log_insert_auth, ia_log_select_dono; view devolve 0 linhas.

-- ----------------------------------------------------------------------------
-- §5) ROLLBACK (executar só para reverter TUDO)
-- ----------------------------------------------------------------------------
-- drop view if exists public.ia_telemetria_resumo;
-- drop table if exists public.ia_conversas_log;
