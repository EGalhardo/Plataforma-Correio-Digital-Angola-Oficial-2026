-- ============================================================================
-- v25 (2026-08-07) — E6 / Base de Conhecimento SELF-SERVICE das instituições
-- ----------------------------------------------------------------------------
-- Aprovado pelo dono ("Avança todas"). A aba "Base de Conhecimento" do painel
-- de IA institucional era um MOCK (ficheiros fictícios "Processado" que a IA
-- nunca lia). Passa a ser CRUD real:
--   §1) tabela public.kb_fontes_instituicao (fontes próprias por sigla);
--   §2) RLS: leitura pública SÓ de fontes ativas; a instituição lê/gere TODAS
--       as suas (incl. desativadas) via claim app_metadata.instituicao — a
--       mesma convenção provada em v14/v20 (upper(sigla) = upper(claim));
--       admin global passe-partout (app_metadata.role = 'admin');
--   §3) checks de qualidade espelhando o motor (título ≥ 8; texto 200..4000;
--       link só https) para a IA nunca receber "esboços";
--   §4) trigger de updated_at.
-- O servidor (/api/assistente-documento) funde estas fontes com a KB
-- estática na próxima consulta — fonte desativada sai imediatamente da IA.
--
-- EXECUÇÃO: SQL Editor → colar TUDO → Run. Esperado: Success.
-- ROLLBACK: última secção (comentada).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- §1) TABELA
-- ----------------------------------------------------------------------------
create table if not exists public.kb_fontes_instituicao (
  id            uuid primary key default gen_random_uuid(),
  sigla         text not null,
  titulo        text not null check (char_length(btrim(titulo)) >= 8 and char_length(titulo) <= 300),
  tipo          text not null check (tipo in ('regulamento','procedimento','faq')),
  texto         text not null check (char_length(btrim(texto)) >= 200 and char_length(texto) <= 4000),
  fonte_url     text check (fonte_url is null or fonte_url ~ '^https://'),
  ativo         boolean not null default true,
  atualizado_em date not null default current_date,
  autor         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists kb_fontes_sigla_idx
  on public.kb_fontes_instituicao (sigla);

-- ----------------------------------------------------------------------------
-- §2) RLS — mesma convenção de claims de v14/v20 (app_metadata; imutável
--     pelo titular da conta — ver v14 §1)
-- ----------------------------------------------------------------------------
alter table public.kb_fontes_instituicao enable row level security;

-- leitura: fontes ATIVAS são conteúdo de referência público (a IA anónima do
-- servidor lê para fundamentar respostas); o dono vê também as desativadas;
-- admin vê tudo.
drop policy if exists "kbfontes_select_publica_dono_admin" on public.kb_fontes_instituicao;
create policy "kbfontes_select_publica_dono_admin"
  on public.kb_fontes_instituicao for select
  using (
    ativo = true
    or upper(sigla) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'instituicao',''))
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- escrita: agente institucional APENAS na própria sigla (ou admin)
drop policy if exists "kbfontes_insert_proprio_ou_admin" on public.kb_fontes_instituicao;
create policy "kbfontes_insert_proprio_ou_admin"
  on public.kb_fontes_instituicao for insert
  with check (
    upper(sigla) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'instituicao',''))
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "kbfontes_update_proprio_ou_admin" on public.kb_fontes_instituicao;
create policy "kbfontes_update_proprio_ou_admin"
  on public.kb_fontes_instituicao for update
  using (
    upper(sigla) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'instituicao',''))
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    upper(sigla) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'instituicao',''))
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "kbfontes_delete_proprio_ou_admin" on public.kb_fontes_instituicao;
create policy "kbfontes_delete_proprio_ou_admin"
  on public.kb_fontes_instituicao for delete
  using (
    upper(sigla) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'instituicao',''))
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ----------------------------------------------------------------------------
-- §3) trigger updated_at (idempotente)
-- ----------------------------------------------------------------------------
create or replace function public.kb_fontes_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists kb_fontes_touch on public.kb_fontes_instituicao;
create trigger kb_fontes_touch
  before update on public.kb_fontes_instituicao
  for each row execute function public.kb_fontes_touch_updated_at();

-- ----------------------------------------------------------------------------
-- VERIFICAÇÃO (corre à mão depois do Run):
--   select tablename, policyname from pg_policies where tablename = 'kb_fontes_instituicao';
--   → 4 políticas listadas; anon NÃO vê linhas desativadas:
--   select count(*) from public.kb_fontes_instituicao where ativo = false;  -- (anon) tem de dar 0
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- ROLLBACK (última secção — executar só para reverter TUDO):
--   drop trigger if exists kb_fontes_touch on public.kb_fontes_instituicao;
--   drop function if exists public.kb_fontes_touch_updated_at();
--   drop table if exists public.kb_fontes_instituicao;
-- ----------------------------------------------------------------------------
